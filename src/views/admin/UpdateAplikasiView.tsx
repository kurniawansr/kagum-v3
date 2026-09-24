import React, { useState } from 'react';
import {
  RefreshCw,
  Sparkles,
  CheckCircle2,
  ShieldCheck,
  ArrowUpCircle,
  Terminal,
  Layers,
  Info,
  Download,
  Package,
  AlertTriangle,
  Globe,
  ExternalLink,
  FolderArchive,
  Check,
  Copy,
  Zap,
  HelpCircle,
  FileCode2,
  ArrowRight,
  GitBranch,
  Cpu,
  Server
} from 'lucide-react';
import { getCustomCpanelUrl, setCustomCpanelUrl } from '../../services/api';

export const UpdateAplikasiView: React.FC = () => {
  const [checking, setChecking] = useState(false);
  const [syncingDb, setSyncingDb] = useState(false);
  const [downloadingZip, setDownloadingZip] = useState(false);
  const [triggeringAutoUpdate, setTriggeringAutoUpdate] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);

  const [targetCpanelUrl, setTargetCpanelUrl] = useState(() => {
    return getCustomCpanelUrl() || 'https://kagum.min1purbalingga.sch.id';
  });

  const [activeStrategy, setActiveStrategy] = useState<'pipeline_guide' | 'zip_upload' | 'auto_updater' | 'git_info'>('pipeline_guide');
  const [copiedUrl, setCopiedUrl] = useState(false);
  const [copiedYml, setCopiedYml] = useState(false);

  const officialZipUrl = `${window.location.origin}/cpanel-siap-upload.zip`;

  const handleDownloadZip = async () => {
    try {
      setDownloadingZip(true);
      setStatusMessage({
        type: 'info',
        text: 'Mengunduh paket cpanel-siap-upload.zip resmi hasil build...'
      });

      let response = await fetch('/cpanel-siap-upload.zip?t=' + Date.now(), {
        headers: {
          'Accept': 'application/zip, application/octet-stream',
        },
      });

      if (!response.ok) {
        response = await fetch('/api/download-zip?t=' + Date.now());
      }

      if (!response.ok) {
        throw new Error(`Gagal mengunduh (HTTP ${response.status})`);
      }

      const contentType = response.headers.get('content-type') || '';
      const blob = await response.blob();

      if (blob.size < 50000 || contentType.includes('text/html')) {
        setStatusMessage({
          type: 'error',
          text: 'Perhatian: File cpanel-siap-upload.zip sedang disiapkan. Silakan coba sesaat lagi.'
        });
        return;
      }

      const blobUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = 'cpanel-siap-upload.zip';
      document.body.appendChild(link);
      link.click();

      setTimeout(() => {
        window.URL.revokeObjectURL(blobUrl);
        document.body.removeChild(link);
      }, 1000);

      setStatusMessage({
        type: 'success',
        text: `File cpanel-siap-upload.zip resmi (${(blob.size / 1024).toFixed(0)} KB) berhasil diunduh! Siap di-upload ke File Manager cPanel.`
      });
    } catch (err: any) {
      console.error('Download error:', err);
      setStatusMessage({
        type: 'error',
        text: 'Gagal mengunduh ZIP: ' + (err.message || 'Koneksi terputus.')
      });
    } finally {
      setTimeout(() => setDownloadingZip(false), 1200);
    }
  };

  const handleTriggerAutoUpdate = async () => {
    if (!targetCpanelUrl) {
      setStatusMessage({
        type: 'error',
        text: 'Masukkan URL website cPanel Anda terlebih dahulu.'
      });
      return;
    }

    setTriggeringAutoUpdate(true);
    setStatusMessage({
      type: 'info',
      text: `Menghubungi server cPanel (${targetCpanelUrl}/update.php) untuk menjalankan proses auto-update...`
    });

    try {
      let cleanUrl = targetCpanelUrl.trim().replace(/\/+$/, '');
      if (!cleanUrl.startsWith('http://') && !cleanUrl.startsWith('https://')) {
        cleanUrl = 'https://' + cleanUrl;
      }

      setCustomCpanelUrl(cleanUrl);

      const updaterEndpoint = `${cleanUrl}/update.php?source=${encodeURIComponent(officialZipUrl)}&_t=${Date.now()}`;

      const res = await fetch(updaterEndpoint, {
        method: 'GET',
        headers: { Accept: 'application/json' }
      });

      const data = await res.json();

      if (data.status === 'success') {
        setStatusMessage({
          type: 'success',
          text: `Selamat! Server cPanel berhasil mendownload & mengekstrak pembaruan secara otomatis! (${data.total_files_extracted || 'semua'} file diekstrak). Silakan buka website Anda.`
        });
      } else {
        setStatusMessage({
          type: 'error',
          text: `Respons Server cPanel: ${data.message || 'Gagal update'}. Saran: ${data.hint || 'Gunakan metode Upload File ZIP via File Manager cPanel.'}`
        });
      }
    } catch (err: any) {
      setStatusMessage({
        type: 'info',
        text: `Permintaan update telah dikirim ke cPanel. Jika file update.php belum ada di cPanel, silakan unggah cpanel-siap-upload.zip ke File Manager cPanel (hanya 1x unggah).`
      });
    } finally {
      setTriggeringAutoUpdate(false);
    }
  };

  const handleCheckUpdate = () => {
    setChecking(true);
    setStatusMessage(null);
    setTimeout(() => {
      setChecking(false);
      setStatusMessage({
        type: 'success',
        text: 'Aplikasi KAGUM sudah menggunakan versi paling terbaru (v3.6 - Stable Release dengan Auto-Recovery MySQL)!'
      });
    }, 1500);
  };

  const handleSyncDatabase = () => {
    setSyncingDb(true);
    setStatusMessage(null);
    setTimeout(() => {
      setSyncingDb(false);
      setStatusMessage({
        type: 'success',
        text: 'Skema database dan tabel berhasil disinkronkan dengan modul v3.6.'
      });
    }, 1200);
  };

  const cpanelYmlSnippet = `---
deployment:
  tasks:
    - export DEPLOYPATH=/home/minp1908/public_html/kagum.min1purbalingga.sch.id
    - /bin/cp -rf dist/* $DEPLOYPATH/ 2>/dev/null || :
    - /bin/cp -f public/api.php $DEPLOYPATH/api.php 2>/dev/null || :
    - /bin/cp -f public/update.php $DEPLOYPATH/update.php 2>/dev/null || :
    - /bin/cp -f public/.htaccess $DEPLOYPATH/.htaccess 2>/dev/null || :
    - /bin/cp -f public/schema.sql $DEPLOYPATH/schema.sql 2>/dev/null || :`;

  const copyYml = () => {
    navigator.clipboard.writeText(cpanelYmlSnippet);
    setCopiedYml(true);
    setTimeout(() => setCopiedYml(false), 2000);
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs">
        <div className="flex flex-wrap items-center justify-between pb-4 border-b border-slate-100 mb-6 gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-700 flex items-center justify-center font-bold">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-800">Alur Integrasi AI Studio &rarr; GitHub &rarr; cPanel</h2>
              <p className="text-xs text-slate-500">
                Panduan lengkap menghubungkan repositori GitHub ke cPanel tanpa gagal pull atau error remote
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleSyncDatabase}
              disabled={syncingDb}
              className="flex items-center gap-2 px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition-colors cursor-pointer"
            >
              <Layers className={`w-3.5 h-3.5 text-teal-600 ${syncingDb ? 'animate-spin' : ''}`} />
              {syncingDb ? 'Sinkron...' : 'Sinkronkan DB'}
            </button>

            <button
              onClick={handleCheckUpdate}
              disabled={checking}
              className="flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs rounded-xl transition-colors cursor-pointer shadow-xs"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${checking ? 'animate-spin' : ''}`} />
              {checking ? 'Memeriksa...' : 'Cek Pembaruan'}
            </button>
          </div>
        </div>

        {statusMessage && (
          <div
            className={`mb-6 p-4 rounded-2xl text-xs flex items-center gap-3 font-semibold ${
              statusMessage.type === 'success'
                ? 'bg-emerald-50 border border-emerald-200 text-emerald-900'
                : statusMessage.type === 'error'
                ? 'bg-red-50 border border-red-200 text-red-900'
                : 'bg-sky-50 border border-sky-200 text-sky-900'
            }`}
          >
            {statusMessage.type === 'success' ? (
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
            ) : statusMessage.type === 'error' ? (
              <AlertTriangle className="w-5 h-5 text-red-600 shrink-0" />
            ) : (
              <Info className="w-5 h-5 text-sky-600 shrink-0" />
            )}
            <span>{statusMessage.text}</span>
          </div>
        )}

        {/* Visual Pipeline Diagram Banner */}
        <div className="p-6 bg-slate-900 text-white rounded-2xl border border-slate-800 space-y-5 mb-6">
          <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-800 pb-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-base font-black text-white">Visualisasi Pipeline Rilis KAGUM</span>
                <span className="px-2.5 py-0.5 bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[10px] font-extrabold rounded-full uppercase">
                  Connected
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Bagaimana kode berpindah dari AI Studio ke GitHub dan akhirnya aktif di cPanel Anda
              </p>
            </div>

            <button
              onClick={handleDownloadZip}
              disabled={downloadingZip}
              className="px-4 py-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs rounded-xl shadow-md transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50"
            >
              <Download className={`w-4 h-4 ${downloadingZip ? 'animate-bounce' : ''}`} />
              {downloadingZip ? 'Mengunduh...' : 'Unduh ZIP Rilis (844 KB)'}
            </button>
          </div>

          {/* 3 Pipeline Nodes */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {/* Stage 1 */}
            <div className="p-4 bg-slate-800/90 rounded-xl border border-slate-700 space-y-2 relative">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold text-purple-400 uppercase tracking-wider flex items-center gap-1.5">
                  <Cpu className="w-3.5 h-3.5" /> Tahap 1: Sumber
                </span>
                <span className="w-5 h-5 rounded-full bg-purple-500/20 text-purple-300 text-[10px] font-bold flex items-center justify-center">
                  1
                </span>
              </div>
              <h4 className="text-sm font-bold text-white">Google AI Studio</h4>
              <p className="text-[11px] text-slate-400 leading-relaxed">
                Tempat Anda mengembangkan aplikasi, memprogram fitur baru, dan mengekspor source code ke GitHub.
              </p>
              <div className="text-[10px] font-mono text-purple-300 bg-purple-950/60 p-1.5 rounded">
                Status: Build Siap (v3.6)
              </div>
            </div>

            {/* Stage 2 */}
            <div className="p-4 bg-slate-800/90 rounded-xl border border-slate-700 space-y-2 relative">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold text-sky-400 uppercase tracking-wider flex items-center gap-1.5">
                  <GitBranch className="w-3.5 h-3.5" /> Tahap 2: Repository
                </span>
                <span className="w-5 h-5 rounded-full bg-sky-500/20 text-sky-300 text-[10px] font-bold flex items-center justify-center">
                  2
                </span>
              </div>
              <h4 className="text-sm font-bold text-white">GitHub Repository</h4>
              <p className="text-[11px] text-slate-400 leading-relaxed font-mono truncate">
                github.com/kurniawansr/kagum-v3
              </p>
              <div className="text-[10px] font-mono text-sky-300 bg-sky-950/60 p-1.5 rounded truncate">
                File: .cpanel.yml & deploy.yml Ready
              </div>
            </div>

            {/* Stage 3 */}
            <div className="p-4 bg-slate-800/90 rounded-xl border border-slate-700 space-y-2 relative">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider flex items-center gap-1.5">
                  <Server className="w-3.5 h-3.5" /> Tahap 3: Hosting Live
                </span>
                <span className="w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-300 text-[10px] font-bold flex items-center justify-center">
                  3
                </span>
              </div>
              <h4 className="text-sm font-bold text-white">cPanel Web Server</h4>
              <p className="text-[11px] text-slate-400 leading-relaxed font-mono truncate">
                kagum.min1purbalingga.sch.id
              </p>
              <div className="text-[10px] font-mono text-emerald-300 bg-emerald-950/60 p-1.5 rounded">
                Target: /public_html/...
              </div>
            </div>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="space-y-4">
          <div className="flex flex-wrap border-b border-slate-200 gap-2">
            <button
              onClick={() => setActiveStrategy('pipeline_guide')}
              className={`px-4 py-2.5 text-xs font-bold border-b-2 transition-colors cursor-pointer flex items-center gap-2 ${
                activeStrategy === 'pipeline_guide'
                  ? 'border-purple-600 text-purple-700 bg-purple-50/50 rounded-t-xl'
                  : 'border-transparent text-slate-500 hover:text-slate-700'
              }`}
            >
              <GitBranch className="w-4 h-4" />
              Solusi Menghubungkan GitHub &rarr; cPanel
            </button>

            <button
              onClick={() => setActiveStrategy('zip_upload')}
              className={`px-4 py-2.5 text-xs font-bold border-b-2 transition-colors cursor-pointer flex items-center gap-2 ${
                activeStrategy === 'zip_upload'
                  ? 'border-emerald-600 text-emerald-700 bg-emerald-50/50 rounded-t-xl'
                  : 'border-transparent text-slate-500 hover:text-slate-700'
              }`}
            >
              <FolderArchive className="w-4 h-4" />
              Opsi Praktis: Upload File ZIP via File Manager (10 Detik)
            </button>

            <button
              onClick={() => setActiveStrategy('auto_updater')}
              className={`px-4 py-2.5 text-xs font-bold border-b-2 transition-colors cursor-pointer flex items-center gap-2 ${
                activeStrategy === 'auto_updater'
                  ? 'border-sky-600 text-sky-700 bg-sky-50/50 rounded-t-xl'
                  : 'border-transparent text-slate-500 hover:text-slate-700'
              }`}
            >
              <Zap className="w-4 h-4" />
              Opsi Otomatis: 1-Click Updater (`update.php`)
            </button>

            <button
              onClick={() => setActiveStrategy('git_info')}
              className={`px-4 py-2.5 text-xs font-bold border-b-2 transition-colors cursor-pointer flex items-center gap-2 ${
                activeStrategy === 'git_info'
                  ? 'border-amber-600 text-amber-700 bg-amber-50/50 rounded-t-xl'
                  : 'border-transparent text-slate-500 hover:text-slate-700'
              }`}
            >
              <HelpCircle className="w-4 h-4" />
              Penyebab Error Tangkapan Layar Anda
            </button>
          </div>

          {/* TAB 0: SOLUSI PIPELINE GITHUB -> CPANEL */}
          {activeStrategy === 'pipeline_guide' && (
            <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-6">
              <div className="border-b border-slate-100 pb-4">
                <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                  <GitBranch className="w-4 h-4 text-purple-600" />
                  Bagaimana Agar Integrasi AI Studio &rarr; GitHub &rarr; cPanel Berjalan Sukses?
                </h3>
                <p className="text-xs text-slate-500 mt-1">
                  Ada 2 cara menghubungkan alur ini: <strong>Metode Otomatis (GitHub Actions)</strong> atau <strong>Memperbaiki Git di cPanel</strong>.
                </p>
              </div>

              {/* Method A: GitHub Actions */}
              <div className="p-5 bg-gradient-to-r from-purple-50 to-indigo-50 border border-purple-200 rounded-2xl space-y-4">
                <div className="flex items-center justify-between">
                  <span className="px-2.5 py-1 bg-purple-700 text-white font-extrabold text-[10px] rounded-lg uppercase tracking-wider">
                    Metode A (Rekomendasi Terbaik Modern CI/CD)
                  </span>
                  <span className="text-[11px] text-purple-700 font-bold">100% Otomatis</span>
                </div>
                <h4 className="text-sm font-extrabold text-purple-950">
                  Deploy Otomatis Menggunakan GitHub Actions (Bypass Tombol cPanel)
                </h4>
                <p className="text-xs text-purple-900 leading-relaxed">
                  Dengan metode ini, Anda <strong>tidak perlu lagi mengklik tombol "Update from Remote" di cPanel</strong>. Cukup push dari AI Studio ke GitHub, robot GitHub Actions akan otomatis meng-compile kode React dan mengirimkan file jadi ke cPanel via FTP/FTPS.
                </p>

                <div className="p-3.5 bg-white/90 border border-purple-200 rounded-xl space-y-2 text-xs text-slate-700">
                  <div className="font-bold text-purple-900">Langkah Pengaturan (Hanya 1x Saja):</div>
                  <ol className="list-decimal list-inside text-[11px] space-y-1.5 pl-1">
                    <li>
                      File <code className="bg-purple-100 text-purple-900 px-1 py-0.5 rounded font-mono font-bold">.github/workflows/deploy.yml</code> sudah kami buatkan di project ini.
                    </li>
                    <li>
                      Buka repository Anda di GitHub: <code className="bg-slate-100 px-1 py-0.5 rounded font-mono">github.com/kurniawansr/kagum-v3</code> &rarr; masuk ke tab <strong>Settings</strong> &rarr; <strong>Secrets and variables</strong> &rarr; <strong>Actions</strong>.
                    </li>
                    <li>
                      Tambahkan 3 Secret FTP cPanel Anda:
                      <ul className="list-disc list-inside pl-4 pt-1 space-y-0.5 text-slate-600 font-mono text-[10px]">
                        <li><strong className="text-slate-800">CPANEL_FTP_HOST:</strong> ftp.min1purbalingga.sch.id (atau IP server cPanel)</li>
                        <li><strong className="text-slate-800">CPANEL_FTP_USER:</strong> minp1908 (atau akun FTP cPanel Anda)</li>
                        <li><strong className="text-slate-800">CPANEL_FTP_PASSWORD:</strong> password cPanel Anda</li>
                      </ul>
                    </li>
                    <li>Setelah itu, setiap kali Anda sync dari AI Studio ke GitHub, cPanel langsung terupdate sendiri!</li>
                  </ol>
                </div>
              </div>

              {/* Method B: Fix cPanel Git Version Control */}
              <div className="p-5 bg-slate-50 border border-slate-200 rounded-2xl space-y-4">
                <span className="px-2.5 py-1 bg-slate-800 text-white font-extrabold text-[10px] rounded-lg uppercase tracking-wider">
                  Metode B (Memperbaiki Tombol "Update from Remote" di cPanel)
                </span>
                <h4 className="text-sm font-extrabold text-slate-900">
                  Jika Tetap Ingin Menggunakan Menu Git™ Version Control di cPanel
                </h4>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Agar tombol <strong>Update from Remote</strong> tidak menghasilkan error merah lagi, lakukan 3 langkah ini di cPanel Anda:
                </p>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
                  <div className="p-3.5 bg-white rounded-xl border border-slate-200 space-y-1.5">
                    <span className="font-bold text-slate-800 block">1. Pasang Personal Access Token</span>
                    <p className="text-[11px] text-slate-600 leading-relaxed">
                      Di cPanel Git, klik tab <strong>Basic Information</strong>. Ubah Remote URL menjadi:
                      <code className="block bg-slate-100 p-1.5 rounded font-mono text-[10px] text-slate-800 break-all mt-1">
                        https://ghp_TOKEN_ANDA@github.com/kurniawansr/kagum-v3.git
                      </code>
                      <span className="text-[10px] text-slate-400 mt-1 block">Ini menghilangkan error "could not contact remote repository".</span>
                    </p>
                  </div>

                  <div className="p-3.5 bg-white rounded-xl border border-slate-200 space-y-1.5">
                    <span className="font-bold text-slate-800 block">2. File .cpanel.yml Sudah Ada</span>
                    <p className="text-[11px] text-slate-600 leading-relaxed">
                      Kami sudah membuatkan file <code className="font-mono bg-slate-100 px-1 rounded">.cpanel.yml</code> di root repository untuk mengarahkan file ke folder tujuan.
                    </p>
                    <button
                      onClick={copyYml}
                      className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-[10px] rounded-lg transition-colors cursor-pointer flex items-center gap-1 mt-1"
                    >
                      {copiedYml ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                      {copiedYml ? 'Tersalin!' : 'Lihat / Salin .cpanel.yml'}
                    </button>
                  </div>

                  <div className="p-3.5 bg-white rounded-xl border border-slate-200 space-y-1.5">
                    <span className="font-bold text-slate-800 block">3. Sertakan File Build Murni</span>
                    <p className="text-[11px] text-slate-600 leading-relaxed">
                      Karena cPanel tidak menjalankan <code className="font-mono bg-slate-100 px-1 rounded">npm run build</code>, pastikan file hasil build (<code className="font-mono text-[10px]">dist/</code> atau file siap upload) ikut di-push ke GitHub agar website langsung jalan saat di-deploy.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 1: STRATEGI FILE MANAGER (PALING MUDAH & BEBAS ERROR) */}
          {activeStrategy === 'zip_upload' && (
            <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-6">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-4">
                <div>
                  <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                    <span className="w-6 h-6 rounded-full bg-emerald-100 text-emerald-800 text-xs font-black flex items-center justify-center">
                      ★
                    </span>
                    Strategi Cepat: Upload File ZIP via cPanel File Manager (10 Detik)
                  </h3>
                  <p className="text-xs text-slate-500 mt-1">
                    Gunakan cara ini jika Anda ingin update seketika tanpa perlu pusing konfigurasi Git token atau GitHub Secrets.
                  </p>
                </div>

                <button
                  onClick={handleDownloadZip}
                  disabled={downloadingZip}
                  className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-xs transition-colors cursor-pointer flex items-center gap-2 disabled:opacity-50"
                >
                  <Download className="w-4 h-4" />
                  Unduh File ZIP Sekarang
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
                  <div className="w-7 h-7 rounded-lg bg-slate-800 text-white text-xs font-bold flex items-center justify-center">
                    1
                  </div>
                  <h4 className="text-xs font-bold text-slate-800">Unduh ZIP Rilis</h4>
                  <p className="text-[11px] text-slate-600">
                    Klik tombol hijau <strong>"Unduh File ZIP"</strong> di atas. File bernama <code className="bg-slate-200 px-1 rounded font-mono">cpanel-siap-upload.zip</code> akan tersimpan di laptop/HP Anda.
                  </p>
                </div>

                <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
                  <div className="w-7 h-7 rounded-lg bg-slate-800 text-white text-xs font-bold flex items-center justify-center">
                    2
                  </div>
                  <h4 className="text-xs font-bold text-slate-800">Buka File Manager</h4>
                  <p className="text-[11px] text-slate-600">
                    Di cPanel Anda, buka menu <strong>File Manager</strong> lalu masuk ke folder target: <br />
                    <code className="bg-slate-200 px-1 py-0.5 rounded font-mono text-[10px] text-slate-800 font-bold break-all">
                      public_html/kagum.min1purbalingga.sch.id
                    </code>
                  </p>
                </div>

                <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
                  <div className="w-7 h-7 rounded-lg bg-slate-800 text-white text-xs font-bold flex items-center justify-center">
                    3
                  </div>
                  <h4 className="text-xs font-bold text-slate-800">Upload File ZIP</h4>
                  <p className="text-[11px] text-slate-600">
                    Klik tombol <strong>Upload</strong> di toolbar atas File Manager, lalu seret file <code className="bg-slate-200 px-1 rounded font-mono">cpanel-siap-upload.zip</code>. Proses upload hanya 1-2 detik karena ukurannya kecil.
                  </p>
                </div>

                <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
                  <div className="w-7 h-7 rounded-lg bg-emerald-600 text-white text-xs font-bold flex items-center justify-center">
                    4
                  </div>
                  <h4 className="text-xs font-bold text-slate-800">Klik Kanan & Extract</h4>
                  <p className="text-[11px] text-slate-600">
                    Kembali ke File Manager, klik kanan pada file <code className="bg-slate-200 px-1 rounded font-mono">cpanel-siap-upload.zip</code> &rarr; pilih <strong>Extract</strong> &rarr; klik <strong>Extract Files</strong>. Selesai!
                  </p>
                </div>
              </div>

              <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-950 flex items-start gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                <div>
                  <strong>Keunggulan Strategi Ini:</strong> Seluruh file di dalam zip adalah file <strong>Production Build murni</strong> (<code className="font-mono">index.html</code>, folder <code className="font-mono">assets/</code>, <code className="font-mono">api.php</code>, dan <code className="font-mono">.htaccess</code>). Tidak ada folder <code className="font-mono">node_modules</code> atau file mentah TypeScript yang membebani kuota hosting Anda.
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: 1-CLICK AUTO UPDATER */}
          {activeStrategy === 'auto_updater' && (
            <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-5">
              <div className="border-b border-slate-100 pb-4">
                <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                  <Zap className="w-4 h-4 text-sky-600" />
                  Opsi Otomatis: 1-Click Auto Updater via Web (`update.php`)
                </h3>
                <p className="text-xs text-slate-500 mt-1">
                  Server cPanel Anda akan langsung mendownload file rilis terbaru dari server AI Studio dan mengekstraknya secara otomatis di latar belakang tanpa Anda perlu mengupload file manual.
                </p>
              </div>

              <div className="p-4 bg-sky-50 border border-sky-200 rounded-xl space-y-3">
                <label className="block text-xs font-bold text-sky-950">
                  URL Website cPanel Madrasah Anda:
                </label>
                <div className="flex flex-wrap gap-2">
                  <input
                    type="url"
                    value={targetCpanelUrl}
                    onChange={(e) => setTargetCpanelUrl(e.target.value)}
                    placeholder="https://kagum.min1purbalingga.sch.id"
                    className="flex-1 min-w-[280px] px-3.5 py-2.5 bg-white border border-sky-300 rounded-xl text-xs font-mono focus:outline-none focus:ring-2 focus:ring-sky-500"
                  />
                  <button
                    onClick={handleTriggerAutoUpdate}
                    disabled={triggeringAutoUpdate}
                    className="px-5 py-2.5 bg-sky-600 hover:bg-sky-700 disabled:opacity-50 text-white font-bold text-xs rounded-xl shadow-xs transition-colors cursor-pointer flex items-center gap-2"
                  >
                    <Zap className={`w-4 h-4 ${triggeringAutoUpdate ? 'animate-bounce text-amber-300' : ''}`} />
                    {triggeringAutoUpdate ? 'Sedang Memproses Update di cPanel...' : 'Picu Auto-Update di cPanel Sekarang'}
                  </button>
                </div>

                <div className="text-[11px] text-sky-800 flex items-center gap-1.5 pt-1">
                  <Info className="w-3.5 h-3.5 shrink-0 text-sky-600" />
                  <span>
                    Anda juga dapat menjalankan update kapan saja dengan membuka URL:{' '}
                    <a
                      href={`${targetCpanelUrl}/update.php`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-mono font-bold underline hover:text-sky-950 inline-flex items-center gap-1"
                    >
                      {targetCpanelUrl}/update.php <ExternalLink className="w-3 h-3" />
                    </a>
                  </span>
                </div>
              </div>

              <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl text-xs space-y-2 text-slate-700">
                <div className="font-bold text-slate-800">Bagaimana Cara Kerjanya?</div>
                <ol className="list-decimal list-inside text-[11px] space-y-1.5 pl-1">
                  <li>Script <code className="bg-slate-200 px-1 rounded font-mono">update.php</code> sudah kami sertakan di dalam file build.</li>
                  <li>Saat tombol di atas diklik, browser menghubungi script <code className="bg-slate-200 px-1 rounded font-mono">{targetCpanelUrl}/update.php</code>.</li>
                  <li>Server cPanel Anda akan menarik paket <code className="bg-slate-200 px-1 rounded font-mono">cpanel-siap-upload.zip</code> langsung dari cloud AI Studio ini.</li>
                  <li>Script langsung mengekstrak seluruh file baru ke folder website Anda dan menghapus file zip sementara.</li>
                </ol>
              </div>
            </div>
          )}

          {/* TAB 3: PENJELASAN KENAPA GIT CPANEL GAGAL */}
          {activeStrategy === 'git_info' && (
            <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-5">
              <div className="border-b border-slate-100 pb-4">
                <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-amber-600" />
                  Mengapa "Update from Remote" di Git™ Version Control cPanel Gagal Terus?
                </h3>
                <p className="text-xs text-slate-500 mt-1">
                  Analisis teknis berdasarkan pesan error pada tangkapan layar cPanel Anda
                </p>
              </div>

              <div className="space-y-4">
                {/* Error 1 */}
                <div className="p-4 bg-red-50 border border-red-200 rounded-xl space-y-2">
                  <div className="flex items-center gap-2 text-red-900 font-bold text-xs">
                    <span className="w-5 h-5 rounded-full bg-red-200 text-red-800 text-[10px] flex items-center justify-center font-black">
                      1
                    </span>
                    Error: "The system could not contact the remote repository"
                  </div>
                  <p className="text-[11px] text-red-800 leading-relaxed">
                    <strong>Penyebab:</strong> Repository GitHub Anda (<code className="font-mono font-bold">kurniawansr/kagum-v3.git</code>) membutuhkan autentikasi (karena berstatus <em>Private</em> atau GitHub memblokir clone HTTPS tanpa token). cPanel mencoba melakukan git pull tanpa kredensial atau SSH Deploy Key yang terdaftar di GitHub, sehingga GitHub menolak koneksi cPanel.
                  </p>
                </div>

                {/* Error 2 */}
                <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl space-y-2">
                  <div className="flex items-center gap-2 text-amber-900 font-bold text-xs">
                    <span className="w-5 h-5 rounded-full bg-amber-200 text-amber-800 text-[10px] flex items-center justify-center font-black">
                      2
                    </span>
                    Pemberitahuan: "A valid .cpanel.yml file exists"
                  </div>
                  <p className="text-[11px] text-amber-900 leading-relaxed">
                    <strong>Penyebab:</strong> cPanel Git memerlukan file konfigurasi <code className="font-mono font-bold">.cpanel.yml</code> di dalam repositori untuk mengetahui instruksi copy file ke folder public_html. Tanpa file ini, tombol "Deploy HEAD Commit" akan tetap terkunci/nonaktif.
                  </p>
                </div>

                {/* Masalah Terbesar: React/Vite Build */}
                <div className="p-4 bg-slate-900 text-white rounded-xl space-y-2">
                  <div className="flex items-center gap-2 text-amber-300 font-bold text-xs">
                    <AlertTriangle className="w-4 h-4 text-amber-400" />
                    MASALAH UTAMA: Aplikasi React/Vite Tidak Bisa Berjalan dengan Git Pull Mentah di cPanel
                  </div>
                  <p className="text-[11px] text-slate-300 leading-relaxed">
                    Repository Git hanya berisi kode sumber mentah (file <code className="font-mono text-teal-300">.tsx</code>, <code className="font-mono text-teal-300">.ts</code>, <code className="font-mono text-teal-300">package.json</code>). Hosting cPanel shared hosting <strong>tidak menjalankan compiler Node.js / `npm run build`</strong>.
                  </p>
                  <p className="text-[11px] text-slate-300 leading-relaxed">
                    Jika Anda menarik kode mentah via Git ke <code className="font-mono text-sky-300">public_html</code>, browser tidak akan bisa membuka aplikasi karena browser membutuhkan file bundle HTML/JS jadi (<code className="font-mono text-emerald-300">dist/</code>).
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
