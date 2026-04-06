# FinHealth Portfolio Backtester — Implementation Plan

> **Audience:** Claude Code  
> **Purpose:** Full implementation plan for the Portfolio section of the FinHealth financial health platform. This is a production system expected to serve millions of users. Every decision in this plan is made with that scale in mind.  
> **Scope:** Backend architecture, data model, API contracts, frontend component tree, business logic, and phased delivery.

---

## 1. What This Feature Does (Plain English)

A user creates a portfolio by giving it a name, a starting amount of money (corpus), and listing what they would have invested in (holdings). Each holding is assigned a percentage of the corpus.

The user then picks a date range and tells the system to simulate: "If I had invested this way from date A to date B, what would have happened?" This is called backtesting.

The twist that makes this different from a standard portfolio tracker is **rebalancing simulation**. Most real investors rebalance periodically — they sell some of what has grown too large and buy more of what has shrunk, to maintain their target allocation. This system lets the user test different rebalancing strategies against the same portfolio and see how the outcome changes.

Users can organise their holdings into named groups (e.g. "Car Fund", "Retirement") up to 3 levels deep. All output — charts, metrics, tables — updates based on what the user is currently focused on: the whole portfolio, a group, or a single holding.

Results are shown in two modes: Simple (plain language, basic numbers, for non-finance users) and Advanced (Sharpe ratio, max drawdown, beta, correlation, etc. for finance-savvy users).

---

## 2. High-Level Architecture

```
Browser (React SPA)
    │
    ├── Portfolio UI (creation form, explorer, results)
    │
    └── API Layer (REST + WebSocket for live backtest progress)
         │
         ├── Portfolio Service        — CRUD for portfolios, holdings, groups
         ├── Backtest Engine          — simulation, rebalancing logic, metric computation
         ├── Market Data Service      — historical price/NAV fetching and caching
         └── User Context Service    — reads questionnaire data for algo suggestions
              │
              └── Databases
                   ├── PostgreSQL     — all user data (portfolios, holdings, groups)
                   ├── Redis          — caching market data, session state, job queues
                   └── TimescaleDB    — time-series price data (or ClickHouse)
```

### Why this architecture at scale

- The backtest engine is **compute-heavy** — it must run as a background job, not a synchronous API call. A user with 20 holdings backtested over 10 years across 2600 trading days generates a lot of computation. Use a job queue (BullMQ or similar) and stream progress to the frontend over WebSocket.
- Market data is read-heavy and identical across users — **cache aggressively** in Redis with a TTL matching the data freshness (daily for NAV, intraday for stocks).
- Time-series price data has a completely different access pattern from user data — it is always queried by ticker + date range, never by user. TimescaleDB or ClickHouse handles this far better than PostgreSQL.
- Portfolio and holdings data is per-user, relational, and needs ACID compliance — PostgreSQL is correct here.

---

## 3. Data Model

### 3.1 portfolios

```
id                UUID, primary key
user_id           UUID, foreign key → users
name              VARCHAR(120), not null
principal         NUMERIC(15,2), not null          — the corpus in INR
notes             TEXT, nullable
created_at        TIMESTAMPTZ
updated_at        TIMESTAMPTZ
```

### 3.2 portfolio_groups

Groups can nest up to 3 levels. The parent_group_id is null for top-level groups.

```
id                UUID, primary key
portfolio_id      UUID, foreign key → portfolios
parent_group_id   UUID, nullable, foreign key → portfolio_groups (self-referential)
name              VARCHAR(80), not null
depth             SMALLINT, not null, check (depth between 1 and 3)
display_order     SMALLINT
color             VARCHAR(7)                        — hex color for UI rendering
created_at        TIMESTAMPTZ
```

Constraint: when inserting a group, enforce that depth = parent.depth + 1 if parent exists, else depth = 1. This is enforced at the application layer, not just the DB.

### 3.3 holdings

```
id                UUID, primary key
portfolio_id      UUID, foreign key → portfolios
group_id          UUID, nullable, foreign key → portfolio_groups
instrument_id     UUID, foreign key → instruments
allocation_pct    NUMERIC(6,3), not null            — percentage of corpus, e.g. 15.500
display_order     SMALLINT
created_at        TIMESTAMPTZ
```

Constraint: sum of allocation_pct per portfolio_id must be <= 100.000. Enforced at the application layer with a check before insert/update.

### 3.4 instruments

This table holds the master list of investable instruments. Pre-seeded from data providers.

