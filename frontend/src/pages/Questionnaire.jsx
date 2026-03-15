import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { fetchWithAuth } from '../api';
import { Check, Circle, ChevronRight, Info, Plus, Trash2 } from 'lucide-react';

const STEPS = [
    { id: 1, name: 'Profile & Family', short: 'Tell us about yourself so we can personalize your plan.' },
    { id: 2, name: 'Income', short: 'Assess savings potential and income streams.' },
    { id: 3, name: 'Expenses', short: 'Understand your cash flow and spending patterns.' },
    { id: 4, name: 'Assets & Banking', short: 'Your cash reserves and banking holdings.' },
    { id: 5, name: 'Investments', short: 'Your investment portfolio breakdown.' },
    { id: 6, name: 'Liabilities', short: 'Active loans, EMIs and credit cards.' },
    { id: 7, name: 'Insurance', short: 'Evaluate your health and life coverage.' },
    { id: 8, name: 'Tax', short: 'Current tax regime and deductions claimed.' },
    { id: 9, name: 'Estate Planning', short: 'Will, nominations and succession plan.' },
    { id: 10, name: 'Financial Behavior', short: 'Your habits and investment tendencies.' }
];

/* ─── colour tokens ─── */
const C = {
    navy: '#111B2E',
    navyLight: '#1C2D45',
    label: '#0D1B2A',
    sublabel: '#5C6B7A',
    border: '#D6E0EB',
    bg: '#EEF3F8',
    sidebarBg: '#FFFFFF',
    activeBg: '#EAF1F8',
    activeText: '#0D1B2A',
    inactiveText: '#8A9AA8',
    completedIcon: '#1A8A5E',
    progressBar: '#4F79B7',
    white: '#FFFFFF'
};

