const { Pool } = require('pg');
require('dotenv').config({ path: __dirname + '/../.env' });

const pool = new Pool({
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    database: process.env.DB_NAME,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD
});

const initSQL = `
-- Users table
CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  full_name VARCHAR(255) NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  phone VARCHAR(20),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Financial profiles (questionnaire data)
CREATE TABLE IF NOT EXISTS financial_profiles (
  id SERIAL PRIMARY KEY,
  user_id INTEGER UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  
  -- Step 1: Profile & Family
  date_of_birth DATE,
  city VARCHAR(100),
  marital_status VARCHAR(20),
  dependents INTEGER DEFAULT 0,
  employment_type VARCHAR(50),
  risk_comfort INTEGER DEFAULT 5,
  investment_experience VARCHAR(30),

  -- Generational Wealth Background
  gen_q1 INTEGER DEFAULT 3,
  gen_q2 INTEGER DEFAULT 3,
  gen_q3 INTEGER DEFAULT 3,
  gen_q4 INTEGER DEFAULT 3,
  gen_q5 INTEGER DEFAULT 3,
  gen_q6 INTEGER DEFAULT 1,
  gen_q6_selections JSONB DEFAULT '[]',
  gen_q7 INTEGER DEFAULT 3,
  gen_q8 INTEGER DEFAULT 3,
  gen_q9 INTEGER DEFAULT 3,
  gen_q10 INTEGER DEFAULT 3,
  
  -- Step 2: Income
  monthly_take_home NUMERIC(15,2) DEFAULT 0,
  annual_salary NUMERIC(15,2) DEFAULT 0,
  business_income NUMERIC(15,2) DEFAULT 0,
  annual_bonus NUMERIC(15,2) DEFAULT 0,
  other_income NUMERIC(15,2) DEFAULT 0,
  expected_income_growth NUMERIC(5,2) DEFAULT 0,
  
  -- Step 3: Expenses (monthly)
  expense_household NUMERIC(15,2) DEFAULT 0,
  expense_rent NUMERIC(15,2) DEFAULT 0,
  expense_utilities NUMERIC(15,2) DEFAULT 0,
  expense_transport NUMERIC(15,2) DEFAULT 0,
  expense_food NUMERIC(15,2) DEFAULT 0,
  expense_subscriptions NUMERIC(15,2) DEFAULT 0,
  expense_insurance NUMERIC(15,2) DEFAULT 0,
  expense_discretionary NUMERIC(15,2) DEFAULT 0,

  -- Step 3: Expenses (annual)
  expense_annual_insurance NUMERIC(15,2) DEFAULT 0,
  expense_annual_education NUMERIC(15,2) DEFAULT 0,
  expense_annual_property NUMERIC(15,2) DEFAULT 0,
  expense_annual_travel NUMERIC(15,2) DEFAULT 0,
  expense_annual_other NUMERIC(15,2) DEFAULT 0,
  
  -- Step 4: Assets & Banking
  savings_balance NUMERIC(15,2) DEFAULT 0,
  fd_balance NUMERIC(15,2) DEFAULT 0,
  fd_rate NUMERIC(5,2) DEFAULT 0,
  emergency_fund NUMERIC(15,2) DEFAULT 0,
  monthly_surplus NUMERIC(15,2) DEFAULT 0,
  
  -- Step 5: Investments
  inv_direct_stocks NUMERIC(15,2) DEFAULT 0,
  inv_equity_mf NUMERIC(15,2) DEFAULT 0,
  inv_monthly_sip NUMERIC(15,2) DEFAULT 0,
  inv_epf_ppf_nps NUMERIC(15,2) DEFAULT 0,
  inv_debt_funds NUMERIC(15,2) DEFAULT 0,
  inv_gold_commodities NUMERIC(15,2) DEFAULT 0,
  inv_real_estate NUMERIC(15,2) DEFAULT 0,
  inv_crypto_alt NUMERIC(15,2) DEFAULT 0,
  inv_num_mutual_funds INTEGER DEFAULT 0,
  sip_consecutive_months INTEGER DEFAULT 0,
  
  -- Step 6: Liabilities
  loans JSONB DEFAULT '[]',
  credit_cards JSONB DEFAULT '[]',
  credit_score INTEGER DEFAULT 0,
  
  -- Step 7: Insurance
  health_cover NUMERIC(15,2) DEFAULT 0,
  health_premium NUMERIC(15,2) DEFAULT 0,
  life_cover NUMERIC(15,2) DEFAULT 0,
  life_premium NUMERIC(15,2) DEFAULT 0,
  
  -- Step 8: Tax
  tax_regime VARCHAR(20),
  tax_80c_used NUMERIC(15,2) DEFAULT 0,
  tax_nps_80ccd NUMERIC(15,2) DEFAULT 0,
  tax_hra NUMERIC(15,2) DEFAULT 0,
  tax_home_loan_interest NUMERIC(15,2) DEFAULT 0,
  tax_80d NUMERIC(15,2) DEFAULT 0,
  
  -- Step 9: Estate Planning
  has_will VARCHAR(20) DEFAULT 'No',
  nominees_set VARCHAR(20) DEFAULT 'No',
  num_nominees INTEGER DEFAULT 0,
  
  -- Step 10: Financial Behavior (1-5 scale)
  beh_delay_decisions INTEGER DEFAULT 3,
  beh_prefer_guaranteed INTEGER DEFAULT 3,
  beh_follow_market_news INTEGER DEFAULT 3,
  beh_spend_impulsively INTEGER DEFAULT 3,
  beh_review_monthly INTEGER DEFAULT 3,
  beh_avoid_debt INTEGER DEFAULT 3,
  beh_hold_losing INTEGER DEFAULT 3,
  beh_anxious_decisions INTEGER DEFAULT 3,
  beh_familiar_brands INTEGER DEFAULT 3,
  beh_compare_peers INTEGER DEFAULT 3,
  beh_market_reaction INTEGER DEFAULT 3,
  beh_windfall_behaviour INTEGER DEFAULT 3,
  beh_product_understanding INTEGER DEFAULT 3,
  
  -- Questionnaire completion
  current_step INTEGER DEFAULT 1,
  is_completed BOOLEAN DEFAULT FALSE,
  
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Action plan items
CREATE TABLE IF NOT EXISTS action_plans (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  category VARCHAR(50) NOT NULL,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  suggested_amount NUMERIC(15,2) DEFAULT 0,
  allocation_percent NUMERIC(5,2) DEFAULT 0,
  status VARCHAR(50) DEFAULT 'pending',
  created_at TIMESTAMP DEFAULT NOW()
);

-- User Goals
CREATE TABLE IF NOT EXISTS user_goals (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  client_id VARCHAR(100),
  name VARCHAR(255) NOT NULL,
  target NUMERIC(15,2) DEFAULT 0,
  years INTEGER DEFAULT 1,
  risk_level VARCHAR(50),
  include_inflation BOOLEAN DEFAULT TRUE,
  equity_alloc NUMERIC(5,2),
  debt_alloc NUMERIC(5,2),
  commodity_alloc NUMERIC(5,2),
  equity_return NUMERIC(5,2),
  debt_return NUMERIC(5,2),
  commodity_return NUMERIC(5,2),
  priority_weight INTEGER DEFAULT 3,
  created_at TIMESTAMP DEFAULT NOW()
);
`;

async function initDB() {
    try {
        // Try to create the database first
        const rootPool = new Pool({
            host: process.env.DB_HOST,
            port: process.env.DB_PORT,
            database: 'postgres',
            user: process.env.DB_USER,
            password: process.env.DB_PASSWORD
        });

        const dbCheck = await rootPool.query(
            "SELECT 1 FROM pg_database WHERE datname = $1", [process.env.DB_NAME]
        );

        if (dbCheck.rows.length === 0) {
            await rootPool.query(`CREATE DATABASE ${process.env.DB_NAME}`);
            console.log(`Database '${process.env.DB_NAME}' created.`);
        }
        await rootPool.end();

        // Now create tables
        await pool.query(initSQL);
        console.log('Tables created successfully.');
        await pool.end();

    } catch (err) {
        console.error('DB init error:', err.message);
        process.exit(1);
    }
}

initDB();
