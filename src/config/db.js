const mysql = require('mysql2/promise');
const dotenv = require('dotenv');

dotenv.config();

const pool = mysql.createPool({
  host: process.env.DB_HOST || '127.0.0.1',
  port: parseInt(process.env.DB_PORT || '3306', 10),
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'barak_db',
  waitForConnections: true,
  connectionLimit: parseInt(process.env.DB_CONNECTION_LIMIT || '10', 10),
  queueLimit: 0,
  enableKeepAlive: true,
  keepAliveInitialDelay: 0,
  timezone: '+07:00', // Waktu Indonesia Barat (WIB)
  dateStrings: true
});

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
