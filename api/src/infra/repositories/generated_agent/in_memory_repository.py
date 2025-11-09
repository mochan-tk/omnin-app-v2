import asyncio
import uuid
from datetime import datetime
from typing import Dict, List, Optional

from .interface import GeneratedAgentRepositoryInterface
from .types import (
    CreateGeneratedAgentDto,
    GeneratedAgentEntity,
    UpdateGeneratedAgentDto,
)


class InMemoryGeneratedAgentRepository(GeneratedAgentRepositoryInterface):
    """
    In-memory implementation of GeneratedAgentRepositoryInterface.
    Stores documents in a dict keyed by id. Methods are async to match
    expected async usage in application code.
    """

    def __init__(self) -> None:
        self._store: Dict[str, GeneratedAgentEntity] = {}
        # simple lock to avoid race conditions in async contexts
        self._lock = asyncio.Lock()

    async def create(self, dto: CreateGeneratedAgentDto) -> GeneratedAgentEntity:
        async with self._lock:
            new_id = str(uuid.uuid4())
            now = datetime.utcnow()
            record = GeneratedAgentEntity(
                id=new_id,
                owner_id=dto.owner_id,
                name=dto.name,
                parent_id=dto.parent_id,
                instruction=dto.instruction,
                tool=dto.tool,
                created_at=now,
                updated_at=now,
            )
            self._store[new_id] = record
            return record

    async def get_by_id(self, id: str) -> Optional[GeneratedAgentEntity]:
        async with self._lock:
            return self._store.get(id)

    async def list(
        self, *, owner_id: Optional[str] = None, limit: int = 100, offset: int = 0
    ) -> List[GeneratedAgentEntity]:
        async with self._lock:
            items = list(self._store.values())
            if owner_id is not None:
                items = [i for i in items if i.owner_id == owner_id]
            # simple deterministic ordering by created_at
            items.sort(key=lambda r: r.created_at)
            return items[offset : offset + limit]

    async def update(
        self, id: str, dto: UpdateGeneratedAgentDto
    ) -> Optional[GeneratedAgentEntity]:
        async with self._lock:
            existing = self._store.get(id)
            if not existing:
                return None
            updated = GeneratedAgentEntity(
                id=existing.id,
                owner_id=existing.owner_id,
                name=dto.name if dto.name is not None else existing.name,
                instruction=dto.instruction
                if dto.instruction is not None
                else existing.instruction,
                tool=dto.tool if dto.tool is not None else existing.tool,
                created_at=existing.created_at,
                updated_at=datetime.utcnow(),
            )
            self._store[id] = updated
            return updated

    async def delete(self, id: str) -> bool:
        async with self._lock:
            if id in self._store:
                del self._store[id]
                return True
            return False
