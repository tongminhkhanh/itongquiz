import React, { useEffect, useRef } from 'react';
import { StudentResult } from '../../../types';
import { Home, Share2, Download } from 'lucide-react';
import confetti from 'canvas-confetti';
import ScoreBadge from './components/ScoreBadge';

interface Props {
    result: StudentResult;
    quizTitle: string;
    onExit: () => void;
}

const ResultHeader: React.FC<Props> = ({ result, quizTitle, onExit }) => {
    const hasTriggeredConfetti = useRef(false);

    // Trigger confetti for high scores
    useEffect(() => {
        if (result.score >= 8 && !hasTriggeredConfetti.current) {
            hasTriggeredConfetti.current = true;

            // Fire confetti from both sides
            const duration = 3000;
            const end = Date.now() + duration;

            const frame = () => {
                confetti({
                    particleCount: 3,
                    angle: 60,
                    spread: 55,
                    origin: { x: 0, y: 0.7 },
                    colors: ['#10B981', '#3B82F6', '#8B5CF6', '#F59E0B']
                });
                confetti({
                    particleCount: 3,
                    angle: 120,
                    spread: 55,
                    origin: { x: 1, y: 0.7 },
                    colors: ['#10B981', '#3B82F6', '#8B5CF6', '#F59E0B']
                });

                if (Date.now() < end) {
                    requestAnimationFrame(frame);
                }
            };
            frame();
        }
    }, [result.score]);

    // Determine background gradient based on score
    const getScoreGradient = () => {
        if (result.score >= 9) return 'from-emerald-500 to-teal-600';
        if (result.score >= 7) return 'from-blue-500 to-indigo-600';
        if (result.score >= 5) return 'from-amber-500 to-orange-600';
        return 'from-red-500 to-rose-600';
    };

    // Calculate percentage for circular progress
    const percentage = (result.score / 10) * 100;
    const circumference = 2 * Math.PI * 54; // radius = 54
    const strokeDashoffset = circumference - (percentage / 100) * circumference;

    return (
        <div className={`relative overflow-hidden bg-gradient-to-r ${getScoreGradient()} text-white`}>
            {/* Decorative elements */}
            <div className="absolute inset-0 opacity-10">
                <div className="absolute top-0 left-0 w-64 h-64 bg-white rounded-full -translate-x-1/2 -translate-y-1/2" />
                <div className="absolute bottom-0 right-0 w-96 h-96 bg-white rounded-full translate-x-1/3 translate-y-1/3" />
            </div>

            <div className="relative max-w-5xl mx-auto px-4 py-8">
                {/* Top bar with exit button */}
                <div className="flex justify-between items-center mb-6">
                    <button
                        onClick={onExit}
                        className="flex items-center gap-2 px-4 py-2 bg-white/20 hover:bg-white/30 rounded-full transition-all backdrop-blur-sm"
                    >
                        <Home className="w-4 h-4" />
                        <span className="text-sm font-medium">Về trang chủ</span>
                    </button>

                    <div className="flex gap-2">
                        <button className="p-2 bg-white/20 hover:bg-white/30 rounded-full transition-all backdrop-blur-sm">
                            <Share2 className="w-4 h-4" />
                        </button>
                        <button className="p-2 bg-white/20 hover:bg-white/30 rounded-full transition-all backdrop-blur-sm">
                            <Download className="w-4 h-4" />
                        </button>
                    </div>
                </div>

                {/* Main content */}
                <div className="flex flex-col md:flex-row items-center gap-8">
                    {/* Circular Score */}
                    <div className="relative">
                        <svg className="w-36 h-36 transform -rotate-90">
                            {/* Background circle */}
                            <circle
                                cx="72"
                                cy="72"
                                r="54"
                                stroke="rgba(255,255,255,0.2)"
                                strokeWidth="12"
                                fill="none"
                            />
                            {/* Progress circle */}
                            <circle
                                cx="72"
                                cy="72"
                                r="54"
                                stroke="white"
                                strokeWidth="12"
                                fill="none"
                                strokeLinecap="round"
                                strokeDasharray={circumference}
                                strokeDashoffset={strokeDashoffset}
                                className="transition-all duration-1000 ease-out"
                                style={{
                                    animation: 'scoreReveal 1.5s ease-out forwards'
                                }}
                            />
                        </svg>
                        <div className="absolute inset-0 flex flex-col items-center justify-center">
                            <span className="text-5xl font-black animate-pulse-once">{result.score}</span>
                            <span className="text-sm opacity-80">điểm</span>
                        </div>
                    </div>

                    {/* Info section */}
                    <div className="flex-1 text-center md:text-left">
                        <h1 className="text-2xl md:text-3xl font-bold mb-2">
                            Kết quả của em
                        </h1>
                        <p className="text-lg opacity-90 mb-3">{quizTitle}</p>

                        {/* Stats row */}
                        <div className="flex flex-wrap justify-center md:justify-start gap-4 mb-4">
                            <div className="bg-white/20 backdrop-blur-sm rounded-xl px-4 py-2">
                                <span className="text-2xl font-bold">{result.correctCount}</span>
                                <span className="text-sm opacity-80">/{result.totalQuestions} câu đúng</span>
                            </div>
                            <div className="bg-white/20 backdrop-blur-sm rounded-xl px-4 py-2">
                                <span className="text-2xl font-bold">{result.timeTaken || 0}</span>
                                <span className="text-sm opacity-80"> phút</span>
                            </div>
                        </div>

                        {/* Badge */}
                        <ScoreBadge score={result.score} />
                    </div>
                </div>
            </div>

            {/* Add keyframes for animation */}
            <style>{`
        @keyframes scoreReveal {
          from {
            stroke-dashoffset: ${circumference};
          }
          to {
            stroke-dashoffset: ${strokeDashoffset};
          }
        }
        .animate-pulse-once {
          animation: pulseOnce 0.5s ease-out 0.5s forwards;
        }
        @keyframes pulseOnce {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.1); }
        }
      `}</style>
        </div>
    );
};

export default ResultHeader;
