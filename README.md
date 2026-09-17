# Backend REST API — PT. Bhimasena Adhirajasa Radhika

Backend REST API resmi untuk aplikasi manajemen operasional dan outsourcing **PT. Bhimasena Adhirajasa Radhika**, dibangun menggunakan **Node.js**, **Express.js**, dan **MySQL**.

Implementasi ini secara ketat mematuhi seluruh spesifikasi dokumen **Source of Truth (SOT)**:
- `sot/01-PRD.md`: Product Requirement Document
- `sot/02-USER-FLOW.md`: Alur pengguna & role journey
- `sot/04-API-SPEC.md`: Standar kontrak REST API & endpoint
- `sot/06. BUSINESS-RULES.md`: Aturan bisnis, integritas data, dan permission matrix
- `sot/07. DATABASE-SPEC.md`: Struktur database relasional & seed data

---

## Persyaratan Sistem

- **Node.js** v18.0.0 atau lebih tinggi (disarankan v20+)
- **MySQL** 8.0+ / MariaDB 10.3+ (Disediakan oleh Laragon / standalone)
- **Laragon**: Jalankan service MySQL via tombol *Start All*

---

## Panduan Instalasi & Menjalankan

### 1. Masuk ke folder backend
```bash
cd backend
```

### 2. Install Dependensi
```bash
npm install
```

### 3. Konfigurasi Environment (`.env`)
Salin file `.env.example` menjadi `.env` (file `.env` default sudah dibuatkan):
```ini
PORT=5000
NODE_ENV=development

DB_HOST=127.0.0.1
DB_PORT=3306
DB_USER=root
DB_PASSWORD=
DB_NAME=barak_db
DB_CONNECTION_LIMIT=10

JWT_SECRET=bhimasena_secret_jwt_key_2026_barak_secure
JWT_EXPIRES_IN=7d
CORS_ORIGIN=*
```

### 4. Inisialisasi Database & Seed Data
Pastikan MySQL di Laragon sudah dalam keadaan **Active (Start All)**, kemudian jalankan perintah otomatis berikut:
```bash
npm run db:init
```
Perintah ini akan membaca skrip [database/database.sql](database/database.sql) dan mengeksekusi pembuatan database `barak_db`, 12 tabel relasional, constraint foreign key, serta seed data awal.

### 5. Jalankan Server Backend

Mode Development (dengan hot-reload):
```bash
npm run dev
```

Mode Production:
```bash
npm start
```

Server akan aktif di: `http://localhost:5000`  
Base URL API: `http://localhost:5000/api/v1`

---

## Akun Demo Development (Seed Data)

Semua akun demo di bawah ini telah di-hash menggunakan **Bcrypt** dengan kata sandi default: `password`.

| Peran (Role) | Email | Password | Hak Akses Utama |
|---|---|---|---|
| **Direktur** | `direktur@bhimasena.co.id` | `password` | Akses penuh seluruh modul (R/W), user & role management |
| **HRD** | `hrd@bhimasena.co.id` | `password` | Manajemen karyawan, penempatan, rekap presensi (R/W) |
| **Finance** | `finance@bhimasena.co.id` | `password` | Manajemen tagihan/invoice dan status pembayaran (R/W) |
| **Marketing** | `marketing@bhimasena.co.id` | `password` | Pipeline CRM leads, data klien mitra, master layanan (R/W) |
| **Operasional** | `operasional@bhimasena.co.id` | `password` | Penempatan personil lapangan, pencatatan presensi, site klien (R/W) |

---

## Ringkasan Endpoint API (`/api/v1`)

### 1. Autentikasi (`/api/v1/auth`)
- `POST /auth/login` — Login dan perolehan JWT Bearer Token
- `POST /auth/register` — Pendaftaran akun pengguna
- `POST /auth/logout` — Logout (auth required)
- `GET /auth/me` — Ambil profil pengguna yang sedang login

### 2. Pengguna & Role (`/api/v1/users`) — *Direktur Only*
- `GET /users` — Daftar pengguna (pagination, search, role, status)
- `POST /users` — Buat pengguna baru
- `GET /users/:id` — Detail pengguna
- `PATCH /users/:id` — Perbarui data pengguna / ganti role
- `DELETE /users/:id` — Deaktivasi pengguna (*soft deactivation*)
- `GET /users/roles` — Daftar seluruh master role

