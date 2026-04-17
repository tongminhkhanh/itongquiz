import React, { useState, useRef, useEffect } from 'react';
import { Quiz } from '../../types';
import { Card, Button } from '../common';
import { useQuizManager } from '../../hooks';
import { Search, Key, Edit, Trash2, RefreshCw, Lock, Tag, Copy, Send, MoreVertical, Eye, X, Loader2, CheckCircle2 } from 'lucide-react';
import { useQuizStore } from '../../../stores/quizStore';
import { useAuthStore } from '../../../stores/authStore';
import { useClassroomStore } from '../../stores/useClassroomStore';
import { SUBJECT_CONFIG } from '../HomePage/StudentDashboardUI';
import { showError, showConfirm, showSuccess } from '../../utils/toast';

// Category tabs config for teacher filter
const CATEGORY_TABS = [
    { key: 'all', label: 'Tất cả', icon: '📚' },
    ...Object.entries(SUBJECT_CONFIG).map(([key, config]) => ({
        key,
        label: config.title,
        icon: config.icon,
    })),
];

interface ManageTabProps {
    quizzes: Quiz[];
    onDelete?: (quizId: string) => Promise<void>;
    onEdit: (quiz: Quiz) => void;
    onManageCode: (quizId: string, currentCode: string) => void;
}

// ============ Dropdown Menu Component ============
const DropdownMenu: React.FC<{
    quiz: Quiz;
    onManageCode: (quizId: string, currentCode: string) => void;
    onEdit: (quiz: Quiz) => void;
    onDelete: (quizId: string) => void;
    isDeleting: boolean;
}> = ({ quiz, onManageCode, onEdit, onDelete, isDeleting }) => {
    const [isOpen, setIsOpen] = useState(false);
    const menuRef = useRef<HTMLDivElement>(null);

    // Close dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
                setIsOpen(false);
            }
        };
        if (isOpen) document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [isOpen]);

    return (
        <div className="relative" ref={menuRef}>
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="p-2 rounded-lg text-gray-500 hover:bg-gray-100 hover:text-gray-700 transition-colors"
                title="Tùy chọn khác"
            >
                <MoreVertical className="w-4 h-4" />
            </button>
            {isOpen && (
                <div className="absolute right-0 top-full mt-1 w-44 bg-white border border-gray-200 rounded-xl shadow-xl z-50 py-1 animate-in fade-in slide-in-from-top-2">
                    <button
                        onClick={() => { onManageCode(quiz.id, quiz.accessCode || ''); setIsOpen(false); }}
                        className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-gray-700 hover:bg-purple-50 hover:text-purple-700 transition-colors"
                    >
                        <Key className="w-4 h-4" /> Quản lý mã
                    </button>
                    <button
                        onClick={() => {
                            window.open(`${window.location.origin}?quizId=${quiz.id}`, '_blank');
                            setIsOpen(false);
                        }}
                        className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-gray-700 hover:bg-blue-50 hover:text-blue-700 transition-colors"
                    >
                        <Eye className="w-4 h-4" /> Xem trước
                    </button>
                    <button
                        onClick={() => { onEdit(quiz); setIsOpen(false); }}
                        className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-gray-700 hover:bg-orange-50 hover:text-orange-700 transition-colors"
                    >
                        <Edit className="w-4 h-4" /> Sửa đề
                    </button>
                    <div className="my-1 border-t border-gray-100" />
                    <button
                        onClick={() => { onDelete(quiz.id); setIsOpen(false); }}
                        disabled={isDeleting}
                        className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 transition-colors disabled:opacity-50"
                    >
                        <Trash2 className="w-4 h-4" />
                        {isDeleting ? 'Đang xóa...' : 'Xóa đề'}
                    </button>
                </div>
            )}
        </div>
    );
};

