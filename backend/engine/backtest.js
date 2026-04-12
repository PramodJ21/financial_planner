/**
 * Portfolio Backtest Engine — Phase 3
 *
 * Supports buy-and-hold (none) plus 5 rebalancing strategies:
 *   monthly | quarterly | annually | threshold | threshold_calendar
 *
 * config: {
 *   from_date, to_date,
 *   benchmark: 'fd_7pct' | 'fd_8pct' | 'nifty50',
 *   rebalance_strategy: 'none' | 'monthly' | 'quarterly' | 'annually' | 'threshold' | 'threshold_calendar',
 *   rebalance_threshold_pct: number (default 5),
 *   transaction_cost_pct: number (default 0),
 * }
 */

const { ensureData } = require('../market_data/on_demand_fetcher');

const DEFAULT_RISK_FREE = 0.065; // 6.5% p.a. for Sharpe / Sortino

// ── Date helpers ──────────────────────────────────────────────────────────────

function daysBetween(d1, d2) {
    return (new Date(d2) - new Date(d1)) / 86400000;
}

function yearsBetween(d1, d2) {
    return daysBetween(d1, d2) / 365.25;
}

// ── Price lookup with fallback to most recent prior date ─────────────────────

function buildNavLookup(rows) {
    const sorted = rows
        .map((r) => ({ date: r.date, nav: parseFloat(r.nav) }))
        .sort((a, b) => a.date.localeCompare(b.date));
    return {
        dates: sorted.map((r) => r.date),
        navs: sorted.map((r) => r.nav),
    };
}

function getNavAt(lookup, targetDate) {
    if (!lookup || lookup.dates.length === 0) return null;
    const { dates, navs } = lookup;
    let lo = 0, hi = dates.length - 1, idx = -1;
    while (lo <= hi) {
        const mid = (lo + hi) >> 1;
        if (dates[mid] <= targetDate) { idx = mid; lo = mid + 1; }
        else hi = mid - 1;
    }
    return idx >= 0 ? navs[idx] : null;
}

// ── Fixed-return rates ────────────────────────────────────────────────────────

// Named presets for the built-in fixed-return instruments.
const FIXED_RATE_MAP = {
    'FD-7PCT':  0.07,
    'FD-8PCT':  0.08,
    'PPF':      0.071,
    'SUKANYA':  0.082,
};

/**
 * Resolve the annual rate for a fixed-return holding.
 * `customRate` comes from instruments.custom_return_rate (user-created instruments).
 */
function getFixedRate(ticker, customRate) {
    if (customRate != null && !isNaN(parseFloat(customRate))) return parseFloat(customRate);
    return FIXED_RATE_MAP[ticker?.toUpperCase()] ?? 0.07;
}

// ── Statistics ────────────────────────────────────────────────────────────────

function mean(arr) {
    if (arr.length === 0) return 0;
    return arr.reduce((s, v) => s + v, 0) / arr.length;
}

function stddev(arr) {
    if (arr.length < 2) return 0;
    const m = mean(arr);
    const variance = arr.reduce((s, v) => s + (v - m) ** 2, 0) / (arr.length - 1);
    return Math.sqrt(variance);
}

function percentile(sortedArr, p) {
    const idx = Math.floor(p * sortedArr.length);
    return sortedArr[Math.max(0, Math.min(idx, sortedArr.length - 1))];
}

// ── Holding value helper ──────────────────────────────────────────────────────

// For fixed-return holdings, u.refDate is the date from which u.amount compounds.
// Initialised to startDate; updated on each rebalance.
function holdingValue(u, date, navLookup) {
    if (u.type === 'fixed') {
        return u.amount * Math.pow(1 + u.rate, daysBetween(u.refDate, date) / 365.25);
    }
    const nav = getNavAt(navLookup, date);
    return nav ? u.units * nav : 0;
}

// ── Rebalancing helpers ───────────────────────────────────────────────────────

const QUARTER_MONTHS = new Set(['01', '04', '07', '10']);

/**
 * Returns the rebalance trigger string if we should rebalance on `date`,
 * or null otherwise.
 */
function getRebalanceTrigger(date, prevDate, strategy, thresholdPct, holdings, navLookups, holdingUnits, cash) {
    if (!prevDate || strategy === 'none') return null;

    const dm = date.slice(5, 7);
    const pm = prevDate.slice(5, 7);
    const isNewMonth   = dm !== pm;
    const isQtrStart   = isNewMonth && QUARTER_MONTHS.has(dm);
    const isYearStart  = isNewMonth && dm === '01';

    switch (strategy) {
        case 'monthly':
            return isNewMonth ? 'monthly' : null;
        case 'quarterly':
            return isQtrStart ? 'quarterly' : null;
        case 'annually':
            return isYearStart ? 'annually' : null;
        case 'threshold':
            return driftExceeded(date, holdings, navLookups, holdingUnits, cash, thresholdPct) ? 'threshold' : null;
        case 'threshold_calendar':
            // Check monthly; rebalance only when threshold also breached
            if (isNewMonth && driftExceeded(date, holdings, navLookups, holdingUnits, cash, thresholdPct)) {
                return 'threshold_calendar';
            }
            return null;
        default:
            return null;
    }
}

