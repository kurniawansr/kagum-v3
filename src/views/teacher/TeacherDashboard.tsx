import React from 'react';
import { useApp } from '../../context/AppContext';
import {
  Users,
  CalendarDays,
  AlertTriangle,
  CheckCircle2,
  Calendar,
  Sparkles,
  ClipboardCheck,
  ArrowUpRight,
  TrendingUp,
  Heart,
  Calculator,
  FileText,
  Clock,
  BookOpen,
} from 'lucide-react';
import { calculateMonthEfficiency } from '../../utils/calendarUtils';
import { motion } from 'motion/react';

export const TeacherDashboard: React.FC = () => {
  const { currentUser, students, schedules, calendarEvents, attendanceRecords, setActiveTab } = useApp();

  const teacherClass = currentUser?.kelas || 'Kelas IA';
  const myStudents = students.filter((s) => s.kelas === teacherClass);

  const todayStr = new Date().toISOString().split('T')[0];
  const todayAttendance = attendanceRecords.filter((r) => r.date === todayStr && r.kelas === teacherClass);

  const isAttendanceDone = todayAttendance.length > 0;

  const hadirCount = todayAttendance.filter((r) => r.status === 'Hadir').length;
  const sakitCount = todayAttendance.filter((r) => r.status === 'Sakit').length;
  const izinCount = todayAttendance.filter((r) => r.status === 'Izin').length;
  const alfaCount = todayAttendance.filter((r) => r.status === 'Alfa').length;

  const attendancePct = myStudents.length > 0 ? Math.round((hadirCount / myStudents.length) * 100) : 100;

  const daysMap: Record<number, string> = {
    1: 'Senin',
    2: 'Selasa',
    3: 'Rabu',
    4: 'Kamis',
    5: 'Jumat',
    6: 'Sabtu',
  };
  const todayDayName = daysMap[new Date().getDay()] || 'Senin';
  const todaySchedule = schedules.filter((s) => s.day === todayDayName && s.kelas === teacherClass);

  const todayDateObj = new Date();
  const monthEfficiency = calculateMonthEfficiency(
    todayDateObj.getFullYear(),
    todayDateObj.getMonth(),
    calendarEvents
  );

  return (
    <div className="space-y-6">
      {/* Top Hero Card - Executive Emerald Styling */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-gradient-to-r from-slate-900 via-emerald-950 to-slate-900 border border-slate-800 rounded-3xl p-6 lg:p-8 text-white relative overflow-hidden shadow-xl"
      >
        <div className="absolute top-0 right-0 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20" />
        <div className="absolute bottom-0 left-1/3 w-80 h-80 bg-teal-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
          <div className="space-y-2.5">
            <div className="flex flex-wrap items-center gap-2">
              <span className="px-3 py-1 bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 rounded-full text-xs font-extrabold tracking-wide flex items-center gap-1.5">
                <Sparkles className="w-3 h-3 text-emerald-400" /> Wali Kelas {teacherClass}
              </span>
              <span className="px-3 py-1 bg-slate-800/80 text-slate-300 border border-slate-700/80 rounded-full text-xs font-semibold">
                Ust. {currentUser?.name}
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white">
              Assalamu'alaikum, Ust. {currentUser?.name}
            </h1>
            <p className="text-xs text-slate-300 max-w-xl leading-relaxed">
              Selamat datang di Portal Administrasi Guru KAGUM Executive. Kelola data absensi harian, nilai asesmen, 7 kebiasaan karakter AI, serta keuangan kelas {teacherClass} secara cepat dan akurat.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 shrink-0">
            <button
              onClick={() => setActiveTab('absensi-siswa')}
              className="flex items-center justify-center gap-2 px-5 py-3 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs rounded-2xl shadow-lg shadow-emerald-500/20 transition-all hover:scale-[1.02] active:scale-95 cursor-pointer"
            >
              <ClipboardCheck className="w-4 h-4 text-slate-950" />
              Presensi Hari Ini
            </button>
            <button
              onClick={() => setActiveTab('kebiasaan-hebat')}
              className="flex items-center justify-center gap-2 px-5 py-3 bg-slate-800/80 hover:bg-slate-800 text-teal-300 border border-teal-500/40 font-bold text-xs rounded-2xl transition-all cursor-pointer"
            >
              <Sparkles className="w-4 h-4 text-teal-400" />
              7 Kebiasaan AI
            </button>
          </div>
        </div>
      </motion.div>

      {/* Attendance Alert Header */}
      {!isAttendanceDone && (
        <motion.div
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          className="p-4 bg-amber-500/10 border border-amber-500/30 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs text-amber-900 shadow-xs"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/20 text-amber-700 flex items-center justify-center shrink-0 font-bold border border-amber-500/30">
              <AlertTriangle className="w-5 h-5 text-amber-600" />
            </div>
            <div>
              <p className="font-extrabold text-slate-900 text-sm">Absensi Kelas Hari Ini Belum Diisi!</p>
              <p className="text-slate-600 mt-0.5">
                Data presensi siswa kelas {teacherClass} untuk tanggal ({todayStr}) belum tersimpan di sistem.
              </p>
            </div>
          </div>
          <button
            onClick={() => setActiveTab('absensi-siswa')}
            className="px-4 py-2.5 bg-amber-600 hover:bg-amber-500 text-white font-extrabold text-xs rounded-xl shrink-0 transition-colors shadow-md shadow-amber-900/20 cursor-pointer"
          >
            Isi Presensi Sekarang
          </button>
        </motion.div>
      )}

      {/* Quick Access Tiles */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
        <button
          onClick={() => setActiveTab('absensi-siswa')}
          className="p-4 bg-white border border-slate-200/80 hover:border-emerald-500 rounded-2xl shadow-2xs hover:shadow-md transition-all text-left cursor-pointer group"
        >
          <div className="w-9 h-9 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center mb-2.5 group-hover:bg-emerald-600 group-hover:text-white transition-colors">
            <ClipboardCheck className="w-5 h-5" />
          </div>
          <p className="text-xs font-black text-slate-800 group-hover:text-emerald-950">Presensi Siswa</p>
          <p className="text-[10px] text-slate-400 mt-0.5">Input & rekap H/S/I/A</p>
        </button>

        <button
          onClick={() => setActiveTab('guru-assessments')}
          className="p-4 bg-white border border-slate-200/80 hover:border-teal-500 rounded-2xl shadow-2xs hover:shadow-md transition-all text-left cursor-pointer group"
        >
          <div className="w-9 h-9 rounded-xl bg-teal-100 text-teal-700 flex items-center justify-center mb-2.5 group-hover:bg-teal-600 group-hover:text-white transition-colors">
            <Calculator className="w-5 h-5" />
          </div>
          <p className="text-xs font-black text-slate-800 group-hover:text-teal-950">Daftar Nilai</p>
          <p className="text-[10px] text-slate-400 mt-0.5">Penilaian formatif & sumatif</p>
        </button>

        <button
          onClick={() => setActiveTab('jurnal-mengajar')}
          className="p-4 bg-white border border-slate-200/80 hover:border-blue-500 rounded-2xl shadow-2xs hover:shadow-md transition-all text-left cursor-pointer group"
        >
          <div className="w-9 h-9 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center mb-2.5 group-hover:bg-blue-600 group-hover:text-white transition-colors">
            <FileText className="w-5 h-5" />
          </div>
          <p className="text-xs font-black text-slate-800 group-hover:text-blue-950">Jurnal Mengajar</p>
          <p className="text-[10px] text-slate-400 mt-0.5">Catatan materi & refleksi</p>
        </button>

        <button
          onClick={() => setActiveTab('dansos-infaq')}
          className="p-4 bg-white border border-slate-200/80 hover:border-amber-500 rounded-2xl shadow-2xs hover:shadow-md transition-all text-left cursor-pointer group"
        >
          <div className="w-9 h-9 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center mb-2.5 group-hover:bg-amber-600 group-hover:text-white transition-colors">
            <Heart className="w-5 h-5" />
          </div>
          <p className="text-xs font-black text-slate-800 group-hover:text-amber-950">Keuangan Kelas</p>
          <p className="text-[10px] text-slate-400 mt-0.5">Infaq Jum'at & Syahriyah</p>
        </button>
      </div>

      {/* Combined Single Statistics Box */}
      <div className="bg-white rounded-3xl border border-slate-200/80 p-6 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100 mb-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-50 text-emerald-700 flex items-center justify-center font-bold">
              <TrendingUp className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-slate-800 text-sm">Statistik Kehadiran & Data Siswa {teacherClass}</h3>
              <p className="text-xs text-slate-400">Ringkasan terpadu jumlah siswa, persentase kehadiran, serta rincian absensi hari ini</p>
            </div>
          </div>

          <button
            onClick={() => setActiveTab('absensi-siswa')}
            className="flex items-center gap-1.5 px-4 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 font-bold text-xs rounded-xl transition-colors shrink-0 cursor-pointer"
          >
            <ClipboardCheck className="w-4 h-4 text-emerald-600" />
            Kelola Presensi
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          {/* Total Siswa */}
          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100 flex flex-col justify-between">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Total Siswa</span>
            <div className="mt-2 flex items-baseline justify-between">
              <div>
                <span className="text-3xl font-black text-slate-900">{myStudents.length}</span>
                <span className="text-xs text-slate-500 font-semibold ml-1">Siswa</span>
              </div>
              <Users className="w-5 h-5 text-slate-400" />
            </div>
          </div>

          {/* Persentase Kehadiran */}
          <div className="p-4 rounded-2xl bg-emerald-600 text-white flex flex-col justify-between shadow-md shadow-emerald-950/20">
            <span className="text-[11px] font-bold text-emerald-100 uppercase tracking-wider">Kehadiran Hari Ini</span>
            <div className="mt-2 flex items-baseline justify-between">
              <div>
                <span className="text-3xl font-black">{isAttendanceDone ? attendancePct : 100}%</span>
                <p className="text-[10px] text-emerald-100 mt-0.5">
                  {isAttendanceDone ? `${hadirCount} Hadir` : 'Belum diproses'}
                </p>
              </div>
              <CheckCircle2 className="w-5 h-5 text-emerald-200" />
            </div>
          </div>

          {/* Sakit */}
          <div className="p-4 rounded-2xl bg-amber-50/60 border border-amber-200/80 flex flex-col justify-between">
            <span className="text-[11px] font-bold text-amber-800 uppercase tracking-wider">Sakit (S)</span>
            <div className="mt-2">
              <span className="text-3xl font-black text-amber-700">{sakitCount}</span>
              <span className="text-xs text-amber-700 font-semibold ml-1">Siswa</span>
            </div>
          </div>

          {/* Izin */}
          <div className="p-4 rounded-2xl bg-blue-50/60 border border-blue-200/80 flex flex-col justify-between">
            <span className="text-[11px] font-bold text-blue-800 uppercase tracking-wider">Izin (I)</span>
            <div className="mt-2">
              <span className="text-3xl font-black text-blue-700">{izinCount}</span>
              <span className="text-xs text-blue-700 font-semibold ml-1">Siswa</span>
            </div>
          </div>

          {/* Alfa */}
          <div className="p-4 rounded-2xl bg-rose-50/60 border border-rose-200/80 flex flex-col justify-between">
            <span className="text-[11px] font-bold text-rose-800 uppercase tracking-wider">Alfa (A)</span>
            <div className="mt-2">
              <span className="text-3xl font-black text-rose-700">{alfaCount}</span>
              <span className="text-xs text-rose-700 font-semibold ml-1">Siswa</span>
            </div>
          </div>
        </div>
      </div>

      {/* Bento Grid Schedule & Agenda Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Today's Timetable Bento Card */}
        <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-xs hover:border-emerald-500/50 transition-all">
          <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-4">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center">
                <Clock className="w-4 h-4" />
              </div>
              <div>
                <h3 className="font-extrabold text-slate-800 text-sm">
                  Jadwal Mengajar Hari Ini ({todayDayName})
                </h3>
                <p className="text-[11px] text-slate-400">Rincian jam pelajaran kelas {teacherClass}</p>
              </div>
            </div>
            <span className="text-xs px-3 py-1 bg-emerald-50 text-emerald-700 font-bold rounded-full border border-emerald-200/60">
              {todaySchedule.length} Mapel
            </span>
          </div>

          <div className="space-y-3">
            {todaySchedule.length > 0 ? (
              todaySchedule.map((item) => (
                <div
                  key={item.id}
                  className="p-3.5 rounded-2xl border border-slate-100 bg-slate-50/70 hover:bg-white hover:border-emerald-300 transition-all flex items-center justify-between text-xs group"
                >
                  <div className="flex items-center gap-3">
                    <span className="font-mono text-emerald-800 font-extrabold bg-emerald-100/80 px-2.5 py-1 rounded-lg text-[11px]">
                      {item.timeSlot}
                    </span>
                    <span className="font-extrabold text-slate-800 text-sm group-hover:text-emerald-700 transition-colors">
                      {item.activityName || item.subjectCode}
                    </span>
                  </div>
                  <span className="font-bold text-slate-500 bg-white border border-slate-200 px-2.5 py-1 rounded-lg text-[11px] shadow-2xs">
                    Kode: {item.subjectCode}
                  </span>
                </div>
              ))
            ) : (
              <div className="text-center py-10 text-xs text-slate-400">
                Tidak ada jadwal mengajar pada hari {todayDayName}.
              </div>
            )}
          </div>
        </div>

        {/* Monthly Educational Agenda Bento Card */}
        <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-xs hover:border-emerald-500/50 transition-all flex flex-col">
          <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-4">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-teal-50 text-teal-700 flex items-center justify-center">
                <Calendar className="w-4 h-4" />
              </div>
              <div>
                <h3 className="font-extrabold text-slate-800 text-sm">
                  Agenda Kalender Pendidikan ({monthEfficiency.monthName})
                </h3>
                <p className="text-[11px] text-slate-400">Kalender efektif & hari libur madrasah</p>
              </div>
            </div>
            <span className="text-xs font-extrabold text-teal-800 bg-teal-50 border border-teal-200/60 px-3 py-1 rounded-full">
              {monthEfficiency.effectiveDays} Hari Efektif
            </span>
          </div>

          <div className="space-y-3 flex-1 overflow-y-auto max-h-72 pr-1">
            {monthEfficiency.eventsInMonth.length > 0 ? (
              monthEfficiency.eventsInMonth.map((evt) => (
                <div
                  key={evt.id}
                  className={`p-3.5 rounded-2xl border text-xs ${
                    evt.type === 'libur'
                      ? 'bg-rose-50/60 border-rose-200 text-rose-900'
                      : 'bg-amber-50/60 border-amber-200 text-amber-900'
                  }`}
                >
                  <div className="flex items-center justify-between font-bold mb-1">
                    <span className="text-sm font-black">{evt.title}</span>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-white/80 border border-slate-200/60 shadow-2xs">
                      {evt.date}
                    </span>
                  </div>
                  {evt.description && <p className="opacity-90 text-[11px]">{evt.description}</p>}
                </div>
              ))
            ) : (
              <div className="text-center py-10 text-xs text-slate-400">
                Tidak ada agenda khusus bulan ini.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

