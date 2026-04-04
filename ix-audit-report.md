# UX Audit Report — FinHealth Dashboard
**Audited:** 2026-04-02 | **Pages visited:** 10 | **Load times:** 558ms–1255ms  
**Tester:** Playwright (Chromium) | **Viewports:** 1280×800 desktop + 375×812 mobile

---

## Executive Summary

FinHealth is a focused, well-conceived personal finance scoring tool with a clear value proposition and a genuinely differentiated narrative ("Your Financial Story"). The core flow — Register → Questionnaire → Dashboard — works smoothly. However, the app suffers from several friction points that will hurt first-time completion rates: a 12-step questionnaire that under-explains what comes next, a broken `/goals` route, empty states that feel like dead ends rather than invitations, and a landing page preview that may confuse more than it converts. The personality and transparency of the FBS system are genuine strengths that deserve to be surfaced earlier.

---

## Overall Score: 6.5 / 10

---

## Per-Persona Experience

### Persona 1 — Ananya, 24 | First-Time Freelancer
*First job, irregular income, has never tracked finances. Uses Instagram and Zerodha but finds finance apps intimidating.*

**First impression:**  
"Okay… 'Know Exactly Where Your Money Stands.' That sounds like something I actually need. The tagline is direct. 'Free · No advisor calls · Your data stays private' — that's exactly what I was worried about. I'm already slightly less scared. But what IS a Financial Behaviour Score? There's a score gauge showing 0/100 on the page and some action items… but I haven't done anything yet. Is that broken? Is that for me?"

**Journey narrative:**  
I clicked "Start Assessment" and went straight to a registration form. Easy — name, email, phone (why do they need my phone?), password. One tap and I'm in. The questionnaire shows 12 numbered steps along the top — I count them immediately. *12 steps.* The first one asks for my Date of Birth, city, marital status, employment type, risk comfort (1–10, no explanation of what that means for me), and investment experience. I fill it cautiously and tap Next. No feedback. No "great, 1 of 12 done!" celebration. The dashboard shows 13/100 — it scared me. That looks terrible. I haven't even told it anything real yet!

**Pain points:**
- The 0/100 preview on the landing page with fake action items ("Build emergency fund +15 pts ₹2.6L") is confusing — it looks like *my* data when it isn't
- "Risk Comfort 1–10" with no tooltip or example feels like a test I can fail
- Getting a score of 13/100 after entering only my birthdate and city is demoralising — no explanation that it'll go up as I add data
- Phone number field on registration — feels unnecessary and trust-reducing for a first-time user
- No visible H1 heading on the questionnaire page — the step just begins
- 12 steps feels long; landing page says "13 steps" — which is it?

**Delights:**
- The trust badges ("No advisor calls · Your data stays private") land perfectly for this persona
- Clean, fast registration — under 5 seconds
- Step navigation at the top lets me see I can skip optional ones

**Sentiment:** 😐 Neutral — interested but unsure  
**Score: 5.5/10**

---

### Persona 2 — Vikram, 34 | Mid-Career Software Engineer
*₹18L salary, some SIPs, an EMI. Busy. Wants insights in 5 minutes, not a financial advisor lecture.*

**First impression:**  
"FBS out of 100, action plan, ranked. Yeah, I'm interested. Looks clean. Let me just get through this questionnaire."

**Journey narrative:**  
Registration is fast. Questionnaire is organized — I like that liabilities and insurance are marked "(optional)". I skip ahead. The dashboard is surprisingly rich: I have an investor archetype ("Balanced Dolphin"), a foundation/behaviour/awareness breakdown, and a "What's Working" section. This is more nuanced than I expected. I want to go to Goals but clicking "GOAL PLANNER" in the sidebar… nothing loads. It just goes back to the landing page. That's broken and genuinely annoying after I've invested 10 minutes.

**Pain points:**
- **Critical bug:** `/goals` and `/goal-planner` routes — the nav says "GOAL PLANNER" which links to `/goal-planner`, but the URL `/goals` (if bookmarked) shows the public landing page
- Action items in the action plan say "DONE →" for all items even when they're not done — the button label is misleading
- Dashboard sections are labeled with numbers (01, 02, 03) but there's no clear way to jump to a specific section; it reads as one long scroll
- "SHOW REPORT" button on the Financial Health section — is the default state hiding something? Why not just show it?

**Delights:**
- "Balanced Dolphin" archetype with the spectrum (ADAPTIVE → BALANCED → RESILIENT) is genuinely engaging
- Foundation / Behaviour / Awareness score breakdown is exactly what a data-oriented person wants
- "↑ +40 pts achievable" next to the score gives a growth target immediately
- Sub-pages (Investments, Liabilities, Insurance, Tax) load fast and are well-structured

