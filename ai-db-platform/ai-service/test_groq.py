import asyncio
import os
from dotenv import load_dotenv

load_dotenv()

from app.services.llm_service import LLMService

async def main():
    try:
        service = LLMService(provider="groq", model="llama-3.3-70b-versatile")
        print("Starting test...")
        prompt = """I want to build a Multi-Tenant SaaS platform for E-commerce Inventory Management. The system should handle around 50,000 active tenants (merchants). Key features include:  Multi-tenant support (every table should be scoped to a tenant_id). Products and Categories management. Multiple Warehouses per tenant. Inventory Tracking (quantity available, reserved, and sold). A high-volume Audit Log table to track every stock movement (expecting 10M+ rows very quickly, needs to be highly optimized). We need a highly scalable, ACID-compliant PostgreSQL architecture. Focus heavily on indexes and scalability."""
        res = await service.generate_schema_from_requirements(prompt)
        print("SUCCESS!")
        print(res)
    except Exception as e:
        print("ERROR OCCURRED:")
        print(repr(e))
        if hasattr(e, 'response'):
            print("Response:", e.response.text)

if __name__ == "__main__":
    asyncio.run(main())
