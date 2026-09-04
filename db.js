const { Pool } = require('pg');

console.log('Initializing database connection...');

const isProduction = process.env.NODE_ENV === 'production';
const productionConnectionString = process.env.DATABASE_URL || process.env.DATABASE_PUBLIC_URL;

if (isProduction) {
    console.log('DATABASE_URL present:', !!process.env.DATABASE_URL);
    console.log('DATABASE_PUBLIC_URL present:', !!process.env.DATABASE_PUBLIC_URL);
}

const pool = new Pool(
    isProduction 
        ? {
            connectionString: productionConnectionString,
            ssl: {
                rejectUnauthorized: false
            }
          }
        : {
            host: process.env.POSTGRES_DB_HOST,
            port: process.env.POSTGRES_DB_PORT,
            user: process.env.POSTGRES_DB_USER,
            password: process.env.POSTGRES_DB_PASSWORD,
            database: process.env.POSTGRES_DB_NAME
          }
);

// Test the connection
pool.query('SELECT NOW()', (err, res) => {
    if (err) {
        console.error('Database connection error:', err);
    } else {
        console.log('Database connected successfully');
    }
});

module.exports = pool;