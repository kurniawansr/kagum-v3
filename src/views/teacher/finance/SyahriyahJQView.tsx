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
  Download,
  MessageCircle,
  Copy,
  ExternalLink,
  X,
  Info
} from 'lucide-react';
import { exportToExcel, exportToPdf } from '../../../utils/exportUtils';
import { SyahriyahJQRecord, Student } from '../../../types';

export const SyahriyahJQView: React.FC = () => {
  const { students, syahriyahJQRecords, setSyahriyahJQRecords, currentUser, schoolProfile, logActivity } = useApp();
  const currentClass = currentUser?.kelas || 'Kelas 1A';
  const myStudents = useMemo(() => students.filter((s) => s.kelas === currentClass), [students, currentClass]);

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

  // Modal Kirim Pesan WhatsApp
  const [waModalData, setWaModalData] = useState<{
    student: Student;
    messageText: string;
  } | null>(null);

  // Urutan Tahun Ajaran: Juli (index 6, LIBUR/BEBAS) s.d. Juni (index 5)
  // Bulan Juli belum ada kegiatan mengaji sehingga BEBAS syahriyah (11 bulan aktif)
  const monthsAcademicOrder = useMemo(
    () => [
      { name: 'Juli', short: 'Jul', index: 6, order: 1, isExempt: true },
      { name: 'Agustus', short: 'Agt', index: 7, order: 2, isExempt: false },
      { name: 'September', short: 'Sep', index: 8, order: 3, isExempt: false },
      { name: 'Oktober', short: 'Okt', index: 9, order: 4, isExempt: false },
      { name: 'November', short: 'Nov', index: 10, order: 5, isExempt: false },
      { name: 'Desember', short: 'Des', index: 11, order: 6, isExempt: false },
      { name: 'Januari', short: 'Jan', index: 0, order: 7, isExempt: false },
      { name: 'Februari', short: 'Feb', index: 1, order: 8, isExempt: false },
      { name: 'Maret', short: 'Mar', index: 2, order: 9, isExempt: false },
      { name: 'April', short: 'Apr', index: 3, order: 10, isExempt: false },
      { name: 'Mei', short: 'Mei', index: 4, order: 11, isExempt: false },
      { name: 'Juni', short: 'Jun', index: 5, order: 12, isExempt: false },
    ],
    []
  );

  // 11 Bulan Aktif yang wajib membayar syahriyah
  const activeMonths = useMemo(
    () => monthsAcademicOrder.filter((m) => !m.isExempt),
    [monthsAcademicOrder]
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
    // Abaikan jika bulan Juli (karena bebas syahriyah)
    if (monthIndex === 6) return;

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

    // Filter keluar bulan Juli jika sempat terpilih
    const validMonths = selectedMonthsToPay.filter((m) => m !== 6);
    if (validMonths.length === 0) return;

    const newRecords = [...(syahriyahJQRecords || [])];
    validMonths.forEach((mIndex) => {
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
      text: `Berhasil mencatat pembayaran ${validMonths.length} bulan untuk ${selectedStudent.name} (Total: Rp ${(validMonths.length * nominalSetting).toLocaleString('id-ID')})!`,
    });
    setSelectedMonthsToPay([]);
    setTimeout(() => setMessage(null), 3500);
  };

  // Tandai Semua Siswa JQ Lunas Bulan Ini (Setoran Kolektif)
  const handleBulkPayMonth = (monthIndex: number, monthName: string) => {
    if (monthIndex === 6) {
      alert('Bulan Juli belum ada kegiatan mengaji (bebas syahriyah).');
      return;
    }

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

  // Helper Menghitung Statistik Pembayaran Siswa
  const getStudentStats = (studentId: string) => {
    const paidRecords = activeMonths.filter((m) => {
      const rec = (syahriyahJQRecords || []).find(
        (r) => r.studentId === studentId && r.monthIndex === m.index
      );
      return !!rec && !!rec.paymentDate;
    });

    const countPaid = paidRecords.length;
    const totalPaid = countPaid * nominalSetting;
    const targetKewajiban = 11 * nominalSetting; // 11 bulan aktif (Juli libur)
    const sisaTunggakan = Math.max(0, targetKewajiban - totalPaid);

    return {
      countPaid,
      totalPaid,
      targetKewajiban,
      sisaTunggakan,
      paidRecords,
    };
  };

  // Generator Pesan WhatsApp untuk Pembayaran Syahriyah
  const handleOpenWhatsAppMessage = (student: Student, specificMonthIndex?: number) => {
    const studentStats = getStudentStats(student.id);

    let specificMonthText = '';
    if (specificMonthIndex !== undefined) {
      const targetMonth = monthsAcademicOrder.find((m) => m.index === specificMonthIndex);
      const rec = (syahriyahJQRecords || []).find(
        (r) => r.studentId === student.id && r.monthIndex === specificMonthIndex
      );
      const payDateFormatted = rec?.paymentDate
        ? rec.paymentDate.split('-').reverse().join('/')
        : defaultPaymentDate.split('-').reverse().join('/');

      specificMonthText =
        `📌 *Rincian Setoran Kali Ini:*\n` +
        `• Bulan: *${targetMonth?.name || ''}*\n` +
        `• Nominal: *Rp ${nominalSetting.toLocaleString('id-ID')}*\n` +
        `• Tanggal Setor: *${payDateFormatted}*\n` +
        `• Status: *LUNAS ✅*\n\n`;
    }

    // Susun daftar bulan yang sudah lunas
    const paidMonthNames = activeMonths
      .filter((m) => {
        const rec = (syahriyahJQRecords || []).find(
          (r) => r.studentId === student.id && r.monthIndex === m.index
        );
        return !!rec && !!rec.paymentDate;
      })
      .map((m) => {
        const rec = (syahriyahJQRecords || []).find(
          (r) => r.studentId === student.id && r.monthIndex === m.index
        );
        const tgl = rec?.paymentDate ? rec.paymentDate.split('-').reverse().slice(0, 2).join('/') : '';
        return `  ✓ ${m.name}${tgl ? ` (${tgl})` : ''}`;
      });

    const isAllPaid = studentStats.countPaid === 11;

    const messageBody =
      `*BUKTI SETORAN SYAHRIYAH JQ (JAM'IYYATUL QURRA')*\n` +
      `*${schoolProfile.namaMadrasah.toUpperCase()}*\n` +
      `Tahun Ajaran ${schoolProfile.tahunAjaran}\n\n` +
      `Assalamu'alaikum Wr. Wb.\n` +
      `Yth. Bapak/Ibu Wali Murid dari *${student.name}* (${currentClass}),\n\n` +
      `Alhamdulillah, kami telah mencatat penerimaan Iuran Syahriyah JQ (Jam'iyyatul Qurra') ananda.\n\n` +
      specificMonthText +
      `📊 *Rekapitulasi Iuran Syahriyah JQ:*` +
      `\n• Tarif Bulanan: Rp ${nominalSetting.toLocaleString('id-ID')}` +
      `\n• Bulan Lunas: *${studentStats.countPaid} dari 11 bulan aktif*` +
      `\n• Total Telah Disetor: *Rp ${studentStats.totalPaid.toLocaleString('id-ID')}*` +
      `\n• Sisa Kewajiban: *${isAllPaid ? 'LUNAS 100% (Rp 0) 🎉' : `Rp ${studentStats.sisaTunggakan.toLocaleString('id-ID')}`}*` +
      `\n\n📌 *Daftar Bulan yang Sudah Lunas:*` +
      `\n${paidMonthNames.length > 0 ? paidMonthNames.join('\n') : '  (Belum ada)'}` +
      `\n\n💡 *Catatan Khusus:*` +
      `\n_Bulan Juli bebas syahriyah (belum ada kegiatan mengaji/libur awal tahun ajaran)._\n\n` +
      `Terima kasih banyak atas perhatian dan dukungan Bapak/Ibu dalam program pembinaan tahsin & tahfidz Al-Qur'an ananda. Semoga ananda senantiasa istiqamah, berakhlak mulia, dan menjadi hafidz/hafidzah kebanggaan keluarga. Aamiin ya Rabbal 'Alamin.\n\n` +
      `Wassalamu'alaikum Wr. Wb.\n` +
      `*Pengampu JQ / Wali Kelas:*\n` +
      `${currentUser?.name || 'Wali Kelas'}`;

    setWaModalData({
      student,
      messageText: messageBody,
    });
  };

  // Statistik Keseluruhan Kelas (11 Bulan Aktif)
  const stats = useMemo(() => {
    const activeJqStudents = myStudents.filter((s) => jqMembers[s.id] !== false);
    const totalActiveJq = activeJqStudents.length;
    // 11 Bulan Aktif (Bulan Juli Bebas Syahriyah)
    const targetSetoranTahun = totalActiveJq * 11 * nominalSetting;

    let totalSetoranTerkumpul = 0;
    let totalBulanLunas = 0;

    activeJqStudents.forEach((st) => {
      activeMonths.forEach((m) => {
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
  }, [myStudents, jqMembers, syahriyahJQRecords, activeMonths, nominalSetting]);

  // Ekspor PDF Rekap
  const handleExportPdf = () => {
    const titleLines = [
      'REKAPITULASI IURAN SYAHRIYAH JAM’IYYATUL QURRA’ (JQ)',
      `MADRASAH IBTIDAIYAH NEGERI 1 PURBALINGGA — KELAS ${currentClass.toUpperCase()}`,
      `TAHUN AJARAN ${schoolProfile.tahunAjaran} — SEMESTER ${schoolProfile.semester.toUpperCase()}`,
      'Catatan: Bulan Juli bebas syahriyah (belum ada kegiatan mengaji). Kewajiban dihitung 11 bulan aktif.',
    ];

    const monthHeaders = monthsAcademicOrder.map((m) => (m.isExempt ? `${m.short} (Libur)` : m.short));
    const headers = ['No', 'NISN', 'Nama Siswa', 'Status JQ', ...monthHeaders, 'Lunas', 'Total Terbayar'];

    const rows = myStudents.map((st, idx) => {
      const isMember = jqMembers[st.id] !== false;
      let lunasCount = 0;

      const monthCols = monthsAcademicOrder.map((m) => {
        if (m.isExempt) return 'Libur';
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
        isMember ? `${lunasCount}/11` : '0/0',
        `Rp ${(lunasCount * nominalSetting).toLocaleString('id-ID')}`,
      ];
    });

    exportToPdf({
      filename: `Rekap_Syahriyah_JQ_${currentClass.replace(/\s+/g, '_')}`,
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
      `TARIF: Rp ${nominalSetting.toLocaleString('id-ID')} / bulan (11 Bulan Aktif, Juli Libur/Bebas)`,
    ];

    const monthHeaders = monthsAcademicOrder.map((m) => (m.isExempt ? `${m.name} (Libur)` : m.name));
    const headers = ['No', 'NISN', 'Nama Siswa', 'Status Anggota', ...monthHeaders, 'Bulan Lunas', 'Total Setoran (Rp)'];

    const rows = myStudents.map((st, idx) => {
      const isMember = jqMembers[st.id] !== false;
      let lunasCount = 0;

      const monthCols = monthsAcademicOrder.map((m) => {
        if (m.isExempt) return 'Libur (Bebas)';
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
        isMember ? `${lunasCount}/11` : 0,
        lunasCount * nominalSetting,
      ];
    });

    exportToExcel(
      `Rekap_Syahriyah_JQ_${currentClass.replace(/\s+/g, '_')}`,
      'Syahriyah JQ',
      headerLines,
      headers,
      rows
    );
  };

  return (
    <div className="space-y-6">
      {/* Header View & Quick Settings */}
      <div className="bg-white rounded-3xl border border-slate-200/80 p-6 shadow-xs space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-slate-100">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-amber-600 to-yellow-500 text-white flex items-center justify-center font-bold shadow-md shadow-amber-600/20">
              <Coins className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-black text-slate-800 tracking-tight">Iuran Syahriyah JQ</h2>
                <span className="px-2.5 py-0.5 bg-amber-100 text-amber-900 text-[11px] font-black rounded-full uppercase tracking-wider">
                  {currentClass}
                </span>
                <span className="px-2.5 py-0.5 bg-sky-100 text-sky-800 text-[11px] font-bold rounded-full">
                  11 Bulan Aktif (Juli Libur)
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Pengelolaan syahriyah ekstrakurikuler Jam’iyyatul Qurra’ (tahsin & tahfidz) dengan notifikasi WhatsApp resmi.
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

        {/* Setting Tarif & Tanggal Default & Pemberitahuan Juli */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pt-1 text-xs">
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-2">
              <label className="font-bold text-slate-700">Tarif Bulanan:</label>
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

          <div className="flex items-center gap-2 px-3 py-1.5 bg-sky-50 border border-sky-200 rounded-xl text-sky-800 text-[11px] font-medium">
            <Info className="w-4 h-4 text-sky-600 shrink-0" />
            <span>Bulan <strong>Juli bebas syahriyah</strong> (belum ada kegiatan mengaji).</span>
          </div>
        </div>

        {message && (
          <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-900 rounded-xl text-xs flex items-center gap-2 font-semibold">
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
            <div className="space-y-1.5 max-h-[560px] overflow-y-auto pr-1">
              {filteredStudents.map((st) => {
                const isSelected = st.id === selectedStudentId;
                const isMember = jqMembers[st.id] !== false;
                const stStats = getStudentStats(st.id);

                return (
                  <button
                    key={st.id}
                    onClick={() => {
                      setSelectedStudentId(st.id);
                      setSelectedMonthsToPay([]);
                    }}
                    className={`w-full p-2.5 rounded-xl text-left transition-all flex items-center justify-between gap-2 cursor-pointer border ${
                      isSelected
                        ? 'bg-amber-500 text-white font-bold border-amber-600 shadow-xs'
                        : 'bg-white hover:bg-slate-50 text-slate-800 border-slate-200/70'
                    }`}
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="truncate text-xs font-bold">{st.name}</span>
                        {!isMember && (
                          <span className={`text-[9px] px-1 rounded ${isSelected ? 'bg-amber-600 text-white' : 'bg-slate-200 text-slate-600'}`}>
                            Bukan JQ
                          </span>
                        )}
                      </div>
                      <span className={`text-[10px] block ${isSelected ? 'text-amber-100' : 'text-slate-400'}`}>
                        NISN: {st.nisn}
                      </span>
                    </div>

                    <div className="text-right shrink-0">
                      <span className={`text-[11px] font-extrabold px-2 py-0.5 rounded-md ${
                        isSelected
                          ? 'bg-amber-700 text-white'
                          : stStats.countPaid === 11
                          ? 'bg-emerald-100 text-emerald-800'
                          : stStats.countPaid > 0
                          ? 'bg-amber-100 text-amber-800'
                          : 'bg-slate-200 text-slate-600'
                      }`}>
                        {stStats.countPaid}/11 Bln
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
                        {selectedStudent.parentWa && (
                          <span className="ml-2 font-medium text-emerald-700 font-mono">
                            WA: {selectedStudent.parentWa}
                          </span>
                        )}
                      </p>
                    </div>

                    {/* Member Switch, Kirim WA & Print Slip Button */}
                    <div className="flex flex-wrap items-center gap-2">
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

                      {/* Tombol Kirim WhatsApp */}
                      <button
                        onClick={() => handleOpenWhatsAppMessage(selectedStudent)}
                        className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-xs flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs"
                        title="Kirim Laporan & Tanda Terima ke WhatsApp Wali Murid"
                      >
                        <MessageCircle className="w-3.5 h-3.5" />
                        <span>Kirim WA</span>
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
                    const stStats = getStudentStats(selectedStudent.id);

                    return (
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                        <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                          <span className="text-[10px] text-slate-500 block font-semibold">Status Pelunasan</span>
                          <span className="text-sm font-extrabold text-slate-800">
                            {stStats.countPaid} / 11 Bulan Aktif Lunas
                          </span>
                        </div>
                        <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-200">
                          <span className="text-[10px] text-emerald-700 block font-semibold">Total Terbayar</span>
                          <span className="text-sm font-black text-emerald-900">
                            Rp {stStats.totalPaid.toLocaleString('id-ID')}
                          </span>
                        </div>
                        <div className="p-3 bg-rose-50 rounded-xl border border-rose-200">
                          <span className="text-[10px] text-rose-700 block font-semibold">Sisa Kewajiban</span>
                          <span className="text-sm font-black text-rose-900">
                            {jqMembers[selectedStudent.id] !== false
                              ? stStats.countPaid === 11
                                ? 'LUNAS (Rp 0)'
                                : `Rp ${stStats.sisaTunggakan.toLocaleString('id-ID')}`
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
                        Kartu Status Pembayaran (Tahun Ajaran {schoolProfile.tahunAjaran})
                      </h4>
                      <p className="text-[11px] text-slate-500">
                        Klik pada kartu bulan untuk menandai <strong>Lunas</strong> atau <strong>Batal</strong>. <em>Bulan Juli bebas syahriyah (belum ada kegiatan).</em>
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
                      // KASUS BULAN JULI (LIBUR / BEBAS SYAHRIYAH)
                      if (m.isExempt) {
                        return (
                          <div
                            key={m.index}
                            className="p-3 rounded-2xl border border-dashed border-sky-300 bg-sky-50/50 flex flex-col justify-between"
                          >
                            <div>
                              <div className="flex items-center gap-1.5">
                                <span className="text-[10px] font-extrabold text-sky-600">Bln 1</span>
                                <h5 className="font-extrabold text-sky-950 text-sm">{m.name}</h5>
                              </div>
                              <div className="mt-2 space-y-1">
                                <span className="inline-block px-2 py-0.5 rounded-full bg-sky-200 text-sky-900 text-[10px] font-black">
                                  BEBAS SYAHRIYAH
                                </span>
                                <p className="text-[10px] text-sky-700 leading-tight">
                                  Belum ada kegiatan mengaji.
                                </p>
                              </div>
                            </div>
                            <div className="mt-3 pt-2 border-t border-sky-200/60 text-center">
                              <span className="text-[10px] text-sky-600 font-semibold italic">Tidak Dipungut Biaya</span>
                            </div>
                          </div>
                        );
                      }

                      // BULAN-BULAN AKTIF LAINNYA
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
                                <div className="flex items-center gap-1.5">
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
                                    Ubah
                                  </button>
                                  <button
                                    onClick={() => handleOpenWhatsAppMessage(selectedStudent, m.index)}
                                    className="p-1 text-emerald-700 hover:bg-emerald-100 rounded-md transition-colors"
                                    title="Kirim Bukti WA Bulan Ini"
                                  >
                                    <MessageCircle className="w-3.5 h-3.5" />
                                  </button>
                                </div>
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
                Cukup klik 1 kali pada kotak bulan untuk menandai <strong>Lunas</strong> atau <strong>Batal</strong>. <em>Bulan Juli bebas syahriyah (belum ada mengaji).</em>
              </p>
            </div>

            <div className="flex items-center gap-3 text-xs font-semibold text-slate-600">
              <span className="flex items-center gap-1.5">
                <span className="w-3.5 h-3.5 rounded bg-emerald-500 text-white flex items-center justify-center text-[9px] font-bold">✓</span>
                Lunas
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-3.5 h-3.5 rounded bg-slate-100 border border-slate-300"></span>
                Belum Bayar
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-3.5 h-3.5 rounded bg-sky-100 text-sky-800 border border-sky-300 flex items-center justify-center text-[8px] font-bold">L</span>
                Juli (Libur)
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
                  <th className="p-2.5 w-20 text-center" rowSpan={2}>Status</th>
                  <th
                    className="p-2 text-center bg-amber-100/70 text-amber-950 font-extrabold border-b border-slate-200 uppercase tracking-wider"
                    colSpan={12}
                  >
                    11 BULAN AKTIF (JULI LIBUR / BEBAS SYAHRIYAH)
                  </th>
                  <th className="p-2.5 text-right w-20" rowSpan={2}>Lunas</th>
                  <th className="p-2.5 text-right w-28" rowSpan={2}>Total Setor</th>
                  <th className="p-2.5 text-center w-14" rowSpan={2}>WA</th>
                </tr>
                <tr className="bg-slate-50 text-slate-700 font-semibold text-[11px]">
                  {monthsAcademicOrder.map((m) => (
                    <th
                      key={m.index}
                      className={`p-1.5 text-center border-r border-slate-200 ${
                        m.isExempt ? 'bg-sky-50 text-sky-900 font-black' : ''
                      }`}
                    >
                      <div className="flex flex-col items-center">
                        <span>{m.short}</span>
                        {m.isExempt ? (
                          <span className="text-[9px] text-sky-700 font-extrabold">Libur</span>
                        ) : (
                          <button
                            onClick={() => handleBulkPayMonth(m.index, m.name)}
                            className="text-[9px] text-amber-700 hover:text-amber-900 font-bold underline cursor-pointer"
                            title={`Tandai semua anggota JQ lunas bulan ${m.name}`}
                          >
                            Semua
                          </button>
                        )}
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
                        // KASUS BULAN JULI (LIBUR / BEBAS)
                        if (m.isExempt) {
                          return (
                            <td
                              key={m.index}
                              className="p-1 text-center border-r border-slate-100 bg-sky-50/30"
                              title="Bulan Juli bebas syahriyah (belum ada kegiatan mengaji)"
                            >
                              <span className="inline-block px-1.5 py-0.5 rounded bg-sky-100 text-sky-800 text-[9px] font-extrabold">
                                Libur
                              </span>
                            </td>
                          );
                        }

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
                              className={`w-7 h-7 rounded-lg font-black text-xs transition-all inline-flex flex-col items-center justify-center cursor-pointer shadow-2xs ${
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
                              {isPaid ? <Check className="w-3.5 h-3.5 stroke-[3]" /> : '—'}
                            </button>
                          </td>
                        );
                      })}

                      {/* Summary Columns: Lunas dari 11 Bulan Aktif */}
                      <td className="p-2.5 text-right font-bold text-slate-700">
                        {isMember ? `${paidMonthsCount}/11` : '0/0'}
                      </td>
                      <td className="p-2.5 text-right font-black text-emerald-800 bg-emerald-50/40">
                        Rp {(paidMonthsCount * nominalSetting).toLocaleString('id-ID')}
                      </td>
                      <td className="p-2.5 text-center">
                        <button
                          onClick={() => handleOpenWhatsAppMessage(st)}
                          className="p-1 text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors cursor-pointer"
                          title="Kirim Ringkasan WA ke Wali Murid"
                        >
                          <MessageCircle className="w-4 h-4" />
                        </button>
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
                Rekapitulasi total kas syahriyah yang ditarik oleh Wali Kelas {currentClass} untuk disetorkan ke Koordinator/Pembina JQ Madrasah (11 bulan aktif).
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
              // Jika Juli, tampilkan kartu keterangan libur
              if (m.isExempt) {
                return (
                  <div
                    key={m.index}
                    className="p-4 rounded-xl border border-dashed border-sky-300 bg-sky-50/50 space-y-2"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-extrabold text-sm text-sky-950">Bulan {m.name}</span>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-sky-200 text-sky-900">
                        Bebas Syahriyah
                      </span>
                    </div>
                    <div className="flex items-baseline justify-between pt-1">
                      <span className="text-xs text-sky-700">Keterangan:</span>
                      <span className="text-xs font-bold text-sky-800">
                        Belum ada kegiatan mengaji
                      </span>
                    </div>
                  </div>
                );
              }

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
                Dari {stats.totalBulanLunas} transaksi pembayaran bulan oleh {stats.totalActiveJq} siswa anggota JQ (11 bulan aktif).
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

      {/* MODAL: NOTIFIKASI TANDA TERIMA WHATSAPP */}
      {waModalData && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl border border-slate-200 max-w-lg w-full p-6 shadow-2xl animate-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <span className="font-extrabold text-xs text-emerald-800 uppercase tracking-wider flex items-center gap-1.5">
                <MessageCircle className="w-4 h-4 text-emerald-600" />
                Kirim Bukti Pembayaran Syahriyah JQ ke WhatsApp
              </span>
              <button
                onClick={() => setWaModalData(null)}
                className="p-1 rounded-lg text-slate-400 hover:bg-slate-100 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="mt-4 space-y-3 text-xs">
              <div className="flex items-center justify-between">
                <span className="font-bold text-slate-700">Wali Murid Siswa:</span>
                <span className="font-black text-slate-900">{waModalData.student.name}</span>
              </div>

              {waModalData.student.parentWa ? (
                <div className="p-2.5 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center justify-between">
                  <span className="text-emerald-800 font-bold text-[11px]">
                    Nomor WhatsApp Terdaftar: {waModalData.student.parentWa}
                  </span>
                  <span className="text-[10px] bg-emerald-200 text-emerald-900 font-extrabold px-2 py-0.5 rounded-full">
                    Tersedia
                  </span>
                </div>
              ) : (
                <div className="p-2.5 bg-amber-50 border border-amber-200 rounded-xl text-amber-800 text-[11px] font-medium">
                  Nomor WhatsApp belum terdaftar di data siswa. Anda dapat menyalin teks pesan ini dan mengirimkannya secara manual.
                </div>
              )}

              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">
                  Isi Pesan WhatsApp:
                </label>
                <textarea
                  rows={9}
                  readOnly
                  value={waModalData.messageText}
                  className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl font-mono text-[11px] text-slate-800 focus:outline-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard.writeText(waModalData.messageText);
                    setMessage({ type: 'success', text: 'Teks pesan WhatsApp berhasil disalin ke clipboard!' });
                    setTimeout(() => setMessage(null), 3000);
                  }}
                  className="flex items-center gap-1.5 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold rounded-xl cursor-pointer"
                >
                  <Copy className="w-4 h-4 text-slate-600" />
                  Salin Teks
                </button>

                {waModalData.student.parentWa && (
                  <a
                    href={`https://wa.me/${waModalData.student.parentWa.replace(/[^0-9]/g, '')}?text=${encodeURIComponent(
                      waModalData.messageText
                    )}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl shadow-xs cursor-pointer transition-colors"
                  >
                    <ExternalLink className="w-4 h-4" />
                    Buka WhatsApp
                  </a>
                )}
              </div>
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
                <p className="text-[10px] text-amber-800 font-semibold mt-0.5">
                  (11 Bulan Aktif • Bulan Juli Bebas Syahriyah)
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
                  if (m.isExempt) {
                    return (
                      <div
                        key={m.index}
                        className="p-2 rounded-xl border border-sky-300 bg-sky-50 text-center"
                      >
                        <span className="font-bold text-[10px] block text-sky-800">{m.name}</span>
                        <span className="text-[9px] font-extrabold text-sky-700 block">Libur JQ</span>
                      </div>
                    );
                  }

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
                Tarif: Rp {nominalSetting.toLocaleString('id-ID')} / bulan (11 Bulan) • Tanda tangan Wali Kelas: ____________
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
