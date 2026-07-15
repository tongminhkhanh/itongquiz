/**
 * Live Exam Analytics Service
 * Frontend service for fetching and tracking analytics data
 */

import { fetchWithJWTInterceptor } from '../utils/jwtInterceptor';

const REMOTE_WORKERS_API_URL = 'https://phieu.thitong.site';
const API_BASE = (import.meta.env.VITE_WORKERS_API_URL || REMOTE_WORKERS_API_URL).replace(/\/$/, '');
const TEACHER_JWT_STORAGE_KEY = 'itongquiz_teacher_jwt_token';
const STUDENT_JWT_STORAGE_KEY = 'itongquiz_jwt_token';

function getLiveExamApiBaseUrl(): string {
  if (import.meta.env.DEV && API_BASE === REMOTE_WORKERS_API_URL) {
    return '';
  }

  return API_BASE;
}

function getStudentJWTToken(): string {
  try {
    return localStorage.getItem(STUDENT_JWT_STORAGE_KEY) || '';
  } catch {
    return '';
  }
}

function getTeacherJWTToken(): string {
  try {
    const directToken = localStorage.getItem(TEACHER_JWT_STORAGE_KEY);
    if (directToken) return directToken;

    const authStorage = localStorage.getItem('auth-storage');
    if (!authStorage) return '';

    const parsed = JSON.parse(authStorage);
    return parsed?.state?.token || '';
  } catch {
    return '';
  }
}

export interface SessionAnalytics {
  session: {
    id: string;
    title: string;
    status: string;
    totalQuestions: number;
  };
  progress: {
    totalParticipants: number;
    submittedCount: number;
    submittedPercentage: number;
    notSubmittedStudents: Array<{
      username: string;
      joinedAt: string;
    }>;
  };
  scores: {
    distribution: Array<{
      range: string;
      count: number;
      percentage: number;
    }>;
    average: number;
    median: number;
    min: number;
    max: number;
    standardDeviation: number;
  };
  questions: Array<{
    questionIndex: number;
    questionText: string;
    correctRate: number;
    incorrectRate: number;
    avgTimeSeconds: number | null;
    minTimeSeconds: number | null;
    maxTimeSeconds: number | null;
  }>;
  topDifficultQuestions: Array<{
    questionIndex: number;
    questionText: string;
    correctRate: number;
    incorrectCount: number;
  }>;
}

/**
 * Fetch comprehensive analytics for a session
 */
export async function fetchAnalytics(sessionId: string): Promise<SessionAnalytics> {
  const jwtToken = getTeacherJWTToken();
  const response = await fetchWithJWTInterceptor(`${getLiveExamApiBaseUrl()}/api/live-exam/${sessionId}/analytics`, {
    method: 'GET',
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...(jwtToken ? { Authorization: `Bearer ${jwtToken}` } : {}),
    },
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Failed to fetch analytics' }));
    throw new Error(error.message || error.error || 'Failed to fetch analytics');
  }

  const data = await response.json();
  return data.analytics;
}

/**
 * Track time spent on a question (single)
 */
export async function trackQuestionTiming(
  sessionId: string,
  questionIndex: number,
  timeSpentSeconds: number
): Promise<void> {
  const studentToken = getStudentJWTToken();
  const response = await fetchWithJWTInterceptor(`${getLiveExamApiBaseUrl()}/api/live-exam/${sessionId}/track-timing`, {
    method: 'POST',
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...(studentToken ? { Authorization: `Bearer ${studentToken}` } : {}),
    },
    body: JSON.stringify({
      questionIndex,
      timeSpentSeconds,
    }),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Failed to track timing' }));
    throw new Error(error.message || error.error || 'Failed to track timing');
  }
}

/**
 * Track time spent on multiple questions (batch)
 */
export async function batchTrackQuestionTiming(
  sessionId: string,
  timings: Array<{ questionIndex: number; timeSpentSeconds: number }>
): Promise<void> {
  const studentToken = getStudentJWTToken();
  const response = await fetchWithJWTInterceptor(`${getLiveExamApiBaseUrl()}/api/live-exam/${sessionId}/track-timing`, {
    method: 'POST',
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...(studentToken ? { Authorization: `Bearer ${studentToken}` } : {}),
    },
    body: JSON.stringify({
      timings,
    }),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Failed to track timing' }));
    throw new Error(error.message || error.error || 'Failed to track timing');
  }
}
