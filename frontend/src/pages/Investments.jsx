import React, { useEffect, useState } from 'react';
import { fetchWithAuth } from '../api';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip as RechartsTooltip } from 'recharts';
import { Link } from 'react-router-dom';

const SectionNote = ({ title, lines }) => (
    <div style={{ marginTop: '16px', padding: '14px 16px', backgroundColor: '#F4F8FC', borderRadius: '8px', border: '1px solid #D6E0EB' }}>
        <div style={{ fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', color: '#8A9AA8', marginBottom: '8px', letterSpacing: '0.5px' }}>{title || 'How this is calculated'}</div>
        {lines.map((line, i) => (
            <div key={i} style={{ fontSize: '11px', color: '#5C6B7A', lineHeight: 1.7, display: 'flex', gap: '6px', marginBottom: '3px' }}>
                <span style={{ color: '#A8B0BA', flexShrink: 0 }}>•</span>
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

const COLORS = ['#1C1A17', '#C4703A', '#6B6760', '#C4BFB8', '#8B2626'];

const StatusBadge = ({ actual, min, max }) => {
    const inRange = actual >= min && actual <= max;
    return (
        <span className={`status-pill ${inRange ? 'on' : 'outside'}`}>
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

    const altTotal = (assets?.altInvestments || 0) + (assets?.realEstate || 0);
    const altPct = assets?.allocation ? parseFloat(((assets.allocation.altInvestments || 0) + (assets.allocation.realEstate || 0)).toFixed(2)) : 0;

    const pieData = [
        { name: 'Equity', value: assets?.equity, pct: assets?.allocation?.equity || 0 },
        { name: 'Commodity', value: assets?.commodity, pct: assets?.allocation?.commodity || 0 },
        { name: 'Debt', value: assets?.debt, pct: assets?.allocation?.debt || 0 },
        { name: 'Alternative Investments', value: altTotal, pct: altPct }
    ].filter(d => d.value > 0);

    const idealMap = {};
    allocationIdeals.forEach(a => { idealMap[a.name] = a; });

    const allocationCards = [
        { name: 'Equity', actual: assets.equity },
        { name: 'Commodity', actual: assets.commodity },
        { name: 'Debt', actual: assets.debt },
        { name: 'Alternative Investments', actual: altTotal }
    ];

    return (
        <div className="page-content">
            {/* PAGE HEADER */}
            <div className="page-header">
                <h1 className="page-title">Assets</h1>
            </div>

            {/* ASSET HOLDINGS */}
            <div>
                <div className="act-label">Portfolio</div>
                <h2 className="section-heading">Asset Holdings</h2>
                <div className="holdings-layout">

                    {/* DONUT */}
                    <div className="donut-wrap">
                        <div className="donut-canvas" style={{ width: '160px', height: '160px' }}>
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie data={pieData.length > 0 ? pieData : [{ name: 'None', value: 1 }]} innerRadius="70%" outerRadius="100%" paddingAngle={0} dataKey="value" stroke="none">
                                        {(pieData.length > 0 ? pieData : [{ name: 'None', value: 1 }]).map((_, i) => <Cell key={i} fill={pieData.length > 0 ? COLORS[i % COLORS.length] : '#C4BFB8'} />)}
                                    </Pie>
                                    <RechartsTooltip formatter={(val) => fmtFull(val)} contentStyle={{ fontSize: '11px', padding: '4px 8px' }} />
                                </PieChart>
                            </ResponsiveContainer>
                        </div>
                        <div className="donut-legend">
                            {(pieData || []).map((d, i) => (
                                <div key={d.name} className="legend-item">
                                    <span className="legend-dot" style={{ backgroundColor: COLORS[i % COLORS.length] }}></span>
                                    {d.name} ({d.pct}%)
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* TABLE */}
                    <table className="holdings-table">
                        <thead>
                            <tr>
                                {['Assets', '%', 'Asset Class', 'Growth (%)', 'Market Value'].map(h => (
                                    <th key={h} style={{ textAlign: h === 'Assets' ? 'left' : 'right' }}>{h}</th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {(assets.items || []).map((item, idx) => (
                                <tr key={idx}>
                                    <td><span className="asset-name">{item.name}</span></td>
                                    <td>{assets.total ? (item.value / assets.total * 100).toFixed(1) + '%' : '0%'}</td>
                                    <td><span className="asset-class-badge">{item.assetClass}</span></td>
                                    <td>{item.growth}%</td>
                                    <td>{fmt(item.value)}</td>
                                </tr>
                            ))}
                            <tr className="total-row">
                                <td colSpan={4}>Total</td>
                                <td>{fmt(assets.total)}</td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            </div>

            {/* FINANCIAL ANALYSIS */}
            <div>
                <div className="act-label">Analysis</div>
                <h2 className="section-heading">Financial Analysis - Asset Allocation</h2>

                <div className="analysis-grid">
                    {(allocationCards || []).map((card, i) => {
                        const ideal = idealMap[card.name] || { min: 0, max: 0 };
                        const inRange = card.actual >= ideal.min && card.actual <= ideal.max;
                        return (
                            <div key={card.name} className="analysis-item">
                                <div className="analysis-item-header">
                                    <span className="analysis-item-title">{card.name}</span>
                                    <span className={`status-pill ${inRange ? 'on' : 'outside'}`}>{inRange ? 'On track' : 'Outside range'}</span>
                                </div>
                                <div className="analysis-sub" style={{ fontSize: '11px', color: 'var(--ink-soft)', fontWeight: 300, marginBottom: '8px' }}>Actual Value</div>
                                <div className={`analysis-value ${inRange ? 'ok' : 'warn'}`}>{fmt(card.actual)}</div>
                                <div className="analysis-ideal">Ideal: {fmt(ideal.min)} – {fmt(ideal.max)}</div>
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* UNDERSTANDING */}
            <div className="understanding">
                <div className="understanding-title">Understanding Asset Allocation & Ideal Ranges</div>
                <div className="understanding-grid">
                    <div className="understanding-item">
                        <div className="understanding-item-title">How ideal ranges are calculated</div>
                        <div className="understanding-item-desc">Ideal allocation is based on your age, risk profile, and investment horizon. Equity % ≈ (100 − age), adjusted for your stated risk comfort. Ranges allow ±15% flexibility around the target.</div>
                    </div>
                    <div className="understanding-item">
                        <div className="understanding-item-title">Why Debt is outside range</div>
                        <div className="understanding-item-desc">Your Savings Account (₹60L) is classified as Debt. While liquid, it earns only 3.5% - far below inflation-adjusted returns. Consider shifting a portion to higher-yield instruments.</div>
                    </div>
                    <div className="understanding-item">
                        <div className="understanding-item-title">What Commodity exposure does</div>
                        <div className="understanding-item-desc">Gold and commodities act as a hedge against inflation and currency risk. A 5–15% allocation is typically recommended for moderate risk profiles to reduce portfolio volatility.</div>
                    </div>
                    <div className="understanding-item">
                        <div className="understanding-item-title">Alternative Investments</div>
                        <div className="understanding-item-desc">REITs, InvITs, P2P lending, and unlisted equities fall here. Currently at ₹0 - within ideal range. Worth exploring as portfolio grows beyond ₹2Cr for further diversification.</div>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default Investments;
