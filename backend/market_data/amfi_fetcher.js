/**
 * AMFI / mfapi.in historical NAV fetcher
 *
 * Run: node backend/market_data/amfi_fetcher.js
 *
 * What it does:
 *   1. For each instrument (mutual_fund / gold) without an amfi_code, searches
 *      mfapi.in to find the best Direct Growth scheme code and saves it.
 *   2. Fetches full NAV history for every instrument that has an amfi_code.
 *   3. Upserts records into price_history.
 *
 * mfapi.in is a free public API — no auth required.
 * Typical run time: 3–8 minutes for ~60 instruments (rate-limited deliberately).
 */
require('dotenv').config({ path: __dirname + '/../.env' });
const pool = require('../db/pool');

const BASE = 'https://api.mfapi.in/mf';
const SLEEP_MS = 400; // be polite to the free API

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// Manual overrides: ticker → amfi scheme code (Direct Growth)
// These take precedence over the auto-search.
const CODE_OVERRIDES = {
    'PPFAS-FC':           122639,
    'UTI-N50-IDX':        120716,
    'HDFC-N50-IDX':       120594,
    'SBI-N50-IDX':        120601,
    'NIPPON-N50-IDX':     120503,
    'MOTILAL-N50-IDX':    120847,
    'ICICI-N50-IDX':      120585,
    'NAVI-N50-IDX':       145552,
    'MOTILAL-MID150-IDX': 135781,

    'MIRAE-LC':      118825,
    'AXIS-BC':       120472,
    'HDFC-T100':     119062,
    'SBI-BC':        119598,
    'KOTAK-BC':      120230,
    'ICICI-BC':      120586,
    'NIPPON-LC':     118951,
    'CANARA-BC':     118819,
    'UTI-MASTERSHARE': 120783,
    'FRANKLIN-LC':   100116,

    'HDFC-MID':      118988,
    'AXIS-MID':      120843,
    'KOTAK-EMERG':   131655,
    'DSP-MID':       119061,
    'NIPPON-GROWTH': 118955,
    'MIRAE-MID':     151149,
    'SBI-MAG-MID':   118989,
    'PGIM-MID':      120841,
    'EDELWEISS-MID': 120846,

    'NIPPON-SC':     118954,
    'SBI-SC':        125497,
    'AXIS-SC':       120845,
    'KOTAK-SC':      120230,
    'DSP-SC':        119065,
    'HDFC-SC':       118981,
    'CANARA-SC':     151270,
    'QUANT-SC':      120843,

    'HDFC-FC':       118982,
    'KOTAK-FX':      120842,
    'UTI-FX':        120716,
    'DSP-FC':        119063,
    'AXIS-FC':       120844,
    'MIRAE-FC':      151150,

    'AXIS-ELSS':     120503,
    'MIRAE-ELSS':    118825,
    'KOTAK-ELSS':    120229,
    'SBI-ELSS':      118990,
    'HDFC-ELSS':     118980,
    'QUANT-ELSS':    120844,

    'HDFC-ST-DEBT':  118985,
    'KOTAK-BOND-ST': 120228,
    'AXIS-BPSU':     120470,
    'ICICI-CORP-BOND': 120584,
    'NIPPON-ST':     118952,

    'HDFC-LIQ':      118987,
    'SBI-LIQ':       119597,
    'AXIS-LIQ':      120469,
    'KOTAK-LIQ':     120227,
    'MIRAE-CASH':    118823,

    'SBI-GOLD':      119599,
    'NIPPON-GOLD':   118950,
    'HDFC-GOLD':     118983,
    'KOTAK-GOLD':    120226,
};

async function searchSchemeCode(instrumentName) {
    const keywords = instrumentName
        .replace(/fund|scheme|plan|direct|growth/gi, '')
        .trim()
        .split(/\s+/)
        .slice(0, 4)
        .join('+');

    const url = `${BASE}/search?q=${encodeURIComponent(keywords)}`;
    const res = await fetch(url);
    if (!res.ok) return null;
    const results = await res.json();
    if (!Array.isArray(results) || results.length === 0) return null;

    // Prefer Direct + Growth plans
    const directGrowth = results.filter((r) => {
        const s = r.schemeName.toLowerCase();
        return s.includes('direct') && (s.includes('growth') || s.includes('g)'));
    });
    const pool = directGrowth.length > 0 ? directGrowth : results;
    return pool[0].schemeCode;
}

