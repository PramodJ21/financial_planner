# FinHealth Dashboard: Calculation Logic Reference
This document describes the exact formulas and rules implemented in `backend/engine/calculations.js`.
It is the single source of truth — update this whenever the engine changes.

---

## 1. Income

**Source fields**: `annual_salary`, `business_income`, `annual_bonus`, `other_income`

```
total_annual_income = annual_salary + business_income + annual_bonus + other_income
```

Breakdown percentages are each rounded to the nearest integer:
```
salaried_pct = round(annual_salary / total * 100)
business_pct = round(business_income / total * 100)
bonus_pct    = round(annual_bonus / total * 100)
other_pct    = round(other_income / total * 100)
```

**Monthly income used for surplus / cashflow calculations**:
```
monthly_income = monthly_take_home  (preferred)
               OR (annual_salary + business_income) / 12  (fallback if monthly_take_home is 0)
```
> Bonus and other income are excluded from the monthly operating income to keep surplus conservative.

---

## 2. Expenses

### Monthly (Part A)
`expense_household + expense_rent + expense_utilities + expense_transport + expense_food + expense_subscriptions + expense_discretionary`

### Annual (Part B)
```
annual_insurance = expense_annual_insurance + (expense_insurance_legacy × 12)
annual_total     = annual_insurance + expense_annual_education + expense_annual_property
                 + expense_annual_travel + expense_annual_other
```
> `expense_insurance` (old monthly field) is automatically folded into the annual insurance total for backwards compatibility.

### Key derived values
```
effective_monthly = total_monthly_part_A + (annual_total_part_B / 12)

fixed_annual      = (rent × 12) + (subscriptions × 12) + annual_insurance
                  + annual_education + annual_property
variable_annual   = (household × 12) + (utilities × 12) + (transport × 12) + (food × 12)
misc_annual       = (discretionary × 12) + annual_travel + annual_other

total_annual_combined = fixed_annual + variable_annual + misc_annual
```

### True Monthly Surplus
```
monthly_surplus = monthly_income - effective_monthly - total_monthly_emi
```

---

## 3. Assets & Allocation

### Asset class groupings
| Class | Components |
|-------|-----------|
| Equity | `inv_direct_stocks` + `inv_equity_mf` |
| Debt | `fd_balance` + `savings_balance` + `inv_debt_funds` + `inv_epf_ppf_nps` |
| Commodity | `inv_gold_commodities` |
| Real Estate | `inv_real_estate` |
| Alternative | `inv_crypto_alt` |

```
total_assets = equity + debt + commodity + real_estate + alternative
allocation_% = asset_class / total_assets × 100
```

### Default growth rates used for projections
| Asset | Rate |
|-------|------|
| Bank FD | `fd_rate` (user input, default 7%) |
| Savings Account | 3.5% |
| Direct Stocks | 12% |
| Equity Mutual Funds | 12% |
| EPF / PPF / NPS | 8% |
| Debt Funds & Bonds | 7% |
| Gold / Commodities | 8% |
| Real Estate | 5% |
| Crypto / Alternatives | 15% |

---

## 4. Ideal Asset Allocation Ranges

Real Estate is **excluded** from ideal target calculations — ranges apply only to liquid financial assets.

### Base ranges by age
| Age | Equity | Debt | Commodity | Alt Investments |
|-----|--------|------|-----------|-----------------|
| < 30 | 60–90% | 0–15% | 5–15% | 0–20% |
| 30–40 | 50–80% | 5–20% | 5–15% | 0–20% |
| 40–50 | 40–70% | 10–30% | 5–20% | 0–15% |
| 50–60 | 25–50% | 25–50% | 5–20% | 0–10% |
| 60+ | 15–35% | 40–70% | 5–15% | 0–10% |

### Conservative MoneySign adjustment (Cautious Turtle / Loyal Elephant, age < 50 only)
| Age | Equity overridden to | Debt overridden to |
|-----|---------------------|--------------------|
| < 30 | 50–75% | 10–25% |
| 30–40 | 40–65% | 15–30% |
| 40–50 | 30–50% | 25–45% |

### Aggressive MoneySign adjustment (Bold Eagle / Curious Fox, age ≥ 30 only)
```
equity_max += 10   (capped at 100)
debt_min   -= 5    (floored at 0)
```

---

## 5. Liabilities

### Good vs Bad Debt classification
- **Good**: `Home Loan`, `Education Loan`
- **Bad**: everything else (Personal Loan, Car Loan, Credit Card, Other Loan)

