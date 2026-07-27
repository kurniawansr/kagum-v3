export type Role = 'admin' | 'guru';

export interface User {
  id: string;
  name: string;
  nip: string;
  kelas: string;
  email: string;
  password: string;
  role: Role;
  avatarUrl?: string;
  gender?: 'Laki-laki' | 'Perempuan';
  birthPlace?: string;
  birthDate?: string;
}

export interface KopLaporan {
  line1: string;
  line2: string;
  line3: string;
  line4: string;
  line5: string;
  line6?: string;
}

export interface SchoolProfile {
  namaMadrasah: string;
  alamatMadrasah: string;
  namaKepala: string;
  nipKepala: string;
  tahunAjaran: string; // e.g. "2026/2027"
  semester: 'Ganjil' | 'Genap';
  logoUrl: string;
  kopLaporan: KopLaporan;
}

export interface CalendarEvent {
  id: string;
  date: string; // YYYY-MM-DD
  endDate?: string; // YYYY-MM-DD (optional end date)
  type: 'libur' | 'agenda' | 'kegiatan';
  title: string;
  description?: string;
}

export interface Student {
  id: string;
  nisn: string;
  name: string;
  birthPlace: string;
  birthDate: string; // YYYY-MM-DD
  address: string;
  fatherName: string;
  motherName: string;
  parentWa: string; // e.g., "628123456789"
  kelas: string;
}

export interface Subject {
  id: string;
  code: string;
  name: string;
  lingkupMateriCount: number; // Jumlah LM
  sumatifWeight: number; // Bobot Sumatif
  sasWeight: number; // Bobot SAS
  kktp: number; // KKTP threshold (e.g. 75)
}

export interface ScheduleItem {
  id: string;
  day: 'Senin' | 'Selasa' | 'Rabu' | 'Kamis' | 'Jumat' | 'Sabtu';
  timeSlot: string; // e.g. "07.00 – 08.00"
  subjectCode: string;
  activityName?: string;
  kelas: string;
}

export interface AttendanceRecord {
  id: string;
  date: string; // YYYY-MM-DD
  studentId: string;
  status: 'Hadir' | 'Sakit' | 'Izin' | 'Alfa';
  kelas: string;
}

export interface TeachingJournal {
  id: string;
  date: string; // YYYY-MM-DD
  timeSlot: string;
  subjectCode: string;
  activityName?: string;
  material?: string;
  topic?: string;
  studentAttendanceInfo?: string;
  attendanceSummary?: string;
  notes: string;
  kelas: string;
}

export interface HabitRecord {
  id: string;
  studentId: string;
  date: string; // YYYY-MM-DD
  wakeUpEarly?: boolean;
  bangunPagi?: boolean;
  prayers?: { subuh: boolean; dhuhur: boolean; ashar: boolean; maghrib: boolean; isya: boolean };
  beribadah?: ('Subuh' | 'Dhuhur' | 'Ashar' | 'Maghrib' | 'Isya')[];
  exercise?: boolean;
  berolahraga?: boolean;
  healthyMeals?: { pagi: boolean; siang: boolean; malam: boolean };
  makanSehat?: ('Pagi' | 'Siang' | 'Malam')[];
  loveLearning?: boolean;
  gemarBelajar?: boolean;
  socializing?: boolean;
  bermasyarakat?: boolean;
  sleepEarly?: boolean;
  tidurCepat?: boolean;
}

export type AssessmentCategory = 'formatif' | 'sumatif_ah' | 'sumatif' | 'sas';

export interface GradeRecord {
  id: string;
  studentId: string;
  subjectCode: string;
  category?: AssessmentCategory;
  type?: string;
  lmNumber?: number;
  tpNumber?: number;
  ahNumber?: number;
  lmIndex?: number;
  tpIndex?: number;
  score: number;
}

export interface RemedialRecord {
  id: string;
  studentId: string;
  subjectCode: string;
  ahNumber?: number;
  lmIndex?: number;
  initialScore?: number;
  originalScore?: number;
  remedialScore?: number;
  status?: 'Pending' | 'Selesai';
  notes?: string;
  date?: string;
}

export interface StudentTask {
  id: string;
  date: string;
  subjectCode: string;
  lingkupMateriNumber?: number;
  tpNumber?: number;
  lmIndex?: number;
  tpIndex?: number;
  nature: 'Mandiri' | 'Kelompok';
  type: 'Praktik' | 'Portofolio' | 'Proyek';
  completionDays: number;
  instructions: string;
  kelas: string;
}

export interface DansosRecord {
  id: string;
  studentId: string;
  date: string; // YYYY-MM-DD
  amount: number;
}

export interface SyahriyahJQRecord {
  id: string;
  studentId: string;
  monthIndex: number; // 0..11 for 12 months
  year?: string;
  paymentDate?: string;
  datePaid?: string;
  amount: number;
}

export interface PaymentCategory {
  id: string;
  name: string;
  totalAmount?: number;
  nominal?: number;
}

export interface PaymentInstallment {
  id: string;
  categoryId: string;
  studentId: string;
  date: string;
  amount: number;
}

export interface DonationCategory {
  id: string;
  name: string;
  type: 'Iuran' | 'Sumbangan';
  nature: 'Seikhlasnya' | 'Ditentukan';
  targetNominal?: number;
}

export interface DonationPayment {
  id: string;
  categoryId: string;
  studentId: string;
  date: string;
  amount: number;
}

export type QuestionType = 'Pilihan Jamak' | 'Kompleks' | 'Menjodohkan' | 'Isian' | 'Uraian';

export interface QuestionItem {
  number: number;
  type: QuestionType;
  maxScore: number;
  answerKey?: string; // Optional answer key for auto-grading object choices (e.g. 'A', 'B', '1-A,2-B')
}

export interface AssessmentConfig {
  id: string;
  title: string;
  subjectCode: string;
  kelas: string;
  kktp: number; // e.g. 75
  questions: QuestionItem[];
}

export interface StudentItemScores {
  studentId: string;
  scores: Record<number, number>; // question number -> score achieved
  studentAnswers?: Record<number, string>; // question number -> student answer option/text
}

export interface AssessmentAnalysisRecord {
  id: string;
  title: string;
  subjectCode: string;
  kelas: string;
  kktp: number;
  questions: QuestionItem[];
  studentScores: StudentItemScores[];
  updatedAt: string;
}

// Aliases for View Imports
export type LessonSchedule = ScheduleItem;
export type CharacterHabitRecord = HabitRecord;
export type StudentAssignment = StudentTask;
export type StudentInstallment = PaymentInstallment;
export type ContributionRecord = DonationPayment;
