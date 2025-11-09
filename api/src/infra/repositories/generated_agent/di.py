from src.config import get_env_variable

from .in_memory_repository import InMemoryGeneratedAgentRepository
from .interface import GeneratedAgentRepositoryInterface
from .postgres_repository import PostgresGeneratedAgentRepository


def get_generated_agent_repository() -> GeneratedAgentRepositoryInterface:
    use_in_memory = get_env_variable("USE_IN_MEMORY", "0") == "1"
    if use_in_memory:
        return InMemoryGeneratedAgentRepository()

    dsn = get_env_variable("DATABASE_URL")
    if not dsn:
        raise RuntimeError(
            "DATABASE_URL environment variable is required when USE_IN_MEMORY is not '1'."
        )
    return PostgresGeneratedAgentRepository(dsn)


generated_agent_repository = get_generated_agent_repository()
