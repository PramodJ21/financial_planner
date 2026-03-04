const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const pool = require('../db/pool');
const auth = require('../middleware/auth');

const router = express.Router();

// Register
router.post('/register', async (req, res) => {
    try {
        const { fullName, email, password, phone } = req.body;
        if (!fullName || !email || !password) {
            return res.status(400).json({ error: 'Full name, email, and password are required.' });
        }

        const existing = await pool.query('SELECT id FROM users WHERE email = $1', [email]);
        if (existing.rows.length > 0) {
            return res.status(409).json({ error: 'Email already registered.' });
        }

        const hash = await bcrypt.hash(password, 10);
        const result = await pool.query(
            'INSERT INTO users (full_name, email, password_hash, phone) VALUES ($1, $2, $3, $4) RETURNING id, full_name, email',
            [fullName, email, hash, phone || null]
        );

        // Create empty financial profile
        await pool.query('INSERT INTO financial_profiles (user_id) VALUES ($1)', [result.rows[0].id]);

        const token = jwt.sign({ userId: result.rows[0].id }, process.env.JWT_SECRET, { expiresIn: '30d' });

        res.status(201).json({
            user: result.rows[0],
            token
        });
    } catch (err) {
        console.error('Register error:', err);
        res.status(500).json({ error: 'Server error.' });
    }
});

// Login
router.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        if (!email || !password) {
            return res.status(400).json({ error: 'Email and password are required.' });
        }

        const result = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
        if (result.rows.length === 0) {
            return res.status(401).json({ error: 'Invalid email or password.' });
        }

        const user = result.rows[0];
        const valid = await bcrypt.compare(password, user.password_hash);
        if (!valid) {
            return res.status(401).json({ error: 'Invalid email or password.' });
        }

        const token = jwt.sign({ userId: user.id }, process.env.JWT_SECRET, { expiresIn: '30d' });

        res.json({
            user: { id: user.id, full_name: user.full_name, email: user.email },
            token
        });
    } catch (err) {
        console.error('Login error:', err);
        res.status(500).json({ error: 'Server error.' });
    }
});

// Get current user
router.get('/me', auth, async (req, res) => {
    try {
        const result = await pool.query(
            'SELECT id, full_name, email, phone, created_at FROM users WHERE id = $1',
            [req.userId]
        );
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'User not found.' });
        }
        res.json(result.rows[0]);
    } catch (err) {
        res.status(500).json({ error: 'Server error.' });
    }
});

module.exports = router;
