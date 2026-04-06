-- ============================================================
-- FinHealth Dashboard — Complete Database Schema
-- Reflects the actual live database as of 2026-04-06
--
-- To create a fresh database:
--   node backend/db/init.js                          (core FBS tables)
--   node backend/db/migrate_portfolio_phase1.js      (portfolio tables)
--   node backend/db/migrate_portfolio_phase2.js      (price_history + backtest tables)
--   node backend/db/migrate_portfolio_phase3.js      (rebalancing columns)
--   node backend/db/migrate_portfolio_phase4.js      (custom instruments + equity columns)
--   node backend/db/seed_instruments.js              (MF / gold / bond master)
--   node backend/db/seed_equity.js                   (Nifty 50 stocks + ETFs)
--   node backend/market_data/amfi_fetcher.js         (mutual fund NAV history)
--   node backend/market_data/equity_fetcher.js       (equity/ETF price history)
--
-- Column ordering: original columns first, then columns added
-- via ALTER TABLE migrations (preserved in their actual DB order).
-- ============================================================

-- 1. Users
CREATE TABLE IF NOT EXISTS users (
  id            SERIAL PRIMARY KEY,
  full_name     VARCHAR(255) NOT NULL,
  email         VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  phone         VARCHAR(20),
  created_at    TIMESTAMP DEFAULT NOW(),
  updated_at    TIMESTAMP DEFAULT NOW()
);

