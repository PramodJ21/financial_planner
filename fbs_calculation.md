# FBS (Financial Health Score) — Revised Calculation Logic

The FBS is a score from **0 to 100** measuring a user's financial health.

---

## Core Philosophy

The score is **situation-driven, not age-driven.** Age is a proxy — it assumes what your life looks like based on how old you are. The data collected from the questionnaire already tells us the actual situation. We use that.

**Every rupee should have a job.** Surplus (income not going to needs, wants, or savings) is not neutral — it means money is sitting idle, losing value to inflation. The goal is surplus = 0, with all available money after needs and wants directed toward savings and investments.

> **One exception:** Asset allocation ideals (equity vs debt ratio) still use age, because time horizon to retirement is genuinely age-dependent and no better signal exists in the data.

---

## Questionnaire Data Flow

Goals are captured **before** the investments section. This separates two distinct types of saving:

- **Goal SIPs** — monthly amount saved toward each specific goal (captured per goal in the goals step). Each goal has: name, target amount, timeframe (years), monthly SIP.
- **General SIP** — monthly investment not tied to any specific goal (captured in investments step, with explicit note to exclude goal SIPs).

```
totalSip = sum(all goal SIPs) + generalSip
```

**Target amount is mandatory for each goal** — a goal without a target cannot be assessed for sufficiency.

---

## Terminology — Key Definitions

### `effectiveMonthly`

```
effectiveMonthly = needs + wants
```

This is total monthly expenditure — the sum of needs spending and wants spending as defined in the 50/30/20 framework. It explicitly excludes investments and savings. Used for emergency fund sizing and budget analysis.

### `requiredSip`

The monthly SIP amount needed to reach an inflation-adjusted goal target:

```
requiredSip = (inflationAdjustedTarget × r) / ((1+r)^n - 1)

where:
  inflationAdjustedTarget = targetAmount × (1 + inflationRate)^years
  r                       = monthlyReturnRate
  n                       = years × 12  (total months)
  inflationRate           = 0.06  (6% annual, Indian market default)
  monthlyReturnRate       = 0.01  (12% annual, default for equity-heavy goals)
```

> **Override:** If the user specifies an expected return rate in their goal setup, use that rate instead of the 12% default. Convert the annual rate to monthly with `r = (1 + annualRate)^(1/12) - 1`.

---

## The 10 Dimensions and Base Weights

Health Insurance and Life Insurance are separate dimensions — they have different triggers and should not be bundled.

| # | Dimension | Base Weight | What Drives It |
|---|---|:---:|---|
| 1 | Emergency Fund | 15 | Universal |
| 2 | Health Insurance | 12 | Universal |
| 3 | Life Insurance | 8 | Dependents only |
| 4 | Liability Management | 12 | Universal |
| 5 | Investment Regularity | 15 | Universal — no age excuse |
| 6 | Goal Clarity | 10 | Universal |
| 7 | Behavioral Tendencies | 10 | Universal |
| 8 | Tax Literacy | 8 | Income level |
| 9 | Asset Diversity | 5 | Portfolio size |
| 10 | Portfolio Understanding | 5 | Universal |
| | **Total** | **100** | |

---

## Situational Weight Adjustments

Applied before scoring. Shift weight from irrelevant dimensions to relevant ones based on actual user data.

### Rule 1 — No Dependents
Life insurance is not applicable. Weight moves to Health Insurance.

```
if dependents == 0 AND marital_status != 'Married':
    Life Insurance weight = 0
    Health Insurance weight = 20
```

### Rule 2 — Income Level Caps Tax Literacy
Tax planning has limited value at low income. Unused weight moves to Investment Regularity.

| Annual Income | Tax Weight | Transferred to Investment Regularity |
|---|:---:|:---:|
| = 0 | 0 | +8 |
| < ₹5L | 2 | +6 |
| ₹5L – ₹10L | 5 | +3 |
| > ₹10L | 8 | 0 |

### Rule 3 — Small Portfolio Reduces Asset Diversity
Diversification is meaningless on a tiny portfolio. Unused weight moves to Investment Regularity.

| Total Assets | Diversity Weight | Transferred to Investment Regularity |
|---|:---:|:---:|
| < ₹1L | 0 | +5 |
| ₹1L – ₹5L | 2 | +3 |
| > ₹5L | 5 | 0 |

