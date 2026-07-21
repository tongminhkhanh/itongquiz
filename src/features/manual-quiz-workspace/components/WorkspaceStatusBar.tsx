import React from 'react';
import { AlertCircle } from 'lucide-react';
import { selectManualQuizTotalPoints } from '../store/manualQuizWorkspaceSelectors';
import { summarizeManualQuizIssues, validateManualQuiz } from '../validation/manualQuizValidation';
import { useManualQuizWorkspaceStore } from '../store/useManualQuizWorkspaceStore';

interface WorkspaceStatusBarProps {
    onOpenValidation(): void;
}

const WorkspaceStatusBar: React.FC<WorkspaceStatusBarProps> = ({ onOpenValidation }) => {
    const questionCount = useManualQuizWorkspaceStore(
        (state) => state.envelope?.quiz.questions.length ?? 0,
    );
    const totalPoints = useManualQuizWorkspaceStore(selectManualQuizTotalPoints);
    const envelope = useManualQuizWorkspaceStore((state) => state.envelope);
    const targetPoints = envelope?.targetPoints ?? 10;
    const summary = envelope
        ? summarizeManualQuizIssues(validateManualQuiz(envelope.quiz, { targetPoints }))
        : { errorCount: 0, warningCount: 0, successCount: 0 };

    return (
        <div
            role="status"
            aria-live="polite"
            className="sticky bottom-0 z-20 flex min-h-12 items-center justify-between gap-3 border-t border-slate-200 bg-white px-4 py-2 text-sm lg:px-6"
        >
            <p className="text-slate-600">
                <strong className="text-slate-800">{questionCount} câu</strong>
                {' • '}Tổng {totalPoints}/{targetPoints} điểm
                {' • '}{summary.errorCount + summary.warningCount} mục cần kiểm tra
            </p>
            <button
                type="button"
                onClick={onOpenValidation}
                className="inline-flex h-9 items-center gap-2 rounded-lg px-3 font-medium text-rose-700 hover:bg-rose-50"
            >
                <AlertCircle className="h-4 w-4" /> Xem lỗi
            </button>
        </div>
    );
};

export default WorkspaceStatusBar;
