# SOT — API INTEGRATION SPECIFICATION & EXAMPLES
## PT. Bhimasena Adhirajasa Radhika (BARAK)

Dokumen ini merupakan panduan integrasi resmi seluruh endpoint REST API PT. Bhimasena Adhirajasa Radhika, memuat contoh spesifik **Header**, **Query Parameters**, **Request Body**, hingga **Output Response (JSON)** untuk setiap operasi CRUD.

---

## 1. Konsep Dasar & Format Respons Standar

- **Base API URL**: `https://bimasenaadhirajasaradikabe-production.up.railway.app/api/v1`
- **Header Standar**:
  ```http
  Content-Type: application/json
  Authorization: Bearer <JWT_TOKEN>
  ```
- **Format Respons Sukses (HTTP 200 / 201)**:
  ```json
  {
    "success": true,
    "message": "Pesan sukses deskriptif",
    "data": {},
    "meta": {
      "page": 1,
      "limit": 10,
      "total": 100,
      "totalPages": 10
    }
  }
  ```
- **Format Respons Error (HTTP 400 / 401 / 403 / 404 / 500)**:
  ```json
  {
    "success": false,
    "message": "Pesan error deskriptif",
    "errors": null
  }
  ```

---

## 2. Server & Health Check

### 2.1 Root Server Info
- **Endpoint**: `GET /`
- **Auth**: Publik (*Tanpa Token*)
- **Output Response (200 OK)**:
  ```json
  {
    "name": "PT. Bhimasena Adhirajasa Radhika Backend API",
    "version": "1.0.0",
    "documentation": "sot/04-API-SPEC.md",
    "base_url": "/api/v1",
    "status": "online"
  }
  ```

### 2.2 Base API v1 Directory Index
- **Endpoint**: `GET /api/v1`
- **Auth**: Publik (*Tanpa Token*)
- **Output Response (200 OK)**:
  ```json
  {
    "success": true,
    "message": "PT. Bhimasena Adhirajasa Radhika — Backend REST API v1",
    "version": "1.0.0",
    "status": "active",
    "documentation": "sot/04-API-SPEC.md",
    "endpoints": {
      "health": "/api/v1/health",
      "auth": {
        "login": "POST /api/v1/auth/login",
        "me": "GET /api/v1/auth/me",
        "logout": "POST /api/v1/auth/logout"
      },
      "dashboard": "GET /api/v1/dashboard/summary",
      "resources": {
        "employees": "/api/v1/employees",
        "clients": "/api/v1/clients",
        "sites": "/api/v1/sites",
        "services": "/api/v1/services",
        "placements": "/api/v1/placements",
        "attendance": "/api/v1/attendance",
        "invoices": "/api/v1/invoices",
        "leads": "/api/v1/leads",
        "activities": "/api/v1/activities",
        "notifications": "/api/v1/notifications",
        "users": "/api/v1/users"
      }
    }
  }
  ```

### 2.3 Health Check
- **Endpoint**: `GET /api/v1/health`
- **Auth**: Publik (*Tanpa Token*)
- **Output Response (200 OK)**:
  ```json
  {
    "status": "OK",
    "service": "PT. Bhimasena Adhirajasa Radhika Backend API",
    "timestamp": "2026-09-17T15:00:00.000Z"
  }
  ```

---

## 3. Modul 01: Authentication (`/api/v1/auth`)

### 3.1 Login Pengguna
- **Endpoint**: `POST /api/v1/auth/login`
- **Auth**: Publik (*Tanpa Token*)
- **Request Body (JSON)**:
  ```json
  {
    "email": "direktur@bimasenaadhirajasaradika.com",
    "password": "password123"
  }
  ```
- **Output Response (200 OK)**:
  ```json
  {
    "success": true,
    "message": "Login berhasil.",
    "data": {
      "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
      "user": {
        "id": 1,
        "name": "Bhimasena Direktur",
        "email": "direktur@bimasenaadhirajasaradika.com",
        "avatar": "/assets/img/team/JustHidy3.jpeg",
        "avatar_url": "/assets/img/team/JustHidy3.jpeg",
        "role": "direktur",
        "roleName": "Direktur"
      }
    }
  }
  ```
