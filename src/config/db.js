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
    console.log([Database] Terkoneksi ke MySQL:  + currentDb +  ( + host + : + port + ));
    connection.release();
    return true;
  } catch (err) {
    console.warn([Database Warning] Tidak dapat tersambung ke MySQL ( + (err.code || err.message) + ).);
    return false;
  }
}

/**
 * Otomatis menginisialisasi skema & seed data serta sinkronisasi role & user penting
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
        sqlContent = sqlContent
          .replace(/CREATE DATABASE IF NOT EXISTS \arak_db\[\s\S]*?USE \arak_db\;/g, '')
          .replace(/CREATE DATABASE IF NOT EXISTS \arak_db\;/g, '')
          .replace(/USE \arak_db\;/g, '');

        const connection = await pool.getConnection();
        await connection.query(sqlContent);
        connection.release();
        console.log('[Auto-Init] SUKSES! Tabel dan data awal berhasil dibuat secara otomatis.');
      }
    }

    // Pastikan seluruh master roles terdaftar (termasuk role 6 it_support)
    try {
      await pool.query(
        INSERT INTO roles (id, code, name) VALUES
        (1, 'direktur', 'Direktur'),
        (2, 'hrd', 'HRD'),
        (3, 'finance', 'Finance'),
        (4, 'marketing', 'Marketing'),
        (5, 'operasional', 'Operasional'),
        (6, 'it_support', 'IT Support')
        ON DUPLICATE KEY UPDATE name = VALUES(name);
      );

      // Pastikan akun IT Support (Gheril Ramaditya S.) tersedia
      const [itUser] = await pool.query("SELECT id FROM users WHERE email = 'itsupport@bimasenaadhirajasaradika.com' LIMIT 1");
      if (itUser.length === 0) {
        await pool.query(
          INSERT INTO users (id, role_id, name, email, avatar_url, password_hash, is_active)
          VALUES (6, 6, 'Gheril Ramaditya S. (IT Support)', 'itsupport@bimasenaadhirajasaradika.com', '/assets/img/team/person-5.jpeg', '.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', TRUE)
          ON DUPLICATE KEY UPDATE role_id = 6, name = VALUES(name), avatar_url = VALUES(avatar_url);
        );
        console.log('[Auto-Init] Akun IT Support (Gheril Ramaditya S.) berhasil disinkronkan ke database.');
      }
    } catch (syncErr) {
      console.warn('[Auto-Init Role Sync Notice]', syncErr.message);
    }

    return true;
  } catch (err) {
    console.warn([Auto-Init Notice]  + err.message);
    return false;
  }
}

module.exports = {
  pool,
  testConnection,
  autoInitDatabaseIfEmpty
};