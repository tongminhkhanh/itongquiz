import React, { Suspense, useEffect, useState } from 'react';
import { Analytics } from '@vercel/analytics/react';
import { Loader2 } from 'lucide-react';
import { Navigate, Route, Routes, useLocation, useNavigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';

import { getSystemSettings } from './src/services/systemSettingsService';
import { useAuthStore } from './stores/authStore';
import { useQuizStore } from './stores/quizStore';
import { useClassroomStore } from './src/stores/useClassroomStore';
import { ChatBot } from './src/components/ChatBot';
import { useSeo } from './src/hooks/useSeo';

// Lazy load main views
const StudentView = React.lazy(() => import('./src/components/StudentView'));
const TeacherDashboard = React.lazy(() => import('./src/components/TeacherDashboard'));
const TeacherResultDetailPage = React.lazy(() => import('./src/components/TeacherDashboard/TeacherResultDetailPage'));
const GiftShop = React.lazy(() => import('./src/components/gamification/GiftShop'));
const HomePage = React.lazy(() => import('./src/components/HomePage/HomePage'));
const PrivacyPolicy = React.lazy(() => import('./src/components/legal/PrivacyPolicy'));
const TermsOfService = React.lazy(() => import('./src/components/legal/TermsOfService'));
const Footer = React.lazy(() => import('./src/components/common/Footer'));
const AboutPage = React.lazy(() => import('./src/components/schoolPage/AboutPage'));
const ContactPage = React.lazy(() => import('./src/components/schoolPage/ContactPage'));
const PhieuPublicPage = React.lazy(() => import('./src/pages/PhieuPublicPage'));

type RoutePath = '/' | '/about' | '/contact' | '/privacy' | '/tos';

const PageLoading: React.FC = () => (
    <div className="min-h-screen flex items-center justify-center bg-[#F8F9FB]">
        <Loader2 className="w-10 h-10 text-[#6C5CE7] animate-spin" />
    </div>
);

const App: React.FC = () => {
    const authStore = useAuthStore();
    const quizStore = useQuizStore();
    const classroomStore = useClassroomStore();
    const location = useLocation();
    const navigate = useNavigate();
    
    // Feature flags
    const isGiftShopFeatureEnabled = String(import.meta.env.VITE_FEATURE_GIFT_SHOP_V2 || 'false').toLowerCase() === 'true';

    const [aiAssistantEnabled, setAiAssistantEnabled] = useState(true);

    // Call custom SEO hook
    useSeo(location.pathname, quizStore.view, quizStore.selectedQuiz, isGiftShopFeatureEnabled);

    useEffect(() => {
        quizStore.loadQuizzes();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // Tự động chuyển hướng giáo viên/admin vào dashboard nếu đã đăng nhập
    useEffect(() => {
        const params = new URLSearchParams(window.location.search);
        if (params.get('autologin') === 'teacher' && !authStore.isLoggedIn) {
            authStore.loginSuccess('admin', 'Admin Test', true, '4A');
            
            // Seed mock results if empty for UI testing
            if (quizStore.results.length === 0) {
                const mockResult = {
                    id: 'mock-123',
                    studentName: 'Học Sinh Thử Nghiệm',
                    studentClass: '4A',
                    quizId: 'quiz-123',
                    quizTitle: 'Bài tập ôn tập Toán 4',
                    score: 8.5,
                    correctCount: 17,
                    totalQuestions: 20,
                    submittedAt: new Date().toISOString(),
                    timeTaken: 600,
                    answers: {
                        'q1': { selected: 'A', correct: true },
                        'q2': { selected: 'B', correct: false },
                        'q3': { selected: 'C', correct: true }
                    }
                };
                quizStore.setResults([mockResult]);
            }
            return;
        }

        if (authStore.isLoggedIn && quizStore.view === 'home' && location.pathname === '/') {
            console.log('[App] Auto-redirecting teacher to dashboard');
            quizStore.setView('teacher_dash');
        }
    }, [authStore.isLoggedIn, quizStore.view, location.pathname, quizStore, authStore]);

    // Handle legacy quiz parameters
    useEffect(() => {
        if (location.pathname !== '/') return;

        const params = new URLSearchParams(location.search);
        const legacyQuizId = params.get('quiz');
        const canonicalQuizId = params.get('quizId');

        if (!legacyQuizId || canonicalQuizId) return;

        params.set('quizId', legacyQuizId);
        params.delete('quiz');
        navigate({ pathname: '/', search: `?${params.toString()}` }, { replace: true });
    }, [location.pathname, location.search, navigate]);

    // Handle System Settings
    useEffect(() => {
        const loadSystemSettings = async () => {
            try {
                const settings = await getSystemSettings();
                setAiAssistantEnabled(Boolean(settings.aiAssistantEnabled));
            } catch {
                setAiAssistantEnabled(true);
            }
        };

        loadSystemSettings();

        const handleSettingsUpdated = (event: Event) => {
            const customEvent = event as CustomEvent<{ aiAssistantEnabled?: boolean }>;
            if (typeof customEvent.detail?.aiAssistantEnabled === 'boolean') {
                setAiAssistantEnabled(customEvent.detail.aiAssistantEnabled);
                return;
            }
            loadSystemSettings();
        };

        window.addEventListener('itongquiz:system-settings-updated', handleSettingsUpdated);
        return () => {
            window.removeEventListener('itongquiz:system-settings-updated', handleSettingsUpdated);
        };
    }, []);

    // Handle Quiz selection via URL
    useEffect(() => {
        if (location.pathname !== '/') return;

        const params = new URLSearchParams(location.search);
        const quizId = params.get('quizId') || params.get('quiz');
        if (!quizId || quizStore.selectedQuiz) return;

        const foundQuiz = quizStore.quizzes.find((q) => q.id === quizId);

        if (foundQuiz) {
            quizStore.selectQuiz(foundQuiz);
            quizStore.setView('student');
        }
    }, [location.pathname, location.search, quizStore]);

    const handleRouteNavigate = (path: RoutePath) => {
        navigate(path);
    };

    const showPublicFooterLinks = !authStore.isLoggedIn && !classroomStore.studentSession;
    const showChatbot = aiAssistantEnabled && quizStore.view !== 'student';

    const renderRootView = () => {
        if (quizStore.view === 'shop') {
            if (!isGiftShopFeatureEnabled || !classroomStore.studentSession) {
                quizStore.setView('home');
                return null;
            }

            return (
                <Suspense fallback={<PageLoading />}>
                    <GiftShop />
                </Suspense>
            );
        }

        if (quizStore.view === 'teacher_dash') {
            if (!authStore.isLoggedIn) {
                quizStore.setView('home');
                return null;
            }

            return (
                <Suspense fallback={<PageLoading />}>
                    <TeacherDashboard />
                </Suspense>
            );
        }

        if (quizStore.view === 'student' && quizStore.selectedQuiz) {
            const hasLoadedQuestions = Array.isArray(quizStore.selectedQuiz.questions) && quizStore.selectedQuiz.questions.length > 0;
            if (!hasLoadedQuestions) {
                if (quizStore.isLoading) {
                    return <PageLoading />;
                }

                return (
                    <div className="min-h-screen flex items-center justify-center bg-[#F8F9FB] px-4">
                        <div className="max-w-md w-full rounded-2xl bg-white border border-slate-200 shadow-lg p-6 text-center">
                            <h2 className="text-xl font-bold text-slate-800 mb-2">Dang tai cau hoi...</h2>
                            <p className="text-slate-600 mb-5">
                                He thong chua tai duoc cau hoi cho bai nay. Vui long thu lai.
                            </p>
                            {quizStore.error && (
                                <p className="text-sm text-red-600 font-semibold mb-4">{quizStore.error}</p>
                            )}
                            <div className="flex justify-center gap-3">
                                <button
                                    type="button"
                                    onClick={() => quizStore.goHome()}
                                    className="px-4 py-2 rounded-xl border border-slate-300 text-slate-700 font-semibold hover:bg-slate-50"
                                >
                                    Ve trang chu
                                </button>
                                <button
                                    type="button"
                                    onClick={() => quizStore.loadQuizQuestions(quizStore.selectedQuiz!.id)}
                                    className="px-4 py-2 rounded-xl bg-[#6C5CE7] text-white font-semibold hover:bg-[#5b4bd8]"
                                >
                                    Thu lai
                                </button>
                            </div>
                        </div>
                    </div>
                );
            }

            return (
                <Suspense fallback={<PageLoading />}>
                    <StudentView
                        quiz={quizStore.selectedQuiz}
                        onExit={() => quizStore.goHome()}
                        onSaveResult={quizStore.submitResult}
                    />
                </Suspense>
            );
        }

        return (
            <Suspense fallback={<PageLoading />}>
                <div className="flex flex-col min-h-screen">
                    <main className="flex-1">
                        <HomePage />
                    </main>
                    <Footer onNavigate={handleRouteNavigate} showPublicLinks={showPublicFooterLinks} />
                </div>
            </Suspense>
        );
    };

    return (
        <>
            <Routes>
                <Route path="/" element={renderRootView()} />
                <Route
                    path="/teacher/results/:resultId"
                    element={
                        <Suspense fallback={<PageLoading />}>
                            <TeacherResultDetailPage />
                        </Suspense>
                    }
                />
                <Route
                    path="/about"
                    element={
                        <Suspense fallback={<PageLoading />}>
                            <div className="flex flex-col min-h-screen">
                                <main className="flex-1">
                                    <AboutPage />
                                </main>
                                <Footer onNavigate={handleRouteNavigate} />
                            </div>
                        </Suspense>
                    }
                />
                <Route
                    path="/contact"
                    element={
                        <Suspense fallback={<PageLoading />}>
                            <div className="flex flex-col min-h-screen">
                                <main className="flex-1">
                                    <ContactPage />
                                </main>
                                <Footer onNavigate={handleRouteNavigate} />
                            </div>
                        </Suspense>
                    }
                />
                <Route
                    path="/phieu/p/:publicToken"
                    element={
                        <Suspense fallback={<PageLoading />}>
                            <PhieuPublicPage />
                        </Suspense>
                    }
                />
                <Route
                    path="/privacy"
                    element={
                        <Suspense fallback={<PageLoading />}>
                            <div className="flex flex-col min-h-screen">
                                <main className="flex-1">
                                    <PrivacyPolicy onBack={() => {
                                        quizStore.goHome();
                                        navigate('/');
                                    }} />
                                </main>
                                <Footer onNavigate={handleRouteNavigate} />
                            </div>
                        </Suspense>
                    }
                />
                <Route
                    path="/tos"
                    element={
                        <Suspense fallback={<PageLoading />}>
                            <div className="flex flex-col min-h-screen">
                                <main className="flex-1">
                                    <TermsOfService onBack={() => {
                                        quizStore.goHome();
                                        navigate('/');
                                    }} />
                                </main>
                                <Footer onNavigate={handleRouteNavigate} />
                            </div>
                        </Suspense>
                    }
                />
                <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
            {showChatbot && <ChatBot />}
            <Analytics />
            <Toaster
                position="top-center"
                containerStyle={{ top: 64 }}
                toastOptions={{
                    style: {
                        fontFamily: "'Baloo 2', sans-serif",
                        fontWeight: 600,
                        fontSize: '0.93rem',
                        borderRadius: '14px',
                        padding: '12px 16px',
                        boxShadow: '0 4px 20px rgba(0,0,0,0.12)',
                    },
                    duration: 3500,
                }}
            />
        </>
    );
};

export default App;
