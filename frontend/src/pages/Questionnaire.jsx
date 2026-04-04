import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { fetchWithAuth } from '../api';
import { Check, ChevronRight, ChevronDown, Info, Plus, Trash2, User, BookOpen, Wallet, Receipt, Landmark, TrendingUp, Target, CreditCard, ShieldCheck, FileText, Users, Brain, CheckCircle2 } from 'lucide-react';
import { formatINR } from '../utils/format';

const STEPS = [
    { id: 1,  name: 'Profile & Family',     display: 'Tell us about yourself',          short: 'Help us personalize your financial plan.' },
    { id: 2,  name: 'Financial Background', display: 'Your financial roots',             short: 'Your family\'s financial history helps us understand your starting point.' },
    { id: 3,  name: 'Income',               display: 'What do you earn?',               short: 'Assess your savings potential and income streams.' },
    { id: 4,  name: 'Expenses',             display: 'Where does your money go?',       short: 'Understand your cash flow and spending patterns.' },
    { id: 5,  name: 'Assets & Banking',     display: 'What do you own?',                short: 'Your cash reserves and banking holdings.' },
    { id: 6,  name: 'Goals',                display: 'Your financial goals',            short: 'What are you saving or investing towards?', optional: true },
    { id: 7,  name: 'Investments',          display: 'Your investment portfolio',       short: 'Tell us about your current investments.' },
    { id: 8,  name: 'Liabilities',          display: 'Your outstanding debts',         short: 'Active loans, EMIs, and credit cards.', optional: true },
    { id: 9,  name: 'Insurance',            display: 'Your insurance coverage',         short: 'Evaluate your health and life coverage.', optional: true },
    { id: 10, name: 'Tax',                  display: 'Your tax situation',              short: 'Current tax regime and deductions claimed.' },
    { id: 11, name: 'Financial Behavior',   display: 'How you think about money',      short: 'Your habits and investment tendencies.' },
    { id: 12, name: 'Review & Submit',      display: null,                              short: 'Check your answers before we generate your dashboard.' },
];

// Maps frontend step number (1–12) to backend step number (1–10).
// Steps 1 and 2 both save to backend step 1. Step 12 (review) has no save.
const BACKEND_STEP = [null, 1, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, null];
const TOTAL_STEPS = 12;


