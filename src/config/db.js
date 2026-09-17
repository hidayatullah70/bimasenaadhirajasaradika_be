const mysql = require('mysql2/promise');
const dotenv = require('dotenv');

dotenv.config();

const host = process.env.MYSQLHOST || process.env.DB_HOST || '127.0.0.1';
const port = parseInt(process.env.MYSQLPORT || process.env.DB_PORT || '3306', 10);
const user = process.env.MYSQLUSER || process.env.DB_USER || 'root';
const password = process.env.MYSQLPASSWORD !== undefined ? process.env.MYSQLPASSWORD : (process.env.DB_PASSWORD || '');
const database = process.env.MYSQLDATABASE || process.env.DB_NAME || 'barak_db';

const poolConfig = process.env.DATABASE_URL || process.env.MYSQL_URL
  ? {
      uri: process.env.DATABASE_URL || process.env.MYSQL_URL,
      waitForConnections: true,
      connectionLimit: parseInt(process.env.DB_CONNECTION_LIMIT || '10', 10),
      queueLimit: 0,
      enableKeepAlive: true,
      keepAliveInitialDelay: 0,
      timezone: '+07:00',
      dateStrings: true
    }
  : {
      host,
      port,
      user,
      password,
      database,
      waitForConnections: true,
      connectionLimit: parseInt(process.env.DB_CONNECTION_LIMIT || '10', 10),
      queueLimit: 0,
      enableKeepAlive: true,
      keepAliveInitialDelay: 0,
      timezone: '+07:00',
      dateStrings: true
    };

const pool = mysql.createPool(poolConfig);

/**
 * Memverifikasi konektivitas ke database MySQL
 */
async function testConnection() {
  try {
    const connection = await pool.getConnection();
    console.log(`[Database] Terkoneksi ke MySQL database: ${process.env.DB_NAME || 'barak_db'} (${process.env.DB_HOST}:${process.env.DB_PORT || 3306})`);
    connection.release();
    return true;
  } catch (err) {
    console.warn(`[Database Warning] Tidak dapat tersambung ke MySQL (${err.code || err.message}).`);
    console.warn('[Database Warning] Pastikan Laragon/MySQL service sudah dijalankan.');
    return false;
  }
}

module.exports = {
  pool,
  testConnection
};
