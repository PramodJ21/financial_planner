/**
 * FinHealth Calculation Engine
 * All financial metrics are computed from questionnaire data
 */

// ============ LIFE STAGE ============
function getLifeStage(dob) {
    if (!dob) return { stage: 'Building Phase', ageRange: '25-35', minAge: 25, maxAge: 35 };
    const age = Math.floor((Date.now() - new Date(dob).getTime()) / (365.25 * 24 * 60 * 60 * 1000));
    if (age < 25) return { stage: 'Foundation Phase', ageRange: '< 25', minAge: 0, maxAge: 25 };
    if (age <= 35) return { stage: 'Building Phase', ageRange: '25-35', minAge: 25, maxAge: 35 };
    if (age <= 50) return { stage: 'Accumulation Phase', ageRange: '35-50', minAge: 35, maxAge: 50 };
    if (age <= 60) return { stage: 'Pre-Retirement Phase', ageRange: '50-60', minAge: 50, maxAge: 60 };
    return { stage: 'Retirement Phase', ageRange: '60+', minAge: 60, maxAge: 100 };
}

function getAge(dob) {
    if (!dob) return 30;
    return Math.floor((Date.now() - new Date(dob).getTime()) / (365.25 * 24 * 60 * 60 * 1000));
}

// ============ FBS LIFE STAGE (for scoring weights) ============
function getFBSLifeStage(age) {
    if (age < 30) return { key: 'EARLY_CAREER', label: 'Early Career', description: 'Building foundations and habits' };
    if (age < 40) return { key: 'ESTABLISHING', label: 'Establishing', description: 'Managing major life commitments' };
    if (age < 50) return { key: 'CONSOLIDATING', label: 'Consolidating', description: 'Balancing peak expenses and wealth growth' };
    if (age < 58) return { key: 'PEAK_EARNING', label: 'Peak Earning', description: 'Maximising and protecting wealth' };
    return { key: 'PRE_RETIREMENT', label: 'Pre-Retirement', description: 'Preserving wealth and reducing risk' };
}

// Dynamic weight tables — each sums to exactly 100
const FBS_WEIGHTS = {
    EARLY_CAREER: {
        emergencyFund: 16, insurance: 11, liabilityManagement: 8,
        investmentRegularity: 20, goalClarity: 16, behaviouralTendencies: 9,
        portfolioUnderstanding: 9, taxLiteracy: 2, assetDiversity: 9,
    },
    ESTABLISHING: {
        emergencyFund: 16, insurance: 16, liabilityManagement: 10,
        investmentRegularity: 15, goalClarity: 14, behaviouralTendencies: 9,
        portfolioUnderstanding: 9, taxLiteracy: 6, assetDiversity: 5,
    },
    CONSOLIDATING: {
        emergencyFund: 14, insurance: 16, liabilityManagement: 10,
        investmentRegularity: 13, goalClarity: 13, behaviouralTendencies: 11,
        portfolioUnderstanding: 10, taxLiteracy: 8, assetDiversity: 5,
    },
    PEAK_EARNING: {
        emergencyFund: 13, insurance: 19, liabilityManagement: 10,
        investmentRegularity: 11, goalClarity: 10, behaviouralTendencies: 12,
        portfolioUnderstanding: 11, taxLiteracy: 9, assetDiversity: 5,
    },
    PRE_RETIREMENT: {
        emergencyFund: 14, insurance: 21, liabilityManagement: 11,
        investmentRegularity: 9, goalClarity: 8, behaviouralTendencies: 12,
        portfolioUnderstanding: 12, taxLiteracy: 9, assetDiversity: 4,
    },
};

function scaleScore(rawScore, originalMax, newMax) {
    if (originalMax === 0) return 0;
    return Math.round((rawScore / originalMax) * newMax);
}

// Ideal allocation ranges (%) by age — used for FBS asset diversity scoring
// Matches fbs_calculation.md spec: Alt 0-10%, Real Estate 0-20% across all ages
function getIdealAllocRanges(age, hasShortHorizonGoal) {
    let ranges;
    if (age < 30)  ranges = { equity: [50, 85], debt: [0, 30], commodity: [0, 20], alt: [0, 10], realEstate: [0, 20] };
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

// ============ INCOME & EXPENSES ============
function computeIncome(p) {
    const salaried = Number(p.annual_salary) || 0;
    const business = Number(p.business_income) || 0;
    const bonus = Number(p.annual_bonus) || 0;
    const other = Number(p.other_income) || 0;
    const total = salaried + business + bonus + other;
    return {
        salaried, business, bonus, other, total,
        breakdown: [
            { type: 'Salaried', amount: salaried, percent: total ? Math.round(salaried / total * 100) : 0 },
            { type: 'Business', amount: business, percent: total ? Math.round(business / total * 100) : 0 },
            { type: 'Bonus', amount: bonus, percent: total ? Math.round(bonus / total * 100) : 0 },
            { type: 'Other', amount: other, percent: total ? Math.round(other / total * 100) : 0 }
        ]
    };
}

function computeExpenses(p) {
    // 1. Monthly
    const household = Number(p.expense_household) || 0;
    const rent = Number(p.expense_rent) || 0;
    const utilities = Number(p.expense_utilities) || 0;
    const transport = Number(p.expense_transport) || 0;
    const food = Number(p.expense_food) || 0;
    const subs = Number(p.expense_subscriptions) || 0;
    const disc = Number(p.expense_discretionary) || 0;

    // Legacy mapping (in case older profiles have this)
    const insurance_legacy = Number(p.expense_insurance) || 0;

    // 2. Annual
    const aInsure = (Number(p.expense_annual_insurance) || 0) + (insurance_legacy * 12);
    const aEdu = Number(p.expense_annual_education) || 0;
    const aProp = Number(p.expense_annual_property) || 0;
    const aTravel = Number(p.expense_annual_travel) || 0;
    const aOther = Number(p.expense_annual_other) || 0;

    // Food split: 70% groceries (needs), 30% dining out (wants) per spec
    const groceries = food * 0.70;
    const diningOut = food * 0.30;

    // 50/30/20 framework: needs vs wants per fbs_calculation.md
    // needs = rent + utilities + subscriptions + (annualInsurance/12) + (annualEducation/12) + totalEmi + groceries
    // wants = household + transport + discretionary + (travel/12) + (other/12) + diningOut
    // totalEmi is added by computeFBS which has liabilities context; here we expose components for dashboard
    const totalAnnualOnly = aInsure + aEdu + aProp + aTravel + aOther;
    const totalMonthlyOnly = household + rent + utilities + transport + food + subs + disc;

    const fixedAnnual = (rent * 12) + (subs * 12) + aInsure + aEdu + aProp;
    const variableAnnual = (household * 12) + (utilities * 12) + (transport * 12) + (food * 12);
    const miscAnnual = (disc * 12) + aTravel + aOther;

    const totalAnnualCombined = fixedAnnual + variableAnnual + miscAnnual;
    const effectiveMonthly = totalMonthlyOnly + (totalAnnualOnly / 12);

    const fixedMonthly = rent + subs + (aInsure / 12) + (aEdu / 12) + (aProp / 12);
    const variableMonthly = household + utilities + transport + food;
    const miscMonthly = disc + (aTravel / 12) + (aOther / 12);

    // 50/30/20 needs/wants (without EMI — EMI is added in FBS context)
    const needsExEmi = rent + utilities + subs + (aInsure / 12) + (aEdu / 12) + groceries;
    const wantsExEmi = household + transport + disc + (aTravel / 12) + (aOther / 12) + diningOut;

    return {
        totalMonthly: totalMonthlyOnly,
        totalAnnual: totalAnnualCombined,
        totalAnnualOnly,
        effectiveMonthly,
        fixed: fixedAnnual,
        variable: variableAnnual,
        misc: miscAnnual,
        needsExEmi,
        wantsExEmi,
        groceries,
        diningOut,
        breakdown: [
            { type: 'Fixed', amount: fixedAnnual, percent: totalAnnualCombined ? Math.round(fixedAnnual / totalAnnualCombined * 100) : 0 },
            { type: 'Variable', amount: variableAnnual, percent: totalAnnualCombined ? Math.round(variableAnnual / totalAnnualCombined * 100) : 0 },
            { type: 'Miscellaneous', amount: miscAnnual, percent: totalAnnualCombined ? Math.round(miscAnnual / totalAnnualCombined * 100) : 0 },
            { type: 'Taxes', amount: 0, percent: 0 }
        ],
        monthlyBreakdown: [
            { type: 'Fixed', amount: Math.round(fixedMonthly), percent: totalAnnualCombined ? Math.round(fixedAnnual / totalAnnualCombined * 100) : 0 },
            { type: 'Variable', amount: Math.round(variableMonthly), percent: totalAnnualCombined ? Math.round(variableAnnual / totalAnnualCombined * 100) : 0 },
            { type: 'Miscellaneous', amount: Math.round(miscMonthly), percent: totalAnnualCombined ? Math.round(miscAnnual / totalAnnualCombined * 100) : 0 },
            { type: 'Taxes', amount: 0, percent: 0 }
        ]
    };
}

// ============ ASSETS ============
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
        numMutualFunds: Number(p.inv_num_mutual_funds) || 0,
        mfValue: equityMf,
        items: [
            { name: 'Bank FD', value: fd, assetClass: 'Debt', growth: Number(p.fd_rate) || 7, sip: 0 },
            { name: 'Savings Account', value: savings, assetClass: 'Debt', growth: 3.5, sip: 0 },
            { name: 'Direct Stocks', value: stocks, assetClass: 'Equity', growth: 12, sip: 0 },
            { name: 'Equity Mutual Funds', value: equityMf, assetClass: 'Equity', growth: 12, sip: Number(p.inv_monthly_sip) || 0 },
            { name: 'EPF/PPF/NPS', value: epfPpfNps, assetClass: 'Debt', growth: 8, sip: 0 },
            { name: 'Debt Funds & Bonds', value: debtFunds, assetClass: 'Debt', growth: 7, sip: 0 },
            { name: 'Gold/Commodities', value: gold, assetClass: 'Commodity', growth: 8, sip: 0 },
            { name: 'Real Estate', value: realEstate, assetClass: 'Real Estate', growth: 5, sip: 0 },
            { name: 'Crypto/Alternatives', value: crypto, assetClass: 'Alternative Investment', growth: 15, sip: 0 }
        ].filter(i => i.value > 0),
        allocation: {
            equity: pct(equity),
            realEstate: pct(realEstate),
            commodity: pct(commodity),
            debt: pct(debt),
            altInvestments: pct(altInvestments)
        }
    };
}

