import React, { useState, useEffect, useMemo } from 'react';
import { AppProvider, useApp } from './context/AppContext';
import { LoginView } from './views/auth/LoginView';
import { motion, AnimatePresence } from 'motion/react';

// Admin Views
import { DataMadrasahView } from './views/admin/DataMadrasahView';
import { UserManagementView } from './views/admin/UserManagementView';
import { KalenderPendidikanView } from './views/admin/KalenderPendidikanView';
import { KopLaporanView } from './views/admin/KopLaporanView';
import { AdminLaporanAbsensiView } from './views/admin/AdminLaporanAbsensiView';
import { AdminLaporanKeuanganView } from './views/admin/AdminLaporanKeuanganView';
import { BackupRestoreView } from './views/admin/BackupRestoreView';
import { UpdateAplikasiView } from './views/admin/UpdateAplikasiView';
import { DeployMysqlView } from './views/admin/DeployMysqlView';

// Teacher Views
import { TeacherDashboard } from './views/teacher/TeacherDashboard';
import { ProfileView } from './views/teacher/ProfileView';
import { TeacherKalenderPendidikanView } from './views/teacher/TeacherKalenderPendidikanView';
import { DataSiswaView } from './views/teacher/DataSiswaView';
import { MataPelajaranView } from './views/teacher/MataPelajaranView';
import { JadwalPelajaranView } from './views/teacher/JadwalPelajaranView';
import { AbsensiSiswaView } from './views/teacher/AbsensiSiswaView';
import { JurnalMengajarView } from './views/teacher/JurnalMengajarView';
import { KebiasaanHebatView } from './views/teacher/KebiasaanHebatView';
import { AsesmenNilaiView } from './views/teacher/AsesmenNilaiView';
import { AnalisisAsesmenView } from './views/teacher/AnalisisAsesmenView';
import { RemedialView } from './views/teacher/RemedialView';
import { TugasSiswaView } from './views/teacher/TugasSiswaView';

// Teacher Finance Views
import { DansosInfaqView } from './views/teacher/finance/DansosInfaqView';
import { SyahriyahJQView } from './views/teacher/finance/SyahriyahJQView';
import { PembayaranAngsurView } from './views/teacher/finance/PembayaranAngsurView';
import { IuranSumbanganView } from './views/teacher/finance/IuranSumbanganView';

import {
  Building2,
  Users,
  Calendar,
  FileSignature,
  FileSpreadsheet,
  FileText,
  Wallet,
  LayoutDashboard,
  User as UserIcon,
  GraduationCap,
  BookOpen,
  Clock,
  CheckSquare,
  BookMarked,
  Heart,
  Calculator,
  Award,
  ClipboardList,
  HeartHandshake,
  Coins,
  CreditCard,
  LogOut,
  Menu,
  X,
  ChevronDown,
  ChevronRight,
  Sparkles,
  HardDrive,
  Database,
  RefreshCw,
  Search,
  Bell,
  PanelLeftClose,
  PanelLeftOpen,
  ShieldCheck,
  Home,
  CheckCircle2,
} from 'lucide-react';

interface MenuItem {
  id: string;
  label: string;
  icon: React.ElementType;
  category: string;
  badge?: string;
  role?: 'admin' | 'guru' | 'all';
}

