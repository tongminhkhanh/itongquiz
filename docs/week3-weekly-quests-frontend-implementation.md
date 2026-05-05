# Week 3: Weekly Quests - Frontend Implementation Guide

## ✅ Backend Status
- **Deployed:** Version c981a1f0-af08-4fc3-9351-b600302929dd
- **Endpoints Ready:**
  - `GET /api/game-loop/weekly-quests?username=X`
  - `POST /api/game-loop/claim-weekly-quest`
- **Progress Tracking:** Auto-updates on quiz completion

---

## 📝 Frontend Implementation Steps

### STEP 1: Add State Management

**File:** `src/components/HomePage/StudentDashboardUI.tsx`

**Location:** After line 200 (in the component state section)

```typescript
// Add weekly quests state
const [weeklyQuests, setWeeklyQuests] = useState<any[]>([]);
const [isWeeklyQuestsLoading, setIsWeeklyQuestsLoading] = useState(false);
const [weeklyQuestsError, setWeeklyQuestsError] = useState<string | null>(null);
```

---

### STEP 2: Fetch Weekly Quests

**Location:** In `useEffect` hook (around line 300-400)

```typescript
// Fetch weekly quests
useEffect(() => {
    if (!studentSession?.username) return;
    
    const fetchWeeklyQuests = async () => {
        setIsWeeklyQuestsLoading(true);
        setWeeklyQuestsError(null);
        
        try {
            const response = await fetch(
                `/api/game-loop/weekly-quests?username=${encodeURIComponent(studentSession.username)}`
            );
            
            if (!response.ok) throw new Error('Failed to fetch weekly quests');
            
            const data = await response.json();
            if (data.status === 'success' && data.quests) {
                setWeeklyQuests(data.quests);
            }
        } catch (error) {
            console.error('Error fetching weekly quests:', error);
            setWeeklyQuestsError('Không thể tải nhiệm vụ tuần');
        } finally {
            setIsWeeklyQuestsLoading(false);
        }
    };
    
    fetchWeeklyQuests();
}, [studentSession?.username]);
```

---

### STEP 3: Claim Handler

**Location:** After other handlers (around line 400-500)

```typescript
const handleClaimWeeklyQuest = async (questId: string) => {
    if (!studentSession?.username) return;
    
    try {
        const response = await fetch('/api/game-loop/claim-weekly-quest', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                username: studentSession.username,
                questId,
            }),
        });
        
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || 'Failed to claim quest');
        }
        
        const data = await response.json();
        
        if (data.status === 'success') {
            // Show success toast
            toast.success(`🎉 Nhận thưởng thành công! +${data.reward.coins} xu`);
            
            // Refresh weekly quests
            const refreshResponse = await fetch(
                `/api/game-loop/weekly-quests?username=${encodeURIComponent(studentSession.username)}`
            );
            const refreshData = await refreshResponse.json();
            if (refreshData.status === 'success') {
                setWeeklyQuests(refreshData.quests);
            }
            
            // Refresh dashboard to update coins
            if (data.data) {
                setDashboard(data.data);
            }
        }
    } catch (error: any) {
        console.error('Error claiming weekly quest:', error);
        toast.error(error.message || 'Không thể nhận thưởng');
    }
};
```

---

### STEP 4: Weekly Quests Panel Component

**Location:** After the daily missions section (around line 750-800, after the bonus chest section)

```tsx
{/* Weekly Quests Panel */}
<div className="bg-white rounded-[28px] border border-slate-100 shadow-sm p-5 md:p-6 mt-6">
    <div className="flex items-center gap-3 mb-5">
        <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-purple-500 to-indigo-500 flex items-center justify-center text-white text-xl">
            📅
        </div>
        <div>
            <h3 className="text-lg font-black text-slate-800">Nhiệm vụ tuần</h3>
            <p className="text-xs text-slate-500">Reset mỗi thứ 2</p>
        </div>
    </div>
    
    {isWeeklyQuestsLoading ? (
        <div className="flex justify-center py-10">
            <Loader2 className="w-8 h-8 text-purple-400 animate-spin" />
        </div>
    ) : weeklyQuestsError ? (
        <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
            {weeklyQuestsError}
        </div>
    ) : (
        <div className="space-y-3">
            {weeklyQuests.map((quest) => {
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
    )}
</div>
```

---

## 🎨 Styling Notes

- **Colors:** Purple/Indigo gradient (matches weekly theme)
- **Icons:** 📅 for header, quest icons from backend
- **Progress Bar:** Purple gradient, smooth animation
- **Button States:**
  - Disabled (not completed): Gray
  - Completed: Purple gradient with hover effect
  - Claimed: Gray with checkmark

---

## 🧪 Testing Checklist

### Backend Testing
- [ ] GET `/api/game-loop/weekly-quests` returns 5 quests
- [ ] Progress increments after completing quiz
- [ ] POST claim works and awards coins + items
- [ ] Weekly reset works (test on Monday)

### Frontend Testing
- [ ] Panel loads without errors
- [ ] Progress bars animate smoothly
- [ ] Claim button enables when quest completed
- [ ] Toast notification shows on claim
- [ ] Coins update in header after claim
- [ ] Panel refreshes after claim

### Edge Cases
- [ ] No quests available (new week)
- [ ] All quests completed
- [ ] Network error handling
- [ ] Multiple rapid claims (should be prevented)

---

## 📊 Expected User Flow

1. **Student logs in** → Weekly quests auto-created for current week
2. **Completes quiz** → Progress increments automatically
3. **Quest completes** → "Nhận thưởng" button enables
4. **Clicks claim** → Receives coins + items, button shows "✓ Đã nhận"
5. **Monday arrives** → New week, all quests reset to 0

---

## 🚀 Deployment Steps

1. **Add code to StudentDashboardUI.tsx** (Steps 1-4 above)
2. **Test locally:** `npm run dev`
3. **Verify API calls** in Network tab
4. **Build:** `npm run build`
5. **Deploy:** Push to production
6. **Monitor:** Check for errors in console

---

## 📝 Future Enhancements

- [ ] Add quest completion animations
- [ ] Show reward preview on hover
- [ ] Add "weekly_top_5" logic (requires leaderboard integration)
- [ ] Add "weekly_subject_master" tracking (Toán + Tiếng Việt + Tiếng Anh)
- [ ] Weekly progress chart/visualization
- [ ] Push notifications when quest completes

---

## 🔗 Related Files

- **Backend:** `workers/src/routes/gameLoop.ts`
- **Schema:** `workers/schema.sql`
- **Frontend:** `src/components/HomePage/StudentDashboardUI.tsx`
- **Types:** `src/types/gameLoop.types.ts` (may need to add WeeklyQuest type)

---

## ✅ Completion Criteria

- [x] Backend deployed and tested
- [ ] Frontend panel added
- [ ] State management implemented
- [ ] Claim handler working
- [ ] Progress tracking verified
- [ ] UI matches design
- [ ] All tests passing
- [ ] Deployed to production

---

**Last Updated:** 2026-05-04  
**Status:** Backend Complete (75%), Frontend Pending (25%)
