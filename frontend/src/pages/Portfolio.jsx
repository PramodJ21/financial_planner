import { useEffect, useState, useCallback, useRef, memo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    PieChart, Pie, Cell, Tooltip, ResponsiveContainer,
    LineChart, Line, XAxis, YAxis, CartesianGrid, ReferenceLine,
    BarChart, Bar,
    AreaChart, Area,
} from 'recharts';
import { fetchWithAuth } from '../api';
import usePortfolioStore from '../store/portfolioStore';
import InstrumentSearch from '../components/InstrumentSearch';
import '../styles/portfolio.css';

const GROUP_COLORS = [
    '#C4703A', '#2D5A3D', '#4A6FA5', '#92400E', '#6B4C8A',
    '#1A6B5A', '#0369A1', '#D97706', '#DC2626', '#059669',
];

const PIE_COLORS = [
    '#C4703A', '#2D5A3D', '#4A6FA5', '#92400E', '#6B4C8A',
    '#1A6B5A', '#B45309', '#7C3AED', '#DC2626', '#0369A1',
    '#D97706', '#059669', '#9333EA', '#0891B2', '#E11D48',
];

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
    if (!val) return '—';
    const n = parseFloat(val);
    if (n >= 1e7) return `₹${(n / 1e7).toFixed(2)} Cr`;
    if (n >= 1e5) return `₹${(n / 1e5).toFixed(2)} L`;
    return `₹${n.toLocaleString('en-IN')}`;
}

// ── Allocation Pie Chart ──────────────────────────────────────────────────────
function AllocationPieChart({ holdings, principal }) {
    if (!holdings || holdings.length === 0) {
        return (
            <div style={{ textAlign: 'center', color: 'var(--ink-soft)', padding: '32px 0', fontSize: 13 }}>
                No holdings yet. Add holdings to see your allocation.
            </div>
        );
    }

    const totalAllocated = holdings.reduce((s, h) => s + parseFloat(h.allocation_pct), 0);
    const cashPct = Math.max(0, 100 - totalAllocated);

    const chartData = holdings.map((h) => ({
        name: h.instrument_name,
        value: parseFloat(h.allocation_pct),
    }));
    if (cashPct > 0.01) chartData.push({ name: 'Cash (Unallocated)', value: cashPct });

    return (
        <div className="allocation-chart-wrap">
            <div className="results-section-label">Allocation Breakdown</div>
            <div className="allocation-chart-inner">
                <ResponsiveContainer width={200} height={200}>
                    <PieChart>
                        <Pie
                            data={chartData}
                            cx="50%"
                            cy="50%"
                            innerRadius={54}
                            outerRadius={90}
                            paddingAngle={2}
                            dataKey="value"
                        >
                            {chartData.map((_, i) => (
                                <Cell
                                    key={i}
                                    fill={i === chartData.length - 1 && cashPct > 0.01
                                        ? 'var(--ink-ghost)'
                                        : PIE_COLORS[i % PIE_COLORS.length]}
                                />
                            ))}
                        </Pie>
                        <Tooltip
                            formatter={(val) => [`${parseFloat(val).toFixed(1)}%`, '']}
                            contentStyle={{
                                background: 'var(--paper-raised)',
                                border: '0.5px solid var(--ink-ghost)',
                                fontSize: 12,
                                fontFamily: 'var(--font-ui)',
                            }}
                        />
                    </PieChart>
                </ResponsiveContainer>

                <div className="allocation-legend">
                    {chartData.map((item, i) => (
                        <div key={i} className="allocation-legend-item">
                            <span
                                className="allocation-legend-dot"
                                style={{
                                    background: i === chartData.length - 1 && cashPct > 0.01
                                        ? 'var(--ink-ghost)'
                                        : PIE_COLORS[i % PIE_COLORS.length]
                                }}
                            />
                            <span className="allocation-legend-name">{item.name}</span>
                            <span className="allocation-legend-pct">{item.value.toFixed(1)}%</span>
                        </div>
                    ))}
                </div>
            </div>

            {cashPct > 0.5 && (
                <div className="allocation-cash-notice" style={{ marginTop: 20 }}>
                    {cashPct.toFixed(1)}% of your corpus ({formatInr(principal * cashPct / 100)}) is unallocated
                    and will be treated as cash in the backtest.
                </div>
            )}
        </div>
    );
}

