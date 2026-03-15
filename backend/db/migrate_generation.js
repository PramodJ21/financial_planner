const pool = require('./pool');

async function migrate() {
    console.log('Starting generation columns migration...');
    const client = await pool.connect();
    
    try {
        await client.query('BEGIN');

        console.log('Adding gen_qx columns to financial_profiles table...');
        
        const alterQuery = `
            ALTER TABLE financial_profiles 
            ADD COLUMN IF NOT EXISTS gen_q1 INTEGER,
            ADD COLUMN IF NOT EXISTS gen_q2 INTEGER,
            ADD COLUMN IF NOT EXISTS gen_q3 INTEGER,
            ADD COLUMN IF NOT EXISTS gen_q4 INTEGER,
            ADD COLUMN IF NOT EXISTS gen_q5 INTEGER,
            ADD COLUMN IF NOT EXISTS gen_q6_selections JSONB DEFAULT '[]',
            ADD COLUMN IF NOT EXISTS gen_q6 INTEGER,
            ADD COLUMN IF NOT EXISTS gen_q7 INTEGER,
            ADD COLUMN IF NOT EXISTS gen_q8 INTEGER,
            ADD COLUMN IF NOT EXISTS gen_q9 INTEGER,
            ADD COLUMN IF NOT EXISTS gen_q10 INTEGER;
        `;
        
        await client.query(alterQuery);
        
        await client.query('COMMIT');
        console.log('Migration completed successfully!');
        
    } catch (e) {
        await client.query('ROLLBACK');
        console.error('Migration failed:', e);
    } finally {
        client.release();
        await pool.end();
    }
}

migrate();
