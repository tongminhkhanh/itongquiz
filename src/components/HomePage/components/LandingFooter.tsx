import React from 'react';

const LandingFooter: React.FC = () => {
    return (
        <footer className="relative z-10 mt-auto w-full border-t border-white/40 bg-white/25 px-5 py-3 text-center text-xs font-medium text-slate-600 backdrop-blur-sm">
            <p>
                © {new Date().getFullYear()} ItOngQuiz · Nền tảng học tập của Trường Tiểu học Ít Ong
            </p>
        </footer>
    );
};

export default LandingFooter;
