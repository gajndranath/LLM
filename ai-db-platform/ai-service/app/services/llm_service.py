import re
import json
import logging
from langchain_core.messages import SystemMessage, HumanMessage
from langchain_core.output_parsers import JsonOutputParser
from app.core.llm_factory import LLMFactory
from app.core.config import settings
from app.models.pydantic_schemas import (
    SQLGenerationOutput,
    OptimizationResponse,
    InsightsResponse,
    ArchitectureReviewResponse,
    SchemaGenerationResponse,
    SeniorAuditResponse,
)

logger = logging.getLogger(__name__)


class LLMService:
    def __init__(self):
        self.llm = LLMFactory.get_llm()
        self.model_name = settings.LLM_MODEL  # FIX: was self.model (undefined attr)
        self.sql_parser = JsonOutputParser(pydantic_object=SQLGenerationOutput)
        self.opt_parser = JsonOutputParser(pydantic_object=OptimizationResponse)

    def _parse_and_repair_json(self, content: str, parser: JsonOutputParser, pydantic_object) -> dict:
        """
        Attempts standard parsing. On failure:
        1. Extracts JSON block via regex and parses.
        2. If regex fails or json is still malformed, calls a second-pass LLM repair prompt.
        """
        # 1. Try standard parser
        try:
            return parser.parse(content)
        except Exception as standard_err:
            logger.warning(f"[JSON Parse] Standard parser failed: {standard_err}. Trying regex extraction...")

        # 2. Extract JSON block via regex
        json_regex = r"\{[\s\S]*\}"
        match = re.search(json_regex, content)
        if match:
            json_str = match.group(0)
            try:
                return parser.parse(json_str)
            except Exception as regex_err:
                logger.warning(f"[JSON Parse] Regex extracted JSON parsing failed: {regex_err}. Triggering LLM repair...")

        # 3. Call a second-pass LLM repair prompt
        logger.info("[JSON Parse] Calling second-pass LLM repair...")
        try:
            schema_info = ""
            if hasattr(pydantic_object, 'model_json_schema'):
                schema_info = str(pydantic_object.model_json_schema())
            elif hasattr(pydantic_object, 'schema'):
                schema_info = str(pydantic_object.schema())

            repair_prompt = f"""You are a JSON recovery assistant.
You are given a text that was supposed to be a valid JSON matching the following schema.
SCHEMA: {schema_info}

RAW TEXT TO REPAIR:
{content}

Instructions:
1. Fix any syntax errors (missing commas, unescaped quotes, unclosed braces).
2. Clean up any prefix/suffix conversational text.
3. Ensure all keys and string values are enclosed in double quotes.
4. Return ONLY the valid repaired raw JSON object. Do not include markdown code block formatting (e.g. do not wrap in ```json)."""

            messages = [
                SystemMessage(content="You are a precise JSON syntax repair agent. Return only raw JSON."),
                HumanMessage(content=repair_prompt)
            ]
            response = self.llm.invoke(messages)
            repaired_content = response.content.strip()
            
            # Remove ```json and ``` markdown wrapping if the LLM output it anyway
            if repaired_content.startswith("```"):
                lines = repaired_content.split("\n")
                if lines[0].startswith("```"):
                    lines = lines[1:]
                if lines[-1].startswith("```"):
                    lines = lines[:-1]
                repaired_content = "\n".join(lines).strip()
            
            return parser.parse(repaired_content)
        except Exception as repair_err:
            logger.error(f"[JSON Parse] Second-pass LLM repair failed: {repair_err}")
            raise Exception(f"Failed to parse and repair JSON output: {repair_err}") from repair_err

    # ── SQL Generation ─────────────────────────────────────────
    async def generate_sql(self, natural_query: str, schema_context: str) -> SQLGenerationOutput:
        """Convert natural language to SQL and suggest a visualization."""
        # FIX: removed duplicate/broken first prompt that was overwritten anyway
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
7. Always check the SCHEMA CONTEXT for correct schema names (e.g. 'inventory.products' instead of 'products'). Don't assume 'public'.
8. If the user asks to 'list tables', query 'information_schema.tables' for all non-system schemas.

