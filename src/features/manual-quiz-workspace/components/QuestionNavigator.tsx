import React, { useMemo, useState } from 'react';
import { ChevronLeft, GripVertical, Library, Plus, Search } from 'lucide-react';
import { QuestionType } from '../../../types';
import { createManualQuestionDraft } from '../../../components/TeacherDashboard/quiz-preview/questionTypes';
import { useManualQuizWorkspaceStore } from '../store/useManualQuizWorkspaceStore';
import type { ManualQuizQuestion } from '../types/manualQuizWorkspace.types';

const questionLabel = (question: ManualQuizQuestion): string => {
    const data = question as any;
    return String(question.type === QuestionType.TRUE_FALSE ? data.mainQuestion : data.question).trim()
        || 'Câu hỏi chưa có nội dung';
};

const QuestionNavigator: React.FC = () => {
    const [query, setQuery] = useState('');
    const envelope = useManualQuizWorkspaceStore((state) => state.envelope);
    const selectQuestion = useManualQuizWorkspaceStore((state) => state.selectQuestion);
    const addQuestion = useManualQuizWorkspaceStore((state) => state.addQuestion);
    const setNavigatorCollapsed = useManualQuizWorkspaceStore((state) => state.setNavigatorCollapsed);
    const questions = envelope?.quiz.questions ?? [];
    const filteredQuestions = useMemo(() => {
        const normalized = query.trim().toLowerCase();
        if (!normalized) return questions;
        return questions.filter((question, index) =>
            questionLabel(question).toLowerCase().includes(normalized)
            || String(index + 1).includes(normalized),
        );
    }, [query, questions]);

    const createFirstQuestion = () => {
        const draft = createManualQuestionDraft(QuestionType.MCQ) as ManualQuizQuestion;
        addQuestion({ ...draft, points: 1 });
    };

    return (
        <nav
            aria-label="Danh sách câu hỏi"
            data-pane-width="280"
            className="flex min-h-0 w-[280px] flex-col border-r border-slate-200 bg-slate-50"
        >
            <div className="border-b border-slate-200 p-4">
                <div className="mb-3 flex items-center justify-between gap-2">
                    <h2 className="font-semibold text-[#172033]">Câu hỏi ({questions.length})</h2>
                    <button
                        type="button"
                        onClick={() => setNavigatorCollapsed(true)}
                        aria-label="Thu gọn danh sách câu hỏi"
                        className="grid h-10 w-10 place-items-center rounded-lg text-slate-500 hover:bg-white"
                    >
                        <ChevronLeft className="h-4 w-4" />
                    </button>
                </div>
                <label className="relative block">
                    <span className="sr-only">Tìm câu hỏi</span>
                    <Search className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-slate-400" />
                    <input
                        value={query}
                        onChange={(event) => setQuery(event.target.value)}
                        placeholder="Tìm câu hỏi…"
                        className="h-10 w-full rounded-[10px] border border-slate-200 bg-white pl-9 pr-3 text-sm outline-none focus:border-sky-500"
                    />
                </label>
            </div>

            <div className="min-h-0 flex-1 space-y-2 overflow-y-auto p-3">
                {filteredQuestions.length === 0 && (
                    <div className="rounded-xl border border-dashed border-slate-300 bg-white p-4 text-center text-sm text-slate-500">
                        {questions.length === 0 ? 'Chưa có câu hỏi nào.' : 'Không tìm thấy câu hỏi.'}
                    </div>
                )}
                {filteredQuestions.map((question) => {
                    const index = questions.findIndex((item) => item.id === question.id);
                    const selected = envelope?.selectedQuestionId === question.id;
                    return (
                        <button
                            type="button"
                            key={question.id}
                            onClick={() => selectQuestion(question.id)}
                            className={`flex w-full items-start gap-2 rounded-xl border p-3 text-left transition ${selected
                                ? 'border-sky-500 bg-sky-50'
                                : 'border-slate-200 bg-white hover:border-slate-300'}`}
                        >
                            <GripVertical className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" />
                            <span className="grid h-6 w-6 shrink-0 place-items-center rounded-md bg-slate-100 text-xs font-semibold">
                                {index + 1}
                            </span>
                            <span className="min-w-0 flex-1">
                                <span className="line-clamp-2 block text-sm font-medium text-slate-800">{questionLabel(question)}</span>
                                <span className="mt-1 block text-xs text-slate-500">{question.type} • {question.points ?? 0} điểm</span>
                            </span>
                        </button>
                    );
                })}
            </div>

            <div className="space-y-2 border-t border-slate-200 bg-slate-50 p-3">
                <button
                    type="button"
                    onClick={createFirstQuestion}
                    className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-[10px] bg-sky-500 px-3 text-sm font-semibold text-white hover:bg-sky-600"
                >
                    <Plus className="h-4 w-4" /> Thêm câu hỏi
                </button>
                <button
                    type="button"
                    className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-[10px] border border-slate-200 bg-white px-3 text-sm font-medium"
                >
                    <Library className="h-4 w-4" /> Mở kho câu hỏi
                </button>
            </div>
        </nav>
    );
};

export default QuestionNavigator;
