import React, { useState, useEffect } from 'react';
import Sidebar from './Sidebar';
import { useLocation } from 'react-router-dom';

function Layout({ children }) {
    const [mobileOpen, setMobileOpen] = useState(false);
    const location = useLocation();

    // Close mobile sidebars on route change
    useEffect(() => { setMobileOpen(false); }, [location.pathname]);

    const toggleSidebar = () => {
        setMobileOpen(o => !o);
    };

    return (
        <div className="layout">
            <Sidebar mobileOpen={mobileOpen} onCloseMobile={() => setMobileOpen(false)} />
            
            <div className="main">
                {/* Mobile header (hidden on desktop) */}
                <div className="mobile-header">
                    <div className="mobile-brand">FinHealth<span>.</span></div>
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
