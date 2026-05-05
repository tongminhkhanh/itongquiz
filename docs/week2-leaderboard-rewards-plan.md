# Week 2: Leaderboard Rewards & Categories Implementation Plan

**Timeline:** 2-3 ngày  
**Priority:** ⭐⭐⭐⭐ (High)  
**Estimated Impact:** Tăng cạnh tranh lành mạnh, retention +10%

---

## 📋 Overview

Thêm rewards cho top 3 weekly và mở rộng leaderboard với nhiều categories (Speed, Accuracy, Streak).

---

## 🎯 Goals

1. Weekly rewards cho top 3 (coins + exclusive badges)
2. Leaderboard categories: Overall, Weekly, Speed, Accuracy, Streak
3. Cloudflare Workers Cron job để award rewards tự động
4. UI tabs cho categories
5. Crown icon và rewards display

---

## 📁 Files to Modify

### Backend Files
- `workers/src/routes/gamification.ts` - Thêm leaderboard endpoints
- `workers/wrangler.toml` - Thêm cron trigger
- `workers/schema.sql` - Thêm bảng leaderboard_rewards_history

### Frontend Files
- `src/components/HomePage/LeaderboardPage.tsx` - Thêm tabs, rewards display
- `src/services/gamificationService.ts` - Thêm API calls

---

## 🔧 Implementation Details

### STEP 1: Database Schema (Day 1 Morning)

**File:** `workers/schema.sql`

**Action:** Thêm bảng mới:

```sql
-- Leaderboard rewards history
CREATE TABLE IF NOT EXISTS leaderboard_rewards_history (
  id TEXT PRIMARY KEY,
  username TEXT NOT NULL,
  period TEXT NOT NULL, -- 'weekly', 'monthly'
  period_key TEXT NOT NULL, -- '2026-W18', '2026-05'
  rank INTEGER NOT NULL,
  coins_awarded INTEGER DEFAULT 0,
  badge_code TEXT,
  awarded_at TEXT NOT NULL,
  FOREIGN KEY (username) REFERENCES students(username)
);

CREATE INDEX idx_leaderboard_rewards_user ON leaderboard_rewards_history(username, awarded_at DESC);
CREATE INDEX idx_leaderboard_rewards_period ON leaderboard_rewards_history(period, period_key);
```

---

### STEP 2: Backend - Leaderboard Endpoints (Day 1 Afternoon)

**File:** `workers/src/routes/gamification.ts`

**Location:** Thêm sau existing leaderboard endpoints (sau dòng ~200)

**Action:** Thêm các endpoints mới:

```typescript
// === LEADERBOARD CATEGORIES ===

// Weekly leaderboard (reset mỗi tuần)
if (path === '/api/leaderboard/weekly' && method === 'GET') {
    const weekKey = url.searchParams.get('week') || getCurrentWeekKey();
    
    const rows = await db.prepare(`
        SELECT 
            s.username,
            s.full_name,
            s.class_id,
            s.avatar,
            SUM(r.score) as total_score,
            COUNT(r.id) as quiz_count,
            SUM(r.correct_count) as total_correct
        FROM results r
        JOIN students s ON s.username = r.username
        WHERE strftime('%Y-W%W', r.submitted_at) = ?
        GROUP BY s.username
        ORDER BY total_score DESC
        LIMIT 50
    `).bind(weekKey).all();
    
    return jsonResponse(rows.results || []);
}

// Speed leaderboard (avg time ratio)
if (path === '/api/leaderboard/speed' && method === 'GET') {
    const rows = await db.prepare(`
        SELECT 
            s.username,
            s.full_name,
            s.class_id,
            s.avatar,
            AVG(CAST(r.time_taken AS REAL) / CAST(r.time_limit AS REAL)) as avg_speed_ratio,
            COUNT(r.id) as quiz_count
        FROM results r
        JOIN students s ON s.username = r.username
        WHERE r.time_taken > 0 AND r.time_limit > 0
        GROUP BY s.username
        HAVING quiz_count >= 5
        ORDER BY avg_speed_ratio ASC
        LIMIT 50
    `).all();
    
    return jsonResponse(rows.results || []);
}

// Accuracy leaderboard (avg correct percentage)
if (path === '/api/leaderboard/accuracy' && method === 'GET') {
    const rows = await db.prepare(`
        SELECT 
            s.username,
            s.full_name,
            s.class_id,
            s.avatar,
            AVG(CAST(r.correct_count AS REAL) / CAST(r.total_questions AS REAL) * 100) as avg_accuracy,
            COUNT(r.id) as quiz_count
        FROM results r
        JOIN students s ON s.username = r.username
        WHERE r.total_questions > 0
        GROUP BY s.username
        HAVING quiz_count >= 5
        ORDER BY avg_accuracy DESC
        LIMIT 50
    `).all();
    
    return jsonResponse(rows.results || []);
}

// Streak leaderboard
if (path === '/api/leaderboard/streak' && method === 'GET') {
    const rows = await db.prepare(`
        SELECT 
            s.username,
            s.full_name,
            s.class_id,
            s.avatar,
            gp.daily_streak
        FROM student_game_profiles gp
        JOIN students s ON s.username = gp.username
        WHERE gp.daily_streak > 0
        ORDER BY gp.daily_streak DESC
        LIMIT 50
    `).all();
    
    return jsonResponse(rows.results || []);
}
```

