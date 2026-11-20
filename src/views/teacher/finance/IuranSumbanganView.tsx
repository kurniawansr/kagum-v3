import React, { useState, useMemo } from 'react';
import { useApp } from '../../../context/AppContext';
import { DonationCategory, DonationPayment, DonationExpense } from '../../../types';
import {
  Wallet,
  Plus,
  Printer,
  FileSpreadsheet,
  FileText,
  CheckCircle2,
  Trash2,
  Edit2,
  ListFilter,
  CheckSquare,
  Square,
  Zap,
  Receipt,
  MessageCircle,
  Search,
  ArrowDownRight,
  ArrowUpRight,
  Users,
  Calendar,
  X,
  Copy,
  ExternalLink,
  DollarSign,
  Sparkles
} from 'lucide-react';
import { exportToExcel, exportToPdf } from '../../../utils/exportUtils';

// Helper konversi angka ke terbilang bahasa Indonesia
function terbilang(n: number): string {
  if (n <= 0) return 'Nol Rupiah';
  const satuan = ['', 'Satu', 'Dua', 'Tiga', 'Empat', 'Lima', 'Enam', 'Tujuh', 'Delapan', 'Sembilan', 'Sepuluh', 'Sebelas'];
  const konversi = (num: number): string => {
    if (num < 12) return satuan[num];
    if (num < 20) return konversi(num - 10) + ' Belas';
    if (num < 100) return konversi(Math.floor(num / 10)) + ' Puluh ' + konversi(num % 10);
    if (num < 200) return 'Seratus ' + konversi(num - 100);
    if (num < 1000) return konversi(Math.floor(num / 100)) + ' Ratus ' + konversi(num % 100);
    if (num < 2000) return 'Seribu ' + konversi(num - 1000);
    if (num < 1000000) return konversi(Math.floor(num / 1000)) + ' Ribu ' + konversi(num % 1000);
    if (num < 1000000000) return konversi(Math.floor(num / 1000000)) + ' Juta ' + konversi(num % 1000000);
    return num.toString();
  };
  return (konversi(Math.floor(n)).trim().replace(/\s+/g, ' ') + ' Rupiah');
}

