# Week 3: Weekly Quests Implementation Plan

**Timeline:** 1 tuần  
**Priority:** ⭐⭐⭐ (Medium-High)  
**Estimated Impact:** Retention +15%, Session duration +10 phút

---

## 📋 Overview

Mở rộng mission system với weekly quests để học sinh có mục tiêu dài hạn hơn và quay lại app thường xuyên hơn.

---

## 🎯 Goals

1. Thêm 5 weekly quests (reset mỗi tuần)
2. Progress tracking cho weekly quests
3. Rewards: Coins + special items (Hint Token, Streak Shield, Pet Accessory)
4. UI panel hiển thị weekly quests
5. Auto-reset logic mỗi thứ 2

---

## 📁 Files to Modify

### Backend Files
- `workers/schema.sql` - Thêm bảng student_weekly_progress
- `workers/src/routes/gameLoop.ts` - Thêm weekly quest logic
- `workers/src/types.ts` - Thêm types (nếu cần)

### Frontend Files
- `src/types/gameLoop.types.ts` - Update types
- `src/components/HomePage/StudentDashboardUI.tsx` - Weekly quest panel
- `src/stores/useGameLoopStore.ts` - Weekly quest state

---

## 🔧 Implementation Details

### STEP 1: Database Schema (Day 1)

**File:** `workers/schema.sql`

**Action:** Thêm bảng mới:

```sql
-- Weekly quests progress
CREATE TABLE IF NOT EXISTS student_weekly_progress (
  username TEXT NOT NULL,
  week_key TEXT NOT NULL, -- '2026-W18'
  quest_id TEXT NOT NULL,
  progress INTEGER DEFAULT 0,
  target INTEGER NOT NULL,
  claimed INTEGER DEFAULT 0,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  PRIMARY KEY (username, week_key, quest_id),
  FOREIGN KEY (username) REFERENCES students(username)
);

CREATE INDEX idx_weekly_progress_user_week ON student_weekly_progress(username, week_key);
CREATE INDEX idx_weekly_progress_quest ON student_weekly_progress(quest_id, week_key);
```

---

### STEP 2: Backend - Weekly Quest Definitions (Day 2)

**File:** `workers/src/routes/gameLoop.ts`

**Location:** Thêm sau DAILY_MISSIONS (sau dòng ~77)

**Action:** Thêm weekly quests definition:

```typescript
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
```

---

### STEP 3: Backend - Weekly Quest Logic (Day 3-4)

**File:** `workers/src/routes/gameLoop.ts`

**Action:** Thêm helper functions:

```typescript
// Get current week key (ISO week format)
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

// Get or create weekly progress
const getOrCreateWeeklyProgress = async (
    db: D1Database,
    username: string,
    weekKey: string
): Promise<any[]> => {
    // Check if progress exists for this week
    const existing = await db.prepare(`
        SELECT * FROM student_weekly_progress
        WHERE username = ? AND week_key = ?
    `).bind(username, weekKey).all();
    
    if (existing.results && existing.results.length > 0) {
        return existing.results;
    }
    
    // Create new progress for all quests
    const now = new Date().toISOString();
    const statements = WEEKLY_QUESTS.map(quest =>
        db.prepare(`
            INSERT INTO student_weekly_progress
            (username, week_key, quest_id, progress, target, claimed, created_at, updated_at)
            VALUES (?, ?, ?, 0, ?, 0, ?, ?)
        `).bind(username, weekKey, quest.id, quest.target, now, now)
    );
    
    await db.batch(statements);
    
    // Return newly created progress
    const created = await db.prepare(`
        SELECT * FROM student_weekly_progress
        WHERE username = ? AND week_key = ?
    `).bind(username, weekKey).all();
    
    return created.results || [];
};

// Update weekly quest progress
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
```

**Action:** Thêm endpoint GET weekly quests:

```typescript
// GET /api/game-loop/weekly-quests
if (path === '/api/game-loop/weekly-quests' && method === 'GET') {
    const username = url.searchParams.get('username');
    if (!username) return errorResponse('Missing username');
    
    const weekKey = getCurrentWeekKey();
    const progressRows = await getOrCreateWeeklyProgress(db, username, weekKey);
    
    // Map progress to quest definitions
    const quests = WEEKLY_QUESTS.map(quest => {
        const progress = progressRows.find((p: any) => p.quest_id === quest.id);
        return {
            ...quest,
            progress: progress?.progress || 0,
            completed: (progress?.progress || 0) >= quest.target,
            claimed: Number(progress?.claimed || 0) === 1,
        };
    });
    
    return jsonResponse({ weekKey, quests });
}
```

