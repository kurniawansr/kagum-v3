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
  SystemNotification,
  UserActivityLog,
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
  initialNotifications,
  initialActivityLogs,
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

  systemNotifications: SystemNotification[];
  setSystemNotifications: React.Dispatch<React.SetStateAction<SystemNotification[]>>;
  addNotification: (notif: Omit<SystemNotification, 'id' | 'timestamp' | 'isRead'>) => void;
  markNotificationAsRead: (id: string) => void;
  markAllNotificationsAsRead: () => void;
  deleteNotification: (id: string) => void;
  clearNotifications: () => void;

  userActivityLogs: UserActivityLog[];
  setUserActivityLogs: React.Dispatch<React.SetStateAction<UserActivityLog[]>>;
  logActivity: (action: string, details: string, module: string, status?: 'Sukses' | 'Gagal' | 'Peringatan') => void;
  clearActivityLogs: () => void;

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
    loadStorage<string>('kagum_activeTab', currentUser?.role === 'admin' ? 'admin-dashboard' : 'teacher-dashboard')
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

  const [systemNotifications, setSystemNotifications] = useState<SystemNotification[]>(() =>
    loadStorage<SystemNotification[]>('kagum_notifications', initialNotifications)
  );

  const [userActivityLogs, setUserActivityLogs] = useState<UserActivityLog[]>(() =>
    loadStorage<UserActivityLog[]>('kagum_activityLogs', initialActivityLogs)
  );

  const isDbLoadedRef = useRef(false);

  // Helper to add notification
  const addNotification = (notif: Omit<SystemNotification, 'id' | 'timestamp' | 'isRead'>) => {
    const now = new Date();
    const formatted = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
    const newNotif: SystemNotification = {
      ...notif,
      id: `notif-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      timestamp: formatted,
      isRead: false,
    };
    setSystemNotifications((prev) => [newNotif, ...prev]);
  };

  const markNotificationAsRead = (id: string) => {
    setSystemNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, isRead: true } : n))
    );
  };

  const markAllNotificationsAsRead = () => {
    setSystemNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
  };

  const deleteNotification = (id: string) => {
    setSystemNotifications((prev) => prev.filter((n) => n.id !== id));
  };

  const clearNotifications = () => {
    setSystemNotifications([]);
  };

  // Helper to log user activity
  const logActivity = (action: string, details: string, moduleName: string, status: 'Sukses' | 'Gagal' | 'Peringatan' = 'Sukses') => {
    const now = new Date();
    const formatted = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')}`;
    const newLog: UserActivityLog = {
      id: `log-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      timestamp: formatted,
      userId: currentUser?.id || 'guest',
      userName: currentUser?.name || 'Pengguna Publik',
      userRole: currentUser?.role || 'guru',
      userClass: currentUser?.kelas || '-',
      action,
      details,
      module: moduleName,
      status,
      ipAddress: '127.0.0.1',
    };
    setUserActivityLogs((prev) => [newLog, ...prev.slice(0, 499)]); // Keep last 500 logs
  };

  const clearActivityLogs = () => {
    setUserActivityLogs([]);
  };

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
          if (data.kagum_notifications && Array.isArray(data.kagum_notifications)) setSystemNotifications(data.kagum_notifications);
          if (data.kagum_activityLogs && Array.isArray(data.kagum_activityLogs)) setUserActivityLogs(data.kagum_activityLogs);
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
  useEffect(() => { syncHelper('kagum_notifications', systemNotifications); }, [systemNotifications]);
  useEffect(() => { syncHelper('kagum_activityLogs', userActivityLogs); }, [userActivityLogs]);

  const activeRole: Role = currentUser?.role || 'guru';

  const logout = () => {
    if (currentUser) {
      logActivity('Logout', `User ${currentUser.name} keluar dari sistem`, 'Auth', 'Sukses');
    }
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
    setSystemNotifications(initialNotifications);
    setUserActivityLogs(initialActivityLogs);
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
        systemNotifications,
        setSystemNotifications,
        addNotification,
        markNotificationAsRead,
        markAllNotificationsAsRead,
        deleteNotification,
        clearNotifications,
        userActivityLogs,
        setUserActivityLogs,
        logActivity,
        clearActivityLogs,
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
