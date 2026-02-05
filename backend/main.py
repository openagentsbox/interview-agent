"""
JIAF 後端 API
"""
import backend.config  # noqa: F401  load env vars before anything else

from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from slowapi import Limiter
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded

from backend.api.api_resume import router as resume_router
from backend.api.api_company import router as company_router
from backend.api.api_session import router as session_router
from backend.api.api_message import router as message_router
from backend.api.api_chat import router as chat_router
from backend.api.api_feedback import router as feedback_router
from backend.api.api_speech import router as speech_router
from backend.api.api_key import router as key_router
from backend.api.api_match import router as match_router
from backend.graph import init_checkpointer, close_checkpointer

# Rate limiter (by IP)
limiter = Limiter(key_func=get_remote_address)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan: startup and shutdown events"""
    # Startup: Initialize LangGraph checkpointer
    await init_checkpointer()
    yield
    # Shutdown: Close checkpointer connection
    await close_checkpointer()


app = FastAPI(title="JIAF API", version="0.1.0", lifespan=lifespan)
app.state.limiter = limiter


@app.exception_handler(RateLimitExceeded)
async def rate_limit_handler(request: Request, exc: RateLimitExceeded):
    return JSONResponse(
        status_code=429,
        content={"detail": "Rate limit exceeded. Please try again later."},
    )


# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "https://openagentsbox.com",
        "https://www.openagentsbox.com",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register routers
app.include_router(resume_router)
app.include_router(company_router)
app.include_router(session_router)
app.include_router(message_router)
app.include_router(chat_router)
app.include_router(feedback_router)
app.include_router(speech_router)
app.include_router(key_router)
app.include_router(match_router)


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("backend.main:app", host="0.0.0.0", port=8000, reload=True)
