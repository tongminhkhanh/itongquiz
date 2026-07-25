import type { Quiz, Question } from '../../../types';

export interface QuizPreviewProps {
    quiz: Quiz | null;
    onSave: () => void;
    isSaving?: boolean;
    isHydratingImages?: boolean;
    onUpdateQuestions?: (questions: Question[]) => void;
    onStartManual?: () => void;
    onRegenerateQuestion?: (question: Question) => Promise<Question | null>;
}
