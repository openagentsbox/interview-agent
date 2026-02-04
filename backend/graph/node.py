"""
Graph nodes - interview agent logic
"""
from langchain.chat_models import init_chat_model
from langchain_core.messages import HumanMessage, SystemMessage, AIMessage
from langchain_core.runnables import RunnableConfig

from .state import InterviewState
from .prompts import get_init_task_prompt, get_update_task_prompt, get_respond_prompt
from backend.schemas.interview_init_task import InterviewPlan, InterviewTask
from backend.schemas.interview_update_task import UpdateTaskDecision


# ─────────────────────────────────────────────
# Router
# ─────────────────────────────────────────────

def task_router(state: InterviewState):
    """第一輪走 init_task，之後走 update_task"""
    if state["total_round"] == 0:
        return "init_task"
    return "update_task"


# ─────────────────────────────────────────────
# Nodes
# ─────────────────────────────────────────────

async def init_task_node(state: InterviewState, config: RunnableConfig):
    """首輪：根據使用者資料建立面試任務規劃"""
    api_key = config["configurable"]["api_key"]
    interview_type = config["configurable"]["interview_type"]
    init_task_prompt = get_init_task_prompt(interview_type)
    init_task_llm = init_chat_model(model="gpt-4o", temperature=0, api_key=api_key).with_structured_output(InterviewPlan)
    chain = init_task_prompt | init_task_llm

    res = await chain.ainvoke(config["configurable"]["info"])
    queue = res.task_queue
    first = queue[0] if queue else None
    return {
        "task_queue": queue,
        "current_task_topic": first.topic if first else "",
        "current_task_instruction": first.instruction if first else "",
        "current_topic_count": 0,
    }


async def update_task_node(state: InterviewState, config: RunnableConfig):
        # 1. 準備輸入
    api_key = config["configurable"]["api_key"]
    interview_type = config["configurable"]["interview_type"]
    prompt_input = prepare_update_prompt(state, config)
    update_task_prompt = get_update_task_prompt(interview_type)
    llm = init_chat_model(model="gpt-4o-mini", temperature=0.5, api_key=api_key)
    manager_chain = update_task_prompt | llm.with_structured_output(UpdateTaskDecision)
    result = await manager_chain.ainvoke(prompt_input)
    print(f"reasoning: {result.reasoning}")
    print(f"decision: {result.decision}")
    print(f"response_instruction: {result.response_instruction}")

    completed_topics = state.get("completed_topics", [])
    current_task_topic = state.get("current_task_topic", '')
    current_task_instruction = state.get("current_task_instruction", '')
    current_topic_count = state.get("current_topic_count", 0)
    if result.decision == "INCOMPLETE":

        return {"current_task_instruction": current_task_instruction + '\n' + result.response_instruction,
                "current_topic_count":current_topic_count + 1}
    else:
        task_queue = list(state.get("task_queue", []))
        if len(task_queue) <= 1:
            return {"current_task_topic": 'end',
                    "current_task_instruction": 'ending this interview',
                    "current_topic_count": 1}
        else:
            completed_task = task_queue.pop(0)
            completed_topics = list(completed_topics)
            completed_topics.append(completed_task.topic)
            return {"current_task_topic": task_queue[0].topic,
                    "current_task_instruction": task_queue[0].instruction,
                    "current_topic_count": 1,
                    "task_queue": task_queue,
                    "completed_topics": completed_topics}



async def respond_node(state: InterviewState, config: RunnableConfig):
    """回應節點：根據當前任務指示 + 對話歷史，呼叫 LLM"""
    # 防呆：如果沒有任務了 (面試結束)
    if not state.get("current_task_topic") or state.get("current_task_topic") == "end":
        return {"messages": [AIMessage(content="Thank you so much for your time today. We will be in touch soon!")]}

    total_info = config["configurable"].get("info", {})
    response_type = "START" if state["total_round"] == 0 else "Ongoing"
    input_vars = {
        "chat_history": state["messages"][:-1],
        "company_name": total_info.get("company_name", "our company"),
        "instruction": state["current_task_instruction"],
        "name": total_info.get("name", "Candidate"),
        "professional_summary": total_info.get("professional_summary", "No summary available"),
        "response_type": response_type,
        "topic": state["current_task_topic"],
        "user_reply": state["messages"][-1].content,
    }

    api_key = config["configurable"]["api_key"]
    llm = init_chat_model(model="gpt-4o-mini", temperature=0.5, api_key=api_key)
    prompt = get_respond_prompt()
    chain = prompt | llm

    response_text = await chain.ainvoke(input_vars)
    return {"messages": [response_text], "total_round": state["total_round"] + 1}


def prepare_update_prompt(state: InterviewState, config: RunnableConfig):
    total_round = state.get("total_round", 0)
    max_round = state.get("max_round", 0)
    total_info = config["configurable"].get("info")
    remaining_rounds = max_round - total_round
    if remaining_rounds <= 3:
        # 觸發警告：時間緊迫
        pacing = "WARNING: Time is running out. STRICTLY LIMIT follow-ups. AGGRESSIVELY mark low-priority future tasks as completed to finish on time."
    elif len(state.get("task_queue", [])) - 1 > remaining_rounds:
        # 觸發警告：任務積壓 (任務數 > 剩餘回合數)
        pacing = "WARNING: Too many tasks remaining. You must speed up. Combine topics or auto-skip less important ones."
    else:
        # 標準模式
        pacing = "Standard pacing. Be thorough."

    return {'additional_notes':total_info.get('additional_notes', ''),
             'company_name':total_info.get('company_name'),
             'completed_topics':state.get("completed_topics", []),
             'curr_topic_count': state.get("current_topic_count", 0),
             'current_task_topic': state.get("current_task_topic", ''),
             'current_topic_instruction':state.get("current_task_instruction", ''),
             'education':total_info.get('education',''),
             'job_title':total_info.get('job_title',''),
             'job_description':total_info.get('job_description',''),
             "last_user_reply": state["messages"][-1].content,
             "last_question": state["messages"][-2].content,
             'name': total_info.get('name',''),
             'pacing': pacing,
             'professional_summary':total_info.get('professional_summary',''),
             'work_experience':total_info.get('work_experience','')}