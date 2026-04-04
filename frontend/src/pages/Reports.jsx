import { useEffect, useState } from 'react';
import { fetchWithAuth } from '../api';
import { Download, CheckCircle, ChevronDown, ChevronUp } from 'lucide-react';
import { Link } from 'react-router-dom';
import '../styles/reports.css';
import { fmtFull as fmt } from '../utils/formatCurrency';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

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
    const [error, setError] = useState('');

    useEffect(() => {
        fetchWithAuth('/dashboard/full').then(setData).finally(() => setLoading(false));
    }, []);

    /* R8: Branded loading state */
    if (loading) return (
        <div className="reports-loading">
            <div className="reports-loading-box"><span>FH</span></div>
            <div className="reports-loading-text">Loading your financial plan...</div>
        </div>
    );

    /* R9: Branded empty state instead of returning null */
    if (!data) return (
        <div className="reports-empty">
            <div className="reports-empty-title">No action plan data available</div>
            <Link to="/questionnaire" className="reports-empty-link">Complete your questionnaire to get started</Link>
        </div>
    );

    const { actionPlan } = data;
    const fbs = data.overview?.fbs ?? 0;

    const toggleExpand = (idx) => setExpandedItems(prev => ({ ...prev, [idx]: !prev[idx] }));

    const toggleStatus = async (idx, currStatus) => {
        try {
            setError('');
            const actionItem = data.actionPlan[idx];
            const updated = currStatus === 'pending' ? 'completed' : 'pending';
            const result = await fetchWithAuth('/dashboard/action-plan/status', {
                method: 'PUT', body: JSON.stringify({ title: actionItem.title, category: actionItem.category, status: updated })
            });
            /* R1: structuredClone instead of JSON.parse(JSON.stringify()) */
            const newData = structuredClone(data);
            newData.actionPlan[idx].status = updated;
            if (result.updatedFbs !== null && result.updatedFbs !== undefined) {
                newData.overview.fbs = result.updatedFbs;
            }
            setData(newData);
        } catch {
            /* R2: Inline error instead of alert() */
            setError('Failed to update status. Please try again.');
        }
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

    const downloadReport = () => {
        const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
        const userName = data.user?.fullName || 'Client';
        const dateStr = new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' });
        const pageWidth = doc.internal.pageSize.getWidth();
        const margin = 18;
        let y = 18;

        // ── Header ──
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(18);
        doc.setTextColor(28, 26, 23);
        doc.text('FinHealth — Financial Action Plan', margin, y);
        y += 8;
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(10);
        doc.setTextColor(107, 103, 96);
        doc.text(`Prepared for ${userName} · ${dateStr}`, margin, y);
        y += 12;

        // ── Summary row ──
        autoTable(doc, {
            startY: y,
            margin: { left: margin, right: margin },
            head: [['FBS Score', 'Progress', 'Total Action Items']],
            body: [[
                `${fbs} / 100`,
                `${progressPct}% (${completedCount} of ${totalCount} completed)`,
                `${totalCount} (${actionPlan.filter(a => a.status !== 'completed').length} pending)`,
            ]],
            styles: { fontSize: 11, cellPadding: 5, halign: 'center' },
            headStyles: { fillColor: [28, 26, 23], textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 9 },
            theme: 'grid',
        });
        y = doc.lastAutoTable.finalY + 12;

        // ── Priority sections ──
        const URGENCY_COLORS = {
            critical: [201, 64, 64],
            high:     [196, 112, 58],
            medium:   [74, 124, 89],
            low:      [107, 103, 96],
        };

        PRIORITY_ORDER.forEach(urgency => {
            const items = grouped[urgency];
            if (!items || items.length === 0) return;

            doc.setFont('helvetica', 'bold');
            doc.setFontSize(11);
            const [r, g, b] = URGENCY_COLORS[urgency] || [28, 26, 23];
            doc.setTextColor(r, g, b);
            doc.text(PRIORITY_LABELS[urgency].toUpperCase(), margin, y);
            y += 6;

            const tableBody = items.map(action => [
                action.category || '',
                action.title,
                action.fbsImpact > 0 ? `+${action.fbsImpact} pts` : '—',
                action.suggestedAmount > 0 ? fmt(action.suggestedAmount) : '—',
                action.status === 'completed' ? 'Done' : 'Pending',
            ]);

            autoTable(doc, {
                startY: y,
                margin: { left: margin, right: margin },
                head: [['Category', 'Action', 'FBS Impact', 'Amount', 'Status']],
                body: tableBody,
                styles: { fontSize: 9, cellPadding: 4, overflow: 'linebreak' },
                headStyles: { fillColor: [237, 231, 220], textColor: [28, 26, 23], fontStyle: 'bold' },
                columnStyles: {
                    0: { cellWidth: 28 },
                    1: { cellWidth: 'auto' },
                    2: { cellWidth: 22, halign: 'center' },
                    3: { cellWidth: 28, halign: 'right' },
                    4: { cellWidth: 18, halign: 'center' },
                },
                theme: 'striped',
                alternateRowStyles: { fillColor: [250, 248, 245] },
                didParseCell: (hookData) => {
                    if (hookData.column.index === 4 && hookData.cell.raw === 'Done') {
                        hookData.cell.styles.textColor = [74, 124, 89];
                    }
                },
            });
            y = doc.lastAutoTable.finalY + 10;
        });

        // ── Disclaimer ──
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(8);
        doc.setTextColor(160, 155, 148);
        const disclaimer = 'This action plan is for informational purposes only and does not constitute financial, investment, tax, or legal advice. Consult a qualified professional before making any financial decisions.';
        const lines = doc.splitTextToSize(disclaimer, pageWidth - margin * 2);
        doc.text(lines, margin, y + 6);

        doc.save(`FinHealth_Action_Plan_${new Date().toISOString().slice(0, 10)}.pdf`);
    };

    return (
        <div className="reports-content">
            {/* Header */}
            <div className="reports-header" style={{ alignItems: 'flex-start' }}>
                <div>
                    <h1 className="reports-title">Financial Action Plan</h1>
                </div>
                <button className="reports-btn-dark" onClick={downloadReport} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 16px' }}>
                    <Download size={16} /> Download Report
                </button>
            </div>

            {/* R2: Inline error banner */}
            {error && <div className="reports-error">{error}</div>}

            {/* R11: FBS Score + Progress Summary */}
            <div className="reports-analysis-grid" style={{ gridTemplateColumns: 'repeat(3, 1fr)' }}>
                <div className="reports-analysis-item">
                    <div className="reports-analysis-item-header">
                        <span className="reports-analysis-item-title">FBS Score</span>
                    </div>
                    {/* R11: Show current FBS so users see impact of completing items */}
                    <div className="reports-analysis-value reports-ok" style={{ marginTop: '8px' }}>{fbs}</div>
                    <div className="reports-analysis-sub" style={{ marginTop: '12px' }}>Financial Behaviour Score</div>
                </div>
                <div className="reports-analysis-item">
                    <div className="reports-analysis-item-header">
                        <span className="reports-analysis-item-title">Progress</span>
                    </div>
                    {/* R10: Progress percentage with green color instead of default red */}
                    <div className="reports-analysis-value" style={{ marginTop: '8px', color: progressPct >= 50 ? 'var(--green)' : 'var(--accent)' }}>{progressPct}%</div>
                    <div className="reports-progress-bar">
                        <div className="reports-progress-fill" style={{ width: `${progressPct}%` }}></div>
                    </div>
                    <div className="reports-analysis-sub" style={{ marginTop: '12px' }}>{completedCount} of {totalCount} completed</div>
                </div>
                <div className="reports-analysis-item">
                    <div className="reports-analysis-item-header">
                        <span className="reports-analysis-item-title">Total Action Items</span>
                    </div>
                    <div className="reports-analysis-value reports-ok" style={{ marginTop: '8px' }}>{totalCount}</div>
                    <div className="reports-analysis-sub" style={{ marginTop: '16px' }}>
                        {actionPlan.filter(a => a.status !== 'completed').length} pending
                    </div>
                </div>
            </div>

            {/* Priority Sections */}
            {PRIORITY_ORDER.map(urgency => {
                const items = grouped[urgency];
                if (!items || items.length === 0) return null;
                return (
                    <div key={urgency} className="reports-action-group">
                        <div className="reports-group-header">
                            <span className="reports-group-title">{PRIORITY_LABELS[urgency]}</span>
                            <span className="reports-group-count">{items.length} {items.length === 1 ? 'item' : 'items'}</span>
                        </div>
                        {items.map((action) => {
                            const realIdx = action._idx;
                            const isExpanded = expandedItems[realIdx];
                            const isCompleted = action.status === 'completed';

                            return (
                                <div key={realIdx}>
                                    <div className={`reports-action-item ${isCompleted ? 'reports-completed' : ''}`} onClick={() => toggleExpand(realIdx)}>
                                        <button
                                            className={`reports-action-checkbox ${isCompleted ? 'reports-checked' : ''}`}
                                            onClick={(e) => { e.stopPropagation(); toggleStatus(realIdx, action.status); }}
                                        >
                                            {isCompleted && <CheckCircle size={10} color="white" />}
                                        </button>

                                        <div>
                                            <div className="reports-action-meta">{action.category}</div>
                                            <div className="reports-action-title">
                                                {action.title}
                                                {action.fbsImpact > 0 && <span className="reports-fbs-tag">+{action.fbsImpact} FBS Points</span>}
                                            </div>
                                        </div>

                                        <div className="reports-action-amount">
                                            {action.suggestedAmount > 0 ? fmt(action.suggestedAmount) : ''}
                                        </div>

                                        <div className="reports-action-chevron">
                                            {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                                        </div>
                                    </div>

                                    {/* R3: Expanded detail panel — CSS classes instead of inline styles */}
                                    {isExpanded && (
                                        <div className={`reports-action-detail ${isCompleted ? 'reports-done' : ''}`}>
                                            {action.description && (
                                                <p className="reports-action-detail-desc">{action.description}</p>
                                            )}
                                            <div className="reports-action-detail-kpis">
                                                {action.suggestedAmount > 0 && (
                                                    <div>
                                                        <div className="reports-action-detail-kpi-label">Target Amount</div>
                                                        <div className="reports-action-detail-kpi-value">{fmt(action.suggestedAmount)}</div>
                                                    </div>
                                                )}
                                                {action.monthlyContribution > 0 && (
                                                    <div>
                                                        <div className="reports-action-detail-kpi-label">Monthly Contribution</div>
                                                        <div className="reports-action-detail-kpi-value">{fmt(action.monthlyContribution)}</div>
                                                    </div>
                                                )}
                                                {action.currentPercent !== undefined && (
                                                    <div>
                                                        <div className="reports-action-detail-kpi-label">Current → Ideal</div>
                                                        <div className="reports-action-detail-kpi-value">{action.currentPercent}% → {action.idealPercent}%</div>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                );
            })}

            {/* Disclaimer */}
            <div className="reports-understanding" style={{ marginTop: '0px' }}>
                <div className="reports-understanding-title" style={{ color: 'var(--ink-soft)' }}>Disclaimer</div>
                <div style={{ fontSize: '15px', color: 'var(--ink-soft)', lineHeight: '1.7', marginTop: '8px' }}>
                    <span style={{ fontWeight: 600 }}>Important:</span> This action plan is generated based on the financial data you have provided and is for informational purposes only. It does not constitute financial, investment, tax, or legal advice. Please consult a qualified financial advisor, tax consultant, or legal professional before making any financial decisions.
                </div>
            </div>

        </div>
    );
}

export default Reports;
