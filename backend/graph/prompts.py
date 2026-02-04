"""
Centralized prompt fetching.
Priority: LangSmith → local YAML files in backend/prompts/

See backend/PROMPTS.md for the full prompt reference.
"""
from functools import lru_cache
from pathlib import Path

import yaml

PROMPTS_DIR = Path(__file__).parent.parent / "prompts"

# ─────────────────────────────────────────────
# LangSmith (optional)
# ─────────────────────────────────────────────

_langsmith_client = None


def _get_langsmith():
    global _langsmith_client
    if _langsmith_client is None:
        try:
            from langsmith import Client
            _langsmith_client = Client()
        except Exception:
            _langsmith_client = False
    return _langsmith_client if _langsmith_client is not False else None


# ─────────────────────────────────────────────
# Local YAML loader
# ─────────────────────────────────────────────

@lru_cache(maxsize=20)
def _load_yaml(filename: str) -> str | None:
    """Read content from a YAML file in backend/prompts/."""
    path = PROMPTS_DIR / filename
    if not path.exists():
        return None
    with open(path, "r", encoding="utf-8") as f:
        data = yaml.safe_load(f) or {}
    return data.get("content")


# ─────────────────────────────────────────────
# Public API
# ─────────────────────────────────────────────


@lru_cache(maxsize=10)
def get_init_task_prompt(interview_type: str):
    """Get prompt for init_task_node.
    LangSmith: job-agent-{type}-init-task-system
    Fallback:  prompts/{type}_init_task.yaml
    """
    client = _get_langsmith()
    if client:
        try:
            return client.pull_prompt(f"job-agent-{interview_type}-init-task-system")
        except Exception as e:
            print(f"Warning: LangSmith pull failed (init_task): {e}")

    return _load_yaml(f"{interview_type}_init_task.yaml")


@lru_cache(maxsize=10)
def get_update_task_prompt(interview_type: str):
    """Get prompt for update_task_node.
    LangSmith: job-agent-{type}-update-task-system
    Fallback:  prompts/{type}_update_task.yaml
    """
    client = _get_langsmith()
    if client:
        try:
            return client.pull_prompt(f"job-agent-{interview_type}-update-task-system")
        except Exception as e:
            print(f"Warning: LangSmith pull failed (update_task): {e}")

    return _load_yaml(f"{interview_type}_update_task.yaml")


@lru_cache(maxsize=10)
def get_tool_prompt(name: str):
    """Get prompt for tools (resume, critic, grammar,score_better).
    LangSmith: job-agent-tool-{name}
    Fallback:  prompts/{name}.yaml
    """
    client = _get_langsmith()
    if client:
        try:
            return client.pull_prompt(f"job-agent-tool-{name}")
        except Exception as e:
            print(f"Warning: LangSmith pull failed ({name}): {e}")

    return _load_yaml(f"{name}.yaml")

@lru_cache(maxsize=5)
def get_respond_prompt():
    client = _get_langsmith()
    if client:
        try:
            return client.pull_prompt(f"respond_prompt")
        except Exception as e:
            print(f"Warning: LangSmith pull failed (init_task): {e}")

    return _load_yaml(f"respond_prompt.yaml")