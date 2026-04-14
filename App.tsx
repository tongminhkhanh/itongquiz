import React, { Suspense, useEffect, useState } from 'react';
import { Analytics } from '@vercel/analytics/react';
import { Loader2 } from 'lucide-react';
import { Navigate, Route, Routes, useLocation, useNavigate } from 'react-router-dom';

import { Quiz } from './src/types';
import { fetchIoeQuizzes, saveIoeResult } from './src/services/ioeSheetService';
import { getSystemSettings } from './src/services/systemSettingsService';
import { useAuthStore } from './stores/authStore';
import { useQuizStore } from './stores/quizStore';
import { useClassroomStore } from './src/stores/useClassroomStore';
import { ChatBot } from './src/components/ChatBot';

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

const DEFAULT_TITLE = 'ItOng Quiz - Nền tảng tạo đề và ôn thi cho học sinh Tiểu học Ít Ong';
const DEFAULT_DESCRIPTION = 'ItOng Quiz giúp giáo viên tạo đề trắc nghiệm nhanh, hỗ trợ học sinh ôn thi chương trình GDPT 2018.';
const DEFAULT_KEYWORDS = 'Ít Ong, ItOng Quiz, luyện thi tiểu học, trắc nghiệm tiểu học, GDPT 2018, ôn thi online';
const SEO_CATEGORY_WHITELIST = new Set(['all', 'vioedu', 'trang-nguyen', 'ioe', 'on-tap', 'toan', 'tieng-viet']);

const upsertMetaByName = (name: string, content: string) => {
    let tag = document.querySelector(`meta[name="${name}"]`) as HTMLMetaElement | null;
    if (!tag) {
        tag = document.createElement('meta');
        tag.setAttribute('name', name);
        document.head.appendChild(tag);
    }
    tag.setAttribute('content', content);
};

const upsertMetaByProperty = (property: string, content: string) => {
    let tag = document.querySelector(`meta[property="${property}"]`) as HTMLMetaElement | null;
    if (!tag) {
        tag = document.createElement('meta');
        tag.setAttribute('property', property);
        document.head.appendChild(tag);
    }
    tag.setAttribute('content', content);
};

const upsertCanonical = (href: string) => {
    let canonical = document.querySelector('link[rel="canonical"]') as HTMLLinkElement | null;
    if (!canonical) {
        canonical = document.createElement('link');
        canonical.setAttribute('rel', 'canonical');
        document.head.appendChild(canonical);
    }
    canonical.setAttribute('href', href);
};

const upsertJsonLd = (id: string, payload: Record<string, unknown>) => {
    let tag = document.getElementById(id) as HTMLScriptElement | null;
    if (!tag) {
        tag = document.createElement('script');
        tag.id = id;
        tag.type = 'application/ld+json';
        document.head.appendChild(tag);
    }
    tag.textContent = JSON.stringify(payload);
};

const getCanonicalUrl = (pathname: string, view: string, selectedQuiz: Quiz | null): string => {
    if (pathname !== '/') {
        return new URL(pathname, `${window.location.origin}/`).toString();
    }

    const canonical = new URL(window.location.origin + '/');

    if (view === 'student' && selectedQuiz?.id) {
        canonical.searchParams.set('quizId', selectedQuiz.id);
        return canonical.toString();
    }

    const params = new URLSearchParams(window.location.search);
    const category = params.get('category');
    if (category && SEO_CATEGORY_WHITELIST.has(category)) {
        canonical.searchParams.set('category', category);
    }

    return canonical.toString();
};

