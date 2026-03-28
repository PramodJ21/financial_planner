# FBS — Financial Behaviour Score

Computed in `backend/engine/calculations.js` → `computeFBS(p)`

---

## Dynamic Weight System

FBS uses **life-stage-dependent weights** instead of fixed max points. Each component scores a raw ratio against its original thresholds, then gets scaled to a dynamic ceiling based on the user's age bracket.

### FBS Life Stages (age only)

| Key | Age | Label | Description |
|-----|-----|-------|-------------|
| EARLY_CAREER | < 30 | Early Career | Building foundations and habits |
| ESTABLISHING | 30–39 | Establishing | Managing major life commitments |
| CONSOLIDATING | 40–49 | Consolidating | Balancing peak expenses and wealth growth |
| PEAK_EARNING | 50–57 | Peak Earning | Maximising and protecting wealth |
| PRE_RETIREMENT | ≥ 58 | Pre-Retirement | Preserving wealth and reducing risk |

Note: This is separate from the dashboard's `getLifeStage(dob)` which uses different brackets for narrative purposes.

### Weight Tables (all sum to 100)

| Component | Early Career | Establishing | Consolidating | Peak Earning | Pre-Retirement |
|-----------|:-:|:-:|:-:|:-:|:-:|
| Emergency Fund | 16 | 16 | 14 | 13 | 14 |
| Insurance | 11 | 16 | 16 | 19 | 21 |
| Liability Mgmt | 8 | 10 | 10 | 10 | 11 |
| **Tier 1 Total** | **35** | **42** | **40** | **42** | **46** |
| Investment Regularity | 20 | 15 | 13 | 11 | 9 |
| Goal Clarity | 16 | 14 | 13 | 10 | 8 |
| Behavioural Tendencies | 9 | 9 | 11 | 12 | 12 |
| **Tier 2 Total** | **45** | **38** | **37** | **33** | **29** |
| Portfolio Understanding | 9 | 9 | 10 | 11 | 12 |
| Tax Literacy | 2 | 6 | 8 | 9 | 9 |
| Asset Diversity | 9 | 5 | 5 | 5 | 4 |
| **Tier 3 Total** | **20** | **20** | **23** | **25** | **25** |

### Income-Based Tax Cap

After applying life stage weights, the tax literacy max is capped based on income:

| Annual Income | Tax Max |
|---------------|---------|
| ₹0 | 0 (no income = no tax relevance) |
| < ₹5L | min(stage weight, 2) |
| < ₹12L | min(stage weight, 5) |
| < ₹25L | stage weight (unchanged) |
| ≥ ₹25L | stage weight + 2 (bonus) |

Any difference is redistributed to `portfolioUnderstanding` to keep Tier 3 constant.

### Score Scaling

Each component is scored using its original thresholds (raw out of original max), then scaled:
```
scaledScore = round((rawScore / originalMax) × dynamicWeight)
```

Exception: Insurance and Liabilities are computed directly against their dynamic weight (not scaled from a raw score) because their logic was restructured.

---

## Tier 1: Foundation

### Emergency Fund
`ideal = expenses.effectiveMonthly × 6`

| emRatio (actual / ideal) | Raw Score (out of 15) |
|--------------------------|----------------------|
| ≥ 2.0 | 15 |
| ≥ 1.0 | 12 |
| ≥ 0.75 | 9 |
| ≥ 0.5 | 6 |
| ≥ 0.25 | 3 |
| < 0.25 | 1 |

### Insurance Coverage

**When no dependents (idealLife = 0):**
All insurance weight goes to health scoring. No free points for life insurance.
- ≥ idealHealth → full weight
- ≥ 50% idealHealth → scaled 5/8 of weight
- else → scaled 2/8 of weight (floor)

**When dependents exist:**
Split ~53% health / ~47% life (same ratio as original 8/7).
- Health and life each scored against their sub-weight using the same thresholds.

### Liability Management — with Cushion Ratio

Two dimensions: **serviceability** (emiRatio) and **coverability** (cushionRatio).

```
emiRatio = totalEmi / monthlyIncome (if income=0 and EMI>0 → 1.0)
liquidAssets = totalAssets − realEstate
cushionRatio = liquidAssets / badDebtOutstanding (if no bad debt → Infinity)
```

| Condition | Score (% of weight) |
|-----------|:------------------:|
| No liabilities | 100% |
| Only good debt + emiRatio ≤ 0.4 | 100% |
| Only good debt + emiRatio > 0.4 | 40% |
| Bad debt + cushionRatio ≥ 5 | 80% (trivial debt) |
| Bad debt + cushionRatio ≥ 2 + emiRatio ≤ 0.4 | 60% |
| Good > Bad + emiRatio ≤ 0.4 | 70% |
| Good > Bad + emiRatio > 0.4 | 40% |
| Bad debt + cushionRatio ≥ 1 + emiRatio ≤ 0.2 | 40% |
| Bad debt + cushionRatio < 1 | 20% |
| Bad debt + cushionRatio < 1 + emiRatio high | 10% (worst) |

