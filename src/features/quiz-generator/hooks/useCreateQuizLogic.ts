import { useState, useEffect, useRef } from 'react';
import { Quiz, QuestionType, ImageLibraryItem } from '../../../types';
import { showError, showSuccess } from '../../../utils/toast';
import { extractTextFromPdf, generateQuiz, QuizGenerationOptions, AIProvider } from '../../../services/geminiService';
import { generateTrangNguyenQuiz } from '../../../services/trangNguyenGeminiService';
import { useAuthStore } from '../../../../stores/authStore';
import { useClassroomStore } from '../../../stores/useClassroomStore';
import { normalizeTagValue, normalizeTags, normalizeAiCategory } from '../utils/quizNormalizers';

const MAX_OCR_CONTENT_LENGTH = 60000;

interface UseCreateQuizLogicProps {
    editingQuiz: Quiz | null;
    onSaveQuiz: (quiz: Quiz) => Promise<void>;
    onUpdateQuiz: (quiz: Quiz) => Promise<void>;
    onSuccess: () => void;
}

export const useCreateQuizLogic = ({ editingQuiz, onSaveQuiz, onUpdateQuiz, onSuccess }: UseCreateQuizLogicProps) => {
    const authStore = useAuthStore();
    const classroomStore = useClassroomStore();

    const isClassLocked = !authStore.isAdmin && !!authStore.teacherClass;
    const lockedClass = authStore.teacherClass || '3';

    // Form state
    const [topic, setTopic] = useState('');
    const [quizTitle, setQuizTitle] = useState('');
    const [classLevel, setClassLevel] = useState(isClassLocked ? lockedClass : '3');
    const [category, setCategory] = useState('toan');
    const [tags, setTags] = useState<string[]>([]);
    const [tagInput, setTagInput] = useState('');
    const [aiDetectedCategory, setAiDetectedCategory] = useState<string | null>(null);
    const [aiDetectedLesson, setAiDetectedLesson] = useState('');
    const [aiSuggestedTags, setAiSuggestedTags] = useState<string[]>([]);
    const [content, setContent] = useState('');
    const [manualTimeLimit, setManualTimeLimit] = useState<number | ''>('');
    const [isGenerating, setIsGenerating] = useState(false);
    const [generationStep, setGenerationStep] = useState<'idle' | 'generating' | 'reviewing' | 'completed'>('idle');
    const [generatedQuiz, setGeneratedQuiz] = useState<Quiz | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [isSaving, setIsSaving] = useState(false);
    const [customPrompt, setCustomPrompt] = useState('');
    const [quizMode, setQuizMode] = useState<'exam' | 'practice' | 'pdf'>('practice');
    const [aiProvider, setAiProvider] = useState<AIProvider>(() =>
        (localStorage.getItem('ai_provider') as AIProvider) || 'llm-mux'
    );
    const [selectedTypes, setSelectedTypes] = useState<Record<string, boolean>>({
        [QuestionType.MCQ]: true,
        [QuestionType.TRUE_FALSE]: true,
        [QuestionType.SHORT_ANSWER]: true,
        [QuestionType.MATCHING]: true,
    });
    const [difficultyLevels, setDifficultyLevels] = useState({
        level1: 3,
        level2: 5,
        level3: 2,
    });

    const [requireCode, setRequireCode] = useState(false);
    const [accessCode, setAccessCode] = useState('');
    const [showOnHome, setShowOnHome] = useState(true);
    const [uploadedFile, setUploadedFile] = useState<File | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const [showLinkModal, setShowLinkModal] = useState(false);
    const [savedQuizLink, setSavedQuizLink] = useState('');
    const [linkCopied, setLinkCopied] = useState(false);

    const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
        basic: true,
        questionTypes: true,
        difficulty: true,
        content: false,
        advanced: false,
        assign: false,
    });

    const [imageLibrary, setImageLibrary] = useState<ImageLibraryItem[]>(() => {
        const saved = localStorage.getItem('quiz_image_library');
        return saved ? JSON.parse(saved) : [];
    });

    const [assignToClass, setAssignToClass] = useState(false);
    const [selectedClassId, setSelectedClassId] = useState('');
    const [deadline, setDeadline] = useState(() => {
        const d = new Date();
        d.setDate(d.getDate() + 7);
        return d.toISOString().split('T')[0];
    });
    const [maxAttempts, setMaxAttempts] = useState(3);
    const [tnSearchMode, setTnSearchMode] = useState<'search' | 'quick'>('search');

    const toggleSection = (section: string) => {
        setExpandedSections(prev => ({ ...prev, [section]: !prev[section] }));
    };

    useEffect(() => {
        if (authStore.username) {
            classroomStore.fetchClasses(authStore.username);
        }
    }, [authStore.username]);

    useEffect(() => {
        if (editingQuiz) {
            setTopic('');
            setQuizTitle(editingQuiz.title);
            setClassLevel(editingQuiz.classLevel);
            setContent('');
            setManualTimeLimit(editingQuiz.timeLimit);
            setGeneratedQuiz(editingQuiz);
            setRequireCode(!!editingQuiz.requireCode);
            setAccessCode(editingQuiz.accessCode || '');
            setShowOnHome(editingQuiz.showOnHome !== false);
            setCategory(editingQuiz.category || 'toan');
            
            const rawTags = (editingQuiz as any).tags;
            const parsedTags: string[] = typeof rawTags === 'string'
                ? (() => {
                    try { return rawTags ? JSON.parse(rawTags) : []; } catch { return []; }
                })()
                : (rawTags || []);
            setTags(parsedTags.map((tag) => String(tag ?? '').replace(/^#/, '').trim()).filter(Boolean));
            setTagInput('');
            setAiDetectedCategory(normalizeAiCategory((editingQuiz as any).detectedCategory));
            setAiDetectedLesson(typeof (editingQuiz as any).detectedLesson === 'string' ? (editingQuiz as any).detectedLesson : '');
            setAiSuggestedTags(normalizeTags((editingQuiz as any).suggestedTags));
        } else {
            setTopic('');
            setQuizTitle('');
            setClassLevel(isClassLocked ? lockedClass : '3');
            setContent('');
            setManualTimeLimit('');
            setGeneratedQuiz(null);
            setRequireCode(false);
            setAccessCode('');
            setShowOnHome(true);
            setCustomPrompt('');
            setUploadedFile(null);
            setCategory('toan');
            setTags([]);
            setTagInput('');
            setAiDetectedCategory(null);
            setAiDetectedLesson('');
            setAiSuggestedTags([]);
        }
    }, [editingQuiz, isClassLocked, lockedClass]);

    useEffect(() => {
        localStorage.setItem('quiz_image_library', JSON.stringify(imageLibrary));
    }, [imageLibrary]);

    useEffect(() => {
        localStorage.setItem('ai_provider', aiProvider);
    }, [aiProvider]);

    useEffect(() => {
        if (generatedQuiz) {
            const updates: Partial<Quiz> = {};
            if (typeof manualTimeLimit === 'number' && manualTimeLimit !== generatedQuiz.timeLimit) {
                updates.timeLimit = manualTimeLimit;
            }
            if (classLevel !== generatedQuiz.classLevel) {
                updates.classLevel = classLevel;
            }
            if (category !== generatedQuiz.category) {
                updates.category = category;
            }
            if (requireCode !== generatedQuiz.requireCode) {
                updates.requireCode = requireCode;
            }
            const normalizedAccessCode = requireCode ? (accessCode.toUpperCase() || undefined) : undefined;
            const currentAccessCode = generatedQuiz.accessCode || undefined;
            if (normalizedAccessCode !== currentAccessCode) {
                updates.accessCode = normalizedAccessCode;
            }
            if (showOnHome !== generatedQuiz.showOnHome) {
                updates.showOnHome = showOnHome;
            }
            if (quizTitle && quizTitle !== generatedQuiz.title) {
                updates.title = quizTitle;
            }
            if (!generatedQuiz.createdBy && authStore.teacherName) {
                updates.createdBy = authStore.teacherName;
            }
            if (Object.keys(updates).length > 0) {
                setGeneratedQuiz({ ...generatedQuiz, ...updates });
            }
        }
    }, [manualTimeLimit, classLevel, category, requireCode, accessCode, showOnHome, quizTitle, authStore.teacherName]);

    useEffect(() => {
        if (generatedQuiz) {
            const currentTags = (generatedQuiz as any).tags;
            const currentTagsArr: string[] = typeof currentTags === 'string'
                ? (() => {
                    try { return currentTags ? JSON.parse(currentTags) : []; } catch { return []; }
                })()
                : (currentTags || []);
            if (JSON.stringify(currentTagsArr) !== JSON.stringify(tags)) {
                setGeneratedQuiz({ ...generatedQuiz, tags } as any);
            }
        }
    }, [tags]);

    const generateRandomCode = () => {
        const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
        let code = '';
        for (let i = 0; i < 6; i++) {
            code += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        setAccessCode(code);
        return code;
    };

    const addTagToState = (rawValue: string) => {
        const normalizedTag = normalizeTagValue(rawValue);
        if (!normalizedTag) return;
        setTags((prev) => {
            const normalizedExisting = new Set(prev.map((tag) => normalizeTagValue(tag)));
            return normalizedExisting.has(normalizedTag) ? prev : [...prev, normalizedTag];
        });
    };

    const handleApplyAiCategory = () => {
        if (!aiDetectedCategory) return;
        setCategory(aiDetectedCategory);
    };

    const handleApplyAiTitleSuggestion = () => {
        if (!aiDetectedLesson) return;
        setQuizTitle(aiDetectedLesson);
    };

    const handleStartManual = () => {
        const quiz: Quiz = {
            id: editingQuiz?.id || `quiz-manual-${Date.now()}`,
            title: quizTitle || 'Đề thi mới (Chưa đặt tên)',
            classLevel: classLevel || '3',
            timeLimit: typeof manualTimeLimit === 'number' ? manualTimeLimit : 15,
            questions: [],
            createdAt: editingQuiz ? editingQuiz.createdAt : new Date().toISOString(),
            createdBy: editingQuiz?.createdBy || authStore.teacherName || undefined,
            accessCode: requireCode ? accessCode.toUpperCase() : undefined,
            requireCode: requireCode,
            showOnHome: showOnHome,
            category: category,
            tags,
            detectedCategory: aiDetectedCategory || undefined,
            detectedLesson: aiDetectedLesson || undefined,
            suggestedTags: aiSuggestedTags.length > 0 ? aiSuggestedTags : undefined,
        };
        setGeneratedQuiz(quiz);
    };

    const handleGenerate = async (modeOverride?: 'exam' | 'practice' | 'pdf') => {
        const activeQuizMode = modeOverride ?? quizMode;
        const isPdfMode = activeQuizMode === 'pdf';
        setQuizMode(activeQuizMode);

        if (isPdfMode) {
            if (!uploadedFile) {
                showError('Vui lòng tải lên file PDF hoặc ảnh');
                return;
            }
        } else {
            if (!topic.trim()) {
                showError('Vui lòng nhập chủ đề bài học');
                return;
            }
        }

        if (!classLevel || !classLevel.trim()) {
            showError('Vui lòng chọn Khối lớp cho đề thi');
            return;
        }

        const enabledTypes = Object.entries(selectedTypes)
            .filter(([_, enabled]) => enabled)
            .map(([type]) => type as QuestionType);

        if (enabledTypes.length === 0) {
            showError('Vui lòng chọn ít nhất một dạng câu hỏi');
            return;
        }

        const questionCount = difficultyLevels.level1 + difficultyLevels.level2 + difficultyLevels.level3;
        if (questionCount === 0) {
            showError('Tổng số câu hỏi phải lớn hơn 0');
            return;
        }

        setIsGenerating(true);
        setAiDetectedCategory(null);
        setAiDetectedLesson('');
        setAiSuggestedTags([]);

        try {
            const isTrangNguyen = category === 'trang-nguyen';
            const titlePrefix = isPdfMode ? 'Đề từ PDF' : (activeQuizMode === 'exam' ? 'Kiểm tra' : 'Ôn tập');
            let generationContent = content;
            let generationFile: File | undefined = uploadedFile || undefined;
            let generationTopic = topic;

            if (isTrangNguyen) {
                const tnTypes: string[] = [];
                if (selectedTypes[QuestionType.MCQ]) tnTypes.push('single_choice');
                if (selectedTypes[QuestionType.MULTIPLE_SELECT]) tnTypes.push('multiple_select');
                if (selectedTypes[QuestionType.SHORT_ANSWER]) tnTypes.push('fill_blank');
                if (selectedTypes[QuestionType.MATCHING]) tnTypes.push('matching');
                if (selectedTypes[QuestionType.CATEGORIZATION]) tnTypes.push('grouping');
                if (selectedTypes[QuestionType.ORDERING]) tnTypes.push('rearrange');
                if (selectedTypes[QuestionType.TRUE_FALSE]) tnTypes.push('reading');

                const result = await generateTrangNguyenQuiz({
                    topic: topic,
                    classLevel: classLevel,
                    questionTypes: tnTypes.length > 0 ? tnTypes : ['single_choice', 'fill_blank'],
                    questionCount: questionCount,
                    difficulty: 'mixed',
                    customPrompt: customPrompt.trim() || undefined,
                    enableSearch: tnSearchMode === 'search'
                });

                const quiz: Quiz = {
                    id: editingQuiz?.id || `tn-quiz-${Date.now()}`,
                    title: quizTitle || result.title,
                    classLevel,
                    timeLimit: typeof manualTimeLimit === 'number' ? manualTimeLimit : result.timeLimit,
                    questions: result.questions,
                    createdAt: editingQuiz ? editingQuiz.createdAt : new Date().toISOString(),
                    createdBy: editingQuiz?.createdBy || authStore.teacherName || undefined,
                    accessCode: requireCode ? accessCode.toUpperCase() : undefined,
                    requireCode: requireCode,
                    category: 'trang-nguyen',
                    showOnHome: showOnHome,
                    tags,
                };

                setGeneratedQuiz(quiz);
                setIsGenerating(false);
                return;
            }

            if (isPdfMode && uploadedFile) {
                setGenerationStep('generating');
                const ocrProvider: AIProvider = aiProvider === 'gemini' || aiProvider === 'llm-mux' || aiProvider === 'native-ocr' ? aiProvider : 'llm-mux';
                const extractedText = await extractTextFromPdf(uploadedFile, ocrProvider);
                const normalizedOcr = extractedText?.trim();

                if (!normalizedOcr || normalizedOcr.length < 120) {
                    throw new Error('OCR không đọc được đủ nội dung từ file. Vui lòng thử file rõ hơn hoặc chọn file khác.');
                }

                generationContent = [
                    content.trim(),
                    `=== NỘI DUNG OCR TỪ FILE (NGUỒN CHÍNH) ===\n${normalizedOcr.length > MAX_OCR_CONTENT_LENGTH ? normalizedOcr.slice(0, MAX_OCR_CONTENT_LENGTH) : normalizedOcr}\n=== HẾT NỘI DUNG OCR ===`,
                ].filter(Boolean).join('\n\n');
                generationTopic = topic || uploadedFile.name.replace(/\.[^/.]+$/, '');
            }

            let finalCustomPrompt = customPrompt.trim() || undefined;
            if (isPdfMode) {
                finalCustomPrompt = `⛔ CHẾ ĐỘ TẠO ĐỀ TỪ PDF (OCR) - BẮT BUỘC TUÂN THỦ:
1. ĐỌC KỸ TOÀN BỘ NỘI DUNG OCR...
${customPrompt.trim() ? `\nYêu cầu thêm từ giáo viên: ${customPrompt.trim()}` : ''}`;
            }

            const options: QuizGenerationOptions = {
                title: quizTitle || `${titlePrefix}: ${topic || uploadedFile?.name?.replace(/\.[^/.]+$/, '') || 'Bài kiểm tra'}`,
                questionCount,
                questionTypes: enabledTypes,
                difficultyLevels,
                imageLibrary: imageLibrary.map(img => ({ id: img.id, name: img.name, data: img.data })),
                customPrompt: isPdfMode ? finalCustomPrompt : customPrompt.trim() || undefined,
                isPdfMode,
            };

            const result = await generateQuiz(generationTopic, classLevel, generationContent, generationFile, options, undefined, aiProvider, setGenerationStep);

            const detectedCategory = normalizeAiCategory((result as any).detectedCategory);
            const detectedLesson = typeof (result as any).detectedLesson === 'string' ? (result as any).detectedLesson.trim() : '';
            const suggestedTags = normalizeTags((result as any).suggestedTags);

            setAiDetectedCategory(detectedCategory);
            setAiDetectedLesson(detectedLesson);
            setAiSuggestedTags(suggestedTags);

            const quiz: Quiz = {
                id: editingQuiz?.id || `quiz-${Date.now()}`,
                title: result.title || options.title,
                classLevel,
                timeLimit: typeof manualTimeLimit === 'number' ? manualTimeLimit : result.timeLimit || 15,
                questions: (result.questions || []).map((q: any, idx: number) => ({ ...q, id: q.id || `q-${Date.now()}-${idx}` })),
                createdAt: editingQuiz ? editingQuiz.createdAt : new Date().toISOString(),
                createdBy: editingQuiz?.createdBy || authStore.teacherName || undefined,
                accessCode: requireCode ? accessCode.toUpperCase() : undefined,
                requireCode,
                showOnHome,
                category,
                tags,
                detectedCategory: detectedCategory || undefined,
                detectedLesson: detectedLesson || undefined,
                suggestedTags: suggestedTags.length > 0 ? suggestedTags : undefined,
            };

            setGeneratedQuiz(quiz);
            setGenerationStep('completed');
        } catch (err: any) {
            showError(err.message || 'Đã xảy ra lỗi khi tạo đề');
            setGenerationStep('idle');
        } finally {
            setIsGenerating(false);
        }
    };

    const handleRegenerateSingle = async (question: any): Promise<any | null> => {
        try {
            const prompt = `Yêu cầu: Sinh lại câu hỏi dựa trên: ${JSON.stringify(question)}`;
            const options: QuizGenerationOptions = {
                title: quizTitle || `Sinh lại câu hỏi: ${topic || 'Bài kiểm tra'}`,
                questionCount: 1,
                questionTypes: [question.type],
                difficultyLevels: {
                    level1: question.difficulty === 1 ? 1 : 0,
                    level2: question.difficulty === 2 || !question.difficulty ? 1 : 0,
                    level3: question.difficulty === 3 ? 1 : 0,
                },
                imageLibrary: imageLibrary.map(img => ({ id: img.id, name: img.name, data: img.data })),
                customPrompt: prompt,
                isPdfMode: false,
            };

            const result = await generateQuiz(topic || generatedQuiz?.title || 'Tổng hợp', classLevel, content, undefined, options, undefined, aiProvider);
            return result && result.questions && result.questions.length > 0 ? { ...result.questions[0], id: question.id } : null;
        } catch (err) {
            console.error("Lỗi khi sinh lại câu hỏi:", err);
            throw err;
        }
    };

    const handleSaveQuiz = async () => {
        if (!generatedQuiz || isSaving) return;
        if (!classLevel || !classLevel.trim()) {
            showError('Vui lòng chọn Khối lớp trước khi lưu đề thi');
            return;
        }

        setIsSaving(true);
        try {
            if (editingQuiz) await onUpdateQuiz(generatedQuiz);
            else await onSaveQuiz(generatedQuiz);

            if (assignToClass && selectedClassId) {
                try {
                    await classroomStore.addAssignment({
                        classId: selectedClassId,
                        quizId: generatedQuiz.id,
                        quizTitle: generatedQuiz.title,
                        dueDate: new Date(deadline).toISOString(),
                        type: 'quiz',
                        settings: {
                            duration: generatedQuiz.timeLimit,
                            maxAttempts,
                            viewAnswers: true,
                            shuffleQuestions: true
                        }
                    } as any);
                } catch (assignErr) { /* ignore */ }
            }

            const quizLink = `${window.location.origin}/?quiz=${generatedQuiz.id}`;
            setSavedQuizLink(quizLink);
            setLinkCopied(false);
            setShowLinkModal(true);

            // Reset
            setTopic('');
            setQuizTitle('');
            setContent('');
            setCustomPrompt('');
            setRequireCode(false);
            setAccessCode('');
            setShowOnHome(true);
            setUploadedFile(null);
            setGeneratedQuiz(null);
            setTags([]);
            setTagInput('');
            setAiDetectedCategory(null);
            setAiDetectedLesson('');
            setAiSuggestedTags([]);
            onSuccess();
        } catch (err: any) {
            showError(err.message || 'Lỗi khi lưu bài kiểm tra');
        } finally {
            setIsSaving(false);
        }
    };

    const handleCopyLink = async () => {
        try {
            await navigator.clipboard.writeText(savedQuizLink);
            setLinkCopied(true);
            showSuccess('Đã sao chép link chia sẻ!');
            setTimeout(() => setLinkCopied(false), 3000);
        } catch (err) { /* ignore */ }
    };

    return {
        // State
        topic, setTopic,
        quizTitle, setQuizTitle,
        classLevel, setClassLevel,
        category, setCategory,
        tags, setTags,
        tagInput, setTagInput,
        aiDetectedCategory, aiDetectedLesson, aiSuggestedTags,
        content, setContent,
        manualTimeLimit, setManualTimeLimit,
        isGenerating, generationStep,
        generatedQuiz, setGeneratedQuiz,
        error, setError,
        isSaving,
        customPrompt, setCustomPrompt,
        quizMode, setQuizMode,
        aiProvider, setAiProvider,
        selectedTypes, setSelectedTypes,
        difficultyLevels, setDifficultyLevels,
        requireCode, setRequireCode,
        accessCode, setAccessCode,
        showOnHome, setShowOnHome,
        uploadedFile, setUploadedFile,
        fileInputRef,
        showLinkModal, setShowLinkModal,
        savedQuizLink, linkCopied,
        expandedSections, toggleSection,
        assignToClass, setAssignToClass,
        selectedClassId, setSelectedClassId,
        deadline, setDeadline,
        maxAttempts, setMaxAttempts,
        tnSearchMode, setTnSearchMode,
        isClassLocked, lockedClass,
        
        // Methods
        generateRandomCode,
        addTagToState,
        handleApplyAiCategory,
        handleApplyAiTitleSuggestion,
        handleStartManual,
        handleGenerate,
        handleRegenerateSingle,
        handleSaveQuiz,
        handleCopyLink,
        classroomStore,
        authStore
    };
};