### 3. Data Karyawan / Manpower (`/api/v1/employees`)
- `GET /employees` — Daftar karyawan (filter status, employment_type, pencarian)
- `POST /employees` — Daftarkan karyawan baru (*unique employee_no*)
- `GET /employees/:id` — Detail karyawan & riwayat penempatan
- `PATCH /employees/:id` — Perbarui profil & status karyawan
- `DELETE /employees/:id` — Deaktivasi karyawan berhistori (*soft retention*)

### 4. Klien & Lokasi Mitra (`/api/v1/clients` & `/api/v1/sites`)
- `GET/POST /clients`, `GET/PATCH/DELETE /clients/:id` — Manajemen klien
- `GET/POST /sites`, `GET/PATCH/DELETE /sites/:id` — Manajemen lokasi site klien

### 5. Layanan Bisnis (`/api/v1/services`)
- `GET/POST /services`, `GET/PATCH/DELETE /services/:id` — 6 layanan bisnis inti

### 6. Penempatan Kerja Personel (`/api/v1/placements`)
- `GET/POST /placements`, `GET/PATCH/DELETE /placements/:id` — Inti operasional penempatan

### 7. Presensi Harian (`/api/v1/attendance`)
- `GET /attendance` — Rekap presensi dengan filter tanggal, status, karyawan, site
- `POST /attendance` — Catat presensi harian (validasi placement aktif)
- `PATCH /attendance/:id` — Koreksi data presensi (audit trail tercatat)

### 8. Penagihan & Faktur (`/api/v1/invoices`)
- `GET/POST /invoices`, `GET/PATCH/DELETE /invoices/:id` — Faktur klien & status pembayaran

### 9. Prospek & Pipeline CRM (`/api/v1/leads`)
- `GET/POST /leads`, `GET/PATCH/DELETE /leads/:id` — Pipeline prospek (new, contacted, qualified, proposal, won, lost)

### 10. Dashboard, Audit, & Notifikasi
- `GET /dashboard/summary` — Rekap metrik KPI dinamis (*role-aware*)
- `GET /activities` — Feed riwayat aktivitas & audit trail
- `GET /notifications` — Kotak masuk notifikasi pengguna
- `PATCH /notifications/:id/read` — Tandai notifikasi telah dibaca

### 11. Endpoint Publik (`/api/v1/public`) — *Tanpa Autentikasi*
- `POST /public/contact` — Menerima formulir kontak dari landing page
- `GET /public/services` — Daftar layanan publik untuk landing page

---

## Integrasi dengan Frontend React (Vite)

Pada project frontend (`c:/laragon/www/barak/frontend`), set konfigurasi file `.env` atau `.env.development`:
```ini
VITE_USE_REAL_API=true
VITE_API_BASE_URL=http://localhost:5000/api/v1
```
Dengan konfigurasi ini, frontend akan otomatis beralih dari mode *mock* ke backend REST API Express yang sebenarnya.

---

## Panduan Deployment ke Railway.app (1 Project: Database & API)

Backend ini sudah dikonfigurasi secara *native* agar kompatibel penuh dengan arsitektur **Railway.app** (otomatis mendeteksi variabel `MYSQLHOST`, `MYSQLPORT`, `MYSQLUSER`, `MYSQLPASSWORD`, `MYSQLDATABASE`, atau `MYSQL_URL` / `DATABASE_URL`).

### Langkah-langkah Deploy di Railway:

