/**
 * FBS Tester — Self-contained
 * Contains the actual FBS calculation logic. Just edit the profile below and run:
 *   node tasks/fbstester.js
 */

// ═══════════════════════════════════════════════════════════════
// EDIT THIS PROFILE — all fields are optional, defaults to 0/empty
// ═══════════════════════════════════════════════════════════════
const profile = {
    date_of_birth: '1998-08-01',
    city: 'Kolkata',
    marital_status: 'Single',
    dependents: 0,
    employment_type: 'Salaried',
    risk_comfort: 5,

    annual_salary: 0,
    business_income: 0,
    annual_bonus: 0,
    other_income: 0,
    monthly_take_home: 0,

    expense_household: 5000,
    expense_rent: 8000,
    expense_utilities: 2000,
    expense_transport: 3000,
    expense_food: 5000,
    expense_subscriptions: 500,
    expense_discretionary: 3000,
    expense_annual_insurance: 0,
    expense_annual_education: 0,
    expense_annual_property: 0,
    expense_annual_travel: 0,
    expense_annual_other: 0,

    savings_balance: 30000,
    fd_balance: 0,
    fd_rate: 7,
    emergency_fund: 20000,

    inv_direct_stocks: 0,
    inv_equity_mf: 0,
    inv_monthly_sip: 0,
    inv_epf_ppf_nps: 0,
    inv_debt_funds: 0,
    inv_gold_commodities: 0,
    inv_real_estate: 0,
    inv_crypto_alt: 0,
    sip_consecutive_months: 0,

    loans: [
        { type: 'Personal Loan', outstanding: 100000, interestRate: 13, emi: 5000, tenure: 24 },
    ],
    credit_cards: [],
    credit_score: 700,

    health_cover: 300000,
    life_cover: 0,

    tax_regime: 'New Regime',
    tax_80c_used: 0,
    tax_nps_80ccd: 0,
    tax_hra: 0,
    tax_home_loan_interest: 0,
    tax_80d: 0,

    beh_delay_decisions: 3,
    beh_prefer_guaranteed: 3,
    beh_follow_market_news: 3,
    beh_spend_impulsively: 3,
    beh_review_monthly: 3,
    beh_avoid_debt: 3,
    beh_hold_losing: 3,
    beh_anxious_decisions: 3,
    beh_familiar_brands: 3,
    beh_compare_peers: 3,
    beh_market_reaction: 3,
    beh_windfall_behaviour: 3,
    beh_product_understanding: 3,

    goals: [],
};

// ═══════════════════════════════════════════════════════════════
// CALCULATION ENGINE (extracted from backend/engine/calculations.js)
// ═══════════════════════════════════════════════════════════════

function getAge(dob) {
    if (!dob) return 30;
    return Math.floor((Date.now() - new Date(dob).getTime()) / (365.25 * 24 * 60 * 60 * 1000));
}

function getFBSLifeStage(age) {
    if (age < 30) return { key: 'EARLY_CAREER', label: 'Early Career', description: 'Building foundations and habits' };
    if (age < 40) return { key: 'ESTABLISHING', label: 'Establishing', description: 'Managing major life commitments' };
    if (age < 50) return { key: 'CONSOLIDATING', label: 'Consolidating', description: 'Balancing peak expenses and wealth growth' };
    if (age < 58) return { key: 'PEAK_EARNING', label: 'Peak Earning', description: 'Maximising and protecting wealth' };
    return { key: 'PRE_RETIREMENT', label: 'Pre-Retirement', description: 'Preserving wealth and reducing risk' };
}

