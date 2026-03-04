const pool = require('./pool');

async function migrateLoanColumns() {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        // 1. Add loans JSONB column if not exists
        await client.query(`
            ALTER TABLE financial_profiles 
            ADD COLUMN IF NOT EXISTS loans JSONB DEFAULT '[]'
        `);

        // 2. Add credit_card_outstanding column if not exists
        await client.query(`
            ALTER TABLE financial_profiles 
            ADD COLUMN IF NOT EXISTS credit_card_outstanding NUMERIC(15,2) DEFAULT 0
        `);

        // 3. Migrate existing single-loan data into the JSONB array
        const rows = await client.query(`
            SELECT id, loan_type, loan_outstanding, loan_interest_rate, loan_monthly_emi, loan_remaining_tenure
            FROM financial_profiles
            WHERE loan_outstanding > 0 AND (loans IS NULL OR loans = '[]'::jsonb)
        `);

        for (const row of rows.rows) {
            const loan = [{
                type: row.loan_type || 'Other Loan',
                outstanding: Number(row.loan_outstanding) || 0,
                interestRate: Number(row.loan_interest_rate) || 0,
                emi: Number(row.loan_monthly_emi) || 0,
                tenure: Number(row.loan_remaining_tenure) || 0
            }];
            await client.query(
                'UPDATE financial_profiles SET loans = $1 WHERE id = $2',
                [JSON.stringify(loan), row.id]
            );
        }

        // 4. Drop old columns (optional — keeping for safety; uncomment to drop)
        // await client.query(`ALTER TABLE financial_profiles DROP COLUMN IF EXISTS loan_type`);
        // await client.query(`ALTER TABLE financial_profiles DROP COLUMN IF EXISTS loan_outstanding`);
        // await client.query(`ALTER TABLE financial_profiles DROP COLUMN IF EXISTS loan_interest_rate`);
        // await client.query(`ALTER TABLE financial_profiles DROP COLUMN IF EXISTS loan_monthly_emi`);
        // await client.query(`ALTER TABLE financial_profiles DROP COLUMN IF EXISTS loan_remaining_tenure`);

        await client.query('COMMIT');
        console.log('Migration complete: loans JSONB column added and data migrated.');
    } catch (err) {
        await client.query('ROLLBACK');
        console.error('Migration error:', err.message);
    } finally {
        client.release();
        await pool.end();
    }
}

migrateLoanColumns();
