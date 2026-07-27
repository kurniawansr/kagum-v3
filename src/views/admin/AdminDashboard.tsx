import React from 'react';
import { useApp } from '../../context/AppContext';
import { Users, Building, GraduationCap, Calendar, CheckCircle2, AlertCircle } from 'lucide-react';
import { calculateMonthEfficiency } from '../../utils/calendarUtils';

export const AdminDashboard: React.FC = () => {
  const { users, students, calendarEvents, schoolProfile } = useApp();

  const totalGuru = users.filter((u) => u.role === 'guru').length;
  const classesSet = new Set(students.map((s) => s.kelas));
  const totalKelas = classesSet.size || 1;
  const totalSiswa = students.length;

  const today = new Date();
  const currentMonthEfficiency = calculateMonthEfficiency(
    today.getFullYear(),
    today.getMonth(),
    calendarEvents
  );

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-gradient-to-r from-emerald-800 to-teal-900 rounded-2xl p-6 text-white shadow-md">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <span className="inline-block px-3 py-1 bg-emerald-700/60 rounded-full text-xs font-semibold text-emerald-200 mb-2">
              Panel Administrator Utama
            </span>
            <h1 className="text-2xl font-black tracking-tight">
              Dashboard Administrasi {schoolProfile.namaMadrasah}
            </h1>
            <p className="text-xs text-emerald-100/90 mt-1">
              Tahun Ajaran {schoolProfile.tahunAjaran} ({schoolProfile.semester}) • Kepala Madrasah: {schoolProfile.namaKepala}
            </p>
          </div>
          <div className="bg-white/10 backdrop-blur-md px-4 py-3 rounded-xl border border-white/20 text-center">
            <p className="text-xs text-emerald-200">Hari Efektif Bulan Ini</p>
            <p className="text-3xl font-extrabold text-white mt-1">
              {currentMonthEfficiency.effectiveDays} <span className="text-xs font-normal">Hari</span>
            </p>
          </div>
        </div>
      </div>

      {/* Top Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-indigo-50 border border-indigo-100 text-indigo-600 flex items-center justify-center">
            <Users className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs text-slate-500 font-medium">Statistik Jumlah Guru</p>
            <p className="text-2xl font-bold text-slate-800 mt-0.5">{totalGuru} Guru</p>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-teal-50 border border-teal-100 text-teal-600 flex items-center justify-center">
            <Building className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs text-slate-500 font-medium">Statistik Jumlah Kelas</p>
            <p className="text-2xl font-bold text-slate-800 mt-0.5">{totalKelas} Kelas/Rombel</p>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-emerald-50 border border-emerald-100 text-emerald-600 flex items-center justify-center">
            <GraduationCap className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs text-slate-500 font-medium">Statistik Jumlah Siswa</p>
            <p className="text-2xl font-bold text-slate-800 mt-0.5">{totalSiswa} Siswa</p>
          </div>
        </div>
      </div>

      {/* Rombongan Kelas Attendance Summary & Calendar Widget */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Attendance per Class */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200 p-5 shadow-xs">
          <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-100">
            <div>
              <h3 className="font-bold text-slate-800 text-sm">
                Statistik Absensi Siswa Berdasarkan Rombongan Kelas
              </h3>
              <p className="text-xs text-slate-500">
                Rekapitulasi tingkat kehadiran siswa per rombel
              </p>
            </div>
            <span className="text-xs px-2.5 py-1 bg-emerald-50 text-emerald-700 font-medium rounded-lg">
              Update Hari Ini
            </span>
          </div>

          <div className="space-y-4">
            {Array.from(classesSet).map((kelasName, idx) => {
              const countInClass = students.filter((s) => s.kelas === kelasName).length;
              return (
                <div key={idx} className="p-4 rounded-xl border border-slate-100 bg-slate-50/50 flex items-center justify-between">
                  <div>
                    <span className="font-bold text-slate-800 text-sm">{kelasName}</span>
                    <p className="text-xs text-slate-500 mt-0.5">{countInClass} Terdaftar</p>
                  </div>
                  <div className="flex items-center gap-4 text-xs font-medium">
                    <div className="flex items-center gap-1 text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-md">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      Hadir: 100%
                    </div>
                    <div className="flex items-center gap-1 text-amber-700 bg-amber-50 px-2.5 py-1 rounded-md">
                      <AlertCircle className="w-3.5 h-3.5" />
                      Izin/Sakit: 0
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Calendar Agenda Widget */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs flex flex-col">
          <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-emerald-700" />
              <h3 className="font-bold text-slate-800 text-sm">Agenda Bulan Ini</h3>
            </div>
            <span className="text-xs text-slate-500 font-medium">
              {currentMonthEfficiency.monthName} {currentMonthEfficiency.year}
            </span>
          </div>

          <div className="space-y-3 flex-1 overflow-y-auto max-h-72">
            {currentMonthEfficiency.eventsInMonth.length > 0 ? (
              currentMonthEfficiency.eventsInMonth.map((evt) => (
                <div
                  key={evt.id}
                  className={`p-3 rounded-xl border text-xs ${
                    evt.type === 'libur'
                      ? 'bg-rose-50 border-rose-200 text-rose-800'
                      : 'bg-amber-50 border-amber-200 text-amber-800'
                  }`}
                >
                  <div className="flex items-center justify-between font-bold mb-1">
                    <span>{evt.title}</span>
                    <span className="text-[10px] px-2 py-0.5 rounded bg-white/60">
                      {evt.date}
                    </span>
                  </div>
                  {evt.description && <p className="opacity-90">{evt.description}</p>}
                </div>
              ))
            ) : (
              <div className="text-center py-8 text-xs text-slate-400">
                Tidak ada agenda khusus bulan ini.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
