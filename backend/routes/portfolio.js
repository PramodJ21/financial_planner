const express = require('express');
const pool = require('../db/pool');
const auth = require('../middleware/auth');
const { runBacktest } = require('../engine/backtest');

const router = express.Router();

// ─── INSTRUMENTS ────────────────────────────────────────────────────────────────

// GET /instruments/search?q=&type=
router.get('/instruments/search', auth, async (req, res) => {
    const { q = '', type } = req.query;
    try {
        const params = [];
        let where = 'WHERE i.is_active = true';

        if (q.trim()) {
            params.push(`%${q.trim()}%`);
            where += ` AND (i.name ILIKE $${params.length} OR i.ticker ILIKE $${params.length})`;
        }
        if (type) {
            params.push(type);
            where += ` AND i.instrument_type = $${params.length}`;
        }

        const result = await pool.query(
            `SELECT id, ticker, name, instrument_type, exchange FROM instruments i ${where} ORDER BY i.name ASC LIMIT 20`,
            params
        );
        res.json(result.rows);
    } catch (err) {
        console.error('Instrument search error:', err);
        res.status(500).json({ error: 'Server error searching instruments.' });
    }
});

// POST /instruments/custom — create a user-defined fixed-return instrument
router.post('/instruments/custom', auth, async (req, res) => {
    const { name, annual_return_pct } = req.body;
    if (!name?.trim()) return res.status(400).json({ error: 'name is required.' });

    const pct = parseFloat(annual_return_pct);
    if (isNaN(pct) || pct <= 0 || pct > 100) {
        return res.status(400).json({ error: 'annual_return_pct must be between 0 and 100.' });
    }

    // Rate stored as decimal (0.12 = 12%)
    const rate   = +(pct / 100).toFixed(4);
    const ticker = `CUSTOM-${req.userId}-${Date.now()}`;

    try {
        const result = await pool.query(
            `INSERT INTO instruments (ticker, name, instrument_type, custom_return_rate, user_id)
             VALUES ($1, $2, 'fixed_return', $3, $4)
             RETURNING id, ticker, name, instrument_type, exchange, custom_return_rate`,
            [ticker, name.trim(), rate, req.userId]
        );
        res.status(201).json(result.rows[0]);
    } catch (err) {
        console.error('Create custom instrument error:', err);
        res.status(500).json({ error: 'Server error creating custom instrument.' });
    }
});

// ─── PORTFOLIOS ──────────────────────────────────────────────────────────────────

// GET /portfolios
router.get('/portfolios', auth, async (req, res) => {
    try {
        const result = await pool.query(
            `SELECT p.id, p.name, p.principal, p.notes, p.created_at, p.updated_at,
                    COALESCE(SUM(h.allocation_pct), 0) as total_allocated
             FROM portfolios p
             LEFT JOIN holdings h ON h.portfolio_id = p.id AND h.archived = false
             WHERE p.user_id = $1
             GROUP BY p.id
             ORDER BY p.created_at DESC`,
            [req.userId]
        );
        res.json(result.rows);
    } catch (err) {
        console.error('Fetch portfolios error:', err);
        res.status(500).json({ error: 'Server error fetching portfolios.' });
    }
});

// POST /portfolios
router.post('/portfolios', auth, async (req, res) => {
    const { name, principal, notes } = req.body;
    if (!name?.trim()) return res.status(400).json({ error: 'Portfolio name is required.' });
    if (!principal || parseFloat(principal) < 1000) return res.status(400).json({ error: 'Principal must be at least ₹1,000.' });

    try {
        const existing = await pool.query(
            'SELECT id FROM portfolios WHERE user_id = $1 AND LOWER(name) = LOWER($2)',
            [req.userId, name.trim()]
        );
        if (existing.rows.length > 0) return res.status(400).json({ error: 'You already have a portfolio with this name.' });

        const result = await pool.query(
            `INSERT INTO portfolios (user_id, name, principal, notes) VALUES ($1, $2, $3, $4) RETURNING *`,
            [req.userId, name.trim(), parseFloat(principal), notes?.trim() || null]
        );
        res.status(201).json(result.rows[0]);
    } catch (err) {
        console.error('Create portfolio error:', err);
        res.status(500).json({ error: 'Server error creating portfolio.' });
    }
});

