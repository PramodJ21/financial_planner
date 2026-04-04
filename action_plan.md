# Action Plan Generation — Technical Specification

This document defines the complete logic for generating a prioritized, personalized action plan from a user's financial profile after each FBS calculation. It is a developer-facing spec, not consumer copy.

---

## 1. Action Plan Philosophy

### Purpose

The action plan exists to close the gap between a user's **current FBS** and their **potential FBS** — the score they would achieve if all correctable gaps were addressed. It is not a general financial education tool. Every item must be triggered by a specific condition found in the user's actual data, and must include numbers derived from that data.

### Generation Trigger

The action plan is regenerated after every successful FBS calculation. It is not generated on stale data. If no questionnaire data exists, no action plan is produced.

### Volume Control

Surface **3 to 5 items** per generation cycle. Do not flood the user with every possible gap. The selection algorithm (Section 2) ranks all candidate items by priority score and takes the top N, subject to the following constraints:

- At least one item must be `immediate` timeframe if any `immediate` items exist.
- No more than two items from the same dimension in a single generation cycle.
- If a bundled Combination Fragility action is triggered (Section 7), it counts as one item and suppresses individual items from its constituent dimensions for that cycle.

### Timeframe Definitions

| Timeframe | Window | Meaning |
|---|---|---|
| `immediate` | This calendar month | Financial risk is actively accumulating or a critical gap exists with no buffer. User must act now. |
| `short_term` | 1 – 3 months | Important gap, but not an emergency. Should be resolved within the quarter. |
| `long_term` | 3+ months | Structural improvement. Requires planning, not just execution. |

---

## 2. Priority Scoring System

Every candidate action item receives a **priority score from 0 to 100**, computed as a weighted sum of three components.

### Component Definitions

```
priorityScore = (fbsImpact × 0.40) + (urgency × 0.35) + (effortInverse × 0.25)
```

All three components are scored on a **0 – 100 scale** before weighting.

---

#### Component 1: FBS Impact (weight 40%)

How much would resolving this issue improve the FBS score?

Compute the user's FBS with the gap closed (set the deficient dimension to its maximum possible raw score) and compare to the actual FBS:

```
potentialGain  = FBS_if_gap_closed − FBS_actual
fbsImpactScore = min(100, round((potentialGain / 20) × 100))
```

The divisor of 20 means a potential gain of 20 or more FBS points maps to a score of 100. Gains below 20 scale linearly. Use 20 as the ceiling reference because no single dimension can realistically contribute more than ~20 points after weight redistribution.

**Dimension-level FBS impact reference (approximate, before weight adjustments):**

| Dimension | Base Weight | Max Possible Contribution |
|---|:---:|:---:|
| Emergency Fund | 15 | 15 pts |
| Health Insurance | 12 (up to 20 with Rule 1) | up to 20 pts |
| Life Insurance | 8 (0 if no dependents) | 8 pts |
| Liability Management | 12 | 12 pts |
| Investment Regularity | 15 (up to 28 with Rules 2+3) | up to 28 pts |
| Goal Clarity | 10 | 10 pts |
| Behavioral Tendencies | 10 | 10 pts |
| Tax Literacy | 8 (down to 0 for low income) | 8 pts |
| Asset Diversity | 5 (0 for small portfolios) | 5 pts |
| Portfolio Understanding | 5 | 5 pts |

---

#### Component 2: Urgency (weight 35%)

Is a financial penalty, compounding loss, or irreversible harm accumulating right now?

Score urgency on the following scale:

| Urgency Level | Score | Example Conditions |
|---|:---:|---|
| Critical — active financial damage | 100 | Revolving CC balance, zero emergency fund + active income risk, no health insurance |
| High — gap has near-term consequences | 75 | Bad debt EMI ratio > 20%, goal with < 2 years remaining and no SIP, combination fragility active |
| Moderate — gap matters but not bleeding | 50 | Wrong tax regime, underweight emergency fund (< 50% of ideal), SIP below required |
| Low — structural gap, no immediate cost | 25 | No goals defined, sub-optimal asset allocation, low portfolio understanding |

---

#### Component 3: Effort Inverse (weight 25%)

How easy is it to take action? Low effort = higher priority (this component rewards actionable items).

```
effortInverse = 100 − effortScore
```

Effort is rated on the following scale:

| Effort Level | effortScore | Examples |
|---|:---:|---|
| Very Low — single app action, under 10 minutes | 10 | Set up SIP on existing platform, move FD to liquid fund, pay CC balance in full |
| Low — requires one external step | 30 | Open a new SIP, set a budget in a budgeting app, check tax regime with CA |
| Medium — requires research + decision + action | 55 | Buy health insurance plan (comparison, KYC), prepay a loan |
| High — multi-step process over days/weeks | 75 | Debt consolidation, term insurance purchase, estate plan setup |
| Very High — requires professional engagement over months | 90 | Major portfolio restructuring, large loan refinancing |

---

### Final Priority Score

```
priorityScore = round(
    (fbsImpactScore × 0.40) +
    (urgency × 0.35) +
    (effortInverse × 0.25)
)
```

Items are ranked descending by `priorityScore`. The top 3–5 (subject to constraints in Section 1) are surfaced to the user.

---

## 3. Action Items by Dimension

For each dimension, the following are defined:
- **Trigger condition** — the data condition that creates the action item
- **Action text** — the message shown to the user, with data variables in `{curly_braces}`
- **Priority score range** — approximate range based on the three components
- **Timeframe** — `immediate`, `short_term`, or `long_term`

Monetary values are always in INR. All variables refer to computed values from the FBS engine.

---

### Dimension 1: Emergency Fund

**Ideal:** `effectiveMonthly × 6`
**stableAssets:** `savings_balance + fd_balance`

---

**Action 1.1 — Zero Emergency Fund**

- **Trigger:** `stableAssets == 0`
- **Action text:** "You have no emergency fund. Your monthly expenses are ₹{effectiveMonthly}. Start by saving ₹{effectiveMonthly} (1 month of expenses) in a savings account or liquid fund before any other financial goal. This is your financial floor."
- **Priority range:** 70 – 90
- **Timeframe:** `immediate`

---

**Action 1.2 — Emergency Fund Below 3 Months**

- **Trigger:** `stableAssets > 0 AND stableAssets < effectiveMonthly × 3`
- **Action text:** "Your emergency fund covers {round(stableAssets / effectiveMonthly, 1)} months of expenses. The minimum safe level is 3 months (₹{effectiveMonthly × 3}). You need ₹{(effectiveMonthly × 3) − stableAssets} more. Redirect your surplus of ₹{couldSave} per month here first."
- **Priority range:** 60 – 80
- **Timeframe:** `immediate`

---

**Action 1.3 — Emergency Fund 3–6 Months (Below Ideal)**