// ============ ASSET ALLOCATION IDEALS ============
function getAssetAllocationIdeals(age, totalAssets, moneySign, realEstateVal) {
    const finAssets = totalAssets || 0;

    // adjust risk based on age & moneySign
    const signName = moneySign ? moneySign.name : 'Balanced Dolphin';
    let isAggressive = signName === 'Bold Eagle' || signName === 'Curious Fox';
    let isConservative = signName === 'Cautious Turtle' || signName === 'Loyal Elephant';

    let ranges;
    if (age < 30) {
        ranges = { equity: [60, 90], debt: [0, 15], commodity: [5, 15], alt: [0, 20] };
        if (isConservative) { ranges.equity = [50, 75]; ranges.debt = [10, 25]; }
    } else if (age <= 40) {
        ranges = { equity: [50, 80], debt: [5, 20], commodity: [5, 15], alt: [0, 20] };
        if (isConservative) { ranges.equity = [40, 65]; ranges.debt = [15, 30]; }
    } else if (age <= 50) {
        ranges = { equity: [40, 70], debt: [10, 30], commodity: [5, 20], alt: [0, 15] };
        if (isConservative) { ranges.equity = [30, 50]; ranges.debt = [25, 45]; }
    } else if (age <= 60) {
        ranges = { equity: [25, 50], debt: [25, 50], commodity: [5, 20], alt: [0, 10] };
    } else {
        ranges = { equity: [15, 35], debt: [40, 70], commodity: [5, 15], alt: [0, 10] };
    }

    if (isAggressive && age >= 30) {
        ranges.equity[1] = Math.min(100, ranges.equity[1] + 10);
        ranges.debt[0] = Math.max(0, ranges.debt[0] - 5);
    }

    return [
        { name: 'Equity', min: finAssets * ranges.equity[0] / 100, max: finAssets * ranges.equity[1] / 100 },
        { name: 'Commodity', min: finAssets * ranges.commodity[0] / 100, max: finAssets * ranges.commodity[1] / 100 },
        { name: 'Debt', min: finAssets * ranges.debt[0] / 100, max: finAssets * ranges.debt[1] / 100 },
        { name: 'Alternative Investments', min: finAssets * ranges.alt[0] / 100, max: finAssets * ranges.alt[1] / 100 }
    ];
}

// ============ LIABILITIES ============
function computeLiabilities(p) {
    const goodTypes = ['Home Loan', 'Education Loan'];

    // Parse loans from JSONB array (new format) or fall back to flat columns (legacy)
    let rawLoans = [];
    if (p.loans && Array.isArray(p.loans)) {
        rawLoans = p.loans; // use as-is, even if empty (user explicitly cleared loans)
    } else if (p.loans && typeof p.loans === 'string') {
        try { rawLoans = JSON.parse(p.loans); } catch (e) { rawLoans = []; }
    } else if (Number(p.loan_outstanding) > 0) {
        // Legacy fallback only when loans column is null/undefined (un-migrated data)
        rawLoans = [{
            type: p.loan_type || 'Other Loan',
            outstanding: Number(p.loan_outstanding) || 0,
            interestRate: Number(p.loan_interest_rate) || 0,
            emi: Number(p.loan_monthly_emi) || 0,
            tenure: Number(p.loan_remaining_tenure) || 0
        }];
    }

    // ── Credit card parsing from JSONB array ──
    // Each card: { name, balance, type: 'full'|'emi'|'revolving', emi_amount }
    //   'full'      → paid in full every month; EMI = 0, interest = 0%
    //                 Balance still counts as bad debt for fragility threshold.
    //   'emi'       → converted to a fixed-instalment plan; 12–24% p.a.
    //                 EMI = user-provided amount (fallback: 3% of balance)
    //   'revolving' → minimum-due / revolving; most dangerous at 36–42% p.a.
    //                 EMI = 3% of balance (standard Indian CC minimum payment)
    let creditCards = [];
    if (Array.isArray(p.credit_cards) && p.credit_cards.length > 0) {
        creditCards = p.credit_cards;
    } else if (typeof p.credit_cards === 'string' && p.credit_cards.length > 2) {
        try { creditCards = JSON.parse(p.credit_cards); } catch (e) { creditCards = []; }
    }

    // Build items array
    let items = rawLoans.map(loan => ({
        type: loan.type || 'Other Loan',
        category: goodTypes.includes(loan.type) ? 'Good' : 'Bad',
        outstanding: Number(loan.outstanding) || 0,
        emi: Number(loan.emi) || 0,
        interestRate: Number(loan.interestRate) || 0,
        remainingTenure: Number(loan.tenure) || 0
    }));

    creditCards.forEach(card => {
        const balance = Number(card.balance) || 0;
        if (balance <= 0) return; // skip zero-balance entries

        const cardType = card.type || 'revolving';
        let emi = 0;
        if (cardType === 'emi') {
            emi = Number(card.emi_amount) || Math.round(balance * 0.03);
        } else if (cardType === 'revolving') {
            emi = Math.round(balance * 0.03);
        }

        items.push({
            type: card.name ? `Credit Card (${card.name})` : 'Credit Card',
            category: 'Bad',
            outstanding: balance,
            emi,
            interestRate: cardType === 'revolving' ? 36 : (cardType === 'emi' ? 18 : 0),
            remainingTenure: 0,
            ccType: cardType
        });
    });

    // Sum up
    let goodOutstanding = 0, goodEmiSum = 0;
    let badOutstanding = 0, badEmiSum = 0;
    let totalEmi = 0;

    items.forEach(item => {
        totalEmi += item.emi;
        if (item.category === 'Good') {
            goodOutstanding += item.outstanding;
            goodEmiSum += item.emi;
        } else {
            badOutstanding += item.outstanding;
            badEmiSum += item.emi;
        }
    });

    const totalOutstanding = items.reduce((s, i) => s + i.outstanding, 0);
    const grossMonthly = (Number(p.annual_salary) || 0) / 12;
    const emiBurdenRatio = grossMonthly ? (totalEmi / grossMonthly * 100).toFixed(2) : 0;

    // Compute credit card sub-totals by repayment type for use in FBS fragility logic
    const ccItems = items.filter(i => i.ccType);
    const revolvingBalance = ccItems.filter(i => i.ccType === 'revolving').reduce((s, c) => s + c.outstanding, 0);
    const emiCCBalance     = ccItems.filter(i => i.ccType === 'emi').reduce((s, c) => s + c.outstanding, 0);
    const fullBalance      = ccItems.filter(i => i.ccType === 'full').reduce((s, c) => s + c.outstanding, 0);

    return {
        hasLiabilities: totalOutstanding > 0,
        total: totalOutstanding,
        totalEmi,
        items,
        // creditCardOutstanding: total CC balance alias used by dashboard panels
        creditCardOutstanding: revolvingBalance + emiCCBalance + fullBalance,
        // creditCards: per-type breakdowns for FBS fragility multiplier logic
        creditCards: { revolvingBalance, emiCCBalance, fullBalance },
        goodLiability: { outstanding: goodOutstanding, emi: goodEmiSum },
        badLiability: { outstanding: badOutstanding, emi: badEmiSum },
        emiBurdenRatio,
        creditScore: Number(p.credit_score) || 0,
        idealRanges: {
            goodOutstanding: { min: 200000, max: 500000 },
            goodEmi: { min: 1900, max: 4700 },
            badOutstanding: { min: 0, max: 21400 },
            badEmi: { min: 0, max: 469 }
        }
    };
}

