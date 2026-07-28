import React from 'react';

const LandingFooter: React.FC = () => {
    return (
        <footer className="relative z-10 mt-auto flex min-h-10 w-full items-center justify-center border-t border-white/45 bg-white/30 px-5 py-2 text-center text-xs font-medium text-slate-600 backdrop-blur-sm">
            <p>
                © {new Date().getFullYear()} ItOngQuiz · Nền tảng học tập của Trường Tiểu học Ít Ong
            </p>
        </footer>
    );
};

export default LandingFooter;
