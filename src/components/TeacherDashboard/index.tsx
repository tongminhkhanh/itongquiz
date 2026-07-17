import React, { useState, Suspense, useEffect } from 'react';
import { Quiz } from '../../types';
import { Button, ErrorBoundary, Footer } from '../common';
import { Key, X, Save, Loader2, Bell, Search } from 'lucide-react';
import { useAuthStore } from '../../../stores/authStore';
import { useQuizStore } from '../../../stores/quizStore';
import { useClassroomStore } from '../../stores/useClassroomStore';
import {
    type TeacherDashboardTab,
    useTeacherDashboardUIStore,
} from '../../stores/useTeacherDashboardUIStore';
import { setStripAnswersEnabled } from '../../services/googleSheetService';
import { cacheService } from '../../services/CacheService';
import Sidebar from './Sidebar';
import BottomNavigation from './BottomNavigation';
import { useNavigate } from 'react-router-dom';
import { showSuccess, showError } from '../../utils/toast';
import { checkAndWarnJWTExpiry } from '../../utils/jwtInterceptor';
import CurrentAnnouncementBanner from '../common/CurrentAnnouncementBanner';
import PasswordChangeDialog from '../common/PasswordChangeDialog';
import { callApi } from '../../services/apiAdapter';
import { getJWTPurpose, getStoredJWTToken } from '../../services/api/auth';
import { ApiError } from '../../services/api/errors';
import { areClassNamesEqual } from '../../utils/classMatching';

type ResultsLoadState = 'loading' | 'success' | 'error';

const DASHBOARD_SEARCH_ITEMS: Array<{ tab: TeacherDashboardTab; label: string; keywords: string }> = [
    { tab: 'overview', label: 'Tổng quan', keywords: 'dashboard trang chủ thống kê' },
    { tab: 'create', label: 'Tạo đề mới', keywords: 'tạo bài kiểm tra' },
    { tab: 'manage', label: 'Đề kiểm tra', keywords: 'quản lý sửa đề' },
    { tab: 'results', label: 'Kết quả học tập', keywords: 'điểm bài nộp' },
    { tab: 'classes', label: 'Lớp học', keywords: 'học sinh lớp' },
    { tab: 'assignments', label: 'Giao bài', keywords: 'bài tập hạn nộp' },
    { tab: 'homework', label: 'Bài tập tự luận', keywords: 'phiếu bài tập ai' },
    { tab: 'live-exam', label: 'Thi trực tiếp', keywords: 'live exam phòng thi' },
    { tab: 'certificates', label: 'Cấp chứng nhận', keywords: 'giấy khen chứng chỉ' },
    { tab: 'announcements', label: 'Thông báo', keywords: 'cài đặt hệ thống' },
];

// Lazy load tab components
const OverviewTab = React.lazy(() => import('./OverviewTab'));
const ResultsTab = React.lazy(() => import('./ResultsTab'));
const ManageTab = React.lazy(() => import('./ManageTab'));
const CreateTab = React.lazy(() => import('./CreateTab'));
const IoeTab = React.lazy(() => import('./IoeTab'));
const IoeManageTab = React.lazy(() => import('./IoeManageTab'));
const IoeResultsTab = React.lazy(() => import('./IoeResultsTab'));
const AnnouncementSettings = React.lazy(() => import('./AnnouncementSettings'));
const ClassManagementTab = React.lazy(() => import('./ClassManagementTab'));
const AssignmentTab = React.lazy(() => import('./AssignmentTab'));
const TeacherManagementTab = React.lazy(() => import('./TeacherManagementTab'));
const GiftShopTab = React.lazy(() => import('./GiftShopTab'));
const HomeworkTab = React.lazy(() => import('../../features/homework/components/HomeworkTab').then(m => ({ default: m.HomeworkTab })));
const LiveExamTab = React.lazy(() => import('../LiveExam/TeacherLiveExamDashboardContainer'));
const TeacherCertificatesPage = React.lazy(() => import('../../features/certificates/TeacherCertificatesPage'));
const AdminTemplatesPage = React.lazy(() => import('../../features/certificates/AdminTemplatesPage'));
const MathAuditPage = React.lazy(() => import('../../features/math-audit/MathAuditPage'));
const PersonalSettingsTab = React.lazy(() => import('./PersonalSettingsTab'));

