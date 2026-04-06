const { Pool } = require('pg');
require('dotenv').config({ path: __dirname + '/../.env' });

const pool = new Pool({
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    database: process.env.DB_NAME,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD
});

const initSQL = `
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

-- 2. Financial Profiles (questionnaire data)
CREATE TABLE IF NOT EXISTS financial_profiles (
  id         SERIAL PRIMARY KEY,
  user_id    INTEGER UNIQUE REFERENCES users(id) ON DELETE CASCADE,

  date_of_birth         DATE,
  city                  VARCHAR(100),
  marital_status        VARCHAR(20),
  dependents            INTEGER DEFAULT 0,
  employment_type       VARCHAR(50),
  risk_comfort          INTEGER DEFAULT 5,
  investment_experience VARCHAR(30),

  monthly_take_home      NUMERIC(15,2) DEFAULT 0,
  annual_salary          NUMERIC(15,2) DEFAULT 0,
  business_income        NUMERIC(15,2) DEFAULT 0,
  additional_income      NUMERIC(15,2) DEFAULT 0,
  annual_bonus           NUMERIC(15,2) DEFAULT 0,
  other_income           NUMERIC(15,2) DEFAULT 0,
  expected_income_growth NUMERIC(5,2)  DEFAULT 0,

  expense_household         NUMERIC(15,2) DEFAULT 0,
  expense_rent              NUMERIC(15,2) DEFAULT 0,
  expense_utilities         NUMERIC(15,2) DEFAULT 0,
  expense_transport         NUMERIC(15,2) DEFAULT 0,
  expense_food              NUMERIC(15,2) DEFAULT 0,
  expense_subscriptions     NUMERIC(15,2) DEFAULT 0,
  expense_insurance         NUMERIC(15,2) DEFAULT 0,
  expense_discretionary     NUMERIC(15,2) DEFAULT 0,
  expense_annual_insurance  NUMERIC(15,2) DEFAULT 0,
  expense_annual_education  NUMERIC(15,2) DEFAULT 0,
  expense_annual_property   NUMERIC(15,2) DEFAULT 0,
  expense_annual_travel     NUMERIC(15,2) DEFAULT 0,
  expense_annual_other      NUMERIC(15,2) DEFAULT 0,

  savings_balance NUMERIC(15,2) DEFAULT 0,
  fd_balance      NUMERIC(15,2) DEFAULT 0,
  fd_rate         NUMERIC(5,2)  DEFAULT 0,
  emergency_fund  NUMERIC(15,2) DEFAULT 0,

  questionnaire_goals JSONB DEFAULT '[]',

  inv_direct_stocks      NUMERIC(15,2) DEFAULT 0,
  inv_equity_mf          NUMERIC(15,2) DEFAULT 0,
  inv_monthly_sip        NUMERIC(15,2) DEFAULT 0,
  inv_epf_ppf_nps        NUMERIC(15,2) DEFAULT 0,
  inv_debt_funds         NUMERIC(15,2) DEFAULT 0,
  inv_gold_commodities   NUMERIC(15,2) DEFAULT 0,
  inv_real_estate        NUMERIC(15,2) DEFAULT 0,
  inv_crypto_alt         NUMERIC(15,2) DEFAULT 0,
  inv_num_mutual_funds   INTEGER DEFAULT 0,
  monthly_sip            NUMERIC(15,2) DEFAULT 0,
  sip_consecutive_months INTEGER DEFAULT 0,

  loan_type             VARCHAR(50),
  loan_outstanding      NUMERIC(15,2) DEFAULT 0,
  loan_interest_rate    NUMERIC(5,2)  DEFAULT 0,
  loan_monthly_emi      NUMERIC(15,2) DEFAULT 0,
  loan_remaining_tenure INTEGER DEFAULT 0,
  loans                 JSONB DEFAULT '[]',
  credit_cards          JSONB DEFAULT '[]',
  credit_score          INTEGER DEFAULT 0,

  health_cover   NUMERIC(15,2) DEFAULT 0,
  health_premium NUMERIC(15,2) DEFAULT 0,
  life_cover     NUMERIC(15,2) DEFAULT 0,
  life_premium   NUMERIC(15,2) DEFAULT 0,

  tax_regime             VARCHAR(20),
  tax_80c_used           NUMERIC(15,2) DEFAULT 0,
  tax_nps_80ccd          NUMERIC(15,2) DEFAULT 0,
  tax_hra                NUMERIC(15,2) DEFAULT 0,
  tax_home_loan_interest NUMERIC(15,2) DEFAULT 0,
  tax_80d                NUMERIC(15,2) DEFAULT 0,

  has_will     VARCHAR(20),
  nominees_set VARCHAR(20),
  num_nominees INTEGER DEFAULT 0,

  gen_q1            INTEGER DEFAULT 3,
  gen_q2            INTEGER DEFAULT 3,
  gen_q3            INTEGER DEFAULT 3,
  gen_q4            INTEGER DEFAULT 3,
  gen_q5            INTEGER DEFAULT 3,
  gen_q6_selections JSONB DEFAULT '[]',
  gen_q6            INTEGER DEFAULT 1,
  gen_q7            INTEGER DEFAULT 3,
  gen_q8            INTEGER DEFAULT 3,
  gen_q9            INTEGER DEFAULT 3,
  gen_q10           INTEGER DEFAULT 3,

  beh_delay_decisions       INTEGER DEFAULT 3,
  beh_prefer_guaranteed     INTEGER DEFAULT 3,
  beh_follow_market_news    INTEGER DEFAULT 3,
  beh_spend_impulsively     INTEGER DEFAULT 3,
  beh_review_monthly        INTEGER DEFAULT 3,
  beh_avoid_debt            INTEGER DEFAULT 3,
  beh_hold_losing           INTEGER DEFAULT 3,
  beh_anxious_decisions     INTEGER DEFAULT 3,
  beh_familiar_brands       INTEGER DEFAULT 3,
  beh_compare_peers         INTEGER DEFAULT 3,
  beh_windfall_behaviour    INTEGER DEFAULT 3,
  beh_market_reaction       INTEGER DEFAULT 3,
  beh_product_understanding INTEGER DEFAULT 3,

  current_step INTEGER DEFAULT 1,
  is_completed BOOLEAN DEFAULT FALSE,
  created_at   TIMESTAMP DEFAULT NOW(),
  updated_at   TIMESTAMP DEFAULT NOW()
);

-- 3. Action Plans
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
  risk_level       INTEGER DEFAULT 3,
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

-- 5. Instruments (portfolio backtester master list)
CREATE TABLE IF NOT EXISTS instruments (
  id              SERIAL PRIMARY KEY,
  ticker          VARCHAR(30) NOT NULL UNIQUE,
  name            VARCHAR(200) NOT NULL,
  instrument_type VARCHAR(30) NOT NULL
      CHECK (instrument_type IN ('equity','mutual_fund','etf','gold','bond','index','fixed_return')),
  exchange        VARCHAR(20),
  isin            VARCHAR(12),
  is_active       BOOLEAN DEFAULT true,
  inception_date  DATE,
  last_updated    TIMESTAMPTZ DEFAULT NOW()
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

-- 7. Portfolio Groups (max 3 levels deep)
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

CREATE INDEX IF NOT EXISTS idx_holdings_portfolio    ON holdings(portfolio_id);
CREATE INDEX IF NOT EXISTS idx_portfolio_groups_port ON portfolio_groups(portfolio_id);
CREATE INDEX IF NOT EXISTS idx_portfolios_user       ON portfolios(user_id);
CREATE INDEX IF NOT EXISTS idx_instruments_type      ON instruments(instrument_type);
`;

async function initDB() {
    try {
        // Try to create the database first
        const rootPool = new Pool({
            host: process.env.DB_HOST,
            port: process.env.DB_PORT,
            database: 'postgres',
            user: process.env.DB_USER,
            password: process.env.DB_PASSWORD
        });

        const dbCheck = await rootPool.query(
            "SELECT 1 FROM pg_database WHERE datname = $1", [process.env.DB_NAME]
        );

        if (dbCheck.rows.length === 0) {
            await rootPool.query(`CREATE DATABASE ${process.env.DB_NAME}`);
            console.log(`Database '${process.env.DB_NAME}' created.`);
        }
        await rootPool.end();

        // Now create tables
        await pool.query(initSQL);
        console.log('Tables created successfully.');
        console.log('Next: run node backend/db/seed_instruments.js to seed the instrument master list.');
        await pool.end();

    } catch (err) {
        console.error('DB init error:', err.message);
        process.exit(1);
    }
}

initDB();
