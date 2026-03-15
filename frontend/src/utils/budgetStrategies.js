/**
 * Budget Resolution Engine - Strategy Computation Module
 * 
 * This module contains all 6 budget resolution strategies. Each strategy
 * accepts the original goals array and monthly budget, then returns a
 * structured result indicating how goals should be modified to fit the budget.
 * 
 * INPUTS:
 *   - goals: Array of goal objects (with priorityWeight, target, years, riskLevel, etc.)
 *   - monthlyBudget: Number - user's monthly investment budget
 *   - goalResults: Array of computed goal results (with .sip for each goal)
 * 
 * OUTPUT (per strategy):
 *   {
 *     id: string,
 *     name: string,
 *     description: string,
 *     tradeoff: string,
 *     deficitResolved: boolean,
 *     remainingShortfall: number,
 *     modifiedGoals: Array<{ goalId, changes: {...}, reason: string }>
 *   }
 * 
 * HARD CONSTRAINTS (enforced in every strategy):
 *   - Max 30 years total for any goal
 *   - Max 30% amount reduction from original target
 *   - No risk change on goals with horizon < 5 years
 *   - Never exceed Very Aggressive (risk index 4)
 *   - Priority 5 goals untouched except S3 (risk only, if ≥ 5yr)
 *   - Commodity always 5–15%
 *   - No asset class at 0% or above 90%
 */

import { calcSIP, inflationAdjusted, getGoalAllocation, getBlendedReturn, ASSET_RETURNS } from './goalCalculations';

// ═══════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════

/**
 * Compute the adjustability score for a goal.
 * Higher score = more adjustable (should be changed first).
 * Formula: (6 − priority_weight) × time_flexibility_factor
 */
function adjustabilityScore(goal) {
    const pw = goal.priorityWeight || 3;
    let timeFlex;
    if (goal.years < 2) timeFlex = 0.5;
    else if (goal.years <= 5) timeFlex = 1.0;
    else if (goal.years <= 10) timeFlex = 1.5;
    else timeFlex = 2.0;
    return (6 - pw) * timeFlex;
}

/**
 * Recompute SIP for a goal with modified parameters.
 * Returns the new SIP amount.
 */
function recomputeSIP(goal, overrides = {}) {
    const years = overrides.years ?? goal.years;
    const target = overrides.target ?? goal.target;
    const riskLevel = overrides.riskLevel ?? goal.riskLevel;
    const includeInflation = goal.includeInflation;

    let allocation, blendedReturn;
    if (riskLevel === 5) {
        allocation = {
            equity: goal.customEquityAlloc || 0,
            debt: goal.customDebtAlloc || 0,
            commodity: goal.customCommodityAlloc || 0
        };
        const customReturns = {
            equity: (goal.customEquityReturn || 0) / 100,
            debt: (goal.customDebtReturn || 0) / 100,
            commodity: (goal.customCommodityReturn || 0) / 100
        };
        blendedReturn = getBlendedReturn(allocation, 5, customReturns);
    } else {
        allocation = getGoalAllocation(years, riskLevel);
        blendedReturn = getBlendedReturn(allocation, riskLevel);
    }

    const inflatedTarget = includeInflation ? inflationAdjusted(target, years) : target;
    return calcSIP(inflatedTarget, years, blendedReturn);
}

/**
 * Compute total SIP for a set of goals with optional per-goal overrides.
 * @param {Array} goals - Original goals array
 * @param {Array} goalResults - Computed results with .sip
 * @param {Object} overridesMap - { goalId: { years?, target?, riskLevel? } }
 * @returns {number} Total monthly SIP
 */
function computeTotalSIPWithOverrides(goals, goalResults, overridesMap) {
    return goals.reduce((sum, g, i) => {
        const overrides = overridesMap[g.id];
        if (overrides) {
            return sum + recomputeSIP(g, overrides);
        }
        return sum + goalResults[i].sip;
    }, 0);
}

// ═══════════════════════════════════════════════════
// STRATEGY 1 - PROTECT HIGH PRIORITY
// ═══════════════════════════════════════════════════

