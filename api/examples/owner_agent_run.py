import asyncio
import sys
from pathlib import Path

from agents import Runner, SQLiteSession
from openai.types.responses import ResponseTextDeltaEvent

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))
# flake8: noqa: E402
from src.config import get_env_variable
from src.core.v1.agents.owner_agent import OwnerAgent
from src.infra.repositories.generated_agent.di import generated_agent_repository

OPENAI_API_KEY = get_env_variable("OPENAI_API_KEY", "")

# v1のOwnerAgentをインタラクティブシェルで実行するためのサンプルスクリプトです


async def main():
    owner_agent = OwnerAgent()
    session = SQLiteSession("conversation_123")
    print("インタラクティブモード: 質問を入力してください (Ctrl+Cで終了)")
    try:
        while True:
            user_input = input("> ")
            if not user_input.strip():
                continue
            result = Runner.run_streamed(owner_agent, user_input, session=session, max_turns=10)
            async for event in result.stream_events():
                if event.type == "raw_response_event" and isinstance(event.data, ResponseTextDeltaEvent):
                    print(event.data.delta, end="", flush=True)
            print("\n")
            print(result)
            print(await generated_agent_repository.list())
    except KeyboardInterrupt:
        print("\n終了します")


if __name__ == "__main__":
    asyncio.run(main())
