/**
 * Seed equity instruments — Nifty 50 stocks + NSE ETFs
 *
 * Run: node backend/db/seed_equity.js
 *
 * Tickers match NSE symbols exactly (used as-is for Yahoo Finance with .NS suffix).
 * Special cases (M&M, BAJAJ-AUTO) are handled by equity_fetcher.js.
 */
require('dotenv').config({ path: __dirname + '/../.env' });
const pool = require('./pool');

// ── Nifty 50 constituents (as of 2025) ────────────────────────────────────────
const NIFTY50_STOCKS = [
    { ticker: 'RELIANCE',     name: 'Reliance Industries',           exchange: 'NSE' },
    { ticker: 'TCS',          name: 'Tata Consultancy Services',     exchange: 'NSE' },
    { ticker: 'HDFCBANK',     name: 'HDFC Bank',                     exchange: 'NSE' },
    { ticker: 'BHARTIARTL',   name: 'Bharti Airtel',                 exchange: 'NSE' },
    { ticker: 'ICICIBANK',    name: 'ICICI Bank',                    exchange: 'NSE' },
    { ticker: 'INFOSYS',      name: 'Infosys',                       exchange: 'NSE' },
    { ticker: 'SBIN',         name: 'State Bank of India',           exchange: 'NSE' },
    { ticker: 'HINDUNILVR',   name: 'Hindustan Unilever',            exchange: 'NSE' },
    { ticker: 'ITC',          name: 'ITC',                           exchange: 'NSE' },
    { ticker: 'KOTAKBANK',    name: 'Kotak Mahindra Bank',           exchange: 'NSE' },
    { ticker: 'LT',           name: 'Larsen & Toubro',               exchange: 'NSE' },
    { ticker: 'AXISBANK',     name: 'Axis Bank',                     exchange: 'NSE' },
    { ticker: 'BAJFINANCE',   name: 'Bajaj Finance',                 exchange: 'NSE' },
    { ticker: 'BAJAJ-AUTO',   name: 'Bajaj Auto',                    exchange: 'NSE' },
    { ticker: 'MARUTI',       name: 'Maruti Suzuki India',           exchange: 'NSE' },
    { ticker: 'NTPC',         name: 'NTPC',                          exchange: 'NSE' },
    { ticker: 'POWERGRID',    name: 'Power Grid Corporation',        exchange: 'NSE' },
    { ticker: 'ONGC',         name: 'Oil and Natural Gas Corporation', exchange: 'NSE' },
    { ticker: 'SUNPHARMA',    name: 'Sun Pharmaceutical Industries', exchange: 'NSE' },
    { ticker: 'TATAMOTORS',   name: 'Tata Motors',                   exchange: 'NSE' },
    { ticker: 'WIPRO',        name: 'Wipro',                         exchange: 'NSE' },
    { ticker: 'HCLTECH',      name: 'HCL Technologies',              exchange: 'NSE' },
    { ticker: 'TECHM',        name: 'Tech Mahindra',                 exchange: 'NSE' },
    { ticker: 'TITAN',        name: 'Titan Company',                 exchange: 'NSE' },
    { ticker: 'ASIANPAINT',   name: 'Asian Paints',                  exchange: 'NSE' },
    { ticker: 'NESTLEIND',    name: 'Nestlé India',                  exchange: 'NSE' },
    { ticker: 'ULTRACEMCO',   name: 'UltraTech Cement',              exchange: 'NSE' },
    { ticker: 'GRASIM',       name: 'Grasim Industries',             exchange: 'NSE' },
    { ticker: 'BRITANNIA',    name: 'Britannia Industries',          exchange: 'NSE' },
    { ticker: 'CIPLA',        name: 'Cipla',                         exchange: 'NSE' },
    { ticker: 'JSWSTEEL',     name: 'JSW Steel',                     exchange: 'NSE' },
    { ticker: 'TATASTEEL',    name: 'Tata Steel',                    exchange: 'NSE' },
    { ticker: 'HINDALCO',     name: 'Hindalco Industries',           exchange: 'NSE' },
    { ticker: 'COALINDIA',    name: 'Coal India',                    exchange: 'NSE' },
    { ticker: 'ADANIPORTS',   name: 'Adani Ports and SEZ',           exchange: 'NSE' },
    { ticker: 'DRREDDY',      name: "Dr. Reddy's Laboratories",      exchange: 'NSE' },
    { ticker: 'APOLLOHOSP',   name: 'Apollo Hospitals Enterprise',   exchange: 'NSE' },
    { ticker: 'BPCL',         name: 'Bharat Petroleum Corporation',  exchange: 'NSE' },
    { ticker: 'EICHERMOT',    name: 'Eicher Motors',                 exchange: 'NSE' },
    { ticker: 'DIVISLAB',     name: "Divi's Laboratories",           exchange: 'NSE' },
    { ticker: 'BAJAJFINSV',   name: 'Bajaj Finserv',                 exchange: 'NSE' },
    { ticker: 'SBILIFE',      name: 'SBI Life Insurance Company',    exchange: 'NSE' },
    { ticker: 'HDFCLIFE',     name: 'HDFC Life Insurance Company',   exchange: 'NSE' },
    { ticker: 'MNM',          name: 'Mahindra & Mahindra',           exchange: 'NSE' }, // NSE: M&M → yahoo: M%26M.NS
    { ticker: 'INDUSINDBK',   name: 'IndusInd Bank',                 exchange: 'NSE' },
    { ticker: 'TATACONSUM',   name: 'Tata Consumer Products',        exchange: 'NSE' },
    { ticker: 'HEROMOTOCO',   name: 'Hero MotoCorp',                 exchange: 'NSE' },
    { ticker: 'ADANIENT',     name: 'Adani Enterprises',             exchange: 'NSE' },
    { ticker: 'SHREECEM',     name: 'Shree Cement',                  exchange: 'NSE' },
    { ticker: 'TRENT',        name: 'Trent',                         exchange: 'NSE' },
];

