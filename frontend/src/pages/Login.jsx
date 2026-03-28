import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { ArrowRight, Eye, EyeOff } from 'lucide-react';
import AuthPreviewCard from '../components/AuthPreviewCard';

function Login() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [forgotMsg, setForgotMsg] = useState('');
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
                    <h1 className="auth-title">Log in to your account</h1>
                    <div className="auth-sub">Enter your credentials to continue to your dashboard.</div>

                    {error && <div className="auth-error">{error}</div>}

                    <form className="auth-form" onSubmit={handleSubmit}>
                        <div className="auth-field">
                            <label htmlFor="login-email">Email</label>
                            <input
                                id="login-email"
                                type="email" required value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                placeholder="you@example.com"
                            />
                        </div>

                        <div className="auth-field">
                            <label htmlFor="login-password">Password</label>
                            <div className="auth-pw-wrap">
                                <input
                                    id="login-password"
                                    type={showPassword ? 'text' : 'password'}
                                    required value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    placeholder="Enter your password"
                                />
                                <button type="button" className="auth-pw-toggle" onClick={() => setShowPassword(v => !v)} aria-label="Toggle password visibility">
                                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                                </button>
                            </div>
                            <div className="auth-forgot">
                                <a href="#" onClick={(e) => { e.preventDefault(); setForgotMsg('Password reset is not yet available. Please contact support.'); }}>Forgot password?</a>
                            </div>
                            {forgotMsg && <div className="auth-info-msg">{forgotMsg}</div>}
                        </div>

                        <button type="submit" className="btn-auth" disabled={loading}>
                            {loading ? 'Logging in...' : 'Log In'} <ArrowRight size={15} />
                        </button>
                    </form>

                    <div className="auth-footer">
                        <span>Don't have an account? <Link to="/register">Sign up free</Link></span>
                        <Link to="/">← Back to home</Link>
                    </div>
                </div>
            </div>

            <AuthPreviewCard />
        </div>
    );
}

export default Login;
