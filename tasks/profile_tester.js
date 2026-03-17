/**
 * FBS Profile Tester
 * ==================
 * Registers 5 unique real-world financial profiles, fills their questionnaire,
 * then compares the actual FBS score returned by the API against a hand-calculated
 * expected score to verify the scoring engine behaves correctly.
 *
 * Usage:
 *   node tasks/profile_tester.js
 *
 * Requires backend running on http://localhost:5000
 *
 * ── Expected Scores (hand-calculated) ────────────────────────────────────────
 *
 *  #1  Priya Sharma   (23, single, fresh grad, no assets, no debt)       → 37
 *      Foundation:  EF=1  + Insurance=9  + Liabilities=10 = 20
 *      Behaviour:   SIP=0 + Goals=0      + BehTend=6      =  6
 *      Awareness:   Portfolio=3 + Tax=3  + Diversity=5    = 11
 *      Penalty: 0   Total: 37
 *      Note: Gets diversity=5 despite no assets (max alloc=0% < 50% threshold is
 *            a known quirk — zero portfolio passes the diversity check by default)
 *
 *  #2  Rahul Verma    (32, married+1 kid, bad debt, minimal SIP)         → 18
 *      Foundation:  EF=1  + Insurance=9  + Liabilities=2  = 12
 *      Behaviour:   SIP=2 + Goals=0      + BehTend=4      =  6
 *      Awareness:   Portfolio=3 + Tax=3  + Diversity=0    =  6
 *      Penalty: 6 (no_emergency_high_debt)   Total: 24 - 6 = 18
 *
 *  #3  Anjali Patel   (38, married+2 kids, solid professional)           → 83
 *      Foundation:  EF=12 + Insurance=15 + Liabilities=10 = 37
 *      Behaviour:   SIP=12+ Goals=10     + BehTend=8      = 30
 *      Awareness:   Portfolio=8 + Tax=5  + Diversity=3    = 16
 *      Penalty: 0   Total: 83
 *
 *  #4  Vikram Nair    (45, married+2 kids, wealth builder, near-perfect)  → 97
 *      Foundation:  EF=12 + Insurance=15 + Liabilities=10 = 37
 *      Behaviour:   SIP=15+ Goals=15     + BehTend=10     = 40
 *      Awareness:   Portfolio=10 + Tax=5 + Diversity=5    = 20
 *      Penalty: 0   Total: 97
 *
 *  #5  Suresh Kumar   (28, married+1 kid, debt trap, wrong tax regime)   →  8
 *      Foundation:  EF=1  + Insurance=3  + Liabilities=2  =  6
 *      Behaviour:   SIP=0 + Goals=0      + BehTend=2      =  2
 *      Awareness:   Portfolio=1 + Tax=0  + Diversity=5    =  6
 *      Penalty: 6 (no_emergency_high_debt)   Total: 14 - 6 = 8
 */

const API = process.env.VITE_API_URL || "http://localhost:5000/api";
const TOLERANCE = 3; // ±3 pts acceptable drift from expected

// ─── Profile Definitions ─────────────────────────────────────────────────────

