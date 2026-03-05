import React, { useEffect, useState } from 'react';
import { fetchWithAuth } from '../api';
import { Link } from 'react-router-dom';
import { ShieldCheck, Users, Wallet, AlertTriangle, CheckCircle2 } from 'lucide-react';

const fmt = (val) => {
    const n = Number(val) || 0;
    if (n >= 10000000) return '₹' + (n / 10000000).toFixed(1) + 'Cr';
    if (n >= 100000) return '₹' + (n / 100000).toFixed(1) + 'L';
    if (n >= 1000) return '₹' + (n / 1000).toFixed(1) + 'K';
    return '₹' + n.toLocaleString('en-IN');
};
const fmtFull = (val) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(val || 0);

function Estate() {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchWithAuth('/dashboard/full').then(res => { setData(res); setLoading(false); }).catch(() => setLoading(false));
    }, []);

    if (loading) return <div>Loading...</div>;
    if (!data) return <div>No data. <Link to="/questionnaire">Complete questionnaire</Link></div>;

    const will = data.willEstate;

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <h1 style={{ fontSize: '20px', fontWeight: 700, color: '#1E293B' }}>Will & Estate</h1>
                <button style={{
                    display: 'flex', alignItems: 'center', gap: '6px',
                    padding: '10px 20px', borderRadius: '8px',
                    border: '1px solid #E8ECF1', backgroundColor: 'white',
                    fontSize: '13px', fontWeight: 600, color: '#1E293B',
                    cursor: 'pointer'
                }}>
                    + Create Will
                </button>
            </div>

            {/* Will Status */}
            <div style={{
                backgroundColor: '#F8FAFC',
                border: '1px solid #E8ECF1',
                borderRadius: '12px',
                padding: '20px',
                display: 'flex',
                alignItems: 'flex-start',
                gap: '12px'
            }}>
                {will.hasWill ? (
                    <CheckCircle2 size={20} color="#1E293B" style={{ flexShrink: 0, marginTop: '2px' }} />
                ) : (
                    <AlertTriangle size={20} color="#64748B" style={{ flexShrink: 0, marginTop: '2px' }} />
                )}
                <div>
                    <p style={{ fontWeight: 700, color: '#1E293B', fontSize: '14px', marginBottom: '4px' }}>
                        {will.hasWill ? 'Will Created' : will.willInProgress ? 'Will In Progress' : 'No Will Created'}
                    </p>
                    <p style={{ fontSize: '13px', color: '#64748B' }}>
                        {will.hasWill
                            ? 'Your will is registered. Review it annually or when major life events occur.'
                            : "Protect your family's future by creating a comprehensive will and estate plan."}
                    </p>
                </div>
            </div>

            {/* Nominee Summary */}
            <div className="card" style={{ padding: '24px' }}>
                <h2 style={{ fontSize: '16px', fontWeight: 700, color: '#1E293B', marginBottom: '20px' }}>Nominee Summary</h2>
                <div className="estate-grid">
                    <div style={{ border: '1px solid #E8ECF1', borderRadius: '12px', padding: '20px', backgroundColor: '#FAFAFA' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                            <div>
                                <div style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', color: '#1E293B', letterSpacing: '0.3px', marginBottom: '8px' }}>Total Investment</div>
                                <div style={{ fontSize: '22px', fontWeight: 700, color: '#1E293B' }}>{fmtFull(will.totalInvestment)}</div>
                            </div>
                            <Wallet size={22} color="#64748B" />
                        </div>
                    </div>

                    <div style={{ border: '1px solid #E8ECF1', borderRadius: '12px', padding: '20px', backgroundColor: '#FAFAFA' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                            <div>
                                <div style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', color: '#1E293B', letterSpacing: '0.3px', marginBottom: '8px' }}>Insurance Cover</div>
                                <div style={{ fontSize: '22px', fontWeight: 700, color: '#1E293B' }}>{fmtFull(will.insuranceCover)}</div>
                            </div>
                            <ShieldCheck size={22} color="#64748B" />
                        </div>
                    </div>

                    <div style={{ border: '1px solid #E8ECF1', borderRadius: '12px', padding: '20px', backgroundColor: '#FAFAFA' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                            <div>
                                <div style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', color: '#1E293B', letterSpacing: '0.3px', marginBottom: '8px' }}>Total Nominee</div>
                                <div style={{ fontSize: '22px', fontWeight: 700, color: '#1E293B' }}>{will.numNominees}</div>
                            </div>
                            <Users size={22} color="#64748B" />
                        </div>
                    </div>
                </div>
            </div>

            {/* Nomination Status */}
            <div className="card" style={{ padding: '24px' }}>
                <h2 style={{ fontSize: '16px', fontWeight: 700, color: '#1E293B', marginBottom: '16px' }}>Nomination Status</h2>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                        <tr style={{ borderBottom: '1px solid #E8ECF1' }}>
                            {['Account Type', 'Nominee Set?', 'Status'].map(h => (
                                <th key={h} style={{ padding: '10px 12px', fontSize: '11px', fontWeight: 600, color: '#64748B', textAlign: 'left', textTransform: 'uppercase' }}>{h}</th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {[
                            { type: 'Bank Accounts', set: will.nomineesSet === 'Yes, all' || will.nomineesSet === 'Yes, some' },
                            { type: 'Demat Account', set: will.nomineesSet === 'Yes, all' },
                            { type: 'Insurance Policies', set: will.nomineesSet === 'Yes, all' },
                            { type: 'PF / NPS', set: will.nomineesSet === 'Yes, all' || will.nomineesSet === 'Yes, some' },
                            { type: 'Mutual Funds', set: will.nomineesSet === 'Yes, all' },
                        ].map((row, i) => (
                            <tr key={i} style={{ borderBottom: '1px solid #F1F5F9' }}>
                                <td style={{ padding: '14px 12px', fontSize: '13px', fontWeight: 500, color: '#1E293B' }}>{row.type}</td>
                                <td style={{ padding: '14px 12px', fontSize: '13px', color: '#1E293B' }}>{row.set ? 'Yes' : 'No'}</td>
                                <td style={{ padding: '14px 12px' }}>
                                    <span style={{
                                        fontSize: '11px', fontWeight: 600, padding: '3px 10px', borderRadius: '12px',
                                        backgroundColor: row.set ? '#ECFDF5' : '#FEF2F2',
                                        color: row.set ? '#059669' : '#DC2626'
                                    }}>
                                        {row.set ? 'Complete' : 'Pending'}
                                    </span>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}

export default Estate;
