import React, { useState, useEffect, useMemo } from 'react';
import { useClassroomStore } from '../../stores/useClassroomStore';
import { useAuthStore } from '../../../stores/authStore';
import { useQuizStore } from '../../../stores/quizStore';
import { Assignment, CreateAssignmentPayload, Classroom } from '../../types/classroom.types';
import { Quiz } from '../../types';
import {
    ClipboardList, CalendarClock, Send, Trash2, X, Loader2,
    ChevronDown, Clock, CheckCircle2, AlertCircle, BookOpen, Users
} from 'lucide-react';
import { Button } from '../common';

// ==========================================
// ASSIGNMENT TAB (Main)
// ==========================================

const AssignmentTab: React.FC = () => {
    const authStore = useAuthStore();
    const store = useClassroomStore();
    const quizStore = useQuizStore();

    // Load data on mount
    useEffect(() => {
        if (authStore.username) {
            store.fetchClasses(authStore.username);
            store.fetchTeacherAssignments(authStore.username);
        }
    }, [authStore.username]);

    return (
        <div className="space-y-8">
            {/* Error */}
            {store.error && (
                <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-red-700 flex items-center justify-between">
                    <span>{store.error}</span>
                    <button onClick={store.clearError} className="text-red-400 hover:text-red-600">
                        <X className="w-4 h-4" />
                    </button>
                </div>
            )}

            {/* Section 1: Create Assignment */}
            <CreateAssignmentSection
                classes={store.classes}
                quizzes={quizStore.quizzes}
                onCreateAssignment={async (payload) => {
                    const result = await store.addAssignment(payload);
                    if (result && authStore.username) {
                        // Refresh assignment list after creation
                        await store.fetchTeacherAssignments(authStore.username);
                    }
                    return !!result;
                }}
                isLoading={store.isLoading}
            />

            {/* Section 2: Assignment Tracking */}
            <AssignmentTrackingSection
                assignments={store.assignments}
                onDelete={async (id) => {
                    if (confirm('Xóa bài giao này?')) {
                        const ok = await store.removeAssignment(id);
                        if (ok && authStore.username) {
                            await store.fetchTeacherAssignments(authStore.username);
                        }
                    }
                }}
                isLoading={store.isLoading}
            />
        </div>
    );
};

// ==========================================
// CREATE ASSIGNMENT SECTION
// ==========================================

