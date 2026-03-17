import { useEffect, useState } from 'react';
import { fetchWithAuth } from '../api';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip as RechartsTooltip, BarChart, Bar, XAxis, YAxis } from 'recharts';
import { Link } from 'react-router-dom';
import { AlertCircle } from 'lucide-react';
import { fmt, fmtFull } from '../utils/formatCurrency';

/* T4: Palette-consistent income chart colors (replaced purple #6B4C9A, slate #CBD5E1) */
const INCOME_COLORS = {
    'Salary Income': '#1C1A17',
    'Business Income': '#C4BFB8',
    'Additional Income': '#C4703A'
};

function Tax() {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchWithAuth('/dashboard/full').then(res => { setData(res); setLoading(false); }).catch(() => setLoading(false));
    }, []);

    /* T8: Branded loading state */
    if (loading) return (
        <div className="page-loading">
            <div className="page-loading-box"><span>FH</span></div>
            <div className="page-loading-text">Loading your tax data...</div>
        </div>
    );

    /* T8: Branded empty state */
    if (!data) return (
        <div className="page-empty">
            <div className="page-empty-title">No tax data available</div>
            <Link to="/questionnaire" className="page-empty-link">Complete your questionnaire to get started</Link>
        </div>
    );

    const tax = data.tax;

    const recommendedTax = tax.recommended === 'New Regime' ? tax.newRegime.taxLiability : tax.oldRegime.taxLiability;
    const cess = Math.round(recommendedTax * 4 / 104);
    const baseTax = recommendedTax - cess;
    const pieData = [
        { name: 'Base Tax', value: baseTax },
        { name: 'Cess', value: cess }
    ].filter(d => d.value > 0);

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
        <div className="page-content">
            {/* Header */}
            <div className="page-header">
                <h1 className="page-title">Tax</h1>
            </div>

            {/* T14: NARRATIVE */}
            <div className="inv-narrative">
                <div className="inv-narrative-label">Tax Summary</div>
                <p className="inv-narrative-text">{narrative}</p>
            </div>

            {/* Top Cards */}
            <div className="analysis-grid two-col">
                <div className="analysis-item">
                    <div className="analysis-item-header">
                        <span className="analysis-item-title">Potential Tax Savings</span>
                    </div>
                    <div className="analysis-value" style={{ color: 'var(--green)' }}>{fmtFull(tax.potentialSavings)}</div>
                    <div className="analysis-sub">Through unutilized deduction limits</div>
                </div>
                <div className="analysis-item">
                    <div className="analysis-item-header">
                        <span className="analysis-item-title">Total Income</span>
                    </div>
                    <div className="analysis-value ok">{fmtFull(tax.totalIncome)}</div>
                </div>
            </div>

            {/* T1: Tax Overview — flex layout with CSS classes for responsiveness */}
            <div>
                <div className="act-label" style={{ marginBottom: '24px' }}>Overview</div>
                <h2 className="section-heading">Tax Overview</h2>

                <div className="tax-split">
                    {/* Left: Income Chart */}
                    <div className="tax-split-left">
                        <div className="tax-split-label">Income Overview</div>
                        <div style={{ height: '220px', position: 'relative' }}>
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie data={incomePieData} innerRadius={65} outerRadius={90} paddingAngle={2} dataKey="value" stroke="none">
                                        {incomePieData.map((d, i) => (
                                            <Cell key={i} fill={INCOME_COLORS[d.name] || '#C4BFB8'} />
                                        ))}
                                    </Pie>
                                    <RechartsTooltip formatter={(val) => fmtFull(val)} contentStyle={{ fontSize: '11px', padding: '4px 8px', borderRadius: '4px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }} />
                                </PieChart>
                            </ResponsiveContainer>
                        </div>
                        <div className="donut-legend" style={{ marginTop: '20px' }}>
                            {[
                                { label: 'Salary Income', value: tax.salaryIncome || 0, color: INCOME_COLORS['Salary Income'] },
                                { label: 'Business Income', value: tax.businessIncome || 0, color: INCOME_COLORS['Business Income'] },
                                { label: 'Additional Income', value: (tax.bonusIncome || 0) + (tax.otherIncome || 0), color: INCOME_COLORS['Additional Income'] }
                            ].map(item => (
                                <div key={item.label} className="legend-item" style={{ width: '100%', display: 'flex', justifyContent: 'space-between' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                        <div className="legend-dot" style={{ backgroundColor: item.color }}></div>
                                        <span>{item.label}</span>
                                    </div>
                                    <span style={{ fontWeight: 600, color: 'var(--ink)' }}>{fmtFull(item.value)}</span>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Right: Comparison Table */}
                    <div className="tax-split-right">
                        <table className="liab-table">
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
                                        <td><span className="asset-name" style={{ fontWeight: 400 }}>{row.label}</span></td>
                                        <td style={{ textAlign: 'right' }}>{fmtFull(row.old)}</td>
                                        <td style={{ textAlign: 'right' }}>{fmtFull(row.new_)}</td>
                                    </tr>
                                ))}
                                <tr>
                                    <td style={{ paddingTop: '24px' }}><span className="asset-name">Taxable Income</span></td>
                                    <td style={{ textAlign: 'right', paddingTop: '24px', fontWeight: 600, color: 'var(--ink)' }}>{fmtFull(tax.oldRegime.taxableIncome)}</td>
                                    <td style={{ textAlign: 'right', paddingTop: '24px', fontWeight: 600, color: 'var(--ink)' }}>{fmtFull(tax.newRegime.taxableIncome)}</td>
                                </tr>
                                <tr>
                                    <td><span className="asset-name">Tax Liability</span></td>
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
                <div className="act-label" style={{ marginBottom: '24px' }}>Our Recommendation</div>
                <div className="analysis-grid two-col" style={{ borderTop: 'none' }}>
                    {/* T15: Recommended regime gets green value color */}
                    <div className={`tax-rec-box ${tax.recommended === 'New Regime' ? 'recommended' : ''}`} style={{ paddingLeft: 0 }}>
                        {tax.recommended === 'New Regime' && <span className="tax-rec-tag">Recommended</span>}
                        <div className="analysis-item-title" style={{ color: 'var(--ink)', fontSize: '16px' }}>New Regime</div>
                        <div className={`analysis-value ${tax.recommended === 'New Regime' ? 'tax-rec-value recommended' : ''}`} style={{ marginTop: '16px' }}>{fmtFull(tax.newRegime.taxLiability)}</div>
                        <div className="analysis-sub" style={{ marginTop: '12px' }}>Effective Rate: {tax.newRegime.effectiveRate}%</div>
                        <div className="analysis-sub" style={{ marginTop: '4px' }}>After standard deduction of {fmtFull(tax.newRegime.standardDeduction)}</div>
                    </div>
                    <div className={`tax-rec-box ${tax.recommended === 'Old Regime' ? 'recommended' : ''}`} style={{ borderRight: 'none', paddingLeft: '40px' }}>
                        {tax.recommended === 'Old Regime' && <span className="tax-rec-tag">Recommended</span>}
                        <div className="analysis-item-title" style={{ color: 'var(--ink)', fontSize: '16px' }}>Old Regime</div>
                        <div className={`analysis-value ${tax.recommended === 'Old Regime' ? 'tax-rec-value recommended' : ''}`} style={{ marginTop: '16px' }}>{fmtFull(tax.oldRegime.taxLiability)}</div>
                        <div className="analysis-sub" style={{ marginTop: '12px' }}>Effective Rate: {tax.oldRegime.effectiveRate}%</div>
                        <div className="analysis-sub" style={{ marginTop: '4px' }}>Max Deductions: {fmtFull(tax.oldRegime.deductions)}</div>
                    </div>
                </div>

                <div className="understanding" style={{ marginTop: '40px' }}>
                    <div className="understanding-title">How this is calculated</div>
                    <ul className="understanding-list">
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
                <div className="act-label" style={{ marginBottom: '24px' }}>Planning</div>
                <div className="tax-split">
                    {/* Left: Planning Chart */}
                    <div className="tax-split-left wider">
                        <h2 className="section-heading">Tax Planning</h2>
                        <div style={{ height: '240px', marginTop: '32px' }}>
                            <ResponsiveContainer width="100%" height="100%">
                                {/* T9: Bar fill changed from #3D3B38 to var(--ink) */}
                                <BarChart data={barData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                                    <XAxis dataKey="name" tick={{ fontSize: 11, fill: 'var(--ink-soft)', fontFamily: 'Outfit' }} axisLine={false} tickLine={false} dy={10} />
                                    <YAxis tick={{ fontSize: 11, fill: 'var(--ink-soft)', fontFamily: 'Outfit' }} axisLine={false} tickLine={false} tickFormatter={v => fmt(v)} />
                                    <RechartsTooltip formatter={(val) => fmtFull(val)} contentStyle={{ fontSize: '11px', padding: '8px 12px', borderRadius: '4px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }} cursor={{ fill: 'transparent' }} />
                                    <Bar dataKey="value" fill="#1C1A17" radius={[2, 2, 0, 0]} barSize={48} />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </div>

                    {/* Right: Advance Table */}
                    <div className="tax-split-right narrower">
                        <h2 className="section-heading">Advance & Surcharge</h2>
                        <div className="tax-split-sub">Employee contribution to NPS</div>

                        <table className="liab-table">
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
                                    <td><span className="asset-name" style={{ fontWeight: 400 }}>NPS Contribution</span></td>
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
                <div className="act-label" style={{ marginBottom: '24px' }}>Deductions</div>
                <h2 className="section-heading">Deduction Utilization</h2>

                <div className="table-scroll-wrapper" style={{ marginTop: '24px' }}>
                    <table className="liab-table">
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
                                    <td><span className="asset-name">{d.name}</span></td>
                                    <td style={{ color: 'var(--ink-soft)' }}>{d.section}</td>
                                    <td style={{ textAlign: 'right' }}>{fmtFull(d.limit)}</td>
                                    <td style={{ textAlign: 'right' }}>{fmtFull(d.used)}</td>
                                    {/* T11: Gap color uses var(--accent) instead of #D97757 */}
                                    <td className="deduction-gap">{fmtFull(d.gap)}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                <div className="understanding" style={{ marginTop: '40px' }}>
                    <div className="understanding-title">How this is calculated</div>
                    <ul className="understanding-list">
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
