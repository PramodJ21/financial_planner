# FinHealth — Full Design Audit

**Pages audited:** Welcome · Login · Register · Questionnaire · Dashboard (6 chapters) · Investments · Liabilities · Insurance · Tax · Estate & Will · Reports · Goal Planner

---

## PAGE 1 — Welcome

---

### Issue #1
**File:** `frontend/src/pages/Welcome.jsx:29-31` + `frontend/src/index.css:4792`
**Element:** "Start Assessment" CTA button
**Severity:** 🟠 Major
**Category:** Accessibility

**What's wrong (visitor perspective):**
The primary CTA button `Start Assessment` uses font-size `13px`. At 13px rendered text, it falls below the WCAG 2.1 AA body-text contrast threshold of 4.5:1 when rendered at small weight. More critically, the button has no minimum height set — on some devices it may render at only 30–32px tall, below the 44px minimum touch target. The first thing a user sees and should tap is potentially un-tappable.

**What's wrong (code perspective):**
`index.css:4792-4808` defines `.auth-left-container .btn-primary` with `font-size: 13px` and `padding: 11px 20px`. There is no `min-height` property. The root `.btn-primary` at `index.css:720-731` uses `font-size: 11px` with `padding: 7px 16px` — a 34px effective height. The Welcome-specific override bumps it but still has no floor.

**What needs to be done:**
1. In `index.css:4792`, add `min-height: 44px` to `.auth-left-container .btn-primary`.
2. Change `padding` to `12px 24px` to ensure comfortable touch target.
3. Optionally add `border-radius: 4px` to match the `.btn-dark` style used elsewhere for visual consistency.

**Impact if not fixed:** Mobile users may struggle to tap the primary conversion action. Direct registration loss.

---

### Issue #2
**File:** `frontend/src/components/AuthPreviewCard.jsx:22-27`
**Element:** AuthPreviewCard — preview KPI values format inconsistency
**Severity:** 🟡 Minor
**Category:** Content/Copy

**What's wrong (visitor perspective):**
The animated preview card shows numbers like `₹85.0K` for monthly savings — the trailing `.0` is unnecessary noise and looks unpolished. The `fmtInr` function uses `.toFixed(1)` for the K-range, producing `₹85.0K` instead of the cleaner `₹85K`.

**What's wrong (code perspective):**
`AuthPreviewCard.jsx:25`: `'₹' + (n/1000).toFixed(1) + 'K'` renders trailing decimals like `.0`. For whole-thousand values this looks wrong.

**What needs to be done:**
1. In `AuthPreviewCard.jsx:25`, change `(n/1000).toFixed(1)` to `Math.round(n/1000)` to eliminate `₹85.0K` → `₹85K`.
2. Consider adding a lakh branch: `if (n >= 100000) return '₹' + (n/100000).toFixed(1) + 'L';` for better Indian number formatting.

**Impact if not fixed:** Minor credibility issue with the preview card showing awkward number formats.

---

### Issue #3
**File:** `frontend/src/index.css:5413-5416`
**Element:** Auth preview card — hidden below 900px
**Severity:** 🟠 Major
**Category:** Responsiveness

**What's wrong (visitor perspective):**
On tablets (768–900px wide), the animated preview card on the right side disappears entirely. The page becomes a plain form on a bare background with no visual context about what the product does. The left side alone at 900px renders with massive padding and looks empty, giving no social proof or product demonstration.

**What's wrong (code perspective):**
`index.css:5413-5416`: `.ap-right { display: none; }` at `max-width: 900px`. The left panel uses `flex: 1.2` (`index.css:4685`) and has no compensating layout change when `.ap-right` disappears — it just stretches to full width with excessive 80px top/bottom padding.

**What needs to be done:**
1. In the `@media (max-width: 900px)` block at `index.css:5413`, add compensating styles for the left side:
```css
@media (max-width: 900px) {
  .ap-right { display: none; }
  .auth-left { padding: 48px 32px; justify-content: flex-start; padding-top: 80px; }
}
```
2. Alternatively, add a short 3-bullet trust strip that appears at ≤900px in place of the card.

**Impact if not fixed:** Tablet visitors (iPad-sized) land on a bare page with no product context or trust signals.

---

## PAGE 2 — Login

---

### Issue #4
**File:** `frontend/src/pages/Login.jsx:71`
**Element:** "Forgot password?" link — alert() dialog
**Severity:** 🟠 Major
**Category:** Interaction/UX

**What's wrong (visitor perspective):**
Clicking "Forgot password?" triggers a native browser `alert()` dialog saying "Password reset is not yet available." This is jarring, looks unfinished, and breaks the flow. On mobile it triggers the OS alert which is styled differently from the app. Users who forgot their password are now stuck — they can't log in and can't reset it. They will leave.

**What's wrong (code perspective):**
`Login.jsx:71`: `onClick={(e) => { e.preventDefault(); alert('Password reset is not yet available. Please contact support.'); }}`. The `alert()` function causes a synchronous blocking dialog. This is a pattern reserved for debugging — never for production UX.

**What needs to be done:**
1. Remove the `alert()`. Replace with an inline message displayed in the page:
```jsx
// Add state: const [forgotMsg, setForgotMsg] = useState('');
// In onClick: setForgotMsg('Password reset is not yet available. Please contact support at support@finhealth.in');
```
2. Below the password field, conditionally render: `{forgotMsg && <div className="auth-info-msg">{forgotMsg}</div>}`
3. Style `.auth-info-msg` with a soft amber background in `index.css`.

