/**
 * financialInsights.js
 * Utility functions for generating narrative/interpretive content on the dashboard.
 * Imported by Dashboard.jsx, Investments.jsx, and Liabilities.jsx.
 */

// ─── Constants ────────────────────────────────────────────────────────────────

export const INFLATION_RATE = 6; // Update manually each year

// ─── Asset Allocation ─────────────────────────────────────────────────────────

/**
 * Ideal allocation ranges using the 100-minus-age rule.
 * @param {number} userAge
 * @returns {{ equity: [number,number], debt: [number,number], commodity: [number,number], alt: [number,number] }}
 */
export function getIdealRanges(userAge) {
    const age = userAge ?? 30;
    const equityTarget = 100 - age;
    const debtTarget = 100 - equityTarget;
    return {
        equity:    [equityTarget - 15, equityTarget + 15],
        debt:      [Math.max(10, debtTarget - 15), Math.min(70, debtTarget + 15)],
        commodity: [5, 15],
        alt:       [0, 10],
    };
}

/**
 * @param {'equity'|'debt'|'commodity'|'alt'} assetClass
 * @param {number} currentPct  — 0-100
 * @param {number} userAge
 * @returns {{ status: 'too_low'|'too_high'|'on_track', gap: number }}
 */
export function getAssetStatus(assetClass, currentPct, userAge) {
    const ranges = getIdealRanges(userAge);
    const [min, max] = ranges[assetClass] ?? [0, 100];
    if (currentPct < min) return { status: 'too_low',  gap: min - currentPct };
    if (currentPct > max) return { status: 'too_high', gap: currentPct - max };
    return { status: 'on_track', gap: 0 };
}

const ASSET_EXPLANATIONS = {
    'equity.too_low':   'Your equity allocation is below the recommended range for your age. Equity drives long-term wealth growth — without adequate exposure, your portfolio may not outpace inflation.',
    'equity.too_high':  'Your equity allocation is above the typical range. While this can generate higher returns, it also increases volatility. Consider your risk tolerance and time horizon.',
    'equity.on_track':  'Your equity exposure is well-calibrated for your age and risk profile.',

    'debt.too_high':    'Your debt allocation is significantly above the ideal range. While stable, heavy debt concentration limits long-term wealth-building potential, especially at your age.',
    'debt.too_low':     'Your debt allocation is below the recommended range. Some debt instruments provide stability and act as a cushion during equity market downturns.',
    'debt.on_track':    'Your debt allocation provides a healthy stability cushion.',

    'commodity.too_low':  'A small commodity allocation (5–15%) acts as a hedge against inflation and currency risk.',
    'commodity.too_high': 'Your commodity allocation is above the recommended 5–15% range. Consider rebalancing towards equity or debt.',
    'commodity.on_track': 'Gold and commodities hedge against inflation and currency risk. Your allocation sits within the ideal 5–15% range.',

    'alt.too_high':  'Alternative investments above 10% introduce concentration risk. These are illiquid and highly volatile.',
    'alt.too_low':   'A small alt allocation (up to 10%) can add diversification. Not required for everyone.',
    'alt.on_track':  'Your alternative investments are within the recommended 0–10% range.',
};

/**
 * @param {'equity'|'debt'|'commodity'|'alt'} assetClass
 * @param {'too_low'|'too_high'|'on_track'} status
 * @returns {string}
 */
export function getAssetExplanation(assetClass, status) {
    return ASSET_EXPLANATIONS[`${assetClass}.${status}`] ?? '';
}

/**
 * Specific action suggestion with ₹ amounts.
 * @param {'equity'|'debt'|'commodity'|'alt'} assetClass
 * @param {'too_low'|'too_high'|'on_track'} status
 * @param {number} gapPct         — percentage points to close
 * @param {number} monthlySurplus — available monthly surplus (₹)
 * @param {Function} fmt          — pass the local fmt() helper
 * @returns {string}
 */
