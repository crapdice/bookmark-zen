const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');

// This script expects DATABASE_URL to be set in environment
// Run with: railway run node server/run-migration.js

async function runMigration() {
    console.log("🔌 Connecting to database...");

    // Expecting env var
    if (!process.env.DATABASE_URL) {
        console.error("❌ Error: DATABASE_URL is missing.");
        console.error("Run this using: railway run node server/run-migration.js");
        process.exit(1);
    }

    const pool = new Pool({
        connectionString: process.env.DATABASE_URL,
        ssl: { rejectUnauthorized: false } // Required for Railway/Prod
    });

    try {
        const schemaPath = path.join(__dirname, 'db', 'schema.sql');
        const schemaSql = fs.readFileSync(schemaPath, 'utf8');

        console.log("📄 Reading schema.sql...");

        // Execute the SQL
        await pool.query(schemaSql);

        console.log("✅ Success! Database schema has been applied.");
        console.log("   - Created tables: links, users, user_bookmarks");

    } catch (err) {
        console.error("❌ Migration Failed:", err.message);
    } finally {
        await pool.end();
    }
}

runMigration();
