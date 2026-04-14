import React, { useState, useEffect, useRef } from 'react';
import { Quiz, QuestionType, ImageLibraryItem } from '../../types';
import { Card, Button } from '../common';
import { FileText, Sparkles, Upload, X, FileCheck, Copy, Check, Link2, BookOpen, Search, Zap, Users, Calendar, Hash, ChevronDown, ChevronUp, Settings, Clock, Wand2, Eye, EyeOff, Lock, Unlock, Edit3, Tag } from 'lucide-react';
import { AIProvider, AI_CORE_SUBJECT_IDS, extractTextFromPdf, generateQuiz, QuizGenerationOptions } from '../../services/geminiService';
import { generateTrangNguyenQuiz, TRANG_NGUYEN_TOPICS } from '../../services/trangNguyenGeminiService';
import { searchTrangNguyenQuestions, enrichPromptWithSearchResults } from '../../services/trangNguyenSearchService';
import { QuestionTypeSelector, DifficultyLevelSelector, ImageLibrary, AIProviderSelector } from '../teacher/QuizCreator';
import QuizPreview from './QuizPreview';
import { QUIZ_CATEGORIES } from '../../config/constants';
import { useAuthStore } from '../../../stores/authStore';
import { useClassroomStore } from '../../stores/useClassroomStore';

// === Section component defined OUTSIDE CreateTab to prevent focus loss on re-render ===
interface SectionProps {
    id: string;
    icon: React.ReactNode;
    title: string;
    subtitle?: string;
    badge?: string;
    children: React.ReactNode;
    expandedSections: Record<string, boolean>;
    toggleSection: (id: string) => void;
}

const Section: React.FC<SectionProps> = ({ id, icon, title, subtitle, badge, children, expandedSections, toggleSection }) => {
    const isOpen = expandedSections[id] ?? false;
    return (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden transition-all hover:border-gray-300 shadow-sm">
            <button
                onClick={() => toggleSection(id)}
                className="w-full flex items-center justify-between p-4 text-left hover:bg-gray-50/50 transition-colors"
            >
                <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-orange-100 to-amber-50 flex items-center justify-center text-orange-600 shrink-0">
                        {icon}
                    </div>
                    <div>
                        <div className="flex items-center gap-2">
                            <span className="font-semibold text-gray-800 text-sm">{title}</span>
                            {badge && (
                                <span className="px-2 py-0.5 bg-orange-100 text-orange-700 text-xs font-medium rounded-full">
                                    {badge}
                                </span>
                            )}
                        </div>
                        {subtitle && <p className="text-xs text-gray-500 mt-0.5">{subtitle}</p>}
                    </div>
                </div>
                <div className={`transition-transform duration-200 text-gray-400 ${isOpen ? 'rotate-180' : ''}`}>
                    <ChevronDown className="w-4 h-4" />
                </div>
            </button>
            {isOpen && (
                <div className="px-4 pb-4 pt-1 border-t border-gray-100 animate-fade-in">
                    {children}
                </div>
            )}
        </div>
    );
};

interface CreateTabProps {
    editingQuiz: Quiz | null;
    onSaveQuiz: (quiz: Quiz) => Promise<void>;
    onUpdateQuiz: (quiz: Quiz) => Promise<void>;
    onSuccess: () => void;
}

type QuizMode = 'exam' | 'practice' | 'pdf';
const MAX_OCR_CONTENT_LENGTH = 60000;

const AI_CORE_CATEGORY_SET = new Set<string>(AI_CORE_SUBJECT_IDS);

const normalizeTagValue = (value: string): string => {
    return value
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase()
        .replace(/^#+/g, '')
        .trim()
        .replace(/[^a-z0-9\s_-]/g, ' ')
        .replace(/\s+/g, '_')
        .replace(/_+/g, '_')
        .replace(/^_+|_+$/g, '')
        .slice(0, 40);
};

const normalizeTags = (source: unknown): string[] => {
    const values = Array.isArray(source)
        ? source
        : typeof source === 'string'
            ? source.split(',')
            : [];

    const seen = new Set<string>();
    const tags: string[] = [];
    for (const raw of values) {
        const normalized = normalizeTagValue(String(raw ?? ''));
        if (!normalized || seen.has(normalized)) continue;
        seen.add(normalized);
        tags.push(normalized);
        if (tags.length >= 5) break;
    }
    return tags;
};

const normalizeAiCategory = (value: unknown): string | null => {
    if (typeof value !== 'string') return null;
    const normalized = value
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/-+/g, '-')
        .replace(/^-|-$/g, '');
    if (!normalized || !AI_CORE_CATEGORY_SET.has(normalized)) return null;
    return normalized;
};

