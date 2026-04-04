# UI Audit Implementation Plan — FinHealth Dashboard

**Source:** `ui-audit-report.md` | **Date:** 2026-04-04 | **Rating to fix:** 6.8 → 8.5+

All 7 chunks below are fully independent — implement in any order.

---

## Chunk A — Font System Fix (P1 + P2) `HIGHEST IMPACT`

**What:** Fix wrong font variable assignments. Lora is imported but never used. Outfit is mislabelled as monospace.

**Files:** `frontend/src/index.css`

### Steps

1. **Fix CSS variable declarations** in `:root`:
   ```css
   --font-heading: 'Lora', Georgia, serif;   /* was 'Inter' — wrong */
   --font-value:   'DM Mono', monospace;      /* was 'Outfit', monospace — Outfit is NOT monospace */
   --font-ui:      'Inter', sans-serif;       /* add this if not present */
   ```

2. **Apply Lora to display/narrative elements**:
   ```css
   .profile-greeting,
   .health-title,
   .arch-name,
   .w-title,
   .act-title,
   .cf-title {
     font-family: var(--font-heading);
   }
   ```

3. **Remove Outfit from Google Fonts `@import` URL** — saves ~18KB font load.

4. **Set body font**:
   ```css
   body { font-family: var(--font-ui); }
   ```

---

## Chunk B — Accessibility Fixes (P3 + P7) `HIGH IMPACT`

**What:** Infinite orbit animation drains battery and violates `prefers-reduced-motion`. Nav labels fail WCAG AA contrast (2.3:1).

**Files:** `frontend/src/index.css`

### Steps

1. **Add `prefers-reduced-motion` block** (add at end of file):
   ```css
   @media (prefers-reduced-motion: reduce) {
     .arch-orbit-ring { animation: none; }
     .arch-animal-wrap::before { animation: none; }
     .arch-dot-pulse { animation: none; }
     .ani, .ani-left, .ani-right, .ani-scale {
       transition: none !important;
       opacity: 1 !important;
       transform: none !important;
     }
   }
   ```

2. **Fix `.nav-label` contrast** — `#aaa` on `#F7F4EF` = 2.3:1 (fails). Token `--ink-soft` = `#6B6760` passes WCAG AA:
   ```css
   .nav-label { color: var(--ink-soft); }
   ```

3. **Fix `.sec-btn` contrast** — same issue:
   ```css
   .sec-btn { color: var(--ink-soft); }
   ```

---

## Chunk C — Design Token Consistency (P5 + Quick Win 4)

**What:** Replace ~14 hardcoded hex grays with design tokens. Fix `.health-intro` which uses `#555` and is too wide.

**Files:** `frontend/src/index.css`

### Steps

1. **Global find-replace** across `index.css`:
   - `#555` → `var(--ink-soft)`
   - `#aaa` → `var(--ink-ghost)`
   - `#999` → `var(--ink-soft)`
   - `#bbb` → `var(--ink-ghost)`

2. **Fix `.health-intro`**:
   ```css
   .health-intro {
     font-size: 13px;
     color: var(--ink-soft);  /* was hardcoded #555 */
     line-height: 1.75;
     max-width: 680px;        /* was 800px — too wide */
   }
   ```

3. **Hide on short viewports** (prevents 100vh overflow on 768px-height laptops):
   ```css
   @media (max-height: 900px) {
     .health-intro { display: none; }
   }
   ```

---

## Chunk D — Score Column Layout (P4)

**What:** The 108px score number and the donut arc both show the same value — stacked redundantly. Integrate score inside donut.

**Files:** `frontend/src/pages/Dashboard.jsx`, `frontend/src/index.css`

### Steps

1. **In Dashboard.jsx** — locate the health score section. Wrap the SVG donut and score text together:
   ```jsx
   <div className="health-donut-wrap">
     {/* existing SVG donut here */}
     <div className="health-donut-center">
       <span className="score-big">{fbs}</span>
       <span className="score-denom">/100</span>
     </div>
   </div>
   ```

2. **Remove the standalone `score-big` / `score-denom` divs** that appear above the donut (the duplicated 108px number block).

3. **Increase donut SVG** — change `width` and `height` attributes on the `<svg>` to `180`.

