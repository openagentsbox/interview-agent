from typing import List, Optional, Literal
from pydantic import BaseModel, Field

# 1. 定義單個任務 (更乾淨)
class InterviewTask(BaseModel):
    topic: str = Field(
        description="Short title for this segment. E.g., 'Intro', 'Visa Status', 'Project Alpha', 'Salary'."
    )
    instruction: str = Field(
        description="Internal instruction for the interviewer agent. "
                    "Must be specific. Example: 'Ask about the specific ROI of the Python migration project mentioned in their summary.'"
    )

# 2. 定義整體輸出
class InterviewPlan(BaseModel):
    task_queue: List[InterviewTask] = Field(
        description="The ordered roadmap for the screening interview."
    )