from fastapi import APIRouter, Header, HTTPException, Depends
from app.models.pydantic_schemas import (
    SQLGenerationRequest, 
    SQLGenerationOutput, 
    OptimizationRequest, 
    OptimizationResponse,
    InsightsRequest,
    InsightsResponse,
    ArchitectureReviewRequest,
    ArchitectureReviewResponse,
    RequirementProbeResponse,
    SchemaGenerationResponse,
    SeniorAuditResponse
)
from app.services.llm_service import LLMService
from app.services.sql_validator import validate_sql_safety
from app.core.config import settings

router = APIRouter()

async def verify_internal_secret(x_internal_secret: str = Header(None)):
    if x_internal_secret != settings.AI_SERVICE_SECRET:
        raise HTTPException(status_code=403, detail="Invalid internal secret")

@router.post("/generate-sql", response_model=SQLGenerationOutput)
async def generate_sql_endpoint(
    request: SQLGenerationRequest,
    _ = Depends(verify_internal_secret)
):
    """
    Generate and validate SQL from natural language.
    """
    llm_service = LLMService()
    try:
        result = await llm_service.generate_sql(
            request.natural_query, 
            request.schema_context
        )
        
        # Validate SQL safety
        validation = validate_sql_safety(result.sql, request.dialect)
        if not validation.valid:
            raise HTTPException(status_code=400, detail=f"Safety check failed: {validation.error}")
            
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/optimize-query", response_model=OptimizationResponse)
async def optimize_query_endpoint(
    request: OptimizationRequest,
    _ = Depends(verify_internal_secret)
):
    """
    Analyze and optimize an existing SQL query.
    """
    llm_service = LLMService()
    try:
        result = await llm_service.optimize_query(
            request.sql,
            request.schema_context,
            request.explain_plan
        )
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/generate-insights", response_model=InsightsResponse)
async def generate_insights_endpoint(
    request: InsightsRequest,
    _ = Depends(verify_internal_secret)
):
    """
    Analyze query results and provide NL insights.
    """
    llm_service = LLMService()
    try:
        result = await llm_service.generate_insights(
            request.query,
            request.results
        )
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/analyze-architecture", response_model=ArchitectureReviewResponse)
async def analyze_architecture_endpoint(
    request: ArchitectureReviewRequest,
    _ = Depends(verify_internal_secret)
):
    """
    Deep audit of database architecture.
    """
    llm_service = LLMService()
    try:
        result = await llm_service.analyze_architecture(
            request.schema_context,
            request.requirements,
            request.expected_scale
        )
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ── Design Studio Endpoints ──────────────────────────────────
@router.post("/design-studio/probe-requirements", response_model=RequirementProbeResponse)
async def probe_requirements_endpoint(
    request_body: dict,
    _ = Depends(verify_internal_secret)
):
    """
    Generate probing questions for database requirements gathering.
    """
    llm_service = LLMService()
    try:
        probes = await llm_service.generate_requirement_probes(
            request_body.get("user_input"),
            request_body.get("conversation_context", "")
        )
        return {"probes": probes}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/design-studio/generate-schema", response_model=dict)
async def generate_schema_endpoint(
    request_body: dict,
    _ = Depends(verify_internal_secret)
):
    """
    Generate complete database schema from conversation requirements.
    """
    llm_service = LLMService()
    try:
        schema = await llm_service.generate_schema_from_requirements(
            request_body.get("conversation_transcript")
        )
        return {"schema": schema}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/design-studio/audit-senior-level", response_model=dict)
async def audit_senior_level_endpoint(
    request_body: dict,
    _ = Depends(verify_internal_secret)
):
    """
    Senior-level audit of existing database architecture.
    """
    llm_service = LLMService()
    try:
        audit = await llm_service.audit_senior_level(
            request_body.get("schema")
        )
        return {"audit": audit}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
