/**
 * LeaderboardPage Component
 *
 * Displays a leaderboard of students ranked by cumulative quiz scores.
 * Features: Top 3 podium, grade filters, time period filters, scrollable list.
 */

import React, { useState, useMemo, useEffect } from 'react';
import { Trophy, ArrowLeft, TrendingUp, TrendingDown, Minus, Star, Users, Filter } from 'lucide-react';
import { StudentResult } from '../../types';
import { callApi } from '../../services/apiAdapter';
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
    avgTimePerQuiz?: number; // Average time per quiz in seconds
    accuracyRate?: number; // Accuracy percentage (0-100)
    streakDays?: number; // Number of unique days with activity
}

interface LeaderboardPageProps {
    onBack: () => void;
}

const normalizeResultsPayload = (data: any): StudentResult[] => {
    let rawRows: any[] = [];

    if (Array.isArray(data)) {
        rawRows = data;
    } else if (data?.data && Array.isArray(data.data)) {
        rawRows = data.data;
    } else if (data?.results && Array.isArray(data.results)) {
        rawRows = data.results;
    }

    return rawRows.map((row: any) => ({
        id: String(row.id ?? ''),
        studentName: row.studentName ?? row['Student Name'] ?? '',
        studentClass: row.studentClass ?? row['Class'] ?? '',
        quizId: row.quizId ?? row['Quiz ID'] ?? '',
        quizTitle: row.quizTitle ?? row['Quiz Title'] ?? '',
        score: Number(row.score ?? row['Score'] ?? 0),
        correctCount: Number(row.correctCount ?? row['correctCount'] ?? 0),
        totalQuestions: Number(row.totalQuestions ?? row['Total Questions'] ?? 0),
        timeTaken: Number(row.timeTaken ?? row['Time Taken'] ?? 0),
        submittedAt: row.submittedAt ?? row['Submitted At'] ?? '',
        answers: row.answers ?? {},
    })) as StudentResult[];
};

