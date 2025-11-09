import asyncio
import uuid
from datetime import datetime
from typing import Dict, List, Optional

from .interface import MessageRepositoryInterface
from .types import CreateMessageDto, MessageEntity


class InMemoryMessageRepository(MessageRepositoryInterface):
    """
    In-memory implementation to store chat messages for generated agents.
    Thread-safe for async contexts via a simple asyncio.Lock.
    """

    def __init__(self) -> None:
        self._store: Dict[str, MessageEntity] = {}
        self._lock = asyncio.Lock()

    async def create(self, dto: CreateMessageDto) -> MessageEntity:
        async with self._lock:
            mid = str(uuid.uuid4())
            now = datetime.utcnow()
            item = MessageEntity(
                id=mid,
                agent_id=dto.agent_id,
                session_id=dto.session_id,
                role=dto.role,
                content=dto.content,
                created_at=now,
            )
            self._store[mid] = item
            return item

    async def list_by_agent(
        self,
        *,
        agent_id: str,
        session_id: Optional[str] = None,
        limit: int = 100,
        offset: int = 0,
    ) -> List[MessageEntity]:
        async with self._lock:
            items = [m for m in self._store.values() if m.agent_id == agent_id]
            if session_id is not None:
                items = [m for m in items if m.session_id == session_id]
            items.sort(key=lambda m: m.created_at)
            return items[offset:offset + limit]
