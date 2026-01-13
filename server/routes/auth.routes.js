const express = require('express');
const router = express.Router();
const db = require('../db');
const { hashPassword, comparePassword, generateToken } = require('../auth');

// POST /register
router.post('/register', async (req, res) => {
    try {
        const { email, password, username } = req.body;
        if (!email || !password) return res.status(400).json({ error: 'Email and password required' });

        const hashedPassword = await hashPassword(password);

        // Use username if provided, else define from email
        const finalUsername = username || email.split('@')[0];

        const result = await db.query(
            `INSERT INTO users (email, username, password_hash) VALUES ($1, $2, $3) RETURNING id, email, username`,
            [email, finalUsername, hashedPassword]
        );

        const user = result.rows[0];
        const token = generateToken(user);

        // Set HttpOnly Cookie
        res.cookie('auth_token', token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'strict',
            maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
        });

        res.json({ user });
    } catch (err) {
        if (err.code === '23505') return res.status(400).json({ error: 'Email already exists' });
        res.status(500).json({ error: err.message });
    }
});

// POST /login
router.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        const result = await db.query('SELECT * FROM users WHERE email = $1', [email]);
        const user = result.rows[0];

        if (!user || !(await comparePassword(password, user.password_hash))) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        const token = generateToken(user);

        res.cookie('auth_token', token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'strict',
            maxAge: 7 * 24 * 60 * 60 * 1000
        });

        res.json({ user: { id: user.id, email: user.email, username: user.username } });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// POST /logout
router.post('/logout', (req, res) => {
    res.clearCookie('auth_token');
    res.json({ success: true });
});

// GET /me
router.get('/me', (req, res) => {
    if (req.user) {
        res.json({ user: req.user });
    } else {
        res.json({ user: null });
    }
});

module.exports = router;