const CreateTab: React.FC<CreateTabProps> = ({ editingQuiz, onSaveQuiz, onUpdateQuiz, onSuccess }) => {
    // Auth store - to get teacher name and class
    const authStore = useAuthStore();
    const classroomStore = useClassroomStore();

    // Check if teacher is locked to a specific class (non-admin with assigned class)
    const isClassLocked = !authStore.isAdmin && !!authStore.teacherClass;
    const lockedClass = authStore.teacherClass || '3';

    // Form state
    const [topic, setTopic] = useState('');
    const [quizTitle, setQuizTitle] = useState('');
    const [classLevel, setClassLevel] = useState(isClassLocked ? lockedClass : '3');
    const [category, setCategory] = useState('toan'); // Default: Toán Học
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
    const [quizMode, setQuizMode] = useState<QuizMode>('practice');
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

    // Trạng Nguyên specific state
    const [tnSearchMode, setTnSearchMode] = useState<'search' | 'quick'>('search');

    // Access Code & Visibility state
    const [requireCode, setRequireCode] = useState(false);
    const [accessCode, setAccessCode] = useState('');
    const [showOnHome, setShowOnHome] = useState(true);

    // PDF/Document file upload
    const [uploadedFile, setUploadedFile] = useState<File | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Quiz link modal state
    const [showLinkModal, setShowLinkModal] = useState(false);
    const [savedQuizLink, setSavedQuizLink] = useState('');
    const [linkCopied, setLinkCopied] = useState(false);

    // Collapsible section states
    const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
        basic: true,       // Always open by default
        questionTypes: true,
        difficulty: true,
        content: false,     // Collapsed by default
        advanced: false,    // Collapsed by default
        assign: false,      // Collapsed by default
    });

    const toggleSection = (section: string) => {
        setExpandedSections(prev => ({ ...prev, [section]: !prev[section] }));
    };

    // Image library
    const [imageLibrary, setImageLibrary] = useState<ImageLibraryItem[]>(() => {
        const saved = localStorage.getItem('quiz_image_library');
        return saved ? JSON.parse(saved) : [];
    });

    // Auto-Assign State
    const [assignToClass, setAssignToClass] = useState(false);
    const [selectedClassId, setSelectedClassId] = useState('');
    const [deadline, setDeadline] = useState(() => {
        const d = new Date();
        d.setDate(d.getDate() + 7); // Default 7 days
        return d.toISOString().split('T')[0];
    });
    const [maxAttempts, setMaxAttempts] = useState(3);

    // Fetch classes for assignment dropdown
    useEffect(() => {
        if (authStore.username) {
            classroomStore.fetchClasses(authStore.username);
        }
    }, [authStore.username]);

    // Initialize from editingQuiz
    useEffect(() => {
        if (editingQuiz) {
            setTopic(''); // Topic might not be available in Quiz object unless we parse title
            setQuizTitle(editingQuiz.title);
            setClassLevel(editingQuiz.classLevel);
            setContent('');
            setManualTimeLimit(editingQuiz.timeLimit);
            setGeneratedQuiz(editingQuiz);
            setRequireCode(!!editingQuiz.requireCode);
            setAccessCode(editingQuiz.accessCode || '');
            setShowOnHome(editingQuiz.showOnHome !== false); // default to true
            setCategory(editingQuiz.category || 'toan');
            // Load tags from editingQuiz
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
            // We don't restore selectedTypes/difficultyLevels from quiz yet as it's complex to reverse engineer
        } else {
            // Reset form for new quiz
            setTopic('');
            setQuizTitle('');
            setClassLevel(isClassLocked ? lockedClass : '3'); // Use locked class if applicable
            setContent('');
            setManualTimeLimit('');
            setGeneratedQuiz(null);
            setRequireCode(false);
            setAccessCode('');
            setShowOnHome(true);
            setCustomPrompt('');
            setUploadedFile(null);
            setCategory('toan'); // Default: Toán Học
            setTags([]);
            setTagInput('');
            setAiDetectedCategory(null);
            setAiDetectedLesson('');
            setAiSuggestedTags([]);
        }
    }, [editingQuiz, isClassLocked, lockedClass]);

    // Save persistence
    useEffect(() => {
        localStorage.setItem('quiz_image_library', JSON.stringify(imageLibrary));
    }, [imageLibrary]);

    useEffect(() => {
        localStorage.setItem('ai_provider', aiProvider);
    }, [aiProvider]);

    // Sync form fields with generatedQuiz when they change
    useEffect(() => {
        if (generatedQuiz) {
            const updates: Partial<Quiz> = {};

            // Sync timeLimit
            if (typeof manualTimeLimit === 'number' && manualTimeLimit !== generatedQuiz.timeLimit) {
                updates.timeLimit = manualTimeLimit;
            }

            // Sync classLevel
            if (classLevel !== generatedQuiz.classLevel) {
                updates.classLevel = classLevel;
            }

            // Sync category
            if (category !== generatedQuiz.category) {
                updates.category = category;
            }

            // Sync access code & visibility settings
            if (requireCode !== generatedQuiz.requireCode) {
                updates.requireCode = requireCode;
            }
            // Normalize both sides to avoid '' !== undefined infinite loop
            const normalizedAccessCode = requireCode ? (accessCode.toUpperCase() || undefined) : undefined;
            const currentAccessCode = generatedQuiz.accessCode || undefined;
            if (normalizedAccessCode !== currentAccessCode) {
                updates.accessCode = normalizedAccessCode;
            }
            if (showOnHome !== generatedQuiz.showOnHome) {
                updates.showOnHome = showOnHome;
            }

            // Sync quiz title
            if (quizTitle && quizTitle !== generatedQuiz.title) {
                updates.title = quizTitle;
            }

            // Auto-add createdBy if missing (for old quizzes)
            if (!generatedQuiz.createdBy && authStore.teacherName) {
                updates.createdBy = authStore.teacherName;
            }

            // Apply updates if any
            if (Object.keys(updates).length > 0) {
                setGeneratedQuiz({ ...generatedQuiz, ...updates });
            }
        }
    }, [manualTimeLimit, classLevel, category, requireCode, accessCode, showOnHome, quizTitle, authStore.teacherName]);

    // Sync tags with generatedQuiz
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


    // Generate random access code
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

    const getCategoryLabel = (categoryId: string): string => {
        return QUIZ_CATEGORIES.find((cat) => cat.id === categoryId)?.name || categoryId;
    };

    // Handle manual quiz creation (no AI)
    const handleCreateManual = () => {
        const quiz: Quiz = {
            id: editingQuiz?.id || `quiz-manual-${Date.now()}`,
            title: quizTitle || 'Đề thi thủ công',
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

    // Handle quiz generation
    const handleGenerate = async (modeOverride?: QuizMode) => {
        const activeQuizMode: QuizMode = modeOverride ?? quizMode;
        const isPdfMode = activeQuizMode === 'pdf';
        setQuizMode(activeQuizMode);

        // Validate based on mode
        if (isPdfMode) {
            if (!uploadedFile) {
                setError('Vui lòng tải lên file PDF hoặc ảnh');
                return;
            }
        } else {
            if (!topic.trim()) {
                setError('Vui lòng nhập chủ đề bài học');
                return;
            }
        }

        if (!classLevel || !classLevel.trim()) {
            setError('Vui lòng chọn Khối lớp cho đề thi');
            return;
        }

        const enabledTypes = Object.entries(selectedTypes)
            .filter(([_, enabled]) => enabled)
            .map(([type]) => type as QuestionType);

        if (enabledTypes.length === 0) {
            setError('Vui lòng chọn ít nhất một dạng câu hỏi');
            return;
        }

        const questionCount = difficultyLevels.level1 + difficultyLevels.level2 + difficultyLevels.level3;
        if (questionCount === 0) {
            setError('Tổng số câu hỏi phải lớn hơn 0');
            return;
        }

        setError(null);
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

            // ===== TRẠNG NGUYÊN MODE =====
            if (isTrangNguyen) {
                // Map selected types to Trạng Nguyên format
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
                    enableSearch: tnSearchMode === 'search' // Pass search mode
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

            // ===== STANDARD MODE =====
            if (isPdfMode && uploadedFile) {
                setGenerationStep('generating');

                const ocrProvider: AIProvider =
                    aiProvider === 'gemini' || aiProvider === 'llm-mux' || aiProvider === 'native-ocr'
                        ? aiProvider
                        : 'llm-mux';

                const extractedText = await extractTextFromPdf(uploadedFile, ocrProvider);
                const normalizedOcr = extractedText?.trim();

                if (!normalizedOcr || normalizedOcr.length < 120) {
                    throw new Error('OCR không đọc được đủ nội dung từ file. Vui lòng thử file rõ hơn hoặc chọn file khác.');
                }

                const clippedOcr = normalizedOcr.length > MAX_OCR_CONTENT_LENGTH
                    ? `${normalizedOcr.slice(0, MAX_OCR_CONTENT_LENGTH)}\n\n[Đã cắt bớt nội dung OCR vì quá dài]`
                    : normalizedOcr;

                generationContent = [
                    content.trim(),
                    `=== NỘI DUNG OCR TỪ FILE (NGUỒN CHÍNH) ===\n${clippedOcr}\n=== HẾT NỘI DUNG OCR ===`,
                ]
                    .filter(Boolean)
                    .join('\n\n');

                generationFile = undefined;
                generationTopic = topic || uploadedFile.name.replace(/\.[^/.]+$/, '');
            }

            // Special prompt for PDF mode
            let finalCustomPrompt = customPrompt.trim() || undefined;
            if (isPdfMode) {
                finalCustomPrompt = `⛔ CHẾ ĐỘ TẠO ĐỀ TỪ PDF (OCR) - BẮT BUỘC TUÂN THỦ:
1. ĐỌC KỸ TOÀN BỘ NỘI DUNG OCR trong phần "NỘI DUNG OCR TỪ FILE (NGUỒN CHÍNH)".
2. NẾU FILE CÓ CÂU HỎI: COPY NGUYÊN VĂN tất cả câu hỏi, đáp án - KHÔNG ĐƯỢC sửa đổi.
3. NẾU FILE LÀ BÀI HỌC: Tạo câu hỏi DỰA TRÊN nội dung OCR.
4. KHÔNG ĐƯỢC tự bịa nội dung ngoài phần OCR trừ khi giáo viên yêu cầu.
${customPrompt.trim() ? `\nYêu cầu thêm từ giáo viên: ${customPrompt.trim()}` : ''}`;
            }

            const options: QuizGenerationOptions = {
                title: quizTitle || `${titlePrefix}: ${topic || uploadedFile?.name?.replace(/\.[^/.]+$/, '') || 'Bài kiểm tra'}`,
                questionCount,
                questionTypes: enabledTypes,
                difficultyLevels: {
                    level1: difficultyLevels.level1,
                    level2: difficultyLevels.level2,
                    level3: difficultyLevels.level3,
                },
                imageLibrary: imageLibrary.map(img => ({
                    id: img.id,
                    name: img.name,
                    data: img.data,
                })),
                customPrompt: isPdfMode ? finalCustomPrompt : (activeQuizMode === 'exam' ? customPrompt.trim() : (customPrompt.trim() || undefined)),
                isPdfMode: isPdfMode, // Flag để AI biết chỉ dùng nội dung từ PDF
            };

            const result = await generateQuiz(
                generationTopic,
                classLevel,
                generationContent,
                generationFile,
                options,
                undefined,
                aiProvider,
                (step) => setGenerationStep(step)
            );

            const detectedCategory = normalizeAiCategory((result as any).detectedCategory);
            const detectedLesson = typeof (result as any).detectedLesson === 'string'
                ? (result as any).detectedLesson.trim()
                : '';
            const suggestedTags = normalizeTags((result as any).suggestedTags);

            setAiDetectedCategory(detectedCategory);
            setAiDetectedLesson(detectedLesson);
            setAiSuggestedTags(suggestedTags);

            const quiz: Quiz = {
                id: editingQuiz?.id || `quiz-${Date.now()}`,
                title: result.title || options.title,
                classLevel,
                timeLimit: typeof manualTimeLimit === 'number' ? manualTimeLimit : result.timeLimit || 15,
                questions: (result.questions || []).map((q: any, idx: number) => ({
                    ...q,
                    id: q.id || `q-${Date.now()}-${idx}`,
                })),
                createdAt: editingQuiz ? editingQuiz.createdAt : new Date().toISOString(),
                createdBy: editingQuiz?.createdBy || authStore.teacherName || undefined,
                accessCode: requireCode ? accessCode.toUpperCase() : undefined,
                requireCode: requireCode,
                showOnHome: showOnHome,
                category: category,
                tags,
                detectedCategory: detectedCategory || undefined,
                detectedLesson: detectedLesson || undefined,
                suggestedTags: suggestedTags.length > 0 ? suggestedTags : undefined,
            };

            setGeneratedQuiz(quiz);
            setGenerationStep('completed');
        } catch (err: any) {
            setError(err.message || 'Đã xảy ra lỗi khi tạo đề');
            setGenerationStep('idle');
        } finally {
            setIsGenerating(false);
        }
    };

    // Handle single question regeneration
    const handleRegenerateSingle = async (question: any): Promise<any | null> => {
        try {
            const prompt = customPrompt.trim()
                ? `${customPrompt}\n\nYêu cầu đặc biệt: Sinh lại duy nhất một câu hỏi dựa trên câu hỏi sau, thay đổi nội dung, số liệu, tên gọi nhưng PHẢI GIỮ NGUYÊN dạng bài, độ khó và chủ đề. Tôn trọng tuyệt đối các quy tắc format JSON và LaTeX quy định trong hệ thống.\nCâu hỏi gốc:\n${JSON.stringify(question)}`
                : `Yêu cầu đặc biệt: Sinh lại duy nhất một câu hỏi dựa trên câu hỏi sau, thay đổi nội dung, số liệu, tên gọi nhưng PHẢI GIỮ NGUYÊN dạng bài, độ khó và chủ đề. Tôn trọng tuyệt đối các quy tắc format JSON và LaTeX quy định trong hệ thống.\nCâu hỏi gốc:\n${JSON.stringify(question)}`;

            const options: QuizGenerationOptions = {
                title: quizTitle || `Sinh lại câu hỏi: ${topic || 'Bài kiểm tra'}`,
                questionCount: 1,
                questionTypes: [question.type], // Force same type
                difficultyLevels: {
                    level1: question.difficulty === 1 ? 1 : 0,
                    level2: question.difficulty === 2 || !question.difficulty ? 1 : 0,
                    level3: question.difficulty === 3 ? 1 : 0,
                },
                imageLibrary: imageLibrary.map(img => ({
                    id: img.id,
                    name: img.name,
                    data: img.data,
                })),
                customPrompt: prompt,
                isPdfMode: false, // Turn off PDF mode for single generation to ensure it generates new content
            };

            const result = await generateQuiz(
                topic || generatedQuiz?.title || 'Tổng hợp',
                classLevel,
                content,
                undefined, // Don't use uploaded file for single regens to avoid copy-pasting
                options,
                undefined,
                aiProvider
            );

            if (result && result.questions && result.questions.length > 0) {
                // Ensure the returned ID matches the original to replace it seamlessly, or return new ID?
                // The QuizPreview logic maps over it and replaces existing based on original ID.
                return { ...result.questions[0], id: question.id };
            }
            return null;
        } catch (err: any) {
            console.error("Lỗi khi sinh lại câu hỏi:", err);
            throw err;
        }
    };

    // Handle save quiz
    const handleSaveQuiz = async () => {
        if (!generatedQuiz || isSaving) return;

        if (!classLevel || !classLevel.trim()) {
            setError('Vui lòng chọn Khối lớp trước khi lưu đề thi');
            return;
        }

        setIsSaving(true);
        try {
            if (editingQuiz) {
                await onUpdateQuiz(generatedQuiz);
            } else {
                await onSaveQuiz(generatedQuiz);
            }

            // NEW: Auto-assign logic
            if (assignToClass && selectedClassId) {
                try {
                    await classroomStore.addAssignment({
                        classId: selectedClassId,
                        quizId: generatedQuiz.id,
                        quizTitle: generatedQuiz.title,
                        dueDate: new Date(deadline).toISOString(),
                        type: 'quiz', // Assuming 'quiz' is valid type, or 'homework'
                        settings: {
                            duration: generatedQuiz.timeLimit,
                            maxAttempts: maxAttempts,
                            viewAnswers: true,
                            shuffleQuestions: true
                        }
                    } as any);
                } catch (assignErr) {
                    // Silent catch
                }
            }

            // Generate shareable link
            const quizLink = `${window.location.origin}/?quiz=${generatedQuiz.id}`;
            setSavedQuizLink(quizLink);
            setLinkCopied(false);
            setShowLinkModal(true);

            // Reset form
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
            setError(err.message || 'Lỗi khi lưu bài kiểm tra');
        } finally {
            setIsSaving(false);
        }
    };

    // Copy link to clipboard
    const handleCopyLink = async () => {
        try {
            await navigator.clipboard.writeText(savedQuizLink);
            setLinkCopied(true);
            setTimeout(() => setLinkCopied(false), 3000);
        } catch (err) {
            // Silent catch
        }
    };

    const questionCount = difficultyLevels.level1 + difficultyLevels.level2 + difficultyLevels.level3;

    // Section is now defined OUTSIDE this component (above) to prevent re-creation on every render

    return (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Left Column - Form */}
            <div className="space-y-3">
                {/* ====== GRADIENT HEADER ====== */}
                <div className={`rounded-2xl p-5 ${editingQuiz
                    ? 'bg-gradient-to-r from-blue-600 to-indigo-600'
                    : 'bg-gradient-to-r from-orange-500 to-amber-500'
                    } text-white shadow-lg`}
                >
                    <div className="flex items-center gap-3 mb-1">
                        <div className="w-10 h-10 rounded-xl bg-white/20 backdrop-blur flex items-center justify-center">
                            {editingQuiz ? <Edit3 className="w-5 h-5" /> : <Wand2 className="w-5 h-5" />}
                        </div>
                        <div>
                            <h2 className="text-lg font-bold">
                                {editingQuiz ? 'Chỉnh sửa đề thi' : 'Tạo đề kiểm tra mới'}
                            </h2>
                            <p className="text-sm text-white/80">
                                {editingQuiz ? `Đang sửa: ${editingQuiz.title}` : 'AI sẽ giúp bạn tạo đề nhanh chóng'}
                            </p>
                        </div>
                    </div>
                </div>

                {/* ====== SECTION 1: THÔNG TIN CƠ BẢN ====== */}
                <Section
                    id="basic"
                    icon={<FileText className="w-4 h-4" />}
                    title="Thông tin cơ bản"
                    subtitle="Chủ đề, khối lớp, thời gian"
                    expandedSections={expandedSections}
                    toggleSection={toggleSection}
                >
                    <div className="space-y-3">
                        {/* Topic */}
                        <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-1">
                                Chủ đề bài học {!uploadedFile && <span className="text-red-500">*</span>}
                            </label>
                            <input
                                type="text"
                                value={topic}
                                onChange={e => setTopic(e.target.value)}
                                placeholder={uploadedFile
                                    ? "Có thể để trống khi tạo đề từ PDF/Ảnh"
                                    : "VD: Động vật rừng xanh, Phép cộng có nhớ..."}
                                className="w-full px-3 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-orange-500/40 focus:border-orange-500 transition-all text-sm"
                            />
                            {uploadedFile && (
                                <p className="mt-1 text-xs text-gray-500">
                                    Đã tải file: hệ thống sẽ ưu tiên nội dung OCR từ file, chủ đề chỉ là tùy chọn bổ sung.
                                </p>
                            )}
                        </div>

                        {/* Title */}
                        <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-1">Tên bài kiểm tra</label>
                            <input
                                type="text"
                                value={quizTitle}
                                onChange={e => setQuizTitle(e.target.value)}
                                placeholder="VD: Kiểm tra 15 phút - Chương 3..."
                                className="w-full px-3 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-orange-500/40 focus:border-orange-500 transition-all text-sm"
                            />
                        </div>

                        {/* Class + Time + Category row */}
                        <div className="grid grid-cols-3 gap-3">
                            <div>
                                <label className="block text-xs font-semibold text-gray-600 mb-1">
                                    Khối lớp {isClassLocked && <Lock className="w-3 h-3 inline text-orange-500" />}
                                </label>
                                <select
                                    value={classLevel}
                                    onChange={e => setClassLevel(e.target.value)}
                                    disabled={isClassLocked}
                                    className={`w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-orange-500/40 ${isClassLocked ? 'bg-gray-50 cursor-not-allowed text-gray-500' : 'border-gray-200'}`}
                                >
                                    {[1, 2, 3, 4, 5].map(l => <option key={l} value={l}>Lớp {l}</option>)}
                                </select>
                            </div>
                            <div>
                                <label className="block text-xs font-semibold text-gray-600 mb-1">
                                    <Clock className="w-3 h-3 inline mr-1" />Thời gian
                                </label>
                                <input
                                    type="number"
                                    min={1}
                                    max={180}
                                    value={manualTimeLimit}
                                    onChange={e => {
                                        const val = e.target.value;
                                        if (val === '') {
                                            setManualTimeLimit('');
                                        } else {
                                            const num = parseInt(val, 10);
                                            if (!isNaN(num) && num >= 0 && num <= 180) {
                                                setManualTimeLimit(num);
                                            }
                                        }
                                    }}
                                    placeholder="Tự động"
                                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-orange-500/40"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-semibold text-gray-600 mb-1">Danh mục</label>
                                <select
                                    value={category}
                                    onChange={e => setCategory(e.target.value)}
                                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-orange-500/40"
                                >
                                    {QUIZ_CATEGORIES.map(cat => (
                                        <option key={cat.id} value={cat.id}>{cat.name}</option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        {/* Tags Input */}
                        <div>
                            <label className="block text-xs font-semibold text-gray-600 mb-1">
                                <Tag className="w-3 h-3 inline mr-1" />Nhãn (Tags)
                            </label>
                            <div className="flex flex-wrap gap-1 mb-1.5">
                                {tags.map((tag, idx) => (
                                    <span key={idx} className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full text-xs font-medium bg-blue-50 text-blue-600">
                                        {tag}
                                        <button onClick={() => setTags(tags.filter((_, i) => i !== idx))} className="ml-0.5 hover:text-red-500">
                                            <X className="w-3 h-3" />
                                        </button>
                                    </span>
                                ))}
                            </div>
                            <input
                                type="text"
                                value={tagInput}
                                onChange={e => setTagInput(e.target.value)}
                                onKeyDown={e => {
                                    if ((e.key === 'Enter' || e.key === ',') && tagInput.trim()) {
                                        e.preventDefault();
                                        addTagToState(tagInput);
                                        setTagInput('');
                                    }
                                }}
                                placeholder="Gõ tag rồi nhấn Enter (VD: #phan_so, #on_tap)"
                                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-orange-500/40"
                            />

                            {(aiDetectedCategory || aiDetectedLesson || aiSuggestedTags.length > 0) && (
                                <div className="mt-2 rounded-lg border border-emerald-200 bg-emerald-50/70 p-2.5 space-y-2">
                                    <p className="text-xs font-semibold text-emerald-700">
                                        AI đã gợi ý các tag liên quan. Bạn có thể bấm để áp dụng nhanh.
                                    </p>

                                    {aiDetectedCategory && (
                                        <div className="flex flex-wrap items-center gap-2">
                                            <span className="text-xs text-slate-600">
                                                Môn học gợi ý: <strong>{getCategoryLabel(aiDetectedCategory)}</strong>
                                            </span>
                                            <button
                                                type="button"
                                                onClick={handleApplyAiCategory}
                                                className="px-2 py-1 rounded-md text-xs font-semibold bg-emerald-600 text-white hover:bg-emerald-700"
                                            >
                                                Áp dụng gợi ý AI
                                            </button>
                                        </div>
                                    )}

                                    {aiDetectedLesson && (
                                        <div className="flex flex-wrap items-center gap-2">
                                            <span className="text-xs text-slate-600">
                                                Tên bài học gợi ý: <strong>{aiDetectedLesson}</strong>
                                            </span>
                                            <button
                                                type="button"
                                                onClick={handleApplyAiTitleSuggestion}
                                                className="px-2 py-1 rounded-md text-xs font-semibold bg-white border border-emerald-300 text-emerald-700 hover:bg-emerald-100"
                                            >
                                                Áp dụng gợi ý AI
                                            </button>
                                        </div>
                                    )}

                                    {aiSuggestedTags.length > 0 && (
                                        <div className="flex flex-wrap gap-1.5">
                                            {aiSuggestedTags.map((tag) => (
                                                <button
                                                    key={tag}
                                                    type="button"
                                                    onClick={() => addTagToState(tag)}
                                                    className={`px-2 py-1 rounded-full text-xs font-semibold border transition-colors ${tags.includes(tag)
                                                        ? 'bg-blue-100 border-blue-300 text-blue-700'
                                                        : 'bg-white border-emerald-300 text-emerald-700 hover:bg-emerald-100'
                                                        }`}
                                                >
                                                    #{tag}
                                                </button>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                </Section>

                {/* ====== SECTION 2: DẠNG CÂU HỎI ====== */}
                <Section
                    id="questionTypes"
                    icon={<BookOpen className="w-4 h-4" />}
                    title="Dạng câu hỏi"
                    badge={`${Object.values(selectedTypes).filter(Boolean).length} đã chọn`}
                    expandedSections={expandedSections}
                    toggleSection={toggleSection}
                >
                    <QuestionTypeSelector
                        selectedTypes={selectedTypes}
                        onChange={setSelectedTypes}
                    />
                </Section>

                {/* ====== SECTION 3: ĐỘ KHÓ & SỐ LƯỢNG ====== */}
                <Section
                    id="difficulty"
                    icon={<Sparkles className="w-4 h-4" />}
                    title="Độ khó & Số lượng"
                    badge={`${questionCount} câu`}
                    expandedSections={expandedSections}
                    toggleSection={toggleSection}
                >
                    <DifficultyLevelSelector
                        levels={difficultyLevels}
                        onChange={setDifficultyLevels}
                    />
                </Section>

                {/* ====== SECTION 4: NỘI DUNG BỔ SUNG ====== */}
                <Section
                    id="content"
                    icon={<FileText className="w-4 h-4" />}
                    title="Nội dung bổ sung"
                    subtitle="Tài liệu PDF, yêu cầu đặc biệt"
                    expandedSections={expandedSections}
                    toggleSection={toggleSection}
                >
                    <div className="space-y-3">
                        {/* Reference Content */}
                        <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-1">Nội dung tham khảo</label>
                            <textarea
                                value={content}
                                onChange={e => setContent(e.target.value)}
                                placeholder="Nhập nội dung bài học hoặc để trống để AI tự tạo..."
                                rows={3}
                                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-orange-500/40"
                            />
                        </div>

                        {/* PDF Upload */}
                        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border-2 border-dashed border-blue-300 rounded-xl p-4">
                            <label className="block text-sm font-bold text-blue-800 mb-2">
                                📄 Tải tài liệu bài học (PDF/Ảnh)
                            </label>
                            <input
                                ref={fileInputRef}
                                type="file"
                                accept=".pdf,image/*"
                                onChange={(e) => {
                                    const file = e.target.files?.[0];
                                    if (file) setUploadedFile(file);
                                }}
                                className="hidden"
                            />
                            {uploadedFile ? (
                                <div className="flex items-center justify-between bg-white rounded-lg p-3 border border-blue-200">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
                                            <FileCheck className="w-5 h-5 text-blue-600" />
                                        </div>
                                        <div>
                                            <p className="font-medium text-gray-800 text-sm truncate max-w-[200px]">
                                                {uploadedFile.name}
                                            </p>
                                            <p className="text-xs text-gray-500">
                                                {(uploadedFile.size / 1024).toFixed(1)} KB
                                            </p>
                                        </div>
                                    </div>
                                    <button
                                        onClick={() => {
                                            setUploadedFile(null);
                                            if (fileInputRef.current) fileInputRef.current.value = '';
                                        }}
                                        className="p-2 hover:bg-red-100 rounded-full text-red-500 transition-colors"
                                    >
                                        <X className="w-4 h-4" />
                                    </button>
                                </div>
                            ) : (
                                <button
                                    onClick={() => fileInputRef.current?.click()}
                                    className="w-full flex flex-col items-center justify-center py-4 hover:bg-blue-100/50 rounded-lg transition-colors cursor-pointer"
                                >
                                    <Upload className="w-6 h-6 text-blue-500 mb-1" />
                                    <span className="font-medium text-blue-700 text-sm">Nhấn để tải file</span>
                                    <span className="text-xs text-gray-500 mt-0.5">PDF, PNG, JPG (tối đa 20MB)</span>
                                </button>
                            )}
                        </div>

                        {/* Custom Prompt */}
                        <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-1">
                                ✨ Yêu cầu đặc biệt cho AI
                            </label>
                            <textarea
                                value={customPrompt}
                                onChange={e => setCustomPrompt(e.target.value)}
                                placeholder="VD: Tập trung vào phép cộng có nhớ, tạo nhiều câu hỏi thực tế..."
                                rows={2}
                                className="w-full px-3 py-2 border border-purple-200 rounded-lg text-sm focus:ring-2 focus:ring-purple-500/40 bg-purple-50/50"
                            />
                        </div>
                    </div>
                </Section>

                {/* ====== SECTION 5: TÙY CHỌN NÂNG CAO ====== */}
                <Section
                    id="advanced"
                    icon={<Settings className="w-4 h-4" />}
                    title="Tùy chọn nâng cao"
                    subtitle="Mã làm bài, hiển thị, AI provider"
                    expandedSections={expandedSections}
                    toggleSection={toggleSection}
                >
                    <div className="space-y-4">
                        {/* Access Code Toggle */}
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                {requireCode ? <Lock className="w-4 h-4 text-green-600" /> : <Unlock className="w-4 h-4 text-gray-400" />}
                                <div>
                                    <p className="font-medium text-gray-700 text-sm">Yêu cầu mã để làm bài</p>
                                    <p className="text-xs text-gray-500">Học sinh phải nhập mã mới được làm bài</p>
                                </div>
                            </div>
                            <button
                                type="button"
                                onClick={() => {
                                    setRequireCode(!requireCode);
                                    if (!requireCode && !accessCode) generateRandomCode();
                                }}
                                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${requireCode ? 'bg-green-500' : 'bg-gray-300'}`}
                            >
                                <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${requireCode ? 'translate-x-6' : 'translate-x-1'}`} />
                            </button>
                        </div>

                        {requireCode && (
                            <div className="flex items-center gap-3 pl-6 animate-fade-in">
                                <input
                                    type="text"
                                    value={accessCode}
                                    onChange={(e) => setAccessCode(e.target.value.toUpperCase())}
                                    placeholder="VD: TOAN3A"
                                    className="flex-1 px-3 py-2 border rounded-lg focus:ring-2 focus:ring-green-500 uppercase font-mono text-lg tracking-wider text-sm"
                                    maxLength={10}
                                />
                                <button
                                    type="button"
                                    onClick={generateRandomCode}
                                    className="px-3 py-2 bg-green-100 hover:bg-green-200 text-green-700 rounded-lg font-medium transition-colors text-sm"
                                >
                                    🎲 Tạo mã
                                </button>
                            </div>
                        )}

                        {/* Visibility Toggle */}
                        <div className="flex items-center justify-between pt-2 border-t border-gray-100">
                            <div className="flex items-center gap-2">
                                {showOnHome ? <Eye className="w-4 h-4 text-blue-600" /> : <EyeOff className="w-4 h-4 text-gray-400" />}
                                <div>
                                    <p className="font-medium text-gray-700 text-sm">Hiển thị trên trang chủ</p>
                                    <p className="text-xs text-gray-500">Tắt nếu muốn chống lộ đề</p>
                                </div>
                            </div>
                            <button
                                type="button"
                                onClick={() => setShowOnHome(!showOnHome)}
                                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${showOnHome ? 'bg-blue-500' : 'bg-gray-300'}`}
                            >
                                <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${showOnHome ? 'translate-x-6' : 'translate-x-1'}`} />
                            </button>
                        </div>

                        {/* AI Provider */}
                        <div className="pt-2 border-t border-gray-100">
                            <AIProviderSelector
                                value={aiProvider}
                                onChange={setAiProvider}
                                isAdmin={authStore.isAdmin}
                            />
                        </div>
                    </div>
                </Section>

                {/* ====== SECTION 6: GIAO BÀI ====== */}
                <Section
                    id="assign"
                    icon={<Calendar className="w-4 h-4" />}
                    title="Giao bài ngay"
                    subtitle="Tùy chọn giao bài cho lớp học"
                    expandedSections={expandedSections}
                    toggleSection={toggleSection}
                >
                    <div className="space-y-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="font-medium text-gray-700 text-sm">Giao ngay cho lớp</p>
                                <p className="text-xs text-gray-500">Học sinh thấy bài tập ngay sau khi lưu</p>
                            </div>
                            <button
                                type="button"
                                onClick={() => setAssignToClass(!assignToClass)}
                                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${assignToClass ? 'bg-orange-500' : 'bg-gray-300'}`}
                            >
                                <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${assignToClass ? 'translate-x-6' : 'translate-x-1'}`} />
                            </button>
                        </div>

                        {assignToClass && (
                            <div className="space-y-3 animate-fade-in">
                                <div>
                                    <label className="block text-xs font-semibold text-gray-600 mb-1">
                                        Chọn lớp <span className="text-red-500">*</span>
                                    </label>
                                    <div className="relative">
                                        <Users className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                                        <select
                                            value={selectedClassId}
                                            onChange={(e) => setSelectedClassId(e.target.value)}
                                            className="w-full pl-10 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-orange-500/40"
                                        >
                                            <option value="">-- Chọn lớp học --</option>
                                            {classroomStore.classes.map((cls) => (
                                                <option key={cls.id} value={cls.id}>{cls.name}</option>
                                            ))}
                                        </select>
                                    </div>
                                </div>
                                <div className="grid grid-cols-2 gap-3">
                                    <div>
                                        <label className="block text-xs font-semibold text-gray-600 mb-1">Hạn nộp</label>
                                        <div className="relative">
                                            <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                                            <input
                                                type="date"
                                                value={deadline}
                                                onChange={(e) => setDeadline(e.target.value)}
                                                className="w-full pl-10 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-orange-500/40"
                                            />
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-xs font-semibold text-gray-600 mb-1">Số lượt làm</label>
                                        <div className="relative">
                                            <Hash className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                                            <input
                                                type="number"
                                                min={1}
                                                max={10}
                                                value={maxAttempts}
                                                onChange={(e) => setMaxAttempts(parseInt(e.target.value))}
                                                className="w-full pl-10 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-orange-500/40"
                                            />
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </Section>

                {/* ====== ERROR ====== */}
                {error && (
                    <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm flex items-center gap-2">
                        <span>⚠️</span> {error}
                    </div>
                )}

                {/* ====== GENERATE BUTTONS ====== */}
                <div className="space-y-3 sticky bottom-0 bg-gradient-to-t from-gray-50 via-gray-50 to-transparent pt-4 pb-2">
                    {/* TRẠNG NGUYÊN SPECIFIC BUTTONS */}
                    {category === 'trang-nguyen' && (
                        <div className="space-y-2">
                            <button
                                onClick={() => { setTnSearchMode('search'); handleGenerate('practice'); }}
                                disabled={!topic.trim() || questionCount === 0 || isGenerating}
                                className={`w-full py-3.5 px-6 rounded-xl font-bold text-white text-base flex items-center justify-center gap-3 transition-all shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed ${isGenerating && tnSearchMode === 'search'
                                    ? 'bg-gradient-to-r from-purple-400 to-pink-400 animate-pulse'
                                    : 'bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700'
                                    }`}
                            >
                                <Search className="w-5 h-5" />
                                {isGenerating && tnSearchMode === 'search'
                                    ? (generationStep === 'reviewing' ? '🤖 Đang duyệt & soát lỗi...' : '🔍 Đang tìm kiếm đề thật...')
                                    : `🔍 Tạo đề (Search) - ${questionCount} câu`
                                }
                            </button>
                            <button
                                onClick={() => { setTnSearchMode('quick'); handleGenerate('practice'); }}
                                disabled={!topic.trim() || questionCount === 0 || isGenerating}
                                className={`w-full py-3.5 px-6 rounded-xl font-bold text-white text-base flex items-center justify-center gap-3 transition-all shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed ${isGenerating && tnSearchMode === 'quick'
                                    ? 'bg-gradient-to-r from-blue-400 to-cyan-400 animate-pulse'
                                    : 'bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600'
                                    }`}
                            >
                                <Zap className="w-5 h-5" />
                                {isGenerating && tnSearchMode === 'quick'
                                    ? (generationStep === 'reviewing' ? '🤖 Đang duyệt & soát lỗi...' : '⚡ Đang sinh đề...')
                                    : `⚡ Tạo đề nhanh (AI) - ${questionCount} câu`
                                }
                            </button>
                        </div>
                    )}

                    {/* STANDARD BUTTONS */}
                    {category !== 'trang-nguyen' && (
                        <>
                            {uploadedFile && (
                                <Button
                                    onClick={() => handleGenerate('pdf')}
                                    loading={isGenerating && quizMode === 'pdf'}
                                    disabled={!uploadedFile || questionCount === 0}
                                    className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700"
                                    size="lg"
                                    variant="primary"
                                    icon={<FileText className="w-5 h-5" />}
                                >
                                    {isGenerating && quizMode === 'pdf' ? (generationStep === 'reviewing' ? '🤖 Đang duyệt & soát lỗi...' : 'Đang đọc PDF...') : `📄 TẠO ĐỀ TỪ FILE: ${uploadedFile.name.substring(0, 20)}...`}
                                </Button>
                            )}
                            <div className="grid grid-cols-2 gap-3">
                                <button
                                    onClick={() => handleGenerate('exam')}
                                    disabled={!topic.trim() || questionCount === 0 || !customPrompt.trim() || isGenerating}
                                    className={`py-3.5 px-4 rounded-xl font-bold text-white flex items-center justify-center gap-2 transition-all shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed text-sm ${isGenerating && quizMode === 'exam'
                                        ? 'bg-gradient-to-r from-orange-400 to-red-400 animate-pulse'
                                        : 'bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600'
                                        }`}
                                >
                                    <FileText className="w-4 h-4" />
                                    {isGenerating && quizMode === 'exam' ? (generationStep === 'reviewing' ? '🤖 Đang duyệt & soát lỗi...' : 'Đang tạo bản thảo...') : '📝 Ra đề THI'}
                                </button>
                                <button
                                    onClick={() => handleGenerate('practice')}
                                    disabled={!topic.trim() || questionCount === 0 || isGenerating}
                                    className={`py-3.5 px-4 rounded-xl font-bold text-white flex items-center justify-center gap-2 transition-all shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed text-sm ${isGenerating && quizMode === 'practice'
                                        ? 'bg-gradient-to-r from-emerald-400 to-teal-400 animate-pulse'
                                        : 'bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600'
                                        }`}
                                >
                                    <Sparkles className="w-4 h-4" />
                                    {isGenerating && quizMode === 'practice' ? (generationStep === 'reviewing' ? '🤖 Đang duyệt & soát lỗi...' : 'Đang tạo bản thảo...') : '📚 Ra đề ÔN TẬP'}
                                </button>
                            </div>
                            <p className="text-xs text-gray-400 text-center">
                                💡 <strong>Đề thi:</strong> Theo yêu cầu GV | <strong>Ôn tập:</strong> AI tự tạo | <strong>PDF:</strong> Lấy nguyên văn
                            </p>
                        </>
                    )}
                </div>
            </div>

            {/* Right Column - Preview */}
            <div>
                <QuizPreview
                    quiz={generatedQuiz}
                    onSave={handleSaveQuiz}
                    isSaving={isSaving}
                    onUpdateQuestions={(questions) => {
                        if (generatedQuiz) {
                            setGeneratedQuiz({ ...generatedQuiz, questions });
                        }
                    }}
                    onCreateManual={handleCreateManual}
                    onRegenerateQuestion={handleRegenerateSingle}
                />
            </div>

            {/* Quiz Link Modal */}
            {showLinkModal && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
                    <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-2xl animate-scale-in">
                        {/* Success Icon */}
                        <div className="text-center mb-6">
                            <div className="w-16 h-16 rounded-full bg-gradient-to-br from-green-400 to-emerald-500 flex items-center justify-center mx-auto mb-4 shadow-lg">
                                <Check className="w-8 h-8 text-white" />
                            </div>
                            <h3 className="text-xl font-bold text-gray-800">Lưu đề thành công!</h3>
                            <p className="text-gray-500 text-sm mt-1">Chia sẻ link bên dưới cho học sinh để làm bài</p>
                        </div>

                        {/* Link Display */}
                        <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 mb-4">
                            <div className="flex items-center gap-2 mb-2">
                                <Link2 className="w-4 h-4 text-gray-500" />
                                <span className="text-sm font-medium text-gray-700">Link làm bài:</span>
                            </div>
                            <div className="bg-white border border-gray-300 rounded-lg p-3 font-mono text-sm text-blue-600 break-all">
                                {savedQuizLink}
                            </div>
                        </div>

                        {/* Copy Button */}
                        <button
                            onClick={handleCopyLink}
                            className={`w-full py-3 rounded-xl font-semibold flex items-center justify-center gap-2 transition-all ${linkCopied
                                ? 'bg-green-100 text-green-700 border-2 border-green-300'
                                : 'bg-gradient-to-r from-blue-500 to-indigo-600 text-white hover:shadow-lg'
                                }`}
                        >
                            {linkCopied ? (
                                <>
                                    <Check className="w-5 h-5" />
                                    Đã copy link!
                                </>
                            ) : (
                                <>
                                    <Copy className="w-5 h-5" />
                                    Copy link gửi học sinh
                                </>
                            )}
                        </button>

                        {/* Close Button */}
                        <button
                            onClick={() => setShowLinkModal(false)}
                            className="w-full mt-3 py-2 text-gray-500 hover:text-gray-700 text-sm font-medium"
                        >
                            Đóng
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default CreateTab;
