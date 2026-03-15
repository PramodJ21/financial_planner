/**
 * Goal Calculations - Shared Financial Computation Module
 * 
 * Extracted from GoalPlanner.jsx so that both the component and
 * budgetStrategies.js can import the same calculation functions.
 * 
 * Exports: INFLATION_RATE, ASSET_RETURNS, RISK_LABELS, RISK_COLORS,
 *          calcSIP, inflationAdjusted, getGoalAllocation, getBlendedReturn,
 *          getTimeBase, getRiskAdj, getHardCaps, generateYearlyData,
 *          generateMonthlyData, corpusAtMonth, computeGoalResult
 */

// ═══════════════════════════════════════════════════
// CONSTANTS
// ═══════════════════════════════════════════════════

export const INFLATION_RATE = 0.06;

export const RISK_LABELS = ['Very Conservative', 'Conservative', 'Moderate', 'Aggressive', 'Very Aggressive', 'Custom'];
export const RISK_COLORS = ['#64748B', '#4A6B8A', '#2D8A6E', '#D4935A', '#C84B4B', '#94A3B8'];

export const GOAL_COLORS = ['#4A6B8A', '#2D8A6E', '#D4935A', '#C84B4B', '#7B6B8A', '#B5607A', '#4A8A8A', '#C4775A'];

// Per-asset expected returns by risk level (indices 0–4)
export const ASSET_RETURNS = [
    { equity: 0.08, debt: 0.06, commodity: 0.045 },   // Very Conservative
    { equity: 0.095, debt: 0.065, commodity: 0.055 },  // Conservative
    { equity: 0.12, debt: 0.07, commodity: 0.07 },     // Moderate
    { equity: 0.14, debt: 0.075, commodity: 0.08 },    // Aggressive
    { equity: 0.16, debt: 0.08, commodity: 0.095 },    // Very Aggressive
];

// ═══════════════════════════════════════════════════
// ALLOCATION ENGINE
// ═══════════════════════════════════════════════════

/** Time horizon base allocations (60% weight) */
export function getTimeBase(years) {
    if (years <= 2) return { equity: 5, debt: 85, commodity: 10 };
    if (years <= 5) return { equity: 25, debt: 62, commodity: 13 };
    if (years <= 10) return { equity: 50, debt: 37, commodity: 13 };
    return { equity: 72, debt: 20, commodity: 8 };
}

/** Risk level adjustments (40% weight) - riskLevel is 0-4 index */
export function getRiskAdj(riskLevel) {
    const adjustments = [
        { equity: -20, debt: 17, commodity: 3 },
        { equity: -10, debt: 8, commodity: 2 },
        { equity: 0, debt: 0, commodity: 0 },
        { equity: 10, debt: -8, commodity: -2 },
        { equity: 20, debt: -17, commodity: -3 },
    ];
    return adjustments[riskLevel] || adjustments[2];
}

/** Hard caps by time horizon */
export function getHardCaps(years) {
    if (years <= 2) return { equityMax: 10, debtMin: 70 };
    if (years <= 5) return { equityMax: 40, debtMin: 45 };
    if (years <= 10) return { equityMax: 65, debtMin: 25 };
    return { equityMax: 85, debtMin: 10 };
}

/** Main allocation function - returns { equity, debt, commodity } summing to 100 */
export function getGoalAllocation(years, riskLevel) {
    const base = getTimeBase(years);
    const adj = getRiskAdj(riskLevel);
    const caps = getHardCaps(years);

    let equity = (base.equity * 0.6) + (adj.equity * 0.4);
    let debt = (base.debt * 0.6) + (adj.debt * 0.4);
    let commodity = (base.commodity * 0.6) + (adj.commodity * 0.4);

    equity = Math.min(equity, caps.equityMax);
    debt = Math.max(debt, caps.debtMin);
    commodity = Math.max(5, Math.min(15, commodity));

    equity = Math.max(0, Math.min(90, equity));
    debt = Math.max(0, Math.min(90, debt));
    commodity = Math.max(0, Math.min(90, commodity));

    const total = equity + debt + commodity;
    if (total > 0) {
        equity = Math.round(equity / total * 100);
        debt = Math.round(debt / total * 100);
        commodity = 100 - equity - debt;
    }

    return { equity, debt, commodity };
}

/** Blended portfolio return as a decimal (e.g. 0.12 for 12%) */
export function getBlendedReturn(allocation, riskLevel, customReturns = null) {
    const returns = customReturns || (ASSET_RETURNS[riskLevel] || ASSET_RETURNS[2]);
    return (allocation.equity / 100) * returns.equity
        + (allocation.debt / 100) * returns.debt
        + (allocation.commodity / 100) * returns.commodity;
}

// ═══════════════════════════════════════════════════
// FINANCIAL CALCULATIONS
// ═══════════════════════════════════════════════════