// ============ INSURANCE ============
function computeInsurance(p) {
    const healthCover = Number(p.health_cover) || 0;
    const lifeCover = Number(p.life_cover) || 0;

    // Fallbacks if user hasn't moved to the new annual insurance field yet
    const legacyHealthPrem = Number(p.health_premium) || 0;
    const legacyLifePrem = Number(p.life_premium) || 0;
    const combinedLegacy = legacyHealthPrem + legacyLifePrem;

    const totalPremium = Number(p.expense_annual_insurance) || combinedLegacy || 0;
    const healthPercent = healthCover && lifeCover ? (healthCover / (healthCover + lifeCover)) : (healthCover ? 1 : 0);
    const healthPremium = totalPremium * healthPercent;
    const lifePremium = totalPremium * (1 - healthPercent);

    const totalCover = healthCover + lifeCover;
    const annualIncome = (Number(p.annual_salary) || 0) + (Number(p.business_income) || 0)
        + (Number(p.annual_bonus) || 0) + (Number(p.other_income) || 0);

    // 4-tier ideal per fbs_calculation.md (proportionally fair, not regressive formula)
    let idealHealth;
    if (annualIncome < 500000) idealHealth = 300000;
    else if (annualIncome < 1500000) idealHealth = 500000;
    else if (annualIncome < 3000000) idealHealth = 1000000;
    else idealHealth = 1500000;

    const hasDependents = (Number(p.dependents) || 0) > 0 || p.marital_status === 'Married';
    const rawIdealLife = hasDependents ? annualIncome * 10 : 0;
    // Round to nearest ₹25L per spec
    const idealLife = rawIdealLife > 0 ? Math.ceil(rawIdealLife / 2500000) * 2500000 : 0;

    return {
        healthCover, healthPremium, lifeCover, lifePremium,
        totalCover,
        healthPercent: totalCover ? Math.round(healthCover / totalCover * 100) : 0,
        lifePercent: totalCover ? Math.round(lifeCover / totalCover * 100) : 0,
        idealHealth, idealLife,
        isAdequatelyInsured: healthCover >= idealHealth && lifeCover >= idealLife,
        idealTermCover: idealLife,
        additionalCoverNeeded: Math.max(0, idealLife - lifeCover)
    };
}

// ============ TAX ============
function computeTax(p) {
    const gross = Number(p.annual_salary) || 0;
    const business = Number(p.business_income) || 0;
    const bonus = Number(p.annual_bonus) || 0;
    const other = Number(p.other_income) || 0;
    const totalIncome = gross + business + bonus + other;

    // Old Regime
    const old80c = Math.min(Number(p.tax_80c_used) || 0, 150000);
    const old80d = Math.min(Number(p.tax_80d) || 0, 75000);
    const oldHra = Number(p.tax_hra) || 0;
    const oldHomeLoan = Math.min(Number(p.tax_home_loan_interest) || 0, 200000);
    const old80ccd = Math.min(Number(p.tax_nps_80ccd) || 0, 50000);
    const oldStdDeduction = 50000;
    const oldTotalDeductions = old80c + old80d + oldHra + oldHomeLoan + old80ccd;
    const oldTaxableIncome = Math.max(0, totalIncome - oldStdDeduction - oldTotalDeductions);

    function oldRegimeTax(taxable) {
        let tax = 0;
        if (taxable > 1000000) tax += (taxable - 1000000) * 0.30;
        if (taxable > 500000) tax += Math.min(taxable - 500000, 500000) * 0.20;
        if (taxable > 250000) tax += Math.min(taxable - 250000, 250000) * 0.05;
        // Rebate u/s 87A
        if (taxable <= 500000) tax = 0;
        // Cess 4%
        tax = tax * 1.04;
        return Math.round(tax);
    }

    // New Regime (FY 2025-26)
    const newStdDeduction = 75000;
    const newTaxableIncome = Math.max(0, totalIncome - newStdDeduction);

    function newRegimeTax(taxable) {
        let tax = 0;
        if (taxable > 1500000) tax += (taxable - 1500000) * 0.30;
        if (taxable > 1200000) tax += Math.min(taxable - 1200000, 300000) * 0.20;
        if (taxable > 1000000) tax += Math.min(taxable - 1000000, 200000) * 0.15;
        if (taxable > 700000) tax += Math.min(taxable - 700000, 300000) * 0.10;
        if (taxable > 300000) tax += Math.min(taxable - 300000, 400000) * 0.05;
        // Rebate u/s 87A for new regime
        if (taxable <= 700000) tax = 0;
        tax = tax * 1.04;
        return Math.round(tax);
    }

    const oldTax = oldRegimeTax(oldTaxableIncome);
    const newTax = newRegimeTax(newTaxableIncome);
    const recommended = newTax <= oldTax ? 'New Regime' : 'Old Regime';

    // NPS employer contribution potential savings
    const basicSalary = totalIncome * 0.4; // Assume 40% is basic
    const npsMax = basicSalary * 0.1;
    const npsCurrentUtilization = Number(p.tax_nps_80ccd) || 0;
    const npsSuggested = Math.round(npsMax);
    const potentialSavings = Math.abs(oldTax - newTax);

    return {
        totalIncome,
        salaryIncome: gross,
        businessIncome: business,
        bonusIncome: bonus,
        otherIncome: other,
        oldRegime: {
            grossIncome: totalIncome,
            standardDeduction: oldStdDeduction,
            deductions: oldTotalDeductions,
            taxableIncome: oldTaxableIncome,
            taxLiability: oldTax,
            effectiveRate: totalIncome ? parseFloat((oldTax / totalIncome * 100).toFixed(2)) : 0
        },
        newRegime: {
            grossIncome: totalIncome,
            standardDeduction: newStdDeduction,
            deductions: 0,
            taxableIncome: newTaxableIncome,
            taxLiability: newTax,
            effectiveRate: totalIncome ? parseFloat((newTax / totalIncome * 100).toFixed(2)) : 0
        },
        recommended,
        potentialSavings: Math.max(oldTax, newTax) - Math.min(oldTax, newTax),
        nps: {
            maxDeduction: { oldRegime: 68400, newRegime: Math.round(npsMax) },
            currentValue: npsCurrentUtilization,
            suggested: npsSuggested,
            additionalInvestment: Math.max(0, npsSuggested - npsCurrentUtilization)
        },
        deductionUtilization: [
            { name: 'Section 80C', section: '80C', limit: 150000, used: old80c, gap: 150000 - old80c },
            { name: 'NPS 80CCD(1B)', section: '80CCD(1B)', limit: 50000, used: old80ccd, gap: 50000 - old80ccd },
            { name: 'Health Insurance 80D', section: '80D', limit: 75000, used: old80d, gap: 75000 - old80d },
            { name: 'HRA', section: '10(13A)', limit: 200000, used: oldHra, gap: 200000 - oldHra },
            { name: 'Home Loan Interest', section: '24(b)', limit: 200000, used: oldHomeLoan, gap: 200000 - oldHomeLoan }
        ]
    };
}