Return ONLY a valid JSON:
{{
    "sql": "...",
    "explanation": "Brief reasoning + Senior Architect Tip...",
    "warnings": ["Warning 1"],
    "confidence": 0.95,
    "provider": "Groq",
    "model": "{self.model_name}",
    "chart_recommendation": {{ "type": "bar/line/pie/area/table/none", "x_axis": "...", "y_axis": "...", "label": "..." }}
}}"""

        messages = [
            SystemMessage(content=system_prompt),
            HumanMessage(content=f"Requirement: {natural_query}"),
        ]
        try:
            response = self.llm.invoke(messages)
            result = self._parse_and_repair_json(response.content, self.sql_parser, SQLGenerationOutput)
            return SQLGenerationOutput(**result)
        except Exception as e:
            logger.error(f"LLM SQL Generation Error: {str(e)}")
            raise

    # ── Query Optimization ─────────────────────────────────────
    async def optimize_query(self, sql: str, schema_context: str, explain_plan: dict = None) -> OptimizationResponse:
        """Optimize an existing SQL query for 40M+ scale."""
        system_prompt = f"""You are a Senior PostgreSQL Performance Engineer.
Analyze the provided SQL for a database that may hold 40M+ rows.

SCHEMA CONTEXT:
{schema_context}

SCALABILITY CHECKLIST:
1. Indexing: Suggest B-Tree, GIN, or GiST indexes. Recommend Materialized Views for heavy aggregations.
2. Partitioning: If the table is huge, suggest Horizontal Partitioning.
3. Batching: Recommend breaking large UPDATES/DELETES into smaller batches.
4. Replicas: If it is a heavy READ query, suggest moving it to a Read Replica.
5. Caching: Identify if this result should be cached in Redis.

Return ONLY raw JSON:
{{
    "optimized_sql": "...",
    "issues": ["Issue 1 (e.g. Sequential Scan)"],
    "suggestions": ["Suggestion 1"],
    "index_recommendations": ["CREATE INDEX..."]
}}"""

        messages = [
            SystemMessage(content=system_prompt),
            HumanMessage(content=f"Query to optimize: {sql}"),
        ]
        try:
            response = self.llm.invoke(messages)
            result = self._parse_and_repair_json(response.content, self.opt_parser, OptimizationResponse)
            return OptimizationResponse(**result)
        except Exception as e:
            logger.error(f"LLM Optimization Error: {str(e)}")
            raise

    # ── Insights Generation ────────────────────────────────────
    async def generate_insights(self, query: str, results: list, schema_context: str = "") -> InsightsResponse:
        """Generate NL insights and technical diagrams (ERD, DFD, Flow)."""
        ins_parser = JsonOutputParser(pydantic_object=InsightsResponse)
        system_prompt = f"""You are a Master Data Scientist and Database Architect.
Analyze these query results and provide deep insights along with technical visualizations.

SCHEMA CONTEXT (Use this for ERD):
{schema_context}

Return ONLY valid JSON:
{{
    "summary": "High-level summary of the data story...",
    "key_findings": ["Finding 1", "Finding 2"],
    "anomalies": ["Outlier in column X", "Unexpected nulls"],
    "recommendations": ["Optimize index on Y", "Data cleanup needed for Z"],
    "erd_mermaid": "erDiagram\\n  TABLE1 ||--o{{ TABLE2 : relates\\n  ...", 
    "dfd_mermaid": "graph TD\\n  A[Source Tables] --> B[Filter/Join] --> C[Aggregation] --> D[Final Result]",
    "flow_mermaid": "sequenceDiagram\\n  participant User\\n  participant DB\\n  User->>DB: Query for X\\n  DB-->>User: Returns Y rows with trend Z"
}}

