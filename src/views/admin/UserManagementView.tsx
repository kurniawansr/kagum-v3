import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { User } from '../../types';
import { Users, UserPlus, KeyRound, Trash2, Edit2, CheckCircle2, RefreshCw, ShieldAlert, BadgeCheck } from 'lucide-react';

export const UserManagementView: React.FC = () => {
  const { users, setUsers } = useApp();
  const [formData, setFormData] = useState({
    id: '',
    name: '',
    nip: '',
    kelas: '',
    email: '',
    password: '',
    gender: 'Laki-laki' as 'Laki-laki' | 'Perempuan',
    birthPlace: '',
    birthDate: '',
  });
  const [editingId, setEditingId] = useState<string | null>(null);
  const [message, setMessage] = useState('');

  const generateRandomPassword = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let pass = 'KG-';
    for (let i = 0; i < 5; i++) {
      pass += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return pass;
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    
    // Auto populate email based on NIP if email is empty or matches auto-generated pattern
    if (name === 'nip' && (!formData.email || formData.email.includes('@madrasah.id'))) {
      const cleanNip = value.trim().replace(/\s+/g, '');
      setFormData((prev) => ({
        ...prev,
        nip: value,
        email: cleanNip ? `${cleanNip}@madrasah.id` : prev.email,
      }));
    } else {
      setFormData((prev) => ({ ...prev, [name]: value }));
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (editingId) {
      setUsers(
        users.map((u) =>
          u.id === editingId
            ? {
                ...u,
                name: formData.name,
                nip: formData.nip,
                kelas: formData.kelas || 'Guru Kelas',
                email: formData.email,
                password: formData.password || u.password,
                gender: formData.gender,
                birthPlace: formData.birthPlace,
                birthDate: formData.birthDate,
              }
            : u
        )
      );
      setMessage('Data pengguna guru berhasil diperbarui!');
      setEditingId(null);
    } else {
      const newPass = formData.password || generateRandomPassword();
      const newUser: User = {
        id: `usr-${Date.now()}`,
        name: formData.name,
        nip: formData.nip,
        kelas: formData.kelas || 'Guru Kelas',
        email: formData.email || `${formData.nip.trim()}@madrasah.id`,
        password: newPass,
        role: 'guru',
        gender: formData.gender,
        birthPlace: formData.birthPlace,
        birthDate: formData.birthDate,
      };
      setUsers([...users, newUser]);
      setMessage('Guru baru berhasil ditambahkan! Username login menggunakan NIP/NIK.');
    }

    setFormData({
      id: '',
      name: '',
      nip: '',
      kelas: '',
      email: '',
      password: '',
      gender: 'Laki-laki',
      birthPlace: '',
      birthDate: '',
    });
    setTimeout(() => setMessage(''), 4000);
  };

  const handleEdit = (user: User) => {
    setEditingId(user.id);
    setFormData({
      id: user.id,
      name: user.name,
      nip: user.nip,
      kelas: user.kelas,
      email: user.email,
      password: user.password,
      gender: user.gender || 'Laki-laki',
      birthPlace: user.birthPlace || '',
      birthDate: user.birthDate || '',
    });
  };

  const handleDelete = (id: string) => {
    if (confirm('Apakah Anda yakin ingin menghapus akun pengguna guru ini?')) {
      setUsers(users.filter((u) => u.id !== id));
      setMessage('Pengguna berhasil dihapus.');
      setTimeout(() => setMessage(''), 3000);
    }
  };

  const resetPassword = (id: string) => {
    const newPass = generateRandomPassword();
    setUsers(users.map((u) => (u.id === id ? { ...u, password: newPass } : u)));
    setMessage(`Password berhasil direset ke: ${newPass}`);
    setTimeout(() => setMessage(''), 5000);
  };

  const teachersList = users.filter((u) => u.role === 'guru');

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs">
        <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-700 flex items-center justify-center font-bold">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-800">Kelola Pengguna & Guru</h2>
              <p className="text-xs text-slate-500">
                Pendaftaran guru, biodata lengkap, pengampuan kelas, serta pengaturan login NIP/NIK & kata sandi
              </p>
            </div>
          </div>
        </div>

        {message && (
          <div className="mb-4 p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs flex items-center gap-2 font-medium">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            {message}
          </div>
        )}

        {/* Info Login NIP/NIK */}
        <div className="mb-5 p-3.5 bg-indigo-50/80 border border-indigo-100 rounded-2xl flex items-start gap-3">
          <BadgeCheck className="w-5 h-5 text-indigo-600 shrink-0 mt-0.5" />
          <div className="text-xs text-indigo-950 space-y-0.5">
            <p className="font-bold">Ketentuan Login Guru:</p>
            <p className="text-indigo-800">
              Guru dapat login ke aplikasi menggunakan <strong>NIP/NIK</strong> atau <strong>Email</strong> pada kolom login.
            </p>
          </div>
        </div>

        {/* Input Form */}
        <form onSubmit={handleSubmit} className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-4 mb-6">
          <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
            <UserPlus className="w-4 h-4 text-indigo-600" />
            {editingId ? 'Edit Data Pengguna Guru' : 'Tambah Pengguna Guru Baru'}
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div>
              <label className="block text-[11px] font-semibold text-slate-700 mb-1">Nama Lengkap Guru & Gelar</label>
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleInputChange}
                placeholder="Sulis, S.Pd.I"
                className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-indigo-600"
                required
              />
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                NIP / NIK <span className="text-indigo-600">(Username Login)</span>
              </label>
              <input
                type="text"
                name="nip"
                value={formData.nip}
                onChange={handleInputChange}
                placeholder="198805122015032002"
                className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-indigo-600 font-mono"
                required
              />
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                Kelas Pengampuan <span className="text-slate-400 font-normal">(Form Isian Teks)</span>
              </label>
              <input
                type="text"
                name="kelas"
                value={formData.kelas}
                onChange={handleInputChange}
                placeholder="Contoh: Kelas 1A / Guru PJOK / Kelas 4B"
                className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-indigo-600"
                required
              />
            </div>

            {/* Biodata Guru Tambahan */}
            <div>
              <label className="block text-[11px] font-semibold text-slate-700 mb-1">Jenis Kelamin</label>
              <select
                name="gender"
                value={formData.gender}
                onChange={handleInputChange}
                className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-indigo-600"
              >
                <option value="Laki-laki">Laki-laki</option>
                <option value="Perempuan">Perempuan</option>
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-700 mb-1">Tempat Lahir</label>
              <input
                type="text"
                name="birthPlace"
                value={formData.birthPlace}
                onChange={handleInputChange}
                placeholder="Contoh: Purbalingga"
                className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-indigo-600"
              />
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-700 mb-1">Tanggal Lahir</label>
              <input
                type="date"
                name="birthDate"
                value={formData.birthDate}
                onChange={handleInputChange}
                className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-indigo-600"
              />
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-700 mb-1">Email Log In</label>
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleInputChange}
                placeholder="sulis@madrasah.id"
                className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-indigo-600"
                required
              />
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-700 mb-1">Kata Sandi Akun</label>
              <input
                type="text"
                name="password"
                value={formData.password}
                onChange={handleInputChange}
                placeholder="Kosongkan untuk auto-generate"
                className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-indigo-600 font-mono"
              />
            </div>
          </div>

          <div className="flex items-center justify-between pt-2">
            <span className="text-[11px] text-slate-500 italic">
              * Password otomatis digenerate apabila dikosongkan. Username login dapat menggunakan NIP/NIK.
            </span>
            <div className="flex gap-2">
              {editingId && (
                <button
                  type="button"
                  onClick={() => {
                    setEditingId(null);
                    setFormData({
                      id: '',
                      name: '',
                      nip: '',
                      kelas: '',
                      email: '',
                      password: '',
                      gender: 'Laki-laki',
                      birthPlace: '',
                      birthDate: '',
                    });
                  }}
                  className="px-3 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-700 font-semibold text-xs rounded-lg transition-colors cursor-pointer"
                >
                  Batal
                </button>
              )}
              <button
                type="submit"
                className="px-4 py-2 bg-indigo-700 hover:bg-indigo-800 text-white font-semibold text-xs rounded-lg shadow-xs transition-colors cursor-pointer"
              >
                {editingId ? 'Simpan Perubahan' : 'Tambah Guru Baru'}
              </button>
            </div>
          </div>
        </form>

        {/* User Table */}
        <div className="overflow-x-auto border border-slate-200 rounded-xl">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-100 text-slate-700 font-semibold border-b border-slate-200">
              <tr>
                <th className="p-3">No</th>
                <th className="p-3">Nama Guru</th>
                <th className="p-3">NIP / NIK (Username)</th>
                <th className="p-3">Jenis Kelamin</th>
                <th className="p-3">Tempat, Tgl Lahir</th>
                <th className="p-3">Kelas Pengampuan</th>
                <th className="p-3">Email Log In</th>
                <th className="p-3">Password</th>
                <th className="p-3 text-center">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {teachersList.map((usr, idx) => (
                <tr key={usr.id} className="hover:bg-slate-50/80 transition-colors">
                  <td className="p-3 text-slate-500">{idx + 1}</td>
                  <td className="p-3 font-semibold text-slate-800">{usr.name}</td>
                  <td className="p-3 text-slate-800 font-mono font-bold bg-slate-50/50">
                    {usr.nip || '-'}
                  </td>
                  <td className="p-3 text-slate-600">{usr.gender || '-'}</td>
                  <td className="p-3 text-slate-600">
                    {usr.birthPlace || usr.birthDate ? `${usr.birthPlace || ''} ${usr.birthDate ? `(${usr.birthDate})` : ''}` : '-'}
                  </td>
                  <td className="p-3 font-medium text-emerald-700">{usr.kelas}</td>
                  <td className="p-3 text-slate-600">{usr.email}</td>
                  <td className="p-3">
                    <span className="font-mono bg-amber-50 text-amber-800 border border-amber-200 px-2 py-1 rounded text-[11px] font-semibold">
                      {usr.password}
                    </span>
                  </td>
                  <td className="p-3 text-center">
                    <div className="inline-flex items-center gap-1">
                      <button
                        onClick={() => resetPassword(usr.id)}
                        className="p-1.5 text-amber-600 hover:bg-amber-50 rounded-lg transition-colors cursor-pointer"
                        title="Reset Password Otomatis"
                      >
                        <RefreshCw className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleEdit(usr)}
                        className="p-1.5 text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors cursor-pointer"
                        title="Edit Data"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleDelete(usr.id)}
                        className="p-1.5 text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                        title="Hapus"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
