import { useCallback, useEffect, useState } from 'react';
import { useQuizStore } from '../../../../stores/quizStore';
import { setStripAnswersEnabled } from '../../../services/googleSheetService';
import { cacheService } from '../../../services/CacheService';
import { checkAndWarnJWTExpiry } from '../../../utils/jwtInterceptor';
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
    setStripAnswersEnabled(false);
    cacheService.invalidatePrefix('quizzes:');
    quizStore.loadQuizzes();
    void loadTeacherResults();
    checkAndWarnJWTExpiry();
    const expiryCheckInterval = setInterval(checkAndWarnJWTExpiry, 5 * 60 * 1000);
    return () => {
      setStripAnswersEnabled(true);
      clearInterval(expiryCheckInterval);
    };
  }, [loadTeacherResults]);

  return { resultsLoadState, resultsLoadError, loadTeacherResults };
};
