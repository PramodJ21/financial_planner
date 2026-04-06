import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { fetchWithAuth } from '../api';
import InstrumentSearch from '../components/InstrumentSearch';
import '../styles/portfolio.css';

const TYPE_LABELS = {
    mutual_fund: 'MF',
    equity: 'EQ',
    etf: 'ETF',
    index: 'IDX',
    gold: 'GOLD',
    bond: 'BOND',
    fixed_return: 'FD',
};

function formatInr(val) {
    const n = parseFloat(val);
    if (!n) return '—';
    if (n >= 1e7) return `₹${(n / 1e7).toFixed(2)} Cr`;
    if (n >= 1e5) return `₹${(n / 1e5).toFixed(2)} L`;
    return `₹${n.toLocaleString('en-IN')}`;
}

// ── Step 1 — Portfolio Details ─────────────────────────────────────────────────
function Step1({ name, setName, principal, setPrincipal, notes, setNotes, errors }) {
    return (
        <div className="pnew-form">
            <div className="pnew-field">
                <label className="pnew-label">Portfolio Name</label>
                <input
                    className={`pnew-input${errors.name ? ' error' : ''}`}
                    placeholder="e.g. Retirement Fund, Emergency Corpus"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    maxLength={120}
                    autoFocus
                />
                {errors.name && <span className="pnew-error">{errors.name}</span>}
            </div>

            <div className="pnew-field">
                <label className="pnew-label">
                    Starting Corpus <span>(the amount you're hypothetically investing)</span>
                </label>
                <div className="pnew-input-prefix-wrap">
                    <span className="pnew-input-prefix">₹</span>
                    <input
                        className={`pnew-input${errors.principal ? ' error' : ''}`}
                        type="number"
                        placeholder="500000"
                        value={principal}
                        onChange={(e) => setPrincipal(e.target.value)}
                        min={1000}
                    />
                </div>
                {errors.principal && <span className="pnew-error">{errors.principal}</span>}
                {principal && parseFloat(principal) >= 1000 && (
                    <span style={{ fontSize: 12, color: 'var(--ink-soft)' }}>{formatInr(principal)}</span>
                )}
            </div>

            <div className="pnew-field">
                <label className="pnew-label">Notes <span>(optional)</span></label>
                <textarea
                    className="pnew-textarea"
                    placeholder="Notes about this portfolio's strategy or goal…"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    maxLength={500}
                />
                {notes.length > 400 && (
                    <span style={{ fontSize: 11, color: 'var(--ink-soft)', textAlign: 'right' }}>
                        {notes.length}/500
                    </span>
                )}
            </div>
        </div>
    );
}

// ── Step 2 — Holdings ─────────────────────────────────────────────────────────
function Step2({ holdings, setHoldings }) {
    const totalAllocated = holdings.reduce((s, h) => s + (parseFloat(h.allocation_pct) || 0), 0);
    const isOver = totalAllocated > 100;

    function addHolding(instrument) {
        if (holdings.some((h) => h.instrument_id === instrument.id)) return;
        setHoldings([
            ...holdings,
            {
                tempId: Date.now(),
                instrument_id: instrument.id,
                instrument_name: instrument.name,
                instrument_type: instrument.instrument_type,
                exchange: instrument.exchange,
                allocation_pct: '',
            },
        ]);
    }

    function updateAlloc(tempId, value) {
        setHoldings(holdings.map((h) => h.tempId === tempId ? { ...h, allocation_pct: value } : h));
    }

    function removeHolding(tempId) {
        setHoldings(holdings.filter((h) => h.tempId !== tempId));
    }

    return (
        <div className="pnew-form">
            <div className="pnew-field">
                <label className="pnew-label">Search &amp; add holdings</label>
                <InstrumentSearch onSelect={addHolding} />
            </div>

            {holdings.length > 0 && (
                <div className="pnew-holdings-list">
                    {holdings.map((h) => (
                        <div key={h.tempId} className="pnew-holding-row pnew-holding-row--simple">
                            <div className="pnew-holding-name">
                                <strong>{h.instrument_name}</strong>
                                <span>
                                    {TYPE_LABELS[h.instrument_type] || h.instrument_type}
                                    {h.exchange ? ` · ${h.exchange}` : ''}
                                </span>
                            </div>

                            <div className="pnew-alloc-input-wrap">
                                <input
                                    type="number"
                                    placeholder="0"
                                    value={h.allocation_pct}
                                    min={0.1}
                                    max={100}
                                    step={0.1}
                                    onChange={(e) => updateAlloc(h.tempId, e.target.value)}
                                    autoFocus={holdings[holdings.length - 1]?.tempId === h.tempId}
                                />
                                <span className="pnew-alloc-suffix">%</span>
                            </div>

                            <button
                                className="pnew-remove-btn"
                                onClick={() => removeHolding(h.tempId)}
                                title="Remove"
                            >×</button>
                        </div>
                    ))}

                    <div className="pnew-alloc-bar-wrap">
                        <div className="pnew-alloc-bar-header">
                            <span>Total allocated</span>
                            <span className={`pnew-alloc-total ${isOver ? 'over' : 'ok'}`}>
                                {totalAllocated.toFixed(1)}%
                                {isOver && ' ⚠ Over 100%'}
                                {!isOver && totalAllocated < 100 && ` · ${(100 - totalAllocated).toFixed(1)}% free`}
                            </span>
                        </div>
                        <div className="pnew-alloc-track">
                            <div
                                className={`pnew-alloc-fill${isOver ? ' over' : ''}`}
                                style={{ width: `${Math.min(totalAllocated, 100)}%` }}
                            />
                        </div>
                    </div>
                </div>
            )}

            {holdings.length === 0 && (
                <div style={{ padding: '32px 0', textAlign: 'center', color: 'var(--ink-soft)', fontSize: 13 }}>
                    Search above to add your first holding.
                </div>
            )}

            <div style={{ fontSize: 12, color: 'var(--ink-soft)', marginTop: 4, lineHeight: 1.6 }}>
                You can organise holdings into groups after saving the portfolio.
            </div>
        </div>
    );
}

const BENCHMARKS = [
    { value: 'fd_7pct', label: 'FD at 7% p.a.', desc: 'Fixed deposit benchmark' },
    { value: 'fd_8pct', label: 'FD at 8% p.a.', desc: 'Higher FD / debt fund proxy' },
    { value: 'nifty50', label: 'Nifty 50 Index Fund', desc: 'UTI Nifty 50 Index Fund (Direct Growth)' },
];

const STRATEGIES = [
    { value: 'none',               label: 'No Rebalancing',   desc: 'Buy and hold' },
    { value: 'monthly',            label: 'Monthly',          desc: '1st of each month' },
    { value: 'quarterly',          label: 'Quarterly',        desc: 'Jan, Apr, Jul, Oct' },
    { value: 'annually',           label: 'Annually',         desc: 'Every January' },
    { value: 'threshold',          label: 'Threshold',        desc: 'When drift exceeds X%' },
    { value: 'threshold_calendar', label: 'Hybrid',           desc: 'Monthly + threshold' },
];

function dateYearsAgo(n) {
    const d = new Date();
    d.setFullYear(d.getFullYear() - n);
    return d.toISOString().slice(0, 10);
}

const TODAY = new Date().toISOString().slice(0, 10);

// ── Step 3 — Review & Backtest Config ─────────────────────────────────────────
function Step3({ name, principal, notes, holdings, saving, saveError, backtestConfig, setBacchtestConfig }) {
    const totalAllocated = holdings.reduce((s, h) => s + (parseFloat(h.allocation_pct) || 0), 0);
    const { fromDate, toDate, benchmark, strategy, threshold, txCost, runBacktest } = backtestConfig;

    const needsThreshold = strategy === 'threshold' || strategy === 'threshold_calendar';

    function setPreset(years) {
        setBacchtestConfig((c) => ({ ...c, fromDate: dateYearsAgo(years), toDate: TODAY }));
    }

    const presets = [
        { label: '1Y', years: 1 },
        { label: '3Y', years: 3 },
        { label: '5Y', years: 5 },
        { label: '10Y', years: 10 },
    ];

    function isPreset(years) {
        return fromDate === dateYearsAgo(years) && toDate === TODAY;
    }

    return (
        <div className="pnew-form">
            {/* Summary row */}
            <div className="pnew-step3-mini-summary">
                <span><strong>{name}</strong></span>
                <span style={{ color: 'var(--ink-soft)' }}>·</span>
                <span style={{ fontFamily: 'var(--font-value)' }}>{formatInr(principal)}</span>
                <span style={{ color: 'var(--ink-soft)' }}>·</span>
                <span style={{ color: 'var(--ink-soft)' }}>{holdings.length} holding{holdings.length !== 1 ? 's' : ''}</span>
            </div>

            <div className="pnew-step3-holdings-list" style={{ marginBottom: 24 }}>
                {holdings.map((h) => (
                    <div key={h.tempId} className="pnew-step3-holding-item">
                        <span>{h.instrument_name}</span>
                        <strong>{parseFloat(h.allocation_pct || 0).toFixed(1)}%</strong>
                    </div>
                ))}
                {totalAllocated < 99.9 && (
                    <div className="pnew-step3-holding-item" style={{ opacity: 0.5 }}>
                        <span>Cash (unallocated)</span>
                        <strong>{(100 - totalAllocated).toFixed(1)}%</strong>
                    </div>
                )}
            </div>

            {/* Backtest toggle */}
            <div className="pnew-bt-toggle-row">
                <label className="pnew-bt-toggle">
                    <input
                        type="checkbox"
                        checked={runBacktest}
                        onChange={(e) => setBacchtestConfig((c) => ({ ...c, runBacktest: e.target.checked }))}
                    />
                    <span>Run backtest immediately after saving</span>
                </label>
            </div>

            {runBacktest && (
                <div className="pnew-bt-config">
                    <div className="pnew-field">
                        <label className="pnew-label">Date range</label>
                        <div className="pnew-preset-row">
                            {presets.map((p) => (
                                <button
                                    key={p.label}
                                    type="button"
                                    className={`pnew-preset-btn${isPreset(p.years) ? ' active' : ''}`}
                                    onClick={() => setPreset(p.years)}
                                >{p.label}</button>
                            ))}
                        </div>
                        <div className="pnew-date-range">
                            <div>
                                <label className="pnew-label" style={{ fontSize: 11 }}>From</label>
                                <input
                                    type="date"
                                    className="pnew-input"
                                    value={fromDate}
                                    max={toDate}
                                    onChange={(e) => setBacchtestConfig((c) => ({ ...c, fromDate: e.target.value }))}
                                />
                            </div>
                            <div>
                                <label className="pnew-label" style={{ fontSize: 11 }}>To</label>
                                <input
                                    type="date"
                                    className="pnew-input"
                                    value={toDate}
                                    min={fromDate}
                                    max={TODAY}
                                    onChange={(e) => setBacchtestConfig((c) => ({ ...c, toDate: e.target.value }))}
                                />
                            </div>
                        </div>
                    </div>

                    <div className="pnew-field">
                        <label className="pnew-label">Rebalancing strategy</label>
                        <div className="pnew-strategy-grid">
                            {STRATEGIES.map((s) => (
                                <button
                                    key={s.value}
                                    type="button"
                                    className={`pnew-strategy-card${strategy === s.value ? ' active' : ''}`}
                                    onClick={() => setBacchtestConfig((c) => ({ ...c, strategy: s.value }))}
                                >
                                    <span className="pnew-strategy-name">{s.label}</span>
                                    <span className="pnew-strategy-desc">{s.desc}</span>
                                </button>
                            ))}
                        </div>

                        {needsThreshold && (
                            <div style={{ marginTop: 10, display: 'flex', alignItems: 'center', gap: 8 }}>
                                <label className="pnew-label" style={{ fontSize: 11, margin: 0 }}>Drift threshold</label>
                                <input
                                    type="number"
                                    className="pnew-input"
                                    style={{ width: 64 }}
                                    value={threshold}
                                    min={0.5} max={50} step={0.5}
                                    onChange={(e) => setBacchtestConfig((c) => ({ ...c, threshold: e.target.value }))}
                                />
                                <span style={{ fontSize: 12, color: 'var(--ink-soft)' }}>% triggers rebalance</span>
                            </div>
                        )}
                    </div>

                    <div className="pnew-field">
                        <label className="pnew-label">Benchmark</label>
                        <div className="pnew-benchmark-options">
                            {BENCHMARKS.map((b) => (
                                <label key={b.value} className={`pnew-benchmark-option${benchmark === b.value ? ' selected' : ''}`}>
                                    <input
                                        type="radio"
                                        name="benchmark"
                                        value={b.value}
                                        checked={benchmark === b.value}
                                        onChange={() => setBacchtestConfig((c) => ({ ...c, benchmark: b.value }))}
                                    />
                                    <div>
                                        <div style={{ fontWeight: 600, fontSize: 13 }}>{b.label}</div>
                                        <div style={{ fontSize: 11, color: 'var(--ink-soft)' }}>{b.desc}</div>
                                    </div>
                                </label>
                            ))}
                        </div>
                    </div>

                    <div className="pnew-field">
                        <label className="pnew-label">
                            Transaction cost <span>(optional)</span>
                        </label>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <input
                                type="number"
                                className="pnew-input"
                                style={{ width: 80 }}
                                value={txCost}
                                min={0} max={5} step={0.01}
                                onChange={(e) => setBacchtestConfig((c) => ({ ...c, txCost: e.target.value }))}
                            />
                            <span style={{ fontSize: 12, color: 'var(--ink-soft)' }}>% of traded amount per rebalance</span>
                        </div>
                    </div>
                </div>
            )}

            {saveError && <div className="portfolio-error" style={{ margin: 0 }}>{saveError}</div>}
            {saving && (
                <div style={{ textAlign: 'center', color: 'var(--ink-soft)', fontSize: 13, paddingTop: 8 }}>
                    {runBacktest ? 'Saving & running backtest…' : 'Saving your portfolio…'}
                </div>
            )}
        </div>
    );
}

// ── PortfolioNew Page ─────────────────────────────────────────────────────────
const STEPS = [
    { num: 1, label: 'Details' },
    { num: 2, label: 'Holdings' },
    { num: 3, label: 'Backtest' },
];

const LEFT_PANEL = {
    1: {
        step: 'Step 1 of 3',
        title: 'Name your portfolio',
        desc: 'Give this portfolio a name that reflects its purpose — retirement, a car fund, or just "my experiment". Set the starting corpus to simulate.',
    },
    2: {
        step: 'Step 2 of 3',
        title: 'Add your holdings',
        desc: 'Search for mutual funds, ETFs, or indices and assign each an allocation percentage. You can organise them into groups after saving.',
    },
    3: {
        step: 'Step 3 of 3',
        title: 'Review & run backtest',
        desc: 'Review your portfolio and optionally run a backtest against historical NAV data. Choose a date range and benchmark to compare against.',
    },
};

function PortfolioNew() {
    const navigate = useNavigate();
    const [step, setStep] = useState(1);

    const [name, setName] = useState('');
    const [principal, setPrincipal] = useState('');
    const [notes, setNotes] = useState('');
    const [errors, setErrors] = useState({});
    const [holdings, setHoldings] = useState([]);
    const [saving,        setSaving]        = useState(false);
    const [saveError,     setSaveError]     = useState(null);
    const [savingPhase,   setSavingPhase]   = useState(null); // null | 'saving' | 'downloading' | 'backtesting'
    const [downloadNames, setDownloadNames] = useState([]);

    const [backtestConfig, setBacchtestConfig] = useState({
        runBacktest: true,
        fromDate:   dateYearsAgo(5),
        toDate:     TODAY,
        benchmark:  'fd_7pct',
        strategy:   'none',
        threshold:  '5',
        txCost:     '0',
    });

    function validateStep1() {
        const e = {};
        if (!name.trim()) e.name = 'Portfolio name is required.';
        else if (name.trim().length > 120) e.name = 'Name must be 120 characters or fewer.';
        if (!principal || parseFloat(principal) < 1000) e.principal = 'Principal must be at least ₹1,000.';
        setErrors(e);
        return Object.keys(e).length === 0;
    }

    function handleNext() {
        if (step === 1 && !validateStep1()) return;
        setStep((s) => s + 1);
    }

    function handleBack() {
        setStep((s) => s - 1);
        setSaveError(null);
    }

    const handleSave = useCallback(async () => {
        setSaving(true);
        setSaveError(null);
        setSavingPhase('saving');
        setDownloadNames([]);
        try {
            // Create portfolio
            const portfolio = await fetchWithAuth('/portfolios', {
                method: 'POST',
                body: JSON.stringify({ name: name.trim(), principal: parseFloat(principal), notes: notes.trim() || null }),
            });

            // Add holdings
            for (const h of holdings) {
                const allocPct = parseFloat(h.allocation_pct);
                if (!allocPct || allocPct <= 0) continue;
                await fetchWithAuth(`/portfolios/${portfolio.id}/holdings`, {
                    method: 'POST',
                    body: JSON.stringify({ instrument_id: h.instrument_id, allocation_pct: allocPct }),
                });
            }

            // Optionally run backtest
            if (backtestConfig.runBacktest && holdings.length > 0) {
                // Pre-check: identify instruments needing download
                setSavingPhase('downloading');
                try {
                    const coverage = await fetchWithAuth(
                        `/portfolios/${portfolio.id}/data-range?to=${backtestConfig.toDate}`
                    );
                    const needsFetch = [
                        ...(coverage.missing || []),
                        ...(coverage.stale   || []),
                    ];
                    if (needsFetch.length > 0) {
                        setDownloadNames(needsFetch.map((i) => i.name));
                    } else {
                        setSavingPhase('backtesting');
                    }
                } catch { setSavingPhase('backtesting'); }

                const needsThreshold = backtestConfig.strategy === 'threshold' || backtestConfig.strategy === 'threshold_calendar';
                const btBody = {
                    from_date:            backtestConfig.fromDate,
                    to_date:              backtestConfig.toDate,
                    benchmark:            backtestConfig.benchmark,
                    rebalance_strategy:   backtestConfig.strategy,
                    transaction_cost_pct: parseFloat(backtestConfig.txCost) || 0,
                };
                if (needsThreshold) btBody.rebalance_threshold_pct = parseFloat(backtestConfig.threshold) || 5;
                try {
                    await fetchWithAuth(`/portfolios/${portfolio.id}/backtest`, {
                        method: 'POST',
                        body: JSON.stringify(btBody),
                    });
                } catch {
                    // Backtest failed — still navigate to portfolio, user can retry there
                }
            }

            navigate('/portfolio');
        } catch (err) {
            setSaveError(err.message || 'Failed to save portfolio. Please try again.');
        } finally {
            setSaving(false);
            setSavingPhase(null);
            setDownloadNames([]);
        }
    }, [name, principal, notes, holdings, backtestConfig, navigate]);

    const leftInfo = LEFT_PANEL[step];
    const totalAllocated = holdings.reduce((s, h) => s + (parseFloat(h.allocation_pct) || 0), 0);

    return (
        <div className="pnew-page">
            <div className="pnew-left">
                <div className="pnew-left-brand">Fin<em>Health</em></div>
                <div className="pnew-left-step">{leftInfo.step}</div>
                <div className="pnew-left-title">{leftInfo.title}</div>
                <div className="pnew-left-desc">{leftInfo.desc}</div>

                <div className="pnew-preview-card">
                    <div className="pnew-preview-card-label">Portfolio Preview</div>
                    <div className="pnew-preview-card-name">
                        {name || <span style={{ opacity: 0.3 }}>Your Portfolio Name</span>}
                    </div>
                    <div className="pnew-preview-card-principal">
                        {principal && parseFloat(principal) >= 1000
                            ? formatInr(principal)
                            : <span style={{ opacity: 0.3 }}>₹ Corpus</span>}
                    </div>
                    {step >= 2 && holdings.length > 0 && (
                        <div style={{ marginTop: 12, fontSize: 12, color: 'rgba(255,255,255,0.5)' }}>
                            {holdings.length} holding{holdings.length !== 1 ? 's' : ''}
                            {' · '}{totalAllocated.toFixed(0)}% allocated
                        </div>
                    )}
                    {notes && <div className="pnew-preview-card-notes">{notes}</div>}
                </div>
            </div>

            <div className="pnew-right">
                <div className="pnew-steps">
                    {STEPS.map((s) => (
                        <div
                            key={s.num}
                            className={`pnew-step-dot${step === s.num ? ' active' : step > s.num ? ' done' : ''}`}
                        >
                            <div className="pnew-step-circle">{step > s.num ? '✓' : s.num}</div>
                            <span className="pnew-step-label">{s.label}</span>
                        </div>
                    ))}
                </div>

                {step === 1 && (
                    <Step1
                        name={name} setName={setName}
                        principal={principal} setPrincipal={setPrincipal}
                        notes={notes} setNotes={setNotes}
                        errors={errors}
                    />
                )}
                {step === 2 && (
                    <Step2 holdings={holdings} setHoldings={setHoldings} />
                )}
                {step === 3 && (
                    <Step3
                        name={name} principal={principal} notes={notes}
                        holdings={holdings} saving={saving} saveError={saveError}
                        backtestConfig={backtestConfig} setBacchtestConfig={setBacchtestConfig}
                    />
                )}

                <div className="pnew-nav">
                    {step > 1 ? (
                        <button className="btn-secondary" onClick={handleBack} disabled={saving}>← Back</button>
                    ) : (
                        <button className="btn-ghost" onClick={() => navigate('/portfolio')}>Cancel</button>
                    )}

                    {step < 3 ? (
                        <button className="btn-primary" onClick={handleNext}>
                            {step === 2 && holdings.length === 0 ? 'Continue without holdings' : 'Continue →'}
                        </button>
                    ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 8 }}>
                            <button className="btn-primary accent" onClick={handleSave} disabled={saving}>
                                {saving
                                    ? <>
                                        <span className="btn-spinner" />
                                        {savingPhase === 'saving'      ? 'Saving…'
                                        : savingPhase === 'downloading' ? 'Downloading data…'
                                        : savingPhase === 'backtesting' ? 'Running backtest…'
                                        : 'Working…'}
                                      </>
                                    : (backtestConfig.runBacktest ? 'Save & Run Backtest →' : 'Save Portfolio →')}
                            </button>
                            {savingPhase === 'downloading' && downloadNames.length > 0 && (
                                <div className="bt-download-notice">
                                    <span className="bt-download-dot" />
                                    Downloading ticker data for{' '}
                                    <strong>
                                        {downloadNames.slice(0, 2).join(', ')}
                                        {downloadNames.length > 2 ? ` +${downloadNames.length - 2} more` : ''}
                                    </strong>
                                    … this may take a moment.
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

export default PortfolioNew;
