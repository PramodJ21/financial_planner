---
name: website-design-audit
description: Perform a complete page-by-page design audit of a website from both visitor UX and developer perspectives. Use this skill whenever the user asks to audit, review, critique, or evaluate their website's design, UI, UX, accessibility, responsiveness, or visual quality. Also trigger when the user says things like "what's wrong with my site", "review my website", "check my frontend", "find design issues", "UX review", "design feedback", "audit my pages", "is my site accessible", or any request to identify visual, usability, or interaction problems across a web project. This skill covers HTML, CSS, JavaScript, React, Vue, Svelte, Next.js, Astro, and any other web framework.
---

# Website Design Audit

A comprehensive, page-by-page design audit that evaluates every page from two perspectives simultaneously: the real visitor using the site, and the developer maintaining the code.

## When This Skill Triggers

- User asks to "audit", "review", "critique", or "evaluate" their website or frontend
- User asks "what's wrong with my site" or "find issues on my website"
- User wants UX feedback, accessibility checks, or responsiveness testing
- User asks to improve their site's design quality or user experience
- User uploads or points to a web project and asks for design feedback

## How to Conduct the Audit

### Step 1: Discover the Project

Read the full project structure. Identify every page, route, and view in the project. Understand the framework in use (React, Next.js, Vue, Astro, plain HTML, etc.) and how pages are organized.

### Step 2: Determine Page Order

List every page/route in navigational order, starting from the landing or home page, then following the natural user journey (e.g., Home → About → Services → Pricing → Contact → Blog → Individual Blog Post). Share this list with the user and confirm before proceeding.

### Step 3: Audit Each Page One at a Time

Go through each page sequentially. For every page, examine every visible element — header, hero, sections, cards, buttons, forms, navigation, footer, modals, popups, toasts — and log every issue found.

### Issue Format

Use this exact structure for every single issue discovered. Do not skip any field.

```
### Issue #[number]
**File:** [exact file path and line numbers, e.g., src/components/Hero.jsx, lines 42-58]
**Element:** [what part of the page, e.g., "Hero CTA button", "Navigation dropdown on mobile", "Pricing card third column"]
**Severity:** 🔴 Critical | 🟠 Major | 🟡 Minor | 🔵 Suggestion
**Category:** [one of: Layout, Typography, Color/Contrast, Spacing, Responsiveness, Accessibility, Interaction/UX, Performance, Visual Consistency, Content/Copy, Navigation, Forms, Animation, Images/Media, SEO, Code Quality]

**What's wrong (visitor perspective):**
[Describe what a real user sees, feels, or struggles with. Be vivid and specific. Write as if explaining to a non-technical stakeholder. Example: "On mobile, the 'Get Started' button is cut off on the right side and only half visible. A user cannot tap it without scrolling horizontally, which they won't know to do. This is the primary conversion action on the page — it's effectively broken for mobile visitors."]

**What's wrong (code perspective):**
[Describe the technical root cause. Reference exact CSS properties, HTML structure, or JS logic with line numbers. Example: "The button's parent container uses `width: 500px` on line 44 of Hero.jsx instead of a fluid unit. No max-width or overflow handling exists. The flexbox container on line 38 lacks `flex-wrap: wrap`."]

**What needs to be done:**
[Step-by-step fix instructions with exact code changes. Be prescriptive.]
1. In `src/components/Hero.jsx`, line 44, change `width: 500px` to `width: 100%` with `max-width: 500px`.
2. On line 38, add `flex-wrap: wrap` to the flex container.
3. Add a responsive rule for small screens:
   @media (max-width: 480px) {
     .hero-cta { width: 100%; }
   }
4. Test at 320px, 375px, and 414px to confirm the button is fully visible and tappable.

**Impact if not fixed:**
[Real-world consequence. E.g., "Mobile users (likely 60%+ of traffic) cannot access the primary conversion action. Direct revenue impact."]
```

### What to Examine on Every Page

For each page, systematically check all of the following areas. Do not skip any area — if no issues are found, move on silently.

**First Impression & Visual Design:**
- Does the page feel professional, modern, and trustworthy within the first 3 seconds?
- Is there a clear visual hierarchy — can a visitor immediately tell what's most important?
- Is whitespace used intentionally or does the page feel cramped or empty in places?
- Do colors, fonts, and spacing feel consistent with the rest of the site?
- Are there any elements that feel out of place, outdated, or visually jarring?

**Layout & Spacing:**
- Are elements properly aligned on a consistent grid?
- Is spacing between sections, cards, headings, and paragraphs consistent?
- Are there overlapping elements, unexpected gaps, or broken alignments?
- Does the layout hold together at every viewport width (320px through 1440px+)?