// ============ EMERGENCY PLANNING ============
function computeEmergency(p) {
    const expenses = computeExpenses(p);
    const liabilities = computeLiabilities(p);
    const insurance = computeInsurance(p);

    // stableAssets = savings_balance + fd_balance (per fbs_calculation.md)
    const stableAssets = (Number(p.savings_balance) || 0) + (Number(p.fd_balance) || 0);

    // effectiveMonthly = needs + wants (needs includes EMI per spec)
    const needs = expenses.needsExEmi + liabilities.totalEmi;
    const wants = expenses.wantsExEmi;
    const effectiveMonthly = needs + wants;
    const idealEmergency = Math.round(effectiveMonthly * 6);

    return {
        emergencyFunds: { actual: stableAssets, ideal: idealEmergency },
        effectiveMonthly,
        healthInsurance: { actual: insurance.healthCover, ideal: insurance.idealHealth },
        lifeInsurance: { actual: insurance.lifeCover, ideal: insurance.idealLife }
    };
}

// ============ NET WORTH & SURPLUS ============
function computeNetWorth(p) {
    const assets = computeAssets(p);
    const liabilities = computeLiabilities(p);
    return {
        assets: assets.total,
        liabilities: liabilities.total,
        netWorth: assets.total - liabilities.total
    };
}

function computeSurplus(p) {
    const income = computeIncome(p);
    const expenses = computeExpenses(p);
    const liabilities = computeLiabilities(p);
    const emi = liabilities.totalEmi || 0;

    // Use strictly monthly income (ignoring bonus and other incomes)
    const monthlyIncome = Number(p.monthly_take_home) || ((income.salaried + income.business) / 12);

    // We use effectiveMonthly here (Monthly + Prorated Annual) so that true investable surplus is accurate
    // Both general SIP and goal SIPs are deducted so surplus reflects actual free cash after all committed investments
    const goals = Array.isArray(p.goals) ? p.goals : [];
    const goalSipTotal = goals.reduce((s, g) => s + (Number(g.monthly_sip) || 0), 0);
    const sip = Number(p.inv_monthly_sip) || 0;
    const monthly = monthlyIncome - expenses.effectiveMonthly - emi - sip - goalSipTotal;
    return { monthly, quarterly: monthly * 3 };
}

// ============ CASHFLOW (Next 3 Months) ============
function computeCashflow(p) {
    const income = computeIncome(p);
    const expenses = computeExpenses(p);
    const liabilities = computeLiabilities(p);
    const emi = liabilities.totalEmi || 0;
    const goalSipArr = Array.isArray(p.goals) ? p.goals : [];
    const goalSipTotal = goalSipArr.reduce((s, g) => s + (Number(g.monthly_sip) || 0), 0);
    const sip = (Number(p.inv_monthly_sip) || 0) + goalSipTotal;
    const insurancePremium = Number(p.expense_annual_insurance) || ((Number(p.health_premium) || 0) + (Number(p.life_premium) || 0));

    // Use strictly monthly income (ignoring bonus and other incomes)
    const monthlyIncome = Number(p.monthly_take_home) || ((income.salaried + income.business) / 12);
    const grossIncome3m = monthlyIncome * 3;
    const bonus3m = (income.bonus || 0) / 4;

    // Use true monthly expenses for cashflow projection, and annuals are projected separately
    const expenses3m = expenses.totalMonthly * 3;
    const emi3m = emi * 3;
    const sip3m = sip * 3;
    const insurance3m = insurancePremium / 4;
    const otherAnnual3m = (expenses.totalAnnualOnly - insurancePremium) / 4;
    // If user entered monthly take-home, income is already post-tax — do not deduct tax again
    const hasTakeHome = Number(p.monthly_take_home) > 0;
    const taxEstimate = computeTax(p);
    const tax3m = hasTakeHome ? 0 : Math.min(taxEstimate.newRegime.taxLiability, taxEstimate.oldRegime.taxLiability) / 4;

    // Do not add bonus3m to surplus
    const surplus = grossIncome3m - expenses3m - emi3m - sip3m - insurance3m - otherAnnual3m - tax3m;

    const items = [
        { name: 'Bonus Income', type: 'credit', amount: bonus3m },
        { name: 'Gross Income', type: 'credit', amount: grossIncome3m },
        { name: 'Monthly Living Expenses', type: 'debit', amount: expenses3m },
        { name: 'EMIs', type: 'debit', amount: emi3m },
        { name: 'Planned Investments', type: 'debit', amount: sip3m },
        { name: 'Insurance Premium Allocation', type: 'debit', amount: insurance3m },
        { name: 'Other Annual Bills Allocation', type: 'debit', amount: otherAnnual3m },
    ];
    // Only show tax row when income is pre-tax (no take-home entered)
    if (!hasTakeHome && tax3m > 0) {
        items.splice(3, 0, { name: 'Tax Expenses (estimated)', type: 'debit', amount: tax3m });
    }

    return { items, surplus };
}