function Questionnaire() {
    const [currentStep, setCurrentStep] = useState(1);
    const [formData, setFormData] = useState({});
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const navigate = useNavigate();

    useEffect(() => { loadProfile(); }, []);

    const loadProfile = async () => {
        try {
            const data = await fetchWithAuth('/questionnaire');
            setFormData(data || {});
            setCurrentStep(data.current_step || 1);
        } catch (err) { console.error('Failed to load profile', err); }
        finally { setLoading(false); }
    };

    const handleInputChange = (e) => {
        const { name, value, type } = e.target;
        setFormData(prev => ({ ...prev, [name]: type === 'number' ? (value ? Number(value) : '') : value }));
    };

    const saveStep = async (step, isFinal = false) => {
        setSaving(true);
        try {
            const data = await fetchWithAuth(`/questionnaire/step/${step}`, { method: 'PUT', body: JSON.stringify(formData) });
            setFormData(data);
            if (isFinal) {
                navigate('/dashboard');
            }
            else setCurrentStep(s => Math.min(s + 1, 10));
        } catch (err) { alert('Failed to save. Please try again.'); }
        finally { setSaving(false); }
    };

    const handleNext = (e) => { e.preventDefault(); saveStep(currentStep, currentStep === 10); };

    if (loading) return (
        <div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#F7F4EF' }}>
            <div style={{ color: '#1C1A17', fontWeight: 600 }}>Loading your profile…</div>
        </div>
    );

    return (
        <div className="layout">
            {/* ─── SIDEBAR ─── */}
            <div className="qn-sidebar">
                {/* Brand */}
                <div className="sidebar-brand" style={{ marginBottom: '32px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <div className="sidebar-brand-mark" style={{ width: '32px', height: '32px', background: '#1C1A17', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        <span style={{ fontFamily: "'Playfair Display', serif", fontSize: '13px', color: '#F7F4EF', fontWeight: 400 }}>FH</span>
                    </div>
                    <div className="sidebar-brand-name" style={{ fontFamily: "'Playfair Display', serif", fontSize: '18px', fontWeight: 400, color: '#1C1A17' }}>FinHealth</div>
                </div>

                {/* Step List */}
                <div style={{ flex: 1 }}>
                    {STEPS.map(step => {
                        const isActive = currentStep === step.id;
                        const isCompleted = step.id < currentStep;

                        let circleClass = 'qn-step-circle';
                        if (isCompleted) circleClass += ' done';
                        else if (isActive) circleClass += ' active';

                        let labelClass = 'qn-step-label';
                        if (isCompleted) labelClass += ' done';
                        else if (isActive) labelClass += ' active';

                        return (
                            <button
                                key={step.id}
                                className="qn-step-item"
                                onClick={() => isCompleted && setCurrentStep(step.id)}
                                disabled={!isCompleted && !isActive}
                                type="button"
                            >
                                <div className={circleClass}>
                                    {isCompleted ? (
                                        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                            <polyline points="20 6 9 17 4 12" />
                                        </svg>
                                    ) : (
                                        <span>{step.id}</span>
                                    )}
                                </div>
                                <span className={labelClass}>
                                    {String(step.id).padStart(2, '0')} {step.name}
                                </span>
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* ─── MAIN CONTENT AREA ─── */}
            <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', overflowY: 'auto' }}>
                {/* Top Progress Bar */}
                <div className="qn-progress-bar-wrap">
                    <span className="qn-progress-step-label">Step {currentStep} of 10</span>
                    <div className="qn-progress-track">
                        <div className="qn-progress-fill" style={{ width: `${(currentStep / 10) * 100}%` }}></div>
                    </div>
                    <span className="qn-progress-pct">{Math.round((currentStep / 10) * 100)}%</span>
                </div>

                {/* Scrollable Form Area */}
                <div className="qn-page">
                    <div>
                        <div className="page-title">{STEPS[currentStep - 1].name}</div>
                        <div className="page-desc">{STEPS[currentStep - 1].short}</div>
                    </div>

                    <form onSubmit={handleNext} style={{ display: 'flex', flexDirection: 'column', flex: 1, gap: '48px' }}>
                        {currentStep === 1 && <Step1 formData={formData} onChange={handleInputChange} />}
                        {currentStep === 2 && <Step2 formData={formData} onChange={handleInputChange} />}
                        {currentStep === 3 && <Step3 formData={formData} onChange={handleInputChange} />}
                        {currentStep === 4 && <Step4 formData={formData} onChange={handleInputChange} />}
                        {currentStep === 5 && <Step5 formData={formData} onChange={handleInputChange} />}
                        {currentStep === 6 && <Step6 formData={formData} onChange={handleInputChange} setFormData={setFormData} />}
                        {currentStep === 7 && <Step7 formData={formData} onChange={handleInputChange} />}
                        {currentStep === 8 && <Step8 formData={formData} onChange={handleInputChange} />}
                        {currentStep === 9 && <Step9 formData={formData} onChange={handleInputChange} />}
                        {currentStep === 10 && <Step10 formData={formData} onChange={handleInputChange} />}

                        <div className="qn-nav-buttons">
                            {currentStep > 1 && (
                                <button type="button" className="qn-btn-back" onClick={() => setCurrentStep(s => s - 1)}>
                                    Back
                                </button>
                            )}
                            <button type="submit" className="qn-btn-next" disabled={saving}>
                                {saving ? 'Saving...' : (currentStep === 10 ? 'Generate Dashboard' : 'Next Step')}
                                {!saving && currentStep < 10 && (
                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                                        <polyline points="9 18 15 12 9 6" />
                                    </svg>
                                )}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
}

export default Questionnaire;

/* ═══════════════════════════════════════════════
   SHARED INPUT COMPONENTS
   ═══════════════════════════════════════════════ */

const InputField = ({ label, description, name, type = 'text', value, onChange, placeholder, info, prefix, suffix, required, min, max }) => {
    const inputChild = (
        <input
            type={type === 'currency' || type === 'percentage' ? 'number' : type}
            name={name} value={value !== undefined && value !== null ? value : ''} onChange={onChange} placeholder={placeholder}
            required={required}
            min={min} max={max}
        />
    );

    return (
        <div className="qn-field">
            <label>
                {label}
                {required && <span className="qn-required">*</span>}
                {info && <span className="qn-info-icon" title={info}>i</span>}
            </label>
            {description && <div style={{ fontSize: '11px', color: '#64748B', lineHeight: '1.4' }}>{description}</div>}

            {prefix ? (
                <div className="qn-rupee-wrap">
                    <span>{prefix}</span>
                    {inputChild}
                </div>
            ) : suffix ? (
                <div className="qn-pct-wrap">
                    {inputChild}
                    <span>{suffix}</span>
                </div>
            ) : inputChild}
        </div>
    );
};

const SelectField = ({ label, name, value, onChange, options, info, required }) => (
    <div className="qn-field">
        <label>
            {label}
            {required && <span className="qn-required">*</span>}
            {info && <span className="qn-info-icon" title={info}>i</span>}
        </label>
        <select name={name} value={value !== undefined && value !== null ? value : ''} onChange={onChange} required={required}>
            <option value="" disabled>Select</option>
            {options.map(opt => <option key={opt} value={opt}>{opt}</option>)}
        </select>
    </div>
);

const Row = ({ children, full }) => <div className={`qn-form-grid${full ? ' full' : ''}`}>{children}</div>;

/* ═══════════════════════════════════════════════
   STEP FORMS
   ═══════════════════════════════════════════════ */

const Step1 = ({ formData: f, onChange }) => {
    // Helper for 1-5 scale questions
    const renderScaleQuestion = (num, label, name) => {
        const scaleLabels = ['1', '2', '3', '4', '5'];
        const current = f[name] ? String(f[name]) : '';
        // Custom text for options to make the UI cleaner, mapping 1-5 to short texts based on question
        let optionsText = [];
        if (num === 1) optionsText = ['Struggled', 'Tight', 'Comfortable', 'Well-off', 'Wealthy'];
        else if (num === 2) optionsText = ['Rented', 'Stable, no own', 'Modest home', 'Valuable home', 'Multiple props'];
        else if (num === 3) optionsText = ['No higher ed', 'Self-funded', 'Partially funded', 'Fully funded', 'Elite funded'];
        else if (num === 4) optionsText = ['Never', 'Rarely', 'Occasionally', 'Regularly', 'Extensively'];
        else if (num === 5) optionsText = ['None', 'Minimal', 'Modest <₹50L', 'Meaningful <₹5Cr', 'Substantial ₹5Cr+'];
        else if (num === 7) optionsText = ['Poverty', 'Working class', 'Stable', 'Prosperous', 'Wealthy'];
        else if (num === 8) optionsText = ['No', 'Unlikely', 'Small amount', 'Modest', 'Significant'];
        else if (num === 9) optionsText = ['No, I support them', 'No help available', 'Limited help', 'Moderate support', 'Full cushion'];
        else if (num === 10) optionsText = ['All self-built', 'Hope to build', 'Minor assets', 'Meaningful assets', 'Significant trust'];

        return (
            <div className="qn-scale-question">
                <p>Q{num}. {label} <span className="qn-required">*</span></p>
                <div className="qn-scale-options">
                    {scaleLabels.map((val, j) => {
                        const selected = current === val;
                        return (
                            <button key={val} type="button"
                                className={`qn-scale-btn ${selected ? 'selected' : ''}`}
                                onClick={() => onChange({ target: { name, value: val, type: 'number' } })}
                            >
                                <span className="num">{val}</span>
                                <span className="lbl">{optionsText[j]}</span>
                            </button>
                        );
                    })}
                </div>
            </div>
        );
    };

    // Helper for multi-select Q6
    const renderQ6 = () => {
        const options = [
            { id: 'A', text: 'Paying for or contributing to my education' },
            { id: 'B', text: 'Covering rent or living expenses' },
            { id: 'C', text: 'Buying or contributing to a vehicle' },
            { id: 'D', text: 'Helping during a financial emergency' },
            { id: 'E', text: 'Down payment or purchase of a home' },
            { id: 'F', text: 'Starting or funding a business' },
            { id: 'G', text: 'Investing or opening financial accounts' },
            { id: 'H', text: 'Paying off a loan or debt' },
            { id: 'I', text: 'Regular financial support (monthly transfers, allowance)' },
            { id: 'J', text: 'None of the above' }
        ];

        let selections = f.gen_q6_selections || [];
        if (typeof selections === 'string') {
            try { selections = JSON.parse(selections); } catch (e) { selections = []; }
        }

        const handleToggle = (id) => {
            let newSelections = [...selections];
            if (id === 'J') {
                newSelections = ['J']; // Exclusive ('None of the above')
            } else {
                if (newSelections.includes('J')) newSelections = newSelections.filter(x => x !== 'J');
                if (newSelections.includes(id)) newSelections = newSelections.filter(x => x !== id);
                else newSelections.push(id);
            }
            // Also calculate the score (1 to 5)
            let score = 1;
            if (!newSelections.includes('J') && newSelections.length > 0) {
                // Keep the exact same max logic: 4 items = 5 points
                score = Math.min(5, newSelections.length + 1);
            }

            // Artificial event payload to bubble up to Questionnaire's onChange logic
            onChange({ target: { name: 'gen_q6_selections', value: newSelections, type: 'object' } });
            onChange({ target: { name: 'gen_q6', value: score, type: 'number' } });
        };

        return (
            <div className="qn-scale-question">
                <p>Q6. Have your parents ever helped you with any of the following? (pick all that apply) <span className="qn-required">*</span></p>
                <div className="qn-checkbox-list">
                    {options.map(opt => {
                        const selected = selections.includes(opt.id);
                        return (
                            <label key={opt.id} className={`qn-check-item ${selected ? 'checked' : ''}`}>
                                <input type="checkbox" checked={selected} onChange={() => handleToggle(opt.id)} />
                                <span>{opt.text}</span>
                            </label>
                        );
                    })}
                </div>
            </div>
        );
    };


    return (
        <>
            <Row>
                <InputField label="Date of Birth" name="date_of_birth" type="date" value={f.date_of_birth?.split('T')[0]} onChange={onChange} required />
                <SelectField label="City" name="city" value={f.city} onChange={onChange} options={['Mumbai', 'Delhi', 'Bengaluru', 'Hyderabad', 'Chennai', 'Kolkata', 'Pune', 'Ahmedabad', 'Other']} required />
            </Row>
            <Row>
                <SelectField label="Marital Status" name="marital_status" value={f.marital_status} onChange={onChange} options={['Single', 'Married', 'Divorced', 'Widowed']} required />
                <InputField label="Dependents" name="dependents" type="number" value={f.dependents} onChange={onChange} placeholder="0" info="Number of people financially dependent on you" required />
            </Row>
            <SelectField label="Employment Type" name="employment_type" value={f.employment_type} onChange={onChange} options={['Salaried', 'Self-Employed', 'Business', 'Retired', 'Student']} required />
            <Row>
                <SelectField label="Risk Comfort" name="risk_comfort" value={f.risk_comfort} onChange={onChange} options={['1', '2', '3', '4', '5', '6', '7', '8', '9', '10']} required info="Rate your comfort with financial risk, 1 = very low, 10 = very high" />
                <SelectField label="Investment Experience" name="investment_experience" value={f.investment_experience} onChange={onChange} options={['None', '< 1 year', '1-3 years', '3-5 years', '5+ years']} required />
            </Row>

            <div className="qn-form-section">
                <div>
                    <div className="qn-form-section-title">Generational Wealth Background</div>
                    <div className="qn-form-section-desc">Understanding your family's financial history helps us contextualise your starting point and the safety net available to you.</div>
                </div>

                <div>
                    <div className="qn-block-label">Block A - Childhood Financial Environment</div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '28px' }}>
                        {renderScaleQuestion(1, "Growing up, how would you describe your family's financial situation?", 'gen_q1')}
                        {renderScaleQuestion(2, "Did your parents own the home you grew up in?", 'gen_q2')}
                        {renderScaleQuestion(3, "How was your education funded?", 'gen_q3')}
                    </div>
                </div>

                <div>
                    <div className="qn-block-label">Block B - Direct Parental Financial Support</div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '28px' }}>
                        {renderScaleQuestion(4, "Did your parents ever provide financial help in your adult life? (e.g. rent, car, emergencies)", 'gen_q4')}
                        {renderScaleQuestion(5, "Did or will you receive any inheritance from your parents?", 'gen_q5')}
                        {renderQ6()}
                    </div>
                </div>

                <div>
                    <div className="qn-block-label">Block C - Grandparental & Ancestral Wealth</div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '28px' }}>
                        {renderScaleQuestion(7, "How would you describe your grandparents' financial situation?", 'gen_q7')}
                        {renderScaleQuestion(8, "Did your parents receive any inheritance or financial help from their parents?", 'gen_q8')}
                    </div>
                </div>

                <div>
                    <div className="qn-block-label">Block D - Current Safety Net & Wealth Signals</div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '28px' }}>
                        {renderScaleQuestion(9, "If you lost your job or faced a crisis, do you have family you could turn to for meaningful support?", 'gen_q9')}
                        {renderScaleQuestion(10, "Do you currently own or expect to own assets that came from your family?", 'gen_q10')}
                    </div>
                </div>
            </div>
        </>
    );
};

