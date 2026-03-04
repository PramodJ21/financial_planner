import React, { useEffect, useState } from 'react';
import { fetchWithAuth } from '../api';
import { Download, CheckCircle, AlertTriangle, Shield, Heart, TrendingDown, TrendingUp, Receipt, Calculator, BarChart3, Lock, Coins, FileText, Users, Award, Umbrella, ChevronDown, ChevronUp } from 'lucide-react';

const fmt = (val) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(val || 0);

const ICON_MAP = {
    'shield': Shield, 'heart': Heart, 'trending-down': TrendingDown, 'trending-up': TrendingUp,
    'receipt': Receipt, 'calculator': Calculator, 'bar-chart': BarChart3, 'lock': Lock,
    'coins': Coins, 'file-text': FileText, 'users': Users, 'award': Award, 'umbrella': Umbrella
};

const URGENCY_CONFIG = {
    critical: { bg: '#FEF2F2', border: '#FECACA', color: '#DC2626', label: 'Critical', dot: '#DC2626' },
    high: { bg: '#FFF7ED', border: '#FED7AA', color: '#EA580C', label: 'High Priority', dot: '#EA580C' },
    medium: { bg: '#F0FDF4', border: '#BBF7D0', color: '#16A34A', label: 'Recommended', dot: '#16A34A' },
    low: { bg: '#F8FAFC', border: '#E2E8F0', color: '#64748B', label: 'Optional', dot: '#94A3B8' }
};

const CATEGORY_COLORS = {
    'Emergency Fund': '#DC2626',
    'Insurance': '#7C3AED',
    'Debt Management': '#EA580C',
    'Tax Planning': '#0284C7',
    'Investment Planning': '#059669',
    'Estate Planning': '#6366F1',
    'Credit Health': '#D97706'
};