- **Output Response Gagal (401 Unauthorized)**:
  ```json
  {
    "success": false,
    "message": "Kredensial tidak valid: email atau password salah."
  }
  ```

### 3.2 Profil Pengguna Terautentikasi (Me)
- **Endpoint**: `GET /api/v1/auth/me`
- **Header**: `Authorization: Bearer <JWT_TOKEN>`
- **Output Response (200 OK)**:
  ```json
  {
    "success": true,
    "message": "Profil pengguna berhasil diambil.",
    "data": {
      "id": 1,
      "name": "Bhimasena Direktur",
      "email": "direktur@bimasenaadhirajasaradika.com",
      "avatar": "/assets/img/team/JustHidy3.jpeg",
      "avatar_url": "/assets/img/team/JustHidy3.jpeg",
      "role": "direktur",
      "roleName": "Direktur"
    }
  }
  ```

### 3.3 Refresh Token
- **Endpoint**: `POST /api/v1/auth/refresh`
- **Header**: `Authorization: Bearer <JWT_TOKEN>`
- **Output Response (200 OK)**:
  ```json
  {
    "success": true,
    "message": "Token berhasil diperbarui.",
    "data": {
      "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.newPayload..."
    }
  }
  ```

### 3.4 Logout
- **Endpoint**: `POST /api/v1/auth/logout`
- **Header**: `Authorization: Bearer <JWT_TOKEN>`
- **Output Response (200 OK)**:
  ```json
  {
    "success": true,
    "message": "Logout berhasil."
  }
  ```

---

## 4. Modul 02: Dashboard Summary (`/api/v1/dashboard`)

### 4.1 Get Role-Aware KPI Summary
- **Endpoint**: `GET /api/v1/dashboard/summary?role=direktur`
- **Header**: `Authorization: Bearer <JWT_TOKEN>`
- **Query Params**: `role` (*optional, default ke role user yang login*)
- **Output Response (200 OK)**:
  ```json
  {
    "success": true,
    "message": "Ringkasan dashboard KPI berhasil diambil.",
    "data": {
      "role": "direktur",
      "kpi": {
        "totalEmployees": 150,
        "activeEmployees": 142,
        "activeSites": 18,
        "totalClients": 24,
        "activePlacements": 138,
        "attendanceRate": "98.7%",
        "monthlyRevenue": "Rp 450.000.000",
        "pendingReceivables": "Rp 85.000.000",
        "overdueReceivables": "Rp 12.500.000",
        "openLeadsCount": 7,
        "wonLeadsCount": 15,
        "todayAttendance": {
          "present": 135,
          "late": 3,
          "absent": 4
        }
      },
      "servicesSummary": [
        {
          "id": 1,
          "code": "SEC",
          "title": "Security & Guard",
          "activePersonnel": 85,
          "clientCount": 12
        }
      ],
      "recentActivities": [],
      "recentInvoices": [],
      "recentLeads": []
    }
  }
  ```

---

## 5. Modul 03: Employees / Karyawan (`/api/v1/employees`)
*Role Access*: Direktur, HRD, Operasional (R/W); Finance, Marketing (Read-only).

### 5.1 Get All Employees
- **Endpoint**: `GET /api/v1/employees?page=1&limit=10&status=active&search=budi`
- **Header**: `Authorization: Bearer <JWT_TOKEN>`
- **Output Response (200 OK)**:
  ```json
  {
    "success": true,
    "message": "Daftar karyawan berhasil diambil.",
    "data": [
      {
        "id": 1,
        "employee_no": "EMP-2026-0001",
        "name": "Budi Santoso",
        "phone": "081234567890",
        "email": "budi.santoso@example.com",
        "employment_type": "kontrak",
        "status": "active",
        "join_date": "2026-01-10",
        "current_placement": {
          "site_name": "Gedung Cyber 2",
          "client_name": "PT. Megatama Solusi",
          "shift": "pagi"
        }
      }
    ],
    "meta": {
      "page": 1,
      "limit": 10,
      "total": 1,
      "totalPages": 1
    }
  }
  ```

