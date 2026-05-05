import { Env } from '../types';
import { errorResponse, generateId, jsonResponse } from '../utils/response';
import { parseBody } from '../utils/helpers';

type MissionId = 'daily_questions' | 'daily_accuracy' | 'daily_subject';
type RewardType = 'COINS' | 'COLLECTIBLE' | 'HINT_TOKEN' | 'STREAK_SHIELD';

interface DailyProgressRow {
    username: string;
    progress_date: string;
    questions_answered: number;
    correct_answers: number;
    quizzes_completed: number;
    toan_quizzes_completed: number;
    tieng_viet_quizzes_completed: number;
    mission_questions_claimed: number;
    mission_accuracy_claimed: number;
    mission_subject_claimed: number;
    chest_claimed: number;
    created_at: string;
    updated_at: string;
}

interface GameProfileRow {
    username: string;
    daily_streak: number;
    last_mission_completion_date: string;
    hint_tokens: number;
    streak_shields: number;
    collection_json: string;
    created_at: string;
    updated_at: string;
}

interface AchievementRow {
    achievement_code: string;
    unlocked_at: string;
}

interface DashboardMission {
    id: MissionId;
    title: string;
    description: string;
    target: number;
    progress: number;
    completed: boolean;
    claimed: boolean;
    rewardCoins: number;
    unit: string;
}

const DAILY_MISSIONS = [
    {
        id: 'daily_questions' as const,
        title: 'Tia chớp câu hỏi',
        description: 'Hoàn thành 15 câu hỏi trong hôm nay.',
        target: 15,
        rewardCoins: 30,
        unit: 'câu',
    },
    {
        id: 'daily_accuracy' as const,
        title: 'Ngắm chuẩn mục tiêu',
        description: 'Giữ độ chính xác từ 80% với ít nhất 10 câu.',
        target: 80,
        rewardCoins: 40,
        unit: '%',
    },
    {
        id: 'daily_subject' as const,
        title: 'Chinh phục môn chính',
        description: 'Hoàn thành ít nhất 1 bài Toán hoặc Tiếng Việt.',
        target: 1,
        rewardCoins: 35,
        unit: 'bài',
    },
] as const;

const COLLECTIBLE_REWARDS = [
    { id: 'sticker_toan_star', title: 'Sticker Sao Toán', icon: '⭐' },
    { id: 'sticker_tv_book', title: 'Sticker Sách Việt', icon: '📘' },
    { id: 'sticker_bee_crown', title: 'Sticker Ong Vương Miện', icon: '🐝' },
    { id: 'sticker_rainbow_pen', title: 'Sticker Bút Cầu Vồng', icon: '🖍️' },
];

const WEEKLY_QUESTS = [
    {
        id: 'weekly_20_quizzes',
        title: 'Hoàn thành 20 bài quiz',
        description: 'Làm xong 20 bài quiz bất kỳ trong tuần này.',
        target: 20,
        reward: {
            coins: 200,
            items: ['hint_token'],
            itemCount: 1,
        },
        icon: '📚',
    },
    {
        id: 'weekly_top_5',
        title: 'Đạt top 5 lớp',
        description: 'Lọt vào top 5 bảng xếp hạng lớp học.',
        target: 1,
        reward: {
            coins: 300,
            items: ['streak_shield'],
            itemCount: 1,
        },
        icon: '🏆',
    },
    {
        id: 'weekly_100_correct',
        title: 'Trả lời đúng 100 câu',
        description: 'Tích lũy 100 câu trả lời đúng trong tuần.',
        target: 100,
        reward: {
            coins: 150,
            items: [],
            itemCount: 0,
        },
        icon: '✅',
    },
    {
        id: 'weekly_subject_master',
        title: 'Chinh phục 3 môn',
        description: 'Hoàn thành ít nhất 1 bài Toán, Tiếng Việt và Tiếng Anh.',
        target: 3,
        reward: {
            coins: 250,
            items: ['pet_accessory_random'],
            itemCount: 1,
        },
        icon: '🎯',
    },
    {
        id: 'weekly_perfect_streak',
        title: 'Chuỗi hoàn hảo',
        description: 'Đạt 100% điểm trong 3 bài quiz.',
        target: 3,
        reward: {
            coins: 400,
            items: ['hint_token', 'streak_shield'],
            itemCount: 2,
        },
        icon: '💯',
    },
] as const;

