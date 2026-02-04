from backend.graph.prompts import get_tool_prompt
from langchain.chat_models import init_chat_model
from backend.schemas.interview_feedback import InterviewBetterVersion, InterviewGrammar



def get_grammar_chain(api_key: str):
    """建立 critic chain（per-request，使用使用者提供的 API key）"""
    prompt = get_tool_prompt("grammar")
    llm = init_chat_model(model="gpt-4o-mini", temperature=0, api_key=api_key)
    structured_llm = llm.with_structured_output(InterviewGrammar)
    return prompt | structured_llm

def get_better_version_chain(api_key: str):
    """建立 better version chain（per-request，使用使用者提供的 API key）"""
    prompt = get_tool_prompt("score_better")
    llm = init_chat_model(model="gpt-4o-mini", temperature=0.2, api_key=api_key)
    structured_llm = llm.with_structured_output(InterviewBetterVersion)
    return prompt | structured_llm



async def get_grammar_async(input_data: dict, api_key: str) -> InterviewGrammar:
    """
    input_data should contain:
        - text
    text = user_answer
    """
    
    chain = get_grammar_chain(api_key)
    result = await chain.ainvoke(input_data)
    return result


async def get_score_better_async(input_data: dict, api_key: str) -> InterviewBetterVersion:
    """
    input_data should contain:
        - name
        - education
        - work_experience
        - professional_summary
        - company_name
        - job_description
        - additional_notes
        - interview_type
        - current_task_topic
        - current_topic_instruction
        - last_question
        - last_user_reply
    """
    chain = get_better_version_chain(api_key)
    result = await chain.ainvoke(input_data)
    return result