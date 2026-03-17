# FinHealth - CLAUDE.md

---

## Project Overview

**FinHealth** is a personal finance dashboard built for Indian users. The core idea is simple: a user fills out a 10-step questionnaire covering their income, expenses, assets, investments, liabilities, insurance, tax, estate planning, and financial behaviour — and the app turns that into a computed **Financial Behaviour Score (FBS)** out of 100 plus a prioritised action plan to improve it.

### What it does
- **Questionnaire (10 steps):** Collects the full financial picture — income sources, monthly and annual expenses, savings, investment holdings, loans, insurance cover, tax deductions, will/nominees, and behavioural tendencies (e.g. impulsive spending, loss aversion).
- **FBS (Financial Behaviour Score):** A 0–100 composite score computed server-side from the questionnaire data. It has three tiers — Foundation (emergency fund, insurance, debt management), Behaviour (investment regularity, goal clarity, behavioural tendencies), and Awareness (portfolio understanding, tax literacy, asset diversity). Two penalties apply at the end: a standalone revolving CC penalty (up to −10) and a combination fragility penalty (up to −15) for critical gaps.
- **Action Plan:** Auto-generated list of ranked actions (e.g. "Build Emergency Fund", "Get Life Insurance") each carrying an `fbsImpact` — completing them raises the FBS. Users mark items done on the Reports page.
- **Dashboard (Overview page):** The main page. Shows a financial narrative, key KPIs (net worth, surplus, credit score), what-to-do-now cards, FBS score with benchmark, MoneySign personality type, 3-month cashflow projection, and mini panels for assets, liabilities, and insurance.
- **Detailed pages:** Investments (asset allocation analysis), Liabilities, Insurance, Tax, Estate Planning, Goal Planner (SIP calculator for specific goals), Reports (action plan download).

### Key design decisions
- All financial calculations happen **server-side** in `backend/engine/calculations.js`. No financial logic in routes or frontend.
- The FBS and action plan are **recomputed fresh on every `/dashboard/full` call** — there is no caching of computed values.
- The app is **India-specific**: INR only, Indian tax regimes (Old vs New), EPF/PPF/NPS, 80C/80D deductions, CIBIL credit scores, Indian insurance benchmarks.
- The questionnaire saves **each step independently** — users can fill it gradually and the dashboard works with partial data.
- MoneySign is a **financial personality archetype** (e.g. Bold Eagle, Cautious Turtle) derived from the behavioural questions. It drives narrative personalisation.

### Current state
Fully functional single-user dashboard. Backend on Node/Express with PostgreSQL (Supabase). Frontend on React 19 + Vite. Auth via JWT. The FBS scoring logic is documented and under active review in `fbs.md`.

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 19, React Router DOM 7, Vite 7 |
| Charts | Recharts 3 |
| Forms | React Hook Form 7 |
| Icons | Lucide React |
| Exports | jsPDF + jsPDF-AutoTable, XLSX |
| Backend | Node.js + Express 4 |
| Auth | JWT (jsonwebtoken) + bcryptjs |
| Database | PostgreSQL (pg driver), deployed on Supabase |

---

## Folder Structure

