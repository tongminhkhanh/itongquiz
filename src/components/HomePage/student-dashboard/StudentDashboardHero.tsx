import { ArrowRight, CheckCircle2, ShieldCheck } from 'lucide-react';
import type { StudentDashboardHeroProps } from './dashboard.types';

export function StudentDashboardHero({
  firstName,
  hasReadyAssignment,
  attendanceClaimed,
  attendanceLabel,
  attendanceAvailable,
  onPrimaryAction,
  onAttendance,
}: StudentDashboardHeroProps) {
  const primaryLabel = hasReadyAssignment ? 'Làm bài được giao' : 'Luyện tập ngay';
  const attendanceDisabled = !attendanceAvailable && !attendanceClaimed;

  return (
    <section className="relative overflow-hidden rounded-3xl border border-sky-100 bg-gradient-to-br from-white via-sky-50 to-indigo-50 p-5 shadow-sm sm:p-7 md:p-9">
      <div className="pointer-events-none absolute -right-20 -top-20 h-64 w-64 rounded-full bg-sky-200/35 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-24 left-1/3 h-56 w-56 rounded-full bg-indigo-200/25 blur-3xl" />

      <div className="relative flex max-w-3xl flex-col items-start gap-5">
        <div>
          <p className="mb-2 text-sm font-bold uppercase tracking-[0.16em] text-sky-700">
            Learning Adventure
          </p>
          <h1 className="text-3xl font-black tracking-tight text-slate-900 sm:text-4xl">
            Chào ngày mới, {firstName}!
          </h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-600 sm:text-base">
            Bắt đầu với bài giáo viên giao, sau đó tiếp tục khám phá những môn học em yêu thích.
          </p>
        </div>

        <div className="flex w-full flex-col gap-3 sm:w-auto sm:flex-row sm:flex-wrap">
          <button
            type="button"
            onClick={onPrimaryAction}
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-2xl bg-sky-600 px-5 text-sm font-extrabold text-white shadow-sm transition duration-200 hover:bg-sky-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 focus-visible:ring-offset-2"
          >
            {primaryLabel}
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </button>

          <button
            type="button"
            onClick={onAttendance}
            disabled={attendanceDisabled}
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-2xl border border-amber-200 bg-amber-50 px-4 text-sm font-bold text-amber-900 transition duration-200 hover:bg-amber-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:border-slate-300 disabled:bg-slate-100 disabled:text-slate-500"
          >
            {attendanceClaimed ? (
              <CheckCircle2 className="h-4 w-4 text-emerald-600" aria-hidden="true" />
            ) : (
              <ShieldCheck className="h-4 w-4" aria-hidden="true" />
            )}
            {attendanceLabel}
          </button>
        </div>
      </div>
    </section>
  );
}