const Step2 = ({ formData: f, onChange }) => (
    <>
        <InputField label="Monthly Take-Home Income" name="monthly_take_home" type="currency" prefix="₹" value={f.monthly_take_home} onChange={onChange} info="After tax & deductions" required />
        <Row>
            <InputField label="Annual Salary" name="annual_salary" type="currency" prefix="₹" value={f.annual_salary} onChange={onChange} info="Pre-tax yearly salary incl. allowances" required />
            <InputField label="Business Income" name="business_income" type="currency" prefix="₹" value={f.business_income} onChange={onChange} info="Annual income from business/profession" />
        </Row>
        <Row>
            <InputField label="Annual Bonus" name="annual_bonus" type="currency" prefix="₹" value={f.annual_bonus} onChange={onChange} />
            <InputField label="Other Income (yearly)" name="other_income" type="currency" prefix="₹" value={f.other_income} onChange={onChange} info="Rental, freelance, interest etc." />
        </Row>
        <InputField label="Expected Income Growth" name="expected_income_growth" type="percentage" suffix="%" value={f.expected_income_growth} onChange={onChange} />
    </>
);

const Step3 = ({ formData: f, onChange }) => (
    <>
        <div className="qn-subsection-label">Part A: Monthly Expenses</div>
        <Row>
            <InputField label="Household & Lifestyle" description="Groceries, maid, maintenance, clothing, personal care." name="expense_household" type="currency" prefix="₹" value={f.expense_household} onChange={onChange} />
            <InputField label="Rent / Home EMI" description="House rent or EMI for your primary residence." name="expense_rent" type="currency" prefix="₹" value={f.expense_rent} onChange={onChange} />
        </Row>
        <Row>
            <InputField label="Utilities" description="Electricity, water, gas, internet, mobile bills." name="expense_utilities" type="currency" prefix="₹" value={f.expense_utilities} onChange={onChange} />
            <InputField label="Transport" description="Fuel, public transit, cab fares, vehicle maintenance." name="expense_transport" type="currency" prefix="₹" value={f.expense_transport} onChange={onChange} />
        </Row>
        <Row>
            <InputField label="Food & Dining" description="Eating out, ordering in, coffee shop visits." name="expense_food" type="currency" prefix="₹" value={f.expense_food} onChange={onChange} />
            <InputField label="Subscriptions" description="Netflix, Gym, Amazon Prime, software." name="expense_subscriptions" type="currency" prefix="₹" value={f.expense_subscriptions} onChange={onChange} />
        </Row>
        <Row full>
            <InputField label="Discretionary" description="Shopping, hobbies, movies, recreational activities." name="expense_discretionary" type="currency" prefix="₹" value={f.expense_discretionary} onChange={onChange} />
        </Row>

        <div className="qn-subsection-label" style={{ marginTop: '32px' }}>Part B: Annual Expenses</div>
        <div style={{ padding: '12px 16px', backgroundColor: '#F0F9FF', borderRadius: '8px', border: '1px solid #BAE6FD', marginBottom: '20px', fontSize: '12px', color: '#0369A1', lineHeight: 1.6 }}>
            <strong>Why do we ask for these?</strong> Yearly obligations take a hidden cut from your monthly income. We prorate these to reveal your <i>true</i> monthly surplus and pad your emergency fund.
        </div>
        <Row>
            <InputField label="Insurance Premiums" description="Yearly payments for Health, Term, Vehicle, or Home insurance." name="expense_annual_insurance" type="currency" prefix="₹" value={f.expense_annual_insurance} onChange={onChange} />
            <InputField label="Education / School Fees" description="Yearly school, college, or tuition fees for children or self." name="expense_annual_education" type="currency" prefix="₹" value={f.expense_annual_education} onChange={onChange} />
        </Row>
        <Row>
            <InputField label="Property Tax & Maintenance" description="Yearly property taxes, major home repairs, or society charges." name="expense_annual_property" type="currency" prefix="₹" value={f.expense_annual_property} onChange={onChange} />
            <InputField label="Travel & Vacations" description="Estimated yearly budget for family trips and holidays." name="expense_annual_travel" type="currency" prefix="₹" value={f.expense_annual_travel} onChange={onChange} />
        </Row>
        <Row>
            <InputField label="Other Annual Obligations" description="Festive expenses, large gifts, or any other yearly recurring costs." name="expense_annual_other" type="currency" prefix="₹" value={f.expense_annual_other} onChange={onChange} />
        </Row>
    </>
);

