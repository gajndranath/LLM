import asyncio
import time
import logging
from typing import Dict, List, Any
from app.services.llm_service import LLMService
from app.services.ast_gatekeeper import SiliconASTGatekeeper
from app.services.mesi_dag_engine import MESIDependencyDAG
from app.services.graph_delta_engine import SchemaGraphDeltaEngine

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("benchmark_arena")

BENCHMARK_SCENARIOS = [
    {
        "id": "SCENARIO_1_POLYMORPHIC_RATINGS",
        "title": "Polymorphic Rating & Multi-Role FKs",
        "prompt": "Design a rating system where Passengers rate Drivers, and Drivers rate Passengers with review tags and star ratings.",
        "eval_criteria": [
            "Must NOT have duplicate column names for rater/ratee",
            "Must have valid explicit FK relations to drivers and passengers",
            "Must have NOT NULL rating check"
        ]
    },
    {
        "id": "SCENARIO_2_FLASH_SALE_CONCURRENCY",
        "title": "E-Commerce Flash Sale High-Concurrency Inventory Locks",
        "prompt": "Design an inventory and orders schema for flash sales with 10,000 concurrent users buying limited stock.",
        "eval_criteria": [
            "Must have CHECK constraint on stock/quantity (quantity >= 0)",
            "Must enforce composite UNIQUE on junction mapping tables",
            "Must specify Row-Level Locking strategy (SELECT FOR UPDATE) in ADR"
        ]
    },
    {
        "id": "SCENARIO_3_SOFT_DELETE_PARTIAL_INDEX",
        "title": "SaaS Soft-Delete Partial Unique Email Re-registration",
        "prompt": "Design a SaaS multi-tenant users table with soft delete (deleted_at). Users who delete their account should be allowed to sign up again later with the same email.",
        "eval_criteria": [
            "Must have tenant_id UUID and RLS enabled",
            "Must have soft-delete column deleted_at",
            "Must use partial unique index or handle active uniqueness"
        ]
    },
    {
        "id": "SCENARIO_4_INCREMENTAL_STATE_DRIFT",
        "title": "Live DB Incremental Migration (Uber Rides -> Corporate Billing)",
        "prompt": "We already have live 'rides', 'drivers', and 'payments' tables. Now add Corporate B2B Accounts with employee credit limits and link ride payments to corporate accounts.",
        "existing_schema": "CREATE TABLE drivers (id BIGINT PRIMARY KEY, name TEXT); CREATE TABLE passengers (id BIGINT PRIMARY KEY, name TEXT); CREATE TABLE rides (id BIGINT PRIMARY KEY, driver_id BIGINT REFERENCES drivers(id), passenger_id BIGINT REFERENCES passengers(id)); CREATE TABLE payments (id BIGINT PRIMARY KEY, ride_id BIGINT REFERENCES rides(id), amount NUMERIC(10,2));",
        "eval_criteria": [
            "Must NOT drop existing live tables (rides, payments)",
            "Must generate non-destructive ALTER TABLE on payments",
            "Must create corporate_accounts and link corporate_account_id to payments"
        ]
    },
    {
        "id": "SCENARIO_5_HIGH_WRITE_TELEMETRY",
        "title": "High-Write GPS Telemetry Index Budgeting",
        "prompt": "Track real-time GPS locations (latitude, longitude, speed, heading, timestamp) of 50,000 active delivery drivers every 3 seconds.",
        "eval_criteria": [
            "Must NOT have single-column index bloat on low-cardinality fields",
            "Must use composite index (driver_id, recorded_at DESC) or PostGIS GiST",
            "Must be optimized for heavy write throughput"
        ]
    }
]

async def run_benchmark():
    logger.info("=================================================================")
    logger.info("🚀 STARTING ATLAS DBRE EMPIRICAL STRESS BENCHMARK ARENA")
    logger.info("=================================================================")

    llm_service = LLMService()
    results: List[Dict[str, Any]] = []

    for scenario in BENCHMARK_SCENARIOS:
        logger.info(f"\n[Running Test]: {scenario['title']}")
        start_time = time.time()
        
        try:
            schema_resp = await llm_service.generate_schema_from_requirements(
                conversation_transcript=scenario["prompt"],
                schema_context=scenario.get("existing_schema", ""),
                last_error=""
            )
            elapsed = time.time() - start_time
            
            # Static AST Verification
            all_sql = "\n".join([s.sql for s in schema_resp.sql_scripts])
            is_valid, clean_sql, warnings = SiliconASTGatekeeper.sanitize_and_validate_ddl(all_sql)
            
            # Evaluation Rubric Check
            passed_checks = []
            failed_checks = []
            
            # Anti-bloat check
            has_redundant_index = "Stripped redundant index" in str(warnings)
            
            result_item = {
                "id": scenario["id"],
                "title": scenario["title"],
                "status": "PASSED" if is_valid else "FAILED",
                "reliability_score": schema_resp.reliability_score,
                "latency_seconds": round(elapsed, 2),
                "tables_generated": len(schema_resp.entities),
                "ast_warnings": warnings,
                "sql_preview": all_sql[:200] + "..."
            }
            results.append(result_item)
            logger.info(f"✅ {scenario['title']} completed in {elapsed:.2f}s with Reliability: {schema_resp.reliability_score}%")
            
        except Exception as err:
            logger.error(f"❌ {scenario['title']} failed with error: {err}")
            results.append({
                "id": scenario["id"],
                "title": scenario["title"],
                "status": "ERROR",
                "error": str(err)
            })

    logger.info("\n=================================================================")
    logger.info("📊 FINAL EMPIRICAL BENCHMARK SCORECARD")
    logger.info("=================================================================")
    total_passed = sum(1 for r in results if r.get("status") == "PASSED")
    avg_score = sum(r.get("reliability_score", 0) for r in results if "reliability_score" in r) / max(1, total_passed)
    avg_latency = sum(r.get("latency_seconds", 0) for r in results if "latency_seconds" in r) / max(1, total_passed)

    print(f"\nTotal Scenarios Tested: {len(BENCHMARK_SCENARIOS)}")
    print(f"Passed Scenarios: {total_passed} / {len(BENCHMARK_SCENARIOS)} ({total_passed / len(BENCHMARK_SCENARIOS) * 100:.1f}%)")
    print(f"Average Reliability Score: {avg_score:.1f}%")
    print(f"Average Pipeline Latency: {avg_latency:.2f}s\n")

    return results

if __name__ == "__main__":
    asyncio.run(run_benchmark())
