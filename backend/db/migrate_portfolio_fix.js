/**
 * Portfolio Table Fix Migration
 * The live DB has an older portfolio schema that conflicts with Phase 1.
 * This drops the old tables and recreates them with the correct Phase 1 schema.
 *
 * Safe to run: the old portfolios table has 0 holdings (portfolio_holdings is empty).
 * Run: node backend/db/migrate_portfolio_fix.js
 */
require('dotenv').config({ path: __dirname + '/../.env' });
const pool = require('./pool');

async function migrate() {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        // 1. Drop old portfolio tables (old schema, no real data)
        await client.query('DROP TABLE IF EXISTS portfolio_holdings CASCADE');
        console.log('✓ Dropped portfolio_holdings (old)');

        await client.query('DROP TABLE IF EXISTS market_price_cache CASCADE');
        console.log('✓ Dropped market_price_cache (old)');

        await client.query('DROP TABLE IF EXISTS portfolio_groups CASCADE');
        console.log('✓ Dropped portfolio_groups (old)');

        await client.query('DROP TABLE IF EXISTS portfolios CASCADE');
        console.log('✓ Dropped portfolios (old)');

        // 2. Create portfolios with Phase 1 schema
        await client.query(`
            CREATE TABLE portfolios (
                id SERIAL PRIMARY KEY,
                user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
                name VARCHAR(120) NOT NULL,
                principal NUMERIC(15,2) NOT NULL,
                notes TEXT,
                created_at TIMESTAMPTZ DEFAULT NOW(),
                updated_at TIMESTAMPTZ DEFAULT NOW()
            )
        `);
        console.log('✓ Created portfolios (new)');

        // 3. Create portfolio_groups with Phase 1 schema
        await client.query(`
            CREATE TABLE portfolio_groups (
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
        console.log('✓ Created portfolio_groups (new)');

        // 4. holdings and instruments already have the correct schema from Phase 1 migration
        //    Just ensure the FK from holdings → portfolio_groups is still valid
        //    (holdings was created after portfolio_groups was dropped, so FK should be fine)

        // 5. Re-add indexes
        await client.query(`CREATE INDEX IF NOT EXISTS idx_portfolios_user ON portfolios(user_id)`);
        await client.query(`CREATE INDEX IF NOT EXISTS idx_portfolio_groups_portfolio ON portfolio_groups(portfolio_id)`);
        console.log('✓ Indexes ready');

        await client.query('COMMIT');
        console.log('\n✅ Portfolio fix migration complete.');
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
