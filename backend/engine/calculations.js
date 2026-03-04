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
    const household = Number(p.expense_household) || 0;
    const rent = Number(p.expense_rent) || 0;
    const utilities = Number(p.expense_utilities) || 0;
    const transport = Number(p.expense_transport) || 0;
    const food = Number(p.expense_food) || 0;
    const subs = Number(p.expense_subscriptions) || 0;
    const insurance = Number(p.expense_insurance) || 0;
    const disc = Number(p.expense_discretionary) || 0;

    const fixed = (rent + subs + insurance) * 12;
    const variable = (household + utilities + transport + food) * 12;
    const misc = disc * 12;
    const totalMonthly = household + rent + utilities + transport + food + subs + insurance + disc;
    const totalAnnual = totalMonthly * 12;

    return {
        totalMonthly, totalAnnual, fixed, variable, misc,
        breakdown: [
            { type: 'Fixed', amount: fixed, percent: totalAnnual ? Math.round(fixed / totalAnnual * 100) : 0 },
            { type: 'Variable', amount: variable, percent: totalAnnual ? Math.round(variable / totalAnnual * 100) : 0 },
            { type: 'Miscellaneous', amount: misc, percent: totalAnnual ? Math.round(misc / totalAnnual * 100) : 0 },
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
function getAssetAllocationIdeals(age, totalAssets) {
    let ranges;
    if (age < 25) {
        ranges = { equity: [40, 75], debt: [5, 25], realEstate: [0, 30], commodity: [3, 25], alt: [0, 25] };
    } else if (age <= 35) {
        ranges = { equity: [35, 75], debt: [5, 30], realEstate: [28, 53], commodity: [4, 30], alt: [0, 29] };
    } else if (age <= 50) {
        ranges = { equity: [25, 60], debt: [10, 35], realEstate: [30, 55], commodity: [5, 25], alt: [0, 20] };
    } else if (age <= 60) {
        ranges = { equity: [15, 40], debt: [20, 45], realEstate: [30, 50], commodity: [5, 20], alt: [0, 15] };
    } else {
        ranges = { equity: [10, 25], debt: [30, 50], realEstate: [30, 45], commodity: [5, 15], alt: [0, 10] };
    }

    return [
        { name: 'Equity', min: totalAssets * ranges.equity[0] / 100, max: totalAssets * ranges.equity[1] / 100 },
        { name: 'Real Estate', min: totalAssets * ranges.realEstate[0] / 100, max: totalAssets * ranges.realEstate[1] / 100 },
        { name: 'Commodity', min: totalAssets * ranges.commodity[0] / 100, max: totalAssets * ranges.commodity[1] / 100 },
        { name: 'Debt', min: totalAssets * ranges.debt[0] / 100, max: totalAssets * ranges.debt[1] / 100 },
        { name: 'Alternative Investments', min: totalAssets * ranges.alt[0] / 100, max: totalAssets * ranges.alt[1] / 100 }
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
    const healthPremium = Number(p.health_premium) || 0;
    const lifeCover = Number(p.life_cover) || 0;
    const lifePremium = Number(p.life_premium) || 0;
    const totalCover = healthCover + lifeCover;
    const annualIncome = Number(p.annual_salary) || 0;

    const idealHealth = Math.max(500000, annualIncome * 0.5);
    const hasDependents = (Number(p.dependents) || 0) > 0 || p.marital_status === 'Married';
    const idealLife = hasDependents ? annualIncome * 10 : 0;

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
    const idealEmergency = expenses.totalMonthly * 3;
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
    const monthlyIncome = income.total / 12;
    const monthly = monthlyIncome - expenses.totalMonthly - emi;
    return { monthly, quarterly: monthly * 3 };
}

// ============ CASHFLOW (Next 3 Months) ============
function computeCashflow(p) {
    const income = computeIncome(p);
    const expenses = computeExpenses(p);
    const liabilities = computeLiabilities(p);
    const emi = liabilities.totalEmi || 0;
    const sip = Number(p.inv_monthly_sip) || 0;
    const insurancePremium = (Number(p.health_premium) || 0) + (Number(p.life_premium) || 0);

    const grossIncome3m = income.total / 4; // 3 months
    const bonus3m = (income.bonus || 0) / 4;
    const expenses3m = expenses.totalMonthly * 3;
    const emi3m = emi * 3;
    const sip3m = sip * 3;
    const insurance3m = insurancePremium / 4;
    const taxEstimate = computeTax(p);
    const tax3m = Math.min(taxEstimate.newRegime.taxLiability, taxEstimate.oldRegime.taxLiability) / 4;

    const surplus = grossIncome3m + bonus3m - expenses3m - emi3m - sip3m - insurance3m - tax3m;

    return {
        items: [
            { name: 'Bonus Income', type: 'credit', amount: bonus3m },
            { name: 'Gross Income', type: 'credit', amount: grossIncome3m },
            { name: 'Household & Lifestyle Expenses', type: 'debit', amount: expenses3m },
            { name: 'Tax Expenses', type: 'debit', amount: tax3m },
            { name: 'EMIs', type: 'debit', amount: emi3m },
            { name: 'Planned Investments', type: 'debit', amount: sip3m },
            { name: 'Insurance Premium', type: 'debit', amount: insurance3m }
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

    let score = 0;

    // 1. Asset allocation diversity (20 pts)
    const alloc = assets.allocation;
    const maxAlloc = Math.max(alloc.equity, alloc.debt, alloc.commodity, alloc.realEstate, alloc.altInvestments);
    if (maxAlloc < 50) score += 20;
    else if (maxAlloc < 70) score += 12;
    else if (maxAlloc < 85) score += 6;
    else score += 2;

    // 2. Investment regularity (15 pts)
    const sipRatio = income.total ? (assets.monthlySip * 12 / income.total * 100) : 0;
    if (sipRatio >= 20) score += 15;
    else if (sipRatio >= 10) score += 10;
    else if (sipRatio >= 5) score += 5;
    else score += 1;

    // 3. Emergency fund adequacy (15 pts)
    const emRatio = emergency.emergencyFunds.ideal ? emergency.emergencyFunds.actual / emergency.emergencyFunds.ideal : 0;
    if (emRatio >= 2) score += 15;
    else if (emRatio >= 1) score += 12;
    else if (emRatio >= 0.5) score += 6;
    else score += 2;

    // 4. Insurance coverage (15 pts)
    const healthOk = insurance.healthCover >= insurance.idealHealth;
    const lifeOk = insurance.lifeCover >= insurance.idealLife || insurance.idealLife === 0;
    if (healthOk && lifeOk) score += 15;
    else if (healthOk || lifeOk) score += 8;
    else score += 2;

    // 5. Liability management (10 pts)
    if (!liabilities.hasLiabilities) score += 8;
    else if (liabilities.goodLiability.outstanding > liabilities.badLiability.outstanding) score += 7;
    else score += 3;

    // 6. Tax efficiency (10 pts)
    if (tax.recommended === (p.tax_regime || 'New Regime')) score += 10;
    else score += 4;

    // 7. Behavioral score (15 pts)
    const bReview = Number(p.beh_review_monthly) || 3;
    const bDelay = Number(p.beh_delay_decisions) || 3;
    const bImpulse = Number(p.beh_spend_impulsively) || 3;
    const behavScore = (bReview * 3 + (6 - bDelay) * 2 + (6 - bImpulse) * 2) / 35 * 15;
    score += Math.round(behavScore);

    return Math.min(100, Math.max(0, score));
}

// ============ MONEY SIGN ============
function computeMoneySign(p) {
    const risk = Number(p.risk_comfort) || 5;
    const prefGuaranteed = Number(p.beh_prefer_guaranteed) || 3;
    const followNews = Number(p.beh_follow_market_news) || 3;
    const avoidDebt = Number(p.beh_avoid_debt) || 3;
    const holdLosing = Number(p.beh_hold_losing) || 3;
    const impulsive = Number(p.beh_spend_impulsively) || 3;

    const riskTolerance = risk + (6 - prefGuaranteed) + (6 - avoidDebt);
    const discipline = (6 - impulsive) + (Number(p.beh_review_monthly) || 3);
    const patience = holdLosing + (6 - followNews);

    if (riskTolerance >= 15) return { name: 'Bold Eagle', icon: '🦅', desc: 'Aggressive, high risk tolerance, growth-focused' };
    if (riskTolerance <= 8 && discipline >= 7) return { name: 'Cautious Turtle', icon: '🐢', desc: 'Very conservative, avoids all risk, safety-first' };
    if (patience >= 8 && discipline >= 7) return { name: 'Persistent Horse', icon: '🐎', desc: 'Steady, methodical, patient long-term investor' };
    if (followNews >= 4 && impulsive >= 4) return { name: 'Curious Fox', icon: '🦊', desc: 'Experimental, tries new investments, trend-follower' };
    if (discipline >= 8) return { name: 'Loyal Elephant', icon: '🐘', desc: 'Long-term holder, trusts established brands' };
    return { name: 'Balanced Dolphin', icon: '🐬', desc: 'Moderate risk, well-diversified approach' };
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
    const lifeStage = getLifeStage(p.date_of_birth);

    const actions = [];
    let priority = 1;

    // ── 1. EMERGENCY FUND (highest priority) ──
    const emGap = emergency.emergencyFunds.ideal - emergency.emergencyFunds.actual;
    if (emGap > 0) {
        const monthsToFill = Math.max(3, Math.ceil(emGap / (surplus.monthly > 0 ? surplus.monthly * 0.3 : 5000)));
        actions.push({
            category: 'Emergency Fund',
            title: 'Build Emergency Fund',
            description: `Your emergency fund covers ${emergency.emergencyFunds.actual > 0 ? Math.round(emergency.emergencyFunds.actual / (emergency.emergencyFunds.ideal / 3)) : 0} months of expenses. Target 3 months (${new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(emergency.emergencyFunds.ideal)}). Park in a liquid fund or high-yield savings account for instant access.`,
            suggestedAmount: Math.round(emGap),
            monthlyContribution: Math.round(emGap / monthsToFill),
            status: 'pending',
            urgency: 'critical',
            icon: 'shield',
            priority: priority++
        });
    }

    // ── 2. INSURANCE GAPS ──
    if (insurance.healthCover < insurance.idealHealth) {
        const gap = insurance.idealHealth - insurance.healthCover;
        actions.push({
            category: 'Insurance',
            title: 'Increase Health Insurance Cover',
            description: `Current cover: ${new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(insurance.healthCover)}. Ideal: ${new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(insurance.idealHealth)}. Consider a super top-up plan to bridge the gap cost-effectively.`,
            suggestedAmount: Math.round(gap),
            status: 'pending',
            urgency: 'high',
            icon: 'heart',
            priority: priority++
        });
    }

    if (insurance.additionalCoverNeeded > 0) {
        actions.push({
            category: 'Insurance',
            title: 'Get Term Life Insurance',
            description: `You need ${new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(insurance.additionalCoverNeeded)} additional life cover. A pure term plan provides the highest cover at the lowest premium. Apply before your next birthday for the best rates.`,
            suggestedAmount: Math.round(insurance.additionalCoverNeeded),
            status: 'pending',
            urgency: 'high',
            icon: 'umbrella',
            priority: priority++
        });
    }

    // ── 3. DEBT MANAGEMENT ──
    if (liabilities.badLiability.outstanding > 0) {
        actions.push({
            category: 'Debt Management',
            title: 'Pay Off High-Interest Debt',
            description: `You have ${new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(liabilities.badLiability.outstanding)} in bad liabilities. Prioritize paying these off using the avalanche method (highest interest rate first). Consider balance transfer if interest rate exceeds 15%.`,
            suggestedAmount: liabilities.badLiability.outstanding,
            monthlyContribution: liabilities.badLiability.emi,
            status: 'pending',
            urgency: liabilities.badLiability.outstanding > income.total * 0.5 ? 'critical' : 'medium',
            icon: 'trending-down',
            priority: priority++
        });
    }

    // ── 4. TAX OPTIMIZATION ──
    const optedRegime = p.tax_regime || 'New Regime';
    if (tax.recommended !== optedRegime) {
        actions.push({
            category: 'Tax Planning',
            title: `Switch to ${tax.recommended}`,
            description: `You can save ${new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(tax.potentialSavings)} per year by switching to the ${tax.recommended}. Consult your CA before the next financial year starts.`,
            suggestedAmount: tax.potentialSavings,
            status: 'pending',
            urgency: tax.potentialSavings > 20000 ? 'high' : 'medium',
            icon: 'receipt',
            priority: priority++
        });
    }

    // Check deduction utilization under old regime
    if (optedRegime === 'Old Regime' || tax.recommended === 'Old Regime') {
        const unusedDeductions = tax.deductionUtilization.filter(d => d.gap > 10000);
        unusedDeductions.forEach(d => {
            actions.push({
                category: 'Tax Planning',
                title: `Maximize ${d.name} Deduction`,
                description: `You've used ${new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(d.used)} of the ${new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(d.limit)} limit under ${d.section}. Utilize the remaining ${new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(d.gap)} to reduce taxable income.`,
                suggestedAmount: d.gap,
                status: 'pending',
                urgency: 'medium',
                icon: 'calculator',
                priority: priority++
            });
        });
    }

    // ── 5. INVESTMENT PLANNING ──
    const investable = Math.max(0, surplus.monthly * 0.6);
    if (investable > 0 || assets.monthlySip === 0) {
        const sipAmount = Math.max(investable, 5000);

        // Age-based allocation
        let equityPct, debtPct, goldPct;
        if (age < 30) {
            equityPct = 80; debtPct = 10; goldPct = 10;
        } else if (age < 40) {
            equityPct = 70; debtPct = 20; goldPct = 10;
        } else if (age < 50) {
            equityPct = 60; debtPct = 30; goldPct = 10;
        } else {
            equityPct = 40; debtPct = 45; goldPct = 15;
        }

        const equityAmt = Math.round(sipAmount * equityPct / 100);
        const debtAmt = Math.round(sipAmount * debtPct / 100);
        const goldAmt = Math.round(sipAmount * goldPct / 100);

        // Equity sub-allocation
        const largeCap = Math.round(equityAmt * 0.40);
        const midCap = Math.round(equityAmt * 0.25);
        const smallCap = Math.round(equityAmt * 0.15);
        const indexFund = Math.round(equityAmt * 0.20);

        actions.push({
            category: 'Investment Planning',
            title: 'Start Monthly SIP Portfolio',
            description: `Based on your ${lifeStage.stage} and risk profile, allocate ${new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(sipAmount)}/month across equity (${equityPct}%), debt (${debtPct}%), and gold (${goldPct}%).`,
            suggestedAmount: sipAmount,
            status: 'pending',
            urgency: 'high',
            icon: 'bar-chart',
            priority: priority++
        });

        actions.push(
            { category: 'Investment Planning', title: 'Large Cap / Flexi Cap Fund', description: 'Core portfolio stability. Consider HDFC Flexi Cap, Parag Parikh Flexi Cap, or UTI Nifty 50 Index Fund.', suggestedAmount: largeCap, percent: 40, status: 'pending', urgency: 'medium', icon: 'trending-up', priority: priority++ },
            { category: 'Investment Planning', title: 'Mid Cap Fund', description: 'Growth engine. Consider Motilal Oswal Nifty Midcap 150 Index or Kotak Emerging Equity.', suggestedAmount: midCap, percent: 25, status: 'pending', urgency: 'medium', icon: 'trending-up', priority: priority++ },
            { category: 'Investment Planning', title: 'Small Cap Fund', description: 'High-growth potential with higher volatility. Consider Nippon Small Cap or SBI Small Cap. Only for 7+ year horizon.', suggestedAmount: smallCap, percent: 15, status: 'pending', urgency: 'low', icon: 'trending-up', priority: priority++ },
            { category: 'Investment Planning', title: 'Nifty Next 50 Index Fund', description: 'Diversified large-mid cap exposure at low cost. Consider Navi Nifty Next 50 or UTI Nifty Next 50 Index Fund.', suggestedAmount: indexFund, percent: 20, status: 'pending', urgency: 'medium', icon: 'trending-up', priority: priority++ },
            { category: 'Investment Planning', title: 'Debt Fund / PPF', description: 'Capital preservation and stable returns. Use for goals within 3-5 years.', suggestedAmount: debtAmt, percent: debtPct, status: 'pending', urgency: 'medium', icon: 'lock', priority: priority++ },
            { category: 'Investment Planning', title: 'Gold ETF / Sovereign Gold Bond', description: 'Portfolio hedge against inflation and currency depreciation. SGB offers 2.5% annual interest.', suggestedAmount: goldAmt, percent: goldPct, status: 'pending', urgency: 'low', icon: 'coins', priority: priority++ }
        );
    }

    // ── 6. WILL & ESTATE ──
    if (p.has_will !== 'Yes') {
        actions.push({
            category: 'Estate Planning',
            title: 'Create or Update Your Will',
            description: 'A legally valid will ensures your assets are distributed according to your wishes. Consider using an online will service or consulting a lawyer.',
            suggestedAmount: 0,
            status: 'pending',
            urgency: 'medium',
            icon: 'file-text',
            priority: priority++
        });
    }

    if (p.nominees_set !== 'Yes') {
        actions.push({
            category: 'Estate Planning',
            title: 'Set Nominees for All Accounts',
            description: 'Ensure nominees are updated across bank accounts, demat, mutual funds, insurance, and PPF. This prevents legal complications for your family.',
            suggestedAmount: 0,
            status: 'pending',
            urgency: 'medium',
            icon: 'users',
            priority: priority++
        });
    }

    // ── 7. CREDIT SCORE ──
    if (liabilities.creditScore > 0 && liabilities.creditScore < 750) {
        actions.push({
            category: 'Credit Health',
            title: 'Improve Your Credit Score',
            description: `Your credit score is ${liabilities.creditScore}. Aim for 750+. Pay all EMIs on time, keep credit utilization below 30%, and avoid multiple loan applications.`,
            suggestedAmount: 0,
            status: 'pending',
            urgency: liabilities.creditScore < 650 ? 'high' : 'medium',
            icon: 'award',
            priority: priority++
        });
    }

    return actions;
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
    const fbs = computeFBS(p);
    const moneySign = computeMoneySign(p);
    const biases = computeBiases(p);
    const ratios = computeFinancialRatios(p);
    const willEstate = computeWillEstate(p);
    const actionPlan = generateActionPlan(p);
    const allocationIdeals = getAssetAllocationIdeals(age, assets.total);

    // Determine generation (simplified)
    let generation = 'Generation 2';
    if (age < 25) generation = 'Generation 1';
    else if (age > 45) generation = 'Generation 3';

    return {
        user: { id: user.id, fullName: user.full_name, email: user.email },
        overview: {
            generation,
            lifeStage,
            fbs,
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
    generateActionPlan, getAssetAllocationIdeals, getLifeStage, getAge
};