const FBS_WEIGHTS = {
    EARLY_CAREER:   { emergencyFund: 16, insurance: 11, liabilityManagement: 8,  investmentRegularity: 20, goalClarity: 16, behaviouralTendencies: 9,  portfolioUnderstanding: 9,  taxLiteracy: 2, assetDiversity: 9 },
    ESTABLISHING:   { emergencyFund: 16, insurance: 16, liabilityManagement: 10, investmentRegularity: 15, goalClarity: 14, behaviouralTendencies: 9,  portfolioUnderstanding: 9,  taxLiteracy: 6, assetDiversity: 5 },
    CONSOLIDATING:  { emergencyFund: 14, insurance: 16, liabilityManagement: 10, investmentRegularity: 13, goalClarity: 13, behaviouralTendencies: 11, portfolioUnderstanding: 10, taxLiteracy: 8, assetDiversity: 5 },
    PEAK_EARNING:   { emergencyFund: 13, insurance: 19, liabilityManagement: 10, investmentRegularity: 11, goalClarity: 10, behaviouralTendencies: 12, portfolioUnderstanding: 11, taxLiteracy: 9, assetDiversity: 5 },
    PRE_RETIREMENT: { emergencyFund: 14, insurance: 21, liabilityManagement: 11, investmentRegularity: 9,  goalClarity: 8,  behaviouralTendencies: 12, portfolioUnderstanding: 12, taxLiteracy: 9, assetDiversity: 4 },
};

function scaleScore(rawScore, originalMax, newMax) {
    if (originalMax === 0) return 0;
    return Math.round((rawScore / originalMax) * newMax);
}

function getIdealAllocRanges(age) {
    if (age < 30)  return { equity: [50, 85], debt: [0, 30], commodity: [0, 20], alt: [0, 15], realEstate: [0, 25] };
    if (age <= 40) return { equity: [40, 75], debt: [5, 35], commodity: [0, 20], alt: [0, 15], realEstate: [0, 30] };
    if (age <= 50) return { equity: [30, 65], debt: [10, 40], commodity: [0, 20], alt: [0, 10], realEstate: [0, 35] };
    if (age <= 60) return { equity: [20, 50], debt: [20, 55], commodity: [0, 20], alt: [0, 10], realEstate: [0, 35] };
    return              { equity: [10, 35], debt: [35, 65], commodity: [0, 15], alt: [0, 10], realEstate: [0, 35] };
}

function computeIncome(p) {
    const salaried = Number(p.annual_salary) || 0;
    const business = Number(p.business_income) || 0;
    const bonus = Number(p.annual_bonus) || 0;
    const other = Number(p.other_income) || 0;
    const total = salaried + business + bonus + other;
    return { salaried, business, bonus, other, total };
}

function computeExpenses(p) {
    const household = Number(p.expense_household) || 0;
    const rent = Number(p.expense_rent) || 0;
    const utilities = Number(p.expense_utilities) || 0;
    const transport = Number(p.expense_transport) || 0;
    const food = Number(p.expense_food) || 0;
    const subs = Number(p.expense_subscriptions) || 0;
    const disc = Number(p.expense_discretionary) || 0;
    const insurance_legacy = Number(p.expense_insurance) || 0;

    const aInsure = (Number(p.expense_annual_insurance) || 0) + (insurance_legacy * 12);
    const aEdu = Number(p.expense_annual_education) || 0;
    const aProp = Number(p.expense_annual_property) || 0;
    const aTravel = Number(p.expense_annual_travel) || 0;
    const aOther = Number(p.expense_annual_other) || 0;

    const totalAnnualOnly = aInsure + aEdu + aProp + aTravel + aOther;
    const totalMonthlyOnly = household + rent + utilities + transport + food + subs + disc;
    const effectiveMonthly = totalMonthlyOnly + (totalAnnualOnly / 12);

    return { totalMonthly: totalMonthlyOnly, totalAnnualOnly, effectiveMonthly };
}

function computeAssets(p) {
    const stocks = Number(p.inv_direct_stocks) || 0;
    const equityMf = Number(p.inv_equity_mf) || 0;
    const epfPpfNps = Number(p.inv_epf_ppf_nps) || 0;
    const debtFunds = Number(p.inv_debt_funds) || 0;
    const gold = Number(p.inv_gold_commodities) || 0;
    const realEstate = Number(p.inv_real_estate) || 0;
    const crypto = Number(p.inv_crypto_alt) || 0;
    const fd = Number(p.fd_balance) || 0;
    const savings = Number(p.savings_balance) || 0;

    const equity = stocks + equityMf;
    const debt = fd + savings + debtFunds + epfPpfNps;
    const commodity = gold;
    const altInvestments = crypto;
    const total = equity + debt + commodity + realEstate + altInvestments;
    const pct = (v) => total ? parseFloat((v / total * 100).toFixed(2)) : 0;

    return {
        total, equity, debt, commodity, realEstate, altInvestments,
        monthlySip: Number(p.inv_monthly_sip) || 0,
        allocation: { equity: pct(equity), realEstate: pct(realEstate), commodity: pct(commodity), debt: pct(debt), altInvestments: pct(altInvestments) }
    };
}

