import { useEffect, useState } from 'react';
import { fetchWithAuth } from '../api';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip as RechartsTooltip } from 'recharts';
import { Link } from 'react-router-dom';
import { ShieldAlert } from 'lucide-react';
import { fmt, fmtFull } from '../utils/formatCurrency';

/* IN5: Match Dashboard's Insurance donut colors */
const LIFE_COLOR = '#1C1A17';
const HEALTH_COLOR = '#C4703A';

function Insurance() {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchWithAuth('/dashboard/full').then(res => { setData(res); setLoading(false); }).catch(() => setLoading(false));
    }, []);

    /* IN7: Branded loading state */
    if (loading) return (
        <div className="page-loading">
            <div className="page-loading-box"><span>FH</span></div>
            <div className="page-loading-text">Loading your insurance data...</div>
        </div>
    );

    /* IN7: Branded empty state */
    if (!data) return (
        <div className="page-empty">
            <div className="page-empty-title">No insurance data available</div>
            <Link to="/questionnaire" className="page-empty-link">Complete your questionnaire to get started</Link>
        </div>
    );

    const ins = data.insurance;
    const emergency = ins.emergency || {};

    const pieData = [
        { name: 'Life Insurance', value: ins.lifeCover },
        { name: 'Health Insurance', value: ins.healthCover }
    ].filter(d => d.value > 0);

    const totalCover = pieData.reduce((acc, curr) => acc + curr.value, 0);

    /* IN8: Build narrative from actual data */
    const lifePctOfIdeal = ins.idealTermCover > 0 ? Math.round((ins.lifeCover / ins.idealTermCover) * 100) : 0;
    const healthPctOfIdeal = ins.idealHealth > 0 ? Math.round((ins.healthCover / ins.idealHealth) * 100) : 0;

    let narrative = '';
    if (totalCover === 0) {
        narrative = 'You currently have no insurance coverage on record. Insurance is a critical foundation — it protects your family and wealth from unexpected events.';
    } else {
        const parts = [];
        parts.push(`Your total insurance coverage is ${fmt(totalCover)}`);
        if (ins.lifeCover > 0) {
            parts.push(`life cover of ${fmt(ins.lifeCover)} (${lifePctOfIdeal}% of the ideal ${fmt(ins.idealTermCover)})`);
        }
        if (ins.healthCover > 0) {
            parts.push(`health cover of ${fmt(ins.healthCover)} (${healthPctOfIdeal}% of the ideal ${fmt(ins.idealHealth)})`);
        }
        narrative = parts[0] + ' — ' + parts.slice(1).join(' and ') + '. ';

        if (ins.additionalCoverNeeded > 0) {
            narrative += `You need an additional ${fmt(ins.additionalCoverNeeded)} in term life cover to meet the recommended 10x annual income benchmark.`;
        } else if (ins.isAdequatelyInsured) {
            narrative += 'Your insurance coverage meets the recommended benchmarks. Review annually as your income grows.';
        }
    }

    /* IN10: Pre-compute analysis items with range (80%-150% of ideal) */
    const analysisItems = [
        { label: 'Emergency Funds', actual: emergency.emergencyFunds?.actual || 0, ideal: emergency.emergencyFunds?.ideal || 0 },
        { label: 'Health Insurance', actual: emergency.healthInsurance?.actual || 0, ideal: emergency.healthInsurance?.ideal || 0 },
        { label: 'Life Insurance', actual: emergency.lifeInsurance?.actual || 0, ideal: emergency.lifeInsurance?.ideal || 0 }
    ].map(item => {
        const min = item.ideal * 0.8;
        const max = item.ideal * 1.5;
        const inRange = item.actual >= min && item.actual <= max;
        return { ...item, min, max, inRange };
    });

    return (
        <div className="page-content">

            {/* PAGE HEADER */}
            <div className="page-header">
                <h1 className="page-title">Insurance</h1>
            </div>

            {/* IN8: NARRATIVE SECTION */}
            <div className="inv-narrative">
                <div className="inv-narrative-label">Insurance Summary</div>
                <p className="inv-narrative-text">{narrative}</p>
            </div>

            {/* COVERAGE SUMMARY */}
            <div>
                <div className="act-label">Portfolio</div>
                <h2 className="section-heading">Coverage Summary</h2>
                <div className="liab-layout">

                    {/* IN5: DONUT — colors matching Dashboard */}
                    <div className="donut-wrap">
                        <div className="donut-canvas">
                            {pieData.length > 0 ? (
                                <ResponsiveContainer width="100%" height="100%">
                                    <PieChart>
                                        <Pie data={pieData} innerRadius="70%" outerRadius="100%" paddingAngle={0} dataKey="value" stroke="none">
                                            {pieData.map((d, i) => (
                                                <Cell key={i} fill={d.name === 'Life Insurance' ? LIFE_COLOR : HEALTH_COLOR} />
                                            ))}
                                        </Pie>
                                        <RechartsTooltip formatter={(val) => fmtFull(val)} contentStyle={{ fontSize: '11px', padding: '4px 8px' }} />
                                    </PieChart>
                                </ResponsiveContainer>
                            ) : (
                                <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                    <div style={{ textAlign: 'center', color: 'var(--ink-ghost)' }}>
                                        <ShieldAlert size={32} style={{ margin: '0 auto 8px', display: 'block' }} />
                                        <p style={{ fontSize: '14px' }}>No coverage</p>
                                    </div>
                                </div>
                            )}
                        </div>
                        <div className="donut-legend">
                            {pieData.map((d) => {
                                const percentage = totalCover > 0 ? Math.round(d.value / totalCover * 100) : 0;
                                return (
                                    <div key={d.name} className="legend-item">
                                        <span className="legend-dot" style={{ background: d.name === 'Life Insurance' ? LIFE_COLOR : HEALTH_COLOR }}></span>
                                        {d.name} ({percentage}%)
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    {/* TABLE */}
                    <div className="table-scroll-wrapper">
                        <table className="liab-table">
                            <thead>
                                <tr>
                                    <th>Insurance</th>
                                    <th>Cover Amount</th>
                                    <th>Premium (Annual)</th>
                                </tr>
                            </thead>
                            <tbody>
                                <tr>
                                    <td><span className="asset-name">Life Insurance</span></td>
                                    <td>{fmtFull(ins.lifeCover)}</td>
                                    <td>{fmtFull(ins.lifePremium)}</td>
                                </tr>
                                <tr>
                                    <td><span className="asset-name">Health Insurance</span></td>
                                    <td>{fmtFull(ins.healthCover)}</td>
                                    <td>{fmtFull(ins.healthPremium)}</td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            {/* FINANCIAL ANALYSIS – EMERGENCY PLANNING */}
            <div>
                <div className="act-label">Analysis</div>
                <h2 className="section-heading">Financial Analysis - Emergency Planning</h2>
                <div className="analysis-grid">
                    {analysisItems.map(item => (
                        <div key={item.label} className="analysis-item">
                            <div className="analysis-item-header">
                                <span className="analysis-item-title">{item.label}</span>
                                <span className={`status-pill ${item.inRange ? 'on' : 'outside'}`}>{item.inRange ? 'On track' : 'Outside range'}</span>
                            </div>
                            <div className="analysis-sub">Actual Value</div>
                            <div className={`analysis-value ${item.inRange ? 'ok' : 'warn'}`}>{fmt(item.actual)}</div>
                            {/* IN10: Show range instead of single ideal value */}
                            <div className="analysis-ideal">Ideal: {fmt(item.min)} – {fmt(item.max)}</div>
                        </div>
                    ))}
                </div>
            </div>

            {/* UNDERSTANDING INSURANCE & EMERGENCY PLANNING */}
            <div className="understanding">
                <div className="understanding-title">Understanding Insurance & Emergency Planning</div>
                <ul className="understanding-list">
                    <li>Emergency Fund ideal = 6 months of effective monthly expenses (monthly living costs + prorated annual obligations like insurance & school fees).{emergency.emergencyFunds?.actual > 0 ? ` You have ${fmt(emergency.emergencyFunds.actual)} saved.` : ''}</li>
                    <li>Health Insurance ideal = MAX(₹5L, 50% of annual gross income). Family size and city tier may warrant ₹10-25L+ cover.{ins.healthCover > 0 ? ` Your cover: ${fmt(ins.healthCover)}.` : ''}</li>
                    <li>Life Insurance ideal = 10× annual gross income as a pure Term Plan, applicable only if you have dependents (spouse, children, or elderly parents).{ins.lifeCover > 0 ? ` Your cover: ${fmt(ins.lifeCover)}.` : ''}</li>
                    <li>Term plans offer the best premium-to-cover ratio. Endowment/ULIP plans are generally not recommended for pure protection.</li>
                    <li>Status badge shows "On track" if your actual value is within 80%-150% of the ideal. Outside this range indicates a gap or over-allocation.</li>
                </ul>
            </div>

            {/* IN1: POLICY EVALUATION — removed 8 always-empty columns, keep only 4 with data */}
            <div>
                <div className="act-label">Policies</div>
                <h2 className="section-heading">Life Insurance Policy Evaluation</h2>
                <div className="table-scroll-wrapper" style={{ marginTop: '24px' }}>
                    <table className="liab-table">
                        <thead>
                            <tr>
                                <th>Policy Name</th>
                                <th>Plan Type</th>
                                <th>Sum Assured</th>
                                <th>Annual Premium</th>
                            </tr>
                        </thead>
                        <tbody>
                            {ins.lifeCover > 0 ? (
                                <tr>
                                    <td><span className="asset-name">Term Life Policy</span></td>
                                    <td><span className="cat-good">Term</span></td>
                                    <td>{fmtFull(ins.lifeCover)}</td>
                                    <td>{fmtFull(ins.lifePremium)}</td>
                                </tr>
                            ) : (
                                <tr>
                                    <td colSpan={4} style={{ padding: '40px 12px', textAlign: 'center', color: 'var(--ink-soft)', fontSize: '16px' }}>No policies to evaluate</td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* RECOMMENDATIONS */}
            <div>
                <div className="act-label">Recommendations</div>
                <h2 className="section-heading">Recommendation Summary</h2>
                <div className="table-scroll-wrapper" style={{ marginTop: '24px' }}>
                    <table className="liab-table">
                        <thead>
                            <tr>
                                <th>Insurance Type</th>
                                <th>Sum Assured</th>
                                <th>Premium</th>
                                <th>Term (yrs)</th>
                            </tr>
                        </thead>
                        <tbody>
                            {ins.additionalCoverNeeded > 0 && (
                                <tr>
                                    <td><span className="asset-name">Additional Cover Recommended</span></td>
                                    <td>{fmt(ins.additionalCoverNeeded)}</td>
                                    <td>-</td>
                                    <td>-</td>
                                </tr>
                            )}
                            <tr>
                                <td><span className="asset-name">Ideal term life cover: {fmt(ins.idealTermCover)}</span></td>
                                <td colSpan={3}></td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            </div>

            {/* IN9: IMPACT ALERT — CSS class instead of inline styles */}
            {ins.additionalCoverNeeded > 0 && (
                <div className="impact-alert">
                    <ShieldAlert size={20} color="var(--red)" />
                    <div className="impact-alert-body">
                        <strong>Impact on Premiums: </strong>
                        Plan your financial protection. Required: {fmt(ins.idealTermCover)}. Shortfall: {fmt(ins.additionalCoverNeeded)}.
                    </div>
                    <span className="impact-alert-amount">{fmt(ins.additionalCoverNeeded)}</span>
                </div>
            )}

            {/* CTA to action plan */}
            <div className="inv-cta">
                <div>
                    <div className="inv-cta-title">Take action on your insurance gaps</div>
                    <div className="inv-cta-desc">Your personalised action plan includes specific steps to improve your insurance coverage and protect your family.</div>
                </div>
                <Link to="/reports" className="inv-cta-link">View Action Plan ↗</Link>
            </div>
        </div>
    );
}

export default Insurance;
