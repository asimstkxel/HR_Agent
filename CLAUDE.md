# Hr_Agent

## GUARDRAIL: Orchestrator-First (MANDATORY)

**EVERY incoming task MUST be routed through the orchestrator BEFORE any action is taken. NO EXCEPTIONS.**

Before writing code, reading files, or taking any action:
1. Read `.agents/skills/orchestrator/SKILL.md`
2. Classify the task using the orchestrator's delegation rules
3. Identify which skill(s) handle it
4. State the delegation clearly, then execute

This applies to ALL tasks — even if the task seems simple or the target skill is obvious.

### Available Skills (via orchestrator only)

- **business-analyst** — KPIs, dashboards, analytics, financial modeling, reporting
- **langchain-rag** — RAG pipelines, document loaders, embeddings, vector stores, retrieval
- **langchain** — LCEL chains, agents, tools, structured output, streaming, LangGraph
- **frontend** — React, Next.js, Tailwind CSS, UI components, chat interfaces, dashboards, forms
- **vercel** — Deployment, CI/CD, environment variables, domains, serverless functions, DevOps
- **qa** — Manual testing, test plans, test cases, bug reports, regression/smoke testing, QA checklists

When a task spans multiple domains, use the orchestrator's decomposition and dependency ordering rules to break it into sub-tasks and execute them in the correct sequence.

## Skills

All skills live in `.agents/skills/` and are tracked in `skills-lock.json`.
