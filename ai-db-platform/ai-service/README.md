# ATLAS AI Service 🤖

**The specialized intelligence layer for database engineering.**

This service is a stateless Python engine that provides specialized LLM logic for SQL generation, architectural auditing, and diagramming.

---

## 🧠 Intelligence Flow

### 1. SQL Generation Workflow
- **Input**: Natural query + Schema context.
- **Logic**: The LLM acts as a "Senior Database Architect." It applies indexing rules, pagination logic, and safety constraints.
- **Output**: JSON containing SQL, Explanation, Warnings, and Chart Recommendations.

### 2. Architectural Auditing Workflow
- **Input**: Schema context + User concerns.
- **Logic**: Analyzes schema against categories: Normalization, ACID, Performance, Security, and Scalability.
- **Output**: Detailed audit report + Health Score + Mermaid ERD/DFD.

### 3. Diagram Generation Workflow
- **Input**: Schema context.
- **Logic**: Generates specialized MermaidJS syntax for:
  - `erd_mermaid`: Entity relations.
  - `dfd_mermaid`: Logic and data flow.
  - `flow_mermaid`: Sequence/Operational story.

---

## 📡 API Integration Spec

### `POST /generate-sql`
- **Request**: `SQLGenerationRequest` (Pydantic).
- **Security**: Requires `X-Internal-Secret` header.
- **Logic**: Uses `JsonOutputParser` to ensure results match the expected JSON structure.

### `POST /generate-insights`
- **Request**: `InsightsRequest` (Query + Data Results).
- **Logic**: Analyzes raw data to find patterns, anomalies, and story-telling insights.

---

## 🛡 Safety & Validation
- **SQLGlot**: Integrated for structural validation. It prevents the generation of destructive SQL commands.
- **Pydantic**: Every response is validated against a strict schema before being returned to the Backend.

---

## 🚀 Setup

```bash
# Setup venv
python -m venv venv
source venv/bin/activate

# Install
pip install -r requirements.txt

# .env
LLM_MODEL=...
GROQ_API_KEY=...
AI_SERVICE_SECRET=...

# Run
uvicorn app.main:app --port 8000 --reload
```
