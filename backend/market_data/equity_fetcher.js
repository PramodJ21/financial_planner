/**
 * NSE Equity + ETF historical price fetcher
 *
 * Uses Yahoo Finance v8 Chart API (no auth required) to fetch adjusted-close
 * data for NSE stocks and ETFs seeded by seed_equity.js.
 *
 * Adjusted close accounts for corporate actions (splits, bonuses, dividends).
 *
 * Run: node backend/market_data/equity_fetcher.js
 *      node backend/market_data/equity_fetcher.js --ticker RELIANCE   (single)
 *      node backend/market_data/equity_fetcher.js --years 5           (5yr window)
 *
 * Requires: Phase 4 migration + seed_equity.js to have been run first.
 */
require('dotenv').config({ path: __dirname + '/../.env' });
const pool = require('../db/pool');

const SLEEP_MS  = 800;        // be polite to Yahoo Finance
const YEARS_BACK = 10;        // default lookback

// NSE tickers that need a non-standard Yahoo Finance symbol
const YAHOO_OVERRIDES = {
    'MNM':        'M%26M.NS',     // M&M → Mahindra & Mahindra
    'HDFCSENSEX': 'HDFCSENSEX.BO', // BSE-listed ETF
};

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// ── Yahoo Finance API ─────────────────────────────────────────────────────────

function toYahooSymbol(ticker, exchange) {
    if (YAHOO_OVERRIDES[ticker]) return YAHOO_OVERRIDES[ticker];
    // ETFs on BSE use .BO suffix; all others use .NS
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
            'Accept': 'application/json',
        },
    });

    if (res.status === 404) return null;           // symbol not found
    if (!res.ok) throw new Error(`HTTP ${res.status} for ${symbol}`);

    const json = await res.json();
    const result = json?.chart?.result?.[0];
    if (!result) return null;

    const timestamps  = result.timestamp || [];
    const adjCloses   = result.indicators?.adjclose?.[0]?.adjclose || [];

    if (timestamps.length === 0) return null;

    const rows = [];
    for (let i = 0; i < timestamps.length; i++) {
        const nav = adjCloses[i];
        if (nav == null || isNaN(nav) || nav <= 0) continue;
        const date = new Date(timestamps[i] * 1000).toISOString().slice(0, 10);
        rows.push({ date, nav: +nav.toFixed(4) });
    }
    return rows;
}

// ── Batch upsert (same pattern as amfi_fetcher) ───────────────────────────────

async function upsertHistory(client, instrumentId, records) {
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
        await client.query(
            `INSERT INTO price_history (instrument_id, date, nav)
             VALUES ${placeholders.join(',')}
             ON CONFLICT (instrument_id, date) DO UPDATE SET nav = EXCLUDED.nav`,
            values
        );
        inserted += chunk.length;
    }
    return inserted;
}

// ── Main ─────────────────────────────────────────────────────────────────────

async function run() {
    const args       = process.argv.slice(2);
    const tickerArg  = args.includes('--ticker') ? args[args.indexOf('--ticker') + 1] : null;
    const yearsArg   = args.includes('--years')  ? parseInt(args[args.indexOf('--years') + 1]) : YEARS_BACK;

    const toUnix   = Math.floor(Date.now() / 1000);
    const fromUnix = toUnix - yearsArg * 365.25 * 24 * 3600;

    const client = await pool.connect();
    try {
        // Load equity + etf instruments (seeded by seed_equity.js)
        const whereClause = tickerArg
            ? `WHERE instrument_type IN ('equity','etf') AND ticker = $1 AND is_active = true`
            : `WHERE instrument_type IN ('equity','etf') AND is_active = true`;
        const params = tickerArg ? [tickerArg] : [];

        const instRes = await client.query(
            `SELECT id, ticker, name, exchange FROM instruments ${whereClause} ORDER BY ticker`,
            params
        );
        const instruments = instRes.rows;

        if (instruments.length === 0) {
            console.log('No equity/ETF instruments found. Run seed_equity.js first.');
            return;
        }

        console.log(`Fetching ${yearsArg}yr price history for ${instruments.length} instruments…\n`);

        let totalRows = 0, failed = 0;

        for (const inst of instruments) {
            const symbol = toYahooSymbol(inst.ticker, inst.exchange);
            process.stdout.write(`  [${symbol.padEnd(18)}] ${inst.name.slice(0, 44).padEnd(44)} `);

            try {
                const rows = await fetchYahooHistory(symbol, fromUnix, toUnix);

                if (!rows || rows.length === 0) {
                    console.log('no data');
                    await sleep(SLEEP_MS);
                    continue;
                }

                const count = await upsertHistory(client, inst.id, rows);
                console.log(`${count} rows`);
                totalRows += count;
            } catch (err) {
                console.log(`ERROR: ${err.message}`);
                failed++;
            }

            await sleep(SLEEP_MS);
        }

        console.log(`\n✅ Done. ${totalRows} price_history rows upserted.`);
        if (failed > 0) console.log(`   ${failed} instrument(s) failed — check logs above.`);
    } catch (err) {
        console.error('Fetcher error:', err);
        process.exit(1);
    } finally {
        client.release();
        await pool.end();
    }
}

run();
