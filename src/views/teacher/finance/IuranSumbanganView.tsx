import React, { useState } from 'react';
import { useApp } from '../../../context/AppContext';
import { ContributionRecord } from '../../../types';
import { Wallet, Plus, Save, Printer, FileSpreadsheet, FileText, CheckCircle2, Trash2, Edit2, ListFilter } from 'lucide-react';
import { exportToExcel, exportToPdf } from '../../../utils/exportUtils';

interface ContributionItem {
  id: string;
  title: string;
  type: 'iuran' | 'sumbangan';
  nature: 'seikhlasnya' | 'ditentukan';
  defaultNominal: number;
}

export const IuranSumbanganView: React.FC = () => {
  const { students, donationPayments, setDonationPayments, currentUser, schoolProfile } = useApp() as any;
  const contributionRecords = donationPayments || [];
  const setContributionRecords = setDonationPayments || (() => {});
  const currentClass = currentUser?.kelas || 'Kelas 1A';
  const myStudents = students.filter((s) => s.kelas === currentClass);

  // List of Iuran / Sumbangan items created by teacher
  const [itemsList, setItemsList] = useState<ContributionItem[]>([
    {
      id: 'item-1',
      title: 'Sumbangan PHBI Isra Mi’raj',
      type: 'sumbangan',
      nature: 'seikhlasnya',
      defaultNominal: 10000,
    },
    {
      id: 'item-2',
      title: 'Iuran Kas Kelas',
      type: 'iuran',
      nature: 'ditentukan',
      defaultNominal: 5000,
    },
  ]);

  const [selectedItemId, setSelectedItemId] = useState<string>('item-1');
  const [editingItemId, setEditingItemId] = useState<string | null>(null);

  const [formTitle, setFormTitle] = useState<string>('');
  const [formType, setFormType] = useState<'iuran' | 'sumbangan'>('iuran');
  const [formNature, setFormNature] = useState<'seikhlasnya' | 'ditentukan'>('seikhlasnya');
  const [formNominal, setFormNominal] = useState<number>(10000);
  const [showItemForm, setShowItemForm] = useState<boolean>(false);

  const [printDate, setPrintDate] = useState(new Date().toISOString().split('T')[0]);
  const [message, setMessage] = useState('');

  // Selected Item
  const activeItem = (itemsList || []).find((it) => it.id === selectedItemId) || (itemsList || [])[0];

  // Helper to get record for student and active item
  const getStudentRecord = (studentId: string) => {
    return (contributionRecords || []).find(
      (r) => r.studentId === studentId && (r.categoryId === activeItem?.id || (r as any).title === activeItem?.title)
    );
  };

  const handleOpenAdd = () => {
    setEditingItemId(null);
    setFormTitle('');
    setFormType('iuran');
    setFormNature('seikhlasnya');
    setFormNominal(10000);
    setShowItemForm(true);
  };

  const handleOpenEdit = (item: ContributionItem) => {
    setEditingItemId(item.id);
    setFormTitle(item.title);
    setFormType(item.type);
    setFormNature(item.nature);
    setFormNominal(item.defaultNominal);
    setShowItemForm(true);
  };

  const handleDeleteItem = (itemId: string) => {
    const itemToDelete = (itemsList || []).find((i) => i.id === itemId);
    if (!itemToDelete) return;
    setItemsList(itemsList.filter((i) => i.id !== itemId));
    if (selectedItemId === itemId) {
      const remaining = itemsList.filter((i) => i.id !== itemId);
      if (remaining.length > 0) setSelectedItemId(remaining[0].id);
    }
    setMessage(`Item "${itemToDelete.title}" berhasil dihapus.`);
    setTimeout(() => setMessage(''), 3000);
  };

  const handleSaveItemForm = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formTitle.trim()) return;

    if (editingItemId) {
      setItemsList(
        itemsList.map((item) =>
          item.id === editingItemId
            ? {
                ...item,
                title: formTitle,
                type: formType,
                nature: formNature,
                defaultNominal: formNominal,
              }
            : item
        )
      );
      setMessage(`Item "${formTitle}" berhasil diperbarui!`);
    } else {
      const newItem: ContributionItem = {
        id: `item-${Date.now()}`,
        title: formTitle,
        type: formType,
        nature: formNature,
        defaultNominal: formNominal,
      };
      setItemsList([...itemsList, newItem]);
      setSelectedItemId(newItem.id);
      setMessage(`Item baru "${formTitle}" berhasil ditambahkan!`);
    }

    setShowItemForm(false);
    setTimeout(() => setMessage(''), 3000);
  };

  // Student deposit changes
  const handleStudentDepositChange = (studentId: string, amount: number, dateStr: string) => {
    if (!activeItem) return;
    const existingIndex = (contributionRecords || []).findIndex(
      (r) => r.studentId === studentId && (r.categoryId === activeItem.id || (r as any).title === activeItem.title)
    );

    if (existingIndex >= 0) {
      const updated = [...(contributionRecords || [])];
      updated[existingIndex] = {
        ...updated[existingIndex],
        amount,
        date: dateStr,
      };
      setContributionRecords(updated);
    } else {
      const newRec: ContributionRecord = {
        id: `cnt-${studentId}-${Date.now()}`,
        categoryId: activeItem.id,
        studentId,
        amount,
        date: dateStr,
      };
      setContributionRecords([...(contributionRecords || []), newRec]);
    }
  };

  const handleExportPdf = () => {
    if (!activeItem) return;

    const titleLines = [
      `REKAPITULASI ${activeItem.title.toUpperCase()}`,
      `KELAS ${currentClass.toUpperCase()}`,
      `TAHUN AJARAN ${schoolProfile.tahunAjaran}`,
    ];

    const headers = ['No', 'Nama Siswa', 'Tanggal Setor', 'Nominal', 'Status'];
    const rows = myStudents.map((st, idx) => {
      const rec = getStudentRecord(st.id);
      const amt = rec ? rec.amount : 0;
      const dateStr = rec ? rec.date.split('-').reverse().join('/') : '-';
      const statusStr = amt > 0 ? 'Terbayar' : 'Belum';

      return [
        idx + 1,
        st.name,
        dateStr,
        `Rp ${amt.toLocaleString('id-ID')}`,
        statusStr,
      ];
    });

    exportToPdf({
      filename: `Rekapitulasi_${activeItem.title.replace(/\s+/g, '_')}_${currentClass.replace(/\s+/g, '_')}`,
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
    if (!activeItem) return;

    const headerLines = [
      `REKAPITULASI ${activeItem.title}`,
      `KELAS: ${currentClass}`,
      `TAHUN AJARAN ${schoolProfile.tahunAjaran}`,
    ];

    const headers = ['No', 'Nama Siswa', 'Tanggal Setor', 'Nominal (Rp)', 'Status'];
    const rows = myStudents.map((st, idx) => {
      const rec = getStudentRecord(st.id);
      const amt = rec ? rec.amount : 0;
      const dateStr = rec ? rec.date : '-';
      const statusStr = amt > 0 ? 'Terbayar' : 'Belum';

      return [idx + 1, st.name, dateStr, amt, statusStr];
    });

    exportToExcel(
      `Rekapitulasi_${activeItem.title.replace(/\s+/g, '_')}_${currentClass.replace(/\s+/g, '_')}`,
      'Iuran Sumbangan',
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
            <div className="w-10 h-10 rounded-xl bg-teal-50 text-teal-700 flex items-center justify-center font-bold">
              <Wallet className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-800">Iuran & Sumbangan Kegiatan ({currentClass})</h2>
              <p className="text-xs text-slate-500">
                Pencatatan iuran sukarela atau sumbangan kegiatan kelas dan madrasah
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
              onClick={handleOpenAdd}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-emerald-700 hover:bg-emerald-800 text-white font-semibold text-xs rounded-xl transition-colors shadow-sm cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              Tambah Iuran / Sumbangan
            </button>

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

        {/* List Iuran / Sumbangan Badges */}
        <div className="mt-4 space-y-2">
          <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider">
            Daftar Iuran & Sumbangan Yang Dibuat Guru:
          </label>
          <div className="flex flex-wrap items-center gap-2">
            {itemsList.map((item) => (
              <div
                key={item.id}
                className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold border transition-all ${
                  selectedItemId === item.id
                    ? 'bg-teal-800 text-white border-teal-800 shadow-xs'
                    : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                }`}
              >
                <span onClick={() => setSelectedItemId(item.id)} className="cursor-pointer">
                  {item.title} ({item.type === 'iuran' ? 'Iuran' : 'Sumbangan'})
                </span>
                <div className="flex items-center gap-1 ml-1 border-l pl-2 border-slate-300">
                  <button
                    onClick={() => handleOpenEdit(item)}
                    className="p-1 hover:text-amber-300 transition-colors cursor-pointer"
                    title="Edit Item"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => handleDeleteItem(item.id)}
                    className="p-1 hover:text-rose-300 transition-colors cursor-pointer"
                    title="Hapus Item"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {message && (
          <div className="mt-4 p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs flex items-center gap-2 font-medium">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            {message}
          </div>
        )}

        {/* Create/Edit Item Modal or Form */}
        {showItemForm && (
          <form onSubmit={handleSaveItemForm} className="mt-4 p-4 bg-teal-50/60 border border-teal-200 rounded-2xl space-y-3 text-xs">
            <h3 className="font-bold text-teal-900 uppercase tracking-wider">
              {editingItemId ? 'Edit Iuran / Sumbangan' : 'Tambah List Iuran / Sumbangan Baru'}
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-1">Jenis Pembayaran</label>
                <select
                  value={formType}
                  onChange={(e) => setFormType(e.target.value as any)}
                  className="w-full px-3 py-1.5 border border-slate-200 rounded-lg bg-white font-bold text-slate-800"
                >
                  <option value="iuran">Iuran Kegiatan</option>
                  <option value="sumbangan">Sumbangan Sukarela</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-1">Nama Iuran / Sumbangan</label>
                <input
                  type="text"
                  value={formTitle}
                  onChange={(e) => setFormTitle(e.target.value)}
                  placeholder="Contoh: Sumbangan Isra Mi'raj"
                  className="w-full px-3 py-1.5 border border-slate-200 rounded-lg bg-white font-bold"
                  required
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-1">Sifat Ketetapan</label>
                <select
                  value={formNature}
                  onChange={(e) => setFormNature(e.target.value as any)}
                  className="w-full px-3 py-1.5 border border-slate-200 rounded-lg bg-white font-semibold text-slate-800"
                >
                  <option value="seikhlasnya">Seikhlasnya (Bebas)</option>
                  <option value="ditentukan">Ditentukan (Nominal Tetap)</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-1">Default Nominal (Rp)</label>
                <input
                  type="number"
                  step={1000}
                  value={formNominal}
                  onChange={(e) => setFormNominal(parseInt(e.target.value, 10) || 0)}
                  className="w-full px-3 py-1.5 border border-slate-200 rounded-lg bg-white font-bold"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={() => setShowItemForm(false)}
                className="px-3 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-700 font-semibold rounded-lg cursor-pointer"
              >
                Batal
              </button>
              <button
                type="submit"
                className="px-4 py-1.5 bg-teal-800 hover:bg-teal-900 text-white font-semibold rounded-lg shadow-sm cursor-pointer"
              >
                {editingItemId ? 'Simpan Perubahan' : 'Simpan List'}
              </button>
            </div>
          </form>
        )}
      </div>

      {/* Selected Item Deposit Table */}
      {activeItem && (
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs overflow-x-auto">
          <div className="flex items-center justify-between pb-3 mb-4 border-b border-slate-100">
            <h3 className="font-bold text-slate-800 text-sm">
              Tabel Setoran: <span className="text-teal-800 font-black">{activeItem.title}</span> ({activeItem.type.toUpperCase()})
            </h3>
          </div>

          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200">
                <th className="p-3 w-12 text-center">No.</th>
                <th className="p-3">Nama Siswa</th>
                <th className="p-3 text-center w-40">Tanggal Setor</th>
                <th className="p-3 text-center w-44">Nominal</th>
                <th className="p-3 text-center w-32">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {myStudents.map((st, idx) => {
                const rec = getStudentRecord(st.id);
                const currentAmt = rec ? rec.amount : (activeItem.nature === 'ditentukan' ? activeItem.defaultNominal : 0);
                const currentDate = rec ? rec.date : new Date().toISOString().split('T')[0];

                return (
                  <tr key={st.id} className="hover:bg-slate-50 transition-colors">
                    <td className="p-3 text-center text-slate-500 font-medium">{idx + 1}</td>
                    <td className="p-3 font-bold text-slate-800">{st.name}</td>
                    <td className="p-3 text-center">
                      <input
                        type="date"
                        value={currentDate}
                        onChange={(e) => handleStudentDepositChange(st.id, currentAmt, e.target.value)}
                        className="w-32 px-2 py-1 border border-slate-200 rounded-lg text-center font-semibold text-slate-800 bg-white"
                      />
                    </td>
                    <td className="p-3 text-center">
                      <input
                        type="number"
                        step={1000}
                        value={currentAmt}
                        onChange={(e) =>
                          handleStudentDepositChange(st.id, parseInt(e.target.value, 10) || 0, currentDate)
                        }
                        className="w-32 px-3 py-1 border border-slate-200 rounded-lg text-center font-extrabold text-teal-800 bg-white"
                      />
                    </td>
                    <td className="p-3 text-center">
                      {currentAmt > 0 ? (
                        <span className="px-2.5 py-1 bg-emerald-100 text-emerald-800 rounded-full font-bold text-[11px]">
                          • Terbayar
                        </span>
                      ) : (
                        <span className="px-2.5 py-1 bg-slate-100 text-slate-500 rounded-full font-bold text-[11px]">
                          Belum
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};
