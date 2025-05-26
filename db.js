const { Pool } = require('pg');
require('dotenv').config();  // Load environment variables from .env

// Function to create a PostgreSQL pool based on the environment
function createDBConnection() {
    const environment = process.env.NODE_ENV || 'local';  // default to 'local' if NODE_ENV is not set
    let pool;

    if (environment === 'local') {
        // For Render's EXTERNAL database URL, you must use SSL
        pool = new Pool({
            user: process.env.LOCAL_DB_USER,
            host: process.env.LOCAL_DB_HOST,
            database: process.env.LOCAL_DB_NAME,
            password: process.env.LOCAL_DB_PASSWORD,
            port: process.env.LOCAL_DB_PORT,
            ssl: { rejectUnauthorized: false }
        });
    } else if (environment === 'remote') {
        pool = new Pool({
            user: process.env.REMOTE_DB_USER,
            host: process.env.REMOTE_DB_HOST,
            database: process.env.REMOTE_DB_NAME,
            password: process.env.REMOTE_DB_PASSWORD,
            port: process.env.REMOTE_DB_PORT,
            ssl: { rejectUnauthorized: false }

        });
    } else if (environment === 'cloud') {
        pool = new Pool({
            user: process.env.CLOUD_DB_USER,
            host: process.env.CLOUD_DB_HOST,
            database: process.env.CLOUD_DB_NAME,
            password: process.env.CLOUD_DB_PASSWORD,
            port: process.env.CLOUD_DB_PORT,
            ssl: false
        });
    }

    return pool;
}

module.exports = createDBConnection;
