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
    <section aria-labelledby="quick-actions-heading" className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
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
                    className="group flex min-h-24 cursor-pointer items-start gap-3 rounded-2xl border border-slate-200 bg-slate-50/60 p-3.5 text-left transition-colors duration-200 hover:border-blue-200 hover:bg-blue-50/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 motion-reduce:transition-none sm:p-4"
                >
                    <span className={`flex size-11 shrink-0 items-center justify-center rounded-xl ring-1 ring-inset ring-black/5 ${action.surfaceClassName}`}>
                        {React.cloneElement(action.icon as React.ReactElement<{ className?: string; 'aria-hidden'?: boolean }>, {
                            className: `size-5 ${action.iconClassName}`,
                            'aria-hidden': true,
                        })}
                    </span>
                    <span className="min-w-0 flex-1">
                        <span className="flex items-center justify-between gap-3">
                            <span className="font-black text-slate-900">{action.title}</span>
                            <ArrowUpRight aria-hidden="true" className="size-4 shrink-0 text-slate-300 transition-colors group-hover:text-blue-600" />
                        </span>
                        <span className="mt-1 block text-sm leading-5 text-slate-500">{action.description}</span>
                    </span>
                </button>
            ))}
        </div>
    </section>
);

export default QuickActionGrid;
