import { useState, useEffect, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
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

export default function PortfolioEdit() {
    const { id } = useParams();
    const navigate = useNavigate();

    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState(null);
    const [saveError, setSaveError] = useState(null);

    const [name, setName] = useState('');
    const [principal, setPrincipal] = useState('');
    const [notes, setNotes] = useState('');
    const [holdings, setHoldings] = useState([]);

    useEffect(() => {
        setLoading(true);
        fetchWithAuth(`/portfolios/${id}`)
            .then((data) => {
                setName(data.name || '');
                setPrincipal(String(data.principal || ''));
                setNotes(data.notes || '');
                setHoldings(
                    (data.holdings || []).map((h) => ({
                        id: h.id,
                        instrument_id: h.instrument_id,
                        instrument_name: h.instrument_name,
                        instrument_type: h.instrument_type,
                        exchange: h.exchange,
                        ticker: h.ticker,
                        allocation_pct: String(parseFloat(h.allocation_pct).toFixed(1)),
                        isNew: false,
                        toDelete: false,
                    }))
                );
            })
            .catch(() => setError('Failed to load portfolio.'))
            .finally(() => setLoading(false));
    }, [id]);

    const visibleHoldings = holdings.filter((h) => !h.toDelete);
    const totalAllocated = visibleHoldings.reduce((s, h) => s + (parseFloat(h.allocation_pct) || 0), 0);
    const isOver = totalAllocated > 100;

    function addHolding(instrument) {
        if (holdings.some((h) => !h.toDelete && h.instrument_id === instrument.id)) return;
        setHoldings((prev) => [
            ...prev,
            {
                tempId: Date.now(),
                instrument_id: instrument.id,
                instrument_name: instrument.name,
                instrument_type: instrument.instrument_type,
                exchange: instrument.exchange,
                ticker: instrument.ticker,
                allocation_pct: '',
                isNew: true,
                toDelete: false,
            },
        ]);
    }

    function updateAlloc(key, val) {
        setHoldings((prev) =>
            prev.map((h) => (h.id === key || h.tempId === key) ? { ...h, allocation_pct: val } : h)
        );
    }

    function markDelete(key) {
        setHoldings((prev) =>
            prev.map((h) => {
                if (h.id === key || h.tempId === key) {
                    return h.isNew ? null : { ...h, toDelete: true };
                }
                return h;
            }).filter(Boolean)
        );
    }

    const handleSave = useCallback(async () => {
        if (!name.trim()) { setSaveError('Portfolio name is required.'); return; }
        if (!principal || parseFloat(principal) < 1000) { setSaveError('Principal must be at least ₹1,000.'); return; }
        if (isOver) { setSaveError(`Total allocation is ${totalAllocated.toFixed(1)}% — must not exceed 100%.`); return; }

        const invalids = visibleHoldings.filter((h) => !parseFloat(h.allocation_pct) || parseFloat(h.allocation_pct) <= 0);
        if (invalids.length > 0) { setSaveError(`${invalids[0].instrument_name} has no allocation set.`); return; }

        setSaving(true);
        setSaveError(null);

        try {
            await fetchWithAuth(`/portfolios/${id}`, {
                method: 'PUT',
                body: JSON.stringify({ name: name.trim(), principal: parseFloat(principal), notes: notes.trim() || null }),
            });

            for (const h of holdings.filter((h) => h.toDelete && !h.isNew)) {
                await fetchWithAuth(`/portfolios/${id}/holdings/${h.id}`, { method: 'DELETE' });
            }

            for (const h of holdings.filter((h) => !h.isNew && !h.toDelete)) {
                await fetchWithAuth(`/portfolios/${id}/holdings/${h.id}`, {
                    method: 'PUT',
                    body: JSON.stringify({ allocation_pct: parseFloat(h.allocation_pct) }),
                });
            }

            for (const h of holdings.filter((h) => h.isNew && !h.toDelete)) {
                await fetchWithAuth(`/portfolios/${id}/holdings`, {
                    method: 'POST',
                    body: JSON.stringify({ instrument_id: h.instrument_id, allocation_pct: parseFloat(h.allocation_pct) }),
                });
            }

            navigate('/portfolio');
        } catch (err) {
            setSaveError(err.message || 'Failed to save. Please try again.');
        } finally {
            setSaving(false);
        }
    }, [name, principal, notes, holdings, id, isOver, totalAllocated, visibleHoldings, navigate]);

    if (loading) {
        return (
            <div className="pedit-loading">
                <div className="spinner" />
                <span>Loading portfolio…</span>
            </div>
        );
    }

    if (error) {
        return (
            <div className="pedit-loading">
                <p style={{ color: 'var(--accent)' }}>{error}</p>
                <button className="btn-ghost" onClick={() => navigate('/portfolio')}>← Back to Portfolios</button>
            </div>
        );
    }

    return (
        <div className="pedit-page">

            {/* ── Sticky top bar ── */}
            <div className="pedit-topbar">
                <button className="pedit-back-btn" onClick={() => navigate('/portfolio')}>
                    ← Back
                </button>
                <div className="pedit-topbar-divider" />
                <span className="pedit-topbar-title">Edit Portfolio</span>
                <div className="pedit-topbar-actions">
                    <button className="btn-ghost" onClick={() => navigate('/portfolio')} disabled={saving}>
                        Cancel
                    </button>
                    <button className="btn-primary accent" onClick={handleSave} disabled={saving}>
                        {saving ? 'Saving…' : 'Save Changes'}
                    </button>
                </div>
            </div>

            {/* ── Scrollable form body ── */}
            <div className="pedit-scroll">
                <div className="pedit-body">

                    {saveError && (
                        <div className="pedit-error">{saveError}</div>
                    )}

                    {/* ── Section: Portfolio Details ── */}
                    <section className="pedit-section">
                        <div className="pedit-section-header">
                            <span className="pedit-section-label">Portfolio Details</span>
                            <div className="pedit-section-line" />
                        </div>

                        <div className="pedit-fields">
                            <div className="pedit-field">
                                <label className="pedit-label">Portfolio Name</label>
                                <input
                                    className="pedit-input"
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    placeholder="e.g. Retirement Fund"
                                    maxLength={120}
                                    autoFocus
                                />
                            </div>

                            <div className="pedit-field">
                                <label className="pedit-label">
                                    Starting Corpus
                                    <span className="pedit-label-hint"> — total amount being simulated</span>
                                </label>
                                <div className="pedit-prefix-wrap">
                                    <span className="pedit-prefix">₹</span>
                                    <input
                                        className="pedit-input"
                                        type="number"
                                        value={principal}
                                        onChange={(e) => setPrincipal(e.target.value)}
                                        placeholder="500000"
                                        min={1000}
                                    />
                                </div>
                                {principal && parseFloat(principal) >= 1000 && (
                                    <span className="pedit-hint">{formatInr(principal)}</span>
                                )}
                            </div>

                            <div className="pedit-field">
                                <label className="pedit-label">
                                    Notes <span className="pedit-label-hint">(optional)</span>
                                </label>
                                <textarea
                                    className="pedit-textarea"
                                    value={notes}
                                    onChange={(e) => setNotes(e.target.value)}
                                    placeholder="Describe the strategy or goal of this portfolio…"
                                    maxLength={500}
                                    rows={3}
                                />
                            </div>
                        </div>
                    </section>

                    {/* ── Section: Holdings ── */}
                    <section className="pedit-section">
                        <div className="pedit-section-header">
                            <span className="pedit-section-label">Holdings</span>
                            <div className="pedit-section-line" />
                        </div>

                        <div className="pedit-fields">
                            <div className="pedit-field">
                                <label className="pedit-label">Search &amp; add a holding</label>
                                <InstrumentSearch
                                    onSelect={addHolding}
                                    placeholder="Search mutual funds, ETFs, indices…"
                                />
                            </div>

                            {visibleHoldings.length > 0 ? (
                                <div className="pedit-holdings-list">
                                    {visibleHoldings.map((h) => {
                                        const key = h.id ?? h.tempId;
                                        return (
                                            <div key={key} className="pedit-holding-row">
                                                <span className={`instrument-type-badge ${h.instrument_type}`}>
                                                    {TYPE_LABELS[h.instrument_type] || 'INV'}
                                                </span>
                                                <div className="pedit-holding-info">
                                                    <span className="pedit-holding-name">{h.instrument_name}</span>
                                                    {h.exchange && (
                                                        <span className="pedit-holding-exchange">{h.exchange}</span>
                                                    )}
                                                </div>
                                                <div className="pedit-alloc-wrap">
                                                    <input
                                                        className="pedit-alloc-input"
                                                        type="number"
                                                        value={h.allocation_pct}
                                                        onChange={(e) => updateAlloc(key, e.target.value)}
                                                        placeholder="0"
                                                        min={0.1}
                                                        max={100}
                                                        step={0.1}
                                                    />
                                                    <span className="pedit-alloc-suffix">%</span>
                                                </div>
                                                <button
                                                    className="pedit-remove-btn"
                                                    onClick={() => markDelete(key)}
                                                    title="Remove holding"
                                                >×</button>
                                            </div>
                                        );
                                    })}
                                </div>
                            ) : (
                                <div className="pedit-empty-holdings">
                                    No holdings yet — search above to add your first.
                                </div>
                            )}

                            {/* Allocation bar */}
                            {visibleHoldings.length > 0 && (
                                <div className="pedit-alloc-bar-section">
                                    <div className="pedit-alloc-bar-header">
                                        <span>Allocated</span>
                                        <span className={`pedit-alloc-total${isOver ? ' over' : ''}`}>
                                            {totalAllocated.toFixed(1)}%
                                            {isOver && ' — over 100%'}
                                            {!isOver && totalAllocated < 100 && (
                                                <span className="pedit-alloc-free">
                                                    {' '}· {(100 - totalAllocated).toFixed(1)}% cash
                                                </span>
                                            )}
                                        </span>
                                    </div>
                                    <div className="pedit-alloc-track">
                                        <div
                                            className={`pedit-alloc-fill${isOver ? ' over' : ''}`}
                                            style={{ width: `${Math.min(totalAllocated, 100)}%` }}
                                        />
                                    </div>
                                </div>
                            )}
                        </div>
                    </section>

                </div>
            </div>
        </div>
    );
}
