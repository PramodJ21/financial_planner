---
name: Action Plan Spec
description: action_plan.md defines the complete priority-scored action item generation system for the FBS engine — covers all 9 dimensions, cross-dimension rules, liability logic, goal logic, fragility bundles, and status tracking
type: project
---

A full developer-facing action plan spec was written at `D:\fin_planner\action_plan.md`.

**Why:** The FBS engine (backend/engine/calculations.js) needed a documented spec for how to translate a computed FBS score into a prioritized, personalized action plan surfaced to the user on the dashboard.

**How to apply:** When implementing or modifying the action plan generation logic in the backend, treat `action_plan.md` as the authoritative spec. It is paired with `fbs_calculation.md` (the scoring spec). Changes to FBS thresholds in `fbs_calculation.md` should be reflected in `action_plan.md` trigger conditions and priority score ranges.

Key design decisions recorded in the spec:
- Priority score = FBS Impact (40%) + Urgency (35%) + Effort Inverse (25%), all on 0–100 scales
- Revolving CC action always surfaces regardless of the 3–5 item volume limit
- Combination fragility triggers a single bundled action that suppresses individual EF/insurance/bad-debt items
- New earner carve-out (months_employed < 12) reduces urgency score by 15 and adds a sympathetic sub-note
- Avalanche method (highest interest rate first) is the specified multi-loan repayment strategy
- Auto-completion is checked on every FBS recalculation; regression re-opens completed items
- Dismissed items only re-surface if urgency score reaches >= 85
