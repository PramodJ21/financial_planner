const { Pool } = require('pg');
require('dotenv').config({ path: __dirname + '/../.env' });

const pool = new Pool({
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    database: process.env.DB_NAME,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD
});

async function migrate() {
    try {
        console.log('Starting migration...');

        // 1. Rename annual_gross_income to annual_salary
        await pool.query('ALTER TABLE financial_profiles RENAME COLUMN annual_gross_income TO annual_salary');
        console.log('Renamed annual_gross_income to annual_salary.');

        // 2. Add business_income column
        await pool.query('ALTER TABLE financial_profiles ADD COLUMN business_income NUMERIC(15,2) DEFAULT 0');
        console.log('Added business_income column.');

        console.log('Migration completed successfully.');
    } catch (err) {
        console.error('Migration failed:', err.message);
    } finally {
        await pool.end();
    }
}

migrate();
