# Portfolio Backtester — Implementation Plan

## Context

The FinHealth Dashboard needs a Portfolio Backtester feature added to the "Explore" section of the sidebar. Users will be able to create portfolios with named holdings, simulate historical performance with configurable rebalancing strategies, and view results in Simple or Advanced mode.

This plan is adapted from `portfolio_plan.md` to fit the existing tech stack (React 19, React Router DOM v7, Recharts, plain PostgreSQL) and split into independently deployable phases. Each phase ends in a fully working state that can be tested before the next phase begins.

**Existing patterns to follow:**
- Backend routes in `backend/routes/` — mounted in `server.js`
- Frontend pages in `frontend/src/pages/`
- Sidebar `EXPLORE_ITEMS` array in `frontend/src/components/Layout.jsx`
- All monetary values in INR
- JWT auth via `middleware/auth.js` on all protected routes

---

## Phase 1 — Portfolio CRUD + Creation Form

**Goal:** User can create a portfolio, add holdings, organise them into groups, and see a static allocation breakdown. No backtest yet.

### Backend

1. **Schema additions** (`schema.sql` + migration file `backend/db/migrate_portfolio_phase1.js`):
   - `instruments` table — ticker, name, type (enum), exchange, isin, is_active, inception_date
   - `portfolios` table — id (UUID), user_id, name, principal (NUMERIC 15,2), notes, timestamps
   - `portfolio_groups` table — id, portfolio_id, parent_group_id (self-ref), name, depth (1–3), display_order, color
   - `holdings` table — id, portfolio_id, group_id (nullable), instrument_id, allocation_pct (NUMERIC 6,3), display_order, timestamps

2. **Instrument seed script** (`backend/db/seed_instruments.js`):
   - Seed top 200 AMFI mutual fund names with tickers, type = 'mutual_fund'
   - Seed Nifty 50 index as a single 'index' instrument
   - Hard-code from AMFI public data — no network calls in Phase 1