**Action:** Thêm endpoint POST claim weekly quest:

```typescript
// POST /api/game-loop/claim-weekly-quest
if (path === '/api/game-loop/claim-weekly-quest' && method === 'POST') {
    const body = await parseBody(request);
    if (!body) return errorResponse('Invalid JSON body');
    
    const username = String(body.username || '').trim();
    const questId = String(body.questId || '').trim();
    
    if (!username || !questId) {
        return errorResponse('Missing username or questId');
    }
    
    const weekKey = getCurrentWeekKey();
    
    // Get quest definition
    const quest = WEEKLY_QUESTS.find(q => q.id === questId);
    if (!quest) return errorResponse('Quest not found', 404);
    
    // Get progress
    const progress = await db.prepare(`
        SELECT * FROM student_weekly_progress
        WHERE username = ? AND week_key = ? AND quest_id = ?
    `).bind(username, weekKey, questId).first<any>();
    
    if (!progress) return errorResponse('Quest progress not found', 404);
    if (Number(progress.claimed) === 1) return errorResponse('Quest already claimed');
    if (Number(progress.progress) < quest.target) return errorResponse('Quest not completed yet');
    
    const now = new Date().toISOString();
    const statements = [];
    
    // Mark as claimed
    statements.push(
        db.prepare(`
            UPDATE student_weekly_progress
            SET claimed = 1, updated_at = ?
            WHERE username = ? AND week_key = ? AND quest_id = ?
        `).bind(now, username, weekKey, questId)
    );
    
    // Award coins
    statements.push(
        db.prepare('UPDATE students SET coins = coins + ? WHERE username = ?')
            .bind(quest.reward.coins, username)
    );
    
    // Award items (hint_token, streak_shield, etc.)
    if (quest.reward.items.includes('hint_token')) {
        statements.push(
            db.prepare(`
                UPDATE student_game_profiles
                SET hint_tokens = hint_tokens + ?, updated_at = ?
                WHERE username = ?
            `).bind(quest.reward.itemCount, now, username)
        );
    }
    
    if (quest.reward.items.includes('streak_shield')) {
        statements.push(
            db.prepare(`
                UPDATE student_game_profiles
                SET streak_shields = streak_shields + ?, updated_at = ?
                WHERE username = ?
            `).bind(quest.reward.itemCount, now, username)
        );
    }
    
    await db.batch(statements);
    
    // Log reward event
    await appendRewardEvent(db, username, 'WEEKLY_QUEST_CLAIM', 'COINS', {
        questId,
        coins: quest.reward.coins,
        items: quest.reward.items,
    });
    
    // Return updated dashboard
    const dashboard = await getDashboard(db, username, weekKey.split('-W')[0] + '-' + String(new Date().getMonth() + 1).padStart(2, '0') + '-' + String(new Date().getDate()).padStart(2, '0'));
    
    return jsonResponse({
        data: dashboard,
        reward: {
            type: 'COINS',
            coins: quest.reward.coins,
            questId,
        },
    });
}
```

**Action:** Update track-quiz endpoint để update weekly progress:

```typescript
// Trong endpoint /api/game-loop/track-quiz
// Sau khi update daily progress, thêm:

const weekKey = getCurrentWeekKey();

// Update weekly quest progress
const weeklyUpdates: Record<string, number> = {};

// weekly_20_quizzes: +1 quiz
weeklyUpdates['weekly_20_quizzes'] = 1;

// weekly_100_correct: +correctCount
weeklyUpdates['weekly_100_correct'] = correctCount;

// weekly_subject_master: Check if completed Toán/Tiếng Việt/Tiếng Anh
// (Logic phức tạp hơn, cần track subjects completed)

// weekly_perfect_streak: +1 if score === 100%
if (correctCount === totalQuestions && totalQuestions > 0) {
    weeklyUpdates['weekly_perfect_streak'] = 1;
}

await updateWeeklyQuestProgress(db, username, weekKey, weeklyUpdates);
```

---

### STEP 4: Frontend - Weekly Quest Panel UI (Day 5)

**File:** `src/components/HomePage/StudentDashboardUI.tsx`

**Action:** Thêm weekly quest panel (sau daily missions panel):

