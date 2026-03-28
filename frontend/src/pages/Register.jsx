import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { ArrowRight, Eye, EyeOff } from 'lucide-react';
import AuthPreviewCard from '../components/AuthPreviewCard';

function getPasswordStrength(pw) {
    if (!pw) return 0;
    let score = 0;
    if (pw.length >= 6) score++;
    if (pw.length >= 10) score++;
    if (/[A-Z]/.test(pw) && /[0-9]/.test(pw)) score++;
    return Math.min(score, 3);
}

const strengthLabels = ['', 'Weak', 'Fair', 'Strong'];
const strengthClasses = ['', 'active-weak', 'active-fair', 'active-strong'];

function Register() {
    const [formData, setFormData] = useState({ fullName: '', email: '', phone: '', password: '', confirmPassword: '' });
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirm, setShowConfirm] = useState(false);
    const [confirmError, setConfirmError] = useState('');
    const { register } = useAuth();
    const navigate = useNavigate();

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
        if (e.target.name === 'confirmPassword') setConfirmError('');
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (formData.password !== formData.confirmPassword) {
            setConfirmError('Passwords do not match');
            return;
        }
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

    const strength = getPasswordStrength(formData.password);

    return (
        <div className="auth-screen">
            <div className="auth-left">
                <Link to="/" className="auth-brand">
                    <div className="auth-brand-box"><span>FH</span></div>
                    <div className="auth-brand-name">FinHealth<em>.</em></div>
                </Link>

                <div className="auth-left-container">
                    <div className="auth-eyebrow">Get started — it's free</div>
                    <h1 className="auth-title">Create your account</h1>
                    <div className="auth-sub">You'll jump straight into the assessment — takes 8–12 minutes. No advisor calls, no sales.</div>

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
                            <input id="reg-phone" name="phone" type="tel" value={formData.phone} onChange={handleChange} placeholder="+91 XXXXX XXXXX" pattern="[+]?[0-9\s\-]{10,15}" maxLength={15} />
                            <span className="auth-field-hint">10 digits, e.g. 98765 43210</span>
                        </div>

                        <div className="auth-field">
                            <label htmlFor="reg-password">Password</label>
                            <div className="auth-pw-wrap">
                                <input
                                    id="reg-password" name="password"
                                    type={showPassword ? 'text' : 'password'}
                                    required value={formData.password} onChange={handleChange}
                                    placeholder="Min 6 characters"
                                />
                                <button type="button" className="auth-pw-toggle" onClick={() => setShowPassword(v => !v)} aria-label="Toggle password visibility">
                                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                                </button>
                            </div>
                            {formData.password && (
                                <>
                                    <div className="auth-pw-strength">
                                        {[1, 2, 3].map(n => (
                                            <div key={n} className={`auth-pw-strength-bar ${n <= strength ? strengthClasses[strength] : ''}`} />
                                        ))}
                                    </div>
                                    <div className="auth-pw-strength-label">{strengthLabels[strength]}</div>
                                </>
                            )}
                        </div>

                        <div className="auth-field">
                            <label htmlFor="reg-confirm">Confirm Password</label>
                            <div className="auth-pw-wrap">
                                <input
                                    id="reg-confirm" name="confirmPassword"
                                    type={showConfirm ? 'text' : 'password'}
                                    required value={formData.confirmPassword} onChange={handleChange}
                                    placeholder="Re-enter password"
                                />
                                <button type="button" className="auth-pw-toggle" onClick={() => setShowConfirm(v => !v)} aria-label="Toggle confirm password visibility">
                                    {showConfirm ? <EyeOff size={16} /> : <Eye size={16} />}
                                </button>
                            </div>
                            {confirmError && <div className="auth-field-error">{confirmError}</div>}
                        </div>

                        <button type="submit" className="btn-auth" disabled={loading}>
                            {loading ? 'Creating Account...' : 'Sign Up'} <ArrowRight size={15} />
                        </button>
                        <div className="auth-next-hint">No credit card required · Your data stays private</div>
                    </form>

                    <div className="auth-footer">
                        <span>Already have an account? <Link to="/login">Log in</Link></span>
                        <Link to="/">← Back to home</Link>
                    </div>
                </div>
            </div>

            <AuthPreviewCard />
        </div>
    );
}

export default Register;
