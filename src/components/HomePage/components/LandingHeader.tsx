import React from 'react';
import { CircleHelp } from 'lucide-react';

const LandingHeader: React.FC = () => {
    return (
        <header className="relative z-20 min-h-[72px] border-b border-white/55 bg-white/55 px-4 py-2.5 backdrop-blur-md sm:px-6 md:px-10">
            <div className="mx-auto flex min-h-[51px] w-full max-w-[1120px] items-center justify-between gap-4">
                <a
                    href="/"
                    aria-label="Về trang chủ"
                    className="flex items-center gap-2.5 rounded-xl text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600 focus-visible:ring-offset-2"
                >
                    <img
                        src="/school-logo-v2.webp"
                        alt=""
                        className="h-10 w-10 object-contain sm:h-11 sm:w-11"
                    />
                    <span className="text-[1.2rem] font-extrabold sm:text-[1.35rem]">
                        <span className="text-[#173b7a]">ItOng</span>
                        <span className="text-amber-500">Quiz</span>
                    </span>
                </a>

                <div className="flex items-center gap-3 sm:gap-6">
                    <nav className="hidden items-center gap-5 md:flex" aria-label="Điều hướng chính">
                        <a
                            href="/about"
                            className="font-semibold text-slate-700 transition hover:text-blue-700"
                        >
                            Giới thiệu
                        </a>
                        <a
                            href="/huong-dan-tao-de-kiem-tra-tieu-hoc"
                            className="font-semibold text-slate-700 transition hover:text-blue-700"
                        >
                            Hướng dẫn giáo viên
                        </a>
                        <a
                            href="/contact"
                            className="font-semibold text-slate-700 transition hover:text-blue-700"
                        >
                            Liên hệ
                        </a>
                    </nav>
                    <a
                        href="mailto:support@thitong.site"
                        className="flex min-h-10 items-center gap-2 rounded-xl border border-white/80 bg-white/85 px-3 text-sm font-bold text-emerald-800 shadow-sm transition hover:bg-white hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600 sm:px-4"
                    >
                        <CircleHelp size={17} />
                        <span className="hidden sm:inline">Trợ giúp</span>
                    </a>
                </div>
            </div>
        </header>
    );
};

export default LandingHeader;
