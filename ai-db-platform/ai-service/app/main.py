from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.api import generate_sql, health
from app.core.config import settings

app = FastAPI(
    title="AI Database Architect — AI Service",
    description="Python AI Service for SQL generation and optimization",
    version="1.0.0"
)

# CORS configuration restricted to Backend origin
origins = [settings.BACKEND_URL]
if "localhost" in settings.BACKEND_URL or "127.0.0.1" in settings.BACKEND_URL:
    origins.extend([
        "http://localhost:3001",
        "http://127.0.0.1:3001",
        "http://localhost:5173",
        "http://127.0.0.1:5173"
    ])

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include Routers (No prefix to match backend axios calls)
app.include_router(health.router, tags=["Health"])
app.include_router(generate_sql.router, tags=["AI Logic"])

@app.get("/")
async def root():
    return {"message": "AI Service is running"}
