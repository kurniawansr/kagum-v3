import React, { useState, useMemo } from 'react';
import { useApp } from '../../context/AppContext';
import {
  Users,
  Building,
  GraduationCap,
  Calendar as CalendarIcon,
  CheckCircle2,
  AlertTriangle,
  PieChart as PieChartIcon,
  Server,
  ChevronLeft,
  ChevronRight,
  Info,
  ArrowUpRight,
  Sparkles,
  FileSpreadsheet,
  Clock,
  Layers,
  HelpCircle,
  XCircle,
} from 'lucide-react';
import {
  INDONESIAN_MONTH_NAMES,
  calculateMonthEfficiency,
  getDaysInMonth,
  isDateInEventRange,
} from '../../utils/calendarUtils';

export const AdminDashboard: React.FC = () => {
  const { users = [], students = [], attendanceRecords = [], calendarEvents = [], schoolProfile, setActiveTab } = useApp();

  // Today string YYYY-MM-DD
  const todayObj = new Date();
  const todayStr = todayObj.toISOString().split('T')[0];

  // Calendar Month State (default current month)
  const [calMonth, setCalMonth] = useState(todayObj.getMonth());
  const baseYear = parseInt((schoolProfile?.tahunAjaran || '2026/2027').split('/')[0], 10) || 2026;
  const calYear = calMonth >= 6 ? baseYear : baseYear + 1;

  // Selected date in calendar (default today or 1st of month)
  const [selectedCalDate, setSelectedCalDate] = useState<string>(todayStr);

  // Overall Stats
  const safeUsers = Array.isArray(users) ? users : [];
  const safeStudents = Array.isArray(students) ? students : [];
  const safeAttendance = Array.isArray(attendanceRecords) ? attendanceRecords : [];
  const safeCalendarEvents = Array.isArray(calendarEvents) ? calendarEvents : [];

  const totalGuru = safeUsers.filter((u) => u.role === 'guru').length;
  const classesSet = useMemo(() => {
    const set = new Set<string>();
    safeStudents.forEach((s) => {
      if (s.kelas) set.add(s.kelas);
    });
    safeUsers.forEach((u) => {
      if (u.role === 'guru' && u.kelas && u.kelas !== '-') set.add(u.kelas);
    });
    return Array.from(set).sort();
  }, [safeStudents, safeUsers]);

  const totalKelas = classesSet.length || 1;
  const totalSiswa = safeStudents.length;

  // Attendance Status per Class for Today
  const attendanceStatsToday = useMemo(() => {
    const todayRecs = safeAttendance.filter((r) => r.date === todayStr);

    const kelasSudahList: { kelas: string; teacherName: string; studentCount: number; recordCount: number }[] = [];
    const kelasBelumList: { kelas: string; teacherName: string; studentCount: number }[] = [];

    classesSet.forEach((kelasName) => {
      const recsInClass = todayRecs.filter((r) => r.kelas === kelasName);
      const teacher = safeUsers.find((u) => u.role === 'guru' && u.kelas === kelasName);
      const studentCount = safeStudents.filter((s) => s.kelas === kelasName).length;

      if (recsInClass.length > 0) {
        kelasSudahList.push({
          kelas: kelasName,
          teacherName: teacher?.name || 'Wali Kelas',
          studentCount,
          recordCount: recsInClass.length,
        });
      } else {
        kelasBelumList.push({
          kelas: kelasName,
          teacherName: teacher?.name || 'Wali Kelas',
          studentCount,
        });
      }
    });

    const totalSudah = kelasSudahList.length;
    const totalBelum = kelasBelumList.length;
    const total = totalKelas;
    const pctSudah = total > 0 ? Math.round((totalSudah / total) * 100) : 0;
    const pctBelum = 100 - pctSudah;

    return {
      kelasSudahList,
      kelasBelumList,
      totalSudah,
      totalBelum,
      total,
      pctSudah,
      pctBelum,
    };
  }, [safeAttendance, todayStr, classesSet, safeUsers, safeStudents, totalKelas]);

  // Month efficiency calculation
  const currentMonthEfficiency = calculateMonthEfficiency(calYear, calMonth, safeCalendarEvents);

  // Calendar Grid Builder
  const calendarGrid = useMemo(() => {
    const daysCount = getDaysInMonth(calYear, calMonth);
    const firstDayOfWeek = new Date(calYear, calMonth, 1).getDay(); // 0 = Sunday, 1 = Monday...

    const days: Array<{
      dayNum: number | null;
      dateStr: string | null;
      isSunday: boolean;
      isToday: boolean;
      events: typeof calendarEvents;
    }> = [];

    // Empty padding for start of month
    for (let i = 0; i < firstDayOfWeek; i++) {
      days.push({ dayNum: null, dateStr: null, isSunday: false, isToday: false, events: [] });
    }

    // Days in month
    for (let d = 1; d <= daysCount; d++) {
      const monthStr = String(calMonth + 1).padStart(2, '0');
      const dayStr = String(d).padStart(2, '0');
      const formattedDate = `${calYear}-${monthStr}-${dayStr}`;

      const dateObj = new Date(calYear, calMonth, d);
      const isSunday = dateObj.getDay() === 0;
      const isToday = formattedDate === todayStr;

      const evts = safeCalendarEvents.filter((e) => e && isDateInEventRange(formattedDate, e));

      days.push({
        dayNum: d,
        dateStr: formattedDate,
        isSunday,
        isToday,
        events: evts,
      });
    }

    return days;
  }, [calYear, calMonth, safeCalendarEvents, todayStr]);

  // Selected date events
  const selectedDateEvents = useMemo(() => {
    if (!selectedCalDate) return [];
    return safeCalendarEvents.filter((e) => e && isDateInEventRange(selectedCalDate, e));
  }, [selectedCalDate, safeCalendarEvents]);

  // SVG Donut Chart Parameters
  const radius = 42;
  const circumference = 2 * Math.PI * radius; // ~263.89
  const strokeDashSudah = (attendanceStatsToday.pctSudah / 100) * circumference;
  const strokeDashBelum = circumference - strokeDashSudah;

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-gradient-to-r from-emerald-900 via-teal-900 to-slate-900 rounded-2xl p-6 text-white shadow-lg relative overflow-hidden">
        <div className="absolute top-0 right-0 transform translate-x-12 -translate-y-12 w-80 h-80 bg-teal-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 relative z-10">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-white/10 backdrop-blur-md rounded-full text-xs font-bold text-teal-200 mb-2 border border-white/10">
              <Sparkles className="w-3.5 h-3.5 text-teal-300" />
              Panel Administrator Utama
            </div>
            <h1 className="text-2xl font-black tracking-tight text-white">
              Dashboard Administrasi {schoolProfile?.namaMadrasah || 'Madrasah'}
            </h1>
            <p className="text-xs text-slate-300 mt-1 max-w-2xl">
              Tahun Ajaran {schoolProfile?.tahunAjaran || '2026/2027'} ({schoolProfile?.semester || 'Ganjil'}) • Kepala Madrasah: {schoolProfile?.namaKepala || '-'}
            </p>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              onClick={() => setActiveTab('update-aplikasi')}
              className="px-3.5 py-2.5 bg-white/10 hover:bg-white/20 text-white font-bold text-xs rounded-xl border border-white/15 transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <ArrowUpRight className="w-4 h-4" />
              Menu Update
            </button>
          </div>
        </div>
      </div>

      {/* Top Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div className="bg-white p-4.5 rounded-2xl border border-slate-200/80 shadow-xs flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-xl bg-indigo-50 border border-indigo-100 text-indigo-600 flex items-center justify-center shrink-0 font-bold">
            <Users className="w-5.5 h-5.5" />
          </div>
          <div>
            <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Total Guru</p>
            <p className="text-2xl font-black text-slate-900 mt-0.5">{totalGuru} <span className="text-xs font-normal text-slate-500">Guru</span></p>
          </div>
        </div>

        <div className="bg-white p-4.5 rounded-2xl border border-slate-200/80 shadow-xs flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-xl bg-teal-50 border border-teal-100 text-teal-600 flex items-center justify-center shrink-0 font-bold">
            <Building className="w-5.5 h-5.5" />
          </div>
          <div>
            <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Total Rombel</p>
            <p className="text-2xl font-black text-slate-900 mt-0.5">{totalKelas} <span className="text-xs font-normal text-slate-500">Kelas</span></p>
          </div>
        </div>

        <div className="bg-white p-4.5 rounded-2xl border border-slate-200/80 shadow-xs flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-xl bg-emerald-50 border border-emerald-100 text-emerald-600 flex items-center justify-center shrink-0 font-bold">
            <GraduationCap className="w-5.5 h-5.5" />
          </div>
          <div>
            <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Total Siswa</p>
            <p className="text-2xl font-black text-slate-900 mt-0.5">{totalSiswa} <span className="text-xs font-normal text-slate-500">Siswa</span></p>
          </div>
        </div>

        <div className="bg-white p-4.5 rounded-2xl border border-slate-200/80 shadow-xs flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-xl bg-amber-50 border border-amber-100 text-amber-600 flex items-center justify-center shrink-0 font-bold">
            <CalendarIcon className="w-5.5 h-5.5" />
          </div>
          <div>
            <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Hari Efektif Belajar</p>
            <p className="text-2xl font-black text-slate-900 mt-0.5">{currentMonthEfficiency.effectiveDays} <span className="text-xs font-normal text-slate-500">Hari</span></p>
          </div>
        </div>
      </div>

      {/* SECTION 1: STATISTIK ABSENSI KELAS HARI INI (PIE CHART + DETAIL KELAS) */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-xs space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
          <div className="flex items-center gap-2.5">
            <div className="p-2.5 bg-indigo-50 text-indigo-700 rounded-xl">
              <PieChartIcon className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-black text-slate-900">
                Statistik Absensi Kelas Hari Ini ({todayStr})
              </h2>
              <p className="text-xs text-slate-500">
                Monitoring realtime jumlah kelas yang sudah melakukan absensi vs yang belum mengisi presensi
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="px-3 py-1 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-full text-xs font-bold flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              Realtime Sync
            </span>
            <button
              onClick={() => setActiveTab('admin-absensi')}
              className="px-3 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-full text-xs font-bold transition-colors cursor-pointer"
            >
              Laporan Rekap &rarr;
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
          {/* Pie Chart Visual Card */}
          <div className="lg:col-span-5 bg-gradient-to-b from-slate-50 to-indigo-50/30 p-6 rounded-2xl border border-slate-200/80 flex flex-col items-center text-center">
            <p className="text-xs font-black text-slate-600 uppercase tracking-wider mb-4">
              Persentase Rekap Absensi Kelas
            </p>

            <div className="relative w-48 h-48 flex items-center justify-center my-2">
              <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                {/* Background Ring */}
                <circle
                  cx="50"
                  cy="50"
                  r={radius}
                  className="stroke-amber-100"
                  strokeWidth="14"
                  fill="transparent"
                />
                {/* Sudah Segment (Emerald) */}
                <circle
                  cx="50"
                  cy="50"
                  r={radius}
                  className="stroke-emerald-500 transition-all duration-1000 ease-out"
                  strokeWidth="14"
                  strokeDasharray={`${strokeDashSudah} ${strokeDashBelum}`}
                  strokeLinecap="round"
                  fill="transparent"
                />
              </svg>

              {/* Center Overlay Text */}
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                <span className="text-3xl font-black text-slate-900">
                  {attendanceStatsToday.pctSudah}%
                </span>
                <span className="text-[11px] font-extrabold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full mt-0.5">
                  {attendanceStatsToday.totalSudah} / {attendanceStatsToday.total} Kelas
                </span>
              </div>
            </div>

            {/* Pie Chart Legend */}
            <div className="flex items-center justify-center gap-6 mt-4 pt-4 border-t border-slate-200/80 w-full text-xs">
              <div className="flex items-center gap-2">
                <span className="w-3.5 h-3.5 rounded-full bg-emerald-500 border border-emerald-600 shadow-xs" />
                <div className="text-left">
                  <p className="font-extrabold text-slate-900">Sudah Absensi</p>
                  <p className="text-[11px] font-bold text-emerald-700">
                    {attendanceStatsToday.totalSudah} Kelas ({attendanceStatsToday.pctSudah}%)
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <span className="w-3.5 h-3.5 rounded-full bg-amber-400 border border-amber-500 shadow-xs" />
                <div className="text-left">
                  <p className="font-extrabold text-slate-900">Belum Absensi</p>
                  <p className="text-[11px] font-bold text-amber-700">
                    {attendanceStatsToday.totalBelum} Kelas ({attendanceStatsToday.pctBelum}%)
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Class Lists Breakdowns */}
          <div className="lg:col-span-7 space-y-5">
            {/* Class List: Sudah Absensi */}
            <div className="p-4 rounded-2xl bg-emerald-50/60 border border-emerald-200/80 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4.5 h-4.5 text-emerald-600 shrink-0" />
                  <h3 className="font-black text-xs text-emerald-950 uppercase tracking-wider">
                    Kelas Sudah Melakukan Absensi ({attendanceStatsToday.totalSudah} Kelas)
                  </h3>
                </div>
                <span className="text-[10px] font-extrabold px-2 py-0.5 bg-emerald-200 text-emerald-900 rounded-md">
                  Lengkap
                </span>
              </div>

              {attendanceStatsToday.kelasSudahList.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {attendanceStatsToday.kelasSudahList.map((item) => (
                    <div
                      key={item.kelas}
                      className="p-2.5 bg-white rounded-xl border border-emerald-100 shadow-2xs flex items-center justify-between"
                    >
                      <div>
                        <p className="font-black text-xs text-slate-900">{item.kelas}</p>
                        <p className="text-[10px] text-slate-500">{item.teacherName}</p>
                      </div>
                      <span className="text-[10px] font-extrabold px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded-md">
                        {item.studentCount} Siswa
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-emerald-800 italic">
                  Belum ada kelas yang menyimpan absensi untuk hari ini.
                </p>
              )}
            </div>

            {/* Class List: Belum Absensi */}
            <div className="p-4 rounded-2xl bg-amber-50/70 border border-amber-200/80 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="w-4.5 h-4.5 text-amber-600 shrink-0" />
                  <h3 className="font-black text-xs text-amber-950 uppercase tracking-wider">
                    Kelas Belum Melakukan Absensi ({attendanceStatsToday.totalBelum} Kelas)
                  </h3>
                </div>
                <span className="text-[10px] font-extrabold px-2 py-0.5 bg-amber-200 text-amber-900 rounded-md">
                  Perlu Pengisian
                </span>
              </div>

              {attendanceStatsToday.kelasBelumList.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {attendanceStatsToday.kelasBelumList.map((item) => (
                    <div
                      key={item.kelas}
                      className="p-2.5 bg-white rounded-xl border border-amber-100 shadow-2xs flex items-center justify-between"
                    >
                      <div>
                        <p className="font-black text-xs text-slate-900">{item.kelas}</p>
                        <p className="text-[10px] text-slate-500">{item.teacherName}</p>
                      </div>
                      <span className="text-[10px] font-bold px-2 py-0.5 bg-amber-100 text-amber-900 rounded-md flex items-center gap-1">
                        <Clock className="w-3 h-3 text-amber-600" />
                        Belum Diisi
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-emerald-800 font-bold flex items-center gap-1">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  Luar biasa! Seluruh kelas telah menyelesaikan absensi hari ini.
                </p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* SECTION 2: AGENDA KALENDER PENDIDIKAN BULAN INI (VISUAL KALENDER LENGKAP) */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-xs space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
          <div className="flex items-center gap-2.5">
            <div className="p-2.5 bg-emerald-50 text-emerald-700 rounded-xl">
              <CalendarIcon className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-black text-slate-900">
                Agenda Kalender Pendidikan ({INDONESIAN_MONTH_NAMES[calMonth]} {calYear})
              </h2>
              <p className="text-xs text-slate-500">
                Tampilan visual kalender lengkap dengan agenda, hari libur nasional, dan keterangan kegiatan madrasah
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200 text-xs font-bold">
              <button
                onClick={() => setCalMonth((m) => (m === 0 ? 11 : m - 1))}
                className="p-1 rounded-lg hover:bg-white hover:shadow-xs text-slate-700 transition-all cursor-pointer"
                title="Bulan Sebelumnya"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="px-3 text-slate-800 min-w-[120px] text-center">
                {INDONESIAN_MONTH_NAMES[calMonth]} {calYear}
              </span>
              <button
                onClick={() => setCalMonth((m) => (m === 11 ? 0 : m + 1))}
                className="p-1 rounded-lg hover:bg-white hover:shadow-xs text-slate-700 transition-all cursor-pointer"
                title="Bulan Berikutnya"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>

            <button
              onClick={() => setActiveTab('kalender-pendidikan')}
              className="px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 rounded-xl text-xs font-bold transition-colors cursor-pointer"
            >
              Kelola Kalender &rarr;
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left: Full Monthly Calendar Grid */}
          <div className="lg:col-span-7 bg-slate-50/60 p-5 rounded-2xl border border-slate-200/80 space-y-4">
            {/* Days Header */}
            <div className="grid grid-cols-7 gap-1 text-center font-black text-xs uppercase tracking-wider">
              <div className="py-2 text-rose-600 bg-rose-50/60 rounded-lg">Min</div>
              <div className="py-2 text-slate-700">Sen</div>
              <div className="py-2 text-slate-700">Sel</div>
              <div className="py-2 text-slate-700">Rab</div>
              <div className="py-2 text-slate-700">Kam</div>
              <div className="py-2 text-slate-700">Jum</div>
              <div className="py-2 text-slate-700">Sab</div>
            </div>

            {/* Calendar Days Grid */}
            <div className="grid grid-cols-7 gap-1.5 text-xs">
              {calendarGrid.map((item, idx) => {
                if (!item.dayNum || !item.dateStr) {
                  return <div key={`empty-${idx}`} className="h-14 rounded-xl bg-transparent" />;
                }

                const isSelected = item.dateStr === selectedCalDate;
                const hasEvents = item.events.length > 0;
                const liburEvt = item.events.find((e) => e.type === 'libur');
                const agendaEvt = item.events.find((e) => e.type === 'agenda');

                return (
                  <button
                    key={item.dateStr}
                    type="button"
                    onClick={() => setSelectedCalDate(item.dateStr!)}
                    className={`h-14 p-1.5 rounded-xl border text-left transition-all relative flex flex-col justify-between cursor-pointer ${
                      isSelected
                        ? 'ring-2 ring-indigo-600 border-indigo-600 bg-indigo-50/80 shadow-xs'
                        : item.isToday
                        ? 'bg-emerald-50 border-emerald-400 font-bold'
                        : item.isSunday || liburEvt
                        ? 'bg-rose-50/70 border-rose-200 text-rose-900'
                        : agendaEvt
                        ? 'bg-amber-50/80 border-amber-200 text-amber-900'
                        : 'bg-white border-slate-200/70 hover:border-slate-300'
                    }`}
                  >
                    <div className="flex items-center justify-between w-full">
                      <span
                        className={`text-xs font-black ${
                          item.isSunday || liburEvt
                            ? 'text-rose-600'
                            : item.isToday
                            ? 'text-emerald-700'
                            : 'text-slate-800'
                        }`}
                      >
                        {item.dayNum}
                      </span>
                      {item.isToday && (
                        <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" title="Hari Ini" />
                      )}
                    </div>

                    {/* Event Dots / Badges */}
                    <div className="flex flex-wrap gap-0.5 mt-0.5">
                      {item.events.slice(0, 2).map((e, eIdx) => (
                        <span
                          key={eIdx}
                          className={`text-[9px] font-extrabold px-1 rounded truncate max-w-full ${
                            e.type === 'libur'
                              ? 'bg-rose-600 text-white'
                              : e.type === 'agenda'
                              ? 'bg-amber-500 text-white'
                              : 'bg-indigo-600 text-white'
                          }`}
                          title={e.title}
                        >
                          {e.title}
                        </span>
                      ))}
                      {item.events.length > 2 && (
                        <span className="text-[9px] font-bold text-slate-500">
                          +{item.events.length - 2}
                        </span>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Calendar Legend */}
            <div className="flex flex-wrap items-center gap-4 pt-3 border-t border-slate-200 text-[11px] font-bold text-slate-600">
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded bg-emerald-100 border border-emerald-400" />
                Hari Ini
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded bg-rose-100 border border-rose-300" />
                Hari Minggu / Libur
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded bg-amber-100 border border-amber-300" />
                Agenda Ujian/Kegiatan
              </div>
            </div>
          </div>

          {/* Right: Detailed Agenda List for Month / Selected Date */}
          <div className="lg:col-span-5 flex flex-col space-y-4">
            <div className="p-4 bg-slate-900 text-white rounded-2xl space-y-3">
              <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
                <div className="flex items-center gap-2">
                  <CalendarIcon className="w-4 h-4 text-emerald-400" />
                  <span className="font-black text-xs">
                    Agenda Tanggal: {selectedCalDate || 'Pilih Tanggal'}
                  </span>
                </div>
                <span className="text-[10px] px-2 py-0.5 bg-slate-800 text-emerald-400 font-mono rounded">
                  {currentMonthEfficiency.eventsInMonth.length} Event Bulan Ini
                </span>
              </div>

              {selectedDateEvents.length > 0 ? (
                <div className="space-y-2">
                  {selectedDateEvents.map((evt) => (
                    <div
                      key={evt.id}
                      className={`p-3 rounded-xl border text-xs ${
                        evt.type === 'libur'
                          ? 'bg-rose-950/60 border-rose-800/80 text-rose-200'
                          : 'bg-amber-950/60 border-amber-800/80 text-amber-200'
                      }`}
                    >
                      <div className="flex items-center justify-between font-extrabold mb-1">
                        <span>{evt.title}</span>
                        <span className="text-[10px] px-2 py-0.5 rounded bg-white/10 uppercase">
                          {evt.type}
                        </span>
                      </div>
                      {evt.description && <p className="text-[11px] opacity-90 mt-1">{evt.description}</p>}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-slate-400 py-2">
                  Tidak ada agenda khusus pada tanggal {selectedCalDate}.
                </p>
              )}
            </div>

            {/* List of All Events in Current Month */}
            <div className="flex-1 bg-slate-50 p-4 rounded-2xl border border-slate-200/80 space-y-3 overflow-hidden flex flex-col">
              <h3 className="font-extrabold text-xs text-slate-900 uppercase tracking-wider flex items-center justify-between">
                <span>Seluruh Agenda {INDONESIAN_MONTH_NAMES[calMonth]} {calYear}</span>
                <span className="text-[10px] font-normal text-slate-500">
                  {currentMonthEfficiency.effectiveDays} Hari Efektif
                </span>
              </h3>

              <div className="space-y-2 overflow-y-auto max-h-64 pr-1">
                {currentMonthEfficiency.eventsInMonth.length > 0 ? (
                  currentMonthEfficiency.eventsInMonth.map((evt) => (
                    <div
                      key={evt.id}
                      onClick={() => setSelectedCalDate(evt.date)}
                      className={`p-3 rounded-xl border text-xs cursor-pointer transition-all hover:scale-[1.01] ${
                        evt.type === 'libur'
                          ? 'bg-rose-50 border-rose-200 text-rose-900'
                          : 'bg-amber-50 border-amber-200 text-amber-900'
                      }`}
                    >
                      <div className="flex items-center justify-between font-bold">
                        <span className="truncate max-w-[200px]">{evt.title}</span>
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-white/80 shrink-0">
                          {evt.date}
                        </span>
                      </div>
                      {evt.description && (
                        <p className="text-[11px] opacity-80 mt-1 line-clamp-1">{evt.description}</p>
                      )}
                    </div>
                  ))
                ) : (
                  <div className="text-center py-8 text-xs text-slate-400">
                    <CalendarIcon className="w-8 h-8 mx-auto text-slate-300 mb-1" />
                    Tidak ada agenda kalender pendidikan khusus di bulan {INDONESIAN_MONTH_NAMES[calMonth]}.
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
