from pydantic import BaseModel, Field

class InterviewBetterVersion(BaseModel):
    reasoning: str = Field(
        description=(
            "Detailed analysis of the candidate's response. "
        )
    )
    score: int = Field(
        description=(
            "A score from 1 to 10 evaluating the quality of the response. "
        ),
        ge=1, 
        le=10
    )
    better_version: str = Field(
        description=(
            "An optimized, ideal version of the user's answer. "
        )
    )


class InterviewGrammar(BaseModel):
    corrected_version: str = Field(
        description=(
            "An corrected grammar version of the user's answer. "
        )
    )