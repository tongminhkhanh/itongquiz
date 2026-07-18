import type { ImageLibraryItem, QuestionType } from '../../../types';
import type { PromptProfileOptions, QuizGenerationOptions } from '../../../services/geminiService';
import type { DifficultyLevels } from './quizCreation.types';

interface BuildQuizGenerationOptionsInput {
    title: string;
    questionCount: number;
    questionTypes: QuestionType[];
    difficultyLevels: DifficultyLevels;
    promptProfile: PromptProfileOptions;
    imageLibrary: ImageLibraryItem[];
    customPrompt: string;
    isPdfMode: boolean;
}

export const buildPdfCustomPrompt = (customPrompt: string): string => `⛔ CHẾ ĐỘ TẠO ĐỀ TỪ PDF (OCR) - BẮT BUỘC TUÂN THỦ:
1. ĐỌC KỸ TOÀN BỘ NỘI DUNG OCR...
${customPrompt.trim() ? `\nYêu cầu thêm từ giáo viên: ${customPrompt.trim()}` : ''}`;

export const buildQuizGenerationOptions = (
    input: BuildQuizGenerationOptionsInput,
): QuizGenerationOptions => ({
    title: input.title,
    questionCount: input.questionCount,
    questionTypes: input.questionTypes,
    difficultyLevels: { ...input.difficultyLevels },
    promptProfile: { ...input.promptProfile },
    imageLibrary: input.imageLibrary.map((image) => ({
        id: image.id,
        name: image.name,
        data: image.data,
    })),
    customPrompt: input.isPdfMode
        ? buildPdfCustomPrompt(input.customPrompt)
        : input.customPrompt.trim() || undefined,
    isPdfMode: input.isPdfMode,
});
