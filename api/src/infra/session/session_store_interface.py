import abc

from agents.memory import Session


class SessionStoreInterface(abc.ABC):
    """
    セッションストアを管理するセッションストアのインターフェース
    """

    @abc.abstractmethod
    def get_or_create(self, session_id: str) -> Session:
        raise NotImplementedError
