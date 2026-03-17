import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { ArrowRight } from 'lucide-react';
import AuthPreviewCard from '../components/AuthPreviewCard';

function Register() {
    const [formData, setFormData] = useState({ fullName: '', email: '', phone: '', password: '', confirmPassword: '' });
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const { register } = useAuth();
    const navigate = useNavigate();

    const handleChange = (e) => setFormData({ ...formData, [e.target.name]: e.target.value });

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (formData.password !== formData.confirmPassword) return setError('Passwords do not match');
        setError('');
        setLoading(true);
        try {
            await register(formData.fullName, formData.email, formData.password, formData.phone);
            navigate('/questionnaire');
        } catch (err) {
            setError(err.message || 'Registration failed');
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
                    <div className="auth-eyebrow">Get started</div>
                    <h1 className="auth-title">Create your account</h1>
                    <div className="auth-sub">Start your financial health journey.</div>

                    {error && <div className="auth-error">{error}</div>}

                    <form className="auth-form" onSubmit={handleSubmit}>
                        <div className="auth-field">
                            <label htmlFor="reg-fullName">Full Name</label>
                            <input id="reg-fullName" name="fullName" type="text" required value={formData.fullName} onChange={handleChange} placeholder="Enter your full name" />
                        </div>

                        <div className="auth-field">
                            <label htmlFor="reg-email">Email</label>
                            <input id="reg-email" name="email" type="email" required value={formData.email} onChange={handleChange} placeholder="you@example.com" />
                        </div>

                        <div className="auth-field">
                            <label htmlFor="reg-phone">Phone Number <span className="opt">(Optional)</span></label>
                            <input id="reg-phone" name="phone" type="tel" value={formData.phone} onChange={handleChange} placeholder="+91 XXXXX XXXXX" />
                        </div>

                        <div className="auth-row">
                            <div className="auth-field">
                                <label htmlFor="reg-password">Password</label>
                                <input id="reg-password" name="password" type="password" required value={formData.password} onChange={handleChange} placeholder="Min 6 characters" />
                            </div>
                            <div className="auth-field">
                                <label htmlFor="reg-confirm">Confirm</label>
                                <input id="reg-confirm" name="confirmPassword" type="password" required value={formData.confirmPassword} onChange={handleChange} placeholder="Re-enter password" />
                            </div>
                        </div>

                        <button type="submit" className="btn-auth" disabled={loading}>
                            {loading ? 'Creating Account...' : 'Sign Up'} <ArrowRight size={15} />
                        </button>
                    </form>

                    <div className="auth-footer">
                        Already have an account? <Link to="/login">Log In</Link>
                    </div>
                    <div className="auth-footer">
                        <Link to="/">← Back</Link>
                    </div>
                </div>
            </div>
            
            <AuthPreviewCard />
        </div>
    );
}

export default Register;