```typescript
// Add state
const [weeklyQuests, setWeeklyQuests] = useState<any[]>([]);

// Fetch weekly quests
useEffect(() => {
    if (studentSession?.username) {
        fetch(`/api/game-loop/weekly-quests?username=${studentSession.username}`)
            .then(res => res.json())
            .then(data => setWeeklyQuests(data.quests || []))
            .catch(err => console.error('Failed to fetch weekly quests:', err));
    }
}, [studentSession?.username]);

// Claim weekly quest handler
const handleClaimWeeklyQuest = async (questId: string) => {
    if (!studentSession?.username) return;
    
    try {
        const response = await fetch('/api/game-loop/claim-weekly-quest', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username: studentSession.username, questId }),
        });
        
        const data = await response.json();
        
        if (data.data) {
            // Update dashboard
            // Show reward animation
        }
        
        // Refresh weekly quests
        // ...
    } catch (error) {
        console.error('Failed to claim weekly quest:', error);
    }
};

// UI Component
<div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100">
    <div className="flex items-center gap-3 mb-4">
        <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-purple-500 to-indigo-500 flex items-center justify-center text-white text-xl">
            📅
        </div>
        <div>
            <h3 className="text-lg font-black text-slate-800">Nhiệm vụ tuần</h3>
            <p className="text-xs text-slate-500">Reset mỗi thứ 2</p>
        </div>
    </div>
    
    <div className="space-y-3">
        {weeklyQuests.map(quest => {
            const progressPercent = Math.min(100, (quest.progress / quest.target) * 100);
            
            return (
                <div key={quest.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                    <div className="flex items-start gap-3 mb-2">
                        <div className="text-2xl">{quest.icon}</div>
                        <div className="flex-1 min-w-0">
                            <h4 className="text-sm font-black text-slate-800">{quest.title}</h4>
                            <p className="text-xs text-slate-500">{quest.description}</p>
                        </div>
                    </div>
                    
                    {/* Progress bar */}
                    <div className="mb-2">
                        <div className="flex justify-between text-xs font-bold mb-1">
                            <span className="text-slate-600">{quest.progress}/{quest.target}</span>
                            <span className="text-purple-600">{Math.round(progressPercent)}%</span>
                        </div>
                        <div className="h-2 bg-slate-200 rounded-full overflow-hidden">
                            <div 
                                className="h-full bg-gradient-to-r from-purple-500 to-indigo-500 transition-all duration-500"
                                style={{ width: `${progressPercent}%` }}
                            />
                        </div>
                    </div>
                    
                    {/* Reward & Claim button */}
                    <div className="flex items-center justify-between">
                        <div className="text-xs font-bold text-amber-600">
                            🪙 +{quest.reward.coins} Xu
                            {quest.reward.items.length > 0 && ` + ${quest.reward.itemCount} vật phẩm`}
                        </div>
                        <button
                            type="button"
                            onClick={() => handleClaimWeeklyQuest(quest.id)}
                            disabled={!quest.completed || quest.claimed}
                            className={`px-4 py-2 rounded-xl text-xs font-black transition-all ${
                                quest.claimed
                                    ? 'bg-slate-200 text-slate-400 cursor-not-allowed'
                                    : quest.completed
                                    ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white hover:shadow-lg'
                                    : 'bg-slate-200 text-slate-400 cursor-not-allowed'
                            }`}
                        >
                            {quest.claimed ? '✓ Đã nhận' : quest.completed ? 'Nhận thưởng' : 'Chưa xong'}
                        </button>
                    </div>
                </div>
            );
        })}
    </div>
</div>
```

---

## ✅ Checklist

- [ ] Day 1: Database schema
- [ ] Day 2: Weekly quest definitions
- [ ] Day 3-4: Backend logic (get, claim, update)
- [ ] Day 5: Frontend UI panel
- [ ] Day 6: Testing & polish
- [ ] Day 7: Deploy & monitor

---

## 🧪 Testing

1. **Test quest creation:**
   - New user → Should auto-create 5 weekly quests
   - Check `student_weekly_progress` table

2. **Test progress tracking:**
   - Complete quiz → Check progress updated
   - Verify correct quests incremented

3. **Test claim:**
   - Complete quest → Claim button enabled
   - Click claim → Coins awarded, items added
   - Button shows "Đã nhận"

4. **Test weekly reset:**
   - Wait until Monday 00:00 UTC
   - Old week progress should remain
   - New week progress auto-created

---

## 📊 Expected Impact

- **Retention:** Học sinh quay lại mỗi ngày để complete weekly quests
- **Session duration:** Tăng 10-15 phút (để complete quests)
- **Engagement:** Mục tiêu rõ ràng → Động lực cao hơn
- **Monetization:** Có thể thêm "Skip quest" hoặc "Boost progress" (premium feature)

---

## 🔄 Future Enhancements

- Monthly quests (harder, bigger rewards)
- Seasonal quests (Tết, Halloween, Christmas)
- Class-wide quests (cả lớp cùng complete)
- Quest chains (complete A to unlock B)
