import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { ArrowRight } from 'lucide-react';
import AuthPreviewCard from '../components/AuthPreviewCard';

function Welcome() {
    const { user } = useAuth();
    const navigate = useNavigate();

    return (
        <div className="auth-screen">
            <div className="auth-left">
                <Link to="/" className="auth-brand">
                    <div className="auth-brand-box"><span>FH</span></div>
                    <div className="auth-brand-name">FinHealth<em>.</em></div>
                </Link>
                
                <div className="auth-left-container">
                    <div className="landing-eyebrow">Wealth Analytics</div>
                    <div className="landing-title">Build Your Complete Financial Health Profile</div>
                    <div className="landing-desc">
                        Answer a few questions about your finances. We'll generate a comprehensive health score, identify gaps, and create a personalised action plan.
                    </div>
                    
                    <div className="landing-meta">
                        <div className="landing-meta-item"><div className="meta-dot"></div>10 sections to complete</div>
                        <div className="landing-meta-item"><div className="meta-dot"></div>8–12 minutes to finish</div>
                        <div className="landing-meta-item"><div className="meta-dot"></div>Save & resume anytime</div>
                    </div>

                    <Link to="/register" className="btn-primary">
                        Start Assessment <ArrowRight size={16} />
                    </Link>
                    
                    <div className="link-small">
                        Already have an account? <Link to="/login">Log in →</Link>
                    </div>
                </div>
            </div>
            
            <AuthPreviewCard />
        </div>
    );
}

export default Welcome;
