from langchain_core.language_models import BaseChatModel
from app.core.config import settings
import logging

logger = logging.getLogger(__name__)

class LLMFactory:
    """
    Provider-agnostic LLM factory.
    """
    @classmethod
    def get_llm(cls, provider_override: str = None, model_override: str = None) -> BaseChatModel:
        provider = provider_override or settings.LLM_PROVIDER
        model = model_override or settings.LLM_MODEL
        
        if provider == "groq":
            return cls._load_groq(model)
        elif provider == "gemini":
            return cls._load_gemini(model)
        elif provider == "openai":
            return cls._load_openai(model)
        elif provider == "ollama":
            return cls._load_ollama(model)
        elif provider == "mistral":
            return cls._load_mistral(model)
        else:
            raise ValueError(f"Unknown LLM provider: {provider}")

    @staticmethod
    def _load_groq(model: str) -> BaseChatModel:
        from langchain_groq import ChatGroq
        return ChatGroq(
            model=model,
            api_key=settings.GROQ_API_KEY,
            temperature=settings.LLM_TEMPERATURE,
            max_tokens=settings.LLM_MAX_TOKENS,
        )
    
    @staticmethod
    def _load_gemini(model: str) -> BaseChatModel:
        from langchain_google_genai import ChatGoogleGenerativeAI
        return ChatGoogleGenerativeAI(
            model=model,
            google_api_key=settings.GEMINI_API_KEY,
            temperature=settings.LLM_TEMPERATURE,
        )
    
    @staticmethod
    def _load_openai(model: str) -> BaseChatModel:
        from langchain_openai import ChatOpenAI
        return ChatOpenAI(
            model=model,
            api_key=settings.OPENAI_API_KEY,
            temperature=settings.LLM_TEMPERATURE,
        )
    
    @staticmethod
    def _load_ollama(model: str) -> BaseChatModel:
        from langchain_ollama import ChatOllama
        return ChatOllama(
            model=settings.OLLAMA_MODEL, # Ollama has custom logic usually, but let's pass model if provided
            base_url=settings.OLLAMA_BASE_URL,
            temperature=settings.LLM_TEMPERATURE,
        )
    
    @staticmethod
    def _load_mistral(model: str) -> BaseChatModel:
        from langchain_mistralai import ChatMistralAI
        return ChatMistralAI(
            model=model,
            api_key=settings.MISTRAL_API_KEY,
            temperature=settings.LLM_TEMPERATURE,
        )
