import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { fetchWithAuth } from '../api';
import { Check, ChevronRight, Info, Plus, Trash2 } from 'lucide-react';
import { formatINR } from '../utils/format';

const STEPS = [
    { id: 1, name: 'Profile & Family', short: 'Tell us about yourself so we can personalize your plan.' },
    { id: 2, name: 'Financial Background', short: 'Your family\'s financial history helps us understand your starting point.' },
    { id: 3, name: 'Income', short: 'Assess savings potential and income streams.' },
    { id: 4, name: 'Expenses', short: 'Understand your cash flow and spending patterns.' },
    { id: 5, name: 'Assets & Banking', short: 'Your cash reserves and banking holdings.' },
    { id: 6, name: 'Investments', short: 'Your investment portfolio breakdown.' },
    { id: 7, name: 'Goals', short: 'What are you saving or investing towards?', optional: true },
    { id: 8, name: 'Liabilities', short: 'Active loans, EMIs and credit cards.', optional: true },
    { id: 9, name: 'Insurance', short: 'Evaluate your health and life coverage.', optional: true },
    { id: 10, name: 'Tax', short: 'Current tax regime and deductions claimed.' },
    { id: 11, name: 'Nominations & Will', short: 'Will, nominations and succession plan.' },
    { id: 12, name: 'Financial Behavior', short: 'Your habits and investment tendencies.' },
    { id: 13, name: 'Review & Submit', short: 'Check your answers before we generate your dashboard.' },
];

// Maps frontend step number (1–13) to backend step number (1–10).
// Steps 1 and 2 both save to backend step 1. Step 7 (Goals) saves via POST /goals. Step 13 (review) has no save.
const BACKEND_STEP = [null, 1, 1, 2, 3, 4, 5, 'goals', 6, 7, 8, 9, 10, null];
const TOTAL_STEPS = 13;