---

## Scoring Each Dimension

All dimensions score on a **0–10 raw scale**, then scaled to their effective weight:

```
scaled_score = round((raw / 10) × weight)
```

---

### 1. Emergency Fund

No dedicated input field. Derived from existing asset data.

```
stableAssets     = savings_balance + fd_balance
effectiveMonthly = needs + wants   (see Terminology section)
ideal            = effectiveMonthly × 6
ratio            = stableAssets / ideal
```

| Ratio | Raw Score |
|---|:---:|
| 0% | 0 |
| > 0% – 25% | 2 |
| 25% – 50% | 4 |
| 50% – 75% | 6 |
| 75% – 99% | 8 |
| 100%+ | 10 |

**Action plan logic (not scoring):**
- `stableAssets < ideal` but `totalAssets ≥ ideal` → "move funds from investments to stable instruments"
- `totalAssets < ideal` → "build emergency fund from monthly surplus"

---

### 2. Health Insurance

**[FAIRNESS FIX — Tiered ideal formula]**
The previous formula `max(₹5L, income × 0.5)` was regressive: a person earning ₹3L/year would have an ideal of ₹15L, which is 5× their income — an unachievable and unfair target. The tiered formula below is grounded in standard Indian family floater recommendations and is proportionally fair across income levels.

```
if annual_income < ₹5,00,000:
    ideal = ₹3,00,000
elif annual_income < ₹15,00,000:
    ideal = ₹5,00,000
elif annual_income < ₹30,00,000:
    ideal = ₹10,00,000
else:
    ideal = ₹15,00,000

ratio = health_cover / ideal
```

| Ratio | Raw Score |
|---|:---:|
| 0% | 0 |
| > 0% – 49% | 3 |
| 50% – 79% | 6 |
| 80% – 99% | 8 |
| 100%+ | 10 |

---

### 3. Life Insurance

If no dependents → raw = 10 automatically (not applicable = not a gap). Weight is 0 from Rule 1.

If has dependents:

```
ideal = annual_income × 10  (rounded to nearest ₹25L)
ratio = life_cover / ideal
```

| Ratio | Raw Score |
|---|:---:|
| 0% | 0 |
| > 0% – 49% | 3 |
| 50% – 79% | 6 |
| 80% – 99% | 8 |
| 100%+ | 10 |

---

### 4. Liability Management

Good debt = Home Loan, Education Loan. Everything else = bad debt.

Good debt and bad debt are assessed separately and combined.

```
goodEmiRatio = goodDebtEmi / monthlyIncome
badEmiRatio  = badDebtEmi / monthlyIncome
liquidAssets = totalAssets − realEstateValue
cushionRatio = liquidAssets / badOutstanding   (∞ if no bad debt)
```

**Good debt component (0–5):**

| Situation | Points |
|---|:---:|
| No good debt | 5 |
| goodEmiRatio ≤ 35% | 5 |
| goodEmiRatio 36–45% | 3 |
| goodEmiRatio > 45% | 1 |

**Bad debt component (0–5):**

| Situation | Points |
|---|:---:|
| No bad debt | 5 |
| badEmiRatio < 10% AND cushionRatio ≥ 3 | 4 |
| badEmiRatio < 10% AND cushionRatio 1–3 | 3 |
| badEmiRatio 10–20% AND cushionRatio ≥ 2 | 2 |
| badEmiRatio > 20% OR cushionRatio < 1 | 0 |

```
liabilityRaw = goodDebtComponent + badDebtComponent   (max 10)
```

If `monthlyIncome = 0` and any EMIs exist → `goodEmiRatio = 1`, `badEmiRatio = 1` (worst case).

---

### 5. Investment Regularity

**The 50/30/20 Framework:**

```
needs    = rent + utilities + subscriptions + (annualInsurance/12)
           + (annualEducation/12) + totalEmi
wants    = household + transport + discretionary
           + (travel/12) + (other/12)
           + (groceries component of food) + (diningOut component of food)
savings  = totalSip

effectiveMonthly = needs + wants   (total monthly expenditure, excluding investments/savings)
couldSave        = monthlyIncome − needs − wants
savingsRate      = totalSip / monthlyIncome × 100
utilizationRate  = totalSip / couldSave × 100   (if couldSave > 0)
```

