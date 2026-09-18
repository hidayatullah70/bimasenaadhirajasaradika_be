# Source of Truth: Panduan Deployment Railway (Database & API)
## PT. Bhimasena Adhirajasa Radhika (BARAK)

Dokumen ini merupakan panduan resmi (*Single Source of Truth*) untuk konfigurasi dan deployment arsitektur Backend API dan Database MySQL pada platform **[Railway.com](https://railway.com)** dalam **1 Project Terpadu**.

---

## 1. Arsitektur Deployment (1 Project - 2 Services)

Sistem di-deploy dalam satu project Railway yang terdiri dari 2 services yang saling terhubung melalui *Private Networking* dan *Variable Reference*:

```
+-----------------------------------------------------------------------------------+
|                            RAILWAY PROJECT: "barak-backend"                       |
|                                                                                   |
|   +-------------------------------+          +--------------------------------+   |
|   |       SERVICE 1: DATABASE     |          |       SERVICE 2: BACKEND API   |   |
|   |  - Image: MySQL 8.0 (InnoDB)  |<---------|  - Node.js 20+ / Express REST  |   |
|   |  - Private Port: 3306         | Network  |  - Auto Deploy via GitHub Repo |   |
|   |  - Storage: Persistent Volume | Variable |  - Auto-Init Migration Enabled |   |
|   +-------------------------------+          +--------------------------------+   |
|                                                              |                    |
+--------------------------------------------------------------|--------------------+
                                                               | Public URL (HTTPS)
                                                               v
                                   https://bimasenaadhirajasaradikabe-production.up.railway.app/api/v1
```

---

## 2. Informasi Repositori & Spesifikasi Layanan

| Komponen | Spesifikasi / Konfigurasi |
|:---|:---|
| **GitHub Repository** | `https://github.com/hidayatullah70/bimasenaadhirajasaradika_be.git` |
| **Branch Target** | `main` |
| **Runtime Environment** | Node.js 20+ (NPM) |
| **Database Engine** | MySQL 8.0.x (Default Charset: `utf8mb4_unicode_ci`, Engine: `InnoDB`) |
| **Base URL Produksi** | `https://bimasenaadhirajasaradikabe-production.up.railway.app/api/v1` |

---

## 3. Langkah-Langkah Deployment dari Awal

### Tahap 1: Membuat Project Baru di Railway
1. Buka dashboard [Railway.com](https://railway.com) dan login.
2. Klik tombol **"New Project"** -> Pilih **"Empty Project"**.
3. Beri nama project (misal: `barak-backend` atau `bimasenaadhirajasaradika`).

---

### Tahap 2: Menambahkan Service 1 (MySQL Database)
1. Di dalam kanvas project Railway, klik tombol **"+ Create"** atau **"New Service"**.
2. Pilih **"Database"** -> Pilih **"Add MySQL"**.
3. Railway akan secara otomatis membuat container MySQL dan men-generate variabel koneksi standar:
   - `MYSQLHOST`
   - `MYSQLPORT` (biasanya `3306`)
   - `MYSQLUSER` (`root`)
   - `MYSQLPASSWORD`
   - `MYSQLDATABASE` (`railway`)
   - `MYSQL_URL` / `DATABASE_URL`

---

### Tahap 3: Menambahkan Service 2 (Backend API dari GitHub)
1. Di project yang sama, klik tombol **"+ Create"** -> Pilih **"GitHub Repo"**.
2. Pilih repositori: `hidayatullah70/bimasenaadhirajasaradika_be`.
3. Pilih branch: `main`.
4. Railway akan mendeteksi project Node.js secara otomatis menggunakan script:
   - **Build Command**: (kosongkan / default)
   - **Start Command**: `npm start` (menjalankan `node src/server.js`)

---

### Tahap 4: Konfigurasi Environment Variables pada Service API
Buka menu **"Variables"** pada Service Backend API di Railway, lalu tambahkan variabel berikut:

| Nama Variabel | Nilai / Railway Reference Template | Keterangan |
|:---|:---|:---|
| `NODE_ENV` | `production` | Menjalankan Express dalam mode produksi |
| `PORT` | `5000` | Port aplikasi (Railway otomatis mengekspos public domain) |
| `JWT_SECRET` | `bhimasena_secret_jwt_token_key_2026_super_secure` | Kunci enkripsi token JWT |
| `JWT_EXPIRES_IN` | `7d` | Masa berlaku token JWT |
| `CORS_ORIGIN` | `*` | Izin domain frontend (dapat diisi URL frontend Vercel/Netlify) |
| `MYSQLHOST` | `${{MySQL.MYSQLHOST}}` | Mengambil host private MySQL otomatis |
| `MYSQLPORT` | `${{MySQL.MYSQLPORT}}` | Mengambil port database MySQL otomatis |
| `MYSQLUSER` | `${{MySQL.MYSQLUSER}}` | Mengambil username database |
| `MYSQLPASSWORD` | `${{MySQL.MYSQLPASSWORD}}` | Mengambil kata sandi database |
| `MYSQLDATABASE` | `${{MySQL.MYSQLDATABASE}}` | Mengambil nama database aktif (`railway`) |
| `MYSQL_URL` | `${{MySQL.MYSQL_URL}}` | Connection string pool |

> [!TIP]
> Dengan menggunakan sintaks `${{MySQL.MYSQLHOST}}`, jika Railway melakukan restart atau pemindahan host database, backend API akan otomatis selalu terhubung tanpa perlu mengedit variabel secara manual.

---

### Tahap 5: Generate Public Domain (Networking)
1. Pada Service Backend API, buka tab **"Settings"**.
2. Gulir ke bagian **"Networking"** -> Klik **"Generate Domain"**.
3. Railway akan menyediakan URL HTTPS publik (contoh: `bimasenaadhirajasaradikabe-production.up.railway.app`).

---

## 4. Mekanisme Auto-Init Skema & Seed Data Otomatis

Backend dilengkapi dengan fitur cerdas **Self-Migrating & Auto-Seeding** pada file `src/config/db.js` dan `src/server.js`:

```javascript
// Saat server Railway pertama kali booting:
async function autoInitDatabaseIfEmpty() {
  const [tables] = await pool.query('SHOW TABLES');
  if (tables.length === 0) {
    // 1. Membaca database/database.sql
    // 2. Membersihkan perintah USE barak_db lokal
    // 3. Menjalankan DDL 12 Tabel InnoDB lengkap
    // 4. Mengisi data master Roles, Services, 5 User Default, Klien, Site, dan Penempatan
  }
}
```

### Hasil yang Dihasilkan Secara Otomatis:
1. **12 Tabel Relasional**: `roles`, `users`, `services`, `clients`, `sites`, `employees`, `placements`, `invoices`, `leads`, `activity_logs`, `attendances`, `notifications`.
2. **5 Akun Default Resmi**:
   - `direktur@bimasenaadhirajasaradika.com` | **Juli Priyanto (Direktur)** | Foto: `/assets/img/team/person-3.jpeg`
   - `hrd@bimasenaadhirajasaradika.com` | **Robyn Topani (HRD)** | Foto: `/assets/img/team/person-7.jpeg`
   - `finance@bimasenaadhirajasaradika.com` | **Zaenal Arifin (Finance)** | Foto: `/assets/img/team/person-4.jpeg`
   - `marketing@bimasenaadhirajasaradika.com` | **Hendri Nopamin (Marketing)** | Foto: `/assets/img/team/person-2.jpeg`
   - `operasional@bimasenaadhirajasaradika.com` | **Nazi Rinaldi (operasional)** | Foto: `/assets/img/team/nazi.jpg`
   - Password default seluruh akun: `password`.

---

## 5. Verifikasi & Health Check Endpoints

Setelah deployment selesai, lakukan verifikasi endpoint produksi melalui browser atau curl:

### 1. Root & Health Endpoint
```bash
curl -X GET https://bimasenaadhirajasaradikabe-production.up.railway.app/
```
**Respons (200 OK):**
```json
{
  "success": true,
  "app": "PT. Bhimasena Adhirajasa Radhika Backend API",
  "version": "1.0.0",
  "status": "online"
}
```

### 2. Base API Index
```bash
curl -X GET https://bimasenaadhirajasaradikabe-production.up.railway.app/api/v1
```

### 3. Public Services Endpoint
```bash
curl -X GET https://bimasenaadhirajasaradikabe-production.up.railway.app/api/v1/public/services
```

### 4. Auth Login Test (Direktur)
```bash
curl -X POST https://bimasenaadhirajasaradikabe-production.up.railway.app/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"direktur@bimasenaadhirajasaradika.com","password":"password"}'
```

---

## 6. Sinkronisasi Frontend ke Production API

Pada aplikasi Frontend (`bimasenaadhirajasaradika_fe`), konfigurasi file `.env` diatur sebagai berikut:

```env
VITE_USE_REAL_API=true
VITE_API_BASE_URL=https://bimasenaadhirajasaradikabe-production.up.railway.app/api/v1
```

---

## 7. Pemeliharaan & Troubleshooting

1. **Bagaimana jika melakukan commit baru ke GitHub?**
   - Railway secara otomatis mendeteksi setiap `git push` ke branch `main` dan menjalankan proses build & deployment ulang tanpa downtime (*Rolling Deployment*).
2. **Melihat Log Server:**
   - Buka dashboard Railway -> Klik Service Backend API -> Tab **"Deployments"** -> Klik deployment aktif -> Tab **"View Logs"**.
3. **Mengakses Database MySQL Langsung:**
   - Buka Service MySQL -> Tab **"Data"** untuk melihat & mengedit isi tabel secara visual via Railway Database Explorer, atau gunakan koneksi eksternal via DBeaver/TablePlus menggunakan `Connect` tab credentials.
