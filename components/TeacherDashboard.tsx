import React, { useState, useEffect } from 'react';
import { Quiz, Question, QuestionType, StudentResult } from '../types';
import { generateQuiz, QuizGenerationOptions, AIProvider } from '../geminiService';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { FileText, Save, RefreshCw, LogOut, Loader2, Download, Settings, FileUp, Trash2, Edit, List, KeyRound } from 'lucide-react';
import { deleteQuizFromSheet, updateQuizInSheet } from '../googleSheetService';
import { GOOGLE_SCRIPT_URL } from '../App';

interface Props {
    onLogout: () => void;
    quizzes: Quiz[];
    results: StudentResult[];
    onSaveQuiz: (quiz: Quiz) => Promise<void>;
}

const TeacherDashboard: React.FC<Props> = ({ onLogout, quizzes, results, onSaveQuiz }) => {
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

    const [isGenerating, setIsGenerating] = useState(false);
    const [generatedQuiz, setGeneratedQuiz] = useState<Quiz | null>(null);

    // Result View State
    const [filterClass, setFilterClass] = useState<string>('All');
    const [sortField, setSortField] = useState<'score' | 'submittedAt'>('submittedAt');
    const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

    const [apiKey, setApiKey] = useState(() => localStorage.getItem('ai_api_key') || '');
    const [aiProvider, setAiProvider] = useState<AIProvider>(() => (localStorage.getItem('ai_provider') as AIProvider) || 'perplexity');

    // Auto-generate title based on topic
    useEffect(() => {
        if (topic && !quizTitle) {
            setQuizTitle(`Kiểm tra: ${topic}`);
        }
    }, [topic, quizTitle]);

    const handleGenerate = async () => {
        if (!apiKey) return alert(`Vui lòng nhập ${aiProvider === 'perplexity' ? 'Perplexity' : 'Gemini'} API Key ở phần 'Cấu hình API' bên dưới!`);
        if (!topic) return alert("Vui lòng nhập chủ đề bài học");

        // Validate types
        const enabledTypes = Object.entries(selectedTypes)
            .filter(([_, enabled]) => enabled)
            .map(([type]) => type as QuestionType);

        if (enabledTypes.length === 0) return alert("Vui lòng chọn ít nhất một dạng câu hỏi");

        setIsGenerating(true);
        try {
            const options: QuizGenerationOptions = {
                title: quizTitle || `Kiểm tra: ${topic}`,
                questionCount: questionCount,
                questionTypes: enabledTypes
            };

            const data = await generateQuiz(topic, classLevel, content, attachedFile, options, apiKey, aiProvider);

            // Process raw data into Type safe objects
            const questions: Question[] = data.questions.map((q: any, idx: number) => {
                const base = { id: `q-${Date.now()}-${idx}` };
                if (q.type === 'MCQ') {
                    return { ...base, type: QuestionType.MCQ, question: q.question, options: q.options, correctAnswer: q.correctAnswer };
                } else if (q.type === 'TRUE_FALSE') {
                    return {
                        ...base,
                        type: QuestionType.TRUE_FALSE,
                        mainQuestion: q.mainQuestion,
                        items: q.items.map((i: any, subIdx: number) => ({ id: `sub-${idx}-${subIdx}`, statement: i.statement, isCorrect: i.isCorrect }))
                    };
                } else if (q.type === 'MATCHING') {
                    return { ...base, type: QuestionType.MATCHING, question: q.question, pairs: q.pairs };
                } else if (q.type === 'MULTIPLE_SELECT') {
                    return {
                        ...base,
                        type: QuestionType.MULTIPLE_SELECT,
                        question: q.question,
                        options: q.options,
                        correctAnswers: q.correctAnswers || []
                    };
                } else {
                    return { ...base, type: QuestionType.SHORT_ANSWER, question: q.question, correctAnswer: q.correctAnswer };
                }
            });

            const newQuiz: Quiz = {
                id: crypto.randomUUID(),
                title: data.title || options.title,
                classLevel,
                timeLimit: manualTimeLimit ? Number(manualTimeLimit) : Math.ceil(questions.length * 1.5),
                questions,
                createdAt: new Date().toISOString()
            };
            setGeneratedQuiz(newQuiz);
        } catch (e) {
            alert("Lỗi khi tạo đề: " + (e as Error).message);
        } finally {
            setIsGenerating(false);
        }
    };

    const [isSaving, setIsSaving] = useState(false);

    const handleSaveQuiz = async () => {
        if (generatedQuiz) {
            setIsSaving(true);
            try {
                if (editingQuizId) {
                    // Update existing
                    await updateQuizInSheet(generatedQuiz, GOOGLE_SCRIPT_URL);
                    alert("Đã cập nhật đề thi thành công!");
                } else {
                    // Create new
                    await onSaveQuiz(generatedQuiz);
                    alert("Đã lưu đề thi thành công!");
                }

                setGeneratedQuiz(null);
                setEditingQuizId(null);
                // Reset essential fields
                setTopic('');
                setQuizTitle('');
                setContent('');
                setAttachedFile(null);
                setActiveTab('manage'); // Go to manage tab to see changes (though requires refresh/reload usually)
            } catch (error) {
                alert("Lỗi khi lưu đề thi!");
                console.error(error);
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
                                        <label className="block text-sm font-bold text-gray-700 mb-1">Số lượng câu</label>
                                        <input
                                            type="number"
                                            min={5} max={30}
                                            value={questionCount}
                                            onChange={e => setQuestionCount(Number(e.target.value))}
                                            className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                                        />
                                    </div>
                                    <div className="col-span-2">
                                        <label className="block text-sm font-bold text-gray-700 mb-1">Thời gian làm bài (phút)</label>
                                        <input
                                            type="number"
                                            min={1}
                                            value={manualTimeLimit}
                                            onChange={e => setManualTimeLimit(Number(e.target.value))}
                                            placeholder="Tự động tính theo số câu hỏi (1.5 phút/câu)"
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
                                            <span className="text-gray-700">Nhiều đáp án</span>
                                        </label>
                                    </div>
                                </div>

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

                                <div className={`mt-6 pt-6 border-t-2 ${apiKey ? 'border-green-200 bg-green-50' : 'border-orange-200 bg-orange-50'} -mx-6 px-6 pb-4 rounded-b-2xl`}>
                                    <label className="block text-sm font-bold text-gray-700 mb-3 flex items-center">
                                        <KeyRound className={`w-4 h-4 mr-2 ${apiKey ? 'text-green-500' : 'text-orange-500'}`} />
                                        🔑 Cấu hình AI (Bắt buộc)
                                        {apiKey && <span className="ml-2 text-green-600 text-xs">✓ Đã nhập</span>}
                                    </label>

                                    {/* Provider Selection */}
                                    <div className="flex gap-2 mb-3">
                                        <button
                                            type="button"
                                            onClick={() => {
                                                setAiProvider('perplexity');
                                                localStorage.setItem('ai_provider', 'perplexity');
                                            }}
                                            className={`flex-1 py-2 px-4 rounded-lg font-bold text-sm transition-all ${aiProvider === 'perplexity'
                                                ? 'bg-purple-600 text-white shadow-md'
                                                : 'bg-white text-gray-600 border border-gray-300 hover:bg-gray-50'
                                                }`}
                                        >
                                            🟣 Perplexity AI
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => {
                                                setAiProvider('gemini');
                                                localStorage.setItem('ai_provider', 'gemini');
                                            }}
                                            className={`flex-1 py-2 px-4 rounded-lg font-bold text-sm transition-all ${aiProvider === 'gemini'
                                                ? 'bg-blue-600 text-white shadow-md'
                                                : 'bg-white text-gray-600 border border-gray-300 hover:bg-gray-50'
                                                }`}
                                        >
                                            🔵 Google Gemini
                                        </button>
                                    </div>

                                    {/* API Key Input */}
                                    <div className="flex gap-2">
                                        <input
                                            type="password"
                                            value={apiKey}
                                            onChange={(e) => {
                                                setApiKey(e.target.value);
                                                localStorage.setItem('ai_api_key', e.target.value);
                                            }}
                                            placeholder={aiProvider === 'perplexity' ? "Dán Perplexity API Key vào đây..." : "Dán Google Gemini API Key vào đây..."}
                                            className={`flex-1 p-3 border-2 rounded-lg text-sm focus:ring-2 outline-none ${apiKey ? 'border-green-300 focus:ring-green-500' : 'border-orange-300 focus:ring-orange-500'}`}
                                        />
                                    </div>

                                    {/* Help Links */}
                                    <p className="text-xs text-gray-600 mt-2">
                                        📌 Lấy API Key miễn phí tại: {' '}
                                        {aiProvider === 'perplexity' ? (
                                            <a href="https://www.perplexity.ai/settings/api" target="_blank" rel="noopener noreferrer" className="text-purple-600 underline hover:text-purple-800">
                                                Perplexity Settings
                                            </a>
                                        ) : (
                                            <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noopener noreferrer" className="text-blue-600 underline hover:text-blue-800">
                                                Google AI Studio
                                            </a>
                                        )}
                                    </p>
                                    <p className="text-xs text-gray-500 mt-1">
                                        * API Key được lưu an toàn trên trình duyệt của bạn, không gửi lên server.
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
                                        <h3 className="font-bold text-lg text-gray-800">{quiz.title}</h3>
                                        <p className="text-sm text-gray-500">Lớp {quiz.classLevel} • {quiz.questions.length} câu • {quiz.timeLimit} phút</p>
                                        <p className="text-xs text-gray-400 mt-1">Tạo ngày: {new Date(quiz.createdAt).toLocaleDateString('vi-VN')}</p>
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
        </div>
    );
};

export default TeacherDashboard;