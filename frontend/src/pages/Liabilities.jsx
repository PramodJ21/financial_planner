import { useEffect, useState } from 'react';
import { fetchWithAuth } from '../api';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip as RechartsTooltip } from 'recharts';
import { Link } from 'react-router-dom';
import { Landmark } from 'lucide-react';
import '../styles/liabilities.css';
import { fmt, fmtFull } from '../utils/formatCurrency';

/* LI13: Color constants matching CSS variables */
const GOOD_COLOR = '#2D5A3D';
const BAD_COLOR = '#8B2626';

/* Comparison bar — for rupee values where % bars don't make sense.
   Track = idealMax. Fill = actual, capped at track width. */

function FlipCard({ name, statusPill, sub, value, ideal, explanation, action }) {
    const [flipped, setFlipped] = useState(false);
    const hasBack = explanation || action;
    return (
        <div
            className={`liabilities-analysis-item${flipped ? ' liabilities-flipped' : ''}`}
            onClick={() => hasBack && setFlipped(f => !f)}
        >
            <div className="liabilities-flip-inner">
                <div className="liabilities-flip-front">
                    <div className="liabilities-analysis-item-header">
                        <span className="liabilities-analysis-item-title">{name}</span>
                        {statusPill}
                    </div>
                    {sub && <div className="liabilities-analysis-sub">{sub}</div>}
                    {value}
                    {ideal && (
                        <div className="liabilities-ideal-row">
                            <span className="liabilities-ideal-label">Ideal</span>
                            <span className="liabilities-ideal-value">{ideal}</span>
                        </div>
                    )}
                    {hasBack && (
                        <div className="liabilities-flip-front-link">→ Flip for analytics</div>
                    )}
                </div>
                {hasBack && (
                    <div className="liabilities-flip-back">
                        <div className="liabilities-flip-back-title">{name}</div>
                        {explanation && <div className="liabilities-flip-back-explanation">{explanation}</div>}
                        {action && <div className="liabilities-flip-back-action">{action}</div>}
                        <div className="liabilities-flip-back-link">← Flip back</div>
                    </div>
                )}
            </div>
        </div>
    );
}

