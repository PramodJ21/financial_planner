import React, { useEffect, useState } from 'react';
import { fetchWithAuth } from '../api';
import { Link } from 'react-router-dom';
import { ShieldCheck, Users, Wallet, AlertTriangle, CheckCircle2 } from 'lucide-react';

import { fmt, fmtFull } from '../utils/formatCurrency';

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
        <div className="page-content">
            
            {/* PAGE HEADER */}
            <div className="page-header" style={{ alignItems: 'center' }}>
                <div>
                    <div className="page-title">Will & Estate</div>
                </div>
                <button className="btn-dark">+ Create Will</button>
            </div>

            {/* Will Status Alert */}
            <div style={{ padding: '24px 0', borderBottom: '0.5px solid var(--ink-ghost)' }}>
                <div style={{ display: 'flex', gap: '8px', alignItems: 'flex-start' }}>
                    {will.hasWill ? (
                        <CheckCircle2 size={16} color="var(--ink)" style={{ marginTop: '2px' }} />
                    ) : (
                        <AlertTriangle size={16} color="#A05E5C" style={{ marginTop: '2px' }} />
                    )}
                    <div>
                        <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--ink)' }}>
                            {will.hasWill ? 'Will Created' : will.willInProgress ? 'Will In Progress' : 'No Will Created'}
                        </div>
                        <div style={{ fontSize: '12px', color: 'var(--ink-soft)', marginTop: '2px' }}>
                            {will.hasWill
                                ? 'Your will is registered. Review it annually or when major life events occur.'
                                : "Protect your family's future by creating a comprehensive will and estate plan."}
                        </div>
                    </div>
                </div>
            </div>

            {/* Nominee Summary */}
            <div style={{ marginTop: '32px' }}>
                <div className="act-label">Nominee Summary</div>
                <div className="analysis-grid" style={{ marginTop: '16px' }}>
                    <div className="analysis-item">
                        <div className="analysis-item-header" style={{ marginBottom: '12px' }}>
                            <span className="analysis-item-title">Total Investment</span>
                            <Wallet size={20} color="var(--ink-ghost)" strokeWidth={1.5} />
                        </div>
                        <div className="analysis-value">{fmtFull(will.totalInvestment)}</div>
                    </div>

                    <div className="analysis-item">
                        <div className="analysis-item-header" style={{ marginBottom: '12px' }}>
                            <span className="analysis-item-title">Insurance Cover</span>
                            <ShieldCheck size={20} color="var(--ink-ghost)" strokeWidth={1.5} />
                        </div>
                        <div className="analysis-value">{fmtFull(will.insuranceCover)}</div>
                    </div>

                    <div className="analysis-item">
                        <div className="analysis-item-header" style={{ marginBottom: '12px' }}>
                            <span className="analysis-item-title">Total Nominees</span>
                            <Users size={20} color="var(--ink-ghost)" strokeWidth={1.5} />
                        </div>
                        <div className="analysis-value">{will.numNominees}</div>
                    </div>
                </div>
            </div>

            {/* Nomination Status */}
            <div style={{ marginTop: '32px' }}>
                <div className="act-label">Nomination Status</div>
                <div className="table-scroll-wrapper" style={{ marginTop: '16px' }}>
                    <table className="liab-table">
                        <thead>
                            <tr>
                                <th>Account Type</th>
                                <th style={{ textAlign: 'right', paddingRight: '120px' }}>Nominee Set?</th>
                                <th style={{ textAlign: 'right' }}>Status</th>
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
                                <tr key={i}>
                                    <td><span className="asset-name">{row.type}</span></td>
                                    <td style={{ textAlign: 'right', paddingRight: '120px' }}>{row.set ? 'Yes' : 'No'}</td>
                                    <td style={{ textAlign: 'right' }}>
                                        <span className={row.set ? "cat-good" : "status-text-pending"}>
                                            {row.set ? 'Complete' : 'Pending'}
                                        </span>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}

export default Estate;
