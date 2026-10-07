

export interface SkillItem {
  description: string;
  score: number;
  radif?: number;
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

export interface StaffChecklistEvaluation {
  id: string;
  templateId: string;
  templateName: string;
  evaluatorName: string;
  date: string;
  year: number;
  month?: string;
  overallScore: number;
  maxScore: number;
  percentage: number;
  notes?: string;
  categories: {
    name: string;
    items: {
      description: string;
      score: number;
      maxScore: number;
      responseType?: ChecklistResponseType;
      selectedOption?: string;
      comment?: string;
    }[];
    categoryScore: number;
    categoryMaxScore: number;
  }[];
}

export interface StaffMember {
  id: string;
  name: string;
  title: string;
  nationalId?: string;
  password?: string;
  assessments: Assessment[];
  workLogs?: MonthlyWorkLog[];
  checklistEvaluations?: StaffChecklistEvaluation[];
}

export type ChecklistResponseType = 'descriptive' | 'multiple_choice' | 'qualitative';

export interface ChecklistOption {
  text: string;
  score: number;
}

export interface ChecklistQualitativeLevel {
  label: string;
  score: number;
  color?: string;
}

export interface ChecklistItemTemplate {
  id: string;
  description: string;
  responseType?: ChecklistResponseType;
  maxScore?: number;
  options?: ChecklistOption[];
  qualitativeScale?: '5_scale' | '3_scale' | 'custom';
  qualitativeLevels?: ChecklistQualitativeLevel[];
  helpText?: string;
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
  createdAt?: string;
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
  month?: string; // Optional/legacy
  createdAt?: string;
  isActive?: boolean; // Active or inactive status
  questionCountToDisplay?: number; // Number of questions to randomly display (e.g. 10 out of 30)
  randomizeQuestions?: boolean; // Shuffle question order and options
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
    storagePath: string;
  }
}

export interface Patient {
  id: string;
  name: string;
  nationalId: string;
  password?: string;
  chatHistory?: ChatMessage[];
}

export interface CustomCorrectiveAction {
  id: string;
  departmentId: string;
  title: string;
  description: string;
  responsiblePerson: string;
  deadline?: string;
  priority: 'high' | 'medium' | 'low';
  status: 'pending' | 'in_progress' | 'completed';
  createdAt: string;
  month?: string;
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
  trainingMaterials?: MonthlyTraining[]; // Moved from Hospital to here
  patients?: Patient[];
  correctiveActions?: CustomCorrectiveAction[];
  checklistTemplates?: NamedChecklistTemplate[];
}

export interface TrainingMaterial {
  id: string;
  name: string;
  type: string; // Mime type or 'article'
  storagePath: string; 
  description?: string;
  createdAt?: string;
  articleContent?: string; // Rich article HTML with formatted text, images, videos, and links
  videoUrl?: string; // Optional direct video URL (e.g. MP4 link or Aparat link)
}

export interface MonthlyTraining {
  month: string;
  materials: TrainingMaterial[];
}

export interface NewsBanner {
    id: string;
    title: string;
    description: string;
    imageStoragePath: string;
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
    storagePath: string;
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


export interface SensitiveIndicatorPeriodData {
  numerator?: number | null;
  denominator?: number | null;
  rate?: number | null;
}

export interface SensitiveIndicatorDeptRow {
  radif?: number;
  departmentName: string;
  spring?: SensitiveIndicatorPeriodData;
  summer?: SensitiveIndicatorPeriodData;
  autumn?: SensitiveIndicatorPeriodData;
  winter?: SensitiveIndicatorPeriodData;
  firstHalf?: SensitiveIndicatorPeriodData;
  secondHalf?: SensitiveIndicatorPeriodData;
  annual?: SensitiveIndicatorPeriodData;
}

export interface SensitiveIndicatorDetail {
  sheetName: string;
  title: string;
  pattern: 'A' | 'A2' | 'B' | 'C';
  description?: string;
  numeratorLabel?: string;
  denominatorLabel?: string;
  departments: SensitiveIndicatorDeptRow[];
  allStaffSummary?: {
    spring?: number | null;
    summer?: number | null;
    autumn?: number | null;
    winter?: number | null;
    firstHalf?: number | null;
    secondHalf?: number | null;
    annual?: number | null;
  };
  overallSummary?: {
    spring?: number | null;
    summer?: number | null;
    autumn?: number | null;
    winter?: number | null;
    firstHalf?: number | null;
    secondHalf?: number | null;
    annual?: number | null;
  };
}

export interface SensitiveIndicatorsReport {
  hospitalInfo: {
    year?: string;
    university?: string;
    hospitalName?: string;
    ownershipType?: string;
    inpatientDeptCount?: number;
    outpatientUnitCount?: number;
  };
  inpatientDepts: string[];
  outpatientUnits: string[];
  overview: Array<{
    indicatorName: string;
    spring?: number | null;
    summer?: number | null;
    autumn?: number | null;
    winter?: number | null;
    firstHalf?: number | null;
    secondHalf?: number | null;
    annual?: number | null;
  }>;
  indicators: SensitiveIndicatorDetail[];
  aiAnalysis?: string;
  uploadedAt?: string;
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
  accreditationMaterials?: TrainingMaterial[];
  newsBanners?: NewsBanner[];
  adminMessages?: AdminMessage[];
  needsAssessments?: MonthlyNeedsAssessment[];
  sensitiveIndicatorsReport?: SensitiveIndicatorsReport;
  isActive?: boolean;
}

export interface ProvincialOfficer {
  id: string;
  name: string;
  nationalId: string;
  password: string;
  province: string;
  createdAt?: string;
}

export interface ArchivedArticleTemplate {
  id: string;
  title: string;
  description?: string;
  content: string;
  videoUrl?: string;
  createdAt: string;
  authorName?: string;
}

export interface AppAboutInfo {
  title: string;
  description: string;
  features: string[];
  closingPoem?: string;
  creatorName: string;
  creatorEmail: string;
  aparatUrl: string;
  version: string;
}

export enum AppScreen {
  Welcome,
  HospitalList,
  MainApp,
  SuperAdmin,
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
  CorrectiveActions,
  SensitiveIndicators,
}

export enum UserRole {
  Admin,
  Supervisor,
  Manager,
  Staff,
  Patient,
  ProvincialOfficer,
}

export interface LoggedInUser {
  role: UserRole;
  name: string;
  hospitalId?: string;
  departmentId?: string;
  staffId?: string;
  patientId?: string;
  province?: string;
  officerId?: string;
}