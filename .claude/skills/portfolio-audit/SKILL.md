---
name: portfolio-backtest-reviewer
description: >
  Review, validate, and critique a portfolio rebalancing backtest component.
  Use this skill whenever the user shares code, a component, or an implementation
  related to portfolio backtesting, rebalancing strategies, or investment
  optimization tools — and wants Claude to check whether it is correctly
  implemented, produces optimal results, and follows best practices.
  Trigger on phrases like: "check my backtest", "review my portfolio component",
  "is my rebalancing strategy correct", "validate my backtesting code",
  "does my portfolio optimizer work", or whenever the user pastes code containing
  terms like rebalance, backtest, Sharpe, drawdown, portfolio weights, or returns.
---

# Portfolio Backtest Reviewer

A skill for auditing the correctness, financial soundness, and output quality of
portfolio rebalancing and backtesting components.

---

## Your Mission

Given a portfolio backtesting component (code, artifact, or description), you must:

1. **Verify implementation correctness** — Does the code do what a backtest should do?
2. **Validate the rebalancing logic** — Is the strategy applied consistently and correctly?
3. **Check result quality** — Are the outputs meaningful, useful, and optimal?
4. **Surface issues** — Identify bugs, financial mistakes, and missing pieces.
5. **Provide actionable fixes** — Don't just flag problems; show how to fix them.

---

## Step-by-Step Review Process

### Step 1 — Gather the Component

If the user hasn't shared their code or component yet, ask them to share:
- The backtesting code or artifact
- The rebalancing strategy they intend to implement (e.g., threshold-based, calendar-based, drift-based)
- The expected outputs (e.g., final portfolio value, Sharpe ratio, drawdown chart)

### Step 2 — Implementation Correctness Checklist

Go through each of these checks and note pass ✅ / fail ❌ / unclear ⚠️ for each:

#### Data Handling
- [ ] Historical price data is loaded correctly (no look-ahead bias)
- [ ] Returns are calculated correctly (`pct_change()` or log returns as appropriate)
- [ ] Dates are sorted chronologically
- [ ] Missing values / NaN are handled (dropped or forward-filled appropriately)
- [ ] Prices, not total return indices, are used unless dividends are explicitly included

#### Portfolio Initialization
- [ ] Initial weights sum to 1.0 (or 100%)
- [ ] Initial capital is clearly defined
- [ ] Asset universe is fixed and consistent throughout the backtest

#### Rebalancing Logic
- [ ] Rebalancing trigger is implemented correctly:
  - **Calendar rebalancing**: checks date (monthly/quarterly/annually)
  - **Threshold rebalancing**: checks drift = `|current_weight - target_weight| > threshold`
  - **Drift rebalancing**: uses absolute or relative drift correctly
- [ ] On rebalance: weights are reset to target (not accumulated)
- [ ] Transaction costs are applied **after** rebalancing trades (if modeled)
- [ ] No rebalancing happens on the same day as initialization (unless explicitly intended)

#### Return & Value Calculation
- [ ] Portfolio value is computed daily as: `value_t = value_{t-1} * (1 + portfolio_return_t)`
- [ ] Portfolio return at time t = `sum(weight_i * asset_return_i)` using **weights at t-1**
- [ ] Weights are updated **before** computing the next period's returns (after rebalance)
- [ ] Cash positions (if any) accrue at the risk-free rate

#### Look-Ahead Bias Check
- [ ] Rebalancing decisions use only data available **up to and including** date t
- [ ] No future prices are used to compute current returns
- [ ] Train/test split (if used for optimization) is done **before** backtest, not inside the loop

### Step 3 — Financial Metrics Validation

Check whether the output metrics are computed correctly:

| Metric | Correct Formula | Common Mistake |
|--------|----------------|----------------|
| **Total Return** | `(final_value / initial_value) - 1` | Using sum of returns instead of compounded |
| **CAGR** | `(final_value / initial_value)^(1/years) - 1` | Wrong annualization period |
| **Sharpe Ratio** | `(mean(daily_returns) - rf/252) / std(daily_returns) * sqrt(252)` | Not annualizing; using total return not excess return |
| **Sortino Ratio** | Same as Sharpe but `std` uses only negative returns (downside deviation) | Using all returns in denominator |
| **Max Drawdown** | `max((peak - trough) / peak)` over rolling window | Not using rolling peak; using absolute not percentage |
| **Volatility** | `std(daily_returns) * sqrt(252)` | Not annualizing |
| **Calmar Ratio** | `CAGR / Max Drawdown` | Dividing by wrong value |
| **Beta** | `cov(portfolio, benchmark) / var(benchmark)` | Skipping benchmark alignment |

