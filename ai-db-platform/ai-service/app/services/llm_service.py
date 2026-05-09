from langchain_core.messages import SystemMessage, HumanMessage
from langchain_core.output_parsers import JsonOutputParser
from app.core.llm_factory import LLMFactory
from app.models.pydantic_schemas import (
    SQLGenerationOutput, 
    OptimizationResponse,
    InsightsResponse,
    ArchitectureReviewResponse
)
import logging

logger = logging.getLogger(__name__)

class LLMService:
    def __init__(self):
        self.llm = LLMFactory.get_llm()
        self.sql_parser = JsonOutputParser(pydantic_object=SQLGenerationOutput)
        self.opt_parser = JsonOutputParser(pydantic_object=OptimizationResponse)

    async def generate_sql(self, natural_query: str, schema_context: str) -> SQLGenerationOutput:
        """
        Convert natural language to SQL and suggest a visualization.
        """
        system_prompt = f"""You are a Senior PostgreSQL Expert and Data Analyst.
Your task is to generate precise SQL AND suggest the best way to visualize the result.

SAFETY RULES:
1. Only generate SELECT queries unless specifically asked for INSERT/UPDATE.
2. NEVER generate DROP, TRUNCATE, or ALTER statements.
3. For DELETE or UPDATE, always include a WHERE clause.

SCHEMA CONTEXT:
{schema_context}

CHART RULES:
1. If data is time-based, suggest "line" or "area".
        Generate SQL from natural language with Senior Architect guidance.
        """
        system_prompt = f"""You are a 20-year Senior Principal Database Architect.
Your mission is to write high-performance, secure, and scalable PostgreSQL SQL.

SCHEMA CONTEXT:
{schema_context}

SENIOR ENGINEER RULES:
1. NEVER use 'SELECT *' on large tables. Always specify columns.
2. If the query could return many rows, ALWAYS suggest LIMIT and OFFSET (Pagination).
3. Use proper JOINs instead of subqueries where possible.
4. If searching location data, suggest using GiST indexes.
5. Consider ACID properties; don't suggest destructive operations without warnings.
6. If the query is complex, add a brief 'Senior Tip' in the explanation about performance.

The output must be a valid JSON matching the schema below.
{{
    "sql": "...",
    "explanation": "Brief reasoning + Senior Architect Tip...",
    "warnings": ["Warning 1", "Warning 2"],
    "confidence": 0.95,
    "provider": "Groq",
    "model": "{self.model}",
    "chart_recommendation": {{ "type": "bar/line/pie/area/none", "x_axis": "...", "y_axis": "...", "label": "..." }}
}}
"""
        messages = [
            SystemMessage(content=system_prompt),
            HumanMessage(content=f"Requirement: {natural_query}")
        ]

        try:
            response = self.llm.invoke(messages)
            result = self.sql_parser.parse(response.content)
            return SQLGenerationOutput(**result)
        except Exception as e:
            logger.error(f"LLM SQL Generation Error: {str(e)}")
            raise

    async def optimize_query(self, sql: str, schema_context: str, explain_plan: dict = None) -> OptimizationResponse:
        """
        Optimize an existing SQL query for 40M+ scale.
        """
        system_prompt = f"""You are a Senior PostgreSQL Performance Engineer.
Analyze the provided SQL for a database that may hold 40M+ rows.

SCHEMA CONTEXT:
{schema_context}

SCALABILITY CHECKLIST:
1. Indexing: Suggest B-Tree, GIN, or GiST indexes. Recommend 'Materialized Views' for heavy aggregations.
2. Partitioning: If the table is huge, suggest Horizontal Partitioning.
3. Batching: Recommend breaking large UPDATES/DELETES into smaller batches.
4. Replicas: If it's a heavy READ query, suggest moving it to a 'Read Replica'.
5. Caching: Identify if this result should be cached in Redis.

Return ONLY raw JSON:
{{
    "optimized_sql": "...",
    "issues": ["Issue 1 (e.g. Sequential Scan)", "Issue 2"],
    "suggestions": ["Suggestion 1", "Suggestion 2"],
    "index_recommendations": ["CREATE INDEX..."]
}}
"""
        messages = [
            SystemMessage(content=system_prompt),
            HumanMessage(content=f"Query to optimize: {sql}")
        ]

        try:
            response = self.llm.invoke(messages)
            result = self.opt_parser.parse(response.content)
            return OptimizationResponse(**result)
        except Exception as e:
            logger.error(f"LLM Optimization Error: {str(e)}")
            raise

    async def generate_insights(self, query: str, results: list) -> InsightsResponse:
        """
        Generate NL insights with a focus on anomalies and data health.
        """
        ins_parser = JsonOutputParser(pydantic_object=InsightsResponse)

        system_prompt = f"""You are an Expert Data Analyst. Analyze these query results.
Identify trends, key findings, and CRITICAL ANOMALIES (like missing data, unexpected zeros, or outliers).

The output must be a valid JSON.
{{
    "summary": "...",
    "key_findings": [],
    "anomalies": [],
    "recommendations": []
}}
"""
        messages = [
            SystemMessage(content=system_prompt),
            HumanMessage(content=f"Query: {query}\nResults: {str(results)[:4000]}")
        ]

        try:
            response = self.llm.invoke(messages)
            result = ins_parser.parse(response.content)
            return InsightsResponse(**result)
        except Exception as e:
            logger.error(f"LLM Insights Error: {str(e)}")
            raise

    async def analyze_architecture(
        self, 
        schema_context: str, 
        requirements: str = None, 
        scale: str = "1M rows",
        history_context: str = ""
    ) -> ArchitectureReviewResponse:
        """
        Complete System Architecture Audit (Senior Principal Level) with Contextual Memory.
        """
        arch_parser = JsonOutputParser(pydantic_object=ArchitectureReviewResponse)

        system_prompt = f"""You are a 20-year Senior Principal Database Architect.
Perform a Deep Audit of this schema for a scale of {scale}.

PROJECT HISTORY & CONTEXT:
{history_context if history_context else "This is a new audit session. No previous history provided."}

MASTER AUDIT CHECKLIST:
1. High-Scale Design: Partitioning, Sharding, and Indexing strategy.
2. Distributed Systems: Read/Write Replicas and Redis Caching strategy.
3. Maintenance: VACUUMing, Index Bloating, and Archiving (Cold/Hot storage).
4. Security: RBAC (Role-Based Access Control) and Encryption.
5. Resilience: Backup strategies (PITR) and High Availability.
6. Normalization vs Performance: When to denormalize for speed.

OUTPUT INSTRUCTIONS:
Return ONLY a valid JSON object. DO NOT wrap the response in any root key like 'audit_results'. 
The fields MUST be at the top level of the JSON.

REQUIRED FIELDS:
- executive_summary: str
- component_analysis: List[Dict]
- critical_mistakes: List[str]
- improvement_plan: List[str]
- suggested_fixes: List[Dict] (Each with 'title', 'sql', 'rollback_sql', 'explanation')
- suggested_missions: List[Dict] (Each with 'title', 'description', 'priority', 'reasoning')
- scalability_score: int (0-100)
- suggested_diagram_mermaid: str (erDiagram)

JARVIS MISSION PLANNING:
The 'suggested_missions' field is for YOUR proactive task list. Think like a lead engineer: what should the team do next? 
- 'title': short and actionable (e.g., 'Migrate historical logs to cold storage')
- 'description': detailed technical objective.
- 'priority': CRITICAL, HIGH, MEDIUM, or LOW.
- 'reasoning': Why is this mission important for the project's long-term health?

SQL FIX RULES:
For the 'suggested_fixes' list, provide the EXACT PostgreSQL SQL needed to implement the major improvements AND the corresponding 'rollback_sql' to undo that specific change (e.g., if you CREATE INDEX, the rollback is DROP INDEX).

CRITICAL DATA TYPE RULES:
1. PostgreSQL is strict. If a column is 'bytea', you MUST cast text data using '::bytea' or 'decode()'.
2. If using 'pgp_sym_encrypt', remember it returns 'bytea'. Cast it to 'text' if the target column is text, or vice versa.
3. Always check if an extension like 'pgcrypto' is needed and suggest 'CREATE EXTENSION IF NOT EXISTS pgcrypto;' if performing encryption.
"""
        messages = [
            SystemMessage(content=system_prompt),
            HumanMessage(content=f"Schema: {schema_context}\nUser Req: {requirements}")
        ]

        try:
            response = self.llm.invoke(messages)
            result = arch_parser.parse(response.content)
            return ArchitectureReviewResponse(**result)
        except Exception as e:
            logger.error(f"LLM Architecture Audit Error: {str(e)}")
            raise
