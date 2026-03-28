/**
 * Multi-profile FBS comparison test
 * Run: node tasks/fbs_multi_test.js
 */

// ─── ENGINE (copied from fbstester.js) ───
function getAge(dob) { if (!dob) return 30; return Math.floor((Date.now() - new Date(dob).getTime()) / (365.25 * 24 * 60 * 60 * 1000)); }
function getFBSLifeStage(age) { if (age < 30) return { key: 'EARLY_CAREER', label: 'Early Career' }; if (age < 40) return { key: 'ESTABLISHING', label: 'Establishing' }; if (age < 50) return { key: 'CONSOLIDATING', label: 'Consolidating' }; if (age < 58) return { key: 'PEAK_EARNING', label: 'Peak Earning' }; return { key: 'PRE_RETIREMENT', label: 'Pre-Retirement' }; }
const FBS_WEIGHTS = { EARLY_CAREER: { emergencyFund:16,insurance:11,liabilityManagement:8,investmentRegularity:20,goalClarity:16,behaviouralTendencies:9,portfolioUnderstanding:9,taxLiteracy:2,assetDiversity:9 }, ESTABLISHING: { emergencyFund:16,insurance:16,liabilityManagement:10,investmentRegularity:15,goalClarity:14,behaviouralTendencies:9,portfolioUnderstanding:9,taxLiteracy:6,assetDiversity:5 }, CONSOLIDATING: { emergencyFund:14,insurance:16,liabilityManagement:10,investmentRegularity:13,goalClarity:13,behaviouralTendencies:11,portfolioUnderstanding:10,taxLiteracy:8,assetDiversity:5 }, PEAK_EARNING: { emergencyFund:13,insurance:19,liabilityManagement:10,investmentRegularity:11,goalClarity:10,behaviouralTendencies:12,portfolioUnderstanding:11,taxLiteracy:9,assetDiversity:5 }, PRE_RETIREMENT: { emergencyFund:14,insurance:21,liabilityManagement:11,investmentRegularity:9,goalClarity:8,behaviouralTendencies:12,portfolioUnderstanding:12,taxLiteracy:9,assetDiversity:4 } };
function scaleScore(r,om,nm){if(om===0)return 0;return Math.round((r/om)*nm);}
function getIdealAllocRanges(age){if(age<30)return{equity:[50,85],debt:[0,30],commodity:[0,20],alt:[0,15],realEstate:[0,25]};if(age<=40)return{equity:[40,75],debt:[5,35],commodity:[0,20],alt:[0,15],realEstate:[0,30]};if(age<=50)return{equity:[30,65],debt:[10,40],commodity:[0,20],alt:[0,10],realEstate:[0,35]};if(age<=60)return{equity:[20,50],debt:[20,55],commodity:[0,20],alt:[0,10],realEstate:[0,35]};return{equity:[10,35],debt:[35,65],commodity:[0,15],alt:[0,10],realEstate:[0,35]};}
function computeIncome(p){const s=Number(p.annual_salary)||0,b=Number(p.business_income)||0,bo=Number(p.annual_bonus)||0,o=Number(p.other_income)||0;return{salaried:s,business:b,bonus:bo,other:o,total:s+b+bo+o};}
function computeExpenses(p){const h=Number(p.expense_household)||0,r=Number(p.expense_rent)||0,u=Number(p.expense_utilities)||0,t=Number(p.expense_transport)||0,f=Number(p.expense_food)||0,s=Number(p.expense_subscriptions)||0,d=Number(p.expense_discretionary)||0;const il=Number(p.expense_insurance)||0;const aI=(Number(p.expense_annual_insurance)||0)+(il*12),aE=Number(p.expense_annual_education)||0,aP=Number(p.expense_annual_property)||0,aT=Number(p.expense_annual_travel)||0,aO=Number(p.expense_annual_other)||0;const tAO=aI+aE+aP+aT+aO,tMO=h+r+u+t+f+s+d;return{totalMonthly:tMO,totalAnnualOnly:tAO,effectiveMonthly:tMO+(tAO/12)};}
function computeAssets(p){const st=Number(p.inv_direct_stocks)||0,em=Number(p.inv_equity_mf)||0,ep=Number(p.inv_epf_ppf_nps)||0,df=Number(p.inv_debt_funds)||0,go=Number(p.inv_gold_commodities)||0,re=Number(p.inv_real_estate)||0,cr=Number(p.inv_crypto_alt)||0,fd=Number(p.fd_balance)||0,sa=Number(p.savings_balance)||0;const eq=st+em,de=fd+sa+df+ep,co=go,ai=cr,tot=eq+de+co+re+ai;const pct=(v)=>tot?parseFloat((v/tot*100).toFixed(2)):0;return{total:tot,equity:eq,debt:de,commodity:co,realEstate:re,altInvestments:ai,monthlySip:Number(p.inv_monthly_sip)||0,allocation:{equity:pct(eq),realEstate:pct(re),commodity:pct(co),debt:pct(de),altInvestments:pct(ai)}};}
function computeInsurance(p){const hc=Number(p.health_cover)||0,lc=Number(p.life_cover)||0,ai=Number(p.annual_salary)||0,ih=Math.max(500000,ai*0.5),hd=(Number(p.dependents)||0)>0||p.marital_status==='Married',ril=hd?ai*10:0,il=ril>0?Math.ceil(ril/5000000)*5000000:0;return{healthCover:hc,lifeCover:lc,idealHealth:ih,idealLife:il};}
function computeLiabilities(p){const gt=['Home Loan','Education Loan'];let rl=Array.isArray(p.loans)?p.loans:[],cc=Array.isArray(p.credit_cards)?p.credit_cards:[];let items=rl.map(l=>({type:l.type||'Other Loan',category:gt.includes(l.type)?'Good':'Bad',outstanding:Number(l.outstanding)||0,emi:Number(l.emi)||0,interestRate:Number(l.interestRate)||0}));cc.forEach(c=>{const b=Number(c.balance)||0;if(b<=0)return;const ct=c.type||'revolving';let e=0;if(ct==='emi')e=Number(c.emi_amount)||Math.round(b*0.03);else if(ct==='revolving')e=Math.round(b*0.03);items.push({type:'Credit Card',category:'Bad',outstanding:b,emi:e,interestRate:ct==='revolving'?36:ct==='emi'?18:0,ccType:ct});});let go=0,bo=0,te=0;items.forEach(i=>{te+=i.emi;if(i.category==='Good')go+=i.outstanding;else bo+=i.outstanding;});const to=items.reduce((s,i)=>s+i.outstanding,0),rb=items.filter(i=>i.ccType==='revolving').reduce((s,c)=>s+c.outstanding,0),eb=items.filter(i=>i.ccType==='emi').reduce((s,c)=>s+c.outstanding,0);return{hasLiabilities:to>0,total:to,totalEmi:te,items,creditCards:{revolvingBalance:rb,emiCCBalance:eb},goodLiability:{outstanding:go},badLiability:{outstanding:bo}};}
function computeTax(p){const g=Number(p.annual_salary)||0,b=Number(p.business_income)||0,bo=Number(p.annual_bonus)||0,o=Number(p.other_income)||0,ti=g+b+bo+o;const o80c=Math.min(Number(p.tax_80c_used)||0,150000),o80d=Math.min(Number(p.tax_80d)||0,75000),oHra=Number(p.tax_hra)||0,oHL=Math.min(Number(p.tax_home_loan_interest)||0,200000),o80ccd=Math.min(Number(p.tax_nps_80ccd)||0,50000);const oTD=o80c+o80d+oHra+oHL+o80ccd,oTI=Math.max(0,ti-50000-oTD);function oldTax(t){let x=0;if(t>1000000)x+=(t-1000000)*0.30;if(t>500000)x+=Math.min(t-500000,500000)*0.20;if(t>250000)x+=Math.min(t-250000,250000)*0.05;if(t<=500000)x=0;return Math.round(x*1.04);}const nTI=Math.max(0,ti-75000);function newTax(t){let x=0;if(t>1500000)x+=(t-1500000)*0.30;if(t>1200000)x+=Math.min(t-1200000,300000)*0.20;if(t>1000000)x+=Math.min(t-1000000,200000)*0.15;if(t>700000)x+=Math.min(t-700000,300000)*0.10;if(t>300000)x+=Math.min(t-300000,400000)*0.05;if(t<=700000)x=0;return Math.round(x*1.04);}const oT=oldTax(oTI),nT=newTax(nTI);return{recommended:nT<=oT?'New Regime':'Old Regime',potentialSavings:Math.abs(oT-nT)};}
function computeEmergency(p){const e=computeExpenses(p),a=Number(p.emergency_fund)||0,i=Math.round(e.effectiveMonthly*6);return{emergencyFunds:{actual:a,ideal:i}};}

