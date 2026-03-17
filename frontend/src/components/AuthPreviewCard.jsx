import React, { useEffect, useState, useRef } from 'react';

function AuthPreviewCard() {
    const [score, setScore] = useState(0);
    const [moneySign, setMoneySign] = useState('');
    const [label, setLabel] = useState('Calculating your score…');
    const [fillWidth, setFillWidth] = useState('0%');

    const [netWorth, setNetWorth] = useState(0);
    const [savings, setSavings] = useState(0);
    const [taxSaved, setTaxSaved] = useState(0);

    const [pendingCount, setPendingCount] = useState(11);

    const [checkedItems, setCheckedItems] = useState([false, false, false, false]);
    const [doneItems, setDoneItems] = useState([false, false, false, false]);

    const [cursorPos, setCursorPos] = useState({ left: '22%', top: '18%' });
    const positions = useRef([{ left: '22%', top: '18%' }, { left: '72%', top: '40%' }, { left: '42%', top: '68%' }, { left: '80%', top: '20%' }, { left: '28%', top: '80%' }]);
    const posIdx = useRef(0);

    const fmtInr = (n) => {
        if (n >= 10000000) return '₹' + (n / 10000000).toFixed(2) + 'Cr';
        if (n >= 100000) return '₹' + (n / 100000).toFixed(2) + 'L';
        return '₹' + n.toLocaleString('en-IN');
    };

    const countUp = (setFn, target, duration) => {
        let startTime = null;
        let animationFrame;
        const step = (ts) => {
            if (!startTime) startTime = ts;
            const p = Math.min((ts - startTime) / duration, 1);
            const ease = 1 - Math.pow(1 - p, 3);
            setFn(Math.floor(ease * target));
            if (p < 1) animationFrame = requestAnimationFrame(step);
        };
        animationFrame = requestAnimationFrame(step);
        return () => cancelAnimationFrame(animationFrame);
    };

    const animateMoney = () => {
        const seq = ['', '₹', '₹₹', '₹₹₹'];
        let i = 0;
        const interval = setInterval(() => {
            setMoneySign(seq[i++]);
            if (i >= seq.length) clearInterval(interval);
        }, 500);
        return interval;
    };

    useEffect(() => {
        let timeouts = [];
        let intervals = [];

        const runPreview = () => {
            // Reset
            setCheckedItems([false, false, false, false]);
            setDoneItems([false, false, false, false]);
            setScore(0);
            setFillWidth('0%');
            setMoneySign('');
            setLabel('Calculating your score…');
            setNetWorth(0);
            setSavings(0);
            setTaxSaved(0);
            setPendingCount(11);

            timeouts.push(setTimeout(() => {
                setFillWidth('67%');
                const cancelScore = countUp(setScore, 67, 1800);
                intervals.push({ clear: cancelScore });
                timeouts.push(setTimeout(() => {
                    setLabel('Good - above average for your age');
                    const moneyId = animateMoney();
                    intervals.push(moneyId);
                }, 1900));
            }, 400));

            timeouts.push(setTimeout(() => { const c = countUp(setNetWorth, 14100000, 1400); intervals.push({ clear: c }); }, 700));
            timeouts.push(setTimeout(() => { const c = countUp(setSavings, 156279, 1400); intervals.push({ clear: c }); }, 950));
            timeouts.push(setTimeout(() => { const c = countUp(setTaxSaved, 135200, 1400); intervals.push({ clear: c }); }, 1150));

            let step = 0;
            const iv = setInterval(() => {
                if (step < 4) {
                    const currentStep = step;
                    setCheckedItems(prev => { const n = [...prev]; n[currentStep] = true; return n; });
                    timeouts.push(setTimeout(() => {
                        setDoneItems(prev => { const n = [...prev]; n[currentStep] = true; return n; });
                        setPendingCount(p => Math.max(0, p - 1));
                    }, 500));
                    step++;
                } else {
                    clearInterval(iv);
                    timeouts.push(setTimeout(runPreview, 2500));
                }
            }, 2600);
            intervals.push(iv);
        };

        timeouts.push(setTimeout(runPreview, 600));

        // Cursor navigation
        const wander = () => {
            const pos = positions.current[posIdx.current % positions.current.length];
            setCursorPos(pos);
            posIdx.current++;
        };
        wander();
        intervals.push(setInterval(wander, 2000));

        return () => {
            timeouts.forEach(clearTimeout);
            intervals.forEach(iv => typeof iv === 'object' && iv.clear ? iv.clear() : clearInterval(iv));
        };
    }, []);

    const actionItems = [
        { title: 'Emergency Fund', name: 'Build Emergency Fund', fbs: '+13 FBS', amt: '₹9,20,000' },
        { title: 'Insurance', name: 'Increase Health Insurance Coverage', fbs: '+13 FBS', amt: '₹22,50,000' },
        { title: 'Asset Reallocation', name: 'Increase Equity Allocation', fbs: '+8 FBS', amt: '₹36,50,000' },
        { title: 'Debt Management', name: 'Reduce Bad Liabilities', fbs: '+3 FBS', amt: '₹5,00,000' }
    ];

    return (
        <div className="auth-right">
            <div className="preview-float">
                <div className="preview-chrome">
                    <div className="chrome-dot" style={{ background: '#FF5F57' }}></div>
                    <div className="chrome-dot" style={{ background: '#FEBC2E' }}></div>
                    <div className="chrome-dot" style={{ background: '#28C840' }}></div>
                    <span style={{ fontSize: '9px', color: '#4A4846', marginLeft: '10px' }}>finhealth.app · dashboard</span>
                </div>
                <div className="preview-inner">
                    <div className="p-card">
                        <div className="p-card-label">Financial Behaviour Score</div>
                        <div className="p-score-row">
                            <div>
                                <div className="p-score-num">{score}</div>
                                <div className="p-moneysign">{moneySign}</div>
                            </div>
                            <div className="p-score-right">
                                <div className="p-bar-track"><div className="p-bar-fill" style={{ width: fillWidth }}></div></div>
                                <div className="p-score-sub">{label}</div>
                            </div>
                        </div>
                    </div>
                    <div className="p-kpi-row">
                        <div className="p-kpi"><div className="p-kpi-label">Net Worth</div><div className="p-kpi-val">{fmtInr(netWorth)}</div><div className="p-kpi-sub">Assets minus liabilities</div></div>
                        <div className="p-kpi"><div className="p-kpi-label">Monthly Savings</div><div className="p-kpi-val">{fmtInr(savings)}</div><div className="p-kpi-sub">After expenses & EMIs</div></div>
                        <div className="p-kpi"><div className="p-kpi-label">Tax Saved</div><div className="p-kpi-val">{fmtInr(taxSaved)}</div><div className="p-kpi-sub">Annually</div></div>
                    </div>
                    <div className="p-actions">
                        <div className="p-actions-hdr"><span className="p-actions-title">Action Plan</span><span className="p-actions-ct">{pendingCount} pending</span></div>
                        {actionItems.map((item, i) => (
                            <div key={i} className={`p-ai ${doneItems[i] ? 'done' : ''}`}>
                                <div className={`p-cb ${checkedItems[i] ? 'checked' : ''}`}></div>
                                <div>
                                    <div className="p-ai-meta">{item.title}</div>
                                    <div className="p-ai-name">{item.name}</div>
                                </div>
                                <div className="p-ai-right">
                                    <span className="p-fbs">{item.fbs}</span>
                                    <span className="p-ai-amt">{item.amt}</span>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
            <div className="p-cursor" style={{ left: cursorPos.left, top: cursorPos.top }}></div>
        </div>
    );
}

export default AuthPreviewCard;
