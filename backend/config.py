"""
Centralized configuration — load environment variables once.

All other modules should import from here instead of calling
load_dotenv / os.getenv individually.
"""
import os
from pathlib import Path
from dotenv import load_dotenv

# Load .env from project root (one time)
load_dotenv(Path(__file__).parent.parent / ".env")

# ─────────────────────────────────────────────
# Supabase
# ─────────────────────────────────────────────
SUPABASE_URL = os.getenv("SUPABASE_URL", "").strip()
SUPABASE_ANON_KEY = os.getenv("SUPABASE_ANON_KEY", "").strip()
SUPABASE_REST_URL = f"{SUPABASE_URL}/rest/v1"

SUPABASE_HEADERS = {
    "apikey": SUPABASE_ANON_KEY,
    "Authorization": f"Bearer {SUPABASE_ANON_KEY}",
    "Content-Type": "application/json",
    "Prefer": "return=representation",
}

# ─────────────────────────────────────────────
# Database (LangGraph checkpointer)
# ─────────────────────────────────────────────
DATABASE_URL = os.getenv("DATABASE_URL")

# ─────────────────────────────────────────────
# OpenAI
# ─────────────────────────────────────────────
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY", "")

# ─────────────────────────────────────────────
# LangChain / LangSmith
# ─────────────────────────────────────────────
LANGCHAIN_TRACING_V2 = os.getenv("LANGCHAIN_TRACING_V2", "false")
LANGCHAIN_API_KEY = os.getenv("LANGCHAIN_API_KEY", "")
LANGCHAIN_PROJECT = os.getenv("LANGCHAIN_PROJECT", "default")
