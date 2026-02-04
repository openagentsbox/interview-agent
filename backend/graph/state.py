from typing import TypedDict, Annotated, List
from langchain_core.messages import AnyMessage
from operator import add

from backend.schemas.interview_init_task import InterviewTask



class InterviewState(TypedDict):
    messages: Annotated[List[AnyMessage], add]
    total_round: int
    max_round: int
    task_queue: List[InterviewTask]
    current_task_topic: str
    current_task_instruction: str
    current_topic_count: int
    completed_topics: List[str]