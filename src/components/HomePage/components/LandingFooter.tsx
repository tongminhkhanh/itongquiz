import React from 'react';

const LandingFooter: React.FC = () => {
    return (
        <footer className="relative z-10 mt-auto flex min-h-10 w-full flex-col items-center justify-center gap-2 border-t border-white/45 bg-white/30 px-5 py-2 text-center text-xs font-medium text-slate-600 backdrop-blur-sm sm:flex-row sm:gap-5">
            <p>
                © {new Date().getFullYear()} ItOngQuiz · Nền tảng học tập của Trường Tiểu học Ít Ong
            </p>
            <nav className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1" aria-label="Liên kết công khai">
                <a href="/about" className="font-semibold hover:text-blue-700">Giới thiệu</a>
                <a href="/contact" className="font-semibold hover:text-blue-700">Liên hệ</a>
                <a href="/privacy" className="font-semibold hover:text-blue-700">Bảo mật</a>
                <a href="/tos" className="font-semibold hover:text-blue-700">Điều khoản</a>
            </nav>
        </footer>
    );
};

export default LandingFooter;
