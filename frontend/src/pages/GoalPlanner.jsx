import React, { useState, useMemo, useEffect, useRef } from 'react';
import { fetchWithAuth } from '../api';
import {
    ComposedChart, Bar, Line, XAxis, YAxis, Tooltip as RechartsTooltip,
    ResponsiveContainer, CartesianGrid, Legend, Cell
} from 'recharts';
import { Plus, Trash2, Target, TrendingUp, AlertTriangle, Edit2, Download, UploadCloud, FileText } from 'lucide-react';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

// ═══════════════════════════════════════════════════
// CONSTANTS
// ═══════════════════════════════════════════════════

const INFLATION_RATE = 0.06;

const RISK_LABELS = ['Very Conservative', 'Conservative', 'Moderate', 'Aggressive', 'Very Aggressive'];
const RISK_COLORS = ['#64748B', '#3B82F6', '#10B981', '#F59E0B', '#EF4444'];

const GOAL_COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899', '#06B6D4', '#F97316'];

// ═══════════════════════════════════════════════════
// FORMATTING
// ═══════════════════════════════════════════════════

const fmt = (val) => {
    const n = Number(val) || 0;
    if (n >= 10000000) return '₹' + (n / 10000000).toFixed(2) + ' Cr';
    if (n >= 100000) return '₹' + (n / 100000).toFixed(2) + 'L';
    if (n >= 1000) return '₹' + (n / 1000).toFixed(1) + 'K';
    return '₹' + Math.round(n).toLocaleString('en-IN');
};

const fmtFull = (val) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(val || 0);

// ═══════════════════════════════════════════════════
// ALLOCATION ENGINE
// ═══════════════════════════════════════════════════

// Time horizon base allocations (60% weight)
function getTimeBase(years) {
    if (years <= 2) return { equity: 5, debt: 85, commodity: 10 };
    if (years <= 5) return { equity: 25, debt: 62, commodity: 13 };
    if (years <= 10) return { equity: 50, debt: 37, commodity: 13 };
    return { equity: 72, debt: 20, commodity: 8 };
}

// Risk level adjustments (40% weight) — riskLevel is 0-4 index
function getRiskAdj(riskLevel) {
    const adjustments = [
        { equity: -20, debt: 17, commodity: 3 },   // Very Conservative
        { equity: -10, debt: 8, commodity: 2 },     // Conservative
        { equity: 0, debt: 0, commodity: 0 },       // Moderate
        { equity: 10, debt: -8, commodity: -2 },    // Aggressive
        { equity: 20, debt: -17, commodity: -3 },   // Very Aggressive
    ];
    return adjustments[riskLevel] || adjustments[2];
}

// Hard caps by time horizon
function getHardCaps(years) {
    if (years <= 2) return { equityMax: 10, debtMin: 70 };
    if (years <= 5) return { equityMax: 40, debtMin: 45 };
    if (years <= 10) return { equityMax: 65, debtMin: 25 };
    return { equityMax: 85, debtMin: 10 };
}

// Per-asset expected returns by risk level
const ASSET_RETURNS = [
    { equity: 0.08, debt: 0.06, commodity: 0.045 },   // Very Conservative
    { equity: 0.095, debt: 0.065, commodity: 0.055 },  // Conservative
    { equity: 0.12, debt: 0.07, commodity: 0.07 },     // Moderate
    { equity: 0.14, debt: 0.075, commodity: 0.08 },    // Aggressive
    { equity: 0.16, debt: 0.08, commodity: 0.095 },    // Very Aggressive
];

// Main allocation function
function getGoalAllocation(years, riskLevel) {
    const base = getTimeBase(years);
    const adj = getRiskAdj(riskLevel);
    const caps = getHardCaps(years);

    // Step 1: Blend — 60% time base + 40% risk adjustment
    let equity = (base.equity * 0.6) + (adj.equity * 0.4);
    let debt = (base.debt * 0.6) + (adj.debt * 0.4);
    let commodity = (base.commodity * 0.6) + (adj.commodity * 0.4);

    // Step 2: Apply hard caps
    equity = Math.min(equity, caps.equityMax);
    debt = Math.max(debt, caps.debtMin);
    commodity = Math.max(5, Math.min(15, commodity));

    // No asset can be negative or exceed 90%
    equity = Math.max(0, Math.min(90, equity));
    debt = Math.max(0, Math.min(90, debt));
    commodity = Math.max(0, Math.min(90, commodity));

    // Step 3: Normalize to 100%
    const total = equity + debt + commodity;
    if (total > 0) {
        equity = Math.round(equity / total * 100);
        debt = Math.round(debt / total * 100);
        commodity = 100 - equity - debt; // ensure exact 100
    }

    return { equity, debt, commodity };
}

