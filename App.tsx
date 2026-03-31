import React, { useState, useEffect, Suspense } from 'react';
import { Analytics } from '@vercel/analytics/react';
import { Quiz, QuestionType } from './src/types';
import { SCHOOL_NAME } from './src/config/constants';
import { Loader2 } from 'lucide-react';
import { fetchIoeQuizzes, saveIoeResult } from './src/services/ioeSheetService';
import { useAuthStore } from './stores/authStore';
import { useQuizStore } from './stores/quizStore';

// Lazy load main views
const StudentView = React.lazy(() => import('./src/components/StudentView'));
const IoeStudentView = React.lazy(() => import('./src/components/IoeStudentView'));
const TeacherDashboard = React.lazy(() => import('./src/components/TeacherDashboard'));
const HomePage = React.lazy(() => import('./src/components/HomePage/HomePage'));
const PrivacyPolicy = React.lazy(() => import('./src/components/legal/PrivacyPolicy'));
const TermsOfService = React.lazy(() => import('./src/components/legal/TermsOfService'));
const Footer = React.lazy(() => import('./src/components/common/Footer'));

const App: React.FC = () => {
    // --- STORES ---
    const authStore = useAuthStore();
    const quizStore = useQuizStore();

    // --- IOE State (Lifted for deep linking) ---
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
            loadIoeData(false); // Initial load for deep link
        }
    }, []);

    // --- SEO & Scrolling Title ---
    const [baseTitle, setBaseTitle] = useState('ItOng Quiz - Hệ thống Tạo đề và Ôn thi cho học sinh Tiểu học Ít Ong');

    useEffect(() => {
        let title = 'ItOng Quiz - Hệ thống Tạo đề và Ôn thi cho học sinh Tiểu học Ít Ong';
        let description = 'ItOng Quiz giúp giáo viên tạo đề thi trắc nghiệm từ file PDF/Notion chỉ trong 30 giây. Hỗ trợ học sinh ôn thi chương trình GDPT 2018 bám sát chương trình sách giáo khoa với công nghệ AI tiên tiến.';

        if (quizStore.view === 'teacher_dash') {
            title = 'Quản lý Đề thi - ItOng Quiz';
        } else if (quizStore.view === 'student' && quizStore.selectedQuiz) {
            title = `${quizStore.selectedQuiz.title} - ItOng Quiz`;
            description = `Luyện tập bài thi ${quizStore.selectedQuiz.title} trên hệ thống ItOng Quiz. Bài thi dành cho học sinh lớp ${quizStore.selectedQuiz.classLevel || 'Tiểu học'}.`;
        } else if ((quizStore.view as any) === 'privacy') {
            title = 'Chính sách bảo mật - ItOng Quiz';
        } else if ((quizStore.view as any) === 'tos') {
            title = 'Điều khoản dịch vụ - ItOng Quiz';
        }

        setBaseTitle(title);

        // Update meta description
        const metaDescription = document.querySelector('meta[name="description"]');
        if (metaDescription) {
            metaDescription.setAttribute('content', description);
        }

        // Update OG Tags
        const ogTitle = document.querySelector('meta[property="og:title"]');
        if (ogTitle) ogTitle.setAttribute('content', title);

        const ogDesc = document.querySelector('meta[property="og:description"]');
        if (ogDesc) ogDesc.setAttribute('content', description);

    }, [quizStore.view, quizStore.selectedQuiz?.id]);

    // Marquee effect logic
    useEffect(() => {
        let currentTitle = baseTitle + "        "; // Thêm 8 khoảng trắng để mượt hơn
        const interval = setInterval(() => {
            currentTitle = currentTitle.substring(1) + currentTitle.substring(0, 1);
            document.title = currentTitle;
        }, 200); // Tăng tốc lên 200ms để đỡ bị giật

        return () => {
            clearInterval(interval);
            document.title = baseTitle;
        };
    }, [baseTitle]);

    const loadIoeData = async (forceRefresh = false) => {
        if (ioeLoading) return;
        setIoeLoading(true);
        try {
            const quizzes = await fetchIoeQuizzes(forceRefresh);
            setIoeQuizzes(quizzes);
            console.log('[IOE] Loaded', quizzes.length, 'quizzes', forceRefresh ? '(refreshed)' : '');
        } catch (err) {
            console.error('[IOE] Load error:', err);
        } finally {
            setIoeLoading(false);
        }
    };

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

    // --- VIEWS ---

    if (quizStore.view === 'teacher_dash') {
        // 🔐 Security Guard: Redirect to home if not logged in as teacher
        if (!authStore.isLoggedIn) {
            quizStore.setView('home');
            return null;
        }

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
                            onExit={() => quizStore.goHome()}
                            onSaveResult={saveIoeResult}
                        />
                    ) : (
                        <StudentView
                            quiz={quizStore.selectedQuiz}
                            onExit={() => quizStore.goHome()}
                            onSaveResult={quizStore.submitResult}
                        />
                    )}
                </Suspense>
                <Analytics />
            </>
        );
    }

    if (quizStore.view === 'privacy') {
        return (
            <Suspense fallback={<div className="min-h-screen flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin" /></div>}>
                <PrivacyPolicy onBack={() => quizStore.goHome()} />
                <Footer onNavigate={(v) => quizStore.setView(v as any)} />
            </Suspense>
        );
    }

    if (quizStore.view === 'tos') {
        return (
            <Suspense fallback={<div className="min-h-screen flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin" /></div>}>
                <TermsOfService onBack={() => quizStore.goHome()} />
                <Footer onNavigate={(v) => quizStore.setView(v as any)} />
            </Suspense>
        );
    }

    // Home Screen (New Component)
    return (
        <Suspense fallback={
            <div className="min-h-screen flex items-center justify-center bg-[#F8F9FB]">
                <Loader2 className="w-12 h-12 text-[#6C5CE7] animate-spin" />
            </div>
        }>
            <div className="flex flex-col min-h-screen">
                <main className="flex-1">
                    <HomePage
                        ioeQuizzes={ioeQuizzes}
                        ioeLoading={ioeLoading}
                        onRefreshIoe={() => loadIoeData(true)}
                    />
                </main>
                <Footer onNavigate={(v) => quizStore.setView(v as any)} />
            </div>
            <Analytics />
        </Suspense>
    );
};

export default App;
