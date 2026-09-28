import React, { useState, useMemo } from 'react';
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
  Sun,
  Activity,
  Utensils,
  BookOpen,
  Users,
  Moon,
  ChevronLeft,
  ChevronRight,
  Check,
  X,
  RotateCcw,
  Layers,
  ArrowRight,
  ShieldCheck,
  Award,
  AlertCircle,
  Shuffle,
  Smile,
  HeartHandshake,
  RefreshCw
} from 'lucide-react';
import { INDONESIAN_MONTH_NAMES, formatIndonesianDate } from '../../utils/calendarUtils';
import { exportToExcel, exportToPdf } from '../../utils/exportUtils';
import {
  REPORT_TONE_OPTIONS,
  ReportTone,
  generateVaried7HabitsReport
} from '../../utils/habitReportGenerator';

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
  const myStudents = useMemo(() => students.filter((s) => s.kelas === currentClass), [students, currentClass]);

  const currentYear = 2026;
  const todayDateStr = useMemo(() => {
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, '0');
    const d = String(now.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }, []);

  const initialMonth = new Date().getMonth();
  const initialLastDay = new Date(currentYear, initialMonth + 1, 0).getDate();

  // Mode Selection: 'daily_touch' | 'monthly_table' | 'ai_whatsapp'
  const [activeMode, setActiveMode] = useState<'daily_touch' | 'monthly_table' | 'ai_whatsapp'>('daily_touch');

  const [selectedStudentId, setSelectedStudentId] = useState<string>(myStudents[0]?.id || '');
  const [selectedDate, setSelectedDate] = useState<string>(todayDateStr);
  const [selectedMonth, setSelectedMonth] = useState(initialMonth);
  const [printDate, setPrintDate] = useState(todayDateStr);

  // Notification / Toast Feedback
  const [feedbackMsg, setFeedbackMsg] = useState<{ type: 'success' | 'info' | 'error'; text: string } | null>(null);

  const showFeedback = (type: 'success' | 'info' | 'error', text: string) => {
    setFeedbackMsg({ type, text });
    setTimeout(() => setFeedbackMsg(null), 3500);
  };

  // AI Diagnostic State
  const [aiStartDate, setAiStartDate] = useState(
    `${currentYear}-${String(initialMonth + 1).padStart(2, '0')}-01`
  );
  const [aiEndDate, setAiEndDate] = useState(
    `${currentYear}-${String(initialMonth + 1).padStart(2, '0')}-${String(initialLastDay).padStart(2, '0')}`
  );
  const [aiReportText, setAiReportText] = useState('');
  const [isGeneratingAi, setIsGeneratingAi] = useState(false);
  const [selectedTone, setSelectedTone] = useState<ReportTone>('islami_hangat');
  const [variationSeed, setVariationSeed] = useState<number>(() => Math.floor(Math.random() * 1000000));
  const [currentReportToneLabel, setCurrentReportToneLabel] = useState<string>('Penuh Doa & Sangat Hangat');

  // Current selected student
  const selectedStudent = useMemo(
    () => myStudents.find((s) => s.id === selectedStudentId) || myStudents[0],
    [myStudents, selectedStudentId]
  );

  // Current student index for fast cycling
  const currentStudentIdx = myStudents.findIndex((s) => s.id === selectedStudentId);

  const handlePrevStudent = () => {
    if (currentStudentIdx > 0) {
      setSelectedStudentId(myStudents[currentStudentIdx - 1].id);
    } else if (myStudents.length > 0) {
      setSelectedStudentId(myStudents[myStudents.length - 1].id);
    }
  };

  const handleNextStudent = () => {
    if (currentStudentIdx < myStudents.length - 1) {
      setSelectedStudentId(myStudents[currentStudentIdx + 1].id);
    } else if (myStudents.length > 0) {
      setSelectedStudentId(myStudents[0].id);
    }
  };

  // Navigate date
  const handlePrevDay = () => {
    const curr = new Date(selectedDate);
    curr.setDate(curr.getDate() - 1);
    setSelectedDate(curr.toISOString().split('T')[0]);
  };

  const handleNextDay = () => {
    const curr = new Date(selectedDate);
    curr.setDate(curr.getDate() + 1);
    setSelectedDate(curr.toISOString().split('T')[0]);
  };

  const handleSetToday = () => {
    setSelectedDate(todayDateStr);
  };

  // Record for the current selected student & date
  const currentRecord = useMemo(() => {
    return (characterRecords || []).find(
      (r) => r.studentId === selectedStudentId && r.date === selectedDate
    );
  }, [characterRecords, selectedStudentId, selectedDate]);

  const prayers = currentRecord?.prayers || {
    subuh: false,
    dhuhur: false,
    ashar: false,
    maghrib: false,
    isya: false,
  };

  const meals = currentRecord?.healthyMeals || {
    pagi: false,
    siang: false,
    malam: false,
  };

  // Calculate today fulfillment count (0 to 7)
  const todayFulfilledCount = useMemo(() => {
    if (!currentRecord) return 0;
    let count = 0;
    if (currentRecord.wakeUpEarly) count++;
    if (prayers.subuh && prayers.dhuhur && prayers.ashar && prayers.maghrib && prayers.isya) count++;
    else if (prayers.dhuhur || prayers.ashar || prayers.maghrib) count += 0.5;
    if (currentRecord.exercise) count++;
    if (meals.pagi && meals.siang && meals.malam) count++;
    else if (meals.pagi || meals.siang || meals.malam) count += 0.5;
    if (currentRecord.loveLearning) count++;
    if (currentRecord.socializing) count++;
    if (currentRecord.sleepEarly) count++;
    return Math.floor(count);
  }, [currentRecord, prayers, meals]);

  // Handle single field toggle
  const handleToggleHabit = (date: string, field: keyof CharacterHabitRecord, val: any) => {
    if (!selectedStudentId) return;

    const existing = (characterRecords || []).find(
      (r) => r.studentId === selectedStudentId && r.date === date
    );

    if (existing) {
      const updated = (characterRecords || []).map((r) =>
        r.id === existing.id ? { ...r, [field]: val } : r
      );
      setCharacterRecords(updated);
    } else {
      const newRec: CharacterHabitRecord = {
        id: `hab-${selectedStudentId}-${date}`,
        studentId: selectedStudentId,
        date,
        wakeUpEarly: field === 'wakeUpEarly' ? val : false,
        prayers: field === 'prayers' ? val : { subuh: false, dhuhur: false, ashar: false, maghrib: false, isya: false },
        exercise: field === 'exercise' ? val : false,
        healthyMeals: field === 'healthyMeals' ? val : { pagi: false, siang: false, malam: false },
        loveLearning: field === 'loveLearning' ? val : false,
        socializing: field === 'socializing' ? val : false,
        sleepEarly: field === 'sleepEarly' ? val : false,
      };
      setCharacterRecords([...characterRecords, newRec]);
    }
  };

  // MEGA 1-TAP ACTION: Mark all 7 habits complete for this student on selected date
  const handleMarkAllCompleteToday = () => {
    if (!selectedStudent) return;

    const date = selectedDate;
    const fullPrayers = { subuh: true, dhuhur: true, ashar: true, maghrib: true, isya: true };
    const fullMeals = { pagi: true, siang: true, malam: true };

    const existing = (characterRecords || []).find(
      (r) => r.studentId === selectedStudentId && r.date === date
    );

    if (existing) {
      const updated = (characterRecords || []).map((r) =>
        r.id === existing.id
          ? {
              ...r,
              wakeUpEarly: true,
              prayers: fullPrayers,
              exercise: true,
              healthyMeals: fullMeals,
              loveLearning: true,
              socializing: true,
              sleepEarly: true,
            }
          : r
      );
      setCharacterRecords(updated);
    } else {
      const newRec: CharacterHabitRecord = {
        id: `hab-${selectedStudentId}-${date}`,
        studentId: selectedStudentId,
        date,
        wakeUpEarly: true,
        prayers: fullPrayers,
        exercise: true,
        healthyMeals: fullMeals,
        loveLearning: true,
        socializing: true,
        sleepEarly: true,
      };
      setCharacterRecords([...characterRecords, newRec]);
    }

    showFeedback('success', `Alhamdulillah! 7 Kebiasaan ananda ${selectedStudent.name} ditandai Lengkap & Tertib.`);
  };

  // Reset all habits for today
  const handleResetToday = () => {
    if (!selectedStudent) return;
    const date = selectedDate;
    const emptyPrayers = { subuh: false, dhuhur: false, ashar: false, maghrib: false, isya: false };
    const emptyMeals = { pagi: false, siang: false, malam: false };

    const existing = (characterRecords || []).find(
      (r) => r.studentId === selectedStudentId && r.date === date
    );

    if (existing) {
      const updated = (characterRecords || []).map((r) =>
        r.id === existing.id
          ? {
              ...r,
              wakeUpEarly: false,
              prayers: emptyPrayers,
              exercise: false,
              healthyMeals: emptyMeals,
              loveLearning: false,
              socializing: false,
              sleepEarly: false,
            }
          : r
      );
      setCharacterRecords(updated);
    }
    showFeedback('info', `Data kebiasaan tanggal ${formatIndonesianDate(selectedDate)} telah direset.`);
  };

  // MASS ACTION: Mark all students in current class complete for today
  const handleMarkAllStudentsCompleteToday = () => {
    const date = selectedDate;
    const fullPrayers = { subuh: true, dhuhur: true, ashar: true, maghrib: true, isya: true };
    const fullMeals = { pagi: true, siang: true, malam: true };

    let updatedList = [...(characterRecords || [])];

    myStudents.forEach((st) => {
      const existingIdx = updatedList.findIndex((r) => r.studentId === st.id && r.date === date);
      if (existingIdx >= 0) {
        updatedList[existingIdx] = {
          ...updatedList[existingIdx],
          wakeUpEarly: true,
          prayers: fullPrayers,
          exercise: true,
          healthyMeals: fullMeals,
          loveLearning: true,
          socializing: true,
          sleepEarly: true,
        };
      } else {
        updatedList.push({
          id: `hab-${st.id}-${date}`,
          studentId: st.id,
          date,
          wakeUpEarly: true,
          prayers: fullPrayers,
          exercise: true,
          healthyMeals: fullMeals,
          loveLearning: true,
          socializing: true,
          sleepEarly: true,
        });
      }
    });

    setCharacterRecords(updatedList);
    showFeedback('success', `Berhasil! Seluruh siswa ${currentClass} (${myStudents.length} siswa) ditandai tertib hari ini.`);
  };

  // 1-CLICK MONTHLY ACTION: Mark entire selected month complete for this student
  const handleMarkEntireMonthComplete = () => {
    if (!selectedStudent) return;

    const daysInMonth = new Date(currentYear, selectedMonth + 1, 0).getDate();
    const fullPrayers = { subuh: true, dhuhur: true, ashar: true, maghrib: true, isya: true };
    const fullMeals = { pagi: true, siang: true, malam: true };

    let updatedList = [...(characterRecords || [])];

    for (let day = 1; day <= daysInMonth; day++) {
      const dateStr = `${currentYear}-${String(selectedMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      const existingIdx = updatedList.findIndex((r) => r.studentId === selectedStudentId && r.date === dateStr);

      if (existingIdx >= 0) {
        updatedList[existingIdx] = {
          ...updatedList[existingIdx],
          wakeUpEarly: true,
          prayers: fullPrayers,
          exercise: true,
          healthyMeals: fullMeals,
          loveLearning: true,
          socializing: true,
          sleepEarly: true,
        };
      } else {
        updatedList.push({
          id: `hab-${selectedStudentId}-${dateStr}`,
          studentId: selectedStudentId,
          date: dateStr,
          wakeUpEarly: true,
          prayers: fullPrayers,
          exercise: true,
          healthyMeals: fullMeals,
          loveLearning: true,
          socializing: true,
          sleepEarly: true,
        });
      }
    }

    setCharacterRecords(updatedList);
    showFeedback('success', `Bulan ${INDONESIAN_MONTH_NAMES[selectedMonth]} berhasil diisi penuh (${daysInMonth} hari) untuk ananda ${selectedStudent.name}.`);
  };

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
      if (!existing && isPresent) {
        changed = true;
        updatedList.push({
          id: `hab-${selectedStudentId}-${att.date}`,
          studentId: selectedStudentId,
          date: att.date,
          wakeUpEarly: true,
          prayers: { subuh: true, dhuhur: true, ashar: true, maghrib: true, isya: true },
          exercise: true,
          healthyMeals: { pagi: true, siang: true, malam: true },
          loveLearning: true,
          socializing: true,
          sleepEarly: true,
        });
      }
    });

    if (changed) {
      setCharacterRecords(updatedList);
      showFeedback('success', `Berhasil menyinkronkan kebiasaan dari catatan kehadiran siswa.`);
    } else {
      showFeedback('info', `Data kebiasaan sudah sesuai dengan presensi kehadiran.`);
    }
    return updatedList;
  };

  // Filter records for selected student and month
  const studentRecords = useMemo(() => {
    return (characterRecords || []).filter(
      (r) => r.studentId === selectedStudentId && r.date.includes(`-${String(selectedMonth + 1).padStart(2, '0')}-`)
    );
  }, [characterRecords, selectedStudentId, selectedMonth]);

  // Generate Varied AI / Algorithmic WhatsApp Report
  const handleGenerateAiDiagnostic = async (overrideSeed?: number, overrideTone?: ReportTone) => {
    if (!selectedStudent) return;

    const currentSeed = overrideSeed !== undefined ? overrideSeed : Math.floor(Math.random() * 1000000);
    setVariationSeed(currentSeed);
    const toneToUse = overrideTone || selectedTone;

    setIsGeneratingAi(true);

    try {
      const latestRecords = syncHabitsFromAttendance(aiStartDate, aiEndDate);
      const filteredRecs = latestRecords.filter(
        (r) => r.studentId === selectedStudentId && r.date >= aiStartDate && r.date <= aiEndDate
      );

      const res = await fetch('/api/ai/diagnose-character', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          studentName: selectedStudent.name,
          className: currentClass,
          teacherName: currentUser?.name || 'Wali Kelas',
          schoolName: schoolProfile?.namaMadrasah || 'Madrasah Ibtidaiyah',
          habitsData: filteredRecs,
          records: filteredRecs,
          startDate: aiStartDate,
          endDate: aiEndDate,
          tone: toneToUse,
          seed: currentSeed,
        }),
      });

      const data = await res.json();
      if (data.report) {
        setAiReportText(data.report);
        if (data.toneLabel) {
          setCurrentReportToneLabel(data.toneLabel);
        } else {
          const toneCfg = REPORT_TONE_OPTIONS.find((t) => t.id === toneToUse);
          if (toneCfg) setCurrentReportToneLabel(toneCfg.label);
        }
      } else {
        const generated = generateVaried7HabitsReport({
          studentName: selectedStudent.name,
          className: currentClass,
          teacherName: currentUser?.name || 'Wali Kelas',
          schoolName: schoolProfile?.namaMadrasah || 'Madrasah Ibtidaiyah',
          startDate: aiStartDate,
          endDate: aiEndDate,
          records: filteredRecs,
          tone: toneToUse,
          seed: currentSeed,
        });
        setAiReportText(generated.reportText);
        setCurrentReportToneLabel(generated.toneLabel);
      }
      showFeedback('success', 'Laporan narasi WhatsApp dengan variasi bahasa ramah berhasil disusun!');
    } catch {
      const filteredRecs = characterRecords.filter(
        (r) => r.studentId === selectedStudentId && r.date >= aiStartDate && r.date <= aiEndDate
      );
      const generated = generateVaried7HabitsReport({
        studentName: selectedStudent?.name || 'Siswa',
        className: currentClass,
        teacherName: currentUser?.name || 'Wali Kelas',
        schoolName: schoolProfile?.namaMadrasah || 'Madrasah Ibtidaiyah',
        startDate: aiStartDate,
        endDate: aiEndDate,
        records: filteredRecs,
        tone: toneToUse,
        seed: currentSeed,
      });
      setAiReportText(generated.reportText);
      setCurrentReportToneLabel(generated.toneLabel);
      showFeedback('success', 'Laporan WhatsApp dengan bahasa ramah siap dikirim.');
    } finally {
      setIsGeneratingAi(false);
    }
  };

  const handleNewVariation = () => {
    const nextSeed = Math.floor(Math.random() * 1000000);
    handleGenerateAiDiagnostic(nextSeed, selectedTone);
  };

  const handleCopyText = () => {
    navigator.clipboard.writeText(aiReportText);
    showFeedback('success', 'Teks laporan WhatsApp berhasil disalin ke clipboard!');
  };

  const handleSendWhatsApp = () => {
    if (!selectedStudent?.parentWa) {
      showFeedback('error', 'Nomor WhatsApp orang tua belum terdaftar di data siswa.');
      return;
    }
    let wa = selectedStudent.parentWa.trim();
    if (wa.startsWith('08')) wa = '62' + wa.slice(1);
    const url = `https://wa.me/${wa}?text=${encodeURIComponent(aiReportText)}`;
    window.open(url, '_blank');
  };

  // Export handlers
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

  // Helper to toggle all prayers at once
  const allPrayersDone = prayers.subuh && prayers.dhuhur && prayers.ashar && prayers.maghrib && prayers.isya;
  const toggleAllPrayers = () => {
    const target = !allPrayersDone;
    handleToggleHabit(selectedDate, 'prayers', {
      subuh: target,
      dhuhur: target,
      ashar: target,
      maghrib: target,
      isya: target,
    });
  };

  // Helper to toggle all meals at once
  const allMealsDone = meals.pagi && meals.siang && meals.malam;
  const toggleAllMeals = () => {
    const target = !allMealsDone;
    handleToggleHabit(selectedDate, 'healthyMeals', {
      pagi: target,
      siang: target,
      malam: target,
    });
  };

  return (
    <div className="space-y-6">
      {/* Toast Notification */}
      {feedbackMsg && (
        <div
          className={`fixed bottom-6 right-6 z-50 px-5 py-3.5 rounded-2xl shadow-xl border flex items-center gap-3 text-xs font-bold transition-all animate-bounce ${
            feedbackMsg.type === 'success'
              ? 'bg-emerald-600 text-white border-emerald-500'
              : feedbackMsg.type === 'error'
              ? 'bg-rose-600 text-white border-rose-500'
              : 'bg-slate-900 text-white border-slate-800'
          }`}
        >
          {feedbackMsg.type === 'success' ? (
            <CheckCircle2 className="w-5 h-5 text-emerald-200" />
          ) : feedbackMsg.type === 'error' ? (
            <AlertCircle className="w-5 h-5 text-rose-200" />
          ) : (
            <Sparkles className="w-5 h-5 text-amber-300" />
          )}
          <span>{feedbackMsg.text}</span>
        </div>
      )}

      {/* Top Header Card */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 md:p-6 shadow-xs">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-pink-500 to-rose-600 text-white flex items-center justify-center font-bold shadow-md shrink-0">
              <Heart className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg md:text-xl font-black text-slate-900 tracking-tight">
                  7 Kebiasaan Anak Indonesia Hebat
                </h2>
                <span className="text-[10px] font-extrabold uppercase bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-md">
                  Touch-Friendly
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Pengisian mudah & ramah sentuhan jempol untuk guru Madrasah Ibtidaiyah
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-1.5 px-3 py-2 bg-slate-100 rounded-xl text-xs">
              <Printer className="w-3.5 h-3.5 text-slate-500" />
              <span className="font-medium text-slate-600">Cetak:</span>
              <input
                type="date"
                value={printDate}
                onChange={(e) => setPrintDate(e.target.value)}
                className="bg-transparent font-semibold text-slate-800 focus:outline-none cursor-pointer"
              />
            </div>

            <button
              onClick={handleExportExcel}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-teal-50 hover:bg-teal-100 text-teal-800 border border-teal-200 font-bold text-xs rounded-xl transition-all cursor-pointer shadow-2xs"
            >
              <FileSpreadsheet className="w-4 h-4 text-teal-600" />
              Excel
            </button>

            <button
              onClick={handleExportPdf}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-rose-50 hover:bg-rose-100 text-rose-800 border border-rose-200 font-bold text-xs rounded-xl transition-all cursor-pointer shadow-2xs"
            >
              <FileText className="w-4 h-4 text-rose-600" />
              PDF Laporan
            </button>
          </div>
        </div>

        {/* View Mode Tabs (Large, finger-friendly segmented control) */}
        <div className="mt-4 flex flex-wrap gap-2 p-1.5 bg-slate-100/90 rounded-2xl border border-slate-200">
          <button
            onClick={() => setActiveMode('daily_touch')}
            className={`flex-1 min-w-[160px] py-2.5 px-4 rounded-xl text-xs font-black flex items-center justify-center gap-2 transition-all cursor-pointer ${
              activeMode === 'daily_touch'
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
            }`}
          >
            <Sparkles className="w-4 h-4 text-amber-300" />
            <span>Mode Harian (Ramah Jari)</span>
          </button>

          <button
            onClick={() => setActiveMode('monthly_table')}
            className={`flex-1 min-w-[160px] py-2.5 px-4 rounded-xl text-xs font-black flex items-center justify-center gap-2 transition-all cursor-pointer ${
              activeMode === 'monthly_table'
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
            }`}
          >
            <Calendar className="w-4 h-4" />
            <span>Mode Rekap 1 Bulan</span>
          </button>

          <button
            onClick={() => setActiveMode('ai_whatsapp')}
            className={`flex-1 min-w-[160px] py-2.5 px-4 rounded-xl text-xs font-black flex items-center justify-center gap-2 transition-all cursor-pointer ${
              activeMode === 'ai_whatsapp'
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
            }`}
          >
            <MessageSquare className="w-4 h-4 text-teal-300" />
            <span>Laporan AI WhatsApp</span>
          </button>
        </div>

        {/* Student Selector Card with Quick Cycle Arrows */}
        <div className="mt-4 p-4 bg-slate-50/80 rounded-2xl border border-slate-200 flex flex-col md:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-3 w-full md:w-auto">
            <button
              onClick={handlePrevStudent}
              title="Siswa Sebelumnya"
              className="p-2.5 bg-white hover:bg-slate-200 border border-slate-200 rounded-xl text-slate-700 transition-all cursor-pointer active:scale-95"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>

            <div className="flex-1 md:w-80">
              <label className="block text-[10px] font-extrabold uppercase text-slate-400 mb-1">
                Pilih Siswa ({currentStudentIdx + 1} dari {myStudents.length})
              </label>
              <select
                value={selectedStudentId}
                onChange={(e) => setSelectedStudentId(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-xl bg-white font-bold text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 cursor-pointer shadow-2xs"
              >
                {myStudents.map((st, i) => (
                  <option key={st.id} value={st.id}>
                    {i + 1}. {st.name} ({st.nisn ? `NISN: ${st.nisn}` : currentClass})
                  </option>
                ))}
              </select>
            </div>

            <button
              onClick={handleNextStudent}
              title="Siswa Berikutnya"
              className="p-2.5 bg-white hover:bg-slate-200 border border-slate-200 rounded-xl text-slate-700 transition-all cursor-pointer active:scale-95"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>

          {/* Quick Profile Pill */}
          {selectedStudent && (
            <div className="flex items-center gap-2 px-3 py-1.5 bg-white rounded-xl border border-slate-200 text-xs w-full md:w-auto justify-between md:justify-start">
              <span className="text-slate-500 font-medium">Status Siswa:</span>
              <span className="font-extrabold text-emerald-800 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-lg">
                {currentClass}
              </span>
              <span className="text-slate-400">·</span>
              <span className="text-slate-600 font-mono text-[11px]">
                {selectedStudent.parentWa ? `WA: ${selectedStudent.parentWa}` : 'Belum ada WA'}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* ============================================================ */}
      {/* TAB 1: MODE HARIAN RAMAH JARI (ANTI-PEGAL) */}
      {/* ============================================================ */}
      {activeMode === 'daily_touch' && (
        <div className="space-y-6">
          {/* Daily Horizontal Date Navigator */}
          <div className="bg-white rounded-2xl border border-slate-200 p-4 md:p-5 shadow-xs">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
              {/* Prev / Today / Next Controls */}
              <div className="flex items-center gap-2 w-full sm:w-auto">
                <button
                  onClick={handlePrevDay}
                  className="px-3.5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold text-xs flex items-center gap-1 transition-all cursor-pointer active:scale-95 shadow-2xs"
                >
                  <ChevronLeft className="w-4 h-4" />
                  <span>Kemarin</span>
                </button>

                <button
                  onClick={handleSetToday}
                  className={`px-4 py-2.5 rounded-xl font-extrabold text-xs transition-all cursor-pointer active:scale-95 shadow-2xs ${
                    selectedDate === todayDateStr
                      ? 'bg-emerald-600 text-white shadow-emerald-600/20'
                      : 'bg-white border border-slate-300 text-slate-800 hover:bg-slate-50'
                  }`}
                >
                  Hari Ini
                </button>

                <button
                  onClick={handleNextDay}
                  className="px-3.5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold text-xs flex items-center gap-1 transition-all cursor-pointer active:scale-95 shadow-2xs"
                >
                  <span>Besok</span>
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>

              {/* Date Display and Picker */}
              <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                <Calendar className="w-4 h-4 text-emerald-600" />
                <span className="text-xs font-black text-slate-900 tracking-tight">
                  {formatIndonesianDate(selectedDate)}
                </span>
                <input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="px-2 py-1 bg-slate-100 rounded-lg text-xs font-semibold text-slate-700 border border-slate-200 cursor-pointer"
                />
              </div>
            </div>

            {/* Mega 1-Tap Action Bar (Anti-Pegal Hero) */}
            <div className="mt-4 pt-4 border-t border-slate-100 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
              {/* Progress Count */}
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-center font-black text-sm text-emerald-800 shrink-0">
                  {todayFulfilledCount}/7
                </div>
                <div>
                  <div className="text-xs font-extrabold text-slate-800">
                    {todayFulfilledCount === 7
                      ? '🌟 Sempurna! Semua 7 Kebiasaan Terpenuhi'
                      : todayFulfilledCount >= 4
                      ? 'Cukup Baik (Sebagian Besar Terpenuhi)'
                      : 'Belum Terisi / Perlu Penilaian'}
                  </div>
                  <div className="text-[11px] text-slate-500">
                    Untuk ananda <strong className="text-slate-700">{selectedStudent?.name}</strong>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-wrap items-center gap-2">
                <button
                  onClick={handleResetToday}
                  title="Reset status hari ini"
                  className="px-3.5 py-3 rounded-xl border border-slate-200 hover:bg-slate-100 text-slate-600 font-bold text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer active:scale-95 shadow-2xs"
                >
                  <RotateCcw className="w-4 h-4 text-slate-500" />
                  <span>Reset</span>
                </button>

                <button
                  onClick={handleMarkAllStudentsCompleteToday}
                  title="Tandai seluruh siswa di kelas tertib hari ini"
                  className="px-4 py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-extrabold text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer active:scale-95 shadow-md"
                >
                  <Users className="w-4 h-4 text-teal-300" />
                  <span>Terapkan 1 Kelas</span>
                </button>

                {/* THE MAIN 1-TAP BUTTON */}
                <button
                  onClick={handleMarkAllCompleteToday}
                  className="flex-1 md:flex-initial px-6 py-3 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-black text-xs md:text-sm flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/30 transition-all cursor-pointer active:scale-95"
                >
                  <Sparkles className="w-4 h-4 text-amber-300" />
                  <span>1-Tap: Semua Tertib & Lengkap</span>
                </button>
              </div>
            </div>
          </div>

          {/* 7 Large Touch-Friendly Habit Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* 1. Bangun Pagi */}
            <div
              className={`p-5 rounded-2xl border transition-all shadow-xs ${
                currentRecord?.wakeUpEarly
                  ? 'bg-emerald-50/60 border-emerald-300 ring-1 ring-emerald-400/40'
                  : 'bg-white border-slate-200 hover:border-slate-300'
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div
                    className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 ${
                      currentRecord?.wakeUpEarly
                        ? 'bg-emerald-600 text-white shadow-md'
                        : 'bg-amber-100 text-amber-700'
                    }`}
                  >
                    <Sun className="w-6 h-6" />
                  </div>
                  <div>
                    <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">Kebiasaan 1</span>
                    <h3 className="text-sm font-bold text-slate-900">Bangun Pagi</h3>
                    <p className="text-[11px] text-slate-500">Bangun sebelum adzan Subuh dengan bugar</p>
                  </div>
                </div>
              </div>

              <div className="mt-4">
                <button
                  type="button"
                  onClick={() => handleToggleHabit(selectedDate, 'wakeUpEarly', !currentRecord?.wakeUpEarly)}
                  className={`w-full py-3.5 px-4 rounded-xl font-black text-xs flex items-center justify-center gap-2 transition-all cursor-pointer active:scale-95 shadow-xs ${
                    currentRecord?.wakeUpEarly
                      ? 'bg-emerald-600 text-white hover:bg-emerald-700'
                      : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200'
                  }`}
                >
                  {currentRecord?.wakeUpEarly ? (
                    <>
                      <Check className="w-5 h-5 text-white" />
                      <span>Ya, Bangun Pagi Disiplin</span>
                    </>
                  ) : (
                    <>
                      <X className="w-4 h-4 text-slate-400" />
                      <span>Sentuh untuk Tandai Bangun Pagi</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* 2. Beribadah (Sholat 5 Waktu) */}
            <div
              className={`p-5 rounded-2xl border transition-all shadow-xs ${
                allPrayersDone
                  ? 'bg-emerald-50/60 border-emerald-300 ring-1 ring-emerald-400/40'
                  : 'bg-white border-slate-200 hover:border-slate-300'
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div
                    className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 ${
                      allPrayersDone ? 'bg-emerald-600 text-white shadow-md' : 'bg-teal-100 text-teal-700'
                    }`}
                  >
                    <Moon className="w-6 h-6" />
                  </div>
                  <div>
                    <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">Kebiasaan 2</span>
                    <h3 className="text-sm font-bold text-slate-900">Beribadah (Sholat 5 Waktu)</h3>
                    <p className="text-[11px] text-slate-500">Ketaatan ibadah Subuh s/d Isya</p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={toggleAllPrayers}
                  className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase transition-all cursor-pointer active:scale-95 ${
                    allPrayersDone
                      ? 'bg-emerald-600 text-white'
                      : 'bg-slate-200 hover:bg-slate-300 text-slate-700'
                  }`}
                >
                  {allPrayersDone ? '5 Waktu Full' : 'Tandai Semua'}
                </button>
              </div>

              {/* 5 Big Touch Prayer Buttons */}
              <div className="mt-4 grid grid-cols-5 gap-1.5">
                {[
                  { key: 'subuh', label: 'Subuh' },
                  { key: 'dhuhur', label: 'Dhuhur' },
                  { key: 'ashar', label: 'Ashar' },
                  { key: 'maghrib', label: 'Maghrib' },
                  { key: 'isya', label: 'Isya' },
                ].map(({ key, label }) => {
                  const isChecked = (prayers as any)[key];
                  return (
                    <button
                      key={key}
                      type="button"
                      onClick={() =>
                        handleToggleHabit(selectedDate, 'prayers', {
                          ...prayers,
                          [key]: !isChecked,
                        })
                      }
                      className={`h-12 rounded-xl flex flex-col items-center justify-center text-[10px] font-black transition-all cursor-pointer active:scale-90 shadow-2xs ${
                        isChecked
                          ? 'bg-emerald-600 text-white hover:bg-emerald-700 ring-2 ring-emerald-600/30'
                          : 'bg-slate-100 text-slate-400 hover:bg-slate-200 border border-slate-200'
                      }`}
                    >
                      <span className="text-xs">{isChecked ? '✓' : '—'}</span>
                      <span>{label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 3. Berolahraga */}
            <div
              className={`p-5 rounded-2xl border transition-all shadow-xs ${
                currentRecord?.exercise
                  ? 'bg-emerald-50/60 border-emerald-300 ring-1 ring-emerald-400/40'
                  : 'bg-white border-slate-200 hover:border-slate-300'
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div
                    className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 ${
                      currentRecord?.exercise ? 'bg-emerald-600 text-white shadow-md' : 'bg-indigo-100 text-indigo-700'
                    }`}
                  >
                    <Activity className="w-6 h-6" />
                  </div>
                  <div>
                    <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">Kebiasaan 3</span>
                    <h3 className="text-sm font-bold text-slate-900">Berolahraga</h3>
                    <p className="text-[11px] text-slate-500">Senam, lari, bermain aktif, atau olah tubuh</p>
                  </div>
                </div>
              </div>

              <div className="mt-4">
                <button
                  type="button"
                  onClick={() => handleToggleHabit(selectedDate, 'exercise', !currentRecord?.exercise)}
                  className={`w-full py-3.5 px-4 rounded-xl font-black text-xs flex items-center justify-center gap-2 transition-all cursor-pointer active:scale-95 shadow-xs ${
                    currentRecord?.exercise
                      ? 'bg-emerald-600 text-white hover:bg-emerald-700'
                      : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200'
                  }`}
                >
                  {currentRecord?.exercise ? (
                    <>
                      <Check className="w-5 h-5 text-white" />
                      <span>Ya, Berolahraga & Aktif</span>
                    </>
                  ) : (
                    <>
                      <X className="w-4 h-4 text-slate-400" />
                      <span>Sentuh untuk Tandai Olahraga</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* 4. Makan Sehat & Bergizi */}
            <div
              className={`p-5 rounded-2xl border transition-all shadow-xs ${
                allMealsDone
                  ? 'bg-emerald-50/60 border-emerald-300 ring-1 ring-emerald-400/40'
                  : 'bg-white border-slate-200 hover:border-slate-300'
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div
                    className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 ${
                      allMealsDone ? 'bg-emerald-600 text-white shadow-md' : 'bg-emerald-100 text-emerald-700'
                    }`}
                  >
                    <Utensils className="w-6 h-6" />
                  </div>
                  <div>
                    <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">Kebiasaan 4</span>
                    <h3 className="text-sm font-bold text-slate-900">Makan Sehat & Bergizi</h3>
                    <p className="text-[11px] text-slate-500">Sarapan, makan siang, dan malam bergizi</p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={toggleAllMeals}
                  className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase transition-all cursor-pointer active:scale-95 ${
                    allMealsDone
                      ? 'bg-emerald-600 text-white'
                      : 'bg-slate-200 hover:bg-slate-300 text-slate-700'
                  }`}
                >
                  {allMealsDone ? '3x Lengkap' : 'Tandai 3x'}
                </button>
              </div>

              {/* 3 Meal Touch Buttons */}
              <div className="mt-4 grid grid-cols-3 gap-2">
                {[
                  { key: 'pagi', label: 'Sarapan Pagi' },
                  { key: 'siang', label: 'Makan Siang' },
                  { key: 'malam', label: 'Makan Malam' },
                ].map(({ key, label }) => {
                  const isChecked = (meals as any)[key];
                  return (
                    <button
                      key={key}
                      type="button"
                      onClick={() =>
                        handleToggleHabit(selectedDate, 'healthyMeals', {
                          ...meals,
                          [key]: !isChecked,
                        })
                      }
                      className={`h-12 rounded-xl flex items-center justify-center gap-1.5 text-xs font-black transition-all cursor-pointer active:scale-90 shadow-2xs ${
                        isChecked
                          ? 'bg-emerald-600 text-white hover:bg-emerald-700 ring-2 ring-emerald-600/30'
                          : 'bg-slate-100 text-slate-500 hover:bg-slate-200 border border-slate-200'
                      }`}
                    >
                      <span>{isChecked ? '✓' : '—'}</span>
                      <span>{label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 5. Gemar Belajar */}
            <div
              className={`p-5 rounded-2xl border transition-all shadow-xs ${
                currentRecord?.loveLearning
                  ? 'bg-emerald-50/60 border-emerald-300 ring-1 ring-emerald-400/40'
                  : 'bg-white border-slate-200 hover:border-slate-300'
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div
                    className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 ${
                      currentRecord?.loveLearning
                        ? 'bg-emerald-600 text-white shadow-md'
                        : 'bg-sky-100 text-sky-700'
                    }`}
                  >
                    <BookOpen className="w-6 h-6" />
                  </div>
                  <div>
                    <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">Kebiasaan 5</span>
                    <h3 className="text-sm font-bold text-slate-900">Gemar Belajar</h3>
                    <p className="text-[11px] text-slate-500">Membaca buku, mengulang pelajaran, atau tugas</p>
                  </div>
                </div>
              </div>

              <div className="mt-4">
                <button
                  type="button"
                  onClick={() => handleToggleHabit(selectedDate, 'loveLearning', !currentRecord?.loveLearning)}
                  className={`w-full py-3.5 px-4 rounded-xl font-black text-xs flex items-center justify-center gap-2 transition-all cursor-pointer active:scale-95 shadow-xs ${
                    currentRecord?.loveLearning
                      ? 'bg-emerald-600 text-white hover:bg-emerald-700'
                      : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200'
                  }`}
                >
                  {currentRecord?.loveLearning ? (
                    <>
                      <Check className="w-5 h-5 text-white" />
                      <span>Ya, Rajin Belajar Mandiri</span>
                    </>
                  ) : (
                    <>
                      <X className="w-4 h-4 text-slate-400" />
                      <span>Sentuh untuk Tandai Gemar Belajar</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* 6. Bermasyarakat */}
            <div
              className={`p-5 rounded-2xl border transition-all shadow-xs ${
                currentRecord?.socializing
                  ? 'bg-emerald-50/60 border-emerald-300 ring-1 ring-emerald-400/40'
                  : 'bg-white border-slate-200 hover:border-slate-300'
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div
                    className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 ${
                      currentRecord?.socializing
                        ? 'bg-emerald-600 text-white shadow-md'
                        : 'bg-purple-100 text-purple-700'
                    }`}
                  >
                    <Users className="w-6 h-6" />
                  </div>
                  <div>
                    <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">Kebiasaan 6</span>
                    <h3 className="text-sm font-bold text-slate-900">Bermasyarakat</h3>
                    <p className="text-[11px] text-slate-500">Santun, tolong-menolong, dan peduli sesama</p>
                  </div>
                </div>
              </div>

              <div className="mt-4">
                <button
                  type="button"
                  onClick={() => handleToggleHabit(selectedDate, 'socializing', !currentRecord?.socializing)}
                  className={`w-full py-3.5 px-4 rounded-xl font-black text-xs flex items-center justify-center gap-2 transition-all cursor-pointer active:scale-95 shadow-xs ${
                    currentRecord?.socializing
                      ? 'bg-emerald-600 text-white hover:bg-emerald-700'
                      : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200'
                  }`}
                >
                  {currentRecord?.socializing ? (
                    <>
                      <Check className="w-5 h-5 text-white" />
                      <span>Ya, Ramah & Peduli Teman</span>
                    </>
                  ) : (
                    <>
                      <X className="w-4 h-4 text-slate-400" />
                      <span>Sentuh untuk Tandai Bermasyarakat</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* 7. Tidur Cepat (Full width or span-2 on desktop) */}
            <div
              className={`p-5 rounded-2xl border transition-all shadow-xs md:col-span-2 ${
                currentRecord?.sleepEarly
                  ? 'bg-emerald-50/60 border-emerald-300 ring-1 ring-emerald-400/40'
                  : 'bg-white border-slate-200 hover:border-slate-300'
              }`}
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div
                    className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 ${
                      currentRecord?.sleepEarly ? 'bg-emerald-600 text-white shadow-md' : 'bg-slate-800 text-white'
                    }`}
                  >
                    <Moon className="w-6 h-6" />
                  </div>
                  <div>
                    <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">Kebiasaan 7</span>
                    <h3 className="text-sm font-bold text-slate-900">Tidur Cepat</h3>
                    <p className="text-[11px] text-slate-500">Istirahat malam tepat waktu sebelum pukul 21.00 WIB</p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => handleToggleHabit(selectedDate, 'sleepEarly', !currentRecord?.sleepEarly)}
                  className={`py-3.5 px-6 rounded-xl font-black text-xs flex items-center justify-center gap-2 transition-all cursor-pointer active:scale-95 shadow-xs ${
                    currentRecord?.sleepEarly
                      ? 'bg-emerald-600 text-white hover:bg-emerald-700'
                      : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200'
                  }`}
                >
                  {currentRecord?.sleepEarly ? (
                    <>
                      <Check className="w-5 h-5 text-white" />
                      <span>Ya, Tidur Tepat Waktu</span>
                    </>
                  ) : (
                    <>
                      <X className="w-4 h-4 text-slate-400" />
                      <span>Sentuh untuk Tandai Tidur Cepat</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* TAB 2: MODE REKAP 1 BULAN (TABLE & MASS ACTIONS) */}
      {/* ============================================================ */}
      {activeMode === 'monthly_table' && (
        <div className="space-y-6">
          {/* Quick Month Actions Bar */}
          <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <label className="text-xs font-bold text-slate-700">Pilih Bulan:</label>
              <select
                value={selectedMonth}
                onChange={(e) => {
                  const m = parseInt(e.target.value, 10);
                  setSelectedMonth(m);
                  const lastDay = new Date(currentYear, m + 1, 0).getDate();
                  setAiStartDate(`${currentYear}-${String(m + 1).padStart(2, '0')}-01`);
                  setAiEndDate(`${currentYear}-${String(m + 1).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`);
                }}
                className="px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-extrabold text-xs text-slate-800"
              >
                {INDONESIAN_MONTH_NAMES.map((m, idx) => (
                  <option key={idx} value={idx}>
                    {m} {currentYear}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => syncHabitsFromAttendance(aiStartDate, aiEndDate)}
                className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs rounded-xl flex items-center gap-1.5 transition-all cursor-pointer shadow-2xs"
              >
                <Zap className="w-4 h-4 text-amber-500" />
                <span>Sinkron dari Presensi</span>
              </button>

              <button
                type="button"
                onClick={handleMarkEntireMonthComplete}
                className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs rounded-xl flex items-center gap-2 transition-all cursor-pointer shadow-md active:scale-95"
              >
                <Award className="w-4 h-4 text-amber-300" />
                <span>1-Klik: Tandai 1 Bulan Penuh Lengkap</span>
              </button>
            </div>
          </div>

          {/* Month Calendar Grid Table */}
          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
            <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
              <span className="text-xs font-black text-slate-800">
                Tabel Evaluasi: {selectedStudent?.name} ({INDONESIAN_MONTH_NAMES[selectedMonth]} {currentYear})
              </span>
              <span className="text-[11px] text-slate-500">
                Klik tanggal atau tombol status untuk mengubah nilai
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-100 text-slate-700 font-black text-[11px] uppercase tracking-wider">
                    <th className="p-3 text-center w-12">No</th>
                    <th className="p-3">Tanggal</th>
                    <th className="p-3 text-center">Bangun Pagi</th>
                    <th className="p-3 text-center">Sholat 5 Waktu</th>
                    <th className="p-3 text-center">Olahraga</th>
                    <th className="p-3 text-center">Makan Sehat</th>
                    <th className="p-3 text-center">Belajar</th>
                    <th className="p-3 text-center">Bermasyarakat</th>
                    <th className="p-3 text-center">Tidur Cepat</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {Array.from({ length: new Date(currentYear, selectedMonth + 1, 0).getDate() }).map((_, idx) => {
                    const dayNum = idx + 1;
                    const dateStr = `${currentYear}-${String(selectedMonth + 1).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`;
                    const rec = (studentRecords || []).find((r) => r.date === dateStr);
                    const p = rec ? rec.prayers : { subuh: false, dhuhur: false, ashar: false, maghrib: false, isya: false };
                    const m = rec ? rec.healthyMeals : { pagi: false, siang: false, malam: false };
                    const allP = p.subuh && p.dhuhur && p.ashar && p.maghrib && p.isya;
                    const allM = m.pagi && m.siang && m.malam;

                    return (
                      <tr key={dateStr} className="hover:bg-slate-50 transition-colors">
                        <td className="p-3 text-center text-slate-400 font-medium">{idx + 1}</td>
                        <td className="p-3 font-bold text-slate-900 whitespace-nowrap">
                          {formatIndonesianDate(dateStr)}
                        </td>

                        {/* Bangun Pagi */}
                        <td className="p-3 text-center">
                          <button
                            onClick={() => handleToggleHabit(dateStr, 'wakeUpEarly', !rec?.wakeUpEarly)}
                            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                              rec?.wakeUpEarly
                                ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                                : 'bg-slate-100 text-slate-400 hover:bg-slate-200'
                            }`}
                          >
                            {rec?.wakeUpEarly ? '✓ Ya' : '—'}
                          </button>
                        </td>

                        {/* Sholat 5 Waktu */}
                        <td className="p-3 text-center">
                          <button
                            onClick={() =>
                              handleToggleHabit(dateStr, 'prayers', {
                                subuh: !allP,
                                dhuhur: !allP,
                                ashar: !allP,
                                maghrib: !allP,
                                isya: !allP,
                              })
                            }
                            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                              allP
                                ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                                : p.dhuhur || p.ashar
                                ? 'bg-amber-100 text-amber-800 border border-amber-300'
                                : 'bg-slate-100 text-slate-400 hover:bg-slate-200'
                            }`}
                          >
                            {allP ? '✓ 5 Waktu' : p.dhuhur || p.ashar ? 'Sebagian' : '—'}
                          </button>
                        </td>

                        {/* Olahraga */}
                        <td className="p-3 text-center">
                          <button
                            onClick={() => handleToggleHabit(dateStr, 'exercise', !rec?.exercise)}
                            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                              rec?.exercise
                                ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                                : 'bg-slate-100 text-slate-400 hover:bg-slate-200'
                            }`}
                          >
                            {rec?.exercise ? '✓ Ya' : '—'}
                          </button>
                        </td>

                        {/* Makan Sehat */}
                        <td className="p-3 text-center">
                          <button
                            onClick={() =>
                              handleToggleHabit(dateStr, 'healthyMeals', {
                                pagi: !allM,
                                siang: !allM,
                                malam: !allM,
                              })
                            }
                            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                              allM
                                ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                                : m.pagi || m.siang
                                ? 'bg-amber-100 text-amber-800 border border-amber-300'
                                : 'bg-slate-100 text-slate-400 hover:bg-slate-200'
                            }`}
                          >
                            {allM ? '✓ 3x' : m.pagi || m.siang ? 'Sebagian' : '—'}
                          </button>
                        </td>

                        {/* Belajar */}
                        <td className="p-3 text-center">
                          <button
                            onClick={() => handleToggleHabit(dateStr, 'loveLearning', !rec?.loveLearning)}
                            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                              rec?.loveLearning
                                ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                                : 'bg-slate-100 text-slate-400 hover:bg-slate-200'
                            }`}
                          >
                            {rec?.loveLearning ? '✓ Ya' : '—'}
                          </button>
                        </td>

                        {/* Bermasyarakat */}
                        <td className="p-3 text-center">
                          <button
                            onClick={() => handleToggleHabit(dateStr, 'socializing', !rec?.socializing)}
                            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                              rec?.socializing
                                ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                                : 'bg-slate-100 text-slate-400 hover:bg-slate-200'
                            }`}
                          >
                            {rec?.socializing ? '✓ Ya' : '—'}
                          </button>
                        </td>

                        {/* Tidur Cepat */}
                        <td className="p-3 text-center">
                          <button
                            onClick={() => handleToggleHabit(dateStr, 'sleepEarly', !rec?.sleepEarly)}
                            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                              rec?.sleepEarly
                                ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                                : 'bg-slate-100 text-slate-400 hover:bg-slate-200'
                            }`}
                          >
                            {rec?.sleepEarly ? '✓ Ya' : '—'}
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* TAB 3: LAPORAN AI WHATSAPP */}
      {/* ============================================================ */}
      {activeMode === 'ai_whatsapp' && (
        <div className="space-y-6">
          <div className="bg-gradient-to-r from-emerald-950 via-slate-900 to-teal-950 rounded-2xl p-6 text-white shadow-xl space-y-6 border border-emerald-800/40">
            {/* Header & Student Switcher */}
            <div className="flex flex-wrap items-center justify-between pb-4 border-b border-emerald-800/60 gap-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-400/20 text-amber-300 flex items-center justify-center font-bold">
                  <Sparkles className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-extrabold text-sm md:text-base text-white flex items-center gap-2">
                    <span>AI Diagnostik Karakter & Pesan WhatsApp</span>
                    <span className="text-[10px] bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-2 py-0.5 rounded-full font-medium">
                      Multi-Variasi Ramah
                    </span>
                  </h3>
                  <p className="text-xs text-emerald-200/80">
                    Menyusun narasi evaluasi karakter 7 Kebiasaan yang ramah, hangat, bervariasi & menyentuh hati Orang Tua
                  </p>
                </div>
              </div>

              {/* Quick Student Switcher */}
              <div className="flex items-center gap-2 bg-emerald-900/60 border border-emerald-700/60 rounded-xl p-1.5">
                <button
                  type="button"
                  onClick={handlePrevStudent}
                  title="Siswa Sebelumnya"
                  className="p-1 rounded-lg hover:bg-emerald-800/80 text-emerald-200 hover:text-white transition-colors cursor-pointer"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <div className="px-2 text-center">
                  <div className="text-xs font-bold text-white truncate max-w-[150px] md:max-w-[200px]">
                    {selectedStudent?.name}
                  </div>
                  <div className="text-[10px] text-emerald-300">
                    {currentStudentIdx + 1} dari {myStudents.length} Siswa
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleNextStudent}
                  title="Siswa Berikutnya"
                  className="p-1 rounded-lg hover:bg-emerald-800/80 text-emerald-200 hover:text-white transition-colors cursor-pointer"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Date Range Inputs */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
              <div>
                <label className="block text-[11px] font-medium text-emerald-200 mb-1.5 flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-emerald-300" />
                  <span>Tanggal Awal Pemantauan</span>
                </label>
                <input
                  type="date"
                  value={aiStartDate}
                  onChange={(e) => setAiStartDate(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-white/10 border border-emerald-700/80 rounded-xl text-white font-mono focus:outline-none focus:ring-2 focus:ring-emerald-400"
                />
              </div>

              <div>
                <label className="block text-[11px] font-medium text-emerald-200 mb-1.5 flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-emerald-300" />
                  <span>Tanggal Akhir Pemantauan</span>
                </label>
                <input
                  type="date"
                  value={aiEndDate}
                  onChange={(e) => setAiEndDate(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-white/10 border border-emerald-700/80 rounded-xl text-white font-mono focus:outline-none focus:ring-2 focus:ring-emerald-400"
                />
              </div>
            </div>

            {/* Multi-Tone & Style Selector */}
            <div className="space-y-2.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-emerald-100 flex items-center gap-2">
                  <Smile className="w-4 h-4 text-amber-300" />
                  <span>Pilihan Gaya & Bahasa Ramah Laporan:</span>
                </label>
                <span className="text-[11px] text-emerald-300/80">
                  Tiap gaya memiliki kosakata & sapaan unik
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
                {REPORT_TONE_OPTIONS.map((opt) => {
                  const isSelected = selectedTone === opt.id;
                  return (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => setSelectedTone(opt.id)}
                      className={`p-3 rounded-xl border text-left transition-all cursor-pointer relative ${
                        isSelected
                          ? 'bg-amber-400/20 border-amber-400 text-white shadow-md ring-1 ring-amber-400/50'
                          : 'bg-white/5 border-emerald-800/60 text-emerald-200 hover:bg-white/10 hover:border-emerald-600'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-bold text-white flex items-center gap-1.5">
                          {opt.label}
                        </span>
                        <span
                          className={`text-[10px] px-2 py-0.5 rounded-md font-semibold ${
                            isSelected
                              ? 'bg-amber-400 text-slate-950 font-bold'
                              : 'bg-emerald-900/60 text-emerald-300'
                          }`}
                        >
                          {opt.badge}
                        </span>
                      </div>
                      <p className="text-[11px] text-emerald-200/80 line-clamp-2 leading-relaxed">
                        {opt.description}
                      </p>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-wrap items-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => handleGenerateAiDiagnostic(undefined, selectedTone)}
                disabled={isGeneratingAi}
                className="flex-1 py-3 px-5 bg-gradient-to-r from-amber-400 via-amber-300 to-amber-500 hover:from-amber-300 hover:to-amber-400 text-slate-950 font-black text-xs md:text-sm rounded-xl shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 active:scale-95"
              >
                {isGeneratingAi ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin text-slate-950" />
                    <span>Menyusun Laporan Ramah...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4 text-slate-950" />
                    <span>Susun Laporan dengan Gaya Ini</span>
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={handleNewVariation}
                disabled={isGeneratingAi}
                title="Ganti ke kalimat dan variasi sapaan baru"
                className="py-3 px-4 bg-emerald-800/80 hover:bg-emerald-700/80 text-white font-bold text-xs rounded-xl border border-emerald-600/60 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 active:scale-95 shadow-md"
              >
                <Shuffle className="w-4 h-4 text-amber-300" />
                <span>Buat Variasi Lain (Acak Bahasa)</span>
              </button>
            </div>
          </div>

          {/* AI Narrative Result Card */}
          {aiReportText && (
            <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-4">
              <div className="flex flex-wrap items-center justify-between pb-3 border-b border-slate-100 gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold">
                    <MessageSquare className="w-5 h-5 text-emerald-600" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="text-sm font-bold text-slate-800">Pratinjau Pesan WhatsApp</h4>
                      <span className="text-[10px] font-semibold px-2 py-0.5 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-md">
                        Gaya: {currentReportToneLabel}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500">
                      Pesan untuk Orang Tua ananda <strong>{selectedStudent?.name}</strong>
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 flex-wrap">
                  <button
                    onClick={handleNewVariation}
                    disabled={isGeneratingAi}
                    className="flex items-center gap-1.5 px-3 py-2 bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-200 font-bold text-xs rounded-xl transition-all cursor-pointer shadow-2xs active:scale-95"
                    title="Ganti redaksi kalimat dengan variasi ramah yang berbeda"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 text-amber-700 ${isGeneratingAi ? 'animate-spin' : ''}`} />
                    <span>Acak Kalimat Baru</span>
                  </button>

                  <button
                    onClick={handleCopyText}
                    className="flex items-center gap-1.5 px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs rounded-xl transition-all cursor-pointer shadow-2xs active:scale-95"
                  >
                    <Copy className="w-4 h-4 text-slate-600" />
                    <span>Salin Pesan</span>
                  </button>

                  <button
                    onClick={handleSendWhatsApp}
                    className="flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl transition-all cursor-pointer shadow-xs active:scale-95"
                  >
                    <Send className="w-4 h-4" />
                    <span>Kirim ke WhatsApp Orang Tua</span>
                  </button>
                </div>
              </div>

              {/* Chat Simulation Container */}
              <div className="bg-[#efeae2] p-4 rounded-xl border border-slate-200 relative">
                <div className="max-w-2xl bg-white p-4 rounded-xl shadow-xs border border-slate-200/80 font-sans text-xs text-slate-800 leading-relaxed whitespace-pre-wrap max-h-[500px] overflow-y-auto">
                  {aiReportText}
                </div>
                <div className="mt-2 text-[11px] text-slate-500 flex items-center justify-between">
                  <span>💡 Tips: Anda dapat langsung menyalin teks atau klik <strong>Kirim ke WhatsApp</strong> untuk membuka chat dengan orang tua.</span>
                  <span className="font-mono text-[10px] text-slate-400">Variasi #{variationSeed % 1000}</span>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
