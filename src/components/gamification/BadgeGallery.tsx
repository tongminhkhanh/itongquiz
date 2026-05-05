import React, { useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Lock, Trophy, Star } from 'lucide-react';
import type { GameLoopAchievement } from '../../types/gameLoop.types';

interface BadgeGalleryProps {
    isOpen: boolean;
    onClose: () => void;
    achievements: GameLoopAchievement[];
    allAchievements?: typeof ACHIEVEMENT_DEFINITIONS;
}

// All 23 achievement definitions (matching backend)
const ACHIEVEMENT_DEFINITIONS = [
    // Streak
    { code: 'streak_3', title: 'Kiên trì 3 ngày', description: 'Học liên tục 3 ngày không nghỉ.', icon: '🔥', rarity: 'common' },
    { code: 'streak_7', title: 'Kiên trì 7 ngày', description: 'Học liên tục 7 ngày không nghỉ.', icon: '🔥', rarity: 'common' },
    { code: 'streak_30', title: 'Siêu kiên trì', description: 'Học liên tục 30 ngày không nghỉ.', icon: '🔥🔥', rarity: 'rare' },
    { code: 'streak_100', title: 'Huyền thoại', description: 'Học liên tục 100 ngày không nghỉ.', icon: '👑', rarity: 'epic' },
    
    // Subject Mastery
    { code: 'math_expert_50', title: 'Cao thủ Toán', description: 'Làm đúng 50 câu Toán với điểm >= 80%.', icon: '🧮', rarity: 'common' },
    { code: 'math_expert_100', title: 'Bậc thầy Toán', description: 'Làm đúng 100 câu Toán với điểm >= 80%.', icon: '🧮', rarity: 'rare' },
    { code: 'vietnamese_expert_50', title: 'Cao thủ Tiếng Việt', description: 'Làm đúng 50 câu Tiếng Việt với điểm >= 80%.', icon: '📚', rarity: 'common' },
    { code: 'english_expert_50', title: 'English Expert', description: 'Làm đúng 50 câu Tiếng Anh với điểm >= 80%.', icon: '🇬🇧', rarity: 'common' },
    
    // Speed
    { code: 'speed_demon_10', title: 'Tốc độ ánh sáng', description: 'Hoàn thành bài trong < 50% thời gian 10 lần.', icon: '⚡', rarity: 'rare' },
    { code: 'speed_master_30', title: 'Bậc thầy tốc độ', description: 'Hoàn thành bài trong < 50% thời gian 30 lần.', icon: '⚡⚡', rarity: 'epic' },
    
    // Perfect Score
    { code: 'perfect_5', title: 'Điểm 10 liên tiếp', description: 'Đạt 100% điểm 5 lần liên tiếp.', icon: '💯', rarity: 'rare' },
    { code: 'perfect_20', title: 'Thần đồng', description: 'Đạt 100% điểm 20 lần.', icon: '🌟', rarity: 'epic' },
    
    // Time-based
    { code: 'early_bird_10', title: 'Chim sớm', description: 'Làm bài trước 7h sáng 10 lần.', icon: '🌅', rarity: 'common' },
    { code: 'night_owl_10', title: 'Cú đêm', description: 'Làm bài sau 9h tối 10 lần.', icon: '🦉', rarity: 'common' },
    
    // Collection
    { code: 'collector_5', title: 'Nhà sưu tập', description: 'Sở hữu 5 vật phẩm sưu tầm.', icon: '🎁', rarity: 'common' },
    { code: 'collector_10', title: 'Đại gia sưu tầm', description: 'Sở hữu 10 vật phẩm sưu tầm.', icon: '🎁', rarity: 'rare' },
    
    // Total Questions
    { code: 'questions_100', title: 'Trăm câu', description: 'Trả lời đúng 100 câu hỏi.', icon: '📝', rarity: 'common' },
    { code: 'questions_500', title: 'Năm trăm câu', description: 'Trả lời đúng 500 câu hỏi.', icon: '📚', rarity: 'rare' },
    { code: 'questions_1000', title: 'Nghìn câu', description: 'Trả lời đúng 1000 câu hỏi.', icon: '🏆', rarity: 'epic' },
    
    // Mission
    { code: 'first_quiz', title: 'Bắt đầu hành trình', description: 'Hoàn thành bài quiz đầu tiên.', icon: '🚀', rarity: 'common' },
    { code: 'daily_hat_trick', title: 'Trọn bộ nhiệm vụ', description: 'Hoàn thành đủ 3 nhiệm vụ trong một ngày.', icon: '🎯', rarity: 'rare' },
    { code: 'weekly_warrior', title: 'Chiến binh tuần lễ', description: 'Hoàn thành nhiệm vụ 7 ngày liên tiếp.', icon: '⚔️', rarity: 'epic' },
] as const;

