import { useEffect, useState } from 'react';

function AuthPreviewCard() {
  // ── Score animation ──
  const [score, setScore] = useState(0);
  const [scoreLabel, setScoreLabel] = useState('Analysing your finances…');
  const [scorePhase, setScorePhase] = useState('loading'); // loading | revealed

  // ── KPI counters ──
  const [netWorth, setNetWorth] = useState(0);
  const [monthlySavings, setMonthlySavings] = useState(0);
  const [taxSaved, setTaxSaved] = useState(0);

  // ── Action items ──
  const [checkedItems, setCheckedItems] = useState([false, false, false]);
  const [doneItems, setDoneItems] = useState([false, false, false]);
  const [completedCount, setCompletedCount] = useState(0);

  // ── Goal growth ──
  const [goalCorpus, setGoalCorpus] = useState(0);

  const fmtInr = (n) => {
    if (n >= 10000000) return '₹' + (n / 10000000).toFixed(1) + 'Cr';
    if (n >= 100000) return '₹' + Math.round(n / 1000).toLocaleString('en-IN') + 'K';
    if (n >= 1000) return '₹' + Math.round(n / 1000) + 'K';
    return '₹' + n.toLocaleString('en-IN');
  };

  const countUp = (setFn, target, duration) => {
    let startTime = null;
    let frame;
    const step = (ts) => {
      if (!startTime) startTime = ts;
      const p = Math.min((ts - startTime) / duration, 1);
      const ease = 1 - Math.pow(1 - p, 3);
      setFn(Math.floor(ease * target));
      if (p < 1) frame = requestAnimationFrame(step);
    };
    frame = requestAnimationFrame(step);
    return () => cancelAnimationFrame(frame);
  };

  useEffect(() => {
    let timeouts = [];
    let cancels = [];

    const run = () => {
      // Reset everything
      setScore(0);
      setScoreLabel('Analysing your finances…');
      setScorePhase('loading');
      setNetWorth(0);
      setMonthlySavings(0);
      setTaxSaved(0);
      setGoalCorpus(0);
      setCheckedItems([false, false, false]);
      setDoneItems([false, false, false]);
      setCompletedCount(0);

      // Phase 1: Score counts up
      timeouts.push(setTimeout(() => {
        setScorePhase('revealed');
        cancels.push(countUp(setScore, 72, 2000));
        timeouts.push(setTimeout(() => {
          setScoreLabel('Good — above average for your age');
        }, 2100));
      }, 600));

      // Phase 2: KPIs count up (staggered)
      timeouts.push(setTimeout(() => cancels.push(countUp(setNetWorth, 14100000, 1400)), 1000));
      timeouts.push(setTimeout(() => cancels.push(countUp(setMonthlySavings, 85000, 1400)), 1300));
      timeouts.push(setTimeout(() => cancels.push(countUp(setTaxSaved, 92300, 1400)), 1600));

      // Phase 3: Action items check off one by one
      [0, 1, 2].forEach((i) => {
        timeouts.push(setTimeout(() => {
          setCheckedItems(prev => { const n = [...prev]; n[i] = true; return n; });
          timeouts.push(setTimeout(() => {
            setDoneItems(prev => { const n = [...prev]; n[i] = true; return n; });
            setCompletedCount(c => c + 1);
          }, 400));
        }, 3200 + i * 1200));
      });

      // Phase 4: Goal corpus grows
      timeouts.push(setTimeout(() => cancels.push(countUp(setGoalCorpus, 40000000, 1800)), 4000));

      // Restart loop
      timeouts.push(setTimeout(run, 9000));
    };

    timeouts.push(setTimeout(run, 800));

    return () => {
      timeouts.forEach(clearTimeout);
      cancels.forEach(fn => fn && fn());
    };
  }, []);

  const actionItems = [
    { label: 'Build emergency fund', points: '+15', amount: '₹2.6L' },
    { label: 'Increase health insurance', points: '+8', amount: '₹6.0L' },
    { label: 'Start monthly SIP', points: '+20', amount: '₹40K/mo' },
  ];

  const scorePercent = Math.min(score, 100);
  const circumference = 2 * Math.PI * 54;
  const strokeOffset = circumference - (scorePercent / 100) * circumference;

  const getScoreColor = (s) => {
    if (s < 40) return '#8B2626';
    if (s < 60) return '#C4703A';
    if (s < 75) return '#92400E';
    return '#2D5A3D';
  };

  return (
    <div className="ap-right">
      <div className="ap-container">

        {/* ── Score Ring ── */}
        <div className="ap-score-section">
          <div className="ap-score-ring-wrap">
            <svg viewBox="0 0 120 120" className="ap-score-svg">
              <circle cx="60" cy="60" r="54" fill="none" stroke="#EDE7DC" strokeWidth="6" />
              <circle
                cx="60" cy="60" r="54" fill="none"
                stroke={getScoreColor(score)}
                strokeWidth="6"
                strokeLinecap="round"
                strokeDasharray={circumference}
                strokeDashoffset={strokeOffset}
                transform="rotate(-90 60 60)"
                style={{ transition: 'stroke-dashoffset 2s cubic-bezier(0.4, 0, 0.2, 1), stroke 0.5s' }}
              />
            </svg>
            <div className="ap-score-center">
              <span className="ap-score-num">{score}</span>
              <span className="ap-score-of">/100</span>
            </div>
          </div>
          <div className="ap-score-meta">
            <div className="ap-score-title">Financial Health Score</div>
            <div className={`ap-score-label ${scorePhase === 'revealed' && score > 50 ? 'good' : ''}`}>
              {scoreLabel}
            </div>
          </div>
        </div>

        {/* ── KPI Row ── */}
        <div className="ap-kpis">
          <div className="ap-kpi">
            <span className="ap-kpi-label">Net Worth</span>
            <span className="ap-kpi-value">{fmtInr(netWorth)}</span>
          </div>
          <div className="ap-kpi-divider" />
          <div className="ap-kpi">
            <span className="ap-kpi-label">Monthly Surplus</span>
            <span className="ap-kpi-value">{fmtInr(monthlySavings)}</span>
          </div>
          <div className="ap-kpi-divider" />
          <div className="ap-kpi">
            <span className="ap-kpi-label">Tax Savings</span>
            <span className="ap-kpi-value">{fmtInr(taxSaved)}</span>
          </div>
        </div>

        {/* ── Action Plan ── */}
        <div className="ap-actions-section">
          <div className="ap-actions-header">
            <span className="ap-actions-title">Your Action Plan</span>
            <span className="ap-actions-count">{completedCount}/3 done</span>
          </div>
          {actionItems.map((item, i) => (
            <div key={i} className={`ap-action-row ${doneItems[i] ? 'completed' : ''}`}>
              <div className={`ap-checkbox ${checkedItems[i] ? 'checked' : ''}`}>
                {checkedItems[i] && (
                  <svg width="10" height="10" viewBox="0 0 10 10">
                    <path d="M2 5 L4 7 L8 3" fill="none" stroke="#fff" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                )}
              </div>
              <span className="ap-action-label">{item.label}</span>
              <span className="ap-action-pts">{item.points} pts</span>
              <span className="ap-action-amt">{item.amount}</span>
            </div>
          ))}
        </div>

        {/* ── Goal Growth ── */}
        <div className="ap-goal-section">
          <div className="ap-goal-header">
            <span className="ap-goal-label">Goal: House in 20 years</span>
            <span className="ap-goal-value">{fmtInr(goalCorpus)}</span>
          </div>
          <div className="ap-goal-bar-track">
            <div
              className="ap-goal-bar-fill"
              style={{ width: `${Math.min((goalCorpus / 40000000) * 100, 100)}%` }}
            />
          </div>
          <div className="ap-goal-sub">₹48K/month SIP → projected corpus</div>
        </div>

      </div>
    </div>
  );
}

export default AuthPreviewCard;