function computeInsurance(p) {
    const healthCover = Number(p.health_cover) || 0;
    const lifeCover = Number(p.life_cover) || 0;
    const annualIncome = Number(p.annual_salary) || 0;
    const idealHealth = Math.max(500000, annualIncome * 0.5);
    const hasDependents = (Number(p.dependents) || 0) > 0 || p.marital_status === 'Married';
    const rawIdealLife = hasDependents ? annualIncome * 10 : 0;
    const idealLife = rawIdealLife > 0 ? Math.ceil(rawIdealLife / 5000000) * 5000000 : 0;
    return { healthCover, lifeCover, idealHealth, idealLife };
}

function computeLiabilities(p) {
    const goodTypes = ['Home Loan', 'Education Loan'];
    let rawLoans = Array.isArray(p.loans) ? p.loans : [];
    let creditCards = Array.isArray(p.credit_cards) ? p.credit_cards : [];

    let items = rawLoans.map(loan => ({
        type: loan.type || 'Other Loan',
        category: goodTypes.includes(loan.type) ? 'Good' : 'Bad',
        outstanding: Number(loan.outstanding) || 0,
        emi: Number(loan.emi) || 0,
        interestRate: Number(loan.interestRate) || 0,
    }));

    creditCards.forEach(card => {
        const balance = Number(card.balance) || 0;
        if (balance <= 0) return;
        const cardType = card.type || 'revolving';
        let emi = 0;
        if (cardType === 'emi') emi = Number(card.emi_amount) || Math.round(balance * 0.03);
        else if (cardType === 'revolving') emi = Math.round(balance * 0.03);
        items.push({
            type: card.name ? `Credit Card (${card.name})` : 'Credit Card',
            category: 'Bad', outstanding: balance, emi,
            interestRate: cardType === 'revolving' ? 36 : (cardType === 'emi' ? 18 : 0),
            ccType: cardType
        });
    });

    let goodOutstanding = 0, badOutstanding = 0, totalEmi = 0;
    items.forEach(item => {
        totalEmi += item.emi;
        if (item.category === 'Good') goodOutstanding += item.outstanding;
        else badOutstanding += item.outstanding;
    });

    const totalOutstanding = items.reduce((s, i) => s + i.outstanding, 0);
    const ccItems = items.filter(i => i.ccType);
    const revolvingBalance = ccItems.filter(i => i.ccType === 'revolving').reduce((s, c) => s + c.outstanding, 0);
    const emiCCBalance = ccItems.filter(i => i.ccType === 'emi').reduce((s, c) => s + c.outstanding, 0);

    return {
        hasLiabilities: totalOutstanding > 0,
        total: totalOutstanding, totalEmi, items,
        creditCards: { revolvingBalance, emiCCBalance },
        goodLiability: { outstanding: goodOutstanding },
        badLiability: { outstanding: badOutstanding },
    };
}

