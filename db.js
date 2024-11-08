const { Pool } = require('pg');

// Use the environment variable from Railway
const DATABASE_URL = process.env.DATABASE_URL;

const pool = new Pool({
    connectionString: DATABASE_URL,
    ssl: {
        rejectUnauthorized: false
    }
});

module.exports = pool;