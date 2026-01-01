/**
 * Domain Types
 * 
 * Core business types for the Quiz application.
 */

export enum QuestionType {
    MCQ = 'MCQ',
    TRUE_FALSE = 'TRUE_FALSE',
    SHORT_ANSWER = 'SHORT_ANSWER',
    MATCHING = 'MATCHING',
    MULTIPLE_SELECT = 'MULTIPLE_SELECT',
    DRAG_DROP = 'DRAG_DROP',
    ORDERING = 'ORDERING', // Sắp xếp thứ tự câu trong đoạn văn
    IMAGE_QUESTION = 'IMAGE_QUESTION', // Câu hỏi có hình vẽ bắt buộc
    DROPDOWN = 'DROPDOWN', // Câu hỏi điền dropdown
    UNDERLINE = 'UNDERLINE', // Câu hỏi gạch chân từ/cụm từ
}

export interface MCQQuestion {
    id: string;
    type: QuestionType.MCQ;
    question: string;
    options: string[]; // [A, B, C, D]
    correctAnswer: string; // "A", "B", "C", or "D"
    image?: string; // URL or Base64
    explanation?: string; // Detailed guide on how to solve
}

export interface MultipleSelectQuestion {
    id: string;
    type: QuestionType.MULTIPLE_SELECT;
    question: string;
    options: string[];
    correctAnswers: string[]; // ["A", "C"]
    image?: string;
    explanation?: string;
}

export interface TrueFalseItem {
    id: string;
    statement: string;
    isCorrect: boolean; // True if statement is correct (Đ), False if incorrect (S)
}

export interface TrueFalseQuestion {
    id: string;
    type: QuestionType.TRUE_FALSE;
    mainQuestion: string; // e.g., "Về nước:"
    items: TrueFalseItem[];
    image?: string;
    explanation?: string;
}

export interface ShortAnswerQuestion {
    id: string;
    type: QuestionType.SHORT_ANSWER;
    question: string;
    correctAnswer: string; // Short string
    image?: string;
    explanation?: string;
}

export interface MatchingPair {
    left: string;
    right: string;
}

export interface MatchingQuestion {
    id: string;
    type: QuestionType.MATCHING;
    question: string; // "Nối cột A với cột B"
    pairs: MatchingPair[];
    image?: string;
    explanation?: string;
}

export interface DragDropQuestion {
    id: string;
    type: QuestionType.DRAG_DROP;
    question: string; // Instruction
    text: string; // Text with blanks, e.g. "The sky is [blue]."
    blanks: string[]; // ["blue"]
    distractors: string[]; // ["red", "green"]
    image?: string;
    explanation?: string;
}

// Image Library Item for teacher uploads
export interface ImageLibraryItem {
    id: string;
    name: string; // File name or description
    data: string; // Base64 data or URL
    topic?: string; // Optional topic tag
    createdAt: string;
}

// Ordering Question - Sắp xếp thứ tự các câu trong đoạn văn
export interface OrderingQuestion {
    id: string;
    type: QuestionType.ORDERING;
    question: string; // "Sắp xếp các câu sau thành đoạn văn hoàn chỉnh"
    items: string[]; // Các câu đã bị xáo trộn
    correctOrder: number[]; // Thứ tự đúng, ví dụ [2, 0, 3, 1] nghĩa là items[2] là câu 1, items[0] là câu 2...
    image?: string;
    explanation?: string;
}

// Image Question - Câu hỏi trắc nghiệm có hình vẽ BẮT BUỘC
export interface ImageQuestion {
    id: string;
    type: QuestionType.IMAGE_QUESTION;
    question: string;
    image: string; // Base64 hoặc URL - BẮT BUỘC
    options: string[]; // [A, B, C, D]
    correctAnswer: string; // "A", "B", "C", or "D"
    explanation?: string;
}

// Dropdown blank item
export interface DropdownBlank {
    id: string;
    options: string[]; // Các lựa chọn trong dropdown
    correctAnswer: string; // Đáp án đúng
}

// Dropdown Question - Câu hỏi điền vào chỗ trống bằng dropdown
export interface DropdownQuestion {
    id: string;
    type: QuestionType.DROPDOWN;
    question: string; // "Chọn đáp án đúng cho các chỗ trống"
    text: string; // "Thủ đô Việt Nam là [1]. Dân số khoảng [2] triệu."
    blanks: DropdownBlank[]; // Danh sách dropdown tương ứng [1], [2]...
    image?: string;
    explanation?: string;
}

// Underline Question - Câu hỏi gạch chân từ/cụm từ trong câu
export interface UnderlineQuestion {
    id: string;
    type: QuestionType.UNDERLINE;
    question: string; // "Gạch chân động từ trong câu sau"
    sentence: string; // "Mặt trời ngả nắng đằng tây"
    words: string[]; // ["Mặt trời", "ngả", "nắng", "đằng tây"]
    correctWordIndexes: number[]; // [1] - index của từ "ngả" cần gạch chân
    image?: string;
    explanation?: string;
}

export type Question = MCQQuestion | TrueFalseQuestion | ShortAnswerQuestion | MatchingQuestion | MultipleSelectQuestion | DragDropQuestion | OrderingQuestion | ImageQuestion | DropdownQuestion | UnderlineQuestion;

export interface Quiz {
    id: string;
    title: string; // e.g., "Ôn tập Khoa học lớp 3: Không khí và Nước"
    classLevel: string; // 1, 2, 3, 4, 5
    category?: string; // 'vioedu' | 'trang-nguyen' | 'on-tap'
    timeLimit: number; // in minutes
    questions: Question[];
    createdAt: string;
    accessCode?: string; // 6-character code for quiz access
    requireCode?: boolean; // Whether to require code to start quiz
}

export interface StudentResult {
    id: string; // UUID
    quizId: string;
    quizTitle?: string; // Optional quiz title from Google Sheets
    studentName: string;
    studentClass: string;
    score: number; // 0-10
    correctCount: number;
    totalQuestions: number;
    timeTaken: number; // in minutes
    submittedAt: string;
    answers: Record<string, any>; // Store student answers
}

export interface Teacher {
    username: string;
    password: string; // Plain text for this simple app
    fullName: string;
    role?: 'admin' | 'teacher';
    class?: string; // Class this teacher is responsible for (e.g., "2a1")
}

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
