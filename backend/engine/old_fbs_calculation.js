// Backup of FBS scoring logic before dynamic weight refactor. Not imported anywhere.
// Original getLifeStage and computeFBS from calculations.js

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
    if (Array.isArray(p.goals) && p.goals.length > 0) {
        const timedGoals = p.goals.filter(g => Number(g.years) > 0);
        if (timedGoals.length >= 3) goalClarity = 15;
        else if (timedGoals.length === 2) goalClarity = 10;
        else if (timedGoals.length === 1) goalClarity = 6;
        else goalClarity = 3; // Goals exist but none timed
    }

    // Behavioural Tendencies - 10 pts
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

    // Asset Diversity - 5 pts
    const alloc = assets.allocation;
    const maxAlloc = Math.max(alloc.equity, alloc.debt, alloc.commodity, alloc.realEstate, alloc.altInvestments);
    let assetDiversity = 0;
    if (maxAlloc < 50) assetDiversity = 5;
    else if (maxAlloc < 70) assetDiversity = 3;
    else if (maxAlloc < 85) assetDiversity = 1;

    // ─── FRAGILITY PENALTY ───
    const zeroEmergency = emergencyFund <= 1;
    const zeroInsurance = insuranceScore <= 2;
    const highBadDebt = monthlyIncome > 0 && liabilities.badLiability.outstanding >= monthlyIncome * 2;

    const { revolvingBalance = 0, emiCCBalance = 0 } = liabilities.creditCards || {};
    const effectiveRevolving = revolvingBalance;

    const revolvingPenalty = monthlyIncome > 0
        ? Math.min(10, Math.floor(effectiveRevolving / monthlyIncome) * 3)
        : 0;

    let fragilityPenalty = 0;
    let flags = [];
    if (zeroEmergency && zeroInsurance && highBadDebt) {
        fragilityPenalty = 15; flags = ['critical_triple_gap'];
    } else if (zeroEmergency && zeroInsurance) {
        fragilityPenalty = 8; flags = ['no_emergency_no_insurance'];
    } else if (zeroEmergency && highBadDebt) {
        let base = 6;
        if (effectiveRevolving > liabilities.badLiability.outstanding * 0.5) base = Math.round(base * 1.5);
        else if (emiCCBalance >= monthlyIncome)                               base = Math.round(base * 1.2);
        fragilityPenalty = Math.min(base, 15);
        flags = ['no_emergency_high_debt'];
    } else if (zeroInsurance && highBadDebt) {
        let base = 5;
        if (effectiveRevolving > liabilities.badLiability.outstanding * 0.5) base = Math.round(base * 1.5);
        else if (emiCCBalance >= monthlyIncome)                               base = Math.round(base * 1.2);
        fragilityPenalty = Math.min(base, 15);
        flags = ['no_insurance_high_debt'];
    }

    const penalty = revolvingPenalty + fragilityPenalty;

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
        behavior: behavioralTendencies,
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
            fragilityPenalty,
            revolvingPenalty,
            flags,
        }
    };
}