**Food categorization — [PRACTICALITY FIX]**
Food spending is split into two sub-categories because the nature of the spend differs:
- `groceries` (essential nutrition) → classified as **needs**
- `diningOut` (restaurants, cafes, takeaway) → classified as **wants**

If the user provides only a combined `food` field (no breakdown), apply a default 70/30 split:
```
groceries = food × 0.70   → needs
diningOut = food × 0.30   → wants
```

If the user provides explicit `groceries` and `diningOut` fields, use those directly.

**Target: savings ≥ 20% of income. Every rupee not going to needs or wants should be invested. Surplus = 0 is the goal.**

**[FAIRNESS FIX — Irregular income cash buffer exception]**
For users with `income_type = 'irregular'` (freelancers, self-employed, contract workers), income is lumpy and unpredictable. Holding cash beyond needs and wants is not idle money — it is a working capital buffer. Therefore: if `income_type = 'irregular'`, exclude up to 3 months of `effectiveMonthly` from the surplus before computing `utilizationRate`. This buffer is not penalised.

```
if income_type == 'irregular':
    allowedBuffer = effectiveMonthly × 3
    adjustedSurplus = max(0, couldSave − allowedBuffer)
    utilizationRate = totalSip / (couldSave − allowedBuffer) × 100
                    (if couldSave > allowedBuffer, else utilizationRate = 100)
else:
    utilizationRate = totalSip / couldSave × 100   (if couldSave > 0)
```

| Situation | Raw Score |
|---|:---:|
| savingsRate ≥ 20% AND utilizationRate ≥ 80% | 10 |
| savingsRate ≥ 20% AND utilizationRate 50–79% | 8 |
| savingsRate 15–19% AND utilizationRate ≥ 80% | 7 |
| savingsRate 10–19% AND utilizationRate 50–79% | 6 |
| savingsRate 10–19% AND utilizationRate < 50% | 4 |
| savingsRate < 10% AND couldSave < 10% of income | 3 |
| savingsRate < 10% AND couldSave ≥ 20% of income | 1 |
| savingsRate = 0 AND couldSave > 0 | 0 |
| couldSave ≤ 0 (spending ≥ income after needs+wants) | 0 |

Consistency multiplier applied after:

| Consecutive SIP Months | Multiplier |
|---|:---:|
| < 3 | × 0.8 |
| 3 – 5 | × 0.9 |
| 6+ | × 1.0 |

**No age adjustment.** A 50-year-old not investing scores the same as a 25-year-old not investing.

**Action plan uses `couldSave` to tell users exactly where idle money should go** — emergency fund first, then underfunded goal SIPs, then general investments.

---

### 6. Goal Clarity

Two components scored separately and combined.

**Component A — Goal Definition (0–5):**

| Situation | Points |
|---|:---:|
| No goals defined | 0 |
| Has goals, none have a timeframe | 1 |
| 1 timed goal | 3 |
| 2+ timed goals | 5 |

**Component B — Saving Quality (0–5):**

**[PRACTICALITY FIX — requiredSip formula defined]**
See the `requiredSip` definition in the Terminology section for the complete formula.

**[FAIRNESS FIX — Average across all active goals]**
The previous approach scored only the best-performing active goal, which rewarded users who funded one goal while ignoring others. The corrected formula averages across all active goals so that fully funding every goal is what earns a top score.

```
For each active goal with a target amount:
    goalScore_i = min(5, (actualSip_i / requiredSip_i) × 5)

savingQualityScore = average(goalScore_i) across all active goals with a target
```

Each individual goal contribution is capped at 5. If a user has no active goals or none have a target, fall back to the table below.

| Situation | Points |
|---|:---:|
| Not saving toward any goal | 0 |
| Saving but no target entered on any goal | 1 |
| Has targets — use `savingQualityScore` formula above | 0–5 (continuous) |

```
goalClarityRaw = Component A + Component B   (max 10)
```

---

### 7. Behavioral Tendencies

`beh_product_understanding` is **excluded** — it belongs only to Portfolio Understanding. Fixes the double-counting from the old model.

**Positive factors** (1–5, higher = better):
- `beh_review_monthly`
- `beh_avoid_debt`
- `beh_market_reaction`
- `beh_windfall_behaviour`

