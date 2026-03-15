import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { LogOut } from 'lucide-react';

function Sidebar({ mobileOpen, onCloseMobile }) {
    const { user, logout } = useAuth();
    const location = useLocation();

    const navItems = [
        { name: 'Overview', path: '/dashboard' },
        { name: 'Investments', path: '/investments' },
        { name: 'Liabilities', path: '/liabilities' },
        { name: 'Insurance', path: '/insurance' },
        { name: 'Tax', path: '/tax' },
        { name: 'Will & Estate', path: '/estate' },
        { name: 'Action Plan', path: '/reports' },
    ];

    const toolItems = [
        { name: 'Goal Planner', path: '/goal-planner' },
    ];

    // Get initials for avatar
    const getInitials = (name) => {
        if (!name) return 'U';
        return name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
    };

    return (
        <div className={`sidebar${mobileOpen ? ' mobile-open' : ''}`}>
            <div className="sidebar-brand">
                <div className="sidebar-brand-name">FinHealth<span>.</span></div>
                <div className="sidebar-brand-sub">Wealth Analytics</div>
            </div>

            <nav style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                {navItems.map((item) => (
                    <NavLink
                        key={item.name}
                        to={item.path}
                        className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`}
                        onClick={onCloseMobile}
                    >
                        {item.name}
                    </NavLink>
                ))}

                <div className="nav-section-label">Tools</div>

                {toolItems.map((item) => (
                    <NavLink
                        key={item.name}
                        to={item.path}
                        className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`}
                        onClick={onCloseMobile}
                    >
                        {item.name}
                    </NavLink>
                ))}
            </nav>

            <div className="sidebar-user">
                <div className="sidebar-avatar">{getInitials(user?.full_name)}</div>
                <div className="sidebar-user-info">
                    <p>{user?.full_name || 'User'}</p>
                    <p>Member</p>
                </div>
            </div>

            <button className="sidebar-signout" onClick={logout}>
                <LogOut size={13} strokeWidth={1.5} />
                Sign out
            </button>
        </div>
    );
}

export default Sidebar;
