const dotenv = require('dotenv');
dotenv.config();

const app = require('./app');
const { testConnection, autoInitDatabaseIfEmpty } = require('./config/db');

const PORT = process.env.PORT || 5000;

async function startServer() {
  // Verifikasi koneksi MySQL & Inisialisasi otomatis jika DB masih kosong
  await testConnection();
  await autoInitDatabaseIfEmpty();

  const server = app.listen(PORT, () => {
    console.log('================================================================');
    console.log(' PT. Bhimasena Adhirajasa Radhika — Backend REST API');
    console.log(` Server berjalan di : http://localhost:${PORT}`);
    console.log(` Base API URL       : http://localhost:${PORT}/api/v1`);
    console.log(` Mode Environment   : ${process.env.NODE_ENV || 'development'}`);
    console.log('================================================================');
  });

  // Graceful shutdown
  const handleShutdown = (signal) => {
    console.log(`\n[Server] Menerima sinyal ${signal}. Menutup server secara graceful...`);
    server.close(() => {
      console.log('[Server] HTTP Server ditutup.');
      process.exit(0);
    });
  };

  process.on('SIGTERM', () => handleShutdown('SIGTERM'));
  process.on('SIGINT', () => handleShutdown('SIGINT'));
}

startServer();