function Questionnaire() {
    const [currentStep, setCurrentStep] = useState(1);
    const [stepVisible, setStepVisible] = useState(false);
    const [formData, setFormData] = useState({});
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [saveFeedback, setSaveFeedback] = useState(false);
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const [userName, setUserName] = useState('');
    const navigate = useNavigate();

    useEffect(() => { loadProfile(); }, []);

    const [userGoals, setUserGoals] = useState([]);

    // ── Centralised step navigation (animates out → in) ──
    const navigateToStep = (n) => {
        setStepVisible(false);
        setTimeout(() => { setCurrentStep(n); setStepVisible(true); }, 250);
    };

    const loadProfile = async () => {
        try {
            const [data, meData] = await Promise.all([
                fetchWithAuth('/questionnaire'),
                fetchWithAuth('/auth/me').catch(() => null)
            ]);
            setFormData(data || {});
            // Load questionnaire goals from profile (separate from Goal Planner's user_goals)
            const qGoals = Array.isArray(data?.questionnaire_goals)
                ? data.questionnaire_goals.map((g, i) => ({
                    id: `goal_${Date.now()}_${i}`,
                    name: g.name || '',
                    target: g.target || 0,
                    years: g.years || 0,
                    isSaving: g.is_saving || 'no',
                    priorityWeight: g.priority_weight || 3,
                    monthlySip: g.monthly_sip || 0,
                }))
                : [];
            setUserGoals(qGoals);
            if (meData && meData.full_name) setUserName(meData.full_name);
            const dbStep = data.current_step || 1;
            // Frontend has 13 steps; backend has 11.
            // Steps 1+2 both map to backend step 1. All others are backend step + 1.
            let frontendStep;
            if (dbStep <= 1) {
                frontendStep = 1;
            } else if (dbStep === 2) {
                frontendStep = data.gen_q1 ? 3 : 2;
            } else {
                frontendStep = dbStep + 1; // +1 offset for the extra gen wealth step
            }
            setCurrentStep(Math.min(frontendStep, TOTAL_STEPS));
        } catch (err) { console.error('Failed to load profile', err); }
        finally { setLoading(false); setStepVisible(true); }
    };

    const handleInputChange = (e) => {
        const { name, value, type } = e.target;
        setFormData(prev => ({ ...prev, [name]: type === 'number' ? (value !== '' ? Number(value) : null) : value }));
    };

    const saveStep = async (frontendStep, isFinal = false) => {
        setSaving(true);
        const backendStep = BACKEND_STEP[frontendStep];
        try {
            if (backendStep === 5) {
                // Goals step saves to questionnaire_goals in financial_profiles
                const data = await fetchWithAuth(`/questionnaire/step/5`, {
                    method: 'PUT',
                    body: JSON.stringify({ questionnaire_goals: userGoals })
                });
                setFormData(data);
            } else {
                const data = await fetchWithAuth(`/questionnaire/step/${backendStep}`, { method: 'PUT', body: JSON.stringify(formData) });
                setFormData(data);
            }
            if (isFinal) {
                navigate('/dashboard');
            } else {
                navigateToStep(Math.min(frontendStep + 1, TOTAL_STEPS));
                setSaveFeedback(true);
                setTimeout(() => setSaveFeedback(false), 2000);
            }
        } catch { alert('Failed to save. Please try again.'); }
        finally { setSaving(false); }
    };

    // Compute Next button disabled reason based on current step validation
    const getNextDisabledReason = () => {
        if (saving) return null; // saving state handled separately
        if (BACKEND_STEP[currentStep] === 5) { // Goals step
            if (userGoals.some(g => !g.name || !g.name.trim())) return 'Enter a name for each goal before continuing';
        }
        if (BACKEND_STEP[currentStep] === 7) { // Liabilities step
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
            if (backendStep === 5) {
                const data = await fetchWithAuth(`/questionnaire/step/5`, {
                    method: 'PUT',
                    body: JSON.stringify({ questionnaire_goals: userGoals })
                });
                setFormData(data);
            } else {
                const data = await fetchWithAuth(`/questionnaire/step/${backendStep}`, { method: 'PUT', body: JSON.stringify(formData) });
                setFormData(data);
            }
            setSaveFeedback(true);
            setTimeout(() => setSaveFeedback(false), 2000);
            navigateToStep(TOTAL_STEPS);
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
                    <div className="sidebar-brand-mark" style={{ width: '32px', height: '32px', background: '#C4703A', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        <span style={{ fontFamily: "var(--font-heading)", fontSize: '13px', color: '#F7F4EF', fontWeight: 600 }}>FH</span>
                    </div>
                    <div className="sidebar-brand-name" style={{ fontFamily: "var(--font-heading)", fontSize: '18px', fontWeight: 600, color: '#F7F4EF' }}>FinHealth</div>
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
                                onClick={() => { if (isCompleted) { navigateToStep(step.id); setSidebarOpen(false); } }}
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
                                    <span className="qn-sidebar-step-icon"><StepIcon stepId={step.id} size={13} /></span>
                                    {String(step.id).padStart(2, '0')} {step.name}
                                    {step.optional && <span style={{ fontSize: '10px', fontWeight: 400, color: 'var(--ink-ghost)', marginLeft: '4px' }}>(optional)</span>}
                                </span>
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* ─── MAIN CONTENT AREA ─── */}
            <div className="qn-main-wrap" data-step={currentStep}>
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
                    <SurplusTracker formData={formData} currentStep={currentStep} goals={userGoals} />
                </div>

                <div className="qn-content-scroll">
                    <div className={`qn-step-content${stepVisible ? ' visible' : ''}`}>
                        <div className="qn-step-header">
                            <div className="qn-step-header-top">
                                <div className="qn-step-label-row">
                                    <span className="qn-step-icon-inline"><StepIcon stepId={currentStep} size={14} /></span>
                                    <span className="qn-step-name-label">{STEPS[currentStep - 1].name}</span>
                                </div>
                                {currentStep === 13 ? (
                                    <h1 className="page-title">Almost there{userName ? `, ${userName.split(' ')[0]}` : ''}</h1>
                                ) : (
                                    <h1 className="page-title">{STEPS[currentStep - 1].display}</h1>
                                )}
                                <div className="page-desc">{STEPS[currentStep - 1].short}</div>
                            </div>
                            <div className="qn-step-watermark">{String(currentStep).padStart(2, '0')}</div>
                        </div>

                        <form id="qn-form" onSubmit={handleNext}>
                            {currentStep === 1 && <Step1Profile formData={formData} onChange={handleInputChange} />}
                            {currentStep === 2 && <Step1GenWealth formData={formData} onChange={handleInputChange} />}
                            {currentStep === 3 && <Step2 formData={formData} onChange={handleInputChange} />}
                            {currentStep === 4 && <Step3 formData={formData} onChange={handleInputChange} />}
                            {currentStep === 5 && <Step4 formData={formData} onChange={handleInputChange} />}
                            {currentStep === 6 && <StepGoals goals={userGoals} setGoals={setUserGoals} />}
                            {currentStep === 7 && <Step5 formData={formData} onChange={handleInputChange} />}
                            {currentStep === 8 && <Step6 formData={formData} onChange={handleInputChange} setFormData={setFormData} />}
                            {currentStep === 9 && <Step7 formData={formData} onChange={handleInputChange} />}
                            {currentStep === 10 && <Step8 formData={formData} onChange={handleInputChange} />}
                            {currentStep === 11 && <Step10 formData={formData} onChange={handleInputChange} />}
                            {currentStep === 12 && <StepReview formData={formData} goals={userGoals} onGoToStep={navigateToStep} />}

                            {/* Keeps Enter-key submit behavior intact even with footer controls outside form */}
                            <button type="submit" style={{ display: 'none' }} aria-hidden="true" tabIndex={-1}>Submit</button>
                        </form>
                    </div>
                </div>

                <div className="qn-nav-footer">
                    <div className="qn-nav-col qn-nav-col-left">
                        {currentStep === 1 ? (
                            <button type="button" className="qn-btn-back" onClick={() => navigate('/dashboard')}>
                                ← Dashboard
                            </button>
                        ) : (
                            <button type="button" className="qn-btn-back" onClick={() => navigateToStep(Math.max(currentStep - 1, 1))}>
                                ← Back
                            </button>
                        )}
                    </div>
                    <div className="qn-nav-col qn-nav-col-center">
                        {currentStep > 1 && currentStep < TOTAL_STEPS && (formData.current_step >= 10 || formData.is_completed) && (
                            <span className={`qn-btn-tooltip-wrap${nextDisabledReason ? ' disabled' : ''}`} data-tooltip={nextDisabledReason || undefined}>
                                <button type="button" className="qn-skip-review-link" onClick={handleSkipToReview} disabled={!!nextDisabledReason || saving}>
                                    Go to Review →
                                </button>
                            </span>
                        )}
                    </div>
                    <div className="qn-nav-col qn-nav-col-right">
                        <span className={`qn-btn-tooltip-wrap${nextDisabledReason ? ' disabled' : ''}`} data-tooltip={nextDisabledReason || undefined}>
                            <button type="submit" form="qn-form" className="qn-btn-next" disabled={!!nextDisabledReason || saving}>
                                {saving ? 'Saving...' : (currentStep === TOTAL_STEPS ? 'Generate My Report →' : 'Next Step →')}
                            </button>
                        </span>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default Questionnaire;

/* ═══════════════════════════════════════════════
   STEP ICON MAP
   ═══════════════════════════════════════════════ */

const StepIcon = ({ stepId, size = 28 }) => {
    const icons = {
        1: <User size={size} />, 2: <BookOpen size={size} />, 3: <Wallet size={size} />,
        4: <Receipt size={size} />, 5: <Landmark size={size} />, 6: <Target size={size} />,
        7: <TrendingUp size={size} />, 8: <CreditCard size={size} />, 9: <ShieldCheck size={size} />,
        10: <FileText size={size} />, 11: <Brain size={size} />,
        12: <CheckCircle2 size={size} />,
    };
    return icons[stepId] || null;
};

const StepTabs = ({ tabs, active, onChange }) => (
    <div className="qn-tab-bar" role="tablist" aria-label="Step Sections">
        {tabs.map((label, i) => (
            <button
                key={label}
                type="button"
                role="tab"
                aria-selected={active === i}
                className={`qn-tab${active === i ? ' active' : ''}`}
                onClick={() => onChange(i)}
            >
                {label}
            </button>
        ))}
    </div>
);

/* ═══════════════════════════════════════════════
   SHARED INPUT COMPONENTS
   ═══════════════════════════════════════════════ */

const InputField = ({ label, description, name, type = 'text', value, onChange, placeholder, info, prefix, suffix, required, min, max, optional }) => {
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
                {optional && !required && <span className="qn-optional-label">(optional)</span>}
                {info && <span className="qn-info-icon" data-tooltip={info}>i</span>}
            </label>
            {description && <div className="qn-field-hint">{description}</div>}

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

const SelectField = ({ label, name, value, onChange, options, info, required, optional }) => (
    <div className="qn-field">
        <label>
            {label}
            {required && <span className="qn-required">*</span>}
            {optional && !required && <span className="qn-optional-label">(optional)</span>}
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

const SurplusTracker = ({ formData: f, currentStep, goals = [] }) => {
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
    const goalSipTotal = goals.reduce((s, g) => s + (Number(g.monthlySip) || 0), 0);

    const totalOutflow = monthlyExpenses + (annualExpenses / 12) + totalEMI + sip + goalSipTotal;
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
        <div className="ani d1">
            <Row>
                <InputField label="Date of Birth" name="date_of_birth" type="date" value={f.date_of_birth?.split('T')[0]} onChange={onChange} required />
                <SelectField label="City" name="city" value={f.city} onChange={onChange} options={['Mumbai', 'Delhi', 'Bengaluru', 'Hyderabad', 'Chennai', 'Kolkata', 'Pune', 'Ahmedabad', 'Other']} required />
            </Row>
        </div>
        <div className="ani d2">
            <Row>
                <SelectField label="Marital Status" name="marital_status" value={f.marital_status} onChange={onChange} options={['Single', 'Married', 'Divorced', 'Widowed']} required />
                <InputField label="Dependents" name="dependents" type="number" value={f.dependents} onChange={onChange} placeholder="0" info="Number of people financially dependent on you" required />
            </Row>
        </div>
        <div className="ani d3">
            <SelectField label="Employment Type" name="employment_type" value={f.employment_type} onChange={onChange} options={['Salaried', 'Self-Employed', 'Business', 'Retired', 'Student']} required />
        </div>
        <div className="ani d4">
            <Row>
                <SelectField label="Risk Comfort" name="risk_comfort" value={f.risk_comfort} onChange={onChange} options={['1', '2', '3', '4', '5', '6', '7', '8', '9', '10']} required info="1 = Very Conservative (prefer FDs, avoid market risk) · 10 = Very Aggressive (comfortable with large swings for higher growth). Most people are 3–7." />
                <SelectField label="Investment Experience" name="investment_experience" value={f.investment_experience} onChange={onChange} options={['None', '< 1 year', '1-3 years', '3-5 years', '5+ years']} required />
            </Row>
        </div>
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

const INCOME_FIELDS = ['monthly_take_home', 'annual_salary', 'business_income', 'annual_bonus', 'other_income', 'expected_income_growth'];
const INVESTMENT_FIELDS = ['inv_direct_stocks', 'inv_equity_mf', 'inv_gold_commodities', 'inv_epf_ppf_nps', 'inv_debt_funds', 'inv_real_estate', 'inv_crypto_alt', 'inv_monthly_sip', 'sip_consecutive_months'];

const Step2 = ({ formData: f, onChange }) => {
    const hasAnyData = !!(f.monthly_take_home || f.annual_salary || f.business_income ||
        f.annual_bonus || f.other_income || f.expected_income_growth);

    const [hasIncome, setHasIncome] = useState(hasAnyData ? true : null);

    const zeroIncomeFields = () => {
        INCOME_FIELDS.forEach(name => onChange({ target: { name, value: 0, type: 'number' } }));
    };

    return (
        <>
            <div className="ani d1">
                <div className="qn-field">
                    <label>Do you have income?</label>
                    <div className="qn-binary-options">
                        <button type="button"
                            className={`qn-binary-btn${hasIncome === true ? ' selected' : ''}`}
                            onClick={() => setHasIncome(true)}>Yes</button>
                        <button type="button"
                            className={`qn-binary-btn${hasIncome === false ? ' selected' : ''}`}
                            onClick={() => { setHasIncome(false); zeroIncomeFields(); }}>Not yet</button>
                    </div>
                </div>
            </div>

            {hasIncome === false && (
                <div className="ani d2">
                    <div className="qn-callout">
                        No problem — we'll tailor your plan around your current situation.{' '}
                        <button type="button" className="qn-link-btn" onClick={() => setHasIncome(true)}>
                            I want to add income details anyway →
                        </button>
                    </div>
                </div>
            )}

            {hasIncome === true && (
                <>
                    <div className="ani d2">
                        <InputField label="Monthly Take-Home Income" name="monthly_take_home" type="currency" prefix="₹" value={f.monthly_take_home} onChange={onChange} info="After tax & deductions" required />
                    </div>
                    <div className="ani d3">
                        <Row>
                            <InputField label="Annual Salary" name="annual_salary" type="currency" prefix="₹" value={f.annual_salary} onChange={onChange} info="Pre-tax yearly salary incl. allowances" />
                            <InputField label="Business Income" name="business_income" type="currency" prefix="₹" value={f.business_income} onChange={onChange} info="Annual income from business/profession" />
                        </Row>
                    </div>
                    <div className="ani d4">
                        <Row>
                            <InputField label="Annual Bonus" name="annual_bonus" type="currency" prefix="₹" value={f.annual_bonus} onChange={onChange} />
                            <InputField label="Other Income (yearly)" name="other_income" type="currency" prefix="₹" value={f.other_income} onChange={onChange} info="Rental, freelance, interest etc." />
                        </Row>
                    </div>
                    <div className="ani d5">
                        <InputField label="Expected Income Growth" name="expected_income_growth" type="percentage" suffix="%" value={f.expected_income_growth} onChange={onChange} />
                    </div>
                </>
            )}
        </>
    );
};

const Step3 = ({ formData: f, onChange }) => {
    const hasAnnual = !!(f.expense_annual_insurance || f.expense_annual_education || f.expense_annual_property || f.expense_annual_travel || f.expense_annual_other);
    const hasMonthly = !!(f.expense_household || f.expense_rent || f.expense_utilities || f.expense_transport || f.expense_food || f.expense_subscriptions || f.expense_discretionary);
    const [tab, setTab] = useState(hasAnnual && !hasMonthly ? 1 : 0);

    return (
        <>
            <div className="ani d1" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div className="qn-callout">
                    This step has two parts — <strong>monthly</strong> and <strong>annual</strong> expenses. We combine both to calculate your true monthly surplus. Leave any field blank if it doesn't apply.
                </div>
                <StepTabs tabs={['Monthly', 'Annual']} active={tab} onChange={setTab} />
            </div>

            {tab === 0 ? (
                <div className="ani d2">
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
                </div>
            ) : (
                <div className="ani d2">
                    <div className="qn-subsection-label">Part B: Annual Expenses</div>
                    <div className="qn-callout" style={{ marginBottom: '18px' }}>
                        <strong>Why do we ask for these?</strong> Yearly obligations take a hidden cut from your monthly income. We prorate these to reveal your true monthly surplus.
                    </div>
                    <Row>
                        <InputField label="Insurance Premiums" description="Vehicle, Home, and other insurance only. Do not include Health or Life premiums — enter those in the Insurance step." name="expense_annual_insurance" type="currency" prefix="₹" value={f.expense_annual_insurance} onChange={onChange} />
                        <InputField label="Education / School Fees" description="Yearly school, college, or tuition fees for children or self." name="expense_annual_education" type="currency" prefix="₹" value={f.expense_annual_education} onChange={onChange} />
                    </Row>
                    <Row>
                        <InputField label="Property Tax & Maintenance" description="Yearly property taxes, major home repairs, or society charges." name="expense_annual_property" type="currency" prefix="₹" value={f.expense_annual_property} onChange={onChange} />
                        <InputField label="Travel & Vacations" description="Estimated yearly budget for family trips and holidays." name="expense_annual_travel" type="currency" prefix="₹" value={f.expense_annual_travel} onChange={onChange} />
                    </Row>
                    <Row>
                        <InputField label="Other Annual Obligations" description="Festive expenses, large gifts, or any other yearly recurring costs." name="expense_annual_other" type="currency" prefix="₹" value={f.expense_annual_other} onChange={onChange} />
                    </Row>
                </div>
            )}
        </>
    );
};

const Step4 = ({ formData: f, onChange }) => (
    <>
        <div className="ani d1" style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
            <div className="qn-callout warn">
                <strong>Not sure about exact numbers?</strong> Rough estimates are totally fine — leave any field blank and we'll still generate a complete plan.
            </div>
            <InputField label="Savings Account Balance" name="savings_balance" type="currency" prefix="₹" value={f.savings_balance} onChange={onChange} info="Total balance across all savings accounts" optional />
        </div>
        <div className="ani d2">
            <Row>
                <InputField label="Fixed Deposits Balance" name="fd_balance" type="currency" prefix="₹" value={f.fd_balance} onChange={onChange} info="FDs are time-bound deposits with guaranteed returns at a fixed interest rate" optional />
                <InputField label="FD Average Rate" name="fd_rate" type="percentage" suffix="%" value={f.fd_rate} onChange={onChange} info="Weighted average interest rate across your FDs" optional />
            </Row>
        </div>
    </>
);

const Step5 = ({ formData: f, onChange }) => {
    // Gate: derived from whether any investment data exists
    const hasAnyData = !!(f.inv_direct_stocks || f.inv_equity_mf || f.inv_gold_commodities ||
        f.inv_epf_ppf_nps || f.inv_debt_funds || f.inv_real_estate ||
        f.inv_crypto_alt || f.inv_monthly_sip);
    // Expanded section auto-opens if user has data in those fields
    const hasExpandedData = !!(f.inv_epf_ppf_nps || f.inv_debt_funds ||
        f.inv_real_estate || f.inv_crypto_alt);

    const [investingYes, setInvestingYes] = useState(hasAnyData ? true : null);
    const [expanded, setExpanded] = useState(hasExpandedData);

    const zeroInvestmentFields = () => {
        INVESTMENT_FIELDS.forEach(name => onChange({ target: { name, value: 0, type: 'number' } }));
    };

    return (
        <>
            <div className="ani d1" style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
                <div className="qn-callout warn">
                    <strong>Just starting out?</strong> It's okay if you haven't invested yet — leave fields blank or select "Not yet".
                </div>

                {/* ── Gate question ── */}
                <div className="qn-field">
                    <label>Do you currently invest?</label>
                    <div className="qn-binary-options">
                        <button type="button"
                            className={`qn-binary-btn${investingYes === true ? ' selected' : ''}`}
                            onClick={() => setInvestingYes(true)}>Yes</button>
                        <button type="button"
                            className={`qn-binary-btn${investingYes === false ? ' selected' : ''}`}
                            onClick={() => { setInvestingYes(false); setExpanded(false); zeroInvestmentFields(); }}>Not yet</button>
                    </div>
                </div>
            </div>

            {/* ── Not yet message ── */}
            {investingYes === false && (
                <div className="ani d2">
                    <div className="qn-callout">
                        That's okay — we'll include investment recommendations in your action plan.{' '}
                        <button type="button" className="qn-link-btn" onClick={() => setInvestingYes(true)}>
                            I want to add details anyway →
                        </button>
                    </div>
                </div>
            )}

            {/* ── Investing fields ── */}
            {investingYes === true && (
                <>
                    {/* Core 3: Direct Stocks, Equity MF, Gold */}
                    <div className="ani d2">
                        <Row>
                            <InputField label="Direct Stocks" name="inv_direct_stocks" type="currency" prefix="₹" value={f.inv_direct_stocks} onChange={onChange} info="Current market value of shares you directly hold in a Demat account" optional />
                            <InputField label="Equity Mutual Funds" name="inv_equity_mf" type="currency" prefix="₹" value={f.inv_equity_mf} onChange={onChange} info="Current NAV value of all equity-oriented mutual fund holdings" optional />
                        </Row>
                        <Row>
                            <InputField label="Gold / Commodities" name="inv_gold_commodities" type="currency" prefix="₹" value={f.inv_gold_commodities} onChange={onChange} info="Physical gold, Sovereign Gold Bonds, Gold ETFs" optional />
                        </Row>
                    </div>

                    {/* Recurring Investments — always visible */}
                    <div className="ani d3">
                        <div className="qn-subsection-label big">Recurring Investments</div>
                        <Row>
                            <InputField label="General SIP (excl. goal SIPs)" name="inv_monthly_sip" type="currency" prefix="₹" value={f.inv_monthly_sip} onChange={onChange} info="Monthly investment NOT tied to any specific goal. Goal-specific SIPs are entered in the Goals step." optional />
                            <InputField label="How long have you been doing SIP regularly?" name="sip_consecutive_months" type="number" value={f.sip_consecutive_months} onChange={onChange} min={0} placeholder="e.g. 12 months" info="Months of consistent SIP — measures your investment habit, not amount." optional />
                        </Row>
                    </div>

                    {/* Toggle for extended fields */}
                    <div className="ani d4">
                        <button type="button" className={`qn-inv-toggle${expanded ? ' open' : ''}`}
                            onClick={() => setExpanded(e => !e)}>
                            I have more investments
                            <ChevronDown size={14} className="qn-inv-chevron" />
                        </button>
                    </div>

                    {/* Expanded: EPF/PPF, Debt, Real Estate, Crypto */}
                    <div className={`qn-inv-extra${expanded ? ' open' : ''}`}>
                        <div>
                            <Row>
                                <InputField label="EPF / PPF / NPS" name="inv_epf_ppf_nps" type="currency" prefix="₹" value={f.inv_epf_ppf_nps} onChange={onChange} info="EPF = Employee Provident Fund. PPF = Public Provident Fund. NPS = National Pension System." />
                                <InputField label="Debt Funds & Bonds" name="inv_debt_funds" type="currency" prefix="₹" value={f.inv_debt_funds} onChange={onChange} info="Fixed-income instruments: govt bonds, corporate bonds" />
                            </Row>
                            <Row>
                                <InputField label="Real Estate Value" name="inv_real_estate" type="currency" prefix="₹" value={f.inv_real_estate} onChange={onChange} info="Market value of all property owned (excl. primary residence loan)" />
                                <InputField label="Crypto / Alternatives" name="inv_crypto_alt" type="currency" prefix="₹" value={f.inv_crypto_alt} onChange={onChange} info="Cryptocurrency, REITs, InvITs, angel investments, P2P" />
                            </Row>
                        </div>
                    </div>
                </>
            )}
        </>
    );
};

const SAVING_OPTIONS = [
    { value: 'regular', label: 'Yes, regularly (SIP / monthly)' },
    { value: 'irregular', label: 'Yes, but irregularly (lump sums, when possible)' },
    { value: 'no', label: 'Not yet' },
];

const StepGoals = ({ goals, setGoals }) => {
    const [draftGoal, setDraftGoal] = useState(null);
    const [draftIdx, setDraftIdx] = useState(null); // null = new goal

    const fmtShort = (n) => {
        if (!n) return null;
        if (n >= 10000000) return `₹${(n / 10000000).toFixed(1)}Cr`;
        if (n >= 100000) return `₹${(n / 100000).toFixed(1)}L`;
        if (n >= 1000) return `₹${Math.round(n / 1000)}K`;
        return `₹${Number(n).toLocaleString('en-IN')}`;
    };

    const openAdd = () => {
        setDraftGoal({ id: `goal_${Date.now()}`, name: '', target: 0, years: 0, riskLevel: '3', includeInflation: true, isSaving: 'no', priorityWeight: 3, monthlySip: 0 });
        setDraftIdx(null);
    };

    const openEdit = (idx) => {
        setDraftGoal({ ...goals[idx] });
        setDraftIdx(idx);
    };

    const closeModal = () => { setDraftGoal(null); setDraftIdx(null); };

    const saveDraft = () => {
        if (!draftGoal.name || !draftGoal.name.trim()) return;
        if (draftIdx === null) {
            setGoals([...goals, draftGoal]);
        } else {
            setGoals(goals.map((g, i) => i === draftIdx ? draftGoal : g));
        }
        closeModal();
    };

    const removeGoal = (idx) => setGoals(goals.filter((_, i) => i !== idx));

    const updateDraft = (field, value) => setDraftGoal(prev => ({ ...prev, [field]: value }));

    return (
        <>
            <div className="qn-callout">
                What financial goals are you working towards? Adding goals helps us measure your financial clarity and personalise your action plan.
                You can add up to 5 goals here — more can be added later in the Goal Planner.
            </div>

            {goals.length < 5 && (
                <button type="button" onClick={openAdd} className="qn-btn-add">
                    <Plus size={13} /> Add Goal
                </button>
            )}

            {goals.length === 0 && (
                <div className="qn-empty-state">
                    No goals added yet — click <strong>Add Goal</strong> above to get started.
                    This step is optional, but having goals significantly improves your financial health score.
                </div>
            )}

            <div className="qn-saved-cards-list">
                {goals.map((goal, idx) => (
                    <div key={goal.id} className="qn-saved-card">
                        <div className="qn-saved-card-main">
                            <div className="qn-saved-card-title">{goal.name || `Goal ${idx + 1}`}</div>
                            <div className="qn-saved-card-meta">
                                {goal.target > 0 && <span>{fmtShort(goal.target)}</span>}
                                {goal.years > 0 && <span>in {goal.years}y</span>}
                                {goal.isSaving === 'regular' && goal.monthlySip > 0 && <span>SIP {fmtShort(goal.monthlySip)}/mo</span>}
                                {goal.isSaving === 'regular' && !goal.monthlySip && <span>Saving regularly</span>}
                                {goal.isSaving === 'irregular' && <span>Saving irregularly</span>}
                                {goal.isSaving === 'no' && <span>Not saving yet</span>}
                            </div>
                        </div>
                        <div className="qn-saved-card-actions">
                            <button type="button" onClick={() => openEdit(idx)} className="qn-btn-edit">Edit</button>
                            <button type="button" onClick={() => removeGoal(idx)} className="qn-btn-remove"><Trash2 size={12} /></button>
                        </div>
                    </div>
                ))}
            </div>

            {draftGoal && (
                <div className="qn-modal-overlay" onClick={closeModal}>
                    <div className="qn-modal" onClick={e => e.stopPropagation()}>
                        <div className="qn-modal-header">
                            <span>{draftIdx === null ? 'Add Goal' : 'Edit Goal'}</span>
                            <button type="button" onClick={closeModal} className="qn-modal-close">✕</button>
                        </div>
                        <div className="qn-modal-body">
                            <div className="qn-form-grid full">
                                <div className="qn-field">
                                    <label>Goal Name <span className="qn-required">*</span></label>
                                    <input type="text" value={draftGoal.name} onChange={e => updateDraft('name', e.target.value)} placeholder="e.g. Buy a home, Retirement, Child's education" autoFocus />
                                </div>
                            </div>
                            <Row>
                                <InputField label="Target Amount" name="draft_goal_target" type="currency" prefix="₹" value={draftGoal.target || ''} onChange={e => updateDraft('target', e.target.value === '' ? 0 : Number(String(e.target.value).replace(/,/g, '')))} info="How much do you need for this goal? Leave blank if you're not sure yet." />
                                <InputField label="Timeframe (years)" name="draft_goal_years" type="number" value={draftGoal.years || ''} onChange={e => updateDraft('years', e.target.value === '' ? 0 : Number(e.target.value))} min={0} placeholder="e.g. 5" info="In how many years do you want to achieve this? Leave blank if unsure." />
                            </Row>
                            <div className="qn-form-grid full">
                                <div className="qn-field">
                                    <label>Are you currently saving for this goal?</label>
                                    <select value={draftGoal.isSaving || 'no'} onChange={e => updateDraft('isSaving', e.target.value)}>
                                        {SAVING_OPTIONS.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                                    </select>
                                </div>
                            </div>
                            {draftGoal.isSaving === 'regular' && (
                                <Row>
                                    <InputField
                                        label="Monthly contribution towards this goal"
                                        name="draft_goal_sip"
                                        type="currency"
                                        prefix="₹"
                                        value={draftGoal.monthlySip || ''}
                                        onChange={e => updateDraft('monthlySip', e.target.value === '' ? 0 : Number(String(e.target.value).replace(/,/g, '')))}
                                        info="How much you put in every month for this goal specifically. Used to check if you're on track."
                                    />
                                </Row>
                            )}
                        </div>
                        <div className="qn-modal-footer">
                            <button type="button" onClick={closeModal} className="qn-btn-secondary">Cancel</button>
                            <button type="button" onClick={saveDraft} className="qn-btn-primary" disabled={!draftGoal.name?.trim()}>Save Goal</button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
};

const Step6 = ({ formData: f, onChange, setFormData }) => {
    const loans = Array.isArray(f.loans) ? f.loans : [];
    const creditCards = Array.isArray(f.credit_cards) ? f.credit_cards : [];
    const [tab, setTab] = useState(creditCards.length > 0 && loans.length === 0 ? 1 : 0);

    // ── Loan modal state ──
    const [draftLoan, setDraftLoan] = useState(null);
    const [draftLoanIdx, setDraftLoanIdx] = useState(null);

    // ── Card modal state ──
    const [draftCard, setDraftCard] = useState(null);
    const [draftCardIdx, setDraftCardIdx] = useState(null);

    const fmtShort = (n) => {
        if (!n) return null;
        if (n >= 10000000) return `₹${(n / 10000000).toFixed(1)}Cr`;
        if (n >= 100000) return `₹${(n / 100000).toFixed(1)}L`;
        if (n >= 1000) return `₹${Math.round(n / 1000)}K`;
        return `₹${Number(n).toLocaleString('en-IN')}`;
    };

    // ── Loan helpers ──
    const openAddLoan = () => {
        setDraftLoan({ type: 'Home Loan', outstanding: '', interestRate: '', emi: '', tenure: '' });
        setDraftLoanIdx(null);
    };
    const openEditLoan = (idx) => { setDraftLoan({ ...loans[idx] }); setDraftLoanIdx(idx); };
    const closeLoanModal = () => { setDraftLoan(null); setDraftLoanIdx(null); };
    const saveLoan = () => {
        if (!draftLoan.outstanding || !draftLoan.emi) return;
        if (draftLoanIdx === null) {
            setFormData(prev => ({ ...prev, loans: [...(Array.isArray(prev.loans) ? prev.loans : []), draftLoan] }));
        } else {
            setFormData(prev => {
                const updated = [...(Array.isArray(prev.loans) ? prev.loans : [])];
                updated[draftLoanIdx] = draftLoan;
                return { ...prev, loans: updated };
            });
        }
        closeLoanModal();
    };
    const removeLoan = (idx) => setFormData(prev => ({ ...prev, loans: (Array.isArray(prev.loans) ? prev.loans : []).filter((_, i) => i !== idx) }));
    const updateDraftLoan = (field, value) => setDraftLoan(prev => ({ ...prev, [field]: value }));

    // ── Card helpers ──
    const openAddCard = () => {
        setDraftCard({ name: '', balance: '', type: 'full', emi_amount: '' });
        setDraftCardIdx(null);
    };
    const openEditCard = (idx) => { setDraftCard({ ...creditCards[idx] }); setDraftCardIdx(idx); };
    const closeCardModal = () => { setDraftCard(null); setDraftCardIdx(null); };
    const saveCard = () => {
        if (!draftCard.balance && draftCard.balance !== 0) return;
        if (!draftCard.type) return;
        if (draftCardIdx === null) {
            setFormData(prev => ({ ...prev, credit_cards: [...(Array.isArray(prev.credit_cards) ? prev.credit_cards : []), draftCard] }));
        } else {
            setFormData(prev => {
                const updated = [...(Array.isArray(prev.credit_cards) ? prev.credit_cards : [])];
                updated[draftCardIdx] = draftCard;
                return { ...prev, credit_cards: updated };
            });
        }
        closeCardModal();
    };
    const removeCard = (idx) => setFormData(prev => ({ ...prev, credit_cards: (Array.isArray(prev.credit_cards) ? prev.credit_cards : []).filter((_, i) => i !== idx) }));
    const updateDraftCard = (field, value) => setDraftCard(prev => ({ ...prev, [field]: value }));

    const REPAY_LABELS = { full: 'Paid in full', emi: 'EMI', revolving: 'Revolving' };

    return (
        <>
            <div className="ani d1">
                <div className="qn-callout warn" style={{ marginBottom: '16px' }}>
                    <strong>No loans or cards?</strong> Skip this step entirely — you can add debts later.
                </div>
            </div>
            <StepTabs tabs={['Loans', 'Credit Cards']} active={tab} onChange={setTab} />

            {tab === 0 && (
                <>
                    <div className="qn-subsection-label" style={{ marginBottom: '24px' }}>
                        <span>Active Loans</span>
                        <button type="button" onClick={openAddLoan} className="qn-btn-add">
                            <Plus size={14} /> Add Loan
                        </button>
                    </div>

                    {loans.length === 0 && (
                        <div className="qn-empty-state">
                            No loans added — click <strong>Add Loan</strong> above if you have an active loan or EMI.
                        </div>
                    )}

                    <div className="qn-saved-cards-list">
                        {loans.map((loan, idx) => (
                            <div key={idx} className="qn-saved-card">
                                <div className="qn-saved-card-main">
                                    <div className="qn-saved-card-title">{loan.type || `Loan ${idx + 1}`}</div>
                                    <div className="qn-saved-card-meta">
                                        {loan.outstanding && <span>Outstanding {fmtShort(Number(loan.outstanding))}</span>}
                                        {loan.emi && <span>EMI {fmtShort(Number(loan.emi))}/mo</span>}
                                        {loan.interestRate && <span>{loan.interestRate}% p.a.</span>}
                                    </div>
                                </div>
                                <div className="qn-saved-card-actions">
                                    <button type="button" onClick={() => openEditLoan(idx)} className="qn-btn-edit">Edit</button>
                                    <button type="button" onClick={() => removeLoan(idx)} className="qn-btn-remove"><Trash2 size={12} /></button>
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Loan modal */}
                    {draftLoan && (
                        <div className="qn-modal-overlay" onClick={closeLoanModal}>
                            <div className="qn-modal" onClick={e => e.stopPropagation()}>
                                <div className="qn-modal-header">
                                    <span>{draftLoanIdx === null ? 'Add Loan' : 'Edit Loan'}</span>
                                    <button type="button" onClick={closeLoanModal} className="qn-modal-close">✕</button>
                                </div>
                                <div className="qn-modal-body">
                                    <div className="qn-form-grid full">
                                        <div className="qn-field">
                                            <label>Loan Type</label>
                                            <select value={draftLoan.type || 'Home Loan'} onChange={e => updateDraftLoan('type', e.target.value)}>
                                                {['Home Loan', 'Car Loan', 'Personal Loan', 'Education Loan', 'Gold Loan', 'Other'].map(opt =>
                                                    <option key={opt} value={opt}>{opt}</option>
                                                )}
                                            </select>
                                        </div>
                                    </div>
                                    <Row>
                                        <div className="qn-field">
                                            <label>Outstanding Amount <span className="qn-required">*</span></label>
                                            <div className="qn-rupee-wrap">
                                                <span>₹</span>
                                                <input type="number" value={draftLoan.outstanding || ''} onChange={e => updateDraftLoan('outstanding', e.target.value)} autoFocus />
                                            </div>
                                        </div>
                                        <div className="qn-field">
                                            <label>Interest Rate</label>
                                            <div className="qn-pct-wrap">
                                                <input type="number" value={draftLoan.interestRate || ''} onChange={e => updateDraftLoan('interestRate', e.target.value)} />
                                                <span>%</span>
                                            </div>
                                        </div>
                                    </Row>
                                    <Row>
                                        <div className="qn-field">
                                            <label>Monthly EMI <span className="qn-required">*</span></label>
                                            <div className="qn-rupee-wrap">
                                                <span>₹</span>
                                                <input type="number" value={draftLoan.emi || ''} onChange={e => updateDraftLoan('emi', e.target.value)} />
                                            </div>
                                        </div>
                                        <div className="qn-field">
                                            <label>Remaining Tenure (months)</label>
                                            <input type="number" value={draftLoan.tenure || ''} onChange={e => updateDraftLoan('tenure', e.target.value)} min="0" />
                                        </div>
                                    </Row>
                                </div>
                                <div className="qn-modal-footer">
                                    <button type="button" onClick={closeLoanModal} className="qn-btn-secondary">Cancel</button>
                                    <button type="button" onClick={saveLoan} className="qn-btn-primary" disabled={!draftLoan.outstanding || !draftLoan.emi}>Save Loan</button>
                                </div>
                            </div>
                        </div>
                    )}
                </>
            )}

            {tab === 1 && (
                <>
                    <div className="qn-subsection-label" style={{ marginBottom: '24px' }}>
                        <span>Credit Cards</span>
                        <button type="button" onClick={openAddCard} className="qn-btn-add">
                            <Plus size={14} /> Add Card
                        </button>
                    </div>

                    {creditCards.length === 0 && (
                        <div className="qn-empty-state">
                            No credit cards added — click <strong>Add Card</strong> above if you carry any outstanding balance.
                        </div>
                    )}

                    <div className="qn-saved-cards-list">
                        {creditCards.map((card, idx) => (
                            <div key={idx} className="qn-saved-card">
                                <div className="qn-saved-card-main">
                                    <div className="qn-saved-card-title">{card.name || `Card ${idx + 1}`}</div>
                                    <div className="qn-saved-card-meta">
                                        {card.balance && <span>Balance {fmtShort(Number(card.balance))}</span>}
                                        <span>{REPAY_LABELS[card.type] || card.type}</span>
                                        {card.type === 'emi' && card.emi_amount && <span>EMI {fmtShort(Number(card.emi_amount))}/mo</span>}
                                    </div>
                                </div>
                                <div className="qn-saved-card-actions">
                                    <button type="button" onClick={() => openEditCard(idx)} className="qn-btn-edit">Edit</button>
                                    <button type="button" onClick={() => removeCard(idx)} className="qn-btn-remove"><Trash2 size={12} /></button>
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Card modal */}
                    {draftCard && (
                        <div className="qn-modal-overlay" onClick={closeCardModal}>
                            <div className="qn-modal" onClick={e => e.stopPropagation()}>
                                <div className="qn-modal-header">
                                    <span>{draftCardIdx === null ? 'Add Credit Card' : 'Edit Credit Card'}</span>
                                    <button type="button" onClick={closeCardModal} className="qn-modal-close">✕</button>
                                </div>
                                <div className="qn-modal-body">
                                    <div className="qn-form-grid full">
                                        <div className="qn-field">
                                            <label>Card Name / Issuer <span style={{ color: 'var(--ink-soft)', fontWeight: 400 }}>(optional)</span></label>
                                            <input type="text" placeholder="e.g. HDFC Regalia, SBI SimplyCLICK" value={draftCard.name || ''} onChange={e => updateDraftCard('name', e.target.value)} autoFocus />
                                        </div>
                                    </div>
                                    <Row>
                                        <div className="qn-field">
                                            <label>Outstanding Balance <span className="qn-required">*</span></label>
                                            <div className="qn-rupee-wrap">
                                                <span>₹</span>
                                                <input type="number" placeholder="0" value={draftCard.balance || ''} onChange={e => updateDraftCard('balance', e.target.value)} min="0" />
                                            </div>
                                        </div>
                                        <div className="qn-field">
                                            <label>How do you repay?</label>
                                            <select value={draftCard.type || 'revolving'} onChange={e => updateDraftCard('type', e.target.value)}>
                                                <option value="full">Paid in full every month</option>
                                                <option value="emi">Converted to EMI</option>
                                                <option value="revolving">Revolving / minimum due only</option>
                                            </select>
                                        </div>
                                    </Row>
                                    {draftCard.type === 'emi' && (
                                        <Row>
                                            <div className="qn-field">
                                                <label>Monthly EMI Amount <span className="qn-required">*</span></label>
                                                <div className="qn-rupee-wrap">
                                                    <span>₹</span>
                                                    <input type="number" placeholder="0" value={draftCard.emi_amount || ''} onChange={e => updateDraftCard('emi_amount', e.target.value)} min="0" />
                                                </div>
                                            </div>
                                            <div className="qn-field" />
                                        </Row>
                                    )}
                                </div>
                                <div className="qn-modal-footer">
                                    <button type="button" onClick={closeCardModal} className="qn-btn-secondary">Cancel</button>
                                    <button type="button" onClick={saveCard} className="qn-btn-primary" disabled={!draftCard.balance && draftCard.balance !== 0}>Save Card</button>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* ── Credit Score ── */}
                    <Row full>
                        <InputField label="Credit Score" name="credit_score" type="number" value={f.credit_score} onChange={onChange} placeholder="e.g. 750" info="Check on CIBIL, Experian, etc." />
                    </Row>
                </>
            )}
        </>
    );
};

const Step7 = ({ formData: f, onChange }) => (
    <>
        <div className="ani d1">
            <div className="qn-callout warn" style={{ marginBottom: '12px' }}>
                <strong>No insurance yet?</strong> Leave the fields blank — we'll include getting covered in your action plan.
            </div>
        </div>
        <div className="ani d2">
            <div className="qn-callout">
                Enter premiums here for Health and Life insurance. Do not add these again under Insurance Premiums in the Expenses step — that is for Vehicle, Home, and other policies only.
            </div>
        </div>
        <div className="ani d3 qn-insurance-cards">
            <div className="qn-insurance-card">
                <div className="qn-insurance-card-header">
                    <ShieldCheck size={16} />
                    <span>HEALTH INSURANCE</span>
                </div>
                <div className="qn-insurance-card-body">
                    <InputField label="Cover Amount" name="health_cover" type="currency" prefix="₹" value={f.health_cover} onChange={onChange} info="Sum insured — the maximum the insurer will pay. Ideal: ₹10–25L for a family." optional />
                    <InputField label="Annual Premium" name="health_premium" type="currency" prefix="₹" value={f.health_premium} onChange={onChange} info="Total yearly premium paid for health insurance." optional />
                </div>
            </div>
            <div className="qn-insurance-card">
                <div className="qn-insurance-card-header">
                    <Users size={16} />
                    <span>LIFE INSURANCE</span>
                </div>
                <div className="qn-insurance-card-body">
                    <InputField label="Term Cover Amount" name="life_cover" type="currency" prefix="₹" value={f.life_cover} onChange={onChange} info="Term insurance pays a lump sum to your nominee if you die during the policy term. Ideal: 10–15× your annual income." optional />
                    <InputField label="Annual Premium" name="life_premium" type="currency" prefix="₹" value={f.life_premium} onChange={onChange} info="Total yearly premium paid for life / term insurance." optional />
                </div>
            </div>
        </div>
        <div className="ani d2">
            <div className="qn-callout">
                Insurance premiums (health, term, vehicle, etc.) should also be included in the annual Insurance Premiums field under the Expenses step.
            </div>
        </div>
    </>
);

const Step8 = ({ formData: f, onChange }) => (
    <>
        <div className="ani d1" style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
            <div className="qn-callout warn">
                <strong>Not sure about tax?</strong> Select <em>New Regime</em> below and leave the rest blank — we'll still give you a complete financial plan. The fields below only apply if you're using the Old Regime with deductions.
            </div>
            <SelectField label="Current Tax Regime" name="tax_regime" value={f.tax_regime} onChange={onChange} options={['Old Regime', 'New Regime', 'Not Sure']} info="Old Regime allows deductions (80C, HRA, etc) but has higher base rates. New Regime has lower rates but fewer deductions." />
        </div>
        <div className="ani d2">
            <Row>
                <InputField label="80C Used (PPF, ELSS, etc)" name="tax_80c_used" type="currency" prefix="₹" value={f.tax_80c_used} onChange={onChange} info="Section 80C: up to ₹1.5L deduction for PPF, ELSS, LIC, tuition fees, home loan principal, etc." />
                <InputField label="NPS 80CCD(1B)" name="tax_nps_80ccd" type="currency" prefix="₹" value={f.tax_nps_80ccd} onChange={onChange} info="Extra ₹50,000 deduction over 80C for NPS (National Pension System) contributions. Only in Old Regime." />
            </Row>
            <Row>
                <InputField label="HRA Used" name="tax_hra" type="currency" prefix="₹" value={f.tax_hra} onChange={onChange} info="House Rent Allowance exemption for salaried individuals paying rent. Only in Old Regime." />
                <InputField label="Home Loan Interest" name="tax_home_loan_interest" type="currency" prefix="₹" value={f.tax_home_loan_interest} onChange={onChange} info="Section 24: up to ₹2L deduction on home loan interest paid (self-occupied property). Old Regime only." />
            </Row>
        </div>
        <div className="ani d3">
            <InputField label="Health Insurance 80D" name="tax_80d" type="currency" prefix="₹" value={f.tax_80d} onChange={onChange} info="Up to ₹25K for self + ₹25K for parents (₹50K if senior). Covers health insurance premiums and preventive checkups." />
        </div>
    </>
);

const Step9 = ({ formData: f, onChange }) => (
    <>
        <div className="ani d1">
            <div className="qn-callout warn">
                <strong>Don't have a will yet?</strong> That's okay — even setting nominees on your bank, demat, insurance, PF, and mutual fund accounts takes just 5 minutes and protects your family from legal delays.
            </div>
        </div>
        <div className="ani d2">
            <SelectField label="Do you have a Will?" name="has_will" value={f.has_will} onChange={onChange} options={['Yes', 'No', 'In Progress']} info="A legally registered will ensures your assets go to chosen beneficiaries and avoids family disputes." />
            <SelectField label="Nominees set for major accounts?" name="nominees_set" value={f.nominees_set} onChange={onChange} options={['Yes, all', 'Yes, some', 'No']} info="Nominees are temporary custodians. Set nominees on: Bank accounts, Demat, Insurance, PF, NPS, MF folios." />
            <InputField label="Number of Nominees Assigned" name="num_nominees" type="number" value={f.num_nominees} onChange={onChange} info="Count of unique nominees across all your financial accounts" />
        </div>
    </>
);

const Step10 = ({ formData: f, onChange }) => {
    const groups = [
        {
            name: 'Spending',
            questions: [
                { label: 'I review my finances at least once a month', name: 'beh_review_monthly' },
                { label: 'I tend to delay important financial decisions', name: 'beh_delay_decisions' },
                { label: 'I sometimes spend impulsively and regret it later', name: 'beh_spend_impulsively' },
                { label: 'I actively avoid taking on unnecessary debt', name: 'beh_avoid_debt' },
            ],
        },
        {
            name: 'Investing',
            questions: [
                { label: 'When markets fall, I stay calm and don\'t change my investments', name: 'beh_market_reaction' },
                { label: 'When I receive unexpected money, I invest or save most of it', name: 'beh_windfall_behaviour' },
                { label: 'I hold onto losing investments hoping they will recover', name: 'beh_hold_losing' },
                { label: 'I understand what I\'m invested in and why', name: 'beh_product_understanding' },
                { label: 'I regularly follow financial news and market updates', name: 'beh_follow_market_news' },
            ],
        },
        {
            name: 'Mindset',
            questions: [
                { label: 'I compare my financial progress with friends or peers', name: 'beh_compare_peers' },
                { label: 'I prefer guaranteed returns over higher but uncertain gains', name: 'beh_prefer_guaranteed' },
                { label: 'I feel anxious when making big financial decisions', name: 'beh_anxious_decisions' },
                { label: 'I tend to invest in brands or companies I already know', name: 'beh_familiar_brands' },
            ],
        },
    ];
    const [tab, setTab] = useState(0);
    const scaleLabels = ['Strongly Disagree', 'Disagree', 'Neutral', 'Agree', 'Strongly Agree'];
    const renderQ = (q, i) => {
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
    };
    const activeGroup = groups[tab];

    return <>
        <div className="ani d1" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div className="qn-callout">
                <strong>How to answer:</strong> Rate each statement 1–5 based on how strongly you agree.
                <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', marginTop: '6px' }}>
                    {scaleLabels.map((lbl, i) => (
                        <span key={i} style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '12px' }}>
                            <strong>{i + 1}</strong> = {lbl}
                        </span>
                    ))}
                </div>
            </div>
            <StepTabs tabs={['Spending', 'Investing', 'Mindset']} active={tab} onChange={setTab} />
        </div>
        <div className="ani d2">
            {activeGroup.questions.map((q, i) => renderQ(q, i))}
        </div>
    </>;
};
/* ═══════════════════════════════════════════════
   STEP 12 — REVIEW & SUBMIT
   ═══════════════════════════════════════════════ */

const StepReview = ({ formData: f, goals = [], onGoToStep }) => {
    const fmtAmt = (v) => {
        if (!v && v !== 0) return null;
        const n = Number(v);
        if (isNaN(n) || n === 0) return null;
        if (n >= 10000000) return `₹${(n / 10000000).toFixed(1)}Cr`;
        if (n >= 100000) return `₹${(n / 100000).toFixed(1)}L`;
        if (n >= 1000) return `₹${Math.round(n / 1000)}K`;
        return `₹${n.toLocaleString('en-IN')}`;
    };

    const loans = Array.isArray(f.loans) ? f.loans : [];
    const cards = Array.isArray(f.credit_cards) ? f.credit_cards : [];
    const behFields = ['beh_review_monthly','beh_delay_decisions','beh_spend_impulsively','beh_avoid_debt','beh_market_reaction','beh_windfall_behaviour','beh_hold_losing','beh_product_understanding','beh_compare_peers','beh_prefer_guaranteed','beh_follow_market_news','beh_anxious_decisions','beh_familiar_brands'];
    const behAnswered = behFields.filter(k => f[k]).length;

    // KPI calculations — matches SurplusTracker and backend computeSurplus logic
    const monthlyIncome = (Number(f.monthly_take_home) || 0) + (Number(f.business_income) || 0) / 12 + (Number(f.other_income) || 0) / 12;
    const monthlyExpenses = (Number(f.expense_household) || 0) + (Number(f.expense_rent) || 0) + (Number(f.expense_utilities) || 0) + (Number(f.expense_transport) || 0) + (Number(f.expense_food) || 0) + (Number(f.expense_subscriptions) || 0) + (Number(f.expense_discretionary) || 0);
    const annualExpenses = (Number(f.expense_annual_insurance) || 0) + (Number(f.expense_annual_education) || 0) + (Number(f.expense_annual_property) || 0) + (Number(f.expense_annual_travel) || 0) + (Number(f.expense_annual_other) || 0);
    const reviewLoans = Array.isArray(f.loans) ? f.loans : [];
    const reviewLoanEMI = reviewLoans.reduce((sum, l) => sum + (Number(l.emi) || 0), 0);
    const reviewCards = Array.isArray(f.credit_cards) ? f.credit_cards : [];
    const reviewCcEMI = reviewCards.reduce((sum, c) => {
        const balance = Number(c.balance) || 0;
        if (c.type === 'full' || !balance) return sum;
        if (c.type === 'emi') return sum + (Number(c.emi_amount) || balance * 0.03);
        return sum + (balance * 0.03);
    }, 0);
    const totalEMI = reviewLoanEMI + reviewCcEMI;
    const generalSip = Number(f.inv_monthly_sip) || 0;
    const goalSipTotal = goals.reduce((s, g) => s + (Number(g.monthlySip) || 0), 0);
    const totalSip = generalSip + goalSipTotal;
    const totalOutflow = monthlyExpenses + (annualExpenses / 12) + totalEMI + totalSip;
    const surplus = monthlyIncome - totalOutflow;

    const kpis = [
        { label: 'Profile', value: f.date_of_birth ? (f.city || 'Set') : 'Incomplete', sub: f.employment_type || '—' },
        { label: 'Monthly Income', value: fmtAmt(monthlyIncome) || '—', sub: f.expected_income_growth ? `${f.expected_income_growth}% growth exp.` : 'No growth set' },
        { label: 'Monthly Outflow', value: fmtAmt(totalOutflow) || '—', sub: 'Expenses, EMIs & SIPs' },
        { label: 'Net Surplus', value: surplus > 0 ? (fmtAmt(surplus) || '—') : (surplus < 0 ? `–${fmtAmt(Math.abs(surplus)) || '—'}` : '—'), sub: surplus > 0 ? 'Free cash after all commitments' : surplus < 0 ? 'Deficit detected' : 'Not yet calculated', accent: surplus < 0 },
    ];

    const sectionStatus = [
        { step: 2, title: 'Financial Background', done: !!(f.gen_q1 && f.gen_q2 && f.gen_q3) },
        { step: 6, title: 'Goals', done: goals.length > 0, count: goals.length, unit: 'goal' },
        { step: 7, title: 'Investments', done: !!(f.inv_equity_mf || f.inv_direct_stocks || f.inv_gold_commodities || f.inv_epf_ppf_nps) },
        { step: 8, title: 'Liabilities', done: !!(loans.length || cards.length || f.credit_score), count: loans.length + cards.length, unit: 'item' },
        { step: 9, title: 'Insurance', done: !!(f.health_cover || f.life_cover) },
    ];

    return (
        <div className="qn-review-wrap">
            <div className="qn-review-complete-banner">
                <CheckCircle2 size={18} />
                <span>You've completed all the essential sections. Review below and generate your report.</span>
            </div>

            {/* KPI Cards */}
            <div className="qn-review-kpis">
                {kpis.map((k, i) => (
                    <div key={i} className={`qn-review-kpi${k.accent ? ' accent-red' : ''}`}>
                        <div className="qn-review-kpi-value">{k.value}</div>
                        <div className="qn-review-kpi-label">{k.label}</div>
                        <div className="qn-review-kpi-sub">{k.sub}</div>
                    </div>
                ))}
            </div>

            {/* Section completion grid */}
            <div className="qn-review-sections-label">Optional & detailed sections</div>
            <div className="qn-review-sections-grid">
                {sectionStatus.map(s => (
                    <button key={s.step} type="button" className="qn-review-section-tile" onClick={() => onGoToStep(s.step)}>
                        <div className="qn-review-section-tile-icon">
                            <StepIcon stepId={s.step} size={16} />
                        </div>
                        <div className="qn-review-section-tile-title">{s.title}</div>
                        <div className={`qn-review-section-tile-badge${s.done ? ' done' : ''}`}>
                            {s.done
                                ? (s.count != null ? `${s.count} ${s.count === 1 ? s.unit : s.unit + 's'}` : 'Done')
                                : 'Skipped'}
                        </div>
                    </button>
                ))}
            </div>

            <div className="qn-review-edit-prompt">
                Want to change something? Click any section above or use the sidebar to navigate.
            </div>
        </div>
    );
};
