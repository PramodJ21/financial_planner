# FinHealth Dashboard: Input-to-Metric Calculation Logic
This document details the exact calculation rules mapping the 10-step questionnaire inputs to the dashboard metrics. It serves as the single source of truth for the `engine/calculations.js` backend logic.
---
## 1. Income & Expenses
- **Monthly Income Breakdown**:
  - Salaried (from `annual_gross_income`)
  - Bonus (from `annual_bonus`)
  - Other (from `other_income`)
- **Expense Breakdown**:
  - **Part A: Monthly Expenses**: Household (`expense_household`), Rent/EMI (`expense_rent`), Utilities (`expense_utilities`), Transport (`expense_transport`), Food (`expense_food`), Subscriptions (`expense_subscriptions`), Discretionary (`expense_discretionary`).
  - **Part B: Annual Expenses**: Insurance (`expense_annual_insurance`), Education (`expense_annual_education`), Property (`expense_annual_property`), Travel (`expense_annual_travel`), Other (`expense_annual_other`).
- **Effective Monthly Expense**: `Total Monthly (Part A) + (Total Annual (Part B) / 12)`.
- **True Monthly Surplus**: `Monthly Take-Home Income - Effective Monthly Expense - Monthly EMIs`.
- **Annual Total**: `(Total Monthly * 12) + Total Annual`.
## 2. Asset Allocation & Investments
- **Assets Total**: Sum of Bank FD, Savings, Direct Stocks, Equity MFs, EPF/PPF/NPS, Debt Funds, Gold, Real Estate, Crypto.
- **Asset Classes**:
  - **Equity**: Direct Stocks + Equity MFs
  - **Debt**: Bank FD + Savings + EPF/PPF/NPS + Debt Funds
  - **Commodity**: Gold/Commodities
  - **Real Estate**: Real Estate Value
  - **Alternatives**: Crypto / Alt
- **Ideal Allocation Thresholds (Age & MoneySign Based)**:
  - *Note: Real Estate is excluded (0%) from ideal target calculations to focus solely on liquid financial assets.*
  - Base ranges adjusted by age:
    - **< 30 yrs**: Equity [60-90%], Debt [0-15%], Commodity [5-15%], Alt [0-15%]
    - **30-40 yrs**: Equity [50-80%], Debt [5-20%], Commodity [5-15%], Alt [0-10%]
    - **40-50 yrs**: Equity [40-70%], Debt [10-30%], Commodity [5-20%], Alt [0-10%]
    - **50-60 yrs**: Equity [25-50%], Debt [25-50%], Commodity [5-20%], Alt [0-5%]
    - **60+ yrs**: Equity [15-35%], Debt [40-70%], Commodity [5-15%], Alt [0-5%]
  - **Dynamic Adjustments**:
    - **Conservative profiles** (Cautious Turtle, Loyal Elephant) under 50 see Equity decreased by ~10% and Debt increased by 10-15%.
    - **Aggressive profiles** (Bold Eagle, Curious Fox) 30 and over see their max Equity increased by 10% and min Debt decreased by 5%.
## 3. Liabilities Management
- **Good vs. Bad Debt**:
  - *Good Debt*: Home Loans, Education Loans (asset-backed or income-generating).
  - *Bad Debt*: Personal Loans, Credit Cards, Car Loans.
- **EMI Burden Ratio**: `(Total Monthly EMI / Gross Monthly Income) * 100`
- **Debt Safety Flags**:
  - Expense-to-Income: max 45%
  - Good EMI-to-Income: max 40%
  - Bad EMI-to-Income: max 5%
## 4. Insurance Adequacy
- **Health Insurance Ideal**: `MAX(5,00,000, Annual Gross Income * 0.5)`
- **Life Insurance Ideal**: 
  - If has dependents (Count > 0 OR Married): `Annual Gross Income * 10`
  - Otherwise: `0`
