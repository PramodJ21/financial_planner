import React, { useEffect, useState } from 'react';
import { fetchWithAuth } from '../api';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip as RechartsTooltip } from 'recharts';
import { Link } from 'react-router-dom';

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

const COLORS = ['#1E293B', '#3B82F6', '#F59E0B', '#10B981', '#8B5CF6', '#EF4444'];

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

function Investments() {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchWithAuth('/dashboard/full').then(res => { setData(res); setLoading(false); }).catch(() => setLoading(false));
    }, []);

    if (loading) return <div>Loading...</div>;
    if (!data) return <div>No data. <Link to="/questionnaire">Complete questionnaire</Link></div>;

    const { assets, allocationIdeals } = data.investments;

    const pieData = [
        { name: 'Equity', value: assets.equity, pct: assets.allocation.equity },
        { name: 'Real Estate', value: assets.realEstate, pct: assets.allocation.realEstate },
        { name: 'Commodity', value: assets.commodity, pct: assets.allocation.commodity },
        { name: 'Debt', value: assets.debt, pct: assets.allocation.debt },
        { name: 'Alternative Investments', value: assets.altInvestments, pct: assets.allocation.altInvestments }
    ].filter(d => d.value > 0);

    const idealMap = {};
    allocationIdeals.forEach(a => { idealMap[a.name] = a; });

    const allocationCards = [
        { name: 'Equity', actual: assets.equity },
        { name: 'Real Estate', actual: assets.realEstate },
        { name: 'Commodity', actual: assets.commodity },
        { name: 'Debt', actual: assets.debt },
        { name: 'Alternative Investments', actual: assets.altInvestments }
    ];

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            <div>
                <h1 style={{ fontSize: '20px', fontWeight: 700, color: '#1E293B', marginBottom: '4px' }}>Assets</h1>
                <p style={{ fontSize: '13px', color: '#64748B' }}>As of {new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
            </div>

            {/* Asset Holdings */}
            <div className="card" style={{ padding: '24px' }}>
                <h2 style={{ fontSize: '16px', fontWeight: 700, color: '#1E293B', marginBottom: '20px' }}>Asset Holdings</h2>
                <div style={{ display: 'flex', gap: '40px', alignItems: 'flex-start' }}>
                    <div style={{ width: '220px', flexShrink: 0 }}>
                        <div style={{ height: '180px' }}>
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie data={pieData.length > 0 ? pieData : [{ name: 'None', value: 1 }]} innerRadius={55} outerRadius={80} paddingAngle={2} dataKey="value">
                                        {(pieData.length > 0 ? pieData : [{ name: 'None', value: 1 }]).map((_, i) => <Cell key={i} fill={pieData.length > 0 ? COLORS[i % COLORS.length] : '#E8ECF1'} />)}
                                    </Pie>
                                    <RechartsTooltip formatter={(val) => fmtFull(val)} contentStyle={{ fontSize: '11px', padding: '4px 8px' }} />
                                </PieChart>
                            </ResponsiveContainer>
                        </div>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginTop: '8px' }}>
                            {pieData.map((d, i) => (
                                <div key={d.name} style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '11px', color: '#64748B' }}>
                                    <div style={{ width: '8px', height: '8px', borderRadius: '2px', backgroundColor: COLORS[i % COLORS.length] }}></div>
                                    {d.name} ({d.pct}%)
                                </div>
                            ))}
                        </div>
                    </div>

                    <div style={{ flex: 1, overflowX: 'auto' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                            <thead>
                                <tr style={{ borderBottom: '1px solid #E8ECF1' }}>
                                    {['Assets', '%', 'Asset Class', 'Growth (%)', 'Market Value', 'Monthly Investment'].map(h => (
                                        <th key={h} style={{ padding: '10px 12px', fontSize: '12px', fontWeight: 600, color: '#64748B', textAlign: h === 'Assets' ? 'left' : 'right', textTransform: 'uppercase', letterSpacing: '0.3px' }}>{h}</th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {assets.items.map((item, idx) => (
                                    <tr key={idx} style={{ borderBottom: '1px solid #F1F5F9' }}>
                                        <td style={{ padding: '12px', fontSize: '13px', fontWeight: 500, color: '#1E293B' }}>{item.name}</td>
                                        <td style={{ padding: '12px', fontSize: '13px', textAlign: 'right', color: '#1E293B' }}>{assets.total ? (item.value / assets.total * 100).toFixed(1) + '%' : '0%'}</td>
                                        <td style={{ padding: '12px', fontSize: '13px', textAlign: 'right', color: '#64748B' }}>{item.assetClass}</td>
                                        <td style={{ padding: '12px', fontSize: '13px', textAlign: 'right', color: '#1E293B' }}>{item.growth}%</td>
                                        <td style={{ padding: '12px', fontSize: '13px', textAlign: 'right', fontWeight: 500, color: '#1E293B' }}>{fmt(item.value)}</td>
                                        <td style={{ padding: '12px', fontSize: '13px', textAlign: 'right', color: '#1E293B' }}>{item.sip > 0 ? fmtFull(item.sip) : '—'}</td>
                                    </tr>
                                ))}
                                <tr style={{ borderTop: '2px solid #E8ECF1' }}>
                                    <td style={{ padding: '12px', fontSize: '13px', fontWeight: 700, color: '#1E293B' }} colSpan={4}>Total</td>
                                    <td style={{ padding: '12px', fontSize: '13px', textAlign: 'right', fontWeight: 700, color: '#1E293B' }}>{fmt(assets.total)}</td>
                                    <td style={{ padding: '12px', fontSize: '13px', textAlign: 'right', fontWeight: 700, color: '#1E293B' }}>{assets.monthlySip > 0 ? fmtFull(assets.monthlySip) : '₹0'}</td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            {/* Financial Analysis – Asset Allocation */}
            <div>
                <h2 style={{ fontSize: '16px', fontWeight: 700, color: '#1E293B', marginBottom: '16px' }}>Financial Analysis – Asset Allocation</h2>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '16px' }}>
                    {allocationCards.map(card => {
                        const ideal = idealMap[card.name] || { min: 0, max: 0 };
                        const inRange = card.actual >= ideal.min && card.actual <= ideal.max;
                        return (
                            <div key={card.name} className="card" style={{ padding: '20px' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                                    <span style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', color: '#1E293B', letterSpacing: '0.5px' }}>{card.name}</span>
                                    <StatusBadge actual={card.actual} min={ideal.min} max={ideal.max} />
                                </div>
                                <div style={{ fontSize: '12px', color: '#94A3B8', marginBottom: '4px' }}>Actual Value</div>
                                <div style={{ fontSize: '20px', fontWeight: 700, color: inRange ? '#059669' : '#DC2626', marginBottom: '8px' }}>{fmt(card.actual)}</div>
                                <div style={{ fontSize: '12px', color: '#94A3B8' }}>Ideal: {fmt(ideal.min)} – {fmt(ideal.max)}</div>
                            </div>
                        );
                    })}
                </div>
                <SectionNote title="Understanding Asset Allocation & Ideal Ranges" lines={[
                    'Equity (Stocks + Equity MFs): High growth, high risk. Ideal allocation ≈ (100 − your age)%. A 30-year-old should target ~70% equity.',
                    'Real Estate: Property value as an investment. Illiquid but inflation-beating. Ideal: 5–20% of portfolio depending on net worth.',
                    'Commodity (Gold/Silver): Acts as a hedge against inflation and market volatility. Ideal: 5–15% of total portfolio.',
                    'Debt (FDs, Bonds, PPF, EPF, NPS): Stable, lower returns, capital preservation. Ideal: roughly your age as a percentage (e.g., 30% at age 30).',
                    'Alternative Investments (Crypto, REITs, P2P): High risk, potentially high return. Ideal: 0–5% for most risk profiles.',
                    'On track = Your allocation is within the calculated ideal range for your age and risk profile. Outside range = Rebalancing recommended.',
                    'These ideal ranges are adjusted based on your stated risk comfort (1–10 scale) and investment experience from the questionnaire.'
                ]} />
            </div>

            {/* MF Holdings Evaluation */}
            <div className="card" style={{ padding: '24px' }}>
                <h2 style={{ fontSize: '16px', fontWeight: 700, color: '#1E293B', marginBottom: '4px' }}>MF Holdings Evaluation</h2>
                <p style={{ fontSize: '13px', color: '#64748B', marginBottom: '16px' }}>MF Portfolio Impact Analysis</p>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                        <tr style={{ borderBottom: '1px solid #E8ECF1' }}>
                            {['Scheme Name', 'Plan', 'Category', 'Scheme Type', 'Total Expense Ratio', 'Current Value', 'MF Score', 'Overlap'].map(h => (
                                <th key={h} style={{ padding: '10px 12px', fontSize: '11px', fontWeight: 600, color: '#64748B', textAlign: 'left', textTransform: 'uppercase' }}>{h}</th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {assets.mfValue > 0 ? (
                            <tr style={{ borderBottom: '1px solid #F1F5F9' }}>
                                <td style={{ padding: '12px', fontSize: '13px', fontWeight: 500, color: '#1E293B' }}>Equity Mutual Fund Portfolio</td>
                                <td style={{ padding: '12px', fontSize: '13px', color: '#1E293B' }}>Direct</td>
                                <td style={{ padding: '12px', fontSize: '13px', color: '#1E293B' }}>Equity</td>
                                <td style={{ padding: '12px', fontSize: '13px', color: '#1E293B' }}>Open Ended</td>
                                <td style={{ padding: '12px', fontSize: '13px', color: '#1E293B' }}>0.5%</td>
                                <td style={{ padding: '12px', fontSize: '13px', fontWeight: 500, color: '#1E293B' }}>{fmt(assets.mfValue)}</td>
                                <td style={{ padding: '12px', fontSize: '13px', color: '#1E293B' }}>—</td>
                                <td style={{ padding: '12px', fontSize: '13px', color: '#1E293B' }}>—</td>
                            </tr>
                        ) : (
                            <tr><td colSpan={8} style={{ padding: '40px', textAlign: 'center', color: '#94A3B8', fontSize: '14px' }}>No Mutual Funds</td></tr>
                        )}
                    </tbody>
                </table>
            </div>

            {/* Portfolio metrics */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px' }}>
                <div className="card" style={{ padding: '16px' }}>
                    <div style={{ fontSize: '12px', color: '#64748B', marginBottom: '4px', textTransform: 'uppercase', fontWeight: 600 }}>Portfolio Allocation</div>
                    {pieData.map((d, i) => (
                        <div key={d.name} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', marginTop: '6px' }}>
                            <span style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#1E293B' }}>
                                <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: COLORS[i] }}></span>
                                {d.name}
                            </span>
                            <span style={{ fontWeight: 500, color: '#1E293B' }}>{d.pct}%</span>
                        </div>
                    ))}
                </div>
                <div className="card" style={{ padding: '16px' }}>
                    <div style={{ fontSize: '12px', color: '#64748B', marginBottom: '4px', textTransform: 'uppercase', fontWeight: 600 }}>Mutual Funds</div>
                    <div style={{ fontSize: '20px', fontWeight: 700, color: '#1E293B' }}>{assets.numMutualFunds || '—'}</div>
                </div>
                <div className="card" style={{ padding: '16px' }}>
                    <div style={{ fontSize: '12px', color: '#64748B', marginBottom: '4px', textTransform: 'uppercase', fontWeight: 600 }}>MF Portfolio Value</div>
                    <div style={{ fontSize: '20px', fontWeight: 700, color: '#1E293B' }}>{assets.mfValue > 0 ? fmt(assets.mfValue) : '—'}</div>
                </div>
                <div className="card" style={{ padding: '16px' }}>
                    <div style={{ fontSize: '12px', color: '#64748B', marginBottom: '4px', textTransform: 'uppercase', fontWeight: 600 }}>Avg Portfolio Score</div>
                    <div style={{ fontSize: '20px', fontWeight: 700, color: '#1E293B' }}>—</div>
                </div>
            </div>
        </div>
    );
}

export default Investments;
