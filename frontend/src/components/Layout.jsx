import React, { useState } from 'react';
import Sidebar from './Sidebar';
import Header from './Header';

function Layout({ children }) {
    const [collapsed, setCollapsed] = useState(false);
    const sidebarWidth = collapsed ? 64 : 200;

    return (
        <div style={{ display: 'flex', minHeight: '100vh', backgroundColor: '#F8FAFC', fontFamily: "'Inter', sans-serif" }}>
            <Sidebar collapsed={collapsed} />
            <div style={{ flex: 1, marginLeft: `${sidebarWidth}px`, display: 'flex', flexDirection: 'column', width: `calc(100% - ${sidebarWidth}px)`, transition: 'margin-left 0.2s ease, width 0.2s ease' }}>
                <Header onToggleSidebar={() => setCollapsed(c => !c)} />
                <main style={{ padding: '28px 32px', flex: 1, overflowY: 'auto' }}>
                    {children}
                </main>
            </div>
        </div>
    );
}

export default Layout;
