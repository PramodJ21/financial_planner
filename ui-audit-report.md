# UI Audit Report — FinHealth Dashboard
**Audited:** 2026-04-04 | **Auditor:** Principal UI/UX Designer (AI) | **Codebase:** React + Pure CSS

---

## 🔥 Overall Rating: 6.8 / 10

The bones are genuinely impressive — scroll-snap chapters, watermark numerals, a proper design token system, entrance animations, the archetype card with orbit animations. This is not generic SaaS. But it is failing at the most critical promise of a storybook fintech: **the narrative typography is missing entirely**. Lora — a warm serif with real character — is imported but never applied. Inter, a corporate utility font, is labelled `--font-heading`. The result is a layout that looks like an editorial magazine trying to be a storybook using the wrong typeface throughout. Fix this one issue and the quality score jumps to 8+. The financial data clarity is largely good; the trust signals are present; the micro-animations are a real asset. But several components have consistency leaks, accessibility gaps, and one persistent animation draining battery on every page.

---

## ❌ Key Problems

**P1 — Lora is imported and completely unused. Inter is labelled `--font-heading`.**

```css
/* Current — WRONG */
--font-heading: 'Inter', sans-serif;
```
Lora is in the Google Fonts import (`Lora:wght@500;600;700`) but zero CSS rules apply it. The 56px display headings ("Hi *Name*", "Financial Health"), the section watermark labels, and the archetype name all use Inter — a font designed for UI density, not storytelling. This kills the storybook illusion instantly.

**P2 — `--font-value: 'Outfit', monospace` is factually wrong.**

```css
--font-value: 'Outfit', monospace; /* Outfit is NOT monospace */
```
Outfit is a geometric sans-serif, not a monospace font. The `monospace` fallback means if Outfit fails to load, numbers fall back to Courier-style rendering. The actual monospace in use is DM Mono, which is applied correctly throughout. The variable `--font-value` should point to `'DM Mono', monospace` — that's what the financial numbers are actually using.

**P3 — The `.arch-orbit-ring` animation never stops.**

```css
animation: orbit-spin 8s linear infinite; /* no prefers-reduced-motion guard */
```
An infinitely spinning ring on every dashboard load is a battery drain and violates `prefers-reduced-motion`. There is no `@media (prefers-reduced-motion: reduce)` override anywhere in the 7,000+ line CSS file.

**P4 — The score column has redundant information in poor layout order.**

The Financial Health section stacks: giant 108px number → `/100` denominator → "GOOD/CRITICAL" label → italic compass copy → then the donut arc. The donut is redundant with the number. Both show the same value. The donut should either replace the number or sit beside it, not stacked below it as an afterthought.

**P5 — `.health-intro` is a wall of text at 13.5px with hardcoded `#555`.**

```css
.health-intro { font-size: 13.5px; color: #555; line-height: 1.8; }
```
The paragraph at section 02 is a 60-word single sentence that must be read before the score makes sense. Most users will skip it. Color `#555` is not using the design token system (`var(--ink-soft)` = `#6B6760` is the equivalent but not applied). Consistency leak.

**P6 — Journey cards have hover effects but `cursor: default`.**

```css
.journey-card { cursor: default; }
.journey-card:hover { transform: translateY(-2px); box-shadow: 0 4px 16px ...; }
```
A card that lifts on hover implies interactivity. Setting `cursor: default` breaks that affordance. Either remove the hover transform or make the cards linkable.

**P7 — Low-contrast navigation labels and secondary buttons.**

`.nav-label` is `color: #aaa` on the sidebar. `#aaa` on `#F7F4EF` computes to approximately 2.3:1 contrast ratio — well below WCAG AA (4.5:1 for small text). Similarly, `.sec-btn` is `color: #999` on section backgrounds — same problem.

**P8 — Animation delay at d8 = 0.64s is too aggressive for returning users.**

First-time users appreciate stagger. But users who've been to the dashboard 10 times experience a forced 640ms wait for the last element on every section. There's no mechanism to reduce this for returning sessions.

---

## ✅ Specific Improvements

**Typography — Apply Lora to all display and narrative elements:**

