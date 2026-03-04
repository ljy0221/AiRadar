from fastapi import FastAPI

app = FastAPI(
    title="Crawling Server",
    version="0.1.0",
    description="FastAPI server for crawling services.",
)


@app.get("/")
def read_root() -> dict[str, str]:
    return {"message": "Crawling server is running"}


@app.get("/health")
def health_check() -> dict[str, str]:
    return {"status": "ok"}