- **Trigger:** `stableAssets >= effectiveMonthly × 3 AND stableAssets < effectiveMonthly × 6`
- **Action text:** "Your emergency fund covers {round(stableAssets / effectiveMonthly, 1)} months of expenses — a good start, but the ideal is 6 months (₹{effectiveMonthly × 6}). You need ₹{(effectiveMonthly × 6) − stableAssets} more to reach full safety. Add ₹{round(((effectiveMonthly × 6) − stableAssets) / 6)} per month over the next 6 months to close this."
- **Priority range:** 35 – 55
- **Timeframe:** `short_term`

---

**Action 1.4 — Funds Held in Investments Instead of Stable Assets**

- **Trigger:** `stableAssets < effectiveMonthly × 6 AND totalAssets >= effectiveMonthly × 6`
- **Action text:** "You have enough total assets (₹{totalAssets}) to fully fund your emergency reserve, but they are held in investments rather than stable instruments. Move ₹{(effectiveMonthly × 6) − stableAssets} from your investment portfolio to a liquid fund or savings account. This improves your FBS without requiring additional savings."
- **Priority range:** 55 – 70
- **Timeframe:** `immediate`
- **Note:** This action takes precedence over Action 1.2 or 1.3 when `totalAssets >= ideal`.

---

### Dimension 2: Health Insurance

**Ideal (tiered):**
```
< ₹5L income  → ₹3,00,000
₹5L – ₹15L   → ₹5,00,000
₹15L – ₹30L  → ₹10,00,000
> ₹30L        → ₹15,00,000
```

---

**Action 2.1 — No Health Insurance**

- **Trigger:** `health_cover == 0`
- **Action text:** "You have zero health insurance coverage. A single hospitalisation in India costs ₹1–5L on average and can wipe out months of savings. Your recommended minimum cover is ₹{idealHealthCover}. Purchase a health insurance policy this month — this is the highest-leverage protection action you can take."
- **Priority range:** 75 – 95
- **Timeframe:** `immediate`

---

**Action 2.2 — Health Insurance Below 50% of Ideal**

- **Trigger:** `health_cover > 0 AND health_cover < idealHealthCover × 0.50`
- **Action text:** "Your current health cover is ₹{health_cover} — only {round(health_cover / idealHealthCover × 100)}% of the ₹{idealHealthCover} recommended for your income level. Upgrade your policy or add a top-up plan to reach at least ₹{idealHealthCover × 0.50}."
- **Priority range:** 55 – 75
- **Timeframe:** `short_term`

---

**Action 2.3 — Health Insurance 50%–79% of Ideal**

- **Trigger:** `health_cover >= idealHealthCover × 0.50 AND health_cover < idealHealthCover × 0.80`
- **Action text:** "Your health cover of ₹{health_cover} is adequate but below the ₹{idealHealthCover} recommended for your income. Consider adding a super top-up plan (typically ₹{round(annualIncome × 0.003)}–₹{round(annualIncome × 0.005)}/year) to bridge the gap affordably."
- **Priority range:** 30 – 50
- **Timeframe:** `short_term`

---

### Dimension 3: Life Insurance

**Applicable only if `dependents > 0 OR marital_status == 'Married'`.**

**Ideal:** `annual_income × 10` (rounded to nearest ₹25L)

---

**Action 3.1 — No Life Insurance with Dependents**

- **Trigger:** `life_cover == 0 AND (dependents > 0 OR marital_status == 'Married')`
- **Action text:** "You have {dependents} dependent(s) and no life insurance. Your income supports others — if that stops, they have no safety net. Your recommended term cover is ₹{idealLifeCover} (10× your annual income). A term plan for this amount typically costs ₹{round(idealLifeCover × 0.003)}–₹{round(idealLifeCover × 0.005)}/year. Get this in place this month."
- **Priority range:** 70 – 90
- **Timeframe:** `immediate`

---

**Action 3.2 — Life Insurance Below 50% of Ideal**

- **Trigger:** `life_cover > 0 AND life_cover < idealLifeCover × 0.50`
- **Action text:** "Your life cover of ₹{life_cover} is significantly below the ₹{idealLifeCover} recommended for your income and {dependents} dependent(s). Increase your term cover by ₹{idealLifeCover − life_cover} — additional riders on an existing term plan are often very affordable."
- **Priority range:** 50 – 70
- **Timeframe:** `short_term`

---

**Action 3.3 — Life Insurance 50%–79% of Ideal**

- **Trigger:** `life_cover >= idealLifeCover × 0.50 AND life_cover < idealLifeCover × 0.80`
- **Action text:** "Your life cover of ₹{life_cover} covers {round(life_cover / idealLifeCover × 100)}% of the ₹{idealLifeCover} ideal. You are partially protected but have a gap of ₹{idealLifeCover − life_cover}. Review whether a top-up term policy or rider can close this gap cost-effectively."
- **Priority range:** 25 – 45
- **Timeframe:** `long_term`

---

### Dimension 4: Liability Management

Liability actions are split into good debt (home, education) and bad debt (personal loans, credit cards).

---

#### 4A: Bad Debt Actions

**Action 4A.1 — Revolving Credit Card Balance**

- **Trigger:** `revolvingBalance > 0`
- **Action text:** "You are carrying a revolving credit card balance of ₹{revolvingBalance}. Credit card debt accrues at 36–42% annual interest — the most expensive debt in the market. Pay the full balance of ₹{revolvingBalance} this month. If you cannot do it in one payment, pay as much as possible above the minimum and treat this as your top financial emergency."
- **Priority range:** 80 – 100
- **Timeframe:** `immediate`
- **Note:** Also triggers the revolving CC penalty component of the FBS. This item is always surfaced when triggered, regardless of other volume constraints.

---

**Action 4A.2 — Bad Debt EMI Ratio 10%–20%**

- **Trigger:** `badEmiRatio >= 0.10 AND badEmiRatio <= 0.20`
- **Action text:** "Your personal loan / credit card EMIs consume {round(badEmiRatio × 100)}% of your monthly income (₹{badDebtEmi}/month). The safer threshold is below 10%. Prioritise prepaying the highest-interest bad debt first — see your repayment order below. Each ₹{round(badOutstanding × 0.10)} prepaid saves approximately ₹{round(badOutstanding × 0.10 × avgBadDebtRate)} in annual interest."
- **Priority range:** 55 – 75
- **Timeframe:** `short_term`

---

**Action 4A.3 — Bad Debt EMI Ratio Above 20%**

- **Trigger:** `badEmiRatio > 0.20`
- **Action text:** "Your high-interest debt EMIs are consuming {round(badEmiRatio × 100)}% of your income — above the safe limit of 20%. This is restricting your ability to save and invest. Do not start or increase any SIPs until this falls below 15%. Focus all available surplus (₹{couldSave}/month after needs and wants) on aggressively paying down bad debt."
- **Priority range:** 75 – 90
- **Timeframe:** `immediate`