**Negative factors** (1–5, higher = worse, inverted as `6 − value`):
- `beh_delay_decisions`
- `beh_spend_impulsively`
- `beh_hold_losing`
- `beh_compare_peers`

```
rawTotal = sum of all 8 converted scores   (max = 8 × 5 = 40)
raw      = round((rawTotal / 40) × 10)
```

Missing fields default to **3 (neutral)**, not worst case.

**[FAIRNESS FIX — Calibration note on self-assessment bias]**
Behavioral scores are self-assessed and subject to optimism or cultural reporting bias. To reduce the effect of this on scoring:
- **For users with prior FBS records:** behavioral scores should be evaluated primarily as a **trajectory** (improving, stable, or declining) relative to their own historical scores, not as absolute values against the scale. A score of 6 that was 4 last quarter is more meaningful than a static 6.
- **For new users:** the behavioral score is a **baseline snapshot**, not a definitive judgment. Action plan language should reflect this: "This is your starting point — we'll track how this changes over time."

This does not change the numeric calculation. It governs how the score is communicated in the action plan and dashboard copy.

---

### 8. Tax Literacy

If `annual_income = 0` → raw = 0.

```
recommended   = regime (Old / New) with lower computed tax liability
opted         = tax_regime from questionnaire
hasDeductions = any of (80C, NPS, HRA, HomeLoan interest, 80D) > 0
```

| Condition | Raw Score |
|---|:---:|
| Opted = recommended AND has deductions | 10 |
| Opted = recommended, no deductions used | 6 |
| Wrong regime, potential savings ≤ ₹5K | 4 |
| Wrong regime, potential savings > ₹5K | 0 |

Scaled to effective weight from Rule 2.

---

### 9. Asset Diversity

Age is used here — the one dimension where time horizon genuinely matters.

**Age-based ideal allocation ranges:**

| Age | Equity | Debt | Commodity | Alt | Real Estate |
|---|---|---|---|---|---|
| < 30 | 50–85% | 0–30% | 0–20% | 0–10% | 0–20% |
| 30–40 | 40–75% | 5–35% | 0–20% | 0–10% | 0–20% |
| 41–50 | 30–65% | 10–40% | 0–20% | 0–10% | 0–20% |
| 51–60 | 20–50% | 20–55% | 0–20% | 0–10% | 0–20% |
| 60+ | 10–35% | 35–65% | 0–15% | 0–10% | 0–20% |

**[PRACTICALITY FIX — Alt and Real Estate ideal ranges defined]**
- `alt` covers gold, REITs, InvITs, and other alternative assets. The 0–10% band applies across all age groups; small allocations are acceptable but heavy concentration in alternatives is discouraged.
- `realEstate` covers direct property holdings, **excluding the user's primary residence** (which is not an investable asset). The 0–20% band applies across all age groups.
- Both classes use the same deviation formula as equity, debt, and commodity.

**[FAIRNESS FIX — Short-horizon goal modifier for debt/equity bands]**
If the user has at least one active goal with a time horizon of 4 years or less, capital preservation matters more than growth for that portion of the portfolio. Apply the following modifier to the age-based bands for the duration that such a goal is active:
- Widen the debt ideal range by +15 percentage points on the upper bound (capped at 60%)
- Reduce the equity minimum by 15 percentage points (floored at 0%)

Example for age < 30 with a 3-year goal active: equity band becomes 35–85%, debt band becomes 0–45% (capped at 45%, not 30+15=45 which is under the 60 cap). This modifier does not stack — apply it once regardless of how many short-horizon goals exist.

```
deviation per class = 0 if actual% is within [min, max]
                    = gap to nearest boundary if outside

totalDeviation = sum across equity + debt + commodity + alt + realEstate
```

| Total Deviation | Raw Score |
|---|:---:|
| 0 | 10 |
| ≤ 10 | 8 |
| ≤ 25 | 6 |
| ≤ 40 | 4 |
| ≤ 60 | 2 |
| > 60 | 0 |

If `total_assets < ₹1L` → weight is 0 from Rule 3, dimension skipped.

---

### 10. Portfolio Understanding

Standalone. Not shared with Behavioral Tendencies.

Input: `beh_product_understanding` (1–5 self-assessed)

| Value | Raw Score |
|---|:---:|
| 0 / not answered | 0 |
| 1 | 1 |
| 2 | 3 |
| 3 | 6 |
| 4 | 8 |
| 5 | 10 |

