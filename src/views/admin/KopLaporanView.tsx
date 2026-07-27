import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { KopHeader } from '../../components/common/KopHeader';
import { FileText, Save, CheckCircle2, RotateCcw, Upload } from 'lucide-react';

export const KopLaporanView: React.FC = () => {
  const { schoolProfile, setSchoolProfile } = useApp();
  const [kopForm, setKopForm] = useState({ ...schoolProfile.kopLaporan });
  const [logoUrl, setLogoUrl] = useState(schoolProfile.logoUrl || '');
  const [successMsg, setSuccessMsg] = useState('');

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setKopForm({ ...kopForm, [e.target.name]: e.target.value });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSchoolProfile({
      ...schoolProfile,
      logoUrl: logoUrl,
      kopLaporan: kopForm,
    });
    setSuccessMsg('Kop Laporan & Logo berhasil diperbarui!');
    setTimeout(() => setSuccessMsg(''), 3000);
  };

  const handleResetDefault = () => {
    const defaultKop = {
      line1: 'KEMENTERIAN AGAMA REPUBLIK INDONESIA',
      line2: 'KANTOR KEMENTERIAN AGAMA KABUPATEN PURBALINGGA',
      line3: 'MADRASAH IBTIDAIYAH NEGERI 1 PURBALINGGA',
      line4: 'Jalan Raya Krangean RT 01 RW 01 Kec. Kertanegara Kab. Purbalingga Prov. Jawa Tengah',
      line5: 'Email: minsaga@madrasah.id | Website: www.min1purbalingga.sch.id | Telepon: (0281) 7700977',
      line6: '',
    };
    setKopForm(defaultKop);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs">
        <div className="flex items-center gap-3 pb-4 border-b border-slate-100 mb-6">
          <div className="w-10 h-10 rounded-xl bg-teal-50 text-teal-700 flex items-center justify-center font-bold">
            <FileText className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-800">Pengaturan Kop Laporan & Logo</h2>
            <p className="text-xs text-slate-500">
              Sesuaikan susunan teks header Kop Surat dan Laporan Resmi Madrasah
            </p>
          </div>
        </div>

        {successMsg && (
          <div className="mb-4 p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs flex items-center gap-2 font-medium">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            {successMsg}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Baris 1 (Nama Institusi Atas)
            </label>
            <input
              type="text"
              name="line1"
              value={kopForm.line1}
              onChange={handleChange}
              placeholder="KEMENTERIAN AGAMA REPUBLIK INDONESIA"
              className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-600"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Baris 2 (Kantor Wilayah / Kabupaten)
            </label>
            <input
              type="text"
              name="line2"
              value={kopForm.line2}
              onChange={handleChange}
              placeholder="KANTOR KEMENTERIAN AGAMA KABUPATEN PURBALINGGA"
              className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-600"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Baris 3 (Nama Satuan Pendidikan Madrasah)
            </label>
            <input
              type="text"
              name="line3"
              value={kopForm.line3}
              onChange={handleChange}
              placeholder="MADRASAH IBTIDAIYAH NEGERI 1 PURBALINGGA"
              className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-600"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Baris 4 (Alamat Lengkap)
            </label>
            <input
              type="text"
              name="line4"
              value={kopForm.line4}
              onChange={handleChange}
              placeholder="Jalan Raya Krangean RT 01 RW 01..."
              className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-600"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Baris 5 (Email, Website, & Telepon)
            </label>
            <input
              type="text"
              name="line5"
              value={kopForm.line5}
              onChange={handleChange}
              placeholder="Email: minsaga@madrasah.id | Website: www.min1purbalingga.sch.id..."
              className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-600"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Logo Madrasah (URL Gambar / Unggah File)
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={logoUrl}
                onChange={(e) => setLogoUrl(e.target.value)}
                placeholder="https://... atau unggah gambar logo"
                className="flex-1 px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-600"
              />
              <label className="px-3 py-2 bg-teal-700 hover:bg-teal-800 text-white font-semibold text-xs rounded-lg cursor-pointer transition-colors flex items-center gap-1 shrink-0">
                <Upload className="w-3.5 h-3.5" />
                Unggah Logo
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
                          setLogoUrl(event.target.result as string);
                        }
                      };
                      reader.readAsDataURL(file);
                    }
                  }}
                />
              </label>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Baris 6 (Opsional / Kode Pos)
            </label>
            <input
              type="text"
              name="line6"
              value={kopForm.line6 || ''}
              onChange={handleChange}
              placeholder="Kode Pos 53358"
              className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-600"
            />
          </div>

          <div className="pt-2 flex items-center justify-between">
            <button
              type="button"
              onClick={handleResetDefault}
              className="flex items-center gap-1.5 px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs rounded-xl transition-colors"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Kembalikan Default
            </button>

            <button
              type="submit"
              className="flex items-center gap-2 px-5 py-2.5 bg-emerald-800 hover:bg-emerald-900 text-white font-semibold text-xs rounded-xl shadow-md transition-colors"
            >
              <Save className="w-4 h-4" />
              Simpan Kop Laporan
            </button>
          </div>
        </form>

        {/* Live Kop Preview */}
        <div className="mt-8 pt-6 border-t border-slate-200">
          <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-3">
            Pratinjau Tampilan Kop Laporan Resmi:
          </h3>
          <KopHeader />
        </div>
      </div>
    </div>
  );
};
