/**
 * Phase 3 migration — rebalancing strategy enhancements
 * Adds rebalance_threshold_pct and reinvest_dividends to backtest_configs.
 * Run: node backend/db/migrate_portfolio_phase3.js
 */
require('dotenv').config({ path: __dirname + '/../.env' });
const pool = require('./pool');

const SQL = `
ALTER TABLE backtest_configs
  ADD COLUMN IF NOT EXISTS rebalance_threshold_pct NUMERIC(5,2) DEFAULT 5,
  ADD COLUMN IF NOT EXISTS reinvest_dividends        BOOLEAN       DEFAULT false;
`;

async function migrate() {
    try {
        await pool.query(SQL);
        console.log('Phase 3 migration complete.');
        console.log('New columns: backtest_configs.rebalance_threshold_pct, backtest_configs.reinvest_dividends');
    } catch (err) {
        console.error('Migration failed:', err.message);
        process.exit(1);
    } finally {
        await pool.end();
    }
}

migrate();