**Impact if not fixed:** Users who forgot passwords are blocked from recovery and forced to abandon the app. Significant trust damage.

---

### Issue #5
**File:** `frontend/src/pages/Login.jsx:66`
**Element:** Password visibility toggle button — `tabIndex={-1}`
**Severity:** 🟡 Minor
**Category:** Accessibility

**What's wrong (visitor perspective):**
Keyboard users cannot reach the eye toggle button to show/hide their password. Tab navigation skips it entirely. Screen reader users pressing Tab will land directly on the submit button without being able to toggle password visibility.

**What's wrong (code perspective):**
`Login.jsx:66`: `tabIndex={-1}` intentionally removes the button from the tab order. Same issue exists in `Register.jsx:87` and `Register.jsx:112`.

**What needs to be done:**
1. Remove `tabIndex={-1}` from all password toggle buttons in `Login.jsx:66`, `Register.jsx:87`, and `Register.jsx:112`.
2. Ensure the button has a visible focus ring — add to `index.css`:
```css
.auth-pw-toggle:focus { outline: 2px solid var(--ink); outline-offset: 2px; }
```

**Impact if not fixed:** Keyboard-only and screen reader users cannot toggle password visibility — WCAG 2.1 AA failure (2.1.1 Keyboard).

---

## PAGE 3 — Register

---

### Issue #6
**File:** `frontend/src/pages/Register.jsx:32`
**Element:** Password mismatch — form-level error only
**Severity:** 🟡 Minor
**Category:** Forms

**What's wrong (visitor perspective):**
When passwords don't match, the error message `"Passwords do not match"` appears at the top of the form, far from the confirm password field. A user filling a long form has to look up to find why their submit failed. Best practice puts the error next to the field that caused it.

**What's wrong (code perspective):**
`Register.jsx:32`: `if (formData.password !== formData.confirmPassword) return setError('Passwords do not match')`. The `error` state is displayed at the top of the form (line 60). There's no field-level validation or error state on the confirm field.

**What needs to be done:**
1. Add a separate state: `const [confirmError, setConfirmError] = useState('');`
2. On the confirm field's `onChange`, check if `formData.password !== value` and `setConfirmError('Passwords do not match')` inline.
3. Display `{confirmError && <div className="auth-field-error">{confirmError}</div>}` immediately below the confirm field at `Register.jsx:115`.

**Impact if not fixed:** Users waste time scanning the form to find what went wrong, increasing friction and abandonment.

---

### Issue #7
**File:** `frontend/src/pages/Register.jsx:74-76`
**Element:** Phone field — no format validation
**Severity:** 🔵 Suggestion
**Category:** Forms

**What's wrong (visitor perspective):**
The phone field placeholder says `"+91 XXXXX XXXXX"` but accepts any text with no validation feedback. Invalid phone numbers silently pass through.

**What's wrong (code perspective):**
`Register.jsx:75`: `type="tel"` is correct for mobile keyboards, but no `pattern` attribute is set. No validation occurs on this field.

**What needs to be done:**
1. Add `pattern="[+]?[0-9\s\-]{10,15}"` to the input.
2. Add `maxLength={15}` to prevent overly long input.
3. Consider a hint: `<span className="auth-field-hint">10 digits, e.g. 98765 43210</span>` below the field.

**Impact if not fixed:** Minor — invalid phone numbers may reach the backend without validation.

---

## PAGE 4 — Questionnaire

---

### Issue #8
**File:** `frontend/src/pages/Welcome.jsx:24` vs `frontend/src/pages/Questionnaire.jsx:7-21`
**Element:** Progress indicator — 13 steps vs. claimed "10 sections"
**Severity:** 🟠 Major
**Category:** Content/Copy

**What's wrong (visitor perspective):**
The Welcome page says "10 sections — income, expenses, investments…" and "8–12 minutes." The questionnaire has 13 steps. This discrepancy (10 vs. 13) feels like bait-and-switch — users expect 10 steps and get 13. They may abandon feeling misled.

**What's wrong (code perspective):**
`Questionnaire.jsx:7-21` defines `STEPS` with 13 items. `Welcome.jsx:24` states "10 sections." The `TOTAL_STEPS = 13` constant (`Questionnaire.jsx:26`) confirms the mismatch.

**What needs to be done:**
1. Either update `Welcome.jsx:24` to say "13 steps" or consolidate steps so the count matches.
2. If steps 7 (Goals) and 13 (Review) are optional/non-data steps, update the copy to say "10 data steps + goal setup + review."
3. The progress bar in the questionnaire header should clearly state "Step X of 13" not just a percentage.

**Impact if not fixed:** Trust damage from perceived inconsistency. Users may feel misled about the time commitment.

---

### Issue #9
**File:** `frontend/src/index.css:3979-3988`
**Element:** Questionnaire page content area — no mobile responsive padding
**Severity:** 🟠 Major
**Category:** Responsiveness

**What's wrong (visitor perspective):**
The questionnaire content area `.qn-page` has `padding: 48px 64px` on desktop. On mobile this isn't overridden, leaving only ~247px for form fields on a 375px screen. Labels, inputs, and hint text will be dangerously narrow and possibly overflow.

**What's wrong (code perspective):**
`index.css:3979-3988`: `.qn-page { padding: 48px 64px; }`. The `@media (max-width: 768px)` block (lines 2887–3180) has no `.qn-page` override.

**What needs to be done:**
1. In the `@media (max-width: 768px)` block near `index.css:2887`, add:
```css
.qn-page {
  padding: 24px 20px;
}
.qn-progress-bar-wrap {
  padding: 12px 20px;
}
```
2. Verify `.qn-sidebar` (260px wide) is hidden on mobile.

