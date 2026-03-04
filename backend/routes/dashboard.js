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
        res.json(dashboard);
    } catch (err) {
        console.error('Dashboard error:', err);
        res.status(500).json({ error: 'Server error computing dashboard.' });
    }
});

// Update action plan status
router.put('/action-plan/:index/status', auth, async (req, res) => {
    try {
        const { status } = req.body;
        if (!['pending', 'completed'].includes(status)) {
            return res.status(400).json({ error: 'Invalid status.' });
        }
        // For now, we regenerate the action plan from profile data
        // In production, you'd store action plan items in the action_plans table
        res.json({ success: true, status });
    } catch (err) {
        res.status(500).json({ error: 'Server error.' });
    }
});

module.exports = router;
