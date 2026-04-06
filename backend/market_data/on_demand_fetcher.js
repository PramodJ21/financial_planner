/**
 * On-demand price data fetcher
 *
 * Called automatically by the backtest engine when:
 *   - An instrument has zero price history in the DB, or
 *   - The requested date range extends beyond what is stored.
 *
 * Detects instrument type and routes to the right data source:
 *   mutual_fund / gold  →  mfapi.in  (free, no auth)
 *   equity / etf        →  Yahoo Finance v8 Chart API (free, no auth)
 *   index               →  Yahoo Finance (Nifty/Sensex have .NS symbols)
 *   fixed_return        →  no-op (no price history needed)
 *
 * Safe to call concurrently — upsert uses ON CONFLICT DO UPDATE.
 */

const AMFI_BASE = 'https://api.mfapi.in/mf';
const SLEEP_MS  = 350;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// ── AMFI code overrides (same as amfi_fetcher.js) ─────────────────────────────
const AMFI_CODE_OVERRIDES = {
    'PPFAS-FC':           122639, 'UTI-N50-IDX':        120716,
    'HDFC-N50-IDX':       120594, 'SBI-N50-IDX':        120601,
    'NIPPON-N50-IDX':     120503, 'MOTILAL-N50-IDX':    120847,
    'ICICI-N50-IDX':      120585, 'NAVI-N50-IDX':       145552,
    'MOTILAL-MID150-IDX': 135781, 'MIRAE-LC':           118825,
    'AXIS-BC':            120472, 'HDFC-T100':           119062,
    'SBI-BC':             119598, 'KOTAK-BC':            120230,
    'ICICI-BC':           120586, 'NIPPON-LC':           118951,
    'CANARA-BC':          118819, 'UTI-MASTERSHARE':     120783,
    'FRANKLIN-LC':        100116, 'HDFC-MID':            118988,
    'AXIS-MID':           120843, 'KOTAK-EMERG':         131655,
    'DSP-MID':            119061, 'NIPPON-GROWTH':       118955,
    'MIRAE-MID':          151149, 'SBI-MAG-MID':         118989,
    'PGIM-MID':           120841, 'EDELWEISS-MID':       120846,
    'NIPPON-SC':          118954, 'SBI-SC':              125497,
    'AXIS-SC':            120845, 'KOTAK-SC':            120230,
    'DSP-SC':             119065, 'HDFC-SC':             118981,
    'CANARA-SC':          151270, 'QUANT-SC':            120843,
    'HDFC-FC':            118982, 'KOTAK-FX':            120842,
    'UTI-FX':             120716, 'DSP-FC':              119063,
    'AXIS-FC':            120844, 'MIRAE-FC':            151150,
    'AXIS-ELSS':          120503, 'MIRAE-ELSS':          118825,
    'KOTAK-ELSS':         120229, 'SBI-ELSS':            118990,
    'HDFC-ELSS':          118980, 'QUANT-ELSS':          120844,
    'HDFC-ST-DEBT':       118985, 'KOTAK-BOND-ST':       120228,
    'AXIS-BPSU':          120470, 'ICICI-CORP-BOND':     120584,
    'NIPPON-ST':          118952, 'HDFC-LIQ':            118987,
    'SBI-LIQ':            119597, 'AXIS-LIQ':            120469,
    'KOTAK-LIQ':          120227, 'MIRAE-CASH':          118823,
    'SBI-GOLD':           119599, 'NIPPON-GOLD':         118950,
    'HDFC-GOLD':          118983, 'KOTAK-GOLD':          120226,
};

// Yahoo Finance symbols for index instruments
const INDEX_YAHOO_MAP = {
    'NIFTY50':         'NIFTY_50.NS',   // Using ^NSEI alternatively
    'SENSEX':          '^BSESN',
    'NIFTYMIDCAP150':  'NIFTY_MIDCAP_150.NS',
    'NIFTYSMALLCAP250':'NIFTY_SMLCAP_250.NS',
    'NIFTYNEXT50':     '^NFTY',
};

// NSE equity tickers with non-standard Yahoo symbols
const YAHOO_EQUITY_OVERRIDES = {
    'MNM':        'M%26M.NS',
    'HDFCSENSEX': 'HDFCSENSEX.BO',
};

// ── Shared upsert ─────────────────────────────────────────────────────────────

