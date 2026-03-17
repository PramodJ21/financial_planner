# Frontend UX & Design Audit

**App**: FinHealth — personal finance dashboard for young Indian professionals (22–35)
**Stack**: React 19, Vite 7, Recharts 3, Outfit + Playfair Display fonts
**Audited**: Code-only (no running the app)
**Date**: 2026-03-17

---

## Table of Contents

1. [Welcome](#1-welcome)
2. [Login / Register](#2-login--register)
3. [Questionnaire](#3-questionnaire)
4. [Dashboard (Overview)](#4-dashboard-overview)
5. [Investments](#5-investments)
6. [Liabilities](#6-liabilities)
7. [Insurance](#7-insurance)
8. [Tax](#8-tax)
9. [Reports (Action Plan)](#9-reports-action-plan)
10. [Goal Planner](#10-goal-planner)
11. [Cross-Page Issues](#cross-page-issues)
12. [Top 10 Issues](#top-10-issues-ranked-by-user-impact)
13. [Quick Wins](#quick-wins)
14. [Structural Changes](#structural-changes)
15. [Design Inconsistencies](#design-inconsistencies)

---

## 1. Welcome

**File**: `frontend/src/pages/Welcome.jsx`
**Component**: `AuthPreviewCard.jsx`
**CSS**: `index.css` lines 2928–3086 (auth), 3232–3505 (preview)

### Issues

| # | Issue | Severity | Location | Details |
|---|-------|----------|----------|---------|
| W1 | No mobile responsiveness for auth screens | Critical | `index.css` — no `@media` rules for `.auth-screen`, `.auth-left`, `.auth-right` | The `flex: 1.2` left + `width: 40%` right layout won't stack. The `preview-float` at 520px fixed width overflows. The 44px title needs scaling. First page a user sees is broken on mobile. |
| W2 | Preview card overflows on viewports < 1300px | High | `index.css:3257` — `.preview-float { width: 520px }` | Fixed 520px inside a 40% panel. At 1300px viewport, 40% = 520px exactly — any narrower and it overflows. |
| W3 | Eyebrow + link-small text fails WCAG contrast | High | `index.css:2994` — `.landing-eyebrow { color: #C4BFB8 }`, `index.css:3069` — `.link-small { color: #C4BFB8 }` | `#C4BFB8` on `#F7F4EF` ≈ 2.2:1 contrast ratio. WCAG AA requires 4.5:1 for small text. The "Already have an account?" text nearly disappears. |
| W4 | Preview shows unrelatably high numbers for target audience | Medium | `AuthPreviewCard.jsx:79-81` | ₹1.41Cr net worth, ₹1.56L savings. For a 22-year-old earning ₹6-8L/year, these numbers are alienating. Should show relatable figures or percentages. |
| W5 | "Financial Balance Score" vs "Financial Behaviour Score" mismatch | Medium | `AuthPreviewCard.jsx:136` vs actual dashboard | Preview says "Financial Balance Score" but the real dashboard calls it "Financial Behaviour Score" / FBS. |
| W6 | Description text too thin | Medium | `index.css:3012` — `.landing-desc { font-size: 13px; font-weight: 300 }` | Light weight at small size on a light background is hard to read on lower-DPI screens. |
| W7 | No semantic headings | Medium | `Welcome.jsx:21` | Landing title is a `<div>`, not `<h1>`. Screen readers miss the page heading. |
| W8 | FBS jargon in preview meaningless to new users | Low | `AuthPreviewCard.jsx:119-122` | `+13 FBS`, `+8 FBS` — means nothing before the user has used the app. |
| W9 | Dead imports | Low | `Welcome.jsx:8-9` | `user` from `useAuth()` and `navigate` from `useNavigate()` are imported but never used. |
| W10 | No `prefers-reduced-motion` for animations | Low | `AuthPreviewCard.jsx:52-116` | Infinite animation loop with `setTimeout`/`setInterval` chains. No motion preference check. |
| W11 | `countUp` cleanup not captured | Low | `AuthPreviewCard.jsx:28-39, 71, 79-81` | `countUp()` returns a cancel function but the return value is never stored — potential memory leak. |

---

## 2. Login / Register

**Files**: `frontend/src/pages/Login.jsx`, `frontend/src/pages/Register.jsx`
**CSS**: `index.css` lines 3088–3230 (auth forms)

### Issues

| # | Issue | Severity | Location | Details |
|---|-------|----------|----------|---------|
| L1 | No mobile responsiveness (same as Welcome) | Critical | Same missing `@media` rules | `.auth-screen`, `.auth-left`, `.auth-right`, `.auth-row` have no responsive styles. Register's 2-column password grid is unusable on 320px. |
| L2 | "Forgot password?" is a dead link | High | `Login.jsx:72` — `<Link to="/forgot-password">` | No `/forgot-password` route or page exists anywhere in the codebase. Users who forgot their password are stuck. |
| L3 | Labels not associated with inputs | High | `Login.jsx:46, 55`, `Register.jsx:48-69` | `<label>` elements have no `htmlFor` attribute. Label and input are siblings, not nested. Clicking the label does not focus the input — functional UX bug. |
| L4 | Register inputs are uncontrolled | Medium | `Register.jsx:49, 54, 59, 65, 69` | Inputs use `onChange={handleChange}` but no `value` prop. If `formData` is ever reset (e.g., on error), the inputs won't clear. React anti-pattern. |
| L5 | Error box uses off-palette reds, no `role="alert"` | Medium | `index.css:3202-3210` | Error uses `#FDEEED`, `#B83030`, `#C84040` — three different reds, none matching `var(--red)` (`#8B2626`). No ARIA live region for screen readers. |
| L6 | Forgot password link uses off-palette color | Medium | `Login.jsx:72` — `style={{ color: '#8A9AA8' }}` | Blue-gray `#8A9AA8` exists nowhere else in the app. Breaks the warm palette. Should use `var(--ink-soft)`. |
| L7 | Auth inputs (underline) vs questionnaire inputs (bordered) — visual disconnect | Medium | `index.css:3143` vs `index.css:2498` | Auth fields use `border-bottom` only. Questionnaire uses full `border: 0.5px solid`. Going Register → Questionnaire feels like two different apps. |
| L8 | No `<h1>` — divs used for page titles | Medium | `Login.jsx:39`, `Register.jsx:41` | `<div className="auth-title">` instead of `<h1>`. Same issue as Welcome. |
| L9 | Inline styles on footer links | Low | `Login.jsx:71-75` | Four inline `style={{}}` blocks with `marginTop` and `color` that should be CSS classes. |
| L10 | AuthPreviewCard animation restarts on Login↔Register nav | Low | Both pages render `<AuthPreviewCard />` | New mount on every navigation. Animation restarts jarringly. |
| L11 | Duplicate `border: none` in `.btn-auth` | Low | `index.css:3178, 3189` | Same CSS property declared twice in one rule. |
| L12 | Eyebrow + footer text same WCAG contrast issue as Welcome | High | `index.css:3089` — `.auth-eyebrow { color: #C4BFB8 }`, `index.css:3212` — `.auth-footer { color: #C4BFB8 }` | Same ~2.2:1 contrast ratio problem as Welcome page. |

---

## 3. Questionnaire

**File**: `frontend/src/pages/Questionnaire.jsx` (814 lines, single file)
**CSS**: `index.css` lines 2432–2920 (`.qn-*` classes)

### Issues

| # | Issue | Severity | Location | Details |
|---|-------|----------|----------|---------|
| Q1 | No mobile responsiveness — core user flow broken | Critical | No `@media` rules for `.qn-sidebar`, `.qn-form-grid`, `.qn-scale-options`, `.qn-nav-buttons` | The sidebar renders at full width, `qn-form-grid` 2-column doesn't stack, 5-column scale grid is unreadable, nav buttons have 128px horizontal padding. The entire questionnaire is unusable on mobile — and it's the primary flow. |
| Q2 | 5-column scale grid + 10px labels unreadable on small screens | Critical | `index.css:2542` — `.qn-scale-options { grid-template-columns: repeat(5, 1fr) }`, `index.css:2575` — `.qn-scale-btn .lbl { font-size: 10px }` | Labels like "Multiple props" and "Substantial ₹5Cr+" are cramped at 10px. On mobile, each column would be ~60px wide. |
| Q3 | 3 different info box color schemes, none from design system | High | `Questionnaire.jsx:451` (blue), `Questionnaire.jsx:470` (warm), `Questionnaire.jsx:740` (blue), `Questionnaire.jsx:778` (gray) | Four info boxes across steps use three different color palettes — Tailwind sky blue, warm orange, Tailwind slate gray. All inline styles, no CSS classes. |
| Q4 | "11 steps" displayed but Welcome page says "10 sections" | High | `Questionnaire.jsx:23` — `TOTAL_STEPS = 11`, `Welcome.jsx:27` — "10 sections to complete" | Frontend splits backend step 1 into Profile + Financial Background. Progress bar shows "Step 2 of 11" while the user was promised 10. |
| Q5 | No "Save & Continue Later" despite promise on Welcome page | High | `Welcome.jsx:29` — "Save & resume anytime", `Questionnaire.jsx:91` | Data only saves on "Next Step". Half-filled steps are lost if the user closes the tab. No explicit save button. |
| Q6 | Credit card type defaults to "revolving" | Medium | `Questionnaire.jsx:540` — `{ type: 'revolving' }` | The worst repayment option (revolving/minimum due) is pre-selected when adding a card. Introduces bias. Should default to empty or `'full'`. |
| Q7 | Tax jargon unclear for target audience | Medium | `Questionnaire.jsx:746` — "NPS 80CCD(1B)" | A 22-year-old won't know what "80CCD(1B)" means. Even with `info` tooltips, the label itself is cryptic. |
| Q8 | Info tooltips use `title` attribute — invisible on mobile | Medium | `Questionnaire.jsx:225` — `<span className="qn-info-icon" title={info}>i</span>` | `title` attribute shows on hover only. Mobile users cannot access this information at all. |
| Q9 | Scale question implemented twice | Medium | `Questionnaire.jsx:283-316` (Step1GenWealth) and `Questionnaire.jsx:789-808` (Step10) | Two separate implementations of the same 1-5 Likert scale UI. Should be a shared component. |
| Q10 | Raw `alert()` for save errors | Medium | `Questionnaire.jsx:87` — `alert('Failed to save. Please try again.')` | Browser alert in an otherwise polished UI. Should use a styled error message. |
| Q11 | Dead code: `C` color constants | Low | `Questionnaire.jsx:26-40` | An entire color token object (`navy`, `bg`, `sidebarBg`, etc.) defined but never used in JSX. |
| Q12 | Unused import: `Circle` | Low | `Questionnaire.jsx:4` | `Circle` imported from lucide-react but never used. |
| Q13 | Index-based keys on loan/card lists | Low | `Questionnaire.jsx:576` — `key={idx}` | Index-based keys cause bugs when items are added/removed mid-list. Should use unique IDs. |
| Q14 | Sidebar brand built with 14 inline style properties | Low | `Questionnaire.jsx:104-109` | Brand mark entirely in inline styles instead of using existing `sidebar-brand` CSS. |
| Q15 | Step10 behavior onChange sends value without type | Low | `Questionnaire.jsx:801` — `onChange({ target: { name: q.name, value: val } })` | No `type` property, so `handleInputChange` doesn't convert to number. Values arrive as strings. |
| Q16 | Loan card fields don't use InputField/SelectField components | Low | `Questionnaire.jsx:584-621` | Raw `<input>` and `<select>` instead of the shared components used elsewhere. Inconsistent label styling. |
| Q17 | Empty state uses Tailwind colors foreign to design system | Low | `Questionnaire.jsx:570, 635` | `border: '1px dashed #E2E8F0'`, `color: '#94A3B8'` — Tailwind slate palette, not app colors. |

---

## 4. Dashboard (Overview)

**File**: `frontend/src/pages/Dashboard.jsx` (557 lines)
**Utility**: `frontend/src/utils/financialInsights.js`
**CSS**: Various shared classes (`act-label`, `kpis-grid`, `score-*`, `split-*`, `will-*`, etc.)

### Issues

| # | Issue | Severity | Location | Details |
|---|-------|----------|----------|---------|
| D1 | ~40 inline style blocks — most unstyled-by-CSS page | High | Throughout `Dashboard.jsx` | Hero row, action cards, status tags, MoneySign section, annotation text — nearly every component uses `style={{}}` rather than CSS classes. Makes maintenance and theming impossible. |
| D2 | `dangerouslySetInnerHTML` for narrative | High | `Dashboard.jsx:132` | `overviewNarrative` rendered as raw HTML. If `getOverviewNarrative()` ever incorporates user-provided strings, this is an XSS vector. Currently safe but pattern is dangerous. |
| D3 | Bias tooltips hover-only — inaccessible on mobile/touch | High | `Dashboard.jsx:245-257` | Custom hover tooltips via `onMouseEnter`/`onMouseLeave`. Below: "Hover over a bias to see details". On mobile, hover doesn't exist. Content is completely inaccessible. |
| D4 | 3 items in `double-grid` (2-col) — Insurance orphaned | Medium | `Dashboard.jsx:393` — `<div className="double-grid">` with 3 children | Assets + Liabilities fill row 1, Insurance drops to row 2 alone. Creates a half-empty row. Should be 3-col or a different layout. |
| D5 | "Expenses ↗" links to `/tax` | Medium | `Dashboard.jsx:345` — `<Link to="/tax">` | Clicking on the Expenses section header takes you to the Tax page. Confusing — there's no dedicated expenses page, but linking to Tax is unintuitive. |
| D6 | Mini-panels show only totals — low information density | Medium | `Dashboard.jsx:428-438, 466-476, 501-511` | Assets, Liabilities, Insurance tables each have a single "Total" row. Barely more informative than the Snapshot KPIs already shown above. |
| D7 | 6 pie charts with duplicated zero-data fallback logic | Medium | `Dashboard.jsx:307-308, 352-353, 403-414, 452-458, 490-493` | Each chart has ~200 char inline conditional for handling empty data. Same pattern repeated 6 times. Should be a shared `<DonutChart>` component. |
| D8 | `.act-label` all-caps on 6+ sections — visual monotony | Medium | `Dashboard.jsx:173, 207, 230, 264, 521` | All section headers use the same loud treatment: 22px uppercase bold. With 6 sections, nothing stands out and the page feels like a wall of headers. |
| D9 | No link to Action Plan/Reports page from dashboard | Medium | Entire `Dashboard.jsx` | "What To Do Now" shows 3 items but doesn't link to the full Action Plan page. Users must find it in the sidebar. |
| D10 | 88px FBS score may overflow on narrow mobile | Low | `index.css:1002` — `.score-big { font-size: 88px }` | No responsive font scaling. On a 360px viewport this will likely overflow its container. |
| D11 | Two different section heading styles on one page | Low | `Dashboard.jsx:131` (inline orange 22px) vs `Dashboard.jsx:173` (`.act-label` black 22px) | Hero section uses inline-styled orange heading. All other sections use `.act-label` (black). Inconsistent. |
| D12 | `lifeStage` stored in localStorage | Low | `Dashboard.jsx:44` — `localStorage.setItem('lifeStage', ...)` | Fragile cross-page data sharing. Any page loaded before Dashboard won't have this value. |
| D13 | Income table recalculates totals inline in JSX | Low | `Dashboard.jsx:335-336` | Uses `.reduce()` in render instead of `overview.income.total`. |
| D14 | Expense table falls back from `monthlyBreakdown` to `breakdown` | Low | `Dashboard.jsx:371` | `overview.expenses?.monthlyBreakdown \|\| overview.expenses?.breakdown` — suggests unstable API response structure. |
| D15 | `hoveredBias` state re-renders entire component | Low | `Dashboard.jsx:39` | Tooltip hover triggers re-render of all 6 pie charts. Could cause perceptible lag. |

---

## 5. Investments

**File**: `frontend/src/pages/Investments.jsx` (267 lines)
**Utility**: `frontend/src/utils/financialInsights.js` (367 lines)
**CSS**: Shared classes (`page-content`, `holdings-layout`, `analysis-grid`, `understanding`, etc.)

### Issues

| # | Issue | Severity | Location | Details |
|---|-------|----------|----------|---------|
| I1 | `SectionNote` component uses entirely off-palette inline styles | High | `Investments.jsx:11-21` | `backgroundColor: '#F4F8FC'`, `border: '1px solid #D6E0EB'`, `color: '#8A9AA8'`, `color: '#5C6B7A'`, `color: '#A8B0BA'` — all cold blue/gray tones from a different design system. Clashes with the warm brown/cream palette. |
| I2 | `fmt()` duplicated for the third time | Medium | `Investments.jsx:23-29` | Same currency formatter exists in `Dashboard.jsx:21`, `AuthPreviewCard.jsx:22`, and now here. Should be a shared utility. |
| I3 | `fmtFull()` also duplicated | Medium | `Investments.jsx:30` | Identical to `Dashboard.jsx:34`. |
| I4 | Range bar built with ~10 nested inline style blocks | Medium | `Investments.jsx:198-214` | The allocation range bar (ideal band + current marker + labels) is entirely inline-styled. Approximately 10 `style={{}}` blocks for one visual element. Not reusable, not themeable. |
| I5 | Analysis cards action box uses inline styles instead of CSS | Medium | `Investments.jsx:223` | `background: '#F7F4EF', padding: '10px 14px', borderRadius: '6px', borderLeft: '3px solid #C4703A'` — should be a CSS class. Same pattern appears on Dashboard too. |
| I6 | Understanding section has hardcoded user-specific data | Medium | `Investments.jsx:249-258` | "Your Savings Account (₹60L)" and "Currently at ₹0" are hardcoded strings, not computed from actual user data. These were likely written for a test user and never parameterized. Will show wrong info for every other user. |
| I7 | Goal Planner CTA banner entirely inline-styled | Low | `Investments.jsx:232-238` | Dark background CTA with ~8 inline style properties on the container, ~4 on the text, ~7 on the link. Should be CSS classes. |
| I8 | `holdings-layout` (220px + 1fr) may not work on mobile | Medium | `index.css` — `.holdings-layout { grid-template-columns: 220px 1fr }` | No responsive breakpoint. On mobile, the 220px donut column + table won't fit. Not covered by existing `@media` rules. |
| I9 | Growth color uses three hardcoded hex values | Low | `Investments.jsx:143` | `growthColor` set to `'#2D5A3D'`, `'#92600A'`, or `'#8B2626'` — matches `var(--green)` and `var(--red)` but the amber `#92600A` is not in the design system. |
| I10 | "below inflation" badge inline-styled | Low | `Investments.jsx:152` | `background: '#FDECEA', color: '#8B2626', padding: '3px 8px', borderRadius: '10px'` — appears as an inline pill next to growth %. Should be a CSS class, same pattern used on Dashboard status tags. |
| I11 | Loading/empty states are unstyled | Low | `Investments.jsx:51-52` | `<div>Loading...</div>` and `<div>No data.</div>` — bare divs with no styling. Every other page has a branded loading screen. |
| I12 | Page uses `<h1>` and `<h2>` — inconsistent with other pages | Low | `Investments.jsx:94, 106, 171` | This is the only page that uses semantic heading tags (`<h1 className="page-title">`, `<h2 className="section-heading">`). Dashboard and others use `<div>` for the same elements. This is actually better practice, but inconsistent. |
| I13 | Narrative card uses same warm cream style as Dashboard hero | Low | `Investments.jsx:98` | `background: '#FFFBF5', border: '1px solid #EDE7DC'` — consistent with Dashboard, but still inline rather than a shared CSS class. |
| I14 | Asset class names use camelCase keys displayed via regex | Low | `Dashboard.jsx:423` (used from same data) | `k.replace(/([A-Z])/g, ' $1').trim()` converts `altInvestments` → "alt Investments". Not an Investments.jsx issue per se, but the data flows through here. On Investments page, names are properly mapped via `allocationCards`. |
| I15 | `StatusBadge` component defined but never used | Low | `Investments.jsx:34-41` | `StatusBadge` is defined as a component but the analysis cards inline the same logic at line 191 instead of using it. Dead code. |

### Positive Notes

- **Narrative card** (`getInvestmentNarrative`): Well-written, dynamic, mentions inflation-lagging holdings by count. Good for first-time users.
- **Range bar visualization**: The ideal-band + marker pattern is intuitive — users can immediately see where they stand vs the target range.
- **Action suggestions** (`getAssetAction`): Specific, include ₹ amounts and SIP suggestions based on actual surplus. Excellent.
- **Understanding section**: Explains allocation methodology in plain language. Good educational content (aside from the hardcoded values in I6).
- **Goal Planner CTA**: Dark banner at the bottom is a natural next step. Good cross-page navigation.
- **Semantic headings**: Only page using `<h1>`/`<h2>` — better for accessibility than other pages.

---

## 6. Liabilities

**File**: `frontend/src/pages/Liabilities.jsx` (281 lines)
**CSS**: Shared classes (`page-content`, `liab-layout`, `liab-table`, `analysis-grid`, `cc-grid`, `understanding`, etc.)

### Issues

| # | Issue | Severity | Location | Details |
|---|-------|----------|----------|---------|
| LI1 | Credit Card Evaluation finds only one credit card via `.find()` | High | `Liabilities.jsx:261, 266, 271` | `liab.items?.find((i) => i.type === 'Credit Card')` — finds the **first** credit card only. Users with multiple cards see data from only one. Should aggregate or list all cards. |
| LI2 | `Layout` imported but never used | Medium | `Liabilities.jsx:6` | `import Layout from '../components/Layout'` — dead import. This page is wrapped by Layout via the router, so this import is unnecessary. |
| LI3 | `AlertCircle` imported but never used | Low | `Liabilities.jsx:5` | `import { Landmark, AlertCircle } from 'lucide-react'` — `AlertCircle` is never referenced in JSX. |
| LI4 | `fmt()` and `fmtFull()` duplicated again (4th time) | Medium | `Liabilities.jsx:8-15` | Same formatter as Dashboard, Investments, AuthPreviewCard. See cross-page issue X11. |
| LI5 | Loading/empty states are bare unstyled divs | Medium | `Liabilities.jsx:25-26` | `<div>Loading...</div>` and `<div>No data.</div>` — no styling, no brand mark. Same issue as Investments (I11). See X14. |
| LI6 | "Account Age" column always shows "-" | Medium | `Liabilities.jsx:122` | `<td>-</td>` — hardcoded dash. The column header says "Account Age (mo.)" but the data is never populated. Either remove the column or compute the value. |
| LI7 | Liability Management uses IIFEs inside JSX | Medium | `Liabilities.jsx:146-171, 177-203` | Two `{(() => { ... })()}` blocks compute `outTrack`/`emiTrack` inline. This makes the JSX hard to read. Should be extracted into variables or a sub-component. |
| LI8 | Analysis cards show raw currency for ratio values | Medium | `Liabilities.jsx:233` | Ratios (e.g., "Expense-to-Income", "EMI-to-Income") are financial percentages/multipliers, but `fmt()` renders them as `₹X`. A ratio of 0.45 would display as "₹0" instead of "45%". The `fmt()` function only handles INR amounts, not ratios. |
| LI9 | `liab-layout` (200px + 1fr) not responsive | Medium | `index.css` — `.liab-layout { grid-template-columns: 200px 1fr }` | Same issue as Investments' `holdings-layout`. No `@media` breakpoint — on mobile the donut + table layout won't fit. |
| LI10 | 7-column table overflows on narrow screens | Medium | `Liabilities.jsx:107-115` | 7 columns: Liabilities, Category, Account Age, Pending Months, Outstanding, EMI, Interest Rate. The `table-scroll-wrapper` exists but `liab-table` is not in the mobile `min-width` rules (only `asset-table`, `cashflow-table`, `goals-table` are at `index.css:1703-1706`). |
| LI11 | No narrative or summary section at the top | Medium | — | Unlike Investments (which has `getInvestmentNarrative`) and Dashboard (which has `getOverviewNarrative`), Liabilities jumps straight into data. No plain-language summary explaining the user's debt situation. A first-time user sees numbers without context. |
| LI12 | Understanding sections are static educational text | Low | `Liabilities.jsx:209-216, 244-252` | Two Understanding blocks explain concepts like Good/Bad liability, EMI formula, ratios. The content is well-written and helpful, but it's generic — not personalized. Could reference the user's actual values to be more impactful. |
| LI13 | Good/Bad donut uses hardcoded colors instead of variables | Low | `Liabilities.jsx:75, 95` | `'#2D5A3D'` and `'#8B2626'` — matches `var(--green)` and `var(--red)` but hardcoded. Consistent with Dashboard usage but bypasses the design system. |
| LI14 | Credit score denominator is /900 | Low | `Liabilities.jsx:53` | CIBIL scores range 300–900, so the bar at line 56 (`creditScore / 900 * 100`) is technically correct, but showing `/900` implies the range starts at 0. The bar should show position within 300–900 range, or the denominator should be removed. |
| LI15 | No CTA or next-step link at the bottom | Low | — | Investments has a Goal Planner CTA. Dashboard has action links. Liabilities page just ends after the last Understanding section. No link to Reports/Action Plan to take action on debt issues. |

### Positive Notes

- **Good/Bad liability classification**: Clear visual distinction with color-coded `cat-good`/`cat-bad` badges and separate analysis sections.
- **Liability Management section**: Showing Outstanding + EMI side by side with ideal ranges for both Good and Bad liabilities is informative.
- **Understanding sections**: Two well-written educational blocks explaining liability types, EMI formula, and ratio definitions. Good for first-time finance users.
- **Credit Card Evaluation**: Dedicated section for CC analysis (even if currently limited to first card).
- **Empty donut state**: Uses a `Landmark` icon fallback when no data exists — better than the Dashboard's approach of showing a gray placeholder donut.
- **Credit score bar**: Visual progress bar with fill width proportional to score — quick at-a-glance read.

---

## 7. Insurance

**File**: `frontend/src/pages/Insurance.jsx` (256 lines)
**CSS**: Shared classes (`page-content`, `liab-layout`, `liab-table`, `analysis-grid`, `understanding`, etc.)

### Issues

| # | Issue | Severity | Location | Details |
|---|-------|----------|----------|---------|
| IN1 | Life Insurance Policy Evaluation table has 11 columns, 8 are always "-" | High | `Insurance.jsx:178-197` | Columns: Policy Name, Plan Type, Sum Assured, Policy Before, Annual Premium, Life Cover, Accident Cover, Premium Paid Till Date, Premium Expense, Suggested Action, Surrender Value. Only Policy Name, Plan Type, Sum Assured, and Annual Premium have data. The rest show "-". This table looks broken/empty to users. Either remove unused columns or populate them. |
| IN2 | Recommendation Summary table is structurally confusing | High | `Insurance.jsx:213-237` | The table header says "Traditional / Life Insurance, Sum Assured, Premium, Term (yrs), Plan Document". But the body shows "Additional Cover Recommended" as a row (if needed) and then "Ideal term life cover: ₹X" as another row spanning all columns. The ideal cover is shoved into the first `<td>` of a data row rather than being a heading or KPI. Mixing data rows with label rows in a table is confusing. |
| IN3 | `StatusBadge` component uses entirely different colors than other pages | Medium | `Insurance.jsx:16-27` | Uses `backgroundColor: '#EAF5EF'`/`color: '#1A7A50'` (on track) and `backgroundColor: '#FBECEC'`/`color: '#C04040'` (off track). Other pages use `.status-pill` with `var(--green)`/`var(--red)` and border-only styling. This component also uses inline styles instead of classes, and says "Off track" while other pages say "Outside range". |
| IN4 | `StatusBadge` defined but never used | Medium | `Insurance.jsx:16-27` | The `StatusBadge` component is defined but the analysis section at line 147 uses `.status-pill` CSS classes directly instead. Dead code (same issue as Investments I15). |
| IN5 | Donut chart uses off-palette colors | Medium | `Insurance.jsx:42, 75, 95` | `COLORS_INS = ['#4F79B7', '#111B2E']` defined at line 42 but **never used**. Actual chart uses `'#1C1917'` (close to `var(--ink)` but not exact — `#1C1917` vs `#1C1A17`) and `'#A8A29E'` (a Tailwind stone color, not in the app palette). Dashboard's Insurance donut uses `'#1C1A17'` and `'#C4703A'`. Same data, different colors on different pages. |
| IN6 | `fmt()` and `fmtFull()` duplicated (5th time) | Medium | `Insurance.jsx:7-14` | See cross-page issue X11. |
| IN7 | Loading/empty states are bare unstyled divs | Medium | `Insurance.jsx:37-38` | Same issue as Investments (I11) and Liabilities (LI5). See X14. |
| IN8 | No narrative/summary section | Medium | — | Like Liabilities (LI11), this page jumps straight into data. No plain-language summary like "Your life cover is X, which is Y% of the ideal 10x income. You need an additional Z." Dashboard and Investments both have narrative intros. |
| IN9 | Impact alert box entirely inline-styled | Medium | `Insurance.jsx:242-249` | Red alert box uses ~8 inline style properties. `backgroundColor: '#FBECEC'`, `border: '0.5px solid #C04040'` — uses `#C04040` which is different from `var(--red)` (`#8B2626`). Should be a CSS class. |
| IN10 | Analysis "ideal" shows single value, not a range | Low | `Insurance.jsx:151` | Shows "Ideal: ₹X" but the on-track check uses 80%–150% of ideal (lines 140-142). The user sees one number but is judged against a range they can't see. Should show "Ideal: ₹X – ₹Y" like Investments and Liabilities do. |
| IN11 | Emergency Fund lives on the Insurance page | Low | `Insurance.jsx:136` | Emergency Funds analysis is under "Financial Analysis - Emergency Planning" on the Insurance page. While conceptually related to risk management, most users would look for emergency fund info on the Dashboard or a dedicated section. The grouping feels unintuitive. |
| IN12 | `COLORS_INS` defined but never used | Low | `Insurance.jsx:42` | `const COLORS_INS = ['#4F79B7', '#111B2E']` — dead code. The actual Pie chart at line 75 uses inline conditional colors instead. |
| IN13 | `AlertTriangle` imported but never used | Low | `Insurance.jsx:5` | `import { AlertTriangle, ShieldAlert } from 'lucide-react'` — only `ShieldAlert` is used. Dead import. |
| IN14 | `liab-layout` reused for insurance donut+table layout | Low | `Insurance.jsx:65` | Uses `.liab-layout` (from the Liabilities page CSS) for the coverage summary layout. Works but semantically misleading — insurance is not a liability. Should have its own class name or a shared `.donut-table-layout` class. |

### Positive Notes

- **Coverage Summary table**: Clean, minimal — just Life and Health with Cover Amount and Premium. Easy to scan.
- **Emergency Planning analysis**: Groups Emergency Fund, Health, and Life insurance as a "risk preparedness" triad. Good mental model.
- **Understanding section**: Clear, concise explanations of ideal benchmarks (6 months expenses, 50% income for health, 10x income for life). Actionable.
- **Impact alert**: The red ShieldAlert banner for shortfall is visually prominent and clearly communicates urgency. Good use of color for critical gaps.
- **Empty donut state**: Uses ShieldAlert icon with "No coverage" text — contextually appropriate and better than a gray placeholder.

---

## 8. Tax

**File**: `frontend/src/pages/Tax.jsx` (319 lines)
**CSS**: Shared classes (`page-content`, `analysis-grid`, `tax-rec-box`, `liab-table`, `understanding`, etc.)

### Issues

| # | Issue | Severity | Location | Details |
|---|-------|----------|----------|---------|
| T1 | Tax Overview layout uses fixed `width: '30%'` / `width: '70%'` with no responsive handling | High | `Tax.jsx:88, 140` | `style={{ width: '30%' }}` and `style={{ width: '70%' }}` — on mobile, 30% is ~108px for a pie chart + legend. This is not in any `@media` rule. The layout will be unusable on narrow screens. |
| T2 | Tax Planning section also uses fixed `width: '40%'` / `width: '60%'` | High | `Tax.jsx:220, 235` | Same pattern — bar chart at 40%, table at 60%. No responsive handling. Both sections need to stack on mobile. |
| T3 | Income pie chart data computed twice via IIFEs | Medium | `Tax.jsx:93-116` | The `incData` array is computed identically in two separate IIFEs — once for the `<Pie data={...}>` prop (lines 93-100) and again for the `<Cell>` children (lines 107-112). Duplicated logic in the same render. |
| T4 | Income pie chart uses purple `#6B4C9A` — completely foreign color | Medium | `Tax.jsx:103, 124` | `'Salary Income': '#6B4C9A'` (purple), `'Business Income': '#CBD5E1'` (Tailwind slate), `'Additional Income': '#D97757'` (burnt orange). Purple doesn't appear anywhere else in the app. The app palette is warm brown/orange/cream — purple clashes severely. |
| T5 | `SectionNote` duplicated with different styling than Investments version | Medium | `Tax.jsx:7-17` vs `Investments.jsx:11-21` | Tax uses `backgroundColor: '#F8FAFC'`, `border: '#E8ECF1'`, `color: '#94A3B8'` (Tailwind slate). Investments uses `backgroundColor: '#F4F8FC'`, `border: '#D6E0EB'`, `color: '#8A9AA8'` (blue-gray). Two copies of the same component with different off-palette colors. Neither has a `title` prop like the Investments version. |
| T6 | `COLORS` defined but never used | Low | `Tax.jsx:40` | `const COLORS = ['#1E293B', '#94A3B8']` — dead code. The pie chart uses `COLOR_MAP` inline instead. |
| T7 | `fmt()` and `fmtFull()` duplicated (6th time) | Medium | `Tax.jsx:19-26` | See cross-page issue X11. |
| T8 | Loading/empty states are bare unstyled divs | Medium | `Tax.jsx:36-37` | Same issue as Investments, Liabilities, Insurance. See X14. |
| T9 | Bar chart uses `#3D3B38` — close to but not `var(--ink)` | Low | `Tax.jsx:228` | `fill="#3D3B38"` — a dark gray that's neither `#1C1A17` (`var(--ink)`) nor any other named color. Should use the design system. |
| T10 | "Non-Taxable Component" row always shows ₹0 / ₹0 | Medium | `Tax.jsx:157` | `{ label: 'Non-Taxable Component', old: 0, new_: 0 }` — hardcoded zeros. Either compute the actual value or remove the row. Showing ₹0/₹0 wastes vertical space and confuses users who expect it to have data. |
| T11 | Deduction gap color uses `#D97757` — not in design system | Low | `Tax.jsx:284` | `color: '#D97757'` for the gap column. This is close to `var(--accent)` (`#C4703A`) but not the same. Inconsistent. |
| T12 | "New Regime (opted)" label is always shown regardless of user's actual regime | Medium | `Tax.jsx:150` | `<div>New Regime <span>(opted)</span></div>` — always says "(opted)" for New Regime column. But the user might be on Old Regime. This label should reflect the user's actual `tax_regime` from questionnaire Step 8. |
| T13 | "Actions for the User" label is developer-facing language | Low | `Tax.jsx:308` | `<span>Actions for the User: </span>` — reads like internal documentation rather than user-facing copy. Should be "What you can do" or "Recommended action". |
| T14 | No narrative/summary section at top | Medium | — | Same pattern as Liabilities and Insurance — jumps straight into data. See X17. |
| T15 | Recommendation comparison shows `analysis-value` (36px red) for tax amounts | Low | `Tax.jsx:190, 197` | Tax liability amounts are shown with `.analysis-value` which defaults to `color: var(--red)` — making both regime options look "bad". The recommended one should be green/neutral to create a visual distinction. |

### Positive Notes

- **Old vs New Regime comparison table**: Clear side-by-side layout showing Gross Income → Deductions → Taxable Income → Tax Liability for both regimes. The "Ideal" tag on the recommended column is a strong visual cue.
- **Deduction Utilization table**: Showing Limit, Used, and Gap per section is immediately actionable. Users can see exactly where they're leaving money on the table.
- **Recommendation block**: Two-column comparison with "Recommended" tag, effective rate, and key deduction info. Good decision-support layout.
- **Tax Planning bar chart**: Visual comparison of Current vs Recommended tax liability. Simple and effective.
- **Understanding sections**: Two well-written blocks explaining regime differences and deduction sections. Good educational content for the target audience.

---

## 9. Reports (Action Plan)

**File**: `frontend/src/pages/Reports.jsx` (311 lines)
**CSS**: `index.css` — `.action-group`, `.action-item`, `.action-checkbox`, `.fbs-tag`, etc. (lines 1745–1912)

### Issues

| # | Issue | Severity | Location | Details |
|---|-------|----------|----------|---------|
| R1 | `JSON.parse(JSON.stringify(data))` for deep copy | Medium | `Reports.jsx:40` | Used to clone the full dashboard payload on every status toggle. This is expensive for a large data object and loses any non-serializable values. Should use structured clone or immutable update. |
| R2 | Raw `alert()` for toggle failure | Medium | `Reports.jsx:47` | `alert('Failed to update status')` — same issue as Questionnaire (Q10). Should use a styled error notification. |
| R3 | Expanded item detail panel entirely inline-styled | Medium | `Reports.jsx:194-220` | ~15 inline style properties on the expanded content area. The detail KPIs (Target Amount, Monthly Contribution, Current → Ideal) are all inline-styled. Should be CSS classes matching the design system. |
| R4 | Download produces HTML report with different font family | Medium | `Reports.jsx:76` | Downloaded report uses `font-family: 'Inter'` while the app uses `'Outfit'` + `'Playfair Display'`. The export looks like a different product. |
| R5 | Download report HTML uses Tailwind-style colors | Low | `Reports.jsx:78-97` | Report styles use `#1E293B`, `#475569`, `#64748B`, `#94A3B8`, `#E2E8F0`, `#F1F5F9` — entirely from Tailwind slate palette. Zero overlap with the app's warm palette. |
| R6 | Hidden report div uses `position: absolute; left: -9999px` | Low | `Reports.jsx:239` | The off-screen rendering approach works but is fragile — if the page has `overflow: hidden` on an ancestor, the hidden div could be clipped or cause layout issues. |
| R7 | `fmt()` uses `fmtFull` behavior here (different from other pages) | Medium | `Reports.jsx:5` | `const fmt = (val) => new Intl.NumberFormat(...)` — this is actually the `fmtFull` function from other pages, not the abbreviated `fmt`. But it's named `fmt`. So action items show "₹9,20,000" instead of "₹9.2L". Inconsistent with how the Dashboard's "What To Do Now" cards format the same data. |
| R8 | Loading state uses Tailwind color | Low | `Reports.jsx:26` | `color: '#64748B'` — Tailwind slate-500. Not from app palette. |
| R9 | Empty state returns `null` | Medium | `Reports.jsx:27` | `if (!data) return null` — renders absolutely nothing. Other pages at least show "No data" with a link to the questionnaire. A user on this page with no data sees a blank screen inside the Layout shell. |
| R10 | Progress percentage shown via `.analysis-value` (36px, red by default) | Low | `Reports.jsx:134` | Progress percentage like "45%" is displayed with `.analysis-value` which defaults to `color: var(--red)`. A healthy progress number shouldn't look alarming. Should use `.ok` class or override color. |
| R11 | No FBS score display on this page | Low | — | The action plan's main purpose is to improve FBS. But the current FBS score isn't shown on this page. Users can't see the impact of completing items without going back to Dashboard. |
| R12 | CLAUDE.md says Reports has PDF/XLSX download, but only HTML exists | Low | `Reports.jsx:64-113` | CLAUDE.md lists "jsPDF + jsPDF-AutoTable, XLSX" as dependencies and describes "Action plan tracker — toggle item status, download PDF/XLSX." But the actual implementation only downloads an HTML file. The PDF/XLSX features are missing or were removed. |

### Positive Notes

- **Priority grouping**: Actions organized by urgency (Immediate → High → Recommended → Good to Have) with clear headers and counts. Excellent information architecture.
- **Toggle functionality**: Checkbox toggles send status to backend and update FBS in real-time. The completed state (opacity reduction, strikethrough, green left border) gives clear visual feedback.
- **Expandable details**: Click-to-expand reveals description, target amount, monthly contribution, and allocation changes. Good progressive disclosure — keeps the list scannable.
- **Download report**: Even though it's HTML, the report is well-structured with summary cards, priority sections, and a disclaimer. Print-friendly `@media print` rule included.
- **Disclaimer section**: Important legal notice at the bottom. Good practice for a financial product.
- **Action item design**: The `.action-item` grid layout (checkbox, content, amount, chevron) is well-structured in CSS classes — one of the better-styled components in the app.

---

## 10. Goal Planner

**File**: `frontend/src/pages/GoalPlanner.jsx` (865 lines — largest page component)
**Utilities**: `frontend/src/utils/goalCalculations.js`, `frontend/src/utils/budgetStrategies.js`
**CSS**: `index.css` — `.goals-table`, `.budget-*`, `.strategy-*`, `.detail-tab`, `.breakdown-*`, `.alloc-*`, `.goal-kpis`, etc.

### Issues

| # | Issue | Severity | Location | Details |
|---|-------|----------|----------|---------|
| G1 | 12 unused lucide-react imports | Medium | `GoalPlanner.jsx:7` | `Plus`, `Trash2`, `Target`, `TrendingUp`, `AlertTriangle`, `Edit2`, `Download`, `UploadCloud`, `FileText`, `Info` — none used in JSX. The component uses text characters (`+`, `✎`, `✕`, `↑`, `↓`) instead of icons. `Legend` and `Cell` from Recharts also unused. |
| G2 | 7 dead style objects | Medium | `GoalPlanner.jsx:401-407` | `cardS`, `headerS`, `thS`, `tdS`, `inputS`, `btnPrimary`, `labelS` — all defined as const objects but never referenced in JSX. The component uses CSS classes instead. ~30 lines of dead code. |
| G3 | `fmt()` yet another variant (7th duplication) | Medium | `GoalPlanner.jsx:22-28` | This version uses `.toFixed(2)` for Cr values and puts a space before "Cr" — different from Dashboard's version which uses `.toFixed(1)` and no space. `fmtFull()` at line 30 is also duplicated. See X11. |
| G4 | 10-column goals table overflows on mobile | High | `GoalPlanner.jsx:612-624` | Columns: Goal, Priority, Target, Inflation Adj., Timeline, Risk, Allocation, Return, Monthly SIP, Actions. No horizontal scroll wrapper. The `.goals-table` has `min-width: 500px` in CSS mobile rules, but 10 columns at 500px makes each ~50px wide — unreadable. |
| G5 | Goal form grid `1fr 1fr 1fr` doesn't stack on mobile | High | `GoalPlanner.jsx:495, 510` | `gridTemplateColumns: '1fr 1fr 1fr'` and `'1fr 1fr 2fr'` — inline grid definitions with no responsive handling. On a 360px screen, each column is ~100px. Input labels and fields will be unusable. |
| G6 | PDF report has typo "Plannning" (three n's) | Low | `GoalPlanner.jsx:324` | `doc.text("Financial Goal Plannning Report", ...)` — visible on every exported PDF. |
| G7 | 5 `alert()` calls for user feedback | Medium | `GoalPlanner.jsx:267, 300, 302, 306, 315` | File import errors, success messages, and empty-data warnings all use raw `alert()`. Same issue as Questionnaire (Q10) and Reports (R2). |
| G8 | Chart profit bar uses Tailwind gray `#4A5568` | Low | `GoalPlanner.jsx:803` | `fill="#4A5568"` — Tailwind gray-600, not from the app palette. Invested bar uses `#E8E3DA` (close to palette) and line uses `#C4703A` (correct `var(--accent)`). |
| G9 | Custom tooltip uses off-palette `#111B2E` background | Low | `GoalPlanner.jsx:413` | `backgroundColor: '#111B2E'` — similar to `var(--ink)` (`#1C1A17`) but actually a dark navy. Inconsistent with other tooltip backgrounds in the app. |
| G10 | IIFEs in JSX for form validation and allocation display | Medium | `GoalPlanner.jsx:573-577, 581-595` | Two `{(() => { ... })()}` blocks inside JSX — one for auto-allocation display, one for button disabled state + validation message. Makes JSX hard to read. Should be extracted to `useMemo` or computed variables. |
| G11 | No loading state while fetching goals | Medium | `GoalPlanner.jsx:47-59` | `initialLoadDone` is set after fetch, but there's no loading indicator shown while `initialLoadDone === false`. The page shows the empty state ("No goals added yet") briefly before goals load — flash of empty content. |
| G12 | Custom strategy form has 6 inputs with no validation feedback | Medium | `GoalPlanner.jsx:530-567` | Custom allocation (Equity %, Debt %, Commodity %) and custom returns fields accept any number. No indication if total allocation !== 100% until the user tries to submit. The validation error only appears next to the submit button, far from the inputs. |
| G13 | `DM Serif Display` font referenced in dead style object | Low | `GoalPlanner.jsx:402` | `headerS` uses `fontFamily: "'DM Serif Display', Georgia, serif"` — a font not loaded anywhere in the app. Dead code, but reveals an earlier design iteration using a different font. |
| G14 | Strategy active badge uses hardcoded `rgba(26,122,80,0.1)` | Low | `GoalPlanner.jsx:690` | Green badge background uses raw rgba instead of a CSS variable or derived color. The green `rgb(26,122,80)` doesn't match `var(--green)` (`#2D5A3D` = `rgb(45,90,61)`). |
| G15 | Empty state CTA well-designed but shows before initial load | Low | `GoalPlanner.jsx:846-858` | Good empty state with "Add First Goal" + "Import from Excel" + sample download link. But per G11, it flashes before goals load. |

### Positive Notes

- **Budget strategy system**: When total SIP exceeds budget, the app offers multiple resolution strategies (extend timeline, reduce targets, reprioritize). Excellent UX for financial planning.
- **Strategy comparison**: Selected strategy shows original values struck through with new values in green. Clear visual diff.
- **Excel import/export**: Bidirectional — users can import goals from Excel and export to Excel/PDF. Good for power users and advisors.
- **Auto-save with debounce**: Goals auto-save to backend after 1500ms idle. No manual save needed. Good pattern.
- **Goal detail tabs**: Tabbed view with KPIs, allocation bar, growth chart, and yearly/monthly breakdown tables. Rich information density.
- **Allocation bar visualization**: Proportional segment bar with Equity/Debt/Commodity is immediately readable.
- **Growth chart**: ComposedChart combining stacked bars (invested + profit) with a line (total corpus) is a great visualization choice.
- **Rationale text**: Each goal includes a `rationale` insight box explaining the allocation strategy. Educational.
- **Priority system**: P1-P5 priority weights feed into budget strategy calculations. Good for users with multiple competing goals.
- **CSS classes used well**: Unlike most pages, the goals table, tabs, KPIs, and strategy cards use proper CSS classes (`.goals-table`, `.detail-tab`, `.strategy-card`, `.goal-kpis`). Best CSS hygiene of any page.

---

## Cross-Page Issues

These issues recur across multiple pages and should be fixed systematically.

| # | Issue | Pages Affected | Details |
|---|-------|----------------|---------|
| X1 | **No mobile responsiveness for auth/questionnaire flow** | Welcome, Login, Register, Questionnaire | The entire onboarding flow (first-time user journey) has zero responsive CSS. The only `@media` rules target `.layout`/`.sidebar`/`.main` — the dashboard shell. |
| X2 | **Inline styles vs CSS classes** | All pages, worst on Dashboard + Questionnaire | Dashboard has ~40 inline blocks, Questionnaire info boxes are all inline. Colors, spacing, and font sizes are hardcoded rather than using CSS variables or classes. |
| X3 | **Off-palette colors from Tailwind** | Questionnaire, Dashboard, Tax, Insurance, Reports, GoalPlanner | Colors like `#E2E8F0`, `#94A3B8`, `#BAE6FD`, `#0369A1`, `#64748B`, `#475569`, `#4A5568`, `#6B4C9A` appear in inline styles. These are Tailwind slate/sky palette values, not part of the app's warm brown/orange/cream system. |
| X4 | **WCAG contrast failures** | Welcome, Login, Register | `#C4BFB8` on `#F7F4EF` used for eyebrows, footers, and secondary text. ~2.2:1 ratio vs required 4.5:1. |
| X5 | **No semantic HTML headings** | Welcome, Login, Register, Dashboard | Page titles are `<div>` elements, not `<h1>`/`<h2>`. Screen readers cannot navigate by heading. |
| X6 | **`title` attribute tooltips — invisible on mobile** | Questionnaire, Dashboard | Info icons use `title` for tooltips. Bias tags use hover-only custom tooltips. Touch devices cannot access this content. |
| X7 | **Auth brand mark reimplemented differently on each page** | Welcome, Login, Register, Questionnaire, Sidebar | The "FH" brand box is rebuilt with inline styles on each page. Welcome/Login/Register use `.auth-brand-box`, Questionnaire uses inline styles, Sidebar uses `.sidebar-brand`. Three different implementations of the same mark. |
| X8 | **`fmt()` currency formatter duplicated** | Dashboard, AuthPreviewCard, GoalPlanner | Dashboard defines `fmt()` at line 21. AuthPreviewCard defines `fmtInr()` at line 22. GoalPlanner has yet another variant with different `.toFixed()` precision. |
| X9 | **Loading states use inline styles** | Questionnaire (`line 94`), Dashboard (`line 51`) | Both show "Loading..." with all-inline styles. Should be a shared `<LoadingScreen>` component. |
| X10 | **Index-based keys on dynamic lists** | Dashboard (charts, tables), Questionnaire (loans, cards) | Using `key={idx}` on lists that can be reordered or have items added/removed. |
| X11 | **`fmt()` / `fmtFull()` currency formatters duplicated across files** | Dashboard, Investments, Liabilities, Insurance, Tax, Reports, GoalPlanner, AuthPreviewCard | Same INR formatter defined **7+ times** with slight variations in name (`fmt`, `fmtInr`) and behavior (GoalPlanner's version uses `.toFixed(2)` for Cr, Reports uses `fmtFull` behavior but names it `fmt`). Should be a single shared utility in `utils/`. |
| X12 | **Warm cream card pattern (`#FFFBF5` + `#EDE7DC`) used inline everywhere** | Dashboard, Investments | The narrative/summary card style is copy-pasted as inline styles. Should be a `.card-warm` or similar CSS class. |
| X13 | **`SectionNote` cold-blue palette clashes with app design** | Investments | `SectionNote` component uses `#F4F8FC`, `#D6E0EB`, `#8A9AA8`, `#5C6B7A` — cold blue-gray tones foreign to the warm palette. Same pattern as Tailwind colors in Questionnaire info boxes (X3). |
| X14 | **Loading/empty states inconsistent across pages** | Dashboard (branded), Investments (bare div), Liabilities (bare div), Insurance (bare div), Tax (bare div), Reports (null), GoalPlanner (flash of empty), Questionnaire (branded) | Dashboard and Questionnaire show a branded "FH" loading screen. Investments/Liabilities/Insurance/Tax show `<div>Loading...</div>`. Reports returns `null` (blank screen). GoalPlanner shows empty state before data loads. Should share a `<LoadingScreen>` component. |
| X15 | **Donut + table grid layouts not responsive** | Investments (`holdings-layout` 220px+1fr), Liabilities (`liab-layout` 200px+1fr) | Both use fixed-width left columns for donut charts with no `@media` breakpoint. On mobile, the donut column doesn't stack below the table. |
| X16 | **`liab-table` not included in mobile `min-width` scroll rules** | Liabilities | `index.css:1703-1706` sets `min-width: 500px` for `asset-table`, `cashflow-table`, `goals-table` but not `liab-table`. The 7-column liability table will compress rather than scroll on mobile. |
| X17 | **Pages without narrative summaries** | Liabilities, Insurance, Tax | Investments and Dashboard have narrative intro sections. Liabilities jumps straight into data tables. Inconsistent information architecture. |

---

## Top 10 Issues (Ranked by User Impact)

Ranked by: how many users are affected × how badly it hurts their experience.

| Rank | Issue | Ref | Why it matters |
|------|-------|-----|----------------|
| 1 | **Entire onboarding flow (Welcome → Register → Questionnaire) has zero mobile responsiveness** | W1, L1, Q1, Q2 | Every new user on mobile (likely 60%+ of Indian 22-35 audience) cannot complete signup or the questionnaire. The core conversion funnel is broken. Fixed-width grids, 520px preview cards, 5-column scale grids — none stack. |
| 2 | **`fmt()` / `fmtFull()` duplicated 7+ times with inconsistent behavior** | X11, G3, R7 | The same money amount displays differently on different pages. GoalPlanner shows "₹1.50 Cr", Dashboard shows "₹1.5Cr", Reports shows "₹1,50,00,000". Users lose trust when numbers for the same thing look different. |
| 3 | **Off-palette Tailwind colors scattered across all pages** | X3, T4, IN5, R5 | ~30+ unique off-palette hex values from Tailwind slate/sky/stone/purple palettes. The app looks like three different products stitched together. Tax has purple, Insurance has stone gray, Reports download uses entirely Tailwind slate. Destroys visual coherence. |
| 4 | **Dashboard and detail pages have no mobile responsive CSS** | D10, I8, LI9, LI10, T1, T2, G4, G5, X15 | Beyond onboarding, the dashboard shell has responsive rules but page content doesn't. Fixed `width: '30%'` layouts, 220px grid columns, 10-column tables — all break on mobile. |
| 5 | **WCAG contrast failures on auth screens** | X4, W3, L12 | `#C4BFB8` on `#F7F4EF` (~2.2:1) used for eyebrows, footers, and "Already have an account?" text. Fails AA by 2x. Users with even mild visual impairment can't read these elements. Affects the very first screen. |
| 6 | **Inline styles dominate — ~200+ `style={{}}` blocks across the app** | X2, D1, R3, G2 | Dashboard alone has ~40 inline blocks. GoalPlanner has 7 dead style objects. Makes theming, dark mode, responsive overrides, and maintenance nearly impossible. Every visual change requires touching JSX. |
| 7 | **Loading/empty states inconsistent — some show blank screens** | X14, R9, G11 | Reports returns `null` (completely blank). GoalPlanner flashes empty state before data loads. Investments/Liabilities/Insurance/Tax show bare `<div>Loading...</div>`. Only Dashboard and Questionnaire have branded loading. Users on slow connections see a broken-looking app. |
| 8 | **Hover-only interactions inaccessible on touch devices** | X6, D3, Q8 | Dashboard bias tooltips and Questionnaire info icons are hover-only. On mobile/tablet (the likely primary device for the target audience), this content is completely unreachable. Financial context and explanations are hidden. |
| 9 | **"Forgot password?" is a dead link** | L2 | Links to `/forgot-password` which doesn't exist. A locked-out user has no recovery path — they must create a new account and re-enter all questionnaire data. High-frustration dead end. |
| 10 | **Insurance Policy Evaluation table — 8 of 11 columns always show "-"** | IN1, IN2 | The table looks broken/incomplete. Users see a wall of dashes and question whether their data was saved correctly. The Recommendation Summary table mixes data rows with label rows, adding confusion. |

---

## Quick Wins

Changes that take **under 30 minutes each** and deliver high impact.

| # | Fix | Time | Impact | Refs |
|---|-----|------|--------|------|
| QW1 | **Create shared `utils/formatCurrency.js`** with `fmt()` and `fmtFull()` — replace all 7+ duplicates | 20 min | Eliminates inconsistent number formatting across all pages | X11, G3, R7 |
| QW2 | **Remove dead imports and dead code across all pages** | 15 min | Cleaner bundle, no confusion. Remove: `Circle` (Questionnaire), `Layout`/`AlertCircle` (Liabilities), `AlertTriangle`/`COLORS_INS` (Insurance), `COLORS` (Tax), `StatusBadge` (Investments + Insurance), `C` color constants (Questionnaire), 12 lucide imports + 7 style objects (GoalPlanner) | All pages |
| QW3 | **Add `htmlFor` to all `<label>` elements** on Login/Register | 5 min | Labels become clickable — basic form UX fix | L3 |
| QW4 | **Fix WCAG contrast**: change `#C4BFB8` → `#8A7E74` (or similar) on auth screens | 10 min | Passes 4.5:1 on `#F7F4EF` background. Affects `.landing-eyebrow`, `.link-small`, `.auth-eyebrow`, `.auth-footer` | X4, W3, L12 |
| QW5 | **Remove dead "Forgot password?" link** or replace with `alert('Contact support')` | 2 min | Eliminates dead-end frustration | L2 |
| QW6 | **Fix PDF typo** "Plannning" → "Planning" | 1 min | Visible on every exported PDF | G6 |
| QW7 | **Remove "Account Age" column** from Liabilities table (always shows "-") | 5 min | Cleaner table, less confusion | LI6 |
| QW8 | **Remove 8 empty columns** from Insurance Policy Evaluation table | 10 min | Table goes from 11 columns (8 empty) to 3 useful columns | IN1 |
| QW9 | **Fix "Financial Balance Score" → "Financial Behaviour Score"** in AuthPreviewCard | 2 min | Consistent terminology with rest of app | W5 |
| QW10 | **Replace `alert()` calls** with a simple toast/notification component | 25 min | Affects Questionnaire (1), Reports (1), GoalPlanner (5). Create a minimal `useToast` hook or inline styled div. | Q10, R2, G7 |
| QW11 | **Fix Tax regime label** — show "(opted)" on the user's actual regime, not always on New | 5 min | Correct information display | T12 |
| QW12 | **Remove "Non-Taxable Component" row** (always ₹0/₹0) from Tax comparison | 2 min | Less clutter | T10 |
| QW13 | **Remove hardcoded user data** from Investments Understanding section | 10 min | "Your Savings Account (₹60L)" shows wrong data for every user | I6 |
| QW14 | **Add `value` prop to Register inputs** to make them controlled | 5 min | Fixes React anti-pattern, inputs clear properly on reset | L4 |

---

## Structural Changes

Larger changes worth planning — each requires 1-4 hours and architectural thinking.

| # | Change | Effort | Impact | Details |
|---|--------|--------|--------|---------|
| SC1 | **Mobile responsive CSS for auth + questionnaire flow** | 4 hrs | Critical | Add `@media (max-width: 768px)` rules for `.auth-screen` (stack left/right), `.auth-row` (single column), `.qn-sidebar` (horizontal stepper or collapse), `.qn-form-grid` (single column), `.qn-scale-options` (vertical or 2-col), `.qn-nav-buttons` (full width). This is the #1 user-facing issue. |
| SC2 | **Mobile responsive CSS for all detail pages** | 3 hrs | High | Add breakpoints for: `.holdings-layout`/`.liab-layout` (stack donut above table), Tax `width: '30%'/'70%'` → full width, GoalPlanner form grids → single column, all wide tables → scroll wrapper. |
| SC3 | **Extract inline styles to CSS classes** | 3 hrs | High | Create CSS classes for recurring patterns: `.card-warm` (narrative cards), `.info-box` (replacing 3 different info box schemes), `.status-badge` (unified across pages), `.detail-kpi` (expanded action plan details), `.chart-tooltip`, `.cta-banner`. Target Dashboard first (40+ inline blocks), then GoalPlanner. |
| SC4 | **Unify color palette — eliminate off-palette values** | 2 hrs | High | Audit all hex values and map to CSS variables. Replace ~30 Tailwind colors with palette equivalents. Key changes: purple `#6B4C9A` → `var(--accent)`, stone `#A8A29E` → `var(--ink-ghost)`, various slates → `var(--ink-soft)`. Add CSS variables if needed: `--accent-light`, `--green-light`, `--red-light` for backgrounds. |
| SC5 | **Create shared `<LoadingScreen>` and `<EmptyState>` components** | 1 hr | Medium | Branded loading with "FH" mark (copy from Dashboard). EmptyState with icon, message, and CTA link to questionnaire. Replace bare divs on 6+ pages and `null` return on Reports. |
| SC6 | **Replace hover-only interactions with click/tap accessible patterns** | 2 hrs | Medium | Dashboard bias tooltips → click-to-toggle or always-visible on mobile. Questionnaire info icons → modal/popover on tap instead of `title` attribute. Add `aria-describedby` for screen readers. |
| SC7 | **Consolidate `SectionNote` into a single shared component** | 1 hr | Medium | Currently duplicated in Investments and Tax with different off-palette colors. Create a single `<SectionNote>` component with warm-palette styling matching the design system. Use across Investments, Tax, Insurance, Liabilities. |
| SC8 | **Add semantic HTML headings (`<h1>`/`<h2>`) across all pages** | 1 hr | Medium | Only Investments uses proper heading tags. Change `.page-title` divs to `<h1>` and `.section-heading`/`.act-label` to `<h2>` on all pages. Improves screen reader navigation and SEO. |
| SC9 | **Create shared `<DonutChart>` component** | 1.5 hrs | Medium | Replace 6+ inline Recharts `<Pie>` implementations with a single component handling: data prop, colors, empty state fallback, label formatting. Currently each chart has ~200 chars of inline conditional logic duplicated. |
| SC10 | **Refactor GoalPlanner into sub-components** | 2 hrs | Medium | At 865 lines, it's the largest component. Extract: `<GoalForm>`, `<GoalsTable>`, `<GoalDetail>`, `<BudgetStrategy>`, `<OverallSummary>`. Each is self-contained enough to be a separate file. Would also resolve the 12 dead imports and 7 dead style objects organically. |

---

## Design Inconsistencies

Pages that break from the established design language, ranked by severity of deviation.

| Page | Deviation | Details |
|------|-----------|---------|
| **Tax** | Most visually alien page | Purple `#6B4C9A` in pie chart (unique to this page), Tailwind slate `#CBD5E1` and `#F8FAFC`, bar chart fill `#3D3B38`, deduction gap color `#D97757`. Uses fixed percentage widths instead of grid. Cold-blue `SectionNote` that differs from Investments' cold-blue `SectionNote`. Feels like a completely different app. |
| **Reports (download)** | Export looks like different product | Downloaded HTML uses Inter font (not Outfit), Tailwind slate colors throughout (`#1E293B`, `#475569`, `#64748B`, `#94A3B8`, `#E2E8F0`, `#F1F5F9`). Zero visual connection to the in-app experience. A user comparing the download to the app would question if they came from the same product. |
| **Insurance** | Color inconsistency with Dashboard | Dashboard Insurance donut uses `#1C1A17` + `#C4703A`. Insurance page's own donut uses `#1C1917` (off by 1 char) + `#A8A29E` (Tailwind stone). Same data visualized with different colors on different pages. Impact alert uses `#C04040` (not `var(--red)` `#8B2626`). Two different reds in one app. |
| **Welcome / Auth** | Different visual era from dashboard | Auth screens use `#C4BFB8` secondary text, `#8A9AA8` link color, `#FDEEED`/`#B83030`/`#C84040` error colors. Dashboard uses `var(--ink-soft)`, `var(--ink-ghost)`, `var(--red)`. The auth flow feels like an earlier design iteration that was never updated when the dashboard palette was finalized. |
| **Questionnaire** | Three info box palettes in one page | Sky blue (`#BAE6FD`/`#0369A1`), warm orange (`#FFFBF5`/`#C4703A`), slate gray (`#F1F5F9`/`#475569`). Three visual treatments for the same UI pattern within a single page. The warm orange version matches the design system; the other two don't. |
| **GoalPlanner** | Best CSS hygiene, but still has palette drift | Uses proper CSS classes more than any other page. But chart tooltip background (`#111B2E` dark navy), profit bar fill (`#4A5568` Tailwind gray), strategy badge green (`rgba(26,122,80,0.1)` ≠ `var(--green)`) are all off-palette. Dead style objects reference `DM Serif Display` font — a different font family entirely. |
| **Dashboard** | Correct palette, wrong implementation | Colors are mostly on-palette, but delivered via ~40 inline `style={{}}` blocks. Two different heading styles on one page (inline orange vs `.act-label` black). The design intent is correct, the implementation makes it unmaintainable. |