DIAGRAM RULES:
1. erd_mermaid: Must be valid erDiagram syntax based on the schema context and query.
2. dfd_mermaid: Must be valid graph TD syntax showing the 'Data Flow' of the query logic.
3. flow_mermaid: Must be a sequence or flow diagram representing the 'Business/Current Flow' of the information found in the results."""

        messages = [
            SystemMessage(content=system_prompt),
            HumanMessage(content=f"Query: {query}\nResults: {str(results)[:4000]}"),
        ]
        try:
            response = self.llm.invoke(messages)
            result = self._parse_and_repair_json(response.content, ins_parser, InsightsResponse)
            return InsightsResponse(**result)
        except Exception as e:
            logger.error(f"LLM Insights Error: {str(e)}")
            raise

    # ── Architecture Review (ArchitectPage) ────────────────────
    async def analyze_architecture(
        self,
        schema_context: str,
        requirements: str = None,
        scale: str = "1M rows",
        history_context: str = "",
    ) -> ArchitectureReviewResponse:
        """Complete System Architecture Audit (Senior Principal Level) with Contextual Memory."""
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
Return ONLY a valid JSON object. DO NOT wrap in any root key.
Fields MUST be at top level.

REQUIRED FIELDS:
- executive_summary: str
- component_analysis: List[Dict] (each with 'component', 'status', 'notes')
- critical_mistakes: List[str]
- improvement_plan: List[str]
- suggested_fixes: List[Dict] (each with 'title', 'sql', 'rollback_sql', 'explanation')
- suggested_missions: List[Dict] (each with 'title', 'description', 'priority', 'reasoning')
- scalability_score: int (0-100)
- suggested_diagram_mermaid: str (valid erDiagram syntax)

SQL FIX RULES:
Provide EXACT PostgreSQL SQL for each fix AND rollback_sql to undo it.

CRITICAL DATA TYPE RULES:
1. If a column is bytea, cast text using ::bytea or decode().
2. pgp_sym_encrypt returns bytea. Cast as needed.
3. Suggest CREATE EXTENSION IF NOT EXISTS pgcrypto; when encryption is needed."""

        messages = [
            SystemMessage(content=system_prompt),
            HumanMessage(content=f"Schema: {schema_context}\nUser Req: {requirements}"),
        ]
        try:
            response = self.llm.invoke(messages)
            result = self._parse_and_repair_json(response.content, arch_parser, ArchitectureReviewResponse)
            return ArchitectureReviewResponse(**result)
        except Exception as e:
            logger.error(f"LLM Architecture Audit Error: {str(e)}")
            raise

    # ══════════════════════════════════════════════════════════
    # DESIGN STUDIO METHODS
    # ══════════════════════════════════════════════════════════

    async def generate_requirement_probes(
        self, user_input: str, conversation_context: str = "", schema_context: str = ""
    ) -> str:
        """
        Act as a Requirements Analyst or Live Architect. 
        If schema_context is provided, act as a Live DBA who can suggest SQL fixes.
        Returns a conversational string (may contain structured <ACTION> blocks).
        """
        system_prompt = f"""You are ATLAS - a 20-year Senior Principal Database Architect.

ROLE 1: Requirements Analyst (New DB)
If NO schema context is provided, probe the user to understand what database they need.

ROLE 2: Live Database Architect (Existing DB)
If SCHEMA CONTEXT is provided, you are acting on a LIVE database. 
Analyze the user's request against the schema and suggest specific SQL changes if needed.

SCHEMA CONTEXT:
{schema_context if schema_context else "No existing schema. We are building a NEW database blueprint."}

CONVERSATION RULES:
1. Ask 1-2 focused, high-impact questions per turn. 
2. If the user says "build", "generate", "start", or "go ahead" in New DB mode, output READY_TO_GENERATE.
3. If you suggest a SQL change for an existing DB, wrap it in an <ACTION> block like this:
   <ACTION>
   {{
     "title": "Short title of change",
     "sql": "EXACT POSTGRESQL SQL",
     "explanation": "Brief reasoning for this change"
   }}
   </ACTION>
4. Keep the conversation professional, authoritative, and helpful.
5. IMPORTANT: If the user asks you to "generate the schema", "show the ERD", "write the SQL", or anything similar, DO NOT output raw SQL schemas or text-based ERDs in the chat. Instead, output READY_TO_GENERATE and tell the user: "Please click the 'Generate Blueprint' button on your screen to view the interactive ERD and complete SQL scripts."

Return ONLY your conversational response as plain text (with optional <ACTION> blocks). No other JSON wrapping."""

        messages = [
            SystemMessage(content=system_prompt),
            HumanMessage(
                content=f"Conversation so far:\n{conversation_context}\n\nUser's latest message: {user_input}"
            ),
        ]
        try:
            response = self.llm.invoke(messages)
            return response.content
        except Exception as e:
            logger.error(f"LLM Requirement Probes Error: {str(e)}")
            raise

    async def generate_schema_from_requirements(self, conversation_transcript: str) -> SchemaGenerationResponse:
        """
        Generate a complete production-ready database blueprint from conversation requirements.
        Covers: normalization, ACID, indexing, pagination, location, full-text search, scaling.
        """
        schema_parser = JsonOutputParser(pydantic_object=SchemaGenerationResponse)
        system_prompt = f"""You are ATLAS - a 20-year Senior Principal Database Architect.
Generate a complete database schema based on the provided conversation transcript.
Structure your response as a valid JSON matching the SchemaGenerationResponse schema.
Transcript: {conversation_transcript}

MASTER DESIGN CHECKLIST (cover ALL relevant points):
1. NORMALIZATION: Achieve minimum 3NF. Use BCNF where needed. Zero data redundancy.
2. ACID COMPLIANCE: Define which tables need strict transactions. Choose SERIAL/UUID PKs appropriately.
3. INDEXING STRATEGY:
   - B-Tree: equality/range queries (IDs, dates, status fields)
   - GIN: full-text search (tsvector) or JSONB queries
   - GiST: location/geometric data (PostGIS GEOGRAPHY type)
   - Partial indexes: filtered queries (e.g. WHERE is_active = true)
   - Composite indexes: multi-column query patterns
4. PAGINATION DESIGN: Use UUID or BIGSERIAL PKs. Design for cursor-based pagination at scale.
5. LOCATION/GEO: If location needed, use PostGIS GEOGRAPHY(POINT, 4326) + GiST index.
6. FULL-TEXT SEARCH: Add tsvector columns + GIN index for searchable text fields.
7. SOFT DELETES: Add deleted_at TIMESTAMPTZ for audit trails where needed.
8. TIMESTAMPS: All tables need created_at + updated_at with auto-trigger.
9. SCALABILITY: Note which tables may need partitioning (by date, region, tenant_id).
10. SECURITY: Flag fields needing encryption (passwords, tokens, PII).
11. LOAD BALANCING: Identify read-heavy tables that benefit from PostgreSQL read replicas.
12. STORAGE TIERS: Identify hot (recent) vs cold (archived) data patterns.

CRITICAL INSTRUCTION: You MUST include the `erd_mermaid` field with a valid Mermaid ER Diagram string, and the `scalability_notes` field with a detailed paragraph outlining scalability strategies. DO NOT OMIT THEM.

Return ONLY a valid JSON:
{{
    "entities": [
        {{
            "name": "table_name",
            "fields": [
                {{"column": "id", "type": "UUID PRIMARY KEY DEFAULT gen_random_uuid()", "notes": "Primary key"}},
                {{"column": "created_at", "type": "TIMESTAMPTZ NOT NULL DEFAULT NOW()", "notes": "Auto timestamp"}}
            ],
            "primary_key": "id",
            "indexes": [
                "CREATE INDEX idx_users_email ON users(email);",
                "CREATE INDEX idx_users_created ON users(created_at DESC);"
            ]
        }}
    ],
    "relationships": [
        {{"from": "orders", "to": "users", "type": "many-to-one", "via": "user_id"}}
    ],
    "sql_scripts": [
        {{
            "sql": "CREATE EXTENSION IF NOT EXISTS uuid-ossp;\\nCREATE TABLE users (\\n  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),\\n  ...\\n);",
            "description": "Users table with authentication fields",
            "rollback_sql": "DROP TABLE IF EXISTS users CASCADE;"
        }}
    ],
    "erd_mermaid": "erDiagram\\n  USERS {{\\n    UUID id PK\\n    string email\\n  }}\\n  ORDERS {{\\n    UUID id PK\\n    UUID user_id FK\\n  }}\\n  USERS ||--o{{ ORDERS : places",
    "normalization_level": "3NF",
    "scalability_notes": "Detailed notes on: partitioning strategy, Redis caching candidates, read replica recommendations, storage tiers (hot/cold), connection pooling advice, and estimated row growth projections.",
    "acid_compliance": true
}}"""

        messages = [
            SystemMessage(content=system_prompt),
            HumanMessage(content=f"Requirements Conversation:\n{conversation_transcript}"),
        ]
        try:
            response = self.llm.invoke(messages)
            result = self._parse_and_repair_json(response.content, schema_parser, SchemaGenerationResponse)
            return SchemaGenerationResponse(**result)
        except Exception as e:
            logger.error(f"LLM Schema Generation Error: {str(e)}")
            raise

    async def audit_senior_level(self, schema: str, user_concerns: str = "") -> SeniorAuditResponse:
        """
        Full A-to-Z senior audit of an existing database schema.
        Returns: what is good, what is bad, what to fix - with per-category severity scores.
        """
        audit_parser = JsonOutputParser(pydantic_object=SeniorAuditResponse)
        system_prompt = f"""You are ATLAS - a 20-year Senior Principal Database Architect performing a FULL A-to-Z audit.
Analyze the following database schema and provide a deep technical audit.
Identify issues, improvements, bottlenecks, and security concerns.
Structure your response as a valid JSON matching the SeniorAuditResponse schema.
Schema: {schema}

AUDIT FRAMEWORK - Review ALL categories:

NORMALIZATION: Check 1NF/2NF/3NF violations, repeated data, improper column grouping.
INDEXING: Missing indexes on FKs, searchable fields, sort columns. Over-indexing on write-heavy tables.
ACID & TRANSACTIONS: Are sensitive operations transactional? Are constraints enforced at DB level?
PERFORMANCE BOTTLENECKS: Sequential scans, N+1 risks, missing composite indexes, huge unbounded JOINs.
SECURITY: Unencrypted PII, missing Row-Level Security (RLS), no audit log, exposed secrets.
SCALABILITY: What breaks at 10x data? Missing partitioning? No archival strategy?
DATA TYPES: TEXT where VARCHAR is better, FLOAT where NUMERIC is safer, missing NOT NULL constraints.
RELATIONSHIPS: Missing FK constraints, improper cascade rules, orphaned records risk.
SEARCH: Missing full-text search setup (tsvector + GIN index) for text-heavy tables.
LOCATION: If geo data exists, is PostGIS GEOGRAPHY type + GiST index being used?
PAGINATION: Can cursor-based pagination work with current PKs and indexes?
NAMING CONVENTIONS: Consistent naming? snake_case? Clear, descriptive names?

Return ONLY a valid JSON:
{{
    "issues": [
        {{
            "category": "Indexing",
            "severity": "CRITICAL",
            "title": "Missing index on foreign key orders.user_id",
            "detail": "Every JOIN between orders and users causes a full table scan. At 1M rows this will be 500ms+ per query.",
            "table": "orders"
        }}
    ],
    "improvements": [
        {{
            "category": "Normalization",
            "priority": "HIGH",
            "title": "Extract address into separate table",
            "detail": "Address fields repeated in users and orders - 2NF violation causing update anomalies.",
            "sql": "CREATE TABLE addresses (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), street TEXT, city TEXT, country TEXT);\\nALTER TABLE users ADD COLUMN address_id UUID REFERENCES addresses(id);"
        }}
    ],
    "performance_bottlenecks": [
        "No pagination strategy - unbounded SELECT will load all rows into memory at scale",
        "Missing composite index on (user_id, created_at) - order history queries will be slow"
    ],
    "security_concerns": [
        "No encryption mentioned for email/phone - GDPR compliance risk",
        "No audit log table - cannot trace who changed what data"
    ],
    "recommendations": [
        "Add cursor-based pagination using (id, created_at) composite index",
        "Enable Row Level Security (RLS) on multi-tenant tables"
    ],
    "health_score": 62,
    "erd_mermaid": "erDiagram\n  USER ||--o{{ ORDER : places\n  ...",
    "dfd_mermaid": "graph TD\n  Client --> API\n  API --> DB\n  ..."
}}"""

        messages = [
            SystemMessage(content=system_prompt),
            HumanMessage(content=f"Database Schema to Audit:\n{schema}"),
        ]
        try:
            response = self.llm.invoke(messages)
            result = self._parse_and_repair_json(response.content, audit_parser, SeniorAuditResponse)
            return SeniorAuditResponse(**result)
        except Exception as e:
            logger.error(f"LLM Senior Audit Error: {str(e)}")
            raise

    # ── Schema Diagrams Generation ─────────────────────────────
    async def generate_schema_diagrams(self, schema_context: str) -> dict:
        """Generate high-level ERD and DFD for a complete schema context."""
        system_prompt = f"""You are a Senior Database Architect. 
Generate a comprehensive ERD and DFD for the provided database schema.

SCHEMA:
{schema_context}

Return ONLY valid JSON:
{{
    "erd_mermaid": "erDiagram\\n  ...",
    "dfd_mermaid": "graph TD\\n  ...",
    "flow_mermaid": "graph LR\\n  ..."
}}"""
        messages = [
            SystemMessage(content=system_prompt),
            HumanMessage(content="Generate diagrams for this schema."),
        ]
        try:
            response = self.llm.invoke(messages)
            import json
            # Basic cleanup if not using a specific pydantic model for this internal helper
            return json.loads(response.content)
        except Exception as e:
            logger.error(f"LLM Schema Visuals Error: {str(e)}")
            return {}
