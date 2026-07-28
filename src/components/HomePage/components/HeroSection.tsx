import React from 'react';
import { BarChart3, BookOpenCheck, Sparkles } from 'lucide-react';

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
        <section className="order-2 flex w-full max-w-[560px] flex-1 flex-col items-center text-center md:order-1 md:items-start md:text-left">
            <div className="rounded-full border border-white/80 bg-white/70 px-4 py-2 text-xs font-extrabold uppercase tracking-[0.12em] text-emerald-800 shadow-sm backdrop-blur-sm">
                Trường Tiểu học Ít Ong
            </div>

            <h2 className="mt-4 max-w-[540px] text-[2.25rem] font-extrabold leading-[1.12] text-[#173b7a] sm:text-[2.65rem] md:text-[3.25rem] lg:text-[3.8rem]">
                Học tốt hơn,
                <span className="block text-emerald-700">dạy nhẹ nhàng hơn.</span>
            </h2>
            <p className="mt-4 max-w-[500px] text-[0.98rem] font-medium leading-7 text-slate-700 sm:text-base">
                Một không gian học tập an toàn, giúp giáo viên quản lý lớp hiệu quả
                và học sinh luyện tập hứng thú mỗi ngày.
            </p>

            <div className="mt-7 hidden w-full grid-cols-1 gap-3 md:grid lg:grid-cols-3">
                {features.map(({ icon: Icon, title, description }) => (
                    <article
                        key={title}
                        className="rounded-2xl border border-white/80 bg-white/72 p-4 text-left shadow-sm backdrop-blur-sm"
                    >
                        <div className="mb-3 flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700">
                            <Icon size={19} />
                        </div>
                        <h3 className="text-sm font-extrabold text-slate-900">{title}</h3>
                        <p className="mt-1 text-xs font-medium leading-5 text-slate-600">
                            {description}
                        </p>
                    </article>
                ))}
            </div>
        </section>
    );
};

export default HeroSection;