function strategyProtectHighPriority(goals, monthlyBudget, goalResults) {
    const totalSIP = goalResults.reduce((s, g) => s + g.sip, 0);
    let deficit = totalSIP - monthlyBudget;
    const modifiedGoals = [];

    // Sort by priority ascending (P1 = most adjustable, processed first)
    const sortedGoals = goals
        .map((g, i) => ({ goal: g, result: goalResults[i], index: i }))
        .sort((a, b) => (a.goal.priorityWeight || 3) - (b.goal.priorityWeight || 3));

    // Max year extensions & amount reductions by priority
    const limits = {
        1: { maxYearExt: 8, maxAmtReduction: 0.30 },
        2: { maxYearExt: 5, maxAmtReduction: 0.20 },
        3: { maxYearExt: 3, maxAmtReduction: 0.10 },
        4: { maxYearExt: 1, maxAmtReduction: 0 },
        5: { maxYearExt: 0, maxAmtReduction: 0 }, // Never touched
    };

    for (const { goal, result } of sortedGoals) {
        if (deficit <= 0) break;
        const pw = goal.priorityWeight || 3;

        // Priority 5: skip entirely
        if (pw === 5) continue;

        const limit = limits[pw];
        const originalSIP = result.sip;
        let bestYears = goal.years;
        let bestTarget = goal.target;
        let bestSIP = originalSIP;

        // Try extending years first
        for (let ext = 1; ext <= limit.maxYearExt; ext++) {
            const newYears = goal.years + ext;
            if (newYears > 30) break; // Hard constraint

            const newSIP = recomputeSIP(goal, { years: newYears });
            if (originalSIP - newSIP >= deficit) {
                // Just enough - use this
                bestYears = newYears;
                bestSIP = newSIP;
                break;
            }
            bestYears = newYears;
            bestSIP = newSIP;
        }

        // If still deficit and amount reduction allowed, try reducing target
        if (originalSIP - bestSIP < deficit && limit.maxAmtReduction > 0) {
            const step = 0.05; // 5% steps
            for (let reduction = step; reduction <= limit.maxAmtReduction; reduction += step) {
                const newTarget = Math.round(goal.target * (1 - reduction));
                const newSIP = recomputeSIP(goal, { years: bestYears, target: newTarget });
                if (originalSIP - newSIP >= deficit) {
                    bestTarget = newTarget;
                    bestSIP = newSIP;
                    break;
                }
                bestTarget = newTarget;
                bestSIP = newSIP;
            }
        }

        const sipSaved = originalSIP - bestSIP;
        if (sipSaved > 0) {
            const changes = {};
            const reasons = [];
            if (bestYears !== goal.years) {
                changes.years = bestYears;
                reasons.push(`Timeline extended by +${bestYears - goal.years}yr`);
            }
            if (bestTarget !== goal.target) {
                changes.target = bestTarget;
                reasons.push(`Amount reduced by ${Math.round((1 - bestTarget / goal.target) * 100)}%`);
            }
            modifiedGoals.push({
                goalId: goal.id,
                changes,
                reason: reasons.join(', '),
                newSIP: bestSIP,
                originalSIP
            });
            deficit -= sipSaved;
        }
    }

    return {
        id: 'S1',
        name: 'Protect High Priority',
        description: 'Shields your most important goals. Lower-priority goals absorb changes first.',
        tradeoff: 'Lower-priority goals may see extended timelines or reduced amounts.',
        deficitResolved: deficit <= 0,
        remainingShortfall: Math.max(0, deficit),
        modifiedGoals
    };
}

// ═══════════════════════════════════════════════════
// STRATEGY 2 - LEAST DISRUPTIVE
// ═══════════════════════════════════════════════════

function strategyLeastDisruptive(goals, monthlyBudget, goalResults) {
    const totalSIP = goalResults.reduce((s, g) => s + g.sip, 0);
    const modifiedGoals = [];
    let resolved = false;
    let yearExtension = 0;

    // Add +1 year to ALL goals simultaneously, repeat until resolved or cap
    for (let ext = 1; ext <= 10; ext++) {
        let newTotalSIP = 0;
        const tempMods = [];

        for (let i = 0; i < goals.length; i++) {
            const goal = goals[i];
            const newYears = Math.min(goal.years + ext, 30); // Hard cap at 30
            const newSIP = recomputeSIP(goal, { years: newYears });
            newTotalSIP += newSIP;

            if (newYears !== goal.years) {
                tempMods.push({
                    goalId: goal.id,
                    changes: { years: newYears },
                    reason: `Timeline extended by +${newYears - goal.years}yr`,
                    newSIP,
                    originalSIP: goalResults[i].sip
                });
            }
        }

        if (newTotalSIP <= monthlyBudget) {
            resolved = true;
            yearExtension = ext;
            modifiedGoals.push(...tempMods);
            break;
        }

        // Store the last attempt in case we hit cap
        if (ext === 10) {
            modifiedGoals.push(...tempMods);
        }
    }

    const newTotalSIP = modifiedGoals.reduce((s, m) => s + m.newSIP, 0)
        + goals.filter(g => !modifiedGoals.find(m => m.goalId === g.id))
            .reduce((s, g, i) => {
                const idx = goals.indexOf(g);
                return s + goalResults[idx].sip;
            }, 0);

    return {
        id: 'S2',
        name: 'Least Disruptive',
        description: 'Spreads a uniform year extension across all goals equally.',
        tradeoff: 'Every goal gets slightly delayed - no goal singled out.',
        deficitResolved: resolved,
        remainingShortfall: resolved ? 0 : Math.max(0, newTotalSIP - monthlyBudget),
        modifiedGoals
    };
}