export function getAssetAction(assetClass, status, gapPct, monthlySurplus, fmt) {
    if (status === 'on_track') return 'No changes needed — keep your current allocation.';
    const surplus = monthlySurplus ?? 0;
    const sipSuggestion = surplus > 0 ? ` Consider a SIP of ${fmt(Math.round(surplus * 0.3))} per month into an equity mutual fund.` : '';

    const actions = {
        'equity.too_low':   `Increase your equity allocation by ~${Math.round(gapPct)}%.${sipSuggestion}`,
        'equity.too_high':  `Shift ~${Math.round(gapPct)}% from equity to debt funds or fixed deposits to reduce volatility.`,
        'debt.too_low':     `Add debt instruments (FD, debt mutual fund, PPF) to bring allocation up by ~${Math.round(gapPct)}%.`,
        'debt.too_high':    `Gradually shift ~${Math.round(gapPct)}% of debt holdings to equity for better long-term returns.`,
        'commodity.too_low':  `Add a Gold ETF or Sovereign Gold Bond to bring commodity allocation to 5–15%.`,
        'commodity.too_high': `Reduce gold/commodity by ~${Math.round(gapPct)}% and redirect into equity or debt.`,
        'alt.too_high':     `Consider exiting or reducing crypto/alternative investments by ~${Math.round(gapPct)}%.`,
        'alt.too_low':      `A small allocation in REITs or crypto (under 10%) can improve diversification.`,
    };
    return actions[`${assetClass}.${status}`] ?? '';
}

// ─── Growth / Inflation ───────────────────────────────────────────────────────

/**
 * @param {number} growthRate
 * @returns {'below_inflation'|'near_inflation'|'above_inflation'}
 */
export function getGrowthStatus(growthRate) {
    if (growthRate < INFLATION_RATE) return 'below_inflation';
    if (growthRate <= INFLATION_RATE + 2) return 'near_inflation';
    return 'above_inflation';
}

// ─── FBS Context ──────────────────────────────────────────────────────────────

/**
 * @param {number} score — 0-100
 * @returns {{ range: string, message: string, benchmark: string }}
 */
export function getFBSContext(score) {
    let range, message, benchmark;
    if (score <= 20) {
        range = 'Critical';
        message = 'Your financial health needs immediate attention. Focus on the action items below.';
        benchmark = 'Most users starting out score in the 30–50 range.';
    } else if (score <= 40) {
        range = 'Poor';
        message = 'You have a foundation to build on. A few targeted actions can move the needle quickly.';
        benchmark = 'Users in your income range typically score between 35–55.';
    } else if (score <= 60) {
        range = 'Moderate';
        message = 'You\'re on the right track. Strengthening a few key areas will push you into the Good range.';
        benchmark = 'Most users in your income bracket score between 40–60.';
    } else if (score <= 80) {
        range = 'Good';
        message = 'Strong financial habits. Keep optimising and you\'ll reach Excellent.';
        benchmark = 'Users in your income range typically score between 50–70.';
    } else {
        range = 'Excellent';
        message = 'Your financial health is in excellent shape. Keep maintaining these habits.';
        benchmark = 'You\'re in the top tier — most users in your bracket score 50–70.';
    }
    return { range, message, benchmark };
}

// ─── Net Worth Context ────────────────────────────────────────────────────────

/**
 * Returns a calm explanation when net worth is negative, null otherwise.
 * @param {number} netWorth
 * @param {number} totalLiabilities
 * @param {number} goodLiability
 * @param {Function} fmt
 * @returns {string|null}
 */
export function getNetWorthContext(netWorth, totalLiabilities, goodLiability, fmt) {
    if (netWorth >= 0) return null;
    const goodPct = totalLiabilities > 0 ? Math.round(goodLiability / totalLiabilities * 100) : 0;
    if (goodPct >= 60) {
        return `Your net worth is negative primarily because of a home or education loan — a "good liability" that builds an asset over time. This is normal and not a financial crisis. As you pay down the loan, your net worth will improve.`;
    }
    return `Your net worth is currently negative. This is most often driven by outstanding loans. Focus on reducing high-interest (bad) debt first — each rupee paid down directly improves your net worth.`;
}

// ─── Expense Ratio ────────────────────────────────────────────────────────────

/**
 * @param {number} totalExpenses — monthly
 * @param {number} totalMonthlyIncome
 * @returns {{ ratio: number, status: 'healthy'|'moderate'|'high', message: string }}
 */
export function getExpenseRatioContext(totalExpenses, totalMonthlyIncome) {
    if (!totalMonthlyIncome) return { ratio: 0, status: 'healthy', message: '' };
    const ratio = Math.round((totalExpenses / totalMonthlyIncome) * 100);
    let status, message;
    if (ratio < 40) {
        status = 'healthy';
        message = `You spend ${ratio}% of your income — well within the healthy range. You have strong room to invest.`;
    } else if (ratio <= 60) {
        status = 'moderate';
        message = `You spend ${ratio}% of your income. There's room to optimise — trimming discretionary expenses could free up meaningful savings.`;
    } else {
        status = 'high';
        message = `You spend ${ratio}% of your income. High expenses are limiting your ability to save and invest — reviewing your budget is a priority.`;
    }
    return { ratio, status, message };
}

// ─── Overview Narrative Helpers ───────────────────────────────────────────────

