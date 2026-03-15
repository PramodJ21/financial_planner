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
                    <div className="auth-title">Create your account</div>
                    <div className="auth-sub">Start your financial health journey.</div>

                    {error && <div className="auth-error">{error}</div>}

                    <form className="auth-form" onSubmit={handleSubmit}>
                        <div className="auth-field">
                            <label>Full Name</label>
                            <input name="fullName" type="text" required onChange={handleChange} placeholder="Enter your full name" />
                        </div>

                        <div className="auth-field">
                            <label>Email</label>
                            <input name="email" type="email" required onChange={handleChange} placeholder="you@example.com" />
                        </div>

                        <div className="auth-field">
                            <label>Phone Number <span className="opt">(Optional)</span></label>
                            <input name="phone" type="tel" onChange={handleChange} placeholder="+91 XXXXX XXXXX" />
                        </div>

                        <div className="auth-row">
                            <div className="auth-field">
                                <label>Password</label>
                                <input name="password" type="password" required onChange={handleChange} placeholder="Min 6 characters" />
                            </div>
                            <div className="auth-field">
                                <label>Confirm</label>
                                <input name="confirmPassword" type="password" required onChange={handleChange} placeholder="Re-enter password" />
                            </div>
                        </div>

                        <button type="submit" className="btn-auth" disabled={loading}>
                            {loading ? 'Creating Account...' : 'Sign Up'} <ArrowRight size={15} />
                        </button>
                    </form>

                    <div className="auth-footer">
                        Already have an account? <Link to="/login">Log In</Link>
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

export default Register;
