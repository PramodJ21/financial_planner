import { useEffect, useState, useRef, useCallback } from 'react';
import '../styles/tour.css';

// ── Step definitions ──────────────────────────────────────────────────────────
// selector: CSS selector for the element to spotlight (relative to document)
// section:  section ID to scroll into view before measuring
// prefer:   preferred tooltip placement — 'top' | 'bottom'
// insight:  optional italic callout shown below the main text

export const TOUR_STEPS = [
    {
        selector: '#chapter-01 .archetype-card',
        section:  'chapter-01',
        title:    'Your Investor Archetype',
        text:     'This card reveals your <strong>natural financial personality</strong> based on how you answered the questionnaire. The trait pills summarise your tendencies.',
        insight:  'The italicised line at the bottom is your blind spot — the one behaviour pattern most likely to work against you. Read it carefully.',
        prefer:   'bottom',
    },
    {
        selector: '#chapter-01 .journey-grid',
        section:  'chapter-01',
        title:    'Financial Snapshot',
        text:     'Your key numbers at a glance. <strong>Net Worth = Assets minus Liabilities.</strong> A positive and growing net worth is the single most important long-term signal, even if it grows slowly.',
        insight:  'Green tiles are healthy. Amber tiles flag something to watch — those are the ones to act on first.',
        prefer:   'top',
    },
    {
        selector: '#chapter-02 .donut-wrap',
        section:  'chapter-02',
        title:    'Your FBS Score',
        text:     'A 0–100 score measuring financial behaviour — <strong>not wealth.</strong> Two people with identical incomes can score 30 or 75 based purely on habits.',
        insight:  'The faint dotted arc shows your projected score if you complete all recommended actions.',
        prefer:   'bottom',
    },
    {
        selector: '#chapter-02 .fbs-spectrum',
        section:  'chapter-02',
        title:    'How You Compare',
        text:     'The shaded band shows the typical range for people your age and income level. Your marker shows exactly where you sit.',
        insight:  'Above the band = ahead of your peer group. Below it = a specific, closeable gap.',
        prefer:   'bottom',
    },
    {
        selector: '#chapter-02 .health-grid',
        section:  'chapter-02',
        title:    'The Three Score Pillars',
        text:     '<strong>Foundation</strong> — safety nets (emergency fund, insurance, debt). <strong>Behaviour</strong> — habits (SIPs, goals, discipline). <strong>Awareness</strong> — knowledge (tax, diversity, portfolio).',
        insight:  'The pillar with the lowest bar tells you which area to focus on first.',
        prefer:   'bottom',
    },
    {
        selector: '#chapter-03 .sec-bar',
        section:  'chapter-03',
        title:    "What's Working",
        text:     'FBS dimensions where your habits are already above the scoring threshold. Each row shows the exact value that earned the score.',
        insight:  'These are worth protecting — consistent good habits compound far more powerfully than fixing new problems.',
        prefer:   'bottom',
    },
    {
        selector: '#chapter-04 .sec-bar',
        section:  'chapter-04',
        title:    'What Needs Attention',
        text:     'Sorted by urgency and point impact. <strong>"Priority — Highest Impact"</strong> items give the biggest FBS jump when addressed.',
        insight:  'Each row includes a target value — not just "something is wrong" but exactly what "fixed" looks like.',
        prefer:   'bottom',
    },
    {
        selector: '#chapter-05 .cf-table',
        section:  'chapter-05',
        title:    'Cashflow Outlook',
        text:     'A 3-month forecast from your income and recurring outflows (EMIs, SIPs, rent). Focus on the <strong>Net Surplus</strong> row at the bottom.',
        insight:  "That surplus number is what's realistically available to redirect. The action plan is sized to fit within it.",
        prefer:   'top',
    },
    {
        selector: '#chapter-06 .proj-row',
        section:  'chapter-06',
        title:    'Your Score Projection',
        text:     'Your FBS after completing all actions listed below. Each action carries an exact point value — <strong>completing just the top 2–3 typically moves the score 8–15 points.</strong>',
        insight:  null,
        prefer:   'bottom',
    },
    {
        selector: '#chapter-06 .act-sub',
        section:  'chapter-06',
        title:    'Taking Action',
        text:     'Each item names the dimension it fixes and the FBS points it earns. Mark one done after completing it — your score recalculates on the next visit.',
        insight:  'Start with the highest-impact item that fits your current cashflow surplus. That single action creates the most momentum.',
        prefer:   'bottom',
    },
];

// ── Helpers ───────────────────────────────────────────────────────────────────

const PAD  = 10;   // padding around spotlight
const GAP  = 14;   // gap between spotlight edge and tooltip
const TW   = 320;  // tooltip width (must match CSS)

function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }

