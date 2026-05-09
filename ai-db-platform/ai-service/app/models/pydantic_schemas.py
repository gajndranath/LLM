from pydantic import BaseModel, Field
from typing import List, Optional, Literal, Dict, Any

class ChartRecommendation(BaseModel):
    type: Literal["bar", "line", "pie", "area", "none"]
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
    key_findings: List[str]
    anomalies: List[str]
    recommendations: List[str]

class ArchitectureReviewRequest(BaseModel):
    schema_context: str
    requirements: Optional[str] = None
    expected_scale: Optional[str] = "1M rows"

class ArchitectureFix(BaseModel):
    title: str
    sql: str
    rollback_sql: str # NEW: SQL to undo the change
    explanation: str

class ArchitectureMission(BaseModel):
    title: str
    description: str
    priority: Literal["CRITICAL", "HIGH", "MEDIUM", "LOW"]
    reasoning: str

class ArchitectureReviewResponse(BaseModel):
    executive_summary: str
    component_analysis: List[Dict[str, Any]]
    critical_mistakes: List[str]
    improvement_plan: List[str]
    suggested_fixes: List[ArchitectureFix] = [] # NEW: Detailed SQL fixes
    suggested_missions: List[ArchitectureMission] = [] # NEW: Jarvis's proactive task list
    scalability_score: int = Field(..., ge=0, le=100)
    suggested_diagram_mermaid: str

# ── Design Studio Schemas ────────────────────────────────────
class RequirementProbeResponse(BaseModel):
    probes: str  # AI-generated probing questions

class SchemaMigration(BaseModel):
    sql: str
    description: str
    rollback_sql: Optional[str] = None

class Entity(BaseModel):
    name: str
    fields: List[Dict[str, str]]
    primary_key: Optional[str] = None
    indexes: List[str] = []

class SchemaGenerationResponse(BaseModel):
    entities: List[Entity]
    relationships: List[Dict[str, str]]
    sql_scripts: List[SchemaMigration]
    erd_mermaid: str
    normalization_level: Literal["1NF", "2NF", "3NF", "BCNF"]
    scalability_notes: str
    acid_compliance: bool

class SeniorAuditResponse(BaseModel):
    issues: List[Dict[str, str]]
    improvements: List[Dict[str, str]]
    performance_bottlenecks: List[str]
    security_concerns: List[str]
    recommendations: List[str]
    health_score: int  # 0-100
