import React, { useEffect, useState } from 'react';
import { fetchWithAuth } from '../api';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip as RechartsTooltip, BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts';
import { Link } from 'react-router-dom';
import { AlertCircle } from 'lucide-react';

const SectionNote = ({ lines }) => (
    <div style={{ marginTop: '16px', padding: '12px 16px', backgroundColor: '#F8FAFC', borderRadius: '8px', border: '1px solid #E8ECF1' }}>
        <div style={{ fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', color: '#94A3B8', marginBottom: '6px', letterSpacing: '0.5px' }}>How this is calculated</div>
        {lines.map((line, i) => (
            <div key={i} style={{ fontSize: '11px', color: '#64748B', lineHeight: 1.6, display: 'flex', gap: '6px', marginBottom: '2px' }}>
                <span style={{ color: '#94A3B8' }}>•</span>
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

function Tax() {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchWithAuth('/dashboard/full').then(res => { setData(res); setLoading(false); }).catch(() => setLoading(false));
    }, []);

    if (loading) return <div>Loading...</div>;
    if (!data) return <div>No data. <Link to="/questionnaire">Complete questionnaire</Link></div>;

    const tax = data.tax;
    const COLORS = ['#1E293B', '#94A3B8'];

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

    return (
        <div className="page-content">
            {/* Header */}
            <div className="page-header" style={{ alignItems: 'flex-start' }}>
                <div>
                    <div className="page-title">Tax</div>
                </div>
            </div>

            {/* Top Cards */}
            <div className="analysis-grid two-col">
                <div className="analysis-item">
                    <div className="analysis-item-header">
                        <span className="analysis-item-title">Potential Tax Savings</span>
                    </div>
                    <div className="analysis-value">{fmtFull(tax.potentialSavings)}</div>
                    <div className="analysis-sub">Through unutilized deduction limits</div>
                </div>
                <div className="analysis-item">
                    <div className="analysis-item-header">
                        <span className="analysis-item-title">Total Income</span>
                    </div>
                    <div className="analysis-value">{fmtFull(tax.totalIncome)}</div>
                </div>
            </div>

            {/* Tax Overview */}
            <div>
                <div className="act-label" style={{ marginBottom: '24px' }}>Overview</div>
                <h2 className="section-heading">Tax Overview</h2>

                <div style={{ display: 'flex', marginTop: '24px', alignItems: 'flex-start' }}>
                    {/* Left: Chart */}
                    <div style={{ width: '30%', paddingRight: '40px', borderRight: '0.5px solid var(--ink-ghost)' }}>
                        <div style={{ fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px', color: 'var(--ink-soft)', marginBottom: '24px' }}>Income Overview</div>
                        <div style={{ height: '220px', position: 'relative' }}>
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie data={(() => {
                                        const incData = [
                                            { name: 'Salary Income', value: tax.salaryIncome || 0 },
                                            { name: 'Business Income', value: tax.businessIncome || 0 },
                                            { name: 'Additional Income', value: (tax.bonusIncome || 0) + (tax.otherIncome || 0) }
                                        ].filter(d => d.value > 0);
                                        return incData.length > 0 ? incData : [{ name: 'No Income', value: 1 }];
                                    })()} innerRadius={65} outerRadius={90} paddingAngle={2} dataKey="value" stroke="none">
                                        {(() => {
                                            const COLOR_MAP = {
                                                'Salary Income': '#6B4C9A',
                                                'Business Income': '#CBD5E1',
                                                'Additional Income': '#D97757'
                                            };
                                            const incData = [
                                                { name: 'Salary Income', value: tax.salaryIncome || 0 },
                                                { name: 'Business Income', value: tax.businessIncome || 0 },
                                                { name: 'Additional Income', value: (tax.bonusIncome || 0) + (tax.otherIncome || 0) }
                                            ].filter(d => d.value > 0);
                                            const finalData = incData.length > 0 ? incData : [{ name: 'No Income', value: 1 }];
                                            return finalData.map((d, i) => (
                                                <Cell key={i} fill={COLOR_MAP[d.name] || '#E8ECF1'} />
                                            ));
                                        })()}
                                    </Pie>
                                    <RechartsTooltip formatter={(val) => fmtFull(val)} contentStyle={{ fontSize: '11px', padding: '4px 8px', borderRadius: '4px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }} />
                                </PieChart>
                            </ResponsiveContainer>
                        </div>
                        <div className="donut-legend" style={{ marginTop: '20px' }}>
                            {[
                                { label: 'Salary Income', value: tax.salaryIncome || 0, color: '#6B4C9A' },
                                { label: 'Business Income', value: tax.businessIncome || 0, color: '#CBD5E1' },
                                { label: 'Additional Income', value: (tax.bonusIncome || 0) + (tax.otherIncome || 0), color: '#D97757' }
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

                    {/* Right: Table */}
                    <div style={{ width: '70%', paddingLeft: '40px' }}>
                        <table className="liab-table">
                            <thead>
                                <tr>
                                    <th>Tax Comparison</th>
                                    <th style={{ textAlign: 'right' }}>Old Regime</th>
                                    <th style={{ textAlign: 'right' }}>
                                        {tax.recommended === 'New Regime' && (
                                            <div style={{ fontSize: '8px', fontWeight: 700, color: '#3B8662', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Ideal</div>
                                        )}
                                        <div>New Regime <span style={{ color: 'var(--ink-ghost)', fontWeight: 400 }}>(opted)</span></div>
                                    </th>
                                </tr>
                            </thead>
                            <tbody>
                                {[
                                    { label: 'Gross Income', old: tax.oldRegime.grossIncome, new_: tax.newRegime.grossIncome },
                                    { label: 'Non-Taxable Component', old: 0, new_: 0 },
                                    { label: 'Standard Deduction', old: tax.oldRegime.standardDeduction, new_: tax.newRegime.standardDeduction },
                                    { label: 'Deductions', old: tax.oldRegime.deductions, new_: tax.newRegime.deductions },
                                ].map((row, i) => (
                                    <tr key={i}>
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
                    <div className={`tax-rec-box ${tax.recommended === 'New Regime' ? 'recommended' : ''}`} style={{ paddingLeft: 0 }}>
                        {tax.recommended === 'New Regime' && <span className="tax-rec-tag">Recommended</span>}
                        <div className="analysis-item-title" style={{ color: 'var(--ink)', fontSize: '14px' }}>New Regime</div>
                        <div className="analysis-value" style={{ marginTop: '16px' }}>{fmtFull(tax.newRegime.taxLiability)}</div>
                        <div className="analysis-sub" style={{ marginTop: '12px' }}>Effective Rate: {tax.newRegime.effectiveRate}%</div>
                        <div className="analysis-sub" style={{ marginTop: '4px' }}>After standard deduction of {fmtFull(tax.newRegime.standardDeduction)}</div>
                    </div>
                    <div className={`tax-rec-box ${tax.recommended === 'Old Regime' ? 'recommended' : ''}`} style={{ borderRight: 'none', paddingLeft: '40px' }}>
                        {tax.recommended === 'Old Regime' && <span className="tax-rec-tag">Recommended</span>}
                        <div className="analysis-item-title" style={{ color: 'var(--ink)', fontSize: '14px' }}>Old Regime</div>
                        <div className="analysis-value" style={{ marginTop: '16px' }}>{fmtFull(tax.oldRegime.taxLiability)}</div>
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
                        <li>Effective Tax Rate = Total tax payable ÷ Total income × 100. Lower is better.</li>
                    </ul>
                </div>
            </div>

            {/* Tax Planning & Advance */}
            <div style={{ marginTop: '48px' }}>
                <div className="act-label" style={{ marginBottom: '24px' }}>Planning</div>
                <div style={{ display: 'flex' }}>
                    {/* Left: Planning Chart */}
                    <div style={{ width: '40%', paddingRight: '40px', borderRight: '0.5px solid var(--ink-ghost)' }}>
                        <h2 className="section-heading">Tax Planning</h2>
                        <div style={{ height: '240px', marginTop: '32px' }}>
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={barData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                                    <XAxis dataKey="name" tick={{ fontSize: 11, fill: 'var(--ink-soft)', fontFamily: 'Outfit' }} axisLine={false} tickLine={false} dy={10} />
                                    <YAxis tick={{ fontSize: 11, fill: 'var(--ink-soft)', fontFamily: 'Outfit' }} axisLine={false} tickLine={false} tickFormatter={v => fmt(v)} />
                                    <RechartsTooltip formatter={(val) => fmtFull(val)} contentStyle={{ fontSize: '11px', padding: '8px 12px', borderRadius: '4px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }} cursor={{ fill: 'transparent' }} />
                                    <Bar dataKey="value" fill="#3D3B38" radius={[2, 2, 0, 0]} barSize={48} />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </div>

                    {/* Right: Advance Table */}
                    <div style={{ width: '60%', paddingLeft: '40px' }}>
                        <h2 className="section-heading">Advance & Surcharge</h2>
                        <div style={{ fontSize: '12px', color: 'var(--ink-soft)', marginTop: '8px', marginBottom: '24px' }}>Employee contribution to NPS</div>

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
                            {(tax.deductionUtilization || []).map((d, i) => (
                                <tr key={i}>
                                    <td><span className="asset-name">{d.name}</span></td>
                                    <td style={{ color: 'var(--ink-soft)' }}>{d.section}</td>
                                    <td style={{ textAlign: 'right' }}>{fmtFull(d.limit)}</td>
                                    <td style={{ textAlign: 'right' }}>{fmtFull(d.used)}</td>
                                    <td style={{ textAlign: 'right', fontWeight: 600, color: '#D97757' }}>{fmtFull(d.gap)}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                <div className="understanding" style={{ marginTop: '40px' }}>
                    <div className="understanding-title">How this is calculated</div>
                    <ul className="understanding-list">
                        <li>80C (\u20b91.5L limit): PPF, ELSS, LIC, tuition fees, home loan principal. Most common tax-saving instrument.</li>
                        <li>80D (\u20b925K self + \u20b925K parents): Health insurance premiums. \u20b950K if parents are senior citizens.</li>
                        <li>80CCD(1B) (\u20b950K extra): Additional NPS contribution above 80C limit. Only in Old Regime.</li>
                        <li>Section 24 (\u20b92L): Home loan interest deduction for self-occupied property. Old Regime only.</li>
                        <li>HRA: Exempt based on min of (actual HRA, 50%/40% of basic, rent minus 10% of basic). Old Regime only.</li>
                        <li>Gap = Limit minus Used. Investing the gap amount in eligible instruments can reduce your tax liability.</li>
                    </ul>
                </div>

                {/* Actions */}
                {tax.potentialSavings > 0 && (
                    <div style={{ marginTop: '40px', display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
                        <AlertCircle size={16} color="var(--ink-soft)" style={{ marginTop: '2px', flexShrink: 0 }} />
                        <div style={{ fontSize: '13px', color: 'var(--ink-soft)', lineHeight: 1.6 }}>
                            <span style={{ fontWeight: 600, color: 'var(--ink)' }}>Actions for the User: </span>
                            Switching to the {tax.recommended.toLowerCase()} could save you {fmtFull(tax.potentialSavings)} annually. Consider maximising your deduction utilisation to bring your effective tax rate down further.
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

export default Tax;
