# Dashboard Narrative Layer — Implementation Spec

## Goal
Add a narrative/interpretive layer to the dashboard so first-time
users immediately understand their financial situation without
needing guidance.

## Page
Overview page (`frontend/src/pages/Dashboard.jsx`)

---

## Utility File to Create First

**File:** `frontend/src/utils/financialInsights.js`

> All ₹ amounts must use `fmt(val)` (abbreviated: ₹1.5L, ₹50K) —
> the same helper already defined locally in Dashboard.jsx and
> Investments.jsx. Import it or accept it as a parameter.

### Functions to implement

```js
// ─── Asset Allocation ────────────────────────────────────────────────────

/**
 * Ideal allocation ranges using 100-minus-age rule.
 * @param {number} userAge
 * @returns {{ equity: [min,max], debt: [min,max], commodity: [min,max], alt: [min,max] }}
 */
getIdealRanges(userAge)

// Formulas:
// equity_target = 100 - userAge
// equity_min    = equity_target - 15
// equity_max    = equity_target + 15
// debt_target   = 100 - equity_target
// debt_min      = Math.max(10, debt_target - 15)
// debt_max      = Math.min(70, debt_target + 15)
// commodity     = [5, 15]
// alt           = [0, 10]

/**
 * @param {'equity'|'debt'|'commodity'|'alt'} assetClass
 * @param {number} currentPct   — 0-100
 * @param {number} userAge
 * @returns {{ status: 'too_low'|'too_high'|'on_track', gap: number }}
 */
getAssetStatus(assetClass, currentPct, userAge)

/**
 * Pre-written, human-readable explanation for a given status.
 * @returns {string}
 */
getAssetExplanation(assetClass, status)

/**
 * Specific action with ₹ amounts.
 * @param {Function} fmt  — pass the local fmt() helper
 * @returns {string}
 */
getAssetAction(assetClass, status, gapValue, monthlySurplus, fmt)


// ─── Growth / Inflation ──────────────────────────────────────────────────

export const INFLATION_RATE = 6  // update manually each year

/**
 * @param {number} growthRate
 * @returns {'below_inflation'|'near_inflation'|'above_inflation'}
 */
getGrowthStatus(growthRate)

// Rules:
// < INFLATION_RATE             → 'below_inflation'
// INFLATION_RATE to +2 (≤8)   → 'near_inflation'
// > 8                          → 'above_inflation'


// ─── Narrative Summaries ─────────────────────────────────────────────────

/**
 * 3-4 sentence plain-English paragraph for the Overview "Your Financial Story" card.
 * Inputs come from the /dashboard/full response.
 *
 * Relevant data fields (all from the dashboard API response):
 *   overview.fbs                       — number 0-100
 *   overview.netWorth.netWorth         — number (can be negative)
 *   overview.surplus.monthly           — number
 *   overview.liabilities.total         — number
 *   overview.liabilities.goodLiability — number
 *   overview.liabilities.badLiability  — number
 *   overview.income.total              — number
 *   overview.expenses.effectiveMonthly — number
 *   overview.lifeStage.stage           — string ('Foundation'|'Building'|'Accumulation'|...)
 *   overview.moneySign.name            — string (archetype name)
 *
 * @param {object} dashboardData — full /dashboard/full response
 * @param {Function} fmt         — pass the local fmt() helper
 * @returns {string}
 */
getOverviewNarrative(dashboardData, fmt)

/**
 * 2-3 sentence summary for the Investments page narrative card.
 *
 * Relevant data fields:
 *   investments.assets.allocation        — { equity, debt, commodity, realEstate, altInvestments }
 *   investments.assets.items             — Array<{ name, value, assetClass, growth }>
 *   investments.allocationIdeals         — Array<{ name, min, max }>
 *   overview.lifeStage.stage             — string
 *
 * @param {number} userAge
 * @param {object} allocations  — investments.assets.allocation
 * @param {Array}  holdings     — investments.assets.items
 * @param {Function} fmt
 * @returns {string}
 */
getInvestmentNarrative(userAge, allocations, holdings, fmt)


// ─── FBS Context ─────────────────────────────────────────────────────────

/**
 * @param {number} score — 0-100
 * @returns {{ range: string, message: string, benchmark: string }}
 *
 * Ranges:
 *   0–20   → 'Critical'
 *   21–40  → 'Poor'
 *   41–60  → 'Moderate'
 *   61–80  → 'Good'
 *   81–100 → 'Excellent'
 *
 * benchmark: generic income-bracket text, e.g.
 *   "Most users in your income range score between 35–55."
 */
getFBSContext(score)


// ─── Net Worth Context ────────────────────────────────────────────────────

/**
 * Returns a calm explanation when net worth is negative.
 * If net worth is positive, return null.
 *
 * @param {number} netWorth
 * @param {number} totalLiabilities      — overview.liabilities.total
 * @param {number} goodLiability         — overview.liabilities.goodLiability
 * @param {Function} fmt
 * @returns {string|null}
 */
getNetWorthContext(netWorth, totalLiabilities, goodLiability, fmt)


// ─── Expense Ratio ────────────────────────────────────────────────────────

/**
 * @param {number} totalExpenses — overview.expenses.effectiveMonthly
 * @param {number} totalIncome   — overview.income.total / 12  (annual → monthly)
 * @returns {{ ratio: number, status: 'healthy'|'moderate'|'high', message: string }}
 *
 * Thresholds:
 *   < 40%   → healthy
 *   40–60%  → moderate, room to optimise
 *   > 60%   → high, needs attention
 */
getExpenseRatioContext(totalExpenses, totalIncome)
```

---

