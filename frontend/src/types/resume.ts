export interface BasicInfo {
  name?: string;
  location?: string;
  languages: string[];
  hard_skills: string[];
  soft_skills: string[];
}

export interface DeepDiveTopic {
  topic_name: string;
  source_type: string;
  key_details: string;
}

export interface WorkExperience {
  company?: string;
  role?: string;
  date_range?: string;
  responsibilities_and_achievements?: string;
}

export interface Project {
  name?: string;
  type?: string;
  description?: string;
  tech_or_tools: string[];
}

export interface Education {
  school?: string;
  degree?: string;
  major?: string;
  graduation_year?: string;
}

export interface ResumeData {
  id: string;
  user_id?: string;
  basic_info: BasicInfo;
  professional_summary: string;
  interview_hooks: DeepDiveTopic[];
  work_experience: WorkExperience[];
  projects: Project[];
  education: Education[];
  status: string;
}

export interface Application {
  id: string;
  user_id: string;
  company_name: string;
  job_title: string;
  job_description?: string;
  industry?: string;
  job_grade?: string;
  created_at?: string;
  updated_at?: string;
}

export type InterviewType = "recruiter" | "technical" | "behavioral" | "hiring_manager";
export type SessionMode = "practice" | "real";

export interface Session {
  id: string;
  application_id: string;
  user_id: string;
  type: InterviewType;
  mode: SessionMode;
  technical_level?: string;
  interviewer_name?: string;
  additional_notes?: string;
  must_ask_questions: string[];
  status: string;
  created_at: string;
  updated_at: string;
}
