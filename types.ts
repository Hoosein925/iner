



export interface SkillItem {
  description: string;
  score: number;
}

export interface SkillCategory {
  name: string;
  items: SkillItem[];
}

export interface Assessment {
  id: string;
  month: string;
  year: number;
  skillCategories: SkillCategory[];
  supervisorMessage?: string;
  managerMessage?: string;
  templateId?: string; // ID of the template used
  minScore?: number;   // Score range snapshot at time of assessment
  maxScore?: number;   // Score range snapshot at time of assessment
  examSubmissions?: ExamSubmission[];
}

export interface MonthlyWorkLog {
  month: string;
  year: number;
  overtimeHours: number;
  requiredHours: number;
  leaveTakenInMonth: number;
  annualLeaveRemaining: number;
  workExperienceInYears?: number;
}

export interface StaffMember {
  id: string;
  name: string;
  title: string;
  nationalId?: string;
  password?: string;
  assessments: Assessment[];
  workLogs?: MonthlyWorkLog[];
}

export interface ChecklistItemTemplate {
  id: string;
  description: string;
}

export interface ChecklistCategoryTemplate {
  id: string;
  name: string;
  items: ChecklistItemTemplate[];
}

export interface NamedChecklistTemplate {
  id: string;
  name: string;
  categories: ChecklistCategoryTemplate[];
  minScore?: number;
  maxScore?: number;
}

export enum QuestionType {
  MultipleChoice = 'multiple-choice',
  Descriptive = 'descriptive',
}

export interface Question {
  id: string;
  text: string;
  type: QuestionType;
  options?: string[];
  correctAnswer: string; // for MC, it's the option text. for descriptive, it's the model answer.
}

export interface ExamTemplate {
  id: string;
  name: string;
  questions: Question[];
  month?: string; // Month for the exam, or 'عمومی' for all months
}

export interface ExamAnswer {
    questionId: string;
    answer: string;
}

export interface ExamSubmission {
  id: string;
  examTemplateId: string;
  examName: string; // denormalize for easier display
  answers: ExamAnswer[];
  score: number; // Correct answers
  totalCorrectableQuestions: number; // Total multiple choice questions
  submissionDate: string;
  questions: Question[]; // Snapshot of questions at time of submission
}

export interface ChatMessage {
  id: string;
  sender: 'patient' | 'manager';
  timestamp: string;
  text?: string;
  file?: {
    id: string;
    name: string;
    type: string;
  }
}

export interface Patient {
  id: string;
  name: string;
  nationalId: string;
  password?: string;
  chatHistory?: ChatMessage[];
}

export interface Department {
  id: string;
  name: string;
  managerName: string;
  managerNationalId: string;
  managerPassword: string;
  staffCount: number;
  bedCount: number;
  staff: StaffMember[];
  patientEducationMaterials?: TrainingMaterial[];
  patients?: Patient[];
}

export interface TrainingMaterial {
  id: string;
  name: string;
  type: string; // Mime type
  data?: string; // Base64 encoded data URL
  description?: string;
}

export interface MonthlyTraining {
  month: string;
  materials: TrainingMaterial[];
}

export interface NewsBanner {
    id: string;
    title: string;
    description: string;
    imageId: string; // a reference to the image data stored in IndexedDB
}

export interface AdminMessage {
  id: string;
  sender: 'hospital' | 'admin';
  timestamp: string;
  text?: string;
  file?: {
    id: string;
    name: string;
    type: string;
  }
}

// --- Needs Assessment Types ---
export interface NeedsAssessmentResponse {
  staffId: string;
  staffName: string;
  response: string;
}

export interface NeedsAssessmentTopic {
  id: string;
  title: string;
  description?: string;
  responses: NeedsAssessmentResponse[];
}

export interface MonthlyNeedsAssessment {
  month: string;
  year: number;
  topics: NeedsAssessmentTopic[];
}


export interface Hospital {
  id: string;
  name: string;
  province: string;
  city: string;
  supervisorName?: string;
  supervisorNationalId?: string;
  supervisorPassword?: string;
  departments: Department[];
  checklistTemplates?: NamedChecklistTemplate[];
  examTemplates?: ExamTemplate[];
  trainingMaterials?: MonthlyTraining[];
  accreditationMaterials?: TrainingMaterial[];
  newsBanners?: NewsBanner[];
  adminMessages?: AdminMessage[];
  needsAssessments?: MonthlyNeedsAssessment[];
}

export enum AppScreen {
  Welcome,
  HospitalList,
  MainApp,
}

export enum View {
  DepartmentList,
  DepartmentView,
  StaffMemberView,
  ChecklistManager,
  ExamManager,
  TrainingManager,
  AccreditationManager,
  NewsBannerManager,
  PatientEducationManager,
  PatientPortal,
  HospitalCommunication,
  AdminCommunication,
  NeedsAssessmentManager,
}

export enum UserRole {
  Admin,
  Supervisor,
  Manager,
  Staff,
  Patient,
}

export interface LoggedInUser {
  role: UserRole;
  name: string;
  hospitalId?: string;
  departmentId?: string;
  staffId?: string;
  patientId?: string;
}