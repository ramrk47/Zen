from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.db import Base, engine
from app.routers import assignments
from app.routers import files

# Create tables in dev mode (later we'll use Alembic migrations)
Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="Zen Ops API",
    version="0.1.0",
)

# Allow frontend dev server (Vite) to call this API
origins = [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/api/health")
def health():
    return "ok"


# Routers
app.include_router(assignments.router)
app.include_router(files.router)