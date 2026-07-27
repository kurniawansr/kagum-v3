import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { Building2, Save, Upload, CheckCircle2 } from 'lucide-react';

export const DataMadrasahView: React.FC = () => {
  const { schoolProfile, setSchoolProfile } = useApp();
  const [formData, setFormData] = useState({ ...schoolProfile });
  const [successMsg, setSuccessMsg] = useState('');

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSchoolProfile(formData);
    setSuccessMsg('Data Madrasah berhasil disimpan!');
    setTimeout(() => setSuccessMsg(''), 3000);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs">
        <div className="flex items-center gap-3 pb-4 border-b border-slate-100 mb-6">
          <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center font-bold">
            <Building2 className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-800">Pengaturan Data Madrasah</h2>
            <p className="text-xs text-slate-500">
              Kelola identitas utama, nama Kepala Madrasah, tahun ajaran, dan logo madrasah
            </p>
          </div>
        </div>

        {successMsg && (
          <div className="mb-4 p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs flex items-center gap-2 font-medium">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            {successMsg}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Nama Madrasah
              </label>
              <input
                type="text"
                name="namaMadrasah"
                value={formData.namaMadrasah}
                onChange={handleChange}
                placeholder="MIN 1 Purbalingga"
                className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-600"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Logo Madrasah (URL Gambar / Unggah File)
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  name="logoUrl"
                  value={formData.logoUrl}
                  onChange={handleChange}
                  placeholder="https://... atau unggah file gambar"
                  className="flex-1 px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-600"
                />
                <label className="px-3 py-2 bg-emerald-700 hover:bg-emerald-800 text-white font-semibold text-xs rounded-lg cursor-pointer transition-colors flex items-center gap-1 shrink-0">
                  <Upload className="w-3.5 h-3.5" />
                  Unggah Gambar
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        const reader = new FileReader();
                        reader.onload = (event) => {
                          if (event.target?.result) {
                            setFormData({
                              ...formData,
                              logoUrl: event.target.result as string,
                            });
                          }
                        };
                        reader.readAsDataURL(file);
                      }
                    }}
                  />
                </label>
                <button
                  type="button"
                  onClick={() =>
                    setFormData({
                      ...formData,
                      logoUrl: 'https://i.ibb.co.com/fYjbDbR7/Kementerian-Agama-new-logo.png',
                    })
                  }
                  className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs rounded-lg transition-colors shrink-0"
                >
                  Reset Logo
                </button>
              </div>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Alamat Madrasah
            </label>
            <textarea
              name="alamatMadrasah"
              rows={2}
              value={formData.alamatMadrasah}
              onChange={handleChange}
              placeholder="Jalan Raya Krangean RT 01 RW 01..."
              className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-600"
              required
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Nama Kepala Madrasah
              </label>
              <input
                type="text"
                name="namaKepala"
                value={formData.namaKepala}
                onChange={handleChange}
                placeholder="Abdul Kosim, S.Ag., M.Pd.I."
                className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-600"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                NIP Kepala Madrasah
              </label>
              <input
                type="text"
                name="nipKepala"
                value={formData.nipKepala}
                onChange={handleChange}
                placeholder="197201042007011019"
                className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-600"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Tahun Ajaran Aktif
              </label>
              <select
                name="tahunAjaran"
                value={formData.tahunAjaran}
                onChange={handleChange}
                className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-600"
              >
                <option value="2026/2027">2026/2027</option>
                <option value="2027/2028">2027/2028</option>
                <option value="2028/2029">2028/2029</option>
                <option value="2029/2030">2029/2030</option>
                <option value="2030/2031">2030/2031</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Semester Aktif
              </label>
              <select
                name="semester"
                value={formData.semester}
                onChange={handleChange}
                className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-600"
              >
                <option value="Ganjil">Ganjil</option>
                <option value="Genap">Genap</option>
              </select>
            </div>
          </div>

          {/* Logo Preview */}
          {formData.logoUrl && (
            <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl flex items-center gap-4">
              <img src={formData.logoUrl} alt="Logo Preview" className="w-16 h-16 object-contain" />
              <div className="text-xs text-slate-600">
                <p className="font-semibold text-slate-800">Preview Logo Terpasang</p>
                <p className="text-[11px] text-slate-500">Logo ini akan digunakan secara otomatis pada Kop Surat dan Laporan PDF/Excel.</p>
              </div>
            </div>
          )}

          <div className="pt-4 flex justify-end">
            <button
              type="submit"
              className="flex items-center gap-2 px-5 py-2.5 bg-emerald-800 hover:bg-emerald-900 text-white font-semibold text-xs rounded-xl shadow-md transition-colors"
            >
              <Save className="w-4 h-4" />
              Simpan Data Madrasah
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