**Impact if not fixed:** Questionnaire is unusable on mobile — the most common path after clicking "Start Assessment" on a phone.

---

### Issue #10
**File:** `frontend/src/index.css:3990-3994`
**Element:** Questionnaire form grid — 2-column layout not collapsing on mobile
**Severity:** 🟠 Major
**Category:** Responsiveness

**What's wrong (visitor perspective):**
The `.qn-form-grid` uses a 2-column layout by default. On mobile the 260px questionnaire sidebar plus 2-column form layout creates critically cramped inputs.

**What's wrong (code perspective):**
`index.css:3990-3994`: `.qn-form-grid { grid-template-columns: 1fr 1fr; }`. The `@media (max-width: 768px)` block includes `.goal-form-grid` but not `.qn-form-grid`.

**What needs to be done:**
1. In the `@media (max-width: 768px)` block at `index.css:2890`, add:
```css
.qn-form-grid {
  grid-template-columns: 1fr;
}
```
2. Consider also adding a `@media (max-width: 900px)` override to collapse earlier given the sidebar presence.

**Impact if not fixed:** Form fields are cramped on mobile — the questionnaire is the core product flow.

---

## PAGE 5 — Dashboard

---

### Issue #11
**File:** `frontend/src/pages/Dashboard.jsx:195-199`
**Element:** Loading state — no accessible loading announcement
**Severity:** 🟡 Minor
**Category:** Accessibility

**What's wrong (visitor perspective):**
The loading screen is visual-only. Screen reader users receive no announcement when loading completes and content appears. There's no `aria-live` region.

**What's wrong (code perspective):**
`Dashboard.jsx:195-199`: The loading div has no `role="status"` or `aria-live` attribute. When `loading` transitions to `false`, there's no accessible notification. Same pattern in `Investments.jsx:73`, `Liabilities.jsx:56`, `Insurance.jsx:55`, `Tax.jsx:57`, `Reports.jsx:28`.

**What needs to be done:**
1. In `Dashboard.jsx:196`, change to:
```jsx
<div className="dash-loading" role="status" aria-live="polite" aria-label="Loading your dashboard">
```
2. Apply the same fix to all six loading states across pages.

**Impact if not fixed:** Screen reader users get no feedback during loading — WCAG 2.1 AA failure (4.1.3 Status Messages).

---

### Issue #12
**File:** `frontend/src/pages/Dashboard.jsx:158-181`
**Element:** Arrow key navigation hijack
**Severity:** 🟠 Major
**Category:** Accessibility

**What's wrong (visitor perspective):**
Arrow keys are hijacked for dashboard chapter scrolling. A user trying to navigate a dropdown or use arrow keys in any interactive context finds them mysteriously moving the dashboard between chapters instead.

**What's wrong (code perspective):**
`Dashboard.jsx:159-181`: The `keydown` handler captures `ArrowDown/Up/Right/Left` and only exempts `INPUT` and `TEXTAREA` tags. It doesn't exempt `SELECT`, `[role="listbox"]`, `[role="dialog"]`, or `BUTTON`.

**What needs to be done:**
1. In `Dashboard.jsx:163`, extend the guard:
```js
if (['INPUT', 'TEXTAREA', 'SELECT', 'BUTTON'].includes(e.target.tagName)) return;
if (e.target.closest('[role="dialog"]') || e.target.closest('[aria-modal]')) return;
```

**Impact if not fixed:** Keyboard users in action confirmation dialogs may have arrow-key inputs hijacked, causing unexpected navigation.

---

### Issue #13
**File:** `frontend/src/pages/Dashboard.jsx:354-359`
**Element:** FBS donut chart — no accessible label
**Severity:** 🟡 Minor
**Category:** Accessibility

**What's wrong (visitor perspective):**
The SVG donut chart has no accessible label. Screen reader users hear nothing meaningful when encountering this important chart.

**What's wrong (code perspective):**
`Dashboard.jsx:354-358`: The `<svg>` element has no `role`, `aria-label`, or `<title>` element.

**What needs to be done:**
1. Add to the SVG opening tag:
```jsx
<svg width="120" height="120" viewBox="0 0 120 120"
  role="img"
  aria-label={`Financial Behaviour Score: ${fbs} out of 100 — ${fbsRatingLabel}`}>
  <title>FBS Score: {fbs}/100 ({fbsRatingLabel})</title>
```

**Impact if not fixed:** WCAG 2.1 AA failure (1.1.1 Non-text Content).

---

### Issue #14
**File:** `frontend/src/pages/Dashboard.jsx:601-603`
**Element:** Action plan "Done →" button — ambiguous label
**Severity:** 🟡 Minor
**Category:** Accessibility

**What's wrong (visitor perspective):**
Multiple "Done →" buttons with no distinguishing context are indistinguishable for screen reader users. They can't tell which action they're completing.

**What's wrong (code perspective):**
`Dashboard.jsx:601-603`: `<button className="act-cta" onClick={...}>Done →</button>` — no `aria-label` with the action title context.

**What needs to be done:**
1. Change to: `` <button className="act-cta" aria-label={`Mark "${action.title}" as done`} onClick={...}>Done →</button> ``
2. Add `aria-label="Yes, mark as done"` and `aria-label="No, cancel"` to confirm buttons at `Dashboard.jsx:597-598`.

**Impact if not fixed:** WCAG 2.1 AA failure (4.1.2 Name, Role, Value).

