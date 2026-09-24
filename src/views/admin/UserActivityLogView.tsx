import React, { useState, useMemo } from 'react';
import { useApp } from '../../context/AppContext';
import { UserActivityLog } from '../../types';
import {
  History,
  Search,
  Filter,
  Download,
  Trash2,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  UserCheck,
  ShieldAlert,
  Activity,
  Layers,
  Clock,
  ChevronLeft,
  ChevronRight,
  FileSpreadsheet,
} from 'lucide-react';
import * as XLSX from 'xlsx';

export const UserActivityLogView: React.FC = () => {
  const { userActivityLogs, clearActivityLogs, currentUser } = useApp();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedModule, setSelectedModule] = useState('Semua');
  const [selectedRole, setSelectedRole] = useState('Semua');
  const [selectedStatus, setSelectedStatus] = useState('Semua');
  const [selectedDateFilter, setSelectedDateFilter] = useState('Semua');
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 15;

  const todayStr = new Date().toISOString().split('T')[0];

  // Modules list
  const availableModules = useMemo(() => {
    const modulesSet = new Set<string>();
    userActivityLogs.forEach((log) => {
      if (log.module) modulesSet.add(log.module);
    });
    return ['Semua', ...Array.from(modulesSet)];
  }, [userActivityLogs]);

  // Filtered logs
  const filteredLogs = useMemo(() => {
    return userActivityLogs.filter((log) => {
      // Search
      const query = searchQuery.toLowerCase();
      const matchesSearch =
        !searchQuery.trim() ||
        log.userName.toLowerCase().includes(query) ||
        log.action.toLowerCase().includes(query) ||
        log.details.toLowerCase().includes(query) ||
        (log.userClass && log.userClass.toLowerCase().includes(query));

      // Module
      const matchesModule = selectedModule === 'Semua' || log.module === selectedModule;

      // Role
      const matchesRole = selectedRole === 'Semua' || log.userRole === selectedRole;

      // Status
      const matchesStatus = selectedStatus === 'Semua' || log.status === selectedStatus;

      // Date
      let matchesDate = true;
      if (selectedDateFilter === 'Hari Ini') {
        matchesDate = log.timestamp.startsWith(todayStr);
      } else if (selectedDateFilter === '7 Hari Terakhir') {
        const logDate = new Date(log.timestamp.split(' ')[0]);
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
        matchesDate = logDate >= sevenDaysAgo;
      }

      return matchesSearch && matchesModule && matchesRole && matchesStatus && matchesDate;
    });
  }, [userActivityLogs, searchQuery, selectedModule, selectedRole, selectedStatus, selectedDateFilter, todayStr]);

  // Summary Metrics
  const metrics = useMemo(() => {
    const total = userActivityLogs.length;
    const todayLogs = userActivityLogs.filter((l) => l.timestamp.startsWith(todayStr));
    const uniqueUsersToday = new Set(todayLogs.map((l) => l.userId)).size;
    const successCount = userActivityLogs.filter((l) => l.status === 'Sukses').length;
    const successRate = total > 0 ? Math.round((successCount / total) * 100) : 100;

    // Most active module
    const moduleCounts: Record<string, number> = {};
    userActivityLogs.forEach((l) => {
      moduleCounts[l.module] = (moduleCounts[l.module] || 0) + 1;
    });
    let topModule = '-';
    let maxCount = 0;
    Object.entries(moduleCounts).forEach(([mod, count]) => {
      if (count > maxCount) {
        maxCount = count;
        topModule = mod;
      }
    });

    return { total, activeUsersToday: uniqueUsersToday, successRate, topModule };
  }, [userActivityLogs, todayStr]);

  // Pagination
  const totalPages = Math.ceil(filteredLogs.length / itemsPerPage) || 1;
  const paginatedLogs = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredLogs.slice(start, start + itemsPerPage);
  }, [filteredLogs, currentPage]);

  const handleExportExcel = () => {
    const exportData = filteredLogs.map((log, idx) => ({
      No: idx + 1,
      Waktu: log.timestamp,
      'ID Pengguna': log.userId,
      'Nama Pengguna': log.userName,
      Role: log.userRole === 'admin' ? 'Administrator' : 'Guru',
      Kelas: log.userClass || '-',
      Modul: log.module,
      Aksi: log.action,
      Detail: log.details,
      Status: log.status,
      'IP Address': log.ipAddress || '127.0.0.1',
    }));

    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Log Aktivitas');
    XLSX.writeFile(wb, `Log_Aktivitas_User_${todayStr}.xlsx`);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'Sukses':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
            Sukses
          </span>
        );
      case 'Peringatan':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
            <AlertTriangle className="w-3 h-3 text-amber-600" />
            Peringatan
          </span>
        );
      case 'Gagal':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
            <XCircle className="w-3 h-3 text-rose-600" />
            Gagal
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-slate-100 text-slate-700 border border-slate-200">
            {status}
          </span>
        );
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Title Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-indigo-950 rounded-2xl p-6 text-white shadow-lg relative overflow-hidden">
        <div className="absolute top-0 right-0 transform translate-x-8 -translate-y-8 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 relative z-10">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-white/10 backdrop-blur-md rounded-full text-xs font-bold text-indigo-200 mb-2 border border-white/10">
              <History className="w-3.5 h-3.5 text-indigo-300" />
              Panel Audit Trail Admin
            </div>
            <h1 className="text-2xl font-black tracking-tight text-white">Log Aktivitas User</h1>
            <p className="text-xs text-slate-300 mt-1 max-w-2xl">
              Catatan sistem otomatis untuk memantau aktivitas login, pengisian presensi, nilai, serta perubahan konfigurasi oleh pengguna.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleExportExcel}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition-all shadow-md flex items-center gap-2 cursor-pointer"
            >
              <FileSpreadsheet className="w-4 h-4" />
              Export Excel
            </button>

            {currentUser?.role === 'admin' && (
              <button
                onClick={() => setShowClearConfirm(true)}
                className="px-3.5 py-2 bg-white/10 hover:bg-rose-600/80 text-slate-200 hover:text-white rounded-xl text-xs font-bold border border-white/10 transition-all flex items-center gap-1.5 cursor-pointer"
                title="Bersihkan Log"
              >
                <Trash2 className="w-4 h-4" />
                Hapus Log
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs flex items-center gap-3">
          <div className="p-3 bg-indigo-50 text-indigo-600 rounded-xl">
            <Activity className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Total Aktivitas</p>
            <p className="text-xl font-black text-slate-900">{metrics.total}</p>
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs flex items-center gap-3">
          <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl">
            <UserCheck className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">User Aktif Hari Ini</p>
            <p className="text-xl font-black text-slate-900">{metrics.activeUsersToday} User</p>
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs flex items-center gap-3">
          <div className="p-3 bg-teal-50 text-teal-600 rounded-xl">
            <CheckCircle2 className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Aktivitas Sukses</p>
            <p className="text-xl font-black text-slate-900">{metrics.successRate}%</p>
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs flex items-center gap-3">
          <div className="p-3 bg-amber-50 text-amber-600 rounded-xl">
            <Layers className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Modul Terbanyak</p>
            <p className="text-sm font-black text-slate-900 truncate max-w-[120px]">{metrics.topModule}</p>
          </div>
        </div>
      </div>

      {/* Filter & Controls Card */}
      <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/80 shadow-xs space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
            <input
              type="text"
              placeholder="Cari nama user, aksi, atau detail aktivitas..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:ring-2 focus:ring-indigo-500 focus:bg-white outline-none transition-all"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Filter Module */}
            <div className="flex items-center gap-1 bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-xl text-xs">
              <Filter className="w-3.5 h-3.5 text-slate-500" />
              <select
                value={selectedModule}
                onChange={(e) => {
                  setSelectedModule(e.target.value);
                  setCurrentPage(1);
                }}
                className="bg-transparent font-bold text-slate-700 outline-none cursor-pointer"
              >
                {availableModules.map((m) => (
                  <option key={m} value={m}>
                    Modul: {m}
                  </option>
                ))}
              </select>
            </div>

            {/* Filter Role */}
            <div className="flex items-center gap-1 bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-xl text-xs">
              <select
                value={selectedRole}
                onChange={(e) => {
                  setSelectedRole(e.target.value);
                  setCurrentPage(1);
                }}
                className="bg-transparent font-bold text-slate-700 outline-none cursor-pointer"
              >
                <option value="Semua">Role: Semua</option>
                <option value="admin">Role: Admin</option>
                <option value="guru">Role: Guru</option>
              </select>
            </div>

            {/* Filter Status */}
            <div className="flex items-center gap-1 bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-xl text-xs">
              <select
                value={selectedStatus}
                onChange={(e) => {
                  setSelectedStatus(e.target.value);
                  setCurrentPage(1);
                }}
                className="bg-transparent font-bold text-slate-700 outline-none cursor-pointer"
              >
                <option value="Semua">Status: Semua</option>
                <option value="Sukses">Status: Sukses</option>
                <option value="Peringatan">Status: Peringatan</option>
                <option value="Gagal">Status: Gagal</option>
              </select>
            </div>

            {/* Filter Date */}
            <div className="flex items-center gap-1 bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-xl text-xs">
              <select
                value={selectedDateFilter}
                onChange={(e) => {
                  setSelectedDateFilter(e.target.value);
                  setCurrentPage(1);
                }}
                className="bg-transparent font-bold text-slate-700 outline-none cursor-pointer"
              >
                <option value="Semua">Waktu: Semua</option>
                <option value="Hari Ini">Waktu: Hari Ini</option>
                <option value="7 Hari Terakhir">Waktu: 7 Hari Terakhir</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Main Table */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-200 text-[11px] font-black uppercase text-slate-500 tracking-wider">
                <th className="py-3.5 px-4 w-40">Waktu & Tanggal</th>
                <th className="py-3.5 px-4 w-52">Pengguna</th>
                <th className="py-3.5 px-4 w-32">Modul</th>
                <th className="py-3.5 px-4">Aksi & Detail Aktivitas</th>
                <th className="py-3.5 px-4 w-28 text-center">Status</th>
                <th className="py-3.5 px-4 w-32 text-slate-400">IP Address</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {paginatedLogs.length > 0 ? (
                paginatedLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-50/60 transition-colors">
                    {/* Timestamp */}
                    <td className="py-3 px-4 text-slate-600 font-mono text-[11px] whitespace-nowrap">
                      <div className="flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span>{log.timestamp}</span>
                      </div>
                    </td>

                    {/* User */}
                    <td className="py-3 px-4">
                      <div>
                        <p className="font-extrabold text-slate-900">{log.userName}</p>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <span
                            className={`px-1.5 py-0.2 rounded text-[10px] font-bold ${
                              log.userRole === 'admin'
                                ? 'bg-amber-100 text-amber-800'
                                : 'bg-emerald-100 text-emerald-800'
                            }`}
                          >
                            {log.userRole === 'admin' ? 'Admin' : 'Guru'}
                          </span>
                          {log.userClass && log.userClass !== '-' && (
                            <span className="text-[10px] text-slate-500 font-medium">
                              ({log.userClass})
                            </span>
                          )}
                        </div>
                      </div>
                    </td>

                    {/* Module */}
                    <td className="py-3 px-4">
                      <span className="inline-block px-2 py-0.5 bg-indigo-50 text-indigo-700 font-bold rounded-md border border-indigo-100 text-[11px]">
                        {log.module}
                      </span>
                    </td>

                    {/* Action & Details */}
                    <td className="py-3 px-4">
                      <p className="font-bold text-slate-800">{log.action}</p>
                      <p className="text-[11px] text-slate-500 mt-0.5 line-clamp-2">{log.details}</p>
                    </td>

                    {/* Status */}
                    <td className="py-3 px-4 text-center">{getStatusBadge(log.status)}</td>

                    {/* IP */}
                    <td className="py-3 px-4 text-slate-400 font-mono text-[11px]">
                      {log.ipAddress || '127.0.0.1'}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-400">
                    <History className="w-10 h-10 mx-auto text-slate-300 mb-2" />
                    <p className="text-sm font-bold text-slate-600">Tidak ada log aktivitas ditemukan</p>
                    <p className="text-xs text-slate-400 mt-1">
                      Coba ubah kata kunci pencarian atau reset filter di atas.
                    </p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Footer */}
        {filteredLogs.length > 0 && (
          <div className="px-4 py-3 bg-slate-50/80 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-600">
            <div>
              Menampilkan <span className="font-bold text-slate-900">{(currentPage - 1) * itemsPerPage + 1}</span> -{' '}
              <span className="font-bold text-slate-900">
                {Math.min(currentPage * itemsPerPage, filteredLogs.length)}
              </span>{' '}
              dari <span className="font-bold text-slate-900">{filteredLogs.length}</span> data log
            </div>

            <div className="flex items-center gap-1">
              <button
                disabled={currentPage === 1}
                onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
                className="p-1.5 rounded-lg border border-slate-200 bg-white disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-100 transition-colors cursor-pointer"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>

              <span className="px-3 font-bold text-slate-700">
                Halaman {currentPage} dari {totalPages}
              </span>

              <button
                disabled={currentPage === totalPages}
                onClick={() => setCurrentPage((p) => Math.min(p + 1, totalPages))}
                className="p-1.5 rounded-lg border border-slate-200 bg-white disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-100 transition-colors cursor-pointer"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Clear Confirm Modal */}
      {showClearConfirm && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center gap-3 text-rose-600">
              <ShieldAlert className="w-8 h-8 shrink-0" />
              <div>
                <h3 className="font-black text-base text-slate-900">Konfirmasi Hapus Riwayat Log</h3>
                <p className="text-xs text-slate-500">Tindakan ini tidak dapat dibatalkan.</p>
              </div>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              Apakah Anda yakin ingin menghapus seluruh catatan log aktivitas user dari sistem? Seluruh histori audit trail akan dikosongkan.
            </p>

            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setShowClearConfirm(false)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-all cursor-pointer"
              >
                Batal
              </button>
              <button
                onClick={() => {
                  clearActivityLogs();
                  setShowClearConfirm(false);
                }}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold transition-all shadow-md cursor-pointer"
              >
                Ya, Hapus Semua Log
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
