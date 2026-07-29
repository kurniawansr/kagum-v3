import React, { useState, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { GradeRecord } from '../../types';
import {
  Calculator,
  Save,
  Printer,
  FileSpreadsheet,
  FileText,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  Sparkles,
  Database,
  Layers,
  Edit3,
  Trash2,
  Info,
  Sliders,
  Check,
  X,
  Copy,
} from 'lucide-react';
import { exportToExcel, exportToPdf } from '../../utils/exportUtils';

export const AsesmenNilaiView: React.FC = () => {
  const { students, subjects, gradeRecords, setGradeRecords, currentUser, schoolProfile } = useApp();
  const currentClass = currentUser?.kelas || 'Kelas IA';
  const myStudents = students.filter((s) => s.kelas === currentClass);

  // Subject and Settings
  const [selectedSubjectCode, setSelectedSubjectCode] = useState<string>(subjects[0]?.code || 'QH');
  const currentSubject =
    (subjects || []).find((s) => s && s.code === selectedSubjectCode) ||
    (subjects || [])[0] || { code: 'QH', name: "Al-Qur'an Hadis", kktp: 70, lingkupMateriCount: 3 };

  // User-configurable LM count and TP count per LM (bisa berbeda per LM)
  const [lmCount, setLmCount] = useState<number>(currentSubject.lingkupMateriCount || 3);
  const [selectedLmIndex, setSelectedLmIndex] = useState<number>(1);
  const [selectedJenisPenilaian, setSelectedJenisPenilaian] = useState<'semua' | 'formatif' | 'sumatif' | 'sas'>('semua');
  const [tpCountsPerLm, setTpCountsPerLm] = useState<Record<number, number>>({
    1: 2,
    2: 2,
    3: 2,
    4: 2,
    5: 2,
    6: 2,
  });

  const getTpCount = (lm: number) => tpCountsPerLm[lm] ?? 0;

  // Calculate total formatif columns across all LMs
  const totalFormatifCols: number = Array.from({ length: lmCount }).reduce<number>(
    (sum, _, i) => sum + getTpCount(i + 1),
    0
  );

  const [printDate, setPrintDate] = useState(new Date().toISOString().split('T')[0]);
  const [message, setMessage] = useState('');

  // Mass input form states
  const [massTarget, setMassTarget] = useState<string>('all_ah');
  const [massScoreValue, setMassScoreValue] = useState<number>(85);

  // Modal states
  const [showMysqlModal, setShowMysqlModal] = useState<boolean>(false);
  const [editingStudentId, setEditingStudentId] = useState<string | null>(null);

  // Helper for keyboard navigation inside table inputs (Tab / Enter moves focus downward)
  const handleTableKeyDown = (
    e: React.KeyboardEvent<HTMLInputElement>,
    studentIdx: number,
    colIdx: number
  ) => {
    const totalCols = totalFormatifCols + lmCount + 1;
    const totalStudents = myStudents.length;

    if (e.key === 'Tab' || e.key === 'Enter' || e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      let nextStudentIdx = studentIdx;
      let nextColIdx = colIdx;

      if (e.key === 'ArrowUp' || (e.key === 'Tab' && e.shiftKey)) {
        e.preventDefault();
        if (studentIdx > 0) {
          nextStudentIdx = studentIdx - 1;
        } else {
          nextColIdx = (colIdx - 1 + totalCols) % totalCols;
          nextStudentIdx = totalStudents - 1;
        }
      } else if (e.key === 'ArrowDown' || e.key === 'Enter' || (e.key === 'Tab' && !e.shiftKey)) {
        e.preventDefault();
        if (studentIdx < totalStudents - 1) {
          nextStudentIdx = studentIdx + 1;
        } else {
          nextColIdx = (colIdx + 1) % totalCols;
          nextStudentIdx = 0;
        }
      } else {
        return;
      }

      const nextSelector = `input[data-student-idx="${nextStudentIdx}"][data-col-idx="${nextColIdx}"]`;
      const nextElem = document.querySelector<HTMLInputElement>(nextSelector);
      if (nextElem) {
        nextElem.focus();
        nextElem.select();
      }
    }
  };

  // Update lmCount when selected subject changes
  useEffect(() => {
    if (currentSubject) {
      setLmCount(currentSubject.lingkupMateriCount || 3);
    }
  }, [selectedSubjectCode]);

  // Main local score matrix: map key -> score (0-100)
  // Keys:
  // Formatif: `fmt_${studentId}_lm${lmIndex}_tp${tpIndex}`
  // Sumatif AH: `smt_${studentId}_ah${ahIndex}`
  // SAS: `sas_${studentId}`
  const [scoreMatrix, setScoreMatrix] = useState<Record<string, number>>({});

  // Populate local matrix from existing gradeRecords or sensible default
  useEffect(() => {
    const initialMap: Record<string, number> = {};

    myStudents.forEach((st) => {
      // 1. Populate Formatif TP Scores
      for (let lm = 1; lm <= lmCount; lm++) {
        const count = getTpCount(lm);
        for (let tp = 1; tp <= count; tp++) {
          const key = `fmt_${st.id}_lm${lm}_tp${tp}`;
          const existing = (gradeRecords || []).find(
            (g) =>
              g.studentId === st.id &&
              g.subjectCode === selectedSubjectCode &&
              g.type === 'formatif' &&
              g.lmNumber === lm &&
              g.tpNumber === tp
          );
          initialMap[key] = existing ? existing.score : 85;
        }
      }

      // 2. Populate Sumatif AH Scores
      for (let ah = 1; ah <= lmCount; ah++) {
        const key = `smt_${st.id}_ah${ah}`;
        const existing = (gradeRecords || []).find(
          (g) =>
            g.studentId === st.id &&
            g.subjectCode === selectedSubjectCode &&
            g.type === 'sumatif' &&
            g.ahNumber === ah
        );
        initialMap[key] = existing ? existing.score : 82;
      }

      // 3. Populate SAS Score
      const sasKey = `sas_${st.id}`;
      const existingSas = (gradeRecords || []).find(
        (g) =>
          g.studentId === st.id &&
          g.subjectCode === selectedSubjectCode &&
          g.type === 'sas'
      );
      initialMap[sasKey] = existingSas ? existingSas.score : 80;
    });

    setScoreMatrix(initialMap);
  }, [selectedSubjectCode, lmCount, tpCountsPerLm, students, currentClass, gradeRecords]);

  // Individual cell update handler
  const handleScoreChange = (key: string, val: number) => {
    const num = Math.min(100, Math.max(0, isNaN(val) ? 0 : val));
    setScoreMatrix((prev) => ({ ...prev, [key]: num }));
  };

  // Mass Input Handler
  const handleApplyMassInput = () => {
    const val = Math.min(100, Math.max(0, massScoreValue));
    setScoreMatrix((prev) => {
      const next = { ...prev };

      myStudents.forEach((st) => {
        if (massTarget === 'all') {
          // Fill everything
          for (let lm = 1; lm <= lmCount; lm++) {
            const count = getTpCount(lm);
            for (let tp = 1; tp <= count; tp++) {
              next[`fmt_${st.id}_lm${lm}_tp${tp}`] = val;
            }
            next[`smt_${st.id}_ah${lm}`] = val;
          }
          next[`sas_${st.id}`] = val;
        } else if (massTarget === 'all_tp') {
          // Fill all TP formatif
          for (let lm = 1; lm <= lmCount; lm++) {
            const count = getTpCount(lm);
            for (let tp = 1; tp <= count; tp++) {
              next[`fmt_${st.id}_lm${lm}_tp${tp}`] = val;
            }
          }
        } else if (massTarget === 'all_ah') {
          // Fill all AH sumatif
          for (let ah = 1; ah <= lmCount; ah++) {
            next[`smt_${st.id}_ah${ah}`] = val;
          }
        } else if (massTarget === 'sas') {
          next[`sas_${st.id}`] = val;
        } else if (massTarget.startsWith('fmt_lm')) {
          // Specific TP e.g. fmt_lm1_tp2
          const parts = massTarget.split('_'); // ['fmt', 'lm1', 'tp2']
          const lm = parseInt(parts[1].replace('lm', ''), 10);
          const tp = parseInt(parts[2].replace('tp', ''), 10);
          next[`fmt_${st.id}_lm${lm}_tp${tp}`] = val;
        } else if (massTarget.startsWith('smt_ah')) {
          // Specific AH e.g. smt_ah1
          const ah = parseInt(massTarget.replace('smt_ah', ''), 10);
          next[`smt_${st.id}_ah${ah}`] = val;
        }
      });

      return next;
    });

    setMessage(`Berhasil mengisi nilai masal (${val}) untuk target: ${massTarget.toUpperCase()}`);
    setTimeout(() => setMessage(''), 3000);
  };

  // Reset/Delete Single Student Scores
  const handleResetStudentScores = (studentId: string) => {
    setScoreMatrix((prev) => {
      const next = { ...prev };
      for (let lm = 1; lm <= lmCount; lm++) {
        const count = getTpCount(lm);
        for (let tp = 1; tp <= count; tp++) {
          next[`fmt_${studentId}_lm${lm}_tp${tp}`] = 0;
        }
        next[`smt_${studentId}_ah${lm}`] = 0;
      }
      next[`sas_${studentId}`] = 0;
      return next;
    });
    setMessage(`Nilai siswa telah dikosongkan/direset.`);
    setTimeout(() => setMessage(''), 3000);
  };

  // Helper calculation for student NA (Nilai Akhir)
  const getStudentCalculations = (studentId: string) => {
    // 1. Rata-rata Formatif (TP)
    let totalTpScore = 0;
    let tpCount = 0;
    for (let lm = 1; lm <= lmCount; lm++) {
      const count = getTpCount(lm);
      for (let tp = 1; tp <= count; tp++) {
        const score = scoreMatrix[`fmt_${studentId}_lm${lm}_tp${tp}`] ?? 85;
        totalTpScore += score;
        tpCount++;
      }
    }
    const avgFormatif = tpCount > 0 ? totalTpScore / tpCount : 0;

    // 2. Rata-rata Sumatif (AH)
    let totalAhScore = 0;
    for (let ah = 1; ah <= lmCount; ah++) {
      const score = scoreMatrix[`smt_${studentId}_ah${ah}`] ?? 82;
      totalAhScore += score;
    }
    const avgSumatifAH = lmCount > 0 ? totalAhScore / lmCount : 0;

    // 3. SAS Score
    const sasScore = scoreMatrix[`sas_${studentId}`] ?? 80;

    // 4. Nilai Akhir (NA)
    // Formula: (Rata Sumatif AH * sumatifWeight%) + (SAS * sasWeight%)
    const sumativeWeightFraction = ((currentSubject as any).sumatifWeight || 60) / 100;
    const sasWeightFraction = ((currentSubject as any).sasWeight || 40) / 100;

    const finalScore = Math.round(
      avgSumatifAH * sumativeWeightFraction + sasScore * sasWeightFraction
    );

    const isLunas = finalScore >= currentSubject.kktp;

    return {
      avgFormatif: Math.round(avgFormatif),
      avgSumatifAH: Math.round(avgSumatifAH),
      sasScore,
      finalScore,
      isLunas,
    };
  };

  // Save All Grades
  const handleSaveGrades = () => {
    // Remove existing records for this subject
    const remaining = gradeRecords.filter((g) => g.subjectCode !== selectedSubjectCode);

    const newGrades: GradeRecord[] = [];

    myStudents.forEach((st) => {
      // 1. Save Formatif TPs
      for (let lm = 1; lm <= lmCount; lm++) {
        const count = getTpCount(lm);
        for (let tp = 1; tp <= count; tp++) {
          const score = scoreMatrix[`fmt_${st.id}_lm${lm}_tp${tp}`] ?? 85;
          newGrades.push({
            id: `grd-${st.id}-${selectedSubjectCode}-fmt-lm${lm}-tp${tp}`,
            studentId: st.id,
            subjectCode: selectedSubjectCode,
            type: 'formatif',
            lmNumber: lm,
            tpNumber: tp,
            score,
          });
        }
      }

      // 2. Save Sumatif AHs
      for (let ah = 1; ah <= lmCount; ah++) {
        const score = scoreMatrix[`smt_${st.id}_ah${ah}`] ?? 82;
        newGrades.push({
          id: `grd-${st.id}-${selectedSubjectCode}-smt-ah${ah}`,
          studentId: st.id,
          subjectCode: selectedSubjectCode,
          type: 'sumatif',
          ahNumber: ah,
          score,
        });
      }

      // 3. Save SAS
      const sasScore = scoreMatrix[`sas_${st.id}`] ?? 80;
      newGrades.push({
        id: `grd-${st.id}-${selectedSubjectCode}-sas`,
        studentId: st.id,
        subjectCode: selectedSubjectCode,
        type: 'sas',
        score: sasScore,
      });
    });

    setGradeRecords([...remaining, ...newGrades]);
    setMessage('Daftar Nilai Asesmen Kurikulum Merdeka berhasil disimpan ke database!');
    setTimeout(() => setMessage(''), 4000);
  };

  // Export PDF with Multi-Level Table Header matching UI
  const handleExportPdf = () => {
    const totalTpCols = totalFormatifCols;
    const totalAhCols = lmCount;

    // Header Row 1
    const headRow1: any[] = [
      { content: 'No.', rowSpan: 3, styles: { halign: 'center', valign: 'middle' } },
      { content: 'NISN', rowSpan: 3, styles: { halign: 'center', valign: 'middle' } },
      { content: 'Nama Siswa', rowSpan: 3, styles: { halign: 'center', valign: 'middle' } },
    ];

    if (totalTpCols > 0) {
      headRow1.push({
        content: 'Asesmen Formatif (Proses / TP)',
        colSpan: totalTpCols,
        styles: { halign: 'center', valign: 'middle' },
      });
    }

    headRow1.push(
      { content: 'Asesmen Sumatif (AH)', colSpan: totalAhCols, styles: { halign: 'center', valign: 'middle' } },
      { content: 'SAS', rowSpan: 3, styles: { halign: 'center', valign: 'middle' } },
      { content: 'Nilai Akhir (NA)', rowSpan: 3, styles: { halign: 'center', valign: 'middle' } }
    );

    // Header Row 2
    const headRow2: any[] = [];
    // Formatif LMs
    for (let lm = 1; lm <= lmCount; lm++) {
      const count = getTpCount(lm);
      if (count > 0) {
        headRow2.push({
          content: `LM ${lm}`,
          colSpan: count,
          styles: { halign: 'center', valign: 'middle' },
        });
      }
    }
    // Sumatif AHs
    for (let ah = 1; ah <= lmCount; ah++) {
      headRow2.push({
        content: `AH ${ah}`,
        rowSpan: 2,
        styles: { halign: 'center', valign: 'middle' },
      });
    }

    // Header Row 3
    const headRow3: any[] = [];
    for (let lm = 1; lm <= lmCount; lm++) {
      const count = getTpCount(lm);
      for (let tp = 1; tp <= count; tp++) {
        headRow3.push({
          content: `TP ${tp}`,
          styles: { halign: 'center', valign: 'middle' },
        });
      }
    }

    const customHead = [headRow1, headRow2, headRow3];

    // Body Rows
    const tableRows = myStudents.map((st, idx) => {
      const row: (string | number)[] = [idx + 1, st.nisn, st.name];

      // Formatif TP scores
      for (let lm = 1; lm <= lmCount; lm++) {
        const count = getTpCount(lm);
        for (let tp = 1; tp <= count; tp++) {
          row.push(scoreMatrix[`fmt_${st.id}_lm${lm}_tp${tp}`] ?? 85);
        }
      }

      // Sumatif AH scores
      for (let ah = 1; ah <= lmCount; ah++) {
        row.push(scoreMatrix[`smt_${st.id}_ah${ah}`] ?? 82);
      }

      // SAS Score
      row.push(scoreMatrix[`sas_${st.id}`] ?? 80);

      // NA
      const calc = getStudentCalculations(st.id);
      row.push(calc.finalScore);

      return row;
    });

    const titleLines = [
      'DAFTAR NILAI',
      `KELAS ${currentClass.toUpperCase()}`,
      `SEMESTER ${schoolProfile.semester.toUpperCase()} TAHUN AJARAN ${schoolProfile.tahunAjaran}`,
      `MATA PELAJARAN: ${currentSubject.name.toUpperCase()} (${currentSubject.code})  |  KKTP: ${currentSubject.kktp}`,
    ];

    exportToPdf({
      filename: `Daftar_Nilai_${currentSubject.code}_${currentClass.replace(' ', '_')}`,
      titleLines,
      customHead,
      tableRows,
      schoolProfile,
      printDate,
      teacherName: currentUser?.name,
      teacherNip: currentUser?.nip,
      orientation: 'landscape', // Landscape format to fit all columns
      didParseCell: (data) => {
        // Highlight scores lower than KKTP with Rose Red text & light red background
        if (data.section === 'body') {
          const val = Number(data.cell.raw);
          if (!isNaN(val) && val < currentSubject.kktp && data.column.index >= 3) {
            data.cell.styles.textColor = [225, 29, 72]; // Rose-600
            data.cell.styles.fontStyle = 'bold';
            data.cell.styles.fillColor = [255, 241, 242]; // Rose-50
          }
        }
      },
    });
  };

  // Export Excel
  const handleExportExcel = () => {
    const flatHeaders = ['No', 'NISN', 'Nama Siswa'];

    for (let lm = 1; lm <= lmCount; lm++) {
      const count = getTpCount(lm);
      for (let tp = 1; tp <= count; tp++) {
        flatHeaders.push(`LM ${lm} TP ${tp}`);
      }
    }
    for (let ah = 1; ah <= lmCount; ah++) {
      flatHeaders.push(`AH ${ah}`);
    }
    flatHeaders.push('SAS');
    flatHeaders.push('Nilai Akhir (NA)');
    flatHeaders.push('Status KKTP');

    const rows = myStudents.map((st, idx) => {
      const row: (string | number)[] = [idx + 1, st.nisn, st.name];

      for (let lm = 1; lm <= lmCount; lm++) {
        const count = getTpCount(lm);
        for (let tp = 1; tp <= count; tp++) {
          row.push(scoreMatrix[`fmt_${st.id}_lm${lm}_tp${tp}`] ?? 85);
        }
      }
      for (let ah = 1; ah <= lmCount; ah++) {
        row.push(scoreMatrix[`smt_${st.id}_ah${ah}`] ?? 82);
      }
      row.push(scoreMatrix[`sas_${st.id}`] ?? 80);

      const calc = getStudentCalculations(st.id);
      row.push(calc.finalScore);
      row.push(calc.isLunas ? 'Tuntas' : 'Remedial');

      return row;
    });

    const headerLines = [
      'DAFTAR NILAI ASESMEN KURIKULUM MERDEKA',
      `Mata Pelajaran: ${currentSubject.name} (${currentSubject.code}) | KKTP: ${currentSubject.kktp}`,
      `Kelas: ${currentClass} | Semester: ${schoolProfile.semester} | Tahun Ajaran: ${schoolProfile.tahunAjaran}`,
    ];

    exportToExcel(
      `Daftar_Nilai_${currentSubject.code}_${currentClass.replace(' ', '_')}`,
      'Daftar Nilai',
      headerLines,
      flatHeaders,
      rows
    );
  };

  return (
    <div className="space-y-6">
      {/* Header Banner - Bento Theme */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 text-white shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-80 h-80 bg-teal-500/10 rounded-full blur-3xl pointer-events-none -mr-16 -mt-16"></div>

        <div className="space-y-2 relative z-10">
          <div className="flex items-center gap-2">
            <span className="px-3 py-1 bg-teal-500/20 text-teal-300 border border-teal-500/30 rounded-full text-xs font-bold">
              Kurikulum Merdeka 2026/2027
            </span>
            <span className="px-3 py-1 bg-slate-800 text-slate-300 border border-slate-700 rounded-full text-xs font-semibold">
              {currentClass}
            </span>
          </div>
          <h2 className="text-2xl font-black text-white tracking-tight flex items-center gap-2.5">
            <Calculator className="w-6 h-6 text-teal-400" />
            Input Nilai
          </h2>
          <p className="text-xs text-slate-400 max-w-2xl">
            Matriks penilaian terpadu: Asesmen Formatif (LM & TP), Asesmen Sumatif (AH), Sumatif Akhir Semester (SAS), dan Nilai Akhir (NA) dengan indikator KKTP otomatis.
          </p>
        </div>
      </div>

      {/* Action Buttons Below Black Header Card */}
      <div className="flex flex-wrap items-center justify-end gap-2">
        <button
          onClick={handleExportExcel}
          className="flex items-center gap-2 px-4 py-2.5 bg-emerald-700 hover:bg-emerald-600 text-white font-bold text-xs rounded-2xl shadow-xs transition-all cursor-pointer"
        >
          <FileSpreadsheet className="w-4 h-4" />
          Excel
        </button>

        <button
          onClick={handleExportPdf}
          className="flex items-center gap-2 px-4 py-2.5 bg-teal-600 hover:bg-teal-500 text-white font-bold text-xs rounded-2xl shadow-xs transition-all cursor-pointer"
        >
          <FileText className="w-4 h-4" />
          Cetak PDF Laporan
        </button>
      </div>

      {/* Control Panel Bento Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Card 1: Subject & Configuration */}
        <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs space-y-3">
          <div className="flex items-center gap-2 text-slate-800 font-extrabold text-xs uppercase tracking-wider">
            <Sliders className="w-4 h-4 text-teal-600" />
            Pengaturan Mapel & Struktur
          </div>

          <div>
            <label className="block text-[11px] font-bold text-slate-700 mb-1">Mata Pelajaran</label>
            <select
              value={selectedSubjectCode}
              onChange={(e) => setSelectedSubjectCode(e.target.value)}
              className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-slate-50 font-bold text-xs text-slate-800 focus:ring-2 focus:ring-teal-500"
            >
              {subjects.map((s) => (
                <option key={s.id} value={s.code}>
                  [{s.code}] {s.name} (KKTP: {s.kktp})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">
              Pilih Lingkup Materi (LM)
            </label>
            <select
              value={selectedLmIndex}
              onChange={(e) => setSelectedLmIndex(parseInt(e.target.value, 10) || 1)}
              className="w-full px-3 py-1.5 border border-slate-200 rounded-lg text-xs font-bold bg-white focus:ring-2 focus:ring-teal-500 cursor-pointer text-slate-800"
            >
              {Array.from({ length: Math.max(1, lmCount) }).map((_, idx) => (
                <option key={idx + 1} value={idx + 1}>
                  LM {idx + 1}
                </option>
              ))}
            </select>
          </div>

          {/* Form isian TP tunggal yang muncul setelah memilih LM */}
          {selectedLmIndex > 0 && (
            <div className="pt-2 border-t border-slate-100 space-y-1.5">
              <label className="block text-[10px] font-bold text-slate-500 uppercase">
                Jumlah TP (LM {selectedLmIndex})
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min={0}
                  max={10}
                  value={getTpCount(selectedLmIndex)}
                  onChange={(e) => {
                    const val = Math.max(0, parseInt(e.target.value, 10) || 0);
                    setTpCountsPerLm((prev) => ({ ...prev, [selectedLmIndex]: val }));
                  }}
                  className="w-full px-3 py-1.5 border border-slate-200 rounded-lg text-xs font-extrabold text-center bg-white text-teal-800 focus:outline-none focus:ring-2 focus:ring-teal-500"
                />
                <span className="text-xs font-bold text-slate-500">TP</span>
              </div>
              <p className="text-[10px] text-slate-400">
                * Tentukan banyaknya TP untuk LM {selectedLmIndex}.
              </p>
            </div>
          )}
        </div>

        {/* Card 2: Quick Information & Formula Summary */}
        <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs space-y-3 flex flex-col justify-between">
          <div className="flex items-center gap-2 text-slate-800 font-extrabold text-xs uppercase tracking-wider">
            <Layers className="w-4 h-4 text-teal-600" />
            Bobot Nilai dan KKTP
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
            <div className="p-3 bg-indigo-50/60 rounded-xl border border-indigo-100">
              <span className="text-[10px] font-bold text-indigo-500 uppercase block">Bobot Sumatif (AH)</span>
              <p className="font-extrabold text-indigo-900 text-sm mt-0.5">{(currentSubject as any).sumatifWeight ?? 60}%</p>
            </div>
            <div className="p-3 bg-amber-50/60 rounded-xl border border-amber-100">
              <span className="text-[10px] font-bold text-amber-600 uppercase block">Bobot SAS</span>
              <p className="font-extrabold text-amber-900 text-sm mt-0.5">{(currentSubject as any).sasWeight ?? 40}%</p>
            </div>
            <div className="p-3 bg-emerald-50/60 rounded-xl border border-emerald-100">
              <span className="text-[10px] font-bold text-emerald-600 uppercase block">KKTP</span>
              <p className="font-extrabold text-emerald-900 text-sm mt-0.5">{currentSubject.kktp}</p>
            </div>
          </div>
        </div>
      </div>

      {message && (
        <div className="p-4 bg-emerald-500/10 border border-emerald-500/30 text-emerald-800 rounded-2xl text-xs flex items-center justify-between font-bold shadow-xs">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            <span>{message}</span>
          </div>
          <button onClick={() => setMessage('')} className="text-emerald-800 hover:text-emerald-950">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Main Grade Matrix Table */}
      <div className="bg-white rounded-3xl border border-slate-200/80 p-6 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
          <div>
            <h3 className="font-extrabold text-slate-800 text-sm flex items-center gap-2">
              <span>Preview Matriks Nilai [{currentSubject.name}]</span>
            </h3>
            <p className="text-[11px] text-slate-400">
              Nilai &lt; {currentSubject.kktp} secara otomatis disorot dengan warna <span className="text-rose-600 font-bold">merah (remedial)</span>.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-500 font-medium">Tgl Cetak:</span>
            <input
              type="date"
              value={printDate}
              onChange={(e) => setPrintDate(e.target.value)}
              className="px-2.5 py-1 border border-slate-200 rounded-lg text-xs font-bold text-slate-700 bg-slate-50"
            />

            <button
              onClick={handleSaveGrades}
              className="flex items-center gap-2 px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-extrabold text-xs rounded-xl shadow-lg transition-all cursor-pointer ml-2"
            >
              <Save className="w-4 h-4 text-teal-400" />
              Simpan Permanen
            </button>
          </div>
        </div>

        {/* Form Input Nilai Masal Below Table Header */}
        <div className="p-4 bg-slate-50 border border-slate-200/80 rounded-2xl space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-slate-800 font-extrabold text-xs uppercase tracking-wider">
              <Sparkles className="w-4 h-4 text-amber-500" />
              Form Input Nilai Masal (Batch Fill)
            </div>
            <span className="text-[10px] text-slate-500 font-medium">Isi otomatis satu/seluruh kolom di bawah</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-end">
            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-1">Target Kolom Penilaian</label>
              <select
                value={massTarget}
                onChange={(e) => setMassTarget(e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-white font-semibold text-xs text-slate-800"
              >
                <option value="all">⚡ SEMUA KOLOM (Formatif, AH, SAS)</option>
                <option value="all_tp">Semua Asesmen Formatif (TP)</option>
                <option value="all_ah">Semua Asesmen Sumatif (AH)</option>
                <option value="sas">Sumatif Akhir Semester (SAS)</option>
                <optgroup label="Spesifik Formatif (LM / TP)">
                  {Array.from({ length: lmCount }).flatMap((_, i) => {
                    const lmIndex = i + 1;
                    const count = getTpCount(lmIndex);
                    return Array.from({ length: count }).map((__, j) => (
                      <option key={`fmt_lm${lmIndex}_tp${j + 1}`} value={`fmt_lm${lmIndex}_tp${j + 1}`}>
                        LM {lmIndex} - TP {j + 1}
                      </option>
                    ));
                  })}
                </optgroup>
                <optgroup label="Spesifik Sumatif (AH)">
                  {Array.from({ length: lmCount }).map((_, i) => (
                    <option key={`smt_ah${i + 1}`} value={`smt_ah${i + 1}`}>
                      Asesmen Harian (AH {i + 1})
                    </option>
                  ))}
                </optgroup>
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-1">Nilai Masal (0 - 100)</label>
              <input
                type="number"
                min={0}
                max={100}
                value={massScoreValue}
                onChange={(e) => setMassScoreValue(parseInt(e.target.value, 10) || 0)}
                className="w-full px-3 py-2 border border-slate-200 rounded-xl font-black text-center text-xs text-teal-800 bg-white"
              />
            </div>

            <button
              onClick={handleApplyMassInput}
              className="py-2.5 px-4 bg-teal-600 hover:bg-teal-500 text-white font-extrabold text-xs rounded-xl shadow-md transition-all cursor-pointer flex items-center justify-center gap-1.5"
            >
              <Check className="w-4 h-4" />
              Terapkan Masal
            </button>
          </div>
        </div>

        {/* Scrollable Responsive Table */}
        <div className="overflow-x-auto border border-slate-200 rounded-2xl shadow-inner">
          <table className="w-full text-center text-xs border-collapse">
            <thead>
              {/* Row 1 Header */}
              <tr className="bg-slate-900 text-white font-bold border-b border-slate-800">
                <th rowSpan={3} className="p-3 border-r border-slate-800 w-12 text-center">
                  No.
                </th>
                <th rowSpan={3} className="p-3 border-r border-slate-800 w-28 text-center">
                  NISN
                </th>
                <th rowSpan={3} className="p-3 border-r border-slate-800 min-w-[160px] text-left pl-4">
                  Nama Siswa
                </th>
                {totalFormatifCols > 0 && (
                  <th
                    colSpan={totalFormatifCols}
                    className="p-3 border-r border-slate-800 bg-teal-800 text-teal-100 uppercase tracking-wider text-[11px]"
                  >
                    Asesmen Formatif (Proses)
                  </th>
                )}
                <th
                  colSpan={lmCount}
                  className="p-3 border-r border-slate-800 bg-indigo-800 text-indigo-100 uppercase tracking-wider text-[11px]"
                >
                  Asesmen Sumatif (AH)
                </th>
                <th rowSpan={3} className="p-3 border-r border-slate-800 w-20 bg-amber-700 text-white">
                  SAS
                </th>
                <th rowSpan={3} className="p-3 border-r border-slate-800 w-24 bg-slate-950 text-teal-300">
                  Nilai Akhir
                </th>
                <th rowSpan={3} className="p-3 w-24 text-center">
                  Aksi
                </th>
              </tr>

              {/* Row 2 Header: Lingkup Materi */}
              <tr className="bg-slate-800 text-slate-200 font-bold border-b border-slate-700 text-[11px]">
                {Array.from({ length: lmCount }).map((_, i) => {
                  const lmIndex = i + 1;
                  const count = getTpCount(lmIndex);
                  if (count === 0) return null;
                  return (
                    <th
                      key={`lm_head_${lmIndex}`}
                      colSpan={count}
                      className="p-2 border-r border-slate-700 bg-teal-900/60 text-teal-200"
                    >
                      LM {lmIndex}
                    </th>
                  );
                })}
                {Array.from({ length: lmCount }).map((_, i) => (
                  <th
                    key={`ah_head_${i + 1}`}
                    rowSpan={2}
                    className="p-2 border-r border-slate-700 bg-indigo-900/60 text-indigo-200"
                  >
                    AH {i + 1}
                  </th>
                ))}
              </tr>

              {/* Row 3 Header: Tujuan Pembelajaran (TP) */}
              <tr className="bg-slate-100 text-slate-700 font-extrabold border-b border-slate-200 text-[10px]">
                {Array.from({ length: lmCount }).map((_, i) => {
                  const lmIndex = i + 1;
                  const count = getTpCount(lmIndex);
                  return Array.from({ length: count }).map((__, j) => (
                    <th key={`tp_subhead_${lmIndex}_${j + 1}`} className="p-1.5 border-r border-slate-200">
                      TP {j + 1}
                    </th>
                  ));
                })}
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-200 bg-white">
              {myStudents.map((st, idx) => {
                const calc = getStudentCalculations(st.id);
                let colTracker = 0;

                return (
                  <tr key={st.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="p-2.5 font-bold text-slate-500 border-r border-slate-200">{idx + 1}</td>
                    <td className="p-2.5 font-mono text-slate-600 font-bold border-r border-slate-200 text-[11px]">
                      {st.nisn}
                    </td>
                    <td className="p-2.5 text-left font-bold text-slate-800 border-r border-slate-200 pl-4">
                      {st.name}
                    </td>

                    {/* Formatif TP Score Cells */}
                    {Array.from({ length: lmCount }).map((_, i) => {
                      const lm = i + 1;
                      const count = getTpCount(lm);
                      return Array.from({ length: count }).map((__, j) => {
                        const tp = j + 1;
                        const cellKey = `fmt_${st.id}_lm${lm}_tp${tp}`;
                        const val = scoreMatrix[cellKey] ?? 85;
                        const isUnderKktp = val < currentSubject.kktp;
                        const colIdx = colTracker++;

                        return (
                          <td key={cellKey} className="p-1 border-r border-slate-200">
                            <input
                              type="number"
                              min={0}
                              max={100}
                              value={val}
                              data-student-idx={idx}
                              data-col-idx={colIdx}
                              onKeyDown={(e) => handleTableKeyDown(e, idx, colIdx)}
                              onChange={(e) => handleScoreChange(cellKey, parseInt(e.target.value, 10))}
                              className={`w-14 px-1 py-1 text-center font-extrabold text-xs rounded-lg transition-all focus:outline-none focus:ring-2 ${
                                isUnderKktp
                                  ? 'bg-rose-100 border-2 border-rose-400 text-rose-700 shadow-xs'
                                  : 'bg-white border border-slate-200 text-slate-800 focus:border-teal-500'
                              }`}
                            />
                          </td>
                        );
                      });
                    })}

                    {/* Sumatif AH Score Cells */}
                    {Array.from({ length: lmCount }).map((_, i) => {
                      const ah = i + 1;
                      const cellKey = `smt_${st.id}_ah${ah}`;
                      const val = scoreMatrix[cellKey] ?? 82;
                      const isUnderKktp = val < currentSubject.kktp;
                      const colIdx = totalFormatifCols + i;

                      return (
                        <td key={cellKey} className="p-1 border-r border-slate-200 bg-indigo-50/20">
                          <input
                            type="number"
                            min={0}
                            max={100}
                            value={val}
                            data-student-idx={idx}
                            data-col-idx={colIdx}
                            onKeyDown={(e) => handleTableKeyDown(e, idx, colIdx)}
                            onChange={(e) => handleScoreChange(cellKey, parseInt(e.target.value, 10))}
                            className={`w-14 px-1 py-1 text-center font-extrabold text-xs rounded-lg transition-all focus:outline-none focus:ring-2 ${
                              isUnderKktp
                                ? 'bg-rose-100 border-2 border-rose-400 text-rose-700 shadow-xs'
                                : 'bg-white border border-slate-200 text-indigo-900 focus:border-indigo-500'
                            }`}
                          />
                        </td>
                      );
                    })}

                    {/* SAS Score Cell */}
                    <td className="p-1 border-r border-slate-200 bg-amber-50/30">
                      {(() => {
                        const cellKey = `sas_${st.id}`;
                        const val = scoreMatrix[cellKey] ?? 80;
                        const isUnderKktp = val < currentSubject.kktp;
                        const colIdx = totalFormatifCols + lmCount;

                        return (
                          <input
                            type="number"
                            min={0}
                            max={100}
                            value={val}
                            data-student-idx={idx}
                            data-col-idx={colIdx}
                            onKeyDown={(e) => handleTableKeyDown(e, idx, colIdx)}
                            onChange={(e) => handleScoreChange(cellKey, parseInt(e.target.value, 10))}
                            className={`w-14 px-1 py-1 text-center font-extrabold text-xs rounded-lg transition-all focus:outline-none focus:ring-2 ${
                              isUnderKktp
                                ? 'bg-rose-100 border-2 border-rose-400 text-rose-700 shadow-xs'
                                : 'bg-white border border-slate-200 text-amber-900 focus:border-amber-500'
                            }`}
                          />
                        );
                      })()}
                    </td>

                    {/* Calculated NA (Nilai Akhir) */}
                    <td className="p-2 border-r border-slate-200 bg-slate-50 font-black text-sm">
                      <span
                        className={`inline-block px-2.5 py-1 rounded-xl text-xs font-black shadow-2xs ${
                          calc.isLunas
                            ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                            : 'bg-rose-100 text-rose-800 border border-rose-300'
                        }`}
                      >
                        {calc.finalScore}
                      </span>
                    </td>

                    {/* Action Column */}
                    <td className="p-2 text-center">
                      <div className="flex items-center justify-center gap-1">
                        <button
                          onClick={() => handleResetStudentScores(st.id)}
                          title="Hapus / Reset Nilai Siswa Ini"
                          className="p-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 rounded-lg border border-rose-200 transition-colors cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