### 5.2 Get Employee Detail
- **Endpoint**: `GET /api/v1/employees/1`
- **Header**: `Authorization: Bearer <JWT_TOKEN>`
- **Output Response (200 OK)**:
  ```json
  {
    "success": true,
    "message": "Detail karyawan berhasil diambil.",
    "data": {
      "id": 1,
      "employee_no": "EMP-2026-0001",
      "name": "Budi Santoso",
      "phone": "081234567890",
      "email": "budi.santoso@example.com",
      "employment_type": "kontrak",
      "status": "active",
      "join_date": "2026-01-10",
      "end_date": "2027-01-09"
    }
  }
  ```

### 5.3 Create Employee
- **Endpoint**: `POST /api/v1/employees`
- **Header**: `Authorization: Bearer <JWT_TOKEN>`
- **Request Body (JSON)**:
  ```json
  {
    "name": "Agus Setiawan",
    "phone": "081399887766",
    "email": "agus.setiawan@example.com",
    "employment_type": "kontrak",
    "status": "active",
    "join_date": "2026-03-01",
    "end_date": "2027-02-28"
  }
  ```
- **Output Response (201 Created)**:
  ```json
  {
    "success": true,
    "message": "Karyawan baru berhasil ditambahkan.",
    "data": {
      "id": 151,
      "employee_no": "EMP-2026-0151",
      "name": "Agus Setiawan",
      "employment_type": "kontrak",
      "status": "active"
    }
  }
  ```

### 5.4 Update Employee
- **Endpoint**: `PATCH /api/v1/employees/1`
- **Header**: `Authorization: Bearer <JWT_TOKEN>`
- **Request Body (JSON)**:
  ```json
  {
    "phone": "081299998888",
    "status": "active"
  }
  ```
- **Output Response (200 OK)**:
  ```json
  {
    "success": true,
    "message": "Data karyawan berhasil diperbarui.",
    "data": {
      "id": 1,
      "phone": "081299998888",
      "status": "active"
    }
  }
  ```

### 5.5 Delete Employee
- **Endpoint**: `DELETE /api/v1/employees/1`
- **Header**: `Authorization: Bearer <JWT_TOKEN>`
- **Output Response (200 OK)**:
  ```json
  {
    "success": true,
    "message": "Data karyawan berhasil dinonaktifkan."
  }
  ```

---

## 6. Modul 04: Clients / Mitra Klien (`/api/v1/clients`)
*Role Access*: Direktur, Marketing, Finance (R/W); HRD, Operasional (Read-only).

### 6.1 Get All Clients
- **Endpoint**: `GET /api/v1/clients?page=1&limit=10&status=active`
- **Output Response (200 OK)**:
  ```json
  {
    "success": true,
    "message": "Daftar klien berhasil diambil.",
    "data": [
      {
        "id": 1,
        "client_code": "CLN-2026-001",
        "name": "PT. Nusantara Graha Pratama",
        "phone": "021-5551234",
        "email": "procurement@nusantaragraha.com",
        "address": "Gedung Nusantara Tower Lt. 15, Sudirman, Jakarta",
        "status": "active",
        "total_sites": 3,
        "active_personnel": 24
      }
    ],
    "meta": { "page": 1, "limit": 10, "total": 1, "totalPages": 1 }
  }
  ```

### 6.2 Create Client
- **Endpoint**: `POST /api/v1/clients`
- **Request Body (JSON)**:
  ```json
  {
    "name": "PT. Mega Sentosa Industri",
    "phone": "021-88997766",
    "email": "contact@megasentosa.com",
    "address": "Kawasan Industri MM2100, Cikarang",
    "status": "active"
  }
  ```
- **Output Response (201 Created)**:
  ```json
  {
    "success": true,
    "message": "Klien baru berhasil ditambahkan.",
    "data": {
      "id": 25,
      "client_code": "CLN-2026-025",
      "name": "PT. Mega Sentosa Industri",
      "status": "active"
    }
  }
  ```

### 6.3 Update Client
- **Endpoint**: `PATCH /api/v1/clients/1`
- **Request Body (JSON)**:
  ```json
  {
    "phone": "021-5554321",
    "address": "Gedung Nusantara Tower Lt. 16, Sudirman, Jakarta"
  }
  ```
