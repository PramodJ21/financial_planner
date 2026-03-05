import React, { useEffect, useState } from 'react';
import { fetchWithAuth } from '../api';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip as RechartsTooltip } from 'recharts';
import { Link } from 'react-router-dom';
import { AlertTriangle } from 'lucide-react';

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
            fontSize: '11px', fontWeight: 600, padding: '3px 10px', borderRadius: '12px',
            backgroundColor: inRange ? '#ECFDF5' : '#FEF2F2',
            color: inRange ? '#059669' : '#DC2626'
        }}>
            {inRange ? 'On track' : 'Outside range'}
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
    const COLORS_INS = ['#1E293B', '#64748B'];

    const pieData = [
        { name: 'Life Insurance', value: ins.lifeCover },
        { name: 'Health Insurance', value: ins.healthCover }
    ].filter(d => d.value > 0);

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            <div>
                <h1 style={{ fontSize: '20px', fontWeight: 700, color: '#1E293B', marginBottom: '4px' }}>Insurance</h1>
                <p style={{ fontSize: '13px', color: '#64748B' }}>As of {new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
            </div>

            {/* Coverage Summary */}
            <div className="card" style={{ padding: '24px' }}>
                <h2 style={{ fontSize: '16px', fontWeight: 700, color: '#1E293B', marginBottom: '20px' }}>Coverage Summary</h2>
                <div className="chart-table-row">
                    <div className="chart-sidebar">
                        <div style={{ height: '160px' }}>
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie data={pieData.length > 0 ? pieData : [{ name: 'No Coverage', value: 1 }]} innerRadius={50} outerRadius={75} paddingAngle={2} dataKey="value">
                                        {(pieData.length > 0 ? pieData : [{ name: 'No Coverage', value: 1 }]).map((_, i) => <Cell key={i} fill={pieData.length > 0 ? COLORS_INS[i] : '#E8ECF1'} />)}
                                    </Pie>
                                    {pieData.length > 0 && <RechartsTooltip formatter={(val) => fmtFull(val)} contentStyle={{ fontSize: '11px', padding: '4px 8px' }} />}
                                </PieChart>
                            </ResponsiveContainer>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginTop: '8px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '11px', color: '#64748B' }}>
                                <div style={{ width: '8px', height: '8px', borderRadius: '2px', backgroundColor: '#1E293B' }}></div> Life Insurance ({ins.lifePercent}%)
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '11px', color: '#64748B' }}>
                                <div style={{ width: '8px', height: '8px', borderRadius: '2px', backgroundColor: '#64748B' }}></div> Health Insurance ({ins.healthPercent}%)
                            </div>
                        </div>
                    </div>

                    <div style={{ flex: 1 }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                            <thead>
                                <tr style={{ borderBottom: '1px solid #E8ECF1' }}>
                                    <th style={{ padding: '10px 12px', fontSize: '11px', fontWeight: 600, color: '#64748B', textAlign: 'left', textTransform: 'uppercase' }}>Insurance</th>
                                    <th style={{ padding: '10px 12px', fontSize: '11px', fontWeight: 600, color: '#64748B', textAlign: 'right', textTransform: 'uppercase' }}>Cover Amount</th>
                                    <th style={{ padding: '10px 12px', fontSize: '11px', fontWeight: 600, color: '#64748B', textAlign: 'right', textTransform: 'uppercase' }}>Premium (annual)</th>
                                </tr>
                            </thead>
                            <tbody>
                                <tr style={{ borderBottom: '1px solid #F1F5F9' }}>
                                    <td style={{ padding: '14px 12px', fontSize: '13px', fontWeight: 500, color: '#1E293B' }}>Life Insurance</td>
                                    <td style={{ padding: '14px 12px', fontSize: '13px', textAlign: 'right', color: '#1E293B' }}>{fmtFull(ins.lifeCover)}</td>
                                    <td style={{ padding: '14px 12px', fontSize: '13px', textAlign: 'right', color: '#1E293B' }}>{fmtFull(ins.lifePremium)}</td>
                                </tr>
                                <tr style={{ borderBottom: '1px solid #F1F5F9' }}>
                                    <td style={{ padding: '14px 12px', fontSize: '13px', fontWeight: 500, color: '#1E293B' }}>Health Insurance</td>
                                    <td style={{ padding: '14px 12px', fontSize: '13px', textAlign: 'right', color: '#1E293B' }}>{fmtFull(ins.healthCover)}</td>
                                    <td style={{ padding: '14px 12px', fontSize: '13px', textAlign: 'right', color: '#1E293B' }}>{fmtFull(ins.healthPremium)}</td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            {/* Financial Analysis – Emergency Planning */}
            <div>
                <h2 style={{ fontSize: '16px', fontWeight: 700, color: '#1E293B', marginBottom: '16px' }}>Financial Analysis – Emergency Planning</h2>
                <div className="dashboard-3col">
                    {[
                        { label: 'Emergency Funds', actual: emergency.emergencyFunds?.actual || 0, ideal: emergency.emergencyFunds?.ideal || 0 },
                        { label: 'Health Insurance', actual: emergency.healthInsurance?.actual || 0, ideal: emergency.healthInsurance?.ideal || 0 },
                        { label: 'Life Insurance', actual: emergency.lifeInsurance?.actual || 0, ideal: emergency.lifeInsurance?.ideal || 0 }
                    ].map(item => {
                        const min = item.ideal * 0.8;
                        const max = item.ideal * 1.5;
                        const inRange = item.actual >= min && item.actual <= max;
                        return (
                            <div key={item.label} className="card" style={{ padding: '20px' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                                    <span style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', color: '#1E293B', letterSpacing: '0.3px' }}>{item.label}</span>
                                    <StatusBadge actual={item.actual} min={min} max={max} />
                                </div>
                                <div style={{ fontSize: '12px', color: '#94A3B8', marginBottom: '4px' }}>Actual Value</div>
                                <div style={{ fontSize: '20px', fontWeight: 700, color: inRange ? '#059669' : '#DC2626', marginBottom: '8px' }}>{fmt(item.actual)}</div>
                                <div style={{ fontSize: '12px', color: '#94A3B8' }}>Ideal: {fmt(item.ideal)}</div>
                            </div>
                        );
                    })}
                </div>

                {/* Understanding section */}
                <div style={{ borderTop: '1px solid #E8ECF1', marginTop: '20px', paddingTop: '16px' }}>
                    <h4 style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', color: '#1E293B', letterSpacing: '0.3px', marginBottom: '12px' }}>Understanding Insurance & Emergency Planning</h4>
                    <ul style={{ listStyle: 'disc', paddingLeft: '18px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                        <li style={{ fontSize: '12px', color: '#64748B', lineHeight: 1.6 }}>Emergency Fund ideal = 6 months of effective monthly expenses (monthly living costs + prorated annual obligations like insurance & school fees).</li>
                        <li style={{ fontSize: '12px', color: '#64748B', lineHeight: 1.6 }}>Health Insurance ideal = MAX(₹5L, 50% of annual gross income). Family size and city tier may warrant ₹10-25L+ cover.</li>
                        <li style={{ fontSize: '12px', color: '#64748B', lineHeight: 1.6 }}>Life Insurance ideal = 10× annual gross income as a pure Term Plan, applicable only if you have dependents (spouse, children, or elderly parents).</li>
                        <li style={{ fontSize: '12px', color: '#64748B', lineHeight: 1.6 }}>Term plans offer the best premium-to-cover ratio. Endowment/ULIP plans are generally not recommended for pure protection.</li>
                        <li style={{ fontSize: '12px', color: '#64748B', lineHeight: 1.6 }}>Status badge shows "On track" if your actual value is within 80%-150% of the ideal. Outside this range indicates a gap or over-allocation.</li>
                    </ul>
                </div>
            </div>

            {/* Life Insurance Policy Evaluation */}
            <div className="card" style={{ padding: '24px' }}>
                <h2 style={{ fontSize: '16px', fontWeight: 700, color: '#1E293B', marginBottom: '4px' }}>Life Insurance Policy Evaluation</h2>
                <p style={{ fontSize: '12px', color: '#94A3B8', marginBottom: '16px' }}>Including Insurance Portfolios</p>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                        <tr style={{ borderBottom: '1px solid #E8ECF1' }}>
                            {['Policy Name', 'Plan Type', 'Sum Assured', 'Policy Before', 'Annual Premium', 'Life Cover', 'Accident Cover', 'Premium Paid Till Date', 'Premium Expense', 'Suggested Action', 'Surrender Value'].map(h => (
                                <th key={h} style={{ padding: '10px 8px', fontSize: '10px', fontWeight: 600, color: '#64748B', textAlign: 'left', textTransform: 'uppercase', whiteSpace: 'nowrap' }}>{h}</th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {ins.lifeCover > 0 ? (
                            <tr style={{ borderBottom: '1px solid #F1F5F9' }}>
                                <td style={{ padding: '12px 8px', fontSize: '12px', color: '#1E293B' }}>Term Life Policy</td>
                                <td style={{ padding: '12px 8px', fontSize: '12px', color: '#1E293B' }}>Term</td>
                                <td style={{ padding: '12px 8px', fontSize: '12px', color: '#1E293B' }}>{fmtFull(ins.lifeCover)}</td>
                                <td style={{ padding: '12px 8px', fontSize: '12px', color: '#1E293B' }}>—</td>
                                <td style={{ padding: '12px 8px', fontSize: '12px', color: '#1E293B' }}>{fmtFull(ins.lifePremium)}</td>
                                <td style={{ padding: '12px 8px', fontSize: '12px', color: '#1E293B' }}>{fmtFull(ins.lifeCover)}</td>
                                <td style={{ padding: '12px 8px', fontSize: '12px', color: '#1E293B' }}>—</td>
                                <td style={{ padding: '12px 8px', fontSize: '12px', color: '#1E293B' }}>—</td>
                                <td style={{ padding: '12px 8px', fontSize: '12px', color: '#1E293B' }}>—</td>
                                <td style={{ padding: '12px 8px', fontSize: '12px', color: '#1E293B' }}>—</td>
                                <td style={{ padding: '12px 8px', fontSize: '12px', color: '#1E293B' }}>—</td>
                            </tr>
                        ) : (
                            <tr><td colSpan={11} style={{ padding: '40px', textAlign: 'center', color: '#94A3B8', fontSize: '13px' }}>No policies to evaluate</td></tr>
                        )}
                    </tbody>
                </table>
            </div>

            {/* Recommendation Summary */}
            <div className="card" style={{ padding: '24px' }}>
                <h2 style={{ fontSize: '16px', fontWeight: 700, color: '#1E293B', marginBottom: '16px' }}>Recommendation Summary</h2>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                        <tr style={{ borderBottom: '1px solid #E8ECF1' }}>
                            {['Traditional / Life Insurance', 'Sum Assured', 'Premium', 'Term (yrs)', 'Plan Document'].map(h => (
                                <th key={h} style={{ padding: '10px 12px', fontSize: '11px', fontWeight: 600, color: '#64748B', textAlign: 'left', textTransform: 'uppercase' }}>{h}</th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {ins.additionalCoverNeeded > 0 && (
                            <tr style={{ borderBottom: '1px solid #F1F5F9' }}>
                                <td style={{ padding: '12px', fontSize: '13px', fontWeight: 500, color: '#1E293B' }}>Additional Cover Recommended</td>
                                <td style={{ padding: '12px', fontSize: '13px', color: '#1E293B' }}>{fmt(ins.additionalCoverNeeded)}</td>
                                <td style={{ padding: '12px', fontSize: '13px', color: '#1E293B' }}>—</td>
                                <td style={{ padding: '12px', fontSize: '13px', color: '#1E293B' }}>—</td>
                                <td style={{ padding: '12px', fontSize: '13px', color: '#1E293B' }}>—</td>
                            </tr>
                        )}
                        <tr style={{ borderBottom: '1px solid #F1F5F9' }}>
                            <td style={{ padding: '12px', fontSize: '13px', fontWeight: 600, color: '#1E293B' }}>Ideal term life cover: {fmt(ins.idealTermCover)}</td>
                            <td colSpan={4}></td>
                        </tr>
                    </tbody>
                </table>
            </div>

            {/* Impact on Premiums */}
            {ins.additionalCoverNeeded > 0 && (
                <div style={{ backgroundColor: '#F8FAFC', border: '1px solid #E8ECF1', borderRadius: '8px', padding: '16px', display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <AlertTriangle size={20} color="#64748B" />
                    <div style={{ flex: 1 }}>
                        <span style={{ fontSize: '13px', fontWeight: 600, color: '#1E293B' }}>Impact on Premiums: </span>
                        <span style={{ fontSize: '13px', color: '#64748B' }}>Plan your financial protection. Required: {fmt(ins.idealTermCover)}. Shortfall: {fmt(ins.additionalCoverNeeded)}.</span>
                    </div>
                    <span style={{ fontSize: '13px', fontWeight: 700, color: '#1E293B' }}>{fmt(ins.additionalCoverNeeded)}</span>
                </div>
            )}
        </div>
    );
}

export default Insurance;
