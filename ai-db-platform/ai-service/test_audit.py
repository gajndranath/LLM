import asyncio
import os
from dotenv import load_dotenv

load_dotenv()

from app.services.llm_service import LLMService

async def main():
    try:
        service = LLMService(provider="groq", model="llama-3.3-70b-versatile")
        print("Starting test...")
        # Try auditing a basic schema
        schema = "CREATE TABLE users (id SERIAL PRIMARY KEY, name VARCHAR(255));"
        res = await service.audit_senior_level(schema, "Need 10M scale")
        print("SUCCESS!")
        print(res)
    except Exception as e:
        print("ERROR OCCURRED:")
        print(repr(e))
        if hasattr(e, 'response'):
            print("Response:", e.response.text)

if __name__ == "__main__":
    asyncio.run(main())
