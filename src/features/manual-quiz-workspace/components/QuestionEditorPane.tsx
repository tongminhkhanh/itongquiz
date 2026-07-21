import React from 'react';
import { Copy, ImagePlus, Trash2 } from 'lucide-react';
import { QuestionType } from '../../../types';
import { createManualQuestionDraft } from '../../../components/TeacherDashboard/quiz-preview/questionTypes';
import { useManualQuizWorkspaceStore } from '../store/useManualQuizWorkspaceStore';
import type { ManualQuizQuestion } from '../types/manualQuizWorkspace.types';

const questionText = (question: ManualQuizQuestion): string => {
    const data = question as any;
    return question.type === QuestionType.TRUE_FALSE ? data.mainQuestion ?? '' : data.question ?? '';
};

const QuestionEditorPane: React.FC = () => {
    const envelope = useManualQuizWorkspaceStore((state) => state.envelope);
    const addQuestion = useManualQuizWorkspaceStore((state) => state.addQuestion);
    const updateQuestion = useManualQuizWorkspaceStore((state) => state.updateQuestion);
    const duplicateQuestion = useManualQuizWorkspaceStore((state) => state.duplicateQuestion);
    const removeQuestion = useManualQuizWorkspaceStore((state) => state.removeQuestion);
    const selected = envelope?.quiz.questions.find((question) => question.id === envelope.selectedQuestionId) ?? null;

    if (!selected) {
        return (
            <main aria-label="Trình soạn câu hỏi" className="min-w-0 overflow-y-auto bg-white p-6 lg:p-8">
                <div className="mx-auto flex min-h-[520px] max-w-2xl flex-col items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-[#FFFDF7] p-8 text-center">
                    <div className="mb-4 grid h-14 w-14 place-items-center rounded-full bg-sky-50 text-sky-600">1</div>
                    <h2 className="text-xl font-semibold">Bắt đầu với câu hỏi đầu tiên</h2>
                    <p className="mt-2 max-w-md text-sm leading-6 text-slate-500">
                        Chọn loại câu hỏi từ danh sách bên trái. Bạn có thể sửa nội dung và xem trước ngay trên cùng màn hình.
                    </p>
                    <button
                        type="button"
                        onClick={() => addQuestion({
                            ...(createManualQuestionDraft(QuestionType.MCQ) as ManualQuizQuestion),
                            points: 1,
                        })}
                        className="mt-6 h-11 rounded-[10px] bg-sky-500 px-5 text-sm font-semibold text-white hover:bg-sky-600"
                    >
                        Thêm câu trắc nghiệm
                    </button>
                </div>
            </main>
        );
    }

    const setPrompt = (value: string) => updateQuestion(selected.id, (question) => {
        if (question.type === QuestionType.TRUE_FALSE) {
            return { ...question, mainQuestion: value } as ManualQuizQuestion;
        }
        return { ...question, question: value } as ManualQuizQuestion;
    });

    return (
        <main aria-label="Trình soạn câu hỏi" className="min-w-0 overflow-y-auto bg-white p-5 lg:p-8">
            <div className="mx-auto max-w-3xl space-y-6 pb-24">
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 pb-4">
                    <div className="flex flex-wrap items-center gap-2">
                        <span className="rounded-lg bg-sky-50 px-3 py-1.5 text-xs font-semibold text-sky-700">{selected.type}</span>
                        <select
                            value={selected.difficulty ?? 1}
                            onChange={(event) => updateQuestion(selected.id, (question) => ({
                                ...question,
                                difficulty: Number(event.target.value) as 1 | 2 | 3,
                            }))}
                            className="h-9 rounded-lg border border-slate-200 px-2 text-sm"
                            aria-label="Độ khó câu hỏi"
                        >
                            <option value={1}>Dễ</option>
                            <option value={2}>Trung bình</option>
                            <option value={3}>Khó</option>
                        </select>
                        <label className="flex h-9 items-center gap-2 rounded-lg border border-slate-200 px-2 text-sm">
                            <span>Điểm</span>
                            <input
                                type="number"
                                min="0"
                                step="0.25"
                                value={selected.points ?? 0}
                                onChange={(event) => updateQuestion(selected.id, (question) => ({
                                    ...question,
                                    points: Number(event.target.value),
                                }))}
                                className="w-16 bg-transparent text-right outline-none"
                            />
                        </label>
                    </div>
                    <div className="flex items-center gap-2">
                        <button type="button" onClick={() => duplicateQuestion(selected.id)} className="inline-flex h-10 items-center gap-2 rounded-lg border border-slate-200 px-3 text-sm">
                            <Copy className="h-4 w-4" /> Nhân bản
                        </button>
                        <button type="button" onClick={() => removeQuestion(selected.id)} className="inline-flex h-10 items-center gap-2 rounded-lg border border-rose-200 px-3 text-sm text-rose-700">
                            <Trash2 className="h-4 w-4" /> Xóa
                        </button>
                    </div>
                </div>

                <section>
                    <label htmlFor="question-prompt" className="mb-2 block text-sm font-semibold">Nội dung câu hỏi</label>
                    <textarea
                        id="question-prompt"
                        value={questionText(selected)}
                        onChange={(event) => setPrompt(event.target.value)}
                        rows={5}
                        placeholder="Nhập nội dung câu hỏi…"
                        className="w-full resize-y rounded-xl border border-slate-200 bg-slate-50 p-4 text-base leading-7 outline-none focus:border-sky-500 focus:bg-white"
                    />
                    <div className="mt-2 flex flex-wrap gap-2 text-xs text-slate-500">
                        <button type="button" className="rounded-lg border border-slate-200 bg-white px-3 py-2 font-medium text-sky-700">Chèn công thức toán</button>
                        <button type="button" className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-3 py-2"><ImagePlus className="h-3.5 w-3.5" /> Thêm ảnh</button>
                    </div>
                </section>

                <section className="rounded-xl border border-slate-200 p-4">
                    <h3 className="font-semibold">Trình soạn chi tiết</h3>
                    <p className="mt-2 text-sm leading-6 text-slate-500">
                        Các trường theo từng dạng câu hỏi sẽ được hiển thị trực tiếp tại đây, không mở thêm modal.
                    </p>
                </section>
            </div>
        </main>
    );
};

export default QuestionEditorPane;