const Step4 = ({ formData: f, onChange }) => (
    <>
        <InputField label="Savings Account Balance" name="savings_balance" type="currency" prefix="₹" value={f.savings_balance} onChange={onChange} info="Total balance across all savings accounts" />
        <Row>
            <InputField label="Fixed Deposits Balance" name="fd_balance" type="currency" prefix="₹" value={f.fd_balance} onChange={onChange} info="FDs are time-bound deposits with guaranteed returns at a fixed interest rate" />
            <InputField label="FD Average Rate" name="fd_rate" type="percentage" suffix="%" value={f.fd_rate} onChange={onChange} info="Weighted average interest rate across your FDs" />
        </Row>
        <InputField label="Emergency Fund Set Aside" name="emergency_fund" type="currency" prefix="₹" value={f.emergency_fund} onChange={onChange} info="Liquid cash kept aside for unexpected expenses (medical, job loss). Ideally 3-6 months of expenses." />
    </>
);

const Step5 = ({ formData: f, onChange }) => (
    <>
        <Row>
            <InputField label="Direct Stocks" name="inv_direct_stocks" type="currency" prefix="₹" value={f.inv_direct_stocks} onChange={onChange} info="Current market value of shares you directly hold in a Demat account" />
            <InputField label="Equity Mutual Funds" name="inv_equity_mf" type="currency" prefix="₹" value={f.inv_equity_mf} onChange={onChange} info="Current NAV value of all equity-oriented mutual fund holdings" />
        </Row>
        <Row>
            <InputField label="EPF / PPF / NPS" name="inv_epf_ppf_nps" type="currency" prefix="₹" value={f.inv_epf_ppf_nps} onChange={onChange} info="EPF = Employee Provident Fund (employer deduction). PPF = Public Provident Fund. NPS = National Pension System." />
            <InputField label="Debt Funds & Bonds" name="inv_debt_funds" type="currency" prefix="₹" value={f.inv_debt_funds} onChange={onChange} info="Funds that invest in fixed-income instruments like govt bonds, corporate bonds. Lower risk than equity." />
        </Row>
        <Row>
            <InputField label="Gold / Commodities" name="inv_gold_commodities" type="currency" prefix="₹" value={f.inv_gold_commodities} onChange={onChange} info="Physical gold, Sovereign Gold Bonds, Gold ETFs, or commodity investments" />
            <InputField label="Real Estate Value" name="inv_real_estate" type="currency" prefix="₹" value={f.inv_real_estate} onChange={onChange} info="Current market value of all property owned (excluding primary residence loan)" />
        </Row>
        <Row full>
            <InputField label="Crypto / Alternatives" name="inv_crypto_alt" type="currency" prefix="₹" value={f.inv_crypto_alt} onChange={onChange} info="Cryptocurrency, REITs, InvITs, angel investments, P2P lending, etc." />
        </Row>
        <div className="qn-subsection-label" style={{ marginTop: '16px' }}>Recurring Investments</div>
        <Row full>
            <InputField label="Monthly SIP Amount" name="inv_monthly_sip" type="currency" prefix="₹" value={f.inv_monthly_sip} onChange={onChange} info="Total monthly SIP or recurring investment amount across all schemes (mutual funds, stocks, etc.)" />
        </Row>
    </>
);