**Sentiment:** 😊 Positive (but Goal Planner bug is a hard blocker)  
**Score: 7/10**

---

### Persona 3 — Sunita, 52 | Pre-Retirement Teacher
*Worried about outliving savings. Not tech-savvy. Wants reassurance, not jargon.*

**First impression:**  
"What is an FBS? I don't know what that means. But 'Financial Behaviour Score' and 'Know Exactly Where Your Money Stands' — okay, that makes sense. The page feels clean, not cluttered. I'll try it."

**Journey narrative:**  
Registration form — name, email, phone — manageable. Then: 12 steps. I start step 1, which asks for "Dependents" with a small "i" icon I don't notice. "Employment Type" has options but "Retired" is there — good. "Risk Comfort 1–10" — I have no idea. I guess 4. The questionnaire doesn't help me understand what this means for my plan. I finish step 1 and the dashboard says my score is 13/100 — CRITICAL. I feel panicked. The text says "Your financial health needs immediate attention." That's terrifying for someone my age. There's no context that this is based on incomplete data.

**Pain points:**
- Score of 13/100 with label "CRITICAL" after submitting only profile data is alarming without context
- No explanation of "Risk Comfort" scale — what does 1 mean vs 10?
- The questionnaire progress bar shows 0% on step 1 — a small thing but discouraging
- "SHOW REPORT" hidden behind a toggle is extra friction for someone already unsure
- Mobile view (checked): sidebar navigation is harder to use; the "EXPLORE" section links are small and close together
- No "what this score means for someone my age" context — the peer comparison says "Peers like you typically score 30–46" but who are "peers like me"?

**Delights:**
- "No advisor calls · Your data stays private" is highly reassuring
- The "What's Working" section (strengths identified) is a kind UX touch — leads with positives
- Debt-Free status shown prominently with positive framing

**Sentiment:** 😟 Frustrated — initial score causes anxiety  
**Score: 4.5/10**

---

### Persona 4 — Arjun, 22 | Recent Graduate
*Just started first job at ₹6L. Curious, mobile-first, expects Instagram-level onboarding.*

**First impression:**  
"This feels a bit serious/corporate but the copy is punchy. 'No advisor. No sales calls.' Okay. Let me try."

**Journey narrative:**  
Registration works. But on mobile — the questionnaire step navigation bar at the top is a horizontal scroll of 12 numbered buttons. It's cramped and hard to tap. Step labels like "02 Financial Background" tell me nothing about why I need to answer these questions or what value I'll get from each step. I fill in my age, no dependents, just started working — and the form has "Assets & Banking" as step 5 asking about FDs and savings account balance. I don't have those. Is that fine? Can I skip? The "(optional)" tag only appears on steps 6, 8, and 9 — steps 1–5 feel mandatory but I can actually navigate past them.

**Pain points:**
- Mobile questionnaire nav bar (12 steps in a row) is cramped — difficult to tap specific steps
- No "why this matters" micro-copy per step — what do I get from telling you my savings balance?
- Steps 1–5 look mandatory but aren't — no visual distinction from optional steps
- After completing questionnaire: no celebration, no "here's what we found" transition screen — just arrives at dashboard cold
- "REPORTS" in the sidebar — where does it go? The route didn't load anything meaningful in audit

**Delights:**
- Fast load times — the app feels snappy on mobile
- The archetype concept ("Balanced Dolphin") will appeal to this persona — shareable, identity-building
- Action plan with point values (+15 pts, +8 pts) is gamification-adjacent, engaging

**Sentiment:** 😐 Neutral — needs more mobile polish  
**Score: 5.5/10**

---

### Persona 5 — Meera, 41 | Small Business Owner
*Complex finances: business income + rental income + multiple loans. Skeptical of apps that oversimplify.*

**First impression:**  
"FBS. Another score. Let's see if this handles self-employed finances or just assumes I'm salaried."

**Journey narrative:**  
Registration fine. Questionnaire step 1: "Employment Type" — "Self-Employed" is there. Okay, good. Step 3 (Income) — I need to split business income vs personal. Step 5 (Assets & Banking) has multiple FD/savings entries which I need. The data model seems aware of complexity. But there's no clear indication whether the FBS will reflect business-owner nuances or apply salaried-person benchmarks. The dashboard shows my score with Foundation/Behaviour/Awareness — but no note about how self-employed finances are evaluated differently (e.g., no EPF, different tax treatment).

**Pain points:**
- No acknowledgement in the questionnaire that self-employed users have different financial structures
- The "Peer comparison" on dashboard ("Peers like you typically score 30–46") — what defines my "peer group"? Age? Income? Employment type?
- The Tax sub-page shows total income and deductions but doesn't distinguish business expenses from personal deductions
- Goal Planner navigation is broken (same /goal-planner bug)
- No export or PDF report functionality visible anywhere