const ACHIEVEMENTS = [
    // === STREAK ACHIEVEMENTS ===
    {
        code: 'streak_3',
        title: 'Kiên trì 3 ngày',
        description: 'Học liên tục 3 ngày không nghỉ.',
        icon: '🔥',
        rarity: 'common' as const,
    },
    {
        code: 'streak_7',
        title: 'Kiên trì 7 ngày',
        description: 'Học liên tục 7 ngày không nghỉ.',
        icon: '🔥',
        rarity: 'common' as const,
    },
    {
        code: 'streak_30',
        title: 'Siêu kiên trì',
        description: 'Học liên tục 30 ngày không nghỉ.',
        icon: '🔥🔥',
        rarity: 'rare' as const,
    },
    {
        code: 'streak_100',
        title: 'Huyền thoại',
        description: 'Học liên tục 100 ngày không nghỉ.',
        icon: '👑',
        rarity: 'epic' as const,
    },

    // === SUBJECT MASTERY ===
    {
        code: 'math_expert_50',
        title: 'Cao thủ Toán',
        description: 'Làm đúng 50 câu Toán với điểm >= 80%.',
        icon: '🧮',
        rarity: 'common' as const,
    },
    {
        code: 'math_expert_100',
        title: 'Bậc thầy Toán',
        description: 'Làm đúng 100 câu Toán với điểm >= 80%.',
        icon: '🧮',
        rarity: 'rare' as const,
    },
    {
        code: 'vietnamese_expert_50',
        title: 'Cao thủ Tiếng Việt',
        description: 'Làm đúng 50 câu Tiếng Việt với điểm >= 80%.',
        icon: '📚',
        rarity: 'common' as const,
    },
    {
        code: 'english_expert_50',
        title: 'English Expert',
        description: 'Làm đúng 50 câu Tiếng Anh với điểm >= 80%.',
        icon: '🇬🇧',
        rarity: 'common' as const,
    },

    // === SPEED ACHIEVEMENTS ===
    {
        code: 'speed_demon_10',
        title: 'Tốc độ ánh sáng',
        description: 'Hoàn thành bài trong < 50% thời gian 10 lần.',
        icon: '⚡',
        rarity: 'rare' as const,
    },
    {
        code: 'speed_master_30',
        title: 'Bậc thầy tốc độ',
        description: 'Hoàn thành bài trong < 50% thời gian 30 lần.',
        icon: '⚡⚡',
        rarity: 'epic' as const,
    },

    // === PERFECT SCORE ===
    {
        code: 'perfect_5',
        title: 'Điểm 10 liên tiếp',
        description: 'Đạt 100% điểm 5 lần liên tiếp.',
        icon: '💯',
        rarity: 'rare' as const,
    },
    {
        code: 'perfect_20',
        title: 'Thần đồng',
        description: 'Đạt 100% điểm 20 lần.',
        icon: '🌟',
        rarity: 'epic' as const,
    },

    // === TIME-BASED ===
    {
        code: 'early_bird_10',
        title: 'Chim sớm',
        description: 'Làm bài trước 7h sáng 10 lần.',
        icon: '🌅',
        rarity: 'common' as const,
    },
    {
        code: 'night_owl_10',
        title: 'Cú đêm',
        description: 'Làm bài sau 9h tối 10 lần.',
        icon: '🦉',
        rarity: 'common' as const,
    },

    // === COLLECTION ===
    {
        code: 'collector_5',
        title: 'Nhà sưu tập',
        description: 'Sở hữu 5 vật phẩm sưu tầm.',
        icon: '🎁',
        rarity: 'common' as const,
    },
    {
        code: 'collector_10',
        title: 'Đại gia sưu tầm',
        description: 'Sở hữu 10 vật phẩm sưu tầm.',
        icon: '🎁',
        rarity: 'rare' as const,
    },

    // === TOTAL QUESTIONS ===
    {
        code: 'questions_100',
        title: 'Trăm câu',
        description: 'Trả lời đúng 100 câu hỏi.',
        icon: '📝',
        rarity: 'common' as const,
    },
    {
        code: 'questions_500',
        title: 'Năm trăm câu',
        description: 'Trả lời đúng 500 câu hỏi.',
        icon: '📚',
        rarity: 'rare' as const,
    },
    {
        code: 'questions_1000',
        title: 'Nghìn câu',
        description: 'Trả lời đúng 1000 câu hỏi.',
        icon: '🏆',
        rarity: 'epic' as const,
    },

    // === MISSION ACHIEVEMENTS ===
    {
        code: 'first_quiz',
        title: 'Bắt đầu hành trình',
        description: 'Hoàn thành bài quiz đầu tiên.',
        icon: '🚀',
        rarity: 'common' as const,
    },
    {
        code: 'daily_hat_trick',
        title: 'Trọn bộ nhiệm vụ',
        description: 'Hoàn thành đủ 3 nhiệm vụ trong một ngày.',
        icon: '🎯',
        rarity: 'rare' as const,
    },
    {
        code: 'weekly_warrior',
        title: 'Chiến binh tuần lễ',
        description: 'Hoàn thành nhiệm vụ 7 ngày liên tiếp.',
        icon: '⚔️',
        rarity: 'epic' as const,
    },

    // === WEEKLY CHAMPION BADGES ===
    {
        code: 'weekly_champion_1st',
        title: 'Vô địch tuần',
        description: 'Đạt hạng 1 bảng xếp hạng tuần.',
        icon: '👑',
        rarity: 'epic' as const,
    },
    {
        code: 'weekly_champion_2nd',
        title: 'Á quân tuần',
        description: 'Đạt hạng 2 bảng xếp hạng tuần.',
        icon: '🥈',
        rarity: 'rare' as const,
    },
    {
        code: 'weekly_champion_3rd',
        title: 'Hạng 3 tuần',
        description: 'Đạt hạng 3 bảng xếp hạng tuần.',
        icon: '🥉',
        rarity: 'rare' as const,
    },
] as const;

const getBangkokDateKey = (date = new Date()): string => {
    return new Intl.DateTimeFormat('en-CA', {
        timeZone: 'Asia/Bangkok',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
    }).format(date);
};

const parseDateKeyToUtc = (dateKey: string): Date => {
    const [year, month, day] = String(dateKey || '').split('-').map((value) => Number(value || 0));
    return new Date(Date.UTC(year, (month || 1) - 1, day || 1));
};

