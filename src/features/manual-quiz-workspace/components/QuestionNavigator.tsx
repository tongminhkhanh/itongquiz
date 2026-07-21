import React, { useMemo, useState } from 'react';
import {
    closestCenter,
    DndContext,
    KeyboardSensor,
    PointerSensor,
    useSensor,
    useSensors,
    type DragEndEvent,
} from '@dnd-kit/core';
import { ChevronLeft, Library, Plus, RotateCcw, Search } from 'lucide-react';
import { QuestionType } from '../../../types';
import { createManualQuestionDraft } from '../../../components/TeacherDashboard/quiz-preview/questionTypes';
import { useManualQuizWorkspaceStore } from '../store/useManualQuizWorkspaceStore';
import type { ManualQuizQuestion } from '../types/manualQuizWorkspace.types';
import QuestionNavigatorItem, { getQuestionNavigatorLabel } from './QuestionNavigatorItem';
import { useQuestionUndo } from '../hooks/useQuestionUndo';

export const handleQuestionDragEnd = (
    event: Pick<DragEndEvent, 'active' | 'over'>,
    reorderQuestion: (activeId: string, overId: string) => void,
): void => {
    const activeId = String(event.active.id);
    const overId = event.over ? String(event.over.id) : null;
    if (!overId || activeId === overId) return;
    reorderQuestion(activeId, overId);
};

const QuestionNavigator: React.FC = () => {
    const [query, setQuery] = useState('');
    const envelope = useManualQuizWorkspaceStore((state) => state.envelope);
    const selectQuestion = useManualQuizWorkspaceStore((state) => state.selectQuestion);
    const addQuestion = useManualQuizWorkspaceStore((state) => state.addQuestion);
    const duplicateQuestion = useManualQuizWorkspaceStore((state) => state.duplicateQuestion);
    const moveQuestion = useManualQuizWorkspaceStore((state) => state.moveQuestion);
    const reorderQuestion = useManualQuizWorkspaceStore((state) => state.reorderQuestion);
    const setNavigatorCollapsed = useManualQuizWorkspaceStore((state) => state.setNavigatorCollapsed);
    const undo = useQuestionUndo();
    const sensors = useSensors(
        useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
        useSensor(KeyboardSensor),
    );
    const questions = envelope?.quiz.questions ?? [];
    const filteredQuestions = useMemo(() => {
        const normalized = query.trim().toLowerCase();
        if (!normalized) return questions;
        return questions.filter((question, index) =>
            getQuestionNavigatorLabel(question).toLowerCase().includes(normalized)
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

            <div className="min-h-0 flex-1 overflow-y-auto p-3">
                {filteredQuestions.length === 0 && (
                    <div className="rounded-xl border border-dashed border-slate-300 bg-white p-4 text-center text-sm text-slate-500">
                        {questions.length === 0 ? 'Chưa có câu hỏi nào.' : 'Không tìm thấy câu hỏi.'}
                    </div>
                )}
                <DndContext
                    sensors={sensors}
                    collisionDetection={closestCenter}
                    onDragEnd={(event) => handleQuestionDragEnd(event, reorderQuestion)}
                >
                    <div className="space-y-2">
                        {filteredQuestions.map((question) => {
                            const index = questions.findIndex((item) => item.id === question.id);
                            return (
                                <QuestionNavigatorItem
                                    key={question.id}
                                    question={question}
                                    index={index}
                                    total={questions.length}
                                    selected={envelope?.selectedQuestionId === question.id}
                                    onSelect={() => selectQuestion(question.id)}
                                    onMove={(offset) => moveQuestion(question.id, offset)}
                                    onDuplicate={() => duplicateQuestion(question.id)}
                                    onDelete={() => undo.deleteWithUndo(question.id)}
                                />
                            );
                        })}
                    </div>
                </DndContext>
            </div>

            {undo.pendingDeletion && (
                <div
                    role="status"
                    aria-label="Hoàn tác xóa câu hỏi"
                    className="mx-3 mb-2 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900"
                >
                    <p>Đã xóa câu {undo.pendingDeletion.displayNumber}.</p>
                    <button
                        type="button"
                        onClick={undo.undoDeletion}
                        aria-label="Hoàn tác xóa câu hỏi"
                        className="mt-2 inline-flex min-h-10 items-center gap-2 rounded-lg bg-white px-3 font-semibold text-amber-800"
                    >
                        <RotateCcw className="h-4 w-4" /> Hoàn tác
                    </button>
                </div>
            )}

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
