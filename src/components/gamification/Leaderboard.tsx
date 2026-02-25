/**
 * Leaderboard Component
 *
 * Displays top 10 students ranked by pet level.
 * Features: medal icons, current user highlight, back navigation.
 */

import React, { useEffect } from 'react';
import { ArrowLeft, Trophy, Crown, Medal } from 'lucide-react';
import { useGamificationStore } from '../../stores/useGamificationStore';
import { useClassroomStore } from '../../stores/useClassroomStore';
import { PET_OPTIONS } from '../../types/gamification.types';

interface LeaderboardProps {
    onBack: () => void;
}

const Leaderboard: React.FC<LeaderboardProps> = ({ onBack }) => {
    const { leaderboard, fetchLeaderboard } = useGamificationStore();
    const { studentSession } = useClassroomStore();

    useEffect(() => {
        fetchLeaderboard();
    }, []);

    // Rank decorations
    const getRankDecoration = (rank: number) => {
        if (rank === 1) return { bg: 'from-yellow-400 to-amber-500', icon: '🥇', textColor: 'text-amber-700' };
        if (rank === 2) return { bg: 'from-gray-300 to-gray-400', icon: '🥈', textColor: 'text-gray-600' };
        if (rank === 3) return { bg: 'from-amber-600 to-orange-700', icon: '🥉', textColor: 'text-orange-700' };
        return { bg: 'from-slate-100 to-slate-200', icon: `${rank}`, textColor: 'text-slate-500' };
    };

    // Get pet emoji
    const getPetEmoji = (petId: string) => {
        return PET_OPTIONS.find((p) => p.id === petId)?.emoji || '🐱';
    };

    return (
        <div className="min-h-screen bg-gradient-to-b from-amber-50 via-yellow-50 to-orange-50">
            <div className="max-w-md mx-auto px-4 py-6">
                {/* Header */}
                <div className="flex items-center gap-3 mb-6">
                    <button
                        onClick={onBack}
                        className="p-2.5 hover:bg-white/60 rounded-xl transition-colors"
                    >
                        <ArrowLeft className="w-5 h-5 text-slate-600" />
                    </button>
                    <div className="flex items-center gap-2">
                        <Trophy className="w-6 h-6 text-amber-500" />
                        <h1 className="text-xl font-bold text-slate-800">Bảng Xếp Hạng</h1>
                    </div>
                </div>

                {/* Leaderboard List */}
                <div className="space-y-3">
                    {leaderboard.map((entry, index) => {
                        const rank = index + 1;
                        const deco = getRankDecoration(rank);
                        const isCurrentUser = entry.username === studentSession?.username;

                        return (
                            <div
                                key={entry.username}
                                className={`flex items-center gap-3 p-4 rounded-2xl transition-all ${isCurrentUser
                                        ? 'bg-gradient-to-r from-purple-50 to-indigo-50 border-2 border-purple-200 shadow-md'
                                        : 'bg-white/80 border border-gray-100 shadow-sm'
                                    }`}
                                style={rank <= 3 ? { animation: `fadeInUp 0.3s ease-out ${rank * 0.1}s both` } : undefined}
                            >
                                {/* Rank */}
                                <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${deco.bg} flex items-center justify-center text-white font-bold text-lg shadow-sm flex-shrink-0`}>
                                    {rank <= 3 ? deco.icon : rank}
                                </div>

                                {/* Pet + Name */}
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2">
                                        <span className="text-xl">{getPetEmoji(entry.petId)}</span>
                                        <div className="min-w-0">
                                            <p className={`font-bold text-sm truncate ${isCurrentUser ? 'text-purple-700' : 'text-slate-800'}`}>
                                                {entry.fullName}
                                                {isCurrentUser && <span className="ml-1 text-xs text-purple-500">(Bạn)</span>}
                                            </p>
                                            <p className="text-xs text-slate-400 truncate">{entry.petName}</p>
                                        </div>
                                    </div>
                                </div>

                                {/* Level */}
                                <div className="text-right flex-shrink-0">
                                    <p className={`font-bold text-sm ${deco.textColor}`}>Lv.{entry.level}</p>
                                    <p className="text-xs text-slate-400">{entry.exp} EXP</p>
                                </div>
                            </div>
                        );
                    })}

                    {leaderboard.length === 0 && (
                        <div className="text-center py-16 text-slate-400">
                            <Trophy className="w-16 h-16 mx-auto mb-4 opacity-20" />
                            <p className="font-medium">Chưa đủ dữ liệu</p>
                            <p className="text-sm mt-1">Hãy hoàn thành bài học để lên bảng xếp hạng!</p>
                        </div>
                    )}
                </div>
            </div>

            <style>{`
                @keyframes fadeInUp {
                    from { opacity: 0; transform: translateY(10px); }
                    to { opacity: 1; transform: translateY(0); }
                }
            `}</style>
        </div>
    );
};

export default Leaderboard;
