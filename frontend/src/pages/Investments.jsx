import { useEffect, useState } from 'react';
import { fetchWithAuth } from '../api';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip as RechartsTooltip } from 'recharts';
import { Link } from 'react-router-dom';
import {
    getInvestmentNarrative, getGrowthStatus, getIdealRanges,
    getAssetStatus, getAssetExplanation, getAssetAction,
    INFLATION_RATE
} from '../utils/financialInsights';
import { fmt, fmtFull } from '../utils/formatCurrency';

/* I1: SectionNote with warm palette (was cold blue-gray) */
const SectionNote = ({ title, lines }) => (
    <div className="section-note">
        <div className="section-note-heading">{title || 'How this is calculated'}</div>
        {lines.map((line, i) => (
            <div key={i} className="section-note-line">
                <span className="bullet">•</span>
                <span>{line}</span>
            </div>
        ))}
    </div>
);

const COLORS = ['#1C1A17', '#C4703A', '#6B6760', '#C4BFB8', '#8B2626'];

function Investments() {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchWithAuth('/dashboard/full').then(res => { setData(res); setLoading(false); }).catch(() => setLoading(false));
    }, []);

    /* I11: Branded loading state */
    if (loading) return (
        <div className="page-loading">
            <div className="page-loading-box"><span>FH</span></div>
            <div className="page-loading-text">Loading your investments...</div>
        </div>
    );

    /* I11: Branded empty state */
    if (!data) return (
        <div className="page-empty">
            <div className="page-empty-title">No investment data available</div>
            <Link to="/questionnaire" className="page-empty-link">Complete your questionnaire to get started</Link>
        </div>
    );

    const { assets, allocationIdeals } = data.investments;
    const userAge = data.overview?.profile?.age ?? 30;
    const idealRanges = getIdealRanges(userAge);

    const altTotal = (assets?.altInvestments || 0) + (assets?.realEstate || 0);
    const altPct = assets?.allocation ? parseFloat(((assets.allocation.altInvestments || 0) + (assets.allocation.realEstate || 0)).toFixed(2)) : 0;

    const pctMap = {
        'Equity':                  assets.allocation?.equity     ?? 0,
        'Commodity':               assets.allocation?.commodity  ?? 0,
        'Debt':                    assets.allocation?.debt       ?? 0,
        'Alternative Investments': altPct,
    };
    const nameToKey = { 'Equity': 'equity', 'Commodity': 'commodity', 'Debt': 'debt', 'Alternative Investments': 'alt' };

    const investmentNarrative = getInvestmentNarrative(userAge, assets.allocation, assets.items, fmt);
    const monthlySurplus = data.overview?.surplus?.monthly ?? 0;

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

    /* I6: Build dynamic understanding items from actual user data */
    const debtItem = assets.items?.find(i => i.assetClass === 'Debt' && i.value > 0);
    const altValue = altTotal;
    const understandingItems = [
        {
            title: 'How ideal ranges are calculated',
            desc: `Ideal allocation is based on your age (${userAge}), risk profile, and investment horizon. Equity % ≈ (100 − age), adjusted for your stated risk comfort. Ranges allow ±15% flexibility around the target.`
        },
        debtItem ? {
            title: 'Why Debt may be outside range',
            desc: `Your ${debtItem.name} (${fmt(debtItem.value)}) is classified as Debt. While liquid, it earns only ${debtItem.growth ?? 3.5}% — ${(debtItem.growth ?? 3.5) < INFLATION_RATE ? 'below' : 'near'} inflation-adjusted returns. Consider shifting a portion to higher-yield instruments.`
        } : {
            title: 'Debt allocation',
            desc: 'Debt instruments include savings accounts, FDs, PPF, and debt mutual funds. A balanced debt allocation provides stability and liquidity to your portfolio.'
        },
        {
            title: 'What Commodity exposure does',
            desc: 'Gold and commodities act as a hedge against inflation and currency risk. A 5–15% allocation is typically recommended for moderate risk profiles to reduce portfolio volatility.'
        },
        {
            title: 'Alternative Investments',
            desc: altValue > 0
                ? `REITs, InvITs, P2P lending, and unlisted equities fall here. Currently at ${fmt(altValue)}. Worth exploring further as your portfolio grows for additional diversification.`
                : 'REITs, InvITs, P2P lending, and unlisted equities fall here. Currently at ₹0 — within ideal range. Worth exploring as your portfolio grows beyond ₹2Cr for further diversification.'
        }
    ];

    return (
        <div className="page-content">
            {/* PAGE HEADER */}
            <div className="page-header">
                <h1 className="page-title">Assets</h1>
            </div>

            {/* I13: INVESTMENT NARRATIVE — uses CSS class instead of inline styles */}
            <div className="inv-narrative">
                <div className="inv-narrative-label">Investment Summary</div>
                <p className="inv-narrative-text">{investmentNarrative}</p>
            </div>

            {/* ASSET HOLDINGS */}
            <div>
                <div className="act-label">Portfolio</div>
                <h2 className="section-heading">Asset Holdings</h2>
                <div className="holdings-layout">

                    {/* DONUT */}
                    <div className="donut-wrap">
                        <div className="donut-canvas">
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
                            {pieData.map((d, i) => (
                                <div key={d.name} className="legend-item">
                                    <span className="legend-dot" style={{ backgroundColor: COLORS[i % COLORS.length] }}></span>
                                    {d.name} ({d.pct}%)
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* TABLE */}
                    <div style={{ overflowX: 'auto' }}>
                        <table className="holdings-table">
                            <thead>
                                <tr>
                                    {['Assets', '%', 'Asset Class', 'Growth (%)', 'Market Value'].map(h => (
                                        <th key={h} style={{ textAlign: h === 'Assets' ? 'left' : 'right' }}>{h}</th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {(assets.items || []).map((item, idx) => {
                                    const growthStatus = getGrowthStatus(item.growth ?? 0);
                                    const growthClass = growthStatus === 'above_inflation' ? 'above' : growthStatus === 'near_inflation' ? 'near' : 'below';
                                    return (
                                        <tr key={idx}>
                                            <td><span className="asset-name">{item.name}</span></td>
                                            <td>{assets.total ? (item.value / assets.total * 100).toFixed(1) + '%' : '0%'}</td>
                                            <td><span className="asset-class-badge">{item.assetClass}</span></td>
                                            <td>
                                                {/* I9: growth colors via CSS classes */}
                                                <span className={`growth-text ${growthClass}`}>{item.growth}%</span>
                                                {/* I10: below inflation badge via CSS class */}
                                                {growthStatus === 'below_inflation' && (
                                                    <span className="growth-badge">below inflation</span>
                                                )}
                                            </td>
                                            <td>{fmt(item.value)}</td>
                                        </tr>
                                    );
                                })}
                                <tr className="total-row">
                                    <td colSpan={4}>Total</td>
                                    <td>{fmt(assets.total)}</td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            {/* FINANCIAL ANALYSIS */}
            <div>
                <div className="act-label">Analysis</div>
                <h2 className="section-heading">Financial Analysis - Asset Allocation</h2>

                <div className="analysis-grid">
                    {allocationCards.map((card) => {
                        const ideal = idealMap[card.name] || { min: 0, max: 0 };
                        const inRange = card.actual >= ideal.min && card.actual <= ideal.max;
                        const assetKey = nameToKey[card.name];
                        const currentPct = pctMap[card.name] ?? 0;
                        const [rangeMin, rangeMax] = idealRanges[assetKey] ?? [0, 100];
                        const { status, gap } = getAssetStatus(assetKey, currentPct, userAge);
                        const explanation = getAssetExplanation(assetKey, status);
                        const action = getAssetAction(assetKey, status, gap, monthlySurplus, fmt);
                        const barMin  = Math.max(0, Math.min(100, rangeMin));
                        const barMax  = Math.max(0, Math.min(100, rangeMax));
                        const barCurr = Math.max(0, Math.min(100, currentPct));
                        return (
                            <div key={card.name} className="analysis-item">
                                <div className="analysis-item-header">
                                    <span className="analysis-item-title">{card.name}</span>
                                    <span className={`status-pill ${inRange ? 'on' : 'outside'}`}>{inRange ? 'On track' : 'Outside range'}</span>
                                </div>
                                <div className="analysis-sub">Actual Value</div>
                                <div className={`analysis-value ${inRange ? 'ok' : 'warn'}`}>{fmt(card.actual)}</div>
                                <div className="analysis-ideal">Ideal: {fmt(ideal.min)} – {fmt(ideal.max)}</div>

                                {/* I4: Range bar — inline styles replaced with CSS classes */}
                                <div className="range-bar">
                                    <div className="range-bar-labels">
                                        <span>0%</span>
                                        <span>Current: {currentPct.toFixed(1)}%</span>
                                        <span>100%</span>
                                    </div>
                                    <div className="range-bar-track">
                                        <div className="range-bar-ideal" style={{ left: `${barMin}%`, width: `${barMax - barMin}%` }} />
                                        <div className={`range-bar-marker ${inRange ? 'ok' : 'warn'}`} style={{ left: `${barCurr}%` }} />
                                    </div>
                                    <div className="range-bar-ticks">
                                        <span style={{ marginLeft: `${barMin}%` }}>↑{rangeMin}%</span>
                                        <span style={{ marginRight: `${100 - barMax}%` }}>{rangeMax}%↑</span>
                                    </div>
                                </div>

                                {/* Explanation */}
                                {explanation && (
                                    <div className="analysis-explanation">{explanation}</div>
                                )}

                                {/* I5: Action — CSS class instead of inline styles */}
                                {action && status !== 'on_track' && (
                                    <div className="analysis-action">{action}</div>
                                )}
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* I7: GOAL PLANNER CTA — CSS classes instead of inline styles */}
            <div className="inv-cta">
                <div>
                    <div className="inv-cta-title">Planning a big goal?</div>
                    <div className="inv-cta-desc">See how much you need to save monthly to reach your goals — car, house, education, or retirement.</div>
                </div>
                <Link to="/goal-planner" className="inv-cta-link">Open Goal Planner ↗</Link>
            </div>

            {/* I6: UNDERSTANDING — dynamic content from actual user data */}
            <div className="understanding">
                <div className="understanding-title">Understanding Asset Allocation & Ideal Ranges</div>
                <div className="understanding-grid">
                    {understandingItems.map((item) => (
                        <div key={item.title} className="understanding-item">
                            <div className="understanding-item-title">{item.title}</div>
                            <div className="understanding-item-desc">{item.desc}</div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}

export default Investments;
