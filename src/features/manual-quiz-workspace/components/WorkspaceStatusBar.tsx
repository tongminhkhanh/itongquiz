import React from 'react';
import { AlertCircle } from 'lucide-react';
import {
    selectManualQuizIssueCount,
    selectManualQuizTotalPoints,
    selectManualQuizWarningCount,
} from '../store/manualQuizWorkspaceSelectors';
import { useManualQuizWorkspaceStore } from '../store/useManualQuizWorkspaceStore';

const WorkspaceStatusBar: React.FC = () => {
    const questionCount = useManualQuizWorkspaceStore(
        (state) => state.envelope?.quiz.questions.length ?? 0,
    );
    const totalPoints = useManualQuizWorkspaceStore(selectManualQuizTotalPoints);
    const issueCount = useManualQuizWorkspaceStore(selectManualQuizIssueCount);
    const warningCount = useManualQuizWorkspaceStore(selectManualQuizWarningCount);
    const targetPoints = useManualQuizWorkspaceStore((state) => state.envelope?.targetPoints ?? 10);

    return (
        <div
            role="status"
            aria-live="polite"
            className="sticky bottom-0 z-20 flex min-h-12 items-center justify-between gap-3 border-t border-slate-200 bg-white px-4 py-2 text-sm lg:px-6"
        >
            <p className="text-slate-600">
                <strong className="text-slate-800">{questionCount} câu</strong>
                {' • '}Tổng {totalPoints}/{targetPoints} điểm
                {' • '}{issueCount + warningCount} mục cần kiểm tra
            </p>
            <button type="button" className="inline-flex h-9 items-center gap-2 rounded-lg px-3 font-medium text-rose-700 hover:bg-rose-50">
                <AlertCircle className="h-4 w-4" /> Xem lỗi
            </button>
        </div>
    );
};

export default WorkspaceStatusBar;
