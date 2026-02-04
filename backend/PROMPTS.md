# Prompts Reference

This project uses LangSmith to manage prompts by default.
If you don't have LangSmith configured, create a `prompts/` folder under `backend/` and add `.yaml` files as described below.

## Directory Structure

```
backend/prompts/
├── recruiter_system.yaml
├── recruiter_init_task.yaml
├── technical_system.yaml
├── technical_init_task.yaml
├── behavioral_system.yaml
├── behavioral_init_task.yaml
├── hiring_manager_system.yaml
├── hiring_manager_init_task.yaml
├── resume_parser.yaml
└── grammar_correction.yaml
```

## Prompt List

| File Name | LangSmith Name | Used By | Description |
|-----------|---------------|---------|-------------|
| `recruiter_system.yaml` | `job-agent-recruiter-system` | `graph/prompts.py` → `api_chat.py` | Recruiter interview system prompt |
| `recruiter_init_task.yaml` | `job-agent-recruiter-init-task-system` | `graph/prompts.py` → `node.py` | Recruiter interview task planner |
| `technical_system.yaml` | `job-agent-technical-system` | `graph/prompts.py` → `api_chat.py` | Technical interview system prompt |
| `technical_init_task.yaml` | `job-agent-technical-init-task-system` | `graph/prompts.py` → `node.py` | Technical interview task planner |
| `behavioral_system.yaml` | `job-agent-behavioral-system` | `graph/prompts.py` → `api_chat.py` | Behavioral interview system prompt |
| `behavioral_init_task.yaml` | `job-agent-behavioral-init-task-system` | `graph/prompts.py` → `node.py` | Behavioral interview task planner |
| `hiring_manager_system.yaml` | `job-agent-hiring_manager-system` | `graph/prompts.py` → `api_chat.py` | Hiring manager interview system prompt |
| `hiring_manager_init_task.yaml` | `job-agent-hiring_manager-init-task-system` | `graph/prompts.py` → `node.py` | Hiring manager interview task planner |
| `resume-parser.yaml` | `job-agent-resume-parser` | `tools/resume_parser.py` | Resume PDF parsing prompt |
| `grammar-correction.yaml` | `job-agent-grammar-correction` | `tools/feedback.py` | Interview answer feedback & grammar |

## YAML Format

Each `.yaml` file should contain a single `content` key with your prompt text.
Use `{variable}` placeholders — they will be substituted at runtime.

```yaml
content: |
  You are a recruiter interviewing {name} for {job_title} at {company_name}.
  ...
```

## Available Variables

### Interview Prompts (system & init_task)

| Category | Variables |
|----------|-----------|
| Resume | `{name}`, `{location}`, `{generated_summary}`, `{work_experience}`, `{projects}`, `{education}`, `{skills}`, `{interview_hooks}` |
| Company | `{company_name}`, `{job_title}`, `{job_description}`, `{industry}`, `{job_grade}` |
| Session | `{interviewer_name}`, `{additional_notes}`, `{technical_level}`, `{must_ask_questions}` |

### Resume Parser

| Variable |
|----------|
| (Input is raw PDF text, no placeholders needed) |

### Grammar Correction

| Variable |
|----------|
| `{question}`, `{answer}` |