```
spinning-space/
├── backend/
│   ├── db/
│   │   ├── pool.js              # PostgreSQL connection pool (supports DATABASE_URL or individual vars)
│   │   ├── init.js              # DB initialization
│   │   └── migrate_*.js         # One-off migration scripts
│   ├── engine/
│   │   └── calculations.js      # All financial computation logic
│   ├── middleware/
│   │   └── auth.js              # JWT verification middleware
│   ├── routes/
│   │   ├── auth.js              # POST /auth/register, POST /auth/login, GET /auth/me
│   │   ├── questionnaire.js     # GET + PUT /questionnaire/step/:step (steps 1-10)
│   │   ├── dashboard.js         # GET /dashboard/full, PUT /dashboard/action-plan/status
│   │   └── goals.js             # GET + POST /goals (bulk replace)
│   └── server.js                # Express entry point, CORS, route mounting
├── frontend/
│   ├── src/
│   │   ├── pages/               # One file per route (PascalCase .jsx)
│   │   │   ├── Welcome.jsx
│   │   │   ├── Login.jsx / Register.jsx
│   │   │   ├── Questionnaire.jsx  # 10-step wizard
│   │   │   ├── Dashboard.jsx      # Main FBS dashboard
│   │   │   ├── Investments.jsx / Liabilities.jsx / Insurance.jsx
│   │   │   ├── Tax.jsx / Estate.jsx
│   │   │   ├── Reports.jsx        # Action plan download
│   │   │   └── GoalPlanner.jsx
│   │   ├── components/
│   │   │   ├── Layout.jsx         # Wraps all protected pages (sidebar + header)
│   │   │   ├── Sidebar.jsx
│   │   │   ├── Header.jsx
│   │   │   └── AuthPreviewCard.jsx
│   │   ├── context/
│   │   │   └── AuthContext.jsx    # Auth state + localStorage token
│   │   ├── utils/
│   │   │   ├── goalCalculations.js
│   │   │   ├── budgetStrategies.js
│   │   │   └── financialInsights.js
│   │   ├── api.js                 # fetchWithAuth() + API base URL
│   │   ├── App.jsx                # Routes + ProtectedRoute wrapper
│   │   └── main.jsx
│   └── vite.config.js
├── schema.sql                     # Full DB schema (run in Supabase SQL Editor)
├── calculation.md                 # Financial calculation docs
├── test_profiles.md               # Test user profiles
└── todo.txt                       # Dev task list
```

---

## Common Commands

```bash
# Backend
cd backend
npm run dev          # Node --watch (auto-restart)
npm start            # Production
npm run db:init      # Initialize DB tables

# Frontend
cd frontend
npm run dev          # Vite dev server
npm run build        # Production build
npm run lint         # ESLint
npm run preview      # Preview production build
```

---

## Environment Variables

**backend/.env**
```
PORT=5000
JWT_SECRET=...
DB_HOST=localhost
DB_PORT=5432
DB_NAME=fin_planner
DB_USER=postgres
DB_PASSWORD=...
DATABASE_URL=...   # Supabase connection string (overrides individual vars)
```

**frontend** — set `VITE_API_URL` to override default `http://localhost:5000/api`

---

## API Reference

Base: `http://localhost:5000/api`
Auth header: `Authorization: Bearer <token>` (30-day JWT, stored in localStorage)

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | /auth/register | No | Register; auto-creates empty financial_profile |
| POST | /auth/login | No | Returns token + user |
| GET | /auth/me | Yes | Current user info |
| GET | /questionnaire | Yes | Full profile (all steps) |
| PUT | /questionnaire/step/:step | Yes | Save step 1–10 fields |
| GET | /dashboard/full | Yes | Computed metrics + FBS + action plan |
| PUT | /dashboard/action-plan/status | Yes | Toggle action plan item, returns updated FBS |
| GET | /goals | Yes | All user goals |
| POST | /goals | Yes | Bulk-replace goals (transaction) |
| GET | /api/health | No | Health check |

Errors: `{ error: "message" }` with standard HTTP codes.

---

## Database Schema Overview

### `users`
`id`, `full_name`, `email` (UNIQUE), `password_hash`, `phone`, timestamps

