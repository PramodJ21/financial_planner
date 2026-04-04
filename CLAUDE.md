# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

FinHealth Dashboard — a personal finance health scoring app. Users complete a 10-step financial questionnaire; the backend computes an FBS (Financial Health Score) across 9 weighted dimensions, generates action plans, and supports goal-based planning.

## Development Commands

### Backend (run from `backend/`)
```bash
npm run dev       # Start with file watching (node --watch server.js)
npm start         # Production start
npm run db:init   # Initialize/reset PostgreSQL schema
```

### Frontend (run from `frontend/`)
```bash
npm run dev       # Vite dev server (http://localhost:5173)
npm run build     # Production build → dist/
npm run lint      # ESLint
npm run preview   # Preview production build
```

### Environment
- Backend reads from `backend/.env` — requires `PORT`, `JWT_SECRET`, `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER`, `DB_PASSWORD`
- Frontend uses `VITE_API_URL` (defaults to `http://localhost:5000/api`)
- PostgreSQL must be running locally; initialize schema with `npm run db:init`

## Architecture

### Backend (`backend/`)
- **Entry**: `server.js` — Express on port 5000, mounts 4 route modules
- **Routes**: `routes/auth.js`, `routes/questionnaire.js`, `routes/dashboard.js`, `routes/goals.js`
- **DB**: PostgreSQL connection pool in `db/pool.js`; supports `DATABASE_URL` (Supabase) or local config
- **Auth**: JWT middleware in `middleware/auth.js`; token required for all non-auth routes
- **Core Logic**: `engine/calculations.js` — the FBS scoring engine

### Frontend (`frontend/src/`)
- **Entry**: `main.jsx` wraps app in `AuthContext`
- **Routing**: `App.jsx` defines all routes; protected routes use `ProtectedRoute` component
- **Auth State**: `context/AuthContext.jsx` + `useAuth()` hook; JWT stored in localStorage
- **API Client**: `api.js` — all API calls go through `fetchWithAuth()` which attaches the JWT
- **Layout**: `components/Layout.jsx` manages sidebar (collapsible, mobile-responsive) and route transitions

### FBS Calculation Engine (`backend/engine/calculations.js`)
The most complex part of the codebase. Computes scores across 9 dimensions:
- Emergency Fund, Insurance, Liability Management, Investment Regularity, Goal Clarity, Behavioral Tendencies, Portfolio Understanding, Tax Literacy, Asset Diversity

Dimension weights are dynamically adjusted by **life stage** (Early Career → Pre-Retirement). The engine also generates action plan recommendations with impact scores, and handles goal projections with inflation and asset allocation modeling.

### Database Schema (4 tables)
- `users` — accounts
- `financial_profiles` — 130+ column table storing all 10 questionnaire steps; loans/credit cards stored as JSONB
- `action_plans` — recommended action items per user, with status tracking
- `user_goals` — financial goals with custom asset allocations (equity/debt/commodity %) and expected returns

### Questionnaire (`frontend/src/pages/Questionnaire.jsx`)
10-step multi-part form. Each step maps to a `PUT /api/questionnaire/step/:n` endpoint. The backend route `routes/questionnaire.js` handles field normalization and upserts into `financial_profiles`.

### Dashboard (`frontend/src/pages/Dashboard.jsx`)
Fetches from `GET /api/dashboard/full` which runs the full FBS calculation. Contains multiple sub-sections (investments, liabilities, insurance, tax, estate) that are also accessible as standalone pages. Uses Recharts for all visualizations.

## Key Conventions
- All monetary values in the database are stored in INR (Indian Rupees)
- Financial calculations documented in `fbs_calculation.md` at repo root
- Migration scripts in `backend/db/migrate_*.js` — run manually when schema changes are needed
- No test suite exists currently
