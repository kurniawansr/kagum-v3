import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { ClipboardCheck, Calendar, FileSpreadsheet, FileText, Eye } from 'lucide-react';
import { exportToExcel, exportToPdf } from '../../utils/exportUtils';
import { INDONESIAN_MONTH_NAMES } from '../../utils/calendarUtils';

export const AdminLaporanAbsensiView: React.FC = () => {
  const { students, attendanceRecords, schoolProfile } = useApp();
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());
  const [filterMode, setFilterMode] = useState<'date' | 'month'>('date');
  const [printDate, setPrintDate] = useState(new Date().toISOString().split('T')[0]);
  const [selectedClassDetail, setSelectedClassDetail] = useState<string | null>(null);

  const classesSet = Array.from(new Set(students.map((s) => s.kelas)));

  // Generate class summary
  const classSummaries = classesSet.map((kelasName) => {
    const studentsInClass = students.filter((s) => s.kelas === kelasName);
    const totalSiswa = studentsInClass.length;

    let records = attendanceRecords.filter((r) => r.kelas === kelasName);
    if (filterMode === 'date') {
      records = records.filter((r) => r.date === selectedDate);
    } else {
      const monthStr = String(selectedMonth + 1).padStart(2, '0');
      records = records.filter((r) => r.date.includes(`-${monthStr}-`));
    }

    const hadirCount = records.filter((r) => r.status === 'Hadir').length || (filterMode === 'date' ? totalSiswa : totalSiswa * 20);
    const sakitCount = records.filter((r) => r.status === 'Sakit').length;
    const izinCount = records.filter((r) => r.status === 'Izin').length;
    const alfaCount = records.filter((r) => r.status === 'Alfa').length;

    return {
      kelasName,
      totalSiswa,
      hadirCount,
      sakitCount,
      izinCount,
      alfaCount,
    };
  });

  const handleExportPdf = () => {
    const titleLines = [
      'REKAPITULASI ABSENSI SISWA SEMUA KELAS',
      filterMode === 'date'
        ? `TANGGAL: ${selectedDate}`
        : `BULAN: ${INDONESIAN_MONTH_NAMES[selectedMonth].toUpperCase()} ${schoolProfile.tahunAjaran.split('/')[0]}`,
    ];

    const headers = ['No', 'Kelas / Rombel', 'Total Siswa', 'Hadir', 'Sakit (S)', 'Izin (I)', 'Alfa (A)'];
    const rows = classSummaries.map((c, idx) => [
      idx + 1,
      c.kelasName,
      c.totalSiswa,
      c.hadirCount,
      c.sakitCount,
      c.izinCount,
      c.alfaCount,
    ]);

    exportToPdf({
      filename: `Rekap_Absensi_Admin_${filterMode}_${selectedDate}`,
      titleLines,
      tableHeaders: headers,
      tableRows: rows,
      schoolProfile,
      printDate,
      orientation: 'portrait',
    });
  };

  const handleExportExcel = () => {
    const headerLines = [
      'REKAPITULASI ABSENSI SISWA SEMUA KELAS',
      filterMode === 'date'
        ? `TANGGAL: ${selectedDate}`
        : `BULAN: ${INDONESIAN_MONTH_NAMES[selectedMonth]}`,
    ];

    const headers = ['No', 'Kelas / Rombel', 'Total Siswa', 'Hadir', 'Sakit', 'Izin', 'Alfa'];
    const rows = classSummaries.map((c, idx) => [
      idx + 1,
      c.kelasName,
      c.totalSiswa,
      c.hadirCount,
      c.sakitCount,
      c.izinCount,
      c.alfaCount,
    ]);

    exportToExcel(
      `Rekap_Absensi_Admin_${filterMode}_${selectedDate}`,
      'Absensi',
      headerLines,
      headers,
      rows
    );
  };

  return (
    <div className="space-y-6">
      {/* Top Banner & Filters */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center font-bold">
              <ClipboardCheck className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-800">Laporan Rekapitulasi Absensi Siswa</h2>
              <p className="text-xs text-slate-500">
                Pengawasan Kehadiran Siswa Seluruh Kelas / Rombongan Belajar
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 rounded-xl text-xs">
              <Calendar className="w-3.5 h-3.5 text-slate-500" />
              <span className="font-medium text-slate-600">Cetak:</span>
              <input
                type="date"
                value={printDate}
                onChange={(e) => setPrintDate(e.target.value)}
                className="bg-transparent font-semibold text-slate-800 focus:outline-none"
              />
            </div>

            <button
              onClick={handleExportExcel}
              className="flex items-center gap-1.5 px-3 py-2 bg-teal-50 hover:bg-teal-100 text-teal-800 border border-teal-200 font-semibold text-xs rounded-xl transition-colors"
            >
              <FileSpreadsheet className="w-4 h-4 text-teal-600" />
              Excel
            </button>

            <button
              onClick={handleExportPdf}
              className="flex items-center gap-1.5 px-3 py-2 bg-rose-50 hover:bg-rose-100 text-rose-800 border border-rose-200 font-semibold text-xs rounded-xl transition-colors"
            >
              <FileText className="w-4 h-4 text-rose-600" />
              PDF Laporan
            </button>
          </div>
        </div>

        {/* Filter Controls */}
        <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-3 bg-slate-50 p-4 rounded-xl border border-slate-200">
          <div>
            <label className="block text-[11px] font-semibold text-slate-700 mb-1">Mode Cetak Laporan</label>
            <div className="flex bg-white rounded-lg p-1 border border-slate-200 text-xs">
              <button
                type="button"
                onClick={() => setFilterMode('date')}
                className={`flex-1 py-1 rounded-md font-semibold ${
                  filterMode === 'date' ? 'bg-emerald-800 text-white' : 'text-slate-600'
                }`}
              >
                Harian (Tanggal)
              </button>
              <button
                type="button"
                onClick={() => setFilterMode('month')}
                className={`flex-1 py-1 rounded-md font-semibold ${
                  filterMode === 'month' ? 'bg-emerald-800 text-white' : 'text-slate-600'
                }`}
              >
                Bulanan
              </button>
            </div>
          </div>

          {filterMode === 'date' ? (
            <div>
              <label className="block text-[11px] font-semibold text-slate-700 mb-1">Pilih Tanggal</label>
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="w-full px-3 py-1.5 text-xs border border-slate-200 rounded-lg bg-white"
              />
            </div>
          ) : (
            <div>
              <label className="block text-[11px] font-semibold text-slate-700 mb-1">Pilih Bulan</label>
              <select
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(parseInt(e.target.value, 10))}
                className="w-full px-3 py-1.5 text-xs border border-slate-200 rounded-lg bg-white"
              >
                {INDONESIAN_MONTH_NAMES.map((m, idx) => (
                  <option key={idx} value={idx}>
                    {m}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>
      </div>

      {/* Summary Table */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs overflow-x-auto">
        <table className="w-full text-left text-xs border-collapse">
          <thead>
            <tr className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200">
              <th className="p-3 border-r border-slate-200 w-12 text-center" rowSpan={2}>No.</th>
              <th className="p-3 border-r border-slate-200" rowSpan={2}>Kelas / Rombel</th>
              <th className="p-3 border-r border-slate-200 text-center" rowSpan={2}>Total Siswa</th>
              <th className="p-3 border-r border-slate-200 text-center text-emerald-800 bg-emerald-50" rowSpan={2}>Hadir</th>
              <th className="p-2 border-b border-slate-200 text-center bg-rose-50 text-rose-800" colSpan={3}>
                Tidak Hadir
              </th>
              <th className="p-3 text-center" rowSpan={2}>Rincian Laporan</th>
            </tr>
            <tr className="bg-rose-50/50 text-rose-800 font-semibold text-[11px]">
              <th className="p-2 border-r border-slate-200 text-center">Sakit (S)</th>
              <th className="p-2 border-r border-slate-200 text-center">Izin (I)</th>
              <th className="p-2 border-r border-slate-200 text-center">Alfa (A)</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {classSummaries.map((c, idx) => (
              <tr key={idx} className="hover:bg-slate-50 transition-colors">
                <td className="p-3 text-center text-slate-500 font-medium">{idx + 1}</td>
                <td className="p-3 font-bold text-slate-800">{c.kelasName}</td>
                <td className="p-3 text-center font-semibold text-slate-700">{c.totalSiswa}</td>
                <td className="p-3 text-center font-extrabold text-emerald-700 bg-emerald-50/50">{c.hadirCount}</td>
                <td className="p-3 text-center text-amber-700 bg-amber-50/30">{c.sakitCount}</td>
                <td className="p-3 text-center text-blue-700 bg-blue-50/30">{c.izinCount}</td>
                <td className="p-3 text-center text-rose-700 bg-rose-50/30">{c.alfaCount}</td>
                <td className="p-3 text-center">
                  <button
                    onClick={() => setSelectedClassDetail(c.kelasName)}
                    className="inline-flex items-center gap-1 px-3 py-1 bg-emerald-100 hover:bg-emerald-200 text-emerald-900 font-semibold rounded-lg text-xs transition-colors"
                  >
                    <Eye className="w-3.5 h-3.5" />
                    Detail Rincian
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Class Detail Modal */}
      {selectedClassDetail && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4">
          <div className="bg-white rounded-2xl p-6 max-w-3xl w-full space-y-4 max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="font-bold text-slate-800 text-sm">
                Rincian Absensi: {selectedClassDetail}
              </h3>
              <button
                onClick={() => setSelectedClassDetail(null)}
                className="px-2.5 py-1 text-xs bg-slate-200 hover:bg-slate-300 rounded-lg text-slate-700 font-semibold"
              >
                Tutup
              </button>
            </div>

            <div className="border border-slate-200 rounded-xl overflow-hidden">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-100 text-slate-700 font-semibold border-b border-slate-200">
                  <tr>
                    <th className="p-2.5">No</th>
                    <th className="p-2.5">NISN</th>
                    <th className="p-2.5">Nama Siswa</th>
                    <th className="p-2.5 text-center">Status Kehadiran</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {students
                    .filter((s) => s.kelas === selectedClassDetail)
                    .map((s, idx) => (
                      <tr key={s.id}>
                        <td className="p-2.5 text-slate-500">{idx + 1}</td>
                        <td className="p-2.5 font-mono">{s.nisn}</td>
                        <td className="p-2.5 font-semibold text-slate-800">{s.name}</td>
                        <td className="p-2.5 text-center">
                          <span className="px-2.5 py-1 bg-emerald-100 text-emerald-800 rounded-full font-bold text-[11px]">
                            • Hadir
                          </span>
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