**Typography & Readability:**
- Can a visitor comfortably read all text without squinting or zooming?
- Are headings clearly distinguished from body text in size and weight?
- Is line-height adequate for readability (1.4–1.6 for body text)?
- Are there walls of text that need breaking up?
- Is any text too small, too light, or low-contrast against its background?

**Navigation & Wayfinding:**
- Can a visitor tell where they are on the site at all times?
- Is the navigation accessible, logical, and usable on mobile?
- Are there dead links, confusing labels, or missing breadcrumbs?
- Can a visitor reach any important page in 3 clicks or fewer?

**Calls to Action:**
- Is there one clear primary action per page? Can a visitor find it within 2 seconds?
- Do buttons look tappable/clickable? Do links look like links?
- Are CTAs worded from the visitor's benefit perspective?
- Are there competing CTAs creating decision paralysis?

**Forms & Inputs:**
- Does every input have a visible, persistent label (not just placeholder)?
- Are error messages specific, helpful, and next to the relevant field?
- Do inputs use correct types (email, tel, number) for appropriate mobile keyboards?
- Is there clear loading, success, and error feedback on submission?

**Images & Media:**
- Are images sharp, properly sized, and not stretched or pixelated?
- Do all meaningful images have descriptive alt text?
- Are images optimized (WebP/AVIF, compressed, lazy-loaded below the fold)?
- Do decorative images interfere with text readability?

**Responsiveness:**
- Check behavior at 320px, 375px, 768px, 1024px, 1280px, 1440px.
- Flag any horizontal scrollbar, content overflow, truncated text, or unreachable elements.
- Are all touch targets at least 44×44 CSS pixels on mobile?
- Does the mobile layout prioritize content over navigation chrome?

**Accessibility (WCAG 2.1 AA):**
- Keyboard: Can every interactive element be reached and activated with Tab/Enter/Space/Escape?
- Screen reader: Are ARIA labels, roles, landmarks, and heading levels correct?
- Contrast: Does every text/background pair meet 4.5:1 (body) or 3:1 (large text)?
- Focus: Is there a visible focus indicator on every focusable element?
- Motion: Do all animations respect `prefers-reduced-motion`?

**Performance & Loading:**
- Are there layout shifts as the page loads (CLS issues)?
- Are large assets blocking the initial render?
- Is there a loading/skeleton state for dynamic content?
- Are there unnecessary wrapper elements adding DOM depth?

**Interaction & Micro-UX:**
- Do hover, active, and focus states exist on all interactive elements?
- Are transitions smooth and purposeful?
- Is there feedback for user actions (clicks, toggles, form submissions)?
- Are there dead-end states where a visitor gets stuck?

**Content & Copy:**
- Is the copy clear, scannable, and jargon-free?
- Are there spelling, grammar, or tone inconsistencies?
- Does each section communicate its value in the first sentence?
- Is there any placeholder text, lorem ipsum, or empty sections?

### Step 4: Produce the Summary Deliverables

After every page has been audited, produce these summary sections:

**A. Page-by-Page Issue Count Table**

| Page | 🔴 Critical | 🟠 Major | 🟡 Minor | 🔵 Suggestion | Total |
|------|------------|---------|---------|--------------|-------|

**B. Top 10 Highest-Impact Issues**
The 10 issues across the entire site that would make the biggest difference to a real visitor if fixed. Explain why each matters in plain language.

**C. Quick Wins**
Every issue fixable in under 5 minutes with a single small code change.

**D. Systemic Problems**
Issues appearing across multiple pages, pointing to missing design tokens, absent shared components, or architectural gaps. For each, recommend the systemic fix.

**E. Overall Scores (0–10 each, with one-line justification)**
- Visual Design & Polish
- User Experience & Usability
- Responsiveness & Mobile Experience
- Accessibility Compliance
- Performance & Loading
- Code Quality & Maintainability
- **Overall Design Health: [0–100]**

## Important Principles

- Be brutally honest. Vague praise helps nobody.
- Write visitor-perspective descriptions so a non-technical founder or PM can understand the impact.
- Write developer-perspective descriptions so a frontend engineer can fix the issue without guessing.
- Every issue must include exact file paths and line numbers. "Somewhere in the CSS" is not acceptable.
- Every fix must be step-by-step and prescriptive. "Improve the spacing" is not acceptable — specify which property, which value, which file, which line.
- Do not stop until every page and every deliverable section is complete.