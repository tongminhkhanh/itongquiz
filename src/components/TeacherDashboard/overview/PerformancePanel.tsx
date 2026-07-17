import React from 'react';
import { BarChart3, Target } from 'lucide-react';
import type { ResultsStatistics } from '../../../utils/statisticsUtils';

interface PerformancePanelProps {
    statistics: ResultsStatistics;
    isLoading: boolean;
}

const PerformancePanel: React.FC<PerformancePanelProps> = ({ statistics, isLoading }) => {
    if (isLoading) {
        return (
            <section aria-label="Đang tải tình hình học tập" className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
                <div className="h-5 w-48 animate-pulse rounded bg-slate-200" />
                <div className="mt-6 grid gap-5 lg:grid-cols-[minmax(0,1fr)_220px]">
                    <div className="h-64 animate-pulse rounded-2xl bg-slate-100" />
                    <div className="h-64 animate-pulse rounded-2xl bg-slate-100" />
                </div>
            </section>
        );
    }

    if (statistics.totalResults === 0) {
        return (
            <section className="rounded-2xl border border-dashed border-slate-300 bg-white px-5 py-12 text-center shadow-sm sm:px-8">
                <span className="mx-auto flex size-12 items-center justify-center rounded-2xl bg-blue-50 text-blue-600">
                    <BarChart3 aria-hidden="true" className="size-6" />
                </span>
                <h2 className="mt-4 text-xl font-black text-slate-900">Chưa có dữ liệu học tập</h2>
                <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-500">Biểu đồ phân bố điểm và tỷ lệ đạt sẽ xuất hiện sau khi học sinh hoàn thành bài kiểm tra.</p>
            </section>
        );
    }

    const maxCount = Math.max(...statistics.scoreDistribution.map((item) => item.count), 1);
    const radius = 52;
    const circumference = 2 * Math.PI * radius;
    const progressOffset = circumference - (statistics.passRate / 100) * circumference;

    return (
        <section aria-labelledby="performance-heading" className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6">
            <div className="flex flex-col justify-between gap-2 sm:flex-row sm:items-start">
                <div>
                    <p className="text-xs font-black uppercase tracking-[0.14em] text-blue-600">Kết quả học tập</p>
                    <h2 id="performance-heading" className="mt-1 text-xl font-black tracking-tight text-slate-950 sm:text-2xl">Tình hình điểm số</h2>
                    <p className="mt-1 text-sm text-slate-500">Tổng hợp từ {statistics.totalResults} bài đã nộp trong phạm vi đang xem.</p>
                </div>
                <span className="inline-flex w-fit items-center gap-2 rounded-full bg-slate-100 px-3 py-1.5 text-xs font-bold text-slate-600">
                    <Target aria-hidden="true" className="size-4" />
                    Mốc đạt: 5 điểm
                </span>
            </div>

            <div className="mt-6 grid min-w-0 gap-6 lg:grid-cols-[minmax(0,1fr)_230px] lg:items-center">
                <div>
                    <div
                        role="img"
                        aria-label={`Biểu đồ phân bố điểm: ${statistics.scoreDistribution.map((item) => `${item.range}: ${item.count} bài`).join(', ')}`}
                        className="grid h-56 grid-cols-5 items-end gap-2 border-b border-slate-200 px-1 pt-4 sm:gap-4 sm:px-3"
                    >
                        {statistics.scoreDistribution.map((item) => {
                            const heightPercent = item.count === 0 ? 4 : Math.max(12, Math.round((item.count / maxCount) * 100));
                            return (
                                <div key={item.range} className="flex h-full min-w-0 flex-col items-center justify-end gap-2">
                                    <span className="text-xs font-black text-slate-700">{item.count}</span>
                                    <div className="flex h-[156px] w-full items-end justify-center rounded-t-xl bg-slate-100 sm:h-[168px]">
                                        <div
                                            className="w-full max-w-14 rounded-t-lg bg-blue-600 transition-[height] duration-300 motion-reduce:transition-none"
                                            style={{ height: `${heightPercent}%` }}
                                        />
                                    </div>
                                    <span className="whitespace-nowrap text-[11px] font-bold text-slate-500 sm:text-xs">{item.range}</span>
                                </div>
                            );
                        })}
                    </div>
                    <p className="mt-3 text-center text-xs text-slate-400">Khoảng điểm</p>
                </div>

                <div className="rounded-2xl bg-slate-50 p-4 ring-1 ring-inset ring-slate-200">
                    <div className="relative mx-auto size-36 text-blue-600">
                        <svg viewBox="0 0 128 128" className="size-full -rotate-90" aria-hidden="true">
                            <circle cx="64" cy="64" r={radius} fill="none" stroke="currentColor" strokeOpacity="0.12" strokeWidth="12" />
                            <circle
                                cx="64"
                                cy="64"
                                r={radius}
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="12"
                                strokeLinecap="round"
                                strokeDasharray={circumference}
                                strokeDashoffset={progressOffset}
                            />
                        </svg>
                        <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-950">
                            <span className="text-3xl font-black">{statistics.passRate}%</span>
                            <span className="text-xs font-bold text-slate-500">tỷ lệ đạt</span>
                        </div>
                    </div>

                    <dl className="mt-4 grid grid-cols-2 gap-x-3 gap-y-3 text-sm">
                        <div>
                            <dt className="text-xs text-slate-500">Điểm trung bình</dt>
                            <dd className="mt-0.5 font-black text-slate-900">{statistics.mean}</dd>
                        </div>
                        <div>
                            <dt className="text-xs text-slate-500">Trung vị</dt>
                            <dd className="mt-0.5 font-black text-slate-900">{statistics.median}</dd>
                        </div>
                        <div>
                            <dt className="text-xs text-slate-500">Cao nhất</dt>
                            <dd className="mt-0.5 font-black text-emerald-700">{statistics.max}</dd>
                        </div>
                        <div>
                            <dt className="text-xs text-slate-500">Thấp nhất</dt>
                            <dd className="mt-0.5 font-black text-amber-700">{statistics.min}</dd>
                        </div>
                    </dl>

                    <div className="mt-4 grid grid-cols-2 gap-2 text-center text-xs font-bold">
                        <span className="rounded-lg bg-emerald-50 px-2 py-2 text-emerald-700">{statistics.passCount} bài đạt</span>
                        <span className="rounded-lg bg-amber-50 px-2 py-2 text-amber-700">{statistics.failCount} chưa đạt</span>
                    </div>
                </div>
            </div>
        </section>
    );
};

export default PerformancePanel;
