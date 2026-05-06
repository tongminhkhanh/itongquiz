import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Trophy, X, Medal, Award, Coins } from 'lucide-react';
import { useGamificationStore } from '../../stores/useGamificationStore';
import { TopGoldStudent } from '../../types/gamification.types';
import { getAvatarUrl } from '../../config/avatars';

export const StudentFloatingSidebar: React.FC = () => {
    const [isOpen, setIsOpen] = useState(false);
    const { topGoldLeaderboard, fetchTopGoldLeaderboard, isLoading } = useGamificationStore();

    useEffect(() => {
        if (topGoldLeaderboard.length === 0) {
            fetchTopGoldLeaderboard();
        }
    }, [fetchTopGoldLeaderboard, topGoldLeaderboard.length]);

    const getRankIcon = (index: number) => {
        if (index === 0) return <Trophy className="w-6 h-6 text-yellow-400 drop-shadow-[0_0_8px_rgba(250,204,21,0.8)]" />;
        if (index === 1) return <Medal className="w-6 h-6 text-gray-300 drop-shadow-[0_0_6px_rgba(209,213,219,0.8)]" />;
        if (index === 2) return <Award className="w-6 h-6 text-amber-600 drop-shadow-[0_0_6px_rgba(217,119,6,0.8)]" />;
        return <span className="font-bold text-gray-400 w-6 text-center">{index + 1}</span>;
    };

    const getRankStyle = (index: number) => {
        if (index === 0) return 'bg-[#1a2b4c] border-yellow-400/50 shadow-[0_0_15px_rgba(250,204,21,0.2)]';
        if (index === 1) return 'bg-[#1a2b4c] border-gray-300/50';
        if (index === 2) return 'bg-[#1a2b4c] border-amber-600/50';
        return 'bg-[#0f192e] border-blue-500/10 hover:border-blue-400/30';
    };

    return (
        <>
            <div className="fixed right-3 top-[60%] -translate-y-1/2 z-40">
                <motion.button
                    whileHover={{ scale: 1.06 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => setIsOpen(true)}
                    aria-label="Open leaderboard"
                    className="w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-gradient-to-br from-blue-600 to-blue-400 shadow-[0_8px_24px_rgba(59,130,246,0.45)] border border-blue-200/60 p-2.5 flex items-center justify-center relative overflow-hidden"
                >
                    <div className="absolute inset-0 rounded-full shadow-[inset_0_0_10px_rgba(255,255,255,0.2)] pointer-events-none" />
                    <img
                        src="/images/cup_01.png"
                        alt="Cup"
                        className="w-full h-full object-contain drop-shadow-[0_0_8px_rgba(255,255,255,0.5)]"
                    />
                </motion.button>
            </div>

            <AnimatePresence>
                {isOpen && (
                    <>
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setIsOpen(false)}
                            className="fixed inset-0 z-50 bg-[#0b0b23]/40 backdrop-blur-sm"
                        />

                        <motion.div
                            initial={{ x: '100%', opacity: 0 }}
                            animate={{ x: 0, opacity: 1 }}
                            exit={{ x: '100%', opacity: 0 }}
                            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                            className="fixed right-0 top-0 bottom-0 w-full max-w-sm z-50 bg-[#0b0b23] border-l border-blue-500/20 shadow-[-20px_0_40px_rgba(0,0,0,0.5)] flex flex-col overflow-hidden"
                        >
                            <div className="relative p-6 bg-gradient-to-b from-[#1a2b4c] to-[#0b0b23] border-b border-blue-500/20">
                                <div className="absolute inset-0 bg-blue-500/5 backdrop-blur-3xl pointer-events-none" />

                                <button
                                    onClick={() => setIsOpen(false)}
                                    className="absolute top-4 right-4 text-blue-200 hover:text-white bg-blue-500/10 hover:bg-blue-500/20 p-2 rounded-full transition-colors"
                                >
                                    <X className="w-5 h-5" />
                                </button>

                                <div className="flex items-center gap-4 relative z-10 mt-2">
                                    <div className="p-3 bg-gradient-to-br from-amber-400 to-yellow-500 rounded-2xl shadow-[0_0_15px_rgba(250,204,21,0.5)] border border-yellow-300/50">
                                        <Trophy className="w-8 h-8 text-white drop-shadow-[0_0_8px_rgba(255,255,255,0.8)]" />
                                    </div>
                                    <div>
                                        <h2 className="text-2xl font-black text-white tracking-tight drop-shadow-md">Bảng Vàng Ít Ong</h2>
                                        <p className="text-blue-300 text-sm font-medium">Top 10 ong chăm chỉ nhất</p>
                                    </div>
                                </div>
                            </div>

                            <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
                                {isLoading ? (
                                    <div className="flex items-center justify-center h-40">
                                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-400"></div>
                                    </div>
                                ) : topGoldLeaderboard.length === 0 ? (
                                    <div className="flex flex-col items-center justify-center h-40 text-center space-y-3">
                                        <span className="text-4xl">🏆</span>
                                        <p className="text-blue-300">Chưa có ai trong bảng xếp hạng.<br/>Hãy là người đầu tiên!</p>
                                    </div>
                                ) : (
                                    <div className="space-y-3">
                                        {topGoldLeaderboard.map((student: TopGoldStudent, index: number) => (
                                            <motion.div
                                                initial={{ opacity: 0, y: 10 }}
                                                animate={{ opacity: 1, y: 0 }}
                                                transition={{ delay: index * 0.05 }}
                                                key={student.username}
                                                className={`flex items-center gap-3 p-3 rounded-2xl border ${getRankStyle(index)} transition-all duration-300`}
                                            >
                                                <div className="flex items-center justify-center w-8">
                                                    {getRankIcon(index)}
                                                </div>

                                                <div className="relative">
                                                    <div className={`w-12 h-12 rounded-full overflow-hidden border-2 ${index < 3 ? 'border-yellow-400/80 shadow-[0_0_10px_rgba(250,204,21,0.5)]' : 'border-blue-400/50'}`}>
                                                        <img
                                                            src={student.avatar ? getAvatarUrl(student.avatar) : `https://api.dicebear.com/7.x/fun-emoji/svg?seed=${student.username}`}
                                                            alt={student.fullName}
                                                            className="w-full h-full object-cover"
                                                            onError={(e) => {
                                                                (e.target as HTMLImageElement).src = `https://api.dicebear.com/7.x/fun-emoji/svg?seed=${student.username}`;
                                                            }}
                                                        />
                                                    </div>
                                                </div>

                                                <div className="flex-1 min-w-0">
                                                    <h3 className={`font-bold text-base truncate ${index < 3 ? 'text-white' : 'text-blue-100'}`}>
                                                        {student.fullName}
                                                    </h3>
                                                    <div className="flex items-center gap-1.5 text-yellow-400 font-bold bg-yellow-400/10 w-fit px-2 py-0.5 rounded-full mt-0.5 border border-yellow-400/20">
                                                        <Coins className="w-3.5 h-3.5" />
                                                        <span className="text-xs">{student.coins.toLocaleString()}</span>
                                                    </div>
                                                </div>
                                            </motion.div>
                                        ))}
                                    </div>
                                )}
                            </div>

                            <div className="h-6 bg-gradient-to-t from-[#0b0b23] to-transparent pointer-events-none shrink-0" />
                        </motion.div>
                    </>
                )}
            </AnimatePresence>

            <style>{`
                .custom-scrollbar::-webkit-scrollbar {
                    width: 6px;
                }
                .custom-scrollbar::-webkit-scrollbar-track {
                    background: rgba(59, 130, 246, 0.05);
                    border-radius: 10px;
                }
                .custom-scrollbar::-webkit-scrollbar-thumb {
                    background: rgba(59, 130, 246, 0.3);
                    border-radius: 10px;
                }
                .custom-scrollbar::-webkit-scrollbar-thumb:hover {
                    background: rgba(59, 130, 246, 0.5);
                }
            `}</style>
        </>
    );
};
