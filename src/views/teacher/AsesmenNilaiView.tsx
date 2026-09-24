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
          initialMap[key] = existing ? existing.score : 0;
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
        initialMap[key] = existing ? existing.score : 0;
      }

      // 3. Populate SAS Score
      const sasKey = `sas_${st.id}`;
      const existingSas = (gradeRecords || []).find(
        (g) =>
          g.studentId === st.id &&
          g.subjectCode === selectedSubjectCode &&
          g.type === 'sas'
      );
      initialMap[sasKey] = existingSas ? existingSas.score : 0;
    });

    setScoreMatrix(initialMap);
  }, [selectedSubjectCode, lmCount, tpCountsPerLm, students, currentClass, gradeRecords]);

  // Individual cell update handler
  const handleScoreChange = (key: string, val: number) => {
    const num = Math.min(100, Math.max(0, isNaN(val) ? 0 : val));
    setScoreMatrix((prev) => ({ ...prev, [key]: num }));
  };

  // Per-column mass input values
  const [colMassValues, setColMassValues] = useState<Record<string, number>>({});

  const handleApplyMassColumn = (targetKey: string) => {
    const defaultVal = targetKey === 'sas' ? 80 : 85;
    const rawVal = colMassValues[targetKey] ?? defaultVal;
    const val = Math.min(100, Math.max(0, isNaN(rawVal) ? 0 : rawVal));

    setScoreMatrix((prev) => {
      const next = { ...prev };
      myStudents.forEach((st) => {
        if (targetKey.startsWith('fmt_')) {
          // e.g. fmt_lm1_tp2 -> fmt_${st.id}_lm1_tp2
          const cellKey = targetKey.replace('fmt_', `fmt_${st.id}_`);
          next[cellKey] = val;
        } else if (targetKey.startsWith('smt_')) {
          // e.g. smt_ah1 -> smt_${st.id}_ah1
          const cellKey = targetKey.replace('smt_', `smt_${st.id}_`);
          next[cellKey] = val;
        } else if (targetKey === 'sas') {
          next[`sas_${st.id}`] = val;
        }
      });
      return next;
    });

    const label = targetKey.startsWith('fmt_')
      ? targetKey.replace('fmt_lm', 'LM ').replace('_tp', ' TP ')
      : targetKey.startsWith('smt_')
      ? targetKey.replace('smt_ah', 'AH ')
      : 'SAS';

    setMessage(`Nilai masal (${val}) diterapkan untuk seluruh siswa pada kolom ${label.toUpperCase()}`);
    setTimeout(() => setMessage(''), 3000);
  };

  // Mass Input Handler for ALL columns
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
        const score = scoreMatrix[`fmt_${studentId}_lm${lm}_tp${tp}`] ?? 0;
        totalTpScore += score;
        tpCount++;
      }
    }
    const avgFormatif = tpCount > 0 ? totalTpScore / tpCount : 0;

    // 2. Rata-rata Sumatif (AH)
    let totalAhScore = 0;
    for (let ah = 1; ah <= lmCount; ah++) {
      const score = scoreMatrix[`smt_${studentId}_ah${ah}`] ?? 0;
      totalAhScore += score;
    }
    const avgSumatifAH = lmCount > 0 ? totalAhScore / lmCount : 0;

    // 3. SAS Score
    const sasScore = scoreMatrix[`sas_${studentId}`] ?? 0;

    // 4. Nilai Akhir (NA)
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
          const score = scoreMatrix[`fmt_${st.id}_lm${lm}_tp${tp}`] ?? 0;
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
        const score = scoreMatrix[`smt_${st.id}_ah${ah}`] ?? 0;
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
      const sasScore = scoreMatrix[`sas_${st.id}`] ?? 0;
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
          row.push(scoreMatrix[`fmt_${st.id}_lm${lm}_tp${tp}`] ?? 0);
        }
      }

      // Sumatif AH scores
      for (let ah = 1; ah <= lmCount; ah++) {
        row.push(scoreMatrix[`smt_${st.id}_ah${ah}`] ?? 0);
      }

      // SAS Score
      row.push(scoreMatrix[`sas_${st.id}`] ?? 0);

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
      columnStyles: {
        0: { halign: 'center' },
        1: { halign: 'center' },
        2: { halign: 'left' },
      },
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

              {/* Row 4 Header: Form Input Nilai Masal langsung di bawah TP, AH, dan SAS */}
              <tr className="bg-amber-500/10 border-b-2 border-amber-300 text-[10px]">
                <th colSpan={3} className="p-2 bg-amber-50 border-r border-slate-300 text-amber-950 font-black text-right pr-3 shadow-xs">
                  <div className="flex items-center justify-end gap-1">
                    <Sparkles className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                    <span>Input Masal:</span>
                  </div>
                </th>

                {/* Mass input for each TP */}
                {Array.from({ length: lmCount }).map((_, i) => {
                  const lmIndex = i + 1;
                  const count = getTpCount(lmIndex);
                  return Array.from({ length: count }).map((__, j) => {
                    const tpIndex = j + 1;
                    const key = `fmt_lm${lmIndex}_tp${tpIndex}`;
                    const val = colMassValues[key] ?? 85;

                    return (
                      <th key={`mass_${key}`} className="p-1 border-r border-slate-300 bg-teal-50/90 text-center">
                        <div className="flex items-center justify-center gap-0.5 mx-auto">
                          <input
                            type="number"
                            min={0}
                            max={100}
                            value={val}
                            onChange={(e) => setColMassValues(prev => ({ ...prev, [key]: parseInt(e.target.value, 10) || 0 }))}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') handleApplyMassColumn(key);
                            }}
                            title={`Nilai masal LM ${lmIndex} TP ${tpIndex}`}
                            className="w-10 px-1 py-0.5 text-center font-black text-[11px] rounded bg-white border border-teal-300 text-teal-900 focus:outline-none focus:ring-1 focus:ring-teal-500"
                          />
                          <button
                            onClick={() => handleApplyMassColumn(key)}
                            title={`Terapkan ${val} ke seluruh siswa di TP ${tpIndex}`}
                            className="p-1 bg-teal-600 hover:bg-teal-700 text-white rounded cursor-pointer transition-colors shadow-2xs"
                          >
                            <Check className="w-3 h-3" />
                          </button>
                        </div>
                      </th>
                    );
                  });
                })}

                {/* Mass input for each AH */}
                {Array.from({ length: lmCount }).map((_, i) => {
                  const ahIndex = i + 1;
                  const key = `smt_ah${ahIndex}`;
                  const val = colMassValues[key] ?? 85;

                  return (
                    <th key={`mass_${key}`} className="p-1 border-r border-slate-300 bg-indigo-50/90 text-center">
                      <div className="flex items-center justify-center gap-0.5 mx-auto">
                        <input
                          type="number"
                          min={0}
                          max={100}
                          value={val}
                          onChange={(e) => setColMassValues(prev => ({ ...prev, [key]: parseInt(e.target.value, 10) || 0 }))}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') handleApplyMassColumn(key);
                          }}
                          title={`Nilai masal AH ${ahIndex}`}
                          className="w-10 px-1 py-0.5 text-center font-black text-[11px] rounded bg-white border border-indigo-300 text-indigo-900 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                        />
                        <button
                          onClick={() => handleApplyMassColumn(key)}
                          title={`Terapkan ${val} ke seluruh siswa di AH ${ahIndex}`}
                          className="p-1 bg-indigo-600 hover:bg-indigo-700 text-white rounded cursor-pointer transition-colors shadow-2xs"
                        >
                          <Check className="w-3 h-3" />
                        </button>
                      </div>
                    </th>
                  );
                })}

                {/* Mass input for SAS */}
                {(() => {
                  const key = 'sas';
                  const val = colMassValues[key] ?? 80;

                  return (
                    <th className="p-1 border-r border-slate-300 bg-amber-50/90 text-center">
                      <div className="flex items-center justify-center gap-0.5 mx-auto">
                        <input
                          type="number"
                          min={0}
                          max={100}
                          value={val}
                          onChange={(e) => setColMassValues(prev => ({ ...prev, [key]: parseInt(e.target.value, 10) || 0 }))}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') handleApplyMassColumn(key);
                          }}
                          title="Nilai masal SAS"
                          className="w-10 px-1 py-0.5 text-center font-black text-[11px] rounded bg-white border border-amber-300 text-amber-900 focus:outline-none focus:ring-1 focus:ring-amber-500"
                        />
                        <button
                          onClick={() => handleApplyMassColumn(key)}
                          title={`Terapkan ${val} ke seluruh siswa di SAS`}
                          className="p-1 bg-amber-600 hover:bg-amber-700 text-white rounded cursor-pointer transition-colors shadow-2xs"
                        >
                          <Check className="w-3 h-3" />
                        </button>
                      </div>
                    </th>
                  );
                })()}

                {/* NA & Action column empty header cells */}
                <th colSpan={2} className="p-1 bg-slate-100 border-slate-300"></th>
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
