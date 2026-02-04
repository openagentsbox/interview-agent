# OpenAgentsBox - AI Interview Agent

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![GitHub stars](https://img.shields.io/github/stars/openagentsbox/interview-agent?style=social)](https://github.com/openagentsbox/interview-agent)

> **"Interview coaching agents on the market are expensive and underwhelming. With AI this accessible, why pay so much?"**

## 💡 About This Project

Most interview prep tools charge a premium for basic AI features. This project is my answer to that.

**Built with:**
- 🎨 **Frontend**: Powered by Claude Code
- ⚙️ **Backend**: LangGraph + FastAPI
- 📋 **Prompt Management**: LangSmith (versioning + tracing + evaluation)

**Current Status:** Beta — core features are complete. Focusing on evaluation and optimization.

⭐ **If you find this useful, a star would mean a lot!**

I'm planning to build more agents with the same BYOK (Bring Your Own Key) philosophy. Ideas or feedback? Feel free to reach out!

## 🔑 Key Features
* **Bring Your Own Key (BYOK)** — Use your own OpenAI API Key
* **Privacy First** — Key stored only in browser, never touches our server
* **Full Functionality** — Resume parsing, JD matching, mock interviews

## 📖 How to Use

1. **Enter your OpenAI API Key** — stored only in your browser (never sent to our server)
2. **Upload your resume (PDF)** — AI parses and extracts your experience
3. **Add a company + Job Description** — paste the JD you're applying for
4. **Start mock interview** — practice with AI interviewer

## ✨ Features

| Feature | Description |
|---------|-------------|
| 🎯 **Job Fit Analysis** | AI analyzes how well your resume matches the job description |
| 🎭 **4 Interview Modes** | Recruiter, Technical, Hiring Manager, Behavioral |
| 📝 **Grammar Correction** | Real-time grammar feedback on your answers |
| 📊 **Answer Scoring** | Get scored (1-10) with suggestions for better responses |
| 🎙️ **Real Interview Mode** | Voice-only mode simulating a real phone interview |

## ⚠️ Current Status
* **Prompt Management**: Prompts are currently managed via **LangSmith**.
* **Local Execution**: Full local execution is not yet supported due to cloud dependencies.
* **Live Demo**: Try it here → [https://openagentsbox.com/interview](https://openagentsbox.com/interview)

> 📝 **Note**: I'm still organizing the LangSmith prompt parameters. Once ready, I'll publish them here.
> If you're concerned about using my hosted prompts, you can write your own prompts locally and run it yourself.


## 🔮 Future Plans
I will continue to develop and share more useful AI agents on my website.
Stay tuned for more tools at [https://openagentsbox.com](https://openagentsbox.com)!
---