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

const ACHIEVEMENTS = [
    {
        code: 'first_quiz',
        title: 'Bắt đầu hành trình',
        description: 'Hoàn thành bài quiz đầu tiên.',
        icon: '🚀',
        rarity: 'common',
    },
    {
        code: 'daily_hat_trick',
        title: 'Trọn bộ nhiệm vụ',
        description: 'Hoàn thành đủ 3 nhiệm vụ trong một ngày.',
        icon: '🎯',
        rarity: 'rare',
    },
    {
        code: 'math_starter',
        title: 'Mầm non Toán học',
        description: 'Hoàn thành 3 bài Toán.',
        icon: '🧮',
        rarity: 'common',
    },
    {
        code: 'tieng_viet_starter',
        title: 'Mầm non Tiếng Việt',
        description: 'Hoàn thành 3 bài Tiếng Việt.',
        icon: '📚',
        rarity: 'common',
    },
    {
        code: 'streak_3',
        title: 'Giữ lửa 3 ngày',
        description: 'Hoàn thành đủ nhiệm vụ 3 ngày liên tiếp.',
        icon: '🔥',
        rarity: 'epic',
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
    const aggregates = await db.prepare(`
        SELECT
            COALESCE(SUM(quizzes_completed), 0) AS total_quizzes,
            COALESCE(SUM(toan_quizzes_completed), 0) AS total_toan,
            COALESCE(SUM(tieng_viet_quizzes_completed), 0) AS total_tieng_viet,
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

    const unlockedRows = await db.prepare(`
        SELECT achievement_code, unlocked_at
        FROM student_achievement_unlocks
        WHERE username = ?
        ORDER BY unlocked_at DESC
    `).bind(username).all<AchievementRow>();
    const unlockedSet = new Set(unlockedRows.results.map((row) => row.achievement_code));

    const toUnlock: string[] = [];
    if (Number(aggregates?.total_quizzes) >= 1 && !unlockedSet.has('first_quiz')) {
        toUnlock.push('first_quiz');
    }
    if (Number(aggregates?.completed_days) >= 1 && !unlockedSet.has('daily_hat_trick')) {
        toUnlock.push('daily_hat_trick');
    }
    if (Number(aggregates?.total_toan) >= 3 && !unlockedSet.has('math_starter')) {
        toUnlock.push('math_starter');
    }
    if (Number(aggregates?.total_tieng_viet) >= 3 && !unlockedSet.has('tieng_viet_starter')) {
        toUnlock.push('tieng_viet_starter');
    }
    if (Number(profile.daily_streak) >= 3 && !unlockedSet.has('streak_3')) {
        toUnlock.push('streak_3');
    }

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

    return errorResponse('Not found: ' + path, 404);
}
