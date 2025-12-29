import React, { useState, useEffect, Suspense } from 'react';
import { Analytics } from '@vercel/analytics/react';
import { Quiz, QuestionType } from './src/types';
import { SCHOOL_NAME, GOOGLE_SHEET_ID, TEACHER_GID } from './src/config/constants';
import { BookOpen, GraduationCap, Lock, KeyRound, RefreshCw, Loader2 } from 'lucide-react';
import { fetchTeachersFromSheets } from './src/services/googleSheetService';
import { useAuthStore } from './stores/authStore';
import { useQuizStore } from './stores/quizStore';

// Lazy load main views
const StudentView = React.lazy(() => import('./src/components/StudentView'));
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

    // --- INITIALIZATION ---
    useEffect(() => {
        // Load data on mount
        quizStore.loadQuizzes();
        quizStore.loadResults();

        // Check URL for quizId
        const params = new URLSearchParams(window.location.search);
        const quizId = params.get('quizId');
        if (quizId) {
            // We'll handle deep linking in the next effect
        }
    }, []);

    // Seed data if empty (only once)
    useEffect(() => {
        if (!quizStore.isLoading && quizStore.quizzes.length === 0) {
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
            quizStore.addQuiz(seedQuiz);
        }
    }, [quizStore.isLoading, quizStore.quizzes.length]);

    // Effect to handle deep linking once quizzes are loaded
    useEffect(() => {
        const params = new URLSearchParams(window.location.search);
        const quizId = params.get('quizId');
        if (quizId && quizStore.quizzes.length > 0 && !quizStore.selectedQuiz) {
            const foundQuiz = quizStore.quizzes.find(q => q.id === quizId);
            if (foundQuiz) {
                quizStore.selectQuiz(foundQuiz);
                quizStore.setView('student');
            }
        }
    }, [quizStore.quizzes]);

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
                authStore.loginSuccess('Admin', true, null);
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
                authStore.loginSuccess(teacher.fullName, teacher.role === 'admin', teacher.class);
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
        return (
            <>
                <Suspense fallback={
                    <div className="min-h-screen flex items-center justify-center bg-white">
                        <div className="flex flex-col items-center gap-4">
                            <Loader2 className="w-12 h-12 text-green-500 animate-spin" />
                            <p className="text-gray-500 font-medium">Đang tải bài kiểm tra...</p>
                        </div>
                    </div>
                }>
                    <StudentView
                        quiz={quizStore.selectedQuiz}
                        onExit={() => { quizStore.selectQuiz(null); quizStore.setView('home'); }}
                        onSaveResult={quizStore.submitResult}
                    />
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

            {/* Header */}
            <div className="z-10 mb-8 animate-slide-down">
                <div className="inline-flex items-center gap-3 bg-gradient-to-r from-amber-600 to-amber-500 px-6 py-3 rounded-full shadow-xl">
                    <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center shadow-inner">
                        <GraduationCap className="w-6 h-6 text-amber-600" />
                    </div>
                    <div className="text-left">
                        <h1 className="text-xl md:text-2xl font-bold text-white tracking-wide">{SCHOOL_NAME}</h1>
                        <p className="text-amber-100 text-xs font-medium tracking-widest">HỌC TẬP & RÈN LUYỆN</p>
                    </div>
                </div>
            </div>

            {/* Main Card */}
            <div className="z-10 w-full max-w-xl mx-auto animate-fade-in">
                <div className="bg-white/95 backdrop-blur-md rounded-3xl shadow-2xl border border-white/50 overflow-hidden">
                    {/* Card Header */}
                    <div className="p-6 pb-4">
                        <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-emerald-400 to-green-500 flex items-center justify-center shadow-md">
                                    <BookOpen className="w-5 h-5 text-white" />
                                </div>
                                <h2 className="text-xl md:text-2xl font-bold text-gray-800">
                                    Chọn Lớp Học
                                </h2>
                            </div>
                            <button
                                onClick={() => quizStore.loadQuizzes()}
                                className="p-2 hover:bg-gray-100 rounded-full transition-all group"
                                title="Làm mới dữ liệu"
                            >
                                <RefreshCw className={`w-5 h-5 text-gray-400 group-hover:text-blue-600 ${quizStore.isLoading ? 'animate-spin' : ''}`} />
                            </button>
                        </div>
                        <p className="text-gray-500 text-sm ml-[52px]">Vui lòng chọn khối lớp để xem danh sách bài kiểm tra</p>
                    </div>

                    {/* Content */}
                    <div className="px-6 pb-6">
                        {!quizStore.selectedClassLevel ? (
                            // Class Level Selection
                            <>
                                <div className="flex flex-wrap justify-center gap-4 md:gap-6 py-4">
                                    {['1', '2', '3', '4', '5'].map((level) => {
                                        const quizCount = quizStore.quizzes.filter(q => q.classLevel === level).length;
                                        return (
                                            <button
                                                key={level}
                                                onClick={() => quizStore.setClassLevel(level)}
                                                className="group flex flex-col items-center transition-all hover:-translate-y-1"
                                            >
                                                <div className="w-16 h-16 md:w-20 md:h-20 rounded-full bg-gradient-to-br from-emerald-400 to-green-500 flex items-center justify-center shadow-lg group-hover:shadow-xl group-hover:scale-105 transition-all mb-2">
                                                    <GraduationCap className="w-8 h-8 md:w-10 md:h-10 text-white" />
                                                </div>
                                                <span className="font-bold text-gray-700 text-sm md:text-base">Lớp {level}</span>
                                                <span className="text-xs text-emerald-600 font-medium bg-emerald-50 px-2 py-0.5 rounded-full mt-1">
                                                    {quizCount} đề thi
                                                </span>
                                            </button>
                                        );
                                    })}
                                </div>

                                {/* Divider */}
                                <div className="flex items-center gap-4 my-6">
                                    <div className="flex-1 h-px bg-gray-200"></div>
                                    <span className="text-xs text-gray-400 font-medium uppercase tracking-wider">Khu vực quản lý</span>
                                    <div className="flex-1 h-px bg-gray-200"></div>
                                </div>

                                {/* Teacher Login Button */}
                                <button
                                    onClick={() => quizStore.setView('teacher_login')}
                                    className="w-full flex items-center justify-between p-4 rounded-2xl bg-gradient-to-r from-orange-50 to-amber-50 hover:from-orange-100 hover:to-amber-100 border border-orange-200 hover:border-orange-300 transition-all group"
                                >
                                    <div className="flex items-center gap-4">
                                        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-orange-400 to-amber-500 flex items-center justify-center shadow-md group-hover:shadow-lg transition-shadow">
                                            <KeyRound className="w-6 h-6 text-white" />
                                        </div>
                                        <div className="text-left">
                                            <p className="font-bold text-gray-800">Dành cho Giáo viên</p>
                                            <p className="text-xs text-gray-500">Đăng nhập để quản lý đề thi, học sinh và chấm điểm.</p>
                                        </div>
                                    </div>
                                    <div className="w-10 h-10 rounded-full bg-gradient-to-r from-orange-400 to-amber-500 flex items-center justify-center shadow-md group-hover:shadow-lg group-hover:scale-110 transition-all">
                                        <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                        </svg>
                                    </div>
                                </button>
                            </>
                        ) : (
                            // Quiz List for Selected Level
                            <>
                                <div className="flex items-center justify-between mb-4">
                                    <h3 className="text-lg font-bold text-gray-800">Bài kiểm tra Lớp {quizStore.selectedClassLevel}</h3>
                                    <button
                                        onClick={() => quizStore.setClassLevel(null)}
                                        className="px-3 py-1.5 bg-gray-100 hover:bg-gray-200 rounded-lg text-sm font-medium text-gray-600 transition-all"
                                    >
                                        ← Quay lại
                                    </button>
                                </div>
                                <div className="space-y-3 max-h-[50vh] overflow-y-auto pr-2 custom-scrollbar">
                                    {quizStore.quizzes.filter(q => q.classLevel === quizStore.selectedClassLevel).length === 0 ? (
                                        <div className="text-center py-12 bg-gray-50 rounded-2xl border-2 border-dashed border-gray-200">
                                            <div className="text-5xl mb-3 text-gray-300">∅</div>
                                            <p className="text-gray-400">Chưa có bài kiểm tra nào cho Lớp {quizStore.selectedClassLevel}.</p>
                                        </div>
                                    ) : (
                                        quizStore.quizzes
                                            .filter(q => q.classLevel === quizStore.selectedClassLevel)
                                            .map((q, index) => (
                                                <button
                                                    key={q.id}
                                                    onClick={() => { quizStore.selectQuiz(q); quizStore.setView('student'); }}
                                                    className="w-full text-left p-4 rounded-xl bg-gradient-to-r from-green-50 to-emerald-50 hover:from-green-100 hover:to-emerald-100 transition-all border border-green-100 hover:border-green-300 group shadow-sm hover:shadow-md"
                                                    style={{ animationDelay: `${index * 50}ms` }}
                                                >
                                                    <div className="flex justify-between items-center">
                                                        <span className="font-bold text-green-800 group-hover:text-green-900 flex items-center gap-2">
                                                            {q.requireCode && <Lock className="w-4 h-4 text-amber-500" />}
                                                            {q.title}
                                                        </span>
                                                        <span className="bg-gradient-to-r from-green-500 to-emerald-500 px-3 py-1 rounded-full text-xs font-bold text-white shadow group-hover:shadow-md group-hover:scale-105 transition-all">
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
                        )}
                    </div>
                </div>

                {/* Footer */}
                <p className="text-center text-gray-500 text-xs mt-6">
                    © 2025 Trường Tiểu học Ít Ong. Developed by Tòng Minh Khánh.
                </p>
            </div>
            <Analytics />
        </div>
    );
};

export default App;