const express = require('express');
const pool = require('../db/pool');
const auth = require('../middleware/auth');
const calc = require('../engine/calculations');

const router = express.Router();

// Get full dashboard data
router.get('/full', auth, async (req, res) => {
    try {
        const profileResult = await pool.query('SELECT * FROM financial_profiles WHERE user_id = $1', [req.userId]);
        const userResult = await pool.query('SELECT id, full_name, email FROM users WHERE id = $1', [req.userId]);

        if (profileResult.rows.length === 0 || userResult.rows.length === 0) {
            return res.status(404).json({ error: 'Profile not found. Please complete the questionnaire.' });
        }

        const dashboard = calc.computeFullDashboard(profileResult.rows[0], userResult.rows[0]);

        // Fetch saved statuses from DB
        const savedPlans = await pool.query('SELECT title, status FROM action_plans WHERE user_id = $1', [req.userId]);
        const statusMap = {};
        savedPlans.rows.forEach(row => statusMap[row.title] = row.status);

        dashboard.actionPlan.forEach(item => {
            if (statusMap[item.title]) {
                item.status = statusMap[item.title];
            }
        });

        res.json(dashboard);
    } catch (err) {
        console.error('Dashboard error:', err);
        res.status(500).json({ error: 'Server error computing dashboard.' });
    }
});

// Update action plan status
router.put('/action-plan/status', auth, async (req, res) => {
    try {
        const { title, category, status } = req.body;
        if (!['pending', 'completed'].includes(status) || !title) {
            return res.status(400).json({ error: 'Invalid parameters.' });
        }

        const existRows = await pool.query('SELECT id FROM action_plans WHERE user_id=$1 AND title=$2', [req.userId, title]);
        if (existRows.rows.length > 0) {
            await pool.query('UPDATE action_plans SET status=$1 WHERE id=$2', [status, existRows.rows[0].id]);
        } else {
            await pool.query('INSERT INTO action_plans (user_id, category, title, status) VALUES ($1, $2, $3, $4)', [req.userId, category || '', title, status]);
        }

        res.json({ success: true, status });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error.' });
    }
});

module.exports = router;
