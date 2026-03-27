from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from sqlalchemy import text

from app.api.v1.router import api_router
from app.core.config import settings
from app.db.init_admin import seed_default_admin
from app.db.session import Base, engine

app = FastAPI(title=settings.app_name)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
def on_startup() -> None:
    Base.metadata.create_all(bind=engine)
    seed_default_admin()


app.include_router(api_router, prefix="/api/v1")


@app.get("/health")
def health_check():
    checks = {"api": "ok", "database": "ok"}

    try:
        with engine.connect() as connection:
            connection.execute(text("SELECT 1"))
    except Exception as exc:  # pragma: no cover - runtime safety fallback
        checks["database"] = "error"
        return JSONResponse(
            status_code=503,
            content={
                "status": "degraded",
                "checks": checks,
                "detail": str(exc),
            },
        )

    return {"status": "ok", "checks": checks}