```
id                UUID, primary key
ticker            VARCHAR(30), not null, unique
name              VARCHAR(200), not null
instrument_type   ENUM('equity', 'mutual_fund', 'etf', 'gold', 'bond', 'index', 'fixed_return')
exchange          VARCHAR(20)                       — NSE, BSE, AMFI, etc.
isin              VARCHAR(12)
is_active         BOOLEAN, default true
inception_date    DATE                              — earliest date for which data exists
last_updated      TIMESTAMPTZ
```

### 3.5 price_history

Stored in TimescaleDB. Partitioned by date automatically.

```
instrument_id     UUID, foreign key → instruments
date              DATE, not null
open              NUMERIC(12,4)
high              NUMERIC(12,4)
low               NUMERIC(12,4)
close             NUMERIC(12,4), not null
adjusted_close    NUMERIC(12,4)                    — accounts for splits, dividends
volume            BIGINT
nav               NUMERIC(12,4)                    — for mutual funds, null for equities
created_at        TIMESTAMPTZ

PRIMARY KEY (instrument_id, date)
```

Hypertable partitioned on `date`. Index on (instrument_id, date DESC) for time range queries.

### 3.6 backtest_configs

```
id                UUID, primary key
portfolio_id      UUID, foreign key → portfolios
name              VARCHAR(80)                       — e.g. "Monthly rebalance, no dividends"
from_date         DATE, not null
to_date           DATE, not null
benchmark_id      UUID, nullable, foreign key → instruments
reinvest_dividends BOOLEAN, default false
rebalance_strategy ENUM('none','monthly','quarterly','annually','threshold','custom')
rebalance_threshold NUMERIC(5,2)                   — for threshold strategy, e.g. 5.00 = 5%
rebalance_day     SMALLINT                         — day of month for periodic rebalancing
transaction_cost_pct NUMERIC(5,3), default 0.100  — brokerage/expense ratio per trade
created_at        TIMESTAMPTZ
```

### 3.7 backtest_runs

```
id                UUID, primary key
config_id         UUID, foreign key → backtest_configs
status            ENUM('queued','running','completed','failed')
started_at        TIMESTAMPTZ
completed_at      TIMESTAMPTZ
error_message     TEXT
result_summary    JSONB                             — top-level metrics stored for quick access
```

### 3.8 backtest_snapshots

One row per holding per trading day. This is the raw output of the backtest engine.

```
run_id            UUID, foreign key → backtest_runs
holding_id        UUID, foreign key → holdings
date              DATE
value             NUMERIC(15,4)                    — absolute INR value on this date
units             NUMERIC(15,6)                    — units held
price             NUMERIC(12,4)                    — price/NAV on this date
was_rebalanced    BOOLEAN                          — was a rebalance event on this date
dividend_received NUMERIC(10,4)
```

Partitioned by run_id. This table grows large — archive runs older than 90 days to cold storage or compress.

---

## 4. API Contracts

All endpoints are prefixed `/api/v1`. Authentication via JWT passed as Bearer token.

### 4.1 Portfolio CRUD

```
GET    /portfolios                          — list all portfolios for current user
POST   /portfolios                          — create portfolio
GET    /portfolios/:id                      — get portfolio with holdings and groups
PUT    /portfolios/:id                      — update portfolio details
DELETE /portfolios/:id                      — delete portfolio and all associated data

POST   /portfolios/:id/groups               — create group (pass parent_group_id for nesting)
PUT    /portfolios/:id/groups/:groupId      — rename, reorder, recolor
DELETE /portfolios/:id/groups/:groupId      — delete group (unassign its holdings, do not delete them)

POST   /portfolios/:id/holdings             — add holding
PUT    /portfolios/:id/holdings/:holdingId  — update allocation, group assignment
DELETE /portfolios/:id/holdings/:holdingId  — remove holding
```

### 4.2 Instruments (search)

```
GET    /instruments/search?q=nifty&type=mutual_fund   — autocomplete search
GET    /instruments/:id                               — instrument detail + available date range
```

### 4.3 Backtest

```
POST   /portfolios/:id/backtest             — create config and queue run
                                              body: { from_date, to_date, benchmark_id,
                                                      reinvest_dividends, rebalance_strategy,
                                                      rebalance_threshold, rebalance_day,
                                                      transaction_cost_pct, name }
                                              returns: { run_id, config_id, status: 'queued' }

GET    /backtests/:runId/status             — poll status (or use WebSocket)
GET    /backtests/:runId/results            — full results once completed
GET    /backtests/:runId/results/group/:groupId  — results filtered to a group
GET    /backtests/:runId/results/holding/:holdingId — results for one holding
```

WebSocket channel: `ws://host/backtests/:runId/progress`  
Emits: `{ percent: 42, message: "Processing 2022..." }` as job runs.

