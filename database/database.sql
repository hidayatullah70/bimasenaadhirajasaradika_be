-- ==============================================================================
-- DATABASE SCHEMA & SEED DATA
-- PT. Bhimasena Adhirajasa Radhika (BARAK)
-- SOT Reference: sot/07. DATABASE-SPEC.md
-- Database Engine: MySQL 8.0+ / MariaDB 10.3+ compatible
-- Charset: utf8mb4 | Collation: utf8mb4_unicode_ci
-- ==============================================================================

CREATE DATABASE IF NOT EXISTS `barak_db`
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE `barak_db`;

-- ------------------------------------------------------------------------------
-- Safety Checks & Environment Settings
-- ------------------------------------------------------------------------------
SET FOREIGN_KEY_CHECKS = 0;
SET SQL_MODE = 'NO_AUTO_VALUE_ON_ZERO';
SET NAMES utf8mb4;

-- ------------------------------------------------------------------------------
-- Drop existing tables (in reverse dependency order)
-- ------------------------------------------------------------------------------
DROP TABLE IF EXISTS `notifications`;
DROP TABLE IF EXISTS `activities`;
DROP TABLE IF EXISTS `leads`;
DROP TABLE IF EXISTS `invoices`;
DROP TABLE IF EXISTS `attendance`;
DROP TABLE IF EXISTS `placements`;
DROP TABLE IF EXISTS `sites`;
DROP TABLE IF EXISTS `services`;
DROP TABLE IF EXISTS `employees`;
DROP TABLE IF EXISTS `clients`;
DROP TABLE IF EXISTS `users`;
DROP TABLE IF EXISTS `roles`;

