# Hr_Agent

## Orchestrator

For any incoming task, first consult the orchestrator skill at `.agents/skills/orchestrator/SKILL.md` to determine which specialized skill(s) to delegate to:

- **business-analyst** — KPIs, dashboards, analytics, financial modeling, reporting
- **langchain-rag** — RAG pipelines, document loaders, embeddings, vector stores, retrieval
- **langchain** — LCEL chains, agents, tools, structured output, streaming, LangGraph
- **frontend** — React, Next.js, Tailwind CSS, UI components, chat interfaces, dashboards, forms

When a task spans multiple domains, use the orchestrator's decomposition and dependency ordering rules to break it into sub-tasks and execute them in the correct sequence.

## Skills

All skills live in `.agents/skills/` and are tracked in `skills-lock.json`.
