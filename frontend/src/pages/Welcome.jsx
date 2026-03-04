import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { ArrowRight } from 'lucide-react';

function Welcome() {
    const { user } = useAuth();
    const navigate = useNavigate();

    return (
        <div style={{
            minHeight: '100vh',
            backgroundColor: '#F0F2F8',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '40px 20px',
            fontFamily: "'Inter', sans-serif"
        }}>
            {/* Logo Badge */}
            <div style={{
                width: '56px',
                height: '56px',
                backgroundColor: '#1E293B',
                borderRadius: '14px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'white',
                fontWeight: 700,
                fontSize: '18px',
                marginBottom: '40px',
                boxShadow: '0 4px 12px rgba(30, 41, 59, 0.25)'
            }}>
                FH
            </div>

            {/* Heading */}
            <h1 style={{
                fontSize: '32px',
                fontWeight: 700,
                color: '#1E293B',
                marginBottom: '16px',
                textAlign: 'center',
                letterSpacing: '-0.5px'
            }}>
                Let's build your Financial Health Profile
            </h1>

            {/* Subtitle */}
            <p style={{
                fontSize: '16px',
                color: '#64748B',
                textAlign: 'center',
                maxWidth: '460px',
                lineHeight: 1.6,
                marginBottom: '36px'
            }}>
                Answer a few questions about your finances. We'll generate a comprehensive health score, identify gaps, and create a personalized action plan.
            </p>

            {/* Info strip */}
            <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0',
                marginBottom: '40px',
                color: '#94A3B8',
                fontSize: '14px'
            }}>
                <span>10 sections</span>
                <span style={{ margin: '0 16px', color: '#CBD5E1' }}>|</span>
                <span>8–12 minutes</span>
                <span style={{ margin: '0 16px', color: '#CBD5E1' }}>|</span>
                <span>Save & resume anytime</span>
            </div>

            {/* Start Button */}
            <Link
                to={user ? '/questionnaire' : '/register'}
                style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '10px',
                    backgroundColor: '#1E293B',
                    color: 'white',
                    padding: '14px 36px',
                    borderRadius: '28px',
                    fontSize: '16px',
                    fontWeight: 600,
                    textDecoration: 'none',
                    transition: 'background-color 0.2s, transform 0.15s',
                    boxShadow: '0 2px 8px rgba(30, 41, 59, 0.20)'
                }}
                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#334155'}
                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#1E293B'}
            >
                Start Assessment <ArrowRight size={18} />
            </Link>

            {/* Skip link */}
            <Link
                to={user ? '/dashboard' : '/login'}
                style={{
                    marginTop: '20px',
                    color: '#64748B',
                    fontSize: '14px',
                    textDecoration: 'none',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px'
                }}
            >
                {user ? 'Skip to demo dashboard' : 'Already have an account? Log in'} <ArrowRight size={14} />
            </Link>
        </div>
    );
}

export default Welcome;
