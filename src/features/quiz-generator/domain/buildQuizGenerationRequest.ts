import type { ImageLibraryItem, QuestionType } from '../../../types';
import type { PromptProfileOptions, QuizGenerationOptions } from '../../../services/geminiService';
import type { DifficultyLevels, QuizMode } from './quizCreation.types';
import {
    buildBalancedTypeAllocations,
    validateQuizBlueprint,
    type QuestionTypeAllocation,
    type QuizBlueprint,
    type QuizIntent,
    type QuizSourceMode,
} from './quizBlueprint';

interface BuildQuizGenerationOptionsInput {
    title: string;
    questionCount: number;
    questionTypes: QuestionType[];
    typeAllocations?: QuestionTypeAllocation[];
    difficultyLevels: DifficultyLevels;
    promptProfile: PromptProfileOptions;
    imageLibrary: ImageLibraryItem[];
    customPrompt: string;
    quizMode?: QuizMode;
    intent?: QuizIntent;
    sourceMode?: QuizSourceMode;
    isPdfMode?: boolean;
}

export const buildPdfCustomPrompt = (customPrompt: string): string => `⛔ CHẾ ĐỘ TẠO ĐỀ TỪ PDF (OCR) - BẮT BUỘC TUÂN THỦ:
1. ĐỌC KỸ TOÀN BỘ NỘI DUNG OCR...
${customPrompt.trim() ? `\nYêu cầu thêm từ giáo viên: ${customPrompt.trim()}` : ''}`;

const resolveLegacyMode = (input: BuildQuizGenerationOptionsInput): QuizMode => (
    input.quizMode ?? (input.isPdfMode ? 'pdf' : 'practice')
);

const buildBlueprint = (input: BuildQuizGenerationOptionsInput): QuizBlueprint => {
    const legacyMode = resolveLegacyMode(input);
    const blueprint: QuizBlueprint = {
        intent: input.intent ?? (legacyMode === 'exam' ? 'EXAM' : 'PRACTICE'),
        sourceMode: input.sourceMode ?? (legacyMode === 'pdf' ? 'DOCUMENT' : 'TOPIC'),
        totalQuestions: input.questionCount,
        typeAllocations: input.typeAllocations
            ? input.typeAllocations.map((allocation) => ({ ...allocation }))
            : buildBalancedTypeAllocations(input.questionTypes, input.questionCount),
        difficultyLevels: { ...input.difficultyLevels },
    };
    const errors = validateQuizBlueprint(blueprint);
    if (errors.length > 0) throw new Error(errors.join(' '));
    return blueprint;
};

export const buildQuizGenerationOptions = (
    input: BuildQuizGenerationOptionsInput,
): QuizGenerationOptions => {
    const blueprint = buildBlueprint(input);
    const questionTypes = blueprint.typeAllocations
        .filter(({ count }) => count > 0)
        .map(({ type }) => type);

    return {
        title: input.title,
        blueprint,
        questionCount: blueprint.totalQuestions,
        questionTypes,
        difficultyLevels: { ...blueprint.difficultyLevels },
        promptProfile: { ...input.promptProfile },
        imageLibrary: input.imageLibrary.map((image) => ({
            id: image.id,
            name: image.name,
            data: image.data,
        })),
        customPrompt: blueprint.sourceMode === 'DOCUMENT'
            ? buildPdfCustomPrompt(input.customPrompt)
            : input.customPrompt.trim() || undefined,
        isPdfMode: blueprint.sourceMode === 'DOCUMENT',
    };
};
