import React, { useState, useRef } from 'react';
import { useApp } from '../../context/AppContext';
import { Database, Download, Upload, RefreshCw, CheckCircle2, AlertTriangle, ShieldAlert, FileJson, HardDrive, Sparkles } from 'lucide-react';

export const BackupRestoreView: React.FC = () => {
  const {
    schoolProfile, setSchoolProfile,
    users, setUsers,
    students, setStudents,
    subjects, setSubjects,
    schedules, setSchedules,
    calendarEvents, setCalendarEvents,
    attendanceRecords, setAttendanceRecords,
    teachingJournals, setTeachingJournals,
    habitRecords, setHabitRecords,
    gradeRecords, setGradeRecords,
    remedialRecords, setRemedialRecords,
    studentTasks, setStudentTasks,
    dansosRecords, setDansosRecords,
    syahriyahJQRecords, setSyahriyahJQRecords,
    paymentCategories, setPaymentCategories,
    paymentInstallments, setPaymentInstallments,
    donationCategories, setDonationCategories,
    donationPayments, setDonationPayments,
  } = useApp();

  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [showResetModal, setShowResetModal] = useState(false);
  const [previewData, setPreviewData] = useState<any | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Backup Export
  const handleExportBackup = () => {
    const backupObj = {
      appVersion: '3.6',
      exportDate: new Date().toISOString(),
      schoolProfile,
      users,
      students,
      subjects,
      schedules,
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
    };

    const jsonString = JSON.stringify(backupObj, null, 2);
    const blob = new Blob([jsonString], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const now = new Date().toISOString().slice(0, 10);

    const link = document.createElement('a');
    link.href = url;
    link.download = `backup_kagum_db_${now}.json`;
    link.click();
    URL.revokeObjectURL(url);

    setStatusMessage({
      type: 'success',
      text: 'File Cadangan (Backup Data) berhasil diunduh secara lengkap!',
    });
    setTimeout(() => setStatusMessage(null), 5000);
  };

  // Restore File Selected
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const parsed = JSON.parse(event.target?.result as string);
        if (!parsed || typeof parsed !== 'object') {
          throw new Error('Format berkas JSON tidak valid.');
        }
        setPreviewData(parsed);
      } catch (err: any) {
        setStatusMessage({
          type: 'error',
          text: `Gagal membaca berkas backup: ${err.message || 'File rusak atau bukan JSON KAGUM'}`,
        });
        setPreviewData(null);
      }
    };
    reader.readAsText(file);
  };

  // Confirm Restore
  const handleConfirmRestore = () => {
    if (!previewData) return;

    try {
      if (previewData.schoolProfile) setSchoolProfile(previewData.schoolProfile);
      if (Array.isArray(previewData.users)) setUsers(previewData.users);
      if (Array.isArray(previewData.students)) setStudents(previewData.students);
      if (Array.isArray(previewData.subjects)) setSubjects(previewData.subjects);
      if (Array.isArray(previewData.schedules)) setSchedules(previewData.schedules);
      if (Array.isArray(previewData.calendarEvents)) setCalendarEvents(previewData.calendarEvents);
      if (Array.isArray(previewData.attendanceRecords)) setAttendanceRecords(previewData.attendanceRecords);
      if (Array.isArray(previewData.teachingJournals)) setTeachingJournals(previewData.teachingJournals);
      else if (Array.isArray(previewData.journals)) setTeachingJournals(previewData.journals);
      if (Array.isArray(previewData.habitRecords)) setHabitRecords(previewData.habitRecords);
      if (Array.isArray(previewData.gradeRecords)) setGradeRecords(previewData.gradeRecords);
      else if (Array.isArray(previewData.grades)) setGradeRecords(previewData.grades);
      if (Array.isArray(previewData.remedialRecords)) setRemedialRecords(previewData.remedialRecords);
      else if (Array.isArray(previewData.remedials)) setRemedialRecords(previewData.remedials);
      if (Array.isArray(previewData.studentTasks)) setStudentTasks(previewData.studentTasks);
      if (Array.isArray(previewData.dansosRecords)) setDansosRecords(previewData.dansosRecords);
      if (Array.isArray(previewData.syahriyahJQRecords)) setSyahriyahJQRecords(previewData.syahriyahJQRecords);
      else if (Array.isArray(previewData.syahriyahRecords)) setSyahriyahJQRecords(previewData.syahriyahRecords);
      if (Array.isArray(previewData.paymentCategories)) setPaymentCategories(previewData.paymentCategories);
      if (Array.isArray(previewData.paymentInstallments)) setPaymentInstallments(previewData.paymentInstallments);
      if (Array.isArray(previewData.donationCategories)) setDonationCategories(previewData.donationCategories);
      if (Array.isArray(previewData.donationPayments)) setDonationPayments(previewData.donationPayments);

      setStatusMessage({
        type: 'success',
        text: 'Data aplikasi berhasil dipulihkan (Restore Complete) dari berkas cadangan!',
      });
      setPreviewData(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
    } catch (err: any) {
      setStatusMessage({
        type: 'error',
        text: `Gagal memulihkan data: ${err.message}`,
      });
    }
  };

  // Factory Reset
  const handleFactoryReset = () => {
    localStorage.clear();
    window.location.reload();
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs">
        <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center font-bold">
              <HardDrive className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-800">Manajemen Backup & Restore Data</h2>
              <p className="text-xs text-slate-500">
                Fasilitas cadangan (export) dan pemulihan (import) seluruh database aplikasi KAGUM secara mandiri
              </p>
            </div>
          </div>
        </div>

        {statusMessage && (
          <div
            className={`mb-6 p-4 rounded-2xl border text-xs flex items-center gap-3 font-semibold ${
              statusMessage.type === 'success'
                ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                : 'bg-rose-50 border-rose-200 text-rose-800'
            }`}
          >
            {statusMessage.type === 'success' ? (
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
            ) : (
              <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0" />
            )}
            {statusMessage.text}
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Card 1: Backup Data */}
          <div className="p-6 bg-slate-50 border border-slate-200 rounded-2xl space-y-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-indigo-100 text-indigo-700 rounded-xl">
                <Download className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-extrabold text-slate-800 text-sm">1. Backup (Cadangkan Data)</h3>
                <p className="text-xs text-slate-500">Unduh seluruh berkas basis data dalam bentuk file JSON</p>
              </div>
            </div>

            <div className="space-y-2 text-xs text-slate-600 bg-white p-3.5 rounded-xl border border-slate-200">
              <p className="font-bold text-slate-800">Cakupan Data Cadangan:</p>
              <ul className="list-disc list-inside space-y-1 text-slate-500">
                <li>Profil Madrasah & Kop Laporan</li>
                <li>Pengguna & Akun Guru ({(users || []).length} akun)</li>
                <li>Data Siswa & Kelas ({(students || []).length} siswa)</li>
                <li>Jadwal & Jurnal Mengajar ({(teachingJournals || []).length} jurnal)</li>
                <li>Transkrip Nilai & Remedial ({(gradeRecords || []).length} nilai)</li>
                <li>Rekap Keuangan & Iuran</li>
              </ul>
            </div>

            <button
              onClick={handleExportBackup}
              className="w-full flex items-center justify-center gap-2 py-3 px-4 bg-indigo-700 hover:bg-indigo-800 text-white font-bold text-xs rounded-xl shadow-xs transition-colors cursor-pointer"
            >
              <Download className="w-4 h-4" />
              Unduh Backup Terbaru (.json)
            </button>
          </div>

          {/* Card 2: Restore Data */}
          <div className="p-6 bg-slate-50 border border-slate-200 rounded-2xl space-y-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-emerald-100 text-emerald-700 rounded-xl">
                <Upload className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-extrabold text-slate-800 text-sm">2. Restore (Pulihkan Data)</h3>
                <p className="text-xs text-slate-500">Unggah berkas cadangan JSON untuk mengembalikan data</p>
              </div>
            </div>

            <div className="space-y-2">
              <label className="block text-xs font-semibold text-slate-700">Pilih Berkas Backup (.json):</label>
              <input
                ref={fileInputRef}
                type="file"
                accept=".json"
                onChange={handleFileChange}
                className="w-full text-xs text-slate-600 file:mr-3 file:py-2 file:px-3 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-emerald-100 file:text-emerald-800 hover:file:bg-emerald-200 cursor-pointer border border-slate-200 rounded-xl p-1 bg-white"
              />
            </div>

            {previewData && (
              <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs space-y-2">
                <p className="font-bold text-emerald-900">Preview Data Cadangan:</p>
                <div className="grid grid-cols-2 gap-1 text-[11px] text-emerald-800">
                  <span>Madrasah: {previewData.schoolProfile?.namaMadrasah || '-'}</span>
                  <span>Siswa: {previewData.students?.length || 0} orang</span>
                  <span>Guru: {previewData.users?.length || 0} orang</span>
                  <span>Nilai: {previewData.gradeRecords?.length || previewData.grades?.length || 0} entri</span>
                </div>
                <button
                  onClick={handleConfirmRestore}
                  className="w-full mt-2 py-2 px-3 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs rounded-lg transition-colors cursor-pointer"
                >
                  Proses Restore Sekarang
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Danger Zone Reset */}
        <div className="mt-8 pt-6 border-t border-slate-200 flex items-center justify-between">
          <div>
            <h4 className="font-bold text-rose-700 text-xs flex items-center gap-1.5">
              <AlertTriangle className="w-4 h-4 text-rose-600" />
              Reset Ulang Sistem (Pabrik)
            </h4>
            <p className="text-[11px] text-slate-500 mt-0.5">
              Mengosongkan cache penyimpanan lokal dan mengembalikan sistem ke konfigurasi awal bawaan.
            </p>
          </div>

          <button
            onClick={() => setShowResetModal(true)}
            className="px-4 py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 font-bold text-xs rounded-xl transition-colors cursor-pointer"
          >
            Reset Awal
          </button>
        </div>
      </div>

      {/* Reset Confirmation Modal */}
      {showResetModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-3xl max-w-sm w-full p-6 space-y-4 text-center shadow-2xl">
            <div className="w-12 h-12 bg-rose-100 text-rose-600 rounded-2xl flex items-center justify-center mx-auto">
              <ShieldAlert className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-extrabold text-slate-800 text-base">Konfirmasi Reset Awal</h3>
              <p className="text-xs text-slate-500 mt-1">
                Seluruh data perubahan yang belum dibackup akan dihapus dan dikembalikan ke awal. Lanjutkan?
              </p>
            </div>
            <div className="flex gap-2 pt-2">
              <button
                onClick={() => setShowResetModal(false)}
                className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl cursor-pointer"
              >
                Batal
              </button>
              <button
                onClick={handleFactoryReset}
                className="flex-1 py-2.5 bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs rounded-xl shadow-xs cursor-pointer"
              >
                Ya, Reset
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