## Pre-written Explanation Templates
(implement as a lookup object in `financialInsights.js`)

```js
const ASSET_EXPLANATIONS = {
  'equity.too_low':   "Your equity allocation is below the recommended range for your age. Equity drives long-term wealth growth — without adequate exposure, your portfolio may not outpace inflation.",
  'equity.too_high':  "Your equity allocation is above the typical range. While this can generate higher returns, it also increases volatility. Consider your risk tolerance and time horizon.",
  'equity.on_track':  "Your equity exposure is well-calibrated for your age and risk profile.",

  'debt.too_high':    "Your debt allocation is significantly above the ideal range. While stable, heavy debt concentration limits long-term wealth building potential, especially at your age.",
  'debt.too_low':     "Your debt allocation is below the recommended range. Some debt instruments provide stability and act as a cushion during equity market downturns.",
  'debt.on_track':    "Your debt allocation provides a healthy stability cushion.",

  'commodity.on_track': "Gold and commodities hedge against inflation and currency risk. Your allocation sits within the ideal 5–15% range.",
  'commodity.too_low':  "A small commodity allocation (5–15%) acts as a hedge against inflation and currency risk.",
  'commodity.too_high': "Your commodity allocation is above the recommended 5–15% range. Consider rebalancing towards equity or debt.",

  'alt.on_track':  "Your alternative investments are within the recommended 0–10% range.",
  'alt.too_high':  "Alternative investments above 10% introduce concentration risk. These are illiquid and highly volatile.",
};
```

---

## Changes per Page

### 1 — Overview (`frontend/src/pages/Dashboard.jsx`)

**Data already available** (all from `data` state via `GET /dashboard/full`):
- FBS: `overview.fbs`
- Net worth: `overview.netWorth.netWorth`
- Allocations: `overview.investments.allocation` — `{ equity, realEstate, commodity, debt, altInvestments }`
- Allocation ideals: `investments.allocationIdeals` — `Array<{ name, min, max }>`
- Biases: `overview.biases` — `Array<{ name, desc }>`
- Action plan: `data.actionPlan` — `Array<{ title, category, fbsImpact, status, description }>`
- Income total: `overview.income.total` (annual)
- Monthly expenses: `overview.expenses.effectiveMonthly`
- Surplus: `overview.surplus.monthly`
- Liabilities: `overview.liabilities.total`, `.goodLiability`, `.badLiability`
- Life stage: `overview.lifeStage.stage`
- MoneySign: `overview.moneySign.name`

**User age:** NOT currently in the dashboard response. Add `overview.profile.age` to the backend response OR derive from `financial_profiles.date_of_birth`. Computed in backend `calculations.js` — expose it in `computeFullDashboard`.

**Changes needed:**

1. **"Your Financial Story" card** — insert at the very top of the page (above the KPI cards)
   - Call `getOverviewNarrative(data, fmt)` for the 3-4 sentence paragraph
   - Status pills: emergency fund present/missing, FBS range label from `getFBSContext(fbs).range`

2. **Promote top 3 Action Plan items** — move to just below the narrative card, before the FBS section
   - Filter: `fbsImpact > 0 && status !== 'completed'`, sort by `fbsImpact` desc, take first 3
   - Render with +X pts badges (already done further down — reuse that pattern)

3. **Contextual note under Net Worth** — if `overview.netWorth.netWorth < 0`, render the string from `getNetWorthContext(...)`

4. **Benchmark sentence under FBS score** — render `getFBSContext(fbs).benchmark` below the score

5. **Inline explanation under each bias tag** — `overview.biases[].desc` is already present as `title` attribute; change to a visible tooltip (CSS `:hover` reveal or a `<span>` inline)

6. **Benchmark note under asset allocation chart** — show `getAssetStatus` result and `getAssetExplanation` for each asset class

7. **Interpretation line under expense ratio** — compute ratio from `overview.expenses.effectiveMonthly` and `overview.income.total / 12`, render `getExpenseRatioContext(...).message`


---

## Backend Change Required

Add `profile.age` to the `/dashboard/full` response in `backend/engine/calculations.js`:

```js
// In computeFullDashboard, after profile is loaded:
const age = profile.date_of_birth
  ? Math.floor((Date.now() - new Date(profile.date_of_birth)) / (365.25 * 24 * 3600 * 1000))
  : null;

// Include in returned object:
overview: {
  ...
  profile: { age },
  ...
}
```

Then in frontend: `const userAge = data.overview.profile?.age ?? 30;`

---

## Constraints

- Do not change any existing styling or component structure
- Add new utility functions in `frontend/src/utils/financialInsights.js`; import into components
- Use the local `fmt(val)` helper (defined in each component) — do **not** create a new formatter
- `INFLATION_RATE = 6` — hardcoded constant, update manually each year

---

## Verification

1. Start backend (`cd backend && npm run dev`) and frontend (`cd frontend && npm run dev`)
2. Log in with a test user (see `test_profiles.md`)
3. Check Overview:
   - "Your Financial Story" shows 4-5 sentences (strength, gap, priority action, MoneySign)
   - "What To Do Now" cards show description + next step + link per action
   - Portfolio section shows one status line + "See full investment analysis →"
   - Liabilities section shows status line + "See liabilities breakdown →"
   - Insurance section shows status line + "See insurance details →"
   - Cashflow table has muted context note below surplus row
4. Edge cases:
   - User with no bad debt → "✓ No bad debt detected"
   - User with all bad debt → "⚠ High bad debt ratio"
   - User with missing life insurance → "⚠ Life insurance missing"
   - Negative net worth → contextual note appears under KPI
   - Completed action plan → "What To Do Now" section hidden
