import { useEffect, useState } from 'react';
import { fetchWithAuth } from '../api';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip as RechartsTooltip, BarChart, Bar, XAxis, YAxis } from 'recharts';
import { Link } from 'react-router-dom';
import { AlertCircle } from 'lucide-react';
import '../styles/tax.css';
import { fmt, fmtFull } from '../utils/formatCurrency';

/* T4: Palette-consistent income chart colors (replaced purple #6B4C9A, slate #CBD5E1) */
const INCOME_COLORS = {
    'Salary Income': '#1C1A17',
    'Business Income': '#C4BFB8',
    'Additional Income': '#C4703A'
};

function FlipCard({ name, isRecommended, value, sub1, sub2, explanation, action, noBorder }) {
    const [flipped, setFlipped] = useState(false);
    const hasBack = explanation || action;
    return (
        <div
            className={`tax-rec-box${isRecommended ? ' tax-recommended' : ''}${flipped ? ' tax-flipped' : ''}`}
            style={{ paddingLeft: noBorder ? '40px' : 0, borderRight: noBorder ? 'none' : undefined, perspective: '1000px', cursor: hasBack ? 'pointer' : 'default' }}
            onClick={() => hasBack && setFlipped(f => !f)}
        >
            <div className="tax-flip-inner" style={{ position: 'relative', transformStyle: 'preserve-3d', transition: 'transform 0.55s cubic-bezier(0.4,0,0.2,1)', transform: flipped ? 'rotateY(180deg)' : 'none' }}>
                <div className="tax-flip-front">
                    {isRecommended && <span className="tax-rec-tag">Recommended</span>}
                    <div className="tax-analysis-item-title" style={{ color: 'var(--ink)', fontSize: '16px' }}>{name}</div>
                    <div className={`tax-analysis-value${isRecommended ? ' tax-rec-value tax-recommended' : ''}`} style={{ marginTop: '16px' }}>{value}</div>
                    {sub1 && <div className="tax-analysis-sub" style={{ marginTop: '12px' }}>{sub1}</div>}
                    {sub2 && <div className="tax-analysis-sub" style={{ marginTop: '4px' }}>{sub2}</div>}
                    {hasBack && (
                        <div className="tax-flip-front-link">→ Flip for analysis</div>
                    )}
                </div>
                {hasBack && (
                    <div className="tax-flip-back">
                        <div className="tax-flip-back-title">{name}</div>
                        {explanation && <div className="tax-flip-back-explanation">{explanation}</div>}
                        {action && <div className="tax-flip-back-action">{action}</div>}
                        <div className="tax-flip-back-link">← Flip back</div>
                    </div>
                )}
            </div>
        </div>
    );
}