async function upsertHistory(pool, instrumentId, records) {
    if (records.length === 0) return 0;
    const BATCH = 500;
    let inserted = 0;
    for (let i = 0; i < records.length; i += BATCH) {
        const chunk = records.slice(i, i + BATCH);
        const values = [];
        const placeholders = chunk.map((r, idx) => {
            values.push(instrumentId, r.date, r.nav);
            return `($${idx * 3 + 1}, $${idx * 3 + 2}, $${idx * 3 + 3})`;
        });
        await pool.query(
            `INSERT INTO price_history (instrument_id, date, nav)
             VALUES ${placeholders.join(',')}
             ON CONFLICT (instrument_id, date) DO UPDATE SET nav = EXCLUDED.nav`,
            values
        );
        inserted += chunk.length;
    }
    return inserted;
}

// ── AMFI / mfapi.in ───────────────────────────────────────────────────────────

function parseAmfiDate(str) {
    const [d, m, y] = str.split('-');
    return `${y}-${m.padStart(2,'0')}-${d.padStart(2,'0')}`;
}

async function searchAmfiCode(name) {
    const keywords = name
        .replace(/fund|scheme|plan|direct|growth/gi, '')
        .trim().split(/\s+/).slice(0, 4).join('+');
    try {
        const res = await fetch(`${AMFI_BASE}/search?q=${encodeURIComponent(keywords)}`);
        if (!res.ok) return null;
        const results = await res.json();
        if (!Array.isArray(results) || results.length === 0) return null;
        const directGrowth = results.filter((r) => {
            const s = r.schemeName.toLowerCase();
            return s.includes('direct') && (s.includes('growth') || s.includes('g)'));
        });
        return (directGrowth.length > 0 ? directGrowth : results)[0].schemeCode;
    } catch { return null; }
}

async function fetchAmfiHistory(amfiCode) {
    const res = await fetch(`${AMFI_BASE}/${amfiCode}`);
    if (!res.ok) throw new Error(`mfapi.in HTTP ${res.status} for code ${amfiCode}`);
    const json = await res.json();
    return (json.data || [])
        .filter((r) => r.nav && r.nav !== 'N.A.')
        .map((r) => ({ date: parseAmfiDate(r.date), nav: parseFloat(r.nav) }))
        .filter((r) => !isNaN(r.nav));
}

async function fetchAndStoreMF(pool, instrument) {
    let code = instrument.amfi_code
        ? parseInt(instrument.amfi_code)
        : AMFI_CODE_OVERRIDES[instrument.ticker] || null;

    if (!code) {
        code = await searchAmfiCode(instrument.name);
        await sleep(SLEEP_MS);
        if (!code) throw new Error(`Could not find AMFI scheme code for "${instrument.name}".`);
    }

    // Save code back to instruments table if not already set
    if (String(code) !== String(instrument.amfi_code)) {
        await pool.query('UPDATE instruments SET amfi_code = $1 WHERE id = $2', [String(code), instrument.id]);
    }

    // mfapi.in always returns full history — upsert is idempotent
    const records = await fetchAmfiHistory(code);
    await sleep(SLEEP_MS);
    const count = await upsertHistory(pool, instrument.id, records);
    return { count, source: 'mfapi.in' };
}

// ── Yahoo Finance ─────────────────────────────────────────────────────────────

function toYahooSymbol(ticker, exchange, instrumentType) {
    if (instrumentType === 'index' && INDEX_YAHOO_MAP[ticker]) {
        return INDEX_YAHOO_MAP[ticker];
    }
    if (YAHOO_EQUITY_OVERRIDES[ticker]) return YAHOO_EQUITY_OVERRIDES[ticker];
    const suffix = exchange === 'BSE' ? '.BO' : '.NS';
    return `${ticker}${suffix}`;
}

