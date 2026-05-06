/**
 * useLiveExamStatus Hook
 * 
 * Polls live exam session status every 3 seconds.
 * Used by students to track session state and timer.
 * 
 * Related: ADR-0001 (Polling)
 */

import { useState, useEffect, useRef } from 'react';
import type { LiveExamStatusResponse } from '../types/liveExam.types';

const POLL_INTERVAL = 3000; // 3 seconds
const API_BASE = import.meta.env.VITE_API_URL || '/api';

interface UseLiveExamStatusOptions {
    sessionId: string;
    enabled?: boolean; // Allow pausing polling
}

interface UseLiveExamStatusReturn {
    status: LiveExamStatusResponse | null;
    isLoading: boolean;
    error: string | null;
    refetch: () => Promise<void>;
}

export function useLiveExamStatus({
    sessionId,
    enabled = true,
}: UseLiveExamStatusOptions): UseLiveExamStatusReturn {
    const [status, setStatus] = useState<LiveExamStatusResponse | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const intervalRef = useRef<NodeJS.Timeout | null>(null);
    const isMountedRef = useRef(true);

    const fetchStatus = async () => {
        try {
            const response = await fetch(`${API_BASE}/live-exam/${sessionId}/status`, {
                credentials: 'include', // Include cookies for JWT
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.error || `HTTP ${response.status}`);
            }

            const data = await response.json();

            if (isMountedRef.current) {
                setStatus(data);
                setError(null);
                setIsLoading(false);
            }
        } catch (err: any) {
            console.error('[useLiveExamStatus] Error:', err);
            if (isMountedRef.current) {
                setError(err.message || 'Failed to fetch status');
                setIsLoading(false);
            }
        }
    };

    useEffect(() => {
        isMountedRef.current = true;

        if (!enabled) {
            // Clear interval if polling is disabled
            if (intervalRef.current) {
                clearInterval(intervalRef.current);
                intervalRef.current = null;
            }
            return;
        }

        // Initial fetch
        fetchStatus();

        // Start polling
        intervalRef.current = setInterval(fetchStatus, POLL_INTERVAL);

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
        status,
        isLoading,
        error,
        refetch: fetchStatus,
    };
}
