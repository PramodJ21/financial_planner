import { useEffect, useState } from 'react';
import { fetchWithAuth } from '../api';
import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts';
import { Link } from 'react-router-dom';
import {
    getOverviewNarrative, getFBSContext, getNetWorthContext,
    getExpenseRatioContext, getAssetStatus,
    getActionLink, getActionNextStep
} from '../utils/financialInsights';
import { fmt, fmtFull } from '../utils/formatCurrency';

const MONEY_SIGN_INFO = {
    'Bold Eagle': 'As a Bold Eagle, you are highly aggressive and deeply engaged with markets. You actively seek high-growth opportunities and are comfortable with significant risk. While this can lead to strong returns, be cautious of overconcentration and ensure proper diversification.',
    'Cautious Turtle': 'As a Cautious Turtle, you prioritise safety and guaranteed returns over market-beating growth. While this protects your capital, being too conservative - especially when young - can mean your wealth doesn\'t outpace inflation. Consider a small equity allocation for long-term goals.',
    'Persistent Horse': 'As a Persistent Horse, you are steady and methodical. You set a solid long-term strategy and stick to it without over-monitoring. This disciplined approach is highly effective. Just ensure you review your portfolio at least annually to rebalance.',
    'Curious Fox': 'As a Curious Fox, you are highly active and experimental, constantly looking for trends. While your curiosity can uncover opportunities, it can also lead to over-trading and chasing short-term returns. Consider a core-satellite approach: keep 80% in a stable portfolio and experiment with 20%.',
    'Strategic Owl': 'As a Strategic Owl, you are wise and disciplined. You analyse thoroughly before acting and maintain strong emotional control during market volatility. This is one of the most effective investor profiles - just make sure analysis paralysis doesn\'t delay action.',
    'Loyal Elephant': 'As a Loyal Elephant, you are patient and risk-averse, sticking to what you know. While loyalty to proven assets is admirable, be open to diversification. Over-reliance on fixed deposits and traditional assets may not beat inflation in the long run.',
    'Balanced Dolphin': 'As a Balanced Dolphin, you maintain a healthy equilibrium between growth-seeking and wealth-preserving behaviours. You adapt well to changing conditions. Continue this balanced approach and review your allocation periodically to stay aligned with your life stage.'
};

// Chart color constants
const ASSET_COLORS = {
    equity: '#1C1A17',
    realEstate: '#6B6760',
    commodity: '#C4703A',
    debt: '#4A7C59',
    altInvestments: '#C4BFB8'
};
const INCOME_COLORS = ['#1C1A17', '#C4703A', '#C4BFB8', '#6B6760'];
const EXPENSE_COLORS = ['#1C1A17', '#C4703A', '#C4BFB8', '#6B6760'];

/** Parse simple HTML with <strong> tags into React elements (D2 — avoid dangerouslySetInnerHTML) */
function renderNarrative(html) {
    const parts = html.split(/(<strong>.*?<\/strong>)/g);
    return parts.map((part, i) => {
        const match = part.match(/^<strong>(.*)<\/strong>$/);
        if (match) return <strong key={i}>{match[1]}</strong>;
        return part;
    });
}

/** Shared donut chart with empty-state fallback (D7) */
function MiniDonut({ data, dataKey, colors, hasData }) {
    const chartData = hasData ? data.filter(d => d[dataKey] > 0) : [{ [dataKey]: 1 }];
    return (
        <div className="donut-sm">
            <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                    <Pie data={chartData} dataKey={dataKey} innerRadius={28} outerRadius={40}>
                        {chartData.map((_, i) => (
                            <Cell key={i} fill={hasData ? (colors[i] || '#C4BFB8') : '#C4BFB8'} stroke="none" />
                        ))}
                    </Pie>
                </PieChart>
            </ResponsiveContainer>
        </div>
    );
}

/** Bias tag with click-to-toggle tooltip (D3 — replaces hover-only) */
function BiasTag({ bias, isActive, onToggle }) {
    return (
        <div className="bias-wrapper" onClick={() => onToggle(bias.name)}>
            <span className="bias-tag" style={{ cursor: 'pointer' }}>{bias.name}</span>
            {isActive && <div className="bias-tooltip">{bias.desc}</div>}
        </div>
    );
}

