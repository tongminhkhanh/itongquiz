import { WORKERS_API_URL } from '../../../config/constants';
import type {
  CertificatePreviewInput,
  ClassOption,
  QuizOption,
  ResultRecord,
  StudentOption,
} from './types';

const getTeacherJwt = (): string => {
  try {
    const direct = localStorage.getItem('itongquiz_teacher_jwt_token');
    if (direct) return direct;
    const raw = localStorage.getItem('auth-storage');
    return raw ? JSON.parse(raw)?.state?.token || '' : '';
  } catch {
    return '';
  }
};

const authHeaders = (): HeadersInit => ({
  'Content-Type': 'application/json',
  Authorization: `Bearer ${getTeacherJwt()}`,
});
const apiBase = () => (WORKERS_API_URL || '').replace(/\/$/, '');

export const fetchClassOptions = async (): Promise<ClassOption[]> => {
  const response = await fetch(`${apiBase()}/api/classes`, { headers: authHeaders() });
  const payload = await response.json() as { data?: ClassOption[] };
  return payload.data ?? [];
};

export const fetchQuizOptions = async (): Promise<QuizOption[]> => {
  const response = await fetch(`${apiBase()}/api/quizzes`, { headers: authHeaders() });
  const payload = await response.json() as QuizOption[];
  return Array.isArray(payload) ? payload : [];
};

export const fetchClassStudents = async (classId: string): Promise<StudentOption[]> => {
  const response = await fetch(`${apiBase()}/api/students?classId=${classId}`, { headers: authHeaders() });
  const payload = await response.json() as { data?: StudentOption[] };
  return payload.data ?? [];
};

export const fetchQuizResults = async (quizId: string): Promise<ResultRecord[]> => {
  const response = await fetch(`${apiBase()}/api/results?quizId=${quizId}&limit=200`, { headers: authHeaders() });
  const payload = await response.json() as { data?: ResultRecord[] };
  return payload.data ?? [];
};

export const renderCertificatePreview = async (input: CertificatePreviewInput): Promise<Blob> => {
  const response = await fetch(`${apiBase()}/api/certificates/render-preview`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify({
      template_id: input.templateId,
      class_id: input.classId,
      quiz_id: input.quizId || undefined,
      student_id: input.studentId,
      achievement_prefix: input.achievementPrefix.trim(),
      date_line: input.dateLine.trim(),
    }),
  });
  if (!response.ok) {
    const payload = await response.json().catch(() => null) as { error?: { message?: string } } | null;
    throw new Error(payload?.error?.message || `Không thể tạo ảnh xem trước (${response.status})`);
  }
  return response.blob();
};