---

**Action 4A.4 — Debt Consolidation Flag**

- **Trigger:** `count(personal_loans) + count(credit_cards) >= 3`
- **Action text:** "You are managing {count(personal_loans) + count(credit_cards)} separate high-interest debt accounts. Consider consolidating them into a single personal loan at a lower rate. A debt consolidation loan can reduce your effective interest rate and simplify repayment. Compare rates from your bank and NBFCs before deciding."
- **Priority range:** 40 – 60
- **Timeframe:** `short_term`

---

#### 4B: Good Debt Actions

**Action 4B.1 — Good Debt EMI Ratio 36%–45%**

- **Trigger:** `goodEmiRatio >= 0.36 AND goodEmiRatio <= 0.45`
- **Action text:** "Your home/education loan EMI is {round(goodEmiRatio × 100)}% of your monthly income. While home and education loans are considered productive debt, an EMI above 35% leaves limited room for savings. If your income increases in the next raise cycle, direct a portion toward loan prepayment to bring this ratio below 35%."
- **Priority range:** 30 – 50
- **Timeframe:** `long_term`

---

**Action 4B.2 — Good Debt EMI Ratio Above 45%**

- **Trigger:** `goodEmiRatio > 0.45`
- **Action text:** "Your home/education loan EMI is {round(goodEmiRatio × 100)}% of your monthly income — significantly above the recommended 35%. This severely constrains your financial flexibility. Explore partial prepayment (even ₹{round(goodOutstanding × 0.02)} annually can cut your tenure meaningfully) or refinancing to a lower rate."
- **Priority range:** 50 – 65
- **Timeframe:** `short_term`

---

### Dimension 5: Investment Regularity

---

**Action 5.1 — Zero Savings Rate with Available Surplus**

- **Trigger:** `totalSip == 0 AND couldSave > 0`
- **Action text:** "You have ₹{couldSave} in monthly surplus but are not investing anything. Even starting with ₹{min(couldSave, 500)} per month in a diversified equity mutual fund via SIP builds the habit. Open a SIP today — the best time to start was yesterday, the second best is now."
- **Priority range:** 70 – 85
- **Timeframe:** `immediate`

---

**Action 5.2 — Low Savings Rate (Below 10%) with Meaningful Surplus**

- **Trigger:** `savingsRate < 0.10 AND couldSave >= monthlyIncome × 0.20`
- **Action text:** "You are saving {round(savingsRate × 100)}% of your income but could save up to {round(couldSave / monthlyIncome × 100)}%. There is ₹{couldSave − totalSip} sitting idle each month after your expenses. Increase your SIP by ₹{round((couldSave − totalSip) × 0.50)} this month (half your idle surplus) — you will not feel the difference day-to-day but the compounding impact over 5 years is significant."
- **Priority range:** 55 – 70
- **Timeframe:** `short_term`

---

**Action 5.3 — Savings Rate 10%–19%, Low Utilisation**

- **Trigger:** `savingsRate >= 0.10 AND savingsRate < 0.20 AND utilizationRate < 0.50`
- **Action text:** "You are saving {round(savingsRate × 100)}% of your income, but your surplus utilisation is only {round(utilizationRate × 100)}%. You have ₹{couldSave − totalSip} per month sitting uninvested. Raise your SIP by ₹{round((couldSave − totalSip) × 0.60)} to cross the 20% savings rate threshold — that is the point where your money starts working hard for you."
- **Priority range:** 45 – 60
- **Timeframe:** `short_term`

---

**Action 5.4 — Inconsistent SIP History (< 6 Consecutive Months)**

- **Trigger:** `sip_consecutive_months < 6 AND totalSip > 0`
- **Action text:** "Your SIP has been running for only {sip_consecutive_months} months. The consistency multiplier reduces your Investment Regularity score until you reach 6 consecutive months. Set your SIP to auto-debit on your salary credit date — this removes the human decision point and builds a streak automatically."
- **Priority range:** 30 – 50
- **Timeframe:** `short_term`

---

### Dimension 6: Goal Clarity

---

**Action 6.1 — No Goals Defined**

- **Trigger:** `goals.length == 0`
- **Action text:** "You have no financial goals defined. Without a destination, your savings have no direction. Define at least one goal (retirement, home purchase, education) with a target amount and timeframe. This single step will unlock goal-specific SIP recommendations and improve your FBS immediately."
- **Priority range:** 40 – 55
- **Timeframe:** `short_term`

---

**Action 6.2 — Goals Without Timeframes**

- **Trigger:** `goals.length > 0 AND all goals have no timeframe`
- **Action text:** "You have {goals.length} goal(s) but none have a target date. A goal without a timeframe cannot be planned for — you don't know how much to save per month. Add a target year to each goal. For example: 'Home purchase — 5 years' gives a calculable monthly SIP of ₹{exampleRequiredSip}."
- **Priority range:** 35 – 50
- **Timeframe:** `short_term`

---

**Action 6.3 — Goal Underfunded (SIP Below Required)**

- **Trigger:** For any active goal: `actualSip_i < requiredSip_i`
- **Action text:** "Your '{goal.name}' goal needs ₹{requiredSip_i}/month to reach ₹{goal.targetAmount} in {goal.years} years. You are currently saving ₹{actualSip_i}/month — a shortfall of ₹{requiredSip_i − actualSip_i}/month. Increase your {goal.name} SIP by ₹{round((requiredSip_i − actualSip_i) × 0.50)} this month as a first step."
- **Priority range:** 45 – 70 (escalates based on urgency — see below)
- **Timeframe:** `short_term` normally; `immediate` if `goal.years <= 2`

---

**Action 6.4 — Underfunded Goal with Critical Horizon**

- **Trigger:** `actualSip_i < requiredSip_i AND goal.years <= 2`
- **Action text:** "Your '{goal.name}' goal is due in {goal.years} year(s) and is critically underfunded. You need ₹{requiredSip_i}/month but are saving ₹{actualSip_i}/month. With only {goal.years * 12} months remaining, you must act now. Increase the SIP to ₹{requiredSip_i} immediately, or revise the target amount down to ₹{achievableTarget} (what your current SIP will deliver at this horizon)."
- **Priority range:** 70 – 90
- **Timeframe:** `immediate`
- **Note:** `achievableTarget` = `actualSip_i × ((1+r)^n − 1) / r`, uninflated.

---

**Action 6.5 — Goal with No SIP Assigned**

- **Trigger:** `goal.actualSip == 0 AND goal has a target amount`
- **Action text:** "You have defined a '{goal.name}' goal (target: ₹{goal.targetAmount} in {goal.years} years) but have not assigned any monthly savings toward it. To reach this goal, you need ₹{requiredSip_i}/month. Start with even ₹{min(requiredSip_i, 500)} — the habit of saving toward a named goal is the foundation."
- **Priority range:** 55 – 75
- **Timeframe:** `short_term`