const Step6 = ({ formData: f, onChange, setFormData }) => {
    const loans = Array.isArray(f.loans) ? f.loans : [];

    const addLoan = () => {
        setFormData(prev => ({
            ...prev,
            loans: [...(Array.isArray(prev.loans) ? prev.loans : []), { type: 'Home Loan', outstanding: '', interestRate: '', emi: '', tenure: '' }]
        }));
    };

    const removeLoan = (idx) => {
        setFormData(prev => ({
            ...prev,
            loans: (Array.isArray(prev.loans) ? prev.loans : []).filter((_, i) => i !== idx)
        }));
    };

    const updateLoan = (idx, field, value) => {
        setFormData(prev => {
            const updated = [...(Array.isArray(prev.loans) ? prev.loans : [])];
            updated[idx] = { ...updated[idx], [field]: value };
            return { ...prev, loans: updated };
        });
    };

    return (
        <>
            {/* Loans Section */}
            <div className="qn-subsection-label" style={{ marginBottom: '24px' }}>
                <span>Active Loans</span>
                <button type="button" onClick={addLoan} className="qn-btn-add">
                    <Plus size={14} /> Add Loan
                </button>
            </div>

            {loans.length === 0 && (
                <div style={{ padding: '24px', border: '1px dashed #E2E8F0', borderRadius: '8px', textAlign: 'center', marginBottom: '20px', color: '#94A3B8', fontSize: '13px' }}>
                    No loans added. Click "Add Loan" to add one.
                </div>
            )}

            {loans.map((loan, idx) => (
                <div key={idx} className="qn-loan-card">
                    <div className="qn-loan-card-header">
                        <span className="qn-loan-card-title">Loan {idx + 1}</span>
                        <button type="button" onClick={() => removeLoan(idx)} className="qn-btn-remove">
                            <Trash2 size={12} /> Remove
                        </button>
                    </div>
                    <div className="qn-form-grid full">
                        <div className="qn-field">
                            <label>Loan Type</label>
                            <select value={loan.type || ''} onChange={e => updateLoan(idx, 'type', e.target.value)}>
                                <option value="" disabled>Select</option>
                                {['Home Loan', 'Car Loan', 'Personal Loan', 'Education Loan', 'Gold Loan', 'Other'].map(opt =>
                                    <option key={opt} value={opt}>{opt}</option>
                                )}
                            </select>
                        </div>
                    </div>
                    <Row>
                        <div className="qn-field">
                            <label>Outstanding Amount</label>
                            <div className="qn-rupee-wrap">
                                <span>₹</span>
                                <input type="number" value={loan.outstanding || ''} onChange={e => updateLoan(idx, 'outstanding', e.target.value)} />
                            </div>
                        </div>
                        <div className="qn-field">
                            <label>Interest Rate</label>
                            <div className="qn-pct-wrap">
                                <input type="number" value={loan.interestRate || ''} onChange={e => updateLoan(idx, 'interestRate', e.target.value)} />
                                <span>%</span>
                            </div>
                        </div>
                    </Row>
                    <Row>
                        <div className="qn-field">
                            <label>Monthly EMI</label>
                            <div className="qn-rupee-wrap">
                                <span>₹</span>
                                <input type="number" value={loan.emi || ''} onChange={e => updateLoan(idx, 'emi', e.target.value)} />
                            </div>
                        </div>
                        <div className="qn-field">
                            <label>Remaining Tenure (months)</label>
                            <input type="number" value={loan.tenure || ''} onChange={e => updateLoan(idx, 'tenure', e.target.value)} min="0" />
                        </div>
                    </Row>
                </div>
            ))}

            {/* Credit Card Outstanding */}
            <div className="qn-subsection-label">Credit Card</div>
            <Row full>
                <InputField label="Credit Card Outstanding" name="credit_card_outstanding" type="currency" prefix="₹" value={f.credit_card_outstanding} onChange={onChange} info="Total unpaid credit card balance" />
            </Row>

            {/* Credit Score */}
            <div className="qn-subsection-label">Credit Score</div>
            <Row full>
                <InputField label="Credit Score" name="credit_score" type="number" value={f.credit_score} onChange={onChange} placeholder="e.g. 750" info="Check on CIBIL, Experian, etc." />
            </Row>
        </>
    );
};