### `financial_profiles` (one row per user, all questionnaire data)
Columns grouped by questionnaire step:
- **Step 1 – Profile:** `date_of_birth`, `city`, `marital_status`, `dependents`, `employment_type`, `risk_comfort`, `investment_experience`
- **Gen. Wealth:** `gen_q1`–`gen_q10` (1–5 scale), `gen_q6_selections` (JSONB array)
- **Step 2 – Income:** `monthly_take_home`, `annual_salary`, `business_income`, `annual_bonus`, `other_income`, `expected_income_growth`
- **Step 3 – Expenses (monthly):** `expense_household`, `expense_rent`, `expense_utilities`, `expense_transport`, `expense_food`, `expense_subscriptions`, `expense_insurance`, `expense_discretionary`
- **Step 3 – Expenses (annual):** `expense_annual_insurance/education/property/travel/other`
- **Step 4 – Assets:** `savings_balance`, `fd_balance`, `fd_rate`, `emergency_fund`, `monthly_surplus`
- **Step 5 – Investments:** `inv_direct_stocks`, `inv_equity_mf`, `inv_monthly_sip`, `inv_epf_ppf_nps`, `inv_debt_funds`, `inv_gold_commodities`, `inv_real_estate`, `inv_crypto_alt`, `inv_num_mutual_funds`, `sip_consecutive_months`
- **Step 6 – Liabilities:** `loans` (JSONB array of loan objects), `credit_cards` (JSONB array of card objects: `{name, balance, type, emi_amount}`), `credit_score`
- **Step 7 – Insurance:** `health_cover`, `health_premium`, `life_cover`, `life_premium`
- **Step 8 – Tax:** `tax_regime`, `tax_80c_used`, `tax_nps_80ccd`, `tax_hra`, `tax_home_loan_interest`, `tax_80d`
- **Step 9 – Estate:** `has_will`, `nominees_set`, `num_nominees`
- **Step 10 – Behavior (1–5 scale):** `beh_delay_decisions`, `beh_prefer_guaranteed`, `beh_follow_market_news`, `beh_spend_impulsively`, `beh_review_monthly`, `beh_avoid_debt`, `beh_hold_losing`, `beh_anxious_decisions`, `beh_familiar_brands`, `beh_compare_peers`, `beh_market_reaction`, `beh_windfall_behaviour`, `beh_product_understanding`
- **Progress:** `current_step`, `is_completed`

### `action_plans`
`id`, `user_id`, `category`, `title`, `description`, `suggested_amount`, `allocation_percent`, `status` (pending/completed)

### `user_goals`
`id`, `user_id`, `client_id`, `name`, `target`, `years`, `risk_level`, `include_inflation`, `equity_alloc`, `debt_alloc`, `commodity_alloc`, `equity_return`, `debt_return`, `commodity_return`, `priority_weight`

---

## Naming Conventions

**Files:**
- React components/pages: `PascalCase.jsx`
- Utilities, context: `camelCase.js`

**JS:**
- Functions & variables: `camelCase`
- Constants: `SCREAMING_SNAKE_CASE` (e.g. `INFLATION_RATE`, `ASSET_RETURNS`)
- Short aliases common: `fmt()` (format currency), `fmtFull()` (full format)

**DB columns:**
- `snake_case` throughout
- Grouped with prefixes: `expense_*`, `inv_*`, `gen_q*`, `beh_*`, `tax_*`
- JSONB used for variable-length arrays: `loans`, `credit_cards`, `gen_q6_selections`

**CSS classes:**
- `kebab-case` semantic names (`.page-content`, `.nav-item`, `.status-pill`)
- Questionnaire prefix: `.qn-*`
- State classes: `.active`, `.done`, `.mobile-open`

**Color palette:**
- Dark brown: `#1C1A17`
- Teal/green: `#4A7C59`
- Orange: `#C4703A`
- Navy: `#0D1B2A`

---

## Key Patterns

### Calculation Engine (`backend/engine/calculations.js`)
All financial logic lives here. Never compute finances in routes — call engine functions.

- **Life stages** by age: Foundation (<25), Building (25–35), Accumulation (35–50), Pre-Retirement (50–60), Retirement (60+)
- **FBS (Financial Behavior Score):** 0–100 composite score. Completing action plan items adds bonus (capped at 100).
- Action plan items carry `fbsImpact` — toggling status recalculates FBS immediately.

### Frontend Data Flow
1. `useEffect` on mount → `fetchWithAuth()` → store in `useState`
2. Form edits update local state
3. Save triggers PUT to backend
4. Dashboard reads `/dashboard/full` which runs calculation engine server-side

### Auth Flow
- `AuthContext` holds user + token
- Token saved to `localStorage` on login
- `fetchWithAuth()` in `api.js` auto-attaches `Authorization` header
- `ProtectedRoute` in `App.jsx` redirects unauthenticated users to `/login`

### Goal Planner
- Goals stored in `user_goals` table
- POST /goals does a full bulk-replace (DELETE old + INSERT new in a transaction)
- Allocation strategy computed in `frontend/src/utils/goalCalculations.js` based on years + risk level
- Blended return = weighted avg of equity/debt/commodity returns

### Questionnaire
- 10 steps, saved individually via PUT `/questionnaire/step/:step`
- Each step saves only the fields relevant to that step
- `current_step` and `is_completed` track progress

