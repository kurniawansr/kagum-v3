import React, { useState, useEffect } from 'react';
import { Database, Download, Server, Terminal, ShieldCheck, Copy, Check, RefreshCw, AlertTriangle, CheckCircle2, CloudUpload, KeyRound, HardDrive } from 'lucide-react';
import { ApiService, SyncResponse } from '../../services/api';
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

  const checkDbConnection = async () => {
    setTesting(true);
    setSyncMessage(null);
    try {
      const result = await ApiService.testConnection();
      setTestResult(result);
    } catch {
      setTestResult({
        status: 'error',
        code: 'UNKNOWN_ERROR',
        message: 'Gagal mengecek koneksi ke api.php'
      });
    } finally {
      setTesting(false);
    }
  };

  useEffect(() => {
    checkDbConnection();
  }, []);

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
// Buka file api.php di cPanel File Manager -> public_html/api.php
$db_host = 'localhost';
$db_name = 'minp1908_kagum';
$db_user = 'minp1908_kagum';
$db_pass = 'Adm1n456';
?>`;

  const handleCopyPhpSnippet = () => {
    navigator.clipboard.writeText(sampleApiPhpSnippet);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

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
              <h2 className="text-lg font-bold text-slate-800">Status & Diagnosis Database MySQL Hosting</h2>
              <p className="text-xs text-slate-500">
                Pemeriksaan koneksi server MySQL cPanel (`/api.php`) dan panduan agar data user tersimpan permanen
              </p>
            </div>
          </div>

          <button
            onClick={checkDbConnection}
            disabled={testing}
            className="flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white font-bold text-xs rounded-xl transition-colors cursor-pointer disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${testing ? 'animate-spin' : ''}`} />
            {testing ? 'Memeriksa Connection...' : 'Tes Ulang Koneksi MySQL'}
          </button>
        </div>

        {/* Diagnostic Status Result */}
        <div className="mt-6">
          {testing ? (
            <div className="p-6 bg-slate-50 border border-slate-200 rounded-2xl flex items-center justify-center gap-3 text-slate-600 text-xs">
              <RefreshCw className="w-5 h-5 animate-spin text-teal-600" />
              <span>Menghubungi server api.php untuk tes koneksi database MySQL...</span>
            </div>
          ) : testResult?.status === 'success' && testResult.connected ? (
            <div className="p-6 bg-emerald-50/80 border border-emerald-200 rounded-2xl space-y-4">
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-start gap-3">
                  <CheckCircle2 className="w-6 h-6 text-emerald-600 shrink-0 mt-0.5" />
                  <div>
                    <h3 className="text-sm font-extrabold text-emerald-950 flex items-center gap-2">
                      TERHUBUNG KE DATABASE MYSQL!
                      <span className="px-2 py-0.5 bg-emerald-200 text-emerald-800 rounded text-[10px] uppercase font-bold">
                        Online Sync Active
                      </span>
                    </h3>
                    <p className="text-xs text-emerald-800 mt-1">
                      Koneksi ke database <code className="font-mono font-bold bg-emerald-100 px-1.5 py-0.5 rounded text-emerald-900">{testResult.db_name}</code> berjalan normal. Semua perubahan data user/admin akan tersimpan permanen di MySQL server.
                    </p>
                  </div>
                </div>

                <button
                  onClick={handlePushAllDataToMysql}
                  disabled={syncing}
                  className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-extrabold text-xs rounded-xl shadow-md transition-all cursor-pointer flex items-center gap-2 shrink-0"
                >
                  <CloudUpload className={`w-4 h-4 ${syncing ? 'animate-bounce' : ''}`} />
                  {syncing ? 'Mengunggah Data...' : 'Upload Data Lokal ke MySQL Server'}
                </button>
              </div>

              {syncMessage && (
                <div className={`p-3 rounded-xl text-xs font-bold ${syncMessage.type === 'success' ? 'bg-emerald-200 text-emerald-900 border border-emerald-300' : 'bg-red-100 text-red-900 border border-red-200'}`}>
                  {syncMessage.text}
                </div>
              )}
            </div>
          ) : (
            <div className="p-6 bg-red-50/90 border border-red-200 rounded-2xl space-y-4">
              <div className="flex items-start gap-3">
                <AlertTriangle className="w-6 h-6 text-red-600 shrink-0 mt-0.5" />
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-extrabold text-red-950">
                      DATABASE MYSQL BELUM TERHUBUNG / SALAH KONFIGURASI!
                    </h3>
                    <span className="px-2 py-0.5 bg-red-200 text-red-900 font-bold rounded text-[10px]">
                      {testResult?.code || 'STATUS_OFFLINE'}
                    </span>
                  </div>

                  <p className="text-xs text-red-800 font-medium">
                    {testResult?.message || 'Server api.php tidak dapat terhubung ke MySQL.'}
                  </p>

                  {testResult?.detail && (
                    <div className="p-3 bg-red-100/80 border border-red-200 rounded-xl text-[11px] font-mono text-red-900">
                      <strong>Detail Error PHP:</strong> {testResult.detail}
                    </div>
                  )}

                  {testResult?.hint && (
                    <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-[11px] text-amber-900">
                      <strong>Petunjuk Perbaikan:</strong> {testResult.hint}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
