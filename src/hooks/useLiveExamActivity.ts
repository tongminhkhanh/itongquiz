/**
 * useLiveExamActivity Hook
 * 
 * Sends activity updates to track student progress.
 * Updates are sent with every status poll (every 3 seconds).
 * 
 * Related: ADR-0001 (Polling)
 */

import { useState, useCallback } from 'react';

const API_BASE = import.meta.env.VITE_API_URL || '/api';

interface ActivityData {
    currentQuestion?: number;
    answeredCount: number;
}

interface UseLiveExamActivityOptions {
    sessionId: string;
}

interface UseLiveExamActivityReturn {
    updateActivity: (data: ActivityData) => Promise<void>;
    isUpdating: boolean;
    error: string | null;
}

export function useLiveExamActivity({
    sessionId,
}: UseLiveExamActivityOptions): UseLiveExamActivityReturn {
    const [isUpdating, setIsUpdating] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const updateActivity = useCallback(
        async (data: ActivityData) => {
            setIsUpdating(true);
            setError(null);

            try {
                const response = await fetch(`${API_BASE}/live-exam/${sessionId}/activity`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    credentials: 'include',
                    body: JSON.stringify(data),
                });

                if (!response.ok) {
                    const errorData = await response.json().catch(() => ({}));
                    throw new Error(errorData.error || `HTTP ${response.status}`);
                }

                // Success - activity updated
            } catch (err: any) {
                console.error('[useLiveExamActivity] Error:', err);
                setError(err.message || 'Failed to update activity');
                // Don't throw - activity updates are non-critical
            } finally {
                setIsUpdating(false);
            }
        },
        [sessionId]
    );

    return {
        updateActivity,
        isUpdating,
        error,
    };
}