function computeTax(p) {
    const gross = Number(p.annual_salary) || 0;
    const business = Number(p.business_income) || 0;
    const bonus = Number(p.annual_bonus) || 0;
    const other = Number(p.other_income) || 0;
    const totalIncome = gross + business + bonus + other;

    const old80c = Math.min(Number(p.tax_80c_used) || 0, 150000);
    const old80d = Math.min(Number(p.tax_80d) || 0, 75000);
    const oldHra = Number(p.tax_hra) || 0;
    const oldHomeLoan = Math.min(Number(p.tax_home_loan_interest) || 0, 200000);
    const old80ccd = Math.min(Number(p.tax_nps_80ccd) || 0, 50000);
    const oldTotalDeductions = old80c + old80d + oldHra + oldHomeLoan + old80ccd;
    const oldTaxableIncome = Math.max(0, totalIncome - 50000 - oldTotalDeductions);

    function oldRegimeTax(taxable) {
        let tax = 0;
        if (taxable > 1000000) tax += (taxable - 1000000) * 0.30;
        if (taxable > 500000) tax += Math.min(taxable - 500000, 500000) * 0.20;
        if (taxable > 250000) tax += Math.min(taxable - 250000, 250000) * 0.05;
        if (taxable <= 500000) tax = 0;
        return Math.round(tax * 1.04);
    }

    const newTaxableIncome = Math.max(0, totalIncome - 75000);
    function newRegimeTax(taxable) {
        let tax = 0;
        if (taxable > 1500000) tax += (taxable - 1500000) * 0.30;
        if (taxable > 1200000) tax += Math.min(taxable - 1200000, 300000) * 0.20;
        if (taxable > 1000000) tax += Math.min(taxable - 1000000, 200000) * 0.15;
        if (taxable > 700000) tax += Math.min(taxable - 700000, 300000) * 0.10;
        if (taxable > 300000) tax += Math.min(taxable - 300000, 400000) * 0.05;
        if (taxable <= 700000) tax = 0;
        return Math.round(tax * 1.04);
    }

    const oldTax = oldRegimeTax(oldTaxableIncome);
    const newTax = newRegimeTax(newTaxableIncome);
    const recommended = newTax <= oldTax ? 'New Regime' : 'Old Regime';
    const potentialSavings = Math.abs(oldTax - newTax);
    return { recommended, potentialSavings };
}

function computeEmergency(p) {
    const expenses = computeExpenses(p);
    const actualEmergency = Number(p.emergency_fund) || 0;
    const idealEmergency = Math.round(expenses.effectiveMonthly * 6);
    return { emergencyFunds: { actual: actualEmergency, ideal: idealEmergency } };
}

