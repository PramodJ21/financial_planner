/**
 * Action Plan Generation Engine
 * Implements the logic from action_plan.md
 * generateActionPlan(profile, fbsResult) -> structured action items
 */

const INFLATION_RATE = 0.06;
const DEFAULT_MONTHLY_RETURN = 0.01; // 12% annual

function fmtINR(v) {
    return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(v || 0);
}

function requiredSip(targetAmount, years, annualReturnRate) {
    if (!targetAmount || !years || years <= 0) return 0;
    const r = annualReturnRate
        ? Math.pow(1 + annualReturnRate, 1 / 12) - 1
        : DEFAULT_MONTHLY_RETURN;
    const n = years * 12;
    const inflationAdjustedTarget = targetAmount * Math.pow(1 + INFLATION_RATE, years);
    if (r === 0) return inflationAdjustedTarget / n;
    return (inflationAdjustedTarget * r) / (Math.pow(1 + r, n) - 1);
}

function getIdealHealthCover(annualIncome) {
    if (annualIncome < 500000) return 300000;
    if (annualIncome < 1500000) return 500000;
    if (annualIncome < 3000000) return 1000000;
    return 1500000;
}

function computeFbsImpactScore(potentialGain) {
    return Math.min(100, Math.round((potentialGain / 20) * 100));
}

function computeFbsWithDimensionMaxed(profile, fbsResult, dimensionKey) {
    const w = fbsResult.appliedWeights;
    const breakdown = fbsResult.breakdown;
    const current = fbsResult.total;

    const keyMap = {
        emergencyFund: 'emergencyFund',
        healthInsurance: 'insurance',
        lifeInsurance: 'insurance',
        liabilityManagement: 'liabilities',
        investmentRegularity: 'investmentRegularity',
        goalClarity: 'goalClarity',
        behavioralTendencies: 'behavioralTendencies',
        taxLiteracy: 'tax',
        assetDiversity: 'assetDiversity',
        portfolioUnderstanding: 'portfolioUnderstanding',
    };

    const bdKey = keyMap[dimensionKey];
    if (!bdKey) return current;
    const weightKey = {
        emergencyFund: 'emergencyFund',
        insurance: 'insurance',
        liabilities: 'liabilityManagement',
        investmentRegularity: 'investmentRegularity',
        goalClarity: 'goalClarity',
        behavioralTendencies: 'behaviouralTendencies',
        tax: 'taxLiteracy',
        assetDiversity: 'assetDiversity',
        portfolioUnderstanding: 'portfolioUnderstanding',
    }[bdKey];

    const maxPossible = w[weightKey] || 0;
    const currentScaled = breakdown[bdKey] || 0;
    const potentialGain = maxPossible - currentScaled;
    return potentialGain;
}

function priorityScore(fbsImpactScore, urgency, effortScore) {
    const effortInverse = 100 - effortScore;
    return Math.round((fbsImpactScore * 0.40) + (urgency * 0.35) + (effortInverse * 0.25));
}

function makeItem(id, dimension, title, description, timeframe, fbsImpactScore, urgency, effortScore, extraFields) {
    return {
        id,
        dimension,
        title,
        description,
        timeframe,
        priorityScore: priorityScore(fbsImpactScore, urgency, effortScore),
        fbsImpact: Math.round(fbsImpactScore / 5),
        urgency,
        effort: effortScore,
        status: 'pending',
        ...extraFields,
    };
}