- **Output Response (200 OK)**:
  ```json
  {
    "success": true,
    "message": "Data klien berhasil diperbarui.",
    "data": {
      "id": 1,
      "phone": "021-5554321"
    }
  }
  ```

### 6.4 Delete Client
- **Endpoint**: `DELETE /api/v1/clients/1`
- **Output Response (200 OK)**:
  ```json
  {
    "success": true,
    "message": "Data klien berhasil dihapus/dinonaktifkan."
  }
  ```

---

## 7. Modul 05: Sites / Lokasi Kerja (`/api/v1/sites`)

### 7.1 Get All Sites
- **Endpoint**: `GET /api/v1/sites?client_id=1&status=active`
- **Output Response (200 OK)**:
  ```json
  {
    "success": true,
    "message": "Daftar lokasi kerja (sites) berhasil diambil.",
    "data": [
      {
        "id": 1,
        "site_code": "SITE-2026-001",
        "client_id": 1,
        "client_name": "PT. Nusantara Graha Pratama",
        "name": "Nusantara Tower Sudirman",
        "address": "Jl. Jend. Sudirman Kav. 25, Jakarta Pusat",
        "city": "Jakarta Pusat",
        "required_personnel": 12,
        "active_personnel": 12,
        "status": "active"
      }
    ]
  }
  ```

### 7.2 Create Site
- **Endpoint**: `POST /api/v1/sites`
- **Request Body (JSON)**:
  ```json
  {
    "client_id": 1,
    "name": "Nusantara Warehouse Cikarang",
    "address": "Blok B-12 Kawasan Industri GIIC",
    "city": "Bekasi",
    "required_personnel": 8,
    "status": "active"
  }
  ```
- **Output Response (201 Created)**:
  ```json
  {
    "success": true,
    "message": "Lokasi kerja baru berhasil ditambahkan.",
    "data": {
      "id": 19,
      "site_code": "SITE-2026-019",
      "name": "Nusantara Warehouse Cikarang"
    }
  }
  ```

---

## 8. Modul 06: Services / Layanan Outsourcing (`/api/v1/services`)

### 8.1 Get All Services
- **Endpoint**: `GET /api/v1/services`
- **Output Response (200 OK)**:
  ```json
  {
    "success": true,
    "message": "Daftar layanan berhasil diambil.",
    "data": [
      {
        "id": 1,
        "code": "SEC",
        "name": "Security & Guard Services",
        "description": "Pengamanan profesional fisik 24/7 bersertifikasi Gada Pratama.",
        "is_active": true
      },
      {
        "id": 2,
        "code": "CLN",
        "name": "Commercial Cleaning Service",
        "description": "Kebersihan dan sanitasi gedung komersial, kantor, dan fasilitas umum.",
        "is_active": true
      }
    ]
  }
  ```

### 8.2 Create Service
- **Endpoint**: `POST /api/v1/services`
- **Request Body (JSON)**:
  ```json
  {
    "code": "VALET",
    "name": "Valet & Parking Management",
    "description": "Layanan manajemen parkir dan valet dengan SOP profesional.",
    "is_active": true
  }
  ```
- **Output Response (201 Created)**:
  ```json
  {
    "success": true,
    "message": "Layanan baru berhasil ditambahkan.",
    "data": {
      "id": 6,
      "code": "VALET",
      "name": "Valet & Parking Management"
    }
  }
  ```

---

## 9. Modul 07: Placements / Penempatan Personil (`/api/v1/placements`)

### 9.1 Get All Placements
- **Endpoint**: `GET /api/v1/placements?client_id=1&site_id=1&status=active`
- **Output Response (200 OK)**:
  ```json
  {
    "success": true,
    "message": "Daftar penempatan kerja berhasil diambil.",
    "data": [
      {
        "id": 1,
        "employee_id": 1,
        "employee_name": "Budi Santoso",
        "client_id": 1,
        "client_name": "PT. Nusantara Graha Pratama",
        "site_id": 1,
        "site_name": "Nusantara Tower Sudirman",
        "service_id": 1,
        "service_name": "Security & Guard Services",
        "shift": "pagi",
        "start_date": "2026-02-01",
        "end_date": "2027-01-31",
        "status": "active"
      }
    ]
  }
  ```