### Credit Cards — Multi-Card Format
Credit card data is stored in `credit_cards` JSONB array. Each card: `{ name, balance, type, emi_amount }`.

| `type` | EMI assumed | Interest rate |
|---|---|---|
| `"full"` | 0 (paid in full — no revolving cost) | 0% |
| `"emi"` | User-provided `emi_amount`; falls back to `balance × 3%` | 18% |
| `"revolving"` | `ROUND(balance × 0.03)` — standard Indian CC minimum | 36% |

**Credit card sub-totals** exposed from `computeLiabilities` for fragility logic:
```
creditCards.revolvingBalance  = Σ balance for type=revolving
creditCards.emiCCBalance      = Σ balance for type=emi
creditCards.fullBalance       = Σ balance for type=full
```
All three card types count toward `badLiability.outstanding` (full-pay cards carry no interest but the balance is still bad debt until settled).

### EMI Burden Ratio
```
emi_burden_ratio = (total_monthly_emi / (annual_salary / 12)) × 100
```
> Uses `annual_salary / 12` as gross monthly (not total income).

### Financial Ratio Ideal Ranges
| Ratio | Ideal |
|-------|-------|
| Expense-to-Income (annual) | max 45% of total annual income |
| Good EMI-to-Income (annual) | 15%–40% of total annual income |
| Bad EMI-to-Income (annual) | 0%–5% of total annual income |
| Investments-to-Income (annual SIP) | 25%–65% of total annual income |

---

## 6. Insurance Adequacy

### Health Insurance Ideal
```
ideal_health = MAX(₹5,00,000, annual_salary × 0.5)
```

### Life Insurance Ideal
```
has_dependents = (dependents > 0) OR (marital_status === 'Married')

raw_ideal_life = has_dependents ? annual_salary × 10 : 0
ideal_life     = CEIL(raw_ideal_life / 50,00,000) × 50,00,000   ← rounded up to nearest ₹50L
```

### Premium split (when only total annual premium is known)
```
health_pct    = health_cover / (health_cover + life_cover)
health_premium = total_annual_premium × health_pct
life_premium   = total_annual_premium × (1 - health_pct)
```

### Adequacy check
```
is_adequately_insured = (health_cover >= ideal_health) AND (life_cover >= ideal_life)
additional_life_needed = MAX(0, ideal_life - life_cover)
```

---

## 7. Tax Engine

**Gross total income** = `annual_salary + business_income + annual_bonus + other_income`

### Old Regime
```
deductions = MIN(tax_80c_used, 1,50,000)
           + MIN(tax_80d, 75,000)
           + tax_hra
           + MIN(tax_home_loan_interest, 2,00,000)
           + MIN(tax_nps_80ccd, 50,000)
standard_deduction = ₹50,000
taxable_income = MAX(0, gross_total - 50,000 - deductions)
```

Old regime tax slabs:
```
0                    → 0%
₹2,50,001 – ₹5,00,000 → 5%
₹5,00,001 – ₹10,00,000 → 20%
> ₹10,00,000         → 30%
Rebate u/s 87A: if taxable_income ≤ ₹5,00,000 → tax = 0
Cess: tax × 1.04 (4% Health & Education Cess)
```

### New Regime (FY 2025–26)
```
standard_deduction = ₹75,000
taxable_income = MAX(0, gross_total - 75,000)
```

New regime tax slabs:
```
0                      → 0%
₹3,00,001 – ₹7,00,000  → 5%
₹7,00,001 – ₹10,00,000 → 10%
₹10,00,001 – ₹12,00,000 → 15%
₹12,00,001 – ₹15,00,000 → 20%
> ₹15,00,000            → 30%
Rebate u/s 87A: if taxable_income ≤ ₹7,00,000 → tax = 0
Cess: tax × 1.04
```

### Recommendation & NPS strategy
```
recommended = (new_regime_tax <= old_regime_tax) ? 'New Regime' : 'Old Regime'
potential_savings = |old_regime_tax - new_regime_tax|

basic_salary_assumed = gross_total × 0.40
nps_employer_max_80ccd2 = basic_salary_assumed × 0.10
```
> The fixed value `₹68,400` shown in deduction utilisation for NPS old regime is a static cap placeholder in the UI, not a formula result.

---

## 8. Emergency Planning

```
ideal_emergency_fund = ROUND(effective_monthly × 6)
```
Uses `effective_monthly` (monthly + prorated annual) so that annual bills like insurance and school fees are covered during an emergency — not just bare monthly spending.

---

## 9. Net Worth & Surplus

