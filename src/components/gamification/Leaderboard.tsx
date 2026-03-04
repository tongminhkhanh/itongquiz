/**
 * Leaderboard Component — "Đấu Trường Ong Vàng" (Hybrid Edition)
 *
 * Features:
 * - 3D Podium for Top 3 with crown/medal decorations
 * - Glassmorphism cards for rank #4+
 * - Streak fire indicator (consecutive days)
 * - Confetti on first load
 * - Micro-animations (hover, fade-in, glow)
 * - Responsive (mobile-first)
 */

import React, { useEffect, useState, useMemo, useRef } from 'react';
import { ArrowLeft, Users } from 'lucide-react';
import { useGamificationStore } from '../../stores/useGamificationStore';
import { useClassroomStore } from '../../stores/useClassroomStore';
import { LeaderboardEntry } from '../../types/gamification.types';
import { getAvatarUrl } from '../../config/avatars';
import { fetchResultsFromSheets } from '../../services/googleSheetService';
import { GOOGLE_SHEET_ID, RESULTS_GID } from '../../config/constants';
import { StudentResult } from '../../types';

// Fluent 3D Emoji CDN
const FLUENT_CDN = 'https://cdn.jsdelivr.net/gh/microsoft/fluentui-emoji@main/assets';

interface LeaderboardProps {
    onBack: () => void;
}

