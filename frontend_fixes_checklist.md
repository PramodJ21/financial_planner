# FinHealth Frontend Fixes Checklist

Track of all changes made per page, based on `frontend_audit.md`.

---

## Status Key
- ✅ Fixed & approved
- 🔄 Fixed, awaiting approval
- ⏳ Pending
- ⚠️ Partial
- ❌ Skipped

---

## PAGE 1 — Welcome

| # | Issue | Source | Status | Change Made |
|---|-------|--------|--------|-------------|
| 1 | CTA button touch target too small | 📋 Audit | ✅ | Added `min-height: 44px`, `padding: 12px 24px` to `.auth-left-container .btn-primary` in `index.css` |
| 2 | `₹85.0K` trailing decimal in preview card | 📋 Audit | ✅ | `(n/1000).toFixed(1)` → `Math.round(n/1000)` in `AuthPreviewCard.jsx:25` |
| 3 | Preview card hidden at 768–900px — bare layout | 📋 Audit | ✅ | Added `.auth-left` compensating styles in `@media (max-width: 900px)` in `index.css` |
| 8 | "10 sections" vs 13 steps mismatch | 📋 Audit | ✅ | Updated `Welcome.jsx` copy: "10 sections" → "13 steps" |
| — | No mobile breakpoints for Welcome content | 🔧 On-the-spot | ✅ | Added `@media (max-width: 600px)` and `@media (max-width: 380px)` blocks: title 44px→32px/28px, desc font/margin, meta gap, padding, `min-height: 100dvh` |
| — | Content not vertically centered on mobile | 🔧 On-the-spot | ✅ | Added `justify-content: center` to `.auth-left` in `@media (max-width: 600px)` |

---

## PAGE 2 — Login

| # | Issue | Source | Status | Change Made |
|---|-------|--------|--------|-------------|
| 4 | "Forgot password?" uses `alert()` | 📋 Audit | ✅ | Replaced `alert()` with `forgotMsg` state; renders `.auth-info-msg` inline below the forgot link in `Login.jsx` |
| 5 | Password toggle `tabIndex={-1}` — keyboard inaccessible | 📋 Audit | ✅ | Removed `tabIndex={-1}` from toggle button in `Login.jsx`; added `.auth-pw-toggle:focus` ring + removed `outline: none` in `index.css` |
| — | No `.auth-info-msg` style existed | 📋 Audit | ✅ | Added `.auth-info-msg` amber style to `index.css` |
| — | Auth form not mobile-friendly (Login & Register) | 🔧 On-the-spot | ✅ | Added to `@media (max-width: 600px)`: `auth-title` 30px, `auth-sub` 13px, `auth-field input` 16px (prevents iOS zoom), `btn-auth` min-height 44px, `auth-footer` 12px |

---

## PAGE 3 — Register

| # | Issue | Source | Status | Change Made |
|---|-------|--------|--------|-------------|
| 6 | Password mismatch error shown at top of form | 📋 Audit | ✅ | Added `confirmError` state; shown inline below confirm field via `.auth-field-error`; clears on retype; removed top-level `setError` for this case in `Register.jsx` |
| 7 | Phone field — no format validation | 📋 Audit | ✅ | Added `pattern`, `maxLength={15}`, and `.auth-field-hint` hint text to phone input in `Register.jsx` |
| 5 | Password toggle buttons `tabIndex={-1}` (both toggles) | 📋 Audit | ✅ | Removed `tabIndex={-1}` from both toggle buttons in `Register.jsx` (same fix as Login) |
| — | `.auth-field-error` and `.auth-field-hint` CSS missing | 📋 Audit | ✅ | Added both classes to `index.css` |
| — | Eyebrow ("Get started — it's free") too close to logo | 🔧 On-the-spot | ✅ | Added `margin-top: 48px` to `.auth-eyebrow` in `index.css` (both Login & Register share class) |
| — | "No credit card required" hint not close enough to button | 🔧 On-the-spot | ✅ | Moved `.auth-next-hint` inside `<form>` immediately after `btn-auth`; set `margin-top: 8px` in `index.css` |
| — | "Back to home" and "Already have an account" on separate lines | 🔧 On-the-spot | ✅ | Merged both into one `.auth-footer` row with `display: flex; justify-content: space-between` in `Register.jsx` & `Login.jsx`; added `.auth-footer` flex styles in `index.css` |

---

## PAGE 4 — Questionnaire

