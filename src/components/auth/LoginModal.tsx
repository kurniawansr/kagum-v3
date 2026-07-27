import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { initialUsers } from '../../data/initialData';
import { User } from '../../types';
import { ShieldCheck, UserCheck, Key, Mail, Lock, X } from 'lucide-react';

interface LoginModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const LoginModal: React.FC<LoginModalProps> = ({ isOpen, onClose }) => {
  const { users, setCurrentUser, setActiveTab } = useApp();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const findUser = (inputEmail: string, inputPass?: string): User | undefined => {
    const cleanEmail = inputEmail.trim().toLowerCase();
    const usernamePrefix = cleanEmail.split('@')[0];
    const allUsersList = [...(users || []), ...initialUsers];

    if (inputPass) {
      const cleanPass = inputPass.trim();

      let found = allUsersList.find(
        (u) => u.nip && u.nip.trim() === inputEmail.trim() && u.password === cleanPass
      );
      if (found) return found;

      found = allUsersList.find(
        (u) => u.email.toLowerCase() === cleanEmail && u.password === cleanPass
      );
      if (found) return found;

      found = allUsersList.find((u) => {
        const uPrefix = u.email.toLowerCase().split('@')[0];
        return uPrefix === usernamePrefix && u.password === cleanPass;
      });
      if (found) return found;
    } else {
      let found = allUsersList.find((u) => u.email.toLowerCase() === cleanEmail);
      if (found) return found;

      found = allUsersList.find((u) => u.email.toLowerCase().split('@')[0] === usernamePrefix);
      if (found) return found;
    }

    if (usernamePrefix.includes('admin') || usernamePrefix.includes('kagum')) {
      return allUsersList.find((u) => u.role === 'admin');
    }
    if (usernamePrefix.includes('guru') || usernamePrefix.includes('sulis')) {
      return allUsersList.find((u) => u.role === 'guru');
    }

    return undefined;
  };

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    const found = findUser(email, password);

    if (found) {
      setCurrentUser(found);
      setActiveTab(found.role === 'admin' ? 'admin-dashboard' : 'guru-dashboard');
      setError('');
      onClose();
    } else {
      setError('Email atau password tidak cocok!');
    }
  };

  const quickLogin = (userEmail: string) => {
    const target = findUser(userEmail);
    if (target) {
      setCurrentUser(target);
      setActiveTab(target.role === 'admin' ? 'admin-dashboard' : 'guru-dashboard');
      setError('');
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-100 w-full max-w-md overflow-hidden relative animate-in fade-in zoom-in duration-200">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="p-6 bg-gradient-to-br from-emerald-800 to-teal-900 text-white">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-700/50 text-emerald-200 text-xs font-semibold mb-3">
            <Lock className="w-3.5 h-3.5" /> Akses Sistem Multi-Peran
          </div>
          <h3 className="text-xl font-extrabold">Masuk ke KAGUM</h3>
          <p className="text-xs text-emerald-100/80 mt-1">
            Kumpulan Administrasi Guru Madrasah
          </p>
        </div>

        <div className="p-6 space-y-5">
          {error && (
            <div className="p-3 text-xs bg-rose-50 border border-rose-200 text-rose-700 rounded-lg">
              {error}
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Alamat Email
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="email@madrasah.id"
                  className="w-full pl-9 pr-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-600"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Kata Sandi
              </label>
              <div className="relative">
                <Key className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-9 pr-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-600"
                  required
                />
              </div>
            </div>

            <button
              type="submit"
              className="w-full py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white font-semibold text-sm rounded-lg shadow-md transition-colors"
            >
              Masuk Akun
            </button>
          </form>

          <div className="pt-4 border-t border-slate-100">
            <p className="text-xs text-slate-500 font-medium mb-2 text-center">
              Atau masuk cepat demo per peran:
            </p>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => quickLogin('admin@madrasah.id')}
                className="flex items-center justify-center gap-2 px-3 py-2 text-xs font-semibold text-emerald-800 bg-emerald-50 border border-emerald-200 rounded-lg hover:bg-emerald-100 transition-colors"
              >
                <ShieldCheck className="w-4 h-4 text-emerald-600" />
                Administrator
              </button>
              <button
                type="button"
                onClick={() => quickLogin('sulis@madrasah.id')}
                className="flex items-center justify-center gap-2 px-3 py-2 text-xs font-semibold text-teal-800 bg-teal-50 border border-teal-200 rounded-lg hover:bg-teal-100 transition-colors"
              >
                <UserCheck className="w-4 h-4 text-teal-600" />
                Guru (Sulis)
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
