import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import {
    LayoutGrid,
    TrendingUp,
    Landmark,
    ShieldCheck,
    Receipt,
    FileText,
    ClipboardList,
    LogOut
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

function Sidebar({ collapsed, mobileOpen }) {
    const { logout } = useAuth();
    const location = useLocation();

    const navItems = [
        { name: 'Overview', path: '/dashboard', icon: LayoutGrid },
        { name: 'Investments', path: '/investments', icon: TrendingUp },
        { name: 'Liabilities', path: '/liabilities', icon: Landmark },
        { name: 'Insurance', path: '/insurance', icon: ShieldCheck },
        { name: 'Tax', path: '/tax', icon: Receipt },
        { name: 'Will & Estate', path: '/estate', icon: FileText },
        { name: 'Action Plan', path: '/reports', icon: ClipboardList },
    ];

    const width = collapsed ? 64 : 200;

    return (
        <aside className={`app-sidebar${mobileOpen ? ' mobile-open' : ''}`} style={{
            width: `${width}px`,
            minWidth: `${width}px`,
            backgroundColor: '#FFFFFF',
            borderRight: '1px solid #E8ECF1',
            height: '100vh',
            display: 'flex',
            flexDirection: 'column',
            position: 'fixed',
            zIndex: 10,
            fontFamily: "'Inter', sans-serif",
            overflow: 'hidden'
        }}>
            {/* Brand */}
            <div style={{
                padding: collapsed ? '20px 16px' : '20px 20px',
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                justifyContent: collapsed ? 'center' : 'flex-start'
            }}>
                <div style={{
                    width: '30px', height: '30px',
                    backgroundColor: '#1E293B',
                    borderRadius: '8px',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    color: 'white', fontWeight: 700, fontSize: '11px',
                    flexShrink: 0
                }}>FH</div>
                {!collapsed && <span style={{ fontWeight: 700, fontSize: '15px', color: '#1E293B', whiteSpace: 'nowrap' }}>FinHealth</span>}
            </div>

            {/* Navigation */}
            <nav style={{ flex: 1, padding: '8px 0', display: 'flex', flexDirection: 'column', gap: '2px' }}>
                {navItems.map((item) => {
                    const isActive = location.pathname === item.path;
                    const Icon = item.icon;
                    return (
                        <NavLink
                            key={item.name}
                            to={item.path}
                            title={collapsed ? item.name : undefined}
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '10px',
                                padding: collapsed ? '9px 0' : '9px 20px',
                                justifyContent: collapsed ? 'center' : 'flex-start',
                                fontSize: '13px',
                                color: isActive ? '#1E293B' : '#64748B',
                                fontWeight: isActive ? 600 : 400,
                                borderLeft: isActive ? '3px solid #3B82F6' : '3px solid transparent',
                                backgroundColor: isActive ? '#EFF6FF' : 'transparent',
                                textDecoration: 'none',
                                transition: 'all 0.12s ease',
                                whiteSpace: 'nowrap'
                            }}
                        >
                            <Icon size={17} strokeWidth={isActive ? 2.2 : 1.8} style={{ flexShrink: 0 }} />
                            {!collapsed && item.name}
                        </NavLink>
                    );
                })}
            </nav>

            {/* Logout */}
            <div style={{ padding: collapsed ? '16px 0' : '16px 20px', borderTop: '1px solid #E8ECF1', display: 'flex', justifyContent: collapsed ? 'center' : 'flex-start' }}>
                <button
                    onClick={logout}
                    title="Logout"
                    style={{
                        display: 'flex', alignItems: 'center', gap: '10px',
                        color: '#64748B', fontSize: '13px', fontWeight: 400,
                        background: 'none', border: 'none', cursor: 'pointer',
                        padding: '6px 0', justifyContent: collapsed ? 'center' : 'flex-start'
                    }}
                >
                    <LogOut size={17} strokeWidth={1.8} style={{ flexShrink: 0 }} />
                    {!collapsed && 'Logout'}
                </button>
            </div>
        </aside>
    );
}

export default Sidebar;
