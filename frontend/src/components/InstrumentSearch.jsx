import { useState, useEffect, useRef } from 'react';
import { fetchWithAuth } from '../api';

const TYPE_LABELS = {
    mutual_fund:  'MF',
    equity:       'EQ',
    etf:          'ETF',
    index:        'IDX',
    gold:         'GOLD',
    bond:         'BOND',
    fixed_return: 'FD',
};

export default function InstrumentSearch({
    onSelect,
    placeholder = 'Search funds, stocks, ETFs…',
    autoFocus = false,
}) {
    const [query,       setQuery]       = useState('');
    const [results,     setResults]     = useState([]);
    const [open,        setOpen]        = useState(false);
    const [searching,   setSearching]   = useState(false);
    const [searched,    setSearched]    = useState(false); // true after at least one search
    const [showCustom,  setShowCustom]  = useState(false);
    const [customName,  setCustomName]  = useState('');
    const [customRate,  setCustomRate]  = useState('');
    const [savingCust,  setSavingCust]  = useState(false);
    const [customErr,   setCustomErr]   = useState(null);

    const debounceRef = useRef(null);
    const wrapRef     = useRef(null);

    useEffect(() => {
        function handleClick(e) {
            if (wrapRef.current && !wrapRef.current.contains(e.target)) {
                setOpen(false);
                setShowCustom(false);
            }
        }
        document.addEventListener('mousedown', handleClick);
        return () => document.removeEventListener('mousedown', handleClick);
    }, []);

    useEffect(() => {
        if (debounceRef.current) clearTimeout(debounceRef.current);
        if (!query.trim()) {
            setResults([]);
            setOpen(false);
            setSearched(false);
            return;
        }
        debounceRef.current = setTimeout(async () => {
            setSearching(true);
            try {
                const data = await fetchWithAuth(`/instruments/search?q=${encodeURIComponent(query)}`);
                setResults(data);
                setSearched(true);
                setOpen(true);
            } catch {
                setResults([]);
            } finally {
                setSearching(false);
            }
        }, 300);
    }, [query]);

    function handleSelect(inst) {
        onSelect(inst);
        setQuery('');
        setResults([]);
        setOpen(false);
        setShowCustom(false);
    }

    function openCustomForm() {
        setShowCustom(true);
        setCustomName(query.trim());
        setCustomRate('');
        setCustomErr(null);
    }

    async function saveCustom() {
        const rate = parseFloat(customRate);
        if (!customName.trim()) { setCustomErr('Name is required.'); return; }
        if (isNaN(rate) || rate <= 0 || rate > 100) { setCustomErr('Enter a valid annual return % (e.g. 12).'); return; }

        setSavingCust(true);
        setCustomErr(null);
        try {
            const inst = await fetchWithAuth('/instruments/custom', {
                method: 'POST',
                body: JSON.stringify({ name: customName.trim(), annual_return_pct: rate }),
            });
            handleSelect(inst);
        } catch (err) {
            setCustomErr(err.message || 'Failed to create custom instrument.');
        } finally {
            setSavingCust(false);
        }
    }

    const showNoResults = open && searched && results.length === 0 && query.trim().length >= 2;

    return (
        <div className="instrument-search-wrap" ref={wrapRef}>
            <input
                className="instrument-search-input"
                placeholder={searching ? 'Searching…' : placeholder}
                value={query}
                onChange={(e) => { setQuery(e.target.value); setShowCustom(false); }}
                onFocus={() => (results.length > 0 || showNoResults) && setOpen(true)}
                autoFocus={autoFocus}
            />
            {open && !showCustom && (
                <div className="instrument-dropdown">
                    {results.length > 0 ? (
                        results.map((inst) => (
                            <div
                                key={inst.id}
                                className="instrument-dropdown-item"
                                onMouseDown={() => handleSelect(inst)}
                            >
                                <span className={`instrument-type-badge ${inst.instrument_type}`}>
                                    {TYPE_LABELS[inst.instrument_type] || inst.instrument_type}
                                </span>
                                <div className="instrument-dropdown-info">
                                    <span className="instrument-dropdown-name">{inst.name}</span>
                                    {inst.first_date && (
                                        <span className="instrument-dropdown-since">
                                            Active from {inst.first_date.slice(0, 7)}
                                        </span>
                                    )}
                                </div>
                                {inst.exchange && (
                                    <span className="instrument-dropdown-exchange">{inst.exchange}</span>
                                )}
                            </div>
                        ))
                    ) : (
                        <div className="instrument-dropdown-noresults">
                            <div className="instrument-dropdown-empty">No match for "{query}"</div>
                            <div
                                className="instrument-custom-entry-btn"
                                onMouseDown={(e) => { e.preventDefault(); openCustomForm(); }}
                            >
                                + Add "{query}" as custom fixed-return instrument
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* Inline custom instrument form */}
            {showCustom && (
                <div className="instrument-custom-form">
                    <div className="instrument-custom-form-title">Add custom instrument</div>
                    <div className="instrument-custom-form-row">
                        <input
                            className="instrument-custom-form-input"
                            placeholder="Name"
                            value={customName}
                            onChange={(e) => setCustomName(e.target.value)}
                            autoFocus
                        />
                    </div>
                    <div className="instrument-custom-form-row instrument-custom-form-row--rate">
                        <input
                            className="instrument-custom-form-input instrument-custom-form-input--short"
                            type="number"
                            placeholder="12"
                            value={customRate}
                            min={0.1}
                            max={100}
                            step={0.1}
                            onChange={(e) => setCustomRate(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && saveCustom()}
                        />
                        <span className="instrument-custom-rate-label">% expected annual return</span>
                    </div>
                    {customErr && <div className="instrument-custom-err">{customErr}</div>}
                    <div className="instrument-custom-form-actions">
                        <button
                            className="btn-primary btn-sm"
                            onMouseDown={(e) => { e.preventDefault(); saveCustom(); }}
                            disabled={savingCust}
                        >
                            {savingCust ? 'Adding…' : 'Add Instrument'}
                        </button>
                        <button
                            className="btn-ghost btn-sm"
                            onMouseDown={(e) => { e.preventDefault(); setShowCustom(false); }}
                        >
                            Cancel
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
