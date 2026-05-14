from pydantic import BaseModel, Field
from typing import List, Optional, Literal, Dict, Any

class ChartRecommendation(BaseModel):
    type: Literal["bar", "line", "pie", "area", "table", "none"]
    x_axis: Optional[str] = None
    y_axis: Optional[str] = None
    label: Optional[str] = None

class SQLGenerationRequest(BaseModel):
    natural_query: str
    schema_context: str
    dialect: Optional[str] = "postgres"

class SQLGenerationOutput(BaseModel):
    sql: str
    explanation: str
    warnings: List[str] = []
    confidence: float = 0.0
    provider: str
    model: str
    chart_recommendation: Optional[ChartRecommendation] = None

class OptimizationRequest(BaseModel):
    sql: str
    schema_context: str
    explain_plan: Optional[dict] = None

class OptimizationResponse(BaseModel):
    optimized_sql: str
    issues: List[str] = []
    suggestions: List[str] = []
    index_recommendations: List[str] = []

class ValidationResult(BaseModel):
    valid: bool
    error: Optional[str] = None
    sql: Optional[str] = None

class InsightsRequest(BaseModel):
    query: str
    results: List[Dict[str, Any]]
    schema_context: Optional[str] = None

class InsightsResponse(BaseModel):
    summary: str
    key_findings: List[str] = []
    anomalies: List[str] = []
    recommendations: List[str] = []
    erd_mermaid: Optional[str] = None
    dfd_mermaid: Optional[str] = None
    flow_mermaid: Optional[str] = None

class ArchitectureReviewRequest(BaseModel):
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

class ArchitectureReviewResponse(BaseModel):
    executive_summary: str
    component_analysis: List[Dict[str, Any]] = []
    critical_mistakes: List[str] = []
    improvement_plan: List[str] = []
    suggested_fixes: List[ArchitectureFix] = []
    suggested_missions: List[ArchitectureMission] = []
    scalability_score: int = 0
    suggested_diagram_mermaid: Optional[str] = None

# ── Design Studio Schemas ────────────────────────────────────
class RequirementProbeResponse(BaseModel):
    probes: str

class SchemaMigration(BaseModel):
    sql: str
    description: str
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

class SchemaGenerationResponse(BaseModel):
    entities: List[Entity] = []
    relationships: List[Dict[str, Any]] = []
    sql_scripts: List[SchemaMigration] = []
    erd_mermaid: Optional[str] = None
    normalization_level: Optional[str] = "3NF"
    scalability_notes: Optional[str] = None
    acid_compliance: bool = True

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
    issues: List[AuditIssue] = []
    improvements: List[AuditImprovement] = []
    performance_bottlenecks: List[str] = []
    security_concerns: List[str] = []
    recommendations: List[str] = []
    health_score: int = 0
    erd_mermaid: Optional[str] = None
    dfd_mermaid: Optional[str] = None
