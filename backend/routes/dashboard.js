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

        // Fetch user goals and attach to profile for Goal Clarity scoring
        const goalsResult = await pool.query(
            'SELECT id, name, target, years, priority_weight FROM user_goals WHERE user_id = $1 ORDER BY created_at ASC',
            [req.userId]
        );
        const profile = profileResult.rows[0];
        profile.goals = goalsResult.rows || [];

        const dashboard = calc.computeFullDashboard(profile, userResult.rows[0]);

        // Fetch saved statuses from DB
        const savedPlans = await pool.query('SELECT title, status FROM action_plans WHERE user_id = $1', [req.userId]);
        const statusMap = {};
        savedPlans.rows.forEach(row => statusMap[row.title] = row.status);

        // Apply saved statuses and compute completion bonus
        let completionBonus = 0;
        dashboard.actionPlan.forEach(item => {
            if (statusMap[item.title]) {
                item.status = statusMap[item.title];
            }
            // Add fbsImpact of completed tasks to the completion bonus
            if (item.status === 'completed' && item.fbsImpact > 0) {
                completionBonus += item.fbsImpact;
            }
        });

        // Apply completion bonus to FBS (capped at 100)
        if (completionBonus > 0) {
            dashboard.overview.fbsBase = dashboard.overview.fbs; // Original computed score
            dashboard.overview.fbsCompletionBonus = completionBonus;
            dashboard.overview.fbs = Math.min(100, dashboard.overview.fbs + completionBonus);
        }

        res.json(dashboard);
    } catch (err) {
        console.error('Dashboard error:', err);
        res.status(500).json({ error: 'Server error computing dashboard.' });
    }
});

// Update action plan status - returns updated FBS
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

        // Recalculate FBS with completion bonus
        const profileResult = await pool.query('SELECT * FROM financial_profiles WHERE user_id = $1', [req.userId]);
        const goalsResult = await pool.query(
            'SELECT id, name, target, years, priority_weight FROM user_goals WHERE user_id = $1 ORDER BY created_at ASC',
            [req.userId]
        );

        let updatedFbs = null;
        if (profileResult.rows.length > 0) {
            const profile = profileResult.rows[0];
            profile.goals = goalsResult.rows || [];
            const fbsObj = calc.computeFBS(profile);
            const actionPlan = calc.generateActionPlan(profile);

            // Get all saved statuses
            const allStatuses = await pool.query('SELECT title, status FROM action_plans WHERE user_id = $1', [req.userId]);
            const allStatusMap = {};
            allStatuses.rows.forEach(row => allStatusMap[row.title] = row.status);

            let completionBonus = 0;
            actionPlan.forEach(item => {
                if (allStatusMap[item.title] === 'completed' && item.fbsImpact > 0) {
                    completionBonus += item.fbsImpact;
                }
            });

            updatedFbs = Math.min(100, fbsObj.total + completionBonus);
        }

        res.json({ success: true, status, updatedFbs });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error.' });
    }
});

module.exports = router;
