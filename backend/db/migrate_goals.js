const pool = require('./pool');

const migrate = async () => {
    try {
        const sql = `
        CREATE TABLE IF NOT EXISTS user_goals (
            id SERIAL PRIMARY KEY,
            user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            client_id INTEGER, 
            name VARCHAR(255) NOT NULL,
            target NUMERIC NOT NULL,
            years INTEGER NOT NULL,
            risk_level INTEGER NOT NULL,
            created_at TIMESTAMP DEFAULT NOW()
        );
        `;
        await pool.query(sql);
        console.log("Migration successful: user_goals table created.");
    } catch (err) {
        console.error("Migration error:", err);
    } finally {
        process.exit(0);
    }
};

migrate();