### 4.4 Algo Suggestion

```
GET    /portfolios/suggest                  — reads user's questionnaire data and returns
                                              suggested allocation as array of
                                              { instrument_id, name, allocation_pct, rationale }
```

---

## 5. Backtest Engine — How It Works

This is the most critical piece of business logic. Claude Code must implement this carefully.

### 5.1 Inputs

- Portfolio: holdings with allocation percentages, corpus amount
- Config: date range, rebalancing strategy, dividend treatment, transaction costs

### 5.2 Algorithm (pseudocode)

```
function runBacktest(portfolio, config, priceData):

  // Step 1: Validate that all instruments have price data for the full date range
  for each holding in portfolio.holdings:
    assert priceData[holding.instrument_id] covers config.from_date to config.to_date
    // If instrument started after from_date, begin its allocation from inception_date
    // and treat that allocation as cash (0% return) until inception

  // Step 2: Initialise positions
  positions = {}
  for each holding:
    initial_value = portfolio.corpus * (holding.allocation_pct / 100)
    initial_price = priceData[holding.instrument_id][config.from_date].adjusted_close
    positions[holding.id] = {
      units: initial_value / initial_price,
      cost_basis: initial_value
    }

  // Step 3: Walk forward through every trading day
  snapshots = []
  for each trading_day from config.from_date to config.to_date:

    // Update values at today's prices
    total_value = 0
    for each holding:
      price = priceData[holding.instrument_id][trading_day].adjusted_close
      current_value = positions[holding.id].units * price
      total_value += current_value

    // Handle dividends
    if config.reinvest_dividends:
      for each holding with dividend on trading_day:
        dividend_per_unit = priceData[holding.instrument_id][trading_day].dividend
        dividend_total = positions[holding.id].units * dividend_per_unit
        // Reinvest: buy more units at today's price
        positions[holding.id].units += dividend_total / price

    // Check if rebalancing is needed today
    should_rebalance = false
    if config.rebalance_strategy == 'monthly':
      should_rebalance = trading_day.day == config.rebalance_day
    else if config.rebalance_strategy == 'quarterly':
      should_rebalance = is_quarter_start(trading_day)
    else if config.rebalance_strategy == 'annually':
      should_rebalance = is_year_anniversary(trading_day, config.from_date)
    else if config.rebalance_strategy == 'threshold':
      for each holding:
        current_pct = (positions[holding.id].units * price) / total_value * 100
        drift = abs(current_pct - holding.allocation_pct)
        if drift > config.rebalance_threshold:
          should_rebalance = true

    // Execute rebalance
    if should_rebalance:
      for each holding:
        target_value = total_value * (holding.allocation_pct / 100)
        current_value = positions[holding.id].units * priceData[...][trading_day]
        diff = target_value - current_value
        // Apply transaction cost on the traded amount
        cost = abs(diff) * (config.transaction_cost_pct / 100)
        total_value -= cost   // cost reduces total portfolio value
        units_delta = (diff - sign(diff)*cost) / price
        positions[holding.id].units += units_delta
        record rebalance event

    // Store snapshot
    for each holding:
      snapshots.append({
        date: trading_day,
        holding_id: holding.id,
        value: positions[holding.id].units * price,
        units: positions[holding.id].units,
        price: price,
        was_rebalanced: should_rebalance
      })

  return snapshots
```

### 5.3 Metric Computation

Computed from snapshots after the walk-forward loop completes.

**Simple metrics (all users):**
- Total Return % = (final_value - corpus) / corpus * 100
- Absolute Gain/Loss = final_value - corpus
- CAGR = (final_value / corpus) ^ (1 / years) - 1
- Best single year return
- Worst single year return
- Best performing holding (by total return)
- Worst performing holding (by total return)
- If benchmark provided: portfolio return vs benchmark return, outperformance/underperformance

**Advanced metrics (finance mode):**
- Sharpe Ratio = (annualised_return - risk_free_rate) / annualised_volatility
  - Use 6.5% as the risk-free rate (approximate Indian T-bill rate)
- Sortino Ratio = (annualised_return - risk_free_rate) / downside_deviation
- Max Drawdown = (peak_value - trough_value) / peak_value, worst over the period
- Calmar Ratio = CAGR / abs(max_drawdown)
- Volatility = annualised standard deviation of daily returns
- Beta vs benchmark = covariance(portfolio_returns, benchmark_returns) / variance(benchmark_returns)
- Alpha = portfolio_return - (risk_free_rate + beta * (benchmark_return - risk_free_rate))
- Value at Risk (95%) = 5th percentile of daily return distribution
- Rolling 1-year returns: compute for every day with 252-day lookback window
- Correlation matrix: between all holdings (for Advanced view)
- Rebalancing cost summary: total transaction costs paid across all rebalance events

