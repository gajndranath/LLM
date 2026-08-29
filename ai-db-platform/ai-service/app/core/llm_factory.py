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
        primary_provider = provider_override or settings.LLM_PROVIDER
        primary_model = model_override or settings.LLM_MODEL
        
        primary_llm = cls._get_provider_llm(primary_provider, primary_model)
        
        # Build automatic fallbacks for rate limits
        fallbacks = []
        if primary_provider == "openrouter":
            # If using OpenRouter, fall back strictly to other OpenRouter models to prevent key mix-ups
            openrouter_fallbacks = [
                "google/gemini-2.5-flash",
                "meta-llama/llama-3.3-70b-instruct",
                "google/gemini-2.5-pro",
                "mistralai/mistral-7b-instruct:free"
            ]
            for fb_model in openrouter_fallbacks:
                if fb_model != primary_model and settings.OPENROUTER_API_KEY:
                    try:
                        fallbacks.append(cls._get_provider_llm("openrouter", fb_model))
                    except Exception as e:
                        logger.warning(f"Failed to load OpenRouter fallback for {fb_model}: {e}")
                        pass
        else:
            # Clean fallback chain: only add valid working providers
            if primary_provider != "mistral" and settings.MISTRAL_API_KEY:
                try:
                    fallbacks.append(cls._get_provider_llm("mistral", "mistral-large-latest"))
                except Exception:
                    pass
        
        if fallbacks:
            return primary_llm.with_fallbacks(fallbacks)
        return primary_llm

    @classmethod
    def _get_provider_llm(cls, provider: str, model: str) -> BaseChatModel:
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
        elif provider == "openrouter":
            return cls._load_openrouter(model)
        else:
            raise ValueError(f"Unknown LLM provider: {provider}")

    @staticmethod
    def _load_groq(model: str) -> BaseChatModel:
        from langchain_groq import ChatGroq
        return ChatGroq(
            model=model,
            api_key=settings.GROQ_API_KEY,
            temperature=settings.LLM_TEMPERATURE,
            max_tokens=4096,
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
            timeout=120,
            max_retries=3,
        )

    @staticmethod
    def _load_openrouter(model: str) -> BaseChatModel:
        from langchain_openai import ChatOpenAI
        return ChatOpenAI(
            model=model,
            api_key=settings.OPENROUTER_API_KEY,
            base_url="https://openrouter.ai/api/v1",
            temperature=settings.LLM_TEMPERATURE,
        )
