import type { ManualQuizQuestion } from '../types/manualQuizWorkspace.types';

export type QuestionImportStatus = 'accepted' | 'needsReview' | 'rejected';

export interface QuizImportMetadata {
    title?: string;
    classLevel?: string;
    category?: string;
    timeLimit?: number;
    tags?: string[];
}

export interface QuestionImportCandidate {
    id: string;
    sourceRow: number;
    sourceLabel: string;
    status: QuestionImportStatus;
    issues: string[];
    question: ManualQuizQuestion;
}

export interface QuestionImportResult {
    metadata: QuizImportMetadata;
    warnings: string[];
    accepted: QuestionImportCandidate[];
    needsReview: QuestionImportCandidate[];
    rejected: QuestionImportCandidate[];
}

export const createEmptyQuestionImportResult = (): QuestionImportResult => ({
    metadata: {},
    warnings: [],
    accepted: [],
    needsReview: [],
    rejected: [],
});

export const appendImportCandidate = (
    result: QuestionImportResult,
    candidate: QuestionImportCandidate,
): void => {
    result[candidate.status].push(candidate);
};
