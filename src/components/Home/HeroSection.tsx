import React, { useEffect, useState } from 'react';
import { Sparkles } from 'lucide-react';

export const HeroSection: React.FC = () => {
    const [offset, setOffset] = useState(0);

    useEffect(() => {
        const interval = setInterval(() => {
            setOffset(prev => (prev + 1) % 100);
        }, 50);
        return () => clearInterval(interval);
    }, []);

    return (
        <div className="relative w-full bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 rounded-3xl overflow-hidden shadow-2xl mb-8 text-white min-h-[300px] flex items-center">
            {/* Animated Background Elements */}
            <div className="absolute inset-0 overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-full bg-[url('https://www.transparenttextures.com/patterns/stardust.png')] opacity-30 animate-pulse"></div>
                <div
                    className="absolute -top-20 -right-20 w-96 h-96 bg-yellow-300 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-blob"
                    style={{ transform: `translate(${Math.sin(offset / 10) * 20}px, ${Math.cos(offset / 10) * 20}px)` }}
                ></div>
                <div
                    className="absolute bottom-0 -left-20 w-72 h-72 bg-blue-300 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-blob animation-delay-2000"
                    style={{ transform: `translate(${Math.cos(offset / 10) * 20}px, ${Math.sin(offset / 10) * 20}px)` }}
                ></div>
            </div>

            <div className="relative z-10 container mx-auto px-8 flex flex-col md:flex-row items-center justify-between gap-8">
                <div className="flex-1 text-center md:text-left">
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/20 backdrop-blur-sm border border-white/30 text-sm font-medium mb-4">
                        <Sparkles className="w-4 h-4 text-yellow-300" />
                        <span>Học tập là niềm vui</span>
                    </div>
                    <h1 className="text-4xl md:text-6xl font-black mb-4 leading-tight drop-shadow-lg">
                        Khám phá tri thức <br />
                        <span className="text-transparent bg-clip-text bg-gradient-to-r from-yellow-200 to-amber-400">cùng Ít Ong Quiz</span>
                    </h1>
                    <p className="text-lg text-indigo-100 max-w-lg mb-8 drop-shadow-md">
                        Hàng ngàn bài tập trắc nghiệm thú vị đang chờ bạn chinh phục. Hãy bắt đầu ngay hôm nay!
                    </p>
                </div>

                <div className="w-64 h-64 md:w-80 md:h-80 relative animate-float">
                    {/* Placeholder for 3D Mascot - simple CSS shape for now if image missing */}
                    <div className="w-full h-full bg-contain bg-no-repeat bg-center drop-shadow-2xl" style={{ backgroundImage: "url('https://cdn-icons-png.flaticon.com/512/3406/3406286.png')" }}></div>
                </div>
            </div>
        </div>
    );
};
