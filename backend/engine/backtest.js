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

const RISK_FREE = 0.065; // 6.5% p.a. for Sharpe / Sortino

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

function computeMetrics(dailyValues, benchmarkValues) {
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

    const vol     = stddev(logReturns) * Math.sqrt(252);
    const sharpe  = vol > 0 ? (cagr - RISK_FREE) / vol : 0;
    const negR    = logReturns.filter((r) => r < 0);
    const dVol    = negR.length > 1 ? stddev(negR) * Math.sqrt(252) : vol;
    const sortino = dVol > 0 ? (cagr - RISK_FREE) / dVol : 0;
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
            if (benchCAGR !== null) alpha = cagr - (RISK_FREE + beta * (benchCAGR - RISK_FREE));
        }
    }

    const yearlyReturns = computeYearlyReturns(dailyValues, benchmarkValues);

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
        yearly_returns:  yearlyReturns,
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

function computeHoldingsMetrics(holdings, navLookups, allDates, principal) {
    if (allDates.length < 2) return [];
    const startDate = allDates[0];
    const endDate   = allDates[allDates.length - 1];
    const years     = yearsBetween(startDate, endDate);

    return holdings.map((h) => {
        const alloc  = parseFloat(h.allocation_pct);
        const amount = principal * alloc / 100;

        if (h.instrument_type === 'fixed_return') {
            const rate    = getFixedRate(h.ticker, h.custom_return_rate);
            const finalV  = amount * Math.pow(1 + rate, years);
            return {
                instrument_id: h.instrument_id,
                name:          h.instrument_name,
                ticker:        h.ticker,
                allocation_pct: alloc,
                total_return:  +((finalV / amount - 1) * 100).toFixed(2),
                cagr:          +(rate * 100).toFixed(2),
                final_value:   +finalV.toFixed(2),
            };
        }

        const lookup   = navLookups[h.instrument_id];
        const startNav = getNavAt(lookup, startDate);
        const endNav   = getNavAt(lookup, endDate);
        if (!startNav || !endNav) {
            return { instrument_id: h.instrument_id, name: h.instrument_name, ticker: h.ticker,
                     allocation_pct: alloc, total_return: null, cagr: null, final_value: null };
        }

        const totalReturn  = (endNav - startNav) / startNav;
        const holdingCagr  = years > 0 ? (Math.pow(endNav / startNav, 1 / years) - 1) : 0;
        const finalVal     = amount * (endNav / startNav);

        const dailyVals = allDates.map((d) => getNavAt(lookup, d)).filter(Boolean);
        let maxDD = 0, pk = dailyVals[0];
        for (const v of dailyVals) {
            if (v > pk) pk = v;
            const dd = (v - pk) / pk;
            if (dd < maxDD) maxDD = dd;
        }

        return {
            instrument_id:  h.instrument_id,
            name:           h.instrument_name,
            ticker:         h.ticker,
            allocation_pct: alloc,
            total_return:   +(totalReturn * 100).toFixed(2),
            cagr:           +(holdingCagr * 100).toFixed(2),
            final_value:    +finalVal.toFixed(2),
            max_drawdown:   +(maxDD * 100).toFixed(2),
        };
    });
}

// ── Main engine ───────────────────────────────────────────────────────────────

async function runBacktest(pool, portfolioId, config) {
    const {
        from_date,
        to_date,
        benchmark             = 'fd_7pct',
        rebalance_strategy    = 'none',
        rebalance_threshold_pct = 5,
        transaction_cost_pct  = 0,
    } = config;

    // 1. Portfolio
    const portRes = await pool.query('SELECT principal FROM portfolios WHERE id = $1', [portfolioId]);
    if (portRes.rows.length === 0) throw new Error('Portfolio not found.');
    const principal = parseFloat(portRes.rows[0].principal);

    // 2. Holdings
    const holdRes = await pool.query(
        `SELECT h.id, h.instrument_id, h.allocation_pct,
                i.ticker, i.name AS instrument_name, i.instrument_type,
                i.custom_return_rate
         FROM holdings h
         JOIN instruments i ON h.instrument_id = i.id
         WHERE h.portfolio_id = $1 AND h.archived = false`,
        [portfolioId]
    );
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
            // Determine the actual overlapping range across all instruments
            const globalFirst = hasData.reduce((m, r) => r.first_date < m ? r.first_date : m, hasData[0].first_date);
            const globalLast  = hasData.reduce((m, r) => r.last_date  > m ? r.last_date  : m, hasData[0].last_date);

            // If the requested from_date is after the last available date, error
            if (from_date > globalLast) {
                throw new Error(
                    `Requested start date (${from_date.slice(0,7)}) is after the latest available data (${globalLast.slice(0,7)}). ` +
                    `Choose an earlier date range.`
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
                const { newCash, costInr, logEntry } = performRebalance(
                    date, holdings, navLookups, holdingUnits, cash,
                    parseFloat(transaction_cost_pct), trigger
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
    if (benchmark === 'fd_7pct') {
        benchmarkValues = computeFdBenchmark(allDates, principal, 0.07);
    } else if (benchmark === 'fd_8pct') {
        benchmarkValues = computeFdBenchmark(allDates, principal, 0.08);
    } else if (benchmark === 'nifty50') {
        const benchInst = await pool.query(
            "SELECT id FROM instruments WHERE ticker = 'UTI-N50-IDX' LIMIT 1"
        );
        if (benchInst.rows.length > 0) {
            const bid  = benchInst.rows[0].id;
            const bRes = await pool.query(
                `SELECT date::text AS date, nav FROM price_history
                 WHERE instrument_id = $1 AND date >= $2 AND date <= $3 ORDER BY date`,
                [bid, from_date, to_date]
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
        if (!benchmarkValues) benchmarkValues = computeFdBenchmark(allDates, principal, 0.07);
    }

    // 8. Metrics + output
    const metrics         = computeMetrics(dailyValues, benchmarkValues);
    if (!metrics) throw new Error('Not enough data to compute metrics.');

    const series          = sampleMonthly(dailyValues, benchmarkValues);
    const holdingsMetrics = computeHoldingsMetrics(holdings, navLookups, allDates, principal);

    const rebalancingSummary = {
        strategy:                    rebalance_strategy,
        count:                       rebalanceLog.length,
        total_cost_inr:              +totalCost.toFixed(2),
        // Approximate: adds back costs without compounding effect
        hypothetical_value_no_cost:  +(metrics.final_value + totalCost).toFixed(2),
    };

    return {
        metrics,
        series,
        holdings_metrics:    holdingsMetrics,
        rebalancing_summary: rebalancingSummary,
        rebalancing_log:     rebalanceLog,
        config: {
            from_date:            startDate,
            to_date:              allDates[allDates.length - 1],
            benchmark,
            rebalance_strategy,
            transaction_cost_pct: parseFloat(transaction_cost_pct),
        },
    };
}

module.exports = { runBacktest };