-- 2. Financial Profiles (questionnaire data, 130+ columns)
--    Columns appear in DB order: original init columns first,
--    then columns added later via migrations.
CREATE TABLE IF NOT EXISTS financial_profiles (
  id         SERIAL PRIMARY KEY,
  user_id    INTEGER UNIQUE REFERENCES users(id) ON DELETE CASCADE,

  -- Step 1: Profile & Family
  date_of_birth        DATE,
  city                 VARCHAR(100),
  marital_status       VARCHAR(20),
  dependents           INTEGER DEFAULT 0,
  employment_type      VARCHAR(50),
  risk_comfort         INTEGER DEFAULT 5,
  investment_experience VARCHAR(30),

  -- Step 2: Income (base)
  monthly_take_home    NUMERIC(15,2) DEFAULT 0,
  annual_salary        NUMERIC(15,2) DEFAULT 0,   -- renamed from annual_gross_income
  annual_bonus         NUMERIC(15,2) DEFAULT 0,
  other_income         NUMERIC(15,2) DEFAULT 0,
  expected_income_growth NUMERIC(5,2) DEFAULT 0,

  -- Step 3: Monthly Expenses
  expense_household    NUMERIC(15,2) DEFAULT 0,
  expense_rent         NUMERIC(15,2) DEFAULT 0,
  expense_utilities    NUMERIC(15,2) DEFAULT 0,
  expense_transport    NUMERIC(15,2) DEFAULT 0,
  expense_food         NUMERIC(15,2) DEFAULT 0,
  expense_subscriptions NUMERIC(15,2) DEFAULT 0,
  expense_insurance    NUMERIC(15,2) DEFAULT 0,
  expense_discretionary NUMERIC(15,2) DEFAULT 0,

  -- Step 3: Annual Expenses
  expense_annual_insurance  NUMERIC(15,2) DEFAULT 0,
  expense_annual_education  NUMERIC(15,2) DEFAULT 0,
  expense_annual_property   NUMERIC(15,2) DEFAULT 0,
  expense_annual_travel     NUMERIC(15,2) DEFAULT 0,
  expense_annual_other      NUMERIC(15,2) DEFAULT 0,

  -- Step 4: Assets & Banking
  savings_balance NUMERIC(15,2) DEFAULT 0,
  fd_balance      NUMERIC(15,2) DEFAULT 0,
  fd_rate         NUMERIC(5,2)  DEFAULT 0,
  emergency_fund  NUMERIC(15,2) DEFAULT 0,

  -- Step 6: Investments
  inv_direct_stocks    NUMERIC(15,2) DEFAULT 0,
  inv_equity_mf        NUMERIC(15,2) DEFAULT 0,
  inv_monthly_sip      NUMERIC(15,2) DEFAULT 0,   -- monthly SIP amount/us
  inv_epf_ppf_nps      NUMERIC(15,2) DEFAULT 0,
  inv_debt_funds       NUMERIC(15,2) DEFAULT 0,
  inv_gold_commodities NUMERIC(15,2) DEFAULT 0,
  inv_real_estate      NUMERIC(15,2) DEFAULT 0,
  inv_crypto_alt       NUMERIC(15,2) DEFAULT 0,
  inv_num_mutual_funds INTEGER DEFAULT 0,

  -- Legacy single-loan columns (still present in live DB; new loans use JSONB below)
  loan_type              VARCHAR(50),
  loan_outstanding       NUMERIC(15,2) DEFAULT 0,
  loan_interest_rate     NUMERIC(5,2)  DEFAULT 0,
  loan_monthly_emi       NUMERIC(15,2) DEFAULT 0,
  loan_remaining_tenure  INTEGER DEFAULT 0,
  credit_score           INTEGER DEFAULT 0,

  -- Step 8: Insurance
  health_cover   NUMERIC(15,2) DEFAULT 0,
  health_premium NUMERIC(15,2) DEFAULT 0,
  life_cover     NUMERIC(15,2) DEFAULT 0,
  life_premium   NUMERIC(15,2) DEFAULT 0,

  -- Step 9: Tax
  tax_regime            VARCHAR(20),
  tax_80c_used          NUMERIC(15,2) DEFAULT 0,
  tax_nps_80ccd         NUMERIC(15,2) DEFAULT 0,
  tax_hra               NUMERIC(15,2) DEFAULT 0,
  tax_home_loan_interest NUMERIC(15,2) DEFAULT 0,
  tax_80d               NUMERIC(15,2) DEFAULT 0,

  -- Estate planning
  has_will      VARCHAR(20),
  nominees_set  VARCHAR(20),
  num_nominees  INTEGER DEFAULT 0,

  -- Step 10: Financial Behaviour (1-5 scale)
  beh_delay_decisions   INTEGER DEFAULT 3,
  beh_prefer_guaranteed INTEGER DEFAULT 3,
  beh_follow_market_news INTEGER DEFAULT 3,
  beh_spend_impulsively INTEGER DEFAULT 3,
  beh_review_monthly    INTEGER DEFAULT 3,
  beh_avoid_debt        INTEGER DEFAULT 3,
  beh_hold_losing       INTEGER DEFAULT 3,
  beh_anxious_decisions INTEGER DEFAULT 3,
  beh_familiar_brands   INTEGER DEFAULT 3,
  beh_compare_peers     INTEGER DEFAULT 3,

  -- Questionnaire progress
  current_step  INTEGER DEFAULT 1,
  is_completed  BOOLEAN DEFAULT FALSE,
  created_at    TIMESTAMP DEFAULT NOW(),
  updated_at    TIMESTAMP DEFAULT NOW(),

  -- Added via migrations (appear at end in DB)
  business_income    NUMERIC(15,2) DEFAULT 0,
  additional_income  NUMERIC(15,2) DEFAULT 0,
  loans              JSONB DEFAULT '[]',      -- array of {type, outstanding, rate, emi, tenure}
  gen_q1  INTEGER DEFAULT 3,
  gen_q2  INTEGER DEFAULT 3,
  gen_q3  INTEGER DEFAULT 3,
  gen_q4  INTEGER DEFAULT 3,
  gen_q5  INTEGER DEFAULT 3,
  gen_q6_selections JSONB DEFAULT '[]',
  gen_q6  INTEGER DEFAULT 1,
  gen_q7  INTEGER DEFAULT 3,
  gen_q8  INTEGER DEFAULT 3,
  gen_q9  INTEGER DEFAULT 3,
  gen_q10 INTEGER DEFAULT 3,
  monthly_sip         NUMERIC(15,2) DEFAULT 0, -- total monthly SIP (summary field)
  sip_consecutive_months INTEGER DEFAULT 0,
  beh_windfall_behaviour INTEGER DEFAULT 3,
  beh_market_reaction    INTEGER DEFAULT 3,
  beh_product_understanding INTEGER DEFAULT 3,
  credit_cards  JSONB DEFAULT '[]',            -- array of {name, balance, type, emi_amount}
  questionnaire_goals JSONB DEFAULT '[]'       -- Step 5 goal capture
);

