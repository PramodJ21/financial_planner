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
            height: '56px',
            borderBottom: '1px solid #D8D3CB',
            backgroundColor: '#FFFFFF',
            display: 'flex',
            alignItems: 'center',
            padding: '0 28px',
            justifyContent: 'space-between',
            fontFamily: "'Inter', sans-serif"
        }}>
            {/* Sidebar toggle button */}
            <button
                onClick={onToggleSidebar}
                style={{
                    background: 'none', border: 'none',
                    cursor: 'pointer', padding: '6px',
                    display: 'flex', alignItems: 'center',
                    borderRadius: '6px', transition: 'background-color 0.15s'
                }}
                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#EAF1F8'}
                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
            >
                <PanelLeft size={18} color="#6B7A8A" />
            </button>

            {/* Right: User avatar + name */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{
                    width: '30px', height: '30px',
                    borderRadius: '8px',
                    backgroundColor: '#4F79B7',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    color: 'white', fontWeight: 700, fontSize: '11px',
                    flexShrink: 0
                }}>
                    {initials || <User size={14} />}
                </div>

                <span style={{ fontWeight: 600, fontSize: '13px', color: '#0D1B2A' }}>
                    {user?.full_name || 'User'}
                </span>
            </div>
        </header>
    );
}

export default Header;