**Helper function:** Thêm vào đầu file:

```typescript
const getCurrentWeekKey = (): string => {
    const now = new Date();
    const year = now.getFullYear();
    const week = getWeekNumber(now);
    return `${year}-W${String(week).padStart(2, '0')}`;
};

const getWeekNumber = (date: Date): number => {
    const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
    const dayNum = d.getUTCDay() || 7;
    d.setUTCDate(d.getUTCDate() + 4 - dayNum);
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    return Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
};
```

---

### STEP 3: Backend - Weekly Rewards Cron Job (Day 2 Morning)

**File:** `workers/wrangler.toml`

**Action:** Thêm cron trigger:

```toml
[triggers]
crons = ["0 0 * * 1"] # Every Monday at 00:00 UTC (7:00 ICT)
```

**File:** `workers/src/index.ts`

**Action:** Thêm scheduled handler:

```typescript
export default {
    async fetch(request: Request, env: Env): Promise<Response> {
        // ... existing code
    },
    
    async scheduled(event: ScheduledEvent, env: Env, ctx: ExecutionContext): Promise<void> {
        console.log('[Cron] Running weekly leaderboard rewards...');
        
        try {
            const db = env.DB;
            const lastWeekKey = getLastWeekKey();
            
            // Get top 3 from last week
            const topStudents = await db.prepare(`
                SELECT 
                    s.username,
                    SUM(r.score) as total_score
                FROM results r
                JOIN students s ON s.username = r.username
                WHERE strftime('%Y-W%W', r.submitted_at) = ?
                GROUP BY s.username
                ORDER BY total_score DESC
                LIMIT 3
            `).bind(lastWeekKey).all();
            
            if (!topStudents.results || topStudents.results.length === 0) {
                console.log('[Cron] No students found for last week');
                return;
            }
            
            const rewards = [
                { rank: 1, coins: 500, badge: 'weekly_champion_1st' },
                { rank: 2, coins: 300, badge: 'weekly_champion_2nd' },
                { rank: 3, coins: 150, badge: 'weekly_champion_3rd' },
            ];
            
            const now = new Date().toISOString();
            
            for (let i = 0; i < topStudents.results.length; i++) {
                const student = topStudents.results[i] as any;
                const reward = rewards[i];
                
                // Award coins
                await db.prepare('UPDATE students SET coins = coins + ? WHERE username = ?')
                    .bind(reward.coins, student.username).run();
                
                // Unlock badge
                await db.prepare(`
                    INSERT OR IGNORE INTO student_achievement_unlocks 
                    (id, username, achievement_code, unlocked_at, metadata)
                    VALUES (?, ?, ?, ?, ?)
                `).bind(
                    generateId('ach'),
                    student.username,
                    reward.badge,
                    now,
                    JSON.stringify({ weekKey: lastWeekKey, rank: reward.rank })
                ).run();
                
                // Log reward history
                await db.prepare(`
                    INSERT INTO leaderboard_rewards_history
                    (id, username, period, period_key, rank, coins_awarded, badge_code, awarded_at)
                    VALUES (?, ?, 'weekly', ?, ?, ?, ?, ?)
                `).bind(
                    generateId('lbrew'),
                    student.username,
                    lastWeekKey,
                    reward.rank,
                    reward.coins,
                    reward.badge,
                    now
                ).run();
                
                console.log(`[Cron] Awarded rank ${reward.rank} to ${student.username}: ${reward.coins} coins + ${reward.badge}`);
            }
            
        } catch (error) {
            console.error('[Cron] Error awarding weekly rewards:', error);
        }
    }
};

function getLastWeekKey(): string {
    const now = new Date();
    now.setDate(now.getDate() - 7); // Go back 1 week
    const year = now.getFullYear();
    const week = getWeekNumber(now);
    return `${year}-W${String(week).padStart(2, '0')}`;
}
```