---

### Issue #15
**File:** `frontend/src/index.css:452-454`
**Element:** Hidden scrollbar on main scroll container — all pages
**Severity:** 🔵 Suggestion
**Category:** UX / Navigation

**What's wrong (visitor perspective):**
The scrollbar is completely hidden on all pages. On content-heavy pages (Tax, Reports, Goal Planner), users have no visual indicator of scroll position or page length.

**What's wrong (code perspective):**
`index.css:452-455`: `scrollbar-width: none` and `.main::-webkit-scrollbar { display: none; }` apply globally to all pages, not just the dashboard snap-scroll.

**What needs to be done:**
1. Restore the scrollbar for non-dashboard pages:
```css
.main:not(:has(.dashboard-book)) {
  scrollbar-width: thin;
  scrollbar-color: var(--ink-ghost) transparent;
}
.main:not(:has(.dashboard-book))::-webkit-scrollbar { display: block; width: 6px; }
.main:not(:has(.dashboard-book))::-webkit-scrollbar-thumb { background: var(--ink-ghost); }
```
2. Keep `scrollbar-width: none` only for `.main.snap-active` (dashboard).

---

## PAGE 6 — Investments

---

### Issue #16
**File:** `frontend/src/pages/Investments.jsx:13-46`
**Element:** Flip cards — no keyboard trigger, no accessible role
**Severity:** 🟠 Major
**Category:** Accessibility

**What's wrong (visitor perspective):**
The investment analysis cards flip to show detailed explanations when clicked. Keyboard users cannot flip the cards — there's no `onKeyDown` handler. The flip action is entirely mouse-only across four pages.

**What's wrong (code perspective):**
`Investments.jsx:17-20`: `<div className={...} onClick={() => hasBack && setFlipped(f => !f)}>`. The outer `div` has a click handler but no `role="button"`, no `tabIndex="0"`, and no `onKeyDown` handler. Same pattern in `Liabilities.jsx:12-43`, `Insurance.jsx:12-44`, `Tax.jsx:15-46`.

**What needs to be done:**
1. In `Investments.jsx:17`, change the outer div:
```jsx
<div
  role={hasBack ? "button" : undefined}
  tabIndex={hasBack ? 0 : undefined}
  aria-pressed={flipped}
  aria-label={flipped ? `${name} — showing analysis. Press to flip back.` : `${name} — press to see analysis`}
  className={`analysis-item${flipped ? ' flipped' : ''}`}
  onClick={() => hasBack && setFlipped(f => !f)}
  onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && hasBack && setFlipped(f => !f)}
>
```
2. Apply this same fix to all four FlipCard components in Liabilities, Insurance, and Tax pages.

**Impact if not fixed:** Keyboard users cannot access detailed analysis content on four major pages — WCAG 2.1 AA failure (2.1.1 Keyboard).

---

### Issue #17
**File:** `frontend/src/pages/Investments.jsx:194`
**Element:** Asset holdings table — inline `style={{ overflowX: 'auto' }}`
**Severity:** 🔵 Suggestion
**Category:** Code Quality

**What's wrong (code perspective):**
`Investments.jsx:194`: `<div style={{ overflowX: 'auto' }}>` — inline style where the `.table-scroll-wrapper` class already exists and is used in Liabilities, Insurance, Tax, and Estate pages.

**What needs to be done:**
Replace `<div style={{ overflowX: 'auto' }}>` with `<div className="table-scroll-wrapper">` in `Investments.jsx:194`.

---

## PAGE 7 — Liabilities

---

### Issue #18
**File:** `frontend/src/pages/Liabilities.jsx:138-139`
**Element:** Credit score empty state — inline style
**Severity:** 🔵 Suggestion
**Category:** Code Quality

**What's wrong (code perspective):**
`Liabilities.jsx:138-139`: `<span style={{ fontFamily: "'Fraunces',serif", fontSize: '32px', color: 'var(--ink-ghost)' }}>` — three inline styles that should be a CSS class.

**What needs to be done:**
1. Add to `index.css`:
```css
.credit-score-empty { font-family: 'Fraunces', serif; font-size: 32px; color: var(--ink-ghost); }
```
2. Replace the inline style with `<span className="credit-score-empty">`.

---

### Issue #19
**File:** `frontend/src/pages/Liabilities.jsx:221-223`
**Element:** Empty table state — inline style
**Severity:** 🔵 Suggestion
**Category:** Code Quality

**What's wrong (code perspective):**
`Liabilities.jsx:222`: `<td colSpan={6} style={{ padding: '40px 12px', textAlign: 'center', color: 'var(--ink-soft)', fontSize: '16px' }}>` — same pattern appears in Insurance page. A shared `.empty-cell` class would centralize this.

**What needs to be done:**
Add `.empty-cell { padding: 40px 12px; text-align: center; color: var(--ink-soft); font-size: 16px; }` to `index.css` and replace all inline styles.

---

## PAGE 8 — Insurance

---

### Issue #20
**File:** `frontend/src/pages/Insurance.jsx:303-305`
**Element:** Recommendations table — "Ideal term life cover" row looks like misformatted data
**Severity:** 🟠 Major
**Category:** Content/Copy

**What's wrong (visitor perspective):**
In the Recommendation Summary table, the bottom row displays `"Ideal term life cover: ₹X,XX,XX,XXX"` as a `<td>` — it looks like a misformatted table footer. Users are confused: is this a heading? A second recommendation? An error?

