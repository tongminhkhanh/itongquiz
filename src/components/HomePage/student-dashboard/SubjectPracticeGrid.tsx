import {
  ArrowRight,
  BookOpen,
  Calculator,
  Earth,
  Languages,
  Monitor,
  Rocket,
  type LucideIcon,
} from 'lucide-react';
import { DashboardEmptyState, DashboardSectionError } from './DashboardStates';
import type {
  PracticeSubjectIcon,
  SubjectPracticeGridProps,
} from './dashboard.types';

const SUBJECT_ICONS = {
  calculator: Calculator,
  'book-open': BookOpen,
  earth: Earth,
  languages: Languages,
  monitor: Monitor,
} satisfies Record<PracticeSubjectIcon, LucideIcon>;

const PracticeCardSkeletons = () => (
  <div
    aria-label="Đang tải thư viện luyện tập"
    aria-busy="true"
    className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3"
  >
    {Array.from({ length: 3 }, (_, index) => (
      <div
        key={index}
        data-testid="practice-card-skeleton"
        className="min-h-40 animate-pulse rounded-3xl border border-slate-200 bg-white p-5 motion-reduce:animate-none"
      >
        <div className="h-12 w-12 rounded-2xl bg-slate-200" />
        <div className="mt-4 h-5 w-28 rounded bg-slate-200" />
        <div className="mt-3 h-4 w-full rounded bg-slate-100" />
        <div className="mt-2 h-4 w-3/4 rounded bg-slate-100" />
      </div>
    ))}
  </div>
);

export function SubjectPracticeGrid({
  availableSubjects,
  comingSoonSubjects,
  isLoading,
  errorMessage,
  onRetry,
  onSelectSubject,
}: SubjectPracticeGridProps) {
  return (
    <section id="practice-library" aria-labelledby="practice-library-title" className="scroll-mt-24">
      <div className="mb-5 flex items-center gap-3">
        <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-teal-100 text-teal-700">
          <Rocket className="h-5 w-5" aria-hidden="true" />
        </div>
        <div>
          <h2 id="practice-library-title" className="text-2xl font-black text-slate-900">
            Thư viện luyện tập
          </h2>
          <p className="mt-1 text-sm font-medium text-slate-600">
            Chọn một môn đang có để luyện theo chuyên đề phù hợp.
          </p>
        </div>
      </div>

      {isLoading ? <PracticeCardSkeletons /> : null}

      {!isLoading && errorMessage ? (
        <DashboardSectionError message={errorMessage} onRetry={onRetry} />
      ) : null}

      {!isLoading && !errorMessage ? (
        <div className="space-y-6">
          {availableSubjects.length > 0 ? (
            <div>
              <h3 className="mb-3 text-sm font-black uppercase tracking-wide text-slate-500">
                Môn đang có
              </h3>
              <div
                data-testid="subject-practice-grid"
                className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3"
              >
                {availableSubjects.map(subject => {
                  const Icon = SUBJECT_ICONS[subject.icon];
                  return (
                    <button
                      key={subject.id}
                      type="button"
                      onClick={() => onSelectSubject(subject.id)}
                      className="group flex min-h-40 w-full flex-col rounded-3xl border border-slate-200 bg-white p-5 text-left shadow-sm transition-[transform,box-shadow,border-color] duration-200 hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 focus-visible:ring-offset-2 motion-reduce:transform-none motion-reduce:transition-none"
                    >
                      <span className="flex w-full items-start justify-between gap-3">
                        <span
                          className={`flex h-12 w-12 items-center justify-center rounded-2xl ${subject.iconSurfaceClass} ${subject.accentClass}`}
                        >
                          <Icon className="h-6 w-6" aria-hidden="true" />
                        </span>
                        <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-bold text-slate-600">
                          {subject.topicCount} chuyên đề
                        </span>
                      </span>
                      <span className="mt-4 text-lg font-black text-slate-900">{subject.title}</span>
                      <span className="mt-1 flex-1 text-sm font-medium leading-6 text-slate-600">
                        {subject.description}
                      </span>
                      <span className="mt-4 flex w-full items-center justify-between gap-3 border-t border-slate-100 pt-4 text-sm">
                        <span className="font-semibold text-slate-600">
                          {subject.topicCount} chuyên đề · {subject.questionCount} câu hỏi
                        </span>
                        <span className="inline-flex min-h-11 items-center gap-1 font-black text-teal-700">
                          Luyện ngay <ArrowRight className="h-4 w-4" aria-hidden="true" />
                        </span>
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          ) : comingSoonSubjects.length === 0 ? (
            <DashboardEmptyState
              title="Hiện chưa có môn luyện tập nào dành cho em."
              description="Các môn có chuyên đề luyện tập sẽ xuất hiện tại đây."
            />
          ) : null}

          {comingSoonSubjects.length > 0 ? (
            <div aria-labelledby="coming-soon-subjects-title">
              <h3
                id="coming-soon-subjects-title"
                className="mb-3 text-sm font-black uppercase tracking-wide text-slate-500"
              >
                Sắp có
              </h3>
              <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                {comingSoonSubjects.map(subject => {
                  const Icon = SUBJECT_ICONS[subject.icon];
                  return (
                    <li
                      key={subject.id}
                      className="flex min-h-16 items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3"
                    >
                      <span
                        className={`flex h-10 w-10 items-center justify-center rounded-xl ${subject.iconSurfaceClass} ${subject.accentClass}`}
                      >
                        <Icon className="h-5 w-5" aria-hidden="true" />
                      </span>
                      <span className="min-w-0 flex-1 font-bold text-slate-800">{subject.title}</span>
                      <span className="rounded-full bg-white px-2.5 py-1 text-xs font-bold text-slate-600">
                        Đang chuẩn bị
                      </span>
                    </li>
                  );
                })}
              </ul>
            </div>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}