/** Inflate target amount by INFLATION_RATE over given years */
export function inflationAdjusted(target, years) {
    return target * Math.pow(1 + INFLATION_RATE, years);
}

/**
 * Calculate monthly SIP required to reach a target corpus.
 * @param {number} target - Target corpus (inflation-adjusted if applicable)
 * @param {number} years - Time horizon in years
 * @param {number} annualReturn - Blended annual return as decimal (e.g. 0.12)
 * @returns {number} Monthly SIP amount
 */
export function calcSIP(target, years, annualReturn) {
    if (years <= 0 || target <= 0) return 0;
    const rm = annualReturn / 12;
    const n = years * 12;
    if (rm === 0) return target / n;
    return target * rm / (Math.pow(1 + rm, n) - 1);
}

/** Calculate corpus accumulated after N months of SIP at given return */
export function corpusAtMonth(sip, months, annualReturn) {
    if (months <= 0 || sip <= 0) return 0;
    const rm = annualReturn / 12;
    if (rm === 0) return sip * months;
    return sip * (Math.pow(1 + rm, months) - 1) / rm;
}

/** Generate per-year data for combo chart + yearly breakdown */
export function generateYearlyData(sip, years, annualReturn) {
    const data = [];
    for (let y = 1; y <= years; y++) {
        const months = y * 12;
        const invested = Math.round(sip * 12 * y);
        const corpus = Math.round(corpusAtMonth(sip, months, annualReturn));
        const profit = Math.max(0, corpus - invested);
        data.push({ year: y, invested, profit, total: corpus });
    }
    return data;
}

/** Generate per-month data for monthly breakdown table */
export function generateMonthlyData(sip, months, annualReturn) {
    const data = [];
    for (let m = 1; m <= months; m++) {
        const invested = Math.round(sip * m);
        const corpus = Math.round(corpusAtMonth(sip, m, annualReturn));
        const profit = Math.max(0, corpus - invested);
        data.push({ month: m, invested, profit, total: corpus });
    }
    return data;
}

/**
 * Compute all derived metrics for a single goal.
 * Used by both GoalPlanner.jsx and budgetStrategies.js.
 * @param {Object} g - Goal object with { target, years, riskLevel, includeInflation, ... }
 * @returns {Object} Goal with computed allocation, blendedReturn, sip, yearlyData, etc.
 */
export function computeGoalResult(g) {
    let allocation, blendedReturn;
    if (g.riskLevel === 5) {
        allocation = { equity: g.customEquityAlloc || 0, debt: g.customDebtAlloc || 0, commodity: g.customCommodityAlloc || 0 };
        const customReturns = { equity: (g.customEquityReturn || 0) / 100, debt: (g.customDebtReturn || 0) / 100, commodity: (g.customCommodityReturn || 0) / 100 };
        blendedReturn = getBlendedReturn(allocation, 5, customReturns);
    } else {
        allocation = getGoalAllocation(g.years, g.riskLevel);
        blendedReturn = getBlendedReturn(allocation, g.riskLevel);
    }
    const inflatedTarget = g.includeInflation ? inflationAdjusted(g.target, g.years) : g.target;
    const sip = calcSIP(inflatedTarget, g.years, blendedReturn);
    const totalInvested = sip * g.years * 12;
    const wealthGained = inflatedTarget - totalInvested;
    const yearlyData = generateYearlyData(sip, g.years, blendedReturn);
    const monthlyData = generateMonthlyData(sip, g.years * 12, blendedReturn);
    const highSip = sip > 100000;

    let rationale = '';
    if (g.years <= 2) rationale = `Short-term goal - heavy debt allocation for stability, minimal equity exposure.`;
    else if (g.years <= 5) rationale = `Medium-term goal - balanced mix with moderate equity for growth potential.`;
    else if (g.years <= 10) rationale = `Long-term goal - equity-heavy allocation to leverage compounding returns.`;
    else rationale = `Very long-term goal - maximising equity exposure for superior wealth creation.`;
    rationale += ` ${RISK_LABELS[g.riskLevel]} risk profile applied.`;

    return {
        ...g,
        allocation,
        blendedReturn,
        inflatedTarget,
        sip,
        totalInvested,
        wealthGained,
        yearlyData,
        monthlyData,
        highSip,
        rationale,
        equityReturn: g.riskLevel === 5 ? (g.customEquityReturn / 100) : ASSET_RETURNS[g.riskLevel].equity,
        debtReturn: g.riskLevel === 5 ? (g.customDebtReturn / 100) : ASSET_RETURNS[g.riskLevel].debt,
        commodityReturn: g.riskLevel === 5 ? (g.customCommodityReturn / 100) : ASSET_RETURNS[g.riskLevel].commodity,
    };
}
