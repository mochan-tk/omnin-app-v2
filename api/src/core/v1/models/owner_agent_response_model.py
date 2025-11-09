from pydantic import BaseModel


# TODO: もう少しフォーマット考える
class OwnerAgentResponse(BaseModel):
    reply: str
