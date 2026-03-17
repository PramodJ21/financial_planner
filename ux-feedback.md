# UX Feedback — FinHealth (23-yr-old First Job Persona)
Tested as: 23-year-old who just landed their first job, found the website offering a free financial plan.

---

## Landing Page ✅ Strong
- Animated preview card on the right (score counting up, action items checking off) is a great hook — made me want my own score
- "8–12 minutes to finish" and "Save & resume anytime" reduced anxiety and stopped me from bouncing
- Minor: "Wealth Analytics" eyebrow feels corporate/clinical for a young audience — consider something warmer

---

## Registration
- Clean form, no issues
- **Missing: Forgot Password link** on login page
- **Minor friction:** Asking for both Annual Salary AND Monthly Take-Home in Step 2 — a 23-year-old only has a payslip and has to do mental math

---

## Questionnaire — Biggest Drop-off Risk

### Step 1 is too long
- Starts with 4 basic fields (DOB, city, marital status, dependents) — fine
- Then immediately hits 10 generational wealth questions (grandparents' finances, childhood environment, ancestral wealth)
- Felt interrogated, almost closed the tab
- **Fix: Split Step 1 into two steps** — basic profile first, generational wealth as its own step so progress bar moves and user feels momentum

### Steps 4 & 5 — Confusing for beginners
- EPF balance, FD rate, savings as "assets" — first-job person doesn't know these numbers off the top of their head
- Tooltips help but aren't enough
- **Fix: Add "I'm not sure / skip" option** for investment fields without making it feel like the form is broken

### Step 6 (Liabilities) — Good design ✅
- "Add Loan" card pattern is clean
- Starts empty — zero friction for someone with no loans

### Step 8 (Tax) — Near-panic moment
- "80C used", "NPS 80CCD(1B)", "HRA Used" — completely foreign to a first-time filer
- Had to read every tooltip to understand any field
- **Fix: Add a first-time filer callout** — e.g., *"Never done this before? Select 'New Regime' and leave the rest blank — we'll still give you a complete plan."*

### Step 10 (Behavioral) — Best step ✅
- Personality quiz feel, engaging questions
- "Strongly Disagree → Strongly Agree" labels are friendly
- Most fun step in the entire questionnaire

---

## Dashboard

### What worked ✅
- FBS score with "Level up your FBS" section and +X pts badges is genuinely motivating — clicked immediately
- MoneySign archetype (emoji + paragraph) felt personal and was the most engaging element
- "How this is calculated" expandable sections build trust
- KPI cards (Net Worth, Monthly Surplus, etc.) give a real sense of financial snapshot

### What confused me ❌
- **7 sidebar items on first visit** — no guidance on where to start; Investments vs Dashboard felt like duplicate data split across pages
- **"Estate Planning" label is scary for a 23-year-old** — rename to "Nominations & Will" in the sidebar
- **"Keep your financial data current" banner shows immediately after signup** — I just filled the form 2 minutes ago; felt like a bug or that my data wasn't saved
  - The banner serves two purposes: (1) remind returning users to keep data fresh, (2) let any user fix wrong data
  - Hiding it entirely for new users breaks purpose #2 — they'd have no obvious way back if they entered something wrong
  - **Fix: Change the banner copy based on context, not hide it:**
    - Same day as signup → softer copy: *"Something look off? You can edit your answers anytime."* + Edit button
    - Returning user (>30 days since last update) → current urgent copy: *"Keep your financial data current — regular updates ensure the most accurate score."*

---

## Goal Planner — Best Feature, Worst Placement
- Most relatable feature for young users: "I want a car in 3 years, how much do I save monthly?" — it answers this perfectly with SIP chart and yearly projections
- **Currently buried at the bottom of the sidebar**
- **Fix: Make Goal Planner the 2nd sidebar item** right after Dashboard — this is the entry point young users actually care about

---

## Loading State
- Dashboard loading just shows "Loading..." plain text
- **Fix: Add a spinner or the FH logo** — feels unpolished as-is

---

## Summary of All Fixes (Priority Order)

| # | Issue | Fix | Impact |
|---|-------|-----|--------|
| 1 | Step 1 too long | Split into Step 1 (profile) + Step 1b (generational wealth) | Reduces bounce mid-questionnaire |
| 2 | Tax step confusing for beginners | Add first-time filer callout with a safe default | Prevents abandonment at Step 8 |
| 3 | Goal Planner is buried | Move to 2nd position in sidebar | Best feature for target audience |
| 4 | "Estate Planning" label | Rename to "Nominations & Will" | More relatable for young users |
| 5 | Post-signup update banner | Change copy based on context: same-day → "Something look off? Edit anytime"; >30 days → current urgent copy | Removes confusion for new users without removing the escape hatch for fixing wrong data |
| 6 | No skip option for unknown fields | Add "Not sure / skip" for investment fields | Reduces guessing and frustration |
| 7 | Forgot password missing | Add forgot password link on login page | Basic usability |
| 8 | "Loading..." plain text | Add spinner or FH logo | Polish |

---

## Overall Rating: 7/10
Core idea is excellent. Visually the most polished free financial tool seen. MoneySign, FBS action plan with impact points, goal projections — genuinely useful and well thought out.
The questionnaire has walls that will make many 23-year-olds bounce before they see the good stuff.
Smooth out Steps 1 and 8, re-sequence sidebar to lead with Goal Planner → easily a 9/10.
