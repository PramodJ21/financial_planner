# FinHealth — "Financial Book" Redesign Plan

## Context

The user wants to restructure the entire post-questionnaire experience to feel like reading a book — a linear, narrative-driven scroll where each section builds on the previous one, rather than a traditional dashboard with scattered panels. The concept draws from two analogies:

1. **Storybooks** — Linear flow, each "page" builds on the last, the reader stays engaged and never needs to flip back to understand what's happening
2. **Genshin Impact quest system** — Archon quests (main story), Story quests (character deep-dives), World quests (scattered exploration content)

Mapped to FinHealth:
- **Main Scroll (Archon Quest)** = Dashboard page — 6 numbered chapters, one continuous scroll, tells the user's complete financial story
- **Deep Dives (Story Quests)** = Detail pages (Investments, Liabilities, Insurance, Tax, Estate) — optional depth, linked from main scroll
- **Exploration (World Quests)** = Goal Planner, Reports/Action Tracker — discovered and used over time

**Key constraint from user:** Keep the visual language professional (numbered sections, clean names), not whimsical. The *structure* is inspired by books/games, but the *labels* stay financial. No "Chapter: The Protagonist" — instead "01 — Your Profile".

**This plan covers layout, flow, and interactions only.** Colors, typography, and visual polish are deferred to a later discussion.

---

## Current State

### Layout
- `Layout.jsx`: Fixed sidebar (210px) + scrollable main content area
- `Sidebar.jsx`: Flat nav list — Overview, Goal Planner, Investments, Liabilities, Insurance, Tax, Nominations & Will, Action Plan
- `Dashboard.jsx`: 6 sections (greeting, FBS, actions, snapshot, portfolio, planning) rendered top-to-bottom with collapsible sections and life-stage ordering
- All detail pages are separate routes (`/investments`, `/liabilities`, etc.) wrapped in the same Layout

### What Works
- Single `/dashboard/full` API call powers the dashboard AND all detail pages
- Detail pages are already self-contained deep dives with their own narratives
- Life-stage utility functions exist (`getSectionOrder`, `getRelevantKPIs`, `getDefaultPlanningTab`)
- Financial narrative functions exist (`getOverviewNarrative`, `getBiggestStrength`, `getBiggestGap`, `getInvestmentNarrative`)

### What Needs to Change
- Dashboard needs to become a 6-chapter linear scroll with chapter headers and clear section breaks
- Sidebar needs to split into two groups: Chapters (scroll anchors) + Explore (page links)
- Sidebar needs scroll-spy to highlight the active chapter as user scrolls
- New content needed: Chapter 03 (strengths) and Chapter 04 (gaps) need to be split out from the current mixed narrative
- Chapter 06 (goals) needs a lightweight summary pulled from Goal Planner data

### Questionnaire Changes (separate from layout but prerequisite)
- Add 4 missing behavioral questions to Step 11
- Add `sip_consecutive_months` to Step 6
- Condense generational wealth from 10 → 2-3 questions
- Add 1-2 surplus usage questions
- Start using unused fields (city, employment_type, investment_experience) in calculations

---

## Layout Plan

### Overall Page Structure

```
┌─────────────────────────────────────────────────────┐
│  SIDEBAR (210px, fixed)  │  MAIN SCROLL (flex: 1)   │
│                          │                           │
│  FinHealth.              │  ┌─────────────────────┐  │
│  Wealth Analytics        │  │ 01 — Your Profile   │  │
│                          │  │                     │  │
│  [Edit Answers]          │  │ (content)           │  │
│                          │  │                     │  │
│  ─── YOUR STORY ───      │  ├─────────────────────┤  │
│  01  Your Profile    ●   │  │ 02 — Financial      │  │
│  02  Financial Health    │  │      Health          │  │
│  03  What's Working      │  │                     │  │
│  04  What Needs          │  │ (content)           │  │
│      Attention           │  │                     │  │
│  05  Action Plan         │  ├─────────────────────┤  │
│  06  Your Goals          │  │ 03 — What's Working │  │
│                          │  │                     │  │
│  ─── EXPLORE ───         │  │ (content)           │  │
│  Investments             │  │                     │  │
│  Liabilities             │  │    "Explore →"      │  │
│  Insurance               │  ├─────────────────────┤  │
│  Tax                     │  │ 04 — What Needs     │  │
│  Estate & Will           │  │      Attention      │  │
│  Goal Planner            │  │                     │  │
│  Action Tracker          │  │ (content)           │  │
│                          │  │                     │  │
│  ─────────────────────   │  │    "Explore →"      │  │
│  [Avatar] User Name      │  ├─────────────────────┤  │
│  Sign out                │  │ 05 — Action Plan    │  │
│                          │  │                     │  │
│                          │  │ (content)           │  │
│                          │  │                     │  │
│                          │  │  "View all actions" │  │
│                          │  ├─────────────────────┤  │
│                          │  │ 06 — Your Goals     │  │
│                          │  │                     │  │
│                          │  │ (content)           │  │
│                          │  │                     │  │
│                          │  │  "Open Goal         │  │
│                          │  │   Planner →"        │  │
│                          │  └─────────────────────┘  │
└─────────────────────────────────────────────────────┘
```