// ═══════════════════════════════════════════════════════════════
// COMPUTE FBS
// ═══════════════════════════════════════════════════════════════
function computeFBS(p) {
    const assets = computeAssets(p);
    const emergency = computeEmergency(p);
    const insurance = computeInsurance(p);
    const liabilities = computeLiabilities(p);
    const income = computeIncome(p);
    const tax = computeTax(p);
    const monthlyIncome = Number(p.monthly_take_home) || ((income.salaried + income.business) / 12);

    // ─── DYNAMIC WEIGHTS ───
    const age = getAge(p.date_of_birth);
    const fbsLifeStage = getFBSLifeStage(age);
    const w = { ...FBS_WEIGHTS[fbsLifeStage.key] };

    // Income-based tax cap
    const incomeTotal = income.total;
    let taxMax = w.taxLiteracy;
    if (incomeTotal === 0) taxMax = 0;
    else if (incomeTotal < 500000) taxMax = Math.min(w.taxLiteracy, 2);
    else if (incomeTotal < 1200000) taxMax = Math.min(w.taxLiteracy, 5);
    else if (incomeTotal >= 2500000) taxMax = w.taxLiteracy + 2;
    const taxDiff = w.taxLiteracy - taxMax;
    w.taxLiteracy = taxMax;
    w.portfolioUnderstanding += taxDiff;

    // ─── TIER 1: FOUNDATION ───

    // Emergency Fund (raw out of 15)
    const emRatio = emergency.emergencyFunds.ideal ? emergency.emergencyFunds.actual / emergency.emergencyFunds.ideal : 0;
    let emergencyFundRaw = 1;
    if (emRatio >= 2.0) emergencyFundRaw = 15;
    else if (emRatio >= 1.0) emergencyFundRaw = 12;
    else if (emRatio >= 0.75) emergencyFundRaw = 9;
    else if (emRatio >= 0.5) emergencyFundRaw = 6;
    else if (emRatio >= 0.25) emergencyFundRaw = 3;

    // Insurance Coverage
    let insuranceScore;
    if (insurance.idealLife === 0) {
        const fullInsW = w.insurance;
        let healthPts = scaleScore(2, 8, fullInsW);
        if (insurance.healthCover >= insurance.idealHealth) healthPts = fullInsW;
        else if (insurance.idealHealth > 0 && insurance.healthCover >= insurance.idealHealth * 0.5) healthPts = scaleScore(5, 8, fullInsW);
        insuranceScore = healthPts;
    } else {
        const healthMax = Math.round(w.insurance * 8 / 15);
        const lifeMax = w.insurance - healthMax;
        let healthPts = scaleScore(2, 8, healthMax);
        if (insurance.healthCover >= insurance.idealHealth) healthPts = healthMax;
        else if (insurance.idealHealth > 0 && insurance.healthCover >= insurance.idealHealth * 0.5) healthPts = scaleScore(5, 8, healthMax);
        let lifePts = scaleScore(1, 7, lifeMax);
        if (insurance.lifeCover >= insurance.idealLife) lifePts = lifeMax;
        else if (insurance.lifeCover >= insurance.idealLife * 0.5) lifePts = scaleScore(4, 7, lifeMax);
        insuranceScore = healthPts + lifePts;
    }

    // Liability Management — with cushionRatio
    const emiRatio = monthlyIncome > 0
        ? liabilities.totalEmi / monthlyIncome
        : (liabilities.totalEmi > 0 ? 1 : 0);

    const liquidAssets = assets.total - (assets.realEstate || 0);
    const badOutstanding = liabilities.badLiability.outstanding;
    const cushionRatio = badOutstanding > 0 ? liquidAssets / badOutstanding : Infinity;

    const liabMax = w.liabilityManagement;
    let liabilitiesScore;
    if (!liabilities.hasLiabilities) {
        liabilitiesScore = liabMax;
    } else if (liabilities.badLiability.outstanding === 0 && emiRatio <= 0.4) {
        liabilitiesScore = liabMax;
    } else if (liabilities.badLiability.outstanding === 0 && emiRatio > 0.4) {
        liabilitiesScore = Math.round(liabMax * 0.4);
    } else if (badOutstanding > 0 && cushionRatio >= 5) {
        liabilitiesScore = Math.round(liabMax * 0.8);
    } else if (badOutstanding > 0 && cushionRatio >= 2 && emiRatio <= 0.4) {
        liabilitiesScore = Math.round(liabMax * 0.6);
    } else if (liabilities.goodLiability.outstanding > badOutstanding && emiRatio <= 0.4) {
        liabilitiesScore = Math.round(liabMax * 0.7);
    } else if (liabilities.goodLiability.outstanding > badOutstanding && emiRatio > 0.4) {
        liabilitiesScore = Math.round(liabMax * 0.4);
    } else if (cushionRatio >= 1 && emiRatio <= 0.2) {
        liabilitiesScore = Math.round(liabMax * 0.4);
    } else if (cushionRatio < 1 && emiRatio <= 0.2) {
        liabilitiesScore = Math.round(liabMax * 0.2);
    } else {
        liabilitiesScore = Math.round(liabMax * 0.1);
    }

    // ─── TIER 2: BEHAVIOUR ───

    // Investment Regularity (raw out of 15)
    const monthlySip = Number(p.inv_monthly_sip) || assets.monthlySip || 0;
    const sipRatio = income.total > 0 ? (monthlySip * 12 / income.total * 100) : 0;
    let sipBase = 0;
    if (sipRatio > 30) sipBase = 15;
    else if (sipRatio >= 20) sipBase = 14;
    else if (sipRatio >= 15) sipBase = 12;
    else if (sipRatio >= 10) sipBase = 9;
    else if (sipRatio >= 5) sipBase = 6;
    else if (sipRatio > 0) sipBase = 2;

    let sipMultiplier = 1.0;
    if (p.sip_consecutive_months !== undefined && p.sip_consecutive_months !== null) {
        const months = Number(p.sip_consecutive_months) || 0;
        if (months >= 6) sipMultiplier = 1.0;
        else if (months >= 3) sipMultiplier = 0.9;
        else sipMultiplier = 0.8;
    }
    const investmentRegularityRaw = Math.round(sipBase * sipMultiplier);

    // Goal Clarity (raw out of 15)
    let goalClarityRaw = 0;
    if (Array.isArray(p.goals) && p.goals.length > 0) {
        const timedGoals = p.goals.filter(g => Number(g.years) > 0);
        if (timedGoals.length >= 3) goalClarityRaw = 15;
        else if (timedGoals.length === 2) goalClarityRaw = 10;
        else if (timedGoals.length === 1) goalClarityRaw = 6;
        else goalClarityRaw = 3;
    }

    // Behavioural Tendencies (raw out of 10)
    const bReview = Number(p.beh_review_monthly) || 1;
    const bAvoidDebt = Number(p.beh_avoid_debt) || 1;
    const bMarketReaction = Number(p.beh_market_reaction) || 1;
    const bWindfall = Number(p.beh_windfall_behaviour) || 1;
    const bProductUnderstanding = Number(p.beh_product_understanding) || 1;
    const bDelay = 6 - (Number(p.beh_delay_decisions) || 5);
    const bImpulse = 6 - (Number(p.beh_spend_impulsively) || 5);
    const bLossAversion = 6 - (Number(p.beh_hold_losing) || 5);
    const bPeerComparison = 6 - (Number(p.beh_compare_peers) || 5);
    const behavRawTotal = bReview + bAvoidDebt + bMarketReaction + bWindfall + bProductUnderstanding
        + bDelay + bImpulse + bLossAversion + bPeerComparison;
    const behavioralTendenciesRaw = Math.round((behavRawTotal / 45) * 10);

    // ─── TIER 3: AWARENESS ───

    // Portfolio Understanding (raw out of 10) — default 0
    const puVal = Number(p.beh_product_understanding) || 0;
    let portfolioUnderstandingRaw = 0;
    if (puVal === 5) portfolioUnderstandingRaw = 10;
    else if (puVal === 4) portfolioUnderstandingRaw = 8;
    else if (puVal === 3) portfolioUnderstandingRaw = 6;
    else if (puVal === 2) portfolioUnderstandingRaw = 3;
    else if (puVal === 1) portfolioUnderstandingRaw = 1;

    // Tax & Regime Literacy (raw out of 5) — 0 when no income
    let taxScoreRaw = 0;
    if (incomeTotal > 0) {
        const optedRegime = p.tax_regime || 'New Regime';
        const has80cUsed = (Number(p.tax_80c_used) || 0) > 0;
        const hasNps = (Number(p.tax_nps_80ccd) || 0) > 0;
        const hasHra = (Number(p.tax_hra) || 0) > 0;
        const hasHomeLoan = (Number(p.tax_home_loan_interest) || 0) > 0;
        const has80d = (Number(p.tax_80d) || 0) > 0;
        const hasAnyDeduction = has80cUsed || hasNps || hasHra || hasHomeLoan || has80d;
        if (tax.recommended === optedRegime && hasAnyDeduction) taxScoreRaw = 5;
        else if (tax.recommended === optedRegime) taxScoreRaw = 3;
        else if (tax.potentialSavings <= 5000) taxScoreRaw = 2;
    }

     // Asset Diversity — age-aware (raw out of 5)
    const alloc = assets.allocation;
    let assetDiversityRaw = 0;
    let totalDev = 0;
    if (assets.total > 0) {
        const idealRanges = getIdealAllocRanges(age);
        const dev = (actual, [min, max]) => actual >= min && actual <= max ? 0 : (actual < min ? min - actual : actual - max);
        totalDev = dev(alloc.equity, idealRanges.equity)
            + dev(alloc.debt, idealRanges.debt)
            + dev(alloc.commodity, idealRanges.commodity)
            + dev(alloc.altInvestments, idealRanges.alt)
            + dev(alloc.realEstate, idealRanges.realEstate);
        if (totalDev === 0) assetDiversityRaw = 5;
        else if (totalDev <= 15) assetDiversityRaw = 4;
        else if (totalDev <= 30) assetDiversityRaw = 3;
        else if (totalDev <= 50) assetDiversityRaw = 2;
        else if (totalDev <= 70) assetDiversityRaw = 1;
    }
    // ─── SCALE TO DYNAMIC WEIGHTS ───
    const scaledEmergencyFund = scaleScore(emergencyFundRaw, 15, w.emergencyFund);
    const scaledInvestmentRegularity = scaleScore(investmentRegularityRaw, 15, w.investmentRegularity);
    const scaledGoalClarity = scaleScore(goalClarityRaw, 15, w.goalClarity);
    const scaledBehavioral = scaleScore(behavioralTendenciesRaw, 10, w.behaviouralTendencies);
    const scaledPortfolio = scaleScore(portfolioUnderstandingRaw, 10, w.portfolioUnderstanding);
    const scaledTax = scaleScore(taxScoreRaw, 5, w.taxLiteracy);
    const scaledDiversity = scaleScore(assetDiversityRaw, 5, w.assetDiversity);

    // ─── FRAGILITY PENALTY ───
     const zeroEmergency = emergency.emergencyFunds.actual === 0;
    const zeroInsurance = insurance.healthCover === 0 && insurance.lifeCover === 0;
    const highBadDebt = badOutstanding > 0
        && cushionRatio < 2
        && (monthlyIncome === 0 || badOutstanding >= monthlyIncome * 2);

    const { revolvingBalance = 0, emiCCBalance = 0 } = liabilities.creditCards || {};
    const effectiveRevolving = revolvingBalance;

    const revolvingPenalty = monthlyIncome > 0
        ? Math.min(10, Math.floor(effectiveRevolving / monthlyIncome) * 3)
        : (effectiveRevolving > 0 ? Math.min(10, Math.ceil(effectiveRevolving / 50000) * 3) : 0);

    let fragilityPenalty = 0;
    let flags = [];
    if (zeroEmergency && zeroInsurance && highBadDebt) {
        fragilityPenalty = 15; flags = ['critical_triple_gap'];
    } else if (zeroEmergency && zeroInsurance) {
        fragilityPenalty = 8; flags = ['no_emergency_no_insurance'];
    } else if (zeroEmergency && highBadDebt) {
        let base = 6;
        if (effectiveRevolving > badOutstanding * 0.5) base = Math.round(base * 1.5);
        else if (emiCCBalance >= monthlyIncome && monthlyIncome > 0) base = Math.round(base * 1.2);
        fragilityPenalty = Math.min(base, 15);
        flags = ['no_emergency_high_debt'];
    } else if (zeroInsurance && highBadDebt) {
        let base = 5;
        if (effectiveRevolving > badOutstanding * 0.5) base = Math.round(base * 1.5);
        else if (emiCCBalance >= monthlyIncome && monthlyIncome > 0) base = Math.round(base * 1.2);
        fragilityPenalty = Math.min(base, 15);
        flags = ['no_insurance_high_debt'];
    }

    const penalty = revolvingPenalty + fragilityPenalty;

    // ─── TOTALS ───
    const foundation = scaledEmergencyFund + insuranceScore + liabilitiesScore;
    const behaviour = scaledInvestmentRegularity + scaledGoalClarity + scaledBehavioral;
    const awareness = scaledPortfolio + scaledTax + scaledDiversity;
    const rawTotal = foundation + behaviour + awareness;
    const totalScore = Math.min(100, Math.max(0, rawTotal - penalty));

    return {
        total: totalScore,
        breakdown: {
            emergencyFund: scaledEmergencyFund,
            insurance: insuranceScore,
            liabilities: liabilitiesScore,
            investmentRegularity: scaledInvestmentRegularity,
            goalClarity: scaledGoalClarity,
            behavioralTendencies: scaledBehavioral,
            portfolioUnderstanding: scaledPortfolio,
            tax: scaledTax,
            assetDiversity: scaledDiversity,
        },
        subScores: {
            foundation: { score: foundation, max: w.emergencyFund + w.insurance + w.liabilityManagement },
            behaviour: { score: behaviour, max: w.investmentRegularity + w.goalClarity + w.behaviouralTendencies },
            awareness: { score: awareness, max: w.portfolioUnderstanding + w.taxLiteracy + w.assetDiversity },
        },
        fragility: { penalty, fragilityPenalty, revolvingPenalty, flags },
        lifeStage: fbsLifeStage,
        appliedWeights: w,
        // Debug intermediates
        _debug: {
            age, monthlyIncome, incomeTotal,
            emRatio: Math.round(emRatio * 100) / 100,
            emiRatio: Math.round(emiRatio * 100) / 100,
            cushionRatio: cushionRatio === Infinity ? '∞' : Math.round(cushionRatio * 100) / 100,
            liquidAssets, badOutstanding,
             rawScores: { emergencyFundRaw, investmentRegularityRaw, goalClarityRaw, behavioralTendenciesRaw, portfolioUnderstandingRaw, taxScoreRaw, assetDiversityRaw, allocDeviation: Math.round(totalDev * 10) / 10 },
           fragilityFlags: { zeroEmergency, zeroInsurance, highBadDebt },
        },
    };
}

