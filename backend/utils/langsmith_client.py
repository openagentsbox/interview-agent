"""
LangSmith 客戶端工具

主要用途：
1. 自動追蹤所有 LLM 調用（設定環境變數即可）
2. 創建和管理測試數據集
3. 運行評估

環境變數設定（.env）：
    LANGCHAIN_API_KEY=your_langsmith_api_key
    LANGCHAIN_TRACING_V2=true
    LANGCHAIN_PROJECT=jiaf-resume-parser
"""

import os
from typing import Callable
from langsmith import Client

# 初始化 LangSmith 客戶端
client = Client()


# ===== Dataset 管理 =====

def create_dataset(name: str, description: str = "") -> str:
    """創建測試數據集

    Args:
        name: 數據集名稱
        description: 數據集描述

    Returns:
        dataset_id
    """
    dataset = client.create_dataset(dataset_name=name, description=description)
    return str(dataset.id)


def upload_examples(dataset_name: str, examples: list[dict]) -> None:
    """上傳測試案例到數據集

    Args:
        dataset_name: 數據集名稱
        examples: 測試案例列表
            格式: [{"input": {"resume_text": "..."}, "output": {"name": "...", ...}}, ...]

    Example:
        >>> examples = [
        ...     {
        ...         "input": {"resume_text": "John Doe\\nSoftware Engineer..."},
        ...         "output": {"basic_info": {"name": "John Doe"}, ...}
        ...     }
        ... ]
        >>> upload_examples("resume-parser-test", examples)
    """
    dataset = client.read_dataset(dataset_name=dataset_name)
    client.create_examples(
        inputs=[e["input"] for e in examples],
        outputs=[e.get("output") for e in examples],
        dataset_id=dataset.id
    )


def list_datasets() -> list[dict]:
    """列出所有數據集"""
    datasets = client.list_datasets()
    return [{"name": d.name, "id": str(d.id), "description": d.description} for d in datasets]


# ===== Evaluation 評估 =====

def run_evaluation(
    dataset_name: str,
    target_func: Callable,
    evaluators: list | None = None,
    experiment_prefix: str = "eval"
) -> dict:
    """對數據集運行評估

    Args:
        dataset_name: 數據集名稱
        target_func: 要評估的函數，接收 input dict，返回 output
        evaluators: 評估器列表（可選）
        experiment_prefix: 實驗名稱前綴

    Returns:
        評估結果

    Example:
        >>> from tools.resume_parser import parse_resume
        >>> def target(inputs):
        ...     return parse_resume(inputs["resume_text"]).model_dump()
        >>> results = run_evaluation("resume-parser-test", target)
    """
    from langsmith.evaluation import evaluate

    results = evaluate(
        target_func,
        data=dataset_name,
        evaluators=evaluators or [],
        experiment_prefix=experiment_prefix,
    )
    return results


# ===== 工具函數 =====

def get_tracing_url(run_id: str) -> str:
    """取得特定 run 的 LangSmith 追蹤頁面 URL"""
    project = os.getenv("LANGCHAIN_PROJECT", "default")
    return f"https://smith.langchain.com/o/default/projects/p/{project}/r/{run_id}"


def enable_tracing(project_name: str = "jiaf-resume-parser") -> None:
    """啟用 LangSmith 追蹤（程式化設定）"""
    os.environ["LANGCHAIN_TRACING_V2"] = "true"
    os.environ["LANGCHAIN_PROJECT"] = project_name


def disable_tracing() -> None:
    """停用 LangSmith 追蹤"""
    os.environ["LANGCHAIN_TRACING_V2"] = "false"