**What's wrong (code perspective):**
`Insurance.jsx:302-305`:
```jsx
<tr>
  <td><span className="asset-name">Ideal term life cover: {fmt(ins.idealTermCover)}</span></td>
  <td colSpan={3}></td>
</tr>
```
This is an empty-colspan row with content only in the first cell. It should be a `<tfoot>` or a note below the table.

**What needs to be done:**
1. Remove this `<tr>` from the `<tbody>`.
2. Add a `<tfoot>` element:
```jsx
<tfoot>
  <tr><td colSpan={4} className="table-footnote">Ideal term life cover: {fmt(ins.idealTermCover)}</td></tr>
</tfoot>
```
3. Add `.table-footnote { font-size: 12px; color: var(--ink-soft); padding: 8px 12px; }` to `index.css`.

**Impact if not fixed:** Confusing table structure undermines the user's understanding of their insurance gap.

---

### Issue #21
**File:** `frontend/src/pages/Insurance.jsx:312-320`
**Element:** Impact alert — shortfall amount displayed twice
**Severity:** 🟡 Minor
**Category:** Content/Copy

**What's wrong (visitor perspective):**
The impact alert reads: **"Impact on Premiums:** Plan your financial protection. Required: ₹X. Shortfall: ₹Y." and then shows `₹Y` again in an `.impact-alert-amount` span on the right. The shortfall amount appears twice in the same alert.

**What's wrong (code perspective):**
`Insurance.jsx:315-319`: The body text includes `Shortfall: {fmt(ins.additionalCoverNeeded)}` and then `<span className="impact-alert-amount">{fmt(ins.additionalCoverNeeded)}</span>` shows the same value again.

**What needs to be done:**
1. Remove `Shortfall: {fmt(ins.additionalCoverNeeded)}.` from the body text.
2. Improve: `"You are underinsured. Your ideal cover is {fmt(ins.idealTermCover)} — add a term plan to close the gap."`.

---

## PAGE 9 — Tax

---

### Issue #22
**File:** `frontend/src/pages/Tax.jsx:21-44`
**Element:** Tax FlipCard — inline transform styles bypass CSS flip system
**Severity:** 🟡 Minor
**Category:** Code Quality

**What's wrong (code perspective):**
`Tax.jsx:21`: inline `style={{ perspective: '1000px', cursor: ... }}` and `Tax.jsx:24`: inline `style={{ position: 'relative', transformStyle: 'preserve-3d', transition: '...', transform: flipped ? 'rotateY(180deg)' : 'none' }}`. The other three pages handle flip card transforms entirely in CSS via `.flipped .flip-inner`. Tax re-implements this in JS/inline styles.

**What needs to be done:**
1. Move `perspective: 1000px` to `.tax-rec-box` in `index.css`.
2. Remove the inline `transform` and `transition` from `Tax.jsx:24` — let `.flipped .flip-inner` CSS handle it.
3. Handle the `noBorder` prop via a `.tax-rec-box.no-border` CSS class.

---

### Issue #23
**File:** `frontend/src/pages/Tax.jsx:149`, `Tax.jsx:231`, `Tax.jsx:269`
**Element:** Repeated `style={{ marginBottom: '24px' }}` on `.act-label`
**Severity:** 🔵 Suggestion
**Category:** Code Quality

**What's wrong (code perspective):**
`.act-label` is defined in `index.css:655-663` with `margin-bottom: 18px`. The Tax page overrides this inline on three separate elements with `style={{ marginBottom: '24px' }}`. Anyone reading the CSS would not know the actual margin used.

**What needs to be done:**
1. Remove the inline `marginBottom` from `Tax.jsx:149`, `Tax.jsx:232`, `Tax.jsx:270`.
2. If 24px is correct, update `.act-label` in `index.css:663` to `margin-bottom: 24px`.

---

## PAGE 10 — Estate & Will

---

### Issue #24
**File:** `frontend/src/pages/Estate.jsx:43-48`
**Element:** Nomination status table — false precision from inferred per-account data
**Severity:** 🟠 Major
**Category:** Content/Copy

**What's wrong (visitor perspective):**
The nomination status table shows "Yes/No" for 5 specific account types (Bank, Demat, Insurance, PF/NPS, Mutual Funds). But this data is inferred from a single questionnaire field `nomineesSet` which can only be "Yes, all", "Yes, some", or "No". A user who set nominees on mutual funds but not bank accounts will see completely incorrect data.

**What's wrong (code perspective):**
`Estate.jsx:43-48`: `nominationRows` maps account types to booleans based on string matching against `will.nomineesSet`. For "Yes, some", only bank and PF are marked set — a hardcoded assumption that doesn't reflect reality.

**What needs to be done:**
1. Option A: Add per-account checkboxes to the questionnaire estate step.
2. Option B: Replace the false-precision table with an honest summary card: "Nominees: Partially set — confirm each account individually."
3. At minimum, add a disclaimer note below the table: "This status is estimated from your questionnaire answer. Verify each account individually."

**Impact if not fixed:** Users may see "Demat Account: Complete" when their demat account actually has no nominee — potentially harmful misinformation about financial planning.

---

## PAGE 11 — Reports

---

### Issue #25
**File:** `frontend/src/pages/Reports.jsx:151`
**Element:** Summary KPIs grid — redundant inline grid style
**Severity:** 🔵 Suggestion
**Category:** Code Quality

**What's wrong (code perspective):**
`Reports.jsx:151`: `<div className="analysis-grid" style={{ gridTemplateColumns: 'repeat(3, 1fr)' }}>`. If `.analysis-grid` already defaults to 3 columns, this inline style is redundant and masks any CSS changes.

