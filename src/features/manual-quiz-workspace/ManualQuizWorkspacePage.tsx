import React from 'react';
import { useParams } from 'react-router-dom';
import ManualQuizWorkspaceGuard from './components/ManualQuizWorkspaceGuard';

const ManualQuizWorkspacePage: React.FC = () => {
    const { quizId } = useParams<{ quizId?: string }>();

    return (
        <ManualQuizWorkspaceGuard>
            <main
                data-testid="manual-quiz-workspace"
                data-mode={quizId ? 'edit' : 'new'}
                data-quiz-id={quizId || undefined}
                className="min-h-screen bg-[#FFFDF7] text-[#172033]"
            >
                <h1 className="sr-only">Phòng soạn đề thủ công</h1>
            </main>
        </ManualQuizWorkspaceGuard>
    );
};

export default ManualQuizWorkspacePage;
