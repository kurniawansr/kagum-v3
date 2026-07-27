import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { RemedialRecord } from '../../types';
import { Award, Save, Printer, FileSpreadsheet, FileText, CheckCircle2, AlertCircle } from 'lucide-react';
import { exportToExcel, exportToPdf } from '../../utils/exportUtils';

export const RemedialView: React.FC = () => {
  const { students, subjects, gradeRecords, remedialRecords, setRemedialRecords, currentUser, schoolProfile } = useApp();
  const currentClass = currentUser?.kelas || 'Kelas IA';
  const myStudents = students.filter((s) => s.kelas === currentClass);

  const [selectedSubjectCode, setSelectedSubjectCode] = useState<string>(subjects[0]?.code || 'QH');
  const [selectedAH, setSelectedAH] = useState<number>(1);
  const [printDate, setPrintDate] = useState(new Date().toISOString().split('T')[0]);
  const [message, setMessage] = useState('');

  const currentSubject =
    (subjects || []).find((s) => s && s.code === selectedSubjectCode) ||
    (subjects || [])[0] || { code: 'QH', name: "Al-Qur'an Hadis", kktp: 70 };

  // Local state for remedial scores (allows string for fluid typing)
  const [remedialScores, setRemedialScores] = useState<Record<string, number | string>>({});

  // Filter students whose score for selected AH is below KKTP
  const remedialStudentsList = myStudents.filter((st) => {
    const grd = (gradeRecords || []).find(
      (g) => g.studentId === st.id && g.subjectCode === selectedSubjectCode && g.type === 'sumatif' && g.ahNumber === selectedAH
    );
    const initialScore = grd ? grd.score : 65; // Default mock below KKTP
    return initialScore < (currentSubject?.kktp ?? 70);
  });

  React.useEffect(() => {
    const scoreMap: Record<string, number | string> = {};
    const defaultKktp = currentSubject?.kktp ?? 70;
    remedialStudentsList.forEach((st) => {
      const rem = (remedialRecords || []).find(
        (r) => r.studentId === st.id && r.subjectCode === selectedSubjectCode && r.ahNumber === selectedAH
      );
      scoreMap[st.id] = rem ? rem.remedialScore : defaultKktp;
    });
    setRemedialScores(scoreMap);
  }, [selectedSubjectCode, selectedAH, remedialRecords, currentSubject, students, currentClass, gradeRecords]);

  const handleSaveRemedial = () => {
    const remaining = remedialRecords.filter(
      (r) => !(r.subjectCode === selectedSubjectCode && r.ahNumber === selectedAH)
    );

    const newRemedials: RemedialRecord[] = remedialStudentsList.map((st) => {
      const grd = (gradeRecords || []).find(
        (g) => g.studentId === st.id && g.subjectCode === selectedSubjectCode && g.type === 'sumatif' && g.ahNumber === selectedAH
      );
      const rawVal = remedialScores[st.id];
      const parsedVal = typeof rawVal === 'number' ? rawVal : parseInt(String(rawVal), 10);
      const finalRemScore = isNaN(parsedVal) ? currentSubject.kktp : parsedVal;

      return {
        id: `rem-${st.id}-${selectedSubjectCode}-${selectedAH}`,
        studentId: st.id,
        subjectCode: selectedSubjectCode,
        ahNumber: selectedAH,
        initialScore: grd ? grd.score : 65,
        remedialScore: finalRemScore,
        notes: 'Remedial Tuntas',
      };
    });

    setRemedialRecords([...remaining, ...newRemedials]);
    setMessage('Nilai remedial siswa berhasil disimpan!');
    setTimeout(() => setMessage(''), 3000);
  };

  const handleExportPdf = () => {
    const titleLines = [
      'DAFTAR REMEDIAL SISWA',
      `KELAS ${currentClass.toUpperCase()}`,
      `SEMESTER ${schoolProfile.semester.toUpperCase()} TAHUN AJARAN ${schoolProfile.tahunAjaran}`,
      `MATA PELAJARAN: ${currentSubject.name.toUpperCase()} (${currentSubject.code})  |  AH ${selectedAH}  |  KKTP: ${currentSubject.kktp}`,
    ];

    const headers = ['No', 'NISN', 'Nama Siswa', 'Nilai Awal (< KKTP)', 'Nilai Remedial', 'KKTP Mapel', 'Keterangan'];
    const rows = remedialStudentsList.map((st, idx) => {
      const grd = (gradeRecords || []).find(
        (g) => g.studentId === st.id && g.subjectCode === selectedSubjectCode && g.type === 'sumatif' && g.ahNumber === selectedAH
      );
      const init = grd ? grd.score : 65;
      const rem = remedialScores[st.id] || currentSubject.kktp;

      return [
        idx + 1,
        st.nisn,
        st.name,
        init,
        rem,
        currentSubject.kktp,
        rem >= currentSubject.kktp ? 'Tuntas Remedial' : 'Belum Tuntas',
      ];
    });

    exportToPdf({
      filename: `Daftar_Remedial_${currentSubject.code}_AH${selectedAH}`,
      titleLines,
      tableHeaders: headers,
      tableRows: rows,
      schoolProfile,
      printDate,
      teacherName: currentUser?.name,
      teacherNip: currentUser?.nip,
    });
  };

  const handleExportExcel = () => {
    const headerLines = [
      'LAPORAN PROGRAM REMEDIAL & PENGAYAAN',
      `MATA PELAJARAN: ${currentSubject.name} (AH ${selectedAH})`,
      `KELAS: ${currentClass}`,
      `TAHUN AJARAN ${schoolProfile.tahunAjaran}`,
    ];

    const headers = ['No', 'NISN', 'Nama Siswa', 'Nilai Awal', 'Nilai Remedial', 'KKTP Mapel', 'Keterangan'];
    const rows = remedialStudentsList.map((st, idx) => {
      const grd = (gradeRecords || []).find(
        (g) => g.studentId === st.id && g.subjectCode === selectedSubjectCode && g.type === 'sumatif' && g.ahNumber === selectedAH
      );
      const init = grd ? grd.score : 65;
      const rem = remedialScores[st.id] || currentSubject.kktp;

      return [idx + 1, st.nisn, st.name, init, rem, currentSubject.kktp, rem >= currentSubject.kktp ? 'Tuntas Remedial' : 'Belum Tuntas'];
    });

    exportToExcel(
      `Laporan_Remedial_${currentSubject.code}_AH${selectedAH}`,
      'Remedial',
      headerLines,
      headers,
      rows
    );
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center font-bold">
              <Award className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-800">Program Remedial & Pengayaan ({currentClass})</h2>
              <p className="text-xs text-slate-500">
                Otomatis menjaring siswa dengan nilai di bawah KKTP untuk diberikan pendampingan dan tes ulang
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 rounded-xl text-xs">
              <Printer className="w-3.5 h-3.5 text-slate-500" />
              <span className="font-medium text-slate-600">Cetak:</span>
              <input
                type="date"
                value={printDate}
                onChange={(e) => setPrintDate(e.target.value)}
                className="bg-transparent font-semibold text-slate-800 focus:outline-none"
              />
            </div>

            <button
              onClick={handleExportExcel}
              className="flex items-center gap-1.5 px-3 py-2 bg-teal-50 hover:bg-teal-100 text-teal-800 border border-teal-200 font-semibold text-xs rounded-xl transition-colors"
            >
              <FileSpreadsheet className="w-4 h-4 text-teal-600" />
              Excel
            </button>

            <button
              onClick={handleExportPdf}
              className="flex items-center gap-1.5 px-3 py-2 bg-rose-50 hover:bg-rose-100 text-rose-800 border border-rose-200 font-semibold text-xs rounded-xl transition-colors"
            >
              <FileText className="w-4 h-4 text-rose-600" />
              PDF Laporan
            </button>
          </div>
        </div>

        {/* Filter Controls */}
        <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-3 p-4 bg-slate-50 rounded-xl border border-slate-200 text-xs">
          <div>
            <label className="block text-[11px] font-semibold text-slate-700 mb-1">Pilih Mata Pelajaran</label>
            <select
              value={selectedSubjectCode}
              onChange={(e) => setSelectedSubjectCode(e.target.value)}
              className="w-full px-3 py-1.5 border border-slate-200 rounded-lg bg-white font-bold text-slate-800"
            >
              {subjects.map((s) => (
                <option key={s.id} value={s.code}>
                  [{s.code}] {s.name} (KKTP: {s.kktp})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-slate-700 mb-1">Asesmen Harian (AH)</label>
            <select
              value={selectedAH}
              onChange={(e) => setSelectedAH(parseInt(e.target.value, 10))}
              className="w-full px-3 py-1.5 border border-slate-200 rounded-lg bg-white font-semibold text-slate-800"
            >
              {Array.from({ length: currentSubject.lingkupMateriCount }).map((_, i) => (
                <option key={i + 1} value={i + 1}>
                  AH {i + 1} (Sumatif Lingkup Materi {i + 1})
                </option>
              ))}
            </select>
          </div>
        </div>

        {message && (
          <div className="mt-4 p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs flex items-center gap-2 font-medium">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            {message}
          </div>
        )}
      </div>

      {/* Remedial Table */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs overflow-x-auto">
        <div className="flex items-center justify-between pb-3 mb-4 border-b border-slate-100">
          <div>
            <h3 className="font-bold text-slate-800 text-sm">
              Daftar Siswa Mengikuti Remedial [{currentSubject.name}] AH {selectedAH}
            </h3>
            <p className="text-xs text-rose-700 font-medium">
              * Terjaring {remedialStudentsList.length} siswa dengan nilai awal di bawah KKTP ({currentSubject.kktp}).
            </p>
          </div>

          <button
            onClick={handleSaveRemedial}
            className="flex items-center gap-2 px-5 py-2 bg-emerald-800 hover:bg-emerald-900 text-white font-extrabold text-xs rounded-xl shadow-md transition-colors"
          >
            <Save className="w-4 h-4" />
            Simpan Nilai Remedial
          </button>
        </div>

        <table className="w-full text-left text-xs border-collapse">
          <thead>
            <tr className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200">
              <th className="p-3 w-10 text-center">No</th>
              <th className="p-3">NISN</th>
              <th className="p-3">Nama Lengkap Siswa</th>
              <th className="p-3 text-center text-rose-700 bg-rose-50">Nilai Awal (&lt; KKTP)</th>
              <th className="p-3 text-center text-emerald-800 bg-emerald-50">Nilai Remedial</th>
              <th className="p-3 text-center">Status Ketuntasan</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {remedialStudentsList.length > 0 ? (
              remedialStudentsList.map((st, idx) => {
                const grd = (gradeRecords || []).find(
                  (g) => g.studentId === st.id && g.subjectCode === selectedSubjectCode && g.type === 'sumatif' && g.ahNumber === selectedAH
                );
                const initScore = grd ? grd.score : 65;
                const remScore = remedialScores[st.id] ?? currentSubject.kktp;

                return (
                  <tr key={st.id} className="hover:bg-slate-50 transition-colors">
                    <td className="p-3 text-center text-slate-500 font-medium">{idx + 1}</td>
                    <td className="p-3 font-mono text-slate-700 font-semibold">{st.nisn}</td>
                    <td className="p-3 font-bold text-slate-800">{st.name}</td>
                    <td className="p-3 text-center font-bold text-rose-700 bg-rose-50/50">{initScore}</td>
                    <td className="p-3 text-center bg-emerald-50/50">
                      <input
                        type="number"
                        min={0}
                        max={100}
                        value={remScore}
                        onChange={(e) => {
                          const val = e.target.value;
                          setRemedialScores({
                            ...remedialScores,
                            [st.id]: val === '' ? '' : Math.min(100, Math.max(0, parseInt(val, 10) || 0)),
                          });
                        }}
                        className="w-20 px-2 py-1 border border-slate-200 rounded-lg text-center font-bold text-emerald-800 bg-white"
                      />
                    </td>
                    <td className="p-3 text-center">
                      <span className="px-2.5 py-1 bg-emerald-100 text-emerald-800 rounded-full font-bold text-[11px]">
                        • Tuntas Remedial
                      </span>
                    </td>
                  </tr>
                );
              })
            ) : (
              <tr>
                <td colSpan={6} className="p-8 text-center text-xs text-slate-400">
                  Semua siswa tuntas pada AH {selectedAH} mata pelajaran ini.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
