import React, { useEffect, useState } from 'react';
import { fetchWithAuth } from '../api';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip as RechartsTooltip } from 'recharts';
import { Link } from 'react-router-dom';
import { Landmark, AlertCircle } from 'lucide-react';
import Layout from '../components/Layout';

const fmt = (val) => {
    const n = Number(val) || 0;
    if (n >= 10000000) return '₹' + (n / 10000000).toFixed(1) + 'Cr';
    if (n >= 100000) return '₹' + (n / 100000).toFixed(1) + 'L';
    if (n >= 1000) return '₹' + (n / 1000).toFixed(1) + 'K';
    return '₹' + n.toLocaleString('en-IN');
};
const fmtFull = (val) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(val || 0);

function Liabilities() {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchWithAuth('/dashboard/full').then(res => { setData(res); setLoading(false); }).catch(() => setLoading(false));
    }, []);

    if (loading) return <div>Loading...</div>;
    if (!data) return <div>No data. <Link to="/questionnaire">Complete questionnaire</Link></div>;

    const liab = data.liabilities;
    const { ratios } = liab;

    // Pie data for liability breakdown
    const pieData = [
        { name: 'Good Liability', value: liab.goodLiability?.outstanding || 0 },
        { name: 'Bad Liability', value: liab.badLiability?.outstanding || 0 }
    ].filter(d => d.value > 0);

    return (
        <div className="page-content">

            {/* PAGE HEADER */}
            <div className="page-header">
                <div>
                    <div className="page-title">Liabilities</div>
                </div>
                <div className="credit-score-box">
                    <div className="credit-score-label">Credit Score</div>
                    <div className="credit-score-value">
                        {liab.creditScore > 0 ? (
                            <span style={{ color: 'var(--ink)' }}>{liab.creditScore}</span>
                        ) : (
                            <span style={{ fontFamily: "'Playfair Display',serif", fontSize: '32px', color: 'var(--ink-ghost)' }}>-</span>
                        )}
                        <span className="credit-score-denom">/900</span>
                    </div>
                    <div className="credit-score-bar">
                        <div className="credit-score-fill" style={{ width: `${liab.creditScore > 0 ? (liab.creditScore / 900) * 100 : 0}%` }}></div>
                    </div>
                    <div style={{ fontSize: '11px', color: 'var(--ink-ghost)', fontWeight: 300, marginTop: '5px' }}>CIBIL / Experian</div>
                </div>
            </div>

            {/* LIABILITIES TABLE & OVERVIEW */}
            <div>
                <div className="act-label">Overview</div>
                <div className="liab-layout">

                    {/* DONUT */}
                    <div className="donut-wrap">
                        <div style={{ width: '160px', height: '160px' }}>
                            {pieData.length > 0 ? (
                                <ResponsiveContainer width="100%" height="100%">
                                    <PieChart>
                                        <Pie data={pieData} innerRadius="70%" outerRadius="100%" paddingAngle={0} dataKey="value" stroke="none">
                                            {pieData.map((d, i) => (
                                                <Cell key={i} fill={d.name === 'Good Liability' ? '#2D5A3D' : '#8B2626'} />
                                            ))}
                                        </Pie>
                                        <RechartsTooltip formatter={(val) => fmtFull(val)} contentStyle={{ fontSize: '11px', padding: '4px 8px' }} />
                                    </PieChart>
                                </ResponsiveContainer>
                            ) : (
                                <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                    <div style={{ textAlign: 'center', color: 'var(--ink-ghost)' }}>
                                        <Landmark size={32} style={{ margin: '0 auto 8px', display: 'block' }} />
                                        <p style={{ fontSize: '12px' }}>No chart data</p>
                                    </div>
                                </div>
                            )}
                        </div>
                        <div className="donut-legend">
                            {(pieData || []).map((d) => {
                                const percentage = liab.total > 0 ? Math.round(d.value / liab.total * 100) : 0;
                                return (
                                    <div key={d.name} className="legend-item">
                                        <span className="legend-dot" style={{ background: d.name === 'Good Liability' ? '#2D5A3D' : '#8B2626' }}></span>
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
                                    <th>Liabilities</th>
                                    <th>Category</th>
                                    <th>Account Age (mo.)</th>
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
                                        <td>-</td>
                                        <td>{item.remainingTenure || '-'}</td>
                                        <td>{fmt(item.outstanding)}</td>
                                        <td>{fmt(item.emi)}</td>
                                        <td>{item.interestRate}%</td>
                                    </tr>
                                )) : (
                                    <tr>
                                        <td colSpan={7} style={{ padding: '40px 12px', textAlign: 'center', color: 'var(--ink-soft)' }}>No liability records found</td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            {/* LIABILITY MANAGEMENT */}
            <div>
                <div className="act-label">Liability Management</div>

                {/* Good Liability */}
                <div className="mgmt-sublabel">Good Liability</div>
                <div className="analysis-grid two-col" style={{ marginBottom: '32px' }}>
                    {(() => {
                        const outTrack = liab.goodLiability.outstanding >= liab.idealRanges.goodOutstanding.min && liab.goodLiability.outstanding <= liab.idealRanges.goodOutstanding.max;
                        const emiTrack = liab.goodLiability.emi >= (liab.idealRanges.goodEmi?.min || 0) && liab.goodLiability.emi <= (liab.idealRanges.goodEmi?.max || 0);
                        return (
                            <>
                                <div className="analysis-item">
                                    <div className="analysis-item-header">
                                        <span className="analysis-item-title">Outstanding</span>
                                        <span className={`status-pill ${outTrack ? 'on' : 'outside'}`}>{outTrack ? 'On track' : 'Outside range'}</span>
                                    </div>
                                    <div className="analysis-sub">Actual Value</div>
                                    <div className={`analysis-value ${outTrack ? 'ok' : 'warn'}`}>{fmt(liab.goodLiability.outstanding)}</div>
                                    <div className="analysis-ideal">Ideal: {fmt(liab.idealRanges.goodOutstanding.min)} – {fmt(liab.idealRanges.goodOutstanding.max)}</div>
                                </div>
                                <div className="analysis-item">
                                    <div className="analysis-item-header">
                                        <span className="analysis-item-title">EMI</span>
                                        <span className={`status-pill ${emiTrack ? 'on' : 'outside'}`}>{emiTrack ? 'On track' : 'Outside range'}</span>
                                    </div>
                                    <div className="analysis-sub">Actual Value</div>
                                    <div className={`analysis-value ${emiTrack ? 'ok' : 'warn'}`}>{fmt(liab.goodLiability.emi)}</div>
                                    <div className="analysis-ideal">Ideal: {fmt(liab.idealRanges.goodEmi?.min || 0)} – {fmt(liab.idealRanges.goodEmi?.max || 0)}</div>
                                </div>
                            </>
                        );
                    })()}
                </div>

                {/* Bad Liability */}
                <div className="mgmt-sublabel">Bad Liability</div>
                <div className="analysis-grid two-col">
                    {(() => {
                        const outTrack = liab.badLiability.outstanding >= liab.idealRanges.badOutstanding.min && liab.badLiability.outstanding <= liab.idealRanges.badOutstanding.max;
                        const emiTrack = liab.badLiability.emi >= liab.idealRanges.badEmi.min && liab.badLiability.emi <= liab.idealRanges.badEmi.max;
                        return (
                            <>
                                <div className="analysis-item">
                                    <div className="analysis-item-header">
                                        <span className="analysis-item-title">Outstanding</span>
                                        <span className={`status-pill ${outTrack ? 'on' : 'outside'}`}>{outTrack ? 'On track' : 'Outside range'}</span>
                                    </div>
                                    <div className="analysis-sub">Actual Value</div>
                                    <div className={`analysis-value ${outTrack ? 'ok' : 'warn'}`}>{fmt(liab.badLiability.outstanding)}</div>
                                    <div className="analysis-ideal">Ideal: {fmt(liab.idealRanges.badOutstanding.min)} – {fmt(liab.idealRanges.badOutstanding.max)}</div>
                                </div>
                                <div className="analysis-item">
                                    <div className="analysis-item-header">
                                        <span className="analysis-item-title">EMI</span>
                                        <span className={`status-pill ${emiTrack ? 'on' : 'outside'}`}>{emiTrack ? 'On track' : 'Outside range'}</span>
                                    </div>
                                    <div className="analysis-sub">Actual Value</div>
                                    <div className={`analysis-value ${emiTrack ? 'ok' : 'warn'}`}>{fmt(liab.badLiability.emi)}</div>
                                    <div className="analysis-ideal">Ideal: {fmt(liab.idealRanges.badEmi.min)} – {fmt(liab.idealRanges.badEmi.max)}</div>
                                </div>
                            </>
                        );
                    })()}
                </div>
            </div>

            {/* UNDERSTANDING LIABILITY MANAGEMENT */}
            <div className="understanding">
                <div className="understanding-title">Understanding Liability Management</div>
                <ul className="understanding-list">
                    <li>Good Liabilities = Home Loans and Education Loans. These fund assets that grow in value or increase earning capacity.</li>
                    <li>Bad Liabilities = Personal Loans, Car Loans, Gold Loans, and Credit Card outstanding. These fund depreciating assets or consumption.</li>
                    <li>Outstanding = Total remaining principal balance on the loan(s). Ideal good outstanding is 2–5x your annual income. Bad outstanding should ideally be zero or minimal.</li>
                    <li>EMI (Equated Monthly Installment) = The fixed monthly payment to repay a loan. EMI = P × r × (1+r)^n / [(1+r)^n − 1].</li>
                    <li>Good EMI ideal is 15–25% of gross monthly income (affordable asset-building). Bad EMI ideal is 0–10% of income.</li>
                    <li>Credit Score 750+ is excellent. 650–749 is fair. Below 650 may lead to loan rejections or high interest rates.</li>
                </ul>
            </div>

            {/* FINANCIAL ANALYSIS - EXPENSES & LIABILITY RATIOS */}
            <div>
                <div className="act-label">Analysis</div>
                <h2 className="section-heading">Financial Analysis - Expenses & Liability Ratios</h2>
                <div className="analysis-grid">
                    {(ratios || []).map((r, i) => {
                        const inRange = r.actual >= r.idealMin && (r.idealMax === undefined || r.actual <= r.idealMax);
                        return (
                            <div key={i} className="analysis-item">
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

            {/* CREDIT CARD EVALUATION */}
            <div>
                <div className="act-label">Credit Card Evaluation</div>
                <div className="cc-grid">
                    <div className="cc-item">
                        <div className="cc-label">Outstanding Balance</div>
                        <div className="cc-value" style={{ color: 'var(--red)' }}>{fmt(liab.items?.find((i) => i.type === 'Credit Card')?.outstanding || 0)}</div>
                        <div className="cc-sub">Credit Card dues</div>
                    </div>
                    <div className="cc-item">
                        <div className="cc-label">Monthly EMI</div>
                        <div className="cc-value">{fmt(liab.items?.find((i) => i.type === 'Credit Card')?.emi || 0)}</div>
                        <div className="cc-sub">Active EMI</div>
                    </div>
                    <div className="cc-item">
                        <div className="cc-label">Interest Rate</div>
                        <div className="cc-value">{liab.items?.find((i) => i.type === 'Credit Card')?.interestRate || '0'}%</div>
                        <div className="cc-sub">Current effective rate</div>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default Liabilities;
