import type { Assignment, Quiz } from '@/src/types';
import type { AssignedQuiz } from '@/src/components/HomePage/student-dashboard';

const parseDate = (value?: string, fallback = 0) => {
  const timestamp = Date.parse(value || '');
  return Number.isFinite(timestamp) ? timestamp : fallback;
};

export const buildAssignedQuizzes = (
  assignments: Assignment[],
  quizzes: Quiz[],
): AssignedQuiz[] => assignments.map((assignment) => {
  const realQuiz = quizzes.find((quiz) => quiz.id === assignment.quizId);
  if (realQuiz) return { ...realQuiz, _assignmentData: assignment } as AssignedQuiz;
  return {
    id: assignment.quizId,
    title: assignment.quizTitle || 'Bài tập được giao',
    category: 'class', questions: [], duration: 0, timeLimit: 0,
    requireCode: false, allowReview: false, classLevel: '', subject: 'class',
    createdAt: assignment.createdAt, maxScore: 0, _assignmentData: assignment,
  } as AssignedQuiz;
}).sort((first, second) => {
  const firstAssignment = first._assignmentData;
  const secondAssignment = second._assignmentData;
  const firstAttempts = Number(firstAssignment?.attemptCount) || 0;
  const secondAttempts = Number(secondAssignment?.attemptCount) || 0;
  const firstMax = Math.max(1, Number(firstAssignment?.maxAttempts) || 1);
  const secondMax = Math.max(1, Number(secondAssignment?.maxAttempts) || 1);
  const firstCompleted = firstAttempts >= firstMax;
  const secondCompleted = secondAttempts >= secondMax;

  if (firstCompleted !== secondCompleted) return firstCompleted ? 1 : -1;
  if (!firstCompleted && !secondCompleted) {
    const firstDeadline = parseDate(firstAssignment?.deadline, Number.MAX_SAFE_INTEGER);
    const secondDeadline = parseDate(secondAssignment?.deadline, Number.MAX_SAFE_INTEGER);
    if (firstDeadline !== secondDeadline) return firstDeadline - secondDeadline;
  }
  const firstCreated = parseDate(firstAssignment?.createdAt);
  const secondCreated = parseDate(secondAssignment?.createdAt);
  if (firstCreated !== secondCreated) return secondCreated - firstCreated;
  return String(first.title || '').localeCompare(String(second.title || ''), 'vi');
});
