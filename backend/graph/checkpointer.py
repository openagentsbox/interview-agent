"""
LangGraph Checkpointer Configuration

Uses PostgreSQL (Supabase) with AsyncPostgresSaver.
"""

from typing import Optional

from langgraph.checkpoint.base import BaseCheckpointSaver
from langgraph.checkpoint.memory import MemorySaver

from backend.config import DATABASE_URL

# Global checkpointer instance
_checkpointer: Optional[BaseCheckpointSaver] = None
_connection_pool = None
_checkpointer_initialized = False


async def init_checkpointer() -> BaseCheckpointSaver:
    """
    Initialize the checkpointer with Supabase PostgreSQL.
    Uses AsyncPostgresSaver for async FastAPI compatibility.
    """
    global _checkpointer, _checkpointer_initialized, _connection_pool

    if _checkpointer_initialized and _checkpointer is not None:
        return _checkpointer

    database_url = DATABASE_URL

    if database_url:
        try:
            from psycopg_pool import AsyncConnectionPool as _ACP
            from psycopg import OperationalError
            from langgraph.checkpoint.postgres.aio import AsyncPostgresSaver

            async def check_connection(conn):
                """Health check — drop dead connections from pool."""
                try:
                    await conn.execute("SELECT 1")
                except OperationalError:
                    raise

            # Create async connection pool with autocommit for setup()
            _connection_pool = _ACP(
                conninfo=database_url,
                open=False,
                min_size=1,
                max_size=5,
                check=check_connection,
                kwargs={"autocommit": True},
                max_idle=300,       # recycle idle connections after 5 min
                reconnect_timeout=60,
            )
            await _connection_pool.open()

            # Run setup() with a single connection to create tables
            async with _connection_pool.connection() as conn:
                setup_checkpointer = AsyncPostgresSaver(conn)
                await setup_checkpointer.setup()
                print("✅ LangGraph tables created successfully")

            # Create checkpointer with pool for runtime use
            _checkpointer = AsyncPostgresSaver(_connection_pool)

            print("✅ LangGraph checkpointer initialized with PostgreSQL (Supabase)")
        except Exception as e:
            print(f"⚠️ Failed to initialize PostgreSQL checkpointer: {e}")
            print("⚠️ Falling back to InMemorySaver")
            _checkpointer = MemorySaver()
    else:
        print("ℹ️ DATABASE_URL not set, using InMemorySaver")
        _checkpointer = MemorySaver()

    _checkpointer_initialized = True
    return _checkpointer


def get_checkpointer() -> Optional[BaseCheckpointSaver]:
    """
    Get the current checkpointer instance.
    Must call init_checkpointer() first at startup.
    """
    return _checkpointer


async def delete_thread_checkpoints(thread_id: str):
    """
    Delete all checkpoint data for a thread (session).
    Uses a dedicated connection to guarantee deletion.
    """
    from backend.config import DATABASE_URL as _db_url
    import psycopg

    print(f"🔍 delete_thread_checkpoints called for {thread_id}")

    if not _db_url:
        print(f"⚠️ No DATABASE_URL, cannot delete checkpoints for {thread_id}")
        return

    try:
        async with await psycopg.AsyncConnection.connect(_db_url, autocommit=True) as conn:
            for table in ["checkpoint_writes", "checkpoint_blobs", "checkpoints"]:
                result = await conn.execute(
                    f"DELETE FROM {table} WHERE thread_id = %s", (thread_id,)
                )
                print(f"  ↳ {table}: {result.rowcount} rows deleted")
        print(f"✅ Checkpoints deleted for thread {thread_id}")
    except Exception as e:
        print(f"⚠️ Failed to delete checkpoints for thread {thread_id}: {e}")
        import traceback
        traceback.print_exc()


async def close_checkpointer():
    """
    Close the checkpointer connection.
    Call this at application shutdown.
    """
    global _checkpointer, _checkpointer_initialized, _connection_pool

    if _connection_pool is not None:
        await _connection_pool.close()
        _connection_pool = None

    _checkpointer = None
    _checkpointer_initialized = False
    print("✅ LangGraph checkpointer closed")
