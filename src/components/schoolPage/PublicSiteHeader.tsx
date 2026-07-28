import React, { useState } from 'react';
import { ArrowRight, Menu, X } from 'lucide-react';

type PublicSection = 'about' | 'contact' | 'guides';

interface PublicSiteHeaderProps {
    active: PublicSection;
}

const navItems: Array<{ label: string; path: '/' | '/about' | '/contact' | '/huong-dan-tao-de-kiem-tra-tieu-hoc'; id?: PublicSection }> = [
    { label: 'Hướng dẫn giáo viên', path: '/huong-dan-tao-de-kiem-tra-tieu-hoc', id: 'guides' },
    { label: 'Trang chủ', path: '/' },
    { label: 'Giới thiệu', path: '/about', id: 'about' },
    { label: 'Liên hệ', path: '/contact', id: 'contact' },
];

const PublicSiteHeader: React.FC<PublicSiteHeaderProps> = ({ active }) => {
    const [menuOpen, setMenuOpen] = useState(false);

    return (
        <header className="sticky top-0 z-50 border-b border-slate-200/80 bg-white/90 backdrop-blur-xl">
            <div className="mx-auto flex h-[72px] max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
                <a
                    href="/"
                    className="flex items-center gap-2.5 rounded-xl text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2"
                    aria-label="Về trang đăng nhập iTongQuiz"
                >
                    <img
                        src="/school-logo-v2.webp"
                        alt=""
                        className="h-10 w-10 object-contain"
                        onError={(event) => {
                            event.currentTarget.src = '/school-logo.png';
                        }}
                    />
                    <span className="text-xl font-black tracking-tight text-[#16407f]">
                        ItOng<span className="text-[#ff9d00]">Quiz</span>
                    </span>
                </a>

                <nav className="hidden items-center gap-7 md:flex" aria-label="Điều hướng trang công khai">
                    {navItems.map((item) => {
                        const isActive = item.id === active;
                        return (
                            <a
                                href={item.path}
                                key={item.path}
                                aria-current={isActive ? 'page' : undefined}
                                className={`relative rounded-lg px-1 py-2 text-sm font-semibold transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 ${
                                    isActive
                                        ? 'text-blue-700 after:absolute after:inset-x-0 after:-bottom-1 after:h-0.5 after:rounded-full after:bg-amber-400'
                                        : 'text-slate-600 hover:text-blue-700'
                                }`}
                            >
                                {item.label}
                            </a>
                        );
                    })}
                </nav>

                <a
                    href="/"
                    className="hidden items-center gap-2 rounded-full bg-blue-700 px-5 py-2.5 text-sm font-bold text-white shadow-sm transition hover:bg-blue-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2 md:inline-flex"
                >
                    Khám phá nền tảng
                    <ArrowRight className="h-4 w-4" aria-hidden="true" />
                </a>

                <button
                    type="button"
                    className="rounded-xl p-2 text-slate-700 transition hover:bg-slate-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 md:hidden"
                    aria-label={menuOpen ? 'Đóng menu' : 'Mở menu'}
                    aria-expanded={menuOpen}
                    onClick={() => setMenuOpen((current) => !current)}
                >
                    {menuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
                </button>
            </div>

            {menuOpen && (
                <nav className="border-t border-slate-100 bg-white px-4 py-3 shadow-lg md:hidden" aria-label="Điều hướng di động">
                    <div className="mx-auto flex max-w-7xl flex-col gap-1">
                        {navItems.map((item) => {
                            const isActive = item.id === active;
                            return (
                                <a
                                    href={item.path}
                                    key={item.path}
                                    onClick={() => setMenuOpen(false)}
                                    aria-current={isActive ? 'page' : undefined}
                                    className={`rounded-xl px-4 py-3 text-left text-sm font-bold ${
                                        isActive ? 'bg-blue-50 text-blue-700' : 'text-slate-700 hover:bg-slate-50'
                                    }`}
                                >
                                    {item.label}
                                </a>
                            );
                        })}
                    </div>
                </nav>
            )}
        </header>
    );
};

export default PublicSiteHeader;
