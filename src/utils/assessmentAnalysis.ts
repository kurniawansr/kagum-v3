import { QuestionItem, Student, StudentItemScores } from '../types';

export interface StudentMasteryResult {
  studentId: string;
  studentName: string;
  nisn: string;
  totalScore: number;
  maxPossibleScore: number;
  percentageScore: number;
  isTuntas: boolean;
  questionScores: Record<number, number>;
}

export interface ItemAnalysisResult {
  questionNumber: number;
  type: string;
  maxScore: number;
  totalScoreAll: number;
  avgScoreAll: number;
  highGroupAvg: number;
  lowGroupAvg: number;
  difficultyIndex: number; // P
  difficultyCategory: 'Soal mudah' | 'Soal sedang' | 'Soal sulit';
  discriminationIndex: number; // D
  discriminationCategory: 'baik, soal diterima' | 'cukup baik, soal diperbaiki' | 'kurang, soal perlu direvisi';
  recommendation: 'Diterima' | 'Revisi Soal' | 'Dibuang/Ganti';
}

export interface ClassicalMasterySummary {
  totalStudents: number;
  tuntasCount: number;
  belumTuntasCount: number;
  classicalMasteryPercent: number; // %
  kktp: number;
  totalMaxPossibleScore: number;
  averageScoreAll: number;
  highGroupCount: number;
  lowGroupCount: number;
}

export interface AssessmentAnalysisFullResult {
  studentMasteryList: StudentMasteryResult[];
  itemAnalysisList: ItemAnalysisResult[];
  summary: ClassicalMasterySummary;
}

/**
 * Calculates Classical Test Theory (CTT) Item Analysis and Student Mastery
 */
export function calculateAssessmentAnalysis(
  questions: QuestionItem[],
  students: Student[],
  studentScores: StudentItemScores[],
  kktp: number
): AssessmentAnalysisFullResult {
  const totalMaxPossibleScore = questions.reduce((acc, q) => acc + (q.maxScore || 0), 0);

  // Map student scores dictionary
  const scoreMap = new Map<string, Record<number, number>>();
  studentScores.forEach((ss) => {
    scoreMap.set(ss.studentId, ss.scores || {});
  });

  // Calculate student mastery results
  const studentMasteryList: StudentMasteryResult[] = students.map((st) => {
    const qScores = scoreMap.get(st.id) || {};
    let totalScore = 0;
    questions.forEach((q) => {
      const val = Number(qScores[q.number]) || 0;
      // Cap at maxScore
      totalScore += Math.min(Math.max(0, val), q.maxScore);
    });

    const percentageScore = totalMaxPossibleScore > 0 ? (totalScore / totalMaxPossibleScore) * 100 : 0;
    const isTuntas = percentageScore >= kktp;

    return {
      studentId: st.id,
      studentName: st.name,
      nisn: st.nisn,
      totalScore,
      maxPossibleScore: totalMaxPossibleScore,
      percentageScore: Number(percentageScore.toFixed(2)),
      isTuntas,
      questionScores: qScores,
    };
  });

  // Summary statistics
  const totalStudents = students.length;
  const tuntasCount = studentMasteryList.filter((s) => s.isTuntas).length;
  const belumTuntasCount = totalStudents - tuntasCount;
  const classicalMasteryPercent = totalStudents > 0 ? Number(((tuntasCount / totalStudents) * 100).toFixed(2)) : 0;
  const sumAllScores = studentMasteryList.reduce((acc, s) => acc + s.totalScore, 0);
  const averageScoreAll = totalStudents > 0 ? Number((sumAllScores / totalStudents).toFixed(2)) : 0;

  // CTT High Group (NA) and Low Group (NB) calculation (27%)
  const sortedStudents = [...studentMasteryList].sort((a, b) => b.totalScore - a.totalScore);
  const nGroup = totalStudents > 0 ? Math.max(1, Math.round(totalStudents * 0.27)) : 0;

  const highGroup = sortedStudents.slice(0, nGroup);
  const lowGroup = sortedStudents.slice(Math.max(0, totalStudents - nGroup));

  // Item analysis for each question
  const itemAnalysisList: ItemAnalysisResult[] = questions.map((q) => {
    const maxScore = q.maxScore || 1;

    // Total score all students for this question
    const totalScoreQ = studentMasteryList.reduce((acc, st) => {
      const val = Number(st.questionScores[q.number]) || 0;
      return acc + Math.min(Math.max(0, val), maxScore);
    }, 0);

    const avgScoreAll = totalStudents > 0 ? totalScoreQ / totalStudents : 0;

    // Facility Value / Difficulty Index P = AvgScore / MaxScore
    const P = maxScore > 0 ? avgScoreAll / maxScore : 0;

    let difficultyCategory: 'Soal mudah' | 'Soal sedang' | 'Soal sulit' = 'Soal sedang';
    if (P > 0.7) {
      difficultyCategory = 'Soal mudah';
    } else if (P < 0.3) {
      difficultyCategory = 'Soal sulit';
    } else {
      difficultyCategory = 'Soal sedang';
    }

    // High group & Low group averages
    const highGroupTotalQ = highGroup.reduce((acc, st) => {
      const val = Number(st.questionScores[q.number]) || 0;
      return acc + Math.min(Math.max(0, val), maxScore);
    }, 0);

    const lowGroupTotalQ = lowGroup.reduce((acc, st) => {
      const val = Number(st.questionScores[q.number]) || 0;
      return acc + Math.min(Math.max(0, val), maxScore);
    }, 0);

    const highGroupAvg = nGroup > 0 ? highGroupTotalQ / nGroup : 0;
    const lowGroupAvg = nGroup > 0 ? lowGroupTotalQ / nGroup : 0;

    // Discrimination Index D = (HighGroupAvg - LowGroupAvg) / MaxScore
    const D = maxScore > 0 ? (highGroupAvg - lowGroupAvg) / maxScore : 0;

    let discriminationCategory: 'baik, soal diterima' | 'cukup baik, soal diperbaiki' | 'kurang, soal perlu direvisi' = 'baik, soal diterima';
    if (D >= 0.4) {
      discriminationCategory = 'baik, soal diterima';
    } else if (D >= 0.2) {
      discriminationCategory = 'cukup baik, soal diperbaiki';
    } else {
      discriminationCategory = 'kurang, soal perlu direvisi';
    }

    let recommendation: 'Diterima' | 'Revisi Soal' | 'Dibuang/Ganti' = 'Diterima';
    if (discriminationCategory === 'baik, soal diterima') {
      recommendation = 'Diterima';
    } else if (discriminationCategory === 'cukup baik, soal diperbaiki') {
      recommendation = 'Revisi Soal';
    } else {
      recommendation = 'Dibuang/Ganti';
    }

    return {
      questionNumber: q.number,
      type: q.type,
      maxScore,
      totalScoreAll: totalScoreQ,
      avgScoreAll: Number(avgScoreAll.toFixed(2)),
      highGroupAvg: Number(highGroupAvg.toFixed(2)),
      lowGroupAvg: Number(lowGroupAvg.toFixed(2)),
      difficultyIndex: Number(P.toFixed(2)),
      difficultyCategory,
      discriminationIndex: Number(D.toFixed(2)),
      discriminationCategory,
      recommendation,
    };
  });

  return {
    studentMasteryList,
    itemAnalysisList,
    summary: {
      totalStudents,
      tuntasCount,
      belumTuntasCount,
      classicalMasteryPercent,
      kktp,
      totalMaxPossibleScore,
      averageScoreAll,
      highGroupCount: nGroup,
      lowGroupCount: nGroup,
    },
  };
}