const CreateAssignmentSection: React.FC<{
    classes: Classroom[];
    quizzes: Quiz[];
    onCreateAssignment: (payload: CreateAssignmentPayload) => Promise<boolean>;
    isLoading: boolean;
}> = ({ classes, quizzes, onCreateAssignment, isLoading }) => {
    const [selectedQuizId, setSelectedQuizId] = useState('');
    const [selectedClassId, setSelectedClassId] = useState('');
    const [deadline, setDeadline] = useState('');
    const [maxAttempts, setMaxAttempts] = useState(1);
    const [showSuccess, setShowSuccess] = useState(false);

    // Set default deadline to 7 days from now
    useEffect(() => {
        const d = new Date();
        d.setDate(d.getDate() + 7);
        d.setHours(23, 59, 0, 0);
        setDeadline(d.toISOString().slice(0, 16));
    }, []);

    const handleSubmit = async () => {
        if (!selectedQuizId || !selectedClassId || !deadline) return;

        const success = await onCreateAssignment({
            quizId: selectedQuizId,
            classId: selectedClassId,
            deadline: new Date(deadline).toISOString(),
            maxAttempts,
        });

        if (success) {
            setSelectedQuizId('');
            setSelectedClassId('');
            setShowSuccess(true);
            setTimeout(() => setShowSuccess(false), 3000);
        }
    };

    const selectedQuiz = quizzes.find(q => q.id === selectedQuizId);

    return (
        <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
            <div className="flex items-center gap-3 mb-6">
                <div className="p-2.5 bg-orange-50 rounded-xl">
                    <Send className="w-5 h-5 text-orange-500" />
                </div>
                <div>
                    <h2 className="text-xl font-bold text-gray-800">Giao bài tập</h2>
                    <p className="text-sm text-gray-400">Chọn đề, chọn lớp, đặt deadline</p>
                </div>
            </div>

            {/* Form Grid */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-5">
                {/* Quiz Selector */}
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">
                        <BookOpen className="w-3.5 h-3.5 inline mr-1 text-gray-400" />
                        Chọn đề bài
                    </label>
                    <select
                        value={selectedQuizId}
                        onChange={(e) => setSelectedQuizId(e.target.value)}
                        className="w-full px-4 py-3 border border-gray-200 rounded-xl bg-white focus:ring-2 focus:ring-orange-500 focus:border-orange-500 outline-none appearance-none cursor-pointer text-sm"
                    >
                        <option value="">-- Chọn đề --</option>
                        {quizzes.map((q) => (
                            <option key={q.id} value={q.id}>
                                {q.title} ({q.questions?.length || 0} câu)
                            </option>
                        ))}
                    </select>
                </div>

                {/* Class Selector */}
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">
                        <Users className="w-3.5 h-3.5 inline mr-1 text-gray-400" />
                        Chọn lớp
                    </label>
                    <select
                        value={selectedClassId}
                        onChange={(e) => setSelectedClassId(e.target.value)}
                        className="w-full px-4 py-3 border border-gray-200 rounded-xl bg-white focus:ring-2 focus:ring-orange-500 focus:border-orange-500 outline-none appearance-none cursor-pointer text-sm"
                    >
                        <option value="">-- Chọn lớp --</option>
                        {classes.map((c) => (
                            <option key={c.id} value={c.id}>
                                {c.name}
                            </option>
                        ))}
                    </select>
                    {classes.length === 0 && (
                        <p className="text-xs text-amber-500 mt-1">
                            Chưa có lớp. Tạo lớp ở tab "Lớp học" trước.
                        </p>
                    )}
                </div>

                {/* Deadline */}
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">
                        <CalendarClock className="w-3.5 h-3.5 inline mr-1 text-gray-400" />
                        Hạn nộp
                    </label>
                    <input
                        type="datetime-local"
                        value={deadline}
                        onChange={(e) => setDeadline(e.target.value)}
                        className="w-full px-4 py-3 border border-gray-200 rounded-xl bg-white focus:ring-2 focus:ring-orange-500 focus:border-orange-500 outline-none text-sm"
                    />
                </div>

                {/* Max Attempts */}
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">
                        <ClipboardList className="w-3.5 h-3.5 inline mr-1 text-gray-400" />
                        Số lượt làm bài
                    </label>
                    <input
                        type="number"
                        min={1}
                        max={10}
                        value={maxAttempts}
                        onChange={(e) => setMaxAttempts(Math.max(1, Math.min(10, Number(e.target.value) || 1)))}
                        className="w-full px-4 py-3 border border-gray-200 rounded-xl bg-white focus:ring-2 focus:ring-orange-500 focus:border-orange-500 outline-none text-sm"
                    />
                    <p className="text-xs text-gray-400 mt-1">Tối đa 10 lượt</p>
                </div>
            </div>

            {/* Selected Quiz Preview */}
            {selectedQuiz && (
                <div className="bg-orange-50/50 rounded-xl p-3 mb-4 flex items-center gap-3">
                    <BookOpen className="w-4 h-4 text-orange-400 flex-shrink-0" />
                    <div className="text-sm">
                        <span className="font-medium text-gray-700">{selectedQuiz.title}</span>
                        <span className="text-gray-400 ml-2">
                            • {selectedQuiz.questions?.length || 0} câu
                            • {selectedQuiz.timeLimit} phút
                        </span>
                    </div>
                </div>
            )}

            {/* Submit */}
            <div className="flex items-center gap-4">
                <Button
                    onClick={handleSubmit}
                    variant="primary"
                    disabled={!selectedQuizId || !selectedClassId || !deadline || isLoading}
                    icon={isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                >
                    {isLoading ? 'Đang giao...' : 'Giao bài'}
                </Button>

                {showSuccess && (
                    <span className="text-green-600 text-sm font-medium flex items-center gap-1 animate-in fade-in">
                        <CheckCircle2 className="w-4 h-4" /> Đã giao bài thành công!
                    </span>
                )}
            </div>
        </div>
    );
};

// ==========================================
// ASSIGNMENT TRACKING SECTION
// ==========================================

const AssignmentTrackingSection: React.FC<{
    assignments: Assignment[];
    onDelete: (id: string) => void;
    isLoading: boolean;
}> = ({ assignments, onDelete, isLoading }) => {

    // Sort: OPEN first, then by deadline
    const sorted = useMemo(() => {
        return [...assignments].sort((a, b) => {
            if (a.status === 'OPEN' && b.status !== 'OPEN') return -1;
            if (a.status !== 'OPEN' && b.status === 'OPEN') return 1;
            return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        });
    }, [assignments]);

    return (
        <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
            <div className="flex items-center gap-3 mb-6">
                <div className="p-2.5 bg-blue-50 rounded-xl">
                    <ClipboardList className="w-5 h-5 text-blue-500" />
                </div>
                <div>
                    <h2 className="text-xl font-bold text-gray-800">Theo dõi bài giao</h2>
                    <p className="text-sm text-gray-400">{assignments.length} bài tập đã giao</p>
                </div>
            </div>

            {/* Loading */}
            {isLoading && (
                <div className="flex items-center justify-center py-12">
                    <Loader2 className="w-8 h-8 text-orange-500 animate-spin" />
                </div>
            )}

            {/* Empty */}
            {!isLoading && assignments.length === 0 && (
                <div className="text-center py-12">
                    <ClipboardList className="w-14 h-14 text-gray-200 mx-auto mb-3" />
                    <p className="text-gray-400">Chưa giao bài tập nào</p>
                    <p className="text-gray-300 text-sm">Sử dụng form ở trên để giao bài</p>
                </div>
            )}

            {/* Table */}
            {!isLoading && sorted.length > 0 && (
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead>
                            <tr className="border-b border-gray-100 bg-gray-50/50">
                                <th className="text-left py-3 px-4 text-sm font-semibold text-gray-600">Đề bài</th>
                                <th className="text-left py-3 px-4 text-sm font-semibold text-gray-600">Lớp</th>
                                <th className="text-left py-3 px-4 text-sm font-semibold text-gray-600">Hạn nộp</th>
                                <th className="text-left py-3 px-4 text-sm font-semibold text-gray-600">Trạng thái</th>
                                <th className="text-left py-3 px-4 text-sm font-semibold text-gray-600">Tiến độ</th>
                                <th className="text-right py-3 px-4 text-sm font-semibold text-gray-600"></th>
                            </tr>
                        </thead>
                        <tbody>
                            {sorted.map((a) => (
                                <AssignmentRow key={a.id} assignment={a} onDelete={() => onDelete(a.id)} />
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
};

// ==========================================
// ASSIGNMENT ROW
// ==========================================

const AssignmentRow: React.FC<{
    assignment: Assignment;
    onDelete: () => void;
}> = ({ assignment, onDelete }) => {
    const isOpen = assignment.status === 'OPEN';
    const deadlineDate = new Date(assignment.deadline);
    const isOverdue = !isOpen || deadlineDate < new Date();
    const submitted = assignment.submittedCount ?? 0;
    const total = assignment.totalStudents ?? 0;
    const progress = total > 0 ? Math.round((submitted / total) * 100) : 0;

    // Format remaining time
    const getTimeRemaining = () => {
        if (!isOpen) return null;
        const diff = deadlineDate.getTime() - Date.now();
        if (diff <= 0) return 'Đã hết hạn';
        const hours = Math.floor(diff / (1000 * 60 * 60));
        const days = Math.floor(hours / 24);
        if (days > 0) return `Còn ${days} ngày`;
        return `Còn ${hours} giờ`;
    };

    const timeRemaining = getTimeRemaining();

    return (
        <tr className="border-b border-gray-50 hover:bg-orange-50/20 transition-colors">
            {/* Quiz Title */}
            <td className="py-3 px-4">
                <div className="font-medium text-gray-800 text-sm">
                    {assignment.quizTitle || assignment.quizId}
                </div>
            </td>

            {/* Class */}
            <td className="py-3 px-4">
                <span className="text-sm text-gray-600">
                    {assignment.className || assignment.classId}
                </span>
            </td>

            {/* Deadline */}
            <td className="py-3 px-4">
                <div className="text-sm text-gray-700">
                    {deadlineDate.toLocaleDateString('vi-VN', {
                        day: '2-digit',
                        month: '2-digit',
                        year: 'numeric',
                    })}
                </div>
                <div className="text-xs text-gray-400">
                    {deadlineDate.toLocaleTimeString('vi-VN', {
                        hour: '2-digit',
                        minute: '2-digit',
                    })}
                </div>
            </td>

            {/* Status */}
            <td className="py-3 px-4">
                <div className="flex items-center gap-2">
                    <span
                        className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium ${isOpen
                            ? 'bg-green-50 text-green-700 border border-green-200'
                            : 'bg-gray-100 text-gray-500 border border-gray-200'
                            }`}
                    >
                        {isOpen ? (
                            <><Clock className="w-3 h-3" /> Đang mở</>
                        ) : (
                            <><CheckCircle2 className="w-3 h-3" /> Đã đóng</>
                        )}
                    </span>
                    {isOpen && timeRemaining && (
                        <span className={`text-xs ${timeRemaining.includes('giờ') ? 'text-amber-500' : 'text-gray-400'
                            }`}>
                            {timeRemaining}
                        </span>
                    )}
                </div>
            </td>

            {/* Progress */}
            <td className="py-3 px-4">
                {total > 0 ? (
                    <div className="min-w-[120px]">
                        <div className="flex items-center justify-between text-xs mb-1">
                            <span className="text-gray-600 font-medium">{submitted}/{total} nộp</span>
                            <span className="text-gray-400">{progress}%</span>
                        </div>
                        <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
                            <div
                                className={`h-full rounded-full transition-all ${progress === 100
                                    ? 'bg-green-500'
                                    : progress > 50
                                        ? 'bg-blue-500'
                                        : 'bg-orange-400'
                                    }`}
                                style={{ width: `${progress}%` }}
                            />
                        </div>
                    </div>
                ) : (
                    <span className="text-xs text-gray-300">—</span>
                )}
            </td>

            {/* Actions */}
            <td className="py-3 px-4 text-right">
                <button
                    onClick={onDelete}
                    className="p-1.5 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                    title="Xóa bài giao"
                >
                    <Trash2 className="w-4 h-4" />
                </button>
            </td>
        </tr>
    );
};

export default AssignmentTab;
