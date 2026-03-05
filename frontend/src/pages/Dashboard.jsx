import React, { useEffect, useState } from 'react';
import { fetchWithAuth } from '../api';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip as RechartsTooltip } from 'recharts';
import { Link } from 'react-router-dom';
import { ArrowUpRight, AlertTriangle, Wallet, ShieldCheck, Users, ChevronDown, ChevronUp } from 'lucide-react';

// Dynamic explanation maps
const GENERATION_INFO = {
    'Generation 1': 'You belong to the early wealth-building cohort (under 25). This generation typically has fewer financial commitments, higher risk appetite, and longer investment horizons. Focus areas: building strong financial habits, starting early investments, and avoiding lifestyle inflation.',
    'Generation 2': 'You belong to the core earning cohort (25–45). This generation is typically in peak earning years, balancing between asset building, family responsibilities, and loan commitments. Focus areas: maximising savings rate, adequate insurance, and disciplined long-term investing.',
    'Generation 3': 'You belong to the wealth preservation cohort (45+). This generation is transitioning from accumulation to preservation and eventual distribution. Focus areas: de-risking portfolio, ensuring retirement readiness, estate planning, and adequate health coverage.'
};

const LIFE_STAGE_INFO = {
    'Foundation Phase': 'You are in the Foundation Phase (under 25). This is the time to build financial literacy, start an emergency fund, develop good saving habits, and begin investing — even small amounts. Avoid high-interest debt. Every rupee invested now benefits from decades of compounding.',
    'Building Phase': 'You are in the Building Phase (25–35). This is when your income grows fastest. Prioritise building a diversified investment portfolio, getting adequate term and health insurance, clearing bad debts, and setting up systematic investments. Lifestyle inflation is the biggest risk at this stage.',
    'Accumulation Phase': 'You are in the Accumulation Phase (35–50). You are likely at peak earning capacity with significant financial commitments (home loan, children\'s education). Focus on maximising tax-efficient investments, reviewing insurance adequacy, and ensuring your portfolio is on track for retirement goals.',
    'Pre-Retirement Phase': 'You are in the Pre-Retirement Phase (50–60). Start gradually de-risking your portfolio by shifting from equity to debt. Ensure your retirement corpus is on track, enhance health insurance coverage, finalise estate planning (will, nominations), and plan for post-retirement cash flows.',
    'Retirement Phase': 'You are in the Retirement Phase (60+). Capital preservation and generating a stable income stream are the primary goals. Maintain adequate liquidity for 2–3 years of expenses, keep health insurance at maximum, ensure your will and nominations are updated, and minimise tax liability on withdrawals.'
};

const FBS_INFO = (score) => {
    if (score >= 80) return `Your FBS of ${score} is excellent — you demonstrate strong financial discipline, low impulsive spending, consistent investments, and healthy debt management. Keep maintaining these habits.`;
    if (score >= 60) return `Your FBS of ${score} is good — you have a reasonably disciplined financial approach, but there is room to improve in areas like savings consistency, investment regularity, or debt management.`;
    if (score >= 40) return `Your FBS of ${score} indicates moderate financial discipline. Consider building stronger saving habits, reducing discretionary spending, and setting up automated investments to improve your score.`;
    if (score >= 20) return `Your FBS of ${score} suggests significant room for improvement in financial behaviour. Focus on building an emergency fund, reducing bad debt, and creating a monthly budget to track spending.`;
    return `Your FBS of ${score} indicates your financial habits need urgent attention. Start with basic steps: track all expenses, stop new debt, build a small emergency fund, and seek guidance from a financial advisor.`;
};

const MONEY_SIGN_INFO = {
    'Bold Eagle': 'As a Bold Eagle, you are highly aggressive and deeply engaged with markets. You actively seek high-growth opportunities and are comfortable with significant risk. While this can lead to strong returns, be cautious of overconcentration and ensure proper diversification.',
    'Cautious Turtle': 'As a Cautious Turtle, you prioritise safety and guaranteed returns over market-beating growth. While this protects your capital, being too conservative — especially when young — can mean your wealth doesn\'t outpace inflation. Consider a small equity allocation for long-term goals.',
    'Persistent Horse': 'As a Persistent Horse, you are steady and methodical. You set a solid long-term strategy and stick to it without over-monitoring. This disciplined approach is highly effective. Just ensure you review your portfolio at least annually to rebalance.',
    'Curious Fox': 'As a Curious Fox, you are highly active and experimental, constantly looking for trends. While your curiosity can uncover opportunities, it can also lead to over-trading and chasing short-term returns. Consider a core-satellite approach: keep 80% in a stable portfolio and experiment with 20%.',
    'Strategic Owl': 'As a Strategic Owl, you are wise and disciplined. You analyse thoroughly before acting and maintain strong emotional control during market volatility. This is one of the most effective investor profiles — just make sure analysis paralysis doesn\'t delay action.',
    'Loyal Elephant': 'As a Loyal Elephant, you are patient and risk-averse, sticking to what you know. While loyalty to proven assets is admirable, be open to diversification. Over-reliance on fixed deposits and traditional assets may not beat inflation in the long run.',
    'Balanced Dolphin': 'As a Balanced Dolphin, you maintain a healthy equilibrium between growth-seeking and wealth-preserving behaviours. You adapt well to changing conditions. Continue this balanced approach and review your allocation periodically to stay aligned with your life stage.'
};

