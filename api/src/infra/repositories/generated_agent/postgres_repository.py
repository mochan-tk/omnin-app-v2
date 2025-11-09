import asyncio
import uuid
from datetime import datetime
from typing import List, Optional

import asyncpg
from asyncpg import Pool, Record

from ..exceptions import RepositoryError, raise_repository_error
from .interface import GeneratedAgentRepositoryInterface
from .types import (
    CreateGeneratedAgentDto,
    GeneratedAgentEntity,
    UpdateGeneratedAgentDto,
)


class PostgresGeneratedAgentRepository(GeneratedAgentRepositoryInterface):
    """Postgres implementation for GeneratedAgentRepositoryInterface."""

    def __init__(self, dsn: str) -> None:
        self._dsn = dsn
        self._initialized = False
        self._init_lock = asyncio.Lock()
        self._pool: Optional[Pool] = None
        self._pool_lock = asyncio.Lock()

    async def _ensure_pool(self) -> Pool:
        if self._pool is not None:
            return self._pool
        async with self._pool_lock:
            if self._pool is None:
                for attempt in range(3):
                    try:
                        self._pool = await asyncpg.create_pool(
                            self._dsn,
                            min_size=2,
                            max_size=10,
                        )
                        break
                    except Exception as exc:
                        if attempt == 2:
                            raise_repository_error(
                                "Failed to create connection pool for generated agent repository",
                                exc,
                            )
                        await asyncio.sleep(2 ** attempt)
        if self._pool is None:
            raise RepositoryError(
                "Connection pool was not initialized for generated agent repository",
            )
        return self._pool

    async def close(self) -> None:
        async with self._pool_lock:
            if self._pool is not None:
                try:
                    await self._pool.close()
                except Exception as exc:
                    raise_repository_error(
                        "Failed to close connection pool for generated agent repository",
                        exc,
                    )
                self._pool = None
        self._initialized = False

    async def _ensure_initialized(self) -> None:
        if self._initialized:
            return
        async with self._init_lock:
            if self._initialized:
                return
            try:
                pool = await self._ensure_pool()
                async with pool.acquire() as conn:
                    await conn.execute(
                        """
                        CREATE TABLE IF NOT EXISTS generated_agents (
                            id TEXT PRIMARY KEY,
                            owner_id TEXT NOT NULL,
                            name TEXT NOT NULL,
                            instruction TEXT NOT NULL,
                            tool TEXT,
                            parent_id TEXT,
                            last_updated TIMESTAMP NULL,
                            created_at TIMESTAMP NOT NULL,
                            updated_at TIMESTAMP NOT NULL
                        )
                        """
                    )
                    await conn.execute(
                        """
                        CREATE INDEX IF NOT EXISTS idx_generated_agents_owner
                        ON generated_agents(owner_id)
                        """
                    )
            except RepositoryError:
                raise
            except Exception as exc:
                raise_repository_error(
                    "Failed to initialize generated agent repository",
                    exc,
                )
            self._initialized = True

    def _row_to_entity(self, row: Record) -> GeneratedAgentEntity:
        return GeneratedAgentEntity(
            id=row["id"],
            owner_id=row["owner_id"],
            name=row["name"],
            instruction=row["instruction"],
            tool=row["tool"],
            parent_id=row["parent_id"],
            last_updated=row["last_updated"],
            created_at=row["created_at"],
            updated_at=row["updated_at"],
        )

    async def create(self, dto: CreateGeneratedAgentDto) -> GeneratedAgentEntity:
        await self._ensure_initialized()
        new_id = str(uuid.uuid4())
        now = datetime.utcnow()
        try:
            pool = await self._ensure_pool()
            async with pool.acquire() as conn:
                await conn.execute(
                    """
                    INSERT INTO generated_agents (
                        id,
                        owner_id,
                        name,
                        instruction,
                        tool,
                        parent_id,
                        last_updated,
                        created_at,
                        updated_at
                    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
                    """,
                    new_id,
                    dto.owner_id,
                    dto.name,
                    dto.instruction,
                    dto.tool,
                    dto.parent_id,
                    None,
                    now,
                    now,
                )
        except RepositoryError:
            raise
        except Exception as exc:
            raise_repository_error("Failed to create generated agent", exc)
        return GeneratedAgentEntity(
            id=new_id,
            owner_id=dto.owner_id,
            name=dto.name,
            instruction=dto.instruction,
            tool=dto.tool,
            parent_id=dto.parent_id,
            last_updated=None,
            created_at=now,
            updated_at=now,
        )

    async def get_by_id(self, id: str) -> Optional[GeneratedAgentEntity]:
        await self._ensure_initialized()
        try:
            pool = await self._ensure_pool()
            async with pool.acquire() as conn:
                row = await conn.fetchrow(
                    """
                    SELECT id, owner_id, name, instruction, tool, parent_id, last_updated, created_at, updated_at
                    FROM generated_agents
                    WHERE id = $1
                    """,
                    id,
                )
        except RepositoryError:
            raise
        except Exception as exc:
            raise_repository_error("Failed to fetch generated agent by id", exc)
        if row is None:
            return None
        return self._row_to_entity(row)

    async def list(
        self,
        *,
        owner_id: Optional[str] = None,
        limit: int = 100,
        offset: int = 0,
    ) -> List[GeneratedAgentEntity]:
        await self._ensure_initialized()
        try:
            pool = await self._ensure_pool()
            async with pool.acquire() as conn:
                if owner_id is None:
                    rows = await conn.fetch(
                        """
                        SELECT id, owner_id, name, instruction, tool, parent_id, last_updated, created_at, updated_at
                        FROM generated_agents
                        ORDER BY created_at ASC
                        OFFSET $1 LIMIT $2
                        """,
                        offset,
                        limit,
                    )
                else:
                    rows = await conn.fetch(
                        """
                        SELECT id, owner_id, name, instruction, tool, parent_id, last_updated, created_at, updated_at
                        FROM generated_agents
                        WHERE owner_id = $1
                        ORDER BY created_at ASC
                        OFFSET $2 LIMIT $3
                        """,
                        owner_id,
                        offset,
                        limit,
                    )
        except RepositoryError:
            raise
        except Exception as exc:
            raise_repository_error("Failed to list generated agents", exc)
        return [self._row_to_entity(row) for row in rows]

    async def update(
        self,
        id: str,
        dto: UpdateGeneratedAgentDto,
    ) -> Optional[GeneratedAgentEntity]:
        await self._ensure_initialized()
        try:
            pool = await self._ensure_pool()
            async with pool.acquire() as conn:
                existing = await conn.fetchrow(
                    """
                    SELECT id, owner_id, name, instruction, tool, parent_id, last_updated, created_at, updated_at
                    FROM generated_agents
                    WHERE id = $1
                    """,
                    id,
                )
                if existing is None:
                    return None

                updated_name = dto.name if dto.name is not None else existing["name"]
                updated_instruction = (
                    dto.instruction if dto.instruction is not None else existing["instruction"]
                )
                updated_tool = dto.tool if dto.tool is not None else existing["tool"]
                updated_parent_id = (
                    dto.parent_id if dto.parent_id is not None else existing["parent_id"]
                )
                updated_last_updated = (
                    dto.last_updated if dto.last_updated is not None else existing["last_updated"]
                )
                now = datetime.utcnow()

                await conn.execute(
                    """
                    UPDATE generated_agents
                    SET name = $1,
                        instruction = $2,
                        tool = $3,
                        parent_id = $4,
                        last_updated = $5,
                        updated_at = $6
                    WHERE id = $7
                    """,
                    updated_name,
                    updated_instruction,
                    updated_tool,
                    updated_parent_id,
                    updated_last_updated,
                    now,
                    id,
                )

                return GeneratedAgentEntity(
                    id=existing["id"],
                    owner_id=existing["owner_id"],
                    name=updated_name,
                    instruction=updated_instruction,
                    tool=updated_tool,
                    parent_id=updated_parent_id,
                    last_updated=updated_last_updated,
                    created_at=existing["created_at"],
                    updated_at=now,
                )
        except RepositoryError:
            raise
        except Exception as exc:
            raise_repository_error("Failed to update generated agent", exc)

    async def delete(self, id: str) -> bool:
        await self._ensure_initialized()
        try:
            pool = await self._ensure_pool()
            async with pool.acquire() as conn:
                deleted_id = await conn.fetchval(
                    "DELETE FROM generated_agents WHERE id = $1 RETURNING id",
                    id,
                )
        except RepositoryError:
            raise
        except Exception as exc:
            raise_repository_error("Failed to delete generated agent", exc)
        return deleted_id is not None
