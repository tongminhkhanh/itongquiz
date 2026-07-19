import React, { Suspense } from 'react';
import { useQuizStore } from '../../stores/quizStore';
import { PageLoading } from './PageLoading';
import { StudentView } from './lazyViews';

export const StudentQuizView: React.FC = () => {
    const quizStore = useQuizStore();
    const selectedQuiz = quizStore.selectedQuiz;
    if (!selectedQuiz) return null;

    const hasLoadedQuestions = Array.isArray(selectedQuiz.questions) && selectedQuiz.questions.length > 0;
    if (!hasLoadedQuestions) {
        if (quizStore.isLoading) return <PageLoading />;

        return (
            <div className="min-h-screen flex items-center justify-center bg-[#F8F9FB] px-4">
                <div className="max-w-md w-full rounded-2xl bg-white border border-slate-200 shadow-lg p-6 text-center">
                    <h2 className="text-xl font-bold text-slate-800 mb-2">Dang tai cau hoi...</h2>
                    <p className="text-slate-600 mb-5">He thong chua tai duoc cau hoi cho bai nay. Vui long thu lai.</p>
                    {quizStore.error && <p className="text-sm text-red-600 font-semibold mb-4">{quizStore.error}</p>}
                    <div className="flex justify-center gap-3">
                        <button type="button" onClick={() => quizStore.goHome()} className="px-4 py-2 rounded-xl border border-slate-300 text-slate-700 font-semibold hover:bg-slate-50">Ve trang chu</button>
                        <button type="button" onClick={() => quizStore.loadQuizQuestions(selectedQuiz.id)} className="px-4 py-2 rounded-xl bg-[#6C5CE7] text-white font-semibold hover:bg-[#5b4bd8]">Thu lai</button>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <Suspense fallback={<PageLoading />}>
            <StudentView quiz={selectedQuiz} onExit={() => quizStore.goHome()} onSaveResult={quizStore.submitResult} />
        </Suspense>
    );
};
