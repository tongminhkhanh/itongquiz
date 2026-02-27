/**
 * LeaderboardPage Component
 *
 * Displays a leaderboard of students ranked by cumulative quiz scores.
 * Features: Top 3 podium, grade filters, time period filters, scrollable list.
 */

import React, { useState, useMemo, useEffect } from 'react';
import { Trophy, ArrowLeft, TrendingUp, TrendingDown, Minus, Star, Users, Filter } from 'lucide-react';
import { StudentResult } from '../../types';
import { fetchResultsFromSheets } from '../../services/googleSheetService';
import { GOOGLE_SHEET_ID, RESULTS_GID } from '../../config/constants';
import { useClassroomStore } from '../../stores/useClassroomStore';
import { getAvatarUrl } from '../../config/avatars';

// Fluent 3D Emoji CDN
const FLUENT_CDN = 'https://cdn.jsdelivr.net/gh/microsoft/fluentui-emoji@main/assets';

interface LeaderboardEntry {
    rank: number;
    studentName: string;
    studentClass: string;
    totalScore: number; // Cumulative score points
    quizCount: number; // Number of quizzes taken
    avgScore: number; // Average score per quiz (0-10)
    totalCorrect: number; // Total correct answers across all quizzes
    totalWrong: number; // Total wrong answers across all quizzes
}

interface LeaderboardPageProps {
    onBack: () => void;
}

