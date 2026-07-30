import React from 'react';

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
                            href="/contact"
                            className="font-semibold text-slate-700 transition hover:text-blue-700"
                        >
                            Liên hệ
                        </a>
                        <a
                            href="/huong-dan-tao-de-kiem-tra-tieu-hoc"
                            className="font-semibold text-slate-700 transition hover:text-blue-700"
                        >
                            Hướng dẫn
                        </a>
                    </nav>
                </div>
            </div>
        </header>
    );
};

export default LandingHeader;
