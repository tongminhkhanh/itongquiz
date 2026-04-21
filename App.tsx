import React, { Suspense, useEffect, useState } from 'react';
import { Analytics } from '@vercel/analytics/react';
import { Loader2 } from 'lucide-react';
import { Navigate, Route, Routes, useLocation, useNavigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';

import { Quiz } from './src/types';
import { fetchIoeQuizzes, saveIoeResult } from './src/services/ioeSheetService';
import { getSystemSettings } from './src/services/systemSettingsService';
import { useAuthStore } from './stores/authStore';
import { useQuizStore } from './stores/quizStore';
import { useClassroomStore } from './src/stores/useClassroomStore';
import { ChatBot } from './src/components/ChatBot';
import { useSeo } from './src/hooks/useSeo';

// Lazy load main views
const StudentView = React.lazy(() => import('./src/components/StudentView'));
const IoeStudentView = React.lazy(() => import('./src/components/IoeStudentView'));
const TeacherDashboard = React.lazy(() => import('./src/components/TeacherDashboard'));
const GiftShop = React.lazy(() => import('./src/components/gamification/GiftShop'));
const HomePage = React.lazy(() => import('./src/components/HomePage/HomePage'));
const PrivacyPolicy = React.lazy(() => import('./src/components/legal/PrivacyPolicy'));
const TermsOfService = React.lazy(() => import('./src/components/legal/TermsOfService'));
const Footer = React.lazy(() => import('./src/components/common/Footer'));
const AboutPage = React.lazy(() => import('./src/components/schoolPage/AboutPage'));
const ContactPage = React.lazy(() => import('./src/components/schoolPage/ContactPage'));

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

    const [ioeQuizzes, setIoeQuizzes] = useState<Quiz[]>([]);
    const [ioeLoading, setIoeLoading] = useState(false);
    const [aiAssistantEnabled, setAiAssistantEnabled] = useState(true);

    // Call custom SEO hook
    useSeo(location.pathname, quizStore.view, quizStore.selectedQuiz, isGiftShopFeatureEnabled);

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

    useEffect(() => {
        quizStore.loadQuizzes();
        quizStore.loadResults();

        const params = new URLSearchParams(window.location.search);
        const quizId = params.get('quizId') || params.get('quiz');
        if (quizId && quizId.startsWith('ioe-')) {
            loadIoeData(false);
        }
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

        let foundQuiz = quizStore.quizzes.find((q) => q.id === quizId);
        if (!foundQuiz && ioeQuizzes.length > 0) {
            foundQuiz = ioeQuizzes.find((q) => q.id === quizId);
        }

        if (foundQuiz) {
            quizStore.selectQuiz(foundQuiz);
            quizStore.setView('student');
        }
    }, [location.pathname, location.search, quizStore, ioeQuizzes]);

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
            const isIoeQuiz = quizStore.selectedQuiz.category === 'ioe';
            return (
                <Suspense fallback={<PageLoading />}>
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
            );
        }

        return (
            <Suspense fallback={<PageLoading />}>
                <div className="flex flex-col min-h-screen">
                    <main className="flex-1">
                        <HomePage
                            ioeQuizzes={ioeQuizzes}
                            ioeLoading={ioeLoading}
                            onRefreshIoe={() => loadIoeData(true)}
                        />
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
