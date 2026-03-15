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

    return {
        totalMonthly: totalMonthlyOnly, // Cash spent strictly monthly
        totalAnnual: totalAnnualCombined,
        totalAnnualOnly,
        effectiveMonthly, // Monthly + Prorated Annual
        fixed: fixedAnnual,
        variable: variableAnnual,
        misc: miscAnnual,
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
    if (p.loans && Array.isArray(p.loans) && p.loans.length > 0) {
        rawLoans = p.loans;
    } else if (p.loans && typeof p.loans === 'string') {
        try { rawLoans = JSON.parse(p.loans); } catch (e) { rawLoans = []; }
    } else if (Number(p.loan_outstanding) > 0) {
        // Legacy fallback for un-migrated data
        rawLoans = [{
            type: p.loan_type || 'Other Loan',
            outstanding: Number(p.loan_outstanding) || 0,
            interestRate: Number(p.loan_interest_rate) || 0,
            emi: Number(p.loan_monthly_emi) || 0,
            tenure: Number(p.loan_remaining_tenure) || 0
        }];
    }

    const creditCardOutstanding = Number(p.credit_card_outstanding) || 0;

    // Build items array
    let items = rawLoans.map(loan => ({
        type: loan.type || 'Other Loan',
        category: goodTypes.includes(loan.type) ? 'Good' : 'Bad',
        outstanding: Number(loan.outstanding) || 0,
        emi: Number(loan.emi) || 0,
        interestRate: Number(loan.interestRate) || 0,
        remainingTenure: Number(loan.tenure) || 0
    }));

    // Add credit card as a bad liability item if > 0
    if (creditCardOutstanding > 0) {
        items.push({
            type: 'Credit Card',
            category: 'Bad',
            outstanding: creditCardOutstanding,
            emi: 0,
            interestRate: 0,
            remainingTenure: 0
        });
    }

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

    return {
        hasLiabilities: totalOutstanding > 0,
        total: totalOutstanding,
        totalEmi,
        items,
        creditCardOutstanding,
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
    const annualIncome = Number(p.annual_salary) || 0;

    const idealHealth = Math.max(500000, annualIncome * 0.5);
    const hasDependents = (Number(p.dependents) || 0) > 0 || p.marital_status === 'Married';
    const rawIdealLife = hasDependents ? annualIncome * 10 : 0;
    const idealLife = rawIdealLife > 0 ? Math.ceil(rawIdealLife / 5000000) * 5000000 : 0;

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
    const actualEmergency = Number(p.emergency_fund) || 0;
    // Uses effectiveMonthly so users don't get caught out by annual bills (insurance, education fees) during an emergency
    const idealEmergency = Math.round(expenses.effectiveMonthly * 6);
    const insurance = computeInsurance(p);

    return {
        emergencyFunds: { actual: actualEmergency, ideal: idealEmergency },
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
    const monthly = monthlyIncome - expenses.effectiveMonthly - emi;
    return { monthly, quarterly: monthly * 3 };
}

// ============ CASHFLOW (Next 3 Months) ============
function computeCashflow(p) {
    const income = computeIncome(p);
    const expenses = computeExpenses(p);
    const liabilities = computeLiabilities(p);
    const emi = liabilities.totalEmi || 0;
    const sip = Number(p.inv_monthly_sip) || 0;
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
    const taxEstimate = computeTax(p);
    const tax3m = Math.min(taxEstimate.newRegime.taxLiability, taxEstimate.oldRegime.taxLiability) / 4;

    // Do not add bonus3m to surplus
    const surplus = grossIncome3m - expenses3m - emi3m - sip3m - insurance3m - otherAnnual3m - tax3m;

    return {
        items: [
            { name: 'Bonus Income', type: 'credit', amount: bonus3m },
            { name: 'Gross Income', type: 'credit', amount: grossIncome3m },
            { name: 'Monthly Living Expenses', type: 'debit', amount: expenses3m },
            { name: 'Tax Expenses', type: 'debit', amount: tax3m },
            { name: 'EMIs', type: 'debit', amount: emi3m },
            { name: 'Planned Investments', type: 'debit', amount: sip3m },
            { name: 'Insurance Premium Allocation', type: 'debit', amount: insurance3m },
            { name: 'Other Annual Bills Allocation', type: 'debit', amount: otherAnnual3m }
        ],
        surplus
    };
}

// ============ FINANCIAL BEHAVIOUR SCORE ============
function computeFBS(p) {
    const assets = computeAssets(p);
    const emergency = computeEmergency(p);
    const insurance = computeInsurance(p);
    const liabilities = computeLiabilities(p);
    const income = computeIncome(p);
    const tax = computeTax(p);
    const monthlyIncome = Number(p.monthly_take_home) || ((income.salaried + income.business) / 12);

    // ─── TIER 1: FOUNDATION - 40 pts ───

    // Emergency Fund - 15 pts
    const emRatio = emergency.emergencyFunds.ideal ? emergency.emergencyFunds.actual / emergency.emergencyFunds.ideal : 0;
    let emergencyFund = 1;
    if (emRatio >= 2.0) emergencyFund = 15;
    else if (emRatio >= 1.0) emergencyFund = 12;
    else if (emRatio >= 0.75) emergencyFund = 9;
    else if (emRatio >= 0.5) emergencyFund = 6;
    else if (emRatio >= 0.25) emergencyFund = 3;

    // Insurance Coverage - 15 pts (health 8 + life 7)
    let healthPts = 2;
    if (insurance.healthCover >= insurance.idealHealth) healthPts = 8;
    else if (insurance.idealHealth > 0 && insurance.healthCover >= insurance.idealHealth * 0.5) healthPts = 5;

    let lifePts = 1;
    if (insurance.idealLife === 0) lifePts = 7; // No dependants = automatic full
    else if (insurance.lifeCover >= insurance.idealLife) lifePts = 7;
    else if (insurance.lifeCover >= insurance.idealLife * 0.5) lifePts = 4;

    const insuranceScore = healthPts + lifePts;

    // Liability Management - 10 pts
    const emiRatio = monthlyIncome > 0 ? liabilities.totalEmi / monthlyIncome : 0;
    let liabilitiesScore = 2;
    if (!liabilities.hasLiabilities) {
        liabilitiesScore = 10;
    } else if (liabilities.badLiability.outstanding === 0 && emiRatio <= 0.4) {
        liabilitiesScore = 10; // Only good debt, manageable EMI
    } else if (liabilities.badLiability.outstanding === 0 && emiRatio > 0.4) {
        liabilitiesScore = 4;  // Only good debt, high EMI
    } else if (liabilities.goodLiability.outstanding > liabilities.badLiability.outstanding && emiRatio <= 0.4) {
        liabilitiesScore = 7;
    } else if (liabilities.goodLiability.outstanding > liabilities.badLiability.outstanding && emiRatio > 0.4) {
        liabilitiesScore = 4;
    } else if (emiRatio <= 0.2) {
        liabilitiesScore = 4;  // Bad debt present, low EMI
    }
    // else stays at 2: bad debt + high EMI

    // ─── TIER 2: BEHAVIOUR - 40 pts ───

    // Consistency & Discipline - 15 pts
    const monthlySip = Number(p.inv_monthly_sip) || assets.monthlySip || 0;
    const sipRatio = income.total > 0 ? (monthlySip * 12 / income.total * 100) : 0;
    let sipBase = 0;
    if (sipRatio > 30) sipBase = 15;
    else if (sipRatio >= 20) sipBase = 14;
    else if (sipRatio >= 15) sipBase = 12;
    else if (sipRatio >= 10) sipBase = 9;
    else if (sipRatio >= 5) sipBase = 6;
    else if (sipRatio > 0) sipBase = 2;

    // Consistency multiplier (sip_consecutive_months)
    let sipMultiplier = 1.0; // Default: no penalty if field missing
    if (p.sip_consecutive_months !== undefined && p.sip_consecutive_months !== null) {
        const months = Number(p.sip_consecutive_months) || 0;
        if (months >= 6) sipMultiplier = 1.0;
        else if (months >= 3) sipMultiplier = 0.9;
        else sipMultiplier = 0.8;
    }
    const investmentRegularity = Math.round(sipBase * sipMultiplier);

    // Goal Clarity - 15 pts
    let goalClarity = 0;
    // TODO: If p.goals is not populated, score 0
    if (Array.isArray(p.goals) && p.goals.length > 0) {
        const timedGoals = p.goals.filter(g => Number(g.years) > 0);
        if (timedGoals.length >= 3) goalClarity = 15;
        else if (timedGoals.length === 2) goalClarity = 10;
        else if (timedGoals.length === 1) goalClarity = 6;
        else goalClarity = 3; // Goals exist but none timed
    }

    // Behavioural Tendencies - 10 pts
    // Positive questions (higher = better): take value as-is, default to 1 (worst)
    const bReview = Number(p.beh_review_monthly) || 1;
    const bAvoidDebt = Number(p.beh_avoid_debt) || 1;
    const bMarketReaction = Number(p.beh_market_reaction) || 1;
    const bWindfall = Number(p.beh_windfall_behaviour) || 1;
    const bProductUnderstanding = Number(p.beh_product_understanding) || 1;

    // Inverted questions (higher = worse): apply 6 - value, default to 5 (worst → inverted to 1)
    const bDelay = 6 - (Number(p.beh_delay_decisions) || 5);
    const bImpulse = 6 - (Number(p.beh_spend_impulsively) || 5);
    const bLossAversion = 6 - (Number(p.beh_hold_losing) || 5);       // DB: beh_hold_losing
    const bPeerComparison = 6 - (Number(p.beh_compare_peers) || 5);   // DB: beh_compare_peers

    const behavRawTotal = bReview + bAvoidDebt + bMarketReaction + bWindfall + bProductUnderstanding
        + bDelay + bImpulse + bLossAversion + bPeerComparison;
    const behavioralTendencies = Math.round((behavRawTotal / 45) * 10);

    // ─── TIER 3: AWARENESS - 20 pts ───

    // Portfolio Understanding - 10 pts
    const puVal = Number(p.beh_product_understanding) || 0;
    let portfolioUnderstanding = 6; // neutral default if missing
    if (puVal === 5) portfolioUnderstanding = 10;
    else if (puVal === 4) portfolioUnderstanding = 8;
    else if (puVal === 3) portfolioUnderstanding = 6;
    else if (puVal === 2) portfolioUnderstanding = 3;
    else if (puVal === 1) portfolioUnderstanding = 1;

    // Tax & Regime Literacy - 5 pts
    const optedRegime = p.tax_regime || 'New Regime';
    const has80cUsed = (Number(p.tax_80c_used) || 0) > 0;
    const hasNps = (Number(p.tax_nps_80ccd) || 0) > 0;
    const hasHra = (Number(p.tax_hra) || 0) > 0;
    const hasHomeLoan = (Number(p.tax_home_loan_interest) || 0) > 0;
    const has80d = (Number(p.tax_80d) || 0) > 0;
    const hasAnyDeduction = has80cUsed || hasNps || hasHra || hasHomeLoan || has80d;

    let taxScore = 0;
    if (tax.recommended === optedRegime && hasAnyDeduction) taxScore = 5;
    else if (tax.recommended === optedRegime) taxScore = 3;
    else if (tax.potentialSavings <= 5000) taxScore = 2;
    // else 0: regime mismatch with significant savings left on the table

    // Asset Diversity - 5 pts
    const alloc = assets.allocation;
    const maxAlloc = Math.max(alloc.equity, alloc.debt, alloc.commodity, alloc.realEstate, alloc.altInvestments);
    let assetDiversity = 0;
    if (maxAlloc < 50) assetDiversity = 5;
    else if (maxAlloc < 70) assetDiversity = 3;
    else if (maxAlloc < 85) assetDiversity = 1;

    // ─── FRAGILITY PENALTY - up to −15 ───
    const zeroEmergency = emergencyFund <= 1;
    const zeroInsurance = insuranceScore <= 2;
    const highBadDebt = income.total > 0 && liabilities.badLiability.outstanding > income.total * 0.3;

    let penalty = 0;
    let flags = [];
    if (zeroEmergency && zeroInsurance && highBadDebt) {
        penalty = 15; flags = ['critical_triple_gap'];
    } else if (zeroEmergency && zeroInsurance) {
        penalty = 8; flags = ['no_emergency_no_insurance'];
    } else if (zeroEmergency && highBadDebt) {
        penalty = 6; flags = ['no_emergency_high_debt'];
    } else if (zeroInsurance && highBadDebt) {
        penalty = 5; flags = ['no_insurance_high_debt'];
    }

    // ─── TOTALS ───
    const foundation = emergencyFund + insuranceScore + liabilitiesScore;
    const behaviour = investmentRegularity + goalClarity + behavioralTendencies;
    const awareness = portfolioUnderstanding + taxScore + assetDiversity;
    const rawTotal = foundation + behaviour + awareness;
    const totalScore = Math.min(100, Math.max(0, rawTotal - penalty));

    const breakdown = {
        emergencyFund,
        insurance: insuranceScore,
        liabilities: liabilitiesScore,
        investmentRegularity,
        goalClarity,
        behavioralTendencies,
        behavior: behavioralTendencies, // DEPRECATED: kept for backward compat with generateActionPlan
        portfolioUnderstanding,
        tax: taxScore,
        assetDiversity,
    };

    return {
        total: totalScore,
        breakdown,
        subScores: {
            foundation,
            behaviour,
            awareness,
        },
        fragility: {
            penalty,
            flags,
        }
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

// ============ WILL & ESTATE ============
function computeWillEstate(p) {
    const assets = computeAssets(p);
    const insurance = computeInsurance(p);
    return {
        hasWill: p.has_will === 'Yes',
        willInProgress: p.has_will === 'In Progress',
        nomineesSet: p.nominees_set || 'No',
        numNominees: Number(p.num_nominees) || 0,
        totalInvestment: assets.total,
        insuranceCover: insurance.totalCover
    };
}

// ============ ACTION PLAN ============
function generateActionPlan(p) {
    const surplus = computeSurplus(p);
    const income = computeIncome(p);
    const assets = computeAssets(p);
    const insurance = computeInsurance(p);
    const emergency = computeEmergency(p);
    const liabilities = computeLiabilities(p);
    const tax = computeTax(p);
    const age = getAge(p.date_of_birth);
    const fbs = computeFBS(p);
    const missingFBS = {
        emergencyFund: 15 - fbs.breakdown.emergencyFund,
        insurance: 15 - fbs.breakdown.insurance,
        liabilities: 10 - fbs.breakdown.liabilities,
        tax: 5 - fbs.breakdown.tax,
        investmentRegularity: 15 - fbs.breakdown.investmentRegularity,
        goalClarity: 15 - (fbs.breakdown.goalClarity || 0),
        assetDiversity: 5 - fbs.breakdown.assetDiversity,
        behavioralTendencies: 10 - fbs.breakdown.behavioralTendencies,
    };

    const actions = [];
    const fmtINR = (v) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(v || 0);

    // ── 1. EMERGENCY FUND ──
    const emGap = emergency.emergencyFunds.ideal - emergency.emergencyFunds.actual;
    if (emGap > 0) {
        const monthsCovered = emergency.emergencyFunds.actual > 0 ? Math.round(emergency.emergencyFunds.actual / (emergency.emergencyFunds.ideal / 6)) : 0;
        const monthsToFill = Math.max(3, Math.ceil(emGap / (surplus.monthly > 0 ? surplus.monthly * 0.3 : 5000)));
        actions.push({
            category: 'Emergency Fund',
            title: 'Build Emergency Fund',
            description: `Your emergency fund currently covers approximately ${monthsCovered} month(s) of expenses. The recommended target is 6 months of expenses (${fmtINR(emergency.emergencyFunds.ideal)}). Set aside ${fmtINR(Math.round(emGap / monthsToFill))}/month to reach this target in ${monthsToFill} months. Keep this amount in a readily accessible savings instrument.`,
            suggestedAmount: Math.round(emGap),
            monthlyContribution: Math.round(emGap / monthsToFill),
            status: 'pending',
            urgency: 'critical',
            fbsImpact: missingFBS.emergencyFund > 0 ? missingFBS.emergencyFund : 0,
            priority: 0
        });
        missingFBS.emergencyFund = 0;
    }

    // ── 2. INSURANCE (Bug Fix: split fbsImpact 55/45 proportionally) ──
    const needsHealth = insurance.healthCover < insurance.idealHealth;
    const needsLife = insurance.additionalCoverNeeded > 0;
    const totalInsuranceImpact = missingFBS.insurance > 0 ? missingFBS.insurance : 0;
    const healthImpact = needsHealth && needsLife ? Math.round(totalInsuranceImpact * 0.55) : totalInsuranceImpact;
    const lifeImpact = needsHealth && needsLife ? totalInsuranceImpact - healthImpact : totalInsuranceImpact;

    if (needsHealth) {
        const gap = insurance.idealHealth - insurance.healthCover;
        actions.push({
            category: 'Insurance',
            title: 'Increase Health Insurance Coverage',
            description: `Your current health cover is ${fmtINR(insurance.healthCover)} against a recommended cover of ${fmtINR(insurance.idealHealth)}. Consider increasing your health insurance to bridge the ${fmtINR(gap)} gap. Adequate health insurance protects your savings from being depleted by medical emergencies.`,
            suggestedAmount: Math.round(gap),
            status: 'pending',
            urgency: 'high',
            fbsImpact: healthImpact,
            priority: 0
        });
    }

    if (needsLife) {
        actions.push({
            category: 'Insurance',
            title: 'Increase Term Life Insurance Cover',
            description: `Based on your income, liabilities, and dependents, you need an additional ${fmtINR(insurance.additionalCoverNeeded)} of life cover. The ideal term life cover for your profile is ${fmtINR(insurance.idealTermCover)}. A pure term insurance plan offers the highest cover at the most affordable premium.`,
            suggestedAmount: Math.round(insurance.additionalCoverNeeded),
            status: 'pending',
            urgency: 'high',
            fbsImpact: lifeImpact,
            priority: 0
        });
    }

    // Zero out insurance impact only after both tasks processed
    if (needsHealth || needsLife) missingFBS.insurance = 0;

    // ── 3. DEBT MANAGEMENT ──
    if (liabilities.badLiability.outstanding > 0) {
        actions.push({
            category: 'Debt Management',
            title: 'Reduce Bad Liabilities',
            description: `You currently have ${fmtINR(liabilities.badLiability.outstanding)} in bad liabilities (personal loans, credit cards, car loans, etc.). These typically carry high interest rates and erode your net worth. Prioritise clearing the highest-interest debt first while maintaining minimum payments on others.`,
            suggestedAmount: liabilities.badLiability.outstanding,
            monthlyContribution: liabilities.badLiability.emi,
            status: 'pending',
            urgency: liabilities.badLiability.outstanding > income.total * 0.5 ? 'critical' : 'high',
            fbsImpact: missingFBS.liabilities > 0 ? missingFBS.liabilities : 0,
            priority: 0
        });
        missingFBS.liabilities = 0;
    }

    // ── 4. TAX OPTIMISATION (Bug Fix: guard with potentialSavings > 0) ──
    const optedRegime = p.tax_regime || 'New Regime';
    if (tax.recommended !== optedRegime && tax.potentialSavings > 0) {
        actions.push({
            category: 'Tax Planning',
            title: `Evaluate Switching to ${tax.recommended}`,
            description: `Based on your income and deductions, the ${tax.recommended} could save you approximately ${fmtINR(tax.potentialSavings)} per year compared to your current regime. Review this with your tax advisor before the start of the next financial year.`,
            suggestedAmount: tax.potentialSavings,
            status: 'pending',
            urgency: tax.potentialSavings > 20000 ? 'high' : 'medium',
            fbsImpact: missingFBS.tax > 0 ? missingFBS.tax : 0,
            priority: 0
        });
        missingFBS.tax = 0;
    }

    if (optedRegime === 'Old Regime' || tax.recommended === 'Old Regime') {
        const unusedDeductions = tax.deductionUtilization.filter(d => d.gap > 10000);
        unusedDeductions.forEach(d => {
            actions.push({
                category: 'Tax Planning',
                title: `Utilise ${d.name} Deduction (${d.section})`,
                description: `You have utilised ${fmtINR(d.used)} of the ${fmtINR(d.limit)} limit under ${d.section}. By deploying the remaining ${fmtINR(d.gap)}, you can reduce your taxable income and lower your overall tax liability.`,
                suggestedAmount: d.gap,
                status: 'pending',
                urgency: 'medium',
                fbsImpact: missingFBS.tax > 0 ? missingFBS.tax : 0,
                priority: 0
            });
            missingFBS.tax = 0;
        });
    }

    // ── 5. SAVINGS REALLOCATION ──
    const savingsBalance = Number(p.savings_balance) || 0;
    const fdBalance = Number(p.fd_balance) || 0;
    const idleCash = savingsBalance + fdBalance;
    const monthlyExpenses = (computeExpenses(p)).total / 12;
    const emergencyReserve = monthlyExpenses * 6;
    const excessSavings = idleCash - emergencyReserve;

    if (excessSavings > 10000 && assets.total > 0) {
        const savingsPct = Math.round(idleCash / assets.total * 100);
        if (savingsPct > 30) {
            actions.push({
                category: 'Asset Reallocation',
                title: 'Deploy Excess Savings into Investments',
                description: `You have ${fmtINR(idleCash)} parked in savings accounts and fixed deposits, which is ${savingsPct}% of your total portfolio. After keeping ${fmtINR(Math.round(emergencyReserve))} as your emergency reserve, consider redeploying approximately ${fmtINR(Math.round(excessSavings))} into a diversified mix of equity, debt, and commodity instruments to earn better returns. Idle savings lose value to inflation over time.`,
                suggestedAmount: Math.round(excessSavings),
                status: 'pending',
                urgency: savingsPct > 60 ? 'high' : 'medium',
                fbsImpact: missingFBS.assetDiversity > 0 ? missingFBS.assetDiversity : 0,
                priority: 0
            });
            missingFBS.assetDiversity = 0;
        }
    }

    // ── 6. ASSET REALLOCATION (equity / debt / commodity) ──
    const investable = Math.max(0, surplus.monthly * 0.6);
    const totalPortfolio = (assets.total || 0) - (assets.realEstate || 0);

    let idealEquity, idealDebt, idealGold;
    if (age < 30) {
        idealEquity = 80; idealDebt = 10; idealGold = 10;
    } else if (age < 40) {
        idealEquity = 70; idealDebt = 20; idealGold = 10;
    } else if (age < 50) {
        idealEquity = 60; idealDebt = 30; idealGold = 10;
    } else {
        idealEquity = 40; idealDebt = 45; idealGold = 15;
    }

    const equityActual = totalPortfolio > 0 ? Math.round((assets.equity || 0) / totalPortfolio * 100) : 0;
    const debtActual = totalPortfolio > 0 ? Math.round((assets.debt || 0) / totalPortfolio * 100) : 0;
    const goldActual = totalPortfolio > 0 ? Math.round((assets.commodity || 0) / totalPortfolio * 100) : 0;

    const equityGap = idealEquity - equityActual;
    if (Math.abs(equityGap) >= 10 && totalPortfolio > 0) {
        const direction = equityGap > 0 ? 'Increase' : 'Reduce';
        const amt = Math.abs(Math.round(totalPortfolio * Math.abs(equityGap) / 100));
        actions.push({
            category: 'Asset Reallocation',
            title: `${direction} Equity Allocation`,
            description: `Your equity allocation is currently ${equityActual}% against a recommended range of ${idealEquity}% for your age group. ${direction} your equity exposure by approximately ${fmtINR(amt)} to align with the ideal allocation.`,
            suggestedAmount: amt,
            currentPercent: equityActual,
            idealPercent: idealEquity,
            status: 'pending',
            urgency: Math.abs(equityGap) >= 20 ? 'high' : 'medium',
            fbsImpact: missingFBS.assetDiversity > 0 ? missingFBS.assetDiversity : 0,
            priority: 0
        });
        missingFBS.assetDiversity = 0;
    }

    const debtGap = idealDebt - debtActual;
    if (Math.abs(debtGap) >= 10 && totalPortfolio > 0) {
        const direction = debtGap > 0 ? 'Increase' : 'Reduce';
        const amt = Math.abs(Math.round(totalPortfolio * Math.abs(debtGap) / 100));
        actions.push({
            category: 'Asset Reallocation',
            title: `${direction} Debt Allocation`,
            description: `Your debt allocation is currently ${debtActual}% against a recommended ${idealDebt}% for your age group. Adjust by approximately ${fmtINR(amt)}. Debt instruments provide stability and capital preservation in your portfolio.`,
            suggestedAmount: amt,
            currentPercent: debtActual,
            idealPercent: idealDebt,
            status: 'pending',
            urgency: 'medium',
            priority: 0
        });
    }

    const goldGap = idealGold - goldActual;
    if (Math.abs(goldGap) >= 5 && totalPortfolio > 0) {
        const direction = goldGap > 0 ? 'Increase' : 'Reduce';
        const amt = Math.abs(Math.round(totalPortfolio * Math.abs(goldGap) / 100));
        actions.push({
            category: 'Asset Reallocation',
            title: `${direction} Commodity / Gold Allocation`,
            description: `Your commodity allocation is currently ${goldActual}% against a recommended ${idealGold}%. Adjust by approximately ${fmtINR(amt)}. Gold and commodities serve as a hedge against inflation and currency depreciation.`,
            suggestedAmount: amt,
            currentPercent: goldActual,
            idealPercent: idealGold,
            status: 'pending',
            urgency: 'low',
            priority: 0
        });
    }

    // Monthly investment plan (if surplus exists)
    if (investable > 0) {
        const sipAmount = Math.max(investable, 5000);
        const eqAmt = Math.round(sipAmount * idealEquity / 100);
        const dtAmt = Math.round(sipAmount * idealDebt / 100);
        const glAmt = Math.round(sipAmount * idealGold / 100);
        actions.push({
            category: 'Asset Reallocation',
            title: 'Set Up Monthly Investment Plan',
            description: `Based on your surplus income, allocate approximately ${fmtINR(sipAmount)}/month across asset classes: Equity ${fmtINR(eqAmt)} (${idealEquity}%), Debt ${fmtINR(dtAmt)} (${idealDebt}%), and Commodity ${fmtINR(glAmt)} (${idealGold}%). Consistent monthly investing helps benefit from rupee-cost averaging over time.`,
            suggestedAmount: sipAmount,
            monthlyContribution: sipAmount,
            status: 'pending',
            urgency: 'medium',
            fbsImpact: missingFBS.investmentRegularity > 0 ? missingFBS.investmentRegularity : 0,
            priority: 0
        });
        missingFBS.investmentRegularity = 0;
    }

    // Fallback: Investment Regularity task when no surplus but score is below max
    if (missingFBS.investmentRegularity > 0) {
        actions.push({
            category: 'Asset Reallocation',
            title: 'Start a Monthly SIP',
            description: 'You are not investing regularly yet. Even starting with a small monthly SIP of ₹500–₹5,000 in a diversified mutual fund significantly improves your financial health score. Consistency matters more than amount - aim to invest at least 10–15% of your income monthly.',
            suggestedAmount: 5000,
            monthlyContribution: 5000,
            status: 'pending',
            urgency: 'high',
            fbsImpact: missingFBS.investmentRegularity,
            priority: 0
        });
        missingFBS.investmentRegularity = 0;
    }

    // Asset Diversity task when score is below max and no reallocation tasks covered it
    if (missingFBS.assetDiversity > 0) {
        actions.push({
            category: 'Asset Reallocation',
            title: 'Diversify Your Portfolio',
            description: 'Your investment portfolio is too concentrated in a single asset class, or you haven\'t started investing yet. Spread your investments across equity, debt, and commodity instruments to reduce risk and improve returns. A well-diversified portfolio is a cornerstone of financial health.',
            suggestedAmount: 0,
            status: 'pending',
            urgency: 'medium',
            fbsImpact: missingFBS.assetDiversity,
            priority: 0
        });
        missingFBS.assetDiversity = 0;
    }

    // Portfolio Understanding task (Awareness tier)
    if (fbs.breakdown.portfolioUnderstanding < 10) {
        const puMissing = 10 - fbs.breakdown.portfolioUnderstanding;
        actions.push({
            category: 'Financial Habits',
            title: 'Understand Your Investments Better',
            description: 'Take time to understand what you are invested in and why. Read about the asset classes in your portfolio, understand the risks, and ensure each investment aligns with your goals. A deeper understanding helps you make better financial decisions and avoid panic-selling.',
            suggestedAmount: 0,
            status: 'pending',
            urgency: 'medium',
            fbsImpact: puMissing,
            priority: 0
        });
    }

    // Tax Awareness task (when no regime-switch task was generated but tax score is below max)
    if (missingFBS.tax > 0) {
        actions.push({
            category: 'Tax Planning',
            title: 'Optimise Your Tax Strategy',
            description: 'Review your current tax regime and explore available deductions. Utilise sections like 80C (PPF, ELSS), 80D (health insurance), and NPS contributions to reduce your taxable income. Even under the New Regime, understanding your tax position improves your financial literacy score.',
            suggestedAmount: 0,
            status: 'pending',
            urgency: 'low',
            fbsImpact: missingFBS.tax,
            priority: 0
        });
        missingFBS.tax = 0;
    }

    // ── 7. GOAL CLARITY (NEW) ──
    if (missingFBS.goalClarity > 0) {
        const hasGoals = Array.isArray(p.goals) && p.goals.length > 0;
        const hasTimedGoals = hasGoals && p.goals.some(g => Number(g.years) > 0);
        let goalTitle, goalDesc;
        if (!hasGoals) {
            goalTitle = 'Set Up Your Financial Goals';
            goalDesc = 'You haven\'t defined any financial goals yet. Visit the Goal Planner to add your goals - whether it\'s buying a home, building a retirement corpus, or planning for education. Goals with clear timelines dramatically improve your financial score.';
        } else if (!hasTimedGoals) {
            goalTitle = 'Add Timelines to Your Goals';
            goalDesc = 'You have financial goals but none have specific timelines. Visit the Goal Planner and add target years to each goal. Timed goals enable precise SIP calculations and help you track progress.';
        } else {
            goalTitle = 'Add More Financial Goals';
            goalDesc = 'Adding more timed financial goals improves your goal clarity score. Consider diversifying your goals across short-term, medium-term, and long-term horizons in the Goal Planner.';
        }
        actions.push({
            category: 'Goal Clarity',
            title: goalTitle,
            description: goalDesc,
            suggestedAmount: 0,
            status: 'pending',
            urgency: !hasGoals ? 'high' : 'medium',
            fbsImpact: missingFBS.goalClarity,
            priority: 0
        });
    }

    // ── 8. ESTATE PLANNING ──
    if (p.has_will !== 'Yes') {
        actions.push({
            category: 'Estate Planning',
            title: 'Create or Update Your Will',
            description: 'A legally valid will ensures your assets are distributed according to your wishes and prevents legal complications for your family. Review or create your will with a legal professional.',
            suggestedAmount: 0,
            status: 'pending',
            urgency: 'medium',
            priority: 0
        });
    }

    if (p.nominees_set !== 'Yes') {
        actions.push({
            category: 'Estate Planning',
            title: 'Update Nominees Across All Accounts',
            description: 'Ensure nominees are set for all financial accounts - bank accounts, demat accounts, mutual funds, insurance policies, PF, and NPS. Missing nominees can cause significant delays in claim settlement.',
            suggestedAmount: 0,
            status: 'pending',
            urgency: 'medium',
            priority: 0
        });
    }

    // ── 9. CREDIT SCORE ──
    if (liabilities.creditScore > 0 && liabilities.creditScore < 750) {
        actions.push({
            category: 'Credit Health',
            title: 'Improve Your Credit Score',
            description: `Your credit score is ${liabilities.creditScore}. A score of 750+ unlocks better interest rates on loans and credit products. Ensure all EMIs and credit card bills are paid on time, keep your credit utilisation below 30%, and avoid multiple credit applications in a short period.`,
            suggestedAmount: 0,
            status: 'pending',
            urgency: liabilities.creditScore < 650 ? 'high' : 'medium',
            priority: 0
        });
    }

    // ── 10. BEHAVIORAL ADJUSTMENTS ──
    if (missingFBS.behavioralTendencies > 0) {
        actions.push({
            category: 'Financial Habits',
            title: 'Improve Financial Habits',
            description: `Review your portfolio regularly and avoid impulsive spending or holding onto losing investments. Delay significant financial decisions to remove emotional bias. Mastering these habits will increase your score and long-term wealth execution.`,
            suggestedAmount: 0,
            status: 'pending',
            urgency: 'medium',
            fbsImpact: missingFBS.behavioralTendencies,
            priority: 0
        });
    }

    // Apply dependency-based sequencing
    return sequenceActionPlan(actions, fbs.fragility, liabilities, income);
}

// ============ ACTION PLAN SEQUENCER ============
function sequenceActionPlan(tasks, fragility, liabilities, income) {
    // Dependency level map (default levels)
    const levelMap = {
        'Emergency Fund': 2,
        'Insurance': 2,
        'Debt Management': 2,
        'Financial Habits': 3,
        'Goal Clarity': 3,
        'Asset Reallocation': 3,
        'Tax Planning': 4,
        'Estate Planning': 5,
        'Credit Health': 5,
    };

    // Assign default levels
    tasks.forEach(t => {
        t._level = levelMap[t.category] || 4;
    });

    // Fragility promotions to level 1
    const flag = fragility.flags.length > 0 ? fragility.flags[0] : null;

    if (flag === 'critical_triple_gap') {
        tasks.forEach(t => {
            if (t.category === 'Emergency Fund') t._level = 1.1;
            else if (t.category === 'Debt Management') t._level = 1.2;
            else if (t.category === 'Insurance') t._level = 1.3;
        });
    } else if (flag === 'no_emergency_high_debt') {
        // Check bad debt interest rate to determine order
        const avgRate = liabilities.badLiability.avgInterestRate || 0;
        if (avgRate > 15) {
            tasks.forEach(t => {
                if (t.category === 'Debt Management') t._level = 1.1;
                else if (t.category === 'Emergency Fund') t._level = 1.2;
            });
        } else {
            tasks.forEach(t => {
                if (t.category === 'Emergency Fund') t._level = 1.1;
                else if (t.category === 'Debt Management') t._level = 1.2;
            });
        }
    } else if (flag === 'no_emergency_no_insurance') {
        tasks.forEach(t => {
            if (t.category === 'Emergency Fund') t._level = 1.1;
            else if (t.category === 'Insurance') t._level = 1.2;
        });
    } else if (flag === 'no_insurance_high_debt') {
        tasks.forEach(t => {
            if (t.category === 'Insurance') t._level = 1.1;
            else if (t.category === 'Debt Management') t._level = 1.2;
        });
    }

    // Sort: level ascending, then fbsImpact descending within same level
    tasks.sort((a, b) => {
        if (a._level !== b._level) return a._level - b._level;
        return (b.fbsImpact || 0) - (a.fbsImpact || 0);
    });

    // Assign clean sequential priority numbers and remove temp field
    tasks.forEach((t, i) => {
        t.priority = i + 1;
        delete t._level;
    });

    return tasks;
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
    const willEstate = computeWillEstate(p);
    const actionPlan = generateActionPlan(p);
    const allocationIdeals = getAssetAllocationIdeals(age, assets.total, moneySign, assets.realEstate);

    const generation = computeGeneration(p);

    return {
        user: { id: user.id, fullName: user.full_name, email: user.email },
        overview: {
            generation,
            lifeStage,
            fbs: fbsObj.total,
            fbsBreakdown: fbsObj.breakdown,
            fbsSubScores: fbsObj.subScores,
            fbsFragility: fbsObj.fragility,
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
            willEstate,
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
        tax,
        willEstate,
        actionPlan
    };
}

module.exports = {
    computeFullDashboard,
    computeIncome, computeExpenses, computeAssets,
    computeLiabilities, computeInsurance, computeTax,
    computeEmergency, computeNetWorth, computeSurplus,
    computeCashflow, computeFBS, computeMoneySign,
    computeBiases, computeFinancialRatios, computeWillEstate,
    generateActionPlan, sequenceActionPlan, getAssetAllocationIdeals, getLifeStage, getAge
};