const PROFILES = [
  {
    name: "Priya Sharma",
    email: "priya.fbs.test@finhealth.dev",
    password: "Test@1234",
    expectedFBS: 37,
    description: "Fresh Graduate — no assets, no debt, no SIP, no goals",

    steps: {
      1: {
        date_of_birth: "2002-03-16", // Age 23
        city: "Bengaluru",
        marital_status: "Single",
        dependents: 0,
        employment_type: "Salaried",
        risk_comfort: 5,
        investment_experience: "Beginner",
      },
      2: {
        monthly_take_home: 35000,
        annual_salary: 480000,
        business_income: 0,
        annual_bonus: 0,
        other_income: 0,
        expected_income_growth: 8,
      },
      3: {
        expense_household: 5000,
        expense_rent: 8000,
        expense_utilities: 1000,
        expense_transport: 2000,
        expense_food: 4000,
        expense_subscriptions: 500,
        expense_discretionary: 2000,
      },
      4: {
        savings_balance: 0,
        fd_balance: 0,
        fd_rate: 0,
        emergency_fund: 0,
        monthly_surplus: 12500,
      },
      5: {
        inv_direct_stocks: 0,
        inv_equity_mf: 0,
        inv_monthly_sip: 0,
        inv_epf_ppf_nps: 0,
        inv_debt_funds: 0,
        inv_gold_commodities: 0,
        inv_real_estate: 0,
        inv_crypto_alt: 0,
        inv_num_mutual_funds: 0,
      },
      6: { loans: [], credit_card_outstanding: 0, credit_score: 0 },
      7: {
        health_cover: 0,
        health_premium: 0,
        life_cover: 0,
        life_premium: 0,
      },
      8: {
        tax_regime: "New Regime",
        tax_80c_used: 0,
        tax_nps_80ccd: 0,
        tax_hra: 0,
        tax_home_loan_interest: 0,
        tax_80d: 0,
      },
      9: { has_will: "No", nominees_set: "No", num_nominees: 0 },
      10: {
        beh_delay_decisions: 3,
        beh_spend_impulsively: 3,
        beh_review_monthly: 3,
        beh_avoid_debt: 3,
        beh_hold_losing: 3,
        beh_compare_peers: 3,
        beh_market_reaction: 3,
        beh_windfall_behaviour: 3,
        beh_product_understanding: 2, // Below average
      },
    },
    goals: [], // No goals
  },

  {
    name: "Rahul Verma",
    email: "rahul.fbs.test@finhealth.dev",
    password: "Test@1234",
    expectedFBS: 18,
    description: "Struggling Middle — bad debt, CC dues, minimal SIP, fragility penalty",

    steps: {
      1: {
        date_of_birth: "1993-03-16", // Age 32
        city: "Mumbai",
        marital_status: "Married",
        dependents: 1,
        employment_type: "Salaried",
        risk_comfort: 4,
        investment_experience: "Basic",
      },
      2: {
        monthly_take_home: 52000,
        annual_salary: 720000,
        business_income: 0,
        annual_bonus: 0,
        other_income: 0,
        expected_income_growth: 6,
      },
      3: {
        expense_household: 8000,
        expense_rent: 12000,
        expense_utilities: 2000,
        expense_transport: 3000,
        expense_food: 5000,
        expense_subscriptions: 1000,
        expense_discretionary: 5000,
      },
      4: {
        savings_balance: 30000,
        fd_balance: 0,
        fd_rate: 0,
        emergency_fund: 50000, // Only 0.23× ideal → EF=1
        monthly_surplus: 4000,
      },
      5: {
        inv_direct_stocks: 0,
        inv_equity_mf: 0,
        inv_monthly_sip: 2000, // sipRatio=3.3% → sipBase=2
        inv_epf_ppf_nps: 0,
        inv_debt_funds: 0,
        inv_gold_commodities: 0,
        inv_real_estate: 0,
        inv_crypto_alt: 0,
        inv_num_mutual_funds: 0,
      },
      6: {
        loans: [
          {
            type: "Personal Loan",
            outstanding: 400000,
            emi: 12000,
            interestRate: 18,
            tenure: 36,
          },
        ],
        credit_card_outstanding: 80000, // Bad debt, emi=0 in engine
        credit_score: 680,
      },
      7: {
        health_cover: 300000, // 60% of ideal 500K → healthPts=5
        health_premium: 8000,
        life_cover: 5000000, // 50% of ideal 10M → lifePts=4
        life_premium: 12000,
      },
      8: {
        tax_regime: "New Regime",
        tax_80c_used: 0,
        tax_nps_80ccd: 0,
        tax_hra: 0,
        tax_home_loan_interest: 0,
        tax_80d: 0,
      },
      9: { has_will: "No", nominees_set: "No", num_nominees: 0 },
      10: {
        beh_delay_decisions: 4, // Inverted: 6-4=2
        beh_spend_impulsively: 4, // Inverted: 6-4=2
        beh_review_monthly: 2,
        beh_avoid_debt: 2,
        beh_hold_losing: 4, // Inverted: 6-4=2
        beh_compare_peers: 4, // Inverted: 6-4=2
        beh_market_reaction: 3,
        beh_windfall_behaviour: 2,
        beh_product_understanding: 2, // Portfolio=3
      },
    },
    goals: [], // No goals
  },

  {
    name: "Anjali Patel",
    email: "anjali.fbs.test@finhealth.dev",
    password: "Test@1234",
    expectedFBS: 83,
    description: "Solid Professional — full insurance, home loan, 16% SIP, 2 goals",

    steps: {
      1: {
        date_of_birth: "1987-03-16", // Age 38
        city: "Pune",
        marital_status: "Married",
        dependents: 2,
        employment_type: "Salaried",
        risk_comfort: 6,
        investment_experience: "Intermediate",
      },
      2: {
        monthly_take_home: 95000,
        annual_salary: 1500000,
        business_income: 0,
        annual_bonus: 0,
        other_income: 0,
        expected_income_growth: 10,
      },
      3: {
        expense_household: 12000,
        expense_rent: 20000,
        expense_utilities: 3000,
        expense_transport: 5000,
        expense_food: 8000,
        expense_subscriptions: 2000,
        expense_discretionary: 8000,
        // effectiveMonthly ≈ 58000 → idealEF = 58000×6 = 348000
        // emergency=400000 → emRatio=1.15 → EF=12
      },
      4: {
        savings_balance: 100000,
        fd_balance: 0,
        fd_rate: 0,
        emergency_fund: 400000, // 1.15× ideal → EF=12
        monthly_surplus: 15000,
      },
      5: {
        inv_direct_stocks: 0,
        inv_equity_mf: 800000, // equity
        inv_monthly_sip: 20000, // sipRatio=16% → sipBase=12
        inv_epf_ppf_nps: 500000, // debt
        inv_debt_funds: 0,
        inv_gold_commodities: 0,
        inv_real_estate: 0,
        inv_crypto_alt: 0,
        inv_num_mutual_funds: 3,
      },
      6: {
        loans: [
          {
            type: "Home Loan", // Good debt
            outstanding: 2500000,
            emi: 22000,
            interestRate: 8.5,
            tenure: 144,
          },
        ],
        credit_card_outstanding: 0,
        credit_score: 780,
      },
      7: {
        health_cover: 1000000, // ≥idealHealth(750K) → healthPts=8
        health_premium: 20000,
        life_cover: 15000000, // =idealLife(15M) → lifePts=7
        life_premium: 18000,
      },
      8: {
        tax_regime: "New Regime", // matches recommended → taxScore=5
        tax_80c_used: 150000, // hasAnyDeduction=true
        tax_nps_80ccd: 0,
        tax_hra: 0,
        tax_home_loan_interest: 0,
        tax_80d: 0,
      },
      9: { has_will: "Yes", nominees_set: "Yes", num_nominees: 2 },
      10: {
        beh_delay_decisions: 2, // Inverted: 6-2=4
        beh_spend_impulsively: 2, // Inverted: 6-2=4
        beh_review_monthly: 4,
        beh_avoid_debt: 4,
        beh_hold_losing: 2, // Inverted: 6-2=4
        beh_compare_peers: 2, // Inverted: 6-2=4
        beh_market_reaction: 4,
        beh_windfall_behaviour: 4,
        beh_product_understanding: 4, // Portfolio=8
        // rawBehav=36 → round(36/45×10)=8
      },
    },
    goals: [
      // 2 timed goals → goalClarity=10 (risk_level is INTEGER in live DB)
      { id: "g1", name: "Child Education Fund", target: 3000000, years: 12, riskLevel: 2, includeInflation: true, priorityWeight: 4 },
      { id: "g2", name: "Retirement Corpus", target: 20000000, years: 22, riskLevel: 2, includeInflation: true, priorityWeight: 5 },
    ],
  },

  {
    name: "Vikram Nair",
    email: "vikram.fbs.test@finhealth.dev",
    password: "Test@1234",
    expectedFBS: 97,
    description: "Wealth Builder — diversified portfolio, perfect behaviour, 3 goals, near-perfect score",

    steps: {
      1: {
        date_of_birth: "1980-03-16", // Age 45
        city: "Chennai",
        marital_status: "Married",
        dependents: 2,
        employment_type: "Salaried",
        risk_comfort: 8,
        investment_experience: "Expert",
      },
      2: {
        monthly_take_home: 155000,
        annual_salary: 2500000,
        business_income: 0,
        annual_bonus: 0,
        other_income: 0,
        expected_income_growth: 8,
      },
      3: {
        expense_household: 20000,
        expense_rent: 0, // Owns house
        expense_utilities: 5000,
        expense_transport: 8000,
        expense_food: 12000,
        expense_subscriptions: 3000,
        expense_discretionary: 15000,
        // effectiveMonthly=63000 → idealEF=378000
        // emergency=600000 → emRatio=1.59 → EF=12
      },
      4: {
        savings_balance: 200000,
        fd_balance: 500000,
        fd_rate: 7,
        emergency_fund: 600000, // 1.59× ideal → EF=12
        monthly_surplus: 40000,
      },
      5: {
        inv_direct_stocks: 2000000,
        inv_equity_mf: 3000000,
        inv_monthly_sip: 70000, // sipRatio=33.6% → sipBase=15
        inv_epf_ppf_nps: 1500000,
        inv_debt_funds: 0,
        inv_gold_commodities: 500000,
        inv_real_estate: 5000000, // Real estate
        inv_crypto_alt: 0,
        inv_num_mutual_funds: 5,
      },
      6: {
        loans: [
          {
            type: "Home Loan", // Good debt
            outstanding: 1500000,
            emi: 18000,
            interestRate: 8.0,
            tenure: 96,
          },
        ],
        credit_card_outstanding: 0,
        credit_score: 820,
      },
      7: {
        health_cover: 2000000, // ≥idealHealth(1.25M) → healthPts=8
        health_premium: 40000,
        life_cover: 25000000, // =idealLife(25M) → lifePts=7
        life_premium: 35000,
      },
      8: {
        tax_regime: "New Regime", // matches recommended → taxScore=5
        tax_80c_used: 150000, // hasAnyDeduction=true
        tax_nps_80ccd: 50000,
        tax_hra: 0,
        tax_home_loan_interest: 0,
        tax_80d: 0,
      },
      9: { has_will: "Yes", nominees_set: "Yes", num_nominees: 3 },
      10: {
        beh_delay_decisions: 1, // Inverted: 6-1=5
        beh_spend_impulsively: 1, // Inverted: 6-1=5
        beh_review_monthly: 5,
        beh_avoid_debt: 5,
        beh_hold_losing: 1, // Inverted: 6-1=5
        beh_compare_peers: 1, // Inverted: 6-1=5
        beh_market_reaction: 5,
        beh_windfall_behaviour: 5,
        beh_product_understanding: 5, // Portfolio=10
        // rawBehav=45 → round(45/45×10)=10
      },
    },
    goals: [
      // 3 timed goals → goalClarity=15 (risk_level is INTEGER in live DB)
      { id: "g1", name: "Retirement Corpus", target: 50000000, years: 15, riskLevel: 3, includeInflation: true, priorityWeight: 5 },
      { id: "g2", name: "Child 1 Education", target: 5000000, years: 8, riskLevel: 2, includeInflation: true, priorityWeight: 4 },
      { id: "g3", name: "Child 2 Education", target: 5000000, years: 12, riskLevel: 2, includeInflation: true, priorityWeight: 4 },
    ],
  },

  {
    name: "Suresh Kumar",
    email: "suresh.fbs.test@finhealth.dev",
    password: "Test@1234",
    expectedFBS: 8,
    description: "Debt Trap — no EF, no insurance, high bad debt, terrible behaviour, wrong tax regime",

    steps: {
      1: {
        date_of_birth: "1997-03-16", // Age 28
        city: "Hyderabad",
        marital_status: "Married",
        dependents: 1,
        employment_type: "Salaried",
        risk_comfort: 3,
        investment_experience: "None",
      },
      2: {
        monthly_take_home: 43000,
        annual_salary: 600000,
        business_income: 0,
        annual_bonus: 0,
        other_income: 0,
        expected_income_growth: 4,
      },
      3: {
        expense_household: 7000,
        expense_rent: 10000,
        expense_utilities: 2000,
        expense_transport: 3000,
        expense_food: 5000,
        expense_subscriptions: 500,
        expense_discretionary: 6000,
        // effectiveMonthly=33500 → idealEF=201000
      },
      4: {
        savings_balance: 0,
        fd_balance: 0,
        fd_rate: 0,
        emergency_fund: 0, // Zero → EF=1
        monthly_surplus: -3000, // Actually in deficit
      },
      5: {
        inv_direct_stocks: 0,
        inv_equity_mf: 0,
        inv_monthly_sip: 0,
        inv_epf_ppf_nps: 0,
        inv_debt_funds: 0,
        inv_gold_commodities: 0,
        inv_real_estate: 0,
        inv_crypto_alt: 0,
        inv_num_mutual_funds: 0,
      },
      6: {
        loans: [
          {
            type: "Personal Loan", // Bad debt
            outstanding: 250000,
            emi: 9000,
            interestRate: 20,
            tenure: 30,
          },
          {
            type: "Car Loan", // Bad debt
            outstanding: 500000,
            emi: 15000,
            interestRate: 10,
            tenure: 36,
          },
        ],
        credit_card_outstanding: 100000, // Bad, emi=0
        credit_score: 590,
      },
      7: {
        health_cover: 0, // No insurance → healthPts=2
        health_premium: 0,
        life_cover: 0, // No insurance → lifePts=1
        life_premium: 0,
        // insuranceScore=3; zeroInsurance=(3<=2)=false
      },
      8: {
        tax_regime: "Old Regime", // Mismatch: recommended=New → taxScore=0
        tax_80c_used: 0,
        tax_nps_80ccd: 0,
        tax_hra: 0,
        tax_home_loan_interest: 0,
        tax_80d: 0,
      },
      9: { has_will: "No", nominees_set: "No", num_nominees: 0 },
      10: {
        beh_delay_decisions: 5, // Inverted: 6-5=1
        beh_spend_impulsively: 5, // Inverted: 6-5=1
        beh_review_monthly: 1,
        beh_avoid_debt: 1,
        beh_hold_losing: 5, // Inverted: 6-5=1
        beh_compare_peers: 5, // Inverted: 6-5=1
        beh_market_reaction: 1,
        beh_windfall_behaviour: 1,
        beh_product_understanding: 1, // Portfolio=1
        // rawBehav=9 → round(9/45×10)=2
      },
    },
    goals: [], // No goals
  },
];