| # | Issue | Source | Status | Change Made |
|---|-------|--------|--------|-------------|
| 9 | No mobile responsive padding on `.qn-page` | 📋 Audit | ✅ | `.qn-page` padding `28px 20px` at 768px, `24px 16px` at 480px — moved to end of file to fix cascade override |
| 10 | `.qn-form-grid` 2-column not collapsing on mobile | 📋 Audit | ✅ | `grid-template-columns: 1fr` at 768px — moved to end-of-file media block to fix cascade override |
| — | `qn-sidebar` blocking full screen on mobile | 🔧 On-the-spot | ✅ | Sidebar hidden (`display: none !important`) on mobile; converted to fixed drawer with `qn-sidebar-open` class |
| — | No way to navigate steps on mobile | 🔧 On-the-spot | ✅ | Added hamburger button in progress bar (mobile only); opens sidebar as overlay drawer with dark backdrop + close button |
| — | Sidebar drawer closes on step tap | 🔧 On-the-spot | ✅ | `setSidebarOpen(false)` called when user taps a completed step in the drawer |
| — | Likert scale 5-column squished on mobile | 🔧 On-the-spot | ✅ | `.qn-scale-options` → `grid-template-columns: 1fr`; `.qn-scale-btn` → `flex-direction: row` (number + label side by side), min-height 44px |
| — | Surplus tracker overflowing / clipped on mobile | 🔧 On-the-spot | ✅ | Compact padding `6px 12–16px`, `flex-wrap: nowrap`, `overflow-x: auto` with hidden scrollbar |
| — | Progress bar 64px side padding on mobile | 🔧 On-the-spot | ✅ | Reduced to `12px 16px` on mobile |
| — | CSS cascade bug: base styles overriding mobile rules | 🔧 On-the-spot | ✅ | Moved all questionnaire mobile overrides to a dedicated block at end of `index.css` after all base styles |

---

## PAGE 5 — Dashboard

| # | Issue | Source | Status | Change Made |
|---|-------|--------|--------|-------------|
| 11 | Loading state — no `role="status"` / `aria-live` | 📋 Audit | 🔄 | Added `role="status" aria-live="polite" aria-label="Loading your dashboard"` to `.dash-loading` div in `Dashboard.jsx` |
| 12 | Arrow key navigation hijacks `SELECT`/`BUTTON` contexts | 📋 Audit | 🔄 | Extended guard in keydown handler to also skip `SELECT`, `BUTTON`, and elements inside `[role="dialog"]` / `[aria-modal]` in `Dashboard.jsx` |
| 13 | FBS donut chart — no accessible label | 📋 Audit | 🔄 | Added `role="img"`, `aria-label` with score + rating, and `<title>` element to donut SVG in `Dashboard.jsx` |
| 14 | "Done →" buttons — ambiguous `aria-label` | 📋 Audit | 🔄 | Added `aria-label={Mark "${action.title}" as done}` to `.act-cta`; `aria-label="Yes, mark as done"` and `"No, cancel"` to confirm buttons in `Dashboard.jsx` |
| 15 | Hidden scrollbar on all pages | 📋 Audit | 🔄 | Added `.main:not(:has(.dashboard-book))` rules to restore thin scrollbar on non-dashboard pages; dashboard keeps `scrollbar-width: none` in `index.css` |

---

## DASHBOARD — Chapter 01 (Your Profile)

| # | Issue / Change | Status | Change Made |
|---|----------------|--------|-------------|
| D1 | Full-width archetype card with dark rich background | ✅ | Added `.archetype-card` with `background: #2C1810`, full-width flex layout replacing old profile details table |
| D2 | Animal moved to right column, enlarged | ✅ | Moved emoji to `.archetype-card-right` column, `font-size: 64px`, `drop-shadow` filter |
| D3 | Animated orbit ring around animal | ✅ | Added `.arch-orbit-ring` (border circle) with `@keyframes orbit-spin` (8s rotation) and orbiting dot via `::before` with `@keyframes arch-dot-pulse` |
| D4 | Radial glow highlight behind animal | ✅ | Added `.arch-animal-wrap::before` with `radial-gradient` and `@keyframes arch-pulse` (scale 1→1.15, 3s ease-in-out) |
| D5 | Archetype name displayed below animal | ✅ | Added `.arch-animal-name` div in `.archetype-card-right`, DM Mono 10px, rgba(255,255,255,0.45) |
| D6 | Removed "MoneySign" section heading | ✅ | Removed `.arch-label` div; retained "Your Investor Archetype" as `.arch-section-label` |
| D7 | Journey snapshot as 3-column grid with SVG icons | ✅ | Replaced list with `.journey-grid` (`repeat(3,1fr)`), typed `{ type, label, value, sub }` objects from `getJourney()`, inline SVG icons via `JOURNEY_ICONS` map, lift animation on hover |
| D8 | Profile details as plain text (no pill backgrounds) | ✅ | `.pmeta-pill` uses DM Mono 11px plain text; `+::before { content: '·' }` separator; no background/border-radius |

---

## DASHBOARD — Chapter 02 (Financial Health)