3. **New routes file** `backend/routes/portfolio.js`:
   - `GET  /portfolios` — list user's portfolios
   - `POST /portfolios` — create
   - `GET  /portfolios/:id` — get with holdings + groups
   - `PUT  /portfolios/:id` — update name/principal/notes
   - `DELETE /portfolios/:id` — delete (cascade)
   - `POST /portfolios/:id/groups` — create group (validate depth ≤ 3)
   - `PUT  /portfolios/:id/groups/:gid` — rename/reorder/recolor
   - `DELETE /portfolios/:id/groups/:gid` — delete group (un-assign holdings, don't delete them)
   - `POST /portfolios/:id/holdings` — add holding (validate sum ≤ 100%)
   - `PUT  /portfolios/:id/holdings/:hid` — update allocation/group
   - `DELETE /portfolios/:id/holdings/:hid` — soft-delete (set archived = true)
   - `GET  /instruments/search?q=&type=` — autocomplete, max 20 results

4. Mount `/api/portfolio` and `/api/instruments` in `server.js`

### Frontend

5. **Install Zustand** for portfolio UI state (`npm install zustand` in `frontend/`)

6. **New page** `frontend/src/pages/Portfolio.jsx`:
   - Empty state (no portfolios) → shows "Create your first portfolio" call-to-action
   - Populated state → `PortfolioWorkspace` with `HoldingsExplorer` (left 290px) + `ResultsPanel` (right)

7. **Creation form** `frontend/src/pages/PortfolioNew.jsx` — 3-step full-viewport form:
   - Step 1: Name, Principal, Notes (with live preview card)
   - Step 2: Group Manager + Holdings List (instrument autocomplete, allocation input with % / ₹ toggle, running allocation bar)
   - Step 3: Placeholder — "Backtest options coming soon" — just a "Save Portfolio" button

8. **Portfolio store** `frontend/src/store/portfolioStore.js` (Zustand):
   - portfolios[], activePortfolioId, focusedNode, expandedGroups, viewMode

9. **Sidebar addition** in `frontend/src/components/Layout.jsx`:
   - Add `{ name: 'Portfolio', path: '/portfolio' }` to `EXPLORE_ITEMS`

10. **Routes addition** in `frontend/src/App.jsx`:
    - `/portfolio` → `<Portfolio />`
    - `/portfolio/new` → `<PortfolioNew />`

11. **Results placeholder**: static allocation pie chart (Recharts `PieChart`) shown in ResultsPanel until a backtest runs

**Definition of done:** User can create a portfolio, add/remove holdings, manage groups (3 levels), see allocation pie chart. Data persists across sessions.

---

## Phase 2 — Backtest Engine (Buy & Hold Only)

**Goal:** User can run a buy-and-hold backtest on a mutual-fund portfolio and see Simple + Advanced results.

### Backend

1. **Schema additions** (`migrate_portfolio_phase2.js`):
   - `price_history` table — instrument_id, date, close, adjusted_close, nav, volume (PostgreSQL; no TimescaleDB yet)
   - `backtest_configs` table — id, portfolio_id, name, from_date, to_date, benchmark_id, reinvest_dividends (bool), rebalance_strategy (default 'none'), transaction_cost_pct, created_at
   - `backtest_runs` table — id, config_id, status (enum: queued/running/completed/failed), started_at, completed_at, error_message, result_summary (JSONB)
   - `backtest_snapshots` table — run_id, holding_id, date, value, units, price, was_rebalanced, dividend_received

2. **AMFI data fetcher** `backend/market_data/amfi_fetcher.js`:
   - Fetch last 10 years of NAV for all mutual fund instruments via AMFI public API
   - Upsert into `price_history`
   - Run once manually: `node backend/market_data/amfi_fetcher.js`

3. **On-demand price fetcher** `backend/market_data/on_demand_fetcher.js` *(added post-Phase 2)*:
   - Called automatically by the backtest engine — no manual script needed
   - `ensureData(pool, instrument, requestedFrom, requestedTo)` checks coverage in `price_history` and fetches only what is missing
   - Three triggers: no data at all → full history fetch; requested range starts before stored data → fetch from 10 yrs back; stale end (last stored date < requested end) → incremental fetch from last stored date to today
   - Routes by type: `mutual_fund` / `gold` → mfapi.in (full history, idempotent upsert); `equity` / `etf` / `index` → Yahoo Finance v8 (windowed fetch)
   - Failures are non-fatal — backtest logs a warning and proceeds with whatever data exists, only hard-erroring if zero rows remain after the attempt
   - Adding a new ticker to `instruments` requires no manual data download — the first backtest run triggers the fetch automatically

4. **Backtest engine** `backend/engine/backtest.js`:
   - `runBacktest(portfolio, config, priceData)` — Phase 2 implements `rebalance_strategy = 'none'` only
   - Before querying `price_history`, checks coverage for every market instrument and calls `ensureData()` for any that are missing or stale; re-queries coverage after fetching
   - Walk-forward loop: update values daily, store snapshots
   - After loop: compute all Simple + Advanced metrics (CAGR, Sharpe, Max Drawdown, Volatility, Beta, Alpha, VaR, Sortino, Calmar, rolling 1Y returns)
   - Store group-level aggregated time-series in `result_summary` JSONB

4. **BullMQ job queue** `backend/queue/`:
   - Install: `npm install bullmq ioredis` in `backend/`
   - `backtestQueue.js` — queue definition
   - `backtestWorker.js` — worker that runs `backtest.js`, updates run status, emits WebSocket progress
   - Requires Redis running locally (add `REDIS_URL` to `.env`)

5. **WebSocket** in `server.js`:
   - Use `ws` package (`npm install ws`)
   - Channel: `ws://host/ws/backtests/:runId/progress`
   - Worker emits `{ percent, message }` messages during job

6. **Backtest routes** added to `backend/routes/portfolio.js`:
   - `POST /portfolios/:id/backtest` — create config + queue run → returns `{ run_id, status: 'queued' }`
   - `GET  /backtests/:runId/status` — poll status
   - `GET  /backtests/:runId/results` — full results (once completed)

### Frontend

7. **Step 3 of creation form** — now functional:
   - Date range pickers (quick presets: 1Y, 3Y, 5Y, 10Y)
   - Benchmark toggle with selector (Nifty 50, Sensex, FD 7.5%)
   - "Run Backtest →" button
   - Rebalancing section shows "No Rebalancing" only (others coming Phase 3)

8. **Progress overlay** — WebSocket-connected progress bar shown while backtest runs

9. **Simple View** in `ResultsPanel`:
   - 4 summary cards (corpus → final value, CAGR, worst year, vs benchmark)
   - Growth line chart (Recharts LineChart, benchmark as dashed overlay, rebalance dots)
   - Year-by-year bar chart (green/muted-blue bars)

10. **Advanced View** in `ResultsPanel`:
    - Metrics grid (6 cards: CAGR, Sharpe, Max Drawdown, Volatility, Alpha, Beta)
    - Holdings table (sortable columns: Name, Allocation %, Total Return %, CAGR, Sharpe, Max DD)
    - View toggle (Simple / Advanced) in top bar

11. **Zustand store** — add backtest state: activeRunId, runStatus, runProgress

**Definition of done:** User runs a buy-and-hold backtest, sees WebSocket progress, then full Simple + Advanced results. Benchmark comparison works.

---

## Phase 3 — Rebalancing Strategies

**Goal:** All 6 rebalancing strategies, transaction costs, dividend reinvestment, and comparison mode.

### Backend

1. **Extend backtest engine** `backend/engine/backtest.js`:
   - Implement all strategies: monthly, quarterly, annually, threshold, threshold+calendar hybrid, custom dates
   - Transaction cost deduction on each rebalance event
   - Dividend reinvestment logic (buy more units at today's price)
   - Compute rebalancing cost summary: count, total INR cost, hypothetical value without costs

2. Backtest config schema already supports all strategies from Phase 2 — no DB changes needed

### Frontend

3. **Step 3 of creation form** — now shows all rebalancing strategy cards:
   - No Rebalancing / Monthly / Quarterly / Annually / Threshold / Custom
   - Conditional inputs: threshold % input, rebalance day input, custom dates picker
   - Advanced Options collapsible: dividend toggle, transaction cost input

4. **Rebalancing Log** (Advanced View):
   - Table of every rebalance event: date, trigger, holdings traded, amounts, cost
   - Paginated (20 rows/page)

5. **Comparison mode**:
   - Portfolio can have multiple saved backtest configs
   - Dropdown in ResultsPanel header to switch between runs
   - Side-by-side comparison of 2 runs (same time axis, two growth lines)

6. **Rebalancing impact callout** (Simple View):
   - "Your X rebalancing events cost ₹Y. Without rebalancing: ₹Z vs ₹W."

**Definition of done:** User compares "no rebalance" vs "quarterly rebalance" on the same portfolio side by side.

---

## Phase 4 — Equity + ETF + Index Data

**Goal:** Portfolios can include NSE stocks, ETFs, and indices alongside mutual funds.

### Backend

1. **Expand instruments table** — add NSE-listed stocks and ETFs via a seed script
   - Use a public NSE EOD data source or NSEPy for development
   - Handle adjusted_close for corporate actions (splits, bonuses)

2. **Equity data fetcher** `backend/market_data/equity_fetcher.js`:
   - Separate from AMFI fetcher
   - Handles split/bonus adjustments via adjusted_close field

3. **Backtest engine** — extend to handle `fixed_return` instrument type:
   - Simulate as `daily_return = (1 + annual_rate) ^ (1/252) - 1` (no price_history needed)
   - Used for FD instruments and manual free-text holdings

4. **PostgreSQL performance** — add index on `price_history(instrument_id, date DESC)`

### Frontend

5. **Instrument search** — now returns stocks and ETFs in addition to mutual funds
   - Type chip on each result (MF / Stock / ETF / Index)
   - Show exchange (NSE/BSE) in search results

6. **Manual entry** — if user types a name with no match in autocomplete, allow saving as `instrument_type = 'fixed_return'`, prompt for expected annual return %

**Definition of done:** User builds a portfolio with a mix of mutual funds and direct stocks and runs a backtest.

---

## Phase 5 — Group Focus View + Contribution Analysis

**Goal:** Clicking a group or holding in the explorer updates the results panel to show that node's performance in context.

### Backend

1. **Results endpoints**:
   - `GET /backtests/:runId/results/group/:groupId` — aggregate snapshots for all holdings in group
   - `GET /backtests/:runId/results/holding/:holdingId` — single holding snapshots + metrics

2. Group-level metrics pre-computed during backtest run and stored in `result_summary` JSONB for fast retrieval

### Frontend

3. **HoldingsExplorer** — click group/holding → sets `focusedNode` in Zustand store
4. **ResultsPanel** — subscribes to `focusedNode`, fetches appropriate results endpoint, shows breadcrumb (`Portfolio > Car Fund > HDFC Mid-Cap`)
5. **Contribution section** (Simple View) — horizontal stacked bar "Who did the heavy lifting?"
6. **Group-level metrics** (Advanced View) — same metrics grid as portfolio level but for the focused group
7. **Correlation matrix** — heatmap (Recharts or custom SVG), shown when ≥ 3 holdings; color: green (+1) → white (0) → red (−1)
8. **Rolling returns chart** — line chart showing 1Y rolling return at every point
9. **Drag-and-drop** — holdings re-orderable within explorer using HTML5 drag-and-drop (no extra library)
10. **React.memo** on `GroupNode` and `HoldingNode` to prevent full-tree re-renders on focus change

**Definition of done:** User clicks "Car Fund" and sees only that group's performance, contribution %, and correlation with the rest.

---

## Phase 6 — Algo Suggestion

**Goal:** Rule-based algorithm suggests a portfolio allocation based on the user's questionnaire data.

### Backend

1. **Suggestion engine** `backend/engine/portfolioSuggestion.js`:
   - Reads user's `financial_profiles` row
   - Rules:
     - risk tolerance score → equity/debt split
     - investment horizon → short-term → more debt; long-term → more equity
     - corpus < ₹50K → index funds + liquid funds only
     - if no emergency fund → first suggestion is a liquid fund at 10% allocation
   - Returns `[{ instrument_id, name, allocation_pct, rationale }]`

2. **Suggestion route**: `GET /portfolios/suggest` — returns suggestions array

### Frontend

3. **"Suggest Portfolio" button** in `PortfolioWorkspace` header
4. **Suggestion modal** — shows each suggestion with rationale and allocation %; "Apply this portfolio" replaces current holdings; "Keep mine" dismisses
5. **Apply suggestion** — calls bulk replace holdings endpoint; triggers re-fetch of portfolio data

**Definition of done:** User clicks "Suggest Portfolio", sees personalised suggestions with reasons, applies them in one click.

---

## Critical Files to Create / Modify

| File | Action |
|---|---|
| `schema.sql` | Add all new tables |
| `backend/db/migrate_portfolio_phase1.js` | Phase 1 migration (instruments, portfolios, portfolio_groups, holdings) |
| `backend/db/migrate_portfolio_phase2.js` | Phase 2 migration (price_history, backtest_configs, backtest_runs, backtest_snapshots) |
| `backend/db/seed_instruments.js` | Seed top 200 mutual fund + Nifty 50 |
| `backend/routes/portfolio.js` | All portfolio + backtest + instrument routes |
| `backend/engine/backtest.js` | Walk-forward engine + metric computation |
| `backend/engine/portfolioSuggestion.js` | Rule-based suggestion engine (Phase 6) |
| `backend/market_data/amfi_fetcher.js` | AMFI NAV data pipeline |
| `backend/market_data/equity_fetcher.js` | Equity EOD data pipeline (Phase 4) |
| `backend/queue/backtestQueue.js` | BullMQ queue definition (Phase 2) |
| `backend/queue/backtestWorker.js` | BullMQ worker (Phase 2) |
| `backend/server.js` | Mount new routes + WebSocket setup |
| `frontend/src/App.jsx` | Add `/portfolio` and `/portfolio/new` routes |
| `frontend/src/components/Layout.jsx` | Add "Portfolio" to EXPLORE_ITEMS |
| `frontend/src/pages/Portfolio.jsx` | Main portfolio workspace page |
| `frontend/src/pages/PortfolioNew.jsx` | 3-step creation form |
| `frontend/src/store/portfolioStore.js` | Zustand store |

## New Dependencies

**Backend:** `bullmq`, `ioredis`, `ws` (Phase 2+), requires Redis  
**Frontend:** `zustand`  
(Recharts already installed. Plain fetch + Zustand is sufficient — no React Query needed.)

## Verification Per Phase

- **Phase 1**: Create portfolio → add holdings + groups → reload page → data persists → allocation pie visible
- **Phase 2**: Run backtest → see WebSocket progress → results appear → toggle Simple/Advanced → benchmark line on chart
- **Phase 3**: Run with "quarterly rebalance" → see rebalancing log → compare two configs side by side
- **Phase 4**: Add stock holding → run backtest → stock performance included in results
- **Phase 5**: Click group in explorer → results panel updates to that group → contribution bar visible
- **Phase 6**: Click "Suggest Portfolio" → modal shows suggestions with rationale → apply replaces holdings
