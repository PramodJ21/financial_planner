-- ============================================================
-- Financial Planner - Complete Database Schema for Supabase
-- Run this in Supabase SQL Editor to create all tables
-- ============================================================

-- 1. Users table
CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  full_name VARCHAR(255) NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  phone VARCHAR(20),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- 2. Financial profiles (questionnaire data)
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
  
  -- Step 6: Liabilities (multiple loans as JSONB + credit card)
  loans JSONB DEFAULT '[]',
  credit_card_outstanding NUMERIC(15,2) DEFAULT 0,
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
  
  -- Questionnaire progress
  current_step INTEGER DEFAULT 1,
  is_completed BOOLEAN DEFAULT FALSE,
  
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- 3. Action plan items
CREATE TABLE IF NOT EXISTS action_plans (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  category VARCHAR(50) NOT NULL,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  suggested_amount NUMERIC(15,2) DEFAULT 0,
  allocation_percent NUMERIC(5,2) DEFAULT 0,
  status VARCHAR(20) DEFAULT 'pending',
  created_at TIMESTAMP DEFAULT NOW()
);