| # | Issue / Change | Status | Change Made |
|---|----------------|--------|-------------|
| D9 | Tier rows lack icons — raw data feel | ✅ | Added `TIER_ICONS` (pillar/cycle/eye inline SVG) as first column in each `.ss-row`; `.ss-icon` 24×24 flex container |
| D10 | Progress bars 2px — too thin to read | ✅ | `.ss-bar-track` and `.ss-bar-fill` increased to `height: 6px; border-radius: 3px` |
| D11 | All bars flat orange regardless of score — red dominance on low scores | ✅ | `getTierColor(pct)` helper: <30% red, 30–60% terracotta `#C4703A`, ≥60% sage green; `.ss-bar-fill` uses `var(--bar-color)` |
| D12 | "Your Numbers" table redundant — duplicates page 1 snapshot | ✅ | Removed entire numbers grid (heading, 4 cells, all CSS); `totalExpenses`, `monthlySurplus`, `netWorth`, `totalAssets` vars and `netWorthExpanded` state removed |
| D13 | Tier names unexplained — "Foundation/Behaviour/Awareness" confuse new users | ✅ | Added `.ss-name-group` flex column with `.ss-desc` microcopy below each tier name; grid column changed from fixed `110px` to `1fr` to accommodate |
| D14 | Yellow `#C9A84C` clashes with premium palette | ✅ | Replaced all yellow instances with terracotta `var(--orange)` / `#C4703A`; spectrum gradient updated to red→terracotta→sage→green |
| D15 | Net Worth missing from page 1 snapshot | ✅ | Added Net Worth card to `getJourney()` with positive/warning type based on sign; `Net Worth` SVG icon added to `JOURNEY_ICONS` map |
| D16 | Mobile navbar disappears on scroll | ✅ | Added `position: sticky; top: 0; z-index: 100` to `.mobile-header` in `index.css` |
| D17 | Financial health section lacks context — users don't know what FBS is or why it matters | ✅ | Replaced thin subtitle with full `.health-intro` block: 2 prose paragraphs explaining purpose + `.health-how` section detailing the 3 tiers (Foundation/Behaviour/Awareness with point ranges) and penalty rules |
| D18 | No peer context — users can't judge if their score is good or bad for someone like them | ✅ | Added `getPeerBenchmark(age, annualIncome, riskComfort)` function computing expected range by age group + income band + risk comfort; rendered as `.peer-bench` block below the donut: range display, visual bar with orange dot for user's score, "Similar age, income & risk profile" label |

---

## PAGE 6 — Investments

| # | Issue | Severity | Status | Change Made |
|---|-------|----------|--------|-------------|
| 16 | Flip cards — no keyboard trigger (affects 4 pages) | 🟠 Major | ⏳ | — |
| 17 | Inline `overflowX: auto` instead of `.table-scroll-wrapper` | 🔵 Suggestion | ⏳ | — |

---

## PAGE 7 — Liabilities

| # | Issue | Severity | Status | Change Made |
|---|-------|----------|--------|-------------|
| 18 | Credit score empty state — inline styles | 🔵 Suggestion | ⏳ | — |
| 19 | Empty table cell — inline styles | 🔵 Suggestion | ⏳ | — |

---

## PAGE 8 — Insurance

| # | Issue | Severity | Status | Change Made |
|---|-------|----------|--------|-------------|
| 20 | "Ideal term life cover" row — misformatted table structure | 🟠 Major | ⏳ | — |
| 21 | Shortfall amount shown twice in impact alert | 🟡 Minor | ⏳ | — |

---

## PAGE 9 — Tax

| # | Issue | Severity | Status | Change Made |
|---|-------|----------|--------|-------------|
| 22 | FlipCard inline transform bypasses CSS flip system | 🟡 Minor | ⏳ | — |
| 23 | Repeated `style={{ marginBottom: '24px' }}` on `.act-label` | 🔵 Suggestion | ⏳ | — |

---

## PAGE 10 — Estate & Will

| # | Issue | Severity | Status | Change Made |
|---|-------|----------|--------|-------------|
| 24 | Nomination table shows false precision from single field | 🟠 Major | ⏳ | — |

---

## PAGE 11 — Reports

| # | Issue | Severity | Status | Change Made |
|---|-------|----------|--------|-------------|
| 25 | Redundant inline grid style on `.analysis-grid` | 🔵 Suggestion | ⏳ | — |
| 26 | Download report creates `.html` not PDF | 🟠 Major | ⏳ | — |
| 27 | Redundant inline styles on Download button | 🔵 Suggestion | ⏳ | — |

---

## PAGE 12 — Goal Planner

| # | Issue | Severity | Status | Change Made |
|---|-------|----------|--------|-------------|
| 28 | "Add Goal" silent validation failure | 🟠 Major | ⏳ | — |
| 29 | Auto-save — no visible save indicator | 🟡 Minor | ⏳ | — |

---

## CROSS-CUTTING

| # | Issue | Severity | Status | Change Made |
|---|-------|----------|--------|-------------|
| 30 | `analysis-value` inline color overrides instead of `.ok`/`.warn` classes | 🔵 Suggestion | ⏳ | — |
| 31 | `.btn-primary` — no `:hover` state | 🟡 Minor | ⏳ | — |
| 32 | `.btn-ghost` — no `:focus` state | 🟡 Minor | ⏳ | — |
| 33 | Single 768px breakpoint — no 480px for small phones | 🟠 Major | ⏳ | — |
| 34 | Non-dashboard page padding — no 1024px intermediate breakpoint | 🟠 Major | ⏳ | — |
