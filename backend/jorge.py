import ollama
from fastapi import FastAPI, Request
from fastapi.responses import StreamingResponse
import os

app = FastAPI()
ollama.api_key = os.getenv("OLLAMA_API_KEY")
