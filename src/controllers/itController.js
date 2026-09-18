const { pool } = require('../config/db');
const { successResponse, errorResponse } = require('../utils/response');
const { logActivity } = require('../utils/auditLogger');

// Initial sample data fallback
const DEFAULT_ASSETS = [
  {
    id: 'AST-BIO-001',
    name: 'ZKTeco FacePass 7 Biometric Terminal',
    category: 'Biometric Attendance',
    site: 'PT. Telkom Indonesia Tbk (Lantai 1 Lobi Utama)',
    serial_no: 'ZK-2026-TLK-0199',
    ip_address: '192.168.10.45',
    last_sync: '1 menit yang lalu',
    firmware: 'v4.2.1-prod',
    status: 'online'
  },
  {
    id: 'AST-BIO-002',
    name: 'Hikvision Face & Fingerprint Terminal',
    category: 'Biometric Attendance',
    site: 'PT. Mayora Indah Tbk (Pintu Masuk Karyawan)',
    serial_no: 'HIK-MYR-8821-B',
    ip_address: '192.168.20.12',
    last_sync: '5 menit yang lalu',
    firmware: 'v3.8.0-barak',
    status: 'online'
  },
  {
    id: 'AST-PAT-001',
    name: 'JWM Guard Tour RFID Patrol Wand (V9)',
    category: 'Security Patrol Device',
    site: 'RS Siloam Hospital Lippo Village',
    serial_no: 'JWM-SLM-0044',
    ip_address: 'N/A (Docking Sync)',
    last_sync: '15 menit yang lalu',
    firmware: 'v2.1.0',
    status: 'online'
  },
  {
    id: 'AST-PAT-002',
    name: 'JWM Guard Tour GPS Wand',
    category: 'Security Patrol Device',
    site: 'PT. Gudang Garam Tbk (Area Gudang A)',
    serial_no: 'JWM-GG-0112',
    ip_address: 'Cellular 4G SIM',
    last_sync: '2 jam yang lalu',
    firmware: 'v2.1.0',
    status: 'offline'
  },
  {
    id: 'AST-CCTV-001',
    name: 'Dahua 32-Ch 4K NVR Command Center',
    category: 'CCTV Surveillance',
    site: 'Kantor Pusat PT. BARAK (Security HQ)',
    serial_no: 'DH-NVR-HQ-001',
    ip_address: '10.0.1.50',
    last_sync: 'Realtime Stream',
    firmware: 'v5.0.2',
    status: 'online'
  },
  {
    id: 'AST-LAP-001',
    name: 'ThinkPad T14 Gen 4 - Operasional Dispatch',
    category: 'Office Workstation',
    site: 'Kantor Pusat PT. BARAK (Divisi Operasional)',
    serial_no: 'PF-4X990-2026',
    ip_address: '10.0.1.104',
    last_sync: 'Aktif saat ini',
    firmware: 'Win 11 Pro / BarakOS',
    status: 'online'
  }
];

const DEFAULT_TICKETS = [
  {
    id: 'TKT-2026-089',
    title: 'Mesin Absensi Biometrik Lobi Barat Gagal Sinkronisasi',
    category: 'Biometric Attendance',
    site: 'PT. Telkom Indonesia Tbk (Landmark Tower)',
    reported_by: 'Nazi Rinaldi (Operasional)',
    priority: 'high',
    status: 'in_progress',
    description: 'Data tap kartu dan presensi wajah staf keamanan shift malam tidak masuk ke rekap HRD otomatis.',
    resolution_notes: 'Sedang dilakukan remote rebooting pada service biometric listener di port 8080.'
  },
  {
    id: 'TKT-2026-088',
    title: 'GPS Patrol Wand Pos 3 Perlu Penggantian Baterai',
    category: 'Hardware & IoT',
    site: 'PT. Mayora Indah Tbk',
    reported_by: 'Hendrik Gunawan (Chief Security)',
    priority: 'medium',
    status: 'open',
    description: 'Tongkat patroli RFID mati mendadak setelah putaran pos 3 kemarin malam.',
    resolution_notes: ''
  },
  {
    id: 'TKT-2026-087',
    title: 'Permintaan Reset Kata Sandi Akun HRD Staf Baru',
    category: 'Portal & User Access',
    site: 'Kantor Pusat PT. BARAK',
    reported_by: 'Robyn Topani (HRD)',
    priority: 'low',
    status: 'resolved',
    description: 'Staf admin HRD baru lupa password default portal setelah aktivasi.',
    resolution_notes: 'Password telah di-reset ke password123 dan panduan keamanan telah dikirimkan via email internal.'
  },
  {
    id: 'TKT-2026-086',
    title: 'Koneksi Router 4G Backup Pos Gerbang Tol Terputus',
    category: 'Network & Connectivity',
    site: 'PT. Gudang Garam Tbk',
    reported_by: 'Susilo Bambang (Security Leader)',
    priority: 'critical',
    status: 'resolved',
    description: 'Modem SIM card kehabisan kuota data darurat.',
    resolution_notes: 'Kuota data darurat 50GB telah di-topup dan router kembali online dengan latensi normal.'
  }
];

