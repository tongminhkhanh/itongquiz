
import React, { useState, useEffect } from 'react';
import StudentView from './components/StudentView';
import TeacherDashboard from './components/TeacherDashboard';
import { Quiz, StudentResult, QuestionType } from './types';
import { SCHOOL_NAME } from './constants';
import { BookOpen, GraduationCap, Lock, KeyRound, RefreshCw } from 'lucide-react';
import { fetchQuizzesFromSheets, fetchTeachersFromSheets, saveQuizToSheet, saveResultToSheet } from './googleSheetService';

// --- CONFIGURATION ---
// Replace these with your actual Google Sheet ID and GIDs
const GOOGLE_SHEET_ID = '1mrqbJ3Xzj4CBF_B2vyI7-ANLaVPAfWCe_TdmCd9_gx4'; // User needs to update this
const QUIZ_GID = '0'; // Default first sheet
const QUESTION_GID = '1395660327'; // User needs to update this
const TEACHER_GID = '1482913865'; // User needs to update this
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

    // --- PERSISTENCE (MOCK DB) ---
    useEffect(() => {
        loadData();
        const savedResults = localStorage.getItem('itong_results');
        if (savedResults) setResults(JSON.parse(savedResults));
    }, []);

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
            if ((usernameInput === 'admin' && passwordInput === 'admin') || (usernameInput === 'gv_lan' && passwordInput === '123456')) {
                setLoggedInTeacher('Admin User');
                setView('teacher_dash');
                setUsernameInput('');
                setPasswordInput('');
                localStorage.setItem('teacher_session', JSON.stringify({ name: 'Admin User' }));
                return;
            }

            const teachers = await fetchTeachersFromSheets(GOOGLE_SHEET_ID, TEACHER_GID);
            const teacher = teachers.find(t => t.username === usernameInput && t.password === passwordInput);

            if (teacher) {
                setLoggedInTeacher(teacher.fullName);
                setView('teacher_dash');
                setUsernameInput('');
                setPasswordInput('');
                localStorage.setItem('teacher_session', JSON.stringify({ name: teacher.fullName }));
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
            <TeacherDashboard
                onLogout={() => {
                    setView('home');
                    setLoggedInTeacher(null);
                    localStorage.removeItem('teacher_session');
                }}
                quizzes={quizzes}
                results={results}
                onSaveQuiz={saveQuizToStorage}
            />
        );
    }

    if (view === 'student' && activeQuiz) {
        return (
            <StudentView
                quiz={activeQuiz}
                onExit={() => { setActiveQuiz(null); setView('home'); }}
                onSaveResult={saveResultToStorage}
            />
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
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
                    <div className="bg-white rounded-2xl p-8 max-w-sm w-full shadow-2xl">
                        <div className="text-center mb-6">
                            <div className="bg-blue-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                                <Lock className="w-8 h-8 text-blue-600" />
                            </div>
                            <h3 className="text-xl font-bold text-gray-800">Truy cập khóa giáo viên</h3>
                        </div>
                        <input
                            type="text"
                            value={usernameInput}
                            onChange={e => setUsernameInput(e.target.value)}
                            className="w-full p-3 border border-gray-300 rounded-lg mb-2 focus:ring-2 focus:ring-blue-500 outline-none"
                            placeholder="Tên đăng nhập..."
                            autoFocus
                        />
                        <input
                            type="password"
                            value={passwordInput}
                            onChange={e => setPasswordInput(e.target.value)}
                            className="w-full p-3 border border-gray-300 rounded-lg mb-4 focus:ring-2 focus:ring-blue-500 outline-none"
                            placeholder="Mật khẩu..."
                            onKeyDown={(e) => e.key === 'Enter' && handleTeacherLogin()}
                        />
                        {loginError && <p className="text-red-500 text-sm mb-4 text-center">Tên đăng nhập hoặc mật khẩu không đúng!</p>}
                        <div className="flex gap-3">
                            <button onClick={() => setView('home')} className="flex-1 py-2 text-gray-600 font-bold hover:bg-gray-100 rounded-lg">Hủy</button>
                            <button onClick={handleTeacherLogin} className="flex-1 py-2 bg-blue-600 text-white font-bold rounded-lg hover:bg-blue-700">Đăng nhập</button>
                        </div>
                    </div>
                </div>
            )}

            <div className="z-10 text-center max-w-4xl w-full">
                <div className="mb-8">
                    <h1 className="text-4xl md:text-5xl font-extrabold text-orange-600 mb-2 drop-shadow-sm">{SCHOOL_NAME}</h1>
                    <p className="text-orange-600 font-bold text-xl bg-white/90 px-6 py-2 rounded-full shadow-md inline-block mt-2 backdrop-blur-sm">
                        Học mà chơi - Chơi mà học
                    </p>
                </div>

                <div className="max-w-3xl mx-auto mb-12">
                    {/* Available Quizzes Section */}
                    <div className="bg-white p-8 rounded-3xl shadow-xl border-t-8 border-green-400 transform transition hover:-translate-y-1">
                        <div className="flex items-center justify-center mb-6">
                            <BookOpen className="w-16 h-16 text-green-500" />
                        </div>
                        <div className="flex items-center justify-between mb-6">
                            <h2 className="text-3xl font-bold text-gray-800">
                                {selectedClassLevel ? `Bài kiểm tra Lớp ${selectedClassLevel}` : 'Danh sách bài kiểm tra'}
                            </h2>
                            <div className="flex gap-2">
                                {selectedClassLevel && (
                                    <button
                                        onClick={() => setSelectedClassLevel(null)}
                                        className="px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg text-sm font-bold text-gray-600 transition-colors"
                                    >
                                        Quay lại
                                    </button>
                                )}
                                <button onClick={loadData} className="p-2 hover:bg-gray-100 rounded-full transition-colors" title="Làm mới dữ liệu">
                                    <RefreshCw className={`w-6 h-6 text-gray-500 ${isLoading ? 'animate-spin' : ''}`} />
                                </button>
                            </div>
                        </div>

                        <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-2 custom-scrollbar">
                            {!selectedClassLevel ? (
                                // Class Level Selection
                                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                                    {['1', '2', '3', '4', '5'].map(level => (
                                        <button
                                            key={level}
                                            onClick={() => setSelectedClassLevel(level)}
                                            className="p-6 rounded-2xl bg-green-50 hover:bg-green-100 border-2 border-green-100 hover:border-green-300 text-green-800 font-bold text-xl transition-all hover:shadow-lg flex flex-col items-center group"
                                        >
                                            <span className="group-hover:scale-110 transition-transform">Lớp {level}</span>
                                            <span className="text-sm font-normal text-gray-500 mt-2">
                                                {quizzes.filter(q => q.classLevel === level).length} đề thi
                                            </span>
                                        </button>
                                    ))}
                                    {/* Teacher Login Button in Grid */}
                                    <button
                                        onClick={() => setView('teacher_login')}
                                        className="p-6 rounded-2xl bg-white border-2 border-dashed border-gray-300 hover:border-blue-400 hover:bg-blue-50 text-gray-500 hover:text-blue-600 font-bold text-lg transition-all hover:shadow-lg flex flex-col items-center justify-center group"
                                    >
                                        <KeyRound className="w-8 h-8 mb-2 group-hover:scale-110 transition-transform" />
                                        <span>Giáo viên</span>
                                    </button>
                                </div>
                            ) : (
                                // Quiz List for Selected Level
                                <>
                                    {quizzes.filter(q => q.classLevel === selectedClassLevel).length === 0 ? (
                                        <div className="text-center py-12 bg-gray-50 rounded-xl border border-dashed border-gray-300">
                                            <p className="text-gray-400 italic text-lg">Chưa có bài kiểm tra nào cho Lớp {selectedClassLevel}.</p>
                                        </div>
                                    ) : (
                                        <div className="grid grid-cols-1 gap-3">
                                            {quizzes
                                                .filter(q => q.classLevel === selectedClassLevel)
                                                .map(q => (
                                                    <button
                                                        key={q.id}
                                                        onClick={() => { setActiveQuiz(q); setView('student'); }}
                                                        className="w-full text-left p-4 rounded-xl bg-green-50 hover:bg-green-100 transition-colors border border-green-100 hover:border-green-300 group shadow-sm hover:shadow-md"
                                                    >
                                                        <div className="flex justify-between items-center">
                                                            <span className="font-bold text-lg text-green-800 group-hover:text-green-900 line-clamp-1">{q.title}</span>
                                                            <span className="bg-white px-3 py-1 rounded-full text-xs font-bold text-green-600 shadow-sm border border-green-100">
                                                                Bắt đầu
                                                            </span>
                                                        </div>
                                                        <div className="flex items-center gap-4 mt-2 text-sm text-gray-500">
                                                            <span>📝 {q.questions.length} câu hỏi</span>
                                                            <span>⏱️ {q.timeLimit} phút</span>
                                                        </div>
                                                    </button>
                                                ))}
                                        </div>
                                    )}
                                </>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>

    );
};

export default App;