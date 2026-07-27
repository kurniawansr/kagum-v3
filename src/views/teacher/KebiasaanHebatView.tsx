import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { CharacterHabitRecord } from '../../types';
import {
  Sparkles,
  Heart,
  Send,
  Copy,
  Printer,
  FileSpreadsheet,
  FileText,
  CheckCircle2,
  Calendar,
  MessageSquare,
  Loader2,
  Zap,
} from 'lucide-react';
import { INDONESIAN_MONTH_NAMES, formatIndonesianDate } from '../../utils/calendarUtils';
import { exportToExcel, exportToPdf } from '../../utils/exportUtils';

export const KebiasaanHebatView: React.FC = () => {
  const {
    students,
    habitRecords: characterRecords = [],
    setHabitRecords: setCharacterRecords,
    attendanceRecords = [],
    currentUser,
    schoolProfile,
  } = useApp();
  const currentClass = currentUser?.kelas || 'Kelas IA';
  const myStudents = students.filter((s) => s.kelas === currentClass);

  const currentYear = 2026;
  const initialMonth = new Date().getMonth();
  const initialLastDay = new Date(currentYear, initialMonth + 1, 0).getDate();

  const [selectedStudentId, setSelectedStudentId] = useState<string>(myStudents[0]?.id || '');
  const [selectedMonth, setSelectedMonth] = useState(initialMonth);
  const [printDate, setPrintDate] = useState(new Date().toISOString().split('T')[0]);

  // AI Diagnostic State (default to 1st and last day of selected month)
  const [aiStartDate, setAiStartDate] = useState(
    `${currentYear}-${String(initialMonth + 1).padStart(2, '0')}-01`
  );
  const [aiEndDate, setAiEndDate] = useState(
    `${currentYear}-${String(initialMonth + 1).padStart(2, '0')}-${String(initialLastDay).padStart(2, '0')}`
  );
  const [aiReportText, setAiReportText] = useState('');
  const [isGeneratingAi, setIsGeneratingAi] = useState(false);
  const [copyMsg, setCopyMsg] = useState('');

  const handleMonthChange = (m: number) => {
    setSelectedMonth(m);
    const lastDay = new Date(currentYear, m + 1, 0).getDate();
    setAiStartDate(`${currentYear}-${String(m + 1).padStart(2, '0')}-01`);
    setAiEndDate(`${currentYear}-${String(m + 1).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`);
  };

  const selectedStudent = (myStudents || []).find((s) => s.id === selectedStudentId);

  // Helper to auto-sync habit records from student attendance records in a date range
  const syncHabitsFromAttendance = (start: string, end: string) => {
    if (!selectedStudentId) return characterRecords || [];

    const studentAtts = (attendanceRecords || []).filter(
      (a) => a.studentId === selectedStudentId && a.date >= start && a.date <= end
    );

    let updatedList = [...(characterRecords || [])];
    let changed = false;

    studentAtts.forEach((att) => {
      const existing = updatedList.find((r) => r.studentId === selectedStudentId && r.date === att.date);
      const isPresent = att.status === 'Hadir';
      if (!existing) {
        changed = true;
        updatedList.push({
          id: `hab-${selectedStudentId}-${att.date}`,
          studentId: selectedStudentId,
          date: att.date,
          wakeUpEarly: isPresent,
          prayers: {
            subuh: isPresent,
            dhuhur: isPresent,
            ashar: isPresent,
            maghrib: isPresent,
            isya: isPresent,
          },
          exercise: isPresent,
          healthyMeals: { pagi: isPresent, siang: isPresent, malam: isPresent },
          loveLearning: isPresent,
          socializing: isPresent,
          sleepEarly: isPresent,
        });
      }
    });

    if (changed) {
      setCharacterRecords(updatedList);
    }
    return updatedList;
  };

  // Filter records for selected student and month
  const studentRecords = (characterRecords || []).filter(
    (r) => r.studentId === selectedStudentId && r.date.includes(`-${String(selectedMonth + 1).padStart(2, '0')}-`)
  );

  const handleToggleHabit = (date: string, field: keyof CharacterHabitRecord, val: any) => {
    let existing = (characterRecords || []).find((r) => r.studentId === selectedStudentId && r.date === date);

    if (existing) {
      const updated = (characterRecords || []).map((r) => (r.id === existing.id ? { ...r, [field]: val } : r));
      setCharacterRecords(updated);
    } else {
      const newRec: CharacterHabitRecord = {
        id: `hab-${selectedStudentId}-${date}`,
        studentId: selectedStudentId,
        date,
        wakeUpEarly: field === 'wakeUpEarly' ? val : true,
        prayers: field === 'prayers' ? val : { subuh: true, dhuhur: true, ashar: true, maghrib: true, isya: true },
        exercise: field === 'exercise' ? val : true,
        healthyMeals: field === 'healthyMeals' ? val : { pagi: true, siang: true, malam: true },
        loveLearning: field === 'loveLearning' ? val : true,
        socializing: field === 'socializing' ? val : true,
        sleepEarly: field === 'sleepEarly' ? val : true,
      };
      setCharacterRecords([...characterRecords, newRec]);
    }
  };

  const generate7HabitsFallbackReport = (
    studentName: string,
    className: string,
    teacherName: string,
    schoolName: string,
    startDate: string,
    endDate: string,
    records: CharacterHabitRecord[]
  ) => {
    const totalDays = Math.max(records.length, 1);

    const wakeUpCount = records.filter((r) => r.wakeUpEarly).length;

    let totalPrayers = 0;
    records.forEach((r) => {
      if (r.prayers) {
        if (r.prayers.subuh) totalPrayers++;
        if (r.prayers.dhuhur) totalPrayers++;
        if (r.prayers.ashar) totalPrayers++;
        if (r.prayers.maghrib) totalPrayers++;
        if (r.prayers.isya) totalPrayers++;
      }
    });
    const maxPrayers = totalDays * 5;
    const prayerPct = Math.round((totalPrayers / maxPrayers) * 100);

    const exerciseCount = records.filter((r) => r.exercise).length;

    let totalMeals = 0;
    records.forEach((r) => {
      if (r.healthyMeals) {
        if (r.healthyMeals.pagi) totalMeals++;
        if (r.healthyMeals.siang) totalMeals++;
        if (r.healthyMeals.malam) totalMeals++;
      }
    });
    const maxMeals = totalDays * 3;
    const mealsPct = Math.round((totalMeals / maxMeals) * 100);

    const learnCount = records.filter((r) => r.loveLearning).length;
    const socialCount = records.filter((r) => r.socializing).length;
    const sleepCount = records.filter((r) => r.sleepEarly).length;

    const wakeUpPct = Math.round((wakeUpCount / totalDays) * 100);
    const exercisePct = Math.round((exerciseCount / totalDays) * 100);
    const learnPct = Math.round((learnCount / totalDays) * 100);
    const socialPct = Math.round((socialCount / totalDays) * 100);
    const sleepPct = Math.round((sleepCount / totalDays) * 100);

    return `*LAPORAN ANALISIS DIAGNOSTIK 7 KEBIASAAN ANAK INDONESIA HEBAT*

Assalamu'alaikum Wr. Wb.
Bapak/Ibu/Wali Murid dari ananda *${studentName}*,

Berikut hasil evaluasi diagnostik & analisis perkembangan *7 Kebiasaan Anak Indonesia Hebat* ananda periode *${formatIndonesianDate(startDate)} s/d ${formatIndonesianDate(endDate)}*:

📌 *KESIMPULAN EVALUASI PER KEBIASAAN:*

*1. Bangun Pagi (${wakeUpPct}%)*
${wakeUpPct >= 80 ? 'Ananda sangat konsisten dan disiplin bangun pagi sebelum Subuh dengan kondisi segar dan bersemangat.' : 'Ananda sudah menunjukkan kemajuan bangun pagi, mohon terus didampingi terutama saat hari libur.'}

*2. Beribadah / Sholat 5 Waktu (${prayerPct}%)*
${prayerPct >= 80 ? 'Alhamdulillah, pelaksanaan ibadah sholat 5 waktu (Subuh, Dhuhur, Ashar, Maghrib, Isya) tergolong sangat tertib dan rajin.' : 'Pelaksanaan sholat 5 waktu cukup teratur. Perlu dorongan santun terutama untuk kebiasaan sholat Subuh dan Isya.'}

*3. Berolahraga (${exercisePct}%)*
${exercisePct >= 75 ? 'Ananda aktif bergerak dan rutin berolahraga untuk menjaga kebugaran jasmani.' : 'Ananda disarankan untuk diajak aktif berolahraga ringan atau olah tubuh minimal 15-30 menit sehari.'}

*4. Makan Sehat & Bergizi (${mealsPct}%)*
${mealsPct >= 80 ? 'Pola makan ananda terpantau teratur (Pagi, Siang, Malam) dengan gizi yang baik dan seimbang.' : 'Pola makan cukup teratur, mohon ditingkatkan konsumsi sayur, buah, serta air putih di rumah.'}

*5. Gemar Belajar (${learnPct}%)*
${learnPct >= 80 ? 'Ananda memiliki motivasi belajar yang tinggi, rajin membaca, dan disiplin mengerjakan tugas sekolah.' : 'Ananda sudah mau belajar, disarankan membuat jadwal belajar yang rutin dan bebas dari gangguan media.'}

*6. Bermasyarakat (${socialPct}%)*
${socialPct >= 80 ? 'Sangat ramah, santun, peduli kepada teman, dan memiliki jiwa kepedulian sosial yang amat baik.' : 'Sikap sosial ananda baik, terus latih sikap berbagi, empati, dan tolong-menolong di lingkungan rumah.'}

*7. Tidur Cepat (${sleepPct}%)*
${sleepPct >= 80 ? 'Disiplin mengakhiri aktivitas malam dan tidur tepat waktu sehingga kesegaran fisik selalu terjaga.' : 'Jam tidur malam ananda terkadang masih larut. Mohon batasi penggunaan HP/TV setelah pukul 20.00 WIB.'}

💡 *REKOMENDASI & SARAN KEBIAASAAN UNTUK ORANG TUA:*
1. *Apresiasi Berkelanjutan*: Berikan pujian hangat atau *reward* imaterial setiap kali ananda berhasil menjalankan kebiasaan baik secara mandiri.
2. *Keteladanan Ibadah & Pembiasaan*: Ajak ananda sholat berjamaah serta membaca Al-Qur'an/buku bersama untuk membangun karakter religius & gemar membaca.
3. *Manajemen Screen-Time*: Terapkan aturan pembatasan gawai (HP) dan televisi maksimal pukul 20.00 agar waktu istirahat malam ananda optimal.
4. *Komunikasi Efektif*: Buat sesi bincang santai 10 menit sebelum tidur untuk mendengarkan cerita dan perasaan ananda sepanjang hari.

Terima kasih banyak atas partisipasi aktif, bimbingan, dan kerjasama luar biasa Bapak/Ibu di rumah demi tumbuh kembang terbaik ananda.

Wassalamu'alaikum Wr. Wb.
*Wali Kelas ${className}*
_${teacherName}_`;
  };

  // Generate AI Diagnosis
  const handleGenerateAiDiagnostic = async () => {
    if (!selectedStudent) return;

    setIsGeneratingAi(true);
    setAiReportText('');

    try {
      // Auto sync from attendance records for the selected date range
      const latestRecords = syncHabitsFromAttendance(aiStartDate, aiEndDate);

      const filteredRecs = latestRecords.filter(
        (r) => r.studentId === selectedStudentId && r.date >= aiStartDate && r.date <= aiEndDate
      );

      const filteredAtts = attendanceRecords.filter(
        (a) => a.studentId === selectedStudentId && a.date >= aiStartDate && a.date <= aiEndDate
      );

      const res = await fetch('/api/ai/diagnose-character', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          studentName: selectedStudent.name,
          className: currentClass,
          teacherName: currentUser?.name || 'Wali Kelas',
          schoolName: schoolProfile?.name || 'Madrasah Ibtidaiyah',
          habitsData: filteredRecs,
          records: filteredRecs,
          attendanceData: filteredAtts,
          startDate: aiStartDate,
          endDate: aiEndDate,
        }),
      });

      const data = await res.json();
      if (data.report) {
        setAiReportText(data.report);
      } else {
        setAiReportText(
          generate7HabitsFallbackReport(
            selectedStudent.name,
            currentClass,
            currentUser?.name || 'Wali Kelas',
            schoolProfile?.name || 'Madrasah Ibtidaiyah',
            aiStartDate,
            aiEndDate,
            filteredRecs
          )
        );
      }
    } catch (err) {
      console.error(err);
      const filteredRecs = characterRecords.filter(
        (r) => r.studentId === selectedStudentId && r.date >= aiStartDate && r.date <= aiEndDate
      );
      setAiReportText(
        generate7HabitsFallbackReport(
          selectedStudent?.name || 'Siswa',
          currentClass,
          currentUser?.name || 'Wali Kelas',
          schoolProfile?.name || 'Madrasah Ibtidaiyah',
          aiStartDate,
          aiEndDate,
          filteredRecs
        )
      );
    } finally {
      setIsGeneratingAi(false);
    }
  };

  const handleCopyText = () => {
    navigator.clipboard.writeText(aiReportText);
    setCopyMsg('Laporan berhasil disalin ke Clipboard!');
    setTimeout(() => setCopyMsg(''), 3000);
  };

  const handleSendWhatsApp = () => {
    if (!selectedStudent?.parentWa) {
      alert('Nomor WhatsApp orang tua tidak ditemukan.');
      return;
    }
    let wa = selectedStudent.parentWa.trim();
    if (wa.startsWith('08')) wa = '62' + wa.slice(1);
    const url = `https://wa.me/${wa}?text=${encodeURIComponent(aiReportText)}`;
    window.open(url, '_blank');
  };

  const handleExportPdf = () => {
    const titleLines = [
      'MONITORING 7 KEBIASAAN ANAK HEBAT INDONESIA',
      `KELAS: ${currentClass.toUpperCase()}`,
      `TAHUN AJARAN ${schoolProfile.tahunAjaran}`,
      `BULAN: ${INDONESIAN_MONTH_NAMES[selectedMonth].toUpperCase()}`,
      `SISWA: ${selectedStudent?.name || '-'} (NISN: ${selectedStudent?.nisn || '-'})`,
    ];

    const headers = ['No', 'Tanggal', 'Bangun Pagi', 'Sholat 5 Waktu', 'Olahraga', 'Makan Sehat', 'Belajar', 'Masyarakat', 'Tidur Cepat'];
    const rows = studentRecords.map((r, idx) => [
      idx + 1,
      formatIndonesianDate(r.date),
      r.wakeUpEarly ? 'Ya' : 'Tidak',
      `${r.prayers.subuh ? 'S' : '-'}${r.prayers.dhuhur ? 'D' : '-'}${r.prayers.ashar ? 'A' : '-'}${r.prayers.maghrib ? 'M' : '-'}${r.prayers.isya ? 'I' : '-'}`,
      r.exercise ? 'Ya' : 'Tidak',
      `${r.healthyMeals.pagi ? 'P' : '-'}${r.healthyMeals.siang ? 'S' : '-'}${r.healthyMeals.malam ? 'M' : '-'}`,
      r.loveLearning ? 'Ya' : 'Tidak',
      r.socializing ? 'Ya' : 'Tidak',
      r.sleepEarly ? 'Ya' : 'Tidak',
    ]);

    exportToPdf({
      filename: `Monitoring_Kebiasaan_${selectedStudent?.name.replace(' ', '_')}_${selectedMonth + 1}`,
      titleLines,
      tableHeaders: headers,
      tableRows: rows,
      schoolProfile,
      printDate,
      orientation: 'landscape',
    });
  };

  const handleExportExcel = () => {
    const headerLines = [
      'MONITORING 7 KEBIASAAN ANAK HEBAT INDONESIA',
      `KELAS: ${currentClass}`,
      `TAHUN AJARAN ${schoolProfile.tahunAjaran}`,
      `BULAN: ${INDONESIAN_MONTH_NAMES[selectedMonth]}`,
      `SISWA: ${selectedStudent?.name}`,
    ];

    const headers = ['No', 'Tanggal', 'Bangun Pagi', 'Sholat Subuh', 'Sholat Dhuhur', 'Sholat Ashar', 'Sholat Maghrib', 'Sholat Isya', 'Olahraga', 'Belajar', 'Tidur Cepat'];
    const rows = studentRecords.map((r, idx) => [
      idx + 1,
      r.date,
      r.wakeUpEarly ? 'Ya' : 'Tidak',
      r.prayers.subuh ? 'Ya' : 'Tidak',
      r.prayers.dhuhur ? 'Ya' : 'Tidak',
      r.prayers.ashar ? 'Ya' : 'Tidak',
      r.prayers.maghrib ? 'Ya' : 'Tidak',
      r.prayers.isya ? 'Ya' : 'Tidak',
      r.exercise ? 'Ya' : 'Tidak',
      r.loveLearning ? 'Ya' : 'Tidak',
      r.sleepEarly ? 'Ya' : 'Tidak',
    ]);

    exportToExcel(
      `Monitoring_Kebiasaan_${selectedStudent?.name.replace(' ', '_')}_${selectedMonth + 1}`,
      'Kebiasaan Hebat',
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
            <div className="w-10 h-10 rounded-xl bg-pink-50 text-pink-700 flex items-center justify-center font-bold">
              <Heart className="w-5 h-5 text-pink-600" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-800">7 Kebiasaan Anak Indonesia Hebat & AI Diagnostik</h2>
              <p className="text-xs text-slate-500">
                Pemantauan kebiasaan positif siswa dan penyusunan laporan narasi otomatis untuk orang tua
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

        {/* Student Selection Controls */}
        <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-3 p-4 bg-slate-50 rounded-xl border border-slate-200 text-xs">
          <div>
            <label className="block text-[11px] font-semibold text-slate-700 mb-1">Pilih Siswa</label>
            <select
              value={selectedStudentId}
              onChange={(e) => setSelectedStudentId(e.target.value)}
              className="w-full px-3 py-1.5 border border-slate-200 rounded-lg bg-white font-bold text-slate-800"
            >
              {myStudents.map((st) => (
                <option key={st.id} value={st.id}>
                  {st.name} (NISN: {st.nisn})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-slate-700 mb-1">Pilih Bulan Monitoring</label>
            <select
              value={selectedMonth}
              onChange={(e) => handleMonthChange(parseInt(e.target.value, 10))}
              className="w-full px-3 py-1.5 border border-slate-200 rounded-lg bg-white font-semibold text-slate-800"
            >
              {INDONESIAN_MONTH_NAMES.map((m, idx) => (
                <option key={idx} value={idx}>
                  {m}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* AI Diagnostic Report Generator Section */}
      <div className="bg-gradient-to-r from-emerald-900 to-teal-900 rounded-2xl p-6 text-white shadow-md space-y-4">
        <div className="flex flex-wrap items-center justify-between pb-3 border-b border-emerald-700/60 gap-2">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-amber-400" />
            <h3 className="font-extrabold text-sm text-white">
              AI Diagnostik Karakter Anak (Gemini 3.6 Flash)
            </h3>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => syncHabitsFromAttendance(aiStartDate, aiEndDate)}
              className="px-2.5 py-1 bg-emerald-800 hover:bg-emerald-700 text-amber-300 font-bold text-[11px] rounded-lg border border-emerald-600 flex items-center gap-1 transition-colors"
              title="Sinkronkan otomatis dari data absensi siswa"
            >
              <Zap className="w-3.5 h-3.5 text-amber-400" />
              Otomatis dari Absensi
            </button>
            <span className="text-[11px] bg-amber-400/20 text-amber-300 font-bold px-2.5 py-0.5 rounded-full">
              Laporan Otomatis WhatsApp
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
          <div>
            <label className="block text-[11px] font-medium text-emerald-100 mb-1">Tanggal Mulai Periode</label>
            <input
              type="date"
              value={aiStartDate}
              onChange={(e) => setAiStartDate(e.target.value)}
              className="w-full px-3 py-1.5 bg-white/10 border border-emerald-600 rounded-lg text-white"
            />
          </div>

          <div>
            <label className="block text-[11px] font-medium text-emerald-100 mb-1">Tanggal Akhir Periode</label>
            <input
              type="date"
              value={aiEndDate}
              onChange={(e) => setAiEndDate(e.target.value)}
              className="w-full px-3 py-1.5 bg-white/10 border border-emerald-600 rounded-lg text-white"
            />
          </div>

          <div className="flex items-end">
            <button
              onClick={handleGenerateAiDiagnostic}
              disabled={isGeneratingAi}
              className="w-full py-2 bg-amber-400 hover:bg-amber-300 text-emerald-950 font-black text-xs rounded-xl shadow-lg transition-all flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {isGeneratingAi ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Menganalisis...
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  Generate AI Diagnostik
                </>
              )}
            </button>
          </div>
        </div>

        {/* AI Output Display */}
        {aiReportText && (
          <div className="mt-4 p-4 bg-white/10 border border-emerald-500/40 rounded-2xl space-y-3">
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold text-amber-300 flex items-center gap-1.5">
                <MessageSquare className="w-4 h-4" />
                Format Narasi WhatsApp Orang Tua:
              </span>
              <div className="flex items-center gap-2">
                <button
                  onClick={handleCopyText}
                  className="px-2.5 py-1 bg-white/20 hover:bg-white/30 text-white rounded-md font-semibold text-[11px] flex items-center gap-1"
                >
                  <Copy className="w-3 h-3" />
                  Salin Pesan
                </button>
                <button
                  onClick={handleSendWhatsApp}
                  className="px-3 py-1 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-extrabold rounded-md text-[11px] flex items-center gap-1"
                >
                  <Send className="w-3 h-3" />
                  Kirim via WhatsApp
                </button>
              </div>
            </div>

            <textarea
              value={aiReportText}
              onChange={(e) => setAiReportText(e.target.value)}
              rows={8}
              className="w-full p-3 bg-slate-900/80 border border-emerald-700/80 rounded-xl text-xs font-mono text-emerald-100 focus:outline-none"
            />

            {copyMsg && <p className="text-[11px] text-amber-300 font-semibold">{copyMsg}</p>}
          </div>
        )}
      </div>

      {/* Habit Records Table */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs overflow-x-auto">
        <h3 className="font-bold text-slate-800 text-sm mb-4">
          Tabel Jurnal 7 Kebiasaan: {selectedStudent?.name}
        </h3>

        <table className="w-full text-left text-xs border-collapse">
          <thead>
            <tr className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200">
              <th className="p-2.5 w-10 text-center">No</th>
              <th className="p-2.5">Tanggal</th>
              <th className="p-2.5 text-center">Bangun Pagi</th>
              <th className="p-2.5 text-center">Sholat 5 Waktu</th>
              <th className="p-2.5 text-center">Olahraga</th>
              <th className="p-2.5 text-center">Makan Sehat</th>
              <th className="p-2.5 text-center">Belajar</th>
              <th className="p-2.5 text-center">Bermasyarakat</th>
              <th className="p-2.5 text-center">Tidur Cepat</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {Array.from({ length: new Date(currentYear, selectedMonth + 1, 0).getDate() }).map((_, idx) => {
              const dayNum = idx + 1;
              const dateStr = `2026-${String(selectedMonth + 1).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`;
              const rec = (studentRecords || []).find((r) => r.date === dateStr);
              const prayers = rec ? rec.prayers : { subuh: true, dhuhur: true, ashar: true, maghrib: true, isya: true };
              const meals = rec ? rec.healthyMeals : { pagi: true, siang: true, malam: true };

              return (
                <tr key={dateStr} className="hover:bg-slate-50 transition-colors">
                  <td className="p-2.5 text-center text-slate-500 font-medium">{idx + 1}</td>
                  <td className="p-2.5 font-bold text-slate-800">{formatIndonesianDate(dateStr)}</td>

                  {/* Bangun Pagi */}
                  <td className="p-2.5 text-center">
                    <input
                      type="checkbox"
                      checked={rec ? rec.wakeUpEarly : true}
                      onChange={(e) => handleToggleHabit(dateStr, 'wakeUpEarly', e.target.checked)}
                      className="w-4 h-4 text-emerald-600 rounded focus:ring-emerald-500 cursor-pointer"
                    />
                  </td>

                  {/* Sholat 5 Waktu */}
                  <td className="p-2.5 text-center">
                    <div className="inline-flex gap-1 text-[10px] font-bold">
                      <button
                        type="button"
                        title="Subuh"
                        onClick={() => handleToggleHabit(dateStr, 'prayers', { ...prayers, subuh: !prayers.subuh })}
                        className={`px-1.5 py-0.5 rounded transition-all cursor-pointer font-bold ${
                          prayers.subuh ? 'bg-emerald-600 text-white shadow-2xs hover:bg-emerald-700' : 'bg-slate-100 text-slate-400 border border-slate-200 line-through hover:bg-slate-200'
                        }`}
                      >
                        S
                      </button>
                      <button
                        type="button"
                        title="Dhuhur"
                        onClick={() => handleToggleHabit(dateStr, 'prayers', { ...prayers, dhuhur: !prayers.dhuhur })}
                        className={`px-1.5 py-0.5 rounded transition-all cursor-pointer font-bold ${
                          prayers.dhuhur ? 'bg-emerald-600 text-white shadow-2xs hover:bg-emerald-700' : 'bg-slate-100 text-slate-400 border border-slate-200 line-through hover:bg-slate-200'
                        }`}
                      >
                        D
                      </button>
                      <button
                        type="button"
                        title="Ashar"
                        onClick={() => handleToggleHabit(dateStr, 'prayers', { ...prayers, ashar: !prayers.ashar })}
                        className={`px-1.5 py-0.5 rounded transition-all cursor-pointer font-bold ${
                          prayers.ashar ? 'bg-emerald-600 text-white shadow-2xs hover:bg-emerald-700' : 'bg-slate-100 text-slate-400 border border-slate-200 line-through hover:bg-slate-200'
                        }`}
                      >
                        A
                      </button>
                      <button
                        type="button"
                        title="Maghrib"
                        onClick={() => handleToggleHabit(dateStr, 'prayers', { ...prayers, maghrib: !prayers.maghrib })}
                        className={`px-1.5 py-0.5 rounded transition-all cursor-pointer font-bold ${
                          prayers.maghrib ? 'bg-emerald-600 text-white shadow-2xs hover:bg-emerald-700' : 'bg-slate-100 text-slate-400 border border-slate-200 line-through hover:bg-slate-200'
                        }`}
                      >
                        M
                      </button>
                      <button
                        type="button"
                        title="Isya"
                        onClick={() => handleToggleHabit(dateStr, 'prayers', { ...prayers, isya: !prayers.isya })}
                        className={`px-1.5 py-0.5 rounded transition-all cursor-pointer font-bold ${
                          prayers.isya ? 'bg-emerald-600 text-white shadow-2xs hover:bg-emerald-700' : 'bg-slate-100 text-slate-400 border border-slate-200 line-through hover:bg-slate-200'
                        }`}
                      >
                        I
                      </button>
                    </div>
                  </td>

                  {/* Olahraga */}
                  <td className="p-2.5 text-center">
                    <input
                      type="checkbox"
                      checked={rec ? rec.exercise : true}
                      onChange={(e) => handleToggleHabit(dateStr, 'exercise', e.target.checked)}
                      className="w-4 h-4 text-emerald-600 rounded focus:ring-emerald-500 cursor-pointer"
                    />
                  </td>

                  {/* Makan Sehat */}
                  <td className="p-2.5 text-center">
                    <div className="inline-flex gap-1 text-[10px] font-bold">
                      <button
                        type="button"
                        title="Makan Pagi"
                        onClick={() => handleToggleHabit(dateStr, 'healthyMeals', { ...meals, pagi: !meals.pagi })}
                        className={`px-1.5 py-0.5 rounded transition-all cursor-pointer font-bold ${
                          meals.pagi ? 'bg-teal-600 text-white shadow-2xs hover:bg-teal-700' : 'bg-slate-100 text-slate-400 border border-slate-200 line-through hover:bg-slate-200'
                        }`}
                      >
                        Pagi
                      </button>
                      <button
                        type="button"
                        title="Makan Siang"
                        onClick={() => handleToggleHabit(dateStr, 'healthyMeals', { ...meals, siang: !meals.siang })}
                        className={`px-1.5 py-0.5 rounded transition-all cursor-pointer font-bold ${
                          meals.siang ? 'bg-teal-600 text-white shadow-2xs hover:bg-teal-700' : 'bg-slate-100 text-slate-400 border border-slate-200 line-through hover:bg-slate-200'
                        }`}
                      >
                        Siang
                      </button>
                      <button
                        type="button"
                        title="Makan Malam"
                        onClick={() => handleToggleHabit(dateStr, 'healthyMeals', { ...meals, malam: !meals.malam })}
                        className={`px-1.5 py-0.5 rounded transition-all cursor-pointer font-bold ${
                          meals.malam ? 'bg-teal-600 text-white shadow-2xs hover:bg-teal-700' : 'bg-slate-100 text-slate-400 border border-slate-200 line-through hover:bg-slate-200'
                        }`}
                      >
                        Mlm
                      </button>
                    </div>
                  </td>

                  {/* Belajar */}
                  <td className="p-2.5 text-center">
                    <input
                      type="checkbox"
                      checked={rec ? rec.loveLearning : true}
                      onChange={(e) => handleToggleHabit(dateStr, 'loveLearning', e.target.checked)}
                      className="w-4 h-4 text-emerald-600 rounded focus:ring-emerald-500 cursor-pointer"
                    />
                  </td>

                  {/* Bermasyarakat */}
                  <td className="p-2.5 text-center">
                    <input
                      type="checkbox"
                      checked={rec ? rec.socializing : true}
                      onChange={(e) => handleToggleHabit(dateStr, 'socializing', e.target.checked)}
                      className="w-4 h-4 text-emerald-600 rounded focus:ring-emerald-500 cursor-pointer"
                    />
                  </td>

                  {/* Tidur Cepat */}
                  <td className="p-2.5 text-center">
                    <input
                      type="checkbox"
                      checked={rec ? rec.sleepEarly : true}
                      onChange={(e) => handleToggleHabit(dateStr, 'sleepEarly', e.target.checked)}
                      className="w-4 h-4 text-emerald-600 rounded focus:ring-emerald-500 cursor-pointer"
                    />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};
