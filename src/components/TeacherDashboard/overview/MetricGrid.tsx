import React from 'react';

export interface DashboardMetric {
    label: string;
    value: string | number;
    helper: string;
    icon: React.ReactElement;
    iconClassName: string;
    surfaceClassName: string;
}

interface MetricGridProps {
    metrics: DashboardMetric[];
    isLoadingResults: boolean;
}

const MetricGrid: React.FC<MetricGridProps> = ({ metrics, isLoadingResults }) => (
    <section aria-label="Chỉ số tổng quan" className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        {metrics.map((metric, index) => {
            const resultDependent = index > 0;
            const showSkeleton = isLoadingResults && resultDependent;

            return (
                <article key={metric.label} className="group relative overflow-hidden rounded-[22px] border border-slate-200/90 bg-gradient-to-br from-white via-white to-slate-50/70 p-4 shadow-[0_2px_10px_rgba(15,23,42,0.05)] transition-[transform,box-shadow,border-color,background-color] duration-200 ease-out hover:border-blue-200 hover:to-blue-50/50 hover:shadow-[0_14px_30px_rgba(15,23,42,0.11)] motion-safe:hover:-translate-y-1 motion-reduce:transition-none sm:p-5">
                    <span aria-hidden="true" className="pointer-events-none absolute inset-x-6 top-0 h-px bg-gradient-to-r from-transparent via-blue-300/80 to-transparent opacity-0 transition-opacity duration-200 group-hover:opacity-100 motion-reduce:transition-none" />
                    <div className="relative flex items-start justify-between gap-3">
                        <div className="min-w-0 flex-1">
                            <p className="text-sm font-semibold text-slate-500">{metric.label}</p>
                            {showSkeleton ? (
                                <div className="mt-3 h-9 w-20 animate-pulse rounded-lg bg-slate-200" aria-label={`Đang tải ${metric.label}`} />
                            ) : (
                                <p className="mt-2 text-3xl font-black tracking-tight text-slate-950 sm:text-4xl">{metric.value}</p>
                            )}
                        </div>
                        <span className={`flex size-11 shrink-0 items-center justify-center rounded-2xl shadow-sm ring-1 ring-inset ring-black/5 transition-[transform,box-shadow] duration-200 ease-out group-hover:-translate-y-0.5 group-hover:shadow-md motion-reduce:transform-none motion-reduce:transition-none ${metric.surfaceClassName}`}>
                            {React.cloneElement(metric.icon as React.ReactElement<{ className?: string; 'aria-hidden'?: boolean }>, {
                                className: `size-5 ${metric.iconClassName}`,
                                'aria-hidden': true,
                            })}
                        </span>
                    </div>
                    <p className="relative mt-3 line-clamp-2 text-xs leading-5 text-slate-500 transition-colors duration-200 group-hover:text-slate-600 motion-reduce:transition-none sm:text-sm">{metric.helper}</p>
                </article>
            );
        })}
    </section>
);

export default MetricGrid;
