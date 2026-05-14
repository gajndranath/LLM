from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.api import generate_sql, health

app = FastAPI(
    title="AI Database Architect — AI Service",
    description="Python AI Service for SQL generation and optimization",
    version="1.0.0"
)

# CORS configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include Routers (No prefix to match backend axios calls)
app.include_router(health.router, tags=["Health"])
app.include_router(generate_sql.router, tags=["AI Logic"])

@app.get("/")
async def root():
    return {"message": "AI Service is running"}
