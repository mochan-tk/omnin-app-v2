"""Repository-specific exceptions."""

import asyncio
from typing import NoReturn


class RepositoryError(Exception):
    """Raised when a repository operation fails."""


def raise_repository_error(message: str, exc: Exception) -> NoReturn:
    """Wrap lower-level exceptions in RepositoryError while preserving cancellations."""
    if isinstance(exc, asyncio.CancelledError):
        raise exc
    raise RepositoryError(message) from exc