- **Status Badges**: Flagged "Adequately Insured" if Current Cover $\ge$ Ideal Cover.
## 5. Tax Engine (Old vs New Regime Comparison)
Calculates net tax payable under both regimes and recommends the one saving more money.
- **Old Regime Deductions**: Section 80C (max 1.5L), 80D (max 75k), HRA, Home Loan Interest (max 2L), 80CCD1B (max 50k).
- **New Regime Deductions**: Standard Deduction (75k for FY25-26 limit).
- **Tax Calculation**: Uses progressive slab rates up to 30%, adding marginal relief rebate (87A) and 4% Health/Edu Cess.
- **NPS Strategy**: Suggests maximizing Employer Corporate NPS 80CCD(2) up to 10% of base salary.
## 6. Financial Behaviour Score (FBS) [0 - 100 Scale]
A composite metric evaluating 7 financial dimensions:
1. **Asset Diversity (20 pts)**: Rewards having a balanced portfolio vs over-concentration in one asset class.
2. **Investment Regularity (15 pts)**: Rewards SIP ratio $\ge$ 20% of monthly income.
3. **Emergency Fund (15 pts)**: Rewards holding 6 months of **Effective Monthly Expenses** in liquidity.
4. **Insurance Coverage (15 pts)**: Health + Life gap analysis.
5. **Liability Management (10 pts)**: Rewards zero debt or majority "Good" debt.
6. **Tax Efficiency (10 pts)**: Rewards aligning with the algorithmically recommended tax regime.
7. **Behavior Score (15 pts)**: Scales answers from 1-to-5 behavioral questions (reviewing monthly, delaying decisions, impulsivity).
## 7. MoneySign® Archetypes
Maps subjective behavioral answers (1-5 scales, plus risk comfort 1-10) to 7 investment profiles using 3 normalized dimensions (each scaled out of 10):
- **Active Risk Taking**: Based on risk comfort and preference for guaranteed returns.
- **Emotional Control**: Based on impulsivity and tendency to hold losing investments.
- **Engagement**: Based on frequency of portfolio review and market news following.

**Archetypes**:
- **Bold Eagle**: Highly aggressive and engaged. Hunts for high growth opportunities and actively manages risks. *(High Risk Taking, High Engagement)*
- **Cautious Turtle**: Safety-first mindset. Prioritizes wealth preservation and guaranteed returns. *(High Emotional Control, Low Risk Taking)*
- **Persistent Horse**: Steady and methodical. Sets a solid long-term strategy and sticks to it. *(High Emotional Control, Mod/High Risk Taking, Low Engagement)*
- **Curious Fox**: Highly active and experimental. Constantly looks for next trends but may suffer from over-trading. *(High Engagement, Low Emotional Control)*
- **Strategic Owl**: Wise and highly disciplined. Analyzes thoroughly and maintains strong emotional control. *(High Emotional Control, High Engagement)*
- **Loyal Elephant**: Patient and risk-averse. Sticks to known brands and conservative assets. *(Low Risk Taking, Mod/High Emotional Control)*
- **Balanced Dolphin**: Adaptive and balanced mix of growth-seeking and wealth-preserving behaviors. *(Default Profile)*
## 8. Cashflow Forecast (3 Months)
- **Credits (Inflows)**: `(Gross Income / 4)` + `(Bonus / 4)`
- **Debits (Outflows)**: `(Monthly Expenses (Part A) * 3)` + `(Total Annual (Part B) / 4)` + `(Tax / 4)` + `(EMI * 3)` + `(SIPs * 3)`
  - *Note: Annual expenses are projected as a quarterly reserve.*
## 9. Automated Action Plan
Evaluates gaps in ideal thresholds to generate a checklist of to-dos:
- **Emergency**: Suggests allocating surplus if `emergency_actual < (effective_monthly * 3)`.
- **Insurance**: Recommends pure Term Cover if `life_actual < idealLife`.
- **Investments**: If monthly surplus exists but SIPs are 0, suggests a 5-fund diversified portfolio allocating percentages (Index, Small Cap, Flexi Cap, Gold ETF). 
- **Estate**: Flags missing/in-progress Will.