// ═══════════════════════════════════════════════════════════════
// PRINT RESULTS
// ═══════════════════════════════════════════════════════════════
const result = computeFBS(profile);
const b = result.breakdown;
const w = result.appliedWeights;
const d = result._debug;

console.log('='.repeat(55));
console.log('  FBS SCORE:', result.total, '/ 100');
console.log('  Life Stage:', result.lifeStage.label, `(age ${d.age})`);
console.log('='.repeat(55));

console.log('\n--- Tier 1: Foundation ---', `(${result.subScores.foundation.score} / ${result.subScores.foundation.max})`);
console.log(`  Emergency Fund:     ${b.emergencyFund} / ${w.emergencyFund}   (emRatio: ${d.emRatio})`);
console.log(`  Insurance:          ${b.insurance} / ${w.insurance}`);
console.log(`  Liability Mgmt:     ${b.liabilities} / ${w.liabilityManagement}   (emiRatio: ${d.emiRatio}, cushion: ${d.cushionRatio})`);

console.log('\n--- Tier 2: Behaviour ---', `(${result.subScores.behaviour.score} / ${result.subScores.behaviour.max})`);
console.log(`  Inv. Regularity:    ${b.investmentRegularity} / ${w.investmentRegularity}`);
console.log(`  Goal Clarity:       ${b.goalClarity} / ${w.goalClarity}`);
console.log(`  Behav. Tendencies:  ${b.behavioralTendencies} / ${w.behaviouralTendencies}`);

