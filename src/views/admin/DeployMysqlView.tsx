import React, { useState } from 'react';
import { Database, Download, CheckCircle2, Server, Terminal, ShieldCheck, Copy, Check } from 'lucide-react';

export const DeployMysqlView: React.FC = () => {
  const [copied, setCopied] = useState(false);

  const envSnippet = `MYSQL_HOST=localhost
MYSQL_USER=user_hosting
MYSQL_PASSWORD=password_db
MYSQL_DATABASE=kagum_db
MYSQL_PORT=3306`;

  const handleCopyEnv = () => {
    navigator.clipboard.writeText(envSnippet);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handleDownloadSql = () => {
    const sqlContent = `-- ==========================================
-- SKEMA DATABASE MYSQL - KAGUM (v3.6)
-- Kumpulan Administrasi Guru Madrasah
-- ==========================================

-- Tabel Profil Madrasah
CREATE TABLE IF NOT EXISTS school_profile (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nama_madrasah VARCHAR(255) NOT NULL,
    alamat_madrasah TEXT,
    nama_kepala VARCHAR(255),
    nip_kepala VARCHAR(50),
    tahun_ajaran VARCHAR(20),
    semester ENUM('Ganjil', 'Genap') DEFAULT 'Ganjil',
    line1 VARCHAR(255), line2 VARCHAR(255), line3 VARCHAR(255),
    line4 VARCHAR(255), line5 VARCHAR(255),
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Tabel Pengguna (Admin & Guru)
CREATE TABLE IF NOT EXISTS users (
    id VARCHAR(50) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    nip VARCHAR(50) UNIQUE,
    kelas VARCHAR(100),
    email VARCHAR(255) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    role ENUM('admin', 'guru') NOT NULL DEFAULT 'guru',
    gender ENUM('Laki-laki', 'Perempuan'),
    birth_place VARCHAR(100),
    birth_date DATE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabel Siswa
CREATE TABLE IF NOT EXISTS students (
    id VARCHAR(50) PRIMARY KEY,
    nisn VARCHAR(20) UNIQUE,
    name VARCHAR(255) NOT NULL,
    birth_place VARCHAR(100),
    birth_date DATE,
    address TEXT,
    father_name VARCHAR(255),
    mother_name VARCHAR(255),
    parent_wa VARCHAR(20),
    kelas VARCHAR(100) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabel Mata Pelajaran
CREATE TABLE IF NOT EXISTS subjects (
    id VARCHAR(50) PRIMARY KEY,
    code VARCHAR(20) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    lingkup_materi_count INT DEFAULT 4,
    sumatif_weight INT DEFAULT 50,
    sas_weight INT DEFAULT 50,
    kktp INT DEFAULT 75
);

-- Insert Data Awal Demo User
INSERT INTO users (id, name, nip, kelas, email, password, role)
VALUES 
('usr-1', 'Bapak Admin', '198001012005011001', 'Admin', 'admin@madrasah.id', 'admin123', 'admin'),
('usr-2', 'Sulis, S.Pd.I', '198805122015032002', 'Kelas 1A', 'sulis@madrasah.id', 'guru123', 'guru')
ON DUPLICATE KEY UPDATE name=VALUES(name);
`;

    const blob = new Blob([sqlContent], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'mysql-schema-kagum.sql';
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs">
        <div className="flex flex-wrap items-center justify-between pb-4 border-b border-slate-100 gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-teal-50 text-teal-700 flex items-center justify-center font-bold">
              <Database className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-800">Panduan Deploy Hosting & MySQL Database</h2>
              <p className="text-xs text-slate-500">
                Dokumentasi dan instruksi menghubungkan aplikasi KAGUM ke database MySQL/MariaDB pada cPanel atau VPS
              </p>
            </div>
          </div>

          <button
            onClick={handleDownloadSql}
            className="flex items-center gap-2 px-4 py-2.5 bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs rounded-xl shadow-xs transition-colors cursor-pointer"
          >
            <Download className="w-4 h-4" />
            Unduh File SQL (mysql-schema.sql)
          </button>
        </div>

        {/* Content Details */}
        <div className="mt-6 space-y-6 text-xs text-slate-700">
          <div className="p-4 bg-teal-50 border border-teal-200 rounded-2xl flex items-start gap-3">
            <ShieldCheck className="w-5 h-5 text-teal-600 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <p className="font-bold text-teal-900 text-sm">✅ File Skema MySQL Siap Digunakan!</p>
              <p className="text-teal-800 leading-relaxed">
                Aplikasi telah menyediakan skema database MySQL lengkap di lokasi file <code className="bg-teal-100 text-teal-900 px-1.5 py-0.5 rounded font-mono font-bold">/src/db/mysql-schema.sql</code>. Anda dapat langsung mengunduh atau mengekspor skema ini ke phpMyAdmin pada cPanel hosting madrasah Anda.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Steps Column */}
            <div className="space-y-4 bg-slate-50 border border-slate-200 p-5 rounded-2xl">
              <h3 className="font-extrabold text-slate-900 text-sm flex items-center gap-2">
                <Server className="w-4 h-4 text-indigo-600" />
                Langkah Deploy ke Hosting (cPanel / VPS)
              </h3>
              <ol className="list-decimal list-inside space-y-3 text-slate-600 leading-relaxed">
                <li className="pl-1">
                  <strong className="text-slate-800">Buat Database MySQL Baru:</strong> Buka cPanel atau PhpMyAdmin di hosting Anda, buat database baru (misal: <code className="text-teal-700 font-bold font-mono">kagum_db</code>).
                </li>
                <li className="pl-1">
                  <strong className="text-slate-800">Import File SQL Schema:</strong> Klik menu <em>Import</em> di phpMyAdmin dan upload file <code className="text-teal-700 font-bold font-mono">mysql-schema.sql</code>.
                </li>
                <li className="pl-1">
                  <strong className="text-slate-800">Atur Hak Akses User DB:</strong> Buat User MySQL di cPanel (misal: <code className="text-teal-700 font-mono">user_kagum</code>) dan berikan hak akses ALL PRIVILEGES ke database.
                </li>
                <li className="pl-1">
                  <strong className="text-slate-800">Upload Source Code Node.js / React:</strong> Jalankan <code className="text-indigo-700 font-mono">npm run build</code> dan upload folder ke server web / Node App Manager hosting.
                </li>
              </ol>
            </div>

            {/* Config Env Column */}
            <div className="space-y-4 bg-slate-900 text-white p-5 rounded-2xl border border-slate-800">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <h3 className="font-extrabold text-amber-400 text-sm flex items-center gap-2">
                  <Terminal className="w-4 h-4 text-amber-400" />
                  Variabel Lingkungan (.env)
                </h3>
                <button
                  onClick={handleCopyEnv}
                  className="flex items-center gap-1.5 px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 text-[11px] font-bold rounded-lg transition-colors cursor-pointer"
                >
                  {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  {copied ? 'Tersalin' : 'Salin .env'}
                </button>
              </div>

              <p className="text-slate-400 text-[11px]">
                Tambahkan baris berikut pada konfigurasi `.env` pada server hosting Anda:
              </p>

              <pre className="p-3 bg-slate-950 text-amber-300 rounded-xl font-mono text-[11px] leading-relaxed border border-slate-800 overflow-x-auto">
                {envSnippet}
              </pre>

              <div className="p-3 bg-slate-800/80 rounded-xl border border-slate-700/60 text-[11px] text-slate-300 space-y-1">
                <p className="font-bold text-white">Status Koneksi Database Client:</p>
                <p className="text-emerald-400 font-medium">✓ Mode Browser Client-Side Active (Offline Store / Sync Mode Ready)</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