function Dashboard() {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [activeBias, setActiveBias] = useState(null); // D3+D15: click-to-toggle, replaces hoveredBias

    useEffect(() => {
        fetchWithAuth('/dashboard/full').then(res => {
            setData(res);
            setLoading(false);
        }).catch(() => setLoading(false));
    }, []);

    if (loading) return (
        <div className="dash-loading">
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

    const { overview, investments, actionPlan } = data;
    const currentDate = new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });

    const userAge = data.overview?.profile?.age ?? 30;
    const fbs = overview.fbs;
    const fbsCtx = getFBSContext(fbs);
    const fbsActions = actionPlan
        .filter(a => a.fbsImpact > 0 && a.status !== 'completed')
        .sort((a, b) => b.fbsImpact - a.fbsImpact)
        .slice(0, 3);
    const overviewNarrative = getOverviewNarrative(data, fmt, userAge, actionPlan);
    const monthlyIncome = (overview.income?.total ?? 0) / 12;
    const expenseRatio = getExpenseRatioContext(overview.expenses?.effectiveMonthly ?? 0, monthlyIncome);
    const netWorthNote = getNetWorthContext(
        overview.netWorth?.netWorth ?? 0,
        overview.liabilities?.total ?? 0,
        overview.liabilities?.goodLiability?.outstanding ?? 0,
        fmt
    );

    // D13: use overview.income.total instead of inline .reduce()
    const incomeTotal = overview.income?.total ?? 0;

    // Portfolio status line
    const worstAlloc = (() => {
        for (const c of [{ key: 'equity', dataKey: 'equity', label: 'Equity' }, { key: 'debt', dataKey: 'debt', label: 'Debt' }]) {
            const pct = Math.round(overview.investments.allocation?.[c.dataKey] ?? 0);
            const { status } = getAssetStatus(c.key, pct, userAge);
            if (status !== 'on_track') return { label: c.label, status };
        }
        return null;
    })();
    const portfolioStatusText = worstAlloc
        ? `⚠ ${worstAlloc.label} allocation ${worstAlloc.status === 'too_high' ? 'above' : 'below'} ideal range for your age`
        : '✓ Allocation on track';

    // Liabilities status line
    const badOutstanding = overview.liabilities?.badLiability?.outstanding ?? 0;
    const totalLiab = overview.liabilities?.total ?? 0;
    const badPct = totalLiab > 0 ? Math.round(badOutstanding / totalLiab * 100) : 0;
    const liabStatusText = totalLiab === 0 ? '✓ No liabilities'
        : badPct > 50 ? '⚠ High bad debt ratio'
        : badPct > 0  ? '⚠ Some bad debt present'
        : '✓ No bad debt detected';

    // Insurance status line
    const insureStatusText = overview.insurance?.lifeCover === 0 ? '⚠ Life insurance missing'
        : overview.insurance?.healthCover === 0 ? '⚠ Health cover missing'
        : '✓ Coverage on track';

    // FBS status tag class
    const fbsTagClass = fbs >= 61 ? 'ok' : fbs >= 41 ? 'warn' : 'danger';

    // D14: normalize expense breakdown source
    const expenseBreakdown = overview.expenses?.monthlyBreakdown || overview.expenses?.breakdown || [];

    // D7: pre-compute donut data for income, expenses, assets, liabilities, insurance
    const incomeBreakdown = overview.income?.breakdown || [];
    const hasIncomeData = incomeBreakdown.some(d => d.percent > 0);
    const hasExpenseData = (overview.expenses?.breakdown || []).some(d => d.percent > 0);
    const assetAllocation = Object.entries(overview.investments.allocation || {}).filter(([, v]) => v > 0);
    const hasAssetData = investments.assets.total > 0;
    const hasLiabData = overview.liabilities.total > 0;
    const hasInsuranceData = !!(overview.insurance.healthPercent || overview.insurance.lifePercent);

    const toggleBias = (name) => setActiveBias(prev => prev === name ? null : name);

    return (
        <>
            {/* ── HERO ROW: Financial Journey (left) + FBS Score (right) ── */}
            <div className="hero-row">
                {/* Left — Financial Journey */}
                <div className="card-warm hero-left">
                    <div className="act-label" style={{ color: 'var(--accent)' }}>Your Financial Journey</div>
                    <p className="narrative-text">{renderNarrative(overviewNarrative)}</p>
                    <div className="status-tags">
                        <span className={`status-tag ${fbsTagClass}`}>FBS: {fbsCtx.range}</span>
                        {!(overview.emergency?.emergencyFunds?.actual >= overview.emergency?.emergencyFunds?.ideal) && (
                            <span className="status-tag danger">Emergency Fund: Incomplete</span>
                        )}
                        {overview.insurance?.lifeCover === 0 && (
                            <span className="status-tag danger">Life Insurance: Missing</span>
                        )}
                        {overview.insurance?.healthCover === 0 && (
                            <span className="status-tag danger">Health Insurance: Missing</span>
                        )}
                    </div>
                </div>

                {/* Right — FBS Score */}
                <div className="card-warm hero-right">
                    <div className="act-label" style={{ color: 'var(--accent)', marginBottom: '10px' }}>Financial Behaviour Score</div>
                    <div className="section-desc" style={{ marginBottom: '16px' }}>
                        Measuring overall health of your financial decisions — savings, investments, insurance & debt.
                    </div>
                    <div className="score-number">
                        <span className="score-big">{fbs}</span>
                        <span className="score-denom">/100</span>
                    </div>
                    <div className="score-bar-wrap">
                        <div className="score-marker-label" style={{ left: `${fbs}%` }}>{fbs}</div>
                        <div className="score-bar-track"></div>
                        <div className="score-marker" style={{ left: `${fbs}%` }}><div className="score-marker-dot"></div></div>
                    </div>
                    <div className="score-bar-labels">
                        <span>Critical</span><span>Poor</span><span>Moderate</span><span>Good</span><span>Excellent</span>
                    </div>
                    <div className="fbs-benchmark">{fbsCtx.benchmark}</div>
                </div>
            </div>

            {/* SNAPSHOT */}
            <div>
                <div className="act-label">Snapshot</div>
                <div className="kpis-grid">
                    <div className="kpi">
                        <div className="kpi-label">Current Net Worth</div>
                        <div className={`kpi-value ${overview.netWorth?.netWorth < 0 ? 'negative' : ''}`}>{fmt(overview.netWorth?.netWorth)}</div>
                        <div className="kpi-sub">Total Assets − Liabilities</div>
                        {netWorthNote && <div className="kpi-note">{netWorthNote}</div>}
                    </div>
                    <div className="kpi">
                        <div className="kpi-label">Total Assets</div>
                        <div className="kpi-value">{fmt(overview.investments.total)}</div>
                        <div className="kpi-sub">Investments & savings</div>
                    </div>
                    <div className="kpi">
                        <div className="kpi-label">Total Liabilities</div>
                        <div className="kpi-value">{fmt(overview.liabilities.total)}</div>
                        <div className="kpi-sub">All loans outstanding</div>
                    </div>
                    <div className="kpi">
                        <div className="kpi-label">Monthly Surplus</div>
                        <div className="kpi-value">{fmt(overview.surplus.monthly)}</div>
                        <div className="kpi-sub">After expenses, EMIs & SIP</div>
                    </div>
                    <div className="kpi">
                        <div className="kpi-label">Credit Score</div>
                        <div className={`kpi-value ${!overview.creditScore ? 'dash' : ''}`}>{overview.creditScore || '-'}</div>
                        <div className="kpi-sub">CIBIL / Experian</div>
                    </div>
                </div>
            </div>

            {/* WHAT TO DO NOW (D9: added link to full action plan) */}
            {fbsActions.length > 0 && fbs < 100 && (
                <div>
                    <div className="act-label">What To Do Now</div>
                    {fbsActions.map((action) => {
                        const link = getActionLink(action.category);
                        const nextStep = getActionNextStep(action, fmt);
                        return (
                            <div key={action.title} className="action-card">
                                <div className="action-card-header">
                                    <span className="action-card-title">{action.title}</span>
                                    {action.fbsImpact > 0 && <span className="rec-badge" style={{ flexShrink: 0 }}>+{action.fbsImpact} pts</span>}
                                </div>
                                <p className="action-card-desc">{action.description}</p>
                                {nextStep && <p className="action-card-step">{nextStep}</p>}
                                <Link to={link.path} className="action-card-link">{link.label}</Link>
                            </div>
                        );
                    })}
                    <Link to="/reports" className="detail-link">View Full Action Plan →</Link>
                </div>
            )}

            {/* PERSONA */}
            <div>
                <div className="act-label">Moneysign</div>
                <div className="section-desc" style={{ marginBottom: '16px' }}>Your financial personality type based on your behaviour patterns. Understand how you naturally think about money and where it may be working against you.</div>
                <div className="persona-header">
                    <div className="persona-icon">{overview.moneySign.icon}</div>
                    <div>
                        <div className="persona-title">{overview.moneySign.name}</div>
                        <div className="persona-desc">{MONEY_SIGN_INFO[overview.moneySign.name] || overview.moneySign.desc}</div>
                    </div>
                </div>

                {overview.biases && overview.biases.length > 0 && (
                    <>
                        <div className="biases-label">Behavioural Biases</div>
                        <div className="biases-list">
                            {overview.biases.map(b => (
                                <BiasTag key={b.name} bias={b} isActive={activeBias === b.name} onToggle={toggleBias} />
                            ))}
                        </div>
                        <div className="bias-hint">Tap a bias to see details</div>
                    </>
                )}
            </div>

            {/* CASHFLOW */}
            <div>
                <div className="act-label">Cashflow</div>
                <div className="section-heading">Next 3 Months Cashflow</div>
                <div className="info-box">
                    <div style={{ fontSize: '15px', marginTop: '1px', flexShrink: 0 }}>◎</div>
                    <div className="info-box-text">
                        <p>Why is my Surplus lower than I thought?</p>
                        <p>Most people calculate surplus as <strong>Income − Monthly Expenses</strong>. But annual bills (insurance, fees) and committed investments (SIP) come out of this too. This cashflow reserves a quarter's worth of annual obligations and deducts your planned investments — so the surplus here is your <strong>true unallocated cash</strong> for the period.</p>
                    </div>
                </div>
                <div className="table-scroll-wrapper">
                    <table className="cashflow-table">
                        <thead><tr><th>Particulars</th><th>Type</th><th>Amount</th></tr></thead>
                        <tbody>
                            {(overview.cashflow?.items || []).map((item, idx) => (
                                <tr key={item.name || idx}>
                                    <td>{item.name}</td>
                                    <td><span className={`type-badge ${item.type === 'credit' ? 'credit' : 'debit'}`}>{item.type.toUpperCase()}</span></td>
                                    <td>{item.amount > 0 ? fmt(item.amount) : '-'}</td>
                                </tr>
                            ))}
                            <tr className="total-row">
                                <td colSpan={2}>Surplus for the Period</td>
                                <td>{fmtFull(overview.cashflow.surplus)}</td>
                            </tr>
                        </tbody>
                    </table>
                </div>
                <div className="section-note-text">
                    <strong>Cashflow surplus</strong> = income for 3 months minus all outflows (living costs, EMIs, SIP, annual bills). This is money left completely unallocated. The <strong>Monthly Surplus</strong> KPI above is the same calculation on a per-month basis.
                </div>
            </div>

            {/* INCOME & EXPENSES */}
            <div className="split-grid">
                <div>
                    <div className="split-header">
                        <span className="split-title">Income <Link to="/tax" className="arrow-link" style={{ fontSize: '12px' }}>↗</Link></span>
                        <span className="split-date">As of {currentDate}</span>
                    </div>
                    <div className="split-donut-row">
                        <MiniDonut
                            data={incomeBreakdown}
                            dataKey="percent"
                            colors={INCOME_COLORS}
                            hasData={hasIncomeData}
                        />
                        <div className="split-legend">
                            {incomeBreakdown.map((item, i) => (
                                <div key={item.type} className="split-legend-item">
                                    <span className="legend-dot" style={{ background: INCOME_COLORS[i % INCOME_COLORS.length] }}></span>
                                    {item.type} ({Math.round(item.percent)}%)
                                </div>
                            ))}
                        </div>
                    </div>
                    <div className="table-scroll-wrapper">
                        <table className="asset-table">
                            <thead><tr><th>Income Type</th><th>Monthly</th><th>Annual</th></tr></thead>
                            <tbody>
                                {incomeBreakdown.map((item, i) => (
                                    <tr key={item.type}>
                                        <td><span className="dot" style={{ background: INCOME_COLORS[i % INCOME_COLORS.length] }}></span>{item.type}</td>
                                        <td>{item.amount > 0 ? fmt(Math.round(item.amount / 12)) : '0'}</td>
                                        <td>{item.amount > 0 ? fmt(item.amount) : '0'}</td>
                                    </tr>
                                ))}
                                <tr>
                                    <td>Total</td>
                                    <td>{fmt(Math.round(incomeTotal / 12))}</td>
                                    <td>{fmt(incomeTotal)}</td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                </div>

                <div>
                    <div className="split-header">
                        <span className="split-title">Expenses</span>
                        <span className="split-date">As of {currentDate}</span>
                    </div>
                    <div className="split-donut-row">
                        <MiniDonut
                            data={overview.expenses?.breakdown || []}
                            dataKey="percent"
                            colors={EXPENSE_COLORS}
                            hasData={hasExpenseData}
                        />
                        <div className="split-legend">
                            {(overview.expenses?.breakdown || []).map((item, i) => (
                                <div key={item.type} className="split-legend-item">
                                    <span className="legend-dot" style={{ background: EXPENSE_COLORS[i % EXPENSE_COLORS.length] }}></span>
                                    {item.type} ({Math.round(item.percent)}%)
                                </div>
                            ))}
                        </div>
                    </div>
                    <div className="table-scroll-wrapper">
                        <table className="asset-table">
                            <thead><tr><th>Expenses</th><th>Monthly Amount</th></tr></thead>
                            <tbody>
                                {expenseBreakdown.map((item, i) => (
                                    <tr key={item.type}>
                                        <td><span className="dot" style={{ background: EXPENSE_COLORS[i % EXPENSE_COLORS.length] }}></span>{item.type}</td>
                                        <td>{item.amount > 0 ? fmt(item.amount) : '0'}</td>
                                    </tr>
                                ))}
                                <tr>
                                    <td>Total</td>
                                    <td>{fmt(expenseBreakdown.reduce((s, i) => s + (i.amount || 0), 0))}</td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                    {expenseRatio.message && (
                        <div className={`ratio-badge ${expenseRatio.status === 'healthy' ? 'ok' : expenseRatio.status === 'moderate' ? 'warn' : 'danger'}`}>
                            {expenseRatio.message}
                        </div>
                    )}
                </div>
            </div>

            {/* ASSETS, LIABILITIES & INSURANCE (D4: triple-grid instead of double-grid) */}
            <div className="triple-grid">
                <div>
                    <div className="split-header">
                        <span className="split-title">Assets <Link to="/investments" className="arrow-link" style={{ fontSize: '12px' }}>↗</Link></span>
                        <span className="split-date">As of {currentDate}</span>
                    </div>
                    <div className="split-donut-row">
                        <MiniDonut
                            data={assetAllocation.map(([k, v]) => ({ name: k, value: v }))}
                            dataKey="value"
                            colors={assetAllocation.map(([k]) => ASSET_COLORS[k] || '#C4BFB8')}
                            hasData={hasAssetData}
                        />
                        <div className="split-legend">
                            {assetAllocation.map(([k, v]) => (
                                <div key={k} className="split-legend-item">
                                    <span className="legend-dot" style={{ background: ASSET_COLORS[k] || '#C4BFB8' }}></span>
                                    {k.replace(/([A-Z])/g, ' $1').trim().replace(/^\w/, c => c.toUpperCase())} ({Math.round(v)}%)
                                </div>
                            ))}
                        </div>
                    </div>
                    <div className="table-scroll-wrapper">
                        <table className="asset-table">
                            <thead><tr><th>Assets</th><th>Total Value</th></tr></thead>
                            <tbody>
                                <tr>
                                    <td>Total</td>
                                    <td>{fmt(investments.assets.total)}</td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                    <div className={`status-line ${worstAlloc ? 'warn' : 'ok'}`}>{portfolioStatusText}</div>
                    <Link to="/investments" className="detail-link">See full analysis →</Link>
                </div>

                <div>
                    <div className="split-header">
                        <span className="split-title">Liabilities <Link to="/liabilities" className="arrow-link" style={{ fontSize: '12px' }}>↗</Link></span>
                        <span className="split-date">As of {currentDate}</span>
                    </div>
                    <div className="split-donut-row">
                        <MiniDonut
                            data={[
                                { name: 'Good', outstanding: overview.liabilities.goodLiability?.outstanding || 0 },
                                { name: 'Bad', outstanding: overview.liabilities.badLiability?.outstanding || 0 }
                            ]}
                            dataKey="outstanding"
                            colors={['#2D5A3D', '#8B2626']}
                            hasData={hasLiabData}
                        />
                        <div className="split-legend">
                            <div className="split-legend-item"><span className="legend-dot" style={{ background: '#2D5A3D' }}></span>Good Liabilities ({hasLiabData ? Math.round((overview.liabilities.goodLiability?.outstanding || 0) / overview.liabilities.total * 100) : 0}%)</div>
                            <div className="split-legend-item"><span className="legend-dot" style={{ background: '#8B2626' }}></span>Bad Liabilities ({hasLiabData ? Math.round((overview.liabilities.badLiability?.outstanding || 0) / overview.liabilities.total * 100) : 0}%)</div>
                        </div>
                    </div>
                    <div className="table-scroll-wrapper">
                        <table className="asset-table">
                            <thead><tr><th>Type</th><th>Outstanding</th></tr></thead>
                            <tbody>
                                <tr>
                                    <td>Total Liabilities</td>
                                    <td>{fmtFull(overview.liabilities.total)}</td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                    <div className={`status-line ${liabStatusText.startsWith('✓') ? 'ok' : 'warn'}`}>{liabStatusText}</div>
                    <Link to="/liabilities" className="detail-link">See full analysis →</Link>
                </div>

                <div>
                    <div className="split-header">
                        <span className="split-title">Insurance <Link to="/insurance" className="arrow-link" style={{ fontSize: '12px' }}>↗</Link></span>
                        <span className="split-date">As of {currentDate}</span>
                    </div>
                    <div className="split-donut-row">
                        <MiniDonut
                            data={[
                                { name: 'Life', percent: overview.insurance.lifePercent },
                                { name: 'Health', percent: overview.insurance.healthPercent }
                            ]}
                            dataKey="percent"
                            colors={['#1C1A17', '#C4703A']}
                            hasData={hasInsuranceData}
                        />
                        <div className="split-legend">
                            <div className="split-legend-item"><span className="legend-dot" style={{ background: '#1C1A17' }}></span>Life Insurance ({overview.insurance.lifePercent || 0}%)</div>
                            <div className="split-legend-item"><span className="legend-dot" style={{ background: '#C4703A' }}></span>Health Insurance ({overview.insurance.healthPercent || 0}%)</div>
                        </div>
                    </div>
                    <div className="table-scroll-wrapper">
                        <table className="asset-table">
                            <thead><tr><th>Insurance</th><th>Total Cover</th></tr></thead>
                            <tbody>
                                <tr>
                                    <td>Total</td>
                                    <td>{fmt((overview.insurance.lifeCover || 0) + (overview.insurance.healthCover || 0))}</td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                    <div className={`status-line ${insureStatusText.startsWith('✓') ? 'ok' : 'warn'}`}>{insureStatusText}</div>
                    <Link to="/insurance" className="detail-link">See full analysis →</Link>
                </div>
            </div>

            {/* WILL & ESTATE */}
            <div>
                <div className="will-header">
                    <div>
                        <div className="act-label">Estate Planning</div>
                        <div className="section-heading" style={{ marginBottom: 0 }}>
                            Will & Estate <Link to="/estate" className="arrow-link">↗</Link>
                        </div>
                    </div>
                    <Link to="/estate" className="create-btn" style={{ textDecoration: 'none' }}>+ Create Will</Link>
                </div>

                <div className="will-alert">
                    <div style={{ fontSize: '15px', marginTop: '1px' }}>△</div>
                    <div>
                        <div className="will-alert-title">{overview.willEstate.hasWill ? 'Will Created' : (overview.willEstate.willInProgress ? 'Will In Progress' : 'No Will Created')}</div>
                        <div className="will-alert-desc">Protect your family's future by creating a comprehensive will and estate plan.</div>
                    </div>
                </div>

                <div className="will-kpis">
                    <div className="will-kpi">
                        <div className="will-kpi-label">Total Investment</div>
                        <div className="will-kpi-value">{fmtFull(overview.willEstate.totalInvestment)}</div>
                    </div>
                    <div className="will-kpi">
                        <div className="will-kpi-label">Insurance Cover</div>
                        <div className="will-kpi-value">{overview.willEstate.insuranceCover > 0 ? fmtFull(overview.willEstate.insuranceCover) : '₹0'}</div>
                    </div>
                    <div className="will-kpi">
                        <div className="will-kpi-label">Total Nominees</div>
                        <div className="will-kpi-value">{overview.willEstate.numNominees}</div>
                    </div>
                </div>
            </div>

        </>
    );
}

export default Dashboard;
