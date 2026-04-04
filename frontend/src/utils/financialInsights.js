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
export function getFBSContext(score, lifeStage) {
    let range, message;
    if (score <= 20) {
        range = 'Critical';
        message = 'Your financial health needs immediate attention. Focus on the action items below.';
    } else if (score <= 40) {
        range = 'Poor';
        message = 'You have a foundation to build on. A few targeted actions can move the needle quickly.';
    } else if (score <= 60) {
        range = 'Moderate';
        message = 'You\'re on the right track. Strengthening a few key areas will push you into the Good range.';
    } else if (score <= 80) {
        range = 'Good';
        message = 'Strong financial habits. Keep optimising and you\'ll reach Excellent.';
    } else {
        range = 'Excellent';
        message = 'Your financial health is in excellent shape. Keep maintaining these habits.';
    }
    const stageLabel = lifeStage?.label || 'your life stage';
    const stageDesc = lifeStage?.description || '';
    const benchmark = `Scored for ${stageLabel} — ${stageDesc}.`;
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
export function getNetWorthContext(netWorth, totalLiabilities, goodLiability) {
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
export function getBiggestStrength(d, fmt) {
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
    if (surplus > 0) return `a positive monthly surplus of ${fmt ? fmt(surplus) : surplus}`;
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

    const strength = getBiggestStrength(d, fmt);
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
export function getInvestmentNarrative(userAge, allocations, holdings) {
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

// ─── Strengths & Gaps (Chapters 03 / 04) ────────────────────────────────────

/**
 * Returns an array of strength objects derived from dashboard data.
 * Each: { title, value, explanation, link }
 * Shows top 5 strengths max — ordered by importance.
 * @param {object} d — full /dashboard/full response
 * @param {Function} fmt — currency formatter
 * @returns {Array<{ title: string, value: string, explanation: string, link: string }>}
 */
export function getStrengths(d, fmt) {
    const strengths = [];
    const age = d.overview?.profile?.age ?? 30;

    // 1. Emergency fund adequate
    const em = d.overview?.emergency?.emergencyFunds;
    if (em && em.ideal > 0 && em.actual >= em.ideal) {
        const months = Math.round(em.actual / (em.ideal / 6));
        strengths.push({
            title: 'Emergency Fund',
            value: `${months} months covered`,
            explanation: `Your emergency fund of ${fmt(em.actual)} covers ${months} months of expenses — well above the 6-month target.`,
            link: '/investments',
        });
    }

    // 2. No bad debt
    const badOutstanding = d.overview?.liabilities?.badLiability?.outstanding ?? 0;
    const hasLiabilities = d.overview?.liabilities?.hasLiabilities;
    if (badOutstanding === 0) {
        if (hasLiabilities) {
            strengths.push({
                title: 'No Bad Debt',
                value: 'Zero high-interest debt',
                explanation: 'You have no high-interest debt — all your liabilities are "good" debt (home/education loans) that build assets over time.',
                link: '/liabilities',
            });
        } else {
            strengths.push({
                title: 'Debt-Free',
                value: 'No outstanding liabilities',
                explanation: 'You have no outstanding loans or credit card debt — a clean balance sheet.',
                link: '/liabilities',
            });
        }
    }

    // 3. SIP consistency
    const sipMonths = d.overview?.fbsBreakdown?.investmentRegularity;
    const sipMax = d.overview?.fbsWeights?.investmentRegularity;
    const monthlySip = d.investments?.assets?.monthlySip ?? 0;
    if (sipMax && sipMonths >= sipMax * 0.7 && monthlySip > 0) {
        strengths.push({
            title: 'Regular Investments',
            value: `${fmt(monthlySip)}/month SIP`,
            explanation: `You invest ${fmt(monthlySip)} monthly via SIP — consistent investing is the strongest wealth-building habit.`,
            link: '/investments',
        });
    }

    // 4. Health insurance adequate
    const healthCover = d.overview?.insurance?.healthCover ?? 0;
    const idealHealth = d.insurance?.idealHealth ?? 0;
    if (healthCover > 0 && idealHealth > 0 && healthCover >= idealHealth) {
        strengths.push({
            title: 'Health Insurance',
            value: fmt(healthCover),
            explanation: `Your health cover of ${fmt(healthCover)} meets the recommended ${fmt(idealHealth)} — you're protected against medical emergencies.`,
            link: '/insurance',
        });
    }

    // 5. Life insurance adequate
    const lifeCover = d.overview?.insurance?.lifeCover ?? 0;
    const idealLife = d.insurance?.idealTermCover ?? 0;
    if (lifeCover > 0 && idealLife > 0 && lifeCover >= idealLife) {
        strengths.push({
            title: 'Life Insurance',
            value: fmt(lifeCover),
            explanation: `Your term cover of ${fmt(lifeCover)} meets the recommended ${fmt(idealLife)} — your dependents are financially protected.`,
            link: '/insurance',
        });
    }

    // 6. Good expense ratio
    const totalExpenses = d.overview?.expenses?.effectiveMonthly ?? 0;
    const monthlyIncome = d.overview?.income?.total ? d.overview.income.total / 12 : 0;
    if (monthlyIncome > 0) {
        const ratio = Math.round((totalExpenses / monthlyIncome) * 100);
        if (ratio < 50) {
            strengths.push({
                title: 'Healthy Expense Ratio',
                value: `${ratio}% of income`,
                explanation: `You spend ${ratio}% of your monthly income — well within the healthy range, leaving strong room to save and invest.`,
                link: '/dashboard',
            });
        }
    }

    // 7. Credit score 750+
    const creditScore = d.overview?.creditScore ?? 0;
    if (creditScore >= 750) {
        strengths.push({
            title: 'Credit Score',
            value: `${creditScore}`,
            explanation: `Your credit score of ${creditScore} is excellent — you'll get the best rates on loans and credit products.`,
            link: '/liabilities',
        });
    }

    // 9. Tax-optimized
    const taxRegime = d.tax?.recommended;
    const potentialSavings = d.tax?.potentialSavings ?? 0;
    if (taxRegime && potentialSavings === 0) {
        strengths.push({
            title: 'Tax Optimised',
            value: `On ${taxRegime}`,
            explanation: `You're already on the optimal tax regime — no additional savings available from switching.`,
            link: '/tax',
        });
    }

    // 10. Asset allocation on track
    const equityPct = d.overview?.investments?.allocation?.equity ?? 0;
    const { status: eqStatus } = getAssetStatus('equity', equityPct, age);
    const debtPct = d.overview?.investments?.allocation?.debt ?? 0;
    const { status: debtStatus } = getAssetStatus('debt', debtPct, age);
    if (eqStatus === 'on_track' && debtStatus === 'on_track' && d.overview?.investments?.total > 0) {
        strengths.push({
            title: 'Balanced Portfolio',
            value: `${equityPct}% equity, ${debtPct}% debt`,
            explanation: 'Your equity and debt allocation are both within the ideal range for your age — a well-balanced portfolio.',
            link: '/investments',
        });
    }

    // 11. Positive monthly surplus
    const surplus = d.overview?.surplus?.monthly ?? 0;
    if (surplus > 0 && !strengths.some(s => s.title === 'Healthy Expense Ratio')) {
        strengths.push({
            title: 'Positive Surplus',
            value: `${fmt(surplus)}/month`,
            explanation: `You have a monthly surplus of ${fmt(surplus)} after all expenses, EMIs, and investments — room to grow your wealth.`,
            link: '/dashboard',
        });
    }

    return strengths.slice(0, 5);
}

/**
 * Returns an array of gap objects derived from dashboard data.
 * Each: { title, current, target, explanation, link, explorePage }
 * Shows ALL gaps — the dashboard will collapse beyond 4.
 * @param {object} d — full /dashboard/full response
 * @param {Function} fmt — currency formatter
 * @returns {Array<{ title: string, current: string, target: string, explanation: string, link: string, explorePage: string }>}
 */
export function getGaps(d, fmt) {
    const gaps = [];
    const age = d.overview?.profile?.age ?? 30;

    // 1. No/low emergency fund
    const em = d.overview?.emergency?.emergencyFunds;
    if (em && em.ideal > 0 && em.actual < em.ideal) {
        const months = em.actual > 0 ? Math.round(em.actual / (em.ideal / 6)) : 0;
        gaps.push({
            title: 'Emergency Fund',
            current: months > 0 ? `${months} months` : 'None',
            target: '6 months of expenses',
            explanation: em.actual === 0
                ? `No emergency fund set aside. Target: ${fmt(em.ideal)} (6 months of expenses).`
                : `Your emergency fund covers only ${months} months — target is 6 months (${fmt(em.ideal)}).`,
            link: '/investments',
            explorePage: 'Investments',
        });
    }

    // 2. Missing health insurance
    const healthCover = d.overview?.insurance?.healthCover ?? 0;
    const idealHealth = d.insurance?.idealHealth ?? 0;
    if (idealHealth > 0 && healthCover < idealHealth) {
        gaps.push({
            title: 'Health Insurance',
            current: healthCover > 0 ? fmt(healthCover) : 'None',
            target: fmt(idealHealth),
            explanation: healthCover === 0
                ? `No health insurance — this is a critical gap. Target: ${fmt(idealHealth)} sum insured.`
                : `Your health cover of ${fmt(healthCover)} is below the recommended ${fmt(idealHealth)}.`,
            link: '/insurance',
            explorePage: 'Insurance',
        });
    }

    // 3. Missing life insurance (only if dependents)
    const lifeCover = d.overview?.insurance?.lifeCover ?? 0;
    const idealLife = d.insurance?.idealTermCover ?? 0;
    if (idealLife > 0 && lifeCover < idealLife) {
        gaps.push({
            title: 'Life Insurance',
            current: lifeCover > 0 ? fmt(lifeCover) : 'None',
            target: fmt(idealLife),
            explanation: lifeCover === 0
                ? `No term life cover — your dependents are financially unprotected. Target: ${fmt(idealLife)}.`
                : `Your life cover of ${fmt(lifeCover)} is below the recommended ${fmt(idealLife)}.`,
            link: '/insurance',
            explorePage: 'Insurance',
        });
    }

    // 4. High bad debt
    const badOutstanding = d.overview?.liabilities?.badLiability?.outstanding ?? 0;
    if (badOutstanding > 0) {
        const annualIncome = d.overview?.income?.total ?? 0;
        const severity = annualIncome > 0 && badOutstanding > annualIncome * 0.2 ? 'high' : 'moderate';
        gaps.push({
            title: 'Bad Debt',
            current: fmt(badOutstanding),
            target: '₹0',
            explanation: severity === 'high'
                ? `${fmt(badOutstanding)} in high-interest debt — this is eroding your net worth. Prioritise paying this down.`
                : `${fmt(badOutstanding)} in high-interest debt. Pay this off before increasing investments.`,
            link: '/liabilities',
            explorePage: 'Liabilities',
        });
    }

    // 5. No SIP / investments
    const monthlySip = d.investments?.assets?.monthlySip ?? 0;
    const totalInvestments = d.overview?.investments?.total ?? 0;
    if (monthlySip === 0 && totalInvestments === 0) {
        gaps.push({
            title: 'No Investments',
            current: 'None',
            target: 'Start a SIP',
            explanation: 'You have no investments or SIPs. Even a small monthly SIP can build significant wealth over time.',
            link: '/investments',
            explorePage: 'Investments',
        });
    } else if (monthlySip === 0 && totalInvestments > 0) {
        gaps.push({
            title: 'No Regular Investment',
            current: 'No SIP',
            target: 'Start a SIP',
            explanation: `You have ${fmt(totalInvestments)} in assets but no regular monthly investment. A SIP builds the discipline of consistent investing.`,
            link: '/investments',
            explorePage: 'Investments',
        });
    }

    // 6. Poor asset allocation
    const equityPct = d.overview?.investments?.allocation?.equity ?? 0;
    const { status: eqStatus } = getAssetStatus('equity', equityPct, age);
    if (totalInvestments > 0 && eqStatus !== 'on_track') {
        const ranges = getIdealRanges(age);
        gaps.push({
            title: 'Asset Allocation',
            current: `${equityPct}% equity`,
            target: `${ranges.equity[0]}–${ranges.equity[1]}%`,
            explanation: eqStatus === 'too_low'
                ? `Equity allocation of ${equityPct}% is below the ${ranges.equity[0]}–${ranges.equity[1]}% range for your age — limiting long-term growth.`
                : `Equity allocation of ${equityPct}% exceeds the ${ranges.equity[0]}–${ranges.equity[1]}% range — adding volatility risk.`,
            link: '/investments',
            explorePage: 'Investments',
        });
    }

    // 7. Tax inefficiency
    const taxRegime = d.tax?.recommended;
    const potentialSavings = d.tax?.potentialSavings ?? 0;
    if (potentialSavings > 5000) {
        gaps.push({
            title: 'Tax Optimisation',
            current: `Potential savings: ${fmt(potentialSavings)}/year`,
            target: `Switch to ${taxRegime}`,
            explanation: `Switching to the ${taxRegime} could save you ${fmt(potentialSavings)} per year in taxes.`,
            link: '/tax',
            explorePage: 'Tax',
        });
    }

    // 9. Low credit score
    const creditScore = d.overview?.creditScore ?? 0;
    if (creditScore > 0 && creditScore < 750) {
        gaps.push({
            title: 'Credit Score',
            current: `${creditScore}`,
            target: '750+',
            explanation: `Your credit score of ${creditScore} is below the ideal 750. Improving it will get you better loan rates and credit terms.`,
            link: '/liabilities',
            explorePage: 'Liabilities',
        });
    }

    // 10. No goals defined
    const goalClarity = d.overview?.fbsBreakdown?.goalClarity ?? 0;
    if (goalClarity === 0) {
        gaps.push({
            title: 'No Financial Goals',
            current: 'None set',
            target: 'Define 2-3 goals',
            explanation: 'No financial goals defined. Goal-based investing gives your money a purpose and timeline — improving both clarity and returns.',
            link: '/goal-planner',
            explorePage: 'Goal Planner',
        });
    }

    return gaps;
}

// ─── Dashboard Layout Helpers ────────────────────────────────────────────────

/**
 * Maps life stage string to a normalized key.
 */
function normalizeStage(stage) {
    if (!stage) return 'building';
    const s = stage.toLowerCase();
    if (s.includes('foundation')) return 'foundation';
    if (s.includes('building'))   return 'building';
    if (s.includes('accumulation')) return 'accumulation';
    if (s.includes('pre-retirement') || s.includes('pre retirement')) return 'preRetirement';
    if (s.includes('retirement')) return 'retirement';
    return 'building';
}

/**
 * Returns ordered section config for the dashboard based on user's life stage.
 * Each entry: { key, defaultExpanded, emphasis }
 * @param {string} lifeStage — e.g. "Building Phase"
 * @returns {Array<{ key: string, defaultExpanded: boolean, emphasis: string }>}
 */
export function getSectionOrder(lifeStage) {
    const stage = normalizeStage(lifeStage);
    const always = [
        { key: 'greeting',  defaultExpanded: true,  emphasis: 'high' },
        { key: 'fbs',       defaultExpanded: true,  emphasis: 'high' },
        { key: 'actions',   defaultExpanded: true,  emphasis: 'high' },
    ];

    const orders = {
        foundation: [
            { key: 'snapshot',  defaultExpanded: true,  emphasis: 'high' },
            { key: 'portfolio', defaultExpanded: false, emphasis: 'normal' },
            { key: 'planning',  defaultExpanded: true,  emphasis: 'normal' },
        ],
        building: [
            { key: 'snapshot',  defaultExpanded: true,  emphasis: 'high' },
            { key: 'portfolio', defaultExpanded: true,  emphasis: 'normal' },
            { key: 'planning',  defaultExpanded: true,  emphasis: 'normal' },
        ],
        accumulation: [
            { key: 'snapshot',  defaultExpanded: true,  emphasis: 'normal' },
            { key: 'portfolio', defaultExpanded: true,  emphasis: 'high' },
            { key: 'planning',  defaultExpanded: true,  emphasis: 'normal' },
        ],
        preRetirement: [
            { key: 'portfolio', defaultExpanded: true,  emphasis: 'high' },
            { key: 'snapshot',  defaultExpanded: true,  emphasis: 'normal' },
            { key: 'planning',  defaultExpanded: true,  emphasis: 'high' },
        ],
        retirement: [
            { key: 'portfolio', defaultExpanded: true,  emphasis: 'high' },
            { key: 'snapshot',  defaultExpanded: true,  emphasis: 'normal' },
            { key: 'planning',  defaultExpanded: true,  emphasis: 'high' },
        ],
    };

    return [...always, ...(orders[stage] || orders.building)];
}

/**
 * Returns the 3 most relevant KPI keys for a given life stage.
 * @param {string} lifeStage
 * @returns {string[]} — keys from: 'netWorth','totalAssets','totalLiabilities','monthlySurplus','creditScore'
 */
export function getRelevantKPIs(lifeStage) {
    const stage = normalizeStage(lifeStage);
    const map = {
        foundation:    ['netWorth', 'monthlySurplus', 'creditScore'],
        building:      ['netWorth', 'monthlySurplus', 'creditScore'],
        accumulation:  ['netWorth', 'monthlySurplus', 'totalAssets'],
        preRetirement: ['netWorth', 'totalAssets', 'totalLiabilities'],
        retirement:    ['netWorth', 'totalAssets', 'totalLiabilities'],
    };
    return map[stage] || map.building;
}

/**
 * Returns the default active tab for the Planning section.
 * @param {string} lifeStage
 * @returns {'cashflow'|'persona'|'estate'}
 */
export function getDefaultPlanningTab(lifeStage) {
    const stage = normalizeStage(lifeStage);
    const map = {
        foundation:    'persona',
        building:      'persona',
        accumulation:  'cashflow',
        preRetirement: 'estate',
        retirement:    'estate',
    };
    return map[stage] || 'persona';
}