// ─── API Helpers ──────────────────────────────────────────────────────────────

async function apiPost(path, body, token) {
  const headers = { "Content-Type": "application/json" };
  if (token) headers["Authorization"] = `Bearer ${token}`;
  const res = await fetch(`${API}${path}`, { method: "POST", headers, body: JSON.stringify(body) });
  return { status: res.status, data: await res.json() };
}

async function apiPut(path, body, token) {
  const headers = { "Content-Type": "application/json", "Authorization": `Bearer ${token}` };
  const res = await fetch(`${API}${path}`, { method: "PUT", headers, body: JSON.stringify(body) });
  return { status: res.status, data: await res.json() };
}

async function apiGet(path, token) {
  const res = await fetch(`${API}${path}`, { headers: { "Authorization": `Bearer ${token}` } });
  return { status: res.status, data: await res.json() };
}

// ─── Setup: Register or Login ────────────────────────────────────────────────

async function getToken(profile) {
  // Try login first (handles reruns without needing to delete old data)
  const login = await apiPost("/auth/login", { email: profile.email, password: profile.password });
  if (login.status === 200) return login.data.token;

  // Register if login fails (first run)
  const reg = await apiPost("/auth/register", {
    email: profile.email,
    password: profile.password,
    fullName: profile.name,
  });
  if (reg.status === 201) return reg.data.token;

  throw new Error(`Cannot register or login as ${profile.email}: ${JSON.stringify(reg.data)}`);
}

