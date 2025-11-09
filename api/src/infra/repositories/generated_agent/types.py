from datetime import datetime
from typing import Optional

from pydantic import BaseModel


class GeneratedAgentEntity(BaseModel):
    id: str
    owner_id: str
    name: str
    instruction: str
    tool: Optional[str] = None
    # UI / runtime metadata
    parent_id: Optional[str] = None
    last_updated: Optional[datetime] = None
    created_at: datetime
    updated_at: datetime

    model_config = {
        "from_attributes": True
    }


class CreateGeneratedAgentDto(BaseModel):
    owner_id: str
    name: str
    instruction: str
    tool: Optional[str] = None
    parent_id: Optional[str] = None


class UpdateGeneratedAgentDto(BaseModel):
    name: Optional[str] = None
    instruction: Optional[str] = None
    tool: Optional[str] = None
    parent_id: Optional[str] = None
    last_updated: Optional[datetime] = None
