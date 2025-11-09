import asyncio
import json
from typing import AsyncIterator, List, Optional

from agents import Agent, Runner
from fastapi import APIRouter, HTTPException, Query
from fastapi.encoders import jsonable_encoder
from fastapi.responses import StreamingResponse
from openai.types.responses import ResponseTextDeltaEvent

from src.core.v1.agents.owner_agent import OwnerAgent
from src.core.v1.models.owner_agent_request_model import OwnerAgentRequest
from src.core.v1.tools import task_split_judge_tool
from src.core.v1.tools.agent_spec_tools import (
    _fetch_tool,
    clear_agent_execution_stream,
    run_agent_tool,
    set_agent_execution_stream,
)
from src.infra.repositories.generated_agent.di import (
    generated_agent_repository,
)
from src.infra.repositories.generated_agent.types import (
    GeneratedAgentEntity,
)
from src.infra.repositories.generated_agent_messages.di import (
    message_repository,
)
from src.infra.repositories.generated_agent_messages.types import (
    CreateMessageDto,
    MessageEntity,
)
from src.infra.session.sqlite_session import SQLiteSessionStore

generated_agent_router = APIRouter(prefix="/agents", tags=["agents"])
session_store = SQLiteSessionStore()  # TODO: DIで注入する


@generated_agent_router.get(
    "/generated_agents/{id}",
    response_model=GeneratedAgentEntity,
)
async def get_generated_agent(id: str):
    item = await generated_agent_repository.get_by_id(id)
    if item is None:
        raise HTTPException(
            status_code=404,
            detail="Generated agent not found",
        )
    return item


@generated_agent_router.get(
    "/generated_agents",
    response_model=List[GeneratedAgentEntity],
)
async def list_or_stream_generated_agents(
    owner_id: Optional[str] = Query(default=None),
    limit: int = Query(default=100, ge=1, le=1000),
    offset: int = Query(default=0, ge=0),
    stream: bool = Query(default=False),  # ?stream=true で SSE 有効化
):
    """
    stream=true の場合は SSE で差分を配信（add/remove/update）。
    それ以外は通常の JSON 一覧を返す。
    """
    if not stream:
        return await generated_agent_repository.list(
            owner_id=owner_id,
            limit=limit,
            offset=offset,
        )

    async def generator() -> AsyncIterator[str]:
        # 初期一覧を送信（op=add）およびスナップショット保存
        initial = await generated_agent_repository.list(
            owner_id=owner_id,
            limit=limit,
            offset=offset,
        )
        seen_ids = set()
        last_snapshot = {}

        for item in initial:
            seen_ids.add(item.id)
            payload = {"op": "add", "agent": item.model_dump()}
            payload_json = json.dumps(jsonable_encoder(payload))
            yield f"data: {payload_json}\n\n"
            last_snapshot[item.id] = item.model_dump()

        # 差分ポーリング（1s）:
        # - 新規 -> op=add
        # - 削除 -> op=remove
        # - 既存だがメタ変化 -> op=update
        while True:
            current = await generated_agent_repository.list(
                owner_id=owner_id,
                limit=limit,
                offset=offset,
            )
            current_ids = {a.id for a in current}
            current_map = {
                a.id: a.model_dump()
                for a in current
            }

            # 追加分
            for aid, aobj in current_map.items():
                if aid not in seen_ids:
                    payload = {"op": "add", "agent": aobj}
                    print("[SSE] add:", payload)
                    payload_json = json.dumps(jsonable_encoder(payload))
                    yield "data: " + payload_json + "\n\n"

            # 削除分
            removed_ids = seen_ids - current_ids
            for rid in removed_ids:
                payload = {"op": "remove", "id": rid}
                print("[SSE] remove:", payload)
                payload_json = json.dumps(jsonable_encoder(payload))
                yield f"data: {payload_json}\n\n"

            # 更新分（差分検出）
            for aid in (seen_ids & current_ids):
                prev = last_snapshot.get(aid)
                curr = current_map.get(aid)
                if prev is None or curr is None:
                    continue

                changed = False
                keys_to_check = [
                    "parent_id",
                    "status",
                    "last_updated",
                    "name",
                    "tool",
                ]
                for k in keys_to_check:
                    pval = prev.get(k)
                    cval = curr.get(k)
                    if pval != cval:
                        changed = True
                        break

                if changed:
                    payload = {"op": "update", "agent": curr}
                    print("[SSE] update:", payload)
                    payload_json = json.dumps(jsonable_encoder(payload))
                    yield f"data: {payload_json}\n\n"

            # スナップショット更新
            seen_ids = current_ids
            last_snapshot = current_map

            await asyncio.sleep(1.0)

    resp = StreamingResponse(
        generator(),
        media_type="text/event-stream",
    )
    return resp