// ─── Fill Questionnaire ───────────────────────────────────────────────────────

async function fillQuestionnaire(profile, token) {
  for (const [step, data] of Object.entries(profile.steps)) {
    const { status, data: result } = await apiPut(`/questionnaire/step/${step}`, data, token);
    if (status !== 200) {
      throw new Error(`Step ${step} save failed: ${JSON.stringify(result)}`);
    }
  }
}

// ─── Post Goals ──────────────────────────────────────────────────────────────

async function postGoals(profile, token) {
  if (!profile.goals || profile.goals.length === 0) return;
  const { status, data } = await apiPost("/goals", { goals: profile.goals }, token);
  if (status !== 200) {
    throw new Error(`Goals save failed: ${JSON.stringify(data)}`);
  }
}

// ─── Fetch Dashboard ─────────────────────────────────────────────────────────

async function fetchDashboard(token) {
  const { status, data } = await apiGet("/dashboard/full", token);
  if (status !== 200) throw new Error(`Dashboard fetch failed: ${JSON.stringify(data)}`);
  return data;
}

// ─── Print Result ─────────────────────────────────────────────────────────────

function printProfileResult(profile, dashboard, passed) {
  const ov = dashboard.overview;
  const actual = ov.fbs;
  const b = ov.fbsBreakdown;
  const ss = ov.fbsSubScores;
  const frag = ov.fbsFragility;
  const diff = actual - profile.expectedFBS;
  const diffStr = diff > 0 ? `+${diff}` : `${diff}`;
  const status = passed ? "✅ PASS" : "❌ FAIL";

  console.log(`\n${"─".repeat(60)}`);
  console.log(`${status}  ${profile.name}`);
  console.log(`       ${profile.description}`);
  console.log(`${"─".repeat(60)}`);
  console.log(`  Expected FBS : ${profile.expectedFBS}`);
  console.log(`  Actual FBS   : ${actual}   (${diffStr} from expected)`);
  console.log(`  Tolerance    : ±${TOLERANCE}`);

  console.log(`\n  ── Score Breakdown ──────────────────────────────────`);
  console.log(`  Foundation  (max 40): ${ss?.foundation ?? "?"}`);
  console.log(`    Emergency Fund    : ${b?.emergencyFund ?? "?"} / 15`);
  console.log(`    Insurance         : ${b?.insurance ?? "?"} / 15`);
  console.log(`    Liability Mgmt    : ${b?.liabilities ?? "?"} / 10`);
  console.log(`  Behaviour   (max 40): ${ss?.behaviour ?? "?"}`);
  console.log(`    Inv. Regularity   : ${b?.investmentRegularity ?? "?"} / 15`);
  console.log(`    Goal Clarity      : ${b?.goalClarity ?? "?"} / 15`);
  console.log(`    Behav. Tendencies : ${b?.behavioralTendencies ?? "?"} / 10`);
  console.log(`  Awareness   (max 20): ${ss?.awareness ?? "?"}`);
  console.log(`    Portfolio Underst.: ${b?.portfolioUnderstanding ?? "?"} / 10`);
  console.log(`    Tax Literacy      : ${b?.tax ?? "?"} / 5`);
  console.log(`    Asset Diversity   : ${b?.assetDiversity ?? "?"} / 5`);

  if (frag?.penalty > 0) {
    console.log(`\n  ⚠️  Fragility Penalty: -${frag.penalty} (${frag.flags?.join(", ")})`);
  }

  if (!passed) {
    const expected = buildExpectedBreakdown(profile);
    console.log(`\n  ── Expected vs Actual Breakdown ─────────────────────`);
    const fields = [
      ["Emergency Fund", "emergencyFund", "/ 15"],
      ["Insurance", "insurance", "/ 15"],
      ["Liabilities", "liabilities", "/ 10"],
      ["Inv. Regularity", "investmentRegularity", "/ 15"],
      ["Goal Clarity", "goalClarity", "/ 15"],
      ["Behav. Tendencies", "behavioralTendencies", "/ 10"],
      ["Portfolio Underst.", "portfolioUnderstanding", "/ 10"],
      ["Tax Literacy", "tax", "/ 5"],
      ["Asset Diversity", "assetDiversity", "/ 5"],
    ];
    for (const [label, key, max] of fields) {
      const exp = expected[key] ?? "?";
      const act = b?.[key] ?? "?";
      const mark = exp !== "?" && act !== "?" && exp !== act ? "  ← DIFF" : "";
      console.log(`    ${label.padEnd(20)}: expected ${String(exp).padStart(2)} | actual ${String(act).padStart(2)} ${max}${mark}`);
    }
  }
}

