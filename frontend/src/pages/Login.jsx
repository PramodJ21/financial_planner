import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { ArrowRight } from 'lucide-react';
import AuthPreviewCard from '../components/AuthPreviewCard';

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

    return (
        <div className="auth-screen">
            <div className="auth-left">
                <Link to="/" className="auth-brand">
                    <div className="auth-brand-box"><span>FH</span></div>
                    <div className="auth-brand-name">FinHealth<em>.</em></div>
                </Link>
                
                <div className="auth-left-container">
                    <div className="auth-eyebrow">Welcome back</div>
                    <div className="auth-title">Log in to your account</div>
                    <div className="auth-sub">Your financial dashboard is waiting.</div>
                    
                    {error && <div className="auth-error">{error}</div>}
                    
                    <form className="auth-form" onSubmit={handleSubmit}>
                        <div className="auth-field">
                            <label>Email</label>
                            <input
                                type="email" required value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                placeholder="you@example.com"
                            />
                        </div>

                        <div className="auth-field">
                            <label>Password</label>
                            <input
                                type="password" required value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                placeholder="Enter your password"
                            />
                        </div>

                        <button type="submit" className="btn-auth" disabled={loading}>
                            {loading ? 'Logging in...' : 'Log In'} <ArrowRight size={15} />
                        </button>
                    </form>
                    
                    <div className="auth-footer">
                        Don't have an account? <Link to="/register">Sign Up</Link>
                    </div>
                    <div className="auth-footer" style={{ marginTop: '10px' }}>
                        <Link to="/" style={{ color: '#C4BFB8' }}>← Back</Link>
                    </div>
                </div>
            </div>
            
            <AuthPreviewCard />
        </div>
    );
}

export default Login;
