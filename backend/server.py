from fastapi import FastAPI
from fastapi.responses import StreamingResponse
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from ollama import chat
import json

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Adjust for production
    allow_methods=["*"],
    allow_headers=["*"],
)


class ChatRequest(BaseModel):
    prompt: str
    model: str = "gemma2:latest"


@app.post("/chat")
async def generate_chat(request: ChatRequest):
    try:
        response = chat(
            model=request.model,
            messages=[{"role": "user", "content": request.prompt}],
            stream=False,
            # To try and not let the pc lag -> FIND BETTER SOLUTION AND RUNNING BIGGER MODEL
            options={
                "num_ctx": 2048,  # Reduced from default 4096
                "num_thread": 4,  # Limit CPU threads
            },
        )
        return {"response": response.message.content}
    except Exception as e:
        return {"error": str(e)}
