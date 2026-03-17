import { useState, useMemo, useEffect, useRef } from 'react';
import { fetchWithAuth } from '../api';
import {
    ComposedChart, Bar, Line, XAxis, YAxis, Tooltip as RechartsTooltip,
    ResponsiveContainer, CartesianGrid
} from 'recharts';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import {
    INFLATION_RATE, ASSET_RETURNS, RISK_LABELS, RISK_COLORS, GOAL_COLORS,
    calcSIP, inflationAdjusted, getGoalAllocation, getBlendedReturn,
    generateYearlyData, generateMonthlyData, corpusAtMonth, computeGoalResult
} from '../utils/goalCalculations';
import { computeAllStrategies } from '../utils/budgetStrategies';

import { fmt, fmtFull } from '../utils/formatCurrency';


// ═══════════════════════════════════════════════════
// COMPONENT
// ═══════════════════════════════════════════════════

function GoalPlanner() {
    const [goals, setGoals] = useState([]);
    const [budget, setBudget] = useState('');
    const [showForm, setShowForm] = useState(false);
    const [activeGoalTab, setActiveGoalTab] = useState(null);
    const [activeTableTab, setActiveTableTab] = useState('yearly');
    const [initialLoadDone, setInitialLoadDone] = useState(false);
    const saveTimeoutRef = useRef(null);

    // Fetch initial goals
    useEffect(() => {
        fetchWithAuth('/goals')
            .then(data => {
                if (Array.isArray(data)) {
                    setGoals(data);
                }
                setInitialLoadDone(true);
            })
            .catch(err => {
                console.error('Failed to load goals:', err);
                setInitialLoadDone(true);
            });
    }, []);

    // Debounced auto-save
    useEffect(() => {
        if (!initialLoadDone) return; // don't save before loading

        if (saveTimeoutRef.current) {
            clearTimeout(saveTimeoutRef.current);
        }

        saveTimeoutRef.current = setTimeout(() => {
            fetchWithAuth('/goals', {
                method: 'POST',
                body: JSON.stringify({ goals })
            }).catch(console.error);
        }, 1500);

        return () => clearTimeout(saveTimeoutRef.current);
    }, [goals, initialLoadDone]);

    const [formName, setFormName] = useState('');
    const [formTarget, setFormTarget] = useState('');
    const [formYears, setFormYears] = useState('');
    const [formRisk, setFormRisk] = useState(2); // 0-5 index
    const [formIncludeInflation, setFormIncludeInflation] = useState(true);
    const [formPriority, setFormPriority] = useState(3); // 1-5 priority weight
    const [customEquityAlloc, setCustomEquityAlloc] = useState('70');
    const [customDebtAlloc, setCustomDebtAlloc] = useState('25');
    const [customCommodityAlloc, setCustomCommodityAlloc] = useState('5');
    const [customEquityReturn, setCustomEquityReturn] = useState('12');
    const [customDebtReturn, setCustomDebtReturn] = useState('7');
    const [customCommodityReturn, setCustomCommodityReturn] = useState('7');
    const [editingId, setEditingId] = useState(null);
    const [selectedStrategy, setSelectedStrategy] = useState(null);
    const [notification, setNotification] = useState(null);

    // ── Compute results for each goal ──
    const goalResults = useMemo(() => goals.map(computeGoalResult), [goals]);

    // ── Overall summary (original, pre-strategy) ──
    const overallSummary = useMemo(() => {
        if (!goalResults.length) return null;
        return {
            totalSIP: goalResults.reduce((s, g) => s + g.sip, 0),
            totalInvested: goalResults.reduce((s, g) => s + g.totalInvested, 0),
            totalCorpus: goalResults.reduce((s, g) => s + g.inflatedTarget, 0),
            totalProfit: goalResults.reduce((s, g) => s + g.wealthGained, 0),
        };
    }, [goalResults]);

    // ── Budget strategy computation ──
    const strategyResults = useMemo(() => {
        const budgetNum = Number(budget);
        if (!budgetNum || !overallSummary || overallSummary.totalSIP <= budgetNum) return null;
        return computeAllStrategies(goals, budgetNum, goalResults);
    }, [goals, budget, goalResults, overallSummary]);

    // ── Display results (merged with active strategy) ──
    const displayGoalResults = useMemo(() => {
        if (!selectedStrategy || !strategyResults) return goalResults.map(g => ({ ...g, _original: null }));
        const strategy = strategyResults.find(s => s.id === selectedStrategy);
        if (!strategy) return goalResults.map(g => ({ ...g, _original: null }));

        return goalResults.map(g => {
            const mod = strategy.modifiedGoals.find(m => m.goalId === g.id);
            if (!mod) return { ...g, _original: null };

            // Build a modified goal object with the strategy's changes
            const modifiedGoal = { ...g, ...mod.changes };
            // Recompute full metrics with the modified values
            const recomputed = computeGoalResult(modifiedGoal);
            return { ...recomputed, _original: g, _mod: mod };
        });
    }, [goalResults, selectedStrategy, strategyResults]);

    // ── Display summary (with strategy applied) ──
    const displaySummary = useMemo(() => {
        if (!displayGoalResults.length) return null;
        return {
            totalSIP: displayGoalResults.reduce((s, g) => s + g.sip, 0),
            totalInvested: displayGoalResults.reduce((s, g) => s + g.totalInvested, 0),
            totalCorpus: displayGoalResults.reduce((s, g) => s + g.inflatedTarget, 0),
            totalProfit: displayGoalResults.reduce((s, g) => s + g.wealthGained, 0),
        };
    }, [displayGoalResults]);

    // Budget status
    const budgetStatus = useMemo(() => {
        const budgetNum = Number(budget);
        if (!budgetNum || !overallSummary) return 'none';
        if (overallSummary.totalSIP <= budgetNum) return 'within';
        return 'deficit';
    }, [budget, overallSummary]);

    // ── Handlers ──
    const addGoal = () => {
        if (!formName || !formTarget || !formYears) return;

        // Validation for Custom Strategy
        if (formRisk === 5) {
            const total = Number(customEquityAlloc) + Number(customDebtAlloc) + Number(customCommodityAlloc);
            if (total !== 100) return;
        }

        const newGoal = {
            id: editingId || Date.now().toString(),
            name: formName,
            target: Number(formTarget), years: Number(formYears),
            riskLevel: formRisk,
            includeInflation: formIncludeInflation,
            priorityWeight: formPriority,
            customEquityAlloc: formRisk === 5 ? Number(customEquityAlloc) : null,
            customDebtAlloc: formRisk === 5 ? Number(customDebtAlloc) : null,
            customCommodityAlloc: formRisk === 5 ? Number(customCommodityAlloc) : null,
            customEquityReturn: formRisk === 5 ? Number(customEquityReturn) : null,
            customDebtReturn: formRisk === 5 ? Number(customDebtReturn) : null,
            customCommodityReturn: formRisk === 5 ? Number(customCommodityReturn) : null
        };
        if (editingId) {
            setGoals(goals.map(g => g.id === editingId ? newGoal : g));
        } else {
            setGoals([...goals, newGoal]);
        }
        resetForm();
    };

    const resetForm = () => {
        setFormName(''); setFormTarget('');
        setFormYears(''); setFormRisk(2); setFormIncludeInflation(true);
        setFormPriority(3);
        setCustomEquityAlloc('70'); setCustomDebtAlloc('25'); setCustomCommodityAlloc('5');
        setCustomEquityReturn('12'); setCustomDebtReturn('7'); setCustomCommodityReturn('7');
        setEditingId(null); setShowForm(false);
    };

    const editGoal = (goal) => {
        setFormName(goal.name); setFormTarget(goal.target.toString());
        setFormYears(goal.years.toString()); setFormRisk(goal.riskLevel);
        setFormIncludeInflation(goal.includeInflation ?? true);
        setFormPriority(goal.priorityWeight || 3);
        if (goal.riskLevel === 5) {
            setCustomEquityAlloc(goal.customEquityAlloc?.toString() || '');
            setCustomDebtAlloc(goal.customDebtAlloc?.toString() || '');
            setCustomCommodityAlloc(goal.customCommodityAlloc?.toString() || '');
            setCustomEquityReturn(goal.customEquityReturn?.toString() || '');
            setCustomDebtReturn(goal.customDebtReturn?.toString() || '');
            setCustomCommodityReturn(goal.customCommodityReturn?.toString() || '');
        }
        setEditingId(goal.id); setShowForm(true);
    };
    const deleteGoal = (id) => { setGoals(goals.filter(g => g.id !== id)); setSelectedStrategy(null); };

    // ── Excel Import / Export ──
    const fileInputRef = useRef(null);

    const downloadSampleExcel = () => {
        const sampleData = [
            { "Goal Name": "Dream House", "Target Amount": 15000000, "Time Horizon (Years)": 15, "Risk Level (0-4)": 2 },
            { "Goal Name": "Child Education", "Target Amount": 5000000, "Time Horizon (Years)": 10, "Risk Level (0-4)": 3 },
            { "Goal Name": "Car", "Target Amount": 800000, "Time Horizon (Years)": 3, "Risk Level (0-4)": 1 }
        ];

        const worksheet = XLSX.utils.json_to_sheet(sampleData);
        // Adjust column widths
        worksheet['!cols'] = [{ wch: 20 }, { wch: 15 }, { wch: 20 }, { wch: 15 }];

        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, "Goals");
        XLSX.writeFile(workbook, "Goal_Planner_Sample.xlsx");
    };

    const exportGoalsExcel = () => {
        if (goalResults.length === 0) return setNotification({ type: 'warn', msg: 'Add at least one goal to export.' });

        const exportData = goalResults.map(g => ({
            "Goal Name": g.name,
            "Target Amount": g.target,
            "Time Horizon (Years)": g.years,
            "Risk Level (0-5)": g.riskLevel,
            "Include Inflation": g.includeInflation ? "Yes" : "No",
            "Custom Equity %": g.riskLevel === 5 ? g.customEquityAlloc : "",
            "Custom Debt %": g.riskLevel === 5 ? g.customDebtAlloc : "",
            "Custom Commodity %": g.riskLevel === 5 ? g.customCommodityAlloc : "",
            "Custom Equity Return %": g.riskLevel === 5 ? g.customEquityReturn : "",
            "Custom Debt Return %": g.riskLevel === 5 ? g.customDebtReturn : "",
            "Custom Commodity Return %": g.riskLevel === 5 ? g.customCommodityReturn : ""
        }));

        const worksheet = XLSX.utils.json_to_sheet(exportData);
        worksheet['!cols'] = [{ wch: 20 }, { wch: 15 }, { wch: 20 }, { wch: 15 }];

        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, "My_Goals");
        XLSX.writeFile(workbook, "My_Financial_Goals.xlsx");
    };

    const handleFileUpload = (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (evt) => {
            try {
                const bstr = evt.target.result;
                const wb = XLSX.read(bstr, { type: 'binary' });
                const wsname = wb.SheetNames[0];
                const ws = wb.Sheets[wsname];
                const data = XLSX.utils.sheet_to_json(ws);

                if (data.length === 0) { setNotification({ type: 'warn', msg: 'The uploaded file is empty.' }); return; }

                // Map excel rows to goals
                const importedGoals = [];
                data.forEach((row, i) => {
                    const name = row["Goal Name"] || `Goal ${i + 1}`;
                    const target = Number(row["Target Amount"]);
                    const years = Number(row["Time Horizon (Years)"]);

                    if (!target || !years || isNaN(target) || isNaN(years)) {
                        console.warn(`Skipping row ${i + 1} due to missing or invalid Target/Years.`);
                        return; // Skip invalid rows
                    }

                    // Parse risk level, fallback to 2 (Moderate)
                    let risk = 2;
                    if (row["Risk Level (0-4)"] !== undefined) {
                        risk = Number(row["Risk Level (0-4)"]);
                        if (isNaN(risk) || risk < 0 || risk > 4) risk = 2;
                    }

                    importedGoals.push({
                        id: (Date.now() + i).toString(), // Unique ID sequence as string
                        name: String(name).trim(),
                        target,
                        years,
                        riskLevel: risk,
                        includeInflation: row["Include Inflation"] === "No" ? false : true
                    });
                });

                if (importedGoals.length > 0) {
                    setGoals(prev => [...prev, ...importedGoals]);
                    setNotification({ type: 'ok', msg: `Successfully imported ${importedGoals.length} goals!` });
                } else {
                    setNotification({ type: 'warn', msg: 'Could not find any valid goals in the file. Please check the format.' });
                }
            } catch (err) {
                console.error(err);
                setNotification({ type: 'warn', msg: "Error parsing the file. Please ensure it's a valid Excel format." });
            }
            // Reset input so the same file can be uploaded again if needed
            if (fileInputRef.current) fileInputRef.current.value = "";
        };
        reader.readAsBinaryString(file);
    };

    const downloadPDF = () => {
        if (goalResults.length === 0) return setNotification({ type: 'warn', msg: 'Add at least one goal to generate a report.' });

        const doc = new jsPDF();
        const pageWidth = doc.internal.pageSize.getWidth();
        let currentY = 20;

        // Title
        doc.setFontSize(20);
        doc.setFont('helvetica', 'bold');
        doc.text("Financial Goal Planning Report", pageWidth / 2, currentY, { align: 'center' });
        currentY += 15;

        // Overall Summary (if more than 0 goals)
        if (overallSummary && goalResults.length > 0) {
            doc.setFontSize(14);
            doc.setFont('helvetica', 'bold');
            doc.text("Overall Summary", 14, currentY);
            currentY += 8;

            doc.setFontSize(10);
            doc.setFont('helvetica', 'normal');
            autoTable(doc, {
                startY: currentY,
                head: [['Total Monthly SIP', 'Total Invested', 'Total Profit Earned', 'Total Corpus']],
                body: [[
                    fmt(overallSummary.totalSIP),
                    fmt(overallSummary.totalInvested),
                    fmt(overallSummary.totalProfit),
                    fmt(overallSummary.totalCorpus)
                ]],
                theme: 'grid',
                headStyles: { fillColor: [30, 41, 59] },
                margin: { top: 10, bottom: 10 }
            });
            currentY = doc.lastAutoTable.finalY + 15;
        }

        // Individual Goals
        goalResults.forEach((g, idx) => {
            // Check page breaks
            if (currentY > 250) {
                doc.addPage();
                currentY = 20;
            }

            // Goal Header
            doc.setFontSize(14);
            doc.setFont('helvetica', 'bold');
            doc.text(`${idx + 1}. Goal: ${g.name}`, 14, currentY);
            currentY += 8;

            // Goal Details
            doc.setFontSize(10);
            doc.setFont('helvetica', 'normal');
            const detailsText = [
                `Target: ${fmt(g.target)}`,
                `Time Horizon: ${g.years} years`,
                `Risk Level: ${RISK_LABELS[g.riskLevel]}`,
                `Monthly SIP Required: ${fmt(Math.round(g.sip))}`
            ].join('   |   ');

            doc.text(detailsText, 14, currentY);
            currentY += 10;

            // Yearly Table
            autoTable(doc, {
                startY: currentY,
                head: [['Year', 'Cumulative Invested', 'Profit Earned', 'Total Corpus']],
                body: g.yearlyData.map(row => [
                    `Year ${row.year}`,
                    fmt(row.invested),
                    fmt(row.profit),
                    fmt(row.total)
                ]),
                theme: 'striped',
                headStyles: { fillColor: [71, 85, 105] },
                margin: { bottom: 15 }
            });

            currentY = doc.lastAutoTable.finalY + 20;
        });

        doc.save("Goal_Planner_Report.pdf");
    };

    // ── Custom tooltip ──
    const ChartTooltip = ({ active, payload, label }) => {
        if (!active || !payload?.length) return null;
        return (
            <div style={{ backgroundColor: '#1C1A17', borderRadius: '8px', padding: '10px 14px', color: '#FFFFFF', fontSize: '12px' }}>
                <div style={{ fontWeight: 700, marginBottom: '4px' }}>Year {label}</div>
                {payload.map((p, i) => (
                    <div key={i} style={{ color: p.color || '#D8D3CB' }}>
                        {p.name}: {fmt(p.value)}
                    </div>
                ))}
            </div>
        );
    };

    // ── G10: Extract IIFEs to computed vars ──
    const autoAllocation = formYears && formRisk !== 5 ? getGoalAllocation(Number(formYears) || 1, formRisk) : null;
    const customAllocTotal = Number(customEquityAlloc) + Number(customDebtAlloc) + Number(customCommodityAlloc);
    const isCustomInvalid = formRisk === 5 && customAllocTotal !== 100;
    const isBasicInvalid = !formName || !formTarget || !formYears;
    const isFormDisabled = isCustomInvalid || isBasicInvalid;

    if (!initialLoadDone) {
        return (
            <div className="dash-loading">
                <div className="dash-loading-box">
                    <div className="dash-loading-text">Loading goals…</div>
                </div>
            </div>
        );
    }

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '56px', paddingBottom: '64px' }}>
            {/* ═══ Notification Banner ═══ */}
            {notification && (
                <div style={{ padding: '12px 16px', fontSize: '13px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', border: '0.5px solid var(--ink-ghost)', backgroundColor: notification.type === 'ok' ? 'rgba(45,90,61,0.06)' : 'rgba(200,64,64,0.06)', color: notification.type === 'ok' ? 'var(--green)' : 'var(--red)' }}>
                    <span>{notification.msg}</span>
                    <button onClick={() => setNotification(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--ink-soft)', fontSize: '16px' }}>✕</button>
                </div>
            )}

            {/* ═══ Header ═══ */}
            <div className="page-header">
                <div className="page-header-top">
                    <div>
                        <div className="page-super">Planning Tools</div>
                        <div className="page-title">Goal-Based Investment Planner</div>
                        <div className="page-desc">Plan your financial goals with risk-appropriate asset allocations</div>
                    </div>
                    <div className="page-actions">
                        <button onClick={downloadPDF} className="btn-ghost">↑ Export PDF</button>
                        <button onClick={exportGoalsExcel} className="btn-ghost">↓ Export Excel</button>
                        <button onClick={() => fileInputRef.current?.click()} className="btn-ghost">↑ Import Excel</button>
                        <button onClick={downloadSampleExcel} className="btn-ghost">Sample Format</button>
                        <input type="file" ref={fileInputRef} onChange={handleFileUpload} accept=".xlsx, .xls, .csv" style={{ display: 'none' }} />
                    </div>
                </div>
            </div>

            {/* ═══ Monthly Budget ═══ */}
            <div>
                <div className="budget-row">
                    <span className="budget-label">Monthly Budget</span>
                    <input className="budget-input" type="number" placeholder="Enter monthly budget (optional)" value={budget} onChange={(e) => { setBudget(e.target.value); setSelectedStrategy(null); }} />
                    {budgetStatus === 'none' && <span className="budget-deficit" style={{ color: 'var(--ink-soft)' }}>Enter a budget to get smart strategies</span>}
                    {budgetStatus === 'within' && <span className="budget-deficit" style={{ color: 'var(--green)' }}>✓ Your goals fit within your budget</span>}
                    {budgetStatus === 'deficit' && <span className="budget-deficit">⚠ Budget deficit: {fmt(overallSummary.totalSIP - Number(budget))}/mo - see strategies below</span>}
                </div>
            </div>

            {/* ═══ Strategy Cards ═══ */}
            {strategyResults && (
                <div className="strategy-section" id="strategySection">
                    <div className="strategy-header">
                        <span className="strategy-icon">◎</span>
                        <div className="strategy-title">Budget Resolution Strategies</div>
                    </div>
                    <div className="strategy-desc">Your total SIP ({fmt(overallSummary?.totalSIP)}) exceeds your monthly budget ({fmt(Number(budget))}). Select a strategy to explore trade-offs.</div>

                    <div className="strategy-cards">
                        {strategyResults.map(s => {
                            const isActive = selectedStrategy === s.id;
                            return (
                                <div key={s.id} onClick={() => setSelectedStrategy(isActive ? null : s.id)} className={`strategy-card ${isActive ? 'active' : ''}`}>
                                    <div className="strategy-card-title">{s.name}</div>
                                    <div className="strategy-card-desc">{s.description}</div>
                                    {s.deficitResolved ? (
                                        <div className="strategy-resolved">✓ Deficit Resolved</div>
                                    ) : (
                                        <div className="strategy-resolved" style={{ color: 'var(--red)' }}>Shortfall: {fmt(s.remainingShortfall)}/mo</div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                    {selectedStrategy && (() => {
                        const active = strategyResults.find(s => s.id === selectedStrategy);
                        return active ? (
                            <div style={{ marginTop: '20px', padding: '12px 16px', backgroundColor: 'var(--paper)', borderLeft: '2px solid var(--ink)', fontSize: '13px', color: 'var(--ink-soft)' }}>
                                <strong style={{ color: 'var(--ink)', fontWeight: 500 }}>Trade-off:</strong> {active.tradeoff}
                            </div>
                        ) : null;
                    })()}
                </div>
            )}

            {/* ═══ Goal Form ═══ */}
            {showForm && (
                <div style={{ border: '0.5px solid var(--ink-ghost)', padding: '24px 28px' }}>
                    <div className="section-heading" style={{ marginBottom: '24px' }}>{editingId ? 'Edit Goal' : 'Add New Goal'}</div>
                    <div className="goal-form-grid">
                        <div>
                            <label className="act-label" style={{ display: 'block', marginBottom: '8px' }}>Goal Name</label>
                            <input value={formName} onChange={(e) => setFormName(e.target.value)} placeholder="e.g. Dream House" className="budget-input" style={{ width: '100%', border: '0.5px solid var(--ink-ghost)' }} />
                        </div>
                        <div>
                            <label className="act-label" style={{ display: 'block', marginBottom: '8px' }}>Target Amount (₹)</label>
                            <input type="number" value={formTarget} onChange={(e) => setFormTarget(e.target.value)} placeholder="e.g. 10000000" className="budget-input" style={{ width: '100%', border: '0.5px solid var(--ink-ghost)' }} />
                        </div>
                        <div>
                            <label className="act-label" style={{ display: 'block', marginBottom: '8px' }}>Time Horizon (Years)</label>
                            <input type="number" min="1" max="40" value={formYears} onChange={(e) => setFormYears(e.target.value)} placeholder="e.g. 10" className="budget-input" style={{ width: '100%', border: '0.5px solid var(--ink-ghost)' }} />
                        </div>
                    </div>

                    <div className="goal-form-grid-2">
                        <div>
                            <label className="act-label" style={{ display: 'block', marginBottom: '8px' }}>Risk Level Strategy</label>
                            <select value={formRisk} onChange={(e) => setFormRisk(Number(e.target.value))} className="budget-input" style={{ width: '100%', border: '0.5px solid var(--ink-ghost)' }}>
                                {RISK_LABELS.map((label, i) => <option key={i} value={i}>{label}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="act-label" style={{ display: 'block', marginBottom: '8px' }}>Priority</label>
                            <select value={formPriority} onChange={(e) => setFormPriority(Number(e.target.value))} className="budget-input" style={{ width: '100%', border: '0.5px solid var(--ink-ghost)' }}>
                                {[1, 2, 3, 4, 5].map(v => <option key={v} value={v}>{v} - {['Most Flexible', 'Flexible', 'Medium', 'Important', 'Must Protect'][v - 1]}</option>)}
                            </select>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', height: '48px', gap: '10px' }}>
                            <input type="checkbox" id="inflationToggle" checked={formIncludeInflation} onChange={(e) => setFormIncludeInflation(e.target.checked)} style={{ width: '16px', height: '16px', cursor: 'pointer', marginLeft: '12px' }} />
                            <label htmlFor="inflationToggle" style={{ fontSize: '13px', fontWeight: 400, color: 'var(--ink)', cursor: 'pointer' }}>Include Inflation (6% p.a.)</label>
                        </div>
                    </div>

                    {formRisk === 5 && (
                        <div style={{ marginTop: '24px', padding: '20px', border: '0.5px solid var(--ink-ghost)' }}>
                            <div className="act-label" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <span>Custom Strategy Setup</span>
                                <span style={{ fontSize: '12px', fontWeight: 500, color: customAllocTotal === 100 ? 'var(--green)' : 'var(--red)' }}>
                                    Allocation Total: {customAllocTotal}% {customAllocTotal === 100 ? '✓' : `(need ${100 - customAllocTotal > 0 ? '+' : ''}${100 - customAllocTotal}%)`}
                                </span>
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
                                <div>
                                    <div style={{ fontSize: '11px', color: 'var(--ink-soft)', marginBottom: '12px', textTransform: 'uppercase' }}>Asset Allocation (%)</div>
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px' }}>
                                        <div>
                                            <label className="act-label" style={{ marginBottom: '6px', display: 'block' }}>Equity</label>
                                            <input type="number" value={customEquityAlloc} onChange={(e) => setCustomEquityAlloc(e.target.value)} className="budget-input" style={{ width: '100%', border: '0.5px solid var(--ink-ghost)', padding: '10px' }} placeholder="70" />
                                        </div>
                                        <div>
                                            <label className="act-label" style={{ marginBottom: '6px', display: 'block' }}>Debt</label>
                                            <input type="number" value={customDebtAlloc} onChange={(e) => setCustomDebtAlloc(e.target.value)} className="budget-input" style={{ width: '100%', border: '0.5px solid var(--ink-ghost)', padding: '10px' }} placeholder="25" />
                                        </div>
                                        <div>
                                            <label className="act-label" style={{ marginBottom: '6px', display: 'block' }}>Commodity</label>
                                            <input type="number" value={customCommodityAlloc} onChange={(e) => setCustomCommodityAlloc(e.target.value)} className="budget-input" style={{ width: '100%', border: '0.5px solid var(--ink-ghost)', padding: '10px' }} placeholder="5" />
                                        </div>
                                    </div>
                                </div>
                                <div>
                                    <div style={{ fontSize: '11px', color: 'var(--ink-soft)', marginBottom: '12px', textTransform: 'uppercase' }}>Expected Returns (% p.a.)</div>
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px' }}>
                                        <div>
                                            <label className="act-label" style={{ marginBottom: '6px', display: 'block' }}>Equity</label>
                                            <input type="number" value={customEquityReturn} onChange={(e) => setCustomEquityReturn(e.target.value)} className="budget-input" style={{ width: '100%', border: '0.5px solid var(--ink-ghost)', padding: '10px' }} placeholder="12" />
                                        </div>
                                        <div>
                                            <label className="act-label" style={{ marginBottom: '6px', display: 'block' }}>Debt</label>
                                            <input type="number" value={customDebtReturn} onChange={(e) => setCustomDebtReturn(e.target.value)} className="budget-input" style={{ width: '100%', border: '0.5px solid var(--ink-ghost)', padding: '10px' }} placeholder="7" />
                                        </div>
                                        <div>
                                            <label className="act-label" style={{ marginBottom: '6px', display: 'block' }}>Commodity</label>
                                            <input type="number" value={customCommodityReturn} onChange={(e) => setCustomCommodityReturn(e.target.value)} className="budget-input" style={{ width: '100%', border: '0.5px solid var(--ink-ghost)', padding: '10px' }} placeholder="7" />
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {autoAllocation && (
                        <div style={{ marginTop: '16px', fontSize: '12px', color: 'var(--ink-soft)' }}>
                            <span style={{ color: 'var(--ink)', fontWeight: 500 }}>Auto-Allocation: </span>Equity {autoAllocation.equity}% · Debt {autoAllocation.debt}% · Commodity {autoAllocation.commodity}%
                        </div>
                    )}

                    <div style={{ display: 'flex', gap: '12px', marginTop: '24px', alignItems: 'center' }}>
                        <button onClick={addGoal} disabled={isFormDisabled} className="btn-primary" style={{ opacity: isFormDisabled ? 0.5 : 1 }}>
                            {editingId ? 'Update Goal' : 'Add Goal'}
                        </button>
                        <button onClick={resetForm} className="btn-ghost">Cancel</button>
                        {isCustomInvalid && <div style={{ fontSize: '12px', color: 'var(--red)' }}>Total must be 100% (Current: {customAllocTotal}%)</div>}
                    </div>
                </div>
            )}

            {/* ═══ Goals Table ═══ */}
            {displayGoalResults.length > 0 && (
                <div>
                    <div className="goals-header">
                        <div className="goals-title">
                            Your Goals {selectedStrategy && <span style={{ fontSize: '12px', color: 'var(--ink-soft)', fontWeight: 300, marginLeft: '12px' }}>Strategy: {strategyResults?.find(s => s.id === selectedStrategy)?.name}</span>}
                        </div>
                        {!showForm && (
                            <button onClick={() => setShowForm(true)} className="btn-primary">+ Add Goal</button>
                        )}
                    </div>
                    <div className="goals-table-wrap">
                    <table className="goals-table">
                        <thead>
                            <tr>
                                <th>Goal</th>
                                <th>Priority</th>
                                <th>Target</th>
                                <th>Inflation Adj.</th>
                                <th>Timeline</th>
                                <th>Risk</th>
                                <th>Allocation</th>
                                <th>Return</th>
                                <th>Monthly SIP</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {displayGoalResults.map((g, i) => {
                                const orig = g._original;
                                return (
                                    <tr key={g.id}>
                                        <td><span className="goal-name">{g.name}</span></td>
                                        <td><span className="priority-badge">P{g.priorityWeight || 3}</span></td>
                                        <td>
                                            {orig && orig.target !== g.target ? (
                                                <><span style={{ textDecoration: 'line-through', color: 'var(--ink-ghost)', fontSize: '11px' }}>{fmt(orig.target)}</span> <span style={{ color: 'var(--green)' }}>{fmt(g.target)}</span></>
                                            ) : fmt(g.target)}
                                        </td>
                                        <td>
                                            {g.includeInflation ? (
                                                <span className="inflation-adj">{fmt(g.inflatedTarget)}</span>
                                            ) : (
                                                <span style={{ fontSize: '11px', color: 'var(--ink-ghost)', display: 'block', lineHeight: '1.2' }}>{fmt(g.target)}<br />(No Inflation)</span>
                                            )}
                                        </td>
                                        <td>
                                            {orig && orig.years !== g.years ? (
                                                <><span style={{ textDecoration: 'line-through', color: 'var(--ink-ghost)', fontSize: '11px' }}>{orig.years}y</span> <span style={{ color: 'var(--green)' }}>{g.years}y</span></>
                                            ) : <>{g.years}y</>}
                                        </td>
                                        <td>
                                            {orig && orig.riskLevel !== g.riskLevel ? (
                                                <><div style={{ textDecoration: 'line-through', color: 'var(--ink-ghost)', fontSize: '10px' }}>{RISK_LABELS[orig.riskLevel]}</div><span style={{ color: 'var(--green)' }}>{RISK_LABELS[g.riskLevel]}</span></>
                                            ) : RISK_LABELS[g.riskLevel]}
                                        </td>
                                        <td><span className="alloc-text">E:{g.allocation.equity}% · D:{g.allocation.debt}% · C:{g.allocation.commodity}%</span></td>
                                        <td><span className="return-val">{(g.blendedReturn * 100).toFixed(1)}%</span></td>
                                        <td>
                                            <span className="sip-val">
                                                {orig ? (
                                                    <><span style={{ textDecoration: 'line-through', color: 'var(--ink-ghost)', fontSize: '11px' }}>{fmt(orig.sip)}</span> <span style={{ color: 'var(--green)' }}>{fmt(g.sip)}</span></>
                                                ) : fmt(g.sip)}
                                            </span>
                                            {g.highSip && <span style={{ color: 'var(--accent)', marginLeft: '4px' }}>⚠</span>}
                                        </td>
                                        <td>
                                            <div className="row-actions">
                                                <button className="action-btn" onClick={() => editGoal(g)}>✎</button>
                                                <button className="action-btn del" onClick={() => deleteGoal(g.id)}>✕</button>
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                    </div>
                    {displayGoalResults.some(g => g.highSip) && (
                        <div style={{ marginTop: '16px', fontSize: '12px', color: 'var(--accent)' }}>
                            ⚠ High SIP detected - Consider increasing the time horizon or reducing the goal amount.
                        </div>
                    )}
                </div>
            )}

            {/* ═══ Overall Summary ═══ */}
            {displaySummary && displayGoalResults.length > 0 && (
                <div>
                    <div className="act-label" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span>Overall Summary</span>
                        {selectedStrategy && (
                            <span style={{ fontSize: '11px', fontWeight: 600, color: 'var(--green)', padding: '4px 10px', backgroundColor: 'rgba(45,90,61,0.1)', borderRadius: '20px' }}>
                                Strategy Active: {strategyResults?.find(s => s.id === selectedStrategy)?.name}
                            </span>
                        )}
                    </div>
                    <div className="summary-kpis">
                        {[
                            { label: 'Total Monthly SIP', value: fmt(displaySummary.totalSIP), original: selectedStrategy && overallSummary ? fmt(overallSummary.totalSIP) : null },
                            { label: 'Total Invested', value: fmt(displaySummary.totalInvested), original: selectedStrategy && overallSummary ? fmt(overallSummary.totalInvested) : null },
                            { label: 'Total Profit Earned', value: fmt(displaySummary.totalProfit), original: selectedStrategy && overallSummary ? fmt(overallSummary.totalProfit) : null },
                            { label: 'Total Corpus', value: fmt(displaySummary.totalCorpus), original: selectedStrategy && overallSummary ? fmt(overallSummary.totalCorpus) : null },
                        ].map((m, i) => (
                            <div key={i} className="skpi">
                                <div className="skpi-label">{m.label}</div>
                                {m.original ? (
                                    <div className="skpi-value">
                                        <span style={{ textDecoration: 'line-through', color: 'var(--ink-ghost)', fontSize: '14px', marginRight: '8px' }}>{m.original}</span>
                                        <span style={{ color: 'var(--green)' }}>{m.value}</span>
                                    </div>
                                ) : (
                                    <div className="skpi-value">{m.value}</div>
                                )}
                            </div>
                        ))}
                    </div>
                    <div className="summary-note">
                        {selectedStrategy
                            ? `Values shown reflect the "${strategyResults?.find(s => s.id === selectedStrategy)?.name}" strategy. Original values are shown crossed out.`
                            : "Totals represent the sum of each goal's values at their respective end dates."
                        }
                    </div>
                </div>
            )}

            {/* ═══ Goal Detail Tabs ═══ */}
            {displayGoalResults.length > 0 && (() => {
                const activeId = activeGoalTab || displayGoalResults[0]?.id;
                const g = displayGoalResults.find(x => x.id === activeId) || displayGoalResults[0];
                if (!g) return null;
                return (
                    <div>
                        <div className="act-label">Goal Detail</div>

                        <div className="detail-tabs">
                            {displayGoalResults.map(goal => {
                                const isActive = goal.id === g.id;
                                return (
                                    <div key={goal.id} onClick={() => setActiveGoalTab(goal.id)} className={`detail-tab ${isActive ? 'active' : ''}`}>
                                        {goal.name}
                                    </div>
                                );
                            })}
                        </div>

                        <div>
                            <div className="goal-detail-header">
                                <div className="goal-detail-title">{g.name}</div>
                                <div className="goal-detail-meta">
                                    {g.years} years · {RISK_LABELS[g.riskLevel]} · {(g.blendedReturn * 100).toFixed(1)}% return
                                </div>
                            </div>

                            <div className="goal-kpis">
                                {[
                                    { label: 'Monthly SIP', value: fmt(g.sip) },
                                    { label: 'Total Invested', value: fmt(g.totalInvested) },
                                    { label: g.includeInflation ? 'Estimated Corpus (Adj.)' : 'Target Corpus (Base)', value: fmt(g.inflatedTarget) },
                                    { label: 'Wealth Gained', value: fmt(g.wealthGained) },
                                    { label: 'Blended Return', value: (g.blendedReturn * 100).toFixed(1) + '% p.a.' },
                                ].map((m, i) => (
                                    <div key={i} className="gkpi">
                                        <div className="gkpi-label">{m.label}</div>
                                        <div className="gkpi-value">{m.value}</div>
                                    </div>
                                ))}
                            </div>

                            <div className="alloc-section">
                                <div className="act-label">Asset Allocation</div>
                                <div className="alloc-bar-wrap">
                                    <div className="alloc-segment" style={{ flex: g.allocation.equity || 0.1, background: '#1C1A17' }}>
                                        {g.allocation.equity > 10 ? `Equity ${g.allocation.equity}%` : ''}
                                    </div>
                                    <div className="alloc-segment" style={{ flex: g.allocation.debt || 0.1, background: '#6B6760' }}>
                                        {g.allocation.debt > 10 ? `Debt ${g.allocation.debt}%` : ''}
                                    </div>
                                    <div className="alloc-segment" style={{ flex: g.allocation.commodity || 0.1, background: '#C4BFB8', color: 'var(--ink-soft)' }}>
                                        {g.allocation.commodity > 5 ? `${g.allocation.commodity}%` : ''}
                                    </div>
                                </div>
                                <div className="alloc-labels">
                                    <div className="alloc-label-item"><span>Equity {g.allocation.equity}%</span> @ {(g.riskLevel === 5 ? g.customEquityReturn : g.equityReturn * 100).toFixed(1)}%</div>
                                    <div className="alloc-label-item"><span>Debt {g.allocation.debt}%</span> @ {(g.riskLevel === 5 ? g.customDebtReturn : g.debtReturn * 100).toFixed(1)}%</div>
                                    <div className="alloc-label-item"><span>Commodity {g.allocation.commodity}%</span> @ {(g.riskLevel === 5 ? g.customCommodityReturn : g.commodityReturn * 100).toFixed(1)}%</div>
                                </div>
                            </div>

                            <div className="insight-box">
                                <div className="insight-text">{g.rationale}</div>
                            </div>

                            {/* Combo Chart */}
                            {g.yearlyData.length > 0 && (
                                <div style={{ marginBottom: '36px' }}>
                                    <div className="act-label">Growth Visualisation</div>
                                    <div style={{ padding: '24px', border: '0.5px solid var(--ink-ghost)', height: '360px' }}>
                                        <ResponsiveContainer width="100%" height="100%">
                                            <ComposedChart data={g.yearlyData} margin={{ top: 5, right: 0, left: -20, bottom: 5 }}>
                                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--ink-ghost)" opacity={0.5} />
                                                <XAxis dataKey="year" tick={{ fontFamily: 'Outfit', fontSize: 11, fill: 'var(--ink-soft)' }} axisLine={false} tickLine={false} dy={10} />
                                                <YAxis tick={{ fontFamily: 'Outfit', fontSize: 11, fill: 'var(--ink-soft)' }} axisLine={false} tickLine={false} tickFormatter={(v) => (v > 10000 ? (v / 100000).toFixed(1) + 'L' : v)} />
                                                <RechartsTooltip content={<ChartTooltip />} />
                                                <Bar dataKey="invested" name="Amount Invested" stackId="a" fill="#E8E3DA" />
                                                <Bar dataKey="profit" name="Profit Earned" stackId="a" fill="#4A7C59" />
                                                <Line type="monotone" dataKey="total" name="Total Corpus" stroke="#C4703A" strokeWidth={2} dot={{ r: 3, fill: '#C4703A', strokeWidth: 0 }} />
                                            </ComposedChart>
                                        </ResponsiveContainer>
                                    </div>
                                </div>
                            )}

                            {/* Breakdown Table */}
                            {(g.yearlyData.length > 0 || g.monthlyData.length > 0) && (
                                <div>
                                    <div className="breakdown-tabs">
                                        <div onClick={() => setActiveTableTab('yearly')} className={`breakdown-tab ${activeTableTab === 'yearly' ? 'active' : ''}`}>Yearly Breakdown</div>
                                        <div onClick={() => setActiveTableTab('monthly')} className={`breakdown-tab ${activeTableTab === 'monthly' ? 'active' : ''}`}>Monthly Breakdown</div>
                                    </div>
                                    <table className="breakdown-table">
                                        <thead>
                                            <tr>
                                                <th>{activeTableTab === 'yearly' ? 'Year' : 'Month'}</th>
                                                <th>Cumulative Invested</th>
                                                <th>Profit Earned</th>
                                                <th>Total Corpus</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {(activeTableTab === 'yearly' ? g.yearlyData : g.monthlyData).map((row, ri) => (
                                                <tr key={activeTableTab === 'yearly' ? row.year : row.month}>
                                                    <td>{activeTableTab === 'yearly' ? `Year ${row.year}` : `Month ${row.month}`}</td>
                                                    <td>{fmt(row.invested)}</td>
                                                    <td style={{ fontWeight: 500 }}>{fmt(row.profit)}</td>
                                                    <td style={{ fontWeight: 500, color: 'var(--ink)' }}>{fmt(row.total)}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </div>
                    </div>
                );
            })()}

            {/* ═══ Empty State ═══ */}
            {goals.length === 0 && !showForm && initialLoadDone && (
                <div style={{ textAlign: 'center', padding: '60px 20px', border: '0.5px solid var(--ink-ghost)' }}>
                    <div className="page-title" style={{ fontSize: '24px', marginBottom: '8px' }}>No goals added yet</div>
                    <div className="page-desc" style={{ marginBottom: '24px' }}>Start planning your financial future by adding your first goal.</div>

                    <div style={{ display: 'flex', justifyContent: 'center', gap: '12px' }}>
                        <button onClick={() => setShowForm(true)} className="btn-primary">+ Add First Goal</button>
                        <button onClick={() => fileInputRef.current?.click()} className="btn-ghost">↑ Import from Excel</button>
                    </div>
                    <div style={{ marginTop: '16px', fontSize: '13px', color: 'var(--ink-soft)' }}>
                        Need an Excel template? <button onClick={downloadSampleExcel} style={{ background: 'none', border: 'none', color: 'var(--accent)', cursor: 'pointer', padding: 0, textDecoration: 'underline' }}>Download it here</button>.
                    </div>
                </div>
            )}
        </div>
    );
}

export default GoalPlanner;