// ============ FINANCIAL BEHAVIOUR SCORE ============
function computeFBS(p) {
    const assets = computeAssets(p);
    const insurance = computeInsurance(p);
    const liabilities = computeLiabilities(p);
    const income = computeIncome(p);
    const expenses = computeExpenses(p);
    const tax = computeTax(p);
    const monthlyIncome = Number(p.monthly_take_home) || ((income.salaried + income.business) / 12);

    // ─── FIXED BASE WEIGHTS (fbs_calculation.md) ───
    // 10 dimensions: emergencyFund(15), healthInsurance(12), lifeInsurance(8),
    // liabilityManagement(12), investmentRegularity(15), goalClarity(10),
    // behavioralTendencies(10), taxLiteracy(8), assetDiversity(5), portfolioUnderstanding(5)
    const w = {
        emergencyFund: 15,
        healthInsurance: 12,
        lifeInsurance: 8,
        liabilityManagement: 12,
        investmentRegularity: 15,
        goalClarity: 10,
        behavioralTendencies: 10,
        taxLiteracy: 8,
        assetDiversity: 5,
        portfolioUnderstanding: 5,
    };

    const incomeTotal = income.total;
    const age = getAge(p.date_of_birth);

    // ─── SITUATIONAL WEIGHT ADJUSTMENTS ───

    // Rule 1: No dependents — life insurance weight = 0, moves to health insurance
    const hasDependents = (Number(p.dependents) || 0) > 0 || p.marital_status === 'Married';
    if (!hasDependents) {
        w.healthInsurance += w.lifeInsurance;
        w.lifeInsurance = 0;
    }

    // Rule 2: Income level caps tax literacy
    let taxWeightTransfer = 0;
    if (incomeTotal === 0) {
        taxWeightTransfer = w.taxLiteracy;
        w.taxLiteracy = 0;
    } else if (incomeTotal < 500000) {
        taxWeightTransfer = w.taxLiteracy - 2;
        w.taxLiteracy = 2;
    } else if (incomeTotal < 1000000) {
        taxWeightTransfer = w.taxLiteracy - 5;
        w.taxLiteracy = 5;
    }
    w.investmentRegularity += taxWeightTransfer;

    // Rule 3: Small portfolio reduces asset diversity weight
    let diversityWeightTransfer = 0;
    if (assets.total < 100000) {
        diversityWeightTransfer = w.assetDiversity;
        w.assetDiversity = 0;
    } else if (assets.total < 500000) {
        diversityWeightTransfer = w.assetDiversity - 2;
        w.assetDiversity = 2;
    }
    w.investmentRegularity += diversityWeightTransfer;

    // ─── DIMENSION 1: Emergency Fund ───
    // stableAssets = savings_balance + fd_balance (no dedicated emergency_fund field in new spec)
    const stableAssets = (Number(p.savings_balance) || 0) + (Number(p.fd_balance) || 0);
    // effectiveMonthly = needs + wants (includes EMI via liabilities)
    const needs = expenses.needsExEmi + liabilities.totalEmi;
    const wants = expenses.wantsExEmi;
    const effectiveMonthly = needs + wants;
    const ideal6m = effectiveMonthly * 6;
    const emRatio = ideal6m > 0 ? stableAssets / ideal6m : 0;

    let emergencyFundRaw;
    if (emRatio >= 1.0) emergencyFundRaw = 10;
    else if (emRatio >= 0.75) emergencyFundRaw = 8;
    else if (emRatio >= 0.50) emergencyFundRaw = 6;
    else if (emRatio >= 0.25) emergencyFundRaw = 4;
    else if (emRatio > 0) emergencyFundRaw = 2;
    else emergencyFundRaw = 0;

    const scaledEmergencyFund = Math.round((emergencyFundRaw / 10) * w.emergencyFund);

    // ─── DIMENSION 2: Health Insurance ───
    const healthCover = insurance.healthCover;
    const idealHealth = insurance.idealHealth;
    const healthRatio = idealHealth > 0 ? healthCover / idealHealth : 0;
    let healthRaw;
    if (healthRatio === 0) healthRaw = 0;
    else if (healthRatio < 0.50) healthRaw = 3;
    else if (healthRatio < 0.80) healthRaw = 6;
    else if (healthRatio < 1.0) healthRaw = 8;
    else healthRaw = 10;

    const scaledHealthInsurance = Math.round((healthRaw / 10) * w.healthInsurance);

    // ─── DIMENSION 3: Life Insurance ───
    let scaledLifeInsurance = 0;
    if (!hasDependents) {
        scaledLifeInsurance = 0; // weight is 0, score irrelevant
    } else {
        const lifeCover = insurance.lifeCover;
        const idealLife = insurance.idealLife;
        const lifeRatio = idealLife > 0 ? lifeCover / idealLife : 0;
        let lifeRaw;
        if (lifeRatio === 0) lifeRaw = 0;
        else if (lifeRatio < 0.50) lifeRaw = 3;
        else if (lifeRatio < 0.80) lifeRaw = 6;
        else if (lifeRatio < 1.0) lifeRaw = 8;
        else lifeRaw = 10;
        scaledLifeInsurance = Math.round((lifeRaw / 10) * w.lifeInsurance);
    }

    // ─── DIMENSION 4: Liability Management ───
    const liquidAssets = assets.total - (assets.realEstate || 0);
    const badOutstanding = liabilities.badLiability.outstanding;
    const goodOutstanding = liabilities.goodLiability.outstanding;
    const cushionRatio = badOutstanding > 0 ? liquidAssets / badOutstanding : Infinity;
    const goodEmiRatio = monthlyIncome > 0
        ? liabilities.goodLiability.emi / monthlyIncome
        : (liabilities.goodLiability.emi > 0 ? 1 : 0);
    const badEmiRatio = monthlyIncome > 0
        ? liabilities.badLiability.emi / monthlyIncome
        : (liabilities.badLiability.emi > 0 ? 1 : 0);

    let goodDebtComponent;
    if (goodOutstanding === 0) goodDebtComponent = 5;
    else if (goodEmiRatio <= 0.35) goodDebtComponent = 5;
    else if (goodEmiRatio <= 0.45) goodDebtComponent = 3;
    else goodDebtComponent = 1;

    let badDebtComponent;
    if (badOutstanding === 0) {
        badDebtComponent = 5;
    } else if (badEmiRatio < 0.10 && cushionRatio >= 3) {
        badDebtComponent = 4;
    } else if (badEmiRatio < 0.10 && cushionRatio >= 1) {
        badDebtComponent = 3;
    } else if (badEmiRatio <= 0.20 && cushionRatio >= 2) {
        badDebtComponent = 2;
    } else {
        badDebtComponent = 0;
    }

    const liabilityRaw = goodDebtComponent + badDebtComponent;
    const scaledLiabilities = Math.round((liabilityRaw / 10) * w.liabilityManagement);

    // ─── DIMENSION 5: Investment Regularity ───
    const goals = Array.isArray(p.goals) ? p.goals : [];
    const goalSipTotal = goals.reduce((s, g) => s + (Number(g.monthly_sip) || 0), 0);
    const generalSip = Number(p.inv_monthly_sip) || 0;
    const totalSip = goalSipTotal + generalSip;

    const couldSave = monthlyIncome - effectiveMonthly;
    const savingsRate = monthlyIncome > 0 ? totalSip / monthlyIncome : 0;

    const incomeType = p.income_type || (
        ['Freelance', 'Self-Employed', 'Contract'].includes(p.employment_type) ? 'irregular' : 'regular'
    );

    let utilizationRate = 0;
    if (couldSave > 0) {
        if (incomeType === 'irregular') {
            const allowedBuffer = effectiveMonthly * 3;
            utilizationRate = couldSave > allowedBuffer
                ? totalSip / (couldSave - allowedBuffer)
                : 1;
        } else {
            utilizationRate = totalSip / couldSave;
        }
    }

    const couldSavePct = monthlyIncome > 0 ? couldSave / monthlyIncome : 0;

    let investmentRegularityRaw;
    if (couldSave <= 0) {
        investmentRegularityRaw = 0;
    } else if (totalSip === 0 && couldSave > 0) {
        investmentRegularityRaw = 0;
    } else if (savingsRate >= 0.20 && utilizationRate >= 0.80) {
        investmentRegularityRaw = 10;
    } else if (savingsRate >= 0.20 && utilizationRate >= 0.50) {
        investmentRegularityRaw = 8;
    } else if (savingsRate >= 0.15 && utilizationRate >= 0.80) {
        investmentRegularityRaw = 7;
    } else if (savingsRate >= 0.10 && utilizationRate >= 0.50) {
        investmentRegularityRaw = 6;
    } else if (savingsRate >= 0.10 && utilizationRate < 0.50) {
        investmentRegularityRaw = 4;
    } else if (savingsRate < 0.10 && couldSavePct < 0.10) {
        investmentRegularityRaw = 3;
    } else if (savingsRate < 0.10 && couldSavePct >= 0.20) {
        investmentRegularityRaw = 1;
    } else {
        investmentRegularityRaw = 2;
    }

    const sipMonths = Number(p.sip_consecutive_months) || 0;
    let sipMultiplier = 1.0;
    if (sipMonths < 3) sipMultiplier = 0.8;
    else if (sipMonths < 6) sipMultiplier = 0.9;

    investmentRegularityRaw = Math.round(investmentRegularityRaw * sipMultiplier);
    const scaledInvestmentRegularity = Math.round((investmentRegularityRaw / 10) * w.investmentRegularity);

    // ─── DIMENSION 6: Goal Clarity ───
    let goalClarityRaw = 0;

    const timedGoals = goals.filter(g => Number(g.years) > 0);
    let componentA = 0;
    if (goals.length === 0) componentA = 0;
    else if (timedGoals.length === 0) componentA = 1;
    else if (timedGoals.length === 1) componentA = 3;
    else componentA = 5;

    let componentB = 0;
    const INFLATION_RATE = 0.06;
    const DEFAULT_MONTHLY_R = 0.01;
    const goalsWithTargets = timedGoals.filter(g => Number(g.target) > 0);
    if (goalsWithTargets.length > 0) {
        const goalScores = goalsWithTargets.map(g => {
            const target = Number(g.target) || 0;
            const years = Number(g.years);
            const annualRate = g.equity_return ? (Number(g.equity_return) / 100) : null;
            const r = annualRate ? Math.pow(1 + annualRate, 1 / 12) - 1 : DEFAULT_MONTHLY_R;
            const n = years * 12;
            const inflAdj = target * Math.pow(1 + INFLATION_RATE, years);
            const reqSip = r > 0 ? (inflAdj * r) / (Math.pow(1 + r, n) - 1) : inflAdj / n;
            const actualSip = Number(g.monthly_sip) || 0;
            return Math.min(5, reqSip > 0 ? (actualSip / reqSip) * 5 : (actualSip > 0 ? 5 : 0));
        });
        componentB = goalScores.reduce((s, v) => s + v, 0) / goalScores.length;
    } else if (goals.length > 0 && timedGoals.length === 0) {
        componentB = 0;
    } else if (goals.length > 0) {
        const savingGoals = goals.filter(g => (Number(g.monthly_sip) || 0) > 0 || g.is_saving === 'regular' || g.is_saving === 'irregular');
        componentB = savingGoals.length > 0 ? 1 : 0;
    }

    goalClarityRaw = componentA + componentB;
    const scaledGoalClarity = Math.round((Math.min(goalClarityRaw, 10) / 10) * w.goalClarity);

    // ─── DIMENSION 7: Behavioral Tendencies ───
    // Positive factors (1–5, higher = better) — missing defaults to 3 neutral
    const bReview = Number(p.beh_review_monthly) || 3;
    const bAvoidDebt = Number(p.beh_avoid_debt) || 3;
    const bMarketReaction = Number(p.beh_market_reaction) || 3;
    const bWindfall = Number(p.beh_windfall_behaviour) || 3;
    // Negative factors (1–5, higher = worse, inverted as 6 − value) — beh_product_understanding excluded
    const bDelay = 6 - (Number(p.beh_delay_decisions) || 3);
    const bImpulse = 6 - (Number(p.beh_spend_impulsively) || 3);
    const bHoldLosing = 6 - (Number(p.beh_hold_losing) || 3);
    const bComparePeers = 6 - (Number(p.beh_compare_peers) || 3);

    const behavRawTotal = bReview + bAvoidDebt + bMarketReaction + bWindfall
        + bDelay + bImpulse + bHoldLosing + bComparePeers;
    const behavioralTendenciesRaw = Math.round((behavRawTotal / 40) * 10);
    const scaledBehavioral = Math.round((behavioralTendenciesRaw / 10) * w.behavioralTendencies);

    // ─── DIMENSION 8: Tax Literacy ───
    let taxScoreRaw = 0;
    if (incomeTotal > 0) {
        const optedRegime = p.tax_regime || 'New Regime';
        const hasAnyDeduction = (Number(p.tax_80c_used) || 0) > 0
            || (Number(p.tax_nps_80ccd) || 0) > 0
            || (Number(p.tax_hra) || 0) > 0
            || (Number(p.tax_home_loan_interest) || 0) > 0
            || (Number(p.tax_80d) || 0) > 0;

        if (tax.recommended === optedRegime && hasAnyDeduction) taxScoreRaw = 10;
        else if (tax.recommended === optedRegime) taxScoreRaw = 6;
        else if (tax.potentialSavings <= 5000) taxScoreRaw = 4;
        else taxScoreRaw = 0;
    }
    const scaledTax = Math.round((taxScoreRaw / 10) * w.taxLiteracy);

    // ─── DIMENSION 9: Asset Diversity ───
    let assetDiversityRaw = 0;
    if (assets.total > 0 && w.assetDiversity > 0) {
        const hasShortHorizonGoal = goals.some(g => Number(g.years) > 0 && Number(g.years) <= 4);
        const idealRanges = getIdealAllocRanges(age, hasShortHorizonGoal);
        const alloc = assets.allocation;
        const dev = (actual, [min, max]) => actual >= min && actual <= max ? 0 : (actual < min ? min - actual : actual - max);
        const totalDev = dev(alloc.equity, idealRanges.equity)
            + dev(alloc.debt, idealRanges.debt)
            + dev(alloc.commodity, idealRanges.commodity)
            + dev(alloc.altInvestments, idealRanges.alt)
            + dev(alloc.realEstate, idealRanges.realEstate);

        if (totalDev === 0) assetDiversityRaw = 10;
        else if (totalDev <= 10) assetDiversityRaw = 8;
        else if (totalDev <= 25) assetDiversityRaw = 6;
        else if (totalDev <= 40) assetDiversityRaw = 4;
        else if (totalDev <= 60) assetDiversityRaw = 2;
        else assetDiversityRaw = 0;
    }
    const scaledDiversity = Math.round((assetDiversityRaw / 10) * w.assetDiversity);

    // ─── DIMENSION 10: Portfolio Understanding ───
    const puVal = Number(p.beh_product_understanding) || 0;
    let portfolioUnderstandingRaw = 0;
    if (puVal === 5) portfolioUnderstandingRaw = 10;
    else if (puVal === 4) portfolioUnderstandingRaw = 8;
    else if (puVal === 3) portfolioUnderstandingRaw = 6;
    else if (puVal === 2) portfolioUnderstandingRaw = 3;
    else if (puVal === 1) portfolioUnderstandingRaw = 1;
    const scaledPortfolio = Math.round((portfolioUnderstandingRaw / 10) * w.portfolioUnderstanding);

    // ─── FRAGILITY PENALTIES ───
    const zeroEmergency = stableAssets === 0;
    const zeroInsurance = insurance.healthCover === 0 && insurance.lifeCover === 0;
    const highBadDebt = badOutstanding > 0
        && cushionRatio < 2
        && (monthlyIncome === 0 || badOutstanding >= monthlyIncome * 2);

    const { revolvingBalance = 0 } = liabilities.creditCards || {};

    // Linear revolving CC penalty (no cliff floor())
    const revolvingPenalty = monthlyIncome > 0
        ? Math.min(10, parseFloat((revolvingBalance / monthlyIncome * 3).toFixed(1)))
        : (revolvingBalance > 0 ? Math.min(10, parseFloat((revolvingBalance / 50000 * 3).toFixed(1))) : 0);

    let fragilityPenalty = 0;
    let flags = [];
    if (zeroEmergency && zeroInsurance && highBadDebt) {
        fragilityPenalty = 15; flags = ['critical_triple_gap'];
    } else if (zeroEmergency && zeroInsurance) {
        fragilityPenalty = 8; flags = ['no_emergency_no_insurance'];
    } else if (zeroEmergency && highBadDebt) {
        fragilityPenalty = 6; flags = ['no_emergency_high_debt'];
    } else if (zeroInsurance && highBadDebt) {
        fragilityPenalty = 5; flags = ['no_insurance_high_debt'];
    }

    // New earner carve-out: cap combination penalty at -5 if months_employed < 12
    const monthsEmployed = p.months_employed != null ? Number(p.months_employed) : null;
    if (monthsEmployed !== null && monthsEmployed < 12 && fragilityPenalty > 5) {
        fragilityPenalty = 5;
    }

    const penalty = revolvingPenalty + fragilityPenalty;

    // ─── TOTALS ───
    const insuranceScore = scaledHealthInsurance + scaledLifeInsurance;
    const foundation = scaledEmergencyFund + insuranceScore + scaledLiabilities;
    const behaviour = scaledInvestmentRegularity + scaledGoalClarity + scaledBehavioral;
    const awareness = scaledPortfolio + scaledTax + scaledDiversity;
    const rawTotal = foundation + behaviour + awareness;
    const totalScore = Math.min(100, Math.max(0, rawTotal - penalty));

    const breakdown = {
        emergencyFund: scaledEmergencyFund,
        healthInsurance: scaledHealthInsurance,
        lifeInsurance: scaledLifeInsurance,
        insurance: insuranceScore,
        liabilities: scaledLiabilities,
        investmentRegularity: scaledInvestmentRegularity,
        goalClarity: scaledGoalClarity,
        behavioralTendencies: scaledBehavioral,
        behavior: scaledBehavioral,
        portfolioUnderstanding: scaledPortfolio,
        tax: scaledTax,
        assetDiversity: scaledDiversity,
    };

    const fbsLifeStage = getFBSLifeStage(age);

    return {
        total: totalScore,
        breakdown,
        subScores: {
            foundation: { score: foundation, max: w.emergencyFund + w.healthInsurance + w.lifeInsurance + w.liabilityManagement },
            behaviour: { score: behaviour, max: w.investmentRegularity + w.goalClarity + w.behavioralTendencies },
            awareness: { score: awareness, max: w.portfolioUnderstanding + w.taxLiteracy + w.assetDiversity },
        },
        fragility: {
            penalty,
            fragilityPenalty,
            revolvingPenalty,
            flags,
        },
        lifeStage: fbsLifeStage,
        appliedWeights: w,
        _age: age,
        _taxInfo: { recommended: tax.recommended, potentialSavings: tax.potentialSavings },
        _effectiveMonthly: effectiveMonthly,
        _couldSave: couldSave,
        _totalSip: totalSip,
        _stableAssets: stableAssets,
        _totalAssets: assets.total,
    };
}

