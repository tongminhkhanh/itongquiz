
import React, { useState, useEffect } from 'react';
import { Analytics } from '@vercel/analytics/react';
import StudentView from './components/StudentView';
import TeacherDashboard from './components/TeacherDashboard';
import { Quiz, StudentResult, QuestionType } from './types';
import { SCHOOL_NAME } from './constants';
import { BookOpen, GraduationCap, Lock, KeyRound, RefreshCw } from 'lucide-react';
import { fetchQuizzesFromSheets, fetchTeachersFromSheets, fetchResultsFromSheets, saveQuizToSheet, saveResultToSheet } from './googleSheetService';

// --- CONFIGURATION ---
// Replace these with your actual Google Sheet ID and GIDs
export const GOOGLE_SHEET_ID = '1mrqbJ3Xzj4CBF_B2vyI7-ANLaVPAfWCe_TdmCd9_gx4'; // User needs to update this
const QUIZ_GID = '0'; // Default first sheet
const QUESTION_GID = '1395660327'; // User needs to update this
const TEACHER_GID = '1482913865'; // User needs to update this
export const RESULTS_GID = '1960978030'; // GID for Results sheet
export const GOOGLE_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbwbfluTcn5UjnKCBOLJRJvtsX3imQOdEeZD9QCkheDv72z1lnd0dR07C02sZJUyXKMqUA/exec'; // User needs to update this