async function fetchYahooHistory(symbol, fromUnix, toUnix) {
    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${symbol}` +
        `?period1=${fromUnix}&period2=${toUnix}&interval=1d` +
        `&events=div%2Csplit&includeAdjustedClose=true`;

    const res = await fetch(url, {
        headers: {
            'User-Agent': 'Mozilla/5.0 (compatible; FinHealthBot/1.0)',
            'Accept':     'application/json',
        },
    });

    if (res.status === 404) return [];
    if (!res.ok) throw new Error(`Yahoo Finance HTTP ${res.status} for ${symbol}`);

    const json   = await res.json();
    const result = json?.chart?.result?.[0];
    if (!result) return [];

    const timestamps = result.timestamp || [];
    const adjCloses  = result.indicators?.adjclose?.[0]?.adjclose || [];

    const rows = [];
    for (let i = 0; i < timestamps.length; i++) {
        const nav = adjCloses[i];
        if (nav == null || isNaN(nav) || nav <= 0) continue;
        rows.push({ date: new Date(timestamps[i] * 1000).toISOString().slice(0, 10), nav: +nav.toFixed(4) });
    }
    return rows;
}

async function fetchAndStoreEquityOrIndex(pool, instrument, fromDate, toDate) {
    const symbol   = toYahooSymbol(instrument.ticker, instrument.exchange, instrument.instrument_type);
    const fromUnix = Math.floor(new Date(fromDate).getTime() / 1000);
    const toUnix   = Math.floor(new Date(toDate).getTime()   / 1000);

    const records = await fetchYahooHistory(symbol, fromUnix, toUnix);
    await sleep(SLEEP_MS);

    if (records.length === 0) {
        throw new Error(`No data returned from Yahoo Finance for symbol "${symbol}". The ticker may be incorrect or delisted.`);
    }

    const count = await upsertHistory(pool, instrument.id, records);
    return { count, source: 'Yahoo Finance' };
}

// ── Coverage check ────────────────────────────────────────────────────────────

/**
 * Returns { firstDate, lastDate, count } for what's already in price_history.
 * firstDate/lastDate are null if count === 0.
 */
async function getCoverage(pool, instrumentId) {
    const res = await pool.query(
        `SELECT MIN(date)::text AS first_date, MAX(date)::text AS last_date, COUNT(*)::int AS count
         FROM price_history WHERE instrument_id = $1`,
        [instrumentId]
    );
    const row = res.rows[0];
    return { firstDate: row.first_date, lastDate: row.last_date, count: row.count };
}

// ── Main entry point ──────────────────────────────────────────────────────────

/**
 * Ensure price history for `instrument` covers [requestedFrom, requestedTo].
 *
 * @param {object} pool         - pg Pool
 * @param {object} instrument   - { id, ticker, name, instrument_type, exchange, amfi_code }
 * @param {string} requestedFrom - ISO date "YYYY-MM-DD"
 * @param {string} requestedTo   - ISO date "YYYY-MM-DD"
 * @returns {{ fetched: boolean, count: number, source: string, coverage: object }}
 */
async function ensureData(pool, instrument, requestedFrom, requestedTo) {
    const { instrument_type } = instrument;

    // fixed_return instruments don't use price_history
    if (instrument_type === 'fixed_return') {
        return { fetched: false, count: 0, source: null, coverage: null };
    }

    const coverage = await getCoverage(pool, instrument.id);
    const today    = new Date().toISOString().slice(0, 10);

    // Determine if we have a gap to fill
    const noDataAtAll    = coverage.count === 0;
    // Data exists but requestedFrom is before our first date (can't easily backfill for equity — refetch full window)
    const needsEarlierData = !noDataAtAll && requestedFrom < coverage.firstDate;
    // Data exists but the end is stale (more than 5 days behind today or behind requestedTo)
    const staleEnd       = !noDataAtAll && coverage.lastDate < requestedTo && coverage.lastDate < today;

    if (!noDataAtAll && !needsEarlierData && !staleEnd) {
        // Already have sufficient coverage
        return { fetched: false, count: 0, source: null, coverage };
    }

    console.log(`[on-demand] Fetching data for "${instrument.name}" (${instrument.ticker}) — ${noDataAtAll ? 'no data' : staleEnd ? `stale (last: ${coverage.lastDate})` : `needs earlier data (have from ${coverage.firstDate})`}`);

    let result;

    if (instrument_type === 'mutual_fund' || instrument_type === 'gold') {
        // mfapi.in returns the full history every time — always up to date
        result = await fetchAndStoreMF(pool, instrument);

    } else if (instrument_type === 'equity' || instrument_type === 'etf' || instrument_type === 'index') {
        // For equity/etf/index: fetch only the missing window to minimise API load
        let fetchFrom, fetchTo;

        if (noDataAtAll || needsEarlierData) {
            // Full window: 10 years back from today (or requestedFrom if earlier)
            const tenYearsAgo = new Date();
            tenYearsAgo.setFullYear(tenYearsAgo.getFullYear() - 10);
            fetchFrom = [requestedFrom, tenYearsAgo.toISOString().slice(0, 10)].sort()[0];
            fetchTo   = today;
        } else {
            // Stale end: fetch from last known date onwards
            fetchFrom = coverage.lastDate;
            fetchTo   = today;
        }

        result = await fetchAndStoreEquityOrIndex(pool, instrument, fetchFrom, fetchTo);

    } else {
        return { fetched: false, count: 0, source: null, coverage };
    }

    const updatedCoverage = await getCoverage(pool, instrument.id);
    console.log(`[on-demand] Stored ${result.count} rows from ${result.source}. Coverage: ${updatedCoverage.firstDate} → ${updatedCoverage.lastDate}`);

    return { fetched: true, count: result.count, source: result.source, coverage: updatedCoverage };
}

module.exports = { ensureData };
