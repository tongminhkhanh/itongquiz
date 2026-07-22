import { useRef, useState } from 'react';
import type { Quiz, Question } from '../../../types';
import { QuestionType } from '../../../types';
import {
    extractTextFromPdf,
    generateQuiz,
    type AIProvider,
} from '../../../services/geminiService';
import { generateTrangNguyenQuiz } from '../../../services/trangNguyenGeminiService';
import { showError } from '../../../utils/toast';
import { normalizeAiCategory, normalizeTags } from '../utils/quizNormalizers';
import {
    buildQuizGenerationOptions,
} from '../domain/buildQuizGenerationRequest';
import { MAX_OCR_CONTENT_LENGTH } from '../domain/quizCreationDefaults';
import { validateQuizGenerationInput } from '../domain/quizCreationValidation';
import type { GenerationStep, QuizMode } from '../domain/quizCreation.types';
import type { useQuizFormState } from './useQuizFormState';
import { createAiAction } from '../../../services/ai/aiAction';
import { useTeacherAiQuota } from './useTeacherAiQuota';

interface UseQuizGenerationOptions {
    form: ReturnType<typeof useQuizFormState>;
    editingQuiz: Quiz | null;
    isTeacherAccount: boolean;
    username: string | null;
    teacherName: string | null;
}