---

### Dimension 7: Behavioral Tendencies

Behavioral actions are advisory and pattern-based. They should use non-judgmental language (per the fairness note in the FBS spec: new users see baseline framing; returning users see trajectory framing).

---

**Action 7.1 — Impulse Spending Pattern**

- **Trigger:** `beh_spend_impulsively >= 4` (scores 4–5 on the 1–5 scale, higher = worse)
- **Action text:** "Your responses suggest you sometimes spend impulsively. A practical fix: introduce a 48-hour rule for any non-essential purchase above ₹{round(monthlyIncome × 0.01)}. This one habit, if applied consistently, typically saves 5–8% of monthly discretionary spend."
- **Priority range:** 30 – 45
- **Timeframe:** `short_term`

---

**Action 7.2 — Decision Delay Pattern**

- **Trigger:** `beh_delay_decisions >= 4`
- **Action text:** "You tend to delay financial decisions. Delaying a term insurance purchase by 1 year at age 30 can increase the premium by 8–12% for the same cover. For your next pending financial decision, set a 7-day deadline with a concrete next step written down."
- **Priority range:** 25 – 40
- **Timeframe:** `short_term`

---

**Action 7.3 — Panic Selling / Market Reaction**

- **Trigger:** `beh_market_reaction <= 2` (scores 1–2, meaning poor response to market movements)
- **Action text:** "Your responses suggest you react strongly to market movements. A ₹10,000/month SIP in Nifty 50 over the last 10 years (through multiple market crashes) returned approximately 14% CAGR for investors who stayed. Missing even 10 of the best trading days in a decade cuts long-term returns by roughly half. STP (Systematic Transfer Plan) into volatile funds is one way to reduce the emotional trigger."
- **Priority range:** 30 – 45
- **Timeframe:** `long_term`

---

**Action 7.4 — Not Reviewing Finances Monthly**

- **Trigger:** `beh_review_monthly <= 2`
- **Action text:** "You are not reviewing your finances regularly. Set a fixed 30-minute 'money date' on the first Sunday of each month. Check your SIP performance, expense breakdown, and goal progress. Regular review is the single highest-ROI financial habit — it costs zero rupees."
- **Priority range:** 20 – 35
- **Timeframe:** `short_term`

---

### Dimension 8: Tax Literacy

Actions are only generated for users with `annual_income > 0`.

---

**Action 8.1 — Wrong Tax Regime, High Potential Savings**

- **Trigger:** `opted != recommended AND potentialTaxSaving > ₹5,000`
- **Action text:** "You are on the {opted} regime, but based on your income and deductions, the {recommended} regime would save you approximately ₹{round(potentialTaxSaving)} in taxes this year. Switch your regime at the start of the next financial year (declare to your employer before April). This is free money — you are currently leaving ₹{round(potentialTaxSaving / 12)}/month on the table."
- **Priority range:** 50 – 70
- **Timeframe:** `short_term` (or `immediate` if within 30 days of financial year end)

---

**Action 8.2 — Wrong Regime, Low Potential Savings**

- **Trigger:** `opted != recommended AND potentialTaxSaving > 0 AND potentialTaxSaving <= ₹5,000`
- **Action text:** "You may be slightly better off on the {recommended} regime (estimated saving: ₹{round(potentialTaxSaving)}/year). The difference is small — consult your CA or use the income tax portal's comparison tool before your next employer declaration."
- **Priority range:** 20 – 35
- **Timeframe:** `long_term`

---

**Action 8.3 — Correct Regime but No Deductions Used**

- **Trigger:** `opted == recommended AND NOT hasDeductions AND annual_income >= ₹5,00,000`
- **Action text:** "You are on the right tax regime but are not using any deductions. Even under the Old Regime, Section 80C alone allows ₹1.5L of deductions — that is ₹30,000–₹45,000 in annual tax savings depending on your slab. Review whether ELSS mutual funds, PPF, or NPS contributions can be structured to use these deductions."
- **Priority range:** 30 – 45
- **Timeframe:** `short_term`

---

### Dimension 9: Asset Diversity

Actions are only generated when `total_assets >= ₹1,00,000` (below this, Asset Diversity weight is 0).

**Age-based ideal ranges are per the FBS spec. Short-horizon goal modifier applies if `any active goal has years <= 4`.**

---

**Action 9.1 — Over-Concentrated in Single Asset Class**

- **Trigger:** `deviation for any single asset class > 20 percentage points outside its ideal range`
- **Action text:** "Your portfolio is heavily concentrated in {overweightClass} ({actual}% vs. the {min}–{max}% ideal for your age). This increases risk without necessarily improving returns. As you add new investments, direct them toward {underweightClass} until your allocation returns to the target range. Do not sell existing positions purely to rebalance — tax implications may outweigh the benefit."
- **Priority range:** 35 – 55
- **Timeframe:** `long_term`

---

**Action 9.2 — Severely Misaligned Portfolio (Total Deviation > 40)**

- **Trigger:** `totalDeviation > 40`
- **Action text:** "Your overall portfolio allocation is significantly misaligned with the ideal for your age ({age} years). Total deviation: {totalDeviation} percentage points. Consider gradually rebalancing over the next 12 months by redirecting new SIPs toward underweight classes. If this is due to recent market movement, a 6-month STP strategy can smooth the transition."
- **Priority range:** 45 – 60
- **Timeframe:** `long_term`

---

**Action 9.3 — No Debt Allocation for Age 50+ Users**

- **Trigger:** `age >= 50 AND debt_allocation_percent < idealDebtMin`
- **Action text:** "At age {age}, the ideal debt allocation range is {idealDebtMin}–{idealDebtMax}%. Your current debt allocation is {debt_allocation_percent}%. Shifting a portion of your portfolio to debt instruments (debt mutual funds, bonds, or FDs) reduces volatility as you approach retirement. Start routing at least 20% of new investments into debt."
- **Priority range:** 40 – 60
- **Timeframe:** `short_term`

---

### Dimension 10: Portfolio Understanding

---

**Action 10.1 — Very Low Product Understanding**

- **Trigger:** `beh_product_understanding <= 2`
- **Action text:** "You have rated your investment product knowledge at {beh_product_understanding}/5. Investing in products you do not understand increases your risk of panic-selling and poor allocation decisions. Start with one resource this week: SEBI's investor education portal (investor.sebi.gov.in) or a simple index fund explainer. You do not need to understand everything — you need to understand what you own."
- **Priority range:** 25 – 40
- **Timeframe:** `long_term`

---

**Action 10.2 — Moderate Product Understanding**

- **Trigger:** `beh_product_understanding == 3`
- **Action text:** "You have a moderate understanding of investment products. One practical step to deepen this: review the factsheet of your largest mutual fund holding. Check its expense ratio, benchmark, and 5-year rolling return vs. the benchmark. This single exercise, done once per quarter, builds financial fluency faster than passive reading."
- **Priority range:** 15 – 30
- **Timeframe:** `long_term`

