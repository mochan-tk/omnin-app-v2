
import httpx
from fastapi import APIRouter, HTTPException

from src.config import get_env_variable

OPENAI_API_KEY = get_env_variable("OPENAI_API_KEY", "")

realtime_router = APIRouter(prefix="/realtime", tags=["realtime"])

# ref: https://platform.openai.com/docs/api-reference/realtime-sessions/create-secret-response
_SESSION_CONFIG = {
    "session": {
        "type": "realtime",
        "model": "gpt-realtime",
        "audio": {
            "input": {
                "transcription": {
                    "model": "gpt-4o-mini-transcribe",
                    "language": "ja"
                },
                "noise_reduction": {"type": "near_field"},
                # "turn_detection": {
                #     "type": "server_vad",
                #     "threshold": 0.5,
                #     "prefix_padding_ms": 300,
                #     "silence_duration_ms": 1000,
                #     "create_response": True,
                #     "interrupt_response": True,
                # },
                "turn_detection": {
                    "type": "semantic_vad",
                    "eagerness": "low",
                },
            },
            "output": {
                "voice": "marin",
                "speed": 0.9,
            }
        },
        "instructions": "日本語を話すAIアシスタントです。なるべく簡潔に応答を返します。一番最初の会話で「こんにちは、何かご依頼事項はありますか？」のwelcomeメッセージをユーザーに返します。",
    }
}

@realtime_router.get("/token")
async def create_realtime_token() -> dict:

    async with httpx.AsyncClient(timeout=20) as client:
        response = await client.post(
            "https://api.openai.com/v1/realtime/client_secrets",
            headers={
                "Authorization": f"Bearer {OPENAI_API_KEY}",
                "Content-Type": "application/json",
            },
            json=_SESSION_CONFIG,
        )

    if response.status_code >= 400:
        try:
            detail = response.json()
        except ValueError:
            detail = {"message": response.text}
        raise HTTPException(status_code=response.status_code, detail=detail)

    return response.json()
