from pydantic_settings import BaseSettings
from typing import Literal

class Settings(BaseSettings):
    # LLM Provider
    LLM_PROVIDER: Literal["groq", "gemini", "openai", "ollama", "mistral"] = "groq"
    LLM_MODEL: str = "llama-3.1-70b-versatile"
    
    # API Keys
    GROQ_API_KEY: str = ""
    GEMINI_API_KEY: str = ""
    OPENAI_API_KEY: str = ""
    MISTRAL_API_KEY: str = ""
    
    # Ollama
    OLLAMA_BASE_URL: str = "http://localhost:11434"
    OLLAMA_MODEL: str = "llama3.1"
    
    # LLM Settings
    LLM_TEMPERATURE: float = 0.1
    LLM_MAX_TOKENS: int = 4096  # INCREASED from 2048 to prevent truncation
    
    # Security
    AI_SERVICE_SECRET: str = "internal_secret_change_this_xxxxxxxxxxxx"
    
    class Config:
        env_file = ".env"

settings = Settings()