-- ==============================================================================
-- 1. TABLE: roles (SOT Section 3)
-- ==============================================================================
CREATE TABLE `roles` (
    `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `code` VARCHAR(50) NOT NULL,
    `name` VARCHAR(100) NOT NULL,
    `created_at` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
    `updated_at` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    UNIQUE KEY `roles_code_unique` (`code`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Master user roles';

-- ==============================================================================
-- 2. TABLE: users (SOT Section 4)
-- ==============================================================================
CREATE TABLE `users` (
    `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `role_id` BIGINT UNSIGNED NOT NULL,
    `name` VARCHAR(150) NOT NULL,
    `email` VARCHAR(150) NOT NULL,
    `avatar_url` VARCHAR(500) NULL DEFAULT NULL,
    `password_hash` VARCHAR(255) NOT NULL,
    `is_active` BOOLEAN NOT NULL DEFAULT TRUE,
    `last_login_at` TIMESTAMP NULL DEFAULT NULL,
    `created_at` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
    `updated_at` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    UNIQUE KEY `users_email_unique` (`email`),
    KEY `users_role_id_index` (`role_id`),
    CONSTRAINT `fk_users_role_id` FOREIGN KEY (`role_id`) REFERENCES `roles` (`id`) ON UPDATE CASCADE ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='System users & credentials';

-- ==============================================================================
-- 3. TABLE: clients (SOT Section 6)
-- ==============================================================================
CREATE TABLE `clients` (
    `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `client_code` VARCHAR(50) NOT NULL,
    `name` VARCHAR(200) NOT NULL,
    `phone` VARCHAR(30) NULL DEFAULT NULL,
    `email` VARCHAR(150) NULL DEFAULT NULL,
    `address` TEXT NULL DEFAULT NULL,
    `status` VARCHAR(30) NOT NULL DEFAULT 'active' COMMENT 'active, inactive',
    `created_at` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
    `updated_at` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    UNIQUE KEY `clients_client_code_unique` (`client_code`),
    KEY `clients_status_index` (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Corporate clients';

-- ==============================================================================
-- 4. TABLE: employees (SOT Section 5)
-- ==============================================================================
CREATE TABLE `employees` (
    `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `employee_no` VARCHAR(50) NOT NULL,
    `name` VARCHAR(150) NOT NULL,
    `phone` VARCHAR(30) NULL DEFAULT NULL,
    `email` VARCHAR(150) NULL DEFAULT NULL,
    `employment_type` VARCHAR(30) NOT NULL COMMENT 'tetap, kontrak, harian_lepas',
    `status` VARCHAR(30) NOT NULL DEFAULT 'active' COMMENT 'active, inactive, terminated',
    `join_date` DATE NOT NULL,
    `end_date` DATE NULL DEFAULT NULL,
    `created_at` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
    `updated_at` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    UNIQUE KEY `employees_employee_no_unique` (`employee_no`),
    KEY `employees_status_index` (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Manpower and staff records';

-- ==============================================================================
-- 5. TABLE: services (SOT Section 8)
-- ==============================================================================
CREATE TABLE `services` (
    `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `code` VARCHAR(50) NOT NULL,
    `name` VARCHAR(150) NOT NULL,
    `description` TEXT NULL DEFAULT NULL,
    `is_active` BOOLEAN NOT NULL DEFAULT TRUE,
    `created_at` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
    `updated_at` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    UNIQUE KEY `services_code_unique` (`code`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Master business services';

-- ==============================================================================
-- 6. TABLE: sites (SOT Section 7)
-- ==============================================================================
CREATE TABLE `sites` (
    `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `client_id` BIGINT UNSIGNED NOT NULL,
    `site_code` VARCHAR(50) NOT NULL,
    `name` VARCHAR(200) NOT NULL,
    `address` TEXT NOT NULL,
    `status` VARCHAR(30) NOT NULL DEFAULT 'active' COMMENT 'active, inactive',
    `created_at` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
    `updated_at` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    UNIQUE KEY `sites_site_code_unique` (`site_code`),
    KEY `sites_client_id_index` (`client_id`),
    CONSTRAINT `fk_sites_client_id` FOREIGN KEY (`client_id`) REFERENCES `clients` (`id`) ON UPDATE CASCADE ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Client operational sites / locations';

-- ==============================================================================
-- 7. TABLE: placements (SOT Section 9)
-- ==============================================================================
CREATE TABLE `placements` (
    `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `employee_id` BIGINT UNSIGNED NOT NULL,
    `client_id` BIGINT UNSIGNED NOT NULL,
    `site_id` BIGINT UNSIGNED NOT NULL,
    `service_id` BIGINT UNSIGNED NOT NULL,
    `start_date` DATE NOT NULL,
    `end_date` DATE NULL DEFAULT NULL,
    `status` VARCHAR(30) NOT NULL DEFAULT 'planned' COMMENT 'planned, active, ended, cancelled',
    `notes` TEXT NULL DEFAULT NULL,
    `created_by` BIGINT UNSIGNED NOT NULL,
    `created_at` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
    `updated_at` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    KEY `placements_employee_id_index` (`employee_id`),
    KEY `placements_client_id_index` (`client_id`),
    KEY `placements_site_id_index` (`site_id`),
    KEY `placements_service_id_index` (`service_id`),
    KEY `placements_status_index` (`status`),
    KEY `placements_created_by_index` (`created_by`),
    CONSTRAINT `fk_placements_employee_id` FOREIGN KEY (`employee_id`) REFERENCES `employees` (`id`) ON UPDATE CASCADE ON DELETE RESTRICT,
    CONSTRAINT `fk_placements_client_id` FOREIGN KEY (`client_id`) REFERENCES `clients` (`id`) ON UPDATE CASCADE ON DELETE RESTRICT,
    CONSTRAINT `fk_placements_site_id` FOREIGN KEY (`site_id`) REFERENCES `sites` (`id`) ON UPDATE CASCADE ON DELETE RESTRICT,
    CONSTRAINT `fk_placements_service_id` FOREIGN KEY (`service_id`) REFERENCES `services` (`id`) ON UPDATE CASCADE ON DELETE RESTRICT,
    CONSTRAINT `fk_placements_created_by` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`) ON UPDATE CASCADE ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Operational manpower placements';

-- ==============================================================================
-- 8. TABLE: attendance (SOT Section 10)
-- ==============================================================================
CREATE TABLE `attendance` (
    `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `employee_id` BIGINT UNSIGNED NOT NULL,
    `placement_id` BIGINT UNSIGNED NOT NULL,
    `attendance_date` DATE NOT NULL,
    `status` VARCHAR(30) NOT NULL COMMENT 'present, absent, late, leave, sick, off',
    `check_in` DATETIME NULL DEFAULT NULL,
    `check_out` DATETIME NULL DEFAULT NULL,
    `notes` TEXT NULL DEFAULT NULL,
    `recorded_by` BIGINT UNSIGNED NOT NULL,
    `updated_by` BIGINT UNSIGNED NULL DEFAULT NULL,
    `created_at` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
    `updated_at` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    UNIQUE KEY `attendance_employee_placement_date_unique` (`employee_id`, `placement_id`, `attendance_date`),
    KEY `attendance_employee_id_index` (`employee_id`),
    KEY `attendance_placement_id_index` (`placement_id`),
    KEY `attendance_attendance_date_index` (`attendance_date`),
    KEY `attendance_recorded_by_index` (`recorded_by`),
    KEY `attendance_updated_by_index` (`updated_by`),
    CONSTRAINT `fk_attendance_employee_id` FOREIGN KEY (`employee_id`) REFERENCES `employees` (`id`) ON UPDATE CASCADE ON DELETE RESTRICT,
    CONSTRAINT `fk_attendance_placement_id` FOREIGN KEY (`placement_id`) REFERENCES `placements` (`id`) ON UPDATE CASCADE ON DELETE RESTRICT,
    CONSTRAINT `fk_attendance_recorded_by` FOREIGN KEY (`recorded_by`) REFERENCES `users` (`id`) ON UPDATE CASCADE ON DELETE RESTRICT,
    CONSTRAINT `fk_attendance_updated_by` FOREIGN KEY (`updated_by`) REFERENCES `users` (`id`) ON UPDATE CASCADE ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Daily attendance tracking';

-- ==============================================================================
-- 9. TABLE: invoices (SOT Section 11)
-- ==============================================================================
CREATE TABLE `invoices` (
    `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `client_id` BIGINT UNSIGNED NOT NULL,
    `invoice_no` VARCHAR(80) NOT NULL,
    `invoice_date` DATE NOT NULL,
    `due_date` DATE NOT NULL,
    `subtotal` DECIMAL(15,2) NOT NULL,
    `tax` DECIMAL(15,2) NOT NULL DEFAULT 0.00,
    `total` DECIMAL(15,2) NOT NULL,
    `status` VARCHAR(30) NOT NULL DEFAULT 'draft' COMMENT 'draft, issued, partially_paid, paid, overdue, cancelled',
    `notes` TEXT NULL DEFAULT NULL,
    `created_by` BIGINT UNSIGNED NOT NULL,
    `created_at` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
    `updated_at` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    UNIQUE KEY `invoices_invoice_no_unique` (`invoice_no`),
    KEY `invoices_client_id_index` (`client_id`),
    KEY `invoices_status_index` (`status`),
    KEY `invoices_created_by_index` (`created_by`),
    CONSTRAINT `fk_invoices_client_id` FOREIGN KEY (`client_id`) REFERENCES `clients` (`id`) ON UPDATE CASCADE ON DELETE RESTRICT,
    CONSTRAINT `fk_invoices_created_by` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`) ON UPDATE CASCADE ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Billing and invoice management';

-- ==============================================================================
-- 10. TABLE: leads (SOT Section 12)
-- ==============================================================================
CREATE TABLE `leads` (
    `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `company_name` VARCHAR(200) NOT NULL,
    `contact_name` VARCHAR(150) NOT NULL,
    `phone` VARCHAR(30) NULL DEFAULT NULL,
    `email` VARCHAR(150) NULL DEFAULT NULL,
    `source` VARCHAR(100) NOT NULL,
    `status` VARCHAR(30) NOT NULL DEFAULT 'new' COMMENT 'new, contacted, qualified, proposal, won, lost',
    `notes` TEXT NULL DEFAULT NULL,
    `assigned_to` BIGINT UNSIGNED NULL DEFAULT NULL,
    `created_at` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
    `updated_at` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    KEY `leads_status_index` (`status`),
    KEY `leads_assigned_to_index` (`assigned_to`),
    CONSTRAINT `fk_leads_assigned_to` FOREIGN KEY (`assigned_to`) REFERENCES `users` (`id`) ON UPDATE CASCADE ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Marketing CRM leads pipeline';

-- ==============================================================================
-- 11. TABLE: activities (SOT Section 13)
-- ==============================================================================
CREATE TABLE `activities` (
    `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `user_id` BIGINT UNSIGNED NULL DEFAULT NULL,
    `action` VARCHAR(100) NOT NULL,
    `resource` VARCHAR(100) NOT NULL,
    `resource_id` BIGINT UNSIGNED NULL DEFAULT NULL,
    `before_data` JSON NULL DEFAULT NULL,
    `after_data` JSON NULL DEFAULT NULL,
    `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    KEY `activities_user_id_index` (`user_id`),
    KEY `activities_created_at_index` (`created_at`),
    CONSTRAINT `fk_activities_user_id` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON UPDATE CASCADE ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Audit trail & activity log';

-- ==============================================================================
-- 12. TABLE: notifications (SOT Section 14)
-- ==============================================================================
CREATE TABLE `notifications` (
    `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `user_id` BIGINT UNSIGNED NOT NULL,
    `title` VARCHAR(200) NOT NULL,
    `message` TEXT NOT NULL,
    `type` VARCHAR(50) NOT NULL,
    `is_read` BOOLEAN NOT NULL DEFAULT FALSE,
    `created_at` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    KEY `notifications_user_id_index` (`user_id`),
    KEY `notifications_is_read_index` (`is_read`),
    CONSTRAINT `fk_notifications_user_id` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON UPDATE CASCADE ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='User notification inbox';

-- ------------------------------------------------------------------------------
-- Re-enable Foreign Key Checks
-- ------------------------------------------------------------------------------
SET FOREIGN_KEY_CHECKS = 1;


-- ==============================================================================
-- SEED DATA (SOT Section 8, 20 & Development Demo Data)
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- 1. Seed Roles (SOT Section 3 & 20)
-- ------------------------------------------------------------------------------
INSERT INTO `roles` (`id`, `code`, `name`) VALUES
(1, 'direktur', 'Direktur'),
(2, 'hrd', 'HRD'),
(3, 'finance', 'Finance'),
(4, 'marketing', 'Marketing'),
(5, 'operasional', 'Operasional')
ON DUPLICATE KEY UPDATE `name` = VALUES(`name`);

-- ------------------------------------------------------------------------------
-- 2. Seed Services (SOT Section 8 & 20)
-- ------------------------------------------------------------------------------
INSERT INTO `services` (`id`, `code`, `name`, `description`, `is_active`) VALUES
(1, 'security', 'Pengamanan / Security', 'Layanan pengamanan fisik, patroli aset, dan kontrol akses profesional.', TRUE),
(2, 'courier', 'Ekspedisi Kurir', 'Layanan kurir, logistik, pengantaran dokumen, dan distribusi paket.', TRUE),
(3, 'manpower', 'Man Power', 'Penyedia tenaga kerja terampil untuk berbagai lini industri dan perkantoran.', TRUE),
(4, 'cleaning', 'Cleaning Service', 'Layanan kebersihan dan sanitasi gedung, kantor, serta area komersial.', TRUE),
(5, 'parking', 'Parkir', 'Pengelolaan sistem parkir, petugas pos, dan manajemen lalu lintas area.', TRUE),
(6, 'loss_prevention', 'Loss Prevention', 'Pencegahan risiko kerugian aset, audit keamanan internal, dan investigasi.', TRUE)
ON DUPLICATE KEY UPDATE `name` = VALUES(`name`), `description` = VALUES(`description`);

-- ------------------------------------------------------------------------------
-- 3. Seed Users (Development Testing - Password Default: password)
-- Bcrypt Hash: $2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi
-- ------------------------------------------------------------------------------
INSERT INTO `users` (`id`, `role_id`, `name`, `email`, `password_hash`, `is_active`) VALUES
(1, 1, 'Hidayat (Direktur)', 'direktur@bhimasena.co.id', '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', TRUE),
(2, 2, 'Siti Rahma (HRD)', 'hrd@bhimasena.co.id', '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', TRUE),
(3, 3, 'Budi Santoso (Finance)', 'finance@bhimasena.co.id', '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', TRUE),
(4, 4, 'Dewi Lestari (Marketing)', 'marketing@bhimasena.co.id', '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', TRUE),
(5, 5, 'Agus Prasetyo (Operasional)', 'operasional@bhimasena.co.id', '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', TRUE)
ON DUPLICATE KEY UPDATE `name` = VALUES(`name`), `role_id` = VALUES(`role_id`);

-- ------------------------------------------------------------------------------
-- 4. Seed Clients (Sample Data)
-- ------------------------------------------------------------------------------
INSERT INTO `clients` (`id`, `client_code`, `name`, `phone`, `email`, `address`, `status`) VALUES
(1, 'CLI-001', 'PT. Telkom Indonesia Tbk', '021-5215123', 'procurement@telkom.co.id', 'Jl. Japati No. 1, Bandung', 'active'),
(2, 'CLI-002', 'PT. Bank Central Asia Tbk', '021-2358800', 'vendor@bca.co.id', 'Menara BCA, Jl. M.H. Thamrin No. 1, Jakarta Pusat', 'active'),
(3, 'CLI-003', 'PT. Astra International Tbk', '021-6522555', 'purchasing@astra.co.id', 'Menara Astra, Jl. Jend. Sudirman Kav 5-6, Jakarta', 'active')
ON DUPLICATE KEY UPDATE `name` = VALUES(`name`);

-- ------------------------------------------------------------------------------
-- 5. Seed Sites (Sample Data)
-- ------------------------------------------------------------------------------
INSERT INTO `sites` (`id`, `client_id`, `site_code`, `name`, `address`, `status`) VALUES
(1, 1, 'SITE-TLK-01', 'Telkom Landmark Tower', 'Jl. Gatot Subroto Kav. 52, Jakarta Selatan', 'active'),
(2, 1, 'SITE-TLK-02', 'Telkom Hub BSD', 'BSD Green Office Park, Tangerang', 'active'),
(3, 2, 'SITE-BCA-01', 'BCA Wisma Asia', 'Jl. Letjen S. Parman Kav. 79, Slipi, Jakarta Barat', 'active'),
(4, 3, 'SITE-AST-01', 'Astra Biz Center BSD', 'Jl. BSD Raya Utama, Pagedangan, Tangerang', 'active')
ON DUPLICATE KEY UPDATE `name` = VALUES(`name`);

-- ------------------------------------------------------------------------------
-- 6. Seed Employees (Sample Data)
-- ------------------------------------------------------------------------------
INSERT INTO `employees` (`id`, `employee_no`, `name`, `phone`, `email`, `employment_type`, `status`, `join_date`) VALUES
(1, 'EMP-2024-001', 'Bambang Pamungkas', '081234567801', 'bambang.p@gmail.com', 'kontrak', 'active', '2024-01-15'),
(2, 'EMP-2024-002', 'Joko Widodo', '081234567802', 'joko.w@gmail.com', 'kontrak', 'active', '2024-02-01'),
(3, 'EMP-2024-003', 'Rudi Hartono', '081234567803', 'rudi.h@gmail.com', 'tetap', 'active', '2023-11-10'),
(4, 'EMP-2024-004', 'Dedi Kusnandar', '081234567804', 'dedi.k@gmail.com', 'kontrak', 'active', '2024-03-01'),
(5, 'EMP-2024-005', 'Ahmad Dani', '081234567805', 'ahmad.d@gmail.com', 'harian_lepas', 'active', '2024-05-01')
ON DUPLICATE KEY UPDATE `name` = VALUES(`name`);

-- ------------------------------------------------------------------------------
-- 7. Seed Placements (Sample Operational Data)
-- ------------------------------------------------------------------------------
INSERT INTO `placements` (`id`, `employee_id`, `client_id`, `site_id`, `service_id`, `start_date`, `end_date`, `status`, `notes`, `created_by`) VALUES
(1, 1, 1, 1, 1, '2024-02-01', '2025-01-31', 'active', 'Regu Pengamanan Gedung Utama Shift Pagi', 5),
(2, 2, 1, 1, 4, '2024-02-01', '2025-01-31', 'active', 'Petugas Cleaning Service Lantai 1-5', 5),
(3, 3, 2, 3, 1, '2024-01-01', '2024-12-31', 'active', 'Leader Security Pos Barat Wisma Asia', 5),
(4, 4, 3, 4, 5, '2024-03-15', '2025-03-14', 'active', 'Operator Pos Parkir Masuk Gedung Utama', 5)
ON DUPLICATE KEY UPDATE `status` = VALUES(`status`);

-- ------------------------------------------------------------------------------
-- 8. Seed Attendance (Sample Attendance Records)
-- ------------------------------------------------------------------------------
INSERT INTO `attendance` (`id`, `employee_id`, `placement_id`, `attendance_date`, `status`, `check_in`, `check_out`, `notes`, `recorded_by`) VALUES
(1, 1, 1, CURDATE(), 'present', CONCAT(CURDATE(), ' 07:00:00'), CONCAT(CURDATE(), ' 15:30:00'), 'Hadir tepat waktu di Pos 1', 5),
(2, 2, 1, CURDATE(), 'present', CONCAT(CURDATE(), ' 06:45:00'), CONCAT(CURDATE(), ' 15:00:00'), 'Hadir tepat waktu di Lobi', 5),
(3, 3, 3, CURDATE(), 'late',    CONCAT(CURDATE(), ' 07:25:00'), CONCAT(CURDATE(), ' 16:00:00'), 'Terlambat 25 menit karena hujan deras', 5),
(4, 4, 4, CURDATE(), 'present', CONCAT(CURDATE(), ' 06:50:00'), CONCAT(CURDATE(), ' 15:00:00'), 'Shift pagi operasional lancar', 5)
ON DUPLICATE KEY UPDATE `status` = VALUES(`status`);

-- ------------------------------------------------------------------------------
-- 9. Seed Invoices (Sample Invoices)
-- ------------------------------------------------------------------------------
INSERT INTO `invoices` (`id`, `client_id`, `invoice_no`, `invoice_date`, `due_date`, `subtotal`, `tax`, `total`, `status`, `notes`, `created_by`) VALUES
(1, 1, 'INV/2026/02/001', '2026-02-01', '2026-02-28', 45000000.00, 4950000.00, 49950000.00, 'paid', 'Tagihan Jasa Security Periode Januari 2026', 3),
(2, 2, 'INV/2026/03/001', '2026-03-01', '2026-03-31', 60000000.00, 6600000.00, 6660000.00, 'issued', 'Tagihan Jasa Manpower & Security Periode Februari 2026', 3),
(3, 3, 'INV/2026/03/002', '2026-03-10', '2026-04-10', 35000000.00, 3850000.00, 3885000.00, 'draft', 'Draft tagihan pengelolaan parkir', 3)
ON DUPLICATE KEY UPDATE `total` = VALUES(`total`), `status` = VALUES(`status`);

-- ------------------------------------------------------------------------------
-- 10. Seed Leads (Sample CRM Data)
-- ------------------------------------------------------------------------------
INSERT INTO `leads` (`id`, `company_name`, `contact_name`, `phone`, `email`, `source`, `status`, `notes`, `assigned_to`) VALUES
(1, 'PT. Mayora Indah Tbk', 'Hendrik Gunawan', '081299887766', 'hgunawan@mayora.co.id', 'Website Landing Page', 'proposal', 'Kebutuhan 50 personel security dan cleaning service pabrik Tangerang.', 4),
(2, 'PT. Gudang Garam Tbk', 'Susilo Bambang', '081388776655', 'susilo.b@gudanggaram.co.id', 'Referral Client', 'contacted', 'Diskusi awal pengadaan ekspedisi kurir internal dokumen kantor.', 4),
(3, 'RS Siloam Hospital Lippo Village', 'dr. Anita Wijaya', '081122334455', 'anita.w@siloamhospitals.com', 'Cold Outreach', 'new', 'Eksplorasi layanan pengelolaan parkir dan loss prevention.', 4)
ON DUPLICATE KEY UPDATE `status` = VALUES(`status`);

-- ------------------------------------------------------------------------------
-- 11. Seed Activities (Sample Audit Trail)
-- ------------------------------------------------------------------------------
INSERT INTO `activities` (`id`, `user_id`, `action`, `resource`, `resource_id`, `before_data`, `after_data`, `created_at`) VALUES
(1, 1, 'CREATE', 'roles', 1, NULL, '{"code": "direktur", "name": "Direktur"}', NOW() - INTERVAL 10 DAY),
(2, 5, 'CREATE', 'placement', 1, NULL, '{"employee_id": 1, "client_id": 1, "site_id": 1, "status": "active"}', NOW() - INTERVAL 5 DAY),
(3, 3, 'UPDATE', 'invoice', 1, '{"status": "issued"}', '{"status": "paid"}', NOW() - INTERVAL 2 DAY)
ON DUPLICATE KEY UPDATE `action` = VALUES(`action`);

-- ------------------------------------------------------------------------------
-- 12. Seed Notifications (Sample User Notifications)
-- ------------------------------------------------------------------------------
INSERT INTO `notifications` (`id`, `user_id`, `title`, `message`, `type`, `is_read`, `created_at`) VALUES
(1, 1, 'Invoice Lunas', 'Invoice INV/2026/02/001 dari PT. Telkom Indonesia Tbk telah dilunasi.', 'finance', TRUE, NOW() - INTERVAL 2 DAY),
(2, 5, 'Penempatan Baru Aktif', 'Penempatan Bambang Pamungkas di Telkom Landmark Tower telah aktif.', 'placement', FALSE, NOW() - INTERVAL 1 DAY),
(3, 4, 'Lead Baru Masuk', 'Lead baru dari PT. Mayora Indah Tbk telah dialokasikan untuk follow-up.', 'lead', FALSE, NOW() - INTERVAL 3 HOUR),
(4, 2, 'Kandidat Baru', 'Data karyawan baru atas nama Ahmad Dani telah berhasil didaftarkan.', 'hrd', FALSE, NOW() - INTERVAL 1 HOUR)
ON DUPLICATE KEY UPDATE `title` = VALUES(`title`);

-- ==============================================================================
-- End of database.sql
-- ==============================================================================