console.log('\n--- Tier 3: Awareness ---', `(${result.subScores.awareness.score} / ${result.subScores.awareness.max})`);
console.log(`  Portfolio Underst.: ${b.portfolioUnderstanding} / ${w.portfolioUnderstanding}`);
console.log(`  Tax Literacy:       ${b.tax} / ${w.taxLiteracy}`);
console.log(`  Asset Diversity:    ${b.assetDiversity} / ${w.assetDiversity}   (allocDev: ${d.rawScores.allocDeviation})`);
console.log('\n--- Penalties ---');
console.log(`  Revolving:          -${result.fragility.revolvingPenalty}`);
console.log(`  Fragility:          -${result.fragility.fragilityPenalty}`);
if (result.fragility.flags.length) console.log(`  Flags:              ${result.fragility.flags.join(', ')}`);

console.log('\n--- Debug ---');
console.log(`  Monthly Income:     ₹${d.monthlyIncome.toLocaleString('en-IN')}`);
console.log(`  Annual Income:      ₹${d.incomeTotal.toLocaleString('en-IN')}`);
console.log(`  Liquid Assets:      ₹${d.liquidAssets.toLocaleString('en-IN')}`);
console.log(`  Bad Debt:           ₹${d.badOutstanding.toLocaleString('en-IN')}`);
console.log(`  Fragility Checks:   zeroEM=${d.fragilityFlags.zeroEmergency} zeroIns=${d.fragilityFlags.zeroInsurance} highDebt=${d.fragilityFlags.highBadDebt}`);

console.log('\n' + '='.repeat(55));