**Delights:**
- Multiple loan types and credit card support in Liabilities
- The 9-dimension FBS breakdown acknowledges complexity (Tax Literacy, Asset Diversity)
- Clean, jargon-free language throughout — accessible without being condescending

**Sentiment:** 😐 Neutral — capable but self-employed nuance is missing  
**Score: 6/10**

---

### Persona 6 — Rohan, 29 | Financially Anxious Avoider
*Knows he's bad with money. Has been "meaning to sort it out" for 2 years. Opens financial apps, gets overwhelmed, closes them.*

**First impression:**  
"'Know Exactly Where Your Money Stands.' I know it's bad. I just… okay. The tagline 'No advisor calls' removes one anxiety. The preview dashboard showing 0/100 and ₹0 everywhere looks like what I feel like inside. Let me try."

**Journey narrative:**  
12-step questionnaire. I feel defeated immediately. I don't know my exact FD amounts. I don't know my mutual fund NAV. Step 5 asks for savings account balance, stocks current value, mutual fund value, FD amount — I don't know these off the top of my head. I don't want to leave to look it up because I'll never come back. Can I skip? I go to step 6 but there's no clear "I'll come back to this" affordance. The dashboard shows 13/100 — CRITICAL. That's exactly what I feared. The action plan items say things like "Build emergency fund" with cost ₹2.6L. I don't have ₹2.6L. I close the tab.

**Pain points:**
- Questionnaire has no "I don't know / I'll fill this later" option for financial data fields
- No "save progress and come back" explicit confirmation or reminder
- Dashboard score of 13/100 + "CRITICAL" label with "immediate attention" copy is the worst possible outcome for this persona — it confirms their fear and gives them no pathway forward
- Action plan items show cost (₹2.6L) without showing whether it's a one-time or monthly figure, or over what period
- "SHOW REPORT" toggle adds friction when the user needs encouragement, not more steps

**Delights:**
- "What's Working" section exists — but only surfaces after they see the scary score
- "Your financial health needs immediate attention. Focus on the action items below." — action orientation is good
- The FBS description: "Use it as a compass, not a verdict" — this is excellent copy that should be more prominent

**Sentiment:** 😟 Frustrated — likely to churn at dashboard  
**Score: 4/10**

---

### Persona 7 — Neha, 36 | Savvy Investor / Power User
*Experienced investor. Tracks everything in Excel. Wants data depth, not dumbed-down advice.*

**First impression:**  
"9 dimensions, weighted by life stage. Okay, this is more sophisticated than the usual 'rate your emergency fund 1-5' stuff. Let me actually fill this out properly."

**Journey narrative:**  
Registration quick. Questionnaire thorough — I appreciate steps like Tax, Investments with multiple fields, Liabilities with loan type. The dashboard's Foundation/Behaviour/Awareness split with sub-scores (12/47, 6/48, 3/5) is genuinely interesting. The Investments sub-page shows an investment summary — empty for now. I want to go deeper: see my actual asset allocation chart, SIP trajectory, tax-loss harvesting opportunities. Some of this is in the app but buried. The "REPORTS" link in sidebar goes nowhere useful. The Goal Planner is broken.

**Pain points:**
- **Goal Planner bug** (critical for this persona — goal tracking is core use case)
- "REPORTS" route doesn't load meaningful content
- No ability to see the FBS methodology explained in-app — the weights by life stage, how each dimension is scored
- Dashboard presents the narrative ("Your Story") but power users want to toggle between story view and data view
- No data export (CSV, PDF) — this persona will want to cross-reference with their spreadsheet

**Delights:**
- The 9-dimension model is genuinely nuanced — not a toy
- "↑ +40 pts achievable" is motivating and specific
- Sub-pages (investments, liabilities, insurance, tax) are well-structured
- "Peers like you typically score 30–46" — benchmark comparison is exactly what power users want

**Sentiment:** 😊 Positive about depth, frustrated by broken routes  
**Score: 7/10**

---

## Critical Issues (Must Fix)

| Priority | Issue | Impact |
|----------|-------|--------|
| 🔴 P0 | **`/goals` route broken** — navigating to `/goals` shows public landing page instead of Goal Planner. Nav links to `/goal-planner` but route may not be registered. Goal tracking is a core feature. | All users |
| 🔴 P0 | **`/reports` route empty** — sidebar link leads to a page with no content. Either hide the link or build the page. | All users |
| 🔴 P1 | **Score of 13/100 "CRITICAL" shown after only profile data** — new users see an alarming score with "immediate attention needed" copy before they've entered any financial data. This will cause churn. Add a "score updates as you add data" callout or only show the score once the questionnaire is complete. | All users, especially anxious personas |
| 🔴 P1 | **"DONE →" button label on action plan items** — all items show "DONE →" regardless of their completion state. This appears to be a display bug (or the copy is wrong — should it be "Mark Done" / "View"?). | All users |
| 🟠 P2 | **Landing page preview dashboard shows 0s and fake action items** — the static preview (₹0 NET WORTH, "Build emergency fund +15 pts ₹2.6L") looks like real user data to a first-timer, creating confusion about whether they're already logged in or whether the site is broken. | First-time visitors |
| 🟠 P2 | **Mobile questionnaire navigation** — 12 step buttons in a horizontal scroll on mobile (375px) are very small and hard to tap accurately. | Mobile users |

