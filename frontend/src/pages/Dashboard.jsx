import React, { useEffect, useState } from 'react';
import { fetchWithAuth } from '../api';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip as RechartsTooltip } from 'recharts';
import { Link } from 'react-router-dom';

const MONEY_SIGN_INFO = {
    'Bold Eagle': 'As a Bold Eagle, you are highly aggressive and deeply engaged with markets. You actively seek high-growth opportunities and are comfortable with significant risk. While this can lead to strong returns, be cautious of overconcentration and ensure proper diversification.',
    'Cautious Turtle': 'As a Cautious Turtle, you prioritise safety and guaranteed returns over market-beating growth. While this protects your capital, being too conservative - especially when young - can mean your wealth doesn\'t outpace inflation. Consider a small equity allocation for long-term goals.',
    'Persistent Horse': 'As a Persistent Horse, you are steady and methodical. You set a solid long-term strategy and stick to it without over-monitoring. This disciplined approach is highly effective. Just ensure you review your portfolio at least annually to rebalance.',
    'Curious Fox': 'As a Curious Fox, you are highly active and experimental, constantly looking for trends. While your curiosity can uncover opportunities, it can also lead to over-trading and chasing short-term returns. Consider a core-satellite approach: keep 80% in a stable portfolio and experiment with 20%.',
    'Strategic Owl': 'As a Strategic Owl, you are wise and disciplined. You analyse thoroughly before acting and maintain strong emotional control during market volatility. This is one of the most effective investor profiles - just make sure analysis paralysis doesn\'t delay action.',
    'Loyal Elephant': 'As a Loyal Elephant, you are patient and risk-averse, sticking to what you know. While loyalty to proven assets is admirable, be open to diversification. Over-reliance on fixed deposits and traditional assets may not beat inflation in the long run.',
    'Balanced Dolphin': 'As a Balanced Dolphin, you maintain a healthy equilibrium between growth-seeking and wealth-preserving behaviours. You adapt well to changing conditions. Continue this balanced approach and review your allocation periodically to stay aligned with your life stage.'
};

const fmt = (val) => {
    let n = Number(val) || 0;
    let sign = '';
    if (n < 0) {
        sign = '−';
        n = Math.abs(n);
    }
    if (n >= 10000000) return sign + '₹' + (n / 10000000).toFixed(1) + 'Cr';
    if (n >= 100000) return sign + '₹' + (n / 100000).toFixed(1) + 'L';
    if (n >= 1000) return sign + '₹' + (n / 1000).toFixed(1) + 'K';
    return sign + '₹' + n.toLocaleString('en-IN');
};

const fmtFull = (val) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(val || 0);

