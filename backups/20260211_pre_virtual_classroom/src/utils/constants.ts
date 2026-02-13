/**
 * Application Constants
 * 
 * Centralized location for magic numbers, strings, and configuration values.
 */

// ===== Quiz Configuration =====
export const QUIZ_CONFIG = {
    MIN_QUESTIONS: 1,
    MAX_QUESTIONS: 50,
    DEFAULT_QUESTIONS: 10,
    MIN_TIME_LIMIT: 1,
    MAX_TIME_LIMIT: 180,
    DEFAULT_TIME_LIMIT: 15,
    ACCESS_CODE_LENGTH: 6,
} as const;

// ===== Image Library =====
export const IMAGE_CONFIG = {
    MAX_COUNT: 50,
    MAX_SIZE_MB: 5,
    ALLOWED_TYPES: ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
    ALLOWED_EXTENSIONS: ['.jpg', '.jpeg', '.png', '.gif', '.webp'],
} as const;

// ===== Class Levels =====
export const CLASS_LEVELS = ['1', '2', '3', '4', '5'] as const;

// ===== Question Types Labels =====
export const QUESTION_TYPE_LABELS: Record<string, string> = {
    MCQ: 'Trắc nghiệm',
    TRUE_FALSE: 'Đúng/Sai',
    SHORT_ANSWER: 'Trả lời ngắn',
    MATCHING: 'Nối cột',
    MULTIPLE_SELECT: 'Chọn nhiều đáp án',
    DRAG_DROP: 'Điền khuyết (kéo thả)',
};

// ===== Default Difficulty Distribution =====
export const DEFAULT_DIFFICULTY = {
    easy: 30,
    medium: 50,
    hard: 20,
} as const;

// ===== AI Providers =====
export const AI_PROVIDERS = {
    GEMINI: 'gemini',
    PERPLEXITY: 'perplexity',
    OPENAI: 'openai',
    LLM_MUX: 'llm-mux',
} as const;

export const AI_PROVIDER_LABELS: Record<string, string> = {
    gemini: 'Gemini 2.0 Flash',
    perplexity: 'Perplexity (Sonar)',
    openai: 'OpenAI GPT-4',
    'llm-mux': 'LLM-Mux (Auto)',
};

// ===== Storage Keys =====
export const STORAGE_KEYS = {
    QUIZZES: 'quiz_quizzes',
    RESULTS: 'quiz_results',
    TEACHER_SESSION: 'teacher_session',
    IMAGE_LIBRARY: 'quiz_image_library',
    API_KEY: 'quiz_api_key',
    PERPLEXITY_KEY: 'quiz_perplexity_api_key',
    OPENAI_KEY: 'quiz_openai_api_key',
    LLM_MUX_KEY: 'quiz_llm_mux_api_key',
    AI_PROVIDER: 'quiz_ai_provider',
} as const;

// ===== School Info =====
export const SCHOOL_INFO = {
    NAME: 'Trường Tiểu Học Ít Ong',
    SHORT_NAME: 'ITONG QUIZ',
} as const;

// ===== API Endpoints =====
export const API_ENDPOINTS = {
    GEMINI: 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent',
    PERPLEXITY: 'https://api.perplexity.ai/chat/completions',
    OPENAI: 'https://api.openai.com/v1/chat/completions',
} as const;

// ===== Pagination =====
export const PAGINATION = {
    DEFAULT_PAGE_SIZE: 10,
    PAGE_SIZE_OPTIONS: [5, 10, 20, 50],
} as const;

// ===== Score Thresholds =====
export const SCORE_THRESHOLDS = {
    EXCELLENT: 9,
    GOOD: 7,
    PASS: 5,
} as const;
