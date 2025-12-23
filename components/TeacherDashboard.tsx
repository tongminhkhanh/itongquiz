import React, { useState, useEffect } from 'react';
import { Quiz, Question, QuestionType, StudentResult, ImageLibraryItem } from '../types';
import { generateQuiz, QuizGenerationOptions, AIProvider } from '../geminiService';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { FileText, Save, RefreshCw, LogOut, Loader2, Download, Settings, FileUp, Trash2, Edit, List, KeyRound, Image, X, Link as LinkIcon, Search, Bot } from 'lucide-react';
import { deleteQuizFromSheet, updateQuizInSheet } from '../googleSheetService';
import { uploadToCloudinary } from '../cloudinaryService';
import { GOOGLE_SCRIPT_URL } from '../App';

// Image library constants
const MAX_IMAGE_SIZE_MB = 5; // Increased for Cloudinary
const MAX_IMAGE_COUNT = 20;
const MAX_IMAGE_WIDTH = 800;
const MAX_IMAGE_HEIGHT = 600;

interface Props {
    onLogout: () => void;
    quizzes: Quiz[];
    results: StudentResult[];
    onSaveQuiz: (quiz: Quiz) => Promise<void>;
    onUpdateQuiz: (quiz: Quiz) => Promise<void>;
    isAdmin?: boolean;
}

