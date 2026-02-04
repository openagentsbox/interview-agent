# Data Schema Design Guidelines

This document outlines the standards for defining Pydantic models in the `schemas/` directory. These rules are critical for maintaining a clean separation between **Data Structure** (Python) and **Business Logic** (LLM Prompts).

---

Core Philosophy: "Pure Schema"

We strictly separate **Structure** from **Logic**.

* **Python Schemas (`schemas/*.py`)**: Define **WHAT** the data looks like (Types, Formats, Nullability).
* **System Prompts (LangSmith/MarkdowEn)**: Define **HOW** to extract it (Reasoning, Language, Categorization rules).

### ❌ Bad Practice (Logic in Code)
Do not put complex extraction rules inside the Pydantic `description`.
```python
# AVOID THIS
class Resume(BaseModel):
    summary: str = Field(
        description="Extract a 3-sentence summary. If the candidate is Senior, focus on leadership. Must be in Traditional Chinese."
    )

✅ Best Practice (Structure Only)
Keep the schema clean. Move the rules to the Prompt.

# DO THIS
class Resume(BaseModel):
    summary: str = Field(
        description="A synthesized professional summary."
    )