---

## Tier 2: Behaviour

### Investment Regularity
`sipRatio = (inv_monthly_sip × 12) / income.total × 100`

| sipRatio | Raw Score (out of 15) |
|----------|----------------------|
| > 30% | 15 |
| ≥ 20% | 14 |
| ≥ 15% | 12 |
| ≥ 10% | 9 |
| ≥ 5% | 6 |
| > 0% | 2 |
| 0% | 0 |

Consistency multiplier (`sip_consecutive_months`): ≥6mo → ×1.0, ≥3mo → ×0.9, <3mo → ×0.8

### Goal Clarity
Based on timed goals (years > 0): ≥3 → 15, 2 → 10, 1 → 6, untimed → 3, none → 0

### Behavioural Tendencies
9 questions, 5 positive + 4 inverted. `score = (rawTotal / 45) × 10`

---

## Tier 3: Awareness

### Portfolio Understanding
Based on `beh_product_understanding` (1–5):
- 5 → 10, 4 → 8, 3 → 6, 2 → 3, 1 → 1, **missing → 0** (no credit for unanswered)

### Tax & Regime Literacy
- If income = 0 → 0 (no free points)
- Correct regime + deductions → 5
- Correct regime only → 3
- Mismatch with small gap (≤ ₹5K) → 2
- Mismatch → 0

### Asset Diversity (age-aware)
Scored against ideal allocation ranges for the user's age, not a flat concentration check.

**Ideal Allocation Ranges (%)**

| Age | Equity | Debt | Commodity | Alt | Real Estate |
|-----|--------|------|-----------|-----|-------------|
| < 30 | 50–85 | 0–30 | 0–20 | 0–15 | 0–25 |
| 30–40 | 40–75 | 5–35 | 0–20 | 0–15 | 0–30 |
| 40–50 | 30–65 | 10–40 | 0–20 | 0–10 | 0–35 |
| 50–60 | 20–50 | 20–55 | 0–20 | 0–10 | 0–35 |
| 60+ | 10–35 | 35–65 | 0–15 | 0–10 | 0–35 |

For each class, deviation = distance outside ideal range (0 if within range). Sum all deviations.

| Total Deviation | Raw Score (out of 5) |
|-----------------|---------------------|
| 0 | 5 |
| ≤ 15 | 4 |
| ≤ 30 | 3 |
| ≤ 50 | 2 |
| ≤ 70 | 1 |
| > 70 | 0 |

If total assets = 0, score = 0.

---

## Fragility Penalty (up to −25 total)

### Standalone Revolving Penalty (up to −10)
```
With income:    MIN(10, FLOOR(revolving_balance / monthly_income) × 3)
Without income: MIN(10, CEIL(revolving_balance / 50000) × 3)
```

### Combination Flags
- `zeroEmergency` = scaled emergency fund ≤ scaled minimum
- `zeroInsurance` = scaled insurance ≤ scaled minimum
- `highBadDebt` = bad debt > 0 AND cushionRatio < 2 AND (income=0 OR badDebt ≥ income×2)

Key change: `highBadDebt` now fires when income=0 (previously required income>0). But **exempted when cushionRatio ≥ 2** (assets comfortably cover the debt).

### Penalty Table

| Combination | Base | Revolving majority | Heavy EMI CC |
|---|---|---|---|
| All three | −15 | — | — |
| zeroEmergency + zeroInsurance | −8 | — | — |
| zeroEmergency + highBadDebt | −6 | ×1.5 → −9 | ×1.2 → −7 |
| zeroInsurance + highBadDebt | −5 | ×1.5 → −8 | ×1.2 → −6 |
| Single flag alone | 0 | — | — |

### Final Score
```
FBS = CLAMP(raw_total − revolving_penalty − fragility_penalty, 0, 100)
```

---

## API Response

```json
{
  "total": 45,
  "breakdown": { "emergencyFund": 10, "insurance": 6, "liabilities": 8, ... },
  "subScores": {
    "foundation": { "score": 24, "max": 35 },
    "behaviour": { "score": 15, "max": 45 },
    "awareness": { "score": 6, "max": 20 }
  },
  "fragility": { "penalty": 0, "fragilityPenalty": 0, "revolvingPenalty": 0, "flags": [] },
  "lifeStage": { "key": "EARLY_CAREER", "label": "Early Career", "description": "Building foundations and habits" },
  "appliedWeights": { "emergencyFund": 16, "insurance": 11, ... }
}
```

---

## Known Issues Under Review

### Zero-income user with bad debt scored too high (previously)
A user with no income, no savings, and ₹1L bad debt was scoring ~37. Root causes:
1. Life insurance auto-waived (7 free points for no dependents)
2. Portfolio understanding defaulted to 6/10 when unanswered
3. emiRatio defaulted to 0 when income=0 (bad debt looked harmless)
4. Fragility penalty required income>0 to fire highBadDebt flag
5. Tax literacy gave 3 free points for matching default regime with zero income

All five issues are now fixed in the dynamic weight refactor.
