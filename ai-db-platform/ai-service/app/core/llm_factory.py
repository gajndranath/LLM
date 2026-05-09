from langchain_core.language_models import BaseChatModel
from app.core.config import settings
import logging

logger = logging.getLogger(__name__)

class LLMFactory:
    """
    Provider-agnostic LLM factory.
    """
    _instance: BaseChatModel = None
    
    @classmethod
    def get_llm(cls) -> BaseChatModel:
        if cls._instance is not None:
            return cls._instance
            
        provider = settings.LLM_PROVIDER
        logger.info(f"Loading LLM provider: {provider}")
        
        if provider == "groq":
            cls._instance = cls._load_groq()
        elif provider == "gemini":
            cls._instance = cls._load_gemini()
        elif provider == "openai":
            cls._instance = cls._load_openai()
        elif provider == "ollama":
            cls._instance = cls._load_ollama()
        elif provider == "mistral":
            cls._instance = cls._load_mistral()
        else:
            raise ValueError(f"Unknown LLM provider: {provider}")
        
        logger.info(f"LLM loaded: {provider} / {settings.LLM_MODEL}")
        return cls._instance

    @staticmethod
    def _load_groq() -> BaseChatModel:
        from langchain_groq import ChatGroq
        return ChatGroq(
            model=settings.LLM_MODEL,
            api_key=settings.GROQ_API_KEY,
            temperature=settings.LLM_TEMPERATURE,
            max_tokens=settings.LLM_MAX_TOKENS,
        )
    
    @staticmethod
    def _load_gemini() -> BaseChatModel:
        from langchain_google_genai import ChatGoogleGenerativeAI
        return ChatGoogleGenerativeAI(
            model=settings.LLM_MODEL,
            google_api_key=settings.GEMINI_API_KEY,
            temperature=settings.LLM_TEMPERATURE,
        )
    
    @staticmethod
    def _load_openai() -> BaseChatModel:
        from langchain_openai import ChatOpenAI
        return ChatOpenAI(
            model=settings.LLM_MODEL,
            api_key=settings.OPENAI_API_KEY,
            temperature=settings.LLM_TEMPERATURE,
        )
    
    @staticmethod
    def _load_ollama() -> BaseChatModel:
        from langchain_ollama import ChatOllama
        return ChatOllama(
            model=settings.OLLAMA_MODEL,
            base_url=settings.OLLAMA_BASE_URL,
            temperature=settings.LLM_TEMPERATURE,
        )
    
    @staticmethod
    def _load_mistral() -> BaseChatModel:
        from langchain_mistralai import ChatMistralAI
        return ChatMistralAI(
            model=settings.LLM_MODEL,
            api_key=settings.MISTRAL_API_KEY,
            temperature=settings.LLM_TEMPERATURE,
        )