### Sidebar — Two Groups

**Group 1: "Your Story"** (scroll-to anchors on `/dashboard`)
- These are NOT route links. Clicking them smooth-scrolls to the corresponding `#chapter-XX` element on the dashboard
- The currently visible chapter is highlighted (scroll spy via IntersectionObserver)
- Items: 01 Your Profile, 02 Financial Health, 03 What's Working, 04 What Needs Attention, 05 Action Plan, 06 Your Goals
- When user is on a detail page (not `/dashboard`), these items navigate to `/dashboard#chapter-XX` (route change + scroll)
- **Always visible** — both groups show on every page regardless of current route

**Group 2: "Explore"** (route links to detail pages)
- Standard route links, same as current but regrouped
- Items: Investments, Liabilities, Insurance, Tax, Estate & Will, Goal Planner, Action Tracker
- Active state works the same as current (route matching)

**Separator:** A subtle label or divider between the two groups

**Preserved:** Brand, "Edit Answers" button, user avatar + sign out at bottom

### Mobile Sidebar
- Same two-group structure
- Overlay behavior unchanged
- Chapter items scroll dashboard when tapped (and close sidebar)

### Key Layout Decisions (Confirmed)
- **Chapter order is fixed** for all life stages (01-06 always in same order). Life-stage adaptation happens through *content emphasis* within chapters, not section reordering.
- **"Explore →" links in chapters navigate to detail pages** (route links to `/investments`, `/insurance`, etc.), not inline expansion. Keeps the main scroll focused.
- **Goals data**: Dashboard makes a second fetch to `GET /goals` in parallel with `/dashboard/full`. No backend changes needed.
- **Sidebar always visible**: Both chapter group and explore group show on all pages.

---

## Chapter Content — What Goes Where

### Chapter 01 — Your Profile
**Purpose:** The mirror. "Here's who you are."

**Content:**
- Personalized greeting: "Hi [First Name]"
- Life stage label + age context ("Building Phase · Age 28")
- MoneySign persona: icon + name + short description ("You're a Bold Eagle — highly aggressive and engaged")
- Key identity facts: Employment type, city, dependents, risk comfort, investment experience
- These are the unused fields — now they get a home. Not as inputs to calculations, but as the user's financial identity card.

**Data source:** `overview.moneySign`, `overview.lifeStage`, questionnaire profile fields
**Links out:** None — this is pure context setting
**No collapsible content** — always fully visible, it's short

### Chapter 02 — Financial Health
**Purpose:** The diagnosis. "Here's your score."

**Content:**
- FBS score display: large number /100, gradient bar with zones
- 3 tier breakdown bars (Foundation / Behaviour / Awareness) with individual scores and max
- Life-stage benchmark text
- Potential points hint ("Completing top actions could add up to +X pts")
- Financial narrative: 3-5 sentence story from `getOverviewNarrative()` — this is the "doctor's summary" of their health

**Data source:** `overview.fbs`, `overview.fbsBreakdown`, `overview.lifeStage`
**Links out:** None
**No collapsible content** — always fully visible

### Chapter 03 — What's Working
**Purpose:** Positive reinforcement. "Here's what you're doing right."

**Content — strengths extracted from existing data:**
- Each strength is a card/row with a title, value, and short explanation
- Strengths are pulled dynamically based on what's actually good:
  - Emergency fund adequate → "Your emergency fund covers X months of expenses"
  - Low/no bad debt → "You have no high-interest debt"
  - Good SIP consistency → "You've invested consistently via SIP for X months"
  - Insurance adequate → "Your health/life cover meets recommendations"
  - Good expense ratio → "Your expenses are X% of income — healthy range"
  - Credit score 750+ → "Your credit score is excellent at X"
  - Has will + nominees → "Your estate planning is in order"
  - Tax-optimized → "You're on the recommended tax regime"
  - Asset allocation on track → "Your equity/debt mix is within ideal range"