function Questionnaire() {
    const [currentStep, setCurrentStep] = useState(1);
    const [formData, setFormData] = useState({});
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [saveFeedback, setSaveFeedback] = useState(false);
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const navigate = useNavigate();

    useEffect(() => { loadProfile(); }, []);

    const [userGoals, setUserGoals] = useState([]);

    const loadProfile = async () => {
        try {
            const [data, goalsData] = await Promise.all([
                fetchWithAuth('/questionnaire'),
                fetchWithAuth('/goals').catch(() => [])
            ]);
            setFormData(data || {});
            setUserGoals(Array.isArray(goalsData) ? goalsData : []);
            const dbStep = data.current_step || 1;
            // DB step 2 is ambiguous: could be "finished profile, not gen wealth yet" OR "finished gen wealth"
            // Check gen_q1 to distinguish — if filled, gen wealth was completed
            // Frontend has 13 steps; backend has 10. Steps 1-2 map to backend 1, step 7 (Goals) is separate.
            // After backend step 5 (investments), frontend inserts Goals step before continuing to backend step 6.
            let frontendStep;
            if (dbStep <= 1) {
                frontendStep = 1;
            } else if (dbStep === 2) {
                frontendStep = data.gen_q1 ? 3 : 2;
            } else if (dbStep <= 5) {
                frontendStep = dbStep + 1; // offset for the extra gen wealth step
            } else {
                frontendStep = dbStep + 2; // offset for gen wealth step + goals step
            }
            setCurrentStep(Math.min(frontendStep, TOTAL_STEPS));
        } catch (err) { console.error('Failed to load profile', err); }
        finally { setLoading(false); }
    };

    const handleInputChange = (e) => {
        const { name, value, type } = e.target;
        setFormData(prev => ({ ...prev, [name]: type === 'number' ? (value !== '' ? Number(value) : null) : value }));
    };

    const saveStep = async (frontendStep, isFinal = false) => {
        setSaving(true);
        const backendStep = BACKEND_STEP[frontendStep];
        try {
            if (backendStep === 'goals') {
                // Goals step saves to /goals endpoint, not /questionnaire
                const goalsToSave = userGoals.map(g => ({
                    id: g.id,
                    name: g.name,
                    target: g.target || 0,
                    years: g.years || 0,
                    riskLevel: g.riskLevel || '3',
                    includeInflation: g.includeInflation ?? true,
                    customEquityAlloc: g.customEquityAlloc || null,
                    customDebtAlloc: g.customDebtAlloc || null,
                    customCommodityAlloc: g.customCommodityAlloc || null,
                    customEquityReturn: g.customEquityReturn || null,
                    customDebtReturn: g.customDebtReturn || null,
                    customCommodityReturn: g.customCommodityReturn || null,
                    priorityWeight: g.priorityWeight ?? 3,
                    isSaving: g.isSaving || 'no',
                }));
                await fetchWithAuth('/goals', { method: 'POST', body: JSON.stringify({ goals: goalsToSave }) });
            } else {
                const data = await fetchWithAuth(`/questionnaire/step/${backendStep}`, { method: 'PUT', body: JSON.stringify(formData) });
                setFormData(data);
            }
            if (isFinal) {
                navigate('/dashboard');
            } else {
                setCurrentStep(s => Math.min(s + 1, TOTAL_STEPS));
                setSaveFeedback(true);
                setTimeout(() => setSaveFeedback(false), 2000);
            }
        } catch { alert('Failed to save. Please try again.'); }
        finally { setSaving(false); }
    };

    // Compute Next button disabled reason based on current step validation
    const getNextDisabledReason = () => {
        if (saving) return null; // saving state handled separately
        if (BACKEND_STEP[currentStep] === 'goals') {
            if (userGoals.some(g => !g.name || !g.name.trim())) return 'Enter a name for each goal before continuing';
        }
        if (BACKEND_STEP[currentStep] === 6) { // Liabilities step
            const loans = Array.isArray(formData.loans) ? formData.loans : [];
            const cards = Array.isArray(formData.credit_cards) ? formData.credit_cards : [];
            if (loans.some(l => !l.type || !l.outstanding || !l.emi)) return 'Fill in the outstanding amount and EMI for each loan';
            if (cards.some(c => {
                if (!c.balance && c.balance !== 0) return true;
                if (!c.type) return true;
                if (c.type === 'emi' && !c.emi_amount) return true;
                return false;
            })) return 'Fill in the balance and repayment type for each credit card';
        }
        return null;
    };
    const nextDisabledReason = getNextDisabledReason();

    const handleNext = (e) => {
        e.preventDefault();
        if (nextDisabledReason) return;
        if (currentStep === TOTAL_STEPS) {
            navigate('/dashboard');
        } else {
            saveStep(currentStep, false);
        }
    };

    const handleSkipToReview = async () => {
        if (nextDisabledReason) return;
        const backendStep = BACKEND_STEP[currentStep];
        if (!backendStep) { setCurrentStep(TOTAL_STEPS); return; }
        setSaving(true);
        try {
            if (backendStep === 'goals') {
                const goalsToSave = userGoals.map(g => ({
                    id: g.id, name: g.name, target: g.target || 0, years: g.years || 0,
                    riskLevel: g.riskLevel || '3', includeInflation: g.includeInflation ?? true,
                    customEquityAlloc: g.customEquityAlloc || null, customDebtAlloc: g.customDebtAlloc || null,
                    customCommodityAlloc: g.customCommodityAlloc || null, customEquityReturn: g.customEquityReturn || null,
                    customDebtReturn: g.customDebtReturn || null, customCommodityReturn: g.customCommodityReturn || null,
                    priorityWeight: g.priorityWeight ?? 3, isSaving: g.isSaving || 'no',
                }));
                await fetchWithAuth('/goals', { method: 'POST', body: JSON.stringify({ goals: goalsToSave }) });
            } else {
                const data = await fetchWithAuth(`/questionnaire/step/${backendStep}`, { method: 'PUT', body: JSON.stringify(formData) });
                setFormData(data);
            }
            setSaveFeedback(true);
            setTimeout(() => setSaveFeedback(false), 2000);
            setCurrentStep(TOTAL_STEPS);
        } catch { alert('Failed to save. Please try again.'); }
        finally { setSaving(false); }
    };

    if (loading) return (
        <div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#F7F4EF' }}>
            <div style={{ color: '#1C1A17', fontWeight: 600 }}>Loading your profile…</div>
        </div>
    );

    return (
        <div className="layout">
            {/* ─── SIDEBAR OVERLAY (mobile) ─── */}
            {sidebarOpen && <div className="qn-sidebar-overlay" onClick={() => setSidebarOpen(false)} />}

            {/* ─── SIDEBAR ─── */}
            <div className={`qn-sidebar${sidebarOpen ? ' qn-sidebar-open' : ''}`}>
                {/* Close button (mobile only) */}
                <button className="qn-sidebar-close" onClick={() => setSidebarOpen(false)} aria-label="Close menu" type="button">✕</button>
                {/* Brand */}
                <div className="sidebar-brand" style={{ marginBottom: '32px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <div className="sidebar-brand-mark" style={{ width: '32px', height: '32px', background: '#1C1A17', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        <span style={{ fontFamily: "var(--font-heading)", fontSize: '13px', color: '#F7F4EF', fontWeight: 600 }}>FH</span>
                    </div>
                    <div className="sidebar-brand-name" style={{ fontFamily: "var(--font-heading)", fontSize: '18px', fontWeight: 600, color: '#1C1A17' }}>FinHealth</div>
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
                                onClick={() => { if (isCompleted) { setCurrentStep(step.id); setSidebarOpen(false); } }}
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
                                    {step.optional && <span style={{ fontSize: '10px', fontWeight: 400, color: 'var(--ink-ghost)', marginLeft: '4px' }}>(optional)</span>}
                                </span>
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* ─── MAIN CONTENT AREA ─── */}
            <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', overflowY: 'auto', flex: 1 }}>
                {/* Top Progress Bar + Surplus Tracker (sticky) */}
                <div className="qn-sticky-header">
                    <div className="qn-progress-bar-wrap">
                        <button className="qn-hamburger" onClick={() => setSidebarOpen(true)} aria-label="Open steps menu" type="button">
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                                <line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/>
                            </svg>
                        </button>
                        <span className="qn-progress-step-label">Step {currentStep} of {TOTAL_STEPS}</span>
                        <div className="qn-progress-track">
                            <div className="qn-progress-fill" style={{ width: `${currentStep === TOTAL_STEPS ? 100 : Math.round(((currentStep - 1) / (TOTAL_STEPS - 1)) * 100)}%` }}></div>
                        </div>
                        <span className="qn-progress-pct">{currentStep === TOTAL_STEPS ? 100 : Math.round(((currentStep - 1) / (TOTAL_STEPS - 1)) * 100)}%</span>
                        {saveFeedback && <span className="qn-saved-indicator">✓ Saved</span>}
                    </div>
                    <SurplusTracker formData={formData} currentStep={currentStep} />
                </div>

                {/* Scrollable Form Area */}
                <div className="qn-page">
                    <div>
                        <div className="page-title">{STEPS[currentStep - 1].name}</div>
                        <div className="page-desc">{STEPS[currentStep - 1].short}</div>
                    </div>

                    <form onSubmit={handleNext} style={{ display: 'flex', flexDirection: 'column', flex: 1, gap: '48px' }}>
                        {currentStep === 1 && <Step1Profile formData={formData} onChange={handleInputChange} />}
                        {currentStep === 2 && <Step1GenWealth formData={formData} onChange={handleInputChange} />}
                        {currentStep === 3 && <Step2 formData={formData} onChange={handleInputChange} />}
                        {currentStep === 4 && <Step3 formData={formData} onChange={handleInputChange} />}
                        {currentStep === 5 && <Step4 formData={formData} onChange={handleInputChange} />}
                        {currentStep === 6 && <Step5 formData={formData} onChange={handleInputChange} />}
                        {currentStep === 7 && <StepGoals goals={userGoals} setGoals={setUserGoals} />}
                        {currentStep === 8 && <Step6 formData={formData} onChange={handleInputChange} setFormData={setFormData} />}
                        {currentStep === 9 && <Step7 formData={formData} onChange={handleInputChange} />}
                        {currentStep === 10 && <Step8 formData={formData} onChange={handleInputChange} />}
                        {currentStep === 11 && <Step9 formData={formData} onChange={handleInputChange} />}
                        {currentStep === 12 && <Step10 formData={formData} onChange={handleInputChange} />}
                        {currentStep === 13 && <StepReview formData={formData} goals={userGoals} onGoToStep={setCurrentStep} />}

                        {currentStep === TOTAL_STEPS && (
                            <div className="qn-generate-hint">Results are ready instantly — no waiting.</div>
                        )}
                        <div className="qn-nav-buttons">
                            {currentStep === 1 ? (
                                <button type="button" className="qn-btn-back" onClick={() => navigate('/dashboard')}>
                                    ← Dashboard
                                </button>
                            ) : (
                                <button type="button" className="qn-btn-back" onClick={() => setCurrentStep(s => s - 1)}>
                                    Back
                                </button>
                            )}
                            <span className={`qn-btn-tooltip-wrap${nextDisabledReason ? ' disabled' : ''}`} data-tooltip={nextDisabledReason || undefined}>
                                <button type="submit" className="qn-btn-next" disabled={!!nextDisabledReason || saving}>
                                    {saving ? 'Saving...' : (currentStep === TOTAL_STEPS ? 'Generate Dashboard' : 'Next Step')}
                                    {!saving && currentStep < TOTAL_STEPS && (
                                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                                            <polyline points="9 18 15 12 9 6" />
                                        </svg>
                                    )}
                                </button>
                            </span>
                        </div>
                        {currentStep > 1 && currentStep < TOTAL_STEPS && (formData.current_step >= 10 || formData.is_completed) && (
                            <div className="qn-skip-review-wrap">
                                <span className={`qn-btn-tooltip-wrap${nextDisabledReason ? ' disabled' : ''}`} data-tooltip={nextDisabledReason || undefined}>
                                    <button type="button" className="qn-skip-review-link" onClick={handleSkipToReview} disabled={!!nextDisabledReason || saving}>
                                        Go to Review →
                                    </button>
                                </span>
                            </div>
                        )}
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
    const isCurrency = type === 'currency';
    const rawValue = value !== undefined && value !== null ? value : '';

    // For currency fields: show formatted value on blur, raw on focus
    const [displayVal, setDisplayVal] = useState(rawValue !== '' ? formatINR(rawValue) : '');
    const [focused, setFocused] = useState(false);

    useEffect(() => {
        if (!focused) {
            const t = setTimeout(() => setDisplayVal(rawValue !== '' && rawValue !== 0 ? formatINR(rawValue) : ''), 0);
            return () => clearTimeout(t);
        }
    }, [rawValue, focused]);

    const handleFocus = () => {
        setFocused(true);
        setDisplayVal(rawValue !== '' ? String(rawValue) : '');
    };

    const handleBlur = () => {
        setFocused(false);
        const num = Number(String(displayVal).replace(/,/g, ''));
        if (!isNaN(num) && num !== 0) {
            setDisplayVal(formatINR(num));
        } else {
            setDisplayVal('');
        }
    };

    const handleCurrencyChange = (e) => {
        setDisplayVal(e.target.value);
        const raw = e.target.value.replace(/,/g, '');
        onChange({ target: { name, value: raw === '' ? null : Number(raw), type: 'number' } });
    };

    const inputChild = isCurrency ? (
        <input
            type="text"
            inputMode="numeric"
            name={name}
            value={displayVal}
            onChange={handleCurrencyChange}
            onFocus={handleFocus}
            onBlur={handleBlur}
            placeholder={placeholder || '0'}
            required={required}
        />
    ) : (
        <input
            type={type === 'percentage' ? 'number' : type}
            name={name}
            value={rawValue}
            onChange={onChange}
            placeholder={placeholder}
            required={required}
            min={min}
            max={max}
        />
    );

    return (
        <div className="qn-field">
            <label>
                {label}
                {required && <span className="qn-required">*</span>}
                {info && <span className="qn-info-icon" data-tooltip={info}>i</span>}
            </label>
            {description && <div style={{ fontSize: '13px', color: 'var(--ink-soft)', lineHeight: '1.4' }}>{description}</div>}

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
            {info && <span className="qn-info-icon" data-tooltip={info}>i</span>}
        </label>
        <select name={name} value={value !== undefined && value !== null ? value : ''} onChange={onChange} required={required}>
            <option value="" disabled>Select</option>
            {options.map(opt => <option key={opt} value={opt}>{opt}</option>)}
        </select>
    </div>
);

const Row = ({ children, full }) => <div className={`qn-form-grid${full ? ' full' : ''}`}>{children}</div>;

const DisabledTooltipButton = ({ children, onClick, disabled, reason, className }) => (
    <span className={`qn-btn-tooltip-wrap${disabled ? ' disabled' : ''}`} data-tooltip={disabled ? reason : undefined}>
        <button type="button" onClick={disabled ? undefined : onClick} className={className} disabled={disabled}>
            {children}
        </button>
    </span>
);

const SurplusTracker = ({ formData: f, currentStep }) => {
    const income = Number(f.monthly_take_home) || 0;
    if (!income || currentStep < 3) return null;

    const monthlyExpenses = (Number(f.expense_household) || 0) + (Number(f.expense_rent) || 0) +
        (Number(f.expense_utilities) || 0) + (Number(f.expense_transport) || 0) +
        (Number(f.expense_food) || 0) + (Number(f.expense_subscriptions) || 0) +
        (Number(f.expense_discretionary) || 0);

    const annualExpenses = (Number(f.expense_annual_insurance) || 0) + (Number(f.expense_annual_education) || 0) +
        (Number(f.expense_annual_property) || 0) + (Number(f.expense_annual_travel) || 0) +
        (Number(f.expense_annual_other) || 0);

    // Loan EMIs
    const loans = Array.isArray(f.loans) ? f.loans : [];
    const loanEMI = loans.reduce((sum, l) => sum + (Number(l.emi) || 0), 0);

    // Credit card EMIs — matches backend computeLiabilities logic:
    // 'full' = 0 (paid in full, no monthly cost), 'emi' = user EMI or 3% of balance, 'revolving' = 3% of balance
    const cards = Array.isArray(f.credit_cards) ? f.credit_cards : [];
    const ccEMI = cards.reduce((sum, c) => {
        const balance = Number(c.balance) || 0;
        if (c.type === 'full' || !balance) return sum;
        if (c.type === 'emi') return sum + (Number(c.emi_amount) || balance * 0.03);
        return sum + (balance * 0.03); // revolving
    }, 0);

    const totalEMI = loanEMI + ccEMI;
    const sip = Number(f.inv_monthly_sip) || 0;

    const totalOutflow = monthlyExpenses + (annualExpenses / 12) + totalEMI + sip;
    const surplus = income - totalOutflow;

    const fmt = (n) => {
        const abs = Math.abs(n);
        if (abs >= 10000000) return `${(n / 10000000).toFixed(1)}Cr`;
        if (abs >= 100000) return `${(n / 100000).toFixed(1)}L`;
        if (abs >= 1000) return `${(n / 1000).toFixed(1)}K`;
        return Math.round(n).toLocaleString('en-IN');
    };

    return (
        <div className="qn-surplus-tracker">
            <div className="qn-surplus-item">
                <span className="qn-surplus-label">Income</span>
                <span className="qn-surplus-value">₹{fmt(income)}</span>
            </div>
            {totalOutflow > 0 && (
                <div className="qn-surplus-item">
                    <span className="qn-surplus-label">Outflow</span>
                    <span className="qn-surplus-value" style={{ color: 'var(--red, #c0392b)' }}>-₹{fmt(totalOutflow)}</span>
                </div>
            )}
            <div className="qn-surplus-item">
                <span className="qn-surplus-label">Surplus</span>
                <span className="qn-surplus-value" style={{ color: surplus >= 0 ? 'var(--green, #4A7C59)' : 'var(--red, #c0392b)', fontWeight: 600 }}>
                    {surplus >= 0 ? '₹' : '-₹'}{fmt(Math.abs(surplus))}/mo
                </span>
            </div>
        </div>
    );
};

/* ═══════════════════════════════════════════════
   STEP FORMS
   ═══════════════════════════════════════════════ */

const Step1Profile = ({ formData: f, onChange }) => (
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
    </>
);

const Step1GenWealth = ({ formData: f, onChange }) => {
    const renderScaleQuestion = (num, label, name, optionsText) => {
        const scaleLabels = ['1', '2', '3', '4', '5'];
        const current = f[name] ? String(f[name]) : '';

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

    return (
        <div className="qn-form-section">
            <div>
                <div className="qn-form-section-title">Financial Background</div>
                <div className="qn-form-section-desc">A few quick questions about your financial starting point and safety net. This helps us contextualise your situation.</div>
            </div>
            <div className="qn-callout sensitive">
                These questions are optional — skip any you'd rather not answer. Your answers are private and help us personalise your plan.
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '28px' }}>
                {renderScaleQuestion(1, "Growing up, how would you describe your family's financial situation?", 'gen_q1',
                    ['Struggled', 'Tight', 'Comfortable', 'Well-off', 'Wealthy'])}
                {renderScaleQuestion(2, "Did or will you receive any inheritance from your parents?", 'gen_q5',
                    ['None', 'Minimal', 'Modest <₹50L', 'Meaningful <₹5Cr', 'Substantial ₹5Cr+'])}
                {renderScaleQuestion(3, "If you lost your job or faced a crisis, could your family provide meaningful financial support?", 'gen_q9',
                    ['No, I support them', 'No help available', 'Limited help', 'Moderate support', 'Full cushion'])}
            </div>
        </div>
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
        <div className="qn-callout">
            This step has two parts — <strong>monthly</strong> and <strong>annual</strong> expenses. We combine both to calculate your true monthly surplus. Leave any field blank if it doesn't apply.
        </div>
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
        <div className="qn-callout" style={{ marginBottom: '20px' }}>
            <strong>Why do we ask for these?</strong> Yearly obligations take a hidden cut from your monthly income. We prorate these to reveal your true monthly surplus.
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
        <div className="qn-callout warn">
            <strong>Not sure about exact numbers?</strong> Rough estimates are totally fine — leave any field blank and we'll still generate a complete plan.
        </div>
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
        <div className="qn-callout warn">
            <strong>Just starting out?</strong> It's okay if you haven't invested yet — leave fields blank. We'll include investment recommendations in your action plan.
        </div>
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
        <div className="qn-subsection-label big" style={{ marginTop: '16px' }}>Recurring Investments</div>
        <Row>
            <InputField label="Monthly SIP Amount" name="inv_monthly_sip" type="currency" prefix="₹" value={f.inv_monthly_sip} onChange={onChange} info="Total monthly SIP or recurring investment amount across all schemes (mutual funds, stocks, etc.)" />
            <InputField label="How long have you been doing SIP regularly?" name="sip_consecutive_months" type="number" value={f.sip_consecutive_months} onChange={onChange} min={0} placeholder="e.g. 12 months" info="Approximate months of consistent SIP investing, regardless of amount. This only measures your investment consistency habit for your financial behaviour score — not the SIP amount." />
        </Row>
    </>
);

const SAVING_OPTIONS = [
    { value: 'regular', label: 'Yes, regularly (SIP / monthly)' },
    { value: 'irregular', label: 'Yes, but irregularly (lump sums, when possible)' },
    { value: 'no', label: 'Not yet' },
];

const StepGoals = ({ goals, setGoals }) => {
    const hasIncompleteGoal = goals.some(g => !g.name || !g.name.trim());

    const addGoal = () => {
        if (goals.length >= 5 || hasIncompleteGoal) return;
        setGoals([...goals, {
            id: `goal_${Date.now()}`,
            name: '',
            target: 0,
            years: 0,
            riskLevel: '3',
            includeInflation: true,
            isSaving: 'no',
            priorityWeight: 3,
        }]);
    };

    const updateGoal = (idx, field, value) => {
        setGoals(goals.map((g, i) => i === idx ? { ...g, [field]: value } : g));
    };

    const removeGoal = (idx) => {
        setGoals(goals.filter((_, i) => i !== idx));
    };

    return (
        <>
            <div className="qn-callout">
                What financial goals are you working towards? Adding goals helps us measure your financial clarity and personalise your action plan.
                You can add up to 5 goals here — more can be added later in the Goal Planner.
            </div>

            {goals.length < 5 && (
                <DisabledTooltipButton onClick={addGoal} disabled={hasIncompleteGoal} reason="Enter a name for each goal before adding another" className="qn-btn-add">
                    <Plus size={13} /> Add Goal
                </DisabledTooltipButton>
            )}

            {goals.length === 0 && (
                <div className="qn-empty-state">
                    No goals added yet — click <strong>Add Goal</strong> above to get started.
                    This step is optional, but having goals significantly improves your financial health score.
                </div>
            )}

            {goals.map((goal, idx) => (
                <div key={goal.id} className="qn-loan-card">
                    <div className="qn-loan-card-header">
                        <span className="qn-loan-card-title">Goal {idx + 1}</span>
                        <button type="button" onClick={() => removeGoal(idx)} className="qn-btn-remove">
                            <Trash2 size={12} /> Remove
                        </button>
                    </div>

                    <div className="qn-form-grid full">
                        <div className="qn-field">
                            <label>Goal Name <span className="qn-required">*</span></label>
                            <input type="text" value={goal.name} onChange={e => updateGoal(idx, 'name', e.target.value)} placeholder="e.g. Buy a home, Retirement, Child's education" />
                        </div>
                    </div>

                    <Row>
                        <InputField label="Target Amount" name={`goal_target_${idx}`} type="currency" prefix="₹" value={goal.target || ''} onChange={e => updateGoal(idx, 'target', e.target.value === '' ? 0 : Number(String(e.target.value).replace(/,/g, '')))} info="How much do you need for this goal? Leave blank if you're not sure yet." />
                        <InputField label="Timeframe (years)" name={`goal_years_${idx}`} type="number" value={goal.years || ''} onChange={e => updateGoal(idx, 'years', e.target.value === '' ? 0 : Number(e.target.value))} min={0} placeholder="e.g. 5" info="In how many years do you want to achieve this? Leave blank if unsure." />
                    </Row>

                    <div className="qn-form-grid full">
                        <div className="qn-field">
                            <label>Are you currently saving for this goal?</label>
                            <select value={goal.isSaving || 'no'} onChange={e => updateGoal(idx, 'isSaving', e.target.value)}>
                                {SAVING_OPTIONS.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                            </select>
                        </div>
                    </div>

                </div>
            ))}
        </>
    );
};

const Step6 = ({ formData: f, onChange, setFormData }) => {
    const loans = Array.isArray(f.loans) ? f.loans : [];
    const creditCards = Array.isArray(f.credit_cards) ? f.credit_cards : [];

    // Validation: check if last loan has basics filled
    const hasIncompleteLoan = loans.length > 0 && loans.some(l => !l.type || !l.outstanding || !l.emi);
    const hasIncompleteCard = creditCards.length > 0 && creditCards.some(c => {
        if (!c.balance && c.balance !== 0) return true;
        if (!c.type) return true;
        if (c.type === 'emi' && !c.emi_amount) return true;
        return false;
    });

    // ── Loan helpers ──
    const addLoan = () => {
        if (hasIncompleteLoan) return;
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

    // ── Credit card helpers ──
    const addCard = () => {
        if (hasIncompleteCard) return;
        setFormData(prev => ({
            ...prev,
            credit_cards: [...(Array.isArray(prev.credit_cards) ? prev.credit_cards : []), { name: '', balance: '', type: 'full', emi_amount: '' }]
        }));
    };

    const removeCard = (idx) => {
        setFormData(prev => ({
            ...prev,
            credit_cards: (Array.isArray(prev.credit_cards) ? prev.credit_cards : []).filter((_, i) => i !== idx)
        }));
    };

    const updateCard = (idx, field, value) => {
        setFormData(prev => {
            const updated = [...(Array.isArray(prev.credit_cards) ? prev.credit_cards : [])];
            updated[idx] = { ...updated[idx], [field]: value };
            return { ...prev, credit_cards: updated };
        });
    };

    return (
        <>
            {/* ── Active Loans ── */}
            <div className="qn-subsection-label" style={{ marginBottom: '24px' }}>
                <span>Active Loans</span>
                <DisabledTooltipButton onClick={addLoan} disabled={hasIncompleteLoan} reason="Fill in the outstanding amount and EMI for each loan before adding another" className="qn-btn-add">
                    <Plus size={14} /> Add Loan
                </DisabledTooltipButton>
            </div>

            {loans.length === 0 && (
                <div className="qn-empty-state">
                    No loans added — click <strong>Add Loan</strong> above if you have an active loan or EMI.
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

            {/* ── Credit Cards ── */}
            <div className="qn-subsection-label" style={{ marginTop: '32px', marginBottom: '24px' }}>
                <span>Credit Cards</span>
                <DisabledTooltipButton onClick={addCard} disabled={hasIncompleteCard} reason="Fill in the balance and repayment type for each card before adding another" className="qn-btn-add">
                    <Plus size={14} /> Add Card
                </DisabledTooltipButton>
            </div>

            {creditCards.length === 0 && (
                <div className="qn-empty-state">
                    No credit cards added — click <strong>Add Card</strong> above if you carry any outstanding balance.
                </div>
            )}

            {creditCards.map((card, idx) => (
                <div key={idx} className="qn-loan-card">
                    <div className="qn-loan-card-header">
                        <span className="qn-loan-card-title">Card {idx + 1}</span>
                        <button type="button" onClick={() => removeCard(idx)} className="qn-btn-remove">
                            <Trash2 size={12} /> Remove
                        </button>
                    </div>

                    {/* Card name */}
                    <div className="qn-form-grid full">
                        <div className="qn-field">
                            <label>Card Name / Issuer <span style={{ color: 'var(--ink-soft)', fontWeight: 400 }}>(optional)</span></label>
                            <input
                                type="text"
                                placeholder="e.g. HDFC Regalia, SBI SimplyCLICK"
                                value={card.name || ''}
                                onChange={e => updateCard(idx, 'name', e.target.value)}
                            />
                        </div>
                    </div>

                    <Row>
                        {/* Outstanding balance */}
                        <div className="qn-field">
                            <label>Outstanding Balance</label>
                            <div className="qn-rupee-wrap">
                                <span>₹</span>
                                <input
                                    type="number"
                                    placeholder="0"
                                    value={card.balance || ''}
                                    onChange={e => updateCard(idx, 'balance', e.target.value)}
                                    min="0"
                                />
                            </div>
                        </div>

                        {/* Repayment type */}
                        <div className="qn-field">
                            <label>How do you repay?</label>
                            <select
                                value={card.type || 'revolving'}
                                onChange={e => updateCard(idx, 'type', e.target.value)}
                            >
                                <option value="full">Paid in full every month</option>
                                <option value="emi">Converted to EMI</option>
                                <option value="revolving">Revolving / minimum due only</option>
                            </select>
                        </div>
                    </Row>

                    {/* EMI amount — only shown when type === 'emi' */}
                    {card.type === 'emi' && (
                        <Row>
                            <div className="qn-field">
                                <label>Monthly EMI Amount</label>
                                <div className="qn-rupee-wrap">
                                    <span>₹</span>
                                    <input
                                        type="number"
                                        placeholder="0"
                                        value={card.emi_amount || ''}
                                        onChange={e => updateCard(idx, 'emi_amount', e.target.value)}
                                        min="0"
                                    />
                                </div>
                            </div>
                            <div className="qn-field" /> {/* spacer */}
                        </Row>
                    )}
                </div>
            ))}

            {/* ── Credit Score ── */}
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
        </Row>
        <div className="qn-subsection-label" style={{ marginTop: '32px' }}>Life Insurance</div>
        <Row>
            <InputField label="Term Cover Amount" name="life_cover" type="currency" prefix="₹" value={f.life_cover} onChange={onChange} info="Term insurance pays a lump sum to your nominee if you die during the policy term. Ideal: 10-15x your annual income." />
        </Row>
        <div className="qn-callout" style={{ marginTop: '24px' }}>
            Insurance premiums (health, term, vehicle, etc.) should be included in the annual Insurance Premiums field under the Expenses step.
        </div>
    </>
);

const Step8 = ({ formData: f, onChange }) => (
    <>
        <div className="qn-callout warn">
            <strong>Not sure about tax?</strong> Select <em>New Regime</em> below and leave the rest blank — we'll still give you a complete financial plan. The fields below only apply if you're using the Old Regime with deductions.
        </div>
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
        <div className="qn-callout warn">
            <strong>Don't have a will yet?</strong> That's okay — even setting nominees on your bank, demat, insurance, PF, and mutual fund accounts takes just 5 minutes and protects your family from legal delays.
        </div>
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
        { label: 'I compare my financial progress with friends or peers', name: 'beh_compare_peers' },
        { label: 'I prefer guaranteed returns over higher but uncertain gains', name: 'beh_prefer_guaranteed' },
        { label: 'I regularly follow financial news and market updates', name: 'beh_follow_market_news' },
        { label: 'I feel anxious when making big financial decisions', name: 'beh_anxious_decisions' },
        { label: 'I tend to invest in brands or companies I already know', name: 'beh_familiar_brands' },
    ];
    const scaleLabels = ['Strongly Disagree', 'Disagree', 'Neutral', 'Agree', 'Strongly Agree'];
    return <>
        <div className="qn-callout" style={{ marginBottom: '8px' }}>
            <strong>How to answer:</strong> Rate each statement 1–5 based on how strongly you agree.
            <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', marginTop: '8px' }}>
                {scaleLabels.map((lbl, i) => (
                    <span key={i} style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '12px' }}>
                        <strong>{i + 1}</strong> = {lbl}
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
                                    onClick={() => onChange({ target: { name: q.name, value: val, type: 'number' } })}
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
/* ═══════════════════════════════════════════════
   STEP 12 — REVIEW & SUBMIT
   ═══════════════════════════════════════════════ */

const StepReview = ({ formData: f, goals = [], onGoToStep }) => {
    const fmtAmt = (v) => {
        if (!v && v !== 0) return '—';
        const n = Number(v);
        if (isNaN(n) || n === 0) return '—';
        if (n >= 10000000) return `₹${(n / 10000000).toFixed(1)}Cr`;
        if (n >= 100000) return `₹${(n / 100000).toFixed(1)}L`;
        if (n >= 1000) return `₹${Math.round(n / 1000)}K`;
        return `₹${n.toLocaleString('en-IN')}`;
    };
    const v = (val) => (val !== null && val !== undefined && val !== '') ? String(val) : '—';

    const loans = Array.isArray(f.loans) ? f.loans : [];
    const cards = Array.isArray(f.credit_cards) ? f.credit_cards : [];
    const behFields = ['beh_review_monthly','beh_delay_decisions','beh_spend_impulsively','beh_avoid_debt','beh_market_reaction','beh_windfall_behaviour','beh_hold_losing','beh_product_understanding','beh_compare_peers','beh_prefer_guaranteed','beh_follow_market_news','beh_anxious_decisions','beh_familiar_brands'];
    const behAnswered = behFields.filter(k => f[k]).length;

    const sections = [
        { step: 1, title: 'Profile & Family', rows: [
            ['Date of Birth', f.date_of_birth ? f.date_of_birth.split('T')[0] : '—'],
            ['City', v(f.city)],
            ['Marital Status', v(f.marital_status)],
            ['Dependents', f.dependents !== null && f.dependents !== undefined ? String(f.dependents) : '—'],
            ['Employment', v(f.employment_type)],
            ['Risk Comfort', f.risk_comfort ? `${f.risk_comfort} / 10` : '—'],
            ['Investment Experience', v(f.investment_experience)],
        ]},
        { step: 2, title: 'Financial Background', rows: [
            ['Childhood Finances', f.gen_q1 ? `${f.gen_q1} / 5` : '—'],
            ['Inheritance Expected', f.gen_q5 ? `${f.gen_q5} / 5` : '—'],
            ['Family Safety Net', f.gen_q9 ? `${f.gen_q9} / 5` : '—'],
        ]},
        { step: 3, title: 'Income', rows: [
            ['Monthly Take-Home', fmtAmt(f.monthly_take_home)],
            ['Annual Salary', fmtAmt(f.annual_salary)],
            ['Business Income', fmtAmt(f.business_income)],
            ['Annual Bonus', fmtAmt(f.annual_bonus)],
            ['Other Income', fmtAmt(f.other_income)],
            ['Expected Growth', f.expected_income_growth ? `${f.expected_income_growth}%` : '—'],
        ]},
        { step: 4, title: 'Expenses', rows: [
            ['Household', fmtAmt(f.expense_household)],
            ['Rent / Home EMI', fmtAmt(f.expense_rent)],
            ['Utilities', fmtAmt(f.expense_utilities)],
            ['Transport', fmtAmt(f.expense_transport)],
            ['Food & Dining', fmtAmt(f.expense_food)],
            ['Subscriptions', fmtAmt(f.expense_subscriptions)],
            ['Discretionary', fmtAmt(f.expense_discretionary)],
            ['Annual Insurance', fmtAmt(f.expense_annual_insurance)],
            ['Annual Education', fmtAmt(f.expense_annual_education)],
            ['Annual Travel', fmtAmt(f.expense_annual_travel)],
        ]},
        { step: 5, title: 'Assets & Banking', rows: [
            ['Savings Balance', fmtAmt(f.savings_balance)],
            ['Fixed Deposits', fmtAmt(f.fd_balance)],
            ['FD Average Rate', f.fd_rate ? `${f.fd_rate}%` : '—'],
            ['Emergency Fund', fmtAmt(f.emergency_fund)],
        ]},
        { step: 6, title: 'Investments', rows: [
            ['Direct Stocks', fmtAmt(f.inv_direct_stocks)],
            ['Equity Mutual Funds', fmtAmt(f.inv_equity_mf)],
            ['EPF / PPF / NPS', fmtAmt(f.inv_epf_ppf_nps)],
            ['Debt Funds & Bonds', fmtAmt(f.inv_debt_funds)],
            ['Gold / Commodities', fmtAmt(f.inv_gold_commodities)],
            ['Real Estate', fmtAmt(f.inv_real_estate)],
            ['Crypto / Alternatives', fmtAmt(f.inv_crypto_alt)],
            ['Monthly SIP', fmtAmt(f.inv_monthly_sip)],
            ['Regular SIP Duration', f.sip_consecutive_months ? `${f.sip_consecutive_months} months` : '—'],
        ]},
        { step: 7, title: 'Goals', rows: goals.length > 0 ? goals.map((g, i) => {
            const savingLabel = g.isSaving === 'regular' ? 'Saving regularly' : g.isSaving === 'irregular' ? 'Saving irregularly' : 'Not saving yet';
            return [`Goal ${i + 1}: ${g.name || 'Untitled'}`, [
                g.target ? fmtAmt(g.target) : '',
                g.years ? `${g.years}y` : '',
                savingLabel,
            ].filter(Boolean).join(' · ') || '—'];
        }) : [['Goals', 'None added']]},
        { step: 8, title: 'Liabilities', rows: [
            ['Active Loans', loans.length > 0 ? `${loans.length} loan${loans.length > 1 ? 's' : ''}` : 'None'],
            ['Credit Cards', cards.length > 0 ? `${cards.length} card${cards.length > 1 ? 's' : ''}` : 'None'],
            ['Credit Score', v(f.credit_score)],
        ]},
        { step: 9, title: 'Insurance', rows: [
            ['Health Cover', fmtAmt(f.health_cover)],
            ['Health Premium (yearly)', fmtAmt(f.health_premium)],
            ['Life Cover', fmtAmt(f.life_cover)],
            ['Life Premium (yearly)', fmtAmt(f.life_premium)],
        ]},
        { step: 10, title: 'Tax', rows: [
            ['Tax Regime', v(f.tax_regime)],
            ['80C Used', fmtAmt(f.tax_80c_used)],
            ['NPS 80CCD(1B)', fmtAmt(f.tax_nps_80ccd)],
            ['HRA Used', fmtAmt(f.tax_hra)],
            ['Home Loan Interest', fmtAmt(f.tax_home_loan_interest)],
            ['Health Insurance 80D', fmtAmt(f.tax_80d)],
        ]},
        { step: 11, title: 'Nominations & Will', rows: [
            ['Has Will', v(f.has_will)],
            ['Nominees Set', v(f.nominees_set)],
            ['Number of Nominees', v(f.num_nominees)],
        ]},
        { step: 12, title: 'Financial Behavior', rows: [
            ['Questions Answered', `${behAnswered} of ${behFields.length}`],
        ]},
    ];

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div className="qn-callout">
                Review your answers below. Click <strong>Edit</strong> on any section to go back and make changes, then return here to submit.
            </div>
            {sections.map(section => (
                <div key={section.step} className="qn-review-section">
                    <div className="qn-review-header">
                        <span className="qn-review-title">{section.title}</span>
                        <button type="button" className="qn-review-edit" onClick={() => onGoToStep(section.step)}>Edit</button>
                    </div>
                    <div className="qn-review-grid">
                        {section.rows.map(([label, value]) => (
                            <div key={label} className="qn-review-row">
                                <span className="qn-review-label">{label}</span>
                                <span className={`qn-review-value${value === '—' || value === 'None' ? ' empty' : ''}`}>{value}</span>
                            </div>
                        ))}
                    </div>
                </div>
            ))}
        </div>
    );
};
