import React from 'react';
import {
    BarChart3,
    BookOpenCheck,
    ClipboardCheck,
    Hexagon,
    LayoutDashboard,
    ShieldCheck,
    Sparkles,
    type LucideIcon,
} from 'lucide-react';

type LoginRole = 'student' | 'teacher';

interface HeroSectionProps {
    activeTab: LoginRole;
}

const roleContent = {
    student: {
        heading: 'Học vui mỗi ngày, tiến bộ qua từng bài.',
        description: 'Bài được giao, thư viện luyện tập và kết quả của em luôn sẵn sàng trong một không gian an toàn, dễ sử dụng.',
        benefitsLabel: 'Lợi ích dành cho học sinh',
        features: [
            {
                icon: BookOpenCheck,
                title: 'Học đúng trọng tâm',
                description: 'Ưu tiên bài giáo viên giao và nội dung em cần luyện thêm.',
                iconClass: 'bg-emerald-50 text-emerald-700 ring-emerald-100',
            },
            {
                icon: BarChart3,
                title: 'Biết mình tiến bộ ra sao',
                description: 'Xem điểm, đáp án và toàn bộ bài đã làm.',
                iconClass: 'bg-blue-50 text-blue-700 ring-blue-100',
            },
            {
                icon: ShieldCheck,
                title: 'An toàn, dễ sử dụng',
                description: 'Thao tác đơn giản, phù hợp với học sinh tiểu học.',
                iconClass: 'bg-amber-50 text-amber-700 ring-amber-100',
            },
        ],
    },
    teacher: {
        heading: 'Dạy nhẹ nhàng hơn, theo dõi lớp rõ hơn.',
        description: 'Giao bài, quản lý lớp và xem kết quả học tập trong một không gian tập trung, rõ ràng và dễ sử dụng.',
        benefitsLabel: 'Lợi ích dành cho giáo viên',
        features: [
            {
                icon: ClipboardCheck,
                title: 'Giao bài nhanh chóng',
                description: 'Chọn đề, đặt thời hạn và giao cho cả lớp chỉ trong vài bước.',
                iconClass: 'bg-blue-50 text-blue-700 ring-blue-100',
            },
            {
                icon: BarChart3,
                title: 'Nắm tiến độ từng em',
                description: 'Theo dõi lượt làm, điểm số và nội dung học sinh cần củng cố.',
                iconClass: 'bg-emerald-50 text-emerald-700 ring-emerald-100',
            },
            {
                icon: LayoutDashboard,
                title: 'Quản lý tập trung',
                description: 'Lớp học, đề kiểm tra và báo cáo được sắp xếp tại một nơi.',
                iconClass: 'bg-amber-50 text-amber-700 ring-amber-100',
            },
        ],
    },
} satisfies Record<LoginRole, {
    heading: string;
    description: string;
    benefitsLabel: string;
    features: Array<{
        icon: LucideIcon;
        title: string;
        description: string;
        iconClass: string;
    }>;
}>;

const HeroSection: React.FC<HeroSectionProps> = ({ activeTab }) => {
    const content = roleContent[activeTab];

    return (
        <section
            className="relative order-2 flex w-full flex-col overflow-hidden bg-slate-50/75 px-6 py-8 text-left sm:px-8 md:order-1 md:h-full md:border-r md:border-slate-200/75 md:px-10 md:py-10 lg:px-11"
            data-role={activeTab}
            aria-live="polite"
        >
            <div className="relative z-10 w-fit rounded-full border border-blue-100 bg-blue-50/90 px-3.5 py-1.5 text-[0.68rem] font-extrabold uppercase tracking-[0.12em] text-[#123b76]">
                Trường Tiểu học Ít Ong
            </div>

            <h2 className="relative z-10 mt-5 max-w-[430px] text-[2rem] font-extrabold leading-[1.16] tracking-[-0.025em] text-[#123b76] sm:text-[2.3rem] md:text-[2.55rem] lg:text-[2.75rem]">
                {content.heading}
            </h2>
            <p className="relative z-10 mt-4 max-w-[410px] text-sm font-medium leading-6 text-slate-600 sm:text-[0.95rem]">
                {content.description}
            </p>

            <div
                className="relative z-10 mt-7 flex w-full flex-col gap-3"
                aria-label={content.benefitsLabel}
            >
                {content.features.map(({ icon: Icon, title, description, iconClass }) => (
                    <article
                        key={title}
                        className="flex items-start gap-3 rounded-2xl border border-transparent px-1 py-1.5 text-left transition hover:border-white/90 hover:bg-white/60"
                    >
                        <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ring-1 ${iconClass}`}>
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
