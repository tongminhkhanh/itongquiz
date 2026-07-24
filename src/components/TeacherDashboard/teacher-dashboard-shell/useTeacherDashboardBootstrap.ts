import { useCallback, useEffect, useState } from 'react';
import { useQuizStore } from '../../../../stores/quizStore';
import type { ResultsLoadState } from './types';

export const useTeacherDashboardBootstrap = () => {
  const loadQuizzes = useQuizStore((state) => state.loadQuizzes);
  const [resultsLoadState, setResultsLoadState] = useState<ResultsLoadState>('loading');
  const [resultsLoadError, setResultsLoadError] = useState<string | null>(null);

  const loadTeacherResults = useCallback(async () => {
    setResultsLoadState('loading');
    setResultsLoadError(null);
    useQuizStore.getState().setError(null);
    await useQuizStore.getState().loadResults();
    const loadError = useQuizStore.getState().error;
    if (loadError) {
      setResultsLoadState('error');
      setResultsLoadError(loadError);
      return;
    }
    setResultsLoadState('success');
  }, []);

  useEffect(() => {
    void loadQuizzes();
    void loadTeacherResults();
  }, [loadQuizzes, loadTeacherResults]);

  return { resultsLoadState, resultsLoadError, loadTeacherResults };
};
