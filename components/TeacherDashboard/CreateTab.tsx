import React, { useState, useEffect, useRef } from 'react';
import { Quiz, QuestionType, ImageLibraryItem } from '../../types';
import { Card, Button } from '../../src/components/common';
import { FileText, Sparkles, Upload, X, FileCheck } from 'lucide-react';
import { AIProvider, generateQuiz, QuizGenerationOptions } from '../../geminiService';
import { QuestionTypeSelector, DifficultyLevelSelector, ImageLibrary, AIProviderSelector } from '../../src/components/teacher/QuizCreator';
import QuizPreview from './QuizPreview';

interface CreateTabProps {
    editingQuiz: Quiz | null;
    onSaveQuiz: (quiz: Quiz) => Promise<void>;
    onUpdateQuiz: (quiz: Quiz) => Promise<void>;
    onSuccess: () => void;
}

const CreateTab: React.FC<CreateTabProps> = ({ editingQuiz, onSaveQuiz, onUpdateQuiz, onSuccess }) => {
    // Form state
    const [topic, setTopic] = useState('');
    const [quizTitle, setQuizTitle] = useState('');
    const [classLevel, setClassLevel] = useState('3');
    const [content, setContent] = useState('');
    const [manualTimeLimit, setManualTimeLimit] = useState<number | ''>('');
    const [isGenerating, setIsGenerating] = useState(false);
    const [generatedQuiz, setGeneratedQuiz] = useState<Quiz | null>(null);
    const [error, setError] = useState<string | null>(null);
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

    // Access Code state
    const [requireCode, setRequireCode] = useState(false);
    const [accessCode, setAccessCode] = useState('');

    // PDF/Document file upload
    const [uploadedFile, setUploadedFile] = useState<File | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

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
            // We don't restore selectedTypes/difficultyLevels from quiz yet as it's complex to reverse engineer
        } else {
            // Reset form for new quiz
            setTopic('');
            setQuizTitle('');
            setClassLevel('3');
            setContent('');
            setManualTimeLimit('');
            setGeneratedQuiz(null);
            setRequireCode(false);
            setAccessCode('');
            setCustomPrompt('');
            setUploadedFile(null);
        }
    }, [editingQuiz]);

    // Save persistence
    useEffect(() => {
        localStorage.setItem('quiz_image_library', JSON.stringify(imageLibrary));
    }, [imageLibrary]);

    useEffect(() => {
        localStorage.setItem('ai_provider', aiProvider);
    }, [aiProvider]);

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
        if (!topic.trim()) {
            setError('Vui lòng nhập chủ đề bài học');
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

        try {
            const titlePrefix = quizMode === 'exam' ? 'Kiểm tra' : 'Ôn tập';

            const options: QuizGenerationOptions = {
                title: quizTitle || `${titlePrefix}: ${topic}`,
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
                customPrompt: quizMode === 'exam' ? customPrompt.trim() : (customPrompt.trim() || undefined),
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
                accessCode: requireCode ? accessCode.toUpperCase() : undefined,
                requireCode: requireCode,
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
        if (!generatedQuiz) return;

        try {
            if (editingQuiz) {
                await onUpdateQuiz(generatedQuiz);
            } else {
                await onSaveQuiz(generatedQuiz);
            }

            // Reset form
            setTopic('');
            setQuizTitle('');
            setContent('');
            setCustomPrompt('');
            setRequireCode(false);
            setAccessCode('');
            setUploadedFile(null);
            setGeneratedQuiz(null);

            alert('Đã lưu bài kiểm tra thành công!');
            onSuccess();
        } catch (err: any) {
            setError(err.message || 'Lỗi khi lưu bài kiểm tra');
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
                                <label className="block text-sm font-bold text-gray-700 mb-1">Khối Lớp</label>
                                <select
                                    value={classLevel}
                                    onChange={e => setClassLevel(e.target.value)}
                                    className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-orange-500"
                                >
                                    {[1, 2, 3, 4, 5].map(l => <option key={l} value={l}>Lớp {l}</option>)}
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-1">Thời gian (phút)</label>
                                <input
                                    type="number"
                                    min={1}
                                    value={manualTimeLimit}
                                    onChange={e => setManualTimeLimit(Number(e.target.value) || '')}
                                    placeholder="Tự động"
                                    className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-orange-500"
                                />
                            </div>
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

                {/* AI Provider */}
                <AIProviderSelector
                    value={aiProvider}
                    onChange={setAiProvider}
                />

                {/* Image Library */}
                <ImageLibrary
                    images={imageLibrary}
                    onChange={setImageLibrary}
                    topic={topic}
                />

                {/* Error */}
                {error && (
                    <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
                        {error}
                    </div>
                )}

                {/* Generate Buttons */}
                <div className="space-y-3">
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
                        💡 <strong>Đề thi:</strong> AI ưu tiên theo yêu cầu đặc biệt của giáo viên | <strong>Đề ôn tập:</strong> AI tự động tạo theo cấu hình
                    </p>
                </div>
            </div>

            {/* Right Column - Preview */}
            <div>
                <QuizPreview
                    quiz={generatedQuiz}
                    onSave={handleSaveQuiz}
                />
            </div>
        </div>
    );
};

export default CreateTab;
