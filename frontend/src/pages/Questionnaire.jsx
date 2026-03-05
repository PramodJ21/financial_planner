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
    navy: '#1E293B',
    navyLight: '#334155',
    label: '#1E293B',
    sublabel: '#64748B',
    border: '#E2E8F0',
    bg: '#F8FAFC',
    sidebarBg: '#FFFFFF',
    activeBg: '#EFF6FF',
    activeText: '#1E293B',
    inactiveText: '#94A3B8',
    completedIcon: '#22C55E',
    progressBar: '#1E293B',
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
            if (isFinal) navigate('/dashboard');
            else setCurrentStep(s => Math.min(s + 1, 10));
        } catch (err) { alert('Failed to save. Please try again.'); }
        finally { setSaving(false); }
    };

    const handleNext = (e) => { e.preventDefault(); saveStep(currentStep, currentStep === 10); };

    if (loading) return (
        <div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: C.bg }}>
            <div style={{ color: C.navy, fontWeight: 600 }}>Loading your profile…</div>
        </div>
    );

    return (
        <div className="questionnaire-layout" style={{ backgroundColor: C.bg, fontFamily: "'Inter', sans-serif" }}>

            {/* ─── SIDEBAR ─── */}
            <div className="questionnaire-sidebar" style={{
                backgroundColor: C.sidebarBg,
                borderRight: `1px solid ${C.border}`,
                display: 'flex', flexDirection: 'column',
                overflowY: 'auto'
            }}>
                {/* Brand */}
                <div style={{ padding: '20px 20px 24px', display: 'flex', alignItems: 'center', gap: '10px', borderBottom: `1px solid ${C.border}` }}>
                    <div style={{
                        width: '32px', height: '32px', backgroundColor: C.navy, borderRadius: '8px',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        color: 'white', fontWeight: 700, fontSize: '12px'
                    }}>FH</div>
                    <span style={{ fontWeight: 700, fontSize: '16px', color: C.navy }}>FinHealth</span>
                </div>

                {/* Step List */}
                <nav style={{ padding: '16px 0', flex: 1 }}>
                    {STEPS.map(step => {
                        const isActive = currentStep === step.id;
                        const isCompleted = step.id < currentStep;
                        return (
                            <div
                                key={step.id}
                                onClick={() => isCompleted && setCurrentStep(step.id)}
                                style={{
                                    display: 'flex', alignItems: 'center', gap: '12px',
                                    padding: '10px 20px',
                                    cursor: isCompleted ? 'pointer' : 'default',
                                    backgroundColor: isActive ? C.activeBg : 'transparent',
                                    borderLeft: isActive ? `3px solid ${C.navy}` : '3px solid transparent',
                                    transition: 'all 0.15s'
                                }}
                            >
                                {/* Step indicator */}
                                {isCompleted ? (
                                    <div style={{ width: '22px', height: '22px', borderRadius: '50%', backgroundColor: C.completedIcon, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                        <Check size={13} color="white" strokeWidth={3} />
                                    </div>
                                ) : (
                                    <div style={{
                                        width: '22px', height: '22px', borderRadius: '50%', flexShrink: 0,
                                        border: isActive ? `2px solid ${C.navy}` : `2px solid ${C.border}`,
                                        backgroundColor: isActive ? C.navy : 'transparent',
                                        display: 'flex', alignItems: 'center', justifyContent: 'center'
                                    }}>
                                        {isActive && <div style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: 'white' }}></div>}
                                    </div>
                                )}

                                <span style={{
                                    fontSize: '13px',
                                    fontWeight: isActive ? 600 : 400,
                                    color: isActive ? C.activeText : (isCompleted ? C.navyLight : C.inactiveText)
                                }}>
                                    {String(step.id).padStart(2, '0')}  {step.name}
                                </span>
                            </div>
                        );
                    })}
                </nav>
            </div>

            {/* ─── MAIN CONTENT AREA ─── */}
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

                {/* Top Progress Bar */}
                <div style={{
                    height: '52px', backgroundColor: C.white,
                    borderBottom: `1px solid ${C.border}`,
                    display: 'flex', alignItems: 'center',
                    padding: '0 32px', flexShrink: 0
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flex: 1 }}>
                        <span style={{ color: C.sublabel, fontSize: '13px', fontWeight: 500, whiteSpace: 'nowrap' }}>Step {currentStep} of 10</span>
                        <div style={{ height: '4px', backgroundColor: '#E2E8F0', flex: 1, maxWidth: '300px', borderRadius: '2px', overflow: 'hidden' }}>
                            <div style={{ height: '100%', backgroundColor: C.progressBar, width: `${(currentStep / 10) * 100}%`, transition: 'width 0.3s ease', borderRadius: '2px' }}></div>
                        </div>
                        <span style={{ color: C.sublabel, fontSize: '13px', fontWeight: 500 }}>{Math.round((currentStep / 10) * 100)}%</span>
                    </div>
                </div>

                {/* Scrollable Form Area */}
                <div className="questionnaire-main-scroll" style={{ flex: 1, overflowY: 'auto', display: 'flex', justifyContent: 'center' }}>
                    <div style={{ width: '100%', maxWidth: '640px' }}>
                        <h1 style={{ fontSize: '22px', fontWeight: 700, color: C.navy, marginBottom: '4px' }}>{STEPS[currentStep - 1].name}</h1>
                        <p style={{ fontSize: '14px', color: C.sublabel, marginBottom: '32px' }}>{STEPS[currentStep - 1].short}</p>

                        <form onSubmit={handleNext}>
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

                            <div style={{ display: 'flex', justifyContent: 'center', marginTop: '40px', gap: '12px', padding: '0 24px' }}>
                                {currentStep > 1 && (
                                    <button type="button" onClick={() => setCurrentStep(s => s - 1)} style={{
                                        padding: '12px 28px', borderRadius: '24px', fontSize: '14px', fontWeight: 600,
                                        border: `1px solid ${C.border}`, backgroundColor: C.white, color: C.navy, cursor: 'pointer'
                                    }}>Back</button>
                                )}
                                <button type="submit" disabled={saving} style={{
                                    padding: '12px 32px', borderRadius: '24px', fontSize: '14px', fontWeight: 600,
                                    backgroundColor: C.navy, color: 'white', border: 'none', cursor: 'pointer',
                                    display: 'flex', alignItems: 'center', gap: '8px',
                                    opacity: saving ? 0.7 : 1
                                }}>
                                    {saving ? 'Saving…' : (currentStep === 10 ? 'Generate Dashboard' : 'Next Step')}
                                    <ChevronRight size={16} />
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default Questionnaire;

/* ═══════════════════════════════════════════════
   SHARED INPUT COMPONENTS
   ═══════════════════════════════════════════════ */

const labelStyle = { fontSize: '13px', fontWeight: 600, color: '#1E293B', marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '4px' };

const inputStyle = {
    width: '100%', padding: '10px 14px', borderRadius: '6px',
    border: '1px solid #E2E8F0', outline: 'none', fontSize: '14px',
    color: '#1E293B', backgroundColor: '#FFFFFF', transition: 'border-color 0.15s'
};

const selectStyle = { ...inputStyle, appearance: 'none', backgroundImage: 'url("data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' width=\'16\' height=\'16\' fill=\'%2394A3B8\' viewBox=\'0 0 16 16\'%3E%3Cpath d=\'M4.646 5.646a.5.5 0 0 1 .708 0L8 8.293l2.646-2.647a.5.5 0 0 1 .708.708l-3 3a.5.5 0 0 1-.708 0l-3-3a.5.5 0 0 1 0-.708z\'/%3E%3C/svg%3E")', backgroundRepeat: 'no-repeat', backgroundPosition: 'right 12px center', paddingRight: '36px' };

const InputField = ({ label, description, name, type = 'text', value, onChange, placeholder, info, prefix, suffix, required, min, max }) => (
    <div style={{ flex: 1, marginBottom: '20px' }}>
        <label style={labelStyle}>
            {label}
            {required && <span style={{ color: '#EF4444', marginLeft: '2px' }}>*</span>}
            {info && <span title={info} style={{ cursor: 'help' }}><Info size={13} color="#94A3B8" /></span>}
        </label>
        {description && <div style={{ fontSize: '11px', color: '#64748B', marginBottom: '8px', lineHeight: '1.4' }}>{description}</div>}
        <div style={{ position: 'relative' }}>
            {prefix && <span style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#94A3B8', fontSize: '14px', pointerEvents: 'none' }}>{prefix}</span>}
            <input
                type={type === 'currency' || type === 'percentage' ? 'number' : type}
                name={name} value={value !== undefined && value !== null ? value : ''} onChange={onChange} placeholder={placeholder}
                required={required}
                min={min} max={max}
                style={{ ...inputStyle, ...(prefix ? { paddingLeft: '30px' } : {}), ...(suffix ? { paddingRight: '36px' } : {}) }}
                onFocus={(e) => e.target.style.borderColor = '#1E293B'}
                onBlur={(e) => e.target.style.borderColor = '#E2E8F0'}
            />
            {suffix && <span style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', color: '#94A3B8', fontSize: '14px', pointerEvents: 'none' }}>{suffix}</span>}
        </div>
    </div>
);

const SelectField = ({ label, name, value, onChange, options, info, required }) => (
    <div style={{ flex: 1, marginBottom: '20px' }}>
        <label style={labelStyle}>
            {label}
            {required && <span style={{ color: '#EF4444', marginLeft: '2px' }}>*</span>}
            {info && <span title={info} style={{ cursor: 'help' }}><Info size={13} color="#94A3B8" /></span>}
        </label>
        <select name={name} value={value !== undefined && value !== null ? value : ''} onChange={onChange} required={required} style={selectStyle}
            onFocus={(e) => e.target.style.borderColor = '#1E293B'}
            onBlur={(e) => e.target.style.borderColor = '#E2E8F0'}
        >
            <option value="" disabled>Select</option>
            {options.map(opt => <option key={opt} value={opt}>{opt}</option>)}
        </select>
    </div>
);

const Row = ({ children }) => <div className="form-row">{children}</div>;

/* ═══════════════════════════════════════════════
   STEP FORMS
   ═══════════════════════════════════════════════ */

const Step1 = ({ formData: f, onChange }) => (
    <>
        <InputField label="Full Name" name="full_name" value={f.full_name} onChange={onChange} placeholder="Enter your full name" required />
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
    </>
);

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
        <p style={{ fontSize: '13px', fontWeight: 700, textTransform: 'uppercase', color: '#94A3B8', letterSpacing: '0.5px', marginBottom: '16px' }}>Part A: Monthly Expenses</p>
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
        <Row>
            <InputField label="Discretionary" description="Shopping, hobbies, movies, recreational activities." name="expense_discretionary" type="currency" prefix="₹" value={f.expense_discretionary} onChange={onChange} />
        </Row>

        <p style={{ fontSize: '13px', fontWeight: 700, textTransform: 'uppercase', color: '#94A3B8', letterSpacing: '0.5px', marginBottom: '16px', marginTop: '32px' }}>Part B: Annual Expenses</p>
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
        <Row>
            <InputField label="Crypto / Alternatives" name="inv_crypto_alt" type="currency" prefix="₹" value={f.inv_crypto_alt} onChange={onChange} info="Cryptocurrency, REITs, InvITs, angel investments, P2P lending, etc." />
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
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                <p style={{ fontSize: '12px', fontWeight: 700, textTransform: 'uppercase', color: '#94A3B8', letterSpacing: '0.5px', margin: 0 }}>Active Loans</p>
                <button type="button" onClick={addLoan} style={{
                    display: 'flex', alignItems: 'center', gap: '6px', padding: '6px 14px', borderRadius: '6px',
                    border: '1px solid #E2E8F0', backgroundColor: '#F8FAFC', fontSize: '12px', fontWeight: 600,
                    color: '#1E293B', cursor: 'pointer'
                }}>
                    <Plus size={14} /> Add Loan
                </button>
            </div>

            {loans.length === 0 && (
                <div style={{ padding: '24px', border: '1px dashed #E2E8F0', borderRadius: '8px', textAlign: 'center', marginBottom: '20px', color: '#94A3B8', fontSize: '13px' }}>
                    No loans added. Click "Add Loan" to add one.
                </div>
            )}

            {loans.map((loan, idx) => (
                <div key={idx} style={{
                    border: '1px solid #E2E8F0', borderRadius: '8px', padding: '16px',
                    marginBottom: '16px', backgroundColor: '#FAFBFC', position: 'relative'
                }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                        <span style={{ fontSize: '13px', fontWeight: 600, color: '#1E293B' }}>Loan {idx + 1}</span>
                        <button type="button" onClick={() => removeLoan(idx)} style={{
                            display: 'flex', alignItems: 'center', gap: '4px', padding: '4px 10px', borderRadius: '4px',
                            border: '1px solid #FCA5A5', backgroundColor: '#FEF2F2', fontSize: '11px', fontWeight: 600,
                            color: '#DC2626', cursor: 'pointer'
                        }}>
                            <Trash2 size={12} /> Remove
                        </button>
                    </div>
                    <div style={{ marginBottom: '12px' }}>
                        <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#1E293B', marginBottom: '6px' }}>Loan Type</label>
                        <select value={loan.type || ''} onChange={e => updateLoan(idx, 'type', e.target.value)} style={{
                            width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid #E2E8F0',
                            fontSize: '14px', color: '#1E293B', backgroundColor: 'white', outline: 'none'
                        }}>
                            <option value="" disabled>Select</option>
                            {['Home Loan', 'Car Loan', 'Personal Loan', 'Education Loan', 'Gold Loan', 'Other'].map(opt =>
                                <option key={opt} value={opt}>{opt}</option>
                            )}
                        </select>
                    </div>
                    <Row>
                        <div style={{ flex: 1, marginBottom: '12px' }}>
                            <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#1E293B', marginBottom: '6px' }}>Outstanding Amount</label>
                            <div style={{ position: 'relative' }}>
                                <span style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#94A3B8', fontSize: '14px' }}>₹</span>
                                <input type="number" value={loan.outstanding || ''} onChange={e => updateLoan(idx, 'outstanding', e.target.value)} style={{
                                    width: '100%', padding: '10px 12px 10px 30px', borderRadius: '8px', border: '1px solid #E2E8F0',
                                    fontSize: '14px', color: '#1E293B', outline: 'none', boxSizing: 'border-box'
                                }} />
                            </div>
                        </div>
                        <div style={{ flex: 1, marginBottom: '12px' }}>
                            <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#1E293B', marginBottom: '6px' }}>Interest Rate</label>
                            <div style={{ position: 'relative' }}>
                                <input type="number" value={loan.interestRate || ''} onChange={e => updateLoan(idx, 'interestRate', e.target.value)} style={{
                                    width: '100%', padding: '10px 36px 10px 12px', borderRadius: '8px', border: '1px solid #E2E8F0',
                                    fontSize: '14px', color: '#1E293B', outline: 'none', boxSizing: 'border-box'
                                }} />
                                <span style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', color: '#94A3B8', fontSize: '14px' }}>%</span>
                            </div>
                        </div>
                    </Row>
                    <Row>
                        <div style={{ flex: 1, marginBottom: '12px' }}>
                            <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#1E293B', marginBottom: '6px' }}>Monthly EMI</label>
                            <div style={{ position: 'relative' }}>
                                <span style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#94A3B8', fontSize: '14px' }}>₹</span>
                                <input type="number" value={loan.emi || ''} onChange={e => updateLoan(idx, 'emi', e.target.value)} style={{
                                    width: '100%', padding: '10px 12px 10px 30px', borderRadius: '8px', border: '1px solid #E2E8F0',
                                    fontSize: '14px', color: '#1E293B', outline: 'none', boxSizing: 'border-box'
                                }} />
                            </div>
                        </div>
                        <div style={{ flex: 1, marginBottom: '12px' }}>
                            <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#1E293B', marginBottom: '6px' }}>Remaining Tenure (months)</label>
                            <input type="number" value={loan.tenure || ''} onChange={e => updateLoan(idx, 'tenure', e.target.value)} style={{
                                width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid #E2E8F0',
                                fontSize: '14px', color: '#1E293B', outline: 'none', boxSizing: 'border-box'
                            }} />
                        </div>
                    </Row>
                </div>
            ))}

            {/* Credit Card Outstanding */}
            <p style={{ fontSize: '12px', fontWeight: 700, textTransform: 'uppercase', color: '#94A3B8', letterSpacing: '0.5px', marginBottom: '12px', marginTop: '8px' }}>Credit Card</p>
            <InputField label="Credit Card Outstanding" name="credit_card_outstanding" type="currency" prefix="₹" value={f.credit_card_outstanding} onChange={onChange} info="Total unpaid credit card balance" />

            {/* Credit Score */}
            <p style={{ fontSize: '12px', fontWeight: 700, textTransform: 'uppercase', color: '#94A3B8', letterSpacing: '0.5px', marginBottom: '12px', marginTop: '8px' }}>Credit Score</p>
            <InputField label="Credit Score" name="credit_score" type="number" value={f.credit_score} onChange={onChange} placeholder="e.g. 750" info="Check on CIBIL, Experian, etc." />
        </>
    );
};

const Step7 = ({ formData: f, onChange }) => (
    <>
        <p style={{ fontSize: '12px', fontWeight: 700, textTransform: 'uppercase', color: '#94A3B8', letterSpacing: '0.5px', marginBottom: '12px' }}>Health Insurance</p>
        <Row>
            <InputField label="Health Cover Amount" name="health_cover" type="currency" prefix="₹" value={f.health_cover} onChange={onChange} info="Sum insured — the maximum the insurer will pay. Ideal: ₹10-25L for a family." />
            <InputField label="Annual Premium" name="health_premium" type="currency" prefix="₹" value={f.health_premium} onChange={onChange} info="Yearly amount you pay to keep the policy active. Also eligible for 80D tax deduction." />
        </Row>
        <p style={{ fontSize: '12px', fontWeight: 700, textTransform: 'uppercase', color: '#94A3B8', letterSpacing: '0.5px', marginBottom: '12px', marginTop: '12px' }}>Life Insurance</p>
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
        { label: 'I tend to delay financial decisions', name: 'beh_delay_decisions' },
        { label: 'I prefer guaranteed returns over higher risk', name: 'beh_prefer_guaranteed' },
        { label: 'I change investments based on market news', name: 'beh_follow_market_news' },
        { label: 'I sometimes spend impulsively', name: 'beh_spend_impulsively' },
        { label: 'I review my finances at least monthly', name: 'beh_review_monthly' },
        { label: 'I actively avoid taking on debt', name: 'beh_avoid_debt' },
        { label: 'I hold onto losing investments hoping they recover', name: 'beh_hold_losing' },
        { label: 'I feel anxious making large financial decisions', name: 'beh_anxious_decisions' },
        { label: 'I prefer investing in brands I personally use', name: 'beh_familiar_brands' },
        { label: 'I compare my financial progress with peers', name: 'beh_compare_peers' }
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
                <div key={i} style={{ marginBottom: '24px' }}>
                    <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#1E293B', marginBottom: '10px' }}>
                        {q.label} <span style={{ color: '#EF4444' }}>*</span>
                    </label>
                    <div style={{ display: 'flex', gap: '0', borderRadius: '8px', overflow: 'hidden', border: '1px solid #E2E8F0' }}>
                        {scaleLabels.map((lbl, j) => {
                            const val = String(j + 1);
                            const selected = current === val;
                            return (
                                <button key={val} type="button"
                                    onClick={() => onChange({ target: { name: q.name, value: val } })}
                                    style={{
                                        flex: 1, padding: '10px 4px', border: 'none', cursor: 'pointer',
                                        backgroundColor: selected ? '#1E293B' : '#fff',
                                        color: selected ? '#fff' : '#475569',
                                        fontSize: '11px', fontWeight: 600, textAlign: 'center',
                                        borderRight: j < 4 ? '1px solid #E2E8F0' : 'none',
                                        transition: 'all 0.15s ease'
                                    }}
                                >
                                    <div style={{ fontSize: '14px', fontWeight: 700, marginBottom: '2px' }}>{val}</div>
                                    <div style={{ fontSize: '9px', fontWeight: 500, opacity: 0.85 }}>{lbl}</div>
                                </button>
                            );
                        })}
                    </div>
                </div>
            );
        })}
    </>;
};
