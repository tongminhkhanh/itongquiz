import React, { useState, useEffect } from 'react';
import { Quiz } from '../../types';
import { Card, Button } from '../common';
import { fetchIoeQuizzes, deleteIoeQuiz } from '../../services/ioeSheetService';
import { Search, Trash2, Copy, Check, RefreshCw, Link2, Globe } from 'lucide-react';

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
        const matchesSearch = quiz.title.toLowerCase().includes(searchTerm.toLowerCase());
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
                        placeholder="Tìm kiếm đề IOE..."
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
                                    <div className="flex items-center gap-2">
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
                                    </div>
                                    <p className="text-sm text-gray-500 mt-1">
                                        Lớp {quiz.classLevel} • {quiz.questions.length} câu • {quiz.timeLimit} phút
                                        {quiz.accessCode && ` • Mã: ${quiz.accessCode}`}
                                    </p>
                                    <p className="text-xs text-gray-400 mt-1">
                                        Tạo: {new Date(quiz.createdAt).toLocaleDateString('vi-VN')}
                                    </p>
                                </div>

                                <div className="flex items-center gap-2">
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
        </div>
    );
};

export default IoeManageTab;
