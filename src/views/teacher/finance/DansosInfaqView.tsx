import React, { useState } from 'react';
import { useApp } from '../../../context/AppContext';
import { HeartHandshake, Save, Printer, FileSpreadsheet, FileText, CheckCircle2 } from 'lucide-react';
import { INDONESIAN_MONTH_NAMES, getFridaysInMonth } from '../../../utils/calendarUtils';
import { exportToExcel, exportToPdf } from '../../../utils/exportUtils';

export const DansosInfaqView: React.FC = () => {
  const { students, dansosRecords, setDansosRecords, currentUser, schoolProfile } = useApp();
  const currentClass = currentUser?.kelas || 'Kelas IA';
  const myStudents = students.filter((s) => s.kelas === currentClass);

  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());
  const [printDate, setPrintDate] = useState(new Date().toISOString().split('T')[0]);
  const [message, setMessage] = useState('');

  const baseYear = parseInt(schoolProfile.tahunAjaran.split('/')[0], 10) || 2026;
  const monthYear = selectedMonth >= 6 ? baseYear : baseYear + 1;

  // Get calculated Friday dates for selected month
  const fridayDates = getFridaysInMonth(monthYear, selectedMonth);

  // Mass input nominal state for Friday column
  const [massNominals, setMassNominals] = useState<Record<string, number>>({});

  const handleSetMassNominal = (dateStr: string, amount: number) => {
    setMassNominals((prev) => ({ ...prev, [dateStr]: amount }));
    // Update all students' records for this date
    const updatedRecs = dansosRecords.filter((r) => r.date !== dateStr);
    const newRecords = myStudents.map((st) => ({
      id: `dansos-${st.id}-${dateStr}`,
      studentId: st.id,
      date: dateStr,
      amount,
    }));
    setDansosRecords([...updatedRecs, ...newRecords]);
    setMessage(`Nominal Rp ${amount.toLocaleString('id-ID')} berhasil diterapkan untuk tanggal ${dateStr}!`);
    setTimeout(() => setMessage(''), 3000);
  };

  const handleStudentAmountChange = (studentId: string, dateStr: string, amount: number) => {
    const existing = (dansosRecords || []).find((r) => r.studentId === studentId && r.date === dateStr);
    if (existing) {
      setDansosRecords((dansosRecords || []).map((r) => (r.id === existing.id ? { ...r, amount } : r)));
    } else {
      setDansosRecords([
        ...(dansosRecords || []),
        {
          id: `dansos-${studentId}-${dateStr}`,
          studentId,
          date: dateStr,
          amount,
        },
      ]);
    }
  };

  const handleExportPdf = () => {
    const titleLines = [
      'REKAPITULASI DANA SOSIAL & INFAQ JUM’AT',
      `KELAS ${currentClass.toUpperCase()}`,
      `TAHUN AJARAN ${schoolProfile.tahunAjaran}`,
      '',
      `BULAN ${INDONESIAN_MONTH_NAMES[selectedMonth].toUpperCase()} TAHUN ${monthYear}`,
    ];

    const fridayHeaders = fridayDates.map((d) => `Tgl ${d.split('-')[2]}`);
    const headers = ['No', 'NISN', 'Nama Siswa', ...fridayHeaders, 'Total (Rp)'];

    let columnTotals = new Array(fridayDates.length).fill(0);
    let grandTotal = 0;

    const rows = myStudents.map((st, idx) => {
      let studentTotal = 0;
      const fridayAmounts = fridayDates.map((d, fIdx) => {
        const rec = (dansosRecords || []).find((r) => r.studentId === st.id && r.date === d);
        const amt = rec ? rec.amount : 2000;
        studentTotal += amt;
        columnTotals[fIdx] += amt;
        return `Rp ${amt.toLocaleString('id-ID')}`;
      });
      grandTotal += studentTotal;

      return [idx + 1, st.nisn, st.name, ...fridayAmounts, `Rp ${studentTotal.toLocaleString('id-ID')}`];
    });

    // Add total row at bottom of PDF
    const totalRow = [
      '',
      '',
      'JUMLAH TOTAL',
      ...columnTotals.map((tot) => `Rp ${tot.toLocaleString('id-ID')}`),
      `Rp ${grandTotal.toLocaleString('id-ID')}`,
    ];
    rows.push(totalRow as any);

    exportToPdf({
      filename: `Dansos_Infaq_${currentClass.replace(' ', '_')}_${selectedMonth + 1}`,
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
      'LAPORAN DANA SOSIAL DAN INFAQ JUM’AT',
      `KELAS: ${currentClass}`,
      `BULAN: ${INDONESIAN_MONTH_NAMES[selectedMonth]} ${monthYear}`,
      `TAHUN AJARAN ${schoolProfile.tahunAjaran}`,
    ];

    const fridayHeaders = fridayDates.map((d) => `Jum'at ${d.split('-')[2]}`);
    const headers = ['No', 'NISN', 'Nama Siswa', ...fridayHeaders, 'Total Nominal'];

    const rows = myStudents.map((st, idx) => {
      let studentTotal = 0;
      const fridayAmounts = fridayDates.map((d) => {
        const rec = (dansosRecords || []).find((r) => r.studentId === st.id && r.date === d);
        const amt = rec ? rec.amount : 2000;
        studentTotal += amt;
        return amt;
      });

      return [idx + 1, st.nisn, st.name, ...fridayAmounts, studentTotal];
    });

    exportToExcel(
      `Dansos_Infaq_${currentClass.replace(' ', '_')}_${selectedMonth + 1}`,
      'Dansos Infaq',
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
              <HeartHandshake className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-800">Dana Sosial & Infaq Jum'at ({currentClass})</h2>
              <p className="text-xs text-slate-500">
                Pencatatan infaq mingguan hari Jum'at dan dana sosial kelas secara sistematis
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
        <div className="mt-4 p-4 bg-slate-50 rounded-xl border border-slate-200 text-xs max-w-md">
          <label className="block text-[11px] font-semibold text-slate-700 mb-1">Pilih Bulan Pembelajaran</label>
          <select
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(parseInt(e.target.value, 10))}
            className="w-full px-3 py-1.5 border border-slate-200 rounded-lg bg-white font-bold text-slate-800"
          >
            {INDONESIAN_MONTH_NAMES.map((m, idx) => (
              <option key={idx} value={idx}>
                {m}
              </option>
            ))}
          </select>
        </div>

        {message && (
          <div className="mt-4 p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs flex items-center gap-2 font-medium">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            {message}
          </div>
        )}
      </div>

      {/* Dansos Table */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs overflow-x-auto space-y-4">
        <h3 className="font-bold text-slate-800 text-sm">
          Tabel Infaq Jum'at Bulan {INDONESIAN_MONTH_NAMES[selectedMonth]} {monthYear}
        </h3>

        {/* Bulk Input Form Below Table Header */}
        <div className="p-4 bg-amber-50/80 border border-amber-200/80 rounded-2xl space-y-3">
          <div className="flex items-center justify-between">
            <span className="font-extrabold text-xs text-amber-900 uppercase tracking-wider">
              ⚡ Form Input Masal Infaq Jum'at (Setor Otomatis)
            </span>
            <span className="text-[10px] text-amber-700 font-medium">Isi nominal infaq sekaligus untuk seluruh siswa</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 items-end">
            {fridayDates.map((dStr) => (
              <div key={dStr} className="p-2 bg-white rounded-xl border border-amber-200">
                <label className="block text-[10px] font-bold text-amber-900 mb-1">
                  Jum'at {dStr.split('-')[2]} {INDONESIAN_MONTH_NAMES[selectedMonth]}
                </label>
                <div className="flex items-center gap-1.5">
                  <input
                    type="number"
                    step={500}
                    placeholder="2000"
                    value={massNominals[dStr] || ''}
                    onChange={(e) => setMassNominals({ ...massNominals, [dStr]: parseInt(e.target.value, 10) || 0 })}
                    className="w-full px-2 py-1 border border-slate-200 rounded-lg text-center font-bold text-xs text-slate-800 bg-slate-50"
                  />
                  <button
                    onClick={() => handleSetMassNominal(dStr, massNominals[dStr] || 2000)}
                    className="px-3 py-1 bg-amber-700 hover:bg-amber-800 text-white font-extrabold text-xs rounded-lg shadow-xs transition-colors cursor-pointer shrink-0"
                  >
                    Set
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        <table className="w-full text-left text-xs border-collapse">
          <thead>
            <tr className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200">
              <th className="p-3 w-10 text-center" rowSpan={2}>No</th>
              <th className="p-3" rowSpan={2}>NISN</th>
              <th className="p-3" rowSpan={2}>Nama Lengkap Siswa</th>
              <th className="p-2 text-center bg-amber-50 border-b border-slate-200 text-amber-900" colSpan={fridayDates.length}>
                Tanggal Hari Jum'at
              </th>
              <th className="p-3 text-right" rowSpan={2}>Total Infaq</th>
            </tr>
            <tr className="bg-amber-50/50 text-amber-950 font-semibold text-[11px]">
              {fridayDates.map((dateStr) => (
                <th key={dateStr} className="p-2 text-center border-r border-slate-200">
                  Tgl {dateStr.split('-')[2]}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {myStudents.map((st, idx) => {
              let rowTotal = 0;

              return (
                <tr key={st.id} className="hover:bg-slate-50 transition-colors">
                  <td className="p-3 text-center text-slate-500 font-medium">{idx + 1}</td>
                  <td className="p-3 font-mono text-slate-700 font-semibold">{st.nisn}</td>
                  <td className="p-3 font-bold text-slate-800">{st.name}</td>

                  {fridayDates.map((dStr) => {
                    const rec = (dansosRecords || []).find((r) => r.studentId === st.id && r.date === dStr);
                    const amount = rec ? rec.amount : 2000;
                    rowTotal += amount;

                    return (
                      <td key={dStr} className="p-2 text-center border-r border-slate-100">
                        <input
                          type="number"
                          step={500}
                          value={amount}
                          onChange={(e) => handleStudentAmountChange(st.id, dStr, parseInt(e.target.value, 10) || 0)}
                          className="w-20 px-2 py-1 border border-slate-200 rounded-lg text-center font-bold text-slate-800 bg-white"
                        />
                      </td>
                    );
                  })}

                  <td className="p-3 text-right font-extrabold text-emerald-700 bg-emerald-50/40">
                    Rp {rowTotal.toLocaleString('id-ID')}
                  </td>
                </tr>
              );
            })}

            {/* Total Row */}
            <tr className="bg-amber-100/70 font-extrabold border-t-2 border-amber-300 text-amber-950">
              <td colSpan={3} className="p-3 text-right">
                JUMLAH TOTAL (Rp):
              </td>
              {fridayDates.map((dStr) => {
                const columnTotal = myStudents.reduce((sum, st) => {
                  const rec = (dansosRecords || []).find((r) => r.studentId === st.id && r.date === dStr);
                  return sum + (rec ? rec.amount : 2000);
                }, 0);
                return (
                  <td key={dStr} className="p-2 text-center text-xs text-amber-900 border-r border-amber-200">
                    Rp {columnTotal.toLocaleString('id-ID')}
                  </td>
                );
              })}
              <td className="p-3 text-right text-emerald-800 bg-emerald-100/60 font-black">
                Rp {myStudents.reduce((grandSum, st) => {
                  return grandSum + fridayDates.reduce((fSum, dStr) => {
                    const rec = (dansosRecords || []).find((r) => r.studentId === st.id && r.date === dStr);
                    return fSum + (rec ? rec.amount : 2000);
                  }, 0);
                }, 0).toLocaleString('id-ID')}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
};
