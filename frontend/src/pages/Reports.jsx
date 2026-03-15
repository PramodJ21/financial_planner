import React, { useEffect, useState, useRef } from 'react';
import { fetchWithAuth } from '../api';
import { Download, CheckCircle, ChevronDown, ChevronUp } from 'lucide-react';

const fmt = (val) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(val || 0);

const PRIORITY_ORDER = ['critical', 'high', 'medium', 'low'];
const PRIORITY_LABELS = {
    critical: 'Immediate Action Required',
    high: 'High Priority',
    medium: 'Recommended',
    low: 'Good to Have'
};

function Reports() {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [expandedItems, setExpandedItems] = useState({});
    const [showReport, setShowReport] = useState(false);
    const reportRef = useRef(null);

    useEffect(() => {
        fetchWithAuth('/dashboard/full').then(setData).finally(() => setLoading(false));
    }, []);

    if (loading) return <div style={{ padding: '40px', textAlign: 'center', color: '#64748B' }}>Loading your financial plan...</div>;
    if (!data) return null;

    const { actionPlan } = data;

    const toggleExpand = (idx) => setExpandedItems(prev => ({ ...prev, [idx]: !prev[idx] }));

    const toggleStatus = async (idx, currStatus) => {
        try {
            const actionItem = data.actionPlan[idx];
            const updated = currStatus === 'pending' ? 'completed' : 'pending';
            const result = await fetchWithAuth(`/dashboard/action-plan/status`, {
                method: 'PUT', body: JSON.stringify({ title: actionItem.title, category: actionItem.category, status: updated })
            });
            const newData = JSON.parse(JSON.stringify(data)); // Deep copy
            newData.actionPlan[idx].status = updated;
            // Update FBS with completion bonus from backend
            if (result.updatedFbs !== null && result.updatedFbs !== undefined) {
                newData.overview.fbs = result.updatedFbs;
            }
            setData(newData);
        } catch (err) { alert('Failed to update status'); }
    };

    const completedCount = actionPlan.filter(a => a.status === 'completed').length;
    const totalCount = actionPlan.length;
    const progressPct = totalCount ? Math.round((completedCount / totalCount) * 100) : 0;

    // Group by urgency/priority
    const grouped = {};
    PRIORITY_ORDER.forEach(u => { grouped[u] = []; });
    actionPlan.forEach((a, idx) => {
        const key = a.urgency || 'medium';
        if (!grouped[key]) grouped[key] = [];
        grouped[key].push({ ...a, _idx: idx });
    });

    // Download report as HTML
    const downloadReport = () => {
        setShowReport(true);
        setTimeout(() => {
            if (!reportRef.current) return;
            const html = reportRef.current.innerHTML;
            const fullHtml = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Financial Action Plan Report - FinHealth</title>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
<style>
* { box-sizing: border-box; margin: 0; padding: 0; }
body { font-family: 'Inter', sans-serif; color: #1E293B; line-height: 1.6; background: #fff; padding: 40px; max-width: 800px; margin: 0 auto; }
h1 { font-size: 22px; font-weight: 700; margin-bottom: 4px; }
h2 { font-size: 16px; font-weight: 700; margin: 32px 0 16px; padding-bottom: 8px; border-bottom: 1px solid #E2E8F0; }
h3 { font-size: 13px; font-weight: 600; margin-bottom: 4px; }
p { font-size: 13px; color: #475569; margin-bottom: 8px; }
.subtitle { font-size: 12px; color: #64748B; margin-bottom: 24px; }
.summary-row { display: flex; gap: 24px; margin-bottom: 24px; }
.summary-card { flex: 1; border: 1px solid #E2E8F0; border-radius: 8px; padding: 16px; }
.summary-label { font-size: 10px; text-transform: uppercase; letter-spacing: 0.5px; color: #64748B; font-weight: 600; margin-bottom: 4px; }
.summary-value { font-size: 20px; font-weight: 700; }
.section-title { font-size: 14px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; margin: 28px 0 12px; padding-bottom: 8px; border-bottom: 1px solid #E2E8F0; }
.item { padding: 12px 0; border-bottom: 1px solid #F1F5F9; }
.item-title { font-size: 14px; font-weight: 600; margin-bottom: 4px; }
.item-desc { font-size: 12px; color: #475569; line-height: 1.6; }
.item-meta { display: flex; gap: 24px; margin-top: 8px; }
.meta-label { font-size: 10px; text-transform: uppercase; color: #94A3B8; font-weight: 600; }
.meta-value { font-size: 13px; font-weight: 600; }
.category-tag { font-size: 10px; text-transform: uppercase; letter-spacing: 0.3px; color: #64748B; font-weight: 600; }
.footer { margin-top: 40px; padding-top: 16px; border-top: 1px solid #E2E8F0; font-size: 11px; color: #94A3B8; text-align: center; }
.disclaimer { margin-top: 24px; padding: 16px; border: 1px solid #E2E8F0; border-radius: 8px; font-size: 11px; color: #64748B; line-height: 1.6; }
@media print { body { padding: 20px; } }
</style>
</head>
<body>${html}</body>
</html>`;
            const blob = new Blob([fullHtml], { type: 'text/html' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `FinHealth_Action_Plan_${new Date().toISOString().slice(0, 10)}.html`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
            setShowReport(false);
        }, 100);
    };

    return (
        <div className="page-content">
            {/* Header */}
            <div className="page-header" style={{ alignItems: 'flex-start' }}>
                <div>
                    <div className="page-title">Financial Action Plan</div>
                </div>
                <button className="btn-dark" onClick={downloadReport} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 16px' }}>
                    <Download size={16} /> Download Report
                </button>
            </div>

            {/* Progress Summary */}
            <div className="analysis-grid two-col">
                <div className="analysis-item">
                    <div className="analysis-item-header">
                        <span className="analysis-item-title">Progress</span>
                    </div>
                    <div className="analysis-value" style={{ marginTop: '8px' }}>{progressPct}%</div>
                    <div style={{ width: '100%', height: '4px', backgroundColor: 'var(--ink-ghost)', borderRadius: '2px', marginTop: '16px', overflow: 'hidden' }}>
                        <div style={{ width: `${progressPct}%`, height: '100%', backgroundColor: 'var(--ink)', borderRadius: '2px', transition: 'width 0.3s' }}></div>
                    </div>
                    <div className="analysis-sub" style={{ marginTop: '12px' }}>{completedCount} of {totalCount} completed</div>
                </div>
                <div className="analysis-item">
                    <div className="analysis-item-header">
                        <span className="analysis-item-title">Total Action Items</span>
                    </div>
                    <div className="analysis-value" style={{ marginTop: '8px' }}>{totalCount}</div>
                    <div className="analysis-sub" style={{ marginTop: '16px' }}>
                        {actionPlan.filter(a => a.status !== 'completed').length} pending
                    </div>
                </div>
            </div>

            {/* Priority Sections */}
            {PRIORITY_ORDER.map(urgency => {
                const items = grouped[urgency];
                if (!items || items.length === 0) return null;
                return (
                    <div key={urgency} className="action-group">
                        <div className="group-header">
                            <span className="group-title">{PRIORITY_LABELS[urgency]}</span>
                            <span className="group-count">{items.length} {items.length === 1 ? 'item' : 'items'}</span>
                        </div>
                        {items.map((action, idx) => {
                            const realIdx = action._idx;
                            const isExpanded = expandedItems[realIdx];
                            const isCompleted = action.status === 'completed';

                            return (
                                <React.Fragment key={realIdx}>
                                    <div className={`action-item ${isCompleted ? 'completed' : ''}`} onClick={() => toggleExpand(realIdx)}>
                                        <button
                                            className={`action-checkbox ${isCompleted ? 'checked' : ''}`}
                                            onClick={(e) => { e.stopPropagation(); toggleStatus(realIdx, action.status); }}
                                        >
                                            {isCompleted && <CheckCircle size={10} color="white" />}
                                        </button>

                                        <div>
                                            <div className="action-meta">{action.category}</div>
                                            <div className="action-title">
                                                {action.title}
                                                {action.fbsImpact > 0 && <span className="fbs-tag">+{action.fbsImpact} FBS Points</span>}
                                            </div>
                                        </div>

                                        <div className="action-amount">
                                            {action.suggestedAmount > 0 ? fmt(action.suggestedAmount) : ''}
                                        </div>

                                        <div className="action-chevron">
                                            {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                                        </div>
                                    </div>

                                    {isExpanded && (
                                        <div style={{ padding: '0 0 24px 54px', borderLeft: `2px solid ${isCompleted ? 'var(--green)' : 'var(--ink-ghost)'}`, marginLeft: 0, borderBottom: '0.5px solid var(--ink-ghost)', opacity: isCompleted ? 0.45 : 1 }}>
                                            {action.description && (
                                                <p style={{ fontSize: '13px', color: 'var(--ink-soft)', lineHeight: '1.6', margin: '4px 0 20px', fontWeight: 300 }}>
                                                    {action.description}
                                                </p>
                                            )}
                                            <div style={{ display: 'flex', gap: '48px', flexWrap: 'wrap' }}>
                                                {action.suggestedAmount > 0 && (
                                                    <div>
                                                        <div style={{ fontSize: '10px', color: 'var(--ink-ghost)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Target Amount</div>
                                                        <div style={{ fontSize: '16px', fontWeight: 400, color: 'var(--ink)', marginTop: '6px', fontFamily: "'Playfair Display', serif" }}>{fmt(action.suggestedAmount)}</div>
                                                    </div>
                                                )}
                                                {action.monthlyContribution > 0 && (
                                                    <div>
                                                        <div style={{ fontSize: '10px', color: 'var(--ink-ghost)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Monthly Contribution</div>
                                                        <div style={{ fontSize: '16px', fontWeight: 400, color: 'var(--ink)', marginTop: '6px', fontFamily: "'Playfair Display', serif" }}>{fmt(action.monthlyContribution)}</div>
                                                    </div>
                                                )}
                                                {action.currentPercent !== undefined && (
                                                    <div>
                                                        <div style={{ fontSize: '10px', color: 'var(--ink-ghost)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Current → Ideal</div>
                                                        <div style={{ fontSize: '16px', fontWeight: 400, color: 'var(--ink)', marginTop: '6px', fontFamily: "'Playfair Display', serif" }}>{action.currentPercent}% → {action.idealPercent}%</div>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    )}
                                </React.Fragment>
                            );
                        })}
                    </div>
                );
            })}

            {/* Disclaimer */}
            <div className="understanding" style={{ marginTop: '0px' }}>
                <div className="understanding-title" style={{ color: 'var(--ink-soft)' }}>Disclaimer</div>
                <div style={{ fontSize: '12px', color: 'var(--ink-soft)', lineHeight: '1.6', marginTop: '8px' }}>
                    <span style={{ fontWeight: 600 }}>Important:</span> This action plan is generated based on the financial data you have provided and is for informational purposes only. It does not constitute financial, investment, tax, or legal advice. Please consult a qualified financial advisor, tax consultant, or legal professional before making any financial decisions.
                </div>
            </div>

            {/* Hidden report for download */}
            {showReport && (
                <div style={{ position: 'absolute', left: '-9999px', top: 0 }}>
                    <div ref={reportRef}>
                        <h1>Financial Action Plan</h1>
                        <p className="subtitle">
                            Prepared on {new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })} · {data.profile?.full_name || 'Client'}
                        </p>
                        <div className="summary-row">
                            <div className="summary-card">
                                <div className="summary-label">Progress</div>
                                <div className="summary-value">{progressPct}%</div>
                                <div style={{ fontSize: '11px', color: '#94A3B8', marginTop: '4px' }}>{completedCount} of {totalCount} completed</div>
                            </div>
                            <div className="summary-card">
                                <div className="summary-label">Action Items</div>
                                <div className="summary-value">{totalCount}</div>
                                <div style={{ fontSize: '11px', color: '#94A3B8', marginTop: '4px' }}>{actionPlan.filter(a => a.status !== 'completed').length} pending</div>
                            </div>
                        </div>

                        {PRIORITY_ORDER.map(urgency => {
                            const items = grouped[urgency];
                            if (!items || items.length === 0) return null;
                            return (
                                <div key={urgency}>
                                    <div className="section-title">{PRIORITY_LABELS[urgency]}</div>
                                    {items.map((action, i) => (
                                        <div key={i} className="item">
                                            <div className="category-tag">{action.category}</div>
                                            <div className="item-title">
                                                {action.status === 'completed' ? '✓ ' : ''}{action.title}
                                            </div>
                                            <div className="item-desc">{action.description}</div>
                                            <div className="item-meta">
                                                {action.suggestedAmount > 0 && (
                                                    <div>
                                                        <div className="meta-label">Target Amount</div>
                                                        <div className="meta-value">{fmt(action.suggestedAmount)}</div>
                                                    </div>
                                                )}
                                                {action.monthlyContribution > 0 && (
                                                    <div>
                                                        <div className="meta-label">Monthly</div>
                                                        <div className="meta-value">{fmt(action.monthlyContribution)}</div>
                                                    </div>
                                                )}
                                                {action.currentPercent !== undefined && (
                                                    <div>
                                                        <div className="meta-label">Allocation</div>
                                                        <div className="meta-value">{action.currentPercent}% → {action.idealPercent}%</div>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            );
                        })}

                        <div className="disclaimer">
                            <strong>Disclaimer:</strong> This action plan is generated based on the financial data provided and is for informational purposes only. It does not constitute financial, investment, tax, or legal advice. Please consult a qualified financial advisor, tax consultant, or legal professional before making any financial decisions.
                        </div>
                        <div className="footer">
                            Generated by FinHealth · {new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

export default Reports;
