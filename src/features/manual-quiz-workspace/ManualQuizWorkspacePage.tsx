import React, { useEffect, useState } from 'react';
import { useLocation, useParams } from 'react-router-dom';
import { useAuthStore } from '../../../stores/authStore';
import { useQuizStore } from '../../../stores/quizStore';
import ManualQuizWorkspaceGuard from './components/ManualQuizWorkspaceGuard';
import DraftRecoveryDialog from './components/DraftRecoveryDialog';
import DraftConflictDialog from './components/DraftConflictDialog';
import QuestionEditorPane from './components/QuestionEditorPane';
import QuestionNavigator from './components/QuestionNavigator';
import StudentPreviewPane from './components/StudentPreviewPane';
import WorkspaceHeader from './components/WorkspaceHeader';
import WorkspaceStatusBar from './components/WorkspaceStatusBar';
import {
    findLatestLocalDraft,
    removeLocalDraft,
} from './draft/manualQuizDraftRepository';
import { useManualQuizAutosave } from './hooks/useManualQuizAutosave';
import { useManualQuizWorkspaceStore } from './store/useManualQuizWorkspaceStore';
import type {
    ManualQuizDraftEnvelope,
    ManualQuizNavigationState,
    ManualQuizSeed,
} from './types/manualQuizWorkspace.types';

const DEFAULT_SEED: ManualQuizSeed = {
    title: 'Đề kiểm tra mới',
    classLevel: '3',
    category: 'toan',
    timeLimit: 15,
    tags: [],
    requireCode: false,
    showOnHome: true,
};

const ManualQuizWorkspacePage: React.FC = () => {
    const { quizId } = useParams<{ quizId?: string }>();
    const location = useLocation();
    const navigationState = location.state as ManualQuizNavigationState | null;
    const username = useAuthStore((state) => state.username);
    const availableQuiz = useQuizStore((state) =>
        quizId ? state.quizzes.find((quiz) => quiz.id === quizId) ?? null : null,
    );
    const envelope = useManualQuizWorkspaceStore((state) => state.envelope);
    const initializeFromSeed = useManualQuizWorkspaceStore((state) => state.initializeFromSeed);
    const initializeFromQuiz = useManualQuizWorkspaceStore((state) => state.initializeFromQuiz);
    const hydrateEnvelope = useManualQuizWorkspaceStore((state) => state.hydrateEnvelope);
    const isNavigatorCollapsed = useManualQuizWorkspaceStore((state) => state.isNavigatorCollapsed);
    const isPreviewCollapsed = useManualQuizWorkspaceStore((state) => state.isPreviewCollapsed);
    const [pendingRecovery, setPendingRecovery] = useState<ManualQuizDraftEnvelope | null>(null);
    const [recoveryChecked, setRecoveryChecked] = useState(false);

    const seed = navigationState?.manualQuizSeed ?? DEFAULT_SEED;

    const autosaveController = useManualQuizAutosave(envelope);

    useEffect(() => {
        if (!username || envelope || pendingRecovery || recoveryChecked) return;

        const latestDraft = findLatestLocalDraft(username, quizId);
        const workspaceStartedAt = navigationState?.workspaceStartedAt;
        const isNewerThanCurrentEntry = latestDraft
            && (!workspaceStartedAt || latestDraft.updatedAt > workspaceStartedAt);

        if (latestDraft && isNewerThanCurrentEntry) {
            setPendingRecovery(latestDraft);
            setRecoveryChecked(true);
            return;
        }

        setRecoveryChecked(true);
        if (availableQuiz) {
            initializeFromQuiz(availableQuiz, username);
        } else {
            initializeFromSeed(seed, username);
        }
    }, [
        availableQuiz,
        envelope,
        initializeFromQuiz,
        initializeFromSeed,
        navigationState?.workspaceStartedAt,
        pendingRecovery,
        quizId,
        recoveryChecked,
        seed,
        username,
    ]);

    const continueRecoveredDraft = () => {
        if (!pendingRecovery) return;
        hydrateEnvelope(pendingRecovery);
        setPendingRecovery(null);
    };

    const discardRecoveredDraft = () => {
        if (!pendingRecovery || !username) return;
        removeLocalDraft(username, pendingRecovery.draftId);
        setPendingRecovery(null);
        if (availableQuiz) {
            initializeFromQuiz(availableQuiz, username);
        } else {
            initializeFromSeed(seed, username);
        }
    };

    const columnClass = isNavigatorCollapsed
        ? isPreviewCollapsed
            ? 'grid-cols-[minmax(0,1fr)]'
            : 'grid-cols-[minmax(0,1fr)_380px]'
        : isPreviewCollapsed
            ? 'grid-cols-[280px_minmax(0,1fr)]'
            : 'grid-cols-[280px_minmax(0,1fr)_380px]';

    return (
        <ManualQuizWorkspaceGuard>
            <div
                data-testid="manual-quiz-workspace"
                data-mode={quizId ? 'edit' : 'new'}
                data-quiz-id={quizId || undefined}
                className="flex h-screen min-h-[640px] flex-col overflow-hidden bg-[#FFFDF7] font-['Be_Vietnam_Pro',sans-serif] text-[#172033]"
            >
                <h1 className="sr-only">Phòng soạn đề thủ công</h1>
                <WorkspaceHeader />
                <div
                    data-testid="workspace-grid"
                    className={`grid min-h-0 flex-1 overflow-hidden ${columnClass}`}
                >
                    {!isNavigatorCollapsed && <QuestionNavigator />}
                    <QuestionEditorPane />
                    {!isPreviewCollapsed && <StudentPreviewPane />}
                </div>
                <WorkspaceStatusBar />
                {autosaveController.conflict && envelope && (
                    <DraftConflictDialog
                        localDraft={envelope}
                        serverRecord={autosaveController.conflict}
                        isResolving={autosaveController.isResolvingConflict}
                        onUseLocal={autosaveController.resolveWithLocal}
                        onUseServer={autosaveController.resolveWithServer}
                    />
                )}
                {pendingRecovery && (
                    <DraftRecoveryDialog
                        draft={pendingRecovery}
                        onContinue={continueRecoveredDraft}
                        onDiscard={discardRecoveredDraft}
                    />
                )}
            </div>
        </ManualQuizWorkspaceGuard>
    );
};

export default ManualQuizWorkspacePage;