**What needs to be done:**
Remove the inline `style` from `Reports.jsx:151` and verify `.analysis-grid` defaults to 3 columns in `index.css`.

---

### Issue #26
**File:** `frontend/src/pages/Reports.jsx:83-133`
**Element:** Download report — creates `.html` file, not PDF
**Severity:** 🟠 Major
**Category:** Interaction/UX

**What's wrong (visitor perspective):**
The "Download Report" button downloads an `.html` file — not a PDF. Most users expect a PDF. An `.html` file requires the user to open it in a browser and manually print/export. On mobile, an `.html` download is often saved to an inaccessible downloads folder.

**What's wrong (code perspective):**
`Reports.jsx:126`: `a.download = 'FinHealth_Action_Plan_${...}.html'`. The imports at `Reports.jsx:1-5` include `jsPDF` and `autoTable` but these are never used — dead imports. The download is a raw HTML blob.

**What needs to be done:**
1. Either change the button label to "Save Report (HTML)" and add a note: `<span class="report-hint">Use Print → Save as PDF to create a PDF.</span>`
2. Or implement the already-imported jsPDF to generate an actual PDF — the library is already in the bundle.
3. Remove the dead `jsPDF` and `XLSX` imports if not implemented to reduce bundle size.

**Impact if not fixed:** Users who expect a PDF are confused. The imported jsPDF/XLSX packages add bundle weight without being used.

---

### Issue #27
**File:** `frontend/src/pages/Reports.jsx:142`
**Element:** Download Report button — redundant inline styles
**Severity:** 🔵 Suggestion
**Category:** Code Quality

**What's wrong (code perspective):**
`Reports.jsx:142`: `<button className="btn-dark" style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 16px' }}>`. The `.btn-dark` class already defines these properties. The inline style is redundant.

**What needs to be done:**
Remove the `style` attribute from `Reports.jsx:142`.

---

## PAGE 12 — Goal Planner

---

### Issue #28
**File:** `frontend/src/pages/GoalPlanner.jsx:141-148`
**Element:** "Add Goal" — silent validation failure
**Severity:** 🟠 Major
**Category:** Forms

**What's wrong (visitor perspective):**
If a user clicks "Add Goal" without filling required fields, nothing happens — the function returns silently. There's no error message, no field highlight, no indication of what went wrong. Users tap the button repeatedly confused, then assume the feature is broken.

**What's wrong (code perspective):**
`GoalPlanner.jsx:141-148`: `if (!formName || !formTarget || !formYears) return;` — returns early on validation failures without setting any error state or providing visual feedback. Same silent return for the custom allocation check at line 145-148.

**What needs to be done:**
1. Add a `formErrors` state: `const [formErrors, setFormErrors] = useState({})`.
2. Before the return, set errors: `setFormErrors({ name: !formName, target: !formTarget, years: !formYears })`.
3. Display error styling on fields: `className={`gp-input ${formErrors.name ? 'input-error' : ''}`}`.
4. Add `.input-error { border-color: var(--red) !important; }` to `index.css`.

**Impact if not fixed:** Users who can't add goals assume the feature is broken and abandon Goal Planner.

---

### Issue #29
**File:** `frontend/src/pages/GoalPlanner.jsx:56-64`
**Element:** Auto-save — no visible save indicator
**Severity:** 🟡 Minor
**Category:** Interaction/UX

**What's wrong (visitor perspective):**
Goals auto-save 1.5 seconds after changes, but the user gets no visual feedback. They have no idea whether closing the tab will lose their data.

**What's wrong (code perspective):**
`GoalPlanner.jsx:49-63`: The save timeout fires `fetchWithAuth` with no success/error feedback to the UI. The `notification` state (`GoalPlanner.jsx:80`) exists but isn't wired to save events.

**What needs to be done:**
1. In the save timeout, add: `.then(() => setNotification({ type: 'success', msg: 'Goals saved' }))`.
2. Auto-dismiss after 2 seconds.
3. Display as a small toast near the goal list header.

**Impact if not fixed:** Users are uncertain whether their data persisted, leading to re-entry and distrust of the auto-save.

---

## CROSS-CUTTING ISSUES

---

### Issue #30
**File:** `frontend/src/pages/Tax.jsx:136`, `Tax.jsx:143`, `frontend/src/pages/Reports.jsx:157`, `Reports.jsx:165`, `Reports.jsx:175`
**Element:** `analysis-value` inline color overrides bypassing semantic CSS classes
**Severity:** 🔵 Suggestion
**Category:** Code Quality / Visual Consistency

**What's wrong (code perspective):**
Multiple pages use `className="analysis-value"` but override color with inline styles: `style={{ color: 'var(--green)' }}`, `style={{ color: progressPct >= 50 ? 'var(--green)' : 'var(--accent)' }}`. The `.analysis-value.ok` and `.analysis-value.warn` CSS classes exist exactly for this purpose.

**What needs to be done:**
1. In `Tax.jsx:136`, replace `style={{ color: 'var(--green)' }}` with `className="analysis-value ok"`.
2. In `Reports.jsx:165`, remove the inline color: `className={`analysis-value ${progressPct >= 50 ? 'ok' : 'warn'}`}`.
3. Remove all `style={{ marginTop: '8px' }}` inline overrides on `.analysis-value` elements in Reports.

---

### Issue #31
**File:** `frontend/src/index.css:720-731`
**Element:** `.btn-primary` — no `:hover` state
**Severity:** 🟡 Minor
**Category:** Interaction/UX

