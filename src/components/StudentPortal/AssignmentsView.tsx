import React, { useEffect, useState } from 'react';
import { useClassroomStore } from '../../stores/useClassroomStore';
import { useQuizStore } from '../../../stores/quizStore'; // Adjusted import path
import { Assignment } from '../../types/classroom.types';
import { cacheService } from '../../services/CacheService';
import { LogOut, BookOpen, Clock, AlertCircle, CheckCircle, Loader2, Home } from 'lucide-react';
import AvatarSelectorModal from '../common/AvatarSelectorModal';
import { getAvatarUrl } from '../../config/avatars';


const AssignmentsView: React.FC = () => {
    const store = useClassroomStore();
    const quizStore = useQuizStore();
    const { studentSession, assignments } = store;
    const [loadingQuizId, setLoadingQuizId] = useState<string | null>(null);
    const [showAvatarModal, setShowAvatarModal] = useState(false);

    useEffect(() => {
        if (studentSession) {
            store.fetchStudentAssignments(studentSession.studentId);
            // Ensure quizzes are loaded fresh (not stale from localStorage cache)
            quizStore.loadQuizzes();
        }
    }, [studentSession]);

    const handleStartQuiz = async (assignment: Assignment) => {
        if (!studentSession || loadingQuizId) return;
        setLoadingQuizId(assignment.id);

        // 1. Re-fetch latest assignment data from server
        await store.fetchStudentAssignments(studentSession.studentId);
        const freshAssignments = useClassroomStore.getState().assignments;
        const freshAssignment = freshAssignments.find(a => a.id === assignment.id);

        if (freshAssignment) {
            const maxAttempts = freshAssignment.maxAttempts || 1;
            const usedAttempts = freshAssignment.attemptCount || 0;

            if (usedAttempts >= maxAttempts) {
                alert(`Bạn đã hết lượt làm bài này! (${usedAttempts}/${maxAttempts} lượt)`);
                setLoadingQuizId(null);
                return;
            }
        }

        // 2. Server-side attempt validation
        const success = await store.startAssignmentAttempt(assignment.id, studentSession.studentId);
        if (!success) {
            alert('Bạn đã hết lượt hoặc có lỗi xảy ra. Vui lòng thử lại.');
            await store.fetchStudentAssignments(studentSession.studentId);
            setLoadingQuizId(null);
            return;
        }

        // 3. Refresh assignments
        await store.fetchStudentAssignments(studentSession.studentId);

        // 4. Ensure quizzes are loaded fresh, then find the quiz
        cacheService.invalidatePrefix('quizzes:');
        await quizStore.loadQuizzes();
        const latestQuizzes = useQuizStore.getState().quizzes;
        const quiz = latestQuizzes.find(q => q.id === assignment.quizId);

        if (!quiz) {
            alert('Bài kiểm tra không tồn tại hoặc đã bị xóa.');
            setLoadingQuizId(null);
            return;
        }

        if (!quiz.questions || quiz.questions.length === 0) {
            alert('Bài kiểm tra chưa có câu hỏi. Vui lòng liên hệ giáo viên.');
            setLoadingQuizId(null);
            return;
        }

        quizStore.selectQuiz(quiz);
        quizStore.setView('student');
    };

    // Filter assignments
    const openAssignments = assignments.filter(a => a.status === 'OPEN').sort((a, b) => new Date(a.deadline).getTime() - new Date(b.deadline).getTime());
    const closedAssignments = assignments.filter(a => a.status !== 'OPEN').sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    return (
        <div className="min-h-screen bg-slate-50 p-4 md:p-8">
            <div className="max-w-5xl mx-auto space-y-6">
                {/* Header */}
                <header className="flex flex-col md:flex-row justify-between items-center gap-4 bg-white p-6 rounded-3xl shadow-sm border border-slate-100">
                    <div className="flex items-center gap-4">
                        <button
                            onClick={() => setShowAvatarModal(true)}
                            className="w-14 h-14 bg-gradient-to-br from-orange-100 to-orange-200 rounded-2xl flex items-center justify-center shadow-lg border-2 border-orange-300 hover:border-orange-400 transition-all cursor-pointer hover:scale-105"
                            title="Đổi avatar"
                        >
                            <img src={getAvatarUrl(studentSession?.avatar)} alt="Avatar" className="w-10 h-10 object-contain" />
                        </button>
                        <div>
                            <h1 className="text-xl font-bold text-slate-800">Xin chào, {studentSession?.fullName}</h1>
                            <p className="text-slate-500 text-sm">Lớp: <span className="font-semibold text-indigo-600">{studentSession?.className}</span></p>
                        </div>
                    </div>
                    <div className="flex gap-2">
                        <button
                            onClick={() => quizStore.setView('home')}
                            className="px-4 py-2 text-indigo-600 bg-indigo-50 hover:bg-indigo-100 rounded-xl font-medium transition-colors flex items-center gap-2"
                        >
                            <Home className="w-4 h-4" />
                            Trang chủ
                        </button>
                        <button
                            onClick={() => { store.logoutStudent(); quizStore.setView('home'); }}
                            className="px-4 py-2 text-red-500 bg-red-50 hover:bg-red-100 rounded-xl font-medium transition-colors flex items-center gap-2"
                        >
                            <LogOut className="w-4 h-4" />
                            Đăng xuất
                        </button>
                    </div>
                </header>

                {/* Avatar Selector Modal */}
                <AvatarSelectorModal
                    isOpen={showAvatarModal}
                    onClose={() => setShowAvatarModal(false)}
                    currentAvatar={studentSession?.avatar}
                />

                {/* Main Content */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {/* Assignments List */}
                    <div className="md:col-span-2 space-y-6">
                        {/* Open Assignments */}
                        <div className="space-y-4">
                            <h2 className="text-lg font-bold text-slate-700 flex items-center gap-2">
                                <span className="w-2 h-8 bg-green-500 rounded-full"></span>
                                Bài tập cần làm ({openAssignments.filter(a => (a.attemptCount || 0) < (a.maxAttempts || 1)).length})
                            </h2>

                            {openAssignments.length === 0 ? (
                                <div className="bg-white p-8 rounded-2xl border border-dashed border-slate-200 text-center text-slate-400">
                                    <BookOpen className="w-12 h-12 mx-auto mb-3 opacity-50" />
                                    <p>Hiện tại không có bài tập nào cần làm.</p>
                                </div>
                            ) : (
                                <div className="space-y-3">
                                    {openAssignments.map(assignment => {
                                        const quiz = quizStore.quizzes.find(q => q.id === assignment.quizId);
                                        const isExpired = new Date(assignment.deadline) < new Date();
                                        const maxAttempts = assignment.maxAttempts || 1;
                                        const attemptCount = assignment.attemptCount || 0;
                                        const isLoading = loadingQuizId === assignment.id;
                                        const hasReachedLimit = attemptCount >= maxAttempts;
                                        const isDisabled = !quiz || isExpired || hasReachedLimit || isLoading;

                                        return (
                                            <div key={assignment.id} className={`bg-white p-5 rounded-2xl shadow-sm border transition-shadow relative overflow-hidden group ${hasReachedLimit ? 'border-green-200 bg-green-50/30' : 'border-slate-100 hover:shadow-md'}`}>
                                                <div className={`absolute top-0 right-0 w-24 h-24 -mr-8 -mt-8 rounded-full blur-xl group-hover:scale-150 transition-transform ${hasReachedLimit ? 'bg-gradient-to-br from-green-500/10 to-green-500/10' : 'bg-gradient-to-br from-green-500/10 to-emerald-500/10'}`}></div>

                                                <div className="relative flex justify-between items-start gap-4">
                                                    <div className="flex-1">
                                                        <h3 className="font-bold text-slate-800 text-lg mb-1 line-clamp-2">
                                                            {quiz ? quiz.title : 'Bài kiểm tra không xác định'}
                                                        </h3>
                                                        <div className="flex flex-wrap items-center gap-3 text-sm text-slate-500">
                                                            <span className="flex items-center gap-1 bg-slate-100 px-2.5 py-1 rounded-md">
                                                                <Clock className="w-3.5 h-3.5" />
                                                                Hạn chót: {new Intl.DateTimeFormat('vi-VN', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit' }).format(new Date(assignment.deadline))}
                                                            </span>
                                                            {quiz && (
                                                                <span className="flex items-center gap-1 bg-slate-100 px-2.5 py-1 rounded-md">
                                                                    Dataset: {quiz.questions.length} câu
                                                                </span>
                                                            )}
                                                            <span className={`flex items-center gap-1 px-2.5 py-1 rounded-md font-medium ${hasReachedLimit ? 'bg-green-100 text-green-700' : 'bg-orange-100 text-orange-700'}`}>
                                                                {hasReachedLimit ? (
                                                                    <><CheckCircle className="w-3.5 h-3.5" /> Đã làm {attemptCount}/{maxAttempts} lượt</>
                                                                ) : (
                                                                    <>Lượt: {attemptCount}/{maxAttempts}</>
                                                                )}
                                                            </span>
                                                        </div>
                                                    </div>

                                                    {hasReachedLimit ? (
                                                        <div className="px-5 py-2.5 rounded-xl font-bold bg-green-100 text-green-600 flex items-center gap-2">
                                                            <CheckCircle className="w-4 h-4" />
                                                            Đã hoàn thành
                                                        </div>
                                                    ) : (
                                                        <button
                                                            onClick={() => handleStartQuiz(assignment)}
                                                            disabled={isDisabled}
                                                            className={`px-5 py-2.5 rounded-xl font-bold shadow-lg transition-all active:scale-95 flex items-center gap-2
                                                                ${isLoading
                                                                    ? 'bg-gradient-to-r from-green-400 to-emerald-500 text-white cursor-wait shadow-green-200'
                                                                    : isDisabled
                                                                        ? 'bg-gray-100 text-gray-400 cursor-not-allowed shadow-none'
                                                                        : 'bg-gradient-to-r from-green-500 to-emerald-600 text-white shadow-green-200 hover:shadow-green-300'
                                                                }`}
                                                        >
                                                            {isLoading ? (
                                                                <>
                                                                    <Loader2 className="w-4 h-4 animate-spin" />
                                                                    Đang tải...
                                                                </>
                                                            ) : (
                                                                <>
                                                                    {isExpired ? 'Hết hạn' : (maxAttempts > 1 ? `Làm bài (còn ${maxAttempts - attemptCount} lượt)` : 'Làm bài')}
                                                                    {!isExpired && !isDisabled && <span className="text-lg">→</span>}
                                                                </>
                                                            )}
                                                        </button>
                                                    )}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>

                        {/* Closed Assignments */}
                        {closedAssignments.length > 0 && (
                            <div className="space-y-4 pt-6 border-t border-slate-200">
                                <h2 className="text-lg font-bold text-slate-700 flex items-center gap-2">
                                    <span className="w-2 h-8 bg-slate-300 rounded-full"></span>
                                    Bài tập đã đóng
                                </h2>
                                <div className="space-y-3 opacity-75">
                                    {closedAssignments.map(assignment => {
                                        const quiz = quizStore.quizzes.find(q => q.id === assignment.quizId);
                                        return (
                                            <div key={assignment.id} className="bg-slate-50 p-4 rounded-xl border border-slate-200 flex justify-between items-center">
                                                <div>
                                                    <h3 className="font-medium text-slate-700">{quiz ? quiz.title : 'Bài kiểm tra không xác định'}</h3>
                                                    <p className="text-xs text-slate-400 mt-1">Đã đóng: {new Intl.DateTimeFormat('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }).format(new Date(assignment.deadline))}</p>
                                                </div>
                                                <span className="bg-slate-200 text-slate-500 px-3 py-1 rounded-lg text-xs font-bold">
                                                    Đã kết thúc
                                                </span>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Sidebar - Stats (Placeholder for now) */}
                    <div className="space-y-6">
                        <div className="bg-gradient-to-br from-indigo-500 to-purple-600 rounded-3xl p-6 text-white shadow-xl relative overflow-hidden">
                            <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-16 -mt-16 blur-2xl"></div>
                            <h3 className="font-bold text-lg mb-4 flex items-center gap-2">
                                <AlertCircle className="w-5 h-5" />
                                Lưu ý
                            </h3>
                            <ul className="space-y-3 text-sm text-indigo-100">
                                <li className="flex items-start gap-2">
                                    <span className="mt-1">•</span>
                                    Hãy hoàn thành bài tập trước thời hạn.
                                </li>
                                <li className="flex items-start gap-2">
                                    <span className="mt-1">•</span>
                                    Kết quả sẽ được gửi tự động cho giáo viên.
                                </li>
                                <li className="flex items-start gap-2">
                                    <span className="mt-1">•</span>
                                    Số lượt làm bài được giới hạn theo từng bài.
                                </li>
                            </ul>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AssignmentsView;
