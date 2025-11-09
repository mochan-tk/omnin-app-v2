from src.config import get_env_variable

from .in_memory_repository import InMemoryMessageRepository
from .interface import MessageRepositoryInterface
from .postgres_repository import PostgresMessageRepository


def get_message_repository() -> MessageRepositoryInterface:
    use_in_memory = get_env_variable("USE_IN_MEMORY", "0") == "1"
    if use_in_memory:
        return InMemoryMessageRepository()

    dsn = get_env_variable("DATABASE_URL")
    if not dsn:
        raise RuntimeError(
            "DATABASE_URL environment variable is required when USE_IN_MEMORY is not '1'."
        )
    return PostgresMessageRepository(dsn)


message_repository = get_message_repository()
