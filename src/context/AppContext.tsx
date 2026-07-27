import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import {
  User,
  SchoolProfile,
  Student,
  Subject,
  ScheduleItem,
  CalendarEvent,
  AttendanceRecord,
  TeachingJournal,
  HabitRecord,
  GradeRecord,
  RemedialRecord,
  StudentTask,
  DansosRecord,
  SyahriyahJQRecord,
  PaymentCategory,
  PaymentInstallment,
  DonationCategory,
  DonationPayment,
  AssessmentAnalysisRecord,
  Role,
} from '../types';
import {
  initialSchoolProfile,
  initialUsers,
  initialStudents,
  initialSubjects,
  initialSchedules,
  initialCalendarEvents,
  initialTimeAllocations,
  initialAssessmentAnalyses,
} from '../data/initialData';

interface AppContextType {
  currentUser: User | null;
  setCurrentUser: (user: User | null) => void;
  activeRole: Role;
  activeTab: string;
  setActiveTab: (tab: string) => void;
  schoolProfile: SchoolProfile;
  setSchoolProfile: React.Dispatch<React.SetStateAction<SchoolProfile>>;
  users: User[];
  setUsers: React.Dispatch<React.SetStateAction<User[]>>;
  students: Student[];
  setStudents: React.Dispatch<React.SetStateAction<Student[]>>;
  subjects: Subject[];
  setSubjects: React.Dispatch<React.SetStateAction<Subject[]>>;
  schedules: ScheduleItem[];
  setSchedules: React.Dispatch<React.SetStateAction<ScheduleItem[]>>;
  timeAllocations: string[];
  setTimeAllocations: React.Dispatch<React.SetStateAction<string[]>>;
  calendarEvents: CalendarEvent[];
  setCalendarEvents: React.Dispatch<React.SetStateAction<CalendarEvent[]>>;

  attendanceRecords: AttendanceRecord[];
  setAttendanceRecords: React.Dispatch<React.SetStateAction<AttendanceRecord[]>>;
  teachingJournals: TeachingJournal[];
  setTeachingJournals: React.Dispatch<React.SetStateAction<TeachingJournal[]>>;
  habitRecords: HabitRecord[];
  setHabitRecords: React.Dispatch<React.SetStateAction<HabitRecord[]>>;
  gradeRecords: GradeRecord[];
  setGradeRecords: React.Dispatch<React.SetStateAction<GradeRecord[]>>;
  remedialRecords: RemedialRecord[];
  setRemedialRecords: React.Dispatch<React.SetStateAction<RemedialRecord[]>>;
  studentTasks: StudentTask[];
  setStudentTasks: React.Dispatch<React.SetStateAction<StudentTask[]>>;
  dansosRecords: DansosRecord[];
  setDansosRecords: React.Dispatch<React.SetStateAction<DansosRecord[]>>;
  syahriyahJQRecords: SyahriyahJQRecord[];
  setSyahriyahJQRecords: React.Dispatch<React.SetStateAction<SyahriyahJQRecord[]>>;
  paymentCategories: PaymentCategory[];
  setPaymentCategories: React.Dispatch<React.SetStateAction<PaymentCategory[]>>;
  paymentInstallments: PaymentInstallment[];
  setPaymentInstallments: React.Dispatch<React.SetStateAction<PaymentInstallment[]>>;
  donationCategories: DonationCategory[];
  setDonationCategories: React.Dispatch<React.SetStateAction<DonationCategory[]>>;
  donationPayments: DonationPayment[];
  setDonationPayments: React.Dispatch<React.SetStateAction<DonationPayment[]>>;
  assessmentAnalyses: AssessmentAnalysisRecord[];
  setAssessmentAnalyses: React.Dispatch<React.SetStateAction<AssessmentAnalysisRecord[]>>;
  logout: () => void;
  resetAllData: () => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

function loadStorage<T>(key: string, defaultValue: T): T {
  try {
    const saved = localStorage.getItem(key);
    return saved ? JSON.parse(saved) : defaultValue;
  } catch (e) {
    console.error('Error loading localStorage key', key, e);
    return defaultValue;
  }
}

export const AppProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<User | null>(() =>
    loadStorage<User | null>('kagum_currentUser', initialUsers[1]) // Default to Guru Sulis
  );

  const [activeTab, setActiveTab] = useState<string>(() =>
    loadStorage<string>('kagum_activeTab', currentUser?.role === 'admin' ? 'data-madrasah' : 'teacher-dashboard')
  );

  const [schoolProfile, setSchoolProfile] = useState<SchoolProfile>(() =>
    loadStorage<SchoolProfile>('kagum_schoolProfile', initialSchoolProfile)
  );

