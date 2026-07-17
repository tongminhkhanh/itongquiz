import React from 'react';
import {
    ArrowRight,
    CalendarDays,
    FilePlus2,
    GraduationCap,
    ShieldCheck,
} from 'lucide-react';

interface DashboardHeroProps {
    greeting: string;
    teacherName: string;
    dateLabel: string;
    scopeLabel: string;
    isAdmin: boolean;
    todaySubmissionCount: number;
    passRate: number;
    uniqueStudents: number;
    onCreateQuiz: () => void;
    onViewResults: () => void;
}

const DashboardHero: React.FC<DashboardHeroProps> = ({
    greeting,
    teacherName,
    dateLabel,
    scopeLabel,
    isAdmin,
    todaySubmissionCount,
    passRate,
    uniqueStudents,
    onCreateQuiz,
    onViewResults,
}) => (
    <section
        aria-labelledby="teacher-overview-heading"
        className="relative overflow-hidden rounded-[20px] bg-slate-950 px-5 py-6 text-white shadow-sm sm:px-7 sm:py-7 lg:px-8"
    >
        <div aria-hidden="true" className="absolute -right-20 -top-24 size-64 rounded-full bg-blue-500/20 blur-3xl" />
        <div aria-hidden="true" className="absolute -bottom-32 left-1/3 size-72 rounded-full bg-cyan-400/10 blur-3xl" />

        <div className="relative grid gap-6 xl:grid-cols-[minmax(0,1.35fr)_minmax(360px,0.65fr)] xl:items-end">
            <div>
                <div className="flex flex-wrap items-center gap-2 text-xs font-bold uppercase tracking-[0.14em] text-blue-200">
                    <span>Tổng quan giáo viên</span>
                    <span aria-hidden="true" className="size-1 rounded-full bg-blue-300" />
                    <span className="inline-flex items-center gap-1.5 normal-case tracking-normal text-slate-300">
                        <CalendarDays aria-hidden="true" className="size-4" />
                        {dateLabel}
                    </span>
                </div>

                <h1 id="teacher-overview-heading" className="mt-4 max-w-3xl text-2xl font-black tracking-tight sm:text-3xl lg:text-4xl">
                    {greeting}, {teacherName}!
                </h1>
                <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-300 sm:text-base">
                    Theo dõi tình hình học tập, xử lý công việc quan trọng và đi thẳng đến chức năng cần dùng trong một màn hình.
                </p>

                <div className="mt-5 flex flex-wrap items-center gap-2 text-xs font-semibold text-slate-200">
                    <span className="inline-flex min-h-8 items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3">
                        {isAdmin ? <ShieldCheck aria-hidden="true" className="size-4 text-blue-300" /> : <GraduationCap aria-hidden="true" className="size-4 text-blue-300" />}
                        {isAdmin ? 'Quản trị viên' : 'Giáo viên'}
                    </span>
                    <span className="inline-flex min-h-8 items-center rounded-full border border-white/10 bg-white/5 px-3">
                        Phạm vi: {scopeLabel}
                    </span>
                </div>

                <div className="mt-6 flex flex-col gap-3 sm:flex-row">
                    <button
                        type="button"
                        onClick={onCreateQuiz}
                        className="inline-flex min-h-11 cursor-pointer items-center justify-center gap-2 rounded-xl bg-white px-4 py-2.5 text-sm font-black text-slate-950 shadow-sm transition-colors duration-200 hover:bg-blue-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950"
                    >
                        <FilePlus2 aria-hidden="true" className="size-5 text-blue-600" />
                        Tạo đề mới
                    </button>
                    <button
                        type="button"
                        onClick={onViewResults}
                        className="inline-flex min-h-11 cursor-pointer items-center justify-center gap-2 rounded-xl border border-white/15 bg-white/5 px-4 py-2.5 text-sm font-bold text-white transition-colors duration-200 hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950"
                    >
                        Xem kết quả
                        <ArrowRight aria-hidden="true" className="size-4" />
                    </button>
                </div>
            </div>

            <dl className="grid grid-cols-3 gap-2 rounded-2xl border border-white/10 bg-white/[0.06] p-2 backdrop-blur-sm sm:gap-3 sm:p-3">
                <div className="rounded-xl bg-white/[0.06] px-3 py-4">
                    <dt className="text-[11px] font-bold uppercase tracking-[0.1em] text-slate-400">Hôm nay</dt>
                    <dd className="mt-1 text-2xl font-black text-white">{todaySubmissionCount}</dd>
                    <p className="mt-0.5 text-xs text-slate-400">bài nộp</p>
                </div>
                <div className="rounded-xl bg-white/[0.06] px-3 py-4">
                    <dt className="text-[11px] font-bold uppercase tracking-[0.1em] text-slate-400">Tỷ lệ đạt</dt>
                    <dd className="mt-1 text-2xl font-black text-white">{passRate}%</dd>
                    <p className="mt-0.5 text-xs text-slate-400">từ 5 điểm</p>
                </div>
                <div className="rounded-xl bg-white/[0.06] px-3 py-4">
                    <dt className="text-[11px] font-bold uppercase tracking-[0.1em] text-slate-400">Học sinh</dt>
                    <dd className="mt-1 text-2xl font-black text-white">{uniqueStudents}</dd>
                    <p className="mt-0.5 text-xs text-slate-400">đã tham gia</p>
                </div>
            </dl>
        </div>
    </section>
);

export default DashboardHero;
