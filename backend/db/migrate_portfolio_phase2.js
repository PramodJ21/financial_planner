/**
 * Phase 2 migration — price history + backtest tables
 * Run: node backend/db/migrate_portfolio_phase2.js
 */
require('dotenv').config({ path: __dirname + '/../.env' });
const pool = require('./pool');

const SQL = `
-- Add amfi_code to instruments (for mfapi.in lookups)
ALTER TABLE instruments ADD COLUMN IF NOT EXISTS amfi_code VARCHAR(20);

-- NAV / price history per instrument per date
CREATE TABLE IF NOT EXISTS price_history (
  id            SERIAL PRIMARY KEY,
  instrument_id INTEGER NOT NULL REFERENCES instruments(id) ON DELETE CASCADE,
  date          DATE NOT NULL,
  nav           NUMERIC(18,4) NOT NULL,
  UNIQUE(instrument_id, date)
);

CREATE INDEX IF NOT EXISTS idx_price_history_inst_date ON price_history(instrument_id, date DESC);

-- Backtest configuration
CREATE TABLE IF NOT EXISTS backtest_configs (
  id                   SERIAL PRIMARY KEY,
  portfolio_id         INTEGER NOT NULL REFERENCES portfolios(id) ON DELETE CASCADE,
  from_date            DATE NOT NULL,
  to_date              DATE NOT NULL,
  benchmark            VARCHAR(30) NOT NULL DEFAULT 'fd_7pct',
  rebalance_strategy   VARCHAR(30) NOT NULL DEFAULT 'none',
  transaction_cost_pct NUMERIC(5,3) DEFAULT 0,
  created_at           TIMESTAMPTZ DEFAULT NOW()
);

-- Backtest run (one config → one run)
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
`;

async function migrate() {
    try {
        await pool.query(SQL);
        console.log('Phase 2 migration complete.');
        console.log('Next: node backend/market_data/amfi_fetcher.js  (fetches ~10yr NAV history)');
    } catch (err) {
        console.error('Migration failed:', err.message);
        process.exit(1);
    } finally {
        await pool.end();
    }
}

migrate();
