# ATLAS AI-DB Platform 🚀

**The Mission Control for Enterprise Databases.**

ATLAS is an AI-native database platform designed for senior database architects and developers. It provides a conversational interface to complex database operations, automated architectural audits, and high-fidelity system visualizations.

---

## 🏗 System Architecture & Integration Flow

The platform is built on a modern, decoupled architecture. Here is how data flows through the system:

### 🔄 Feature Execution Flow
1.  **User Input (Frontend)**: User enters a natural language query in the SQL Copilot.
2.  **Request (Backend)**: Frontend sends the query + Connection ID to the Node.js Backend.
3.  **Context Enrichment (Backend)**: Backend fetches the schema metadata for that specific connection and formats it as a "Context" string.
4.  **AI Processing (AI Service)**: Backend sends the Query + Context to the Python AI Service.
5.  **LLM Logic (AI Service)**: LangChain orchestrates the LLM (Groq/OpenAI) to generate SQL, explanations, and visualization recommendations.
6.  **Safety Check (AI Service)**: `sqlglot` validates the generated SQL for safety (e.g., blocking unauthorized DROP commands).
7.  **Execution (Backend)**: Backend receives the SQL, executes it in a **Read-Only** transaction on the target database, and returns the results.
8.  **Insight Generation**: If results are returned, a second pass is made to generate natural language insights and architectural diagrams (ERD/DFD).
9.  **Visualization (Frontend)**: Results are rendered as high-fidelity tables, charts, or Mermaid diagrams.

---

## 🛠 Tech Stack & Integration

### 1. Frontend (`/frontend`)
- **Integration**: Communicates with Backend via Axios. Uses `sonner` for real-time AI feedback.
- **Visuals**: MermaidJS (Diagrams), Recharts (Charts), Monaco (SQL Editor).

### 2. Backend (`/backend`)
- **Integration**: Acts as the API Gateway. Connects to the AI Service using an internal `X-Internal-Secret` for security.
- **Storage**: Manages encrypted database credentials using AES-256.

### 3. AI Service (`/ai-service`)
- **Integration**: Stateless FastAPI service. Uses Pydantic for strict contract enforcement with the backend.
- **Intelligence**: LangChain + Specialized system prompts for Database Architecture.

---

## 📡 API Routes Summary

### 👤 Authentication (`/api/auth`)
- `POST /register` - New user onboarding.
- `POST /login` - JWT-based authentication.

### 🔌 Connections (`/api/connections`)
- `GET /` - List all connected sources.
- `POST /` - Add a new enterprise database (PG).
- `GET /:id/schema` - Deep introspection & AI diagram generation.

### ⌨️ SQL Copilot (`/api/query`)
- `POST /generate` - NL to optimized SQL.
- `POST /execute` - Secure query execution.
- `POST /insights` - AI analysis of result sets + Sequence diagrams.

### 🏛 Architect Studio (`/api/architect` & `/api/design-studio`)
- `POST /review` - Deep architecture audit (Indexing, ACID, Security).
- `POST /probe` - Conversational requirements gathering.
- `POST /generate-schema` - Full blueprint generation from conversation.
 
---

## ⚡️ Quick Start (Docker)

The fastest way to get ATLAS running is using Docker Compose:

1. **Clone & Env**: Copy `.env.example` to `.env` and fill in your `GROQ_API_KEY` (required for AI).
2. **Launch**:
   ```bash
   docker-compose up --build
   ```
3. **Access**:
   - **Frontend**: [http://localhost:3000](http://localhost:3001)
   - **Backend API**: [http://localhost:3001](http://localhost:3001)
   - **AI Service**: [http://localhost:8000](http://localhost:8000)

---

## 🏛 How to Use ATLAS Architect Studio

ATLAS Architect Studio provides two specialized modes for database design and management.

### 1. 🆕 Builder Mode (Create New Databases)
Use this when you have an idea for a new app and need a professional database blueprint.
1. **Start Session**: Select "Builder" and click **New Blueprint**.
2. **Chat with ATLAS**: Describe your application (e.g., "I'm building a Fintech app with multi-currency support").
3. **Gather Requirements**: ATLAS will ask 2-3 deep questions about scale, concurrency, and specific features.
4. **Generate Blueprint**: Once ATLAS says it's ready, click **Generate Blueprint**.
5. **Review**: Access the generated **ERD**, **SQL Scripts**, and **Scalability Strategy** in the right panel.

### 2. 🔧 Auditor Mode (Optimize Existing Databases)
Use this to perform deep architectural health checks on your production databases.
1. **Select Source**: Select your existing database connection from the dropdown.
2. **Start Audit**: Select "Auditor" and click **New Audit**.
3. **Deep Analysis**: ATLAS will automatically pull your live schema and perform an **A-to-Z Audit**.
4. **Review Report**:
   - **Health Score**: A 0-100 score of your database architecture.
   - **Critical Insights**: View issues related to Indexing, Security, and Normalization.
   - **Architecture Maps**: View high-fidelity **ERD** and **Data Flow Diagrams (DFD)** of your live DB.
5. **Apply Fixes**: Click **Apply Fix via ATLAS** on any improvement suggestion to execute the optimized SQL directly.

---

## 🚀 Setup & Integration Instructions

Refer to the individual READMEs in each folder for specific environment variable setups (`.env`).

- [Frontend Setup Guide](file:///d:/CodeByte/LLM/llm/ai-db-platform/frontend/README.md)
- [Backend Setup Guide](file:///d:/CodeByte/LLM/llm/ai-db-platform/backend/README.md)
- [AI Service Setup Guide](file:///d:/CodeByte/LLM/llm/ai-db-platform/ai-service/README.md)
