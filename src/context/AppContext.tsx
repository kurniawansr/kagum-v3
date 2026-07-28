import React, { createContext, useContext, useState, useEffect, useRef, ReactNode } from 'react';
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
import { ApiService } from '../services/api';

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
    loadStorage<User | null>('kagum_currentUser', null)
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

  const isDbLoadedRef = useRef(false);

  // Sync with MySQL backend on initial mount
  useEffect(() => {
    let isMounted = true;
    ApiService.fetchAllData()
      .then((data) => {
        if (!isMounted) return;
        if (data) {
          if (data.kagum_schoolProfile) setSchoolProfile(data.kagum_schoolProfile);
          if (data.kagum_users && Array.isArray(data.kagum_users)) setUsers(data.kagum_users);
          if (data.kagum_students && Array.isArray(data.kagum_students)) setStudents(data.kagum_students);
          if (data.kagum_subjects && Array.isArray(data.kagum_subjects)) setSubjects(data.kagum_subjects);
          if (data.kagum_schedules && Array.isArray(data.kagum_schedules)) setSchedules(data.kagum_schedules);
          if (data.kagum_timeAllocations && Array.isArray(data.kagum_timeAllocations)) setTimeAllocations(data.kagum_timeAllocations);
          if (data.kagum_calendarEvents && Array.isArray(data.kagum_calendarEvents)) setCalendarEvents(data.kagum_calendarEvents);

          if (data.kagum_attendance && Array.isArray(data.kagum_attendance)) setAttendanceRecords(data.kagum_attendance);
          if (data.kagum_journals && Array.isArray(data.kagum_journals)) setTeachingJournals(data.kagum_journals);
          if (data.kagum_habits && Array.isArray(data.kagum_habits)) setHabitRecords(data.kagum_habits);
          if (data.kagum_grades && Array.isArray(data.kagum_grades)) setGradeRecords(data.kagum_grades);
          if (data.kagum_remedials && Array.isArray(data.kagum_remedials)) setRemedialRecords(data.kagum_remedials);
          if (data.kagum_tasks && Array.isArray(data.kagum_tasks)) setStudentTasks(data.kagum_tasks);
          if (data.kagum_dansos && Array.isArray(data.kagum_dansos)) setDansosRecords(data.kagum_dansos);
          if (data.kagum_syahriyahJQ && Array.isArray(data.kagum_syahriyahJQ)) setSyahriyahJQRecords(data.kagum_syahriyahJQ);
          if (data.kagum_paymentCategories && Array.isArray(data.kagum_paymentCategories)) setPaymentCategories(data.kagum_paymentCategories);
          if (data.kagum_paymentInstallments && Array.isArray(data.kagum_paymentInstallments)) setPaymentInstallments(data.kagum_paymentInstallments);
          if (data.kagum_donationCategories && Array.isArray(data.kagum_donationCategories)) setDonationCategories(data.kagum_donationCategories);
          if (data.kagum_donationPayments && Array.isArray(data.kagum_donationPayments)) setDonationPayments(data.kagum_donationPayments);
          if (data.kagum_assessmentAnalyses && Array.isArray(data.kagum_assessmentAnalyses)) setAssessmentAnalyses(data.kagum_assessmentAnalyses);
        }
        isDbLoadedRef.current = true;
      })
      .catch(() => {
        isDbLoadedRef.current = true;
      });
    return () => { isMounted = false; };
  }, []);

  // Sync state to LocalStorage and MySQL
  const syncHelper = (key: string, value: any) => {
    localStorage.setItem(key, JSON.stringify(value));
    if (isDbLoadedRef.current) {
      ApiService.saveKey(key, value);
    }
  };

  useEffect(() => { localStorage.setItem('kagum_currentUser', JSON.stringify(currentUser)); }, [currentUser]);
  useEffect(() => { localStorage.setItem('kagum_activeTab', JSON.stringify(activeTab)); }, [activeTab]);
  useEffect(() => { syncHelper('kagum_schoolProfile', schoolProfile); }, [schoolProfile]);
  useEffect(() => { syncHelper('kagum_users', users); }, [users]);
  useEffect(() => { syncHelper('kagum_students', students); }, [students]);
  useEffect(() => { syncHelper('kagum_subjects', subjects); }, [subjects]);
  useEffect(() => { syncHelper('kagum_schedules', schedules); }, [schedules]);
  useEffect(() => { syncHelper('kagum_timeAllocations', timeAllocations); }, [timeAllocations]);
  useEffect(() => { syncHelper('kagum_calendarEvents', calendarEvents); }, [calendarEvents]);

  useEffect(() => { syncHelper('kagum_attendance', attendanceRecords); }, [attendanceRecords]);
  useEffect(() => { syncHelper('kagum_journals', teachingJournals); }, [teachingJournals]);
  useEffect(() => { syncHelper('kagum_habits', habitRecords); }, [habitRecords]);
  useEffect(() => { syncHelper('kagum_grades', gradeRecords); }, [gradeRecords]);
  useEffect(() => { syncHelper('kagum_remedials', remedialRecords); }, [remedialRecords]);
  useEffect(() => { syncHelper('kagum_tasks', studentTasks); }, [studentTasks]);
  useEffect(() => { syncHelper('kagum_dansos', dansosRecords); }, [dansosRecords]);
  useEffect(() => { syncHelper('kagum_syahriyahJQ', syahriyahJQRecords); }, [syahriyahJQRecords]);
  useEffect(() => { syncHelper('kagum_paymentCategories', paymentCategories); }, [paymentCategories]);
  useEffect(() => { syncHelper('kagum_paymentInstallments', paymentInstallments); }, [paymentInstallments]);
  useEffect(() => { syncHelper('kagum_donationCategories', donationCategories); }, [donationCategories]);
  useEffect(() => { syncHelper('kagum_donationPayments', donationPayments); }, [donationPayments]);
  useEffect(() => { syncHelper('kagum_assessmentAnalyses', assessmentAnalyses); }, [assessmentAnalyses]);

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