---

## Fragility Penalties

Subtracted from raw total after all dimensions are scored.

### Revolving Credit Card Penalty (0–10 pts)

Revolving credit card balances (minimum-due only) carry 36–42% interest and are penalised independently.

**[PRACTICALITY FIX — Smooth linear formula replaces floor() cliff]**
The previous `floor(revolvingBalance / monthlyIncome) × 3` formula produced a step-function: a balance of 0.99× income and 1.0× income received the same penalty, but 1.0× and 1.01× income jumped by 3 points. This is replaced with a smooth linear calculation that penalises proportionally at every point.

```
if monthlyIncome > 0:
    ratio   = revolvingBalance / monthlyIncome
    penalty = min(10, round(ratio × 3, 1))
else:
    penalty = min(10, round((revolvingBalance / 50000) × 3, 1))
```

### Combination Fragility Penalty (0–15 pts)

Triggered when critical gaps occur together — the combination is worse than the sum of parts.

```
zeroEmergency = stableAssets == 0
zeroInsurance = health_cover == 0 AND life_cover == 0
highBadDebt   = badOutstanding > 0
                AND cushionRatio < 2
                AND (income == 0 OR badOutstanding ≥ monthlyIncome × 2)
```

| Flags Active | Penalty |
|---|:---:|
| All three | 15 |
| zeroEmergency + zeroInsurance | 8 |
| zeroEmergency + highBadDebt | 6 |
| zeroInsurance + highBadDebt | 5 |

**[FAIRNESS FIX — New earner carve-out for combination penalty]**
New earners (less than 12 months employed) are statistically likely to have all three fragility flags simply because they have not had time to build savings, insurance, or pay down inherited or student debt. Applying the full −15 penalty at this stage is counterproductive and discouraging.

```
if months_employed < 12:
    fragilityPenalty = min(fragilityPenalty, 5)
```

Action plan note for affected users: "Your combination score reflects the early stage of your financial journey — this is expected, not a failure. Most of these gaps close within 12–18 months of consistent saving."

---

## Final Score

```
rawTotal = sum of all 10 scaled dimension scores
penalty  = revolvingPenalty + fragilityPenalty
FBS      = clamp(rawTotal − penalty, 0, 100)
```

---

## Summary of Changes From Old Model

| Old | New |
|---|---|
| 5 age-based weight tables | Fixed base weights + 3 situational rules |
| 9 dimensions | 10 — Health and Life Insurance separated |
| Dedicated `emergency_fund` input | Derived from `savings_balance + fd_balance` |
| Life insurance weight assumed from age | Only applies if user has actual dependents |
| Investment Regularity: SIP % of income only | 50/30/20 framework: savings rate + utilization rate |
| Surplus treated as neutral / leftover | Surplus = idle money = penalised in scoring |
| Single combined EMI ratio for all debt | Separate goodEmiRatio and badEmiRatio thresholds |
| Goal Clarity: measures intent only | Measures execution — is goal SIP sufficient? |
| Goal SIP bundled with general SIP | Separated — goal SIPs captured before investments step |
| `beh_product_understanding` in two dimensions | Only in Portfolio Understanding |
| Behavioral missing fields default to worst case | Default to neutral (3) |
| Insurance scored on 2 tiers | 4 tiers — gradual slope, no brutal cliff |
| Health insurance ideal = max(₹5L, income × 0.5) | Tiered ideal by income band — proportionally fair |
| Surplus always penalised regardless of income type | Irregular income earners exempt up to 3-month cash buffer |
| Asset Diversity table missing alt and real estate | All 5 asset classes defined with ideal ranges |
| Goal Clarity B scores best goal only | Averages across all active goals |
| `requiredSip` undefined | Full formula with inflation and return rate documented |
| `effectiveMonthly` undefined | Explicitly defined as needs + wants |
| `floor()` in revolving credit penalty | Smooth linear formula — no income-multiple cliffs |
| Food categorised entirely as wants | Groceries → needs, dining out → wants (70/30 default) |
| Full combination penalty for new earners | Capped at −5 if months_employed < 12 |
| Behavioral score absolute-only | Trajectory-aware for returning users; baseline note for new users |
| Short-horizon goals ignored in asset allocation | Debt band widened +15%, equity minimum reduced 15% for ≤4yr goals |
