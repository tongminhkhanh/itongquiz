import { useCallback, useEffect, useState } from 'react';
import { useQuizStore } from '../../../../stores/quizStore';

import { cacheService } from '../../../services/CacheService';
import type { ResultsLoadState } from './types';

export const useTeacherDashboardBootstrap = () => {
  const quizStore = useQuizStore();
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

    cacheService.invalidatePrefix('quizzes:');
    quizStore.loadQuizzes();
    void loadTeacherResults();
  }, [loadTeacherResults]);

  return { resultsLoadState, resultsLoadError, loadTeacherResults };
};
