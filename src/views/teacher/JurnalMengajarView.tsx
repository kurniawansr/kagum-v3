import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { TeachingJournal } from '../../types';
import { BookOpen, Plus, Edit2, Trash2, Printer, FileSpreadsheet, FileText, Sparkles, CheckCircle2 } from 'lucide-react';
import { INDONESIAN_MONTH_NAMES, formatIndonesianDate, formatIndonesianDateWithDay } from '../../utils/calendarUtils';
import { exportToExcel, exportToPdf } from '../../utils/exportUtils';

export const JurnalMengajarView: React.FC = () => {
  const {
    teachingJournals: journals = [],
    setTeachingJournals: setJournals,
    schedules,
    subjects,
    attendanceRecords,
    students,
    currentUser,
    schoolProfile,
    timeAllocations = [],
  } = useApp();
  const currentClass = currentUser?.kelas || 'Kelas IA';
  const myStudents = students.filter((s) => s.kelas === currentClass);

  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());
  const [selectedYear, setSelectedYear] = useState(2026);
  const [monthFilter, setMonthFilter] = useState<number | 'all'>('all');
  const [printDate, setPrintDate] = useState(new Date().toISOString().split('T')[0]);
  const [showAddForm, setShowAddForm] = useState(false);
  const [showRecommendationModal, setShowRecommendationModal] = useState(false);
  const [recommendModalDate, setRecommendModalDate] = useState(new Date().toISOString().split('T')[0]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [message, setMessage] = useState('');

  const todayStr = new Date().toISOString().split('T')[0];

  // Helper to compute live attendance summary for a specific date
  const getLiveAttendanceSummary = (targetDate: string) => {
    const classStudents = students.filter((s) => s.kelas === currentClass);
    const targetRecs = attendanceRecords.filter(
      (r) => r.date === targetDate && (r.kelas === currentClass || classStudents.some((s) => s.id === r.studentId))
    );

    if (targetRecs.length > 0) {
      const h = targetRecs.filter((r) => r.status === 'Hadir').length;
      const s = targetRecs.filter((r) => r.status === 'Sakit').length;
      const i = targetRecs.filter((r) => r.status === 'Izin').length;
      const a = targetRecs.filter((r) => r.status === 'Alfa').length;
      return `Hadir: ${h}, Sakit: ${s}, Izin: ${i}, Alfa: ${a}`;
    }

    const totalStudents = classStudents.length > 0 ? classStudents.length : 28;
    return `Hadir: ${totalStudents}, Sakit: 0, Izin: 0, Alfa: 0 (Semua Hadir)`;
  };

  const defaultSubjectCode = subjects && subjects.length > 0 ? subjects[0].code : 'AQH';

  const [formData, setFormData] = useState<Omit<TeachingJournal, 'id' | 'kelas'>>({
    date: todayStr,
    timeSlot: timeAllocations[0] || '07.00 - 08.00',
    subjectCode: defaultSubjectCode,
    activityName: '',
    material: '',
    studentAttendanceInfo: getLiveAttendanceSummary(todayStr),
    notes: '',
  });


  // Auto pull attendance info when date or attendance records change
  React.useEffect(() => {
    const liveInfo = getLiveAttendanceSummary(formData.date);
    setFormData((prev) => (prev.studentAttendanceInfo === liveInfo ? prev : { ...prev, studentAttendanceInfo: liveInfo }));
  }, [formData.date, attendanceRecords, students, currentClass]);

  // Helper to get Indonesian day name from date string without UTC timezone offset bugs
  const getDayNameFromDate = (dateStr: string): string => {
    if (!dateStr) return 'Senin';
    const [y, m, d] = dateStr.split('-').map(Number);
    if (!y || !m || !d) return 'Senin';
    const dateObj = new Date(y, m - 1, d);
    const daysMap: Record<number, string> = {
      0: 'Minggu',
      1: 'Senin',
      2: 'Selasa',
      3: 'Rabu',
      4: 'Kamis',
      5: 'Jumat',
      6: 'Sabtu',
    };
    return daysMap[dateObj.getDay()] || 'Senin';
  };

  const handleApplySingleScheduleSlot = (sch: (typeof schedules)[0]) => {
    const sbj = (subjects || []).find((sub) => sub.code === sch.subjectCode);
    const mapelName = sbj ? sbj.name : sch.activityName || sch.subjectCode;
    const isLain = sch.subjectCode === 'LAIN' || (!sbj && !!sch.activityName);

    setFormData((prev) => ({
      ...prev,
      timeSlot: sch.timeSlot,
      subjectCode: isLain ? 'LAIN' : sch.subjectCode,
      activityName: isLain ? (sch.activityName || 'Kegiatan Khusus') : '',
      material: isLain ? (sch.activityName || 'Kegiatan Khusus') : `Materi ${mapelName}`,
    }));

    setMessage(`Slot ${sch.timeSlot} - ${mapelName} diterapkan ke formulir!`);
    setTimeout(() => setMessage(''), 3000);
  };

  const handleAutoRecommendForDate = (targetDate: string) => {
    const dayName = getDayNameFromDate(targetDate);
    const daySchedules = schedules.filter((s) => s.day === dayName && s.kelas === currentClass);

    if (daySchedules.length > 0) {
      const attInfo = getLiveAttendanceSummary(targetDate);
      const newEntries: TeachingJournal[] = daySchedules.map((sch, index) => {
        const sbj = (subjects || []).find((sub) => sub.code === sch.subjectCode);
        const mapelName = sbj ? sbj.name : sch.activityName || sch.subjectCode;
        return {
          id: `jrn-${Date.now()}-${index}`,
          kelas: currentClass,
          date: targetDate,
          timeSlot: sch.timeSlot,
          subjectCode: sch.subjectCode === 'LAIN' ? 'LAIN' : sch.subjectCode,
          activityName: sch.subjectCode === 'LAIN' ? sch.activityName : '',
          material: sch.subjectCode === 'LAIN' ? (sch.activityName || 'Kegiatan Khusus / Non-Mapel') : `Materi ${mapelName}`,
          studentAttendanceInfo: attInfo,
          notes: 'Pembelajaran berjalan lancar.',
        };
      });

      const existingFilter = journals.filter(
        (j) => !(j.kelas === currentClass && j.date === targetDate)
      );

      setJournals([...existingFilter, ...newEntries]);
      setMessage(`Berhasil membuat ${newEntries.length} jurnal mengajar otomatis sesuai jadwal hari ${dayName} (${formatIndonesianDate(targetDate)})!`);
      setTimeout(() => setMessage(''), 3500);
    } else {
      alert(`Tidak ada jadwal mengajar terdaftar pada hari ${dayName}.`);
    }
  };

  const handleAutoRecommend = () => {
    handleAutoRecommendForDate(formData.date);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    if (name === 'subjectCode') {
      setFormData((prev) => ({
        ...prev,
        subjectCode: value,
        activityName: value === 'LAIN' ? prev.activityName : '',
      }));
    } else {
      setFormData((prev) => ({ ...prev, [name]: value }));
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

    const payload: Omit<TeachingJournal, 'id' | 'kelas'> = {
      ...formData,
      subjectCode: isCurrentLain ? 'LAIN' : formData.subjectCode,
      activityName: isCurrentLain ? formData.activityName?.trim() : '',
    };

    if (editingId) {
      setJournals(journals.map((j) => (j.id === editingId ? { ...j, ...payload } : j)));
      setMessage('Jurnal mengajar berhasil diperbarui!');
      setEditingId(null);
    } else {
      const newJournal: TeachingJournal = {
        id: `jrn-${Date.now()}`,
        kelas: currentClass,
        ...payload,
      };
      setJournals([...journals, newJournal]);
      setMessage('Jurnal mengajar baru berhasil disimpan!');
    }

    setFormData({
      date: todayStr,
      timeSlot: '07.00 - 08.00',
      subjectCode: defaultSubjectCode,
      activityName: '',
      material: '',
      studentAttendanceInfo: getLiveAttendanceSummary(todayStr),
      notes: '',
    });
    setShowAddForm(false);
    setTimeout(() => setMessage(''), 3000);
  };

  const handleEdit = (jrn: TeachingJournal) => {
    setEditingId(jrn.id);
    const isLain = jrn.subjectCode === 'LAIN' || (!subjects.some((s) => s.code === jrn.subjectCode) && !!jrn.activityName);
    setFormData({
      date: jrn.date,
      timeSlot: jrn.timeSlot,
      subjectCode: isLain ? 'LAIN' : jrn.subjectCode,
      activityName: jrn.activityName || '',
      material: jrn.material || '',
      studentAttendanceInfo: jrn.studentAttendanceInfo || getLiveAttendanceSummary(jrn.date),
      notes: jrn.notes || '',
    });
    setShowAddForm(true);
    setTimeout(() => {
      window.scrollTo({ top: 150, behavior: 'smooth' });
    }, 50);
  };

  const handleDelete = (id: string) => {
    setJournals(journals.filter((j) => j.id !== id));
    if (editingId === id) {
      setEditingId(null);
      setShowAddForm(false);
    }
    setMessage('Jurnal mengajar berhasil dihapus.');
    setTimeout(() => setMessage(''), 3000);
  };

  const myJournals = journals.filter((j) => j.kelas === currentClass);

  const formatAttendanceShort = (str: string) => {
    if (!str) return '-';
    return str
      .replace(/Hadir:\s*/gi, 'H: ')
      .replace(/Sakit:\s*/gi, 'S: ')
      .replace(/Izin:\s*/gi, 'I: ')
      .replace(/Alfa:\s*/gi, 'A: ');
  };

  const handleExportPdfMonthly = () => {
    const targetMonth = monthFilter === 'all' ? selectedMonth : monthFilter;

    const targetJournals = myJournals.filter((j) => {
      if (!j.date) return false;
      const [yStr, mStr] = j.date.split('-');
      const m = parseInt(mStr, 10) - 1;
      const y = parseInt(yStr, 10);
      return m === targetMonth && y === selectedYear;
    });

    if (targetJournals.length === 0) {
      alert(`Tidak ada data jurnal mengajar untuk bulan ${INDONESIAN_MONTH_NAMES[targetMonth]} ${selectedYear}.`);
      return;
    }

    const titleLines = [
      'JURNAL MENGAJAR GURU (BULANAN)',
      `BULAN ${INDONESIAN_MONTH_NAMES[targetMonth].toUpperCase()} ${selectedYear}`,
      `KELAS ${currentClass.toUpperCase()} - SEMESTER ${schoolProfile.semester.toUpperCase()} TAHUN AJARAN ${schoolProfile.tahunAjaran}`,
    ];

    const headers = ['No', 'Tanggal', 'Waktu', 'Mata Pelajaran/Kegiatan', 'Materi Pembelajaran/Uraian Kegiatan', 'Kehadiran Siswa', 'Catatan/Keterangan'];
    
    // Group journals by date
    const groupedByDate: Record<string, TeachingJournal[]> = {};
    targetJournals.forEach((j) => {
      if (!groupedByDate[j.date]) groupedByDate[j.date] = [];
      groupedByDate[j.date].push(j);
    });

    const rows: any[] = [];
    let rowNumber = 1;

    const columnStyles: Record<number, object> = {
      0: { cellWidth: 10, halign: 'center', valign: 'top' },
      1: { cellWidth: 42, halign: 'center', valign: 'top' },
      2: { cellWidth: 26, halign: 'center', valign: 'top' },
      3: { cellWidth: 45, halign: 'left', valign: 'top' },
      4: { cellWidth: 80, halign: 'left', valign: 'top' },
      5: { cellWidth: 36, halign: 'center', valign: 'top' },
      6: { cellWidth: 38, halign: 'left', valign: 'top' },
    };

    Object.entries(groupedByDate).forEach(([dateStr, items]) => {
      const formattedDate = formatIndonesianDateWithDay(dateStr);
      const currentNo = rowNumber++;

      items.forEach((j, idx) => {
        const sbj = (subjects || []).find((s) => s.code === j.subjectCode);
        const liveAttendance = getLiveAttendanceSummary(j.date) || j.studentAttendanceInfo;
        const shortAttendance = formatAttendanceShort(liveAttendance);

        const mapelLabel = (j.subjectCode === 'LAIN' || (!sbj && j.activityName))
          ? (j.activityName || 'Kegiatan Khusus / Non-Mapel')
          : (sbj ? `${sbj.name} (${j.subjectCode})` : j.subjectCode);

        if (idx === 0) {
          rows.push([
            { content: currentNo, rowSpan: items.length, styles: { valign: 'top', halign: 'center' } },
            { content: formattedDate, rowSpan: items.length, styles: { valign: 'top', halign: 'center', fontStyle: 'bold' } },
            j.timeSlot,
            mapelLabel,
            j.material,
            shortAttendance,
            j.notes || '-',
          ]);
        } else {
          rows.push([
            j.timeSlot,
            mapelLabel,
            j.material,
            shortAttendance,
            j.notes || '-',
          ]);
        }
      });
    });

    exportToPdf({
      filename: `Jurnal_Mengajar_Bulanan_${INDONESIAN_MONTH_NAMES[targetMonth]}_${selectedYear}_${currentClass.replace(' ', '_')}`,
      titleLines,
      tableHeaders: headers,
      tableRows: rows,
      columnStyles,
      styles: { valign: 'top' },
      schoolProfile,
      printDate,
      teacherName: currentUser?.name,
      teacherNip: currentUser?.nip,
      orientation: 'landscape',
    });
  };

  const handleExportPdf = () => {
    const titleLines = [
      'JURNAL MENGAJAR GURU',
      `KELAS ${currentClass.toUpperCase()}`,
      `SEMESTER ${schoolProfile.semester.toUpperCase()} TAHUN AJARAN ${schoolProfile.tahunAjaran}`,
    ];

    const headers = ['No', 'Tanggal', 'Waktu', 'Mata Pelajaran/Kegiatan', 'Materi Pembelajaran/Uraian Kegiatan', 'Kehadiran Siswa', 'Catatan/Keterangan'];
    
    // Group journals by date
    const groupedByDate: Record<string, TeachingJournal[]> = {};
    myJournals.forEach((j) => {
      if (!groupedByDate[j.date]) groupedByDate[j.date] = [];
      groupedByDate[j.date].push(j);
    });

    const rows: any[] = [];
    let rowNumber = 1;

    const columnStyles: Record<number, object> = {
      0: { cellWidth: 10, halign: 'center', valign: 'top' },
      1: { cellWidth: 42, halign: 'center', valign: 'top' },
      2: { cellWidth: 26, halign: 'center', valign: 'top' },
      3: { cellWidth: 45, halign: 'left', valign: 'top' },
      4: { cellWidth: 80, halign: 'left', valign: 'top' },
      5: { cellWidth: 36, halign: 'center', valign: 'top' },
      6: { cellWidth: 38, halign: 'left', valign: 'top' },
    };

    Object.entries(groupedByDate).forEach(([dateStr, items]) => {
      const formattedDate = formatIndonesianDateWithDay(dateStr);
      const currentNo = rowNumber++;

      items.forEach((j, idx) => {
        const sbj = (subjects || []).find((s) => s.code === j.subjectCode);
        const liveAttendance = getLiveAttendanceSummary(j.date) || j.studentAttendanceInfo;
        const shortAttendance = formatAttendanceShort(liveAttendance);

        const mapelLabel = (j.subjectCode === 'LAIN' || (!sbj && j.activityName))
          ? (j.activityName || 'Kegiatan Khusus / Non-Mapel')
          : (sbj ? `${sbj.name} (${j.subjectCode})` : j.subjectCode);

        if (idx === 0) {
          rows.push([
            { content: currentNo, rowSpan: items.length, styles: { valign: 'top', halign: 'center' } },
            { content: formattedDate, rowSpan: items.length, styles: { valign: 'top', halign: 'center', fontStyle: 'bold' } },
            j.timeSlot,
            mapelLabel,
            j.material,
            shortAttendance,
            j.notes || '-',
          ]);
        } else {
          rows.push([
            j.timeSlot,
            mapelLabel,
            j.material,
            shortAttendance,
            j.notes || '-',
          ]);
        }
      });
    });

    exportToPdf({
      filename: `Jurnal_Mengajar_${currentClass.replace(' ', '_')}`,
      titleLines,
      tableHeaders: headers,
      tableRows: rows,
      columnStyles,
      styles: { valign: 'top' },
      schoolProfile,
      printDate,
      teacherName: currentUser?.name,
      teacherNip: currentUser?.nip,
      orientation: 'landscape',
    });
  };

  const handleExportExcel = () => {
    const headerLines = [
      'JURNAL MENGAJAR GURU',
      '',
      `Kelas/Semester : ${currentClass} / ${schoolProfile.semester}`,
      `Tahun Ajaran   : ${schoolProfile.tahunAjaran}`,
    ];

    const headers = ['No', 'Tanggal', 'Waktu', 'Mata Pelajaran', 'Materi Pembelajaran', 'Kehadiran Siswa', 'Catatan/Keterangan'];
    const rows = myJournals.map((j, idx) => {
      const sbj = (subjects || []).find((s) => s.code === j.subjectCode);
      const liveAttendance = getLiveAttendanceSummary(j.date) || j.studentAttendanceInfo;
      return [
        idx + 1,
        formatIndonesianDateWithDay(j.date),
        j.timeSlot,
        sbj ? `${sbj.name} (${j.subjectCode})` : j.subjectCode,
        j.material,
        liveAttendance,
        j.notes || '-',
      ];
    });

    exportToExcel(
      `Jurnal_Mengajar_${currentClass.replace(' ', '_')}`,
      'Jurnal Mengajar',
      headerLines,
      headers,
      rows
    );
  };

  const displayedJournals = myJournals.filter((j) => {
    if (monthFilter === 'all') return true;
    if (!j.date) return false;
    const [yStr, mStr] = j.date.split('-');
    const m = parseInt(mStr, 10) - 1;
    const y = parseInt(yStr, 10);
    return m === monthFilter && y === selectedYear;
  });

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-teal-50 text-teal-700 flex items-center justify-center font-bold">
              <BookOpen className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-800">Jurnal Mengajar Guru ({currentClass})</h2>
              <p className="text-xs text-slate-500">
                Pencatatan kegiatan pembelajaran harian, materi, dan catatan refleksi guru
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Month & Year Selection for Monthly Journal Printing */}
            <div className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-50 border border-indigo-200 rounded-xl text-xs">
              <span className="font-semibold text-indigo-900">Filter Bulan:</span>
              <select
                value={monthFilter}
                onChange={(e) => {
                  const val = e.target.value === 'all' ? 'all' : Number(e.target.value);
                  setMonthFilter(val);
                  if (val !== 'all') setSelectedMonth(val);
                }}
                className="bg-transparent font-bold text-indigo-950 focus:outline-none cursor-pointer"
              >
                <option value="all">Semua Bulan</option>
                {INDONESIAN_MONTH_NAMES.map((m, idx) => (
                  <option key={idx} value={idx}>
                    {m}
                  </option>
                ))}
              </select>
              <span className="text-indigo-300">|</span>
              <select
                value={selectedYear}
                onChange={(e) => setSelectedYear(Number(e.target.value))}
                className="bg-transparent font-bold text-indigo-950 focus:outline-none cursor-pointer"
              >
                <option value={2025}>2025</option>
                <option value={2026}>2026</option>
                <option value={2027}>2027</option>
              </select>
            </div>

            <button
              onClick={handleExportPdfMonthly}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-indigo-700 hover:bg-indigo-800 text-white font-bold text-xs rounded-xl transition-colors shadow-xs cursor-pointer"
              title="Cetak Jurnal Mengajar Bulanan (PDF)"
            >
              <Printer className="w-4 h-4" />
              Cetak Jurnal Bulanan
            </button>

            <div className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 rounded-xl text-xs">
              <span className="font-medium text-slate-600">Tgl Cetak:</span>
              <input
                type="date"
                value={printDate}
                onChange={(e) => setPrintDate(e.target.value)}
                className="bg-transparent font-semibold text-slate-800 focus:outline-none"
              />
            </div>

            <button
              onClick={() => setShowRecommendationModal(true)}
              className="flex items-center gap-1.5 px-3 py-2 bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs rounded-xl transition-colors shadow-2xs cursor-pointer"
              title="Rekomendasi Tambah Jurnal Berdasarkan Jadwal Pelajaran Tanggal Terpilih"
            >
              <Sparkles className="w-4 h-4 text-amber-100" />
              Rekomendasi Jadwal
            </button>

            <button
              onClick={() => {
                setEditingId(null);
                setShowAddForm(!showAddForm);
              }}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-emerald-700 hover:bg-emerald-800 text-white font-semibold text-xs rounded-xl transition-colors shadow-sm"
            >
              <Plus className="w-4 h-4" />
              Tambah Jurnal
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
              Cetak Semua (PDF)
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
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold text-teal-900 uppercase tracking-wider">
                {editingId ? 'Edit Jurnal Mengajar' : 'Input Jurnal Mengajar Harian'}
              </h3>
              <button
                type="button"
                onClick={handleAutoRecommend}
                className="flex items-center gap-1.5 px-3 py-1 bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs rounded-lg shadow-xs transition-colors"
              >
                <Sparkles className="w-3.5 h-3.5" />
                Rekomendasi Isi Otomatis
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-1">Tanggal Mengajar</label>
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
                <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                  Waktu / Alokasi Jam Pelajaran
                </label>
                <input
                  type="text"
                  name="timeSlot"
                  value={formData.timeSlot}
                  onChange={handleInputChange}
                  list="timeSlotSuggestions"
                  placeholder="Contoh: 07.00 - 08.00 / 2 JP / 2 Jam Pelajaran"
                  className="w-full px-3 py-1.5 text-xs border border-slate-200 rounded-lg bg-white font-medium text-slate-800"
                  required
                />
                <datalist id="timeSlotSuggestions">
                  {timeAllocations.map((t) => (
                    <option key={t} value={t} />
                  ))}
                  <option value="07.00 - 08.00 (2 JP)" />
                  <option value="08.00 - 09.00 (2 JP)" />
                  <option value="09.30 - 10.30 (2 JP)" />
                  <option value="2 JP (90 Menit)" />
                </datalist>
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

            {/* Live Recommendation Card for Selected Date */}
            {(() => {
              const activeDayName = getDayNameFromDate(formData.date);
              const activeDaySchedules = schedules.filter((s) => s.day === activeDayName && s.kelas === currentClass);
              return (
                <div className="p-3 bg-amber-50/90 border border-amber-200 rounded-xl space-y-2">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <Sparkles className="w-4 h-4 text-amber-600 shrink-0" />
                      <div>
                        <h4 className="text-xs font-bold text-amber-950">
                          Rekomendasi Jadwal Hari {activeDayName} ({formatIndonesianDate(formData.date)})
                        </h4>
                        <p className="text-[11px] text-amber-800 font-medium">
                          {activeDaySchedules.length > 0
                            ? `Ditemukan ${activeDaySchedules.length} slot jadwal pelajaran untuk ${currentClass}:`
                            : `Belum ada jadwal pelajaran terdaftar pada hari ${activeDayName}.`}
                        </p>
                      </div>
                    </div>
                    {activeDaySchedules.length > 0 && (
                      <button
                        type="button"
                        onClick={() => handleAutoRecommendForDate(formData.date)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs rounded-lg transition-colors shadow-xs shrink-0 cursor-pointer"
                        title="Generate Semua Jurnal Tanggal Ini"
                      >
                        <Sparkles className="w-3.5 h-3.5" />
                        Generate Semua ({activeDaySchedules.length} Mapel)
                      </button>
                    )}
                  </div>

                  {activeDaySchedules.length > 0 && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2 pt-1">
                      {activeDaySchedules.map((sch) => {
                        const sbj = (subjects || []).find((sub) => sub.code === sch.subjectCode);
                        const mapelName = sbj ? sbj.name : sch.activityName || sch.subjectCode;
                        return (
                          <div
                            key={sch.id}
                            className="flex items-center justify-between p-2 bg-white border border-amber-200 rounded-lg text-xs shadow-2xs hover:border-amber-400 transition-colors"
                          >
                            <div className="min-w-0 pr-2">
                              <p className="font-bold text-slate-800 truncate">{mapelName}</p>
                              <p className="text-[10px] font-mono text-amber-900 font-semibold">{sch.timeSlot}</p>
                            </div>
                            <button
                              type="button"
                              onClick={() => handleApplySingleScheduleSlot(sch)}
                              className="px-2 py-1 bg-amber-100 hover:bg-amber-200 text-amber-900 font-bold text-[10px] rounded transition-colors whitespace-nowrap cursor-pointer"
                            >
                              Pilih Slot
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })()}

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
                  placeholder="misal: Pembiasaan Sholat Dhuha / Upacara Bendera / Istirahat / Senam"
                  className="w-full px-3 py-1.5 text-xs border border-amber-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-amber-500 font-medium text-slate-800"
                  autoFocus
                  required
                />
                <p className="text-[10px] text-amber-700 font-medium">
                  Isi nama kegiatan non-mapel untuk jurnal harian.
                </p>
              </div>
            )}

            <div>
              <label className="block text-[11px] font-semibold text-slate-700 mb-1">Materi Pembelajaran</label>
              <input
                type="text"
                name="material"
                value={formData.material}
                onChange={handleInputChange}
                placeholder="Penjelasan Hukum Mim Mati dan Bacaan Surah At-Tin"
                className="w-full px-3 py-1.5 text-xs border border-slate-200 rounded-lg bg-white"
                required
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-[11px] font-semibold text-slate-700">
                    Kehadiran Siswa
                  </label>
                  <span className="text-[10px] text-teal-800 font-bold bg-teal-100/90 px-2 py-0.5 rounded-full flex items-center gap-1 border border-teal-200">
                    <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                    Terintegrasi Absensi Siswa
                  </span>
                </div>
                <input
                  type="text"
                  name="studentAttendanceInfo"
                  value={formData.studentAttendanceInfo}
                  readOnly
                  className="w-full px-3 py-1.5 text-xs border border-teal-300 rounded-lg bg-teal-50/70 font-bold text-teal-900 cursor-not-allowed shadow-xs"
                />
                <p className="text-[10px] text-slate-500 mt-1">
                  * Otomatis dihitung berdasarkan data <strong>Absensi Siswa</strong> pada tanggal ini ({formData.date}).
                </p>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-1">Catatan Pembelajaran / Keterangan</label>
                <input
                  type="text"
                  name="notes"
                  value={formData.notes || ''}
                  onChange={handleInputChange}
                  placeholder="Siswa antusias dan menyelesaikan tugas dengan baik"
                  className="w-full px-3 py-1.5 text-xs border border-slate-200 rounded-lg bg-white"
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
                {editingId ? 'Simpan Perubahan' : 'Simpan Jurnal'}
              </button>
            </div>
          </form>
        )}
      </div>

      {/* Journal Table */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs overflow-x-auto">
        <table className="w-full text-left text-xs border-collapse">
          <thead>
            <tr className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200">
              <th className="p-3 w-10 text-center">No</th>
              <th className="p-3">Tanggal & Waktu</th>
              <th className="p-3">Mata Pelajaran</th>
              <th className="p-3">Materi Pembelajaran</th>
              <th className="p-3">Kehadiran Siswa</th>
              <th className="p-3">Catatan / Keterangan</th>
              <th className="p-3 text-center">Aksi</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {displayedJournals.length === 0 ? (
              <tr>
                <td colSpan={7} className="p-8 text-center text-slate-400 font-medium">
                  Belum ada jurnal mengajar untuk periode atau filter yang dipilih.
                </td>
              </tr>
            ) : (
              displayedJournals.map((jrn, idx) => {
                const sbj = (subjects || []).find((s) => s.code === jrn.subjectCode);
                const attendanceSummary = getLiveAttendanceSummary(jrn.date) || jrn.studentAttendanceInfo;
                return (
                  <tr key={jrn.id} className="hover:bg-slate-50 transition-colors">
                    <td className="p-3 text-center text-slate-500 font-medium">{idx + 1}</td>
                    <td className="p-3">
                      <p className="font-bold text-slate-800">{formatIndonesianDate(jrn.date)}</p>
                      <p className="text-[11px] font-mono text-emerald-800 font-semibold">{jrn.timeSlot}</p>
                    </td>
                    <td className="p-3 font-semibold text-slate-700">
                      {jrn.subjectCode === 'LAIN' || (!sbj && jrn.activityName) ? (
                        <span className="inline-flex items-center gap-1 text-amber-900 bg-amber-50 px-2 py-0.5 rounded border border-amber-200 text-xs font-bold">
                          {jrn.activityName || 'Kegiatan / Lainnya'}
                        </span>
                      ) : (
                        `${sbj ? sbj.name : jrn.subjectCode} (${jrn.subjectCode})`
                      )}
                    </td>
                    <td className="p-3 text-slate-800 font-medium">{jrn.material}</td>
                    <td className="p-3 font-semibold text-teal-800">
                      <div className="flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-teal-500 shrink-0"></span>
                        <span>{attendanceSummary}</span>
                      </div>
                    </td>
                    <td className="p-3 text-slate-600">{jrn.notes || '-'}</td>
                    <td className="p-3 text-center">
                      <div className="inline-flex items-center gap-1">
                        <button
                          onClick={() => handleEdit(jrn)}
                          className="p-1.5 text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                          title="Edit Jurnal"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDelete(jrn.id)}
                          className="p-1.5 text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                          title="Hapus Jurnal"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Recommendation Modal */}
      {showRecommendationModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl border border-slate-200 max-w-lg w-full p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-amber-100 text-amber-800 rounded-xl">
                  <Sparkles className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-800">Rekomendasi Jurnal Berdasarkan Jadwal</h3>
                  <p className="text-xs text-slate-500">Pilih tanggal untuk melihat & membuat jurnal harian sesuai jadwal</p>
                </div>
              </div>
              <button
                onClick={() => setShowRecommendationModal(false)}
                className="text-slate-400 hover:text-slate-600 font-bold text-lg p-1 rounded-lg hover:bg-slate-100"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Pilih Tanggal Mengajar:</label>
                <input
                  type="date"
                  value={recommendModalDate}
                  onChange={(e) => setRecommendModalDate(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl bg-slate-50 font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>

              {(() => {
                const dayName = getDayNameFromDate(recommendModalDate);
                const daySchedules = schedules.filter((s) => s.day === dayName && s.kelas === currentClass);
                return (
                  <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-amber-950">
                        Hari {dayName}, {formatIndonesianDate(recommendModalDate)}
                      </span>
                      <span className="text-[10px] font-bold text-amber-800 bg-amber-100 px-2 py-0.5 rounded-full">
                        {daySchedules.length} Mapel Terdaftar
                      </span>
                    </div>

                    {daySchedules.length > 0 ? (
                      <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                        {daySchedules.map((sch) => {
                          const sbj = (subjects || []).find((sub) => sub.code === sch.subjectCode);
                          const mapelName = sbj ? sbj.name : sch.activityName || sch.subjectCode;
                          return (
                            <div
                              key={sch.id}
                              className="p-2.5 bg-white border border-amber-200 rounded-xl flex items-center justify-between text-xs shadow-2xs"
                            >
                              <div>
                                <p className="font-bold text-slate-800">{mapelName}</p>
                                <p className="text-[10px] font-mono text-emerald-800 font-semibold">{sch.timeSlot}</p>
                              </div>
                              <button
                                onClick={() => {
                                  setFormData({
                                    date: recommendModalDate,
                                    timeSlot: sch.timeSlot,
                                    subjectCode: sch.subjectCode === 'LAIN' ? 'LAIN' : sch.subjectCode,
                                    activityName: sch.subjectCode === 'LAIN' ? sch.activityName || 'Kegiatan Khusus' : '',
                                    material: sch.subjectCode === 'LAIN' ? (sch.activityName || 'Kegiatan Khusus') : `Materi ${mapelName}`,
                                    studentAttendanceInfo: getLiveAttendanceSummary(recommendModalDate),
                                    notes: '',
                                  });
                                  setShowRecommendationModal(false);
                                  setShowAddForm(true);
                                  setMessage(`Slot ${mapelName} diterapkan pada formulir!`);
                                }}
                                className="px-2.5 py-1 bg-teal-50 hover:bg-teal-100 text-teal-800 border border-teal-200 font-bold text-[11px] rounded-lg transition-colors cursor-pointer"
                              >
                                Gunakan
                              </button>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <p className="text-xs text-amber-800 text-center py-4">
                        Tidak ada jadwal pelajaran terdaftar pada hari <strong>{dayName}</strong> untuk {currentClass}.
                      </p>
                    )}

                    {daySchedules.length > 0 && (
                      <div className="pt-2 border-t border-amber-200/60 flex justify-end">
                        <button
                          onClick={() => {
                            handleAutoRecommendForDate(recommendModalDate);
                            setShowRecommendationModal(false);
                          }}
                          className="w-full flex items-center justify-center gap-1.5 py-2 px-4 bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs rounded-xl transition-colors shadow-xs cursor-pointer"
                        >
                          <Sparkles className="w-4 h-4" />
                          Generate Semua Jurnal Tanggal Ini ({daySchedules.length} Mapel)
                        </button>
                      </div>
                    )}
                  </div>
                );
              })()}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
