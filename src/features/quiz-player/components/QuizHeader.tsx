import React from 'react';
import { Timer, Trophy, CheckCircle2 } from 'lucide-react';
import { getAvatarUrl } from '../../../config/avatars';

interface QuizHeaderProps {
    title: string;
    timeLeft: number;
    totalQuestions: number;
    answeredCount: number;
    isPractice: boolean;
    studentName?: string;
    avatar?: string | null;
}

const QuizHeader: React.FC<QuizHeaderProps> = ({ 
    title, timeLeft, totalQuestions, answeredCount, isPractice, studentName, avatar 
}) => {
    const formatTime = (seconds: number) => {
        const m = Math.floor(seconds / 60);
        const s = seconds % 60;
        return `${m}:${s < 10 ? '0' : ''}${s}`;
    };

    const progressPercentage = (answeredCount / totalQuestions) * 100;

    return (
        <div className="sticky top-0 z-30 bg-white/80 backdrop-blur-md border-b border-gray-100 shadow-sm">
            <div className="max-w-5xl mx-auto px-4 py-3">
                <div className="flex items-center justify-between gap-4 mb-2">
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                        {/* Student Chibi Avatar */}
                        <div className="flex-shrink-0 w-12 h-12 rounded-2xl bg-white shadow-lg shadow-indigo-100 flex items-center justify-center border-2 border-indigo-50 overflow-hidden relative group">
                            <img 
                                src={getAvatarUrl(avatar || 'default')} 
                                alt="Avatar" 
                                className="w-full h-full object-cover group-hover:scale-110 transition-transform"
                            />
                            <div className="absolute inset-0 bg-black/5 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
                        </div>

                        <div className="min-w-0">
                            <h1 className="text-lg font-bold text-gray-800 truncate leading-tight">{title}</h1>
                            <div className="flex items-center gap-3 text-xs text-gray-500 mt-0.5">
                                <span className="flex items-center gap-1 font-medium">
                                    <Trophy className="w-3 h-3 text-orange-400" />
                                    {totalQuestions} câu hỏi
                                </span>
                                <span className="flex items-center gap-1 font-medium">
                                    <CheckCircle2 className={`w-3 h-3 ${answeredCount === totalQuestions ? 'text-green-500' : 'text-blue-400'}`} />
                                    Đã làm: {answeredCount}/{totalQuestions}
                                </span>
                            </div>
                        </div>
                    </div>

                    {!isPractice && (
                        <div className={`flex items-center gap-2 px-4 py-2 rounded-xl border-2 transition-colors ${
                            timeLeft < 60 
                                ? 'bg-red-50 border-red-200 text-red-600 animate-pulse' 
                                : 'bg-blue-50 border-blue-100 text-blue-700'
                        }`}>
                            <Timer className={`w-5 h-5 ${timeLeft < 60 ? 'animate-spin-slow' : ''}`} />
                            <span className="text-xl font-black font-mono tracking-wider">
                                {formatTime(timeLeft)}
                            </span>
                        </div>
                    )}
                </div>

                {/* Progress Bar */}
                <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div 
                        className="h-full bg-gradient-to-r from-blue-500 to-indigo-600 transition-all duration-500 ease-out" 
                        style={{ width: `${progressPercentage}%` }}
                    />
                </div>
            </div>
        </div>
    );
};

export default QuizHeader;
