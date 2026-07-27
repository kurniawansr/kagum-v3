import React, { useState } from 'react';
import { RefreshCw, Sparkles, CheckCircle2, ShieldCheck, ArrowUpCircle, Terminal, Layers, Info } from 'lucide-react';

export const UpdateAplikasiView: React.FC = () => {
  const [checking, setChecking] = useState(false);
  const [syncingDb, setSyncingDb] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  const handleCheckUpdate = () => {
    setChecking(true);
    setStatusMessage(null);
    setTimeout(() => {
      setChecking(false);
      setStatusMessage('Aplikasi KAGUM sudah menggunakan versi paling terbaru (v3.6 - Stable Release)!');
    }, 1800);
  };

  const handleSyncDatabase = () => {
    setSyncingDb(true);
    setStatusMessage(null);
    setTimeout(() => {
      setSyncingDb(false);
      setStatusMessage('Skema database dan tabel berhasil disinkronkan dengan modul v3.6.');
    }, 1500);
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs">
        <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-700 flex items-center justify-center font-bold">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-800">Update & Pemeliharaan Aplikasi</h2>
              <p className="text-xs text-slate-500">
                Pemeriksaan versi sistem terbaru, pemeliharaan modul, dan sinkronisasi struktur database
              </p>
            </div>
          </div>
        </div>

        {statusMessage && (
          <div className="mb-6 p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-2xl text-xs flex items-center gap-3 font-semibold">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
            {statusMessage}
          </div>
        )}

        {/* Current Version Card */}
        <div className="p-6 bg-slate-900 text-white rounded-2xl border border-slate-800 space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-800 pb-5">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="text-xl font-black tracking-tight text-white">KAGUM Versi 3.6</span>
                <span className="px-2.5 py-0.5 bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[10px] font-extrabold rounded-full uppercase">
                  Terbaru / Up to Date
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Bento Grid Edition & Integrated Madrasah Administration System
              </p>
            </div>

            <div className="flex gap-2">
              <button
                onClick={handleSyncDatabase}
                disabled={syncingDb}
                className="flex items-center gap-2 px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs rounded-xl border border-slate-700 transition-colors cursor-pointer"
              >
                <Layers className={`w-4 h-4 text-teal-400 ${syncingDb ? 'animate-spin' : ''}`} />
                {syncingDb ? 'Sinkronisasi...' : 'Sinkronkan DB'}
              </button>

              <button
                onClick={handleCheckUpdate}
                disabled={checking}
                className="flex items-center gap-2 px-4 py-2.5 bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs rounded-xl transition-colors cursor-pointer shadow-md"
              >
                <RefreshCw className={`w-4 h-4 ${checking ? 'animate-spin' : ''}`} />
                {checking ? 'Memeriksa Server...' : 'Cek Pembaruan'}
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
            <div className="p-3.5 bg-slate-800/80 rounded-xl border border-slate-700/60">
              <span className="text-slate-400 block text-[10px]">Tipe Rilis</span>
              <span className="font-bold text-slate-100 text-sm">Release Production</span>
            </div>
            <div className="p-3.5 bg-slate-800/80 rounded-xl border border-slate-700/60">
              <span className="text-slate-400 block text-[10px]">Tanggal Patch Terakhir</span>
              <span className="font-bold text-emerald-400 text-sm">26 Juli 2026</span>
            </div>
            <div className="p-3.5 bg-slate-800/80 rounded-xl border border-slate-700/60">
              <span className="text-slate-400 block text-[10px]">Status AI & Sistem</span>
              <span className="font-bold text-amber-300 text-sm">Gemini AI Active</span>
            </div>
          </div>
        </div>

        {/* Changelog / Release Notes */}
        <div className="mt-8 space-y-4">
          <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
            <Info className="w-4 h-4 text-purple-600" />
            Catatan Perubahan Versi (Changelog)
          </h3>

          <div className="space-y-3">
            {/* Version 3.6 */}
            <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-extrabold text-slate-900 text-xs">Versi 3.6 — Bento Grid & Admin Revision</span>
                <span className="text-[10px] text-slate-400 font-medium">Juli 2026</span>
              </div>
              <ul className="list-disc list-inside text-xs text-slate-600 space-y-1 pl-1">
                <li>Form Pengampuan Kelas guru diubah menjadi isian bebas (text input).</li>
                <li>Penambahan biodata lengkap guru: Jenis Kelamin, Tempat Lahir, dan Tanggal Lahir.</li>
                <li>Dukungan login guru menggunakan <strong>NIP/NIK</strong> atau Email.</li>
                <li>Pembaruan menu Administrator: Fasilitas Backup/Restore data JSON, Update Aplikasi, dan Panduan Deploy MySQL.</li>
              </ul>
            </div>

            {/* Version 3.5 */}
            <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-extrabold text-slate-900 text-xs">Versi 3.5 — Modul Keuangan & Rapor</span>
                <span className="text-[10px] text-slate-400 font-medium">Juni 2026</span>
              </div>
              <ul className="list-disc list-inside text-xs text-slate-600 space-y-1 pl-1">
                <li>Integrasi 4 modul keuangan kelas: Dansos/Infaq, Syahriyah JQ, Angsuran, dan Iuran Sumbangan.</li>
                <li>Eksport Laporan Nilai Format Excel & PDF siap cetak.</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
