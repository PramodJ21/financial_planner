const express = require('express');
const pool = require('../db/pool');
const auth = require('../middleware/auth');

const router = express.Router();

// GET all user goals
router.get('/', auth, async (req, res) => {
    try {
        const result = await pool.query(
            'SELECT client_id, name, target, years, risk_level, include_inflation, equity_alloc, debt_alloc, commodity_alloc, equity_return, debt_return, commodity_return, priority_weight FROM user_goals WHERE user_id = $1 ORDER BY created_at ASC',
            [req.userId]
        );
        // Map back to frontend expected format
        const goals = result.rows.map(row => ({
            id: row.client_id,
            name: row.name,
            target: parseFloat(row.target),
            years: row.years,
            riskLevel: row.risk_level,
            includeInflation: row.include_inflation ?? true,
            customEquityAlloc: row.equity_alloc ? parseFloat(row.equity_alloc) : null,
            customDebtAlloc: row.debt_alloc ? parseFloat(row.debt_alloc) : null,
            customCommodityAlloc: row.commodity_alloc ? parseFloat(row.commodity_alloc) : null,
            customEquityReturn: row.equity_return ? parseFloat(row.equity_return) : null,
            customDebtReturn: row.debt_return ? parseFloat(row.debt_return) : null,
            customCommodityReturn: row.commodity_return ? parseFloat(row.commodity_return) : null,
            priorityWeight: row.priority_weight ?? 3
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
                INSERT INTO user_goals (
                    user_id, client_id, name, target, years, risk_level, include_inflation,
                    equity_alloc, debt_alloc, commodity_alloc, equity_return, debt_return, commodity_return,
                    priority_weight
                )
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
            `;
            for (const goal of goals) {
                await client.query(insertQuery, [
                    req.userId,
                    String(goal.id),
                    goal.name || 'Untitled Goal',
                    goal.target || 0,
                    goal.years || 1,
                    goal.riskLevel,
                    goal.includeInflation ?? true,
                    goal.customEquityAlloc,
                    goal.customDebtAlloc,
                    goal.customCommodityAlloc,
                    goal.customEquityReturn,
                    goal.customDebtReturn,
                    goal.customCommodityReturn,
                    goal.priorityWeight ?? 3
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
