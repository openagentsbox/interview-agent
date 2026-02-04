from typing import List, Literal, Optional
from pydantic import BaseModel, Field

class UpdateTaskDecision(BaseModel):
    # 1. 先讓模型思考，強制它去檢查 completed_topics
    reasoning: str = Field(
        description=(
            "Step-by-step analysis based on the DECISION LOGIC. "
        )
    )

    # 2. 再根據思考結果下決定
    decision: Literal["COMPLETE", "INCOMPLETE", "PASS"] = Field(
        description="The final decision based on the reasoning above."
    )

    # 3. 如果需要，才給指示
    response_instruction: Optional[str] = Field(
        description="Internal instruction for the Speaker if decision is INCOMPLETE. Otherwise null."
    )