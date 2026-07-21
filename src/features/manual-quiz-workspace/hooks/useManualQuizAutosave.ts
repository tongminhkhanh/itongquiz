import type { ManualQuizDraftEnvelope } from '../types/manualQuizWorkspace.types';
import {
    useDraftConflictResolution,
    type DraftConflictResolutionController,
} from './useDraftConflictResolution';
import { useLocalManualQuizAutosave } from './useLocalManualQuizAutosave';
import { useRemoteManualQuizAutosave } from './useRemoteManualQuizAutosave';

export type ManualQuizAutosaveController = DraftConflictResolutionController;

export const useManualQuizAutosave = (
    envelope: ManualQuizDraftEnvelope | null,
): ManualQuizAutosaveController => {
    const localAutosave = useLocalManualQuizAutosave(envelope);
    return useRemoteManualQuizAutosave(envelope, localAutosave);
};

export { useDraftConflictResolution };