### 9.2 Create Placement
- **Endpoint**: `POST /api/v1/placements`
- **Request Body (JSON)**:
  ```json
  {
    "employee_id": 151,
    "client_id": 1,
    "site_id": 1,
    "service_id": 1,
    "shift": "pagi",
    "start_date": "2026-03-01",
    "end_date": "2027-02-28",
    "status": "active"
  }
  ```
- **Output Response (201 Created)**:
  ```json
  {
    "success": true,
    "message": "Penempatan kerja personil berhasil dicatat.",
    "data": {
      "id": 139,
      "employee_id": 151,
      "site_id": 1,
      "status": "active"
    }
  }
  ```

---

## 10. Modul 08: Attendance / Presensi (`/api/v1/attendance`)

### 10.1 Get Attendance Logs
- **Endpoint**: `GET /api/v1/attendance?date=2026-09-17&site_id=1`
- **Output Response (200 OK)**:
  ```json
  {
    "success": true,
    "message": "Data presensi harian berhasil diambil.",
    "data": [
      {
        "id": 1,
        "employee_id": 1,
        "employee_name": "Budi Santoso",
        "site_name": "Nusantara Tower Sudirman",
        "attendance_date": "2026-09-17",
        "clock_in": "07:50:00",
        "clock_out": "17:05:00",
        "status": "present",
        "notes": "Tepat waktu"
      }
    ]
  }
  ```

### 10.2 Clock In Presensi
- **Endpoint**: `POST /api/v1/attendance`
- **Request Body (JSON)**:
  ```json
  {
    "employee_id": 1,
    "site_id": 1,
    "attendance_date": "2026-09-17",
    "clock_in": "07:55:00",
    "status": "present",
    "notes": "Shift pagi"
  }
  ```
- **Output Response (201 Created)**:
  ```json
  {
    "success": true,
    "message": "Presensi berhasil dicatat.",
    "data": {
      "id": 842,
      "employee_id": 1,
      "clock_in": "07:55:00",
      "status": "present"
    }
  }
  ```

### 10.3 Clock Out / Koreksi Status Presensi
- **Endpoint**: `PATCH /api/v1/attendance/842`
- **Request Body (JSON)**:
  ```json
  {
    "clock_out": "17:10:00",
    "notes": "Shift selesai normal"
  }
  ```
- **Output Response (200 OK)**:
  ```json
  {
    "success": true,
    "message": "Data presensi berhasil diperbarui."
  }
  ```

---

## 11. Modul 09: Invoices / Keuangan (`/api/v1/invoices`)
*Role Access*: Direktur, Finance (R/W); HRD, Marketing, Operasional (Read-only).

### 11.1 Get All Invoices
- **Endpoint**: `GET /api/v1/invoices?page=1&limit=10&status=issued`
- **Output Response (200 OK)**:
  ```json
  {
    "success": true,
    "message": "Daftar tagihan (invoices) berhasil diambil.",
    "data": [
      {
        "id": 1,
        "invoice_no": "INV-2026-09-001",
        "client_id": 1,
        "client_name": "PT. Nusantara Graha Pratama",
        "invoice_date": "2026-09-01",
        "due_date": "2026-10-01",
        "subtotal": 50000000,
        "tax": 5500000,
        "total": 55500000,
        "status": "issued"
      }
    ]
  }
  ```

### 11.2 Create Invoice
- **Endpoint**: `POST /api/v1/invoices`
- **Request Body (JSON)**:
  ```json
  {
    "client_id": 1,
    "invoice_no": "INV-2026-09-010",
    "invoice_date": "2026-09-17",
    "due_date": "2026-10-17",
    "subtotal": 45000000,
    "tax": 4950000,
    "total": 49950000,
    "status": "issued",
    "notes": "Tagihan outsourcing personil September 2026"
  }
  ```
- **Output Response (201 Created)**:
  ```json
  {
    "success": true,
    "message": "Tagihan baru berhasil diterbitkan.",
    "data": {
      "id": 35,
      "invoice_no": "INV-2026-09-010",
      "total": 49950000,
      "status": "issued"
    }
  }
  ```

### 11.3 Update Status Invoice (Pelunasan)
- **Endpoint**: `PATCH /api/v1/invoices/1`
- **Request Body (JSON)**:
  ```json
  {
    "status": "paid",
    "notes": "Lunas via transfer Bank Mandiri"
  }
  ```