function computeFBS(p) {
    const assets = computeAssets(p), emergency = computeEmergency(p), insurance = computeInsurance(p), liabilities = computeLiabilities(p), income = computeIncome(p), tax = computeTax(p);
    const monthlyIncome = Number(p.monthly_take_home) || ((income.salaried + income.business) / 12);
    const age = getAge(p.date_of_birth), fbsLifeStage = getFBSLifeStage(age), w = { ...FBS_WEIGHTS[fbsLifeStage.key] };
    const incomeTotal = income.total;
    let taxMax = w.taxLiteracy;
    if (incomeTotal === 0) taxMax = 0;
    else if (incomeTotal < 500000) taxMax = Math.min(w.taxLiteracy, 2);
    else if (incomeTotal < 1200000) taxMax = Math.min(w.taxLiteracy, 5);
    else if (incomeTotal >= 2500000) taxMax = w.taxLiteracy + 2;
    const taxDiff = w.taxLiteracy - taxMax;
    w.taxLiteracy = taxMax;
    w.portfolioUnderstanding += taxDiff;

    // Emergency Fund
    const emRatio = emergency.emergencyFunds.ideal ? emergency.emergencyFunds.actual / emergency.emergencyFunds.ideal : 0;
    let emergencyFundRaw = 1;
    if (emRatio >= 2.0) emergencyFundRaw = 15;
    else if (emRatio >= 1.0) emergencyFundRaw = 12;
    else if (emRatio >= 0.75) emergencyFundRaw = 9;
    else if (emRatio >= 0.5) emergencyFundRaw = 6;
    else if (emRatio >= 0.25) emergencyFundRaw = 3;

    // Insurance
    let insuranceScore;
    if (insurance.idealLife === 0) {
        const fullInsW = w.insurance;
        let healthPts = scaleScore(2, 8, fullInsW);
        if (insurance.healthCover >= insurance.idealHealth) healthPts = fullInsW;
        else if (insurance.idealHealth > 0 && insurance.healthCover >= insurance.idealHealth * 0.5) healthPts = scaleScore(5, 8, fullInsW);
        insuranceScore = healthPts;
    } else {
        const healthMax = Math.round(w.insurance * 8 / 15), lifeMax = w.insurance - healthMax;
        let healthPts = scaleScore(2, 8, healthMax);
        if (insurance.healthCover >= insurance.idealHealth) healthPts = healthMax;
        else if (insurance.idealHealth > 0 && insurance.healthCover >= insurance.idealHealth * 0.5) healthPts = scaleScore(5, 8, healthMax);
        let lifePts = scaleScore(1, 7, lifeMax);
        if (insurance.lifeCover >= insurance.idealLife) lifePts = lifeMax;
        else if (insurance.lifeCover >= insurance.idealLife * 0.5) lifePts = scaleScore(4, 7, lifeMax);
        insuranceScore = healthPts + lifePts;
    }

    // Liabilities
    const emiRatio = monthlyIncome > 0 ? liabilities.totalEmi / monthlyIncome : (liabilities.totalEmi > 0 ? 1 : 0);
    const liquidAssets = assets.total - (assets.realEstate || 0);
    const badOutstanding = liabilities.badLiability.outstanding;
    const cushionRatio = badOutstanding > 0 ? liquidAssets / badOutstanding : Infinity;
    const liabMax = w.liabilityManagement;
    let liabilitiesScore;
    if (!liabilities.hasLiabilities) liabilitiesScore = liabMax;
    else if (liabilities.badLiability.outstanding === 0 && emiRatio <= 0.4) liabilitiesScore = liabMax;
    else if (liabilities.badLiability.outstanding === 0 && emiRatio > 0.4) liabilitiesScore = Math.round(liabMax * 0.4);
    else if (badOutstanding > 0 && cushionRatio >= 5) liabilitiesScore = Math.round(liabMax * 0.8);
    else if (badOutstanding > 0 && cushionRatio >= 2 && emiRatio <= 0.4) liabilitiesScore = Math.round(liabMax * 0.6);
    else if (liabilities.goodLiability.outstanding > badOutstanding && emiRatio <= 0.4) liabilitiesScore = Math.round(liabMax * 0.7);
    else if (liabilities.goodLiability.outstanding > badOutstanding && emiRatio > 0.4) liabilitiesScore = Math.round(liabMax * 0.4);
    else if (cushionRatio >= 1 && emiRatio <= 0.2) liabilitiesScore = Math.round(liabMax * 0.4);
    else if (cushionRatio < 1 && emiRatio <= 0.2) liabilitiesScore = Math.round(liabMax * 0.2);
    else liabilitiesScore = Math.round(liabMax * 0.1);

    // Investment Regularity
    const monthlySip = Number(p.inv_monthly_sip) || 0;
    const sipRatio = income.total > 0 ? (monthlySip * 12 / income.total * 100) : 0;
    let sipBase = 0;
    if (sipRatio > 30) sipBase = 15;
    else if (sipRatio >= 20) sipBase = 14;
    else if (sipRatio >= 15) sipBase = 12;
    else if (sipRatio >= 10) sipBase = 9;
    else if (sipRatio >= 5) sipBase = 6;
    else if (sipRatio > 0) sipBase = 2;
    let sipMul = 1.0;
    if (p.sip_consecutive_months !== undefined) { const m = Number(p.sip_consecutive_months) || 0; if (m >= 6) sipMul = 1.0; else if (m >= 3) sipMul = 0.9; else sipMul = 0.8; }
    const investmentRegularityRaw = Math.round(sipBase * sipMul);

    // Goal Clarity
    let goalClarityRaw = 0;
    if (Array.isArray(p.goals) && p.goals.length > 0) { const tg = p.goals.filter(g => Number(g.years) > 0); if (tg.length >= 3) goalClarityRaw = 15; else if (tg.length === 2) goalClarityRaw = 10; else if (tg.length === 1) goalClarityRaw = 6; else goalClarityRaw = 3; }

    // Behavioural
    const bR = Number(p.beh_review_monthly) || 1, bA = Number(p.beh_avoid_debt) || 1, bM = Number(p.beh_market_reaction) || 1, bW = Number(p.beh_windfall_behaviour) || 1, bP = Number(p.beh_product_understanding) || 1;
    const bD = 6 - (Number(p.beh_delay_decisions) || 5), bI = 6 - (Number(p.beh_spend_impulsively) || 5), bL = 6 - (Number(p.beh_hold_losing) || 5), bC = 6 - (Number(p.beh_compare_peers) || 5);
    const behavRaw = bR + bA + bM + bW + bP + bD + bI + bL + bC;
    const behavioralTendenciesRaw = Math.round((behavRaw / 45) * 10);

    // Portfolio Understanding
    const puVal = Number(p.beh_product_understanding) || 0;
    let portfolioUnderstandingRaw = 0;
    if (puVal === 5) portfolioUnderstandingRaw = 10;
    else if (puVal === 4) portfolioUnderstandingRaw = 8;
    else if (puVal === 3) portfolioUnderstandingRaw = 6;
    else if (puVal === 2) portfolioUnderstandingRaw = 3;
    else if (puVal === 1) portfolioUnderstandingRaw = 1;

    // Tax
    let taxScoreRaw = 0;
    if (incomeTotal > 0) {
        const or = p.tax_regime || 'New Regime';
        const hd = (Number(p.tax_80c_used) || 0) > 0 || (Number(p.tax_nps_80ccd) || 0) > 0 || (Number(p.tax_hra) || 0) > 0 || (Number(p.tax_home_loan_interest) || 0) > 0 || (Number(p.tax_80d) || 0) > 0;
        if (tax.recommended === or && hd) taxScoreRaw = 5;
        else if (tax.recommended === or) taxScoreRaw = 3;
        else if (tax.potentialSavings <= 5000) taxScoreRaw = 2;
    }

    // Asset Diversity
    const alloc = assets.allocation;
    let assetDiversityRaw = 0;
    if (assets.total > 0) {
        const ir = getIdealAllocRanges(age);
        const dev = (a, [mn, mx]) => a >= mn && a <= mx ? 0 : (a < mn ? mn - a : a - mx);
        const td = dev(alloc.equity, ir.equity) + dev(alloc.debt, ir.debt) + dev(alloc.commodity, ir.commodity) + dev(alloc.altInvestments, ir.alt) + dev(alloc.realEstate, ir.realEstate);
        if (td === 0) assetDiversityRaw = 5;
        else if (td <= 15) assetDiversityRaw = 4;
        else if (td <= 30) assetDiversityRaw = 3;
        else if (td <= 50) assetDiversityRaw = 2;
        else if (td <= 70) assetDiversityRaw = 1;
    }

    // Scale
    const sEF = scaleScore(emergencyFundRaw, 15, w.emergencyFund);
    const sIR = scaleScore(investmentRegularityRaw, 15, w.investmentRegularity);
    const sGC = scaleScore(goalClarityRaw, 15, w.goalClarity);
    const sB = scaleScore(behavioralTendenciesRaw, 10, w.behaviouralTendencies);
    const sP = scaleScore(portfolioUnderstandingRaw, 10, w.portfolioUnderstanding);
    const sT = scaleScore(taxScoreRaw, 5, w.taxLiteracy);
    const sD = scaleScore(assetDiversityRaw, 5, w.assetDiversity);

    // Fragility
    const zeroEmergency = emergency.emergencyFunds.actual === 0;
    const zeroInsurance = insurance.healthCover === 0 && insurance.lifeCover === 0;
    const highBadDebt = badOutstanding > 0 && cushionRatio < 2 && (monthlyIncome === 0 || badOutstanding >= monthlyIncome * 2);
    const { revolvingBalance: rb = 0, emiCCBalance: eb = 0 } = liabilities.creditCards || {};
    const rp = monthlyIncome > 0 ? Math.min(10, Math.floor(rb / monthlyIncome) * 3) : (rb > 0 ? Math.min(10, Math.ceil(rb / 50000) * 3) : 0);
    let fp = 0, fl = [];
    if (zeroEmergency && zeroInsurance && highBadDebt) { fp = 15; fl = ['critical_triple_gap']; }
    else if (zeroEmergency && zeroInsurance) { fp = 8; fl = ['no_emergency_no_insurance']; }
    else if (zeroEmergency && highBadDebt) { let base = 6; if (rb > badOutstanding * 0.5) base = Math.round(base * 1.5); else if (eb >= monthlyIncome && monthlyIncome > 0) base = Math.round(base * 1.2); fp = Math.min(base, 15); fl = ['no_emergency_high_debt']; }
    else if (zeroInsurance && highBadDebt) { let base = 5; if (rb > badOutstanding * 0.5) base = Math.round(base * 1.5); else if (eb >= monthlyIncome && monthlyIncome > 0) base = Math.round(base * 1.2); fp = Math.min(base, 15); fl = ['no_insurance_high_debt']; }
    const pen = rp + fp;

    const foundation = sEF + insuranceScore + liabilitiesScore;
    const behaviour = sIR + sGC + sB;
    const awareness = sP + sT + sD;
    const raw = foundation + behaviour + awareness;
    const total = Math.min(100, Math.max(0, raw - pen));

    return {
        total, foundation, behaviour, awareness,
        breakdown: { emergencyFund: sEF, insurance: insuranceScore, liabilities: liabilitiesScore, investmentRegularity: sIR, goalClarity: sGC, behavioralTendencies: sB, portfolioUnderstanding: sP, tax: sT, assetDiversity: sD },
        fMax: w.emergencyFund + w.insurance + w.liabilityManagement,
        bMax: w.investmentRegularity + w.goalClarity + w.behaviouralTendencies,
        aMax: w.portfolioUnderstanding + w.taxLiteracy + w.assetDiversity,
        pen, rp, fp, flags: fl, stage: fbsLifeStage.label, age,
        _keys: { emiRatio: Math.round(emiRatio * 100) / 100, cushionRatio: cushionRatio === Infinity ? 'inf' : Math.round(cushionRatio * 100) / 100, emRatio: Math.round(emRatio * 100) / 100 }
    };
}

