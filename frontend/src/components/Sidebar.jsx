import React, { useEffect, useState, useRef, useCallback } from 'react';
import { NavLink, Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { LogOut } from 'lucide-react';

const CHAPTERS = [
    { id: 'chapter-01', num: '01', name: 'Your Profile' },
    { id: 'chapter-02', num: '02', name: 'Financial Health' },
    { id: 'chapter-03', num: '03', name: 'What\'s Working' },
    { id: 'chapter-04', num: '04', name: 'Needs Attention' },
    { id: 'chapter-05', num: '05', name: 'Cashflow' },
    { id: 'chapter-06', num: '06', name: 'Action Plan' },
];

const EXPLORE_ITEMS = [
    { name: 'Portfolio', path: '/portfolio' },
    { name: 'Investments', path: '/investments' },
    { name: 'Liabilities', path: '/liabilities' },
    { name: 'Insurance', path: '/insurance' },
    { name: 'Tax', path: '/tax' },
    { name: 'Estate & Will', path: '/estate' },
    { name: 'Goal Planner', path: '/goal-planner' },
    { name: 'Reports', path: '/reports' },
];

function Sidebar({ mobileOpen, onCloseMobile, collapsed, onToggleCollapse, sectionBg, isDarkSection, scrollRef }) {
    const { user, logout } = useAuth();
    const location = useLocation();
    const navigate = useNavigate();
    const [activeChapter, setActiveChapter] = useState(null);
    const observerRef = useRef(null);

    const isDashboard = location.pathname === '/dashboard';

    // Scroll-spy: observe chapter elements on the dashboard
    useEffect(() => {
        if (!isDashboard) {
            const t = setTimeout(() => setActiveChapter(null), 0);
            return () => clearTimeout(t);
        }

        // Small delay to let dashboard render chapter elements
        const timer = setTimeout(() => {
            const elements = CHAPTERS.map(ch => document.getElementById(ch.id)).filter(Boolean);
            if (elements.length === 0) return;

            const root = scrollRef?.current || null;

            observerRef.current = new IntersectionObserver(
                (entries) => {
                    entries.forEach(entry => {
                        if (entry.isIntersecting && entry.intersectionRatio >= 0.6) {
                            setActiveChapter(entry.target.id);
                        }
                    });
                },
                { threshold: 0.6, root }
            );

            elements.forEach(el => observerRef.current.observe(el));
        }, 300);

        return () => {
            clearTimeout(timer);
            if (observerRef.current) {
                observerRef.current.disconnect();
            }
        };
    }, [isDashboard, location.key, scrollRef]);

    const scrollToChapter = useCallback((chapterId) => {
        if (isDashboard) {
            const el = document.getElementById(chapterId);
            if (el) {
                el.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }
        } else {
            navigate(`/dashboard#${chapterId}`);
        }
        onCloseMobile();
    }, [isDashboard, navigate, onCloseMobile]);

    const getInitials = (name) => {
        if (!name) return 'U';
        return name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
    };

    // Build className
    const cls = [
        'sidebar',
        mobileOpen && 'mobile-open',
        collapsed && 'collapsed',
        isDarkSection && 'dark',
    ].filter(Boolean).join(' ');

    // Dynamic sidebar background synced to active section
    const sidebarStyle = sectionBg ? { background: sectionBg } : {};

    return (
        <div className={cls} style={sidebarStyle}>
            {/* Toggle button (hamburger → X) */}
            <button
                className="sidebar-toggle"
                onClick={onToggleCollapse}
                aria-label="Toggle sidebar"
            >
                <span className="toggle-bar" />
                <span className="toggle-bar" />
                <span className="toggle-bar" />
            </button>

            <div className="sidebar-logo">Fin<em>Health</em></div>

            {/* Chapter nav — Your Story */}
            <div className="nav-group-label">Your Story</div>
            <ul className="sidebar-nav sidebar-nav--chapters">
                {CHAPTERS.map((ch) => (
                    <li
                        key={ch.id}
                        className={activeChapter === ch.id ? 'active' : ''}
                    >
                        <button onClick={() => scrollToChapter(ch.id)}>
                            <span className="nav-num">{ch.num}</span>
                            <span className="nav-label">{ch.name}</span>
                            <span className="nav-dot" />
                        </button>
                    </li>
                ))}
            </ul>

            {/* Edit Answers */}
            <Link to="/questionnaire" className="sidebar-edit-answers" onClick={onCloseMobile}>
                Edit Answers →
            </Link>

            {/* Explore group */}
            <div className="nav-group-label">Explore</div>
            <ul className="sidebar-nav sidebar-nav--explore">
                {EXPLORE_ITEMS.map((item) => (
                    <li
                        key={item.name}
                        className={location.pathname === item.path ? 'active' : ''}
                    >
                        <NavLink to={item.path} onClick={onCloseMobile}>
                            <span className="nav-label">{item.name}</span>
                        </NavLink>
                    </li>
                ))}
            </ul>

            {/* User + sign out */}
            <div className="sidebar-user">
                <div className="sidebar-avatar">{getInitials(user?.full_name)}</div>
                <div className="sidebar-user-info">
                    <p>{user?.full_name || 'User'}</p>
                    <p>Member</p>
                </div>
            </div>

            <button className="sidebar-signout" onClick={logout}>
                <LogOut size={11} strokeWidth={1.5} />
                Sign out
            </button>
        </div>
    );
}

export default Sidebar;
