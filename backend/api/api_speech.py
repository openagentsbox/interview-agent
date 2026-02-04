"""
Speech API - OpenAI Whisper STT & TTS
"""
import base64
from fastapi import APIRouter, UploadFile, File, HTTPException, Header
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from openai import OpenAI

router = APIRouter(prefix="/api/speech", tags=["speech"])


class SynthesizeRequest(BaseModel):
    text: str
    voice: str = "alloy"  # alloy, echo, fable, onyx, nova, shimmer

@router.post("/transcribe1")
async def transcribe_audio1(audio: UploadFile = File(...), x_openai_key: str = Header(...)):
    """
    將音訊轉換成文字 (Speech-to-Text)
    使用 GPT-4o-mini Audio (比 Whisper 便宜 50%)
    """
    # 1. 檢查並對應檔案格式
    # 注意：GPT-4o Audio 對格式要求比 Whisper 嚴格，主要支援 wav, mp3, ogg, flac
    format_map = {
        "audio/wav": "wav",
        "audio/x-wav": "wav",
        "audio/mp3": "mp3",
        "audio/mpeg": "mp3",
        "audio/ogg": "ogg",
        "audio/flac": "flac",
        # WebM 處理注意：如果前端傳的是 webm，嘗試視為 wav 或 ogg 處理，但建議前端錄音最好存成 wav/mp3
        "audio/webm": "wav" 
    }

    if audio.content_type not in format_map:
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported audio type: {audio.content_type}. Supported: wav, mp3, ogg, flac"
        )
    
    audio_format = format_map[audio.content_type]

    try:
        # 2. 讀取音訊並轉為 Base64
        audio_content = await audio.read()
        base64_audio = base64.b64encode(audio_content).decode("utf-8")

        # 3. 調用 Chat Completions API
        client = OpenAI(api_key=x_openai_key)
        response = client.chat.completions.create(
            model="gpt-4o-mini-audio-preview", # 使用 Mini Audio 模型
            modalities=["text"], # 關鍵：只輸出文字，最省錢 ($0.003/min)
            messages=[
                {
                    "role": "user",
                    "content": [
                        {
                            "type": "text", 
                            "text": "Transcribe the following audio exactly word for word. Do not summarize or answer it."
                        },
                        {
                            "type": "input_audio",
                            "input_audio": {
                                "data": base64_audio,
                                "format": audio_format
                            }
                        }
                    ]
                }
            ]
        )

        # 4. 取得轉錄結果
        transcript = response.choices[0].message.content
        return {"text": transcript}

    except Exception as e:
        print(f"STT Error: {e}") # 建議留 log
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/transcribe")
async def transcribe_audio(audio: UploadFile = File(...), x_openai_key: str = Header(...)):
    """
    將音訊轉換成文字 (Speech-to-Text)
    使用 OpenAI Whisper API
    """
    # 檢查檔案類型
    allowed_types = ["audio/webm", "audio/mp3", "audio/wav", "audio/m4a", "audio/ogg"]
    if audio.content_type not in allowed_types:
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported audio type: {audio.content_type}"
        )

    try:
        # 讀取音訊內容
        audio_content = await audio.read()

        # 調用 OpenAI Whisper API
        client = OpenAI(api_key=x_openai_key)
        transcription = client.audio.transcriptions.create(
            model="whisper-1",
            file=(audio.filename or "audio.webm", audio_content),
            language="en",  # 強制英文
        )

        return {"text": transcription.text}

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/synthesize")
async def synthesize_speech(request: SynthesizeRequest, x_openai_key: str = Header(...)):
    """
    將文字轉換成語音 (Text-to-Speech)
    使用 OpenAI TTS API — 真正 streaming，邊生成邊傳給前端
    """
    client = OpenAI(api_key=x_openai_key)

    def generate():
        with client.audio.speech.with_streaming_response.create(
            model="tts-1",
            voice=request.voice,
            input=request.text,
        ) as response:
            yield from response.iter_bytes(chunk_size=4096)

    return StreamingResponse(
        generate(),
        media_type="audio/mpeg",
    )