export const useQuizGeneration = ({
    form,
    editingQuiz,
    isTeacherAccount,
    username,
    teacherName,
}: UseQuizGenerationOptions) => {
    const [isGenerating, setIsGenerating] = useState(false);
    const [generationStep, setGenerationStep] = useState<GenerationStep>('idle');
    const activeGenerationRef = useRef<{ actionId: string; controller: AbortController } | null>(null);
    const quota = useTeacherAiQuota({ isTeacherAccount, username });

    const createQuizFromResult = (
        result: Record<string, unknown>,
        optionsTitle: string,
        detectedCategory: string | null,
        detectedLesson: string,
        suggestedTags: string[],
    ): Quiz => ({
        id: editingQuiz?.id || `quiz-${Date.now()}`,
        title: (result.title as string) || optionsTitle,
        classLevel: form.classLevel,
        timeLimit: typeof form.manualTimeLimit === 'number'
            ? form.manualTimeLimit
            : (result.timeLimit as number) || 15,
        questions: ((result.questions || []) as Question[]).map(
            (question: Question, index: number) => ({
                ...question,
                id: question.id || `q-${Date.now()}-${index}`,
            }),
        ),
        createdAt: editingQuiz ? editingQuiz.createdAt : new Date().toISOString(),
        createdBy: editingQuiz?.createdBy || teacherName || undefined,
        accessCode: form.requireCode ? form.accessCode.toUpperCase() : undefined,
        requireCode: form.requireCode,
        showOnHome: form.showOnHome,
        category: form.category,
        tags: form.tags,
        detectedCategory: detectedCategory || undefined,
        detectedLesson: detectedLesson || undefined,
        suggestedTags: suggestedTags.length > 0 ? suggestedTags : undefined,
    });

    const handleGenerate = async (modeOverride?: QuizMode) => {
        const activeQuizMode = modeOverride ?? form.quizMode;
        const isPdfMode = activeQuizMode === 'pdf';
        form.setQuizMode(activeQuizMode);
        if (activeQuizMode === 'exam') form.setQuizIntent('EXAM');
        if (activeQuizMode === 'practice') form.setQuizIntent('PRACTICE');

        const validation = validateQuizGenerationInput({
            mode: activeQuizMode,
            uploadedFile: form.uploadedFile,
            topic: form.topic,
            classLevel: form.classLevel,
            selectedTypes: form.selectedTypes,
            typeAllocations: form.questionTypeAllocations,
            intent: activeQuizMode === 'exam'
                ? 'EXAM'
                : activeQuizMode === 'practice'
                    ? 'PRACTICE'
                    : form.quizIntent,
            difficultyLevels: form.difficultyLevels,
        });
        if (validation.error) {
            showError(validation.error);
            return;
        }
        setIsGenerating(true);
        setGenerationStep(isPdfMode ? 'reading_document' : 'generating');
        form.setAiDetectedCategory(null);
        form.setAiDetectedLesson('');
        form.setAiSuggestedTags([]);

        const action = createAiAction('QUIZ_CREATE');
        const controller = new AbortController();
        activeGenerationRef.current = { actionId: action.actionId, controller };

        try {
            if (form.category === 'trang-nguyen') {
                const trangNguyenTypes: string[] = [];
                if (form.selectedTypes[QuestionType.MCQ]) trangNguyenTypes.push('single_choice');
                if (form.selectedTypes[QuestionType.MULTIPLE_SELECT]) trangNguyenTypes.push('multiple_select');
                if (form.selectedTypes[QuestionType.SHORT_ANSWER]) trangNguyenTypes.push('fill_blank');
                if (form.selectedTypes[QuestionType.MATCHING]) trangNguyenTypes.push('matching');
                if (form.selectedTypes[QuestionType.CATEGORIZATION]) trangNguyenTypes.push('grouping');
                if (form.selectedTypes[QuestionType.ORDERING]) trangNguyenTypes.push('rearrange');
                if (form.selectedTypes[QuestionType.TRUE_FALSE]) trangNguyenTypes.push('reading');

                const result = await generateTrangNguyenQuiz({
                    topic: form.topic,
                    classLevel: form.classLevel,
                    questionTypes: trangNguyenTypes.length > 0
                        ? trangNguyenTypes
                        : ['single_choice', 'fill_blank'],
                    questionCount: validation.questionCount,
                    difficulty: 'mixed',
                    customPrompt: form.customPrompt.trim() || undefined,
                    enableSearch: form.tnSearchMode === 'search',
                });

                form.setGeneratedQuiz({
                    id: editingQuiz?.id || `tn-quiz-${Date.now()}`,
                    title: form.quizTitle || result.title,
                    classLevel: form.classLevel,
                    timeLimit: typeof form.manualTimeLimit === 'number'
                        ? form.manualTimeLimit
                        : result.timeLimit,
                    questions: result.questions,
                    createdAt: editingQuiz ? editingQuiz.createdAt : new Date().toISOString(),
                    createdBy: editingQuiz?.createdBy || teacherName || undefined,
                    accessCode: form.requireCode ? form.accessCode.toUpperCase() : undefined,
                    requireCode: form.requireCode,
                    category: 'trang-nguyen',
                    showOnHome: form.showOnHome,
                    tags: form.tags,
                } as Quiz);
                setGenerationStep('completed');
                return;
            }

            const titlePrefix = isPdfMode
                ? 'Đề từ PDF'
                : activeQuizMode === 'exam'
                    ? 'Kiểm tra'
                    : 'Ôn tập';
            let generationContent = form.content;
            let generationFile: File | undefined = form.uploadedFile || undefined;
            let generationTopic = form.topic;

            if (isPdfMode && form.uploadedFile) {
                const ocrProvider: AIProvider = [
                    'gemini',
                    'llm-mux',
                    'native-ocr',
                ].includes(form.aiProvider)
                    ? form.aiProvider
                    : 'llm-mux';
                const extractedText = await extractTextFromPdf(form.uploadedFile, ocrProvider, {
                    action,
                    stage: 'OCR',
                    signal: controller.signal,
                });
                const normalizedOcr = extractedText?.trim();
                if (!normalizedOcr || normalizedOcr.length < 120) {
                    throw new Error(
                        'OCR không đọc được đủ nội dung từ file. Vui lòng thử file rõ hơn hoặc chọn file khác.',
                    );
                }

                generationContent = [
                    form.content.trim(),
                    `=== NỘI DUNG OCR TỪ FILE (NGUỒN CHÍNH) ===\n${
                        normalizedOcr.length > MAX_OCR_CONTENT_LENGTH
                            ? normalizedOcr.slice(0, MAX_OCR_CONTENT_LENGTH)
                            : normalizedOcr
                    }\n=== HẾT NỘI DUNG OCR ===`,
                ].filter(Boolean).join('\n\n');
                generationTopic = form.topic || form.uploadedFile.name.replace(/\.[^/.]+$/, '');
                generationFile = undefined;
                setGenerationStep('generating');
            }

            const options = buildQuizGenerationOptions({
                title: form.quizTitle || `${titlePrefix}: ${
                    form.topic
                    || form.uploadedFile?.name?.replace(/\.[^/.]+$/, '')
                    || 'Bài kiểm tra'
                }`,
                questionCount: validation.questionCount,
                questionTypes: validation.enabledTypes,
                typeAllocations: form.questionTypeAllocations,
                difficultyLevels: form.difficultyLevels,
                promptProfile: form.promptProfile,
                imageLibrary: form.imageLibrary,
                customPrompt: form.customPrompt,
                quizMode: activeQuizMode,
                intent: activeQuizMode === 'exam'
                    ? 'EXAM'
                    : activeQuizMode === 'practice'
                        ? 'PRACTICE'
                        : form.quizIntent,
                sourceMode: isPdfMode ? 'DOCUMENT' : 'TOPIC',
                isPdfMode,
            });

            const result = await generateQuiz(
                generationTopic,
                form.classLevel,
                generationContent,
                generationFile,
                options,
                undefined,
                form.aiProvider,
                setGenerationStep,
                {
                    action,
                    stage: 'GENERATE',
                    signal: controller.signal,
                },
            ) as Record<string, unknown>;

            const detectedCategory = normalizeAiCategory(result.detectedCategory);
            const detectedLesson = typeof result.detectedLesson === 'string'
                ? result.detectedLesson.trim()
                : '';
            const suggestedTags = normalizeTags(result.suggestedTags);

            form.setAiDetectedCategory(detectedCategory);
            form.setAiDetectedLesson(detectedLesson);
            form.setAiSuggestedTags(suggestedTags);
            form.setGeneratedQuiz(createQuizFromResult(
                result,
                options.title,
                detectedCategory,
                detectedLesson,
                suggestedTags,
            ));
            setGenerationStep('completed');
        } catch (error: unknown) {
            if (controller.signal.aborted) {
                setGenerationStep('cancelled');
            } else {
                const normalizedError = error instanceof Error ? error : new Error(String(error));
                showError(normalizedError.message || 'Đã xảy ra lỗi khi tạo đề');
                setGenerationStep('idle');
            }
        } finally {
            if (activeGenerationRef.current?.actionId === action.actionId) {
                activeGenerationRef.current = null;
            }
            setIsGenerating(false);
            void quota.refresh();
        }
    };

    const handleRegenerateSingle = async (question: Question): Promise<Question | null> => {
        const action = createAiAction('QUESTION_REGENERATE');
        const controller = new AbortController();
        try {
            const prompt = `Yêu cầu: Sinh lại câu hỏi dựa trên: ${JSON.stringify(question)}`;
            const result = await generateQuiz(
                form.topic || form.generatedQuiz?.title || 'Tổng hợp',
                form.classLevel,
                form.content,
                undefined,
                buildQuizGenerationOptions({
                    title: form.quizTitle || `Sinh lại câu hỏi: ${form.topic || 'Bài kiểm tra'}`,
                    questionCount: 1,
                    questionTypes: [question.type],
                    typeAllocations: [{ type: question.type, count: 1 }],
                    difficultyLevels: {
                        level1: question.difficulty === 1 ? 1 : 0,
                        level2: question.difficulty === 2 || !question.difficulty ? 1 : 0,
                        level3: question.difficulty === 3 ? 1 : 0,
                    },
                    promptProfile: form.promptProfile,
                    imageLibrary: form.imageLibrary,
                    customPrompt: prompt,
                    quizMode: form.quizMode,
                    intent: form.quizIntent,
                    sourceMode: form.quizMode === 'pdf' ? 'DOCUMENT' : 'TOPIC',
                    isPdfMode: false,
                }),
                undefined,
                form.aiProvider,
                undefined,
                {
                    action,
                    stage: 'REGENERATE',
                    signal: controller.signal,
                },
            ) as Record<string, unknown>;
            const questions = Array.isArray(result.questions) ? result.questions : [];
            return questions.length > 0
                ? { ...(questions[0] as Question), id: question.id }
                : null;
        } catch (error) {
            console.error('Lỗi khi sinh lại câu hỏi:', error);
            throw error;
        }
    };

    return {
        isGenerating,
        generationStep,
        aiUsageCount: quota.aiUsageCount,
        aiUsageRemaining: quota.aiUsageRemaining,
        hasAiQuota: quota.hasAiQuota,
        dailyAiLimit: quota.dailyAiLimit,
        handleGenerate,
        handleRegenerateSingle,
        cancelGeneration: () => {
            const activeGeneration = activeGenerationRef.current;
            if (!activeGeneration) return;
            setGenerationStep('cancelled');
            activeGeneration.controller.abort();
        },
    };
};
