import { useCallback, useEffect, useMemo, useState } from 'react';
import { useAssignmentStore } from '@/src/stores/useAssignmentStore';
import { useQuizStore } from '@/stores/quizStore';
import type { AssignedQuiz } from '@/src/components/HomePage/student-dashboard';
import { getAssignmentVisualState } from '@/src/components/HomePage/student-dashboard';
import {
  ASSIGNMENTS_PER_PAGE,
  buildAssignedQuizzes,
} from '../model';

export const useStudentAssignments = (studentId?: string) => {
  const assignments = useAssignmentStore((state) => state.assignments);
  const fetchStudentAssignments = useAssignmentStore((state) => state.fetchStudentAssignments);
  const quizzes = useQuizStore((state) => state.quizzes);
  const selectQuiz = useQuizStore((state) => state.selectQuiz);
  const setView = useQuizStore((state) => state.setView);
  const [page, setPage] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const fetchAssignments = useCallback(async () => {
    setIsLoading(true);
    setErrorMessage(null);
    try {
      if (studentId) {
        await fetchStudentAssignments(studentId);
        const storeError = useAssignmentStore.getState().error;
        if (storeError) throw new Error(storeError);
      }
    } catch (error) {
      console.error('Failed to fetch assignments:', error);
      setErrorMessage('Chưa tải được bài giáo viên giao. Em hãy thử lại.');
    } finally {
      setIsLoading(false);
    }
  }, [fetchStudentAssignments, studentId]);

  useEffect(() => {
    void fetchAssignments();
  }, [fetchAssignments]);

  const allQuizzes = useMemo(
    () => buildAssignedQuizzes(assignments, quizzes),
    [assignments, quizzes],
  );
  const totalPages = Math.max(1, Math.ceil(allQuizzes.length / ASSIGNMENTS_PER_PAGE));
  const pagedQuizzes = useMemo(() => {
    const start = (page - 1) * ASSIGNMENTS_PER_PAGE;
    return allQuizzes.slice(start, start + ASSIGNMENTS_PER_PAGE);
  }, [allQuizzes, page]);
  const hasReadyAssignment = useMemo(
    () => allQuizzes.some((quiz) => getAssignmentVisualState(quiz) === 'ready'),
    [allQuizzes],
  );

  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [page, totalPages]);

  const startQuiz = useCallback((quiz: AssignedQuiz) => {
    selectQuiz(quiz);
    setView('student');
  }, [selectQuiz, setView]);

  const scrollToPrimaryTarget = useCallback(() => {
    const targetId = hasReadyAssignment ? 'assigned-work' : 'practice-library';
    document.getElementById(targetId)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, [hasReadyAssignment]);

  return {
    pagedQuizzes,
    page,
    totalPages,
    isLoading,
    errorMessage,
    hasReadyAssignment,
    setPage,
    retry: fetchAssignments,
    startQuiz,
    scrollToPrimaryTarget,
  };
};

export type StudentAssignmentsController = ReturnType<typeof useStudentAssignments>;
