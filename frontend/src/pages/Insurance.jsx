import React, { useEffect, useState } from 'react';
import { fetchWithAuth } from '../api';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip as RechartsTooltip } from 'recharts';
import { Link } from 'react-router-dom';
import { AlertTriangle, ShieldAlert } from 'lucide-react';

const fmt = (val) => {
    const n = Number(val) || 0;
    if (n >= 10000000) return '₹' + (n / 10000000).toFixed(1) + 'Cr';
    if (n >= 100000) return '₹' + (n / 100000).toFixed(1) + 'L';
    if (n >= 1000) return '₹' + (n / 1000).toFixed(1) + 'K';
    return '₹' + n.toLocaleString('en-IN');
};
const fmtFull = (val) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(val || 0);

const StatusBadge = ({ actual, min, max }) => {
    const inRange = actual >= min && actual <= max;
    return (
        <span style={{
            fontSize: '11px', fontWeight: 600, padding: '4px 10px', borderRadius: '4px',
            backgroundColor: inRange ? '#EAF5EF' : '#FBECEC',
            color: inRange ? '#1A7A50' : '#C04040'
        }}>
            {inRange ? 'On track' : 'Off track'}
        </span>
    );
};

function Insurance() {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchWithAuth('/dashboard/full').then(res => { setData(res); setLoading(false); }).catch(() => setLoading(false));
    }, []);

    if (loading) return <div>Loading...</div>;
    if (!data) return <div>No data. <Link to="/questionnaire">Complete questionnaire</Link></div>;

    const ins = data.insurance;
    const emergency = ins.emergency || {};
    const COLORS_INS = ['#4F79B7', '#111B2E'];

    const pieData = [
        { name: 'Life Insurance', value: ins.lifeCover },
        { name: 'Health Insurance', value: ins.healthCover }
    ].filter(d => d.value > 0);

    const totalCover = pieData.reduce((acc, curr) => acc + curr.value, 0);

    return (
        <div className="page-content">

            {/* PAGE HEADER */}
            <div className="page-header">
                <div>
                    <div className="page-title">Insurance</div>
                </div>
            </div>

            {/* COVERAGE SUMMARY */}
            <div>
                <div className="act-label">Portfolio</div>
                <h2 className="section-heading">Coverage Summary</h2>
                <div className="liab-layout">

                    {/* DONUT */}
                    <div className="donut-wrap">
                        <div style={{ width: '160px', height: '160px' }}>
                            {pieData.length > 0 ? (
                                <ResponsiveContainer width="100%" height="100%">
                                    <PieChart>
                                        <Pie data={pieData} innerRadius="70%" outerRadius="100%" paddingAngle={0} dataKey="value" stroke="none">
                                            {pieData.map((d, i) => (
                                                <Cell key={i} fill={d.name === 'Life Insurance' ? '#1C1917' : '#A8A29E'} />
                                            ))}
                                        </Pie>
                                        <RechartsTooltip formatter={(val) => fmtFull(val)} contentStyle={{ fontSize: '11px', padding: '4px 8px' }} />
                                    </PieChart>
                                </ResponsiveContainer>
                            ) : (
                                <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                    <div style={{ textAlign: 'center', color: 'var(--ink-ghost)' }}>
                                        <ShieldAlert size={32} style={{ margin: '0 auto 8px', display: 'block' }} />
                                        <p style={{ fontSize: '12px' }}>No coverage</p>
                                    </div>
                                </div>
                            )}
                        </div>
                        <div className="donut-legend">
                            {pieData.map((d) => {
                                const percentage = totalCover > 0 ? Math.round(d.value / totalCover * 100) : 0;
                                return (
                                    <div key={d.name} className="legend-item">
                                        <span className="legend-dot" style={{ background: d.name === 'Life Insurance' ? '#1C1917' : '#A8A29E' }}></span>
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
                    {[
                        { label: 'Emergency Funds', actual: emergency.emergencyFunds?.actual || 0, ideal: emergency.emergencyFunds?.ideal || 0 },
                        { label: 'Health Insurance', actual: emergency.healthInsurance?.actual || 0, ideal: emergency.healthInsurance?.ideal || 0 },
                        { label: 'Life Insurance', actual: emergency.lifeInsurance?.actual || 0, ideal: emergency.lifeInsurance?.ideal || 0 }
                    ].map(item => {
                        const min = item.ideal * 0.8;
                        const max = item.ideal * 1.5;
                        const inRange = item.actual >= min && item.actual <= max;
                        return (
                            <div key={item.label} className="analysis-item">
                                <div className="analysis-item-header">
                                    <span className="analysis-item-title">{item.label}</span>
                                    <span className={`status-pill ${inRange ? 'on' : 'outside'}`}>{inRange ? 'On track' : 'Outside range'}</span>
                                </div>
                                <div className="analysis-sub">Actual Value</div>
                                <div className={`analysis-value ${inRange ? 'ok' : 'warn'}`}>{fmt(item.actual)}</div>
                                <div className="analysis-ideal">Ideal: {fmt(item.ideal)}</div>
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* UNDERSTANDING INSURANCE & EMERGENCY PLANNING */}
            <div className="understanding">
                <div className="understanding-title">Understanding Insurance & Emergency Planning</div>
                <ul className="understanding-list">
                    <li>Emergency Fund ideal = 6 months of effective monthly expenses (monthly living costs + prorated annual obligations like insurance & school fees).</li>
                    <li>Health Insurance ideal = MAX(₹5L, 50% of annual gross income). Family size and city tier may warrant ₹10-25L+ cover.</li>
                    <li>Life Insurance ideal = 10× annual gross income as a pure Term Plan, applicable only if you have dependents (spouse, children, or elderly parents).</li>
                    <li>Term plans offer the best premium-to-cover ratio. Endowment/ULIP plans are generally not recommended for pure protection.</li>
                    <li>Status badge shows "On track" if your actual value is within 80%-150% of the ideal. Outside this range indicates a gap or over-allocation.</li>
                </ul>
            </div>

            {/* ADDITIONAL POLICIES SECTION (Styled to match the new system) */}
            <div>
                <div className="act-label">Policies</div>
                <h2 className="section-heading">Life Insurance Policy Evaluation</h2>
                <div className="table-scroll-wrapper" style={{ marginTop: '24px' }}>
                    <table className="liab-table">
                        <thead>
                            <tr>
                                {['Policy Name', 'Plan Type', 'Sum Assured', 'Policy Before', 'Annual Premium', 'Life Cover', 'Accident Cover', 'Premium Paid Till Date', 'Premium Expense', 'Suggested Action', 'Surrender Value'].map(h => (
                                    <th key={h} style={{ whiteSpace: 'nowrap' }}>{h}</th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {ins.lifeCover > 0 ? (
                                <tr>
                                    <td><span className="asset-name">Term Life Policy</span></td>
                                    <td><span className="cat-good">Term</span></td>
                                    <td>{fmtFull(ins.lifeCover)}</td>
                                    <td>-</td>
                                    <td>{fmtFull(ins.lifePremium)}</td>
                                    <td>{fmtFull(ins.lifeCover)}</td>
                                    <td>-</td>
                                    <td>-</td>
                                    <td>-</td>
                                    <td>-</td>
                                    <td>-</td>
                                </tr>
                            ) : (
                                <tr>
                                    <td colSpan={11} style={{ padding: '40px 12px', textAlign: 'center', color: 'var(--ink-soft)' }}>No policies to evaluate</td>
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
                                {['Traditional / Life Insurance', 'Sum Assured', 'Premium', 'Term (yrs)', 'Plan Document'].map(h => (
                                    <th key={h}>{h}</th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {ins.additionalCoverNeeded > 0 && (
                                <tr>
                                    <td><span className="asset-name">Additional Cover Recommended</span></td>
                                    <td>{fmt(ins.additionalCoverNeeded)}</td>
                                    <td>-</td>
                                    <td>-</td>
                                    <td>-</td>
                                </tr>
                            )}
                            <tr>
                                <td><span className="asset-name">Ideal term life cover: {fmt(ins.idealTermCover)}</span></td>
                                <td colSpan={4}></td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            </div>

            {/* IMPACT ALERTS */}
            {ins.additionalCoverNeeded > 0 && (
                <div style={{ backgroundColor: '#FBECEC', border: '0.5px solid #C04040', borderRadius: '4px', padding: '16px', display: 'flex', alignItems: 'center', gap: '12px', marginTop: '16px' }}>
                    <ShieldAlert size={20} color="#C04040" />
                    <div style={{ flex: 1 }}>
                        <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--ink)' }}>Impact on Premiums: </span>
                        <span style={{ fontSize: '13px', color: 'var(--ink-soft)' }}>Plan your financial protection. Required: {fmt(ins.idealTermCover)}. Shortfall: {fmt(ins.additionalCoverNeeded)}.</span>
                    </div>
                    <span style={{ fontSize: '15px', fontWeight: 700, color: '#C04040' }}>{fmt(ins.additionalCoverNeeded)}</span>
                </div>
            )}
        </div>
    );
}

export default Insurance;
