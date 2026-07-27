import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { LessonSchedule } from '../../types';
import { CalendarDays, Plus, Edit2, Trash2, Printer, FileSpreadsheet, FileText, CheckCircle2, Clock, Settings, RotateCcw, Check, X } from 'lucide-react';
import { exportToExcel, exportToPdf } from '../../utils/exportUtils';
import { initialTimeAllocations } from '../../data/initialData';

export const JadwalPelajaranView: React.FC = () => {
  const { schedules, setSchedules, subjects, currentUser, schoolProfile, timeAllocations, setTimeAllocations } = useApp();
  const currentClass = currentUser?.kelas || 'Kelas 1A';

  const [printDate, setPrintDate] = useState(new Date().toISOString().split('T')[0]);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [message, setMessage] = useState('');

  // Time allocation settings modal state
  const [showTimeAllocModal, setShowTimeAllocModal] = useState(false);
  const [newSlotInput, setNewSlotInput] = useState('');
  const [editingSlotIdx, setEditingSlotIdx] = useState<number | null>(null);
  const [editingSlotValue, setEditingSlotValue] = useState('');

  const defaultSubjectCode = subjects && subjects.length > 0 ? subjects[0].code : 'AQH';

  const [formData, setFormData] = useState<Omit<LessonSchedule, 'id' | 'kelas'>>({
    day: 'Senin',
    timeSlot: timeAllocations[0] || '07.00 - 08.00',
    subjectCode: defaultSubjectCode,
    activityName: '',
  });

  const daysList = ['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];

  // Time slot modal handlers
  const handleAddSlot = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = newSlotInput.trim();
    if (!trimmed) return;
    if (timeAllocations.includes(trimmed)) {
      alert('Alokasi waktu ini sudah ada!');
      return;
    }
    setTimeAllocations([...timeAllocations, trimmed]);
    setNewSlotInput('');
  };

  const handleSaveSlotEdit = (index: number) => {
    const trimmed = editingSlotValue.trim();
    if (!trimmed) return;
    const updated = [...timeAllocations];
    updated[index] = trimmed;
    setTimeAllocations(updated);
    setEditingSlotIdx(null);
    setEditingSlotValue('');
  };

  const handleDeleteSlot = (index: number) => {
    if (timeAllocations.length <= 1) {
      alert('Minimal harus ada 1 alokasi waktu.');
      return;
    }
    const updated = timeAllocations.filter((_, i) => i !== index);
    setTimeAllocations(updated);
  };

  const handleResetSlots = () => {
    setTimeAllocations(initialTimeAllocations);
  };


  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    if (name === 'subjectCode') {
      setFormData({
        ...formData,
        subjectCode: value,
        activityName: value === 'LAIN' ? formData.activityName : '',
      });
    } else {
      setFormData({ ...formData, [name]: value });
    }
  };

  const isCurrentLain =
    formData.subjectCode === 'LAIN' ||
    (!subjects.some((s) => s.code === formData.subjectCode) && formData.subjectCode !== '');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (isCurrentLain && !formData.activityName?.trim()) {
      setMessage('Silakan isi nama kegiatan khusus / manual.');
      setTimeout(() => setMessage(''), 3000);
      return;
    }

    const payload: Omit<LessonSchedule, 'id' | 'kelas'> = {
      ...formData,
      subjectCode: isCurrentLain ? 'LAIN' : formData.subjectCode,
      activityName: isCurrentLain ? formData.activityName?.trim() : '',
    };

    if (editingId) {
      setSchedules(schedules.map((sch) => (sch.id === editingId ? { ...sch, ...payload } : sch)));
      setMessage('Jadwal pelajaran berhasil diperbarui!');
      setEditingId(null);
    } else {
      const newSchedule: LessonSchedule = {
        id: `sch-${Date.now()}`,
        kelas: currentClass,
        ...payload,
      };
      setSchedules([...schedules, newSchedule]);
      setMessage('Jadwal pelajaran baru berhasil ditambahkan!');
    }

    setFormData({
      day: 'Senin',
      timeSlot: '07.00 - 08.00',
      subjectCode: defaultSubjectCode,
      activityName: '',
    });
    setShowAddForm(false);
    setTimeout(() => setMessage(''), 3000);
  };

  const handleEdit = (schedule: LessonSchedule) => {
    setEditingId(schedule.id);
    const isLain = schedule.subjectCode === 'LAIN' || (!subjects.some((s) => s.code === schedule.subjectCode) && !!schedule.activityName);
    setFormData({
      day: schedule.day,
      timeSlot: schedule.timeSlot,
      subjectCode: isLain ? 'LAIN' : schedule.subjectCode,
      activityName: schedule.activityName || '',
    });
    setShowAddForm(true);
    window.scrollTo({ top: 120, behavior: 'smooth' });
  };

  const handleDelete = (id: string, name?: string) => {
    setSchedules((prev) => prev.filter((s) => s.id !== id));
    if (editingId === id) {
      setEditingId(null);
      setShowAddForm(false);
    }
    setMessage(`Jadwal ${name ? `"${name}"` : ''} berhasil dihapus.`);
    setTimeout(() => setMessage(''), 3000);
  };

  const mySchedules = schedules.filter((s) => s.kelas === currentClass);

  const handleExportPdf = () => {
    const titleLines = [
      `JADWAL PELAJARAN KELAS ${currentClass.toUpperCase()}`,
      `TAHUN AJARAN ${schoolProfile.tahunAjaran}`,
    ];

    const headers = ['Hari', 'Jam ke-', 'Alokasi Waktu', 'Mata Pelajaran / Kegiatan'];
    const rows: any[] = [];

    const columnStyles: Record<number, object> = {
      0: { cellWidth: 28, halign: 'center', valign: 'top' },
      1: { cellWidth: 22, halign: 'center', valign: 'middle' },
      2: { cellWidth: 38, halign: 'center', valign: 'middle' },
      3: { cellWidth: 100, halign: 'left', valign: 'middle' },
    };

    daysList.forEach((dayName) => {
      const dayItems = mySchedules.filter((s) => s.day === dayName);
      if (dayItems.length > 0) {
        dayItems.forEach((s, idx) => {
          const sbj = (subjects || []).find((sub) => sub.code === s.subjectCode);
          const mapelVal = sbj ? sbj.name : s.activityName || '-';
          const jamKe = idx + 1;

          if (idx === 0) {
            rows.push([
              {
                content: dayName,
                rowSpan: dayItems.length,
                styles: { valign: 'top', halign: 'center', fontStyle: 'bold' },
              },
              jamKe,
              s.timeSlot,
              mapelVal,
            ]);
          } else {
            rows.push([
              jamKe,
              s.timeSlot,
              mapelVal,
            ]);
          }
        });
      }
    });

    exportToPdf({
      filename: `Jadwal_Pelajaran_${currentClass.replace(' ', '_')}`,
      titleLines,
      tableHeaders: headers,
      tableRows: rows,
      columnStyles,
      schoolProfile,
      printDate,
      teacherName: currentUser?.name,
      teacherNip: currentUser?.nip,
    });
  };

  const handleExportExcel = () => {
    const headerLines = [
      `JADWAL PELAJARAN KELAS ${currentClass}`,
      `TAHUN AJARAN ${schoolProfile.tahunAjaran}`,
    ];

    const headers = ['Hari', 'Jam ke-', 'Alokasi Waktu', 'Mata Pelajaran / Kegiatan'];
    const rows: any[] = [];

    daysList.forEach((dayName) => {
      const dayItems = mySchedules.filter((s) => s.day === dayName);
      if (dayItems.length > 0) {
        dayItems.forEach((s, idx) => {
          const sbj = (subjects || []).find((sub) => sub.code === s.subjectCode);
          const mapelVal = sbj ? sbj.name : s.activityName || '-';
          rows.push([
            idx === 0 ? dayName : '',
            idx + 1,
            s.timeSlot,
            mapelVal,
          ]);
        });
      }
    });

    exportToExcel(
      `Jadwal_Pelajaran_${currentClass.replace(' ', '_')}`,
      'Jadwal',
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
              <CalendarDays className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-800">Jadwal Pelajaran ({currentClass})</h2>
              <p className="text-xs text-slate-500">
                Atur alokasi jam tatap muka harian, mata pelajaran, serta kegiatan ekstrakurikuler
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
              onClick={() => setShowTimeAllocModal(true)}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-800 border border-indigo-200 font-semibold text-xs rounded-xl transition-colors shadow-2xs"
            >
              <Clock className="w-4 h-4 text-indigo-600" />
              Pengaturan Alokasi Waktu
            </button>

            <button
              onClick={() => {
                setEditingId(null);
                setShowAddForm(!showAddForm);
              }}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-emerald-700 hover:bg-emerald-800 text-white font-semibold text-xs rounded-xl transition-colors shadow-sm"
            >
              <Plus className="w-4 h-4" />
              Tambah Jadwal
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
          <form onSubmit={handleSubmit} className="mt-4 p-4 bg-indigo-50/50 border border-indigo-200 rounded-2xl space-y-4">
            <h3 className="text-xs font-bold text-indigo-900 uppercase tracking-wider">
              {editingId ? 'Edit Jam Pelajaran' : 'Tambah Jam Pelajaran Baru'}
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-1">Hari</label>
                <select
                  name="day"
                  value={formData.day}
                  onChange={handleInputChange}
                  className="w-full px-3 py-1.5 text-xs border border-slate-200 rounded-lg bg-white"
                >
                  {daysList.map((d) => (
                    <option key={d} value={d}>
                      {d}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-[11px] font-semibold text-slate-700">Alokasi Waktu Jam</label>
                  <button
                    type="button"
                    onClick={() => setShowTimeAllocModal(true)}
                    className="text-[10px] text-indigo-600 hover:text-indigo-800 font-semibold underline cursor-pointer"
                  >
                    + Kelola Slot
                  </button>
                </div>
                <select
                  name="timeSlot"
                  value={formData.timeSlot}
                  onChange={handleInputChange}
                  className="w-full px-3 py-1.5 text-xs border border-slate-200 rounded-lg bg-white font-medium"
                  required
                >
                  {timeAllocations.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                  {formData.timeSlot && !timeAllocations.includes(formData.timeSlot) && (
                    <option value={formData.timeSlot}>{formData.timeSlot}</option>
                  )}
                </select>
              </div>


              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-1">Mata Pelajaran / Kegiatan</label>
                <select
                  name="subjectCode"
                  value={isCurrentLain ? 'LAIN' : formData.subjectCode}
                  onChange={handleInputChange}
                  className="w-full px-3 py-1.5 text-xs border border-slate-200 rounded-lg bg-white font-medium"
                >
                  <option value="">-- Pilih Mata Pelajaran --</option>
                  {subjects.map((s) => (
                    <option key={s.id} value={s.code}>
                      [{s.code}] {s.name}
                    </option>
                  ))}
                  <option value="LAIN">-- Kegiatan / Lainnya (Input Manual) --</option>
                </select>
              </div>
            </div>

            {isCurrentLain && (
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl space-y-1">
                <label className="block text-xs font-bold text-amber-900">
                  Nama Kegiatan Khusus / Manual <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  name="activityName"
                  value={formData.activityName || ''}
                  onChange={handleInputChange}
                  placeholder="misal: Pembiasaan Sholat Dhuha / Upacara Bendera / Istirahat"
                  className="w-full px-3 py-1.5 text-xs border border-amber-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-amber-500 font-medium text-slate-800"
                  autoFocus
                  required
                />
                <p className="text-[10px] text-amber-700 font-medium">
                  Form ini otomatis aktif untuk mengisi nama kegiatan non-mapel.
                </p>
              </div>
            )}

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
                className="px-4 py-1.5 bg-indigo-800 hover:bg-indigo-900 text-white font-semibold text-xs rounded-lg shadow-sm"
              >
                {editingId ? 'Simpan Perubahan' : 'Simpan Jadwal'}
              </button>
            </div>
          </form>
        )}
      </div>

      {/* Days Tabs / Grid Display */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {daysList.map((dayName) => {
          const dayItems = mySchedules.filter((s) => s.day === dayName);

          return (
            <div key={dayName} className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs">
              <div className="flex items-center justify-between pb-2 mb-3 border-b border-slate-100">
                <h3 className="font-extrabold text-slate-800 text-sm">{dayName}</h3>
                <span className="px-2 py-0.5 bg-slate-100 text-slate-700 rounded text-[11px] font-semibold">
                  {dayItems.length} Jam
                </span>
              </div>

              <div className="space-y-2">
                {dayItems.length > 0 ? (
                  dayItems.map((item) => {
                    const sbj = (subjects || []).find((sub) => sub.code === item.subjectCode);
                    return (
                      <div
                        key={item.id}
                        className="p-3 bg-slate-50 border border-slate-100 rounded-xl flex items-center justify-between text-xs"
                      >
                        <div>
                          <p className="font-mono text-[10px] text-indigo-700 font-bold bg-indigo-50 px-1.5 py-0.5 rounded w-fit mb-1">
                            {item.timeSlot}
                          </p>
                          <p className="font-bold text-slate-800">
                            {item.activityName ? item.activityName : sbj?.name || item.subjectCode}
                          </p>
                        </div>
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => handleEdit(item)}
                            className="p-1 text-slate-400 hover:text-indigo-600 rounded"
                            title="Edit"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleDelete(item.id, item.activityName || sbj?.name || item.subjectCode)}
                            className="p-1 text-slate-400 hover:text-rose-600 rounded"
                            title="Hapus"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <p className="text-center py-6 text-slate-400 text-[11px] italic">
                    Belum ada jadwal untuk {dayName}.
                  </p>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Modal Pengaturan Alokasi Waktu */}
      {showTimeAllocModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-3xl p-6 max-w-md w-full space-y-5 shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-indigo-100 text-indigo-700 flex items-center justify-center">
                  <Clock className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-extrabold text-slate-900">Pengaturan Alokasi Waktu</h3>
                  <p className="text-[11px] text-slate-500">Kelola slot jam pelajaran untuk Jadwal & Jurnal</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowTimeAllocModal(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Form Tambah Slot Baru */}
            <form onSubmit={handleAddSlot} className="flex gap-2">
              <input
                type="text"
                value={newSlotInput}
                onChange={(e) => setNewSlotInput(e.target.value)}
                placeholder="Contoh: 13.00 - 13.30"
                className="flex-1 px-3 py-2 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              />
              <button
                type="submit"
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl transition-colors shrink-0"
              >
                + Tambah
              </button>
            </form>

            {/* List Slot Waktu */}
            <div className="max-h-60 overflow-y-auto space-y-2 pr-1">
              {timeAllocations.map((slot, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs"
                >
                  {editingSlotIdx === index ? (
                    <div className="flex items-center gap-2 w-full">
                      <input
                        type="text"
                        value={editingSlotValue}
                        onChange={(e) => setEditingSlotValue(e.target.value)}
                        className="flex-1 px-2.5 py-1 text-xs border border-indigo-400 rounded-lg bg-white focus:outline-none"
                        autoFocus
                      />
                      <button
                        type="button"
                        onClick={() => handleSaveSlotEdit(index)}
                        className="p-1 text-emerald-600 hover:bg-emerald-50 rounded"
                        title="Simpan"
                      >
                        <Check className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setEditingSlotIdx(null)}
                        className="p-1 text-slate-400 hover:bg-slate-200 rounded"
                        title="Batal"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ) : (
                    <>
                      <span className="font-mono font-bold text-slate-800">{slot}</span>
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => {
                            setEditingSlotIdx(index);
                            setEditingSlotValue(slot);
                          }}
                          className="p-1 text-slate-400 hover:text-indigo-600 rounded"
                          title="Edit"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteSlot(index)}
                          className="p-1 text-slate-400 hover:text-rose-600 rounded"
                          title="Hapus"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </>
                  )}
                </div>
              ))}
            </div>

            {/* Modal Footer */}
            <div className="flex items-center justify-between pt-3 border-t border-slate-100 text-xs">
              <button
                type="button"
                onClick={handleResetSlots}
                className="flex items-center gap-1 text-slate-500 hover:text-slate-800 font-medium"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                Reset ke Default
              </button>
              <button
                type="button"
                onClick={() => setShowTimeAllocModal(false)}
                className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-xl"
              >
                Selesai
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

