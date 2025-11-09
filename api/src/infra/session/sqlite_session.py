from typing import Dict

from agents import SQLiteSession
from agents.memory import Session

from .session_store_interface import SessionStoreInterface


# TODO: メモリ管理大事なので、しっかり実装する。Redisとかで遺族下するといいかも
class SQLiteSessionStore(SessionStoreInterface):
    """
    Open AI Agent SDKのSQLiteセッションストア実装
    """

    def __init__(self):
        # インメモリーのセッションストア (KVS)
        self.session_store: Dict[str, Session] = {}

    def get_or_create(self, session_id) -> Session:
        if session_id not in self.session_store:
            self.session_store[session_id] = SQLiteSession(session_id)
        return self.session_store[session_id]
