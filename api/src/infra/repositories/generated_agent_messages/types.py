from datetime import datetime
from typing import Literal

from pydantic import BaseModel


class MessageEntity(BaseModel):
    id: str
    agent_id: str
    session_id: str
    role: Literal["user", "assistant"]
    content: str
    created_at: datetime

    model_config = {"from_attributes": True}


class CreateMessageDto(BaseModel):
    agent_id: str
    session_id: str
    role: Literal["user", "assistant"]
    content: str