const Leaderboard: React.FC<LeaderboardProps> = ({ onBack }) => {
    const { leaderboard, fetchLeaderboard } = useGamificationStore();
    const { studentSession } = useClassroomStore();
    const [showConfetti, setShowConfetti] = useState(true);
    const confettiTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const [resultsMap, setResultsMap] = useState<Map<string, { correct: number; wrong: number }>>(new Map());

    useEffect(() => {
        fetchLeaderboard();
        // Fetch quiz results to get correct/wrong counts
        const loadResults = async () => {
            try {
                const results = await fetchResultsFromSheets(GOOGLE_SHEET_ID, RESULTS_GID);
                // Aggregate by student name
                const map = new Map<string, { correct: number; wrong: number }>();
                results.forEach((r: StudentResult) => {
                    const key = r.studentName;
                    const existing = map.get(key);
                    const correct = r.correctCount || 0;
                    const total = r.totalQuestions || 0;
                    if (existing) {
                        existing.correct += correct;
                        existing.wrong += (total - correct);
                    } else {
                        map.set(key, { correct, wrong: total - correct });
                    }
                });
                setResultsMap(map);
            } catch (err) {
                console.error('[Leaderboard] Failed to fetch results:', err);
            }
        };
        loadResults();
        // Auto-hide confetti after 3 seconds
        confettiTimerRef.current = setTimeout(() => setShowConfetti(false), 3000);
        return () => {
            if (confettiTimerRef.current) clearTimeout(confettiTimerRef.current);
        };
    }, []);

    // Get avatar URL for a student
    const getStudentAvatar = (entry: LeaderboardEntry) => {
        // Use avatar field if available, otherwise fallback
        return getAvatarUrl(entry.avatar || undefined);
    };

    // Check if entry is the current logged-in student
    const isCurrentUser = (username: string) => {
        return studentSession && studentSession.username === username;
    };

    // Rank badge config
    const getRankBadge = (rank: number) => {
        if (rank === 1) return { label: 'Thủ Khoa', color: '#F59E0B', bg: 'linear-gradient(135deg, #FDE68A, #F59E0B)' };
        if (rank === 2) return { label: 'Xuất Sắc', color: '#9CA3AF', bg: 'linear-gradient(135deg, #E5E7EB, #9CA3AF)' };
        if (rank === 3) return { label: 'Giỏi', color: '#D97706', bg: 'linear-gradient(135deg, #FCD34D, #D97706)' };
        if (rank <= 10) return { label: 'Giỏi', color: '#3B82F6', bg: 'linear-gradient(135deg, #BFDBFE, #3B82F6)' };
        if (rank <= 20) return { label: 'Khá', color: '#10B981', bg: 'linear-gradient(135deg, #A7F3D0, #10B981)' };
        return { label: 'Chăm Chỉ', color: '#F97316', bg: 'linear-gradient(135deg, #FED7AA, #F97316)' };
    };

    const top3 = leaderboard.slice(0, 3);
    const rest = leaderboard.slice(3);

    // Confetti particles
    const confettiParticles = useMemo(() => {
        return Array.from({ length: 40 }, (_, i) => ({
            id: i,
            left: Math.random() * 100,
            delay: Math.random() * 2,
            duration: 1.5 + Math.random() * 2,
            size: 4 + Math.random() * 6,
            color: ['#F59E0B', '#EF4444', '#3B82F6', '#10B981', '#8B5CF6', '#EC4899'][Math.floor(Math.random() * 6)],
            rotation: Math.random() * 360,
        }));
    }, []);

    return (
        <div className="lb-arena">
            {/* Confetti Layer */}
            {showConfetti && (
                <div className="lb-confetti-layer">
                    {confettiParticles.map((p) => (
                        <div
                            key={p.id}
                            className="lb-confetti-particle"
                            style={{
                                left: `${p.left}%`,
                                animationDelay: `${p.delay}s`,
                                animationDuration: `${p.duration}s`,
                                width: `${p.size}px`,
                                height: `${p.size}px`,
                                backgroundColor: p.color,
                                transform: `rotate(${p.rotation}deg)`,
                            }}
                        />
                    ))}
                </div>
            )}

            {/* Header */}
            <div className="lb-header">
                <button className="lb-header__back" onClick={onBack}>
                    <ArrowLeft className="w-5 h-5" />
                </button>
                <div className="lb-header__title">
                    <img
                        src={`${FLUENT_CDN}/Trophy/3D/trophy_3d.png`}
                        alt="Trophy"
                        className="lb-header__trophy"
                    />
                    <div>
                        <h1>Đấu Trường Ong Vàng</h1>
                        <p>Ai là ong chăm chỉ nhất? 🐝</p>
                    </div>
                </div>
            </div>

            {/* Podium — Top 3 */}
            {top3.length > 0 && (
                <div className="lb-podium">
                    {/* Decorative light beam behind #1 */}
                    <div className="lb-podium__beam" />

                    <div className="lb-podium__stage">
                        {/* #2 — Left */}
                        {top3.length >= 2 && (
                            <PodiumCard
                                entry={top3[1]}
                                rank={2}
                                getPetEmoji={getStudentAvatar}
                                isCurrentUser={isCurrentUser(top3[1].username)}
                                correctWrong={resultsMap.get(top3[1].fullName)}
                            />
                        )}

                        {/* #1 — Center (tallest) */}
                        {top3.length >= 1 && (
                            <PodiumCard
                                entry={top3[0]}
                                rank={1}
                                getPetEmoji={getStudentAvatar}
                                isCurrentUser={isCurrentUser(top3[0].username)}
                                correctWrong={resultsMap.get(top3[0].fullName)}
                            />
                        )}

                        {/* #3 — Right */}
                        {top3.length >= 3 && (
                            <PodiumCard
                                entry={top3[2]}
                                rank={3}
                                getPetEmoji={getStudentAvatar}
                                isCurrentUser={isCurrentUser(top3[2].username)}
                                correctWrong={resultsMap.get(top3[2].fullName)}
                            />
                        )}
                    </div>
                </div>
            )}

            {/* Leaderboard List (#4 and below) */}
            <div className="lb-list">
                {rest.length > 0 ? (
                    rest.map((entry, index) => {
                        const rank = index + 4;
                        const badge = getRankBadge(rank);
                        const isCurrent = isCurrentUser(entry.username);

                        return (
                            <div
                                key={entry.username}
                                className={`lb-row ${isCurrent ? 'lb-row--current' : ''}`}
                                style={{ animationDelay: `${index * 0.06}s` }}
                            >
                                {/* Rank number */}
                                <div className="lb-row__rank" style={{ background: badge.bg, color: '#fff' }}>
                                    {rank}
                                </div>

                                {/* Avatar + Name */}
                                <img className="lb-row__avatar-img" src={getStudentAvatar(entry)} alt={entry.fullName} />
                                <div className="lb-row__info">
                                    <span className="lb-row__name">
                                        {entry.fullName}
                                        {isCurrent && <span className="lb-row__you">(Bạn)</span>}
                                    </span>
                                    <span className="lb-row__petname">{entry.petName}</span>
                                </div>

                                {/* Level + EXP + Correct/Wrong */}
                                <div className="lb-row__stats">
                                    <span className="lb-row__level" style={{ color: badge.color }}>Lv.{entry.level}</span>
                                    <span className="lb-row__exp">{entry.exp} EXP</span>
                                    {resultsMap.has(entry.fullName) && (
                                        <div style={{ display: 'flex', gap: '6px', fontSize: '10px', marginTop: '2px' }}>
                                            <span style={{ color: '#16a34a' }}>✅ {resultsMap.get(entry.fullName)!.correct}</span>
                                            <span style={{ color: '#dc2626' }}>❌ {resultsMap.get(entry.fullName)!.wrong}</span>
                                        </div>
                                    )}
                                </div>
                            </div>
                        );
                    })
                ) : leaderboard.length <= 3 && leaderboard.length > 0 ? (
                    null
                ) : leaderboard.length === 0 ? (
                    <div className="lb-empty">
                        <img
                            src={`${FLUENT_CDN}/Honeybee/3D/honeybee_3d.png`}
                            alt="No data"
                            className="lb-empty__icon"
                        />
                        <p>Chưa có dữ liệu xếp hạng</p>
                        <span>Hãy hoàn thành bài học để lên bảng vàng! 🌟</span>
                    </div>
                ) : null}
            </div>

            {/* Footer */}
            {leaderboard.length > 0 && (
                <div className="lb-footer">
                    <Users className="w-4 h-4" />
                    <span>Tổng: <strong>{leaderboard.length}</strong> ong nhỏ đã tham gia</span>
                </div>
            )}

            {/* Inline Styles */}
            <style>{leaderboardStyles}</style>
        </div>
    );
};

