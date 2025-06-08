const { Pool } = require('pg');
require('dotenv').config();

function createDBConnection() {
  if (process.env.DATABASE_URL) {
    return new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: { rejectUnauthorized: false }
    });
  }

  const env = process.env.NODE_ENV || 'local';

  let config = {};

  if (env === 'local') {
    config = {
      user: process.env.LOCAL_DB_USER,
      host: process.env.LOCAL_DB_HOST,
      database: process.env.LOCAL_DB_NAME,
      password: process.env.LOCAL_DB_PASSWORD,
      port: process.env.LOCAL_DB_PORT
    };
  } else if (env === 'remote') {
    config = {
      user: process.env.REMOTE_DB_USER,
      host: process.env.REMOTE_DB_HOST,
      database: process.env.REMOTE_DB_NAME,
      password: process.env.REMOTE_DB_PASSWORD,
      port: process.env.REMOTE_DB_PORT,
      ssl: { rejectUnauthorized: false }
    };
  } else if (env === 'cloud') {
    config = {
      user: process.env.CLOUD_DB_USER,
      host: process.env.CLOUD_DB_HOST,
      database: process.env.CLOUD_DB_NAME,
      password: process.env.CLOUD_DB_PASSWORD,
      port: process.env.CLOUD_DB_PORT,
      ssl: { rejectUnauthorized: false }
    };
  }

  return new Pool(config);
}

module.exports = createDBConnection;
