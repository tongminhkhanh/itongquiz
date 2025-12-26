import { z } from 'zod';

// ===============================
// Question Type Enum
// ===============================
export const QuestionTypeSchema = z.enum([
    'MCQ',
    'TRUE_FALSE',
    'SHORT_ANSWER',
    'MATCHING',
    'MULTIPLE_SELECT',
    'DRAG_DROP'
]);

// ===============================
// Base Question Schema
// ===============================
const BaseQuestionSchema = z.object({
    id: z.string().min(1, 'ID is required'),
    image: z.string().url().optional(),
    explanation: z.string().optional()
});

// ===============================
// MCQ Question
// ===============================
export const MCQQuestionSchema = BaseQuestionSchema.extend({
    type: z.literal('MCQ'),
    question: z.string().min(1, 'Question is required'),
    options: z.array(z.string()).min(2, 'At least 2 options required').max(6),
    correctAnswer: z.string().regex(/^[A-F]$/, 'Must be A-F')
});

// ===============================
// Multiple Select Question
// ===============================
export const MultipleSelectQuestionSchema = BaseQuestionSchema.extend({
    type: z.literal('MULTIPLE_SELECT'),
    question: z.string().min(1),
    options: z.array(z.string()).min(2).max(6),
    correctAnswers: z.array(z.string().regex(/^[A-F]$/)).min(1)
});

// ===============================
// True/False Question
// ===============================
export const TrueFalseItemSchema = z.object({
    id: z.string().min(1),
    statement: z.string().min(1),
    isCorrect: z.boolean()
});

export const TrueFalseQuestionSchema = BaseQuestionSchema.extend({
    type: z.literal('TRUE_FALSE'),
    mainQuestion: z.string().min(1),
    items: z.array(TrueFalseItemSchema).min(1).max(10)
});

// ===============================
// Short Answer Question
// ===============================
export const ShortAnswerQuestionSchema = BaseQuestionSchema.extend({
    type: z.literal('SHORT_ANSWER'),
    question: z.string().min(1),
    correctAnswer: z.string().min(1)
});

// ===============================
// Matching Question
// ===============================
export const MatchingPairSchema = z.object({
    left: z.string().min(1),
    right: z.string().min(1)
});

export const MatchingQuestionSchema = BaseQuestionSchema.extend({
    type: z.literal('MATCHING'),
    question: z.string().min(1),
    pairs: z.array(MatchingPairSchema).min(2).max(10)
});

// ===============================
// Drag & Drop Question
// ===============================
export const DragDropQuestionSchema = BaseQuestionSchema.extend({
    type: z.literal('DRAG_DROP'),
    question: z.string().min(1),
    text: z.string().min(1, 'Text with blanks is required'),
    blanks: z.array(z.string()).min(1),
    distractors: z.array(z.string()).default([])
});

// ===============================
// Union of all Question Types
// ===============================
export const QuestionSchema = z.discriminatedUnion('type', [
    MCQQuestionSchema,
    MultipleSelectQuestionSchema,
    TrueFalseQuestionSchema,
    ShortAnswerQuestionSchema,
    MatchingQuestionSchema,
    DragDropQuestionSchema
]);

// ===============================
// Quiz Schema
// ===============================
export const QuizSchema = z.object({
    id: z.string().min(1),
    title: z.string().min(1, 'Title is required').max(200),
    classLevel: z.string().regex(/^[1-5]$/, 'Class level must be 1-5'),
    timeLimit: z.number().min(1).max(180), // 1-180 minutes
    questions: z.array(QuestionSchema).min(1, 'At least 1 question required'),
    createdAt: z.string().datetime(),
    accessCode: z.string().length(6).optional(),
    requireCode: z.boolean().optional()
});

// ===============================
// Student Result Schema
// ===============================
export const StudentResultSchema = z.object({
    id: z.string().uuid(),
    quizId: z.string().min(1),
    quizTitle: z.string().optional(),
    studentName: z.string().min(1, 'Student name is required').max(100),
    studentClass: z.string().min(1, 'Class is required').max(20),
    score: z.number().min(0).max(10),
    correctCount: z.number().min(0),
    totalQuestions: z.number().min(1),
    timeTaken: z.number().min(0),
    submittedAt: z.string().datetime(),
    answers: z.record(z.any())
});

// ===============================
// Type Exports (inferred from schemas)
// ===============================
export type QuizInput = z.infer<typeof QuizSchema>;
export type QuestionInput = z.infer<typeof QuestionSchema>;
export type StudentResultInput = z.infer<typeof StudentResultSchema>;

// ===============================
// Validation Helper Functions
// ===============================
export const validateQuiz = (data: unknown) => QuizSchema.safeParse(data);
export const validateQuestion = (data: unknown) => QuestionSchema.safeParse(data);
export const validateStudentResult = (data: unknown) => StudentResultSchema.safeParse(data);