// --- Podium Card Sub-Component ---
interface PodiumCardProps {
    entry: LeaderboardEntry;
    rank: number;
    getPetEmoji: (entry: LeaderboardEntry) => string;
    isCurrentUser: boolean;
    correctWrong?: { correct: number; wrong: number };
}

const FLUENT = 'https://cdn.jsdelivr.net/gh/microsoft/fluentui-emoji@main/assets';

const PodiumCard: React.FC<PodiumCardProps> = ({ entry, rank, getPetEmoji, isCurrentUser, correctWrong }) => {
    const config = {
        1: {
            medal: `${FLUENT}/Crown/3D/crown_3d.png`,
            pedestalH: 100,
            gradient: 'linear-gradient(180deg, #FDE68A 0%, #F59E0B 100%)',
            cardClass: 'lb-podium-card--gold',
            shadow: '0 0 30px rgba(245, 158, 11, 0.4)',
        },
        2: {
            medal: `${FLUENT}/2nd%20place%20medal/3D/2nd_place_medal_3d.png`,
            pedestalH: 72,
            gradient: 'linear-gradient(180deg, #E5E7EB 0%, #9CA3AF 100%)',
            cardClass: 'lb-podium-card--silver',
            shadow: '0 0 20px rgba(156, 163, 175, 0.3)',
        },
        3: {
            medal: `${FLUENT}/3rd%20place%20medal/3D/3rd_place_medal_3d.png`,
            pedestalH: 56,
            gradient: 'linear-gradient(180deg, #FCD34D 0%, #D97706 100%)',
            cardClass: 'lb-podium-card--bronze',
            shadow: '0 0 20px rgba(217, 119, 6, 0.3)',
        },
    }[rank] || { medal: '', pedestalH: 56, gradient: '', cardClass: '', shadow: '' };

    return (
        <div className={`lb-podium-card ${config.cardClass}`} style={{ boxShadow: config.shadow }}>
            {/* Medal / Crown */}
            <img src={config.medal} alt={`#${rank}`} className="lb-podium-card__medal" />

            {/* Avatar circle */}
            <div className={`lb-podium-card__avatar ${rank === 1 ? 'lb-podium-card__avatar--glow' : ''}`}>
                <img src={getPetEmoji(entry)} alt={entry.fullName} className="lb-podium-card__avatar-img" />
            </div>

            {/* Name + Pet name */}
            <span className="lb-podium-card__name">
                {entry.fullName}
                {isCurrentUser && <span className="lb-podium-card__you"> (Bạn)</span>}
            </span>
            <span className="lb-podium-card__petname">{entry.petName}</span>

            {/* Level & EXP */}
            <div className="lb-podium-card__score">
                <img src={`${FLUENT}/Star/3D/star_3d.png`} alt="star" className="lb-podium-card__star" />
                Lv.{entry.level}
            </div>
            <span className="lb-podium-card__exp">{entry.exp} EXP</span>
            {correctWrong && (
                <div style={{ display: 'flex', gap: '4px', fontSize: '9px', marginTop: '2px' }}>
                    <span style={{ color: '#16a34a' }}>✅{correctWrong.correct}</span>
                    <span style={{ color: '#dc2626' }}>❌{correctWrong.wrong}</span>
                </div>
            )}

            {/* Pedestal */}
            <div
                className="lb-podium-card__pedestal"
                style={{ height: config.pedestalH, background: config.gradient }}
            >
                #{rank}
            </div>
        </div>
    );
};

