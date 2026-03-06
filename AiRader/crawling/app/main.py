from fastapi import FastAPI

from app.api.routes import router

app = FastAPI(
    title="Crawling Server",
    version="0.1.0",
    description="FastAPI server for crawling services.",
)
app.include_router(router)
