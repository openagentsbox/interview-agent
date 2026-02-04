"""
Resume Parser 評估器 - LangSmith SDK 格式 (langsmith>=0.3.13)

只有 2 個評估器：
1. exact_match - 精確匹配，返回多個分數（免費）
2. llm_judge - LLM 評估整體提取品質（1 次 LLM 調用）

使用方式：
    from langsmith import Client
    from backend.evaluators import ALL_EVALUATORS

    client = Client()
    client.evaluate(
        target_func,
        data="your_dataset_name",
        evaluators=ALL_EVALUATORS
    )
"""

from langchain.chat_models import init_chat_model
from pydantic import BaseModel, Field


# ===== 工具函數 =====

def _normalize(value) -> str | None:
    """標準化字串"""
    if value is None:
        return None
    return str(value).strip().lower()


def _normalize_list(value: list | None) -> list[str]:
    """標準化列表"""
    if value is None:
        return []
    return sorted([_normalize(v) for v in value if v])


# ===== 1. 精確匹配評估器 =====

def exact_match(
    inputs: dict,
    outputs: dict,
    reference_outputs: dict
) -> list[dict]:
    """精確匹配評估 - 返回多個分數

    評估欄位：
    - basic_info: name, location
    - skills: languages, frameworks_and_libs, tools_and_platforms
    - work_experience: 公司名稱
    - education: 學校名稱
    """
    results = []

    # === Basic Info ===
    output_basic = outputs.get("basic_info", {}) or {}
    expected_basic = reference_outputs.get("basic_info", {}) or {}

    basic_fields = ["name", "location"]
    basic_matched, basic_total = 0, 0

    for field in basic_fields:
        expected_val = expected_basic.get(field)
        if expected_val is None:
            continue
        basic_total += 1
        if _normalize(output_basic.get(field)) == _normalize(expected_val):
            basic_matched += 1

    if basic_total > 0:
        results.append({
            "key": "basic_info",
            "score": basic_matched / basic_total,
            "comment": f"{basic_matched}/{basic_total} 欄位匹配"
        })

    # === Skills ===
    output_skills = outputs.get("skills", {}) or {}
    expected_skills = reference_outputs.get("skills", {}) or {}
    categories = ["languages", "frameworks_and_libs", "tools_and_platforms"]

    skills_recall, skills_count = 0.0, 0
    for cat in categories:
        expected_list = expected_skills.get(cat, [])
        if not expected_list:
            continue
        skills_count += 1
        output_set = set(_normalize_list(output_skills.get(cat, [])))
        expected_set = set(_normalize_list(expected_list))
        matched = output_set & expected_set
        skills_recall += len(matched) / len(expected_set)

    if skills_count > 0:
        results.append({
            "key": "skills",
            "score": skills_recall / skills_count,
            "comment": f"{skills_count} 類技能評估"
        })

    # === Work Experience (公司名稱) ===
    output_work = outputs.get("work_experience", []) or []
    expected_work = reference_outputs.get("work_experience", []) or []

    if expected_work:
        output_companies = {_normalize(w.get("company")) for w in output_work if w.get("company")}
        expected_companies = {_normalize(w.get("company")) for w in expected_work if w.get("company")}
        if expected_companies:
            matched = output_companies & expected_companies
            results.append({
                "key": "work_experience",
                "score": len(matched) / len(expected_companies),
                "comment": f"公司匹配 {len(matched)}/{len(expected_companies)}"
            })

    # === Education (學校名稱) ===
    output_edu = outputs.get("education", []) or []
    expected_edu = reference_outputs.get("education", []) or []

    if expected_edu:
        output_schools = {_normalize(e.get("school")) for e in output_edu if e.get("school")}
        expected_schools = {_normalize(e.get("school")) for e in expected_edu if e.get("school")}
        if expected_schools:
            matched = output_schools & expected_schools
            results.append({
                "key": "education",
                "score": len(matched) / len(expected_schools),
                "comment": f"學校匹配 {len(matched)}/{len(expected_schools)}"
            })

    return results if results else [{"key": "exact_match", "score": 1.0, "comment": "無可比較欄位"}]


# ===== 2. LLM Judge 評估器 =====

class ExtractionJudgment(BaseModel):
    """提取品質評估結構"""
    score: int = Field(ge=1, le=5, description="1-5 分，5 為最佳")
    completeness: str = Field(description="完整性：是否提取了所有重要資訊")
    accuracy: str = Field(description="準確性：提取的資訊是否正確")
    reasoning: str = Field(description="評估理由")


def llm_judge(
    inputs: dict,
    outputs: dict,
    reference_outputs: dict
) -> dict:
    """LLM 評估整體提取品質

    評估維度：完整性、準確性
    """
    # 整理輸出資料
    basic_info = outputs.get("basic_info", {}) or {}
    work_exp = outputs.get("work_experience", []) or []
    education = outputs.get("education", []) or []
    skills = outputs.get("skills", {}) or {}
    summary = outputs.get("generated_summary", "") or ""

    # 整理成就
    achievements = []
    for work in work_exp:
        company = work.get("company", "")
        achs = work.get("key_achievements", [])
        if achs:
            achievements.append(f"{company}: {achs}")

    prompt = f"""你是履歷解析品質評估專家。請評估以下履歷提取結果的品質。

=== 提取結果 ===
基本資訊：
- 姓名: {basic_info.get('name', 'N/A')}
- 地點: {basic_info.get('location', 'N/A')}

工作經歷: {len(work_exp)} 段
{chr(10).join(achievements) if achievements else '無成就資料'}

教育背景: {len(education)} 段

技能: {skills}

摘要: {summary if summary else '無'}

=== 評估維度 ===
1. 完整性：是否提取了履歷中的所有重要資訊（基本資料、工作經歷、技能等）
2. 準確性：提取的資訊格式是否正確、內容是否合理

請給出 1-5 分評分（5 分最佳）。"""

    try:
        llm = init_chat_model("gpt-4o-mini", temperature=0)
        structured_llm = llm.with_structured_output(ExtractionJudgment)
        judgment: ExtractionJudgment = structured_llm.invoke(prompt)

        # 1-5 分轉換為 0-1 分
        normalized_score = (judgment.score - 1) / 4

        return {
            "key": "llm_judge",
            "score": normalized_score,
            "comment": f"評分: {judgment.score}/5\n"
                       f"完整性: {judgment.completeness}\n"
                       f"準確性: {judgment.accuracy}\n"
                       f"理由: {judgment.reasoning}"
        }
    except Exception as e:
        return {"key": "llm_judge", "score": 0.0, "comment": f"評估失敗: {e}"}


# ===== 匯出 =====

ALL_EVALUATORS = [exact_match, llm_judge]
EXACT_ONLY = [exact_match]  # 只跑精確匹配（免費）
