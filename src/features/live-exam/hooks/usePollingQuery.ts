import { useCallback, useEffect, useRef, useState } from 'react';

interface UsePollingQueryOptions<TData> {
    enabled?: boolean;
    intervalMs: number;
    fetcher: () => Promise<TData>;
    shouldPoll?: (data: TData | null) => boolean;
    errorLabel: string;
    fallbackError: string;
}

interface UsePollingQueryReturn<TData> {
    data: TData | null;
    isLoading: boolean;
    error: string | null;
    refetch: () => Promise<void>;
}

const getErrorMessage = (error: unknown, fallback: string): string => {
    if (error instanceof Error && error.message) return error.message;
    return fallback;
};

export function usePollingQuery<TData>({
    enabled = true,
    intervalMs,
    fetcher,
    shouldPoll = () => true,
    errorLabel,
    fallbackError,
}: UsePollingQueryOptions<TData>): UsePollingQueryReturn<TData> {
    const [data, setData] = useState<TData | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const dataRef = useRef<TData | null>(null);
    const requestSeqRef = useRef(0);
    const shouldPollRef = useRef(shouldPoll);
    const isMountedRef = useRef(true);

    useEffect(() => {
        shouldPollRef.current = shouldPoll;
    }, [shouldPoll]);

    const runFetch = useCallback(async ({ showLoading = false }: { showLoading?: boolean } = {}) => {
        if (!enabled) return;

        if (showLoading) {
            setIsLoading(true);
        }

        const requestSeq = ++requestSeqRef.current;

        try {
            const result = await fetcher();

            if (!isMountedRef.current || requestSeq !== requestSeqRef.current) return;

            dataRef.current = result;
            setData(result);
            setError(null);
            setIsLoading(false);
        } catch (err) {
            console.error(errorLabel, err);

            if (!isMountedRef.current || requestSeq !== requestSeqRef.current) return;

            setError(getErrorMessage(err, fallbackError));
            setIsLoading(false);
        }
    }, [enabled, errorLabel, fallbackError, fetcher]);

    useEffect(() => {
        isMountedRef.current = true;

        if (!enabled) {
            return;
        }

        runFetch({ showLoading: dataRef.current === null });

        const interval = window.setInterval(() => {
            if (shouldPollRef.current(dataRef.current)) {
                void runFetch();
            }
        }, intervalMs);

        return () => {
            isMountedRef.current = false;
            requestSeqRef.current += 1;
            window.clearInterval(interval);
        };
    }, [enabled, intervalMs, runFetch]);

    const refetch = useCallback(async () => {
        await runFetch({ showLoading: true });
    }, [runFetch]);

    return {
        data,
        isLoading,
        error,
        refetch,
    };
}
