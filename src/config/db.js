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
      dateStrings: true,
      multipleStatements: true
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
      dateStrings: true,
      multipleStatements: true
    };

const pool = mysql.createPool(poolConfig);

/**
 * Memverifikasi konektivitas ke database MySQL
 */
async function testConnection() {
  try {
    const connection = await pool.getConnection();
    const currentDb = process.env.MYSQLDATABASE || process.env.DB_NAME || 'barak_db';
    console.log(`[Database] Terkoneksi ke MySQL: ${currentDb} (${host}:${port})`);
    connection.release();
    return true;
  } catch (err) {
    console.warn(`[Database Warning] Tidak dapat tersambung ke MySQL (${err.code || err.message}).`);
    return false;
  }
}

/**
 * Otomatis menginisialisasi skema & seed data jika database masih kosong (misal saat baru deploy di Railway)
 */
async function autoInitDatabaseIfEmpty() {
  try {
    const [tables] = await pool.query('SHOW TABLES');
    if (tables.length === 0) {
      console.log('[Auto-Init] Database kosong terdeteksi (0 tabel). Menginisialisasi skema & seed data otomatis...');
      const fs = require('fs');
      const path = require('path');
      const sqlPath = path.join(__dirname, '../../database/database.sql');
      if (fs.existsSync(sqlPath)) {
        let sqlContent = fs.readFileSync(sqlPath, 'utf8');
        // Bersihkan USE barak_db dan CREATE DATABASE agar tabel masuk ke database aktif (misal: railway)
        sqlContent = sqlContent
          .replace(/CREATE DATABASE IF NOT EXISTS `barak_db`[\s\S]*?USE `barak_db`;/g, '')
          .replace(/CREATE DATABASE IF NOT EXISTS `barak_db`;/g, '')
          .replace(/USE `barak_db`;/g, '');

        const connection = await pool.getConnection();
        await connection.query(sqlContent);
        connection.release();
        console.log('[Auto-Init] SUKSES! 12 tabel InnoDB dan data awal berhasil dibuat secara otomatis.');
      }
    }
    return true;
  } catch (err) {
    console.warn(`[Auto-Init Notice] ${err.message}`);
    return false;
  }
}

module.exports = {
  pool,
  testConnection,
  autoInitDatabaseIfEmpty
};
