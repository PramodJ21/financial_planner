/**
 * FBS Tester
 * Logs in with a test account and hits GET /dashboard/full to print the FBS score + action plan.
 *
 * Usage:
 *   node tasks/fbstester.js [email] [password]
 *
 * Defaults to the Arjun test profile credentials if no args provided.
 * Make sure the backend is running on http://localhost:5000 before running.
 */

const API = process.env.VITE_API_URL || "http://localhost:5000/api";

const email = process.argv[2] || "arjun@test.com";
const password = process.argv[3] || "password123";

async function login() {
  const res = await fetch(`${API}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });

  const data = await res.json();

  if (!res.ok) {
    console.error("Login failed:", data.error || res.statusText);
    process.exit(1);
  }

  console.log(`Logged in as: ${data.user?.full_name || email}\n`);
  return data.token;
}

async function fetchDashboard(token) {
  const res = await fetch(`${API}/dashboard/full`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  const data = await res.json();

  if (!res.ok) {
    console.error("Dashboard fetch failed:", data.error || res.statusText);
    process.exit(1);
  }

  return data;
}

function printFBS(data) {
  const { fbs, actionPlan, moneySign, income, netWorth, monthlySurplus } = data;

  console.log("=".repeat(50));
  console.log("FBS SCORE BREAKDOWN");
  console.log("=".repeat(50));

  console.log(`\nOverall FBS:       ${fbs?.score ?? "N/A"} / 100`);
  console.log(`Benchmark:         ${fbs?.benchmark ?? "N/A"}`);
  console.log(`Fragility Penalty: ${fbs?.fragility?.penalty ?? 0}`);

  if (fbs?.breakdown) {
    const b = fbs.breakdown;
    console.log("\n--- Tier Breakdown ---");
    console.log(`  Foundation (max 40):  ${b.foundation ?? "N/A"}`);
    console.log(`    Emergency Fund:     ${b.emergencyFund ?? "N/A"} / 15`);
    console.log(`    Insurance:          ${b.insurance ?? "N/A"} / 15`);
    console.log(`    Liability Mgmt:     ${b.liabilities ?? "N/A"} / 10`);
    console.log(`  Behaviour  (max 40):  ${b.behaviour ?? "N/A"}`);
    console.log(`    Inv. Regularity:    ${b.investmentRegularity ?? "N/A"} / 15`);
    console.log(`    Goal Clarity:       ${b.goalClarity ?? "N/A"} / 15`);
    console.log(`    Behav. Tendencies:  ${b.behavioralTendencies ?? "N/A"} / 10`);
    console.log(`  Awareness  (max 20):  ${b.awareness ?? "N/A"}`);
    console.log(`    Portfolio Underst.: ${b.portfolioUnderstanding ?? "N/A"} / 10`);
    console.log(`    Tax Literacy:       ${b.taxLiteracy ?? "N/A"} / 5`);
    console.log(`    Asset Diversity:    ${b.assetDiversity ?? "N/A"} / 5`);
  }

  if (fbs?.fragility?.flags?.length) {
    console.log(`\nFragility Flags: ${fbs.fragility.flags.join(", ")}`);
  }

  console.log("\n--- Key Metrics ---");
  console.log(`  MoneySign:       ${moneySign?.archetype ?? "N/A"}`);
  console.log(`  Total Income:    ₹${(income?.total ?? 0).toLocaleString("en-IN")}`);
  console.log(`  Net Worth:       ₹${(netWorth ?? 0).toLocaleString("en-IN")}`);
  console.log(`  Monthly Surplus: ₹${(monthlySurplus ?? 0).toLocaleString("en-IN")}`);

  if (actionPlan?.length) {
    console.log("\n=".repeat(50));
    console.log(`ACTION PLAN (${actionPlan.length} items)`);
    console.log("=".repeat(50));
    actionPlan.forEach((item, i) => {
      const status = item.status === "completed" ? "[DONE]" : "[    ]";
      console.log(
        `\n${i + 1}. ${status} [+${item.fbsImpact ?? 0} pts] ${item.title}`
      );
      console.log(`   Category: ${item.category}`);
      if (item.description) console.log(`   ${item.description}`);
      if (item.suggestedAmount)
        console.log(`   Suggested: ₹${item.suggestedAmount.toLocaleString("en-IN")}`);
    });
  } else {
    console.log("\nNo action plan items returned.");
  }

  console.log("\n" + "=".repeat(50));
}

async function main() {
  console.log(`API: ${API}`);
  console.log(`Email: ${email}\n`);

  const token = await login();
  const dashboard = await fetchDashboard(token);
  printFBS(dashboard);
}

main().catch((err) => {
  console.error("Unexpected error:", err.message);
  process.exit(1);
});