/** Returns true if any holding has drifted more than thresholdPct from its target allocation. */
function driftExceeded(date, holdings, navLookups, holdingUnits, cash, thresholdPct) {
    let total = cash;
    const vals = {};
    for (const h of holdings) {
        const u = holdingUnits[h.instrument_id];
        const v = u ? holdingValue(u, date, navLookups[h.instrument_id]) : 0;
        vals[h.instrument_id] = v;
        total += v;
    }
    if (total <= 0) return false;

    for (const h of holdings) {
        const actual = (vals[h.instrument_id] / total) * 100;
        const target = parseFloat(h.allocation_pct);
        if (Math.abs(actual - target) > thresholdPct) return true;
    }
    return false;
}

/**
 * Performs a rebalance: mutates holdingUnits, returns { newCash, costInr, logEntry }.
 * costPct is a percentage (e.g. 0.1 means 0.1%).
 */
function performRebalance(date, holdings, navLookups, holdingUnits, cash, costPct, trigger) {
    const totalAllocPct = holdings.reduce((s, h) => s + parseFloat(h.allocation_pct), 0);

    // Step 1 — current values
    let totalValue = cash;
    const currentVals = {};
    for (const h of holdings) {
        const u = holdingUnits[h.instrument_id];
        const v = u ? holdingValue(u, date, navLookups[h.instrument_id]) : 0;
        currentVals[h.instrument_id] = v;
        totalValue += v;
    }

    // Step 2 — compute transaction volume = Σ|drift| / 2
    const cashTargetBefore = totalValue * Math.max(0, 100 - totalAllocPct) / 100;
    let tradedVolume = Math.abs(cash - cashTargetBefore);
    for (const h of holdings) {
        const target = totalValue * parseFloat(h.allocation_pct) / 100;
        tradedVolume += Math.abs((currentVals[h.instrument_id] || 0) - target);
    }
    tradedVolume /= 2;

    // Step 3 — deduct cost
    const costInr = tradedVolume * (costPct / 100);
    const adjustedTotal = totalValue - costInr;

    // Step 4 — update units to hit new targets
    const trades = [];
    for (const h of holdings) {
        const u = holdingUnits[h.instrument_id];
        if (!u) continue;
        const newTarget = adjustedTotal * parseFloat(h.allocation_pct) / 100;
        const oldValue  = currentVals[h.instrument_id] || 0;

        if (u.type === 'nav') {
            const nav = getNavAt(navLookups[h.instrument_id], date);
            if (nav && nav > 0) {
                u.units = newTarget / nav;
            }
        } else {
            u.amount  = newTarget;
            u.refDate = date;
        }

        trades.push({
            name:         h.instrument_name,
            old_value:    +oldValue.toFixed(2),
            new_value:    +newTarget.toFixed(2),
            trade_amount: +Math.abs(oldValue - newTarget).toFixed(2),
        });
    }

    const newCash = adjustedTotal * Math.max(0, 100 - totalAllocPct) / 100;

    return {
        newCash,
        costInr,
        logEntry: {
            date,
            trigger,
            portfolio_value: +adjustedTotal.toFixed(2),
            cost_inr:        +costInr.toFixed(2),
            trades,
        },
    };
}

// ── Metrics computation ───────────────────────────────────────────────────────