// GET /portfolios/:id
router.get('/portfolios/:id', auth, async (req, res) => {
    const { id } = req.params;
    try {
        const portfolioRes = await pool.query(
            'SELECT * FROM portfolios WHERE id = $1 AND user_id = $2',
            [id, req.userId]
        );
        if (portfolioRes.rows.length === 0) return res.status(404).json({ error: 'Portfolio not found.' });

        const [groupsRes, holdingsRes] = await Promise.all([
            pool.query(
                'SELECT * FROM portfolio_groups WHERE portfolio_id = $1 ORDER BY display_order ASC, created_at ASC',
                [id]
            ),
            pool.query(
                `SELECT h.id, h.portfolio_id, h.group_id, h.instrument_id, h.allocation_pct,
                        h.display_order, h.created_at,
                        i.ticker, i.name AS instrument_name, i.instrument_type, i.exchange
                 FROM holdings h
                 JOIN instruments i ON h.instrument_id = i.id
                 WHERE h.portfolio_id = $1 AND h.archived = false
                 ORDER BY h.display_order ASC, h.created_at ASC`,
                [id]
            )
        ]);

        res.json({ ...portfolioRes.rows[0], groups: groupsRes.rows, holdings: holdingsRes.rows });
    } catch (err) {
        console.error('Get portfolio error:', err);
        res.status(500).json({ error: 'Server error fetching portfolio.' });
    }
});

// PUT /portfolios/:id
router.put('/portfolios/:id', auth, async (req, res) => {
    const { id } = req.params;
    const { name, principal, notes } = req.body;

    const sets = [];
    const vals = [];
    let p = 1;
    if (name !== undefined) { sets.push(`name = $${p++}`); vals.push(name.trim()); }
    if (principal !== undefined) { sets.push(`principal = $${p++}`); vals.push(parseFloat(principal)); }
    if (notes !== undefined) { sets.push(`notes = $${p++}`); vals.push(notes || null); }
    if (sets.length === 0) return res.status(400).json({ error: 'No fields to update.' });
    sets.push(`updated_at = NOW()`);
    vals.push(id, req.userId);

    try {
        const result = await pool.query(
            `UPDATE portfolios SET ${sets.join(', ')} WHERE id = $${p++} AND user_id = $${p} RETURNING *`,
            vals
        );
        if (result.rows.length === 0) return res.status(404).json({ error: 'Portfolio not found.' });
        res.json(result.rows[0]);
    } catch (err) {
        console.error('Update portfolio error:', err);
        res.status(500).json({ error: 'Server error updating portfolio.' });
    }
});

// DELETE /portfolios/:id
router.delete('/portfolios/:id', auth, async (req, res) => {
    const { id } = req.params;
    try {
        const result = await pool.query(
            'DELETE FROM portfolios WHERE id = $1 AND user_id = $2 RETURNING id',
            [id, req.userId]
        );
        if (result.rows.length === 0) return res.status(404).json({ error: 'Portfolio not found.' });
        res.json({ message: 'Portfolio deleted.' });
    } catch (err) {
        console.error('Delete portfolio error:', err);
        res.status(500).json({ error: 'Server error deleting portfolio.' });
    }
});

// ─── GROUPS ──────────────────────────────────────────────────────────────────────