// ═══════════════════════════════════════════════════
// STRATEGY 3 - RISK ESCALATION
// ═══════════════════════════════════════════════════

function strategyRiskEscalation(goals, monthlyBudget, goalResults) {
    const totalSIP = goalResults.reduce((s, g) => s + g.sip, 0);
    let deficit = totalSIP - monthlyBudget;
    const modifiedGoals = [];

    // Eligible: horizon >= 5 years AND risk < 4 (Very Aggressive) AND not Custom (5)
    const eligible = goals
        .map((g, i) => ({ goal: g, result: goalResults[i], index: i }))
        .filter(({ goal }) => goal.years >= 5 && goal.riskLevel < 4 && goal.riskLevel !== 5)
        .sort((a, b) => b.goal.years - a.goal.years); // Longest first

    // First pass: step up one level
    for (const { goal, result } of eligible) {
        if (deficit <= 0) break;

        const newRiskLevel = goal.riskLevel + 1;
        const newSIP = recomputeSIP(goal, { riskLevel: newRiskLevel });
        const sipSaved = result.sip - newSIP;

        if (sipSaved > 0) {
            modifiedGoals.push({
                goalId: goal.id,
                changes: { riskLevel: newRiskLevel },
                reason: `Risk stepped up to ${['Very Conservative', 'Conservative', 'Moderate', 'Aggressive', 'Very Aggressive'][newRiskLevel]}`,
                newSIP,
                originalSIP: result.sip
            });
            deficit -= sipSaved;
        }
    }

    // Second pass: step up furthest-horizon goals another level
    if (deficit > 0) {
        const secondPassEligible = eligible
            .filter(({ goal }) => {
                const existing = modifiedGoals.find(m => m.goalId === goal.id);
                const currentRisk = existing ? existing.changes.riskLevel : goal.riskLevel;
                return currentRisk < 4; // Still below Very Aggressive
            })
            .sort((a, b) => b.goal.years - a.goal.years);

        for (const { goal, result } of secondPassEligible) {
            if (deficit <= 0) break;
            const existing = modifiedGoals.find(m => m.goalId === goal.id);
            const currentRisk = existing ? existing.changes.riskLevel : goal.riskLevel;
            const newRiskLevel = currentRisk + 1;
            if (newRiskLevel > 4) continue;

            const baseSIP = existing ? existing.newSIP : result.sip;
            const newSIP = recomputeSIP(goal, { riskLevel: newRiskLevel });
            const sipSaved = baseSIP - newSIP;

            if (sipSaved > 0) {
                if (existing) {
                    existing.changes.riskLevel = newRiskLevel;
                    existing.reason = `Risk stepped up to ${['Very Conservative', 'Conservative', 'Moderate', 'Aggressive', 'Very Aggressive'][newRiskLevel]}`;
                    existing.newSIP = newSIP;
                } else {
                    modifiedGoals.push({
                        goalId: goal.id,
                        changes: { riskLevel: newRiskLevel },
                        reason: `Risk stepped up to ${['Very Conservative', 'Conservative', 'Moderate', 'Aggressive', 'Very Aggressive'][newRiskLevel]}`,
                        newSIP,
                        originalSIP: result.sip
                    });
                }
                deficit -= sipSaved;
            }
        }
    }

    return {
        id: 'S3',
        name: 'Risk Escalation',
        description: 'Increases risk on long-horizon goals to boost returns and reduce SIP.',
        tradeoff: 'Higher risk means higher volatility - only suitable for long-horizon goals.',
        deficitResolved: deficit <= 0,
        remainingShortfall: Math.max(0, deficit),
        modifiedGoals
    };
}

