import React, { useState, useEffect, useRef } from 'react';
import { Quiz, QuestionType, ImageLibraryItem } from '../../types';
import { Card, Button } from '../common';
import { FileText, Sparkles, Upload, X, FileCheck, Copy, Check, Link2, BookOpen, Search, Zap } from 'lucide-react';
import { AIProvider, generateQuiz, QuizGenerationOptions } from '../../services/geminiService';
import { generateTrangNguyenQuiz, TRANG_NGUYEN_TOPICS } from '../../services/trangNguyenGeminiService';
import { searchTrangNguyenQuestions, enrichPromptWithSearchResults } from '../../services/trangNguyenSearchService';
import { QuestionTypeSelector, DifficultyLevelSelector, ImageLibrary, AIProviderSelector } from '../teacher/QuizCreator';
import QuizPreview from './QuizPreview';
import { QUIZ_CATEGORIES } from '../../config/constants';
import { useAuthStore } from '../../../stores/authStore';

interface CreateTabProps {
    editingQuiz: Quiz | null;
    onSaveQuiz: (quiz: Quiz) => Promise<void>;
    onUpdateQuiz: (quiz: Quiz) => Promise<void>;
    onSuccess: () => void;
}

const CreateTab: React.FC<CreateTabProps> = ({ editingQuiz, onSaveQuiz, onUpdateQuiz, onSuccess }) => {
    // Auth store - to get teacher name and class
    const authStore = useAuthStore();

    // Check if teacher is locked to a specific class (non-admin with assigned class)
    const isClassLocked = !authStore.isAdmin && !!authStore.teacherClass;
    const lockedClass = authStore.teacherClass || '3';

    // Form state
    const [topic, setTopic] = useState('');
    const [quizTitle, setQuizTitle] = useState('');
    const [classLevel, setClassLevel] = useState(isClassLocked ? lockedClass : '3');
    const [category, setCategory] = useState('on-tap'); // Mặc định: Ôn tập theo chủ đề
    const [content, setContent] = useState('');
    const [manualTimeLimit, setManualTimeLimit] = useState<number | ''>('');
    const [isGenerating, setIsGenerating] = useState(false);
    const [generatedQuiz, setGeneratedQuiz] = useState<Quiz | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [isSaving, setIsSaving] = useState(false);
    const [customPrompt, setCustomPrompt] = useState('');
    const [quizMode, setQuizMode] = useState<'exam' | 'practice'>('practice');
    const [aiProvider, setAiProvider] = useState<AIProvider>(() =>
        (localStorage.getItem('ai_provider') as AIProvider) || 'gemini'
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

    // Access Code state
    const [requireCode, setRequireCode] = useState(false);
    const [accessCode, setAccessCode] = useState('');

    // PDF/Document file upload
    const [uploadedFile, setUploadedFile] = useState<File | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Quiz link modal state
    const [showLinkModal, setShowLinkModal] = useState(false);
    const [savedQuizLink, setSavedQuizLink] = useState('');
    const [linkCopied, setLinkCopied] = useState(false);

    // Image library
    const [imageLibrary, setImageLibrary] = useState<ImageLibraryItem[]>(() => {
        const saved = localStorage.getItem('quiz_image_library');
        return saved ? JSON.parse(saved) : [];
    });

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
            setCategory(editingQuiz.category || 'vioedu');
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
            setCustomPrompt('');
            setUploadedFile(null);
            setCategory('on-tap'); // Mặc định: Ôn tập theo chủ đề
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

            // Sync access code settings
            if (requireCode !== generatedQuiz.requireCode) {
                updates.requireCode = requireCode;
            }
            if (accessCode !== generatedQuiz.accessCode) {
                updates.accessCode = accessCode.toUpperCase() || undefined;
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
    }, [manualTimeLimit, classLevel, category, requireCode, accessCode, quizTitle, authStore.teacherName]);


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

    // Handle quiz generation
    const handleGenerate = async () => {
        const isPdfMode = (quizMode as any) === 'pdf';

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

        try {
            const isPdfMode = (quizMode as any) === 'pdf';
            const isTrangNguyen = category === 'trang-nguyen';
            const titlePrefix = isPdfMode ? 'Đề từ PDF' : (quizMode === 'exam' ? 'Kiểm tra' : 'Ôn tập');

            // ===== TRẠNG NGUYÊN MODE =====
            if (isTrangNguyen) {
                console.log('[CreateTab] Trạng Nguyên mode - using specialized service');
                console.log('[CreateTab] Search mode:', tnSearchMode);

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
                };

                setGeneratedQuiz(quiz);
                setIsGenerating(false);
                return;
            }

            // ===== STANDARD MODE =====
            // Special prompt for PDF mode
            let finalCustomPrompt = customPrompt.trim() || undefined;
            if (isPdfMode) {
                finalCustomPrompt = `⛔ CHẾ ĐỘ TẠO ĐỀ TỪ PDF - BẮT BUỘC TUÂN THỦ:
1. ĐỌC KỸ TOÀN BỘ NỘI DUNG trong file đính kèm.
2. NẾU FILE CÓ CÂU HỎI: COPY NGUYÊN VĂN tất cả câu hỏi, đáp án - KHÔNG ĐƯỢC sửa đổi.
3. NẾU FILE LÀ BÀI HỌC: Tạo câu hỏi DỰA TRÊN nội dung trong file.
4. KHÔNG ĐƯỢC tự bịa nội dung ngoài file.
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
                customPrompt: isPdfMode ? finalCustomPrompt : (quizMode === 'exam' ? customPrompt.trim() : (customPrompt.trim() || undefined)),
                isPdfMode: isPdfMode, // Flag để AI biết chỉ dùng nội dung từ PDF
            };

            const result = await generateQuiz(
                topic,
                classLevel,
                content,
                uploadedFile, // Pass PDF/image file for AI to read
                options,
                undefined,
                aiProvider
            );

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
                category: category, // Lưu danh mục
            };

            setGeneratedQuiz(quiz);
        } catch (err: any) {
            console.error('Quiz generation error:', err);
            setError(err.message || 'Đã xảy ra lỗi khi tạo đề');
        } finally {
            setIsGenerating(false);
        }
    };

    // Handle save quiz
    const handleSaveQuiz = async () => {
        if (!generatedQuiz || isSaving) return;

        setIsSaving(true);
        try {
            if (editingQuiz) {
                await onUpdateQuiz(generatedQuiz);
            } else {
                await onSaveQuiz(generatedQuiz);
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
            setUploadedFile(null);
            setGeneratedQuiz(null);

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
            console.error('Failed to copy:', err);
        }
    };

    const questionCount = difficultyLevels.level1 + difficultyLevels.level2 + difficultyLevels.level3;

    return (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Left Column - Form */}
            <div className="space-y-4">
                <Card title={editingQuiz ? '📝 Chỉnh sửa đề' : '✨ Tạo đề kiểm tra mới'}>
                    <div className="space-y-4">
                        {/* Basic Info */}
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-1">
                                    Khối Lớp {isClassLocked && <span className="text-orange-500 text-xs">(Đã khóa)</span>}
                                </label>
                                <select
                                    value={classLevel}
                                    onChange={e => setClassLevel(e.target.value)}
                                    disabled={isClassLocked}
                                    className={`w-full p-2 border rounded-lg focus:ring-2 focus:ring-orange-500 ${isClassLocked ? 'bg-gray-100 cursor-not-allowed' : ''}`}
                                >
                                    {[1, 2, 3, 4, 5].map(l => <option key={l} value={l}>Lớp {l}</option>)}
                                </select>
                                {isClassLocked && (
                                    <p className="text-xs text-gray-500 mt-1">Bạn chỉ có thể tạo đề cho lớp {lockedClass}</p>
                                )}
                            </div>
                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-1">Thời gian (phút)</label>
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
                                    className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-orange-500"
                                />
                            </div>
                        </div>

                        {/* Category Selector */}
                        <div>
                            <label className="block text-sm font-bold text-gray-700 mb-1">Danh mục</label>
                            <select
                                value={category}
                                onChange={e => setCategory(e.target.value)}
                                className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-orange-500"
                            >
                                {QUIZ_CATEGORIES.map(cat => (
                                    <option key={cat.id} value={cat.id}>{cat.name}</option>
                                ))}
                            </select>
                        </div>

                        <div>
                            <label className="block text-sm font-bold text-gray-700 mb-1">
                                Chủ đề bài học <span className="text-red-500">*</span>
                            </label>
                            <input
                                type="text"
                                value={topic}
                                onChange={e => setTopic(e.target.value)}
                                placeholder="Ví dụ: Động vật rừng xanh"
                                className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-orange-500"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-bold text-gray-700 mb-1">Tên bài kiểm tra</label>
                            <input
                                type="text"
                                value={quizTitle}
                                onChange={e => setQuizTitle(e.target.value)}
                                placeholder="Ví dụ: Kiểm tra 15 phút..."
                                className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-orange-500"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-bold text-gray-700 mb-1">Nội dung tham khảo</label>
                            <textarea
                                value={content}
                                onChange={e => setContent(e.target.value)}
                                placeholder="Nhập nội dung bài học hoặc để trống để AI tự tạo..."
                                rows={3}
                                className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-orange-500"
                            />
                        </div>

                        {/* PDF/Document Upload - HIGH PRIORITY */}
                        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border-2 border-dashed border-blue-300 rounded-xl p-4">
                            <label className="block text-sm font-bold text-blue-800 mb-2">
                                📄 Tải tài liệu bài học (PDF/Ảnh) - <span className="text-red-500">ƯU TIÊN CAO NHẤT</span>
                            </label>
                            <p className="text-xs text-blue-600 mb-3">
                                AI sẽ đọc nội dung từ file này và ưu tiên tạo câu hỏi dựa trên tài liệu đã tải lên.
                            </p>

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
                                                {(uploadedFile.size / 1024).toFixed(1)} KB • {uploadedFile.type.split('/')[1]?.toUpperCase()}
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
                                    className="w-full flex flex-col items-center justify-center py-6 hover:bg-blue-100/50 rounded-lg transition-colors cursor-pointer"
                                >
                                    <Upload className="w-8 h-8 text-blue-500 mb-2" />
                                    <span className="font-medium text-blue-700">Nhấn để tải file</span>
                                    <span className="text-xs text-gray-500 mt-1">PDF, PNG, JPG (tối đa 20MB)</span>
                                </button>
                            )}

                            {uploadedFile && (
                                <div className="mt-3 p-2 bg-green-50 border border-green-200 rounded-lg">
                                    <p className="text-xs text-green-700 flex items-center gap-1">
                                        ✅ <strong>AI sẽ ưu tiên đọc file này</strong> để tạo câu hỏi phù hợp với nội dung bài học.
                                    </p>
                                </div>
                            )}
                        </div>

                        {/* Custom Prompt */}
                        <div>
                            <label className="block text-sm font-bold text-gray-700 mb-1">
                                ✨ Yêu cầu đặc biệt cho AI <span className="text-xs font-normal text-gray-500">(Ưu tiên cao nhất)</span>
                            </label>
                            <textarea
                                value={customPrompt}
                                onChange={e => setCustomPrompt(e.target.value)}
                                placeholder="Ví dụ: Tập trung vào phép cộng có nhớ, tạo nhiều câu hỏi thực tế, không dùng số âm..."
                                rows={2}
                                className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-purple-500 border-purple-200 bg-purple-50"
                            />
                            <p className="text-xs text-gray-500 mt-1">
                                💡 Ghi yêu cầu đặc biệt để AI ưu tiên khi tạo đề (VD: kiểu câu hỏi, nội dung cần tránh, độ khó...)
                            </p>
                        </div>
                    </div>
                </Card>

                {/* Access Code Section */}
                <Card title="🔐 Mã làm bài">
                    <div className="space-y-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="font-medium text-gray-700">Yêu cầu mã để làm bài</p>
                                <p className="text-sm text-gray-500">Học sinh phải nhập đúng mã mới được làm bài</p>
                            </div>
                            <button
                                type="button"
                                onClick={() => {
                                    setRequireCode(!requireCode);
                                    if (!requireCode && !accessCode) {
                                        generateRandomCode();
                                    }
                                }}
                                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${requireCode ? 'bg-green-500' : 'bg-gray-300'
                                    }`}
                            >
                                <span
                                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${requireCode ? 'translate-x-6' : 'translate-x-1'
                                        }`}
                                />
                            </button>
                        </div>

                        {requireCode && (
                            <div className="flex items-center gap-3">
                                <div className="flex-1">
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Mã truy cập</label>
                                    <input
                                        type="text"
                                        value={accessCode}
                                        onChange={(e) => setAccessCode(e.target.value.toUpperCase())}
                                        placeholder="Nhập mã (VD: TOAN3A)"
                                        className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-green-500 uppercase font-mono text-lg tracking-wider"
                                        maxLength={10}
                                    />
                                </div>
                                <button
                                    type="button"
                                    onClick={generateRandomCode}
                                    className="px-4 py-2 bg-green-100 hover:bg-green-200 text-green-700 rounded-lg font-medium transition-colors mt-6"
                                >
                                    🎲 Tạo mã
                                </button>
                            </div>
                        )}
                    </div>
                </Card>

                {/* Question Types */}
                <QuestionTypeSelector
                    selectedTypes={selectedTypes}
                    onChange={setSelectedTypes}
                />

                {/* Difficulty Levels */}
                <DifficultyLevelSelector
                    levels={difficultyLevels}
                    onChange={setDifficultyLevels}
                />

                {/* AI Provider - Perplexity only for admin */}
                <AIProviderSelector
                    value={aiProvider}
                    onChange={setAiProvider}
                    isAdmin={authStore.isAdmin}
                />

                {/* Image Library section has been removed as per user request */}

                {/* Error */}
                {error && (
                    <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
                        {error}
                    </div>
                )}

                {/* Generate Buttons */}
                <div className="space-y-3">
                    {/* TRẠNG NGUYÊN SPECIFIC BUTTONS */}
                    {category === 'trang-nguyen' && (
                        <div className="space-y-3">
                            {/* Search + Generate Button */}
                            <button
                                onClick={() => { setTnSearchMode('search'); setQuizMode('practice'); handleGenerate(); }}
                                disabled={!topic.trim() || questionCount === 0 || isGenerating}
                                className={`w-full py-4 px-6 rounded-xl font-bold text-white text-lg flex items-center justify-center gap-3 transition-all shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed ${isGenerating && tnSearchMode === 'search'
                                    ? 'bg-gradient-to-r from-purple-400 to-pink-400 animate-pulse'
                                    : 'bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700'
                                    }`}
                            >
                                <Search className="w-5 h-5" />
                                <span>🔍</span>
                                {isGenerating && tnSearchMode === 'search'
                                    ? 'Đang tìm kiếm đề thật...'
                                    : `Tạo đề (Perplexity + Search) - ${questionCount} câu`
                                }
                            </button>
                            <p className="text-xs text-gray-500 text-center">
                                Tìm kiếm đề Trạng Nguyên thật trên mạng trước khi sinh • Chất lượng cao hơn • Chậm hơn
                            </p>

                            {/* Quick AI Generate Button */}
                            <button
                                onClick={() => { setTnSearchMode('quick'); setQuizMode('practice'); handleGenerate(); }}
                                disabled={!topic.trim() || questionCount === 0 || isGenerating}
                                className={`w-full py-4 px-6 rounded-xl font-bold text-white text-lg flex items-center justify-center gap-3 transition-all shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed ${isGenerating && tnSearchMode === 'quick'
                                    ? 'bg-gradient-to-r from-blue-400 to-cyan-400 animate-pulse'
                                    : 'bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600'
                                    }`}
                            >
                                <Zap className="w-5 h-5" />
                                <span>⚡</span>
                                {isGenerating && tnSearchMode === 'quick'
                                    ? 'Đang sinh đề...'
                                    : `Tạo đề nhanh (AI) - ${questionCount} câu`
                                }
                            </button>
                            <p className="text-xs text-gray-500 text-center">
                                Sinh trực tiếp bằng AI • Nhanh hơn • Không cần Perplexity API
                            </p>
                        </div>
                    )}

                    {/* STANDARD BUTTONS (for other categories) */}
                    {category !== 'trang-nguyen' && (
                        <>
                            {/* PDF-based generation button */}
                            {uploadedFile && (
                                <Button
                                    onClick={() => { setQuizMode('pdf' as any); handleGenerate(); }}
                                    loading={isGenerating && (quizMode as any) === 'pdf'}
                                    disabled={!uploadedFile || questionCount === 0}
                                    className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700"
                                    size="lg"
                                    variant="primary"
                                    icon={<FileText className="w-5 h-5" />}
                                >
                                    {isGenerating && (quizMode as any) === 'pdf' ? 'Đang đọc PDF...' : `📄 TẠO ĐỀ TỪ FILE: ${uploadedFile.name.substring(0, 20)}...`}
                                </Button>
                            )}

                            <div className="grid grid-cols-2 gap-3">
                                <Button
                                    onClick={() => { setQuizMode('exam'); handleGenerate(); }}
                                    loading={isGenerating && quizMode === 'exam'}
                                    disabled={!topic.trim() || questionCount === 0 || !customPrompt.trim()}
                                    className="w-full"
                                    size="lg"
                                    variant="primary"
                                    icon={<FileText className="w-5 h-5" />}
                                >
                                    {isGenerating && quizMode === 'exam' ? 'Đang tạo...' : '📝 Ra đề THI'}
                                </Button>
                                <Button
                                    onClick={() => { setQuizMode('practice'); handleGenerate(); }}
                                    loading={isGenerating && quizMode === 'practice'}
                                    disabled={!topic.trim() || questionCount === 0}
                                    className="w-full"
                                    size="lg"
                                    variant="secondary"
                                    icon={<Sparkles className="w-5 h-5" />}
                                >
                                    {isGenerating && quizMode === 'practice' ? 'Đang tạo...' : '📚 Ra đề ÔN TẬP'}
                                </Button>
                            </div>
                            <p className="text-xs text-gray-500 text-center">
                                💡 <strong>Đề từ PDF:</strong> AI đọc file và lấy nguyên văn câu hỏi | <strong>Đề thi:</strong> Theo yêu cầu GV | <strong>Ôn tập:</strong> AI tự tạo
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

