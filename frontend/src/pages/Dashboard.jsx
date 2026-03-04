import React, { useEffect, useState } from 'react';
import { fetchWithAuth } from '../api';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip as RechartsTooltip } from 'recharts';
import { Link } from 'react-router-dom';
import { ArrowUpRight, AlertTriangle, Wallet, ShieldCheck, Users } from 'lucide-react';

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
    let n = Number(val) || 0;
    let sign = '';
    if (n < 0) {
        sign = '-';
        n = Math.abs(n);
    }
    if (n >= 10000000) return sign + '₹' + (n / 10000000).toFixed(1) + 'Cr';
    if (n >= 100000) return sign + '₹' + (n / 100000).toFixed(1) + 'L';
    if (n >= 1000) return sign + '₹' + (n / 1000).toFixed(1) + 'K';
    return sign + '₹' + n.toLocaleString('en-IN');
};
const fmtFull = (val) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(val || 0);

const PieLegendItem = ({ color, label, percent }) => (
    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', color: '#1E293B' }}>
        <div style={{ width: '8px', height: '8px', backgroundColor: color, borderRadius: '2px' }}></div>
        <span style={{ fontWeight: 600 }}>{label} ({Math.round(percent)}%)</span>
    </div>
);

const SectionHeader = ({ title, link, date }) => (
    <div style={{ marginBottom: '24px' }}>
        {link ? (
            <Link to={link} style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '4px' }}>
                <h2 style={{ fontSize: '14px', fontWeight: 700, color: '#1E293B', margin: 0, textTransform: 'uppercase' }}>{title}</h2>
                <ArrowUpRight size={16} color="#1E293B" />
            </Link>
        ) : (
            <h2 style={{ fontSize: '14px', fontWeight: 700, color: '#1E293B', margin: 0, textTransform: 'uppercase' }}>{title}</h2>
        )}
        {date && <div style={{ fontSize: '10px', color: '#94A3B8', marginTop: '4px' }}>As of {date}</div>}
    </div>
);

