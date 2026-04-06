/**
 * Phase 4 migration — Equity + ETF instrument support
 * Adds custom_return_rate (for user-defined fixed-return instruments)
 * and user_id (instruments created by a specific user).
 *
 * Run: node backend/db/migrate_portfolio_phase4.js
 */
require('dotenv').config({ path: __dirname + '/../.env' });
const pool = require('./pool');

const SQL = `
-- Rate stored as a decimal (e.g. 0.12 = 12% p.a.) for user-created fixed-return instruments
ALTER TABLE instruments
  ADD COLUMN IF NOT EXISTS custom_return_rate NUMERIC(6,4),
  ADD COLUMN IF NOT EXISTS user_id INTEGER REFERENCES users(id) ON DELETE CASCADE;

-- Index to find user's custom instruments quickly
CREATE INDEX IF NOT EXISTS idx_instruments_user ON instruments(user_id)
  WHERE user_id IS NOT NULL;
`;

async function migrate() {
    try {
        await pool.query(SQL);
        console.log('Phase 4 migration complete.');
        console.log('Next steps:');
        console.log('  node backend/db/seed_equity.js          (seeds Nifty 50 stocks + ETFs)');
        console.log('  node backend/market_data/equity_fetcher.js  (fetches NSE EOD price data)');
    } catch (err) {
        console.error('Migration failed:', err.message);
        process.exit(1);
    } finally {
        await pool.end();
    }
}

migrate();