```css
:root {
  --font-heading: 'Lora', Georgia, serif;   /* narrative / storybook headings */
  --font-ui: 'Inter', sans-serif;           /* UI chrome: buttons, labels, pills */
  --font-value: 'DM Mono', monospace;       /* financial numbers ONLY */
}

body { font-family: var(--font-ui); }

.profile-greeting,
.health-title,
.arch-name,
.w-title,
.act-title,
.cf-title { font-family: var(--font-heading); }
```

The 56px display headings in Lora at weight 500 will feel like chapter titles in a financial memoir. Inter stays on all UI chrome.

**Fix `--font-value` to point to the correct font:**

```css
--font-value: 'DM Mono', monospace;
```

Remove `'Outfit'` from this variable. Keep Outfit loaded if you want a rounded sans for subheadings, but rename the usage clearly.

**Guard the orbit animation with `prefers-reduced-motion`:**

```css
@media (prefers-reduced-motion: reduce) {
  .arch-orbit-ring { animation: none; }
  .arch-animal-wrap::before { animation: none; }
  .arch-dot-pulse { animation: none; }
  .ani, .ani-left, .ani-right, .ani-scale {
    transition: none;
    opacity: 1;
    transform: none;
  }
}
```

**Replace the stacked score + donut with a side-by-side layout:**

Increase the donut SVG to 180px, center the score value inside it using absolute positioning, and remove the separate `score-big` / `score-denom` divs above it. This eliminates redundancy and recovers significant vertical space.

```css
.health-score-col {
  display: flex;
  flex-direction: column;
  align-items: center;
}

.score-big {
  font-size: 42px; /* reduce — lives inside the donut context now */
}
```

**Fix `.health-intro` copy and color:**

```css
.health-intro {
  font-size: 13px;
  color: var(--ink-soft); /* was hardcoded #555 */
  line-height: 1.75;
  max-width: 680px; /* was 800px — too wide for comfortable reading */
}
```

Break the monolithic paragraph into two shorter ones in the JSX.

**Remove fake interactivity from journey cards:**

```css
/* Option A — remove the misleading hover lift */
.journey-card:hover { transform: none; box-shadow: none; }

/* Option B — make them true links and use cursor: pointer */
```

**Fix navigation label contrast:**

```css
.nav-label { color: var(--ink-soft); } /* #6B6760 instead of #aaa — passes WCAG AA */
.nav-num   { color: var(--ink-ghost); } /* #C4BFB8 — acceptable for decorative */
```

**Replace all hardcoded grays with tokens:**

Find-replace across `index.css`: `#555` → `var(--ink-soft)`, `#aaa` → `var(--ink-ghost)`, `#999` → `var(--ink-soft)`, `#bbb` → `var(--ink-ghost)`. Approximately 14 occurrences. Design token system becomes actually consistent.

---

## 🎨 Visual Upgrade Suggestions

**Color palette — minor refinements:**

`--orange: #D97757` and `--accent: #C4703A` are too close in hue and used interchangeably. Consolidate:

```css
--accent:        #C4703A;  /* keep — primary brand orange */
--accent-light:  #F0DDD0;  /* new — soft tint for hover states, tag backgrounds */
/* retire --orange or make it strictly the "alert/warning" orange */
```

Add a warm radial glow to chapter-06 for drama:

```css
#chapter-06 {
  background: #1A1C1F;
  background-image: radial-gradient(ellipse at 20% 80%, rgba(196,112,58,0.06) 0%, transparent 60%);
}
```

**Typography pairing — final recommendation:**

| Role | Font | Weight |
|------|------|--------|
| Storybook display (h1s, greetings, section titles) | Lora | 500, 600 |
| UI chrome (nav, buttons, labels, body copy) | Inter | 400, 500, 600 |
| Financial numbers, mono data | DM Mono | 400, 500 |
| Drop Outfit | — | saves ~18KB |

Outfit adds a fourth font load for no differentiated purpose. Remove it from the Google Fonts import and the `--font-value` variable.

**Layout restructuring — Financial Health section:**

The 60-word intro + 108px score + donut + sub-score rows overflow the 100vh boundary on 768px-height laptops. Solution:

