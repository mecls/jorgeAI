from fastapi import FastAPI
from pydantic import BaseModel
from ollama import chat

MODEL_ID = "qwen3:4b"

app = FastAPI()


class GenerateBody(BaseModel):
    messages: list[dict]  # [{role, content}, ...]
    max_new_tokens: int = 100
    temperature: float = 0.7


@app.post("/generate")
def generate(body: GenerateBody):

    response = chat(
        model=MODEL_ID,
        messages=body.messages,
        options={
            "temperature": body.temperature,
            "num_predict": body.max_new_tokens,
            "num_ctx": 4096,
        },
        keep_alive="10m",
        stream=False,
    )
    print(response.message.content)
    text = (response.message.content or "").strip()

    return {"text": text}
