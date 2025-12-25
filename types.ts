
export enum PaperType {
  PAPER_1 = 'PAPER_1',
  PAPER_2 = 'PAPER_2',
}

export enum AO {
  AO1 = 'AO1', // Identify / Interpret
  AO2 = 'AO2', // Language / Structure
  AO3 = 'AO3', // Compare
  AO4 = 'AO4', // Evaluate
  AO5 = 'AO5', // Content / Org
  AO6 = 'AO6', // Vocabulary / Grammar
}

export type ImageSize = '1K' | '2K' | '4K';

export interface Question {
  id: string;
  number: string;
  text: string;
  marks: number;
  aos: AO[];
  section: 'A' | 'B';
  sourceRef?: string; // e.g., "Source A lines 1-10"
  type: 'short' | 'long' | 'extended';
  wordCountTarget?: number;

  // New fields for writing options
  optionalGroup?: string; // If set, questions with same group are mutually exclusive (EITHER/OR)
  images?: string[]; // For visual prompts (Paper 1 Q6)
  imagePromptDescription?: string; // Description used to generate the image
}

export interface SourceText {
  id: string;
  title: string;
  author: string;
  year: string;
  content: string; // The full text
  summary: string;
}

export interface ExamPaper {
  id: string;
  type: PaperType;
  title: string;
  description: string;
  timeLimitMinutes: number;
  sources: SourceText[];
  questions: Question[];
}

export interface StudentAnswer {
  questionId: string;
  text: string;
  timestamp: number;
  isFlagged: boolean;
  selectedImageIndex?: number; // For questions with multiple image options
}

export interface ComparisonPoint {
  type: 'strength' | 'weakness' | 'missing' | 'improvement';
  text: string;
}

export interface MarkResult {
  questionId: string;
  score: number;
  maxScore: number;
  level: number; // Level 1-5
  feedback: string;
  aos: { [key in AO]?: number };
  modelAnswer: string;
  studentAnswer?: string; // Added to persist student's answer text
  comparisonPoints: ComparisonPoint[];
}

export interface ExamResult {
  totalScore: number;
  maxScore: number;
  gradeEstimate: string; // 1-9
  questionResults: MarkResult[];
  overallFeedback: string;
  date: string;
  generatedModelAnswers?: string;
  paperType: PaperType;
  duration?: number; // Duration in seconds
}

export interface AppState {
  currentView: 'landing' | 'loading' | 'exam' | 'marking' | 'results' | 'language-lab';
  selectedPaperType: PaperType | null;
  examData: ExamPaper | null;
  answers: Record<string, StudentAnswer>;
  examResult: ExamResult | null;
  apiKey: string | null;
}

export interface SystemUser {
  uid: string;
  email: string;
  displayName?: string;
  photoURL?: string;
  isAdmin: boolean;      // Admin role - can approve users
  isTeacher: boolean;    // Teacher role - can manage classes
  isSuperAdmin: boolean; // Super admin role - can change roles (derived from email, not stored)
  status: 'pending' | 'approved' | 'blocked';
  hasConsented: boolean;
  consentVersion?: string;
  consentedAt?: any;
  signUpMethod: 'email' | 'google';
}

export interface UserConsent {
  consentVersion: string;
  acceptedTerms: boolean;
  acceptedPrivacy: boolean;
  acceptedDisclaimers: boolean;
  confirmedAge13Plus: boolean;
  marketingOptIn: boolean;
  timestamp: any;
  ip?: string;
  userAgent?: string;
}

export interface ClassConfig {
  subject: string;
  yearGroup?: string;
  examBoard?: string;
  level: 'Foundation' | 'Higher' | 'Mixed';
  teacherPrompt?: string;
}

// Teacher Classroom Types

export interface Classroom {
  id: string;
  name: string;
  teacherId: string;
  inviteCode: string;
  studentCount: number;
  createdAt: number;
  config?: ClassConfig; // Added config
}

export interface ClassMember {
  uid: string;
  displayName: string;
  joinedAt: number;
}

export interface AssignmentSettings {
  timeLimitMinutes?: number;
  difficulty: 'Easy' | 'Medium' | 'Hard' | 'Mixed';
  topic: string;
}

export interface Assignment {
  id: string;
  classId: string;
  teacherId: string;
  title: string;
  questions: Question[];
  settings: AssignmentSettings;
  createdAt: number;
  status: 'active' | 'archived';
  dueDate?: number;
}

export interface AssignmentResult {
  id: string;
  assignmentId: string;
  classId: string;
  studentId: string;
  studentName: string;
  score: number;
  maxScore: number;
  answers: StudentAnswer[];
  completedAt: number;
  feedback: string;
}