---

## 4. Cross-Dimension Actions

These items override individual dimension items when multiple gaps co-exist and interact.

---

### Rule A: Debt Before Invest

- **Trigger:** `badEmiRatio > 0.15 AND savingsRate < 0.10 AND totalSip > 0`
- **Condition meaning:** User has meaningful bad debt AND is investing small amounts simultaneously.
- **Action text:** "You are currently investing ₹{totalSip}/month while carrying high-interest bad debt with an EMI of ₹{badDebtEmi}/month. The math does not work in your favour: bad debt at 18–24% costs more than a diversified SIP can earn at 12%. Redirect your ₹{totalSip} SIP toward prepaying your highest-interest loan this month. Once bad debt falls below 10% EMI ratio, resume and increase your SIP."
- **Priority range:** 70 – 85
- **Timeframe:** `immediate`
- **Suppresses:** Action 5.2, 5.3 (investment regularity increase actions)

---

### Rule B: Insurance Before Invest

- **Trigger:** `health_cover == 0 AND totalSip > 0 AND monthly SIP increase was recently actioned or planned`
- **Condition meaning:** User is actively investing but has no health cover.
- **Action text:** "You are investing ₹{totalSip}/month — great habit. But you have no health insurance. A single hospitalisation can erase years of SIP gains. Before increasing your SIP further, allocate ₹{round(idealHealthCover × 0.015 / 12)}–₹{round(idealHealthCover × 0.025 / 12)}/month (estimated annual premium / 12) toward a ₹{idealHealthCover} health policy. Insurance first, then invest."
- **Priority range:** 75 – 90
- **Timeframe:** `immediate`
- **Suppresses:** Action 5.2, 5.3 (investment increase actions) for this cycle

---

### Rule C: Emergency Fund Before Goals

- **Trigger:** `stableAssets < effectiveMonthly × 3 AND goals.some(g => g.actualSip > 0)`
- **Condition meaning:** User is saving toward goals but has less than 3 months emergency fund.
- **Action text:** "You are saving toward {countActiveGoalSips} goal(s) but your emergency fund covers only {round(stableAssets / effectiveMonthly, 1)} months of expenses (minimum: 3 months, i.e., ₹{effectiveMonthly × 3}). If an emergency hits, you will be forced to liquidate your goal savings at possibly the wrong time. Temporarily redirect ₹{min(totalGoalSip, couldSave)} from goal SIPs to your emergency fund until it reaches ₹{effectiveMonthly × 3}, then resume goal SIPs."
- **Priority range:** 65 – 80
- **Timeframe:** `immediate`
- **Suppresses:** Action 6.3, 6.5 (goal SIP increase actions) for this cycle

---

## 5. Liability-Specific Logic

### 5.1 Multi-Loan Repayment Ranking (Avalanche Method)

When a user has multiple bad-debt accounts, rank them for repayment priority by **descending interest rate**. The debt with the highest rate should receive all surplus above minimum EMIs on others.

```
Repayment order:
1. Sort all bad-debt accounts by interest_rate DESC
2. Pay minimum EMI on all accounts
3. Direct all available surplus to Account #1 (highest rate) until paid off
4. Then apply that freed payment + surplus to Account #2, and so on
```

**Action text template for multi-loan situation:**
"You have {n} high-interest debt accounts. Using the avalanche method, focus extra payments on '{highestRateLoan.name}' ({highestRateLoan.rate}% p.a.) first — it is costing you ₹{round(highestRateLoan.outstanding × highestRateLoan.rate / 100 / 12)}/month in interest. Paying an extra ₹{extraPaymentAmount}/month toward this loan clears it {monthsSaved} months earlier."

---

### 5.2 Good Debt vs. Bad Debt Classification

| Debt Type | Classification | Rationale |
|---|---|---|
| Home Loan | Good debt | Asset-backed, tax deductible, appreciating underlying asset |
| Education Loan | Good debt | Human capital investment, tax deductible under 80E |
| Personal Loan | Bad debt | Unsecured, high interest (12–24%), no asset backing |
| Credit Card (full balance paid) | Neutral | No interest if cleared monthly |
| Credit Card (revolving balance) | Bad debt (critical) | 36–42% interest, immediate damage |
| Vehicle Loan | Context-dependent | Commercial vehicle → good. Personal vehicle → bad (depreciating asset) |
| BNPL / consumer durable loans | Bad debt | High effective interest when fees included |

---

### 5.3 Revolving Credit Card — Specific Logic

- Always raise Action 4A.1 when `revolvingBalance > 0`.
- This item is exempt from the 3–5 item volume constraint — it is always surfaced.
- If `revolvingBalance > monthlyIncome × 2`, escalate to urgency score 100.
- Include the FBS penalty this balance is causing: "This balance is also deducting {round(revolvingPenalty, 1)} points from your FBS score."

---

### 5.4 Debt Consolidation Flag

- **Trigger:** `count(personal_loans) + count(revolving_credit_cards) >= 3`
- Surface Action 4A.4.
- Do not surface if user already has a consolidation loan in their profile.
- Flag as `short_term` — this requires research and comparison before acting.

---

## 6. Goal-Specific Logic

### 6.1 SIP Shortfall Calculation

For each active goal with `targetAmount > 0` and `years > 0`:

```python
# Variables from the FBS spec
inflationAdjustedTarget = targetAmount × (1 + 0.06)^years
r = (1 + annualReturnRate)^(1/12) - 1   # use goal's custom rate or 0.01 (12% annual default)
n = years × 12

requiredSip = (inflationAdjustedTarget × r) / ((1 + r)^n - 1)
shortfall   = max(0, requiredSip - actualSip_i)
```

Surface Action 6.3 when `shortfall > 0`.

---

### 6.2 Urgency Escalation by Horizon

| Goal Years Remaining | Timeframe | Urgency Score |
|---|---|:---:|
| > 5 years | `short_term` | 25 |
| 3 – 5 years | `short_term` | 50 |
| 2 – 3 years | `short_term` → `immediate` | 65 |
| < 2 years | `immediate` | 90 |
| < 1 year | `immediate` | 100 |

For goals with `years < 1`, also display the achievable amount at current SIP:
```
achievableAmount = actualSip_i × ((1+r)^n - 1) / r
```

---

### 6.3 No SIP Assigned to a Goal

- **Trigger:** `goal.actualSip == 0 AND goal.targetAmount > 0`
- Surface Action 6.5 with `requiredSip` computed.
- Priority baseline: 60. Escalate based on urgency table above.

---

### 6.4 No Goals at All

- **Trigger:** `goals.length == 0`
- Surface Action 6.1.
- Priority: 45. Lower than most financial gap actions, but important for long-term score.
- This action does not block other items from being shown.

