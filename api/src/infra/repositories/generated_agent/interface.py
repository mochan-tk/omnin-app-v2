from abc import ABC, abstractmethod
from typing import List, Optional

from .types import CreateGeneratedAgentDto, GeneratedAgentEntity, UpdateGeneratedAgentDto


class GeneratedAgentRepositoryInterface(ABC):
    @abstractmethod
    async def create(self, dto: CreateGeneratedAgentDto) -> GeneratedAgentEntity:
        """Create a new generated_agent document and return the created DTO."""
        raise NotImplementedError

    @abstractmethod
    async def get_by_id(self, id: str) -> Optional[GeneratedAgentEntity]:
        """Return a GeneratedAgent for the given id, or None if not found."""
        raise NotImplementedError

    @abstractmethod
    async def list(
        self, *, owner_id: Optional[str] = None, limit: int = 100, offset: int = 0
    ) -> List[GeneratedAgentEntity]:
        """List documents, optionally filtered by owner_id, with pagination."""
        raise NotImplementedError

    @abstractmethod
    async def update(self, id: str, dto: UpdateGeneratedAgentDto) -> Optional[GeneratedAgentEntity]:
        """Update an existing document and return the updated DTO, or None if not found."""
        raise NotImplementedError

    @abstractmethod
    async def delete(self, id: str) -> bool:
        """Delete a document by id. Return True if deleted, False if not found."""
        raise NotImplementedError