/**
 * Unit Test Runner for CTT Calculation accuracy
 */
export function runAssessmentAnalysisTests(): { passed: boolean; logs: string[] } {
  const logs: string[] = [];
  let passed = true;

  const mockQuestions: QuestionItem[] = [
    { number: 1, type: 'Pilihan Jamak', maxScore: 1 },
    { number: 2, type: 'Pilihan Jamak', maxScore: 1 },
    { number: 3, type: 'Isian', maxScore: 2 },
    { number: 4, type: 'Uraian', maxScore: 4 },
  ];

  const mockStudents: Student[] = Array.from({ length: 10 }, (_, i) => ({
    id: `st-${i + 1}`,
    nisn: `100${i + 1}`,
    name: `Siswa ${i + 1}`,
    birthPlace: 'Purbalingga',
    birthDate: '2015-01-01',
    address: 'Purbalingga',
    fatherName: 'Ayah',
    motherName: 'Ibu',
    parentWa: '628123',
    kelas: 'Kelas IA',
  }));

  // High performers get high scores, low performers get lower scores
  const mockScores: StudentItemScores[] = mockStudents.map((st, idx) => {
    if (idx < 3) {
      // Top 3 (High Group): Q1=1, Q2=1, Q3=2, Q4=4 -> Total 8 (100%)
      return { studentId: st.id, scores: { 1: 1, 2: 1, 3: 2, 4: 4 } };
    } else if (idx < 7) {
      // Middle 4: Q1=1, Q2=0, Q3=1, Q4=2 -> Total 4 (50%)
      return { studentId: st.id, scores: { 1: 1, 2: 0, 3: 1, 4: 2 } };
    } else {
      // Bottom 3 (Low Group): Q1=0, Q2=0, Q3=0, Q4=1 -> Total 1 (12.5%)
      return { studentId: st.id, scores: { 1: 0, 2: 0, 3: 0, 4: 1 } };
    }
  });

  const res = calculateAssessmentAnalysis(mockQuestions, mockStudents, mockScores, 70);

  // Assertions
  // 1. Total students = 10
  if (res.summary.totalStudents !== 10) {
    logs.push(`FAILED: Expected 10 students, got ${res.summary.totalStudents}`);
    passed = false;
  } else {
    logs.push(`PASSED: Student count is 10`);
  }

  // 2. High group & Low group count = round(10 * 0.27) = 3
  if (res.summary.highGroupCount !== 3) {
    logs.push(`FAILED: Expected N_A=3, got ${res.summary.highGroupCount}`);
    passed = false;
  } else {
    logs.push(`PASSED: High group (NA) count is 3 (27%)`);
  }

  // 3. Question 1 difficulty index P = (3*1 + 4*1 + 3*0)/10 = 0.70 (Sedang)
  const q1 = res.itemAnalysisList.find((i) => i.questionNumber === 1);
  if (!q1 || Math.abs(q1.difficultyIndex - 0.7) > 0.05) {
    logs.push(`FAILED: Q1 difficulty index expected ~0.70, got ${q1?.difficultyIndex}`);
    passed = false;
  } else {
    logs.push(`PASSED: Q1 Difficulty Index is ${q1.difficultyIndex} (${q1.difficultyCategory})`);
  }

  // 4. Question 1 discrimination D = (HighGroupAvg - LowGroupAvg)/1 = (1.0 - 0.0)/1 = 1.0 (Baik)
  if (!q1 || q1.discriminationIndex !== 1) {
    logs.push(`FAILED: Q1 discrimination index expected 1.0, got ${q1?.discriminationIndex}`);
    passed = false;
  } else {
    logs.push(`PASSED: Q1 Discrimination Index is ${q1?.discriminationIndex} (${q1?.discriminationCategory})`);
  }

  return { passed, logs };
}
