import React, { useState, useEffect, useMemo } from 'react';
import { useClassroomStore } from '../../stores/useClassroomStore';
import { useAuthStore } from '../../../stores/authStore';
import { useQuizStore } from '../../../stores/quizStore';
import { Assignment, CreateAssignmentPayload, Classroom } from '../../types/classroom.types';
import { Quiz } from '../../types';
import {
    ClipboardList, CalendarClock, Send, Trash2, X, Loader2,
    ChevronDown, Clock, CheckCircle2, AlertCircle, BookOpen, Users, Edit3, Check
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
                onUpdateDeadline={async (assignmentId, newDeadline) => {
                    const ok = await store.updateAssignmentDeadline(assignmentId, newDeadline);
                    if (ok && authStore.username) {
                        await store.fetchTeacherAssignments(authStore.username);
                    }
                    return ok;
                }}
                onUpdateStatus={async (assignmentId, newStatus) => {
                    const ok = await store.updateAssignmentStatus(assignmentId, newStatus);
                    if (ok && authStore.username) {
                        await store.fetchTeacherAssignments(authStore.username);
                    }
                    return ok;
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
    const [selectedStudentId, setSelectedStudentId] = useState(''); // New state for student
    const [deadline, setDeadline] = useState('');
    const [maxAttempts, setMaxAttempts] = useState(1);
    const [showSuccess, setShowSuccess] = useState(false);

    // Get students for selected class from store
    const store = useClassroomStore();
    const studentsInClass = store.students[selectedClassId] || [];

    // Fetch students when a class is selected
    useEffect(() => {
        if (selectedClassId) {
            store.fetchStudents(selectedClassId);
            setSelectedStudentId(''); // Reset student selection when class changes
        }
    }, [selectedClassId]);

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
            studentId: selectedStudentId || undefined, // Include studentId if selected
            deadline: new Date(deadline).toISOString(),
            maxAttempts,
        });

        if (success) {
            setSelectedQuizId('');
            setSelectedClassId('');
            setSelectedStudentId('');
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
            <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-5">
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

                {/* Student Selector (Optional) */}
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5 flex justify-between items-center">
                        <span>
                            <Users className="w-3.5 h-3.5 inline mr-1 text-gray-400" />
                            Chọn học sinh
                        </span>
                        <span className="text-[10px] bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded">Tùy chọn</span>
                    </label>
                    <select
                        value={selectedStudentId}
                        onChange={(e) => setSelectedStudentId(e.target.value)}
                        disabled={!selectedClassId || studentsInClass.length === 0}
                        className="w-full px-4 py-3 border border-gray-200 rounded-xl bg-white focus:ring-2 focus:ring-orange-500 focus:border-orange-500 outline-none appearance-none cursor-pointer text-sm disabled:opacity-50 disabled:bg-gray-50 disabled:cursor-not-allowed"
                    >
                        <option value="">-- Cả lớp --</option>
                        {studentsInClass.map((s) => (
                            <option key={s.id} value={s.id}>
                                {s.fullName} ({s.username})
                            </option>
                        ))}
                    </select>
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
    onUpdateDeadline: (assignmentId: string, newDeadline: string) => Promise<boolean>;
    onUpdateStatus: (assignmentId: string, newStatus: 'OPEN' | 'CLOSED') => Promise<boolean>;
    isLoading: boolean;
}> = ({ assignments, onDelete, onUpdateDeadline, onUpdateStatus, isLoading }) => {

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
                                <th className="text-left py-3 px-4 text-sm font-semibold text-gray-600">Đối tượng</th>
                                <th className="text-left py-3 px-4 text-sm font-semibold text-gray-600">Hạn nộp</th>
                                <th className="text-left py-3 px-4 text-sm font-semibold text-gray-600">Trạng thái</th>
                                <th className="text-left py-3 px-4 text-sm font-semibold text-gray-600">Tiến độ</th>
                                <th className="text-right py-3 px-4 text-sm font-semibold text-gray-600"></th>
                            </tr>
                        </thead>
                        <tbody>
                            {sorted.map((a) => (
                                <AssignmentRow key={a.id} assignment={a} onDelete={() => onDelete(a.id)} onUpdateDeadline={onUpdateDeadline} onUpdateStatus={onUpdateStatus} />
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
    onUpdateDeadline: (assignmentId: string, newDeadline: string) => Promise<boolean>;
    onUpdateStatus: (assignmentId: string, newStatus: 'OPEN' | 'CLOSED') => Promise<boolean>;
}> = ({ assignment, onDelete, onUpdateDeadline, onUpdateStatus }) => {
    const [isEditing, setIsEditing] = useState(false);
    const [editDeadline, setEditDeadline] = useState('');
    const [isSaving, setIsSaving] = useState(false);

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

    const handleEditClick = () => {
        // Pre-fill with current deadline in datetime-local format
        setEditDeadline(deadlineDate.toISOString().slice(0, 16));
        setIsEditing(true);
    };

    // Handle re-opening: if deadline is expired, must extend deadline first
    const handleReopenClick = () => {
        // Default to 7 days from now
        const defaultNew = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
        setEditDeadline(defaultNew.toISOString().slice(0, 16));
        setIsEditing(true);
    };

    const handleSave = async () => {
        if (!editDeadline) return;
        setIsSaving(true);
        const newDeadlineISO = new Date(editDeadline).toISOString();
        const ok = await onUpdateDeadline(assignment.id, newDeadlineISO);
        // If the assignment was closed and new deadline is in the future, also set status to OPEN
        if (ok && !isOpen && new Date(editDeadline) > new Date()) {
            await onUpdateStatus(assignment.id, 'OPEN');
        }
        setIsSaving(false);
        if (ok) setIsEditing(false);
    };

    const handleCancel = () => {
        setIsEditing(false);
    };

    return (
        <tr className="border-b border-gray-50 hover:bg-orange-50/20 transition-colors">
            {/* Quiz Title */}
            <td className="py-3 px-4">
                <div className="font-medium text-gray-800 text-sm">
                    {assignment.quizTitle || assignment.quizId}
                </div>
            </td>

            {/* Target Audience (Class / Student) */}
            <td className="py-3 px-4">
                <div className="flex flex-col gap-1 items-start">
                    <span className="text-xs font-medium text-gray-600 bg-gray-100 px-2 py-0.5 rounded border border-gray-200">
                        Lớp {assignment.className || assignment.classId}
                    </span>
                    {assignment.studentName ? (
                        <span className="text-xs font-medium text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                            👤 {assignment.studentName}
                        </span>
                    ) : (
                        <span className="text-xs font-medium text-green-700 bg-green-50 px-2 py-0.5 rounded border border-green-200">
                            👥 Toàn lớp
                        </span>
                    )}
                </div>
            </td>

            {/* Deadline */}
            <td className="py-3 px-4">
                {isEditing ? (
                    <div className="flex items-center gap-1.5">
                        <input
                            type="datetime-local"
                            value={editDeadline}
                            onChange={(e) => setEditDeadline(e.target.value)}
                            className="px-2 py-1.5 border border-orange-300 rounded-lg bg-orange-50 focus:ring-2 focus:ring-orange-500 focus:border-orange-500 outline-none text-xs w-44"
                        />
                        <button
                            onClick={handleSave}
                            disabled={isSaving}
                            className="p-1 text-green-600 hover:bg-green-50 rounded-md transition-colors disabled:opacity-50"
                            title="Lưu"
                        >
                            {isSaving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                        </button>
                        <button
                            onClick={handleCancel}
                            className="p-1 text-gray-400 hover:bg-gray-100 rounded-md transition-colors"
                            title="Hủy"
                        >
                            <X className="w-3.5 h-3.5" />
                        </button>
                    </div>
                ) : (
                    <div className="flex items-center gap-1.5 group">
                        <div>
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
                        </div>
                        <button
                            onClick={handleEditClick}
                            className="p-1 text-gray-300 hover:text-orange-500 hover:bg-orange-50 rounded-md transition-colors opacity-0 group-hover:opacity-100"
                            title="Sửa hạn nộp"
                        >
                            <Edit3 className="w-3.5 h-3.5" />
                        </button>
                    </div>
                )}
            </td>

            {/* Status - Clickable to toggle */}
            <td className="py-3 px-4">
                <div className="flex items-center gap-2">
                    <button
                        onClick={() => {
                            if (isOpen) {
                                // Closing: just toggle
                                onUpdateStatus(assignment.id, 'CLOSED');
                            } else {
                                // Re-opening: must extend deadline first
                                handleReopenClick();
                            }
                        }}
                        className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium cursor-pointer transition-all hover:shadow-sm ${isOpen
                            ? 'bg-green-50 text-green-700 border border-green-200 hover:bg-green-100'
                            : 'bg-gray-100 text-gray-500 border border-gray-200 hover:bg-gray-200'
                            }`}
                        title={isOpen ? 'Bấm để đóng bài' : 'Bấm để mở lại (cần gia hạn deadline)'}
                    >
                        {isOpen ? (
                            <><Clock className="w-3 h-3" /> Đang mở</>
                        ) : (
                            <><CheckCircle2 className="w-3 h-3" /> Đã đóng</>
                        )}
                    </button>
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