**Group-level metrics:**
All the above computed at the group level by summing the holding-level snapshots.

**Contribution metrics:**
- Group contribution to portfolio return = (group_return_INR / total_portfolio_return_INR) * 100
- Is group over/underperforming its allocation weight? (contribution_pct vs allocation_pct)

---

## 6. Market Data Strategy

This is a fundamental dependency. Claude Code must handle this robustly.

### 6.1 Data Sources (Indian market focus)

- **Mutual Fund NAV**: AMFI (Association of Mutual Funds in India) provides free daily NAV data via their public API. All mutual fund NAV data is legally free to use.
- **Equity prices**: NSE and BSE provide end-of-day data. For a production system, use a paid data provider (Quandl/Nasdaq Data Link, Alpha Vantage, or a specialised Indian market data vendor like Refinitiv, Bloomberg, or smaller providers like NSEPy/BSEPy for development).
- **Indices** (Nifty 50, Sensex, etc.): Available from NSE's official website and most data providers.
- **Gold**: MCX gold prices or Sovereign Gold Bond NAV from RBI.
- **Fixed return instruments** (FD): These have no price history — simulate as a fixed annual return (e.g. 7.0% p.a.) provided by the user or set as a constant.

### 6.2 Data Pipeline

```
Scheduler (cron, daily at 6pm IST after market close)
  → Fetch EOD prices for all active instruments
  → Validate: check for gaps, outliers (price change > 30% flagged for review)
  → Upsert into price_history table
  → Invalidate Redis cache for affected instruments
  → Update instruments.last_updated
```

### 6.3 Handling Missing Data

Some instruments will not have price data for every trading day (holidays, suspensions, new listings).

Rules:
- If a trading day is a market holiday, carry forward the previous day's price (no change in value).
- If an instrument has no data for a date range that is not a holiday, mark those snapshots with a `data_gap` flag and surface a warning in the UI.
- If an instrument has not yet launched at the backtest start date, begin the simulation from its inception date and treat that holding's allocation as cash (earning the savings rate, default 3.5% p.a.) until launch.

---

## 7. Rebalancing Strategies — Full Specification

Claude Code must implement all of these.

### 7.1 No Rebalancing
Buy and hold. The initial allocation drifts freely with market movements. Simplest case — serves as the baseline comparison for all other strategies.

### 7.2 Calendar Rebalancing
- **Monthly**: On a fixed day of the month (user configures, default = 1st). If that day is a holiday, use the next trading day.
- **Quarterly**: On the first trading day of each quarter (Jan, Apr, Jul, Oct).
- **Annually**: On the anniversary of the start date each year.

### 7.3 Threshold Rebalancing
Rebalance whenever any holding drifts more than N% away from its target allocation. N is configured by the user (default = 5%). This can trigger on any day, so check every trading day.

Example: Holding target is 20%, corpus grows, holding drifts to 26.3% — that's 6.3% drift, exceeds 5% threshold, rebalance triggers.

### 7.4 Threshold + Calendar (Hybrid)
Rebalance if threshold is breached OR if the calendar date is reached — whichever comes first. Commonly used in real practice.

### 7.5 Custom
Let the user provide a list of specific dates on which rebalancing should occur. For power users who want to simulate a manual rebalancing history.

### 7.6 Transaction Costs
Applied on every rebalance event. The user inputs a cost percentage (default 0.1% per trade, representing typical Indian brokerage + STT + exit loads for mutual funds). This cost is deducted from the portfolio value at each rebalance event.

The simulation must compute and store:
- Number of rebalance events
- Total transaction costs paid (in INR and as % of final value)
- What the portfolio would have been worth without any transaction costs (to show cost impact)

---

## 8. Frontend Component Architecture

All components are React. State management via Zustand (lightweight, scales well). Data fetching via React Query (handles caching, background refetch, loading states).

### 8.1 Route Structure

```
/portfolio                          — empty state or portfolio list
/portfolio/new                      — creation form (full viewport)
/portfolio/:id                      — portfolio view with results
/portfolio/:id/backtest/:runId      — specific backtest results view
```

### 8.2 Component Tree

