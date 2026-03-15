const express = require('express');
const pool = require('../db/pool');
const auth = require('../middleware/auth');

const router = express.Router();

// Column mapping for each step
const STEP_COLUMNS = {
    1: ['date_of_birth', 'city', 'marital_status', 'dependents', 'employment_type', 'risk_comfort', 'investment_experience', 'gen_q1', 'gen_q2', 'gen_q3', 'gen_q4', 'gen_q5', 'gen_q6', 'gen_q6_selections', 'gen_q7', 'gen_q8', 'gen_q9', 'gen_q10'],
    2: ['monthly_take_home', 'annual_salary', 'business_income', 'annual_bonus', 'other_income', 'expected_income_growth'],
    3: ['expense_household', 'expense_rent', 'expense_utilities', 'expense_transport', 'expense_food', 'expense_subscriptions', 'expense_insurance', 'expense_discretionary'],
    4: ['savings_balance', 'fd_balance', 'fd_rate', 'emergency_fund', 'monthly_surplus'],
    5: ['inv_direct_stocks', 'inv_equity_mf', 'inv_monthly_sip', 'inv_epf_ppf_nps', 'inv_debt_funds', 'inv_gold_commodities', 'inv_real_estate', 'inv_crypto_alt', 'inv_num_mutual_funds'],
    6: ['loans', 'credit_card_outstanding', 'credit_score'],
    7: ['health_cover', 'health_premium', 'life_cover', 'life_premium'],
    8: ['tax_regime', 'tax_80c_used', 'tax_nps_80ccd', 'tax_hra', 'tax_home_loan_interest', 'tax_80d'],
    9: ['has_will', 'nominees_set', 'num_nominees'],
    10: ['beh_delay_decisions', 'beh_spend_impulsively', 'beh_review_monthly', 'beh_avoid_debt', 'beh_hold_losing', 'beh_compare_peers', 'beh_market_reaction', 'beh_windfall_behaviour', 'beh_product_understanding']
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
                if (col === 'loans' || col === 'gen_q6_selections') {
                    values.push(JSON.stringify(data[col]));
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
