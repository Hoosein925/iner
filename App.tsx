import React, { useState, useEffect, useCallback, Suspense, useRef } from 'react';
import { Department, StaffMember, View, SkillCategory, Assessment, Hospital, AppScreen, NamedChecklistTemplate, ExamTemplate, ExamSubmission, LoggedInUser, UserRole, TrainingMaterial, MonthlyTraining, NewsBanner, MonthlyWorkLog, Patient, ChatMessage, AdminMessage, NeedsAssessmentTopic, MonthlyNeedsAssessment, CustomCorrectiveAction } from './types';
import LoadingSpinner from './components/LoadingSpinner';
import AboutModal from './components/AboutModal';
import LoginModal from './components/LoginModal';
import { SaveIcon } from './components/icons/SaveIcon';
import { UploadIcon } from './components/icons/UploadIcon';
import { InfoIcon } from './components/icons/InfoIcon';
import { LogoutIcon } from './components/icons/LogoutIcon';
import * as db from './services/db';
import Footer from './components/Footer';

import WelcomeScreen from './components/WelcomeScreen';
import HospitalList from './components/HospitalList';
import DepartmentList from './components/DepartmentList';
import DepartmentView from './components/DepartmentView';
import StaffMemberView from './components/StaffMemberView';
import ChecklistManager from './components/ChecklistManager';
import ExamManager from './components/ExamManager';
import TrainingManager from './components/TrainingManager';
import AccreditationManager from './components/AccreditationManager';
import NewsBannerManager from './components/NewsBannerManager';
import PatientEducationManager from './components/PatientEducationManager';
import PatientPortalView from './components/PatientPortalView';
import AdminCommunicationView from './components/AdminCommunicationView';
import HospitalCommunicationView from './components/HospitalCommunicationView';
import NeedsAssessmentManager from './components/NeedsAssessmentManager';
import CorrectiveActionsView from './components/CorrectiveActionsView';

// Type for file data passed from components to App
interface FileUploadData {
    name: string;
    type: string;
    dataUrl: string;
    description?: string;
}

const getCurrentJalaliYear = () => {
    try {
        return parseInt(new Date().toLocaleDateString('fa-IR-u-nu-latn').split('/')[0], 10);
    } catch {
        return new Date().getFullYear() - 621;
    }
};

const ACTIVE_YEAR_KEY = 'app_active_year';
const SESSION_USER_KEY = 'hospital_app_logged_in_user';
const NAV_STATE_KEY = 'hospital_app_nav_state';

interface NavigationState {
  appScreen: AppScreen;
  currentView: View;
  selectedHospitalId: string | null;
  selectedDepartmentId: string | null;
  selectedStaffId: string | null;
  depth?: number;
}

const getBackState = (state: NavigationState, user: LoggedInUser | null): NavigationState | null => {
  if (!user) return null;

  // 1. StaffMemberView
  if (state.currentView === View.StaffMemberView) {
    if (user.role === UserRole.Staff) return null;
    return {
      appScreen: AppScreen.MainApp,
      currentView: View.DepartmentView,
      selectedHospitalId: state.selectedHospitalId,
      selectedDepartmentId: state.selectedDepartmentId,
      selectedStaffId: null,
    };
  }

  // 2. Department-level sub-views
  if ([
    View.ChecklistManager,
    View.ExamManager,
    View.TrainingManager,
    View.PatientEducationManager,
  ].includes(state.currentView)) {
    return {
      appScreen: AppScreen.MainApp,
      currentView: View.DepartmentView,
      selectedHospitalId: state.selectedHospitalId,
      selectedDepartmentId: state.selectedDepartmentId,
      selectedStaffId: null,
    };
  }

  // 3. CorrectiveActions
  if (state.currentView === View.CorrectiveActions) {
    if (user.role === UserRole.Manager) {
      return {
        appScreen: AppScreen.MainApp,
        currentView: View.DepartmentView,
        selectedHospitalId: state.selectedHospitalId,
        selectedDepartmentId: user.departmentId || state.selectedDepartmentId,
        selectedStaffId: null,
      };
    }
    if (state.selectedDepartmentId) {
      return {
        appScreen: AppScreen.MainApp,
        currentView: View.DepartmentView,
        selectedHospitalId: state.selectedHospitalId,
        selectedDepartmentId: state.selectedDepartmentId,
        selectedStaffId: null,
      };
    }
    return {
      appScreen: AppScreen.MainApp,
      currentView: View.DepartmentList,
      selectedHospitalId: state.selectedHospitalId,
      selectedDepartmentId: null,
      selectedStaffId: null,
    };
  }

  // 4. DepartmentView
  if (state.currentView === View.DepartmentView) {
    if (user.role === UserRole.Manager) return null;
    return {
      appScreen: AppScreen.MainApp,
      currentView: View.DepartmentList,
      selectedHospitalId: state.selectedHospitalId,
      selectedDepartmentId: null,
      selectedStaffId: null,
    };
  }

  // 5. Hospital-level sub-views
  if ([
    View.AccreditationManager,
    View.NewsBannerManager,
    View.HospitalCommunication,
    View.NeedsAssessmentManager,
  ].includes(state.currentView)) {
    return {
      appScreen: AppScreen.MainApp,
      currentView: View.DepartmentList,
      selectedHospitalId: state.selectedHospitalId,
      selectedDepartmentId: null,
      selectedStaffId: null,
    };
  }

  // 6. AdminCommunication
  if (state.currentView === View.AdminCommunication) {
    return {
      appScreen: AppScreen.HospitalList,
      currentView: View.DepartmentList,
      selectedHospitalId: null,
      selectedDepartmentId: null,
      selectedStaffId: null,
    };
  }

  // 7. DepartmentList
  if (state.currentView === View.DepartmentList) {
    if (user.role === UserRole.Admin && state.appScreen === AppScreen.MainApp) {
      return {
        appScreen: AppScreen.HospitalList,
        currentView: View.DepartmentList,
        selectedHospitalId: null,
        selectedDepartmentId: null,
        selectedStaffId: null,
      };
    }
    return null;
  }

  // 8. HospitalList
  if (state.appScreen === AppScreen.HospitalList) {
    return null;
  }

  return null;
};

const buildAncestryChain = (current: NavigationState, user: LoggedInUser | null): NavigationState[] => {
  if (!user || current.appScreen === AppScreen.Welcome) {
    return [{ ...current, depth: 0 }];
  }
  const chain: NavigationState[] = [current];
  const visited = new Set<string>();
  visited.add(`${current.appScreen}-${current.currentView}-${current.selectedHospitalId}-${current.selectedDepartmentId}-${current.selectedStaffId}`);

  let prev = getBackState(current, user);
  while (prev) {
    const key = `${prev.appScreen}-${prev.currentView}-${prev.selectedHospitalId}-${prev.selectedDepartmentId}-${prev.selectedStaffId}`;
    if (visited.has(key)) break;
    visited.add(key);
    chain.unshift(prev);
    prev = getBackState(prev, user);
  }

  return chain.map((item, idx) => ({ ...item, depth: idx }));
};

const getInitialSession = (): { user: LoggedInUser | null; nav: NavigationState } => {
  let user: LoggedInUser | null = null;
  try {
    const userStr = localStorage.getItem(SESSION_USER_KEY);
    if (userStr) {
      user = JSON.parse(userStr);
    }
  } catch (e) {
    console.error("Could not parse user session from localStorage", e);
  }

  if (!user) {
    return {
      user: null,
      nav: {
        appScreen: AppScreen.Welcome,
        currentView: View.DepartmentList,
        selectedHospitalId: null,
        selectedDepartmentId: null,
        selectedStaffId: null,
        depth: 0,
      }
    };
  }

  try {
    const navStr = localStorage.getItem(NAV_STATE_KEY);
    if (navStr) {
      const parsed = JSON.parse(navStr);
      if (parsed && typeof parsed.appScreen === 'number' && parsed.appScreen !== AppScreen.Welcome) {
        return {
          user,
          nav: {
            appScreen: parsed.appScreen,
            currentView: typeof parsed.currentView === 'number' ? parsed.currentView : View.DepartmentList,
            selectedHospitalId: parsed.selectedHospitalId ?? (user.hospitalId || null),
            selectedDepartmentId: parsed.selectedDepartmentId ?? (user.departmentId || null),
            selectedStaffId: parsed.selectedStaffId ?? (user.staffId || null),
            depth: typeof parsed.depth === 'number' ? parsed.depth : 0,
          }
        };
      }
    }
  } catch (e) {
    console.error("Could not parse nav state from localStorage", e);
  }

  switch (user.role) {
    case UserRole.Admin:
      return {
        user,
        nav: {
          appScreen: AppScreen.HospitalList,
          currentView: View.DepartmentList,
          selectedHospitalId: null,
          selectedDepartmentId: null,
          selectedStaffId: null,
          depth: 0,
        }
      };
    case UserRole.Supervisor:
      return {
        user,
        nav: {
          appScreen: AppScreen.MainApp,
          currentView: View.DepartmentList,
          selectedHospitalId: user.hospitalId || null,
          selectedDepartmentId: null,
          selectedStaffId: null,
          depth: 0,
        }
      };
    case UserRole.Manager:
      return {
        user,
        nav: {
          appScreen: AppScreen.MainApp,
          currentView: View.DepartmentView,
          selectedHospitalId: user.hospitalId || null,
          selectedDepartmentId: user.departmentId || null,
          selectedStaffId: null,
          depth: 0,
        }
      };
    case UserRole.Staff:
      return {
        user,
        nav: {
          appScreen: AppScreen.MainApp,
          currentView: View.StaffMemberView,
          selectedHospitalId: user.hospitalId || null,
          selectedDepartmentId: user.departmentId || null,
          selectedStaffId: user.staffId || null,
          depth: 0,
        }
      };
    case UserRole.Patient:
      return {
        user,
        nav: {
          appScreen: AppScreen.MainApp,
          currentView: View.PatientPortal,
          selectedHospitalId: user.hospitalId || null,
          selectedDepartmentId: user.departmentId || null,
          selectedStaffId: null,
          depth: 0,
        }
      };
    default:
      return {
        user,
        nav: {
          appScreen: AppScreen.Welcome,
          currentView: View.DepartmentList,
          selectedHospitalId: null,
          selectedDepartmentId: null,
          selectedStaffId: null,
          depth: 0,
        }
      };
  }
};

