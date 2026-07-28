-- =============================================================
-- KAGUM (Kumpulan Administrasi Guru Madrasah)
-- MySQL Database Schema & Initial Seed Data
-- Standard Kurikulum Merdeka & EMIS Compatible Schema
-- =============================================================
-- CATATAN CPANEL HOSTING:
-- Di cPanel, buat database terlebih dahulu via menu "MySQL Databases" 
-- (misal: minp1908_kagum), lalu buka database tersebut di phpMyAdmin 
-- dan jalankan query di bawah ini.
-- =============================================================

-- 1. Table Users
CREATE TABLE IF NOT EXISTS users (
    id VARCHAR(50) PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    nip VARCHAR(30) DEFAULT '',
    kelas VARCHAR(20) DEFAULT '',
    email VARCHAR(100) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL,
    role ENUM('admin', 'guru') NOT NULL DEFAULT 'guru',
    avatar_url TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 2. Table School Profile
CREATE TABLE IF NOT EXISTS school_profile (
    id INT PRIMARY KEY AUTO_INCREMENT,
    nama_madrasah VARCHAR(150) NOT NULL,
    alamat_madrasah TEXT NOT NULL,
    nama_kepala VARCHAR(100) NOT NULL,
    nip_kepala VARCHAR(30) NOT NULL,
    tahun_ajaran VARCHAR(20) NOT NULL,
    semester ENUM('Ganjil', 'Genap') NOT NULL DEFAULT 'Ganjil',
    logo_url LONGTEXT,
    kop_line1 VARCHAR(150),
    kop_line2 VARCHAR(150),
    kop_line3 VARCHAR(150),
    kop_line4 TEXT,
    kop_line5 TEXT,
    kop_line6 TEXT,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 3. Table Students
CREATE TABLE IF NOT EXISTS students (
    id VARCHAR(50) PRIMARY KEY,
    nisn VARCHAR(20) NOT NULL UNIQUE,
    name VARCHAR(100) NOT NULL,
    birth_place VARCHAR(50),
    birth_date DATE,
    address TEXT,
    father_name VARCHAR(100),
    mother_name VARCHAR(100),
    parent_wa VARCHAR(30),
    kelas VARCHAR(20) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 4. Table Subjects
CREATE TABLE IF NOT EXISTS subjects (
    id VARCHAR(50) PRIMARY KEY,
    code VARCHAR(20) NOT NULL UNIQUE,
    name VARCHAR(100) NOT NULL,
    lingkup_materi_count INT DEFAULT 3,
    sumatif_weight INT DEFAULT 60,
    sas_weight INT DEFAULT 40,
    kktp INT DEFAULT 75
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 5. Table Grade Records (Daftar Nilai Asesmen)
CREATE TABLE IF NOT EXISTS grade_records (
    id VARCHAR(100) PRIMARY KEY,
    student_id VARCHAR(50) NOT NULL,
    subject_code VARCHAR(20) NOT NULL,
    category VARCHAR(30),
    type ENUM('formatif', 'sumatif', 'sas') NOT NULL,
    lm_number INT DEFAULT NULL,
    tp_number INT DEFAULT NULL,
    ah_number INT DEFAULT NULL,
    score DECIMAL(5,2) NOT NULL DEFAULT 0.00,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 6. Table Student Attendance
CREATE TABLE IF NOT EXISTS student_attendance (
    id VARCHAR(100) PRIMARY KEY,
    student_id VARCHAR(50) NOT NULL,
    date DATE NOT NULL,
    status ENUM('Hadir', 'Sakit', 'Izin', 'Alfa') NOT NULL DEFAULT 'Hadir',
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 7. Table Teaching Journal
CREATE TABLE IF NOT EXISTS teaching_journals (
    id VARCHAR(50) PRIMARY KEY,
    date DATE NOT NULL,
    time_slot VARCHAR(50) NOT NULL,
    subject_code VARCHAR(20) NOT NULL,
    material TEXT,
    topic TEXT,
    student_attendance_info TEXT,
    notes TEXT,
    kelas VARCHAR(20) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Initial Seed Data
INSERT INTO users (id, name, nip, kelas, email, password, role) VALUES
('usr-1', 'Bapak Admin', '198001012005011001', 'Admin', 'admin@min1purbalingga.sch.id', 'admin123', 'admin'),
('usr-2', 'Siti Aminah, S.Pd.I.', '198803122011012003', 'Kelas 1A', 'guru.siti@min1purbalingga.sch.id', 'guru123', 'guru')
ON DUPLICATE KEY UPDATE name=VALUES(name);

INSERT INTO school_profile (id, nama_madrasah, alamat_madrasah, nama_kepala, nip_kepala, tahun_ajaran, semester, kop_line1, kop_line2, kop_line3, kop_line4, kop_line5) VALUES
(1, 'MADRASAH IBTIDAIYAH NEGERI 1 PURBALINGGA', 'Jalan Raya Krangean RT 01 RW 01 Kec. Kertanegara Kab. Purbalingga Prov. Jawa Tengah', 'Bapak Suwarto, S.Pd.I., M.Pd.', '197505102000031002', '2026/2027', 'Ganjil', 'KEMENTERIAN AGAMA REPUBLIK INDONESIA', 'KANTOR KEMENTERIAN AGAMA KABUPATEN PURBALINGGA', 'MADRASAH IBTIDAIYAH NEGERI 1 PURBALINGGA', 'Jalan Raya Krangean RT 01 RW 01 Kec. Kertanegara Kab. Purbalingga', 'Email: minsaga@madrasah.id | Telepon: (0281) 7700977')
ON DUPLICATE KEY UPDATE nama_madrasah=VALUES(nama_madrasah);