- **Output Response (200 OK)**:
  ```json
  {
    "success": true,
    "message": "Status tagihan berhasil diperbarui.",
    "data": {
      "id": 1,
      "status": "paid"
    }
  }
  ```

---

## 12. Modul 10: Leads / CRM Marketing (`/api/v1/leads`)

### 12.1 Get All Leads
- **Endpoint**: `GET /api/v1/leads?status=new`
- **Output Response (200 OK)**:
  ```json
  {
    "success": true,
    "message": "Daftar prospek (leads) berhasil diambil.",
    "data": [
      {
        "id": 1,
        "company_name": "PT. Sentra Karya Prima",
        "contact_name": "Bpk. Hendra",
        "email": "hendra@sentrakarya.com",
        "phone": "0811998877",
        "estimated_value": 75000000,
        "status": "new",
        "source": "Website Landing Page"
      }
    ]
  }
  ```

### 12.2 Create Lead
- **Endpoint**: `POST /api/v1/leads`
- **Request Body (JSON)**:
  ```json
  {
    "company_name": "PT. Graha Mandiri Abadi",
    "contact_name": "Ibu Diana",
    "email": "diana@grahamandiri.com",
    "phone": "081233445566",
    "estimated_value": 120000000,
    "status": "new",
    "source": "Direct Contact",
    "notes": "Kebutuhan 20 personil security untuk gedung cabang baru"
  }
  ```
- **Output Response (201 Created)**:
  ```json
  {
    "success": true,
    "message": "Prospek baru berhasil dicatat.",
    "data": {
      "id": 18,
      "company_name": "PT. Graha Mandiri Abadi",
      "status": "new"
    }
  }
  ```

---

## 13. Modul 11: Activities & Audit Trail (`/api/v1/activities`)

### 13.1 Get Audit Log Activities
- **Endpoint**: `GET /api/v1/activities?page=1&limit=20`
- **Header**: `Authorization: Bearer <JWT_TOKEN>`
- **Output Response (200 OK)**:
  ```json
  {
    "success": true,
    "message": "Daftar log aktivitas berhasil diambil.",
    "data": [
      {
        "id": 105,
        "user_id": 1,
        "user_name": "Bhimasena Direktur",
        "role_name": "Direktur",
        "action": "CREATE",
        "resource": "users",
        "resource_id": 6,
        "created_at": "2026-09-17 21:50:00"
      }
    ],
    "meta": { "page": 1, "limit": 20, "total": 105, "totalPages": 6 }
  }
  ```

---

## 14. Modul 12: Notifications (`/api/v1/notifications`)

### 14.1 Get Notifications
- **Endpoint**: `GET /api/v1/notifications?is_read=false`
- **Output Response (200 OK)**:
  ```json
  {
    "success": true,
    "message": "Daftar notifikasi berhasil diambil.",
    "data": [
      {
        "id": 1,
        "title": "Lead Baru dari Website",
        "message": "PT. Graha Mandiri Abadi mengajukan formulir penawaran layanan.",
        "type": "lead_new",
        "is_read": false,
        "created_at": "2026-09-17 14:30:00"
      }
    ]
  }
  ```

### 14.2 Mark Notification as Read
- **Endpoint**: `PATCH /api/v1/notifications/1/read`
- **Output Response (200 OK)**:
  ```json
  {
    "success": true,
    "message": "Notifikasi ditandai sebagai sudah dibaca."
  }
  ```

---

## 15. Modul 13: Users & Roles Management (`/api/v1/users`) — *Direktur Only*

