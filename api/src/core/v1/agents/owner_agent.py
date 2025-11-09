from agents import Agent

from src.core.v1.instructions.owner_agent_instruction import owner_agent_instruction
from src.core.v1.tools.agent_spec_tools import run_agent_tool
from src.core.v1.tools.task_split_judge_tool import task_split_judge_tool


class OwnerAgent(Agent):
    def __init__(self) -> None:
        super().__init__(
            name="OwnerAgent",
            instructions=owner_agent_instruction,
            tools=[run_agent_tool, task_split_judge_tool],
        )