// ============ MONEY SIGN ============
function computeMoneySign(p) {
    const risk = Number(p.risk_comfort) || 5; // 1-10
    const prefGuaranteed = Number(p.beh_prefer_guaranteed) || 3; // 1-5
    const followNews = Number(p.beh_follow_market_news) || 3; // 1-5
    const avoidDebt = Number(p.beh_avoid_debt) || 3; // 1-5
    const holdLosing = Number(p.beh_hold_losing) || 3; // 1-5
    const impulsive = Number(p.beh_spend_impulsively) || 3; // 1-5
    const review = Number(p.beh_review_monthly) || 3; // 1-5

    // Core dimensions (Out of 10)
    const activeRiskTaking = (risk / 10 * 5) + (6 - prefGuaranteed);
    const emotionalControl = (6 - impulsive) + holdLosing;
    const engagement = review + followNews;

    if (activeRiskTaking >= 8 && engagement >= 8) {
        return { name: 'Bold Eagle', icon: '🦅', desc: 'Highly aggressive and engaged. You hunt for high growth opportunities and actively manage risks.' };
    }
    if (emotionalControl >= 8 && activeRiskTaking <= 4) {
        return { name: 'Cautious Turtle', icon: '🐢', desc: 'Safety-first mindset. You prioritize wealth preservation and guaranteed returns over market-beating growth.' };
    }
    if (emotionalControl >= 7 && activeRiskTaking >= 6 && engagement <= 6) {
        return { name: 'Persistent Horse', icon: '🐎', desc: 'Steady and methodical. You set a solid long-term strategy and stick to it without over-monitoring.' };
    }
    if (engagement >= 8 && emotionalControl <= 5) {
        return { name: 'Curious Fox', icon: '🦊', desc: 'Highly active and experimental. You constantly look for the next trend but may suffer from over-trading.' };
    }
    if (emotionalControl >= 8 && engagement >= 7) {
        return { name: 'Strategic Owl', icon: '🦉', desc: 'Wise and highly disciplined. You analyze thoroughly and maintain strong emotional control during volatility.' };
    }
    if (activeRiskTaking <= 5 && emotionalControl >= 6) {
        return { name: 'Loyal Elephant', icon: '🐘', desc: 'Patient and risk-averse. You stick to what you know, relying heavily on established brands and conservative assets.' };
    }

    return { name: 'Balanced Dolphin', icon: '🐬', desc: 'Adaptive and balanced. You maintain a healthy mix of growth-seeking and wealth-preserving behaviors.' };
}

