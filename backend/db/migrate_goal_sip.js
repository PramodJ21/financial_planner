const pool = require('./pool');

async function migrate() {
    const columns = [
        { name: 'monthly_sip', type: 'NUMERIC(15,2) DEFAULT 0' },
        { name: 'income_type', type: 'VARCHAR(20) DEFAULT \'regular\'' },
        { name: 'months_employed', type: 'INTEGER DEFAULT NULL' },
    ];

    for (const col of columns) {
        try {
            if (col.name === 'monthly_sip') {
                await pool.query(`ALTER TABLE user_goals ADD COLUMN IF NOT EXISTS ${col.name} ${col.type}`);
            } else {
                await pool.query(`ALTER TABLE financial_profiles ADD COLUMN IF NOT EXISTS ${col.name} ${col.type}`);
            }
            console.log(`Added column: ${col.name}`);
        } catch (err) {
            if (err.code === '42701') {
                console.log(`Column already exists: ${col.name}`);
            } else {
                console.error(`Error adding ${col.name}:`, err.message);
            }
        }
    }

    console.log('Migration complete.');
    process.exit(0);
}

migrate();