// ── Holdings Explorer ─────────────────────────────────────────────────────────
function HoldingsExplorer({ portfolio, portfolioId, focusedNode, onFocus, expandedGroups, onToggleGroup, onRefresh }) {
    const [search, setSearch] = useState('');
    const [openPickerId, setOpenPickerId] = useState(null);
    const [showNewGroup, setShowNewGroup] = useState(false);
    const [newGroupName, setNewGroupName] = useState('');
    const [newGroupColor, setNewGroupColor] = useState(GROUP_COLORS[0]);
    const [saving, setSaving] = useState(false);
    const [dragOverTarget, setDragOverTarget] = useState(null);
    const pickerRef = useRef(null);

    const { holdings = [], groups = [] } = portfolio;

    // Close picker on outside click
    useEffect(() => {
        function handler(e) {
            if (pickerRef.current && !pickerRef.current.contains(e.target)) {
                setOpenPickerId(null);
            }
        }
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, []);

    const filteredHoldings = search.trim()
        ? holdings.filter((h) =>
            h.instrument_name.toLowerCase().includes(search.toLowerCase()) ||
            h.ticker?.toLowerCase().includes(search.toLowerCase())
        )
        : holdings;

    const totalAllocated = holdings.reduce((s, h) => s + parseFloat(h.allocation_pct), 0);
    const isOver = totalAllocated > 100;

    const holdingsByGroup = {};
    const ungrouped = [];
    filteredHoldings.forEach((h) => {
        if (h.group_id) {
            (holdingsByGroup[h.group_id] = holdingsByGroup[h.group_id] || []).push(h);
        } else {
            ungrouped.push(h);
        }
    });

    const topLevelGroups = groups.filter((g) => !g.parent_group_id);

    // Move a holding to a group (or ungroup it)
    async function moveToGroup(holding, groupId) {
        setOpenPickerId(null);
        if (holding.group_id === groupId) return; // already there
        try {
            await fetchWithAuth(`/portfolios/${portfolioId}/holdings/${holding.id}`, {
                method: 'PUT',
                body: JSON.stringify({ group_id: groupId || null }),
            });
            onRefresh();
        } catch (err) {
            console.error('Move holding failed:', err);
        }
    }

    // Create a new group
    async function createGroup() {
        if (!newGroupName.trim() || saving) return;
        setSaving(true);
        try {
            await fetchWithAuth(`/portfolios/${portfolioId}/groups`, {
                method: 'POST',
                body: JSON.stringify({ name: newGroupName.trim(), color: newGroupColor }),
            });
            setNewGroupName('');
            setNewGroupColor(GROUP_COLORS[(groups.length + 1) % GROUP_COLORS.length]);
            setShowNewGroup(false);
            onRefresh();
        } catch (err) {
            console.error('Create group failed:', err);
        } finally {
            setSaving(false);
        }
    }

    // Delete a group
    async function deleteGroup(groupId, e) {
        e.stopPropagation();
        try {
            await fetchWithAuth(`/portfolios/${portfolioId}/groups/${groupId}`, { method: 'DELETE' });
            onRefresh();
        } catch (err) {
            console.error('Delete group failed:', err);
        }
    }

    function renderHolding(h, indented = false) {
        const isFocused = focusedNode?.type === 'holding' && focusedNode.id === h.instrument_id;
        const pickerOpen = openPickerId === h.id;

        return (
            <div
                key={h.id}
                className={`explorer-holding${isFocused ? ' focused' : ''}`}
                style={indented ? { paddingLeft: 40 } : {}}
                onClick={() => onFocus({ type: 'holding', id: h.instrument_id })}
                draggable
                onDragStart={(e) => e.dataTransfer.setData('holdingId', String(h.id))}
                onDragEnd={() => setDragOverTarget(null)}
            >
                <span className="explorer-holding-type">
                    {TYPE_LABELS[h.instrument_type] || 'INV'}
                </span>
                <div className="explorer-holding-info">
                    <span className="explorer-holding-name">{h.instrument_name}</span>
                    {h.first_date && h.instrument_type !== 'fixed_return' && (
                        <span className="explorer-holding-since">Active from {h.first_date.slice(0, 7)}</span>
                    )}
                </div>
                <span className="explorer-holding-alloc">{parseFloat(h.allocation_pct).toFixed(1)}%</span>

                {/* Folder / move-to-group button */}
                <div style={{ position: 'relative' }} ref={pickerOpen ? pickerRef : null}>
                    <button
                        className="explorer-holding-move"
                        title="Move to group"
                        onClick={(e) => { e.stopPropagation(); setOpenPickerId(pickerOpen ? null : h.id); }}
                    >⌂</button>

                    {pickerOpen && (
                        <div className="group-picker">
                            <div
                                className={`group-picker-item${!h.group_id ? ' active' : ''}`}
                                onMouseDown={(e) => { e.stopPropagation(); moveToGroup(h, null); }}
                            >
                                <span className="group-picker-dot" style={{ background: 'var(--ink-ghost)' }} />
                                Ungrouped
                            </div>
                            {groups.map((g) => (
                                <div
                                    key={g.id}
                                    className={`group-picker-item${h.group_id === g.id ? ' active' : ''}`}
                                    onMouseDown={(e) => { e.stopPropagation(); moveToGroup(h, g.id); }}
                                >
                                    <span className="group-picker-dot" style={{ background: g.color || 'var(--accent)' }} />
                                    {g.name}
                                </div>
                            ))}
                            {groups.length === 0 && (
                                <div style={{ padding: '8px 12px', fontSize: 11, color: 'var(--ink-soft)' }}>
                                    No groups yet — create one below
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>
        );
    }

    function renderGroup(group) {
        const isExpanded = expandedGroups.has(group.id);
        const isFocused = focusedNode?.type === 'group' && focusedNode.id === group.id;
        const groupHoldings = holdingsByGroup[group.id] || [];
        const groupAlloc = groupHoldings.reduce((s, h) => s + parseFloat(h.allocation_pct), 0);
        const hasContent = groupHoldings.length > 0;

        const isDragTarget = dragOverTarget === group.id;

        return (
            <div key={group.id} className="explorer-group">
                <div
                    className={`explorer-group-header${isFocused ? ' focused' : ''}${isDragTarget ? ' drag-over' : ''}`}
                    onClick={() => {
                        onFocus({ type: 'group', id: group.id });
                        if (hasContent) onToggleGroup(group.id);
                    }}
                    onDragOver={(e) => { e.preventDefault(); setDragOverTarget(group.id); }}
                    onDragLeave={(e) => { if (!e.currentTarget.contains(e.relatedTarget)) setDragOverTarget(null); }}
                    onDrop={(e) => {
                        e.preventDefault();
                        setDragOverTarget(null);
                        const hid = Number(e.dataTransfer.getData('holdingId'));
                        const holding = holdings.find((h) => h.id === hid);
                        if (holding) moveToGroup(holding, group.id);
                    }}
                >
                    <span className="explorer-group-color" style={{ background: group.color || 'var(--accent)' }} />
                    <span className="explorer-group-name">{group.name}</span>
                    {groupAlloc > 0 && (
                        <span className="explorer-group-alloc">{groupAlloc.toFixed(1)}%</span>
                    )}
                    {hasContent && (
                        <span className={`explorer-chevron${isExpanded ? ' open' : ''}`}>›</span>
                    )}
                    <button
                        className="explorer-group-delete"
                        title="Delete group"
                        onClick={(e) => deleteGroup(group.id, e)}
                    >×</button>
                </div>
                {isExpanded && groupHoldings.map((h) => renderHolding(h, true))}
            </div>
        );
    }

    return (
        <div className="holdings-explorer">
            <div className="explorer-header">
                <div className="explorer-header-top">
                    <h3>Holdings</h3>
                    {!showNewGroup && (
                        <button className="explorer-new-group-btn" onClick={() => setShowNewGroup(true)}>
                            + Group
                        </button>
                    )}
                </div>

                {/* New group form */}
                {showNewGroup && (
                    <div className="explorer-new-group-form">
                        <div className="explorer-new-group-inputs">
                            <input
                                type="text"
                                placeholder="Group name…"
                                value={newGroupName}
                                onChange={(e) => setNewGroupName(e.target.value)}
                                onKeyDown={(e) => { if (e.key === 'Enter') createGroup(); if (e.key === 'Escape') { setShowNewGroup(false); setNewGroupName(''); } }}
                                autoFocus
                            />
                            <input
                                type="color"
                                className="explorer-color-swatch"
                                value={newGroupColor}
                                onChange={(e) => setNewGroupColor(e.target.value)}
                                title="Pick colour"
                            />
                        </div>
                        <div className="explorer-new-group-actions">
                            <button className="btn-primary btn-sm" onClick={createGroup} disabled={saving || !newGroupName.trim()}>
                                {saving ? '…' : 'Create'}
                            </button>
                            <button className="btn-ghost btn-sm" onClick={() => { setShowNewGroup(false); setNewGroupName(''); }}>
                                Cancel
                            </button>
                        </div>
                    </div>
                )}

                <input
                    className="explorer-search"
                    placeholder="Filter holdings…"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                />
            </div>

            <div className="explorer-tree">
                {topLevelGroups.length > 0 && (
                    <>
                        <div className="explorer-section-label">Groups</div>
                        {topLevelGroups.map(renderGroup)}
                    </>
                )}

                {/* Ungrouped zone — also a drop target */}
                <div
                    className={`explorer-ungrouped-zone${dragOverTarget === 'ungrouped' ? ' drag-over' : ''}`}
                    onDragOver={(e) => { e.preventDefault(); setDragOverTarget('ungrouped'); }}
                    onDragLeave={(e) => { if (!e.currentTarget.contains(e.relatedTarget)) setDragOverTarget(null); }}
                    onDrop={(e) => {
                        e.preventDefault();
                        setDragOverTarget(null);
                        const hid = Number(e.dataTransfer.getData('holdingId'));
                        const holding = holdings.find((h) => h.id === hid);
                        if (holding) moveToGroup(holding, null);
                    }}
                >
                    {topLevelGroups.length > 0 && ungrouped.length > 0 && (
                        <div className="explorer-section-label" style={{ marginTop: 8 }}>Ungrouped</div>
                    )}
                    {ungrouped.map((h) => renderHolding(h, false))}
                    {filteredHoldings.length === 0 && (
                        <div style={{ padding: '24px 20px', textAlign: 'center', color: 'var(--ink-soft)', fontSize: 13 }}>
                            {search ? 'No holdings match.' : 'No holdings yet.'}
                        </div>
                    )}
                </div>
            </div>

            <div className="allocation-bar-wrap">
                <div className="allocation-bar-label">
                    <span>Allocated</span>
                    <strong style={{ color: isOver ? 'var(--red)' : 'var(--ink)' }}>
                        {totalAllocated.toFixed(1)}%
                    </strong>
                </div>
                <div className="allocation-bar-track">
                    <div
                        className={`allocation-bar-fill${isOver ? ' over' : ''}`}
                        style={{ width: `${Math.min(totalAllocated, 100)}%` }}
                    />
                </div>
            </div>
        </div>
    );
}

// ── Helpers ───────────────────────────────────────────────────────────────────

const TODAY_STR = new Date().toISOString().slice(0, 10);
const BENCHMARK_LABELS = { fd_7pct: 'FD 7%', fd_8pct: 'FD 8%', nifty50: 'Nifty 50' };

function dateYearsAgo(n) {
    const d = new Date();
    d.setFullYear(d.getFullYear() - n);
    return d.toISOString().slice(0, 10);
}

function MetricCard({ label, value, sub, accent = false, small = false }) {
    return (
        <div className={`metric-card${accent ? ' accent' : ''}`}>
            <div className="metric-card-label">{label}</div>
            <div className={`metric-card-value${small ? ' small' : ''}`}>{value ?? '—'}</div>
            {sub && <div className="metric-card-sub">{sub}</div>}
        </div>
    );
}

function sign(n) { return n > 0 ? '+' : ''; }

// Custom tooltip for the growth chart
function GrowthTooltip({ active, payload, label }) {
    if (!active || !payload?.length) return null;
    return (
        <div className="chart-tooltip">
            <div className="chart-tooltip-date">{label}</div>
            {payload.map((p) => (
                <div key={p.name} className="chart-tooltip-row">
                    <span style={{ color: p.color }}>●</span>
                    <span>{p.name}</span>
                    <strong>{formatInr(p.value)}</strong>
                </div>
            ))}
        </div>
    );
}

// ── Contribution Bar ─────────────────────────────────────────────────────────
function ContributionBar({ holdingsMetrics, focusedId, onFocus }) {
    if (!holdingsMetrics?.length) return null;
    const total = holdingsMetrics.reduce((s, h) => s + Math.abs(h.contribution_pct || 0), 0);
    if (total === 0) return null;
    return (
        <div className="results-chart-section">
            <div className="results-section-label">Who did the heavy lifting?</div>
            <div style={{ fontSize: 11, color: 'var(--ink-soft)', marginBottom: 8 }}>
                Each holding's contribution to total portfolio return (percentage points)
            </div>
            <div className="contribution-bar">
                {holdingsMetrics.map((h, i) => {
                    const w = total > 0 ? (Math.abs(h.contribution_pct || 0) / total) * 100 : 0;
                    const isPos = (h.contribution_pct || 0) >= 0;
                    const isFocused = focusedId === h.instrument_id;
                    return (
                        <div
                            key={h.instrument_id}
                            className={`contribution-segment${isFocused ? ' focused' : ''}`}
                            style={{
                                width: `${w}%`,
                                background: isPos ? PIE_COLORS[i % PIE_COLORS.length] : 'var(--red, #dc2626)',
                                opacity: isFocused ? 1 : 0.82,
                            }}
                            title={`${h.name}: ${h.contribution_pct > 0 ? '+' : ''}${h.contribution_pct}ppt`}
                            onClick={() => onFocus && onFocus(h.instrument_id)}
                        />
                    );
                })}
            </div>
            <div className="contribution-legend">
                {holdingsMetrics.map((h, i) => (
                    <div
                        key={h.instrument_id}
                        className={`contribution-legend-item${focusedId === h.instrument_id ? ' focused' : ''}`}
                        onClick={() => onFocus && onFocus(h.instrument_id)}
                    >
                        <span className="contribution-dot" style={{ background: (h.contribution_pct || 0) >= 0 ? PIE_COLORS[i % PIE_COLORS.length] : 'var(--red, #dc2626)' }} />
                        <span className="contribution-name">{h.name}</span>
                        <span className="contribution-val" style={{ color: (h.contribution_pct || 0) >= 0 ? 'var(--green, #059669)' : 'var(--red, #dc2626)' }}>
                            {(h.contribution_pct || 0) > 0 ? '+' : ''}{h.contribution_pct}ppt
                        </span>
                    </div>
                ))}
            </div>
        </div>
    );
}

// ── Rolling Returns Chart ────────────────────────────────────────────────────
function RollingReturnsChart({ data }) {
    if (!data?.length) return null;
    return (
        <div className="results-chart-section">
            <div className="results-section-label">Rolling 1-Year Return</div>
            <div style={{ fontSize: 11, color: 'var(--ink-soft)', marginBottom: 6 }}>
                12-month trailing return at each point in time
            </div>
            <ResponsiveContainer width="100%" height={160}>
                <AreaChart data={data} margin={{ top: 4, right: 16, left: 0, bottom: 0 }}>
                    <defs>
                        <linearGradient id="rollingGradPos" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="var(--green, #059669)" stopOpacity={0.25} />
                            <stop offset="95%" stopColor="var(--green, #059669)" stopOpacity={0.02} />
                        </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--ink-ghost)" />
                    <XAxis dataKey="date" tick={{ fontSize: 10, fontFamily: 'var(--font-ui)', fill: 'var(--ink-soft)' }}
                        tickLine={false} interval={Math.max(1, Math.floor(data.length / 8) - 1)} />
                    <YAxis tickFormatter={(v) => `${v}%`}
                        tick={{ fontSize: 10, fontFamily: 'var(--font-ui)', fill: 'var(--ink-soft)' }}
                        tickLine={false} axisLine={false} width={44} />
                    <Tooltip formatter={(v) => [`${v}%`, '1Y Return']}
                        contentStyle={{ fontSize: 12, fontFamily: 'var(--font-ui)', background: 'var(--paper-raised)', border: '0.5px solid var(--ink-ghost)' }} />
                    <ReferenceLine y={0} stroke="var(--ink-soft)" strokeDasharray="4 2" />
                    <Area type="monotone" dataKey="return_1y"
                        stroke="var(--green, #059669)" strokeWidth={1.5}
                        fill="url(#rollingGradPos)" dot={false} />
                </AreaChart>
            </ResponsiveContainer>
        </div>
    );
}

// ── Correlation Matrix ───────────────────────────────────────────────────────
function CorrelationMatrix({ correlation }) {
    if (!correlation || correlation.labels.length < 2) return null;
    const { labels, matrix } = correlation;
    const ABBR_LEN = 14;
    function abbr(s) { return s.length > ABBR_LEN ? s.slice(0, ABBR_LEN) + '…' : s; }
    function cellColor(v) {
        if (v === null) return 'var(--paper)';
        if (v === 1) return 'color-mix(in srgb, var(--accent) 30%, var(--paper-raised))';
        const t = (v + 1) / 2; // 0 → -1, 0.5 → 0, 1 → +1
        if (t > 0.5) {
            const intensity = ((t - 0.5) * 2 * 40).toFixed(0);
            return `color-mix(in srgb, #059669 ${intensity}%, var(--paper-raised))`;
        } else {
            const intensity = ((0.5 - t) * 2 * 40).toFixed(0);
            return `color-mix(in srgb, #dc2626 ${intensity}%, var(--paper-raised))`;
        }
    }
    return (
        <div className="results-chart-section">
            <div className="results-section-label">Correlation Matrix</div>
            <div style={{ fontSize: 11, color: 'var(--ink-soft)', marginBottom: 8 }}>
                Daily log-return correlation between holdings. Green = positive, Red = negative.
            </div>
            <div className="corr-matrix-wrap">
                <table className="corr-matrix">
                    <thead>
                        <tr>
                            <th />
                            {labels.map((l, i) => <th key={i} title={l}>{abbr(l)}</th>)}
                        </tr>
                    </thead>
                    <tbody>
                        {matrix.map((row, i) => (
                            <tr key={i}>
                                <td className="corr-row-label" title={labels[i]}>{abbr(labels[i])}</td>
                                {row.map((v, j) => (
                                    <td key={j} className="corr-cell"
                                        style={{ background: cellColor(v) }}
                                        title={v !== null ? v.toFixed(3) : 'n/a'}
                                    >
                                        {v !== null ? v.toFixed(2) : '—'}
                                    </td>
                                ))}
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}

// ── Focused Holding Panel ────────────────────────────────────────────────────
function FocusedHoldingPanel({ holding, onClear }) {
    const [chartType, setChartType] = useState('value'); // 'value' | 'indexed'
    if (!holding) return null;

    const series = holding.series || [];
    const chartData = series.map((pt) => ({
        date: pt.date.slice(0, 7),
        value: chartType === 'indexed'
            ? (series[0]?.value > 0 ? +(pt.value / series[0].value * 100).toFixed(2) : null)
            : pt.value,
    }));

    return (
        <div className="results-content">
            <div className="focused-node-breadcrumb" style={{ marginBottom: 16 }}>
                <button className="focused-node-back" onClick={onClear}>← All holdings</button>
                <span className="focused-node-sep">›</span>
                <span className="focused-node-current">{holding.name}</span>
                {holding.ticker && (
                    <span style={{ fontSize: 11, color: 'var(--ink-soft)', marginLeft: 4 }}>({holding.ticker})</span>
                )}
            </div>

            <div className="metrics-cards-row metrics-cards-row--3">
                <MetricCard label="Allocation" value={`${holding.allocation_pct?.toFixed(1)}%`} />
                <MetricCard label="Total Return"
                    value={holding.total_return !== null ? `${holding.total_return > 0 ? '+' : ''}${holding.total_return?.toFixed(1)}%` : '—'}
                    accent={holding.total_return > 0} />
                <MetricCard label="CAGR" value={holding.cagr !== null ? `${holding.cagr > 0 ? '+' : ''}${holding.cagr?.toFixed(1)}%` : '—'} />
            </div>
            <div className="metrics-cards-row metrics-cards-row--3" style={{ marginTop: 8 }}>
                <MetricCard label="Final Value" value={formatInr(holding.final_value)} />
                <MetricCard label="Max Drawdown" value={holding.max_drawdown != null ? `${holding.max_drawdown?.toFixed(1)}%` : '—'} />
                <MetricCard label="Contribution" value={holding.contribution_pct != null ? `${holding.contribution_pct > 0 ? '+' : ''}${holding.contribution_pct?.toFixed(2)}ppt` : '—'}
                    sub="Share of portfolio return" />
            </div>

            {chartData.length <= 1 && (
                <div style={{ padding: '24px 0', textAlign: 'center', color: 'var(--ink-soft)', fontSize: 12 }}>
                    Chart data not available — re-run the backtest to generate per-holding growth charts.
                </div>
            )}

            {chartData.length > 1 && (
                <div className="results-chart-section">
                    <div className="results-section-label" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <span>Performance Over Time</span>
                        <div className="view-toggle" style={{ marginLeft: 'auto' }}>
                            <button className={`view-toggle-btn${chartType === 'value' ? ' active' : ''}`} onClick={() => setChartType('value')}>₹ Value</button>
                            <button className={`view-toggle-btn${chartType === 'indexed' ? ' active' : ''}`} onClick={() => setChartType('indexed')}>Indexed (100)</button>
                        </div>
                    </div>
                    <ResponsiveContainer width="100%" height={220}>
                        <LineChart data={chartData} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="var(--ink-ghost)" />
                            <XAxis dataKey="date"
                                tick={{ fontSize: 10, fontFamily: 'var(--font-ui)', fill: 'var(--ink-soft)' }}
                                tickLine={false}
                                interval={Math.max(1, Math.floor(chartData.length / 8) - 1)}
                            />
                            <YAxis
                                tickFormatter={chartType === 'value' ? (v) => formatInr(v) : (v) => v}
                                tick={{ fontSize: 10, fontFamily: 'var(--font-ui)', fill: 'var(--ink-soft)' }}
                                tickLine={false} axisLine={false} width={chartType === 'value' ? 72 : 44}
                            />
                            <Tooltip
                                formatter={(v) => [chartType === 'value' ? formatInr(v) : `${v}`, chartType === 'value' ? 'Value' : 'Index']}
                                contentStyle={{ background: 'var(--paper-raised)', border: '0.5px solid var(--ink-ghost)', fontSize: 12, fontFamily: 'var(--font-ui)' }}
                            />
                            {chartType === 'indexed' && <ReferenceLine y={100} stroke="var(--ink-ghost)" strokeDasharray="4 2" />}
                            <Line type="monotone" dataKey="value"
                                stroke="var(--accent)" strokeWidth={2} dot={false} activeDot={{ r: 4 }} />
                        </LineChart>
                    </ResponsiveContainer>
                </div>
            )}
        </div>
    );
}

// ── Holdings Comparison Chart ─────────────────────────────────────────────────
function HoldingsComparisonChart({ holdingsMetrics, onFocus, focusedId }) {
    if (!holdingsMetrics?.length) return null;

    // Build unified date set
    const dateSet = new Set();
    for (const h of holdingsMetrics) (h.series || []).forEach((pt) => dateSet.add(pt.date.slice(0, 7)));
    const dates = [...dateSet].sort();

    const noSeriesData = dates.length < 2;

    if (noSeriesData) {
        return (
            <div style={{ padding: '32px 0', textAlign: 'center', color: 'var(--ink-soft)', fontSize: 13 }}>
                Per-holding chart data is not available for this run.
                <br />
                <span style={{ fontSize: 12 }}>Re-run the backtest to generate per-holding growth charts.</span>
            </div>
        );
    }

    // Use string keys for Recharts dataKey
    const key = (h) => `h_${h.instrument_id}`;

    // Normalize each holding to 100 at first available date
    const chartData = dates.map((date) => {
        const row = { date };
        for (const h of holdingsMetrics) {
            const pts = h.series || [];
            if (!pts.length) continue;
            const pt = pts.find((p) => p.date.slice(0, 7) === date);
            const first = pts[0];
            if (pt && first?.value > 0) row[key(h)] = +(pt.value / first.value * 100).toFixed(2);
        }
        return row;
    });

    return (
        <div className="results-chart-section">
            <div className="results-section-label" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span>Holdings vs Time — Indexed (base 100)</span>
                <span style={{ fontSize: 10, fontWeight: 400, textTransform: 'none', letterSpacing: 0, color: 'var(--ink-soft)' }}>
                    Click a line or legend to focus
                </span>
            </div>
            <ResponsiveContainer width="100%" height={240}>
                <LineChart data={chartData} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--ink-ghost)" />
                    <XAxis dataKey="date"
                        tick={{ fontSize: 10, fontFamily: 'var(--font-ui)', fill: 'var(--ink-soft)' }}
                        tickLine={false}
                        interval={Math.max(1, Math.floor(dates.length / 8) - 1)}
                    />
                    <YAxis
                        tickFormatter={(v) => v}
                        tick={{ fontSize: 10, fontFamily: 'var(--font-ui)', fill: 'var(--ink-soft)' }}
                        tickLine={false} axisLine={false} width={40}
                    />
                    <Tooltip
                        formatter={(v, name) => {
                            const h = holdingsMetrics.find((x) => key(x) === name);
                            return [v, h?.name || name];
                        }}
                        contentStyle={{ background: 'var(--paper-raised)', border: '0.5px solid var(--ink-ghost)', fontSize: 12, fontFamily: 'var(--font-ui)' }}
                    />
                    <ReferenceLine y={100} stroke="var(--ink-ghost)" strokeDasharray="4 2" />
                    {holdingsMetrics.map((h, i) => (
                        <Line
                            key={h.instrument_id}
                            type="monotone"
                            dataKey={key(h)}
                            stroke={PIE_COLORS[i % PIE_COLORS.length]}
                            strokeWidth={focusedId === h.instrument_id ? 2.5 : 1.5}
                            strokeOpacity={focusedId && focusedId !== h.instrument_id ? 0.3 : 1}
                            dot={false}
                            activeDot={{ r: 4, onClick: () => onFocus && onFocus(h.instrument_id) }}
                            connectNulls
                        />
                    ))}
                </LineChart>
            </ResponsiveContainer>
            <div className="contribution-legend" style={{ marginTop: 8 }}>
                {holdingsMetrics.map((h, i) => (
                    <div key={h.instrument_id}
                        className={`contribution-legend-item${focusedId === h.instrument_id ? ' focused' : ''}`}
                        onClick={() => onFocus && onFocus(focusedId === h.instrument_id ? null : h.instrument_id)}
                    >
                        <span className="contribution-dot" style={{ background: PIE_COLORS[i % PIE_COLORS.length] }} />
                        <span className="contribution-name">{h.name}</span>
                        <span className="contribution-val" style={{ color: (h.total_return || 0) >= 0 ? 'var(--green, #059669)' : 'var(--red, #dc2626)' }}>
                            {h.total_return != null ? `${h.total_return > 0 ? '+' : ''}${h.total_return}%` : '—'}
                        </span>
                    </div>
                ))}
            </div>
        </div>
    );
}

// ── Focused Group Panel ──────────────────────────────────────────────────────
function FocusedGroupPanel({ group, holdingsInGroup, onClear }) {
    if (!group) return null;
    return (
        <div className="results-content">
            <div className="focused-node-breadcrumb" style={{ marginBottom: 16 }}>
                <button className="focused-node-back" onClick={onClear}>← All holdings</button>
                <span className="focused-node-sep">›</span>
                <span className="focused-node-current">{group.name}</span>
            </div>
            <div className="metrics-cards-row metrics-cards-row--3">
                <MetricCard label="Group Allocation" value={`${group.allocation_pct?.toFixed(1)}%`} />
                <MetricCard label="Avg Return" value={group.avg_return !== null ? `${group.avg_return > 0 ? '+' : ''}${group.avg_return?.toFixed(1)}%` : '—'} />
                <MetricCard label="Avg CAGR" value={group.avg_cagr !== null ? `${group.avg_cagr > 0 ? '+' : ''}${group.avg_cagr?.toFixed(1)}%` : '—'} />
            </div>
            <div className="metrics-cards-row metrics-cards-row--3" style={{ marginTop: 8 }}>
                <MetricCard label="Holdings" value={group.holding_count} />
                <MetricCard label="Contribution" value={group.contribution_pct != null ? `${group.contribution_pct > 0 ? '+' : ''}${group.contribution_pct?.toFixed(2)}ppt` : '—'}
                    sub="Share of portfolio return" />
                <MetricCard label="" value="" />
            </div>
            {holdingsInGroup?.length > 0 && (
                <>
                    <HoldingsComparisonChart holdingsMetrics={holdingsInGroup} />
                    <div className="results-chart-section">
                        <div className="results-section-label">Holdings in this group</div>
                        <table className="holdings-metrics-table">
                            <thead>
                                <tr><th>Holding</th><th>Alloc %</th><th>Return</th><th>CAGR</th><th>Contribution</th></tr>
                            </thead>
                            <tbody>
                                {holdingsInGroup.map((h, i) => (
                                    <tr key={i}>
                                        <td><div style={{ fontWeight: 500, fontSize: 13 }}>{h.name}</div></td>
                                        <td>{h.allocation_pct?.toFixed(1)}%</td>
                                        <td style={{ color: h.total_return >= 0 ? 'var(--green, #059669)' : 'var(--red, #dc2626)' }}>
                                            {h.total_return !== null ? `${h.total_return > 0 ? '+' : ''}${h.total_return?.toFixed(1)}%` : '—'}
                                        </td>
                                        <td>{h.cagr !== null ? `${h.cagr > 0 ? '+' : ''}${h.cagr?.toFixed(1)}%` : '—'}</td>
                                        <td>{h.contribution_pct != null ? `${h.contribution_pct > 0 ? '+' : ''}${h.contribution_pct?.toFixed(2)}ppt` : '—'}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </>
            )}
        </div>
    );
}

// ── Backtest Config Form ──────────────────────────────────────────────────────

const FD_BENCHMARKS = [
    { value: 'fd_7pct', label: 'FD 7% p.a.' },
    { value: 'fd_8pct', label: 'FD 8% p.a.' },
];

// Suggested default instrument benchmark
const NIFTY50_SUGGESTION = { id: null, name: 'Nifty 50 Index Fund', ticker: 'UTI-N50-IDX', instrument_type: 'index' };

const STRATEGIES = [
    { value: 'none',                label: 'No Rebalancing',    desc: 'Buy and hold through the period' },
    { value: 'monthly',             label: 'Monthly',           desc: 'Rebalance on the 1st of each month' },
    { value: 'quarterly',           label: 'Quarterly',         desc: 'Rebalance each Jan, Apr, Jul, Oct' },
    { value: 'annually',            label: 'Annually',          desc: 'Rebalance once per year in January' },
    { value: 'threshold',           label: 'Threshold',         desc: 'Rebalance when any holding drifts beyond X%' },
    { value: 'threshold_calendar',  label: 'Hybrid',            desc: 'Monthly check; rebalance only when threshold breached' },
];

function BacktestConfigForm({ portfolioId, onResult, onCancel }) {
    const [fromDate,    setFromDate]    = useState(dateYearsAgo(5));
    const [toDate,      setToDate]      = useState(TODAY_STR);
    const [benchmark,           setBenchmark]           = useState('instrument');
    const [benchmarkInstrument, setBenchmarkInstrument] = useState(NIFTY50_SUGGESTION);
    const [strategy,    setStrategy]    = useState('none');
    const [threshold,   setThreshold]   = useState('5');
    const [txCost,      setTxCost]      = useState('0');
    const [slippage,    setSlippage]    = useState('0');
    const [riskFreeRate, setRiskFreeRate] = useState('6.5');
    const [showAdv,     setShowAdv]     = useState(false);
    const [loading,       setLoading]       = useState(false);
    const [loadingPhase,  setLoadingPhase]  = useState(null); // null | 'checking' | 'downloading' | 'running'
    const [downloadNames, setDownloadNames] = useState([]);   // instrument names being fetched
    const [error,         setError]         = useState(null);
    const [dataRange,     setDataRange]     = useState(null); // { first_date, last_date, missing, stale }
    const [benchCoverage, setBenchCoverage] = useState({ status: 'idle', first_date: null, last_date: null });

    const needsThreshold = strategy === 'threshold' || strategy === 'threshold_calendar';

    // When benchmark instrument changes, auto-fetch its data and show the date range
    useEffect(() => {
        if (benchmark !== 'instrument' || !benchmarkInstrument) {
            setBenchCoverage({ status: 'idle', first_date: null, last_date: null });
            return;
        }
        setBenchCoverage({ status: 'loading', first_date: null, last_date: null });

        let cancelled = false;
        (async () => {
            try {
                let inst = benchmarkInstrument;
                // NIFTY50_SUGGESTION has id=null — resolve to real DB row first
                if (!inst.id) {
                    const results = await fetchWithAuth(
                        `/instruments/search?q=${encodeURIComponent(inst.ticker || inst.name)}`
                    );
                    if (cancelled) return;
                    if (results.length > 0) {
                        inst = results[0];
                        setBenchmarkInstrument(inst); // update with real id for submission
                    }
                }
                if (!inst.id) { setBenchCoverage({ status: 'error', first_date: null, last_date: null }); return; }
                const cov = await fetchWithAuth(`/instruments/${inst.id}/coverage`);
                if (!cancelled) setBenchCoverage({ status: 'ready', first_date: cov.first_date, last_date: cov.last_date });
            } catch {
                if (!cancelled) setBenchCoverage({ status: 'error', first_date: null, last_date: null });
            }
        })();
        return () => { cancelled = true; };
    }, [benchmarkInstrument?.id ?? benchmarkInstrument?.name, benchmark]);

    useEffect(() => {
        fetchWithAuth(`/portfolios/${portfolioId}/data-range`)
            .then((r) => {
                setDataRange(r);
                // Auto-clip toDate if it exceeds last available date
                if (r.last_date && toDate > r.last_date) setToDate(r.last_date);
                if (r.first_date && fromDate < r.first_date) setFromDate(r.first_date);
            })
            .catch(() => {}); // non-fatal
    }, [portfolioId]); // eslint-disable-line react-hooks/exhaustive-deps

    const presets = [
        { label: '1Y', years: 1 }, { label: '3Y', years: 3 },
        { label: '5Y', years: 5 }, { label: '10Y', years: 10 },
    ];

    function isPreset(years) {
        return fromDate === dateYearsAgo(years) && toDate === (dataRange?.last_date || TODAY_STR);
    }

    function applyPreset(years) {
        const end = dataRange?.last_date || TODAY_STR;
        const endDate = new Date(end);
        endDate.setFullYear(endDate.getFullYear() - years);
        let start = endDate.toISOString().slice(0, 10);
        if (dataRange?.first_date && start < dataRange.first_date) start = dataRange.first_date;
        setFromDate(start);
        setToDate(end);
    }

    function presetDisabled(years) {
        if (!dataRange?.first_date || !dataRange?.last_date) return false;
        const end  = new Date(dataRange.last_date);
        const start = new Date(end);
        start.setFullYear(start.getFullYear() - years);
        return start >= end;
    }

    async function run() {
        setLoading(true);
        setError(null);
        setLoadingPhase('checking');
        setDownloadNames([]);
        try {
            // Pre-check: find instruments that need data downloaded
            const coverage = await fetchWithAuth(`/portfolios/${portfolioId}/data-range?to=${toDate}`);
            const needsFetch = [
                ...(coverage.missing || []),
                ...(coverage.stale   || []),
            ];
            if (needsFetch.length > 0) {
                setLoadingPhase('downloading');
                setDownloadNames(needsFetch.map((i) => i.name));
            } else {
                setLoadingPhase('running');
            }

            const body = {
                from_date: fromDate,
                to_date: toDate,
                benchmark,
                rebalance_strategy: strategy,
                transaction_cost_pct: parseFloat(txCost) || 0,
                slippage_pct: parseFloat(slippage) || 0,
                risk_free_rate: parseFloat(riskFreeRate) || 6.5,
            };
            if (benchmark === 'instrument' && benchmarkInstrument?.id) {
                body.benchmark_instrument_id = benchmarkInstrument.id;
            } else if (benchmark === 'instrument' && !benchmarkInstrument?.id) {
                // Nifty50 suggestion uses legacy key so backend resolves by ticker
                body.benchmark = 'nifty50';
            }
            if (needsThreshold) body.rebalance_threshold_pct = parseFloat(threshold) || 5;
            const result = await fetchWithAuth(`/portfolios/${portfolioId}/backtest`, {
                method: 'POST',
                body: JSON.stringify(body),
            });
            onResult(result);
        } catch (err) {
            setError(err.message || 'Backtest failed.');
        } finally {
            setLoading(false);
            setLoadingPhase(null);
            setDownloadNames([]);
        }
    }

    return (
        <div className="bt-config-form">
            <div className="bt-config-title">Configure Backtest</div>

            {/* Data coverage banner */}
            {dataRange && !dataRange.all_fixed_return && (
                <div className={`bt-data-range-banner${dataRange.missing?.length > 0 ? ' warn' : ''}`}>
                    {dataRange.missing?.length > 0 ? (
                        <>
                            <span className="bt-data-range-icon">⚠</span>
                            <span>
                                No price data for: {dataRange.missing.slice(0, 2).map((m) => m.name).join(', ')}
                                {dataRange.missing.length > 2 ? ` +${dataRange.missing.length - 2} more` : ''}.
                                Run data fetcher first.
                            </span>
                        </>
                    ) : (
                        <>
                            <span className="bt-data-range-icon">📅</span>
                            <span>
                                Data available: <strong>{dataRange.first_date?.slice(0, 7)}</strong>
                                {' → '}
                                <strong>{dataRange.last_date?.slice(0, 7)}</strong>
                                {' · Presets auto-adjusted to this range'}
                            </span>
                        </>
                    )}
                </div>
            )}

            {/* Per-instrument data range */}
            {dataRange?.instruments?.length > 0 && !dataRange.all_fixed_return && (
                <div className="bt-instrument-coverage">
                    {dataRange.instruments
                        .filter((inst) => inst.type !== 'fixed_return')
                        .map((inst) => (
                            <div key={inst.id} className="bt-instrument-coverage-row">
                                <span className="bt-inst-name">{inst.name}</span>
                                <span className="bt-inst-range">
                                    {inst.first_date
                                        ? <>{inst.first_date.slice(0, 7)} → {inst.last_date?.slice(0, 7) || '—'}</>
                                        : <span className="bt-inst-nodata">No data</span>
                                    }
                                </span>
                            </div>
                        ))
                    }
                </div>
            )}

            <div className="bt-config-row">
                <span className="bt-config-label">Period</span>
                <div className="bt-config-presets">
                    {presets.map((p) => (
                        <button
                            key={p.label}
                            className={`pnew-preset-btn${isPreset(p.years) ? ' active' : ''}`}
                            disabled={presetDisabled(p.years)}
                            onClick={() => applyPreset(p.years)}
                        >{p.label}</button>
                    ))}
                </div>
                <div className="bt-config-dates">
                    <input type="date" className="pnew-input" value={fromDate}
                        min={dataRange?.first_date || undefined}
                        max={toDate}
                        onChange={(e) => setFromDate(e.target.value)} />
                    <span style={{ color: 'var(--ink-soft)' }}>→</span>
                    <input type="date" className="pnew-input" value={toDate}
                        min={fromDate}
                        max={dataRange?.last_date || TODAY_STR}
                        onChange={(e) => setToDate(e.target.value)} />
                </div>
            </div>

            <div className="bt-config-row">
                <span className="bt-config-label">Benchmark</span>
                <div className="bt-benchmark-section">
                    {/* Fixed-return options */}
                    <div className="bt-benchmark-pills">
                        {FD_BENCHMARKS.map((b) => (
                            <button key={b.value}
                                className={`bt-benchmark-pill${benchmark === b.value ? ' active' : ''}`}
                                onClick={() => setBenchmark(b.value)}
                            >{b.label}</button>
                        ))}
                        <button
                            className={`bt-benchmark-pill${benchmark === 'instrument' ? ' active' : ''}`}
                            onClick={() => setBenchmark('instrument')}
                        >Index / Fund</button>
                    </div>

                    {/* Instrument benchmark selector */}
                    {benchmark === 'instrument' && (
                        <div className="bt-benchmark-instrument">
                            {benchmarkInstrument ? (
                                <div className="bt-bench-selected">
                                    <span className={`instrument-type-badge ${benchmarkInstrument.instrument_type}`}>
                                        {TYPE_LABELS[benchmarkInstrument.instrument_type] || 'IDX'}
                                    </span>
                                    <div className="bt-bench-info">
                                        <span className="bt-bench-name">{benchmarkInstrument.name}</span>
                                        {benchCoverage.status === 'loading' && (
                                            <span className="pnew-holding-coverage loading">
                                                <span className="pnew-coverage-spinner" /> Downloading data…
                                            </span>
                                        )}
                                        {benchCoverage.status === 'ready' && benchCoverage.first_date && (
                                            <span className="pnew-holding-coverage">
                                                Active from {benchCoverage.first_date.slice(0, 7)}
                                            </span>
                                        )}
                                        {benchCoverage.status === 'error' && (
                                            <span className="pnew-holding-coverage error">Could not fetch data</span>
                                        )}
                                    </div>
                                    <button
                                        className="bt-bench-clear"
                                        onClick={() => { setBenchmarkInstrument(null); setBenchCoverage({ status: 'idle', first_date: null, last_date: null }); }}
                                        title="Change benchmark"
                                    >✕</button>
                                </div>
                            ) : (
                                <div className="bt-bench-search">
                                    <InstrumentSearch
                                        placeholder="Search index, fund, or stock…"
                                        onSelect={(inst) => setBenchmarkInstrument(inst)}
                                    />
                                    <button
                                        className="bt-bench-suggest-btn"
                                        onClick={() => setBenchmarkInstrument(NIFTY50_SUGGESTION)}
                                    >
                                        Use Nifty 50 (suggested)
                                    </button>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>

            <div className="bt-config-row">
                <span className="bt-config-label">Rebalancing</span>
                <div className="bt-strategy-grid">
                    {STRATEGIES.map((s) => (
                        <button key={s.value}
                            className={`bt-strategy-card${strategy === s.value ? ' active' : ''}`}
                            onClick={() => setStrategy(s.value)}
                        >
                            <span className="bt-strategy-name">{s.label}</span>
                            <span className="bt-strategy-desc">{s.desc}</span>
                        </button>
                    ))}
                </div>

                {needsThreshold && (
                    <div className="bt-threshold-row">
                        <label className="bt-config-label" style={{ fontSize: 11 }}>
                            Drift threshold
                        </label>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                            <input
                                type="number"
                                className="pnew-input"
                                style={{ width: 72 }}
                                value={threshold}
                                min={0.5} max={50} step={0.5}
                                onChange={(e) => setThreshold(e.target.value)}
                            />
                            <span style={{ fontSize: 13, color: 'var(--ink-soft)' }}>% from target triggers rebalance</span>
                        </div>
                    </div>
                )}
            </div>

            <div className="bt-adv-toggle" onClick={() => setShowAdv((v) => !v)}>
                {showAdv ? '▾' : '▸'} Advanced Options
            </div>
            {showAdv && (
                <div className="bt-adv-body">
                    <label className="bt-config-label" style={{ fontSize: 11 }}>Transaction cost per rebalance</label>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <input
                            type="number"
                            className="pnew-input"
                            style={{ width: 72 }}
                            value={txCost}
                            min={0} max={5} step={0.01}
                            onChange={(e) => setTxCost(e.target.value)}
                        />
                        <span style={{ fontSize: 13, color: 'var(--ink-soft)' }}>% of traded amount (0 = no cost)</span>
                    </div>

                    <label className="bt-config-label" style={{ fontSize: 11, marginTop: 10 }}>Slippage</label>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <input
                            type="number"
                            className="pnew-input"
                            style={{ width: 72 }}
                            value={slippage}
                            min={0} max={5} step={0.01}
                            onChange={(e) => setSlippage(e.target.value)}
                        />
                        <span style={{ fontSize: 13, color: 'var(--ink-soft)' }}>% price impact per rebalance trade (0 = no slippage)</span>
                    </div>

                    <label className="bt-config-label" style={{ fontSize: 11, marginTop: 10 }}>Risk-free rate</label>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <input
                            type="number"
                            className="pnew-input"
                            style={{ width: 72 }}
                            value={riskFreeRate}
                            min={0} max={20} step={0.1}
                            onChange={(e) => setRiskFreeRate(e.target.value)}
                        />
                        <span style={{ fontSize: 13, color: 'var(--ink-soft)' }}>% p.a. used for Sharpe / Sortino / Alpha (default 6.5%)</span>
                    </div>
                </div>
            )}

            {error && <div className="portfolio-error" style={{ margin: '8px 0 0' }}>{error}</div>}

            <div className="bt-config-actions">
                <button className="btn-primary accent" onClick={run} disabled={loading}>
                    {loading
                        ? <><span className="btn-spinner" />{loadingPhase === 'checking' ? 'Checking data…' : loadingPhase === 'downloading' ? 'Downloading…' : 'Running backtest…'}</>
                        : 'Run Backtest →'}
                </button>
                {onCancel && <button className="btn-ghost btn-sm" onClick={onCancel}>Cancel</button>}
            </div>

            {loadingPhase === 'downloading' && downloadNames.length > 0 && (
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
    );
}

const STRATEGY_LABELS = {
    none:               'Buy & Hold',
    monthly:            'Monthly rebalancing',
    quarterly:          'Quarterly rebalancing',
    annually:           'Annual rebalancing',
    threshold:          'Threshold rebalancing',
    threshold_calendar: 'Hybrid rebalancing',
};

// ── Simple Results View ────────────────────────────────────────────────────────

function SimpleResults({ run, compareRun, focusedId, onFocus }) {
    const { metrics, series = [], config = {}, rebalancing_summary: rs, holdings_metrics = [] } = run;
    const benchLabel = BENCHMARK_LABELS[config.benchmark] || 'Benchmark';

    const chartData = series.map((pt) => ({
        date: pt.date.slice(0, 7),
        Portfolio: pt.portfolio,
        [benchLabel]: pt.benchmark,
        ...(compareRun ? { Compare: compareRun.series?.find((p) => p.date.slice(0, 7) === pt.date.slice(0, 7))?.portfolio ?? null } : {}),
    }));

    const yearlyData = metrics.yearly_returns || [];

    return (
        <div className="results-content">
            {/* Rebalancing impact callout */}
            {rs && rs.strategy !== 'none' && rs.count > 0 && (
                <div className="rebalancing-callout">
                    <span className="rebalancing-callout-icon">⟳</span>
                    <span>
                        <strong>{STRATEGY_LABELS[rs.strategy] || rs.strategy}</strong>
                        {' · '}{rs.count} rebalancing event{rs.count !== 1 ? 's' : ''}
                        {rs.total_cost_inr > 0 && (
                            <> · Transaction costs: <strong>{formatInr(rs.total_cost_inr)}</strong>
                            {' '}<span style={{ color: 'var(--ink-soft)', fontSize: 11 }}>
                                (without costs: {formatInr(rs.hypothetical_value_no_cost)} vs {formatInr(metrics.final_value)})
                            </span></>
                        )}
                    </span>
                </div>
            )}
            {rs && rs.strategy !== 'none' && rs.count === 0 && (
                <div className="rebalancing-callout rebalancing-callout--none">
                    <span className="rebalancing-callout-icon">⟳</span>
                    <span>{STRATEGY_LABELS[rs.strategy] || rs.strategy} — no rebalance events triggered in this period.</span>
                </div>
            )}

            {/* Contribution bar */}
            <ContributionBar holdingsMetrics={holdings_metrics} focusedId={focusedId} onFocus={onFocus} />

            {/* 4 summary cards */}
            <div className="metrics-cards-row">
                <MetricCard
                    label="Final Corpus"
                    value={formatInr(metrics.final_value)}
                    sub={`Started ${formatInr(metrics.initial_value)}`}
                    accent
                />
                <MetricCard
                    label="CAGR"
                    value={`${sign(metrics.cagr)}${metrics.cagr}%`}
                    sub={`${metrics.years}yr period`}
                />
                <MetricCard
                    label="Max Drawdown"
                    value={`${metrics.max_drawdown}%`}
                    sub="Peak-to-trough"
                />
                <MetricCard
                    label="vs Benchmark"
                    value={metrics.benchmark_cagr !== null
                        ? `${sign(metrics.cagr - metrics.benchmark_cagr)}${(metrics.cagr - metrics.benchmark_cagr).toFixed(2)}%`
                        : '—'}
                    sub={`Benchmark CAGR: ${metrics.benchmark_cagr ?? '—'}%`}
                />
            </div>

            {/* Compare summary */}
            {compareRun?.metrics && (
                <div className="compare-diff-row">
                    <span className="compare-diff-label">vs {STRATEGY_LABELS[compareRun.config?.rebalance_strategy] || 'Compare'}:</span>
                    {[
                        { label: 'CAGR',     a: metrics.cagr,         b: compareRun.metrics.cagr,         fmt: (v) => `${v}%` },
                        { label: 'Max DD',   a: metrics.max_drawdown,  b: compareRun.metrics.max_drawdown,  fmt: (v) => `${v}%` },
                        { label: 'Sharpe',   a: metrics.sharpe,        b: compareRun.metrics.sharpe,        fmt: (v) => `${v}` },
                        { label: 'Final',    a: metrics.final_value,   b: compareRun.metrics.final_value,   fmt: formatInr },
                    ].map(({ label, a, b, fmt }) => {
                        const diff  = a - b;
                        const color = diff > 0 ? 'var(--green, #059669)' : diff < 0 ? 'var(--red, #DC2626)' : 'var(--ink-soft)';
                        return (
                            <span key={label} className="compare-diff-chip">
                                {label}: <strong style={{ color }}>{diff > 0 ? '+' : ''}{fmt(+diff.toFixed(2))}</strong>
                            </span>
                        );
                    })}
                </div>
            )}

            {/* Growth chart */}
            {chartData.length > 1 && (
                <div className="results-chart-section">
                    <div className="results-section-label" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <span>Portfolio Growth</span>
                        <span style={{ fontSize: 10, fontWeight: 400, textTransform: 'none', letterSpacing: 0, color: 'var(--ink-soft)' }}>
                            NAV = total return (dividends reinvested, growth plan)
                        </span>
                    </div>
                    <ResponsiveContainer width="100%" height={220}>
                        <LineChart data={chartData} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="var(--ink-ghost)" />
                            <XAxis
                                dataKey="date"
                                tick={{ fontSize: 10, fontFamily: 'var(--font-ui)', fill: 'var(--ink-soft)' }}
                                tickLine={false}
                                interval={Math.max(1, Math.floor(chartData.length / 8) - 1)}
                            />
                            <YAxis
                                tickFormatter={(v) => formatInr(v)}
                                tick={{ fontSize: 10, fontFamily: 'var(--font-ui)', fill: 'var(--ink-soft)' }}
                                tickLine={false}
                                axisLine={false}
                                width={72}
                            />
                            <Tooltip content={<GrowthTooltip />} />
                            <Line type="monotone" dataKey="Portfolio"
                                stroke="var(--accent)" strokeWidth={2} dot={false} activeDot={{ r: 4 }} />
                            <Line type="monotone" dataKey={benchLabel}
                                stroke="var(--ink-soft)" strokeWidth={1.5} strokeDasharray="4 3" dot={false} />
                            {compareRun && (
                                <Line type="monotone" dataKey="Compare"
                                    stroke="var(--compare-color, #7C3AED)" strokeWidth={1.5}
                                    strokeDasharray="6 2" dot={false} connectNulls />
                            )}
                        </LineChart>
                    </ResponsiveContainer>
                    {compareRun && (
                        <div className="chart-legend-compare">
                            <span className="chart-legend-dot" style={{ background: 'var(--accent)' }} /> This run
                            <span className="chart-legend-dot" style={{ background: 'var(--compare-color, #7C3AED)', marginLeft: 12 }} />
                            {STRATEGY_LABELS[compareRun.config?.rebalance_strategy] || 'Compare'}
                        </div>
                    )}
                </div>
            )}

            {/* Year-by-year bar chart */}
            {yearlyData.length > 0 && (
                <div className="results-chart-section">
                    <div className="results-section-label">Year-by-Year Returns</div>
                    <ResponsiveContainer width="100%" height={180}>
                        <BarChart data={yearlyData} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}
                            barCategoryGap="25%">
                            <CartesianGrid strokeDasharray="3 3" stroke="var(--ink-ghost)" vertical={false} />
                            <XAxis
                                dataKey="year"
                                tick={{ fontSize: 10, fontFamily: 'var(--font-ui)', fill: 'var(--ink-soft)' }}
                                tickLine={false}
                            />
                            <YAxis
                                tickFormatter={(v) => `${v}%`}
                                tick={{ fontSize: 10, fontFamily: 'var(--font-ui)', fill: 'var(--ink-soft)' }}
                                tickLine={false}
                                axisLine={false}
                                width={44}
                            />
                            <Tooltip
                                formatter={(val, name) => [`${val?.toFixed(1)}%`, name]}
                                contentStyle={{ fontSize: 12, fontFamily: 'var(--font-ui)', background: 'var(--paper-raised)', border: '0.5px solid var(--ink-ghost)' }}
                            />
                            <ReferenceLine y={0} stroke="var(--ink-ghost)" />
                            <Bar dataKey="portfolio_return" name="Portfolio" fill="var(--accent)" radius={[2, 2, 0, 0]}>
                                {yearlyData.map((entry, i) => (
                                    <Cell key={i} fill={entry.portfolio_return >= 0 ? 'var(--accent)' : 'var(--red, #DC2626)'} />
                                ))}
                            </Bar>
                            <Bar dataKey="benchmark_return" name={benchLabel} fill="var(--ink-ghost)" radius={[2, 2, 0, 0]} />
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            )}
        </div>
    );
}

// ── Advanced Results View ─────────────────────────────────────────────────────

const ROWS_PER_PAGE = 20;

function RebalancingLog({ log }) {
    const [page, setPage] = useState(0);
    if (!log || log.length === 0) return null;

    const totalPages = Math.ceil(log.length / ROWS_PER_PAGE);
    const pageRows   = log.slice(page * ROWS_PER_PAGE, (page + 1) * ROWS_PER_PAGE);

    return (
        <div className="results-chart-section">
            <div className="results-section-label" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span>
                    Rebalancing Log
                    <span style={{ fontWeight: 400, textTransform: 'none', letterSpacing: 0, marginLeft: 8 }}>
                        ({log.length} event{log.length !== 1 ? 's' : ''})
                    </span>
                </span>
                <button
                    className="btn-ghost btn-sm"
                    style={{ fontSize: 11, padding: '2px 8px' }}
                    onClick={() => exportRebalancingLogCSV(log)}
                >
                    Export CSV
                </button>
            </div>
            <table className="holdings-metrics-table rebalancing-log-table">
                <thead>
                    <tr>
                        <th>Date</th>
                        <th>Trigger</th>
                        <th>Value After</th>
                        <th>Cost</th>
                        <th>Top Trades</th>
                    </tr>
                </thead>
                <tbody>
                    {pageRows.map((evt, i) => (
                        <tr key={i}>
                            <td style={{ fontFamily: 'var(--font-value)', fontSize: 12 }}>{evt.date}</td>
                            <td>
                                <span className={`rebalance-trigger-chip rebalance-trigger-chip--${evt.trigger}`}>
                                    {STRATEGY_LABELS[evt.trigger] || evt.trigger}
                                </span>
                            </td>
                            <td>{formatInr(evt.portfolio_value)}</td>
                            <td style={{ color: evt.cost_inr > 0 ? 'var(--red, #DC2626)' : 'var(--ink-soft)' }}>
                                {evt.cost_inr > 0 ? `−${formatInr(evt.cost_inr)}` : '—'}
                            </td>
                            <td style={{ fontSize: 11, color: 'var(--ink-soft)', maxWidth: 240 }}>
                                {evt.trades.slice(0, 2).map((t) => {
                                    const diff = t.new_value - t.old_value;
                                    return (
                                        <span key={t.name} style={{ marginRight: 8 }}>
                                            {t.name.split(' ')[0]}
                                            {' '}
                                            <span style={{ color: diff > 0 ? 'var(--green, #059669)' : 'var(--red, #DC2626)' }}>
                                                {diff > 0 ? '▲' : '▼'}
                                            </span>
                                        </span>
                                    );
                                })}
                                {evt.trades.length > 2 && <span>+{evt.trades.length - 2} more</span>}
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
            {totalPages > 1 && (
                <div className="rebalancing-log-pagination">
                    <button className="btn-ghost btn-sm" disabled={page === 0} onClick={() => setPage((p) => p - 1)}>← Prev</button>
                    <span style={{ fontSize: 12, color: 'var(--ink-soft)' }}>Page {page + 1} of {totalPages}</span>
                    <button className="btn-ghost btn-sm" disabled={page === totalPages - 1} onClick={() => setPage((p) => p + 1)}>Next →</button>
                </div>
            )}
        </div>
    );
}

function exportRebalancingLogCSV(log) {
    const headers = ['Date', 'Trigger', 'Portfolio Value (INR)', 'Cost (INR)', 'Trades'];
    const rows = log.map((evt) => [
        evt.date,
        evt.trigger,
        evt.portfolio_value,
        evt.cost_inr,
        evt.trades.map((t) => `${t.name}: ${t.old_value}→${t.new_value}`).join(' | '),
    ]);
    const csv = [headers, ...rows].map((r) => r.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href = url; a.download = 'rebalancing_log.csv'; a.click();
    URL.revokeObjectURL(url);
}

function AdvancedResults({ run, focusedId, onFocus }) {
    const { metrics, holdings_metrics = [], rebalancing_log = [], drawdown_series = [], rolling_returns, correlation } = run;
    const rfLabel = metrics.risk_free_rate != null ? `rf ${metrics.risk_free_rate}%` : 'rf 6.5%';

    return (
        <div className="results-content">
            <div className="metrics-cards-row metrics-cards-row--3">
                <MetricCard label="CAGR" value={`${sign(metrics.cagr)}${metrics.cagr}%`} />
                <MetricCard label="Sharpe Ratio" value={metrics.sharpe} sub={`Risk-adj. return (${rfLabel})`} />
                <MetricCard label="Max Drawdown" value={`${metrics.max_drawdown}%`} sub="Worst peak-to-trough" />
            </div>

            <div className="metrics-cards-row metrics-cards-row--3" style={{ marginTop: 8 }}>
                <MetricCard label="Volatility" value={`${metrics.volatility}%`} sub="Annualised std dev" />
                <MetricCard label="Sortino Ratio" value={metrics.sortino} sub="Downside-adj. return" />
                <MetricCard label="Calmar Ratio" value={metrics.calmar} sub="CAGR / Max DD" />
            </div>

            <div className="metrics-cards-row metrics-cards-row--3" style={{ marginTop: 8 }}>
                <MetricCard label="Alpha" value={metrics.alpha !== null ? `${sign(metrics.alpha)}${metrics.alpha}%` : '—'} sub="vs benchmark (CAPM)" />
                <MetricCard label="Beta" value={metrics.beta ?? '—'} sub="Market sensitivity" />
                <MetricCard label="VaR (95%)" value={metrics.var_95 !== null ? `${metrics.var_95}%` : '—'} sub="Worst daily return (5%ile)" />
            </div>

            {/* Underwater / Drawdown chart */}
            {drawdown_series.length > 1 && (
                <div className="results-chart-section">
                    <div className="results-section-label">Underwater Chart</div>
                    <div style={{ fontSize: 11, color: 'var(--ink-soft)', marginBottom: 6 }}>
                        How far below peak the portfolio was at each point in time
                    </div>
                    <ResponsiveContainer width="100%" height={160}>
                        <AreaChart data={drawdown_series} margin={{ top: 4, right: 16, left: 0, bottom: 0 }}>
                            <defs>
                                <linearGradient id="ddGrad" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="var(--red, #DC2626)" stopOpacity={0.3} />
                                    <stop offset="95%" stopColor="var(--red, #DC2626)" stopOpacity={0.02} />
                                </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" stroke="var(--ink-ghost)" />
                            <XAxis dataKey="date"
                                tick={{ fontSize: 10, fontFamily: 'var(--font-ui)', fill: 'var(--ink-soft)' }}
                                tickLine={false}
                                interval={Math.max(1, Math.floor(drawdown_series.length / 8) - 1)}
                            />
                            <YAxis
                                tickFormatter={(v) => `${v}%`}
                                tick={{ fontSize: 10, fontFamily: 'var(--font-ui)', fill: 'var(--ink-soft)' }}
                                tickLine={false} axisLine={false} width={44}
                            />
                            <Tooltip
                                formatter={(val) => [`${val}%`, 'Drawdown']}
                                contentStyle={{ fontSize: 12, fontFamily: 'var(--font-ui)', background: 'var(--paper-raised)', border: '0.5px solid var(--ink-ghost)' }}
                            />
                            <ReferenceLine y={0} stroke="var(--ink-ghost)" />
                            <Area type="monotone" dataKey="drawdown"
                                stroke="var(--red, #DC2626)" strokeWidth={1.5}
                                fill="url(#ddGrad)" dot={false} />
                        </AreaChart>
                    </ResponsiveContainer>
                </div>
            )}

            {holdings_metrics.length > 0 && (
                <div className="results-chart-section">
                    <div className="results-section-label">Holdings Breakdown</div>
                    <table className="holdings-metrics-table">
                        <thead>
                            <tr>
                                <th>Holding</th>
                                <th>Alloc %</th>
                                <th>Total Return</th>
                                <th>CAGR</th>
                                <th>Max DD</th>
                                <th>Contribution</th>
                            </tr>
                        </thead>
                        <tbody>
                            {holdings_metrics.map((h, i) => (
                                <tr
                                    key={i}
                                    className={focusedId === h.instrument_id ? 'holdings-row-focused' : ''}
                                    onClick={() => onFocus && onFocus(h.instrument_id === focusedId ? null : h.instrument_id)}
                                    style={{ cursor: 'pointer' }}
                                >
                                    <td>
                                        <div style={{ fontWeight: 500, fontSize: 13 }}>{h.name}</div>
                                        <div style={{ fontSize: 11, color: 'var(--ink-soft)' }}>{h.ticker}</div>
                                    </td>
                                    <td>{h.allocation_pct?.toFixed(1)}%</td>
                                    <td style={{ color: h.total_return >= 0 ? 'var(--green, #059669)' : 'var(--red, #DC2626)' }}>
                                        {h.total_return !== null ? `${sign(h.total_return)}${h.total_return?.toFixed(1)}%` : '—'}
                                    </td>
                                    <td>{h.cagr !== null ? `${sign(h.cagr)}${h.cagr?.toFixed(1)}%` : '—'}</td>
                                    <td style={{ color: 'var(--red, #DC2626)' }}>
                                        {h.max_drawdown !== undefined ? `${h.max_drawdown?.toFixed(1)}%` : '—'}
                                    </td>
                                    <td style={{ color: (h.contribution_pct || 0) >= 0 ? 'var(--green, #059669)' : 'var(--red, #DC2626)' }}>
                                        {h.contribution_pct != null ? `${h.contribution_pct > 0 ? '+' : ''}${h.contribution_pct?.toFixed(2)}ppt` : '—'}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            <RollingReturnsChart data={rolling_returns} />
            <CorrelationMatrix correlation={correlation} />

            <RebalancingLog log={rebalancing_log} />
        </div>
    );
}

// ── Results Panel ─────────────────────────────────────────────────────────────
function ResultsPanel({ portfolio, portfolioId, navigate, onPortfolioDeleted }) {
    const { holdings = [], name, principal, notes } = portfolio;
    const { focusedNode, setFocusedNode } = usePortfolioStore();

    const [viewMode,     setViewMode]     = useState('simple');
    const [showConfig,   setShowConfig]   = useState(false);
    const [activeRun,    setActiveRun]    = useState(null);
    const [loadingRun,   setLoadingRun]   = useState(true);
    const [runsList,     setRunsList]     = useState([]);
    const [compareRunId, setCompareRunId] = useState('');
    const [compareRun,   setCompareRun]   = useState(null);
    const [loadingCmp,   setLoadingCmp]   = useState(false);

    // Delete portfolio
    const [confirmDelete, setConfirmDelete] = useState(false);
    const [deleting,      setDeleting]      = useState(false);

    async function deletePortfolio() {
        setDeleting(true);
        try {
            await fetchWithAuth(`/portfolios/${portfolioId}`, { method: 'DELETE' });
            onPortfolioDeleted(portfolioId);
        } catch {
            setDeleting(false);
            setConfirmDelete(false);
        }
    }

    // Load most recent run + full runs list on mount / portfolio change
    useEffect(() => {
        setLoadingRun(true);
        setActiveRun(null);
        setRunsList([]);
        setCompareRunId('');
        setCompareRun(null);
        fetchWithAuth(`/portfolios/${portfolioId}/backtests`)
            .then((runs) => {
                setRunsList(runs);
                if (runs.length > 0) {
                    return fetchWithAuth(`/backtests/${runs[0].id}/results`);
                }
                return null;
            })
            .then((run) => { if (run) setActiveRun(run); })
            .catch(() => {})
            .finally(() => setLoadingRun(false));
    }, [portfolioId]);

    // Load compare run when selection changes
    useEffect(() => {
        if (!compareRunId) { setCompareRun(null); return; }
        setLoadingCmp(true);
        fetchWithAuth(`/backtests/${compareRunId}/results`)
            .then(setCompareRun)
            .catch(() => setCompareRun(null))
            .finally(() => setLoadingCmp(false));
    }, [compareRunId]);

    const hasResults = activeRun?.metrics && activeRun?.series?.length > 0;

    function runLabel(r) {
        const strat = STRATEGY_LABELS[r.rebalance_strategy] || 'Buy & Hold';
        return `${r.from_date?.slice(0, 7)} → ${r.to_date?.slice(0, 7)} · ${BENCHMARK_LABELS[r.benchmark] || r.benchmark} · ${strat}`;
    }

    return (
        <div className="results-panel">
            {/* Top bar */}
            <div className="results-topbar">
                <div className="results-topbar-left">
                    <div className="results-portfolio-name">{name}</div>
                    <div className="results-portfolio-meta">
                        <span>{formatInr(principal)}</span>
                        {notes && <span style={{ fontStyle: 'italic' }}>{notes}</span>}
                        {activeRun?.config && (
                            <span>
                                {activeRun.config.from_date?.slice(0, 7)} → {activeRun.config.to_date?.slice(0, 7)}
                                {' · '}{BENCHMARK_LABELS[activeRun.config.benchmark] || activeRun.config.benchmark}
                                {activeRun.config.rebalance_strategy && activeRun.config.rebalance_strategy !== 'none' && (
                                    <> · {STRATEGY_LABELS[activeRun.config.rebalance_strategy]}</>
                                )}
                                {activeRun.config.slippage_pct > 0 && (
                                    <> · {activeRun.config.slippage_pct}% slip</>
                                )}
                                {activeRun.config.risk_free_rate != null && activeRun.config.risk_free_rate !== 6.5 && (
                                    <> · rf {activeRun.config.risk_free_rate}%</>
                                )}
                            </span>
                        )}
                    </div>
                </div>
                <div className="results-topbar-right">
                    {hasResults && !confirmDelete && !focusedNode && (
                        <div className="view-toggle">
                            <button className={`view-toggle-btn${viewMode === 'simple' ? ' active' : ''}`} onClick={() => setViewMode('simple')}>Simple</button>
                            <button className={`view-toggle-btn${viewMode === 'advanced' ? ' active' : ''}`} onClick={() => setViewMode('advanced')}>Advanced</button>
                            <button className={`view-toggle-btn${viewMode === 'holdings' ? ' active' : ''}`} onClick={() => setViewMode('holdings')}>Holdings</button>
                        </div>
                    )}
                    {hasResults && !confirmDelete && runsList.length > 1 && (
                        <select
                            className="compare-select"
                            value={compareRunId}
                            onChange={(e) => setCompareRunId(e.target.value)}
                            title="Compare with another run"
                        >
                            <option value="">Compare with…</option>
                            {runsList
                                .filter((r) => r.id !== activeRun?.run_id)
                                .map((r) => (
                                    <option key={r.id} value={r.id}>{runLabel(r)}</option>
                                ))}
                        </select>
                    )}
                    {!confirmDelete && (
                        <button className="btn-primary accent btn-sm" onClick={() => setShowConfig((v) => !v)}>
                            {showConfig ? 'Cancel' : hasResults ? '↺ Re-run' : 'Run Backtest →'}
                        </button>
                    )}
                    {!confirmDelete && (
                        <button className="btn-secondary btn-sm" onClick={() => navigate(`/portfolio/${portfolioId}/edit`)}>
                            Edit
                        </button>
                    )}
                    {!confirmDelete && (
                        <button className="btn-danger-ghost btn-sm" onClick={() => setConfirmDelete(true)}>
                            Delete
                        </button>
                    )}
                    {confirmDelete && (
                        <div className="delete-confirm-inline">
                            <span className="delete-confirm-text">Delete "{name}"?</span>
                            <button className="btn-danger btn-sm" onClick={deletePortfolio} disabled={deleting}>
                                {deleting ? 'Deleting…' : 'Yes, delete'}
                            </button>
                            <button className="btn-ghost btn-sm" onClick={() => setConfirmDelete(false)}>Cancel</button>
                        </div>
                    )}
                </div>
            </div>

            <div className="results-body">
                {showConfig && (
                    <BacktestConfigForm
                        portfolioId={portfolioId}
                        onResult={(run) => {
                            setActiveRun(run);
                            setShowConfig(false);
                            setViewMode('simple');
                            setFocusedNode(null);
                            // Refresh runs list
                            fetchWithAuth(`/portfolios/${portfolioId}/backtests`)
                                .then(setRunsList).catch(() => {});
                        }}
                        onCancel={() => setShowConfig(false)}
                    />
                )}

                {!showConfig && loadingRun && (
                    <div className="results-loading">
                        <div className="spinner" />
                        Loading…
                    </div>
                )}

                {!showConfig && !loadingRun && hasResults && (() => {
                    const hm = activeRun.holdings_metrics || [];
                    const gm = activeRun.group_metrics || [];
                    const focusedHoldingId = focusedNode?.type === 'holding' ? focusedNode.id : null;
                    const focusedGroupId   = focusedNode?.type === 'group'   ? focusedNode.id : null;
                    const focusedHolding   = focusedHoldingId ? hm.find((h) => h.instrument_id === focusedHoldingId) : null;
                    const focusedGroup     = focusedGroupId   ? gm.find((g) => g.group_id === focusedGroupId) : null;
                    const holdingsInGroup  = focusedGroupId   ? hm.filter((h) => h.group_id === focusedGroupId) : [];

                    function handleFocus(instrumentId) {
                        if (!instrumentId) { setFocusedNode(null); return; }
                        setFocusedNode(focusedHoldingId === instrumentId ? null : { type: 'holding', id: instrumentId });
                    }

                    // Focused holding — full replacement view
                    if (focusedHolding) {
                        return <FocusedHoldingPanel holding={focusedHolding} onClear={() => setFocusedNode(null)} />;
                    }

                    // Focused group — full replacement view
                    if (focusedGroup) {
                        return <FocusedGroupPanel group={focusedGroup} holdingsInGroup={holdingsInGroup} onClear={() => setFocusedNode(null)} />;
                    }

                    // Normal portfolio-level views
                    if (viewMode === 'holdings') {
                        return (
                            <div className="results-content">
                                <HoldingsComparisonChart
                                    holdingsMetrics={hm}
                                    focusedId={focusedHoldingId}
                                    onFocus={handleFocus}
                                />
                                {/* Holdings table — always visible */}
                                {hm.length > 0 && (
                                    <div className="results-chart-section">
                                        <div className="results-section-label">All Holdings</div>
                                        <table className="holdings-metrics-table">
                                            <thead>
                                                <tr>
                                                    <th>Holding</th>
                                                    <th>Alloc %</th>
                                                    <th>Total Return</th>
                                                    <th>CAGR</th>
                                                    <th>Max DD</th>
                                                    <th>Contribution</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {hm.map((h, i) => (
                                                    <tr key={h.instrument_id}
                                                        className={focusedHoldingId === h.instrument_id ? 'holdings-row-focused' : ''}
                                                        onClick={() => handleFocus(h.instrument_id === focusedHoldingId ? null : h.instrument_id)}
                                                        style={{ cursor: 'pointer' }}
                                                    >
                                                        <td>
                                                            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                                                <span style={{ width: 8, height: 8, borderRadius: '50%', background: PIE_COLORS[i % PIE_COLORS.length], flexShrink: 0 }} />
                                                                <div>
                                                                    <div style={{ fontWeight: 500, fontSize: 13 }}>{h.name}</div>
                                                                    <div style={{ fontSize: 11, color: 'var(--ink-soft)' }}>{h.ticker}</div>
                                                                </div>
                                                            </div>
                                                        </td>
                                                        <td>{h.allocation_pct?.toFixed(1)}%</td>
                                                        <td style={{ color: h.total_return >= 0 ? 'var(--green, #059669)' : 'var(--red, #DC2626)' }}>
                                                            {h.total_return !== null ? `${sign(h.total_return)}${h.total_return?.toFixed(1)}%` : '—'}
                                                        </td>
                                                        <td>{h.cagr !== null ? `${sign(h.cagr)}${h.cagr?.toFixed(1)}%` : '—'}</td>
                                                        <td style={{ color: 'var(--red, #DC2626)' }}>
                                                            {h.max_drawdown != null ? `${h.max_drawdown?.toFixed(1)}%` : '—'}
                                                        </td>
                                                        <td style={{ color: (h.contribution_pct || 0) >= 0 ? 'var(--green, #059669)' : 'var(--red, #DC2626)' }}>
                                                            {h.contribution_pct != null ? `${h.contribution_pct > 0 ? '+' : ''}${h.contribution_pct?.toFixed(2)}ppt` : '—'}
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                )}
                            </div>
                        );
                    }

                    return (
                        <>
                            {viewMode === 'simple' && (
                                <SimpleResults
                                    run={activeRun}
                                    compareRun={loadingCmp ? null : compareRun}
                                    focusedId={focusedHoldingId}
                                    onFocus={handleFocus}
                                />
                            )}
                            {viewMode === 'advanced' && (
                                <AdvancedResults
                                    run={activeRun}
                                    focusedId={focusedHoldingId}
                                    onFocus={handleFocus}
                                />
                            )}
                        </>
                    );
                })()}

                {!showConfig && !loadingRun && !hasResults && (
                    <div className="results-empty">
                        <AllocationPieChart holdings={holdings} principal={principal} />
                        {holdings.length > 0 && (
                            <div className="backtest-cta">
                                <div>
                                    <h3>Ready to backtest?</h3>
                                    <p>Compare this portfolio against historical NAV data. Make sure you have run the AMFI fetcher first.</p>
                                </div>
                                <button className="btn-primary accent" onClick={() => setShowConfig(true)}>
                                    Run Backtest →
                                </button>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}

// ── Main Portfolio Page ───────────────────────────────────────────────────────
function Portfolio() {
    const navigate = useNavigate();
    const { portfolios, activePortfolioId, expandedGroups, focusedNode, setPortfolios, setActivePortfolioId, setFocusedNode, toggleGroupExpanded } = usePortfolioStore();

    const [portfolioDetail, setPortfolioDetail] = useState(null);
    const [loading, setLoading] = useState(true);
    const [detailLoading, setDetailLoading] = useState(false);
    const [error, setError] = useState(null);

    // Load portfolio list
    useEffect(() => {
        fetchWithAuth('/portfolios')
            .then((data) => {
                setPortfolios(data);
                if (data.length > 0 && !activePortfolioId) {
                    setActivePortfolioId(data[0].id);
                }
            })
            .catch(() => setError('Failed to load portfolios.'))
            .finally(() => setLoading(false));
    }, []);

    // Load active portfolio details
    const loadDetail = useCallback((id) => {
        if (!id) return;
        setDetailLoading(true);
        fetchWithAuth(`/portfolios/${id}`)
            .then(setPortfolioDetail)
            .catch(() => setError('Failed to load portfolio details.'))
            .finally(() => setDetailLoading(false));
    }, []);

    useEffect(() => {
        loadDetail(activePortfolioId);
    }, [activePortfolioId, loadDetail]);

    if (loading) {
        return (
            <div className="portfolio-loading">
                <div style={{ width: 32, height: 32, border: '2px solid var(--ink-ghost)', borderTopColor: 'var(--ink)', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
                Loading portfolios…
                <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
            </div>
        );
    }

    if (portfolios.length === 0) {
        return (
            <div className="portfolio-empty">
                <div className="portfolio-empty-icon">◈</div>
                <h2>Build your first portfolio</h2>
                <p>
                    Create a portfolio by listing your holdings and see how it would have performed
                    historically with different rebalancing strategies.
                </p>
                <button className="btn-primary accent" onClick={() => navigate('/portfolio/new')}>
                    Create Portfolio →
                </button>
            </div>
        );
    }

    const activePortfolio = portfolioDetail;

    return (
        <div className="portfolio-page">
            {error && <div className="portfolio-error">{error}</div>}

            {/* Top bar */}
            <div className="portfolio-topbar">
                <span className="portfolio-topbar-title">Portfolio</span>
                <div className="portfolio-switcher">
                    {portfolios.map((p) => (
                        <button
                            key={p.id}
                            className={`portfolio-tab${p.id === activePortfolioId ? ' active' : ''}`}
                            onClick={() => setActivePortfolioId(p.id)}
                        >
                            {p.name}
                        </button>
                    ))}
                </div>
                <div className="portfolio-topbar-actions">
                    <button className="btn-secondary btn-sm" onClick={() => navigate('/portfolio/new')}>
                        + New Portfolio
                    </button>
                </div>
            </div>

            {/* Workspace */}
            {detailLoading || !activePortfolio ? (
                <div className="portfolio-loading" style={{ minHeight: '50vh' }}>
                    <div style={{ width: 28, height: 28, border: '2px solid var(--ink-ghost)', borderTopColor: 'var(--ink)', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
                    <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
                </div>
            ) : (
                <div className="portfolio-workspace">
                    <HoldingsExplorer
                        portfolio={activePortfolio}
                        portfolioId={activePortfolioId}
                        focusedNode={focusedNode}
                        onFocus={setFocusedNode}
                        expandedGroups={expandedGroups}
                        onToggleGroup={toggleGroupExpanded}
                        onRefresh={() => loadDetail(activePortfolioId)}
                    />
                    <ResultsPanel
                        portfolio={activePortfolio}
                        portfolioId={activePortfolioId}
                        navigate={navigate}
                        onPortfolioUpdated={() => {
                            fetchWithAuth('/portfolios').then(setPortfolios).catch(() => {});
                            loadDetail(activePortfolioId);
                        }}
                        onPortfolioDeleted={(deletedId) => {
                            const remaining = portfolios.filter((p) => p.id !== deletedId);
                            setPortfolios(remaining);
                            setPortfolioDetail(null);
                            if (remaining.length > 0) {
                                setActivePortfolioId(remaining[0].id);
                            } else {
                                setActivePortfolioId(null);
                            }
                        }}
                    />
                </div>
            )}
        </div>
    );
}

export default Portfolio;