```
<PortfolioPage>
  ├── <EmptyState>                   — shown if no portfolios exist
  │     └── <CreatePortfolioButton>
  │
  └── <PortfolioWorkspace>           — shown after at least one portfolio exists
        ├── <PortfolioTopBar>
        │     ├── portfolio name + corpus display
        │     ├── <PortfolioSwitcher>    — pill tabs for switching portfolios
        │     ├── <EditPortfolioButton>
        │     └── <NewPortfolioButton>
        │
        ├── <PortfolioLayout>           — flex row
        │     ├── <HoldingsExplorer>    — left panel (290px fixed width)
        │     │     ├── <ExplorerHeader>
        │     │     ├── <SearchBar>
        │     │     ├── <GroupTree>     — recursive tree, max 3 levels
        │     │     │     ├── <GroupNode>  (expandable, clickable to focus)
        │     │     │     │     └── <HoldingNode> (leaf, clickable to focus)
        │     │     │     └── <UngroupedSection>
        │     │     ├── <AllocationBar>
        │     │     └── <ExplorerActions>  (+ Security, + Group buttons)
        │     │
        │     └── <ResultsPanel>        — right panel (flex: 1)
        │           ├── <ContextBar>    — breadcrumb showing current focus
        │           ├── <ViewToggle>    — Simple / Advanced
        │           ├── <PeriodSelector>
        │           ├── <SimpleView>    (conditionally rendered)
        │           │     ├── <SummaryCards>
        │           │     ├── <InsightCard>   — plain language explanation
        │           │     ├── <GrowthChart>   — line chart
        │           │     ├── <ChartViewToggle>  (individual holdings / by group)
        │           │     ├── <YearByYearBars>
        │           │     └── <ContributionSection>
        │           └── <AdvancedView>  (conditionally rendered)
        │                 ├── <MetricsGrid>
        │                 ├── <HoldingsTable>
        │                 ├── <RiskBreakdown>
        │                 ├── <RebalancingLog>
        │                 └── <CorrelationMatrix>
        │
        └── <BacktestConfigPanel>    — slide-in drawer from right
              (triggered by "Run Backtest" button)
```

### 8.3 State Shape (Zustand)

```typescript
interface PortfolioStore {
  // Portfolio list
  portfolios: Portfolio[]
  activePortfolioId: string | null

  // Explorer state
  focusedNode: { type: 'portfolio' | 'group' | 'holding', id: string } | null
  expandedGroups: Set<string>

  // Backtest state
  activeRunId: string | null
  runStatus: 'idle' | 'queued' | 'running' | 'completed' | 'failed'
  runProgress: number   // 0-100

  // View state
  viewMode: 'simple' | 'advanced'
  chartMode: 'individual' | 'by-group'
}
```

### 8.4 Key Interaction: Focus Changes

When a user clicks a group or holding in the explorer, the `focusedNode` in state updates. The `<ResultsPanel>` observes `focusedNode` via a selector and triggers a new data fetch for `/backtests/:runId/results/group/:groupId` or `/results/holding/:holdingId`. React Query handles the loading state and transition. This is the core interaction loop — it must feel fast. Target < 200ms response for group-level result queries (pre-computed on the server during backtest run).

---

## 9. Simple vs Advanced View — Complete Content Specification

### 9.1 Simple View

Designed for users who just finished the questionnaire and don't know finance jargon. Every metric has a plain-language label. No unexplained acronyms.

**Summary cards (4 across top):**
1. "If you had invested ₹X, you'd have" → shows final corpus value
2. "Average yearly growth" → CAGR in %, labelled as "per year on average"
3. "Worst year" → worst calendar year return, labelled "the hardest year"
4. "Vs [benchmark name]" → outperformance/underperformance, labelled "compared to just buying Nifty 50"

**Insight card:**
A single paragraph in plain English connecting the results to the user's archetype from the questionnaire. Example: "Your Cautious Turtle instinct shows — this portfolio kept losses small in 2022 while still growing faster than a savings account." This is generated server-side using the questionnaire context + backtest results.

**Growth chart:**
Line chart showing portfolio value in INR over time. Benchmark overlaid as dashed line if enabled. Toggle to switch between "all holdings" (one line per holding) and "by group" (one line per top-level group). Chart tooltip shows date, portfolio value, benchmark value, and any rebalance events marked with a dot.

**Year-by-year bars:**
Simple bar chart showing annual return for each calendar year. Green = positive, muted blue = negative (not red — red causes anxiety without context). Each bar labelled with the year and the percentage.

**Contribution section:**
Horizontal stacked bar showing each group's contribution to total growth. Labelled "Who did the heavy lifting?" below the chart title.

**Rebalancing impact:**
A single callout: "Your X rebalancing events cost ₹Y in fees. Without rebalancing, your portfolio would have been worth ₹Z instead of ₹W." Only shown when rebalance strategy is not 'none'.

### 9.2 Advanced View

For users who know what Sharpe ratio means and want to see everything.