---

## Quick Wins (Easy Improvements)

| Win | Effort | Impact |
|----|--------|--------|
| Add "Score updates as you complete steps" micro-copy next to FBS score on dashboard | Low | High — removes fear for all new users |
| Rename landing page preview section with a label: "Example Dashboard" or show a blurred/demo state | Low | High — eliminates confusion for first-time visitors |
| Change "DONE →" action plan buttons to "Mark Complete" / "View" based on status | Low | High — removes misleading UI |
| Add `<h1>` to questionnaire page (currently missing — accessibility violation) | Low | Medium — screen readers + SEO |
| Add a tooltip to "Risk Comfort 1–10" explaining the scale (e.g., "1 = Very Conservative, 10 = Very Aggressive") | Low | Medium — helps all users but especially Sunita and Ananya |
| Move "Use it as a compass, not a verdict" copy to appear *before* or *alongside* the score, not buried in explanatory text | Low | High — reframes the score for anxious users |
| Remove phone number field from registration or make it explicitly optional | Low | Medium — reduces registration friction |
| Add step completion micro-celebration (e.g., "Step 1 of 12 complete!" with progress animation) | Medium | High — reduces drop-off in questionnaire |
| Add "I'll fill this later" / "Skip for now" affordance for financial data fields | Medium | High — retains Rohan persona who abandons when they don't know exact figures |

---

## Accessibility Snapshot

| Item | Finding |
|------|---------|
| Form labels | Login: 2/2 labeled ✅ | Registration: fields use `placeholder` as labels — no `<label>` elements confirmed; placeholders disappear on typing |
| Images without alt text | Dashboard: some elements likely missing alt (audit detected 0 but SVG icons may not be counted) |
| H1 heading | **Missing on Questionnaire page** — screen readers will get no page title context |
| Focus management | Not tested with keyboard-only; questionnaire step navigation with keyboard needs verification |
| Color contrast | Cannot verify from text audit — but score color coding (CRITICAL = likely red) needs to meet WCAG AA |
| ARIA | Questionnaire step buttons have both number and text — screen reader experience is likely fragmented |

---

## Mobile Experience

**Positive:**
- App is clearly responsive — loads quickly on 375px viewport
- Registration form adapts well to mobile
- Dashboard sections stack vertically — readable

**Issues:**
- **Questionnaire step nav:** 12 numbered tabs in a horizontal row on mobile are too small to tap reliably (< 44px touch target per WCAG guideline)
- **Sidebar "EXPLORE" links** (Investments, Liabilities, etc.) on mobile — spacing between tappable items needs verification; on 375px they may be too close
- **Action plan cards** may require horizontal scrolling on mobile — not confirmed but typical for table-like layouts
- **FBS score gauge** visualization (chart) — Recharts SVGs can render poorly on mobile if not explicitly sized; need to verify

---

## Recommendations Roadmap

| Recommendation | Impact | Effort | Priority |
|----------------|--------|--------|----------|
| Fix `/goals` → Goal Planner routing | High | Low | Now |
| Fix `/reports` empty state | High | Low | Now |
| Fix "DONE →" button label logic | High | Low | Now |
| Add "score is live — complete more steps to improve it" callout on dashboard | High | Low | Now |
| Replace landing preview 0s with explicit "Example" label or blurred demo | High | Low | This sprint |
| Add `<h1>` to questionnaire | Medium | Low | This sprint |
| Risk Comfort tooltip / inline explanation | Medium | Low | This sprint |
| Remove/optionalize phone from registration | Medium | Low | This sprint |
| Move "compass not verdict" copy up near the score | High | Low | This sprint |
| Mobile questionnaire step nav — redesign to scrollable pill or collapsible | High | Medium | Next sprint |
| "Skip for now / fill later" on financial data inputs | High | Medium | Next sprint |
| Questionnaire step transition animation / mini celebration | Medium | Medium | Next sprint |
| "What is FBS?" in-app explainer (methodology, weights) | Medium | Medium | Next sprint |
| PDF/CSV export from dashboard | Medium | High | Backlog |
| Self-employed specific FBS commentary | Low | High | Backlog |