// POST /portfolios/:id/groups
router.post('/portfolios/:id/groups', auth, async (req, res) => {
    const { id } = req.params;
    const { name, parent_group_id, color } = req.body;
    if (!name?.trim()) return res.status(400).json({ error: 'Group name is required.' });

    try {
        const portfolio = await pool.query('SELECT id FROM portfolios WHERE id = $1 AND user_id = $2', [id, req.userId]);
        if (portfolio.rows.length === 0) return res.status(404).json({ error: 'Portfolio not found.' });

        let depth = 1;
        if (parent_group_id) {
            const parent = await pool.query(
                'SELECT depth FROM portfolio_groups WHERE id = $1 AND portfolio_id = $2',
                [parent_group_id, id]
            );
            if (parent.rows.length === 0) return res.status(400).json({ error: 'Parent group not found.' });
            depth = parent.rows[0].depth + 1;
            if (depth > 3) return res.status(400).json({ error: 'Maximum nesting depth of 3 exceeded.' });
        }

        const result = await pool.query(
            `INSERT INTO portfolio_groups (portfolio_id, parent_group_id, name, depth, color) VALUES ($1, $2, $3, $4, $5) RETURNING *`,
            [id, parent_group_id || null, name.trim(), depth, color || null]
        );
        res.status(201).json(result.rows[0]);
    } catch (err) {
        console.error('Create group error:', err);
        res.status(500).json({ error: 'Server error creating group.' });
    }
});

// PUT /portfolios/:id/groups/:gid
router.put('/portfolios/:id/groups/:gid', auth, async (req, res) => {
    const { id, gid } = req.params;
    const { name, display_order, color } = req.body;

    const sets = [];
    const vals = [];
    let p = 1;
    if (name !== undefined) { sets.push(`name = $${p++}`); vals.push(name.trim()); }
    if (display_order !== undefined) { sets.push(`display_order = $${p++}`); vals.push(display_order); }
    if (color !== undefined) { sets.push(`color = $${p++}`); vals.push(color || null); }
    if (sets.length === 0) return res.status(400).json({ error: 'No fields to update.' });
    vals.push(gid, id);

    try {
        const portfolio = await pool.query('SELECT id FROM portfolios WHERE id = $1 AND user_id = $2', [id, req.userId]);
        if (portfolio.rows.length === 0) return res.status(404).json({ error: 'Portfolio not found.' });

        const result = await pool.query(
            `UPDATE portfolio_groups SET ${sets.join(', ')} WHERE id = $${p++} AND portfolio_id = $${p} RETURNING *`,
            vals
        );
        if (result.rows.length === 0) return res.status(404).json({ error: 'Group not found.' });
        res.json(result.rows[0]);
    } catch (err) {
        console.error('Update group error:', err);
        res.status(500).json({ error: 'Server error updating group.' });
    }
});

// DELETE /portfolios/:id/groups/:gid
router.delete('/portfolios/:id/groups/:gid', auth, async (req, res) => {
    const { id, gid } = req.params;
    try {
        const portfolio = await pool.query('SELECT id FROM portfolios WHERE id = $1 AND user_id = $2', [id, req.userId]);
        if (portfolio.rows.length === 0) return res.status(404).json({ error: 'Portfolio not found.' });

        // Un-assign holdings in this group
        await pool.query('UPDATE holdings SET group_id = NULL WHERE group_id = $1', [gid]);

        const result = await pool.query(
            'DELETE FROM portfolio_groups WHERE id = $1 AND portfolio_id = $2 RETURNING id',
            [gid, id]
        );
        if (result.rows.length === 0) return res.status(404).json({ error: 'Group not found.' });
        res.json({ message: 'Group deleted.' });
    } catch (err) {
        console.error('Delete group error:', err);
        res.status(500).json({ error: 'Server error deleting group.' });
    }
});

// ─── HOLDINGS ────────────────────────────────────────────────────────────────────