const MONEY_SIGN_SHORTHAND = {
    'Bold Eagle':       'you tend to take bold bets — ensure diversification guards against concentration risk.',
    'Cautious Turtle':  'you prefer safety over returns — consider increasing equity exposure for long-term growth.',
    'Persistent Horse': 'your disciplined, steady approach is a strong asset — keep reviewing annually.',
    'Curious Fox':      'your curiosity can uncover opportunities but also lead to overtrading — stay methodical.',
    'Strategic Owl':    'your analytical discipline is a real strength — act on your analysis without overthinking.',
    'Loyal Elephant':   'your loyalty to proven instruments is admirable — open up to some diversification.',
    'Balanced Dolphin': 'your balanced approach is working well — continue reviewing allocation periodically.',
};

/**
 * Identifies the user's biggest financial strength.
 * @param {object} d — full /dashboard/full response
 * @returns {string}
 */
export function getBiggestStrength(d) {
    const em = d.overview?.emergency?.emergencyFunds;
    if (em && em.actual >= em.ideal && em.ideal > 0) return 'a fully-funded emergency reserve';
    const bad = d.overview?.liabilities?.badLiability?.outstanding ?? 0;
    if (bad === 0 && (d.overview?.liabilities?.total ?? 0) > 0) return 'no bad debt on your balance sheet';
    if (bad === 0 && (d.overview?.liabilities?.total ?? 0) === 0) return 'a debt-free balance sheet';
    const life = d.overview?.insurance?.lifeCover ?? 0;
    const idealLife = d.insurance?.idealTermCover ?? 0;
    if (life > 0 && idealLife > 0 && life >= idealLife) return 'adequate life insurance coverage';
    const health = d.overview?.insurance?.healthCover ?? 0;
    const idealHealth = d.insurance?.idealHealth ?? 0;
    if (health > 0 && idealHealth > 0 && health >= idealHealth) return 'solid health insurance coverage';
    const surplus = d.overview?.surplus?.monthly ?? 0;
    if (surplus > 0) return `a positive monthly surplus of ${String(surplus)}`; // fmt not available here — caller should use getBiggestStrengthFmt
    return 'a regular savings habit';
}

/**
 * Identifies the user's biggest financial gap.
 * @param {object} d
 * @param {Function} fmt
 * @param {number} userAge
 * @returns {string}
 */
export function getBiggestGap(d, fmt, userAge) {
    const em = d.overview?.emergency?.emergencyFunds;
    if (em && em.actual < em.ideal) return `no emergency fund (target: ${fmt(em.ideal)})`;
    const bad = d.overview?.liabilities?.badLiability?.outstanding ?? 0;
    const annualIncome = d.overview?.income?.total ?? 0;
    if (bad > annualIncome * 0.2) return `high bad debt of ${fmt(bad)}`;
    const life = d.overview?.insurance?.lifeCover ?? 0;
    if (life === 0) return 'no life insurance coverage';
    const health = d.overview?.insurance?.healthCover ?? 0;
    if (health === 0) return 'no health insurance coverage';
    const equityPct = d.overview?.investments?.allocation?.equity ?? 0;
    const age = userAge ?? 30;
    const { status: eqStatus } = getAssetStatus('equity', equityPct, age);
    if (eqStatus === 'too_low') return 'equity allocation below the ideal range for your age';
    if (eqStatus === 'too_high') return 'equity allocation above the recommended range for your age';
    return 'consistent investment discipline';
}

/**
 * Returns the title of the highest-impact pending action, or null.
 * @param {Array} actionPlan
 * @returns {string|null}
 */
export function getTopPriorityActionTitle(actionPlan) {
    if (!actionPlan?.length) return null;
    const top = [...actionPlan]
        .filter(a => (a.fbsImpact ?? 0) > 0 && a.status !== 'completed')
        .sort((a, b) => b.fbsImpact - a.fbsImpact)[0];
    return top?.title ?? null;
}

// ─── Action Plan Helpers ───────────────────────────────────────────────────────

const CATEGORY_LINKS = {
    'Emergency Fund':     { path: '/reports',       label: 'Mark as done →' },
    'Insurance':          { path: '/reports',       label: 'Mark as done →' },
    'Debt Management':    { path: '/reports',       label: 'Mark as done →' },
    'Asset Reallocation': { path: '/reports',       label: 'Mark as done →' },
    'Tax Planning':       { path: '/reports',       label: 'Mark as done →' },
    'Financial Habits':   { path: '/reports',       label: 'Mark as done →' },
    'Goal Clarity':       { path: '/goal-planner',  label: 'Open Goal Planner →' },
    'Estate Planning':    { path: '/reports',       label: 'Mark as done →' },
    'Credit Health':      { path: '/reports',       label: 'Mark as done →' },
};
const FALLBACK_LINK = { path: '/reports', label: 'Mark as done →' };

