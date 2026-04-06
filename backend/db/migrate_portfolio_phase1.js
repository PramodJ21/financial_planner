/**
 * Phase 1 Migration — Portfolio Backtester Tables
 * Run: node backend/db/migrate_portfolio_phase1.js
 */
require('dotenv').config({ path: __dirname + '/../.env' });
const pool = require('./pool');

async function migrate() {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        // 1. instruments
        await client.query(`
            CREATE TABLE IF NOT EXISTS instruments (
                id SERIAL PRIMARY KEY,
                ticker VARCHAR(30) NOT NULL UNIQUE,
                name VARCHAR(200) NOT NULL,
                instrument_type VARCHAR(30) NOT NULL CHECK (instrument_type IN ('equity','mutual_fund','etf','gold','bond','index','fixed_return')),
                exchange VARCHAR(20),
                isin VARCHAR(12),
                is_active BOOLEAN DEFAULT true,
                inception_date DATE,
                last_updated TIMESTAMPTZ DEFAULT NOW()
            )
        `);
        console.log('✓ instruments table ready');

        // 2. portfolios
        await client.query(`
            CREATE TABLE IF NOT EXISTS portfolios (
                id SERIAL PRIMARY KEY,
                user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
                name VARCHAR(120) NOT NULL,
                principal NUMERIC(15,2) NOT NULL,
                notes TEXT,
                created_at TIMESTAMPTZ DEFAULT NOW(),
                updated_at TIMESTAMPTZ DEFAULT NOW()
            )
        `);
        console.log('✓ portfolios table ready');

        // 3. portfolio_groups
        await client.query(`
            CREATE TABLE IF NOT EXISTS portfolio_groups (
                id SERIAL PRIMARY KEY,
                portfolio_id INTEGER REFERENCES portfolios(id) ON DELETE CASCADE,
                parent_group_id INTEGER REFERENCES portfolio_groups(id) ON DELETE SET NULL,
                name VARCHAR(80) NOT NULL,
                depth SMALLINT NOT NULL CHECK (depth BETWEEN 1 AND 3),
                display_order SMALLINT DEFAULT 0,
                color VARCHAR(7),
                created_at TIMESTAMPTZ DEFAULT NOW()
            )
        `);
        console.log('✓ portfolio_groups table ready');

        // 4. holdings
        await client.query(`
            CREATE TABLE IF NOT EXISTS holdings (
                id SERIAL PRIMARY KEY,
                portfolio_id INTEGER REFERENCES portfolios(id) ON DELETE CASCADE,
                group_id INTEGER REFERENCES portfolio_groups(id) ON DELETE SET NULL,
                instrument_id INTEGER REFERENCES instruments(id),
                allocation_pct NUMERIC(6,3) NOT NULL,
                display_order SMALLINT DEFAULT 0,
                archived BOOLEAN DEFAULT false,
                created_at TIMESTAMPTZ DEFAULT NOW()
            )
        `);
        console.log('✓ holdings table ready');

        // 5. Indexes
        await client.query(`CREATE INDEX IF NOT EXISTS idx_holdings_portfolio ON holdings(portfolio_id)`);
        await client.query(`CREATE INDEX IF NOT EXISTS idx_portfolio_groups_portfolio ON portfolio_groups(portfolio_id)`);
        await client.query(`CREATE INDEX IF NOT EXISTS idx_portfolios_user ON portfolios(user_id)`);
        await client.query(`CREATE INDEX IF NOT EXISTS idx_instruments_type ON instruments(instrument_type)`);
        console.log('✓ indexes ready');

        await client.query('COMMIT');
        console.log('\n✅ Phase 1 migration complete.');
    } catch (err) {
        await client.query('ROLLBACK');
        console.error('Migration failed:', err.message);
        process.exit(1);
    } finally {
        client.release();
        await pool.end();
    }
}

migrate();