const LeaderboardPage: React.FC<LeaderboardPageProps> = ({ onBack }) => {
    const [results, setResults] = useState<StudentResult[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [selectedGrade, setSelectedGrade] = useState<string>('all');
    const [timePeriod, setTimePeriod] = useState<string>('all');
    const studentSession = useClassroomStore(s => s.studentSession);

    // Fetch results on mount
    useEffect(() => {
        const loadResults = async () => {
            setIsLoading(true);
            try {
                const data = await fetchResultsFromSheets(GOOGLE_SHEET_ID, RESULTS_GID);
                setResults(data);
            } catch (err) {
                console.error('Failed to fetch results for leaderboard:', err);
            } finally {
                setIsLoading(false);
            }
        };
        loadResults();
    }, []);

    // Process and rank students
    const leaderboard = useMemo<LeaderboardEntry[]>(() => {
        // Filter by time period
        let filtered = results;
        if (timePeriod !== 'all') {
            const now = new Date();
            let cutoff: Date;
            if (timePeriod === 'week') {
                cutoff = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
            } else {
                // month
                cutoff = new Date(now.getFullYear(), now.getMonth(), 1);
            }
            filtered = results.filter(r => {
                try {
                    return new Date(r.submittedAt) >= cutoff;
                } catch {
                    return false;
                }
            });
        }

        // Filter by grade
        if (selectedGrade !== 'all') {
            filtered = filtered.filter(r => {
                const cls = r.studentClass.toLowerCase();
                return cls.startsWith(selectedGrade);
            });
        }

        // Aggregate by student name + class
        const studentMap = new Map<string, { name: string; cls: string; totalScore: number; count: number; totalCorrect: number; totalQuestions: number }>();
        filtered.forEach(r => {
            const key = `${r.studentName}__${r.studentClass}`;
            const existing = studentMap.get(key);
            if (existing) {
                existing.totalScore += Math.round(r.score * 100);
                existing.count += 1;
                existing.totalCorrect += r.correctCount || 0;
                existing.totalQuestions += r.totalQuestions || 0;
            } else {
                studentMap.set(key, {
                    name: r.studentName,
                    cls: r.studentClass,
                    totalScore: Math.round(r.score * 100),
                    count: 1,
                    totalCorrect: r.correctCount || 0,
                    totalQuestions: r.totalQuestions || 0,
                });
            }
        });

        // Convert to array and sort
        const entries: LeaderboardEntry[] = Array.from(studentMap.values())
            .map((s, _i) => ({
                rank: 0,
                studentName: s.name,
                studentClass: s.cls,
                totalScore: s.totalScore,
                quizCount: s.count,
                avgScore: s.count > 0 ? Math.round((s.totalScore / s.count / 100) * 10) / 10 : 0,
                totalCorrect: s.totalCorrect,
                totalWrong: s.totalQuestions - s.totalCorrect,
            }))
            .sort((a, b) => b.totalScore - a.totalScore);

        // Assign ranks
        entries.forEach((e, i) => { e.rank = i + 1; });

        return entries;
    }, [results, selectedGrade, timePeriod]);

    const top3 = leaderboard.slice(0, 3);
    const rest = leaderboard.slice(3);

    // Avatar color palette
    const avatarColors = [
        'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
        'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
        'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)',
        'linear-gradient(135deg, #fa709a 0%, #fee140 100%)',
        'linear-gradient(135deg, #a18cd1 0%, #fbc2eb 100%)',
    ];

    const getAvatarColor = (name: string) => {
        const idx = name.charCodeAt(0) % avatarColors.length;
        return avatarColors[idx];
    };

    const getInitial = (name: string) => {
        return name.charAt(0).toUpperCase();
    };

    // Check if entry matches logged-in student (to show their avatar sticker)
    const isCurrentStudent = (name: string) => {
        return studentSession && studentSession.fullName === name;
    };

    // Render avatar: sticker for logged-in student, initial char for others
    const renderAvatarContent = (name: string, isLarge?: boolean) => {
        if (isCurrentStudent(name) && studentSession?.avatar) {
            const size = isLarge ? 'w-12 h-12' : 'w-9 h-9';
            return <img src={getAvatarUrl(studentSession.avatar)} alt="Avatar" className={`${size} object-contain`} />;
        }
        return isLarge ? <span style={{ fontSize: '1.5rem' }}>{getInitial(name)}</span> : getInitial(name);
    };

    // Grade tabs
    const gradeTabs = [
        { id: 'all', label: 'Tất cả' },
        { id: '1', label: 'Lớp 1' },
        { id: '2', label: 'Lớp 2' },
        { id: '3', label: 'Lớp 3' },
        { id: '4', label: 'Lớp 4' },
        { id: '5', label: 'Lớp 5' },
    ];

    if (isLoading) {
        return (
            <div className="leaderboard-page">
                <div className="leaderboard-loading">
                    <img
                        src={`${FLUENT_CDN}/Trophy/3D/trophy_3d.png`}
                        alt="Loading"
                        className="leaderboard-loading__icon"
                    />
                    <p>Đang tải bảng xếp hạng...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="leaderboard-page">
            {/* Header */}
            <div className="leaderboard-header">
                <button className="leaderboard-header__back" onClick={onBack}>
                    <ArrowLeft className="w-5 h-5" />
                    Trang chủ
                </button>
                <div className="leaderboard-header__title">
                    <img
                        src={`${FLUENT_CDN}/Trophy/3D/trophy_3d.png`}
                        alt="Trophy"
                        className="leaderboard-header__icon"
                    />
                    <div>
                        <h1>Bảng Xếp Hạng Ong Vàng</h1>
                        <p>Ai là ong chăm chỉ nhất? 🐝</p>
                    </div>
                </div>
            </div>

            {/* Podium - Top 3 */}
            {top3.length > 0 && (
                <div className="leaderboard-podium">
                    <div className="leaderboard-podium__confetti" />
                    <div className="leaderboard-podium__stage">
                        {/* 2nd place */}
                        {top3.length >= 2 && (
                            <div className="podium-card podium-card--silver">
                                <img
                                    src={`${FLUENT_CDN}/2nd%20place%20medal/3D/2nd_place_medal_3d.png`}
                                    alt="2nd"
                                    className="podium-card__medal"
                                />
                                <div
                                    className="podium-card__avatar"
                                    style={{ background: isCurrentStudent(top3[1].studentName) ? 'linear-gradient(135deg, #FFE0B2, #FFCC80)' : getAvatarColor(top3[1].studentName) }}
                                >
                                    {renderAvatarContent(top3[1].studentName)}
                                </div>
                                <span className="podium-card__name">{top3[1].studentName}</span>
                                <span className="podium-card__class">{top3[1].studentClass}</span>
                                <div className="podium-card__score">
                                    <img
                                        src={`${FLUENT_CDN}/Star/3D/star_3d.png`}
                                        alt="star"
                                        className="podium-card__star"
                                    />
                                    {top3[1].totalScore}
                                </div>
                                <div className="podium-card__pedestal podium-card__pedestal--silver">
                                    #2
                                </div>
                            </div>
                        )}

                        {/* 1st place */}
                        {top3.length >= 1 && (
                            <div className="podium-card podium-card--gold">
                                <img
                                    src={`${FLUENT_CDN}/Crown/3D/crown_3d.png`}
                                    alt="Crown"
                                    className="podium-card__crown"
                                />
                                <div
                                    className="podium-card__avatar podium-card__avatar--lg"
                                    style={{ background: isCurrentStudent(top3[0].studentName) ? 'linear-gradient(135deg, #FFE0B2, #FFCC80)' : getAvatarColor(top3[0].studentName) }}
                                >
                                    {renderAvatarContent(top3[0].studentName, true)}
                                </div>
                                <span className="podium-card__name">{top3[0].studentName}</span>
                                <span className="podium-card__class">{top3[0].studentClass}</span>
                                <div className="podium-card__score">
                                    <img
                                        src={`${FLUENT_CDN}/Star/3D/star_3d.png`}
                                        alt="star"
                                        className="podium-card__star"
                                    />
                                    {top3[0].totalScore}
                                </div>
                                <div className="podium-card__pedestal podium-card__pedestal--gold">
                                    #1
                                </div>
                            </div>
                        )}

                        {/* 3rd place */}
                        {top3.length >= 3 && (
                            <div className="podium-card podium-card--bronze">
                                <img
                                    src={`${FLUENT_CDN}/3rd%20place%20medal/3D/3rd_place_medal_3d.png`}
                                    alt="3rd"
                                    className="podium-card__medal"
                                />
                                <div
                                    className="podium-card__avatar"
                                    style={{ background: isCurrentStudent(top3[2].studentName) ? 'linear-gradient(135deg, #FFE0B2, #FFCC80)' : getAvatarColor(top3[2].studentName) }}
                                >
                                    {renderAvatarContent(top3[2].studentName)}
                                </div>
                                <span className="podium-card__name">{top3[2].studentName}</span>
                                <span className="podium-card__class">{top3[2].studentClass}</span>
                                <div className="podium-card__score">
                                    <img
                                        src={`${FLUENT_CDN}/Star/3D/star_3d.png`}
                                        alt="star"
                                        className="podium-card__star"
                                    />
                                    {top3[2].totalScore}
                                </div>
                                <div className="podium-card__pedestal podium-card__pedestal--bronze">
                                    #3
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Filters */}
            <div className="leaderboard-filters">
                <div className="leaderboard-filters__grades">
                    {gradeTabs.map(tab => (
                        <button
                            key={tab.id}
                            onClick={() => setSelectedGrade(tab.id)}
                            className={`leaderboard-filter-pill ${selectedGrade === tab.id ? 'leaderboard-filter-pill--active' : ''}`}
                        >
                            {tab.label}
                        </button>
                    ))}
                </div>
                <div className="leaderboard-filters__time">
                    <Filter className="w-4 h-4" />
                    <select
                        value={timePeriod}
                        onChange={(e) => setTimePeriod(e.target.value)}
                        className="leaderboard-time-select"
                    >
                        <option value="all">Toàn bộ</option>
                        <option value="month">Tháng này</option>
                        <option value="week">Tuần này</option>
                    </select>
                </div>
            </div>

            {/* Leaderboard List */}
            <div className="leaderboard-list">
                {rest.length > 0 ? (
                    rest.map((entry) => (
                        <div key={`${entry.studentName}__${entry.studentClass}`} className="leaderboard-row">
                            <span className="leaderboard-row__rank">
                                {entry.rank}
                            </span>
                            <div
                                className="leaderboard-row__avatar"
                                style={{ background: isCurrentStudent(entry.studentName) ? 'linear-gradient(135deg, #FFE0B2, #FFCC80)' : getAvatarColor(entry.studentName) }}
                            >
                                {renderAvatarContent(entry.studentName)}
                            </div>
                            <div className="leaderboard-row__info">
                                <span className="leaderboard-row__name">{entry.studentName}</span>
                                <span className="leaderboard-row__class">{entry.studentClass}</span>
                            </div>
                            <div className="leaderboard-row__stats">
                                <span className="leaderboard-row__quizcount">{entry.quizCount} bài</span>
                                <div className="leaderboard-row__correct-wrong" style={{ display: 'flex', gap: '8px', fontSize: '11px', marginTop: '2px' }}>
                                    <span style={{ color: '#16a34a' }}>✅ {entry.totalCorrect}</span>
                                    <span style={{ color: '#dc2626' }}>❌ {entry.totalWrong}</span>
                                </div>
                            </div>
                            <div className="leaderboard-row__score">
                                <img
                                    src={`${FLUENT_CDN}/Star/3D/star_3d.png`}
                                    alt="star"
                                    className="leaderboard-row__star"
                                />
                                {entry.totalScore}
                            </div>
                        </div>
                    ))
                ) : leaderboard.length <= 3 && leaderboard.length > 0 ? (
                    // Only top 3, no more entries
                    null
                ) : (
                    <div className="leaderboard-empty">
                        <img
                            src={`${FLUENT_CDN}/Honeybee/3D/honeybee_3d.png`}
                            alt="No data"
                            className="leaderboard-empty__icon"
                        />
                        <p>Chưa có dữ liệu xếp hạng</p>
                        <span>Hãy làm bài quiz để lên bảng vàng! 🌟</span>
                    </div>
                )}
            </div>

            {/* Footer stats */}
            {leaderboard.length > 0 && (
                <div className="leaderboard-footer">
                    <Users className="w-4 h-4" />
                    <span>Tổng: <strong>{leaderboard.length}</strong> học sinh đã tham gia</span>
                </div>
            )}
        </div>
    );
};

export default LeaderboardPage;
