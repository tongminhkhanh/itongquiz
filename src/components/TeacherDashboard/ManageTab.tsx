import React from 'react';
import { Quiz } from '../../types';
import { Card, Button } from '../common';
import { useQuizManager } from '../../hooks';
import { Search, Key, Edit, Trash2 } from 'lucide-react';

interface ManageTabProps {
    quizzes: Quiz[];
    onDelete?: (quizId: string) => Promise<void>;
    onEdit: (quiz: Quiz) => void;
    onManageCode: (quizId: string, currentCode: string) => void;
}

const ManageTab: React.FC<ManageTabProps> = ({ quizzes, onDelete, onEdit, onManageCode }) => {
    // Use custom hooks for quiz management
    const quizManagerHook = useQuizManager({
        quizzes,
        onDelete: onDelete,
    });

    return (
        <div className="space-y-4">
            {/* Filters */}
            <div className="flex flex-wrap items-center gap-4">
                <div className="relative flex-1 max-w-md">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                        type="text"
                        value={quizManagerHook.searchTerm}
                        onChange={(e) => quizManagerHook.setSearchTerm(e.target.value)}
                        placeholder="Tìm kiếm bài kiểm tra..."
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
            </div>

            {/* Quiz List */}
            <div className="grid gap-4">
                {quizManagerHook.paginatedQuizzes.map((quiz) => (
                    <Card key={quiz.id} className="hover:shadow-md transition-shadow">
                        <div className="flex items-center justify-between">
                            <div className="flex-1">
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
                                <p className="text-xs text-gray-400 mt-1">
                                    Tạo: {new Date(quiz.createdAt).toLocaleDateString('vi-VN')}
                                </p>
                            </div>

                            <div className="flex items-center gap-2">
                                <Button
                                    onClick={() => onManageCode(quiz.id, quiz.accessCode || '')}
                                    variant="ghost"
                                    size="sm"
                                    className="text-purple-600 hover:bg-purple-50"
                                    icon={<Key className="w-4 h-4" />}
                                >
                                    Mã
                                </Button>
                                <Button
                                    onClick={() => onEdit(quiz)}
                                    variant="ghost"
                                    size="sm"
                                    icon={<Edit className="w-4 h-4" />}
                                >
                                    Sửa
                                </Button>
                                <Button
                                    onClick={() => quizManagerHook.handleDelete(quiz.id)}
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
