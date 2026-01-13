const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'super_secret_dev_key_123';
const SALT_ROUNDS = 10;

// Password Hashing
const hashPassword = async (password) => {
    return await bcrypt.hash(password, SALT_ROUNDS);
};

const comparePassword = async (password, hash) => {
    return await bcrypt.compare(password, hash);
};

// JWT Generation
const generateToken = (user) => {
    // Payload: basic user info
    const payload = {
        id: user.id,
        email: user.email,
        username: user.username
    };
    // Sign token (expires in 7 days)
    return jwt.sign(payload, JWT_SECRET, { expiresIn: '7d' });
};

// Middleware to Protect Routes
const authenticateToken = (req, res, next) => {
    // Check for token in HttpOnly Cookie 'auth_token'
    const token = req.cookies && req.cookies.auth_token;

    if (!token) {
        // No token found
        req.user = null;
        return next(); // Proceed as guest (or fail if route requires auth)
    }

    jwt.verify(token, JWT_SECRET, (err, user) => {
        if (err) {
            console.error("JWT Verification failed:", err.message);
            req.user = null;
        } else {
            req.user = user;
        }
        next();
    });
};

// Middleware: Require Login (stops request if not logged in)
const requireAuth = (req, res, next) => {
    if (!req.user) {
        return res.status(401).json({ error: 'Unauthorized: Please log in' });
    }
    next();
};

module.exports = {
    hashPassword,
    comparePassword,
    generateToken,
    authenticateToken,
    requireAuth
};