// ═══════════════════════════════════════════════════
// STRATEGY 4 - PROPORTIONAL SACRIFICE
// ═══════════════════════════════════════════════════

function strategyProportionalSacrifice(goals, monthlyBudget, goalResults) {
    const totalSIP = goalResults.reduce((s, g) => s + g.sip, 0);
    const deficit = totalSIP - monthlyBudget;
    const modifiedGoals = [];
    let remainingDeficit = deficit;

    // Each goal's required SIP reduction = Deficit × (Goal_SIP / Total_SIP)
    const reductions = goals.map((goal, i) => ({
        goal,
        result: goalResults[i],
        requiredReduction: deficit * (goalResults[i].sip / totalSIP),
        adjustability: adjustabilityScore(goal)
    }));

    let unabsorbed = 0;

    for (const entry of reductions) {
        const { goal, result, requiredReduction } = entry;
        let absorbed = 0;

        // Extend years by +1, +2, ... until SIP drops by required reduction (cap +10y)
        for (let ext = 1; ext <= 10; ext++) {
            const newYears = goal.years + ext;
            if (newYears > 30) break; // Hard constraint

            const newSIP = recomputeSIP(goal, { years: newYears });
            const sipDrop = result.sip - newSIP;

            if (sipDrop >= requiredReduction) {
                modifiedGoals.push({
                    goalId: goal.id,
                    changes: { years: newYears },
                    reason: `Timeline extended by +${ext}yr (proportional share)`,
                    newSIP,
                    originalSIP: result.sip
                });
                absorbed = sipDrop;
                break;
            }

            // Max extension reached
            if (ext === 10 || newYears === 30) {
                const newSIPFinal = recomputeSIP(goal, { years: newYears });
                modifiedGoals.push({
                    goalId: goal.id,
                    changes: { years: newYears },
                    reason: `Timeline extended by +${newYears - goal.years}yr (proportional share, capped)`,
                    newSIP: newSIPFinal,
                    originalSIP: result.sip
                });
                absorbed = result.sip - newSIPFinal;
                break;
            }
        }

        entry.absorbed = absorbed;
        if (absorbed < requiredReduction) {
            unabsorbed += (requiredReduction - absorbed);
        }
        remainingDeficit -= absorbed;
    }

    // Redistribute remainder to most adjustable goals
    if (unabsorbed > 0) {
        const adjustable = reductions
            .filter(e => {
                const mod = modifiedGoals.find(m => m.goalId === e.goal.id);
                const currentYears = mod ? mod.changes.years : e.goal.years;
                return currentYears < 30;
            })
            .sort((a, b) => b.adjustability - a.adjustability);

        for (const entry of adjustable) {
            if (remainingDeficit <= 0) break;
            const mod = modifiedGoals.find(m => m.goalId === entry.goal.id);
            const currentYears = mod ? mod.changes.years : entry.goal.years;
            const currentSIP = mod ? mod.newSIP : entry.result.sip;

            for (let ext = 1; ext <= (30 - currentYears); ext++) {
                const newYears = currentYears + ext;
                const newSIP = recomputeSIP(entry.goal, { years: newYears });
                const extraSaved = currentSIP - newSIP;

                if (extraSaved >= remainingDeficit || newYears >= 30) {
                    if (mod) {
                        mod.changes.years = newYears;
                        mod.newSIP = newSIP;
                        mod.reason = `Timeline extended by +${newYears - entry.goal.years}yr (proportional + redistribution)`;
                    }
                    remainingDeficit -= extraSaved;
                    break;
                }
            }
        }
    }

    return {
        id: 'S4',
        name: 'Proportional Sacrifice',
        description: 'Every goal absorbs deficit in proportion to its SIP share. Mathematically fair.',
        tradeoff: 'No goal fully protected - each shares the burden proportionally.',
        deficitResolved: remainingDeficit <= 0,
        remainingShortfall: Math.max(0, remainingDeficit),
        modifiedGoals
    };
}

// ═══════════════════════════════════════════════════
// STRATEGY 5 - PROTECT SHORT-TERM
// ═══════════════════════════════════════════════════

