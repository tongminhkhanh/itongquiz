/**
 * useLiveExamParticipants Hook
 * 
 * Polls live exam participants every 3 seconds.
 * Used by teachers to monitor student progress.
 * 
 * Related: ADR-0001 (Polling)
 */

import { useState, useEffect, useRef } from 'react';
import type { LiveExamParticipantsResponse } from '../types/liveExam.types';
import { getParticipants as fetchLiveExamParticipants } from '../services/liveExamService';

const POLL_INTERVAL = 3000; // 3 seconds
interface UseLiveExamParticipantsOptions {
    sessionId: string;
    enabled?: boolean;
}

interface UseLiveExamParticipantsReturn {
    participants: LiveExamParticipantsResponse['participants'];
    totalCount: number;
    submittedCount: number;
    onlineCount: number;
    isLoading: boolean;
    error: string | null;
    refetch: () => Promise<void>;
}

export function useLiveExamParticipants({
    sessionId,
    enabled = true,
}: UseLiveExamParticipantsOptions): UseLiveExamParticipantsReturn {
    const [data, setData] = useState<LiveExamParticipantsResponse | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const intervalRef = useRef<NodeJS.Timeout | null>(null);
    const isMountedRef = useRef(true);

    const fetchParticipants = async () => {
        try {
            const result = await fetchLiveExamParticipants(sessionId);

            if (isMountedRef.current) {
                setData(result);
                setError(null);
                setIsLoading(false);
            }
        } catch (err: any) {
            console.error('[useLiveExamParticipants] Error:', err);
            if (isMountedRef.current) {
                setError(err.message || 'Failed to fetch participants');
                setIsLoading(false);
            }
        }
    };

    useEffect(() => {
        isMountedRef.current = true;

        if (!enabled) {
            if (intervalRef.current) {
                clearInterval(intervalRef.current);
                intervalRef.current = null;
            }
            return;
        }

        // Initial fetch
        fetchParticipants();

        // Start polling
        intervalRef.current = setInterval(fetchParticipants, POLL_INTERVAL);

        // Cleanup
        return () => {
            isMountedRef.current = false;
            if (intervalRef.current) {
                clearInterval(intervalRef.current);
                intervalRef.current = null;
            }
        };
    }, [sessionId, enabled]);

    return {
        participants: data?.participants || [],
        totalCount: data?.totalCount || 0,
        submittedCount: data?.submittedCount || 0,
        onlineCount: data?.onlineCount || 0,
        isLoading,
        error,
        refetch: fetchParticipants,
    };
}
