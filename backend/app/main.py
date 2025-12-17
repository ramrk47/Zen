from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from app.db import Base, engine

# IMPORTANT: importing models registers tables before create_all()
from app.models import Assignment, File, User, Activity  # noqa: F401
from app.models.master_data import Bank, Branch, Client, PropertyType  # noqa: F401

from app.routers.assignments import router as assignments_router
from app.routers.auth import router as auth_router
from app.routers.master_data import router as master_data_router
from app.routers.files import router as files_router
from app.routers.activity import router as activity_router

app = FastAPI(title="Zen Ops API", version="0.1.0")

origins = ["http://localhost:5173", "http://127.0.0.1:5173"]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Serve uploaded files at /uploads/...
app.mount("/uploads", StaticFiles(directory="uploads"), name="uploads")

# Auto-create tables (no Alembic yet)
Base.metadata.create_all(bind=engine)


@app.get("/api/health")
def health_check():
    return {"status": "ok"}


app.include_router(assignments_router)
app.include_router(auth_router)
app.include_router(master_data_router)
app.include_router(files_router)
app.include_router(activity_router)