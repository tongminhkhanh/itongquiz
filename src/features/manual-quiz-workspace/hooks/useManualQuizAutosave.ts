import { useEffect, useRef } from 'react';
import { saveLocalDraft } from '../draft/manualQuizDraftRepository';
import { getManualQuizDraftHash } from '../draft/manualQuizDraftSerializer';
import { useManualQuizWorkspaceStore } from '../store/useManualQuizWorkspaceStore';
import type { ManualQuizDraftEnvelope } from '../types/manualQuizWorkspace.types';

const LOCAL_AUTOSAVE_DELAY_MS = 600;

export const useManualQuizAutosave = (
    envelope: ManualQuizDraftEnvelope | null,
): void => {
    const setSaveStatus = useManualQuizWorkspaceStore((state) => state.setSaveStatus);
    const lastSavedHashRef = useRef<string | null>(null);
    const hasUnsavedChangesRef = useRef(false);

    useEffect(() => {
        if (!envelope) return undefined;

        let currentHash: string;
        try {
            currentHash = getManualQuizDraftHash(envelope);
        } catch (error) {
            const message = error instanceof Error
                ? error.message
                : 'Không thể chuẩn bị bản nháp để tự động lưu.';
            hasUnsavedChangesRef.current = true;
            setSaveStatus('error', message);
            return undefined;
        }

        if (currentHash === lastSavedHashRef.current) {
            hasUnsavedChangesRef.current = false;
            return undefined;
        }

        hasUnsavedChangesRef.current = true;
        const timer = window.setTimeout(() => {
            setSaveStatus('saving-local');
            try {
                const result = saveLocalDraft(envelope);
                lastSavedHashRef.current = result.hash;
                hasUnsavedChangesRef.current = false;
                setSaveStatus('saved');
            } catch (error) {
                const message = error instanceof Error
                    ? error.message
                    : 'Không thể lưu bản nháp trên trình duyệt.';
                setSaveStatus('error', message);
            }
        }, LOCAL_AUTOSAVE_DELAY_MS);

        return () => window.clearTimeout(timer);
    }, [envelope, setSaveStatus]);

    useEffect(() => {
        const handleBeforeUnload = (event: BeforeUnloadEvent) => {
            if (!hasUnsavedChangesRef.current) return;
            event.preventDefault();
            event.returnValue = '';
        };
        window.addEventListener('beforeunload', handleBeforeUnload);
        return () => window.removeEventListener('beforeunload', handleBeforeUnload);
    }, []);
};
