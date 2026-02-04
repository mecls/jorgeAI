from fastapi import FastAPI

fast_api_app = FastAPI()


@fast_api_app.get("/health")
async def health_check():
    return {"status": "ok"}
