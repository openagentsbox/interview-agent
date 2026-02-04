"""
API Key verification endpoint
"""
from fastapi import APIRouter, Header, HTTPException
from openai import OpenAI, AuthenticationError

router = APIRouter(prefix="/api/key", tags=["key"])


@router.post("/verify")
async def verify_api_key(x_openai_key: str = Header(...)):
    """
    驗證 OpenAI API Key 是否有效
    使用 client.models.list() — 零 token 消耗
    """
    try:
        client = OpenAI(api_key=x_openai_key)
        client.models.list()
        return {"valid": True}
    except AuthenticationError:
        raise HTTPException(status_code=401, detail="Invalid API key")
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"OpenAI connection error: {str(e)}")