---

### STEP 4: Frontend - Leaderboard Tabs UI (Day 2 Afternoon)

**File:** `src/components/HomePage/LeaderboardPage.tsx`

**Action:** Thêm tabs và category switching:

```typescript
// Add state for category
const [category, setCategory] = useState<'overall' | 'weekly' | 'speed' | 'accuracy' | 'streak'>('overall');

// Add tabs UI (thêm sau header, trước podium)
<div className="flex gap-2 overflow-x-auto pb-2 px-4">
    {[
        { id: 'overall', label: '🏆 Tổng điểm', icon: '🏆' },
        { id: 'weekly', label: '🔥 Tuần này', icon: '🔥' },
        { id: 'speed', label: '⚡ Tốc độ', icon: '⚡' },
        { id: 'accuracy', label: '🎯 Chính xác', icon: '🎯' },
        { id: 'streak', label: '🔥 Chuỗi', icon: '🔥' },
    ].map(tab => (
        <button
            key={tab.id}
            onClick={() => setCategory(tab.id as any)}
            className={`px-4 py-2 rounded-full text-sm font-bold whitespace-nowrap transition-all ${
                category === tab.id
                    ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-lg'
                    : 'bg-white text-gray-600 hover:bg-gray-50'
            }`}
        >
            {tab.icon} {tab.label}
        </button>
    ))}
</div>

// Fetch data based on category
useEffect(() => {
    const fetchLeaderboard = async () => {
        let endpoint = '/api/leaderboard';
        if (category === 'weekly') endpoint = '/api/leaderboard/weekly';
        if (category === 'speed') endpoint = '/api/leaderboard/speed';
        if (category === 'accuracy') endpoint = '/api/leaderboard/accuracy';
        if (category === 'streak') endpoint = '/api/leaderboard/streak';
        
        const response = await fetch(endpoint);
        const data = await response.json();
        setLeaderboardData(data);
    };
    
    fetchLeaderboard();
}, [category]);
```

**Add crown icons for top 3:**

```typescript
// In podium rendering
{rank === 1 && <div className="absolute -top-8 text-4xl">👑</div>}
{rank === 2 && <div className="absolute -top-6 text-3xl">🥈</div>}
{rank === 3 && <div className="absolute -top-6 text-3xl">🥉</div>}
```

---

### STEP 5: Achievement Badges for Weekly Champions (Day 3)

**File:** `workers/src/routes/gameLoop.ts`

**Action:** Thêm vào ACHIEVEMENTS array:

```typescript
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
```

---

## ✅ Checklist

- [ ] Day 1 Morning: Database schema
- [ ] Day 1 Afternoon: Leaderboard endpoints
- [ ] Day 2 Morning: Cron job setup
- [ ] Day 2 Afternoon: Frontend tabs UI
- [ ] Day 3: Weekly champion badges + testing

---

## 🧪 Testing

1. **Manual test endpoints:**
   ```bash
   curl https://your-worker.workers.dev/api/leaderboard/weekly
   curl https://your-worker.workers.dev/api/leaderboard/speed
   ```

2. **Test cron job locally:**
   ```bash
   wrangler dev --test-scheduled
   ```

3. **Verify rewards:**
   - Check `leaderboard_rewards_history` table
   - Check student coins increased
   - Check badges unlocked

---

## 📊 Expected Impact

- Top 3 students mỗi tuần nhận thưởng → Tăng động lực cạnh tranh
- Leaderboard categories → Học sinh có nhiều cách để "win"
- Weekly reset → Mọi người đều có cơ hội mới mỗi tuần