@generated_agent_router.get(
    "/generated_agents/{id}/messages",
    response_model=List[MessageEntity],
)
async def list_agent_messages(
    id: str,
    session_id: Optional[str] = Query(default=None),
    limit: int = Query(default=100, ge=1, le=1000),
    offset: int = Query(default=0, ge=0),
):
    return await message_repository.list_by_agent(
        agent_id=id,
        session_id=session_id,
        limit=limit,
        offset=offset,
    )


@generated_agent_router.post(
    "/generated_agents/{id}/messages",
    response_model=MessageEntity,
)
async def create_agent_message(
    id: str,
    payload: dict,
):
    session_id = str(payload.get("session_id", ""))
    role = str(payload.get("role", "user"))
    content = str(payload.get("content", ""))
    dto = CreateMessageDto(
        agent_id=id,
        session_id=session_id,
        role=role,  # type: ignore[arg-type]
        content=content,
    )
    return await message_repository.create(dto)


owner_agent_instance = OwnerAgent()
session_store = SQLiteSessionStore()  # TODO: DIで注入するようにする。Routerが1つしかないで一旦大丈夫

@generated_agent_router.post(
    "/generated_agents/{id}/chat",
)
async def chat_generated_agent(id: str, req: OwnerAgentRequest):
    # 既存エージェントを取得
    entity = await generated_agent_repository.get_by_id(id)
    if entity is None:
        agent = OwnerAgent()
    else:
        # Agent を初期化（ツール解決は存在する場合のみ）
        tool = None
        if entity.tool:
            try:
                tool = _fetch_tool(entity.tool)
            except Exception:
                # 不明なツール指定は無視（ツール無しで実行）
                tool = None

        agent = Agent(
            name=entity.name,
            instructions=entity.instruction,
            tools=[tool, run_agent_tool, task_split_judge_tool] if tool else [run_agent_tool, task_split_judge_tool],
        )

    session = session_store.get_or_create(req.session_id)
    prompt = f"Owner ID: {req.owner_id}, Owner Agent ID: {req.owner_agent_id}, User Input: {req.user_input}"

    async def event_generator():
        # ツール実行からのイベントを受け取るためのキュー
        tool_event_queue = asyncio.Queue()
        set_agent_execution_stream(tool_event_queue)
        
        try:
            result = Runner.run_streamed(
                agent, prompt, max_turns=10, session=session
            )
            
            # メインのエージェントイベント処理
            async for event in result.stream_events():
                # ツールイベントをチェック
                while not tool_event_queue.empty():
                    tool_event = await tool_event_queue.get()
                    tool_event_json = json.dumps(tool_event)
                    yield f"data: {tool_event_json}\n\n"
                
                # テキスト差分（既存のチャンク配信）
                if (
                    event.type == "raw_response_event"
                    and isinstance(event.data, ResponseTextDeltaEvent)
                ):
                    # テキストイベントをJSONフォーマットで送信
                    text_event = {
                        "type": "text",
                        "data": {"delta": event.data.delta}
                    }
                    yield f"data: {json.dumps(text_event)}\n\n"

                # エージェント内部の更新通知（既存）
                elif event.type == "agent_updated_stream_event":
                    update_event = {
                        "type": "agent_updated",
                        "data": {"message": f"{agent.name} の応答を待っています..."}
                    }
                    yield f"data: {json.dumps(update_event)}\n\n"
                
                # ツール呼び出しイベントの処理
                elif event.type == "run_item_stream_event":
                    if event.item.type == "tool_call_item":
                        tool_event = {
                            "type": "tool_called",
                            "data": {"message": "ツールを実行中..."}
                        }
                        yield f"data: {json.dumps(tool_event)}\n\n"
            
            # 残りのツールイベントを処理
            while not tool_event_queue.empty():
                tool_event = await tool_event_queue.get()
                tool_event_json = json.dumps(tool_event)
                yield f"data: {tool_event_json}\n\n"
                
        finally:
            # クリーンアップ
            clear_agent_execution_stream()

    return StreamingResponse(event_generator(), media_type="text/event-stream")
