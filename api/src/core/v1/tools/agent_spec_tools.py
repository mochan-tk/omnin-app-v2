
import time

from agents import (
    Agent,
    CodeInterpreterTool,
    ImageGenerationTool,
    Runner,
    WebSearchTool,
    function_tool,
)
from agents.extensions.handoff_prompt import RECOMMENDED_PROMPT_PREFIX
from openai.types.responses import ResponseTextDeltaEvent
from typing_extensions import TypedDict

from src.core.v1.instructions.owner_agent_instruction import owner_agent_instruction
from src.core.v1.tools.send_mail_tools import send_gmail_tool
from src.infra.repositories.generated_agent import di as generated_agent_di
from src.infra.repositories.generated_agent.types import (
    CreateGeneratedAgentDto,
)
from src.infra.repositories.generated_agent_messages import di as message_di
from src.infra.repositories.generated_agent_messages.types import CreateMessageDto


class AgentBuildConfig(TypedDict, total=False):
    name: str
    instruction: str
    tool: str
    user_input: str
    owner_id: str
    owner_agent_id: str


# エージェント実行結果を保存するグローバル変数（SSEで中間結果を送信するため）
_agent_execution_stream = None

def set_agent_execution_stream(stream):
    """SSEストリームを設定する（ルートから呼び出される）"""
    global _agent_execution_stream
    _agent_execution_stream = stream

def clear_agent_execution_stream():
    """SSEストリームをクリアする"""
    global _agent_execution_stream
    _agent_execution_stream = None

