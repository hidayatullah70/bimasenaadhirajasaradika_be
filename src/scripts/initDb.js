const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');
const dotenv = require('dotenv');

dotenv.config();

async function initDatabase() {
  console.log('[DB Init] Memulai proses inisialisasi database dari database/database.sql...');

  const host = process.env.MYSQLHOST || process.env.DB_HOST || '127.0.0.1';
  const port = parseInt(process.env.MYSQLPORT || process.env.DB_PORT || '3306', 10);
  const user = process.env.MYSQLUSER || process.env.DB_USER || 'root';
  const password = process.env.MYSQLPASSWORD !== undefined ? process.env.MYSQLPASSWORD : (process.env.DB_PASSWORD || '');
  const database = process.env.MYSQLDATABASE || process.env.DB_NAME || 'barak_db';

  try {
    // 1. Buat koneksi awal ke MySQL server
    const connConfig = process.env.DATABASE_URL || process.env.MYSQL_URL
      ? {
          uri: process.env.DATABASE_URL || process.env.MYSQL_URL,
          multipleStatements: true
        }
      : {
          host,
          port,
          user,
          password,
          multipleStatements: true
        };

    const connection = await mysql.createConnection(connConfig);

    console.log(`[DB Init] Terhubung ke MySQL server (${host}:${port})`);

    // 2. Baca file database.sql
    const sqlPath = path.join(__dirname, '../../database/database.sql');
    if (!fs.existsSync(sqlPath)) {
      throw new Error(`File SQL tidak ditemukan di: ${sqlPath}`);
    }

    const sqlContent = fs.readFileSync(sqlPath, 'utf8');

    console.log(`[DB Init] Mengeksekusi database.sql ke database '${database}'...`);
    await connection.query(sqlContent);

    console.log('[DB Init] SUKSES! Database, tabel, relasi foreign key, dan seed data berhasil dibuat.');
    await connection.end();
    process.exit(0);
  } catch (err) {
    console.error('[DB Init Error] Gagal menginisialisasi database:');
    console.error(err.message);
    if (err.code === 'ECONNREFUSED') {
      console.error('\n[Solusi]: Pastikan MySQL service di Laragon sudah aktif (klik "Start All").');
    }
    process.exit(1);
  }
}

initDatabase();
