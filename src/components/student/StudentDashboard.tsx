import React, { useState, useEffect } from 'react';
import { useClassroomStore } from '../../stores/useClassroomStore';
import { useGamificationStore } from '../../stores/useGamificationStore';
import { useQuizStore } from '../../../stores/quizStore';
import { getAvatarUrl } from '../../config/avatars';
import ShopModal from '../gamification/ShopModal';
import { callApi } from '../../services/apiAdapter';
import { StudentResult } from '../../types';

interface StudentDashboardProps {
    onStartStudy: () => void;
    onViewLeaderboard: () => void;
}

// Quest targets
const QUEST_1_TARGET = 3; // Complete 3 quizzes today
const QUEST_1_REWARD = 50; // Gold reward
const QUEST_3_TARGET = 3; // 3-day streak target

// --- Helper: Calculate streak from results ---
const calculateStreak = (results: StudentResult[]): number => {
    if (results.length === 0) return 0;

    // Get unique dates (YYYY-MM-DD) sorted descending
    const uniqueDates = [...new Set(
        results
            .map(r => {
                try {
                    const d = new Date(r.submittedAt);
                    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
                } catch {
                    return null;
                }
            })
            .filter(Boolean) as string[]
    )].sort().reverse();

    if (uniqueDates.length === 0) return 0;

    // Check if today or yesterday is the most recent activity
    const today = new Date();
    const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = `${yesterday.getFullYear()}-${String(yesterday.getMonth() + 1).padStart(2, '0')}-${String(yesterday.getDate()).padStart(2, '0')}`;

    // If most recent activity is not today or yesterday, streak is broken
    if (uniqueDates[0] !== todayStr && uniqueDates[0] !== yesterdayStr) return 0;

    // Count consecutive days
    let streak = 1;
    for (let i = 1; i < uniqueDates.length; i++) {
        const prev = new Date(uniqueDates[i - 1]);
        const curr = new Date(uniqueDates[i]);
        const diffMs = prev.getTime() - curr.getTime();
        const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));
        if (diffDays === 1) {
            streak++;
        } else {
            break;
        }
    }
    return streak;
};

// --- Helper: Get rank info from pet level ---
const getRankInfo = (level: number): { name: string; icon: string; color: string } => {
    if (level >= 15) return { name: 'Kim Cương', icon: 'diamond', color: 'text-cyan-400' };
    if (level >= 10) return { name: 'Vàng', icon: 'workspace_premium', color: 'text-yellow-500' };
    if (level >= 5) return { name: 'Bạc', icon: 'workspace_premium', color: 'text-slate-400' };
    return { name: 'Đồng', icon: 'workspace_premium', color: 'text-amber-600' };
};

// --- Helper: Calculate pet HP based on last active ---
const calculateHP = (lastActive: string | undefined): number => {
    if (!lastActive) return 100;
    try {
        const lastDate = new Date(lastActive);
        const now = new Date();
        const diffMs = now.getTime() - lastDate.getTime();
        const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
        if (diffDays <= 0) return 100;
        if (diffDays === 1) return 80;
        if (diffDays === 2) return 60;
        return 40;
    } catch {
        return 100;
    }
};

