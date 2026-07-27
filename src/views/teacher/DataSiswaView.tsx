import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { Student } from '../../types';
import {
  Users,
  UserPlus,
  Search,
  FileSpreadsheet,
  FileText,
  Printer,
  Upload,
  Download,
  Edit2,
  Trash2,
  CheckCircle2,
} from 'lucide-react';
import { exportToExcel, exportToPdf } from '../../utils/exportUtils';
import * as XLSX from 'xlsx';

export const DataSiswaView: React.FC = () => {
  const { students, setStudents, currentUser, schoolProfile } = useApp();

  const currentClass = currentUser?.kelas || 'Kelas 1A';

  const [searchTerm, setSearchTerm] = useState('');
  const [printDate, setPrintDate] = useState(new Date().toISOString().split('T')[0]);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [message, setMessage] = useState('');

  const [formData, setFormData] = useState<Omit<Student, 'id' | 'kelas'>>({
    nisn: '',
    name: '',
    birthPlace: 'Purbalingga',
    birthDate: '2018-01-01',
    address: 'Krangean RT 01 RW 01 Kertanegara',
    fatherName: '',
    motherName: '',
    parentWa: '6281234567890',
  });

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // Ensure WhatsApp number starts with 62
    let waNum = formData.parentWa.trim();
    if (waNum.startsWith('08')) {
      waNum = '62' + waNum.slice(1);
    } else if (!waNum.startsWith('62')) {
      waNum = '62' + waNum;
    }

    if (editingId) {
      setStudents(
        students.map((s) =>
          s.id === editingId
            ? { ...s, ...formData, parentWa: waNum }
            : s
        )
      );
      setMessage('Data siswa berhasil diperbarui!');
      setEditingId(null);
    } else {
      const newStudent: Student = {
        id: `std-${Date.now()}`,
        kelas: currentClass,
        ...formData,
        parentWa: waNum,
      };
      setStudents([...students, newStudent]);
      setMessage('Siswa baru berhasil ditambahkan!');
    }

    setFormData({
      nisn: '',
      name: '',
      birthPlace: 'Purbalingga',
      birthDate: '2018-01-01',
      address: 'Krangean RT 01 RW 01 Kertanegara',
      fatherName: '',
      motherName: '',
      parentWa: '6281234567890',
    });
    setShowAddForm(false);
    setTimeout(() => setMessage(''), 3000);
  };

  const handleEdit = (student: Student) => {
    setEditingId(student.id);
    setFormData({
      nisn: student.nisn,
      name: student.name,
      birthPlace: student.birthPlace,
      birthDate: student.birthDate,
      address: student.address,
      fatherName: student.fatherName,
      motherName: student.motherName,
      parentWa: student.parentWa,
    });
    setShowAddForm(true);
    setTimeout(() => {
      window.scrollTo({ top: 150, behavior: 'smooth' });
    }, 50);
  };

  const handleDelete = (id: string, name?: string) => {
    setStudents((prev) => prev.filter((s) => s.id !== id));
    if (editingId === id) {
      setEditingId(null);
      setShowAddForm(false);
    }
    setMessage(`Data siswa ${name ? `"${name}"` : ''} berhasil dihapus.`);
    setTimeout(() => setMessage(''), 3000);
  };

  // Download Excel Template for Import
  const handleDownloadTemplate = () => {
    const templateData = [
      ['NISN', 'Nama Lengkap', 'Tempat Lahir', 'Tanggal Lahir (YYYY-MM-DD)', 'Alamat', 'Nama Ayah/Wali', 'Nama Ibu/Wali', 'No WA Orang Tua (62...)'],
      ['0123456789', 'Siswa Contoh', 'Purbalingga', '2018-05-12', 'Jl. Krangean', 'Bapak Contoh', 'Ibu Contoh', '6281234567890'],
    ];
    const ws = XLSX.utils.aoa_to_sheet(templateData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Template');
    XLSX.writeFile(wb, 'Template_Import_Siswa_KAGUM.xlsx');
  };

  // Import Excel File
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const bstr = evt.target?.result;
        const wb = XLSX.read(bstr, { type: 'binary' });
        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];
        const data: any[][] = XLSX.utils.sheet_to_json(ws, { header: 1 });

        // Skip header row
        const newStudentsArr: Student[] = [];
        for (let i = 1; i < data.length; i++) {
          const row = data[i];
          if (row && row[1]) {
            let wa = String(row[7] || '6281234567890');
            if (wa.startsWith('08')) wa = '62' + wa.slice(1);

            newStudentsArr.push({
              id: `std-imp-${Date.now()}-${i}`,
              nisn: String(row[0] || `0123456${i}`),
              name: String(row[1]),
              birthPlace: String(row[2] || 'Purbalingga'),
              birthDate: String(row[3] || '2018-01-01'),
              address: String(row[4] || 'Krangean'),
              fatherName: String(row[5] || 'Ayah'),
              motherName: String(row[6] || 'Ibu'),
              parentWa: wa,
              kelas: currentClass,
            });
          }
        }

        if (newStudentsArr.length > 0) {
          setStudents([...students, ...newStudentsArr]);
          setMessage(`Berhasil mengimpor ${newStudentsArr.length} data siswa baru!`);
          setTimeout(() => setMessage(''), 3000);
        }
      } catch (err) {
        alert('Gagal membaca file Excel. Pastikan format sesuai template.');
      }
    };
    reader.readAsBinaryString(file);
  };

  // Filtered Students list
  const filteredStudents = students
    .filter((s) => s.kelas === currentClass)
    .filter(
      (s) =>
        s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        s.nisn.includes(searchTerm)
    );

  // Export PDF
  const handleExportPdf = () => {
    const titleLines = [
      'DAFTAR DATA SISWA KELAS',
      `KELAS: ${currentClass.toUpperCase()}`,
      `TAHUN AJARAN ${schoolProfile.tahunAjaran}`,
    ];

    const headers = ['No', 'NISN', 'Nama Lengkap', 'TTL', 'Alamat', 'Nama Ortu/Wali', 'No. WA Ortu'];
    const rows = filteredStudents.map((s, idx) => [
      idx + 1,
      s.nisn,
      s.name,
      `${s.birthPlace}, ${s.birthDate}`,
      s.address,
      `${s.fatherName} / ${s.motherName}`,
      s.parentWa,
    ]);

    exportToPdf({
      filename: `Data_Siswa_${currentClass.replace(' ', '_')}`,
      titleLines,
      tableHeaders: headers,
      tableRows: rows,
      schoolProfile,
      printDate,
      orientation: 'landscape',
    });
  };

  // Export Excel
  const handleExportExcel = () => {
    const headerLines = [
      'DAFTAR DATA SISWA KELAS',
      `KELAS: ${currentClass}`,
      `TAHUN AJARAN ${schoolProfile.tahunAjaran}`,
    ];

    const headers = ['No', 'NISN', 'Nama Lengkap', 'Tempat Lahir', 'Tanggal Lahir', 'Alamat', 'Nama Ayah', 'Nama Ibu', 'No. WA Ortu'];
    const rows = filteredStudents.map((s, idx) => [
      idx + 1,
      s.nisn,
      s.name,
      s.birthPlace,
      s.birthDate,
      s.address,
      s.fatherName,
      s.motherName,
      s.parentWa,
    ]);

    exportToExcel(
      `Data_Siswa_${currentClass.replace(' ', '_')}`,
      'Data Siswa',
      headerLines,
      headers,
      rows
    );
  };

  return (
    <div className="space-y-6">
      {/* Top Banner & Control Actions */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center font-bold">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-800">Manajemen Data Siswa ({currentClass})</h2>
              <p className="text-xs text-slate-500">
                Kelola identitas siswa, wali murid, impor Excel, serta cetak laporan PDF/Excel
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
              <UserPlus className="w-4 h-4" />
              Tambah Siswa
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

        {/* Excel Import/Export Utility Bar */}
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3 p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs">
          <div className="flex items-center gap-2">
            <button
              onClick={handleDownloadTemplate}
              className="flex items-center gap-1 px-3 py-1.5 bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 font-semibold rounded-lg shadow-xs"
            >
              <Download className="w-3.5 h-3.5 text-emerald-600" />
              Download Template Excel
            </button>

            <label className="flex items-center gap-1 px-3 py-1.5 bg-emerald-800 hover:bg-emerald-900 text-white font-semibold rounded-lg shadow-xs cursor-pointer">
              <Upload className="w-3.5 h-3.5" />
              Impor Excel Siswa
              <input type="file" accept=".xlsx,.xls" onChange={handleFileUpload} className="hidden" />
            </label>
          </div>

          <div className="relative w-full sm:w-64">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Cari nama atau NISN..."
              className="w-full pl-9 pr-3 py-1.5 text-xs border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-emerald-600"
            />
          </div>
        </div>

        {/* Add/Edit Form Expandable */}
        {showAddForm && (
          <form onSubmit={handleSubmit} className="mt-4 p-4 bg-emerald-50/50 border border-emerald-200 rounded-2xl space-y-4">
            <h3 className="text-xs font-bold text-emerald-900 uppercase tracking-wider">
              {editingId ? 'Edit Data Siswa' : 'Form Input Data Siswa Baru'}
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-1">NISN</label>
                <input
                  type="text"
                  name="nisn"
                  value={formData.nisn}
                  onChange={handleInputChange}
                  placeholder="0123456789"
                  className="w-full px-3 py-1.5 text-xs border border-slate-200 rounded-lg bg-white"
                  required
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-1">Nama Lengkap Siswa</label>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  placeholder="Ahmad Raihan"
                  className="w-full px-3 py-1.5 text-xs border border-slate-200 rounded-lg bg-white"
                  required
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-1">Tempat Lahir</label>
                <input
                  type="text"
                  name="birthPlace"
                  value={formData.birthPlace}
                  onChange={handleInputChange}
                  placeholder="Purbalingga"
                  className="w-full px-3 py-1.5 text-xs border border-slate-200 rounded-lg bg-white"
                  required
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-1">Tanggal Lahir</label>
                <input
                  type="date"
                  name="birthDate"
                  value={formData.birthDate}
                  onChange={handleInputChange}
                  className="w-full px-3 py-1.5 text-xs border border-slate-200 rounded-lg bg-white"
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
              <div className="md:col-span-2">
                <label className="block text-[11px] font-semibold text-slate-700 mb-1">Alamat Tempat Tinggal</label>
                <input
                  type="text"
                  name="address"
                  value={formData.address}
                  onChange={handleInputChange}
                  placeholder="Krangean RT 01 RW 01 Kertanegara"
                  className="w-full px-3 py-1.5 text-xs border border-slate-200 rounded-lg bg-white"
                  required
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-1">Nama Ayah / Wali</label>
                <input
                  type="text"
                  name="fatherName"
                  value={formData.fatherName}
                  onChange={handleInputChange}
                  placeholder="Bambang Pratama"
                  className="w-full px-3 py-1.5 text-xs border border-slate-200 rounded-lg bg-white"
                  required
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-1">Nama Ibu / Wali</label>
                <input
                  type="text"
                  name="motherName"
                  value={formData.motherName}
                  onChange={handleInputChange}
                  placeholder="Siti Aminah"
                  className="w-full px-3 py-1.5 text-xs border border-slate-200 rounded-lg bg-white"
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                  No. WA Orang Tua / Wali (Berawalan 62)
                </label>
                <input
                  type="text"
                  name="parentWa"
                  value={formData.parentWa}
                  onChange={handleInputChange}
                  placeholder="6281234567890"
                  className="w-full px-3 py-1.5 text-xs border border-slate-200 rounded-lg bg-white font-mono"
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
                className="px-4 py-1.5 bg-emerald-800 hover:bg-emerald-900 text-white font-semibold text-xs rounded-lg shadow-sm"
              >
                {editingId ? 'Simpan Perubahan' : 'Simpan Data Siswa'}
              </button>
            </div>
          </form>
        )}
      </div>

      {/* Student Table */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs overflow-x-auto">
        <table className="w-full text-left text-xs border-collapse">
          <thead>
            <tr className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200">
              <th className="p-3 w-10 text-center">No</th>
              <th className="p-3">NISN</th>
              <th className="p-3">Nama Lengkap</th>
              <th className="p-3">Tempat, Tgl Lahir</th>
              <th className="p-3">Alamat</th>
              <th className="p-3">Nama Orang Tua / Wali</th>
              <th className="p-3">No. WA Ortu</th>
              <th className="p-3 text-center">Aksi</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filteredStudents.length > 0 ? (
              filteredStudents.map((s, idx) => (
                <tr key={s.id} className="hover:bg-slate-50 transition-colors">
                  <td className="p-3 text-center text-slate-500 font-medium">{idx + 1}</td>
                  <td className="p-3 font-mono text-slate-700 font-semibold">{s.nisn}</td>
                  <td className="p-3 font-bold text-slate-800">{s.name}</td>
                  <td className="p-3 text-slate-600">
                    {s.birthPlace}, {s.birthDate}
                  </td>
                  <td className="p-3 text-slate-600">{s.address}</td>
                  <td className="p-3 text-slate-700">
                    <p className="font-medium">Ayah: {s.fatherName}</p>
                    <p className="text-[11px] text-slate-500">Ibu: {s.motherName}</p>
                  </td>
                  <td className="p-3 font-mono text-emerald-700 font-semibold">{s.parentWa}</td>
                  <td className="p-3 text-center">
                    <div className="inline-flex items-center gap-1">
                      <button
                        onClick={() => handleEdit(s)}
                        className="p-1.5 text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                        title="Edit Data Siswa"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleDelete(s.id)}
                        className="p-1.5 text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                        title="Hapus Data Siswa"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={8} className="p-8 text-center text-xs text-slate-400">
                  Belum ada data siswa untuk kelas ini.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
