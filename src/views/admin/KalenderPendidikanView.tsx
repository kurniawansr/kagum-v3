import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { CalendarEvent } from '../../types';
import {
  calculateMonthEfficiency,
  INDONESIAN_MONTH_NAMES,
  INDONESIAN_DAY_NAMES,
  formatIndonesianDate,
  formatIndonesianDateRange,
  isDateInEventRange,
} from '../../utils/calendarUtils';
import { exportToExcel, exportToPdf } from '../../utils/exportUtils';
import {
  Calendar as CalendarIcon,
  Plus,
  Trash2,
  Printer,
  FileSpreadsheet,
  FileText,
  CheckCircle2,
  Pencil,
  X,
} from 'lucide-react';

export const KalenderPendidikanView: React.FC = () => {
  const { calendarEvents, setCalendarEvents, schoolProfile } = useApp();
  const [printDate, setPrintDate] = useState(new Date().toISOString().split('T')[0]);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingEventId, setEditingEventId] = useState<string | null>(null);
  const [message, setMessage] = useState('');

  const todayStr = new Date().toISOString().split('T')[0];
  const [eventForm, setEventForm] = useState<{
    startDate: string;
    endDate: string;
    type: 'libur' | 'agenda' | 'kegiatan';
    title: string;
    description: string;
  }>({
    startDate: todayStr,
    endDate: todayStr,
    type: 'libur',
    title: '',
    description: '',
  });

  // Academic year months (July 2026 -> June 2027)
  const baseYear = parseInt(schoolProfile.tahunAjaran.split('/')[0], 10) || 2026;
  const academicMonths = [
    { year: baseYear, monthIndex: 6 }, // July
    { year: baseYear, monthIndex: 7 }, // August
    { year: baseYear, monthIndex: 8 }, // September
    { year: baseYear, monthIndex: 9 }, // October
    { year: baseYear, monthIndex: 10 }, // November
    { year: baseYear, monthIndex: 11 }, // December
    { year: baseYear + 1, monthIndex: 0 }, // January
    { year: baseYear + 1, monthIndex: 1 }, // February
    { year: baseYear + 1, monthIndex: 2 }, // March
    { year: baseYear + 1, monthIndex: 3 }, // April
    { year: baseYear + 1, monthIndex: 4 }, // May
    { year: baseYear + 1, monthIndex: 5 }, // June
  ];

  // All events sorted chronologically by date ("tanggal muda" / earliest date first)
  const sortedEvents = [...(calendarEvents || [])].sort((a, b) => {
    if (a.date !== b.date) return a.date.localeCompare(b.date);
    const aEnd = a.endDate || a.date;
    const bEnd = b.endDate || b.date;
    return aEnd.localeCompare(bEnd);
  });

  const handleSaveEvent = (e: React.FormEvent) => {
    e.preventDefault();
    const finalEndDate =
      eventForm.endDate && eventForm.endDate >= eventForm.startDate
        ? eventForm.endDate
        : eventForm.startDate;

    if (editingEventId) {
      setCalendarEvents((prev) =>
        prev.map((evt) =>
          evt.id === editingEventId
            ? {
                ...evt,
                date: eventForm.startDate,
                endDate: finalEndDate,
                type: eventForm.type,
                title: eventForm.title,
                description: eventForm.description,
              }
            : evt
        )
      );
      setMessage('Agenda/Libur berhasil diperbarui!');
    } else {
      const newEvt: CalendarEvent = {
        id: `evt-${Date.now()}`,
        date: eventForm.startDate,
        endDate: finalEndDate,
        type: eventForm.type,
        title: eventForm.title,
        description: eventForm.description,
      };
      setCalendarEvents((prev) => [...prev, newEvt]);
      setMessage('Agenda/Libur berhasil ditambahkan ke kalender!');
    }

    setEditingEventId(null);
    setEventForm({
      startDate: new Date().toISOString().split('T')[0],
      endDate: new Date().toISOString().split('T')[0],
      type: 'libur',
      title: '',
      description: '',
    });
    setShowAddForm(false);
    setTimeout(() => setMessage(''), 3000);
  };

  const handleStartEdit = (evt: CalendarEvent) => {
    setEditingEventId(evt.id);
    setEventForm({
      startDate: evt.date,
      endDate: evt.endDate || evt.date,
      type: evt.type,
      title: evt.title,
      description: evt.description || '',
    });
    setShowAddForm(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleCancelForm = () => {
    setEditingEventId(null);
    const curToday = new Date().toISOString().split('T')[0];
    setEventForm({
      startDate: curToday,
      endDate: curToday,
      type: 'libur',
      title: '',
      description: '',
    });
    setShowAddForm(false);
  };

  const handleDeleteEvent = (id: string, title?: string) => {
    if (!id) return;
    setCalendarEvents((prev) => (prev || []).filter((e) => e.id !== id));
    if (editingEventId === id) {
      handleCancelForm();
    }
    setMessage(`Agenda/Libur "${title || 'tersebut'}" berhasil dihapus.`);
    setTimeout(() => setMessage(''), 3000);
  };

  // Export PDF
  const handleExportPdf = () => {
    const titleLines = [
      'KALENDER PENDIDIKAN MADRASAH',
      `TAHUN AJARAN ${schoolProfile.tahunAjaran.toUpperCase()}`,
    ];

    const headers = ['No', 'Bulan', 'Total Hari', 'Minggu', 'Hari Libur', 'Agenda/Kegiatan', 'Hari Efektif'];
    const rows = academicMonths.map((m, idx) => {
      const eff = calculateMonthEfficiency(m.year, m.monthIndex, calendarEvents);
      return [
        idx + 1,
        `${eff.monthName} ${eff.year}`,
        eff.totalDays,
        eff.sundaysCount,
        eff.holidaysCount,
        eff.agendasCount,
        eff.effectiveDays,
      ];
    });

    exportToPdf({
      filename: `Kalender_Pendidikan_${schoolProfile.tahunAjaran.replace('/', '_')}`,
      titleLines,
      tableHeaders: headers,
      tableRows: rows,
      schoolProfile,
      printDate,
      orientation: 'portrait',
    });
  };

  // Export Excel
  const handleExportExcel = () => {
    const headerLines = [
      'KALENDER PENDIDIKAN MADRASAH',
      `TAHUN AJARAN ${schoolProfile.tahunAjaran}`,
    ];

    const headers = ['No', 'Bulan', 'Total Hari', 'Minggu', 'Hari Libur', 'Agenda/Kegiatan', 'Hari Efektif'];
    const rows = academicMonths.map((m, idx) => {
      const eff = calculateMonthEfficiency(m.year, m.monthIndex, calendarEvents);
      return [
        idx + 1,
        `${eff.monthName} ${eff.year}`,
        eff.totalDays,
        eff.sundaysCount,
        eff.holidaysCount,
        eff.agendasCount,
        eff.effectiveDays,
      ];
    });

    exportToExcel(
      `Kalender_Pendidikan_${schoolProfile.tahunAjaran.replace('/', '_')}`,
      'Kalender',
      headerLines,
      headers,
      rows
    );
  };

  return (
    <div className="space-y-6">
      {/* Top Banner & Action Controls */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center font-bold">
              <CalendarIcon className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-800">Kalender Pendidikan Madrasah</h2>
              <p className="text-xs text-slate-500">
                Tahun Ajaran {schoolProfile.tahunAjaran} • Perhitungan Otomatis Hari Efektif Belajar
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 rounded-xl text-xs">
              <Printer className="w-3.5 h-3.5 text-slate-500" />
              <span className="font-medium text-slate-600">Tgl Cetak:</span>
              <input
                type="date"
                value={printDate}
                onChange={(e) => setPrintDate(e.target.value)}
                className="bg-transparent font-semibold text-slate-800 focus:outline-none"
              />
            </div>

            <button
              type="button"
              onClick={() => {
                if (showAddForm && !editingEventId) {
                  handleCancelForm();
                } else {
                  setEditingEventId(null);
                  const curToday = new Date().toISOString().split('T')[0];
                  setEventForm({
                    startDate: curToday,
                    endDate: curToday,
                    type: 'libur',
                    title: '',
                    description: '',
                  });
                  setShowAddForm(true);
                }
              }}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-emerald-700 hover:bg-emerald-800 text-white font-semibold text-xs rounded-xl transition-colors shadow-sm cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              Tambah Agenda/Libur
            </button>

            <button
              type="button"
              onClick={handleExportExcel}
              className="flex items-center gap-1.5 px-3 py-2 bg-teal-50 hover:bg-teal-100 text-teal-800 border border-teal-200 font-semibold text-xs rounded-xl transition-colors cursor-pointer"
            >
              <FileSpreadsheet className="w-4 h-4 text-teal-600" />
              Excel
            </button>

            <button
              type="button"
              onClick={handleExportPdf}
              className="flex items-center gap-1.5 px-3 py-2 bg-rose-50 hover:bg-rose-100 text-rose-800 border border-rose-200 font-semibold text-xs rounded-xl transition-colors cursor-pointer"
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

        {/* Add / Edit Event Form Modal / Expandable */}
        {showAddForm && (
          <form onSubmit={handleSaveEvent} className="mt-4 p-4 bg-amber-50/60 border border-amber-200 rounded-2xl space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold text-amber-900 uppercase tracking-wider flex items-center gap-1.5">
                {editingEventId ? <Pencil className="w-3.5 h-3.5 text-amber-700" /> : <Plus className="w-3.5 h-3.5 text-amber-700" />}
                {editingEventId ? 'Edit Agenda / Hari Libur' : 'Input Agenda / Hari Libur Baru'}
              </h3>
              <button
                type="button"
                onClick={handleCancelForm}
                className="text-amber-800 hover:text-rose-600 p-1 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-1">Mulai Tanggal</label>
                <input
                  type="date"
                  value={eventForm.startDate}
                  onChange={(e) => {
                    const newStart = e.target.value;
                    setEventForm((prev) => ({
                      ...prev,
                      startDate: newStart,
                      endDate: prev.endDate < newStart ? newStart : prev.endDate,
                    }));
                  }}
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg bg-white"
                  required
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-1">Sampai Tanggal</label>
                <input
                  type="date"
                  value={eventForm.endDate}
                  min={eventForm.startDate}
                  onChange={(e) => setEventForm({ ...eventForm, endDate: e.target.value })}
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg bg-white"
                  required
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-1">Kategori</label>
                <select
                  value={eventForm.type}
                  onChange={(e) => setEventForm({ ...eventForm, type: e.target.value as any })}
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg bg-white"
                >
                  <option value="libur">Hari Libur (Nasional/Madrasah)</option>
                  <option value="agenda">Agenda Utama (Ujian/Orientasi)</option>
                  <option value="kegiatan">Kegiatan Khusus (Lomba/Rapat)</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-1">Judul Agenda/Libur</label>
                <input
                  type="text"
                  value={eventForm.title}
                  onChange={(e) => setEventForm({ ...eventForm, title: e.target.value })}
                  placeholder="Contoh: HUT RI ke-81"
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg bg-white"
                  required
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-1">Keterangan Tambahan</label>
                <input
                  type="text"
                  value={eventForm.description}
                  onChange={(e) => setEventForm({ ...eventForm, description: e.target.value })}
                  placeholder="Keterangan opsional..."
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg bg-white"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={handleCancelForm}
                className="px-3 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-700 font-semibold text-xs rounded-lg transition-colors cursor-pointer"
              >
                Batal
              </button>
              <button
                type="submit"
                className="px-4 py-1.5 bg-amber-700 hover:bg-amber-800 text-white font-semibold text-xs rounded-lg shadow-sm transition-colors cursor-pointer"
              >
                {editingEventId ? 'Update Agenda' : 'Simpan Agenda'}
              </button>
            </div>
          </form>
        )}
      </div>

      {/* Legend / Keterangan Warna */}
      <div className="flex flex-wrap items-center gap-4 text-xs font-semibold p-3 bg-white border border-slate-200 rounded-xl shadow-xs">
        <span className="text-slate-500 font-bold">Keterangan Warna:</span>
        <div className="flex items-center gap-1.5">
          <span className="w-3.5 h-3.5 rounded bg-rose-100 border border-rose-300 inline-block" />
          <span className="text-rose-800 font-bold">Hari Minggu</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-3.5 h-3.5 rounded bg-rose-500 inline-block" />
          <span className="text-rose-900 font-bold">Hari Libur (Nasional/Madrasah)</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-3.5 h-3.5 rounded bg-sky-200 border border-sky-300 inline-block" />
          <span className="text-sky-900 font-bold">Agenda Utama</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-3.5 h-3.5 rounded bg-emerald-100 border border-emerald-300 inline-block" />
          <span className="text-emerald-900 font-bold">Kegiatan Khusus</span>
        </div>
      </div>

      {/* 1 Academic Year 12-Month Calendar Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {academicMonths.map((m) => {
          const eff = calculateMonthEfficiency(m.year, m.monthIndex, calendarEvents);
          const firstDayOffset = new Date(m.year, m.monthIndex, 1).getDay();

          return (
            <div key={`${m.year}-${m.monthIndex}`} className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs flex flex-col justify-between">
              <div>
                {/* Month Title & Effective Days Badge */}
                <div className="flex items-center justify-between pb-2 mb-3 border-b border-slate-100">
                  <h3 className="font-extrabold text-slate-800 text-sm">
                    {eff.monthName} {eff.year}
                  </h3>
                  <span className="px-2.5 py-0.5 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-full font-bold text-[11px]">
                    Hari Efektif: {eff.effectiveDays} Hari
                  </span>
                </div>

                {/* Days Header */}
                <div className="grid grid-cols-7 gap-1 text-center font-bold text-[11px] text-slate-500 mb-1">
                  <span className="text-rose-600">Min</span>
                  <span>Sen</span>
                  <span>Sel</span>
                  <span>Rab</span>
                  <span>Kam</span>
                  <span>Jum</span>
                  <span>Sab</span>
                </div>

                {/* Days Grid */}
                <div className="grid grid-cols-7 gap-1 text-center text-xs">
                  {/* Empty cells before month start */}
                  {Array.from({ length: firstDayOffset }).map((_, idx) => (
                    <div key={`empty-${idx}`} className="h-7" />
                  ))}

                  {/* Day cells */}
                  {Array.from({ length: eff.totalDays }).map((_, dayIdx) => {
                    const dayNum = dayIdx + 1;
                    const dateStr = `${m.year}-${String(m.monthIndex + 1).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`;
                    const isSunday = (firstDayOffset + dayIdx) % 7 === 0;

                    const eventsOnDay = (calendarEvents || []).filter((e) => isDateInEventRange(dateStr, e));
                    const holidayEvent = eventsOnDay.find((e) => e.type === 'libur');
                    const agendaEvent = eventsOnDay.find((e) => e.type === 'agenda');
                    const kegiatanEvent = eventsOnDay.find((e) => e.type === 'kegiatan');

                    let cellStyle = 'bg-slate-50 text-slate-700 hover:bg-slate-100';
                    if (isSunday) {
                      cellStyle = 'bg-rose-100 text-rose-800 font-bold border border-rose-200/80';
                    } else if (holidayEvent) {
                      cellStyle = 'bg-rose-500 text-white font-bold shadow-xs';
                    } else if (agendaEvent) {
                      cellStyle = 'bg-sky-200 text-sky-950 font-bold shadow-xs border border-sky-300/80';
                    } else if (kegiatanEvent) {
                      cellStyle = 'bg-emerald-100 text-emerald-900 font-bold shadow-xs border border-emerald-300/80';
                    }

                    const firstEvt = holidayEvent || agendaEvent || kegiatanEvent;

                    return (
                      <div
                        key={`day-${dayNum}`}
                        title={firstEvt ? `${firstEvt.title}: ${firstEvt.description || ''}` : ''}
                        className={`h-7 flex items-center justify-center rounded-lg transition-colors cursor-default text-[11px] ${cellStyle}`}
                      >
                        {dayNum}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Event Details under Month */}
              <div className="mt-4 pt-3 border-t border-slate-100 text-xs">
                <p className="font-semibold text-slate-700 text-[11px] mb-1.5">
                  Keterangan Agenda / Libur:
                </p>
                {eff.eventsInMonth.length > 0 ? (
                  <ul className="space-y-1.5 max-h-36 overflow-y-auto pr-0.5">
                    {eff.eventsInMonth.map((evt) => (
                      <li
                        key={evt.id}
                        className="flex items-center justify-between gap-1 text-[11px] bg-slate-50 hover:bg-slate-100/80 p-1.5 rounded-lg border border-slate-200/70 transition-colors"
                      >
                        <div className="min-w-0 flex-1 pr-1">
                          <span className="font-semibold text-slate-800 break-words leading-tight block">
                            <strong className={evt.type === 'libur' ? 'text-rose-600 font-extrabold' : evt.type === 'agenda' ? 'text-sky-700 font-extrabold' : 'text-emerald-700 font-extrabold'}>
                              [{formatIndonesianDateRange(evt.date, evt.endDate)}]
                            </strong>{' '}
                            {evt.title}
                          </span>
                          {evt.description && (
                            <span className="text-[10px] text-slate-500 block truncate mt-0.5">{evt.description}</span>
                          )}
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                          <button
                            type="button"
                            onClick={() => handleStartEdit(evt)}
                            className="p-1 text-slate-500 hover:text-amber-700 hover:bg-amber-100/70 rounded transition-colors cursor-pointer"
                            title="Edit Agenda / Libur"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteEvent(evt.id, evt.title)}
                            className="p-1 text-slate-500 hover:text-rose-600 hover:bg-rose-100/70 rounded transition-colors cursor-pointer"
                            title="Hapus Agenda / Libur"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-[11px] text-slate-400 italic">Tidak ada hari libur / agenda khusus.</p>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Admin Full Events Master Table sorted chronologically ("tanggal muda" first) */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider">
              Daftar Kelola Agenda & Hari Libur (Urut Tanggal Muda)
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Total {sortedEvents.length} entri agenda / hari libur terdaftar di sistem.
            </p>
          </div>
        </div>

        <div className="overflow-x-auto border border-slate-200 rounded-xl">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200">
              <tr>
                <th className="p-2.5 w-12 text-center">No</th>
                <th className="p-2.5 min-w-[160px] whitespace-nowrap">Mulai & Sampai Tanggal</th>
                <th className="p-2.5 min-w-[110px] whitespace-nowrap">Kategori</th>
                <th className="p-2.5">Judul Agenda / Hari Libur</th>
                <th className="p-2.5">Keterangan</th>
                <th className="p-2.5 w-24 text-center">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {sortedEvents.length > 0 ? (
                sortedEvents.map((evt, idx) => (
                  <tr key={evt.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="p-2.5 text-center text-slate-500 font-medium">{idx + 1}</td>
                    <td className="p-2.5 font-semibold text-slate-800 whitespace-nowrap">
                      {formatIndonesianDateRange(evt.date, evt.endDate)}
                    </td>
                    <td className="p-2.5 whitespace-nowrap">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                          evt.type === 'libur'
                            ? 'bg-rose-100 text-rose-800'
                            : evt.type === 'agenda'
                            ? 'bg-sky-100 text-sky-900 border border-sky-200'
                            : 'bg-emerald-100 text-emerald-900 border border-emerald-200'
                        }`}
                      >
                        {evt.type === 'libur' ? 'Hari Libur' : evt.type === 'agenda' ? 'Agenda Utama' : 'Kegiatan'}
                      </span>
                    </td>
                    <td className="p-2.5 font-bold text-slate-800">{evt.title}</td>
                    <td className="p-2.5 text-slate-600">{evt.description || '-'}</td>
                    <td className="p-2.5 text-center">
                      <div className="flex items-center justify-center gap-1">
                        <button
                          type="button"
                          onClick={() => handleStartEdit(evt)}
                          className="p-1.5 text-slate-600 hover:text-amber-700 hover:bg-amber-100 rounded-lg transition-colors cursor-pointer"
                          title="Edit Agenda"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteEvent(evt.id, evt.title)}
                          className="p-1.5 text-slate-600 hover:text-rose-600 hover:bg-rose-100 rounded-lg transition-colors cursor-pointer"
                          title="Hapus Agenda"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="p-6 text-center text-slate-400 italic">
                    Belum ada agenda atau hari libur yang ditambahkan.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};


