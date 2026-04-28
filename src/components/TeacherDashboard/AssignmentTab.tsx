import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useClassroomStore } from '../../stores/useClassroomStore';
import { useAuthStore } from '../../../stores/authStore';
import { useQuizStore } from '../../../stores/quizStore';
import {
    CreateAssignmentPayload,
    Classroom,
    SmartAssignmentWarning,
} from '../../types/classroom.types';
import { Quiz } from '../../types';
import {
    ClipboardList, CalendarClock, Send, X, Loader2,
    CheckCircle2, BookOpen, Users, AlertTriangle
} from 'lucide-react';
import { Button } from '../common';
import { showConfirm } from '../../utils/toast';
import SmartAssignmentInsightCard, {
    type SmartAssignmentInsightViewModel,
} from './SmartAssignmentInsightCard';
import { buildSmartAssignmentInsightModel } from './buildSmartAssignmentInsightModel';
import AssignmentTrackingSection from './AssignmentTrackingSection';
import {
    type AssignmentComposerDraft,
    useTeacherDashboardUIStore,
} from '../../stores/useTeacherDashboardUIStore';

// ==========================================
// ASSIGNMENT TAB (Main)
// ==========================================

const AssignmentTab: React.FC = () => {
    const authStore = useAuthStore();
    const store = useClassroomStore();
    const quizStore = useQuizStore();
    const assignmentComposerDraft = useTeacherDashboardUIStore((state) => state.assignmentComposerDraft);
    const clearAssignmentComposerDraft = useTeacherDashboardUIStore((state) => state.clearAssignmentComposerDraft);

    const refreshAssignments = async () => {
        if (!authStore.username) return;
        if (authStore.isAdmin) {
            await store.fetchAllAssignments();
            return;
        }
        await store.fetchTeacherAssignments(authStore.username);
    };

    // Load data on mount
    useEffect(() => {
        if (!authStore.username) return;
        if (authStore.isAdmin) {
            store.fetchClasses();
            store.fetchAllAssignments();
            return;
        }
        store.fetchClasses(authStore.username);
        store.fetchTeacherAssignments(authStore.username);
    }, [authStore.username, authStore.isAdmin]);

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
                draft={assignmentComposerDraft}
                onClearDraft={clearAssignmentComposerDraft}
                onCreateAssignment={async (payload) => {
                    const result = await store.addAssignment(payload);
                    if (result) {
                        await refreshAssignments();
                    }
                    return !!result;
                }}
                isLoading={store.isLoading}
            />

            {/* Section 2: Assignment Tracking */}
            <AssignmentTrackingSection
                assignments={store.assignments}
                onDelete={async (id) => {
                    showConfirm({
                        message: 'Xoa bai giao nay?',
                        confirmLabel: 'Xoa',
                        destructive: true,
                        onConfirm: async () => {
                            const ok = await store.removeAssignment(id);
                            if (ok) {
                                await refreshAssignments();
                            }
                        },
                    });
                }}
                onUpdateDeadline={async (assignmentId, newDeadline) => {
                    const ok = await store.updateAssignmentDeadline(assignmentId, newDeadline);
                    if (ok) {
                        await refreshAssignments();
                    }
                    return ok;
                }}
                onUpdateStatus={async (assignmentId, newStatus) => {
                    const ok = await store.updateAssignmentStatus(assignmentId, newStatus);
                    if (ok) {
                        await refreshAssignments();
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
    draft: AssignmentComposerDraft | null;
    onClearDraft: () => void;
    onCreateAssignment: (payload: CreateAssignmentPayload) => Promise<boolean>;
    isLoading: boolean;
}> = ({ classes, quizzes, draft, onClearDraft, onCreateAssignment, isLoading }) => {
    const [selectedQuizId, setSelectedQuizId] = useState('');
    const [selectedClassId, setSelectedClassId] = useState('');
    const [selectedStudentId, setSelectedStudentId] = useState(''); // New state for student
    const [deadline, setDeadline] = useState('');
    const [maxAttempts, setMaxAttempts] = useState(1);
    const [showSuccess, setShowSuccess] = useState(false);
    const [activeDraft, setActiveDraft] = useState<AssignmentComposerDraft | null>(null);
    const [manualNotice, setManualNotice] = useState<string | null>(null);
    const [draftWarnings, setDraftWarnings] = useState<SmartAssignmentWarning[]>([]);
    const lastHydratedDraftRef = useRef<string | null>(null);
    const isHydratingDraftRef = useRef(false);

    // Get students for selected class from store
    const store = useClassroomStore();
    const studentsInClass = store.students[selectedClassId] || [];

    const getDefaultDeadline = () => {
        const nextDeadline = new Date();
        nextDeadline.setDate(nextDeadline.getDate() + 7);
        nextDeadline.setHours(23, 59, 0, 0);
        return nextDeadline.toISOString().slice(0, 16);
    };

    const appendDraftWarning = (warning: SmartAssignmentWarning) => {
        setDraftWarnings((current) => {
            if (current.some((item) => item.code === warning.code && item.message === warning.message)) {
                return current;
            }
            return [...current, warning];
        });
    };

    const clearDraftState = (options?: { keepFormValues?: boolean; manualNotice?: string }) => {
        setActiveDraft(null);
        setDraftWarnings([]);
        onClearDraft();

        if (options?.manualNotice) {
            setManualNotice(options.manualNotice);
        }

        if (!options?.keepFormValues) {
            setSelectedQuizId('');
            setSelectedClassId('');
            setSelectedStudentId('');
            setDeadline(getDefaultDeadline());
            setMaxAttempts(1);
        }
    };

    // Fetch students when a class is selected
    useEffect(() => {
        if (!selectedClassId) {
            if (!isHydratingDraftRef.current) {
                setSelectedStudentId('');
            }
            return;
        }

        store.fetchStudents(selectedClassId);

        if (isHydratingDraftRef.current) {
            isHydratingDraftRef.current = false;
            return;
        }

        setSelectedStudentId(''); // Reset student selection when class changes
    }, [selectedClassId]);

    // Set default deadline to 7 days from now
    useEffect(() => {
        setDeadline(getDefaultDeadline());
    }, []);

    useEffect(() => {
        if (!draft || lastHydratedDraftRef.current === draft.createdAt) {
            return;
        }

        isHydratingDraftRef.current = true;
        lastHydratedDraftRef.current = draft.createdAt;
        setManualNotice(null);
        setActiveDraft(draft);
        setDraftWarnings(draft.warnings || []);
        setSelectedQuizId(draft.quizId);
        setSelectedClassId(draft.classId);
        setSelectedStudentId(draft.studentId || '');
        setDeadline(new Date(draft.deadline).toISOString().slice(0, 16));
        setMaxAttempts(draft.maxAttempts);
    }, [draft]);

    useEffect(() => {
        if (!activeDraft) return;

        if (quizzes.length > 0 && !quizzes.some((quiz) => quiz.id === activeDraft.quizId)) {
            setSelectedQuizId('');
            appendDraftWarning({
                code: 'QUIZ_NOT_FOUND',
                message: 'De goi y khong con ton tai. Thay co vui long chon mot de khac.',
            });
        }

        if (classes.length > 0 && !classes.some((classroom) => classroom.id === activeDraft.classId)) {
            setSelectedClassId('');
            setSelectedStudentId('');
            clearDraftState({
                keepFormValues: true,
                manualNotice: 'Khong tim thay lop tu goi y nay. He thong da quay ve che do giao bai thu cong.',
            });
        }
    }, [activeDraft, classes, quizzes]);

    useEffect(() => {
        if (!activeDraft || !activeDraft.studentId || selectedClassId !== activeDraft.classId) return;
        if (!store.students[activeDraft.classId]) return;

        const hasStudent = (store.students[activeDraft.classId] || []).some((student) => student.id === activeDraft.studentId);
        if (!hasStudent) {
            setSelectedStudentId('');
            clearDraftState({
                keepFormValues: true,
                manualNotice: 'Khong tim thay hoc sinh trong lop nay nua. He thong da giu lai de va lop de thay co giao thu cong.',
            });
        }
    }, [activeDraft, selectedClassId, store.students]);

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
            setDeadline(getDefaultDeadline());
            setMaxAttempts(1);
            setManualNotice(null);
            if (activeDraft) {
                clearDraftState({ keepFormValues: true });
            }
            setShowSuccess(true);
            setTimeout(() => setShowSuccess(false), 3000);
        }
    };

    const selectedQuiz = quizzes.find(q => q.id === selectedQuizId);
    const selectedRecommendedQuiz = activeDraft?.recommendedQuizzes?.find((quiz) => quiz.quizId === selectedQuizId);
    const recommendedQuizIds = useMemo(
        () => new Set((activeDraft?.recommendedQuizzes || []).map((quiz) => quiz.quizId)),
        [activeDraft?.recommendedQuizzes],
    );
    const orderedQuizzes = useMemo(() => {
        if (!activeDraft?.recommendedQuizzes?.length) {
            return quizzes;
        }

        const recommendationOrder = new Map(
            activeDraft.recommendedQuizzes.map((quiz, index) => [quiz.quizId, index]),
        );

        return [...quizzes].sort((left, right) => {
            const leftOrder = recommendationOrder.get(left.id);
            const rightOrder = recommendationOrder.get(right.id);

            if (leftOrder !== undefined && rightOrder !== undefined) {
                return leftOrder - rightOrder;
            }

            if (leftOrder !== undefined) return -1;
            if (rightOrder !== undefined) return 1;

            return left.title.localeCompare(right.title);
        });
    }, [activeDraft?.recommendedQuizzes, quizzes]);

    const recommendationUsesTagsFallback = Boolean(selectedRecommendedQuiz?.matchBreakdown.matchedViaTags);
    const recommendationHasExplicitSkillMatch = Boolean(
        selectedRecommendedQuiz?.matchBreakdown.subskillMatched || selectedRecommendedQuiz?.matchBreakdown.skillMatched,
    );
    const tagsFallbackMessage = recommendationHasExplicitSkillMatch
        ? 'He thong van co khop ky nang, nhung mot phan diem de xuat dang duoc bo tro boi tags cu. Neu thay co muon chac hon, hay xem nhanh vai cau dau truoc khi giao bai.'
        : 'Question bank hien chua co metadata ky nang day du cho de nay. He thong dang suy luan chu yeu tu tags cu, vi vay thay co nen xem nhanh 2-3 cau dau truoc khi giao bai.';
    const insightModel = useMemo<SmartAssignmentInsightViewModel | null>(() => buildSmartAssignmentInsightModel({
        activeDraft,
        quizzes,
        selectedQuizId,
        selectedClassId,
        selectedStudentId,
        selectedRecommendedQuiz,
        draftWarnings,
        manualNotice,
        tagsFallbackMessage,
    }), [
        activeDraft,
        draftWarnings,
        manualNotice,
        selectedClassId,
        selectedQuizId,
        selectedRecommendedQuiz,
        selectedStudentId,
        tagsFallbackMessage,
        quizzes,
    ]);

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

            {manualNotice && (
                <div className="mb-4 flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                    <AlertTriangle className="mt-0.5 h-4 w-4 flex-shrink-0" />
                    <p>{manualNotice}</p>
                </div>
            )}

            {insightModel && (
                <SmartAssignmentInsightCard
                    model={insightModel}
                    actions={(
                        <button
                            type="button"
                            onClick={() => clearDraftState({ keepFormValues: true })}
                            className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50"
                        >
                            <X className="h-4 w-4" />
                            Bo goi y
                        </button>
                    )}
                />
            )}

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
                        {orderedQuizzes.map((q) => (
                            <option key={q.id} value={q.id}>
                                {recommendedQuizIds.has(q.id) ? '[Goi y] ' : ''}{q.title} ({q.questions?.length || 0} câu)
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


export default AssignmentTab;