// ─── PROFILES ───
const profiles = [
    {
        name: "Ideal early career (26, 6L)",
        p: { date_of_birth: '1999-06-15', marital_status: 'Single', dependents: 0, annual_salary: 600000, monthly_take_home: 42000, expense_household: 5000, expense_rent: 12000, expense_utilities: 2000, expense_transport: 3000, expense_food: 4000, expense_subscriptions: 500, expense_discretionary: 3000, savings_balance: 100000, fd_balance: 50000, emergency_fund: 200000, inv_equity_mf: 150000, inv_monthly_sip: 8000, inv_epf_ppf_nps: 50000, inv_gold_commodities: 25000, sip_consecutive_months: 12, loans: [], credit_cards: [], credit_score: 750, health_cover: 500000, life_cover: 0, tax_regime: 'New Regime', beh_delay_decisions: 2, beh_prefer_guaranteed: 3, beh_follow_market_news: 4, beh_spend_impulsively: 2, beh_review_monthly: 4, beh_avoid_debt: 5, beh_hold_losing: 2, beh_anxious_decisions: 2, beh_familiar_brands: 3, beh_compare_peers: 2, beh_market_reaction: 4, beh_windfall_behaviour: 4, beh_product_understanding: 4, goals: [{ years: 5 }, { years: 10 }, { years: 25 }] }
    },
    {
        name: "Struggling early career (24, 3.6L, CC)",
        p: { date_of_birth: '2001-11-20', marital_status: 'Single', dependents: 0, annual_salary: 360000, monthly_take_home: 28000, expense_household: 4000, expense_rent: 10000, expense_utilities: 1500, expense_transport: 2000, expense_food: 4000, expense_subscriptions: 1000, expense_discretionary: 4000, savings_balance: 15000, fd_balance: 0, emergency_fund: 5000, inv_equity_mf: 0, inv_monthly_sip: 0, sip_consecutive_months: 0, loans: [], credit_cards: [{ name: 'HDFC', balance: 45000, type: 'revolving' }], credit_score: 650, health_cover: 0, life_cover: 0, tax_regime: 'New Regime', beh_delay_decisions: 4, beh_prefer_guaranteed: 4, beh_follow_market_news: 2, beh_spend_impulsively: 4, beh_review_monthly: 2, beh_avoid_debt: 2, beh_hold_losing: 3, beh_anxious_decisions: 4, beh_compare_peers: 4, beh_market_reaction: 2, beh_windfall_behaviour: 2, beh_product_understanding: 2, goals: [] }
    },
    {
        name: "High-income irresponsible (32, 24L)",
        p: { date_of_birth: '1993-03-10', marital_status: 'Married', dependents: 1, annual_salary: 2400000, monthly_take_home: 160000, expense_household: 20000, expense_rent: 35000, expense_utilities: 5000, expense_transport: 10000, expense_food: 15000, expense_subscriptions: 3000, expense_discretionary: 25000, savings_balance: 50000, fd_balance: 0, emergency_fund: 0, inv_equity_mf: 0, inv_monthly_sip: 0, sip_consecutive_months: 0, loans: [{ type: 'Personal Loan', outstanding: 500000, interestRate: 14, emi: 15000, tenure: 48 }], credit_cards: [{ name: 'Amex', balance: 200000, type: 'revolving' }], credit_score: 680, health_cover: 0, life_cover: 0, tax_regime: 'Old Regime', tax_80c_used: 150000, tax_80d: 25000, beh_delay_decisions: 5, beh_prefer_guaranteed: 2, beh_follow_market_news: 3, beh_spend_impulsively: 5, beh_review_monthly: 1, beh_avoid_debt: 1, beh_hold_losing: 4, beh_anxious_decisions: 3, beh_compare_peers: 5, beh_market_reaction: 3, beh_windfall_behaviour: 2, beh_product_understanding: 2, goals: [] }
    },
    {
        name: "Mid-career homeowner (38, 18L+2L)",
        p: { date_of_birth: '1987-07-22', marital_status: 'Married', dependents: 2, annual_salary: 1800000, annual_bonus: 200000, monthly_take_home: 125000, expense_household: 15000, expense_rent: 0, expense_utilities: 4000, expense_transport: 8000, expense_food: 12000, expense_subscriptions: 2000, expense_discretionary: 10000, expense_annual_insurance: 40000, expense_annual_travel: 60000, savings_balance: 300000, fd_balance: 500000, emergency_fund: 400000, inv_direct_stocks: 200000, inv_equity_mf: 800000, inv_monthly_sip: 25000, inv_epf_ppf_nps: 600000, inv_debt_funds: 200000, inv_gold_commodities: 100000, inv_real_estate: 4000000, sip_consecutive_months: 24, loans: [{ type: 'Home Loan', outstanding: 3000000, interestRate: 8.5, emi: 35000, tenure: 180 }], credit_cards: [], credit_score: 780, health_cover: 1000000, life_cover: 5000000, tax_regime: 'Old Regime', tax_80c_used: 150000, tax_nps_80ccd: 50000, tax_hra: 0, tax_home_loan_interest: 200000, tax_80d: 50000, beh_delay_decisions: 2, beh_prefer_guaranteed: 3, beh_follow_market_news: 4, beh_spend_impulsively: 2, beh_review_monthly: 4, beh_avoid_debt: 4, beh_hold_losing: 3, beh_anxious_decisions: 2, beh_familiar_brands: 3, beh_compare_peers: 2, beh_market_reaction: 4, beh_windfall_behaviour: 4, beh_product_understanding: 4, goals: [{ years: 3 }, { years: 10 }, { years: 20 }] }
    },
    {
        name: "Pre-retirement (60, 30L)",
        p: { date_of_birth: '1965-12-01', marital_status: 'Married', dependents: 0, annual_salary: 3000000, monthly_take_home: 200000, expense_household: 25000, expense_rent: 0, expense_utilities: 5000, expense_transport: 5000, expense_food: 10000, expense_subscriptions: 1000, expense_discretionary: 10000, expense_annual_insurance: 80000, expense_annual_travel: 100000, savings_balance: 1000000, fd_balance: 3000000, emergency_fund: 1500000, inv_direct_stocks: 500000, inv_equity_mf: 2000000, inv_monthly_sip: 30000, inv_epf_ppf_nps: 5000000, inv_debt_funds: 2000000, inv_gold_commodities: 500000, inv_real_estate: 8000000, sip_consecutive_months: 60, loans: [], credit_cards: [], credit_score: 800, health_cover: 2500000, life_cover: 5000000, tax_regime: 'Old Regime', tax_80c_used: 150000, tax_nps_80ccd: 50000, tax_80d: 75000, tax_home_loan_interest: 0, beh_delay_decisions: 2, beh_prefer_guaranteed: 4, beh_follow_market_news: 3, beh_spend_impulsively: 1, beh_review_monthly: 5, beh_avoid_debt: 5, beh_hold_losing: 3, beh_anxious_decisions: 3, beh_familiar_brands: 4, beh_compare_peers: 1, beh_market_reaction: 3, beh_windfall_behaviour: 4, beh_product_understanding: 4, goals: [{ years: 5 }, { years: 10 }] }
    },
    {
        name: "Zero-income edge case (27, 1L debt)",
        p: { date_of_birth: '1998-08-01', marital_status: 'Single', dependents: 0, annual_salary: 0, monthly_take_home: 0, expense_household: 5000, expense_rent: 8000, expense_utilities: 2000, expense_transport: 3000, expense_food: 5000, expense_subscriptions: 500, expense_discretionary: 3000, savings_balance: 30000, fd_balance: 0, emergency_fund: 20000, loans: [{ type: 'Personal Loan', outstanding: 100000, interestRate: 13, emi: 5000, tenure: 24 }], credit_cards: [], credit_score: 700, health_cover: 300000, life_cover: 0, tax_regime: 'New Regime', beh_delay_decisions: 3, beh_prefer_guaranteed: 3, beh_follow_market_news: 3, beh_spend_impulsively: 3, beh_review_monthly: 3, beh_avoid_debt: 3, beh_hold_losing: 3, beh_anxious_decisions: 3, beh_compare_peers: 3, beh_market_reaction: 3, beh_windfall_behaviour: 3, beh_product_understanding: 3, goals: [] }
    },
    {
        name: "Rich + small debt (35, 20L inv, 1L debt)",
        p: { date_of_birth: '1990-05-15', marital_status: 'Single', dependents: 0, annual_salary: 1500000, monthly_take_home: 100000, expense_household: 10000, expense_rent: 20000, expense_utilities: 3000, expense_transport: 5000, expense_food: 8000, expense_subscriptions: 2000, expense_discretionary: 10000, savings_balance: 500000, fd_balance: 300000, emergency_fund: 500000, inv_equity_mf: 1000000, inv_monthly_sip: 20000, inv_epf_ppf_nps: 300000, inv_debt_funds: 200000, inv_gold_commodities: 100000, inv_direct_stocks: 500000, sip_consecutive_months: 18, loans: [{ type: 'Personal Loan', outstanding: 100000, interestRate: 12, emi: 5000, tenure: 24 }], credit_cards: [], credit_score: 760, health_cover: 1000000, life_cover: 0, tax_regime: 'New Regime', beh_delay_decisions: 2, beh_prefer_guaranteed: 3, beh_follow_market_news: 4, beh_spend_impulsively: 2, beh_review_monthly: 4, beh_avoid_debt: 4, beh_hold_losing: 2, beh_anxious_decisions: 2, beh_compare_peers: 2, beh_market_reaction: 4, beh_windfall_behaviour: 4, beh_product_understanding: 4, goals: [{ years: 5 }, { years: 15 }] }
    },
];

