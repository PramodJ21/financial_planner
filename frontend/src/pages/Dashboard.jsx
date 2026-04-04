import { useEffect, useState } from 'react';
import { fetchWithAuth } from '../api';
import { Link } from 'react-router-dom';
import {
    getFBSContext,
    getActionLink, getActionNextStep,
    getStrengths, getGaps,
} from '../utils/financialInsights';
import { fmt } from '../utils/formatCurrency';

const MONEY_SIGN_INFO = {
    'Bold Eagle': 'Highly aggressive and deeply engaged with markets. You actively seek high-growth opportunities and are comfortable with significant risk.',
    'Cautious Turtle': 'You prioritise safety and guaranteed returns over market-beating growth. While this protects capital, being too conservative can mean your wealth doesn\'t outpace inflation.',
    'Persistent Horse': 'Steady and methodical. You set a solid long-term strategy and stick to it without over-monitoring. This disciplined approach is highly effective.',
    'Curious Fox': 'Highly active and experimental, constantly looking for trends. Your curiosity uncovers opportunities but can also lead to over-trading.',
    'Strategic Owl': 'Wise and disciplined. You analyse thoroughly before acting and maintain strong emotional control during market volatility.',
    'Loyal Elephant': 'Patient and risk-averse, sticking to what you know. Loyalty to proven assets is admirable, but be open to diversification.',
    'Balanced Dolphin': 'Healthy equilibrium between growth-seeking and wealth-preserving behaviours. You adapt well to changing conditions.'
};

const MONEY_SIGN_TRAITS = {
    'Bold Eagle':       { traits: ['High Risk Appetite', 'Growth-Focused', 'Market-Active'],   implication: 'Watch for concentration risk — diversification is your shield.' },
    'Cautious Turtle':  { traits: ['Risk-Averse', 'Stability-First', 'Long-Term'],             implication: 'You may be underinvested in growth assets for your time horizon.' },
    'Persistent Horse': { traits: ['Disciplined', 'Steady', 'Strategy-Driven'],                implication: 'Your consistency is your edge — review allocation annually.' },
    'Curious Fox':      { traits: ['Experimental', 'Trend-Aware', 'Opportunistic'],            implication: 'Stay methodical — curiosity without a system leads to overtrading.' },
    'Strategic Owl':    { traits: ['Analytical', 'Patient', 'Emotionally Stable'],             implication: 'Act on your analysis — overthinking is the only risk here.' },
    'Loyal Elephant':   { traits: ['Reliable', 'Conservative', 'Trust-Based'],                 implication: 'Open up to diversification — loyalty to one asset class limits growth.' },
    'Balanced Dolphin': { traits: ['Adaptive', 'Balanced', 'Resilient'],                       implication: 'Your equilibrium is a strength — keep rebalancing periodically.' },
};


const FBS_DIMENSION_DEFS = [
    { label: 'Emergency Fund',          breakdownKey: 'emergencyFund',         weightKey: 'emergencyFund',         desc: '3–6 months of expenses in liquid savings' },
    { label: 'Health Insurance',        breakdownKey: 'healthInsurance',       weightKey: 'healthInsurance',       desc: 'Adequate medical cover relative to income' },
    { label: 'Life Insurance',          breakdownKey: 'lifeInsurance',         weightKey: 'lifeInsurance',         desc: 'Term cover ≥ 10× annual income (if dependents)' },
    { label: 'Liability Management',    breakdownKey: 'liabilities',           weightKey: 'liabilityManagement',   desc: 'Debt-to-income ratio and EMI burden' },
    { label: 'Investment Regularity',   breakdownKey: 'investmentRegularity',  weightKey: 'investmentRegularity',  desc: 'Consistent SIP habit relative to surplus' },
    { label: 'Goal Clarity',            breakdownKey: 'goalClarity',           weightKey: 'goalClarity',           desc: 'Defined financial goals with a savings plan' },
    { label: 'Behavioural Tendencies',  breakdownKey: 'behavioralTendencies',  weightKey: 'behavioralTendencies',  desc: 'Emotional discipline and spending control' },
    { label: 'Tax Literacy',            breakdownKey: 'tax',                   weightKey: 'taxLiteracy',           desc: 'Use of available tax-saving instruments' },
    { label: 'Asset Diversity',         breakdownKey: 'assetDiversity',        weightKey: 'assetDiversity',        desc: 'Spread across equity, debt, gold, and alternatives' },
    { label: 'Portfolio Understanding', breakdownKey: 'portfolioUnderstanding',weightKey: 'portfolioUnderstanding',desc: 'Awareness of what you own and its performance' },
];

/**
 * Derive an expected FBS range for people with similar characteristics.
 * Based on: age group (life stage), annual income band, and risk comfort level.
 * Returns { low, high, label } — the typical range peers score in.
 *
 * Logic mirrors the backend weight tables:
 *  - Foundation phase (<25) — newer to finances, lower expected floor
 *  - Building (25-35) — first savings + insurance, mid range expected
 *  - Accumulation (35-50) — peak complexity, higher bar
 *  - Pre-retirement / Retirement — preservation focus, more polarised
 * Income band adjusts upward: higher income → higher expected score
 * (more tax tools, insurance capacity, SIP room available)
 * Risk comfort adjusts slightly: very conservative → lower expected
 * (may under-invest), very aggressive → also lower (may over-leverage)
 */
