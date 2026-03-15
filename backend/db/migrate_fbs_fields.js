const pool = require('./pool');

async function migrate() {
    const columns = [
        { name: 'beh_market_reaction', type: 'INTEGER DEFAULT 3' },
        { name: 'beh_windfall_behaviour', type: 'INTEGER DEFAULT 3' },
        { name: 'beh_product_understanding', type: 'INTEGER DEFAULT 3' }
    ];

    for (const col of columns) {
        try {
            await pool.query(`ALTER TABLE financial_profiles ADD COLUMN IF NOT EXISTS ${col.name} ${col.type}`);
            console.log(`✓ Added column: ${col.name}`);
        } catch (err) {
            if (err.code === '42701') {
                console.log(`✓ Column already exists: ${col.name}`);
            } else {
                console.error(`✗ Error adding ${col.name}:`, err.message);
            }
        }
    }

    console.log('Migration complete.');
    process.exit(0);
}

migrate();