// ── NSE ETFs (beyond those already seeded in seed_instruments.js) ─────────────
const NSE_ETFS = [
    { ticker: 'NIFTYBEES',    name: 'Nippon India ETF Nifty BeES',       exchange: 'NSE' },
    { ticker: 'GOLDBEES',     name: 'Nippon India ETF Gold BeES',         exchange: 'NSE' },
    { ticker: 'JUNIORBEES',   name: 'Nippon India ETF Junior BeES (N100)', exchange: 'NSE' },
    { ticker: 'BANKBEES',     name: 'Nippon India ETF Bank BeES',         exchange: 'NSE' },
    { ticker: 'ICICINIFTY',   name: 'ICICI Prudential Nifty ETF',         exchange: 'NSE' },
    { ticker: 'UTINIFTETF',   name: 'UTI Nifty 50 ETF',                   exchange: 'NSE' },
    { ticker: 'HDFCSENSEX',   name: 'HDFC Sensex ETF',                    exchange: 'BSE' },
    { ticker: 'MON100',       name: 'Motilal Oswal Nasdaq 100 ETF',       exchange: 'NSE' },
    { ticker: 'SETFNN50',     name: 'SBI Nifty Next 50 ETF',              exchange: 'NSE' },
    { ticker: 'LIQUIDBEES',   name: 'Nippon India ETF Liquid BeES',       exchange: 'NSE' },
    { ticker: 'SILVRETF',     name: 'Mirae Asset Silver ETF',             exchange: 'NSE' },
    { ticker: 'ITBEES',       name: 'Nippon India ETF Nifty IT',          exchange: 'NSE' },
    { ticker: 'PSUBNKBEES',   name: 'Nippon India ETF PSU Bank BeES',     exchange: 'NSE' },
];

const ALL_INSTRUMENTS = [
    ...NIFTY50_STOCKS.map((s) => ({ ...s, type: 'equity' })),
    ...NSE_ETFS.map((e) => ({ ...e, type: 'etf' })),
];

async function seed() {
    const client = await pool.connect();
    try {
        let inserted = 0, skipped = 0;

        for (const inst of ALL_INSTRUMENTS) {
            const res = await client.query(
                `INSERT INTO instruments (ticker, name, instrument_type, exchange)
                 VALUES ($1, $2, $3, $4)
                 ON CONFLICT (ticker) DO UPDATE
                   SET name = EXCLUDED.name,
                       instrument_type = EXCLUDED.instrument_type,
                       exchange = EXCLUDED.exchange
                 RETURNING id, (xmax = 0) AS was_inserted`,
                [inst.ticker, inst.name, inst.type, inst.exchange]
            );
            if (res.rows[0]?.was_inserted) inserted++;
            else skipped++;
        }

        console.log(`\nEquity seed complete: ${inserted} inserted, ${skipped} updated.`);
        console.log(`Total equity/ETF instruments: ${ALL_INSTRUMENTS.length}`);
        console.log(`\nNext: node backend/market_data/equity_fetcher.js`);
    } catch (err) {
        console.error('Seed failed:', err.message);
        process.exit(1);
    } finally {
        client.release();
        await pool.end();
    }
}

seed();
