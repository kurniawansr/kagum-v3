import React, { useState } from 'react';
import { useApp } from '../../../context/AppContext';
import { HeartHandshake, Save, Printer, FileSpreadsheet, FileText, CheckCircle2, Edit2, Lock, Check } from 'lucide-react';
import { INDONESIAN_MONTH_NAMES, getFridaysInMonth } from '../../../utils/calendarUtils';
import { exportToExcel, exportToPdf } from '../../../utils/exportUtils';
import { ApiService } from '../../../services/api';

export const DansosInfaqView: React.FC = () => {
  const { students, dansosRecords, setDansosRecords, currentUser, schoolProfile, logActivity } = useApp();
  const currentClass = currentUser?.kelas || 'Kelas IA';
  const myStudents = students.filter((s) => s.kelas === currentClass);

  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());
  const [printDate, setPrintDate] = useState(new Date().toISOString().split('T')[0]);
  const [message, setMessage] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const baseYear = parseInt(schoolProfile.tahunAjaran.split('/')[0], 10) || 2026;
  const monthYear = selectedMonth >= 6 ? baseYear : baseYear + 1;

  // Get calculated Friday dates for selected month
  const fridayDates = getFridaysInMonth(monthYear, selectedMonth);

  // Mass input nominal state for Friday column
  const [massNominals, setMassNominals] = useState<Record<string, number>>({});

  const handleSetMassNominal = (dateStr: string, amount: number) => {
    setMassNominals((prev) => ({ ...prev, [dateStr]: amount }));
    // Update all students' records for this date
    const updatedRecs = (dansosRecords || []).filter((r) => r.date !== dateStr);
    const newRecords = myStudents.map((st) => ({
      id: `dansos-${st.id}-${dateStr}`,
      studentId: st.id,
      date: dateStr,
      amount,
    }));
    const merged = [...updatedRecs, ...newRecords];
    setDansosRecords(merged);
    setMessage(`Nominal Rp ${amount.toLocaleString('id-ID')} diterapkan untuk tanggal ${dateStr}. Klik Simpan Data di bawah untuk menyimpan.`);
    setTimeout(() => setMessage(''), 4000);
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

  const handleSaveData = async () => {
    setIsSaving(true);
    try {
      localStorage.setItem('kagum_dansos', JSON.stringify(dansosRecords));
      await ApiService.saveKey('kagum_dansos', dansosRecords);
      if (logActivity) {
        logActivity('Simpan Keuangan', `Menyimpan data Dansos & Infaq Jum'at Bulan ${INDONESIAN_MONTH_NAMES[selectedMonth]} ${monthYear} (${currentClass})`, 'Keuangan');
      }
      setIsEditing(false);
      setMessage(`Alhamdulillah, data Dansos & Infaq Jum'at Bulan ${INDONESIAN_MONTH_NAMES[selectedMonth]} berhasil disimpan permanen ke database!`);
      setTimeout(() => setMessage(''), 5000);
    } catch (err) {
      setMessage('Data disimpan ke penyimpanan lokal.');
      setTimeout(() => setMessage(''), 4000);
    } finally {
      setIsSaving(false);
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
        const amt = rec ? rec.amount : 0;
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
        const amt = rec ? rec.amount : 0;
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

        <table className="w-full text-left text-xs border-collapse">
          <thead>
            <tr className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200">
              <th className="p-3 w-10 text-center" rowSpan={3}>No</th>
              <th className="p-3" rowSpan={3}>NISN</th>
              <th className="p-3" rowSpan={3}>Nama Lengkap Siswa</th>
              <th className="p-2 text-center bg-amber-50 border-b border-slate-200 text-amber-900" colSpan={fridayDates.length}>
                Tanggal Hari Jum'at
              </th>
              <th className="p-3 text-right" rowSpan={3}>Total Infaq</th>
            </tr>
            <tr className="bg-amber-50/50 text-amber-950 font-semibold text-[11px]">
              {fridayDates.map((dateStr) => (
                <th key={dateStr} className="p-2 text-center border-r border-slate-200">
                  Tgl {dateStr.split('-')[2]}
                </th>
              ))}
            </tr>
            {/* Input Masal Header Row */}
            <tr className="bg-amber-100/60 border-b border-slate-300 text-[10px]">
              {fridayDates.map((dStr) => {
                const val = massNominals[dStr] ?? '';

                return (
                  <th key={`mass_${dStr}`} className="p-1 border-r border-slate-300 text-center bg-amber-50">
                    <div className="flex items-center justify-center gap-1 mx-auto">
                      <input
                        type="number"
                        step={500}
                        min={0}
                        placeholder="0"
                        value={val}
                        onChange={(e) => {
                          const num = parseInt(e.target.value, 10);
                          setMassNominals((prev) => ({ ...prev, [dStr]: isNaN(num) ? 0 : num }));
                        }}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') handleSetMassNominal(dStr, massNominals[dStr] || 0);
                        }}
                        title={`Nominal masal Tgl ${dStr.split('-')[2]}`}
                        className="w-16 px-1.5 py-1 text-center font-bold text-[11px] rounded bg-white border border-amber-300 text-amber-950 focus:outline-none focus:ring-1 focus:ring-amber-500"
                      />
                      <button
                        onClick={() => handleSetMassNominal(dStr, massNominals[dStr] || 0)}
                        title={`Terapkan nominal ke seluruh siswa Tgl ${dStr.split('-')[2]}`}
                        className="px-2 py-1 bg-amber-700 hover:bg-amber-800 text-white font-extrabold text-[10px] rounded cursor-pointer transition-colors shadow-2xs shrink-0"
                      >
                        Set
                      </button>
                    </div>
                  </th>
                );
              })}
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
                    const amount = rec ? rec.amount : 0;
                    rowTotal += amount;

                    return (
                      <td key={dStr} className="p-2 text-center border-r border-slate-100">
                        <input
                          type="number"
                          step={500}
                          min={0}
                          disabled={!isEditing}
                          placeholder="0"
                          value={amount === 0 ? '' : amount}
                          onChange={(e) => handleStudentAmountChange(st.id, dStr, parseInt(e.target.value, 10) || 0)}
                          className={`w-20 px-2 py-1 border rounded-lg text-center font-bold text-slate-800 transition-colors ${
                            isEditing
                              ? 'bg-white border-amber-300 ring-1 ring-amber-200 focus:ring-amber-500'
                              : 'bg-slate-50/70 border-slate-200 text-slate-700 cursor-not-allowed'
                          }`}
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
                  return sum + (rec ? rec.amount : 0);
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
                    return fSum + (rec ? rec.amount : 0);
                  }, 0);
                }, 0).toLocaleString('id-ID')}
              </td>
            </tr>
          </tbody>
        </table>

        {/* Action Panel Below Table */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-4 border-t border-slate-200 bg-slate-50/80 p-4 rounded-xl">
          <div className="flex items-center gap-2 text-xs">
            {isEditing ? (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full font-bold bg-amber-100 text-amber-800 border border-amber-300 shadow-2xs">
                <Edit2 className="w-3.5 h-3.5 text-amber-700" />
                Mode Edit Aktif — Silakan ubah nominal pada tabel lalu klik Simpan Data
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full font-medium bg-slate-200/80 text-slate-700 border border-slate-300">
                <Lock className="w-3.5 h-3.5 text-slate-500" />
                Mode Lihat (Terkunci) — Klik tombol Edit untuk melakukan perubahan
              </span>
            )}
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
            <button
              type="button"
              onClick={() => setIsEditing(!isEditing)}
              className={`flex items-center gap-1.5 px-4 py-2 font-bold text-xs rounded-xl transition-all cursor-pointer shadow-xs ${
                isEditing
                  ? 'bg-slate-200 hover:bg-slate-300 text-slate-700'
                  : 'bg-amber-500 hover:bg-amber-600 text-white'
              }`}
            >
              <Edit2 className="w-3.5 h-3.5" />
              {isEditing ? 'Batal / Kunci' : 'Edit Data'}
            </button>

            <button
              type="button"
              onClick={handleSaveData}
              disabled={isSaving}
              className="flex items-center gap-2 px-5 py-2 bg-emerald-800 hover:bg-emerald-900 active:scale-95 text-white font-extrabold text-xs rounded-xl shadow-md transition-all cursor-pointer disabled:opacity-50"
            >
              <Save className="w-4 h-4" />
              {isSaving ? 'Menyimpan...' : 'Simpan Data'}
            </button>
          </div>
        </div>

        {message && (
          <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs flex items-center gap-2 font-medium">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{message}</span>
          </div>
        )}
      </div>
    </div>
  );
};