// ─── OUTPUT ───
console.log('');
console.log('Profile'.padEnd(45) + 'Score  Stage            F(s/max)  B(s/max)  A(s/max)  Pen  Flags');
console.log('-'.repeat(120));
profiles.forEach(({ name, p }) => {
    const r = computeFBS(p);
    const b = r.breakdown;
    console.log(
        name.padEnd(45) +
        String(r.total).padStart(3).padEnd(7) +
        r.stage.padEnd(17) +
        `${r.foundation}/${r.fMax}`.padEnd(10) +
        `${r.behaviour}/${r.bMax}`.padEnd(10) +
        `${r.awareness}/${r.aMax}`.padEnd(10) +
        `-${r.pen}`.padEnd(5) +
        (r.flags.length ? r.flags.join(',') : '-')
    );
});

console.log('\n--- Detailed Breakdown ---\n');
profiles.forEach(({ name, p }) => {
    const r = computeFBS(p);
    const b = r.breakdown;
    console.log(`${name} = ${r.total}/100 (${r.stage}, age ${r.age})`);
    console.log(`  EF:${b.emergencyFund} Ins:${b.insurance} Liab:${b.liabilities} | IR:${b.investmentRegularity} GC:${b.goalClarity} BT:${b.behavioralTendencies} | PU:${b.portfolioUnderstanding} Tax:${b.tax} AD:${b.assetDiversity} | -${r.pen}`);
    console.log(`  emR:${r._keys.emRatio} emiR:${r._keys.emiRatio} cushion:${r._keys.cushionRatio}`);
    console.log('');
});