-- 3. Action Plan Items
CREATE TABLE IF NOT EXISTS action_plans (
  id                 SERIAL PRIMARY KEY,
  user_id            INTEGER REFERENCES users(id) ON DELETE CASCADE,
  category           VARCHAR(50) NOT NULL,
  title              VARCHAR(255) NOT NULL,
  description        TEXT,
  suggested_amount   NUMERIC(15,2) DEFAULT 0,
  allocation_percent NUMERIC(5,2)  DEFAULT 0,
  status             VARCHAR(50) DEFAULT 'pending',
  created_at         TIMESTAMP DEFAULT NOW()
);

-- 4. User Goals
CREATE TABLE IF NOT EXISTS user_goals (
  id               SERIAL PRIMARY KEY,
  user_id          INTEGER REFERENCES users(id) ON DELETE CASCADE,
  client_id        VARCHAR(100),
  name             VARCHAR(255) NOT NULL,
  target           NUMERIC(15,2) DEFAULT 0,
  years            INTEGER DEFAULT 1,
  risk_level       INTEGER DEFAULT 3,   -- INTEGER in live DB (1-5 scale)
  include_inflation BOOLEAN DEFAULT TRUE,
  equity_alloc     NUMERIC(5,2),
  debt_alloc       NUMERIC(5,2),
  commodity_alloc  NUMERIC(5,2),
  equity_return    NUMERIC(5,2),
  debt_return      NUMERIC(5,2),
  commodity_return NUMERIC(5,2),
  priority_weight  INTEGER DEFAULT 3,
  is_saving        VARCHAR(20) DEFAULT 'no',
  monthly_sip      NUMERIC(15,2) DEFAULT 0,
  created_at       TIMESTAMP DEFAULT NOW()
);

-- ============================================================
-- Portfolio Backtester Tables (Phase 1)
-- ============================================================

-- 5. Instruments (master list — seeded via seed_instruments.js / seed_equity.js)
CREATE TABLE IF NOT EXISTS instruments (
  id                 SERIAL PRIMARY KEY,
  ticker             VARCHAR(30) NOT NULL UNIQUE,
  name               VARCHAR(200) NOT NULL,
  instrument_type    VARCHAR(30) NOT NULL
      CHECK (instrument_type IN ('equity','mutual_fund','etf','gold','bond','index','fixed_return')),
  exchange           VARCHAR(20),
  isin               VARCHAR(12),
  is_active          BOOLEAN DEFAULT true,
  inception_date     DATE,
  last_updated       TIMESTAMPTZ DEFAULT NOW(),
  -- Phase 2: AMFI lookup code for mutual funds
  amfi_code          VARCHAR(20),
  -- Phase 4: user-defined fixed-return instruments
  custom_return_rate NUMERIC(6,4),          -- e.g. 0.1200 = 12% p.a.
  user_id            INTEGER REFERENCES users(id) ON DELETE CASCADE
);