### Step 4 — Optimality Assessment

Check whether the strategy produces **useful optimization results** for the user:

- [ ] **Efficient frontier**: If mean-variance optimization is used, does it correctly minimize variance for a given return (or maximize Sharpe)?
- [ ] **Weight constraints**: Are constraints (e.g., no short selling, max allocation per asset) applied correctly?
- [ ] **Rebalancing frequency**: Is the chosen frequency justified? Over-rebalancing increases costs; under-rebalancing allows drift.
- [ ] **Transaction costs impact**: Does the result show the net-of-costs performance? Is cost sensitivity analyzed?
- [ ] **Benchmark comparison**: Is there a buy-and-hold or index benchmark for context?
- [ ] **Robustness**: Is the strategy tested on out-of-sample data, not just the training period?
- [ ] **Output presentation**: Does the user receive actionable outputs? See the Output Quality section below.

### Step 5 — Output Quality Check

Good backtesting components should produce these outputs clearly:

**Required outputs:**
- Portfolio value curve over time (equity curve)
- Final performance metrics (CAGR, Sharpe, Max Drawdown, Volatility)
- Rebalancing events log (dates + weights before/after)

**Recommended outputs:**
- Rolling Sharpe ratio (12-month window)
- Drawdown chart (underwater curve)
- Asset allocation over time (stacked area or table)
- Comparison against benchmark
- Turnover rate per rebalance

**Optimal result presentation:**
- Summary table of metrics (this period vs benchmark vs alternatives)
- Optimal weights recommended going forward (if an optimizer is used)
- Sensitivity analysis: how does performance change with different rebalancing thresholds?

---

## Common Bugs to Specifically Look For

```
1. Off-by-one in weight application
   BAD:  portfolio_return[t] = weights[t] @ returns[t]   ← uses same-day weights
   GOOD: portfolio_return[t] = weights[t-1] @ returns[t] ← uses prior-day weights

2. Rebalancing to wrong target
   BAD:  weights = current_weights / current_weights.sum()  ← just renormalizes current
   GOOD: weights = target_weights                           ← resets to intended allocation

3. Return calculation on rebalance day
   The rebalance should happen at end-of-day or start-of-next-day — not mid-return

4. Cumulative return computed incorrectly
   BAD:  cumulative = returns.sum()       ← arithmetic, not geometric
   GOOD: cumulative = (1 + returns).prod() - 1

5. Sharpe with wrong risk-free rate
   BAD:  sharpe = mean_return / std_return         ← no risk-free adjustment
   GOOD: sharpe = (mean_return - rf_daily) / std_return * sqrt(252)

6. Max drawdown using price levels not portfolio value
   Must use the cumulative portfolio value series, not raw prices.
```

---

## Output Format

Structure your review as follows:

### 📋 Review Summary
One-paragraph overall verdict: Is this implementation correct? Is it production-ready?

### ✅ What's Correct
Bullet list of things the implementation does well.

### ❌ Issues Found
For each issue:
- **Severity**: Critical / Medium / Minor
- **What's wrong**: Describe the bug or gap
- **Where**: Point to the specific code/logic location
- **Fix**: Show the corrected code or approach

### 📊 Metrics Audit
Table showing each metric found in the output, whether the formula is correct, and the corrected formula if not.

### 🎯 Optimality Assessment
Is the strategy and its output giving the user genuinely useful, optimal results? What's missing?

### 🔧 Recommended Improvements
Prioritized list of the most impactful improvements to make.

---

## Reference Files

- `references/rebalancing-strategies.md` — Details on threshold, calendar, and drift rebalancing
- `references/metrics-formulas.md` — Canonical formulas for all common portfolio metrics

Read these only if you need deeper reference on a specific topic during the review.