---

### 6.5 Goal Ranking for Multi-Goal Users

When a user has multiple underfunded goals, rank them for action plan surfacing:

```
Goal priority rank = urgencyScore (from 6.2) + (shortfall / requiredSip × 30)
```

The highest-ranked goal's action is surfaced. If two goals are within 5 points of each other, surface both (subject to overall 3–5 item limit).

---

## 7. Combination Fragility Actions

### 7.1 Detection Logic

From the FBS spec:

```python
zeroEmergency = stableAssets == 0
zeroInsurance = health_cover == 0 AND life_cover == 0
highBadDebt   = badOutstanding > 0
                AND cushionRatio < 2
                AND (income == 0 OR badOutstanding >= monthlyIncome × 2)
```

### 7.2 Bundled Action Item

When any combination fragility penalty is active (`fragilityPenalty > 0`), generate a single bundled "Financial Foundation" action instead of separate items for the constituent dimensions.

**Trigger matrix:**

| Active Flags | Penalty | Bundled Action ID |
|---|:---:|---|
| All three | 15 | `FRAGILITY_ALL` |
| zeroEmergency + zeroInsurance | 8 | `FRAGILITY_EF_INS` |
| zeroEmergency + highBadDebt | 6 | `FRAGILITY_EF_DEBT` |
| zeroInsurance + highBadDebt | 5 | `FRAGILITY_INS_DEBT` |

---

**`FRAGILITY_ALL` Action Text:**
"Your financial foundation has three critical gaps at the same time: no emergency fund, no insurance cover, and high bad debt. This combination is penalising your FBS by up to 15 points independently of dimension scores. Address them in this order this month:
1. Pay at least the minimum on all debts to avoid default.
2. Purchase a basic ₹{idealHealthCover} health insurance policy (priority — a hospitalisation with no fund and no insurance is a financial emergency).
3. Open a savings account or liquid fund and set up an auto-transfer of ₹{min(couldSave, effectiveMonthly × 0.25)} per month toward your emergency fund.
Each step here closes a penalty, not just a dimension score."

**Priority:** 90 – 100
**Timeframe:** `immediate`

---

**`FRAGILITY_EF_INS` Action Text:**
"You have no emergency fund and no insurance. These two gaps together are penalising your FBS by 8 points. This month: (1) Purchase at least a ₹{idealHealthCover} health policy. (2) Start a ₹{min(couldSave, effectiveMonthly)} monthly transfer to a liquid fund — your emergency buffer. These two actions alone will raise your FBS by 8+ points."

**Priority:** 80 – 90
**Timeframe:** `immediate`

---

**`FRAGILITY_EF_DEBT` Action Text:**
"You have no emergency fund and high bad debt — a risky combination. If income disrupts, you have no buffer and will default on debt. This month: (1) Pay at least the full minimum on all bad-debt accounts. (2) Do not take on any new debt. (3) Start an emergency fund with whatever surplus remains, even ₹{min(couldSave, 1000)} per month. The FBS penalty here is 6 points — removing it requires both gaps to close."

**Priority:** 75 – 85
**Timeframe:** `immediate`

---

**`FRAGILITY_INS_DEBT` Action Text:**
"You have no insurance and high bad debt. If a health emergency occurs, you have no cover and will likely take on more debt to pay for it — a compounding problem. Priority: (1) Buy a basic health policy this month. (2) Put 60% of available surplus toward bad debt prepayment. The FBS penalty here is 5 points."

**Priority:** 70 – 80
**Timeframe:** `immediate`

---

### 7.3 Suppression Rules

When a bundled fragility action is active:
- Suppress individual actions for Emergency Fund (Dimension 1), Health Insurance (Dimension 2), and Liability Bad Debt (Dimension 4A) for this generation cycle.
- The bundled action counts as one item toward the 3–5 limit.
- The revolving CC action (4A.1) is NOT suppressed — it always surfaces independently.

---

### 7.4 New Earner Carve-Out

If `months_employed < 12` AND fragility penalty applies:
- `fragilityPenalty` is capped at 5 in scoring (per FBS spec).
- In the action plan, add a sub-note to the bundled action: "Note: Because you are in the early stage of your earning career (under 12 months employed), this combination is expected and is scored at reduced penalty. Most of these gaps close within 12–18 months of consistent saving."
- Reduce the urgency score for the bundled action by 15 points (still surfaces as `immediate` unless score drops below 55, in which case it becomes `short_term`).

---

## 8. Action Item Status Tracking

### 8.1 State Machine

Each action item has a `status` field with four possible values:

| Status | Meaning |
|---|---|
| `pending` | Item is active and unresolved. Shown to user in dashboard. |
| `in_progress` | User has acknowledged the item and taken a partial step (manually set by user). |
| `completed` | Resolution condition has been met. Shown in "Wins" history. |
| `dismissed` | User has explicitly dismissed this item. Does not re-surface automatically. |

---

### 8.2 Auto-Completion Conditions

Auto-completion is checked on every new FBS calculation. If the resolution condition is met, the item transitions to `completed` without user action.

| Action Item | Resolution Condition |
|---|---|
| 1.1 Zero Emergency Fund | `stableAssets >= effectiveMonthly` |
| 1.2 EF Below 3 Months | `stableAssets >= effectiveMonthly × 3` |
| 1.3 EF 3–6 Months | `stableAssets >= effectiveMonthly × 6` |
| 1.4 Funds in Investments | `stableAssets >= effectiveMonthly × 6` OR `totalAssets < effectiveMonthly × 6` (gap no longer exists) |
| 2.1 No Health Insurance | `health_cover > 0` |
| 2.2 Health Cover < 50% ideal | `health_cover >= idealHealthCover × 0.50` |
| 2.3 Health Cover 50–79% | `health_cover >= idealHealthCover × 0.80` |
| 3.1 No Life Insurance | `life_cover > 0` OR `dependents == 0` |
| 3.2 Life Cover < 50% | `life_cover >= idealLifeCover × 0.50` |
| 4A.1 Revolving CC | `revolvingBalance == 0` |
| 4A.2 Bad EMI 10–20% | `badEmiRatio < 0.10` |
| 4A.3 Bad EMI > 20% | `badEmiRatio <= 0.20` |
| 5.1 Zero SIP | `totalSip > 0` |
| 5.2 Low savings rate | `savingsRate >= 0.20` OR `utilizationRate >= 0.80` |
| 6.1 No goals | `goals.length > 0` |
| 6.3 Goal underfunded | `actualSip_i >= requiredSip_i × 0.95` (5% tolerance) |
| 6.5 Goal no SIP | `goal.actualSip > 0` |
| 8.1 Wrong tax regime | `opted == recommended` |
| Fragility bundles | All constituent flags resolve |

---

### 8.3 Re-surfacing Logic

