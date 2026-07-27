import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { Coins, HeartHandshake, FileSpreadsheet, FileText, Calendar, Eye } from 'lucide-react';
import { INDONESIAN_MONTH_NAMES } from '../../utils/calendarUtils';
import { exportToExcel, exportToPdf } from '../../utils/exportUtils';

export const AdminLaporanKeuanganView: React.FC = () => {
  const { students, schoolProfile, dansosRecords, syahriyahJQRecords } = useApp();
  const [activeTab, setActiveTab] = useState<'dansos' | 'syahriyah'>('dansos');
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());
  const [selectedClass, setSelectedClass] = useState<string>('Semua');
  const [printDate, setPrintDate] = useState(new Date().toISOString().split('T')[0]);
  const [detailModal, setDetailModal] = useState<string | null>(null);

  const classesList = Array.from(new Set((students || []).map((s) => s.kelas)));
  const filteredClasses = selectedClass === 'Semua' ? classesList : [selectedClass];

  // Calculations for Dansos
  const dansosSummaries = filteredClasses.map((kelasName) => {
    const studentsInClass = (students || []).filter((s) => s.kelas === kelasName);
    const totalSiswa = studentsInClass.length;

    const classDansos = (dansosRecords || []).filter((r) => {
      const student = (students || []).find((s) => s.id === r.studentId);
      return student?.kelas === kelasName;
    });

    const totalNominal = classDansos.reduce((sum, item) => sum + item.amount, 0);

    return {
      kelasName,
      totalSiswa,
      totalNominal,
    };
  });

  // Calculations for Syahriyah
  const syahriyahSummaries = filteredClasses.map((kelasName) => {
    const studentsInClass = (students || []).filter((s) => s.kelas === kelasName);
    const totalSiswa = studentsInClass.length;

    const classSyahriyah = (syahriyahJQRecords || []).filter((r) => {
      const student = (students || []).find((s) => s.id === r.studentId);
      return student?.kelas === kelasName && r.monthIndex === selectedMonth;
    });

    const totalLunasSiswa = classSyahriyah.length;
    const totalNominal = classSyahriyah.reduce((sum, item) => sum + item.amount, 0);

    return {
      kelasName,
      totalSiswa,
      totalLunasSiswa,
      totalNominal,
    };
  });

  const handleExportPdf = () => {
    const isDansos = activeTab === 'dansos';
    const titleLines = [
      isDansos
        ? 'LAPORAN REKAPITULASI DANA SOSIAL DAN INFAQ JUMAT'
        : 'LAPORAN REKAPITULASI SYAHRIYAH JAM’IYYATUL QURRA’',
      `BULAN: ${INDONESIAN_MONTH_NAMES[selectedMonth].toUpperCase()} ${schoolProfile.tahunAjaran.split('/')[0]}`,
    ];

    const headers = isDansos
      ? ['No', 'Kelas / Rombel', 'Total Siswa', 'Total Infaq Setor (Rp)']
      : ['No', 'Kelas / Rombel', 'Total Siswa', 'Siswa Lunas', 'Total Setoran (Rp)'];

    const rows = isDansos
      ? dansosSummaries.map((c, idx) => [idx + 1, c.kelasName, c.totalSiswa, `Rp ${c.totalNominal.toLocaleString('id-ID')}`])
      : syahriyahSummaries.map((c, idx) => [idx + 1, c.kelasName, c.totalSiswa, c.totalLunasSiswa, `Rp ${c.totalNominal.toLocaleString('id-ID')}`]);

    exportToPdf({
      filename: `Rekap_Keuangan_Admin_${activeTab}_${selectedMonth + 1}`,
      titleLines,
      tableHeaders: headers,
      tableRows: rows,
      schoolProfile,
      printDate,
    });
  };

  const handleExportExcel = () => {
    const isDansos = activeTab === 'dansos';
    const headerLines = [
      isDansos
        ? 'LAPORAN REKAPITULASI DANA SOSIAL DAN INFAQ JUMAT'
        : 'LAPORAN REKAPITULASI SYAHRIYAH JAM’IYYATUL QURRA’',
      `BULAN: ${INDONESIAN_MONTH_NAMES[selectedMonth]} ${schoolProfile.tahunAjaran}`,
    ];

    const headers = isDansos
      ? ['No', 'Kelas / Rombel', 'Total Siswa', 'Total Setoran (Rp)']
      : ['No', 'Kelas / Rombel', 'Total Siswa', 'Siswa Lunas', 'Total Setoran (Rp)'];

    const rows = isDansos
      ? dansosSummaries.map((c, idx) => [idx + 1, c.kelasName, c.totalSiswa, c.totalNominal])
      : syahriyahSummaries.map((c, idx) => [idx + 1, c.kelasName, c.totalSiswa, c.totalLunasSiswa, c.totalNominal]);

    exportToExcel(
      `Rekap_Keuangan_Admin_${activeTab}_${selectedMonth + 1}`,
      'Keuangan',
      headerLines,
      headers,
      rows
    );
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center font-bold">
              <Coins className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-800">Laporan Keuangan Rekapitulasi Admin</h2>
              <p className="text-xs text-slate-500">
                Pengawasan Rekapitulasi Infaq Jum'at & Syahriyah JQ Semua Kelas
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

        {/* Tab & Filters */}
        <div className="mt-4 flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-50 p-4 rounded-xl border border-slate-200">
          <div className="flex bg-white rounded-lg p-1 border border-slate-200 text-xs font-semibold">
            <button
              onClick={() => setActiveTab('dansos')}
              className={`flex items-center gap-1.5 px-4 py-1.5 rounded-md transition-all ${
                activeTab === 'dansos' ? 'bg-amber-700 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <HeartHandshake className="w-4 h-4" />
              a. Dansos / Infaq Jum'at
            </button>
            <button
              onClick={() => setActiveTab('syahriyah')}
              className={`flex items-center gap-1.5 px-4 py-1.5 rounded-md transition-all ${
                activeTab === 'syahriyah' ? 'bg-amber-700 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Coins className="w-4 h-4" />
              b. Syahriyah JQ
            </button>
          </div>

          <div className="flex items-center gap-3 text-xs">
            <div>
              <label className="block text-[11px] font-semibold text-slate-600 mb-1">Pilih Bulan</label>
              <select
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(parseInt(e.target.value, 10))}
                className="px-3 py-1.5 text-xs border border-slate-200 rounded-lg bg-white"
              >
                {INDONESIAN_MONTH_NAMES.map((m, idx) => (
                  <option key={idx} value={idx}>
                    {m}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-600 mb-1">Filter Kelas</label>
              <select
                value={selectedClass}
                onChange={(e) => setSelectedClass(e.target.value)}
                className="px-3 py-1.5 text-xs border border-slate-200 rounded-lg bg-white"
              >
                <option value="Semua">Semua Kelas</option>
                {classesList.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Table Content */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200">
            <tr>
              <th className="p-3 w-12 text-center">No.</th>
              <th className="p-3">Kelas / Rombel</th>
              <th className="p-3 text-center">Total Siswa</th>
              {activeTab === 'syahriyah' && <th className="p-3 text-center">Siswa Lunas JQ</th>}
              <th className="p-3 text-right">Total Nominal Setoran</th>
              <th className="p-3 text-center">Rincian</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {activeTab === 'dansos'
              ? dansosSummaries.map((c, idx) => (
                  <tr key={idx} className="hover:bg-slate-50 transition-colors">
                    <td className="p-3 text-center text-slate-500 font-medium">{idx + 1}</td>
                    <td className="p-3 font-bold text-slate-800">{c.kelasName}</td>
                    <td className="p-3 text-center text-slate-600">{c.totalSiswa}</td>
                    <td className="p-3 text-right font-extrabold text-emerald-700">
                      Rp {c.totalNominal.toLocaleString('id-ID')}
                    </td>
                    <td className="p-3 text-center">
                      <button
                        onClick={() => setDetailModal(c.kelasName)}
                        className="inline-flex items-center gap-1 px-3 py-1 bg-amber-100 hover:bg-amber-200 text-amber-900 font-semibold rounded-lg text-xs"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        Rincian
                      </button>
                    </td>
                  </tr>
                ))
              : syahriyahSummaries.map((c, idx) => (
                  <tr key={idx} className="hover:bg-slate-50 transition-colors">
                    <td className="p-3 text-center text-slate-500 font-medium">{idx + 1}</td>
                    <td className="p-3 font-bold text-slate-800">{c.kelasName}</td>
                    <td className="p-3 text-center text-slate-600">{c.totalSiswa}</td>
                    <td className="p-3 text-center font-bold text-emerald-700">{c.totalLunasSiswa} Siswa</td>
                    <td className="p-3 text-right font-extrabold text-emerald-700">
                      Rp {c.totalNominal.toLocaleString('id-ID')}
                    </td>
                    <td className="p-3 text-center">
                      <button
                        onClick={() => setDetailModal(c.kelasName)}
                        className="inline-flex items-center gap-1 px-3 py-1 bg-amber-100 hover:bg-amber-200 text-amber-900 font-semibold rounded-lg text-xs"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        Rincian
                      </button>
                    </td>
                  </tr>
                ))}
          </tbody>
        </table>
      </div>

      {/* Detail Modal */}
      {detailModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4">
          <div className="bg-white rounded-2xl p-6 max-w-xl w-full space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="font-bold text-slate-800 text-sm">
                Rincian Setoran Keuangan: {detailModal}
              </h3>
              <button
                onClick={() => setDetailModal(null)}
                className="px-2.5 py-1 text-xs bg-slate-200 hover:bg-slate-300 rounded-lg text-slate-700 font-semibold"
              >
                Tutup
              </button>
            </div>
            <p className="text-xs text-slate-600">
              Menampilkan rincian data keuangan untuk {detailModal} pada bulan {INDONESIAN_MONTH_NAMES[selectedMonth]}.
            </p>
          </div>
        </div>
      )}
    </div>
  );
};