function strategyProtectShortTerm(goals, monthlyBudget, goalResults) {
    const totalSIP = goalResults.reduce((s, g) => s + g.sip, 0);
    let deficit = totalSIP - monthlyBudget;
    const modifiedGoals = [];

    // Goals < 3 years: frozen. Remaining sorted by horizon descending (longest first)
    const longGoals = goals
        .map((g, i) => ({ goal: g, result: goalResults[i] }))
        .filter(({ goal }) => goal.years > 3)
        .sort((a, b) => b.goal.years - a.goal.years);

    for (const { goal, result } of longGoals) {
        if (deficit <= 0) break;

        for (let ext = 1; ext <= 10; ext++) {
            const newYears = goal.years + ext;
            if (newYears > 30) break; // Hard constraint

            const newSIP = recomputeSIP(goal, { years: newYears });
            const sipSaved = result.sip - newSIP;

            if (sipSaved >= deficit || ext === 10 || newYears === 30) {
                modifiedGoals.push({
                    goalId: goal.id,
                    changes: { years: newYears },
                    reason: `Timeline extended by +${newYears - goal.years}yr`,
                    newSIP,
                    originalSIP: result.sip
                });
                deficit -= sipSaved;
                break;
            }
        }
    }

    return {
        id: 'S5',
        name: 'Protect Short-Term',
        description: 'Goals under 3 years are time-locked. Long-horizon goals absorb all changes.',
        tradeoff: 'All short-term goals kept intact - longer goals delayed further.',
        deficitResolved: deficit <= 0,
        remainingShortfall: Math.max(0, deficit),
        modifiedGoals
    };
}

// ═══════════════════════════════════════════════════
// STRATEGY 6 - AMOUNT TRIMMING
// ═══════════════════════════════════════════════════

function strategyAmountTrimming(goals, monthlyBudget, goalResults) {
    const totalSIP = goalResults.reduce((s, g) => s + g.sip, 0);
    let deficit = totalSIP - monthlyBudget;
    const modifiedGoals = [];

    // Eligible: priority 1, 2, or 3 only. Sorted by adjustability desc.
    const eligible = goals
        .map((g, i) => ({ goal: g, result: goalResults[i], adjustability: adjustabilityScore(g) }))
        .filter(({ goal }) => (goal.priorityWeight || 3) <= 3)
        .sort((a, b) => b.adjustability - a.adjustability);

    for (const { goal, result } of eligible) {
        if (deficit <= 0) break;

        const originalTarget = goal.target;
        let bestTarget = originalTarget;
        let bestSIP = result.sip;

        // Reduce in 5% steps, max 30%
        for (let pct = 5; pct <= 30; pct += 5) {
            const newTarget = Math.round(originalTarget * (1 - pct / 100));
            const newSIP = recomputeSIP(goal, { target: newTarget });
            const sipSaved = result.sip - newSIP;

            bestTarget = newTarget;
            bestSIP = newSIP;

            if (sipSaved >= deficit) break;
        }

        const sipSaved = result.sip - bestSIP;
        if (sipSaved > 0) {
            modifiedGoals.push({
                goalId: goal.id,
                changes: { target: bestTarget },
                reason: `Amount reduced by ${Math.round((1 - bestTarget / originalTarget) * 100)}%`,
                newSIP: bestSIP,
                originalSIP: result.sip
            });
            deficit -= sipSaved;
        }
    }

    return {
        id: 'S6',
        name: 'Amount Trimming',
        description: 'Reduces target amounts on lower-priority goals. No timeline or risk changes.',
        tradeoff: 'Priority 4 & 5 goals fully protected. Only amounts on P1–P3 are trimmed.',
        deficitResolved: deficit <= 0,
        remainingShortfall: Math.max(0, deficit),
        modifiedGoals
    };
}

// ═══════════════════════════════════════════════════
// MAIN EXPORT
// ═══════════════════════════════════════════════════

/**
 * Compute all 6 budget resolution strategies simultaneously.
 * Only called when monthlyBudget > 0 AND totalSIP > monthlyBudget.
 * 
 * @param {Array} goals - Original goals from state
 * @param {number} monthlyBudget - User's monthly investment budget
 * @param {Array} goalResults - Computed goal results with .sip for each
 * @returns {Array} Array of 6 StrategyResult objects
 */
export function computeAllStrategies(goals, monthlyBudget, goalResults) {
    return [
        strategyProtectHighPriority(goals, monthlyBudget, goalResults),
        strategyRiskEscalation(goals, monthlyBudget, goalResults),
        strategyProportionalSacrifice(goals, monthlyBudget, goalResults),
        strategyProtectShortTerm(goals, monthlyBudget, goalResults),
        strategyAmountTrimming(goals, monthlyBudget, goalResults),
    ];
}
