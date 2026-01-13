const { Pool } = require('pg');

const fs = require('fs');
const path = require('path');

// Create a new pool using environment variables
// Railway provides these automatically (DATABASE_URL)
const pool = new Pool({
    connectionString: process.env.DATABASE_URL || process.env.DATABASE_PUBLIC_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

const initDb = async () => {
    try {
        const schemaPath = path.join(__dirname, 'schema.sql');
        const schemaSql = fs.readFileSync(schemaPath, 'utf8');
        console.log('Running Database Migration...');
        await pool.query(schemaSql);
        console.log('Database Migration Complete.');
    } catch (err) {
        console.error('Database Migration Failed:', err);
    }
};

module.exports = {
    query: (text, params) => pool.query(text, params),
    pool,
    initDb
};
