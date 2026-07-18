import { useMemo, useState } from 'react';
import { useQuizStore } from '@/stores/quizStore';
import { buildSubjectCards } from '../model';

export const useStudentPracticeCatalog = () => {
  const quizzes = useQuizStore((state) => state.quizzes);
  const [selectedSubject, setSelectedSubject] = useState<string | null>(null);
  const subjects = useMemo(() => buildSubjectCards(quizzes), [quizzes]);

  return {
    quizzes,
    subjects,
    selectedSubject,
    selectSubject: setSelectedSubject,
    closeSubject: () => setSelectedSubject(null),
  };
};

export type StudentPracticeCatalogController = ReturnType<typeof useStudentPracticeCatalog>;
