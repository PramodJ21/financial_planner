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
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            {/* Top cards */}
            <div className="stat-row">
                <div className="card" style={{ flex: 1, padding: '20px' }}>
                    <div style={{ fontSize: '12px', fontWeight: 600, color: '#64748B', textTransform: 'uppercase', marginBottom: '4px' }}>Potential Tax Savings</div>
                    <div style={{ fontSize: '28px', fontWeight: 700, color: '#1E293B' }}>{fmt(tax.potentialSavings)}</div>
                    <div style={{ fontSize: '12px', color: '#94A3B8', marginTop: '4px' }}>Through unutilized deduction limits</div>
                </div>
                <div className="card" style={{ flex: 1, padding: '20px' }}>
                    <div style={{ fontSize: '12px', fontWeight: 600, color: '#64748B', textTransform: 'uppercase', marginBottom: '4px' }}>Total Income</div>
                    <div style={{ fontSize: '28px', fontWeight: 700, color: '#1E293B' }}>{fmt(tax.totalIncome)}</div>
                </div>
            </div>

            {/* Tax Overview */}
            <div style={{ display: 'flex', gap: '0', alignItems: 'stretch' }}>
                <h2 style={{ fontSize: '16px', fontWeight: 700, color: '#1E293B', marginBottom: '20px', width: '100%', position: 'absolute', top: '-32px' }}></h2>
            </div>
            <div>
                <h2 style={{ fontSize: '16px', fontWeight: 700, color: '#1E293B', marginBottom: '16px' }}>Tax Overview</h2>
                <div className="tax-overview-row">
                    {/* Left: Income Overview */}
                    <div className="card tax-sidebar-card" style={{ padding: '24px', borderRadius: '8px 0 0 8px', borderRight: '1px solid #E8ECF1' }}>
                        <div style={{ fontSize: '12px', color: '#94A3B8', marginBottom: '16px' }}>Income Overview</div>
                        <div style={{ height: '180px', position: 'relative' }}>
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie data={(() => {
                                        const incData = [
                                            { name: 'Salary Income', value: tax.salaryIncome || 0 },
                                            { name: 'Business Income', value: tax.businessIncome || 0 },
                                            { name: 'Additional Income', value: (tax.bonusIncome || 0) + (tax.otherIncome || 0) }
                                        ].filter(d => d.value > 0);
                                        return incData.length > 0 ? incData : [{ name: 'No Income', value: 1 }];
                                    })()} innerRadius={55} outerRadius={80} paddingAngle={2} dataKey="value">
                                        {(() => {
                                            const COLOR_MAP = {
                                                'Salary Income': '#A855F7',
                                                'Business Income': '#6EE7B7',
                                                'Additional Income': '#FCD34D'
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
                                    <RechartsTooltip formatter={(val) => fmtFull(val)} contentStyle={{ fontSize: '11px', padding: '4px 8px' }} />
                                </PieChart>
                            </ResponsiveContainer>
                            <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', textAlign: 'center' }}>
                                <div style={{ fontSize: '10px', color: '#94A3B8' }}>Total Income</div>
                                <div style={{ fontSize: '14px', fontWeight: 700, color: '#1E293B' }}>{fmtFull(tax.totalIncome)}</div>
                            </div>
                        </div>
                        {/* Legend */}
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '16px', marginTop: '16px' }}>
                            {[
                                { label: 'Salary Income', value: tax.salaryIncome || 0, color: '#A855F7' },
                                { label: 'Business Income', value: tax.businessIncome || 0, color: '#6EE7B7' },
                                { label: 'Additional Income', value: (tax.bonusIncome || 0) + (tax.otherIncome || 0), color: '#FCD34D' }
                            ].map(item => (
                                <div key={item.label} style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '11px', color: '#64748B' }}>
                                        <div style={{ width: '8px', height: '8px', borderRadius: '2px', backgroundColor: item.color }}></div>
                                        {item.label}
                                    </div>
                                    <div style={{ fontSize: '12px', fontWeight: 600, color: '#1E293B', paddingLeft: '12px' }}>{fmtFull(item.value)}</div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Right: Tax Comparison Table */}
                    <div className="card" style={{ flex: 1, padding: '0', borderRadius: '0 8px 8px 0' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                            <thead>
                                <tr>
                                    <th style={{ padding: '16px 16px 12px', fontSize: '14px', fontWeight: 700, color: '#1E293B', textAlign: 'left' }}>Tax Comparison</th>
                                    <th style={{ padding: '16px 16px 12px', fontSize: '14px', fontWeight: 600, color: '#1E293B', textAlign: 'left' }}>
                                        Old Regime
                                    </th>
                                    <th style={{ padding: '8px 16px 12px', textAlign: 'left', verticalAlign: 'bottom' }}>
                                        {tax.recommended === 'New Regime' && (
                                            <div style={{ fontSize: '9px', fontWeight: 700, color: '#059669', textTransform: 'uppercase', letterSpacing: '0.5px', backgroundColor: '#ECFDF5', display: 'inline-block', padding: '2px 8px', borderRadius: '4px', marginBottom: '4px' }}>Ideal</div>
                                        )}
                                        <div>
                                            <span style={{ fontSize: '14px', fontWeight: 600, color: '#1E293B' }}>New Regime</span>
                                            {tax.recommended === 'New Regime' && <span style={{ fontSize: '11px', color: '#94A3B8', marginLeft: '4px' }}>(opted)</span>}
                                        </div>
                                        {tax.recommended === 'Old Regime' && (
                                            <span style={{ fontSize: '11px', color: '#94A3B8' }}></span>
                                        )}
                                    </th>
                                </tr>
                                {tax.recommended === 'Old Regime' && (
                                    <tr><td colSpan={3} style={{ padding: 0 }}></td></tr>
                                )}
                            </thead>
                            <tbody>
                                {[
                                    { label: 'Gross Income', old: tax.oldRegime.grossIncome, new_: tax.newRegime.grossIncome },
                                    { label: 'Non-Taxable Component', old: 0, new_: 0 },
                                    { label: 'Standard Deduction', old: tax.oldRegime.standardDeduction, new_: tax.newRegime.standardDeduction },
                                    { label: 'Deductions', old: tax.oldRegime.deductions, new_: tax.newRegime.deductions },
                                ].map((row, i) => (
                                    <tr key={i} style={{ borderBottom: '1px solid #F1F5F9' }}>
                                        <td style={{ padding: '14px 16px', fontSize: '13px', color: '#64748B' }}>{row.label}</td>
                                        <td style={{ padding: '14px 16px', fontSize: '13px', color: '#1E293B' }}>{fmtFull(row.old)}</td>
                                        <td style={{ padding: '14px 16px', fontSize: '13px', color: '#1E293B' }}>{fmtFull(row.new_)}</td>
                                    </tr>
                                ))}
                                <tr style={{ backgroundColor: '#F0FDF9' }}>
                                    <td style={{ padding: '14px 16px', fontSize: '13px', fontWeight: 700, color: '#1E293B' }}>Taxable Income</td>
                                    <td style={{ padding: '14px 16px', fontSize: '15px', fontWeight: 700, color: '#1E293B' }}>{fmtFull(tax.oldRegime.taxableIncome)}</td>
                                    <td style={{ padding: '14px 16px', fontSize: '15px', fontWeight: 700, color: '#1E293B' }}>{fmtFull(tax.newRegime.taxableIncome)}</td>
                                </tr>
                                <tr style={{ backgroundColor: '#F0FDF9' }}>
                                    <td style={{ padding: '14px 16px', fontSize: '13px', fontWeight: 700, color: '#1E293B' }}>Tax Liability</td>
                                    <td style={{ padding: '14px 16px', fontSize: '15px', fontWeight: 700, color: '#1E293B' }}>{fmtFull(tax.oldRegime.taxLiability)}</td>
                                    <td style={{ padding: '14px 16px', fontSize: '15px', fontWeight: 700, color: '#1E293B' }}>{fmtFull(tax.newRegime.taxLiability)}</td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            {/* Recommendation */}
            <div className="card" style={{ padding: '24px' }}>
                <h2 style={{ fontSize: '16px', fontWeight: 700, color: '#1E293B', marginBottom: '16px' }}>Our Recommendation</h2>
                <div className="stat-row">
                    <div style={{ flex: 1, border: `2px solid ${tax.recommended === 'New Regime' ? '#1E293B' : '#E8ECF1'}`, borderRadius: '12px', padding: '20px', position: 'relative' }}>
                        {tax.recommended === 'New Regime' && <span style={{ position: 'absolute', top: '-10px', right: '12px', backgroundColor: '#1E293B', color: 'white', fontSize: '10px', fontWeight: 700, padding: '2px 10px', borderRadius: '8px' }}>Recommended</span>}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                            <span style={{ fontWeight: 600, color: '#1E293B' }}>New Regime</span>
                        </div>
                        <div style={{ fontSize: '24px', fontWeight: 700, color: '#1E293B', marginBottom: '4px' }}>{fmtFull(tax.newRegime.taxLiability)}</div>
                        <div style={{ fontSize: '12px', color: '#64748B' }}>Effective Rate: {tax.newRegime.effectiveRate}%</div>
                        <div style={{ fontSize: '12px', color: '#64748B' }}>After standard deduction of {fmtFull(tax.newRegime.standardDeduction)}</div>
                    </div>
                    <div style={{ flex: 1, border: `2px solid ${tax.recommended === 'Old Regime' ? '#1E293B' : '#E8ECF1'}`, borderRadius: '12px', padding: '20px', position: 'relative' }}>
                        {tax.recommended === 'Old Regime' && <span style={{ position: 'absolute', top: '-10px', right: '12px', backgroundColor: '#1E293B', color: 'white', fontSize: '10px', fontWeight: 700, padding: '2px 10px', borderRadius: '8px' }}>Recommended</span>}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                            <span style={{ fontWeight: 600, color: '#1E293B' }}>Old Regime</span>
                        </div>
                        <div style={{ fontSize: '24px', fontWeight: 700, color: '#1E293B', marginBottom: '4px' }}>{fmtFull(tax.oldRegime.taxLiability)}</div>
                        <div style={{ fontSize: '12px', color: '#64748B' }}>Effective Rate: {tax.oldRegime.effectiveRate}%</div>
                        <div style={{ fontSize: '12px', color: '#64748B' }}>Max Deductions: {fmtFull(tax.oldRegime.deductions)}</div>
                    </div>
                </div>
            </div>
            <SectionNote lines={[
                'Old Regime applies standard tax slabs but allows deductions under sections 80C, 80D, HRA, home loan interest, etc.',
                'New Regime has lower tax slabs but eliminates most deductions. Best for those with low deductible investments.',
                'Recommended regime is whichever results in lower total tax liability. The system compares both and suggests the optimal one.',
                'Cess (4% Health & Education) is applied on top of your base tax amount under both regimes.',
                'Effective Tax Rate = Total tax payable ÷ Total income × 100. Lower is better.'
            ]} />

            {/* Tax Planning + Advance */}
            <div className="stat-row">
                <div className="card" style={{ flex: 1, padding: '24px' }}>
                    <h3 style={{ fontSize: '14px', fontWeight: 700, color: '#1E293B', marginBottom: '16px' }}>Tax Planning</h3>
                    <div style={{ height: '200px' }}>
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={barData}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" />
                                <XAxis dataKey="name" tick={{ fontSize: 12, fill: '#64748B' }} axisLine={false} tickLine={false} />
                                <YAxis tick={{ fontSize: 12, fill: '#64748B' }} axisLine={false} tickLine={false} tickFormatter={v => fmt(v)} />
                                <RechartsTooltip formatter={(val) => fmtFull(val)} contentStyle={{ fontSize: '11px', padding: '4px 8px' }} />
                                <Bar dataKey="value" fill="#1E293B" radius={[4, 4, 0, 0]} barSize={40} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                <div className="card" style={{ flex: 1, padding: '24px' }}>
                    <h3 style={{ fontSize: '14px', fontWeight: 700, color: '#1E293B', marginBottom: '4px' }}>Advance & Surcharge</h3>
                    <p style={{ fontSize: '12px', color: '#94A3B8', marginBottom: '16px' }}>Employee contribution to NPS</p>
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                        <thead>
                            <tr style={{ borderBottom: '1px solid #E8ECF1' }}>
                                {['', 'Tax Slab (Old)', 'Limit Area', 'Suggested Amount'].map(h => (
                                    <th key={h} style={{ padding: '8px 10px', fontSize: '11px', fontWeight: 600, color: '#64748B', textAlign: h === '' ? 'left' : 'right', textTransform: 'uppercase' }}>{h}</th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            <tr style={{ borderBottom: '1px solid #F1F5F9' }}>
                                <td style={{ padding: '10px', fontSize: '13px', color: '#1E293B' }}>NPS Contribution</td>
                                <td style={{ padding: '10px', fontSize: '13px', textAlign: 'right', color: '#1E293B' }}>{fmtFull(tax.nps.maxDeduction.oldRegime)}</td>
                                <td style={{ padding: '10px', fontSize: '13px', textAlign: 'right', color: '#1E293B' }}>{fmtFull(tax.nps.currentValue)}</td>
                                <td style={{ padding: '10px', fontSize: '13px', textAlign: 'right', fontWeight: 600, color: '#1E293B' }}>{fmtFull(tax.nps.suggested)}</td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Deduction Utilization */}
            <div className="card" style={{ padding: '24px' }}>
                <h2 style={{ fontSize: '16px', fontWeight: 700, color: '#1E293B', marginBottom: '16px' }}>Deduction Utilization</h2>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                        <tr style={{ borderBottom: '1px solid #E8ECF1' }}>
                            {['Deduction', 'Section', 'Limit', 'Used', 'Gap'].map(h => (
                                <th key={h} style={{ padding: '10px 12px', fontSize: '11px', fontWeight: 600, color: '#64748B', textAlign: h === 'Deduction' ? 'left' : 'right', textTransform: 'uppercase' }}>{h}</th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {(tax.deductionUtilization || []).map((d, i) => (
                            <tr key={i} style={{ borderBottom: '1px solid #F1F5F9' }}>
                                <td style={{ padding: '14px 12px', fontSize: '13px', fontWeight: 500, color: '#1E293B' }}>{d.name}</td>
                                <td style={{ padding: '14px 12px', fontSize: '13px', color: '#64748B', textAlign: 'right' }}>{d.section}</td>
                                <td style={{ padding: '14px 12px', fontSize: '13px', textAlign: 'right', color: '#1E293B' }}>{fmtFull(d.limit)}</td>
                                <td style={{ padding: '14px 12px', fontSize: '13px', textAlign: 'right', color: '#1E293B' }}>{fmtFull(d.used)}</td>
                                <td style={{ padding: '14px 12px', fontSize: '13px', textAlign: 'right', fontWeight: 600, color: '#1E293B' }}>{fmtFull(d.gap)}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
                <SectionNote lines={[
                    '80C (\u20b91.5L limit): PPF, ELSS, LIC, tuition fees, home loan principal. Most common tax-saving instrument.',
                    '80D (\u20b925K self + \u20b925K parents): Health insurance premiums. \u20b950K if parents are senior citizens.',
                    '80CCD(1B) (\u20b950K extra): Additional NPS contribution above 80C limit. Only in Old Regime.',
                    'Section 24 (\u20b92L): Home loan interest deduction for self-occupied property. Old Regime only.',
                    'HRA: Exempt based on min of (actual HRA, 50%/40% of basic, rent minus 10% of basic). Old Regime only.',
                    'Gap = Limit minus Used. Investing the gap amount in eligible instruments can reduce your tax liability.'
                ]} />
            </div>

            {/* Actions */}
            {tax.potentialSavings > 0 && (
                <div style={{ backgroundColor: '#F8FAFC', border: '1px solid #E8ECF1', borderRadius: '8px', padding: '16px', display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
                    <AlertCircle size={18} color="#64748B" style={{ flexShrink: 0, marginTop: '2px' }} />
                    <div style={{ fontSize: '13px', color: '#1E293B' }}>
                        <span style={{ fontWeight: 600 }}>Actions for the User: </span>
                        <span style={{ color: '#64748B' }}>Switching to the {tax.recommended.toLowerCase()} could save you {fmtFull(tax.potentialSavings)} annually. Consider maximizing your deduction utilization to bring your effective tax rate down further.</span>
                    </div>
                </div>
            )}
        </div>
    );
}

export default Tax;
