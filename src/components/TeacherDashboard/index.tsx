import React, { useState, Suspense } from 'react';
import { Quiz } from '../../types';
import { Tabs, TabItem, Button, ErrorBoundary } from '../common';
import { LogOut, FileText, List, Settings, Bot, Key, X, Save, Loader2, FileUp } from 'lucide-react';
import { useAuthStore } from '../../../stores/authStore';
import { useQuizStore } from '../../../stores/quizStore';

// Lazy load tab components
const ResultsTab = React.lazy(() => import('./ResultsTab'));
const ManageTab = React.lazy(() => import('./ManageTab'));
const CreateTab = React.lazy(() => import('./CreateTab'));
const PdfTab = React.lazy(() => import('./PdfTab'));

const TeacherDashboard: React.FC = () => {
    // --- STORES ---
    const authStore = useAuthStore();
    const quizStore = useQuizStore();

    // Tab state
    const [activeTab, setActiveTab] = useState<string>('results');

    // Editing state
    const [editingQuiz, setEditingQuiz] = useState<Quiz | null>(null);

    // Access Code Edit Modal state
    const [editingAccessCode, setEditingAccessCode] = useState<{ quizId: string; currentCode: string } | null>(null);
    const [newAccessCode, setNewAccessCode] = useState('');

    // Filter results by teacherClass
    const filteredResultsByClass = authStore.isAdmin || !authStore.teacherClass
        ? quizStore.results
        : quizStore.results.filter(r => r.studentClass === authStore.teacherClass);

    // Tab configuration
    const allTabs: TabItem[] = [
        { id: 'results', label: 'Kết quả', icon: <FileText className="w-4 h-4" /> },
        { id: 'manage', label: 'Quản lý đề', icon: <List className="w-4 h-4" /> },
        { id: 'create', label: 'Tạo đề mới', icon: <Settings className="w-4 h-4" /> },
        { id: 'pdfCreate', label: 'Tạo đề PDF', icon: <FileUp className="w-4 h-4" /> },
    ];

    const tabs = authStore.isAdmin ? allTabs : allTabs.filter(tab => tab.id === 'results');

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
        <div className="min-h-screen bg-gradient-to-br from-orange-50 via-white to-amber-50">
            {/* Header */}
            <header className="bg-white/90 backdrop-blur-md border-b border-gray-200 sticky top-0 z-40">
                <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-orange-100 rounded-xl">
                            <Bot className="w-6 h-6 text-orange-600" />
                        </div>
                        <div>
                            <h1 className="text-xl font-bold text-gray-800">Giáo viên - Trường TH Ít Ong</h1>
                            <p className="text-sm text-gray-500">Quản lý đề kiểm tra</p>
                        </div>
                    </div>

                    <Button
                        onClick={handleLogout}
                        variant="ghost"
                        icon={<LogOut className="w-4 h-4" />}
                    >
                        Đăng xuất
                    </Button>
                </div>
            </header>

            {/* Main Content */}
            <main className="max-w-7xl mx-auto px-4 py-6">
                <div className="mb-6">
                    <Tabs
                        tabs={tabs}
                        activeTab={activeTab}
                        onChange={setActiveTab}
                        variant="pills"
                    />
                </div>

                <ErrorBoundary onReset={() => setActiveTab('manage')}>
                    <Suspense fallback={
                        <div className="flex items-center justify-center py-12">
                            <Loader2 className="w-8 h-8 text-orange-500 animate-spin" />
                        </div>
                    }>
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

                        {activeTab === 'pdfCreate' && (
                            <PdfTab
                                onSaveQuiz={quizStore.createQuiz}
                                onSuccess={() => {
                                    setActiveTab('manage');
                                }}
                            />
                        )}
                    </Suspense>
                </ErrorBoundary>
            </main>

            {/* Access Code Edit Modal */}
            {editingAccessCode && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
                    <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6 mx-4">
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
                                <div className="px-3 py-2 bg-gray-100 rounded-lg text-gray-600">
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
                                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 uppercase"
                                    maxLength={10}
                                />
                                <p className="text-xs text-gray-500 mt-1">
                                    Để trống nếu muốn xóa mã. Học sinh cần nhập đúng mã này để làm bài.
                                </p>
                            </div>

                            <div className="flex gap-3 pt-2">
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
