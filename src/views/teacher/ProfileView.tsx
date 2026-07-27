import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { User as UserType } from '../../types';
import { User as UserIcon, Save, Key, Upload, CheckCircle2, ShieldCheck } from 'lucide-react';

export const ProfileView: React.FC = () => {
  const { currentUser, setCurrentUser, users, setUsers } = useApp();

  const [profileForm, setProfileForm] = useState({
    name: currentUser?.name || '',
    nip: currentUser?.nip || '',
    kelas: currentUser?.kelas || '',
    email: currentUser?.email || '',
    avatarUrl: currentUser?.avatarUrl || '',
    gender: currentUser?.gender || 'Laki-laki',
    birthPlace: currentUser?.birthPlace || '',
    birthDate: currentUser?.birthDate || '',
  });

  const [passwordForm, setPasswordForm] = useState({
    oldPassword: '',
    newPassword: '',
    confirmPassword: '',
  });

  const [profileMsg, setProfileMsg] = useState('');
  const [passwordMsg, setPasswordMsg] = useState('');
  const [passwordError, setPasswordError] = useState('');

  const handleProfileSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) return;

    const updatedUser: UserType = {
      ...currentUser,
      name: profileForm.name,
      nip: profileForm.nip,
      kelas: profileForm.kelas,
      email: profileForm.email,
      avatarUrl: profileForm.avatarUrl,
      gender: profileForm.gender as 'Laki-laki' | 'Perempuan',
      birthPlace: profileForm.birthPlace,
      birthDate: profileForm.birthDate,
    };

    setCurrentUser(updatedUser);
    setUsers(users.map((u) => (u.id === currentUser.id ? updatedUser : u)));

    setProfileMsg('Identitas profil berhasil diperbarui dan tersimpan ke data administrator!');
    setTimeout(() => setProfileMsg(''), 3000);
  };

  const handlePasswordSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) return;

    if (passwordForm.oldPassword !== currentUser.password) {
      setPasswordError('Kata sandi lama tidak sesuai!');
      return;
    }

    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      setPasswordError('Konfirmasi kata sandi tidak cocok!');
      return;
    }

    if (passwordForm.newPassword.length < 4) {
      setPasswordError('Kata sandi minimal 4 karakter.');
      return;
    }

    const updatedUser = { ...currentUser, password: passwordForm.newPassword };
    setCurrentUser(updatedUser);
    setUsers(users.map((u) => (u.id === currentUser.id ? updatedUser : u)));

    setPasswordError('');
    setPasswordMsg('Kata sandi berhasil diubah!');
    setPasswordForm({ oldPassword: '', newPassword: '', confirmPassword: '' });
    setTimeout(() => setPasswordMsg(''), 3000);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Profile Form */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs">
        <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center font-bold">
              <UserIcon className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-800">Profil Identitas Guru</h2>
              <p className="text-xs text-slate-500">
                Kelola identitas diri, foto profil, dan informasi pengampuan kelas
              </p>
            </div>
          </div>
          <span className="px-3 py-1 bg-emerald-100 text-emerald-800 border border-emerald-200 rounded-full font-bold text-xs uppercase">
            {currentUser?.role}
          </span>
        </div>

        {profileMsg && (
          <div className="mb-4 p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs flex items-center gap-2 font-medium">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            {profileMsg}
          </div>
        )}

        <form onSubmit={handleProfileSubmit} className="space-y-5">
          <div className="flex flex-col sm:flex-row items-center gap-6 p-4 bg-slate-50 border border-slate-200 rounded-2xl">
            <img
              src={
                profileForm.avatarUrl ||
                'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&q=80&w=200'
              }
              alt="Foto Profil"
              className="w-24 h-24 rounded-2xl object-cover border-2 border-emerald-600 shadow-md shrink-0"
            />
            <div className="flex-1 space-y-2 text-center sm:text-left">
              <label className="block text-xs font-bold text-slate-700">
                Foto Profil Guru
              </label>
              <div className="flex items-center gap-3">
                <label className="cursor-pointer inline-flex items-center gap-2 px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs rounded-xl shadow-xs transition-colors">
                  <Upload className="w-4 h-4" />
                  Pilih & Unggah Foto
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        const reader = new FileReader();
                        reader.onloadend = () => {
                          setProfileForm({ ...profileForm, avatarUrl: reader.result as string });
                        };
                        reader.readAsDataURL(file);
                      }
                    }}
                  />
                </label>
                {profileForm.avatarUrl && (
                  <button
                    type="button"
                    onClick={() => setProfileForm({ ...profileForm, avatarUrl: '' })}
                    className="px-3 py-2 text-xs font-semibold text-rose-600 hover:bg-rose-50 border border-rose-200 rounded-xl transition-colors"
                  >
                    Hapus Foto
                  </button>
                )}
              </div>
              <p className="text-[11px] text-slate-500">
                Unggah berkas foto (.jpg, .png, .jpeg) langsung dari perangkat Anda.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Nama Lengkap & Gelar</label>
              <input
                type="text"
                value={profileForm.name}
                onChange={(e) => setProfileForm({ ...profileForm, name: e.target.value })}
                className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-600"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">NIP / NIK Guru</label>
              <input
                type="text"
                value={profileForm.nip}
                onChange={(e) => setProfileForm({ ...profileForm, nip: e.target.value })}
                className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-600"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Kelas Pengampuan / Rombel</label>
              <input
                type="text"
                value={profileForm.kelas}
                onChange={(e) => setProfileForm({ ...profileForm, kelas: e.target.value })}
                className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-600"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Jenis Kelamin</label>
              <select
                value={profileForm.gender}
                onChange={(e) => setProfileForm({ ...profileForm, gender: e.target.value as any })}
                className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-600 bg-white"
              >
                <option value="Laki-laki">Laki-laki</option>
                <option value="Perempuan">Perempuan</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Tempat Lahir</label>
              <input
                type="text"
                value={profileForm.birthPlace}
                onChange={(e) => setProfileForm({ ...profileForm, birthPlace: e.target.value })}
                placeholder="Contoh: Purbalingga"
                className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-600"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Tanggal Lahir</label>
              <input
                type="date"
                value={profileForm.birthDate}
                onChange={(e) => setProfileForm({ ...profileForm, birthDate: e.target.value })}
                className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-600"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Email Pengguna</label>
              <input
                type="email"
                value={profileForm.email}
                onChange={(e) => setProfileForm({ ...profileForm, email: e.target.value })}
                className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-600"
                required
              />
            </div>
          </div>

          <div className="flex justify-end pt-2">
            <button
              type="submit"
              className="flex items-center gap-2 px-5 py-2.5 bg-emerald-800 hover:bg-emerald-900 text-white font-semibold text-xs rounded-xl shadow-md transition-colors"
            >
              <Save className="w-4 h-4" />
              Simpan Identitas Profil
            </button>
          </div>
        </form>
      </div>

      {/* Password Change Form */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs">
        <div className="flex items-center gap-3 pb-4 border-b border-slate-100 mb-6">
          <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center font-bold">
            <Key className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-800">Form Ganti Password Akun</h2>
            <p className="text-xs text-slate-500">
              Perbarui kata sandi akun Anda secara berkala untuk menjaga keamanan data
            </p>
          </div>
        </div>

        {passwordMsg && (
          <div className="mb-4 p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs flex items-center gap-2 font-medium">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            {passwordMsg}
          </div>
        )}

        {passwordError && (
          <div className="mb-4 p-3 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl text-xs flex items-center gap-2 font-medium">
            {passwordError}
          </div>
        )}

        <form onSubmit={handlePasswordSubmit} className="space-y-4 max-w-xl">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Kata Sandi Saat Ini</label>
            <input
              type="password"
              value={passwordForm.oldPassword}
              onChange={(e) => setPasswordForm({ ...passwordForm, oldPassword: e.target.value })}
              className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-600"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Kata Sandi Baru</label>
            <input
              type="password"
              value={passwordForm.newPassword}
              onChange={(e) => setPasswordForm({ ...passwordForm, newPassword: e.target.value })}
              className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-600"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Konfirmasi Kata Sandi Baru</label>
            <input
              type="password"
              value={passwordForm.confirmPassword}
              onChange={(e) => setPasswordForm({ ...passwordForm, confirmPassword: e.target.value })}
              className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-600"
              required
            />
          </div>

          <div className="pt-2">
            <button
              type="submit"
              className="flex items-center gap-2 px-5 py-2.5 bg-amber-700 hover:bg-amber-800 text-white font-semibold text-xs rounded-xl shadow-md transition-colors"
            >
              <ShieldCheck className="w-4 h-4" />
              Perbarui Kata Sandi
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
