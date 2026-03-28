import React, { useState, useEffect, useCallback, useRef } from 'react';
import Sidebar from './Sidebar';
import { useLocation } from 'react-router-dom';

function Layout({ children }) {
    const [mobileOpen, setMobileOpen] = useState(false);
    const [collapsed, setCollapsed] = useState(false);
    const [sectionBg, setSectionBg] = useState('');
    const [isDarkSection, setIsDarkSection] = useState(false);
    const scrollRef = useRef(null);
    const location = useLocation();

    const isDashboard = location.pathname === '/dashboard';

    // Close mobile sidebar on route change
    useEffect(() => { const t = setTimeout(() => setMobileOpen(false), 0); return () => clearTimeout(t); }, [location.pathname]);

    // Listen for dashboard section changes (dispatched by Dashboard.jsx)
    useEffect(() => {
        const handler = (e) => {
            setSectionBg(e.detail.bg || '');
            setIsDarkSection(e.detail.dark || false);
        };
        window.addEventListener('dashboard-section-change', handler);
        return () => window.removeEventListener('dashboard-section-change', handler);
    }, []);

    // Reset sidebar bg when leaving dashboard
    useEffect(() => {
        if (!isDashboard) {
            const t = setTimeout(() => { setSectionBg(''); setIsDarkSection(false); }, 0);
            return () => clearTimeout(t);
        }
    }, [isDashboard]);

    // Handle hash-based scroll when navigating to /dashboard#chapter-XX
    useEffect(() => {
        if (isDashboard && location.hash) {
            const id = location.hash.replace('#', '');
            const timer = setTimeout(() => {
                const el = document.getElementById(id);
                if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }, 400);
            return () => clearTimeout(timer);
        }
    }, [isDashboard, location.hash]);

    const toggleSidebar = () => setMobileOpen(o => !o);
    const toggleCollapse = useCallback(() => setCollapsed(c => !c), []);

    return (
        <div className="layout">
            <div className="sidebar-wrapper">
                <Sidebar
                    mobileOpen={mobileOpen}
                    onCloseMobile={() => setMobileOpen(false)}
                    collapsed={collapsed}
                    onToggleCollapse={toggleCollapse}
                    sectionBg={sectionBg}
                    isDarkSection={isDarkSection}
                    scrollRef={scrollRef}
                />
            </div>

            <div
                ref={scrollRef}
                className={`main${isDashboard ? ' snap-active' : ''}`}
            >
                {/* Mobile header (hidden on desktop) */}
                <div className="mobile-header">
                    <div className="mobile-brand">Fin<em>Health</em></div>
                    <button className="mobile-menu-btn" onClick={toggleSidebar}>☰</button>
                </div>

                {children}

                {/* Mobile Overlay */}
                {mobileOpen && (
                    <div
                        className="sidebar-overlay visible"
                        onClick={() => setMobileOpen(false)}
                    />
                )}
            </div>
        </div>
    );
}

export default Layout;