const RARITY_COLORS = {
    common: {
        bg: 'bg-slate-100',
        border: 'border-slate-300',
        text: 'text-slate-700',
        glow: 'shadow-slate-200',
    },
    rare: {
        bg: 'bg-blue-100',
        border: 'border-blue-400',
        text: 'text-blue-700',
        glow: 'shadow-blue-300',
    },
    epic: {
        bg: 'bg-purple-100',
        border: 'border-purple-500',
        text: 'text-purple-700',
        glow: 'shadow-purple-400',
    },
};

export const BadgeGallery: React.FC<BadgeGalleryProps> = ({
    isOpen,
    onClose,
    achievements,
}) => {
    const unlockedCodes = useMemo(() => {
        return new Set(achievements.map(a => a.code));
    }, [achievements]);

    const badgesByCategory = useMemo(() => {
        return {
            streak: ACHIEVEMENT_DEFINITIONS.filter(a => a.code.startsWith('streak_')),
            subject: ACHIEVEMENT_DEFINITIONS.filter(a => 
                a.code.includes('math_') || a.code.includes('vietnamese_') || a.code.includes('english_')
            ),
            speed: ACHIEVEMENT_DEFINITIONS.filter(a => a.code.includes('speed_')),
            perfect: ACHIEVEMENT_DEFINITIONS.filter(a => a.code.includes('perfect_')),
            time: ACHIEVEMENT_DEFINITIONS.filter(a => a.code.includes('early_') || a.code.includes('night_')),
            collection: ACHIEVEMENT_DEFINITIONS.filter(a => a.code.includes('collector_')),
            questions: ACHIEVEMENT_DEFINITIONS.filter(a => a.code.includes('questions_')),
            mission: ACHIEVEMENT_DEFINITIONS.filter(a => 
                a.code === 'first_quiz' || a.code === 'daily_hat_trick' || a.code === 'weekly_warrior'
            ),
        };
    }, []);

    const stats = useMemo(() => {
        const total = ACHIEVEMENT_DEFINITIONS.length;
        const unlocked = achievements.length;
        const byRarity = {
            common: achievements.filter(a => a.rarity === 'common').length,
            rare: achievements.filter(a => a.rarity === 'rare').length,
            epic: achievements.filter(a => a.rarity === 'epic').length,
        };
        return { total, unlocked, byRarity };
    }, [achievements]);

    if (!isOpen) return null;

    return (
        <AnimatePresence>
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm p-4 flex items-center justify-center"
                onClick={onClose}
            >
                <motion.div
                    initial={{ opacity: 0, scale: 0.95, y: 20 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, y: 20 }}
                    onClick={(e) => e.stopPropagation()}
                    className="w-full max-w-4xl max-h-[90vh] bg-white rounded-3xl shadow-2xl overflow-hidden flex flex-col"
                >
                    {/* Header */}
                    <div className="bg-gradient-to-r from-purple-600 to-indigo-600 p-6 text-white">
                        <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center gap-3">
                                <div className="w-12 h-12 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center text-2xl">
                                    <Trophy />
                                </div>
                                <div>
                                    <h2 className="text-2xl font-black">Bộ sưu tập huy hiệu</h2>
                                    <p className="text-sm text-purple-100">
                                        {stats.unlocked}/{stats.total} huy hiệu đã mở khóa
                                    </p>
                                </div>
                            </div>
                            <button
                                onClick={onClose}
                                className="w-10 h-10 rounded-full bg-white/20 hover:bg-white/30 transition-colors flex items-center justify-center"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        {/* Progress bar */}
                        <div className="relative h-3 bg-white/20 rounded-full overflow-hidden">
                            <motion.div
                                initial={{ width: 0 }}
                                animate={{ width: `${(stats.unlocked / stats.total) * 100}%` }}
                                transition={{ duration: 1, ease: 'easeOut' }}
                                className="absolute inset-y-0 left-0 bg-gradient-to-r from-yellow-400 to-orange-400 rounded-full"
                            />
                        </div>

                        {/* Rarity stats */}
                        <div className="flex gap-4 mt-4 text-sm">
                            <div className="flex items-center gap-2">
                                <div className="w-3 h-3 rounded-full bg-slate-300" />
                                <span>Common: {stats.byRarity.common}</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <div className="w-3 h-3 rounded-full bg-blue-400" />
                                <span>Rare: {stats.byRarity.rare}</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <div className="w-3 h-3 rounded-full bg-purple-400" />
                                <span>Epic: {stats.byRarity.epic}</span>
                            </div>
                        </div>
                    </div>

                    {/* Content */}
                    <div className="flex-1 overflow-y-auto p-6 space-y-8">
                        {Object.entries(badgesByCategory).map(([category, badges]) => (
                            <div key={category}>
                                <h3 className="text-lg font-black text-slate-800 mb-4 capitalize flex items-center gap-2">
                                    <Star className="w-5 h-5 text-amber-500" />
                                    {category === 'streak' && '🔥 Chuỗi học tập'}
                                    {category === 'subject' && '🧮 Bậc thầy môn học'}
                                    {category === 'speed' && '⚡ Tốc độ'}
                                    {category === 'perfect' && '💯 Điểm tuyệt đối'}
                                    {category === 'time' && '🌅 Thời gian'}
                                    {category === 'collection' && '🎁 Sưu tầm'}
                                    {category === 'questions' && '📝 Tổng câu hỏi'}
                                    {category === 'mission' && '🎯 Nhiệm vụ'}
                                </h3>
                                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                                    {badges.map((badge) => {
                                        const isUnlocked = unlockedCodes.has(badge.code);
                                        const colors = RARITY_COLORS[badge.rarity as keyof typeof RARITY_COLORS];
                                        const unlockedData = achievements.find(a => a.code === badge.code);

                                        return (
                                            <motion.div
                                                key={badge.code}
                                                whileHover={isUnlocked ? { scale: 1.05, y: -4 } : {}}
                                                className={`relative rounded-2xl border-2 p-4 transition-all ${
                                                    isUnlocked
                                                        ? `${colors.bg} ${colors.border} shadow-lg ${colors.glow}`
                                                        : 'bg-slate-50 border-slate-200 opacity-50'
                                                }`}
                                            >
                                                {/* Badge icon */}
                                                <div className="text-4xl mb-2 text-center relative">
                                                    {isUnlocked ? (
                                                        badge.icon
                                                    ) : (
                                                        <div className="relative">
                                                            <span className="opacity-30">{badge.icon}</span>
                                                            <Lock className="absolute inset-0 m-auto w-6 h-6 text-slate-400" />
                                                        </div>
                                                    )}
                                                </div>

                                                {/* Badge info */}
                                                <div className="text-center">
                                                    <h4 className={`text-sm font-black mb-1 ${isUnlocked ? colors.text : 'text-slate-500'}`}>
                                                        {badge.title}
                                                    </h4>
                                                    <p className="text-xs text-slate-500 line-clamp-2">
                                                        {badge.description}
                                                    </p>
                                                    {isUnlocked && unlockedData?.unlockedAt && (
                                                        <p className="text-xs text-slate-400 mt-2">
                                                            {new Date(unlockedData.unlockedAt).toLocaleDateString('vi-VN')}
                                                        </p>
                                                    )}
                                                </div>

                                                {/* Rarity indicator */}
                                                {isUnlocked && (
                                                    <div className="absolute top-2 right-2">
                                                        <div className={`w-2 h-2 rounded-full ${
                                                            badge.rarity === 'common' ? 'bg-slate-400' :
                                                            badge.rarity === 'rare' ? 'bg-blue-500' :
                                                            'bg-purple-600'
                                                        }`} />
                                                    </div>
                                                )}
                                            </motion.div>
                                        );
                                    })}
                                </div>
                            </div>
                        ))}
                    </div>
                </motion.div>
            </motion.div>
        </AnimatePresence>
    );
};

export default BadgeGallery;
