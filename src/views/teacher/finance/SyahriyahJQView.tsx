import React, { useState, useMemo } from 'react';
import { useApp } from '../../../context/AppContext';
import {
  Coins,
  Save,
  Printer,
  FileSpreadsheet,
  FileText,
  CheckCircle2,
  XCircle,
  RotateCcw,
  UserCheck,
  Search,
  Check,
  Calendar,
  AlertCircle,
  CreditCard,
  LayoutGrid,
  Filter,
  CheckSquare,
  Square,
  ChevronRight,
  Receipt,
  UserX,
  Sparkles,
  ArrowRight,
  TrendingUp,
  Download
} from 'lucide-react';
import { exportToExcel, exportToPdf } from '../../../utils/exportUtils';
import { SyahriyahJQRecord } from '../../../types';

export const SyahriyahJQView: React.FC = () => {
  const { students, syahriyahJQRecords, setSyahriyahJQRecords, currentUser, schoolProfile } = useApp();
  const currentClass = currentUser?.kelas || 'Kelas 1A';
  const myStudents = useApp().students.filter((s) => s.kelas === currentClass);

  // Tab State
  const [activeTab, setActiveTab] = useState<'loket' | 'matriks' | 'rekap'>('loket');

  // Nominal Setting (disimpan di localStorage agar tidak hilang)
  const [nominalSetting, setNominalSetting] = useState<number>(() => {
    const saved = localStorage.getItem(`kagum_jq_tariff_${currentClass}`);
    return saved ? parseInt(saved, 10) : 15000;
  });

  // JQ Membership Filter (Siapa saja yang ikut JQ di kelas ini)
  const [jqMembers, setJqMembers] = useState<Record<string, boolean>>(() => {
    try {
      const saved = localStorage.getItem(`kagum_jq_members_${currentClass}`);
      if (saved) return JSON.parse(saved);
    } catch (e) {
      // fallback
    }
    // Default: Semua siswa ikut JQ
    const initial: Record<string, boolean> = {};
    myStudents.forEach((s) => {
      initial[s.id] = true;
    });
    return initial;
  });

  // Tanggal Transaksi & Cetak
  const [defaultPaymentDate, setDefaultPaymentDate] = useState<string>(
    () => new Date().toISOString().split('T')[0]
  );
  const [printDate, setPrintDate] = useState<string>(
    () => new Date().toISOString().split('T')[0]
  );
  const [message, setMessage] = useState<{ type: 'success' | 'info'; text: string } | null>(null);

  // Loket Bayar Cepat States
  const [selectedStudentId, setSelectedStudentId] = useState<string>(() => myStudents[0]?.id || '');
  const [searchStudent, setSearchStudent] = useState<string>('');
  const [selectedMonthsToPay, setSelectedMonthsToPay] = useState<number[]>([]);

  // Modal Detail Bayar (untuk ubah tanggal di mode matriks)
  const [editingPayment, setEditingPayment] = useState<{
    studentId: string;
    studentName: string;
    monthIndex: number;
    monthName: string;
    currentDate: string;
  } | null>(null);

  // Modal Cetak Kartu Iuran Siswa
  const [studentCardToPrint, setStudentCardToPrint] = useState<{
    studentId: string;
    studentName: string;
    nisn: string;
  } | null>(null);

  // Urutan Tahun Ajaran: Juli (index 6) s.d. Juni (index 5)
  const monthsAcademicOrder = useMemo(
    () => [
      { name: 'Juli', short: 'Jul', index: 6, order: 1 },
      { name: 'Agustus', short: 'Agt', index: 7, order: 2 },
      { name: 'September', short: 'Sep', index: 8, order: 3 },
      { name: 'Oktober', short: 'Okt', index: 9, order: 4 },
      { name: 'November', short: 'Nov', index: 10, order: 5 },
      { name: 'Desember', short: 'Des', index: 11, order: 6 },
      { name: 'Januari', short: 'Jan', index: 0, order: 7 },
      { name: 'Februari', short: 'Feb', index: 1, order: 8 },
      { name: 'Maret', short: 'Mar', index: 2, order: 9 },
      { name: 'April', short: 'Apr', index: 3, order: 10 },
      { name: 'Mei', short: 'Mei', index: 4, order: 11 },
      { name: 'Juni', short: 'Jun', index: 5, order: 12 },
    ],
    []
  );

  const selectedStudent = useMemo(
    () => myStudents.find((s) => s.id === selectedStudentId) || myStudents[0],
    [myStudents, selectedStudentId]
  );

  const filteredStudents = useMemo(() => {
    return myStudents.filter((s) =>
      s.name.toLowerCase().includes(searchStudent.toLowerCase()) ||
      s.nisn.includes(searchStudent)
    );
  }, [myStudents, searchStudent]);

  // Simpan Nominal Tarif
  const handleSaveTariff = () => {
    localStorage.setItem(`kagum_jq_tariff_${currentClass}`, nominalSetting.toString());
    setMessage({ type: 'success', text: `Tarif Syahriyah JQ (Rp ${nominalSetting.toLocaleString('id-ID')}) berhasil disimpan!` });
    setTimeout(() => setMessage(null), 3000);
  };

  // Toggle Status Keanggotaan JQ Siswa
  const handleToggleJqMembership = (studentId: string) => {
    const updated = { ...jqMembers, [studentId]: !jqMembers[studentId] };
    setJqMembers(updated);
    localStorage.setItem(`kagum_jq_members_${currentClass}`, JSON.stringify(updated));
  };

  // 1-Click Toggle Pembayaran Bulan
  const handleToggleMonthPayment = (studentId: string, monthIndex: number) => {
    const existing = (syahriyahJQRecords || []).find(
      (r) => r.studentId === studentId && r.monthIndex === monthIndex
    );

    if (existing && existing.paymentDate) {
      // Jika sudah lunas, batalkan (hapus record)
      setSyahriyahJQRecords((syahriyahJQRecords || []).filter((r) => r.id !== existing.id));
    } else {
      // Jika belum lunas, tandai lunas dengan tanggal default hari ini
      const newRecord: SyahriyahJQRecord = {
        id: `jq-${studentId}-${monthIndex}`,
        studentId,
        monthIndex,
        paymentDate: defaultPaymentDate,
        amount: nominalSetting,
      };
      const filtered = (syahriyahJQRecords || []).filter((r) => r.id !== newRecord.id);
      setSyahriyahJQRecords([...filtered, newRecord]);
    }
  };

  // Simpan Perubahan Tanggal Spesifik
  const handleSaveCustomDate = (studentId: string, monthIndex: number, newDate: string) => {
    if (!newDate) {
      setSyahriyahJQRecords((syahriyahJQRecords || []).filter(
        (r) => !(r.studentId === studentId && r.monthIndex === monthIndex)
      ));
    } else {
      const existing = (syahriyahJQRecords || []).find(
        (r) => r.studentId === studentId && r.monthIndex === monthIndex
      );
      if (existing) {
        setSyahriyahJQRecords(
          (syahriyahJQRecords || []).map((r) =>
            r.id === existing.id ? { ...r, paymentDate: newDate, amount: nominalSetting } : r
          )
        );
      } else {
        setSyahriyahJQRecords([
          ...(syahriyahJQRecords || []),
          {
            id: `jq-${studentId}-${monthIndex}`,
            studentId,
            monthIndex,
            paymentDate: newDate,
            amount: nominalSetting,
          },
        ]);
      }
    }
    setEditingPayment(null);
  };

  // Bayar Banyak Bulan Sekaligus di Mode Loket
  const handlePaySelectedMonths = () => {
    if (!selectedStudent || selectedMonthsToPay.length === 0) return;

    const newRecords = [...(syahriyahJQRecords || [])];
    selectedMonthsToPay.forEach((mIndex) => {
      const existingIndex = newRecords.findIndex(
        (r) => r.studentId === selectedStudent.id && r.monthIndex === mIndex
      );
      const record: SyahriyahJQRecord = {
        id: `jq-${selectedStudent.id}-${mIndex}`,
        studentId: selectedStudent.id,
        monthIndex: mIndex,
        paymentDate: defaultPaymentDate,
        amount: nominalSetting,
      };

      if (existingIndex >= 0) {
        newRecords[existingIndex] = record;
      } else {
        newRecords.push(record);
      }
    });

    setSyahriyahJQRecords(newRecords);
    setMessage({
      type: 'success',
      text: `Berhasil mencatat pembayaran ${selectedMonthsToPay.length} bulan untuk ${selectedStudent.name} (Total: Rp ${(selectedMonthsToPay.length * nominalSetting).toLocaleString('id-ID')})!`,
    });
    setSelectedMonthsToPay([]);
    setTimeout(() => setMessage(null), 3500);
  };

  // Tandai Semua Siswa JQ Lunas Bulan Ini (Setoran Kolektif)
  const handleBulkPayMonth = (monthIndex: number, monthName: string) => {
    const confirmBulk = window.confirm(
      `Tandai SEMUA siswa anggota JQ (${currentClass}) lunas untuk bulan ${monthName} dengan tanggal ${defaultPaymentDate}?`
    );
    if (!confirmBulk) return;

    const activeJqStudents = myStudents.filter((s) => jqMembers[s.id] !== false);
    const newRecords = [...(syahriyahJQRecords || [])];

    activeJqStudents.forEach((st) => {
      const existingIndex = newRecords.findIndex(
        (r) => r.studentId === st.id && r.monthIndex === monthIndex
      );
      const record: SyahriyahJQRecord = {
        id: `jq-${st.id}-${monthIndex}`,
        studentId: st.id,
        monthIndex,
        paymentDate: defaultPaymentDate,
        amount: nominalSetting,
      };

      if (existingIndex >= 0) {
        newRecords[existingIndex] = record;
      } else {
        newRecords.push(record);
      }
    });

    setSyahriyahJQRecords(newRecords);
    setMessage({
      type: 'success',
      text: `Seluruh siswa anggota JQ (${activeJqStudents.length} siswa) berhasil ditandai Lunas untuk bulan ${monthName}!`,
    });
    setTimeout(() => setMessage(null), 3500);
  };

  // Statistik Keseluruhan Kelas
  const stats = useMemo(() => {
    const activeJqStudents = myStudents.filter((s) => jqMembers[s.id] !== false);
    const totalActiveJq = activeJqStudents.length;
    const targetSetoranTahun = totalActiveJq * 12 * nominalSetting;

    let totalSetoranTerkumpul = 0;
    let totalBulanLunas = 0;

    activeJqStudents.forEach((st) => {
      monthsAcademicOrder.forEach((m) => {
        const rec = (syahriyahJQRecords || []).find(
          (r) => r.studentId === st.id && r.monthIndex === m.index && r.paymentDate
        );
        if (rec) {
          totalBulanLunas++;
          totalSetoranTerkumpul += rec.amount || nominalSetting;
        }
      });
    });

    const sisaTunggakan = Math.max(0, targetSetoranTahun - totalSetoranTerkumpul);
    const persentaseLunas = targetSetoranTahun > 0 ? (totalSetoranTerkumpul / targetSetoranTahun) * 100 : 0;

    return {
      totalActiveJq,
      totalStudents: myStudents.length,
      targetSetoranTahun,
      totalSetoranTerkumpul,
      totalBulanLunas,
      sisaTunggakan,
      persentaseLunas,
    };
  }, [myStudents, jqMembers, syahriyahJQRecords, monthsAcademicOrder, nominalSetting]);

  // Ekspor PDF Rekap
  const handleExportPdf = () => {
    const titleLines = [
      'REKAPITULASI IURAN SYAHRIYAH JAM’IYYATUL QURRA’ (JQ)',
      `MADRASAH IBTIDAIYAH NEGERI 1 PURBALINGGA — KELAS ${currentClass.toUpperCase()}`,
      `TAHUN AJARAN ${schoolProfile.tahunAjaran} — SEMESTER ${schoolProfile.semester.toUpperCase()}`,
    ];

    const monthHeaders = monthsAcademicOrder.map((m) => m.short);
    const headers = ['No', 'NISN', 'Nama Siswa', 'Status JQ', ...monthHeaders, 'Total Terbayar'];

    const rows = myStudents.map((st, idx) => {
      const isMember = jqMembers[st.id] !== false;
      let lunasCount = 0;

      const monthCols = monthsAcademicOrder.map((m) => {
        if (!isMember) return '-';
        const rec = (syahriyahJQRecords || []).find(
          (r) => r.studentId === st.id && r.monthIndex === m.index
        );
        if (rec && rec.paymentDate) {
          lunasCount++;
          return rec.paymentDate.split('-').reverse().slice(0, 2).join('/');
        }
        return 'Belum';
      });

      return [
        idx + 1,
        st.nisn,
        st.name,
        isMember ? 'Peserta' : 'Bukan JQ',
        ...monthCols,
        `Rp ${(lunasCount * nominalSetting).toLocaleString('id-ID')}`,
      ];
    });

    exportToPdf({
      filename: `Rekap_Syahriyah_JQ_${currentClass.replace(' ', '_')}`,
      titleLines,
      tableHeaders: headers,
      tableRows: rows,
      schoolProfile,
      printDate,
      teacherName: currentUser?.name,
      teacherNip: currentUser?.nip,
      orientation: 'landscape',
      columnStyles: {
        0: { halign: 'center' },
        1: { halign: 'center' },
        2: { halign: 'left' },
        3: { halign: 'center' },
      },
    });
  };

  // Ekspor Excel
  const handleExportExcel = () => {
    const headerLines = [
      'REKAPITULASI SYAHRIYAH JAM’IYYATUL QURRA’ (JQ)',
      `KELAS: ${currentClass}`,
      `SEMESTER: ${schoolProfile.semester} TAHUN AJARAN ${schoolProfile.tahunAjaran}`,
      `TARIF: Rp ${nominalSetting.toLocaleString('id-ID')} / bulan`,
    ];

    const monthHeaders = monthsAcademicOrder.map((m) => m.name);
    const headers = ['No', 'NISN', 'Nama Siswa', 'Status Anggota', ...monthHeaders, 'Total Setoran (Rp)'];

    const rows = myStudents.map((st, idx) => {
      const isMember = jqMembers[st.id] !== false;
      let lunasCount = 0;

      const monthCols = monthsAcademicOrder.map((m) => {
        if (!isMember) return 'Bukan Peserta';
        const rec = (syahriyahJQRecords || []).find(
          (r) => r.studentId === st.id && r.monthIndex === m.index
        );
        if (rec && rec.paymentDate) {
          lunasCount++;
          return `Lunas (${rec.paymentDate})`;
        }
        return 'Belum';
      });

      return [
        idx + 1,
        st.nisn,
        st.name,
        isMember ? 'Peserta JQ' : 'Bukan Peserta',
        ...monthCols,
        lunasCount * nominalSetting,
      ];
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
      {/* Top Banner & Navigation */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-amber-50 text-amber-700 flex items-center justify-center font-bold shadow-xs">
              <Coins className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold text-slate-800">
                  Syahriyah Jam'iyyatul Qurra' / JQ ({currentClass})
                </h2>
                <span className="px-2 py-0.5 bg-amber-100 text-amber-800 text-[10px] font-extrabold rounded-full uppercase">
                  Modul Praktis v2
                </span>
              </div>
              <p className="text-xs text-slate-500">
                Pencatatan setoran cepat bulanan, loket kasir per siswa, dan tanda terima setoran ke pembina JQ
              </p>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 rounded-xl text-xs">
              <Printer className="w-3.5 h-3.5 text-slate-500" />
              <span className="font-medium text-slate-600">Tgl Cetak:</span>
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
              PDF Rekap
            </button>
          </div>
        </div>

        {/* Global Class Stats Strip */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4 pt-1">
          <div className="p-3 bg-amber-50/70 border border-amber-200/80 rounded-xl">
            <span className="text-[10px] font-bold text-amber-800 uppercase tracking-wider block">
              Peserta JQ Aktif
            </span>
            <span className="text-lg font-black text-amber-950">
              {stats.totalActiveJq} <span className="text-xs font-normal text-amber-700">/ {stats.totalStudents} siswa</span>
            </span>
          </div>

          <div className="p-3 bg-emerald-50/70 border border-emerald-200/80 rounded-xl">
            <span className="text-[10px] font-bold text-emerald-800 uppercase tracking-wider block">
              Total Kas Terkumpul
            </span>
            <span className="text-lg font-black text-emerald-950">
              Rp {stats.totalSetoranTerkumpul.toLocaleString('id-ID')}
            </span>
          </div>

          <div className="p-3 bg-sky-50/70 border border-sky-200/80 rounded-xl">
            <span className="text-[10px] font-bold text-sky-800 uppercase tracking-wider block">
              Persentase Pelunasan
            </span>
            <span className="text-lg font-black text-sky-950">
              {stats.persentaseLunas.toFixed(1)}%
            </span>
          </div>

          <div className="p-3 bg-purple-50/70 border border-purple-200/80 rounded-xl">
            <span className="text-[10px] font-bold text-purple-800 uppercase tracking-wider block">
              Tarif Bulanan
            </span>
            <span className="text-lg font-black text-purple-950">
              Rp {nominalSetting.toLocaleString('id-ID')}
            </span>
          </div>
        </div>

        {/* Settings Bar */}
        <div className="mt-4 p-3 bg-slate-50 border border-slate-200 rounded-xl flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-2">
              <label className="font-bold text-slate-700">Tarif / Bulan:</label>
              <div className="flex items-center gap-1">
                <span className="text-slate-400 font-semibold">Rp</span>
                <input
                  type="number"
                  step={1000}
                  value={nominalSetting}
                  onChange={(e) => setNominalSetting(parseInt(e.target.value, 10) || 0)}
                  className="w-24 px-2 py-1 bg-white border border-slate-300 rounded-lg font-bold text-slate-800 text-xs focus:ring-1 focus:ring-amber-500"
                />
              </div>
              <button
                onClick={handleSaveTariff}
                className="px-2.5 py-1 bg-slate-200 hover:bg-slate-300 text-slate-800 font-bold rounded-lg transition-colors cursor-pointer text-[11px]"
              >
                Simpan
              </button>
            </div>

            <div className="flex items-center gap-2">
              <label className="font-bold text-slate-700">Tanggal Bayar Default:</label>
              <input
                type="date"
                value={defaultPaymentDate}
                onChange={(e) => setDefaultPaymentDate(e.target.value)}
                className="px-2 py-1 bg-white border border-slate-300 rounded-lg font-semibold text-slate-800 text-xs"
              />
              <span className="text-[10px] text-slate-400">(Digunakan saat klik lunas)</span>
            </div>
          </div>
        </div>

        {message && (
          <div className="mt-4 p-3 bg-emerald-50 border border-emerald-200 text-emerald-900 rounded-xl text-xs flex items-center gap-2 font-semibold">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            {message.text}
          </div>
        )}
      </div>

      {/* Tabs Navigation */}
      <div className="flex border-b border-slate-200 gap-2">
        <button
          onClick={() => setActiveTab('loket')}
          className={`px-4 py-2.5 text-xs font-bold border-b-2 transition-colors cursor-pointer flex items-center gap-2 ${
            activeTab === 'loket'
              ? 'border-amber-600 text-amber-800 bg-amber-50/50 rounded-t-xl'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <CreditCard className="w-4 h-4" />
          Mode 1: Loket Bayar Cepat (Per Siswa)
        </button>

        <button
          onClick={() => setActiveTab('matriks')}
          className={`px-4 py-2.5 text-xs font-bold border-b-2 transition-colors cursor-pointer flex items-center gap-2 ${
            activeTab === 'matriks'
              ? 'border-amber-600 text-amber-800 bg-amber-50/50 rounded-t-xl'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <LayoutGrid className="w-4 h-4" />
          Mode 2: Tabel Matriks (1-Tap Toggle)
        </button>

        <button
          onClick={() => setActiveTab('rekap')}
          className={`px-4 py-2.5 text-xs font-bold border-b-2 transition-colors cursor-pointer flex items-center gap-2 ${
            activeTab === 'rekap'
              ? 'border-amber-600 text-amber-800 bg-amber-50/50 rounded-t-xl'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <FileText className="w-4 h-4" />
          Mode 3: Berita Acara & Setoran Pembina
        </button>
      </div>

      {/* TAB 1: LOKET BAYAR CEPAT (REKOMENDASI OPERASIONAL HARIAN) */}
      {activeTab === 'loket' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Column: Student Selector Sidebar */}
          <div className="lg:col-span-4 bg-white rounded-2xl border border-slate-200 p-4 shadow-xs space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="font-bold text-slate-800 text-xs flex items-center gap-1.5">
                <UserCheck className="w-4 h-4 text-amber-600" />
                Pilih Siswa ({myStudents.length})
              </h3>
            </div>

            {/* Search Box */}
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
              <input
                type="text"
                placeholder="Cari nama siswa / NISN..."
                value={searchStudent}
                onChange={(e) => setSearchStudent(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:bg-white focus:ring-1 focus:ring-amber-500"
              />
            </div>

            {/* Student List */}
            <div className="max-h-[520px] overflow-y-auto space-y-1.5 pr-1">
              {filteredStudents.map((st, idx) => {
                const isSelected = st.id === selectedStudent?.id;
                const isJqMember = jqMembers[st.id] !== false;

                // Count paid months
                const paidCount = monthsAcademicOrder.filter((m) => {
                  const rec = (syahriyahJQRecords || []).find(
                    (r) => r.studentId === st.id && r.monthIndex === m.index
                  );
                  return !!rec && !!rec.paymentDate;
                }).length;

                return (
                  <button
                    key={st.id}
                    onClick={() => {
                      setSelectedStudentId(st.id);
                      setSelectedMonthsToPay([]);
                    }}
                    className={`w-full p-2.5 rounded-xl text-left transition-all flex items-center justify-between gap-2 cursor-pointer border ${
                      isSelected
                        ? 'bg-amber-500 text-white border-amber-600 shadow-sm'
                        : 'bg-slate-50/70 hover:bg-slate-100 text-slate-800 border-slate-200/80'
                    }`}
                  >
                    <div className="space-y-0.5 truncate flex-1">
                      <div className="flex items-center gap-1.5">
                        <span className={`text-[10px] font-bold ${isSelected ? 'text-amber-100' : 'text-slate-400'}`}>
                          #{idx + 1}
                        </span>
                        <span className="font-bold text-xs truncate block">{st.name}</span>
                      </div>
                      <div className="flex items-center gap-2 text-[10px]">
                        <span className={isSelected ? 'text-amber-100 font-mono' : 'text-slate-500 font-mono'}>
                          {st.nisn}
                        </span>
                        {!isJqMember && (
                          <span className={`px-1.5 py-0.2 rounded font-extrabold text-[9px] ${
                            isSelected ? 'bg-red-400 text-white' : 'bg-red-100 text-red-700'
                          }`}>
                            Bukan JQ
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      <span className={`text-[11px] font-extrabold px-2 py-0.5 rounded-md ${
                        isSelected
                          ? 'bg-amber-600 text-white'
                          : paidCount === 12
                          ? 'bg-emerald-100 text-emerald-800'
                          : paidCount > 0
                          ? 'bg-amber-100 text-amber-800'
                          : 'bg-slate-200 text-slate-600'
                      }`}>
                        {paidCount}/12 Bln
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Right Column: Interactive 12-Month Payment Center */}
          <div className="lg:col-span-8 space-y-5">
            {selectedStudent ? (
              <>
                {/* Active Student Header Card */}
                <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-4">
                  <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-4">
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="text-base font-extrabold text-slate-800">{selectedStudent.name}</h3>
                        <span className="px-2 py-0.5 bg-slate-100 text-slate-700 text-xs font-mono font-bold rounded-lg">
                          NISN: {selectedStudent.nisn}
                        </span>
                      </div>
                      <p className="text-xs text-slate-500 mt-0.5">
                        Kelas: {currentClass} • Wali Kelas: {currentUser?.name || '-'}
                      </p>
                    </div>

                    {/* Member Switch & Print Slip Button */}
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleToggleJqMembership(selectedStudent.id)}
                        className={`px-3 py-1.5 rounded-xl font-bold text-xs flex items-center gap-1.5 transition-colors cursor-pointer border ${
                          jqMembers[selectedStudent.id] !== false
                            ? 'bg-emerald-50 border-emerald-300 text-emerald-800 hover:bg-emerald-100'
                            : 'bg-slate-100 border-slate-300 text-slate-500 hover:bg-slate-200'
                        }`}
                        title="Klik untuk mengubah status apakah siswa mengikuti ekstra JQ"
                      >
                        {jqMembers[selectedStudent.id] !== false ? (
                          <>
                            <UserCheck className="w-3.5 h-3.5 text-emerald-600" />
                            <span>Anggota Aktif JQ</span>
                          </>
                        ) : (
                          <>
                            <UserX className="w-3.5 h-3.5 text-slate-500" />
                            <span>Bukan Peserta JQ</span>
                          </>
                        )}
                      </button>

                      <button
                        onClick={() =>
                          setStudentCardToPrint({
                            studentId: selectedStudent.id,
                            studentName: selectedStudent.name,
                            nisn: selectedStudent.nisn,
                          })
                        }
                        className="px-3 py-1.5 bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-300 rounded-xl font-bold text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
                      >
                        <Receipt className="w-3.5 h-3.5 text-amber-700" />
                        Cetak Kartu Saku
                      </button>
                    </div>
                  </div>

                  {/* Student Summary Chips */}
                  {(() => {
                    const studentPaidRecords = monthsAcademicOrder.filter((m) => {
                      const rec = (syahriyahJQRecords || []).find(
                        (r) => r.studentId === selectedStudent.id && r.monthIndex === m.index
                      );
                      return !!rec && !!rec.paymentDate;
                    });
                    const countPaid = studentPaidRecords.length;
                    const totalPaid = countPaid * nominalSetting;
                    const sisaTunggakan = Math.max(0, 12 * nominalSetting - totalPaid);

                    return (
                      <div className="grid grid-cols-3 gap-3 text-xs">
                        <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                          <span className="text-[10px] text-slate-500 block font-semibold">Status Pelunasan</span>
                          <span className="text-sm font-extrabold text-slate-800">
                            {countPaid} / 12 Bulan Lunas
                          </span>
                        </div>
                        <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-200">
                          <span className="text-[10px] text-emerald-700 block font-semibold">Total Terbayar</span>
                          <span className="text-sm font-black text-emerald-900">
                            Rp {totalPaid.toLocaleString('id-ID')}
                          </span>
                        </div>
                        <div className="p-3 bg-rose-50 rounded-xl border border-rose-200">
                          <span className="text-[10px] text-rose-700 block font-semibold">Sisa Tagihan</span>
                          <span className="text-sm font-black text-rose-900">
                            {jqMembers[selectedStudent.id] !== false
                              ? `Rp ${sisaTunggakan.toLocaleString('id-ID')}`
                              : 'Rp 0 (Bukan JQ)'}
                          </span>
                        </div>
                      </div>
                    );
                  })()}
                </div>

                {/* 12 Months Visual Cards Grid */}
                <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-4">
                  <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-3">
                    <div>
                      <h4 className="font-bold text-slate-800 text-xs flex items-center gap-1.5">
                        <Calendar className="w-4 h-4 text-amber-600" />
                        Kartu Status Pembayaran 12 Bulan (Tahun Ajaran {schoolProfile.tahunAjaran})
                      </h4>
                      <p className="text-[11px] text-slate-500">
                        Klik langsung pada kartu bulan untuk menandai <strong>Lunas</strong> atau <strong>Batal</strong>.
                      </p>
                    </div>

                    {/* Batch Action Bar if multiple selected */}
                    {selectedMonthsToPay.length > 0 && (
                      <div className="flex items-center gap-2 bg-amber-50 border border-amber-300 px-3 py-1.5 rounded-xl">
                        <span className="text-xs font-bold text-amber-900">
                          {selectedMonthsToPay.length} bln dipilih = Rp {(selectedMonthsToPay.length * nominalSetting).toLocaleString('id-ID')}
                        </span>
                        <button
                          onClick={handlePaySelectedMonths}
                          className="px-3 py-1 bg-amber-600 hover:bg-amber-700 text-white font-extrabold text-xs rounded-lg shadow-xs transition-colors cursor-pointer"
                        >
                          Bayar Sekaligus
                        </button>
                      </div>
                    )}
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                    {monthsAcademicOrder.map((m) => {
                      const rec = (syahriyahJQRecords || []).find(
                        (r) => r.studentId === selectedStudent.id && r.monthIndex === m.index
                      );
                      const isPaid = !!rec && !!rec.paymentDate;
                      const isMultiSelected = selectedMonthsToPay.includes(m.index);

                      return (
                        <div
                          key={m.index}
                          className={`p-3 rounded-2xl border transition-all flex flex-col justify-between relative group ${
                            isPaid
                              ? 'bg-emerald-50/80 border-emerald-300 shadow-xs'
                              : isMultiSelected
                              ? 'bg-amber-50 border-amber-400 ring-2 ring-amber-400'
                              : 'bg-slate-50/80 border-slate-200 hover:border-slate-300'
                          }`}
                        >
                          {/* Multi Select Checkbox for unpaid months */}
                          {!isPaid && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                if (isMultiSelected) {
                                  setSelectedMonthsToPay(selectedMonthsToPay.filter((x) => x !== m.index));
                                } else {
                                  setSelectedMonthsToPay([...selectedMonthsToPay, m.index]);
                                }
                              }}
                              className="absolute top-2 right-2 p-1 text-slate-400 hover:text-amber-600 cursor-pointer"
                              title="Pilih untuk bayar sekaligus"
                            >
                              {isMultiSelected ? (
                                <CheckSquare className="w-4 h-4 text-amber-600" />
                              ) : (
                                <Square className="w-4 h-4 text-slate-300 group-hover:text-slate-500" />
                              )}
                            </button>
                          )}

                          <div>
                            <div className="flex items-center gap-1.5">
                              <span className="text-[10px] font-extrabold text-slate-400">
                                Bln {m.order}
                              </span>
                              <h5 className="font-extrabold text-slate-900 text-sm">{m.name}</h5>
                            </div>

                            <div className="mt-2">
                              {isPaid ? (
                                <div className="space-y-0.5">
                                  <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-extrabold">
                                    <Check className="w-3 h-3" />
                                    LUNAS
                                  </div>
                                  <div className="text-[10px] text-emerald-700 font-medium">
                                    Tgl: {rec.paymentDate?.split('-').reverse().join('/')}
                                  </div>
                                </div>
                              ) : (
                                <div className="space-y-0.5">
                                  <span className="inline-block px-2 py-0.5 rounded-full bg-slate-200 text-slate-600 text-[10px] font-bold">
                                    Belum Lunas
                                  </span>
                                  <div className="text-[10px] text-slate-400">
                                    Rp {nominalSetting.toLocaleString('id-ID')}
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>

                          {/* Quick Action Button on each card */}
                          <div className="mt-3 pt-2 border-t border-slate-200/60 flex items-center justify-between gap-1">
                            {isPaid ? (
                              <>
                                <button
                                  onClick={() =>
                                    setEditingPayment({
                                      studentId: selectedStudent.id,
                                      studentName: selectedStudent.name,
                                      monthIndex: m.index,
                                      monthName: m.name,
                                      currentDate: rec.paymentDate || defaultPaymentDate,
                                    })
                                  }
                                  className="text-[10px] text-slate-500 hover:text-slate-800 font-semibold cursor-pointer underline"
                                >
                                  Ubah Tgl
                                </button>
                                <button
                                  onClick={() => handleToggleMonthPayment(selectedStudent.id, m.index)}
                                  className="text-[10px] text-rose-600 hover:text-rose-800 font-bold cursor-pointer"
                                >
                                  Batal
                                </button>
                              </>
                            ) : (
                              <button
                                onClick={() => handleToggleMonthPayment(selectedStudent.id, m.index)}
                                className="w-full py-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[10px] rounded-lg shadow-xs transition-colors cursor-pointer flex items-center justify-center gap-1"
                              >
                                <Check className="w-3 h-3" />
                                Bayar Lunas
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </>
            ) : (
              <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center text-slate-400">
                Pilih siswa terlebih dahulu.
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 2: MATRIKS SATU KELAS (1-TAP TOGGLE, TANPA 360 INPUT TANGGAL) */}
      {activeTab === 'matriks' && (
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-3">
            <div>
              <h3 className="font-bold text-slate-800 text-sm flex items-center gap-2">
                <LayoutGrid className="w-4 h-4 text-amber-600" />
                Matriks Rekapitulasi Syahriyah JQ Kelas ({currentClass})
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Cukup klik 1 kali pada kotak bulan untuk menandai <strong>Lunas</strong> atau <strong>Batal</strong>. Tanggal otomatis tersimpan.
              </p>
            </div>

            <div className="flex items-center gap-3 text-xs font-semibold text-slate-600">
              <span className="flex items-center gap-1.5">
                <span className="w-3.5 h-3.5 rounded bg-emerald-500 text-white flex items-center justify-center text-[9px] font-bold">✓</span>
                Lunas (Klik untuk batal/ubah)
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-3.5 h-3.5 rounded bg-slate-100 border border-slate-300"></span>
                Belum Bayar (Klik untuk lunasi)
              </span>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200">
                  <th className="p-2.5 w-10 text-center" rowSpan={2}>No</th>
                  <th className="p-2.5 w-24" rowSpan={2}>NISN</th>
                  <th className="p-2.5 min-w-[160px]" rowSpan={2}>Nama Lengkap Siswa</th>
                  <th className="p-2.5 w-24 text-center" rowSpan={2}>Status JQ</th>
                  <th
                    className="p-2 text-center bg-amber-100/70 text-amber-950 font-extrabold border-b border-slate-200 uppercase tracking-wider"
                    colSpan={12}
                  >
                    12 BULAN (KLIK UNTUK BAYAR/BATAL)
                  </th>
                  <th className="p-2.5 text-right w-24" rowSpan={2}>Lunas</th>
                  <th className="p-2.5 text-right w-28" rowSpan={2}>Total Setor</th>
                </tr>
                <tr className="bg-slate-50 text-slate-700 font-semibold text-[11px]">
                  {monthsAcademicOrder.map((m) => (
                    <th key={m.index} className="p-1.5 text-center border-r border-slate-200">
                      <div className="flex flex-col items-center">
                        <span>{m.short}</span>
                        <button
                          onClick={() => handleBulkPayMonth(m.index, m.name)}
                          className="text-[9px] text-amber-700 hover:text-amber-900 font-bold underline cursor-pointer"
                          title={`Tandai semua anggota JQ lunas bulan ${m.name}`}
                        >
                          Semua
                        </button>
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {myStudents.map((st, idx) => {
                  const isMember = jqMembers[st.id] !== false;
                  let paidMonthsCount = 0;

                  return (
                    <tr
                      key={st.id}
                      className={`hover:bg-amber-50/40 transition-colors ${
                        !isMember ? 'bg-slate-50/50 opacity-60' : ''
                      }`}
                    >
                      <td className="p-2.5 text-center text-slate-500 font-medium">{idx + 1}</td>
                      <td className="p-2.5 font-mono text-slate-600 text-[11px]">{st.nisn}</td>
                      <td className="p-2.5 font-bold text-slate-800">
                        <button
                          onClick={() => {
                            setSelectedStudentId(st.id);
                            setActiveTab('loket');
                          }}
                          className="hover:text-amber-700 hover:underline text-left cursor-pointer"
                          title="Buka di Mode Loket Siswa"
                        >
                          {st.name}
                        </button>
                      </td>

                      {/* Status JQ Switch */}
                      <td className="p-1.5 text-center">
                        <button
                          onClick={() => handleToggleJqMembership(st.id)}
                          className={`px-2 py-0.5 rounded text-[10px] font-bold cursor-pointer transition-colors ${
                            isMember
                              ? 'bg-emerald-100 text-emerald-800 hover:bg-emerald-200'
                              : 'bg-slate-200 text-slate-600 hover:bg-slate-300'
                          }`}
                        >
                          {isMember ? 'Peserta' : 'Bukan'}
                        </button>
                      </td>

                      {/* 12 Months Interactive Cells */}
                      {monthsAcademicOrder.map((m) => {
                        const rec = (syahriyahJQRecords || []).find(
                          (r) => r.studentId === st.id && r.monthIndex === m.index
                        );
                        const isPaid = !!rec && !!rec.paymentDate;
                        if (isPaid) paidMonthsCount++;

                        if (!isMember) {
                          return (
                            <td key={m.index} className="p-1 text-center border-r border-slate-100 text-slate-300 text-[11px]">
                              -
                            </td>
                          );
                        }

                        return (
                          <td key={m.index} className="p-1 text-center border-r border-slate-100">
                            <button
                              onClick={() => handleToggleMonthPayment(st.id, m.index)}
                              onContextMenu={(e) => {
                                e.preventDefault();
                                setEditingPayment({
                                  studentId: st.id,
                                  studentName: st.name,
                                  monthIndex: m.index,
                                  monthName: m.name,
                                  currentDate: rec?.paymentDate || defaultPaymentDate,
                                });
                              }}
                              className={`w-8 h-8 rounded-xl font-black text-xs transition-all inline-flex flex-col items-center justify-center cursor-pointer shadow-2xs ${
                                isPaid
                                  ? 'bg-emerald-500 hover:bg-emerald-600 text-white scale-100'
                                  : 'bg-slate-100 hover:bg-amber-100 text-slate-400 hover:text-amber-800 border border-slate-200'
                              }`}
                              title={
                                isPaid
                                  ? `Lunas: ${rec?.paymentDate} (Klik untuk batal, Klik kanan untuk ubah tgl)`
                                  : `Belum bayar. Klik untuk tandai Lunas tgl ${defaultPaymentDate}`
                              }
                            >
                              {isPaid ? <Check className="w-4 h-4 stroke-[3]" /> : '—'}
                            </button>
                          </td>
                        );
                      })}

                      {/* Summary Columns */}
                      <td className="p-2.5 text-right font-bold text-slate-700">
                        {isMember ? `${paidMonthsCount}/12` : '0/0'}
                      </td>
                      <td className="p-2.5 text-right font-black text-emerald-800 bg-emerald-50/40">
                        Rp {(paidMonthsCount * nominalSetting).toLocaleString('id-ID')}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 3: BERITA ACARA & SETORAN KE PEMBINA JQ */}
      {activeTab === 'rekap' && (
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-6">
          <div className="border-b border-slate-100 pb-4 flex flex-wrap items-center justify-between gap-4">
            <div>
              <h3 className="text-base font-bold text-slate-800 flex items-center gap-2">
                <FileText className="w-5 h-5 text-amber-600" />
                Laporan & Berita Acara Penyerahan Kas ke Pembina JQ
              </h3>
              <p className="text-xs text-slate-500 mt-1">
                Rekapitulasi total kas syahriyah yang ditarik oleh Wali Kelas {currentClass} untuk disetorkan ke Koordinator/Pembina JQ Madrasah
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={handleExportPdf}
                className="px-4 py-2 bg-amber-700 hover:bg-amber-800 text-white font-bold text-xs rounded-xl shadow-xs transition-colors flex items-center gap-2 cursor-pointer"
              >
                <Printer className="w-4 h-4" />
                Cetak Lembar Rekap Penyerahan Kas
              </button>
            </div>
          </div>

          {/* Month by Month Collection Breakdown */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {monthsAcademicOrder.map((m) => {
              const activeJqStudents = myStudents.filter((s) => jqMembers[s.id] !== false);
              const paidInMonth = activeJqStudents.filter((st) => {
                const rec = (syahriyahJQRecords || []).find(
                  (r) => r.studentId === st.id && r.monthIndex === m.index
                );
                return !!rec && !!rec.paymentDate;
              });

              const totalUangBulan = paidInMonth.length * nominalSetting;
              const isFull = paidInMonth.length === activeJqStudents.length && activeJqStudents.length > 0;

              return (
                <div
                  key={m.index}
                  className={`p-4 rounded-xl border space-y-2 ${
                    isFull
                      ? 'bg-emerald-50/60 border-emerald-300'
                      : paidInMonth.length > 0
                      ? 'bg-amber-50/40 border-amber-200'
                      : 'bg-slate-50 border-slate-200'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-extrabold text-sm text-slate-900">Bulan {m.name}</span>
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold ${
                      isFull ? 'bg-emerald-200 text-emerald-900' : 'bg-slate-200 text-slate-700'
                    }`}>
                      {paidInMonth.length} / {activeJqStudents.length} Siswa
                    </span>
                  </div>

                  <div className="flex items-baseline justify-between pt-1">
                    <span className="text-xs text-slate-500">Total Terkumpul:</span>
                    <span className="text-sm font-black text-emerald-800">
                      Rp {totalUangBulan.toLocaleString('id-ID')}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Summary Box */}
          <div className="p-5 bg-slate-900 text-white rounded-2xl border border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="space-y-1">
              <span className="text-xs text-amber-300 font-bold uppercase tracking-wider block">
                Total Kas Syahriyah Terkumpul Kelas {currentClass}
              </span>
              <div className="text-2xl font-black text-white">
                Rp {stats.totalSetoranTerkumpul.toLocaleString('id-ID')}
              </div>
              <p className="text-xs text-slate-400">
                Dari {stats.totalBulanLunas} transaksi pembayaran bulan oleh {stats.totalActiveJq} siswa anggota JQ.
              </p>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={handleExportPdf}
                className="px-4 py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs rounded-xl shadow-md transition-all flex items-center gap-2 cursor-pointer"
              >
                <Download className="w-4 h-4" />
                Unduh PDF Laporan Resmi
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: EDIT TANGGAL PEMBAYARAN */}
      {editingPayment && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full p-5 shadow-2xl border border-slate-200 space-y-4 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h4 className="font-bold text-slate-800 text-sm">Ubah Tanggal Setor</h4>
              <button
                onClick={() => setEditingPayment(null)}
                className="text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <XCircle className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-2 text-xs">
              <div className="text-slate-500">
                Siswa: <strong className="text-slate-800">{editingPayment.studentName}</strong>
              </div>
              <div className="text-slate-500">
                Bulan: <strong className="text-amber-700">{editingPayment.monthName}</strong> (Tarif: Rp {nominalSetting.toLocaleString('id-ID')})
              </div>

              <div className="pt-2">
                <label className="font-bold text-slate-700 block mb-1">Tanggal Pembayaran:</label>
                <input
                  type="date"
                  value={editingPayment.currentDate}
                  onChange={(e) =>
                    setEditingPayment({ ...editingPayment, currentDate: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                onClick={() => handleSaveCustomDate(editingPayment.studentId, editingPayment.monthIndex, '')}
                className="px-3 py-1.5 text-rose-600 hover:bg-rose-50 font-bold text-xs rounded-xl transition-colors cursor-pointer"
              >
                Batalkan Lunas
              </button>
              <button
                onClick={() =>
                  handleSaveCustomDate(
                    editingPayment.studentId,
                    editingPayment.monthIndex,
                    editingPayment.currentDate
                  )
                }
                className="px-4 py-1.5 bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs rounded-xl shadow-xs transition-colors cursor-pointer"
              >
                Simpan Tanggal
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: CETAK KARTU SAKU SYAHRIYAH SISWA */}
      {studentCardToPrint && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 space-y-4 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h4 className="font-bold text-slate-800 text-sm flex items-center gap-2">
                <Receipt className="w-4 h-4 text-amber-600" />
                Kartu Kontrol Iuran Syahriyah JQ Siswa
              </h4>
              <button
                onClick={() => setStudentCardToPrint(null)}
                className="text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <XCircle className="w-5 h-5" />
              </button>
            </div>

            {/* Printable Area Preview */}
            <div id="print-syahriyah-card" className="p-5 border-2 border-dashed border-amber-300 rounded-2xl bg-amber-50/30 space-y-4 text-xs">
              <div className="text-center border-b border-amber-200 pb-3">
                <h5 className="font-black text-slate-900 uppercase text-sm tracking-wide">
                  KARTU IURAN SYAHRIYAH JQ
                </h5>
                <p className="text-[11px] text-slate-600">
                  {schoolProfile.namaMadrasah} • Tahun Ajaran {schoolProfile.tahunAjaran}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-2 text-[11px]">
                <div>
                  <span className="text-slate-500">Nama Siswa:</span>
                  <p className="font-bold text-slate-800">{studentCardToPrint.studentName}</p>
                </div>
                <div>
                  <span className="text-slate-500">NISN / Kelas:</span>
                  <p className="font-bold text-slate-800">{studentCardToPrint.nisn} / {currentClass}</p>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2 pt-1">
                {monthsAcademicOrder.map((m) => {
                  const rec = (syahriyahJQRecords || []).find(
                    (r) => r.studentId === studentCardToPrint.studentId && r.monthIndex === m.index
                  );
                  const isPaid = !!rec && !!rec.paymentDate;

                  return (
                    <div
                      key={m.index}
                      className={`p-2 rounded-xl border text-center ${
                        isPaid ? 'bg-emerald-50 border-emerald-300' : 'bg-white border-slate-200'
                      }`}
                    >
                      <span className="font-bold text-[10px] block text-slate-700">{m.name}</span>
                      {isPaid ? (
                        <span className="text-[9px] font-black text-emerald-700 block">
                          ✓ {rec.paymentDate?.split('-').reverse().slice(0, 2).join('/')}
                        </span>
                      ) : (
                        <span className="text-[9px] text-slate-300 block">Belum</span>
                      )}
                    </div>
                  );
                })}
              </div>

              <div className="text-[10px] text-slate-500 text-center pt-2 border-t border-amber-200">
                Tarif: Rp {nominalSetting.toLocaleString('id-ID')} / bulan • Tanda tangan Wali Kelas: ____________
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                onClick={() => setStudentCardToPrint(null)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition-colors cursor-pointer"
              >
                Tutup
              </button>
              <button
                onClick={() => {
                  window.print();
                }}
                className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs rounded-xl shadow-xs transition-colors cursor-pointer flex items-center gap-1.5"
              >
                <Printer className="w-4 h-4" />
                Cetak Kartu Ini
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
