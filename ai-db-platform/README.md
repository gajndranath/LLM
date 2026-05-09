# AI Enterprise Database Architect Platform

A powerful, AI-driven platform for designing, managing, and optimizing enterprise-grade PostgreSQL databases.

## 🚀 Phase 1: AI SQL Copilot
- Natural Language to SQL generation using Groq/Gemini.
- Safety-first execution with SQLGlot validation.
- Multi-database connection management.
- Real-time query results with performance metrics.

## 🛠 Tech Stack
- **Frontend**: React, Vite, TanStack Query, Zustand, Monaco Editor, Tailwind CSS.
- **Backend**: Node.js, Express, Socket.IO, PostgreSQL, Redis.
- **AI Layer**: Python, FastAPI, LangChain, SQLGlot.

## 🏁 Quick Start

### 1. Prerequisites
- Node.js (v18+)
- Python (3.10+)
- PostgreSQL & Redis (or use Docker)
- **Groq API Key** (get it free at [console.groq.com](https://console.groq.com))

### 2. Setup Environment
1. Copy `.env.example` to `.env` in the root.
2. Fill in your `GROQ_API_KEY`.
3. Set a random 32-character `ENCRYPTION_KEY`.
4. Set random `JWT_SECRET` and `JWT_REFRESH_SECRET`.

### 3. Run with Docker (Recommended)
```bash
docker-compose up --build
```
The platform will be available at:
- Frontend: `http://localhost:3000`
- Backend API: `http://localhost:3001`
- AI Service: `http://localhost:8000`

### 4. Manual Setup (Development)

#### Backend
```bash
cd backend
npm install
# Setup your local DB using src/models/schema.sql
npm run dev
```

#### AI Service
```bash
cd ai-service
# Create venv
python -m venv venv
source venv/bin/activate # or venv\Scripts\activate on Windows
pip install -r requirements.txt
uvicorn app.main:app --reload
```

#### Frontend
```bash
cd frontend
npm install
npm run dev
```

## 🛡 Security & Safety
- **Read-Only Execution**: All generated queries are executed in read-only transactions.
- **Statement Timeout**: 30s limit to prevent infinite loops.
- **Row Limits**: Results are truncated to 10,000 rows.
- **Safety Parser**: SQLGlot blocks `DROP`, `TRUNCATE`, and `DELETE` without `WHERE`.