```css
@media (max-height: 900px) {
  .health-intro { display: none; }
}
```

Or compress intro to one sentence and move it below the score grid.

**The archetype card (`#2C1810`):**

Best component in the app. Dark espresso + warm orange/cream text is genuinely distinctive. One issue: emoji animals (`🦅`, `🐬`, etc.) render differently per OS. Add cross-platform normalization:

```css
.arch-animal {
  font-family: "Apple Color Emoji", "Segoe UI Emoji", "Noto Color Emoji", sans-serif;
}
```

Longer term: replace emoji with custom SVG silhouettes for pixel-perfect cross-platform consistency.

---

## ⚡ Quick Wins (High Impact, Low Effort)

**1. Apply Lora to display headings — 3 lines of CSS:**
```css
.profile-greeting, .health-title, .arch-name, .w-title, .act-title, .cf-title {
  font-family: 'Lora', Georgia, serif;
}
```
Instant storybook feeling. Biggest single visual improvement available.

**2. Fix `--font-value` and remove Outfit from Google Fonts import:**
```css
--font-value: 'DM Mono', monospace;
```
Remove `Outfit` from the `@import` URL. Saves a font load, fixes a semantic error.

**3. Add `prefers-reduced-motion` block:**
```css
@media (prefers-reduced-motion: reduce) {
  .arch-orbit-ring, .arch-animal-wrap::before { animation: none; }
  .ani, .ani-left, .ani-right, .ani-scale {
    transition: none !important;
    opacity: 1 !important;
    transform: none !important;
  }
}
```
Accessibility + battery life. Zero design compromise.

**4. Replace all raw hex grays with design tokens:**
Global find-replace: `#555` → `var(--ink-soft)`, `#aaa` → `var(--ink-ghost)`, `#999` → `var(--ink-soft)`, `#bbb` → `var(--ink-ghost)`. ~14 occurrences. Makes the token system actually consistent.

**5. Fix `.nav-label` contrast:**
```css
.nav-label { color: var(--ink-soft); } /* from #aaa (2.3:1) to #6B6760 (passes WCAG AA) */
```

---

## 💡 React & Pure CSS Fixes

**Rename CSS variables for semantic clarity:**

```css
:root {
  --font-story:  'Lora', Georgia, serif;      /* narrative headings */
  --font-ui:     'Inter', sans-serif;          /* all UI chrome */
  --font-number: 'DM Mono', monospace;         /* financial data */
}
```

Then global-replace `var(--font-heading)` → `var(--font-story)` and all inline `'DM Mono', monospace` → `var(--font-number)`.

**Extract Dashboard.jsx constants to `dashboardUtils.js`:**

`Dashboard.jsx` contains `getPeerBenchmark`, `getJourney`, `getTierColor`, `FBS_DIMENSION_DEFS`, `MONEY_SIGN_INFO`, `MONEY_SIGN_TRAITS`, and `TIER_ICONS` — all above the component. Extract to a `src/utils/dashboardUtils.js` file. The component file should contain only JSX and state logic.

**Eliminate inline `style={}` leaks in Dashboard.jsx:**

Line 486 example:
```jsx
style={{ fontSize: '11px', color: 'var(--ink-soft)', marginTop: '6px', textAlign: 'center', fontStyle: 'italic', opacity: 0.75 }}
```
Every inline style bypasses the design token system and makes theming impossible. Audit Dashboard.jsx for all `style={}` attributes and extract to named CSS classes in `index.css`.

**Add session-aware animation disabling for returning users:**

```css
.animations-disabled .ani,
.animations-disabled .ani-left,
.animations-disabled .ani-scale {
  transition: none !important;
  opacity: 1 !important;
  transform: none !important;
}
```

```js
// In Dashboard useEffect, after data loads:
if (sessionStorage.getItem('dashboard_visited')) {
  document.body.classList.add('animations-disabled');
} else {
  sessionStorage.setItem('dashboard_visited', '1');
}
```

First-time visitors get the full stagger reveal. Returning visitors within the same session get instant rendering.

---

*Generated by Claude Code UI Audit — 2026-04-04*
