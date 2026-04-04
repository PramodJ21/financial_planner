---
name: ux-audit
description: >
  Perform a comprehensive UX audit of a website by simulating real user journeys across diverse user personas.
  Use this skill whenever the user wants to: audit their website, understand how users feel about their site,
  get user perspective feedback, check UX/usability of a website, simulate user journeys, test their site as
  a real user would, or get empathy-driven feedback from different types of users. Trigger this skill for any
  request involving "how does my website feel", "go through my website like a user", "user experience audit",
  "what do users think of my site", "UX review", or any variation of wanting to see their website through a
  user's eyes. This skill uses Playwright to navigate the site and produces a structured empathy-driven report
  covering all major user types.
---

# UX Audit Skill

Simulate real users navigating a website and produce an empathy-driven report covering how different types of users experience it.

## Overview

This skill:
1. Uses Playwright to browse the target website programmatically
2. Captures screenshots, page structure, load times, and interaction patterns
3. Analyzes the experience through the lens of **7 user personas**
4. Produces a detailed, actionable UX report with per-persona sentiment and scores

## Step-by-Step Workflow

### Step 1: Setup

Install dependencies if not already present:

```bash
pip install playwright --break-system-packages
python -m playwright install chromium
pip install Pillow --break-system-packages
```

### Step 2: Gather Target URL

Ask the user for:
- **Website URL** (required)
- **Key pages/flows to test** (optional — if not given, auto-discover from nav/sitemap)
- **Any specific user goals** to simulate (e.g. "sign up", "find pricing", "contact support")

### Step 3: Crawl the Website

Use the script pattern below to collect data. Crawl:
- Homepage
- All top-level nav links (up to 8 pages)
- Any CTA (call-to-action) flows (sign up, buy, contact)

For each page capture:
- Full-page screenshot (save to `/tmp/ux_audit/screenshots/`)
- Page title and meta description
- H1–H3 headings
- All nav links and CTA button texts
- Load time (ms)
- Presence of: search bar, login/signup, footer, contact info, social links
- Any error messages or broken elements
- Mobile viewport screenshot (375px width)
- Accessibility hints: alt text presence, form labels, color contrast issues

```python
import asyncio
from playwright.async_api import async_playwright
import os, time, json

async def audit_page(page, url):
    start = time.time()
    await page.goto(url, wait_until="networkidle", timeout=30000)
    load_time = round((time.time() - start) * 1000)
    
    title = await page.title()
    
    headings = await page.evaluate("""() => {
        const tags = ['h1','h2','h3'];
        return tags.flatMap(t => [...document.querySelectorAll(t)].map(el => ({tag:t, text:el.innerText.trim()})));
    }""")
    
    links = await page.evaluate("""() => {
        return [...document.querySelectorAll('a')].map(a => ({text: a.innerText.trim(), href: a.href}))
            .filter(l => l.text && l.href);
    }""")
    
    buttons = await page.evaluate("""() => {
        return [...document.querySelectorAll('button, [role=button], input[type=submit], a.btn, a.button')]
            .map(b => b.innerText.trim() || b.value || b.getAttribute('aria-label') || '')
            .filter(Boolean);
    }""")
    
    images_without_alt = await page.evaluate("""() => {
        return [...document.querySelectorAll('img')].filter(img => !img.alt).length;
    }""")
    
    form_labels = await page.evaluate("""() => {
        const inputs = [...document.querySelectorAll('input:not([type=hidden])')];
        const labeled = inputs.filter(i => i.labels && i.labels.length > 0 || i.getAttribute('aria-label') || i.placeholder);
        return {total: inputs.length, labeled: labeled.length};
    }""")
    
    os.makedirs('/tmp/ux_audit/screenshots', exist_ok=True)
    slug = url.replace('https://','').replace('http://','').replace('/','_')[:50]
    await page.screenshot(path=f'/tmp/ux_audit/screenshots/{slug}_desktop.png', full_page=True)
    
    await page.set_viewport_size({"width": 375, "height": 812})
    await page.screenshot(path=f'/tmp/ux_audit/screenshots/{slug}_mobile.png', full_page=True)
    await page.set_viewport_size({"width": 1280, "height": 800})
    
    return {
        "url": url,
        "title": title,
        "load_time_ms": load_time,
        "headings": headings,
        "nav_links": [l for l in links if '#' not in l['href'] and 'javascript' not in l['href']][:20],
        "cta_buttons": buttons[:15],
        "images_without_alt": images_without_alt,
        "form_labels": form_labels,
    }
```

### Step 4: Analyze Through 7 User Personas

After collecting raw page data, analyze the website through each of these personas. Write your analysis **in the voice and perspective of that persona** — what they notice, feel frustrated by, love, or miss.

Read the persona definitions in `references/personas.md` before writing each section.

For each persona, produce:
- **First impression** (what they feel in the first 5 seconds)
- **Journey narrative** (what they try to do and how it goes)
- **Pain points** (specific friction moments)
- **Delights** (things that work really well for them)
- **Sentiment**: 😊 Positive / 😐 Neutral / 😟 Frustrated
- **Score**: 1–10

### Step 5: Produce the Report

Write a structured Markdown report with:

```
# UX Audit Report — [Website Name]
**Audited:** [date] | **Pages visited:** N | **Avg load time:** Xms

## Executive Summary
[2–3 sentence overall verdict]

## Overall Score: X/10

## Per-Persona Experience
[Section for each persona — see personas.md]

## Critical Issues (must fix)
[Ranked list]

## Quick Wins (easy improvements)
[Ranked list]

## Accessibility Snapshot
[Key findings]

## Mobile Experience
[Key findings]

## Recommendations Roadmap
[Prioritized table: Impact vs Effort]
```

Save the report as `/tmp/ux_audit/report.md`.

### Step 6: Deliver

- Present the report inline in the conversation (summarize key findings)
- Offer to share specific screenshot paths the user can inspect
- Offer to deep-dive into any persona or page

---

## Important Notes

- **Be empathetic, not clinical.** Write persona sections as if you are that person, using "I" voice.
- **Be specific.** Reference actual page elements, button labels, heading text you found.
- **Be honest.** If something is broken or confusing, say so directly.
- **Don't hallucinate.** Only report what Playwright actually found. If a page failed to load, report that.
- **Respect timeouts.** If a page takes >15s, mark it as a performance issue.
- If the site blocks automated browsers (bot detection), note this and try with `--user-agent` spoofing.