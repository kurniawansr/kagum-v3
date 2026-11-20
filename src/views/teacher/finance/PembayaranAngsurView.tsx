import React, { useState, useMemo } from 'react';
import { useApp } from '../../../context/AppContext';
import { PaymentCategory, PaymentInstallment, Student } from '../../../types';
import {
  CreditCard,
  Plus,
  Trash2,
  Edit2,
  Printer,
  FileSpreadsheet,
  FileText,
  CheckCircle2,
  Zap,
  Search,
  Users,
  DollarSign,
  ArrowDownRight,
  Receipt,
  MessageCircle,
  Copy,
  ExternalLink,
  History,
  X,
  AlertCircle,
  Clock,
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

export const PembayaranAngsurView: React.FC = () => {
  const {
    students,
    paymentCategories = [],
    setPaymentCategories,
    paymentInstallments: studentInstallments = [],
    setPaymentInstallments: setStudentInstallments,
    currentUser,
    schoolProfile,
    logActivity,
  } = useApp();

  const currentClass = currentUser?.kelas || 'Kelas IA';
  const myStudents = useMemo(() => {
    return (students || []).filter((s) => s.kelas === currentClass);
  }, [students, currentClass]);

  // Pos Angsuran Aktif
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>(() => {
    return paymentCategories[0]?.id || 'paycat-1';
  });

  const [printDate, setPrintDate] = useState(new Date().toISOString().split('T')[0]);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'lunas' | 'mengangsur' | 'belum'>('all');
  const [toastMessage, setToastMessage] = useState('');

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(''), 3500);
  };

  // Pos Angsuran yang dipilih (null jika belum ada pos tagihan)
  const activeCategory: PaymentCategory | null = useMemo(() => {
    if (paymentCategories.length > 0) {
      const found = paymentCategories.find((c) => c.id === selectedCategoryId);
      if (found) return found;
      return paymentCategories[0];
    }
    return null;
  }, [paymentCategories, selectedCategoryId]);

  const targetAmt = activeCategory ? (activeCategory.totalAmount ?? activeCategory.nominal ?? 0) : 0;

  // Form Pos Pembayaran Baru Modal
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [editingCatId, setEditingCatId] = useState<string | null>(null);
  const [catName, setCatName] = useState('');
  const [catNominal, setCatNominal] = useState<number>(200000);
  const [catDesc, setCatDesc] = useState('');

  // Modal Kasir / Histori Angsuran Siswa
  const [historyStudent, setHistoryStudent] = useState<Student | null>(null);
  const [newDepositAmount, setNewDepositAmount] = useState<number>(50000);
  const [newDepositDate, setNewDepositDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [newDepositNote, setNewDepositNote] = useState<string>('Tunai');

  // Modal Kwitansi Mini
  const [receiptData, setReceiptData] = useState<{
    student: Student;
    installment?: PaymentInstallment;
    totalPaid: number;
    remaining: number;
  } | null>(null);

  // Modal WhatsApp
  const [waData, setWaData] = useState<{
    student: Student;
    messageText: string;
  } | null>(null);

  // Helper mendapatkan seluruh setoran anak untuk pos aktif
  const getStudentInstallments = (studentId: string): PaymentInstallment[] => {
    if (!activeCategory) return [];
    return studentInstallments.filter(
      (i) => i.studentId === studentId && i.categoryId === activeCategory.id
    );
  };

  // Perhitungan Metrik & Piutang Kelas
  const metrics = useMemo(() => {
    const totalStudents = myStudents.length;

    // Jika belum ada pos tagihan, seluruh metrik adalah Rp 0
    if (!activeCategory || targetAmt === 0) {
      return {
        totalStudents,
        totalTargetClass: 0,
        totalCollected: 0,
        totalRemaining: 0,
        percentage: 0,
        lunasCount: 0,
        mengangsurCount: 0,
        belumBayarCount: 0,
      };
    }

    const totalTargetClass = totalStudents * targetAmt;

    let totalCollected = 0;
    let lunasCount = 0;
    let mengangsurCount = 0;
    let belumBayarCount = 0;

    myStudents.forEach((st) => {
      const stIns = getStudentInstallments(st.id);
      const paid = stIns.reduce((sum, item) => sum + item.amount, 0);
      totalCollected += paid;

      if (paid >= targetAmt && targetAmt > 0) {
        lunasCount++;
      } else if (paid > 0) {
        mengangsurCount++;
      } else {
        belumBayarCount++;
      }
    });

    const totalRemaining = Math.max(0, totalTargetClass - totalCollected);
    const percentage = totalTargetClass > 0 ? Math.min(100, Math.round((totalCollected / totalTargetClass) * 100)) : 0;

    return {
      totalStudents,
      totalTargetClass,
      totalCollected,
      totalRemaining,
      percentage,
      lunasCount,
      mengangsurCount,
      belumBayarCount,
    };
  }, [myStudents, targetAmt, studentInstallments, activeCategory]);

  // Siswa difilter
  const filteredStudents = useMemo(() => {
    if (!activeCategory) return [];
    return myStudents.filter((st) => {
      const matchSearch = st.name.toLowerCase().includes(searchQuery.toLowerCase()) || st.nisn.includes(searchQuery);
      if (!matchSearch) return false;

      const stIns = getStudentInstallments(st.id);
      const paid = stIns.reduce((sum, item) => sum + item.amount, 0);

      if (statusFilter === 'lunas') return paid >= targetAmt && targetAmt > 0;
      if (statusFilter === 'mengangsur') return paid > 0 && paid < targetAmt;
      if (statusFilter === 'belum') return paid === 0;
      return true;
    });
  }, [myStudents, searchQuery, statusFilter, targetAmt, studentInstallments, activeCategory]);

  // CRUD Pos Pembayaran
  const handleOpenAddCategory = () => {
    setEditingCatId(null);
    setCatName('');
    setCatNominal(200000);
    setCatDesc('');
    setShowCategoryModal(true);
  };

  const handleOpenEditCategory = (cat: PaymentCategory) => {
    setEditingCatId(cat.id);
    setCatName(cat.name);
    setCatNominal(cat.totalAmount ?? cat.nominal ?? 200000);
    setCatDesc(cat.description || '');
    setShowCategoryModal(true);
  };

  const handleSaveCategory = (e: React.FormEvent) => {
    e.preventDefault();
    if (!catName.trim()) return;

    if (editingCatId) {
      setPaymentCategories((prev) =>
        prev.map((c) =>
          c.id === editingCatId
            ? { ...c, name: catName, totalAmount: catNominal, nominal: catNominal, description: catDesc }
            : c
        )
      );
      showToast(`Pos pembayaran "${catName}" berhasil diperbarui!`);
    } else {
      const newCat: PaymentCategory = {
        id: `paycat-${Date.now()}`,
        name: catName,
        totalAmount: catNominal,
        nominal: catNominal,
        description: catDesc,
        kelas: currentClass,
      };
      setPaymentCategories([...paymentCategories, newCat]);
      setSelectedCategoryId(newCat.id);
      showToast(`Pos pembayaran baru "${catName}" berhasil dibuat!`);
      logActivity?.('Tambah Angsuran', `Buat pos tagihan baru: ${catName}`, 'Keuangan', 'Sukses');
    }

    setShowCategoryModal(false);
  };

  const handleDeleteCategory = (catId: string) => {
    const toDelete = paymentCategories.find((c) => c.id === catId);
    if (!toDelete) return;

    if (confirm(`Yakin ingin menghapus pos "${toDelete.name}" beserta seluruh catatan angsurannya?`)) {
      setPaymentCategories(paymentCategories.filter((c) => c.id !== catId));
      setStudentInstallments(studentInstallments.filter((i) => i.categoryId !== catId));

      const remaining = paymentCategories.filter((c) => c.id !== catId);
      if (remaining.length > 0) setSelectedCategoryId(remaining[0].id);
      showToast(`Pos "${toDelete.name}" telah dihapus.`);
    }
  };

  // 1-Klik Lunas Langsung
  const handleDirectFullPay = (student: Student) => {
    if (!activeCategory) return;
    const stIns = getStudentInstallments(student.id);
    const currentPaid = stIns.reduce((sum, item) => sum + item.amount, 0);
    const deficit = Math.max(0, targetAmt - currentPaid);

    if (deficit <= 0) {
      showToast('Siswa ini sudah lunas 100%!');
      return;
    }

    const today = new Date().toISOString().split('T')[0];
    const newIns: PaymentInstallment = {
      id: `ins-${student.id}-${Date.now()}`,
      studentId: student.id,
      categoryId: activeCategory.id,
      amount: deficit,
      date: today,
      note: 'Pelunasan Penuh Langsung',
    };

    setStudentInstallments([...studentInstallments, newIns]);
    showToast(`Alhamdulillah! Pembayaran an. ${student.name} sebesar Rp ${deficit.toLocaleString('id-ID')} berhasil dicatat LUNAS!`);
    logActivity?.('Pelunasan Angsuran', `Pelunasan langsung ${student.name} untuk ${activeCategory.name}`, 'Keuangan', 'Sukses');
  };

  // Tambah Setoran Baru dari Modal Histori
  const handleAddSingleInstallment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!historyStudent || newDepositAmount <= 0 || !activeCategory) return;

    const newIns: PaymentInstallment = {
      id: `ins-${historyStudent.id}-${Date.now()}`,
      studentId: historyStudent.id,
      categoryId: activeCategory.id,
      amount: newDepositAmount,
      date: newDepositDate || new Date().toISOString().split('T')[0],
      note: newDepositNote || 'Tunai',
    };

    setStudentInstallments([...studentInstallments, newIns]);
    showToast(`Setoran Rp ${newDepositAmount.toLocaleString('id-ID')} an. ${historyStudent.name} berhasil disimpan!`);
    setNewDepositAmount(50000);
    setNewDepositNote('Tunai');
  };

  // Hapus Satu Setoran Spesifik
  const handleDeleteSingleInstallment = (installmentId: string) => {
    if (confirm('Hapus transaksi setoran ini?')) {
      setStudentInstallments(studentInstallments.filter((i) => i.id !== installmentId));
      showToast('Setoran berhasil dihapus.');
    }
  };

  // Buka Modal Kwitansi
  const handleOpenReceipt = (student: Student, specificInstallment?: PaymentInstallment) => {
    const stIns = getStudentInstallments(student.id);
    const totalPaid = stIns.reduce((sum, item) => sum + item.amount, 0);
    const remaining = Math.max(0, targetAmt - totalPaid);

    setReceiptData({
      student,
      installment: specificInstallment || stIns[stIns.length - 1],
      totalPaid,
      remaining,
    });
  };

  // Buka Modal WhatsApp
  const handleOpenWhatsApp = (student: Student) => {
    if (!activeCategory) return;
    const stIns = getStudentInstallments(student.id);
    const totalPaid = stIns.reduce((sum, item) => sum + item.amount, 0);
    const remaining = Math.max(0, targetAmt - totalPaid);
    const isLunas = totalPaid >= targetAmt;

    const lastIns = stIns[stIns.length - 1];
    const lastDate = lastIns?.date ? lastIns.date.split('-').reverse().join('/') : '-';
    const lastNominal = lastIns ? `Rp ${lastIns.amount.toLocaleString('id-ID')}` : 'Rp 0';

    const textMsg =
      `*PEMBERITAHUAN ANGSURAN - ${schoolProfile.namaMadrasah.toUpperCase()}*\n\n` +
      `Assalamu'alaikum Wr. Wb.\n` +
      `Yth. Bapak/Ibu Wali Murid dari *${student.name}* (${currentClass}),\n\n` +
      `Berikut adalah rincian pembayaran untuk:\n` +
      `📌 *Pos Tagihan:* ${activeCategory.name}\n` +
      `🎯 *Total Tagihan:* Rp ${targetAmt.toLocaleString('id-ID')}\n` +
      `💰 *Total Telah Disetor:* Rp ${totalPaid.toLocaleString('id-ID')}\n` +
      `💳 *Setoran Terakhir:* ${lastNominal} (tgl ${lastDate})\n` +
      `⏳ *Sisa Tagihan:* Rp ${remaining.toLocaleString('id-ID')}\n` +
      `📝 *Status:* ${isLunas ? '✅ Lunas' : '⏳ Masih Mengangsur'}\n\n` +
      (isLunas
        ? `Alhamdulillah telah lunas. Terima kasih atas partisipasi dan kerja samanya.\n\n`
        : `Mohon untuk dapat menyelesaikan kekurangan sebelum batas waktu yang ditentukan. Terima kasih.\n\n`) +
      `Wassalamu'alaikum Wr. Wb.\n` +
      `*Wali Kelas:* ${currentUser?.name || 'Wali Kelas'}`;

    setWaData({ student, messageText: textMsg });
  };

  // Ekspor PDF Laporan Rekap Angsuran
  const handleExportPdf = () => {
    if (!activeCategory) {
      showToast('Belum ada pos tagihan aktif untuk dicetak.');
      return;
    }

    const titleLines = [
      `LAPORAN MONITORING ANGSURAN ${activeCategory.name.toUpperCase()}`,
      `KELAS: ${currentClass.toUpperCase()} | TAHUN AJARAN ${schoolProfile.tahunAjaran}`,
      `Total Target per Siswa: Rp ${targetAmt.toLocaleString('id-ID')}`,
    ];

    const headers = ['No', 'NISN', 'Nama Siswa', 'Target', 'Total Setor', 'Sisa Tagihan', 'Status'];
    const rows = myStudents.map((st, idx) => {
      const stIns = getStudentInstallments(st.id);
      const paid = stIns.reduce((sum, item) => sum + item.amount, 0);
      const remaining = Math.max(0, targetAmt - paid);
      let statusStr = 'Belum Bayar';
      if (paid >= targetAmt) statusStr = 'Lunas';
      else if (paid > 0) statusStr = 'Belum Lunas';

      return [
        idx + 1,
        st.nisn,
        st.name,
        `Rp ${targetAmt.toLocaleString('id-ID')}`,
        `Rp ${paid.toLocaleString('id-ID')}`,
        `Rp ${remaining.toLocaleString('id-ID')}`,
        statusStr,
      ];
    });

    // Baris Total
    rows.push([
      '',
      '',
      'TOTAL KELAS',
      `Rp ${metrics.totalTargetClass.toLocaleString('id-ID')}`,
      `Rp ${metrics.totalCollected.toLocaleString('id-ID')}`,
      `Rp ${metrics.totalRemaining.toLocaleString('id-ID')}`,
      `${metrics.lunasCount} Lunas / ${metrics.totalStudents} Siswa`,
    ]);

    exportToPdf({
      filename: `Angsuran_${activeCategory.name.replace(/\s+/g, '_')}_${currentClass.replace(/\s+/g, '_')}`,
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
        3: { halign: 'right' },
        4: { halign: 'right' },
        5: { halign: 'right' },
        6: { halign: 'center' },
      },
    });
  };

  // Ekspor Excel
  const handleExportExcel = () => {
    if (!activeCategory) {
      showToast('Belum ada pos tagihan aktif untuk diekspor.');
      return;
    }

    const headerLines = [
      `LAPORAN MONITORING ANGSURAN ${activeCategory.name}`,
      `KELAS: ${currentClass} | TAHUN AJARAN ${schoolProfile.tahunAjaran}`,
      `Target: Rp ${targetAmt.toLocaleString('id-ID')} | Masuk: Rp ${metrics.totalCollected.toLocaleString('id-ID')} | Sisa: Rp ${metrics.totalRemaining.toLocaleString('id-ID')}`,
    ];

    const headers = ['No', 'NISN', 'Nama Siswa', 'Total Tagihan', 'Total Setor', 'Sisa Kurang', 'Status'];
    const rows = myStudents.map((st, idx) => {
      const stIns = getStudentInstallments(st.id);
      const paid = stIns.reduce((sum, item) => sum + item.amount, 0);
      const remaining = Math.max(0, targetAmt - paid);
      const statusStr = paid >= targetAmt ? 'Lunas' : paid > 0 ? 'Mengangsur' : 'Belum';

      return [idx + 1, st.nisn, st.name, targetAmt, paid, remaining, statusStr];
    });

    exportToExcel(
      `Angsuran_${activeCategory.name.replace(/\s+/g, '_')}_${currentClass.replace(/\s+/g, '_')}`,
      'Angsuran',
      headerLines,
      headers,
      rows
    );
  };

  return (
    <div className="space-y-6">
      {/* Toast Alert */}
      {toastMessage && (
        <div className="fixed top-6 right-6 z-50 flex items-center gap-3 bg-indigo-950 text-white px-5 py-3 rounded-2xl shadow-xl border border-indigo-700 animate-in fade-in slide-in-from-top-4">
          <CheckCircle2 className="w-5 h-5 text-indigo-400 shrink-0" />
          <span className="text-xs font-semibold">{toastMessage}</span>
        </div>
      )}

      {/* Header Utama & Pilihan Pos Angsuran */}
      <div className="bg-white rounded-3xl border border-slate-200/80 p-6 shadow-xs">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-5 border-b border-slate-100">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-indigo-700 to-blue-600 text-white flex items-center justify-center font-bold shadow-md shadow-indigo-700/20">
              <CreditCard className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-black text-slate-800 tracking-tight">Pembayaran Angsuran Kelas</h2>
                <span className="px-2.5 py-0.5 bg-indigo-100 text-indigo-900 text-[11px] font-black rounded-full uppercase tracking-wider">
                  {currentClass}
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Monitoring pembayaran bertahap (seragam, buku LKS, wisuda) dengan riwayat kasir dan kwitansi resmi.
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
              onClick={handleOpenAddCategory}
              className="flex items-center gap-1.5 px-4 py-2 bg-indigo-700 hover:bg-indigo-800 text-white font-bold text-xs rounded-xl shadow-xs transition-colors cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              Buat Pos Tagihan Baru
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
              Cetak Laporan
            </button>
          </div>
        </div>

        {/* Daftar Pos Pembayaran Badges */}
        <div className="mt-5">
          <label className="text-[11px] font-black text-slate-500 uppercase tracking-wider block mb-2.5">
            Pilih Pos Tagihan Angsuran:
          </label>
          {paymentCategories.length === 0 ? (
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 bg-amber-50 border border-amber-200/80 rounded-2xl text-amber-900 text-xs">
              <div className="flex items-center gap-2.5">
                <AlertCircle className="w-5 h-5 text-amber-600 shrink-0" />
                <div>
                  <span className="font-bold">Belum ada pos tagihan angsuran untuk kelas {currentClass}.</span>
                  <p className="text-[11px] text-amber-700 mt-0.5">
                    Semua nominal tagihan bernilai Rp 0 karena belum ada pos yang dibuat. Silakan klik tombol <strong>"+ Buat Pos Tagihan Baru"</strong> untuk membuat pos tagihan (misal: Seragam, Buku LKS, Study Tour, Wisuda, dll).
                  </p>
                </div>
              </div>
              <button
                onClick={handleOpenAddCategory}
                className="self-start sm:self-auto px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs rounded-xl shadow-xs transition-colors shrink-0 cursor-pointer flex items-center gap-1.5"
              >
                <Plus className="w-4 h-4" />
                Buat Pos Tagihan
              </button>
            </div>
          ) : (
            <div className="flex flex-wrap items-center gap-2.5">
              {paymentCategories.map((cat) => {
                const isSelected = selectedCategoryId === cat.id;
                const nominal = cat.totalAmount ?? cat.nominal ?? 0;

                return (
                  <div
                    key={cat.id}
                    className={`flex items-center gap-2 pl-3.5 pr-2 py-2 rounded-2xl text-xs font-bold border transition-all ${
                      isSelected
                        ? 'bg-gradient-to-r from-indigo-900 to-indigo-800 text-white border-indigo-900 shadow-md shadow-indigo-950/10'
                        : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100 hover:border-slate-300'
                    }`}
                  >
                    <button
                      onClick={() => setSelectedCategoryId(cat.id)}
                      className="cursor-pointer text-left flex items-center gap-2"
                    >
                      <span>{cat.name}</span>
                      <span
                        className={`text-[10px] px-2 py-0.5 rounded-full font-black ${
                          isSelected ? 'bg-white/20 text-white' : 'bg-indigo-100 text-indigo-900'
                        }`}
                      >
                        Rp {nominal.toLocaleString('id-ID')}
                      </span>
                    </button>

                    <div className={`flex items-center gap-0.5 ml-1 border-l pl-1.5 ${isSelected ? 'border-white/30' : 'border-slate-200'}`}>
                      <button
                        onClick={() => handleOpenEditCategory(cat)}
                        className={`p-1 rounded-md transition-colors cursor-pointer ${
                          isSelected ? 'hover:bg-white/20 text-white' : 'hover:bg-slate-200 text-slate-500'
                        }`}
                        title="Edit Pos"
                      >
                        <Edit2 className="w-3 h-3" />
                      </button>
                      <button
                        onClick={() => handleDeleteCategory(cat.id)}
                        className={`p-1 rounded-md transition-colors cursor-pointer ${
                          isSelected ? 'hover:bg-rose-500 text-rose-200' : 'hover:bg-rose-100 text-rose-500'
                        }`}
                        title="Hapus Pos"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* DASHBOARD MONITORING PIUTANG KELAS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Total Dana Terkumpul */}
        <div className="bg-gradient-to-br from-emerald-50 to-teal-50/50 rounded-3xl border border-emerald-200/80 p-5 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-emerald-800 uppercase tracking-wider">Total Masuk</span>
            <div className="w-8 h-8 rounded-xl bg-emerald-600/10 text-emerald-700 flex items-center justify-center">
              <ArrowDownRight className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2">
            <div className="text-2xl font-black text-emerald-950">
              Rp {metrics.totalCollected.toLocaleString('id-ID')}
            </div>
            <div className="flex items-center justify-between text-xs text-emerald-700 mt-2 font-semibold">
              <span>{metrics.lunasCount} siswa telah lunas</span>
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

        {/* Card 2: Sisa Piutang Kelas */}
        <div className="bg-white rounded-3xl border border-slate-200 p-5 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Sisa Piutang Kelas</span>
            <div className="w-8 h-8 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2">
            <div className="text-2xl font-black text-rose-900">
              Rp {metrics.totalRemaining.toLocaleString('id-ID')}
            </div>
            <p className="text-xs text-rose-700 mt-2 font-semibold">
              {activeCategory
                ? `Dari total kewajiban Rp ${metrics.totalTargetClass.toLocaleString('id-ID')}`
                : 'Belum ada kewajiban tagihan (Rp 0)'}
            </p>
          </div>
        </div>

        {/* Card 3: Status Pelunasan Siswa */}
        <div className="bg-white rounded-3xl border border-slate-200 p-5 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Status Partisipasi</span>
            <div className="w-8 h-8 rounded-xl bg-indigo-50 text-indigo-700 flex items-center justify-center">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2">
            <div className="text-2xl font-black text-slate-800">
              {metrics.lunasCount} <span className="text-sm font-semibold text-slate-400">/ {metrics.totalStudents} Lunas</span>
            </div>
            <div className="flex items-center gap-1.5 mt-2">
              <span className="px-2 py-0.5 bg-amber-100 text-amber-800 text-[11px] font-bold rounded-md">
                {metrics.mengangsurCount} Mengangsur
              </span>
              <span className="px-2 py-0.5 bg-rose-100 text-rose-800 text-[11px] font-bold rounded-md">
                {metrics.belumBayarCount} Belum
              </span>
            </div>
          </div>
        </div>

        {/* Card 4: Target Tagihan per Siswa */}
        <div className="bg-white rounded-3xl border border-slate-200 p-5 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Tarif Pos Aktif</span>
            <div className="w-8 h-8 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center">
              <CreditCard className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2">
            <div className="text-2xl font-black text-slate-800">
              Rp {targetAmt.toLocaleString('id-ID')}
            </div>
            <p className="text-xs text-slate-500 mt-2 font-medium">
              {activeCategory ? activeCategory.name : 'Belum ada pos tagihan aktif'}
            </p>
          </div>
        </div>
      </div>

      {/* TABEL STATUS & KASIR ANGSURAN SISWA */}
      {!activeCategory ? (
        <div className="bg-white rounded-3xl border border-slate-200/90 p-12 text-center shadow-xs space-y-4">
          <div className="w-16 h-16 mx-auto rounded-3xl bg-indigo-50 border border-indigo-100 text-indigo-700 flex items-center justify-center shadow-xs">
            <CreditCard className="w-8 h-8 text-indigo-600" />
          </div>
          <div className="max-w-md mx-auto space-y-1.5">
            <h3 className="text-base font-extrabold text-slate-800">Belum Ada Pos Tagihan Angsuran</h3>
            <p className="text-xs text-slate-500 leading-relaxed">
              Kelas {currentClass} saat ini belum memiliki pos tagihan angsuran yang aktif. Oleh karena itu, seluruh siswa tercatat <strong>Rp 0 (tidak ada tagihan/tunggakan)</strong>.
            </p>
          </div>
          <div className="pt-2">
            <button
              onClick={handleOpenAddCategory}
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-indigo-700 hover:bg-indigo-800 text-white font-bold text-xs rounded-xl shadow-md transition-all cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              Buat Pos Tagihan Baru Sekarang
            </button>
          </div>
        </div>
      ) : (
      <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="relative w-full sm:w-72">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Cari nama atau NISN siswa..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:outline-indigo-600 focus:bg-white"
            />
          </div>

          <div className="flex items-center gap-1.5 self-end sm:self-center">
            <span className="text-[11px] font-bold text-slate-500">Filter Status:</span>
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
              onClick={() => setStatusFilter('lunas')}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                statusFilter === 'lunas'
                  ? 'bg-emerald-700 text-white'
                  : 'bg-emerald-50 text-emerald-800 hover:bg-emerald-100'
              }`}
            >
              Lunas ({metrics.lunasCount})
            </button>
            <button
              onClick={() => setStatusFilter('mengangsur')}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                statusFilter === 'mengangsur'
                  ? 'bg-amber-600 text-white'
                  : 'bg-amber-50 text-amber-800 hover:bg-amber-100'
              }`}
            >
              Mengangsur ({metrics.mengangsurCount})
            </button>
            <button
              onClick={() => setStatusFilter('belum')}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                statusFilter === 'belum'
                  ? 'bg-rose-600 text-white'
                  : 'bg-rose-50 text-rose-800 hover:bg-rose-100'
              }`}
            >
              Belum ({metrics.belumBayarCount})
            </button>
          </div>
        </div>

        {/* Tabel Siswa */}
        <div className="border border-slate-200 rounded-2xl overflow-x-auto shadow-2xs">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-100 text-slate-700 font-extrabold border-b border-slate-200">
                <th className="p-3 w-10 text-center">No</th>
                <th className="p-3 w-28">NISN</th>
                <th className="p-3">Nama Siswa</th>
                <th className="p-3 text-right w-32">Total Tagihan</th>
                <th className="p-3 text-right w-32">Telah Disetor</th>
                <th className="p-3 text-right w-32">Sisa Kekurangan</th>
                <th className="p-3 text-center w-28">Status</th>
                <th className="p-3 text-center w-56">Kasir & Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium">
              {filteredStudents.length === 0 ? (
                <tr>
                  <td colSpan={8} className="p-8 text-center text-slate-400">
                    Tidak ada siswa yang sesuai filter.
                  </td>
                </tr>
              ) : (
                filteredStudents.map((st, idx) => {
                  const stIns = getStudentInstallments(st.id);
                  const totalPaid = stIns.reduce((sum, item) => sum + item.amount, 0);
                  const remaining = Math.max(0, targetAmt - totalPaid);
                  const isLunas = totalPaid >= targetAmt && targetAmt > 0;
                  const isMengangsur = totalPaid > 0 && !isLunas;

                  return (
                    <tr key={st.id} className="hover:bg-slate-50 transition-colors">
                      <td className="p-3 text-center text-slate-400 font-bold">{idx + 1}</td>
                      <td className="p-3 font-mono text-slate-500 text-[11px]">{st.nisn}</td>
                      <td className="p-3 font-bold text-slate-800">
                        {st.name}
                        {st.parentWa && (
                          <span className="block text-[10px] text-slate-400 font-normal">
                            WA: {st.parentWa}
                          </span>
                        )}
                      </td>
                      <td className="p-3 text-right font-semibold text-slate-600">
                        Rp {targetAmt.toLocaleString('id-ID')}
                      </td>
                      <td className="p-3 text-right font-black text-emerald-700">
                        Rp {totalPaid.toLocaleString('id-ID')}
                        {stIns.length > 0 && (
                          <span className="block text-[10px] text-slate-400 font-normal">
                            ({stIns.length}x angsur)
                          </span>
                        )}
                      </td>
                      <td className="p-3 text-right font-black text-rose-700">
                        Rp {remaining.toLocaleString('id-ID')}
                      </td>
                      <td className="p-3 text-center">
                        {isLunas ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-emerald-100 text-emerald-800 rounded-full font-bold text-[11px]">
                            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                            Lunas
                          </span>
                        ) : isMengangsur ? (
                          <span className="inline-flex items-center px-2.5 py-1 bg-amber-100 text-amber-800 rounded-full font-bold text-[11px]">
                            Mengangsur
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2.5 py-1 bg-slate-100 text-slate-500 rounded-full font-bold text-[11px]">
                            Belum Bayar
                          </span>
                        )}
                      </td>
                      <td className="p-3 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          {/* 1-Klik Lunas jika belum lunas */}
                          {!isLunas && (
                            <button
                              onClick={() => handleDirectFullPay(st)}
                              className="flex items-center gap-1 px-2 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-bold text-[10px] shadow-2xs transition-colors cursor-pointer"
                              title="1-Klik Langsung Lunas Penuh"
                            >
                              <Zap className="w-3 h-3" />
                              Lunas
                            </button>
                          )}

                          {/* Tombol Histori Kasir */}
                          <button
                            onClick={() => {
                              setHistoryStudent(st);
                              setNewDepositAmount(Math.min(50000, remaining || 50000));
                            }}
                            className="flex items-center gap-1 px-2.5 py-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-900 border border-indigo-200 rounded-lg font-bold text-[11px] transition-colors cursor-pointer"
                            title="Rincian & Riwayat Angsuran"
                          >
                            <History className="w-3.5 h-3.5 text-indigo-700" />
                            Kasir ({stIns.length})
                          </button>

                          {/* WhatsApp */}
                          <button
                            onClick={() => handleOpenWhatsApp(st)}
                            className="p-1.5 text-emerald-700 hover:bg-emerald-100 rounded-lg transition-colors cursor-pointer"
                            title="Kirim Tanda Terima / Tagihan WA"
                          >
                            <MessageCircle className="w-4 h-4" />
                          </button>

                          {/* Cetak Kwitansi Terakhir */}
                          {totalPaid > 0 && (
                            <button
                              onClick={() => handleOpenReceipt(st)}
                              className="p-1.5 text-teal-700 hover:bg-teal-100 rounded-lg transition-colors cursor-pointer"
                              title="Cetak Kwitansi Mini"
                            >
                              <Receipt className="w-4 h-4" />
                            </button>
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

      {/* MODAL: HISTORI KASIR & INPUT ANGSURAN BERTAHAP */}
      {historyStudent && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl border border-slate-200 max-w-xl w-full p-6 shadow-2xl animate-in zoom-in-95 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-2xl bg-indigo-50 text-indigo-700 flex items-center justify-center font-bold">
                  <CreditCard className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-extrabold text-sm text-slate-800">
                    Buku Kasir Angsuran: {historyStudent.name}
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    Pos Tagihan: <span className="font-bold text-indigo-900">{activeCategory?.name || '-'}</span>
                  </p>
                </div>
              </div>
              <button
                onClick={() => setHistoryStudent(null)}
                className="p-1 rounded-lg text-slate-400 hover:bg-slate-100 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Ringkasan Tagihan Siswa Ini */}
            {(() => {
              const stIns = getStudentInstallments(historyStudent.id);
              const paid = stIns.reduce((sum, item) => sum + item.amount, 0);
              const rem = Math.max(0, targetAmt - paid);

              return (
                <div className="mt-4 grid grid-cols-3 gap-3 p-3.5 bg-slate-50 border border-slate-200 rounded-2xl text-center">
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase">Total Kewajiban</span>
                    <div className="text-sm font-black text-slate-800">Rp {targetAmt.toLocaleString('id-ID')}</div>
                  </div>
                  <div>
                    <span className="text-[10px] font-bold text-emerald-700 uppercase">Telah Disetor</span>
                    <div className="text-sm font-black text-emerald-800">Rp {paid.toLocaleString('id-ID')}</div>
                  </div>
                  <div>
                    <span className="text-[10px] font-bold text-rose-700 uppercase">Sisa Kekurangan</span>
                    <div className="text-sm font-black text-rose-800">Rp {rem.toLocaleString('id-ID')}</div>
                  </div>
                </div>
              );
            })()}

            {/* Riwayat Setoran Sebelumnya */}
            <div className="mt-5 space-y-2">
              <span className="text-xs font-black text-slate-700 uppercase tracking-wider block">
                Riwayat Pembayaran Angsuran:
              </span>
              <div className="border border-slate-200 rounded-xl overflow-hidden">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200">
                    <tr>
                      <th className="p-2.5 text-center w-8">#</th>
                      <th className="p-2.5">Tanggal</th>
                      <th className="p-2.5 text-right">Nominal</th>
                      <th className="p-2.5">Catatan</th>
                      <th className="p-2.5 text-center w-24">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {getStudentInstallments(historyStudent.id).length === 0 ? (
                      <tr>
                        <td colSpan={5} className="p-4 text-center text-slate-400">
                          Belum ada catatan angsuran.
                        </td>
                      </tr>
                    ) : (
                      getStudentInstallments(historyStudent.id).map((ins, idx) => (
                        <tr key={ins.id} className="hover:bg-slate-50">
                          <td className="p-2.5 text-center font-bold text-slate-400">{idx + 1}</td>
                          <td className="p-2.5 font-semibold text-slate-800">
                            {ins.date ? ins.date.split('-').reverse().join('/') : '-'}
                          </td>
                          <td className="p-2.5 text-right font-black text-emerald-700">
                            Rp {ins.amount.toLocaleString('id-ID')}
                          </td>
                          <td className="p-2.5 text-slate-500 italic">{ins.note || 'Tunai'}</td>
                          <td className="p-2.5 text-center">
                            <div className="flex items-center justify-center gap-1">
                              <button
                                onClick={() => handleOpenReceipt(historyStudent, ins)}
                                className="p-1 text-teal-700 hover:bg-teal-50 rounded"
                                title="Cetak Kwitansi Setoran Ini"
                              >
                                <Receipt className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => handleDeleteSingleInstallment(ins.id)}
                                className="p-1 text-rose-500 hover:bg-rose-50 rounded"
                                title="Hapus Setoran Ini"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Form Input Angsuran Baru */}
            <form onSubmit={handleAddSingleInstallment} className="mt-5 p-4 bg-indigo-50/60 border border-indigo-200 rounded-2xl space-y-3 text-xs">
              <h4 className="font-black text-indigo-950 uppercase tracking-wider flex items-center gap-1.5">
                <Plus className="w-4 h-4 text-indigo-700" />
                Catat Setoran Angsuran Baru
              </h4>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">Tanggal Bayar</label>
                  <input
                    type="date"
                    value={newDepositDate}
                    onChange={(e) => setNewDepositDate(e.target.value)}
                    className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-xl font-bold text-slate-800 focus:outline-indigo-600"
                    required
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">Nominal Setor (Rp)</label>
                  <input
                    type="number"
                    step={1000}
                    value={newDepositAmount || ''}
                    placeholder="0"
                    onChange={(e) => setNewDepositAmount(parseInt(e.target.value, 10) || 0)}
                    className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-xl font-black text-indigo-950 focus:outline-indigo-600"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">Catatan Setoran</label>
                <input
                  type="text"
                  value={newDepositNote}
                  onChange={(e) => setNewDepositNote(e.target.value)}
                  placeholder="Misal: Tunai via Siswa, Transfer Ibu, dll."
                  className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-xl font-medium text-slate-800 focus:outline-indigo-600"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setHistoryStudent(null)}
                  className="px-4 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold rounded-xl cursor-pointer"
                >
                  Selesai
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-indigo-700 hover:bg-indigo-800 text-white font-bold rounded-xl shadow-xs cursor-pointer"
                >
                  Simpan Setoran
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: CETAK KWITANSI ANGSURAN RESMI */}
      {receiptData && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl border border-slate-200 max-w-lg w-full p-6 shadow-2xl animate-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <span className="font-extrabold text-xs text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                <Receipt className="w-4 h-4 text-indigo-700" />
                Tanda Terima Angsuran Resmi
              </span>
              <button
                onClick={() => setReceiptData(null)}
                className="p-1 rounded-lg text-slate-400 hover:bg-slate-100 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Template Kwitansi Fisik */}
            <div className="mt-4 p-5 bg-gradient-to-br from-indigo-50/30 via-white to-slate-50 border-2 border-dashed border-indigo-700/40 rounded-2xl space-y-3 font-sans text-xs">
              <div className="text-center border-b border-slate-200 pb-2">
                <h4 className="font-black text-slate-800 text-sm tracking-wide">
                  {schoolProfile.namaMadrasah.toUpperCase()}
                </h4>
                <p className="text-[10px] text-slate-500">
                  {schoolProfile.alamatMadrasah}
                </p>
                <div className="mt-1 inline-block px-3 py-0.5 bg-indigo-800 text-white font-black text-[10px] rounded-full uppercase tracking-wider">
                  Kwitansi Pembayaran Angsuran
                </div>
              </div>

              <div className="space-y-1.5 text-slate-700">
                <div className="flex">
                  <span className="w-28 font-semibold text-slate-500">Telah diterima dari</span>
                  <span className="font-black text-slate-900">: {receiptData.student.name}</span>
                </div>
                <div className="flex">
                  <span className="w-28 font-semibold text-slate-500">NISN / Kelas</span>
                  <span className="font-semibold text-slate-700">
                    : {receiptData.student.nisn} ({currentClass})
                  </span>
                </div>
                <div className="flex">
                  <span className="w-28 font-semibold text-slate-500">Untuk Pos</span>
                  <span className="font-bold text-indigo-950">: {activeCategory?.name || '-'}</span>
                </div>
                <div className="flex">
                  <span className="w-28 font-semibold text-slate-500">Terbilang</span>
                  <span className="font-bold italic text-slate-800">
                    : # {terbilang(receiptData.installment?.amount || receiptData.totalPaid)} #
                  </span>
                </div>
              </div>

              <div className="p-3 bg-indigo-50/80 border border-indigo-200 rounded-xl grid grid-cols-3 gap-2 text-center">
                <div>
                  <span className="text-[10px] text-slate-500 block">Total Tagihan:</span>
                  <span className="font-bold text-slate-800">Rp {targetAmt.toLocaleString('id-ID')}</span>
                </div>
                <div>
                  <span className="text-[10px] text-emerald-800 font-bold block">Disetor Kali Ini:</span>
                  <span className="font-black text-emerald-950">
                    Rp {(receiptData.installment?.amount || 0).toLocaleString('id-ID')}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-rose-800 font-bold block">Sisa Kekurangan:</span>
                  <span className="font-black text-rose-950">
                    Rp {receiptData.remaining.toLocaleString('id-ID')}
                  </span>
                </div>
              </div>

              <div className="pt-2 flex items-end justify-between border-t border-slate-200">
                <div className="text-[10px] text-slate-500">
                  <span>Status: </span>
                  <span className="font-black text-indigo-900">
                    {receiptData.remaining <= 0 ? 'LUNAS (100%)' : 'BELUM LUNAS'}
                  </span>
                </div>

                <div className="text-center text-[10px]">
                  <p className="text-slate-500">
                    Purbalingga,{' '}
                    {receiptData.installment?.date
                      ? receiptData.installment.date.split('-').reverse().join('/')
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
                onClick={() => setReceiptData(null)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl cursor-pointer text-xs"
              >
                Tutup
              </button>
              <button
                onClick={() => {
                  window.print();
                }}
                className="flex items-center gap-1.5 px-4 py-2 bg-indigo-700 hover:bg-indigo-800 text-white font-bold rounded-xl shadow-xs cursor-pointer text-xs"
              >
                <Printer className="w-4 h-4" />
                Cetak Kwitansi
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: NOTIFIKASI TANDA TERIMA / TAGIHAN WHATSAPP */}
      {waData && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl border border-slate-200 max-w-lg w-full p-6 shadow-2xl animate-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <span className="font-extrabold text-xs text-emerald-800 uppercase tracking-wider flex items-center gap-1.5">
                <MessageCircle className="w-4 h-4 text-emerald-600" />
                Kirim Laporan Angsuran ke WhatsApp
              </span>
              <button
                onClick={() => setWaData(null)}
                className="p-1 rounded-lg text-slate-400 hover:bg-slate-100 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="mt-4 space-y-3 text-xs">
              <div className="flex items-center justify-between">
                <span className="font-bold text-slate-700">Tujuan Wali Murid:</span>
                <span className="font-black text-slate-900">{waData.student.name}</span>
              </div>

              {waData.student.parentWa ? (
                <div className="p-2.5 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center justify-between">
                  <span className="text-emerald-800 font-bold text-[11px]">
                    Nomor WhatsApp Terdaftar: {waData.student.parentWa}
                  </span>
                  <span className="text-[10px] bg-emerald-200 text-emerald-900 font-extrabold px-2 py-0.5 rounded-full">
                    Tersedia
                  </span>
                </div>
              ) : (
                <div className="p-2.5 bg-amber-50 border border-amber-200 rounded-xl text-amber-800 text-[11px] font-medium">
                  Nomor WhatsApp belum terdaftar di profil siswa. Anda dapat menyalin teks dan mengirimkannya secara manual.
                </div>
              )}

              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">
                  Isi Pesan:
                </label>
                <textarea
                  rows={8}
                  readOnly
                  value={waData.messageText}
                  className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl font-mono text-[11px] text-slate-800 focus:outline-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard.writeText(waData.messageText);
                    showToast('Teks pesan berhasil disalin ke clipboard!');
                  }}
                  className="flex items-center gap-1.5 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold rounded-xl cursor-pointer"
                >
                  <Copy className="w-4 h-4 text-slate-600" />
                  Salin Teks
                </button>

                {waData.student.parentWa && (
                  <a
                    href={`https://wa.me/${waData.student.parentWa.replace(/[^0-9]/g, '')}?text=${encodeURIComponent(
                      waData.messageText
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

      {/* MODAL: BUAT / EDIT POS PEMBAYARAN */}
      {showCategoryModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl border border-slate-200 max-w-md w-full p-6 shadow-2xl animate-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="font-extrabold text-base text-slate-800">
                {editingCatId ? 'Edit Pos Tagihan Angsuran' : 'Buat Pos Tagihan Baru'}
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
                  Nama Pos Tagihan <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={catName}
                  onChange={(e) => setCatName(e.target.value)}
                  placeholder="Misal: Seragam Batik & Olahraga, LKS Semester 1"
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl font-bold text-slate-800 focus:outline-indigo-600"
                  required
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  Target Tagihan per Siswa (Rp) <span className="text-rose-500">*</span>
                </label>
                <input
                  type="number"
                  step={5000}
                  value={catNominal}
                  onChange={(e) => setCatNominal(parseInt(e.target.value, 10) || 0)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl font-black text-indigo-900 focus:outline-indigo-600"
                  required
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">Keterangan / Catatan</label>
                <textarea
                  rows={2}
                  value={catDesc}
                  onChange={(e) => setCatDesc(e.target.value)}
                  placeholder="Catatan tambahan pos tagihan..."
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-slate-700 focus:outline-indigo-600"
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
                  className="px-5 py-2 bg-indigo-700 hover:bg-indigo-800 text-white font-bold rounded-xl shadow-xs cursor-pointer"
                >
                  {editingCatId ? 'Simpan Perubahan' : 'Buat Pos Tagihan'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
