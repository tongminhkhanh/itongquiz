import React, { useState, useEffect } from 'react';
import { Quiz } from '../../types';
import { Card, Button } from '../common';
import { fetchIoeQuizzes, deleteIoeQuiz, updateIoeQuiz } from '../../services/ioeSheetService';
import { Search, Trash2, Copy, Check, RefreshCw, Link2, Globe, Edit3, X, Save } from 'lucide-react';

interface IoeManageTabProps {
    onEdit?: (quiz: Quiz) => void;
}

const IoeManageTab: React.FC<IoeManageTabProps> = ({ onEdit }) => {
    // State
    const [quizzes, setQuizzes] = useState<Quiz[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [filterLevel, setFilterLevel] = useState('All');
    const [copiedId, setCopiedId] = useState<string | null>(null);
    const [deletingId, setDeletingId] = useState<string | null>(null);

    // Edit modal state
    const [editingQuiz, setEditingQuiz] = useState<Quiz | null>(null);
    const [editForm, setEditForm] = useState({
        title: '',
        examCode: '',
        timeLimit: 15,
        classLevel: '3'
    });
    const [isSaving, setIsSaving] = useState(false);
    const [saveError, setSaveError] = useState<string | null>(null);

    // Load quizzes on mount
    useEffect(() => {
        loadQuizzes();
    }, []);

    const loadQuizzes = async () => {
        setIsLoading(true);
        try {
            const data = await fetchIoeQuizzes();
            setQuizzes(data);
        } catch (error) {
            console.error('[IOE ManageTab] Error loading quizzes:', error);
        } finally {
            setIsLoading(false);
        }
    };

    // Filter quizzes
    const filteredQuizzes = quizzes.filter(quiz => {
        const matchesSearch = quiz.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
            (quiz.examCode || '').toLowerCase().includes(searchTerm.toLowerCase());
        const matchesLevel = filterLevel === 'All' || quiz.classLevel === filterLevel;
        return matchesSearch && matchesLevel;
    });

    // Handle delete
    const handleDelete = async (quizId: string) => {
        if (!confirm('Bạn có chắc muốn xóa đề thi IOE này?')) return;

        setDeletingId(quizId);
        try {
            const success = await deleteIoeQuiz(quizId);
            if (success) {
                setQuizzes(prev => prev.filter(q => q.id !== quizId));
            } else {
                alert('Không thể xóa đề thi. Vui lòng thử lại.');
            }
        } catch (error) {
            console.error('[IOE ManageTab] Delete error:', error);
            alert('Lỗi khi xóa đề thi.');
        } finally {
            setDeletingId(null);
        }
    };

    // Handle copy link
    const handleCopyLink = async (quizId: string) => {
        const link = `${window.location.origin}/?quiz=${quizId}`;
        try {
            await navigator.clipboard.writeText(link);
            setCopiedId(quizId);
            setTimeout(() => setCopiedId(null), 2000);
        } catch (error) {
            console.error('Failed to copy:', error);
        }
    };

    // Handle open edit modal
    const handleOpenEdit = (quiz: Quiz) => {
        setEditingQuiz(quiz);
        setEditForm({
            title: quiz.title,
            examCode: quiz.examCode || '',
            timeLimit: quiz.timeLimit,
            classLevel: quiz.classLevel
        });
        setSaveError(null);
    };

    // Handle save edit
    const handleSaveEdit = async () => {
        if (!editingQuiz) return;
        if (!editForm.title.trim()) {
            setSaveError('Vui lòng nhập tên đề');
            return;
        }

        setIsSaving(true);
        setSaveError(null);

        try {
            const updatedQuiz: Quiz = {
                ...editingQuiz,
                title: editForm.title.trim(),
                examCode: editForm.examCode.trim() || undefined,
                timeLimit: editForm.timeLimit,
                classLevel: editForm.classLevel
            };

            const success = await updateIoeQuiz(updatedQuiz);
            if (success) {
                // Update local state
                setQuizzes(prev => prev.map(q => q.id === updatedQuiz.id ? updatedQuiz : q));
                setEditingQuiz(null);
            } else {
                setSaveError('Không thể lưu. Vui lòng thử lại.');
            }
        } catch (error) {
            console.error('[IOE ManageTab] Save error:', error);
            setSaveError('Lỗi khi lưu đề thi.');
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div className="space-y-4">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-blue-100 rounded-xl">
                        <Globe className="w-6 h-6 text-blue-600" />
                    </div>
                    <div>
                        <h2 className="text-xl font-bold text-gray-800">Quản lý đề IOE</h2>
                        <p className="text-sm text-gray-500">{quizzes.length} đề thi</p>
                    </div>
                </div>
                <Button
                    onClick={loadQuizzes}
                    loading={isLoading}
                    variant="secondary"
                    icon={<RefreshCw className="w-4 h-4" />}
                >
                    Làm mới
                </Button>
            </div>

            {/* Filters */}
            <div className="flex flex-wrap items-center gap-4">
                <div className="relative flex-1 max-w-md">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                        type="text"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        placeholder="Tìm kiếm đề IOE hoặc mã đề..."
                        className="w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                </div>

                <select
                    value={filterLevel}
                    onChange={(e) => setFilterLevel(e.target.value)}
                    className="px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                    <option value="All">Tất cả lớp</option>
                    {['1', '2', '3', '4', '5'].map(level => (
                        <option key={level} value={level}>Lớp {level}</option>
                    ))}
                </select>
            </div>

            {/* Quiz List */}
            {isLoading ? (
                <div className="text-center py-12">
                    <RefreshCw className="w-8 h-8 text-blue-500 animate-spin mx-auto mb-2" />
                    <p className="text-gray-500">Đang tải danh sách đề IOE...</p>
                </div>
            ) : filteredQuizzes.length === 0 ? (
                <div className="text-center py-12 text-gray-500">
                    <Globe className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                    <p>Chưa có đề thi IOE nào.</p>
                    <p className="text-sm mt-1">Hãy tạo đề mới trong tab "Tạo đề IOE"</p>
                </div>
            ) : (
                <div className="grid gap-4">
                    {filteredQuizzes.map((quiz) => (
                        <Card key={quiz.id} className="hover:shadow-md transition-shadow">
                            <div className="flex items-center justify-between">
                                <div className="flex-1">
                                    <div className="flex items-center gap-2 flex-wrap">
                                        <span className="text-lg">🌍</span>
                                        <a
                                            href={`${window.location.origin}/?quiz=${quiz.id}`}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="font-semibold text-gray-800 hover:text-blue-600 hover:underline transition-colors"
                                            title="Mở trang làm bài"
                                        >
                                            {quiz.title}
                                        </a>
                                        {quiz.examCode && (
                                            <span className="px-2 py-0.5 bg-amber-100 text-amber-700 text-xs font-bold rounded-full">
                                                {quiz.examCode}
                                            </span>
                                        )}
                                    </div>
                                    <p className="text-sm text-gray-500 mt-1">
                                        Lớp {quiz.classLevel} • {quiz.questions.length} câu • {quiz.timeLimit} phút
                                        {quiz.accessCode && ` • Mã vào: ${quiz.accessCode}`}
                                    </p>
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

                                <div className="flex items-center gap-2">
                                    <Button
                                        onClick={() => handleOpenEdit(quiz)}
                                        variant="ghost"
                                        size="sm"
                                        className="text-amber-600 hover:bg-amber-50"
                                        icon={<Edit3 className="w-4 h-4" />}
                                    >
                                        Sửa
                                    </Button>
                                    <Button
                                        onClick={() => handleCopyLink(quiz.id)}
                                        variant="ghost"
                                        size="sm"
                                        className="text-blue-600 hover:bg-blue-50"
                                        icon={copiedId === quiz.id ? <Check className="w-4 h-4" /> : <Link2 className="w-4 h-4" />}
                                    >
                                        {copiedId === quiz.id ? 'Đã copy!' : 'Copy link'}
                                    </Button>
                                    <Button
                                        onClick={() => handleDelete(quiz.id)}
                                        loading={deletingId === quiz.id}
                                        variant="ghost"
                                        size="sm"
                                        className="text-red-600 hover:bg-red-50"
                                        icon={<Trash2 className="w-4 h-4" />}
                                    >
                                        Xóa
                                    </Button>
                                </div>
                            </div>
                        </Card>
                    ))}
                </div>
            )}

            {/* Edit Modal */}
            {editingQuiz && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
                    <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-2xl animate-scale-in">
                        <div className="flex items-center justify-between mb-6">
                            <h3 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                                <Edit3 className="w-5 h-5 text-amber-500" />
                                Chỉnh sửa đề IOE
                            </h3>
                            <button
                                onClick={() => setEditingQuiz(null)}
                                className="p-1 hover:bg-gray-100 rounded-lg transition-colors"
                            >
                                <X className="w-5 h-5 text-gray-500" />
                            </button>
                        </div>

                        <div className="space-y-4">
                            {/* Title */}
                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-1">
                                    🏷️ Tên đề thi
                                </label>
                                <input
                                    type="text"
                                    value={editForm.title}
                                    onChange={(e) => setEditForm(prev => ({ ...prev, title: e.target.value }))}
                                    placeholder="VD: Đề luyện thi IOE Lớp 3"
                                    className="w-full p-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                />
                            </div>

                            {/* Exam Code */}
                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-1">
                                    🔢 Mã đề (tùy chọn)
                                </label>
                                <input
                                    type="text"
                                    value={editForm.examCode}
                                    onChange={(e) => setEditForm(prev => ({ ...prev, examCode: e.target.value }))}
                                    placeholder="VD: Mã 02, Vòng 1, Đề A..."
                                    className="w-full p-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                                />
                                <p className="text-xs text-gray-500 mt-1">Mã đề sẽ hiển thị trên tiêu đề bài thi</p>
                            </div>

                            {/* Class Level & Time */}
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-bold text-gray-700 mb-1">
                                        📚 Lớp
                                    </label>
                                    <select
                                        value={editForm.classLevel}
                                        onChange={(e) => setEditForm(prev => ({ ...prev, classLevel: e.target.value }))}
                                        className="w-full p-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500"
                                    >
                                        {['1', '2', '3', '4', '5'].map(l => (
                                            <option key={l} value={l}>Lớp {l}</option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-bold text-gray-700 mb-1">
                                        ⏰ Thời gian (phút)
                                    </label>
                                    <input
                                        type="number"
                                        min="1"
                                        max="120"
                                        value={editForm.timeLimit}
                                        onChange={(e) => setEditForm(prev => ({ ...prev, timeLimit: parseInt(e.target.value) || 15 }))}
                                        className="w-full p-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500"
                                    />
                                </div>
                            </div>

                            {/* Error */}
                            {saveError && (
                                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
                                    {saveError}
                                </div>
                            )}

                            {/* Buttons */}
                            <div className="flex gap-3 pt-2">
                                <Button
                                    onClick={() => setEditingQuiz(null)}
                                    variant="secondary"
                                    className="flex-1"
                                >
                                    Hủy
                                </Button>
                                <Button
                                    onClick={handleSaveEdit}
                                    loading={isSaving}
                                    variant="primary"
                                    className="flex-1 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600"
                                    icon={<Save className="w-4 h-4" />}
                                >
                                    Lưu thay đổi
                                </Button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default IoeManageTab;

