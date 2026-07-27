import React, { useState, useMemo } from 'react';
import { useApp } from '../../context/AppContext';
import {
  AssessmentAnalysisRecord,
  QuestionItem,
  QuestionType,
  StudentItemScores,
} from '../../types';
import {
  calculateAssessmentAnalysis,
  runAssessmentAnalysisTests,
} from '../../utils/assessmentAnalysis';
import { exportToExcel, exportToPdf } from '../../utils/exportUtils';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';
import {
  BarChart3,
  CheckCircle2,
  XCircle,
  Plus,
  Trash2,
  Pencil,
  FileSpreadsheet,
  FileText,
  Upload,
  Download,
  Settings,
  Award,
  AlertTriangle,
  X,
  Sparkles,
  Info,
  Check,
  Layers,
  KeyRound,
  Zap,
  LayoutGrid,
  Calendar,
  FileDown,
} from 'lucide-react';

const QUESTION_TYPES: QuestionType[] = [
  'Pilihan Jamak',
  'Kompleks',
  'Menjodohkan',
  'Isian',
  'Uraian',
];

// Helper to check if student answer matches answer key
const isAnswerCorrect = (studentAns: string, key: string, type: QuestionType): boolean => {
  if (!studentAns || !key) return false;
  const cleanAns = studentAns.trim().toUpperCase();
  const cleanKey = key.trim().toUpperCase();

  if (type === 'Pilihan Jamak') {
    return cleanAns === cleanKey;
  }
  if (type === 'Kompleks') {
    const ansClean = cleanAns.replace(/[^A-Z0-9]/g, '').split('').sort().join('');
    const keyClean = cleanKey.replace(/[^A-Z0-9]/g, '').split('').sort().join('');
    return ansClean === keyClean;
  }
  if (type === 'Menjodohkan') {
    const ansClean = cleanAns.replace(/[^A-Z0-9]/g, '');
    const keyClean = cleanKey.replace(/[^A-Z0-9]/g, '');
    return ansClean === keyClean;
  }
  return cleanAns === cleanKey;
};

// Compact Key String Formatter Helpers
const getPgCompact = (qs: QuestionItem[]) => {
  const pgQs = qs.filter((q) => q.type === 'Pilihan Jamak');
  if (pgQs.length === 0) return '';
  let str = '';
  pgQs.forEach((q, idx) => {
    if (idx > 0 && idx % 5 === 0) str += '-';
    const k = (q.answerKey || '').trim().toUpperCase().charAt(0);
    str += k || '';
  });
  return str;
};

const getKmpCompact = (qs: QuestionItem[]) => {
  const kmpQs = qs.filter((q) => q.type === 'Kompleks');
  if (kmpQs.length === 0) return '';
  return kmpQs
    .map((q) => {
      const raw = (q.answerKey || '').trim().toUpperCase();
      if (!raw) return '';
      return raw.replace(/[^A-Z0-9]/g, '');
    })
    .join(', ');
};

const getMjdCompact = (qs: QuestionItem[]) => {
  const mjdQs = qs.filter((q) => q.type === 'Menjodohkan');
  if (mjdQs.length === 0) return '';
  return mjdQs
    .map((q) => {
      const raw = (q.answerKey || '').trim().toUpperCase();
      return raw.replace(/[^A-Z0-9]/g, '');
    })
    .join('');
};