const buildStructuredData = (canonicalUrl: string, title: string, description: string, selectedQuiz: Quiz | null) => {
    const organization = {
        '@type': 'EducationalOrganization',
        name: 'Trường Tiểu học Ít Ong',
        alternateName: 'ItOng Quiz',
        url: 'https://www.thitong.site',
    };

    if (selectedQuiz) {
        return {
            '@context': 'https://schema.org',
            '@type': 'Quiz',
            name: selectedQuiz.title,
            description,
            url: canonicalUrl,
            educationalLevel: selectedQuiz.classLevel ? `Lớp ${selectedQuiz.classLevel}` : 'Tiểu học',
            about: selectedQuiz.category || 'Trắc nghiệm',
            inLanguage: 'vi',
            isAccessibleForFree: true,
            numberOfQuestions: selectedQuiz.questions?.length || 0,
            publisher: organization,
        };
    }

    return {
        '@context': 'https://schema.org',
        '@graph': [
            {
                '@type': 'WebSite',
                name: 'ItOng Quiz',
                url: 'https://www.thitong.site/',
                inLanguage: 'vi',
                description,
            },
            organization,
            {
                '@type': 'WebPage',
                name: title,
                url: canonicalUrl,
                description,
            },
        ],
    };
};

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
    const isGiftShopFeatureEnabled = String(import.meta.env.VITE_FEATURE_GIFT_SHOP_V2 || 'false').toLowerCase() === 'true';

    const [ioeQuizzes, setIoeQuizzes] = useState<Quiz[]>([]);
    const [ioeLoading, setIoeLoading] = useState(false);
    const [aiAssistantEnabled, setAiAssistantEnabled] = useState(true);

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

    useEffect(() => {
        const pathname = location.pathname;
        let title = DEFAULT_TITLE;
        let description = DEFAULT_DESCRIPTION;
        let keywords = DEFAULT_KEYWORDS;
        let robots = 'index, follow';

        if (pathname === '/about') {
            title = 'Giới thiệu trường Ít Ong - ItOng Quiz';
            description = 'Thông tin giới thiệu Trường Tiểu học Ít Ong, quá trình phát triển và hoạt động nổi bật.';
            keywords = 'giới thiệu trường Ít Ong, Trường Tiểu học Ít Ong, ItOng Quiz';
        } else if (pathname === '/contact') {
            title = 'Liên hệ trường Ít Ong - ItOng Quiz';
            description = 'Kênh liên hệ Trường Tiểu học Ít Ong: địa chỉ, hotline, fanpage và bản đồ.';
            keywords = 'liên hệ trường Ít Ong, bản đồ trường Ít Ong, hotline trường Ít Ong';
        } else if (pathname === '/privacy') {
            title = 'Chính sách bảo mật - ItOng Quiz';
        } else if (pathname === '/tos') {
            title = 'Điều khoản sử dụng - ItOng Quiz';
        } else if (quizStore.view === 'teacher_dash') {
            title = 'Quản lý đề thi - ItOng Quiz';
            robots = 'noindex, nofollow, noarchive';
        } else if (quizStore.view === 'student' && quizStore.selectedQuiz) {
            title = `${quizStore.selectedQuiz.title} - ItOng Quiz`;
            description = `Luyện tập bài thi ${quizStore.selectedQuiz.title} trên hệ thống ItOng Quiz.`;
            keywords = [
                quizStore.selectedQuiz.title,
                `Lớp ${quizStore.selectedQuiz.classLevel || 'Tiểu học'}`,
                quizStore.selectedQuiz.category || 'trắc nghiệm',
                'ItOng Quiz',
                'ôn thi tiểu học',
            ].join(', ');
        } else if (quizStore.view === 'student_portal') {
            title = 'Cổng học sinh - ItOng Quiz';
            robots = 'noindex, nofollow, noarchive';
        } else if (quizStore.view === 'shop' && isGiftShopFeatureEnabled) {
            title = 'Tiệm Tạp Hóa Ít Ong - ItOng Quiz';
            description = 'Đổi quà bằng xu và quản lý voucher trong hệ thống ItOng Quiz.';
            robots = 'noindex, nofollow, noarchive';
        }

        const canonicalUrl = getCanonicalUrl(pathname, quizStore.view, quizStore.selectedQuiz);
        const structuredData = buildStructuredData(
            canonicalUrl,
            title,
            description,
            pathname === '/' && quizStore.view === 'student' ? quizStore.selectedQuiz : null
        );

        document.title = title;

        upsertMetaByName('description', description);
        upsertMetaByName('keywords', keywords);
        upsertMetaByName('robots', robots);

        upsertMetaByProperty('og:title', title);
        upsertMetaByProperty('og:description', description);
        upsertMetaByProperty('og:url', canonicalUrl);
        upsertMetaByProperty('twitter:title', title);
        upsertMetaByProperty('twitter:description', description);
        upsertMetaByProperty('twitter:url', canonicalUrl);

        upsertMetaByName('twitter:title', title);
        upsertMetaByName('twitter:description', description);

        upsertCanonical(canonicalUrl);
        upsertJsonLd('seo-jsonld', structuredData);
    }, [
        location.pathname,
        quizStore.view,
        quizStore.selectedQuiz?.id,
        quizStore.selectedQuiz?.title,
        quizStore.selectedQuiz?.classLevel,
        quizStore.selectedQuiz?.category,
        quizStore.selectedQuiz?.questions?.length,
        isGiftShopFeatureEnabled,
    ]);

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
        </>
    );
};

export default App;
