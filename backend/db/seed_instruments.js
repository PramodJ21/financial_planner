/**
 * Seed instruments — top Indian mutual funds + indices + gold
 * Run: node backend/db/seed_instruments.js
 */
require('dotenv').config({ path: __dirname + '/../.env' });
const pool = require('./pool');

const INSTRUMENTS = [
    // ── Indices ─────────────────────────────────────────────────────────────────
    { ticker: 'NIFTY50', name: 'Nifty 50 Index', type: 'index', exchange: 'NSE' },
    { ticker: 'SENSEX', name: 'BSE Sensex Index', type: 'index', exchange: 'BSE' },
    { ticker: 'NIFTYMIDCAP150', name: 'Nifty Midcap 150 Index', type: 'index', exchange: 'NSE' },
    { ticker: 'NIFTYSMALLCAP250', name: 'Nifty Smallcap 250 Index', type: 'index', exchange: 'NSE' },
    { ticker: 'NIFTYNEXT50', name: 'Nifty Next 50 Index', type: 'index', exchange: 'NSE' },

    // ── Large Cap Funds ─────────────────────────────────────────────────────────
    { ticker: 'MIRAE-LC', name: 'Mirae Asset Large Cap Fund', type: 'mutual_fund', exchange: 'AMFI' },
    { ticker: 'AXIS-BC', name: 'Axis Bluechip Fund', type: 'mutual_fund', exchange: 'AMFI' },
    { ticker: 'HDFC-T100', name: 'HDFC Top 100 Fund', type: 'mutual_fund', exchange: 'AMFI' },
    { ticker: 'SBI-BC', name: 'SBI Bluechip Fund', type: 'mutual_fund', exchange: 'AMFI' },
    { ticker: 'KOTAK-BC', name: 'Kotak Bluechip Fund', type: 'mutual_fund', exchange: 'AMFI' },
    { ticker: 'ICICI-BC', name: 'ICICI Prudential Bluechip Fund', type: 'mutual_fund', exchange: 'AMFI' },
    { ticker: 'NIPPON-LC', name: 'Nippon India Large Cap Fund', type: 'mutual_fund', exchange: 'AMFI' },
    { ticker: 'CANARA-BC', name: 'Canara Robeco Bluechip Equity Fund', type: 'mutual_fund', exchange: 'AMFI' },
    { ticker: 'UTI-MASTERSHARE', name: 'UTI Mastershare Unit Scheme', type: 'mutual_fund', exchange: 'AMFI' },
    { ticker: 'FRANKLIN-LC', name: 'Franklin India Bluechip Fund', type: 'mutual_fund', exchange: 'AMFI' },

    // ── Mid Cap Funds ────────────────────────────────────────────────────────────
    { ticker: 'HDFC-MID', name: 'HDFC Mid-Cap Opportunities Fund', type: 'mutual_fund', exchange: 'AMFI' },
    { ticker: 'AXIS-MID', name: 'Axis Midcap Fund', type: 'mutual_fund', exchange: 'AMFI' },
    { ticker: 'KOTAK-EMERG', name: 'Kotak Emerging Equity Fund', type: 'mutual_fund', exchange: 'AMFI' },
    { ticker: 'DSP-MID', name: 'DSP Midcap Fund', type: 'mutual_fund', exchange: 'AMFI' },
    { ticker: 'NIPPON-GROWTH', name: 'Nippon India Growth Fund', type: 'mutual_fund', exchange: 'AMFI' },
    { ticker: 'MIRAE-MID', name: 'Mirae Asset Midcap Fund', type: 'mutual_fund', exchange: 'AMFI' },
    { ticker: 'SBI-MAG-MID', name: 'SBI Magnum Midcap Fund', type: 'mutual_fund', exchange: 'AMFI' },
    { ticker: 'PGIM-MID', name: 'PGIM India Midcap Opportunities Fund', type: 'mutual_fund', exchange: 'AMFI' },
    { ticker: 'EDELWEISS-MID', name: 'Edelweiss Mid Cap Fund', type: 'mutual_fund', exchange: 'AMFI' },

    // ── Small Cap Funds ──────────────────────────────────────────────────────────
    { ticker: 'NIPPON-SC', name: 'Nippon India Small Cap Fund', type: 'mutual_fund', exchange: 'AMFI' },
    { ticker: 'SBI-SC', name: 'SBI Small Cap Fund', type: 'mutual_fund', exchange: 'AMFI' },
    { ticker: 'AXIS-SC', name: 'Axis Small Cap Fund', type: 'mutual_fund', exchange: 'AMFI' },
    { ticker: 'KOTAK-SC', name: 'Kotak Small Cap Fund', type: 'mutual_fund', exchange: 'AMFI' },
    { ticker: 'DSP-SC', name: 'DSP Small Cap Fund', type: 'mutual_fund', exchange: 'AMFI' },
    { ticker: 'HDFC-SC', name: 'HDFC Small Cap Fund', type: 'mutual_fund', exchange: 'AMFI' },
    { ticker: 'CANARA-SC', name: 'Canara Robeco Small Cap Fund', type: 'mutual_fund', exchange: 'AMFI' },
    { ticker: 'QUANT-SC', name: 'Quant Small Cap Fund', type: 'mutual_fund', exchange: 'AMFI' },

    // ── Flexi / Multi Cap Funds ──────────────────────────────────────────────────
    { ticker: 'PPFAS-FC', name: 'Parag Parikh Flexi Cap Fund', type: 'mutual_fund', exchange: 'AMFI' },
    { ticker: 'HDFC-FC', name: 'HDFC Flexi Cap Fund', type: 'mutual_fund', exchange: 'AMFI' },
    { ticker: 'KOTAK-FX', name: 'Kotak Flexicap Fund', type: 'mutual_fund', exchange: 'AMFI' },
    { ticker: 'UTI-FX', name: 'UTI Flexicap Fund', type: 'mutual_fund', exchange: 'AMFI' },
    { ticker: 'DSP-FC', name: 'DSP Flexi Cap Fund', type: 'mutual_fund', exchange: 'AMFI' },
    { ticker: 'AXIS-FC', name: 'Axis Focused 25 Fund', type: 'mutual_fund', exchange: 'AMFI' },
    { ticker: 'MIRAE-FC', name: 'Mirae Asset Flexi Cap Fund', type: 'mutual_fund', exchange: 'AMFI' },

    // ── ELSS (Tax Saver) Funds ────────────────────────────────────────────────────
    { ticker: 'AXIS-ELSS', name: 'Axis Long Term Equity Fund', type: 'mutual_fund', exchange: 'AMFI' },
    { ticker: 'MIRAE-ELSS', name: 'Mirae Asset Tax Saver Fund', type: 'mutual_fund', exchange: 'AMFI' },
    { ticker: 'KOTAK-ELSS', name: 'Kotak Tax Saver Fund', type: 'mutual_fund', exchange: 'AMFI' },
    { ticker: 'SBI-ELSS', name: 'SBI Long Term Equity Fund', type: 'mutual_fund', exchange: 'AMFI' },
    { ticker: 'HDFC-ELSS', name: 'HDFC TaxSaver Fund', type: 'mutual_fund', exchange: 'AMFI' },
    { ticker: 'QUANT-ELSS', name: 'Quant Tax Plan', type: 'mutual_fund', exchange: 'AMFI' },

    // ── Index Funds ───────────────────────────────────────────────────────────────
    { ticker: 'UTI-N50-IDX', name: 'UTI Nifty 50 Index Fund', type: 'mutual_fund', exchange: 'AMFI' },
    { ticker: 'HDFC-N50-IDX', name: 'HDFC Index Fund Nifty 50 Plan', type: 'mutual_fund', exchange: 'AMFI' },
    { ticker: 'SBI-N50-IDX', name: 'SBI Nifty Index Fund', type: 'mutual_fund', exchange: 'AMFI' },
    { ticker: 'NIPPON-N50-IDX', name: 'Nippon India Index Fund Nifty 50 Plan', type: 'mutual_fund', exchange: 'AMFI' },
    { ticker: 'MOTILAL-N50-IDX', name: 'Motilal Oswal Nifty 50 Index Fund', type: 'mutual_fund', exchange: 'AMFI' },
    { ticker: 'ICICI-N50-IDX', name: 'ICICI Prudential Nifty 50 Index Fund', type: 'mutual_fund', exchange: 'AMFI' },
    { ticker: 'MOTILAL-MID150-IDX', name: 'Motilal Oswal Nifty Midcap 150 Index Fund', type: 'mutual_fund', exchange: 'AMFI' },
    { ticker: 'NAVI-N50-IDX', name: 'Navi Nifty 50 Index Fund', type: 'mutual_fund', exchange: 'AMFI' },

    // ── Debt Funds ────────────────────────────────────────────────────────────────
    { ticker: 'HDFC-ST-DEBT', name: 'HDFC Short Term Debt Fund', type: 'mutual_fund', exchange: 'AMFI' },
    { ticker: 'KOTAK-BOND-ST', name: 'Kotak Bond Short Term Plan', type: 'mutual_fund', exchange: 'AMFI' },
    { ticker: 'AXIS-BPSU', name: 'Axis Banking and PSU Debt Fund', type: 'mutual_fund', exchange: 'AMFI' },
    { ticker: 'ICICI-CORP-BOND', name: 'ICICI Prudential Corporate Bond Fund', type: 'mutual_fund', exchange: 'AMFI' },
    { ticker: 'NIPPON-ST', name: 'Nippon India Short Term Fund', type: 'mutual_fund', exchange: 'AMFI' },

    // ── Liquid Funds ──────────────────────────────────────────────────────────────
    { ticker: 'HDFC-LIQ', name: 'HDFC Liquid Fund', type: 'mutual_fund', exchange: 'AMFI' },
    { ticker: 'SBI-LIQ', name: 'SBI Liquid Fund', type: 'mutual_fund', exchange: 'AMFI' },
    { ticker: 'AXIS-LIQ', name: 'Axis Liquid Fund', type: 'mutual_fund', exchange: 'AMFI' },
    { ticker: 'KOTAK-LIQ', name: 'Kotak Liquid Fund', type: 'mutual_fund', exchange: 'AMFI' },
    { ticker: 'MIRAE-CASH', name: 'Mirae Asset Cash Management Fund', type: 'mutual_fund', exchange: 'AMFI' },

    // ── Gold Funds ────────────────────────────────────────────────────────────────
    { ticker: 'SBI-GOLD', name: 'SBI Gold Fund', type: 'gold', exchange: 'AMFI' },
    { ticker: 'NIPPON-GOLD', name: 'Nippon India Gold Savings Fund', type: 'gold', exchange: 'AMFI' },
    { ticker: 'HDFC-GOLD', name: 'HDFC Gold Fund', type: 'gold', exchange: 'AMFI' },
    { ticker: 'KOTAK-GOLD', name: 'Kotak Gold Fund', type: 'gold', exchange: 'AMFI' },

    // ── ETFs ──────────────────────────────────────────────────────────────────────
    { ticker: 'NIFTYBEES', name: 'Nippon India ETF Nifty BeES', type: 'etf', exchange: 'NSE' },
    { ticker: 'GOLDBEES', name: 'Nippon India ETF Gold BeES', type: 'etf', exchange: 'NSE' },
    { ticker: 'JUNIORBEES', name: 'Nippon India ETF Junior BeES', type: 'etf', exchange: 'NSE' },
    { ticker: 'CPSEETF', name: 'Nippon India ETF CPSE', type: 'etf', exchange: 'NSE' },
    { ticker: 'ICICINIFTY', name: 'ICICI Prudential Nifty ETF', type: 'etf', exchange: 'NSE' },
    { ticker: 'BANKBEES', name: 'Nippon India ETF Bank BeES', type: 'etf', exchange: 'NSE' },

    // ── Fixed Return (FD simulation) ──────────────────────────────────────────────
    { ticker: 'FD-7PCT', name: 'Fixed Deposit (7% p.a.)', type: 'fixed_return', exchange: null },
    { ticker: 'FD-8PCT', name: 'Fixed Deposit (8% p.a.)', type: 'fixed_return', exchange: null },
    { ticker: 'PPF', name: 'Public Provident Fund (PPF 7.1% p.a.)', type: 'fixed_return', exchange: null },
    { ticker: 'SUKANYA', name: 'Sukanya Samriddhi Yojana (8.2% p.a.)', type: 'fixed_return', exchange: null },
];

async function seed() {
    const client = await pool.connect();
    try {
        let inserted = 0;
        let skipped = 0;

        for (const inst of INSTRUMENTS) {
            const res = await client.query(
                `INSERT INTO instruments (ticker, name, instrument_type, exchange)
                 VALUES ($1, $2, $3, $4)
                 ON CONFLICT (ticker) DO NOTHING
                 RETURNING id`,
                [inst.ticker, inst.name, inst.type, inst.exchange || null]
            );
            if (res.rows.length > 0) inserted++;
            else skipped++;
        }

        console.log(`\n✅ Seed complete: ${inserted} inserted, ${skipped} already existed.`);
        console.log(`   Total instruments in DB: ${inserted + skipped}`);
    } catch (err) {
        console.error('Seed failed:', err.message);
        process.exit(1);
    } finally {
        client.release();
        await pool.end();
    }
}

seed();