const TeacherDashboard: React.FC = () => {
    // --- STORES ---
    const authStore = useAuthStore();
    const quizStore = useQuizStore();
    const navigate = useNavigate();
    const isGiftShopFeatureEnabled = String(import.meta.env.VITE_FEATURE_GIFT_SHOP_V2 || 'false').toLowerCase() === 'true';
    const activeTab = useTeacherDashboardUIStore((state) => state.activeTab);
    const setActiveTab = useTeacherDashboardUIStore((state) => state.setActiveTab);
    const clearAssignmentComposerDraft = useTeacherDashboardUIStore((state) => state.clearAssignmentComposerDraft);
    const [passwordGate, setPasswordGate] = useState<{ token: string; requireCurrentPassword: boolean } | null>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [resultsLoadState, setResultsLoadState] = useState<ResultsLoadState>('loading');
    const [resultsLoadError, setResultsLoadError] = useState<string | null>(null);

    useEffect(() => {
        if (!authStore.isLoggedIn) return;
        let active = true;
        const token = getStoredJWTToken('/api/account/me');
        const tokenPurpose = getJWTPurpose(token);

        callApi<{ data?: { mustChangePassword?: boolean } }>('get_account_profile')
            .then((response) => {
                if (active && response.data?.mustChangePassword && token) {
                    setPasswordGate({ token, requireCurrentPassword: tokenPurpose !== 'password_change' });
                }
            })
            .catch((error) => {
                if (!active) return;

                if (error instanceof ApiError && error.status === 401) {
                    authStore.logout();
                    setPasswordGate(null);
                    showError('Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.');
                    navigate('/', { replace: true });
                    return;
                }

                if (token && (tokenPurpose === 'password_change' || String(error).includes('Password change required'))) {
                    setPasswordGate({ token, requireCurrentPassword: tokenPurpose !== 'password_change' });
                }
            });

        return () => { active = false; };
    }, [authStore.isLoggedIn, authStore.username]);

    const loadTeacherResults = React.useCallback(async () => {
        setResultsLoadState('loading');
        setResultsLoadError(null);
        useQuizStore.getState().setError(null);
        await useQuizStore.getState().loadResults();

        const loadError = useQuizStore.getState().error;
        if (loadError) {
            setResultsLoadState('error');
            setResultsLoadError(loadError);
            return;
        }

        setResultsLoadState('success');
    }, []);

    // 🔐 ANTI-CHEAT: Disable answer stripping for teacher views
    // Also force reload quizzes from server to get fresh data with answers
    useEffect(() => {
        setStripAnswersEnabled(false);

        // Force reload quizzes from server to ensure we have answers
        // This prevents stale data with stripped answers from being used
        cacheService.invalidatePrefix('quizzes:');
        quizStore.loadQuizzes();

        // AUTO-LOAD RESULTS for Teacher Dashboard so it's not empty
        void loadTeacherResults();

        // Check JWT expiry on mount
        checkAndWarnJWTExpiry();

        // Check JWT expiry every 5 minutes
        const expiryCheckInterval = setInterval(() => {
            checkAndWarnJWTExpiry();
        }, 5 * 60 * 1000);

        return () => {
            setStripAnswersEnabled(true);
            clearInterval(expiryCheckInterval);
        };
    }, [loadTeacherResults]);

    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

    useEffect(() => {
        if (!isGiftShopFeatureEnabled && activeTab === 'gift-shop') {
            setActiveTab('overview');
        }
        if (!authStore.isAdmin && ['announcements', 'teachers', 'admin-templates', 'math-audit'].includes(activeTab)) {
            setActiveTab('overview');
        }
    }, [isGiftShopFeatureEnabled, activeTab, authStore.isAdmin, setActiveTab]);

    // Editing state
    const [editingQuiz, setEditingQuiz] = useState<Quiz | null>(null);

    // Access Code Edit Modal state
    const [editingAccessCode, setEditingAccessCode] = useState<{ quizId: string; currentCode: string } | null>(null);
    const [newAccessCode, setNewAccessCode] = useState('');

    const teacherDisplayName = (authStore.teacherName || '').trim() || authStore.username || 'Giáo viên';
    const teacherInitial = teacherDisplayName.charAt(0).toUpperCase();

    // Filter results by the exact normalized class name to avoid leaking another class's data.
    const filteredResultsByClass = authStore.isAdmin || !authStore.teacherClass
        ? quizStore.results
        : quizStore.results.filter((result) => (
            areClassNamesEqual(result.studentClass, authStore.teacherClass)
        ));

    // Dynamic title logic based on activeTab
    const getPageTitle = () => {
        switch (activeTab) {
            case 'overview': return 'Tổng quan';
            case 'manage': return 'Đề kiểm tra';
            case 'results': return 'Kết quả học tập';
            case 'classes': return 'Quản lý Lớp học';
            case 'assignments': return 'Giao bài tập';
            case 'create': return 'Tạo đề mới';
            case 'ioe': return 'Tạo đề IOE';
            case 'ioe-manage': return 'Quản lý IOE';
            case 'ioe-results': return 'Kết quả IOE';
            case 'announcements': return 'Cài đặt & Thông báo';
            case 'teachers': return 'Quản lý Giáo viên';
            case 'personal-settings': return 'Cài đặt cá nhân';
            case 'gift-shop': return 'Tiệm Tạp Hóa';
            case 'homework': return 'Phiếu bài tập (AI)';
            case 'math-audit': return 'Theo dõi lỗi công thức';
            case 'live-exam': return 'Thi Trực Tiếp';
            default: return 'Bảng điều khiển';
        }
    };

    const handleDashboardSearch = (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        const normalizedQuery = searchQuery.trim().toLocaleLowerCase('vi-VN');
        if (!normalizedQuery) return;

        const destination = DASHBOARD_SEARCH_ITEMS.find((item) => {
            const searchableText = `${item.label} ${item.keywords}`.toLocaleLowerCase('vi-VN');
            return searchableText.includes(normalizedQuery);
        });

        if (!destination) {
            showError('Không tìm thấy chức năng phù hợp.');
            return;
        }

        setActiveTab(destination.tab);
        setSearchQuery('');
    };

    // Handle update access code
    const handleUpdateAccessCode = async () => {
        if (!editingAccessCode) return;

        const quiz = quizStore.quizzes.find(q => q.id === editingAccessCode.quizId);
        if (!quiz) return;

        const hasCode = newAccessCode.trim().length > 0;
        const updatedQuiz = {
            ...quiz,
            accessCode: hasCode ? newAccessCode.toUpperCase() : undefined,
            requireCode: hasCode,
        };

        try {
            await quizStore.modifyQuiz(updatedQuiz);
            setEditingAccessCode(null);
            setNewAccessCode('');
            showSuccess('Cap nhat ma lam bai thanh cong!');
        } catch (err: unknown) {
            const normalizedError = err instanceof Error ? err : new Error(String(err));
            showError('Loi khi cap nhat: ' + (normalizedError.message || 'Unknown error'));
        }
    };

    const handleLogout = () => {
        clearAssignmentComposerDraft();
        setActiveTab('overview');
        authStore.logout();
        useClassroomStore.getState().logoutStudent();
        quizStore.setView('home');
    };

    return (
        <div className="min-h-screen bg-slate-50 flex flex-col lg:flex-row">

            {passwordGate && (
                <PasswordChangeDialog
                    forced
                    authToken={passwordGate.token}
                    requireCurrentPassword={passwordGate.requireCurrentPassword}
                    onComplete={(token) => {
                        authStore.loginSuccess(
                            authStore.username || '',
                            authStore.teacherName || authStore.username || '',
                            authStore.isAdmin,
                            authStore.teacherClass,
                            token,
                        );
                        setPasswordGate(null);
                    }}
                />
            )}

            <CurrentAnnouncementBanner role="teacher" />

            {/* Lệch Sidebar */}
            <Sidebar
                activeTab={activeTab}
                setActiveTab={(tab) => {
                    if (tab === 'create') setEditingQuiz(null); // Clear editing state when creating new
                    setActiveTab(tab);
                }}
                isGiftShopEnabled={isGiftShopFeatureEnabled}
                onLogout={handleLogout}
                isMobileOpen={isMobileMenuOpen}
                setIsMobileOpen={setIsMobileMenuOpen}
            />

            {/* Main Content wrapper */}
            <div className="flex-1 lg:ml-64 flex flex-col min-h-screen transition-all duration-300 pb-20 lg:pb-0">

                {/* Top Header / Top Bar */}
                <header className="h-16 bg-white/90 backdrop-blur border-b border-slate-200 sticky top-0 z-30 flex items-center justify-between px-4 lg:px-8">
                    {/* Page Title */}
                    <div className="flex items-center">
                        {/* Title removed per user request */}
                    </div>

                    {/* Right side: Search, Notifications, Profile */}
                    <div className="flex items-center gap-2 md:gap-4">
                        <form onSubmit={handleDashboardSearch} className="relative hidden md:block">
                            <label htmlFor="teacher-dashboard-search" className="sr-only">Tìm chức năng</label>
                            <input
                                id="teacher-dashboard-search"
                                type="search"
                                list="teacher-dashboard-search-options"
                                value={searchQuery}
                                onChange={(event) => setSearchQuery(event.target.value)}
                                placeholder="Tìm chức năng..."
                                className="w-52 rounded-full border border-slate-200 bg-slate-100 py-2 pl-4 pr-10 text-sm outline-none transition-all focus:border-blue-400 focus:ring-2 focus:ring-blue-500 lg:w-64"
                            />
                            <button
                                type="submit"
                                aria-label="Tìm chức năng"
                                className="absolute right-1 top-1/2 inline-flex size-8 -translate-y-1/2 items-center justify-center rounded-full text-slate-400 hover:bg-white hover:text-blue-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
                            >
                                <Search aria-hidden="true" className="size-4" />
                            </button>
                            <datalist id="teacher-dashboard-search-options">
                                {DASHBOARD_SEARCH_ITEMS.map((item) => (
                                    <option key={item.tab} value={item.label} />
                                ))}
                            </datalist>
                        </form>

                        <button
                            type="button"
                            aria-label="Mở cài đặt thông báo"
                            title="Thông báo"
                            onClick={() => setActiveTab('announcements')}
                            className={`hidden size-10 items-center justify-center rounded-full text-slate-500 transition-colors hover:bg-slate-100 hover:text-blue-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 sm:inline-flex ${activeTab === 'announcements' ? 'bg-blue-50 text-blue-600' : ''}`}
                        >
                            <Bell aria-hidden="true" className="size-5" />
                        </button>

                        <details className="group relative border-l border-slate-200 pl-3 sm:pl-4">
                            <summary
                                aria-label={`Mở menu tài khoản của ${teacherDisplayName}`}
                                className="flex min-h-11 cursor-pointer list-none items-center gap-3 rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 [&::-webkit-details-marker]:hidden"
                            >
                                <span className="hidden flex-col items-end sm:flex">
                                    <span className="text-sm font-bold leading-tight text-slate-700">{teacherDisplayName}</span>
                                    <span className="text-[10px] font-bold uppercase tracking-wider text-blue-600">
                                        {authStore.isAdmin ? 'Quản trị viên' : 'Giáo viên'}
                                    </span>
                                </span>
                                <span className="flex size-10 items-center justify-center rounded-full border-2 border-white bg-gradient-to-br from-blue-500 to-indigo-600 font-bold text-white shadow-sm transition-transform group-open:scale-105">
                                    {teacherInitial}
                                </span>
                            </summary>

                            <div className="absolute right-0 top-full z-50 mt-2 w-56 overflow-hidden rounded-2xl border border-slate-200 bg-white opacity-0 invisible shadow-xl transition-all group-open:visible group-open:opacity-100">
                                <div className="border-b border-slate-100 bg-slate-50/80 p-4">
                                    <p className="mb-1 text-xs text-slate-400">Tài khoản</p>
                                    <p className="truncate text-sm font-bold text-slate-800">{teacherDisplayName}</p>
                                </div>
                                <div className="p-2">
                                    <button
                                        type="button"
                                        onClick={handleLogout}
                                        className="flex min-h-11 w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-red-600 transition-colors hover:bg-red-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500"
                                    >
                                        <X aria-hidden="true" className="size-4" />
                                        Đăng xuất
                                    </button>
                                </div>
                            </div>
                        </details>
                    </div>
                </header>

                {/* Content View */}
                <main className="flex-1 p-3 sm:p-5 lg:p-10 overflow-x-hidden">
                    <ErrorBoundary onReset={() => setActiveTab('overview')}>
                        <Suspense fallback={
                            <div className="flex items-center justify-center py-20 h-full">
                                <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
                            </div>
                        }>
                            {activeTab === 'overview' && (
                                <OverviewTab
                                    resultsLoadState={resultsLoadState}
                                    resultsError={resultsLoadError}
                                    onRetryResults={loadTeacherResults}
                                />
                            )}

                            {activeTab === 'results' && (
                                <ResultsTab
                                    results={filteredResultsByClass}
                                    quizzes={quizStore.quizzes}
                                    onRefresh={async () => {
                                        await loadTeacherResults();
                                        return useQuizStore.getState().results;
                                    }}
                                />
                            )}

                            {activeTab === 'manage' && (
                                <ManageTab
                                    quizzes={quizStore.quizzes}
                                    onDelete={quizStore.removeQuiz}
                                    onEdit={(quiz) => {
                                        setEditingQuiz(quiz);
                                        setActiveTab('create');
                                    }}
                                    onManageCode={(quizId, currentCode) => {
                                        setEditingAccessCode({ quizId, currentCode });
                                        setNewAccessCode(currentCode);
                                    }}
                                />
                            )}

                            {activeTab === 'create' && (
                                <CreateTab
                                    editingQuiz={editingQuiz}
                                    onSaveQuiz={quizStore.createQuiz}
                                    onUpdateQuiz={quizStore.modifyQuiz}
                                    onSuccess={() => {
                                        setEditingQuiz(null);
                                        setActiveTab('manage');
                                    }}
                                />
                            )}

                            {activeTab === 'ioe' && (
                                <IoeTab
                                    onSaveQuiz={quizStore.createQuiz}
                                    onSuccess={() => {
                                        setActiveTab('ioe-manage');
                                    }}
                                />
                            )}

                            {activeTab === 'ioe-manage' && (
                                <IoeManageTab />
                            )}

                            {activeTab === 'ioe-results' && (
                                <IoeResultsTab />
                            )}

                            {activeTab === 'announcements' && authStore.isAdmin && (
                                <div className="max-w-4xl mx-auto">
                                    <AnnouncementSettings />
                                </div>
                            )}

                            {activeTab === 'classes' && (
                                <ClassManagementTab isAdmin={authStore.isAdmin || false} username={authStore.username || null} />
                            )}

                            {activeTab === 'assignments' && (
                                <AssignmentTab />
                            )}

                            {activeTab === 'teachers' && authStore.isAdmin && (
                                <TeacherManagementTab />
                            )}

                            {activeTab === 'personal-settings' && (
                                <PersonalSettingsTab />
                            )}

                            {activeTab === 'gift-shop' && isGiftShopFeatureEnabled && (
                                <GiftShopTab />
                            )}

                            {activeTab === 'homework' && (
                                <HomeworkTab />
                            )}

                            {activeTab === 'live-exam' && (
                                <LiveExamTab />
                            )}

                            {activeTab === 'certificates' && (
                                <TeacherCertificatesPage />
                            )}

                            {activeTab === 'admin-templates' && authStore.isAdmin && (
                                <AdminTemplatesPage />
                            )}

                            {activeTab === 'math-audit' && authStore.isAdmin && (
                                <MathAuditPage />
                            )}

                        </Suspense>
                    </ErrorBoundary>
                </main>
                <div className="hidden lg:block">
                    <Footer onNavigate={(path) => navigate(path)} showPublicLinks={false} />
                </div>
            </div>

            <BottomNavigation
                activeTab={activeTab}
                setActiveTab={(tab) => {
                    if (tab === 'create') setEditingQuiz(null);
                    setActiveTab(tab);
                }}
                onToggleMenu={() => setIsMobileMenuOpen(true)}
            />

            {/* Access Code Edit Modal */}
            {editingAccessCode && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
                    <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6">
                        <div className="flex items-center justify-between mb-6">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-purple-100 rounded-xl">
                                    <Key className="w-6 h-6 text-purple-600" />
                                </div>
                                <h2 className="text-xl font-bold text-gray-800">Cập nhật mã làm bài</h2>
                            </div>
                            <button
                                onClick={() => setEditingAccessCode(null)}
                                className="p-2 hover:bg-gray-100 rounded-full"
                            >
                                <X className="w-5 h-5 text-gray-500" />
                            </button>
                        </div>

                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Mã hiện tại
                                </label>
                                <div className="px-3 py-2 bg-gray-100 rounded-lg text-gray-600 font-mono">
                                    {editingAccessCode.currentCode || '(Chưa có mã)'}
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Mã mới
                                </label>
                                <input
                                    type="text"
                                    value={newAccessCode}
                                    onChange={(e) => setNewAccessCode(e.target.value.toUpperCase())}
                                    placeholder="Nhập mã mới (VD: TOAN3A)"
                                    className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none uppercase font-mono transition-all"
                                    maxLength={10}
                                />
                                <p className="text-xs text-gray-500 mt-2">
                                    Để trống nếu muốn xóa mã. Học sinh cần nhập đúng mã này để làm bài.
                                </p>
                            </div>

                            <div className="flex gap-3 pt-4">
                                <Button
                                    onClick={() => setEditingAccessCode(null)}
                                    variant="secondary"
                                    className="flex-1"
                                >
                                    Hủy
                                </Button>
                                <Button
                                    onClick={handleUpdateAccessCode}
                                    variant="primary"
                                    className="flex-1"
                                    icon={<Save className="w-4 h-4" />}
                                >
                                    Lưu mã
                                </Button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default TeacherDashboard;