const StudentDashboard: React.FC<StudentDashboardProps> = ({
    onStartStudy,
    onViewLeaderboard,
}) => {
    const { studentSession, logoutStudent } = useClassroomStore();
    const { pet, coins, lastReward, clearReward, leaderboard, fetchLeaderboard } = useGamificationStore();
    const setView = useQuizStore(s => s.setView);
    const [showShop, setShowShop] = useState(false);
    const [todayResults, setTodayResults] = useState<StudentResult[]>([]);
    const [allStudentResults, setAllStudentResults] = useState<StudentResult[]>([]);

    if (!studentSession) return null;

    // Fetch pet data
    useEffect(() => {
        if (studentSession?.username && !pet) {
            useGamificationStore.getState().fetchPetData(studentSession.username);
        }
    }, [studentSession?.username, pet]);

    // Fetch leaderboard
    useEffect(() => {
        fetchLeaderboard();
    }, []);

    // Fetch quiz results for current student (last 30 days for streak)
    useEffect(() => {
        const loadResults = async () => {
            try {
                const allResults = await callApi<StudentResult[]>('get_results') || [];
                const now = new Date();
                const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
                const thirtyDaysAgo = new Date(now);
                thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

                const studentName = studentSession?.fullName || '';

                // Filter for this student, last 30 days
                const studentResults = allResults.filter((r: StudentResult) => {
                    if (r.studentName !== studentName) return false;
                    try {
                        return new Date(r.submittedAt) >= thirtyDaysAgo;
                    } catch {
                        return false;
                    }
                });
                setAllStudentResults(studentResults);

                // Filter for today only
                const todayFiltered = studentResults.filter((r: StudentResult) => {
                    try {
                        return new Date(r.submittedAt) >= todayStart;
                    } catch {
                        return false;
                    }
                });
                setTodayResults(todayFiltered);
            } catch (err) {
                console.error('[DailyQuests] Failed to fetch results:', err);
            }
        };
        if (studentSession?.fullName) {
            loadResults();
        }
    }, [studentSession?.fullName]);

    // --- Computed values ---

    // Quest 1: Number of quizzes completed today
    const quizzesToday = todayResults.length;
    const quest1Progress = Math.min(quizzesToday, QUEST_1_TARGET);
    const quest1Pct = Math.round((quest1Progress / QUEST_1_TARGET) * 100);

    // Quest 2: Did student get a perfect score today?
    const hasPerfectScore = todayResults.some(r => r.score >= 10 || (r.correctCount > 0 && r.correctCount === r.totalQuestions));
    const quest2Progress = hasPerfectScore ? 1 : 0;
    const quest2Pct = hasPerfectScore ? 100 : 0;

    // Streak (real - calculated from all results)
    const streak = calculateStreak(allStudentResults);

    // Quest 3: Chăm chỉ - maintain a 3-day streak
    const quest3Progress = Math.min(streak, QUEST_3_TARGET);
    const quest3Pct = Math.round((quest3Progress / QUEST_3_TARGET) * 100);

    // Rank (real - based on pet level)
    const petLevel = pet?.level || 1;
    const rankInfo = getRankInfo(petLevel);

    // HP (real - based on last active)
    const petHP = calculateHP(pet?.lastActive);

    const handleLogout = () => {
        if (window.confirm('Bạn muốn đăng xuất?')) {
            logoutStudent();
            setView('home');
        }
    };

    // Find current user position in leaderboard
    const userLeaderboardPos = leaderboard.findIndex(e => e.username === studentSession.username) + 1;

    const CSS_STYLES = `
        @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap');
        @import url('https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap');
        .font-display { font-family: 'Plus Jakarta Sans', sans-serif; }
        .chunky-shadow { box-shadow: 0 8px 0 0 rgba(0,0,0,0.05); }
        .text-primary { color: #ee9d2b; }
        .bg-primary { background-color: #ee9d2b; }
        .border-primary { border-color: #ee9d2b; }
        .fill-1 { font-variation-settings: 'FILL' 1; }
    `;

    return (
        <div className="bg-[#f8f7f6] dark:bg-[#221a10] text-slate-900 dark:text-slate-100 min-h-screen font-display pb-4 md:pb-0">
            <style dangerouslySetInnerHTML={{ __html: CSS_STYLES }} />

            <div className="flex max-w-[1440px] mx-auto min-h-screen">
                {/* Left Sidebar */}
                <aside className="w-64 border-r border-[#ee9d2b]/10 flex flex-col p-6 sticky top-0 h-screen hidden md:flex">
                    <div className="flex items-center gap-3 mb-10">
                        <div className="bg-primary rounded-xl p-2 flex items-center justify-center shadow-lg shadow-[#ee9d2b]/20">
                            <span className="material-symbols-outlined text-white text-3xl">quiz</span>
                        </div>
                        <div className="flex flex-col">
                            <h1 className="text-xl font-extrabold tracking-tight text-slate-900 dark:text-white leading-none">iTongQuiz</h1>
                            <p className="text-xs font-bold text-primary uppercase tracking-widest">Level {petLevel} Học sinh</p>
                        </div>
                    </div>

                    <nav className="flex flex-col gap-2 flex-grow">
                        <button className="flex items-center gap-4 px-4 py-3 rounded-xl bg-[#ee9d2b]/10 text-primary font-bold text-left">
                            <span className="material-symbols-outlined fill-1">home</span>
                            Trang chủ
                        </button>
                        <button onClick={onStartStudy} className="flex items-center gap-4 px-4 py-3 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 font-medium text-left transition-colors">
                            <span className="material-symbols-outlined">school</span>
                            Bài tập
                        </button>
                        <button onClick={onViewLeaderboard} className="flex items-center gap-4 px-4 py-3 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 font-medium text-left transition-colors">
                            <span className="material-symbols-outlined">leaderboard</span>
                            Xếp hạng
                        </button>
                        <button onClick={() => setShowShop(true)} className="flex items-center gap-4 px-4 py-3 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 font-medium text-left transition-colors">
                            <span className="material-symbols-outlined">storefront</span>
                            Cửa hàng
                        </button>
                        <div className="flex-grow"></div>
                        <button onClick={handleLogout} className="flex items-center gap-4 px-4 py-3 rounded-xl hover:bg-red-50 dark:hover:bg-red-900/20 text-red-500 font-medium text-left transition-colors">
                            <span className="material-symbols-outlined">logout</span>
                            Đăng xuất
                        </button>
                    </nav>

                    <div className="mt-auto pt-6 border-t border-slate-200 dark:border-slate-700">
                        <div className="flex items-center gap-3">
                            <div className="relative w-10 h-10 rounded-full bg-slate-200 overflow-hidden border-2 border-primary">
                                {studentSession.avatarId ? (
                                    <img src={getAvatarUrl(studentSession.avatarId)} alt="Avatar" className="w-full h-full object-cover" />
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center text-lg font-bold text-primary">
                                        {studentSession.fullName?.charAt(0) || '?'}
                                    </div>
                                )}
                            </div>
                            <div className="overflow-hidden">
                                <p className="text-sm font-bold truncate">{studentSession.fullName}</p>
                                <p className="text-xs text-slate-500 truncate">{studentSession.className || 'Học sinh'}</p>
                            </div>
                        </div>
                    </div>
                </aside>

                {/* Main Content */}
                <main className="flex-1 p-4 md:p-8 overflow-y-auto w-full">
                    {/* Top Header Stats */}
                    <div className="flex items-center justify-between mb-8 overflow-x-auto pb-2">
                        <div className="flex items-center gap-4 md:gap-6 min-w-max">
                            {/* Streak - REAL */}
                            <div className="flex items-center gap-2 bg-white dark:bg-slate-800 px-4 py-2 rounded-full chunky-shadow border border-slate-100">
                                <span className="material-symbols-outlined text-primary fill-1">local_fire_department</span>
                                <span className="font-black text-slate-700 dark:text-slate-200">{streak} NGÀY</span>
                            </div>
                            {/* Coins - already real */}
                            <div className="flex items-center gap-2 bg-white dark:bg-slate-800 px-4 py-2 rounded-full chunky-shadow border border-slate-100">
                                <span className="material-symbols-outlined text-amber-500 fill-1">database</span>
                                <span className="font-black text-slate-700 dark:text-slate-200">{coins}</span>
                            </div>
                            {/* Rank - REAL */}
                            <div className="flex items-center gap-2 bg-white dark:bg-slate-800 px-4 py-2 rounded-full chunky-shadow border border-slate-100">
                                <span className={`material-symbols-outlined ${rankInfo.color} fill-1`}>{rankInfo.icon}</span>
                                <span className="font-black text-slate-700 dark:text-slate-200">Hạng {rankInfo.name}</span>
                            </div>
                        </div>
                        <div className="flex gap-2 shrink-0 md:hidden ml-4">
                            <button onClick={handleLogout} className="w-10 h-10 rounded-full bg-white dark:bg-slate-800 flex items-center justify-center chunky-shadow border border-slate-100 text-red-500">
                                <span className="material-symbols-outlined">logout</span>
                            </button>
                        </div>
                    </div>

                    {/* Reward Toast */}
                    {lastReward && (
                        <div className="mb-6 bg-emerald-500 text-white p-4 rounded-xl shadow-lg flex items-center gap-3 animate-bounce">
                            <span className="material-symbols-outlined">stars</span>
                            <div>
                                <p className="font-bold">{lastReward.leveledUp ? `🎉 Chúc mừng lên Cấp ${lastReward.newLevel}!` : '🌟 Nhận thưởng!'}</p>
                                <p className="text-sm opacity-90">+{lastReward.exp} EXP · +{lastReward.coins} Vàng</p>
                            </div>
                            <button onClick={clearReward} className="ml-auto font-bold opacity-70 hover:opacity-100">×</button>
                        </div>
                    )}

                    {/* Hero Banner */}
                    <div className="relative rounded-[24px] overflow-hidden mb-12 chunky-shadow group">
                        <div className="absolute inset-0 bg-gradient-to-r from-orange-400 to-orange-500 opacity-100"></div>
                        <div className="absolute inset-0 opacity-20 pointer-events-none" style={{ backgroundImage: 'radial-gradient(circle at 2px 2px, white 1px, transparent 0)', backgroundSize: '24px 24px' }}></div>
                        <div className="relative p-8 md:p-12 flex flex-col items-start gap-6">
                            <div className="flex flex-col">
                                <span className="text-white/90 font-bold uppercase tracking-widest text-sm mb-2">Bài tập tiếp theo</span>
                                <h2 className="text-3xl md:text-4xl font-black text-white leading-tight">Sẵn sàng chinh phục<br />thử thách mới?</h2>
                            </div>
                            <button onClick={onStartStudy} className="flex items-center gap-3 px-6 py-3 md:px-8 md:py-4 bg-white text-orange-500 rounded-[24px] font-black text-base md:text-lg hover:scale-105 transition-transform shadow-xl shadow-black/10">
                                <span>✨ HỌC TIẾP NGAY</span>
                                <span className="material-symbols-outlined">arrow_forward</span>
                            </button>
                        </div>
                        <div className="absolute right-12 bottom-0 w-64 h-64 translate-y-4 hidden lg:block">
                            <img className="w-full h-full object-contain drop-shadow-2xl" alt="Abstract 3D educational icon floating" src="https://lh3.googleusercontent.com/aida-public/AB6AXuCO1XfqZguLtYAPG_EqKKJCTmKQuTD13sYxVfiJN92HeBdK1jIMtEwTSXyjbYCW6mn2eKET43-ZK6PQa4XmI6G-N7e3640V_C3V-h3js7cx52gMCSj21K6GzRm9PPs5qmg-nwOl8KHdvs95uK3RMpteBd_fpZzZf5X-MEO8CAAlr5f8WqLyASmfKuSJnB8I-dHvVVOnSCENH-cIAV3MWjQyKSOGrYURlwj5_E9ropT6igXbKS7lH8O-jzkrzDzLeoxRfz5vLm72r8w" />
                        </div>
                    </div>

                    {/* Daily Quests */}
                    <div className="mb-12">
                        <div className="flex items-center justify-between mb-6">
                            <h3 className="text-2xl font-black text-slate-800 dark:text-slate-100 tracking-tight">Nhiệm vụ hằng ngày</h3>
                            <button onClick={onStartStudy} className="text-primary font-bold hover:underline">Xem tất cả</button>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {/* Quest Card 1: Học nhanh */}
                            <div className="bg-white dark:bg-slate-800 p-6 rounded-[24px] border-2 border-slate-100 dark:border-slate-700 chunky-shadow flex flex-col gap-4">
                                <div className="w-12 h-12 bg-emerald-100 rounded-xl flex items-center justify-center text-emerald-600">
                                    <span className="material-symbols-outlined text-3xl">bolt</span>
                                </div>
                                <div>
                                    <h4 className="font-black text-lg leading-tight">Học nhanh</h4>
                                    <p className="text-sm text-slate-500 mt-1">Hoàn thành {QUEST_1_TARGET} bài hôm nay</p>
                                </div>
                                <div className="mt-2">
                                    <div className="flex justify-between text-xs font-bold mb-1">
                                        <span>{quest1Progress}/{QUEST_1_TARGET} Bài</span>
                                        <span className={quest1Pct >= 100 ? 'text-emerald-500' : 'text-slate-400'}>{quest1Pct}%</span>
                                    </div>
                                    <div className="w-full h-3 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
                                        <div className="h-full bg-emerald-500 rounded-full transition-all duration-500" style={{ width: `${quest1Pct}%` }}></div>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2 mt-2">
                                    {quest1Pct >= 100 ? (
                                        <span className="text-xs font-black text-emerald-500">✅ Đã hoàn thành!</span>
                                    ) : (
                                        <>
                                            <span className="material-symbols-outlined text-amber-500 text-sm">monetization_on</span>
                                            <span className="text-xs font-black text-slate-600 dark:text-slate-400">+{QUEST_1_REWARD} Vàng</span>
                                        </>
                                    )}
                                </div>
                            </div>

                            {/* Quest Card 2: Điểm tuyệt đối */}
                            <div className="bg-white dark:bg-slate-800 p-6 rounded-[24px] border-2 border-slate-100 dark:border-slate-700 chunky-shadow flex flex-col gap-4">
                                <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center text-blue-600">
                                    <span className="material-symbols-outlined text-3xl">target</span>
                                </div>
                                <div>
                                    <h4 className="font-black text-lg leading-tight">Điểm tuyệt đối</h4>
                                    <p className="text-sm text-slate-500 mt-1">Đạt 100% trong bài thi</p>
                                </div>
                                <div className="mt-2">
                                    <div className="flex justify-between text-xs font-bold mb-1">
                                        <span>{quest2Progress}/1 Lần</span>
                                        <span className={quest2Pct >= 100 ? 'text-blue-500' : 'text-slate-400'}>{quest2Pct}%</span>
                                    </div>
                                    <div className="w-full h-3 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
                                        <div className="h-full bg-blue-500 rounded-full transition-all duration-500" style={{ width: `${quest2Pct}%` }}></div>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2 mt-2">
                                    {quest2Pct >= 100 ? (
                                        <span className="text-xs font-black text-blue-500">✅ Đã hoàn thành!</span>
                                    ) : (
                                        <>
                                            <span className="material-symbols-outlined text-primary text-sm">redeem</span>
                                            <span className="text-xs font-black text-slate-600 dark:text-slate-400">Rương kho báu</span>
                                        </>
                                    )}
                                </div>
                            </div>

                            {/* Quest Card 3: Chăm chỉ (REAL - streak based) */}
                            <div className="bg-white dark:bg-slate-800 p-6 rounded-[24px] border-2 border-slate-100 dark:border-slate-700 chunky-shadow flex flex-col gap-4">
                                <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center text-purple-600">
                                    <span className="material-symbols-outlined text-3xl">local_fire_department</span>
                                </div>
                                <div>
                                    <h4 className="font-black text-lg leading-tight">Chăm chỉ</h4>
                                    <p className="text-sm text-slate-500 mt-1">Duy trì chuỗi {QUEST_3_TARGET} ngày học liên tiếp</p>
                                </div>
                                <div className="mt-2">
                                    <div className="flex justify-between text-xs font-bold mb-1">
                                        <span>{quest3Progress}/{QUEST_3_TARGET} Ngày</span>
                                        <span className={quest3Pct >= 100 ? 'text-purple-500' : 'text-slate-400'}>{quest3Pct}%</span>
                                    </div>
                                    <div className="w-full h-3 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
                                        <div className="h-full bg-purple-500 rounded-full transition-all duration-500" style={{ width: `${quest3Pct}%` }}></div>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2 mt-2">
                                    {quest3Pct >= 100 ? (
                                        <span className="text-xs font-black text-purple-500">✅ Đã hoàn thành!</span>
                                    ) : (
                                        <>
                                            <span className="material-symbols-outlined text-amber-500 text-sm">monetization_on</span>
                                            <span className="text-xs font-black text-slate-600 dark:text-slate-400">+30 Vàng</span>
                                        </>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                </main>

                {/* Right Sidebar */}
                <aside className="w-80 p-6 border-l border-[#ee9d2b]/10 flex flex-col gap-8 bg-white dark:bg-[#1a140d]/50 hidden lg:flex">
                    {/* Pet Card */}
                    <div className="bg-slate-50 dark:bg-slate-800 p-6 rounded-[24px] border-2 border-slate-100 dark:border-slate-700 chunky-shadow relative overflow-hidden">
                        <div className="absolute top-0 right-0 p-2">
                            <button className="material-symbols-outlined text-slate-400">info</button>
                        </div>
                        <div className="flex flex-col items-center text-center gap-4">
                            <div className="relative w-40 h-40">
                                {pet?.petId?.startsWith('dog') && <img className="w-full h-full object-contain" alt="Pet" src="https://cdn.jsdelivr.net/gh/microsoft/fluentui-emoji@main/assets/Dog%20face/3D/dog_face_3d.png" />}
                                {pet?.petId?.startsWith('cat') && <img className="w-full h-full object-contain" alt="Pet" src="https://cdn.jsdelivr.net/gh/microsoft/fluentui-emoji@main/assets/Cat%20face/3D/cat_face_3d.png" />}
                                {pet?.petId?.startsWith('rabbit') && <img className="w-full h-full object-contain" alt="Pet" src="https://cdn.jsdelivr.net/gh/microsoft/fluentui-emoji@main/assets/Rabbit%20face/3D/rabbit_face_3d.png" />}
                                {!pet?.petId && <img className="w-full h-full object-contain" alt="Pet" src="https://cdn.jsdelivr.net/gh/microsoft/fluentui-emoji@main/assets/Cat%20face/3D/cat_face_3d.png" />}
                            </div>
                            <div>
                                <h4 className="text-xl font-black">{pet?.petName || 'Thú cưng'}</h4>
                                <p className="text-xs font-bold text-slate-500 uppercase tracking-tighter">Level {petLevel} Companion</p>
                            </div>
                            <div className="w-full flex flex-col gap-3">
                                {/* HP - REAL */}
                                <div className="flex flex-col gap-1">
                                    <div className="flex justify-between items-end">
                                        <span className="text-[10px] font-black text-[#f43f5e] uppercase">Sức khỏe (HP)</span>
                                        <span className="text-[10px] font-bold">{petHP}/100</span>
                                    </div>
                                    <div className="w-full h-2.5 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                                        <div className={`h-full rounded-full transition-all duration-500 ${petHP > 60 ? 'bg-[#f43f5e]' : petHP > 40 ? 'bg-orange-400' : 'bg-red-700'}`} style={{ width: `${petHP}%` }}></div>
                                    </div>
                                </div>
                                {/* XP - already real */}
                                <div className="flex flex-col gap-1">
                                    <div className="flex justify-between items-end">
                                        <span className="text-[10px] font-black text-emerald-500 uppercase">Kinh nghiệm (XP)</span>
                                        <span className="text-[10px] font-bold">{pet?.exp || 0}/{pet?.expToNext || 500}</span>
                                    </div>
                                    <div className="w-full h-2.5 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                                        <div className="h-full bg-emerald-500 rounded-full transition-all duration-500" style={{ width: `${Math.min(100, ((pet?.exp || 0) / (pet?.expToNext || 500)) * 100)}%` }}></div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Leaderboard - REAL */}
                    <div>
                        <h4 className="font-black text-lg mb-4 flex items-center gap-2">
                            <span className="material-symbols-outlined text-primary">groups</span>
                            BXH Tuần Này
                        </h4>
                        <div className="flex flex-col gap-4">
                            {leaderboard.length > 0 ? (
                                <>
                                    {leaderboard.slice(0, 3).map((entry, index) => (
                                        <div key={entry.username} className="flex items-center gap-3">
                                            <div className="relative">
                                                {entry.avatar ? (
                                                    <img className="w-10 h-10 rounded-full border-2 border-primary" alt="Avatar" src={getAvatarUrl(entry.avatar)} />
                                                ) : (
                                                    <div className="w-10 h-10 rounded-full border-2 border-primary bg-slate-100 flex items-center justify-center font-bold text-primary">
                                                        {entry.fullName?.charAt(0) || '?'}
                                                    </div>
                                                )}
                                                {index === 0 && <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-emerald-500 border-2 border-white rounded-full"></div>}
                                            </div>
                                            <div className="flex-1">
                                                <p className="text-sm font-bold">{entry.fullName}</p>
                                                <p className="text-[10px] text-slate-500 font-bold uppercase">Level {entry.level} · {getRankInfo(entry.level).name}</p>
                                            </div>
                                            <div className="text-right">
                                                <p className="text-xs font-black text-primary">{entry.exp?.toLocaleString()}</p>
                                            </div>
                                        </div>
                                    ))}
                                    {/* Current user position if not in top 3 */}
                                    {userLeaderboardPos > 3 && (
                                        <>
                                            <div className="text-center text-slate-400 text-xs">···</div>
                                            <div className="flex items-center gap-3 bg-orange-50 dark:bg-orange-900/20 rounded-xl p-2 -mx-2">
                                                <div className="relative">
                                                    <div className="w-10 h-10 rounded-full border-2 border-primary bg-slate-100 flex items-center justify-center font-bold text-primary">
                                                        {studentSession.fullName?.charAt(0) || '?'}
                                                    </div>
                                                </div>
                                                <div className="flex-1">
                                                    <p className="text-sm font-bold">{studentSession.fullName} <span className="text-xs text-slate-400">#{userLeaderboardPos}</span></p>
                                                    <p className="text-[10px] text-slate-500 font-bold uppercase">Keep going!</p>
                                                </div>
                                                <div className="text-right">
                                                    <p className="text-xs font-black text-slate-500">{pet?.exp || 0}</p>
                                                </div>
                                            </div>
                                        </>
                                    )}
                                    {userLeaderboardPos === 0 && (
                                        <div className="flex items-center gap-3">
                                            <div className="relative">
                                                <div className="w-10 h-10 rounded-full border-2 border-slate-200 bg-slate-100 flex items-center justify-center font-bold text-slate-600">
                                                    Bạn
                                                </div>
                                            </div>
                                            <div className="flex-1">
                                                <p className="text-sm font-bold">{studentSession.fullName}</p>
                                                <p className="text-[10px] text-slate-500 font-bold uppercase">Keep going!</p>
                                            </div>
                                            <div className="text-right">
                                                <p className="text-xs font-black text-slate-500">{pet?.exp || 0}</p>
                                            </div>
                                        </div>
                                    )}
                                </>
                            ) : (
                                <p className="text-sm text-slate-400 text-center py-4">Đang tải bảng xếp hạng...</p>
                            )}
                        </div>
                        <button onClick={onViewLeaderboard} className="w-full mt-6 py-3 border-2 border-slate-100 dark:border-slate-700 rounded-xl font-bold text-slate-500 hover:bg-slate-50 transition-colors">
                            Xem tất cả Xếp hạng
                        </button>
                    </div>
                </aside>
            </div>

            <ShopModal isOpen={showShop} onClose={() => setShowShop(false)} />
        </div>
    );
};

export default StudentDashboard;
