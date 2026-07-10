from dotenv import load_dotenv

load_dotenv()

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from agent import create_hr_agent

app = FastAPI(title="HR Job Search Agent API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_methods=["*"],
    allow_headers=["*"],
)

agent = create_hr_agent()

# Store conversations in memory (keyed by session_id)
sessions: dict[str, list] = {}


class ChatRequest(BaseModel):
    message: str
    session_id: str = "default"


class ChatResponse(BaseModel):
    reply: str
    session_id: str


@app.post("/api/chat", response_model=ChatResponse)
def chat(req: ChatRequest):
    if req.session_id not in sessions:
        sessions[req.session_id] = []

    sessions[req.session_id].append({"role": "user", "content": req.message})

    response = agent.invoke({"messages": sessions[req.session_id]})
    assistant_msg = response["messages"][-1]

    sessions[req.session_id] = [
        {"role": m.type if hasattr(m, "type") else m["role"],
         "content": m.content if hasattr(m, "content") else m["content"]}
        for m in response["messages"]
        if (hasattr(m, "type") and m.type in ("human", "ai"))
        or (isinstance(m, dict) and m.get("role") in ("user", "assistant"))
    ]

    return ChatResponse(reply=assistant_msg.content, session_id=req.session_id)


@app.post("/api/reset")
def reset_session(session_id: str = "default"):
    sessions.pop(session_id, None)
    return {"status": "ok"}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