---

## Important Files & Their Roles

| File | Role |
|------|------|
| `backend/engine/calculations.js` | **All** financial logic — FBS scoring, income, expenses, liabilities, insurance, tax, cashflow, action plan generation. Never compute finances anywhere else. |
| `backend/routes/questionnaire.js` | Saves each questionnaire step. `STEP_COLUMNS` maps each step to its DB columns. JSONB fields (`loans`, `credit_cards`, `gen_q6_selections`) are stringified here. |
| `backend/routes/dashboard.js` | Calls the calculation engine and returns the full dashboard payload: FBS, breakdown, action plan, cashflow, net worth, MoneySign. |
| `backend/routes/goals.js` | Bulk-replaces user goals in a transaction. |
| `backend/routes/auth.js` | Register/login/me. JWT issued here; `fullName` (camelCase) is the register field name. |
| `backend/db/pool.js` | PostgreSQL connection pool. Uses `DATABASE_URL` (Supabase SSL) or individual env vars. |
| `backend/db/init.js` | `initSQL` CREATE TABLE statements — run via `npm run db:init` for fresh installs. |
| `frontend/src/pages/Questionnaire.jsx` | 10-step wizard. Each step component manages its own state helpers; saved via `PUT /questionnaire/step/:n`. `credit_cards` and `loans` use add/remove/update array helpers. |
| `frontend/src/pages/Dashboard.jsx` | Main overview page — reads `/dashboard/full`, displays FBS, MoneySign, cashflow, KPIs, action cards. |
| `frontend/src/pages/Investments.jsx` | Asset allocation analysis derived from dashboard data. |
| `frontend/src/pages/GoalPlanner.jsx` | SIP calculator. Goals saved via `POST /goals` (bulk-replace). |
| `frontend/src/pages/Reports.jsx` | Action plan tracker — toggle item status, download PDF/XLSX. |
| `frontend/src/api.js` | `fetchWithAuth(path, options)` — attaches JWT and resolves against `VITE_API_URL`. |
| `frontend/src/context/AuthContext.jsx` | Auth state, token in localStorage, login/logout helpers. |
| `frontend/src/utils/goalCalculations.js` | Allocation strategy and blended return computation for Goal Planner. |
| `frontend/src/utils/financialInsights.js` | Narrative/interpretive utilities for Dashboard, Investments, and Liabilities — ideal asset allocation ranges, insight generation, inflation constant. |
| `schema.sql` | **Source of truth** for the live DB schema. Always kept in sync with code. Run in Supabase SQL Editor for fresh setup. |
| `calculation.md` | Documents every formula in `calculations.js`. Update whenever engine logic changes. |
| `fbs.md` | Documents FBS scoring design, tier weights, fragility penalty logic, and known issues. |

---

## Keeping Docs in Sync

### `calculation.md`
**Update this file whenever any calculation logic in `backend/engine/calculations.js` changes.**
- If a formula is modified, update the corresponding formula/description in `calculation.md`
- If a new metric or function is added, add a section for it
- If a metric is removed or renamed, delete or rename its section accordingly
- Do not leave stale entries — remove documentation for anything that no longer exists in the engine

### `schema.sql`
**Update this file whenever the database schema changes.**
- If a column is added to any table, add it to the corresponding `CREATE TABLE` or `ALTER TABLE` block in `schema.sql`
- If a column is removed or renamed, remove/rename it in `schema.sql` — do not leave ghost columns
- If a new table is created, add the full `CREATE TABLE` statement
- If a table is dropped, remove it entirely
- `schema.sql` should always reflect the current live schema — it is the source of truth for anyone setting up a fresh database

---

## Important Notes

- **India-specific context:** All monetary values in INR (₹). Tax logic follows Indian regime (Old vs New). Insurance benchmarks, EPF/PPF/NPS, 80C/80D deductions are India-specific.
- **Supabase deployment:** `pool.js` uses `DATABASE_URL` with SSL if set; falls back to individual env vars for local dev.
- **CORS:** Currently set to `origin: true` (all origins allowed) — tighten for production.
- **Migration scripts:** `db/migrate_*.js` are one-off scripts, not an automated migration system. Run manually when schema changes.