const LeaderboardPage: React.FC<LeaderboardPageProps> = ({ onBack }) => {
    const [results, setResults] = useState<StudentResult[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [selectedGrade, setSelectedGrade] = useState<string>('all');
    const [timePeriod, setTimePeriod] = useState<string>('all');
    const [category, setCategory] = useState<'overall' | 'weekly' | 'speed' | 'accuracy' | 'streak'>('overall');
    const studentSession = useClassroomStore(s => s.studentSession);
    const isAuthenticated = !!studentSession;

    // Fetch results only for authenticated student session; backend scopes data by JWT.
    useEffect(() => {
        if (!isAuthenticated) {
            setResults([]);
            setIsLoading(false);
            return;
        }

        const loadResults = async () => {
            setIsLoading(true);
            try {
                const data = await callApi<any>('get_results');
                console.log('📊 Leaderboard raw data:', data);
                console.log('📊 Data type:', typeof data);
                console.log('📊 Is array?', Array.isArray(data));
                
                const resultsArray = normalizeResultsPayload(data);
                
                console.log('📊 Final normalized results array length:', resultsArray.length);
                
                if (resultsArray.length === 0) {
                    console.warn('⚠️ No leaderboard data available. Make sure students have completed quizzes.');
                }
                
                setResults(resultsArray);
            } catch (err) {
                console.error('❌ Failed to fetch results for leaderboard:', err);
            } finally {
                setIsLoading(false);
            }
        };
        loadResults();
    }, [isAuthenticated]);

    // Process and rank students
    const leaderboard = useMemo<LeaderboardEntry[]>(() => {
        // Ensure results is an array
        if (!Array.isArray(results)) {
            return [];
        }
        
        // Filter by time period (or force weekly for 'weekly' category)
        let filtered = results;
        const now = new Date();
        
        if (category === 'weekly' || timePeriod === 'week') {
            const cutoff = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
            filtered = results.filter(r => {
                try {
                    return new Date(r.submittedAt) >= cutoff;
                } catch {
                    return false;
                }
            });
        } else if (timePeriod === 'month') {
            const cutoff = new Date(now.getFullYear(), now.getMonth(), 1);
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
                const cls = (r.studentClass || '').toLowerCase();
                return cls.startsWith(selectedGrade);
            });
        }

        // Aggregate by student name + class (filter empty names to prevent crash)
        const studentMap = new Map<string, { 
            name: string; 
            cls: string; 
            totalScore: number; 
            count: number; 
            totalCorrect: number; 
            totalQuestions: number;
            totalTime: number;
            dates: Set<string>;
        }>();
        
        filtered.filter(r => r.studentName && r.studentName.trim()).forEach(r => {
            const key = `${r.studentName}__${r.studentClass}`;
            const existing = studentMap.get(key);
            const dateStr = new Date(r.submittedAt).toDateString();
            
            if (existing) {
                existing.totalScore += Math.round(r.score * 100);
                existing.count += 1;
                existing.totalCorrect += r.correctCount || 0;
                existing.totalQuestions += r.totalQuestions || 0;
                existing.totalTime += (r.timeTaken || 0) * 60; // Convert minutes to seconds
                existing.dates.add(dateStr);
            } else {
                studentMap.set(key, {
                    name: r.studentName,
                    cls: r.studentClass,
                    totalScore: Math.round(r.score * 100),
                    count: 1,
                    totalCorrect: r.correctCount || 0,
                    totalQuestions: r.totalQuestions || 0,
                    totalTime: (r.timeTaken || 0) * 60, // Convert minutes to seconds
                    dates: new Set([dateStr]),
                });
            }
        });

        // Convert to array and calculate metrics
        let entries: LeaderboardEntry[] = Array.from(studentMap.values())
            .map((s, _i) => {
                const avgTimePerQuiz = s.count > 0 ? s.totalTime / s.count : 0;
                const accuracyRate = s.totalQuestions > 0 ? (s.totalCorrect / s.totalQuestions) * 100 : 0;
                const streakDays = s.dates.size;
                
                return {
                    rank: 0,
                    studentName: s.name,
                    studentClass: s.cls,
                    totalScore: s.totalScore,
                    quizCount: s.count,
                    avgScore: s.count > 0 ? Math.round((s.totalScore / s.count / 100) * 10) / 10 : 0,
                    totalCorrect: s.totalCorrect,
                    totalWrong: s.totalQuestions - s.totalCorrect,
                    avgTimePerQuiz,
                    accuracyRate,
                    streakDays,
                };
            });

        // Sort based on category
        switch (category) {
            case 'speed':
                // Sort by fastest average time (lower is better), but only if they have quizzes
                entries = entries
                    .filter(e => e.quizCount > 0 && (e.avgTimePerQuiz ?? 0) > 0)
                    .sort((a, b) => (a.avgTimePerQuiz ?? 0) - (b.avgTimePerQuiz ?? 0));
                break;
            case 'accuracy':
                // Sort by highest accuracy rate
                entries = entries
                    .filter(e => e.quizCount > 0)
                    .sort((a, b) => (b.accuracyRate ?? 0) - (a.accuracyRate ?? 0));
                break;
            case 'streak':
                // Sort by most consecutive days
                entries = entries.sort((a, b) => (b.streakDays ?? 0) - (a.streakDays ?? 0));
                break;
            case 'weekly':
            case 'overall':
            default:
                // Sort by total score
                entries = entries.sort((a, b) => b.totalScore - a.totalScore);
                break;
        }

        // Assign ranks
        entries.forEach((e, i) => { e.rank = i + 1; });

        return entries;
    }, [results, selectedGrade, timePeriod, category]);

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
        if (!name) return avatarColors[0];
        const idx = name.charCodeAt(0) % avatarColors.length;
        return avatarColors[idx];
    };

    const getInitial = (name: string) => {
        if (!name) return '?';
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

            {/* Category Tabs */}
            <div className="leaderboard-categories">
                <button
                    onClick={() => setCategory('overall')}
                    className={`leaderboard-category-tab ${category === 'overall' ? 'leaderboard-category-tab--active' : ''}`}
                >
                    <Trophy className="w-4 h-4" />
                    <span>Tổng điểm</span>
                </button>
                <button
                    onClick={() => setCategory('weekly')}
                    className={`leaderboard-category-tab ${category === 'weekly' ? 'leaderboard-category-tab--active' : ''}`}
                >
                    <img
                        src={`${FLUENT_CDN}/Fire/3D/fire_3d.png`}
                        alt="Weekly"
                        className="w-4 h-4"
                    />
                    <span>Tuần này</span>
                </button>
                <button
                    onClick={() => setCategory('speed')}
                    className={`leaderboard-category-tab ${category === 'speed' ? 'leaderboard-category-tab--active' : ''}`}
                >
                    <img
                        src={`${FLUENT_CDN}/High%20voltage/3D/high_voltage_3d.png`}
                        alt="Speed"
                        className="w-4 h-4"
                    />
                    <span>Tốc độ</span>
                </button>
                <button
                    onClick={() => setCategory('accuracy')}
                    className={`leaderboard-category-tab ${category === 'accuracy' ? 'leaderboard-category-tab--active' : ''}`}
                >
                    <img
                        src={`${FLUENT_CDN}/Dart/3D/dart_3d.png`}
                        alt="Accuracy"
                        className="w-4 h-4"
                    />
                    <span>Chính xác</span>
                </button>
                <button
                    onClick={() => setCategory('streak')}
                    className={`leaderboard-category-tab ${category === 'streak' ? 'leaderboard-category-tab--active' : ''}`}
                >
                    <img
                        src={`${FLUENT_CDN}/Sparkles/3D/sparkles_3d.png`}
                        alt="Streak"
                        className="w-4 h-4"
                    />
                    <span>Chuỗi ngày</span>
                </button>
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