// Maps profile comments to expected breakdown scores (for diff display on failure)
function buildExpectedBreakdown(profile) {
  const expected = {
    1: { emergencyFund:1,  insurance:9,  liabilities:10, investmentRegularity:0,  goalClarity:0,  behavioralTendencies:6,  portfolioUnderstanding:3, tax:3, assetDiversity:5 },
    2: { emergencyFund:1,  insurance:9,  liabilities:2,  investmentRegularity:2,  goalClarity:0,  behavioralTendencies:4,  portfolioUnderstanding:3, tax:3, assetDiversity:0 },
    3: { emergencyFund:12, insurance:15, liabilities:10, investmentRegularity:12, goalClarity:10, behavioralTendencies:8,  portfolioUnderstanding:8, tax:5, assetDiversity:3 },
    4: { emergencyFund:12, insurance:15, liabilities:10, investmentRegularity:15, goalClarity:15, behavioralTendencies:10, portfolioUnderstanding:10, tax:5, assetDiversity:5 },
    5: { emergencyFund:1,  insurance:3,  liabilities:2,  investmentRegularity:0,  goalClarity:0,  behavioralTendencies:2,  portfolioUnderstanding:1, tax:0, assetDiversity:5 },
  };
  const idx = PROFILES.indexOf(profile) + 1;
  return expected[idx] || {};
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  console.log(`\n${"═".repeat(60)}`);
  console.log("  FBS PROFILE TESTER");
  console.log(`  API: ${API}`);
  console.log(`  Tolerance: ±${TOLERANCE} points`);
  console.log(`${"═".repeat(60)}`);

  const results = [];

  for (const profile of PROFILES) {
    process.stdout.write(`\n→ Setting up ${profile.name}...`);
    try {
      const token = await getToken(profile);
      process.stdout.write(" logged in.");

      await fillQuestionnaire(profile, token);
      process.stdout.write(" questionnaire filled.");

      await postGoals(profile, token);
      if (profile.goals?.length > 0) process.stdout.write(` ${profile.goals.length} goals posted.`);

      const dashboard = await fetchDashboard(token);
      const actual = dashboard.overview.fbs;
      const passed = Math.abs(actual - profile.expectedFBS) <= TOLERANCE;
      results.push({ name: profile.name, expected: profile.expectedFBS, actual, passed });
      printProfileResult(profile, dashboard, passed);
    } catch (err) {
      console.error(`\n  ERROR for ${profile.name}: ${err.message}`);
      results.push({ name: profile.name, expected: profile.expectedFBS, actual: "ERR", passed: false });
    }
  }

  // ── Summary ────────────────────────────────────────────────────────────────
  console.log(`\n${"═".repeat(60)}`);
  console.log("  SUMMARY");
  console.log(`${"═".repeat(60)}`);
  const passed = results.filter((r) => r.passed).length;
  const failed = results.length - passed;

  for (const r of results) {
    const icon = r.passed ? "✅" : "❌";
    const diff = typeof r.actual === "number" ? ` (${r.actual - r.expected > 0 ? "+" : ""}${r.actual - r.expected})` : "";
    console.log(`  ${icon}  ${r.name.padEnd(18)} expected ${String(r.expected).padStart(3)} | actual ${String(r.actual).padStart(3)}${diff}`);
  }

  console.log(`\n  Result: ${passed}/${results.length} profiles within ±${TOLERANCE} pts`);

  if (failed > 0) {
    console.log(`\n  ── Interpretation Guide ─────────────────────────────`);
    console.log(`  A FAIL means the engine's output differs from what real-world`);
    console.log(`  financial logic would suggest. Check the DIFF lines above`);
    console.log(`  to identify which scoring component is off.`);
    console.log(`  Refer to fbs.md for the scoring rules.`);
  }

  console.log(`\n${"═".repeat(60)}\n`);
  process.exit(failed > 0 ? 1 : 0);
}

main().catch((err) => {
  console.error("Unexpected error:", err.message);
  process.exit(1);
});
