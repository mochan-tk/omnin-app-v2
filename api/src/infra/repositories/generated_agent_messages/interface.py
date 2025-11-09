from abc import ABC, abstractmethod
from typing import List, Optional

from .types import CreateMessageDto, MessageEntity


class MessageRepositoryInterface(ABC):
    @abstractmethod
    async def create(self, dto: CreateMessageDto) -> MessageEntity:
        raise NotImplementedError

    @abstractmethod
    async def list_by_agent(
        self,
        *,
        agent_id: str,
        session_id: Optional[str] = None,
        limit: int = 100,
        offset: int = 0,
    ) -> List[MessageEntity]:
        raise NotImplementedError