function computeMetrics(dailyValues, benchmarkValues, riskFree = DEFAULT_RISK_FREE) {
    if (dailyValues.length < 2) return null;

    const startVal  = dailyValues[0].value;
    const endVal    = dailyValues[dailyValues.length - 1].value;
    const startDate = dailyValues[0].date;
    const endDate   = dailyValues[dailyValues.length - 1].date;
    const years     = yearsBetween(startDate, endDate);
    if (years <= 0) return null;

    const cagr        = Math.pow(endVal / startVal, 1 / years) - 1;
    const totalReturn = (endVal - startVal) / startVal;

    const logReturns = [];
    for (let i = 1; i < dailyValues.length; i++) {
        const prev = dailyValues[i - 1].value;
        const curr = dailyValues[i].value;
        if (prev > 0) logReturns.push(Math.log(curr / prev));
    }

    let maxDD = 0, peak = startVal;
    for (const { value } of dailyValues) {
        if (value > peak) peak = value;
        const dd = (value - peak) / peak;
        if (dd < maxDD) maxDD = dd;
    }

    const vol = stddev(logReturns) * Math.sqrt(252);

    // Sharpe & Sortino: use arithmetic mean of daily excess returns (annualized),
    // not CAGR. CAGR (geometric mean) understates the numerator for volatile portfolios.
    const rfDaily          = riskFree / 252;
    const meanDailyReturn  = logReturns.length > 0 ? Math.exp(mean(logReturns)) - 1 : 0;
    const excessAnnualized = (meanDailyReturn - rfDaily) * 252;

    const sharpe  = vol > 0 ? excessAnnualized / vol : 0;
    const negR    = logReturns.filter((r) => r < 0);
    const dVol    = negR.length > 1 ? stddev(negR) * Math.sqrt(252) : vol;
    const sortino = dVol > 0 ? excessAnnualized / dVol : 0;
    const calmar  = maxDD < 0 ? cagr / Math.abs(maxDD) : 0;
    const sortedR = [...logReturns].sort((a, b) => a - b);
    const var95   = percentile(sortedR, 0.05);

    let benchCAGR = null, alpha = null, beta = null;
    if (benchmarkValues && benchmarkValues.length >= 2) {
        const bStart = benchmarkValues[0].value;
        const bEnd   = benchmarkValues[benchmarkValues.length - 1].value;
        const bYears = yearsBetween(benchmarkValues[0].date, benchmarkValues[benchmarkValues.length - 1].date);
        if (bYears > 0) benchCAGR = Math.pow(bEnd / bStart, 1 / bYears) - 1;

        const portMap = {}, benchMap = {};
        for (let i = 1; i < dailyValues.length; i++) {
            const p = dailyValues[i - 1], c = dailyValues[i];
            if (p.value > 0) portMap[c.date] = Math.log(c.value / p.value);
        }
        for (let i = 1; i < benchmarkValues.length; i++) {
            const p = benchmarkValues[i - 1], c = benchmarkValues[i];
            if (p.value > 0) benchMap[c.date] = Math.log(c.value / p.value);
        }
        const common = Object.keys(portMap).filter((d) => benchMap[d] !== undefined);
        if (common.length > 30) {
            const pR = common.map((d) => portMap[d]);
            const bR = common.map((d) => benchMap[d]);
            const pMean = mean(pR), bMean = mean(bR);
            const cov  = pR.reduce((s, r, i) => s + (r - pMean) * (bR[i] - bMean), 0) / (pR.length - 1);
            const bVar = bR.reduce((s, r) => s + (r - bMean) ** 2, 0) / (bR.length - 1);
            beta = bVar > 0 ? cov / bVar : 1;
            if (benchCAGR !== null) alpha = cagr - (riskFree + beta * (benchCAGR - riskFree));
        }
    }

    const yearlyReturns = computeYearlyReturns(dailyValues, benchmarkValues);

    // Drawdown series (monthly sampled for charting)
    const drawdownSeries = [];
    let ddPeak = startVal;
    for (const { date, value } of dailyValues) {
        if (value > ddPeak) ddPeak = value;
        drawdownSeries.push({ date, drawdown: ddPeak > 0 ? +((value - ddPeak) / ddPeak * 100).toFixed(2) : 0 });
    }
    // Sample monthly (last point per month)
    const ddMonthly = {};
    for (const pt of drawdownSeries) ddMonthly[pt.date.slice(0, 7)] = pt;
    const drawdownSeriesMonthly = Object.values(ddMonthly).sort((a, b) => a.date.localeCompare(b.date));

    return {
        cagr:            +(cagr * 100).toFixed(2),
        total_return:    +(totalReturn * 100).toFixed(2),
        final_value:     +endVal.toFixed(2),
        initial_value:   +startVal.toFixed(2),
        max_drawdown:    +(maxDD * 100).toFixed(2),
        volatility:      +(vol * 100).toFixed(2),
        sharpe:          +sharpe.toFixed(3),
        sortino:         +sortino.toFixed(3),
        calmar:          +calmar.toFixed(3),
        var_95:          +(var95 * 100).toFixed(3),
        years:           +years.toFixed(2),
        start_date:      startDate,
        end_date:        endDate,
        benchmark_cagr:  benchCAGR !== null ? +(benchCAGR * 100).toFixed(2) : null,
        alpha:           alpha !== null ? +(alpha * 100).toFixed(2) : null,
        beta:            beta !== null ? +beta.toFixed(3) : null,
        yearly_returns:    yearlyReturns,
        drawdown_series:  drawdownSeriesMonthly,
        risk_free_rate:   +(riskFree * 100).toFixed(2),
    };
}

function computeYearlyReturns(dailyValues, benchmarkValues) {
    const byYear = {}, benchByYear = {};
    for (const { date, value } of dailyValues) {
        const y = date.slice(0, 4);
        (byYear[y] = byYear[y] || []).push({ date, value });
    }
    if (benchmarkValues) {
        for (const { date, value } of benchmarkValues) {
            const y = date.slice(0, 4);
            (benchByYear[y] = benchByYear[y] || []).push({ date, value });
        }
    }
    return Object.keys(byYear).sort().map((y) => {
        const pts  = byYear[y];
        const pRet = pts.length >= 2
            ? +((pts[pts.length - 1].value - pts[0].value) / pts[0].value * 100).toFixed(2)
            : 0;
        let bRet = null;
        if (benchByYear[y]?.length >= 2) {
            const bp = benchByYear[y];
            bRet = +((bp[bp.length - 1].value - bp[0].value) / bp[0].value * 100).toFixed(2);
        }
        return { year: parseInt(y), portfolio_return: pRet, benchmark_return: bRet };
    });
}