If a previously `completed` item regresses (resolution condition is no longer met), the item transitions back to `pending` and is re-surfaced on the next generation cycle.

```
if item.status == 'completed' AND resolution_condition == False:
    item.status = 'pending'
    item.resurfaced_at = now()
    item.resurfaced_count += 1
```

Items that have been re-surfaced one or more times should include a note in their action text:
"You previously addressed this — it has come back up. Review what changed in your financial situation."

---

### 8.4 Dismissal Behavior

- `dismissed` items are never auto-resurfaced.
- Exception: if a `dismissed` item regresses to a critical urgency (urgency score >= 85), it is re-surfaced with status `pending` and a note: "This item was dismissed but has reached a critical level and requires your attention."
- Users can re-dismiss any re-surfaced item.

---

## 9. Sample Action Plan Outputs

### Archetype A: Recent Graduate

**Profile:**
- Age: 23, Monthly Income: ₹35,000, Income Type: Salaried
- Months Employed: 7
- Needs: ₹18,000, Wants: ₹10,000, effectiveMonthly: ₹28,000
- couldSave: ₹7,000, totalSip: ₹0, savingsRate: 0%
- stableAssets: ₹5,000, totalAssets: ₹5,000
- Health Cover: ₹0, Life Cover: ₹0
- Dependents: 0
- Loans: 1 education loan, EMI ₹4,500 (included in needs), outstanding ₹2,80,000
- Bad Debt: ₹0
- Goals: None
- beh_product_understanding: 2
- revolvingBalance: ₹0

**FBS Computed:** ~38 (combination fragility: zeroEmergency + zeroInsurance, penalty capped at 5 for new earner)

**Generated Action Plan (top 4):**

---

**Item 1 — Priority: 84**
Status: `pending` | Timeframe: `immediate`

**Financial Foundation Alert (Bundled)**
"Your financial foundation has two critical gaps: no emergency fund and no insurance. This combination is currently penalising your FBS by 5 points (reduced from 8 because you are in your first year of earning — this is expected, not a failure). This month:
1. Open a basic health insurance policy — even a simple individual plan for ₹3,00,000 cover costs approximately ₹3,000–₹5,000/year for your age. This protects your income from being wiped out by medical costs.
2. Start an emergency fund. Set up an auto-transfer of ₹3,500/month (half your surplus) to a liquid fund. Target: ₹84,000 (3 months of expenses) within 2 years.
Note: Because you are in the early stage of your earning career (under 12 months employed), this combination is expected and is scored at reduced penalty. Most of these gaps close within 12–18 months of consistent saving."

---

**Item 2 — Priority: 72**
Status: `pending` | Timeframe: `immediate`

**Start Investing**
"You have ₹7,000 in monthly surplus and are not investing anything. After reserving ₹3,500 for your emergency fund (see above), put ₹2,000/month into a diversified equity index fund SIP. At ₹2,000/month for 10 years at 12% CAGR, you accumulate approximately ₹4.6L. The remaining ₹1,500 stays as a buffer. Open a SIP today — the onboarding takes 10 minutes on any major mutual fund platform."

---

**Item 3 — Priority: 48**
Status: `pending` | Timeframe: `short_term`

**Define Your First Financial Goal**
"You have no financial goals defined. Without a target, your savings have no direction. In the next 30 days, define at least one goal — retirement, a home down payment, or an emergency corpus target — with a rupee amount and a year. For example: 'Emergency fund: ₹84,000 by 2027.' This unlocks goal-specific SIP guidance and gives your monthly savings a purpose."

---

**Item 4 — Priority: 32**
Status: `pending` | Timeframe: `long_term`

**Build Your Investment Knowledge**
"You have rated your investment product knowledge at 2/5. Before you scale your SIPs, spend 30 minutes this week reading about index funds vs. active funds. Understanding what you own prevents panic-selling, which is the #1 destroyer of retail investor returns. Start at SEBI's investor education portal (investor.sebi.gov.in)."

---

### Archetype B: Mid-Career Professional

**Profile:**
- Age: 36, Monthly Income: ₹1,20,000, Income Type: Salaried
- Months Employed: 84
- Needs: ₹52,000 (includes home loan EMI ₹28,000), Wants: ₹30,000, effectiveMonthly: ₹82,000
- couldSave: ₹38,000, totalSip: ₹15,000 (₹10,000 general + ₹5,000 goal SIPs)
- savingsRate: 12.5%, utilizationRate: 39.5%
- stableAssets: ₹1,20,000, totalAssets: ₹12,00,000
- Health Cover: ₹5,00,000 (ideal: ₹5,00,000 at ₹10L–₹15L income), Life Cover: ₹50,00,000
- Dependents: 2 (ideal life cover: ₹12,00,000 × 10 = ₹1,20,00,000)
- Home Loan: Outstanding ₹35,00,000, EMI ₹28,000, Rate 8.5% (good debt)
- Personal Loan: Outstanding ₹2,50,000, EMI ₹8,500, Rate 18% (bad debt)
- Credit Card: Revolving balance ₹35,000
- Goals: Retirement (₹2Cr, 24 years, actualSip ₹5,000, requiredSip ₹8,200)
- goodEmiRatio: 23.3% (home loan only), badEmiRatio: 35.4% (personal + CC min)
- revolvingBalance: ₹35,000 → penalty: round(35000/120000 × 3) = 0.9 pts

**FBS Computed:** ~61

**Generated Action Plan (top 4):**

---

**Item 1 — Priority: 93**
Status: `pending` | Timeframe: `immediate`

**Pay Your Credit Card Balance in Full**
"You are carrying a revolving credit card balance of ₹35,000. This is accruing at 36–42% annual interest — approximately ₹1,050–₹1,225/month in interest charges alone. Pay the full ₹35,000 this month. If you cannot do it in one payment, use ₹35,000 from your ₹1,20,000 stable assets — the interest rate on the CC (36%+) far exceeds the return on a savings account (3–5%). This is also reducing your FBS by 0.9 points via the revolving credit penalty."

---

**Item 2 — Priority: 78**
Status: `pending` | Timeframe: `immediate`

**Debt Before More Investment**
"You are investing ₹15,000/month while your personal loan charges 18% interest — higher than the 12% long-term equity return. Your bad debt EMI ratio is 35.4% of income. After paying off the CC balance (see above), direct your ₹15,000 SIP temporarily toward personal loan prepayment. Clearing the ₹2,50,000 personal loan at current pace takes 29 months. Adding ₹15,000/month extra cuts this to approximately 10 months, saving roughly ₹30,000 in interest. Then restore and increase your SIPs."

---

**Item 3 — Priority: 61**
Status: `pending` | Timeframe: `short_term`

**Increase Your Life Insurance Cover**
"You have life cover of ₹50,00,000 with 2 dependents, but your income-based ideal is ₹1,20,00,000 (10× annual income). Your current cover is only 41.7% of the recommended level. A top-up term plan for the ₹70L gap costs approximately ₹12,000–₹18,000/year at age 36. Buy this before your next birthday — premiums rise with age."

