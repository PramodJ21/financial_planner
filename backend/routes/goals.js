const express = require('express');
const pool = require('../db/pool');
const auth = require('../middleware/auth');

const router = express.Router();

// GET all user goals
router.get('/', auth, async (req, res) => {
    try {
        const result = await pool.query(
            'SELECT client_id, name, target, years, risk_level FROM user_goals WHERE user_id = $1 ORDER BY created_at ASC',
            [req.userId]
        );
        // Map back to frontend expected format
        const goals = result.rows.map(row => ({
            id: row.client_id, // Important: use the text client_id
            name: row.name,
            target: parseFloat(row.target),
            years: row.years,
            riskLevel: row.risk_level
        }));
        res.json(goals);
    } catch (err) {
        console.error('Error fetching goals:', err);
        res.status(500).json({ error: 'Server error fetching goals.' });
    }
});

// POST user goals (Bulk replace)
router.post('/', auth, async (req, res) => {
    const goals = req.body.goals;
    if (!Array.isArray(goals)) {
        return res.status(400).json({ error: 'Expected an array of goals.' });
    }

    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        // Delete existing goals for this user
        await client.query('DELETE FROM user_goals WHERE user_id = $1', [req.userId]);

        // Insert new goals
        if (goals.length > 0) {
            const insertQuery = `
                INSERT INTO user_goals (user_id, client_id, name, target, years, risk_level)
                VALUES ($1, $2, $3, $4, $5, $6)
            `;
            for (const goal of goals) {
                await client.query(insertQuery, [
                    req.userId,
                    String(goal.id),
                    goal.name || 'Untitled Goal',
                    goal.target || 0,
                    goal.years || 1,
                    goal.riskLevel
                ]);
            }
        }

        await client.query('COMMIT');
        res.json({ success: true, message: 'Goals saved successfully.' });
    } catch (err) {
        await client.query('ROLLBACK');
        console.error('Error saving goals:', err);
        res.status(500).json({ error: 'Server error saving goals.' });
    } finally {
        client.release();
    }
});

module.exports = router;