#### 1. Buat Project Baru di Railway
1. Login ke dashboard [railway.com](https://railway.com).
2. Klik tombol **`+ New Project`**.

#### 2. Tambahkan Service 1: MySQL Database
1. Di dalam project baru tersebut, klik **`+ New`** ➜ **`Database`** ➜ Pilih **`Add MySQL`**.
2. Railway akan otomatis membuatkan service MySQL dan menyediakan kredensial internal.

#### 3. Tambahkan Service 2: Express Backend REST API
1. Di project yang sama, klik **`+ New`** ➜ **`GitHub Repo`**.
2. Pilih repository: `hidayatullah70/bimasenaadhirajasaradika_be`.
3. Buka tab **Variables** pada service API tersebut, lalu tambahkan environment variables berikut (menggunakan *Railway Reference*):
   - `DB_HOST`: `${{MySQL.MYSQLHOST}}`
   - `DB_PORT`: `${{MySQL.MYSQLPORT}}`
   - `DB_USER`: `${{MySQL.MYSQLUSER}}`
   - `DB_PASSWORD`: `${{MySQL.MYSQLPASSWORD}}`
   - `DB_NAME`: `${{MySQL.MYSQLDATABASE}}`
   - `JWT_SECRET`: `bhimasena_secret_jwt_key_2026_barak_secure`
   - `JWT_EXPIRES_IN`: `7d`
   - `CORS_ORIGIN`: `*`
   *(Catatan: Anda juga cukup mengisi `DATABASE_URL: ${{MySQL.MYSQL_URL}}` karena backend otomatis membaca format URL)*.

#### 4. Import / Inisialisasi Database Schema & Seed Data di Railway
Ada 2 cara mudah:
- **Cara A (Melalui Tab Query MySQL Railway)**:
  1. Klik service **MySQL** di Railway ➜ Buka tab **Data** / **Query**.
  2. Buka file [database/database.sql](database/database.sql), salin seluruh isinya, lalu *paste* dan jalankan di editor Query Railway.
- **Cara B (Melalui Railway CLI / Command)**:
  Jalankan perintah: `npm run db:init` di environment Railway.

#### 5. Generate Domain Publik API
1. Klik service **API Backend** di Railway.
2. Masuk ke tab **Settings** ➜ bagian **Networking** ➜ Klik tombol **`Generate Domain`**.
3. Anda akan mendapatkan URL publik HTTPS resmi (contoh: `https://bimasenaadhirajasaradika-be-production.up.railway.app`).

#### 6. Hubungkan ke Frontend & Hoppscotch
- Pada project frontend (`.env`):
  ```ini
  VITE_API_BASE_URL=https://<DOMAIN-RAILWAY-ANDA>.up.railway.app/api/v1
  ```
- Pada Hoppscotch:
  Cukup ubah variabel environment `baseUrl` menjadi URL Railway tersebut!

---

## API Client Collection (`collection.json`)

Project ini menyediakan file koleksi standar [collection.json](collection.json) yang dapat langsung diimport ke **Hoppscotch** maupun **Postman** untuk menguji seluruh endpoint CRUD:

### 1. Cara Menggunakan di HOPPSCOTCH:
1. Buka [Hoppscotch](https://hoppscotch.io) atau Hoppscotch Desktop.
2. Di tab **Collections** (ikon folder 📁 di panel kanan), klik ikon **Import / Export**.
3. Pilih opsi **`Import from Postman`**.
4. Pilih file `collection.json` dari folder `backend/`.
5. Seluruh folder CRUD (14 modul endpoint) akan langsung muncul dengan rapi.
6. **Koneksi ke Localhost di Hoppscotch Web**:
   - Pasang ekstensi browser **Hoppscotch Browser Extension** di Chrome/Firefox.
   - Di pojok kanan bawah Hoppscotch, pastikan **Interceptor** diatur ke **Browser Extension** agar browser mengizinkan request ke `http://localhost:5000`.

### 2. Cara Menggunakan di POSTMAN:
1. Buka aplikasi **Postman**.
2. Klik tombol **Import** (di kiri atas).
3. Pilih file `collection.json` dari folder `backend/`.
4. Koleksi **"PT. Bhimasena Adhirajasa Radhika - Backend REST API"** akan otomatis muncul.
5. Jalankan request **01. Authentication -> Login - Direktur** terlebih dahulu. Token JWT akan otomatis tersimpan ke variabel koleksi `{{token}}` untuk request CRUD selanjutnya.

### Struktur Folder Koleksi:
- `00. Server & Health Check` (Root, Base API v1, Health check)
- `01. Authentication` (Login semua role, Profile Me, Refresh token, Logout)
- `02. Dashboard Summary` (Ringkasan metrik KPI dinamis terintegrasi MySQL)
- `03. Employees (CRUD)` (Manajemen data karyawan & personil)
- `04. Clients (CRUD)` (Manajemen mitra & klien)
- `05. Sites / Lokasi Kerja (CRUD)` (Lokasi penempatan tugas)
- `06. Services / Layanan (CRUD)` (Master katalog layanan outsourcing)
- `07. Placements / Penempatan (CRUD)` (Penugasan personil ke lokasi klien)
- `08. Attendance / Presensi (CRUD)` (Presensi harian & rekap)
- `09. Invoices / Keuangan (CRUD)` (Penerbitan tagihan & status pembayaran)
- `10. Leads / Marketing (CRUD)` (Pipeline CRM prospek klien)
- `11. Activities & Audit Log` (Audit trail perubahan sistem)
- `12. Notifications` (Notifikasi pengguna)
- `13. Users & Roles Management (Direktur Only)` (Manajemen akun staf)
- `14. Public Endpoints (Landing Page)` (Layanan publik & formulir kontak)