function Liabilities() {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchWithAuth('/dashboard/full').then(res => { setData(res); setLoading(false); }).catch(() => setLoading(false));
    }, []);

    /* LI5: Branded loading state */
    if (loading) return (
        <div className="liabilities-page-loading">
            <div className="liabilities-page-loading-box"><span>FH</span></div>
            <div className="liabilities-page-loading-text">Loading your liabilities...</div>
        </div>
    );

    /* LI5: Branded empty state */
    if (!data) return (
        <div className="liabilities-page-empty">
            <div className="liabilities-page-empty-title">No liability data available</div>
            <Link to="/questionnaire" className="liabilities-page-empty-link">Complete your questionnaire to get started</Link>
        </div>
    );

    const liab = data.liabilities;
    const { ratios } = liab;
    const income = data.overview?.income?.total ?? 0;

    /* Pie data for liability breakdown */
    const pieData = [
        { name: 'Good Liability', value: liab.goodLiability?.outstanding || 0 },
        { name: 'Bad Liability', value: liab.badLiability?.outstanding || 0 }
    ].filter(d => d.value > 0);

    /* LI1: Aggregate ALL credit cards, not just the first */
    const creditCards = liab.items?.filter((i) => i.type === 'Credit Card') || [];
    const ccTotalOutstanding = creditCards.reduce((sum, c) => sum + (c.outstanding || 0), 0);
    const ccTotalEmi = creditCards.reduce((sum, c) => sum + (c.emi || 0), 0);
    const ccAvgRate = creditCards.length > 0
        ? (creditCards.reduce((sum, c) => sum + (c.interestRate || 0), 0) / creditCards.length).toFixed(1)
        : '0';

    /* LI7: Extract liability management computations from JSX IIFEs */
    const goodOutTrack = liab.goodLiability.outstanding >= liab.idealRanges.goodOutstanding.min && liab.goodLiability.outstanding <= liab.idealRanges.goodOutstanding.max;
    const goodEmiTrack = liab.goodLiability.emi >= (liab.idealRanges.goodEmi?.min || 0) && liab.goodLiability.emi <= (liab.idealRanges.goodEmi?.max || 0);
    const badOutTrack = liab.badLiability.outstanding >= liab.idealRanges.badOutstanding.min && liab.badLiability.outstanding <= liab.idealRanges.badOutstanding.max;
    const badEmiTrack = liab.badLiability.emi >= liab.idealRanges.badEmi.min && liab.badLiability.emi <= liab.idealRanges.badEmi.max;

    /* LI11: Build narrative from actual data */
    const totalLiab = liab.total || 0;
    const goodPct = totalLiab > 0 ? Math.round((liab.goodLiability?.outstanding || 0) / totalLiab * 100) : 0;
    const badPct = totalLiab > 0 ? Math.round((liab.badLiability?.outstanding || 0) / totalLiab * 100) : 0;
    const totalEmi = (liab.goodLiability?.emi || 0) + (liab.badLiability?.emi || 0);
    const emiToIncomeRatio = income > 0 ? ((totalEmi * 12) / income * 100).toFixed(1) : 0;

    let narrative = '';
    if (!liab.hasLiabilities) {
        narrative = 'You currently have no liabilities on record. This is a strong position — zero debt means full financial flexibility.';
    } else {
        narrative = `Your total liabilities stand at ${fmt(totalLiab)}, split ${goodPct}% good and ${badPct}% bad. `;
        narrative += `Your combined EMI of ${fmt(totalEmi)}/month accounts for ${emiToIncomeRatio}% of your annual income. `;
        if (badPct > 30) {
            narrative += 'Consider prioritising repayment of bad liabilities — personal loans and credit card dues carry high interest and erode wealth.';
        } else if (Number(emiToIncomeRatio) > 40) {
            narrative += 'Your EMI-to-income ratio is high. Focus on reducing discretionary debt before taking on new obligations.';
        } else {
            narrative += 'Your debt structure looks manageable. Keep bad liabilities low and ensure EMIs stay within 30–40% of income.';
        }
    }

    /* LI14: Credit score bar — use 300-900 range instead of 0-900 */
    // creditScoreBarWidth removed — unused after UI refactor

    /* LI12: Dynamic understanding items using actual user data */
    const goodOutstanding = liab.goodLiability?.outstanding || 0;
    const badOutstanding = liab.badLiability?.outstanding || 0;

    return (
        <div className="liabilities-page-content">

            {/* PAGE HEADER */}
            <div className="liabilities-page-header">
                <div>
                    <div className="liabilities-page-super">Explore — Liabilities</div>
                    <h1 className="liabilities-page-title">Liabilities</h1>
                </div>
                {/* <div className="liabilities-credit-score-box">
                    <div className="liabilities-credit-score-label">Credit Score</div>
                    <div className="liabilities-credit-score-value">
                        {liab.creditScore > 0 ? (
                            <span>{liab.creditScore}</span>
                        ) : (
                            <span style={{ fontFamily: "var(--font-value)", fontSize: '32px', color: 'var(--ink-ghost)' }}>-</span>
                        )}
                        {liab.creditScore > 0 && <span className="liabilities-credit-score-denom">/900</span>}
                    </div>
                    <div className="liabilities-credit-score-bar">
                        <div className="liabilities-credit-score-fill" style={{ width: `${creditScoreBarWidth}%` }}></div>
                    </div>
                    <div className="liabilities-credit-score-source">CIBIL / Experian</div>
                </div> */}
            </div>

            {/* LI11: NARRATIVE SECTION */}
            <div className="liabilities-narrative">
                <div className="liabilities-narrative-label">Liability Summary</div>
                <p className="liabilities-narrative-text">{narrative}</p>
            </div>

            {/* LIABILITIES TABLE & OVERVIEW */}
            <div>
                <div className="liabilities-act-label">Overview</div>
                <div className="liabilities-layout">

                    {/* DONUT */}
                    <div className="liabilities-donut-wrap">
                        <div className="liabilities-donut-canvas">
                            {pieData.length > 0 ? (
                                <ResponsiveContainer width="100%" height="100%">
                                    <PieChart>
                                        <Pie data={pieData} innerRadius="70%" outerRadius="100%" paddingAngle={0} dataKey="value" stroke="none">
                                            {pieData.map((d, i) => (
                                                <Cell key={i} fill={d.name === 'Good Liability' ? GOOD_COLOR : BAD_COLOR} />
                                            ))}
                                        </Pie>
                                        <RechartsTooltip formatter={(val) => fmtFull(val)} contentStyle={{ fontSize: '11px', padding: '4px 8px' }} />
                                    </PieChart>
                                </ResponsiveContainer>
                            ) : (
                                <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                    <div style={{ textAlign: 'center', color: 'var(--ink-ghost)' }}>
                                        <Landmark size={32} style={{ margin: '0 auto 8px', display: 'block' }} />
                                        <p style={{ fontSize: '14px' }}>No liabilities</p>
                                    </div>
                                </div>
                            )}
                        </div>
                        <div className="liabilities-donut-legend">
                            {pieData.map((d) => {
                                const percentage = liab.total > 0 ? Math.round(d.value / liab.total * 100) : 0;
                                return (
                                    <div key={d.name} className="liabilities-legend-item">
                                        <span className="liabilities-legend-dot" style={{ background: d.name === 'Good Liability' ? GOOD_COLOR : BAD_COLOR }}></span>
                                        {d.name} ({percentage}%)
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    {/* LI6: Removed "Account Age" column (always "-") | LI10: scroll wrapper for mobile */}
                    <div className="liabilities-table-scroll-wrapper">
                        <table className="liabilities-table">
                            <thead>
                                <tr>
                                    <th>Liabilities</th>
                                    <th>Category</th>
                                    <th>Pending Months</th>
                                    <th>Outstanding</th>
                                    <th>EMI</th>
                                    <th>Interest Rate</th>
                                </tr>
                            </thead>
                            <tbody>
                                {liab.hasLiabilities ? (liab.items || []).map((item, idx) => (
                                    <tr key={idx}>
                                        <td><span className="liabilities-asset-name">{item.type}</span></td>
                                        <td><span className={item.category === 'Good' ? 'liabilities-cat-good' : 'liabilities-cat-bad'}>{item.category}</span></td>
                                        <td>{item.remainingTenure || '-'}</td>
                                        <td>{fmt(item.outstanding)}</td>
                                        <td>{fmt(item.emi)}</td>
                                        <td>{item.interestRate}%</td>
                                    </tr>
                                )) : (
                                    <tr>
                                        <td colSpan={6} style={{ padding: '40px 12px', textAlign: 'center', color: 'var(--ink-soft)', fontSize: '16px' }}>No liability records found</td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            {/* LI7: LIABILITY MANAGEMENT — IIFEs replaced with pre-computed variables */}
            <div>
                <div className="liabilities-act-label">Liability Management</div>

                {/* Good Liability */}
                <div className="liabilities-mgmt-sublabel">Good Liability</div>
                <div className="liabilities-analysis-grid liabilities-two-col" style={{ marginBottom: '32px' }}>
                    <FlipCard
                        name="Outstanding"
                        statusPill={<span className={`liabilities-status-pill ${goodOutTrack ? 'liabilities-on' : 'liabilities-outside'}`}>{goodOutTrack ? 'On track' : 'Outside range'}</span>}
                        sub="Actual Value"
                        value={<div className={`liabilities-analysis-value ${goodOutTrack ? 'liabilities-ok' : 'liabilities-warn'}`}>{fmt(liab.goodLiability.outstanding)}</div>}
                        ideal={`${fmt(liab.idealRanges.goodOutstanding.min)} – ${fmt(liab.idealRanges.goodOutstanding.max)}`}
                        explanation="Home loans and education loans are good liabilities — they fund appreciating assets or increased earning capacity. Ideal outstanding is 2–5× your annual income."
                        action={!goodOutTrack ? `Your good outstanding of ${fmt(liab.goodLiability.outstanding)} is outside the ideal range. Consider reviewing your repayment timeline.` : null}
                    />
                    <FlipCard
                        name="EMI"
                        statusPill={<span className={`liabilities-status-pill ${goodEmiTrack ? 'liabilities-on' : 'liabilities-outside'}`}>{goodEmiTrack ? 'On track' : 'Outside range'}</span>}
                        sub="Actual Value"
                        value={<div className={`liabilities-analysis-value ${goodEmiTrack ? 'liabilities-ok' : 'liabilities-warn'}`}>{fmt(liab.goodLiability.emi)}</div>}
                        ideal={`${fmt(liab.idealRanges.goodEmi?.min || 0)} – ${fmt(liab.idealRanges.goodEmi?.max || 0)}`}
                        explanation="Good EMI should be 15–25% of monthly income — affordable enough to sustain wealth building without straining cashflow."
                        action={!goodEmiTrack ? `Your good EMI of ${fmt(liab.goodLiability.emi)}/month is outside the ideal range. Consider refinancing or prepayment if cashflow allows.` : null}
                    />
                </div>

                {/* Bad Liability */}
                <div className="liabilities-mgmt-sublabel">Bad Liability</div>
                <div className="liabilities-analysis-grid liabilities-two-col">
                    <FlipCard
                        name="Outstanding"
                        statusPill={<span className={`liabilities-status-pill ${badOutTrack ? 'liabilities-on' : 'liabilities-outside'}`}>{badOutTrack ? 'On track' : 'Outside range'}</span>}
                        sub="Actual Value"
                        value={<div className={`liabilities-analysis-value ${badOutTrack ? 'liabilities-ok' : 'liabilities-warn'}`}>{fmt(liab.badLiability.outstanding)}</div>}
                        ideal={`${fmt(liab.idealRanges.badOutstanding.min)} – ${fmt(liab.idealRanges.badOutstanding.max)}`}
                        explanation="Personal loans, car loans, and credit card dues fund consumption or depreciating assets. These erode net worth and should ideally be zero."
                        action={!badOutTrack ? `Bad debt outstanding of ${fmt(liab.badLiability.outstanding)} is above ideal. Prioritise clearing these using any available surplus — highest interest first.` : null}
                    />
                    <FlipCard
                        name="EMI"
                        statusPill={<span className={`liabilities-status-pill ${badEmiTrack ? 'liabilities-on' : 'liabilities-outside'}`}>{badEmiTrack ? 'On track' : 'Outside range'}</span>}
                        sub="Actual Value"
                        value={<div className={`liabilities-analysis-value ${badEmiTrack ? 'liabilities-ok' : 'liabilities-warn'}`}>{fmt(liab.badLiability.emi)}</div>}
                        ideal={`${fmt(liab.idealRanges.badEmi.min)} – ${fmt(liab.idealRanges.badEmi.max)}`}
                        explanation="Bad debt EMI should ideally be 0–5% of monthly income. High bad EMI limits your investment capacity and increases financial fragility."
                        action={!badEmiTrack ? `Bad EMI of ${fmt(liab.badLiability.emi)}/month is above the ideal range. Aggressive repayment will free up cashflow for investing.` : null}
                    />
                </div>
            </div>

            {/* LI12: UNDERSTANDING — personalized with actual user values */}
            <div className="liabilities-understanding">
                <div className="liabilities-understanding-title">Understanding Liability Management</div>
                <ul className="liabilities-understanding-list">
                    <li>Good Liabilities = Home Loans and Education Loans. These fund assets that grow in value or increase earning capacity. {goodOutstanding > 0 ? `Your good liability outstanding is ${fmt(goodOutstanding)}.` : 'You currently have no good liabilities.'}</li>
                    <li>Bad Liabilities = Personal Loans, Car Loans, Gold Loans, and Credit Card outstanding. These fund depreciating assets or consumption. {badOutstanding > 0 ? `Your bad liability outstanding is ${fmt(badOutstanding)}.` : 'You have no bad liabilities — excellent.'}</li>
                    <li>Outstanding = Total remaining principal balance on the loan(s). Ideal good outstanding is 2–5x your annual income. Bad outstanding should ideally be zero or minimal.</li>
                    <li>EMI (Equated Monthly Installment) = The fixed monthly payment to repay a loan. EMI = P × r × (1+r)^n / [(1+r)^n − 1].</li>
                    <li>Good EMI ideal is 15–25% of gross monthly income (affordable asset-building). Bad EMI ideal is 0–10% of income.</li>
                    <li>Credit Score 750+ is excellent. 650–749 is fair. Below 650 may lead to loan rejections or high interest rates.{liab.creditScore > 0 ? ` Your score: ${liab.creditScore}.` : ''}</li>
                </ul>
            </div>

            {/* FINANCIAL ANALYSIS - EXPENSES & LIABILITY RATIOS */}
            <div>
                <div className="liabilities-act-label">Analysis</div>
                <h2 className="liabilities-section-heading">Financial Analysis - Expenses & Liability Ratios</h2>
                <div className="liabilities-analysis-grid">
                    {(ratios || []).map((r) => {
                        const inRange = r.actual >= r.idealMin && (r.idealMax === undefined || r.actual <= r.idealMax);
                        return (
                            <FlipCard
                                key={r.name}
                                name={r.name}
                                statusPill={<span className={`liabilities-status-pill ${inRange ? 'liabilities-on' : 'liabilities-outside'}`}>{inRange ? 'On track' : 'Outside range'}</span>}
                                sub="Actual Value"
                                value={<div className={`liabilities-analysis-value ${inRange ? 'liabilities-ok' : 'liabilities-warn'}`}>{fmt(r.actual)}</div>}
                                ideal={r.idealMax != null ? `${r.idealMin > 0 ? fmt(r.idealMin) + ' – ' : ''}${fmt(r.idealMax)}` : fmt(r.idealMin)}
                                explanation={r.description || null}
                                action={!inRange && r.action ? r.action : null}
                            />
                        );
                    })}
                </div>
            </div>

            {/* UNDERSTANDING EXPENSE & LIABILITY RATIOS */}
            <div className="liabilities-understanding">
                <div className="liabilities-understanding-title">Understanding Expense & Liability Ratios</div>
                <ul className="liabilities-understanding-list">
                    <li>Good Liabilities-to-Total Assets: Measures what % of your total assets is funded by wealth-building debt. Ideal: 20–50%. Higher means over-leveraged.</li>
                    <li>Bad Liabilities-to-Total Assets: Measures consumptive (non-productive) debt as a % of assets. Ideal: 0–2%. Higher indicates poor debt management.</li>
                    <li>Expense-to-Income: Total annual expenses ÷ Total annual income. Ideal: 40–60%. Below 40% is excellent. Above 70% leaves too little for savings.</li>
                    <li>Good Liability Linked EMI-to-Income: Monthly good-debt EMI as % of monthly income. Ideal: 15–25%. Ensures affordable asset building.</li>
                    <li>Bad Liability Linked EMI-to-Income: Monthly bad-debt EMI as % of income. Ideal: 0–5%. Should be minimised aggressively.</li>
                    <li>Investments-to-Income: Total investment portfolio value ÷ Annual income. Ideal: 3–8x. Higher indicates strong wealth accumulation.</li>
                    <li>All ideal ranges are personalised based on your age, life stage, income level, and declared risk comfort.</li>
                </ul>
            </div>

            {/* LI1: CREDIT CARD EVALUATION — aggregates ALL cards */}
            <div>
                <div className="liabilities-act-label">Credit Card Evaluation</div>
                {creditCards.length > 1 && (
                    <p className="liabilities-analysis-sub" style={{ marginBottom: '12px' }}>Aggregated across {creditCards.length} credit cards</p>
                )}
                <div className="liabilities-cc-grid">
                    <div className="liabilities-cc-item">
                        <div className="liabilities-cc-label">Outstanding Balance</div>
                        <div className="liabilities-cc-value" style={{ color: ccTotalOutstanding > 0 ? 'var(--red)' : 'var(--ink)' }}>{fmt(ccTotalOutstanding)}</div>
                        <div className="liabilities-cc-sub">Total credit card dues</div>
                    </div>
                    <div className="liabilities-cc-item">
                        <div className="liabilities-cc-label">Monthly EMI</div>
                        <div className="liabilities-cc-value">{fmt(ccTotalEmi)}</div>
                        <div className="liabilities-cc-sub">Active EMI across all cards</div>
                    </div>
                    <div className="liabilities-cc-item">
                        <div className="liabilities-cc-label">Interest Rate</div>
                        <div className="liabilities-cc-value">{ccAvgRate}%</div>
                        <div className="liabilities-cc-sub">{creditCards.length > 1 ? 'Average effective rate' : 'Current effective rate'}</div>
                    </div>
                </div>
            </div>

            {/* LI15: CTA link to action plan */}
            <div className="liabilities-cta">
                <div>
                    <div className="liabilities-cta-title">Need help reducing debt?</div>
                    <div className="liabilities-cta-desc">Your personalised action plan includes specific steps to optimise your liabilities and improve your Financial Behaviour Score.</div>
                </div>
                <Link to="/reports" className="liabilities-cta-link">View Action Plan ↗</Link>
            </div>
        </div>
    );
}

export default Liabilities;
