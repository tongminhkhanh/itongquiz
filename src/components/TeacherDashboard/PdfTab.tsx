import React, { useState, useRef, useCallback } from 'react';
import { Quiz, Question, QuestionType } from '../../types';
import { Card, Button, Modal } from '../common';
import { Upload, FileText, Save, Loader2, X, FileCheck, Sparkles, CheckCircle, AlertCircle, Edit3, Wand2, Trash2, Bot, Lock, Clock, ListChecks } from 'lucide-react';
import { AIProvider, generateQuiz, QuizGenerationOptions, extractTextFromPdf } from '../../services/geminiService';
import { AIProviderSelector } from '../teacher/QuizCreator';

interface PdfTabProps {
    onSaveQuiz: (quiz: Quiz) => Promise<void>;
    onSuccess: () => void;
}

// Step enum for the workflow
type Step = 'upload' | 'edit' | 'preview';

// AI Providers for quiz generation (excluding native-ocr which is OCR only)
const QUIZ_GEN_PROVIDERS = [
    { id: 'gemini', name: 'Google Gemini', description: '2.0 Flash (Miễn phí)' },
    { id: 'perplexity', name: 'Perplexity', description: 'Sonar model' },
    { id: 'llm-mux', name: 'LLM-Mux', description: 'Local proxy' },
];

// Question type options for selection
const QUESTION_TYPE_OPTIONS = [
    { type: QuestionType.MCQ, label: 'Trắc nghiệm', icon: '📝', color: 'blue' },
    { type: QuestionType.TRUE_FALSE, label: 'Đúng / Sai', icon: '✅', color: 'green' },
    { type: QuestionType.SHORT_ANSWER, label: 'Điền đáp án', icon: '✏️', color: 'purple' },
    { type: QuestionType.MATCHING, label: 'Nối cột', icon: '🔗', color: 'orange' },
    { type: QuestionType.MULTIPLE_SELECT, label: 'Chọn nhiều', icon: '☑️', color: 'indigo' },
    { type: QuestionType.DRAG_DROP, label: 'Kéo thả', icon: '🎯', color: 'pink' },
    { type: QuestionType.ORDERING, label: 'Sắp xếp thứ tự', icon: '📋', color: 'cyan' },
];

