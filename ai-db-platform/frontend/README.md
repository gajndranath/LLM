# ATLAS Frontend 🎨

**The high-fidelity visual engine for database introspection.**

This is a premium React application built with a focus on "Rich Aesthetics" and seamless AI interaction.

---

## 🏗 Component & Feature Flow

### 1. SQL Copilot Flow
- **Interaction**: User types "Show me sales growth."
- **State**: `QueryPage.tsx` manages `naturalQuery` and `generatedSql`.
- **Integration**: Calls `POST /api/query/generate`.
- **Result**: Renders `ChartRenderer` (Recharts) if a chart is suggested, or `MermaidChart` if the user switches to the Diagrams tab.

### 2. Architect Studio Flow
- **Interaction**: User starts a "Builder" session.
- **State**: `DesignStudioChat` manages the conversation transcript.
- **Logic**: ATLAS probes for requirements. When ready, `generateMutation` triggers schema blueprinting.
- **Visualization**: `BlueprintPanel` displays the resulting ERD and SQL scripts.

---

## 📡 Frontend-to-Backend Integration

All API calls are centralized in `/src/api/axiosInstance.ts` with the following patterns:
- **Base URL**: Managed via `VITE_API_URL` (Default: `http://localhost:3001/api`).
- **Auth**: JWT is stored in `localStorage` and managed by the `authStore` (Zustand). It is automatically attached to headers via an Axios interceptor.
- **Real-time**: Socket.IO (implied/planned) for long-running AI audits.

---

## 🎨 Visual Architecture
- **Diagrams**: AI-generated Mermaid syntax is passed to `<MermaidChart />`. This component handles asynchronous rendering and SVG injection.
- **Charts**: Data from the backend is mapped to `xAxis` and `yAxis` props for `<ChartRenderer />`.
- **SQL Editor**: Monaco Editor provides a professional coding environment with PostgreSQL syntax highlighting.

---

## 🚀 Key Directories
- `/src/pages`: Core views (Dashboard, Query, Connections, Architect).
- `/src/components`: UI primitives (Glass panels, Modals) and specialized renderers.
- `/src/store`: Global state for Auth and App settings.

---

## 🛠 Setup

```bash
# Install
npm install

# .env
VITE_API_URL=http://localhost:3001/api

# Run
npm run dev
```
