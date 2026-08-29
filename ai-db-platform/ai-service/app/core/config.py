from pydantic_settings import BaseSettings
from typing import Literal
from pydantic import model_validator

class Settings(BaseSettings):
    # LLM Provider
    LLM_PROVIDER: Literal["groq", "gemini", "openai", "ollama", "mistral", "openrouter"] = "groq"
    LLM_MODEL: str = "llama-3.1-70b-versatile"
    
    # API Keys
    GROQ_API_KEY: str = ""
    GEMINI_API_KEY: str = ""
    OPENAI_API_KEY: str = ""
    MISTRAL_API_KEY: str = ""
    OPENROUTER_API_KEY: str = ""
    
    # Ollama
    OLLAMA_BASE_URL: str = "http://localhost:11434"
    OLLAMA_MODEL: str = "llama3.1"
    
    # LLM Settings
    LLM_TEMPERATURE: float = 0.1
    LLM_MAX_TOKENS: int = 8192  # INCREASED to 8192 to prevent Groq truncation
    
    # Security & CORS
    BACKEND_URL: str = "http://localhost:3001"
    CORS_ORIGINS: str = ""
    AI_SERVICE_SECRET: str
    
    @model_validator(mode="after")
    def validate_security(self) -> 'Settings':
        if not self.AI_SERVICE_SECRET or self.AI_SERVICE_SECRET == "internal_secret_change_this_xxxxxxxxxxxx":
            raise ValueError(
                "❌ CRITICAL SECURITY ERROR: AI_SERVICE_SECRET is missing or set to the default developer fallback!"
            )
        return self
    
    class Config:
        env_file = ".env"

settings = Settings()
