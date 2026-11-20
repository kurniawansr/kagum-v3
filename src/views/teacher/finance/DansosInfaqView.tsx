import React, { useState, useMemo } from 'react';
import { useApp } from '../../../context/AppContext';
import { DansosRecord, DansosExpense } from '../../../types';
import {
  HeartHandshake,
  Printer,
  FileSpreadsheet,
  FileText,
  CheckCircle2,
  Trash2,
  Plus,
  Zap,
  Calendar,
  DollarSign,
  TrendingUp,
  ArrowDownRight,
  ArrowUpRight,
  Search,
  Check,
  X,
  Users,
  Sparkles
} from 'lucide-react';
import { INDONESIAN_MONTH_NAMES, getFridaysInMonth } from '../../../utils/calendarUtils';
import { exportToExcel, exportToPdf } from '../../../utils/exportUtils';

export const DansosInfaqView: React.FC = () => {
  const {
    students,
    dansosRecords = [],
    setDansosRecords,
    dansosExpenses = [],
    setDansosExpenses,
    currentUser,
    schoolProfile,
    logActivity,
  } = useApp();

  const currentClass = currentUser?.kelas || 'Kelas IA';
  const myStudents = useMemo(() => {
    return (students || []).filter((s) => s.kelas === currentClass);
  }, [students, currentClass]);

  const [selectedMonth, setSelectedMonth] = useState<number>(new Date().getMonth());
  const [printDate, setPrintDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [activeTab, setActiveTab] = useState<'infaq' | 'santunan' | 'rekap'>('infaq');
  const [searchQuery, setSearchQuery] = useState('');
  const [toastMessage, setToastMessage] = useState('');

  // Form Tambah Santunan Modal
  const [showExpenseModal, setShowExpenseModal] = useState(false);
  const [expTitle, setExpTitle] = useState('');
  const [expRecipient, setExpRecipient] = useState('');
  const [expAmount, setExpAmount] = useState<number>(0);
  const [expDate, setExpDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [expNote, setExpNote] = useState('');

  // Nominal Cepat Massal per Jum'at
  const [quickNominal, setQuickNominal] = useState<number>(3000);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(''), 3500);
  };

  const baseYear = parseInt(schoolProfile.tahunAjaran.split('/')[0], 10) || 2026;
  const monthYear = selectedMonth >= 6 ? baseYear : baseYear + 1;

  // Tanggal-tanggal hari Jum'at di bulan yang dipilih
  const fridayDates = useMemo(() => {
    return getFridaysInMonth(monthYear, selectedMonth);
  }, [monthYear, selectedMonth]);

  // Santunan untuk kelas ini
  const myDansosExpenses = useMemo(() => {
    return (dansosExpenses || []).filter(
      (e) => !e.kelas || e.kelas === currentClass || e.kelas === 'Semua'
    );
  }, [dansosExpenses, currentClass]);

  // Perhitungan Metrik Kas Sosial
  const metrics = useMemo(() => {
    // Total infaq bulan ini
    let monthTotal = 0;
    const fridayTotals: Record<string, number> = {};
    fridayDates.forEach((d) => { fridayTotals[d] = 0; });

    myStudents.forEach((st) => {
      fridayDates.forEach((d) => {
        const rec = dansosRecords.find((r) => r.studentId === st.id && r.date === d);
        const amt = rec?.amount || 0;
        monthTotal += amt;
        fridayTotals[d] = (fridayTotals[d] || 0) + amt;
      });
    });

    // Total santunan/pengeluaran sosial
    const totalExpenses = myDansosExpenses.reduce((sum, e) => sum + (e.amount || 0), 0);
    const balance = monthTotal - totalExpenses;
    const averagePerFriday = fridayDates.length > 0 ? Math.round(monthTotal / fridayDates.length) : 0;

    return {
      monthTotal,
      fridayTotals,
      totalExpenses,
      balance,
      averagePerFriday,
    };
  }, [myStudents, fridayDates, dansosRecords, myDansosExpenses]);

  // Siswa difilter pencarian
  const filteredStudents = useMemo(() => {
    if (!searchQuery.trim()) return myStudents;
    const q = searchQuery.toLowerCase();
    return myStudents.filter((s) => s.name.toLowerCase().includes(q) || s.nisn.includes(q));
  }, [myStudents, searchQuery]);

  // Handler Ubah Setoran Siswa (Auto-save)
  const handleAmountChange = (studentId: string, dateStr: string, amount: number) => {
    const existingIndex = dansosRecords.findIndex(
      (r) => r.studentId === studentId && r.date === dateStr
    );

    if (existingIndex >= 0) {
      const updated = [...dansosRecords];
      if (amount <= 0) {
        updated.splice(existingIndex, 1);
      } else {
        updated[existingIndex] = { ...updated[existingIndex], amount };
      }
      setDansosRecords(updated);
    } else if (amount > 0) {
      const newRec: DansosRecord = {
        id: `dansos-${studentId}-${dateStr}`,
        studentId,
        date: dateStr,
        amount,
      };
      setDansosRecords([...dansosRecords, newRec]);
    }
  };

  // 1-Klik Terapkan Nominal ke Seluruh Siswa pada Tanggal Tertentu
  const handleApplyMassFriday = (dateStr: string, amount: number) => {
    const updated = dansosRecords.filter((r) => r.date !== dateStr);
    const newRecords: DansosRecord[] = myStudents.map((st) => ({
      id: `dansos-${st.id}-${dateStr}`,
      studentId: st.id,
      date: dateStr,
      amount,
    }));

    setDansosRecords([...updated, ...newRecords]);
    showToast(`Berhasil menerapkan Rp ${amount.toLocaleString('id-ID')} ke seluruh siswa untuk Jum'at ${dateStr.split('-')[2]}!`);
    logActivity?.('Infaq Massal', `Terapkan infaq Rp ${amount} seluruh kelas untuk tgl ${dateStr}`, 'Keuangan', 'Sukses');
  };

  // Kosongkan/Reset 1 Kolom Jum'at
  const handleResetFriday = (dateStr: string) => {
    if (confirm(`Kosongkan catatan infaq untuk tanggal ${dateStr}?`)) {
      setDansosRecords(dansosRecords.filter((r) => r.date !== dateStr));
      showToast(`Data infaq tanggal ${dateStr} telah direset.`);
    }
  };

  // Simpan Santunan / Penyaluran Sosial
  const handleSaveExpense = (e: React.FormEvent) => {
    e.preventDefault();
    if (!expTitle.trim() || expAmount <= 0) return;

    const newExp: DansosExpense = {
      id: `dsexp-${Date.now()}`,
      title: expTitle,
      recipient: expRecipient,
      amount: expAmount,
      date: expDate || new Date().toISOString().split('T')[0],
      kelas: currentClass,
      note: expNote,
    };

    setDansosExpenses([...(dansosExpenses || []), newExp]);
    setExpTitle('');
    setExpRecipient('');
    setExpAmount(0);
    setExpNote('');
    setShowExpenseModal(false);
    showToast(`Penyaluran santunan "${expTitle}" berhasil dicatat!`);
    logActivity?.('Santunan Sosial', `Catat santunan sosial: ${expTitle} (Rp ${expAmount})`, 'Keuangan', 'Sukses');
  };

  const handleDeleteExpense = (id: string) => {
    if (confirm('Hapus rincian santunan sosial ini?')) {
      setDansosExpenses((dansosExpenses || []).filter((e) => e.id !== id));
      showToast('Data santunan sosial berhasil dihapus.');
    }
  };

  // Ekspor PDF
  const handleExportPdf = () => {
    const titleLines = [
      'LAPORAN DANA SOSIAL & INFAQ JUM’AT',
      `KELAS: ${currentClass.toUpperCase()} | BULAN: ${INDONESIAN_MONTH_NAMES[selectedMonth].toUpperCase()} ${monthYear}`,
      `TAHUN AJARAN ${schoolProfile.tahunAjaran}`,
    ];

    const fridayHeaders = fridayDates.map((d) => `Jum'at ${d.split('-')[2]}`);
    const headers = ['No', 'NISN', 'Nama Siswa', ...fridayHeaders, 'Total Infaq'];

    const rows = myStudents.map((st, idx) => {
      let studentTotal = 0;
      const amounts = fridayDates.map((d) => {
        const rec = dansosRecords.find((r) => r.studentId === st.id && r.date === d);
        const amt = rec?.amount || 0;
        studentTotal += amt;
        return amt > 0 ? `Rp ${amt.toLocaleString('id-ID')}` : '-';
      });

      return [idx + 1, st.nisn, st.name, ...amounts, `Rp ${studentTotal.toLocaleString('id-ID')}`];
    });

    // Baris Total
    const totalsRow = [
      '',
      '',
      'JUMLAH TOTAL PER JUM’AT',
      ...fridayDates.map((d) => `Rp ${(metrics.fridayTotals[d] || 0).toLocaleString('id-ID')}`),
      `Rp ${metrics.monthTotal.toLocaleString('id-ID')}`,
    ];
    rows.push(totalsRow as any);

    exportToPdf({
      filename: `Dansos_Infaq_${currentClass.replace(/\s+/g, '_')}_${INDONESIAN_MONTH_NAMES[selectedMonth]}`,
      titleLines,
      tableHeaders: headers,
      tableRows: rows,
      schoolProfile,
      printDate,
      teacherName: currentUser?.name,
      teacherNip: currentUser?.nip,
      orientation: fridayDates.length > 4 ? 'landscape' : 'portrait',
    });
  };

  // Ekspor Excel
  const handleExportExcel = () => {
    const headerLines = [
      'LAPORAN DANA SOSIAL DAN INFAQ JUM’AT',
      `KELAS: ${currentClass} | TAHUN AJARAN ${schoolProfile.tahunAjaran}`,
      `BULAN: ${INDONESIAN_MONTH_NAMES[selectedMonth]} ${monthYear} | TOTAL: Rp ${metrics.monthTotal.toLocaleString('id-ID')}`,
    ];

    const fridayHeaders = fridayDates.map((d) => `Jum'at ${d.split('-')[2]}`);
    const headers = ['No', 'NISN', 'Nama Siswa', ...fridayHeaders, 'Total Nominal (Rp)'];

    const rows = myStudents.map((st, idx) => {
      let studentTotal = 0;
      const amounts = fridayDates.map((d) => {
        const rec = dansosRecords.find((r) => r.studentId === st.id && r.date === d);
        const amt = rec?.amount || 0;
        studentTotal += amt;
        return amt;
      });

      return [idx + 1, st.nisn, st.name, ...amounts, studentTotal];
    });

    exportToExcel(
      `Dansos_Infaq_${currentClass.replace(/\s+/g, '_')}_${INDONESIAN_MONTH_NAMES[selectedMonth]}`,
      'Infaq Jumat',
      headerLines,
      headers,
      rows
    );
  };

  return (
    <div className="space-y-6">
      {/* Toast Alert */}
      {toastMessage && (
        <div className="fixed top-6 right-6 z-50 flex items-center gap-3 bg-amber-950 text-white px-5 py-3 rounded-2xl shadow-xl border border-amber-700 animate-in fade-in slide-in-from-top-4">
          <CheckCircle2 className="w-5 h-5 text-amber-400 shrink-0" />
          <span className="text-xs font-semibold">{toastMessage}</span>
        </div>
      )}

      {/* Header Utama & Filter Bulan */}
      <div className="bg-white rounded-3xl border border-slate-200/80 p-6 shadow-xs">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-5 border-b border-slate-100">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-amber-600 to-yellow-500 text-white flex items-center justify-center font-bold shadow-md shadow-amber-600/20">
              <HeartHandshake className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-black text-slate-800 tracking-tight">Dana Sosial & Infaq Jum'at</h2>
                <span className="px-2.5 py-0.5 bg-amber-100 text-amber-900 text-[11px] font-black rounded-full uppercase tracking-wider">
                  {currentClass}
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Pengelolaan infaq mingguan siswa, catatan santunan sosial kelas, dan arus kas sosial transparan.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-1.5 px-3 py-2 bg-slate-100/80 rounded-xl text-xs border border-slate-200/60">
              <Printer className="w-3.5 h-3.5 text-slate-500" />
              <span className="font-semibold text-slate-600">Cetak:</span>
              <input
                type="date"
                value={printDate}
                onChange={(e) => setPrintDate(e.target.value)}
                className="bg-transparent font-bold text-slate-800 focus:outline-none cursor-pointer"
              />
            </div>

            <button
              onClick={handleExportExcel}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-teal-50 hover:bg-teal-100 text-teal-800 border border-teal-200/80 font-bold text-xs rounded-xl transition-colors cursor-pointer"
            >
              <FileSpreadsheet className="w-4 h-4 text-teal-600" />
              Excel
            </button>

            <button
              onClick={handleExportPdf}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-rose-50 hover:bg-rose-100 text-rose-800 border border-rose-200/80 font-bold text-xs rounded-xl transition-colors cursor-pointer"
            >
              <FileText className="w-4 h-4 text-rose-600" />
              Cetak PDF
            </button>
          </div>
        </div>

        {/* Pemilihan Bulan Pembelajaran */}
        <div className="mt-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <label className="text-xs font-bold text-slate-700 whitespace-nowrap">Bulan Pembelajaran:</label>
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(parseInt(e.target.value, 10))}
              className="px-3.5 py-1.5 bg-slate-50 border border-slate-300 rounded-xl font-extrabold text-xs text-slate-800 focus:outline-amber-600 focus:bg-white cursor-pointer"
            >
              {INDONESIAN_MONTH_NAMES.map((m, idx) => (
                <option key={idx} value={idx}>
                  {m} ({idx >= 6 ? baseYear : baseYear + 1})
                </option>
              ))}
            </select>
          </div>

          <div className="text-[11px] font-bold text-emerald-700 flex items-center gap-1.5">
            <CheckCircle2 className="w-4 h-4" />
            <span>Tersimpan otomatis secara real-time ke database</span>
          </div>
        </div>
      </div>

      {/* DASHBOARD METRIK KAS SOSIAL */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Total Infaq Terkumpul */}
        <div className="bg-gradient-to-br from-amber-50 to-yellow-50/50 rounded-3xl border border-amber-200/80 p-5 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-amber-900 uppercase tracking-wider">Total Infaq Bulan Ini</span>
            <div className="w-8 h-8 rounded-xl bg-amber-600/10 text-amber-700 flex items-center justify-center">
              <ArrowDownRight className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2">
            <div className="text-2xl font-black text-amber-950">
              Rp {metrics.monthTotal.toLocaleString('id-ID')}
            </div>
            <p className="text-xs text-amber-800 mt-1 font-semibold">
              {fridayDates.length} hari Jum'at di bulan {INDONESIAN_MONTH_NAMES[selectedMonth]}
            </p>
          </div>
        </div>

        {/* Card 2: Rata-rata per Jum'at */}
        <div className="bg-white rounded-3xl border border-slate-200 p-5 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Rata-rata Mingguan</span>
            <div className="w-8 h-8 rounded-xl bg-teal-50 text-teal-700 flex items-center justify-center">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2">
            <div className="text-2xl font-black text-slate-800">
              Rp {metrics.averagePerFriday.toLocaleString('id-ID')}
            </div>
            <p className="text-xs text-slate-500 mt-1 font-medium">
              Rerata per Jum'at ({myStudents.length} siswa)
            </p>
          </div>
        </div>

        {/* Card 3: Santunan Disalurkan */}
        <div className="bg-white rounded-3xl border border-slate-200 p-5 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Santunan Disalurkan</span>
            <div className="w-8 h-8 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center">
              <ArrowUpRight className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2">
            <div className="text-2xl font-black text-rose-900">
              Rp {metrics.totalExpenses.toLocaleString('id-ID')}
            </div>
            <p className="text-xs text-slate-500 mt-1 font-medium">
              {myDansosExpenses.length} santunan sosial kelas
            </p>
          </div>
        </div>

        {/* Card 4: Sisa Saldo Kas Sosial */}
        <div className="bg-white rounded-3xl border border-slate-200 p-5 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Sisa Kas Sosial Kelas</span>
            <div className="w-8 h-8 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2">
            <div className={`text-2xl font-black ${metrics.balance >= 0 ? 'text-teal-800' : 'text-rose-600'}`}>
              Rp {metrics.balance.toLocaleString('id-ID')}
            </div>
            <p className="text-xs text-slate-500 mt-1 font-medium">
              {metrics.balance >= 0 ? 'Kas surplus siap disalurkan' : 'Perlu penyesuaian'}
            </p>
          </div>
        </div>
      </div>

      {/* SUB-TABS: "MATRIKS INFAQ", "SANTUNAN SOSIAL", "REKAP" */}
      <div className="bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-xs">
        <div className="flex border-b border-slate-200 bg-slate-50/70 px-4 pt-2">
          <button
            onClick={() => setActiveTab('infaq')}
            className={`flex items-center gap-2 px-5 py-3 border-b-2 font-black text-xs transition-all cursor-pointer ${
              activeTab === 'infaq'
                ? 'border-amber-600 text-amber-900 bg-white rounded-t-2xl shadow-xs'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Calendar className="w-4 h-4" />
            Matriks Infaq Jum'at ({fridayDates.length} Pekan)
          </button>

          <button
            onClick={() => setActiveTab('santunan')}
            className={`flex items-center gap-2 px-5 py-3 border-b-2 font-black text-xs transition-all cursor-pointer ${
              activeTab === 'santunan'
                ? 'border-amber-600 text-amber-900 bg-white rounded-t-2xl shadow-xs'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <HeartHandshake className="w-4 h-4 text-rose-500" />
            Buku Santunan Sosial ({myDansosExpenses.length})
          </button>

          <button
            onClick={() => setActiveTab('rekap')}
            className={`flex items-center gap-2 px-5 py-3 border-b-2 font-black text-xs transition-all cursor-pointer ${
              activeTab === 'rekap'
                ? 'border-amber-600 text-amber-900 bg-white rounded-t-2xl shadow-xs'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <FileText className="w-4 h-4 text-teal-600" />
            Rekap Arus Kas Sosial
          </button>
        </div>

        {/* TAB 1: MATRIKS INFAQ JUM'AT */}
        {activeTab === 'infaq' && (
          <div className="p-5 space-y-4">
            {/* Toolbar Cepat Infaq */}
            <div className="bg-amber-50/60 p-4 rounded-2xl border border-amber-200/70 flex flex-col md:flex-row md:items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-amber-700 text-white flex items-center justify-center font-bold">
                  <Zap className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs font-black text-amber-950 uppercase tracking-wider">
                    Preset Setoran Cepat
                  </h4>
                  <p className="text-[11px] text-amber-800">
                    Gunakan tombol 'Terapkan' pada header kolom hari Jum'at untuk mengisi seluruh siswa serentak
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-slate-700">Preset Nominal:</span>
                {[3000, 4000, 5000].map((nom) => (
                  <button
                    key={nom}
                    onClick={() => setQuickNominal(nom)}
                    className={`px-3 py-1 rounded-xl text-xs font-black transition-all cursor-pointer ${
                      quickNominal === nom
                        ? 'bg-amber-800 text-white shadow-xs'
                        : 'bg-white border border-amber-300 text-amber-900 hover:bg-amber-100'
                    }`}
                  >
                    Rp {nom.toLocaleString('id-ID')}
                  </button>
                ))}
              </div>
            </div>

            {/* Pencarian Siswa */}
            <div className="relative w-full sm:w-72">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Cari nama siswa..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:outline-amber-600 focus:bg-white"
              />
            </div>

            {/* Tabel Matrix Infaq */}
            <div className="border border-slate-200 rounded-2xl overflow-x-auto shadow-2xs">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-100 text-slate-700 font-extrabold border-b border-slate-200">
                    <th className="p-3 w-10 text-center" rowSpan={2}>No</th>
                    <th className="p-3 w-28" rowSpan={2}>NISN</th>
                    <th className="p-3 min-w-[180px]" rowSpan={2}>Nama Lengkap Siswa</th>
                    <th
                      className="p-2 text-center bg-amber-100/70 text-amber-950 font-black border-b border-amber-200"
                      colSpan={fridayDates.length}
                    >
                      Hari Jum'at ({INDONESIAN_MONTH_NAMES[selectedMonth]} {monthYear})
                    </th>
                    <th className="p-3 text-right w-32" rowSpan={2}>Total Infaq</th>
                  </tr>
                  <tr className="bg-amber-50/50 text-amber-950 font-bold text-[11px] border-b border-slate-200">
                    {fridayDates.map((d) => (
                      <th key={d} className="p-2 text-center border-l border-amber-200/80 min-w-[110px]">
                        <div>Jum'at {d.split('-')[2]}</div>
                        <div className="mt-1 flex items-center justify-center gap-1">
                          <button
                            onClick={() => handleApplyMassFriday(d, quickNominal)}
                            className="px-2 py-0.5 bg-amber-700 hover:bg-amber-800 text-white rounded text-[10px] font-extrabold cursor-pointer transition-colors"
                            title={`Terapkan Rp ${quickNominal.toLocaleString('id-ID')} ke semua`}
                          >
                            + Semua
                          </button>
                          <button
                            onClick={() => handleResetFriday(d)}
                            className="p-0.5 text-slate-400 hover:text-rose-600 rounded cursor-pointer"
                            title="Reset kolom"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredStudents.length === 0 ? (
                    <tr>
                      <td colSpan={4 + fridayDates.length} className="p-8 text-center text-slate-400">
                        Tidak ada siswa yang ditemukan.
                      </td>
                    </tr>
                  ) : (
                    filteredStudents.map((st, idx) => {
                      let studentSum = 0;

                      return (
                        <tr key={st.id} className="hover:bg-amber-50/30 transition-colors">
                          <td className="p-3 text-center text-slate-400 font-bold">{idx + 1}</td>
                          <td className="p-3 font-mono text-slate-500 text-[11px]">{st.nisn}</td>
                          <td className="p-3 font-bold text-slate-800">{st.name}</td>
                          {fridayDates.map((d) => {
                            const rec = dansosRecords.find((r) => r.studentId === st.id && r.date === d);
                            const amt = rec?.amount || 0;
                            studentSum += amt;

                            return (
                              <td key={d} className="p-2 text-center border-l border-slate-100">
                                <input
                                  type="number"
                                  step={500}
                                  value={amt || ''}
                                  placeholder="0"
                                  onChange={(e) =>
                                    handleAmountChange(st.id, d, parseInt(e.target.value, 10) || 0)
                                  }
                                  className="w-20 px-2 py-1 bg-white border border-slate-200 rounded-lg text-center font-bold text-slate-800 text-xs focus:outline-amber-600"
                                />
                              </td>
                            );
                          })}
                          <td className="p-3 text-right font-black text-amber-950">
                            Rp {studentSum.toLocaleString('id-ID')}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
                <tfoot>
                  <tr className="bg-amber-100/60 font-black text-amber-950 border-t-2 border-amber-300">
                    <td colSpan={3} className="p-3 text-right uppercase tracking-wider text-[11px]">
                      Total Infaq Terkumpul:
                    </td>
                    {fridayDates.map((d) => (
                      <td key={d} className="p-3 text-center border-l border-amber-200 font-black text-amber-900">
                        Rp {(metrics.fridayTotals[d] || 0).toLocaleString('id-ID')}
                      </td>
                    ))}
                    <td className="p-3 text-right text-sm font-black text-amber-950">
                      Rp {metrics.monthTotal.toLocaleString('id-ID')}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        )}

        {/* TAB 2: BUKU SANTUNAN SOSIAL */}
        {activeTab === 'santunan' && (
          <div className="p-5 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
              <div>
                <h3 className="font-extrabold text-sm text-slate-800 flex items-center gap-2">
                  <HeartHandshake className="w-4 h-4 text-rose-600" />
                  Buku Penyaluran & Santunan Dana Sosial
                </h3>
                <p className="text-xs text-slate-500">
                  Catat setiap santunan (siswa sakit, duka cita, atau setoran ke UPZ/Madrasah) agar saldo kas sosial selalu akurat.
                </p>
              </div>

              <button
                onClick={() => setShowExpenseModal(true)}
                className="flex items-center gap-1.5 px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs rounded-xl shadow-xs transition-colors cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                Catat Santunan Baru
              </button>
            </div>

            {/* Tabel Santunan */}
            <div className="border border-slate-200 rounded-2xl overflow-x-auto shadow-2xs">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-100 text-slate-700 font-extrabold border-b border-slate-200">
                    <th className="p-3 w-12 text-center">No.</th>
                    <th className="p-3 w-32 text-center">Tanggal</th>
                    <th className="p-3">Peruntukan / Keperluan Santunan</th>
                    <th className="p-3 w-48">Penerima Santunan</th>
                    <th className="p-3">Catatan</th>
                    <th className="p-3 text-right w-36">Nominal (Rp)</th>
                    <th className="p-3 text-center w-20">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {myDansosExpenses.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="p-8 text-center text-slate-400">
                        Belum ada catatan penyaluran santunan sosial.
                      </td>
                    </tr>
                  ) : (
                    myDansosExpenses.map((exp, idx) => (
                      <tr key={exp.id} className="hover:bg-slate-50 transition-colors">
                        <td className="p-3 text-center text-slate-400 font-bold">{idx + 1}</td>
                        <td className="p-3 text-center font-semibold text-slate-700">
                          {exp.date ? exp.date.split('-').reverse().join('/') : '-'}
                        </td>
                        <td className="p-3 font-bold text-slate-800">{exp.title}</td>
                        <td className="p-3 font-semibold text-slate-700">{exp.recipient || '-'}</td>
                        <td className="p-3 text-slate-500 italic">{exp.note || '-'}</td>
                        <td className="p-3 text-right font-black text-rose-700">
                          Rp {exp.amount.toLocaleString('id-ID')}
                        </td>
                        <td className="p-3 text-center">
                          <button
                            onClick={() => handleDeleteExpense(exp.id)}
                            className="p-1.5 text-rose-500 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                            title="Hapus"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
                <tfoot>
                  <tr className="bg-slate-50 font-black text-slate-800 border-t border-slate-200">
                    <td colSpan={5} className="p-3 text-right uppercase tracking-wider text-[11px]">
                      Total Santunan Dikeluarkan:
                    </td>
                    <td className="p-3 text-right text-rose-700 text-sm">
                      Rp {metrics.totalExpenses.toLocaleString('id-ID')}
                    </td>
                    <td></td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        )}

        {/* TAB 3: REKAP ARUS KAS SOSIAL */}
        {activeTab === 'rekap' && (
          <div className="p-5 space-y-5">
            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5 space-y-4">
              <h3 className="font-extrabold text-sm text-slate-800 uppercase tracking-wider">
                Neraca Rekapitulasi Kas Sosial ({currentClass})
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="p-4 bg-amber-100/60 rounded-xl border border-amber-200">
                  <span className="text-[11px] font-bold text-amber-900 uppercase">1. Total Infaq Terkumpul</span>
                  <div className="text-xl font-black text-amber-950 mt-1">
                    Rp {metrics.monthTotal.toLocaleString('id-ID')}
                  </div>
                  <span className="text-xs text-amber-800 font-semibold">
                    Bulan {INDONESIAN_MONTH_NAMES[selectedMonth]} {monthYear}
                  </span>
                </div>

                <div className="p-4 bg-rose-100/60 rounded-xl border border-rose-200">
                  <span className="text-[11px] font-bold text-rose-900 uppercase">2. Total Santunan Keluar</span>
                  <div className="text-xl font-black text-rose-950 mt-1">
                    Rp {metrics.totalExpenses.toLocaleString('id-ID')}
                  </div>
                  <span className="text-xs text-rose-800 font-semibold">
                    {myDansosExpenses.length} penyaluran sosial
                  </span>
                </div>

                <div className="p-4 bg-teal-100/60 rounded-xl border border-teal-200">
                  <span className="text-[11px] font-bold text-teal-900 uppercase">3. Sisa Kas Sosial</span>
                  <div className="text-xl font-black text-teal-950 mt-1">
                    Rp {metrics.balance.toLocaleString('id-ID')}
                  </div>
                  <span className="text-xs text-teal-800 font-semibold">
                    {metrics.balance >= 0 ? 'Surplus / Kas Siap Pakai' : 'Defisit Kas'}
                  </span>
                </div>
              </div>

              <div className="pt-2 flex justify-end">
                <button
                  onClick={handleExportPdf}
                  className="flex items-center gap-1.5 px-4 py-2 bg-amber-800 hover:bg-amber-900 text-white font-bold text-xs rounded-xl shadow-xs transition-colors cursor-pointer"
                >
                  <FileText className="w-4 h-4 text-amber-200" />
                  Cetak Berita Acara & Rekapitulasi (PDF)
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* MODAL: CATAT SANTUNAN SOSIAL BARU */}
      {showExpenseModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl border border-slate-200 max-w-md w-full p-6 shadow-2xl animate-in zoom-in-95">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <h3 className="font-extrabold text-base text-slate-800 flex items-center gap-2">
                <HeartHandshake className="w-5 h-5 text-rose-600" />
                Catat Penyaluran Santunan Sosial
              </h3>
              <button
                onClick={() => setShowExpenseModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:bg-slate-100 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveExpense} className="mt-4 space-y-4 text-xs">
              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  Keperluan / Jenis Santunan <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={expTitle}
                  onChange={(e) => setExpTitle(e.target.value)}
                  placeholder="Misal: Santunan Siswa Sakit (Ananda Zaki), Takziah"
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl font-bold text-slate-800 focus:outline-amber-600"
                  required
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  Penerima Santunan
                </label>
                <input
                  type="text"
                  value={expRecipient}
                  onChange={(e) => setExpRecipient(e.target.value)}
                  placeholder="Misal: Ananda Zaki / Wali Murid"
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl font-semibold text-slate-800 focus:outline-amber-600"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">Tanggal</label>
                  <input
                    type="date"
                    value={expDate}
                    onChange={(e) => setExpDate(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl font-semibold text-slate-800 focus:outline-amber-600"
                    required
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    Nominal (Rp) <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="number"
                    step={1000}
                    value={expAmount || ''}
                    placeholder="0"
                    onChange={(e) => setExpAmount(parseInt(e.target.value, 10) || 0)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl font-black text-rose-700 focus:outline-amber-600"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">Catatan Tambahan</label>
                <input
                  type="text"
                  value={expNote}
                  onChange={(e) => setExpNote(e.target.value)}
                  placeholder="Keterangan perwakilan yang menjenguk, dll."
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-slate-700 focus:outline-amber-600"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowExpenseModal(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-xl shadow-xs cursor-pointer"
                >
                  Simpan Santunan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
