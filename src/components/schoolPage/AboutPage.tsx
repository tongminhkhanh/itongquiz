import React from 'react';
import { ArrowRight, BarChart3, BookOpenCheck, ShieldCheck, Sparkles, UsersRound } from 'lucide-react';
import PublicSiteHeader from './PublicSiteHeader';

const values = [
    {
        icon: BookOpenCheck,
        title: 'Học tập đúng trọng tâm',
        description: 'Bài được giao, thư viện luyện tập và kết quả học tập nằm trong một hành trình rõ ràng.',
        color: 'bg-blue-50 text-blue-700',
    },
    {
        icon: BarChart3,
        title: 'Theo dõi tiến bộ dễ dàng',
        description: 'Giáo viên nắm được mức độ hoàn thành, điểm số và nội dung học sinh cần củng cố.',
        color: 'bg-amber-50 text-amber-700',
    },
    {
        icon: ShieldCheck,
        title: 'An toàn cho học sinh',
        description: 'Trải nghiệm đơn giản, nội dung phù hợp lứa tuổi và tài khoản do nhà trường quản lý.',
        color: 'bg-emerald-50 text-emerald-700',
    },
];

const AboutPage: React.FC = () => {
    return (
        <div className="min-h-screen bg-[#f7f9ff] font-['Be_Vietnam_Pro'] text-slate-900">
            <PublicSiteHeader active="about" />

            <main>
                <section className="relative overflow-hidden">
                    <div className="absolute inset-0 bg-[radial-gradient(circle_at_15%_20%,rgba(37,99,235,0.10),transparent_32%),radial-gradient(circle_at_85%_75%,rgba(250,204,21,0.16),transparent_30%)]" />
                    <div className="relative mx-auto grid min-h-[670px] max-w-7xl items-center gap-12 px-4 py-16 sm:px-6 lg:grid-cols-[1.02fr_0.98fr] lg:px-8 lg:py-24">
                        <div className="max-w-2xl">
                            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-blue-200 bg-blue-50 px-4 py-2 text-xs font-bold text-blue-700">
                                <Sparkles className="h-4 w-4" aria-hidden="true" />
                                Nền tảng học tập dành cho học sinh tiểu học
                            </div>
                            <h1 className="text-4xl font-black leading-[1.08] tracking-tight text-slate-950 sm:text-5xl lg:text-6xl">
                                Học vui hơn.
                                <span className="block text-blue-700">Dạy nhẹ nhàng hơn.</span>
                            </h1>
                            <p className="mt-6 max-w-xl text-base font-medium leading-8 text-slate-600 sm:text-lg">
                                iTongQuiz là hệ sinh thái giáo dục số đồng hành cùng giáo viên và học sinh Trường Tiểu học Ít Ong:
                                giao bài thuận tiện, luyện tập hứng thú và theo dõi tiến bộ rõ ràng mỗi ngày.
                            </p>
                            <div className="mt-9 flex flex-col gap-3 sm:flex-row">
                                <a
                                    href="/"
                                    className="inline-flex min-h-12 items-center justify-center gap-2 rounded-full bg-blue-700 px-7 py-3 text-sm font-bold text-white shadow-lg shadow-blue-200 transition hover:-translate-y-0.5 hover:bg-blue-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2"
                                >
                                    Bắt đầu học tập
                                    <ArrowRight className="h-4 w-4" aria-hidden="true" />
                                </a>
                                <a
                                    href="/contact"
                                    className="inline-flex min-h-12 items-center justify-center rounded-full border-2 border-slate-200 bg-white px-7 py-3 text-sm font-bold text-slate-800 shadow-sm transition hover:border-blue-300 hover:text-blue-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-600"
                                >
                                    Liên hệ với chúng tôi
                                </a>
                            </div>
                        </div>

                        <div className="relative mx-auto w-full max-w-[590px]" data-testid="about-illustration">
                            <div className="absolute -inset-5 rounded-[2.25rem] bg-gradient-to-br from-blue-200/70 via-white to-amber-100 blur-2xl" />
                            <figure className="relative overflow-hidden rounded-[2rem] border border-white/80 bg-white p-2 shadow-[0_30px_80px_rgba(30,64,175,0.20)]">
                                <img
                                    src="/about-platform-illustration.webp"
                                    alt="Minh họa bảng điều khiển học tập số với biểu đồ tiến bộ"
                                    className="aspect-[4/3] w-full rounded-[1.6rem] object-cover"
                                />
                            </figure>
                            <div className="absolute -left-3 top-8 rounded-2xl border border-white bg-white/95 px-4 py-3 shadow-xl sm:-left-8">
                                <div className="flex items-center gap-3">
                                    <span className="flex h-9 w-9 items-center justify-center rounded-full bg-amber-100 text-amber-700">
                                        <UsersRound className="h-5 w-5" aria-hidden="true" />
                                    </span>
                                    <div>
                                        <p className="text-xs font-black text-slate-900">Kết nối lớp học</p>
                                        <p className="text-[11px] font-medium text-slate-500">Giáo viên và học sinh</p>
                                    </div>
                                </div>
                            </div>
                            <div className="absolute -bottom-4 right-3 rounded-2xl border border-white bg-white/95 px-4 py-3 shadow-xl sm:-right-5 sm:bottom-8">
                                <div className="flex items-center gap-3">
                                    <span className="flex h-9 w-9 items-center justify-center rounded-full bg-emerald-100 text-emerald-700">
                                        <ShieldCheck className="h-5 w-5" aria-hidden="true" />
                                    </span>
                                    <div>
                                        <p className="text-xs font-black text-slate-900">Học tập an toàn</p>
                                        <p className="text-[11px] font-medium text-slate-500">Dễ dùng mỗi ngày</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </section>

                <section className="border-y border-slate-200/70 bg-white py-16" aria-labelledby="about-values-title">
                    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
                        <div className="mx-auto mb-10 max-w-2xl text-center">
                            <p className="text-xs font-black uppercase tracking-[0.2em] text-blue-700">Giá trị chúng tôi theo đuổi</p>
                            <h2 id="about-values-title" className="mt-3 text-3xl font-black tracking-tight text-slate-950 sm:text-4xl">
                                Công nghệ phục vụ việc học, không làm việc học phức tạp hơn
                            </h2>
                        </div>
                        <div className="grid gap-5 md:grid-cols-3">
                            {values.map(({ icon: Icon, title, description, color }) => (
                                <article key={title} className="rounded-3xl border border-slate-200 bg-white p-7 shadow-sm transition hover:-translate-y-1 hover:shadow-lg">
                                    <div className={`mb-5 flex h-12 w-12 items-center justify-center rounded-2xl ${color}`}>
                                        <Icon className="h-6 w-6" aria-hidden="true" />
                                    </div>
                                    <h3 className="text-lg font-black text-slate-950">{title}</h3>
                                    <p className="mt-3 text-sm font-medium leading-6 text-slate-600">{description}</p>
                                </article>
                            ))}
                        </div>
                    </div>
                </section>
            </main>
        </div>
    );
};

export default AboutPage;
