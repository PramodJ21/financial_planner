# FBS — Financial Behaviour Score

Computed in `backend/engine/calculations.js` → `computeFBS(p)`

---

## Score Structure (0–100)

| Tier | Max Points | Components |
|------|-----------|------------|
| Tier 1: Foundation | 40 | Emergency Fund (15) + Insurance (15) + Liability Management (10) |
| Tier 2: Behaviour | 40 | Investment Regularity (15) + Goal Clarity (15) + Behavioural Tendencies (10) |
| Tier 3: Awareness | 20 | Portfolio Understanding (10) + Tax Literacy (5) + Asset Diversity (5) |
| Fragility Penalty | −15 max | Applied for critical combinations of gaps |

---

## Tier 1: Foundation (40 pts)

### Emergency Fund — 15 pts
`ideal = expenses.effectiveMonthly × 6`

| emRatio (actual / ideal) | Points |
|--------------------------|--------|
| ≥ 2.0 | 15 |
| ≥ 1.0 | 12 |
| ≥ 0.75 | 9 |
| ≥ 0.5 | 6 |
| ≥ 0.25 | 3 |
| < 0.25 | 1 |

### Insurance Coverage — 15 pts (health 8 + life 7)

**Health (8 pts)**
- ≥ idealHealth → 8
- ≥ 50% of idealHealth → 5
- else → 2

**Life (7 pts)**
- No dependents (idealLife = 0) → **automatic 7 pts**
- ≥ idealLife → 7
- ≥ 50% of idealLife → 4
- else → 1

### Liability Management — 10 pts
`emiRatio = totalEmi / monthlyIncome`

| Condition | Points |
|-----------|--------|
| No liabilities | 10 |
| Only good debt + emiRatio ≤ 0.4 | 10 |
| Only good debt + emiRatio > 0.4 | 4 |
| Good > Bad + emiRatio ≤ 0.4 | 7 |
| Good > Bad + emiRatio > 0.4 | 4 |
| Bad debt present + emiRatio ≤ 0.2 | 4 |
| Bad debt present + emiRatio > 0.2 | 2 |

---

## Tier 2: Behaviour (40 pts)

### Investment Regularity — 15 pts
`sipRatio = (inv_monthly_sip × 12) / income.total × 100`

| sipRatio | Base Points |
|----------|-------------|
| > 30% | 15 |
| ≥ 20% | 14 |
| ≥ 15% | 12 |
| ≥ 10% | 9 |
| ≥ 5% | 6 |
| > 0% | 2 |
| 0% | 0 |

Multiplied by consistency (`sip_consecutive_months`):
- ≥ 6 months → ×1.0
- ≥ 3 months → ×0.9
- < 3 months → ×0.8

### Goal Clarity — 15 pts
Based on number of timed goals (years > 0) in `user_goals`:
- ≥ 3 goals → 15
- 2 goals → 10
- 1 goal → 6
- Goals exist but none timed → 3
- No goals → 0

### Behavioural Tendencies — 10 pts
9 behaviour questions scored 1–5. Positive questions taken as-is; negative questions inverted (6 − value).
`score = (rawTotal / 45) × 10`

**Positive (higher = better):** `beh_review_monthly`, `beh_avoid_debt`, `beh_market_reaction`, `beh_windfall_behaviour`, `beh_product_understanding`

**Inverted (higher = worse):** `beh_delay_decisions`, `beh_spend_impulsively`, `beh_hold_losing`, `beh_compare_peers`

---

## Tier 3: Awareness (20 pts)

### Portfolio Understanding — 10 pts
Based on `beh_product_understanding` (1–5):
- 5 → 10, 4 → 8, 3 → 6, 2 → 3, 1 → 1, missing → 6 (neutral default)

### Tax & Regime Literacy — 5 pts
- Opted regime matches recommended AND has any deductions → 5
- Opted regime matches recommended, no deductions → 3
- Regime mismatch with potential savings ≤ ₹5K → 2
- Regime mismatch with meaningful savings available → 0

### Asset Diversity — 5 pts
Based on highest single asset class allocation %:
- Max < 50% → 5
- Max < 70% → 3
- Max < 85% → 1
- Max ≥ 85% → 0

---

## Fragility Penalty (up to −15 combination + up to −10 revolving = up to −25 total)

### Standalone Revolving Penalty
Revolving credit card debt (minimum-due behaviour) is penalised independently — even if no fragility combination fires:
```
revolving_balance = Σ balance of credit_cards where type="revolving"
revolving_penalty = MIN(10, FLOOR(revolving_balance / monthly_income) × 3)
```
Each full monthly income in revolving balance = −3 pts, capped at −10.

### Three combination flags:
- `zeroEmergency` = emergencyFund score ≤ 1
- `zeroInsurance` = insuranceScore ≤ 2
- `highBadDebt` = badLiability.outstanding ≥ monthlyIncome × 2  ← tightened from × 3

| Combination | Base Penalty | Revolving majority (>50%) | Heavy EMI card (≥ monthly income) |
|---|---|---|---|
| All three | −15 | — | — |
| zeroEmergency + zeroInsurance | −8 | — | — |
| zeroEmergency + highBadDebt | −6 | × 1.5 → up to −9 | × 1.2 → up to −7 |
| zeroInsurance + highBadDebt | −5 | × 1.5 → up to −8 | × 1.2 → up to −6 |
| Any single flag alone | 0 | — | — |

**Multiplier conditions** (mutually exclusive; revolving majority takes precedence):
- "revolving majority": `revolving_balance > bad_outstanding × 0.5`
- "heavy EMI CC": `emi_cc_balance ≥ monthly_income`
- Combined result always capped at 15.

### Final penalty
```
total_penalty = revolving_penalty + fragility_combination_penalty
FBS = CLAMP(raw_total − total_penalty, 0, 100)
```

### FBS API response (`fragility` object)
```json
{ "penalty": <total>, "fragilityPenalty": <combination>, "revolvingPenalty": <revolving>, "flags": [...] }
```

---

## Resolved Issues

### Credit card scoring — fully resolved
Single `credit_card_outstanding` numeric field replaced by `credit_cards[]` JSONB array. Each card carries a repayment type (`full` / `emi` / `revolving`) with per-type EMI and interest rate assumptions. A standalone revolving penalty (up to −10) is now applied directly to the FBS regardless of fragility flag combinations, closing the edge case where an emergency fund boost could mask a large CC debt. The `highBadDebt` threshold was progressively tightened from `annual_income × 0.3` → `monthly_income × 3` → `monthly_income × 2`. Fragility combination penalties now scale up (× 1.2 or × 1.5) based on card composition.