```
net_worth       = total_assets - total_liabilities_outstanding
monthly_surplus = monthly_income - effective_monthly - total_monthly_emi
```

---

## 10. Cashflow Forecast (Next 3 Months)

All amounts represent a 3-month window, not a quarter (annual / 4 ≠ monthly × 3 when annual expenses exist).

**Credits**
```
gross_income_3m = monthly_income × 3
bonus_3m        = annual_bonus / 4        ← shown separately, not included in surplus
```

**Debits**
```
expenses_3m      = total_monthly_part_A × 3
emi_3m           = total_monthly_emi × 3
sip_3m           = inv_monthly_sip × 3
insurance_3m     = total_annual_insurance / 4
other_annual_3m  = (annual_total_part_B - total_annual_insurance) / 4
tax_3m           = MIN(old_regime_tax, new_regime_tax) / 4   ← uses lower of both regimes
```

**3-month surplus** (bonus excluded)
```
surplus_3m = gross_income_3m - expenses_3m - emi_3m - sip_3m
           - insurance_3m - other_annual_3m - tax_3m
```

---

## 11. Financial Behaviour Score (FBS) [0–100]

FBS has three tiers totalling 100 points, with a fragility penalty applied at the end.

### Tier 1 — Foundation (max 40 pts)

#### Emergency Fund (15 pts)
```
em_ratio = actual_emergency / ideal_emergency   (ideal = effective_monthly × 6)

em_ratio >= 2.0  → 15 pts
em_ratio >= 1.0  → 12 pts
em_ratio >= 0.75 → 9 pts
em_ratio >= 0.5  → 6 pts
em_ratio >= 0.25 → 3 pts
em_ratio < 0.25  → 1 pt
```

#### Insurance Coverage (15 pts = health 8 + life 7)

Health (8 pts):
```
health_cover >= ideal_health           → 8 pts
health_cover >= ideal_health × 0.5     → 5 pts
otherwise                              → 2 pts
```

Life (7 pts):
```
ideal_life === 0 (no dependents)       → automatic 7 pts
life_cover >= ideal_life               → 7 pts
life_cover >= ideal_life × 0.5         → 4 pts
otherwise                              → 1 pt
```

#### Liability Management (10 pts)
```
no liabilities at all                                    → 10 pts
only good debt AND emi_ratio ≤ 0.4                       → 10 pts
only good debt AND emi_ratio > 0.4                       → 4 pts
good_outstanding > bad_outstanding AND emi_ratio ≤ 0.4  → 7 pts
good_outstanding > bad_outstanding AND emi_ratio > 0.4  → 4 pts
bad debt exists AND emi_ratio ≤ 0.2                     → 4 pts
bad debt exists AND emi_ratio > 0.2                     → 2 pts

emi_ratio = total_monthly_emi / monthly_income
```

---

### Tier 2 — Behaviour (max 40 pts)

#### Investment Regularity / Consistency (15 pts)
```
sip_ratio = (inv_monthly_sip × 12) / total_annual_income × 100

sip_ratio > 30%  → 15 pts (base)
sip_ratio ≥ 20%  → 14 pts
sip_ratio ≥ 15%  → 12 pts
sip_ratio ≥ 10%  → 9 pts
sip_ratio ≥ 5%   → 6 pts
sip_ratio > 0%   → 2 pts
sip_ratio = 0%   → 0 pts

Consistency multiplier (applied to base):
sip_consecutive_months ≥ 6  → × 1.0
sip_consecutive_months ≥ 3  → × 0.9
sip_consecutive_months < 3  → × 0.8
(field absent / null        → × 1.0, no penalty)

investment_regularity = ROUND(base × multiplier)
```

#### Goal Clarity (15 pts)
```
timed_goals = goals where years > 0

timed_goals ≥ 3  → 15 pts
timed_goals = 2  → 10 pts
timed_goals = 1  → 6 pts
goals exist but none timed → 3 pts
no goals at all  → 0 pts
```

#### Behavioural Tendencies (10 pts)
Positive questions (higher answer = better financial behaviour):
- `beh_review_monthly`, `beh_avoid_debt`, `beh_market_reaction`, `beh_windfall_behaviour`, `beh_product_understanding`

Inverted questions (higher answer = worse — inverted as `6 − value`):
- `beh_delay_decisions`, `beh_spend_impulsively`, `beh_hold_losing`, `beh_compare_peers`

```
raw_total = sum of all 9 values (after inversion)   ← max = 45
behavioral_tendencies = ROUND((raw_total / 45) × 10)
```