-- 6. Portfolios
CREATE TABLE IF NOT EXISTS portfolios (
  id         SERIAL PRIMARY KEY,
  user_id    INTEGER REFERENCES users(id) ON DELETE CASCADE,
  name       VARCHAR(120) NOT NULL,
  principal  NUMERIC(15,2) NOT NULL,
  notes      TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 7. Portfolio Groups (nested up to 3 levels deep)
CREATE TABLE IF NOT EXISTS portfolio_groups (
  id              SERIAL PRIMARY KEY,
  portfolio_id    INTEGER REFERENCES portfolios(id) ON DELETE CASCADE,
  parent_group_id INTEGER REFERENCES portfolio_groups(id) ON DELETE SET NULL,
  name            VARCHAR(80) NOT NULL,
  depth           SMALLINT NOT NULL CHECK (depth BETWEEN 1 AND 3),
  display_order   SMALLINT DEFAULT 0,
  color           VARCHAR(7),
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- 8. Holdings
CREATE TABLE IF NOT EXISTS holdings (
  id             SERIAL PRIMARY KEY,
  portfolio_id   INTEGER REFERENCES portfolios(id) ON DELETE CASCADE,
  group_id       INTEGER REFERENCES portfolio_groups(id) ON DELETE SET NULL,
  instrument_id  INTEGER REFERENCES instruments(id),
  allocation_pct NUMERIC(6,3) NOT NULL,
  display_order  SMALLINT DEFAULT 0,
  archived       BOOLEAN DEFAULT false,
  created_at     TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes (Phase 1)
CREATE INDEX IF NOT EXISTS idx_holdings_portfolio     ON holdings(portfolio_id);
CREATE INDEX IF NOT EXISTS idx_portfolio_groups_port  ON portfolio_groups(portfolio_id);
CREATE INDEX IF NOT EXISTS idx_portfolios_user        ON portfolios(user_id);
CREATE INDEX IF NOT EXISTS idx_instruments_type       ON instruments(instrument_type);
-- Phase 4: user-owned custom instruments
CREATE INDEX IF NOT EXISTS idx_instruments_user       ON instruments(user_id) WHERE user_id IS NOT NULL;

-- ============================================================
-- Portfolio Backtester Tables (Phase 2)
-- ============================================================

-- 9. Price History (daily NAV / adjusted close per instrument)
CREATE TABLE IF NOT EXISTS price_history (
  id            SERIAL PRIMARY KEY,
  instrument_id INTEGER NOT NULL REFERENCES instruments(id) ON DELETE CASCADE,
  date          DATE NOT NULL,
  nav           NUMERIC(18,4) NOT NULL,
  UNIQUE(instrument_id, date)
);

CREATE INDEX IF NOT EXISTS idx_price_history_inst_date ON price_history(instrument_id, date DESC);

-- 10. Backtest Configurations
CREATE TABLE IF NOT EXISTS backtest_configs (
  id                      SERIAL PRIMARY KEY,
  portfolio_id            INTEGER NOT NULL REFERENCES portfolios(id) ON DELETE CASCADE,
  from_date               DATE NOT NULL,
  to_date                 DATE NOT NULL,
  benchmark               VARCHAR(30) NOT NULL DEFAULT 'fd_7pct',
  rebalance_strategy      VARCHAR(30) NOT NULL DEFAULT 'none',
  transaction_cost_pct    NUMERIC(5,3) DEFAULT 0,
  created_at              TIMESTAMPTZ DEFAULT NOW(),
  -- Phase 3: rebalancing parameters
  rebalance_threshold_pct NUMERIC(5,2) DEFAULT 5,
  reinvest_dividends      BOOLEAN DEFAULT false
);

-- 11. Backtest Runs (one config → one run result)
CREATE TABLE IF NOT EXISTS backtest_runs (
  id             SERIAL PRIMARY KEY,
  config_id      INTEGER NOT NULL REFERENCES backtest_configs(id) ON DELETE CASCADE,
  portfolio_id   INTEGER NOT NULL REFERENCES portfolios(id) ON DELETE CASCADE,
  status         VARCHAR(20) NOT NULL DEFAULT 'completed',
  started_at     TIMESTAMPTZ,
  completed_at   TIMESTAMPTZ,
  error_message  TEXT,
  result_summary JSONB,
  created_at     TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_backtest_runs_portfolio ON backtest_runs(portfolio_id, created_at DESC);