const PdfTab: React.FC<PdfTabProps> = ({ onSaveQuiz, onSuccess }) => {
    // Current step
    const [currentStep, setCurrentStep] = useState<Step>('upload');

    // File upload state
    const [uploadedFile, setUploadedFile] = useState<File | null>(null);
    const [isDragging, setIsDragging] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // OCR/Text extraction state
    const [isExtracting, setIsExtracting] = useState(false);
    const [extractedText, setExtractedText] = useState<string>('');
    const [editedText, setEditedText] = useState<string>('');

    // Question generation state
    const [isGenerating, setIsGenerating] = useState(false);
    const [extractedQuestions, setExtractedQuestions] = useState<Question[]>([]);

    // Messages
    const [error, setError] = useState<string | null>(null);
    const [successMessage, setSuccessMessage] = useState<string | null>(null);

    // Settings - Basic
    const [classLevel, setClassLevel] = useState('3');
    const [quizTitle, setQuizTitle] = useState('');
    const [timeLimit, setTimeLimit] = useState<number | ''>(''); // Empty = auto

    // Settings - Access Code
    const [requireAccessCode, setRequireAccessCode] = useState(false);
    const [accessCode, setAccessCode] = useState('');

    // Settings - Question Types
    const [selectedQuestionTypes, setSelectedQuestionTypes] = useState<QuestionType[]>([
        QuestionType.MCQ,
        QuestionType.TRUE_FALSE,
        QuestionType.SHORT_ANSWER,
        QuestionType.MATCHING,
    ]);

    // AI Provider states
    const [aiProvider, setAiProvider] = useState<AIProvider>(() =>
        (localStorage.getItem('ai_provider') as AIProvider) || 'gemini'
    );
    // Separate AI provider for quiz generation (step 2)
    const [genAiProvider, setGenAiProvider] = useState<AIProvider>(() =>
        (localStorage.getItem('gen_ai_provider') as AIProvider) || 'gemini'
    );

    // Save state
    const [isSaving, setIsSaving] = useState(false);

    // Edit question modal state
    const [editingQuestion, setEditingQuestion] = useState<Question | null>(null);
    const [editQuestionText, setEditQuestionText] = useState('');
    const [editOptions, setEditOptions] = useState<string[]>([]);
    const [editCorrectAnswer, setEditCorrectAnswer] = useState('');

    // Toggle question type selection
    const toggleQuestionType = (type: QuestionType) => {
        setSelectedQuestionTypes(prev => {
            if (prev.includes(type)) {
                // Don't allow removing all types
                if (prev.length === 1) return prev;
                return prev.filter(t => t !== type);
            }
            return [...prev, type];
        });
    };

    // Generate random access code
    const generateAccessCode = () => {
        const code = Math.random().toString(36).substring(2, 8).toUpperCase();
        setAccessCode(code);
    };

    // Drag & Drop handlers
    const handleDragOver = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(true);
    }, []);

    const handleDragLeave = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);
    }, []);

    const handleDrop = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);

        const file = e.dataTransfer.files[0];
        if (file && (file.type === 'application/pdf' || file.type.startsWith('image/'))) {
            setUploadedFile(file);
            setError(null);
        } else {
            setError('Vui lòng tải lên file PDF hoặc ảnh');
        }
    }, []);

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            setUploadedFile(file);
            setError(null);
        }
    };

    // Step 1: Extract text from PDF using dedicated OCR function
    // Step 1: Extract text from PDF using dedicated OCR function
    const handleExtractText = async () => {
        console.log('handleExtractText called');
        console.log('Current aiProvider:', aiProvider);
        console.log('Uploaded file:', uploadedFile);

        if (!uploadedFile) {
            setError('Vui lòng tải lên file PDF hoặc ảnh');
            return;
        }

        // Check if using supported provider for OCR (Gemini, LLM-Mux, or Native OCR)
        if (aiProvider !== 'gemini' && aiProvider !== 'llm-mux' && aiProvider !== 'native-ocr') {
            setError('Chức năng trích xuất văn bản từ PDF chỉ hỗ trợ với Gemini, LLM-Mux hoặc Native OCR. Vui lòng chọn một trong các provider này.');
            return;
        }

        setIsExtracting(true);
        setError(null);
        setSuccessMessage(null);

        try {
            console.log('Calling extractTextFromPdf...');
            // Use dedicated OCR function that returns raw text
            const text = await extractTextFromPdf(uploadedFile, aiProvider);
            console.log('extractTextFromPdf result length:', text?.length);

            if (text && text.length > 50) {
                setExtractedText(text);
                setEditedText(text);
                setCurrentStep('edit');
                setSuccessMessage(`Đã trích xuất ${text.length} ký tự từ file`);
            } else {
                setError('Không thể trích xuất văn bản từ file. Vui lòng thử lại hoặc dùng file khác.');
            }
        } catch (err: any) {
            console.error('Text extraction error in PdfTab:', err);
            setError(err.message || 'Đã xảy ra lỗi khi trích xuất văn bản');
        } finally {
            setIsExtracting(false);
        }
    };

    // Step 2: Generate questions from edited text
    const handleGenerateQuestions = async () => {
        if (!editedText.trim()) {
            setError('Vui lòng nhập văn bản để tạo câu hỏi');
            return;
        }

        setIsGenerating(true);
        setError(null);
        setSuccessMessage(null);

        try {
            const options: QuizGenerationOptions = {
                title: quizTitle || `Đề từ PDF: ${uploadedFile?.name.replace(/\.[^/.]+$/, '') || 'Bài kiểm tra'}`,
                questionCount: 50, // Max questions to extract
                questionTypes: selectedQuestionTypes,
                isPdfMode: true,
                customPrompt: `⛔ CHẾ ĐỘ TẠO ĐỀ TỪ VĂN BẢN ĐÃ TRÍCH XUẤT - BẮT BUỘC TUÂN THỦ:

🔍 BƯỚC 1: XỬ LÝ LỖI OCR (Optical Character Recognition)
- Tự động sửa các lỗi OCR phổ biến: chữ bị nhận sai (0→O, 1→l, rn→m, cl→d)
- Nhận diện và sửa lỗi dấu tiếng Việt bị sai hoặc thiếu (a→ă, â; o→ô, ơ; e→ê)
- Phục hồi các ký tự đặc biệt bị nhận nhầm (%, &, @, #)
- Nối các từ bị tách sai do xuống hàng trong PDF gốc

📖 BƯỚC 2: ĐỌC VÀ HIỂU NỘI DUNG
1. ĐỌC KỸ toàn bộ văn bản được cung cấp dưới đây.
2. XÁC ĐỊNH cấu trúc đề thi: phần, bài, câu hỏi, đáp án, lời giải.
3. NHẬN DIỆN các đoạn văn đọc hiểu, bài thơ, bảng số liệu nếu có.

✏️ BƯỚC 3: TRÍCH XUẤT CÂU HỎI
1. TRÍCH XUẤT tất cả câu hỏi và đáp án từ văn bản - KHÔNG thay đổi nội dung gốc.
2. GIỮ NGUYÊN định dạng văn bản quan trọng:
   - Chữ in đậm → <b>text</b>
   - Chữ in nghiêng → <i>text</i>  
   - Chữ gạch chân → <u>text</u>
   - Xuống hàng → <br/>
3. VỚI CÂU HỎI ĐỌC HIỂU: Trích xuất TOÀN BỘ đoạn văn/bài thơ vào trường "passage" trước khi liệt kê các câu hỏi liên quan.
4. TRÍCH XUẤT lời giải (explanation) nếu có trong văn bản gốc.

📋 BƯỚC 4: PHÂN LOẠI DẠNG CÂU HỎI
- MCQ (Trắc nghiệm): có các lựa chọn A, B, C, D
- TRUE_FALSE (Đúng/Sai): có Đ/S hoặc Đúng/Sai cho mỗi phát biểu
- SHORT_ANSWER (Tự luận ngắn): yêu cầu điền đáp án ngắn (số, từ, cụm từ)
- MATCHING (Nối cột): có 2 cột để nối tương ứng
- ORDERING (Sắp xếp): yêu cầu sắp xếp các mục theo thứ tự đúng
- DRAG_DROP (Điền từ): điền từ vào chỗ trống trong câu

⚠️ QUY TẮC BẮT BUỘC:
1. KHÔNG ĐƯỢC tự bịa thêm câu hỏi - chỉ trích xuất từ văn bản gốc.
2. BỎ QUA câu hỏi yêu cầu nhìn hình ảnh/biểu đồ nếu không có mô tả text.
3. GIỮ NGUYÊN số thứ tự câu hỏi như trong đề gốc.
4. ĐẢM BẢO đáp án chính xác theo đáp án trong văn bản (nếu có).

📝 VĂN BẢN ĐÃ TRÍCH XUẤT:
---
${editedText}
---`,
            };

            const result = await generateQuiz(
                'Tạo đề từ văn bản',
                classLevel,
                editedText, // Pass edited text as content
                null, // No file needed anymore
                options,
                undefined,
                genAiProvider // Use generation AI provider
            );

            if (result.questions && result.questions.length > 0) {
                const questionsWithIds = result.questions.map((q: any, idx: number) => ({
                    ...q,
                    id: q.id || `pdf-q-${Date.now()}-${idx}`,
                }));

                setExtractedQuestions(questionsWithIds);
                setCurrentStep('preview');
                setSuccessMessage(`Đã tìm thấy ${questionsWithIds.length} câu hỏi`);
            } else {
                setError('Không tìm thấy câu hỏi nào trong văn bản. Vui lòng kiểm tra lại.');
            }
        } catch (err: any) {
            console.error('Question generation error:', err);
            setError(err.message || 'Đã xảy ra lỗi khi tạo câu hỏi');
        } finally {
            setIsGenerating(false);
        }
    };

    // Save all questions to repository
    const handleSaveAll = async () => {
        if (extractedQuestions.length === 0) {
            setError('Không có câu hỏi nào để lưu');
            return;
        }

        setIsSaving(true);
        setError(null);

        try {
            const quiz: Quiz = {
                id: `quiz-pdf-${Date.now()}`,
                title: quizTitle || `Đề từ PDF: ${uploadedFile?.name.replace(/\.[^/.]+$/, '') || 'Bài kiểm tra'}`,
                classLevel,
                timeLimit: timeLimit || Math.ceil(extractedQuestions.length * 2), // Use custom time or auto-calculate
                questions: extractedQuestions,
                createdAt: new Date().toISOString(),
                ...(requireAccessCode && accessCode ? { accessCode } : {}), // Add access code if enabled
            };

            await onSaveQuiz(quiz);

            setSuccessMessage('Đã lưu tất cả câu hỏi vào kho thành công!');

            setTimeout(() => {
                resetForm();
                onSuccess();
            }, 1500);
        } catch (err: any) {
            setError(err.message || 'Lỗi khi lưu vào kho');
        } finally {
            setIsSaving(false);
        }
    };

    // Reset form
    const resetForm = () => {
        setCurrentStep('upload');
        setUploadedFile(null);
        setExtractedText('');
        setEditedText('');
        setExtractedQuestions([]);
        setQuizTitle('');
        setError(null);
        setSuccessMessage(null);
        if (fileInputRef.current) fileInputRef.current.value = '';
    };

    // Delete a question
    const handleDeleteQuestion = (questionId: string) => {
        setExtractedQuestions(prev => prev.filter(q => q.id !== questionId));
        setSuccessMessage('Đã xóa câu hỏi');
    };

    // Open edit modal for a question
    const handleEditQuestion = (question: Question) => {
        setEditingQuestion(question);
        // Set initial values based on question type
        if ('question' in question) {
            setEditQuestionText((question as any).question);
        } else if ('mainQuestion' in question) {
            setEditQuestionText((question as any).mainQuestion);
        }
        if ('options' in question) {
            setEditOptions([...(question as any).options]);
        }
        if ('correctAnswer' in question) {
            setEditCorrectAnswer((question as any).correctAnswer);
        }
    };

    // Save edited question
    const handleSaveEditedQuestion = () => {
        if (!editingQuestion) return;

        setExtractedQuestions(prev => prev.map(q => {
            if (q.id !== editingQuestion.id) return q;

            const updated: any = { ...q };

            // Update question text
            if ('question' in updated) {
                updated.question = editQuestionText;
            } else if ('mainQuestion' in updated) {
                updated.mainQuestion = editQuestionText;
            }

            // Update options for MCQ
            if ('options' in updated && editOptions.length > 0) {
                updated.options = editOptions;
            }

            // Update correct answer
            if ('correctAnswer' in updated) {
                updated.correctAnswer = editCorrectAnswer;
            }

            return updated as Question;
        }));

        setEditingQuestion(null);
        setSuccessMessage('Đã cập nhật câu hỏi');
    };

    // Close edit modal
    const handleCloseEditModal = () => {
        setEditingQuestion(null);
        setEditQuestionText('');
        setEditOptions([]);
        setEditCorrectAnswer('');
    };

    // Render question type badge
    const getQuestionTypeBadge = (type: QuestionType) => {
        const badges: Record<string, { label: string; color: string }> = {
            [QuestionType.MCQ]: { label: 'Trắc nghiệm', color: 'bg-blue-100 text-blue-700' },
            [QuestionType.TRUE_FALSE]: { label: 'Đúng/Sai', color: 'bg-green-100 text-green-700' },
            [QuestionType.SHORT_ANSWER]: { label: 'Tự luận ngắn', color: 'bg-purple-100 text-purple-700' },
            [QuestionType.MATCHING]: { label: 'Nối cột', color: 'bg-orange-100 text-orange-700' },
            [QuestionType.ORDERING]: { label: 'Sắp xếp', color: 'bg-pink-100 text-pink-700' },
        };
        const badge = badges[type] || { label: type, color: 'bg-gray-100 text-gray-700' };
        return (
            <span className={`px-2 py-1 rounded-full text-xs font-medium ${badge.color}`}>
                {badge.label}
            </span>
        );
    };

    // Step indicator
    const StepIndicator = () => (
        <div className="flex items-center justify-center gap-2 mb-6">
            {[
                { step: 'upload', label: '1. Tải PDF', icon: Upload },
                { step: 'edit', label: '2. Sửa văn bản', icon: Edit3 },
                { step: 'preview', label: '3. Xem & Lưu', icon: Save },
            ].map((s, idx) => (
                <React.Fragment key={s.step}>
                    <div
                        className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all ${currentStep === s.step
                            ? 'bg-orange-500 text-white'
                            : ['upload', 'edit', 'preview'].indexOf(currentStep) > ['upload', 'edit', 'preview'].indexOf(s.step as Step)
                                ? 'bg-green-100 text-green-700'
                                : 'bg-gray-100 text-gray-500'
                            }`}
                    >
                        <s.icon className="w-4 h-4" />
                        {s.label}
                    </div>
                    {idx < 2 && <div className="w-8 h-0.5 bg-gray-200" />}
                </React.Fragment>
            ))}
        </div>
    );

    return (
        <div className="space-y-6">
            {/* Step Indicator */}
            <StepIndicator />

            {/* Success Message */}
            {successMessage && (
                <div className="bg-green-50 border border-green-200 rounded-xl p-4 flex items-center gap-3">
                    <CheckCircle className="w-5 h-5 text-green-600" />
                    <span className="text-green-700 font-medium">{successMessage}</span>
                </div>
            )}

            {/* Error Message */}
            {error && (
                <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-center gap-3">
                    <AlertCircle className="w-5 h-5 text-red-600" />
                    <span className="text-red-700">{error}</span>
                </div>
            )}

            {/* STEP 1: Upload PDF */}
            {currentStep === 'upload' && (
                <Card title="📄 Bước 1: Tải đề thi PDF">
                    <div className="space-y-4">
                        {/* Settings Row */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
                            <div className="md:col-span-2">
                                <label className="block text-sm font-bold text-gray-700 mb-1">Tên bài kiểm tra</label>
                                <input
                                    type="text"
                                    value={quizTitle}
                                    onChange={e => setQuizTitle(e.target.value)}
                                    placeholder="Ví dụ: Kiểm tra 15 phút Toán..."
                                    className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-orange-500"
                                />
                            </div>
                        </div>

                        {/* AI Provider */}
                        <AIProviderSelector
                            value={aiProvider}
                            onChange={(v) => {
                                setAiProvider(v);
                                localStorage.setItem('ai_provider', v);
                            }}
                        />

                        {/* Upload Area */}
                        <div
                            onDragOver={handleDragOver}
                            onDragLeave={handleDragLeave}
                            onDrop={handleDrop}
                            className={`
                                border-2 border-dashed rounded-xl p-8 text-center transition-all cursor-pointer
                                ${isDragging
                                    ? 'border-blue-500 bg-blue-50'
                                    : uploadedFile
                                        ? 'border-green-300 bg-green-50'
                                        : 'border-gray-300 hover:border-blue-400 hover:bg-blue-50/50'
                                }
                            `}
                            onClick={() => fileInputRef.current?.click()}
                        >
                            <input
                                ref={fileInputRef}
                                type="file"
                                accept=".pdf,image/*"
                                onChange={handleFileSelect}
                                className="hidden"
                            />

                            {uploadedFile ? (
                                <div className="flex flex-col items-center gap-3">
                                    <div className="w-16 h-16 rounded-2xl bg-green-100 flex items-center justify-center">
                                        <FileCheck className="w-8 h-8 text-green-600" />
                                    </div>
                                    <div>
                                        <p className="font-semibold text-gray-800">{uploadedFile.name}</p>
                                        <p className="text-sm text-gray-500">
                                            {(uploadedFile.size / 1024 / 1024).toFixed(2)} MB
                                        </p>
                                    </div>
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            setUploadedFile(null);
                                            if (fileInputRef.current) fileInputRef.current.value = '';
                                        }}
                                        className="text-red-500 hover:text-red-700 text-sm flex items-center gap-1"
                                    >
                                        <X className="w-4 h-4" /> Xóa file
                                    </button>
                                </div>
                            ) : (
                                <div className="flex flex-col items-center gap-3">
                                    <div className="w-16 h-16 rounded-2xl bg-blue-100 flex items-center justify-center">
                                        <Upload className="w-8 h-8 text-blue-600" />
                                    </div>
                                    <div>
                                        <p className="font-semibold text-gray-800">
                                            Kéo thả file PDF hoặc ảnh vào đây
                                        </p>
                                        <p className="text-sm text-gray-500">
                                            hoặc nhấn để chọn file (PDF, PNG, JPG - tối đa 20MB)
                                        </p>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Extract Button */}
                        {uploadedFile && (
                            <Button
                                onClick={handleExtractText}
                                loading={isExtracting}
                                disabled={!uploadedFile || isExtracting}
                                className="w-full"
                                size="lg"
                                variant="primary"
                                icon={<Sparkles className="w-5 h-5" />}
                            >
                                {isExtracting ? 'Đang trích xuất văn bản...' : '✨ Trích xuất văn bản từ PDF'}
                            </Button>
                        )}
                    </div>
                </Card>
            )}

            {/* STEP 2: Edit extracted text */}
            {currentStep === 'edit' && (
                <div className="space-y-6">
                    {/* Row 1: Settings */}
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                        {/* Basic Settings Card */}
                        <Card title="⚙️ Cài đặt cơ bản">
                            <div className="space-y-4">
                                {/* Quiz Title */}
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Tên bài kiểm tra
                                    </label>
                                    <input
                                        type="text"
                                        value={quizTitle}
                                        onChange={(e) => setQuizTitle(e.target.value)}
                                        placeholder="Ví dụ: Kiểm tra 15 phút Toán..."
                                        className="w-full p-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500"
                                    />
                                </div>

                                {/* Class Level & Time */}
                                <div className="grid grid-cols-2 gap-3">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">
                                            Khối Lớp
                                        </label>
                                        <select
                                            value={classLevel}
                                            onChange={e => setClassLevel(e.target.value)}
                                            className="w-full p-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500"
                                        >
                                            {[1, 2, 3, 4, 5].map(l => <option key={l} value={l}>Lớp {l}</option>)}
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-1">
                                            <Clock className="w-4 h-4" />
                                            Thời gian (phút)
                                        </label>
                                        <input
                                            type="number"
                                            value={timeLimit}
                                            onChange={(e) => setTimeLimit(e.target.value ? parseInt(e.target.value) : '')}
                                            placeholder="Tự động"
                                            min={1}
                                            max={180}
                                            className="w-full p-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500"
                                        />
                                    </div>
                                </div>
                            </div>
                        </Card>

                        {/* Access Code Card */}
                        <Card title="🔐 Mã làm bài">
                            <div className="space-y-4">
                                {/* Toggle */}
                                <div className="flex items-center justify-between">
                                    <div>
                                        <p className="font-medium text-gray-800">Yêu cầu mã để làm bài</p>
                                        <p className="text-sm text-gray-500">Học sinh phải nhập đúng mã mới được làm bài</p>
                                    </div>
                                    <button
                                        onClick={() => {
                                            setRequireAccessCode(!requireAccessCode);
                                            if (!requireAccessCode && !accessCode) {
                                                generateAccessCode();
                                            }
                                        }}
                                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${requireAccessCode ? 'bg-orange-500' : 'bg-gray-300'
                                            }`}
                                    >
                                        <span
                                            className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${requireAccessCode ? 'translate-x-6' : 'translate-x-1'
                                                }`}
                                        />
                                    </button>
                                </div>

                                {/* Access Code Input */}
                                {requireAccessCode && (
                                    <div className="flex gap-2">
                                        <div className="flex-1">
                                            <input
                                                type="text"
                                                value={accessCode}
                                                onChange={(e) => setAccessCode(e.target.value.toUpperCase())}
                                                placeholder="Nhập mã..."
                                                maxLength={10}
                                                className="w-full p-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 font-mono text-lg tracking-widest text-center"
                                            />
                                        </div>
                                        <button
                                            onClick={generateAccessCode}
                                            className="px-3 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg text-gray-600 text-sm"
                                            title="Tạo mã ngẫu nhiên"
                                        >
                                            🎲
                                        </button>
                                    </div>
                                )}
                            </div>
                        </Card>

                        {/* AI Provider Card */}
                        <Card title="🤖 Chọn AI tạo đề">
                            <div className="space-y-3">
                                <div className="flex flex-wrap gap-2">
                                    {QUIZ_GEN_PROVIDERS.map((provider) => (
                                        <button
                                            key={provider.id}
                                            type="button"
                                            onClick={() => {
                                                setGenAiProvider(provider.id as AIProvider);
                                                localStorage.setItem('gen_ai_provider', provider.id);
                                            }}
                                            className={`px-3 py-2 rounded-lg text-sm font-medium transition-all ${genAiProvider === provider.id
                                                ? 'bg-blue-600 text-white shadow-md'
                                                : 'bg-white border border-gray-200 text-gray-700 hover:border-blue-300'
                                                }`}
                                        >
                                            {provider.name}
                                        </button>
                                    ))}
                                </div>
                                <p className="text-xs text-gray-500">
                                    {QUIZ_GEN_PROVIDERS.find((p) => p.id === genAiProvider)?.description}
                                </p>
                            </div>
                        </Card>
                    </div>

                    {/* Row 2: Question Types */}
                    <Card title="📝 Dạng câu hỏi muốn tạo">
                        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                            {QUESTION_TYPE_OPTIONS.map((opt) => (
                                <button
                                    key={opt.type}
                                    onClick={() => toggleQuestionType(opt.type)}
                                    className={`flex items-center gap-2 p-3 rounded-xl border-2 transition-all ${selectedQuestionTypes.includes(opt.type)
                                            ? 'border-blue-500 bg-blue-50 text-blue-700'
                                            : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300'
                                        }`}
                                >
                                    <span className={`w-5 h-5 rounded flex items-center justify-center text-xs ${selectedQuestionTypes.includes(opt.type)
                                            ? 'bg-blue-500 text-white'
                                            : 'bg-gray-200 text-gray-400'
                                        }`}>
                                        {selectedQuestionTypes.includes(opt.type) ? '✓' : ''}
                                    </span>
                                    <span className="text-lg">{opt.icon}</span>
                                    <span className="text-sm font-medium">{opt.label}</span>
                                </button>
                            ))}
                        </div>
                    </Card>

                    {/* Row 3: Text Editor */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        {/* Left: Original extracted text */}
                        <Card title="📄 Văn bản gốc (từ PDF)">
                            <div className="bg-gray-50 rounded-xl p-4 h-[400px] overflow-y-auto">
                                <pre className="whitespace-pre-wrap text-sm text-gray-600 font-mono">
                                    {extractedText}
                                </pre>
                            </div>
                        </Card>

                        {/* Right: Editable text */}
                        <Card title="✏️ Văn bản đã chỉnh sửa">
                            <div className="space-y-4">
                                <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-sm text-amber-800">
                                    💡 <strong>Hướng dẫn:</strong> Kiểm tra và sửa lỗi chính tả, lỗi OCR nếu cần.
                                </div>

                                <textarea
                                    value={editedText}
                                    onChange={(e) => setEditedText(e.target.value)}
                                    className="w-full h-[300px] p-4 border rounded-xl focus:ring-2 focus:ring-orange-500 font-mono text-sm resize-none"
                                    placeholder="Văn bản đã trích xuất sẽ hiển thị ở đây..."
                                />
                            </div>
                        </Card>
                    </div>

                    {/* Row 4: Action Buttons */}
                    <div className="flex gap-3">
                        <Button
                            onClick={() => setCurrentStep('upload')}
                            variant="secondary"
                            className="flex-1"
                        >
                            ← Quay lại
                        </Button>
                        <Button
                            onClick={handleGenerateQuestions}
                            loading={isGenerating}
                            disabled={!editedText.trim() || isGenerating || selectedQuestionTypes.length === 0}
                            variant="primary"
                            className="flex-1"
                            icon={<Wand2 className="w-5 h-5" />}
                        >
                            {isGenerating ? 'Đang tạo đề...' : '🎯 Tạo đề từ văn bản'}
                        </Button>
                    </div>
                </div>
            )}

            {/* STEP 3: Preview and Save */}
            {currentStep === 'preview' && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Left: Edited Text Reference */}
                    <Card title="✨ Văn bản đã sửa lỗi (AI)">
                        <div className="bg-gray-50 rounded-xl p-4 h-[500px] overflow-y-auto">
                            <pre className="whitespace-pre-wrap text-sm text-gray-700 font-mono">
                                {editedText}
                            </pre>
                        </div>
                        <div className="mt-4">
                            <Button
                                onClick={() => setCurrentStep('edit')}
                                variant="secondary"
                                className="w-full"
                            >
                                ← Quay lại sửa văn bản
                            </Button>
                        </div>
                    </Card>

                    {/* Right: Extracted Questions */}
                    <div className="space-y-4">
                        {/* Header with Save Button */}
                        <div className="flex items-center justify-between">
                            <h3 className="text-lg font-bold text-gray-800">
                                Đã tìm thấy {extractedQuestions.length} câu hỏi
                            </h3>
                            <Button
                                onClick={handleSaveAll}
                                loading={isSaving}
                                disabled={extractedQuestions.length === 0 || isSaving}
                                variant="primary"
                                icon={<Save className="w-4 h-4" />}
                            >
                                {isSaving ? 'Đang lưu...' : 'Lưu tất cả vào kho'}
                            </Button>
                        </div>

                        {/* Questions List */}
                        <div className="space-y-3 max-h-[500px] overflow-y-auto pr-2">
                            {extractedQuestions.map((q, idx) => (
                                <div
                                    key={q.id}
                                    className="bg-white border border-gray-200 rounded-xl p-4 hover:shadow-md transition-shadow"
                                >
                                    <div className="flex items-start justify-between gap-3 mb-2">
                                        <div className="flex items-center gap-2">
                                            <span className="font-bold text-orange-600">Câu {idx + 1}</span>
                                            {getQuestionTypeBadge(q.type)}
                                        </div>
                                        <div className="flex items-center gap-1">
                                            <button
                                                onClick={() => handleEditQuestion(q)}
                                                className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                                title="Sửa câu hỏi"
                                            >
                                                <Edit3 className="w-4 h-4" />
                                            </button>
                                            <button
                                                onClick={() => handleDeleteQuestion(q.id)}
                                                className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                                title="Xóa câu hỏi"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        </div>
                                    </div>

                                    {/* Question Text */}
                                    <p
                                        className="text-gray-800 mb-3"
                                        dangerouslySetInnerHTML={{
                                            __html: 'question' in q
                                                ? (q as any).question
                                                : 'mainQuestion' in q
                                                    ? (q as any).mainQuestion
                                                    : ''
                                        }}
                                    />

                                    {/* Options for MCQ */}
                                    {q.type === QuestionType.MCQ && 'options' in q && (
                                        <div className="space-y-1 mb-3">
                                            {(q as any).options.map((opt: string, optIdx: number) => (
                                                <div
                                                    key={optIdx}
                                                    className={`text-sm px-3 py-1.5 rounded-lg ${(q as any).correctAnswer === String.fromCharCode(65 + optIdx)
                                                        ? 'bg-green-100 text-green-800 font-medium'
                                                        : 'bg-gray-50 text-gray-600'
                                                        }`}
                                                >
                                                    <span className="font-bold mr-2">
                                                        {String.fromCharCode(65 + optIdx)}.
                                                    </span>
                                                    <span dangerouslySetInnerHTML={{ __html: opt }} />
                                                </div>
                                            ))}
                                        </div>
                                    )}

                                    {/* TRUE_FALSE items */}
                                    {q.type === QuestionType.TRUE_FALSE && 'items' in q && (
                                        <div className="space-y-1 mb-3">
                                            {(q as any).items.map((item: any, itemIdx: number) => (
                                                <div
                                                    key={itemIdx}
                                                    className={`text-sm px-3 py-1.5 rounded-lg flex items-center gap-2 ${item.isCorrect
                                                        ? 'bg-green-100 text-green-800'
                                                        : 'bg-red-50 text-red-700'
                                                        }`}
                                                >
                                                    <span className="font-bold">{item.isCorrect ? 'Đ' : 'S'}</span>
                                                    <span dangerouslySetInnerHTML={{ __html: item.statement }} />
                                                </div>
                                            ))}
                                        </div>
                                    )}

                                    {/* Explanation */}
                                    {'explanation' in q && (q as any).explanation && (
                                        <div className="text-sm bg-amber-50 text-amber-800 px-3 py-2 rounded-lg">
                                            <span className="font-medium">Lời giải:</span>{' '}
                                            {(q as any).explanation || 'Chưa có lời giải'}
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            {/* Edit Question Modal */}
            {editingQuestion && (
                <Modal
                    isOpen={!!editingQuestion}
                    onClose={handleCloseEditModal}
                    title="✏️ Chỉnh sửa câu hỏi"
                >
                    <div className="space-y-4">
                        {/* Question Type Badge */}
                        <div className="flex items-center gap-2">
                            <span className="text-sm text-gray-500">Loại câu hỏi:</span>
                            {getQuestionTypeBadge(editingQuestion.type)}
                        </div>

                        {/* Question Text */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Nội dung câu hỏi
                            </label>
                            <textarea
                                value={editQuestionText}
                                onChange={(e) => setEditQuestionText(e.target.value)}
                                className="w-full h-32 p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                                placeholder="Nhập nội dung câu hỏi..."
                            />
                        </div>

                        {/* Options for MCQ */}
                        {editingQuestion.type === QuestionType.MCQ && editOptions.length > 0 && (
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Các đáp án
                                </label>
                                <div className="space-y-2">
                                    {editOptions.map((opt, idx) => (
                                        <div key={idx} className="flex items-center gap-2">
                                            <span className="font-bold text-gray-600 w-6">
                                                {String.fromCharCode(65 + idx)}.
                                            </span>
                                            <input
                                                type="text"
                                                value={opt}
                                                onChange={(e) => {
                                                    const newOptions = [...editOptions];
                                                    newOptions[idx] = e.target.value;
                                                    setEditOptions(newOptions);
                                                }}
                                                className="flex-1 p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500"
                                            />
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Correct Answer */}
                        {'correctAnswer' in editingQuestion && (
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Đáp án đúng
                                </label>
                                {editingQuestion.type === QuestionType.MCQ ? (
                                    <select
                                        value={editCorrectAnswer}
                                        onChange={(e) => setEditCorrectAnswer(e.target.value)}
                                        className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500"
                                    >
                                        {['A', 'B', 'C', 'D'].map((letter) => (
                                            <option key={letter} value={letter}>
                                                {letter}
                                            </option>
                                        ))}
                                    </select>
                                ) : (
                                    <input
                                        type="text"
                                        value={editCorrectAnswer}
                                        onChange={(e) => setEditCorrectAnswer(e.target.value)}
                                        className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500"
                                        placeholder="Nhập đáp án đúng..."
                                    />
                                )}
                            </div>
                        )}

                        {/* Actions */}
                        <div className="flex gap-3 pt-4 border-t">
                            <Button
                                onClick={handleCloseEditModal}
                                variant="secondary"
                                className="flex-1"
                            >
                                Hủy
                            </Button>
                            <Button
                                onClick={handleSaveEditedQuestion}
                                variant="primary"
                                className="flex-1"
                                icon={<Save className="w-4 h-4" />}
                            >
                                Lưu thay đổi
                            </Button>
                        </div>
                    </div>
                </Modal>
            )}
        </div>
    );
};

export default PdfTab;
