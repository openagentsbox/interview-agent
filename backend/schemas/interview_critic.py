from pydantic import BaseModel, Field

class InterviewCritic(BaseModel):
    score: int = Field(
        ge=1,
        le=10,
        description="Integer 1-10. (8-10: Strong match, 5-7: Potential with gaps, 1-4: Mismatch)."
    )
    score_reason: str = Field(description="A concise analysis explaining the score. 2-3 sentences max.")