// ============ BEHAVIORAL BIASES ============
function computeBiases(p) {
    const biases = [];
    if ((Number(p.beh_prefer_guaranteed) || 3) >= 4) biases.push({ name: 'Status Quo Bias', desc: 'Tendency to stick with existing choices even when better options exist' });
    if ((Number(p.beh_hold_losing) || 3) >= 4) biases.push({ name: 'Endowment Bias', desc: 'Overvaluing assets you already own' });
    if ((Number(p.beh_delay_decisions) || 3) >= 4 || (Number(p.beh_anxious_decisions) || 3) >= 4) biases.push({ name: 'Regret-Aversion Bias', desc: 'Avoiding decisions due to fear of making mistakes' });
    if ((Number(p.beh_follow_market_news) || 3) >= 4 || (Number(p.beh_compare_peers) || 3) >= 4) biases.push({ name: 'Herd Mentality', desc: 'Following crowd investment decisions' });
    if ((Number(p.beh_spend_impulsively) || 3) >= 4) biases.push({ name: 'Impulse Bias', desc: 'Making financial decisions on impulse rather than analysis' });
    if ((Number(p.beh_familiar_brands) || 3) >= 4) biases.push({ name: 'Familiarity Bias', desc: 'Preferring investments in known brands or sectors' });

    if (biases.length === 0) biases.push({ name: 'None Detected', desc: 'Your financial behavior appears well-balanced' });
    return biases;
}

// ============ EXPENSE & LIABILITY RATIOS ============
function computeFinancialRatios(p) {
    const income = computeIncome(p);
    const expenses = computeExpenses(p);
    const liabilities = computeLiabilities(p);
    const assets = computeAssets(p);

    const expenseToIncome = expenses.totalAnnual;
    const goodLiabToAssets = liabilities.goodLiability.outstanding;
    const badLiabToAssets = liabilities.badLiability.outstanding;
    const goodEmiToIncome = liabilities.goodLiability.emi * 12;
    const badEmiToIncome = liabilities.badLiability.emi * 12;
    const investmentsToIncome = assets.monthlySip * 12;

    return [
        { name: 'Good Liabilities-to-Total Assets', actual: goodLiabToAssets, idealMin: 200000, idealMax: 500000 },
        { name: 'Bad Liabilities-to-Total Assets', actual: badLiabToAssets, idealMin: 0, idealMax: 21400 },
        { name: 'Expense-to-Income', actual: expenseToIncome, idealMin: 0, idealMax: income.total * 0.45 },
        { name: 'Good Liability Linked EMI-to-Income', actual: goodEmiToIncome, idealMin: income.total * 0.15, idealMax: income.total * 0.40 },
        { name: 'Bad Liability Linked EMI-to-Income', actual: badEmiToIncome, idealMin: 0, idealMax: income.total * 0.05 },
        { name: 'Investments-to-Income', actual: investmentsToIncome, idealMin: income.total * 0.25, idealMax: income.total * 0.65 }
    ];
}