---

**Item 4 — Priority: 42**
Status: `pending` | Timeframe: `short_term`

**Grow Your Retirement SIP After Debt Clears**
"Your Retirement goal requires ₹8,200/month to reach ₹2Cr in 24 years (inflation-adjusted). You are currently saving ₹5,000/month — a monthly shortfall of ₹3,200. Once your personal loan is cleared (approximately 10 months), redirect the freed ₹8,500 EMI + ₹15,000 current SIP toward this goal. At that point, a combined SIP of ₹18,000–₹20,000/month will overshoot the target."

---

### Archetype C: Pre-Retirement User

**Profile:**
- Age: 56, Monthly Income: ₹3,00,000, Income Type: Salaried
- Months Employed: 396
- Needs: ₹75,000, Wants: ₹60,000, effectiveMonthly: ₹1,35,000
- couldSave: ₹1,65,000, totalSip: ₹80,000, savingsRate: 26.7%, utilizationRate: 48.5%
- stableAssets: ₹18,00,000, totalAssets: ₹1,80,00,000 (includes ₹60L real estate, ₹30L FD, ₹90L equity/MF)
- Health Cover: ₹10,00,000 (ideal: ₹15,00,000 at income > ₹30L)
- Life Cover: ₹1,00,00,000 (ideal: ₹3,00,00,000 × 10 = too high; at 56, dependents = 1 spouse, review needed)
- Dependents: 1
- No bad debt, No good debt
- Tax regime: Old, deductions used (80C, NPS), recommended = Old
- Goals: Retirement in 4 years, ₹5Cr target, actualSip ₹60,000, requiredSip ₹97,000
- beh_product_understanding: 4
- Portfolio: 78% equity, 12% debt, 5% gold, 5% real estate
  - Age 56 ideal equity: 20–50%, actual 78% → deviation +28
  - Age 56 ideal debt: 20–55%, actual 12% → deviation −8
  - Total deviation: 36

**FBS Computed:** ~74

**Generated Action Plan (top 4):**

---

**Item 1 — Priority: 85**
Status: `pending` | Timeframe: `immediate`

**Critical Goal Funding Gap — Retirement in 4 Years**
"Your Retirement goal (₹5Cr, 4 years away) requires ₹97,000/month in SIP. You are currently saving ₹60,000/month — a monthly shortfall of ₹37,000. With only 48 months remaining, compounding has limited time to work. At your current SIP, you will reach approximately ₹3.7Cr — a ₹1.3Cr gap at target. Increase your retirement SIP to ₹97,000/month immediately by redirecting ₹37,000 from your investable surplus (you have ₹1,65,000/month available). Do not delay — each month without this increase makes the gap harder to close."

---

**Item 2 — Priority: 68**
Status: `pending` | Timeframe: `short_term`

**Rebalance Portfolio to Reduce Equity Concentration**
"At age 56 with a 4-year retirement horizon, the ideal equity allocation is 20–50%. Your current equity allocation is 78% — 28 percentage points above the upper bound. A market correction of 30% (not uncommon) would reduce your ₹90L equity portfolio by ₹27L. Over the next 12 months, shift new SIP contributions toward debt mutual funds (target: 30% debt allocation, or ₹54L at your current total portfolio). Do not liquidate equity abruptly — use a Systematic Transfer Plan (STP) from equity to debt if needed."

---

**Item 3 — Priority: 56**
Status: `pending` | Timeframe: `short_term`

**Upgrade Health Insurance**
"Your health cover of ₹10,00,000 is 67% of the ₹15,00,000 recommended for your income level. At age 56, healthcare costs and hospitalisation risk are significantly higher than at younger ages. Add a super top-up plan with a ₹5L deductible to cover the gap — this costs approximately ₹8,000–₹15,000/year and is far cheaper than a standalone ₹15L policy. Do this while you are healthy — coverage becomes harder to obtain with pre-existing conditions."

---

**Item 4 — Priority: 40**
Status: `pending` | Timeframe: `long_term`

**Maximise Surplus Utilisation**
"You have ₹1,65,000 in monthly surplus but are investing only ₹80,000/month — a utilisation rate of 48.5%. After raising your retirement SIP to ₹97,000 (see Item 1), you will still have ₹68,000/month in undeployed surplus. Route this into: (1) Debt mutual funds for the rebalancing target (₹40,000/month) and (2) a liquid fund to build a larger post-retirement buffer (₹28,000/month). Leaving ₹1.65L/month idle at this stage of wealth accumulation is a significant opportunity cost."

---

## Appendix: Priority Score Quick Reference

| Action Item | Urgency | FBS Impact | Effort | Typical Priority |
|---|:---:|:---:|:---:|:---:|
| Revolving CC balance | 100 | High | 10 (low) | 90 – 100 |
| No health insurance | 100 | High | 55 (medium) | 80 – 95 |
| Fragility: all three flags | 100 | Very High | 55 | 90 – 100 |
| No life insurance (dependents) | 100 | Medium | 75 (high) | 75 – 90 |
| Bad EMI > 20% | 100 | High | 30 | 75 – 90 |
| Debt before invest (cross-dim) | 100 | High | 10 | 75 – 90 |
| Insurance before invest (cross-dim) | 100 | High | 55 | 75 – 90 |
| Zero EF | 100 | High | 10 | 75 – 90 |
| Underfunded goal < 2 years | 90 | Medium | 10 | 70 – 90 |
| EF < 3 months | 75 | Medium | 10 | 60 – 80 |
| Wrong tax regime (> ₹5K saving) | 50 | Medium | 30 | 50 – 70 |
| Bad EMI 10–20% | 75 | Medium | 55 | 55 – 75 |
| Goal no SIP assigned | 50 | Medium | 10 | 55 – 75 |
| EF 3–6 months | 50 | Low | 10 | 35 – 55 |
| Underfunded goal > 3 years | 25 | Low | 10 | 40 – 55 |
| Portfolio over-concentrated | 25 | Low | 75 | 35 – 55 |
| No goals defined | 25 | Medium | 30 | 40 – 55 |
| Low savings rate (surplus available) | 50 | Medium | 10 | 45 – 60 |
| Wrong regime (≤ ₹5K saving) | 25 | Low | 30 | 20 – 35 |
| Low portfolio understanding | 25 | Low | 30 | 25 – 40 |
| Behavioral: impulse spending | 25 | Low | 30 | 30 – 45 |
| No monthly review habit | 25 | Low | 10 | 20 – 35 |

---

*This document is a technical specification for the FinHealth Dashboard action plan engine. All monetary examples are in INR. This system produces educational action roadmaps, not legally binding financial or tax advice. Users requiring legally binding advice should consult a SEBI-registered financial advisor or qualified CA.*
