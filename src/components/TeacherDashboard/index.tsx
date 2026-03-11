import React, { useState, Suspense, useEffect } from 'react';
import { Quiz } from '../../types';
import { Button, ErrorBoundary } from '../common';
import { Key, X, Save, Loader2, Bell, Search } from 'lucide-react';
import { useAuthStore } from '../../../stores/authStore';
import { useQuizStore } from '../../../stores/quizStore';
import { setStripAnswersEnabled } from '../../services/googleSheetService';
import { cacheService } from '../../services/CacheService';
import Sidebar from './Sidebar';

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

const TeacherDashboard: React.FC = () => {
    // --- STORES ---
    const authStore = useAuthStore();
    const quizStore = useQuizStore();

    // 🔐 ANTI-CHEAT: Disable answer stripping for teacher views
    // Also force reload quizzes from server to get fresh data with answers
    useEffect(() => {
        setStripAnswersEnabled(false);

        // Force reload quizzes from server to ensure we have answers
        // This prevents stale data with stripped answers from being used
        cacheService.invalidatePrefix('quizzes:');
        quizStore.loadQuizzes();

        // AUTO-LOAD RESULTS for Teacher Dashboard so it's not empty
        quizStore.loadResults();

        return () => {
            setStripAnswersEnabled(true);
        };
    }, []);

    // Tab state (Default to 'overview' now instead of 'results')
    const [activeTab, setActiveTab] = useState<string>('overview');

    // Editing state
    const [editingQuiz, setEditingQuiz] = useState<Quiz | null>(null);

    // Access Code Edit Modal state
    const [editingAccessCode, setEditingAccessCode] = useState<{ quizId: string; currentCode: string } | null>(null);
    const [newAccessCode, setNewAccessCode] = useState('');

    // Filter results by teacherClass (Flexible matching: case-insensitive & partial)
    const filteredResultsByClass = authStore.isAdmin || !authStore.teacherClass
        ? quizStore.results
        : quizStore.results.filter(r => {
            const stuClass = (r.studentClass || '').toLowerCase().replace(/\s+/g, '');
            const teaClass = (authStore.teacherClass || '').toLowerCase().replace(/\s+/g, '');
            // E.g., if teacher is "3A" and student inputs "3A " or "3a"
            return stuClass.includes(teaClass) || teaClass.includes(stuClass);
        });

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
            default: return 'Bảng điều khiển';
        }
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
            alert('Đã cập nhật mã làm bài thành công!');
        } catch (err: any) {
            alert('Lỗi khi cập nhật: ' + (err.message || 'Unknown error'));
        }
    };

    const handleLogout = () => {
        authStore.logout();
        quizStore.setView('home');
    };

    return (
        <div className="min-h-screen bg-slate-50 flex flex-col lg:flex-row">

            {/* Lệch Sidebar */}
            <Sidebar
                activeTab={activeTab}
                setActiveTab={(tab) => {
                    if (tab === 'create') setEditingQuiz(null); // Clear editing state when creating new
                    setActiveTab(tab);
                }}
                onLogout={handleLogout}
            />

            {/* Main Content wrapper */}
            <div className="flex-1 lg:ml-64 flex flex-col min-h-screen transition-all duration-300">

                {/* Top Header / Top Bar */}
                <header className="h-16 bg-white border-b border-gray-200 sticky top-0 z-30 flex items-center justify-between px-4 lg:px-8 mt-16 lg:mt-0 shadow-sm">
                    {/* Page Title */}
                    <div className="flex items-center">
                        <h1 className="text-xl font-bold text-slate-800 tracking-tight hidden lg:block">
                            {getPageTitle()}
                        </h1>
                    </div>

                    {/* Right side: Search, Notifications, Profile */}
                    <div className="flex items-center gap-4">
                        <div className="hidden md:flex relative">
                            <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                            <input
                                type="text"
                                placeholder="Tìm kiếm..."
                                className="pl-9 pr-4 py-2 bg-slate-100 border-none rounded-full text-sm focus:ring-2 focus:ring-orange-500 w-48 lg:w-64 outline-none transition-all"
                            />
                        </div>

                        <button className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full relative transition-colors">
                            <Bell className="w-5 h-5" />
                            <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-orange-500 rounded-full border-2 border-white"></span>
                        </button>

                        {/* User Avatar Mini */}
                        <div className="w-8 h-8 rounded-full bg-orange-100 text-orange-600 font-bold flex items-center justify-center border border-orange-200">
                            {authStore.teacherName?.charAt(0)?.toUpperCase()}
                        </div>
                    </div>
                </header>

                {/* Content View */}
                <main className="flex-1 p-4 lg:p-8 overflow-x-hidden">
                    <ErrorBoundary onReset={() => setActiveTab('overview')}>
                        <Suspense fallback={
                            <div className="flex items-center justify-center py-20 h-full">
                                <Loader2 className="w-8 h-8 text-orange-500 animate-spin" />
                            </div>
                        }>
                            {activeTab === 'overview' && (
                                <OverviewTab />
                            )}

                            {activeTab === 'results' && (
                                <ResultsTab
                                    results={filteredResultsByClass}
                                    quizzes={quizStore.quizzes}
                                    onRefresh={async () => {
                                        await quizStore.loadResults();
                                        return quizStore.results;
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

                            {activeTab === 'announcements' && (
                                <div className="max-w-4xl mx-auto">
                                    <AnnouncementSettings />
                                </div>
                            )}

                            {activeTab === 'classes' && (
                                <ClassManagementTab />
                            )}

                            {activeTab === 'assignments' && (
                                <AssignmentTab />
                            )}

                            {activeTab === 'teachers' && (
                                <TeacherManagementTab />
                            )}

                        </Suspense>
                    </ErrorBoundary>
                </main>
            </div>

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
                                    className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-orange-500 outline-none uppercase font-mono transition-all"
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
