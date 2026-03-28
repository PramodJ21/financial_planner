import { useEffect, useState } from 'react';
import { fetchWithAuth } from '../api';
import { Link } from 'react-router-dom';
import { ShieldCheck, Users, Wallet, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { fmtFull } from '../utils/formatCurrency';
import '../styles/estate.css';

function Estate() {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchWithAuth('/dashboard/full').then(res => { setData(res); setLoading(false); }).catch(() => setLoading(false));
    }, []);

    if (loading) return (
        <div className="estate-loading">
            <div className="estate-loading-box"><span>FH</span></div>
            <div className="estate-loading-text">Loading your estate data...</div>
        </div>
    );

    if (!data) return (
        <div className="estate-empty">
            <div className="estate-empty-title">No estate data available</div>
            <Link to="/questionnaire" className="estate-empty-link">Complete your questionnaire to get started</Link>
        </div>
    );

    const will = data.willEstate;

    /* Build narrative */
    let narrative = '';
    if (will.hasWill && will.nomineesSet === 'Yes, all') {
        narrative = 'Your estate planning is in order — you have a will in place and nominees set across all accounts. Review your will annually or after major life events like marriage, new children, or significant asset purchases.';
    } else if (will.hasWill) {
        narrative = `You have a will in place, which is a great foundation. However, nominees are not set on all accounts (status: "${will.nomineesSet}"). Unregistered nominees can cause significant legal delays in asset transfer.`;
    } else if (will.willInProgress) {
        narrative = `Your will is in progress — make sure to complete and register it soon. You have ${will.numNominees} nominee(s) registered. Nominees handle immediate asset transfer; a will covers residual assets not covered by nomination.`;
    } else {
        narrative = `You currently have no will on record. Without a will, assets are distributed under the Hindu Succession Act or personal law — which may not match your wishes. With ${fmtFull(will.totalInvestment)} in investments and ${fmtFull(will.insuranceCover)} in insurance cover, estate planning is important.`;
    }

    const nominationRows = [
        { type: 'Bank Accounts', set: will.nomineesSet === 'Yes, all' || will.nomineesSet === 'Yes, some' },
        { type: 'Demat Account', set: will.nomineesSet === 'Yes, all' },
        { type: 'Insurance Policies', set: will.nomineesSet === 'Yes, all' },
        { type: 'PF / NPS', set: will.nomineesSet === 'Yes, all' || will.nomineesSet === 'Yes, some' },
        { type: 'Mutual Funds', set: will.nomineesSet === 'Yes, all' },
    ];

    const allNomineesSet = nominationRows.every(r => r.set);
    const someNomineesSet = nominationRows.some(r => r.set);

    return (
        <div className="estate-content">

            {/* PAGE HEADER */}
            <div className="estate-header">
                <div>
                    <div className="estate-super">Explore — Estate & Will</div>
                    <h1 className="estate-title">Will & Estate</h1>
                </div>
            </div>

            {/* NARRATIVE */}
            <div className="estate-narrative">
                <div className="estate-narrative-label">Estate Summary</div>
                <p className="estate-narrative-text">{narrative}</p>
            </div>

            {/* WILL STATUS */}
            <div>
                <div className="estate-label">Will Status</div>
                <div className="estate-analysis-grid">
                    <div className="estate-analysis-item">
                        <div className="estate-analysis-item-header">
                            <span className="estate-analysis-item-title">Will Status</span>
                            <span className={`estate-status-pill ${will.hasWill ? 'estate-on' : 'estate-outside'}`}>
                                {will.hasWill ? 'Created' : will.willInProgress ? 'In Progress' : 'Not Created'}
                            </span>
                        </div>
                        <div className="estate-analysis-sub">Current status</div>
                        <div className={`estate-analysis-value ${will.hasWill ? 'estate-ok' : 'estate-warn'}`} style={{ fontSize: '22px' }}>
                            {will.hasWill ? 'Registered' : will.willInProgress ? 'In Progress' : 'Not Created'}
                        </div>
                        <div className="estate-analysis-ideal">
                            {will.hasWill
                                ? 'Review annually or after major life events'
                                : 'A registered will ensures your assets are distributed as intended'}
                        </div>
                    </div>

                    <div className="estate-analysis-item">
                        <div className="estate-analysis-item-header">
                            <span className="estate-analysis-item-title">Nominee Coverage</span>
                            <span className={`estate-status-pill ${allNomineesSet ? 'estate-on' : someNomineesSet ? 'estate-warn' : 'estate-outside'}`}>
                                {allNomineesSet ? 'Complete' : someNomineesSet ? 'Partial' : 'Not Set'}
                            </span>
                        </div>
                        <div className="estate-analysis-sub">Across all accounts</div>
                        <div className={`estate-analysis-value ${allNomineesSet ? 'estate-ok' : 'estate-warn'}`} style={{ fontSize: '22px' }}>
                            {will.nomineesSet || 'Not Set'}
                        </div>
                        <div className="estate-analysis-ideal">
                            {allNomineesSet
                                ? 'All accounts have nominees registered'
                                : 'Set nominees on all accounts to ensure smooth asset transfer'}
                        </div>
                    </div>

                    <div className="estate-analysis-item">
                        <div className="estate-analysis-item-header">
                            <span className="estate-analysis-item-title">Total Nominees</span>
                        </div>
                        <div className="estate-analysis-sub">Registered nominees</div>
                        <div className="estate-analysis-value estate-ok" style={{ fontSize: '36px' }}>{will.numNominees}</div>
                        <div className="estate-analysis-ideal">
                            {will.numNominees === 0
                                ? 'No nominees registered — add nominees to all financial accounts'
                                : `${will.numNominees} nominee(s) on record`}
                        </div>
                    </div>
                </div>
            </div>

            {/* PORTFOLIO AT STAKE */}
            <div>
                <div className="estate-label">Portfolio at Stake</div>
                <h2 className="estate-section-heading">Assets Without Estate Cover</h2>
                <div className="estate-analysis-grid estate-two-col">
                    <div className="estate-analysis-item">
                        <div className="estate-analysis-item-header">
                            <span className="estate-analysis-item-title">Total Investments</span>
                            <Wallet size={16} color="var(--ink-ghost)" strokeWidth={1.5} />
                        </div>
                        <div className="estate-analysis-sub">Portfolio value</div>
                        <div className="estate-analysis-value estate-ok">{fmtFull(will.totalInvestment)}</div>
                        <div className="estate-analysis-ideal">Subject to legal distribution without a will</div>
                    </div>
                    <div className="estate-analysis-item">
                        <div className="estate-analysis-item-header">
                            <span className="estate-analysis-item-title">Insurance Cover</span>
                            <ShieldCheck size={16} color="var(--ink-ghost)" strokeWidth={1.5} />
                        </div>
                        <div className="estate-analysis-sub">Total cover amount</div>
                        <div className="estate-analysis-value estate-ok">{fmtFull(will.insuranceCover)}</div>
                        <div className="estate-analysis-ideal">Paid to nominees — not covered by will</div>
                    </div>
                </div>
            </div>

            {/* NOMINATION STATUS TABLE */}
            <div>
                <div className="estate-label">Nomination Status</div>
                <h2 className="estate-section-heading">Account-wise Nomination</h2>
                <div className="estate-table-scroll-wrapper">
                    <table className="estate-table">
                        <thead>
                            <tr>
                                <th>Account Type</th>
                                <th>Nominee Set?</th>
                                <th style={{ textAlign: 'right' }}>Status</th>
                            </tr>
                        </thead>
                        <tbody>
                            {nominationRows.map((row, i) => (
                                <tr key={i}>
                                    <td><span className="estate-asset-name">{row.type}</span></td>
                                    <td>{row.set ? 'Yes' : 'No'}</td>
                                    <td style={{ textAlign: 'right' }}>
                                        <span className={row.set ? 'estate-cat-good' : 'estate-status-text-pending'}>
                                            {row.set ? 'Complete' : 'Pending'}
                                        </span>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* UNDERSTANDING */}
            <div className="estate-understanding">
                <div className="estate-understanding-title">Understanding Will & Estate Planning</div>
                <div className="estate-understanding-grid">
                    <div className="estate-understanding-item">
                        <div className="estate-understanding-item-title">Why a Will matters</div>
                        <div className="estate-understanding-item-desc">A will specifies how your assets are distributed after death. Without one, Indian succession laws apply — which may not align with your wishes, especially for blended families or business interests.</div>
                    </div>
                    <div className="estate-understanding-item">
                        <div className="estate-understanding-item-title">Nominees vs. Legal Heirs</div>
                        <div className="estate-understanding-item-desc">Nominees receive assets directly and quickly, bypassing probate. However, they are trustees — legal heirs can still claim ownership. A will clarifies final distribution and overrides nominee conflicts.</div>
                    </div>
                    <div className="estate-understanding-item">
                        <div className="estate-understanding-item-title">What to nominate</div>
                        <div className="estate-understanding-item-desc">Set nominees on bank accounts, demat accounts, mutual funds, insurance policies, EPF, PPF, and NPS. Many accounts require re-nomination after marriage or the birth of a child.</div>
                    </div>
                    <div className="estate-understanding-item">
                        <div className="estate-understanding-item-title">When to update your will</div>
                        <div className="estate-understanding-item-desc">Review your will after marriage, divorce, childbirth, death of a beneficiary, or major asset acquisition or sale. An outdated will can cause disputes and delays in settlement.</div>
                    </div>
                </div>
            </div>

            {/* CTA */}
            <div className="estate-cta">
                <div>
                    <div className="estate-cta-title">Secure your estate plan</div>
                    <div className="estate-cta-desc">A registered will and complete nominations protect your family from legal delays and ensure your wealth reaches the right people.</div>
                </div>
                <Link to="/reports" className="estate-cta-link">View Action Plan ↗</Link>
            </div>
        </div>
    );
}

export default Estate;