const MENU_ITEMS: MenuItem[] = [
  // Admin
  { id: 'data-madrasah', label: 'Data Profil Madrasah', icon: Building2, category: 'Administrator', role: 'admin' },
  { id: 'user-management', label: 'Kelola Pengguna & Guru', icon: Users, category: 'Administrator', role: 'admin' },
  { id: 'kalender-pendidikan', label: 'Kalender Pendidikan', icon: Calendar, category: 'Administrator', role: 'admin' },
  { id: 'kop-laporan', label: 'Pengaturan Kop Laporan', icon: FileSignature, category: 'Administrator', role: 'admin' },
  { id: 'admin-absensi', label: 'Laporan Rekap Absensi', icon: FileSpreadsheet, category: 'Administrator', role: 'admin' },
  { id: 'admin-keuangan', label: 'Laporan Rekap Keuangan', icon: Wallet, category: 'Administrator', role: 'admin' },
  { id: 'backup-restore', label: 'Backup & Restore Data', icon: HardDrive, category: 'Administrator', role: 'admin' },
  { id: 'update-aplikasi', label: 'Update Aplikasi', icon: RefreshCw, category: 'Administrator', role: 'admin' },
  { id: 'deploy-mysql', label: 'Panduan Deploy MySQL', icon: Database, category: 'Administrator', role: 'admin' },

  // Teacher - Utama
  { id: 'teacher-dashboard', label: 'Dashboard Guru', icon: LayoutDashboard, category: 'Menu Utama', role: 'guru' },
  { id: 'teacher-profile', label: 'Profil Saya', icon: UserIcon, category: 'Menu Utama', role: 'guru' },
  { id: 'teacher-kalender', label: 'Kalender Pendidikan', icon: Calendar, category: 'Menu Utama', role: 'guru' },
  { id: 'data-siswa', label: 'Data Siswa Kelas', icon: GraduationCap, category: 'Menu Utama', role: 'guru' },
  { id: 'mata-pelajaran', label: 'Mata Pelajaran', icon: BookOpen, category: 'Menu Utama', role: 'guru' },
  { id: 'jadwal-pelajaran', label: 'Jadwal Pelajaran', icon: Clock, category: 'Menu Utama', role: 'guru' },

  // Teacher - Administrasi
  { id: 'absensi-siswa', label: 'Absensi Siswa', icon: CheckSquare, category: 'Administrasi Guru', role: 'guru' },
  { id: 'jurnal-mengajar', label: 'Jurnal Mengajar', icon: BookMarked, category: 'Administrasi Guru', role: 'guru' },
  { id: 'kebiasaan-hebat', label: '7 Kebiasaan Karakter', icon: Heart, category: 'Administrasi Guru', badge: 'Gemini AI', role: 'guru' },
  { id: 'guru-assessments', label: 'Daftar Nilai Siswa', icon: Calculator, category: 'Administrasi Guru', role: 'guru' },
  { id: 'guru-assessment-analysis', label: 'Analisis Asesmen', icon: FileText, category: 'Administrasi Guru', role: 'guru' },
  { id: 'guru-remedial', label: 'Program Remedial', icon: Award, category: 'Administrasi Guru', role: 'guru' },
  { id: 'tugas-siswa', label: 'Penugasan Siswa', icon: ClipboardList, category: 'Administrasi Guru', role: 'guru' },

  // Teacher - Keuangan
  { id: 'dansos-infaq', label: 'Dansos & Infaq Jum\'at', icon: HeartHandshake, category: 'Keuangan Kelas', role: 'guru' },
  { id: 'syahriyah-jq', label: 'Syahriyah JQ', icon: Coins, category: 'Keuangan Kelas', role: 'guru' },
  { id: 'pembayaran-angsur', label: 'Pembayaran Angsuran', icon: CreditCard, category: 'Keuangan Kelas', role: 'guru' },
  { id: 'iuran-sumbangan', label: 'Iuran & Sumbangan', icon: Wallet, category: 'Keuangan Kelas', role: 'guru' },
];