// POST /portfolios/:id/holdings
router.post('/portfolios/:id/holdings', auth, async (req, res) => {
    const { id } = req.params;
    const { instrument_id, allocation_pct, group_id } = req.body;
    if (!instrument_id) return res.status(400).json({ error: 'instrument_id is required.' });
    const allocPct = parseFloat(allocation_pct);
    if (isNaN(allocPct) || allocPct <= 0) return res.status(400).json({ error: 'allocation_pct must be a positive number.' });

    try {
        const portfolio = await pool.query('SELECT id FROM portfolios WHERE id = $1 AND user_id = $2', [id, req.userId]);
        if (portfolio.rows.length === 0) return res.status(404).json({ error: 'Portfolio not found.' });

        const sumRes = await pool.query(
            'SELECT COALESCE(SUM(allocation_pct), 0) AS total FROM holdings WHERE portfolio_id = $1 AND archived = false',
            [id]
        );
        const currentSum = parseFloat(sumRes.rows[0].total);
        if (currentSum + allocPct > 100) {
            return res.status(400).json({
                error: `Adding this holding would exceed 100% allocation. Available: ${(100 - currentSum).toFixed(2)}%`
            });
        }

        const newHolding = await pool.query(
            `INSERT INTO holdings (portfolio_id, instrument_id, allocation_pct, group_id) VALUES ($1, $2, $3, $4) RETURNING *`,
            [id, instrument_id, allocPct, group_id || null]
        );

        const withInstrument = await pool.query(
            `SELECT h.id, h.portfolio_id, h.group_id, h.instrument_id, h.allocation_pct,
                    h.display_order, h.created_at,
                    i.ticker, i.name AS instrument_name, i.instrument_type, i.exchange
             FROM holdings h JOIN instruments i ON h.instrument_id = i.id WHERE h.id = $1`,
            [newHolding.rows[0].id]
        );
        res.status(201).json(withInstrument.rows[0]);
    } catch (err) {
        console.error('Add holding error:', err);
        res.status(500).json({ error: 'Server error adding holding.' });
    }
});

// PUT /portfolios/:id/holdings/:hid
router.put('/portfolios/:id/holdings/:hid', auth, async (req, res) => {
    const { id, hid } = req.params;
    const { allocation_pct, group_id } = req.body;

    const sets = [];
    const vals = [];
    let p = 1;

    try {
        const portfolio = await pool.query('SELECT id FROM portfolios WHERE id = $1 AND user_id = $2', [id, req.userId]);
        if (portfolio.rows.length === 0) return res.status(404).json({ error: 'Portfolio not found.' });

        if (allocation_pct !== undefined) {
            const allocPct = parseFloat(allocation_pct);
            const sumRes = await pool.query(
                'SELECT COALESCE(SUM(allocation_pct), 0) AS total FROM holdings WHERE portfolio_id = $1 AND id != $2 AND archived = false',
                [id, hid]
            );
            const restSum = parseFloat(sumRes.rows[0].total);
            if (restSum + allocPct > 100) {
                return res.status(400).json({ error: `This allocation would exceed 100%. Other holdings: ${restSum.toFixed(2)}%` });
            }
            sets.push(`allocation_pct = $${p++}`);
            vals.push(allocPct);
        }

        if (group_id !== undefined) {
            sets.push(`group_id = $${p++}`);
            vals.push(group_id || null);
        }

        if (sets.length === 0) return res.status(400).json({ error: 'No fields to update.' });
        vals.push(hid, id);

        const result = await pool.query(
            `UPDATE holdings SET ${sets.join(', ')} WHERE id = $${p++} AND portfolio_id = $${p} RETURNING *`,
            vals
        );
        if (result.rows.length === 0) return res.status(404).json({ error: 'Holding not found.' });
        res.json(result.rows[0]);
    } catch (err) {
        console.error('Update holding error:', err);
        res.status(500).json({ error: 'Server error updating holding.' });
    }
});

// DELETE /portfolios/:id/holdings/:hid  (soft delete)
router.delete('/portfolios/:id/holdings/:hid', auth, async (req, res) => {
    const { id, hid } = req.params;
    try {
        const portfolio = await pool.query('SELECT id FROM portfolios WHERE id = $1 AND user_id = $2', [id, req.userId]);
        if (portfolio.rows.length === 0) return res.status(404).json({ error: 'Portfolio not found.' });

        const result = await pool.query(
            'UPDATE holdings SET archived = true WHERE id = $1 AND portfolio_id = $2 RETURNING id',
            [hid, id]
        );
        if (result.rows.length === 0) return res.status(404).json({ error: 'Holding not found.' });
        res.json({ message: 'Holding removed.' });
    } catch (err) {
        console.error('Delete holding error:', err);
        res.status(500).json({ error: 'Server error removing holding.' });
    }
});

// ─── BACKTESTS ────────────────────────────────────────────────────────────────