const App: React.FC = () => {
    // --- STATE ---
    const [view, setView] = useState<'home' | 'student' | 'teacher_login' | 'teacher_dash'>(() => {
        const savedSession = localStorage.getItem('teacher_session');
        return savedSession ? 'teacher_dash' : 'home';
    });
    const [quizzes, setQuizzes] = useState<Quiz[]>([]);
    const [results, setResults] = useState<StudentResult[]>([]);
    const [activeQuiz, setActiveQuiz] = useState<Quiz | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [selectedClassLevel, setSelectedClassLevel] = useState<string | null>(null);

    // Login State
    const [usernameInput, setUsernameInput] = useState('');
    const [passwordInput, setPasswordInput] = useState('');
    const [loginError, setLoginError] = useState(false);
    const [loggedInTeacher, setLoggedInTeacher] = useState<string | null>(() => {
        const savedSession = localStorage.getItem('teacher_session');
        return savedSession ? JSON.parse(savedSession).name : null;
    });
    const [isAdmin, setIsAdmin] = useState<boolean>(() => {
        const savedSession = localStorage.getItem('teacher_session');
        return savedSession ? JSON.parse(savedSession).isAdmin === true : false;
    });

    // --- DATA FETCHING ---
    const loadData = async () => {
        setIsLoading(true);
        try {
            // Try fetching from Google Sheets first
            if (GOOGLE_SHEET_ID) {
                const sheetQuizzes = await fetchQuizzesFromSheets(GOOGLE_SHEET_ID, QUIZ_GID, QUESTION_GID);
                if (sheetQuizzes.length > 0) {
                    setQuizzes(sheetQuizzes);
                    localStorage.setItem('itong_quizzes', JSON.stringify(sheetQuizzes));
                    setIsLoading(false);
                    return;
                }
            }
        } catch (e) {
            console.error("Failed to fetch from sheets, falling back to local storage", e);
        }

        // Fallback to Local Storage or Seed Data
        const savedQuizzes = localStorage.getItem('itong_quizzes');
        if (savedQuizzes) {
            setQuizzes(JSON.parse(savedQuizzes));
        } else {
            // Seed initial data if empty
            const seedQuiz: Quiz = {
                id: 'demo-1',
                title: 'Ôn tập Khoa học lớp 3: Không khí và Nước',
                classLevel: '3',
                timeLimit: 30,
                createdAt: new Date().toISOString(),
                questions: [
                    {
                        id: 'q1', type: QuestionType.MCQ, question: 'Không khí gồm những khí nào?',
                        options: ['Oxy và Nitrogen', 'Chỉ Oxy', 'Chỉ Nitrogen', 'Khí Cacbon dioxit'],
                        correctAnswer: 'A'
                    },
                    {
                        id: 'q2', type: QuestionType.TRUE_FALSE, mainQuestion: 'Về nước:',
                        items: [
                            { id: 'i1', statement: 'Nước không có màu, không có mùi', isCorrect: true },
                            { id: 'i2', statement: 'Nước chiếm 3/4 bề mặt Trái Đất', isCorrect: true }
                        ]
                    },
                    {
                        id: 'q3', type: QuestionType.SHORT_ANSWER, question: 'Nước sôi ở bao nhiêu độ C?', correctAnswer: '100'
                    }
                ]
            };
            setQuizzes([seedQuiz]);
            localStorage.setItem('itong_quizzes', JSON.stringify([seedQuiz]));
        }
        setIsLoading(false);
    };

    // Load results from Google Sheets
    const loadResults = async () => {
        let sheetResults: StudentResult[] = [];

        // 1. Try to fetch from Google Sheets (source of truth)
        try {
            if (GOOGLE_SHEET_ID && RESULTS_GID) {
                sheetResults = await fetchResultsFromSheets(GOOGLE_SHEET_ID, RESULTS_GID);
                console.log('[loadResults] Fetched from Google Sheets:', sheetResults.length, 'results');
            }
        } catch (e) {
            console.error("Failed to fetch results from sheets", e);
        }

        // 2. If Google Sheets has data, use it as source of truth (replace localStorage)
        if (sheetResults.length > 0) {
            // Sort by submittedAt descending (newest first)
            sheetResults.sort((a, b) => new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime());
            setResults(sheetResults);
            localStorage.setItem('itong_results', JSON.stringify(sheetResults));
            return sheetResults;
        }

        // 3. Fallback to localStorage if Google Sheets is empty or failed
        const savedResults = localStorage.getItem('itong_results');
        if (savedResults) {
            try {
                const localResults: StudentResult[] = JSON.parse(savedResults);
                localResults.sort((a, b) => new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime());
                setResults(localResults);
                return localResults;
            } catch (e) {
                console.error("Failed to parse local results", e);
            }
        }

        setResults([]);
        return [];
    };

    // --- PERSISTENCE (MOCK DB) ---
    useEffect(() => {
        loadData();
        loadResults(); // Load results from Google Sheets instead of just localStorage

        // Check URL for quizId
        const params = new URLSearchParams(window.location.search);
        const quizId = params.get('quizId');
        if (quizId) {
            // Need to wait for quizzes to load, or load them then find
            // Since loadData is async and sets state, we might need to depend on quizzes
        }
    }, []);

    // Effect to handle deep linking once quizzes are loaded
    useEffect(() => {
        const params = new URLSearchParams(window.location.search);
        const quizId = params.get('quizId');
        if (quizId && quizzes.length > 0 && !activeQuiz) {
            const foundQuiz = quizzes.find(q => q.id === quizId);
            if (foundQuiz) {
                setActiveQuiz(foundQuiz);
                setView('student');
            }
        }
    }, [quizzes]);

    const saveQuizToStorage = async (newQuiz: Quiz) => {
        // 1. Save to Local State & Storage
        const updated = [...quizzes, newQuiz];
        setQuizzes(updated);
        localStorage.setItem('itong_quizzes', JSON.stringify(updated));

        // 2. Save to Google Sheet (if configured)
        if (GOOGLE_SCRIPT_URL && GOOGLE_SCRIPT_URL.startsWith('http')) {
            await saveQuizToSheet(newQuiz, GOOGLE_SCRIPT_URL);
        }
    };

    const updateQuizInStorage = async (updatedQuiz: Quiz) => {
        // 1. Update Local State & Storage
        const updated = quizzes.map(q => q.id === updatedQuiz.id ? updatedQuiz : q);
        setQuizzes(updated);
        localStorage.setItem('itong_quizzes', JSON.stringify(updated));

        // 2. Update in Google Sheet (handled in TeacherDashboard, but good to keep sync logic here if refactoring)
        // For now, TeacherDashboard calls updateQuizInSheet directly, but we MUST update local state here.
    };

    const saveResultToStorage = async (newResult: StudentResult) => {
        const updated = [...results, newResult];
        setResults(updated);
        localStorage.setItem('itong_results', JSON.stringify(updated));

        // Save to Google Sheet
        if (GOOGLE_SCRIPT_URL && GOOGLE_SCRIPT_URL.startsWith('http')) {
            // Find quiz title for better reporting
            const quiz = quizzes.find(q => q.id === newResult.quizId);
            const resultWithTitle = { ...newResult, quizTitle: quiz?.title || 'Unknown' };
            await saveResultToSheet(resultWithTitle, GOOGLE_SCRIPT_URL);
        }
    };

    // --- HANDLERS ---
    const handleTeacherLogin = async () => {
        setLoginError(false);
        if (!usernameInput || !passwordInput) {
            setLoginError(true);
            return;
        }

        try {
            // Fallback login for development or when Google Sheets is unreachable (CORS issues)
            if (usernameInput === 'admin' && passwordInput === 'admin') {
                setLoggedInTeacher('Admin');
                setIsAdmin(true);
                setView('teacher_dash');
                setUsernameInput('');
                setPasswordInput('');
                localStorage.setItem('teacher_session', JSON.stringify({ name: 'Admin', isAdmin: true }));
                return;
            }

            const teachers = await fetchTeachersFromSheets(GOOGLE_SHEET_ID, TEACHER_GID);
            const teacher = teachers.find(t => t.username === usernameInput && t.password === passwordInput);

            if (teacher) {
                setLoggedInTeacher(teacher.fullName);
                setIsAdmin(false);
                setView('teacher_dash');
                setUsernameInput('');
                setPasswordInput('');
                localStorage.setItem('teacher_session', JSON.stringify({ name: teacher.fullName, isAdmin: false }));
            } else {
                setLoginError(true);
            }
        } catch (error) {
            console.error("Login error:", error);
            setLoginError(true);
        }
    };

    // --- VIEWS ---

    if (view === 'teacher_dash') {
        return (
            <>
                <TeacherDashboard
                    onLogout={() => {
                        setView('home');
                        setLoggedInTeacher(null);
                        setIsAdmin(false);
                        localStorage.removeItem('teacher_session');
                    }}
                    isAdmin={isAdmin}
                    quizzes={quizzes}
                    results={results}
                    onSaveQuiz={saveQuizToStorage}
                    onUpdateQuiz={updateQuizInStorage}
                    onRefreshResults={loadResults}
                />
                <Analytics />
            </>
        );
    }

    if (view === 'student' && activeQuiz) {
        return (
            <>
                <StudentView
                    quiz={activeQuiz}
                    onExit={() => { setActiveQuiz(null); setView('home'); }}
                    onSaveResult={saveResultToStorage}
                />
                <Analytics />
            </>
        );
    }

    // Home Screen
    return (
        <div
            className="min-h-screen flex flex-col items-center justify-center p-6 relative overflow-hidden bg-cover bg-center bg-no-repeat bg-fixed"
            style={{ backgroundImage: "url('/background.jpg')" }}
        >
            {/* Overlay for better text readability if needed, though cards have white bg */}
            <div className="absolute inset-0 bg-white/30 backdrop-blur-[2px] z-0"></div>

            {view === 'teacher_login' && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in">
                    <div className="glass bg-white/90 rounded-3xl p-8 max-w-sm w-full shadow-2xl animate-scale-in border border-white/50">
                        <div className="text-center mb-8">
                            <div className="w-20 h-20 rounded-2xl gradient-primary flex items-center justify-center mx-auto mb-4 shadow-lg">
                                <Lock className="w-10 h-10 text-white" />
                            </div>
                            <h3 className="text-2xl font-bold text-gray-800">Đăng nhập Giáo viên</h3>
                            <p className="text-gray-500 text-sm mt-1">Nhập thông tin để truy cập</p>
                        </div>
                        <div className="space-y-4">
                            <div className="relative">
                                <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">
                                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                                    </svg>
                                </div>
                                <input
                                    type="text"
                                    value={usernameInput}
                                    onChange={e => setUsernameInput(e.target.value)}
                                    className="w-full pl-12 pr-4 py-3.5 border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:ring-4 focus:ring-blue-100 outline-none transition-all bg-white/80"
                                    placeholder="Tên đăng nhập..."
                                    autoFocus
                                />
                            </div>
                            <div className="relative">
                                <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">
                                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                                    </svg>
                                </div>
                                <input
                                    type="password"
                                    value={passwordInput}
                                    onChange={e => setPasswordInput(e.target.value)}
                                    className="w-full pl-12 pr-4 py-3.5 border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:ring-4 focus:ring-blue-100 outline-none transition-all bg-white/80"
                                    placeholder="Mật khẩu..."
                                    onKeyDown={(e) => e.key === 'Enter' && handleTeacherLogin()}
                                />
                            </div>
                        </div>
                        {loginError && (
                            <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-xl flex items-center gap-2 text-red-600 text-sm animate-slide-down">
                                <svg className="w-5 h-5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                                </svg>
                                Tên đăng nhập hoặc mật khẩu không đúng!
                            </div>
                        )}
                        <div className="flex gap-3 mt-6">
                            <button
                                onClick={() => setView('home')}
                                className="flex-1 py-3 text-gray-600 font-semibold hover:bg-gray-100 rounded-xl transition-all border-2 border-gray-200 hover:border-gray-300"
                            >
                                Hủy
                            </button>
                            <button
                                onClick={handleTeacherLogin}
                                className="flex-1 py-3 btn-primary rounded-xl font-semibold"
                            >
                                Đăng nhập
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <div className="z-10 text-center max-w-4xl w-full animate-fade-in">
                <div className="mb-8 animate-slide-down">
                    <h1 className="text-4xl md:text-5xl font-extrabold text-orange-600 mb-2 drop-shadow-lg">{SCHOOL_NAME}</h1>
                    <p className="glass text-orange-600 font-bold text-xl px-8 py-3 rounded-full shadow-lg inline-block mt-2">
                        ✨ Học mà chơi - Chơi mà học ✨
                    </p>
                </div>

                <div className="max-w-3xl mx-auto mb-12">
                    {/* Available Quizzes Section */}
                    <div className="glass bg-white/80 p-8 rounded-3xl shadow-2xl animate-slide-up">
                        <div className="flex items-center justify-center mb-6">
                            <div className="w-20 h-20 rounded-2xl gradient-success flex items-center justify-center shadow-lg">
                                <BookOpen className="w-10 h-10 text-white" />
                            </div>
                        </div>
                        <div className="flex items-center justify-between mb-6">
                            <h2 className="text-2xl md:text-3xl font-bold text-gray-800">
                                {selectedClassLevel ? `📚 Bài kiểm tra Lớp ${selectedClassLevel}` : '📋 Danh sách bài kiểm tra'}
                            </h2>
                            <div className="flex gap-2">
                                {selectedClassLevel && (
                                    <button
                                        onClick={() => setSelectedClassLevel(null)}
                                        className="px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-xl text-sm font-semibold text-gray-600 transition-all hover:shadow-md border border-gray-200"
                                    >
                                        ← Quay lại
                                    </button>
                                )}
                                <button
                                    onClick={loadData}
                                    className="p-2.5 hover:bg-gray-100 rounded-xl transition-all hover:shadow-md border border-gray-200 group"
                                    title="Làm mới dữ liệu"
                                >
                                    <RefreshCw className={`w-5 h-5 text-gray-500 group-hover:text-blue-600 ${isLoading ? 'animate-spin' : ''}`} />
                                </button>
                            </div>
                        </div>

                        <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-2 custom-scrollbar">
                            {!selectedClassLevel ? (
                                // Class Level Selection
                                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                                    {['1', '2', '3', '4', '5'].map((level, index) => (
                                        <button
                                            key={level}
                                            onClick={() => setSelectedClassLevel(level)}
                                            className="relative p-6 rounded-2xl bg-gradient-to-br from-green-50 to-emerald-100 hover:from-green-100 hover:to-emerald-200 border-2 border-green-200 hover:border-green-400 text-green-800 font-bold text-xl transition-all hover:shadow-xl hover:-translate-y-1 flex flex-col items-center group overflow-hidden"
                                            style={{ animationDelay: `${index * 100}ms` }}
                                        >
                                            <div className="absolute inset-0 bg-gradient-to-br from-white/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                                            <span className="text-3xl mb-1 group-hover:scale-125 transition-transform">📖</span>
                                            <span className="relative group-hover:scale-105 transition-transform">Lớp {level}</span>
                                            <span className="text-sm font-medium text-green-600/70 mt-1 bg-white/50 px-3 py-0.5 rounded-full">
                                                {quizzes.filter(q => q.classLevel === level).length} đề thi
                                            </span>
                                        </button>
                                    ))}
                                    {/* Teacher Login Button in Grid */}
                                    <button
                                        onClick={() => setView('teacher_login')}
                                        className="p-6 rounded-2xl bg-gradient-to-br from-slate-50 to-blue-50 border-2 border-dashed border-gray-300 hover:border-blue-400 hover:from-blue-50 hover:to-indigo-100 text-gray-500 hover:text-blue-600 font-bold text-lg transition-all hover:shadow-xl hover:-translate-y-1 flex flex-col items-center justify-center group"
                                    >
                                        <KeyRound className="w-8 h-8 mb-2 group-hover:scale-125 transition-transform text-gray-400 group-hover:text-blue-500" />
                                        <span>Giáo viên</span>
                                    </button>
                                </div>
                            ) : (
                                // Quiz List for Selected Level
                                <>
                                    {quizzes.filter(q => q.classLevel === selectedClassLevel).length === 0 ? (
                                        <div className="text-center py-16 bg-gradient-to-br from-gray-50 to-slate-100 rounded-2xl border-2 border-dashed border-gray-300">
                                            <div className="text-6xl mb-4">📭</div>
                                            <p className="text-gray-400 text-lg">Chưa có bài kiểm tra nào cho Lớp {selectedClassLevel}.</p>
                                        </div>
                                    ) : (
                                        <div className="grid grid-cols-1 gap-3">
                                            {quizzes
                                                .filter(q => q.classLevel === selectedClassLevel)
                                                .map((q, index) => (
                                                    <button
                                                        key={q.id}
                                                        onClick={() => { setActiveQuiz(q); setView('student'); }}
                                                        className="w-full text-left p-5 rounded-2xl bg-gradient-to-r from-green-50 to-emerald-50 hover:from-green-100 hover:to-emerald-100 transition-all border-2 border-green-100 hover:border-green-300 group shadow-sm hover:shadow-lg animate-slide-up"
                                                        style={{ animationDelay: `${index * 50}ms` }}
                                                    >
                                                        <div className="flex justify-between items-center">
                                                            <span className="font-bold text-lg text-green-800 group-hover:text-green-900 line-clamp-1 flex items-center gap-2">
                                                                {q.requireCode && <span className="text-amber-500" title="Yêu cầu mật khẩu">🔒</span>}
                                                                {q.title}
                                                            </span>
                                                            <span className="bg-gradient-to-r from-green-500 to-emerald-500 px-4 py-1.5 rounded-full text-xs font-bold text-white shadow-md group-hover:shadow-lg group-hover:scale-105 transition-all">
                                                                Bắt đầu →
                                                            </span>
                                                        </div>
                                                        <div className="flex items-center gap-4 mt-3 text-sm text-gray-500">
                                                            <span className="flex items-center gap-1">
                                                                <span>📝</span> {q.questions.length} câu hỏi
                                                            </span>
                                                            <span className="flex items-center gap-1">
                                                                <span>⏱️</span> {q.timeLimit} phút
                                                            </span>
                                                        </div>
                                                    </button>
                                                ))}
                                        </div>
                                    )}
                                </>
                            )}
                        </div>
                        {/* Copyright Footer */}
                        <p className="text-center text-gray-400 text-sm mt-8 pt-6 border-t border-gray-100">
                            © 2025 Trường Tiểu học Ít Ong. Developed by Tòng Minh Khánh.
                        </p>
                    </div>
                </div>
            </div>
            <Analytics />
        </div>

    );
};

export default App;