function Dashboard() {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('Emergency Planning');

    useEffect(() => {
        fetchWithAuth('/dashboard/full').then(res => {
            setData(res);
            if (res?.overview?.lifeStage?.stage) {
                localStorage.setItem('lifeStage', res.overview.lifeStage.stage);
            }
            setLoading(false);
        }).catch(() => setLoading(false));
    }, []);

    if (loading) return (
        <div>Loading...</div>
    );
    if (!data) return (
        <div style={{ textAlign: 'center', padding: '60px 20px' }}>
            <div style={{ fontSize: '16px', color: '#0D1B2A', fontWeight: 600, marginBottom: '8px' }}>No data yet</div>
            <Link to="/questionnaire" style={{ color: '#C4703A', fontWeight: 500 }}>Complete the questionnaire to get started</Link>
        </div>
    );

    const { overview, investments, liabilities, insurance, actionPlan } = data;
    const currentDate = new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });

    // Chart Colors
    const ASSET_COLORS = {
        equity: '#1C1A17',
        realEstate: '#6B6760',
        commodity: '#C4703A',
        debt: '#4A7C59',
        altInvestments: '#C4BFB8'
    };

    const INCOME_COLORS = ['#1C1A17', '#C4703A', '#C4BFB8', '#6B6760'];
    const EXPENSE_COLORS = ['#1C1A17', '#C4703A', '#C4BFB8', '#6B6760'];

    const fbs = overview.fbs;
    const fbsActions = actionPlan
        .filter(a => a.fbsImpact > 0 && a.status !== 'completed')
        .sort((a, b) => b.fbsImpact - a.fbsImpact)
        .slice(0, 3);

    return (
        <>
            <div className="banner">
                <div className="banner-text">
                    <p>Keep your financial data current</p>
                    <p>Regular updates ensure the most accurate health score and recommendations.</p>
                </div>
                <Link to="/questionnaire" className="banner-btn" style={{ textDecoration: 'none' }}>EDIT QUESTIONNAIRE</Link>
            </div>

            {/* SCORE */}
            <div>
                <div className="act-label">Financial Behaviour Score</div>
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

                {fbsActions.length > 0 && fbs < 100 && (
                    <>
                        <div className="recs-sublabel">Level up your FBS</div>
                        {fbsActions.map((action, idx) => (
                            <Link to="/reports" key={idx} className="rec-item">
                                <div className="rec-left"><span className="rec-arrow">↗</span><span className="rec-text">{action.title}</span></div>
                                <span className="rec-badge">+{action.fbsImpact} pts</span>
                            </Link>
                        ))}
                    </>
                )}
            </div>

            {/* PERSONA */}
            <div>
                <div className="act-label">Moneysign</div>
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
                                <span key={b.name} className="bias-tag" title={b.desc}>{b.name}</span>
                            ))}
                        </div>
                    </>
                )}
            </div>

            {/* SNAPSHOT */}
            <div>
                <div className="act-label">Snapshot</div>
                <div className="kpis-grid">
                    <div className="kpi">
                        <div className="kpi-label">Current Net Worth</div>
                        <div className={`kpi-value ${overview.netWorth?.netWorth < 0 ? 'negative' : ''}`}>{fmt(overview.netWorth?.netWorth)}</div>
                        <div className="kpi-sub">Total Assets − Liabilities</div>
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
                        <div className="kpi-sub">True investable amount</div>
                    </div>
                    <div className="kpi">
                        <div className="kpi-label">Credit Score</div>
                        <div className={`kpi-value ${!overview.creditScore ? 'dash' : ''}`}>{overview.creditScore || '-'}</div>
                        <div className="kpi-sub">CIBIL / Experian</div>
                    </div>
                </div>
            </div>

            {/* PORTFOLIO */}
            <div>
                <div className="act-label">Portfolio</div>
                <div className="section-heading">
                    Assets <Link to="/investments" className="arrow-link">↗</Link>
                </div>
                <div className="table-scroll-wrapper">
                    <table className="asset-table">
                        <thead><tr><th>Asset Class</th><th>Allocation</th></tr></thead>
                        <tbody>
                            {overview.investments.allocation && Object.entries(overview.investments.allocation).map(([k, v]) => (
                                <tr key={k}>
                                    <td>
                                        <span className="dot" style={{ background: ASSET_COLORS[k] || '#C4BFB8' }}></span>
                                        {k.replace(/([A-Z])/g, ' $1').trim().replace(/^\w/, c => c.toUpperCase())}
                                    </td>
                                    <td>{Math.round(v)}%</td>
                                </tr>
                            ))}
                            <tr>
                                <td><span className="dot" style={{ background: 'transparent' }}></span>All Investments</td>
                                <td>100%</td>
                            </tr>
                        </tbody>
                    </table>
                </div>
                <div className="how-calc">
                    <div className="how-calc-label">How this is calculated</div>
                    <ul>
                        <li>Asset allocation percentages are based on current market value of each asset class divided by your total portfolio value.</li>
                        <li>Equity includes direct stocks + equity mutual funds. Debt includes FDs, debt funds, EPF/PPF/NPS. Commodity = gold/commodities.</li>
                        <li>Ideal allocation depends on your age and risk profile - younger investors can hold more equity, older investors should shift towards debt.</li>
                    </ul>
                </div>
            </div>

            {/* ANALYSIS */}
            <div>
                <div className="act-label">Analysis</div>
                <div className="section-heading">Financial Analysis</div>
                <div className="tabs">
                    {['Emergency Planning', 'Expense and Liability Management', 'Asset Allocation'].map(tab => (
                        <button key={tab} className={`tab ${activeTab === tab ? 'active' : ''}`} onClick={() => setActiveTab(tab)}>
                            {tab}
                        </button>
                    ))}
                </div>

                <div className="analysis-grid">
                    {activeTab === 'Emergency Planning' && (
                        <>
                            {[
                                { label: 'Emergency Funds', act: overview.emergency.emergencyFunds.actual, idl: overview.emergency.emergencyFunds.ideal },
                                { label: 'Health Insurance', act: overview.emergency.healthInsurance.actual, idl: overview.emergency.healthInsurance.ideal },
                                { label: 'Life Insurance', act: overview.emergency.lifeInsurance.actual, idl: overview.emergency.lifeInsurance.ideal }
                            ].map(item => {
                                const onTrack = item.act >= item.idl;
                                return (
                                    <div key={item.label} className="analysis-item">
                                        <div className="analysis-item-header">
                                            <span className="analysis-item-title">{item.label}</span>
                                            <span className={`status-badge ${onTrack ? 'on' : 'off'}`}>{onTrack ? '✓ On track' : '✕ Off track'}</span>
                                        </div>
                                        <div className={`analysis-value ${onTrack ? 'ok' : ''}`}>{item.act > 0 ? fmt(item.act) : '₹0'}</div>
                                        <div className="analysis-ideal">Ideal: {item.idl > 0 ? fmt(item.idl) : '₹0'}</div>
                                    </div>
                                );
                            })}
                        </>
                    )}

                    {activeTab === 'Expense and Liability Management' && (
                        <>
                            {(liabilities.ratios || []).map(r => {
                                const onTrack = r.actual >= r.idealMin && (r.idealMax === undefined || r.actual <= r.idealMax);
                                return (
                                    <div key={r.name} className="analysis-item">
                                        <div className="analysis-item-header">
                                            <span className="analysis-item-title">{r.name}</span>
                                            <span className={`status-badge ${onTrack ? 'on' : 'off'}`}>{onTrack ? '✓ On track' : '✕ Off track'}</span>
                                        </div>
                                        <div className={`analysis-value ${onTrack ? 'ok' : ''}`}>{fmt(r.actual)}</div>
                                        <div className="analysis-ideal">
                                            Ideal: {r.idealMin === 0 ? `₹0 - ${fmt(r.idealMax)}` : r.idealMax === 0 ? fmt(r.idealMin) : `${fmt(r.idealMin)} - ${fmt(r.idealMax)}`}
                                        </div>
                                    </div>
                                );
                            })}
                        </>
                    )}

                    {activeTab === 'Asset Allocation' && (
                        <>
                            {(investments.allocationIdeals || []).map(r => {
                                let actual = 0;
                                if (r.name === 'Equity') actual = investments.assets.equity;
                                if (r.name === 'Real Estate') actual = investments.assets.realEstate;
                                if (r.name === 'Commodity') actual = investments.assets.commodity;
                                if (r.name === 'Debt') actual = investments.assets.debt;
                                if (r.name === 'Alternative Investments') actual = investments.assets.altInvestments;
                                const onTrack = actual >= r.min && actual <= r.max;
                                return (
                                    <div key={r.name} className="analysis-item">
                                        <div className="analysis-item-header">
                                            <span className="analysis-item-title">{r.name}</span>
                                            <span className={`status-badge ${onTrack ? 'on' : 'off'}`}>{onTrack ? '✓ On track' : '✕ Off track'}</span>
                                        </div>
                                        <div className={`analysis-value ${onTrack ? 'ok' : ''}`}>{actual > 0 ? fmt(actual) : '₹0'}</div>
                                        <div className="analysis-ideal">Ideal: {r.min === 0 ? `₹0 - ${fmt(r.max)}` : `${fmt(r.min)} - ${fmt(r.max)}`}</div>
                                    </div>
                                );
                            })}
                        </>
                    )}
                </div>
            </div>

            {/* CASHFLOW */}
            <div>
                <div className="act-label">Cashflow</div>
                <div className="section-heading">Next 3 Months Cashflow</div>
                <div className="info-box">
                    <div style={{ fontSize: '15px', marginTop: '1px', flexShrink: 0 }}>◎</div>
                    <div className="info-box-text">
                        <p>Why is my Surplus lower than I thought?</p>
                        <p>Most people mistakenly calculate surplus as <strong>Income − Monthly Expenses</strong>. But when an annual insurance premium or school fee comes due, they are forced to break their investments. We calculate your <strong>True Surplus</strong> by reserving a 12th of your annual obligations every month.</p>
                    </div>
                </div>
                <div className="table-scroll-wrapper">
                    <table className="cashflow-table">
                        <thead><tr><th>Particulars</th><th>Type</th><th>Amount</th></tr></thead>
                        <tbody>
                            {(overview.cashflow?.items || []).map((item, idx) => (
                                <tr key={idx}>
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
            </div>

            {/* INCOME & EXPENSES */}
            <div className="split-grid">
                <div>
                    <div className="split-header">
                        <span className="split-title">Income <Link to="/tax" className="arrow-link" style={{ fontSize: '12px' }}>↗</Link></span>
                        <span className="split-date">As of {currentDate}</span>
                    </div>
                    <div className="split-donut-row">
                        <div style={{ width: '80px', height: '80px' }}>
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie data={(overview.income?.breakdown || []).some(d => d.percent > 0) ? (overview.income?.breakdown || []) : [{ percent: 1 }]} dataKey="percent" innerRadius={28} outerRadius={40}>
                                        {((overview.income?.breakdown || []).some(d => d.percent > 0) ? (overview.income?.breakdown || []) : [{ percent: 1 }]).map((entry, i) => <Cell key={i} fill={(overview.income?.breakdown || []).some(d => d.percent > 0) ? (entry.percent > 0 ? INCOME_COLORS[i % INCOME_COLORS.length] : 'transparent') : '#C4BFB8'} stroke="none" />)}
                                    </Pie>
                                </PieChart>
                            </ResponsiveContainer>
                        </div>
                        <div className="split-legend">
                            {(overview.income?.breakdown || []).map((item, i) => (
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
                                {(overview.income?.breakdown || []).map((item, i) => (
                                    <tr key={item.type}>
                                        <td><span className="dot" style={{ background: INCOME_COLORS[i % INCOME_COLORS.length] }}></span>{item.type}</td>
                                        <td>{item.amount > 0 ? fmt(Math.round(item.amount / 12)) : '0'}</td>
                                        <td>{item.amount > 0 ? fmt(item.amount) : '0'}</td>
                                    </tr>
                                ))}
                                <tr>
                                    <td>Total</td>
                                    <td>{fmt(Math.round((overview.income?.breakdown || []).reduce((s, i) => s + (i.amount || 0), 0) / 12))}</td>
                                    <td>{fmt((overview.income?.breakdown || []).reduce((s, i) => s + (i.amount || 0), 0))}</td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                </div>

                <div>
                    <div className="split-header">
                        <span className="split-title">Expenses <Link to="/tax" className="arrow-link" style={{ fontSize: '12px' }}>↗</Link></span>
                        <span className="split-date">As of {currentDate}</span>
                    </div>
                    <div className="split-donut-row">
                        <div style={{ width: '80px', height: '80px' }}>
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie data={(overview.expenses?.breakdown || []).some(d => d.percent > 0) ? (overview.expenses?.breakdown || []) : [{ percent: 1 }]} dataKey="percent" innerRadius={28} outerRadius={40}>
                                        {((overview.expenses?.breakdown || []).some(d => d.percent > 0) ? (overview.expenses?.breakdown || []) : [{ percent: 1 }]).map((entry, i) => <Cell key={i} fill={(overview.expenses?.breakdown || []).some(d => d.percent > 0) ? (entry.percent > 0 ? EXPENSE_COLORS[i % EXPENSE_COLORS.length] : 'transparent') : '#C4BFB8'} stroke="none" />)}
                                    </Pie>
                                </PieChart>
                            </ResponsiveContainer>
                        </div>
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
                                {(overview.expenses?.monthlyBreakdown || overview.expenses?.breakdown || []).map((item, i) => (
                                    <tr key={item.type}>
                                        <td><span className="dot" style={{ background: EXPENSE_COLORS[i % EXPENSE_COLORS.length] }}></span>{item.type}</td>
                                        <td>{item.amount > 0 ? fmt(item.amount) : '0'}</td>
                                    </tr>
                                ))}
                                <tr>
                                    <td>Total</td>
                                    <td>{fmt((overview.expenses?.monthlyBreakdown || overview.expenses?.breakdown || []).reduce((s, i) => s + (i.amount || 0), 0))}</td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            {/* LIABILITIES & INSURANCE */}
            <div className="double-grid">
                <div>
                    <div className="split-header">
                        <span className="split-title">Liabilities <Link to="/liabilities" className="arrow-link" style={{ fontSize: '12px' }}>↗</Link></span>
                        <span className="split-date">As of {currentDate}</span>
                    </div>
                    <div className="split-donut-row">
                        <div style={{ width: '80px', height: '80px' }}>
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie data={overview.liabilities.total > 0 ? [{ name: 'Good', outstanding: overview.liabilities.goodLiability?.outstanding || 0 }, { name: 'Bad', outstanding: overview.liabilities.badLiability?.outstanding || 0 }].filter(d => d.outstanding > 0) : [{ outstanding: 1 }]} dataKey="outstanding" innerRadius={28} outerRadius={40}>
                                        {(overview.liabilities.total > 0 ? [{ name: 'Good', outstanding: overview.liabilities.goodLiability?.outstanding || 0 }, { name: 'Bad', outstanding: overview.liabilities.badLiability?.outstanding || 0 }].filter(d => d.outstanding > 0) : [{ outstanding: 1 }]).map((entry, i) => {
                                            const color = overview.liabilities.total === 0 ? '#C4BFB8' : (entry.name === 'Good' ? '#2D5A3D' : '#8B2626');
                                            return <Cell key={i} fill={color} stroke="none" />;
                                        })}
                                    </Pie>
                                </PieChart>
                            </ResponsiveContainer>
                        </div>
                        <div className="split-legend">
                            <div className="split-legend-item"><span className="legend-dot" style={{ background: '#2D5A3D' }}></span>Good Liabilities ({overview.liabilities.total > 0 ? Math.round((overview.liabilities.goodLiability?.outstanding || 0) / overview.liabilities.total * 100) : 0}%)</div>
                            <div className="split-legend-item"><span className="legend-dot" style={{ background: '#8B2626' }}></span>Bad Liabilities ({overview.liabilities.total > 0 ? Math.round((overview.liabilities.badLiability?.outstanding || 0) / overview.liabilities.total * 100) : 0}%)</div>
                        </div>
                    </div>
                    <div className="table-scroll-wrapper">
                        <table className="asset-table">
                            <thead><tr><th>Type</th><th>Outstanding</th></tr></thead>
                            <tbody>
                                <tr>
                                    <td><span className="dot" style={{ background: '#2D5A3D' }}></span>Good Liabilities</td>
                                    <td>{fmtFull(overview.liabilities.goodLiability?.outstanding || 0)}</td>
                                </tr>
                                <tr>
                                    <td><span className="dot" style={{ background: '#8B2626' }}></span>Bad Liabilities</td>
                                    <td>{fmtFull(overview.liabilities.badLiability?.outstanding || 0)}</td>
                                </tr>
                                <tr>
                                    <td>Total Liabilities</td>
                                    <td>{fmtFull(overview.liabilities.total)}</td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                </div>

                <div>
                    <div className="split-header">
                        <span className="split-title">Insurance <Link to="/insurance" className="arrow-link" style={{ fontSize: '12px' }}>↗</Link></span>
                        <span className="split-date">As of {currentDate}</span>
                    </div>
                    <div className="split-donut-row">
                        <div style={{ width: '80px', height: '80px' }}>
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie data={overview.insurance.healthPercent || overview.insurance.lifePercent ? [{ name: 'Life', percent: overview.insurance.lifePercent }, { name: 'Health', percent: overview.insurance.healthPercent }].filter(d => d.percent > 0) : [{ percent: 1 }]} dataKey="percent" innerRadius={28} outerRadius={40}>
                                        {(overview.insurance.healthPercent || overview.insurance.lifePercent ? [{ name: 'Life', percent: overview.insurance.lifePercent }, { name: 'Health', percent: overview.insurance.healthPercent }].filter(d => d.percent > 0) : [{ percent: 1 }]).map((_, i) => <Cell key={i} fill={overview.insurance.healthPercent || overview.insurance.lifePercent ? ['#1C1A17', '#C4703A'][i % 2] : '#C4BFB8'} stroke="none" />)}
                                    </Pie>
                                </PieChart>
                            </ResponsiveContainer>
                        </div>
                        <div className="split-legend">
                            <div className="split-legend-item"><span className="legend-dot" style={{ background: '#1C1A17' }}></span>Life Insurance ({overview.insurance.lifePercent || 0}%)</div>
                            <div className="split-legend-item"><span className="legend-dot" style={{ background: '#C4703A' }}></span>Health Insurance ({overview.insurance.healthPercent || 0}%)</div>
                        </div>
                    </div>
                    <div className="table-scroll-wrapper">
                        <table className="asset-table">
                            <thead><tr><th>Insurance Type</th><th>Cover</th><th>Annual Premium</th></tr></thead>
                            <tbody>
                                <tr>
                                    <td><span className="dot" style={{ background: '#1C1A17' }}></span>Life Insurance</td>
                                    <td>{overview.insurance.lifeCover > 0 ? fmt(overview.insurance.lifeCover) : '0'}</td>
                                    <td>{overview.insurance.lifePremium > 0 ? fmt(overview.insurance.lifePremium) : '0'}</td>
                                </tr>
                                <tr>
                                    <td><span className="dot" style={{ background: '#C4703A' }}></span>Health Insurance</td>
                                    <td>{overview.insurance.healthCover > 0 ? fmt(overview.insurance.healthCover) : '0'}</td>
                                    <td>{overview.insurance.healthPremium > 0 ? fmt(overview.insurance.healthPremium) : '0'}</td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
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