const formatUtcDateKey = (date: Date): string => {
    const year = date.getUTCFullYear();
    const month = String(date.getUTCMonth() + 1).padStart(2, '0');
    const day = String(date.getUTCDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
};

const getPreviousDateKey = (dateKey: string): string => {
    const date = parseDateKeyToUtc(dateKey);
    date.setUTCDate(date.getUTCDate() - 1);
    return formatUtcDateKey(date);
};

const safeJsonParse = <T>(raw: string | null | undefined, fallback: T): T => {
    if (!raw) return fallback;
    try {
        return JSON.parse(raw) as T;
    } catch {
        return fallback;
    }
};

const normalizeCategory = (value: string): string => {
    const normalized = String(value || '').trim().toLowerCase();
    if (normalized === 'toan' || normalized.includes('toán')) return 'toan';
    if (normalized === 'tieng-viet' || normalized.includes('việt')) return 'tieng-viet';
    return normalized;
};

// Weekly quest helpers
const getCurrentWeekKey = (): string => {
    const now = new Date();
    const year = now.getFullYear();
    const week = getISOWeekNumber(now);
    return `${year}-W${String(week).padStart(2, '0')}`;
};

const getISOWeekNumber = (date: Date): number => {
    const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
    const dayNum = d.getUTCDay() || 7;
    d.setUTCDate(d.getUTCDate() + 4 - dayNum);
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    return Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
};

const getOrCreateWeeklyProgress = async (
    db: D1Database,
    username: string,
    weekKey: string
): Promise<any[]> => {
    const existing = await db.prepare(`
        SELECT * FROM student_weekly_progress
        WHERE username = ? AND week_key = ?
    `).bind(username, weekKey).all();
    
    if (existing.results && existing.results.length > 0) {
        return existing.results;
    }
    
    const now = new Date().toISOString();
    const statements = WEEKLY_QUESTS.map(quest =>
        db.prepare(`
            INSERT INTO student_weekly_progress
            (username, week_key, quest_id, progress, target, claimed, created_at, updated_at)
            VALUES (?, ?, ?, 0, ?, 0, ?, ?)
        `).bind(username, weekKey, quest.id, quest.target, now, now)
    );
    
    await db.batch(statements);
    
    const created = await db.prepare(`
        SELECT * FROM student_weekly_progress
        WHERE username = ? AND week_key = ?
    `).bind(username, weekKey).all();
    
    return created.results || [];
};

const updateWeeklyQuestProgress = async (
    db: D1Database,
    username: string,
    weekKey: string,
    updates: Record<string, number>
): Promise<void> => {
    const now = new Date().toISOString();
    const statements = [];
    
    for (const [questId, increment] of Object.entries(updates)) {
        statements.push(
            db.prepare(`
                UPDATE student_weekly_progress
                SET progress = progress + ?, updated_at = ?
                WHERE username = ? AND week_key = ? AND quest_id = ?
            `).bind(increment, now, username, weekKey, questId)
        );
    }
    
    if (statements.length > 0) {
        await db.batch(statements);
    }
};

const ensureGameLoopTables = async (db: D1Database): Promise<void> => {
    await db.prepare(`
        CREATE TABLE IF NOT EXISTS student_game_profiles (
            username TEXT PRIMARY KEY,
            daily_streak INTEGER NOT NULL DEFAULT 0,
            last_mission_completion_date TEXT DEFAULT '',
            hint_tokens INTEGER NOT NULL DEFAULT 0,
            streak_shields INTEGER NOT NULL DEFAULT 0,
            collection_json TEXT NOT NULL DEFAULT '[]',
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL
        )
    `).run();

    await db.prepare(`
        CREATE TABLE IF NOT EXISTS student_daily_progress (
            username TEXT NOT NULL,
            progress_date TEXT NOT NULL,
            questions_answered INTEGER NOT NULL DEFAULT 0,
            correct_answers INTEGER NOT NULL DEFAULT 0,
            quizzes_completed INTEGER NOT NULL DEFAULT 0,
            toan_quizzes_completed INTEGER NOT NULL DEFAULT 0,
            tieng_viet_quizzes_completed INTEGER NOT NULL DEFAULT 0,
            mission_questions_claimed INTEGER NOT NULL DEFAULT 0,
            mission_accuracy_claimed INTEGER NOT NULL DEFAULT 0,
            mission_subject_claimed INTEGER NOT NULL DEFAULT 0,
            chest_claimed INTEGER NOT NULL DEFAULT 0,
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL,
            PRIMARY KEY (username, progress_date)
        )
    `).run();

    await db.prepare(`
        CREATE TABLE IF NOT EXISTS student_achievement_unlocks (
            id TEXT PRIMARY KEY,
            username TEXT NOT NULL,
            achievement_code TEXT NOT NULL,
            unlocked_at TEXT NOT NULL,
            metadata TEXT NOT NULL DEFAULT '{}'
        )
    `).run();

    await db.prepare(`
        CREATE TABLE IF NOT EXISTS student_reward_events (
            id TEXT PRIMARY KEY,
            username TEXT NOT NULL,
            event_type TEXT NOT NULL,
            reward_type TEXT NOT NULL,
            payload_json TEXT NOT NULL DEFAULT '{}',
            created_at TEXT NOT NULL
        )
    `).run();

    await db.prepare(`
        CREATE TABLE IF NOT EXISTS student_game_activity_events (
            activity_id TEXT PRIMARY KEY,
            username TEXT NOT NULL,
            event_type TEXT NOT NULL,
            event_date TEXT NOT NULL,
            payload_json TEXT NOT NULL DEFAULT '{}',
            created_at TEXT NOT NULL
        )
    `).run();

    await db.prepare(`
        CREATE UNIQUE INDEX IF NOT EXISTS idx_achievement_user_code
        ON student_achievement_unlocks(username, achievement_code)
    `).run();
    await db.prepare(`
        CREATE INDEX IF NOT EXISTS idx_reward_events_user_date
        ON student_reward_events(username, created_at DESC)
    `).run();
    await db.prepare(`
        CREATE INDEX IF NOT EXISTS idx_activity_events_user_date
        ON student_game_activity_events(username, created_at DESC)
    `).run();
};

const ensureProfile = async (db: D1Database, username: string): Promise<GameProfileRow> => {
    let profile = await db.prepare(`
        SELECT *
        FROM student_game_profiles
        WHERE username = ?
        LIMIT 1
    `).bind(username).first<GameProfileRow>();

    if (profile) return profile;

    const now = new Date().toISOString();
    await db.prepare(`
        INSERT INTO student_game_profiles
        (username, daily_streak, last_mission_completion_date, hint_tokens, streak_shields, collection_json, created_at, updated_at)
        VALUES (?, 0, '', 0, 0, '[]', ?, ?)
    `).bind(username, now, now).run();

    profile = await db.prepare(`
        SELECT *
        FROM student_game_profiles
        WHERE username = ?
        LIMIT 1
    `).bind(username).first<GameProfileRow>();

    return profile as GameProfileRow;
};

const getOrCreateDailyProgress = async (
    db: D1Database,
    username: string,
    dateKey: string
): Promise<DailyProgressRow> => {
    let progress = await db.prepare(`
        SELECT *
        FROM student_daily_progress
        WHERE username = ? AND progress_date = ?
        LIMIT 1
    `).bind(username, dateKey).first<DailyProgressRow>();

    if (progress) return progress;

    const now = new Date().toISOString();
    await db.prepare(`
        INSERT INTO student_daily_progress
        (username, progress_date, created_at, updated_at)
        VALUES (?, ?, ?, ?)
    `).bind(username, dateKey, now, now).run();

    progress = await db.prepare(`
        SELECT *
        FROM student_daily_progress
        WHERE username = ? AND progress_date = ?
        LIMIT 1
    `).bind(username, dateKey).first<DailyProgressRow>();

    return progress as DailyProgressRow;
};

const getMissionRows = (progress: DailyProgressRow): DashboardMission[] => {
    const accuracy = progress.questions_answered >= 10
        ? Math.round((progress.correct_answers / Math.max(progress.questions_answered, 1)) * 100)
        : Math.round((progress.correct_answers / Math.max(progress.questions_answered, 1)) * 100);

    return DAILY_MISSIONS.map((mission) => {
        if (mission.id === 'daily_questions') {
            return {
                ...mission,
                progress: progress.questions_answered,
                completed: progress.questions_answered >= mission.target,
                claimed: Number(progress.mission_questions_claimed) === 1,
            };
        }
        if (mission.id === 'daily_accuracy') {
            const completed = progress.questions_answered >= 10 && accuracy >= mission.target;
            return {
                ...mission,
                progress: progress.questions_answered >= 10 ? accuracy : 0,
                completed,
                claimed: Number(progress.mission_accuracy_claimed) === 1,
            };
        }
        const subjectProgress = Number(progress.toan_quizzes_completed) + Number(progress.tieng_viet_quizzes_completed);
        return {
            ...mission,
            progress: subjectProgress,
            completed: subjectProgress >= mission.target,
            claimed: Number(progress.mission_subject_claimed) === 1,
        };
    });
};

const areAllMissionsClaimed = (missions: DashboardMission[]): boolean => {
    return missions.every((mission) => mission.claimed);
};

const getMissionClaimColumn = (missionId: MissionId): keyof DailyProgressRow => {
    if (missionId === 'daily_questions') return 'mission_questions_claimed';
    if (missionId === 'daily_accuracy') return 'mission_accuracy_claimed';
    return 'mission_subject_claimed';
};

const syncDailyStreakIfNeeded = async (
    db: D1Database,
    profile: GameProfileRow,
    dateKey: string
): Promise<GameProfileRow> => {
    if (profile.last_mission_completion_date === dateKey) {
        return profile;
    }

    const previousDateKey = getPreviousDateKey(dateKey);
    const nextStreak = profile.last_mission_completion_date === previousDateKey
        ? Number(profile.daily_streak || 0) + 1
        : 1;
    const now = new Date().toISOString();

    await db.prepare(`
        UPDATE student_game_profiles
        SET daily_streak = ?, last_mission_completion_date = ?, updated_at = ?
        WHERE username = ?
    `).bind(nextStreak, dateKey, now, profile.username).run();

    return {
        ...profile,
        daily_streak: nextStreak,
        last_mission_completion_date: dateKey,
        updated_at: now,
    };
};

const getStudentCoins = async (db: D1Database, username: string): Promise<number> => {
    const student = await db.prepare(`
        SELECT coins
        FROM students
        WHERE username = ?
        LIMIT 1
    `).bind(username).first<{ coins: number }>();

    return Number(student?.coins) || 0;
};

const getWeeklySummary = async (db: D1Database, username: string): Promise<{ completedDays: number; targetDays: number }> => {
    const rows = await db.prepare(`
        SELECT progress_date
        FROM student_daily_progress
        WHERE username = ?
          AND mission_questions_claimed = 1
          AND mission_accuracy_claimed = 1
          AND mission_subject_claimed = 1
        ORDER BY progress_date DESC
        LIMIT 7
    `).bind(username).all<{ progress_date: string }>();

    return {
        completedDays: rows.results.length,
        targetDays: 5,
    };
};

const appendRewardEvent = async (
    db: D1Database,
    username: string,
    eventType: string,
    rewardType: RewardType,
    payload: Record<string, unknown>
) => {
    await db.prepare(`
        INSERT INTO student_reward_events
        (id, username, event_type, reward_type, payload_json, created_at)
        VALUES (?, ?, ?, ?, ?, ?)
    `).bind(
        generateId('greward'),
        username,
        eventType,
        rewardType,
        JSON.stringify(payload),
        new Date().toISOString()
    ).run();
};

const getRecentRewards = async (db: D1Database, username: string) => {
    const rows = await db.prepare(`
        SELECT event_type, reward_type, payload_json, created_at
        FROM student_reward_events
        WHERE username = ?
        ORDER BY created_at DESC
        LIMIT 4
    `).bind(username).all<any>();

    return rows.results.map((row: any) => ({
        eventType: row.event_type,
        rewardType: row.reward_type,
        payload: safeJsonParse<Record<string, unknown>>(row.payload_json, {}),
        createdAt: row.created_at,
    }));
};

const unlockAchievementsIfNeeded = async (db: D1Database, profile: GameProfileRow, username: string) => {
    // Get already unlocked achievements
    const unlockedRows = await db.prepare(`
        SELECT achievement_code, unlocked_at
        FROM student_achievement_unlocks
        WHERE username = ?
        ORDER BY unlocked_at DESC
    `).bind(username).all<AchievementRow>();
    const unlockedSet = new Set(unlockedRows.results.map((row) => row.achievement_code));

    const toUnlock: string[] = [];

    // === SIMPLE CHECKS (no additional queries needed) ===
    
    // Streak achievements (from profile)
    const streak = Number(profile.daily_streak) || 0;
    if (streak >= 3 && !unlockedSet.has('streak_3')) toUnlock.push('streak_3');
    if (streak >= 7 && !unlockedSet.has('streak_7')) toUnlock.push('streak_7');
    if (streak >= 30 && !unlockedSet.has('streak_30')) toUnlock.push('streak_30');
    if (streak >= 100 && !unlockedSet.has('streak_100')) toUnlock.push('streak_100');

    // Collection achievements (from profile)
    const collection = safeJsonParse<Array<{ id: string }>>(profile.collection_json, []);
    const collectionSize = collection.length;
    if (collectionSize >= 5 && !unlockedSet.has('collector_5')) toUnlock.push('collector_5');
    if (collectionSize >= 10 && !unlockedSet.has('collector_10')) toUnlock.push('collector_10');

    // Mission achievements (from daily_progress)
    const dailyAggregates = await db.prepare(`
        SELECT
            COALESCE(SUM(quizzes_completed), 0) AS total_quizzes,
            COALESCE(SUM(
                CASE
                    WHEN mission_questions_claimed = 1
                     AND mission_accuracy_claimed = 1
                     AND mission_subject_claimed = 1
                    THEN 1 ELSE 0
                END
            ), 0) AS completed_days
        FROM student_daily_progress
        WHERE username = ?
    `).bind(username).first<any>();

    if (Number(dailyAggregates?.total_quizzes) >= 1 && !unlockedSet.has('first_quiz')) {
        toUnlock.push('first_quiz');
    }
    if (Number(dailyAggregates?.completed_days) >= 1 && !unlockedSet.has('daily_hat_trick')) {
        toUnlock.push('daily_hat_trick');
    }
    if (Number(dailyAggregates?.completed_days) >= 7 && !unlockedSet.has('weekly_warrior')) {
        toUnlock.push('weekly_warrior');
    }

    // === COMPLEX CHECKS (need results table query) ===
    // Only query if there are unchecked achievements
    const needsResultsQuery = 
        !unlockedSet.has('math_expert_50') || !unlockedSet.has('math_expert_100') ||
        !unlockedSet.has('vietnamese_expert_50') || !unlockedSet.has('english_expert_50') ||
        !unlockedSet.has('speed_demon_10') || !unlockedSet.has('speed_master_30') ||
        !unlockedSet.has('perfect_5') || !unlockedSet.has('perfect_20') ||
        !unlockedSet.has('early_bird_10') || !unlockedSet.has('night_owl_10') ||
        !unlockedSet.has('questions_100') || !unlockedSet.has('questions_500') || !unlockedSet.has('questions_1000');

    if (needsResultsQuery) {
        // Single optimized query for all complex checks
        const resultsStats = await db.prepare(`
            SELECT
                -- Subject mastery (correct answers with score >= 80%) - using quiz category
                COALESCE(SUM(CASE WHEN (q.category = 'Toán' OR q.category = 'toan') AND r.score >= 80 THEN r.correct_count ELSE 0 END), 0) AS math_correct,
                COALESCE(SUM(CASE WHEN (q.category LIKE '%Việt%' OR q.category LIKE '%viet%') AND r.score >= 80 THEN r.correct_count ELSE 0 END), 0) AS vietnamese_correct,
                COALESCE(SUM(CASE WHEN (q.category LIKE '%Anh%' OR q.category LIKE '%English%') AND r.score >= 80 THEN r.correct_count ELSE 0 END), 0) AS english_correct,
                
                -- Speed achievements (time_taken < 50% of time_limit)
                COALESCE(SUM(CASE WHEN r.time_taken > 0 AND q.time_limit > 0 AND r.time_taken < (q.time_limit * 0.5) THEN 1 ELSE 0 END), 0) AS speed_count,
                
                -- Perfect score (100% correct)
                COALESCE(SUM(CASE WHEN r.total_questions > 0 AND r.correct_count = r.total_questions THEN 1 ELSE 0 END), 0) AS perfect_count,
                
                -- Time-based (hour of submission)
                COALESCE(SUM(CASE WHEN CAST(strftime('%H', r.submitted_at) AS INTEGER) < 7 THEN 1 ELSE 0 END), 0) AS early_bird_count,
                COALESCE(SUM(CASE WHEN CAST(strftime('%H', r.submitted_at) AS INTEGER) >= 21 THEN 1 ELSE 0 END), 0) AS night_owl_count,
                
                -- Total correct answers
                COALESCE(SUM(r.correct_count), 0) AS total_correct
            FROM results r
            LEFT JOIN quizzes q ON r.quiz_id = q.id
            WHERE r.student_name = ?
        `).bind(username).first<any>();

        // Subject mastery
        const mathCorrect = Number(resultsStats?.math_correct) || 0;
        const vietnameseCorrect = Number(resultsStats?.vietnamese_correct) || 0;
        const englishCorrect = Number(resultsStats?.english_correct) || 0;
        
        if (mathCorrect >= 50 && !unlockedSet.has('math_expert_50')) toUnlock.push('math_expert_50');
        if (mathCorrect >= 100 && !unlockedSet.has('math_expert_100')) toUnlock.push('math_expert_100');
        if (vietnameseCorrect >= 50 && !unlockedSet.has('vietnamese_expert_50')) toUnlock.push('vietnamese_expert_50');
        if (englishCorrect >= 50 && !unlockedSet.has('english_expert_50')) toUnlock.push('english_expert_50');

        // Speed achievements
        const speedCount = Number(resultsStats?.speed_count) || 0;
        if (speedCount >= 10 && !unlockedSet.has('speed_demon_10')) toUnlock.push('speed_demon_10');
        if (speedCount >= 30 && !unlockedSet.has('speed_master_30')) toUnlock.push('speed_master_30');

        // Perfect score achievements
        const perfectCount = Number(resultsStats?.perfect_count) || 0;
        if (perfectCount >= 5 && !unlockedSet.has('perfect_5')) toUnlock.push('perfect_5');
        if (perfectCount >= 20 && !unlockedSet.has('perfect_20')) toUnlock.push('perfect_20');

        // Time-based achievements
        const earlyBirdCount = Number(resultsStats?.early_bird_count) || 0;
        const nightOwlCount = Number(resultsStats?.night_owl_count) || 0;
        if (earlyBirdCount >= 10 && !unlockedSet.has('early_bird_10')) toUnlock.push('early_bird_10');
        if (nightOwlCount >= 10 && !unlockedSet.has('night_owl_10')) toUnlock.push('night_owl_10');

        // Total questions achievements
        const totalCorrect = Number(resultsStats?.total_correct) || 0;
        if (totalCorrect >= 100 && !unlockedSet.has('questions_100')) toUnlock.push('questions_100');
        if (totalCorrect >= 500 && !unlockedSet.has('questions_500')) toUnlock.push('questions_500');
        if (totalCorrect >= 1000 && !unlockedSet.has('questions_1000')) toUnlock.push('questions_1000');
    }

    // Batch insert new achievements
    if (toUnlock.length > 0) {
        const now = new Date().toISOString();
        const inserts = toUnlock.map((code) =>
            db.prepare(`
                INSERT INTO student_achievement_unlocks
                (id, username, achievement_code, unlocked_at, metadata)
                VALUES (?, ?, ?, ?, '{}')
            `).bind(generateId('gach'), username, code, now)
        );
        await db.batch(inserts);
    }

    // Return all unlocked achievements
    const refreshedRows = await db.prepare(`
        SELECT achievement_code, unlocked_at
        FROM student_achievement_unlocks
        WHERE username = ?
        ORDER BY unlocked_at DESC
    `).bind(username).all<AchievementRow>();

    const byCode = new Map(refreshedRows.results.map((row) => [row.achievement_code, row.unlocked_at]));
    return ACHIEVEMENTS
        .filter((achievement) => byCode.has(achievement.code))
        .map((achievement) => ({
            ...achievement,
            unlockedAt: byCode.get(achievement.code) || '',
        }));
};

const buildDashboardResponse = async (db: D1Database, username: string) => {
    const todayDateKey = getBangkokDateKey();
    const profile = await ensureProfile(db, username);
    const progress = await getOrCreateDailyProgress(db, username, todayDateKey);
    const missions = getMissionRows(progress);
    const achievements = await unlockAchievementsIfNeeded(db, profile, username);
    const coins = await getStudentCoins(db, username);
    const weekly = await getWeeklySummary(db, username);
    const collection = safeJsonParse<Array<{ id: string; title: string; icon: string }>>(profile.collection_json, []);
    const recentRewards = await getRecentRewards(db, username);

    return {
        todayDateKey,
        wallet: { coins },
        missions,
        bonusChest: {
            available: areAllMissionsClaimed(missions) && Number(progress.chest_claimed) !== 1,
            claimed: Number(progress.chest_claimed) === 1,
        },
        weekly,
        profile: {
            dailyStreak: Number(profile.daily_streak) || 0,
            hintTokens: Number(profile.hint_tokens) || 0,
            streakShields: Number(profile.streak_shields) || 0,
            collection,
        },
        achievements,
        recentRewards,
    };
};

const chooseChestReward = (
    collection: Array<{ id: string; title: string; icon: string }>
): { type: RewardType; payload: Record<string, unknown> } => {
    const roll = Math.random();
    if (roll < 0.55) {
        const owned = new Set(collection.map((item) => item.id));
        const nextCollectible = COLLECTIBLE_REWARDS.find((item) => !owned.has(item.id));
        if (nextCollectible) {
            return {
                type: 'COLLECTIBLE',
                payload: nextCollectible,
            };
        }
    }

    if (roll < 0.8) {
        return {
            type: 'COINS',
            payload: { coins: 45, title: 'Túi xu nhỏ', icon: '🪙' },
        };
    }
    if (roll < 0.92) {
        return {
            type: 'HINT_TOKEN',
            payload: { amount: 1, title: 'Vé gợi ý', icon: '💡' },
        };
    }
    return {
        type: 'STREAK_SHIELD',
        payload: { amount: 1, title: 'Khiên giữ chuỗi', icon: '🛡️' },
    };
};

export async function handleGameLoopRoutes(request: Request, env: Env, path: string, method: string): Promise<Response> {
    const db = env.DB;
    const url = new URL(request.url);
    await ensureGameLoopTables(db);

    if (path === '/api/game-loop/dashboard' && method === 'GET') {
        const username = String(url.searchParams.get('username') || '').trim();
        if (!username) return errorResponse('Missing username');

        const data = await buildDashboardResponse(db, username);
        return jsonResponse({ status: 'success', data });
    }

    if (path === '/api/game-loop/track-quiz' && method === 'POST') {
        const body = await parseBody(request);
        if (!body) return errorResponse('Invalid JSON body');

        const username = String(body.username || '').trim();
        const activityId = String(body.activityId || '').trim();
        const rawCategory = String(body.category || body.subject || '').trim();
        const normalizedCategory = normalizeCategory(rawCategory);
        const totalQuestions = Math.max(0, Math.floor(Number(body.totalQuestions) || 0));
        const correctCount = Math.max(0, Math.floor(Number(body.correctCount) || 0));

        if (!username || !activityId) return errorResponse('Missing username or activityId');

        const existingActivity = await db.prepare(`
            SELECT activity_id
            FROM student_game_activity_events
            WHERE activity_id = ?
            LIMIT 1
        `).bind(activityId).first<any>();

        if (!existingActivity) {
            const dateKey = getBangkokDateKey();
            const now = new Date().toISOString();
            const progress = await getOrCreateDailyProgress(db, username, dateKey);

            await db.batch([
                db.prepare(`
                    INSERT INTO student_game_activity_events
                    (activity_id, username, event_type, event_date, payload_json, created_at)
                    VALUES (?, ?, 'QUIZ_COMPLETED', ?, ?, ?)
                `).bind(
                    activityId,
                    username,
                    dateKey,
                    JSON.stringify({
                        quizId: String(body.quizId || ''),
                        category: normalizedCategory,
                        correctCount,
                        totalQuestions,
                    }),
                    now
                ),
                db.prepare(`
                    UPDATE student_daily_progress
                    SET
                        questions_answered = ?,
                        correct_answers = ?,
                        quizzes_completed = ?,
                        toan_quizzes_completed = ?,
                        tieng_viet_quizzes_completed = ?,
                        updated_at = ?
                    WHERE username = ? AND progress_date = ?
                `).bind(
                    Number(progress.questions_answered) + totalQuestions,
                    Number(progress.correct_answers) + correctCount,
                    Number(progress.quizzes_completed) + 1,
                    Number(progress.toan_quizzes_completed) + (normalizedCategory === 'toan' ? 1 : 0),
                    Number(progress.tieng_viet_quizzes_completed) + (normalizedCategory === 'tieng-viet' ? 1 : 0),
                    now,
                    username,
                    dateKey
                ),
            ]);
            
            // Update weekly quest progress
            const weekKey = getCurrentWeekKey();
            const weeklyUpdates: Record<string, number> = {};
            
            // weekly_20_quizzes: +1 quiz
            weeklyUpdates['weekly_20_quizzes'] = 1;
            
            // weekly_100_correct: +correctCount
            weeklyUpdates['weekly_100_correct'] = correctCount;
            
            // weekly_perfect_streak: +1 if score === 100%
            if (correctCount === totalQuestions && totalQuestions > 0) {
                weeklyUpdates['weekly_perfect_streak'] = 1;
            }
            
            await updateWeeklyQuestProgress(db, username, weekKey, weeklyUpdates);
        }

        const data = await buildDashboardResponse(db, username);
        return jsonResponse({ status: 'success', data });
    }

    if (path === '/api/game-loop/claim-mission' && method === 'POST') {
        const body = await parseBody(request);
        if (!body) return errorResponse('Invalid JSON body');

        const username = String(body.username || '').trim();
        const missionId = String(body.missionId || '').trim() as MissionId;
        if (!username || !missionId) return errorResponse('Missing username or missionId');

        const dateKey = getBangkokDateKey();
        let profile = await ensureProfile(db, username);
        const progress = await getOrCreateDailyProgress(db, username, dateKey);
        const missions = getMissionRows(progress);
        const mission = missions.find((item) => item.id === missionId);

        if (!mission) return errorResponse('Mission not found', 404);
        if (!mission.completed) return errorResponse('Mission is not complete yet');
        if (mission.claimed) return errorResponse('Mission has already been claimed');

        const column = getMissionClaimColumn(missionId);
        const allClaimedBefore = areAllMissionsClaimed(missions);
        const now = new Date().toISOString();

        await db.batch([
            db.prepare(`
                UPDATE student_daily_progress
                SET ${column} = 1, updated_at = ?
                WHERE username = ? AND progress_date = ?
            `).bind(now, username, dateKey),
            db.prepare(`
                UPDATE students
                SET coins = coins + ?
                WHERE username = ?
            `).bind(mission.rewardCoins, username),
        ]);

        await appendRewardEvent(db, username, 'MISSION_CLAIM', 'COINS', {
            missionId,
            coins: mission.rewardCoins,
        });

        const refreshedProgress = await getOrCreateDailyProgress(db, username, dateKey);
        const refreshedMissions = getMissionRows(refreshedProgress);
        const allClaimedAfter = areAllMissionsClaimed(refreshedMissions);

        if (!allClaimedBefore && allClaimedAfter) {
            profile = await syncDailyStreakIfNeeded(db, profile, dateKey);
        }

        const data = await buildDashboardResponse(db, username);
        return jsonResponse({
            status: 'success',
            data,
            reward: {
                type: 'COINS',
                coins: mission.rewardCoins,
                missionId,
            },
        });
    }

    if (path === '/api/game-loop/claim-chest' && method === 'POST') {
        const body = await parseBody(request);
        if (!body) return errorResponse('Invalid JSON body');

        const username = String(body.username || '').trim();
        if (!username) return errorResponse('Missing username');

        const dateKey = getBangkokDateKey();
        const profile = await ensureProfile(db, username);
        const progress = await getOrCreateDailyProgress(db, username, dateKey);
        const missions = getMissionRows(progress);

        if (!areAllMissionsClaimed(missions)) {
            return errorResponse('Complete all missions before opening the chest');
        }
        if (Number(progress.chest_claimed) === 1) {
            return errorResponse('Bonus chest has already been claimed today');
        }

        const collection = safeJsonParse<Array<{ id: string; title: string; icon: string }>>(profile.collection_json, []);
        const reward = chooseChestReward(collection);
        const now = new Date().toISOString();

        const batchStatements: D1PreparedStatement[] = [
            db.prepare(`
                UPDATE student_daily_progress
                SET chest_claimed = 1, updated_at = ?
                WHERE username = ? AND progress_date = ?
            `).bind(now, username, dateKey),
        ];

        if (reward.type === 'COINS') {
            batchStatements.push(
                db.prepare(`
                    UPDATE students
                    SET coins = coins + ?
                    WHERE username = ?
                `).bind(Number(reward.payload.coins) || 0, username)
            );
        } else if (reward.type === 'HINT_TOKEN') {
            batchStatements.push(
                db.prepare(`
                    UPDATE student_game_profiles
                    SET hint_tokens = hint_tokens + ?, updated_at = ?
                    WHERE username = ?
                `).bind(Number(reward.payload.amount) || 0, now, username)
            );
        } else if (reward.type === 'STREAK_SHIELD') {
            batchStatements.push(
                db.prepare(`
                    UPDATE student_game_profiles
                    SET streak_shields = streak_shields + ?, updated_at = ?
                    WHERE username = ?
                `).bind(Number(reward.payload.amount) || 0, now, username)
            );
        } else if (reward.type === 'COLLECTIBLE') {
            const nextCollection = [...collection, reward.payload as { id: string; title: string; icon: string }];
            batchStatements.push(
                db.prepare(`
                    UPDATE student_game_profiles
                    SET collection_json = ?, updated_at = ?
                    WHERE username = ?
                `).bind(JSON.stringify(nextCollection), now, username)
            );
        }

        await db.batch(batchStatements);
        await appendRewardEvent(db, username, 'BONUS_CHEST', reward.type, reward.payload);

        const data = await buildDashboardResponse(db, username);
        return jsonResponse({
            status: 'success',
            data,
            reward,
        });
    }

    if (path === '/api/game-loop/weekly-quests' && method === 'GET') {
        const username = String(url.searchParams.get('username') || '').trim();
        if (!username) return errorResponse('Missing username');
        
        const weekKey = getCurrentWeekKey();
        const progressRows = await getOrCreateWeeklyProgress(db, username, weekKey);
        
        const quests = WEEKLY_QUESTS.map(quest => {
            const progress = progressRows.find((p: any) => p.quest_id === quest.id);
            return {
                ...quest,
                progress: Number(progress?.progress) || 0,
                completed: (Number(progress?.progress) || 0) >= quest.target,
                claimed: Number(progress?.claimed || 0) === 1,
            };
        });
        
        return jsonResponse({ status: 'success', weekKey, quests });
    }

    if (path === '/api/game-loop/claim-weekly-quest' && method === 'POST') {
        const body = await parseBody(request);
        if (!body) return errorResponse('Invalid JSON body');
        
        const username = String(body.username || '').trim();
        const questId = String(body.questId || '').trim();
        
        if (!username || !questId) {
            return errorResponse('Missing username or questId');
        }
        
        const weekKey = getCurrentWeekKey();
        const quest = WEEKLY_QUESTS.find(q => q.id === questId);
        if (!quest) return errorResponse('Quest not found', 404);
        
        const progress = await db.prepare(`
            SELECT * FROM student_weekly_progress
            WHERE username = ? AND week_key = ? AND quest_id = ?
        `).bind(username, weekKey, questId).first<any>();
        
        if (!progress) return errorResponse('Quest progress not found', 404);
        if (Number(progress.claimed) === 1) return errorResponse('Quest already claimed');
        if (Number(progress.progress) < quest.target) return errorResponse('Quest not completed yet');
        
        const now = new Date().toISOString();
        const statements = [];
        
        statements.push(
            db.prepare(`
                UPDATE student_weekly_progress
                SET claimed = 1, updated_at = ?
                WHERE username = ? AND week_key = ? AND quest_id = ?
            `).bind(now, username, weekKey, questId)
        );
        
        statements.push(
            db.prepare('UPDATE students SET coins = coins + ? WHERE username = ?')
                .bind(quest.reward.coins, username)
        );
        
        const items = quest.reward.items as readonly string[];
        if (items.some(item => item === 'hint_token')) {
            statements.push(
                db.prepare(`
                    UPDATE student_game_profiles
                    SET hint_tokens = hint_tokens + ?, updated_at = ?
                    WHERE username = ?
                `).bind(quest.reward.itemCount, now, username)
            );
        }
        
        if (items.some(item => item === 'streak_shield')) {
            statements.push(
                db.prepare(`
                    UPDATE student_game_profiles
                    SET streak_shields = streak_shields + ?, updated_at = ?
                    WHERE username = ?
                `).bind(quest.reward.itemCount, now, username)
            );
        }
        
        await db.batch(statements);
        
        await appendRewardEvent(db, username, 'WEEKLY_QUEST_CLAIM', 'COINS', {
            questId,
            coins: quest.reward.coins,
            items: quest.reward.items,
        });
        
        const data = await buildDashboardResponse(db, username);
        
        return jsonResponse({
            status: 'success',
            data,
            reward: {
                type: 'COINS',
                coins: quest.reward.coins,
                questId,
                items: quest.reward.items,
            },
        });
    }

    return errorResponse('Not found: ' + path, 404);
}