// --- Styles ---
const leaderboardStyles = `
/* ===========================
   LEADERBOARD — ĐẤU TRƯỜNG ONG VÀNG
   =========================== */

.lb-arena {
    min-height: 100vh;
    background: linear-gradient(180deg, #FEF3C7 0%, #FFFBEB 30%, #FFF7ED 60%, #FFFFFF 100%);
    position: relative;
    overflow-x: hidden;
    padding-bottom: 32px;
}

/* --- Confetti --- */
.lb-confetti-layer {
    position: fixed;
    inset: 0;
    pointer-events: none;
    z-index: 50;
    overflow: hidden;
}
.lb-confetti-particle {
    position: absolute;
    top: -20px;
    border-radius: 2px;
    animation: confettiFall linear forwards;
    opacity: 0.9;
}
@keyframes confettiFall {
    0% { transform: translateY(-20px) rotate(0deg); opacity: 1; }
    100% { transform: translateY(105vh) rotate(720deg); opacity: 0; }
}

/* --- Header --- */
.lb-header {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 16px 20px;
    background: linear-gradient(135deg, #F59E0B 0%, #F97316 100%);
    color: white;
    position: relative;
    z-index: 10;
}
.lb-header__back {
    padding: 8px;
    border: none;
    background: rgba(255,255,255,0.2);
    border-radius: 12px;
    color: white;
    cursor: pointer;
    transition: background 0.2s;
    display: flex;
    align-items: center;
    justify-content: center;
}
.lb-header__back:hover { background: rgba(255,255,255,0.35); }
.lb-header__title {
    display: flex;
    align-items: center;
    gap: 10px;
    flex: 1;
}
.lb-header__trophy {
    width: 44px;
    height: 44px;
    filter: drop-shadow(0 2px 6px rgba(0,0,0,0.2));
    animation: trophyBounce 2s ease-in-out infinite;
}
@keyframes trophyBounce {
    0%, 100% { transform: translateY(0); }
    50% { transform: translateY(-6px); }
}
.lb-header__title h1 {
    font-size: 1.25rem;
    font-weight: 800;
    margin: 0;
    text-shadow: 0 1px 3px rgba(0,0,0,0.15);
}
.lb-header__title p {
    font-size: 0.8rem;
    margin: 0;
    opacity: 0.9;
}

/* --- Podium --- */
.lb-podium {
    position: relative;
    padding: 24px 16px 0;
    overflow: visible;
}
.lb-podium__beam {
    position: absolute;
    top: -20px;
    left: 50%;
    transform: translateX(-50%);
    width: 120px;
    height: 200px;
    background: radial-gradient(ellipse at center, rgba(245,158,11,0.2) 0%, transparent 70%);
    pointer-events: none;
}
.lb-podium__stage {
    display: flex;
    align-items: flex-end;
    justify-content: center;
    gap: 8px;
    max-width: 420px;
    margin: 0 auto;
}

/* --- Podium Card --- */
.lb-podium-card {
    display: flex;
    flex-direction: column;
    align-items: center;
    background: rgba(255,255,255,0.85);
    backdrop-filter: blur(10px);
    border-radius: 20px 20px 0 0;
    padding: 8px 10px 0;
    position: relative;
    width: 110px;
    transition: transform 0.3s ease;
    animation: podiumRise 0.6s ease-out both;
}
.lb-podium-card:hover { transform: translateY(-4px) scale(1.02); }
.lb-podium-card--gold {
    width: 130px;
    border: 2px solid rgba(245,158,11,0.3);
    animation-delay: 0.2s;
}
.lb-podium-card--silver { animation-delay: 0.1s; border: 2px solid rgba(156,163,175,0.2); }
.lb-podium-card--bronze { animation-delay: 0.3s; border: 2px solid rgba(217,119,6,0.2); }

@keyframes podiumRise {
    from { opacity: 0; transform: translateY(30px); }
    to { opacity: 1; transform: translateY(0); }
}

.lb-podium-card__medal {
    width: 36px;
    height: 36px;
    position: absolute;
    top: -18px;
    filter: drop-shadow(0 2px 4px rgba(0,0,0,0.15));
}
.lb-podium-card--gold .lb-podium-card__medal {
    width: 44px;
    height: 44px;
    top: -22px;
    animation: crownPulse 3s ease-in-out infinite;
}
@keyframes crownPulse {
    0%, 100% { filter: drop-shadow(0 2px 4px rgba(245,158,11,0.3)); transform: scale(1); }
    50% { filter: drop-shadow(0 4px 12px rgba(245,158,11,0.6)); transform: scale(1.08); }
}

.lb-podium-card__avatar {
    width: 52px;
    height: 52px;
    border-radius: 50%;
    background: linear-gradient(135deg, #FEF3C7, #FDE68A);
    display: flex;
    align-items: center;
    justify-content: center;
    margin-top: 16px;
    border: 3px solid rgba(245,158,11,0.3);
    position: relative;
}
.lb-podium-card--gold .lb-podium-card__avatar {
    width: 64px;
    height: 64px;
    border-color: rgba(245,158,11,0.5);
}
.lb-podium-card__avatar--glow {
    box-shadow: 0 0 20px rgba(245,158,11,0.4);
    animation: avatarGlow 2s ease-in-out infinite alternate;
}
@keyframes avatarGlow {
    from { box-shadow: 0 0 12px rgba(245,158,11,0.3); }
    to   { box-shadow: 0 0 24px rgba(245,158,11,0.6); }
}

.lb-podium-card__avatar-img {
    width: 100%;
    height: 100%;
    object-fit: cover;
    border-radius: 50%;
}

.lb-row__avatar-img {
    width: 40px;
    height: 40px;
    border-radius: 50%;
    object-fit: cover;
    flex-shrink: 0;
    border: 2px solid #E2E8F0;
    box-shadow: 0 2px 6px rgba(0,0,0,0.08);
}

.lb-podium-card__name {
    font-size: 0.75rem;
    font-weight: 700;
    color: #1E293B;
    margin-top: 6px;
    text-align: center;
    line-height: 1.2;
    max-width: 100%;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
}
.lb-podium-card__you { color: #8B5CF6; font-size: 0.65rem; }
.lb-podium-card__petname {
    font-size: 0.65rem;
    color: #94A3B8;
    margin-top: 1px;
}
.lb-podium-card__score {
    display: flex;
    align-items: center;
    gap: 3px;
    font-size: 0.8rem;
    font-weight: 800;
    color: #F59E0B;
    margin-top: 4px;
}
.lb-podium-card__star { width: 16px; height: 16px; }
.lb-podium-card__exp {
    font-size: 0.6rem;
    color: #94A3B8;
    margin-top: 1px;
    margin-bottom: 6px;
}

.lb-podium-card__pedestal {
    width: calc(100% + 24px);
    margin: 0 -12px;
    border-radius: 0 0 4px 4px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 1.2rem;
    font-weight: 900;
    color: rgba(255,255,255,0.8);
    text-shadow: 0 1px 2px rgba(0,0,0,0.15);
    margin-top: auto;
    position: relative;
}
.lb-podium-card--gold .lb-podium-card__pedestal { font-size: 1.5rem; }

/* --- List --- */
.lb-list {
    padding: 20px 16px 0;
    max-width: 480px;
    margin: 0 auto;
    display: flex;
    flex-direction: column;
    gap: 8px;
}

.lb-row {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 12px 14px;
    background: rgba(255,255,255,0.75);
    backdrop-filter: blur(8px);
    border-radius: 16px;
    border: 1px solid rgba(226,232,240,0.6);
    box-shadow: 0 2px 8px rgba(0,0,0,0.04);
    transition: all 0.25s ease;
    animation: rowFadeIn 0.4s ease-out both;
    cursor: default;
}
.lb-row:hover {
    transform: translateY(-3px);
    box-shadow: 0 6px 16px rgba(0,0,0,0.08);
    border-color: rgba(203,213,225,0.8);
}
@keyframes rowFadeIn {
    from { opacity: 0; transform: translateY(12px); }
    to   { opacity: 1; transform: translateY(0); }
}

.lb-row--current {
    background: linear-gradient(135deg, rgba(139,92,246,0.08) 0%, rgba(168,85,247,0.08) 100%);
    border: 2px solid rgba(139,92,246,0.35);
    box-shadow: 0 0 16px rgba(139,92,246,0.12);
    animation: currentGlow 3s ease-in-out infinite alternate, rowFadeIn 0.4s ease-out both;
}
@keyframes currentGlow {
    from { box-shadow: 0 0 12px rgba(139,92,246,0.1); }
    to   { box-shadow: 0 0 24px rgba(139,92,246,0.2); }
}

.lb-row__rank {
    width: 36px;
    height: 36px;
    border-radius: 12px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 0.85rem;
    font-weight: 800;
    flex-shrink: 0;
    box-shadow: 0 2px 6px rgba(0,0,0,0.1);
}

.lb-row__pet {
    font-size: 1.4rem;
    flex-shrink: 0;
}

.lb-row__info {
    flex: 1;
    min-width: 0;
    display: flex;
    flex-direction: column;
}
.lb-row__name {
    font-size: 0.85rem;
    font-weight: 700;
    color: #1E293B;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
}
.lb-row__you {
    font-size: 0.7rem;
    color: #8B5CF6;
    margin-left: 4px;
    font-weight: 600;
}
.lb-row__petname {
    font-size: 0.7rem;
    color: #94A3B8;
    margin-top: 1px;
}

.lb-row__stats {
    text-align: right;
    flex-shrink: 0;
    display: flex;
    flex-direction: column;
    align-items: flex-end;
}
.lb-row__level {
    font-size: 0.85rem;
    font-weight: 800;
}
.lb-row__exp {
    font-size: 0.65rem;
    color: #94A3B8;
}

/* --- Empty --- */
.lb-empty {
    text-align: center;
    padding: 48px 20px;
    color: #94A3B8;
}
.lb-empty__icon {
    width: 80px;
    height: 80px;
    margin: 0 auto 16px;
    opacity: 0.5;
}
.lb-empty p {
    font-weight: 600;
    font-size: 1rem;
    color: #64748B;
    margin: 0 0 4px;
}
.lb-empty span {
    font-size: 0.85rem;
}

/* --- Footer --- */
.lb-footer {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 6px;
    padding: 20px 16px 0;
    color: #94A3B8;
    font-size: 0.8rem;
}
.lb-footer strong { color: #64748B; }

/* --- Mobile Responsive (phones) --- */
@media (max-width: 480px) {
    .lb-header { padding: 12px 12px; }
    .lb-header__trophy { width: 32px; height: 32px; }
    .lb-header__title h1 { font-size: 1rem; }
    .lb-header__title p { font-size: 0.7rem; }
    .lb-header__back { width: 32px; height: 32px; }

    .lb-podium { padding: 16px 8px 0; }
    .lb-podium__stage { gap: 4px; max-width: 320px; }

    .lb-podium-card { width: 90px; padding: 6px 6px 0; border-radius: 14px 14px 0 0; }
    .lb-podium-card--gold { width: 105px; }
    .lb-podium-card__medal { width: 28px; height: 28px; top: -14px; }
    .lb-podium-card--gold .lb-podium-card__medal { width: 34px; height: 34px; top: -17px; }
    .lb-podium-card__avatar { width: 40px; height: 40px; margin-top: 12px; border-width: 2px; }
    .lb-podium-card--gold .lb-podium-card__avatar { width: 50px; height: 50px; }
    .lb-podium-card__name { font-size: 0.65rem; margin-top: 4px; }
    .lb-podium-card__you { font-size: 0.55rem; }
    .lb-podium-card__petname { font-size: 0.55rem; }
    .lb-podium-card__score { font-size: 0.65rem; margin-top: 2px; gap: 2px; }
    .lb-podium-card__star { width: 12px; height: 12px; }
    .lb-podium-card__exp { font-size: 0.5rem; margin-bottom: 4px; }
    .lb-podium-card__pedestal { font-size: 1rem; font-weight: 900; }
    .lb-podium-card--gold .lb-podium-card__pedestal { font-size: 1.15rem; }

    .lb-list { padding: 12px 8px; gap: 6px; }
    .lb-row { padding: 10px 10px; gap: 8px; border-radius: 12px; }
    .lb-row__rank { width: 30px; height: 30px; font-size: 0.75rem; border-radius: 10px; }
    .lb-row__avatar-img { width: 34px; height: 34px; }
    .lb-row__name { font-size: 0.78rem; }
    .lb-row__you { font-size: 0.6rem; }
    .lb-row__petname { font-size: 0.6rem; }
    .lb-row__level { font-size: 0.78rem; }
    .lb-row__exp { font-size: 0.6rem; }

    .lb-footer { padding: 12px 10px 0; font-size: 0.7rem; }
}

/* --- Desktop Responsive --- */
@media (min-width: 640px) {
    .lb-podium-card { width: 140px; padding: 12px 16px 0; }
    .lb-podium-card--gold { width: 160px; }
    .lb-podium-card__avatar { width: 60px; height: 60px; }
    .lb-podium-card--gold .lb-podium-card__avatar { width: 76px; height: 76px; }
    .lb-podium-card__pet-emoji { font-size: 1.8rem; }
    .lb-podium-card--gold .lb-podium-card__pet-emoji { font-size: 2.4rem; }
    .lb-podium-card__name { font-size: 0.85rem; }
    .lb-podium-card__score { font-size: 0.9rem; }
    .lb-list { max-width: 540px; }
    .lb-row { padding: 14px 18px; }
}
`;

export default Leaderboard;