function generateActionPlan(profile, fbsResult) {
    const p = profile;

    // ── Core derived values ──
    const annualIncome = (Number(p.annual_salary) || 0) + (Number(p.business_income) || 0)
        + (Number(p.annual_bonus) || 0) + (Number(p.other_income) || 0);
    const monthlyIncome = Number(p.monthly_take_home) || ((Number(p.annual_salary) || 0) + (Number(p.business_income) || 0)) / 12;

    // Food split: 70% needs, 30% wants
    const food = Number(p.expense_food) || 0;
    const groceries = food * 0.70;
    const diningOut = food * 0.30;

    const totalEmi = (() => {
        let loans = [];
        if (Array.isArray(p.loans)) loans = p.loans;
        else if (typeof p.loans === 'string') { try { loans = JSON.parse(p.loans); } catch (_) { loans = []; } }
        let cards = [];
        if (Array.isArray(p.credit_cards)) cards = p.credit_cards;
        else if (typeof p.credit_cards === 'string') { try { cards = JSON.parse(p.credit_cards); } catch (_) { cards = []; } }
        let sum = loans.reduce((s, l) => s + (Number(l.emi) || 0), 0);
        cards.forEach(c => {
            const bal = Number(c.balance) || 0;
            if (bal <= 0) return;
            const t = c.type || 'revolving';
            if (t === 'emi') sum += Number(c.emi_amount) || Math.round(bal * 0.03);
            else if (t === 'revolving') sum += Math.round(bal * 0.03);
        });
        return sum;
    })();

    const needs = (Number(p.expense_rent) || 0)
        + (Number(p.expense_utilities) || 0)
        + (Number(p.expense_subscriptions) || 0)
        + ((Number(p.expense_annual_insurance) || 0) / 12)
        + ((Number(p.expense_annual_education) || 0) / 12)
        + totalEmi
        + groceries;

    const wants = (Number(p.expense_household) || 0)
        + (Number(p.expense_transport) || 0)
        + (Number(p.expense_discretionary) || 0)
        + ((Number(p.expense_annual_travel) || 0) / 12)
        + ((Number(p.expense_annual_other) || 0) / 12)
        + diningOut;

    const effectiveMonthly = needs + wants;

    const stableAssets = (Number(p.savings_balance) || 0) + (Number(p.fd_balance) || 0);
    const stocks = Number(p.inv_direct_stocks) || 0;
    const equityMf = Number(p.inv_equity_mf) || 0;
    const epfPpfNps = Number(p.inv_epf_ppf_nps) || 0;
    const debtFunds = Number(p.inv_debt_funds) || 0;
    const gold = Number(p.inv_gold_commodities) || 0;
    const realEstate = Number(p.inv_real_estate) || 0;
    const crypto = Number(p.inv_crypto_alt) || 0;
    const totalAssets = stableAssets + stocks + equityMf + epfPpfNps + debtFunds + gold + realEstate + crypto;

    const goals = Array.isArray(p.goals) ? p.goals : [];

    const goalSipTotal = goals.reduce((s, g) => s + (Number(g.monthly_sip) || 0), 0);
    const generalSip = Number(p.inv_monthly_sip) || 0;
    const totalSip = goalSipTotal + generalSip;

    const couldSave = monthlyIncome - needs - wants;
    const incomeType = p.income_type || (
        ['Freelance', 'Self-Employed', 'Contract'].includes(p.employment_type) ? 'irregular' : 'regular'
    );

    let utilizationRate = 0;
    if (couldSave > 0) {
        if (incomeType === 'irregular') {
            const allowedBuffer = effectiveMonthly * 3;
            if (couldSave > allowedBuffer) {
                utilizationRate = totalSip / (couldSave - allowedBuffer);
            } else {
                utilizationRate = 1;
            }
        } else {
            utilizationRate = totalSip / couldSave;
        }
    }

    const savingsRate = monthlyIncome > 0 ? totalSip / monthlyIncome : 0;

    const healthCover = Number(p.health_cover) || 0;
    const lifeCover = Number(p.life_cover) || 0;
    const dependents = Number(p.dependents) || 0;
    const hasDependents = dependents > 0 || p.marital_status === 'Married';
    const idealHealthCover = getIdealHealthCover(annualIncome);
    const idealLifeCover = hasDependents
        ? Math.ceil((annualIncome * 10) / 2500000) * 2500000
        : 0;

    // Liabilities
    let rawLoans = [];
    if (Array.isArray(p.loans)) rawLoans = p.loans;
    else if (typeof p.loans === 'string') { try { rawLoans = JSON.parse(p.loans); } catch (_) { rawLoans = []; } }

    let creditCards = [];
    if (Array.isArray(p.credit_cards)) creditCards = p.credit_cards;
    else if (typeof p.credit_cards === 'string') { try { creditCards = JSON.parse(p.credit_cards); } catch (_) { creditCards = []; } }

    const goodTypes = ['Home Loan', 'Education Loan'];
    let goodEmiSum = 0, badEmiSum = 0, goodOutstanding = 0, badOutstanding = 0;
    let revolvingBalance = 0;
    let personalLoanCount = 0;
    let revolvingCardCount = 0;
    let highestRateBadLoan = null;

    rawLoans.forEach(loan => {
        const isGood = goodTypes.includes(loan.type);
        const emi = Number(loan.emi) || 0;
        const outstanding = Number(loan.outstanding) || 0;
        const rate = Number(loan.interestRate) || 0;
        if (isGood) {
            goodEmiSum += emi;
            goodOutstanding += outstanding;
        } else {
            badEmiSum += emi;
            badOutstanding += outstanding;
            personalLoanCount++;
            if (!highestRateBadLoan || rate > highestRateBadLoan.rate) {
                highestRateBadLoan = { name: loan.type || 'Personal Loan', rate, outstanding, emi };
            }
        }
    });

    creditCards.forEach(card => {
        const bal = Number(card.balance) || 0;
        if (bal <= 0) return;
        const t = card.type || 'revolving';
        let emi = 0;
        if (t === 'emi') emi = Number(card.emi_amount) || Math.round(bal * 0.03);
        else if (t === 'revolving') { emi = Math.round(bal * 0.03); revolvingBalance += bal; revolvingCardCount++; }
        badEmiSum += emi;
        badOutstanding += bal;
        if (t !== 'full' && (!highestRateBadLoan || (t === 'revolving' ? 39 : 18) > highestRateBadLoan.rate)) {
            highestRateBadLoan = { name: card.name ? `Credit Card (${card.name})` : 'Credit Card', rate: t === 'revolving' ? 39 : 18, outstanding: bal, emi };
        }
    });

    const goodEmiRatio = monthlyIncome > 0 ? goodEmiSum / monthlyIncome : (goodEmiSum > 0 ? 1 : 0);
    const badEmiRatio = monthlyIncome > 0 ? badEmiSum / monthlyIncome : (badEmiSum > 0 ? 1 : 0);
    const liquidAssets = totalAssets - realEstate;
    const cushionRatio = badOutstanding > 0 ? liquidAssets / badOutstanding : Infinity;

    const monthsEmployed = p.months_employed != null ? Number(p.months_employed) : null;

    // Fragility flags (same as FBS engine)
    const zeroEmergency = stableAssets === 0;
    const zeroInsurance = healthCover === 0 && lifeCover === 0;
    const highBadDebt = badOutstanding > 0
        && cushionRatio < 2
        && (monthlyIncome === 0 || badOutstanding >= monthlyIncome * 2);

    let fragilityPenalty = 0;
    let fragilityType = null;
    if (zeroEmergency && zeroInsurance && highBadDebt) {
        fragilityPenalty = 15; fragilityType = 'FRAGILITY_ALL';
    } else if (zeroEmergency && zeroInsurance) {
        fragilityPenalty = 8; fragilityType = 'FRAGILITY_EF_INS';
    } else if (zeroEmergency && highBadDebt) {
        fragilityPenalty = 6; fragilityType = 'FRAGILITY_EF_DEBT';
    } else if (zeroInsurance && highBadDebt) {
        fragilityPenalty = 5; fragilityType = 'FRAGILITY_INS_DEBT';
    }
    if (monthsEmployed !== null && monthsEmployed < 12 && fragilityPenalty > 5) {
        fragilityPenalty = 5;
    }

    // ── Tax info ──
    const optedRegime = p.tax_regime || 'New Regime';
    const taxInfo = fbsResult._taxInfo || {};
    const recommended = taxInfo.recommended || optedRegime;
    const potentialTaxSaving = taxInfo.potentialSavings || 0;
    const hasDeductions = (Number(p.tax_80c_used) || 0) > 0
        || (Number(p.tax_nps_80ccd) || 0) > 0
        || (Number(p.tax_hra) || 0) > 0
        || (Number(p.tax_home_loan_interest) || 0) > 0
        || (Number(p.tax_80d) || 0) > 0;

    // ── Asset diversity ──
    const age = fbsResult._age || 30;
    const alloc = {
        equity: totalAssets > 0 ? ((stocks + equityMf) / totalAssets * 100) : 0,
        debt: totalAssets > 0 ? ((stableAssets + debtFunds + epfPpfNps) / totalAssets * 100) : 0,
        commodity: totalAssets > 0 ? (gold / totalAssets * 100) : 0,
        alt: totalAssets > 0 ? (crypto / totalAssets * 100) : 0,
        realEstate: totalAssets > 0 ? (realEstate / totalAssets * 100) : 0,
    };

    const hasShortHorizonGoal = goals.some(g => Number(g.years) > 0 && Number(g.years) <= 4);
    const idealRanges = getIdealAllocRanges(age, hasShortHorizonGoal);

    const candidates = [];
    const suppressed = new Set();

    // ── Helper: compute FBS impact score for a dimension ──
    function impactFor(dimensionKey) {
        const gain = computeFbsWithDimensionMaxed(profile, fbsResult, dimensionKey);
        return computeFbsImpactScore(gain);
    }

    // ── COMBINATION FRAGILITY BUNDLE ──
    if (fragilityType) {
        const isNewEarner = monthsEmployed !== null && monthsEmployed < 12;
        let urgency = fragilityType === 'FRAGILITY_ALL' ? 95 : (fragilityType === 'FRAGILITY_EF_INS' ? 85 : (fragilityType === 'FRAGILITY_EF_DEBT' ? 80 : 75));
        if (isNewEarner) urgency = Math.max(55, urgency - 15);
        const tf = urgency >= 55 ? 'immediate' : 'short_term';
        const efScore = 75;
        const fiImpact = Math.min(100, Math.round((fragilityPenalty / 20) * 100));

        let desc;
        const newEarnerNote = isNewEarner
            ? ' Note: Because you are in the early stage of your earning career (under 12 months employed), this combination is expected and is scored at reduced penalty. Most of these gaps close within 12-18 months of consistent saving.'
            : '';

        if (fragilityType === 'FRAGILITY_ALL') {
            desc = `Your financial foundation has three critical gaps at the same time: no emergency fund, no insurance cover, and high bad debt. This combination is penalising your FBS by up to 15 points independently of dimension scores. Address them in this order this month: 1. Pay at least the minimum on all debts to avoid default. 2. Purchase a basic ${fmtINR(idealHealthCover)} health insurance policy (priority — a hospitalisation with no fund and no insurance is a financial emergency). 3. Open a savings account or liquid fund and set up an auto-transfer of ${fmtINR(Math.round(Math.min(couldSave > 0 ? couldSave : 1000, effectiveMonthly * 0.25)))} per month toward your emergency fund. Each step here closes a penalty, not just a dimension score.${newEarnerNote}`;
        } else if (fragilityType === 'FRAGILITY_EF_INS') {
            desc = `You have no emergency fund and no insurance. These two gaps together are penalising your FBS by 8 points. This month: (1) Purchase at least a ${fmtINR(idealHealthCover)} health policy. (2) Start a ${fmtINR(Math.round(Math.min(couldSave > 0 ? couldSave : 1000, effectiveMonthly)))} monthly transfer to a liquid fund — your emergency buffer. These two actions alone will raise your FBS by 8+ points.${newEarnerNote}`;
        } else if (fragilityType === 'FRAGILITY_EF_DEBT') {
            desc = `You have no emergency fund and high bad debt — a risky combination. If income disrupts, you have no buffer and will default on debt. This month: (1) Pay at least the full minimum on all bad-debt accounts. (2) Do not take on any new debt. (3) Start an emergency fund with whatever surplus remains, even ${fmtINR(Math.round(Math.min(couldSave > 0 ? couldSave : 1000, 1000)))} per month. The FBS penalty here is 6 points — removing it requires both gaps to close.${newEarnerNote}`;
        } else {
            desc = `You have no insurance and high bad debt. If a health emergency occurs, you have no cover and will likely take on more debt to pay for it — a compounding problem. Priority: (1) Buy a basic health policy this month. (2) Put 60% of available surplus toward bad debt prepayment. The FBS penalty here is 5 points.${newEarnerNote}`;
        }

        candidates.push(makeItem('FRAGILITY_BUNDLE', 'fragility', 'Build Your Financial Foundation', desc, tf, fiImpact, urgency, efScore, { alwaysSurface: true }));

        suppressed.add('dim1');
        suppressed.add('dim2');
        suppressed.add('dim4A');
    }

    // ── DIMENSION 1: Emergency Fund ──
    const ideal6m = effectiveMonthly * 6;
    if (!suppressed.has('dim1')) {
        if (stableAssets === 0) {
            const fi = impactFor('emergencyFund');
            candidates.push(makeItem('EF_1_1', 'emergencyFund',
                'Build Your Emergency Fund — Start from Zero',
                `You have no emergency fund. Your monthly expenses are ${fmtINR(Math.round(effectiveMonthly))}. Start by saving ${fmtINR(Math.round(effectiveMonthly))} (1 month of expenses) in a savings account or liquid fund before any other financial goal. This is your financial floor.`,
                'immediate', fi, 100, 30, {}));
        } else if (stableAssets < effectiveMonthly * 3 && totalAssets >= ideal6m) {
            const fi = impactFor('emergencyFund');
            candidates.push(makeItem('EF_1_4', 'emergencyFund',
                'Move Invested Funds to Emergency Reserve',
                `You have enough total assets (${fmtINR(Math.round(totalAssets))}) to fully fund your emergency reserve, but they are held in investments rather than stable instruments. Move ${fmtINR(Math.round(ideal6m - stableAssets))} from your investment portfolio to a liquid fund or savings account. This improves your FBS without requiring additional savings.`,
                'immediate', fi, 75, 10, {}));
        } else if (stableAssets < effectiveMonthly * 3) {
            const fi = impactFor('emergencyFund');
            candidates.push(makeItem('EF_1_2', 'emergencyFund',
                'Grow Emergency Fund to 3-Month Minimum',
                `Your emergency fund covers ${(stableAssets / effectiveMonthly).toFixed(1)} months of expenses. The minimum safe level is 3 months (${fmtINR(Math.round(effectiveMonthly * 3))}). You need ${fmtINR(Math.round(effectiveMonthly * 3 - stableAssets))} more. Redirect your surplus of ${fmtINR(Math.round(Math.max(0, couldSave)))} per month here first.`,
                'immediate', fi, 75, 30, {}));
        } else if (stableAssets < ideal6m && totalAssets >= ideal6m) {
            const fi = impactFor('emergencyFund');
            candidates.push(makeItem('EF_1_4', 'emergencyFund',
                'Move Invested Funds to Complete Emergency Reserve',
                `You have enough total assets (${fmtINR(Math.round(totalAssets))}) to fully fund your emergency reserve, but they are held in investments rather than stable instruments. Move ${fmtINR(Math.round(ideal6m - stableAssets))} from your investment portfolio to a liquid fund or savings account. This improves your FBS without requiring additional savings.`,
                'immediate', fi, 50, 10, {}));
        } else if (stableAssets < ideal6m) {
            const fi = impactFor('emergencyFund');
            const needed = ideal6m - stableAssets;
            const monthly = Math.round(needed / 6);
            candidates.push(makeItem('EF_1_3', 'emergencyFund',
                'Top Up Emergency Fund to 6-Month Ideal',
                `Your emergency fund covers ${(stableAssets / effectiveMonthly).toFixed(1)} months of expenses — a good start, but the ideal is 6 months (${fmtINR(Math.round(ideal6m))}). You need ${fmtINR(Math.round(needed))} more. Add ${fmtINR(monthly)} per month over the next 6 months to close this.`,
                'short_term', fi, 50, 30, {}));
        }
    }

    // ── DIMENSION 2: Health Insurance ──
    if (!suppressed.has('dim2')) {
        if (healthCover === 0) {
            const fi = impactFor('healthInsurance');
            candidates.push(makeItem('HI_2_1', 'healthInsurance',
                'Get Health Insurance Immediately',
                `You have zero health insurance coverage. A single hospitalisation in India costs ₹1-5L on average and can wipe out months of savings. Your recommended minimum cover is ${fmtINR(idealHealthCover)}. Purchase a health insurance policy this month — this is the highest-leverage protection action you can take.`,
                'immediate', fi, 100, 55, {}));
        } else if (healthCover < idealHealthCover * 0.5) {
            const fi = impactFor('healthInsurance');
            candidates.push(makeItem('HI_2_2', 'healthInsurance',
                'Upgrade Health Insurance Coverage',
                `Your current health cover is ${fmtINR(healthCover)} — only ${Math.round(healthCover / idealHealthCover * 100)}% of the ${fmtINR(idealHealthCover)} recommended for your income level. Upgrade your policy or add a top-up plan to reach at least ${fmtINR(Math.round(idealHealthCover * 0.5))}.`,
                'short_term', fi, 75, 55, {}));
        } else if (healthCover < idealHealthCover * 0.8) {
            const fi = impactFor('healthInsurance');
            candidates.push(makeItem('HI_2_3', 'healthInsurance',
                'Add a Health Insurance Top-Up Plan',
                `Your health cover of ${fmtINR(healthCover)} is adequate but below the ${fmtINR(idealHealthCover)} recommended for your income. Consider adding a super top-up plan (typically ${fmtINR(Math.round(annualIncome * 0.003))}-${fmtINR(Math.round(annualIncome * 0.005))}/year) to bridge the gap affordably.`,
                'short_term', fi, 50, 55, {}));
        }
    }

    // ── DIMENSION 3: Life Insurance ──
    if (hasDependents && idealLifeCover > 0) {
        if (lifeCover === 0) {
            const fi = impactFor('lifeInsurance');
            candidates.push(makeItem('LI_3_1', 'lifeInsurance',
                'Get Term Life Insurance',
                `You have ${dependents} dependent(s) and no life insurance. Your income supports others — if that stops, they have no safety net. Your recommended term cover is ${fmtINR(idealLifeCover)} (10x your annual income). A term plan for this amount typically costs ${fmtINR(Math.round(idealLifeCover * 0.003))}-${fmtINR(Math.round(idealLifeCover * 0.005))}/year. Get this in place this month.`,
                'immediate', fi, 75, 75, {}));
        } else if (lifeCover < idealLifeCover * 0.5) {
            const fi = impactFor('lifeInsurance');
            candidates.push(makeItem('LI_3_2', 'lifeInsurance',
                'Increase Term Life Insurance Cover',
                `Your life cover of ${fmtINR(lifeCover)} is significantly below the ${fmtINR(idealLifeCover)} recommended for your income and ${dependents} dependent(s). Increase your term cover by ${fmtINR(idealLifeCover - lifeCover)} — additional riders on an existing term plan are often very affordable.`,
                'short_term', fi, 50, 75, {}));
        } else if (lifeCover < idealLifeCover * 0.8) {
            const fi = impactFor('lifeInsurance');
            candidates.push(makeItem('LI_3_3', 'lifeInsurance',
                'Review Life Insurance Gap',
                `Your life cover of ${fmtINR(lifeCover)} covers ${Math.round(lifeCover / idealLifeCover * 100)}% of the ${fmtINR(idealLifeCover)} ideal. You are partially protected but have a gap of ${fmtINR(idealLifeCover - lifeCover)}. Review whether a top-up term policy or rider can close this gap cost-effectively.`,
                'long_term', fi, 25, 75, {}));
        }
    }

    // ── DIMENSION 4A: Bad Debt ──
    if (!suppressed.has('dim4A')) {
        if (revolvingBalance > 0) {
            const ratio = monthlyIncome > 0 ? revolvingBalance / monthlyIncome : revolvingBalance / 50000;
            const revPenalty = Math.min(10, parseFloat((ratio * 3).toFixed(1)));
            const fi = Math.min(100, Math.round((revPenalty / 20) * 100));
            const urgRev = revolvingBalance > monthlyIncome * 2 ? 100 : 100;
            candidates.push(makeItem('BD_4A_1', 'liabilityManagement',
                'Clear Revolving Credit Card Balance',
                `You are carrying a revolving credit card balance of ${fmtINR(revolvingBalance)}. Credit card debt accrues at 36-42% annual interest — the most expensive debt in the market. Pay the full balance of ${fmtINR(revolvingBalance)} this month. If you cannot do it in one payment, pay as much as possible above the minimum and treat this as your top financial emergency. This balance is also deducting ${revPenalty} points from your FBS score.`,
                'immediate', fi, urgRev, 10, { alwaysSurface: true }));
        }

        if (badEmiRatio > 0.20) {
            const fi = impactFor('liabilityManagement');
            candidates.push(makeItem('BD_4A_3', 'liabilityManagement',
                'Urgently Reduce High-Interest Debt',
                `Your high-interest debt EMIs are consuming ${Math.round(badEmiRatio * 100)}% of your income — above the safe limit of 20%. This is restricting your ability to save and invest. Do not start or increase any SIPs until this falls below 15%. Focus all available surplus (${fmtINR(Math.round(Math.max(0, couldSave)))}/month after needs and wants) on aggressively paying down bad debt.`,
                'immediate', fi, 75, 75, {}));
        } else if (badEmiRatio >= 0.10) {
            const fi = impactFor('liabilityManagement');
            const interestSaved = highestRateBadLoan ? Math.round(badOutstanding * 0.10 * (highestRateBadLoan.rate / 100)) : 0;
            candidates.push(makeItem('BD_4A_2', 'liabilityManagement',
                'Accelerate Bad Debt Repayment',
                `Your personal loan / credit card EMIs consume ${Math.round(badEmiRatio * 100)}% of your monthly income (${fmtINR(badEmiSum)}/month). The safer threshold is below 10%. Prioritise prepaying the highest-interest bad debt first. Each ${fmtINR(Math.round(badOutstanding * 0.10))} prepaid saves approximately ${fmtINR(interestSaved)} in annual interest.`,
                'short_term', fi, 50, 75, {}));
        }

        const totalBadAccounts = personalLoanCount + revolvingCardCount;
        if (totalBadAccounts >= 3 && highestRateBadLoan) {
            const fi = impactFor('liabilityManagement');
            const monthlyInterest = Math.round(highestRateBadLoan.outstanding * highestRateBadLoan.rate / 100 / 12);
            candidates.push(makeItem('BD_4A_4', 'liabilityManagement',
                'Consider Debt Consolidation',
                `You are managing ${totalBadAccounts} separate high-interest debt accounts. Consider consolidating them into a single personal loan at a lower rate. A debt consolidation loan can reduce your effective interest rate and simplify repayment. Your highest-rate debt '${highestRateBadLoan.name}' (${highestRateBadLoan.rate}% p.a.) is costing you ${fmtINR(monthlyInterest)}/month in interest. Compare rates from your bank and NBFCs before deciding.`,
                'short_term', fi, 50, 75, {}));
        }
    }

    // ── DIMENSION 4B: Good Debt ──
    if (goodEmiRatio > 0.45) {
        const fi = impactFor('liabilityManagement');
        candidates.push(makeItem('GD_4B_2', 'liabilityManagement',
            'Reduce Home/Education Loan Burden',
            `Your home/education loan EMI is ${Math.round(goodEmiRatio * 100)}% of your monthly income — significantly above the recommended 35%. This severely constrains your financial flexibility. Explore partial prepayment (even ${fmtINR(Math.round(goodOutstanding * 0.02))} annually can cut your tenure meaningfully) or refinancing to a lower rate.`,
            'short_term', fi, 50, 75, {}));
    } else if (goodEmiRatio >= 0.36) {
        const fi = impactFor('liabilityManagement');
        candidates.push(makeItem('GD_4B_1', 'liabilityManagement',
            'Monitor Home/Education Loan EMI Ratio',
            `Your home/education loan EMI is ${Math.round(goodEmiRatio * 100)}% of your monthly income. While home and education loans are considered productive debt, an EMI above 35% leaves limited room for savings. If your income increases in the next raise cycle, direct a portion toward loan prepayment to bring this ratio below 35%.`,
            'long_term', fi, 25, 75, {}));
    }

    // ── CROSS-DIMENSION SUPPRESSORS ──
    const debtBeforeInvest = badEmiRatio > 0.15 && savingsRate < 0.10 && totalSip > 0;
    const insuranceBeforeInvest = healthCover === 0 && totalSip > 0;
    const efBeforeGoals = stableAssets < effectiveMonthly * 3 && goals.some(g => (Number(g.monthly_sip) || 0) > 0);

    const suppressInvestmentIncrease = debtBeforeInvest || insuranceBeforeInvest;
    const suppressGoalSipIncrease = efBeforeGoals;

    if (debtBeforeInvest) {
        candidates.push(makeItem('CROSS_DEBT_INVEST', 'liabilityManagement',
            'Redirect SIP to Debt Repayment',
            `You are currently investing ${fmtINR(totalSip)}/month while carrying high-interest bad debt with an EMI of ${fmtINR(badEmiSum)}/month. The math does not work in your favour: bad debt at 18-24% costs more than a diversified SIP can earn at 12%. Redirect your ${fmtINR(totalSip)} SIP toward prepaying your highest-interest loan this month. Once bad debt falls below 10% EMI ratio, resume and increase your SIP.`,
            'immediate', impactFor('liabilityManagement'), 75, 10, { alwaysSurface: false }));
    }

    if (insuranceBeforeInvest && !debtBeforeInvest) {
        candidates.push(makeItem('CROSS_INS_INVEST', 'healthInsurance',
            'Get Health Insurance Before Increasing SIP',
            `You are investing ${fmtINR(totalSip)}/month — great habit. But you have no health insurance. A single hospitalisation can erase years of SIP gains. Before increasing your SIP further, allocate ${fmtINR(Math.round(idealHealthCover * 0.015 / 12))}-${fmtINR(Math.round(idealHealthCover * 0.025 / 12))}/month (estimated annual premium / 12) toward a ${fmtINR(idealHealthCover)} health policy. Insurance first, then invest.`,
            'immediate', impactFor('healthInsurance'), 75, 55, { alwaysSurface: false }));
    }

    if (efBeforeGoals) {
        const activeGoalSips = goals.filter(g => (Number(g.monthly_sip) || 0) > 0);
        const totalGoalSip = activeGoalSips.reduce((s, g) => s + (Number(g.monthly_sip) || 0), 0);
        candidates.push(makeItem('CROSS_EF_GOALS', 'emergencyFund',
            'Pause Goal SIPs to Build Emergency Fund',
            `You are saving toward ${activeGoalSips.length} goal(s) but your emergency fund covers only ${(stableAssets / effectiveMonthly).toFixed(1)} months of expenses (minimum: 3 months, i.e., ${fmtINR(Math.round(effectiveMonthly * 3))}). If an emergency hits, you will be forced to liquidate your goal savings at possibly the wrong time. Temporarily redirect ${fmtINR(Math.round(Math.min(totalGoalSip, Math.max(0, couldSave))))} from goal SIPs to your emergency fund until it reaches ${fmtINR(Math.round(effectiveMonthly * 3))}, then resume goal SIPs.`,
            'immediate', impactFor('emergencyFund'), 75, 10, { alwaysSurface: false }));
    }

    // ── DIMENSION 5: Investment Regularity ──
    const investSuppressionActive = suppressInvestmentIncrease;

    if (!investSuppressionActive) {
        if (totalSip === 0 && couldSave > 0) {
            const fi = impactFor('investmentRegularity');
            candidates.push(makeItem('IR_5_1', 'investmentRegularity',
                'Start Your First SIP Today',
                `You have ${fmtINR(Math.round(couldSave))} in monthly surplus but are not investing anything. Even starting with ${fmtINR(Math.min(Math.round(couldSave), 500))} per month in a diversified equity mutual fund via SIP builds the habit. Open a SIP today — the best time to start was yesterday, the second best is now.`,
                'immediate', fi, 75, 30, {}));
        } else if (savingsRate < 0.10 && couldSave >= monthlyIncome * 0.20) {
            const fi = impactFor('investmentRegularity');
            const idle = couldSave - totalSip;
            candidates.push(makeItem('IR_5_2', 'investmentRegularity',
                'Increase SIP — Large Surplus Sitting Idle',
                `You are saving ${Math.round(savingsRate * 100)}% of your income but could save up to ${Math.round(couldSave / monthlyIncome * 100)}%. There is ${fmtINR(Math.round(idle))} sitting idle each month after your expenses. Increase your SIP by ${fmtINR(Math.round(idle * 0.50))} this month (half your idle surplus) — you will not feel the difference day-to-day but the compounding impact over 5 years is significant.`,
                'short_term', fi, 50, 30, {}));
        } else if (!suppressGoalSipIncrease && savingsRate >= 0.10 && savingsRate < 0.20 && utilizationRate < 0.50) {
            const fi = impactFor('investmentRegularity');
            const idle = couldSave - totalSip;
            candidates.push(makeItem('IR_5_3', 'investmentRegularity',
                'Close the Gap to 20% Savings Rate',
                `You are saving ${Math.round(savingsRate * 100)}% of your income, but your surplus utilisation is only ${Math.round(utilizationRate * 100)}%. You have ${fmtINR(Math.round(idle))} per month sitting uninvested. Raise your SIP by ${fmtINR(Math.round(idle * 0.60))} to cross the 20% savings rate threshold — that is the point where your money starts working hard for you.`,
                'short_term', fi, 50, 30, {}));
        }
    }

    const sipMonths = Number(p.sip_consecutive_months) || 0;
    if (sipMonths < 6 && totalSip > 0) {
        const fi = impactFor('investmentRegularity');
        candidates.push(makeItem('IR_5_4', 'investmentRegularity',
            'Build SIP Consistency Streak',
            `Your SIP has been running for only ${sipMonths} month(s). The consistency multiplier reduces your Investment Regularity score until you reach 6 consecutive months. Set your SIP to auto-debit on your salary credit date — this removes the human decision point and builds a streak automatically.`,
            'short_term', fi, 25, 10, {}));
    }

    // ── DIMENSION 6: Goal Clarity ──
    const timedGoals = goals.filter(g => Number(g.years) > 0 && Number(g.target || g.targetAmount || 0) > 0);

    if (goals.length === 0) {
        const fi = impactFor('goalClarity');
        candidates.push(makeItem('GC_6_1', 'goalClarity',
            'Define Your First Financial Goal',
            `You have no financial goals defined. Without a destination, your savings have no direction. Define at least one goal (retirement, home purchase, education) with a target amount and timeframe. This single step will unlock goal-specific SIP recommendations and improve your FBS immediately.`,
            'short_term', fi, 25, 30, {}));
    } else if (timedGoals.length === 0) {
        const fi = impactFor('goalClarity');
        const exampleGoal = goals[0];
        const exReqSip = exampleGoal ? requiredSip(Number(exampleGoal.target) || 500000, 5, null) : 0;
        candidates.push(makeItem('GC_6_2', 'goalClarity',
            'Add Target Dates to Your Goals',
            `You have ${goals.length} goal(s) but none have a target date. A goal without a timeframe cannot be planned for — you do not know how much to save per month. Add a target year to each goal. For example: 'Home purchase — 5 years' gives a calculable monthly SIP of ${fmtINR(Math.round(exReqSip))}.`,
            'short_term', fi, 25, 30, {}));
    } else {
        if (!suppressGoalSipIncrease) {
            const goalRanked = [];
            timedGoals.forEach(g => {
                const years = Number(g.years);
                const target = Number(g.target) || 0;
                const actualSip = Number(g.monthly_sip) || 0;
                if (target <= 0) return;

                const annualRate = g.equity_return ? (Number(g.equity_return) / 100) : null;
                const reqSip = requiredSip(target, years, annualRate);
                const shortfall = Math.max(0, reqSip - actualSip);
                if (shortfall <= 0) return;

                let urgency, tf;
                if (years < 1) { urgency = 100; tf = 'immediate'; }
                else if (years < 2) { urgency = 90; tf = 'immediate'; }
                else if (years < 3) { urgency = 65; tf = 'immediate'; }
                else if (years <= 5) { urgency = 50; tf = 'short_term'; }
                else { urgency = 25; tf = 'short_term'; }

                const rank = urgency + (shortfall / reqSip * 30);
                goalRanked.push({ g, years, target, actualSip, reqSip, shortfall, urgency, tf, rank });
            });

            goalRanked.sort((a, b) => b.rank - a.rank);

            const toSurface = goalRanked.length >= 2 && (goalRanked[0].rank - goalRanked[1].rank) <= 5
                ? goalRanked.slice(0, 2)
                : goalRanked.slice(0, 1);

            toSurface.forEach((entry, idx) => {
                const { g, years, target, actualSip, reqSip, shortfall, urgency, tf } = entry;
                const gName = g.name || 'Goal';
                const fi = impactFor('goalClarity');

                if (actualSip === 0) {
                    candidates.push(makeItem(`GC_6_5_${idx}`, 'goalClarity',
                        `Start Saving Toward ${gName}`,
                        `You have defined a '${gName}' goal (target: ${fmtINR(target)} in ${years} year${years !== 1 ? 's' : ''}) but have not assigned any monthly savings toward it. To reach this goal, you need ${fmtINR(Math.round(reqSip))}/month. Start with even ${fmtINR(Math.min(Math.round(reqSip), 500))} — the habit of saving toward a named goal is the foundation.`,
                        tf, fi, urgency, 30, {}));
                } else if (years <= 2) {
                    const r = DEFAULT_MONTHLY_RETURN;
                    const n = years * 12;
                    const achievableTarget = Math.round(actualSip * (Math.pow(1 + r, n) - 1) / r);
                    candidates.push(makeItem(`GC_6_4_${idx}`, 'goalClarity',
                        `Urgently Top Up ${gName} SIP`,
                        `Your '${gName}' goal is due in ${years} year${years !== 1 ? 's' : ''} and is critically underfunded. You need ${fmtINR(Math.round(reqSip))}/month but are saving ${fmtINR(actualSip)}/month. With only ${years * 12} months remaining, you must act now. Increase the SIP to ${fmtINR(Math.round(reqSip))} immediately, or revise the target amount down to ${fmtINR(achievableTarget)} (what your current SIP will deliver at this horizon).`,
                        tf, fi, urgency, 30, {}));
                } else {
                    candidates.push(makeItem(`GC_6_3_${idx}`, 'goalClarity',
                        `Increase SIP for ${gName} Goal`,
                        `Your '${gName}' goal needs ${fmtINR(Math.round(reqSip))}/month to reach ${fmtINR(target)} in ${years} year${years !== 1 ? 's' : ''}. You are currently saving ${fmtINR(actualSip)}/month — a shortfall of ${fmtINR(Math.round(shortfall))}/month. Increase your ${gName} SIP by ${fmtINR(Math.round(shortfall * 0.50))} this month as a first step.`,
                        tf, fi, urgency, 30, {}));
                }
            });
        }
    }

    // ── DIMENSION 7: Behavioral Tendencies ──
    const bSpendImpulsively = Number(p.beh_spend_impulsively) || 3;
    const bDelayDecisions = Number(p.beh_delay_decisions) || 3;
    const bMarketReaction = Number(p.beh_market_reaction) || 3;
    const bReviewMonthly = Number(p.beh_review_monthly) || 3;

    if (bSpendImpulsively >= 4) {
        const fi = impactFor('behavioralTendencies');
        candidates.push(makeItem('BEH_7_1', 'behavioralTendencies',
            'Introduce a 48-Hour Spending Rule',
            `Your responses suggest you sometimes spend impulsively. A practical fix: introduce a 48-hour rule for any non-essential purchase above ${fmtINR(Math.round(monthlyIncome * 0.01))}. This one habit, if applied consistently, typically saves 5-8% of monthly discretionary spend.`,
            'short_term', fi, 25, 30, {}));
    }

    if (bDelayDecisions >= 4) {
        const fi = impactFor('behavioralTendencies');
        candidates.push(makeItem('BEH_7_2', 'behavioralTendencies',
            'Set 7-Day Deadlines for Financial Decisions',
            `You tend to delay financial decisions. Delaying a term insurance purchase by 1 year at age 30 can increase the premium by 8-12% for the same cover. For your next pending financial decision, set a 7-day deadline with a concrete next step written down.`,
            'short_term', fi, 25, 30, {}));
    }

    if (bMarketReaction <= 2) {
        const fi = impactFor('behavioralTendencies');
        candidates.push(makeItem('BEH_7_3', 'behavioralTendencies',
            'Build Market Volatility Resilience',
            `Your responses suggest you react strongly to market movements. A ₹10,000/month SIP in Nifty 50 over the last 10 years (through multiple market crashes) returned approximately 14% CAGR for investors who stayed. Missing even 10 of the best trading days in a decade cuts long-term returns by roughly half. STP (Systematic Transfer Plan) into volatile funds is one way to reduce the emotional trigger.`,
            'long_term', fi, 25, 30, {}));
    }

    if (bReviewMonthly <= 2) {
        const fi = impactFor('behavioralTendencies');
        candidates.push(makeItem('BEH_7_4', 'behavioralTendencies',
            'Schedule a Monthly Financial Review',
            `You are not reviewing your finances regularly. Set a fixed 30-minute 'money date' on the first Sunday of each month. Check your SIP performance, expense breakdown, and goal progress. Regular review is the single highest-ROI financial habit — it costs zero rupees.`,
            'short_term', fi, 25, 30, {}));
    }

    // ── DIMENSION 8: Tax Literacy ──
    if (annualIncome > 0) {
        if (optedRegime !== recommended && potentialTaxSaving > 5000) {
            const fi = impactFor('taxLiteracy');
            const urgency = potentialTaxSaving > 10000 ? 50 : 50;
            candidates.push(makeItem('TAX_8_1', 'taxLiteracy',
                `Switch to ${recommended} and Save ${fmtINR(Math.round(potentialTaxSaving))}`,
                `You are on the ${optedRegime} regime, but based on your income and deductions, the ${recommended} regime would save you approximately ${fmtINR(Math.round(potentialTaxSaving))} in taxes this year. Switch your regime at the start of the next financial year (declare to your employer before April). This is free money — you are currently leaving ${fmtINR(Math.round(potentialTaxSaving / 12))}/month on the table.`,
                'short_term', fi, urgency, 30, {}));
        } else if (optedRegime !== recommended && potentialTaxSaving > 0) {
            const fi = impactFor('taxLiteracy');
            candidates.push(makeItem('TAX_8_2', 'taxLiteracy',
                'Review Tax Regime with Your CA',
                `You may be slightly better off on the ${recommended} regime (estimated saving: ${fmtINR(Math.round(potentialTaxSaving))}/year). The difference is small — consult your CA or use the income tax portal's comparison tool before your next employer declaration.`,
                'long_term', fi, 25, 30, {}));
        } else if (optedRegime === recommended && !hasDeductions && annualIncome >= 500000) {
            const fi = impactFor('taxLiteracy');
            candidates.push(makeItem('TAX_8_3', 'taxLiteracy',
                'Start Using Available Tax Deductions',
                `You are on the right tax regime but are not using any deductions. Even under the Old Regime, Section 80C alone allows ₹1.5L of deductions — that is ₹30,000-₹45,000 in annual tax savings depending on your slab. Review whether ELSS mutual funds, PPF, or NPS contributions can be structured to use these deductions.`,
                'short_term', fi, 25, 30, {}));
        }
    }

    // ── DIMENSION 9: Asset Diversity ──
    if (totalAssets >= 100000) {
        const dev = (actual, [min, max]) => actual >= min && actual <= max ? 0 : (actual < min ? min - actual : actual - max);
        const deviations = {
            equity: dev(alloc.equity, idealRanges.equity),
            debt: dev(alloc.debt, idealRanges.debt),
            commodity: dev(alloc.commodity, idealRanges.commodity),
            alt: dev(alloc.alt, idealRanges.alt),
            realEstate: dev(alloc.realEstate, idealRanges.realEstate),
        };
        const totalDeviation = Object.values(deviations).reduce((s, v) => s + v, 0);

        const getOverweightClass = () => {
            let maxDev = 0, maxClass = null;
            for (const [cls, d] of Object.entries(deviations)) {
                const [, max] = idealRanges[cls] || [0, 100];
                if (alloc[cls] > max && d > maxDev) { maxDev = d; maxClass = cls; }
            }
            return maxClass;
        };
        const getUnderweightClass = () => {
            let maxDev = 0, maxClass = null;
            for (const [cls, d] of Object.entries(deviations)) {
                const [min] = idealRanges[cls] || [0, 100];
                if (alloc[cls] < min && d > maxDev) { maxDev = d; maxClass = cls; }
            }
            return maxClass;
        };

        const ow = getOverweightClass();
        const uw = getUnderweightClass();

        if (ow && deviations[ow] > 20) {
            const fi = impactFor('assetDiversity');
            const [min, max] = idealRanges[ow] || [0, 100];
            candidates.push(makeItem('AD_9_1', 'assetDiversity',
                `Reduce ${ow.charAt(0).toUpperCase() + ow.slice(1)} Concentration`,
                `Your portfolio is heavily concentrated in ${ow} (${Math.round(alloc[ow])}% vs. the ${min}-${max}% ideal for your age). This increases risk without necessarily improving returns. As you add new investments, direct them toward ${uw || 'underweight classes'} until your allocation returns to the target range. Do not sell existing positions purely to rebalance — tax implications may outweigh the benefit.`,
                'long_term', fi, 25, 90, {}));
        }

        if (totalDeviation > 40) {
            const fi = impactFor('assetDiversity');
            candidates.push(makeItem('AD_9_2', 'assetDiversity',
                'Rebalance Portfolio Allocation',
                `Your overall portfolio allocation is significantly misaligned with the ideal for your age (${age} years). Total deviation: ${Math.round(totalDeviation)} percentage points. Consider gradually rebalancing over the next 12 months by redirecting new SIPs toward underweight classes. If this is due to recent market movement, a 6-month STP strategy can smooth the transition.`,
                'long_term', fi, 25, 90, {}));
        }

        if (age >= 50 && alloc.debt < idealRanges.debt[0]) {
            const fi = impactFor('assetDiversity');
            candidates.push(makeItem('AD_9_3', 'assetDiversity',
                'Shift More to Debt Instruments',
                `At age ${age}, the ideal debt allocation range is ${idealRanges.debt[0]}-${idealRanges.debt[1]}%. Your current debt allocation is ${Math.round(alloc.debt)}%. Shifting a portion of your portfolio to debt instruments (debt mutual funds, bonds, or FDs) reduces volatility as you approach retirement. Start routing at least 20% of new investments into debt.`,
                'short_term', fi, 50, 55, {}));
        }
    }

    // ── DIMENSION 10: Portfolio Understanding ──
    const puVal = Number(p.beh_product_understanding) || 0;
    if (puVal <= 2) {
        const fi = impactFor('portfolioUnderstanding');
        candidates.push(makeItem('PU_10_1', 'portfolioUnderstanding',
            'Learn About Your Investment Products',
            `You have rated your investment product knowledge at ${puVal}/5. Investing in products you do not understand increases your risk of panic-selling and poor allocation decisions. Start with one resource this week: SEBI's investor education portal (investor.sebi.gov.in) or a simple index fund explainer. You do not need to understand everything — you need to understand what you own.`,
            'long_term', fi, 25, 30, {}));
    } else if (puVal === 3) {
        const fi = impactFor('portfolioUnderstanding');
        candidates.push(makeItem('PU_10_2', 'portfolioUnderstanding',
            'Deepen Investment Product Knowledge',
            `You have a moderate understanding of investment products. One practical step to deepen this: review the factsheet of your largest mutual fund holding. Check its expense ratio, benchmark, and 5-year rolling return vs. the benchmark. This single exercise, done once per quarter, builds financial fluency faster than passive reading.`,
            'long_term', fi, 25, 30, {}));
    }

    // ── SELECTION ──
    const alwaysSurface = candidates.filter(c => c.alwaysSurface);
    const rest = candidates.filter(c => !c.alwaysSurface);

    rest.sort((a, b) => b.priorityScore - a.priorityScore);

    const dimCount = {};
    const selected = [];
    const MAX_PER_DIM = 2;
    const MAX_TOTAL = 5;
    const MIN_TOTAL = 3;

    for (const item of rest) {
        if (selected.length >= MAX_TOTAL) break;
        const count = dimCount[item.dimension] || 0;
        if (count >= MAX_PER_DIM) continue;
        const hasImmediate = selected.some(i => i.timeframe === 'immediate');
        if (!hasImmediate && item.timeframe !== 'immediate' && rest.some(r => r.timeframe === 'immediate' && !selected.includes(r))) continue;
        selected.push(item);
        dimCount[item.dimension] = count + 1;
    }

    if (selected.length < MIN_TOTAL) {
        for (const item of rest) {
            if (selected.includes(item)) continue;
            if (selected.length >= MAX_TOTAL) break;
            selected.push(item);
        }
    }

    const result = [...alwaysSurface, ...selected];

    result.sort((a, b) => {
        if (a.alwaysSurface && !b.alwaysSurface) return -1;
        if (!a.alwaysSurface && b.alwaysSurface) return 1;
        const tf = { immediate: 0, short_term: 1, long_term: 2 };
        if (tf[a.timeframe] !== tf[b.timeframe]) return tf[a.timeframe] - tf[b.timeframe];
        return b.priorityScore - a.priorityScore;
    });

    result.forEach((item, i) => {
        item.priority = i + 1;
        delete item.alwaysSurface;
    });

    return result;
}

function getIdealAllocRanges(age, hasShortHorizonGoal) {
    let ranges;
    if (age < 30) ranges = { equity: [50, 85], debt: [0, 30], commodity: [0, 20], alt: [0, 10], realEstate: [0, 20] };
    else if (age <= 40) ranges = { equity: [40, 75], debt: [5, 35], commodity: [0, 20], alt: [0, 10], realEstate: [0, 20] };
    else if (age <= 50) ranges = { equity: [30, 65], debt: [10, 40], commodity: [0, 20], alt: [0, 10], realEstate: [0, 20] };
    else if (age <= 60) ranges = { equity: [20, 50], debt: [20, 55], commodity: [0, 20], alt: [0, 10], realEstate: [0, 20] };
    else ranges = { equity: [10, 35], debt: [35, 65], commodity: [0, 15], alt: [0, 10], realEstate: [0, 20] };

    if (hasShortHorizonGoal) {
        ranges = { ...ranges };
        ranges.debt = [ranges.debt[0], Math.min(60, ranges.debt[1] + 15)];
        ranges.equity = [Math.max(0, ranges.equity[0] - 15), ranges.equity[1]];
    }

    return ranges;
}

module.exports = { generateActionPlan };