const StatusBadge = ({ actual, min, max }) => {
    const inRange = actual >= min && (max === undefined || actual <= max);
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

function Dashboard() {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('Emergency Planning');

    useEffect(() => {
        fetchWithAuth('/dashboard/full').then(res => {
            setData(res);
            if (res?.overview?.lifeStage?.stage) {
                localStorage.setItem('lifeStage', res.overview.lifeStage.stage);
            }
            setLoading(false);
        }).catch(() => setLoading(false));
    }, []);

    if (loading) return <div>Loading...</div>;
    if (!data) return <div>No data. <Link to="/questionnaire">Complete questionnaire</Link></div>;

    const { overview, investments, liabilities, insurance } = data;
    const currentDate = new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' });

    // Define chart colors
    const NEUTRAL_PALETTE = ['#1E293B', '#3B82F6', '#F5A623', '#F59E0B', '#CBD5E1'];

    // Specific colors for Asset block based on screenshot
    const ASSET_COLORS = {
        equity: '#1E293B', // Dark Navy
        realEstate: '#475569', // Gray (placeholder since 0% in screenshot)
        commodity: '#3B82F6', // Vibrant Blue
        debt: '#F5A623', // Amber/Yellow
        altInvestments: '#CBD5E1' // Light Gray
    };

    // FBS Position
    const fbs = overview.fbs;

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>

            {/* 1. Top Banner */}
            <div style={{ display: 'flex', gap: '16px' }}>
                <div className="card" style={{ flex: 2, padding: '24px', display: 'flex', flexDirection: 'column', justifyContent: 'center', backgroundColor: '#F8FAFC' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div>
                            <h3 style={{ fontSize: '16px', fontWeight: 700, color: '#1E293B', marginBottom: '8px' }}>Want to update your financial data?</h3>
                            <p style={{ fontSize: '13px', color: '#64748B', margin: 0 }}>Keep your profile updated for the most accurate analysis.</p>
                        </div>
                        <Link to="/questionnaire" style={{ textDecoration: 'none', border: '1px solid #1E293B', padding: '10px 24px', borderRadius: '8px', fontSize: '13px', fontWeight: 600, color: '#1E293B', backgroundColor: 'transparent', display: 'flex', alignItems: 'center' }}>
                            Edit Questionnaire
                        </Link>
                    </div>
                </div>

                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    <div className="card" style={{ padding: '20px', flex: 1 }}>
                        <div style={{ fontSize: '11px', color: '#64748B', textTransform: 'uppercase', marginBottom: '8px', fontWeight: 600 }}>Generation Profile</div>
                        <div style={{ fontSize: '18px', fontWeight: 600, color: '#1E293B' }}>{overview.generation}</div>
                    </div>
                    <div className="card" style={{ padding: '20px', flex: 1 }}>
                        <div style={{ fontSize: '11px', color: '#64748B', textTransform: 'uppercase', marginBottom: '8px', fontWeight: 600 }}>Life Stage</div>
                        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                            <div style={{ fontSize: '18px', fontWeight: 600, color: '#1E293B' }}>{overview.lifeStage.stage}</div>
                            <div style={{ backgroundColor: '#F1F5F9', color: '#475569', fontSize: '10px', padding: '4px 8px', borderRadius: '4px', fontWeight: 600 }}>Age: {overview.lifeStage.ageRange}</div>
                        </div>
                    </div>
                </div>
            </div>

            {/* 2. Your Financial Profile */}
            <div className="card" style={{ padding: '24px' }}>
                <h2 style={{ fontSize: '16px', fontWeight: 700, color: '#1E293B', marginBottom: '24px' }}>Your Financial Profile</h2>

                <div style={{ display: 'flex', gap: '40px', borderBottom: '1px solid #E8ECF1', paddingBottom: '32px', marginBottom: '24px' }}>
                    {/* FBS */}
                    <div style={{ flex: 1, borderRight: '1px solid #E8ECF1', paddingRight: '40px' }}>
                        <div style={{ fontSize: '12px', color: '#64748B', display: 'flex', gap: '4px', alignItems: 'center', fontWeight: 600 }}>
                            FBS <span style={{ fontSize: '10px', fontWeight: 500 }}>(Financial Behaviour Score)</span>
                        </div>
                        <div style={{ position: 'relative', marginTop: '40px', marginBottom: '20px' }}>
                            <div style={{ position: 'absolute', left: `${fbs}%`, top: '-36px', transform: 'translateX(-50%)', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                                <div style={{ backgroundColor: '#1E293B', color: 'white', padding: '4px 8px', borderRadius: '4px', fontSize: '14px', fontWeight: 700 }}>{fbs}</div>
                                <div style={{ width: '2px', height: '12px', backgroundColor: '#1E293B' }}></div>
                            </div>
                            <div style={{ display: 'flex', gap: '4px', height: '16px' }}>
                                <div style={{ flex: 1, backgroundColor: '#FECACA', borderRadius: '8px 0 0 8px' }}></div>
                                <div style={{ flex: 1, backgroundColor: '#FDE047' }}></div>
                                <div style={{ flex: 1, backgroundColor: '#D9F99D' }}></div>
                                <div style={{ flex: 1, backgroundColor: '#86EFAC' }}></div>
                                <div style={{ flex: 1, backgroundColor: '#4ADE80', borderRadius: '0 8px 8px 0' }}></div>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px', color: '#94A3B8', marginTop: '8px', fontWeight: 600 }}>
                                <span>0</span>
                                <span>100</span>
                            </div>
                        </div>
                    </div>
                    {/* MoneySign & Biases */}
                    <div style={{ flex: 1 }}>
                        <div style={{ fontSize: '12px', color: '#64748B', fontWeight: 600, marginBottom: '12px' }}>MoneySign®</div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px' }}>
                            <div style={{ width: '32px', height: '32px', borderRadius: '50%', backgroundColor: '#F8FAFC', border: '1px solid #E8ECF1', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '16px' }}>{overview.moneySign.icon}</div>
                            <span style={{ fontSize: '16px', fontWeight: 600, color: '#1E293B' }}>{overview.moneySign.name}</span>
                        </div>
                        <div style={{ fontSize: '12px', color: '#64748B', marginBottom: '12px', fontWeight: 600 }}>Behavioural Biases</div>
                        <ul style={{ margin: 0, paddingLeft: '16px', color: '#1E293B', fontSize: '12px', lineHeight: 1.8 }}>
                            {overview.biases.map(b => (
                                <li key={b.name} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                    <div style={{ width: '4px', height: '4px', backgroundColor: '#64748B', borderRadius: '50%' }}></div>
                                    <span title={b.desc} style={{ cursor: 'help' }}>{b.name}</span>
                                </li>
                            ))}
                        </ul>
                    </div>
                </div>

                {/* Net Worth, Surplus, Credit Score */}
                <div style={{ display: 'flex', gap: '16px' }}>
                    <div style={{ flex: 2, backgroundColor: '#F8FAFC', border: '1px solid #E8ECF1', borderRadius: '8px', padding: '24px', display: 'flex' }}>
                        <div style={{ flex: 1 }}>
                            <div style={{ fontSize: '13px', fontWeight: 700, color: '#1E293B', marginBottom: '16px' }}>Current Net Worth</div>
                            <div style={{ fontSize: '28px', fontWeight: 700, color: '#1E293B' }}>{fmt(overview.netWorth?.netWorth)}</div>
                        </div>
                        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '24px', borderLeft: '1px solid #E8ECF1', paddingLeft: '24px', justifyContent: 'center' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
                                <span style={{ color: '#64748B' }}>Assets</span>
                                <span style={{ fontWeight: 600, color: '#1E293B' }}>{fmt(overview.investments.total)}</span>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
                                <span style={{ color: '#64748B' }}>Liabilities</span>
                                <span style={{ fontWeight: 600, color: '#1E293B' }}>{fmt(overview.liabilities.total)}</span>
                            </div>
                        </div>
                    </div>
                    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '16px' }}>
                        <div style={{ border: '1px solid #E8ECF1', borderRadius: '8px', padding: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flex: 1 }}>
                            <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                                <div style={{ width: '28px', height: '28px', backgroundColor: '#F1F5F9', borderRadius: '4px', display: 'flex', alignItems: 'center', justifyItems: 'center' }}>
                                    <div style={{ margin: 'auto' }}><Wallet size={14} color="#475569" /></div>
                                </div>
                                <div>
                                    <div style={{ fontSize: '13px', fontWeight: 700, color: '#1E293B' }}>Surplus</div>
                                    <div style={{ fontSize: '10px', color: '#94A3B8', marginTop: '2px' }}>As of {currentDate}</div>
                                </div>
                            </div>
                            <div style={{ fontSize: '20px', fontWeight: 700, color: '#1E293B' }}>{fmt(overview.surplus.monthly)}</div>
                        </div>
                        <div style={{ border: '1px solid #E8ECF1', borderRadius: '8px', padding: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flex: 1 }}>
                            <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                                <div style={{ width: '28px', height: '28px', backgroundColor: '#F1F5F9', borderRadius: '4px', display: 'flex', alignItems: 'center', justifyItems: 'center' }}>
                                    <div style={{ margin: 'auto' }}><ShieldCheck size={14} color="#475569" /></div>
                                </div>
                                <div>
                                    <div style={{ fontSize: '13px', fontWeight: 700, color: '#1E293B' }}>Credit Score</div>
                                    <div style={{ fontSize: '10px', color: '#94A3B8', marginTop: '2px' }}>As of {currentDate}</div>
                                </div>
                            </div>
                            <div style={{ fontSize: '20px', fontWeight: 700, color: '#1E293B' }}>{overview.creditScore || '-'}</div>
                        </div>
                    </div>
                </div>
                <SectionNote lines={[
                    'Net Worth = Total Assets (investments + savings + real estate) minus Total Liabilities (all loans + credit card outstanding).',
                    'Surplus = Monthly take-home income minus all monthly expenses and EMIs. A positive surplus means you have room to invest.',
                    'Credit Score is sourced from CIBIL/Experian. 750+ is considered good. It affects your loan eligibility and interest rates.'
                ]} />
            </div>

            {/* 3. Assets */}
            <div className="card" style={{ padding: '24px' }}>
                <Link to="/investments" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '4px', marginBottom: '24px' }}>
                    <h2 style={{ fontSize: '16px', fontWeight: 700, color: '#1E293B', margin: 0 }}>Assets</h2>
                    <ArrowUpRight size={18} color="#1E293B" />
                </Link>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px' }}>
                    <div style={{ border: '1px solid #E8ECF1', borderRadius: '8px', padding: '20px' }}>
                        <div style={{ fontSize: '12px', fontWeight: 600, color: '#1E293B', marginBottom: '20px' }}>Total Asset Portfolio</div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                            {Object.entries(overview.investments.allocation).map(([k, v], i) => (
                                <div key={k} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', color: '#1E293B' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                        <div style={{ width: '8px', height: '8px', backgroundColor: ASSET_COLORS[k] || '#E8ECF1' }}></div>
                                        <span style={{ textTransform: 'capitalize', color: '#64748B' }}>{k.replace(/([A-Z])/g, ' $1').trim()}:</span>
                                    </div>
                                    <span style={{ fontWeight: 600 }}>{Math.round(v)}%</span>
                                </div>
                            ))}
                        </div>
                    </div>
                    <div style={{ border: '1px solid #E8ECF1', borderRadius: '8px', padding: '20px' }}>
                        <div style={{ fontSize: '12px', fontWeight: 600, color: '#1E293B', marginBottom: '4px' }}>No. of Mutual Funds</div>
                        <div style={{ fontSize: '10px', color: '#94A3B8', marginBottom: '20px' }}>As of {currentDate}</div>
                        <div style={{ fontSize: '14px', color: '#1E293B', fontWeight: 600 }}>{overview.investments.numMutualFunds || 'No Mutual Funds'}</div>
                    </div>
                    <div style={{ border: '1px solid #E8ECF1', borderRadius: '8px', padding: '20px' }}>
                        <div style={{ fontSize: '12px', fontWeight: 600, color: '#1E293B', marginBottom: '4px' }}>Mutual Fund Portfolio Value</div>
                        <div style={{ fontSize: '10px', color: '#94A3B8', marginBottom: '20px' }}>As of {currentDate}</div>
                        <div style={{ fontSize: '24px', fontWeight: 700, color: '#1E293B' }}>{fmtFull(overview.investments.mfValue)}</div>
                    </div>
                    <div style={{ border: '1px solid #E8ECF1', borderRadius: '8px', padding: '20px' }}>
                        <div style={{ fontSize: '12px', fontWeight: 600, color: '#1E293B', marginBottom: '4px' }}>Avg Portfolio Score</div>
                        <div style={{ fontSize: '10px', color: '#94A3B8', marginBottom: '20px' }}>As of {currentDate}</div>
                        <div style={{ fontSize: '24px', fontWeight: 700, color: '#1E293B', marginBottom: '16px' }}>—</div>
                        <div style={{ fontSize: '10px', color: '#94A3B8' }}>Based on the 1 Finance proprietary research</div>
                    </div>
                </div>
                <SectionNote lines={[
                    'Asset allocation percentages are based on current market value of each asset class divided by your total portfolio value.',
                    'Equity includes direct stocks + equity mutual funds. Debt includes FDs, debt funds, EPF/PPF/NPS. Commodity = gold/commodities.',
                    'Ideal allocation depends on your age and risk profile — younger investors can hold more equity, older investors should shift towards debt.'
                ]} />
            </div>
            {/* 4. Financial Analysis */}
            <div className="card" style={{ padding: '24px' }}>
                <h2 style={{ fontSize: '16px', fontWeight: 700, color: '#1E293B', marginBottom: '24px' }}>Financial Analysis</h2>
                <div style={{ display: 'flex', gap: '24px', borderBottom: '1px solid #E8ECF1', marginBottom: '24px' }}>
                    {['Emergency Planning', 'Expense and Liability Management', 'Asset Allocation'].map(tab => (
                        <div key={tab}
                            onClick={() => setActiveTab(tab)}
                            style={{
                                paddingBottom: '12px', fontSize: '13px', fontWeight: 600, cursor: 'pointer',
                                color: activeTab === tab ? '#1E293B' : '#94A3B8',
                                borderBottom: activeTab === tab ? '2px solid #1E293B' : '2px solid transparent'
                            }}>
                            {tab}
                        </div>
                    ))}
                </div>

                {/* Tabs Content */}
                {activeTab === 'Emergency Planning' && (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px' }}>
                        {[
                            { label: 'Emergency Funds', actual: overview.emergency.emergencyFunds.actual, ideal: overview.emergency.emergencyFunds.ideal, inRange: overview.emergency.emergencyFunds.actual >= overview.emergency.emergencyFunds.ideal },
                            { label: 'Health Insurance', actual: overview.emergency.healthInsurance.actual, ideal: overview.emergency.healthInsurance.ideal, inRange: overview.emergency.healthInsurance.actual >= overview.emergency.healthInsurance.ideal },
                            { label: 'Life Insurance', actual: overview.emergency.lifeInsurance.actual, ideal: overview.emergency.lifeInsurance.ideal, inRange: overview.emergency.lifeInsurance.actual >= overview.emergency.lifeInsurance.ideal }
                        ].map(item => (
                            <div key={item.label} style={{ border: '1px solid #E8ECF1', borderRadius: '8px', padding: '20px', backgroundColor: '#FFFFFF', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
                                    <span style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', color: '#1E293B', letterSpacing: '0.3px', maxWidth: '120px' }}>{item.label}</span>
                                    <StatusBadge actual={item.actual} min={item.ideal} />
                                </div>
                                <div style={{ fontSize: '12px', color: '#94A3B8', marginBottom: '4px' }}>Actual Value</div>
                                <div style={{ fontSize: '20px', fontWeight: 700, color: item.inRange ? '#16A34A' : '#DC2626', marginBottom: '8px' }}>{item.actual > 0 ? fmt(item.actual) : '₹0'}</div>
                                <div style={{ fontSize: '12px', color: '#94A3B8' }}>Ideal: {item.ideal > 0 ? fmt(item.ideal) : '₹0'}</div>
                            </div>
                        ))}
                    </div>
                )}

                {activeTab === 'Expense and Liability Management' && (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px' }}>
                        {liabilities.ratios.map(r => {
                            const inRange = r.actual >= r.idealMin && (r.idealMax === undefined || r.actual <= r.idealMax);
                            const valColor = inRange ? '#16A34A' : '#DC2626';
                            return (
                                <div key={r.name} style={{ border: '1px solid #E8ECF1', borderRadius: '8px', padding: '20px', backgroundColor: '#FFFFFF', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
                                        <div style={{ fontSize: '13px', fontWeight: 600, color: '#1E293B', paddingRight: '12px', textTransform: 'uppercase', letterSpacing: '0.3px', maxWidth: '140px' }}>{r.name}</div>
                                        <StatusBadge actual={r.actual} min={r.idealMin} max={r.idealMax} />
                                    </div>
                                    <div style={{ fontSize: '12px', color: '#94A3B8', marginBottom: '4px' }}>Actual Value</div>
                                    <div style={{ fontSize: '20px', fontWeight: 700, color: valColor, marginBottom: '8px' }}>{fmt(r.actual)}</div>
                                    <div style={{ fontSize: '12px', color: '#94A3B8' }}>
                                        Ideal: {r.idealMin === 0 ? `₹0 - ${fmt(r.idealMax)}` : r.idealMax === 0 ? fmt(r.idealMin) : `${fmt(r.idealMin)} - ${fmt(r.idealMax)}`}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}

                {activeTab === 'Asset Allocation' && (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '16px' }}>
                        {investments.allocationIdeals.map(r => {
                            let actual = 0;
                            if (r.name === 'Equity') actual = investments.assets.equity;
                            if (r.name === 'Real Estate') actual = investments.assets.realEstate;
                            if (r.name === 'Commodity') actual = investments.assets.commodity;
                            if (r.name === 'Debt') actual = investments.assets.debt;
                            if (r.name === 'Alternative Investments') actual = investments.assets.altInvestments;
                            const inRange = actual >= r.min && actual <= r.max;
                            const valColor = inRange ? '#16A34A' : '#DC2626';

                            return (
                                <div key={r.name} style={{ border: '1px solid #E8ECF1', borderRadius: '8px', padding: '20px', backgroundColor: '#FFFFFF', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
                                        <span style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', color: '#1E293B', letterSpacing: '0.3px', maxWidth: '60px' }}>{r.name}</span>
                                        <StatusBadge actual={actual} min={r.min} max={r.max} />
                                    </div>
                                    <div style={{ fontSize: '12px', color: '#94A3B8', marginBottom: '4px' }}>Actual Value</div>
                                    <div style={{ fontSize: '20px', fontWeight: 700, color: valColor, marginBottom: '8px' }}>{actual > 0 ? fmt(actual) : '₹0'}</div>
                                    <div style={{ fontSize: '12px', color: '#94A3B8' }}>Ideal: {r.min === 0 ? `₹0 - ${fmt(r.max)}` : `${fmt(r.min)} - ${fmt(r.max)}`}</div>
                                </div>
                            )
                        })}
                    </div>
                )}

                {/* Cashflow Table */}
                <div style={{ marginTop: '32px', borderTop: '1px solid #E8ECF1', paddingTop: '32px' }}>
                    <h3 style={{ fontSize: '14px', fontWeight: 700, color: '#1E293B', marginBottom: '24px' }}>Next 3 Months Cashflow</h3>
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                        <thead>
                            <tr style={{ borderBottom: '1px solid #E8ECF1' }}>
                                <th style={{ padding: '12px 16px', fontSize: '11px', fontWeight: 600, color: '#64748B', textAlign: 'left', textTransform: 'uppercase' }}>Particulars</th>
                                <th style={{ padding: '12px 16px', fontSize: '11px', fontWeight: 600, color: '#64748B', textAlign: 'left', textTransform: 'uppercase' }}>Type</th>
                                <th style={{ padding: '12px 16px', fontSize: '11px', fontWeight: 600, color: '#64748B', textAlign: 'right', textTransform: 'uppercase' }}>Amount</th>
                            </tr>
                        </thead>
                        <tbody>
                            {overview.cashflow.items.map((item, idx) => (
                                <tr key={idx} style={{ borderBottom: '1px solid #F1F5F9' }}>
                                    <td style={{ padding: '16px', fontSize: '13px', color: '#1E293B', fontWeight: 500 }}>{item.name}</td>
                                    <td style={{ padding: '16px' }}>
                                        <span style={{ fontSize: '9px', fontWeight: 700, color: item.type === 'credit' ? '#059669' : '#DC2626', textTransform: 'uppercase', backgroundColor: item.type === 'credit' ? '#ECFDF5' : '#FEF2F2', padding: '2px 8px', borderRadius: '4px' }}>{item.type}</span>
                                    </td>
                                    <td style={{ padding: '16px', fontSize: '13px', color: '#1E293B', textAlign: 'right' }}>{item.amount > 0 ? fmt(item.amount) : '—'}</td>
                                </tr>
                            ))}
                            <tr style={{ backgroundColor: '#F8FAFC', borderBottom: 'none' }}>
                                <td style={{ padding: '20px 16px', fontSize: '13px', fontWeight: 700, color: '#1E293B' }} colSpan={2}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                        👍 Surplus for the Period
                                    </div>
                                </td>
                                <td style={{ padding: '20px 16px', fontSize: '16px', fontWeight: 700, color: '#1E293B', textAlign: 'right' }}>{fmtFull(overview.cashflow.surplus)}</td>
                            </tr>
                        </tbody>
                    </table>
                </div>
                <SectionNote lines={[
                    'Emergency Fund ideal = 6 months of total monthly expenses (rent + utilities + food + transport + household + discretionary).',
                    'Health Insurance ideal = at least \u20b910L cover for individuals, \u20b925L+ for families.',
                    'Life Insurance ideal = 10-15x annual salary as a term plan to protect dependents.',
                    'EMI Burden Ratio = Total monthly EMIs \u00f7 Gross monthly salary. Keep below 40% for healthy finances.',
                    'Asset allocation ideal ranges adjust by age: Equity % \u2248 (100 - age), modified for your stated risk comfort.',
                    'Cashflow = (Annual income \u00f7 4) minus 3 months of (expenses + EMIs + SIPs + insurance + estimated tax).'
                ]} />
            </div>

            {/* 5. 4 Grid (Income, Expenses, Liabilities, Insurance) */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '16px' }}>
                {/* Income */}
                <div className="card" style={{ padding: '24px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '32px' }}>
                        <SectionHeader title="Income" link="/tax" date={currentDate} />
                        <div style={{ display: 'flex', gap: '24px', alignItems: 'center' }}>
                            <div style={{ width: '80px', height: '80px' }}>
                                <ResponsiveContainer width="100%" height="100%">
                                    <PieChart>
                                        <Pie data={overview.income.breakdown.filter(d => d.percent > 0).length ? overview.income.breakdown.filter(d => d.percent > 0) : [{ percent: 1 }]} dataKey="percent" innerRadius={25} outerRadius={40}>
                                            {(overview.income.breakdown.filter(d => d.percent > 0).length ? overview.income.breakdown.filter(d => d.percent > 0) : [{ percent: 1 }]).map((_, i) => <Cell key={i} fill={overview.income.breakdown.filter(d => d.percent > 0).length ? NEUTRAL_PALETTE[i % NEUTRAL_PALETTE.length] : '#E8ECF1'} />)}
                                        </Pie>
                                        {overview.income.breakdown.some(d => d.percent > 0) && <RechartsTooltip formatter={(v) => `${v}%`} contentStyle={{ fontSize: '11px', padding: '4px 8px' }} />}
                                    </PieChart>
                                </ResponsiveContainer>
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'x-6px y-12px', columnGap: '20px', rowGap: '12px' }}>
                                {overview.income.breakdown.map((item, i) => (
                                    <PieLegendItem key={item.type} color={NEUTRAL_PALETTE[i % NEUTRAL_PALETTE.length]} label={item.type} percent={item.percent} />
                                ))}
                            </div>
                        </div>
                    </div>
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                        <thead>
                            <tr style={{ borderBottom: '1px solid #E8ECF1' }}>
                                <th style={{ padding: '8px 4px', fontSize: '11px', fontWeight: 600, color: '#64748B', textAlign: 'left', textTransform: 'uppercase' }}>Income Type</th>
                                <th style={{ padding: '8px 4px', fontSize: '11px', fontWeight: 600, color: '#64748B', textAlign: 'right', textTransform: 'uppercase' }}>Annual Amount</th>
                            </tr>
                        </thead>
                        <tbody>
                            {overview.income.breakdown.map((item, i) => (
                                <tr key={item.type} style={{ borderBottom: '1px solid #F1F5F9' }}>
                                    <td style={{ padding: '12px 4px', fontSize: '12px', color: '#1E293B', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                        <div style={{ width: '6px', height: '6px', backgroundColor: NEUTRAL_PALETTE[i % NEUTRAL_PALETTE.length] }}></div>
                                        {item.type}
                                    </td>
                                    <td style={{ padding: '12px 4px', fontSize: '12px', color: '#1E293B', textAlign: 'right' }}>{item.amount > 0 ? fmt(item.amount) : '0'}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                {/* Expenses */}
                <div className="card" style={{ padding: '24px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '32px' }}>
                        <SectionHeader title="Expenses" link="/tax" date={currentDate} />
                        <div style={{ display: 'flex', gap: '24px', alignItems: 'center' }}>
                            <div style={{ width: '80px', height: '80px' }}>
                                <ResponsiveContainer width="100%" height="100%">
                                    <PieChart>
                                        <Pie data={overview.expenses.breakdown.filter(d => d.percent > 0).length ? overview.expenses.breakdown.filter(d => d.percent > 0) : [{ percent: 1 }]} dataKey="percent" innerRadius={25} outerRadius={40}>
                                            {(overview.expenses.breakdown.filter(d => d.percent > 0).length ? overview.expenses.breakdown.filter(d => d.percent > 0) : [{ percent: 1 }]).map((_, i) => <Cell key={i} fill={overview.expenses.breakdown.filter(d => d.percent > 0).length ? NEUTRAL_PALETTE[i % NEUTRAL_PALETTE.length] : '#E8ECF1'} />)}
                                        </Pie>
                                        {overview.expenses.breakdown.some(d => d.percent > 0) && <RechartsTooltip formatter={(v) => `${v}%`} contentStyle={{ fontSize: '11px', padding: '4px 8px' }} />}
                                    </PieChart>
                                </ResponsiveContainer>
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'x-6px y-12px', columnGap: '20px', rowGap: '12px' }}>
                                {overview.expenses.breakdown.map((item, i) => (
                                    <PieLegendItem key={item.type} color={NEUTRAL_PALETTE[i % NEUTRAL_PALETTE.length]} label={item.type} percent={item.percent} />
                                ))}
                            </div>
                        </div>
                    </div>
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                        <thead>
                            <tr style={{ borderBottom: '1px solid #E8ECF1' }}>
                                <th style={{ padding: '8px 4px', fontSize: '11px', fontWeight: 600, color: '#64748B', textAlign: 'left', textTransform: 'uppercase' }}>Expenses</th>
                                <th style={{ padding: '8px 4px', fontSize: '11px', fontWeight: 600, color: '#64748B', textAlign: 'right', textTransform: 'uppercase' }}>Annual Amount</th>
                            </tr>
                        </thead>
                        <tbody>
                            {overview.expenses.breakdown.map((item, i) => (
                                <tr key={item.type} style={{ borderBottom: '1px solid #F1F5F9' }}>
                                    <td style={{ padding: '12px 4px', fontSize: '12px', color: '#1E293B', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                        <div style={{ width: '6px', height: '6px', backgroundColor: NEUTRAL_PALETTE[i % NEUTRAL_PALETTE.length] }}></div>
                                        {item.type}
                                    </td>
                                    <td style={{ padding: '12px 4px', fontSize: '12px', color: '#1E293B', textAlign: 'right' }}>{item.amount > 0 ? fmt(item.amount) : '0'}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                {/* Liabilities */}
                <div className="card" style={{ padding: '24px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '32px' }}>
                        <SectionHeader title="Liabilities" link="/liabilities" date={currentDate} />
                        <div style={{ display: 'flex', gap: '24px', alignItems: 'center' }}>
                            <div style={{ width: '80px', height: '80px' }}>
                                <ResponsiveContainer width="100%" height="100%">
                                    <PieChart>
                                        <Pie data={overview.liabilities.total > 0 ? [{ name: 'Good', outstanding: overview.liabilities.goodLiability?.outstanding || 0 }, { name: 'Bad', outstanding: overview.liabilities.badLiability?.outstanding || 0 }].filter(d => d.outstanding > 0) : [{ outstanding: 1 }]} dataKey="outstanding" innerRadius={25} outerRadius={40}>
                                            {(overview.liabilities.total > 0 ? [{ name: 'Good', outstanding: overview.liabilities.goodLiability?.outstanding || 0 }, { name: 'Bad', outstanding: overview.liabilities.badLiability?.outstanding || 0 }].filter(d => d.outstanding > 0) : [{ outstanding: 1 }]).map((entry, i) => {
                                                const color = overview.liabilities.total === 0 ? '#E8ECF1' : (entry.name === 'Good' ? '#16A34A' : '#DC2626');
                                                return <Cell key={i} fill={color} />;
                                            })}
                                        </Pie>
                                        {overview.liabilities.total > 0 && <RechartsTooltip formatter={(v) => fmtFull(v)} contentStyle={{ fontSize: '11px', padding: '4px 8px' }} />}
                                    </PieChart>
                                </ResponsiveContainer>
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                <PieLegendItem color="#16A34A" label="Good Liabilities" percent={overview.liabilities.total > 0 ? ((overview.liabilities.goodLiability?.outstanding || 0) / overview.liabilities.total * 100) : 0} />
                                <PieLegendItem color="#DC2626" label="Bad Liabilities" percent={overview.liabilities.total > 0 ? ((overview.liabilities.badLiability?.outstanding || 0) / overview.liabilities.total * 100) : 0} />
                            </div>
                        </div>
                    </div>
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                        <thead>
                            <tr style={{ borderBottom: '1px solid #E8ECF1' }}>
                                <th style={{ padding: '8px 4px', fontSize: '11px', fontWeight: 600, color: '#64748B', textAlign: 'left', textTransform: 'uppercase' }}>Type</th>
                                <th style={{ padding: '8px 4px', fontSize: '11px', fontWeight: 600, color: '#64748B', textAlign: 'right', textTransform: 'uppercase' }}>Outstanding</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr style={{ borderBottom: '1px solid #F1F5F9' }}>
                                <td style={{ padding: '12px 4px', fontSize: '12px', color: '#1E293B', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                    <div style={{ width: '6px', height: '6px', backgroundColor: '#16A34A' }}></div>
                                    Good Liabilities
                                </td>
                                <td style={{ padding: '12px 4px', fontSize: '12px', color: '#1E293B', textAlign: 'right' }}>{fmtFull(overview.liabilities.goodLiability?.outstanding || 0)}</td>
                            </tr>
                            <tr style={{ borderBottom: '1px solid #F1F5F9' }}>
                                <td style={{ padding: '12px 4px', fontSize: '12px', color: '#1E293B', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                    <div style={{ width: '6px', height: '6px', backgroundColor: '#DC2626' }}></div>
                                    Bad Liabilities
                                </td>
                                <td style={{ padding: '12px 4px', fontSize: '12px', color: '#1E293B', textAlign: 'right' }}>{fmtFull(overview.liabilities.badLiability?.outstanding || 0)}</td>
                            </tr>
                            <tr style={{ borderBottom: '1px solid #F1F5F9' }}>
                                <td style={{ padding: '12px 4px', fontSize: '12px', color: '#1E293B', fontWeight: 600 }}>
                                    Total Liabilities
                                </td>
                                <td style={{ padding: '12px 4px', fontSize: '12px', color: '#1E293B', textAlign: 'right', fontWeight: 600 }}>{fmtFull(overview.liabilities.total)}</td>
                            </tr>
                        </tbody>
                    </table>
                    <SectionNote lines={[
                        'Good Liabilities (green) are Home Loans and Education Loans — they help build assets or earning capacity.',
                        'Bad Liabilities (red) include Personal Loans, Car Loans, Gold Loans, and Credit Card outstanding — consumptive debt.',
                        'Total Liabilities = sum of all outstanding loan amounts + credit card outstanding balance.'
                    ]} />
                </div>

                {/* Insurance */}
                <div className="card" style={{ padding: '24px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '32px', alignItems: 'flex-start' }}>
                        <SectionHeader title="Insurance" link="/insurance" date={currentDate} />
                        <div style={{ display: 'flex', gap: '24px', alignItems: 'center' }}>
                            <div style={{ width: '80px', height: '80px' }}>
                                <ResponsiveContainer width="100%" height="100%">
                                    <PieChart>
                                        <Pie data={overview.insurance.healthPercent || overview.insurance.lifePercent ? [{ name: 'Life', percent: overview.insurance.lifePercent }, { name: 'Health', percent: overview.insurance.healthPercent }].filter(d => d.percent > 0) : [{ percent: 1 }]} dataKey="percent" innerRadius={25} outerRadius={40}>
                                            {(overview.insurance.healthPercent || overview.insurance.lifePercent ? [{ name: 'Life', percent: overview.insurance.lifePercent }, { name: 'Health', percent: overview.insurance.healthPercent }].filter(d => d.percent > 0) : [{ percent: 1 }]).map((_, i) => <Cell key={i} fill={overview.insurance.healthPercent || overview.insurance.lifePercent ? NEUTRAL_PALETTE[i % NEUTRAL_PALETTE.length] : '#E8ECF1'} />)}
                                        </Pie>
                                        {(overview.insurance.healthPercent > 0 || overview.insurance.lifePercent > 0) && <RechartsTooltip formatter={(v) => `${v}%`} contentStyle={{ fontSize: '11px', padding: '4px 8px' }} />}
                                    </PieChart>
                                </ResponsiveContainer>
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                <PieLegendItem color={NEUTRAL_PALETTE[0]} label="Life Insurance" percent={overview.insurance.lifePercent} />
                                <PieLegendItem color={NEUTRAL_PALETTE[1]} label="Health Insurance" percent={overview.insurance.healthPercent} />
                            </div>
                        </div>
                    </div>
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                        <thead>
                            <tr style={{ borderBottom: '1px solid #E8ECF1' }}>
                                <th style={{ padding: '8px 4px', fontSize: '11px', fontWeight: 600, color: '#64748B', textAlign: 'left', textTransform: 'uppercase' }}>Insurance Type</th>
                                <th style={{ padding: '8px 4px', fontSize: '11px', fontWeight: 600, color: '#64748B', textAlign: 'right', textTransform: 'uppercase' }}>Cover</th>
                                <th style={{ padding: '8px 4px', fontSize: '11px', fontWeight: 600, color: '#64748B', textAlign: 'right', textTransform: 'uppercase' }}>Annual Premium</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr style={{ borderBottom: '1px solid #F1F5F9' }}>
                                <td style={{ padding: '12px 4px', fontSize: '12px', color: '#1E293B', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                    <div style={{ width: '6px', height: '6px', backgroundColor: NEUTRAL_PALETTE[0] }}></div> Life Insurance
                                </td>
                                <td style={{ padding: '12px 4px', fontSize: '12px', color: '#1E293B', textAlign: 'right' }}>{overview.insurance.lifeCover > 0 ? fmt(overview.insurance.lifeCover) : '0'}</td>
                                <td style={{ padding: '12px 4px', fontSize: '12px', color: '#1E293B', textAlign: 'right' }}>{overview.insurance.lifePremium > 0 ? fmt(overview.insurance.lifePremium) : '0'}</td>
                            </tr>
                            <tr style={{ borderBottom: '1px solid #F1F5F9' }}>
                                <td style={{ padding: '12px 4px', fontSize: '12px', color: '#1E293B', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                    <div style={{ width: '6px', height: '6px', backgroundColor: NEUTRAL_PALETTE[1] }}></div> Health Insurance
                                </td>
                                <td style={{ padding: '12px 4px', fontSize: '12px', color: '#1E293B', textAlign: 'right' }}>{overview.insurance.healthCover > 0 ? fmt(overview.insurance.healthCover) : '0'}</td>
                                <td style={{ padding: '12px 4px', fontSize: '12px', color: '#1E293B', textAlign: 'right' }}>{overview.insurance.healthPremium > 0 ? fmt(overview.insurance.healthPremium) : '0'}</td>
                            </tr>
                        </tbody>
                    </table>
                    <SectionNote lines={[
                        'Health Insurance covers medical expenses. Ideal sum insured: ₹10-25L depending on family size and city tier.',
                        'Life Insurance (term plan) pays a lump sum to nominees on death. Ideal cover: 10-15x your annual income.',
                        'Premium-to-cover ratio: a lower ratio means better value. Term plans offer the best ratio compared to endowment or ULIP.'
                    ]} />
                </div>
            </div>

            {/* 6. Will & Estate */}
            <div className="card" style={{ padding: '24px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                    <Link to="/estate" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <h2 style={{ fontSize: '16px', fontWeight: 700, color: '#1E293B', margin: 0, textTransform: 'uppercase' }}>Will & Estate</h2>
                        <ArrowUpRight size={18} color="#1E293B" />
                    </Link>
                    <button style={{ border: '1px solid #E8ECF1', backgroundColor: 'transparent', padding: '8px 24px', borderRadius: '6px', fontSize: '13px', fontWeight: 600, color: '#1E293B', cursor: 'pointer' }}>+ Create Will</button>
                </div>

                <div style={{ backgroundColor: '#F8FAFC', padding: '16px', borderRadius: '8px', marginBottom: '24px', display: 'flex', gap: '12px', alignItems: 'flex-start', border: '1px solid #E8ECF1' }}>
                    <AlertTriangle size={18} color="#64748B" style={{ marginTop: '2px' }} />
                    <div style={{ flex: 1 }}>
                        <div style={{ fontSize: '13px', fontWeight: 700, color: '#1E293B', marginBottom: '4px' }}>{overview.willEstate.hasWill ? 'Will Created' : (overview.willEstate.willInProgress ? 'Will In Progress' : 'No Will Created')}</div>
                        <div style={{ fontSize: '12px', color: '#64748B' }}>Protect your family's future by creating a comprehensive will and estate plan.</div>
                    </div>
                </div>

                <div style={{ display: 'flex', gap: '16px' }}>
                    <div style={{ flex: 1, border: '1px solid #E8ECF1', padding: '20px', borderRadius: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#FAFAFA' }}>
                        <div>
                            <div style={{ fontSize: '12px', color: '#1E293B', fontWeight: 600, textTransform: 'uppercase', marginBottom: '8px' }}>Total Investment</div>
                            <div style={{ fontSize: '24px', fontWeight: 700, color: '#1E293B' }}>{fmtFull(overview.willEstate.totalInvestment)}</div>
                        </div>
                        <div style={{ width: '40px', height: '40px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Wallet size={20} color="#64748B" /></div>
                    </div>
                    <div style={{ flex: 1, border: '1px solid #E8ECF1', padding: '20px', borderRadius: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#FAFAFA' }}>
                        <div>
                            <div style={{ fontSize: '12px', color: '#1E293B', fontWeight: 600, textTransform: 'uppercase', marginBottom: '8px' }}>Insurance Cover</div>
                            <div style={{ fontSize: '24px', fontWeight: 700, color: '#1E293B' }}>{fmtFull(overview.willEstate.insuranceCover)}</div>
                        </div>
                        <div style={{ width: '40px', height: '40px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><ShieldCheck size={20} color="#64748B" /></div>
                    </div>
                    <div style={{ flex: 1, border: '1px solid #E8ECF1', padding: '20px', borderRadius: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#FAFAFA' }}>
                        <div>
                            <div style={{ fontSize: '12px', color: '#1E293B', fontWeight: 600, textTransform: 'uppercase', marginBottom: '8px' }}>Total Nominee</div>
                            <div style={{ fontSize: '24px', fontWeight: 700, color: '#1E293B' }}>{overview.willEstate.numNominees}</div>
                        </div>
                        <div style={{ width: '40px', height: '40px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Users size={20} color="#64748B" /></div>
                    </div>
                </div>
                <SectionNote lines={[
                    'A Will is a legal document that specifies how your assets should be distributed after death. Without one, assets follow succession law.',
                    'Nominees are custodians, not automatic owners. A registered Will overrides nominee designation in most cases.',
                    'Total Investment here is the sum of all your investment assets. Insurance Cover is the sum of health + life sum insured.'
                ]} />
            </div>

        </div>
    );
}

export default Dashboard;