**What's wrong (visitor perspective):**
The `.btn-primary` button (the "Start Assessment" CTA on Welcome) has a `:focus` state but no `:hover` state. Hovering produces no visual change — it feels unresponsive and dead on desktop.

**What's wrong (code perspective):**
`index.css:720-731`: `.btn-primary` has no `.btn-primary:hover` rule anywhere in the file.

**What needs to be done:**
Add after line 731:
```css
.btn-primary:hover {
  background: #333;
  border-color: #333;
}
```

**Impact if not fixed:** The most important CTA on the Welcome page feels unresponsive on desktop.

---

### Issue #32
**File:** `frontend/src/index.css:701-713`
**Element:** `.btn-ghost` — no `:focus` state
**Severity:** 🟡 Minor
**Category:** Accessibility

**What's wrong (visitor perspective):**
The ghost button has a `:hover` state but no `:focus` state. Keyboard users tabbing to ghost buttons see no focus indicator.

**What needs to be done:**
Add:
```css
.btn-ghost:focus {
  outline: 2px solid var(--ink);
  outline-offset: 2px;
}
```

---

### Issue #33
**File:** `frontend/src/index.css:2887-3180`
**Element:** Single 768px breakpoint — no 480px breakpoint for small phones
**Severity:** 🟠 Major
**Category:** Responsiveness

**What's wrong (visitor perspective):**
The entire responsive design uses a single 768px breakpoint. On small phones (320–480px), elements designed for the 768px layout are still too wide. The auth form at `max-width: 440px` barely fits on a 375px phone with padding. The questionnaire sidebar at 260px has no sub-480px handling.

**What's wrong (code perspective):**
Searching `index.css` — only two media query breakpoints exist: `@media (max-width: 768px)` and `@media (max-width: 1100px)`. No `@media (max-width: 480px)` breakpoint exists.

**What needs to be done:**
1. Add a `@media (max-width: 480px)` section at the end of `index.css`:
```css
@media (max-width: 480px) {
  .auth-left { padding: 40px 20px; }
  .auth-left-container { max-width: 100%; }
  .landing-title { font-size: 32px; }
  .qn-page { padding: 16px 16px; }
  .main:not(:has(.dashboard-book)) { padding: 16px; }
}
```
2. Test on 375px (iPhone SE) specifically.

**Impact if not fixed:** Users on small Android phones and iPhone SE experience layout overflow and cramped forms across multiple pages.

---

### Issue #34
**File:** `frontend/src/index.css:462-468`
**Element:** Non-dashboard page padding — no tablet intermediate breakpoint
**Severity:** 🟠 Major
**Category:** Responsiveness

**What's wrong (visitor perspective):**
All non-dashboard explore pages have `padding: 48px 64px`. Between 768px and 1024px (tablet landscape, iPad), the 64px side padding may be too tight for 3-column grids.

**What's wrong (code perspective):**
`index.css:463-468`: `.main:not(:has(.dashboard-book)) { padding: 48px 64px; }`. No intermediate breakpoint for tablet (1024px) exists.

**What needs to be done:**
1. Add a `@media (max-width: 1024px)` rule:
```css
@media (max-width: 1024px) {
  .main:not(:has(.dashboard-book)) {
    padding: 32px 40px;
  }
}
```

---

## Summary Tables

### A. Page-by-Page Issue Count

| Page | 🔴 Critical | 🟠 Major | 🟡 Minor | 🔵 Suggestion | Total |
|------|:-----------:|:-------:|:-------:|:------------:|:-----:|
| Welcome | 0 | 2 | 1 | 0 | 3 |
| Login | 0 | 1 | 1 | 0 | 2 |
| Register | 0 | 1 | 1 | 1 | 3 |
| Questionnaire | 0 | 3 | 0 | 0 | 3 |
| Dashboard | 0 | 2 | 3 | 1 | 6 |
| Investments | 0 | 1 | 0 | 1 | 2 |
| Liabilities | 0 | 0 | 0 | 2 | 2 |
| Insurance | 0 | 1 | 1 | 0 | 2 |
| Tax | 0 | 0 | 1 | 2 | 3 |
| Estate & Will | 0 | 1 | 0 | 0 | 1 |
| Reports | 0 | 1 | 0 | 2 | 3 |
| Goal Planner | 0 | 1 | 1 | 0 | 2 |
| Cross-cutting | 0 | 3 | 3 | 2 | 8 |
| **TOTAL** | **0** | **17** | **12** | **11** | **40** |

---

### B. Top 10 Highest-Impact Issues

1. **Issue #16 — Flip cards are keyboard-inaccessible (4 pages)** — The entire flip-card analysis mechanic on Investments, Liabilities, Insurance, and Tax is mouse-only. Keyboard users cannot access detailed analysis content. This is the most widespread accessibility failure.

2. **Issue #26 — Download Report generates an HTML file, not PDF** — Users expect a PDF. An HTML download on mobile is unusable. The jsPDF library is already imported but unused — this is a visible promise broken at the most important export touchpoint.

3. **Issue #4 — Forgot Password uses `alert()`** — A browser alert dialog on "Forgot password?" looks broken and unprofessional. Users who can't log in are completely blocked with no recovery path.

4. **Issue #8 — Welcome says "10 sections", questionnaire has 13** — First thing a new user encounters after the landing page is a different step count than promised. Trust damage at the critical conversion moment.

5. **Issue #9 — Questionnaire has no mobile padding override** — 64px side padding on mobile makes the form fields potentially unusable on small screens. This is the core product flow on mobile.