const MainLayout: React.FC = () => {
  const { currentUser, setCurrentUser, schoolProfile, activeTab, setActiveTab, attendanceRecords, students } = useApp();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchFocused, setSearchFocused] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [profileDropdownOpen, setProfileDropdownOpen] = useState(false);
  const [currentTime, setCurrentTime] = useState('');

  useEffect(() => {
    const updateClock = () => {
      const now = new Date();
      const formattedTime = now.toLocaleTimeString('id-ID', {
        timeZone: 'Asia/Jakarta',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false,
      }).replace(/\./g, ':');
      setCurrentTime(`${formattedTime} WIB`);
    };

    updateClock();
    const interval = setInterval(updateClock, 1000);
    return () => clearInterval(interval);
  }, []);

  const userRole = currentUser?.role === 'admin' ? 'admin' : 'guru';

  const visibleMenuItems = useMemo(() => {
    return MENU_ITEMS.filter((item) => item.role === userRole || item.role === 'all');
  }, [userRole]);

  const searchResults = useMemo(() => {
    if (!searchQuery.trim()) return [];
    const query = searchQuery.toLowerCase();
    return visibleMenuItems.filter(
      (item) => item.label.toLowerCase().includes(query) || item.category.toLowerCase().includes(query)
    );
  }, [searchQuery, visibleMenuItems]);

  // Group items by category
  const categories = useMemo(() => {
    const cats: Record<string, MenuItem[]> = {};
    visibleMenuItems.forEach((item) => {
      if (!cats[item.category]) cats[item.category] = [];
      cats[item.category].push(item);
    });
    return cats;
  }, [visibleMenuItems]);

  if (!currentUser) {
    return <LoginView />;
  }

  const activeMenuItem = visibleMenuItems.find((m) => m.id === activeTab) || visibleMenuItems[0];

  const todayStr = new Date().toISOString().split('T')[0];
  const teacherClass = currentUser.kelas || 'Kelas IA';
  const myStudents = students.filter((s) => s.kelas === teacherClass);
  const todayAttendance = attendanceRecords.filter((r) => r.date === todayStr && r.kelas === teacherClass);
  const isAttendanceDone = todayAttendance.length > 0;

  const handleLogoutClick = () => {
    setShowLogoutModal(true);
  };

  const confirmLogout = () => {
    setShowLogoutModal(false);
    setCurrentUser(null);
  };

  const renderAdminContent = () => {
    switch (activeTab) {
      case 'data-madrasah':
        return <DataMadrasahView />;
      case 'user-management':
        return <UserManagementView />;
      case 'kalender-pendidikan':
        return <KalenderPendidikanView />;
      case 'kop-laporan':
        return <KopLaporanView />;
      case 'admin-absensi':
        return <AdminLaporanAbsensiView />;
      case 'admin-keuangan':
        return <AdminLaporanKeuanganView />;
      case 'backup-restore':
        return <BackupRestoreView />;
      case 'update-aplikasi':
        return <UpdateAplikasiView />;
      case 'deploy-mysql':
        return <DeployMysqlView />;
      default:
        return <DataMadrasahView />;
    }
  };

  const renderTeacherContent = () => {
    switch (activeTab) {
      case 'teacher-dashboard':
        return <TeacherDashboard />;
      case 'teacher-profile':
        return <ProfileView />;
      case 'teacher-kalender':
        return <TeacherKalenderPendidikanView />;
      case 'data-siswa':
        return <DataSiswaView />;
      case 'mata-pelajaran':
        return <MataPelajaranView />;
      case 'jadwal-pelajaran':
        return <JadwalPelajaranView />;
      case 'absensi-siswa':
        return <AbsensiSiswaView />;
      case 'jurnal-mengajar':
        return <JurnalMengajarView />;
      case 'kebiasaan-hebat':
        return <KebiasaanHebatView />;
      case 'asesmen-nilai':
      case 'guru-assessments':
        return <AsesmenNilaiView />;
      case 'guru-assessment-analysis':
      case 'analisis-asesmen':
        return <AnalisisAsesmenView />;
      case 'remedial':
      case 'guru-remedial':
        return <RemedialView />;
      case 'tugas-siswa':
      case 'guru-tasks':
        return <TugasSiswaView />;
      case 'dansos-infaq':
        return <DansosInfaqView />;
      case 'syahriyah-jq':
        return <SyahriyahJQView />;
      case 'pembayaran-angsur':
        return <PembayaranAngsurView />;
      case 'iuran-sumbangan':
        return <IuranSumbanganView />;
      default:
        return <TeacherDashboard />;
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans text-slate-900 selection:bg-emerald-500/20 selection:text-emerald-950">
      {/* Executive Top Glass Header */}
      <header className="sticky top-0 z-40 bg-white/90 backdrop-blur-md border-b border-slate-200/80 shadow-xs print:hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
          
          {/* Left: Mobile Toggle & Brand Identity */}
          <div className="flex items-center gap-3 shrink-0">
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="lg:hidden p-2 rounded-xl text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>

            <button
              onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
              className="hidden lg:flex p-2 rounded-xl text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition-colors cursor-pointer"
              title={sidebarCollapsed ? "Buka Sidebar" : "Kecilkan Sidebar"}
            >
              {sidebarCollapsed ? <PanelLeftOpen className="w-5 h-5" /> : <PanelLeftClose className="w-5 h-5" />}
            </button>

            <div className="flex items-center gap-2.5 cursor-pointer" onClick={() => setActiveTab(userRole === 'admin' ? 'data-madrasah' : 'teacher-dashboard')}>
              <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-emerald-600 via-teal-500 to-amber-500 p-0.5 shadow-md flex items-center justify-center shrink-0">
                {schoolProfile.logoUrl ? (
                  <img src={schoolProfile.logoUrl} alt="Logo" className="w-full h-full object-contain rounded-[10px] bg-white p-0.5" />
                ) : (
                  <div className="w-full h-full bg-slate-900 rounded-[10px] flex items-center justify-center font-black text-white text-base">
                    K
                  </div>
                )}
              </div>
              <div className="hidden sm:block">
                <div className="flex items-center gap-1.5">
                  <span className="font-black text-base tracking-tight text-slate-900">KAGUM</span>
                  <span className="text-[10px] bg-emerald-100 text-emerald-800 border border-emerald-300/80 font-extrabold px-2 py-0.2 rounded-full">
                    Executive
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 font-medium truncate max-w-[200px] lg:max-w-[280px]">
                  {schoolProfile.namaMadrasah}
                </p>
              </div>
            </div>
          </div>

          {/* Middle: Quick Search Navigation */}
          <div className="relative flex-1 max-w-md hidden md:block">
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-2.5 pointer-events-none" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onFocus={() => setSearchFocused(true)}
                onBlur={() => setTimeout(() => setSearchFocused(false), 200)}
                placeholder="Cari fitur atau menu (misal: Absensi, Infaq, Nilai)..."
                className="w-full pl-9 pr-8 py-2 text-xs bg-slate-100/80 border border-slate-200/80 rounded-xl text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white transition-all"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 top-2 text-slate-400 hover:text-slate-600"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Quick Search Dropdown */}
            {searchFocused && searchResults.length > 0 && (
              <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-slate-200 rounded-2xl shadow-xl p-2 z-50 space-y-1 max-h-64 overflow-y-auto">
                <p className="text-[10px] font-bold uppercase text-slate-400 px-3 py-1">Hasil Pencarian Menu:</p>
                {searchResults.map((item) => {
                  const Icon = item.icon;
                  return (
                    <button
                      key={item.id}
                      onClick={() => {
                        setActiveTab(item.id);
                        setSearchQuery('');
                      }}
                      className="w-full flex items-center justify-between p-2.5 rounded-xl hover:bg-emerald-50 text-left transition-colors cursor-pointer group"
                    >
                      <div className="flex items-center gap-2.5">
                        <div className="p-1.5 rounded-lg bg-emerald-100 text-emerald-700 group-hover:bg-emerald-600 group-hover:text-white transition-colors">
                          <Icon className="w-4 h-4" />
                        </div>
                        <div>
                          <p className="text-xs font-bold text-slate-800 group-hover:text-emerald-950">{item.label}</p>
                          <p className="text-[10px] text-slate-400">{item.category}</p>
                        </div>
                      </div>
                      <ChevronRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-emerald-600" />
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Right Controls */}
          <div className="flex items-center gap-2 sm:gap-3">
            {/* Academic Year Pill */}
            <div className="hidden xl:flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-100 border border-slate-200/80 text-xs font-bold text-slate-700">
              <GraduationCap className="w-4 h-4 text-emerald-600" />
              <span>TA {schoolProfile.tahunAjaran} ({schoolProfile.semester})</span>
            </div>

            {/* Notifications Popover Toggle */}
            <div className="relative">
              <button
                onClick={() => setNotificationsOpen(!notificationsOpen)}
                className="p-2 rounded-xl text-slate-600 hover:text-slate-900 hover:bg-slate-100 border border-slate-200/60 transition-colors relative cursor-pointer"
                title="Pemberitahuan"
              >
                <Bell className="w-4 h-4" />
                {!isAttendanceDone && userRole === 'guru' && (
                  <span className="absolute top-1 right-1 w-2.5 h-2.5 bg-amber-500 rounded-full ring-2 ring-white animate-pulse" />
                )}
              </button>

              {notificationsOpen && (
                <div className="absolute right-0 mt-2 w-72 sm:w-80 bg-white border border-slate-200 rounded-2xl shadow-xl p-4 z-50 space-y-3">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                    <span className="font-extrabold text-xs text-slate-800">Notifikasi System</span>
                    <span className="text-[10px] text-emerald-600 font-bold bg-emerald-50 px-2 py-0.5 rounded-full">Baru</span>
                  </div>
                  <div className="space-y-2 text-xs">
                    {!isAttendanceDone && userRole === 'guru' ? (
                      <div
                        onClick={() => {
                          setActiveTab('absensi-siswa');
                          setNotificationsOpen(false);
                        }}
                        className="p-3 bg-amber-50 border border-amber-200/80 rounded-xl cursor-pointer hover:bg-amber-100/80 transition-colors"
                      >
                        <p className="font-bold text-amber-900 flex items-center gap-1.5">
                          <Bell className="w-3.5 h-3.5 text-amber-600" /> Absensi Hari Ini Chưa Diisi
                        </p>
                        <p className="text-[11px] text-amber-800 mt-1">
                          Klik untuk langsung mengisi presensi siswa kelas {teacherClass}.
                        </p>
                      </div>
                    ) : (
                      <div className="p-3 bg-emerald-50 border border-emerald-200/80 rounded-xl">
                        <p className="font-bold text-emerald-900 flex items-center gap-1.5">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> Presensi Kelas Terisi
                        </p>
                        <p className="text-[11px] text-emerald-800 mt-1">
                          Presensi siswa hari ini ({todayStr}) telah lengkap tercatat.
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Profile Dropdown Badge */}
            <div className="relative">
              <button
                onClick={() => setProfileDropdownOpen(!profileDropdownOpen)}
                className="flex items-center gap-2 p-1.5 rounded-xl hover:bg-slate-100 border border-slate-200/80 transition-all cursor-pointer"
              >
                {currentUser.avatarUrl ? (
                  <img
                    src={currentUser.avatarUrl}
                    alt={currentUser.name}
                    className="w-8 h-8 rounded-lg object-cover border border-emerald-500 shadow-xs"
                  />
                ) : (
                  <div className="w-8 h-8 rounded-lg bg-emerald-600 text-white font-black text-xs flex items-center justify-center shadow-xs">
                    {currentUser.name ? currentUser.name.charAt(0).toUpperCase() : 'U'}
                  </div>
                )}
                <div className="hidden sm:flex flex-col text-left">
                  <span className="text-xs font-bold text-slate-900 leading-tight">
                    {currentUser.name}
                  </span>
                  <span className="text-[10px] text-emerald-700 font-extrabold flex items-center gap-1">
                    {userRole === 'admin' ? (
                      <span className="text-amber-600 font-bold">Admin Utama</span>
                    ) : (
                      `Wali Kelas ${currentUser.kelas}`
                    )}
                  </span>
                </div>
                <ChevronDown className="w-3.5 h-3.5 text-slate-400 hidden sm:block" />
              </button>

              {profileDropdownOpen && (
                <div className="absolute right-0 mt-2 w-56 bg-white border border-slate-200 rounded-2xl shadow-xl p-2 z-50 space-y-1">
                  <div className="p-3 border-b border-slate-100">
                    <p className="text-xs font-black text-slate-900">{currentUser.name}</p>
                    <p className="text-[11px] text-slate-500">{currentUser.email}</p>
                    <span className="inline-block mt-1 px-2 py-0.5 bg-slate-100 text-slate-700 text-[10px] font-bold rounded-md">
                      NIP/NIK: {currentUser.nip || '-'}
                    </span>
                  </div>

                  {userRole !== 'admin' && (
                    <button
                      onClick={() => {
                        setActiveTab('teacher-profile');
                        setProfileDropdownOpen(false);
                      }}
                      className="w-full flex items-center gap-2 px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer text-left"
                    >
                      <UserIcon className="w-4 h-4 text-emerald-600" /> Profil Saya
                    </button>
                  )}

                  <button
                    onClick={() => {
                      setProfileDropdownOpen(false);
                      handleLogoutClick();
                    }}
                    className="w-full flex items-center gap-2 px-3 py-2 text-xs font-bold text-rose-600 hover:bg-rose-50 rounded-xl transition-colors cursor-pointer text-left"
                  >
                    <LogOut className="w-4 h-4" /> Keluar Aplikasi
                  </button>
                </div>
              )}
            </div>

          </div>
        </div>
      </header>

      {/* Main Body Layout */}
      <div className="flex-1 max-w-7xl w-full mx-auto flex items-start">
        
        {/* Modern Sidebar Navigation */}
        <aside
          className={`fixed inset-y-0 left-0 z-30 bg-white border-r border-slate-200/80 text-slate-700 transform transition-all duration-300 ease-in-out lg:static lg:translate-x-0 pt-16 lg:pt-0 print:hidden ${
            sidebarCollapsed ? 'lg:w-20' : 'lg:w-64'
          } ${mobileMenuOpen ? 'translate-x-0 w-72 shadow-2xl' : '-translate-x-full'}`}
        >
          <div className="h-full flex flex-col justify-between overflow-y-auto p-3 sm:p-4 space-y-4">
            
            <div className="space-y-5">
              {(Object.entries(categories) as [string, MenuItem[]][]).map(([categoryName, items]) => (
                <div key={categoryName} className="space-y-1">
                  {!sidebarCollapsed && (
                    <p className="px-3 text-[10px] font-black uppercase text-slate-400 tracking-wider mb-2 text-left">
                      {categoryName}
                    </p>
                  )}
                  {items.map((item) => {
                    const Icon = item.icon;
                    const isActive = activeTab === item.id;
                    return (
                      <button
                        key={item.id}
                        onClick={() => {
                          setActiveTab(item.id);
                          setMobileMenuOpen(false);
                        }}
                        title={sidebarCollapsed ? item.label : undefined}
                        className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all text-left cursor-pointer ${
                          isActive
                            ? 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-md shadow-emerald-950/20'
                            : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                        }`}
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-white' : 'text-slate-500'}`} />
                          {!sidebarCollapsed && <span className="truncate">{item.label}</span>}
                        </div>
                        {!sidebarCollapsed && item.badge && (
                          <span className="text-[9px] bg-amber-400/20 text-amber-700 border border-amber-400/30 font-extrabold px-1.5 py-0.5 rounded-full flex items-center gap-0.5 shrink-0">
                            <Sparkles className="w-2.5 h-2.5 text-amber-500" />
                            {item.badge}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              ))}
            </div>

            {/* Bottom Profile Info Box */}
            {!sidebarCollapsed && (
              <div className="p-3.5 bg-slate-50 border border-slate-200/80 rounded-2xl text-[11px] text-slate-500 space-y-1">
                <p className="font-extrabold text-slate-800">{schoolProfile.namaMadrasah}</p>
                <p className="text-[10px] text-slate-500 line-clamp-1">{schoolProfile.alamatMadrasah}</p>
                <p className="text-[10px] text-emerald-700 font-bold pt-1 border-t border-slate-200/60 mt-1">
                  KAGUM Executive &copy; {new Date().getFullYear()}
                </p>
              </div>
            )}
          </div>
        </aside>

        {/* Content View Area */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 min-w-0 overflow-y-auto print:p-0 print:overflow-visible print:w-full print:max-w-none">
          {/* Breadcrumb Header */}
          <div className="mb-5 flex flex-col sm:flex-row sm:items-center justify-between gap-2 print:hidden">
            <div className="flex items-center gap-2 text-xs text-slate-500">
              <button onClick={() => setActiveTab(userRole === 'admin' ? 'data-madrasah' : 'teacher-dashboard')} className="hover:text-emerald-700 transition-colors flex items-center gap-1 font-bold">
                <Home className="w-3.5 h-3.5" /> Beranda
              </button>
              <ChevronRight className="w-3.5 h-3.5 text-slate-300" />
              <span className="text-slate-400 font-medium">{activeMenuItem?.category}</span>
              <ChevronRight className="w-3.5 h-3.5 text-slate-300" />
              <span className="font-bold text-slate-800">{activeMenuItem?.label}</span>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <span className="text-[11px] text-slate-700 font-semibold bg-white border border-slate-200/80 px-2.5 py-1 rounded-lg shadow-2xs flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                {new Date().toLocaleDateString('id-ID', { timeZone: 'Asia/Jakarta', weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
              </span>
              <span className="text-[11px] text-emerald-800 font-bold bg-emerald-50 border border-emerald-200/80 px-2.5 py-1 rounded-lg shadow-2xs flex items-center gap-1.5 font-mono">
                <Clock className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                {currentTime || '00:00:00 WIB'}
              </span>
            </div>
          </div>

          {/* Animated View Container */}
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.2 }}
            >
              {userRole === 'admin' ? renderAdminContent() : renderTeacherContent()}
            </motion.div>
          </AnimatePresence>
        </main>
      </div>

      {/* Global Application Footer */}
      <footer className="bg-white border-t border-slate-200/80 py-4 px-4 sm:px-6 lg:px-8 text-xs text-slate-500 print:hidden mt-auto shadow-2xs">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2">
          <div className="text-left font-medium text-slate-500">
            Copyright &copy; {new Date().getFullYear()} {schoolProfile.namaMadrasah || 'KAGUM'}. Hak Cipta Dilindungi Undang-Undang.
          </div>
          <div className="text-right font-semibold text-slate-600 flex items-center gap-1">
            Made with <Heart className="w-3.5 h-3.5 text-rose-500 fill-rose-500 inline" /> by{' '}
            <a
              href="https://wa.me/6285227200456"
              target="_blank"
              rel="noopener noreferrer"
              className="font-bold text-emerald-600 hover:text-emerald-700 hover:underline"
            >
              Kurniawan
            </a>
          </div>
        </div>
      </footer>

      {/* Logout Confirmation Modal */}
      {showLogoutModal && (
        <div
          id="logout-confirmation-modal"
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-xs p-4"
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white border border-slate-200 rounded-3xl p-6 max-w-sm w-full space-y-5 text-center shadow-2xl text-slate-800"
          >
            <div className="w-12 h-12 bg-rose-100 text-rose-600 rounded-2xl flex items-center justify-center mx-auto border border-rose-200">
              <LogOut className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-base font-black text-slate-900">Konfirmasi Keluar</h3>
              <p className="text-xs text-slate-500 mt-1">
                Apakah Anda yakin ingin keluar dari akun {currentUser.name}?
              </p>
            </div>
            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowLogoutModal(false)}
                className="flex-1 py-2.5 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition-colors cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={confirmLogout}
                className="flex-1 py-2.5 px-4 bg-rose-600 hover:bg-rose-500 text-white font-extrabold text-xs rounded-xl shadow-md shadow-rose-900/20 transition-colors cursor-pointer"
              >
                Ya, Keluar
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
};

export default function App() {
  return (
    <AppProvider>
      <MainLayout />
    </AppProvider>
  );
}