const Step7 = ({ formData: f, onChange }) => (
    <>
        <div className="qn-subsection-label">Health Insurance</div>
        <Row>
            <InputField label="Health Cover Amount" name="health_cover" type="currency" prefix="₹" value={f.health_cover} onChange={onChange} info="Sum insured - the maximum the insurer will pay. Ideal: ₹10-25L for a family." />
            <InputField label="Annual Premium" name="health_premium" type="currency" prefix="₹" value={f.health_premium} onChange={onChange} info="Yearly amount you pay to keep the policy active. Also eligible for 80D tax deduction." />
        </Row>
        <div className="qn-subsection-label" style={{ marginTop: '32px' }}>Life Insurance</div>
        <Row>
            <InputField label="Term Cover Amount" name="life_cover" type="currency" prefix="₹" value={f.life_cover} onChange={onChange} info="Term insurance pays a lump sum to your nominee if you die during the policy term. Ideal: 10-15x your annual income." />
            <InputField label="Annual Premium" name="life_premium" type="currency" prefix="₹" value={f.life_premium} onChange={onChange} info="Yearly cost of your term/life policy. Term plans are the most cost-effective option." />
        </Row>
    </>
);

const Step8 = ({ formData: f, onChange }) => (
    <>
        <SelectField label="Current Tax Regime" name="tax_regime" value={f.tax_regime} onChange={onChange} options={['Old Regime', 'New Regime', 'Not Sure']} info="Old Regime allows deductions (80C, HRA, etc) but has higher base rates. New Regime has lower rates but fewer deductions." />
        <Row>
            <InputField label="80C Used (PPF, ELSS, etc)" name="tax_80c_used" type="currency" prefix="₹" value={f.tax_80c_used} onChange={onChange} info="Section 80C: up to ₹1.5L deduction for PPF, ELSS, LIC, tuition fees, home loan principal, etc." />
            <InputField label="NPS 80CCD(1B)" name="tax_nps_80ccd" type="currency" prefix="₹" value={f.tax_nps_80ccd} onChange={onChange} info="Extra ₹50,000 deduction over 80C for NPS (National Pension System) contributions. Only in Old Regime." />
        </Row>
        <Row>
            <InputField label="HRA Used" name="tax_hra" type="currency" prefix="₹" value={f.tax_hra} onChange={onChange} info="House Rent Allowance exemption for salaried individuals paying rent. Only in Old Regime." />
            <InputField label="Home Loan Interest" name="tax_home_loan_interest" type="currency" prefix="₹" value={f.tax_home_loan_interest} onChange={onChange} info="Section 24: up to ₹2L deduction on home loan interest paid (self-occupied property). Old Regime only." />
        </Row>
        <InputField label="Health Insurance 80D" name="tax_80d" type="currency" prefix="₹" value={f.tax_80d} onChange={onChange} info="Up to ₹25K for self + ₹25K for parents (₹50K if senior). Covers health insurance premiums and preventive checkups." />
    </>
);