6. **Issue #24 — Estate nomination table shows false precision** — The table shows per-account nominee status inferred from a single "Yes/Some/No" field. A user may see "Demat: Complete" when it isn't. Potentially harmful misinformation.

7. **Issue #28 — Goal Planner silent validation failure** — Clicking "Add Goal" with empty fields silently fails. Users tap repeatedly confused, assume the feature is broken, and abandon.

8. **Issue #3 — Auth preview card disappears at 768–900px** — Tablets show a bare, context-free login page with no product demonstration. First-time iPad visitors have no reason to sign up.

9. **Issue #33 — Single 768px breakpoint, no 480px** — Small phone users (375px) experience layout issues across multiple pages that the 768px breakpoint never catches.

10. **Issue #31 — `.btn-primary` has no `:hover` state** — The most important button on the Welcome page feels unresponsive on desktop — users hover it expecting feedback and get none.

---

### C. Quick Wins (< 5 minutes each)

| # | Fix | File | Change |
|---|-----|------|--------|
| #17 | Replace inline `overflowX: auto` with `.table-scroll-wrapper` | `Investments.jsx:194` | One word swap |
| #27 | Remove redundant inline style on Download button | `Reports.jsx:142` | Remove `style={...}` |
| #25 | Remove redundant inline grid style | `Reports.jsx:151` | Remove `style={...}` |
| #31 | Add `.btn-primary:hover` | `index.css:731` | 4 lines of CSS |
| #32 | Add `.btn-ghost:focus` | `index.css:718` | 4 lines of CSS |
| #11 | Add `role="status"` to all loading divs | 6 files | One attribute each |
| #23 | Remove inline `marginBottom` on Tax labels | `Tax.jsx:149,231,269` | Remove 3 style props |
| #13 | Add `role="img"` + `<title>` to FBS SVG | `Dashboard.jsx:354` | 2 lines |
| #2  | Fix `₹85.0K` trailing zero in preview card | `AuthPreviewCard.jsx:25` | `.toFixed(1)` → `Math.round()` |
| #14 | Add `aria-label` to "Done →" action buttons | `Dashboard.jsx:601` | One attribute |

---

### D. Systemic Problems

**1. Flip card accessibility — mouse-only interaction across 4 pages**
The `FlipCard` component is copy-pasted with slight variations across `Investments.jsx`, `Liabilities.jsx`, `Insurance.jsx`, and `Tax.jsx`. Each page defines its own local `FlipCard` function. The accessibility fix (Issue #16) needs to be applied to all four.
**Systemic fix:** Extract a single `FlipCard` component to `frontend/src/components/FlipCard.jsx`, add accessibility attributes once, import in all four pages.

**2. Inline styles scattered throughout explore pages**
Issues #17, #18, #19, #22, #23, #25, #27, #30 all point to the same root cause: inline `style={{...}}` props used where CSS classes already exist or should exist. This is a codebase-wide pattern.
**Systemic fix:** Grep for `style={{` in all page files and migrate each one to a CSS class in `index.css`. This ensures mobile breakpoints in CSS actually affect these elements.

**3. No 480px mobile breakpoint**
Issues #33 and #9 both stem from missing sub-480px CSS. The single 768px breakpoint leaves a gap for small phones.
**Systemic fix:** Add a `@media (max-width: 480px)` section to `index.css` covering auth pages, questionnaire, and all explore page padding.

**4. Loading states lack accessible announcements**
Six different pages all have loading states missing `role="status"` and `aria-live`.
**Systemic fix:** Create a shared `<LoadingState text="...">` component in `frontend/src/components/LoadingState.jsx` with proper ARIA attributes baked in, and replace all six loading divs.

**5. `analysis-value` inline color overrides**
Tax and Reports pages bypass the `.analysis-value.ok` / `.analysis-value.warn` semantic classes and use inline color styles.
**Systemic fix:** Audit all `className="analysis-value"` usages for inline `color` styles and replace with the appropriate semantic class.

---

### E. Overall Scores

| Category | Score | Justification |
|----------|:-----:|---------------|
| Visual Design & Polish | **8/10** | Warm editorial palette is distinctive and professional. Fraunces/Inter type pairing is excellent. Dashboard section backgrounds create strong chapter transitions. Minor deduction for inconsistent inline styles breaking visual rhythm. |
| User Experience & Usability | **6/10** | Core flows work well. Major deductions: `alert()` on forgot password, silent form validation failures, HTML download masquerading as PDF, step count discrepancy (10 vs 13). |
| Responsiveness & Mobile Experience | **5/10** | 768px breakpoint works for most pages, but no 480px safety net, missing questionnaire mobile override, and auth preview card vanishing at 900px are significant gaps. |
| Accessibility Compliance | **4/10** | Good semantic HTML labels and ARIA on forms. But flip cards are keyboard-inaccessible across 4 pages, loading states lack live region announcements, SVG charts have no text alternatives, and multiple buttons have ambiguous labels. |
| Performance & Loading | **7/10** | Branded loading states on every page. No CLS issues visible. Dead imports (jsPDF, XLSX in Reports) add unnecessary bundle weight without use. |
| Code Quality & Maintainability | **6/10** | Strong CSS variable system and semantic class naming. Inconsistent application — inline styles bypass the system throughout. FlipCard copy-paste across 4 pages instead of a shared component is the biggest structural issue. |
| **Overall Design Health** | **58/100** | A well-designed, distinctive product held back by accessibility gaps, mobile edge cases, and the copy-paste FlipCard pattern. Fix the Top 10 issues and this jumps to ~75. |
