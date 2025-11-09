from os import environ

from dotenv import load_dotenv

load_dotenv(verbose=True)


def get_env_variable(name: str, default: str = "") -> str:
    """Get environment variable with a default value."""
    return environ.get(name, default)
