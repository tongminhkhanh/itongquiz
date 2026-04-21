/**
 * ítong Homework Types
 * Enterprise level data models for automated grading system
 */

export type AssignmentType = 'PDF' | 'IMAGE' | 'DOCX' | 'MIXED';

export interface HomeworkAssignment {
  id: string;
  title: string;
  description: string;
  subject: string;
  deadline: string;
  class_id: string;
  teacher_id: string;
  file_url: string; // Resource URL
  ai_content: string; // AI generated content/keys
  created_at: string;
  total_students?: number;
  submitted_count?: number;
}

export interface HomeworkSubmission {
  id: string;
  assignment_id: string;
  student_id: string;
  student_name: string;
  status: 'SUBMITTED' | 'GRADED';
  file_urls: string[]; // List of student image URLs
  student_note: string;
  teacher_feedback: string;
  ai_evaluation: string;
  score: number;
  submitted_at: string;
  analyticsData?: AnalyticsNode[];
}

export interface AnalyticsNode {
  questionId: string | number;
  score: number; // 0.0 to 1.0 (0=sai, 1=đúng, 0.5=đúng một nửa)
  label: string; // Tên hiển thị, vd: "Câu 1"
}

export interface HomeworkConfig {
  compressionQuality: number; // 0.1 to 1.0
  maxImageWidth: number;
  aiModel: string;
}
export interface AIResult {
  ocrText: string;
  score: number;
  confidence: number;
  feedback: string;
  criteriaBreakdown: Array<{
    label: string;
    score: number;
    maxScore: number;
    comment: string;
  }>;
  flaggedReason?: string | null;
}
