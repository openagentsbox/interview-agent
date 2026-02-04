from backend.graph.prompts import get_tool_prompt
from langchain.chat_models import init_chat_model
from backend.schemas.interview_critic import InterviewCritic

def get_critic_chain(api_key: str):
    """建立 critic chain（per-request，使用使用者提供的 API key）"""
    prompt = get_tool_prompt("critic")

    llm = init_chat_model(model="gpt-4o-mini", temperature=0, api_key=api_key)
    structured_llm = llm.with_structured_output(InterviewCritic)
    return prompt | structured_llm



async def get_critic_async(input_data: dict, api_key: str) -> InterviewCritic:
    """
    非同步版本的履歷-職位匹配評估

    input_data should contain:
        - company_name
        - job_title
        - job_description
        - industry
        - name
        - education
        - hard_skill
        - soft_skill
        - interview_hook
        - professional_summary
        - work_experience
    """
    chain = get_critic_chain(api_key)
    result = await chain.ainvoke(input_data)
    return result