const fs = require('fs');
const path = require('path');
const pool = require('./db');

async function runMigrations() {
    const client = await pool.connect();
    try {
        // Start transaction
        await client.query('BEGIN');

        // Read and execute migration files
        const migrationFiles = fs.readdirSync(path.join(__dirname, 'migrations'))
            .filter(f => f.endsWith('.sql'))
            .sort();

        for (const file of migrationFiles) {
            console.log(`Running migration: ${file}`);
            const sql = fs.readFileSync(path.join(__dirname, 'migrations', file), 'utf8');
            await client.query(sql);
        }

        // Commit transaction
        await client.query('COMMIT');
        console.log('Migrations completed successfully');
    } catch (err) {
        // Rollback transaction on error
        await client.query('ROLLBACK');
        console.error('Migration failed:', err);
        throw err;
    } finally {
        client.release();
    }
}

// Run migrations
runMigrations().catch(console.error); 