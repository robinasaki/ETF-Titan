from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.routers.etfs import router as etfs_router


app = FastAPI(
    title="ETF Titan API",
    description="FastAPI backend for ETF analytics over bundled or uploaded CSV datasets.",
    version="0.3.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origin_regex=r"https?://(localhost|127\.0\.0\.1)(:\d+)?",
    allow_credentials=False,
    allow_methods=["GET", "POST"],
    allow_headers=["*"],
)


@app.get("/health")
def health_check() -> dict[str, str]:
    return {
        "name": "ETF Titan API",
        "status": "ok",
    }


app.include_router(etfs_router)