const TeacherDashboard: React.FC<Props> = ({ onLogout, quizzes, results, onSaveQuiz, onUpdateQuiz, isAdmin = false }) => {
    const [activeTab, setActiveTab] = useState<'create' | 'results' | 'manage'>('results');
    const [editingQuizId, setEditingQuizId] = useState<string | null>(null);

    // Creation Form State
    const [topic, setTopic] = useState('');
    const [quizTitle, setQuizTitle] = useState('');
    const [classLevel, setClassLevel] = useState('3');
    const [content, setContent] = useState('');
    const [attachedFile, setAttachedFile] = useState<File | null>(null);
    const [questionCount, setQuestionCount] = useState<number>(10);
    const [selectedTypes, setSelectedTypes] = useState({
        [QuestionType.MCQ]: true,
        [QuestionType.TRUE_FALSE]: true,
        [QuestionType.SHORT_ANSWER]: true,
        [QuestionType.MATCHING]: true,
    });
    const [manualTimeLimit, setManualTimeLimit] = useState<number | ''>('');

    // Difficulty levels state
    const [level1Count, setLevel1Count] = useState<number>(3);
    const [level2Count, setLevel2Count] = useState<number>(5);
    const [level3Count, setLevel3Count] = useState<number>(2);

    // Access code state
    const [requireCode, setRequireCode] = useState<boolean>(false);
    const [accessCode, setAccessCode] = useState<string>('');

    // Image library state
    const [imageLibrary, setImageLibrary] = useState<ImageLibraryItem[]>(() => {
        const saved = localStorage.getItem('quiz_image_library');
        return saved ? JSON.parse(saved) : [];
    });

    const [isGenerating, setIsGenerating] = useState(false);
    const [generatedQuiz, setGeneratedQuiz] = useState<Quiz | null>(null);

    // Result View State
    const [filterClass, setFilterClass] = useState<string>('All');
    const [sortField, setSortField] = useState<'score' | 'submittedAt'>('submittedAt');
    const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

    const [aiProvider, setAiProvider] = useState<AIProvider>(() => (localStorage.getItem('ai_provider') as AIProvider) || 'gemini');

    // DEBUG: Check if keys are loaded
    useEffect(() => {
        console.log("--- DEBUG API KEYS ---");
        console.log("VITE_GEMINI_API_KEY:", (import.meta as any).env.VITE_GEMINI_API_KEY ? "✅ Loaded" : "❌ Missing");
        console.log("VITE_PERPLEXITY_API_KEY:", (import.meta as any).env.VITE_PERPLEXITY_API_KEY ? "✅ Loaded" : "❌ Missing");
        console.log("VITE_OPENAI_API_KEY:", (import.meta as any).env.VITE_OPENAI_API_KEY ? "✅ Loaded" : "❌ Missing");
        console.log("VITE_LLM_MUX_BASE_URL:", (import.meta as any).env.VITE_LLM_MUX_BASE_URL || "Using Default (localhost:8317)");
        console.log("----------------------");
    }, []);

    // Save image library to localStorage
    useEffect(() => {
        localStorage.setItem('quiz_image_library', JSON.stringify(imageLibrary));
    }, [imageLibrary]);

    // Handle image upload
    const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files;
        if (!files) return;

        if (imageLibrary.length >= MAX_IMAGE_COUNT) {
            alert(`Toi da ${MAX_IMAGE_COUNT} hinh. Vui long xoa bot de upload them.`);
            return;
        }

        for (let i = 0; i < files.length; i++) {
            const file = files[i];

            // Check file size
            if (file.size > MAX_IMAGE_SIZE_MB * 1024 * 1024) {
                alert(`${file.name} qua lon (>${MAX_IMAGE_SIZE_MB}MB). Bo qua.`);
                continue;
            }

            // Check total count
            if (imageLibrary.length + i >= MAX_IMAGE_COUNT) {
                alert(`Chi co the upload them ${MAX_IMAGE_COUNT - imageLibrary.length} hinh.`);
                break;
            }

            try {
                const imageUrl = await uploadToCloudinary(file);
                const newImage: ImageLibraryItem = {
                    id: `img-${Date.now()}-${i}`,
                    name: file.name,
                    data: imageUrl, // Store Cloudinary URL
                    topic: topic || '',
                    createdAt: new Date().toISOString()
                };
                setImageLibrary(prev => [...prev, newImage]);
            } catch (err) {
                console.error('Error uploading image:', err);
                alert(`Lỗi upload ảnh ${file.name}: ${(err as Error).message}`);
            }
        }
        e.target.value = ''; // Reset input
    };

    // Delete image from library
    const handleDeleteImage = (id: string) => {
        setImageLibrary(prev => prev.filter(img => img.id !== id));
    };

    // Auto-generate title based on topic
    useEffect(() => {
        if (topic && !quizTitle) {
            setQuizTitle(`Kiểm tra: ${topic}`);
        }
    }, [topic, quizTitle]);

    // Generate random 6-character access code
    const generateRandomCode = () => {
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
        let code = '';
        for (let i = 0; i < 6; i++) {
            code += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        return code;
    };

    const handleGenerate = async () => {
        // if (!apiKey) return alert(`Vui lòng nhập ${aiProvider === 'perplexity' ? 'Perplexity' : 'Gemini'} API Key ở phần 'Cấu hình API' bên dưới!`);
        if (!topic) return alert("Vui lòng nhập chủ đề bài học");

        // Validate types
        const enabledTypes = Object.entries(selectedTypes)
            .filter(([_, enabled]) => enabled)
            .map(([type]) => type as QuestionType);

        if (enabledTypes.length === 0) return alert("Vui lòng chọn ít nhất một dạng câu hỏi");

        // Check for Perplexity + Images (OpenAI, Gemini, and LLM-Mux support images)
        if (aiProvider === 'perplexity' && imageLibrary.length > 0) {
            const confirmContinue = confirm("LƯU Ý: Bạn đang sử dụng Perplexity AI. AI này KHÔNG THỂ nhìn thấy hình ảnh, chỉ có thể đọc tên hình.\n\nĐể AI phân tích được nội dung hình ảnh, vui lòng chuyển sang dùng Gemini, OpenAI hoặc LLM-Mux.\n\nBạn có muốn tiếp tục không?");
            if (!confirmContinue) return;
        }

        setIsGenerating(true);
        try {
            const options: QuizGenerationOptions = {
                title: quizTitle || `Kiểm tra: ${topic}`,
                questionCount: level1Count + level2Count + level3Count, // Total from all levels
                questionTypes: enabledTypes,
                difficultyLevels: {
                    level1: level1Count, // Nhận biết
                    level2: level2Count,
                    level3: level3Count
                },
                imageLibrary: imageLibrary.map(img => ({ id: img.id, name: img.name, data: img.data }))
            };
            console.log("Generating quiz with options:", options);
            console.log("Image Library passed to AI:", options.imageLibrary);

            const data = await generateQuiz(topic, classLevel, content, attachedFile, options, '', aiProvider);

            // Process raw data into Type safe objects
            const questions: Question[] = data.questions
                .map((q: any, idx: number) => {
                    const base = { id: `q-${Date.now()}-${idx}` };
                    // Normalize type to uppercase
                    const qType = (q.type || '').toUpperCase().trim();

                    // Process image: convert imageId to Base64 data or keep URL
                    let imageField: string | undefined;
                    if (q.image) {
                        if (q.image.startsWith('http')) {
                            imageField = q.image;
                        } else {
                            // Try exact match first
                            let foundImg = imageLibrary.find(img => img.id === q.image);

                            // If not found, try fuzzy match by name or partial ID
                            if (!foundImg) {
                                foundImg = imageLibrary.find(img =>
                                    q.image.includes(img.id) ||
                                    img.name.toLowerCase().includes(q.image.toLowerCase()) ||
                                    q.image.toLowerCase().includes(img.name.toLowerCase())
                                );
                            }

                            if (foundImg) {
                                imageField = foundImg.data;
                            }
                        }
                    }

                    try {
                        if (qType === 'MCQ') {
                            if (!q.question || !q.options || !q.correctAnswer) return null;
                            return { ...base, type: QuestionType.MCQ, question: q.question, options: q.options, correctAnswer: q.correctAnswer, image: imageField };
                        } else if (qType === 'TRUE_FALSE') {
                            if (!q.mainQuestion || !q.items || q.items.length === 0) return null;
                            return {
                                ...base,
                                type: QuestionType.TRUE_FALSE,
                                mainQuestion: q.mainQuestion,
                                items: q.items.map((i: any, subIdx: number) => ({ id: `sub-${idx}-${subIdx}`, statement: i.statement, isCorrect: i.isCorrect })),
                                image: imageField
                            };
                        } else if (qType === 'MATCHING') {
                            if (!q.pairs || q.pairs.length === 0) return null;
                            return { ...base, type: QuestionType.MATCHING, question: q.question || "Noi cac y o cot A voi cot B:", mainQuestion: q.question || "Noi cac y o cot A voi cot B:", pairs: q.pairs, image: imageField };
                        } else if (qType === 'MULTIPLE_SELECT') {
                            if (!q.question || !q.options || !q.correctAnswers || q.correctAnswers.length === 0) return null;
                            return {
                                ...base,
                                type: QuestionType.MULTIPLE_SELECT,
                                question: q.question,
                                options: q.options,
                                correctAnswers: q.correctAnswers || [],
                                image: imageField
                            };
                        } else if (qType === 'SHORT_ANSWER') {
                            if (!q.question || !q.correctAnswer) return null;
                            return { ...base, type: QuestionType.SHORT_ANSWER, question: q.question, correctAnswer: q.correctAnswer, image: imageField };
                        } else if (qType === 'DRAG_DROP') {
                            if (!q.text || !q.blanks || q.blanks.length === 0) return null;
                            return {
                                ...base,
                                type: QuestionType.DRAG_DROP,
                                question: q.question || "Điền từ thích hợp vào chỗ trống:",
                                text: q.text,
                                blanks: q.blanks,
                                distractors: q.distractors || [],
                                image: imageField
                            };
                        } else {
                            console.warn('Unknown question type:', qType, 'Original:', q.type);
                            return null;
                        }
                    } catch (error) {
                        console.error('Error processing question:', q, error);
                        return null;
                    }
                })
                .filter((q: any) => q !== null) as Question[]; // Filter out invalid questions

            if (questions.length === 0) {
                throw new Error("AI không tạo được câu hỏi hợp lệ. Vui lòng thử lại.");
            }

            // FALLBACK: If user uploaded images but AI didn't assign them, force assign them.
            if (imageLibrary.length > 0) {
                const questionsWithImages = questions.filter(q => q.image);
                if (questionsWithImages.length === 0) {
                    console.warn("AI did not assign any images. Force assigning images sequentially.");
                    // Distribute images to questions sequentially
                    questions.forEach((q, idx) => {
                        if (idx < imageLibrary.length) {
                            q.image = imageLibrary[idx].data;
                        } else {
                            // Cycle through images if more questions than images
                            q.image = imageLibrary[idx % imageLibrary.length].data;
                        }
                    });
                    alert("Lưu ý: AI không tự chọn được hình, hệ thống đã tự động chèn hình vào các câu hỏi cho bạn.");
                }
            }

            // Limit questions to the requested count
            const requestedCount = options.questionCount;
            console.log(`[Quiz] AI generated ${questions.length} questions, requested ${requestedCount}`);

            // SHUFFLE QUESTIONS to avoid consecutive same-type questions
            const shuffledQuestions = questions.sort(() => Math.random() - 0.5);

            const limitedQuestions = shuffledQuestions.slice(0, requestedCount);
            console.log(`[Quiz] Final question count: ${limitedQuestions.length}`);

            const newQuiz: Quiz = {
                id: crypto.randomUUID(),
                title: data.title || options.title,
                classLevel,
                timeLimit: manualTimeLimit ? Number(manualTimeLimit) : Math.ceil(limitedQuestions.length * 1.5),
                questions: limitedQuestions,
                createdAt: new Date().toISOString(),
                accessCode: requireCode ? (accessCode || generateRandomCode()) : '',
                requireCode: requireCode
            };
            setGeneratedQuiz(newQuiz);
        } catch (e) {
            alert("Lỗi khi tạo đề: " + (e as Error).message);
        } finally {
            setIsGenerating(false);
        }
    };

    const [isSaving, setIsSaving] = useState(false);

    // Manual Image Assignment State
    const [editingQuestionImageId, setEditingQuestionImageId] = useState<string | null>(null);
    const [tempImageUrl, setTempImageUrl] = useState('');

    const handleUpdateQuestionImage = (questionId: string, imageUrl: string) => {
        console.log('Updating image for question:', questionId, 'URL:', imageUrl);
        if (!generatedQuiz) {
            console.error('No generated quiz found');
            return;
        }

        const updatedQuestions = generatedQuiz.questions.map(q => {
            if (q.id === questionId) {
                return { ...q, image: imageUrl };
            }
            return q;
        });

        setGeneratedQuiz({ ...generatedQuiz, questions: updatedQuestions });
        setEditingQuestionImageId(null);
        setTempImageUrl('');
        alert("Đã cập nhật ảnh cho câu hỏi!");
    };

    const handleSaveQuiz = async () => {
        if (generatedQuiz) {
            setIsSaving(true);
            try {
                // Merge current access code settings into the quiz
                const quizToSave: Quiz = {
                    ...generatedQuiz,
                    accessCode: requireCode ? (accessCode || generatedQuiz.accessCode || '') : '',
                    requireCode: requireCode
                };

                if (editingQuizId) {
                    // Update existing
                    const success = await updateQuizInSheet(quizToSave, GOOGLE_SCRIPT_URL);
                    if (success) {
                        await onUpdateQuiz(quizToSave); // Update local state
                        alert("Đã cập nhật đề thi thành công!");
                    } else {
                        throw new Error("Không thể cập nhật vào Google Sheet (vui lòng kiểm tra kết nối hoặc script)");
                    }
                } else {
                    // Create new
                    await onSaveQuiz(quizToSave);
                    alert("Đã lưu đề thi thành công!");
                }

                setGeneratedQuiz(null);
                setEditingQuizId(null);
                // Reset essential fields
                setTopic('');
                setQuizTitle('');
                setContent('');
                setAttachedFile(null);
                setRequireCode(false);
                setAccessCode('');
                setActiveTab('manage'); // Go to manage tab to see changes (though requires refresh/reload usually)
            } catch (error) {
                console.error(error);
                alert("Lỗi khi lưu đề thi: " + (error as Error).message);
            } finally {
                setIsSaving(false);
            }
        }
    };

    const handleEditQuiz = (quiz: Quiz) => {
        setEditingQuizId(quiz.id);
        setTopic(quiz.title.replace('Kiểm tra: ', '')); // Try to extract topic
        setQuizTitle(quiz.title);
        setClassLevel(quiz.classLevel);
        setQuestionCount(quiz.questions.length);
        setManualTimeLimit(quiz.timeLimit);
        setRequireCode(quiz.requireCode || false);
        setAccessCode(quiz.accessCode || '');
        setGeneratedQuiz(quiz); // Load existing quiz into preview
        setActiveTab('create');
    };

    const handleDeleteQuiz = async (quizId: string) => {
        if (confirm("Bạn có chắc chắn muốn xóa đề thi này? Hành động này không thể hoàn tác.")) {
            try {
                await deleteQuizFromSheet(quizId, GOOGLE_SCRIPT_URL);
                alert("Đã gửi lệnh xóa. Vui lòng đợi vài giây để dữ liệu cập nhật.");
                // In a real app we'd refresh the list here
            } catch (e) {
                alert("Lỗi khi xóa đề thi");
            }
        }
    };

    const filteredResults = results
        .filter(r => filterClass === 'All' || r.studentClass === filterClass)
        .sort((a, b) => {
            const valA = sortField === 'score' ? a.score : new Date(a.submittedAt).getTime();
            const valB = sortField === 'score' ? b.score : new Date(b.submittedAt).getTime();
            return sortOrder === 'asc' ? (valA > valB ? 1 : -1) : (valA < valB ? 1 : -1);
        });

    const exportExcel = () => {
        const headers = ["Họ tên", "Lớp", "Điểm", "Số câu đúng", "Thời gian nộp", "Thời gian làm(phút)"];
        const rows = filteredResults.map(r => [
            `"${r.studentName}"`,
            r.studentClass,
            r.score,
            `${r.correctCount}/${r.totalQuestions}`,
            new Date(r.submittedAt).toLocaleString('vi-VN'),
            r.timeTaken
        ]);
        const csvContent = "data:text/csv;charset=utf-8,\uFEFF" + [headers.join(","), ...rows.map(e => e.join(","))].join("\n");
        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", `ket_qua_lop_${filterClass}.csv`);
        document.body.appendChild(link);
        link.click();
    };

    return (
        <div className="min-h-screen bg-gray-100">
            <nav className="bg-slate-800 text-white p-4 flex justify-between items-center shadow-lg sticky top-0 z-50">
                <h1 className="text-xl font-bold flex items-center">
                    <span className="text-2xl mr-2">🔐</span> Giáo viên - Trường Tiểu học Ít Ong
                </h1>
                <button onClick={onLogout} className="flex items-center text-sm bg-red-600 hover:bg-red-700 px-3 py-2 rounded">
                    <LogOut className="w-4 h-4 mr-2" /> Đăng xuất
                </button>
            </nav>

            <div className="container mx-auto p-6">
                <div className="flex space-x-4 mb-6">
                    <button
                        onClick={() => setActiveTab('results')}
                        className={`px-6 py-2 rounded-full font-bold transition-all ${activeTab === 'results' ? 'bg-blue-600 text-white shadow-md' : 'bg-white text-gray-600 hover:bg-gray-200'}`}
                    >
                        📊 Kết quả học sinh
                    </button>
                    <button
                        onClick={() => setActiveTab('create')}
                        className={`px-6 py-2 rounded-full font-bold transition-all ${activeTab === 'create' ? 'bg-blue-600 text-white shadow-md' : 'bg-white text-gray-600 hover:bg-gray-200'}`}
                    >
                        📝 Tạo đề thi mới
                    </button>
                    <button
                        onClick={() => setActiveTab('manage')}
                        className={`px-6 py-2 rounded-full font-bold transition-all ${activeTab === 'manage' ? 'bg-blue-600 text-white shadow-md' : 'bg-white text-gray-600 hover:bg-gray-200'}`}
                    >
                        📂 Quản lý đề thi
                    </button>
                </div>

                {activeTab === 'create' && (
                    <div className="bg-white p-6 rounded-2xl shadow-sm">
                        <h2 className="text-xl font-bold mb-4 text-gray-800 border-b pb-2 flex items-center">
                            <Settings className="w-6 h-6 mr-2 text-indigo-600" />
                            {editingQuizId ? 'Chỉnh sửa đề thi' : 'Cấu hình đề thi'}
                        </h2>
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                            <div className="space-y-5">
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-bold text-gray-700 mb-1">Khối Lớp</label>
                                        <select value={classLevel} onChange={e => setClassLevel(e.target.value)} className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none">
                                            {[1, 2, 3, 4, 5].map(l => <option key={l} value={l}>Lớp {l}</option>)}
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-bold text-gray-700 mb-1">Thời gian làm bài (phút)</label>
                                        <input
                                            type="number"
                                            min={1}
                                            value={manualTimeLimit}
                                            onChange={e => setManualTimeLimit(Number(e.target.value))}
                                            placeholder="Tự động tính"
                                            className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                                        />
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-sm font-bold text-gray-700 mb-1">Chủ đề bài học <span className="text-red-500">*</span></label>
                                    <input
                                        type="text"
                                        value={topic}
                                        onChange={e => setTopic(e.target.value)}
                                        placeholder="Ví dụ: Động vật rừng xanh"
                                        className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-bold text-gray-700 mb-1">Tên bài kiểm tra</label>
                                    <input
                                        type="text"
                                        value={quizTitle}
                                        onChange={e => setQuizTitle(e.target.value)}
                                        placeholder="Ví dụ: Kiểm tra 15 phút..."
                                        className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                                    />
                                </div>

                                <div className="bg-indigo-50 p-4 rounded-xl border border-indigo-100">
                                    <label className="block text-sm font-bold text-indigo-800 mb-2">Dạng câu hỏi muốn tạo:</label>
                                    <div className="flex flex-wrap gap-4">
                                        <label className="flex items-center space-x-2 cursor-pointer">
                                            <input
                                                type="checkbox"
                                                checked={selectedTypes[QuestionType.MCQ]}
                                                onChange={e => setSelectedTypes(p => ({ ...p, [QuestionType.MCQ]: e.target.checked }))}
                                                className="w-5 h-5 text-indigo-600 rounded focus:ring-indigo-500"
                                            />
                                            <span className="text-gray-700">Trắc nghiệm</span>
                                        </label>
                                        <label className="flex items-center space-x-2 cursor-pointer">
                                            <input
                                                type="checkbox"
                                                checked={selectedTypes[QuestionType.TRUE_FALSE]}
                                                onChange={e => setSelectedTypes(p => ({ ...p, [QuestionType.TRUE_FALSE]: e.target.checked }))}
                                                className="w-5 h-5 text-indigo-600 rounded focus:ring-indigo-500"
                                            />
                                            <span className="text-gray-700">Đúng / Sai</span>
                                        </label>
                                        <label className="flex items-center space-x-2 cursor-pointer">
                                            <input
                                                type="checkbox"
                                                checked={selectedTypes[QuestionType.SHORT_ANSWER]}
                                                onChange={e => setSelectedTypes(p => ({ ...p, [QuestionType.SHORT_ANSWER]: e.target.checked }))}
                                                className="w-5 h-5 text-indigo-600 rounded focus:ring-indigo-500"
                                            />
                                            <span className="text-gray-700">Điền đáp án</span>
                                        </label>
                                        <label className="flex items-center space-x-2 cursor-pointer">
                                            <input
                                                type="checkbox"
                                                checked={selectedTypes[QuestionType.MATCHING]}
                                                onChange={e => setSelectedTypes(p => ({ ...p, [QuestionType.MATCHING]: e.target.checked }))}
                                                className="w-5 h-5 text-indigo-600 rounded focus:ring-indigo-500"
                                            />
                                            <span className="text-gray-700">Nối cột</span>
                                        </label>
                                        <label className="flex items-center space-x-2 cursor-pointer">
                                            <input
                                                type="checkbox"
                                                checked={selectedTypes[QuestionType.MULTIPLE_SELECT]}
                                                onChange={e => setSelectedTypes(p => ({ ...p, [QuestionType.MULTIPLE_SELECT]: e.target.checked }))}
                                                className="w-5 h-5 text-indigo-600 rounded focus:ring-indigo-500"
                                            />
                                            <span className="text-gray-700">Chọn nhiều đáp án</span>
                                        </label>
                                        <label className="flex items-center space-x-2 cursor-pointer">
                                            <input
                                                type="checkbox"
                                                checked={selectedTypes[QuestionType.DRAG_DROP]}
                                                onChange={e => setSelectedTypes(p => ({ ...p, [QuestionType.DRAG_DROP]: e.target.checked }))}
                                                className="w-5 h-5 text-indigo-600 rounded focus:ring-indigo-500"
                                            />
                                            <span className="text-gray-700">Kéo thả điền khuyết</span>
                                        </label>
                                    </div>
                                </div>

                                {/* Difficulty Levels Configuration */}
                                <div className="bg-green-50 p-4 rounded-xl border border-green-200">
                                    <label className="block text-sm font-bold text-green-800 mb-3">
                                        Phan bo cau hoi theo muc do:
                                    </label>
                                    <div className="grid grid-cols-3 gap-4">
                                        <div>
                                            <label className="block text-xs font-medium text-gray-600 mb-1">
                                                Muc 1: Nhan biet
                                            </label>
                                            <input
                                                type="number"
                                                min={0}
                                                max={50}
                                                value={level1Count}
                                                onChange={e => setLevel1Count(Number(e.target.value) || 0)}
                                                className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 outline-none text-center"
                                            />
                                            <p className="text-xs text-gray-500 mt-1">De, quen thuoc</p>
                                        </div>
                                        <div>
                                            <label className="block text-xs font-medium text-gray-600 mb-1">
                                                Muc 2: Thong hieu
                                            </label>
                                            <input
                                                type="number"
                                                min={0}
                                                max={50}
                                                value={level2Count}
                                                onChange={e => setLevel2Count(Number(e.target.value) || 0)}
                                                className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 outline-none text-center"
                                            />
                                            <p className="text-xs text-gray-500 mt-1">Trung binh</p>
                                        </div>
                                        <div>
                                            <label className="block text-xs font-medium text-gray-600 mb-1">
                                                Muc 3: Van dung cao
                                            </label>
                                            <input
                                                type="number"
                                                min={0}
                                                max={50}
                                                value={level3Count}
                                                onChange={e => setLevel3Count(Number(e.target.value) || 0)}
                                                className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 outline-none text-center"
                                            />
                                            <p className="text-xs text-gray-500 mt-1">Kho, thuc tien</p>
                                        </div>
                                    </div>
                                    <p className="text-sm text-green-700 font-bold mt-3 text-center">
                                        Tong so cau: {level1Count + level2Count + level3Count}
                                    </p>
                                </div>

                                {/* Image Library Section */}
                                <div className="bg-purple-50 p-4 rounded-xl border border-purple-200">
                                    <label className="block text-sm font-bold text-purple-800 mb-2 flex items-center">
                                        <Image className="w-4 h-4 mr-2" />
                                        Thu vien hinh anh ({imageLibrary.length}/{MAX_IMAGE_COUNT})
                                    </label>
                                    <p className="text-xs text-gray-500 mb-3">
                                        Upload hinh anh de AI gan vao cau hoi. Toi da {MAX_IMAGE_SIZE_MB}MB/hinh, tu dong resize ve {MAX_IMAGE_WIDTH}x{MAX_IMAGE_HEIGHT}px.
                                    </p>

                                    {/* Upload Button */}
                                    <label className="flex items-center justify-center w-full p-3 border-2 border-dashed border-purple-300 rounded-lg cursor-pointer hover:bg-purple-100 transition-colors mb-3">
                                        <FileUp className="w-5 h-5 text-purple-500 mr-2" />
                                        <span className="text-purple-600 font-medium">Upload hinh anh</span>
                                        <input
                                            type="file"
                                            accept="image/*"
                                            multiple
                                            onChange={handleImageUpload}
                                            className="hidden"
                                        />
                                    </label>

                                    {/* Image Grid */}
                                    {imageLibrary.length > 0 && (
                                        <div className="grid grid-cols-4 gap-2">
                                            {imageLibrary.map(img => (
                                                <div key={img.id} className="relative group">
                                                    <img
                                                        src={img.data}
                                                        alt={img.name}
                                                        className="w-full h-20 object-cover rounded-lg border border-gray-200"
                                                    />
                                                    <button
                                                        onClick={() => handleDeleteImage(img.id)}
                                                        className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                                                    >
                                                        <X className="w-3 h-3" />
                                                    </button>
                                                    <p className="text-xs text-gray-500 truncate mt-1">{img.name}</p>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>

                                {/* Access Code Section - Only visible to Admin */}
                                {isAdmin && (
                                    <div className="bg-orange-50 p-4 rounded-xl border border-orange-200">
                                        <div className="flex items-center justify-between mb-3">
                                            <label className="block text-sm font-bold text-orange-800 flex items-center">
                                                🔐 Mã làm bài (Chỉ Admin)
                                            </label>
                                            <label className="flex items-center cursor-pointer">
                                                <input
                                                    type="checkbox"
                                                    checked={requireCode}
                                                    onChange={e => {
                                                        setRequireCode(e.target.checked);
                                                        if (e.target.checked && !accessCode) {
                                                            setAccessCode(generateRandomCode());
                                                        }
                                                    }}
                                                    className="w-5 h-5 text-orange-600 rounded focus:ring-orange-500 mr-2"
                                                />
                                                <span className="text-sm text-gray-700">Yêu cầu nhập mã khi làm bài</span>
                                            </label>
                                        </div>
                                        {requireCode && (
                                            <div className="flex gap-2">
                                                <input
                                                    type="text"
                                                    value={accessCode}
                                                    onChange={e => setAccessCode(e.target.value.toUpperCase().slice(0, 6))}
                                                    placeholder="Nhập mã 6 ký tự"
                                                    maxLength={6}
                                                    className="flex-1 p-2 border border-orange-300 rounded-lg focus:ring-2 focus:ring-orange-500 outline-none text-center font-mono text-lg tracking-widest uppercase"
                                                />
                                                <button
                                                    type="button"
                                                    onClick={() => setAccessCode(generateRandomCode())}
                                                    className="px-3 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors text-sm font-bold"
                                                >
                                                    Tạo mã mới
                                                </button>
                                            </div>
                                        )}
                                        <p className="text-xs text-gray-500 mt-2">
                                            {requireCode
                                                ? "Học sinh cần nhập đúng mã này để bắt đầu làm bài."
                                                : "Khi tắt, học sinh có thể vào làm bài trực tiếp."}
                                        </p>
                                    </div>
                                )}

                                <div>
                                    <label className="block text-sm font-bold text-gray-700 mb-1">
                                        Nội dung bài học (Tùy chọn)
                                        <span className="block text-xs font-normal text-gray-500">Nếu để trống, AI sẽ tự tạo câu hỏi dựa trên chủ đề.</span>
                                    </label>
                                    <textarea
                                        value={content}
                                        onChange={e => setContent(e.target.value)}
                                        rows={4}
                                        placeholder="Dán nội dung sách giáo khoa hoặc tóm tắt vào đây..."
                                        className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-bold text-gray-700 mb-1">
                                        Ảnh chụp bài học / Tài liệu PDF (Tùy chọn)
                                    </label>
                                    <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-gray-300 border-dashed rounded-lg hover:bg-gray-50 transition-colors relative">
                                        <div className="space-y-1 text-center">
                                            <FileUp className="mx-auto h-12 w-12 text-gray-400" />
                                            <div className="flex text-sm text-gray-600">
                                                <label htmlFor="file-upload" className="relative cursor-pointer bg-white rounded-md font-medium text-indigo-600 hover:text-indigo-500 focus-within:outline-none">
                                                    <span>Tải lên tệp tin</span>
                                                    <input
                                                        id="file-upload"
                                                        name="file-upload"
                                                        type="file"
                                                        className="sr-only"
                                                        accept="image/*,application/pdf"
                                                        onChange={e => setAttachedFile(e.target.files?.[0] || null)}
                                                    />
                                                </label>
                                                <p className="pl-1">hoặc kéo thả vào đây</p>
                                            </div>
                                            <p className="text-xs text-gray-500">PNG, JPG, PDF</p>
                                        </div>
                                        {attachedFile && (
                                            <div className="absolute inset-0 bg-green-50 flex items-center justify-center rounded-lg border-2 border-green-500">
                                                <span className="text-green-700 font-bold flex items-center">
                                                    <FileText className="w-5 h-5 mr-2" />
                                                    {attachedFile.name}
                                                </span>
                                                <button
                                                    onClick={(e) => { e.preventDefault(); setAttachedFile(null); }}
                                                    className="ml-4 text-red-500 hover:text-red-700 font-bold text-lg"
                                                >
                                                    ×
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                <button
                                    onClick={handleGenerate}
                                    disabled={isGenerating}
                                    className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 text-white py-3 rounded-xl font-bold hover:from-indigo-700 hover:to-purple-700 flex justify-center items-center shadow-lg transform transition active:scale-95 disabled:opacity-70 disabled:cursor-not-allowed"
                                >
                                    {isGenerating ? <><Loader2 className="animate-spin mr-2" /> Đang phân tích & tạo đề...</> : '🚀 Tạo đề kiểm tra ngay'}
                                </button>

                                <div className="mt-6 pt-6 border-t-2 border-gray-100 -mx-6 px-6 pb-4 rounded-b-2xl">
                                    <label className="block text-sm font-bold text-gray-700 mb-3 flex items-center">
                                        <Bot className="w-4 h-4 mr-2 text-indigo-600" />
                                        Chọn AI tạo đề
                                    </label>

                                    {/* Provider Selection */}
                                    <div className="flex gap-2">
                                        <button
                                            type="button"
                                            onClick={() => {
                                                setAiProvider('perplexity');
                                                localStorage.setItem('ai_provider', 'perplexity');
                                            }}
                                            className={`flex-1 py-3 px-4 rounded-xl font-bold text-sm transition-all flex items-center justify-center ${aiProvider === 'perplexity'
                                                ? 'bg-purple-600 text-white shadow-lg ring-2 ring-purple-200'
                                                : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'
                                                }`}
                                        >
                                            <span className="mr-2">🟣</span> Perplexity AI
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => {
                                                setAiProvider('gemini');
                                                localStorage.setItem('ai_provider', 'gemini');
                                            }}
                                            className={`flex-1 py-3 px-4 rounded-xl font-bold text-sm transition-all flex items-center justify-center ${aiProvider === 'gemini'
                                                ? 'bg-blue-600 text-white shadow-lg ring-2 ring-blue-200'
                                                : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'
                                                }`}
                                        >
                                            <span className="mr-2">🔵</span> Google Gemini
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => {
                                                setAiProvider('llm-mux');
                                                localStorage.setItem('ai_provider', 'llm-mux');
                                            }}
                                            className={`flex-1 py-3 px-4 rounded-xl font-bold text-sm transition-all flex items-center justify-center ${aiProvider === 'llm-mux'
                                                ? 'bg-orange-600 text-white shadow-lg ring-2 ring-orange-200'
                                                : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'
                                                }`}
                                        >
                                            <span className="mr-2">🟠</span> LLM-Mux (Local)
                                        </button>
                                    </div>
                                    <p className="text-xs text-gray-400 mt-3 text-center">
                                        * Hệ thống tự động sử dụng API Key từ cấu hình Server.
                                    </p>
                                </div>
                            </div>

                            <div className="bg-gray-50 p-6 rounded-2xl border border-gray-200 h-full flex flex-col">
                                <h3 className="font-bold text-gray-500 mb-4 uppercase text-xs tracking-wider">Xem trước đề thi</h3>
                                <div className="flex-1 overflow-y-auto max-h-[600px] pr-2 custom-scrollbar">
                                    {generatedQuiz ? (
                                        <div className="space-y-4">
                                            <div className="text-center border-b border-gray-200 pb-4 mb-4">
                                                <h4 className="text-xl font-extrabold text-blue-900">{generatedQuiz.title}</h4>
                                                <div className="flex justify-center space-x-4 mt-2 text-sm text-gray-500">
                                                    <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded">Lớp {generatedQuiz.classLevel}</span>
                                                    <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded">{generatedQuiz.questions.length} câu</span>
                                                    <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded">{generatedQuiz.timeLimit} phút</span>
                                                </div>
                                            </div>
                                            {generatedQuiz.questions.map((q, i) => (
                                                <div key={i} className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 text-sm hover:shadow-md transition-shadow">
                                                    <div className="flex gap-2">
                                                        <span className="font-bold text-blue-600 whitespace-nowrap">Câu {i + 1}:</span>
                                                        <div className="text-gray-800">
                                                            {q.type === 'MCQ' && (
                                                                <div>
                                                                    <p className="font-medium mb-2">{(q as any).question}</p>
                                                                    <ul className="grid grid-cols-2 gap-2 text-xs text-gray-600">
                                                                        {(q as any).options.map((o: string, idx: number) => (
                                                                            <li key={idx} className={String.fromCharCode(65 + idx) === (q as any).correctAnswer ? "text-green-600 font-bold" : ""}>
                                                                                {String.fromCharCode(65 + idx)}. {o}
                                                                            </li>
                                                                        ))}
                                                                    </ul>
                                                                </div>
                                                            )}
                                                            {q.type === 'TRUE_FALSE' && (
                                                                <div>
                                                                    <p className="font-medium mb-2">{(q as any).mainQuestion}</p>
                                                                    <ul className="space-y-1 text-xs text-gray-600">
                                                                        {(q as any).items.map((it: any) => (
                                                                            <li key={it.id} className="flex justify-between">
                                                                                <span>- {it.statement}</span>
                                                                                <span className={it.isCorrect ? "text-green-600 font-bold" : "text-red-500 font-bold"}>
                                                                                    {it.isCorrect ? "Đúng" : "Sai"}
                                                                                </span>
                                                                            </li>
                                                                        ))}
                                                                    </ul>
                                                                </div>
                                                            )}
                                                            {q.type === 'SHORT_ANSWER' && (
                                                                <div>
                                                                    <p className="font-medium mb-1">{(q as any).question}</p>
                                                                    <p className="text-xs text-green-600 font-bold">Đáp án: {(q as any).correctAnswer}</p>
                                                                </div>
                                                            )}
                                                            {q.type === 'MATCHING' && (
                                                                <div>
                                                                    <p className="font-medium mb-1">{(q as any).question}</p>
                                                                    <ul className="text-xs text-gray-600 space-y-1">
                                                                        {(q as any).pairs.map((p: any, idx: number) => (
                                                                            <li key={idx}>{p.left} - {p.right}</li>
                                                                        ))}
                                                                    </ul>
                                                                </div>
                                                            )}
                                                            {q.type === 'MULTIPLE_SELECT' && (
                                                                <div>
                                                                    <p className="font-medium mb-2">{(q as any).question}</p>
                                                                    <p className="text-xs text-purple-600 mb-1 font-bold">(Chọn nhiều đáp án)</p>
                                                                    <ul className="grid grid-cols-2 gap-2 text-xs text-gray-600">
                                                                        {(q as any).options?.map((o: string, idx: number) => {
                                                                            const label = String.fromCharCode(65 + idx);
                                                                            const isCorrect = (q as any).correctAnswers?.includes(label);
                                                                            return (
                                                                                <li key={idx} className={isCorrect ? "text-green-600 font-bold" : ""}>
                                                                                    {label}. {o}
                                                                                </li>
                                                                            );
                                                                        })}
                                                                    </ul>
                                                                    <p className="text-xs text-green-600 mt-2">
                                                                        Dap an dung: {(q as any).correctAnswers?.join(', ') || 'N/A'}
                                                                    </p>
                                                                </div>
                                                            )}
                                                            {q.type === 'DRAG_DROP' && (
                                                                <div>
                                                                    <p className="font-medium mb-2">{(q as any).question}</p>
                                                                    <div className="p-3 bg-gray-50 rounded border border-gray-200 text-sm leading-relaxed">
                                                                        {((q as any).text || "").split(/(\[.*?\])/g).map((part: string, idx: number) => {
                                                                            if (part.startsWith('[') && part.endsWith(']')) {
                                                                                return <span key={idx} className="font-bold text-blue-600 mx-1">{part}</span>;
                                                                            }
                                                                            return <span key={idx}>{part}</span>;
                                                                        })}
                                                                    </div>
                                                                    <div className="mt-2 text-xs text-gray-500">
                                                                        <span className="font-bold">Từ cần điền:</span> {(q as any).blanks?.join(', ') || 'Không có'}
                                                                    </div>
                                                                    {(q as any).distractors && (q as any).distractors.length > 0 && (
                                                                        <div className="mt-1 text-xs text-gray-500">
                                                                            <span className="font-bold">Từ gây nhiễu:</span> {(q as any).distractors.join(', ')}
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            )}
                                                            {/* Fallback for unknown or unrecognized types */}
                                                            {!['MCQ', 'TRUE_FALSE', 'SHORT_ANSWER', 'MATCHING', 'MULTIPLE_SELECT', 'DRAG_DROP'].includes(q.type) && (
                                                                <div className="text-red-500">
                                                                    <p className="font-medium mb-1">Loai cau hoi khong nhan dien: {q.type}</p>
                                                                    <p className="text-xs">{(q as any).question || (q as any).mainQuestion || 'Khong co noi dung'}</p>
                                                                </div>
                                                            )}

                                                            {/* Image Display & Edit Button */}
                                                            <div className="mt-2 flex items-start gap-3 pt-2 border-t border-gray-50">
                                                                {q.image && (
                                                                    <div className="relative group">
                                                                        <img src={q.image} alt="Question" className="h-20 object-contain rounded border border-gray-200" />
                                                                        <button
                                                                            onClick={() => handleUpdateQuestionImage(q.id, '')}
                                                                            className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 shadow-sm opacity-0 group-hover:opacity-100 transition-opacity"
                                                                            title="Xóa ảnh"
                                                                        >
                                                                            <X className="w-3 h-3" />
                                                                        </button>
                                                                    </div>
                                                                )}
                                                                <button
                                                                    onClick={() => setEditingQuestionImageId(q.id)}
                                                                    className="flex items-center text-xs text-indigo-600 hover:text-indigo-800 font-medium mt-1 py-1 px-2 hover:bg-indigo-50 rounded transition-colors"
                                                                >
                                                                    <Image className="w-3 h-3 mr-1" />
                                                                    {q.image ? 'Thay đổi ảnh' : 'Thêm hình ảnh'}
                                                                </button>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    ) : (
                                        <div className="h-full flex flex-col items-center justify-center text-gray-400">
                                            <div className="bg-white p-4 rounded-full shadow-sm mb-4">
                                                <FileText className="w-10 h-10 text-gray-300" />
                                            </div>
                                            <p className="font-medium">Đề thi sẽ hiển thị ở đây</p>
                                            <p className="text-sm mt-1">Hãy nhập thông tin và nhấn "Tạo đề"</p>
                                        </div>
                                    )}
                                </div>
                                {generatedQuiz && (
                                    <button
                                        onClick={handleSaveQuiz}
                                        disabled={isSaving}
                                        className="w-full mt-4 bg-green-600 text-white py-3 rounded-xl font-bold hover:bg-green-700 flex items-center justify-center shadow-lg disabled:opacity-70"
                                    >
                                        {isSaving ? <Loader2 className="animate-spin mr-2" /> : <Save className="w-5 h-5 mr-2" />}
                                        {isSaving ? "Đang lưu..." : (editingQuizId ? "Cập nhật đề thi" : "Lưu vào Ngân hàng đề")}
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>
                )}

                {activeTab === 'results' && (
                    <div className="space-y-6">
                        {/* Stats Cards */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div className="bg-white p-4 rounded-xl shadow-sm border-l-4 border-blue-500">
                                <p className="text-gray-500 text-sm">Tổng bài nộp</p>
                                <p className="text-2xl font-bold">{results.length}</p>
                            </div>
                            <div className="bg-white p-4 rounded-xl shadow-sm border-l-4 border-green-500">
                                <p className="text-gray-500 text-sm">Điểm trung bình</p>
                                <p className="text-2xl font-bold">
                                    {results.length > 0 ? (results.reduce((a, b) => a + b.score, 0) / results.length).toFixed(1) : 0}
                                </p>
                            </div>
                            <div className="bg-white p-4 rounded-xl shadow-sm border-l-4 border-orange-500">
                                <p className="text-gray-500 text-sm">Số đề hiện có</p>
                                <p className="text-2xl font-bold">{quizzes.length}</p>
                            </div>
                        </div>

                        {/* Filters */}
                        <div className="bg-white p-4 rounded-xl shadow-sm flex flex-wrap gap-4 items-center justify-between">
                            <div className="flex items-center gap-2">
                                <label className="text-sm font-bold">Lọc Lớp:</label>
                                <select value={filterClass} onChange={e => setFilterClass(e.target.value)} className="border rounded p-2 text-sm">
                                    <option value="All">Tất cả</option>
                                    {Array.from({ length: 5 }, (_, g) => g + 1).flatMap(grade =>
                                        Array.from({ length: 9 }, (_, c) => c + 1).map(num => `${grade}A${num}`)
                                    ).map(c => <option key={c} value={c}>{c}</option>)}
                                </select>
                            </div>
                            <button onClick={exportExcel} className="bg-green-100 text-green-700 px-4 py-2 rounded-lg hover:bg-green-200 flex items-center text-sm font-bold">
                                <Download className="w-4 h-4 mr-2" /> Xuất Excel
                            </button>
                        </div>

                        {/* Table */}
                        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
                            <table className="min-w-full divide-y divide-gray-200">
                                <thead className="bg-gray-50">
                                    <tr>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Họ tên</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Lớp</th>
                                        <th
                                            className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:text-blue-600"
                                            onClick={() => { setSortField('score'); setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc'); }}
                                        >
                                            Điểm {sortField === 'score' && (sortOrder === 'asc' ? '↑' : '↓')}
                                        </th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Số câu đúng</th>
                                        <th
                                            className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:text-blue-600"
                                            onClick={() => { setSortField('submittedAt'); setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc'); }}
                                        >
                                            Thời gian nộp {sortField === 'submittedAt' && (sortOrder === 'asc' ? '↑' : '↓')}
                                        </th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-gray-200">
                                    {filteredResults.map((r) => (
                                        <tr key={r.id}>
                                            <td className="px-6 py-4 whitespace-nowrap font-medium text-gray-900">{r.studentName}</td>
                                            <td className="px-6 py-4 whitespace-nowrap text-gray-500">{r.studentClass}</td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${r.score >= 5 ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                                                    {r.score}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-gray-500">{r.correctCount}/{r.totalQuestions}</td>
                                            <td className="px-6 py-4 whitespace-nowrap text-gray-500 text-sm">
                                                {new Date(r.submittedAt).toLocaleString('vi-VN')}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                            {filteredResults.length === 0 && <div className="p-8 text-center text-gray-400">Chưa có dữ liệu</div>}
                        </div>
                    </div>
                )}

                {activeTab === 'manage' && (
                    <div className="space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {quizzes.map(quiz => (
                                <div key={quiz.id} className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex justify-between items-center">
                                    <div>
                                        <h3
                                            className="font-bold text-lg text-gray-800 cursor-pointer hover:text-blue-600 hover:underline"
                                            onClick={() => window.open(`?quizId=${quiz.id}`, '_blank')}
                                            title="Nhấn để làm bài (Xem như học sinh)"
                                        >
                                            {quiz.title}
                                        </h3>
                                        <p className="text-sm text-gray-500">Lớp {quiz.classLevel} • {quiz.questions.length} câu • {quiz.timeLimit} phút</p>
                                        <p className="text-xs text-gray-400 mt-1">Tạo lúc: {new Date(quiz.createdAt).toLocaleString('vi-VN')}</p>
                                        {isAdmin && quiz.requireCode && (
                                            <p className="text-xs mt-1">
                                                <span className="bg-orange-100 text-orange-700 px-2 py-0.5 rounded-full font-bold">
                                                    🔐 Mã: {quiz.accessCode}
                                                </span>
                                            </p>
                                        )}
                                    </div>
                                    <div className="flex space-x-2">
                                        <button
                                            onClick={() => handleEditQuiz(quiz)}
                                            className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                            title="Sửa đề thi"
                                        >
                                            <Edit className="w-5 h-5" />
                                        </button>
                                        <button
                                            onClick={() => handleDeleteQuiz(quiz.id)}
                                            className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                            title="Xóa đề thi"
                                        >
                                            <Trash2 className="w-5 h-5" />
                                        </button>
                                    </div>
                                </div>
                            ))}
                            {quizzes.length === 0 && (
                                <div className="col-span-2 text-center py-12 text-gray-400 bg-white rounded-xl border border-dashed border-gray-300">
                                    <p>Chưa có đề thi nào được tạo.</p>
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </div>

            {/* Image Selection Modal */}
            {
                editingQuestionImageId && (
                    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                        <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
                            <div className="p-4 border-b border-gray-100 flex justify-between items-center">
                                <h3 className="font-bold text-lg text-gray-800">Chọn hình ảnh cho câu hỏi</h3>
                                <button onClick={() => setEditingQuestionImageId(null)} className="text-gray-400 hover:text-gray-600">
                                    <X className="w-6 h-6" />
                                </button>
                            </div>

                            <div className="p-6 space-y-6">
                                {/* Option 1: Library */}
                                <div>
                                    <h4 className="font-bold text-sm text-gray-700 mb-3 flex items-center">
                                        <List className="w-4 h-4 mr-2" />
                                        Từ thư viện đã upload ({imageLibrary.length})
                                    </h4>
                                    {imageLibrary.length > 0 ? (
                                        <div className="grid grid-cols-4 gap-3 max-h-40 overflow-y-auto p-2 border border-gray-100 rounded-lg">
                                            {imageLibrary.map(img => (
                                                <div
                                                    key={img.id}
                                                    onClick={() => {
                                                        if (editingQuestionImageId) {
                                                            handleUpdateQuestionImage(editingQuestionImageId, img.data);
                                                        }
                                                    }}
                                                    className="cursor-pointer group relative border-2 border-transparent hover:border-indigo-500 rounded-lg overflow-hidden"
                                                >
                                                    <img src={img.data} alt={img.name} className="w-full h-20 object-cover" />
                                                    <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-10 transition-all flex items-center justify-center">
                                                        <span className="text-white text-xs font-bold opacity-0 group-hover:opacity-100 bg-black bg-opacity-50 px-2 py-1 rounded">Chọn</span>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    ) : (
                                        <p className="text-sm text-gray-500 italic">Chưa có hình nào trong thư viện.</p>
                                    )}
                                </div>

                                <div className="border-t border-gray-100"></div>

                                {/* Option 2: URL */}
                                <div>
                                    <h4 className="font-bold text-sm text-gray-700 mb-3 flex items-center">
                                        <LinkIcon className="w-4 h-4 mr-2" />
                                        Từ URL (Link ảnh trên mạng)
                                    </h4>
                                    <div className="flex gap-2">
                                        <input
                                            type="text"
                                            value={tempImageUrl}
                                            onChange={(e) => setTempImageUrl(e.target.value)}
                                            placeholder="https://example.com/image.jpg"
                                            className="flex-1 p-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                                        />
                                        <button
                                            onClick={() => {
                                                if (editingQuestionImageId) {
                                                    handleUpdateQuestionImage(editingQuestionImageId, tempImageUrl);
                                                }
                                            }}
                                            disabled={!tempImageUrl}
                                            className="bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-bold hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
                                        >
                                            Sử dụng
                                        </button>
                                    </div>
                                    <div className="mt-2 text-right">
                                        <a
                                            href={`https://www.google.com/search?tbm=isch&q=${encodeURIComponent(topic)}`}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="text-xs text-blue-600 hover:underline flex items-center justify-end"
                                        >
                                            <Search className="w-3 h-3 mr-1" />
                                            Tìm ảnh trên Google Images
                                        </a>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                )
            }
        </div >
    );
};

export default TeacherDashboard;