function getPeerBenchmark(age, annualIncome, riskComfort) {
    // Age-based ranges calibrated against the 10-dimension FBS spec.
    // Reflects realistic completion rates by life stage:
    //  - Emergency fund, insurance, investment regularity all take time to build
    //  - Goal clarity and tax literacy improve with age and income experience
    //  - Asset diversity typically poor until 35+
    let base;
    if (age < 22)       base = { low: 18, high: 34 };  // Just entering workforce — most dimensions near zero
    else if (age < 25)  base = { low: 24, high: 40 };  // Foundation — health insurance maybe, no SIP habit yet
    else if (age < 28)  base = { low: 30, high: 46 };  // Early career — first SIP, partial emergency fund
    else if (age < 32)  base = { low: 36, high: 52 };  // Building — insurance + SIP taking shape
    else if (age < 38)  base = { low: 42, high: 57 };  // Establishing — goals clearer, liability load rising
    else if (age < 45)  base = { low: 46, high: 62 };  // Consolidating — peak complexity, most should have basics
    else if (age < 52)  base = { low: 48, high: 64 };  // Accumulation — tax literacy up, diversity improving
    else if (age < 58)  base = { low: 46, high: 63 };  // Pre-retirement — preservation focus kicks in
    else                base = { low: 42, high: 60 };  // Retirement — different priorities, investment regularity drops

    // Income adjustment — higher income means more tools available
    // (more tax deductions, insurance capacity, SIP room) but kept secondary to age
    let incAdj = 0;
    if (annualIncome >= 5000000)       incAdj = 6;   // 50L+
    else if (annualIncome >= 2000000)  incAdj = 4;   // 20–50L
    else if (annualIncome >= 1000000)  incAdj = 2;   // 10–20L
    else if (annualIncome >= 600000)   incAdj = 0;   // 6–10L
    else if (annualIncome >= 300000)   incAdj = -3;  // 3–6L
    else                               incAdj = -6;  // <3L

    const low  = Math.max(15, Math.min(60, base.low  + incAdj));
    const high = Math.max(30, Math.min(82, base.high + incAdj));

    let label;
    if (high <= 40)      label = 'Still building';
    else if (high <= 54) label = 'Mid-stage';
    else if (high <= 66) label = 'Well-established';
    else                 label = 'High-performing';

    return { low, high, label };
}

const SECTION_BGS = {
    'chapter-01': '#F2EBE0',
    'chapter-02': '#E4EBF0',
    'chapter-03': '#DDE8DD',
    'chapter-04': '#F0E6DC',
    'chapter-05': '#EDE8DC',
    'chapter-06': '#1A1C1F',
};

const SECTION_IDS = ['chapter-01', 'chapter-02', 'chapter-03', 'chapter-04', 'chapter-05', 'chapter-06'];

/** Build a typed journey snapshot from dashboard data.
 *  Each item: { type: 'positive'|'neutral'|'warning', label, value, sub }
 */
function getJourney(overview, fmtFn) {
    const steps = [];
    const exp = overview.expenses;
    const inv = overview.investments;
    const lia = overview.liabilities;
    const ins = overview.insurance;
    const em  = overview.emergency;
    const nwData = overview.netWorth || {};
    const nw = nwData.netWorth ?? (nwData.assets || 0) - (nwData.liabilities || 0);

    // 1. Net Worth — always first
    steps.push({ type: nw > 0 ? 'positive' : nw < 0 ? 'warning' : 'neutral', label: 'Net Worth', value: nw !== 0 ? fmtFn(nw) : '—', sub: nw > 0 ? 'Assets exceed liabilities' : nw < 0 ? 'Liabilities exceed assets' : 'No data yet' });

    // 2. Liabilities
    if (lia && lia.total > 0) {
        const hasBad = (lia.badLiability?.outstanding ?? 0) > 0;
        steps.push({ type: hasBad ? 'warning' : 'neutral', label: 'Liabilities', value: fmtFn(lia.total), sub: hasBad ? 'Includes high-interest debt' : 'Good debt only' });
    } else if (lia) {
        steps.push({ type: 'positive', label: 'Liabilities', value: 'Debt-free', sub: 'No outstanding loans' });
    }

    // 3. Total Assets
    if (inv && inv.total > 0) {
        steps.push({ type: 'positive', label: 'Total Assets', value: fmtFn(inv.total), sub: 'Total invested' });
    } else {
        steps.push({ type: 'warning', label: 'Total Assets', value: 'Not started', sub: 'No investments recorded' });
    }

    // 4. Monthly Outflow
    if (exp) {
        const monthlyExp = exp.effectiveMonthly || exp.totalMonthly || 0;
        if (monthlyExp > 0) steps.push({ type: 'neutral', label: 'Monthly Outflow', value: fmtFn(monthlyExp), sub: 'Total monthly expenses' });
    }

    // 5. Insurance
    if (ins) {
        const hasCover = (ins.healthCover > 0 || ins.lifeCover > 0);
        steps.push({ type: hasCover ? 'positive' : 'warning', label: 'Insurance', value: hasCover ? 'Covered' : 'No coverage', sub: hasCover ? 'Health or life cover in place' : 'No cover recorded' });
    }

    // 6. Emergency Fund — derived from savings + FD balance
    if (em) {
        const actual = em.emergencyFunds?.actual ?? 0;
        const ideal = em.emergencyFunds?.ideal ?? 0;
        const months = ideal > 0 ? (actual / (ideal / 6)).toFixed(1) : null;
        steps.push({
            type: actual > 0 ? 'positive' : 'warning',
            label: 'Emergency Fund',
            value: actual > 0 ? fmtFn(actual) : 'Not built',
            sub: actual > 0
                ? `${months}mo covered · from savings & FD`
                : 'Based on savings & FD balance'
        });
    }

    return steps;
}

