const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const cookieParser = require('cookie-parser');
const path = require('path');
const db = require('./db'); // Database connection
const authRoutes = require('./routes/auth.routes');
const bookmarkRoutes = require('./routes/bookmarks.routes');
const { authenticateToken } = require('./auth');

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(cookieParser());
app.use(bodyParser.json({ limit: '50mb' }));
app.use(bodyParser.text({ limit: '50mb', type: 'text/html' }));
app.use(authenticateToken); // Check for token on every request

// Debug logging
app.use((req, res, next) => {
    console.log(`${req.method} ${req.path}`);
    next();
});

const CLIENT_BUILD_PATH = path.resolve(__dirname, '..', 'client', 'dist');
console.log('Static files path:', CLIENT_BUILD_PATH);

// Serve Static Frontend (Vite Build)
app.use(express.static(CLIENT_BUILD_PATH));

// Routes
app.get('/health', (req, res) => {
    res.json({ status: 'ok' });
});

app.get('/debug-info', (req, res) => {
    const fs = require('fs');
    const path = require('path');
    const clientBuildPath = path.join(__dirname, '../client/dist');
    const indexHtmlPath = path.join(clientBuildPath, 'index.html');

    res.json({
        cwd: process.cwd(),
        dirname: __dirname,
        clientBuildExists: fs.existsSync(clientBuildPath),
        indexHtmlExists: fs.existsSync(indexHtmlPath),
        env: {
            PORT: process.env.PORT,
            NODE_ENV: process.env.NODE_ENV
        }
    });
});

app.get('/debug-db', async (req, res) => {
    try {
        const dbUrl = process.env.DATABASE_URL || process.env.DATABASE_PUBLIC_URL;
        const hasDbUrl = !!dbUrl;
        let dbResult = null;
        let dbError = null;

        if (hasDbUrl) {
            try {
                const result = await db.query('SELECT NOW() as time');
                dbResult = result.rows[0];
            } catch (err) {
                dbError = err.message;
            }
        }

        const envKeys = Object.keys(process.env).sort();

        res.json({
            hasDbUrl,
            envKeys,
            dbUrlPreview: hasDbUrl ? dbUrl.substring(0, 15) + '...' : 'N/A',
            ssl: process.env.NODE_ENV === 'production',
            dbResult,
            dbError
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Mount Routes
app.use('/api', authRoutes); // Mounts /register -> /api/register
app.use('/', bookmarkRoutes); // Mounts /upload -> /upload

// Catch-all handler for SPA (Must be after API routes)
app.use((req, res, next) => {
    if (req.method === 'GET' && !req.path.startsWith('/api')) {
        const indexHtml = path.join(CLIENT_BUILD_PATH, 'index.html');
        // console.log('Fallback to:', indexHtml);
        res.sendFile(indexHtml, (err) => {
            if (err) {
                console.error('SendFile error:', err);
                // Do not call next(err) here if headers sent, but usually safe
                if (!res.headersSent) next(err);
            }
        });
    } else {
        next();
    }
});

// Start Server
const startServer = async () => {
    // Run DB Migration (ensure schema is up to date)
    await db.initDb();

    app.listen(PORT, () => {
        console.log(`Server running on port ${PORT}`);
        console.log(`Client build path: ${CLIENT_BUILD_PATH}`);
    });
};

startServer();