function sampleMonthly(dailyValues, benchmarkValues) {
    const portMonthly = {}, benchMonthly = {};
    for (const { date, value } of dailyValues)
        portMonthly[date.slice(0, 7)] = { date, value };
    if (benchmarkValues) {
        for (const { date, value } of benchmarkValues)
            benchMonthly[date.slice(0, 7)] = { date, value };
    }
    return Object.keys(portMonthly).sort().map((ym) => ({
        date:       portMonthly[ym].date,
        portfolio:  +portMonthly[ym].value.toFixed(2),
        benchmark:  benchMonthly[ym] ? +benchMonthly[ym].value.toFixed(2) : null,
    }));
}

function computeFdBenchmark(dates, principal, rate) {
    const startDate = dates[0];
    return dates.map((date) => ({
        date,
        value: +(principal * Math.pow(1 + rate, daysBetween(startDate, date) / 365.25)).toFixed(2),
    }));
}

// Sample monthly dates from allDates — take the last trading day of each month
function monthlyDates(allDates) {
    const seen = {};
    for (const d of allDates) seen[d.slice(0, 7)] = d; // last date wins
    return Object.values(seen).sort();
}

function computeHoldingsMetrics(holdings, navLookups, allDates, principal) {
    if (allDates.length < 2) return [];
    const startDate  = allDates[0];
    const endDate    = allDates[allDates.length - 1];
    const years      = yearsBetween(startDate, endDate);
    const mDates     = monthlyDates(allDates);

    return holdings.map((h) => {
        const alloc  = parseFloat(h.allocation_pct);
        const amount = principal * alloc / 100;

        if (h.instrument_type === 'fixed_return') {
            const rate   = getFixedRate(h.ticker, h.custom_return_rate);
            const finalV = amount * Math.pow(1 + rate, years);
            const totRet = (finalV / amount - 1);
            // Build series: compound growth at each monthly date
            const startMs = new Date(startDate).getTime();
            const series  = mDates.map((d) => {
                const t = (new Date(d).getTime() - startMs) / (365.25 * 24 * 3600 * 1000);
                return { date: d, value: +(amount * Math.pow(1 + rate, t)).toFixed(2) };
            });
            return {
                instrument_id:    h.instrument_id,
                group_id:         h.group_id || null,
                name:             h.instrument_name,
                ticker:           h.ticker,
                allocation_pct:   alloc,
                total_return:     +(totRet * 100).toFixed(2),
                cagr:             +(rate * 100).toFixed(2),
                final_value:      +finalV.toFixed(2),
                contribution_pct: +((alloc / 100) * totRet * 100).toFixed(2),
                series,
            };
        }

        const lookup   = navLookups[h.instrument_id];
        const startNav = getNavAt(lookup, startDate);
        const endNav   = getNavAt(lookup, endDate);
        if (!startNav || !endNav) {
            return { instrument_id: h.instrument_id, name: h.instrument_name, ticker: h.ticker,
                     allocation_pct: alloc, total_return: null, cagr: null, final_value: null, series: [] };
        }

        const totalReturn     = (endNav - startNav) / startNav;
        const holdingCagr     = years > 0 ? (Math.pow(endNav / startNav, 1 / years) - 1) : 0;
        const finalVal        = amount * (endNav / startNav);
        const contributionPct = +((alloc / 100) * totalReturn * 100).toFixed(2);

        // Monthly series: value of initial investment at each point
        const series = mDates.map((d) => {
            const nav = getNavAt(lookup, d);
            return nav ? { date: d, value: +(amount * nav / startNav).toFixed(2) } : null;
        }).filter(Boolean);

        const dailyVals = allDates.map((d) => getNavAt(lookup, d)).filter(Boolean);
        let maxDD = 0;
        if (dailyVals.length === 0) {
            maxDD = null;
        } else {
            let pk = dailyVals[0];
            for (const v of dailyVals) {
                if (v > pk) pk = v;
                const dd = (v - pk) / pk;
                if (dd < maxDD) maxDD = dd;
            }
        }

        return {
            instrument_id:    h.instrument_id,
            group_id:         h.group_id || null,
            name:             h.instrument_name,
            ticker:           h.ticker,
            allocation_pct:   alloc,
            total_return:     +(totalReturn * 100).toFixed(2),
            cagr:             +(holdingCagr * 100).toFixed(2),
            final_value:      +finalVal.toFixed(2),
            max_drawdown:     maxDD !== null ? +(maxDD * 100).toFixed(2) : null,
            contribution_pct: contributionPct,
            series,
        };
    });
}