// Blended portfolio return
function getBlendedReturn(allocation, riskLevel) {
    const returns = ASSET_RETURNS[riskLevel] || ASSET_RETURNS[2];
    return (allocation.equity / 100) * returns.equity
        + (allocation.debt / 100) * returns.debt
        + (allocation.commodity / 100) * returns.commodity;
}

// ═══════════════════════════════════════════════════
// FINANCIAL CALCULATIONS
// ═══════════════════════════════════════════════════

function inflationAdjusted(target, years) {
    return target * Math.pow(1 + INFLATION_RATE, years);
}

function calcSIP(target, years, annualReturn) {
    if (years <= 0 || target <= 0) return 0;
    const rm = annualReturn / 12;
    const n = years * 12;
    if (rm === 0) return target / n;
    return target * rm / (Math.pow(1 + rm, n) - 1);
}

function corpusAtMonth(sip, months, annualReturn) {
    if (months <= 0 || sip <= 0) return 0;
    const rm = annualReturn / 12;
    if (rm === 0) return sip * months;
    return sip * (Math.pow(1 + rm, months) - 1) / rm;
}

// Generate per-year data for combo chart + yearly breakdown
function generateYearlyData(sip, years, annualReturn) {
    const data = [];
    const rm = annualReturn / 12;
    for (let y = 1; y <= years; y++) {
        const months = y * 12;
        const invested = Math.round(sip * 12 * y);
        const corpus = Math.round(corpusAtMonth(sip, months, annualReturn));
        const profit = Math.max(0, corpus - invested);
        data.push({ year: y, invested, profit, total: corpus });
    }
    return data;
}

