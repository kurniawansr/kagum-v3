import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { StudentAssignment } from '../../types';
import { ClipboardList, Plus, Edit2, Trash2, Printer, FileSpreadsheet, FileText, CheckCircle2, Eye } from 'lucide-react';
import { exportToExcel, exportToPdf } from '../../utils/exportUtils';
import { formatIndonesianDate } from '../../utils/calendarUtils';

export const TugasSiswaView: React.FC = () => {
  const { studentTasks: assignments = [], setStudentTasks: setAssignments, subjects, currentUser, schoolProfile } = useApp();
  const currentClass = currentUser?.kelas || 'Kelas IA';

  const [printDate, setPrintDate] = useState(new Date().toISOString().split('T')[0]);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [message, setMessage] = useState('');
  const [detailModal, setDetailModal] = useState<StudentAssignment | null>(null);

  const [formData, setFormData] = useState<Omit<StudentAssignment, 'id' | 'kelas'>>({
    date: new Date().toISOString().split('T')[0],
    subjectCode: subjects[0]?.code || 'QH',
    lingkupMateriNumber: 1,
    tpNumber: 1,
    nature: 'Mandiri',
    type: 'Praktik',
    completionDays: 3,
    instructions: '',
  });

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]:
        name === 'lingkupMateriNumber' || name === 'tpNumber' || name === 'completionDays'
          ? parseInt(value, 10) || 1
          : value,
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (editingId) {
      setAssignments(assignments.map((a) => (a.id === editingId ? { ...a, ...formData } : a)));
      setMessage('Instruksi tugas berhasil diperbarui!');
      setEditingId(null);
    } else {
      const newAssignment: StudentAssignment = {
        id: `asg-${Date.now()}`,
        kelas: currentClass,
        ...formData,
      };
      setAssignments([...assignments, newAssignment]);
      setMessage('Tugas siswa baru berhasil dibuat!');
    }

    setShowAddForm(false);
    setTimeout(() => setMessage(''), 3000);
  };

  const handleEdit = (asg: StudentAssignment) => {
    setEditingId(asg.id);
    setFormData({
      date: asg.date,
      subjectCode: asg.subjectCode,
      lingkupMateriNumber: asg.lingkupMateriNumber,
      tpNumber: asg.tpNumber,
      nature: asg.nature,
      type: asg.type,
      completionDays: asg.completionDays,
      instructions: asg.instructions,
    });
    setShowAddForm(true);
    setTimeout(() => {
      window.scrollTo({ top: 150, behavior: 'smooth' });
    }, 50);
  };

  const handleDelete = (id: string) => {
    setAssignments((prev) => prev.filter((a) => a.id !== id));
    if (editingId === id) {
      setEditingId(null);
      setShowAddForm(false);
    }
    setMessage('Tugas berhasil dihapus.');
    setTimeout(() => setMessage(''), 3000);
  };

  const myAssignments = assignments.filter((a) => a.kelas === currentClass);

  const handleExportPdf = () => {
    const titleLines = [
      'DAFTAR TUGAS DAN ASESMEN',
      `KELAS ${currentClass.toUpperCase()}`,
      `SEMESTER ${schoolProfile.semester.toUpperCase()} TAHUN AJARAN ${schoolProfile.tahunAjaran}`,
    ];

    const headers = ['No', 'Tanggal', 'Mapel', 'LM / TP', 'Sifat & Jenis', 'Waktu', 'Instruksi Tugas'];
    const rows = myAssignments.map((a, idx) => {
      const sbj = (subjects || []).find((s) => s.code === a.subjectCode);
      return [
        idx + 1,
        formatIndonesianDate(a.date),
        sbj ? `${sbj.name} (${a.subjectCode})` : a.subjectCode,
        `LM ${a.lingkupMateriNumber} / TP ${a.tpNumber}`,
        `${a.nature} - ${a.type}`,
        `${a.completionDays} Hari`,
        a.instructions,
      ];
    });

    exportToPdf({
      filename: `Daftar_Tugas_Dan_Asesmen_${currentClass.replace(' ', '_')}`,
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
      'DAFTAR INSTRUKSI TUGAS SISWA',
      `KELAS: ${currentClass}`,
      `TAHUN AJARAN ${schoolProfile.tahunAjaran}`,
    ];

    const headers = ['No', 'Tanggal', 'Mapel', 'LM', 'TP', 'Sifat', 'Jenis', 'Waktu (Hari)', 'Instruksi Tugas'];
    const rows = myAssignments.map((a, idx) => {
      const sbj = (subjects || []).find((s) => s.code === a.subjectCode);
      return [
        idx + 1,
        a.date,
        sbj ? sbj.name : a.subjectCode,
        a.lingkupMateriNumber,
        a.tpNumber,
        a.nature,
        a.type,
        a.completionDays,
        a.instructions,
      ];
    });

    exportToExcel(
      `Instruksi_Tugas_${currentClass.replace(' ', '_')}`,
      'Tugas',
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
              <ClipboardList className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-800">Manajemen Penugasan Siswa ({currentClass})</h2>
              <p className="text-xs text-slate-500">
                Pemberian instruksi tugas mandiri/kelompok, jenis praktik/proyek, dan batas waktu pengerjaan
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
              Buat Tugas
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
              {editingId ? 'Edit Instruksi Tugas' : 'Buat Instruksi Penugasan Baru'}
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-1">Tanggal Tugas</label>
                <input
                  type="date"
                  name="date"
                  value={formData.date}
                  onChange={handleInputChange}
                  className="w-full px-3 py-1.5 text-xs border border-slate-200 rounded-lg bg-white"
                  required
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-1">Mata Pelajaran</label>
                <select
                  name="subjectCode"
                  value={formData.subjectCode}
                  onChange={handleInputChange}
                  className="w-full px-3 py-1.5 text-xs border border-slate-200 rounded-lg bg-white font-bold"
                >
                  {subjects.map((s) => (
                    <option key={s.id} value={s.code}>
                      [{s.code}] {s.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-1">Lingkup Materi (LM)</label>
                <select
                  name="lingkupMateriNumber"
                  value={formData.lingkupMateriNumber}
                  onChange={handleInputChange}
                  className="w-full px-3 py-1.5 text-xs border border-slate-200 rounded-lg bg-white"
                >
                  {Array.from({ length: 6 }).map((_, i) => (
                    <option key={i + 1} value={i + 1}>
                      LM {i + 1}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-1">Tujuan Pembelajaran (TP)</label>
                <select
                  name="tpNumber"
                  value={formData.tpNumber}
                  onChange={handleInputChange}
                  className="w-full px-3 py-1.5 text-xs border border-slate-200 rounded-lg bg-white"
                >
                  {Array.from({ length: 10 }).map((_, i) => (
                    <option key={i + 1} value={i + 1}>
                      TP {i + 1}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-1">Sifat Penugasan</label>
                <select
                  name="nature"
                  value={formData.nature}
                  onChange={handleInputChange}
                  className="w-full px-3 py-1.5 text-xs border border-slate-200 rounded-lg bg-white"
                >
                  <option value="Mandiri">Mandiri</option>
                  <option value="Kelompok">Kelompok</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-1">Jenis Penilaian / Tugas</label>
                <select
                  name="type"
                  value={formData.type}
                  onChange={handleInputChange}
                  className="w-full px-3 py-1.5 text-xs border border-slate-200 rounded-lg bg-white font-bold"
                >
                  <option value="Asesmen Formatif">Asesmen Formatif</option>
                  <option value="Asesmen Sumatif">Asesmen Sumatif</option>
                  <option value="SAS">Sumatif Akhir Semester (SAS)</option>
                  <option value="Praktik">Praktik</option>
                  <option value="Portofolio">Portofolio</option>
                  <option value="Proyek">Proyek</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-1">Batas Waktu Penyelesaian (Hari)</label>
                <input
                  type="number"
                  name="completionDays"
                  min={1}
                  max={30}
                  value={formData.completionDays}
                  onChange={handleInputChange}
                  className="w-full px-3 py-1.5 text-xs border border-slate-200 rounded-lg bg-white font-bold"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-700 mb-1">Instruksi Tugas Lengkap</label>
              <textarea
                name="instructions"
                rows={3}
                value={formData.instructions}
                onChange={handleInputChange}
                placeholder="Hafalkan Surah At-Tin beserta artinya dan rekam video pendek..."
                className="w-full px-3 py-1.5 text-xs border border-slate-200 rounded-lg bg-white"
                required
              />
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
                {editingId ? 'Simpan Perubahan' : 'Simpan Tugas'}
              </button>
            </div>
          </form>
        )}
      </div>

      {/* Assignments Table */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs overflow-x-auto">
        <table className="w-full text-left text-xs border-collapse">
          <thead>
            <tr className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200">
              <th className="p-3 w-10 text-center">No</th>
              <th className="p-3">Tanggal</th>
              <th className="p-3">Mata Pelajaran</th>
              <th className="p-3">LM & TP</th>
              <th className="p-3">Sifat & Jenis</th>
              <th className="p-3 text-center">Batas Waktu</th>
              <th className="p-3 text-center">Aksi</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {myAssignments.map((a, idx) => {
              const sbj = (subjects || []).find((s) => s.code === a.subjectCode);
              return (
                <tr key={a.id} className="hover:bg-slate-50 transition-colors">
                  <td className="p-3 text-center text-slate-500 font-medium">{idx + 1}</td>
                  <td className="p-3 font-bold text-slate-800">{formatIndonesianDate(a.date)}</td>
                  <td className="p-3 font-semibold text-emerald-800">
                    {sbj ? sbj.name : a.subjectCode} ({a.subjectCode})
                  </td>
                  <td className="p-3 text-slate-700">LM {a.lingkupMateriNumber} / TP {a.tpNumber}</td>
                  <td className="p-3 text-slate-600">
                    <span className="px-2 py-0.5 bg-slate-100 rounded text-[11px] font-semibold border border-slate-200">
                      {a.nature} • {a.type}
                    </span>
                  </td>
                  <td className="p-3 text-center font-bold text-amber-700 bg-amber-50/50 rounded-lg">
                    {a.completionDays} Hari
                  </td>
                  <td className="p-3 text-center">
                    <div className="inline-flex items-center gap-1">
                      <button
                        onClick={() => setDetailModal(a)}
                        className="p-1.5 text-emerald-700 hover:bg-emerald-50 rounded-lg"
                        title="Lihat Instruksi Lengkap"
                      >
                        <Eye className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleEdit(a)}
                        className="p-1.5 text-indigo-600 hover:bg-indigo-50 rounded-lg"
                        title="Edit Tugas"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleDelete(a.id)}
                        className="p-1.5 text-rose-600 hover:bg-rose-50 rounded-lg"
                        title="Hapus Tugas"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Detail Modal */}
      {detailModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4">
          <div className="bg-white rounded-2xl p-6 max-w-xl w-full space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="font-bold text-slate-800 text-sm">
                Instruksi Lengkap Penugasan Siswa
              </h3>
              <button
                onClick={() => setDetailModal(null)}
                className="px-2.5 py-1 text-xs bg-slate-200 hover:bg-slate-300 rounded-lg text-slate-700 font-semibold"
              >
                Tutup
              </button>
            </div>
            <div className="space-y-2 text-xs">
              <p><strong>Mata Pelajaran:</strong> {detailModal.subjectCode}</p>
              <p><strong>Sifat / Jenis:</strong> {detailModal.nature} ({detailModal.type})</p>
              <p><strong>Batas Waktu:</strong> {detailModal.completionDays} Hari</p>
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl mt-2 font-mono text-slate-800 leading-relaxed">
                {detailModal.instructions}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
