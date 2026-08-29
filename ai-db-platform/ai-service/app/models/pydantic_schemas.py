from pydantic import BaseModel, Field
from typing import List, Optional, Literal, Dict, Any

class ChartRecommendation(BaseModel):
    type: Literal["bar", "line", "pie", "area", "table", "none"]
    x_axis: Optional[str] = None
    y_axis: Optional[str] = None
    label: Optional[str] = None

class BaseAIRequest(BaseModel):
    provider: Optional[str] = None
    model: Optional[str] = None

class SQLGenerationRequest(BaseAIRequest):
    natural_query: str
    schema_context: str
    dialect: Optional[str] = "postgres"

class SQLGenerationOutput(BaseModel):
    thought: str = Field(description="Internal monologue. Think step-by-step about performance, security, and schema matching before writing SQL.")
    sql: str
    explanation: str
    warnings: List[str] = []
    confidence: float = 0.0
    provider: str
    model: str
    chart_recommendation: Optional[ChartRecommendation] = None

class OptimizationRequest(BaseAIRequest):
    sql: str
    schema_context: str
    explain_plan: Optional[dict] = None

class OptimizationResponse(BaseModel):
    thought: str = Field(description="Internal monologue. Think about indexing strategy, partitions, and query cost before optimizing.")
    optimized_sql: str
    issues: List[str] = []
    suggestions: List[str] = []
    index_recommendations: List[str] = []

class ValidationResult(BaseModel):
    valid: bool
    error: Optional[str] = None
    sql: Optional[str] = None

class SQLTransformRequest(BaseAIRequest):
    sql: str
    dialect: Optional[str] = "postgres"

class SQLTransformResponse(BaseModel):
    transformed_sql: str

class InsightsRequest(BaseAIRequest):
    query: str
    results: List[Dict[str, Any]]
    schema_context: Optional[str] = None

class InsightsResponse(BaseModel):
    thought: str = Field(description="Internal monologue. Analyze data trends and anomalies before writing insights.")
    summary: str
    key_findings: List[str] = []
    anomalies: List[str] = []
    recommendations: List[str] = []
    erd_mermaid: Optional[str] = None
    dfd_mermaid: Optional[str] = None
    flow_mermaid: Optional[str] = None

class ArchitectureReviewRequest(BaseAIRequest):
    schema_context: str
    requirements: Optional[str] = None
    expected_scale: Optional[str] = "1M rows"

class ArchitectureFix(BaseModel):
    title: str
    sql: str
    rollback_sql: str
    explanation: str

class ArchitectureMission(BaseModel):
    title: str
    description: str
    priority: str
    reasoning: str

class ComponentAnalysis(BaseModel):
    component_name: str
    status: str
    description: str

class ArchitectureReviewResponse(BaseModel):
    thought: str = Field(description="Internal monologue. Evaluate schema bottlenecks, index missing, and architectural flaws.")
    executive_summary: str
    component_analysis: List[ComponentAnalysis] = []
    critical_mistakes: List[str] = []
    improvement_plan: List[str] = []
    suggested_fixes: List[ArchitectureFix] = []
    suggested_missions: List[ArchitectureMission] = []
    scalability_score: int = 0
    suggested_diagram_mermaid: Optional[str] = None

# ── Design Studio Schemas ────────────────────────────────────
class RequirementProbeResponse(BaseModel):
    thought: str = Field(description="Internal monologue. Determine if you have enough information to build the schema or if you need to ask more questions.")
    probes: str

class SchemaMigration(BaseModel):
    sql: str
    description: Optional[str] = None
    rollback_sql: Optional[str] = None

class EntityField(BaseModel):
    column: str
    type: str
    notes: Optional[str] = None

class Entity(BaseModel):
    name: str
    fields: List[EntityField] = []
    primary_key: Optional[str] = None
    indexes: List[str] = []

class VisualNode(BaseModel):
    id: str
    label: str
    type: str

class VisualEdge(BaseModel):
    source: str
    target: str
    label: Optional[str] = None
    relationship_type: str = "one-to-many"

class VisualJSON(BaseModel):
    nodes: List[VisualNode] = []
    edges: List[VisualEdge] = []

class SchemaRelationship(BaseModel):
    source_table: str
    target_table: str
    relationship_type: str
    foreign_key_column: str

class SchemaGenerationResponse(BaseModel):
    thought: str = Field(description="Internal monologue. Plan the table relationships, constraints, and data types before generating entities.")
    entities: List[Entity] = []
    relationships: List[SchemaRelationship] = []
    sql_scripts: List[SchemaMigration] = []
    visual_json: Optional[VisualJSON] = None
    erd_mermaid: Optional[str] = None
    normalization_level: Optional[str] = "3NF"
    scalability_notes: Optional[str] = None
    acid_compliance: bool = True
    reliability_score: int = 95
    isolation_level: Optional[str] = "READ COMMITTED + ROW LOCKS"


class AuditIssue(BaseModel):
    category: str = "General"
    severity: str = "MEDIUM"
    title: str = "Issue"
    detail: str = "No details provided"
    table: Optional[str] = None

class AuditImprovement(BaseModel):
    category: str = "General"
    priority: str = "MEDIUM"
    title: str = "Improvement"
    detail: str = "No details provided"
    sql: Optional[str] = None

class SeniorAuditResponse(BaseModel):
    thought: str = Field(description="Internal monologue. Cross check the schema context and active missions before raising flags.")
    issues: List[AuditIssue] = []
    improvements: List[AuditImprovement] = []
    performance_bottlenecks: List[str] = []
    security_concerns: List[str] = []
    recommendations: List[str] = []
    health_score: int = 0
    erd_mermaid: Optional[str] = None
    dfd_mermaid: Optional[str] = None

# ── Strict Design Studio Request Models ──────────────────────
class ProbeRequirementsRequest(BaseAIRequest):
    user_input: str
    conversation_context: Optional[str] = ""
    schema_context: Optional[str] = ""

class GenerateSchemaRequest(BaseAIRequest):
    conversation_transcript: str
    current_schema: Optional[str] = ""
    last_error: Optional[str] = ""

class SeniorAuditRequest(BaseAIRequest):
    schema_text: str = Field(alias="schema")
    user_concerns: Optional[str] = ""

    class Config:
        populate_by_name = True

class SchemaVisualsRequest(BaseAIRequest):
    schema_context: str