---

### Tier 3 — Awareness (max 20 pts)

#### Portfolio Understanding (10 pts)
Mapped directly from `beh_product_understanding` (1–5):
```
5 → 10 pts
4 → 8 pts
3 → 6 pts
2 → 3 pts
1 → 1 pt
0 / missing → 6 pts (neutral default)
```

#### Tax & Regime Literacy (5 pts)
```
regime_match = (opted_regime === recommended_regime)
has_any_deduction = any of 80C, 80CCD, HRA, home loan interest, 80D > 0

regime_match AND has_any_deduction  → 5 pts
regime_match only                   → 3 pts
potential_savings ≤ ₹5,000          → 2 pts
regime mismatch with large savings  → 0 pts
```

#### Asset Diversity (5 pts)
```
max_alloc = MAX(equity%, debt%, commodity%, real_estate%, alt%)

max_alloc < 50%  → 5 pts
max_alloc < 70%  → 3 pts
max_alloc < 85%  → 1 pt
max_alloc ≥ 85%  → 0 pts
```

---

### Fragility Penalty (up to −15 combination + up to −10 revolving)

#### Standalone Revolving Penalty
Applied before and independently of combination flags. Penalises minimum-due credit card behaviour (36–42% p.a. compounding):
```
revolving_balance = Σ balance of credit cards with type="revolving"
                    (legacy: = credit_card_outstanding)
revolving_penalty = MIN(10, FLOOR(revolving_balance / monthly_income) × 3)
```

#### Combination flags
- `zero_emergency` = emergency_fund score ≤ 1
- `zero_insurance` = insurance score ≤ 2
- `high_bad_debt`  = bad_outstanding ≥ monthly_income × 2

```
all three present               → −15 pts  [flag: critical_triple_gap]
zero_emergency + zero_insurance → −8 pts   [flag: no_emergency_no_insurance]
zero_emergency + high_bad_debt  → −6 pts × multiplier  [flag: no_emergency_high_debt]
zero_insurance + high_bad_debt  → −5 pts × multiplier  [flag: no_insurance_high_debt]
```

**Multipliers** (for the high_bad_debt cases):
- Revolving majority (`revolving_balance > bad_outstanding × 0.5`) → × 1.5
- Heavy EMI CC (`emi_cc_balance ≥ monthly_income`) → × 1.2
- Neither → × 1.0
- Result capped at 15

#### Final Score
```
penalty   = revolving_penalty + fragility_combination_penalty
raw_total = foundation + behaviour + awareness
FBS = CLAMP(raw_total − penalty, 0, 100)
```

---

## 12. MoneySign® Archetypes

Three dimensions computed (each 0–10):

```
active_risk_taking = (risk_comfort / 10 × 5) + (6 − beh_prefer_guaranteed)
emotional_control  = (6 − beh_spend_impulsively) + beh_hold_losing
engagement         = beh_review_monthly + beh_follow_market_news
```

Archetype matching order (first match wins):

| Archetype | Condition |
|-----------|-----------|
| Bold Eagle 🦅 | active_risk_taking ≥ 8 AND engagement ≥ 8 |
| Cautious Turtle 🐢 | emotional_control ≥ 8 AND active_risk_taking ≤ 4 |
| Persistent Horse 🐎 | emotional_control ≥ 7 AND active_risk_taking ≥ 6 AND engagement ≤ 6 |
| Curious Fox 🦊 | engagement ≥ 8 AND emotional_control ≤ 5 |
| Strategic Owl 🦉 | emotional_control ≥ 8 AND engagement ≥ 7 |
| Loyal Elephant 🐘 | active_risk_taking ≤ 5 AND emotional_control ≥ 6 |
| Balanced Dolphin 🐬 | default (none of the above) |

---

## 13. Behavioral Biases

Detected when any of these conditions are true:

| Bias | Trigger |
|------|---------|
| Status Quo Bias | `beh_prefer_guaranteed` ≥ 4 |
| Endowment Bias | `beh_hold_losing` ≥ 4 |
| Regret-Aversion Bias | `beh_delay_decisions` ≥ 4 OR `beh_anxious_decisions` ≥ 4 |
| Herd Mentality | `beh_follow_market_news` ≥ 4 OR `beh_compare_peers` ≥ 4 |
| Impulse Bias | `beh_spend_impulsively` ≥ 4 |
| Familiarity Bias | `beh_familiar_brands` ≥ 4 |

---

## 14. Generational Wealth Score

Weighted score from 10 generational questions (all on 1–5 scale):

