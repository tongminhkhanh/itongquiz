import React from 'react';
import { useLocation, useParams } from 'react-router-dom';
import type { ManualQuizNavigationState } from './types/manualQuizWorkspace.types';
import ManualQuizWorkspaceGuard from './components/ManualQuizWorkspaceGuard';

const ManualQuizWorkspacePage: React.FC = () => {
    const { quizId } = useParams<{ quizId?: string }>();
    const location = useLocation();
    const navigationState = location.state as ManualQuizNavigationState | null;
    const title = navigationState?.manualQuizSeed?.title || 'Đề kiểm tra mới';

    return (
        <ManualQuizWorkspaceGuard>
            <main
                data-testid="manual-quiz-workspace"
                data-mode={quizId ? 'edit' : 'new'}
                data-quiz-id={quizId || undefined}
                className="min-h-screen bg-[#FFFDF7] text-[#172033]"
            >
                <h1 className="sr-only">Phòng soạn đề thủ công: {title}</h1>
            </main>
        </ManualQuizWorkspaceGuard>
    );
};

export default ManualQuizWorkspacePage;
