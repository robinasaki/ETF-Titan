from fastapi import FastAPI


app = FastAPI(
    title="ETF Titan API",
    description="Scaffolded FastAPI backend for ETF CSV ingestion and ETF analytics.",
    version="0.1.0",
)


@app.get("/health")
def health_check() -> dict[str, str]:
    return {
        "name": "ETF Titan API",
        "status": "scaffolded",
    }