- Show top 3-5 strengths (don't show all — keep it focused)
- If user has very few strengths, show what exists and keep the section brief

**Data source:** Derived from existing computation results — emergency, insurance, liabilities, assets, tax, FBS breakdown. Need a new utility function `getStrengths(dashboardData)` that returns an array of strength objects.
**Links out:** Each strength can have an "Explore →" link to the relevant detail page (e.g., strength about insurance links to `/insurance`)
**Collapsible:** No — strengths are always visible (they're encouraging)

### Chapter 04 — What Needs Attention
**Purpose:** The gaps, framed as opportunities. "Here's where you can improve."

**Content — gaps extracted from existing data:**
- Each gap is a card/row with a title, current state, target state, and why it matters
- Gaps are pulled dynamically based on what's actually lacking:
  - No/low emergency fund → "Your emergency fund covers X months — target is 6 months"
  - Missing insurance → "No health/life cover — this is the highest-impact gap"
  - High bad debt → "₹X in high-interest debt at Y% — eroding your net worth"
  - No SIP/investments → "You're not investing regularly yet"
  - Poor asset allocation → "Equity allocation is X% — recommended range is Y-Z%"
  - Tax inefficiency → "Switching to [regime] could save ₹X/year"
  - No will/nominees → "No will created — assets at risk of legal delays"
  - Low credit score → "Credit score X — target 750+ for better loan rates"
  - No goals defined → "No financial goals set — define goals to improve clarity"
- Show all gaps (unlike strengths, users need to see everything that needs work)
- Each gap links to the relevant detail page AND to the action plan

**Data source:** Same as strengths — inverse logic. Need a new utility function `getGaps(dashboardData)` that returns an array of gap objects.
**Links out:** Each gap has "Explore →" to detail page and connects to relevant action in Chapter 05
**Collapsible:** If more than 4 gaps, show top 4 and collapse the rest with "Show X more gaps"

### Chapter 05 — Action Plan
**Purpose:** The prescription. "Here's exactly what to do."

**Content:**
- Top pending actions sorted by `fbsImpact` (highest impact first)
- Each action card shows:
  - Title + "+X pts" FBS impact badge
  - Description (1-2 sentences)
  - Next step with specific amount (e.g., "Start with ₹5K/month SIP")
  - "Mark as done" button with confirmation flow
  - Link to relevant detail page
- Show up to 5 actions (currently shows 3 — expand since this is a dedicated chapter)
- "View full action plan →" link to Reports page
- If all actions are done / FBS = 100: celebratory message

**Data source:** `overview.actionPlan` (existing)
**Links out:** "View full action plan →" to `/reports`, individual action links to detail pages
**Collapsible:** No — actions are always visible

### Chapter 06 — Your Goals
**Purpose:** The aspiration. "Here's where you're going."

**Content:**
- If user has goals (from `user_goals` table):
  - Summary: X goals set, total monthly SIP needed: ₹Y
  - List of goals with: name, target amount, timeline, required monthly SIP
  - Simple progress indicator if they've already started
- If user has no goals:
  - Prompt: "You haven't set any financial goals yet"
  - Explanation: Why goal-based investing matters (2-3 sentences)
  - Prominent CTA: "Set your first goal →" linking to Goal Planner
- Either way, "Open Goal Planner →" link to the full planner page

**Data source:** Separate `GET /goals` fetch in parallel with `/dashboard/full` on mount. Uses `computeGoalResult()` from `goalCalculations.js` to compute SIP amounts from raw goal data.
**Links out:** "Open Goal Planner →" to `/goal-planner`
**Collapsible:** No

---

## Interaction Model

### Scrolling
- Main content is one continuous scroll
- Each chapter starts with a chapter header: number + title (e.g., "01 — Your Profile")
- Visual separator between chapters (spacing + divider line or border)
- `scroll-behavior: smooth` on the main container
- Each chapter has an `id` attribute for anchor linking (`id="chapter-01"`, etc.)

### Sidebar Scroll Spy
- `IntersectionObserver` watches each chapter element
- When a chapter enters the viewport (threshold ~0.3), its sidebar item gets the active state
- Only one chapter is active at a time (the topmost visible one)
- When user is on a non-dashboard page, no chapter is highlighted (Explore items use route-based active state instead)

### Sidebar Click → Scroll
- Clicking a chapter item in sidebar:
  - If already on `/dashboard`: smooth-scroll to that chapter's element
  - If on another page: navigate to `/dashboard`, then scroll to chapter after mount (use URL hash or state)
- Clicking an Explore item: standard route navigation (same as current)

### "Explore →" Links in Chapters
- Inline text links within chapter content (not buttons)
- Navigate to the relevant detail page
- Detail pages remain unchanged — they're already good standalone experiences

### Action Plan Interactions
- Mark-as-done flow: same confirmation modal as current
- After marking done: FBS recalculates, chapter 02 score updates, chapter 03/04 strengths/gaps re-evaluate
- The dashboard re-fetches `/dashboard/full` after any action status change (same as current)

### Data Loading
- Dashboard fetches `/dashboard/full` on mount (same as current)
- Chapter 06 additionally fetches `/goals` to show goal summary
- Loading state: skeleton/spinner (same as current)
- No lazy loading of chapters — all render at once since it's one scroll

### Mobile
- Sidebar becomes overlay (same as current)
- Chapter items in sidebar work the same (scroll to anchor + close sidebar)
- All chapter content stacks vertically (already single-column on mobile)
- Chapter headers remain visible as scroll landmarks

---

## Files to Modify

### Frontend Changes

| File | Change Type | Description |
|---|---|---|
| `frontend/src/pages/Dashboard.jsx` | Major rewrite | Restructure into 6 chaptered sections with `id` anchors, add goals fetch, add strengths/gaps sections |
| `frontend/src/components/Sidebar.jsx` | Restructure | Split nav into "Your Story" (scroll anchors) + "Explore" (route links), add scroll spy |
| `frontend/src/components/Layout.jsx` | Minor | Pass scroll container ref to Sidebar for scroll spy, handle hash-based scroll on mount |
| `frontend/src/utils/financialInsights.js` | Add functions | Add `getStrengths(data)` and `getGaps(data)` utility functions |
| `frontend/src/index.css` | Add styles | Chapter header styles, sidebar group styles, separator styles, strength/gap card styles, scroll spy active state |

### Backend Changes

| File | Change Type | Description |
|---|---|---|
| `backend/engine/calculations.js` | Add to MoneySign | Use `beh_prefer_guaranteed`, `beh_follow_market_news` properly (they're already referenced but never collected) |
| `backend/routes/questionnaire.js` | Update STEP_COLUMNS | Add missing behavioral fields to step 10 mapping |
| `frontend/src/pages/Questionnaire.jsx` | Add questions | Add 4 missing behavioral questions to Step 11, add `sip_consecutive_months` to Step 6, condense gen wealth step |

### No Changes Needed

| File | Reason |
|---|---|
| Detail pages (Investments, Liabilities, Insurance, Tax, Estate) | Already good standalone "Story Quest" pages |
| GoalPlanner.jsx | Stays as-is — it's a "World Quest" page |
| Reports.jsx | Stays as-is — it's a "World Quest" page |
| App.jsx | No route changes needed |
| api.js, AuthContext.jsx | No changes |
| Welcome.jsx, Login.jsx, Register.jsx | No changes |

---

## Implementation Phases

### Phase 1: Questionnaire Fixes
- Add 4 missing behavioral questions to frontend Step 11
- Add `sip_consecutive_months` to frontend Step 6
- Condense generational wealth from 10 → 2-3 questions
- Update backend `STEP_COLUMNS` for any new fields
- Ensure all fields used in calculations are asked

### Phase 2: Utility Functions
- Add `getStrengths(dashboardData)` to `financialInsights.js`
- Add `getGaps(dashboardData)` to `financialInsights.js`
- These drive Chapter 03 and Chapter 04 content

### Phase 3: Sidebar Restructure
- Split Sidebar into two groups with labels
- Add scroll-spy logic (IntersectionObserver)
- Handle chapter click → scroll behavior
- Handle cross-page navigation to dashboard chapters

### Phase 4: Dashboard Rewrite
- Restructure into 6 chapters with `id` anchors
- Chapter 01: Profile identity card
- Chapter 02: FBS score + narrative (mostly existing code, reorganized)
- Chapter 03: Strengths (new, using `getStrengths()`)
- Chapter 04: Gaps (new, using `getGaps()`)
- Chapter 05: Action plan (existing code, expanded to show 5 items)
- Chapter 06: Goals summary (new, fetches `/goals`)
- Remove old collapsible section logic, life-stage section reordering

### Phase 5: CSS
- Chapter header styles
- Sidebar group styles
- Strength and gap card styles
- Responsive rules

### Phase 6: Visual Redesign — Reference Design Match

**Goal:** Transform the dashboard to match the `references/story.html` design. Scroll-snap navigation, entrance animations, sidebar background sync, new typography (Fraunces / DM Mono / Inter), and section-specific layouts matching the reference exactly.

**Reference file:** `d:\fin_planner\references\story.html`

#### Step 1: Google Fonts Update (`frontend/index.html`)
- Replace the Google Fonts `<link>` from Playfair+Outfit to:
  ```
  Fraunces:ital,opsz,wght@0,9..144,300;0,9..144,400;0,9..144,600;0,9..144,700;1,9..144,300;1,9..144,400&family=DM+Mono:wght@300;400;500&family=Inter:wght@400;500;600;700
  ```
- **Do first** — all CSS depends on these fonts loading.

#### Step 2: CSS Variables + Global Font Swap (`frontend/src/index.css`)

Add new CSS variables to `:root`:
```css
--orange: #D97757;
--black: #111010;
--bg-01: #F2EBE0;
--bg-02: #E4EBF0;
--bg-03: #DDE8DD;
--bg-04: #F0E6DC;
--bg-05: #EDE8DC;
--bg-06: #1A1C1F;
--sidebar-w: 220px;
--sidebar-collapsed: 56px;
--transition: 0.42s cubic-bezier(0.4,0,0.2,1);
```

Global find-and-replace across entire `index.css`:
- `'Playfair Display', serif` → `'Fraunces', serif`
- `'Outfit', sans-serif` → `'Inter', sans-serif`
- Body `font-family` → `'Inter', sans-serif`

Add `font-family: 'DM Mono', monospace` to all label/number elements (`.kpi-label`, `.ch02-kpi-label`, `.ch01-fact-label`, `.score-bar-labels span`, `.tier-bar-label`, etc.)

**Keep** existing `--paper`, `--ink`, `--accent` vars for non-dashboard pages.

#### Step 3: Layout System Change (`frontend/src/components/Layout.jsx` + CSS)

**Layout.jsx changes:**
- Add `useRef` for scroll container: `const scrollRef = useRef(null)`
- Add state for sidebar bg sync: `sectionBg`, `isDarkSection`
- Listen for custom `dashboard-section-change` event (dispatched by Dashboard) to update `sectionBg`/`isDarkSection`
- Replace grid `.layout` with flex `.app` shell
- Wrap `{children}` in `<div className="scroll-wrap" ref={scrollRef}>` — this is the scroll-snap container
- Add conditional `.snap-active` class when on `/dashboard`: `scroll-snap-type: y mandatory`
- Remove `sidebar-show-btn` logic (new sidebar uses in-place width collapse, not slide-away)
- Pass `scrollRef`, `sectionBg`, `isDarkSection` to Sidebar
- Keep mobile header + overlay behavior

**CSS changes:**
```css
.app { display: flex; height: 100vh; width: 100vw; overflow: hidden; }
.scroll-wrap { flex: 1; height: 100vh; overflow-y: scroll; scroll-behavior: smooth; scrollbar-width: none; }
.scroll-wrap::-webkit-scrollbar { display: none; }
.scroll-wrap.snap-active { scroll-snap-type: y mandatory; }
```
Remove `.layout` grid, `.sidebar-hidden`, `.main:has(.dashboard-book)` rules.

#### Step 4: Sidebar Redesign (`frontend/src/components/Sidebar.jsx` + CSS)

**JSX structure change:**
- Replace `PanelLeftClose`/`PanelLeft` toggle with 3-bar animated hamburger → X:
  ```jsx
  <button className="sidebar-toggle" onClick={onTogglePin}>
    <span className="toggle-bar" /><span className="toggle-bar" /><span className="toggle-bar" />
  </button>
  ```
- Replace brand block with `<div className="sidebar-logo">Fin<em>Health</em></div>`
- Restructure chapter nav items to `<ul>` → `<li>` → `<button>` with `<span class="nav-num">`, `<span class="nav-label">`, `<span class="nav-dot">`
- Keep "Explore" group below with `<div className="nav-separator" />` divider
- Keep: avatar + sign-out block at sidebar bottom (don't change to reference's footer style)
- Remove: "Edit Answers" button from sidebar → move to Dashboard Ch01 sec-bar as CTA link
- Add: footer block below sign-out (`Report generated / [Month Year] / FinHealth v2`)
- Accept `sectionBg` + `isDarkSection` props from Layout, apply as inline `style.background` and `.dark` class
- Change IntersectionObserver `root` to `scrollRef.current` (passed as prop), threshold to `0.6`

**Collapsed state:**
- Width: `var(--sidebar-w)` → `var(--sidebar-collapsed)` (220px → 56px)
- `.nav-label`, `.sidebar-logo`, `.sidebar-footer` → `opacity: 0` with transitions
- Toggle bars transform: bar1 `translateY(6.5px) rotate(45deg)`, bar2 `opacity: 0`, bar3 `translateY(-6.5px) rotate(-45deg)`

**Sidebar dark mode** (when Ch06 is active):
- `.sidebar.dark .nav-label, .sidebar.dark .nav-num { color: #555 }`
- `.sidebar.dark li.active .nav-num { color: var(--orange) }`
- `.sidebar.dark li.active .nav-label { color: #ccc }`

**CSS:** Copy sidebar styles from `story.html` lines 44-211, adapting class names.

#### Step 5: Entrance Animation System (CSS)

Add to `index.css`:
```css
.ani { opacity: 0; transform: translateY(22px); transition: opacity 0.55s ease, transform 0.55s ease; }
.ani-left { opacity: 0; transform: translateX(-22px); transition: opacity 0.55s ease, transform 0.55s ease; }
.ani-right { opacity: 0; transform: translateX(22px); transition: opacity 0.55s ease, transform 0.55s ease; }
.ani-scale { opacity: 0; transform: scale(0.94); transition: opacity 0.55s ease, transform 0.55s ease; }
.d1 { transition-delay: 0.08s; } ... .d8 { transition-delay: 0.64s; }
.section.in-view .ani, .section.in-view .ani-left, .section.in-view .ani-right, .section.in-view .ani-scale {
  opacity: 1; transform: none;
}
```

#### Step 6: Dashboard Restructure (`frontend/src/pages/Dashboard.jsx`)

**New state + refs:**
- `visibleSections` (Set) — tracks which sections have been scrolled into view
- `sectionRefs` (useRef) — refs to each section element

**New IntersectionObserver** (in useEffect):
- Root: `.scroll-wrap` element
- Threshold: `0.6`
- On intersecting: add section to `visibleSections`, dispatch `dashboard-section-change` custom event with `{ id, bg, dark }` for sidebar sync

**Keyboard navigation** (useEffect): ArrowDown/Right → next section, ArrowUp/Left → previous section via `scrollIntoView`

**Section class change:** `.ch` → `.section`, background via IDs (`#chapter-01 { background: var(--bg-01) }`), add `in-view` conditionally from state

**Every section gets this wrapper pattern:**
```jsx
<section id="chapter-XX" className={`section${visibleSections.has('chapter-XX') ? ' in-view' : ''}`}
  ref={el => sectionRefs.current['chapter-XX'] = el}>
  <div className="watermark">XX</div>
  <div className="sec-bar ani d1">
    <span className="sec-chapter">XX — Title</span>
    <div className="sec-actions">...</div>
  </div>
  <div className="content">...</div>
</section>
```

**Section-specific HTML restructures:**

**Ch01 — Profile:** Replace `.ch-inner` flat layout with 2-column `.profile-grid`:
- `.profile-left`: greeting (Fraunces 56px), age tag, archetype block (orange left border), "Review Profile →" CTA
- `.profile-mid`: stats rows (key-value pairs from `profileFacts`)
- `.profile-bottom`: journey panel (orange-tinted background, 2-column dot list)
- Add `ani d1`...`d6` classes for stagger

**Ch02 — Financial Health:** Replace ring-first layout with 2-column `.health-grid`:
- Left column (260px): big score number (Fraunces 108px), `/100`, rating text, donut SVG, "+X pts achievable" tag
- Right column: spectrum bar (gradient + needle at `fbs%`), tier rows (`.ss-row` 3-column grid: name | bar | score), health insight text, "Your Numbers" 4-cell grid (`.numbers-grid`)
- Tier bars: use CSS `--w` variable for animated fill width
- Keep `ScoreRing` component but resize to 120px/stroke 9

**Ch03 — Strengths:** Replace current cards with `.str-row` 3-column grid:
- Column 1: `.str-idx` (DM Mono 9px, orange number)
- Column 2: `.str-name` + `.str-desc` + `.str-link` (Explore →)
- Column 3: `.str-val` with `.str-val-num` (Fraunces 24px orange) + `.str-val-label`

**Ch04 — Gaps:** Replace badge-based cards with `.al-row` 3-column grid:
- Column 1: `.al-bar` (3px orange vertical line)
- Column 2: `.al-tag` + `.al-title` + `.al-desc` + `.al-link`
- Column 3: `.al-meta` with `.al-meta-label` + `.al-meta-val`

**Ch05 — Cashflow:** Replace div-based grid with `<table className="cf-table">`:
- `<thead>`: Item | 3-Month Total
- `<tbody>`: cashflow items with `.cf-positive`/`.cf-negative` classes
- `<tfoot>`: Net Surplus row with `.cf-total`
- `.cf-footnote` below table

**Ch06 — Action Plan:** Replace rank-number cards with reference layout:
- Projected score row: `.proj-row` (label + Fraunces 44px orange number + /100) + `.proj-track`/`.proj-fill` (animated bar)
- Action items: `.act-item` 3-column grid (pts | content | CTA button)
- `.act-pts` (Fraunces 30px orange), `.act-name`, `.act-desc`, `.act-highlight` (DM Mono specific amounts)
- **Preserve** confirmation flow: `act-cta` button triggers `confirmingAction` state → shows confirm/cancel

#### Step 7: Section-Specific CSS (index.css)

Replace all `.ch` / `.ch--01` through `.ch--06` CSS blocks with new section styles from reference.

**Base section:**
```css
.section {
  height: 100vh;
  scroll-snap-align: start;
  scroll-snap-stop: always;
  display: flex; flex-direction: column;
  padding: 36px 60px 36px 48px;
  position: relative; overflow: hidden;
}
```

**Watermark:** `font-family: 'Fraunces'; font-size: clamp(120px, 16vw, 200px); font-weight: 700; color: rgba(0,0,0,0.04); position: absolute; right: 40px; top: 16px; z-index: 0;`

**Sec-bar:** `.sec-chapter { font-family: 'DM Mono'; font-size: 11px; letter-spacing: 0.15em; text-transform: uppercase; color: var(--orange); }`

**Section backgrounds:** `#chapter-01 { background: var(--bg-01); }` ... `#chapter-06 { background: var(--bg-06); }`

**Copy all section-specific classes from story.html:**
- Profile: `.profile-grid`, `.profile-left`, `.profile-mid`, `.profile-bottom`, `.profile-greeting`, `.archetype-block`, `.stats-heading`, `.stat-row`, `.journey-panel`, etc.
- Health: `.health-grid`, `.score-big`, `.score-denom`, `.score-rating`, `.donut-wrap`, `.spectrum-track`, `.spectrum-needle`, `.ss-row`, `.ss-bar-fill`, `.numbers-grid`, `.num-cell`, etc.
- Strengths: `.w-title`, `.w-sub`, `.str-row`, `.str-idx`, `.str-name`, `.str-desc`, `.str-val`, `.str-val-num`, `.str-link`, etc.
- Gaps: `.att-title`, `.att-sub`, `.al-row`, `.al-bar`, `.al-tag`, `.al-title`, `.al-desc`, `.al-meta`, `.al-meta-val`, `.al-link`, etc.
- Cashflow: `.cf-title`, `.cf-sub`, `.cf-table` (full table styles), `.cf-positive`, `.cf-negative`, `.cf-total`, `.cf-footnote`, etc.
- Action Plan: `.act-title`, `.act-sub`, `.proj-row`, `.proj-num`, `.proj-track`, `.proj-fill`, `.act-item`, `.act-pts`, `.act-name`, `.act-desc`, `.act-highlight`, `.act-cta`, etc.

**Animated elements:**
- `.ss-bar-fill { width: 0%; transition: width 1.4s ease 0.5s; }` → `.section.in-view .ss-bar-fill { width: var(--w); }`
- `.proj-fill { width: 0%; transition: width 1.6s ease 0.2s; }` → `.section.in-view .proj-fill { width: var(--target-w); }`
- `.d-fill` donut stroke animation: `stroke-dashoffset: 314` → on `.in-view`: offset calculated from score

**Mobile overrides:**
```css
@media (max-width: 768px) {
  .section { height: auto; min-height: 100svh; padding: 24px 20px; }
  .watermark { display: none; }
  .profile-grid { grid-template-columns: 1fr; }
  .health-grid { grid-template-columns: 1fr; }
  .str-row, .al-row, .act-item { grid-template-columns: 1fr; }
  .numbers-grid { grid-template-columns: 1fr 1fr; }
  .journey-list li { width: 100%; }
  .scroll-wrap.snap-active { scroll-snap-type: none; }
}
```

#### Step 8: Inline Font Refs in Other Pages

Update font references in JSX files that use inline `fontFamily`:
- `Questionnaire.jsx`: `'Playfair Display', serif` → `'Fraunces', serif`
- `GoalPlanner.jsx`: `'Outfit'` → `'Inter'` (Recharts axis)
- `Reports.jsx`: PDF template fonts
- `Tax.jsx`: Recharts axis `'Outfit'` → `'Inter'`
- `Liabilities.jsx`: `'Playfair Display'` → `'Fraunces'`

#### Step 9: CSS Cleanup

Remove dead CSS classes after restructure:
- `.sidebar-brand`, `.sidebar-brand-name`, `.sidebar-brand-sub` (replaced by `.sidebar-logo`)
- `.sidebar-pin-btn`, `.sidebar-show-btn` (replaced by `.sidebar-toggle`)
- `.nav-section-label` (replaced by `.nav-separator`)
- `.edit-answers-btn` (moved to Dashboard sec-bar)
- Old `.ch-num`, `.ch-title`, `.ch-inner` styles
- Old `.ch01-*`, `.ch02-*`, `.ch03-*`, `.ch04-*`, `.ch05-*`, `.ch06-*` class families
- `.score-ring-num`, `.score-ring-label` if ScoreRing is updated

**Do NOT remove:** non-dashboard page styles (`.page-title`, `.kpi-value`, `.analysis-grid`, etc.)

#### Implementation Order

| Order | Step | Dependency |
|-------|------|------------|
| 1 | Step 1 — Fonts (index.html) | Foundation |
| 2 | Step 2 — CSS vars + font swap | Depends on Step 1 |
| 3 | Step 5 — Animation CSS | Classes used in Step 6 |
| 4 | Step 7 — Section CSS | Classes used in Step 6 |
| 5 | Step 3 — Layout.jsx | Scroll container for Steps 4, 6 |
| 6 | Step 4 — Sidebar.jsx | Depends on Layout |
| 7 | Step 6 — Dashboard.jsx | Depends on all above |
| 8 | Step 8 — Other page font refs | Independent |
| 9 | Step 9 — CSS cleanup | Last — only after verification |

#### Key Risks + Mitigations

| Risk | Mitigation |
|------|-----------|
| Scroll snap on non-dashboard pages | `.snap-active` class only added when `pathname === '/dashboard'` |
| IntersectionObserver root mismatch | Root must be `.scroll-wrap` element, not viewport — pass via `scrollRef` |
| Content overflow with `height: 100vh` | Ch03/Ch04 may need `min-height` instead; keep "show more" cap at 4 gaps |
| Mobile scroll snap janky | Disable snap on mobile via media query |
| Dashboard-Sidebar communication | Custom DOM event `dashboard-section-change` — simple, no prop drilling |
| Sidebar bg sync only on dashboard | Layout only applies `sectionBg` when `isDashboard` is true, resets on nav away |
| Reports PDF fonts | Update inline `<link>` and `font-family` in PDF template |

#### Files Modified

| File | Change |
|------|--------|
| `frontend/index.html` | Google Fonts link |
| `frontend/src/index.css` | Major — new vars, font swap, animation system, section CSS, sidebar CSS |
| `frontend/src/pages/Dashboard.jsx` | Major — section HTML restructure, IntersectionObserver, entrance animations |
| `frontend/src/components/Sidebar.jsx` | Major — toggle, nav structure, collapsed state, bg sync, dark mode |
| `frontend/src/components/Layout.jsx` | Medium — flex shell, scroll-wrap, event listener, new props |
| `frontend/src/pages/Questionnaire.jsx` | Minor — inline font swap |
| `frontend/src/pages/GoalPlanner.jsx` | Minor — inline font swap |
| `frontend/src/pages/Reports.jsx` | Minor — PDF template font swap |
| `frontend/src/pages/Tax.jsx` | Minor — inline font swap |
| `frontend/src/pages/Liabilities.jsx` | Minor — inline font swap |

---

## Verification

1. **Build check:** `cd frontend && npm run build` — no errors
2. **Chapter scroll:** Click each sidebar chapter item → smooth scroll to correct section
3. **Scroll spy:** Scroll through dashboard → sidebar highlights current chapter
4. **Cross-page navigation:** From `/investments`, click Chapter 03 in sidebar → navigates to dashboard and scrolls
5. **Strengths/Gaps:** Test with different profiles — verify correct items appear based on data
6. **Goals chapter:** Test with goals set (shows summary) and without (shows prompt)
7. **Action plan:** Mark item done → score updates, strengths/gaps refresh
8. **Mobile:** Sidebar overlay works, chapter scrolling works, content stacks properly
9. **Questionnaire:** Verify new questions save correctly, old condensed gen-wealth still saves