function Reports() {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [expandedItems, setExpandedItems] = useState({});
    const [filter, setFilter] = useState('all');

    useEffect(() => {
        fetchWithAuth('/dashboard/full').then(setData).finally(() => setLoading(false));
    }, []);

    if (loading) return <div style={{ padding: '40px', textAlign: 'center', color: '#64748B' }}>Loading your financial plan...</div>;
    if (!data) return null;

    const { actionPlan } = data;

    const toggleExpand = (idx) => setExpandedItems(prev => ({ ...prev, [idx]: !prev[idx] }));

    const toggleStatus = async (idx, currStatus) => {
        try {
            const updated = currStatus === 'pending' ? 'completed' : 'pending';
            await fetchWithAuth(`/dashboard/action-plan/${idx}/status`, {
                method: 'PUT', body: JSON.stringify({ status: updated })
            });
            const newData = { ...data };
            newData.actionPlan[idx].status = updated;
            setData(newData);
        } catch (err) { alert('Failed to update status'); }
    };

    // Group actions by category
    const categories = [...new Set(actionPlan.map(a => a.category))];
    const completedCount = actionPlan.filter(a => a.status === 'completed').length;
    const totalCount = actionPlan.length;
    const progressPct = totalCount ? Math.round((completedCount / totalCount) * 100) : 0;

    // Count by urgency
    const criticalCount = actionPlan.filter(a => a.urgency === 'critical' && a.status !== 'completed').length;
    const highCount = actionPlan.filter(a => a.urgency === 'high' && a.status !== 'completed').length;

    const filteredPlan = filter === 'all' ? actionPlan : actionPlan.filter(a => a.category === filter);

    return (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '40px 0' }}>
            <div style={{ maxWidth: '900px', width: '100%', fontFamily: "'Inter', sans-serif" }}>
                {/* Header */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                    <div>
                        <h1 style={{ fontSize: '20px', fontWeight: 700, color: '#1E293B', margin: 0 }}>Your Financial Action Plan</h1>
                        <p style={{ fontSize: '13px', color: '#64748B', margin: '4px 0 0' }}>Personalized recommendations based on your financial profile</p>
                    </div>
                    <button style={{
                        display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 20px',
                        border: '1px solid #E2E8F0', borderRadius: '8px', backgroundColor: 'white',
                        fontSize: '13px', fontWeight: 600, color: '#1E293B', cursor: 'pointer'
                    }}>
                        <Download size={16} /> Download Report
                    </button>
                </div>

                {/* Progress Overview */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', marginBottom: '24px' }}>
                    {/* Overall Progress */}
                    <div className="card" style={{ padding: '20px' }}>
                        <div style={{ fontSize: '11px', color: '#64748B', fontWeight: 600, textTransform: 'uppercase', marginBottom: '8px' }}>Progress</div>
                        <div style={{ fontSize: '24px', fontWeight: 700, color: '#1E293B' }}>{progressPct}%</div>
                        <div style={{ width: '100%', height: '4px', backgroundColor: '#E2E8F0', borderRadius: '2px', marginTop: '8px' }}>
                            <div style={{ width: `${progressPct}%`, height: '100%', backgroundColor: '#059669', borderRadius: '2px', transition: 'width 0.3s' }}></div>
                        </div>
                        <div style={{ fontSize: '11px', color: '#94A3B8', marginTop: '6px' }}>{completedCount} of {totalCount} completed</div>
                    </div>

                    {/* Total Steps */}
                    <div className="card" style={{ padding: '20px' }}>
                        <div style={{ fontSize: '11px', color: '#64748B', fontWeight: 600, textTransform: 'uppercase', marginBottom: '8px' }}>Action Items</div>
                        <div style={{ fontSize: '24px', fontWeight: 700, color: '#1E293B' }}>{totalCount}</div>
                        <div style={{ fontSize: '11px', color: '#94A3B8', marginTop: '14px' }}>{categories.length} categories</div>
                    </div>

                    {/* Critical */}
                    <div className="card" style={{ padding: '20px' }}>
                        <div style={{ fontSize: '11px', color: '#64748B', fontWeight: 600, textTransform: 'uppercase', marginBottom: '8px' }}>Critical</div>
                        <div style={{ fontSize: '24px', fontWeight: 700, color: criticalCount ? '#DC2626' : '#059669' }}>{criticalCount}</div>
                        <div style={{ fontSize: '11px', color: '#94A3B8', marginTop: '14px' }}>{criticalCount ? 'Needs attention now' : 'All clear'}</div>
                    </div>

                    {/* High Priority */}
                    <div className="card" style={{ padding: '20px' }}>
                        <div style={{ fontSize: '11px', color: '#64748B', fontWeight: 600, textTransform: 'uppercase', marginBottom: '8px' }}>High Priority</div>
                        <div style={{ fontSize: '24px', fontWeight: 700, color: highCount ? '#EA580C' : '#059669' }}>{highCount}</div>
                        <div style={{ fontSize: '11px', color: '#94A3B8', marginTop: '14px' }}>{highCount ? 'Important items' : 'All clear'}</div>
                    </div>
                </div>

                {/* Filter Tabs */}
                <div style={{ display: 'flex', gap: '8px', marginBottom: '20px', flexWrap: 'wrap' }}>
                    <button
                        onClick={() => setFilter('all')}
                        style={{
                            padding: '6px 14px', borderRadius: '6px', fontSize: '12px', fontWeight: 600,
                            border: filter === 'all' ? '1px solid #1E293B' : '1px solid #E2E8F0',
                            backgroundColor: filter === 'all' ? '#1E293B' : 'white',
                            color: filter === 'all' ? 'white' : '#64748B',
                            cursor: 'pointer'
                        }}
                    >All ({totalCount})</button>
                    {categories.map(cat => {
                        const count = actionPlan.filter(a => a.category === cat).length;
                        return (
                            <button key={cat}
                                onClick={() => setFilter(cat)}
                                style={{
                                    padding: '6px 14px', borderRadius: '6px', fontSize: '12px', fontWeight: 600,
                                    border: filter === cat ? `1px solid ${CATEGORY_COLORS[cat] || '#1E293B'}` : '1px solid #E2E8F0',
                                    backgroundColor: filter === cat ? (CATEGORY_COLORS[cat] || '#1E293B') : 'white',
                                    color: filter === cat ? 'white' : '#64748B',
                                    cursor: 'pointer'
                                }}
                            >{cat} ({count})</button>
                        );
                    })}
                </div>

                {/* Action Items */}
                {filteredPlan.length === 0 ? (
                    <div className="card" style={{ padding: '40px', textAlign: 'center' }}>
                        <div style={{ fontSize: '16px', fontWeight: 600, color: '#1E293B' }}>All caught up!</div>
                        <div style={{ fontSize: '13px', color: '#64748B', marginTop: '4px' }}>Your finances look great. No action items in this category.</div>
                    </div>
                ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                        {filteredPlan.map((action, idx) => {
                            const realIdx = actionPlan.indexOf(action);
                            const urgency = URGENCY_CONFIG[action.urgency] || URGENCY_CONFIG.medium;
                            const IconComp = ICON_MAP[action.icon] || Shield;
                            const isExpanded = expandedItems[realIdx];
                            const isCompleted = action.status === 'completed';
                            const catColor = CATEGORY_COLORS[action.category] || '#64748B';

                            return (
                                <div key={realIdx} className="card" style={{
                                    padding: 0, overflow: 'hidden',
                                    opacity: isCompleted ? 0.6 : 1,
                                    borderLeft: `3px solid ${isCompleted ? '#CBD5E1' : catColor}`
                                }}>
                                    {/* Main Row */}
                                    <div style={{
                                        display: 'flex', alignItems: 'center', padding: '16px 20px', gap: '16px',
                                        cursor: 'pointer'
                                    }}
                                        onClick={() => toggleExpand(realIdx)}
                                    >
                                        {/* Status checkbox */}
                                        <button onClick={(e) => { e.stopPropagation(); toggleStatus(realIdx, action.status); }}
                                            style={{
                                                width: '28px', height: '28px', borderRadius: '50%', flexShrink: 0,
                                                border: isCompleted ? 'none' : `2px solid ${urgency.dot}`,
                                                backgroundColor: isCompleted ? '#059669' : 'transparent',
                                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                cursor: 'pointer', padding: 0
                                            }}
                                        >
                                            {isCompleted && <CheckCircle size={16} color="white" />}
                                        </button>

                                        {/* Icon */}
                                        {/* Icon removed for professional look */}
                                        <div style={{ width: '36px', height: '36px', flexShrink: 0 }}></div>

                                        {/* Title & category */}
                                        <div style={{ flex: 1, minWidth: 0 }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '2px' }}>
                                                <span style={{ fontSize: '10px', fontWeight: 700, color: catColor, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                                                    {action.category}
                                                </span>
                                                <span style={{
                                                    fontSize: '9px', fontWeight: 700, padding: '2px 6px', borderRadius: '4px',
                                                    backgroundColor: urgency.bg, color: urgency.color, border: `1px solid ${urgency.border}`
                                                }}>
                                                    {urgency.label}
                                                </span>
                                            </div>
                                            <div style={{
                                                fontSize: '14px', fontWeight: 600, color: '#1E293B',
                                                textDecoration: isCompleted ? 'line-through' : 'none'
                                            }}>
                                                {action.title}
                                            </div>
                                        </div>

                                        {/* Amount */}
                                        {action.suggestedAmount > 0 && (
                                            <div style={{ textAlign: 'right', flexShrink: 0 }}>
                                                <div style={{ fontSize: '10px', color: '#94A3B8', fontWeight: 500 }}>
                                                    {action.percent ? 'Allocation' : 'Amount'}
                                                </div>
                                                <div style={{ fontSize: '15px', fontWeight: 700, color: '#1E293B' }}>
                                                    {action.percent ? `${action.percent}%` : fmt(action.suggestedAmount)}
                                                </div>
                                                {action.percent > 0 && (
                                                    <div style={{ fontSize: '11px', color: '#64748B' }}>{fmt(action.suggestedAmount)}/mo</div>
                                                )}
                                            </div>
                                        )}

                                        {/* Expand */}
                                        <div style={{ flexShrink: 0, color: '#94A3B8' }}>
                                            {isExpanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                                        </div>
                                    </div>

                                    {/* Expanded Details */}
                                    {isExpanded && (
                                        <div style={{
                                            padding: '0 20px 16px 100px',
                                            borderTop: '1px solid #F1F5F9'
                                        }}>
                                            <div style={{ paddingTop: '12px' }}>
                                                {action.description && (
                                                    <p style={{ fontSize: '13px', color: '#475569', lineHeight: '1.6', margin: '0 0 12px' }}>
                                                        {action.description}
                                                    </p>
                                                )}
                                                <div style={{ display: 'flex', gap: '24px', flexWrap: 'wrap' }}>
                                                    {action.suggestedAmount > 0 && (
                                                        <div>
                                                            <div style={{ fontSize: '10px', color: '#94A3B8', fontWeight: 600, textTransform: 'uppercase' }}>Target Amount</div>
                                                            <div style={{ fontSize: '14px', fontWeight: 700, color: '#1E293B', marginTop: '2px' }}>{fmt(action.suggestedAmount)}</div>
                                                        </div>
                                                    )}
                                                    {action.monthlyContribution > 0 && (
                                                        <div>
                                                            <div style={{ fontSize: '10px', color: '#94A3B8', fontWeight: 600, textTransform: 'uppercase' }}>Monthly Contribution</div>
                                                            <div style={{ fontSize: '14px', fontWeight: 700, color: '#1E293B', marginTop: '2px' }}>{fmt(action.monthlyContribution)}</div>
                                                        </div>
                                                    )}
                                                    {action.percent > 0 && (
                                                        <div>
                                                            <div style={{ fontSize: '10px', color: '#94A3B8', fontWeight: 600, textTransform: 'uppercase' }}>Portfolio Weight</div>
                                                            <div style={{ fontSize: '14px', fontWeight: 700, color: '#1E293B', marginTop: '2px' }}>{action.percent}%</div>
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
                )}
            </div>
        </div>
    );
}

export default Reports;
