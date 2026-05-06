/**
 * Hooks - Barrel Export
 */

export { useQuizCreator } from './useQuizCreator';
export type { UseQuizCreatorReturn, DifficultyLevels } from './useQuizCreator';

export { useResults } from './useResults';
export type { UseResultsReturn, UseResultsProps } from './useResults';

export { useQuizManager } from './useQuizManager';
export type { UseQuizManagerReturn, UseQuizManagerProps } from './useQuizManager';

// 🚀 Antigravity Rules: Custom hooks for IOE Quiz
export {
    useQuizTimer,
    useQuizAnswers,
    useQuizScoring,
    shuffleArray,
    formatTime
} from './useIoeQuiz';

export { useResponsiveLayout } from './useResponsiveLayout';
export type { ResponsiveLayoutState } from './useResponsiveLayout';

// Live Exam hooks
export { useLiveExamStatus } from './useLiveExamStatus';
export { useLiveExamParticipants } from './useLiveExamParticipants';
export { useLiveExamTimer } from './useLiveExamTimer';
export { useLiveExamActivity } from './useLiveExamActivity';