  const [users, setUsers] = useState<User[]>(() =>
    loadStorage<User[]>('kagum_users', initialUsers)
  );

  const [students, setStudents] = useState<Student[]>(() =>
    loadStorage<Student[]>('kagum_students', initialStudents)
  );

  const [subjects, setSubjects] = useState<Subject[]>(() =>
    loadStorage<Subject[]>('kagum_subjects', initialSubjects)
  );

  const [schedules, setSchedules] = useState<ScheduleItem[]>(() =>
    loadStorage<ScheduleItem[]>('kagum_schedules', initialSchedules)
  );

  const [timeAllocations, setTimeAllocations] = useState<string[]>(() =>
    loadStorage<string[]>('kagum_timeAllocations', initialTimeAllocations)
  );

  const [calendarEvents, setCalendarEvents] = useState<CalendarEvent[]>(() =>
    loadStorage<CalendarEvent[]>('kagum_calendarEvents', initialCalendarEvents)
  );

  const [attendanceRecords, setAttendanceRecords] = useState<AttendanceRecord[]>(() =>
    loadStorage<AttendanceRecord[]>('kagum_attendance', [])
  );

  const [teachingJournals, setTeachingJournals] = useState<TeachingJournal[]>(() =>
    loadStorage<TeachingJournal[]>('kagum_journals', [])
  );

  const [habitRecords, setHabitRecords] = useState<HabitRecord[]>(() =>
    loadStorage<HabitRecord[]>('kagum_habits', [])
  );

  const [gradeRecords, setGradeRecords] = useState<GradeRecord[]>(() =>
    loadStorage<GradeRecord[]>('kagum_grades', [])
  );

  const [remedialRecords, setRemedialRecords] = useState<RemedialRecord[]>(() =>
    loadStorage<RemedialRecord[]>('kagum_remedials', [])
  );

  const [studentTasks, setStudentTasks] = useState<StudentTask[]>(() =>
    loadStorage<StudentTask[]>('kagum_tasks', [])
  );

  const [dansosRecords, setDansosRecords] = useState<DansosRecord[]>(() =>
    loadStorage<DansosRecord[]>('kagum_dansos', [])
  );

  const [syahriyahJQRecords, setSyahriyahJQRecords] = useState<SyahriyahJQRecord[]>(() =>
    loadStorage<SyahriyahJQRecord[]>('kagum_syahriyahJQ', [])
  );

  const [paymentCategories, setPaymentCategories] = useState<PaymentCategory[]>(() =>
    loadStorage<PaymentCategory[]>('kagum_paymentCategories', [
      { id: 'paycat-1', name: 'Seragam Olahraga & Batik', nominal: 350000 },
      { id: 'paycat-2', name: 'LKS & Bahan Ajar Semester Ganjil', nominal: 180000 },
    ])
  );

  const [paymentInstallments, setPaymentInstallments] = useState<PaymentInstallment[]>(() =>
    loadStorage<PaymentInstallment[]>('kagum_paymentInstallments', [])
  );

  const [donationCategories, setDonationCategories] = useState<DonationCategory[]>(() =>
    loadStorage<DonationCategory[]>('kagum_donationCategories', [
      { id: 'doncat-1', name: 'Iuran Kas Kelas 1A', type: 'Iuran', nature: 'Ditentukan', targetNominal: 10000 },
      { id: 'doncat-2', name: 'Sumbangan Pembangunan Musholla', type: 'Sumbangan', nature: 'Seikhlasnya' },
    ])
  );

  const [donationPayments, setDonationPayments] = useState<DonationPayment[]>(() =>
    loadStorage<DonationPayment[]>('kagum_donationPayments', [])
  );

  const [assessmentAnalyses, setAssessmentAnalyses] = useState<AssessmentAnalysisRecord[]>(() =>
    loadStorage<AssessmentAnalysisRecord[]>('kagum_assessmentAnalyses', initialAssessmentAnalyses as AssessmentAnalysisRecord[])
  );

  // Sync state to LocalStorage
  useEffect(() => { localStorage.setItem('kagum_currentUser', JSON.stringify(currentUser)); }, [currentUser]);
  useEffect(() => { localStorage.setItem('kagum_activeTab', JSON.stringify(activeTab)); }, [activeTab]);
  useEffect(() => { localStorage.setItem('kagum_schoolProfile', JSON.stringify(schoolProfile)); }, [schoolProfile]);
  useEffect(() => { localStorage.setItem('kagum_users', JSON.stringify(users)); }, [users]);
  useEffect(() => { localStorage.setItem('kagum_students', JSON.stringify(students)); }, [students]);
  useEffect(() => { localStorage.setItem('kagum_subjects', JSON.stringify(subjects)); }, [subjects]);
  useEffect(() => { localStorage.setItem('kagum_schedules', JSON.stringify(schedules)); }, [schedules]);
  useEffect(() => { localStorage.setItem('kagum_timeAllocations', JSON.stringify(timeAllocations)); }, [timeAllocations]);
  useEffect(() => { localStorage.setItem('kagum_calendarEvents', JSON.stringify(calendarEvents)); }, [calendarEvents]);

