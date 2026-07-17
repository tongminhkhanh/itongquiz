import React from 'react';
import { ArrowRight, Clock3, FilePlus2, Files, ListChecks } from 'lucide-react';
import type { Quiz } from '../../../types';

interface RecentQuizzesPanelProps {
    quizzes: Quiz[];
    onCreateQuiz: () => void;
    onManageQuizzes: () => void;
}

const formatQuizDate = (value: string): string => {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return 'Chưa cập nhật';
    return date.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });
};

const RecentQuizzesPanel: React.FC<RecentQuizzesPanelProps> = ({ quizzes, onCreateQuiz, onManageQuizzes }) => (
    <section aria-labelledby="recent-quizzes-heading" className="min-w-0 max-w-full overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-col gap-3 border-b border-slate-100 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">
            <div>
                <p className="text-xs font-black uppercase tracking-[0.14em] text-blue-600">Nội dung giảng dạy</p>
                <h2 id="recent-quizzes-heading" className="mt-1 text-xl font-black tracking-tight text-slate-950 sm:text-2xl">Đề kiểm tra gần đây</h2>
                <p className="mt-1 text-sm text-slate-500">Mở nhanh danh sách quản lý hoặc bắt đầu tạo một đề mới.</p>
            </div>
            <div className="flex flex-wrap gap-2">
                <button
                    type="button"
                    onClick={onCreateQuiz}
                    className="inline-flex min-h-10 cursor-pointer items-center gap-2 rounded-xl bg-blue-600 px-3.5 py-2 text-sm font-black text-white transition-colors hover:bg-blue-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
                >
                    <FilePlus2 aria-hidden="true" className="size-4" />
                    Tạo đề
                </button>
                <button
                    type="button"
                    onClick={onManageQuizzes}
                    className="inline-flex min-h-10 cursor-pointer items-center gap-2 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-sm font-bold text-slate-700 transition-colors hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
                >
                    Xem tất cả
                    <ArrowRight aria-hidden="true" className="size-4" />
                </button>
            </div>
        </div>

        {quizzes.length > 0 ? (
            <>
                <div className="hidden overflow-x-auto xl:block">
                    <table className="w-full min-w-[760px] border-collapse text-left">
                        <thead>
                            <tr className="border-b border-slate-100 bg-slate-50/70 text-xs font-black uppercase tracking-[0.08em] text-slate-500">
                                <th className="px-5 py-3">Tên đề</th>
                                <th className="px-4 py-3">Lớp</th>
                                <th className="px-4 py-3">Số câu</th>
                                <th className="px-4 py-3">Thời gian</th>
                                <th className="px-4 py-3">Ngày tạo</th>
                                <th className="px-5 py-3 text-right"><span className="sr-only">Thao tác</span></th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {quizzes.map((quiz) => (
                                <tr key={quiz.id} className="transition-colors hover:bg-slate-50/70">
                                    <td className="px-5 py-4">
                                        <div className="flex items-center gap-3">
                                            <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
                                                <Files aria-hidden="true" className="size-4" />
                                            </span>
                                            <div className="min-w-0">
                                                <p className="max-w-md truncate text-sm font-black text-slate-900">{quiz.title}</p>
                                                <p className="mt-0.5 text-xs text-slate-400">{quiz.topic || quiz.detectedCategory || 'Chưa phân loại'}</p>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-4 py-4 text-sm font-semibold text-slate-600">{quiz.classLevel || '—'}</td>
                                    <td className="px-4 py-4 text-sm font-semibold text-slate-600">{quiz.questions?.length || 0}</td>
                                    <td className="px-4 py-4 text-sm text-slate-600">{quiz.timeLimit || 0} phút</td>
                                    <td className="px-4 py-4 text-sm text-slate-500">{formatQuizDate(quiz.createdAt)}</td>
                                    <td className="px-5 py-4 text-right">
                                        <button
                                            type="button"
                                            onClick={onManageQuizzes}
                                            className="inline-flex min-h-9 cursor-pointer items-center gap-1.5 rounded-lg px-2.5 text-xs font-bold text-blue-700 transition-colors hover:bg-blue-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
                                        >
                                            Quản lý
                                            <ArrowRight aria-hidden="true" className="size-3.5" />
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                <div className="divide-y divide-slate-100 xl:hidden">
                    {quizzes.map((quiz) => (
                        <article key={quiz.id} className="p-4">
                            <div className="flex items-start gap-3">
                                <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
                                    <Files aria-hidden="true" className="size-5" />
                                </span>
                                <div className="min-w-0 flex-1">
                                    <h3 className="line-clamp-2 text-sm font-black text-slate-900">{quiz.title}</h3>
                                    <p className="mt-1 text-xs text-slate-400">{quiz.topic || quiz.detectedCategory || 'Chưa phân loại'}</p>
                                </div>
                            </div>
                            <div className="mt-3 grid grid-cols-3 gap-2 text-xs text-slate-600">
                                <span className="rounded-lg bg-slate-50 px-2 py-2 font-semibold">Lớp {quiz.classLevel || '—'}</span>
                                <span className="inline-flex items-center gap-1 rounded-lg bg-slate-50 px-2 py-2 font-semibold"><ListChecks aria-hidden="true" className="size-3.5" />{quiz.questions?.length || 0} câu</span>
                                <span className="inline-flex items-center gap-1 rounded-lg bg-slate-50 px-2 py-2 font-semibold"><Clock3 aria-hidden="true" className="size-3.5" />{quiz.timeLimit || 0} phút</span>
                            </div>
                            <div className="mt-3 flex items-center justify-between gap-3">
                                <span className="text-xs text-slate-400">{formatQuizDate(quiz.createdAt)}</span>
                                <button
                                    type="button"
                                    onClick={onManageQuizzes}
                                    className="inline-flex min-h-9 cursor-pointer items-center gap-1 rounded-lg px-2.5 text-xs font-bold text-blue-700 hover:bg-blue-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
                                >
                                    Quản lý
                                    <ArrowRight aria-hidden="true" className="size-3.5" />
                                </button>
                            </div>
                        </article>
                    ))}
                </div>
            </>
        ) : (
            <div className="px-5 py-12 text-center">
                <span className="mx-auto flex size-12 items-center justify-center rounded-2xl bg-slate-100 text-slate-400">
                    <Files aria-hidden="true" className="size-6" />
                </span>
                <h3 className="mt-4 text-lg font-black text-slate-900">Chưa có đề kiểm tra</h3>
                <p className="mx-auto mt-1 max-w-md text-sm leading-6 text-slate-500">Tạo đề đầu tiên để bắt đầu giao bài và theo dõi kết quả học tập.</p>
                <button
                    type="button"
                    onClick={onCreateQuiz}
                    className="mt-4 inline-flex min-h-10 cursor-pointer items-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-sm font-black text-white hover:bg-blue-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
                >
                    <FilePlus2 aria-hidden="true" className="size-4" />
                    Tạo đề mới
                </button>
            </div>
        )}
    </section>
);

export default RecentQuizzesPanel;