4. **Add CSS**:
   ```css
   .health-donut-wrap {
     position: relative;
     display: inline-flex;
     align-items: center;
     justify-content: center;
   }
   .health-donut-center {
     position: absolute;
     display: flex; flex-direction: column;
     align-items: center; justify-content: center;
     pointer-events: none;
   }
   .score-big { font-size: 42px; } /* was 108px */
   ```

---

## Chunk E — Journey Card UX Fix (P6)

**What:** Cards lift on hover (implying interactivity) but have `cursor: default` (implying they're static). Contradiction breaks affordance.

**Files:** `frontend/src/index.css`

### Steps

**Option A — Remove misleading hover** (if cards are not interactive):
```css
.journey-card:hover {
  transform: none;
  box-shadow: none;
}
```

**Option B — Make cursor match hover** (if cards will become interactive):
```css
.journey-card { cursor: pointer; }
```

Check Dashboard.jsx for `onClick` handlers on `.journey-card` to decide which option applies.

---

## Chunk F — Session-Aware Animation Skip (React fix)

**What:** Every dashboard visit forces a 640ms stagger wait. After the first visit, animations should be skipped within the same session.

**Files:** `frontend/src/pages/Dashboard.jsx`, `frontend/src/index.css`

### Steps

1. **Add CSS** near `.ani` definitions in `index.css`:
   ```css
   .animations-disabled .ani,
   .animations-disabled .ani-left,
   .animations-disabled .ani-right,
   .animations-disabled .ani-scale {
     transition: none !important;
     opacity: 1 !important;
     transform: none !important;
   }
   ```

2. **Add `useEffect`** in Dashboard.jsx (after the existing data-fetch effect):
   ```js
   useEffect(() => {
     if (!data) return;
     if (sessionStorage.getItem('dashboard_visited')) {
       document.body.classList.add('animations-disabled');
     } else {
       sessionStorage.setItem('dashboard_visited', '1');
     }
     return () => document.body.classList.remove('animations-disabled');
   }, [data]);
   ```

---

## Chunk G — Visual Polish

**What:** Emoji inconsistency across OS, two near-identical orange tones, and the dark chapter missing depth.

**Files:** `frontend/src/index.css`

### Steps

1. **Normalize archetype emoji rendering**:
   ```css
   .arch-animal {
     font-family: "Apple Color Emoji", "Segoe UI Emoji", "Noto Color Emoji", sans-serif;
   }
   ```

2. **Consolidate accent colors** — `--orange: #D97757` and `--accent: #C4703A` are too close:
   ```css
   :root {
     --accent:       #C4703A;   /* primary brand orange — keep */
     --accent-light: #F0DDD0;   /* new soft tint for hover/tag backgrounds */
     /* retire --orange or reassign to "warning/alert" use only */
   }
   ```

3. **Warm radial glow on chapter-06** (the dark section):
   ```css
   #chapter-06 {
     background: #1A1C1F;
     background-image: radial-gradient(ellipse at 20% 80%, rgba(196,112,58,0.06) 0%, transparent 60%);
   }
   ```

---

## Critical Files
| File | Chunks |
|------|--------|
| `frontend/src/index.css` | A, B, C, D (partial), E, F (partial), G |
| `frontend/src/pages/Dashboard.jsx` | D (donut restructure), F (sessionStorage effect) |
| Google Fonts `@import` in `index.css` | A (remove Outfit) |

## Recommended Implementation Order
1. **A** — Biggest visual ROI, pure CSS variables
2. **B** — Accessibility, no design risk
3. **C** — Mechanical find-replace
4. **E** — 1–2 lines
5. **G** — Additive only
6. **F** — Small React change
7. **D** — Most structural, do last

## Verification Checklist
- [ ] **A:** Greeting "Hi Name" renders in Lora (serif), not Inter. Numbers still in DM Mono.
- [ ] **B:** DevTools → Emulate `prefers-reduced-motion` → orbit animation stops. Nav labels pass WCAG AA.
- [ ] **C:** Zero occurrences of `#555`, `#aaa`, `#999`, `#bbb` in `index.css`.
- [ ] **D:** FBS score number appears inside the donut circle, not above it.
- [ ] **E:** Hovering journey cards shows no lift (Option A) or cursor:pointer (Option B).
- [ ] **F:** Second dashboard visit in same session — no stagger delay.
- [ ] **G:** Archetype emoji consistent on Windows + Mac. Chapter-06 has subtle warm glow.
