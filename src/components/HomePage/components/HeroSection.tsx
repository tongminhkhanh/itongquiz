import React from 'react';
import { BarChart3, BookOpenCheck, Hexagon, Sparkles } from 'lucide-react';

const features = [
    {
        icon: BookOpenCheck,
        title: 'Học tập đúng trọng tâm',
        description: 'Bài được giao và thư viện luyện tập luôn sẵn sàng.',
    },
    {
        icon: BarChart3,
        title: 'Theo dõi tiến bộ rõ ràng',
        description: 'Điểm số và kết quả được tổng hợp tự động.',
    },
    {
        icon: Sparkles,
        title: 'Dễ dùng mỗi ngày',
        description: 'Thao tác đơn giản cho cả học sinh và giáo viên.',
    },
];

const HeroSection: React.FC = () => {
    return (
        <section className="relative order-2 flex w-full flex-col overflow-hidden bg-slate-50/75 px-6 py-8 text-left sm:px-8 md:order-1 md:h-full md:border-r md:border-slate-200/75 md:px-10 md:py-10 lg:px-11">
            <div className="relative z-10 w-fit rounded-full border border-blue-100 bg-blue-50/90 px-3.5 py-1.5 text-[0.68rem] font-extrabold uppercase tracking-[0.12em] text-[#123b76]">
                Trường Tiểu học Ít Ong
            </div>

            <h2 className="relative z-10 mt-5 max-w-[430px] text-[2rem] font-extrabold leading-[1.16] tracking-[-0.025em] text-[#123b76] sm:text-[2.3rem] md:text-[2.55rem] lg:text-[2.75rem]">
                Học tốt hơn, dạy nhẹ nhàng hơn.
            </h2>
            <p className="relative z-10 mt-4 max-w-[410px] text-sm font-medium leading-6 text-slate-600 sm:text-[0.95rem]">
                Nền tảng học tập trực tuyến đồng hành cùng học sinh mỗi ngày,
                đồng thời giúp giáo viên theo dõi lớp học nhẹ nhàng hơn.
            </p>

            <div
                className="relative z-10 mt-7 flex w-full flex-col gap-3"
                aria-label="Lợi ích của ItOngQuiz"
            >
                {features.map(({ icon: Icon, title, description }) => (
                    <article
                        key={title}
                        className="flex items-start gap-3 rounded-2xl border border-transparent px-1 py-1.5 text-left transition hover:border-white/90 hover:bg-white/60"
                    >
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-emerald-50 text-emerald-700 ring-1 ring-emerald-100">
                            <Icon size={18} strokeWidth={2.1} />
                        </div>
                        <div className="min-w-0 pt-0.5">
                            <h3 className="text-sm font-extrabold text-slate-900">{title}</h3>
                            <p className="mt-0.5 text-xs font-medium leading-5 text-slate-500">
                                {description}
                            </p>
                        </div>
                    </article>
                ))}
            </div>

            <div
                aria-hidden="true"
                className="pointer-events-none absolute -bottom-10 -right-8 hidden h-40 w-44 text-amber-400/15 md:block"
            >
                <Hexagon className="absolute left-2 top-9 h-20 w-20" strokeWidth={1.2} />
                <Hexagon className="absolute left-[4.7rem] top-0 h-20 w-20" strokeWidth={1.2} />
                <Hexagon className="absolute left-[4.7rem] top-[4.55rem] h-20 w-20" strokeWidth={1.2} />
            </div>
        </section>
    );
};

export default HeroSection;
