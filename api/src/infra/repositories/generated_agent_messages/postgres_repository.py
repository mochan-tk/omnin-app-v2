import asyncio
import uuid
from datetime import datetime
from typing import List, Optional

import asyncpg
from asyncpg import Pool, Record

from ..exceptions import RepositoryError, raise_repository_error
from .interface import MessageRepositoryInterface
from .types import CreateMessageDto, MessageEntity


class PostgresMessageRepository(MessageRepositoryInterface):
    """Postgres-backed repository for generated agent messages."""

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
                                "Failed to create connection pool for generated agent message repository",
                                exc,
                            )
                        await asyncio.sleep(2 ** attempt)
        if self._pool is None:
            raise RepositoryError(
                "Connection pool was not initialized for generated agent message repository",
            )
        return self._pool

    async def close(self) -> None:
        async with self._pool_lock:
            if self._pool is not None:
                try:
                    await self._pool.close()
                except Exception as exc:
                    raise_repository_error(
                        "Failed to close connection pool for generated agent message repository",
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
                        CREATE TABLE IF NOT EXISTS generated_agent_messages (
                            id TEXT PRIMARY KEY,
                            agent_id TEXT NOT NULL,
                            session_id TEXT NOT NULL,
                            role TEXT NOT NULL,
                            content TEXT NOT NULL,
                            created_at TIMESTAMP NOT NULL
                        )
                        """
                    )
                    await conn.execute(
                        """
                        CREATE INDEX IF NOT EXISTS idx_generated_agent_messages_agent_session
                        ON generated_agent_messages(agent_id, session_id)
                        """
                    )
            except RepositoryError:
                raise
            except Exception as exc:
                raise_repository_error(
                    "Failed to initialize generated agent message repository",
                    exc,
                )
            self._initialized = True

    def _row_to_entity(self, row: Record) -> MessageEntity:
        return MessageEntity(
            id=row["id"],
            agent_id=row["agent_id"],
            session_id=row["session_id"],
            role=row["role"],
            content=row["content"],
            created_at=row["created_at"],
        )

    async def create(self, dto: CreateMessageDto) -> MessageEntity:
        await self._ensure_initialized()
        new_id = str(uuid.uuid4())
        now = datetime.utcnow()
        try:
            pool = await self._ensure_pool()
            async with pool.acquire() as conn:
                await conn.execute(
                    """
                    INSERT INTO generated_agent_messages (
                        id,
                        agent_id,
                        session_id,
                        role,
                        content,
                        created_at
                    ) VALUES ($1, $2, $3, $4, $5, $6)
                    """,
                    new_id,
                    dto.agent_id,
                    dto.session_id,
                    dto.role,
                    dto.content,
                    now,
                )
        except RepositoryError:
            raise
        except Exception as exc:
            raise_repository_error("Failed to create generated agent message", exc)
        return MessageEntity(
            id=new_id,
            agent_id=dto.agent_id,
            session_id=dto.session_id,
            role=dto.role,
            content=dto.content,
            created_at=now,
        )

    async def list_by_agent(
        self,
        *,
        agent_id: str,
        session_id: Optional[str] = None,
        limit: int = 100,
        offset: int = 0,
    ) -> List[MessageEntity]:
        await self._ensure_initialized()
        try:
            pool = await self._ensure_pool()
            async with pool.acquire() as conn:
                if session_id is None:
                    rows = await conn.fetch(
                        """
                        SELECT id, agent_id, session_id, role, content, created_at
                        FROM generated_agent_messages
                        WHERE agent_id = $1
                        ORDER BY created_at ASC
                        OFFSET $2 LIMIT $3
                        """,
                        agent_id,
                        offset,
                        limit,
                    )
                else:
                    rows = await conn.fetch(
                        """
                        SELECT id, agent_id, session_id, role, content, created_at
                        FROM generated_agent_messages
                        WHERE agent_id = $1 AND session_id = $2
                        ORDER BY created_at ASC
                        OFFSET $3 LIMIT $4
                        """,
                        agent_id,
                        session_id,
                        offset,
                        limit,
                    )
        except RepositoryError:
            raise
        except Exception as exc:
            raise_repository_error("Failed to list generated agent messages", exc)
        return [self._row_to_entity(row) for row in rows]
