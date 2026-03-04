import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { ArrowRight } from 'lucide-react';

function Login() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const { login } = useAuth();
    const navigate = useNavigate();

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);
        try {
            await login(email, password);
            navigate('/dashboard');
        } catch (err) {
            setError(err.message || 'Failed to login');
        } finally {
            setLoading(false);
        }
    };

    const inputStyle = {
        width: '100%',
        padding: '12px 16px',
        borderRadius: '8px',
        border: '1px solid #E2E8F0',
        outline: 'none',
        fontSize: '15px',
        color: '#1E293B',
        backgroundColor: '#FFFFFF',
        transition: 'border-color 0.2s'
    };

    const labelStyle = {
        fontSize: '14px',
        fontWeight: 600,
        color: '#1E293B',
        marginBottom: '6px',
        display: 'block'
    };

    return (
        <div style={{
            minHeight: '100vh',
            backgroundColor: '#F0F2F8',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '40px 20px'
        }}>
            {/* Logo */}
            <div style={{
                width: '56px', height: '56px',
                backgroundColor: '#1E293B', borderRadius: '14px',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: 'white', fontWeight: 700, fontSize: '18px',
                marginBottom: '32px',
                boxShadow: '0 4px 12px rgba(30,41,59,0.25)'
            }}>FH</div>

            <h1 style={{ fontSize: '28px', fontWeight: 700, color: '#1E293B', marginBottom: '8px' }}>Welcome back</h1>
            <p style={{ fontSize: '15px', color: '#64748B', marginBottom: '32px' }}>Log in to your FinHealth account</p>

            <div style={{
                width: '100%', maxWidth: '400px',
                backgroundColor: 'white', borderRadius: '16px',
                padding: '32px',
                boxShadow: '0 1px 3px rgba(0,0,0,0.08)'
            }}>
                {error && (
                    <div style={{ backgroundColor: '#FEF2F2', color: '#DC2626', padding: '12px 16px', borderRadius: '8px', fontSize: '14px', marginBottom: '20px' }}>
                        {error}
                    </div>
                )}

                <form onSubmit={handleSubmit}>
                    <div style={{ marginBottom: '20px' }}>
                        <label style={labelStyle}>Email</label>
                        <input
                            type="email" required value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            placeholder="you@example.com"
                            style={inputStyle}
                            onFocus={(e) => e.target.style.borderColor = '#1E293B'}
                            onBlur={(e) => e.target.style.borderColor = '#E2E8F0'}
                        />
                    </div>

                    <div style={{ marginBottom: '28px' }}>
                        <label style={labelStyle}>Password</label>
                        <input
                            type="password" required value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            placeholder="Enter your password"
                            style={inputStyle}
                            onFocus={(e) => e.target.style.borderColor = '#1E293B'}
                            onBlur={(e) => e.target.style.borderColor = '#E2E8F0'}
                        />
                    </div>

                    <button
                        type="submit" disabled={loading}
                        style={{
                            width: '100%',
                            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                            backgroundColor: '#1E293B', color: 'white',
                            padding: '14px', borderRadius: '28px',
                            fontSize: '15px', fontWeight: 600, border: 'none', cursor: 'pointer',
                            opacity: loading ? 0.7 : 1,
                            transition: 'background-color 0.2s'
                        }}
                        onMouseEnter={(e) => !loading && (e.currentTarget.style.backgroundColor = '#334155')}
                        onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#1E293B')}
                    >
                        {loading ? 'Logging in...' : 'Login'} <ArrowRight size={16} />
                    </button>
                </form>
            </div>

            <p style={{ marginTop: '24px', fontSize: '14px', color: '#64748B' }}>
                Don't have an account? <Link to="/register" style={{ color: '#1E293B', fontWeight: 600, textDecoration: 'none' }}>Sign Up</Link>
            </p>
        </div>
    );
}

export default Login;