async function fetchHistory(amfiCode) {
    const res = await fetch(`${BASE}/${amfiCode}`);
    if (!res.ok) throw new Error(`HTTP ${res.status} for scheme ${amfiCode}`);
    const json = await res.json();
    return json.data || []; // [{ date: "10-04-2025", nav: "45.23" }, ...]
}

function parseAmfiDate(str) {
    // "10-04-2025" → "2025-04-10"
    const [d, m, y] = str.split('-');
    return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
}

async function upsertHistory(client, instrumentId, records) {
    if (records.length === 0) return 0;

    // Batch insert 500 rows at a time
    let inserted = 0;
    const batch = 500;
    for (let i = 0; i < records.length; i += batch) {
        const chunk = records.slice(i, i + batch);
        const values = [];
        const placeholders = chunk.map((r, idx) => {
            const base = idx * 3;
            values.push(instrumentId, r.date, r.nav);
            return `($${base + 1}, $${base + 2}, $${base + 3})`;
        });
        await client.query(
            `INSERT INTO price_history (instrument_id, date, nav) VALUES ${placeholders.join(',')}
             ON CONFLICT (instrument_id, date) DO UPDATE SET nav = EXCLUDED.nav`,
            values
        );
        inserted += chunk.length;
    }
    return inserted;
}

async function run() {
    const client = await pool.connect();
    try {
        // Load all mutual_fund and gold instruments
        const instRes = await client.query(
            `SELECT id, ticker, name, instrument_type, amfi_code
             FROM instruments
             WHERE instrument_type IN ('mutual_fund','gold') AND is_active = true
             ORDER BY name`
        );
        const instruments = instRes.rows;
        console.log(`Found ${instruments.length} mutual fund / gold instruments.`);

        // Step 1: assign amfi_code where missing
        for (const inst of instruments) {
            let code = inst.amfi_code ? parseInt(inst.amfi_code) : null;

            if (!code && CODE_OVERRIDES[inst.ticker]) {
                code = CODE_OVERRIDES[inst.ticker];
            }

            if (!code) {
                process.stdout.write(`  Searching code for ${inst.name}… `);
                code = await searchSchemeCode(inst.name);
                await sleep(SLEEP_MS);
                if (code) {
                    console.log(`found ${code}`);
                } else {
                    console.log('not found, skipping');
                    continue;
                }
            }

            if (String(code) !== String(inst.amfi_code)) {
                await client.query(
                    'UPDATE instruments SET amfi_code = $1 WHERE id = $2',
                    [String(code), inst.id]
                );
                inst.amfi_code = String(code);
            }
        }

        // Step 2: fetch history for all instruments with amfi_code
        const withCode = instruments.filter((i) => i.amfi_code || CODE_OVERRIDES[i.ticker]);
        console.log(`\nFetching NAV history for ${withCode.length} instruments…`);

        let totalRows = 0;
        for (const inst of withCode) {
            const code = inst.amfi_code || CODE_OVERRIDES[inst.ticker];
            process.stdout.write(`  [${code}] ${inst.name.slice(0, 50)}… `);
            try {
                const raw = await fetchHistory(code);
                const records = raw
                    .filter((r) => r.nav && r.nav !== 'N.A.')
                    .map((r) => ({ date: parseAmfiDate(r.date), nav: parseFloat(r.nav) }))
                    .filter((r) => !isNaN(r.nav));

                const count = await upsertHistory(client, inst.id, records);
                console.log(`${count} rows`);
                totalRows += count;
                await sleep(SLEEP_MS);
            } catch (err) {
                console.log(`ERROR: ${err.message}`);
            }
        }

        console.log(`\n✅ Done. ${totalRows} price_history rows upserted.`);
    } catch (err) {
        console.error('Fetcher error:', err);
        process.exit(1);
    } finally {
        client.release();
        await pool.end();
    }
}

run();