export const IuranSumbanganView: React.FC = () => {
  const {
    students,
    currentUser,
    schoolProfile,
    donationCategories,
    setDonationCategories,
    donationPayments,
    setDonationPayments,
    donationExpenses,
    setDonationExpenses,
    logActivity,
  } = useApp();

  const currentClass = currentUser?.kelas || 'Kelas 1A';
  const myStudents = useMemo(() => {
    return (students || []).filter((s) => s.kelas === currentClass);
  }, [students, currentClass]);

  // Kategori aktif (default atau pertama)
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>(() => {
    if (donationCategories && donationCategories.length > 0) {
      return donationCategories[0].id;
    }
    return 'doncat-1';
  });

  // Active Category Object
  const activeCategory: DonationCategory = useMemo(() => {
    if (donationCategories && donationCategories.length > 0) {
      const found = donationCategories.find((c) => c.id === selectedCategoryId);
      if (found) return found;
      return donationCategories[0];
    }
    // Fallback jika belum ada kategori
    return {
      id: 'doncat-1',
      name: `Iuran Kas ${currentClass}`,
      type: 'Iuran',
      nature: 'Ditentukan',
      targetNominal: 5000,
    };
  }, [donationCategories, selectedCategoryId, currentClass]);

  // Tab Menu: 'setoran' | 'pengeluaran' | 'rekap'
  const [activeTab, setActiveTab] = useState<'setoran' | 'pengeluaran' | 'rekap'>('setoran');

  // Filter & Search Siswa
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'paid' | 'unpaid'>('all');

  // Seleksi Cepat / Checkbox Massal
  const [selectedStudentIds, setSelectedStudentIds] = useState<string[]>([]);
  const [batchDate, setBatchDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [batchNominal, setBatchNominal] = useState<number>(() => activeCategory?.targetNominal || 10000);

  // Form Kategori Iuran/Sumbangan Modal
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [editingCategoryId, setEditingCategoryId] = useState<string | null>(null);
  const [catName, setCatName] = useState('');
  const [catType, setCatType] = useState<'Iuran' | 'Sumbangan'>('Iuran');
  const [catNature, setCatNature] = useState<'Seikhlasnya' | 'Ditentukan'>('Ditentukan');
  const [catNominal, setCatNominal] = useState<number>(5000);
  const [catDesc, setCatDesc] = useState('');

  // Form Pengeluaran Kegiatan Modal
  const [showExpenseModal, setShowExpenseModal] = useState(false);
  const [expTitle, setExpTitle] = useState('');
  const [expAmount, setExpAmount] = useState<number>(0);
  const [expDate, setExpDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [expNote, setExpNote] = useState('');

  // Modal Kwitansi & WhatsApp
  const [receiptStudent, setReceiptStudent] = useState<{ student: any; payment: DonationPayment } | null>(null);
  const [waModalStudent, setWaModalStudent] = useState<{ student: any; payment: DonationPayment; messageText: string } | null>(null);

  // Pesan toast notifikasi
  const [toastMessage, setToastMessage] = useState('');
  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(''), 3500);
  };

  const [printDate, setPrintDate] = useState(new Date().toISOString().split('T')[0]);

  // Record Pembayaran untuk Kategori Aktif
  const activePayments = useMemo(() => {
    return (donationPayments || []).filter((p) => p.categoryId === activeCategory.id);
  }, [donationPayments, activeCategory.id]);

  // Helper get payment record per student
  const getStudentRecord = (studentId: string): DonationPayment | undefined => {
    return activePayments.find((p) => p.studentId === studentId);
  };

  // Record Pengeluaran untuk Kategori Aktif
  const activeExpenses = useMemo(() => {
    return (donationExpenses || []).filter((e) => e.categoryId === activeCategory.id);
  }, [donationExpenses, activeCategory.id]);

  // Perhitungan Metrik & KPI
  const metrics = useMemo(() => {
    const totalStudents = myStudents.length;
    let paidCount = 0;
    let totalCollected = 0;

    myStudents.forEach((st) => {
      const rec = getStudentRecord(st.id);
      if (rec && rec.amount > 0) {
        paidCount++;
        totalCollected += rec.amount;
      }
    });

    const unpaidCount = totalStudents - paidCount;
    const isDetermined = activeCategory.nature === 'Ditentukan';
    const targetNominal = activeCategory.targetNominal || 0;
    const totalTarget = isDetermined ? totalStudents * targetNominal : 0;
    const percentage = totalTarget > 0 ? Math.min(100, Math.round((totalCollected / totalTarget) * 100)) : (totalStudents > 0 ? Math.round((paidCount / totalStudents) * 100) : 0);

    const totalExpense = activeExpenses.reduce((sum, e) => sum + (e.amount || 0), 0);
    const balance = totalCollected - totalExpense;

    return {
      totalStudents,
      paidCount,
      unpaidCount,
      totalCollected,
      totalTarget,
      percentage,
      totalExpense,
      balance,
    };
  }, [myStudents, activePayments, activeCategory, activeExpenses]);

  // Siswa yang difilter
  const filteredStudents = useMemo(() => {
    return myStudents.filter((st) => {
      const matchSearch = st.name.toLowerCase().includes(searchQuery.toLowerCase()) || st.nisn.includes(searchQuery);
      if (!matchSearch) return false;

      const rec = getStudentRecord(st.id);
      const isPaid = rec && rec.amount > 0;

      if (statusFilter === 'paid') return isPaid;
      if (statusFilter === 'unpaid') return !isPaid;
      return true;
    });
  }, [myStudents, searchQuery, statusFilter, activePayments]);

  // Handler CRUD Kategori
  const handleOpenAddCategory = () => {
    setEditingCategoryId(null);
    setCatName('');
    setCatType('Iuran');
    setCatNature('Ditentukan');
    setCatNominal(5000);
    setCatDesc('');
    setShowCategoryModal(true);
  };

  const handleOpenEditCategory = (cat: DonationCategory) => {
    setEditingCategoryId(cat.id);
    setCatName(cat.name);
    setCatType(cat.type);
    setCatNature(cat.nature);
    setCatNominal(cat.targetNominal || 5000);
    setCatDesc(cat.description || '');
    setShowCategoryModal(true);
  };

  const handleSaveCategory = (e: React.FormEvent) => {
    e.preventDefault();
    if (!catName.trim()) return;

    if (editingCategoryId) {
      setDonationCategories((prev) =>
        prev.map((c) =>
          c.id === editingCategoryId
            ? {
                ...c,
                name: catName,
                type: catType,
                nature: catNature,
                targetNominal: catNominal,
                description: catDesc,
              }
            : c
        )
      );
      showToast(`Program "${catName}" berhasil diperbarui!`);
      logActivity?.('Ubah Iuran', `Memperbarui program iuran: ${catName}`, 'Keuangan', 'Sukses');
    } else {
      const newCat: DonationCategory = {
        id: `doncat-${Date.now()}`,
        name: catName,
        type: catType,
        nature: catNature,
        targetNominal: catNominal,
        description: catDesc,
        kelas: currentClass,
      };
      setDonationCategories((prev) => [...prev, newCat]);
      setSelectedCategoryId(newCat.id);
      showToast(`Program baru "${catName}" berhasil ditambahkan!`);
      logActivity?.('Tambah Iuran', `Membuat program iuran baru: ${catName}`, 'Keuangan', 'Sukses');
    }

    setShowCategoryModal(false);
  };

  const handleDeleteCategory = (catId: string) => {
    const toDelete = donationCategories.find((c) => c.id === catId);
    if (!toDelete) return;

    if (confirm(`Yakin ingin menghapus program "${toDelete.name}" beserta catatan pembayarannya?`)) {
      setDonationCategories((prev) => prev.filter((c) => c.id !== catId));
      setDonationPayments((prev) => prev.filter((p) => p.categoryId !== catId));
      setDonationExpenses((prev) => prev.filter((e) => e.categoryId !== catId));

      const remaining = donationCategories.filter((c) => c.id !== catId);
      if (remaining.length > 0) {
        setSelectedCategoryId(remaining[0].id);
      }
      showToast(`Program "${toDelete.name}" telah dihapus.`);
    }
  };

  // Handler Setoran Siswa Tunggal
  const handleSaveStudentDeposit = (studentId: string, amount: number, dateStr: string) => {
    const existingIndex = donationPayments.findIndex(
      (p) => p.categoryId === activeCategory.id && p.studentId === studentId
    );

    if (existingIndex >= 0) {
      const updated = [...donationPayments];
      if (amount <= 0) {
        updated.splice(existingIndex, 1);
        setDonationPayments(updated);
        showToast('Setoran siswa berhasil direset.');
      } else {
        updated[existingIndex] = {
          ...updated[existingIndex],
          amount,
          date: dateStr || new Date().toISOString().split('T')[0],
        };
        setDonationPayments(updated);
      }
    } else if (amount > 0) {
      const newPay: DonationPayment = {
        id: `pay-${studentId}-${Date.now()}`,
        categoryId: activeCategory.id,
        studentId,
        amount,
        date: dateStr || new Date().toISOString().split('T')[0],
      };
      setDonationPayments([...donationPayments, newPay]);
    }
  };

  // Aksi Cepat 1-Klik: Bayar Lunas Cepat
  const handleQuickPayStudent = (studentId: string) => {
    const defaultAmt = activeCategory.nature === 'Ditentukan' ? (activeCategory.targetNominal || 10000) : 10000;
    const today = new Date().toISOString().split('T')[0];
    handleSaveStudentDeposit(studentId, defaultAmt, today);
    showToast('Pembayaran berhasil dicatat lunas!');
  };

  // Aksi Cepat Massal: "Tandai Lunas Semua Siswa yang Belum Bayar"
  const handleMarkAllUnpaidAsPaid = () => {
    const unpaidStudents = myStudents.filter((st) => {
      const rec = getStudentRecord(st.id);
      return !rec || rec.amount <= 0;
    });

    if (unpaidStudents.length === 0) {
      showToast('Semua siswa di kelas ini sudah lunas!');
      return;
    }

    const defaultAmt = activeCategory.nature === 'Ditentukan' ? (activeCategory.targetNominal || 10000) : batchNominal;
    const targetDate = batchDate || new Date().toISOString().split('T')[0];

    const newPayments = unpaidStudents.map((st) => ({
      id: `pay-${st.id}-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      categoryId: activeCategory.id,
      studentId: st.id,
      amount: defaultAmt,
      date: targetDate,
    }));

    const filteredExisting = donationPayments.filter(
      (p) => !(p.categoryId === activeCategory.id && unpaidStudents.some((st) => st.id === p.studentId))
    );

    setDonationPayments([...filteredExisting, ...newPayments]);
    showToast(`Berhasil! ${unpaidStudents.length} siswa langsung ditandai lunas.`);
    logActivity?.('Setor Massal', `Tandai lunas massal ${unpaidStudents.length} siswa untuk ${activeCategory.name}`, 'Keuangan', 'Sukses');
  };

  // Aksi Cepat Massal: "Terapkan ke Siswa Terpilih"
  const handleApplyBatchDeposit = () => {
    if (selectedStudentIds.length === 0) {
      showToast('Silakan pilih minimal satu siswa dengan mencentang kotak.');
      return;
    }

    const defaultAmt = batchNominal > 0 ? batchNominal : (activeCategory.targetNominal || 10000);
    const targetDate = batchDate || new Date().toISOString().split('T')[0];

    const updated = donationPayments.filter(
      (p) => !(p.categoryId === activeCategory.id && selectedStudentIds.includes(p.studentId))
    );

    const newBatch = selectedStudentIds.map((id) => ({
      id: `pay-${id}-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      categoryId: activeCategory.id,
      studentId: id,
      amount: defaultAmt,
      date: targetDate,
    }));

    setDonationPayments([...updated, ...newBatch]);
    showToast(`Berhasil menerapkan setoran Rp ${defaultAmt.toLocaleString('id-ID')} ke ${selectedStudentIds.length} siswa terpilih!`);
    setSelectedStudentIds([]);
  };

  // Toggle Seleksi Semua
  const handleToggleSelectAll = () => {
    if (selectedStudentIds.length === filteredStudents.length) {
      setSelectedStudentIds([]);
    } else {
      setSelectedStudentIds(filteredStudents.map((s) => s.id));
    }
  };

  // Toggle Seleksi Tunggal
  const handleToggleSelectStudent = (id: string) => {
    setSelectedStudentIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  // CRUD Pengeluaran Kegiatan
  const handleSaveExpense = (e: React.FormEvent) => {
    e.preventDefault();
    if (!expTitle.trim() || expAmount <= 0) return;

    const newExp: DonationExpense = {
      id: `exp-${Date.now()}`,
      categoryId: activeCategory.id,
      title: expTitle,
      amount: expAmount,
      date: expDate || new Date().toISOString().split('T')[0],
      note: expNote,
    };

    setDonationExpenses([...(donationExpenses || []), newExp]);
    setExpTitle('');
    setExpAmount(0);
    setExpNote('');
    setShowExpenseModal(false);
    showToast(`Pengeluaran "${expTitle}" berhasil dicatat!`);
  };

  const handleDeleteExpense = (expId: string) => {
    if (confirm('Hapus rincian pengeluaran ini?')) {
      setDonationExpenses((donationExpenses || []).filter((e) => e.id !== expId));
      showToast('Pengeluaran berhasil dihapus.');
    }
  };

  // Cetak Kwitansi Mini Modal Open
  const handleOpenReceipt = (student: any) => {
    const pay = getStudentRecord(student.id);
    if (!pay || pay.amount <= 0) {
      showToast('Siswa ini belum memiliki catatan setoran.');
      return;
    }
    setReceiptStudent({ student, payment: pay });
  };

  // WhatsApp Tanda Terima Modal Open
  const handleOpenWhatsApp = (student: any) => {
    const pay = getStudentRecord(student.id);
    if (!pay || pay.amount <= 0) {
      showToast('Siswa ini belum memiliki catatan setoran.');
      return;
    }

    const tgl = pay.date ? pay.date.split('-').reverse().join('/') : '-';
    const nominalRp = `Rp ${pay.amount.toLocaleString('id-ID')}`;
    const textMsg = `*TANDA TERIMA PEMBAYARAN - ${schoolProfile.namaMadrasah.toUpperCase()}*\n\n` +
      `Assalamu'alaikum Wr. Wb.\n` +
      `Yth. Bapak/Ibu Wali Murid dari *${student.name}* (Kelas ${currentClass}),\n\n` +
      `Alhamdulillah telah diterima pembayaran:\n` +
      `📌 *Jenis Kegiatan:* ${activeCategory.name}\n` +
      `💰 *Jumlah:* ${nominalRp} (${terbilang(pay.amount)})\n` +
      `📅 *Tanggal:* ${tgl}\n` +
      `📝 *Status:* Lunas\n\n` +
      `Terima kasih atas partisipasi dan dukungannya. Semoga berkah dan bermanfaat.\n\n` +
      `Wassalamu'alaikum Wr. Wb.\n` +
      `*Wali Kelas:* ${currentUser?.name || 'Wali Kelas'}`;

    setWaModalStudent({ student, payment: pay, messageText: textMsg });
  };

  // Ekspor PDF Laporan Lengkap
  const handleExportPdf = () => {
    const titleLines = [
      `REKAPITULASI LAPORAN ${activeCategory.name.toUpperCase()}`,
      `KELAS: ${currentClass.toUpperCase()} | TAHUN AJARAN ${schoolProfile.tahunAjaran}`,
      `Sifat: ${activeCategory.nature} | Target: Rp ${(activeCategory.targetNominal || 0).toLocaleString('id-ID')}`,
    ];

    const headers = ['No', 'NISN', 'Nama Siswa', 'Tanggal Setor', 'Nominal', 'Status'];
    const rows = myStudents.map((st, idx) => {
      const rec = getStudentRecord(st.id);
      const amt = rec ? rec.amount : 0;
      const dateStr = rec && rec.date ? rec.date.split('-').reverse().join('/') : '-';
      const statusStr = amt > 0 ? 'Lunas' : 'Belum Bayar';

      return [
        idx + 1,
        st.nisn,
        st.name,
        dateStr,
        `Rp ${amt.toLocaleString('id-ID')}`,
        statusStr,
      ];
    });

    // Tambah baris total
    rows.push([
      '',
      '',
      'TOTAL DANA MASUK',
      '',
      `Rp ${metrics.totalCollected.toLocaleString('id-ID')}`,
      `${metrics.paidCount} / ${metrics.totalStudents} Siswa`,
    ]);

    if (metrics.totalExpense > 0) {
      rows.push([
        '',
        '',
        'TOTAL PENGELUARAN KEGIATAN',
        '',
        `Rp ${metrics.totalExpense.toLocaleString('id-ID')}`,
        `${activeExpenses.length} Rincian`,
      ]);
      rows.push([
        '',
        '',
        'SISA SALDO KAS AKHIR',
        '',
        `Rp ${metrics.balance.toLocaleString('id-ID')}`,
        metrics.balance >= 0 ? 'Surplus' : 'Defisit',
      ]);
    }

    exportToPdf({
      filename: `Laporan_${activeCategory.name.replace(/\s+/g, '_')}_${currentClass.replace(/\s+/g, '_')}`,
      titleLines,
      tableHeaders: headers,
      tableRows: rows,
      schoolProfile,
      printDate,
      teacherName: currentUser?.name,
      teacherNip: currentUser?.nip,
      columnStyles: {
        0: { halign: 'center' },
        1: { halign: 'center' },
        2: { halign: 'left' },
        3: { halign: 'center' },
        4: { halign: 'right' },
        5: { halign: 'center' },
      },
    });
  };

  // Ekspor Excel
  const handleExportExcel = () => {
    const headerLines = [
      `REKAPITULASI LAPORAN ${activeCategory.name}`,
      `KELAS: ${currentClass} | TAHUN AJARAN ${schoolProfile.tahunAjaran}`,
      `Total Terkumpul: Rp ${metrics.totalCollected.toLocaleString('id-ID')} | Pengeluaran: Rp ${metrics.totalExpense.toLocaleString('id-ID')} | Sisa: Rp ${metrics.balance.toLocaleString('id-ID')}`,
    ];

    const headers = ['No', 'NISN', 'Nama Siswa', 'Tanggal Setor', 'Nominal (Rp)', 'Status'];
    const rows = myStudents.map((st, idx) => {
      const rec = getStudentRecord(st.id);
      const amt = rec ? rec.amount : 0;
      const dateStr = rec && rec.date ? rec.date : '-';
      const statusStr = amt > 0 ? 'Lunas' : 'Belum';

      return [idx + 1, st.nisn, st.name, dateStr, amt, statusStr];
    });

    exportToExcel(
      `Rekap_${activeCategory.name.replace(/\s+/g, '_')}_${currentClass.replace(/\s+/g, '_')}`,
      'Iuran Sumbangan',
      headerLines,
      headers,
      rows
    );
  };

  return (
    <div className="space-y-6">
      {/* Toast Alert */}
      {toastMessage && (
        <div className="fixed top-6 right-6 z-50 flex items-center gap-3 bg-emerald-900 text-white px-5 py-3 rounded-2xl shadow-xl border border-emerald-700 animate-in fade-in slide-in-from-top-4">
          <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
          <span className="text-xs font-semibold">{toastMessage}</span>
        </div>
      )}

      {/* Header Utama & Pemilihan Kategori */}
      <div className="bg-white rounded-3xl border border-slate-200/80 p-6 shadow-xs">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-5 border-b border-slate-100">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-teal-700 to-emerald-600 text-white flex items-center justify-center font-bold shadow-md shadow-teal-700/20">
              <Wallet className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-black text-slate-800 tracking-tight">Iuran & Sumbangan Kegiatan</h2>
                <span className="px-2.5 py-0.5 bg-teal-100 text-teal-800 text-[11px] font-black rounded-full uppercase tracking-wider">
                  {currentClass}
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Manajemen pencatatan penerimaan siswa, arus pengeluaran kegiatan, dan laporan kas transparan.
              </p>
            </div>
          </div>

          {/* Action Buttons Header */}
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
              onClick={handleOpenAddCategory}
              className="flex items-center gap-1.5 px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs rounded-xl transition-all shadow-sm shadow-emerald-700/20 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              Buat Iuran / Sumbangan
            </button>

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
              Cetak LPJ (PDF)
            </button>
          </div>
        </div>

        {/* Tab Selector Program Iuran / Sumbangan */}
        <div className="mt-5">
          <div className="flex items-center justify-between mb-2.5">
            <label className="text-[11px] font-black text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
              <ListFilter className="w-3.5 h-3.5 text-teal-600" />
              Pilih Program Iuran / Sumbangan Aktif:
            </label>
            <span className="text-[11px] text-slate-400 font-medium">
              Tersimpan permanen di database
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            {(donationCategories || []).map((cat) => {
              const isSelected = selectedCategoryId === cat.id;
              return (
                <div
                  key={cat.id}
                  className={`group flex items-center gap-2 pl-3.5 pr-2 py-2 rounded-2xl text-xs font-bold border transition-all ${
                    isSelected
                      ? 'bg-gradient-to-r from-teal-800 to-emerald-800 text-white border-teal-800 shadow-md shadow-teal-900/10'
                      : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100 hover:border-slate-300'
                  }`}
                >
                  <button
                    onClick={() => {
                      setSelectedCategoryId(cat.id);
                      setSelectedStudentIds([]);
                    }}
                    className="cursor-pointer text-left flex items-center gap-2"
                  >
                    <span>{cat.name}</span>
                    <span
                      className={`text-[10px] px-2 py-0.5 rounded-full font-black ${
                        isSelected
                          ? 'bg-white/20 text-white'
                          : cat.type === 'Iuran'
                          ? 'bg-teal-100 text-teal-800'
                          : 'bg-amber-100 text-amber-800'
                      }`}
                    >
                      {cat.type}
                    </span>
                  </button>

                  <div className={`flex items-center gap-0.5 ml-1 border-l pl-1.5 ${isSelected ? 'border-white/30' : 'border-slate-200'}`}>
                    <button
                      onClick={() => handleOpenEditCategory(cat)}
                      className={`p-1 rounded-md transition-colors cursor-pointer ${
                        isSelected ? 'hover:bg-white/20 text-white' : 'hover:bg-slate-200 text-slate-500'
                      }`}
                      title="Edit Program"
                    >
                      <Edit2 className="w-3 h-3" />
                    </button>
                    <button
                      onClick={() => handleDeleteCategory(cat.id)}
                      className={`p-1 rounded-md transition-colors cursor-pointer ${
                        isSelected ? 'hover:bg-rose-500 text-rose-200' : 'hover:bg-rose-100 text-rose-500'
                      }`}
                      title="Hapus Program"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* DASHBOARD METRIK & EXECUTIVE CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Dana Masuk */}
        <div className="bg-gradient-to-br from-emerald-50 to-teal-50/50 rounded-3xl border border-emerald-200/80 p-5 shadow-xs relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-emerald-800 uppercase tracking-wider">Total Dana Masuk</span>
            <div className="w-8 h-8 rounded-xl bg-emerald-600/10 text-emerald-700 flex items-center justify-center">
              <ArrowDownRight className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2">
            <div className="text-2xl font-black text-emerald-950">
              Rp {metrics.totalCollected.toLocaleString('id-ID')}
            </div>
            <div className="flex items-center justify-between text-xs text-emerald-700 mt-2 font-semibold">
              <span>{metrics.paidCount} dari {metrics.totalStudents} siswa lunas</span>
              <span className="font-black">{metrics.percentage}%</span>
            </div>
            {/* Progress Bar */}
            <div className="w-full bg-emerald-200/60 rounded-full h-2 mt-1.5 overflow-hidden">
              <div
                className="bg-emerald-600 h-full rounded-full transition-all duration-500"
                style={{ width: `${metrics.percentage}%` }}
              />
            </div>
          </div>
        </div>

        {/* Card 2: Status Partisipasi */}
        <div className="bg-white rounded-3xl border border-slate-200 p-5 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Partisipasi Siswa</span>
            <div className="w-8 h-8 rounded-xl bg-teal-50 text-teal-700 flex items-center justify-center">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2">
            <div className="text-2xl font-black text-slate-800">
              {metrics.paidCount} <span className="text-sm font-semibold text-slate-400">/ {metrics.totalStudents} Siswa</span>
            </div>
            <div className="flex items-center gap-2 mt-2">
              <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 text-[11px] font-bold rounded-md">
                {metrics.paidCount} Lunas
              </span>
              <span className="px-2 py-0.5 bg-amber-100 text-amber-800 text-[11px] font-bold rounded-md">
                {metrics.unpaidCount} Belum
              </span>
            </div>
          </div>
        </div>

        {/* Card 3: Total Pengeluaran Kegiatan */}
        <div className="bg-white rounded-3xl border border-slate-200 p-5 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Realisasi Pengeluaran</span>
            <div className="w-8 h-8 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center">
              <ArrowUpRight className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2">
            <div className="text-2xl font-black text-rose-900">
              Rp {metrics.totalExpense.toLocaleString('id-ID')}
            </div>
            <p className="text-xs text-slate-500 mt-2 font-medium">
              {activeExpenses.length} transaksi belanja kegiatan
            </p>
          </div>
        </div>

        {/* Card 4: Sisa Saldo Kas Kegiatan */}
        <div className="bg-white rounded-3xl border border-slate-200 p-5 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Sisa Saldo Kas</span>
            <div className="w-8 h-8 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2">
            <div className={`text-2xl font-black ${metrics.balance >= 0 ? 'text-teal-800' : 'text-rose-600'}`}>
              Rp {metrics.balance.toLocaleString('id-ID')}
            </div>
            <div className="flex items-center gap-1.5 mt-2">
              <span
                className={`px-2 py-0.5 rounded-md text-[11px] font-bold ${
                  metrics.balance > 0
                    ? 'bg-teal-100 text-teal-800'
                    : metrics.balance === 0
                    ? 'bg-slate-100 text-slate-600'
                    : 'bg-rose-100 text-rose-700'
                }`}
              >
                {metrics.balance > 0 ? '● Surplus Kas' : metrics.balance === 0 ? '● Seimbang' : '● Defisit'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* SUB-TABS: "SETORAN SISWA", "PENGELUARAN KEGIATAN", & "REKAP" */}
      <div className="bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-xs">
        <div className="flex border-b border-slate-200 bg-slate-50/70 px-4 pt-2">
          <button
            onClick={() => setActiveTab('setoran')}
            className={`flex items-center gap-2 px-5 py-3 border-b-2 font-black text-xs transition-all cursor-pointer ${
              activeTab === 'setoran'
                ? 'border-teal-700 text-teal-800 bg-white rounded-t-2xl shadow-xs'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Users className="w-4 h-4" />
            Buku Setoran Siswa ({myStudents.length})
          </button>

          <button
            onClick={() => setActiveTab('pengeluaran')}
            className={`flex items-center gap-2 px-5 py-3 border-b-2 font-black text-xs transition-all cursor-pointer ${
              activeTab === 'pengeluaran'
                ? 'border-teal-700 text-teal-800 bg-white rounded-t-2xl shadow-xs'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <ArrowUpRight className="w-4 h-4 text-rose-500" />
            Buku Pengeluaran Kegiatan ({activeExpenses.length})
          </button>

          <button
            onClick={() => setActiveTab('rekap')}
            className={`flex items-center gap-2 px-5 py-3 border-b-2 font-black text-xs transition-all cursor-pointer ${
              activeTab === 'rekap'
                ? 'border-teal-700 text-teal-800 bg-white rounded-t-2xl shadow-xs'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Receipt className="w-4 h-4 text-teal-600" />
            Rekap & Rincian Kas
          </button>
        </div>

        {/* TAB 1: BUKU SETORAN SISWA */}
        {activeTab === 'setoran' && (
          <div className="p-5 space-y-4">
            {/* TOOLBAR EFISIENSI TINGGI (AKSI CEPAT 1-KLIK & MASSAL) */}
            <div className="bg-gradient-to-r from-teal-50/80 via-emerald-50/60 to-slate-50 p-4 rounded-2xl border border-teal-200/80 space-y-3">
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-teal-700 text-white flex items-center justify-center font-bold shadow-xs">
                    <Zap className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-xs font-black text-teal-950 uppercase tracking-wider">
                      Toolbar Aksi Cepat (Hemat Waktu)
                    </h4>
                    <p className="text-[11px] text-teal-800">
                      Tandai lunas banyak siswa sekaligus tanpa mengetik tanggal dan nominal berulang kali
                    </p>
                  </div>
                </div>

                {/* Tombol "Tandai Lunas Semua yang Belum" */}
                <button
                  onClick={handleMarkAllUnpaidAsPaid}
                  className="flex items-center justify-center gap-2 px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white font-extrabold text-xs rounded-xl shadow-sm transition-all cursor-pointer"
                >
                  <Sparkles className="w-4 h-4 text-amber-300" />
                  Tandai Lunas Semua Siswa yang Belum ({metrics.unpaidCount})
                </button>
              </div>

              {/* Setelan Massal untuk Siswa yang Dicentang */}
              <div className="pt-2 border-t border-teal-200/60 flex flex-wrap items-center justify-between gap-3">
                <div className="flex flex-wrap items-center gap-3">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-slate-700">
                    <Calendar className="w-3.5 h-3.5 text-teal-700" />
                    <span>Tgl Setor:</span>
                    <input
                      type="date"
                      value={batchDate}
                      onChange={(e) => setBatchDate(e.target.value)}
                      className="px-2.5 py-1 bg-white border border-slate-300 rounded-lg font-bold text-xs text-slate-800 focus:outline-teal-600"
                    />
                  </div>

                  <div className="flex items-center gap-1.5 text-xs font-bold text-slate-700">
                    <DollarSign className="w-3.5 h-3.5 text-teal-700" />
                    <span>Nominal:</span>
                    <input
                      type="number"
                      step={1000}
                      value={batchNominal}
                      onChange={(e) => setBatchNominal(parseInt(e.target.value, 10) || 0)}
                      className="w-28 px-2.5 py-1 bg-white border border-slate-300 rounded-lg font-black text-xs text-teal-900 text-right focus:outline-teal-600"
                    />
                  </div>

                  <button
                    onClick={handleApplyBatchDeposit}
                    disabled={selectedStudentIds.length === 0}
                    className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl font-black text-xs transition-all ${
                      selectedStudentIds.length > 0
                        ? 'bg-teal-800 hover:bg-teal-900 text-white shadow-xs cursor-pointer'
                        : 'bg-slate-200 text-slate-400 cursor-not-allowed'
                    }`}
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    Setor ke {selectedStudentIds.length} Siswa Terpilih
                  </button>
                </div>

                <div className="text-[11px] font-bold text-slate-500">
                  {selectedStudentIds.length > 0
                    ? `✓ ${selectedStudentIds.length} siswa sedang dipilih`
                    : 'Centang kotak pada baris siswa untuk setor massal'}
                </div>
              </div>
            </div>

            {/* BAR PENCARIAN & FILTER STATUS */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-1">
              <div className="relative w-full sm:w-72">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Cari nama atau NISN siswa..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:outline-teal-600 focus:bg-white"
                />
              </div>

              <div className="flex items-center gap-1.5 self-end sm:self-center">
                <span className="text-[11px] font-bold text-slate-500">Filter:</span>
                <button
                  onClick={() => setStatusFilter('all')}
                  className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    statusFilter === 'all'
                      ? 'bg-slate-800 text-white'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  Semua ({myStudents.length})
                </button>
                <button
                  onClick={() => setStatusFilter('paid')}
                  className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    statusFilter === 'paid'
                      ? 'bg-emerald-700 text-white'
                      : 'bg-emerald-50 text-emerald-800 hover:bg-emerald-100'
                  }`}
                >
                  Lunas ({metrics.paidCount})
                </button>
                <button
                  onClick={() => setStatusFilter('unpaid')}
                  className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    statusFilter === 'unpaid'
                      ? 'bg-amber-600 text-white'
                      : 'bg-amber-50 text-amber-800 hover:bg-amber-100'
                  }`}
                >
                  Belum ({metrics.unpaidCount})
                </button>
              </div>
            </div>

            {/* TABEL SETORAN SISWA */}
            <div className="border border-slate-200 rounded-2xl overflow-x-auto shadow-2xs">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-100/80 text-slate-700 font-extrabold border-b border-slate-200">
                    <th className="p-3 w-10 text-center">
                      <button
                        onClick={handleToggleSelectAll}
                        className="cursor-pointer text-slate-600 hover:text-teal-700 flex items-center justify-center"
                        title={selectedStudentIds.length === filteredStudents.length ? 'Batalkan Semua' : 'Pilih Semua'}
                      >
                        {selectedStudentIds.length > 0 && selectedStudentIds.length === filteredStudents.length ? (
                          <CheckSquare className="w-4 h-4 text-teal-700" />
                        ) : (
                          <Square className="w-4 h-4 text-slate-400" />
                        )}
                      </button>
                    </th>
                    <th className="p-3 w-10 text-center">No.</th>
                    <th className="p-3 w-28">NISN</th>
                    <th className="p-3">Nama Siswa</th>
                    <th className="p-3 text-center w-36">Tanggal Setor</th>
                    <th className="p-3 text-right w-36">Nominal (Rp)</th>
                    <th className="p-3 text-center w-28">Status</th>
                    <th className="p-3 text-center w-48">Aksi Cepat</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium">
                  {filteredStudents.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="p-8 text-center text-slate-400">
                        Tidak ada siswa yang sesuai kriteria pencarian.
                      </td>
                    </tr>
                  ) : (
                    filteredStudents.map((st, idx) => {
                      const rec = getStudentRecord(st.id);
                      const isPaid = rec && rec.amount > 0;
                      const currentDate = rec?.date || '';
                      const currentAmt = rec?.amount || 0;
                      const isSelected = selectedStudentIds.includes(st.id);

                      return (
                        <tr
                          key={st.id}
                          className={`hover:bg-teal-50/40 transition-colors ${
                            isSelected ? 'bg-teal-50/70 font-semibold' : ''
                          }`}
                        >
                          <td className="p-3 text-center">
                            <button
                              onClick={() => handleToggleSelectStudent(st.id)}
                              className="cursor-pointer flex items-center justify-center"
                            >
                              {isSelected ? (
                                <CheckSquare className="w-4 h-4 text-teal-700" />
                              ) : (
                                <Square className="w-4 h-4 text-slate-300 hover:text-slate-500" />
                              )}
                            </button>
                          </td>
                          <td className="p-3 text-center text-slate-400 text-[11px] font-bold">{idx + 1}</td>
                          <td className="p-3 font-mono text-slate-500 text-[11px]">{st.nisn}</td>
                          <td className="p-3 font-bold text-slate-800">
                            {st.name}
                            {st.parentWa && (
                              <span className="block text-[10px] text-slate-400 font-normal">
                                WA: {st.parentWa}
                              </span>
                            )}
                          </td>
                          <td className="p-3 text-center">
                            <input
                              type="date"
                              value={currentDate}
                              onChange={(e) =>
                                handleSaveStudentDeposit(
                                  st.id,
                                  currentAmt || (activeCategory.targetNominal || 10000),
                                  e.target.value
                                )
                              }
                              className="w-32 px-2 py-1 border border-slate-200 rounded-lg text-center font-semibold text-slate-800 bg-white focus:outline-teal-600"
                            />
                          </td>
                          <td className="p-3 text-right">
                            <input
                              type="number"
                              step={1000}
                              value={currentAmt || ''}
                              placeholder={activeCategory.targetNominal ? activeCategory.targetNominal.toString() : '0'}
                              onChange={(e) =>
                                handleSaveStudentDeposit(
                                  st.id,
                                  parseInt(e.target.value, 10) || 0,
                                  currentDate || new Date().toISOString().split('T')[0]
                                )
                              }
                              className="w-32 px-2.5 py-1 border border-slate-200 rounded-lg text-right font-black text-teal-900 bg-white focus:outline-teal-600"
                            />
                          </td>
                          <td className="p-3 text-center">
                            {isPaid ? (
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-emerald-100 text-emerald-800 rounded-full font-bold text-[11px]">
                                <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                                Lunas
                              </span>
                            ) : (
                              <span className="inline-flex items-center px-2.5 py-1 bg-slate-100 text-slate-500 rounded-full font-bold text-[11px]">
                                Belum
                              </span>
                            )}
                          </td>
                          <td className="p-3 text-center">
                            <div className="flex items-center justify-center gap-1">
                              {!isPaid ? (
                                <button
                                  onClick={() => handleQuickPayStudent(st.id)}
                                  className="flex items-center gap-1 px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-bold text-[11px] shadow-2xs transition-colors cursor-pointer"
                                  title="1-Klik Lunas Pas"
                                >
                                  <Zap className="w-3 h-3" />
                                  Lunas Pas
                                </button>
                              ) : (
                                <>
                                  <button
                                    onClick={() => handleOpenWhatsApp(st)}
                                    className="p-1.5 text-emerald-700 hover:bg-emerald-100 rounded-lg transition-colors cursor-pointer"
                                    title="Kirim Tanda Terima WhatsApp"
                                  >
                                    <MessageCircle className="w-4 h-4" />
                                  </button>
                                  <button
                                    onClick={() => handleOpenReceipt(st)}
                                    className="p-1.5 text-teal-700 hover:bg-teal-100 rounded-lg transition-colors cursor-pointer"
                                    title="Cetak Kwitansi Mini"
                                  >
                                    <Receipt className="w-4 h-4" />
                                  </button>
                                  <button
                                    onClick={() => handleSaveStudentDeposit(st.id, 0, '')}
                                    className="p-1.5 text-rose-500 hover:bg-rose-100 rounded-lg transition-colors cursor-pointer"
                                    title="Reset / Batalkan Pembayaran"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </button>
                                </>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 2: BUKU PENGELUARAN KEGIATAN */}
        {activeTab === 'pengeluaran' && (
          <div className="p-5 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
              <div>
                <h3 className="font-extrabold text-sm text-slate-800 flex items-center gap-2">
                  <ArrowUpRight className="w-4 h-4 text-rose-600" />
                  Rincian Pengeluaran Dana ({activeCategory.name})
                </h3>
                <p className="text-xs text-slate-500">
                  Catat setiap pembelanjaan / pengeluaran terkait kegiatan untuk menghasilkan sisa kas yang akurat.
                </p>
              </div>

              <button
                onClick={() => setShowExpenseModal(true)}
                className="flex items-center gap-1.5 px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs rounded-xl shadow-xs transition-colors cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                Tambah Pengeluaran
              </button>
            </div>

            {/* Tabel Pengeluaran */}
            <div className="border border-slate-200 rounded-2xl overflow-x-auto shadow-2xs">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-100/80 text-slate-700 font-extrabold border-b border-slate-200">
                    <th className="p-3 w-12 text-center">No.</th>
                    <th className="p-3 w-32 text-center">Tanggal</th>
                    <th className="p-3">Keterangan Pengeluaran</th>
                    <th className="p-3">Catatan / Bukti Nota</th>
                    <th className="p-3 text-right w-40">Nominal (Rp)</th>
                    <th className="p-3 text-center w-20">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {activeExpenses.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="p-8 text-center text-slate-400">
                        Belum ada data pengeluaran yang dicatat untuk kegiatan ini.
                      </td>
                    </tr>
                  ) : (
                    activeExpenses.map((exp, idx) => (
                      <tr key={exp.id} className="hover:bg-slate-50 transition-colors">
                        <td className="p-3 text-center text-slate-400 font-bold">{idx + 1}</td>
                        <td className="p-3 text-center font-semibold text-slate-700">
                          {exp.date ? exp.date.split('-').reverse().join('/') : '-'}
                        </td>
                        <td className="p-3 font-bold text-slate-800">{exp.title}</td>
                        <td className="p-3 text-slate-500 italic">{exp.note || '-'}</td>
                        <td className="p-3 text-right font-black text-rose-700">
                          Rp {exp.amount.toLocaleString('id-ID')}
                        </td>
                        <td className="p-3 text-center">
                          <button
                            onClick={() => handleDeleteExpense(exp.id)}
                            className="p-1.5 text-rose-500 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                            title="Hapus Pengeluaran"
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
                    <td colSpan={4} className="p-3 text-right uppercase tracking-wider text-[11px]">
                      Total Pengeluaran Realisasi:
                    </td>
                    <td className="p-3 text-right text-rose-700 text-sm">
                      Rp {metrics.totalExpense.toLocaleString('id-ID')}
                    </td>
                    <td></td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        )}

        {/* TAB 3: REKAPITULASI & LAPORAN ARUS KAS LENGKAP */}
        {activeTab === 'rekap' && (
          <div className="p-5 space-y-6">
            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5 space-y-4">
              <h3 className="font-extrabold text-sm text-slate-800 uppercase tracking-wider">
                Neraca Rekapitulasi Kas Kegiatan ({activeCategory.name})
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="p-4 bg-emerald-100/60 rounded-xl border border-emerald-200">
                  <span className="text-[11px] font-bold text-emerald-900 uppercase">1. Total Pemasukan Siswa</span>
                  <div className="text-xl font-black text-emerald-950 mt-1">
                    Rp {metrics.totalCollected.toLocaleString('id-ID')}
                  </div>
                  <span className="text-xs text-emerald-800 font-semibold">
                    {metrics.paidCount} siswa telah menyetor
                  </span>
                </div>

                <div className="p-4 bg-rose-100/60 rounded-xl border border-rose-200">
                  <span className="text-[11px] font-bold text-rose-900 uppercase">2. Total Pengeluaran Kegiatan</span>
                  <div className="text-xl font-black text-rose-950 mt-1">
                    Rp {metrics.totalExpense.toLocaleString('id-ID')}
                  </div>
                  <span className="text-xs text-rose-800 font-semibold">
                    {activeExpenses.length} rincian pengeluaran
                  </span>
                </div>

                <div className="p-4 bg-teal-100/60 rounded-xl border border-teal-200">
                  <span className="text-[11px] font-bold text-teal-900 uppercase">3. Sisa Saldo Akhir</span>
                  <div className="text-xl font-black text-teal-950 mt-1">
                    Rp {metrics.balance.toLocaleString('id-ID')}
                  </div>
                  <span className="text-xs text-teal-800 font-semibold">
                    {metrics.balance >= 0 ? 'Kas Surplus / Siap Disimpan' : 'Defisit (Perlu Penyesuaian)'}
                  </span>
                </div>
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  onClick={handleExportPdf}
                  className="flex items-center gap-1.5 px-4 py-2 bg-teal-800 hover:bg-teal-900 text-white font-bold text-xs rounded-xl shadow-xs transition-colors cursor-pointer"
                >
                  <FileText className="w-4 h-4 text-emerald-300" />
                  Unduh Laporan Lengkap (PDF)
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* MODAL: TAMBAH / EDIT KATEGORI PROGRAM */}
      {showCategoryModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl border border-slate-200 max-w-lg w-full p-6 shadow-2xl animate-in zoom-in-95">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <h3 className="font-extrabold text-base text-slate-800">
                {editingCategoryId ? 'Edit Program Iuran / Sumbangan' : 'Buat Program Iuran / Sumbangan Baru'}
              </h3>
              <button
                onClick={() => setShowCategoryModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:bg-slate-100 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveCategory} className="mt-4 space-y-4 text-xs">
              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  Nama Program / Kegiatan <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={catName}
                  onChange={(e) => setCatName(e.target.value)}
                  placeholder="Contoh: Iuran Kas Kelas 1A, Sumbangan PHBI Maulid Nabi"
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl font-bold text-slate-800 focus:outline-teal-600"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">Jenis Program</label>
                  <select
                    value={catType}
                    onChange={(e) => setCatType(e.target.value as any)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl font-bold text-slate-800 bg-white focus:outline-teal-600"
                  >
                    <option value="Iuran">Iuran (Kegiatan/Kas)</option>
                    <option value="Sumbangan">Sumbangan (Sukarela/Sosial)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">Ketetapan Nominal</label>
                  <select
                    value={catNature}
                    onChange={(e) => setCatNature(e.target.value as any)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl font-bold text-slate-800 bg-white focus:outline-teal-600"
                  >
                    <option value="Ditentukan">Ditentukan (Tarif Pasti)</option>
                    <option value="Seikhlasnya">Seikhlasnya (Bebas)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  Target / Default Nominal per Siswa (Rp)
                </label>
                <input
                  type="number"
                  step={1000}
                  value={catNominal}
                  onChange={(e) => setCatNominal(parseInt(e.target.value, 10) || 0)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl font-black text-teal-900 focus:outline-teal-600"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">Keterangan / Tujuan Dana</label>
                <textarea
                  rows={2}
                  value={catDesc}
                  onChange={(e) => setCatDesc(e.target.value)}
                  placeholder="Catatan tambahan keperluan dana kegiatan..."
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-slate-700 focus:outline-teal-600"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowCategoryModal(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-teal-800 hover:bg-teal-900 text-white font-bold rounded-xl shadow-xs cursor-pointer"
                >
                  {editingCategoryId ? 'Simpan Perubahan' : 'Buat Program'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: TAMBAH PENGELUARAN KEGIATAN */}
      {showExpenseModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl border border-slate-200 max-w-md w-full p-6 shadow-2xl animate-in zoom-in-95">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <h3 className="font-extrabold text-base text-slate-800 flex items-center gap-2">
                <ArrowUpRight className="w-5 h-5 text-rose-600" />
                Catat Pengeluaran Baru
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
                  Keterangan Belanja / Pengeluaran <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={expTitle}
                  onChange={(e) => setExpTitle(e.target.value)}
                  placeholder="Misal: Konsumsi Snack Siswa, Banner Acara, dll."
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl font-bold text-slate-800 focus:outline-teal-600"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">Tanggal</label>
                  <input
                    type="date"
                    value={expDate}
                    onChange={(e) => setExpDate(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl font-semibold text-slate-800 focus:outline-teal-600"
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
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl font-black text-rose-700 focus:outline-teal-600"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">Catatan / No. Bukti Nota</label>
                <input
                  type="text"
                  value={expNote}
                  onChange={(e) => setExpNote(e.target.value)}
                  placeholder="Misal: Nota No. 04 Toko Berkah"
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-slate-700 focus:outline-teal-600"
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
                  Simpan Pengeluaran
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: CETAK KWITANSI MINI RESMI */}
      {receiptStudent && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl border border-slate-200 max-w-lg w-full p-6 shadow-2xl animate-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <span className="font-extrabold text-xs text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                <Receipt className="w-4 h-4 text-teal-700" />
                Pratinjau Kwitansi / Tanda Terima Mini
              </span>
              <button
                onClick={() => setReceiptStudent(null)}
                className="p-1 rounded-lg text-slate-400 hover:bg-slate-100 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Template Kwitansi Fisik */}
            <div className="mt-4 p-5 bg-gradient-to-br from-amber-50/40 via-white to-teal-50/30 border-2 border-dashed border-teal-700/40 rounded-2xl space-y-3 font-sans text-xs">
              <div className="text-center border-b border-slate-200 pb-2">
                <h4 className="font-black text-slate-800 text-sm tracking-wide">
                  {schoolProfile.namaMadrasah.toUpperCase()}
                </h4>
                <p className="text-[10px] text-slate-500">
                  {schoolProfile.alamatMadrasah}
                </p>
                <div className="mt-1 inline-block px-3 py-0.5 bg-teal-800 text-white font-black text-[10px] rounded-full uppercase tracking-wider">
                  Tanda Terima Setoran
                </div>
              </div>

              <div className="space-y-1.5 text-slate-700">
                <div className="flex">
                  <span className="w-28 font-semibold text-slate-500">Telah diterima dari</span>
                  <span className="font-black text-slate-900">: {receiptStudent.student.name}</span>
                </div>
                <div className="flex">
                  <span className="w-28 font-semibold text-slate-500">NISN / Kelas</span>
                  <span className="font-semibold text-slate-700">
                    : {receiptStudent.student.nisn} ({currentClass})
                  </span>
                </div>
                <div className="flex">
                  <span className="w-28 font-semibold text-slate-500">Untuk Pembayaran</span>
                  <span className="font-bold text-teal-900">: {activeCategory.name}</span>
                </div>
                <div className="flex">
                  <span className="w-28 font-semibold text-slate-500">Terbilang</span>
                  <span className="font-bold italic text-slate-800">
                    : # {terbilang(receiptStudent.payment.amount)} #
                  </span>
                </div>
              </div>

              <div className="pt-2 flex items-end justify-between border-t border-slate-200">
                <div className="p-2.5 bg-emerald-50 border border-emerald-200 rounded-xl">
                  <span className="text-[10px] text-emerald-800 font-bold block">JUMLAH SETORAN:</span>
                  <span className="text-base font-black text-emerald-950">
                    Rp {receiptStudent.payment.amount.toLocaleString('id-ID')}
                  </span>
                </div>

                <div className="text-center text-[10px]">
                  <p className="text-slate-500">
                    Purbalingga,{' '}
                    {receiptStudent.payment.date
                      ? receiptStudent.payment.date.split('-').reverse().join('/')
                      : new Date().toLocaleDateString('id-ID')}
                  </p>
                  <p className="font-bold text-slate-700 mt-0.5">Wali Kelas,</p>
                  <div className="h-8"></div>
                  <p className="font-black text-slate-900 underline">{currentUser?.name}</p>
                  <p className="text-slate-500">NIP. {currentUser?.nip || '-'}</p>
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-4">
              <button
                onClick={() => setReceiptStudent(null)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl cursor-pointer text-xs"
              >
                Tutup
              </button>
              <button
                onClick={() => {
                  window.print();
                }}
                className="flex items-center gap-1.5 px-4 py-2 bg-teal-800 hover:bg-teal-900 text-white font-bold rounded-xl shadow-xs cursor-pointer text-xs"
              >
                <Printer className="w-4 h-4" />
                Cetak Bukti Fisik
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: NOTIFIKASI TANDA TERIMA WHATSAPP */}
      {waModalStudent && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl border border-slate-200 max-w-lg w-full p-6 shadow-2xl animate-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <span className="font-extrabold text-xs text-emerald-800 uppercase tracking-wider flex items-center gap-1.5">
                <MessageCircle className="w-4 h-4 text-emerald-600" />
                Kirim Tanda Terima WhatsApp
              </span>
              <button
                onClick={() => setWaModalStudent(null)}
                className="p-1 rounded-lg text-slate-400 hover:bg-slate-100 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="mt-4 space-y-3 text-xs">
              <div className="flex items-center justify-between">
                <span className="font-bold text-slate-700">Tujuan Wali Murid:</span>
                <span className="font-black text-slate-900">{waModalStudent.student.name}</span>
              </div>

              {waModalStudent.student.parentWa ? (
                <div className="p-2.5 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center justify-between">
                  <span className="text-emerald-800 font-bold text-[11px]">
                    Nomor WhatsApp Terdaftar: {waModalStudent.student.parentWa}
                  </span>
                  <span className="text-[10px] bg-emerald-200 text-emerald-900 font-extrabold px-2 py-0.5 rounded-full">
                    Tersedia
                  </span>
                </div>
              ) : (
                <div className="p-2.5 bg-amber-50 border border-amber-200 rounded-xl text-amber-800 text-[11px] font-medium">
                  Nomor WhatsApp belum terdaftar di profil siswa. Anda dapat menyalin teks di bawah ini dan mengirimkannya secara manual.
                </div>
              )}

              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">
                  Isi Pesan Tanda Terima:
                </label>
                <textarea
                  rows={8}
                  readOnly
                  value={waModalStudent.messageText}
                  className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl font-mono text-[11px] text-slate-800 focus:outline-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard.writeText(waModalStudent.messageText);
                    showToast('Teks tanda terima berhasil disalin ke clipboard!');
                  }}
                  className="flex items-center gap-1.5 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold rounded-xl cursor-pointer"
                >
                  <Copy className="w-4 h-4 text-slate-600" />
                  Salin Teks
                </button>

                {waModalStudent.student.parentWa && (
                  <a
                    href={`https://wa.me/${waModalStudent.student.parentWa.replace(/[^0-9]/g, '')}?text=${encodeURIComponent(
                      waModalStudent.messageText
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
    </div>
  );
};
