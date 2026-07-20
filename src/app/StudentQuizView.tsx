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
            <div className="flex min-h-screen items-center justify-center bg-[#FFFDF7] px-4 font-['Be_Vietnam_Pro']">
                <div className="w-full max-w-md rounded-[14px] border border-slate-200 bg-white p-6 text-center">
                    <h2 className="text-xl font-bold text-slate-800 mb-2">Dang tai cau hoi...</h2>
                    <p className="text-slate-600 mb-5">He thong chua tai duoc cau hoi cho bai nay. Vui long thu lai.</p>
                    {quizStore.error && <p className="text-sm text-red-600 font-semibold mb-4">{quizStore.error}</p>}
                    <div className="flex justify-center gap-3">
                        <button type="button" onClick={() => quizStore.goHome()} className="px-4 py-2 rounded-xl border border-slate-300 text-slate-700 font-semibold hover:bg-slate-50">Ve trang chu</button>
                        <button type="button" onClick={() => quizStore.loadQuizQuestions(selectedQuiz.id)} className="rounded-[10px] bg-sky-500 px-4 py-2 font-semibold text-white hover:bg-sky-600">Thu lai</button>
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
