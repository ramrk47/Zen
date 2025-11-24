from fastapi import FastAPI

from app.db import Base, engine
from app.routers import assignments
from app.routers import files

# Create tables in dev mode (later we'll use Alembic)
Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="Zen Ops API",
    version="0.1.0",
)


@app.get("/api/health")
def health():
    return "ok"


# Routers
app.include_router(assignments.router)
app.include_router(files.router)