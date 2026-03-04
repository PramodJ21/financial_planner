import React, { useEffect, useState } from 'react';
import { fetchWithAuth } from '../api';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip as RechartsTooltip } from 'recharts';
import { Link } from 'react-router-dom';
import { Landmark, AlertCircle } from 'lucide-react';

const SectionNote = ({ title, lines }) => (
    <div style={{ marginTop: '16px', padding: '14px 16px', backgroundColor: '#F8FAFC', borderRadius: '8px', border: '1px solid #E8ECF1' }}>
        <div style={{ fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', color: '#94A3B8', marginBottom: '8px', letterSpacing: '0.5px' }}>{title || 'How this is calculated'}</div>
        {lines.map((line, i) => (
            <div key={i} style={{ fontSize: '11px', color: '#64748B', lineHeight: 1.7, display: 'flex', gap: '6px', marginBottom: '3px' }}>
                <span style={{ color: '#94A3B8', flexShrink: 0 }}>•</span>
                <span>{line}</span>
            </div>
        ))}
    </div>
);

const fmt = (val) => {
    const n = Number(val) || 0;
    if (n >= 10000000) return '₹' + (n / 10000000).toFixed(1) + 'Cr';
    if (n >= 100000) return '₹' + (n / 100000).toFixed(1) + 'L';
    if (n >= 1000) return '₹' + (n / 1000).toFixed(1) + 'K';
    return '₹' + n.toLocaleString('en-IN');
};
const fmtFull = (val) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(val || 0);

const COLORS = ['#1E293B', '#64748B', '#94A3B8', '#CBD5E1'];

const StatusBadge = ({ actual, min, max }) => {
    const inRange = actual >= min && actual <= max;
    return (
        <span style={{
            fontSize: '11px', fontWeight: 600, padding: '3px 10px', borderRadius: '12px',
            backgroundColor: inRange ? '#ECFDF5' : '#FEF2F2',
            color: inRange ? '#059669' : '#DC2626'
        }}>
            {inRange ? 'On track' : 'Outside range'}
        </span>
    );
};

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
        { name: 'Good Liability', value: liab.goodLiability.outstanding },
        { name: 'Bad Liability', value: liab.badLiability.outstanding }
    ].filter(d => d.value > 0);

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            <div>
                <h1 style={{ fontSize: '20px', fontWeight: 700, color: '#1E293B', marginBottom: '4px' }}>Liabilities</h1>
                <p style={{ fontSize: '13px', color: '#64748B' }}>As of {new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
            </div>

            {/* ── Top: Chart + Table + Credit Score ── */}
            <div style={{ display: 'flex', gap: '16px' }}>
                {/* Chart + Table card */}
                <div className="card" style={{ flex: 1, padding: '24px' }}>
                    <div style={{ display: 'flex', gap: '40px', alignItems: 'flex-start' }}>
                        {/* Pie Chart */}
                        <div style={{ width: '200px', flexShrink: 0 }}>
                            {pieData.length > 0 ? (
                                <>
                                    <div style={{ height: '160px' }}>
                                        <ResponsiveContainer width="100%" height="100%">
                                            <PieChart>
                                                <Pie data={pieData} innerRadius={50} outerRadius={75} paddingAngle={2} dataKey="value">
                                                    {pieData.map((d, i) => (
                                                        <Cell key={i} fill={d.name === 'Good Liability' ? '#16A34A' : '#DC2626'} />
                                                    ))}
                                                </Pie>
                                                <RechartsTooltip formatter={(val) => fmtFull(val)} contentStyle={{ fontSize: '11px', padding: '4px 8px' }} />
                                            </PieChart>
                                        </ResponsiveContainer>
                                    </div>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginTop: '8px' }}>
                                        {pieData.map((d, i) => (
                                            <div key={d.name} style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '11px', color: '#64748B' }}>
                                                <div style={{ width: '8px', height: '8px', borderRadius: '2px', backgroundColor: d.name === 'Good Liability' ? '#16A34A' : '#DC2626' }}></div>
                                                {d.name} ({liab.total > 0 ? Math.round(d.value / liab.total * 100) : 0}%)
                                            </div>
                                        ))}
                                    </div>
                                </>
                            ) : (
                                <div style={{ height: '160px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                    <div style={{ textAlign: 'center', color: '#94A3B8' }}>
                                        <Landmark size={32} style={{ margin: '0 auto 8px', display: 'block' }} />
                                        <p style={{ fontSize: '12px' }}>No chart data for liability</p>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Liabilities Table */}
                        <div style={{ flex: 1, overflowX: 'auto' }}>
                            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                                <thead>
                                    <tr style={{ borderBottom: '1px solid #E8ECF1' }}>
                                        {['Liabilities', 'Category', 'Account Age in Months', 'Pending Months', 'Outstanding Balance', 'EMI', 'Interest Rate'].map(h => (
                                            <th key={h} style={{ padding: '10px 12px', fontSize: '11px', fontWeight: 600, color: '#64748B', textAlign: h === 'Liabilities' ? 'left' : 'right', textTransform: 'uppercase', letterSpacing: '0.3px', whiteSpace: 'nowrap' }}>{h}</th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody>
                                    {liab.hasLiabilities ? liab.items.map((item, idx) => (
                                        <tr key={idx} style={{ borderBottom: '1px solid #F1F5F9' }}>
                                            <td style={{ padding: '12px', fontSize: '13px', fontWeight: 500, color: '#1E293B' }}>{item.type}</td>
                                            <td style={{ padding: '12px', fontSize: '13px', textAlign: 'right', color: '#64748B' }}>{item.category}</td>
                                            <td style={{ padding: '12px', fontSize: '13px', textAlign: 'right', color: '#1E293B' }}>—</td>
                                            <td style={{ padding: '12px', fontSize: '13px', textAlign: 'right', color: '#1E293B' }}>{item.remainingTenure || '—'}</td>
                                            <td style={{ padding: '12px', fontSize: '13px', textAlign: 'right', fontWeight: 500, color: '#1E293B' }}>{fmt(item.outstanding)}</td>
                                            <td style={{ padding: '12px', fontSize: '13px', textAlign: 'right', color: '#1E293B' }}>{fmt(item.emi)}</td>
                                            <td style={{ padding: '12px', fontSize: '13px', textAlign: 'right', color: '#1E293B' }}>{item.interestRate}%</td>
                                        </tr>
                                    )) : (
                                        <tr>
                                            <td colSpan={7} style={{ padding: '40px', textAlign: 'center', color: '#94A3B8', fontSize: '13px' }}>No records for liabilities</td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>

                {/* Credit Score card */}
                <div className="card" style={{ width: '180px', padding: '20px', flexShrink: 0 }}>
                    <div style={{ fontSize: '12px', fontWeight: 600, color: '#64748B', marginBottom: '8px', textTransform: 'uppercase' }}>Credit Score</div>
                    <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px' }}>
                        <span style={{ fontSize: '28px', fontWeight: 700, color: '#1E293B' }}>{liab.creditScore || '—'}</span>
                        <span style={{ fontSize: '14px', color: '#94A3B8' }}>/900</span>
                    </div>
                    {liab.creditScore > 0 && (
                        <div style={{ marginTop: '12px', height: '6px', backgroundColor: '#F1F5F9', borderRadius: '3px', overflow: 'hidden' }}>
                            <div style={{ height: '100%', width: `${(liab.creditScore / 900) * 100}%`, backgroundColor: '#1E293B', borderRadius: '3px' }}></div>
                        </div>
                    )}
                </div>
            </div>

            {/* ── Liability Management ── */}
            <div className="card" style={{ padding: '24px' }}>
                <h2 style={{ fontSize: '16px', fontWeight: 700, color: '#1E293B', marginBottom: '20px' }}>Liability Management</h2>

                {/* Good Liability */}
                <div style={{ marginBottom: '24px' }}>
                    <h3 style={{ fontSize: '13px', fontWeight: 700, color: '#1E293B', textTransform: 'uppercase', marginBottom: '12px' }}>Good Liability</h3>
                    <div style={{ display: 'flex', gap: '16px' }}>
                        <div style={{ flex: 1, border: '1px solid #E8ECF1', borderRadius: '8px', padding: '16px', backgroundColor: '#FFFFFF' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                                <span style={{ fontSize: '11px', fontWeight: 600, color: '#1E293B', textTransform: 'uppercase' }}>Outstanding</span>
                                <StatusBadge actual={liab.goodLiability.outstanding} min={liab.idealRanges.goodOutstanding.min} max={liab.idealRanges.goodOutstanding.max} />
                            </div>
                            <div style={{ fontSize: '12px', color: '#94A3B8', marginBottom: '4px' }}>Actual Value</div>
                            <div style={{ fontSize: '20px', fontWeight: 700, color: liab.goodLiability.outstanding >= liab.idealRanges.goodOutstanding.min && liab.goodLiability.outstanding <= liab.idealRanges.goodOutstanding.max ? '#059669' : '#DC2626', marginBottom: '4px' }}>{fmtFull(liab.goodLiability.outstanding)}</div>
                            <div style={{ fontSize: '11px', color: '#94A3B8' }}>Ideal: {fmtFull(liab.idealRanges.goodOutstanding.min)} – {fmtFull(liab.idealRanges.goodOutstanding.max)}</div>
                        </div>
                        <div style={{ flex: 1, border: '1px solid #E8ECF1', borderRadius: '8px', padding: '16px', backgroundColor: '#FFFFFF' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                                <span style={{ fontSize: '11px', fontWeight: 600, color: '#1E293B', textTransform: 'uppercase' }}>EMI</span>
                                <StatusBadge actual={liab.goodLiability.emi} min={liab.idealRanges.goodEmi?.min || 0} max={liab.idealRanges.goodEmi?.max || 0} />
                            </div>
                            <div style={{ fontSize: '12px', color: '#94A3B8', marginBottom: '4px' }}>Actual Value</div>
                            <div style={{ fontSize: '20px', fontWeight: 700, color: liab.goodLiability.emi >= (liab.idealRanges.goodEmi?.min || 0) && liab.goodLiability.emi <= (liab.idealRanges.goodEmi?.max || 0) ? '#059669' : '#DC2626', marginBottom: '4px' }}>{fmtFull(liab.goodLiability.emi)}</div>
                            <div style={{ fontSize: '11px', color: '#94A3B8' }}>Ideal: {fmtFull(liab.idealRanges.goodEmi?.min || 0)} – {fmtFull(liab.idealRanges.goodEmi?.max || 0)}</div>
                        </div>
                    </div>
                </div>

                {/* Bad Liability */}
                <div style={{ marginBottom: '24px' }}>
                    <h3 style={{ fontSize: '13px', fontWeight: 700, color: '#1E293B', textTransform: 'uppercase', marginBottom: '12px' }}>Bad Liability</h3>
                    <div style={{ display: 'flex', gap: '16px' }}>
                        <div style={{ flex: 1, border: '1px solid #E8ECF1', borderRadius: '8px', padding: '16px', backgroundColor: '#FFFFFF' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                                <span style={{ fontSize: '11px', fontWeight: 600, color: '#1E293B', textTransform: 'uppercase' }}>Outstanding</span>
                                <StatusBadge actual={liab.badLiability.outstanding} min={liab.idealRanges.badOutstanding.min} max={liab.idealRanges.badOutstanding.max} />
                            </div>
                            <div style={{ fontSize: '12px', color: '#94A3B8', marginBottom: '4px' }}>Actual Value</div>
                            <div style={{ fontSize: '20px', fontWeight: 700, color: liab.badLiability.outstanding >= liab.idealRanges.badOutstanding.min && liab.badLiability.outstanding <= liab.idealRanges.badOutstanding.max ? '#059669' : '#DC2626', marginBottom: '4px' }}>{fmtFull(liab.badLiability.outstanding)}</div>
                            <div style={{ fontSize: '11px', color: '#94A3B8' }}>Ideal: {fmtFull(liab.idealRanges.badOutstanding.min)} – {fmtFull(liab.idealRanges.badOutstanding.max)}</div>
                        </div>
                        <div style={{ flex: 1, border: '1px solid #E8ECF1', borderRadius: '8px', padding: '16px', backgroundColor: '#FFFFFF' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                                <span style={{ fontSize: '11px', fontWeight: 600, color: '#1E293B', textTransform: 'uppercase' }}>EMI</span>
                                <StatusBadge actual={liab.badLiability.emi} min={liab.idealRanges.badEmi.min} max={liab.idealRanges.badEmi.max} />
                            </div>
                            <div style={{ fontSize: '12px', color: '#94A3B8', marginBottom: '4px' }}>Actual Value</div>
                            <div style={{ fontSize: '20px', fontWeight: 700, color: liab.badLiability.emi >= liab.idealRanges.badEmi.min && liab.badLiability.emi <= liab.idealRanges.badEmi.max ? '#059669' : '#DC2626', marginBottom: '4px' }}>{fmtFull(liab.badLiability.emi)}</div>
                            <div style={{ fontSize: '11px', color: '#94A3B8' }}>Ideal: {fmtFull(liab.idealRanges.badEmi.min)} – {fmtFull(liab.idealRanges.badEmi.max)}</div>
                        </div>
                    </div>
                </div>

                {/* Notes */}
                <div style={{ backgroundColor: '#F8FAFC', border: '1px solid #E8ECF1', borderRadius: '8px', padding: '16px' }}>
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', color: '#1E293B', fontSize: '13px' }}>
                        <AlertCircle size={16} style={{ flexShrink: 0, marginTop: '2px', color: '#64748B' }} />
                        <div>
                            <p style={{ fontWeight: 600, marginBottom: '4px' }}>Notes</p>
                            <ul style={{ margin: 0, paddingLeft: '16px', lineHeight: 1.6, color: '#64748B' }}>
                                <li>Your EMI burden ratio is {liab.emiBurdenRatio}% of gross monthly income.</li>
                                <li>Ideally, all EMIs combined shouldn't exceed 40% of gross monthly income.</li>
                            </ul>
                        </div>
                    </div>
                </div>
                <SectionNote title="Understanding Liability Management" lines={[
                    'Good Liabilities = Home Loans and Education Loans. These fund assets that grow in value (property) or increase earning capacity (education).',
                    'Bad Liabilities = Personal Loans, Car Loans, Gold Loans, and Credit Card outstanding. These fund depreciating assets or consumption.',
                    'Outstanding = Total remaining principal balance on the loan(s). Ideal good outstanding is 2–5x your annual income. Bad outstanding should ideally be zero or minimal.',
                    'EMI (Equated Monthly Installment) = The fixed monthly payment to repay a loan. EMI = P × r × (1+r)^n / [(1+r)^n – 1], where P = principal, r = monthly rate, n = months.',
                    'Good EMI ideal is 15–25% of gross monthly income (affordable asset-building). Bad EMI ideal is 0–10% of income (minimal consumptive burden).',
                    'EMI Burden Ratio = (Total of all EMIs ÷ Gross monthly salary) × 100. Banks consider 40% as the upper limit for loan eligibility.',
                    'Credit Score 750+ is excellent (lowest interest rates). 650–749 is fair. Below 650 may lead to loan rejections or high interest rates.'
                ]} />
            </div>

            {/* ── Financial Analysis – Expenses & Liability Ratios ── */}
            <div>
                <h2 style={{ fontSize: '16px', fontWeight: 700, color: '#1E293B', marginBottom: '16px' }}>Financial Analysis – Expenses & Liability Ratios</h2>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px' }}>
                    {ratios.map((r, i) => (
                        <div key={i} className="card" style={{ padding: '20px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                                <span style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', color: '#1E293B', letterSpacing: '0.3px' }}>{r.name}</span>
                                <StatusBadge actual={r.actual} min={r.idealMin} max={r.idealMax} />
                            </div>
                            <div style={{ fontSize: '12px', color: '#94A3B8', marginBottom: '4px' }}>Actual Value</div>
                            <div style={{ fontSize: '20px', fontWeight: 700, color: '#1E293B', marginBottom: '8px' }}>{fmt(r.actual)}</div>
                            <div style={{ fontSize: '12px', color: '#94A3B8' }}>Ideal: {fmt(r.idealMin)} – {fmt(r.idealMax)}</div>
                        </div>
                    ))}
                </div>
                <SectionNote title="Understanding Expense & Liability Ratios" lines={[
                    'Good Liabilities-to-Total Assets: Measures what % of your total assets is funded by wealth-building debt (home/education loans). Ideal: 20–50%. Higher means over-leveraged.',
                    'Bad Liabilities-to-Total Assets: Measures consumptive (non-productive) debt as a % of assets. Ideal: 0–2%. Higher indicates poor debt management.',
                    'Expense-to-Income: Total annual expenses ÷ Total annual income. Ideal: 40–60%. Below 40% is excellent. Above 70% leaves too little for savings.',
                    'Good Liability Linked EMI-to-Income: Monthly good-debt EMI as % of monthly income. Ideal: 15–25%. Ensures affordable asset building.',
                    'Bad Liability Linked EMI-to-Income: Monthly bad-debt EMI as % of income. Ideal: 0–5%. Should be minimized aggressively.',
                    'Investments-to-Income: Total investment portfolio value ÷ Annual income. Ideal: 3–8x. Higher indicates strong wealth accumulation over time.',
                    'All ideal ranges are personalized based on your age, life stage, income level, and declared risk comfort.'
                ]} />
            </div>

            {/* ── Credit Card Evaluation ── */}
            <div className="card" style={{ padding: '24px' }}>
                <h2 style={{ fontSize: '16px', fontWeight: 700, color: '#1E293B', marginBottom: '16px' }}>Credit Card Evaluation</h2>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                        <tr style={{ borderBottom: '1px solid #E8ECF1' }}>
                            {['Product', 'Card Details', 'Best suited for', 'Not suited for'].map(h => (
                                <th key={h} style={{ padding: '10px 12px', fontSize: '11px', fontWeight: 600, color: '#64748B', textAlign: 'left', textTransform: 'uppercase' }}>{h}</th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        <tr>
                            <td colSpan={4} style={{ padding: '40px 12px', textAlign: 'center', color: '#94A3B8', fontSize: '14px' }}>
                                No credit card data available. Add credit card details to see evaluation.
                            </td>
                        </tr>
                    </tbody>
                </table>
            </div>
        </div>
    );
}

export default Liabilities;