// SVG icons for journey cards — minimal line style
const JOURNEY_ICONS = {
    'Income Sources':  (<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>),
    'Monthly Outflow': (<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>),
    'Total Assets':    (<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>),
    'Liabilities':     (<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2"/></svg>),
    'Insurance':       (<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>),
    'Emergency Fund':  (<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="4" width="20" height="16" rx="2"/><path d="M12 8v4M12 16h.01"/></svg>),
    'Net Worth':       (<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M3 3v18h18"/><path d="M7 16l4-4 4 4 4-4"/></svg>),
};

function Dashboard() {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [confirmingAction, setConfirmingAction] = useState(null);
    const [showAllGaps, setShowAllGaps] = useState(false);
    const [showFBSExplainer, setShowFBSExplainer] = useState(false);

    useEffect(() => {
        fetchWithAuth('/dashboard/full')
            .then(d => { setData(d); setLoading(false); })
            .catch(() => setLoading(false));
    }, []);

    // Skip stagger animations for returning users within the same session
    useEffect(() => {
        if (!data) return;
        if (sessionStorage.getItem('dashboard_visited')) {
            document.body.classList.add('animations-disabled');
        } else {
            sessionStorage.setItem('dashboard_visited', '1');
        }
        return () => document.body.classList.remove('animations-disabled');
    }, [data]);

    // IntersectionObserver for animations + sidebar sync
    useEffect(() => {
        if (!data) return;

        const timer = setTimeout(() => {
            const scrollContainer = document.querySelector('.main.snap-active') || document.querySelector('.main');
            const sections = SECTION_IDS.map(id => document.getElementById(id)).filter(Boolean);
            if (sections.length === 0) return;

            const io = new IntersectionObserver((entries) => {
                entries.forEach(entry => {
                    if (entry.isIntersecting && entry.intersectionRatio >= 0.6) {
                        const id = entry.target.id;

                        // Add in-view for CSS animations
                        entry.target.classList.add('in-view');

                        // Dispatch event for sidebar sync
                        window.dispatchEvent(new CustomEvent('dashboard-section-change', {
                            detail: {
                                id,
                                bg: SECTION_BGS[id] || '',
                                dark: id === 'chapter-06',
                            }
                        }));
                    }
                });
            }, { threshold: 0.6, root: scrollContainer });

            sections.forEach(s => io.observe(s));

            // Init first section
            if (sections[0]) {
                sections[0].classList.add('in-view');
                window.dispatchEvent(new CustomEvent('dashboard-section-change', {
                    detail: { id: 'chapter-01', bg: SECTION_BGS['chapter-01'], dark: false }
                }));
            }

            return () => io.disconnect();
        }, 200);

        return () => clearTimeout(timer);
    }, [data]);

    // Keyboard navigation
    useEffect(() => {
        if (!data) return;
        const handler = (e) => {
            if (e.key !== 'ArrowDown' && e.key !== 'ArrowUp' && e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
            // Don't hijack if user is typing in an input
            if (['INPUT', 'TEXTAREA', 'SELECT', 'BUTTON'].includes(e.target.tagName)) return;
            if (e.target.closest('[role="dialog"]') || e.target.closest('[aria-modal]')) return;

            const sections = SECTION_IDS.map(id => document.getElementById(id)).filter(Boolean);
            const activeIdx = sections.findIndex(s => s.classList.contains('in-view') && document.querySelector(`[data-sec="${s.id}"]`)?.classList.contains('active'));
            const currentIdx = activeIdx >= 0 ? activeIdx : 0;

            if (e.key === 'ArrowDown' || e.key === 'ArrowRight') {
                const next = sections[Math.min(currentIdx + 1, sections.length - 1)];
                if (next) next.scrollIntoView({ behavior: 'smooth' });
            }
            if (e.key === 'ArrowUp' || e.key === 'ArrowLeft') {
                const prev = sections[Math.max(currentIdx - 1, 0)];
                if (prev) prev.scrollIntoView({ behavior: 'smooth' });
            }
        };
        document.addEventListener('keydown', handler);
        return () => document.removeEventListener('keydown', handler);
    }, [data]);

    const handleMarkDone = async (action) => {
        try {
            await fetchWithAuth('/dashboard/action-plan/status', {
                method: 'PUT',
                body: JSON.stringify({ title: action.title, category: action.category, status: 'completed' })
            });
            const updated = await fetchWithAuth('/dashboard/full');
            setData(updated);
        } catch { /* silently fail */ }
        finally { setConfirmingAction(null); }
    };

    if (loading) return (
        <div className="dash-loading" role="status" aria-live="polite" aria-label="Loading your dashboard">
            <div className="dash-loading-box"><span>FH</span></div>
            <div className="dash-loading-text">Loading your dashboard…</div>
        </div>
    );
    if (!data) return (
        <div className="dash-empty">
            <div className="dash-empty-title">No data yet</div>
            <Link to="/questionnaire" className="dash-empty-link">Complete the questionnaire to get started</Link>
        </div>
    );

    const { overview, actionPlan } = data;
    const userAge = overview?.profile?.age ?? 30;
    const fbs = overview.fbs;
    const fbsCtx = getFBSContext(fbs, overview.fbsLifeStage);
    const fbsActions = actionPlan
        .filter(a => a.fbsImpact > 0 && a.status !== 'completed')
        .sort((a, b) => b.fbsImpact - a.fbsImpact)
        .slice(0, 5);
    const userName = data.user?.fullName?.split(' ')[0] || '';
    const moneySign = overview.moneySign;

    const strengths = getStrengths(data, fmt);
    const gaps = getGaps(data, fmt);

    // Financial snapshot KPIs
    const cashflow = overview.cashflow || null;

    // Journey
    const journeySteps = getJourney(overview, fmt);

    // Profile facts (kept for potential future use)
    const profile = overview.profile || {};
    const isSelfEmployed = ['self_employed', 'freelancer', 'business'].includes(profile.employmentType);

    // Peer benchmark
    const annualIncome = overview.income?.total || 0;
    const riskComfort = profile.riskComfort || 3;
    const peerBenchmark = getPeerBenchmark(userAge, annualIncome, riskComfort);

    // Questionnaire completeness
    const isQuestionnaireIncomplete = !overview.isCompleted && (overview.stepsCompleted || 0) < 10;

    // FBS helpers
    const fbsRatingLabel = fbs >= 81 ? 'Excellent' : fbs >= 61 ? 'Good' : fbs >= 41 ? 'Moderate' : fbs >= 21 ? 'Poor' : 'Critical';
    const potentialPts = fbsActions.reduce((s, a) => s + (a.fbsImpact || 0), 0);
    const projectedScore = Math.min(100, fbs + potentialPts);
    const projectedPct = Math.round((projectedScore / 100) * 100);

    // Donut — outer ring r=58, circumference = 2*PI*58 ≈ 364
    const circumference = Math.round(2 * Math.PI * 58); // 364
    const donutOffset = circumference - (fbs / 100) * circumference;
    // Projected arc (fbs + achievable pts) shown as muted arc behind the score
    const projectedOffset = circumference - (Math.min(100, fbs + potentialPts) / 100) * circumference;

    // Sub scores
    const foundation = overview.fbsSubScores?.foundation || { score: 0, max: 35 };
    const behaviour = overview.fbsSubScores?.behaviour || { score: 0, max: 45 };
    const awareness = overview.fbsSubScores?.awareness || { score: 0, max: 20 };

    const fPct = foundation.max > 0 ? Math.round((foundation.score / foundation.max) * 100) : 0;
    const bPct = behaviour.max > 0 ? Math.round((behaviour.score / behaviour.max) * 100) : 0;
    const aPct = awareness.max > 0 ? Math.round((awareness.score / awareness.max) * 100) : 0;

    // Spectrum needle position


    const strengthCount = strengths.length;
    const gapCount = gaps.length;

    // Tier icons for FBS sub-score rows — minimal line style
    const TIER_ICONS = {
        Foundation: (
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <line x1="4" y1="21" x2="20" y2="21" />
                <rect x="8" y="4" width="8" height="17" rx="1" />
                <line x1="6" y1="4" x2="18" y2="4" />
            </svg>
        ),
        Behaviour: (
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M17 1l4 4-4 4" />
                <path d="M3 11V9a4 4 0 0 1 4-4h14" />
                <path d="M7 23l-4-4 4-4" />
                <path d="M21 13v2a4 4 0 0 1-4 4H3" />
            </svg>
        ),
        Awareness: (
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                <circle cx="12" cy="12" r="3" />
            </svg>
        ),
    };

    function getTierColor(pct) {
        if (pct < 30) return '#C94040';
        if (pct < 60) return '#C4703A';
        return '#4A7C59';
    }

    return (
        <div className="dashboard-book">

            {/* ═══════════════════════════════════════════════════
                SECTION 01 — YOUR PROFILE
               ═══════════════════════════════════════════════════ */}
            <section id="chapter-01" className="section">
                <div className="watermark">01</div>
                <div className="sec-bar ani d1">
                    <span className="sec-chapter">01 — Your Profile</span>
                </div>
                <div className="content">
                    {/* ── Greeting ── */}
                    <div className="profile-greeting ani d1">
                        Hi <em>{userName || 'there'}</em>
                    </div>
                    <div className="profile-meta ani d2">
                        {userAge > 0 && <span className="pmeta-pill">Age {userAge}</span>}
                        {profile.city && <span className="pmeta-pill">{profile.city}</span>}
                        {overview.maritalStatus && <span className="pmeta-pill">{overview.maritalStatus}</span>}
                        {profile.dependents != null && <span className="pmeta-pill">{profile.dependents === 0 ? 'No dependents' : `${profile.dependents} ${profile.dependents === 1 ? 'dependent' : 'dependents'}`}</span>}
                        {profile.employmentType && <span className="pmeta-pill">{{ salaried: 'Salaried', self_employed: 'Self-Employed', business: 'Business Owner', freelancer: 'Freelancer', retired: 'Retired', student: 'Student' }[profile.employmentType] || profile.employmentType}</span>}
                        {profile.riskComfort && <span className="pmeta-pill">{['—','Very Low','Low','Moderate','High','Very High'][profile.riskComfort]} Risk</span>}
                    </div>

                    {/* ── Archetype card — full width, dark espresso ── */}
                    {moneySign && (
                        <>
                            <div className="arch-section-label ani d2">Your Investor Archetype</div>
                            <div className="archetype-card ani d3">
                                <div className="archetype-card-left">
                                    <div className="arch-name">{moneySign.name}</div>
                                    {MONEY_SIGN_TRAITS[moneySign.name] && (
                                        <div className="arch-traits">
                                            {MONEY_SIGN_TRAITS[moneySign.name].traits.map(t => (
                                                <span key={t} className="arch-trait-pill">{t}</span>
                                            ))}
                                        </div>
                                    )}
                                    <div className="arch-desc">
                                        {MONEY_SIGN_INFO[moneySign.name] || moneySign.desc}
                                    </div>
                                    {MONEY_SIGN_TRAITS[moneySign.name] && (
                                        <div className="arch-implication">
                                            {MONEY_SIGN_TRAITS[moneySign.name].implication}
                                        </div>
                                    )}
                                    <Link to="/questionnaire" className="profile-cta">Review Profile →</Link>
                                </div>
                                <div className="archetype-card-right">
                                    <div className="arch-animal-wrap">
                                        <div className="arch-orbit-ring" />
                                        <div className="arch-animal">{moneySign.icon}</div>
                                    </div>
                                    <div className="arch-animal-name">{moneySign.name}</div>
                                </div>
                            </div>
                        </>
                    )}

                    {/* ── Journey snapshot grid ── */}
                    {journeySteps.length > 0 && (
                        <>
                            <div className="journey-section-label ani d4">Your Financial Snapshot</div>
                            <div className="journey-grid ani d5">
                                {journeySteps.map((step, i) => (
                                    <div key={i} className={`journey-card journey-card--${step.type}`}>
                                        <div className="journey-card-icon">
                                            {JOURNEY_ICONS[step.label] || null}
                                        </div>
                                        <div className="journey-card-body">
                                            <div className="journey-card-label">{step.label}</div>
                                            <div className="journey-card-value">{step.value}</div>
                                            {step.sub && <div className="journey-card-sub">{step.sub}</div>}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </>
                    )}
                </div>
            </section>

            {/* ═══════════════════════════════════════════════════
                SECTION 02 — FINANCIAL HEALTH
               ═══════════════════════════════════════════════════ */}
            <section id="chapter-02" className="section">
                <div className="watermark">02</div>
                <div className="sec-bar ani d1">
                    <span className="sec-chapter">02 — Financial Health</span>
                    <div className="sec-actions">
                        <Link to="/reports" className="sec-btn accent">Show Report</Link>
                    </div>
                </div>
                <div className="content">
                    <div className="health-title ani d1">Financial Health</div>
                    <div className="health-intro ani d2">
                        <p>Two people with identical incomes can end up in very different financial positions based purely on how they behave with money — whether they save regularly, carry the right insurance, manage debt wisely, and understand what they own. The <strong>FBS</strong> captures all of that in a single 0–100 score across three dimensions: <strong>Foundation</strong> (safety nets), <strong>Behaviour</strong> (habits &amp; goals), and <strong>Awareness</strong> (knowledge &amp; diversity). Use it as a compass, not a verdict — every point gap is a specific, fixable action.</p>
                    </div>
                    <div className="health-grid">
                        <div className="health-score-col">
                            <div className="score-eyebrow ani d2">Your Score</div>
                            <div className="score-rating ani d3">{fbsRatingLabel}</div>
                            <div className="ani d4 score-compass-note">
                                Use as a compass, not a verdict — every gap is fixable.
                            </div>
                            <div className="donut-wrap ani-scale d4">
                                <svg width="140" height="140" viewBox="0 0 140 140"
                                    role="img"
                                    aria-label={`Financial Behaviour Score: ${fbs} out of 100 — ${fbsRatingLabel}. Similar peers score ${peerBenchmark.low}–${peerBenchmark.high}.`}>
                                    <title>FBS Score: {fbs}/100 ({fbsRatingLabel})</title>
                                    {/* Outer track */}
                                    <circle className="d-bg" cx="70" cy="70" r="58" />
                                    {/* Projected score arc — drawn first, behind the score */}
                                    {potentialPts > 0 && (
                                        <circle className="d-projected" cx="70" cy="70" r="58"
                                            style={{ '--projected-offset': projectedOffset }} />
                                    )}
                                    {/* Score fill arc */}
                                    <circle className="d-fill" cx="70" cy="70" r="58"
                                        style={{ '--donut-offset': donutOffset }} />
                                </svg>
                                <div className="donut-center">
                                    <span className="score-big">{fbs}</span>
                                    <span className="score-denom">/ 100</span>
                                </div>
                            </div>
                            {potentialPts > 0 && (
                                <div className="pts-tag ani d4">
                                    <span className="pts-dot" />↑ +{potentialPts} pts achievable
                                </div>
                            )}
                            {isQuestionnaireIncomplete && (
                                <div className="score-incomplete-note ani d5">
                                    Score updates as you complete more steps
                                </div>
                            )}
                        </div>
                        <div className="health-divider" />
                        <div>
                            {/* FBS spectrum bar */}
                            <div className="fbs-spectrum ani d3">
                                <div className="fbs-spectrum-track">
                                    {/* Peer range shaded band */}
                                    <div className="fbs-peer-band" style={{
                                        left: `${peerBenchmark.low}%`,
                                        width: `${peerBenchmark.high - peerBenchmark.low}%`
                                    }} />
                                    {/* Gradient fill up to user's score */}
                                    <div className="fbs-spectrum-fill" style={{ width: `${fbs}%` }} />
                                    {/* You are here marker */}
                                    <div className="fbs-you-marker" style={{ left: `${fbs}%` }}>
                                        <div className="fbs-you-line" />
                                        <div className="fbs-you-label">you</div>
                                    </div>
                                </div>
                                <div className="fbs-spectrum-labels">
                                    <span>0</span>
                                    <span>Critical</span>
                                    <span>Poor</span>
                                    <span>Moderate</span>
                                    <span>Good</span>
                                    <span>Excellent</span>
                                </div>
                                <div className="fbs-peer-legend">
                                    <span className="fbs-peer-swatch" />
                                    Peers like you typically score {peerBenchmark.low}–{peerBenchmark.high}
                                </div>
                            </div>
                            <div className="ani d4">
                                <div className="ss-row">
                                    <span className="ss-icon">{TIER_ICONS.Foundation}</span>
                                    <div className="ss-name-group">
                                        <span className="ss-name">Foundation</span>
                                        <span className="ss-desc">Emergency fund, insurance coverage and debt load — your financial safety net.</span>
                                    </div>
                                    <div className="ss-bar-track"><div className="ss-bar-fill" style={{ '--w': `${fPct}%`, '--bar-color': getTierColor(fPct) }} /></div>
                                    <span className="ss-score">{foundation.score} / {foundation.max}</span>
                                </div>
                                <div className="ss-row">
                                    <span className="ss-icon">{TIER_ICONS.Behaviour}</span>
                                    <div className="ss-name-group">
                                        <span className="ss-name">Behaviour</span>
                                        <span className="ss-desc">Investment regularity, goal clarity and emotional patterns around money.</span>
                                    </div>
                                    <div className="ss-bar-track"><div className="ss-bar-fill" style={{ '--w': `${bPct}%`, '--bar-color': getTierColor(bPct) }} /></div>
                                    <span className="ss-score">{behaviour.score} / {behaviour.max}</span>
                                </div>
                                {isSelfEmployed && (
                                    <div className="fbs-employment-note">
                                        Variable-income scoring: your investment regularity score uses a 3-month income buffer, reflecting real-world cash flow variability for self-employed earners.
                                    </div>
                                )}
                                <div className="ss-row">
                                    <span className="ss-icon">{TIER_ICONS.Awareness}</span>
                                    <div className="ss-name-group">
                                        <span className="ss-name">Awareness</span>
                                        <span className="ss-desc">Understanding of your own portfolio, tax efficiency and asset diversity.</span>
                                    </div>
                                    <div className="ss-bar-track"><div className="ss-bar-fill" style={{ '--w': `${aPct}%`, '--bar-color': getTierColor(aPct) }} /></div>
                                    <span className="ss-score">{awareness.score} / {awareness.max}</span>
                                </div>
                            </div>
                            <button
                                className="fbs-explainer-toggle ani d5"
                                onClick={() => setShowFBSExplainer(v => !v)}
                                aria-expanded={showFBSExplainer}
                                type="button"
                            >
                                {showFBSExplainer ? 'Hide methodology ↑' : 'How is this calculated? →'}
                            </button>
                            {showFBSExplainer && (
                                <div className="fbs-explainer-panel ani d1">
                                    <div className="fbs-explainer-title">How your FBS is calculated</div>
                                    <p className="fbs-explainer-intro">
                                        9 dimensions across three groups (Foundation, Behaviour, Awareness). Weights
                                        shift by life stage — younger users get more weight on investment regularity;
                                        older users on insurance and portfolio understanding.
                                    </p>
                                    <table className="fbs-explainer-table">
                                        <thead>
                                            <tr>
                                                <th>Dimension</th>
                                                <th>What it measures</th>
                                                <th>Weight</th>
                                                <th>Your score</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {FBS_DIMENSION_DEFS.map(d => {
                                                const weight = overview.fbsWeights?.[d.weightKey] ?? '—';
                                                const score  = overview.fbsBreakdown?.[d.breakdownKey] ?? 0;
                                                return (
                                                    <tr key={d.breakdownKey}>
                                                        <td><strong>{d.label}</strong></td>
                                                        <td>{d.desc}</td>
                                                        <td style={{ textAlign: 'right' }}>{weight}</td>
                                                        <td style={{ textAlign: 'right' }}>{score} / {weight}</td>
                                                    </tr>
                                                );
                                            })}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                            <div className="health-insight ani d5">
                                {isQuestionnaireIncomplete && fbs < 40 ? (
                                    <>
                                        Your score reflects partial data — complete remaining steps for an accurate picture.{' '}
                                        <Link to="/questionnaire" className="health-insight-cta">Continue questionnaire →</Link>
                                    </>
                                ) : fbsCtx.message}
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* ═══════════════════════════════════════════════════
                SECTION 03 — WHAT'S WORKING
               ═══════════════════════════════════════════════════ */}
            <section id="chapter-03" className="section">
                <div className="watermark">03</div>
                <div className="sec-bar ani d1">
                    <span className="sec-chapter">03 — What's Working</span>
                </div>
                <div className="content">
                    {strengthCount > 0 ? (
                        <>
                            <div className="w-title ani d1">What's<br />Working</div>
                            <div className="w-sub ani d2">{strengthCount} {strengthCount === 1 ? 'strength' : 'strengths'} identified in your profile</div>
                            {strengths.map((s, i) => (
                                <div key={s.title} className={`str-row ani d${Math.min(i + 3, 8)}`}>
                                    <span className="str-idx">{String(i + 1).padStart(2, '0')}</span>
                                    <div>
                                        <div className="str-name">{s.title}</div>
                                        <div className="str-desc">{s.explanation}</div>
                                        {s.link && s.link !== '/dashboard' && (
                                            <Link to={s.link} className="str-link">Explore →</Link>
                                        )}
                                    </div>
                                    <div className="str-val">
                                        <div className="str-val-num">{s.value}</div>
                                        {s.valueLabel && <div className="str-val-label">{s.valueLabel}</div>}
                                    </div>
                                </div>
                            ))}
                        </>
                    ) : (
                        <div className="ch-empty">
                            <div className="w-title ani d1">What's<br />Working</div>
                            <p className="ani d2">Complete the questionnaire to uncover your financial strengths.</p>
                        </div>
                    )}
                </div>
            </section>

            {/* ═══════════════════════════════════════════════════
                SECTION 04 — WHAT NEEDS ATTENTION
               ═══════════════════════════════════════════════════ */}
            <section id="chapter-04" className="section">
                <div className="watermark">04</div>
                <div className="sec-bar ani d1">
                    <span className="sec-chapter">04 — What Needs Attention</span>
                </div>
                <div className="content">
                    {gapCount > 0 ? (
                        <>
                            <div className="att-title ani d1">What Needs<br />Attention</div>
                            <div className="att-sub ani d2">{gapCount} {gapCount === 1 ? 'area' : 'areas'} — prioritised by urgency and expected impact</div>
                            {(showAllGaps ? gaps : gaps.slice(0, 4)).map((g, i) => (
                                <div key={g.title} className={`al-row ani d${Math.min(i + 3, 8)}`}>
                                    <div className="al-bar" />
                                    <div>
                                        <div className="al-tag">{g.severity === 'critical' ? 'Priority — Highest Impact' : g.tag || 'Watch'}</div>
                                        <div className="al-title">{g.title}</div>
                                        <div className="al-desc">{g.explanation}</div>
                                        {g.link && (
                                            <Link to={g.link} className="al-link">{g.explorePage ? `View ${g.explorePage}` : 'Learn more'} →</Link>
                                        )}
                                    </div>
                                    <div className="al-meta">
                                        {g.target && (
                                            <>
                                                <div className="al-meta-label">Target</div>
                                                <div className="al-meta-val">{g.target}</div>
                                            </>
                                        )}
                                    </div>
                                </div>
                            ))}
                            {gapCount > 4 && !showAllGaps && (
                                <button className="show-more-btn" onClick={() => setShowAllGaps(true)}>
                                    Show {gapCount - 4} more {gapCount - 4 === 1 ? 'area' : 'areas'}
                                </button>
                            )}
                        </>
                    ) : (
                        <div className="ch-empty">
                            <div className="att-title ani d1">What Needs<br />Attention</div>
                            <p className="ani d2">No major gaps detected — your financial profile is in great shape.</p>
                        </div>
                    )}
                </div>
            </section>

            {/* ═══════════════════════════════════════════════════
                SECTION 05 — CASHFLOW OUTLOOK
               ═══════════════════════════════════════════════════ */}
            <section id="chapter-05" className="section">
                <div className="watermark">05</div>
                <div className="sec-bar ani d1">
                    <span className="sec-chapter">05 — Cashflow Outlook</span>
                </div>
                <div className="content">
                    {cashflow && cashflow.items && cashflow.items.length > 0 ? (
                        <>
                            <div className="cf-title ani d1">Cashflow<br />Outlook</div>
                            <div className="cf-sub ani d2">Where your money goes over the next 3 months</div>
                            <table className="cf-table ani d3">
                                <thead>
                                    <tr>
                                        <th>Item</th>
                                        <th>3-Month Total</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {cashflow.items.filter(it => it.amount > 0).map(it => (
                                        <tr key={it.name}>
                                            <td>{it.name}</td>
                                            <td className={it.type === 'credit' ? 'cf-positive' : 'cf-negative'}>
                                                {it.type === 'credit' ? '+' : '−'}{fmt(Math.round(it.amount))}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                                <tfoot>
                                    <tr className={`cf-total${cashflow.surplus < 0 ? ' cf-negative-total' : ''}`}>
                                        <td>Net Surplus</td>
                                        <td>{fmt(Math.round(cashflow.surplus))}</td>
                                    </tr>
                                </tfoot>
                            </table>
                            <div className="cf-footnote ani d4">
                                {cashflow.surplus > 0
                                    ? `You have roughly ${fmt(Math.round(cashflow.surplus))} of free cash over the next quarter — the action plan below shows the best ways to deploy it.`
                                    : 'Your projected cashflow is tight. The action plan below focuses on the highest-impact changes you can make.'
                                }
                            </div>
                        </>
                    ) : (
                        <div className="ch-empty">
                            <div className="cf-title ani d1">Cashflow<br />Outlook</div>
                            <p className="ani d2">Not enough data to project cashflow. Complete the income and expenses sections of the questionnaire.</p>
                        </div>
                    )}
                </div>
            </section>

            {/* ═══════════════════════════════════════════════════
                SECTION 06 — ACTION PLAN
               ═══════════════════════════════════════════════════ */}
            <section id="chapter-06" className="section">
                <div className="watermark">06</div>
                <div className="sec-bar ani d1">
                    <span className="sec-chapter">06 — Action Plan</span>
                </div>
                <div className="content">
                    {fbsActions.length > 0 && fbs < 100 ? (
                        <>
                            <div className="act-title ani d1">Action Plan</div>
                            <div className="act-sub ani d2">Practical, prioritised actions to boost your financial score</div>
                            <div className="proj-row ani d2">
                                <span className="proj-label">Projected score after actions</span>
                                <span className="proj-num">{projectedScore}</span>
                                <span className="proj-denom">/ 100</span>
                            </div>
                            <div className="proj-track ani d3">
                                <div className="proj-fill" style={{ '--proj-w': `${projectedPct}%` }} />
                            </div>
                            {fbsActions.map((action, i) => {
                                const link = getActionLink(action.category);
                                const nextStep = getActionNextStep(action, fmt);
                                return (
                                    <div key={action.title} className={`act-item ani d${Math.min(i + 3, 8)}`}>
                                        <div>
                                            <div className="act-pts">+{action.fbsImpact}</div>
                                            <div className="act-pts-label">pts</div>
                                        </div>
                                        <div>
                                            <div className="act-name">{action.title}</div>
                                            <div className="act-desc">{action.description}</div>
                                            {nextStep && <div className="act-highlight">{nextStep}</div>}
                                        </div>
                                        <div>
                                            {confirmingAction === action.title ? (
                                                <div className="act-confirm">
                                                    <span className="act-confirm-text">Done?</span>
                                                    <button className="act-confirm-yes" aria-label={`Yes, mark "${action.title}" as done`} onClick={() => handleMarkDone(action)}>Yes</button>
                                                    <button className="act-confirm-cancel" aria-label="No, cancel" onClick={() => setConfirmingAction(null)}>No</button>
                                                </div>
                                            ) : (
                                                <button className="act-cta" aria-label={`Mark "${action.title}" as done`} onClick={() => setConfirmingAction(action.title)}>
                                                    {link.label === 'Mark as done →' ? 'Mark done' : link.label}
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                            <Link to="/reports" className="act-view-all">View Full Action Plan →</Link>
                        </>
                    ) : (
                        <div className="ch-empty">
                            <div className="act-title ani d1">Action Plan</div>
                            <p className="act-sub ani d2">{fbs >= 100 ? 'Perfect score — all actions complete!' : 'No pending actions. Keep up the good work!'}</p>
                        </div>
                    )}
                </div>
            </section>
        </div>
    );
}

export default Dashboard;
