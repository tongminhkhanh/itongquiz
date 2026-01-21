import React, { useState, useEffect, Suspense } from 'react';
import { Analytics } from '@vercel/analytics/react';
import { Quiz, QuestionType } from './src/types';
import { SCHOOL_NAME, GOOGLE_SHEET_ID, TEACHER_GID, QUIZ_CATEGORIES } from './src/config/constants';
import { GraduationCap, Lock, KeyRound, RefreshCw, Loader2 } from 'lucide-react';
import { fetchTeachersFromSheets } from './src/services/googleSheetService';
import { fetchIoeQuizzes, saveIoeResult } from './src/services/ioeSheetService';
import { useAuthStore } from './stores/authStore';
import { useQuizStore } from './stores/quizStore';

// Lazy load main views
const StudentView = React.lazy(() => import('./src/components/StudentView'));
const IoeStudentView = React.lazy(() => import('./src/components/IoeStudentView'));
import { CategorySelector } from './src/components/CategorySelector';
import { QuizListByCategory } from './src/components/QuizListByCategory';
const TeacherDashboard = React.lazy(() => import('./src/components/TeacherDashboard'));

const App: React.FC = () => {
    // --- STORES ---
    const authStore = useAuthStore();
    const quizStore = useQuizStore();

    // --- LOCAL UI STATE ---
    // Keep login form state local as it's transient
    const [usernameInput, setUsernameInput] = useState('');
    const [passwordInput, setPasswordInput] = useState('');
    const [showWelcome, setShowWelcome] = useState(false);
    const [welcomeName, setWelcomeName] = useState('');
    const [activeTab, setActiveTab] = useState<'class' | 'trang-nguyen' | 'vioedu' | 'ioe'>('class');

    // IOE Separate System State
    const [ioeQuizzes, setIoeQuizzes] = useState<Quiz[]>([]);
    const [ioeLoading, setIoeLoading] = useState(false);

    // --- INITIALIZATION ---
    useEffect(() => {
        // Load data on mount
        quizStore.loadQuizzes();
        quizStore.loadResults();

        // Check URL for quizId - if it's an IOE quiz, load IOE quizzes
        const params = new URLSearchParams(window.location.search);
        const quizId = params.get('quizId') || params.get('quiz');
        if (quizId && quizId.startsWith('ioe-')) {
            // Load IOE quizzes for deep linking
            setIoeLoading(true);
            fetchIoeQuizzes()
                .then(quizzes => {
                    setIoeQuizzes(quizzes);
                    console.log('[IOE] Loaded', quizzes.length, 'quizzes for deep link');
                })
                .catch(err => console.error('[IOE] Load error:', err))
                .finally(() => setIoeLoading(false));
        }
    }, []);

    // Load IOE quizzes when IOE tab is active
    useEffect(() => {
        const loadIoeData = async () => {
            if (activeTab === 'ioe' && !ioeLoading) {
                setIoeLoading(true);
                try {
                    const quizzes = await fetchIoeQuizzes();
                    setIoeQuizzes(quizzes);
                    console.log('[IOE] Loaded', quizzes.length, 'quizzes');
                } catch (err) {
                    console.error('[IOE] Load error:', err);
                } finally {
                    setIoeLoading(false);
                }
            }
        };
        loadIoeData();
    }, [activeTab]);

    // Effect to handle deep linking once quizzes are loaded
    useEffect(() => {
        const params = new URLSearchParams(window.location.search);
        const quizId = params.get('quizId') || params.get('quiz');
        if (quizId && !quizStore.selectedQuiz) {
            // First check main quizzes
            let foundQuiz = quizStore.quizzes.find(q => q.id === quizId);

            // If not found in main, check IOE quizzes
            if (!foundQuiz && ioeQuizzes.length > 0) {
                foundQuiz = ioeQuizzes.find(q => q.id === quizId);
            }

            if (foundQuiz) {
                quizStore.selectQuiz(foundQuiz);
                quizStore.setView('student');
            }
        }
    }, [quizStore.quizzes, ioeQuizzes]);

    // --- HANDLERS ---
    const handleTeacherLogin = async () => {
        authStore.resetError();
        if (!usernameInput || !passwordInput) {
            // We can use the store's error state or just set it manually if we had a specific "empty input" error
            // For now, let's just trigger failure
            authStore.loginFailure();
            return;
        }

        authStore.loginStart();
        try {
            // Fallback login for development
            if (usernameInput === 'admin' && passwordInput === 'admin') {
                authStore.loginSuccess('admin', 'Admin', true, null); // Pass username 'admin'
                setWelcomeName('Admin');
                quizStore.setView('home'); // Close login modal
                setShowWelcome(true);
                setUsernameInput('');
                setPasswordInput('');
                return;
            }

            const teachers = await fetchTeachersFromSheets(GOOGLE_SHEET_ID, TEACHER_GID);
            const teacher = teachers.find(t => t.username === usernameInput && t.password === passwordInput);

            if (teacher) {
                authStore.loginSuccess(teacher.username, teacher.fullName, teacher.role === 'admin', teacher.class); // Pass actual username
                setWelcomeName(teacher.fullName);
                quizStore.setView('home'); // Close login modal
                setShowWelcome(true);
                setUsernameInput('');
                setPasswordInput('');
            } else {
                authStore.loginFailure();
            }
        } catch (error) {
            console.error("Login error:", error);
            authStore.loginFailure();
        }
    };

    // --- VIEWS ---

    if (quizStore.view === 'teacher_dash') {
        return (
            <>
                <Suspense fallback={
                    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-orange-50 via-white to-amber-50">
                        <div className="flex flex-col items-center gap-4">
                            <Loader2 className="w-12 h-12 text-orange-500 animate-spin" />
                            <p className="text-gray-500 font-medium">Đang tải trang quản lý...</p>
                        </div>
                    </div>
                }>
                    <TeacherDashboard />
                </Suspense>
                <Analytics />
            </>
        );
    }

    if (quizStore.view === 'student' && quizStore.selectedQuiz) {
        const isIoeQuiz = quizStore.selectedQuiz.category === 'ioe';

        return (
            <>
                <Suspense fallback={
                    <div className={`min-h-screen flex items-center justify-center ${isIoeQuiz ? 'bg-[#1a3a5c]' : 'bg-white'}`}>
                        <div className="flex flex-col items-center gap-4">
                            <Loader2 className={`w-12 h-12 animate-spin ${isIoeQuiz ? 'text-[#c9a227]' : 'text-green-500'}`} />
                            <p className={`font-medium ${isIoeQuiz ? 'text-white' : 'text-gray-500'}`}>
                                {isIoeQuiz ? 'Loading IOE Quiz...' : 'Đang tải bài kiểm tra...'}
                            </p>
                        </div>
                    </div>
                }>
                    {isIoeQuiz ? (
                        <IoeStudentView
                            quiz={quizStore.selectedQuiz}
                            onExit={() => { quizStore.selectQuiz(null); quizStore.setView('home'); }}
                            onSaveResult={saveIoeResult}
                        />
                    ) : (
                        <StudentView
                            quiz={quizStore.selectedQuiz}
                            onExit={() => { quizStore.selectQuiz(null); quizStore.setView('home'); }}
                            onSaveResult={quizStore.submitResult}
                        />
                    )}
                </Suspense>
                <Analytics />
            </>
        );
    }

    // Home Screen
    return (
        <div
            className="min-h-screen flex flex-col items-center justify-center p-4 md:p-6 relative overflow-hidden bg-cover bg-center bg-no-repeat bg-fixed"
            style={{ backgroundImage: "url('/background.jpg')" }}
        >
            {/* Overlay */}
            <div className="absolute inset-0 bg-gradient-to-br from-orange-50/70 via-white/50 to-green-50/70 backdrop-blur-[1px] z-0"></div>

            {/* Welcome Modal */}
            {showWelcome && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in">
                    <div className="glass bg-white/95 rounded-3xl p-8 max-w-md w-full shadow-2xl animate-scale-in border border-white/50 text-center">
                        <div className="w-20 h-20 rounded-full bg-gradient-to-br from-green-400 to-emerald-500 flex items-center justify-center mx-auto mb-6 shadow-lg">
                            <svg className="w-10 h-10 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                            </svg>
                        </div>
                        <h2 className="text-2xl font-bold text-gray-800 mb-2">Xin chào!</h2>
                        <p className="text-2xl font-bold text-emerald-600 mb-4">{welcomeName}</p>
                        <p className="text-gray-600 mb-6">Chúc thầy cô một ngày mới vui vẻ và yêu đời!</p>
                        <button
                            onClick={() => { setShowWelcome(false); quizStore.setView('teacher_dash'); }}
                            className="w-full py-3 btn-primary rounded-xl font-semibold flex items-center justify-center gap-2"
                        >
                            Vào Trang Quản Lý
                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                            </svg>
                        </button>
                    </div>
                </div>
            )}

            {/* Login Modal */}
            {quizStore.view === 'teacher_login' && (
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
                        {authStore.loginError && (
                            <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-xl flex items-center gap-2 text-red-600 text-sm animate-slide-down">
                                <svg className="w-5 h-5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                                </svg>
                                Tên đăng nhập hoặc mật khẩu không đúng!
                            </div>
                        )}
                        <div className="flex gap-3 mt-6">
                            <button
                                onClick={() => quizStore.setView('home')}
                                className="flex-1 py-3 text-gray-600 font-semibold hover:bg-gray-100 rounded-xl transition-all border-2 border-gray-200 hover:border-gray-300"
                                disabled={authStore.isLoggingIn}
                            >
                                Hủy
                            </button>
                            <button
                                onClick={handleTeacherLogin}
                                className="flex-1 py-3 btn-primary rounded-xl font-semibold flex items-center justify-center gap-2"
                                disabled={authStore.isLoggingIn}
                            >
                                {authStore.isLoggingIn ? (
                                    <>
                                        <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                        </svg>
                                        Đang đăng nhập...
                                    </>
                                ) : (
                                    'Đăng nhập'
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            )}



            {/* Main Container - Two Column Layout */}
            <div className="z-10 w-full max-w-5xl mx-auto animate-fade-in">
                <div className="flex flex-col lg:flex-row gap-6">

                    {/* Left Panel - Quiz Selection */}
                    <div className="flex-1 bg-white/95 backdrop-blur-md rounded-3xl shadow-2xl border border-white/50 overflow-hidden">
                        {/* Header */}
                        <div className="bg-gradient-to-r from-emerald-500 to-green-500 p-6 text-white">
                            <div className="flex items-center gap-4">
                                <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center p-1">
                                    <img src="/school-logo.png" alt="Logo" className="w-14 h-14 object-contain" />
                                </div>
                                <div>
                                    <span className="text-xs bg-white/20 px-2 py-0.5 rounded-full">CỔNG THÔNG TIN HỌC TẬP</span>
                                    <h1 className="text-lg md:text-xl font-bold mt-1">Hệ thống ôn tập và kiểm tra trực tuyến</h1>
                                </div>
                            </div>
                        </div>

                        {/* Tabs */}
                        <div className="px-6 pt-4">
                            <div className="flex gap-2 overflow-x-auto pb-2">
                                <button
                                    onClick={() => { setActiveTab('class'); quizStore.setClassLevel(null); }}
                                    className={`px-4 py-2 rounded-lg text-sm font-semibold whitespace-nowrap transition-all flex items-center gap-2 ${activeTab === 'class'
                                        ? 'bg-gradient-to-r from-emerald-500 to-green-500 text-white shadow-md'
                                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                                        }`}
                                >
                                    📚 Lớp học
                                </button>
                                <button
                                    onClick={() => { setActiveTab('trang-nguyen'); quizStore.setClassLevel(null); }}
                                    className={`px-3 py-2 rounded-lg text-sm font-semibold whitespace-nowrap transition-all flex items-center gap-2 ${activeTab === 'trang-nguyen'
                                        ? 'bg-gradient-to-r from-red-400 to-pink-500 text-white shadow-md'
                                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                                        }`}
                                >
                                    <img src="/trang-nguyen-logo.png" alt="Trạng Nguyên" className="h-6 w-auto object-contain" />
                                    Trạng Nguyên
                                </button>
                                <button
                                    onClick={() => { setActiveTab('ioe'); quizStore.setClassLevel(null); }}
                                    className={`px-3 py-2 rounded-lg text-sm font-semibold whitespace-nowrap transition-all flex items-center gap-2 ${activeTab === 'ioe'
                                        ? 'bg-gradient-to-r from-sky-400 to-blue-500 text-white shadow-md'
                                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                                        }`}
                                >
                                    <img src="/ioe-logo.png" alt="IOE" className="h-6 w-6 object-contain" />
                                    IOE
                                </button>
                                <button
                                    onClick={() => { setActiveTab('vioedu'); quizStore.setClassLevel(null); }}
                                    className={`px-3 py-2 rounded-lg text-sm font-semibold whitespace-nowrap transition-all flex items-center gap-2 ${activeTab === 'vioedu'
                                        ? 'bg-gradient-to-r from-green-500 to-emerald-600 text-white shadow-md'
                                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                                        }`}
                                >
                                    <img src="/vioedu-logo-new.png" alt="VioEdu" className="h-6 w-6 object-contain" />
                                    VioEdu
                                </button>
                            </div>
                        </div>

                        {/* Content */}
                        <div className="px-6 pb-6">
                            {!quizStore.selectedClassLevel ? (
                                <>
                                    {/* Class Level Header */}
                                    <div className="mb-4 mt-4">
                                        <p className="text-gray-800 font-bold text-lg">Chọn khối lớp</p>
                                    </div>

                                    {/* Class Level Buttons */}
                                    <div className="flex justify-between gap-2 py-4">
                                        {['1', '2', '3', '4', '5'].map((level) => {
                                            let quizCount = 0;
                                            if (activeTab === 'class') {
                                                quizCount = quizStore.quizzes.filter(q => q.classLevel === level).length;
                                            } else if (activeTab === 'trang-nguyen') {
                                                quizCount = quizStore.quizzes.filter(q => q.classLevel === level && q.category === 'trang-nguyen').length;
                                            } else if (activeTab === 'ioe') {
                                                // Use IOE separate system quizzes
                                                quizCount = ioeQuizzes.filter(q => q.classLevel === level).length;
                                            } else if (activeTab === 'vioedu') {
                                                quizCount = quizStore.quizzes.filter(q => q.classLevel === level && q.category === 'vioedu').length;
                                            }

                                            const colorClass = level === '1' ? 'bg-emerald-500' :
                                                level === '2' ? 'bg-orange-500' :
                                                    level === '3' ? 'bg-teal-500' :
                                                        level === '4' ? 'bg-sky-500' : 'bg-green-600';

                                            return (
                                                <button
                                                    key={level}
                                                    onClick={() => quizStore.setClassLevel(level)}
                                                    className="group flex flex-col items-center transition-all hover:-translate-y-1"
                                                >
                                                    <div className="relative">
                                                        <div className={`w-14 h-14 md:w-16 md:h-16 rounded-xl ${colorClass} flex items-center justify-center shadow-lg group-hover:shadow-xl group-hover:scale-105 transition-all`}>
                                                            <span className="text-white text-2xl font-bold">{level}</span>
                                                        </div>
                                                        {quizCount > 0 && (
                                                            <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center font-bold">
                                                                {quizCount}
                                                            </span>
                                                        )}
                                                    </div>
                                                    <span className="text-gray-600 text-sm mt-2 font-medium">Lớp {level}</span>
                                                </button>
                                            );
                                        })}
                                    </div>

                                    {/* Resources Footer */}
                                    <div className="border-t pt-4 mt-4">
                                        <p className="text-xs text-gray-400 uppercase tracking-wider text-center mb-3">Tài nguyên học tập</p>
                                        <div className="flex justify-center gap-6">
                                            <a href="https://csdl.moet.gov.vn" target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-gray-600 hover:text-gray-800 text-sm">
                                                <img src="/csdl-logo.png" alt="CSDL" className="w-6 h-6 object-contain" />
                                                CSDL Bộ GD&ĐT
                                            </a>
                                            <a href="https://vnedu.vn" target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-gray-600 hover:text-gray-800 text-sm">
                                                <img src="/vnedu-logo-new2.png" alt="VnEdu" className="w-6 h-6 object-contain" />
                                                VnEdu Network
                                            </a>
                                        </div>
                                    </div>
                                </>
                            ) : (
                                (() => {
                                    const categoryFilter = activeTab === 'class' ? null : activeTab;
                                    // For IOE tab, use separate IOE quizzes state
                                    let filteredQuizzes: Quiz[];
                                    if (activeTab === 'ioe') {
                                        filteredQuizzes = ioeQuizzes.filter(q => q.classLevel === quizStore.selectedClassLevel);
                                    } else {
                                        filteredQuizzes = quizStore.quizzes.filter(q => {
                                            const matchClass = q.classLevel === quizStore.selectedClassLevel;
                                            if (categoryFilter === null) return matchClass;
                                            return matchClass && q.category === categoryFilter;
                                        });
                                    }

                                    const categoryName = activeTab === 'class' ? 'Tất cả bài kiểm tra'
                                        : activeTab === 'trang-nguyen' ? 'Trạng Nguyên Tiếng Việt'
                                            : activeTab === 'ioe' ? 'IOE - Olympic Tiếng Anh' : 'VioEdu';

                                    return (
                                        <>
                                            <div className="flex items-center justify-between mb-4 mt-4">
                                                <div>
                                                    <h3 className="text-lg font-bold text-gray-800">{categoryName}</h3>
                                                    <p className="text-xs text-gray-500">Lớp {quizStore.selectedClassLevel}</p>
                                                </div>
                                                <button
                                                    onClick={() => quizStore.setClassLevel(null)}
                                                    className="px-3 py-1.5 bg-gray-100 hover:bg-gray-200 rounded-lg text-sm font-medium text-gray-600 transition-all"
                                                >
                                                    ← Quay lại
                                                </button>
                                            </div>
                                            <div className="space-y-3 max-h-[40vh] overflow-y-auto pr-2 custom-scrollbar">
                                                {filteredQuizzes.length === 0 ? (
                                                    <div className="text-center py-12 bg-gray-50 rounded-2xl border-2 border-dashed border-gray-200">
                                                        <div className="text-5xl mb-3 text-gray-300">∅</div>
                                                        <p className="text-gray-400">Chưa có bài kiểm tra nào.</p>
                                                    </div>
                                                ) : (
                                                    filteredQuizzes.map((q, index) => (
                                                        <button
                                                            key={q.id}
                                                            onClick={() => { quizStore.selectQuiz(q); quizStore.setView('student'); }}
                                                            className="w-full text-left p-4 rounded-xl bg-gradient-to-r from-green-50 to-emerald-50 hover:from-green-100 hover:to-emerald-100 transition-all border border-green-100 hover:border-green-300 group shadow-sm hover:shadow-md"
                                                        >
                                                            <div className="flex justify-between items-center">
                                                                <span className="font-bold text-green-800 flex items-center gap-2">
                                                                    {q.requireCode && <Lock className="w-4 h-4 text-amber-500" />}
                                                                    {q.title}
                                                                </span>
                                                                <span className="bg-gradient-to-r from-green-500 to-emerald-500 px-3 py-1 rounded-full text-xs font-bold text-white">
                                                                    Bắt đầu →
                                                                </span>
                                                            </div>
                                                            <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
                                                                <span>{q.questions.length} câu hỏi</span>
                                                                <span>{q.timeLimit} phút</span>
                                                            </div>
                                                        </button>
                                                    ))
                                                )}
                                            </div>
                                        </>
                                    );
                                })()
                            )}
                        </div>
                    </div>

                    {/* Right Panel - Teacher Area */}
                    <div className="w-full lg:w-80 space-y-4">
                        {/* Teacher Header */}
                        <div className="bg-white/95 backdrop-blur-md rounded-2xl shadow-xl border border-white/50 p-5">
                            <div className="flex items-center gap-3 mb-4">
                                <div className="w-10 h-10 bg-gradient-to-br from-orange-400 to-amber-500 rounded-xl flex items-center justify-center">
                                    <KeyRound className="w-5 h-5 text-white" />
                                </div>
                                <h3 className="font-bold text-gray-800">Dành cho Giáo viên</h3>
                            </div>

                            {/* Dashboard Preview */}
                            <div className="bg-gray-50 rounded-xl p-4 mb-4">
                                <p className="text-xs text-gray-400 uppercase tracking-wider mb-2">DASHBOARD</p>
                                <h4 className="font-bold text-gray-800 mb-1">Bảng điều khiển</h4>
                                <p className="text-xs text-gray-500">Quản lý lớp học, theo dõi tiến độ học sinh và xem báo cáo chi tiết.</p>
                            </div>

                            <button
                                onClick={() => quizStore.setView('teacher_login')}
                                className="w-full py-3 bg-gradient-to-r from-orange-400 to-amber-500 text-white rounded-xl font-semibold flex items-center justify-center gap-2 hover:shadow-lg transition-all"
                            >
                                → Đăng nhập hệ thống
                            </button>
                        </div>

                        {/* Quick Actions */}
                        <div className="bg-white/95 backdrop-blur-md rounded-2xl shadow-xl border border-white/50 p-4 space-y-3">
                            <button className="w-full flex items-center gap-3 p-3 bg-gray-50 hover:bg-gray-100 rounded-xl transition-all text-left">
                                <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                                    <span className="text-green-600 text-lg">📝</span>
                                </div>
                                <div>
                                    <p className="font-semibold text-gray-800 text-sm">Tạo đề thi</p>
                                    <p className="text-xs text-gray-500">Scan, thêm & Upload</p>
                                </div>
                            </button>
                            <button className="w-full flex items-center gap-3 p-3 bg-gray-50 hover:bg-gray-100 rounded-xl transition-all text-left">
                                <div className="w-10 h-10 bg-amber-100 rounded-lg flex items-center justify-center">
                                    <span className="text-amber-600 text-lg">📊</span>
                                </div>
                                <div>
                                    <p className="font-semibold text-gray-800 text-sm">Quản lý tài nguyên</p>
                                    <p className="text-xs text-gray-500">Ngân hàng câu hỏi</p>
                                </div>
                            </button>
                        </div>

                        {/* Help Text */}
                        <p className="text-xs text-gray-400 text-center px-4">
                            Bấm vào quản lý để nhập liệu đề hoặc cho các bài giảng viên.
                        </p>
                    </div>
                </div>

                {/* Footer */}
                <p className="text-center text-gray-500 text-xs mt-6">
                    © 2025 Trường Tiểu học Ít Ong. Developed by Tòng Minh Khánh.
                </p>
            </div>
            <Analytics />
        </div >
    );
};

export default App;