**Metrics grid (6 cards, 3×2):**
CAGR, Sharpe Ratio, Max Drawdown, Volatility (σ), Alpha, Beta. Each with a small badge showing the period (3Y, 5Y, etc.) and a one-line description that can be toggled visible.

**Holdings table:**
All holdings in one table. Columns: Name, Group, Allocation %, Total Return %, CAGR, Sharpe, Max DD, Rebalance trades, Current Value. Sortable by any column. Row click focuses that holding.

**Risk breakdown:**
Two side-by-side cards:
- Asset Allocation: breakdown by type (equity, debt, gold, liquid) with percentages
- Risk Metrics: VaR (95%), Sortino, Calmar, Correlation to benchmark

**Rebalancing log:**
Table of every rebalance event: date, trigger (threshold breached / calendar), holdings bought/sold, amounts, transaction cost. Paginated.

**Correlation matrix:**
Heatmap of pairwise correlation between all holdings. Only shown when portfolio has ≥ 3 holdings. Color scale: deep green = +1, white = 0, deep red = -1. Helps the user see if holdings are truly diversified or moving together.

**Rolling returns chart:**
Line chart showing the 1-year rolling return at every point in time. Shows how consistent (or volatile) the strategy has been. Helps users understand if "good average returns" came from a few exceptional years or from steady compounding.

---

## 10. Creation Form — Full Specification

Three-step full-viewport form. Left panel is dark and contextual. Right panel has the actual fields. Steps slide horizontally on navigation.

### Step 1 — Portfolio Details
Fields:
- Portfolio Name (required, max 120 chars)
- Total Corpus / Principal (required, numeric, INR, minimum ₹1,000)
- Notes (optional, textarea, max 500 chars)

Validation: Name must be unique per user. Corpus must be a positive number.

Live preview card on left panel updates as user types.

### Step 2 — Holdings

This step has two sub-sections: Group Manager and Holdings List.

**Group Manager:**
User creates named groups before adding holdings. Each group gets an auto-assigned colour. Groups created here become available as a dropdown option in each holding row. Groups can be nested (user selects a parent group). Maximum 3 levels deep — enforce this in the UI by disabling the parent dropdown for groups that are already 2 levels deep.

**Holdings List:**
Each holding row has:
- Name: autocomplete search against the instruments table. Shows ticker + instrument type as a chip. If no match found, still allows free text (for future instruments not yet in the database — these will be flagged as "manual entry" and will only support fixed-return simulation, not real price data).
- Allocation: numeric input. Toggle between "% of corpus" and "₹ amount" — amounts are converted to percentages internally. Percentage display updates as user types.
- Group: dropdown populated from groups created above. Default: "Ungrouped".
- Remove button.

Running allocation bar at the bottom of the form. Shows:
- Total allocated (e.g. 87.5%)
- Remaining unallocated (e.g. 12.5%)
- If over 100%: warning state with the overflow amount
- The form should NOT block progress if allocation is not 100% — unallocated capital is treated as cash in the backtest.

### Step 3 — Backtesting & Rebalancing

**Date range:**
- From Date and To Date pickers.
- Quick presets: 1 Year, 3 Years, 5 Years, 10 Years (sets from_date relative to today).
- Validation: To Date must be after From Date. From Date must not be before the earliest instrument inception date in the portfolio (show a warning per instrument if data is unavailable for the full period).

**Rebalancing Strategy (the key feature):**
Present as a card selector — one card per strategy option, each with a one-sentence plain-language description.

Options:
1. No Rebalancing — "Buy once and let it run. Your allocation will drift as markets move."
2. Monthly — "Readjust every month on a fixed day. More hands-on but keeps you on target."
3. Quarterly — "Readjust every 3 months. A balance between effort and precision."
4. Annually — "Readjust once a year. Set it and mostly forget it."
5. Threshold — "Readjust only when something drifts far from your target. Trigger point: [input]%"
6. Custom — "Choose specific dates to rebalance. For advanced users." (show date picker that adds dates to a list)

When Threshold is selected, show an additional input: "Trigger when any holding drifts more than [  ]% from its target." Default 5%.

When Monthly is selected, show: "Rebalance on the [  ] of each month." Default 1.

**Additional options (collapsible "Advanced Options" section):**
- Reinvest dividends: toggle. Default off. When on: "Dividends received are immediately used to buy more of the same holding."
- Transaction cost: numeric input, default 0.10%. Label: "Cost per trade (brokerage + taxes). 0.10% is typical for Indian mutual funds."

