import { ArrowRight, Rocket } from 'lucide-react';
import { DashboardEmptyState } from './DashboardStates';
import type { SubjectPracticeGridProps } from './dashboard.types';

export function SubjectPracticeGrid({ subjects, onSelectSubject }: SubjectPracticeGridProps) {
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
            Chọn một môn để tiếp tục rèn luyện theo nhịp của em.
          </p>
        </div>
      </div>

      {subjects.length === 0 ? (
        <DashboardEmptyState
          title="Hiện chưa có môn luyện tập nào dành cho em."
          description="Các môn có bài luyện tập sẽ xuất hiện tại đây."
        />
      ) : (
        <div
          data-testid="subject-practice-grid"
          className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4"
        >
          {subjects.map((subject) => (
            <button
              key={subject.id}
              type="button"
              onClick={() => onSelectSubject(subject.id)}
              className={`group flex min-h-44 w-full flex-col rounded-3xl border p-5 text-left shadow-sm transition-transform duration-200 hover:-translate-y-0.5 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 focus-visible:ring-offset-2 motion-reduce:transform-none motion-reduce:transition-none ${subject.surfaceClass}`}
            >
              <span className="mb-5 flex items-start justify-between gap-3">
                <span
                  className={`material-symbols-rounded flex h-12 w-12 items-center justify-center rounded-2xl text-3xl ${subject.accentClass}`}
                  aria-hidden="true"
                >
                  {subject.icon}
                </span>
                <span className="rounded-full border border-white/80 bg-white/80 px-2.5 py-1 text-[11px] font-black uppercase tracking-wide text-slate-600">
                  {subject.total} bài tập
                </span>
              </span>

              <span className="text-lg font-black text-slate-900">{subject.title}</span>
              <span className="mt-1 flex-1 text-sm font-medium leading-6 text-slate-600">
                {subject.description}
              </span>
              <span className="mt-4 inline-flex min-h-11 items-center gap-2 text-sm font-black text-slate-800">
                Bắt đầu luyện tập
                <ArrowRight
                  className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-0.5 motion-reduce:transform-none motion-reduce:transition-none"
                  aria-hidden="true"
                />
              </span>
            </button>
          ))}
        </div>
      )}
    </section>
  );
}