function calcTooltipPos(spotRect, prefer, tooltipHeight) {
    const vw = window.innerWidth;
    const vh = window.innerHeight;

    let top, arrowClass;

    if (prefer === 'bottom') {
        top = spotRect.top + spotRect.height + GAP;
        arrowClass = 'arrow-top';
        // flip up if not enough room below
        if (top + tooltipHeight > vh - 16) {
            top = spotRect.top - tooltipHeight - GAP;
            arrowClass = 'arrow-bottom';
        }
    } else {
        top = spotRect.top - tooltipHeight - GAP;
        arrowClass = 'arrow-bottom';
        // flip down if not enough room above
        if (top < 16) {
            top = spotRect.top + spotRect.height + GAP;
            arrowClass = 'arrow-top';
        }
    }

    const left = clamp(spotRect.left, 16, vw - TW - 16);
    top        = clamp(top, 16, vh - tooltipHeight - 16);

    return { left, top, arrowClass };
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function DashboardTour({ onClose }) {
    const [step,        setStep]        = useState(0);
    const [spotStyle,   setSpotStyle]   = useState(null);
    const [tipPos,      setTipPos]      = useState({ left: -9999, top: -9999 });
    const [arrowClass,  setArrowClass]  = useState('arrow-top');
    const tooltipRef = useRef(null);

    const current = TOUR_STEPS[step];
    const total   = TOUR_STEPS.length;

    // Measure element and position spotlight + tooltip
    const measure = useCallback(() => {
        const el = document.querySelector(current.selector);
        if (!el) return;

        const r = el.getBoundingClientRect();
        const spot = {
            left:   r.left   - PAD,
            top:    r.top    - PAD,
            width:  r.width  + PAD * 2,
            height: r.height + PAD * 2,
        };
        setSpotStyle(spot);

        requestAnimationFrame(() => {
            const th = tooltipRef.current?.offsetHeight || 260;
            const { left, top, arrowClass: ac } = calcTooltipPos(spot, current.prefer, th);
            setTipPos({ left, top });
            setArrowClass(ac);
        });
    }, [current]);

    // On step change: scroll section into view, then measure
    useEffect(() => {
        const section = document.getElementById(current.section);
        if (section) section.scrollIntoView({ behavior: 'smooth', block: 'start' });

        // Wait for scroll to settle before measuring
        const t = setTimeout(measure, 420);
        return () => clearTimeout(t);
    }, [step]); // eslint-disable-line react-hooks/exhaustive-deps

    // Re-measure on resize
    useEffect(() => {
        window.addEventListener('resize', measure);
        return () => window.removeEventListener('resize', measure);
    }, [measure]);

    // Keyboard nav
    useEffect(() => {
        const handler = (e) => {
            if (e.key === 'Escape')                                        onClose();
            if (e.key === 'ArrowRight' && step < total - 1) setStep(s => s + 1);
            if (e.key === 'ArrowLeft'  && step > 0)         setStep(s => s - 1);
        };
        window.addEventListener('keydown', handler);
        return () => window.removeEventListener('keydown', handler);
    }, [step, total, onClose]);

    const progressPct = total > 1 ? (step / (total - 1)) * 100 : 100;

    return (
        <>
            {/* Invisible overlay to block page interaction during tour */}
            <div className="tour-overlay" onClick={() => {}} />

            {/* Spotlight — the box-shadow spread creates the dim effect */}
            {spotStyle && (
                <div className="tour-spotlight" style={spotStyle} />
            )}

            {/* Tooltip */}
            <div
                ref={tooltipRef}
                className={`tour-tooltip ${arrowClass}`}
                style={{ left: tipPos.left, top: tipPos.top }}
            >
                {/* Top progress band */}
                <div className="tt-band">
                    <div className="tt-band-fill" style={{ width: `${100 - progressPct}%` }} />
                </div>

                {/* Header */}
                <div className="tt-head">
                    <span className="tt-step-badge">Step {step + 1} of {total}</span>
                    <button className="tt-close" onClick={onClose} aria-label="Close tour">✕</button>
                </div>

                {/* Body */}
                <div className="tt-body">
                    <div className="tt-title">{current.title}</div>
                    {/* eslint-disable-next-line react/no-danger */}
                    <div className="tt-text" dangerouslySetInnerHTML={{ __html: current.text }} />
                    {current.insight && (
                        <div className="tt-insight">{current.insight}</div>
                    )}
                </div>

                {/* Footer */}
                <div className="tt-footer">
                    <button className="tt-btn tt-btn-skip" onClick={onClose}>Skip tour</button>
                    <div className="tt-dots">
                        {TOUR_STEPS.map((_, i) => (
                            <div
                                key={i}
                                className={`tt-dot${i < step ? ' done' : i === step ? ' active' : ''}`}
                                onClick={() => setStep(i)}
                            />
                        ))}
                    </div>
                    <button
                        className="tt-btn tt-btn-back"
                        style={{ visibility: step === 0 ? 'hidden' : 'visible' }}
                        onClick={() => setStep(s => s - 1)}
                    >← Back</button>
                    <button
                        className="tt-btn tt-btn-next"
                        onClick={step === total - 1 ? onClose : () => setStep(s => s + 1)}
                    >
                        {step === total - 1 ? 'Finish ✓' : 'Next →'}
                    </button>
                </div>
            </div>
        </>
    );
}
