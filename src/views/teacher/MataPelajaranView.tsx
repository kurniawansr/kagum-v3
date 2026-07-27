import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { Subject } from '../../types';
import { BookOpenCheck, Plus, Edit2, Trash2, Printer, FileSpreadsheet, FileText, CheckCircle2 } from 'lucide-react';
import { exportToExcel, exportToPdf } from '../../utils/exportUtils';

export const MataPelajaranView: React.FC = () => {
  const { subjects, setSubjects, currentUser, schoolProfile } = useApp();
  const currentClass = currentUser?.kelas || 'Kelas 1A';

  const [printDate, setPrintDate] = useState(new Date().toISOString().split('T')[0]);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [message, setMessage] = useState('');

  const [formData, setFormData] = useState<Omit<Subject, 'id'>>({
    code: '',
    name: '',
    lingkupMateriCount: 3,
    sumatifWeight: 60,
    sasWeight: 40,
    kktp: 75,
  });

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: name === 'code' || name === 'name' ? value : parseInt(value, 10) || 0,
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (editingId) {
      setSubjects(subjects.map((sbj) => (sbj.id === editingId ? { ...sbj, ...formData } : sbj)));
      setMessage('Data Mata Pelajaran berhasil diperbarui!');
      setEditingId(null);
    } else {
      const newSubject: Subject = {
        id: `sbj-${Date.now()}`,
        ...formData,
      };
      setSubjects([...subjects, newSubject]);
      setMessage('Mata Pelajaran baru berhasil ditambahkan!');
    }

    setFormData({
      code: '',
      name: '',
      lingkupMateriCount: 3,
      sumatifWeight: 60,
      sasWeight: 40,
      kktp: 75,
    });
    setShowAddForm(false);
    setTimeout(() => setMessage(''), 3000);
  };

  const handleEdit = (subject: Subject) => {
    setEditingId(subject.id);
    setFormData({
      code: subject.code,
      name: subject.name,
      lingkupMateriCount: subject.lingkupMateriCount,
      sumatifWeight: subject.sumatifWeight,
      sasWeight: subject.sasWeight,
      kktp: subject.kktp,
    });
    setShowAddForm(true);
    setTimeout(() => {
      window.scrollTo({ top: 150, behavior: 'smooth' });
    }, 50);
  };

  const handleDelete = (id: string, name?: string) => {
    setSubjects((prev) => prev.filter((s) => s.id !== id));
    if (editingId === id) {
      setEditingId(null);
      setShowAddForm(false);
    }
    setMessage(`Mata pelajaran ${name ? `"${name}"` : ''} berhasil dihapus.`);
    setTimeout(() => setMessage(''), 3000);
  };

  const handleExportPdf = () => {
    const titleLines = [
      'DATA MATA PELAJARAN, BOBOT NILAI, DAN KKTP',
      `KELAS: ${currentClass.toUpperCase()}`,
      `TAHUN AJARAN ${schoolProfile.tahunAjaran}`,
    ];

    const headers = ['No', 'Kode Mapel', 'Nama Mata Pelajaran', 'Jumlah LM', 'Bobot Sumatif (%)', 'Bobot SAS (%)', 'KKTP'];
    const rows = subjects.map((s, idx) => [
      idx + 1,
      s.code,
      s.name,
      s.lingkupMateriCount,
      `${s.sumatifWeight}%`,
      `${s.sasWeight}%`,
      s.kktp,
    ]);

    exportToPdf({
      filename: `Mata_Pelajaran_${currentClass.replace(' ', '_')}`,
      titleLines,
      tableHeaders: headers,
      tableRows: rows,
      schoolProfile,
      printDate,
    });
  };

  const handleExportExcel = () => {
    const headerLines = [
      'DATA MATA PELAJARAN, BOBOT NILAI, DAN KKTP',
      `KELAS: ${currentClass}`,
      `TAHUN AJARAN ${schoolProfile.tahunAjaran}`,
    ];

    const headers = ['No', 'Kode Mapel', 'Nama Mata Pelajaran', 'Jumlah LM', 'Bobot Sumatif (%)', 'Bobot SAS (%)', 'KKTP'];
    const rows = subjects.map((s, idx) => [
      idx + 1,
      s.code,
      s.name,
      s.lingkupMateriCount,
      s.sumatifWeight,
      s.sasWeight,
      s.kktp,
    ]);

    exportToExcel(
      `Mata_Pelajaran_${currentClass.replace(' ', '_')}`,
      'Mapel',
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
              <BookOpenCheck className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-800">Pengaturan Mata Pelajaran & KKTP</h2>
              <p className="text-xs text-slate-500">
                Kelola Kode Mapel, Lingkup Materi (LM), Bobot Sumatif/SAS, dan Batas Kriteria Ketuntasan (KKTP)
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
              onClick={() => {
                setEditingId(null);
                setShowAddForm(!showAddForm);
              }}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-emerald-700 hover:bg-emerald-800 text-white font-semibold text-xs rounded-xl transition-colors shadow-sm"
            >
              <Plus className="w-4 h-4" />
              Tambah Mapel
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

        {/* Add/Edit Form Expandable */}
        {showAddForm && (
          <form onSubmit={handleSubmit} className="mt-4 p-4 bg-teal-50/50 border border-teal-200 rounded-2xl space-y-4">
            <h3 className="text-xs font-bold text-teal-900 uppercase tracking-wider">
              {editingId ? 'Edit Mata Pelajaran' : 'Tambah Mata Pelajaran Baru'}
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-1">Kode Mapel</label>
                <input
                  type="text"
                  name="code"
                  value={formData.code}
                  onChange={handleInputChange}
                  placeholder="MTK / QH / BIND"
                  className="w-full px-3 py-1.5 text-xs border border-slate-200 rounded-lg bg-white uppercase font-mono font-bold"
                  required
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-[11px] font-semibold text-slate-700 mb-1">Nama Mata Pelajaran</label>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  placeholder="Matematika"
                  className="w-full px-3 py-1.5 text-xs border border-slate-200 rounded-lg bg-white"
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-1">Jumlah Lingkup Materi (LM)</label>
                <input
                  type="number"
                  name="lingkupMateriCount"
                  min={1}
                  max={10}
                  value={formData.lingkupMateriCount}
                  onChange={handleInputChange}
                  className="w-full px-3 py-1.5 text-xs border border-slate-200 rounded-lg bg-white"
                  required
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-1">Bobot Sumatif (%)</label>
                <input
                  type="number"
                  name="sumatifWeight"
                  min={0}
                  max={100}
                  value={formData.sumatifWeight}
                  onChange={handleInputChange}
                  className="w-full px-3 py-1.5 text-xs border border-slate-200 rounded-lg bg-white"
                  required
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-1">Bobot SAS (%)</label>
                <input
                  type="number"
                  name="sasWeight"
                  min={0}
                  max={100}
                  value={formData.sasWeight}
                  onChange={handleInputChange}
                  className="w-full px-3 py-1.5 text-xs border border-slate-200 rounded-lg bg-white"
                  required
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-1">Batas KKTP</label>
                <input
                  type="number"
                  name="kktp"
                  min={0}
                  max={100}
                  value={formData.kktp}
                  onChange={handleInputChange}
                  className="w-full px-3 py-1.5 text-xs border border-slate-200 rounded-lg bg-white font-bold text-rose-700"
                  required
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => {
                  setShowAddForm(false);
                  setEditingId(null);
                }}
                className="px-3 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-700 font-semibold text-xs rounded-lg"
              >
                Batal
              </button>
              <button
                type="submit"
                className="px-4 py-1.5 bg-teal-800 hover:bg-teal-900 text-white font-semibold text-xs rounded-lg shadow-sm"
              >
                {editingId ? 'Simpan Perubahan' : 'Simpan Mapel'}
              </button>
            </div>
          </form>
        )}
      </div>

      {/* Subjects Table */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200">
            <tr>
              <th className="p-3 w-10 text-center">No</th>
              <th className="p-3">Kode Mapel</th>
              <th className="p-3">Nama Mata Pelajaran</th>
              <th className="p-3 text-center">Jumlah LM</th>
              <th className="p-3 text-center">Bobot Sumatif</th>
              <th className="p-3 text-center">Bobot SAS</th>
              <th className="p-3 text-center">KKTP</th>
              <th className="p-3 text-center">Aksi</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {subjects.map((sbj, idx) => (
              <tr key={sbj.id} className="hover:bg-slate-50 transition-colors">
                <td className="p-3 text-center text-slate-500 font-medium">{idx + 1}</td>
                <td className="p-3 font-mono font-extrabold text-emerald-800">{sbj.code}</td>
                <td className="p-3 font-bold text-slate-800">{sbj.name}</td>
                <td className="p-3 text-center font-semibold text-slate-700">{sbj.lingkupMateriCount} LM</td>
                <td className="p-3 text-center text-slate-600">{sbj.sumatifWeight}%</td>
                <td className="p-3 text-center text-slate-600">{sbj.sasWeight}%</td>
                <td className="p-3 text-center font-extrabold text-rose-700 bg-rose-50/50 rounded-lg">
                  {sbj.kktp}
                </td>
                <td className="p-3 text-center">
                  <div className="inline-flex items-center gap-1">
                    <button
                      onClick={() => handleEdit(sbj)}
                      className="p-1.5 text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                      title="Edit Mapel"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => handleDelete(sbj.id)}
                      className="p-1.5 text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                      title="Hapus Mapel"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