// ── Rolling 1Y returns (monthly sampled) ─────────────────────────────────────
function computeRollingReturns(dailyValues) {
    // Build month → last value of that month
    const monthly = {};
    for (const { date, value } of dailyValues) monthly[date.slice(0, 7)] = value;
    const months = Object.keys(monthly).sort();

    const result = [];
    for (const m of months) {
        const [y, mo] = m.split('-').map(Number);
        const prevDate = new Date(y, mo - 1, 1);
        prevDate.setFullYear(prevDate.getFullYear() - 1);
        const prevM = prevDate.toISOString().slice(0, 7);
        if (!monthly[prevM]) continue;
        const curr = monthly[m], prev = monthly[prevM];
        if (prev > 0) result.push({ date: m, return_1y: +((curr / prev - 1) * 100).toFixed(2) });
    }
    return result;
}

// ── Correlation matrix ─────────────────────────────────────────────────────────
function computeCorrelationMatrix(holdings, navLookups, allDates) {
    const mkt = holdings.filter((h) => h.instrument_type !== 'fixed_return' && navLookups[h.instrument_id]);
    if (mkt.length < 2) return null;

    // Build daily log-return arrays per holding
    const series = mkt.map((h) => {
        const lookup = navLookups[h.instrument_id];
        return allDates.slice(1).map((d, i) => {
            const prev = getNavAt(lookup, allDates[i]);
            const curr = getNavAt(lookup, d);
            return prev > 0 && curr > 0 ? Math.log(curr / prev) : null;
        });
    });

    const n = mkt.length;
    const matrix = [];
    for (let i = 0; i < n; i++) {
        const row = [];
        for (let j = 0; j < n; j++) {
            if (i === j) { row.push(1.0); continue; }
            const pairs = [];
            for (let k = 0; k < series[i].length; k++) {
                if (series[i][k] !== null && series[j][k] !== null)
                    pairs.push([series[i][k], series[j][k]]);
            }
            if (pairs.length < 20) { row.push(null); continue; }
            const ai = pairs.map((p) => p[0]), aj = pairs.map((p) => p[1]);
            const mi = mean(ai), mj = mean(aj);
            const num = ai.reduce((s, v, k) => s + (v - mi) * (aj[k] - mj), 0);
            const di  = Math.sqrt(ai.reduce((s, v) => s + (v - mi) ** 2, 0));
            const dj  = Math.sqrt(aj.reduce((s, v) => s + (v - mj) ** 2, 0));
            row.push(di > 0 && dj > 0 ? +(num / (di * dj)).toFixed(3) : null);
        }
        matrix.push(row);
    }
    return { labels: mkt.map((h) => h.instrument_name), matrix };
}

// ── Group-level metrics ───────────────────────────────────────────────────────
function computeGroupMetrics(holdingsMetrics, groupsById) {
    const byGroup = {};
    for (const h of holdingsMetrics) {
        if (h.group_id == null) continue;
        (byGroup[h.group_id] = byGroup[h.group_id] || []).push(h);
    }
    return Object.entries(byGroup).map(([gid, hh]) => {
        const totalAlloc = hh.reduce((s, h) => s + h.allocation_pct, 0);
        const withReturn = hh.filter((h) => h.total_return !== null);
        const wAvgReturn = withReturn.length
            ? withReturn.reduce((s, h) => s + h.total_return * h.allocation_pct, 0) / totalAlloc
            : null;
        const wAvgCagr = withReturn.length
            ? withReturn.reduce((s, h) => s + h.cagr * h.allocation_pct, 0) / totalAlloc
            : null;
        const totalContrib = hh.reduce((s, h) => s + (h.contribution_pct || 0), 0);
        const g = groupsById[gid];
        return {
            group_id:        +gid,
            name:            g?.name || 'Group',
            color:           g?.color || null,
            allocation_pct:  +totalAlloc.toFixed(2),
            avg_return:      wAvgReturn !== null ? +wAvgReturn.toFixed(2) : null,
            avg_cagr:        wAvgCagr   !== null ? +wAvgCagr.toFixed(2)   : null,
            contribution_pct: +totalContrib.toFixed(2),
            holding_count:   hh.length,
        };
    });
}

// ── Main engine ───────────────────────────────────────────────────────────────

