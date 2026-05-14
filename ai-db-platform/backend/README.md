# ATLAS Backend ⚙️

**The core orchestrator and secure API gateway.**

The backend manages the lifecycle of database connections, executes secure queries, and orchestrates requests between the Frontend and the AI Service.

---

## 🏗 Backend Architecture

### 🔄 Request Orchestration
1.  **Auth**: All routes (except login/register) are protected by the `authenticate` middleware.
2.  **RBAC**: Certain operations (like applying SQL fixes) require specific roles (`requireMinRole`).
3.  **Context Building**: For any AI operation, the backend fetches the schema metadata for the target `connectionId` and formats it for the LLM.
4.  **AI Proxy**: The backend forwards enriched requests to the AI Service using a secure internal secret.

---

## 📡 API Routes & Logic

### `/api/connections`
- **Logic**: Uses `pg` to test connectivity and `extractSchema` to introspect the DB structure.
- **Integration**: During schema extraction, it calls the AI Service to pre-generate ERD/DFD diagrams for the cache.

### `/api/query`
- `POST /generate`: NL -> SQL.
- `POST /execute`: Executes SQL in a `READ ONLY` transaction unless `readOnly: false` is explicitly passed (e.g., for architectural fixes).
- `POST /insights`: Sends query results to AI to generate a natural language summary and operational flow diagrams.

### `/api/architect`
- `POST /review`: Performs a deep audit. Results are persisted in the `architect_audits` table.
- **Missions**: Proactive "ATLAS Missions" are created in the DB based on audit findings.

---

## 🔒 Security & Data Integrity
- **Credential Encryption**: User DB passwords are encrypted using `crypto-js` (AES-256) before being saved.
- **Query Isolation**: Target databases are accessed using isolated connection pools per user.
- **Error Handling**: Standardized `ApiError` class ensures no sensitive stack traces are leaked to the frontend.

---

## 🚀 Setup

```bash
# Install
npm install

# .env configuration
PORT=3001
DATABASE_URL=...
JWT_SECRET=...
ENCRYPTION_KEY=...
AI_SERVICE_URL=http://localhost:8000
AI_SERVICE_SECRET=...

# Start
npm run dev
```
