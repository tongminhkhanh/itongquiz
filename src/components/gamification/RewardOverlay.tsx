/**
 * RewardOverlay Component
 *
 * Full-screen overlay showing rewards after quiz completion.
 * Features: coin rain, EXP animation, level-up celebration.
 */

import React, { useState, useEffect } from 'react';
import { Sparkles, Star, X } from 'lucide-react';

interface RewardOverlayProps {
    expEarned: number;
    coinsEarned: number;
    newLevel: number;
    leveledUp: boolean;
    onClose: () => void;
}

const RewardOverlay: React.FC<RewardOverlayProps> = ({
    expEarned,
    coinsEarned,
    newLevel,
    leveledUp,
    onClose,
}) => {
    const [phase, setPhase] = useState<'coins' | 'exp' | 'levelup' | 'done'>('coins');

    useEffect(() => {
        const timers = [
            setTimeout(() => setPhase('exp'), 1200),
            setTimeout(() => setPhase(leveledUp ? 'levelup' : 'done'), 2400),
            setTimeout(() => { if (leveledUp) setPhase('done'); }, 3600),
        ];
        return () => timers.forEach(clearTimeout);
    }, [leveledUp]);

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center" onClick={onClose}>
            {/* Backdrop */}
            <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />

            {/* Content */}
            <div
                className="relative z-10 text-center"
                onClick={(e) => e.stopPropagation()}
                style={{ animation: 'rewardFadeIn 0.5s ease-out' }}
            >
                {/* Coins Phase */}
                <div className={`transition-all duration-500 ${phase === 'coins' ? 'opacity-100 scale-100' : phase === 'exp' ? 'opacity-0 -translate-y-10' : 'hidden'}`}>
                    <div className="text-7xl mb-4" style={{ animation: 'coinBounce 0.5s ease-out' }}>💰</div>
                    <p className="text-4xl font-black text-yellow-400 drop-shadow-lg" style={{ animation: 'numberPop 0.3s ease-out 0.3s both' }}>
                        +{coinsEarned}
                    </p>
                    <p className="text-lg text-white/80 mt-1 font-medium">Vàng</p>
                </div>

                {/* EXP Phase */}
                <div className={`transition-all duration-500 ${phase === 'exp' ? 'opacity-100 scale-100' : phase === 'levelup' || phase === 'done' ? 'opacity-0 -translate-y-10' : 'hidden'}`}>
                    <div className="text-7xl mb-4" style={{ animation: 'coinBounce 0.5s ease-out' }}>⭐</div>
                    <p className="text-4xl font-black text-purple-300 drop-shadow-lg" style={{ animation: 'numberPop 0.3s ease-out 0.3s both' }}>
                        +{expEarned}
                    </p>
                    <p className="text-lg text-white/80 mt-1 font-medium">EXP</p>
                </div>

                {/* Level Up Phase */}
                {leveledUp && (
                    <div className={`transition-all duration-500 ${phase === 'levelup' ? 'opacity-100 scale-100' : phase === 'done' ? 'opacity-0 -translate-y-10' : 'hidden'}`}>
                        <div className="text-7xl mb-4" style={{ animation: 'levelUpSpin 0.8s ease-out' }}>🎉</div>
                        <p className="text-3xl font-black text-white drop-shadow-lg">
                            Lên cấp!
                        </p>
                        <p className="text-5xl font-black text-amber-400 mt-2" style={{ animation: 'numberPop 0.3s ease-out 0.3s both' }}>
                            Lv.{newLevel}
                        </p>
                    </div>
                )}

                {/* Done Phase */}
                <div className={`transition-all duration-500 ${phase === 'done' ? 'opacity-100 scale-100' : 'hidden'}`}>
                    <div className="bg-white/10 backdrop-blur-md rounded-3xl p-8 border border-white/20 shadow-2xl max-w-xs mx-auto">
                        <Sparkles className="w-12 h-12 text-yellow-400 mx-auto mb-4" />
                        <h3 className="text-2xl font-bold text-white mb-4">Phần thưởng!</h3>
                        <div className="space-y-3">
                            <div className="flex items-center justify-between bg-white/10 rounded-xl px-4 py-2.5">
                                <span className="text-white/80 text-sm">💰 Vàng</span>
                                <span className="text-yellow-400 font-bold text-lg">+{coinsEarned}</span>
                            </div>
                            <div className="flex items-center justify-between bg-white/10 rounded-xl px-4 py-2.5">
                                <span className="text-white/80 text-sm">⭐ EXP</span>
                                <span className="text-purple-300 font-bold text-lg">+{expEarned}</span>
                            </div>
                            {leveledUp && (
                                <div className="flex items-center justify-between bg-amber-500/20 rounded-xl px-4 py-2.5 border border-amber-400/30">
                                    <span className="text-amber-200 text-sm">🎉 Lên cấp</span>
                                    <span className="text-amber-400 font-bold text-lg">Lv.{newLevel}</span>
                                </div>
                            )}
                        </div>
                        <button
                            onClick={onClose}
                            className="mt-6 w-full py-3 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-xl font-bold shadow-lg hover:shadow-xl transition-all active:scale-95"
                        >
                            Tiếp tục xem kết quả
                        </button>
                    </div>
                </div>

                {/* Close hint */}
                {phase !== 'done' && (
                    <p className="text-white/40 text-sm mt-6">Nhấn để bỏ qua</p>
                )}
            </div>

            {/* Coin rain particles */}
            {(phase === 'coins' || phase === 'exp') && (
                <div className="absolute inset-0 pointer-events-none overflow-hidden">
                    {[...Array(15)].map((_, i) => (
                        <div
                            key={i}
                            className="absolute text-2xl"
                            style={{
                                left: `${Math.random() * 100}%`,
                                top: '-30px',
                                animation: `coinRain ${1.5 + Math.random() * 1.5}s ease-in forwards`,
                                animationDelay: `${Math.random() * 0.8}s`,
                            }}
                        >
                            {phase === 'coins' ? '🪙' : '✨'}
                        </div>
                    ))}
                </div>
            )}

            {/* Fireworks for level up */}
            {phase === 'levelup' && (
                <div className="absolute inset-0 pointer-events-none overflow-hidden">
                    {[...Array(20)].map((_, i) => (
                        <div
                            key={i}
                            className="absolute w-2 h-2 rounded-full"
                            style={{
                                left: '50%',
                                top: '50%',
                                backgroundColor: ['#f43f5e', '#8b5cf6', '#3b82f6', '#10b981', '#f59e0b', '#ec4899'][i % 6],
                                animation: `firework 1s ease-out forwards`,
                                animationDelay: `${Math.random() * 0.3}s`,
                                ['--angle' as string]: `${(i * 360) / 20}deg`,
                            }}
                        />
                    ))}
                </div>
            )}

            <style>{`
                @keyframes rewardFadeIn {
                    from { opacity: 0; }
                    to { opacity: 1; }
                }
                @keyframes coinBounce {
                    0% { transform: scale(0) translateY(30px); }
                    60% { transform: scale(1.3) translateY(-10px); }
                    100% { transform: scale(1) translateY(0); }
                }
                @keyframes numberPop {
                    0% { opacity: 0; transform: scale(0.5); }
                    100% { opacity: 1; transform: scale(1); }
                }
                @keyframes coinRain {
                    0% { transform: translateY(0) rotate(0deg); opacity: 1; }
                    100% { transform: translateY(100vh) rotate(720deg); opacity: 0; }
                }
                @keyframes levelUpSpin {
                    0% { transform: scale(0) rotate(-180deg); }
                    60% { transform: scale(1.4) rotate(20deg); }
                    100% { transform: scale(1) rotate(0deg); }
                }
                @keyframes firework {
                    0% { transform: translate(0, 0) scale(1); opacity: 1; }
                    100% {
                        transform: translate(
                            calc(cos(var(--angle)) * 150px),
                            calc(sin(var(--angle)) * 150px)
                        ) scale(0);
                        opacity: 0;
                    }
                }
            `}</style>
        </div>
    );
};

export default RewardOverlay;
