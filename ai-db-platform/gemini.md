Phase 1: The Silicon AST Gatekeeper (Physical Hallucination Firewall)
 Task 1.1: Install and configure sqlglot in ai-service/app/services/.
 Task 1.2: Implement ASTValidator class:
Detect & hard-block accidental/destructive DROP TABLE without rollback guards.
Automatically detect and strip redundant CREATE INDEX statements if a column is already marked UNIQUE.
Validate that Foreign Key references match the parent table's Primary Key type (BIGINT ➔ BIGINT, UUID ➔ UUID).
 Task 1.3: Wire ASTValidator directly between Sam (Proposer) and Victor (Auditor).
🔹 Phase 2: Token Economy & Dependency DAG (MESI Cache Coherence)
 Task 2.1: Implement SchemaDependencyGraph in backend & ai-service.
 Task 2.2: Build Mathematical Subgraph Extractor:
If a user prompts: "Add billing to rides", extract only {rides, payments, corporate_accounts} and their 1-hop FK neighbors.
Omit the remaining 40 unrelated tables from prompt context to reduce token bloat by 70%.
 Task 2.3: Implement Shannon Entropy AST Pruner & Time-Decay Context Memory:
Relevance & Recency Formula: $$S(q, m) = \left( \frac{q \cdot m}{|q| |m|} \right) \times e^{-\lambda(T - t)}$$
Shannon Information Entropy Pruning: $$H(X) = -\sum_{i=1}^{n} P(x_i) \log_2 P(x_i)$$ Prunes low-entropy boilerplate (id SERIAL PRIMARY KEY) and prioritizes high-entropy business logic (CHECK, RLS, GiST).
🔹 Phase 3: Closed-Loop Adversarial Rejection & Unified Scoring
 Task 3.1: Solidify Victor Auditor rejection gate in llm_service.py.
 Task 3.2: Implement Ensemble Variance Disagreement Check:
Greedy decoding (temperature = 0.0) + Multi-Agent Variance Gate: $$\sigma^2 = \frac{1}{N} \sum_{i=1}^{N} (x_i - \mu)^2$$ If $\sigma^2 > \text{threshold}$, automatically flags hallucination and triggers self-healing.
 Task 3.3: Enforce Unified 100-point Deterministic Rubric:
Deductions: Missing RLS (-15), Missing Compound Unique on Junction (-10), Redundant Index Bloat (-10), Missing CHECK on balance (-10), Missing Rollback script (-10).
 Task 3.4: If score < 95%, automatically feed Victor's line-by-line diff back to Sam for 1-click self-healing.
🔹 Phase 4: State Drift, Incremental Graph Delta ($\Delta$) & Concurrency (OCC)
 Task 4.1: Implement calculate_schema_delta(live_ast, target_ast):
Formula: $\text{State}{t+1} = \text{State}t \oplus \Delta(\text{Intent}{t+1}, \mathcal{G}{\text{live}}, \mathcal{H}_{\text{context}})$
Distinguishes between new tables (CREATE TABLE) vs existing tables (ALTER TABLE ADD COLUMN IF NOT EXISTS).
 Task 4.2: Implement Optimistic Concurrency Control (OCC / Redlock):
Validation Constraint: $RS(T_i) \cap WS(T_j) = \emptyset$ with version_hash checking on mutations.
 Task 4.3: Prevent cross-session data loss:
When Session 2 deploys, it never overwrites or drops Session 1 tables.
 Task 4.4: Update ReactFlow Visualizer to render the cumulative union graph ($\mathcal{G}_{\text{live}} \cup \Delta$).
🔹 Phase 5: Empirical Benchmark Suite (The Arena)
 Task 5.1: Build automated test runner script tests/benchmark_arena.py.
 Task 5.2: Test across all 5 Hard Scenarios:
Polymorphic Ratings & Multi-Role FKs
Flash Sale High-Concurrency Inventory Locks
Soft-Delete Partial Index Re-registration
Session 1 ➔ Session 2 Live DB Incremental Migration
High-Write GPS Telemetry Index Budgeting
 Task 5.3: Generate public-grade Benchmark Scorecard comparing ATLAS vs Raw Claude vs Supabase.