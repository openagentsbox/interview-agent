from langgraph.graph import START, END, StateGraph
from langgraph.checkpoint.base import BaseCheckpointSaver
from typing import Optional

from .state import InterviewState
from .node import task_router, init_task_node, update_task_node, respond_node


def create_interview_graph(checkpointer: Optional[BaseCheckpointSaver] = None):
    """建立面試對話 Graph

    Flow:
        START → task_router
            ├─ (total_round == 0) → init_task_node → respond_node → END
            └─ (total_round > 0)  → update_task_node → respond_node → END
    """
    builder = StateGraph(InterviewState)

    # Add nodes
    builder.add_node("init_task_node", init_task_node)
    builder.add_node("update_task_node", update_task_node)
    builder.add_node("respond_node", respond_node)

    # Conditional entry: router decides init vs update
    builder.add_conditional_edges(
        START,
        task_router,
        {"init_task": "init_task_node", "update_task": "update_task_node"},
    )

    # Both task nodes flow into respond
    builder.add_edge("init_task_node", "respond_node")
    builder.add_edge("update_task_node", "respond_node")

    # Respond → END
    builder.add_edge("respond_node", END)

    return builder.compile(checkpointer=checkpointer)


# Graph builder (compiled at runtime after checkpointer is initialized)
_graph = None


def get_graph():
    """Get the compiled graph instance"""
    global _graph
    if _graph is None:
        from .checkpointer import get_checkpointer
        _graph = create_interview_graph(checkpointer=get_checkpointer())
    return _graph


def reset_graph():
    """Reset graph instance (call after checkpointer changes)"""
    global _graph
    _graph = None
