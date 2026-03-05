import React, { useState, useEffect } from 'react';
import Sidebar from './Sidebar';
import Header from './Header';

function Layout({ children }) {
    const [collapsed, setCollapsed] = useState(false);
    const [mobileOpen, setMobileOpen] = useState(false);
    const sidebarWidth = collapsed ? 64 : 200;

    // Close mobile sidebar on route change (children change)
    useEffect(() => { setMobileOpen(false); }, [children]);

    const toggleSidebar = () => {
        // On mobile (<= 768px), toggle the overlay sidebar
        if (window.innerWidth <= 768) {
            setMobileOpen(o => !o);
        } else {
            setCollapsed(c => !c);
        }
    };

    return (
        <div style={{ display: 'flex', minHeight: '100vh', backgroundColor: '#F8FAFC', fontFamily: "'Inter', sans-serif" }}>
            {/* Mobile overlay backdrop */}
            <div
                className={`sidebar-overlay${mobileOpen ? ' visible' : ''}`}
                onClick={() => setMobileOpen(false)}
            />
            <Sidebar collapsed={collapsed} mobileOpen={mobileOpen} />
            <div className="app-main-content" style={{ flex: 1, marginLeft: `${sidebarWidth}px`, display: 'flex', flexDirection: 'column', width: `calc(100% - ${sidebarWidth}px)`, transition: 'margin-left 0.2s ease, width 0.2s ease' }}>
                <Header onToggleSidebar={toggleSidebar} />
                <main className="app-main-area">
                    {children}
                </main>
            </div>
        </div>
    );
}

export default Layout;
