import fitz
from langchain.chat_models import init_chat_model

from backend.schemas.resume import ResumeSchema
from backend.graph.prompts import get_tool_prompt

def extract_text_from_pdf(pdf_path: str) -> str:
    doc = fitz.open(pdf_path)
    text = ""
    for page in doc:
        text += page.get_text()
    return text


def get_parsing_chain(api_key: str):
    """建立 parsing chain（per-request，使用使用者提供的 API key）"""
    prompt = get_tool_prompt("resume")

    llm = init_chat_model(model="gpt-4o", temperature=0, api_key=api_key)
    structured_llm = llm.with_structured_output(ResumeSchema)

    return prompt | structured_llm


def parse_resume(pdf_path: str, api_key: str) -> dict:
    """
    Parse a resume PDF file into structured data.
    Input should be the file path to the PDF.
    """
    # 1. 取得文字
    resume_text = extract_text_from_pdf(pdf_path)

    # 2. 取得 Chain (per-request)
    chain = get_parsing_chain(api_key)

    # 3. 執行
    result: ResumeSchema = chain.invoke({"text": resume_text})

    return result.model_dump()



if __name__ == "__main__":
    pdf_path = r"C:\Users\wesz7\OneDrive\桌面\work\JIAF\backend\tools\JiangZongYu_Resume.pdf"
    #get_parsing_chain()
    result = parse_resume(pdf_path)
    
    # 3. 執行
    
    print(result)