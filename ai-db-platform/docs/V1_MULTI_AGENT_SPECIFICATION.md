# 🧬 MULTI-AGENT ARCHITECTURE & ISOLATION SPECIFICATION — V1
**Platform Version:** ATLAS v1.0.0 Enterprise  
**Design Pattern:** Deterministic Directed Acyclic Graph (DAG) Multi-Agent System  
**Validation Engine:** Silicon AST Gatekeeper (`sqlglot`) + PostgreSQL Dry-Run Sandbox  

---

## 1. Multi-Agent DAG Execution Lifecycle

Rather than an unconstrained while-loop, ATLAS executes a strictly scoped 4-Stage DAG:

```
[User Business Requirements]
        │
        ▼
┌──────────────────────────────┐  (Context: Domain Entities & Business Flow)
│ 1. MARCUS (Lead Architect)   │  • Output: Entities, Cardinalities, Foreign Keys
└──────────────┬───────────────┘  • Strict Limit: Cannot touch SQL index or security rules
               │ (Structured Entity Graph JSON)
               ▼
┌──────────────────────────────┐  (Context: AST Parse-Tree, SQLi, Drop Protection)
│ 2. VICTOR (Forensic Auditor) │  • Output: Audited Graph, Blocked Destructive DDL
└──────────────┬───────────────┘  • Strict Limit: Cannot alter business logic
               │ (Audited Safe Graph JSON)
               ▼
┌──────────────────────────────┐  (Context: IOPS, Partitioning, Composite B-Tree & GIN)
│ 3. OPTIMUS (Principal DBA)   │  • Output: Performance Indexes, Query Plan Optimizations
└──────────────┬───────────────┘  • Strict Limit: Cannot create/delete business entities
               │ (Performance Tuned Schema JSON)
               ▼
┌──────────────────────────────┐  (Context: Mathematical Transitive Dependencies)
│ 4. SOPHIA (Schema Normalizer)│  • Output: 1NF ➔ 2NF ➔ 3NF Normalized DDL Blueprint
└──────────────┬───────────────┘  • Strict Limit: Redundancy elimination only
               │
               ▼
   [Final Verified DDL Script] ➔ [Postgres Dry-Run Sandbox] ➔ [Visual Canvas Preview]
```

---

## 2. Agent Isolation & Contract Matrix

| Agent Name | Role / Persona | Isolated Context Scope | JSON Contract Output | Strict Guardrail Boundary |
| :--- | :--- | :--- | :--- | :--- |
| 🏛️ **Marcus** | **Lead Architect** | Business domain entities, natural requirements, relationships. | `EntityGraphJSON` | ❌ Cannot execute SQL; cannot create performance indexes. |
| 🛡️ **Victor** | **Security Auditor** | SQL AST gatekeeper rules, data-loss patterns, cascade checks. | `AuditedSecurityJSON` | ❌ Cannot alter user business logic or table relations. |
| ⚡ **Optimus** | **Principal DBA** | Query planner scale, table sizing, composite indexing. | `IndexPlanJSON` | ❌ Cannot add or drop business tables. |
| 💎 **Sophia** | **Normalizer** | Functional dependencies, 3NF normalization mathematics. | `NormalizedDDLJSON` | ❌ Cannot deploy directly to live database. |

---

## 3. Human-in-the-Loop Verification & Safety Checkpoints

1. **Zero Automated Direct Execution**: All generated DDLs are sandboxed in `SET TRANSACTION READ ONLY; BEGIN; ... ROLLBACK;`.
2. **Visual Diff Inspection**: Users inspect table graphs and SQL scripts side-by-side on the Visual Studio Canvas before taking any action.
3. **Explicit One-Click Apply**: Live database migrations require explicit authorized user click and audit logging.

---
*Specification Documented and Certified by ATLAS Core Reliability Suite.*