/**
 * @param {string} category — action.category
 * @returns {{ path: string, label: string }}
 */
export function getActionLink(category) {
    return CATEGORY_LINKS[category] ?? FALLBACK_LINK;
}

/**
 * Generates a specific next-step sentence for an action item.
 * @param {object} action — action plan item
 * @param {Function} fmt
 * @returns {string}
 */
export function getActionNextStep(action, fmt) {
    if ((action.monthlyContribution ?? 0) > 0) {
        return `Start with ${fmt(action.monthlyContribution)}/month to reach this goal.`;
    }
    if ((action.suggestedAmount ?? 0) > 0) {
        return `Target amount: ${fmt(action.suggestedAmount)}.`;
    }
    // Fall back to first sentence of description
    const firstSentence = (action.description ?? '').split('.')[0].trim();
    return firstSentence.length > 120 ? firstSentence.slice(0, 117) + '…' : firstSentence;
}

// ─── Narrative Summaries ──────────────────────────────────────────────────────

/**
 * 4-5 sentence plain-English paragraph for the Overview "Your Financial Story" card.
 * @param {object} d — full /dashboard/full response
 * @param {Function} fmt
 * @param {number} userAge
 * @param {Array} actionPlan
 * @returns {string}
 */
export function getOverviewNarrative(d, fmt, userAge, actionPlan) {
    const fbs = d.overview?.fbs ?? 0;
    const { range } = getFBSContext(fbs);
    const stage = d.overview?.lifeStage?.stage ?? 'Building Phase';
    const moneySign = d.overview?.moneySign?.name ?? '';

    const stageMap = {
        'Foundation Phase': 'early in your career',
        'Building Phase': 'in your wealth-building years',
        'Accumulation Phase': 'in your peak earning years',
        'Pre-Retirement Phase': 'approaching retirement',
        'Retirement Phase': 'in your retirement phase',
    };
    const stageText = stageMap[stage] ?? 'building your financial foundation';

    const strength = getBiggestStrength(d);
    const gap = getBiggestGap(d, fmt, userAge);
    const topAction = getTopPriorityActionTitle(actionPlan);
    const signHint = moneySign ? MONEY_SIGN_SHORTHAND[moneySign] : null;

    const s1 = `You are ${stageText} with a Financial Health Score of <strong>${fbs}/100</strong> — <strong>${range.toLowerCase()}</strong>.`;
    const s2 = `Your strongest area right now is <strong>${strength}</strong>.`;
    const s3 = `The key gap to address is <strong>${gap}</strong>.`;
    const s4 = topAction ? `Your highest-impact next step is to ${topAction.toLowerCase()}.` : '';
    const s5 = signHint ? `As a <strong>${moneySign}</strong>, ${signHint}` : '';

    return [s1, s2, s3, s4, s5].filter(Boolean).join(' ');
}

/**
 * 2-3 sentence summary for the Investments page narrative card.
 * @param {number} userAge
 * @param {object} allocations — { equity, debt, commodity, realEstate, altInvestments }
 * @param {Array}  holdings    — Array<{ name, value, assetClass, growth }>
 * @param {Function} fmt
 * @returns {string}
 */
export function getInvestmentNarrative(userAge, allocations, holdings, fmt) {
    const age = userAge ?? 30;
    const equity = allocations?.equity ?? 0;
    const { status: equityStatus } = getAssetStatus('equity', equity, age);

    const totalHoldings = holdings?.length ?? 0;
    const belowInflation = (holdings ?? []).filter(h => getGrowthStatus(h.growth ?? 0) === 'below_inflation').length;

    const equityLine = equityStatus === 'on_track'
        ? `Your equity allocation is well-matched to your age.`
        : equityStatus === 'too_low'
            ? `Your equity allocation is lower than ideal for your age — increasing it can improve long-term returns.`
            : `Your equity allocation is higher than the recommended range for your age, adding volatility to your portfolio.`;

    const holdingsLine = totalHoldings > 0
        ? belowInflation > 0
            ? ` ${belowInflation} of your ${totalHoldings} holding${totalHoldings > 1 ? 's are' : ' is'} growing below inflation — review those positions.`
            : ` All ${totalHoldings} holding${totalHoldings > 1 ? 's are' : ' is'} growing above inflation — good health across your portfolio.`
        : '';

    return `${equityLine}${holdingsLine} Use the allocation cards below to see where your portfolio stands versus age-appropriate benchmarks.`;
}
