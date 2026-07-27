import React, { useState } from 'react';
import { useApp } from '../../../context/AppContext';
import { Coins, Save, Printer, FileSpreadsheet, FileText, CheckCircle2, RotateCcw } from 'lucide-react';
import { INDONESIAN_MONTH_NAMES } from '../../../utils/calendarUtils';
import { exportToExcel, exportToPdf } from '../../../utils/exportUtils';

export const SyahriyahJQView: React.FC = () => {
  const { students, syahriyahJQRecords, setSyahriyahJQRecords, currentUser, schoolProfile } = useApp();
  const currentClass = currentUser?.kelas || 'Kelas 1A';
  const myStudents = students.filter((s) => s.kelas === currentClass);

  const [nominalSetting, setNominalSetting] = useState<number>(15000);
  const [printDate, setPrintDate] = useState(new Date().toISOString().split('T')[0]);
  const [message, setMessage] = useState('');

  const monthsAcademicOrder = [
    { name: 'Juli', index: 6 },
    { name: 'Agustus', index: 7 },
    { name: 'September', index: 8 },
    { name: 'Oktober', index: 9 },
    { name: 'November', index: 10 },
    { name: 'Desember', index: 11 },
    { name: 'Januari', index: 0 },
    { name: 'Februari', index: 1 },
    { name: 'Maret', index: 2 },
    { name: 'April', index: 3 },
    { name: 'Mei', index: 4 },
    { name: 'Juni', index: 5 },
  ];

  const handleDateChange = (studentId: string, monthIndex: number, dateVal: string) => {
    const existing = (syahriyahJQRecords || []).find((r) => r.studentId === studentId && r.monthIndex === monthIndex);
    if (!dateVal || dateVal === '' || dateVal === '00/00/0000') {
      if (existing) {
        setSyahriyahJQRecords((syahriyahJQRecords || []).filter((r) => r.id !== existing.id));
      }
    } else {
      if (existing) {
        setSyahriyahJQRecords(
          (syahriyahJQRecords || []).map((r) => (r.id === existing.id ? { ...r, paymentDate: dateVal } : r))
        );
      } else {
        setSyahriyahJQRecords([
          ...(syahriyahJQRecords || []),
          {
            id: `jq-${studentId}-${monthIndex}`,
            studentId,
            monthIndex,
            paymentDate: dateVal,
            amount: nominalSetting,
          },
        ]);
      }
    }
  };

  const handleExportPdf = () => {
    const titleLines = [
      'REKAPITULASI SYAHRIYAH JAM’IYYATUL QURRA’',
      `KELAS ${currentClass.toUpperCase()}`,
      `SEMESTER ${schoolProfile.semester.toUpperCase()} TAHUN AJARAN ${schoolProfile.tahunAjaran}`,
    ];

    const monthHeaders = monthsAcademicOrder.map((m) => m.name.slice(0, 3));
    const headers = ['No', 'NISN', 'Nama Siswa', ...monthHeaders, 'Total Lunas'];

    const rows = myStudents.map((st, idx) => {
      let lunasCount = 0;
      const monthCols = monthsAcademicOrder.map((m) => {
        const rec = (syahriyahJQRecords || []).find((r) => r.studentId === st.id && r.monthIndex === m.index);
        if (rec && rec.paymentDate) {
          lunasCount++;
          return rec.paymentDate.split('-').reverse().join('/');
        }
        return '00/00/0000';
      });

      return [idx + 1, st.nisn, st.name, ...monthCols, `Rp ${(lunasCount * nominalSetting).toLocaleString('id-ID')}`];
    });

    exportToPdf({
      filename: `Syahriyah_JQ_${currentClass.replace(' ', '_')}`,
      titleLines,
      tableHeaders: headers,
      tableRows: rows,
      schoolProfile,
      printDate,
      teacherName: currentUser?.name,
      teacherNip: currentUser?.nip,
      orientation: 'landscape',
    });
  };

  const handleExportExcel = () => {
    const headerLines = [
      'REKAPITULASI SYAHRIYAH JAM’IYYATUL QURRA’',
      `KELAS: ${currentClass}`,
      `SEMESTER: ${schoolProfile.semester} TAHUN AJARAN ${schoolProfile.tahunAjaran}`,
    ];

    const monthHeaders = monthsAcademicOrder.map((m) => m.name);
    const headers = ['No', 'NISN', 'Nama Siswa', ...monthHeaders, 'Total Setoran (Rp)'];

    const rows = myStudents.map((st, idx) => {
      let lunasCount = 0;
      const monthCols = monthsAcademicOrder.map((m) => {
        const rec = (syahriyahJQRecords || []).find((r) => r.studentId === st.id && r.monthIndex === m.index);
        if (rec && rec.paymentDate) {
          lunasCount++;
          return rec.paymentDate;
        }
        return '00/00/0000';
      });

      return [idx + 1, st.nisn, st.name, ...monthCols, lunasCount * nominalSetting];
    });

    exportToExcel(
      `Syahriyah_JQ_${currentClass.replace(' ', '_')}`,
      'Syahriyah JQ',
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
              <h2 className="text-lg font-bold text-slate-800">Syahriyah Jam'iyyatul Qurra' / JQ ({currentClass})</h2>
              <p className="text-xs text-slate-500">
                Pencatatan pembayaran syahriyah bulanan ekstrakurikuler Jam'iyyatul Qurra'
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 rounded-xl text-xs">
              <Printer className="w-3.5 h-3.5 text-slate-500" />
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
              className="flex items-center gap-1.5 px-3 py-2 bg-teal-50 hover:bg-teal-100 text-teal-800 border border-teal-200 font-semibold text-xs rounded-xl transition-colors cursor-pointer"
            >
              <FileSpreadsheet className="w-4 h-4 text-teal-600" />
              Excel
            </button>

            <button
              onClick={handleExportPdf}
              className="flex items-center gap-1.5 px-3 py-2 bg-rose-50 hover:bg-rose-100 text-rose-800 border border-rose-200 font-semibold text-xs rounded-xl transition-colors cursor-pointer"
            >
              <FileText className="w-4 h-4 text-rose-600" />
              PDF Laporan
            </button>
          </div>
        </div>

        {/* Nominal Setting Form */}
        <div className="mt-4 p-4 bg-amber-50/60 border border-amber-200 rounded-xl flex items-center justify-between gap-4 text-xs">
          <div className="flex items-center gap-3">
            <label className="font-bold text-amber-900">Tarif Bulanan Syahriyah JQ (Rp):</label>
            <input
              type="number"
              step={1000}
              value={nominalSetting}
              onChange={(e) => setNominalSetting(parseInt(e.target.value, 10) || 0)}
              className="w-32 px-3 py-1.5 border border-amber-300 rounded-lg font-bold text-slate-800 bg-white"
            />
          </div>
          <button
            onClick={() => {
              setMessage('Tarif Syahriyah JQ berhasil disimpan!');
              setTimeout(() => setMessage(''), 3000);
            }}
            className="flex items-center gap-1.5 px-4 py-1.5 bg-amber-700 hover:bg-amber-800 text-white font-bold rounded-lg shadow-xs cursor-pointer"
          >
            <Save className="w-3.5 h-3.5" />
            Simpan Nominal Tarif
          </button>
        </div>

        {message && (
          <div className="mt-4 p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs flex items-center gap-2 font-medium">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            {message}
          </div>
        )}
      </div>

      {/* Syahriyah Matrix Table */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs overflow-x-auto">
        <h3 className="font-bold text-slate-800 text-sm mb-4">
          Tabel Matriks Pelunasan Syahriyah JQ (Pilih Tanggal Bayar atau Reset ke 00/00/0000)
        </h3>

        <table className="w-full text-left text-xs border-collapse">
          <thead>
            <tr className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200">
              <th className="p-2.5 w-10 text-center" rowSpan={2}>No</th>
              <th className="p-2.5" rowSpan={2}>NISN</th>
              <th className="p-2.5" rowSpan={2}>Nama Lengkap Siswa</th>
              <th className="p-2 text-center bg-amber-100/60 text-amber-950 font-extrabold border-b border-slate-200 uppercase tracking-wider" colSpan={12}>
                BULAN
              </th>
              <th className="p-2.5 text-right" rowSpan={2}>Total Setor</th>
            </tr>
            <tr className="bg-slate-50 text-slate-700 font-semibold text-[11px]">
              {monthsAcademicOrder.map((m) => (
                <th key={m.index} className="p-2 text-center border-r border-slate-200">
                  {m.name.slice(0, 3)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {myStudents.map((st, idx) => {
              let paidMonthsCount = 0;

              return (
                <tr key={st.id} className="hover:bg-slate-50 transition-colors">
                  <td className="p-2.5 text-center text-slate-500 font-medium">{idx + 1}</td>
                  <td className="p-2.5 font-mono text-slate-700 font-semibold">{st.nisn}</td>
                  <td className="p-2.5 font-bold text-slate-800">{st.name}</td>

                  {monthsAcademicOrder.map((m) => {
                    const rec = (syahriyahJQRecords || []).find((r) => r.studentId === st.id && r.monthIndex === m.index);
                    const isPaid = !!rec && !!rec.paymentDate;
                    if (isPaid) paidMonthsCount++;

                    return (
                      <td key={m.index} className="p-1.5 text-center border-r border-slate-100">
                        <div className="flex flex-col items-center gap-1">
                          <input
                            type="date"
                            value={rec?.paymentDate || ''}
                            onChange={(e) => handleDateChange(st.id, m.index, e.target.value)}
                            className={`w-24 px-1 py-0.5 text-[10px] font-bold border rounded-lg text-center cursor-pointer transition-colors ${
                              isPaid
                                ? 'bg-emerald-50 border-emerald-300 text-emerald-900'
                                : 'bg-slate-50 border-slate-200 text-slate-400'
                            }`}
                          />
                          <button
                            onClick={() => handleDateChange(st.id, m.index, '')}
                            className={`text-[9px] font-bold px-1 rounded flex items-center gap-0.5 transition-colors cursor-pointer ${
                              isPaid
                                ? 'text-rose-600 hover:bg-rose-50'
                                : 'text-slate-400 hover:text-slate-600'
                            }`}
                            title="Reset tanggal ke 00/00/0000"
                          >
                            <RotateCcw className="w-2.5 h-2.5" />
                            {isPaid ? 'Reset' : '00/00/0000'}
                          </button>
                        </div>
                      </td>
                    );
                  })}

                  <td className="p-2.5 text-right font-extrabold text-emerald-700 bg-emerald-50/40">
                    Rp {(paidMonthsCount * nominalSetting).toLocaleString('id-ID')}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};
