import React from 'react';
import { useApp } from '../../context/AppContext';
import {
  LayoutDashboard,
  Building2,
  Users,
  Calendar,
  FileText,
  ClipboardCheck,
  Coins,
  UserCheck,
  BookOpenCheck,
  CalendarDays,
  BookMarked as Journal,
  Sparkles,
  Award,
  BookMarked,
  FileSpreadsheet,
  HeartHandshake,
  CreditCard,
  CircleDollarSign,
  ChevronRight,
  ShieldAlert,
  User,
} from 'lucide-react';

export const Sidebar: React.FC = () => {
  const { activeTab, setActiveTab, activeRole, currentUser } = useApp();

  const handleSelect = (tab: string) => {
    setActiveTab(tab);
  };

  const isAdmin = activeRole === 'admin';

  return (
    <aside className="w-full lg:w-64 bg-white border-r border-slate-200 flex flex-col shrink-0 min-h-[calc(100vh-4rem)] shadow-xs">
      {/* Role Banner Indicator */}
      <div className="p-3 bg-slate-50 border-b border-slate-200 flex items-center justify-between text-xs">
        <span className="text-slate-500 font-medium">Mode Tampilan:</span>
        <span
          className={`px-2 py-0.5 rounded-full font-bold uppercase text-[10px] tracking-wide ${
            isAdmin
              ? 'bg-amber-100 text-amber-800 border border-amber-300'
              : 'bg-emerald-100 text-emerald-800 border border-emerald-300'
          }`}
        >
          {isAdmin ? 'ADMINISTRATOR' : 'GURU / USER'}
        </span>
      </div>

      <nav className="p-3 space-y-6 overflow-y-auto flex-1 text-xs">
        {isAdmin ? (
          /* ================= ADMINISTRATOR MENU ================= */
          <>
            <div>
              <p className="px-3 text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">
                UTAMA
              </p>
              <button
                onClick={() => handleSelect('admin-dashboard')}
                className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg font-medium transition-all ${
                  activeTab === 'admin-dashboard'
                    ? 'bg-emerald-800 text-white shadow-sm font-semibold'
                    : 'text-slate-700 hover:bg-slate-100'
                }`}
              >
                <LayoutDashboard className="w-4 h-4" />
                <span>Dashboard Admin</span>
              </button>
            </div>

            <div>
              <p className="px-3 text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">
                B. PENGATURAN
              </p>
              <div className="space-y-1">
                <button
                  onClick={() => handleSelect('admin-school-data')}
                  className={`w-full flex items-center justify-between px-3 py-2 rounded-lg font-medium transition-all ${
                    activeTab === 'admin-school-data'
                      ? 'bg-emerald-800 text-white shadow-sm font-semibold'
                      : 'text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <Building2 className="w-4 h-4" />
                    <span>1. Data Madrasah</span>
                  </div>
                  <ChevronRight className="w-3.5 h-3.5 opacity-60" />
                </button>

                <button
                  onClick={() => handleSelect('admin-user-mgmt')}
                  className={`w-full flex items-center justify-between px-3 py-2 rounded-lg font-medium transition-all ${
                    activeTab === 'admin-user-mgmt'
                      ? 'bg-emerald-800 text-white shadow-sm font-semibold'
                      : 'text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <Users className="w-4 h-4" />
                    <span>2. Manajemen User</span>
                  </div>
                  <ChevronRight className="w-3.5 h-3.5 opacity-60" />
                </button>

                <button
                  onClick={() => handleSelect('admin-calendar')}
                  className={`w-full flex items-center justify-between px-3 py-2 rounded-lg font-medium transition-all ${
                    activeTab === 'admin-calendar'
                      ? 'bg-emerald-800 text-white shadow-sm font-semibold'
                      : 'text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <Calendar className="w-4 h-4" />
                    <span>3. Kalender Pendidikan</span>
                  </div>
                  <ChevronRight className="w-3.5 h-3.5 opacity-60" />
                </button>

                <button
                  onClick={() => handleSelect('admin-kop-logo')}
                  className={`w-full flex items-center justify-between px-3 py-2 rounded-lg font-medium transition-all ${
                    activeTab === 'admin-kop-logo'
                      ? 'bg-emerald-800 text-white shadow-sm font-semibold'
                      : 'text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <FileText className="w-4 h-4" />
                    <span>4. Kop Laporan & Logo</span>
                  </div>
                  <ChevronRight className="w-3.5 h-3.5 opacity-60" />
                </button>
              </div>
            </div>

            <div>
              <p className="px-3 text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">
                C. LAPORAN REKAPITULASI
              </p>
              <div className="space-y-1">
                <button
                  onClick={() => handleSelect('admin-report-attendance')}
                  className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg font-medium transition-all ${
                    activeTab === 'admin-report-attendance'
                      ? 'bg-emerald-800 text-white shadow-sm font-semibold'
                      : 'text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  <ClipboardCheck className="w-4 h-4" />
                  <span>1. Absensi Siswa</span>
                </button>

                <button
                  onClick={() => handleSelect('admin-report-finance')}
                  className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg font-medium transition-all ${
                    activeTab === 'admin-report-finance'
                      ? 'bg-emerald-800 text-white shadow-sm font-semibold'
                      : 'text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  <Coins className="w-4 h-4" />
                  <span>2. Rekap Keuangan</span>
                </button>
              </div>
            </div>
          </>
        ) : (
          /* ================= GURU / USER MENU ================= */
          <>
            <div>
              <p className="px-3 text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">
                UTAMA
              </p>
              <button
                onClick={() => handleSelect('guru-dashboard')}
                className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg font-medium transition-all ${
                  activeTab === 'guru-dashboard'
                    ? 'bg-emerald-800 text-white shadow-sm font-semibold'
                    : 'text-slate-700 hover:bg-slate-100'
                }`}
              >
                <LayoutDashboard className="w-4 h-4" />
                <span>Dashboard Guru</span>
              </button>
            </div>

            <div>
              <p className="px-3 text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">
                B. PENGATURAN
              </p>
              <div className="space-y-1">
                <button
                  onClick={() => handleSelect('guru-profile')}
                  className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg font-medium transition-all ${
                    activeTab === 'guru-profile'
                      ? 'bg-emerald-800 text-white shadow-sm font-semibold'
                      : 'text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  <User className="w-4 h-4" />
                  <span>1. Profil Guru</span>
                </button>

                <button
                  onClick={() => handleSelect('guru-student-data')}
                  className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg font-medium transition-all ${
                    activeTab === 'guru-student-data'
                      ? 'bg-emerald-800 text-white shadow-sm font-semibold'
                      : 'text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  <UserCheck className="w-4 h-4" />
                  <span>Data Siswa</span>
                </button>

                <button
                  onClick={() => handleSelect('guru-subjects')}
                  className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg font-medium transition-all ${
                    activeTab === 'guru-subjects'
                      ? 'bg-emerald-800 text-white shadow-sm font-semibold'
                      : 'text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  <BookOpenCheck className="w-4 h-4" />
                  <span>Mata Pelajaran</span>
                </button>

                <button
                  onClick={() => handleSelect('guru-schedule')}
                  className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg font-medium transition-all ${
                    activeTab === 'guru-schedule'
                      ? 'bg-emerald-800 text-white shadow-sm font-semibold'
                      : 'text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  <CalendarDays className="w-4 h-4" />
                  <span>4. Jadwal Pelajaran</span>
                </button>
              </div>
            </div>

            <div>
              <p className="px-3 text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">
                C. ADMINISTRASI
              </p>
              <div className="space-y-1">
                <button
                  onClick={() => handleSelect('guru-attendance')}
                  className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg font-medium transition-all ${
                    activeTab === 'guru-attendance'
                      ? 'bg-emerald-800 text-white shadow-sm font-semibold'
                      : 'text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  <ClipboardCheck className="w-4 h-4" />
                  <span>1. Absensi Siswa</span>
                </button>

                <button
                  onClick={() => handleSelect('guru-journal')}
                  className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg font-medium transition-all ${
                    activeTab === 'guru-journal'
                      ? 'bg-emerald-800 text-white shadow-sm font-semibold'
                      : 'text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  <Journal className="w-4 h-4" />
                  <span>2. Jurnal Mengajar</span>
                </button>

                <button
                  onClick={() => handleSelect('guru-habits')}
                  className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg font-medium transition-all ${
                    activeTab === 'guru-habits'
                      ? 'bg-emerald-800 text-white shadow-sm font-semibold'
                      : 'text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  <Sparkles className="w-4 h-4 text-amber-500" />
                  <span>7 Kebiasaan</span>
                </button>

                <button
                  onClick={() => handleSelect('guru-assessments')}
                  className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg font-medium transition-all ${
                    activeTab === 'guru-assessments'
                      ? 'bg-emerald-800 text-white shadow-sm font-semibold'
                      : 'text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  <Award className="w-4 h-4" />
                  <span>4. Asesmen & Nilai</span>
                </button>

                <button
                  onClick={() => handleSelect('guru-assessment-analysis')}
                  className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg font-medium transition-all ${
                    activeTab === 'guru-assessment-analysis'
                      ? 'bg-emerald-800 text-white shadow-sm font-semibold'
                      : 'text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  <FileText className="w-4 h-4 text-teal-600" />
                  <span>5. Analisis Asesmen</span>
                </button>

                <button
                  onClick={() => handleSelect('guru-remedial')}
                  className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg font-medium transition-all ${
                    activeTab === 'guru-remedial'
                      ? 'bg-emerald-800 text-white shadow-sm font-semibold'
                      : 'text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  <BookMarked className="w-4 h-4" />
                  <span>6. Remedial</span>
                </button>

                <button
                  onClick={() => handleSelect('guru-tasks')}
                  className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg font-medium transition-all ${
                    activeTab === 'guru-tasks'
                      ? 'bg-emerald-800 text-white shadow-sm font-semibold'
                      : 'text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  <FileSpreadsheet className="w-4 h-4" />
                  <span>7. Tugas Siswa</span>
                </button>
              </div>
            </div>

            <div>
              <p className="px-3 text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">
                D. KEUANGAN
              </p>
              <div className="space-y-1">
                <button
                  onClick={() => handleSelect('guru-dansos')}
                  className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg font-medium transition-all ${
                    activeTab === 'guru-dansos'
                      ? 'bg-emerald-800 text-white shadow-sm font-semibold'
                      : 'text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  <HeartHandshake className="w-4 h-4" />
                  <span>1. Dansos/Infaq Jum'at</span>
                </button>

                <button
                  onClick={() => handleSelect('guru-syahriyah')}
                  className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg font-medium transition-all ${
                    activeTab === 'guru-syahriyah'
                      ? 'bg-emerald-800 text-white shadow-sm font-semibold'
                      : 'text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  <Coins className="w-4 h-4" />
                  <span>2. Syahriyah JQ</span>
                </button>

                <button
                  onClick={() => handleSelect('guru-payments')}
                  className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg font-medium transition-all ${
                    activeTab === 'guru-payments'
                      ? 'bg-emerald-800 text-white shadow-sm font-semibold'
                      : 'text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  <CreditCard className="w-4 h-4" />
                  <span>3. Pembayaran (Angsur)</span>
                </button>

                <button
                  onClick={() => handleSelect('guru-donations')}
                  className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg font-medium transition-all ${
                    activeTab === 'guru-donations'
                      ? 'bg-emerald-800 text-white shadow-sm font-semibold'
                      : 'text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  <CircleDollarSign className="w-4 h-4" />
                  <span>4. Iuran / Sumbangan</span>
                </button>
              </div>
            </div>
          </>
        )}
      </nav>

      {/* Footer Info */}
      <div className="p-3 bg-slate-50 border-t border-slate-200 text-[11px] text-slate-500 text-center">
        <p className="font-semibold text-slate-700">KAGUM MIN 1 Purbalingga</p>
        <p className="text-[10px] text-slate-400 mt-0.5">Sistem Informasi Guru</p>
      </div>
    </aside>
  );
};
