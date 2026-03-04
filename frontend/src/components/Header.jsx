import React from 'react';
import { useAuth } from '../context/AuthContext';
import { PanelLeft, User } from 'lucide-react';

function Header({ onToggleSidebar }) {
    const { user } = useAuth();

    const initials = user?.full_name
        ? user.full_name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2)
        : '';

    return (
        <header style={{
            height: '52px',
            borderBottom: '1px solid #E8ECF1',
            backgroundColor: '#FFFFFF',
            display: 'flex',
            alignItems: 'center',
            padding: '0 24px',
            gap: '14px',
            fontFamily: "'Inter', sans-serif"
        }}>
            {/* Sidebar toggle button */}
            <button
                onClick={onToggleSidebar}
                style={{
                    background: 'none', border: 'none',
                    cursor: 'pointer', padding: '4px',
                    display: 'flex', alignItems: 'center'
                }}
            >
                <PanelLeft size={18} color="#94A3B8" />
            </button>

            {/* User avatar + name */}
            <div style={{
                width: '28px', height: '28px',
                borderRadius: '6px',
                backgroundColor: '#3B82F6',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: 'white', fontWeight: 700, fontSize: '11px',
                flexShrink: 0
            }}>
                {initials || <User size={14} />}
            </div>

            <span style={{ fontWeight: 600, fontSize: '14px', color: '#1E293B' }}>
                {user?.full_name || 'User'}
            </span>


        </header>
    );
}

export default Header;