  useEffect(() => { localStorage.setItem('kagum_attendance', JSON.stringify(attendanceRecords)); }, [attendanceRecords]);
  useEffect(() => { localStorage.setItem('kagum_journals', JSON.stringify(teachingJournals)); }, [teachingJournals]);
  useEffect(() => { localStorage.setItem('kagum_habits', JSON.stringify(habitRecords)); }, [habitRecords]);
  useEffect(() => { localStorage.setItem('kagum_grades', JSON.stringify(gradeRecords)); }, [gradeRecords]);
  useEffect(() => { localStorage.setItem('kagum_remedials', JSON.stringify(remedialRecords)); }, [remedialRecords]);
  useEffect(() => { localStorage.setItem('kagum_tasks', JSON.stringify(studentTasks)); }, [studentTasks]);
  useEffect(() => { localStorage.setItem('kagum_dansos', JSON.stringify(dansosRecords)); }, [dansosRecords]);
  useEffect(() => { localStorage.setItem('kagum_syahriyahJQ', JSON.stringify(syahriyahJQRecords)); }, [syahriyahJQRecords]);
  useEffect(() => { localStorage.setItem('kagum_paymentCategories', JSON.stringify(paymentCategories)); }, [paymentCategories]);
  useEffect(() => { localStorage.setItem('kagum_paymentInstallments', JSON.stringify(paymentInstallments)); }, [paymentInstallments]);
  useEffect(() => { localStorage.setItem('kagum_donationCategories', JSON.stringify(donationCategories)); }, [donationCategories]);
  useEffect(() => { localStorage.setItem('kagum_donationPayments', JSON.stringify(donationPayments)); }, [donationPayments]);
  useEffect(() => { localStorage.setItem('kagum_assessmentAnalyses', JSON.stringify(assessmentAnalyses)); }, [assessmentAnalyses]);

  const activeRole: Role = currentUser?.role || 'guru';

  const logout = () => {
    setCurrentUser(null);
  };

  const resetAllData = () => {
    localStorage.clear();
    setSchoolProfile(initialSchoolProfile);
    setUsers(initialUsers);
    setStudents(initialStudents);
    setSubjects(initialSubjects);
    setSchedules(initialSchedules);
    setTimeAllocations(initialTimeAllocations);
    setCalendarEvents(initialCalendarEvents);
    setAttendanceRecords([]);
    setTeachingJournals([]);
    setHabitRecords([]);
    setGradeRecords([]);
    setRemedialRecords([]);
    setStudentTasks([]);
    setDansosRecords([]);
    setSyahriyahJQRecords([]);
    setPaymentCategories([]);
    setPaymentInstallments([]);
    setDonationCategories([]);
    setDonationPayments([]);
    setAssessmentAnalyses(initialAssessmentAnalyses as AssessmentAnalysisRecord[]);
    setCurrentUser(initialUsers[1]);
    setActiveTab('guru-dashboard');
  };

  return (
    <AppContext.Provider
      value={{
        currentUser,
        setCurrentUser,
        activeRole,
        activeTab,
        setActiveTab,
        schoolProfile,
        setSchoolProfile,
        users,
        setUsers,
        students,
        setStudents,
        subjects,
        setSubjects,
        schedules,
        setSchedules,
        timeAllocations,
        setTimeAllocations,
        calendarEvents,
        setCalendarEvents,

        attendanceRecords,
        setAttendanceRecords,
        teachingJournals,
        setTeachingJournals,
        habitRecords,
        setHabitRecords,
        gradeRecords,
        setGradeRecords,
        remedialRecords,
        setRemedialRecords,
        studentTasks,
        setStudentTasks,
        dansosRecords,
        setDansosRecords,
        syahriyahJQRecords,
        setSyahriyahJQRecords,
        paymentCategories,
        setPaymentCategories,
        paymentInstallments,
        setPaymentInstallments,
        donationCategories,
        setDonationCategories,
        donationPayments,
        setDonationPayments,
        assessmentAnalyses,
        setAssessmentAnalyses,
        logout,
        resetAllData,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};
