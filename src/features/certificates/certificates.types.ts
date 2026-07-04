export interface Certificate {
  id: string;
  batchId: string;
  title: string;
  teacherName: string;
  studentScore: number | null;
  quizTitle: string | null;
  pngUrl: string;       // R2 public URL
  issuedAt: string;     // ISO date string
  isRevoked?: boolean;
}

export interface FieldConfig {
  key: 'student_name' | 'score' | 'quiz_title' | 'date' | 'teacher_name' | 'custom_note';
  x: number;
  y: number;
  fontSize: number;
  fontWeight?: 'normal' | 'bold';
  color?: string;
  align?: 'left' | 'center' | 'right';
  maxWidth?: number;
}

export interface CertificateTemplate {
  id: string;
  name: string;
  bgImageUrl: string;
  fieldsConfig: FieldConfig[];
  isActive: boolean;
}