// ============ GENERATION ============
function computeGeneration(p) {
    const q1 = Number(p.gen_q1) || 3;
    const q2 = Number(p.gen_q2) || 3;
    const q3 = Number(p.gen_q3) || 3;
    const q4 = Number(p.gen_q4) || 3;
    const q5 = Number(p.gen_q5) || 3;
    const q6Score = Number(p.gen_q6) || 1; // 1-5 scored on the frontend
    const q7 = Number(p.gen_q7) || 3;
    const q8 = Number(p.gen_q8) || 3;
    const q9 = Number(p.gen_q9) || 3;
    const q10 = Number(p.gen_q10) || 3;

    // Averages for confidence check
    const blockA = (q1 + q2 + q3) / 3;
    const blockB = (q4 + q5 + q6Score) / 3;
    const blockC = (q7 + q8) / 2;
    const blockD = (q9 + q10) / 2;

    let confidence = 'High';
    let confReason = '';

    if (Math.abs(q1 - blockA) > 2 || Math.abs(q2 - blockA) > 2 || Math.abs(q3 - blockA) > 2) {
        confidence = 'Low'; confReason = 'Inconsistent answers regarding childhood financial environment.';
    } else if (Math.abs(q4 - blockB) > 2 || Math.abs(q5 - blockB) > 2 || Math.abs(q6Score - blockB) > 2) {
        confidence = 'Low'; confReason = 'Inconsistent answers regarding direct parental support.';
    } else if (Math.abs(q7 - blockC) > 2 || Math.abs(q8 - blockC) > 2) {
        confidence = 'Low'; confReason = 'Inconsistent answers regarding grandparental wealth.';
    } else if (Math.abs(q9 - blockD) > 2 || Math.abs(q10 - blockD) > 2) {
        confidence = 'Low'; confReason = 'Inconsistent answers regarding your current safety net.';
    }

    // Step 1 & 2: Weighted Score
    let score = (q1 * 1.5) + (q2 * 1.0) + (q3 * 1.2) + (q4 * 1.2) + (q5 * 1.5) +
        (q6Score * 1.0) + (q7 * 1.3) + (q8 * 1.3) + (q9 * 1.0) + (q10 * 1.2);

    const overrides = [];
    if (q7 === 1 && q8 === 1) {
        score -= 3;
        overrides.push("Score adjusted downwards due to historical familial hardship.");
    }

    // Step 3: Base Classification
    let genLevel = 2;
    let label = 'Inheritor of Stability';
    let summary = 'You grew up financially secure with educational advantages and modest inherited assets. Your family provides a meaningful safety net, allowing you to take calculated financial risks without fear of complete ruin.';

    if (score <= 20) {
        genLevel = 0; label = 'Ground Breaker';
        summary = 'You are the first in your family to achieve financial stability. You built your foundation entirely from scratch with no inheritance or safety net to fall back on. Your financial achievements are entirely self-driven.';
    } else if (score <= 30) {
        genLevel = 1; label = 'Foundation Builder';
        summary = 'Your parents created modest stability but passed down little wealth. You started adulthood with minimal advantages. You are building the foundation that future generations of your family will rely on.';
    } else if (score <= 40) {
        genLevel = 2; label = 'Inheritor of Stability';
        summary = 'You grew up financially secure with educational advantages and modest inherited assets. Your family provides a meaningful safety net, allowing you to take calculated financial risks without fear of complete ruin.';
    } else if (score <= 52) {
        genLevel = 3; label = 'Established Class';
        summary = 'Wealth exists across three generations in your family. You have significant advantages, likely including real estate, investments, and a very strong safety net that virtually guarantees financial stability.';
    } else {
        genLevel = 4; label = 'Generational Elite';
        summary = 'Your family wealth has been sustained across four or more generations. You likely benefit from trusts, family businesses, and compounding assets. Financial anxiety regarding basic needs is largely absent from your life.';
    }

    // Step 4: Override Rules
    if (q5 === 5 && q8 === 5 && genLevel < 3) {
        genLevel = 3; label = 'Established Class';
        summary = 'Wealth exists across three generations in your family. You have significant advantages, likely including real estate, investments, and a very strong safety net that virtually guarantees financial stability.';
        overrides.push("Elevated to G3 due to significant historical and current wealth transfer.");
    }

    if (q1 === 1 && q9 === 1 && genLevel > 1) {
        genLevel = 1; label = 'Foundation Builder';
        summary = 'Your parents created modest stability but passed down little wealth. You started adulthood with minimal advantages. You are building the foundation that future generations of your family will rely on.';
        overrides.push("Capped at G1 due to lack of childhood financial security and current safety net.");
    }

    if (q6Score >= 4 && q10 === 5) {
        if (genLevel === 0) { genLevel = 1; label = 'Foundation Builder'; }
        else if (genLevel === 1) { genLevel = 2; label = 'Inheritor of Stability'; }
        else if (genLevel === 2) { genLevel = 3; label = 'Established Class'; }
        else if (genLevel === 3) { genLevel = 4; label = 'Generational Elite'; }
        overrides.push("Bumped up one generation level due to substantial active financial support and asset transfer.");
    }

    const categoryText = genLevel === 4 ? 'Generation 4+' : `Generation ${genLevel}`;

    return {
        categoryText,
        label,
        score: score.toFixed(1),
        maxScore: 62,
        confidence,
        confReason,
        summary,
        overrides
    };
}

// ============ FULL DASHBOARD ============
function computeFullDashboard(p, user) {
    const age = getAge(p.date_of_birth);
    const lifeStage = getLifeStage(p.date_of_birth);
    const income = computeIncome(p);
    const expenses = computeExpenses(p);
    const assets = computeAssets(p);
    const liabilities = computeLiabilities(p);
    const insurance = computeInsurance(p);
    const tax = computeTax(p);
    const emergency = computeEmergency(p);
    const netWorth = computeNetWorth(p);
    const surplus = computeSurplus(p);
    const cashflow = computeCashflow(p);
    const fbsObj = computeFBS(p);
    const moneySign = computeMoneySign(p);
    const biases = computeBiases(p);
    const ratios = computeFinancialRatios(p);
    const allocationIdeals = getAssetAllocationIdeals(age, assets.total, moneySign, assets.realEstate);

    const generation = computeGeneration(p);

    return {
        user: { id: user.id, fullName: user.full_name, email: user.email },
        overview: {
            profile: {
                age,
                city: p.city || null,
                employmentType: p.employment_type || null,
                dependents: p.dependents != null ? Number(p.dependents) : null,
                riskComfort: p.risk_comfort != null ? Number(p.risk_comfort) : null,
                investmentExperience: p.investment_experience || null,
            },
            maritalStatus: p.marital_status || null,
            generation,
            lifeStage,
            fbs: fbsObj.total,
            fbsBreakdown: fbsObj.breakdown,
            fbsSubScores: fbsObj.subScores,
            fbsFragility: fbsObj.fragility,
            fbsLifeStage: fbsObj.lifeStage,
            fbsWeights: fbsObj.appliedWeights,
            moneySign,
            biases,
            netWorth,
            surplus,
            creditScore: liabilities.creditScore,
            income,
            expenses,
            liabilities: {
                hasLiabilities: liabilities.hasLiabilities,
                total: liabilities.total,
                goodLiability: liabilities.goodLiability,
                badLiability: liabilities.badLiability,
                items: liabilities.items
            },
            insurance: {
                healthCover: insurance.healthCover,
                lifeCover: insurance.lifeCover,
                healthPremium: insurance.healthPremium,
                lifePremium: insurance.lifePremium,
                healthPercent: insurance.healthPercent,
                lifePercent: insurance.lifePercent
            },
            investments: {
                allocation: assets.allocation,
                numMutualFunds: assets.numMutualFunds,
                mfValue: assets.mfValue,
                total: assets.total
            },
            emergency,
            cashflow
        },
        investments: {
            assets,
            allocationIdeals
        },
        liabilities: {
            ...liabilities,
            ratios
        },
        insurance: {
            ...insurance,
            emergency
        },
        tax
    };
}

module.exports = {
    computeFullDashboard,
    computeIncome, computeExpenses, computeAssets,
    computeLiabilities, computeInsurance, computeTax,
    computeEmergency, computeNetWorth, computeSurplus,
    computeCashflow, computeFBS, computeMoneySign,
    computeBiases, computeFinancialRatios,
    getAssetAllocationIdeals, getLifeStage, getAge
};
