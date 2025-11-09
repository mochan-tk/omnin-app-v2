from pydantic import BaseModel


# TODO: もう少しフォーマット考える
class OwnerAgentRequest(BaseModel):
    owner_id: str
    owner_agent_id: str
    session_id: str  # 会話の履歴
    user_input: str