// Helper: Ensure it_assets table exists
async function ensureTables() {
  try {
    await pool.query(
      CREATE TABLE IF NOT EXISTS it_assets (
        id VARCHAR(50) NOT NULL,
        name VARCHAR(255) NOT NULL,
        category VARCHAR(100) NOT NULL,
        site VARCHAR(255) NOT NULL,
        serial_no VARCHAR(100) NOT NULL,
        ip_address VARCHAR(100) NULL,
        firmware VARCHAR(100) NULL DEFAULT 'v1.0.0',
        last_sync VARCHAR(100) NULL DEFAULT 'Baru didaftarkan',
        status ENUM('online', 'offline', 'maintenance') DEFAULT 'online',
        created_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        PRIMARY KEY (id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    );

    await pool.query(
      CREATE TABLE IF NOT EXISTS it_tickets (
        id VARCHAR(50) NOT NULL,
        title VARCHAR(255) NOT NULL,
        category VARCHAR(100) NOT NULL,
        site VARCHAR(255) NOT NULL,
        reported_by VARCHAR(150) NOT NULL,
        priority ENUM('critical', 'high', 'medium', 'low') DEFAULT 'medium',
        status ENUM('open', 'in_progress', 'resolved', 'closed') DEFAULT 'open',
        description TEXT NOT NULL,
        resolution_notes TEXT NULL,
        created_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        PRIMARY KEY (id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    );

    const [rowsA] = await pool.query('SELECT COUNT(*) as c FROM it_assets');
    if (rowsA[0].c === 0) {
      for (const a of DEFAULT_ASSETS) {
        await pool.query(
          'INSERT INTO it_assets (id, name, category, site, serial_no, ip_address, last_sync, firmware, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
          [a.id, a.name, a.category, a.site, a.serial_no, a.ip_address, a.last_sync, a.firmware, a.status]
        );
      }
    }

    const [rowsT] = await pool.query('SELECT COUNT(*) as c FROM it_tickets');
    if (rowsT[0].c === 0) {
      for (const t of DEFAULT_TICKETS) {
        await pool.query(
          'INSERT INTO it_tickets (id, title, category, site, reported_by, priority, status, description, resolution_notes) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
          [t.id, t.title, t.category, t.site, t.reported_by, t.priority, t.status, t.description, t.resolution_notes]
        );
      }
    }
  } catch (err) {
    console.warn('ensureTables warning:', err.message);
  }
}

// -------------------------------------------------------------
// ASSETS CRUD
// -------------------------------------------------------------
async function getAssets(req, res, next) {
  try {
    await ensureTables();
    const [rows] = await pool.query('SELECT * FROM it_assets ORDER BY created_at DESC');
    return successResponse(res, rows, 'Daftar aset IT berhasil diambil.');
  } catch (err) {
    next(err);
  }
}

async function createAsset(req, res, next) {
  try {
    await ensureTables();
    const { name, category, site, serial_no, serialNo, ip_address, ipAddress, firmware, status } = req.body;
    if (!name || !site) {
      return errorResponse(res, 'Nama perangkat dan lokasi site wajib diisi.', null, 400);
    }

    const sn = serial_no || serialNo || 'SN-' + Date.now();
    const ip = ip_address || ipAddress || '192.168.1.1';
    const cat = category || 'Biometric Attendance';
    const prefix = cat.substring(0, 3).toUpperCase();
    const assetId = 'AST-' + prefix + '-' + Math.floor(100 + Math.random() * 900);

    await pool.query(
      'INSERT INTO it_assets (id, name, category, site, serial_no, ip_address, firmware, last_sync, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [assetId, name, cat, site, sn, ip, firmware || 'v1.0.0-prod', 'Baru didaftarkan', status || 'online']
    );

    const [created] = await pool.query('SELECT * FROM it_assets WHERE id = ?', [assetId]);
    return successResponse(res, created[0], 'Aset IT berhasil ditambahkan.', null, 201);
  } catch (err) {
    next(err);
  }
}

async function updateAsset(req, res, next) {
  try {
    await ensureTables();
    const { id } = req.params;
    const { name, category, site, serial_no, serialNo, ip_address, ipAddress, firmware, status, last_sync } = req.body;

    const [existing] = await pool.query('SELECT * FROM it_assets WHERE id = ?', [id]);
    if (existing.length === 0) {
      return errorResponse(res, 'Aset IT tidak ditemukan.', null, 404);
    }

    const current = existing[0];
    const updatedName = name || current.name;
    const updatedCat = category || current.category;
    const updatedSite = site || current.site;
    const updatedSn = serial_no || serialNo || current.serial_no;
    const updatedIp = ip_address || ipAddress || current.ip_address;
    const updatedFw = firmware || current.firmware;
    const updatedStatus = status || current.status;
    const updatedSync = last_sync || (status !== current.status ? 'Baru saja diubah' : current.last_sync);

    await pool.query(
      'UPDATE it_assets SET name = ?, category = ?, site = ?, serial_no = ?, ip_address = ?, firmware = ?, last_sync = ?, status = ? WHERE id = ?',
      [updatedName, updatedCat, updatedSite, updatedSn, updatedIp, updatedFw, updatedSync, updatedStatus, id]
    );

    const [updated] = await pool.query('SELECT * FROM it_assets WHERE id = ?', [id]);
    return successResponse(res, updated[0], 'Aset IT berhasil diperbarui.');
  } catch (err) {
    next(err);
  }
}

async function deleteAsset(req, res, next) {
  try {
    await ensureTables();
    const { id } = req.params;
    const [existing] = await pool.query('SELECT * FROM it_assets WHERE id = ?', [id]);
    if (existing.length === 0) {
      return errorResponse(res, 'Aset IT tidak ditemukan.', null, 404);
    }

    await pool.query('DELETE FROM it_assets WHERE id = ?', [id]);
    return successResponse(res, { id }, 'Aset IT berhasil dihapus dari inventaris.');
  } catch (err) {
    next(err);
  }
}

// -------------------------------------------------------------
// TICKETS CRUD
// -------------------------------------------------------------
async function getTickets(req, res, next) {
  try {
    await ensureTables();
    const [rows] = await pool.query('SELECT * FROM it_tickets ORDER BY created_at DESC');
    return successResponse(res, rows, 'Daftar tiket helpdesk berhasil diambil.');
  } catch (err) {
    next(err);
  }
}

async function createTicket(req, res, next) {
  try {
    await ensureTables();
    const { title, category, site, reported_by, reportedBy, priority, description } = req.body;
    if (!title || !site || !description) {
      return errorResponse(res, 'Judul tiket, site, dan deskripsi masalah wajib diisi.', null, 400);
    }

    const ticketId = 'TKT-2026-' + Math.floor(100 + Math.random() * 900);
    const reporter = reported_by || reportedBy || 'Gheril Ramaditya S. (IT Support)';

    await pool.query(
      'INSERT INTO it_tickets (id, title, category, site, reported_by, priority, status, description, resolution_notes) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [ticketId, title, category || 'Biometric Attendance', site, reporter, priority || 'medium', 'open', description, '']
    );

    const [created] = await pool.query('SELECT * FROM it_tickets WHERE id = ?', [ticketId]);
    return successResponse(res, created[0], 'Tiket kendala berhasil dibuat.', null, 201);
  } catch (err) {
    next(err);
  }
}

async function updateTicket(req, res, next) {
  try {
    await ensureTables();
    const { id } = req.params;
    const { title, category, site, reported_by, reportedBy, priority, status, description, resolution_notes, resolutionNotes } = req.body;

    const [existing] = await pool.query('SELECT * FROM it_tickets WHERE id = ?', [id]);
    if (existing.length === 0) {
      return errorResponse(res, 'Tiket tidak ditemukan.', null, 404);
    }

    const current = existing[0];
    const updatedTitle = title || current.title;
    const updatedCat = category || current.category;
    const updatedSite = site || current.site;
    const updatedReporter = reported_by || reportedBy || current.reported_by;
    const updatedPriority = priority || current.priority;
    const updatedStatus = status || current.status;
    const updatedDesc = description || current.description;
    const updatedRes = resolution_notes !== undefined ? resolution_notes : (resolutionNotes !== undefined ? resolutionNotes : current.resolution_notes);

    await pool.query(
      'UPDATE it_tickets SET title = ?, category = ?, site = ?, reported_by = ?, priority = ?, status = ?, description = ?, resolution_notes = ? WHERE id = ?',
      [updatedTitle, updatedCat, updatedSite, updatedReporter, updatedPriority, updatedStatus, updatedDesc, updatedRes, id]
    );

    const [updated] = await pool.query('SELECT * FROM it_tickets WHERE id = ?', [id]);
    return successResponse(res, updated[0], 'Tiket kendala berhasil diperbarui.');
  } catch (err) {
    next(err);
  }
}

async function deleteTicket(req, res, next) {
  try {
    await ensureTables();
    const { id } = req.params;
    const [existing] = await pool.query('SELECT * FROM it_tickets WHERE id = ?', [id]);
    if (existing.length === 0) {
      return errorResponse(res, 'Tiket tidak ditemukan.', null, 404);
    }

    await pool.query('DELETE FROM it_tickets WHERE id = ?', [id]);
    return successResponse(res, { id }, 'Tiket kendala berhasil dihapus.');
  } catch (err) {
    next(err);
  }
}

module.exports = {
  getAssets,
  createAsset,
  updateAsset,
  deleteAsset,
  getTickets,
  createTicket,
  updateTicket,
  deleteTicket
};