function Tax() {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchWithAuth('/dashboard/full').then(res => { setData(res); setLoading(false); }).catch(() => setLoading(false));
    }, []);

    /* T8: Branded loading state */
    if (loading) return (
        <div className="tax-page-loading">
            <div className="tax-page-loading-box"><span>FH</span></div>
            <div className="tax-page-loading-text">Loading your tax data...</div>
        </div>
    );

    /* T8: Branded empty state */
    if (!data) return (
        <div className="tax-page-empty">
            <div className="tax-page-empty-title">No tax data available</div>
            <Link to="/questionnaire" className="tax-page-empty-link">Complete your questionnaire to get started</Link>
        </div>
    );

    const tax = data.tax;

    const recommendedTax = tax.recommended === 'New Regime' ? tax.newRegime.taxLiability : tax.oldRegime.taxLiability;
    // cess/baseTax/pieData removed — unused after UI refactor

    const barData = [
        { name: 'Current', value: recommendedTax },
        { name: 'Recommended', value: Math.min(tax.oldRegime.taxLiability, tax.newRegime.taxLiability) }
    ];

    /* T3: Compute income data once (was duplicated in two IIFEs) */
    const incomeData = [
        { name: 'Salary Income', value: tax.salaryIncome || 0 },
        { name: 'Business Income', value: tax.businessIncome || 0 },
        { name: 'Additional Income', value: (tax.bonusIncome || 0) + (tax.otherIncome || 0) }
    ].filter(d => d.value > 0);
    const incomePieData = incomeData.length > 0 ? incomeData : [{ name: 'No Income', value: 1 }];

    /* T10: Filter out always-zero rows */
    const comparisonRows = [
        { label: 'Gross Income', old: tax.oldRegime.grossIncome, new_: tax.newRegime.grossIncome },
        { label: 'Standard Deduction', old: tax.oldRegime.standardDeduction, new_: tax.newRegime.standardDeduction },
        { label: 'Deductions', old: tax.oldRegime.deductions, new_: tax.newRegime.deductions },
    ];

    /* T14: Build narrative from actual tax data */
    const effectiveRate = tax.recommended === 'New Regime' ? tax.newRegime.effectiveRate : tax.oldRegime.effectiveRate;
    let narrative = `Your total income is ${fmtFull(tax.totalIncome)} and your tax liability under the ${tax.recommended.toLowerCase()} is ${fmtFull(recommendedTax)} (effective rate: ${effectiveRate}%). `;
    if (tax.potentialSavings > 0) {
        const otherRegime = tax.recommended === 'New Regime' ? 'old regime' : 'new regime';
        narrative += `Switching to the ${otherRegime} could save you ${fmtFull(tax.potentialSavings)} annually. `;
    }
    if (tax.deductionUtilization?.some(d => d.gap > 0)) {
        const totalGap = tax.deductionUtilization.reduce((sum, d) => sum + d.gap, 0);
        narrative += `You have ${fmtFull(totalGap)} in unutilised deduction limits that could further reduce your taxable income.`;
    }

    return (
        <div className="tax-page-content">
            {/* Header */}
            <div className="tax-page-header">
                <div>
                    <div className="tax-page-super">Explore — Tax</div>
                    <h1 className="tax-page-title">Tax</h1>
                </div>
            </div>

            {/* T14: NARRATIVE */}
            <div className="tax-narrative">
                <div className="tax-narrative-label">Tax Summary</div>
                <p className="tax-narrative-text">{narrative}</p>
            </div>

            {/* Top Cards */}
            <div className="tax-analysis-grid tax-two-col">
                <div className="tax-analysis-item">
                    <div className="tax-analysis-item-header">
                        <span className="tax-analysis-item-title">Potential Tax Savings</span>
                    </div>
                    <div className="tax-analysis-value" style={{ color: 'var(--green)' }}>{fmtFull(tax.potentialSavings)}</div>
                    <div className="tax-analysis-sub">Through unutilized deduction limits</div>
                </div>
                <div className="tax-analysis-item">
                    <div className="tax-analysis-item-header">
                        <span className="tax-analysis-item-title">Total Income</span>
                    </div>
                    <div className="tax-analysis-value tax-ok">{fmtFull(tax.totalIncome)}</div>
                </div>
            </div>

            {/* T1: Tax Overview — flex layout with CSS classes for responsiveness */}
            <div>
                <div className="tax-act-label" style={{ marginBottom: '24px' }}>Overview</div>
                <h2 className="tax-section-heading">Tax Overview</h2>

                <div className="tax-split">
                    {/* Left: Income Chart */}
                    <div className="tax-split-left">
                        <div className="tax-split-label">Income Overview</div>
                        <div className='tax-donut-canvas'>
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie data={incomePieData} innerRadius={65} outerRadius={90} paddingAngle={2} dataKey="value" stroke="none">
                                        {incomePieData.map((d, i) => (
                                            <Cell key={i} fill={INCOME_COLORS[d.name] || '#C4BFB8'} />
                                        ))}
                                    </Pie>
                                    {/* <RechartsTooltip formatter={(val) => fmtFull(val)} contentStyle={{ fontSize: '11px', padding: '4px 8px', borderRadius: '4px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }} /> */}
                                    <RechartsTooltip formatter={(val) => fmtFull(val)} contentStyle={{ fontSize: '11px', padding: '4px 8px' }} />
                                </PieChart>
                            </ResponsiveContainer>
                        </div>
                        <div className="tax-donut-legend" style={{ marginTop: '20px' }}>
                            {[
                                { label: 'Salary Income', value: tax.salaryIncome || 0, color: INCOME_COLORS['Salary Income'] },
                                { label: 'Business Income', value: tax.businessIncome || 0, color: INCOME_COLORS['Business Income'] },
                                { label: 'Additional Income', value: (tax.bonusIncome || 0) + (tax.otherIncome || 0), color: INCOME_COLORS['Additional Income'] }
                            ].map(item => (
                                <div key={item.label} className="tax-legend-item" style={{ width: '100%', display: 'flex', justifyContent: 'space-between' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                        <div className="tax-legend-dot" style={{ backgroundColor: item.color }}></div>
                                        <span>{item.label}</span>
                                    </div>
                                    <span style={{ fontWeight: 600, color: 'var(--ink)' }}>{fmtFull(item.value)}</span>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Right: Comparison Table */}
                    <div className="tax-split-right">
                        <table className="tax-table">
                            <thead>
                                <tr>
                                    <th>Tax Comparison</th>
                                    <th style={{ textAlign: 'right' }}>
                                        {tax.recommended === 'Old Regime' && (
                                            <div style={{ fontSize: '13px', fontWeight: 700, color: '#3B8662', textTransform: 'uppercase', letterSpacing: '0.07em' }}>Ideal</div>
                                        )}
                                        <div>Old Regime</div>
                                    </th>
                                    <th style={{ textAlign: 'right' }}>
                                        {/* T12: Show "Ideal" on whichever regime is recommended */}
                                        {tax.recommended === 'New Regime' && (
                                            <div style={{ fontSize: '13px', fontWeight: 700, color: '#3B8662', textTransform: 'uppercase', letterSpacing: '0.07em' }}>Ideal</div>
                                        )}
                                        <div>New Regime</div>
                                    </th>
                                </tr>
                            </thead>
                            <tbody>
                                {comparisonRows.map((row) => (
                                    <tr key={row.label}>
                                        <td><span className="tax-asset-name" style={{ fontWeight: 400 }}>{row.label}</span></td>
                                        <td style={{ textAlign: 'right' }}>{fmtFull(row.old)}</td>
                                        <td style={{ textAlign: 'right' }}>{fmtFull(row.new_)}</td>
                                    </tr>
                                ))}
                                <tr>
                                    <td style={{ paddingTop: '24px' }}><span className="tax-asset-name">Taxable Income</span></td>
                                    <td style={{ textAlign: 'right', paddingTop: '24px', fontWeight: 600, color: 'var(--ink)' }}>{fmtFull(tax.oldRegime.taxableIncome)}</td>
                                    <td style={{ textAlign: 'right', paddingTop: '24px', fontWeight: 600, color: 'var(--ink)' }}>{fmtFull(tax.newRegime.taxableIncome)}</td>
                                </tr>
                                <tr>
                                    <td><span className="tax-asset-name">Tax Liability</span></td>
                                    <td style={{ textAlign: 'right', fontWeight: 600, color: 'var(--ink)' }}>{fmtFull(tax.oldRegime.taxLiability)}</td>
                                    <td style={{ textAlign: 'right', fontWeight: 600, color: 'var(--ink)' }}>{fmtFull(tax.newRegime.taxLiability)}</td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            {/* Recommendation block */}
            <div style={{ marginTop: '48px', paddingTop: '48px', borderTop: '0.5px solid var(--ink-ghost)' }}>
                <div className="tax-act-label" style={{ marginBottom: '24px' }}>Our Recommendation</div>
                <div className="tax-analysis-grid tax-two-col" style={{ borderTop: 'none' }}>
                    <FlipCard
                        name="New Regime"
                        isRecommended={tax.recommended === 'New Regime'}
                        value={fmtFull(tax.newRegime.taxLiability)}
                        sub1={`Effective Rate: ${tax.newRegime.effectiveRate}%`}
                        sub2={`After standard deduction of ${fmtFull(tax.newRegime.standardDeduction)}`}
                        explanation="The New Regime offers lower tax slabs but eliminates most deductions. Ideal for those with minimal deductible investments like EPF contributions, insurance premiums, and home loans."
                        action={tax.recommended === 'New Regime' ? `This is your recommended regime — saving you ${fmtFull(tax.potentialSavings)} vs the old regime.` : `Switching to New Regime would cost ${fmtFull(Math.abs(tax.newRegime.taxLiability - tax.oldRegime.taxLiability))} more annually.`}
                        noBorder={false}
                    />
                    <FlipCard
                        name="Old Regime"
                        isRecommended={tax.recommended === 'Old Regime'}
                        value={fmtFull(tax.oldRegime.taxLiability)}
                        sub1={`Effective Rate: ${tax.oldRegime.effectiveRate}%`}
                        sub2={`Max Deductions: ${fmtFull(tax.oldRegime.deductions)}`}
                        explanation="The Old Regime applies standard tax slabs but allows substantial deductions under 80C, 80D, HRA, home loan interest, and NPS. Best for those who maximise these deductions."
                        action={tax.recommended === 'Old Regime' ? `This is your recommended regime — you have ${fmtFull(tax.oldRegime.deductions)} in applicable deductions reducing your tax significantly.` : `Switching to Old Regime would cost ${fmtFull(Math.abs(tax.oldRegime.taxLiability - tax.newRegime.taxLiability))} more annually.`}
                        noBorder={true}
                    />
                </div>

                <div className="tax-understanding" style={{ marginTop: '40px' }}>
                    <div className="tax-understanding-title">How this is calculated</div>
                    <ul className="tax-understanding-list">
                        <li>Old Regime applies standard tax slabs but allows deductions under sections 80C, 80D, HRA, home loan interest, etc.</li>
                        <li>New Regime has lower tax slabs but eliminates most deductions. Best for those with low deductible investments.</li>
                        <li>Recommended regime is whichever results in lower total tax liability. The system compares both and suggests the optimal one.</li>
                        <li>Cess (4% Health & Education) is applied on top of your base tax amount under both regimes.</li>
                        <li>Effective Tax Rate = Total tax payable ÷ Total income × 100. Lower is better.{effectiveRate > 0 ? ` Your rate: ${effectiveRate}%.` : ''}</li>
                    </ul>
                </div>
            </div>

            {/* T2: Tax Planning & Advance — responsive flex layout */}
            <div style={{ marginTop: '48px' }}>
                <div className="tax-act-label" style={{ marginBottom: '24px' }}>Planning</div>
                <div className="tax-split">
                    {/* Left: Planning Chart */}
                    <div className="tax-split-left tax-wider">
                        <h2 className="tax-section-heading">Tax Planning</h2>
                        <div style={{ height: '240px', marginTop: '32px' }}>
                            <ResponsiveContainer width="100%" height="100%">
                                {/* T9: Bar fill changed from #3D3B38 to var(--ink) */}
                                <BarChart data={barData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                                    <XAxis dataKey="name" tick={{ fontSize: 11, fill: 'var(--ink-soft)', fontFamily: 'Inter' }} axisLine={false} tickLine={false} dy={10} />
                                    <YAxis tick={{ fontSize: 11, fill: 'var(--ink-soft)', fontFamily: 'Inter' }} axisLine={false} tickLine={false} tickFormatter={v => fmt(v)} />
                                    <RechartsTooltip formatter={(val) => fmtFull(val)} contentStyle={{ fontSize: '11px', padding: '8px 12px', borderRadius: '4px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }} cursor={{ fill: 'transparent' }} />
                                    <Bar dataKey="value" fill="#1C1A17" radius={[2, 2, 0, 0]} barSize={48} />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </div>

                    {/* Right: Advance Table */}
                    <div className="tax-split-right tax-narrower">
                        <h2 className="tax-section-heading">Advance & Surcharge</h2>
                        <div className="tax-split-sub">Employee contribution to NPS</div>

                        <table className="tax-table">
                            <thead>
                                <tr>
                                    <th>Item</th>
                                    <th style={{ textAlign: 'right' }}>Tax Slab (Old)</th>
                                    <th style={{ textAlign: 'right' }}>Limit Area</th>
                                    <th style={{ textAlign: 'right' }}>Suggested Amount</th>
                                </tr>
                            </thead>
                            <tbody>
                                <tr>
                                    <td><span className="tax-asset-name" style={{ fontWeight: 400 }}>NPS Contribution</span></td>
                                    <td style={{ textAlign: 'right' }}>{fmtFull(tax.nps.maxDeduction.oldRegime)}</td>
                                    <td style={{ textAlign: 'right' }}>{fmtFull(tax.nps.currentValue)}</td>
                                    <td style={{ textAlign: 'right', fontWeight: 600, color: 'var(--ink)' }}>{fmtFull(tax.nps.suggested)}</td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            {/* Deduction Utilization */}
            <div style={{ marginTop: '48px', paddingTop: '48px', borderTop: '0.5px solid var(--ink-ghost)' }}>
                <div className="tax-act-label" style={{ marginBottom: '24px' }}>Deductions</div>
                <h2 className="tax-section-heading">Deduction Utilization</h2>

                <div className="tax-table-scroll-wrapper" style={{ marginTop: '24px' }}>
                    <table className="tax-table">
                        <thead>
                            <tr>
                                <th>Deduction</th>
                                <th>Section</th>
                                <th style={{ textAlign: 'right' }}>Limit</th>
                                <th style={{ textAlign: 'right' }}>Used</th>
                                <th style={{ textAlign: 'right' }}>Gap</th>
                            </tr>
                        </thead>
                        <tbody>
                            {(tax.deductionUtilization || []).map((d) => (
                                <tr key={d.section}>
                                    <td><span className="tax-asset-name">{d.name}</span></td>
                                    <td style={{ color: 'var(--ink-soft)' }}>{d.section}</td>
                                    <td style={{ textAlign: 'right' }}>{fmtFull(d.limit)}</td>
                                    <td style={{ textAlign: 'right' }}>{fmtFull(d.used)}</td>
                                    {/* T11: Gap color uses var(--accent) instead of #D97757 */}
                                    <td className="tax-deduction-gap">{fmtFull(d.gap)}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                <div className="tax-understanding" style={{ marginTop: '40px' }}>
                    <div className="tax-understanding-title">How this is calculated</div>
                    <ul className="tax-understanding-list">
                        <li>80C (₹1.5L limit): PPF, ELSS, LIC, tuition fees, home loan principal. Most common tax-saving instrument.</li>
                        <li>80D (₹25K self + ₹25K parents): Health insurance premiums. ₹50K if parents are senior citizens.</li>
                        <li>80CCD(1B) (₹50K extra): Additional NPS contribution above 80C limit. Only in Old Regime.</li>
                        <li>Section 24 (₹2L): Home loan interest deduction for self-occupied property. Old Regime only.</li>
                        <li>HRA: Exempt based on min of (actual HRA, 50%/40% of basic, rent minus 10% of basic). Old Regime only.</li>
                        <li>Gap = Limit minus Used. Investing the gap amount in eligible instruments can reduce your tax liability.</li>
                    </ul>
                </div>

                {/* T13: "Actions for the User" → "Recommended Action" */}
                {tax.potentialSavings > 0 && (
                    <div className="tax-action-note">
                        <AlertCircle size={16} color="var(--ink-soft)" style={{ marginTop: '2px', flexShrink: 0 }} />
                        <div className="tax-action-note-text">
                            <strong>Recommended Action: </strong>
                            Switching to the {tax.recommended.toLowerCase()} could save you {fmtFull(tax.potentialSavings)} annually. Consider maximising your deduction utilisation to bring your effective tax rate down further.
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

export default Tax;