**Benchmark:**
Toggle: "Compare against a benchmark". When on, show benchmark selector with options:
Nifty 50, Sensex, Nifty Midcap 150, Nifty Smallcap 250, Gold (MCX), FD (7.5% p.a.)

**Run Backtest button:**
Primary action, terracotta coloured, full width at the bottom. Disabled if no holdings have been added. Label: "Run Backtest →"

---

## 11. Post-Creation: Portfolio Workspace

After backtest completes (or from a stored run), the user sees the full workspace. This does NOT re-run the form — it's a separate page/view.

### 11.1 Grouping Holdings Post-Creation

Users can reorganise holdings into groups after the portfolio is created, without re-running the backtest. The explorer panel has drag-and-drop support for moving holdings between groups and creating new groups inline. Changes to grouping do NOT invalidate the backtest (backtest results are stored at the holding level — group-level aggregation is computed on the fly).

### 11.2 Multiple Backtests Per Portfolio

A portfolio can have multiple saved backtest configurations. The top of the results panel shows a dropdown to switch between runs (e.g. "Monthly rebalance — Jan 2020 to Jan 2025" vs "Quarterly rebalance — same period"). This lets users compare strategies on the same portfolio without creating a new portfolio.

### 11.3 Algo Suggestion Button

A "Suggest Portfolio" button in the portfolio workspace header. Clicking it opens a modal showing a suggested allocation generated by the platform algorithm. The algorithm reads from the user's questionnaire data (risk tolerance, corpus, investment horizon, goals) and returns a recommended set of instruments with allocation percentages. Each suggestion includes a one-sentence rationale.

The user can click "Apply this portfolio" to replace their current holdings with the suggestions, or "Keep mine" to dismiss.

The algorithm itself is a rule-based system initially (not ML). The rules are based on:
- Risk tolerance score → equity/debt split (higher score = more equity)
- Investment horizon → short-term goals get more debt/liquid, long-term get more equity
- Corpus size → very small corpus (<₹50K) → only index funds and liquid funds (low expense ratio)
- Existing insurance and emergency fund status → if emergency fund missing, first suggestion is always a liquid fund allocation

---

## 12. Performance Considerations at Scale

### 12.1 Backtest computation

- Backtest runs are async jobs. Never synchronous. Queue with BullMQ. Workers run on separate Node.js processes (or Python workers if you move the engine to Python for NumPy/Pandas performance).
- For a portfolio of N holdings over D trading days, computation is O(N × D). A 20-holding portfolio over 10 years = ~52,000 rows of snapshots. This is fast. The bottleneck is fetching price data, not computation.
- Pre-fetch all required price data in a single bulk query before starting the walk-forward loop. Never query inside the loop.
- Store computed group-level time series in the backtest_run result JSON so they don't need to be recomputed on every focus change.

### 12.2 Market data queries

- All price data queries are read-only and identical across users for the same instrument + date range. Cache in Redis with key `price:{instrument_id}:{from_date}:{to_date}` and TTL of 24 hours.
- TimescaleDB's compression and hypertable partitioning handles the scale of time-series queries efficiently.

### 12.3 API rate limiting

- Instrument search (autocomplete) endpoint: rate-limit to 10 requests/second per user to prevent abuse.
- Backtest creation: rate-limit to 5 concurrent runs per user. Queue excess requests.

### 12.4 Frontend performance

- The holdings explorer tree can have many nodes. Virtualise the list (react-virtual or TanStack Virtual) when holdings count > 50.
- Chart data (daily snapshots) can span thousands of points. Downsample for display: show weekly points for 5+ year ranges, daily for < 1 year. Zoom interaction fetches higher resolution.
- Use React.memo on all holding/group nodes in the tree — re-renders on focus change should not ripple through the whole tree.

---

## 13. Error States and Edge Cases

Claude Code must handle all of these:

1. **Instrument with no data for the selected period** — show per-holding warning in the form before running. Do not silently fail.
2. **Portfolio with 0% allocation total** — block backtest, show: "Add allocations to your holdings before running."
3. **Allocation > 100%** — warn but allow submission. Treat as if corpus was proportionally larger (normalise to 100%).
4. **Backtest job fails** (network error, data gap, computation error) — store error in backtest_runs.error_message, surface in UI with a retry button.
5. **User deletes a holding that was part of a completed backtest** — do not delete the backtest data. Mark the holding as `archived` rather than hard-deleting. Backtest remains viewable.
6. **Two holdings with identical instruments** — allow it (user may want to track the same fund across two goals separately), but warn: "You have the same instrument in multiple places."
7. **Very short backtest period** (< 30 days) — warn: "Short periods can be misleading. We recommend at least 1 year for meaningful results."
8. **Fixed-return instruments** (FD, manual entries) — these need special handling in the engine. They do not have price data — simulate as a fixed daily return = (1 + annual_rate) ^ (1/252) - 1.