function generateMonthlyData(sip, months, annualReturn) {
    const data = [];
    for (let m = 1; m <= months; m++) {
        const invested = Math.round(sip * m);
        const corpus = Math.round(corpusAtMonth(sip, m, annualReturn));
        const profit = Math.max(0, corpus - invested);
        data.push({ month: m, invested, profit, total: corpus });
    }
    return data;
}

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

    // Form state
    const [formName, setFormName] = useState('');
    const [formTarget, setFormTarget] = useState('');
    const [formYears, setFormYears] = useState('');
    const [formRisk, setFormRisk] = useState(2); // 0-4 index, default Moderate
    const [editingId, setEditingId] = useState(null);

    // ── Compute results for each goal ──
    const goalResults = useMemo(() => {
        return goals.map(g => {
            const allocation = getGoalAllocation(g.years, g.riskLevel);
            const blendedReturn = getBlendedReturn(allocation, g.riskLevel);
            const inflatedTarget = inflationAdjusted(g.target, g.years);
            const sip = calcSIP(inflatedTarget, g.years, blendedReturn);
            const totalInvested = sip * g.years * 12;
            const wealthGained = inflatedTarget - totalInvested;
            const yearlyData = generateYearlyData(sip, g.years, blendedReturn);
            const monthlyData = generateMonthlyData(sip, g.years * 12, blendedReturn);
            const highSip = sip > 100000;

            // Portfolio rationale
            let rationale = '';
            if (g.years <= 2) rationale = `Short-term goal — heavy debt allocation for stability, minimal equity exposure.`;
            else if (g.years <= 5) rationale = `Medium-term goal — balanced mix with moderate equity for growth potential.`;
            else if (g.years <= 10) rationale = `Long-term goal — equity-heavy allocation to leverage compounding returns.`;
            else rationale = `Very long-term goal — maximising equity exposure for superior wealth creation.`;
            rationale += ` ${RISK_LABELS[g.riskLevel]} risk profile applied.`;

            return {
                ...g,
                allocation,
                blendedReturn,
                inflatedTarget,
                sip,
                totalInvested,
                wealthGained,
                yearlyData,
                monthlyData,
                highSip,
                rationale,
                equityReturn: ASSET_RETURNS[g.riskLevel].equity,
                debtReturn: ASSET_RETURNS[g.riskLevel].debt,
                commodityReturn: ASSET_RETURNS[g.riskLevel].commodity,
            };
        });
    }, [goals]);

    // ── Overall summary ──
    const overallSummary = useMemo(() => {
        if (!goalResults.length) return null;
        return {
            totalSIP: goalResults.reduce((s, g) => s + g.sip, 0),
            totalInvested: goalResults.reduce((s, g) => s + g.totalInvested, 0),
            totalCorpus: goalResults.reduce((s, g) => s + g.inflatedTarget, 0),
            totalProfit: goalResults.reduce((s, g) => s + g.wealthGained, 0),
        };
    }, [goalResults]);

    // ── Handlers ──
    const addGoal = () => {
        if (!formName || !formTarget || !formYears) return;
        const newGoal = {
            id: editingId || Date.now(),
            name: formName,
            target: Number(formTarget), years: Number(formYears),
            riskLevel: formRisk
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
        setFormYears(''); setFormRisk(2); setEditingId(null); setShowForm(false);
    };

    const editGoal = (goal) => {
        setFormName(goal.name); setFormTarget(goal.target.toString());
        setFormYears(goal.years.toString()); setFormRisk(goal.riskLevel);
        setEditingId(goal.id); setShowForm(true);
    };
    const deleteGoal = (id) => setGoals(goals.filter(g => g.id !== id));

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
        if (goalResults.length === 0) return alert("Add at least one goal to export.");

        const exportData = goalResults.map(g => ({
            "Goal Name": g.name,
            "Target Amount": g.target,
            "Time Horizon (Years)": g.years,
            "Risk Level (0-4)": g.riskLevel
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

                if (data.length === 0) return alert("The uploaded file is empty.");

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
                        id: Date.now() + i, // Unique ID sequence
                        name: String(name).trim(),
                        target,
                        years,
                        riskLevel: risk
                    });
                });

                if (importedGoals.length > 0) {
                    setGoals(prev => [...prev, ...importedGoals]);
                    alert(`Successfully imported ${importedGoals.length} goals!`);
                } else {
                    alert("Could not find any valid goals in the file. Please check the format.");
                }
            } catch (err) {
                console.error(err);
                alert("Error parsing the file. Please ensure it's a valid Excel format.");
            }
            // Reset input so the same file can be uploaded again if needed
            if (fileInputRef.current) fileInputRef.current.value = "";
        };
        reader.readAsBinaryString(file);
    };

    const downloadPDF = () => {
        if (goalResults.length === 0) return alert("Add at least one goal to generate a report.");

        const doc = new jsPDF();
        const pageWidth = doc.internal.pageSize.getWidth();
        let currentY = 20;

        // Title
        doc.setFontSize(20);
        doc.setFont('helvetica', 'bold');
        doc.text("Financial Goal Plannning Report", pageWidth / 2, currentY, { align: 'center' });
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

    // ── Styles ──
    const cardS = { backgroundColor: '#FFFFFF', borderRadius: '12px', border: '1px solid #E8ECF1', padding: '20px', marginBottom: '16px' };
    const headerS = { fontSize: '16px', fontWeight: 700, color: '#1E293B', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' };
    const thS = { padding: '10px 12px', textAlign: 'left', fontSize: '12px', fontWeight: 600, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.5px', borderBottom: '2px solid #E8ECF1' };
    const tdS = { padding: '10px 12px', fontSize: '13px', color: '#334155', borderBottom: '1px solid #F1F5F9' };
    const inputS = { width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid #E2E8F0', fontSize: '14px', color: '#1E293B', outline: 'none', backgroundColor: '#FFFFFF' };
    const btnPrimary = { display: 'inline-flex', alignItems: 'center', gap: '6px', backgroundColor: '#1E293B', color: '#FFFFFF', padding: '10px 20px', borderRadius: '8px', border: 'none', fontSize: '14px', fontWeight: 600, cursor: 'pointer' };
    const labelS = { fontSize: '13px', fontWeight: 600, color: '#334155', marginBottom: '6px', display: 'block' };

    // ── Custom tooltip ──
    const ChartTooltip = ({ active, payload, label }) => {
        if (!active || !payload?.length) return null;
        return (
            <div style={{ backgroundColor: '#1E293B', borderRadius: '8px', padding: '10px 14px', color: '#FFFFFF', fontSize: '12px' }}>
                <div style={{ fontWeight: 700, marginBottom: '4px' }}>Year {label}</div>
                {payload.map((p, i) => (
                    <div key={i} style={{ color: p.color || '#94A3B8' }}>
                        {p.name}: {fmt(p.value)}
                    </div>
                ))}
            </div>
        );
    };

    return (
        <div style={{ padding: '24px', maxWidth: '1100px', margin: '0 auto', fontFamily: "'Inter', sans-serif" }}>
            {/* ═══ Header ═══ */}
            <div style={{ marginBottom: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px' }}>
                <div>
                    <h1 style={{ fontSize: '24px', fontWeight: 700, color: '#1E293B', margin: '0 0 6px 0', display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <Target size={24} /> Goal-Based Investment Planner
                    </h1>
                    <p style={{ fontSize: '14px', color: '#64748B', margin: 0 }}>Plan your financial goals with risk-appropriate asset allocations</p>
                </div>

                {/* Actions */}
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                    <button onClick={downloadPDF} style={{ ...btnPrimary, backgroundColor: '#F8FAFC', color: '#64748B', border: '1px solid #E8ECF1', fontSize: '12px', padding: '8px 14px' }}>
                        <FileText size={14} /> Export PDF
                    </button>
                    <button onClick={exportGoalsExcel} style={{ ...btnPrimary, backgroundColor: '#F8FAFC', color: '#64748B', border: '1px solid #E8ECF1', fontSize: '12px', padding: '8px 14px' }}>
                        <Download size={14} /> Export Excel
                    </button>
                    <button onClick={() => fileInputRef.current?.click()} style={{ ...btnPrimary, backgroundColor: '#F8FAFC', color: '#334155', border: '1px solid #E8ECF1', fontSize: '12px', padding: '8px 14px' }}>
                        <UploadCloud size={14} /> Import Excel
                    </button>
                    <button onClick={downloadSampleExcel} style={{ ...btnPrimary, backgroundColor: '#F8FAFC', color: '#64748B', border: '1px solid #E8ECF1', fontSize: '12px', padding: '8px 14px' }}>
                        Sample Format
                    </button>
                    <input
                        type="file"
                        ref={fileInputRef}
                        onChange={handleFileUpload}
                        accept=".xlsx, .xls, .csv"
                        style={{ display: 'none' }}
                    />
                </div>
            </div>

            {/* ═══ Monthly Budget (Dormant) ═══ */}
            <div style={{ ...cardS, display: 'flex', alignItems: 'center', gap: '16px', padding: '14px 20px', flexWrap: 'wrap' }}>
                <label style={{ fontSize: '14px', fontWeight: 600, color: '#334155', whiteSpace: 'nowrap' }}>Monthly Budget</label>
                <input
                    type="number" placeholder="Enter monthly budget (optional)"
                    value={budget} onChange={(e) => setBudget(e.target.value)}
                    style={{ ...inputS, maxWidth: '260px' }}
                />
                <span style={{ fontSize: '12px', color: '#94A3B8' }}>Budget planning coming soon</span>
            </div>

            {/* ═══ Goal Form ═══ */}
            {showForm && (
                <div style={cardS}>
                    <div style={headerS}>{editingId ? '✏️ Edit Goal' : '➕ Add New Goal'}</div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px', alignItems: 'end' }}>
                        {/* Name */}
                        <div>
                            <label style={labelS}>Goal Name</label>
                            <input value={formName} onChange={(e) => setFormName(e.target.value)} placeholder="e.g. Dream House" style={inputS} />
                        </div>
                        {/* Target */}
                        <div>
                            <label style={labelS}>Target Amount (₹)</label>
                            <input type="number" value={formTarget} onChange={(e) => setFormTarget(e.target.value)} placeholder="e.g. 10000000" style={inputS} />
                        </div>
                        {/* Years */}
                        <div>
                            <label style={labelS}>Time Horizon (Years)</label>
                            <input type="number" min="1" max="40" value={formYears} onChange={(e) => setFormYears(e.target.value)} placeholder="e.g. 10" style={inputS} />
                        </div>
                    </div>

                    {/* Risk Level + Allocation Preview */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '12px', marginTop: '12px', alignItems: 'end' }}>
                        <div>
                            <label style={labelS}>Risk Level</label>
                            <select value={formRisk} onChange={(e) => setFormRisk(Number(e.target.value))} style={inputS}>
                                {RISK_LABELS.map((label, i) => <option key={i} value={i}>{label}</option>)}
                            </select>
                        </div>
                        {formYears && (
                            <div style={{ padding: '10px 12px', backgroundColor: '#F8FAFC', borderRadius: '8px', border: '1px solid #E8ECF1', fontSize: '12px', color: '#64748B' }}>
                                {(() => {
                                    const alloc = getGoalAllocation(Number(formYears) || 1, formRisk);
                                    return (
                                        <>
                                            <span style={{ fontWeight: 600, color: '#334155', marginRight: '4px' }}>Allocation:</span>
                                            Equity {alloc.equity}% · Debt {alloc.debt}% · Commodity {alloc.commodity}%
                                        </>
                                    );
                                })()}
                            </div>
                        )}
                    </div>

                    {/* Buttons */}
                    <div style={{ display: 'flex', gap: '8px', marginTop: '16px' }}>
                        <button onClick={addGoal} style={btnPrimary}>
                            {editingId ? 'Update Goal' : 'Add Goal'}
                        </button>
                        <button onClick={resetForm} style={{ ...btnPrimary, backgroundColor: '#F1F5F9', color: '#64748B' }}>Cancel</button>
                    </div>
                </div>
            )}

            {/* ═══ Goals Table ═══ */}
            {goalResults.length > 0 && (
                <div style={cardS}>
                    <div style={{ ...headerS, justifyContent: 'space-between', flexWrap: 'wrap' }}>
                        <span>📋 Your Goals</span>
                        {!showForm && (
                            <button onClick={() => setShowForm(true)} style={{ ...btnPrimary, padding: '6px 14px', fontSize: '12px' }}>
                                <Plus size={14} /> Add Goal
                            </button>
                        )}
                    </div>
                    <div style={{ overflowX: 'auto' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                            <thead>
                                <tr>
                                    <th style={thS}>Goal</th>
                                    <th style={{ ...thS, textAlign: 'right' }}>Target</th>
                                    <th style={{ ...thS, textAlign: 'right' }}>Inflation Adj.</th>
                                    <th style={{ ...thS, textAlign: 'center' }}>Timeline</th>
                                    <th style={{ ...thS, textAlign: 'center' }}>Risk</th>
                                    <th style={{ ...thS, textAlign: 'center' }}>Allocation</th>
                                    <th style={{ ...thS, textAlign: 'right' }}>Return</th>
                                    <th style={{ ...thS, textAlign: 'right' }}>Monthly SIP</th>
                                    <th style={{ ...thS, textAlign: 'center' }}>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {goalResults.map((g, i) => (
                                    <tr key={g.id} style={{ backgroundColor: i % 2 === 0 ? '#FFFFFF' : '#FAFBFC' }}>
                                        <td style={tdS}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                <span style={{ fontWeight: 600 }}>{g.name}</span>
                                            </div>
                                        </td>
                                        <td style={{ ...tdS, textAlign: 'right' }}>{fmt(g.target)}</td>
                                        <td style={{ ...tdS, textAlign: 'right', color: '#D97706' }}>{fmt(g.inflatedTarget)}</td>
                                        <td style={{ ...tdS, textAlign: 'center' }}>{g.years}y</td>
                                        <td style={{ ...tdS, textAlign: 'center' }}>
                                            <span style={{ fontSize: '11px', fontWeight: 500, color: '#334155' }}>
                                                {RISK_LABELS[g.riskLevel]}
                                            </span>
                                        </td>
                                        <td style={{ ...tdS, textAlign: 'center', fontSize: '11px', color: '#64748B' }}>
                                            E:{g.allocation.equity}% · D:{g.allocation.debt}% · C:{g.allocation.commodity}%
                                        </td>
                                        <td style={{ ...tdS, textAlign: 'right', fontWeight: 600 }}>{(g.blendedReturn * 100).toFixed(1)}%</td>
                                        <td style={{ ...tdS, textAlign: 'right', fontWeight: 600 }}>
                                            {fmt(g.sip)}
                                            {g.highSip && <AlertTriangle size={13} color="#EF4444" style={{ marginLeft: '4px', verticalAlign: 'middle' }} />}
                                        </td>
                                        <td style={{ ...tdS, textAlign: 'center' }}>
                                            <div style={{ display: 'flex', gap: '4px', justifyContent: 'center' }}>
                                                <button onClick={() => editGoal(g)} title="Edit" style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px' }}>
                                                    <Edit2 size={14} color="#64748B" />
                                                </button>
                                                <button onClick={() => deleteGoal(g.id)} title="Delete" style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px' }}>
                                                    <Trash2 size={14} color="#EF4444" />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                    {/* High SIP warning */}
                    {goalResults.some(g => g.highSip) && (
                        <div style={{ marginTop: '12px', padding: '10px 14px', backgroundColor: '#FEF2F2', borderRadius: '8px', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: '#DC2626' }}>
                            <AlertTriangle size={16} />
                            <span><strong>High SIP detected</strong> — Consider increasing the time horizon or reducing the goal amount for flagged goals.</span>
                        </div>
                    )}
                </div>
            )}

            {/* ═══ Goal Detail Tabs ═══ */}
            {goalResults.length > 0 && (() => {
                const activeId = activeGoalTab || goalResults[0]?.id;
                const g = goalResults.find(x => x.id === activeId) || goalResults[0];
                if (!g) return null;
                return (
                    <div style={cardS}>
                        {/* Tab switcher */}
                        <div style={{ display: 'flex', gap: '0', borderBottom: '1px solid #E8ECF1', marginBottom: '20px', overflowX: 'auto' }}>
                            {goalResults.map(goal => {
                                const isActive = goal.id === g.id;
                                return (
                                    <button key={goal.id} onClick={() => setActiveGoalTab(goal.id)} style={{
                                        display: 'flex', alignItems: 'center', gap: '6px',
                                        padding: '10px 18px', fontSize: '13px', fontWeight: isActive ? 600 : 400,
                                        color: isActive ? '#1E293B' : '#94A3B8',
                                        borderBottom: isActive ? '2px solid #1E293B' : '2px solid transparent',
                                        background: 'none', border: 'none', borderBottomWidth: '2px', borderBottomStyle: 'solid',
                                        cursor: 'pointer', whiteSpace: 'nowrap', transition: 'all 0.15s'
                                    }}>
                                        {goal.name}
                                    </button>
                                );
                            })}
                        </div>

                        {/* Header */}
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '8px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <span style={{ fontSize: '16px', fontWeight: 700, color: '#1E293B' }}>{g.name}</span>
                            </div>
                            <span style={{ fontSize: '12px', color: '#94A3B8' }}>
                                {g.years} years · {RISK_LABELS[g.riskLevel]} · {(g.blendedReturn * 100).toFixed(1)}% return
                            </span>
                        </div>

                        {/* Metrics row */}
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '10px', marginBottom: '20px' }}>
                            {[
                                { label: 'Monthly SIP', value: fmt(g.sip) },
                                { label: 'Total Invested', value: fmt(g.totalInvested) },
                                { label: 'Estimated Corpus', value: fmt(g.inflatedTarget) },
                                { label: 'Wealth Gained', value: fmt(g.wealthGained) },
                                { label: 'Blended Return', value: (g.blendedReturn * 100).toFixed(1) + '% p.a.' },
                            ].map((m, i) => (
                                <div key={i} style={{ padding: '12px', borderRadius: '8px', backgroundColor: '#F8FAFC', border: '1px solid #E8ECF1' }}>
                                    <div style={{ fontSize: '10px', fontWeight: 600, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '4px' }}>{m.label}</div>
                                    <div style={{ fontSize: '17px', fontWeight: 700, color: '#1E293B' }}>{m.value}</div>
                                </div>
                            ))}
                        </div>

                        {/* Allocation bar */}
                        <div style={{ marginBottom: '16px' }}>
                            <div style={{ fontSize: '12px', fontWeight: 600, color: '#64748B', marginBottom: '6px' }}>Asset Allocation</div>
                            <div style={{ display: 'flex', borderRadius: '6px', overflow: 'hidden', height: '22px' }}>
                                <div style={{ width: `${g.allocation.equity}%`, backgroundColor: '#334155', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: g.allocation.equity < 10 ? '8px' : '10px', fontWeight: 600 }}>
                                    {g.allocation.equity && `Equity ${g.allocation.equity}%`}
                                </div>
                                <div style={{ width: `${g.allocation.debt}%`, backgroundColor: '#94A3B8', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: g.allocation.debt < 10 ? '8px' : '10px', fontWeight: 600 }}>
                                    {g.allocation.debt && `Debt ${g.allocation.debt}%`}
                                </div>
                                <div style={{ width: `${g.allocation.commodity}%`, backgroundColor: '#CBD5E1', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#334155', fontSize: g.allocation.commodity < 10 ? '8px' : '10px', fontWeight: 600 }}>
                                    {g.allocation.commodity && `Commodity ${g.allocation.commodity}%`}
                                </div>
                            </div>
                            <div style={{ display: 'flex', gap: '16px', marginTop: '6px', fontSize: '11px', color: '#64748B', flexWrap: 'wrap' }}>
                                <span>Equity {g.allocation.equity}% @ {(g.equityReturn * 100).toFixed(1)}%</span>
                                <span>Debt {g.allocation.debt}% @ {(g.debtReturn * 100).toFixed(1)}%</span>
                                <span>Commodity {g.allocation.commodity}% @ {(g.commodityReturn * 100).toFixed(1)}%</span>
                            </div>
                        </div>

                        {/* Rationale */}
                        <div style={{ padding: '10px 14px', backgroundColor: '#F8FAFC', borderRadius: '8px', fontSize: '13px', color: '#64748B', marginBottom: '20px', borderLeft: '3px solid #CBD5E1' }}>
                            {g.rationale}
                        </div>

                        {/* Combo Chart */}
                        {g.yearlyData.length > 0 && (
                            <div style={{ marginBottom: '20px' }}>
                                <div style={{ fontSize: '13px', fontWeight: 600, color: '#334155', marginBottom: '10px' }}>Growth Visualization</div>
                                <ResponsiveContainer width="100%" height={300}>
                                    <ComposedChart data={g.yearlyData} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
                                        <CartesianGrid strokeDasharray="3 3" stroke="#E8ECF1" />
                                        <XAxis dataKey="year" tick={{ fontSize: 11, fill: '#64748B' }} />
                                        <YAxis tick={{ fontSize: 11, fill: '#64748B' }} tickFormatter={(v) => fmt(v)} />
                                        <RechartsTooltip content={<ChartTooltip />} />
                                        <Legend wrapperStyle={{ fontSize: '11px' }} />
                                        <Bar dataKey="invested" name="Amount Invested" stackId="a" fill="#CBD5E1" radius={[0, 0, 0, 0]} />
                                        <Bar dataKey="profit" name="Profit Earned" stackId="a" fill="#64748B" radius={[4, 4, 0, 0]} />
                                        <Line type="monotone" dataKey="total" name="Total Corpus" stroke="#1E293B" strokeWidth={2} dot={{ r: 3, fill: '#1E293B' }} />
                                    </ComposedChart>
                                </ResponsiveContainer>
                            </div>
                        )}

                        {/* Breakdown Table (Yearly / Monthly Tabs) */}
                        {(g.yearlyData.length > 0 || g.monthlyData.length > 0) && (
                            <div>
                                <div style={{ display: 'flex', gap: '12px', borderBottom: '1px solid #E8ECF1', marginBottom: '10px' }}>
                                    <button onClick={() => setActiveTableTab('yearly')} style={{
                                        background: 'none', border: 'none', padding: '8px 12px', fontSize: '13px', fontWeight: activeTableTab === 'yearly' ? 600 : 400,
                                        color: activeTableTab === 'yearly' ? '#1E293B' : '#94A3B8',
                                        borderBottom: activeTableTab === 'yearly' ? '2px solid #1E293B' : '2px solid transparent',
                                        cursor: 'pointer', transition: 'all 0.15s'
                                    }}>Yearly Breakdown</button>
                                    <button onClick={() => setActiveTableTab('monthly')} style={{
                                        background: 'none', border: 'none', padding: '8px 12px', fontSize: '13px', fontWeight: activeTableTab === 'monthly' ? 600 : 400,
                                        color: activeTableTab === 'monthly' ? '#1E293B' : '#94A3B8',
                                        borderBottom: activeTableTab === 'monthly' ? '2px solid #1E293B' : '2px solid transparent',
                                        cursor: 'pointer', transition: 'all 0.15s'
                                    }}>Monthly Breakdown</button>
                                </div>
                                <div style={{ overflowX: 'auto', maxHeight: '300px', overflowY: 'auto' }}>
                                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                                        <thead style={{ position: 'sticky', top: 0, backgroundColor: '#FFFFFF' }}>
                                            <tr>
                                                <th style={thS}>{activeTableTab === 'yearly' ? 'Year' : 'Month'}</th>
                                                <th style={{ ...thS, textAlign: 'right' }}>Cumulative Invested</th>
                                                <th style={{ ...thS, textAlign: 'right' }}>Profit Earned</th>
                                                <th style={{ ...thS, textAlign: 'right' }}>Total Corpus</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {(activeTableTab === 'yearly' ? g.yearlyData : g.monthlyData).map((row, ri) => (
                                                <tr key={activeTableTab === 'yearly' ? row.year : row.month} style={{ backgroundColor: ri % 2 === 0 ? '#FFFFFF' : '#FAFBFC' }}>
                                                    <td style={tdS}>{activeTableTab === 'yearly' ? `Year ${row.year}` : `Month ${row.month}`}</td>
                                                    <td style={{ ...tdS, textAlign: 'right' }}>{fmt(row.invested)}</td>
                                                    <td style={{ ...tdS, textAlign: 'right', fontWeight: 600 }}>{fmt(row.profit)}</td>
                                                    <td style={{ ...tdS, textAlign: 'right', fontWeight: 700 }}>{fmt(row.total)}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        )}
                    </div>
                );
            })()}

            {/* ═══ Overall Summary ═══ */}
            {overallSummary && goalResults.length > 0 && (
                <div style={{ ...cardS, borderTop: '2px solid #1E293B' }}>
                    <div style={headerS}>
                        <TrendingUp size={16} />
                        <span>Overall Summary</span>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '10px' }}>
                        {[
                            { label: 'Total Monthly SIP', value: fmt(overallSummary.totalSIP) },
                            { label: 'Total Amount Invested', value: fmt(overallSummary.totalInvested) },
                            { label: 'Total Profit Earned', value: fmt(overallSummary.totalProfit) },
                            { label: 'Total Corpus', value: fmt(overallSummary.totalCorpus) },
                        ].map((m, i) => (
                            <div key={i} style={{ padding: '14px', borderRadius: '8px', backgroundColor: '#F8FAFC', border: '1px solid #E8ECF1', textAlign: 'center' }}>
                                <div style={{ fontSize: '10px', fontWeight: 600, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '4px' }}>{m.label}</div>
                                <div style={{ fontSize: '20px', fontWeight: 700, color: '#1E293B' }}>{m.value}</div>
                            </div>
                        ))}
                    </div>
                    <div style={{ marginTop: '10px', fontSize: '11px', color: '#94A3B8', textAlign: 'center' }}>
                        Totals represent the sum of each goal's values at their respective end dates.
                    </div>
                </div>
            )}

            {/* ═══ Empty State ═══ */}
            {goals.length === 0 && !showForm && (
                <div style={{ ...cardS, textAlign: 'center', padding: '60px 20px', color: '#94A3B8' }}>
                    <Target size={40} strokeWidth={1.2} style={{ marginBottom: '12px', color: '#CBD5E1' }} />
                    <div style={{ fontSize: '16px', fontWeight: 600, color: '#64748B', marginBottom: '8px' }}>No goals added yet</div>
                    <div style={{ fontSize: '13px', marginBottom: '20px' }}>Start planning your financial future by adding your first goal.</div>

                    <div style={{ display: 'flex', justifyContent: 'center', gap: '12px' }}>
                        <button onClick={() => setShowForm(true)} style={btnPrimary}>
                            <Plus size={16} /> Add First Goal
                        </button>
                        <button onClick={() => fileInputRef.current?.click()} style={{ ...btnPrimary, backgroundColor: '#F8FAFC', color: '#334155', border: '1px solid #E8ECF1' }}>
                            <UploadCloud size={16} /> Import from Excel
                        </button>
                    </div>
                    <div style={{ marginTop: '16px', fontSize: '12px' }}>
                        Need an Excel template? <button onClick={downloadSampleExcel} style={{ background: 'none', border: 'none', color: '#3B82F6', cursor: 'pointer', padding: 0, textDecoration: 'underline' }}>Download it here</button>.
                    </div>
                </div>
            )}
        </div>
    );
}

export default GoalPlanner;