const getInitialActiveYear = (): number => {
    try {
        const storedYear = localStorage.getItem(ACTIVE_YEAR_KEY);
        if (storedYear) {
            const year = parseInt(storedYear, 10);
            if (!isNaN(year)) {
                return year;
            }
        }
    } catch (e) {
        console.error("Could not read active year from localStorage", e);
    }
    return getCurrentJalaliYear();
};


const App: React.FC = () => {
  const [hospitals, setHospitals] = useState<Hospital[]>(() => db.getHospitalsFromLocal());
  const [isLoading, setIsLoading] = useState<boolean>(() => db.getHospitalsFromLocal().length === 0);
  
  const initialSession = getInitialSession();
  const [loggedInUser, setLoggedInUser] = useState<LoggedInUser | null>(initialSession.user);
  const [appScreen, setAppScreen] = useState<AppScreen>(initialSession.nav.appScreen);
  const [currentView, setCurrentView] = useState<View>(initialSession.nav.currentView);
  const [selectedHospitalId, setSelectedHospitalId] = useState<string | null>(initialSession.nav.selectedHospitalId);
  const [selectedDepartmentId, setSelectedDepartmentId] = useState<string | null>(initialSession.nav.selectedDepartmentId);
  const [selectedStaffId, setSelectedStaffId] = useState<string | null>(initialSession.nav.selectedStaffId);
  
  const [isAboutModalOpen, setIsAboutModalOpen] = useState(false);
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [activeYear, setActiveYear] = useState<number>(getInitialActiveYear());

  useEffect(() => {
    try {
        localStorage.setItem(ACTIVE_YEAR_KEY, String(activeYear));
    } catch (e) {
        console.error("Could not save active year to localStorage", e);
    }
  }, [activeYear]);

  // Keep references for popstate event listener
  const appScreenRef = useRef(appScreen);
  const currentViewRef = useRef(currentView);
  const selectedHospitalIdRef = useRef(selectedHospitalId);
  const selectedDepartmentIdRef = useRef(selectedDepartmentId);
  const selectedStaffIdRef = useRef(selectedStaffId);
  const loggedInUserRef = useRef(loggedInUser);
  const isAboutModalOpenRef = useRef(isAboutModalOpen);
  const isLoginModalOpenRef = useRef(isLoginModalOpen);
  const isProgrammaticBackRef = useRef(false);

  useEffect(() => {
    appScreenRef.current = appScreen;
    currentViewRef.current = currentView;
    selectedHospitalIdRef.current = selectedHospitalId;
    selectedDepartmentIdRef.current = selectedDepartmentId;
    selectedStaffIdRef.current = selectedStaffId;
    loggedInUserRef.current = loggedInUser;
    isAboutModalOpenRef.current = isAboutModalOpen;
    isLoginModalOpenRef.current = isLoginModalOpen;
  });

  // Synchronize active session and navigation state with localStorage
  useEffect(() => {
    try {
      if (loggedInUser) {
        localStorage.setItem(SESSION_USER_KEY, JSON.stringify(loggedInUser));
        if (appScreen !== AppScreen.Welcome) {
          const navData: NavigationState = {
            appScreen,
            currentView,
            selectedHospitalId,
            selectedDepartmentId,
            selectedStaffId,
            depth: window.history.state?.depth ?? 0,
          };
          localStorage.setItem(NAV_STATE_KEY, JSON.stringify(navData));
        }
      } else {
        localStorage.removeItem(SESSION_USER_KEY);
        localStorage.removeItem(NAV_STATE_KEY);
      }
    } catch (e) {
      console.error("Could not sync session to localStorage", e);
    }
  }, [loggedInUser, appScreen, currentView, selectedHospitalId, selectedDepartmentId, selectedStaffId]);

  // Phone back button and browser history listener
  useEffect(() => {
    const currentUser = loggedInUserRef.current;
    const currentNav: NavigationState = {
      appScreen: appScreenRef.current,
      currentView: currentViewRef.current,
      selectedHospitalId: selectedHospitalIdRef.current,
      selectedDepartmentId: selectedDepartmentIdRef.current,
      selectedStaffId: selectedStaffIdRef.current,
    };

    // If reloading onto a nested page, construct browser history ancestry chain
    if (!window.history.state || typeof window.history.state.depth !== 'number') {
      const chain = buildAncestryChain(currentNav, currentUser);
      if (chain.length > 0) {
        try {
          window.history.replaceState(chain[0], '');
          for (let i = 1; i < chain.length; i++) {
            window.history.pushState(chain[i], '');
          }
        } catch (e) {
          console.warn("Could not set up history chain", e);
        }
      }
    }

    const handlePopState = (event: PopStateEvent) => {
      // If back was triggered by in-app button, the state transition was already executed
      if (isProgrammaticBackRef.current) {
        return;
      }

      // 1. Close modals first if open
      if (isAboutModalOpenRef.current) {
        setIsAboutModalOpen(false);
        return;
      }
      if (isLoginModalOpenRef.current) {
        setIsLoginModalOpen(false);
        return;
      }

      const state = event.state as NavigationState | null;
      if (state && typeof state.appScreen === 'number') {
        setAppScreen(state.appScreen);
        setCurrentView(state.currentView ?? View.DepartmentList);
        setSelectedHospitalId(state.selectedHospitalId ?? null);
        setSelectedDepartmentId(state.selectedDepartmentId ?? null);
        setSelectedStaffId(state.selectedStaffId ?? null);
      } else {
        // Fallback: calculate deterministic previous state
        const curr: NavigationState = {
          appScreen: appScreenRef.current,
          currentView: currentViewRef.current,
          selectedHospitalId: selectedHospitalIdRef.current,
          selectedDepartmentId: selectedDepartmentIdRef.current,
          selectedStaffId: selectedStaffIdRef.current,
        };
        const prev = getBackState(curr, loggedInUserRef.current);
        if (prev) {
          setAppScreen(prev.appScreen);
          setCurrentView(prev.currentView);
          setSelectedHospitalId(prev.selectedHospitalId);
          setSelectedDepartmentId(prev.selectedDepartmentId);
          setSelectedStaffId(prev.selectedStaffId);
          try {
            window.history.replaceState(prev, '');
          } catch (e) {}
        }
      }
    };

    window.addEventListener('popstate', handlePopState);
    return () => {
      window.removeEventListener('popstate', handlePopState);
    };
  }, []);

  const lastDataJsonRef = useRef<string>(JSON.stringify(db.getHospitalsFromLocal()));

  const refreshData = useCallback(async (showLoading = false) => {
      if (showLoading) setIsLoading(true);
      try {
          const data = await db.syncAndAssembleData();
          const jsonStr = JSON.stringify(data);
          if (jsonStr !== lastDataJsonRef.current) {
              lastDataJsonRef.current = jsonStr;
              setHospitals(data);
          }
      } catch (err) {
          console.warn("Sync warning:", err);
      } finally {
          if (showLoading) setIsLoading(false);
      }
  }, []);

  useEffect(() => {
    let isCancelled = false;
    let timerId: ReturnType<typeof setTimeout> | null = null;
    let isSyncing = false;

    const performSyncCycle = async () => {
      if (isCancelled || isSyncing) return;
      // Skip if a write/save is currently occurring to protect active user changes
      if (db.isWriting()) return;

      isSyncing = true;
      try {
        const data = await db.syncAndAssembleData();
        if (!isCancelled && !db.isWriting()) {
          const jsonStr = JSON.stringify(data);
          // Only trigger state update if data actually changed (prevents unnecessary re-renders)
          if (jsonStr !== lastDataJsonRef.current) {
            lastDataJsonRef.current = jsonStr;
            setHospitals(data);
          }
        }
      } catch (e) {
        // Silent error handling: network blips will not disrupt user experience
      } finally {
        isSyncing = false;
        setIsLoading(false);
      }
    };

    // Initial background sync
    performSyncCycle();

    // 1-second auto-reload cycle without blocking user input or causing UI lag
    const scheduleNext = () => {
      if (isCancelled) return;
      timerId = setTimeout(async () => {
        if (typeof document === 'undefined' || !document.hidden) {
          await performSyncCycle();
        }
        scheduleNext();
      }, 1000);
    };

    scheduleNext();

    // Real-time remote change listener
    const unsubscribe = db.onRemoteChange(() => {
      performSyncCycle();
    });

    return () => {
      isCancelled = true;
      if (timerId) clearTimeout(timerId);
      unsubscribe();
    };
  }, []);

  const getAvailableYears = (allHospitals: Hospital[]): number[] => {
    const years = new Set<number>([getCurrentJalaliYear()]);
    allHospitals.forEach(h => {
        h.departments.forEach(d => {
            d.staff.forEach(s => {
                s.assessments.forEach(a => { if (a.year) years.add(a.year) });
                s.workLogs?.forEach(wl => { if (wl.year) years.add(wl.year) });
            });
        });
        h.needsAssessments?.forEach(na => { if (na.year) years.add(na.year) });
    });
    return Array.from(years).sort((a, b) => b - a);
  };
  
  const allAvailableYears = getAvailableYears(hospitals);

  const findHospital = (hospitalId: string | null) => hospitals.find(h => h.id === hospitalId);
  const findDepartment = (hospital: Hospital | undefined, departmentId: string | null) => hospital?.departments.find(d => d.id === departmentId);
  const findStaffMember = (department: Department | undefined, staffId: string | null) => department?.staff.find(s => s.id === staffId);

  // --- Handlers using the new DB service ---
  
  const handleAddHospital = async (name: string, province: string, city: string, supervisorName: string, supervisorNationalId: string, supervisorPassword: string) => {
    const newHospital: Hospital = {
      id: Date.now().toString(), name, province, city, supervisorName, supervisorNationalId, supervisorPassword,
      departments: [],
    };
    const { error } = await db.upsertHospital(newHospital);
    if (error) alert(`خطا در ذخیره ابری: ${error.message}`);
    refreshData();
  };

  const handleAddDepartment = async (name: string, managerName: string, managerNationalId: string, managerPassword: string, staffCount: number, bedCount: number) => {
    if (!selectedHospitalId) return;
    const newDepartment: Department = { id: Date.now().toString(), name, managerName, managerNationalId, managerPassword, staffCount, bedCount, staff: [] };
    const { error } = await db.upsertDepartment(newDepartment, selectedHospitalId);
    if (error) alert(`خطا در ذخیره ابری: ${error.message}`);
    refreshData();
  };
  
  const handleAddStaff = async (departmentId: string, name: string, title: string, nationalId: string, password?: string) => {
    const newStaff: StaffMember = { id: Date.now().toString(), name, title, nationalId, password, assessments: [] };
    const { error } = await db.upsertStaff(newStaff, departmentId);
    if (error) alert(`خطا در ذخیره ابری: ${error.message}`);
    refreshData();
  };

  const handleAddOrUpdateAssessment = async (departmentId: string, staffId: string, month: string, year: number, skills: SkillCategory[], template?: Partial<NamedChecklistTemplate>) => {
      const staff = findStaffMember(findDepartment(findHospital(selectedHospitalId), departmentId), staffId);
      if (staff) {
          const existingAssessment = staff.assessments.find(a => a.month === month && a.year === year);
          const newAssessment: Assessment = {
              id: existingAssessment?.id || Date.now().toString(),
              month, year, skillCategories: skills,
              supervisorMessage: existingAssessment?.supervisorMessage || '',
              managerMessage: existingAssessment?.managerMessage || '',
              templateId: template?.id,
              minScore: template?.minScore,
              maxScore: template?.maxScore,
              examSubmissions: existingAssessment?.examSubmissions || [],
          };
          const { error } = await db.upsertAssessment(newAssessment, staffId);
          if (error) alert(`خطا در ذخیره ابری: ${error.message}`);
          refreshData();
      }
  };

  const handleSubmitExam = async (departmentId: string, staffId: string, month: string, year: number, submission: ExamSubmission) => {
      const staff = findStaffMember(findDepartment(findHospital(selectedHospitalId), departmentId), staffId);
      if (staff) {
          let assessment = staff.assessments.find(a => a.month === month && a.year === year);
          if (!assessment) {
              assessment = { id: Date.now().toString(), month, year, skillCategories: [], examSubmissions: [] };
          }
          if (!assessment.examSubmissions) assessment.examSubmissions = [];
          
          const existingSubIdx = assessment.examSubmissions.findIndex(s => s.examTemplateId === submission.examTemplateId);
          if (existingSubIdx > -1) assessment.examSubmissions[existingSubIdx] = submission;
          else assessment.examSubmissions.push(submission);
          
          const { error } = await db.upsertAssessment(assessment, staffId);
          if (error) alert(`خطا در ذخیره ابری: ${error.message}`);
          refreshData();
      }
  };
  
  const handleUpdateDepartment = async (id: string, data: Partial<Omit<Department, 'id' | 'staff'>>) => {
      if (!selectedHospitalId) return;
      const hospital = findHospital(selectedHospitalId);
      const department = findDepartment(hospital, id);
      if (department) {
          const updatedDepartment = { ...department, ...data };
          const { error } = await db.upsertDepartment(updatedDepartment, selectedHospitalId);
          if (error) alert(`خطا در ذخیره ابری: ${error.message}`);
          refreshData();
      }
  };

  const handleUpdateStaff = async (departmentId: string, staffId: string, data: Partial<Omit<StaffMember, 'id' | 'assessments'>>) => {
      const hospital = findHospital(selectedHospitalId);
      const department = findDepartment(hospital, departmentId);
      const staff = findStaffMember(department, staffId);
      if (staff) {
          const updatedStaff = { ...staff, ...data };
          const { error } = await db.upsertStaff(updatedStaff, departmentId);
          if (error) alert(`خطا در ذخیره ابری: ${error.message}`);
          refreshData();
      }
  };

  const handleComprehensiveImport = async (departmentId: string, data: { [staffName: string]: Map<string, SkillCategory[]> }) => {
      const hospital = findHospital(selectedHospitalId);
      const department = findDepartment(hospital, departmentId);
      if (!department) return;
  
      for (const staffName in data) {
          let staffMember = department.staff.find(s => s.name === staffName);
          if (!staffMember) {
              staffMember = { id: Date.now().toString() + staffName, name: staffName, title: 'وارد شده از اکسل', assessments: [] };
              department.staff.push(staffMember);
          }
  
          const assessmentsMap = data[staffName];
          for (const [month, skillCategories] of assessmentsMap.entries()) {
              const existingAssessmentIndex = staffMember.assessments.findIndex(a => a.month === month && a.year === activeYear);
              const assessmentData = {
                  month,
                  year: activeYear,
                  skillCategories,
                  supervisorMessage: '',
                  managerMessage: '',
                  minScore: 0,
                  maxScore: 4,
              };
              if (existingAssessmentIndex > -1) {
                  staffMember.assessments[existingAssessmentIndex] = { ...staffMember.assessments[existingAssessmentIndex], ...assessmentData };
              } else {
                  staffMember.assessments.push({ id: `${staffMember.id}-${month}-${activeYear}`, ...assessmentData });
              }
          }
      }
      const { error } = await db.upsertDepartment(department, selectedHospitalId!);
      if (error) alert(`Error importing data: ${error.message}`);
      else {
          alert('اطلاعات با موفقیت وارد شد.');
          refreshData();
      }
  };
  
  const handleAddOrUpdateWorkLog = async (departmentId: string, staffId: string, workLog: MonthlyWorkLog) => {
      const staff = findStaffMember(findDepartment(findHospital(selectedHospitalId), departmentId), staffId);
      if (staff) {
          if (!staff.workLogs) staff.workLogs = [];
          const logIndex = staff.workLogs.findIndex(l => l.month === workLog.month && l.year === workLog.year);
          if (logIndex > -1) {
              staff.workLogs[logIndex] = workLog;
          } else {
              staff.workLogs.push(workLog);
          }
          const { error } = await db.upsertStaff(staff, departmentId);
          if (error) alert(`Error saving work log: ${error.message}`);
          else refreshData();
      }
  };

    const handleResetHospital = async (supervisorNationalId: string): Promise<boolean> => {
        const hospital = findHospital(selectedHospitalId);
        if (!hospital) return false;

        const isAdmin = loggedInUser?.role === UserRole.Admin;
        const adminId = '5850008985';

        const isSupervisorMatch = hospital.supervisorNationalId === supervisorNationalId;
        const isAdminOverride = isAdmin && supervisorNationalId === adminId;
        
        if (isSupervisorMatch || isAdminOverride) {
            setIsLoading(true);
            const { error } = await db.resetHospitalDepartments(selectedHospitalId!);
            if (error) {
                alert(`خطا در ریست کردن بیمارستان: ${error.message}`);
                setIsLoading(false);
                return false;
            }
            await refreshData();
            return true;
        }
        
        return false;
    };
  
  const handleArchiveYear = (yearToArchive: number) => {
    setActiveYear(yearToArchive + 1);
  };

  const handleUpdateAssessmentMessages = async (departmentId: string, staffId: string, month: string, year: number, messages: { supervisorMessage: string; managerMessage: string; }) => {
      const staff = findStaffMember(findDepartment(findHospital(selectedHospitalId), departmentId), staffId);
      if (staff) {
          const assessment = staff.assessments.find(a => a.month === month && a.year === year);
          if (assessment) {
              assessment.supervisorMessage = messages.supervisorMessage;
              assessment.managerMessage = messages.managerMessage;
              const { error } = await db.upsertAssessment(assessment, staffId);
              if (error) alert(`خطا در ذخیره پیام‌ها: ${error.message}`);
              else refreshData();
          }
      }
  };

  const handleSubmitNeedsAssessmentResponse = async (departmentId: string, staffId: string, month: string, year: number, responses: Map<string, string>) => {
      const hospital = findHospital(selectedHospitalId);
      if (!hospital) return;
      
      let needsAssessment = hospital.needsAssessments?.find(na => na.month === month && na.year === year);
      if (!needsAssessment) {
          if (!hospital.needsAssessments) hospital.needsAssessments = [];
           const newNA: MonthlyNeedsAssessment = { month, year, topics: [] };
           hospital.needsAssessments.push(newNA);
           needsAssessment = newNA;
      }
      
      const staff = findStaffMember(findDepartment(hospital, departmentId), staffId);
      if (!staff) return;

      responses.forEach((response, topicId) => {
          let topic = needsAssessment!.topics.find(t => t.id === topicId);
          if (topic) {
              let staffResponse = topic.responses.find(r => r.staffId === staffId);
              if (staffResponse) {
                  staffResponse.response = response;
              } else {
                  topic.responses.push({ staffId, staffName: staff.name, response });
              }
          }
      });
      
      const { error } = await db.upsertHospital(hospital);
      if (error) alert(`خطا در ثبت نظرسنجی: ${error.message}`);
      else refreshData();
  };

  const handleAddOrUpdateChecklistTemplate = async (template: NamedChecklistTemplate) => {
    if (!selectedHospitalId) return;
    const hospital = findHospital(selectedHospitalId);
    if (hospital) {
      if (!hospital.checklistTemplates) hospital.checklistTemplates = [];
      const index = hospital.checklistTemplates.findIndex(t => t.id === template.id);
      if (index > -1) hospital.checklistTemplates[index] = template;
      else hospital.checklistTemplates.push(template);
      
      const { error } = await db.upsertHospital(hospital);
      if (error) alert(`Error: ${error.message}`); else refreshData();
    }
  };
  
  const handleDeleteChecklistTemplate = async (templateId: string) => {
    if (!selectedHospitalId) return;
    const hospital = findHospital(selectedHospitalId);
    if (hospital && hospital.checklistTemplates) {
      hospital.checklistTemplates = hospital.checklistTemplates.filter(t => t.id !== templateId);
      const { error } = await db.upsertHospital(hospital);
      if (error) alert(`Error: ${error.message}`); else refreshData();
    }
  };

  const handleAddOrUpdateExamTemplate = async (template: ExamTemplate) => {
    if (!selectedHospitalId) return;
    const hospital = findHospital(selectedHospitalId);
    if (hospital) {
      if (!hospital.examTemplates) hospital.examTemplates = [];
      const index = hospital.examTemplates.findIndex(t => t.id === template.id);
      if (index > -1) hospital.examTemplates[index] = template;
      else hospital.examTemplates.push(template);
      
      const { error } = await db.upsertHospital(hospital);
      if (error) alert(`Error: ${error.message}`); else refreshData();
    }
  };

  const handleDeleteExamTemplate = async (templateId: string) => {
    if (!selectedHospitalId) return;
    const hospital = findHospital(selectedHospitalId);
    if (hospital && hospital.examTemplates) {
      hospital.examTemplates = hospital.examTemplates.filter(t => t.id !== templateId);
      const { error } = await db.upsertHospital(hospital);
      if (error) alert(`Error: ${error.message}`); else refreshData();
    }
  };
  
    const handleAddTrainingMaterial = async (departmentId: string, month: string, fileData: FileUploadData) => {
        if (!selectedHospitalId) return;
        const { path, error: uploadError } = await db.uploadFileFromDataUrl(fileData.dataUrl, fileData.name);
        if (uploadError) {
            alert(`خطا در آپلود فایل: ${uploadError.message}`);
            return;
        }
        
        const newMaterial: TrainingMaterial = {
            id: Date.now().toString(), name: fileData.name, type: fileData.type,
            storagePath: path, description: fileData.description
        };

        const { error: saveError } = await db.addTrainingMaterial(selectedHospitalId, departmentId, month, newMaterial);
        if (saveError) {
            await db.deleteFile(path); // Cleanup on error
            alert(`خطا در ذخیره اطلاعات فایل: ${saveError.message}`);
        } else {
            refreshData();
        }
    };

    const handleDeleteTrainingMaterial = async (departmentId: string, month: string, materialId: string) => {
        if (!selectedHospitalId) return;
        const hospital = findHospital(selectedHospitalId);
        const department = findDepartment(hospital, departmentId);
        if (department?.trainingMaterials) {
            const monthlyTraining = department.trainingMaterials.find(t => t.month === month);
            if (monthlyTraining) {
                const materialToDelete = monthlyTraining.materials.find(m => m.id === materialId);
                if (materialToDelete) await db.deleteFile(materialToDelete.storagePath);
                monthlyTraining.materials = monthlyTraining.materials.filter(m => m.id !== materialId);
            }
            const { error } = await db.upsertDepartment(department, selectedHospitalId);
            if (error) alert(`Error: ${error.message}`); else refreshData();
        }
    };

    const handleUpdateTrainingMaterialDescription = async (departmentId: string, month: string, materialId: string, description: string) => {
        if (!selectedHospitalId) return;
        const hospital = findHospital(selectedHospitalId);
        const department = findDepartment(hospital, departmentId);
        if (department?.trainingMaterials) {
            const material = department.trainingMaterials.flatMap(t => t.materials).find(m => m.id === materialId);
            if (material) material.description = description;
            const { error } = await db.upsertDepartment(department, selectedHospitalId);
            if (error) alert(`Error: ${error.message}`); else refreshData();
        }
    };

    const handleAddAccreditationMaterial = async (fileData: FileUploadData) => {
        if (!selectedHospitalId) return;
        const { path, error: uploadError } = await db.uploadFileFromDataUrl(fileData.dataUrl, fileData.name);
        if (uploadError) {
            alert(`خطا در آپلود فایل: ${uploadError.message}`);
            return;
        }
        const newMaterial: TrainingMaterial = { id: Date.now().toString(), name: fileData.name, type: fileData.type, storagePath: path, description: fileData.description };
        
        const { error: saveError } = await db.addAccreditationMaterial(selectedHospitalId, newMaterial);
        if (saveError) {
            await db.deleteFile(path);
            alert(`خطا در ذخیره اطلاعات: ${saveError.message}`);
        } else {
            refreshData();
        }
    };
  
    const handleDeleteAccreditationMaterial = async (materialId: string) => {
        if (!selectedHospitalId) return;
        const hospital = findHospital(selectedHospitalId);
        if (hospital?.accreditationMaterials) {
            const materialToDelete = hospital.accreditationMaterials.find(m => m.id === materialId);
            if(materialToDelete) await db.deleteFile(materialToDelete.storagePath);
            hospital.accreditationMaterials = hospital.accreditationMaterials.filter(m => m.id !== materialId);
            const { error } = await db.upsertHospital(hospital);
            if (error) alert(`Error: ${error.message}`); else refreshData();
        }
    };
  
    const handleUpdateAccreditationMaterialDescription = async (materialId: string, description: string) => {
        if (!selectedHospitalId) return;
        const hospital = findHospital(selectedHospitalId);
        if (hospital?.accreditationMaterials) {
            const material = hospital.accreditationMaterials.find(m => m.id === materialId);
            if (material) material.description = description;
            const { error } = await db.upsertHospital(hospital);
            if (error) alert(`Error: ${error.message}`); else refreshData();
        }
    };

    const handleAddNewsBanner = async (banner: Omit<NewsBanner, 'id' | 'imageStoragePath'>, fileData: FileUploadData) => {
        if (!selectedHospitalId) return;
        const { path, error: uploadError } = await db.uploadFileFromDataUrl(fileData.dataUrl, fileData.name);
        if (uploadError) {
            alert(`خطا در آپلود فایل: ${uploadError.message}`);
            return;
        }
        const newBanner: NewsBanner = { ...banner, id: Date.now().toString(), imageStoragePath: path };
        const { error: saveError } = await db.addNewsBanner(selectedHospitalId, newBanner);
        if (saveError) {
            await db.deleteFile(path);
            alert(`خطا در ذخیره بنر: ${saveError.message}`);
        } else {
            refreshData();
        }
    };

    const handleDeleteNewsBanner = async (bannerId: string) => {
        if (!selectedHospitalId) return;
        const hospital = findHospital(selectedHospitalId);
        if (hospital?.newsBanners) {
            const banner = hospital.newsBanners.find(b => b.id === bannerId);
            if (banner) await db.deleteFile(banner.imageStoragePath);
            hospital.newsBanners = hospital.newsBanners.filter(b => b.id !== bannerId);
            const { error } = await db.upsertHospital(hospital);
            if (error) alert(`Error: ${error.message}`); else refreshData();
        }
    };

    const handleUpdateNewsBanner = async (bannerId: string, title: string, description: string) => {
        if (!selectedHospitalId) return;
        const hospital = findHospital(selectedHospitalId);
        if (hospital?.newsBanners) {
            const banner = hospital.newsBanners.find(b => b.id === bannerId);
            if (banner) { banner.title = title; banner.description = description; }
            const { error } = await db.upsertHospital(hospital);
            if (error) alert(`Error: ${error.message}`); else refreshData();
        }
    };
  
    const handleAddPatientEducationMaterial = async (fileData: FileUploadData) => {
        if (!selectedHospitalId || !selectedDepartmentId) return;
        const { path, error: uploadError } = await db.uploadFileFromDataUrl(fileData.dataUrl, fileData.name);
        if (uploadError) {
            alert(`خطا در آپلود فایل: ${uploadError.message}`);
            return;
        }
        const newMaterial: TrainingMaterial = { id: Date.now().toString(), name: fileData.name, type: fileData.type, storagePath: path, description: fileData.description };
        const { error: saveError } = await db.addPatientEducationMaterial(selectedHospitalId, selectedDepartmentId, newMaterial);
        if (saveError) {
            await db.deleteFile(path);
            alert(`خطا در ذخیره فایل: ${saveError.message}`);
        } else {
            refreshData();
        }
    };

    const handleDeletePatientEducationMaterial = async (materialId: string) => {
        if (!selectedDepartmentId) return;
        const hospital = findHospital(selectedHospitalId);
        const department = findDepartment(hospital, selectedDepartmentId);
        if (department?.patientEducationMaterials) {
            const material = department.patientEducationMaterials.find(m => m.id === materialId);
            if(material) await db.deleteFile(material.storagePath);
            department.patientEducationMaterials = department.patientEducationMaterials.filter(m => m.id !== materialId);
            const { error } = await db.upsertDepartment(department, selectedHospitalId!);
            if (error) alert(`Error: ${error.message}`); else refreshData();
        }
    };
  
    const handleUpdatePatientEducationMaterialDescription = async (materialId: string, description: string) => {
        if (!selectedDepartmentId) return;
        const hospital = findHospital(selectedHospitalId);
        const department = findDepartment(hospital, selectedDepartmentId);
        if (department?.patientEducationMaterials) {
            const material = department.patientEducationMaterials.find(m => m.id === materialId);
            if (material) material.description = description;
            const { error } = await db.upsertDepartment(department, selectedHospitalId!);
            if (error) alert(`Error: ${error.message}`); else refreshData();
        }
    };

  const handleAddPatient = async (name: string, nationalId: string, password?: string) => {
    if (!selectedHospitalId || !selectedDepartmentId) return;
    const newPatient: Patient = { id: Date.now().toString(), name, nationalId, password, chatHistory: [] };
    const { error } = await db.addPatient(selectedHospitalId, selectedDepartmentId, newPatient);
    if (error) alert(`Error: ${error.message}`); else refreshData();
  };

  const handleDeletePatient = async (patientId: string) => {
    if (!selectedHospitalId || !selectedDepartmentId) return;
    const { error } = await db.deletePatient(selectedHospitalId, selectedDepartmentId, patientId);
    if (error) alert(`Error: ${error.message}`); else refreshData();
  };

  const handleChatMessageSend = async (hospitalId: string, departmentId: string, patientId: string, sender: 'patient' | 'manager', content: { text?: string; fileData?: FileUploadData }) => {
      let fileInfo: ChatMessage['file'] | undefined;
      let uploadPath: string | null = null;
      if (content.fileData) {
          const { path, error } = await db.uploadFileFromDataUrl(content.fileData.dataUrl, content.fileData.name);
          if (error) { alert(`خطا در آپلود فایل: ${error.message}`); return; }
          uploadPath = path;
          fileInfo = { id: `file-${Date.now()}`, name: content.fileData.name, type: content.fileData.type, storagePath: path };
      }

      const newMessage: ChatMessage = { id: Date.now().toString(), sender, timestamp: new Date().toISOString(), text: content.text, file: fileInfo };
      
      const { error } = await db.sendChatMessage(hospitalId, departmentId, patientId, newMessage);
      if (error) {
          if (uploadPath) await db.deleteFile(uploadPath); // Cleanup on error
          alert(`خطا در ارسال پیام: ${error.message}`);
      } else {
          refreshData();
      }
  };

  const handleAdminOrHospitalMessageSend = async (hospitalId: string, sender: 'hospital' | 'admin', content: { text?: string; fileData?: FileUploadData }) => {
      let fileInfo: AdminMessage['file'] | undefined;
      let uploadPath: string | null = null;
      if (content.fileData) {
          const { path, error } = await db.uploadFileFromDataUrl(content.fileData.dataUrl, content.fileData.name);
          if (error) { alert(`خطا در آپلود فایل: ${error.message}`); return; }
          uploadPath = path;
          fileInfo = { id: `file-${Date.now()}`, name: content.fileData.name, type: content.fileData.type, storagePath: path };
      }

      const newMessage: AdminMessage = { id: Date.now().toString(), sender, timestamp: new Date().toISOString(), text: content.text, file: fileInfo };
      
      const { error } = await db.sendAdminMessage(hospitalId, newMessage);
      if (error) {
          if (uploadPath) await db.deleteFile(uploadPath);
          alert(`Error: ${error.message}`);
      } else {
          refreshData();
      }
  };

  const handleUpdateNeedsAssessmentTopics = async (month: string, topics: NeedsAssessmentTopic[]) => {
    if (!selectedHospitalId) return;
    const { error } = await db.updateNeedsAssessmentTopics(selectedHospitalId, month, activeYear, topics);
    if (error) alert(`Error: ${error.message}`); else refreshData();
  };

  const handleReplaceHospitalData = async (hospitalData: Hospital) => {
    const { error } = await db.upsertHospital(hospitalData);
    if (error) {
        alert(`خطا در ذخیره اطلاعات بیمارستان: ${error.message}`);
    } else {
        alert('اطلاعات بیمارستان با موفقیت بارگذاری شد.');
        refreshData();
    }
  };

  const handleReplaceDepartmentData = async (hospitalId: string, departmentData: Department) => {
      const { error } = await db.upsertDepartment(departmentData, hospitalId);
      if (error) {
          alert(`خطا در ذخیره اطلاعات بخش: ${error.message}`);
      } else {
          alert('اطلاعات بخش با موفقیت بارگذاری شد.');
          refreshData();
      }
  };

  // --- Navigation & Auth ---
  const navigateForward = (
    newScreen: AppScreen,
    newView: View,
    newHospitalId?: string | null,
    newDepartmentId?: string | null,
    newStaffId?: string | null
  ) => {
    const effectiveHospitalId = newHospitalId !== undefined ? newHospitalId : selectedHospitalId;
    const effectiveDepartmentId = newDepartmentId !== undefined ? newDepartmentId : selectedDepartmentId;
    const effectiveStaffId = newStaffId !== undefined ? newStaffId : selectedStaffId;

    const currentDepth = (window.history.state && typeof window.history.state.depth === 'number')
      ? window.history.state.depth
      : 0;
    const nextDepth = currentDepth + 1;

    const nextState: NavigationState = {
      appScreen: newScreen,
      currentView: newView,
      selectedHospitalId: effectiveHospitalId,
      selectedDepartmentId: effectiveDepartmentId,
      selectedStaffId: effectiveStaffId,
      depth: nextDepth,
    };

    try {
      window.history.pushState(nextState, '');
    } catch (e) {
      console.error("pushState error", e);
    }

    setAppScreen(newScreen);
    setCurrentView(newView);
    setSelectedHospitalId(effectiveHospitalId);
    setSelectedDepartmentId(effectiveDepartmentId);
    setSelectedStaffId(effectiveStaffId);
  };

  const openSubView = (view: View, overrideDeptId?: string) => {
    navigateForward(
      appScreen,
      view,
      selectedHospitalId,
      overrideDeptId !== undefined ? overrideDeptId : selectedDepartmentId,
      null
    );
  };

  const handleGoToWelcome = () => {
    handleLogout();
  };

  const handleSelectHospital = (id: string) => {
    navigateForward(AppScreen.MainApp, View.DepartmentList, id, null, null);
  };

  const handleSelectDepartment = (id: string) => {
    navigateForward(AppScreen.MainApp, View.DepartmentView, selectedHospitalId, id, null);
  };

  const handleSelectStaff = (id: string) => {
    navigateForward(AppScreen.MainApp, View.StaffMemberView, selectedHospitalId, selectedDepartmentId, id);
  };

  const handleAddCustomCorrectiveAction = async (departmentId: string, actionData: Omit<CustomCorrectiveAction, 'id' | 'createdAt'>) => {
    const hospital = findHospital(selectedHospitalId);
    if (!hospital) return;
    const dept = hospital.departments.find(d => d.id === departmentId);
    if (!dept) return;

    if (!dept.correctiveActions) dept.correctiveActions = [];
    const newAction: CustomCorrectiveAction = {
      ...actionData,
      id: `ca-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      createdAt: new Date().toISOString(),
    };
    dept.correctiveActions.push(newAction);

    const { error } = await db.upsertDepartment(dept, hospital.id);
    if (error) alert(`خطا در ثبت اقدام اصلاحی: ${error.message}`);
    else refreshData();
  };

  const handleToggleCustomCorrectiveActionStatus = async (departmentId: string, actionId: string) => {
    const hospital = findHospital(selectedHospitalId);
    if (!hospital) return;
    const dept = hospital.departments.find(d => d.id === departmentId);
    if (!dept || !dept.correctiveActions) return;

    const action = dept.correctiveActions.find(ca => ca.id === actionId);
    if (action) {
      action.status = action.status === 'completed' ? 'pending' : 'completed';
      const { error } = await db.upsertDepartment(dept, hospital.id);
      if (error) alert(`خطا در تغییر وضعیت اقدام اصلاحی: ${error.message}`);
      else refreshData();
    }
  };

  const handleDeleteCustomCorrectiveAction = async (departmentId: string, actionId: string) => {
    const hospital = findHospital(selectedHospitalId);
    if (!hospital) return;
    const dept = hospital.departments.find(d => d.id === departmentId);
    if (!dept || !dept.correctiveActions) return;

    dept.correctiveActions = dept.correctiveActions.filter(ca => ca.id !== actionId);
    const { error } = await db.upsertDepartment(dept, hospital.id);
    if (error) alert(`خطا در حذف اقدام اصلاحی: ${error.message}`);
    else refreshData();
  };

  const handleBack = () => {
    if (isAboutModalOpen) {
      setIsAboutModalOpen(false);
      return;
    }
    if (isLoginModalOpen) {
      setIsLoginModalOpen(false);
      return;
    }

    const currentNav: NavigationState = {
      appScreen,
      currentView,
      selectedHospitalId,
      selectedDepartmentId,
      selectedStaffId,
    };
    const prev = getBackState(currentNav, loggedInUser);
    if (prev) {
      // 1. Immediately update state so in-app back buttons react instantly
      setAppScreen(prev.appScreen);
      setCurrentView(prev.currentView);
      setSelectedHospitalId(prev.selectedHospitalId);
      setSelectedDepartmentId(prev.selectedDepartmentId);
      setSelectedStaffId(prev.selectedStaffId);

      // 2. Synchronize browser history
      const depth = window.history.state?.depth;
      if (typeof depth === 'number' && depth > 0) {
        isProgrammaticBackRef.current = true;
        try {
          window.history.back();
        } catch (e) {}
        setTimeout(() => {
          isProgrammaticBackRef.current = false;
        }, 300);
      } else {
        try {
          window.history.replaceState(prev, '');
        } catch (e) {}
      }
    }
  };

  const handleLogin = async (nationalId: string, password: string) => {
      setLoginError(null);
      if (!nationalId || !password) { setLoginError('کد ملی و رمز عبور الزامی است.'); return; }
      
      const user = db.findUser(hospitals, nationalId, password);
      
      if(user) {
          setLoggedInUser(user);
          setIsLoginModalOpen(false);

          let targetScreen = AppScreen.MainApp;
          let targetView = View.DepartmentList;
          let targetHospId: string | null = null;
          let targetDeptId: string | null = null;
          let targetStaffId: string | null = null;

          switch(user.role) {
            case UserRole.Admin:
              targetScreen = AppScreen.HospitalList;
              targetView = View.DepartmentList;
              break;
            case UserRole.Supervisor:
              targetScreen = AppScreen.MainApp;
              targetView = View.DepartmentList;
              targetHospId = user.hospitalId || null;
              break;
            case UserRole.Manager:
              targetScreen = AppScreen.MainApp;
              targetView = View.DepartmentView;
              targetHospId = user.hospitalId || null;
              targetDeptId = user.departmentId || null;
              break;
            case UserRole.Staff:
              targetScreen = AppScreen.MainApp;
              targetView = View.StaffMemberView;
              targetHospId = user.hospitalId || null;
              targetDeptId = user.departmentId || null;
              targetStaffId = user.staffId || null;
              break;
            case UserRole.Patient:
              const patientDept = findHospital(user.hospitalId!)?.departments.find(d => d.id === user.departmentId!);
              if (patientDept?.patients?.find(p => p.id === user.patientId!)) {
                  targetScreen = AppScreen.MainApp;
                  targetView = View.PatientPortal;
                  targetHospId = user.hospitalId || null;
                  targetDeptId = user.departmentId || null;
              } else {
                  setLoginError('اطلاعات بیمار یافت نشد.');
                  return;
              }
              break;
          }

          const targetState: NavigationState = {
            appScreen: targetScreen,
            currentView: targetView,
            selectedHospitalId: targetHospId,
            selectedDepartmentId: targetDeptId,
            selectedStaffId: targetStaffId,
            depth: 0,
          };

          try {
            window.history.replaceState(targetState, '');
            localStorage.setItem(SESSION_USER_KEY, JSON.stringify(user));
            localStorage.setItem(NAV_STATE_KEY, JSON.stringify(targetState));
          } catch (e) {}

          setAppScreen(targetScreen);
          setCurrentView(targetView);
          setSelectedHospitalId(targetHospId);
          setSelectedDepartmentId(targetDeptId);
          setSelectedStaffId(targetStaffId);
      } else {
          setLoginError('کد ملی یا رمز عبور نامعتبر است.');
      }
  };
  
  const handleLogout = () => {
      setLoggedInUser(null);
      try {
        localStorage.removeItem(SESSION_USER_KEY);
        localStorage.removeItem(NAV_STATE_KEY);
      } catch (e) {}

      const welcomeState: NavigationState = {
        appScreen: AppScreen.Welcome,
        currentView: View.DepartmentList,
        selectedHospitalId: null,
        selectedDepartmentId: null,
        selectedStaffId: null,
        depth: 0,
      };

      try {
        window.history.replaceState(welcomeState, '');
      } catch (e) {}

      setAppScreen(AppScreen.Welcome);
      setSelectedHospitalId(null);
      setSelectedDepartmentId(null);
      setSelectedStaffId(null);
      setCurrentView(View.DepartmentList);
  };

  const handleManualRefresh = async () => {
    setIsRefreshing(true);
    await refreshData(false);
    setTimeout(() => {
      setIsRefreshing(false);
    }, 400);
  };

  // --- Data Handlers for Backups ---
  const handleSaveData = () => {
      // Admin on Hospital List screen -> Full backup of all hospitals
      if (loggedInUser?.role === UserRole.Admin && appScreen === AppScreen.HospitalList) {
        const dataToSave = { type: 'full_backup_metadata_only', hospitals };
        const jsonString = `data:text/json;charset=utf-8,${encodeURIComponent(JSON.stringify(dataToSave, null, 2))}`;
        const link = document.createElement('a');
        link.href = jsonString;
        link.download = `skill_assessment_backup_${new Date().toISOString().split('T')[0]}.json`;
        link.click();
      } 
      // Supervisor/Admin on Department List screen -> Backup of the selected hospital
      else if (currentView === View.DepartmentList && (loggedInUser?.role === UserRole.Admin || loggedInUser?.role === UserRole.Supervisor)) {
        const hospital = findHospital(selectedHospitalId);
        if (!hospital) return;
        const dataToSave = { type: 'hospital_backup', hospitalId: hospital.id, data: hospital };
        const jsonString = `data:text/json;charset=utf-8,${encodeURIComponent(JSON.stringify(dataToSave, null, 2))}`;
        const link = document.createElement('a');
        link.href = jsonString;
        link.download = `پشتیبان_بیمارستان_${hospital.name.replace(/\s/g, '_')}.json`;
        link.click();
      } 
      // Supervisor/Admin/Manager on Department View screen -> Backup of the selected department
      else if (currentView === View.DepartmentView) {
        const department = findDepartment(findHospital(selectedHospitalId), selectedDepartmentId);
        if (!department) return;
        const dataToSave = { type: 'department_backup', hospitalId: selectedHospitalId, departmentId: department.id, data: department };
        const jsonString = `data:text/json;charset=utf-8,${encodeURIComponent(JSON.stringify(dataToSave, null, 2))}`;
        const link = document.createElement('a');
        link.href = jsonString;
        link.download = `پشتیبان_بخش_${department.name.replace(/\s/g, '_')}.json`;
        link.click();
      }
  };

  const handleLoadData = (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = async (e) => {
          try {
              const loadedData = JSON.parse(e.target?.result as string);
              if (currentView === View.DepartmentList) {
                  const hospital = findHospital(selectedHospitalId);
                  if (loadedData.type !== 'hospital_backup') throw new Error('این فایل، یک فایل پشتیبان معتبر برای بیمارستان نیست.');
                  if (loadedData.hospitalId !== hospital?.id) throw new Error(`این فایل متعلق به بیمارستان دیگری است.`);
                  if (window.confirm('آیا مطمئن هستید که می‌خواهید تمام داده‌های فعلی این بیمارستان را با اطلاعات این فایل جایگزین کنید؟')) {
                      handleReplaceHospitalData(loadedData.data);
                  }
              } else if (currentView === View.DepartmentView) {
                  const department = findDepartment(findHospital(selectedHospitalId), selectedDepartmentId);
                  if (loadedData.type !== 'department_backup') throw new Error('این فایل، یک فایل پشتیبان معتبر برای بخش نیست.');
                  if (loadedData.departmentId !== department?.id) throw new Error(`این فایل متعلق به بخش دیگری است.`);
                  if (window.confirm('آیا مطمئن هستید که می‌خواهید تمام داده‌های فعلی این بخش را با اطلاعات این فایل جایگزین کنید؟')) {
                      handleReplaceDepartmentData(selectedHospitalId!, loadedData.data);
                  }
              } else { // Admin Full Load
                  if (loadedData.type !== 'full_backup_metadata_only' || !Array.isArray(loadedData.hospitals)) throw new Error('فایل پشتیبان معتبر نیست.');
                  if (window.confirm('آیا مطمئن هستید که می‌خواهید تمام داده‌های فعلی را با اطلاعات این فایل جایگزین کنید؟')) {
                      await db.saveAllHospitals(loadedData.hospitals);
                      alert('داده‌ها با موفقیت از فایل پشتیبان بازیابی شدند.');
                      refreshData();
                  }
              }
          } catch (error) {
              alert(`خطا در بارگذاری فایل: ${error instanceof Error ? error.message : 'فرمت فایل نامعتبر است.'}`);
          } finally {
              if (event.target) event.target.value = '';
          }
      };
      reader.readAsText(file);
  };

  const renderMainContent = () => {
    const renderUnauthorized = () => {
        handleLogout();
        return null; // The logic will redirect to welcome screen
    };

    if (!loggedInUser) return renderUnauthorized();

    if (isLoading && hospitals.length === 0) {
      return (
        <div className="flex flex-col items-center justify-center min-h-[300px] gap-4">
          <LoadingSpinner />
          <p className="text-slate-600 dark:text-slate-300 font-medium">در حال بارگذاری و بازیابی اطلاعات...</p>
        </div>
      );
    }

    if (appScreen === AppScreen.HospitalList) {
      if (loggedInUser.role !== UserRole.Admin) return renderUnauthorized();

      if (currentView === View.AdminCommunication) {
        return <AdminCommunicationView hospitals={hospitals} onSendMessage={(hospitalId, content) => handleAdminOrHospitalMessageSend(hospitalId, 'admin', content)} onBack={handleBack} onRefreshChat={refreshData} />;
      }
      
      return <HospitalList
        hospitals={hospitals}
        onAddHospital={handleAddHospital}
        onUpdateHospital={async (id, data) => {
            const hospital = findHospital(id);
            if(hospital) await db.upsertHospital({ ...hospital, ...data }).then(res => !res.error && refreshData());
        }}
        onDeleteHospital={async (id) => {
            setIsLoading(true);
            const { error } = await db.deleteHospital(id);
            if (error) {
                alert(`خطا در حذف بیمارستان: ${error.message}`);
                setIsLoading(false);
            } else {
                await refreshData();
            }
        }}
        onSelectHospital={handleSelectHospital}
        onGoToWelcome={handleGoToWelcome}
        userRole={loggedInUser.role}
        onContactAdmin={() => openSubView(View.AdminCommunication)}
      />;
    }

    const selectedHospital = findHospital(selectedHospitalId);
    const effectiveDepartmentId = selectedDepartmentId || (loggedInUser?.role === UserRole.Manager ? loggedInUser.departmentId : undefined);
    const selectedDepartment = findDepartment(selectedHospital, effectiveDepartmentId);
    const selectedStaffMember = findStaffMember(selectedDepartment, selectedStaffId);

    if (!selectedHospital && appScreen === AppScreen.MainApp && loggedInUser.role !== UserRole.Patient) {
      if (isLoading) {
        return (
          <div className="flex flex-col items-center justify-center min-h-[300px] gap-4">
            <LoadingSpinner />
            <p className="text-slate-600 dark:text-slate-300 font-medium">در حال بازیابی اطلاعات بیمارستان...</p>
          </div>
        );
      }
      return renderUnauthorized();
    }
    if (!selectedHospital) return <div className="p-8 text-center text-slate-600 dark:text-slate-400">اطلاعات بیمارستان یافت نشد.</div>;

    switch (currentView) {
      case View.DepartmentList:
        return <DepartmentList
          hospital={selectedHospital}
          onAddDepartment={handleAddDepartment}
          onUpdateDepartment={handleUpdateDepartment}
          onDeleteDepartment={async (id) => await db.deleteDepartment(id).then(res => !res.error && refreshData())}
          onSelectDepartment={handleSelectDepartment} onBack={handleBack} onManageAccreditation={() => openSubView(View.AccreditationManager)}
          onManageNewsBanners={() => openSubView(View.NewsBannerManager)} onManageNeedsAssessment={() => openSubView(View.NeedsAssessmentManager)}
          onManageCorrectiveActions={() => openSubView(View.CorrectiveActions)}
          onResetHospital={handleResetHospital} onContactAdmin={() => openSubView(View.HospitalCommunication)}
          onArchiveYear={handleArchiveYear} userRole={loggedInUser.role} onReplaceHospitalData={handleReplaceHospitalData}
        />;
      case View.DepartmentView:
        if (!selectedDepartment) {
          if (isLoading) {
            return (
              <div className="flex flex-col items-center justify-center min-h-[300px] gap-4">
                <LoadingSpinner />
                <p className="text-slate-600 dark:text-slate-300 font-medium">در حال بازیابی اطلاعات بخش...</p>
              </div>
            );
          }
          return <div className="p-8 text-center text-slate-600 dark:text-slate-400">اطلاعات بخش یافت نشد.</div>;
        }
        return <DepartmentView
          department={selectedDepartment} hospitalId={selectedHospital.id} onBack={handleBack} onAddStaff={handleAddStaff} onUpdateStaff={handleUpdateStaff}
          onDeleteStaff={async (deptId, staffId) => await db.deleteStaff(staffId).then(res => !res.error && refreshData())}
          onSelectStaff={handleSelectStaff} onComprehensiveImport={handleComprehensiveImport}
          onManageChecklists={() => openSubView(View.ChecklistManager)} onManageExams={() => openSubView(View.ExamManager)}
          onManageTraining={() => openSubView(View.TrainingManager)} onManagePatientEducation={() => openSubView(View.PatientEducationManager)}
          onManageCorrectiveActions={() => {
            openSubView(View.CorrectiveActions, selectedDepartment.id);
          }}
          onAddOrUpdateWorkLog={handleAddOrUpdateWorkLog} onReplaceDepartmentData={handleReplaceDepartmentData}
          userRole={loggedInUser.role} newsBanners={selectedHospital.newsBanners || []} activeYear={activeYear}
        />;
      case View.StaffMemberView:
        if (!selectedDepartment || !selectedStaffMember) {
          if (isLoading) {
            return (
              <div className="flex flex-col items-center justify-center min-h-[300px] gap-4">
                <LoadingSpinner />
                <p className="text-slate-600 dark:text-slate-300 font-medium">در حال بازیابی اطلاعات پرسنل...</p>
              </div>
            );
          }
          return <div className="p-8 text-center text-slate-600 dark:text-slate-400">اطلاعات پرسنل یافت نشد.</div>;
        }
        return <StaffMemberView
          department={selectedDepartment} staffMember={selectedStaffMember} onBack={handleBack}
          onAddOrUpdateAssessment={handleAddOrUpdateAssessment} onUpdateAssessmentMessages={handleUpdateAssessmentMessages}
          onSubmitExam={handleSubmitExam} onSubmitNeedsAssessmentResponse={handleSubmitNeedsAssessmentResponse}
          checklistTemplates={selectedHospital.checklistTemplates || []} examTemplates={selectedHospital.examTemplates || []}
          trainingMaterials={selectedDepartment.trainingMaterials || []} accreditationMaterials={selectedHospital.accreditationMaterials || []}
          newsBanners={selectedHospital.newsBanners || []} needsAssessments={selectedHospital.needsAssessments || []}
          userRole={loggedInUser.role} activeYear={activeYear} availableYears={allAvailableYears} onYearChange={setActiveYear}
        />;
      case View.ChecklistManager:
        return <ChecklistManager templates={selectedHospital.checklistTemplates || []} onAddOrUpdate={handleAddOrUpdateChecklistTemplate} onDelete={handleDeleteChecklistTemplate} onBack={handleBack} />;
      case View.ExamManager:
        return <ExamManager templates={selectedHospital.examTemplates || []} onAddOrUpdate={handleAddOrUpdateExamTemplate} onDelete={handleDeleteExamTemplate} onBack={handleBack} />;
      case View.TrainingManager:
        if (!selectedDepartment) return <div>Department not found.</div>;
        return <TrainingManager 
            departmentId={selectedDepartment.id}
            monthlyTrainings={selectedDepartment.trainingMaterials || []} 
            onAddMaterial={handleAddTrainingMaterial} 
            onDeleteMaterial={handleDeleteTrainingMaterial} 
            onUpdateMaterialDescription={handleUpdateTrainingMaterialDescription} 
            onBack={handleBack} 
        />;
      case View.AccreditationManager:
        return <AccreditationManager materials={selectedHospital.accreditationMaterials || []} onAddMaterial={handleAddAccreditationMaterial} onDeleteMaterial={handleDeleteAccreditationMaterial} onUpdateMaterialDescription={handleUpdateAccreditationMaterialDescription} onBack={handleBack} />;
      case View.NewsBannerManager:
        return <NewsBannerManager banners={selectedHospital.newsBanners || []} onAddBanner={handleAddNewsBanner} onUpdateBanner={handleUpdateNewsBanner} onDeleteBanner={handleDeleteNewsBanner} onBack={handleBack} />;
      case View.PatientEducationManager:
        if (!selectedDepartment) return <div>Department not found.</div>;
        return <PatientEducationManager department={selectedDepartment} onAddMaterial={handleAddPatientEducationMaterial} onDeleteMaterial={handleDeletePatientEducationMaterial} onUpdateMaterialDescription={handleUpdatePatientEducationMaterialDescription} onAddPatient={handleAddPatient} onDeletePatient={handleDeletePatient} onSendMessage={(patientId, content, sender) => handleChatMessageSend(selectedHospital.id, selectedDepartment.id, patientId, sender, content)} onBack={handleBack} onRefreshChat={refreshData} />;
      case View.PatientPortal:
        if (loggedInUser.role !== UserRole.Patient) return renderUnauthorized();
        const dept = findDepartment(findHospital(loggedInUser.hospitalId!), loggedInUser.departmentId!);
        const patient = dept?.patients?.find(p => p.id === loggedInUser.patientId!);
        if (!dept || !patient) return <div>اطلاعات بیمار یافت نشد.</div>;
        return <PatientPortalView department={dept} patient={patient} onSendMessage={(content) => handleChatMessageSend(loggedInUser.hospitalId!, loggedInUser.departmentId!, patient.id, 'patient', content)} onRefreshChat={refreshData} />;
      case View.HospitalCommunication:
        return <HospitalCommunicationView hospital={selectedHospital} onSendMessage={(content) => handleAdminOrHospitalMessageSend(selectedHospital.id, 'hospital', content)} onBack={handleBack} onRefreshChat={refreshData} />;
      case View.AdminCommunication:
        if (loggedInUser.role !== UserRole.Admin) return renderUnauthorized();
        return <AdminCommunicationView hospitals={hospitals} onSendMessage={(hospitalId, content) => handleAdminOrHospitalMessageSend(hospitalId, 'admin', content)} onBack={handleBack} onRefreshChat={refreshData} />;
      case View.NeedsAssessmentManager:
        return <NeedsAssessmentManager hospital={selectedHospital} onUpdateTopics={handleUpdateNeedsAssessmentTopics} onBack={handleBack} activeYear={activeYear} />;
      case View.CorrectiveActions:
        return <CorrectiveActionsView
          hospital={selectedHospital}
          departmentId={selectedDepartmentId || loggedInUser?.departmentId}
          onBack={handleBack}
          onAddCustomAction={handleAddCustomCorrectiveAction}
          onToggleActionStatus={handleToggleCustomCorrectiveActionStatus}
          onDeleteCustomAction={handleDeleteCustomCorrectiveAction}
          userRole={loggedInUser.role}
          activeYear={activeYear}
        />;
      default:
        return <div>Unhandled view state.</div>;
    }
  };

  const showBackupButtons = loggedInUser && (
    (loggedInUser.role === UserRole.Admin && appScreen === AppScreen.HospitalList) ||
    ((loggedInUser.role === UserRole.Admin || loggedInUser.role === UserRole.Supervisor) && currentView === View.DepartmentList) ||
    ((loggedInUser.role === UserRole.Admin || loggedInUser.role === UserRole.Supervisor || loggedInUser.role === UserRole.Manager) && currentView === View.DepartmentView)
  );

  if (isLoading && appScreen === AppScreen.Welcome) {
    return <div className="h-screen w-screen flex items-center justify-center bg-slate-100 dark:bg-slate-900"><div className="text-center"><p className="text-xl font-semibold text-slate-700 dark:text-slate-300">در حال بارگذاری و همگام‌سازی اطلاعات...</p></div></div>;
  }
  
  if (appScreen === AppScreen.Welcome) {
      return (
          <>
            <Suspense fallback={<LoadingSpinner />}>
              <WelcomeScreen onEnter={() => setIsLoginModalOpen(true)} />
            </Suspense>
            <AboutModal isOpen={isAboutModalOpen} onClose={() => setIsAboutModalOpen(false)} />
            <LoginModal isOpen={isLoginModalOpen} onClose={() => setIsLoginModalOpen(false)} onLogin={handleLogin} loginError={loginError} />
          </>
      );
  }

  const showHeader = loggedInUser?.role !== UserRole.Patient;

  return (
    <div className={`min-h-screen bg-slate-50 dark:bg-slate-900 transition-colors duration-300 flex flex-col ${showHeader ? 'pt-16' : ''}`}>
        {showHeader && (
            <header className="fixed top-0 left-0 right-0 z-40 bg-gradient-to-r from-purple-600 to-indigo-700 shadow-lg text-white">
                <div className="container mx-auto px-4 sm:px-6 lg:px-8 h-16 flex justify-between items-center">
                    <div className="flex items-center gap-4">
                      <h1 className="text-xl font-bold whitespace-nowrap">سامانه جهش</h1>
                    </div>

                    <div className="flex items-center gap-2 sm:gap-3">
                        {loggedInUser && <span className="text-sm font-semibold hidden md:inline">خوش آمدید، {loggedInUser.name}</span>}

                        <button onClick={() => setIsAboutModalOpen(true)} className="flex items-center gap-2 px-3 py-1.5 text-sm font-semibold bg-yellow-400 text-slate-800 rounded-lg shadow-sm hover:bg-yellow-500 transition-colors" aria-label="درباره">
                            <InfoIcon className="w-5 h-5"/>
                            <span className="hidden sm:inline">درباره</span>
                        </button>
                        
                        {showBackupButtons && (
                            <>
                                <button onClick={handleSaveData} className="flex items-center gap-2 px-3 py-1.5 text-sm font-semibold text-white bg-green-500 rounded-lg shadow-sm hover:bg-green-600 transition-colors" aria-label="ذخیره پشتیبان">
                                    <SaveIcon className="w-5 h-5"/>
                                    <span className="hidden sm:inline">ذخیره</span>
                                </button>
                                <label className="flex items-center gap-2 px-3 py-1.5 text-sm font-semibold text-white bg-orange-500 rounded-lg shadow-sm hover:bg-orange-600 transition-colors cursor-pointer" aria-label="بارگذاری پشتیبان">
                                    <UploadIcon className="w-5 h-5"/>
                                    <span className="hidden sm:inline">بارگذاری</span>
                                    <input type="file" accept=".json" onChange={handleLoadData} ref={fileInputRef} className="hidden"/>
                                </label>
                            </>
                        )}

                        {loggedInUser ? (
                            <button onClick={handleLogout} className="flex items-center gap-2 px-3 py-1.5 text-sm font-semibold text-white bg-red-500 rounded-lg shadow-sm hover:bg-red-600 transition-colors" aria-label="خروج">
                                <LogoutIcon className="w-5 h-5"/>
                                <span className="hidden sm:inline">خروج</span>
                            </button>
                        ) : (
                            <button onClick={() => setIsLoginModalOpen(true)} className="px-4 py-2 text-sm font-semibold bg-white text-indigo-600 rounded-lg hover:bg-slate-100 transition-colors">ورود</button>
                        )}
                    </div>
                </div>
            </header>
        )}
        <main className="container mx-auto flex-grow py-8">
          <Suspense fallback={<LoadingSpinner />}>
            {renderMainContent()}
          </Suspense>
        </main>
        <Footer />
        <AboutModal isOpen={isAboutModalOpen} onClose={() => setIsAboutModalOpen(false)} />
        <LoginModal isOpen={isLoginModalOpen} onClose={() => setIsLoginModalOpen(false)} onLogin={handleLogin} loginError={loginError} />
    </div>
  );
};

export default App;