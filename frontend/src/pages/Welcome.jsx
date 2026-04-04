import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import AuthPreviewCard from '../components/AuthPreviewCard';

function Welcome() {

    return (
        <div className="auth-screen">
            <div className="auth-left">
                <Link to="/" className="auth-brand">
                    <div className="auth-brand-box"><span>FH</span></div>
                    <div className="auth-brand-name">FinHealth<em>.</em></div>
                </Link>
                
                <div className="auth-left-container">
                    <div className="landing-eyebrow">Free · No advisor calls · Your data stays private</div>
                    <h1 className="landing-title">Know Exactly Where Your Money Stands</h1>
                    <div className="landing-desc">
                        Answer questions about your income, savings, investments, loans, and insurance. We compute a <strong>Financial Behaviour Score (FBS)</strong> out of 100 — then generate a ranked action plan showing exactly what to fix and by how much.
                    </div>

                    <div className="landing-meta">
                        <div className="landing-meta-item"><div className="meta-dot"></div>12 steps — income, expenses, investments, loans, insurance, tax, and more</div>
                        <div className="landing-meta-item"><div className="meta-dot"></div>8–12 minutes · save and resume anytime, no time pressure</div>
                        <div className="landing-meta-item"><div className="meta-dot"></div>Instant results — no waiting, no advisor, no sales calls</div>
                    </div>

                    <Link to="/register" className="btn-primary">
                        Start Assessment <ArrowRight size={16} />
                    </Link>

                    <div className="link-small">
                        Already have an account? <Link to="/login">Log in to your dashboard</Link>
                    </div>
                </div>
            </div>
            
            <AuthPreviewCard />
        </div>
    );
}

export default Welcome;