---

## 14. Phased Delivery

Build in this order. Each phase is independently deployable.

### Phase 1 — Core Portfolio CRUD + Creation Form
- Portfolio, group, holding CRUD endpoints
- Instrument search with pre-seeded instrument master (start with top 200 mutual funds + Nifty 50 index)
- Creation form (3 steps, all validation)
- Holdings explorer with group tree (max 3 levels, drag to reorder)
- Allocation bar and group percentage display
- No backtest yet — just show static allocation pie chart as placeholder output

**Definition of done:** User can create a portfolio, add holdings, create groups, organise holdings into groups, and see their allocation breakdown. Data persists.

### Phase 2 — Backtest Engine (No Rebalancing)
- Market data pipeline for AMFI NAV data (mutual funds first — free data)
- price_history table seeded with 10 years of NAV for top 200 mutual funds
- Backtest engine: buy-and-hold only (no rebalancing), walk-forward simulation
- Async job queue (BullMQ), WebSocket progress streaming
- backtest_snapshots table, metric computation (all simple + advanced metrics)
- Simple view results: summary cards, growth chart, year-by-year bars
- Advanced view results: metrics grid, holdings table

**Definition of done:** User can run a backtest on a mutual-fund portfolio and see results in both Simple and Advanced view.

### Phase 3 — Rebalancing Strategies
- All 6 rebalancing strategy types
- Transaction cost simulation
- Dividend reinvestment
- Rebalancing log in Advanced view
- Comparison mode: run same portfolio with different rebalancing configs, show results side by side within the portfolio (not across portfolios)

**Definition of done:** User can compare "no rebalance" vs "quarterly rebalance" on the same portfolio and see the difference in outcome and cost.

### Phase 4 — Equity + ETF + Index Data
- Add equity data source (paid provider or NSE scraper for non-commercial use)
- Expand instrument master to include NSE-listed stocks and ETFs
- Extend backtest engine to handle corporate actions (splits, bonuses) via adjusted_close

**Definition of done:** User can build a portfolio with a mix of mutual funds and direct stocks.

### Phase 5 — Group Focus View + Contribution Analysis
- Context-sensitive results (focus on group or holding, results update)
- Contribution section in Simple view
- Group-level metrics in Advanced view
- Correlation matrix

**Definition of done:** User can click "Car Fund" in the explorer and see only that group's performance, with a callout showing its contribution to overall portfolio growth.

### Phase 6 — Algo Suggestion
- Rule-based suggestion engine reading questionnaire data
- Suggestion modal with rationale
- Apply suggestion → replace holdings workflow

**Definition of done:** User clicks "Suggest Portfolio", sees personalised suggestions with reasons, and can apply them in one click.

---

## 15. Technology Choices Summary

| Layer | Technology | Reason |
|---|---|---|
| Frontend framework | React 18 | Standard, well-supported, large ecosystem |
| State management | Zustand | Lightweight, no boilerplate, good for this complexity level |
| Data fetching | TanStack Query (React Query) | Caching, background refetch, loading states out of the box |
| Charts | Recharts or Visx | Recharts for simple charts, Visx for custom/advanced |
| Backend | Node.js with Express or Fastify | Same language as frontend, fast enough for this use case |
| ORM | Prisma | Type-safe, excellent for PostgreSQL, migrations built in |
| Database (relational) | PostgreSQL | ACID compliance, JSON support, mature |
| Database (time-series) | TimescaleDB (PostgreSQL extension) | Price history queries, built on Postgres so single DB infra |
| Cache | Redis | Market data caching, session, job queue |
| Job queue | BullMQ (Redis-backed) | Async backtest jobs, progress tracking |
| WebSocket | Socket.io | Job progress streaming to client |
| Authentication | Already exists in FinHealth — integrate via existing JWT middleware |

---

## 16. What Claude Code Should NOT Do

- Do not write the algorithm suggestion engine in Phase 1-4. It is Phase 6.
- Do not add portfolio comparison (comparing Portfolio A vs Portfolio B) — this is not in scope.
- Do not add event/news explanation features — not in scope.
- Do not implement real-time (intraday) price tracking — this is a backtester, all data is end-of-day.
- Do not allow unlimited nesting depth — strictly enforce max 3 levels in both backend and frontend.
- Do not hard-delete holdings that appear in completed backtest runs — archive only.
- Do not compute metrics inside the frontend — all metric computation happens server-side during the backtest run. The frontend only renders stored results.