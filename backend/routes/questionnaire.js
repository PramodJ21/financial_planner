const express = require('express');
const pool = require('../db/pool');
const auth = require('../middleware/auth');

const router = express.Router();

// Column mapping for each step
const STEP_COLUMNS = {
    1: ['date_of_birth', 'city', 'marital_status', 'dependents', 'employment_type', 'income_type', 'months_employed', 'risk_comfort', 'investment_experience', 'gen_q1', 'gen_q5', 'gen_q9'],
    2: ['monthly_take_home', 'annual_salary', 'business_income', 'annual_bonus', 'other_income', 'expected_income_growth'],
    3: ['expense_household', 'expense_rent', 'expense_utilities', 'expense_transport', 'expense_food', 'expense_subscriptions', 'expense_discretionary', 'expense_annual_insurance', 'expense_annual_education', 'expense_annual_property', 'expense_annual_travel', 'expense_annual_other'],
    4: ['savings_balance', 'fd_balance', 'fd_rate'],
    5: ['questionnaire_goals'],
    6: ['inv_direct_stocks', 'inv_equity_mf', 'inv_monthly_sip', 'inv_epf_ppf_nps', 'inv_debt_funds', 'inv_gold_commodities', 'inv_real_estate', 'inv_crypto_alt', 'sip_consecutive_months'],
    7: ['loans', 'credit_cards', 'credit_score'],
    8: ['health_cover', 'health_premium', 'life_cover', 'life_premium'],
    9: ['tax_regime', 'tax_80c_used', 'tax_nps_80ccd', 'tax_hra', 'tax_home_loan_interest', 'tax_80d'],
    10: ['beh_delay_decisions', 'beh_spend_impulsively', 'beh_review_monthly', 'beh_avoid_debt', 'beh_hold_losing', 'beh_compare_peers', 'beh_market_reaction', 'beh_windfall_behaviour', 'beh_product_understanding', 'beh_prefer_guaranteed', 'beh_follow_market_news', 'beh_anxious_decisions', 'beh_familiar_brands']
};

// Get full questionnaire data
router.get('/', auth, async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM financial_profiles WHERE user_id = $1', [req.userId]);
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Profile not found.' });
        }
        res.json(result.rows[0]);
    } catch (err) {
        console.error('Get questionnaire error:', err);
        res.status(500).json({ error: 'Server error.' });
    }
});

// Save a specific step
router.put('/step/:step', auth, async (req, res) => {
    try {
        const step = parseInt(req.params.step);
        if (step < 1 || step > 10) {
            return res.status(400).json({ error: 'Invalid step number.' });
        }

        const columns = STEP_COLUMNS[step];
        const data = req.body;

        // Build SET clause
        const setClauses = [];
        const values = [];
        let paramIndex = 1;

        columns.forEach(col => {
            if (data[col] !== undefined) {
                setClauses.push(`${col} = $${paramIndex}`);
                // JSONB columns need explicit stringification
                if (col === 'loans' || col === 'gen_q6_selections' || col === 'credit_cards') {
                    values.push(JSON.stringify(data[col]));
                } else if (col === 'questionnaire_goals') {
                    const goals = Array.isArray(data[col]) ? data[col] : [];
                    const normalized = goals.map(g => ({
                        name: g.name || '',
                        target: Number(g.target) || 0,
                        years: Number(g.years) || 0,
                        is_saving: g.isSaving || g.is_saving || 'no',
                        priority_weight: Number(g.priorityWeight || g.priority_weight) || 3,
                        monthly_sip: Number(g.monthlySip || g.monthly_sip) || 0,
                    }));
                    values.push(JSON.stringify(normalized));
                } else {
                    values.push(data[col]);
                }
                paramIndex++;
            }
        });

        // Update current_step to the next step
        const nextStep = Math.min(step + 1, 10);
        setClauses.push(`current_step = GREATEST(current_step, $${paramIndex})`);
        values.push(nextStep);
        paramIndex++;

        // Mark completed if step 10
        if (step === 10) {
            setClauses.push(`is_completed = true`);
        }

        setClauses.push(`updated_at = NOW()`);
        values.push(req.userId);

        const query = `UPDATE financial_profiles SET ${setClauses.join(', ')} WHERE user_id = $${paramIndex} RETURNING *`;
        const result = await pool.query(query, values);

        res.json(result.rows[0]);
    } catch (err) {
        console.error('Save step error:', err);
        res.status(500).json({ error: 'Server error.' });
    }
});

module.exports = router;
