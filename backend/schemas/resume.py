from pydantic import BaseModel, Field
from typing import List, Optional, Literal

# --- 1. [靜態屬性] 包含基本資料與技能 ---
class BasicInfo(BaseModel):
    name: Optional[str] = Field(default=None)
    location: Optional[str] = Field(default=None, description="City, Country")
    
    # 技能直接併入這裡，省去一層結構
    languages: List[str] = Field(default_factory=list, description="Spoken languages")
    hard_skills: List[str] = Field(
        default_factory=list, 
        description="All technical skills, tools, and domain knowledge (e.g., 'Python', 'SEO')."
    )
    soft_skills: List[str] = Field(default_factory=list, description="Interpersonal traits.")

# --- 2. [核心分析] 面試官的戰略地圖 ---
class DeepDiveTopic(BaseModel):
    topic_name: str = Field(..., description="Project or Company Name.")
    source_type: Literal["Work Experience", "Personal Project", "Academic", "Competition"] = Field(..., description="Source.")
    key_details: str = Field(
        ..., 
        description="A mixed list of precise FACTS. MUST include: 1. Specific Tools/Languages used, 2. Metrics/Outcomes."
    )

# --- 3. [經歷數據] ---
class WorkExperience(BaseModel):
    company: Optional[str] = Field(default=None)
    role: Optional[str] = Field(default=None)
    date_range: Optional[str] = Field(default=None)
    responsibilities_and_achievements: Optional[str] = Field(
        default=None,
        description="A concise paragraph summarizing the role's core scope, product built, and main contribution. NO bullet points."
    )

class Project(BaseModel):
    name: Optional[str] = Field(default=None)
    type: Literal["Personal", "Academic", "Freelance", "Competition", "Work", "Unknown"] = Field(
        default="Unknown", 
        description="Context of the project."
    )
    description: Optional[str] = Field(
        default=None, 
        description="Brief factual summary of what was built or done. Does NOT require metrics or impact."
    )
    tech_or_tools: List[str] = Field(default_factory=list)

class Education(BaseModel):
    school: Optional[str] = Field(default=None)
    degree: Optional[str] = Field(default=None)
    major: Optional[str] = Field(default=None)
    graduation_year: Optional[str] = Field(default=None)

# --- Root Schema ---
class ResumeSchema(BaseModel):
    basic_info: BasicInfo
    professional_summary: str = Field(..., description="3-5 sentences bio in dominant language.")
    interview_hooks: List[DeepDiveTopic] = Field(..., description="Top 3-5 deep dive topics.")
    
    work_experience: List[WorkExperience]
    projects: List[Project]
    education: List[Education]