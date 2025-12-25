/**
 * Domain Types
 * 
 * Core business types for the Quiz application.
 * Re-exports from the root types.ts for backward compatibility,
 * and adds new utility types.
 */

// Re-export all existing types for backward compatibility
export {
    QuestionType,
    type MCQQuestion,
    type MultipleSelectQuestion,
    type TrueFalseItem,
    type TrueFalseQuestion,
    type ShortAnswerQuestion,
    type MatchingPair,
    type MatchingQuestion,
    type DragDropQuestion,
    type ImageLibraryItem,
    type Question,
    type Quiz,
    type StudentResult,
    type Teacher,
} from '../../types';

/**
 * Quiz Generation Options
 */
export interface QuizGenerationOptions {
    topic: string;
    classLevel: string;
    content?: string;
    questionCount?: number;
    selectedTypes: Record<string, boolean>;
    difficulty?: {
        easy: number;
        medium: number;
        hard: number;
    };
    imageLibrary?: string[];
}

/**
 * AI Provider Types
 */
export type AIProviderType = 'gemini' | 'perplexity' | 'openai' | 'llm-mux';

/**
 * Quiz Creation Form State
 */
export interface QuizFormState {
    topic: string;
    classLevel: string;
    content: string;
    selectedTypes: Record<string, boolean>;
    questionCount: number;
    difficulty: {
        easy: number;
        medium: number;
        hard: number;
    };
    isGenerating: boolean;
    error: string | null;
}

/**
 * Results Filter State
 */
export interface ResultsFilterState {
    quizId?: string;
    classLevel?: string;
    dateFrom?: string;
    dateTo?: string;
    sortField: 'submittedAt' | 'score' | 'studentName';
    sortOrder: 'asc' | 'desc';
}

/**
 * App View State
 */
export type AppView = 'home' | 'student' | 'teacher_login' | 'teacher_dash';

/**
 * Pagination State
 */
export interface PaginationState {
    page: number;
    pageSize: number;
    totalItems: number;
}
