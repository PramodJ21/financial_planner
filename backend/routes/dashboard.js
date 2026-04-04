const express = require('express');
const pool = require('../db/pool');
const auth = require('../middleware/auth');
const calc = require('../engine/calculations');
const { generateActionPlan } = require('../engine/actionPlan');

const router = express.Router();

// Get full dashboard data
router.get('/full', auth, async (req, res) => {
    try {
        const profileResult = await pool.query('SELECT * FROM financial_profiles WHERE user_id = $1', [req.userId]);
        const userResult = await pool.query('SELECT id, full_name, email FROM users WHERE id = $1', [req.userId]);

        if (profileResult.rows.length === 0 || userResult.rows.length === 0) {
            return res.status(404).json({ error: 'Profile not found. Please complete the questionnaire.' });
        }

        const goalsResult = await pool.query(
            'SELECT id, name, target, years, priority_weight, is_saving, monthly_sip, equity_return, debt_return, commodity_return FROM user_goals WHERE user_id = $1 ORDER BY created_at ASC',
            [req.userId]
        );
        const profile = profileResult.rows[0];
        profile.goals = goalsResult.rows.length > 0
            ? goalsResult.rows
            : (Array.isArray(profile.questionnaire_goals) ? profile.questionnaire_goals : []);

        const dashboard = calc.computeFullDashboard(profile, userResult.rows[0]);

        const fbsResult = calc.computeFBS(profile);
        const newActionPlan = generateActionPlan(profile, fbsResult);

        const savedPlans = await pool.query('SELECT id, title, status FROM action_plans WHERE user_id = $1', [req.userId]);
        const statusMap = {};
        savedPlans.rows.forEach(row => { statusMap[row.title] = { status: row.status, id: row.id }; });

        newActionPlan.forEach(item => {
            if (statusMap[item.title]) {
                item.status = statusMap[item.title].status;
                item.dbId = statusMap[item.title].id;
            }
        });

        let completionBonus = 0;
        newActionPlan.forEach(item => {
            if (item.status === 'completed' && item.fbsImpact > 0) {
                completionBonus += item.fbsImpact;
            }
        });

        dashboard.actionPlan = newActionPlan;

        if (completionBonus > 0) {
            dashboard.overview.fbsBase = dashboard.overview.fbs;
            dashboard.overview.fbsCompletionBonus = completionBonus;
            dashboard.overview.fbs = Math.min(100, dashboard.overview.fbs + completionBonus);
        }

        // Expose questionnaire completion state to frontend
        dashboard.overview.stepsCompleted = profile.current_step || 0;
        dashboard.overview.isCompleted    = profile.is_completed  || false;

        res.json(dashboard);
    } catch (err) {
        console.error('Dashboard error:', err);
        res.status(500).json({ error: 'Server error computing dashboard.' });
    }
});

// Update action plan item status by ID
router.patch('/action-plans/:id', auth, async (req, res) => {
    try {
        const itemId = parseInt(req.params.id, 10);
        const { status } = req.body;

        const allowedStatuses = ['pending', 'in_progress', 'completed', 'dismissed'];
        if (!allowedStatuses.includes(status)) {
            return res.status(400).json({ error: 'Invalid status value.' });
        }

        const existRow = await pool.query(
            'SELECT id FROM action_plans WHERE id = $1 AND user_id = $2',
            [itemId, req.userId]
        );
        if (existRow.rows.length === 0) {
            return res.status(404).json({ error: 'Action plan item not found.' });
        }

        await pool.query('UPDATE action_plans SET status = $1 WHERE id = $2', [status, itemId]);
        res.json({ success: true, id: itemId, status });
    } catch (err) {
        console.error('PATCH action plan error:', err);
        res.status(500).json({ error: 'Server error.' });
    }
});

// Upsert action plan item status by title (legacy — kept for backward compatibility)
router.put('/action-plan/status', auth, async (req, res) => {
    try {
        const { title, category, status, dimension } = req.body;
        if (!['pending', 'in_progress', 'completed', 'dismissed'].includes(status) || !title) {
            return res.status(400).json({ error: 'Invalid parameters.' });
        }

        const existRows = await pool.query('SELECT id FROM action_plans WHERE user_id=$1 AND title=$2', [req.userId, title]);
        let itemId;
        if (existRows.rows.length > 0) {
            await pool.query('UPDATE action_plans SET status=$1 WHERE id=$2', [status, existRows.rows[0].id]);
            itemId = existRows.rows[0].id;
        } else {
            const ins = await pool.query(
                'INSERT INTO action_plans (user_id, category, title, status) VALUES ($1, $2, $3, $4) RETURNING id',
                [req.userId, category || dimension || '', title, status]
            );
            itemId = ins.rows[0].id;
        }

        const profileResult = await pool.query('SELECT * FROM financial_profiles WHERE user_id = $1', [req.userId]);
        const goalsResult = await pool.query(
            'SELECT id, name, target, years, priority_weight, is_saving, monthly_sip, equity_return, debt_return, commodity_return FROM user_goals WHERE user_id = $1 ORDER BY created_at ASC',
            [req.userId]
        );

        let updatedFbs = null;
        if (profileResult.rows.length > 0) {
            const profile = profileResult.rows[0];
            profile.goals = goalsResult.rows || [];
            const fbsObj = calc.computeFBS(profile);
            const { generateActionPlan: gap } = require('../engine/actionPlan');
            const actionPlan = gap(profile, fbsObj);

            const allStatuses = await pool.query('SELECT title, status FROM action_plans WHERE user_id = $1', [req.userId]);
            const allStatusMap = {};
            allStatuses.rows.forEach(row => { allStatusMap[row.title] = row.status; });

            let completionBonus = 0;
            actionPlan.forEach(item => {
                if (allStatusMap[item.title] === 'completed' && item.fbsImpact > 0) {
                    completionBonus += item.fbsImpact;
                }
            });

            updatedFbs = Math.min(100, fbsObj.total + completionBonus);
        }

        res.json({ success: true, id: itemId, status, updatedFbs });
    } catch (err) {
        console.error('PUT action plan status error:', err);
        res.status(500).json({ error: 'Server error.' });
    }
});

module.exports = router;
