import React, { useState, useEffect, useCallback, Suspense, useRef } from 'react';
import { Department, StaffMember, View, SkillCategory, Assessment, Hospital, AppScreen, NamedChecklistTemplate, ExamTemplate, ExamSubmission, LoggedInUser, UserRole, TrainingMaterial, MonthlyTraining, NewsBanner, MonthlyWorkLog, Patient, ChatMessage, AdminMessage, NeedsAssessmentTopic, MonthlyNeedsAssessment } from './types';
import LoadingSpinner from './components/LoadingSpinner';
import AboutModal from './components/AboutModal';
import LoginModal from './components/LoginModal';
import { SaveIcon } from './components/icons/SaveIcon';
import { UploadIcon } from './components/icons/UploadIcon';
import { InfoIcon } from './components/icons/InfoIcon';
import { LogoutIcon } from './components/icons/LogoutIcon';
import { BackIcon } from './components/icons/BackIcon';
import * as db from './services/db';
import Footer from './components/Footer';

const WelcomeScreen = React.lazy(() => import('./components/WelcomeScreen'));
const HospitalList = React.lazy(() => import('./components/HospitalList'));
const DepartmentList = React.lazy(() => import('./components/DepartmentList'));
const DepartmentView = React.lazy(() => import('./components/DepartmentView'));
const StaffMemberView = React.lazy(() => import('./components/StaffMemberView'));
const ChecklistManager = React.lazy(() => import('./components/ChecklistManager'));
const ExamManager = React.lazy(() => import('./components/ExamManager'));
const TrainingManager = React.lazy(() => import('./components/TrainingManager'));
const AccreditationManager = React.lazy(() => import('./components/AccreditationManager'));
const NewsBannerManager = React.lazy(() => import('./components/NewsBannerManager'));
const PatientEducationManager = React.lazy(() => import('./components/PatientEducationManager'));
const PatientPortalView = React.lazy(() => import('./components/PatientPortalView'));
const AdminCommunicationView = React.lazy(() => import('./components/AdminCommunicationView'));
const HospitalCommunicationView = React.lazy(() => import('./components/HospitalCommunicationView'));
const NeedsAssessmentManager = React.lazy(() => import('./components/NeedsAssessmentManager'));

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
  const [hospitals, setHospitals] = useState<Hospital[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [appScreen, setAppScreen] = useState<AppScreen>(AppScreen.Welcome);
  const [currentView, setCurrentView] = useState<View>(View.DepartmentList);
  const [selectedHospitalId, setSelectedHospitalId] = useState<string | null>(null);
  const [selectedDepartmentId, setSelectedDepartmentId] = useState<string | null>(null);
  const [selectedStaffId, setSelectedStaffId] = useState<string | null>(null);
  const [isAboutModalOpen, setIsAboutModalOpen] = useState(false);
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);
  const [loggedInUser, setLoggedInUser] = useState<LoggedInUser | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [activeYear, setActiveYear] = useState<number>(getInitialActiveYear());

  useEffect(() => {
    try {
        localStorage.setItem(ACTIVE_YEAR_KEY, String(activeYear));
    } catch (e) {
        console.error("Could not save active year to localStorage", e);
    }
  }, [activeYear]);

  const refreshData = useCallback(async () => {
      console.log("Refreshing data...");
      setIsLoading(true);
      const data = await db.syncAndAssembleData();
      setHospitals(data);
      setIsLoading(false);
      console.log("Data refresh complete.");
  }, []);

  useEffect(() => {
    refreshData();
    const unsubscribe = db.onRemoteChange(refreshData);
    return () => unsubscribe();
  }, [refreshData]);

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
    if (error) alert(`خطا در افزودن بیمارستان: ${error.message}`);
    else refreshData();
  };

  const handleAddDepartment = async (name: string, managerName: string, managerNationalId: string, managerPassword: string, staffCount: number, bedCount: number) => {
    if (!selectedHospitalId) return;
    const newDepartment: Department = { id: Date.now().toString(), name, managerName, managerNationalId, managerPassword, staffCount, bedCount, staff: [] };
    const { error } = await db.upsertDepartment(newDepartment, selectedHospitalId);
    if (error) alert(`خطا در افزودن بخش: ${error.message}`);
    else refreshData();
  };
  
  const handleAddStaff = async (departmentId: string, name: string, title: string, nationalId: string, password?: string) => {
    const newStaff: StaffMember = { id: Date.now().toString(), name, title, nationalId, password, assessments: [] };
    const { error } = await db.upsertStaff(newStaff, departmentId);
    if (error) alert(`خطا در افزودن پرسنل: ${error.message}`);
    else refreshData();
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
          if (error) alert(`خطا در ذخیره ارزیابی: ${error.message}`);
          else refreshData();
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
          if (error) alert(`خطا در ثبت آزمون: ${error.message}`);
          else refreshData();
      }
  };
  
  const handleUpdateDepartment = async (id: string, data: Partial<Omit<Department, 'id' | 'staff'>>) => {
      if (!selectedHospitalId) return;
      const hospital = findHospital(selectedHospitalId);
      const department = findDepartment(hospital, id);
      if (department) {
          const updatedDepartment = { ...department, ...data };
          const { error } = await db.upsertDepartment(updatedDepartment, selectedHospitalId);
          if (error) alert(`خطا در به‌روزرسانی بخش: ${error.message}`);
          else refreshData();
      }
  };

  const handleUpdateStaff = async (departmentId: string, staffId: string, data: Partial<Omit<StaffMember, 'id' | 'assessments'>>) => {
      const hospital = findHospital(selectedHospitalId);
      const department = findDepartment(hospital, departmentId);
      const staff = findStaffMember(department, staffId);
      if (staff) {
          const updatedStaff = { ...staff, ...data };
          const { error } = await db.upsertStaff(updatedStaff, departmentId);
          if (error) alert(`خطا در به‌روزرسانی پرسنل: ${error.message}`);
          else refreshData();
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
  
    const handleAddTrainingMaterial = async (month: string, fileData: FileUploadData) => {
        if (!selectedHospitalId) return;
        const hospital = findHospital(selectedHospitalId);
        if (!hospital) return;

        const { path, error: uploadError } = await db.uploadFileFromDataUrl(fileData.dataUrl, fileData.name);
        if (uploadError) {
            alert(`خطا در آپلود فایل: ${uploadError.message}`);
            return;
        }

        if (!hospital.trainingMaterials) hospital.trainingMaterials = [];
        let monthlyTraining = hospital.trainingMaterials.find(t => t.month === month);
        if (!monthlyTraining) {
            monthlyTraining = { month, materials: [] };
            hospital.trainingMaterials.push(monthlyTraining);
        }
        
        const newMaterial: TrainingMaterial = {
            id: Date.now().toString(),
            name: fileData.name,
            type: fileData.type,
            storagePath: path,
            description: fileData.description
        };

        monthlyTraining.materials.push(newMaterial);
        const { error: saveError } = await db.upsertHospital(hospital);
        if (saveError) alert(`Error: ${saveError.message}`); else refreshData();
    };

    const handleDeleteTrainingMaterial = async (month: string, materialId: string) => {
        if (!selectedHospitalId) return;
        const hospital = findHospital(selectedHospitalId);
        if (hospital?.trainingMaterials) {
            const monthlyTraining = hospital.trainingMaterials.find(t => t.month === month);
            if (monthlyTraining) {
                const materialToDelete = monthlyTraining.materials.find(m => m.id === materialId);
                if (materialToDelete) {
                    await db.deleteFile(materialToDelete.storagePath);
                }
                monthlyTraining.materials = monthlyTraining.materials.filter(m => m.id !== materialId);
            }
            const { error } = await db.upsertHospital(hospital);
            if (error) alert(`Error: ${error.message}`); else refreshData();
        }
    };

    const handleUpdateTrainingMaterialDescription = async (month: string, materialId: string, description: string) => {
        if (!selectedHospitalId) return;
        const hospital = findHospital(selectedHospitalId);
        if (hospital?.trainingMaterials) {
            const material = hospital.trainingMaterials.flatMap(t => t.materials).find(m => m.id === materialId);
            if (material) material.description = description;
            const { error } = await db.upsertHospital(hospital);
            if (error) alert(`Error: ${error.message}`); else refreshData();
        }
    };

    const handleAddAccreditationMaterial = async (fileData: FileUploadData) => {
        if (!selectedHospitalId) return;
        const hospital = findHospital(selectedHospitalId);
        if (hospital) {
            const { path, error: uploadError } = await db.uploadFileFromDataUrl(fileData.dataUrl, fileData.name);
            if (uploadError) { alert(`خطا در آپلود فایل: ${uploadError.message}`); return; }

            if (!hospital.accreditationMaterials) hospital.accreditationMaterials = [];
            const newMaterial: TrainingMaterial = { id: Date.now().toString(), name: fileData.name, type: fileData.type, storagePath: path, description: fileData.description };
            hospital.accreditationMaterials.push(newMaterial);
            const { error } = await db.upsertHospital(hospital);
            if (error) alert(`Error: ${error.message}`); else refreshData();
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
        const hospital = findHospital(selectedHospitalId);
        if (hospital) {
            const { path, error: uploadError } = await db.uploadFileFromDataUrl(fileData.dataUrl, fileData.name);
            if (uploadError) { alert(`خطا در آپلود فایل: ${uploadError.message}`); return; }
            
            if (!hospital.newsBanners) hospital.newsBanners = [];
            const newBanner: NewsBanner = { ...banner, id: Date.now().toString(), imageStoragePath: path };
            hospital.newsBanners.push(newBanner);
            const { error } = await db.upsertHospital(hospital);
            if (error) alert(`Error: ${error.message}`); else refreshData();
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
        if (!selectedDepartmentId) return;
        const hospital = findHospital(selectedHospitalId);
        const department = findDepartment(hospital, selectedDepartmentId);
        if (department) {
            const { path, error: uploadError } = await db.uploadFileFromDataUrl(fileData.dataUrl, fileData.name);
            if (uploadError) { alert(`خطا در آپلود فایل: ${uploadError.message}`); return; }

            if (!department.patientEducationMaterials) department.patientEducationMaterials = [];
            const newMaterial: TrainingMaterial = { id: Date.now().toString(), name: fileData.name, type: fileData.type, storagePath: path, description: fileData.description };
            department.patientEducationMaterials.push(newMaterial);
            const { error } = await db.upsertDepartment(department, selectedHospitalId!);
            if (error) alert(`Error: ${error.message}`); else refreshData();
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
    if (!selectedDepartmentId) return;
    const hospital = findHospital(selectedHospitalId);
    const department = findDepartment(hospital, selectedDepartmentId);
    if (department) {
        if (!department.patients) department.patients = [];
        const newPatient: Patient = { id: Date.now().toString(), name, nationalId, password, chatHistory: [] };
        department.patients.push(newPatient);
        const { error } = await db.upsertDepartment(department, selectedHospitalId!);
        if (error) alert(`Error: ${error.message}`); else refreshData();
    }
  };

  const handleDeletePatient = async (patientId: string) => {
    if (!selectedDepartmentId) return;
    const hospital = findHospital(selectedHospitalId);
    const department = findDepartment(hospital, selectedDepartmentId);
    if (department?.patients) {
        department.patients = department.patients.filter(p => p.id !== patientId);
        const { error } = await db.upsertDepartment(department, selectedHospitalId!);
        if (error) alert(`Error: ${error.message}`); else refreshData();
    }
  };

  const handleChatMessageSend = async (hospitalId: string, departmentId: string, patientId: string, sender: 'patient' | 'manager', content: { text?: string; fileData?: FileUploadData }) => {
      const hospital = findHospital(hospitalId);
      const department = findDepartment(hospital, departmentId);
      const patient = department?.patients?.find(p => p.id === patientId);
      if (!patient) return;

      let fileInfo: ChatMessage['file'] | undefined;
      if (content.fileData) {
          const { path, error } = await db.uploadFileFromDataUrl(content.fileData.dataUrl, content.fileData.name);
          if (error) { alert(`خطا در آپلود فایل: ${error.message}`); return; }
          fileInfo = { id: `file-${Date.now()}`, name: content.fileData.name, type: content.fileData.type, storagePath: path };
      }

      if (!patient.chatHistory) patient.chatHistory = [];
      const newMessage: ChatMessage = { id: Date.now().toString(), sender, timestamp: new Date().toISOString(), text: content.text, file: fileInfo };
      patient.chatHistory.push(newMessage);

      const { error } = await db.upsertDepartment(department!, hospitalId);
      if (error) alert(`خطا در ارسال پیام: ${error.message}`); else refreshData();
  };

  const handleAdminOrHospitalMessageSend = async (hospitalId: string, sender: 'hospital' | 'admin', content: { text?: string; fileData?: FileUploadData }) => {
      const hospital = findHospital(hospitalId);
      if (!hospital) return;

      let fileInfo: AdminMessage['file'] | undefined;
      if (content.fileData) {
          const { path, error } = await db.uploadFileFromDataUrl(content.fileData.dataUrl, content.fileData.name);
          if (error) { alert(`خطا در آپلود فایل: ${error.message}`); return; }
          fileInfo = { id: `file-${Date.now()}`, name: content.fileData.name, type: content.fileData.type, storagePath: path };
      }

      if (!hospital.adminMessages) hospital.adminMessages = [];
      const newMessage: AdminMessage = { id: Date.now().toString(), sender, timestamp: new Date().toISOString(), text: content.text, file: fileInfo };
      hospital.adminMessages.push(newMessage);
      const { error } = await db.upsertHospital(hospital);
      if (error) alert(`Error: ${error.message}`); else refreshData();
  };

  const handleUpdateNeedsAssessmentTopics = async (month: string, topics: NeedsAssessmentTopic[]) => {
    if (!selectedHospitalId) return;
    const hospital = findHospital(selectedHospitalId);
    if (hospital) {
        if (!hospital.needsAssessments) hospital.needsAssessments = [];
        let needsAssessment = hospital.needsAssessments.find(na => na.month === month && na.year === activeYear);
        if (needsAssessment) {
            needsAssessment.topics = topics;
        } else {
            const newNA: MonthlyNeedsAssessment = { month, year: activeYear, topics };
            hospital.needsAssessments.push(newNA);
        }
        const { error } = await db.upsertHospital(hospital);
        if (error) alert(`Error: ${error.message}`); else refreshData();
    }
  };

  const handleReplaceHospitalData = async (hospitalData: Hospital) => {
    const allHospitals = [...hospitals];
    const hospitalIndex = allHospitals.findIndex(h => h.id === hospitalData.id);
    if (hospitalIndex === -1) {
        alert('بیمارستان مورد نظر در پایگاه داده یافت نشد.');
        return;
    }
    allHospitals[hospitalIndex] = hospitalData;
    const { error } = await db.saveAllHospitals(allHospitals);
    if (error) {
        alert(`خطا در ذخیره اطلاعات بیمارستان: ${error.message}`);
    } else {
        alert('اطلاعات بیمارستان با موفقیت بارگذاری شد.');
        setHospitals(allHospitals);
    }
  };

  const handleReplaceDepartmentData = async (hospitalId: string, departmentData: Department) => {
      const allHospitals = [...hospitals];
      const hospital = allHospitals.find(h => h.id === hospitalId);
      if (!hospital) {
          alert('بیمارستان مورد نظر یافت نشد.');
          return;
      }
      const departmentIndex = hospital.departments.findIndex(d => d.id === departmentData.id);
      if (departmentIndex === -1) {
          alert('بخش مورد نظر در این بیمارستان یافت نشد.');
          return;
      }
      hospital.departments[departmentIndex] = departmentData;
      const { error } = await db.saveAllHospitals(allHospitals);
      if (error) {
          alert(`خطا در ذخیره اطلاعات بخش: ${error.message}`);
      } else {
          alert('اطلاعات بخش با موفقیت بارگذاری شد.');
          setHospitals(allHospitals);
      }
  };

  // --- Navigation & Auth ---
   const handleGoToWelcome = () => {
    setAppScreen(AppScreen.Welcome);
    setSelectedHospitalId(null);
    setSelectedDepartmentId(null);
    setSelectedStaffId(null);
    setCurrentView(View.DepartmentList);
    setLoggedInUser(null);
  }

  const handleSelectHospital = (id: string) => {
    setSelectedHospitalId(id);
    setAppScreen(AppScreen.MainApp);
    setCurrentView(View.DepartmentList);
  };

  const handleSelectDepartment = (id: string) => {
    setSelectedDepartmentId(id);
    setCurrentView(View.DepartmentView);
  };

  const handleSelectStaff = (id: string) => {
    setSelectedStaffId(id);
    setCurrentView(View.StaffMemberView);
  };

  const handleBack = () => {
    if (!loggedInUser) {
        handleLogout();
        return;
    }
    switch (currentView) {
      case View.StaffMemberView:
        if (loggedInUser.role === UserRole.Staff) { handleLogout(); return; }
        setSelectedStaffId(null);
        setCurrentView(View.DepartmentView);
        break;
      case View.ChecklistManager:
      case View.ExamManager:
      case View.TrainingManager:
      case View.PatientEducationManager:
        setCurrentView(View.DepartmentView);
        break;
      case View.DepartmentView:
        if (loggedInUser.role === UserRole.Manager) { handleLogout(); return; }
        setSelectedDepartmentId(null);
        setCurrentView(View.DepartmentList);
        break;
      case View.AccreditationManager:
      case View.NewsBannerManager:
      case View.HospitalCommunication:
      case View.AdminCommunication:
      case View.NeedsAssessmentManager:
        setCurrentView(View.DepartmentList);
        break;
      case View.DepartmentList:
         if (loggedInUser.role === UserRole.Supervisor) { handleLogout(); return; }
        setSelectedHospitalId(null);
        if (loggedInUser.role === UserRole.Admin) setAppScreen(AppScreen.HospitalList);
        else handleLogout();
        break;
    }
  };

  const handleLogin = async (nationalId: string, password: string) => {
      setLoginError(null);
      if (!nationalId || !password) { setLoginError('کد ملی و رمز عبور الزامی است.'); return; }
      
      const user = db.findUser(hospitals, nationalId, password);
      
      if(user) {
          setLoggedInUser(user);
          setIsLoginModalOpen(false);

          switch(user.role) {
            case UserRole.Admin: setAppScreen(AppScreen.HospitalList); break;
            case UserRole.Supervisor: handleSelectHospital(user.hospitalId!); break;
            case UserRole.Manager:
              handleSelectHospital(user.hospitalId!);
              handleSelectDepartment(user.departmentId!);
              break;
            case UserRole.Staff:
              handleSelectHospital(user.hospitalId!);
              handleSelectDepartment(user.departmentId!);
              handleSelectStaff(user.staffId!);
              break;
            case UserRole.Patient:
              const patientDept = findHospital(user.hospitalId!)?.departments.find(d => d.id === user.departmentId!);
              if (patientDept?.patients?.find(p => p.id === user.patientId!)) {
                  setSelectedHospitalId(user.hospitalId!);
                  setSelectedDepartmentId(user.departmentId!);
                  setAppScreen(AppScreen.MainApp);
                  setCurrentView(View.PatientPortal);
              } else {
                  setLoginError('اطلاعات بیمار یافت نشد.');
              }
              break;
          }
      } else {
          setLoginError('کد ملی یا رمز عبور نامعتبر است.');
      }
  };
  
  const handleLogout = () => {
      setLoggedInUser(null);
      handleGoToWelcome();
  };

  // --- Data Handlers for Backups ---
  const handleSaveData = () => {
      if (currentView === View.DepartmentList) {
        const hospital = findHospital(selectedHospitalId);
        if (!hospital) return;
        const dataToSave = { type: 'hospital_backup', hospitalId: hospital.id, data: hospital };
        const jsonString = `data:text/json;charset=utf-8,${encodeURIComponent(JSON.stringify(dataToSave, null, 2))}`;
        const link = document.createElement('a');
        link.href = jsonString;
        link.download = `پشتیبان_بیمارستان_${hospital.name.replace(/\s/g, '_')}.json`;
        link.click();
      } else if (currentView === View.DepartmentView) {
        const department = findDepartment(findHospital(selectedHospitalId), selectedDepartmentId);
        if (!department) return;
        const dataToSave = { type: 'department_backup', hospitalId: selectedHospitalId, departmentId: department.id, data: department };
        const jsonString = `data:text/json;charset=utf-8,${encodeURIComponent(JSON.stringify(dataToSave, null, 2))}`;
        const link = document.createElement('a');
        link.href = jsonString;
        link.download = `پشتیبان_بخش_${department.name.replace(/\s/g, '_')}.json`;
        link.click();
      } else { // Admin Full Backup
        const dataToSave = { type: 'full_backup_metadata_only', hospitals };
        const jsonString = `data:text/json;charset=utf-8,${encodeURIComponent(JSON.stringify(dataToSave, null, 2))}`;
        const link = document.createElement('a');
        link.href = jsonString;
        link.download = `skill_assessment_backup_${new Date().toISOString().split('T')[0]}.json`;
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

  const renderContent = () => {
    if (isLoading && appScreen === AppScreen.Welcome) {
        return <div className="h-screen w-screen flex items-center justify-center bg-slate-100 dark:bg-slate-900"><div className="text-center"><p className="text-xl font-semibold text-slate-700 dark:text-slate-300">در حال بارگذاری و همگام‌سازی اطلاعات...</p></div></div>;
    }

    const renderUnauthorized = () => {
        handleLogout();
        return <WelcomeScreen onEnter={() => setIsLoginModalOpen(true)} />;
    };

    if (appScreen === AppScreen.Welcome) {
      return <WelcomeScreen onEnter={() => setIsLoginModalOpen(true)} />;
    }
    
    if (!loggedInUser) return renderUnauthorized();

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
        onContactAdmin={() => setCurrentView(View.AdminCommunication)}
      />;
    }

    const selectedHospital = findHospital(selectedHospitalId);
    const selectedDepartment = findDepartment(selectedHospital, selectedDepartmentId);
    const selectedStaffMember = findStaffMember(selectedDepartment, selectedStaffId);

    if (!selectedHospital && appScreen === AppScreen.MainApp && loggedInUser.role !== UserRole.Patient) return renderUnauthorized();
    if (!selectedHospital) return <div>Hospital not found error.</div>;

    switch (currentView) {
      case View.DepartmentList:
        return <DepartmentList
          hospital={selectedHospital}
          onAddDepartment={handleAddDepartment}
          onUpdateDepartment={handleUpdateDepartment}
          onDeleteDepartment={async (id) => await db.deleteDepartment(id).then(res => !res.error && refreshData())}
          onSelectDepartment={handleSelectDepartment} onBack={handleBack} onManageAccreditation={() => setCurrentView(View.AccreditationManager)}
          onManageNewsBanners={() => setCurrentView(View.NewsBannerManager)} onManageNeedsAssessment={() => setCurrentView(View.NeedsAssessmentManager)}
          onResetHospital={handleResetHospital} onContactAdmin={() => setCurrentView(View.HospitalCommunication)}
          onArchiveYear={handleArchiveYear} userRole={loggedInUser.role} onReplaceHospitalData={handleReplaceHospitalData}
        />;
      case View.DepartmentView:
        if (!selectedDepartment) return <div>Department not found.</div>;
        return <DepartmentView
          department={selectedDepartment} hospitalId={selectedHospital.id} onBack={handleBack} onAddStaff={handleAddStaff} onUpdateStaff={handleUpdateStaff}
          onDeleteStaff={async (deptId, staffId) => await db.deleteStaff(staffId).then(res => !res.error && refreshData())}
          onSelectStaff={handleSelectStaff} onComprehensiveImport={handleComprehensiveImport}
          onManageChecklists={() => setCurrentView(View.ChecklistManager)} onManageExams={() => setCurrentView(View.ExamManager)}
          onManageTraining={() => setCurrentView(View.TrainingManager)} onManagePatientEducation={() => setCurrentView(View.PatientEducationManager)}
          onAddOrUpdateWorkLog={handleAddOrUpdateWorkLog} onReplaceDepartmentData={handleReplaceDepartmentData}
          userRole={loggedInUser.role} newsBanners={selectedHospital.newsBanners || []} activeYear={activeYear}
        />;
      case View.StaffMemberView:
        if (!selectedDepartment || !selectedStaffMember) return <div>Staff not found.</div>;
        return <StaffMemberView
          department={selectedDepartment} staffMember={selectedStaffMember} onBack={handleBack}
          onAddOrUpdateAssessment={handleAddOrUpdateAssessment} onUpdateAssessmentMessages={handleUpdateAssessmentMessages}
          onSubmitExam={handleSubmitExam} onSubmitNeedsAssessmentResponse={handleSubmitNeedsAssessmentResponse}
          checklistTemplates={selectedHospital.checklistTemplates || []} examTemplates={selectedHospital.examTemplates || []}
          trainingMaterials={selectedHospital.trainingMaterials || []} accreditationMaterials={selectedHospital.accreditationMaterials || []}
          newsBanners={selectedHospital.newsBanners || []} needsAssessments={selectedHospital.needsAssessments || []}
          userRole={loggedInUser.role} activeYear={activeYear} availableYears={allAvailableYears} onYearChange={setActiveYear}
        />;
      case View.ChecklistManager:
        return <ChecklistManager templates={selectedHospital.checklistTemplates || []} onAddOrUpdate={handleAddOrUpdateChecklistTemplate} onDelete={handleDeleteChecklistTemplate} onBack={handleBack} />;
      case View.ExamManager:
        return <ExamManager templates={selectedHospital.examTemplates || []} onAddOrUpdate={handleAddOrUpdateExamTemplate} onDelete={handleDeleteExamTemplate} onBack={handleBack} />;
      case View.TrainingManager:
        return <TrainingManager monthlyTrainings={selectedHospital.trainingMaterials || []} onAddMaterial={handleAddTrainingMaterial} onDeleteMaterial={handleDeleteTrainingMaterial} onUpdateMaterialDescription={handleUpdateTrainingMaterialDescription} onBack={handleBack} />;
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
      default:
        return <div>Unhandled view state.</div>;
    }
  };

  const showBackupButtons = loggedInUser && (
    (loggedInUser.role === UserRole.Admin && appScreen === AppScreen.HospitalList) ||
    ((loggedInUser.role === UserRole.Admin || loggedInUser.role === UserRole.Supervisor) && currentView === View.DepartmentList) ||
    ((loggedInUser.role === UserRole.Admin || loggedInUser.role === UserRole.Supervisor || loggedInUser.role === UserRole.Manager) && currentView === View.DepartmentView)
  );

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 transition-colors duration-300 flex flex-col">
        {appScreen !== AppScreen.Welcome && loggedInUser?.role !== UserRole.Patient && (
            <header className="sticky top-0 z-40 bg-gradient-to-r from-purple-600 to-indigo-700 shadow-lg text-white">
                <div className="container mx-auto px-4 sm:px-6 lg:px-8 h-16 flex justify-between items-center">
                    <div className="flex items-center gap-4">
                      {(loggedInUser && (appScreen === AppScreen.MainApp || appScreen === AppScreen.HospitalList)) && (
                          <button onClick={handleBack} className="p-2 rounded-full hover:bg-white/20 transition-colors">
                            <BackIcon className="w-6 h-6 text-cyan-300"/>
                          </button>
                      )}
                      <h1 className="text-xl font-bold">سامانه بیمارستان من</h1>
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
        <main className={`container mx-auto flex-grow ${appScreen !== AppScreen.Welcome ? 'py-8' : ''}`}>
          <Suspense fallback={<LoadingSpinner />}>
            {renderContent()}
          </Suspense>
        </main>
        {appScreen !== AppScreen.Welcome && <Footer />}
        <AboutModal isOpen={isAboutModalOpen} onClose={() => setIsAboutModalOpen(false)} />
        <LoginModal isOpen={isLoginModalOpen} onClose={() => setIsLoginModalOpen(false)} onLogin={handleLogin} loginError={loginError} />
    </div>
  );
};

export default App;