async function runBacktest(pool, portfolioId, config) {
    const {
        from_date,
        to_date,
        benchmark               = 'fd_7pct',
        benchmark_instrument_id = null,   // required when benchmark === 'instrument'
        rebalance_strategy      = 'none',
        rebalance_threshold_pct = 5,
        transaction_cost_pct    = 0,
        slippage_pct            = 0,
        risk_free_rate,
    } = config;
    const riskFree = risk_free_rate != null && !isNaN(parseFloat(risk_free_rate))
        ? parseFloat(risk_free_rate) / 100
        : DEFAULT_RISK_FREE;

    // 1. Portfolio
    const portRes = await pool.query('SELECT principal FROM portfolios WHERE id = $1', [portfolioId]);
    if (portRes.rows.length === 0) throw new Error('Portfolio not found.');
    const principal = parseFloat(portRes.rows[0].principal);

    // 2. Holdings
    const holdRes = await pool.query(
        `SELECT h.id, h.group_id, h.instrument_id, h.allocation_pct,
                i.ticker, i.name AS instrument_name, i.instrument_type,
                i.custom_return_rate
         FROM holdings h
         JOIN instruments i ON h.instrument_id = i.id
         WHERE h.portfolio_id = $1 AND h.archived = false`,
        [portfolioId]
    );

    // Also fetch group names for group_metrics
    const groupRes = await pool.query(
        `SELECT id, name, color FROM portfolio_groups WHERE portfolio_id = $1`,
        [portfolioId]
    );
    const groupsById = Object.fromEntries(groupRes.rows.map((g) => [g.id, g]));
    const holdings = holdRes.rows;
    if (holdings.length === 0) throw new Error('Portfolio has no holdings.');

    // 3. Fetch price data
    const mktIds = holdings.filter((h) => h.instrument_type !== 'fixed_return').map((h) => h.instrument_id);
    let priceRows = [];
    let effectiveFrom = from_date;
    let effectiveTo   = to_date;

    if (mktIds.length > 0) {
        // First: find what data actually exists for these instruments (no date filter)
        const coverageRes = await pool.query(
            `SELECT i.id, i.name, i.instrument_type,
                    MIN(ph.date)::text AS first_date,
                    MAX(ph.date)::text AS last_date,
                    COUNT(ph.id)::int  AS nav_count
             FROM instruments i
             LEFT JOIN price_history ph ON ph.instrument_id = i.id
             WHERE i.id = ANY($1)
             GROUP BY i.id, i.name, i.instrument_type
             ORDER BY nav_count ASC`,
            [mktIds]
        );
        const coverage = coverageRes.rows;

        const noData  = coverage.filter((r) => r.nav_count === 0);
        const stale   = coverage.filter((r) => r.nav_count > 0 && r.last_date < to_date);

        // Auto-fetch: instruments with no data or stale coverage
        const needsFetch = [...noData, ...stale];
        if (needsFetch.length > 0) {
            console.log(`[backtest] Auto-fetching data for ${needsFetch.length} instrument(s)…`);
            // Fetch full instrument rows so ensureData has exchange + amfi_code
            const instRes = await pool.query(
                `SELECT id, ticker, name, instrument_type, exchange, amfi_code
                 FROM instruments WHERE id = ANY($1)`,
                [needsFetch.map((r) => r.id)]
            );
            const instMap = Object.fromEntries(instRes.rows.map((r) => [r.id, r]));

            for (const row of needsFetch) {
                const inst = instMap[row.id];
                if (!inst) continue;
                try {
                    await ensureData(pool, inst, from_date, to_date);
                } catch (fetchErr) {
                    // Non-fatal: log and continue — backtest will use whatever data exists
                    console.warn(`[backtest] Could not fetch data for "${row.name}": ${fetchErr.message}`);
                }
            }

            // Re-query coverage after fetching
            const refreshRes = await pool.query(
                `SELECT i.id, i.name, i.instrument_type,
                        MIN(ph.date)::text AS first_date,
                        MAX(ph.date)::text AS last_date,
                        COUNT(ph.id)::int  AS nav_count
                 FROM instruments i
                 LEFT JOIN price_history ph ON ph.instrument_id = i.id
                 WHERE i.id = ANY($1)
                 GROUP BY i.id, i.name, i.instrument_type`,
                [mktIds]
            );
            // Replace coverage with refreshed data
            coverage.length = 0;
            coverage.push(...refreshRes.rows);
        }

        // After fetch attempt, surface hard errors for any still-missing instruments
        const stillNoData = coverage.filter((r) => r.nav_count === 0);
        if (stillNoData.length > 0) {
            const names = stillNoData.slice(0, 2).map((r) => r.name).join(', ');
            const extra = stillNoData.length > 2 ? ` (+${stillNoData.length - 2} more)` : '';
            throw new Error(
                `Could not retrieve price data for: ${names}${extra}. ` +
                `The ticker may not be supported or the data source may be unavailable.`
            );
        }

        const hasData = coverage.filter((r) => r.nav_count > 0);
        if (hasData.length > 0) {
            // Determine the actual overlapping range across all instruments (intersection, not union)
            // Use max of first_date so all instruments have data from the start
            const globalFirst = hasData.reduce((m, r) => r.first_date > m ? r.first_date : m, hasData[0].first_date);
            // Use min of last_date so all instruments have data through the end
            const globalLast  = hasData.reduce((m, r) => r.last_date  < m ? r.last_date  : m, hasData[0].last_date);

            // Find which instruments are limiting the window (for helpful error messages)
            const limitingLast  = hasData.find((r) => r.last_date  === globalLast);
            const limitingFirst = hasData.find((r) => r.first_date === globalFirst);

            // No common overlap at all (one instrument ends before another begins)
            if (globalFirst > globalLast) {
                const nameA = limitingFirst ? `"${limitingFirst.name}"` : 'one instrument';
                const nameB = limitingLast  ? `"${limitingLast.name}"`  : 'another instrument';
                throw new Error(
                    `The selected instruments have no overlapping date range: ` +
                    `${nameA} starts on ${globalFirst.slice(0,7)} but ${nameB} only has data until ${globalLast.slice(0,7)}. ` +
                    `Remove one of them or choose instruments with overlapping coverage.`
                );
            }

            // If the requested from_date is after the common window ends, error
            if (from_date > globalLast) {
                const instNote = limitingLast
                    ? ` ("${limitingLast.name}" only has data until ${globalLast.slice(0,7)})`
                    : '';
                throw new Error(
                    `Requested start date (${from_date.slice(0,7)}) is after the common data range ends (${globalLast.slice(0,7)})${instNote}. ` +
                    `Remove that instrument or choose an earlier date range.`
                );
            }

            // Auto-clip: if requested from_date is before first available date, start from first available
            if (from_date < globalFirst) effectiveFrom = globalFirst;
            // Auto-clip to_date to last available
            if (to_date > globalLast)    effectiveTo   = globalLast;
        }

        const priceRes = await pool.query(
            `SELECT instrument_id, date::text AS date, nav
             FROM price_history
             WHERE instrument_id = ANY($1) AND date >= $2 AND date <= $3
             ORDER BY instrument_id, date`,
            [mktIds, effectiveFrom, effectiveTo]
        );
        priceRows = priceRes.rows;

        if (priceRows.length === 0) {
            throw new Error(
                `No price data found between ${effectiveFrom.slice(0,7)} and ${effectiveTo.slice(0,7)}. ` +
                `Try a different date range.`
            );
        }
    }

    // Build nav lookups
    const rawByInstrument = {};
    for (const row of priceRows) {
        (rawByInstrument[row.instrument_id] = rawByInstrument[row.instrument_id] || []).push(row);
    }
    const navLookups = {};
    for (const [id, rows] of Object.entries(rawByInstrument)) {
        navLookups[id] = buildNavLookup(rows);
    }

    // 4. Trading date universe
    const dateSet = new Set();
    for (const rows of Object.values(rawByInstrument)) {
        for (const r of rows) dateSet.add(r.date);
    }
    if (dateSet.size === 0) {
        const cur = new Date(from_date), end = new Date(to_date);
        while (cur <= end) {
            dateSet.add(cur.toISOString().slice(0, 10));
            cur.setMonth(cur.getMonth() + 1);
        }
    }
    const allDates = Array.from(dateSet).sort();
    if (allDates.length === 0) throw new Error('No trading dates available.');

    const startDate = allDates[0];

    // 5. Initial holding units
    const holdingUnits = {};
    for (const h of holdings) {
        const amount = principal * parseFloat(h.allocation_pct) / 100;
        if (h.instrument_type === 'fixed_return') {
            holdingUnits[h.instrument_id] = { type: 'fixed', amount, rate: getFixedRate(h.ticker, h.custom_return_rate), refDate: startDate };
        } else {
            const startNav = getNavAt(navLookups[h.instrument_id], startDate);
            if (startNav && startNav > 0) {
                holdingUnits[h.instrument_id] = { type: 'nav', units: amount / startNav };
            }
        }
    }

    const totalAllocPct = holdings.reduce((s, h) => s + parseFloat(h.allocation_pct), 0);
    let cash = principal * Math.max(0, 100 - totalAllocPct) / 100;

    // 6. Walk-forward with rebalancing
    const dailyValues   = [];
    const rebalanceLog  = [];
    let   totalCost     = 0;
    let   prevDate      = null;

    for (const date of allDates) {
        // Rebalancing check (skip the very first date)
        if (prevDate !== null && rebalance_strategy !== 'none') {
            const trigger = getRebalanceTrigger(
                date, prevDate, rebalance_strategy, parseFloat(rebalance_threshold_pct),
                holdings, navLookups, holdingUnits, cash
            );
            if (trigger) {
                const effectiveCostPct = parseFloat(transaction_cost_pct) + parseFloat(slippage_pct);
                const { newCash, costInr, logEntry } = performRebalance(
                    date, holdings, navLookups, holdingUnits, cash,
                    effectiveCostPct, trigger
                );
                cash      = newCash;
                totalCost += costInr;
                rebalanceLog.push(logEntry);
            }
        }

        // Portfolio value today
        let value = cash;
        for (const h of holdings) {
            const u = holdingUnits[h.instrument_id];
            if (!u) continue;
            value += holdingValue(u, date, navLookups[h.instrument_id]);
        }
        dailyValues.push({ date, value });
        prevDate = date;
    }

    // 7. Benchmark
    let benchmarkValues = null;
    let benchmarkNote   = null;
    let benchmarkLabel  = benchmark;  // human-readable name returned in config

    if (benchmark === 'fd_7pct') {
        benchmarkValues = computeFdBenchmark(allDates, principal, 0.07);
        benchmarkLabel  = 'FD 7% p.a.';
    } else if (benchmark === 'fd_8pct') {
        benchmarkValues = computeFdBenchmark(allDates, principal, 0.08);
        benchmarkLabel  = 'FD 8% p.a.';
    } else if (benchmark === 'nifty50' || benchmark === 'instrument') {
        // Resolve instrument:
        //   'nifty50' (legacy)  → UTI-N50-IDX by ticker
        //   'instrument'        → use benchmark_instrument_id from config
        let benchInstRow = null;
        if (benchmark === 'nifty50') {
            const r = await pool.query(
                `SELECT id, ticker, name, instrument_type, exchange, amfi_code
                 FROM instruments WHERE ticker = 'UTI-N50-IDX' LIMIT 1`
            );
            benchInstRow = r.rows[0] || null;
        } else if (benchmark_instrument_id) {
            const r = await pool.query(
                `SELECT id, ticker, name, instrument_type, exchange, amfi_code
                 FROM instruments WHERE id = $1 LIMIT 1`,
                [benchmark_instrument_id]
            );
            benchInstRow = r.rows[0] || null;
        }

        if (benchInstRow) {
            benchmarkLabel = benchInstRow.name;
            // Auto-fetch benchmark data if missing or stale
            try {
                await ensureData(pool, benchInstRow, startDate, effectiveTo);
            } catch (fetchErr) {
                console.warn(`[backtest] Could not fetch benchmark data for "${benchInstRow.name}":`, fetchErr.message);
            }
            const bRes = await pool.query(
                `SELECT date::text AS date, nav FROM price_history
                 WHERE instrument_id = $1 AND date >= $2 AND date <= $3 ORDER BY date`,
                [benchInstRow.id, startDate, effectiveTo]
            );
            if (bRes.rows.length > 0) {
                const bLookup   = buildNavLookup(bRes.rows);
                const bStartNav = getNavAt(bLookup, startDate);
                if (bStartNav > 0) {
                    benchmarkValues = allDates.map((date) => {
                        const nav = getNavAt(bLookup, date);
                        return { date, value: nav ? principal * (nav / bStartNav) : principal };
                    });
                }
            }
        }

        if (!benchmarkValues) {
            console.warn(`[backtest] Benchmark data unavailable for "${benchmarkLabel}", falling back to FD 7%`);
            benchmarkValues = computeFdBenchmark(allDates, principal, 0.07);
            benchmarkNote   = `Benchmark data for "${benchmarkLabel}" was unavailable; fell back to FD 7%`;
            benchmarkLabel  = 'FD 7% (fallback)';
        }
    }

    // 8. Metrics + output
    const metrics         = computeMetrics(dailyValues, benchmarkValues, riskFree);
    if (!metrics) throw new Error('Not enough data to compute metrics.');

    const series          = sampleMonthly(dailyValues, benchmarkValues);
    const holdingsMetrics = computeHoldingsMetrics(holdings, navLookups, allDates, principal);
    const rollingReturns  = computeRollingReturns(dailyValues);
    const correlation     = computeCorrelationMatrix(holdings, navLookups, allDates);
    const groupMetrics    = computeGroupMetrics(holdingsMetrics, groupsById);

    // Compute compounded no-cost value: each cost saved at date d would have grown
    // at the same rate as the portfolio from d to the end.
    // growth_factor(d) = finalValue / portfolioValue(d)
    // hypothetical = finalValue + Σ(cost_i × growth_factor(d_i))
    const portfolioValueByDate = {};
    for (const { date, value } of dailyValues) portfolioValueByDate[date] = value;

    let compoundedCostValue = 0;
    for (const entry of rebalanceLog) {
        const v = portfolioValueByDate[entry.date];
        compoundedCostValue += v > 0
            ? entry.cost_inr * (metrics.final_value / v)
            : entry.cost_inr; // fallback: no growth data for that date
    }

    const rebalancingSummary = {
        strategy:                   rebalance_strategy,
        count:                      rebalanceLog.length,
        total_cost_inr:             +totalCost.toFixed(2),
        hypothetical_value_no_cost: +(metrics.final_value + compoundedCostValue).toFixed(2),
    };

    return {
        metrics,
        series,
        holdings_metrics:    holdingsMetrics,
        group_metrics:       groupMetrics,
        rolling_returns:     rollingReturns,
        correlation:         correlation,
        rebalancing_summary: rebalancingSummary,
        rebalancing_log:     rebalanceLog,
        config: {
            from_date:              startDate,
            to_date:                allDates[allDates.length - 1],
            benchmark,
            benchmark_instrument_id: benchmark_instrument_id || null,
            benchmark_label:        benchmarkLabel,
            benchmark_note:         benchmarkNote,
            rebalance_strategy,
            transaction_cost_pct:   parseFloat(transaction_cost_pct),
            slippage_pct:           parseFloat(slippage_pct),
            risk_free_rate:         +(riskFree * 100).toFixed(2),
        },
    };
}

module.exports = { runBacktest };