### 15.1 Get All Users
- **Endpoint**: `GET /api/v1/users`
- **Header**: `Authorization: Bearer <JWT_TOKEN_DIREKTUR>`
- **Output Response (200 OK)**:
  ```json
  {
    "success": true,
    "message": "Daftar pengguna berhasil diambil.",
    "data": [
      {
        "id": 1,
        "name": "Bhimasena Direktur",
        "email": "direktur@bimasenaadhirajasaradika.com",
        "avatar": "/assets/img/team/JustHidy3.jpeg",
        "avatar_url": "/assets/img/team/JustHidy3.jpeg",
        "is_active": 1,
        "role_id": 1,
        "role_code": "direktur",
        "role_name": "Direktur"
      },
      {
        "id": 2,
        "name": "Robyn Topani (HRD)",
        "email": "hrd@bimasenaadhirajasaradika.com",
        "avatar": "https://ui-avatars.com/api/?name=Robyn+Topani&background=0284c7&color=fff&size=128",
        "avatar_url": null,
        "is_active": 1,
        "role_id": 2,
        "role_code": "hrd",
        "role_name": "HRD"
      }
    ]
  }
  ```

### 15.2 Create New User (dengan Avatar Kustom)
- **Endpoint**: `POST /api/v1/users`
- **Header**: `Authorization: Bearer <JWT_TOKEN_DIREKTUR>`
- **Request Body (JSON)**:
  ```json
  {
    "name": "Hidayatullah",
    "email": "hidayatullah@bimasenaadhirajasaradika.com",
    "password": "password123",
    "role_id": 1,
    "avatar_url": "/assets/img/team/JustHidy3.jpeg",
    "is_active": true
  }
  ```
- **Output Response (201 Created)**:
  ```json
  {
    "success": true,
    "message": "Pengguna berhasil dibuat.",
    "data": {
      "id": 6,
      "name": "Hidayatullah",
      "email": "hidayatullah@bimasenaadhirajasaradika.com",
      "role_id": 1,
      "avatar_url": "/assets/img/team/JustHidy3.jpeg",
      "avatar": "/assets/img/team/JustHidy3.jpeg"
    }
  }
  ```

### 15.3 Update User / Update Avatar
- **Endpoint**: `PATCH /api/v1/users/6`
- **Header**: `Authorization: Bearer <JWT_TOKEN_DIREKTUR>`
- **Request Body (JSON)**:
  ```json
  {
    "avatar_url": "/assets/img/team/JustHidy3.jpeg",
    "is_active": true
  }
  ```
- **Output Response (200 OK)**:
  ```json
  {
    "success": true,
    "message": "Data pengguna berhasil diperbarui.",
    "data": {
      "id": 6,
      "name": "Hidayatullah",
      "avatar_url": "/assets/img/team/JustHidy3.jpeg"
    }
  }
  ```

### 15.4 Delete / Deactivate User
- **Endpoint**: `DELETE /api/v1/users/6`
- **Header**: `Authorization: Bearer <JWT_TOKEN_DIREKTUR>`
- **Output Response (200 OK)**:
  ```json
  {
    "success": true,
    "message": "Pengguna berhasil dinonaktifkan."
  }
  ```

---

## 16. Modul 14: Public Endpoints (`/api/v1/public`) — *Tanpa Autentikasi*

### 16.1 Get Public Services List
- **Endpoint**: `GET /api/v1/public/services`
- **Auth**: Publik (*Tanpa Token*)
- **Output Response (200 OK)**:
  ```json
  {
    "success": true,
    "message": "Daftar layanan publik berhasil diambil.",
    "data": [
      {
        "id": 1,
        "code": "SEC",
        "name": "Security & Guard Services",
        "description": "Pengamanan fisik 24/7 bersertifikasi Gada Pratama."
      }
    ]
  }
  ```

### 16.2 Submit Public Lead / Contact Form
- **Endpoint**: `POST /api/v1/public/lead`
- **Auth**: Publik (*Tanpa Token*)
- **Request Body (JSON)**:
  ```json
  {
    "company_name": "PT. Mitra Sejahtera Bersama",
    "contact_name": "Ibu Ratna Dewi",
    "email": "ratna@mitrasejahtera.co.id",
    "phone": "081122334455",
    "service_interest": "Security & Guard Services",
    "message": "Mohon informasi penawaran pengadaan personil keamanan untuk kantor kami di Jakarta."
  }
  ```
- **Output Response (201 Created)**:
  ```json
  {
    "success": true,
    "message": "Terima kasih! Pesan dan permohonan penawaran Anda telah kami terima.",
    "data": {
      "lead_id": 19,
      "company_name": "PT. Mitra Sejahtera Bersama",
      "status": "new"
    }
  }
  ```
