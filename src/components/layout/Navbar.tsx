import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { LoginModal } from '../auth/LoginModal';
import {
  BookOpen,
  User as UserIcon,
  LogOut,
  ShieldAlert,
  GraduationCap,
  Sparkles,
  RotateCcw,
} from 'lucide-react';

export const Navbar: React.FC = () => {
  const { currentUser, schoolProfile, activeRole, logout, resetAllData } = useApp();
  const [isLoginOpen, setIsLoginOpen] = useState(false);

  return (
    <>
      <header className="bg-slate-900 text-white border-b border-slate-800 sticky top-0 z-40 shadow-lg">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Left Brand */}
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-500 to-teal-400 p-0.5 shadow-md flex items-center justify-center">
                <div className="w-full h-full bg-slate-900 rounded-[10px] flex items-center justify-center">
                  <BookOpen className="w-5 h-5 text-emerald-400" />
                </div>
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-black text-lg tracking-wider text-emerald-400">
                    KAGUM
                  </span>
                  <span className="text-[10px] uppercase font-bold px-1.5 py-0.5 rounded bg-emerald-950 text-emerald-300 border border-emerald-800/80">
                    v2.5
                  </span>
                </div>
                <p className="text-[11px] text-slate-400 hidden sm:block">
                  Kumpulan Administrasi Guru Madrasah
                </p>
              </div>
            </div>

            {/* School Context & Active Academic Year */}
            <div className="hidden lg:flex items-center gap-3 bg-slate-800/80 px-3.5 py-1.5 rounded-lg border border-slate-700/60 text-xs">
              <GraduationCap className="w-4 h-4 text-emerald-400" />
              <div>
                <span className="font-semibold text-slate-200">
                  {schoolProfile.namaMadrasah}
                </span>
                <span className="text-slate-400 ml-2">
                  TA {schoolProfile.tahunAjaran} ({schoolProfile.semester})
                </span>
              </div>
            </div>

            {/* Right Controls */}
            <div className="flex items-center gap-3">
              {currentUser ? (
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-2 bg-slate-800/90 hover:bg-slate-800 px-3 py-1.5 rounded-xl border border-slate-700/80 text-xs transition-all">
                    {currentUser.avatarUrl ? (
                      <img
                        src={currentUser.avatarUrl}
                        alt={currentUser.name}
                        className="w-7 h-7 rounded-full object-cover border border-emerald-500"
                      />
                    ) : (
                      <div className="w-7 h-7 rounded-full bg-emerald-800 text-emerald-200 flex items-center justify-center font-bold">
                        {currentUser.name.charAt(0)}
                      </div>
                    )}
                    <div className="text-left hidden sm:block">
                      <p className="font-semibold text-slate-100 text-xs">
                        {currentUser.name}
                      </p>
                      <p className="text-[10px] text-slate-400 flex items-center gap-1 capitalize">
                        {activeRole === 'admin' ? (
                          <span className="text-amber-400 font-semibold flex items-center gap-1">
                            <ShieldAlert className="w-3 h-3" /> Admin
                          </span>
                        ) : (
                          <span className="text-teal-400 font-semibold flex items-center gap-1">
                            <Sparkles className="w-3 h-3" /> Guru ({currentUser.kelas})
                          </span>
                        )}
                      </p>
                    </div>
                  </div>

                  <button
                    onClick={() => setIsLoginOpen(true)}
                    className="px-2.5 py-1.5 text-xs font-medium text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-lg border border-slate-700 transition-colors"
                    title="Ganti Peran / Akun"
                  >
                    Ganti Peran
                  </button>

                  <button
                    onClick={logout}
                    className="p-2 text-slate-400 hover:text-rose-400 hover:bg-slate-800 rounded-lg transition-colors"
                    title="Keluar"
                  >
                    <LogOut className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setIsLoginOpen(true)}
                  className="flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs rounded-xl shadow-sm transition-all"
                >
                  <UserIcon className="w-4 h-4" />
                  Masuk Akun
                </button>
              )}

              <button
                onClick={() => {
                  if (confirm('Apakah Anda yakin ingin mengembalikan semua data ke setelan awal pabrik?')) {
                    resetAllData();
                  }
                }}
                className="p-2 text-slate-400 hover:text-amber-400 hover:bg-slate-800 rounded-lg transition-colors"
                title="Reset Data Demo"
              >
                <RotateCcw className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </header>

      <LoginModal isOpen={isLoginOpen} onClose={() => setIsLoginOpen(false)} />
    </>
  );
};