```
score = (q1×1.5) + (q2×1.0) + (q3×1.2) + (q4×1.2) + (q5×1.5)
      + (q6×1.0) + (q7×1.3) + (q8×1.3) + (q9×1.0) + (q10×1.2)
```

**Downward override**: if `q7 === 1 AND q8 === 1` → `score -= 3`

### Score-to-Generation mapping
| Score | Level | Label |
|-------|-------|-------|
| ≤ 20 | G0 | Ground Breaker |
| ≤ 30 | G1 | Foundation Builder |
| ≤ 40 | G2 | Inheritor of Stability |
| ≤ 52 | G3 | Established Class |
| > 52 | G4 | Generational Elite |

### Override rules (applied after base classification)
1. `q5 === 5 AND q8 === 5 AND genLevel < 3` → force G3
2. `q1 === 1 AND q9 === 1 AND genLevel > 1` → force G1
3. `q6 ≥ 4 AND q10 === 5` → bump up one level (G0→G1, G1→G2, G2→G3, G3→G4)

### Confidence check
Score is flagged **Low Confidence** if any answer within a thematic block deviates by more than 2 from the block average:
- Block A (q1–q3): childhood financial environment
- Block B (q4–q6): parental support
- Block C (q7–q8): grandparental wealth
- Block D (q9–q10): current safety net

---

## 15. Automated Action Plan

Actions are generated based on gaps versus ideal targets. Each action carries an `fbsImpact` equal to the points missing in the corresponding FBS dimension.

### Generation rules (in order)
1. **Emergency Fund** — if `ideal_emergency > actual_emergency`
2. **Health Insurance** — if `health_cover < ideal_health`
3. **Life Insurance** — if `additional_life_needed > 0`
4. **Debt Management** — if `bad_liability_outstanding > 0`
5. **Tax Planning – Regime Switch** — if `recommended ≠ opted_regime AND potential_savings > 0`
6. **Tax Planning – Unused Deductions** — for each deduction with `gap > ₹10,000` (Old Regime users)
7. **Asset Reallocation – Excess Savings** — if `(savings + FD) > emergency_reserve` and savings > 30% of portfolio
8. **Asset Reallocation – Equity Gap** — if `|equity_actual% − equity_ideal%| ≥ 10`
9. **Asset Reallocation – Debt Gap** — if `|debt_actual% − debt_ideal%| ≥ 10`
10. **Asset Reallocation – Gold Gap** — if `|gold_actual% − gold_ideal%| ≥ 5`
11. **Monthly Investment Plan** — if `investable_monthly > 0` (investable = surplus × 0.6)
12. **Start SIP** — fallback if investment regularity score still missing
13. **Portfolio Diversification** — fallback if asset diversity score still missing
14. **Portfolio Understanding** — if `portfolio_understanding_score < 10`
15. **Tax Literacy** — fallback if tax score still missing
16. **Goal Clarity** — if goal_clarity FBS score < 15
17. **Estate – Will** — if `has_will ≠ 'Yes'`
18. **Estate – Nominees** — if `nominees_set ≠ 'Yes'`
19. **Credit Score** — if `0 < credit_score < 750`
20. **Financial Habits** — if behavioral_tendencies score < 10

### Ideal allocation targets used inside action plan (simplified, no MoneySign adjustment)
| Age | Equity | Debt | Gold |
|-----|--------|------|------|
| < 30 | 80% | 10% | 10% |
| 30–40 | 70% | 20% | 10% |
| 40–50 | 60% | 30% | 10% |
| 50+ | 40% | 45% | 15% |

### Action plan sequencing (priority ordering)
Tasks are sorted by dependency level, then by `fbsImpact` descending within the same level:

| Category | Default Level |
|----------|--------------|
| Emergency Fund | 2 |
| Insurance | 2 |
| Debt Management | 2 |
| Financial Habits | 3 |
| Goal Clarity | 3 |
| Asset Reallocation | 3 |
| Tax Planning | 4 |
| Estate Planning | 5 |
| Credit Health | 5 |

**Fragility flag promotions** (force to level 1):
- `critical_triple_gap` → Emergency Fund (1.1) → Debt (1.2) → Insurance (1.3)
- `no_emergency_high_debt` → if bad debt avg rate > 15%: Debt (1.1) → Emergency Fund (1.2); otherwise reverse
- `no_emergency_no_insurance` → Emergency Fund (1.1) → Insurance (1.2)
- `no_insurance_high_debt` → Insurance (1.1) → Debt (1.2)
