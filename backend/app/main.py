# app/main.py

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.db import Base, engine
from app.models import Assignment, File, User  # makes sure tables are registered
from app.routers.assignments import router as assignments_router

# Later we'll also do:
# from app.routers.auth import router as auth_router

app = FastAPI(
    title="Zen Ops API",
    version="0.1.0",
)


# --- CORS so frontend (localhost:5173) can talk to backend ---
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


# --- DB init: create tables if they don't exist ---
Base.metadata.create_all(bind=engine)


# --- Health check endpoint (used by frontend) ---
@app.get("/api/health")
def health_check():
    return {"status": "ok"}


# --- Routers ---
app.include_router(assignments_router)
# app.include_router(auth_router)  # we'll enable this when auth is ready