// ============ Quick Assign Modal Component ============
const QuickAssignModal: React.FC<{
    quiz: Quiz;
    onClose: () => void;
}> = ({ quiz, onClose }) => {
    const authStore = useAuthStore();
    const classroomStore = useClassroomStore();
    const [selectedClassId, setSelectedClassId] = useState('');
    const [deadline, setDeadline] = useState('');
    const [maxAttempts, setMaxAttempts] = useState(1);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [success, setSuccess] = useState(false);

    // Fetch classes on mount
    useEffect(() => {
        if (authStore.isAdmin) {
            classroomStore.fetchClasses();
        } else if (authStore.username) {
            classroomStore.fetchClasses(authStore.username);
        }
        // Set default deadline to tomorrow
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        tomorrow.setHours(23, 59, 0, 0);
        setDeadline(tomorrow.toISOString().slice(0, 16));
    }, [authStore.isAdmin, authStore.username]);

    const handleSubmit = async () => {
        if (!selectedClassId || !deadline) return;
        setIsSubmitting(true);
        try {
            const result = await classroomStore.addAssignment({
                quizId: quiz.id,
                classId: selectedClassId,
                deadline: new Date(deadline).toISOString(),
                maxAttempts,
            });
            if (result) {
                setSuccess(true);
                setTimeout(onClose, 1500);
            }
        } catch (err) {
            // Handled
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={onClose}>
            <div
                className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div className="bg-gradient-to-r from-orange-500 to-amber-500 px-6 py-4 flex items-center justify-between">
                    <div>
                        <h3 className="text-white font-bold text-lg">🚀 Giao bài nhanh</h3>
                        <p className="text-orange-100 text-sm mt-0.5 truncate max-w-[280px]">{quiz.title}</p>
                    </div>
                    <button onClick={onClose} className="text-white/80 hover:text-white p-1 rounded-lg hover:bg-white/20 transition-colors">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {success ? (
                    <div className="px-6 py-10 flex flex-col items-center gap-3">
                        <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center">
                            <CheckCircle2 className="w-8 h-8 text-green-600" />
                        </div>
                        <p className="text-green-700 font-semibold text-lg">Giao bài thành công!</p>
                    </div>
                ) : (
                    <div className="px-6 py-5 space-y-4">
                        {/* Select Class */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1.5">Chọn lớp</label>
                            <select
                                value={selectedClassId}
                                onChange={(e) => setSelectedClassId(e.target.value)}
                                className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-orange-500 bg-gray-50 transition-colors"
                            >
                                <option value="">-- Chọn lớp --</option>
                                {classroomStore.classes.map((c) => (
                                    <option key={c.id} value={c.id}>{c.name}</option>
                                ))}
                            </select>
                        </div>

                        {/* Deadline */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1.5">Hạn nộp</label>
                            <input
                                type="datetime-local"
                                value={deadline}
                                onChange={(e) => setDeadline(e.target.value)}
                                className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-orange-500 bg-gray-50 transition-colors"
                            />
                        </div>

                        {/* Max Attempts */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1.5">Số lần làm bài tối đa</label>
                            <select
                                value={maxAttempts}
                                onChange={(e) => setMaxAttempts(Number(e.target.value))}
                                className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-orange-500 bg-gray-50 transition-colors"
                            >
                                {[1, 2, 3, 5, 10].map(n => (
                                    <option key={n} value={n}>{n} lần</option>
                                ))}
                            </select>
                        </div>

                        {/* Submit Button */}
                        <button
                            onClick={handleSubmit}
                            disabled={!selectedClassId || !deadline || isSubmitting}
                            className="w-full py-3 rounded-xl font-semibold text-white bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2 shadow-lg shadow-orange-200"
                        >
                            {isSubmitting ? (
                                <><Loader2 className="w-5 h-5 animate-spin" /> Đang giao...</>
                            ) : (
                                <><Send className="w-5 h-5" /> Giao ngay</>
                            )}
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
};

// ============ Main ManageTab Component ============
const ManageTab: React.FC<ManageTabProps> = ({ quizzes, onDelete, onEdit, onManageCode }) => {
    // Auth store - to check class permissions
    const authStore = useAuthStore();
    const quizStore = useQuizStore();

    // Check if teacher is locked to a specific class
    const isClassLocked = !authStore.isAdmin && !!authStore.teacherClass;
    const teacherClass = authStore.teacherClass;

    // Helper function to check if user can manage this quiz
    const canManageQuiz = (quiz: Quiz): boolean => {
        if (authStore.isAdmin) return true;
        if (!teacherClass) return true;
        return quiz.classLevel === teacherClass;
    };

    // Use custom hooks for quiz management
    const quizManagerHook = useQuizManager({
        quizzes,
        onDelete: onDelete,
    });

    const [isRefreshing, setIsRefreshing] = useState(false);
    const [duplicatingId, setDuplicatingId] = useState<string | null>(null);
    const [assigningQuiz, setAssigningQuiz] = useState<Quiz | null>(null);

    const handleRefresh = async () => {
        setIsRefreshing(true);
        try {
            await quizStore.loadQuizzes();
        } finally {
            setIsRefreshing(false);
        }
    };


    const handleDuplicate = async (quiz: Quiz) => {
        showConfirm({
            message: `Nhan ban de "${quiz.title}"?`,
            confirmLabel: 'Nhan ban',
            onConfirm: async () => {
                setDuplicatingId(quiz.id);
                try {
                    const ok = await quizStore.duplicateQuiz(quiz.id);
                    if (ok) {
                        showSuccess('Nhan ban de thanh cong!');
                    } else {
                        showError('Khong the nhan ban de. Vui long thu lai.');
                    }
                } finally {
                    setDuplicatingId(null);
                }
            },
        });
    };


    return (
        <div className="space-y-4">
            {/* Quick Assign Modal */}
            {assigningQuiz && (
                <QuickAssignModal quiz={assigningQuiz} onClose={() => setAssigningQuiz(null)} />
            )}

            {/* Category Filter Tabs */}
            <div className="flex flex-wrap gap-2 pb-2 border-b border-gray-100">
                {CATEGORY_TABS.map((tab) => (
                    <button
                        key={tab.key}
                        onClick={() => { quizManagerHook.setFilterCategory(tab.key); quizManagerHook.setPage(1); }}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium transition-all ${quizManagerHook.filterCategory === tab.key
                            ? 'bg-orange-500 text-white shadow-sm'
                            : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                            }`}
                    >
                        {tab.key === 'all' ? (
                            <span>{tab.icon}</span>
                        ) : (
                            <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>{tab.icon}</span>
                        )}
                        {tab.label}
                    </button>
                ))}
            </div>

            {/* Filters */}
            <div className="flex flex-wrap items-center gap-4">
                <div className="relative flex-1 max-w-md">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                        type="text"
                        value={quizManagerHook.searchTerm}
                        onChange={(e) => quizManagerHook.setSearchTerm(e.target.value)}
                        placeholder="Tìm kiếm bài kiểm tra... (gõ #tag để tìm theo nhãn)"
                        className="w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-orange-500"
                    />
                </div>

                <select
                    value={quizManagerHook.filterLevel}
                    onChange={(e) => quizManagerHook.setFilterLevel(e.target.value)}
                    className="px-4 py-2 border rounded-lg focus:ring-2 focus:ring-orange-500"
                >
                    <option value="All">Tất cả lớp</option>
                    {['1', '2', '3', '4', '5'].map(level => (
                        <option key={level} value={level}>Lớp {level}</option>
                    ))}
                </select>

                <Button
                    onClick={handleRefresh}
                    variant="ghost"
                    size="sm"
                    disabled={isRefreshing}
                    className="text-blue-600 hover:bg-blue-50"
                    icon={<RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />}
                >
                    {isRefreshing ? 'Đang tải...' : 'Làm mới'}
                </Button>
            </div>

            {/* Quiz List */}
            <div className="grid gap-4">
                {quizManagerHook.paginatedQuizzes.map((quiz) => (
                    <Card key={quiz.id} className="hover:shadow-md transition-shadow">
                        <div className="flex items-center justify-between">
                            <div className="flex-1 min-w-0">
                                <a
                                    href={`${window.location.origin}?quizId=${quiz.id}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="font-semibold text-gray-800 hover:text-orange-600 hover:underline cursor-pointer transition-colors"
                                    title="Bấm để mở trang làm bài của học sinh"
                                >
                                    {quiz.title}
                                </a>
                                <p className="text-sm text-gray-500">
                                    Lớp {quiz.classLevel} • {quiz.questions.length} câu • {quiz.timeLimit} phút
                                    {quiz.accessCode && ` • Mã: ${quiz.accessCode}`}
                                </p>
                                {/* Tags display */}
                                {(() => {
                                    const rawTags = (quiz as any).tags;
                                    const tags: string[] = typeof rawTags === 'string' ? (rawTags ? JSON.parse(rawTags) : []) : (rawTags || []);
                                    if (tags.length === 0) return null;
                                    return (
                                        <div className="flex flex-wrap gap-1 mt-1">
                                            {tags.map((tag: string, idx: number) => (
                                                <span key={idx} className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full text-xs font-medium bg-blue-50 text-blue-600">
                                                    <Tag className="w-3 h-3" />
                                                    {tag}
                                                </span>
                                            ))}
                                        </div>
                                    );
                                })()}
                                <p className="text-xs text-gray-400 mt-1">
                                    Tạo: {new Date(quiz.createdAt).toLocaleString('vi-VN', {
                                        day: '2-digit',
                                        month: '2-digit',
                                        year: 'numeric',
                                        hour: '2-digit',
                                        minute: '2-digit'
                                    })}
                                    {quiz.createdBy && <span className="ml-2">• Bởi: <span className="text-blue-600 font-medium">{quiz.createdBy}</span></span>}
                                </p>
                            </div>

                            <div className="flex items-center gap-1.5 ml-3 flex-shrink-0">
                                {canManageQuiz(quiz) ? (
                                    <>
                                        {/* Quick Assign Button - Primary Action */}
                                        <button
                                            onClick={() => setAssigningQuiz(quiz)}
                                            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-semibold text-white bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 shadow-sm hover:shadow-md transition-all"
                                            title="Giao bài nhanh"
                                        >
                                            <Send className="w-3.5 h-3.5" />
                                            <span className="hidden sm:inline">Giao bài</span>
                                        </button>

                                        {/* Duplicate Button */}
                                        <button
                                            onClick={() => handleDuplicate(quiz)}
                                            disabled={duplicatingId === quiz.id}
                                            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 transition-all disabled:opacity-50"
                                            title="Nhân bản đề"
                                        >
                                            {duplicatingId === quiz.id ? (
                                                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                            ) : (
                                                <Copy className="w-3.5 h-3.5" />
                                            )}
                                            <span className="hidden sm:inline">{duplicatingId === quiz.id ? 'Đang sao...' : 'Nhân bản'}</span>
                                        </button>

                                        {/* More Options Dropdown */}
                                        <DropdownMenu
                                            quiz={quiz}
                                            onManageCode={onManageCode}
                                            onEdit={onEdit}
                                            onDelete={quizManagerHook.handleDelete}
                                            isDeleting={quizManagerHook.deletingId === quiz.id}
                                        />
                                    </>
                                ) : (
                                    <span className="flex items-center gap-1 text-xs text-gray-400 px-2 py-1 bg-gray-100 rounded-lg">
                                        <Lock className="w-3 h-3" />
                                        Lớp {quiz.classLevel}
                                    </span>
                                )}
                            </div>
                        </div>
                    </Card>
                ))}

                {quizManagerHook.paginatedQuizzes.length === 0 && (
                    <div className="text-center py-12 text-gray-500">
                        Không có bài kiểm tra nào.
                    </div>
                )}
            </div>

            {/* Pagination */}
            {quizManagerHook.totalPages > 1 && (
                <div className="flex items-center justify-center gap-2">
                    {Array.from({ length: quizManagerHook.totalPages }, (_, i) => i + 1).map((page) => (
                        <button
                            key={page}
                            onClick={() => quizManagerHook.setPage(page)}
                            className={`px-3 py-1 rounded ${page === quizManagerHook.page
                                ? 'bg-orange-600 text-white'
                                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                                }`}
                        >
                            {page}
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
};

export default ManageTab;
