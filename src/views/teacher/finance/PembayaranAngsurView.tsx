import React, { useState } from 'react';
import { useApp } from '../../../context/AppContext';
import { PaymentCategory, StudentInstallment } from '../../../types';
import { CreditCard, Plus, Save, Trash2, Edit2, Printer, FileSpreadsheet, FileText, CheckCircle2 } from 'lucide-react';
import { exportToExcel, exportToPdf } from '../../../utils/exportUtils';

export const PembayaranAngsurView: React.FC = () => {
  const { students, paymentCategories, setPaymentCategories, paymentInstallments: studentInstallments = [], setPaymentInstallments: setStudentInstallments, currentUser, schoolProfile } = useApp();
  const currentClass = currentUser?.kelas || 'Kelas IA';
  const myStudents = students.filter((s) => s.kelas === currentClass);

  const [selectedCategoryId, setSelectedCategoryId] = useState<string>(paymentCategories[0]?.id || '');
  const [printDate, setPrintDate] = useState(new Date().toISOString().split('T')[0]);
  const [showCategoryForm, setShowCategoryForm] = useState(false);
  const [message, setMessage] = useState('');

  // Category Form State
  const [catForm, setCatForm] = useState({
    name: '',
    totalAmount: 150000,
  });

  // Deposit Form Modal State
  const [depositModal, setDepositModal] = useState<{
    studentId: string;
    studentName: string;
    amount: number;
  } | null>(null);

  const getCatTargetAmount = (cat?: PaymentCategory) => (cat ? (cat.totalAmount ?? cat.nominal ?? 0) : 0);

  const activeCategory = (paymentCategories || []).find((c) => c.id === selectedCategoryId) || (paymentCategories || [])[0];

  const handleAddCategory = (e: React.FormEvent) => {
    e.preventDefault();
    const newCat: PaymentCategory = {
      id: `cat-${Date.now()}`,
      name: catForm.name,
      totalAmount: catForm.totalAmount,
      nominal: catForm.totalAmount,
    };
    setPaymentCategories([...(paymentCategories || []), newCat]);
    setSelectedCategoryId(newCat.id);
    setMessage(`Jenis pembayaran "${newCat.name}" berhasil ditambahkan!`);
    setCatForm({ name: '', totalAmount: 150000 });
    setShowCategoryForm(false);
    setTimeout(() => setMessage(''), 3000);
  };

  const handleDeleteCategory = (id: string) => {
    if (confirm('Hapus jenis pembayaran angsuran ini?')) {
      setPaymentCategories((paymentCategories || []).filter((c) => c.id !== id));
      setMessage('Jenis pembayaran dihapus.');
      setTimeout(() => setMessage(''), 3000);
    }
  };

  const handleAddDepositSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!depositModal || !activeCategory) return;

    const today = new Date().toISOString().split('T')[0];
    const newInstallment: StudentInstallment = {
      id: `ins-${Date.now()}`,
      studentId: depositModal.studentId,
      categoryId: activeCategory.id,
      amount: depositModal.amount,
      date: today,
    };

    setStudentInstallments([...studentInstallments, newInstallment]);
    setMessage(`Setoran angsuran sebesar Rp ${depositModal.amount.toLocaleString('id-ID')} berhasil dicatat!`);
    setDepositModal(null);
    setTimeout(() => setMessage(''), 3000);
  };

  const handleExportPdf = () => {
    if (!activeCategory) return;
    const targetAmt = getCatTargetAmount(activeCategory);

    const titleLines = [
      `REKAPITULASI PEMBAYARAN ANGSURAN: ${activeCategory.name.toUpperCase()}`,
      `KELAS ${currentClass.toUpperCase()}`,
      `SEMESTER ${schoolProfile.semester.toUpperCase()} TAHUN AJARAN ${schoolProfile.tahunAjaran}`,
      `TARGET TAGIHAN: Rp ${targetAmt.toLocaleString('id-ID')}`,
    ];

    const headers = ['No', 'NISN', 'Nama Siswa', 'Total Biaya', 'Total Setor', 'Sisa Kekurangan', 'Status'];
    const rows = myStudents.map((st, idx) => {
      const stInstallments = studentInstallments.filter(
        (i) => i.studentId === st.id && i.categoryId === activeCategory.id
      );
      const totalPaid = stInstallments.reduce((sum, item) => sum + item.amount, 0);
      const remaining = Math.max(0, targetAmt - totalPaid);
      let statusStr = 'Belum Bayar';
      if (totalPaid >= targetAmt) statusStr = 'Lunas';
      else if (totalPaid > 0) statusStr = 'Belum Lunas';

      return [
        idx + 1,
        st.nisn,
        st.name,
        `Rp ${targetAmt.toLocaleString('id-ID')}`,
        `Rp ${totalPaid.toLocaleString('id-ID')}`,
        `Rp ${remaining.toLocaleString('id-ID')}`,
        statusStr,
      ];
    });

    exportToPdf({
      filename: `Angsuran_${activeCategory.name.replace(' ', '_')}_${currentClass.replace(' ', '_')}`,
      titleLines,
      tableHeaders: headers,
      tableRows: rows,
      schoolProfile,
      printDate,
      teacherName: currentUser?.name,
      teacherNip: currentUser?.nip,
    });
  };

  const handleExportExcel = () => {
    if (!activeCategory) return;
    const targetAmt = getCatTargetAmount(activeCategory);

    const headerLines = [
      `LAPORAN PEMBAYARAN ANGSURAN: ${activeCategory.name}`,
      `KELAS: ${currentClass}`,
      `TOTAL BIAYA: Rp ${targetAmt.toLocaleString('id-ID')}`,
      `TAHUN AJARAN ${schoolProfile.tahunAjaran}`,
    ];

    const headers = ['No', 'NISN', 'Nama Siswa', 'Total Biaya', 'Total Setor', 'Sisa Kekurangan', 'Status'];
    const rows = myStudents.map((st, idx) => {
      const stInstallments = studentInstallments.filter(
        (i) => i.studentId === st.id && i.categoryId === activeCategory.id
      );
      const totalPaid = stInstallments.reduce((sum, item) => sum + item.amount, 0);
      const remaining = Math.max(0, targetAmt - totalPaid);
      let statusStr = 'Belum Bayar';
      if (totalPaid >= targetAmt) statusStr = 'Lunas';
      else if (totalPaid > 0) statusStr = 'Belum Lunas';

      return [idx + 1, st.nisn, st.name, targetAmt, totalPaid, remaining, statusStr];
    });

    exportToExcel(
      `Angsuran_${activeCategory.name.replace(' ', '_')}_${currentClass.replace(' ', '_')}`,
      'Angsuran',
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
            <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-700 flex items-center justify-center font-bold">
              <CreditCard className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-800">Pembayaran Angsuran Kegiatan / Seragam ({currentClass})</h2>
              <p className="text-xs text-slate-500">
                Pencatatan pembayaran bertahap (cicilan) seragam, outing class, buku paket, dan kegiatan madrasah
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
              onClick={() => setShowCategoryForm(!showCategoryForm)}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-emerald-700 hover:bg-emerald-800 text-white font-semibold text-xs rounded-xl transition-colors shadow-sm"
            >
              <Plus className="w-4 h-4" />
              Tambah Jenis Pembayaran
            </button>

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

        {message && (
          <div className="mt-4 p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs flex items-center gap-2 font-medium">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            {message}
          </div>
        )}

        {/* Add Category Form Expandable */}
        {showCategoryForm && (
          <form onSubmit={handleAddCategory} className="mt-4 p-4 bg-indigo-50/50 border border-indigo-200 rounded-2xl space-y-3 text-xs">
            <h3 className="font-bold text-indigo-900 uppercase tracking-wider">
              Buat Jenis Pembayaran Angsuran Baru
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-1">Nama Pos Pembayaran</label>
                <input
                  type="text"
                  value={catForm.name}
                  onChange={(e) => setCatForm({ ...catForm, name: e.target.value })}
                  placeholder="Batik Madrasah & Seragam Olahraga"
                  className="w-full px-3 py-1.5 border border-slate-200 rounded-lg bg-white"
                  required
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-1">Total Target Tagihan (Rp)</label>
                <input
                  type="number"
                  step={5000}
                  value={catForm.totalAmount}
                  onChange={(e) => setCatForm({ ...catForm, totalAmount: parseInt(e.target.value, 10) || 0 })}
                  className="w-full px-3 py-1.5 border border-slate-200 rounded-lg bg-white font-bold"
                  required
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={() => setShowCategoryForm(false)}
                className="px-3 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-700 font-semibold rounded-lg"
              >
                Batal
              </button>
              <button
                type="submit"
                className="px-4 py-1.5 bg-indigo-800 hover:bg-indigo-900 text-white font-semibold rounded-lg shadow-sm"
              >
                Simpan Pos
              </button>
            </div>
          </form>
        )}

        {/* Category Selector Tabs */}
        <div className="mt-4 flex flex-wrap items-center gap-2">
          {(paymentCategories || []).map((cat) => (
            <div
              key={cat.id}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold border cursor-pointer transition-all ${
                selectedCategoryId === cat.id
                  ? 'bg-indigo-800 text-white border-indigo-800 shadow-xs'
                  : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
              }`}
            >
              <span onClick={() => setSelectedCategoryId(cat.id)}>
                {cat.name} (Rp {getCatTargetAmount(cat).toLocaleString('id-ID')})
              </span>
              <button
                onClick={() => handleDeleteCategory(cat.id)}
                className="text-slate-400 hover:text-rose-300 p-0.5 ml-1"
                title="Hapus Pos"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Student Installment Status Table */}
      {activeCategory && (
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs overflow-x-auto">
          <h3 className="font-bold text-slate-800 text-sm mb-4">
            Status Angsuran Siswa [{activeCategory.name}] — Target: Rp {getCatTargetAmount(activeCategory).toLocaleString('id-ID')}
          </h3>

          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200">
                <th className="p-3 w-10 text-center">No</th>
                <th className="p-3">NISN</th>
                <th className="p-3">Nama Lengkap Siswa</th>
                <th className="p-3 text-right">Total Tagihan</th>
                <th className="p-3 text-right">Total Disetor</th>
                <th className="p-3 text-right">Sisa Kekurangan</th>
                <th className="p-3 text-center">Status</th>
                <th className="p-3 text-center">Aksi Setor</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {myStudents.map((st, idx) => {
                const targetAmt = getCatTargetAmount(activeCategory);
                const stInstallments = (studentInstallments || []).filter(
                  (i) => i.studentId === st.id && i.categoryId === activeCategory.id
                );
                const totalPaid = stInstallments.reduce((sum, item) => sum + item.amount, 0);
                const remaining = Math.max(0, targetAmt - totalPaid);

                let statusBadge = (
                  <span className="px-2.5 py-1 bg-rose-100 text-rose-800 rounded-full font-bold text-[11px]">
                    Belum Bayar
                  </span>
                );

                if (totalPaid >= targetAmt) {
                  statusBadge = (
                    <span className="px-2.5 py-1 bg-emerald-100 text-emerald-800 rounded-full font-bold text-[11px]">
                      • Lunas
                    </span>
                  );
                } else if (totalPaid > 0) {
                  statusBadge = (
                    <span className="px-2.5 py-1 bg-amber-100 text-amber-800 rounded-full font-bold text-[11px]">
                      Belum Lunas
                    </span>
                  );
                }

                return (
                  <tr key={st.id} className="hover:bg-slate-50 transition-colors">
                    <td className="p-3 text-center text-slate-500 font-medium">{idx + 1}</td>
                    <td className="p-3 font-mono text-slate-700 font-semibold">{st.nisn}</td>
                    <td className="p-3 font-bold text-slate-800">{st.name}</td>
                    <td className="p-3 text-right font-semibold text-slate-600">
                      Rp {targetAmt.toLocaleString('id-ID')}
                    </td>
                    <td className="p-3 text-right font-bold text-emerald-700">
                      Rp {totalPaid.toLocaleString('id-ID')}
                    </td>
                    <td className="p-3 text-right font-bold text-rose-700">
                      Rp {remaining.toLocaleString('id-ID')}
                    </td>
                    <td className="p-3 text-center">{statusBadge}</td>
                    <td className="p-3 text-center">
                      <button
                        onClick={() =>
                          setDepositModal({
                            studentId: st.id,
                            studentName: st.name,
                            amount: Math.min(50000, remaining || 50000),
                          })
                        }
                        disabled={remaining === 0}
                        className="px-3 py-1 bg-indigo-700 hover:bg-indigo-800 disabled:opacity-40 text-white font-bold rounded-lg text-xs transition-colors"
                      >
                        + Setor
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Deposit Modal */}
      {depositModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4">
          <form onSubmit={handleAddDepositSubmit} className="bg-white rounded-2xl p-6 max-w-md w-full space-y-4">
            <h3 className="font-bold text-slate-800 text-sm pb-2 border-b border-slate-100">
              Input Setoran Angsuran: {depositModal.studentName}
            </h3>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Pos Pembayaran</label>
                <input
                  type="text"
                  value={activeCategory?.name}
                  disabled
                  className="w-full px-3 py-1.5 border border-slate-200 rounded-lg bg-slate-100 font-bold"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Nominal Setor (Rp)</label>
                <input
                  type="number"
                  step={5000}
                  value={depositModal.amount}
                  onChange={(e) =>
                    setDepositModal({ ...depositModal, amount: parseInt(e.target.value, 10) || 0 })
                  }
                  className="w-full px-3 py-1.5 border border-slate-200 rounded-lg bg-white font-bold text-emerald-800"
                  required
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setDepositModal(null)}
                className="px-3 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-700 font-semibold text-xs rounded-lg"
              >
                Batal
              </button>
              <button
                type="submit"
                className="px-4 py-1.5 bg-emerald-800 hover:bg-emerald-900 text-white font-semibold text-xs rounded-lg shadow-sm"
              >
                Simpan Setoran
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