const InfoDropdown = ({ isOpen, onToggle, text }) => (
    <div>
        <button onClick={onToggle} style={{
            display: 'flex', alignItems: 'center', gap: '4px', border: 'none', background: 'none',
            cursor: 'pointer', fontSize: '11px', color: '#94A3B8', fontWeight: 500, padding: '6px 0 0', marginTop: '4px'
        }}>
            {isOpen ? 'Hide details' : 'What does this mean?'}
            {isOpen ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
        </button>
        {isOpen && (
            <div style={{ marginTop: '8px', padding: '12px', backgroundColor: '#F8FAFC', borderRadius: '6px', border: '1px solid #E8ECF1', fontSize: '12px', color: '#475569', lineHeight: 1.7 }}>
                {text}
            </div>
        )}
    </div>
);

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
    const [openDropdowns, setOpenDropdowns] = useState({});
    const toggleDropdown = (key) => setOpenDropdowns(prev => ({ ...prev, [key]: !prev[key] }));

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
            <div className="form-row" style={{ display: 'flex', gap: '16px' }}>
                <div className="card" style={{ flex: 1, padding: '24px', display: 'flex', flexDirection: 'column', justifyContent: 'center', backgroundColor: '#F8FAFC' }}>
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
                        <InfoDropdown isOpen={openDropdowns.gen} onToggle={() => toggleDropdown('gen')} text={GENERATION_INFO[overview.generation] || 'Your generation profile helps determine your financial priorities and ideal asset allocation strategy.'} />
                    </div>
                    <div className="card" style={{ padding: '20px', flex: 1 }}>
                        <div style={{ fontSize: '11px', color: '#64748B', textTransform: 'uppercase', marginBottom: '8px', fontWeight: 600 }}>Life Stage</div>
                        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                            <div style={{ fontSize: '18px', fontWeight: 600, color: '#1E293B' }}>{overview.lifeStage.stage}</div>
                            <div style={{ backgroundColor: '#F1F5F9', color: '#475569', fontSize: '10px', padding: '4px 8px', borderRadius: '4px', fontWeight: 600 }}>Age: {overview.lifeStage.ageRange}</div>
                        </div>
                        <InfoDropdown isOpen={openDropdowns.life} onToggle={() => toggleDropdown('life')} text={LIFE_STAGE_INFO[overview.lifeStage.stage] || 'Your life stage determines the financial priorities and risk tolerance appropriate for your age group.'} />
                    </div>
                </div>
            </div>

            {/* 2. Your Financial Profile */}
            <div className="card" style={{ padding: '24px' }}>
                <h2 style={{ fontSize: '16px', fontWeight: 700, color: '#1E293B', marginBottom: '24px' }}>Your Financial Profile</h2>

                <div className="form-row" style={{ display: 'flex', gap: '24px' }}>
                    {/* FBS Section */}
                    <div style={{ flex: 1 }}>
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
                        <InfoDropdown isOpen={openDropdowns.fbs} onToggle={() => toggleDropdown('fbs')} text={FBS_INFO(fbs)} />
                    </div>

                    {/* Divider */}
                    <div style={{ width: '1px', backgroundColor: '#E8ECF1' }}></div>

                    {/* MoneySign & Biases Section */}
                    <div style={{ flex: 1 }}>
                        <div style={{ fontSize: '12px', color: '#64748B', fontWeight: 600, marginBottom: '12px' }}>MoneySign®</div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
                            <div style={{ width: '32px', height: '32px', borderRadius: '50%', backgroundColor: '#F8FAFC', border: '1px solid #E8ECF1', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '16px' }}>{overview.moneySign.icon}</div>
                            <span style={{ fontSize: '16px', fontWeight: 600, color: '#1E293B' }}>{overview.moneySign.name}</span>
                        </div>
                        <div style={{ fontSize: '12px', color: '#475569', lineHeight: 1.6, marginBottom: '12px' }}>{overview.moneySign.desc}</div>
                        <InfoDropdown isOpen={openDropdowns.money} onToggle={() => toggleDropdown('money')} text={MONEY_SIGN_INFO[overview.moneySign.name] || overview.moneySign.desc} />
                        <div style={{ fontSize: '12px', color: '#64748B', marginTop: '20px', marginBottom: '12px', fontWeight: 600 }}>Behavioural Biases</div>
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
                <div className="form-row" style={{ display: 'flex', gap: '16px' }}>
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
                                    <div style={{ fontSize: '13px', fontWeight: 700, color: '#1E293B' }}>True Monthly Surplus</div>
                                    <div style={{ fontSize: '10px', color: '#94A3B8', marginTop: '2px' }} title="Your surplus after accounting for daily living expenses AND pro-rating your yearly obligations like insurance & school fees. This is your true investable amount.">Includes pro-rated annual bills ⓘ</div>
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
                <div className="dashboard-grid" style={{ display: 'grid', gap: '16px' }}>
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
                    <div className="alloc-cards" style={{ display: 'grid', gap: '16px' }}>
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
                    <div className="alloc-cards" style={{ display: 'grid', gap: '16px' }}>
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
                    <div className="dashboard-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '16px' }}>
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
                    <h3 style={{ fontSize: '14px', fontWeight: 700, color: '#1E293B', marginBottom: '16px' }}>Next 3 Months Cashflow</h3>

                    <div style={{ padding: '16px', backgroundColor: '#F0FDF4', border: '1px solid #BBF7D0', borderRadius: '8px', marginBottom: '24px', display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
                        <ShieldCheck size={20} color="#16A34A" style={{ marginTop: '2px', flexShrink: 0 }} />
                        <div>
                            <h4 style={{ fontSize: '13px', fontWeight: 700, color: '#166534', margin: '0 0 4px 0' }}>Why is my Surplus lower than I thought?</h4>
                            <p style={{ fontSize: '12px', color: '#15803D', margin: 0, lineHeight: 1.6 }}>
                                Most people mistakenly calculate surplus as <strong>Income - Monthly Expenses</strong>. But when an annual insurance premium or school fee comes due, they are forced to break their investments. We calculate your <strong>True Surplus</strong> by reserving a 12th of your annual obligations every month. We've projected this below.
                            </p>
                        </div>
                    </div>

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
            <div className="dashboard-2col" style={{ display: 'grid', gap: '16px' }}>
                {/* Income */}
                <div className="card" style={{ padding: '24px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '32px' }}>
                        <SectionHeader title="Income" link="/tax" date={currentDate} />
                        <div style={{ display: 'flex', gap: '24px', alignItems: 'center' }}>
                            <div style={{ width: '80px', height: '80px' }}>
                                <ResponsiveContainer width="100%" height="100%">
                                    <PieChart>
                                        <Pie data={overview.income.breakdown.some(d => d.percent > 0) ? overview.income.breakdown : [{ percent: 1 }]} dataKey="percent" innerRadius={25} outerRadius={40}>
                                            {(overview.income.breakdown.some(d => d.percent > 0) ? overview.income.breakdown : [{ percent: 1 }]).map((entry, i) => <Cell key={i} fill={overview.income.breakdown.some(d => d.percent > 0) ? (entry.percent > 0 ? NEUTRAL_PALETTE[i % NEUTRAL_PALETTE.length] : 'transparent') : '#E8ECF1'} stroke="none" />)}
                                        </Pie>
                                        {overview.income.breakdown.some(d => d.percent > 0) && <RechartsTooltip formatter={(v) => `${v}%`} contentStyle={{ fontSize: '11px', padding: '4px 8px' }} />}
                                    </PieChart>
                                </ResponsiveContainer>
                            </div>
                            <div className="chart-legend-inline" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'x-6px y-12px', columnGap: '20px', rowGap: '12px' }}>
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
                                <th style={{ padding: '8px 4px', fontSize: '11px', fontWeight: 600, color: '#64748B', textAlign: 'right', textTransform: 'uppercase' }}>Monthly</th>
                                <th style={{ padding: '8px 4px', fontSize: '11px', fontWeight: 600, color: '#64748B', textAlign: 'right', textTransform: 'uppercase' }}>Annual</th>
                            </tr>
                        </thead>
                        <tbody>
                            {overview.income.breakdown.map((item, i) => (
                                <tr key={item.type} style={{ borderBottom: '1px solid #F1F5F9' }}>
                                    <td style={{ padding: '12px 4px', fontSize: '12px', color: '#1E293B', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                        <div style={{ width: '6px', height: '6px', backgroundColor: NEUTRAL_PALETTE[i % NEUTRAL_PALETTE.length] }}></div>
                                        {item.type}
                                    </td>
                                    <td style={{ padding: '12px 4px', fontSize: '12px', color: '#1E293B', textAlign: 'right' }}>{item.amount > 0 ? fmt(Math.round(item.amount / 12)) : '0'}</td>
                                    <td style={{ padding: '12px 4px', fontSize: '12px', color: '#1E293B', textAlign: 'right' }}>{item.amount > 0 ? fmt(item.amount) : '0'}</td>
                                </tr>
                            ))}
                            <tr style={{ borderTop: '2px solid #E8ECF1' }}>
                                <td style={{ padding: '12px 4px', fontSize: '12px', fontWeight: 700, color: '#1E293B' }}>Total</td>
                                <td style={{ padding: '12px 4px', fontSize: '12px', fontWeight: 700, color: '#1E293B', textAlign: 'right' }}>{fmt(Math.round(overview.income.breakdown.reduce((s, i) => s + (i.amount || 0), 0) / 12))}</td>
                                <td style={{ padding: '12px 4px', fontSize: '12px', fontWeight: 700, color: '#1E293B', textAlign: 'right' }}>{fmt(overview.income.breakdown.reduce((s, i) => s + (i.amount || 0), 0))}</td>
                            </tr>
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
                                        <Pie data={overview.expenses.breakdown.some(d => d.percent > 0) ? overview.expenses.breakdown : [{ percent: 1 }]} dataKey="percent" innerRadius={25} outerRadius={40}>
                                            {(overview.expenses.breakdown.some(d => d.percent > 0) ? overview.expenses.breakdown : [{ percent: 1 }]).map((entry, i) => <Cell key={i} fill={overview.expenses.breakdown.some(d => d.percent > 0) ? (entry.percent > 0 ? NEUTRAL_PALETTE[i % NEUTRAL_PALETTE.length] : 'transparent') : '#E8ECF1'} stroke="none" />)}
                                        </Pie>
                                        {overview.expenses.breakdown.some(d => d.percent > 0) && <RechartsTooltip formatter={(v) => `${v}%`} contentStyle={{ fontSize: '11px', padding: '4px 8px' }} />}
                                    </PieChart>
                                </ResponsiveContainer>
                            </div>
                            <div className="chart-legend-inline" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'x-6px y-12px', columnGap: '20px', rowGap: '12px' }}>
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
                                <th style={{ padding: '8px 4px', fontSize: '11px', fontWeight: 600, color: '#64748B', textAlign: 'right', textTransform: 'uppercase' }}>Monthly Amount</th>
                            </tr>
                        </thead>
                        <tbody>
                            {(overview.expenses.monthlyBreakdown || overview.expenses.breakdown).map((item, i) => (
                                <tr key={item.type} style={{ borderBottom: '1px solid #F1F5F9' }}>
                                    <td style={{ padding: '12px 4px', fontSize: '12px', color: '#1E293B', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                        <div style={{ width: '6px', height: '6px', backgroundColor: NEUTRAL_PALETTE[i % NEUTRAL_PALETTE.length] }}></div>
                                        {item.type}
                                    </td>
                                    <td style={{ padding: '12px 4px', fontSize: '12px', color: '#1E293B', textAlign: 'right' }}>{item.amount > 0 ? fmt(item.amount) : '0'}</td>
                                </tr>
                            ))}
                            <tr style={{ borderTop: '2px solid #E8ECF1' }}>
                                <td style={{ padding: '12px 4px', fontSize: '12px', fontWeight: 700, color: '#1E293B' }}>Total</td>
                                <td style={{ padding: '12px 4px', fontSize: '12px', fontWeight: 700, color: '#1E293B', textAlign: 'right' }}>{fmt((overview.expenses.monthlyBreakdown || overview.expenses.breakdown).reduce((s, i) => s + (i.amount || 0), 0))}</td>
                            </tr>
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
                            <div className="chart-legend-inline" style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
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
                    {/* Removed calculation notes */}
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
                            <div className="chart-legend-inline" style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
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
                    {/* Removed calculation notes */}
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

                <div className="will-cards-row">
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