// GET /portfolios/:id/data-range  — available price history range for this portfolio's holdings
// Optional query param: ?to=YYYY-MM-DD — used to identify stale instruments (last_date < to)
router.get('/portfolios/:id/data-range', auth, async (req, res) => {
    const { id } = req.params;
    const { to: toDate } = req.query; // optional
    try {
        const portfolio = await pool.query('SELECT id FROM portfolios WHERE id = $1 AND user_id = $2', [id, req.userId]);
        if (portfolio.rows.length === 0) return res.status(404).json({ error: 'Portfolio not found.' });

        // Get market (non-fixed_return) instrument IDs in this portfolio
        const holdRes = await pool.query(
            `SELECT DISTINCT h.instrument_id, i.instrument_type, i.name
             FROM holdings h
             JOIN instruments i ON h.instrument_id = i.id
             WHERE h.portfolio_id = $1 AND h.archived = false AND i.instrument_type != 'fixed_return'`,
            [id]
        );
        const mktHoldings = holdRes.rows;

        if (mktHoldings.length === 0) {
            // All fixed-return — no price history needed; return an "unlimited" range
            return res.json({ first_date: null, last_date: null, all_fixed_return: true, instruments: [] });
        }

        const mktIds = mktHoldings.map((h) => h.instrument_id);

        const coverageRes = await pool.query(
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

        const instruments = coverageRes.rows;
        const withData    = instruments.filter((r) => r.nav_count > 0);
        const noData      = instruments.filter((r) => r.nav_count === 0);
        // Stale: has some data but last_date is before the requested to-date (needs top-up)
        const stale = toDate
            ? withData.filter((r) => r.last_date && r.last_date < toDate)
            : [];

        let first_date = null;
        let last_date  = null;
        if (withData.length > 0) {
            first_date = withData.reduce((m, r) => r.first_date < m ? r.first_date : m, withData[0].first_date);
            last_date  = withData.reduce((m, r) => r.last_date  > m ? r.last_date  : m, withData[0].last_date);
        }

        res.json({
            first_date,
            last_date,
            all_fixed_return: false,
            instruments: instruments.map((r) => ({
                id: r.id,
                name: r.name,
                type: r.instrument_type,
                first_date: r.first_date,
                last_date: r.last_date,
                nav_count: r.nav_count,
            })),
            missing: noData.map((r) => ({ id: r.id, name: r.name, type: r.instrument_type })),
            stale:   stale.map((r)   => ({ id: r.id, name: r.name, type: r.instrument_type, last_date: r.last_date })),
        });
    } catch (err) {
        console.error('Data range error:', err);
        res.status(500).json({ error: 'Server error fetching data range.' });
    }
});

// POST /portfolios/:id/backtest  — create config + run synchronously
router.post('/portfolios/:id/backtest', auth, async (req, res) => {
    const { id } = req.params;
    const {
        from_date,
        to_date,
        benchmark               = 'fd_7pct',
        transaction_cost_pct    = 0,
        rebalance_strategy      = 'none',
        rebalance_threshold_pct = 5,
    } = req.body;

    if (!from_date || !to_date) return res.status(400).json({ error: 'from_date and to_date are required.' });
    if (new Date(to_date) <= new Date(from_date)) return res.status(400).json({ error: 'to_date must be after from_date.' });

    const VALID_BENCHMARKS  = ['fd_7pct', 'fd_8pct', 'nifty50'];
    const VALID_STRATEGIES  = ['none', 'monthly', 'quarterly', 'annually', 'threshold', 'threshold_calendar'];
    if (!VALID_BENCHMARKS.includes(benchmark))
        return res.status(400).json({ error: `Invalid benchmark. Choose: ${VALID_BENCHMARKS.join(', ')}` });
    if (!VALID_STRATEGIES.includes(rebalance_strategy))
        return res.status(400).json({ error: `Invalid rebalance_strategy. Choose: ${VALID_STRATEGIES.join(', ')}` });

    const thresholdPct = parseFloat(rebalance_threshold_pct);
    if ((rebalance_strategy === 'threshold' || rebalance_strategy === 'threshold_calendar') && (isNaN(thresholdPct) || thresholdPct <= 0)) {
        return res.status(400).json({ error: 'rebalance_threshold_pct must be a positive number for threshold strategies.' });
    }

    try {
        const portfolio = await pool.query('SELECT id FROM portfolios WHERE id = $1 AND user_id = $2', [id, req.userId]);
        if (portfolio.rows.length === 0) return res.status(404).json({ error: 'Portfolio not found.' });

        // Create config record
        const configRes = await pool.query(
            `INSERT INTO backtest_configs
               (portfolio_id, from_date, to_date, benchmark, transaction_cost_pct, rebalance_strategy, rebalance_threshold_pct)
             VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id`,
            [id, from_date, to_date, benchmark, parseFloat(transaction_cost_pct), rebalance_strategy, thresholdPct]
        );
        const configId = configRes.rows[0].id;

        // Create run record
        const runRes = await pool.query(
            `INSERT INTO backtest_runs (config_id, portfolio_id, status, started_at)
             VALUES ($1, $2, 'running', NOW()) RETURNING id`,
            [configId, id]
        );
        const runId = runRes.rows[0].id;

        // Run backtest
        let result;
        try {
            result = await runBacktest(pool, id, {
                from_date, to_date, benchmark,
                transaction_cost_pct,
                rebalance_strategy,
                rebalance_threshold_pct: thresholdPct,
            });
        } catch (engineErr) {
            await pool.query(
                `UPDATE backtest_runs SET status = 'failed', completed_at = NOW(), error_message = $1 WHERE id = $2`,
                [engineErr.message, runId]
            );
            return res.status(422).json({ error: engineErr.message });
        }

        await pool.query(
            `UPDATE backtest_runs SET status = 'completed', completed_at = NOW(), result_summary = $1 WHERE id = $2`,
            [JSON.stringify(result), runId]
        );

        res.json({ run_id: runId, status: 'completed', ...result });
    } catch (err) {
        console.error('Backtest route error:', err);
        res.status(500).json({ error: 'Server error running backtest.' });
    }
});

// GET /portfolios/:id/backtests  — list runs for a portfolio
router.get('/portfolios/:id/backtests', auth, async (req, res) => {
    const { id } = req.params;
    try {
        const portfolio = await pool.query('SELECT id FROM portfolios WHERE id = $1 AND user_id = $2', [id, req.userId]);
        if (portfolio.rows.length === 0) return res.status(404).json({ error: 'Portfolio not found.' });

        const runs = await pool.query(
            `SELECT r.id, r.status, r.created_at, r.completed_at, r.error_message,
                    c.from_date, c.to_date, c.benchmark,
                    c.rebalance_strategy, c.transaction_cost_pct, c.rebalance_threshold_pct
             FROM backtest_runs r
             JOIN backtest_configs c ON c.id = r.config_id
             WHERE r.portfolio_id = $1
             ORDER BY r.created_at DESC
             LIMIT 20`,
            [id]
        );
        res.json(runs.rows);
    } catch (err) {
        console.error('List runs error:', err);
        res.status(500).json({ error: 'Server error.' });
    }
});

// GET /backtests/:runId/results
router.get('/backtests/:runId/results', auth, async (req, res) => {
    const { runId } = req.params;
    try {
        const result = await pool.query(
            `SELECT r.id, r.status, r.error_message, r.result_summary, r.completed_at,
                    c.from_date, c.to_date, c.benchmark, c.transaction_cost_pct,
                    p.user_id
             FROM backtest_runs r
             JOIN backtest_configs c ON c.id = r.config_id
             JOIN portfolios p ON p.id = r.portfolio_id
             WHERE r.id = $1`,
            [runId]
        );
        if (result.rows.length === 0) return res.status(404).json({ error: 'Run not found.' });
        const row = result.rows[0];
        if (row.user_id !== req.userId) return res.status(403).json({ error: 'Forbidden.' });

        res.json({
            run_id: row.id,
            status: row.status,
            error_message: row.error_message,
            completed_at: row.completed_at,
            config: { from_date: row.from_date, to_date: row.to_date, benchmark: row.benchmark },
            ...(row.result_summary || {}),
        });
    } catch (err) {
        console.error('Get results error:', err);
        res.status(500).json({ error: 'Server error.' });
    }
});

module.exports = router;