const Step9 = ({ formData: f, onChange }) => (
    <>
        <SelectField label="Do you have a Will?" name="has_will" value={f.has_will} onChange={onChange} options={['Yes', 'No', 'In Progress']} info="A legally registered will ensures your assets go to chosen beneficiaries and avoids family disputes." />
        <SelectField label="Nominees set for major accounts?" name="nominees_set" value={f.nominees_set} onChange={onChange} options={['Yes, all', 'Yes, some', 'No']} info="Nominees are temporary custodians. Set nominees on: Bank accounts, Demat, Insurance, PF, NPS, MF folios." />
        <InputField label="Number of Nominees Assigned" name="num_nominees" type="number" value={f.num_nominees} onChange={onChange} info="Count of unique nominees across all your financial accounts" />
    </>
);

const Step10 = ({ formData: f, onChange }) => {
    const questions = [
        { label: 'I review my finances at least once a month', name: 'beh_review_monthly' },
        { label: 'I tend to delay important financial decisions', name: 'beh_delay_decisions' },
        { label: 'I sometimes spend impulsively and regret it later', name: 'beh_spend_impulsively' },
        { label: 'I actively avoid taking on unnecessary debt', name: 'beh_avoid_debt' },
        { label: 'When markets fall, I stay calm and don\'t change my investments', name: 'beh_market_reaction' },
        { label: 'When I receive unexpected money, I invest or save most of it', name: 'beh_windfall_behaviour' },
        { label: 'I hold onto losing investments hoping they will recover', name: 'beh_hold_losing' },
        { label: 'I understand what I\'m invested in and why', name: 'beh_product_understanding' },
        { label: 'I compare my financial progress with friends or peers', name: 'beh_compare_peers' }
    ];
    const scaleLabels = ['Strongly Disagree', 'Disagree', 'Neutral', 'Agree', 'Strongly Agree'];
    return <>
        <div style={{ padding: '12px 16px', backgroundColor: '#F8FAFC', borderRadius: '8px', border: '1px solid #E8ECF1', marginBottom: '24px', fontSize: '12px', color: '#475569', lineHeight: 1.7 }}>
            <span style={{ fontWeight: 600, color: '#1E293B' }}>How to answer:</span> Rate each statement on a scale of 1 to 5 based on how strongly you agree with it.
            <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', marginTop: '8px' }}>
                {scaleLabels.map((lbl, i) => (
                    <span key={i} style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <span style={{ fontWeight: 700, color: '#1E293B' }}>{i + 1}</span>
                        <span style={{ color: '#64748B' }}>= {lbl}</span>
                    </span>
                ))}
            </div>
        </div>
        {questions.map((q, i) => {
            const current = f[q.name] ? String(f[q.name]) : '';
            return (
                <div key={i} className="qn-scale-question" style={{ marginBottom: '24px' }}>
                    <p>{q.label} <span className="qn-required">*</span></p>
                    <div className="qn-scale-options">
                        {scaleLabels.map((lbl, j) => {
                            const val = String(j + 1);
                            const selected = current === val;
                            return (
                                <button key={val} type="button"
                                    className={`qn-scale-btn ${selected ? 'selected' : ''}`}
                                    onClick={() => onChange({ target: { name: q.name, value: val } })}
                                >
                                    <span className="num">{val}</span>
                                    <span className="lbl">{lbl}</span>
                                </button>
                            );
                        })}
                    </div>
                </div>
            );
        })}
    </>;
};
