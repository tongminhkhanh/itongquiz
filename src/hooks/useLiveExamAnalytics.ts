/**
 * Custom hook for Live Exam Analytics
 * Handles data fetching, polling, and caching
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { fetchAnalytics, SessionAnalytics } from '../services/liveExamAnalyticsService';

interface UseLiveExamAnalyticsOptions {
  sessionId: string;
  enabled?: boolean;
  pollingInterval?: number; // milliseconds
}

interface UseLiveExamAnalyticsReturn {
  analytics: SessionAnalytics | null;
  isLoading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

export function useLiveExamAnalytics({
  sessionId,
  enabled = true,
  pollingInterval = 5000, // 5 seconds
}: UseLiveExamAnalyticsOptions): UseLiveExamAnalyticsReturn {
  const [analytics, setAnalytics] = useState<SessionAnalytics | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const fetchData = useCallback(async () => {
    if (!enabled || !sessionId) return;

    try {
      setError(null);
      const data = await fetchAnalytics(sessionId);
      setAnalytics(data);
      setIsLoading(false);
    } catch (err: any) {
      console.error('Failed to fetch analytics:', err);
      setError(err.message || 'Failed to fetch analytics');
      setIsLoading(false);
    }
  }, [sessionId, enabled]);

  // Initial fetch
  useEffect(() => {
    if (enabled) {
      fetchData();
    }
  }, [enabled, fetchData]);

  // Polling for active sessions
  useEffect(() => {
    if (!enabled || !analytics) return;

    // Only poll if session is active (students still submitting)
    const shouldPoll = analytics.session.status === 'active' || 
                       analytics.progress.submittedCount < analytics.progress.totalParticipants;

    if (shouldPoll) {
      intervalRef.current = setInterval(fetchData, pollingInterval);
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [enabled, analytics, fetchData, pollingInterval]);

  const refetch = useCallback(async () => {
    setIsLoading(true);
    await fetchData();
  }, [fetchData]);

  return {
    analytics,
    isLoading,
    error,
    refetch,
  };
}
