import React, { useEffect } from 'react';
import { useLocation, useParams } from 'react-router-dom';
import { useAuthStore } from '../../../stores/authStore';
import { useQuizStore } from '../../../stores/quizStore';
import ManualQuizWorkspaceGuard from './components/ManualQuizWorkspaceGuard';
import QuestionEditorPane from './components/QuestionEditorPane';
import QuestionNavigator from './components/QuestionNavigator';
import StudentPreviewPane from './components/StudentPreviewPane';
import WorkspaceHeader from './components/WorkspaceHeader';
import WorkspaceStatusBar from './components/WorkspaceStatusBar';
import { useManualQuizWorkspaceStore } from './store/useManualQuizWorkspaceStore';
import type { ManualQuizNavigationState } from './types/manualQuizWorkspace.types';

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
    const isNavigatorCollapsed = useManualQuizWorkspaceStore((state) => state.isNavigatorCollapsed);
    const isPreviewCollapsed = useManualQuizWorkspaceStore((state) => state.isPreviewCollapsed);

    useEffect(() => {
        if (!username || envelope) return;
        if (availableQuiz) {
            initializeFromQuiz(availableQuiz, username);
            return;
        }
        const seed = navigationState?.manualQuizSeed ?? {
            title: 'Đề kiểm tra mới',
            classLevel: '3',
            category: 'toan',
            timeLimit: 15,
            tags: [],
            requireCode: false,
            showOnHome: true,
        };
        initializeFromSeed(seed, username);
    }, [availableQuiz, envelope, initializeFromQuiz, initializeFromSeed, navigationState, username]);

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
            </div>
        </ManualQuizWorkspaceGuard>
    );
};

export default ManualQuizWorkspacePage;
