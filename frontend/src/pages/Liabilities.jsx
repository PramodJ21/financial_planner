import { useEffect, useState } from 'react';
import { fetchWithAuth } from '../api';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip as RechartsTooltip } from 'recharts';
import { Link } from 'react-router-dom';
import { Landmark } from 'lucide-react';
import { fmt, fmtFull } from '../utils/formatCurrency';

/* LI13: Color constants matching CSS variables */
const GOOD_COLOR = '#2D5A3D';
const BAD_COLOR = '#8B2626';

function Liabilities() {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchWithAuth('/dashboard/full').then(res => { setData(res); setLoading(false); }).catch(() => setLoading(false));
    }, []);

    /* LI5: Branded loading state */
    if (loading) return (
        <div className="page-loading">
            <div className="page-loading-box"><span>FH</span></div>
            <div className="page-loading-text">Loading your liabilities...</div>
        </div>
    );

    /* LI5: Branded empty state */
    if (!data) return (
        <div className="page-empty">
            <div className="page-empty-title">No liability data available</div>
            <Link to="/questionnaire" className="page-empty-link">Complete your questionnaire to get started</Link>
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
    const creditScoreBarWidth = liab.creditScore >= 300 ? ((liab.creditScore - 300) / 600) * 100 : 0;

    /* LI12: Dynamic understanding items using actual user data */
    const goodOutstanding = liab.goodLiability?.outstanding || 0;
    const badOutstanding = liab.badLiability?.outstanding || 0;

    return (
        <div className="page-content">

            {/* PAGE HEADER */}
            <div className="page-header">
                <div>
                    <h1 className="page-title">Liabilities</h1>
                </div>
                <div className="credit-score-box">
                    <div className="credit-score-label">Credit Score</div>
                    <div className="credit-score-value">
                        {liab.creditScore > 0 ? (
                            <span>{liab.creditScore}</span>
                        ) : (
                            <span style={{ fontFamily: "'Playfair Display',serif", fontSize: '32px', color: 'var(--ink-ghost)' }}>-</span>
                        )}
                        {/* LI14: show /900 only when score exists */}
                        {liab.creditScore > 0 && <span className="credit-score-denom">/900</span>}
                    </div>
                    <div className="credit-score-bar">
                        <div className="credit-score-fill" style={{ width: `${creditScoreBarWidth}%` }}></div>
                    </div>
                    <div className="credit-score-source">CIBIL / Experian</div>
                </div>
            </div>

            {/* LI11: NARRATIVE SECTION */}
            <div className="inv-narrative">
                <div className="inv-narrative-label">Liability Summary</div>
                <p className="inv-narrative-text">{narrative}</p>
            </div>

            {/* LIABILITIES TABLE & OVERVIEW */}
            <div>
                <div className="act-label">Overview</div>
                <div className="liab-layout">

                    {/* DONUT */}
                    <div className="donut-wrap">
                        <div className="donut-canvas">
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
                        <div className="donut-legend">
                            {pieData.map((d) => {
                                const percentage = liab.total > 0 ? Math.round(d.value / liab.total * 100) : 0;
                                return (
                                    <div key={d.name} className="legend-item">
                                        <span className="legend-dot" style={{ background: d.name === 'Good Liability' ? GOOD_COLOR : BAD_COLOR }}></span>
                                        {d.name} ({percentage}%)
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    {/* LI6: Removed "Account Age" column (always "-") | LI10: scroll wrapper for mobile */}
                    <div className="table-scroll-wrapper">
                        <table className="liab-table">
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
                                        <td><span className="asset-name">{item.type}</span></td>
                                        <td><span className={item.category === 'Good' ? 'cat-good' : 'cat-bad'}>{item.category}</span></td>
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
                <div className="act-label">Liability Management</div>

                {/* Good Liability */}
                <div className="mgmt-sublabel">Good Liability</div>
                <div className="analysis-grid two-col" style={{ marginBottom: '32px' }}>
                    <div className="analysis-item">
                        <div className="analysis-item-header">
                            <span className="analysis-item-title">Outstanding</span>
                            <span className={`status-pill ${goodOutTrack ? 'on' : 'outside'}`}>{goodOutTrack ? 'On track' : 'Outside range'}</span>
                        </div>
                        <div className="analysis-sub">Actual Value</div>
                        <div className={`analysis-value ${goodOutTrack ? 'ok' : 'warn'}`}>{fmt(liab.goodLiability.outstanding)}</div>
                        <div className="analysis-ideal">Ideal: {fmt(liab.idealRanges.goodOutstanding.min)} – {fmt(liab.idealRanges.goodOutstanding.max)}</div>
                    </div>
                    <div className="analysis-item">
                        <div className="analysis-item-header">
                            <span className="analysis-item-title">EMI</span>
                            <span className={`status-pill ${goodEmiTrack ? 'on' : 'outside'}`}>{goodEmiTrack ? 'On track' : 'Outside range'}</span>
                        </div>
                        <div className="analysis-sub">Actual Value</div>
                        <div className={`analysis-value ${goodEmiTrack ? 'ok' : 'warn'}`}>{fmt(liab.goodLiability.emi)}</div>
                        <div className="analysis-ideal">Ideal: {fmt(liab.idealRanges.goodEmi?.min || 0)} – {fmt(liab.idealRanges.goodEmi?.max || 0)}</div>
                    </div>
                </div>

                {/* Bad Liability */}
                <div className="mgmt-sublabel">Bad Liability</div>
                <div className="analysis-grid two-col">
                    <div className="analysis-item">
                        <div className="analysis-item-header">
                            <span className="analysis-item-title">Outstanding</span>
                            <span className={`status-pill ${badOutTrack ? 'on' : 'outside'}`}>{badOutTrack ? 'On track' : 'Outside range'}</span>
                        </div>
                        <div className="analysis-sub">Actual Value</div>
                        <div className={`analysis-value ${badOutTrack ? 'ok' : 'warn'}`}>{fmt(liab.badLiability.outstanding)}</div>
                        <div className="analysis-ideal">Ideal: {fmt(liab.idealRanges.badOutstanding.min)} – {fmt(liab.idealRanges.badOutstanding.max)}</div>
                    </div>
                    <div className="analysis-item">
                        <div className="analysis-item-header">
                            <span className="analysis-item-title">EMI</span>
                            <span className={`status-pill ${badEmiTrack ? 'on' : 'outside'}`}>{badEmiTrack ? 'On track' : 'Outside range'}</span>
                        </div>
                        <div className="analysis-sub">Actual Value</div>
                        <div className={`analysis-value ${badEmiTrack ? 'ok' : 'warn'}`}>{fmt(liab.badLiability.emi)}</div>
                        <div className="analysis-ideal">Ideal: {fmt(liab.idealRanges.badEmi.min)} – {fmt(liab.idealRanges.badEmi.max)}</div>
                    </div>
                </div>
            </div>

            {/* LI12: UNDERSTANDING — personalized with actual user values */}
            <div className="understanding">
                <div className="understanding-title">Understanding Liability Management</div>
                <ul className="understanding-list">
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
                <div className="act-label">Analysis</div>
                <h2 className="section-heading">Financial Analysis - Expenses & Liability Ratios</h2>
                <div className="analysis-grid">
                    {(ratios || []).map((r) => {
                        const inRange = r.actual >= r.idealMin && (r.idealMax === undefined || r.actual <= r.idealMax);
                        return (
                            <div key={r.name} className="analysis-item">
                                <div className="analysis-item-header">
                                    <span className="analysis-item-title">{r.name}</span>
                                    <span className={`status-pill ${inRange ? 'on' : 'outside'}`}>{inRange ? 'On track' : 'Outside range'}</span>
                                </div>
                                <div className="analysis-sub">Actual Value</div>
                                <div className={`analysis-value ${inRange ? 'ok' : 'warn'}`}>{fmt(r.actual)}</div>
                                <div className="analysis-ideal">Ideal: {r.idealMin === 0 && r.idealMax ? `₹0 - ${fmt(r.idealMax)}` : r.idealMax === undefined ? fmt(r.idealMin) : `${fmt(r.idealMin)} – ${fmt(r.idealMax)}`}</div>
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* UNDERSTANDING EXPENSE & LIABILITY RATIOS */}
            <div className="understanding">
                <div className="understanding-title">Understanding Expense & Liability Ratios</div>
                <ul className="understanding-list">
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
                <div className="act-label">Credit Card Evaluation</div>
                {creditCards.length > 1 && (
                    <p className="analysis-sub" style={{ marginBottom: '12px' }}>Aggregated across {creditCards.length} credit cards</p>
                )}
                <div className="cc-grid">
                    <div className="cc-item">
                        <div className="cc-label">Outstanding Balance</div>
                        <div className="cc-value" style={{ color: ccTotalOutstanding > 0 ? 'var(--red)' : 'var(--ink)' }}>{fmt(ccTotalOutstanding)}</div>
                        <div className="cc-sub">Total credit card dues</div>
                    </div>
                    <div className="cc-item">
                        <div className="cc-label">Monthly EMI</div>
                        <div className="cc-value">{fmt(ccTotalEmi)}</div>
                        <div className="cc-sub">Active EMI across all cards</div>
                    </div>
                    <div className="cc-item">
                        <div className="cc-label">Interest Rate</div>
                        <div className="cc-value">{ccAvgRate}%</div>
                        <div className="cc-sub">{creditCards.length > 1 ? 'Average effective rate' : 'Current effective rate'}</div>
                    </div>
                </div>
            </div>

            {/* LI15: CTA link to action plan */}
            <div className="inv-cta">
                <div>
                    <div className="inv-cta-title">Need help reducing debt?</div>
                    <div className="inv-cta-desc">Your personalised action plan includes specific steps to optimise your liabilities and improve your Financial Behaviour Score.</div>
                </div>
                <Link to="/reports" className="inv-cta-link">View Action Plan ↗</Link>
            </div>
        </div>
    );
}

export default Liabilities;
