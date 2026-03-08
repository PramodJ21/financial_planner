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
            await fetchWithAuth(`/dashboard/action-plan/status`, {
                method: 'PUT', body: JSON.stringify({ title: actionItem.title, category: actionItem.category, status: updated })
            });
            const newData = { ...data };
            newData.actionPlan[idx].status = updated;
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
<title>Financial Action Plan Report — FinHealth</title>
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
        <div style={{ display: 'flex', justifyContent: 'center', padding: '20px 0' }}>
            <div style={{ maxWidth: '900px', width: '100%', fontFamily: "'Inter', sans-serif" }}>
                {/* Header */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '12px' }}>
                    <div>
                        <h1 style={{ fontSize: '20px', fontWeight: 700, color: '#1E293B', margin: 0 }}>Financial Action Plan</h1>
                        <p style={{ fontSize: '13px', color: '#64748B', margin: '4px 0 0' }}>
                            Personalised recommendations · {new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}
                        </p>
                    </div>
                    <button
                        onClick={downloadReport}
                        style={{
                            display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 20px',
                            border: '1px solid #E2E8F0', borderRadius: '8px', backgroundColor: 'white',
                            fontSize: '13px', fontWeight: 600, color: '#1E293B', cursor: 'pointer'
                        }}
                    >
                        <Download size={16} /> Download Report
                    </button>
                </div>

                {/* Progress Summary */}
                <div className="stat-row" style={{ marginBottom: '24px' }}>
                    <div className="card" style={{ flex: 1, padding: '20px' }}>
                        <div style={{ fontSize: '10px', color: '#64748B', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '8px' }}>Progress</div>
                        <div style={{ fontSize: '24px', fontWeight: 700, color: '#1E293B' }}>{progressPct}%</div>
                        <div style={{ width: '100%', height: '4px', backgroundColor: '#E2E8F0', borderRadius: '2px', marginTop: '8px' }}>
                            <div style={{ width: `${progressPct}%`, height: '100%', backgroundColor: '#1E293B', borderRadius: '2px', transition: 'width 0.3s' }}></div>
                        </div>
                        <div style={{ fontSize: '11px', color: '#94A3B8', marginTop: '6px' }}>{completedCount} of {totalCount} completed</div>
                    </div>
                    <div className="card" style={{ flex: 1, padding: '20px' }}>
                        <div style={{ fontSize: '10px', color: '#64748B', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '8px' }}>Total Action Items</div>
                        <div style={{ fontSize: '24px', fontWeight: 700, color: '#1E293B' }}>{totalCount}</div>
                        <div style={{ fontSize: '11px', color: '#94A3B8', marginTop: '14px' }}>
                            {actionPlan.filter(a => a.status !== 'completed').length} pending
                        </div>
                    </div>
                </div>

                {/* Priority Sections */}
                {PRIORITY_ORDER.map(urgency => {
                    const items = grouped[urgency];
                    if (!items || items.length === 0) return null;
                    return (
                        <div key={urgency} style={{ marginBottom: '32px' }}>
                            {/* Section Header */}
                            <div style={{
                                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                                paddingBottom: '10px', marginBottom: '12px',
                                borderBottom: '1px solid #E2E8F0'
                            }}>
                                <div style={{ fontSize: '13px', fontWeight: 700, color: '#1E293B', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                                    {PRIORITY_LABELS[urgency]}
                                </div>
                                <div style={{ fontSize: '12px', color: '#94A3B8', fontWeight: 500 }}>
                                    {items.length} {items.length === 1 ? 'item' : 'items'}
                                </div>
                            </div>

                            {/* Items */}
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                {items.map((action) => {
                                    const realIdx = action._idx;
                                    const isExpanded = expandedItems[realIdx];
                                    const isCompleted = action.status === 'completed';

                                    return (
                                        <div key={realIdx} className="card" style={{
                                            padding: 0, overflow: 'hidden',
                                            opacity: isCompleted ? 0.5 : 1,
                                            borderLeft: `3px solid ${isCompleted ? '#E2E8F0' : '#1E293B'}`
                                        }}>
                                            {/* Row */}
                                            <div style={{
                                                display: 'flex', alignItems: 'center', padding: '16px 20px', gap: '14px',
                                                cursor: 'pointer'
                                            }}
                                                onClick={() => toggleExpand(realIdx)}
                                            >
                                                {/* Checkbox */}
                                                <button onClick={(e) => { e.stopPropagation(); toggleStatus(realIdx, action.status); }}
                                                    style={{
                                                        width: '22px', height: '22px', borderRadius: '4px', flexShrink: 0,
                                                        border: isCompleted ? 'none' : '2px solid #CBD5E1',
                                                        backgroundColor: isCompleted ? '#1E293B' : 'transparent',
                                                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                        cursor: 'pointer', padding: 0
                                                    }}
                                                >
                                                    {isCompleted && <CheckCircle size={14} color="white" />}
                                                </button>

                                                {/* Title & Category */}
                                                <div style={{ flex: 1, minWidth: 0 }}>
                                                    <div style={{ fontSize: '10px', fontWeight: 600, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.3px', marginBottom: '2px' }}>
                                                        {action.category}
                                                    </div>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                                                        <div style={{
                                                            fontSize: '14px', fontWeight: 600, color: '#1E293B',
                                                            textDecoration: isCompleted ? 'line-through' : 'none'
                                                        }}>
                                                            {action.title}
                                                        </div>
                                                        {action.fbsImpact > 0 && (
                                                            <div style={{
                                                                fontSize: '10px', fontWeight: 700, color: '#10B981',
                                                                backgroundColor: '#ECFDF5', padding: '2px 6px', borderRadius: '4px',
                                                                border: '1px solid #A7F3D0'
                                                            }}>
                                                                +{action.fbsImpact} FBS Points
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>

                                                {/* Amount */}
                                                {action.suggestedAmount > 0 && (
                                                    <div style={{ textAlign: 'right', flexShrink: 0 }}>
                                                        <div style={{ fontSize: '15px', fontWeight: 700, color: '#1E293B' }}>
                                                            {fmt(action.suggestedAmount)}
                                                        </div>
                                                    </div>
                                                )}

                                                {/* Expand */}
                                                <div style={{ flexShrink: 0, color: '#CBD5E1' }}>
                                                    {isExpanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                                                </div>
                                            </div>

                                            {/* Expanded */}
                                            {isExpanded && (
                                                <div style={{ padding: '0 20px 16px 56px', borderTop: '1px solid #F1F5F9' }}>
                                                    <div style={{ paddingTop: '12px' }}>
                                                        {action.description && (
                                                            <p style={{ fontSize: '13px', color: '#475569', lineHeight: '1.7', margin: '0 0 12px' }}>
                                                                {action.description}
                                                            </p>
                                                        )}
                                                        <div style={{ display: 'flex', gap: '32px', flexWrap: 'wrap' }}>
                                                            {action.suggestedAmount > 0 && (
                                                                <div>
                                                                    <div style={{ fontSize: '10px', color: '#94A3B8', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.3px' }}>Target Amount</div>
                                                                    <div style={{ fontSize: '14px', fontWeight: 700, color: '#1E293B', marginTop: '2px' }}>{fmt(action.suggestedAmount)}</div>
                                                                </div>
                                                            )}
                                                            {action.monthlyContribution > 0 && (
                                                                <div>
                                                                    <div style={{ fontSize: '10px', color: '#94A3B8', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.3px' }}>Monthly Contribution</div>
                                                                    <div style={{ fontSize: '14px', fontWeight: 700, color: '#1E293B', marginTop: '2px' }}>{fmt(action.monthlyContribution)}</div>
                                                                </div>
                                                            )}
                                                            {action.currentPercent !== undefined && (
                                                                <div>
                                                                    <div style={{ fontSize: '10px', color: '#94A3B8', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.3px' }}>Current → Ideal</div>
                                                                    <div style={{ fontSize: '14px', fontWeight: 700, color: '#1E293B', marginTop: '2px' }}>{action.currentPercent}% → {action.idealPercent}%</div>
                                                                </div>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    );
                })}

                {/* Disclaimer */}
                <div style={{
                    padding: '16px 20px', border: '1px solid #E2E8F0', borderRadius: '8px',
                    fontSize: '11px', color: '#94A3B8', lineHeight: '1.7', marginTop: '16px'
                }}>
                    <span style={{ fontWeight: 600, color: '#64748B' }}>Disclaimer:</span> This action plan is generated based on the financial data you have provided and is for informational purposes only. It does not constitute financial, investment, tax, or legal advice. Please consult a qualified financial advisor, tax consultant, or legal professional before making any financial decisions.
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
