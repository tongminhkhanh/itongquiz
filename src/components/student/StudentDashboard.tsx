/**
 * StudentDashboard Component
 *
 * Main hub for logged-in students. Cute & Cartoon style (Duolingo-inspired).
 * Layout: Header → Pet Display → EXP Bar → 3D Action Buttons
 */

import React, { useState, useEffect } from 'react';
import { BookOpen, ShoppingBag, Trophy, LogOut, Sparkles } from 'lucide-react';
import { useClassroomStore } from '../../stores/useClassroomStore';
import { useGamificationStore } from '../../stores/useGamificationStore';
import { useQuizStore } from '../../stores/quizStore';
import PetDisplay from '../gamification/PetDisplay';
import StatusBar from '../gamification/StatusBar';
import ShopModal from '../gamification/ShopModal';
import { getAvatarUrl } from '../../config/avatars';

interface StudentDashboardProps {
    onStartStudy: () => void;
    onViewLeaderboard: () => void;
}

const StudentDashboard: React.FC<StudentDashboardProps> = ({
    onStartStudy,
    onViewLeaderboard,
}) => {
    const { studentSession, logoutStudent } = useClassroomStore();
    const { pet, coins, lastReward, clearReward } = useGamificationStore();
    const setView = useQuizStore(s => s.setView);
    const [showShop, setShowShop] = useState(false);

    if (!studentSession) return null;

    useEffect(() => {
        if (studentSession?.username && !pet) {
            useGamificationStore.getState().fetchPetData(studentSession.username);
        }
    }, [studentSession?.username, pet]);

    const handleLogout = () => {
        if (window.confirm('Bạn muốn đăng xuất?')) {
            logoutStudent();
            setView('home');
        }
    };

    return (
        <div className="min-h-screen relative overflow-hidden" style={{ background: '#F7F7F7', fontFamily: "'Quicksand', 'Nunito', sans-serif" }}>
            {/* Floating Background Decorations */}
            <div className="absolute inset-0 pointer-events-none overflow-hidden">
                <div className="absolute top-8 left-6 text-6xl opacity-[0.07]" style={{ animation: 'floatBubble 6s ease-in-out infinite' }}>⭐</div>
                <div className="absolute top-16 right-10 text-5xl opacity-[0.07]" style={{ animation: 'floatBubble 7s ease-in-out infinite 1s' }}>🌈</div>
                <div className="absolute bottom-24 left-12 text-4xl opacity-[0.07]" style={{ animation: 'floatBubble 5s ease-in-out infinite 0.5s' }}>🎵</div>
                <div className="absolute bottom-36 right-8 text-5xl opacity-[0.07]" style={{ animation: 'floatBubble 8s ease-in-out infinite 2s' }}>✨</div>
            </div>

            {/* Content */}
            <div className="relative z-10 max-w-md mx-auto px-4 py-6 flex flex-col min-h-screen">
                {/* Header */}
                <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-3">
                        {studentSession.avatar ? (
                            <div className="w-12 h-12 rounded-full overflow-hidden shadow-lg" style={{ borderBottom: '3px solid #1899D6' }}>
                                <img src={getAvatarUrl(studentSession.avatar)} alt="Avatar" className="w-full h-full object-cover" />
                            </div>
                        ) : (
                            <div className="w-12 h-12 rounded-full flex items-center justify-center text-white text-xl font-extrabold shadow-lg" style={{ background: 'linear-gradient(135deg, #1CB0F6, #1899D6)', borderBottom: '3px solid #1899D6' }}>
                                {studentSession.fullName?.charAt(0)?.toUpperCase() || '?'}
                            </div>
                        )}
                        <div>
                            <p className="font-extrabold text-lg leading-tight" style={{ color: '#4B4B4B' }}>
                                {studentSession.fullName}
                            </p>
                            <p className="text-sm font-semibold" style={{ color: '#AFAFAF' }}>{studentSession.className || 'Học sinh'}</p>
                        </div>
                    </div>
                    <button
                        onClick={handleLogout}
                        className="p-2.5 rounded-xl transition-all hover:scale-110 active:scale-95"
                        style={{ color: '#AFAFAF' }}
                        title="Đăng xuất"
                    >
                        <LogOut className="w-5 h-5" />
                    </button>
                </div>

                {/* Pet Area */}
                <div className="flex-1 flex flex-col items-center justify-center py-4">
                    {pet ? (
                        <>
                            <PetDisplay pet={pet} size="lg" interactive />

                            {/* Status Bar */}
                            <div className="w-full max-w-xs mt-8">
                                <StatusBar
                                    level={pet.level}
                                    exp={pet.exp}
                                    expToNext={pet.expToNext}
                                    coins={coins}
                                    showLevelUp={lastReward?.leveledUp || false}
                                />
                            </div>
                        </>
                    ) : (
                        <div className="text-center py-10">
                            <div className="text-7xl mb-4" style={{ animation: 'eggWobble 2s ease-in-out infinite' }}>🥚</div>
                            <p className="font-bold text-lg" style={{ color: '#AFAFAF' }}>Đang tải Pet...</p>
                        </div>
                    )}
                </div>

                {/* Reward Toast */}
                {lastReward && (
                    <div
                        className="fixed top-4 left-1/2 -translate-x-1/2 z-50 text-white px-5 py-3 rounded-2xl shadow-2xl flex items-center gap-3 max-w-sm"
                        style={{ background: 'linear-gradient(135deg, #58CC02, #58A700)', borderBottom: '4px solid #46A302', animation: 'rewardSlideIn 0.5s ease-out' }}
                    >
                        <Sparkles className="w-6 h-6 flex-shrink-0" />
                        <div>
                            <p className="font-extrabold text-sm">
                                {lastReward.leveledUp ? `🎉 Lên Lv.${lastReward.newLevel}!` : '🌟 Phần thưởng!'}
                            </p>
                            <p className="text-xs text-white/80 font-semibold">
                                +{lastReward.exp} EXP · +{lastReward.coins} Vàng
                            </p>
                        </div>
                        <button
                            onClick={clearReward}
                            className="ml-2 text-white/60 hover:text-white transition-colors text-xl leading-none font-bold"
                        >
                            ×
                        </button>
                    </div>
                )}

                {/* === 3D "Pushy" Action Buttons === */}
                <div className="space-y-3 pb-4">
                    {/* Primary: Study (Green 3D) */}
                    <button
                        onClick={onStartStudy}
                        className="w-full py-4 text-white rounded-2xl font-extrabold text-lg flex items-center justify-center gap-3 transition-all active:translate-y-1 active:shadow-none"
                        style={{
                            background: '#58CC02',
                            borderBottom: '5px solid #58A700',
                            boxShadow: '0 4px 0 #46A302',
                            fontFamily: "'Quicksand', sans-serif",
                        }}
                    >
                        <BookOpen className="w-6 h-6" />
                        Vào Học
                    </button>

                    {/* Secondary row */}
                    <div className="grid grid-cols-2 gap-3">
                        {/* Shop (Blue 3D) */}
                        <button
                            onClick={() => setShowShop(true)}
                            className="py-3.5 text-white rounded-2xl font-extrabold flex items-center justify-center gap-2 transition-all active:translate-y-1 active:shadow-none"
                            style={{
                                background: '#1CB0F6',
                                borderBottom: '5px solid #1899D6',
                                boxShadow: '0 4px 0 #1481B8',
                                fontFamily: "'Quicksand', sans-serif",
                            }}
                        >
                            <ShoppingBag className="w-5 h-5" />
                            Cửa Hàng
                        </button>
                        {/* Leaderboard (Yellow 3D) */}
                        <button
                            onClick={onViewLeaderboard}
                            className="py-3.5 rounded-2xl font-extrabold flex items-center justify-center gap-2 transition-all active:translate-y-1 active:shadow-none"
                            style={{
                                background: '#FFD900',
                                borderBottom: '5px solid #E5C400',
                                boxShadow: '0 4px 0 #CCAE00',
                                color: '#4B4B4B',
                                fontFamily: "'Quicksand', sans-serif",
                            }}
                        >
                            <Trophy className="w-5 h-5" />
                            Xếp Hạng
                        </button>
                    </div>
                </div>
            </div>

            {/* Shop Modal */}
            <ShopModal isOpen={showShop} onClose={() => setShowShop(false)} />

            <style>{`
                @import url('https://fonts.googleapis.com/css2?family=Quicksand:wght@500;600;700;800&display=swap');

                @keyframes rewardSlideIn {
                    from { opacity: 0; transform: translate(-50%, -20px); }
                    to { opacity: 1; transform: translate(-50%, 0); }
                }
                @keyframes floatBubble {
                    0%, 100% { transform: translateY(0) rotate(0deg); }
                    50% { transform: translateY(-15px) rotate(5deg); }
                }
                @keyframes eggWobble {
                    0%, 100% { transform: rotate(0deg); }
                    25% { transform: rotate(-5deg); }
                    75% { transform: rotate(5deg); }
                }
            `}</style>
        </div>
    );
};

export default StudentDashboard;
