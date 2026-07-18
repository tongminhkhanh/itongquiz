import { BookOpen, ChevronLeft, ChevronRight, Clock, Play, Target } from 'lucide-react';
import { AssignedWorkSkeleton, DashboardEmptyState, DashboardSectionError } from './DashboardStates';
import type { AssignedWorkSectionProps } from './dashboard.types';
import { getAssignmentActionLabel, getAssignmentVisualState } from './dashboard.utils';

export function AssignedWorkSection({
  quizzes,
  isLoading,
  errorMessage,
  page,
  totalPages,
  onRetry,
  onPageChange,
  onStartQuiz,
}: AssignedWorkSectionProps) {
  const safeTotalPages = Math.max(1, totalPages);
  const safePage = Math.min(Math.max(1, page), safeTotalPages);

  return (
    <section id="assigned-work" aria-labelledby="assigned-work-title" className="scroll-mt-24">
      <div className="mb-4 flex items-center gap-3">
        <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-orange-100 text-orange-700">
          <Target className="h-5 w-5" aria-hidden="true" />
        </div>
        <div>
          <h2 id="assigned-work-title" className="text-2xl font-black text-slate-900">
            Bài được giao
          </h2>
          <p className="mt-1 text-sm text-slate-600">Ưu tiên hoàn thành các bài giáo viên đã giao cho em.</p>
        </div>
      </div>

      {isLoading ? <AssignedWorkSkeleton /> : null}

      {!isLoading && errorMessage ? (
        <DashboardSectionError message={errorMessage} onRetry={onRetry} />
      ) : null}

      {!isLoading && !errorMessage && quizzes.length === 0 ? (
        <DashboardEmptyState
          title="Em đã hoàn thành tất cả nhiệm vụ hiện tại."
          description="Em có thể tiếp tục luyện thêm một môn học ở thư viện bên dưới."
        />
      ) : null}

      {!isLoading && !errorMessage && quizzes.length > 0 ? (
        <div className="space-y-3">
          {quizzes.map((quiz) => {
            const assignment = quiz._assignmentData;
            const visualState = getAssignmentVisualState(quiz);
            const actionLabel = getAssignmentActionLabel(visualState);
            const isReady = visualState === 'ready';

            return (
              <article
                key={assignment?.id || quiz.id}
                className={`rounded-2xl border bg-white p-4 shadow-sm sm:p-5 ${
                  visualState === 'completed'
                    ? 'border-emerald-200'
                    : visualState === 'closed'
                      ? 'border-slate-300'
                      : 'border-sky-100'
                }`}
              >
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
                  <div
                    className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl ${
                      visualState === 'completed'
                        ? 'bg-emerald-50 text-emerald-600'
                        : visualState === 'closed'
                          ? 'bg-slate-100 text-slate-500'
                          : 'bg-sky-50 text-sky-700'
                    }`}
                  >
                    <BookOpen className="h-6 w-6" aria-hidden="true" />
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="mb-2 flex flex-wrap items-center gap-2">
                      <h3 className="line-clamp-2 text-lg font-bold text-slate-900">{quiz.title}</h3>
                      <span
                        className={`rounded-full px-2.5 py-1 text-[11px] font-extrabold uppercase tracking-wide ${
                          visualState === 'completed'
                            ? 'bg-emerald-100 text-emerald-700'
                            : visualState === 'closed'
                              ? 'bg-slate-200 text-slate-700'
                              : 'bg-orange-100 text-orange-700'
                        }`}
                      >
                        {visualState === 'completed'
                          ? 'Đã hoàn thành'
                          : visualState === 'closed'
                            ? 'Đã đóng'
                            : 'Cần làm'}
                      </span>
                    </div>
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-slate-600">
                      <span className="inline-flex items-center gap-1.5">
                        <Clock className="h-4 w-4" aria-hidden="true" />
                        {quiz.timeLimit || 0} phút
                      </span>
                      <span>
                        Lượt làm: {assignment?.attemptCount || 0}/{assignment?.maxAttempts || 1}
                      </span>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      if (isReady) onStartQuiz(quiz);
                    }}
                    disabled={!isReady}
                    className={`inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl px-4 text-sm font-extrabold transition duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 sm:w-auto sm:min-w-36 ${
                      isReady
                        ? 'bg-sky-600 text-white hover:bg-sky-700 focus-visible:ring-sky-500'
                        : visualState === 'completed'
                          ? 'border border-emerald-200 bg-emerald-50 text-emerald-700'
                          : 'cursor-not-allowed border border-slate-300 bg-slate-100 text-slate-600'
                    }`}
                  >
                    {isReady ? <Play className="h-4 w-4 fill-current" aria-hidden="true" /> : null}
                    {actionLabel}
                  </button>
                </div>
              </article>
            );
          })}

          {safeTotalPages > 1 ? (
            <nav
              aria-label="Phân trang bài được giao"
              className="flex items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white p-3"
            >
              <button
                type="button"
                onClick={() => onPageChange(Math.max(1, safePage - 1))}
                disabled={safePage <= 1}
                className="inline-flex min-h-11 items-center justify-center gap-1 rounded-xl border border-slate-200 px-3 text-sm font-bold text-slate-700 hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-400"
              >
                <ChevronLeft className="h-4 w-4" aria-hidden="true" />
                Trước
              </button>
              <span className="text-sm font-semibold text-slate-600">
                Trang {safePage}/{safeTotalPages}
              </span>
              <button
                type="button"
                onClick={() => onPageChange(Math.min(safeTotalPages, safePage + 1))}
                disabled={safePage >= safeTotalPages}
                className="inline-flex min-h-11 items-center justify-center gap-1 rounded-xl border border-slate-200 px-3 text-sm font-bold text-slate-700 hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-400"
              >
                Sau
                <ChevronRight className="h-4 w-4" aria-hidden="true" />
              </button>
            </nav>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}