# シンプルにエージェントを生成するツール
@function_tool()
async def run_agent_tool(config: AgentBuildConfig) -> str:
    """
    Tool entrypoint expected to be resolved by Runner via module path string.

    Inputs:
        - name: name of the child agent
        - instruction: instruction for the child agent
        - tool: tool available to the child agent
        - user_input: original user question to forward to child agent.
        - owner_id: ID of the owner (user) of the agent
        - owner_agent_id: ID of the owner agent

    Behavior:
        - Instantiate & run a child agent via the local Runner
          if available.
        - This function is async and will await
          Runner.run if it returns a coroutine.
        - Return the child's textual response.

    Returns a string (child agent response) or raises RuntimeError on failure.
    """
    tool = None

    is_dict = isinstance(config, dict)
    if is_dict:
        tool_name = config.get("tool")
    else:
        tool_name = getattr(config, "tool", None)
    tool = _fetch_tool(tool_name)

    agent_name = (
        config.get("name", "ChildAgent") if isinstance(config, dict) else
        getattr(config, "name", "ChildAgent")
    )

    if is_dict:
        instruction = config.get("instruction")
        owner_id = config.get("owner_id", "")
        owner_agent_id = config.get("owner_agent_id", "")
    else:
        instruction = getattr(config, "instruction", "")
        owner_id = getattr(config, "owner_id", "")
        owner_agent_id = getattr(config, "owner_agent_id", "")

    # ユニークIDを事前に生成
    unique_tool_id = f"{agent_name}-{int(time.time() * 1000)}"
    
    # ストリームに通知: エージェント作成開始
    if _agent_execution_stream:
        await _agent_execution_stream.put({
            "type": "agent_creating",
            "data": {
                "id": unique_tool_id,
                "name": agent_name,
                "tool": tool_name,
                "status": "creating"
            }
        })
    
    agent_id = await save_db(
        name=agent_name,
        tool_name=tool_name,
        instruction=instruction,
        owner_id=owner_id,
        owner_agent_id=owner_agent_id,
    )
    
    # ストリームに通知: エージェント作成完了
    if _agent_execution_stream:
        await _agent_execution_stream.put({
            "type": "agent_created",
            "data": {
                "id": unique_tool_id,
                "agent_id": agent_id,
                "name": agent_name,
                "tool": tool_name,
                "status": "created"
            }
        })
    # join で non-str が混入すると "sequence item 2: expected str instance, module found" が発生する可能性があるため
    # 安全のため map(str, ...) で文字列化して結合する
    instruction = "\n".join(
        map(
            str,
            (
                RECOMMENDED_PROMPT_PREFIX,
                instruction,
                owner_agent_instruction,
            ),
        ),
    )

    agent = Agent(
        name=agent_name,
        instructions=instruction,
        tools=[tool],
    )
    user_input = (
        config.get("user_input") if isinstance(config, dict) else
        getattr(config, "user_input", "")
    )
    # ストリームに通知: エージェント実行開始
    if _agent_execution_stream:
        await _agent_execution_stream.put({
            "type": "agent_executing",
            "data": {
                "id": agent_id,
                "name": agent_name,
                "status": "executing"
            }
        })
    
    result = Runner.run_streamed(agent, user_input)
    
    # エージェントの応答を蓄積
    agent_response = ""
    
    async for event in result.stream_events():
        if (
            event.type == "raw_response_event"
            and isinstance(event.data, ResponseTextDeltaEvent)
        ):
            delta = event.data.delta
            agent_response += delta
            print(delta, end="", flush=True)
            
            # ストリームに通知: エージェントの中間応答
            if _agent_execution_stream:
                await _agent_execution_stream.put({
                    "type": "agent_thinking",
                    "data": {
                        "id": agent_id,
                        "name": agent_name,
                        "delta": delta,
                        "status": "thinking"
                    }
                })
        elif event.type == "agent_updated_stream_event":
            print(f"{agent.name} の応答を待っています...")
            # ストリームに通知: エージェント更新
            if _agent_execution_stream:
                await _agent_execution_stream.put({
                    "type": "agent_updated",
                    "data": {
                        "id": agent_id,
                        "name": agent.name,
                        "status": "waiting"
                    }
                })

    # 終了した時
    print(f"\n{agent.name} の実行が完了しました。")
    final_text = result.final_output_as(str)
    
    # ストリームに通知: エージェント実行完了
    if _agent_execution_stream:
        await _agent_execution_stream.put({
            "type": "agent_completed",
            "data": {
                "id": agent_id,
                "name": agent_name,
                "status": "completed",
                "result": final_text
            }
        })

    # DBにassistantメッセージを保存（可能な限り非致命的に）
    # session_id が渡されていればそれを使い、なければ空文字を使用する
    session_id = ""
    try:
        if isinstance(config, dict):
            session_id = str(config.get("session_id", "") or "")
        else:
            session_id = str(getattr(config, "session_id", "") or "")

        await message_di.message_repository.create(
            CreateMessageDto(
                agent_id=agent_id,
                session_id=session_id,
                role="user",
                content=str(user_input),
            )
        )

        await message_di.message_repository.create(
            CreateMessageDto(
                agent_id=agent_id,
                session_id=session_id,
                role="assistant",
                content=str(final_text),
            )
        )
    except Exception:
        # 保存失敗はログに出すが処理は継続
        pass

    return final_text


async def save_db(name, tool_name, instruction, owner_id, owner_agent_id) -> str:
    try:
        agent = await generated_agent_di.generated_agent_repository.create(
            CreateGeneratedAgentDto(
                owner_id=owner_id,
                parent_id=owner_agent_id,
                name=name,
                instruction=instruction,
                tool=tool_name,
        )
        )
    except Exception as e:
        print("Error occurred while saving to DB:", e)
    print(agent)
    return agent.id


def _fetch_tool(name: str):
    if name == "WebSearch":
        return WebSearchTool()
    elif name == "ImageGeneration":
        return ImageGenerationTool()
    elif name == "CodeInterpreterTool":
        return CodeInterpreterTool(
            tool_config={
                "type": "code_interpreter",
                "container": {"type": "auto"},
            },
        )
    elif name == "SendMailTool":
        return send_gmail_tool
    else:
        raise ValueError(f"invalid tool name: {name}")
