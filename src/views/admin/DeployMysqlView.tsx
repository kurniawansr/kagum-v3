import React, { useState, useEffect } from 'react';
import {
  Database,
  Download,
  Server,
  Terminal,
  ShieldCheck,
  Copy,
  Check,
  RefreshCw,
  AlertTriangle,
  CheckCircle2,
  CloudUpload,
  KeyRound,
  HardDrive,
  Globe,
  ExternalLink,
  Info,
  HelpCircle,
  SlidersHorizontal,
  ChevronRight,
  ShieldAlert
} from 'lucide-react';
import { ApiService, SyncResponse, getCustomCpanelUrl, setCustomCpanelUrl, isPreviewEnvironment } from '../../services/api';
import { useApp } from '../../context/AppContext';

export const DeployMysqlView: React.FC = () => {
  const {
    schoolProfile,
    users,
    students,
    subjects,
    schedules,
    timeAllocations,
    calendarEvents,
    attendanceRecords,
    teachingJournals,
    habitRecords,
    gradeRecords,
    remedialRecords,
    studentTasks,
    dansosRecords,
    syahriyahJQRecords,
    paymentCategories,
    paymentInstallments,
    donationCategories,
    donationPayments,
    assessmentAnalyses
  } = useApp();

  const [copied, setCopied] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<SyncResponse | null>(null);
  const [syncing, setSyncing] = useState(false);
  const [syncMessage, setSyncMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // cPanel URL Configuration
  const [cpanelUrlInput, setCpanelUrlInput] = useState(() => getCustomCpanelUrl());
  const [activeTab, setActiveTab] = useState<'diagnosis' | 'guide' | 'credentials'>('diagnosis');

  // Custom DB credentials tester
  const [dbHost, setDbHost] = useState('localhost');
  const [dbName, setDbName] = useState('minp1908_kagum');
  const [dbUser, setDbUser] = useState('minp1908_kagum');
  const [dbPass, setDbPass] = useState('Adm1n456');
  const [showPass, setShowPass] = useState(false);

  const checkDbConnection = async (overrideUrl?: string, customCreds?: { host?: string; db?: string; user?: string; pass?: string }) => {
    setTesting(true);
    setSyncMessage(null);
    try {
      const result = await ApiService.testConnection(overrideUrl, customCreds);
      setTestResult(result);
    } catch (err: any) {
      setTestResult({
        status: 'error',
        code: 'UNKNOWN_ERROR',
        message: 'Gagal mengecek koneksi ke api.php',
        detail: err?.message
      });
    } finally {
      setTesting(false);
    }
  };

  useEffect(() => {
    checkDbConnection();
  }, []);

  const handleSaveCpanelUrl = () => {
    const trimmed = cpanelUrlInput.trim();
    setCustomCpanelUrl(trimmed);
    checkDbConnection(trimmed);
  };

  const handleResetCpanelUrl = () => {
    setCpanelUrlInput('');
    setCustomCpanelUrl('');
    checkDbConnection('');
  };

  const handleTestCustomCredentials = () => {
    checkDbConnection(undefined, {
      host: dbHost,
      db: dbName,
      user: dbUser,
      pass: dbPass
    });
  };

  const handlePushAllDataToMysql = async () => {
    setSyncing(true);
    setSyncMessage(null);

    const fullAppState = {
      kagum_schoolProfile: schoolProfile,
      kagum_users: users,
      kagum_students: students,
      kagum_subjects: subjects,
      kagum_schedules: schedules,
      kagum_timeAllocations: timeAllocations,
      kagum_calendarEvents: calendarEvents,
      kagum_attendance: attendanceRecords,
      kagum_journals: teachingJournals,
      kagum_habits: habitRecords,
      kagum_grades: gradeRecords,
      kagum_remedials: remedialRecords,
      kagum_tasks: studentTasks,
      kagum_dansos: dansosRecords,
      kagum_syahriyahJQ: syahriyahJQRecords,
      kagum_paymentCategories: paymentCategories,
      kagum_paymentInstallments: paymentInstallments,
      kagum_donationCategories: donationCategories,
      kagum_donationPayments: donationPayments,
      kagum_assessmentAnalyses: assessmentAnalyses
    };

    try {
      const response = await ApiService.pushLocalDataToMysql(fullAppState);
      if (response.status === 'success') {
        setSyncMessage({
          type: 'success',
          text: 'Berhasil mengunggah dan menyinkronkan seluruh data aplikasi (termasuk User/Admin baru) ke Database MySQL cPanel!'
        });
        checkDbConnection();
      } else {
        setSyncMessage({
          type: 'error',
          text: `Gagal sinkronisasi: ${response.message || 'Terjadi kesalahan pada server.'}`
        });
      }
    } catch (err: any) {
      setSyncMessage({
        type: 'error',
        text: `Terjadi kesalahan jaringan: ${err?.message || 'Server error'}`
      });
    } finally {
      setSyncing(false);
    }
  };

  const sampleApiPhpSnippet = `<?php
// Konfigurasi Database MySQL cPanel di public_html/api.php
$db_host = '${dbHost}';
$db_name = '${dbName}';
$db_user = '${dbUser}';
$db_pass = '${dbPass}';
?>`;

  const handleCopyPhpSnippet = () => {
    navigator.clipboard.writeText(sampleApiPhpSnippet);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const currentApiTarget = ApiService.getApiBaseUrl();
  const isPreview = isPreviewEnvironment();
  const configuredRemoteUrl = getCustomCpanelUrl();

  const directTestUrl = configuredRemoteUrl
    ? (configuredRemoteUrl.endsWith('/api.php') ? `${configuredRemoteUrl}?action=test` : `${configuredRemoteUrl.replace(/\/+$/, '')}/api.php?action=test`)
    : '/api.php?action=test';

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs">
        <div className="flex flex-wrap items-center justify-between pb-4 border-b border-slate-100 gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-teal-50 text-teal-700 flex items-center justify-center font-bold">
              <Database className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold text-slate-800">Status & Diagnosis Database MySQL Hosting</h2>
                {isPreview && !configuredRemoteUrl && (
                  <span className="px-2 py-0.5 bg-amber-100 text-amber-800 text-[11px] font-bold rounded-md">
                    Mode Preview AI Studio
                  </span>
                )}
                {configuredRemoteUrl && (
                  <span className="px-2 py-0.5 bg-sky-100 text-sky-800 text-[11px] font-bold rounded-md flex items-center gap-1">
                    <Globe className="w-3 h-3" /> cPanel Remote
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500">
                Pemeriksaan koneksi server MySQL cPanel (`api.php`) dan panduan solusi jika status belum terhubung
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => checkDbConnection()}
              disabled={testing}
              className="flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white font-bold text-xs rounded-xl transition-colors cursor-pointer disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${testing ? 'animate-spin' : ''}`} />
              {testing ? 'Memeriksa...' : 'Tes Ulang Koneksi'}
            </button>
          </div>
        </div>

        {/* Diagnostic Status Result */}
        <div className="mt-6">
          {testing ? (
            <div className="p-6 bg-slate-50 border border-slate-200 rounded-2xl flex items-center justify-center gap-3 text-slate-600 text-xs">
              <RefreshCw className="w-5 h-5 animate-spin text-teal-600" />
              <span>Menghubungi endpoint api.php ({currentApiTarget}) untuk verifikasi database...</span>
            </div>
          ) : testResult?.status === 'success' && testResult.connected ? (
            <div className="p-6 bg-emerald-50/90 border border-emerald-300 rounded-2xl space-y-4">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="flex items-start gap-3">
                  <CheckCircle2 className="w-6 h-6 text-emerald-600 shrink-0 mt-0.5" />
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <h3 className="text-sm font-extrabold text-emerald-950">
                        TERHUBUNG KE DATABASE MYSQL cPANEL!
                      </h3>
                      <span className="px-2 py-0.5 bg-emerald-200 text-emerald-800 rounded text-[10px] uppercase font-bold">
                        Online Sync Active
                      </span>
                      {testResult.php_version && (
                        <span className="px-2 py-0.5 bg-teal-100 text-teal-900 rounded text-[10px] font-mono font-bold">
                          PHP {testResult.php_version}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-emerald-800">
                      Koneksi ke database <code className="font-mono font-bold bg-emerald-100 px-1.5 py-0.5 rounded text-emerald-950">{testResult.db_name}</code> (Host: {testResult.db_host || 'localhost'}) berjalan lancar. Driver: <span className="font-mono">{testResult.driver || 'PDO'}</span>.
                    </p>
                    <p className="text-[11px] text-emerald-700">
                      Tersimpan: <strong>{testResult.total_keys_stored || 0}</strong> kategori data di MySQL.
                    </p>
                  </div>
                </div>

                <button
                  onClick={handlePushAllDataToMysql}
                  disabled={syncing}
                  className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-extrabold text-xs rounded-xl shadow-md transition-all cursor-pointer flex items-center gap-2 shrink-0"
                >
                  <CloudUpload className={`w-4 h-4 ${syncing ? 'animate-bounce' : ''}`} />
                  {syncing ? 'Menyinkronkan...' : 'Upload & Sinkron Data Lokal ke MySQL'}
                </button>
              </div>

              {syncMessage && (
                <div className={`p-3 rounded-xl text-xs font-bold ${syncMessage.type === 'success' ? 'bg-emerald-200 text-emerald-900 border border-emerald-300' : 'bg-red-100 text-red-900 border border-red-200'}`}>
                  {syncMessage.text}
                </div>
              )}
            </div>
          ) : (
            <div className="p-6 bg-red-50/95 border border-red-200 rounded-2xl space-y-4">
              <div className="flex items-start gap-3">
                <AlertTriangle className="w-6 h-6 text-red-600 shrink-0 mt-0.5" />
                <div className="space-y-3 flex-1">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <h3 className="text-sm font-extrabold text-red-950">
                        {testResult?.code === 'PREVIEW_ENVIRONMENT'
                          ? 'ANDA MEMBUKA APLIKASI DI PREVIEW AI STUDIO (BUKAN DI cPANEL LANGSUNG)'
                          : testResult?.code === 'PHP_EXTENSION_MISSING'
                          ? 'EKSTENSI MYSQL BELUM DIAKTIFKAN DI PHP 8.1 / 8.2 cPANEL!'
                          : testResult?.code === 'DB_ACCESS_DENIED'
                          ? 'USER MYSQL BELUM DIBERI HAK AKSES KE DATABASE (ALL PRIVILEGES)!'
                          : testResult?.code === 'DB_NOT_FOUND'
                          ? 'NAMA DATABASE BELUM DIBUAT DI cPANEL!'
                          : 'DATABASE MYSQL BELUM TERHUBUNG / SALAH KONFIGURASI!'}
                      </h3>
                      <span className="px-2 py-0.5 bg-red-200 text-red-900 font-bold rounded text-[10px]">
                        {testResult?.code || 'STATUS_OFFLINE'}
                      </span>
                    </div>

                    <a
                      href={directTestUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 text-[11px] font-bold text-red-700 hover:text-red-900 bg-red-100 hover:bg-red-200 px-2.5 py-1 rounded-lg transition-colors"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                      Uji Langsung api.php di Tab Baru
                    </a>
                  </div>

                  {/* Penjelasan Khusus untuk Kasus "Sudah diubah ke PHP 8.1/8.2 namun masih belum terhubung" */}
                  <div className="p-3.5 bg-white/90 border border-red-200 rounded-xl text-xs space-y-2 text-slate-800">
                    <div className="font-bold text-red-900 flex items-center gap-2">
                      <Info className="w-4 h-4 text-red-600 shrink-0" />
                      Kenapa status masih belum terhubung setelah mengubah ke PHP 8.1 / 8.2?
                    </div>

                    {testResult?.code === 'PREVIEW_ENVIRONMENT' ? (
                      <div className="space-y-1.5 text-[11px] text-slate-700">
                        <p>
                          <strong>Penyebab Utama:</strong> Anda saat ini sedang mengakses link <strong>Preview AI Studio</strong> (Google Cloud), <em>bukan</em> alamat domain hosting cPanel Anda. Server Node.js di link preview ini tidak menjalankan PHP cPanel Anda, sehingga pengubahan PHP di cPanel tidak akan merubah status tombol tes di link preview ini secara otomatis.
                        </p>
                        <p className="text-emerald-800 font-semibold">
                          💡 <strong>Solusi Mudah:</strong> Masukkan alamat domain cPanel Anda (contoh: <code className="bg-slate-100 px-1 py-0.5 rounded font-mono">https://min1purbalingga.sch.id</code>) pada kotak <strong>"Hubungkan ke Domain cPanel Live"</strong> di bawah ini, lalu klik <strong>"Simpan & Tes Koneksi"</strong>.
                        </p>
                      </div>
                    ) : testResult?.code === 'PHP_EXTENSION_MISSING' || testResult?.code === 'DRIVER_NOT_FOUND' ? (
                      <div className="space-y-1.5 text-[11px] text-slate-700">
                        <p>
                          <strong>Penyebab:</strong> Ketika beralih ke PHP 8.1 atau 8.2 di cPanel (CloudLinux / Select PHP Version), ekstensi database <code>pdo_mysql</code> dan <code>mysqli</code> seringkali belum dicentang secara default.
                        </p>
                        <p className="text-emerald-800 font-semibold">
                          💡 <strong>Solusi:</strong> Di cPanel, buka menu <strong>"Select PHP Version"</strong> &rarr; klik tab <strong>"Extensions"</strong> &rarr; beri tanda centang pada <strong>pdo_mysql</strong>, <strong>mysqli</strong>, dan <strong>nd_pdo_mysql</strong>.
                        </p>
                      </div>
                    ) : testResult?.code === 'DB_ACCESS_DENIED' ? (
                      <div className="space-y-1.5 text-[11px] text-slate-700">
                        <p>
                          <strong>Penyebab:</strong> User MySQL di cPanel belum dihubungkan ke Database dengan Hak Akses Penuh, atau password database tidak cocok.
                        </p>
                        <p className="text-emerald-800 font-semibold">
                          💡 <strong>Solusi:</strong> Di cPanel &rarr; menu <strong>"MySQL Databases"</strong> &rarr; scroll ke bagian <strong>"Add User To Database"</strong> &rarr; pilih User <code className="bg-slate-100 px-1 py-0.5 rounded">minp1908_kagum</code> dan Database <code className="bg-slate-100 px-1 py-0.5 rounded">minp1908_kagum</code> &rarr; Klik <strong>Add</strong> &rarr; Centang <strong>"ALL PRIVILEGES"</strong> &rarr; Klik <strong>"Make Changes"</strong>.
                        </p>
                      </div>
                    ) : (
                      <p className="text-[11px] text-slate-700">
                        {testResult?.message || 'Server api.php belum merespons dengan status terhubung.'}
                      </p>
                    )}
                  </div>

                  {testResult?.detail && (
                    <div className="p-2.5 bg-red-100/90 border border-red-200 rounded-xl text-[11px] font-mono text-red-950 break-all">
                      <strong>Detail Server:</strong> {testResult.detail}
                    </div>
                  )}

                  {testResult?.hint && (
                    <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-[11px] text-amber-950">
                      <strong>Petunjuk Langkah Perbaikan:</strong> {testResult.hint}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Target cPanel URL Connector (Live Remote Connection) */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <Globe className="w-5 h-5 text-sky-600" />
            <div>
              <h3 className="text-sm font-bold text-slate-800">Hubungkan ke Domain cPanel Live (Remote Sync)</h3>
              <p className="text-xs text-slate-500">
                Hubungkan aplikasi preview ini langsung ke domain hosting cPanel Anda agar dapat menguji dan menyinkronkan data database secara live
              </p>
            </div>
          </div>

          <div className="text-xs text-slate-600 bg-slate-100 px-3 py-1.5 rounded-xl font-mono">
            Target API: <span className="font-bold text-slate-800">{currentApiTarget}</span>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <div className="flex-1 min-w-[280px]">
            <input
              type="url"
              value={cpanelUrlInput}
              onChange={(e) => setCpanelUrlInput(e.target.value)}
              placeholder="Contoh: https://min1purbalingga.sch.id (atau https://subdomain.domainanda.sch.id)"
              className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-sky-500 font-mono"
            />
          </div>

          <button
            onClick={handleSaveCpanelUrl}
            disabled={testing || !cpanelUrlInput.trim()}
            className="px-4 py-2.5 bg-sky-600 hover:bg-sky-700 disabled:opacity-50 text-white font-bold text-xs rounded-xl shadow-xs transition-colors cursor-pointer flex items-center gap-1.5"
          >
            <Check className="w-4 h-4" />
            Simpan & Tes Koneksi Live
          </button>

          {configuredRemoteUrl && (
            <button
              onClick={handleResetCpanelUrl}
              className="px-3.5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition-colors cursor-pointer"
            >
              Reset ke Lokal
            </button>
          )}
        </div>

        <p className="text-[11px] text-slate-500">
          💡 <strong>Info:</strong> Jika file <code className="bg-slate-100 px-1 rounded font-mono">api.php</code> sudah Anda upload ke hosting cPanel, masukkan URL website Anda di atas, maka tombol <strong>Tes Ulang Koneksi</strong> akan langsung menghubungi server hosting cPanel Anda secara remote.
        </p>
      </div>

      {/* Tabs Navigation */}
      <div className="flex border-b border-slate-200 gap-2">
        <button
          onClick={() => setActiveTab('diagnosis')}
          className={`px-4 py-2.5 text-xs font-bold border-b-2 transition-colors cursor-pointer flex items-center gap-2 ${activeTab === 'diagnosis' ? 'border-teal-600 text-teal-700 bg-teal-50/50 rounded-t-xl' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
        >
          <HelpCircle className="w-4 h-4" />
          4 Penyebab Belum Terhubung di PHP 8.1 / 8.2 & Solusinya
        </button>

        <button
          onClick={() => setActiveTab('credentials')}
          className={`px-4 py-2.5 text-xs font-bold border-b-2 transition-colors cursor-pointer flex items-center gap-2 ${activeTab === 'credentials' ? 'border-teal-600 text-teal-700 bg-teal-50/50 rounded-t-xl' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
        >
          <KeyRound className="w-4 h-4" />
          Cek & Sesuaikan Kredensial Database MySQL
        </button>

        <button
          onClick={() => setActiveTab('guide')}
          className={`px-4 py-2.5 text-xs font-bold border-b-2 transition-colors cursor-pointer flex items-center gap-2 ${activeTab === 'guide' ? 'border-teal-600 text-teal-700 bg-teal-50/50 rounded-t-xl' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
        >
          <Terminal className="w-4 h-4" />
          Langkah Deploy ke cPanel
        </button>
      </div>

      {/* TAB 1: 4 PENYEBAB & SOLUSI KHUSUS PHP 8.1 / 8.2 */}
      {activeTab === 'diagnosis' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Card 1 */}
          <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-3">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-amber-100 text-amber-800 font-bold flex items-center justify-center text-xs">
                1
              </div>
              <h4 className="text-xs font-bold text-slate-800">
                Memeriksa di Link Preview AI Studio vs Domain cPanel
              </h4>
            </div>
            <p className="text-[11px] text-slate-600 leading-relaxed">
              Saat Anda mengubah versi PHP ke 8.1 / 8.2 di cPanel, perubahan tersebut terjadi di server hosting sekolah Anda. Halaman yang sedang Anda buka ini berjalan di Google Cloud Preview (Node.js).
            </p>
            <div className="p-3 bg-amber-50/80 border border-amber-200 rounded-xl text-[11px] text-amber-900 space-y-1">
              <strong>Solusi:</strong>
              <div>1. Masukkan URL domain cPanel Anda pada form "Hubungkan ke Domain cPanel Live" di atas.</div>
              <div>2. Atau unduh ZIP rilis dan buka web melalui domain cPanel Anda langsung.</div>
            </div>
          </div>

          {/* Card 2 */}
          <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-3">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-teal-100 text-teal-800 font-bold flex items-center justify-center text-xs">
                2
              </div>
              <h4 className="text-xs font-bold text-slate-800">
                Ekstensi pdo_mysql & mysqli Belum Dicentang
              </h4>
            </div>
            <p className="text-[11px] text-slate-600 leading-relaxed">
              Di cPanel, ketika Anda mengganti versi PHP (misal dari 7.4 ke 8.1/8.2), set ekstensi PHP akan di-reset ke konfigurasi default. Terkadang ekstensi MySQL belum aktif.
            </p>
            <div className="p-3 bg-teal-50/80 border border-teal-200 rounded-xl text-[11px] text-teal-900 space-y-1">
              <strong>Solusi:</strong>
              <div>1. Masuk ke cPanel &rarr; menu <strong>Select PHP Version</strong>.</div>
              <div>2. Klik tab <strong>Extensions</strong>.</div>
              <div>3. Pastikan <strong>pdo_mysql</strong>, <strong>mysqli</strong>, dan <strong>nd_pdo_mysql</strong> tercentang.</div>
            </div>
          </div>

          {/* Card 3 */}
          <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-3">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-purple-100 text-purple-800 font-bold flex items-center justify-center text-xs">
                3
              </div>
              <h4 className="text-xs font-bold text-slate-800">
                User Belum Diberi "ALL PRIVILEGES" ke Database
              </h4>
            </div>
            <p className="text-[11px] text-slate-600 leading-relaxed">
              Membuat Database dan membuat User di cPanel adalah 2 hal terpisah. Anda wajib menghubungkan User ke Database di menu "Add User To Database".
            </p>
            <div className="p-3 bg-purple-50/80 border border-purple-200 rounded-xl text-[11px] text-purple-900 space-y-1">
              <strong>Solusi:</strong>
              <div>1. Di cPanel &rarr; <strong>MySQL Databases</strong>.</div>
              <div>2. Scroll ke bagian <strong>Add User To Database</strong>.</div>
              <div>3. Pilih User & Database &rarr; Klik <strong>Add</strong> &rarr; Centang <strong>ALL PRIVILEGES</strong> &rarr; <strong>Make Changes</strong>.</div>
            </div>
          </div>

          {/* Card 4 */}
          <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-3">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-rose-100 text-rose-800 font-bold flex items-center justify-center text-xs">
                4
              </div>
              <h4 className="text-xs font-bold text-slate-800">
                File api.php Belum Diupdate di cPanel
              </h4>
            </div>
            <p className="text-[11px] text-slate-600 leading-relaxed">
              File <code className="bg-slate-100 px-1 rounded font-mono">api.php</code> terbaru sudah dioptimasi khusus untuk PHP 8.1 dan 8.2 dengan auto-recovery port 3306 serta fallback MySQLi.
            </p>
            <div className="p-3 bg-rose-50/80 border border-rose-200 rounded-xl text-[11px] text-rose-900 space-y-1">
              <strong>Solusi:</strong>
              <div>1. Unduh paket <code className="font-bold">cpanel-siap-upload.zip</code> terbaru dari menu Update Aplikasi.</div>
              <div>2. Upload & ekstrak ke folder <code className="font-bold">public_html</code> di cPanel File Manager.</div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: CEK KREDENSIAL DATABASE */}
      {activeTab === 'credentials' && (
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-5">
          <div>
            <h3 className="text-sm font-bold text-slate-800">Uji & Sesuaikan Parameter Database MySQL</h3>
            <p className="text-xs text-slate-500">
              Jika nama database atau password di cPanel Anda berbeda dari default, Anda dapat menguji kredensial di sini
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <div>
              <label className="block text-[11px] font-bold text-slate-600 mb-1">Database Host</label>
              <input
                type="text"
                value={dbHost}
                onChange={(e) => setDbHost(e.target.value)}
                placeholder="localhost atau 127.0.0.1"
                className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs font-mono"
              />
              <span className="text-[10px] text-slate-400 mt-0.5 block">Default: localhost</span>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-600 mb-1">Nama Database</label>
              <input
                type="text"
                value={dbName}
                onChange={(e) => setDbName(e.target.value)}
                placeholder="minp1908_kagum"
                className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs font-mono"
              />
              <span className="text-[10px] text-slate-400 mt-0.5 block">Sesuai nama di cPanel</span>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-600 mb-1">User MySQL</label>
              <input
                type="text"
                value={dbUser}
                onChange={(e) => setDbUser(e.target.value)}
                placeholder="minp1908_kagum"
                className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs font-mono"
              />
              <span className="text-[10px] text-slate-400 mt-0.5 block">User yang dibuat di cPanel</span>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-600 mb-1">Password Database</label>
              <div className="relative">
                <input
                  type={showPass ? 'text' : 'password'}
                  value={dbPass}
                  onChange={(e) => setDbPass(e.target.value)}
                  placeholder="Adm1n456"
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs font-mono pr-12"
                />
                <button
                  type="button"
                  onClick={() => setShowPass(!showPass)}
                  className="absolute right-2.5 top-2 text-[10px] font-bold text-slate-500 hover:text-slate-700 cursor-pointer"
                >
                  {showPass ? 'Hide' : 'Show'}
                </button>
              </div>
              <span className="text-[10px] text-slate-400 mt-0.5 block">Password user MySQL</span>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
            <button
              onClick={handleTestCustomCredentials}
              disabled={testing}
              className="px-4 py-2 bg-teal-700 hover:bg-teal-800 disabled:opacity-50 text-white font-bold text-xs rounded-xl transition-colors cursor-pointer flex items-center gap-1.5"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${testing ? 'animate-spin' : ''}`} />
              Uji Kredensial Ini ke Server
            </button>

            <button
              onClick={handleCopyPhpSnippet}
              className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition-colors cursor-pointer flex items-center gap-1.5"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
              {copied ? 'Tersalin ke Clipboard!' : 'Salin Snippet PHP untuk api.php'}
            </button>
          </div>

          <div className="p-4 bg-slate-900 text-slate-100 rounded-xl font-mono text-xs overflow-x-auto">
            <div className="text-slate-400 text-[10px] mb-2">// Baris 45-50 di file public_html/api.php Anda:</div>
            <pre>{sampleApiPhpSnippet}</pre>
          </div>
        </div>
      )}

      {/* TAB 3: PANDUAN DEPLOY CPANEL */}
      {activeTab === 'guide' && (
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4">
          <h3 className="text-sm font-bold text-slate-800">Panduan Lengkap Setup MySQL cPanel</h3>

          <div className="space-y-3">
            <div className="flex items-start gap-3 p-3.5 bg-slate-50 rounded-xl border border-slate-200">
              <span className="w-6 h-6 rounded-full bg-slate-800 text-white text-xs font-bold flex items-center justify-center shrink-0">1</span>
              <div className="text-xs text-slate-700 space-y-1">
                <strong>Buat Database di cPanel:</strong> Masuk ke cPanel &rarr; <em>MySQL Databases</em> &rarr; buat database baru (misal: <code>minp1908_kagum</code>).
              </div>
            </div>

            <div className="flex items-start gap-3 p-3.5 bg-slate-50 rounded-xl border border-slate-200">
              <span className="w-6 h-6 rounded-full bg-slate-800 text-white text-xs font-bold flex items-center justify-center shrink-0">2</span>
              <div className="text-xs text-slate-700 space-y-1">
                <strong>Buat User MySQL:</strong> Di halaman yang sama, scroll ke <em>MySQL Users &rarr; Add New User</em>. Buat user <code>minp1908_kagum</code> dan password <code>Adm1n456</code>.
              </div>
            </div>

            <div className="flex items-start gap-3 p-3.5 bg-amber-50 rounded-xl border border-amber-200">
              <span className="w-6 h-6 rounded-full bg-amber-700 text-white text-xs font-bold flex items-center justify-center shrink-0">3</span>
              <div className="text-xs text-amber-900 space-y-1">
                <strong>Hubungkan User ke Database (PENTING):</strong> Scroll ke <em>Add User To Database</em> &rarr; pilih User dan Database &rarr; klik <strong>Add</strong> &rarr; centang <strong>ALL PRIVILEGES</strong> &rarr; klik <strong>Make Changes</strong>.
              </div>
            </div>

            <div className="flex items-start gap-3 p-3.5 bg-slate-50 rounded-xl border border-slate-200">
              <span className="w-6 h-6 rounded-full bg-slate-800 text-white text-xs font-bold flex items-center justify-center shrink-0">4</span>
              <div className="text-xs text-slate-700 space-y-1">
                <strong>Upload File Rilis:</strong> Upload file <code>cpanel-siap-upload.zip</code> ke folder <code>public_html</code> via cPanel File Manager, lalu klik kanan &rarr; <strong>Extract</strong>. Tabel database akan dibuat secara otomatis saat pertama kali dibuka!
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