export const AnalisisAsesmenView: React.FC = () => {
  const {
    assessmentAnalyses,
    setAssessmentAnalyses,
    students,
    subjects,
    currentUser,
    schoolProfile,
  } = useApp();

  const currentClass = currentUser?.kelas || 'Kelas IA';
  const myStudents = useMemo(() => {
    return students.filter((s) => s.kelas === currentClass);
  }, [students, currentClass]);

  // Selected assessment analysis ID
  const [selectedId, setSelectedId] = useState<string>(() => {
    return assessmentAnalyses.length > 0 ? assessmentAnalyses[0].id : '';
  });

  // Current active assessment record
  const currentRecord = useMemo(() => {
    return (
      assessmentAnalyses.find((a) => a.id === selectedId) ||
      assessmentAnalyses[0] ||
      null
    );
  }, [assessmentAnalyses, selectedId]);

  // Modal States
  const [showConfigModal, setShowConfigModal] = useState(false);
  const [isCreatingNew, setIsCreatingNew] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [showTestModal, setShowTestModal] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [testResult, setTestResult] = useState<{ passed: boolean; logs: string[] } | null>(null);

  // Filter/Search student state
  const [searchStudent, setSearchStudent] = useState('');
  const [activeTab, setActiveTab] = useState<'matrix' | 'ketuntasan' | 'itemAnalysis'>('matrix');
  const [printDate, setPrintDate] = useState<string>(() => new Date().toISOString().split('T')[0]);

  // Config Form State
  const [configTitle, setConfigTitle] = useState('');
  const [configSubject, setConfigSubject] = useState('');
  const [configKktp, setConfigKktp] = useState(75);
  const [configQuestions, setConfigQuestions] = useState<QuestionItem[]>([]);

  // Matrix View Mode: 'compact' (grouped per type) or 'detailed' (individual question columns)
  const [matrixViewMode, setMatrixViewMode] = useState<'compact' | 'detailed'>('compact');

  // Compact Answer Key Inputs State
  const [pgKeyInput, setPgKeyInput] = useState('');
  const [kmpKeyInput, setKmpKeyInput] = useState('');
  const [mjdKeyInput, setMjdKeyInput] = useState('');

  // State for Batch Question Count Form
  const [batchCounts, setBatchCounts] = useState<Record<QuestionType, number>>({
    'Pilihan Jamak': 5,
    'Kompleks': 2,
    'Menjodohkan': 1,
    'Isian': 1,
    'Uraian': 1,
  });
  const [batchScores, setBatchScores] = useState<Record<QuestionType, number>>({
    'Pilihan Jamak': 1,
    'Kompleks': 2,
    'Menjodohkan': 2,
    'Isian': 3,
    'Uraian': 5,
  });

  // Sync compact input strings from question items list
  const syncCompactInputs = (qs: QuestionItem[]) => {
    setPgKeyInput(getPgCompact(qs));
    setKmpKeyInput(getKmpCompact(qs));
    setMjdKeyInput(getMjdCompact(qs));
  };

  // Open config modal with current values
  const handleOpenConfig = () => {
    setIsCreatingNew(false);
    let initialQuestions: QuestionItem[] = [];
    const defaultScores: Record<QuestionType, number> = {
      'Pilihan Jamak': 1,
      'Kompleks': 2,
      'Menjodohkan': 2,
      'Isian': 3,
      'Uraian': 5,
    };

    if (currentRecord) {
      setConfigTitle(currentRecord.title);
      setConfigSubject(currentRecord.subjectCode);
      setConfigKktp(currentRecord.kktp);
      initialQuestions = currentRecord.questions.map((q) => ({ ...q }));

      // Count existing types for batch count initial state
      const counts: Record<QuestionType, number> = {
        'Pilihan Jamak': 0,
        'Kompleks': 0,
        'Menjodohkan': 0,
        'Isian': 0,
        'Uraian': 0,
      };
      currentRecord.questions.forEach((q) => {
        if (counts[q.type] !== undefined) {
          counts[q.type] += 1;
        }
        if (q.maxScore) {
          defaultScores[q.type] = q.maxScore;
        }
      });
      setBatchCounts(counts);
    } else {
      setConfigTitle('Sumatif Akhir Semester I - IPAS');
      setConfigSubject(subjects[0]?.code || 'IPAS');
      setConfigKktp(75);
      initialQuestions = [
        { number: 1, type: 'Pilihan Jamak', maxScore: 1, answerKey: 'A' },
        { number: 2, type: 'Pilihan Jamak', maxScore: 1, answerKey: 'B' },
        { number: 3, type: 'Pilihan Jamak', maxScore: 1, answerKey: 'C' },
        { number: 4, type: 'Kompleks', maxScore: 2, answerKey: 'AB' },
        { number: 5, type: 'Menjodohkan', maxScore: 2, answerKey: 'B' },
        { number: 6, type: 'Isian', maxScore: 3 },
        { number: 7, type: 'Uraian', maxScore: 5 },
      ];
    }
    setBatchScores(defaultScores);
    setConfigQuestions(initialQuestions);
    syncCompactInputs(initialQuestions);
    setShowConfigModal(true);
  };

  // Handle Pilihan Jamak compact input change (e.g., DBBAA-ACABD-CAACA)
  const handlePgCompactChange = (val: string) => {
    const rawLetters = val.replace(/[^A-Za-z]/g, '').toUpperCase();

    // Auto-format into 5-letter blocks separated by '-'
    let formatted = '';
    for (let i = 0; i < rawLetters.length; i++) {
      if (i > 0 && i % 5 === 0) formatted += '-';
      formatted += rawLetters[i];
    }
    setPgKeyInput(formatted);

    // Update configQuestions
    let lIdx = 0;
    const updated = configQuestions.map((q) => {
      if (q.type === 'Pilihan Jamak') {
        const letter = rawLetters[lIdx] || '';
        lIdx++;
        return { ...q, answerKey: letter };
      }
      return q;
    });
    setConfigQuestions(updated);
  };

  // Handle Kompleks compact input change (e.g., CB, AD, BC, AC, BC)
  const handleKmpCompactChange = (val: string) => {
    setKmpKeyInput(val);

    const items = val.split(',').map((s) => s.trim());
    let iIdx = 0;

    const updated = configQuestions.map((q) => {
      if (q.type === 'Kompleks') {
        const itemStr = items[iIdx] || '';
        iIdx++;
        const cleanKey = itemStr.toUpperCase().replace(/[^A-Z0-9]/g, '');
        return { ...q, answerKey: cleanKey };
      }
      return q;
    });
    setConfigQuestions(updated);
  };

  // Handle Menjodohkan compact input change (e.g., BDAFC)
  const handleMjdCompactChange = (val: string) => {
    const cleanLetters = val.replace(/[^A-Za-z0-9]/g, '').toUpperCase();
    setMjdKeyInput(cleanLetters);

    let cIdx = 0;
    const updated = configQuestions.map((q) => {
      if (q.type === 'Menjodohkan') {
        const char = cleanLetters[cIdx] || '';
        cIdx++;
        return { ...q, answerKey: char };
      }
      return q;
    });
    setConfigQuestions(updated);
  };

  // Generate / Regenerate questions from Batch Form (Counts & Scores)
  const handleApplyBatchCounts = () => {
    const newQuestions: QuestionItem[] = [];
    let qNum = 1;

    // Use current compact input letters/keys if available
    const pgLetters = pgKeyInput.replace(/[^A-Za-z]/g, '').toUpperCase();
    let pgIdx = 0;

    const kmpItems = kmpKeyInput.split(',').map((s) => s.trim());
    let kmpIdx = 0;

    const mjdLetters = mjdKeyInput.replace(/[^A-Za-z0-9]/g, '').toUpperCase();
    let mjdIdx = 0;

    QUESTION_TYPES.forEach((type) => {
      const count = Number(batchCounts[type]) || 0;
      const score = Number(batchScores[type]) ?? 1;

      for (let i = 0; i < count; i++) {
        let answerKey = '';
        if (type === 'Pilihan Jamak') {
          answerKey = pgLetters[pgIdx] || ['A', 'B', 'C', 'D'][i % 4];
          pgIdx++;
        } else if (type === 'Kompleks') {
          const itemStr = kmpItems[kmpIdx];
          kmpIdx++;
          if (itemStr) {
            answerKey = itemStr.toUpperCase().replace(/[^A-Z0-9]/g, '');
          } else {
            answerKey = 'AB';
          }
        } else if (type === 'Menjodohkan') {
          answerKey = mjdLetters[mjdIdx] || 'A';
          mjdIdx++;
        }

        newQuestions.push({
          number: qNum++,
          type: type,
          maxScore: score,
          answerKey,
        });
      }
    });

    if (newQuestions.length === 0) {
      alert('Total jumlah soal minimal harus ada 1 butir soal.');
      return;
    }

    setConfigQuestions(newQuestions);
    syncCompactInputs(newQuestions);
  };

  // Create new assessment analysis
  const handleCreateNewAssessment = () => {
    setIsCreatingNew(true);
    const defaultSubjCode = subjects[0]?.code || 'IPAS';
    const subjObj = subjects.find((s) => s.code === defaultSubjCode);
    const defaultTitle = `Sumatif ${subjObj ? subjObj.name : 'IPAS'} - Kelas ${currentClass}`;

    setConfigTitle(defaultTitle);
    setConfigSubject(defaultSubjCode);
    setConfigKktp(75);

    const initialQuestions: QuestionItem[] = [
      { number: 1, type: 'Pilihan Jamak', maxScore: 1, answerKey: 'A' },
      { number: 2, type: 'Pilihan Jamak', maxScore: 1, answerKey: 'B' },
      { number: 3, type: 'Pilihan Jamak', maxScore: 1, answerKey: 'C' },
      { number: 4, type: 'Pilihan Jamak', maxScore: 1, answerKey: 'D' },
      { number: 5, type: 'Pilihan Jamak', maxScore: 1, answerKey: 'A' },
      { number: 6, type: 'Kompleks', maxScore: 2, answerKey: 'AB' },
      { number: 7, type: 'Kompleks', maxScore: 2, answerKey: 'CD' },
      { number: 8, type: 'Menjodohkan', maxScore: 2, answerKey: 'B' },
      { number: 9, type: 'Isian', maxScore: 3 },
      { number: 10, type: 'Uraian', maxScore: 5 },
    ];

    const counts: Record<QuestionType, number> = {
      'Pilihan Jamak': 5,
      'Kompleks': 2,
      'Menjodohkan': 1,
      'Isian': 1,
      'Uraian': 1,
    };
    const defaultScores: Record<QuestionType, number> = {
      'Pilihan Jamak': 1,
      'Kompleks': 2,
      'Menjodohkan': 2,
      'Isian': 3,
      'Uraian': 5,
    };

    setBatchCounts(counts);
    setBatchScores(defaultScores);
    setConfigQuestions(initialQuestions);
    syncCompactInputs(initialQuestions);
    setShowConfigModal(true);
  };

  // Delete active assessment trigger
  const handleDeleteAssessment = (id: string) => {
    setDeletingId(id);
  };

  // Confirm delete assessment
  const handleConfirmDelete = () => {
    if (!deletingId) return;
    const updated = assessmentAnalyses.filter((a) => a.id !== deletingId);
    
    if (updated.length > 0) {
      setAssessmentAnalyses(updated);
      if (selectedId === deletingId) {
        setSelectedId(updated[0].id);
      }
    } else {
      const newId = `ana-${Date.now()}`;
      const newRecord: AssessmentAnalysisRecord = {
        id: newId,
        title: `Analisis Asesmen Baru (${new Date().toLocaleDateString('id-ID')})`,
        subjectCode: subjects[0]?.code || 'IPAS',
        kelas: currentClass,
        kktp: 75,
        questions: [
          { number: 1, type: 'Pilihan Jamak', maxScore: 1, answerKey: 'A' },
        ],
        studentScores: myStudents.map((st) => ({
          studentId: st.id,
          scores: {},
          studentAnswers: {},
        })),
        updatedAt: new Date().toISOString().split('T')[0],
      };
      setAssessmentAnalyses([newRecord]);
      setSelectedId(newId);
    }
    setDeletingId(null);
  };

  // Add question row in config modal
  const handleAddQuestionRow = () => {
    const nextNum = configQuestions.length > 0 ? Math.max(...configQuestions.map((q) => q.number)) + 1 : 1;
    const updated = [
      ...configQuestions,
      { number: nextNum, type: 'Pilihan Jamak', maxScore: 1, answerKey: 'A' },
    ];
    setConfigQuestions(updated);
    syncCompactInputs(updated);
  };

  // Update question item
  const handleUpdateQuestion = (index: number, field: keyof QuestionItem, value: any) => {
    const updated = [...configQuestions];
    updated[index] = {
      ...updated[index],
      [field]: value,
    };
    setConfigQuestions(updated);
    syncCompactInputs(updated);
  };

  // Delete question item
  const handleDeleteQuestion = (index: number) => {
    if (configQuestions.length <= 1) {
      alert('Minimal harus ada 1 butir soal.');
      return;
    }
    const updated = configQuestions.filter((_, i) => i !== index);
    // Re-index question numbers 1..N
    const reindexed = updated.map((q, idx) => ({ ...q, number: idx + 1 }));
    setConfigQuestions(reindexed);
    syncCompactInputs(reindexed);
  };

  // Save config changes or create new assessment
  const handleSaveConfig = (e: React.FormEvent) => {
    e.preventDefault();

    if (isCreatingNew) {
      const newId = `ana-${Date.now()}`;
      const newRecord: AssessmentAnalysisRecord = {
        id: newId,
        title: configTitle.trim() || 'Analisis Asesmen Baru',
        subjectCode: configSubject || subjects[0]?.code || 'IPAS',
        kelas: currentClass,
        kktp: Number(configKktp) || 75,
        questions: configQuestions,
        studentScores: myStudents.map((st) => ({
          studentId: st.id,
          scores: {},
          studentAnswers: {},
        })),
        updatedAt: new Date().toISOString().split('T')[0],
      };

      setAssessmentAnalyses([newRecord, ...assessmentAnalyses]);
      setSelectedId(newId);
      setIsCreatingNew(false);
      setShowConfigModal(false);
      return;
    }

    if (!currentRecord) return;

    // Ensure student scores list is re-evaluated if answer keys changed
    const updatedStudentScores = (currentRecord.studentScores || []).map((st) => {
      const answers = st.studentAnswers || {};
      const scores = { ...(st.scores || {}) };

      configQuestions.forEach((q) => {
        if (q.answerKey && ['Pilihan Jamak', 'Kompleks', 'Menjodohkan'].includes(q.type)) {
          const ans = answers[q.number];
          if (ans !== undefined) {
            const correct = isAnswerCorrect(ans, q.answerKey, q.type);
            scores[q.number] = correct ? q.maxScore : 0;
          }
        }
      });

      return {
        ...st,
        scores,
      };
    });

    const updatedRecord: AssessmentAnalysisRecord = {
      ...currentRecord,
      title: configTitle,
      subjectCode: configSubject,
      kktp: Number(configKktp) || 75,
      questions: configQuestions,
      studentScores: updatedStudentScores,
      updatedAt: new Date().toISOString().split('T')[0],
    };

    setAssessmentAnalyses(
      assessmentAnalyses.map((a) => (a.id === currentRecord.id ? updatedRecord : a))
    );
    setShowConfigModal(false);
  };

  // Handler for editing Student Answer (Pilihan Jamak, Kompleks, Menjodohkan)
  const handleStudentAnswerChange = (studentId: string, qNum: number, answerStr: string) => {
    if (!currentRecord) return;

    const qItem = currentRecord.questions.find((q) => q.number === qNum);
    if (!qItem) return;

    let newScore = 0;
    if (qItem.answerKey && ['Pilihan Jamak', 'Kompleks', 'Menjodohkan'].includes(qItem.type)) {
      const correct = isAnswerCorrect(answerStr, qItem.answerKey, qItem.type);
      newScore = correct ? qItem.maxScore : 0;
    }

    const existingStudentScores = currentRecord.studentScores || [];
    const studentEntryIndex = existingStudentScores.findIndex((s) => s.studentId === studentId);

    let updatedList: StudentItemScores[] = [];
    if (studentEntryIndex >= 0) {
      updatedList = existingStudentScores.map((s, idx) => {
        if (idx === studentEntryIndex) {
          const curScores = { ...(s.scores || {}) };
          const curAnswers = { ...(s.studentAnswers || {}) };
          curAnswers[qNum] = answerStr;
          if (qItem.answerKey && ['Pilihan Jamak', 'Kompleks', 'Menjodohkan'].includes(qItem.type)) {
            curScores[qNum] = newScore;
          }
          return {
            ...s,
            scores: curScores,
            studentAnswers: curAnswers,
          };
        }
        return s;
      });
    } else {
      const initScores: Record<number, number> = {};
      if (qItem.answerKey && ['Pilihan Jamak', 'Kompleks', 'Menjodohkan'].includes(qItem.type)) {
        initScores[qNum] = newScore;
      }
      updatedList = [
        ...existingStudentScores,
        {
          studentId,
          scores: initScores,
          studentAnswers: { [qNum]: answerStr },
        },
      ];
    }

    const updatedRecord = {
      ...currentRecord,
      studentScores: updatedList,
      updatedAt: new Date().toISOString().split('T')[0],
    };

    setAssessmentAnalyses(
      assessmentAnalyses.map((a) => (a.id === currentRecord.id ? updatedRecord : a))
    );
  };

  // Helper functions to get student compact answer strings
  const getStudentPgCompact = (questions: QuestionItem[], qAnswers: Record<number, string>) => {
    const pgQs = questions.filter((q) => q.type === 'Pilihan Jamak');
    if (pgQs.length === 0) return '';
    let str = '';
    pgQs.forEach((q, idx) => {
      if (idx > 0 && idx % 5 === 0) str += '-';
      const ans = (qAnswers[q.number] || '').trim().toUpperCase().charAt(0);
      str += ans;
    });
    return str;
  };

  const getStudentKmpCompact = (questions: QuestionItem[], qAnswers: Record<number, string>) => {
    const kmpQs = questions.filter((q) => q.type === 'Kompleks');
    if (kmpQs.length === 0) return '';
    return kmpQs
      .map((q) => {
        const raw = (qAnswers[q.number] || '').trim().toUpperCase();
        return raw.replace(/[^A-Z0-9]/g, '');
      })
      .join(', ');
  };

  const getStudentMjdCompact = (questions: QuestionItem[], qAnswers: Record<number, string>) => {
    const mjdQs = questions.filter((q) => q.type === 'Menjodohkan');
    if (mjdQs.length === 0) return '';
    return mjdQs
      .map((q) => {
        const raw = (qAnswers[q.number] || '').trim().toUpperCase();
        return raw.replace(/[^A-Z0-9]/g, '');
      })
      .join('');
  };

  // Handler for editing Student Compact Answers (Pilihan Jamak, Kompleks, Menjodohkan)
  const handleStudentCompactAnswerChange = (
    studentId: string,
    type: 'Pilihan Jamak' | 'Kompleks' | 'Menjodohkan',
    compactValue: string
  ) => {
    if (!currentRecord) return;

    const targetQuestions = currentRecord.questions.filter((q) => q.type === type);
    if (targetQuestions.length === 0) return;

    const existingStudentScores = currentRecord.studentScores || [];
    const studentEntryIndex = existingStudentScores.findIndex((s) => s.studentId === studentId);
    const studentEntry = studentEntryIndex >= 0 ? existingStudentScores[studentEntryIndex] : null;

    const curScores = { ...(studentEntry?.scores || {}) };
    const curAnswers = { ...(studentEntry?.studentAnswers || {}) };

    if (type === 'Pilihan Jamak') {
      const rawLetters = compactValue.replace(/[^A-Za-z]/g, '').toUpperCase();
      targetQuestions.forEach((q, idx) => {
        const letter = rawLetters[idx] || '';
        curAnswers[q.number] = letter;
        if (q.answerKey) {
          const isCorrect = isAnswerCorrect(letter, q.answerKey, 'Pilihan Jamak');
          curScores[q.number] = isCorrect ? q.maxScore : 0;
        }
      });
    } else if (type === 'Kompleks') {
      const items = compactValue.split(',').map((s) => s.trim());
      targetQuestions.forEach((q, idx) => {
        const itemStr = items[idx] || '';
        const cleanAns = itemStr.toUpperCase().replace(/[^A-Z0-9]/g, '');
        curAnswers[q.number] = cleanAns;
        if (q.answerKey) {
          const isCorrect = isAnswerCorrect(cleanAns, q.answerKey, 'Kompleks');
          curScores[q.number] = isCorrect ? q.maxScore : 0;
        }
      });
    } else if (type === 'Menjodohkan') {
      const cleanLetters = compactValue.replace(/[^A-Za-z0-9]/g, '').toUpperCase();
      targetQuestions.forEach((q, idx) => {
        const char = cleanLetters[idx] || '';
        curAnswers[q.number] = char;
        if (q.answerKey) {
          const isCorrect = isAnswerCorrect(char, q.answerKey, 'Menjodohkan');
          curScores[q.number] = isCorrect ? q.maxScore : 0;
        }
      });
    }

    let updatedList: StudentItemScores[] = [];
    if (studentEntryIndex >= 0) {
      updatedList = existingStudentScores.map((s, idx) => {
        if (idx === studentEntryIndex) {
          return {
            ...s,
            scores: curScores,
            studentAnswers: curAnswers,
          };
        }
        return s;
      });
    } else {
      updatedList = [
        ...existingStudentScores,
        {
          studentId,
          scores: curScores,
          studentAnswers: curAnswers,
        },
      ];
    }

    const updatedRecord = {
      ...currentRecord,
      studentScores: updatedList,
      updatedAt: new Date().toISOString().split('T')[0],
    };

    setAssessmentAnalyses(
      assessmentAnalyses.map((a) => (a.id === currentRecord.id ? updatedRecord : a))
    );
  };

  // Direct score editing handler for manual scoring (e.g. Isian & Uraian or manual override)
  const handleScoreChange = (studentId: string, qNum: number, valueStr: string) => {
    if (!currentRecord) return;

    const qItem = currentRecord.questions.find((q) => q.number === qNum);
    const maxS = qItem ? qItem.maxScore : 100;
    let val = Number(valueStr);
    if (isNaN(val)) val = 0;
    if (val < 0) val = 0;
    if (val > maxS) val = maxS;

    const existingStudentScores = currentRecord.studentScores || [];
    const studentEntryIndex = existingStudentScores.findIndex((s) => s.studentId === studentId);

    let updatedScoresList: StudentItemScores[] = [];
    if (studentEntryIndex >= 0) {
      updatedScoresList = existingStudentScores.map((s, idx) => {
        if (idx === studentEntryIndex) {
          return {
            ...s,
            scores: {
              ...(s.scores || {}),
              [qNum]: val,
            },
          };
        }
        return s;
      });
    } else {
      updatedScoresList = [
        ...existingStudentScores,
        {
          studentId,
          scores: { [qNum]: val },
        },
      ];
    }

    const updatedRecord = {
      ...currentRecord,
      studentScores: updatedScoresList,
      updatedAt: new Date().toISOString().split('T')[0],
    };

    setAssessmentAnalyses(
      assessmentAnalyses.map((a) => (a.id === currentRecord.id ? updatedRecord : a))
    );
  };

  // CTT Analysis Calculation
  const analysisResult = useMemo(() => {
    if (!currentRecord) return null;
    return calculateAssessmentAnalysis(
      currentRecord.questions || [],
      myStudents,
      currentRecord.studentScores || [],
      currentRecord.kktp || 75
    );
  }, [currentRecord, myStudents]);

  // Run CTT Unit Tests
  const handleRunUnitTest = () => {
    const res = runAssessmentAnalysisTests();
    setTestResult(res);
    setShowTestModal(true);
  };

  // File Upload / Import Handler (Excel/CSV)
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !currentRecord) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const bstr = evt.target?.result;
        const wb = XLSX.read(bstr, { type: 'binary' });
        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];
        const data = XLSX.utils.sheet_to_json<any>(ws, { header: 1 });

        if (!data || data.length < 2) {
          alert('File kosong atau format spreadsheet tidak valid.');
          return;
        }

        let headerRowIndex = 0;
        for (let r = 0; r < Math.min(5, data.length); r++) {
          const rowStr = JSON.stringify(data[r]).toLowerCase();
          if (rowStr.includes('nama') || rowStr.includes('nisn') || rowStr.includes('soal') || rowStr.includes('q1')) {
            headerRowIndex = r;
            break;
          }
        }

        const headers: string[] = (data[headerRowIndex] || []).map((h: any) => String(h || '').trim());

        const qCols: { qNum: number; colIdx: number }[] = [];
        currentRecord.questions.forEach((q) => {
          const idx = headers.findIndex((h) => {
            const hClean = h.toLowerCase().replace(/[^a-z0-9]/g, '');
            return (
              hClean === `q${q.number}` ||
              hClean === `soal${q.number}` ||
              hClean === `${q.number}`
            );
          });
          if (idx !== -1) {
            qCols.push({ qNum: q.number, colIdx: idx });
          }
        });

        const nisnColIdx = headers.findIndex((h) => h.toLowerCase().includes('nisn'));
        const nameColIdx = headers.findIndex((h) => h.toLowerCase().includes('nama'));

        const newStudentScores: StudentItemScores[] = [...(currentRecord.studentScores || [])];

        let matchedCount = 0;
        for (let r = headerRowIndex + 1; r < data.length; r++) {
          const row = data[r];
          if (!row || row.length === 0) continue;

          const nisnVal = nisnColIdx !== -1 ? String(row[nisnColIdx] || '').trim() : '';
          const nameVal = nameColIdx !== -1 ? String(row[nameColIdx] || '').trim().toLowerCase() : '';

          let student = myStudents.find((st) => nisnVal && st.nisn === nisnVal);
          if (!student && nameVal) {
            student = myStudents.find((st) => st.name.toLowerCase().includes(nameVal) || nameVal.includes(st.name.toLowerCase()));
          }
          if (!student && (r - headerRowIndex - 1) < myStudents.length) {
            student = myStudents[r - headerRowIndex - 1];
          }

          if (student) {
            matchedCount++;
            const scoresObj: Record<number, number> = {};
            const answersObj: Record<number, string> = {};

            qCols.forEach(({ qNum, colIdx }) => {
              const valRaw = String(row[colIdx] || '').trim();
              const qItem = currentRecord.questions.find((q) => q.number === qNum);

              if (qItem && ['Pilihan Jamak', 'Kompleks', 'Menjodohkan'].includes(qItem.type)) {
                answersObj[qNum] = valRaw;
                if (qItem.answerKey) {
                  const correct = isAnswerCorrect(valRaw, qItem.answerKey, qItem.type);
                  scoresObj[qNum] = correct ? qItem.maxScore : 0;
                } else {
                  scoresObj[qNum] = Number(valRaw) || 0;
                }
              } else {
                scoresObj[qNum] = Number(valRaw) || 0;
              }
            });

            const existingIdx = newStudentScores.findIndex((s) => s.studentId === student!.id);
            if (existingIdx >= 0) {
              newStudentScores[existingIdx] = {
                studentId: student.id,
                scores: { ...newStudentScores[existingIdx].scores, ...scoresObj },
                studentAnswers: { ...newStudentScores[existingIdx].studentAnswers, ...answersObj },
              };
            } else {
              newStudentScores.push({
                studentId: student.id,
                scores: scoresObj,
                studentAnswers: answersObj,
              });
            }
          }
        }

        const updatedRecord = {
          ...currentRecord,
          studentScores: newStudentScores,
          updatedAt: new Date().toISOString().split('T')[0],
        };

        setAssessmentAnalyses(
          assessmentAnalyses.map((a) => (a.id === currentRecord.id ? updatedRecord : a))
        );

        setShowImportModal(false);
        alert(`Berhasil mengimpor jawaban/skor untuk ${matchedCount} siswa!`);
      } catch (err) {
        console.error(err);
        alert('Gagal mengimpor file spreadsheet. Pastikan format CSV / Excel sesuai.');
      }
    };
    reader.readAsBinaryString(file);
  };

  // Download Sample Excel Template
  const handleDownloadTemplate = () => {
    if (!currentRecord) return;

    const headers = ['No', 'NISN', 'Nama Siswa'];
    currentRecord.questions.forEach((q) => {
      headers.push(`Soal ${q.number} (${q.type} - Max ${q.maxScore}${q.answerKey ? ` - Kunci: ${q.answerKey}` : ''})`);
    });

    const rows = myStudents.map((st, idx) => {
      const row = [idx + 1, st.nisn, st.name];
      currentRecord.questions.forEach((q) => {
        if (['Pilihan Jamak', 'Kompleks', 'Menjodohkan'].includes(q.type)) {
          row.push(q.answerKey || 'A');
        } else {
          row.push(q.maxScore);
        }
      });
      return row;
    });

    const wsData = [headers, ...rows];
    const ws = XLSX.utils.aoa_to_sheet(wsData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Template Nilai');

    XLSX.writeFile(wb, `Template_Asesmen_${currentRecord.title.replace(/[^a-zA-Z0-9]/g, '_')}.xlsx`);
  };

  // Export Results to PDF
  const handleExportPdf = () => {
    if (!currentRecord || !analysisResult) return;

    const sbj = subjects.find((s) => s.code === currentRecord.subjectCode);
    const subjectName = sbj ? sbj.name : currentRecord.subjectCode;
    const rawTitle = currentRecord.title.toUpperCase();
    const assessmentTitle = rawTitle.startsWith('HASIL ASESMEN') ? rawTitle : `HASIL ASESMEN ${rawTitle}`;

    // Clean class title (ensure 'KELAS' is not duplicated)
    const cleanClass = currentClass.toUpperCase().replace(/^KELAS\s+/i, '');
    const classTitleLine = `KELAS ${cleanClass}`;

    // Common helper to render extra left-aligned identity metadata with aligned colons
    const renderIdentitasTambahan = (doc: any, startY: number) => {
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
      doc.setTextColor(30, 41, 59);

      // Aligning colons at X = 38
      doc.text('Mata Pelajaran', 10, startY);
      doc.text(':', 38, startY);
      doc.text(subjectName, 41, startY);

      doc.text('KKTP', 10, startY + 5);
      doc.text(':', 38, startY + 5);
      doc.text(`${currentRecord.kktp}`, 41, startY + 5);

      return startY + 11;
    };

    const effectivePrintDate = printDate || new Date().toISOString().split('T')[0];

    if (activeTab === 'matrix') {
      // TAB 1: Input Matriks Jawaban & Skor Siswa
      const titleLines = [
        'ANALISIS NILAI',
        assessmentTitle,
        classTitleLine,
        `TAHUN AJARAN ${schoolProfile.tahunAjaran}`,
      ];

      // Group consecutive questions by type for merged header cells (colSpan)
      const questionTypeGroups: { type: QuestionType; count: number }[] = [];
      currentRecord.questions.forEach((q) => {
        if (
          questionTypeGroups.length === 0 ||
          questionTypeGroups[questionTypeGroups.length - 1].type !== q.type
        ) {
          questionTypeGroups.push({ type: q.type, count: 1 });
        } else {
          questionTypeGroups[questionTypeGroups.length - 1].count += 1;
        }
      });

      const row1: any[] = [
        { content: 'No.', rowSpan: 2, styles: { valign: 'middle', halign: 'center' } },
        { content: 'NISN', rowSpan: 2, styles: { valign: 'middle', halign: 'center' } },
        { content: 'Nama Siswa', rowSpan: 2, styles: { valign: 'middle', halign: 'left' } },
      ];

      questionTypeGroups.forEach((g) => {
        row1.push({
          content: g.type,
          colSpan: g.count,
          styles: { halign: 'center', valign: 'middle', fontStyle: 'bold' },
        });
      });

      row1.push(
        { content: 'Total Skor', rowSpan: 2, styles: { valign: 'middle', halign: 'center' } },
        { content: 'Nilai', rowSpan: 2, styles: { valign: 'middle', halign: 'center' } },
        { content: 'Status', rowSpan: 2, styles: { valign: 'middle', halign: 'center' } }
      );

      const row2: any[] = [];
      currentRecord.questions.forEach((q) => {
        row2.push({
          content: `Soal ${q.number}`,
          styles: { halign: 'center', valign: 'middle' },
        });
      });

      const customHead = [row1, row2];

      const rows = myStudents.map((st, idx) => {
        const stScoreEntry = currentRecord.studentScores?.find((s) => s.studentId === st.id);
        const qScores = stScoreEntry?.scores || {};
        const qAnswers = stScoreEntry?.studentAnswers || {};

        let totalScore = 0;
        currentRecord.questions.forEach((q) => {
          totalScore += Number(qScores[q.number]) || 0;
        });
        const maxPossible = currentRecord.questions.reduce((a, b) => a + b.maxScore, 0);
        const pct = maxPossible > 0 ? Number(((totalScore / maxPossible) * 100).toFixed(1)) : 0;
        const isTuntas = pct >= currentRecord.kktp;

        const row: (string | number)[] = [idx + 1, st.nisn, st.name];
        currentRecord.questions.forEach((q) => {
          const isObj = ['Pilihan Jamak', 'Kompleks', 'Menjodohkan'].includes(q.type);
          if (isObj) {
            const ans = qAnswers[q.number] || '-';
            const score = qScores[q.number] !== undefined ? qScores[q.number] : 0;
            row.push(`${ans} (${score})`);
          } else {
            const score = qScores[q.number] !== undefined ? qScores[q.number] : 0;
            row.push(score);
          }
        });
        row.push(totalScore, `${pct}%`, isTuntas ? 'Tuntas' : 'Belum Tuntas');
        return row;
      });

      exportToPdf({
        filename: `Analisis_Nilai_${currentRecord.subjectCode}_${cleanClass}`,
        titleLines,
        customHead,
        tableRows: rows,
        schoolProfile,
        printDate: effectivePrintDate,
        teacherName: currentUser?.name,
        teacherNip: currentUser?.nip,
        orientation: 'landscape',
        columnStyles: { 2: { halign: 'left' } },
        beforeTable: renderIdentitasTambahan,
      });
    } else if (activeTab === 'ketuntasan') {
      // TAB 2: Analisis Ketuntasan Siswa
      const titleLines = [
        'ANALISIS KETUNTASAN SISWA',
        assessmentTitle,
        classTitleLine,
        `TAHUN AJARAN ${schoolProfile.tahunAjaran}`,
      ];

      const headers = ['No.', 'NISN', 'Nama Siswa', 'Skor Maksimal', 'Skor Perolehan', 'Nilai', 'Status'];

      const rows = analysisResult.studentMasteryList.map((st, idx) => [
        idx + 1,
        st.nisn,
        st.studentName,
        st.maxPossibleScore,
        st.totalScore,
        st.percentageScore,
        st.isTuntas ? 'Tuntas' : 'Belum Tuntas',
      ]);

      const afterTableFunc = (doc: any, finalY: number) => {
        let currentY = finalY + 8;
        doc.setFontSize(10);
        doc.setFont('helvetica', 'bold');
        doc.text('RINGKASAN KETUNTASAN KLASIKAL', 10, currentY);

        currentY += 5;
        doc.setFontSize(9);
        doc.setFont('helvetica', 'normal');
        doc.text(`• Total Siswa: ${analysisResult.summary.totalStudents} Siswa`, 10, currentY);
        doc.text(`• Jumlah Tuntas (>= ${currentRecord.kktp}): ${analysisResult.summary.tuntasCount} Siswa`, 85, currentY);
        currentY += 4.5;
        doc.text(`• Belum Tuntas: ${analysisResult.summary.belumTuntasCount} Siswa`, 10, currentY);
        doc.text(`• Ketuntasan Klasikal: ${analysisResult.summary.classicalMasteryPercent}%`, 85, currentY);

        return currentY + 4;
      };

      exportToPdf({
        filename: `Analisis_Ketuntasan_${currentRecord.subjectCode}_${cleanClass}`,
        titleLines,
        tableHeaders: headers,
        tableRows: rows,
        schoolProfile,
        printDate: effectivePrintDate,
        teacherName: currentUser?.name,
        teacherNip: currentUser?.nip,
        orientation: 'portrait',
        columnStyles: { 2: { halign: 'left' } },
        beforeTable: renderIdentitasTambahan,
        afterTable: afterTableFunc,
      });
    } else if (activeTab === 'itemAnalysis') {
      // TAB 3: Analisis Butir Soal (CTT)
      const titleLines = [
        'ANALISIS BUTIR SOAL',
        assessmentTitle,
        classTitleLine,
        `TAHUN AJARAN ${schoolProfile.tahunAjaran}`,
      ];

      const customHead = [
        [
          { content: 'No.', rowSpan: 2, styles: { valign: 'middle', halign: 'center' } },
          { content: 'Jenis Soal', rowSpan: 2, styles: { valign: 'middle', halign: 'center' } },
          { content: 'Jumlah Skor Maksimal', colSpan: 3, styles: { halign: 'center', valign: 'middle' } },
          { content: 'Indeks Kesukaran (P)', colSpan: 2, styles: { halign: 'center', valign: 'middle' } },
          { content: 'Daya Pembeda (D)', colSpan: 2, styles: { halign: 'center', valign: 'middle' } },
        ],
        [
          { content: 'Siswa yang menjawab benar', styles: { halign: 'center', valign: 'middle' } },
          { content: 'Kelompok Atas', styles: { halign: 'center', valign: 'middle' } },
          { content: 'Kelompok Bawah', styles: { halign: 'center', valign: 'middle' } },
          { content: 'Indeks', styles: { halign: 'center', valign: 'middle' } },
          { content: 'Keterangan', styles: { halign: 'center', valign: 'middle' } },
          { content: 'Indeks', styles: { halign: 'center', valign: 'middle' } },
          { content: 'Keterangan', styles: { halign: 'center', valign: 'middle' } },
        ],
      ];

      const rows = analysisResult.itemAnalysisList.map((q) => [
        q.questionNumber,
        q.type,
        q.avgScoreAll,
        q.highGroupAvg,
        q.lowGroupAvg,
        q.difficultyIndex,
        q.difficultyCategory,
        q.discriminationIndex,
        q.discriminationCategory,
      ]);

      exportToPdf({
        filename: `Analisis_Butir_Soal_${currentRecord.subjectCode}_${cleanClass}`,
        titleLines,
        customHead,
        tableRows: rows,
        schoolProfile,
        printDate: effectivePrintDate,
        teacherName: currentUser?.name,
        teacherNip: currentUser?.nip,
        orientation: 'landscape',
        beforeTable: renderIdentitasTambahan,
      });
    }
  };

  // Export Results to Excel
  const handleExportExcel = () => {
    if (!currentRecord || !analysisResult) return;

    const sbj = subjects.find((s) => s.code === currentRecord.subjectCode);
    const cleanClass = currentClass.toUpperCase().replace(/^KELAS\s+/i, '');
    const headerTitleLines = [
      `LAPORAN ANALISIS ASESMEN & BUTIR SOAL (CTT) - ${schoolProfile.namaMadrasah.toUpperCase()}`,
      `JUDUL: ${currentRecord.title}`,
      `MAPEL: ${sbj ? sbj.name : currentRecord.subjectCode} | KELAS: ${cleanClass} | KKTP: ${currentRecord.kktp}`,
      `TAHUN AJARAN ${schoolProfile.tahunAjaran}`,
    ];

    const studentHeaders = ['No', 'NISN', 'Nama Siswa', 'Total Skor', 'Skor Maksimum', 'Nilai (100%)', 'Status Ketuntasan'];
    const studentRows = analysisResult.studentMasteryList.map((st, idx) => [
      idx + 1,
      st.nisn,
      st.studentName,
      st.totalScore,
      st.maxPossibleScore,
      st.percentageScore,
      st.isTuntas ? 'TUNTAS' : 'BELUM TUNTAS',
    ]);

    exportToExcel(
      `Analisis_Asesmen_${currentRecord.subjectCode}_${cleanClass}`,
      'Ketuntasan Siswa',
      headerTitleLines,
      studentHeaders,
      studentRows
    );
  };

  // Filtered Students in Matrix View
  const filteredStudents = useMemo(() => {
    if (!searchStudent.trim()) return myStudents;
    const q = searchStudent.toLowerCase();
    return myStudents.filter(
      (st) => st.name.toLowerCase().includes(q) || st.nisn.includes(q)
    );
  }, [myStudents, searchStudent]);

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-teal-800 via-emerald-800 to-slate-900 rounded-3xl p-6 sm:p-8 text-white shadow-xl relative overflow-hidden">
        <div className="absolute right-0 top-0 bottom-0 opacity-10 flex items-center pr-8 pointer-events-none">
          <BarChart3 className="w-80 h-80 text-white" />
        </div>

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2 max-w-2xl">
            <div className="flex items-center gap-2">
              <span className="px-3 py-1 bg-teal-500/30 border border-teal-300/40 text-teal-200 text-[11px] font-extrabold rounded-full uppercase tracking-wider">
                Administrasi Guru / Evaluasi
              </span>
              <span className="px-2.5 py-1 bg-white/10 text-white text-[11px] font-semibold rounded-full">
                {currentClass}
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
              Analisis Asesmen & Butir Soal (CTT)
            </h1>
            <p className="text-xs sm:text-sm text-teal-100 font-medium leading-relaxed">
              Fasilitas analisis ketuntasan siswa & analisis butir soal berbasis Teori Tes Klasik (Classical Test Theory - CTT) mencakup Indeks Kesukaran ($P$) dan Daya Pembeda ($D$).
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 shrink-0">
            <button
              onClick={handleCreateNewAssessment}
              className="flex items-center gap-2 px-4 py-2.5 bg-teal-500 hover:bg-teal-400 text-slate-950 font-extrabold text-xs rounded-xl shadow-lg transition-all"
            >
              <Plus className="w-4 h-4" />
              Buat Analisis Asesmen Baru
            </button>
            <button
              onClick={handleRunUnitTest}
              className="flex items-center gap-2 px-3.5 py-2.5 bg-white/15 hover:bg-white/25 text-white font-bold text-xs rounded-xl border border-white/20 transition-all"
              title="Uji Akurasi Kalkulasi CTT"
            >
              <Sparkles className="w-4 h-4 text-amber-300" />
              Cek Unit Test CTT
            </button>
          </div>
        </div>
      </div>

      {/* Select Assessment & Quick Toolbar */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3 flex-1 min-w-[280px]">
          <div className="w-10 h-10 rounded-xl bg-teal-100 text-teal-800 flex items-center justify-center shrink-0">
            <Award className="w-5 h-5" />
          </div>
          <div className="flex-1">
            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">
              Pilih Data Analisis Asesmen
            </label>
            <select
              value={selectedId}
              onChange={(e) => setSelectedId(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-500"
            >
              {assessmentAnalyses.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.title} ({a.subjectCode} - KKTP: {a.kktp})
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={handleOpenConfig}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs rounded-xl border border-slate-200 transition-colors"
          >
            <Settings className="w-4 h-4 text-slate-600" />
            Pengaturan Asesmen & Struktur Soal
          </button>
          <button
            onClick={() => setShowImportModal(true)}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-800 font-bold text-xs rounded-xl border border-indigo-200 transition-colors"
          >
            <Upload className="w-4 h-4 text-indigo-600" />
            Import Spreadsheet
          </button>
          <div className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl shadow-xs">
            <Calendar className="w-4 h-4 text-teal-600 shrink-0" />
            <span className="text-[11px] font-bold text-slate-600 whitespace-nowrap">Tgl Cetak:</span>
            <input
              type="date"
              value={printDate}
              onChange={(e) => setPrintDate(e.target.value)}
              className="bg-transparent text-xs font-bold text-slate-800 focus:outline-none cursor-pointer"
            />
          </div>
          <button
            onClick={handleExportPdf}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-rose-50 hover:bg-rose-100 text-rose-800 font-bold text-xs rounded-xl border border-rose-200 transition-colors"
          >
            <FileText className="w-4 h-4 text-rose-600" />
            Export PDF
          </button>
          <button
            onClick={handleExportExcel}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 font-bold text-xs rounded-xl border border-emerald-200 transition-colors"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
            Export Excel
          </button>
          {currentRecord && (
            <div className="flex items-center gap-1.5 pl-1 border-l border-slate-200">
              <button
                onClick={handleOpenConfig}
                className="flex items-center gap-1.5 px-3.5 py-2 bg-amber-50 hover:bg-amber-100 text-amber-900 font-bold text-xs rounded-xl border border-amber-200 transition-colors"
                title="Edit Nama Asesmen & Struktur Soal"
              >
                <Pencil className="w-4 h-4 text-amber-600" />
                Edit
              </button>
              <button
                onClick={() => handleDeleteAssessment(currentRecord.id)}
                className="flex items-center gap-1.5 px-3.5 py-2 bg-rose-50 hover:bg-rose-100 text-rose-800 font-bold text-xs rounded-xl border border-rose-200 transition-colors"
                title="Hapus Data Analisis Asesmen Ini"
              >
                <Trash2 className="w-4 h-4 text-rose-600" />
                Hapus
              </button>
            </div>
          )}
        </div>
      </div>

      {/* KPI Cards Summary */}
      {analysisResult && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs space-y-2">
            <div className="flex items-center justify-between text-slate-500 text-xs">
              <span className="font-semibold">Ketuntasan Klasikal</span>
              <span
                className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                  analysisResult.summary.classicalMasteryPercent >= 85
                    ? 'bg-emerald-100 text-emerald-800'
                    : 'bg-amber-100 text-amber-800'
                }`}
              >
                {analysisResult.summary.classicalMasteryPercent >= 85 ? 'Tuntas Klasikal' : 'Perlu Remedial'}
              </span>
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-black text-slate-900">
                {analysisResult.summary.classicalMasteryPercent}%
              </span>
              <span className="text-xs text-slate-500 font-medium">
                ({analysisResult.summary.tuntasCount}/{analysisResult.summary.totalStudents} siswa)
              </span>
            </div>
            <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
              <div
                className={`h-full transition-all duration-500 ${
                  analysisResult.summary.classicalMasteryPercent >= 85 ? 'bg-emerald-600' : 'bg-amber-500'
                }`}
                style={{ width: `${Math.min(100, analysisResult.summary.classicalMasteryPercent)}%` }}
              />
            </div>
          </div>

          <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs space-y-2">
            <div className="flex items-center justify-between text-slate-500 text-xs">
              <span className="font-semibold">Siswa Tuntas (&ge; {currentRecord?.kktp})</span>
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            </div>
            <div className="text-3xl font-black text-emerald-700">
              {analysisResult.summary.tuntasCount} <span className="text-xs font-semibold text-slate-500">Siswa</span>
            </div>
            <p className="text-[11px] text-slate-400">
              Memenuhi atau melebihi threshold KKTP {currentRecord?.kktp}
            </p>
          </div>

          <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs space-y-2">
            <div className="flex items-center justify-between text-slate-500 text-xs">
              <span className="font-semibold">Belum Tuntas (&lt; {currentRecord?.kktp})</span>
              <XCircle className="w-4 h-4 text-rose-600" />
            </div>
            <div className="text-3xl font-black text-rose-700">
              {analysisResult.summary.belumTuntasCount} <span className="text-xs font-semibold text-slate-500">Siswa</span>
            </div>
            <p className="text-[11px] text-slate-400">
              Memerlukan tindak lanjut program remedial
            </p>
          </div>

          <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs space-y-2">
            <div className="flex items-center justify-between text-slate-500 text-xs">
              <span className="font-semibold">Rata-Rata Nilai Class</span>
              <BarChart3 className="w-4 h-4 text-indigo-600" />
            </div>
            <div className="text-3xl font-black text-slate-900">
              {analysisResult.summary.averageScoreAll}
              <span className="text-xs font-semibold text-slate-400"> / {analysisResult.summary.totalMaxPossibleScore}</span>
            </div>
            <p className="text-[11px] text-slate-400">
              {currentRecord?.questions.length} Butir Soal | Kelompok Atas/Bawah: {analysisResult.summary.highGroupCount} Siswa (27%)
            </p>
          </div>
        </div>
      )}

      {/* Navigation Tabs */}
      <div className="flex items-center border-b border-slate-200 gap-2 text-xs font-bold">
        <button
          onClick={() => setActiveTab('matrix')}
          className={`pb-3 px-4 flex items-center gap-2 border-b-2 transition-colors cursor-pointer ${
            activeTab === 'matrix'
              ? 'border-teal-700 text-teal-800 font-extrabold'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <FileSpreadsheet className="w-4 h-4" />
          1. Input Matriks Jawaban & Skor Siswa
        </button>
        <button
          onClick={() => setActiveTab('ketuntasan')}
          className={`pb-3 px-4 flex items-center gap-2 border-b-2 transition-colors cursor-pointer ${
            activeTab === 'ketuntasan'
              ? 'border-teal-700 text-teal-800 font-extrabold'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Award className="w-4 h-4" />
          2. Analisis Ketuntasan Siswa
        </button>
        <button
          onClick={() => setActiveTab('itemAnalysis')}
          className={`pb-3 px-4 flex items-center gap-2 border-b-2 transition-colors cursor-pointer ${
            activeTab === 'itemAnalysis'
              ? 'border-teal-700 text-teal-800 font-extrabold'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <BarChart3 className="w-4 h-4" />
          3. Analisis Butir Soal (CTT)
        </button>
      </div>

      {/* TAB 1: MATRIKS JAWABAN & SKOR SISWA */}
      {activeTab === 'matrix' && currentRecord && (() => {
        const pgQuestions = currentRecord.questions.filter((q) => q.type === 'Pilihan Jamak');
        const kmpQuestions = currentRecord.questions.filter((q) => q.type === 'Kompleks');
        const mjdQuestions = currentRecord.questions.filter((q) => q.type === 'Menjodohkan');
        const isnQuestions = currentRecord.questions.filter((q) => q.type === 'Isian');
        const urnQuestions = currentRecord.questions.filter((q) => q.type === 'Uraian');

        return (
          <div className="bg-white border border-slate-200 rounded-3xl p-5 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
              <div>
                <h2 className="text-base font-extrabold text-slate-900">
                  Matriks Input Jawaban Siswa & Auto-Koreksi Skor
                </h2>
                <p className="text-xs text-slate-500">
                  Input huruf/kode jawaban siswa secara ringkas atau detail untuk <strong className="text-teal-800">Pilihan Jamak, Kompleks & Menjodohkan</strong> (skor terhitung otomatis jika Kunci Jawaban diisi). Untuk <strong className="text-indigo-800">Isian & Uraian</strong> dikoreksi manual dengan menginput skor langsung.
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                {/* Switcher Matrix Mode */}
                <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200 text-xs font-extrabold">
                  <button
                    onClick={() => setMatrixViewMode('compact')}
                    className={`px-2.5 py-1 rounded-lg transition-all flex items-center gap-1.5 cursor-pointer ${
                      matrixViewMode === 'compact'
                        ? 'bg-white text-teal-800 shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    <Zap className="w-3.5 h-3.5 text-teal-600" />
                    Tampilan Ringkas
                  </button>
                  <button
                    onClick={() => setMatrixViewMode('detailed')}
                    className={`px-2.5 py-1 rounded-lg transition-all flex items-center gap-1.5 cursor-pointer ${
                      matrixViewMode === 'detailed'
                        ? 'bg-white text-teal-800 shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    <LayoutGrid className="w-3.5 h-3.5 text-slate-500" />
                    Tampilan Detail ({currentRecord.questions.length} Soal)
                  </button>
                </div>

                <input
                  type="text"
                  placeholder="Cari nama/NISN..."
                  value={searchStudent}
                  onChange={(e) => setSearchStudent(e.target.value)}
                  className="px-3 py-1.5 text-xs border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500"
                />
              </div>
            </div>

            <div className="overflow-x-auto border border-slate-200 rounded-2xl max-h-[550px]">
              <table className="w-full text-xs text-left text-slate-700">
                <thead className="bg-slate-800 text-white sticky top-0 z-10">
                  <tr>
                    <th className="px-3 py-3 font-bold text-center w-10">No</th>
                    <th className="px-3 py-3 font-bold min-w-[90px]">NISN</th>
                    <th className="px-3 py-3 font-bold min-w-[160px]">Nama Siswa</th>

                    {matrixViewMode === 'compact' ? (
                      <>
                        {/* Compact Header Pilihan Jamak */}
                        {pgQuestions.length > 0 && (
                          <th className="px-3 py-2 font-bold text-center min-w-[220px] border-x border-slate-700 bg-slate-900">
                            <div className="text-teal-300 font-extrabold">Pilihan Jamak ({pgQuestions.length} Soal)</div>
                            <div className="text-[10px] font-normal text-slate-300">
                              Format: 5 huruf/strip (e.g. DBBAA-ACABD)
                            </div>
                            {getPgCompact(currentRecord.questions) ? (
                              <div className="text-[9px] font-bold text-amber-300 bg-amber-950/60 rounded px-1.5 py-0.5 mt-0.5 inline-block font-mono">
                                Kunci: {getPgCompact(currentRecord.questions)}
                              </div>
                            ) : (
                              <div className="text-[9px] font-normal text-slate-400 mt-0.5">Kunci Belum Diisi</div>
                            )}
                          </th>
                        )}

                        {/* Compact Header Kompleks */}
                        {kmpQuestions.length > 0 && (
                          <th className="px-3 py-2 font-bold text-center min-w-[210px] border-x border-slate-700 bg-slate-900">
                            <div className="text-indigo-300 font-extrabold">Kompleks ({kmpQuestions.length} Soal)</div>
                            <div className="text-[10px] font-normal text-slate-300">
                              Format: pisah koma (e.g. CB, AD, BC)
                            </div>
                            {getKmpCompact(currentRecord.questions) ? (
                              <div className="text-[9px] font-bold text-amber-300 bg-amber-950/60 rounded px-1.5 py-0.5 mt-0.5 inline-block font-mono">
                                Kunci: {getKmpCompact(currentRecord.questions)}
                              </div>
                            ) : (
                              <div className="text-[9px] font-normal text-slate-400 mt-0.5">Kunci Belum Diisi</div>
                            )}
                          </th>
                        )}

                        {/* Compact Header Menjodohkan */}
                        {mjdQuestions.length > 0 && (
                          <th className="px-3 py-2 font-bold text-center min-w-[170px] border-x border-slate-700 bg-slate-900">
                            <div className="text-emerald-300 font-extrabold">Menjodohkan ({mjdQuestions.length} Soal)</div>
                            <div className="text-[10px] font-normal text-slate-300">
                              Format: sambung (e.g. BDAFC)
                            </div>
                            {getMjdCompact(currentRecord.questions) ? (
                              <div className="text-[9px] font-bold text-amber-300 bg-amber-950/60 rounded px-1.5 py-0.5 mt-0.5 inline-block font-mono">
                                Kunci: {getMjdCompact(currentRecord.questions)}
                              </div>
                            ) : (
                              <div className="text-[9px] font-normal text-slate-400 mt-0.5">Kunci Belum Diisi</div>
                            )}
                          </th>
                        )}

                        {/* Individual Headers for Isian */}
                        {isnQuestions.map((q) => (
                          <th
                            key={q.number}
                            className="px-2 py-2 font-bold text-center min-w-[95px] border-x border-slate-700 bg-indigo-950"
                          >
                            <div>Soal {q.number}</div>
                            <div className="text-[10px] font-normal text-teal-300">
                              Isian (Max {q.maxScore})
                            </div>
                            <div className="text-[9px] font-normal text-slate-400 mt-0.5">
                              Manual
                            </div>
                          </th>
                        ))}

                        {/* Individual Headers for Uraian */}
                        {urnQuestions.map((q) => (
                          <th
                            key={q.number}
                            className="px-2 py-2 font-bold text-center min-w-[95px] border-x border-slate-700 bg-indigo-950"
                          >
                            <div>Soal {q.number}</div>
                            <div className="text-[10px] font-normal text-teal-300">
                              Uraian (Max {q.maxScore})
                            </div>
                            <div className="text-[9px] font-normal text-slate-400 mt-0.5">
                              Manual
                            </div>
                          </th>
                        ))}
                      </>
                    ) : (
                      /* Detailed Header (1 column per question) */
                      currentRecord.questions.map((q) => {
                        const isObj = ['Pilihan Jamak', 'Kompleks', 'Menjodohkan'].includes(q.type);
                        return (
                          <th
                            key={q.number}
                            className={`px-2 py-2 font-bold text-center min-w-[95px] border-x border-slate-700 ${
                              isObj ? 'bg-slate-900' : 'bg-indigo-950'
                            }`}
                          >
                            <div>Soal {q.number}</div>
                            <div className="text-[10px] font-normal text-teal-300">
                              {q.type} (Max {q.maxScore})
                            </div>
                            {q.answerKey ? (
                              <div className="text-[9px] font-bold text-amber-300 bg-amber-950/60 rounded px-1 py-0.5 mt-0.5 inline-block font-mono">
                                Kunci: {q.answerKey}
                              </div>
                            ) : (
                              <div className="text-[9px] font-normal text-slate-400 mt-0.5">
                                Koreksi Manual
                              </div>
                            )}
                          </th>
                        );
                      })
                    )}

                    <th className="px-3 py-3 font-bold text-center min-w-[90px] bg-slate-950 text-teal-300">
                      Total Skor
                    </th>
                    <th className="px-3 py-3 font-bold text-center min-w-[90px] bg-slate-950 text-emerald-300">
                      Nilai (100%)
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white font-medium">
                  {filteredStudents.length === 0 ? (
                    <tr>
                      <td
                        colSpan={
                          5 +
                          (matrixViewMode === 'compact'
                            ? (pgQuestions.length ? 1 : 0) +
                              (kmpQuestions.length ? 1 : 0) +
                              (mjdQuestions.length ? 1 : 0) +
                              isnQuestions.length +
                              urnQuestions.length
                            : currentRecord.questions.length)
                        }
                        className="px-4 py-8 text-center text-slate-400"
                      >
                        Tidak ada data siswa ditemukan di kelas {currentClass}.
                      </td>
                    </tr>
                  ) : (
                    filteredStudents.map((st, idx) => {
                      const stScoreEntry = currentRecord.studentScores?.find((s) => s.studentId === st.id);
                      const qScores = stScoreEntry?.scores || {};
                      const qAnswers = stScoreEntry?.studentAnswers || {};

                      let totalScore = 0;
                      currentRecord.questions.forEach((q) => {
                        totalScore += Number(qScores[q.number]) || 0;
                      });
                      const maxPossible = currentRecord.questions.reduce((a, b) => a + b.maxScore, 0);
                      const pct = maxPossible > 0 ? Number(((totalScore / maxPossible) * 100).toFixed(1)) : 0;
                      const isTuntas = pct >= currentRecord.kktp;

                      return (
                        <tr key={st.id} className="hover:bg-slate-50 transition-colors">
                          <td className="px-3 py-2 text-center font-bold text-slate-400">{idx + 1}</td>
                          <td className="px-3 py-2 font-mono text-[11px] text-slate-500">{st.nisn}</td>
                          <td className="px-3 py-2 font-extrabold text-slate-900">{st.name}</td>

                          {matrixViewMode === 'compact' ? (
                            <>
                              {/* Compact Cell: Pilihan Jamak */}
                              {pgQuestions.length > 0 && (() => {
                                const compactPgVal = getStudentPgCompact(currentRecord.questions, qAnswers);
                                const totalPgScore = pgQuestions.reduce((s, q) => s + (Number(qScores[q.number]) || 0), 0);
                                const maxPgScore = pgQuestions.reduce((s, q) => s + q.maxScore, 0);
                                const totalPgCorrect = pgQuestions.filter(
                                  (q) => q.answerKey && isAnswerCorrect(qAnswers[q.number] || '', q.answerKey, 'Pilihan Jamak')
                                ).length;

                                return (
                                  <td className="px-3 py-2 text-center border-x border-slate-100 bg-teal-50/20">
                                    <div className="space-y-1">
                                      <input
                                        type="text"
                                        placeholder="Misal: DBBAA-ACABD"
                                        value={compactPgVal}
                                        onChange={(e) =>
                                          handleStudentCompactAnswerChange(st.id, 'Pilihan Jamak', e.target.value)
                                        }
                                        className="w-full px-2.5 py-1 text-center font-mono font-bold text-xs uppercase tracking-wider border border-teal-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 bg-white text-teal-950"
                                      />
                                      <div className="flex items-center justify-center gap-1.5 text-[10px]">
                                        <span className="px-1.5 py-0.5 rounded font-black bg-teal-100 text-teal-800">
                                          {totalPgCorrect}/{pgQuestions.length} Benar
                                        </span>
                                        <span className="px-1.5 py-0.5 rounded font-extrabold bg-slate-100 text-slate-700">
                                          Skor: {totalPgScore}/{maxPgScore}
                                        </span>
                                      </div>
                                    </div>
                                  </td>
                                );
                              })()}

                              {/* Compact Cell: Kompleks */}
                              {kmpQuestions.length > 0 && (() => {
                                const compactKmpVal = getStudentKmpCompact(currentRecord.questions, qAnswers);
                                const totalKmpScore = kmpQuestions.reduce((s, q) => s + (Number(qScores[q.number]) || 0), 0);
                                const maxKmpScore = kmpQuestions.reduce((s, q) => s + q.maxScore, 0);
                                const totalKmpCorrect = kmpQuestions.filter(
                                  (q) => q.answerKey && isAnswerCorrect(qAnswers[q.number] || '', q.answerKey, 'Kompleks')
                                ).length;

                                return (
                                  <td className="px-3 py-2 text-center border-x border-slate-100 bg-indigo-50/20">
                                    <div className="space-y-1">
                                      <input
                                        type="text"
                                        placeholder="Misal: CB, AD, BC, AC, BC"
                                        value={compactKmpVal}
                                        onChange={(e) =>
                                          handleStudentCompactAnswerChange(st.id, 'Kompleks', e.target.value)
                                        }
                                        className="w-full px-2.5 py-1 text-center font-mono font-bold text-xs uppercase tracking-wider border border-indigo-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white text-indigo-950"
                                      />
                                      <div className="flex items-center justify-center gap-1.5 text-[10px]">
                                        <span className="px-1.5 py-0.5 rounded font-black bg-indigo-100 text-indigo-800">
                                          {totalKmpCorrect}/{kmpQuestions.length} Benar
                                        </span>
                                        <span className="px-1.5 py-0.5 rounded font-extrabold bg-slate-100 text-slate-700">
                                          Skor: {totalKmpScore}/{maxKmpScore}
                                        </span>
                                      </div>
                                    </div>
                                  </td>
                                );
                              })()}

                              {/* Compact Cell: Menjodohkan */}
                              {mjdQuestions.length > 0 && (() => {
                                const compactMjdVal = getStudentMjdCompact(currentRecord.questions, qAnswers);
                                const totalMjdScore = mjdQuestions.reduce((s, q) => s + (Number(qScores[q.number]) || 0), 0);
                                const maxMjdScore = mjdQuestions.reduce((s, q) => s + q.maxScore, 0);
                                const totalMjdCorrect = mjdQuestions.filter(
                                  (q) => q.answerKey && isAnswerCorrect(qAnswers[q.number] || '', q.answerKey, 'Menjodohkan')
                                ).length;

                                return (
                                  <td className="px-3 py-2 text-center border-x border-slate-100 bg-emerald-50/20">
                                    <div className="space-y-1">
                                      <input
                                        type="text"
                                        placeholder="Misal: BDAFC"
                                        value={compactMjdVal}
                                        onChange={(e) =>
                                          handleStudentCompactAnswerChange(st.id, 'Menjodohkan', e.target.value)
                                        }
                                        className="w-full px-2.5 py-1 text-center font-mono font-bold text-xs uppercase tracking-wider border border-emerald-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white text-emerald-950"
                                      />
                                      <div className="flex items-center justify-center gap-1.5 text-[10px]">
                                        <span className="px-1.5 py-0.5 rounded font-black bg-emerald-100 text-emerald-800">
                                          {totalMjdCorrect}/{mjdQuestions.length} Benar
                                        </span>
                                        <span className="px-1.5 py-0.5 rounded font-extrabold bg-slate-100 text-slate-700">
                                          Skor: {totalMjdScore}/{maxMjdScore}
                                        </span>
                                      </div>
                                    </div>
                                  </td>
                                );
                              })()}

                              {/* Isian Cell */}
                              {isnQuestions.map((q) => {
                                const currentVal = qScores[q.number] !== undefined ? qScores[q.number] : '';
                                return (
                                  <td key={q.number} className="px-2 py-1.5 text-center border-x border-slate-100 bg-indigo-50/20">
                                    <div className="space-y-1">
                                      <input
                                        type="number"
                                        min={0}
                                        max={q.maxScore}
                                        step={0.5}
                                        value={currentVal}
                                        onChange={(e) => handleScoreChange(st.id, q.number, e.target.value)}
                                        className="w-16 px-1.5 py-1 text-center font-bold text-xs border border-indigo-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
                                      />
                                      <div className="text-[9px] text-indigo-600 font-bold">
                                        Manual / {q.maxScore}
                                      </div>
                                    </div>
                                  </td>
                                );
                              })}

                              {/* Uraian Cell */}
                              {urnQuestions.map((q) => {
                                const currentVal = qScores[q.number] !== undefined ? qScores[q.number] : '';
                                return (
                                  <td key={q.number} className="px-2 py-1.5 text-center border-x border-slate-100 bg-indigo-50/20">
                                    <div className="space-y-1">
                                      <input
                                        type="number"
                                        min={0}
                                        max={q.maxScore}
                                        step={0.5}
                                        value={currentVal}
                                        onChange={(e) => handleScoreChange(st.id, q.number, e.target.value)}
                                        className="w-16 px-1.5 py-1 text-center font-bold text-xs border border-indigo-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
                                      />
                                      <div className="text-[9px] text-indigo-600 font-bold">
                                        Manual / {q.maxScore}
                                      </div>
                                    </div>
                                  </td>
                                );
                              })}
                            </>
                          ) : (
                            /* Detailed Cell (1 column per question) */
                            currentRecord.questions.map((q) => {
                              const isObj = ['Pilihan Jamak', 'Kompleks', 'Menjodohkan'].includes(q.type);
                              const currentAns = qAnswers[q.number] !== undefined ? qAnswers[q.number] : '';
                              const currentVal = qScores[q.number] !== undefined ? qScores[q.number] : '';

                              if (isObj) {
                                const isCorrect = q.answerKey && isAnswerCorrect(currentAns, q.answerKey, q.type);
                                return (
                                  <td key={q.number} className="px-2 py-1.5 text-center border-x border-slate-100 bg-teal-50/20">
                                    <div className="space-y-1">
                                      <input
                                        type="text"
                                        placeholder={q.type === 'Pilihan Jamak' ? 'A/B/C' : 'Jawaban'}
                                        value={currentAns}
                                        onChange={(e) => handleStudentAnswerChange(st.id, q.number, e.target.value)}
                                        className="w-16 px-1.5 py-1 text-center font-bold text-xs uppercase border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 bg-white"
                                      />
                                      <div className="flex items-center justify-center gap-1">
                                        <span
                                          className={`px-1.5 py-0.5 rounded text-[10px] font-black ${
                                            isCorrect
                                              ? 'bg-emerald-100 text-emerald-800'
                                              : currentAns
                                              ? 'bg-rose-100 text-rose-800'
                                              : 'bg-slate-100 text-slate-500'
                                          }`}
                                        >
                                          Skor: {currentVal}
                                        </span>
                                      </div>
                                    </div>
                                  </td>
                                );
                              }

                              return (
                                <td key={q.number} className="px-2 py-1.5 text-center border-x border-slate-100 bg-indigo-50/20">
                                  <div className="space-y-1">
                                    <input
                                      type="number"
                                      min={0}
                                      max={q.maxScore}
                                      step={0.5}
                                      value={currentVal}
                                      onChange={(e) => handleScoreChange(st.id, q.number, e.target.value)}
                                      className="w-16 px-1.5 py-1 text-center font-bold text-xs border border-indigo-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
                                    />
                                    <div className="text-[9px] text-indigo-600 font-bold">
                                      Manual / {q.maxScore}
                                    </div>
                                  </div>
                                </td>
                              );
                            })
                          )}

                          <td className="px-3 py-2 text-center font-black text-slate-900 bg-slate-50/80">
                            {totalScore} <span className="text-[10px] text-slate-400 font-normal">/ {maxPossible}</span>
                          </td>
                          <td className="px-3 py-2 text-center bg-slate-50/80">
                            <span
                              className={`px-2 py-0.5 rounded-full text-[11px] font-black ${
                                isTuntas
                                  ? 'bg-emerald-100 text-emerald-800'
                                  : 'bg-rose-100 text-rose-800'
                              }`}
                            >
                              {pct}%
                            </span>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        );
      })()}

      {/* TAB 2: ANALISIS KETUNTASAN SISWA */}
      {activeTab === 'ketuntasan' && analysisResult && (
        <div className="bg-white border border-slate-200 rounded-3xl p-5 shadow-xs space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div>
              <h2 className="text-base font-extrabold text-slate-900">
                Tabel Analisis Ketuntasan Belajar Siswa
              </h2>
              <p className="text-xs text-slate-500">
                Ambang Batas KKTP: <span className="font-bold text-teal-700">{currentRecord?.kktp}</span>. Siswa dengan nilai &ge; KKTP dinyatakan <span className="font-bold text-emerald-700">TUNTAS</span>.
              </p>
            </div>
            <div className="text-right">
              <span className="text-xs font-semibold text-slate-500">
                Ketuntasan Klasikal:{' '}
              </span>
              <span className="text-base font-black text-teal-800">
                {analysisResult.summary.classicalMasteryPercent}%
              </span>
            </div>
          </div>

          <div className="overflow-x-auto border border-slate-200 rounded-2xl">
            <table className="w-full text-xs text-left text-slate-700">
              <thead className="bg-slate-800 text-white">
                <tr>
                  <th className="px-3 py-3 font-bold text-center w-12">No</th>
                  <th className="px-3 py-3 font-bold min-w-[110px]">NISN</th>
                  <th className="px-3 py-3 font-bold">Nama Siswa</th>
                  <th className="px-3 py-3 font-bold text-center">Total Skor</th>
                  <th className="px-3 py-3 font-bold text-center">Skor Maks</th>
                  <th className="px-3 py-3 font-bold text-center">Nilai (%)</th>
                  <th className="px-3 py-3 font-bold text-center">KKTP</th>
                  <th className="px-3 py-3 font-bold text-center min-w-[130px]">Status Ketuntasan</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white font-medium">
                {analysisResult.studentMasteryList.map((st, idx) => (
                  <tr key={st.studentId} className="hover:bg-slate-50">
                    <td className="px-3 py-2.5 text-center font-bold text-slate-400">{idx + 1}</td>
                    <td className="px-3 py-2.5 font-mono text-slate-500">{st.nisn}</td>
                    <td className="px-3 py-2.5 font-extrabold text-slate-900">{st.studentName}</td>
                    <td className="px-3 py-2.5 text-center font-bold text-slate-800">{st.totalScore}</td>
                    <td className="px-3 py-2.5 text-center text-slate-500">{st.maxPossibleScore}</td>
                    <td className="px-3 py-2.5 text-center font-black text-slate-900 text-sm">
                      {st.percentageScore}%
                    </td>
                    <td className="px-3 py-2.5 text-center text-slate-500 font-bold">{currentRecord?.kktp}</td>
                    <td className="px-3 py-2.5 text-center">
                      {st.isTuntas ? (
                        <span className="inline-flex items-center gap-1 px-3 py-1 bg-emerald-100 text-emerald-800 font-extrabold text-[11px] rounded-full border border-emerald-200 shadow-2xs">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                          TUNTAS
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-3 py-1 bg-rose-100 text-rose-800 font-extrabold text-[11px] rounded-full border border-rose-200 shadow-2xs">
                          <XCircle className="w-3.5 h-3.5 text-rose-600" />
                          BELUM TUNTAS
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 3: ANALISIS BUTIR SOAL CTT */}
      {activeTab === 'itemAnalysis' && analysisResult && (
        <div className="bg-white border border-slate-200 rounded-3xl p-5 shadow-xs space-y-5">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pb-3 border-b border-slate-100">
            <div>
              <h2 className="text-base font-extrabold text-slate-900">
                Tabel Analisis Butir Soal (Teori Tes Klasik - CTT)
              </h2>
              <p className="text-xs text-slate-500">
                Analisis Indeks Kesukaran ($P$) & Indeks Daya Pembeda ($D$) berdasarkan sampel Kelompok Atas ($N_A$) dan Kelompok Bawah ($N_B$) sebesar 27%.
              </p>
            </div>
            <div className="bg-amber-50 border border-amber-200 p-2.5 rounded-2xl text-[11px] text-amber-900 flex items-center gap-2">
              <Info className="w-4 h-4 text-amber-600 shrink-0" />
              <span>
                Sampel Kelompok Atas/Bawah: <strong>{analysisResult.summary.highGroupCount} Siswa</strong> dari total {analysisResult.summary.totalStudents} siswa.
              </span>
            </div>
          </div>

          <div className="overflow-x-auto border border-slate-200 rounded-2xl">
            <table className="w-full text-xs text-left text-slate-700">
              <thead className="bg-slate-800 text-white">
                <tr>
                  <th className="px-3 py-3 font-bold text-center w-12">No</th>
                  <th className="px-3 py-3 font-bold min-w-[110px]">Jenis Soal</th>
                  <th className="px-3 py-3 font-bold text-center">Skor Maks</th>
                  <th className="px-3 py-3 font-bold text-center">Rerata Total</th>
                  <th className="px-3 py-3 font-bold text-center bg-teal-900">Rerata Kel. Atas ($N_A$)</th>
                  <th className="px-3 py-3 font-bold text-center bg-slate-900">Rerata Kel. Bawah ($N_B$)</th>
                  <th className="px-3 py-3 font-bold text-center min-w-[140px]">
                    Indeks Kesukaran ($P$)
                  </th>
                  <th className="px-3 py-3 font-bold text-center min-w-[140px]">
                    Indeks Daya Pembeda ($D$)
                  </th>
                  <th className="px-3 py-3 font-bold text-center min-w-[120px]">
                    Rekomendasi
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white font-medium">
                {analysisResult.itemAnalysisList.map((q) => {
                  return (
                    <tr key={q.questionNumber} className="hover:bg-slate-50">
                      <td className="px-3 py-3 text-center font-black text-slate-900">{q.questionNumber}</td>
                      <td className="px-3 py-3 font-bold text-slate-700">{q.type}</td>
                      <td className="px-3 py-3 text-center font-bold text-slate-800">{q.maxScore}</td>
                      <td className="px-3 py-3 text-center font-bold text-slate-800">{q.avgScoreAll}</td>
                      <td className="px-3 py-3 text-center font-black text-teal-800 bg-teal-50/50">{q.highGroupAvg}</td>
                      <td className="px-3 py-3 text-center font-black text-slate-800 bg-slate-50/50">{q.lowGroupAvg}</td>

                      <td className="px-3 py-3 text-center">
                        <div className="space-y-0.5">
                          <span className="font-mono font-bold text-slate-900">{q.difficultyIndex}</span>
                          <div>
                            <span
                              className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
                                q.difficultyCategory === 'Soal mudah'
                                  ? 'bg-cyan-100 text-cyan-800'
                                  : q.difficultyCategory === 'Soal sedang'
                                  ? 'bg-blue-100 text-blue-800'
                                  : 'bg-amber-100 text-amber-800'
                              }`}
                            >
                              {q.difficultyCategory}
                            </span>
                          </div>
                        </div>
                      </td>

                      <td className="px-3 py-3 text-center">
                        <div className="space-y-0.5">
                          <span className="font-mono font-bold text-slate-900">{q.discriminationIndex}</span>
                          <div>
                            <span
                              className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
                                q.discriminationCategory === 'baik, soal diterima'
                                  ? 'bg-emerald-100 text-emerald-800'
                                  : q.discriminationCategory === 'cukup baik, soal diperbaiki'
                                  ? 'bg-yellow-100 text-yellow-800'
                                  : 'bg-rose-100 text-rose-800'
                              }`}
                            >
                              {q.discriminationCategory}
                            </span>
                          </div>
                        </div>
                      </td>

                      <td className="px-3 py-3 text-center">
                        <span
                          className={`px-2.5 py-1 rounded-full text-[10px] font-black ${
                            q.recommendation === 'Diterima'
                              ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                              : q.recommendation === 'Revisi Soal'
                              ? 'bg-amber-100 text-amber-800 border border-amber-300'
                              : 'bg-rose-100 text-rose-800 border border-rose-300'
                          }`}
                        >
                          {q.recommendation}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-slate-50 p-4 rounded-2xl border border-slate-200 text-xs">
            <div>
              <h4 className="font-bold text-slate-900 mb-1">Tingkat Kesukaran:</h4>
              <ul className="space-y-1 text-slate-600 text-[11px]">
                <li>• <strong className="text-cyan-800">Soal mudah ($P &gt; 0.70$)</strong>: Soal cenderung gampang dijawab oleh sebagian besar siswa.</li>
                <li>• <strong className="text-blue-800">Soal sedang ($0.30 \le P \le 0.70$)</strong>: Soal ideal dengan tingkat proporsi sedang.</li>
                <li>• <strong className="text-amber-800">Soal sulit ($P &lt; 0.30$)</strong>: Soal sulit yang hanya dijawab benar oleh sedikit siswa.</li>
              </ul>
            </div>
            <div>
              <h4 className="font-bold text-slate-900 mb-1">Daya Pembeda:</h4>
              <ul className="space-y-1 text-slate-600 text-[11px]">
                <li>• <strong className="text-emerald-800">baik, soal diterima ($D \ge 0.40$)</strong>: Sangat mampu membedakan kelompok atas dan bawah.</li>
                <li>• <strong className="text-yellow-800">cukup baik, soal diperbaiki ($0.20 \le D &lt; 0.40$)</strong>: Cukup baik, disarankan sedikit revisi redaksi.</li>
                <li>• <strong className="text-rose-800">kurang, soal perlu direvisi ($D &lt; 0.20$)</strong>: Daya pembeda lemah, perlu direvisi atau diganti.</li>
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 1: PENGATURAN ASESMEN & STRUKTUR SOAL */}
      {showConfigModal && (
        <div className="fixed inset-0 z-50 flex items-start sm:items-center justify-center bg-slate-950/60 backdrop-blur-xs p-2 sm:p-4 md:p-6 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-3xl w-full shadow-2xl border border-slate-200 my-auto flex flex-col max-h-[92vh] overflow-hidden">
            {/* Fixed Modal Header */}
            <div className="p-4 sm:p-6 pb-3 border-b border-slate-100 flex items-center justify-between shrink-0 bg-white">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-xl bg-teal-100 text-teal-800 flex items-center justify-center shrink-0">
                  <Settings className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-extrabold text-slate-900">
                    {isCreatingNew ? 'Buat Data Analisis Asesmen Baru' : 'Pengaturan Asesmen & Struktur Soal'}
                  </h3>
                  <p className="text-xs text-slate-500">
                    {isCreatingNew
                      ? 'Masukkan Judul Asesmen, Mata Pelajaran, KKTP, serta atur Jumlah & Kunci Jawaban Soal.'
                      : 'Atur nama asesmen, threshold KKTP, jumlah soal per jenis, dan kunci jawaban.'}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowConfigModal(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Scrollable Form Body */}
            <form onSubmit={handleSaveConfig} className="flex flex-col flex-1 overflow-hidden">
              <div className="p-4 sm:p-6 overflow-y-auto space-y-5 flex-1">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="sm:col-span-2">
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">Judul Asesmen</label>
                    <input
                      type="text"
                      value={configTitle}
                      onChange={(e) => setConfigTitle(e.target.value)}
                      placeholder="Misal: Sumatif Akhir Semester IPAS"
                      required
                      className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-teal-500 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">Threshold KKTP</label>
                    <input
                      type="number"
                      min={0}
                      max={100}
                      value={configKktp}
                      onChange={(e) => setConfigKktp(Number(e.target.value))}
                      required
                      className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl font-bold text-teal-800 focus:ring-2 focus:ring-teal-500 focus:outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">Mata Pelajaran</label>
                  <select
                    value={configSubject}
                    onChange={(e) => setConfigSubject(e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-teal-500 focus:outline-none bg-white"
                  >
                    {subjects.map((s) => (
                      <option key={s.id} value={s.code}>
                        {s.name} ({s.code})
                      </option>
                    ))}
                  </select>
                </div>

                {/* Form Pengaturan Jumlah Soal & Skor Tiap Butir Soal */}
                <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <Layers className="w-4 h-4 text-teal-700" />
                      <span className="text-xs font-extrabold text-slate-800">
                        Pengaturan Jumlah Soal & Skor Tiap Butir Soal per Jenis Soal
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={handleApplyBatchCounts}
                      className="px-3 py-1.5 bg-teal-700 hover:bg-teal-800 text-white font-extrabold text-xs rounded-xl shadow-xs transition-all flex items-center gap-1.5"
                    >
                      <Check className="w-3.5 h-3.5" />
                      Terapkan Jumlah & Skor Soal
                    </button>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5 pt-1">
                    {QUESTION_TYPES.map((t) => (
                      <div key={t} className="bg-white p-2.5 rounded-xl border border-slate-200 space-y-2 shadow-2xs">
                        <label className="block text-[11px] font-extrabold text-slate-800 truncate" title={t}>
                          {t}
                        </label>

                        <div className="space-y-1.5">
                          <div>
                            <span className="block text-[9px] font-bold text-slate-500 uppercase tracking-wider mb-0.5">
                              Jumlah Soal
                            </span>
                            <input
                              type="number"
                              min={0}
                              max={100}
                              value={batchCounts[t] ?? 0}
                              onChange={(e) =>
                                setBatchCounts({
                                  ...batchCounts,
                                  [t]: Math.max(0, Number(e.target.value)),
                                })
                              }
                              className="w-full px-2 py-1 text-center font-bold text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-500 bg-slate-50/50"
                            />
                          </div>

                          <div>
                            <span className="block text-[9px] font-bold text-slate-500 uppercase tracking-wider mb-0.5">
                              Skor Tiap Butir Soal
                            </span>
                            <input
                              type="number"
                              min={1}
                              max={100}
                              value={batchScores[t] ?? 1}
                              onChange={(e) =>
                                setBatchScores({
                                  ...batchScores,
                                  [t]: Math.max(1, Number(e.target.value)),
                                })
                              }
                              className="w-full px-2 py-1 text-center font-bold text-teal-800 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-500 bg-teal-50/30"
                            />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                  <p className="text-[10px] text-slate-500 italic">
                    * Menekan <strong>"Terapkan Jumlah & Skor Soal"</strong> akan memperbarui struktur butir soal beserta bobot Skor Tiap Butir Soal untuk masing-masing jenis soal.
                  </p>
                </div>

                {/* Form Input Kunci Jawaban Ringkas (Format Cepat) */}
                <div className="bg-gradient-to-r from-amber-50 via-orange-50 to-amber-50/60 border border-amber-200/80 rounded-2xl p-4 space-y-3 shadow-xs">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-lg bg-amber-500 text-white flex items-center justify-center shrink-0 shadow-xs">
                        <KeyRound className="w-4 h-4" />
                      </div>
                      <div>
                        <h4 className="text-xs font-black text-amber-950 uppercase tracking-wide">
                          Input Kunci Jawaban Ringkas (Format Cepat)
                        </h4>
                        <p className="text-[11px] text-amber-800">
                          Isi/tempel seluruh kunci jawaban secara sekaligus dengan format ringkas yang praktis.
                        </p>
                      </div>
                    </div>
                    <span className="px-2.5 py-1 bg-amber-200/70 text-amber-900 text-[10px] font-extrabold rounded-full">
                      Fitur Ringkas
                    </span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-1">
                    {/* Input Pilihan Jamak */}
                    <div className="bg-white p-3 rounded-xl border border-amber-200 space-y-1.5 shadow-2xs">
                      <div className="flex items-center justify-between">
                        <label className="text-[11px] font-bold text-slate-800">
                          Pilihan Jamak ({configQuestions.filter((q) => q.type === 'Pilihan Jamak').length} Soal)
                        </label>
                        <span className="text-[10px] text-teal-700 font-extrabold">per 5 huruf (-)</span>
                      </div>
                      <input
                        type="text"
                        placeholder="Misal: DBBAA-ACABD-CAACA"
                        value={pgKeyInput}
                        onChange={(e) => handlePgCompactChange(e.target.value)}
                        className="w-full px-2.5 py-1.5 text-xs font-mono font-bold uppercase tracking-wider border border-amber-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:outline-none bg-amber-50/30 text-amber-950"
                      />
                      <p className="text-[10px] text-slate-500">
                        Contoh: <code>DBBAA-ACABD-CAACA</code>
                      </p>
                    </div>

                    {/* Input Kompleks */}
                    <div className="bg-white p-3 rounded-xl border border-amber-200 space-y-1.5 shadow-2xs">
                      <div className="flex items-center justify-between">
                        <label className="text-[11px] font-bold text-slate-800">
                          Kompleks ({configQuestions.filter((q) => q.type === 'Kompleks').length} Soal)
                        </label>
                        <span className="text-[10px] text-indigo-700 font-extrabold">pisah koma (,)</span>
                      </div>
                      <input
                        type="text"
                        placeholder="Misal: CB, AD, BC, AC, BC"
                        value={kmpKeyInput}
                        onChange={(e) => handleKmpCompactChange(e.target.value)}
                        className="w-full px-2.5 py-1.5 text-xs font-mono font-bold uppercase tracking-wider border border-amber-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:outline-none bg-amber-50/30 text-amber-950"
                      />
                      <p className="text-[10px] text-slate-500">
                        Contoh: <code>CB, AD, BC, AC, BC</code>
                      </p>
                    </div>

                    {/* Input Menjodohkan */}
                    <div className="bg-white p-3 rounded-xl border border-amber-200 space-y-1.5 shadow-2xs">
                      <div className="flex items-center justify-between">
                        <label className="text-[11px] font-bold text-slate-800">
                          Menjodohkan ({configQuestions.filter((q) => q.type === 'Menjodohkan').length} Soal)
                        </label>
                        <span className="text-[10px] text-emerald-700 font-extrabold">tanpa spasi</span>
                      </div>
                      <input
                        type="text"
                        placeholder="Misal: BDAFC"
                        value={mjdKeyInput}
                        onChange={(e) => handleMjdCompactChange(e.target.value)}
                        className="w-full px-2.5 py-1.5 text-xs font-mono font-bold uppercase tracking-wider border border-amber-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:outline-none bg-amber-50/30 text-amber-950"
                      />
                      <p className="text-[10px] text-slate-500">
                        Contoh: <code>BDAFC</code>
                      </p>
                    </div>
                  </div>
                </div>

                {/* Table Butir Soal & Kunci Jawaban */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <KeyRound className="w-4 h-4 text-slate-700" />
                      <label className="text-xs font-extrabold text-slate-800">
                        Daftar Butir Soal & Kunci Jawaban ({configQuestions.length} Soal)
                      </label>
                    </div>
                    <button
                      type="button"
                      onClick={handleAddQuestionRow}
                      className="text-xs text-teal-700 hover:text-teal-900 font-bold flex items-center gap-1"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      Tambah Manual 1 Soal
                    </button>
                  </div>

                  <div className="max-h-64 overflow-y-auto border border-slate-200 rounded-2xl">
                    <table className="w-full text-xs text-left">
                      <thead className="bg-slate-100 text-slate-700 sticky top-0">
                        <tr>
                          <th className="px-3 py-2 text-center w-10 font-bold">No</th>
                          <th className="px-3 py-2 font-bold min-w-[120px]">Jenis Soal</th>
                          <th className="px-3 py-2 font-bold min-w-[150px]">Kunci Jawaban</th>
                          <th className="px-3 py-2 text-center w-28 font-bold">Skor Maks</th>
                          <th className="px-3 py-2 text-center w-12 font-bold">Aksi</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 bg-white">
                        {configQuestions.map((q, idx) => {
                          const isObjective = ['Pilihan Jamak', 'Kompleks', 'Menjodohkan'].includes(q.type);
                          return (
                            <tr key={idx} className="hover:bg-slate-50">
                              <td className="px-3 py-2 text-center font-bold text-slate-500">{q.number}</td>
                              <td className="px-3 py-2">
                                <select
                                  value={q.type}
                                  onChange={(e) => handleUpdateQuestion(idx, 'type', e.target.value as QuestionType)}
                                  className="w-full px-2 py-1 text-xs border border-slate-300 rounded-lg"
                                >
                                  {QUESTION_TYPES.map((t) => (
                                    <option key={t} value={t}>
                                      {t}
                                    </option>
                                  ))}
                                </select>
                              </td>
                              {/* Column Kunci Jawaban */}
                              <td className="px-3 py-2">
                                {isObjective ? (
                                  <input
                                    type="text"
                                    placeholder={
                                      q.type === 'Pilihan Jamak'
                                        ? 'A/B/C/D'
                                        : q.type === 'Kompleks'
                                        ? 'A,B'
                                        : '1-B,2-A'
                                    }
                                    value={q.answerKey || ''}
                                    onChange={(e) => handleUpdateQuestion(idx, 'answerKey', e.target.value.toUpperCase())}
                                    className="w-full px-2 py-1 text-xs font-bold border border-amber-300 bg-amber-50/50 rounded-lg uppercase focus:ring-2 focus:ring-amber-500"
                                  />
                                ) : (
                                  <span className="inline-block px-2.5 py-1 text-[10px] font-semibold text-slate-400 bg-slate-100 rounded-md">
                                    Koreksi Manual
                                  </span>
                                )}
                              </td>
                              <td className="px-3 py-2 text-center">
                                <input
                                  type="number"
                                  min={1}
                                  max={100}
                                  value={q.maxScore}
                                  onChange={(e) => handleUpdateQuestion(idx, 'maxScore', Number(e.target.value))}
                                  className="w-20 px-2 py-1 text-center font-bold border border-slate-300 rounded-lg"
                                />
                              </td>
                              <td className="px-3 py-2 text-center">
                                <button
                                  type="button"
                                  onClick={() => handleDeleteQuestion(idx)}
                                  className="text-slate-400 hover:text-rose-600 p-1"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
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

              {/* Fixed Modal Footer */}
              <div className="p-4 sm:p-5 border-t border-slate-100 flex items-center justify-end gap-2 shrink-0 bg-slate-50">
                <button
                  type="button"
                  onClick={() => setShowConfigModal(false)}
                  className="px-4 py-2 border border-slate-300 hover:bg-slate-100 text-slate-700 font-bold text-xs rounded-xl transition-colors"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-teal-700 hover:bg-teal-800 text-white font-bold text-xs rounded-xl shadow-sm transition-colors flex items-center gap-1.5"
                >
                  {isCreatingNew ? (
                    <>
                      <Plus className="w-4 h-4" />
                      Buat Analisis Asesmen Baru
                    </>
                  ) : (
                    'Simpan Pengaturan'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL HAPUS CONFIRMATION */}
      {deletingId && (() => {
        const targetRecord = assessmentAnalyses.find((a) => a.id === deletingId);
        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-xs p-4">
            <div className="bg-white rounded-3xl p-6 max-w-md w-full space-y-5 shadow-2xl border border-slate-200">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-rose-100 text-rose-600 flex items-center justify-center shrink-0">
                  <Trash2 className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-base font-extrabold text-slate-900">
                    Hapus Analisis Asesmen?
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Apakah Anda yakin ingin menghapus data analisis asesmen ini?
                  </p>
                </div>
              </div>

              {targetRecord && (
                <div className="p-3.5 bg-rose-50/70 border border-rose-200/80 rounded-2xl text-xs space-y-1">
                  <p className="font-extrabold text-rose-950">{targetRecord.title}</p>
                  <p className="text-rose-700 text-[11px]">
                    Mata Pelajaran: <strong>{targetRecord.subjectCode}</strong> | KKTP: <strong>{targetRecord.kktp}</strong>
                  </p>
                </div>
              )}

              <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setDeletingId(null)}
                  className="px-4 py-2 border border-slate-300 hover:bg-slate-100 text-slate-700 font-bold text-xs rounded-xl transition-colors"
                >
                  Batal
                </button>
                <button
                  type="button"
                  onClick={handleConfirmDelete}
                  className="px-5 py-2 bg-rose-600 hover:bg-rose-700 text-white font-extrabold text-xs rounded-xl shadow-sm transition-colors flex items-center gap-1.5"
                >
                  <Trash2 className="w-4 h-4" />
                  Ya, Hapus Data
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* MODAL 2: IMPORT SPREADSHEET */}
      {showImportModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-3xl p-6 max-w-lg w-full space-y-5 shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-xl bg-indigo-100 text-indigo-800 flex items-center justify-center">
                  <Upload className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-extrabold text-slate-900">
                    Import Jawaban & Skor dari Spreadsheet
                  </h3>
                  <p className="text-xs text-slate-500">
                    Unggah file Excel (.xlsx) atau CSV nilai hasil asesmen siswa
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowImportModal(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 text-xs text-slate-600 space-y-2">
                <p className="font-bold text-slate-800">Petunjuk Format File:</p>
                <ul className="space-y-1 list-disc list-inside text-[11px]">
                  <li>Baris pertama memuat nama kolom: <code>NISN</code>, <code>Nama Siswa</code>, dan kolom soal seperti <code>Q1</code>, <code>Q2</code>... atau <code>Soal 1</code>, <code>Soal 2</code>.</li>
                  <li>Untuk soal Pilihan Jamak, isi cell dengan jawaban huruf (A/B/C/D). Sistem akan mengoreksinya otomatis secara akurat!</li>
                </ul>
                <button
                  type="button"
                  onClick={handleDownloadTemplate}
                  className="mt-2 flex items-center gap-1.5 text-indigo-700 hover:text-indigo-900 font-bold text-xs"
                >
                  <Download className="w-3.5 h-3.5" />
                  Unduh Template Excel Siap Isi
                </button>
              </div>

              <div className="border-2 border-dashed border-slate-300 rounded-2xl p-6 text-center hover:border-indigo-500 transition-colors bg-slate-50/50">
                <Upload className="w-8 h-8 text-indigo-500 mx-auto mb-2" />
                <label className="cursor-pointer">
                  <span className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold px-4 py-2 rounded-xl inline-block shadow-sm">
                    Pilih File Excel / CSV
                  </span>
                  <input
                    type="file"
                    accept=".xlsx, .xls, .csv"
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                </label>
                <p className="text-[11px] text-slate-400 mt-2">Mendukung file .xlsx, .xls, atau .csv</p>
              </div>
            </div>

            <div className="flex justify-end pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setShowImportModal(false)}
                className="px-4 py-2 border border-slate-300 text-slate-700 font-bold text-xs rounded-xl"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 3: UNIT TEST CTT RESULTS */}
      {showTestModal && testResult && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-3xl p-6 max-w-md w-full space-y-4 shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-amber-500" />
                <h3 className="text-base font-extrabold text-slate-900">
                  Hasil Verification CTT Unit Test
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowTestModal(false)}
                className="p-1 text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div
              className={`p-3 rounded-xl border flex items-center gap-2 text-xs font-bold ${
                testResult.passed
                  ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                  : 'bg-rose-50 text-rose-800 border-rose-200'
              }`}
            >
              {testResult.passed ? (
                <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
              ) : (
                <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0" />
              )}
              <span>
                {testResult.passed
                  ? 'Semua kalkulasi CTT (27% Kelompok Atas/Bawah, Indeks P, Indeks D) TERVERIFIKASI AKURAT!'
                  : 'Ditemukan perbedaan dalam pengujian unit test CTT.'}
              </span>
            </div>

            <div className="bg-slate-900 text-slate-200 rounded-xl p-3 font-mono text-[11px] space-y-1 max-h-48 overflow-y-auto">
              {testResult.logs.map((log, idx) => (
                <div key={idx} className={log.startsWith('PASSED') ? 'text-emerald-400' : 'text-rose-400'}>
                  {log}
                </div>
              ))}
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="button"
                onClick={() => setShowTestModal(false)}
                className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
