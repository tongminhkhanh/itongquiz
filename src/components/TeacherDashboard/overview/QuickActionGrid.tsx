import React from 'react';
import { ArrowUpRight } from 'lucide-react';
import type { TeacherDashboardTab } from '../../../stores/useTeacherDashboardUIStore';

export interface DashboardQuickAction {
    tab: TeacherDashboardTab;
    title: string;
    description: string;
    icon: React.ReactElement;
    iconClassName: string;
    surfaceClassName: string;
}

interface QuickActionGridProps {
    actions: DashboardQuickAction[];
    onSelect: (tab: TeacherDashboardTab) => void;
}

const QuickActionGrid: React.FC<QuickActionGridProps> = ({ actions, onSelect }) => (
    <section aria-labelledby="quick-actions-heading" className="rounded-[24px] border border-slate-200/90 bg-white p-4 shadow-[0_4px_18px_rgba(15,23,42,0.06)] sm:p-5">
        <div className="mb-4 flex flex-col justify-between gap-2 sm:flex-row sm:items-end">
            <div>
                <p className="text-xs font-black uppercase tracking-[0.14em] text-blue-600">Thao tác nhanh</p>
                <h2 id="quick-actions-heading" className="mt-1 text-xl font-black tracking-tight text-slate-950 sm:text-2xl">
                    Bạn muốn làm gì?
                </h2>
            </div>
            <p className="max-w-md text-sm leading-5 text-slate-500">Chọn một công việc để mở ngay màn hình thực hiện, không cần tìm trong menu.</p>
        </div>

        <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 xl:grid-cols-3">
            {actions.map((action) => (
                <button
                    key={action.tab}
                    type="button"
                    onClick={() => onSelect(action.tab)}
                    className="group relative flex min-h-24 cursor-pointer items-start gap-3 overflow-hidden rounded-[20px] border border-slate-200/90 bg-gradient-to-br from-white via-white to-slate-50/80 p-3.5 text-left shadow-[0_2px_10px_rgba(15,23,42,0.05)] transition-[transform,box-shadow,border-color,background-color] duration-200 ease-out hover:border-blue-300 hover:to-blue-50/70 hover:shadow-[0_14px_32px_rgba(37,99,235,0.13)] active:translate-y-0 active:shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 motion-safe:hover:-translate-y-1 motion-reduce:transition-none sm:p-4"
                >
                    <span aria-hidden="true" className="pointer-events-none absolute inset-x-5 top-0 h-px bg-gradient-to-r from-transparent via-blue-400/70 to-transparent opacity-0 transition-opacity duration-200 group-hover:opacity-100 motion-reduce:transition-none" />
                    <span className={`relative flex size-11 shrink-0 items-center justify-center rounded-2xl shadow-sm ring-1 ring-inset ring-black/5 transition-[transform,box-shadow] duration-200 ease-out group-hover:-translate-y-0.5 group-hover:shadow-md motion-reduce:transform-none motion-reduce:transition-none ${action.surfaceClassName}`}>
                        {React.cloneElement(action.icon as React.ReactElement<{ className?: string; 'aria-hidden'?: boolean }>, {
                            className: `size-5 ${action.iconClassName}`,
                            'aria-hidden': true,
                        })}
                    </span>
                    <span className="min-w-0 flex-1">
                        <span className="flex items-center justify-between gap-3">
                            <span className="font-black text-slate-900">{action.title}</span>
                            <ArrowUpRight aria-hidden="true" className="size-4 shrink-0 text-slate-300 transition-[color,transform] duration-200 group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-blue-600 motion-reduce:transform-none motion-reduce:transition-none" />
                        </span>
                        <span className="mt-1 block text-sm leading-5 text-slate-500 transition-colors duration-200 group-hover:text-slate-600 motion-reduce:transition-none">{action.description}</span>
                    </span>
                </button>
            ))}
        </div>
    </section>
);

export default QuickActionGrid;
