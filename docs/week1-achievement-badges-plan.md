# Week 1: Achievement Badges Implementation Plan

**Timeline:** 3-4 ngày  
**Priority:** ⭐⭐⭐⭐⭐ (Highest)  
**Estimated Impact:** DAU +15%, Engagement +20%

---

## 📋 Overview

Mở rộng achievement system từ 3 badges mẫu → 20+ badges đa dạng để tăng động lực học.

---

## 🎯 Goals

1. Thêm 20+ achievement definitions
2. Implement auto-check logic sau mỗi quiz
3. Badge unlock animation
4. Badge gallery UI
5. Progress tracking

---

## 📁 Files to Modify

### Backend Files
- `workers/src/routes/gameLoop.ts` - Thêm achievements, check logic
- `workers/src/types.ts` - Thêm type definitions (nếu cần)

### Frontend Files
- `src/types/gameLoop.types.ts` - Update types
- `src/components/HomePage/StudentDashboardUI.tsx` - Badge gallery
- `src/stores/useGameLoopStore.ts` - Badge state management

---

## 🔧 Implementation Details

### STEP 1: Backend - Achievement Definitions (Day 1)

**File:** `workers/src/routes/gameLoop.ts`

**Location:** Sau dòng 86 (sau `const ACHIEVEMENTS = [`)

**Action:** Thay thế toàn bộ ACHIEVEMENTS array bằng:

```typescript
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
] as const;
```

**Why these achievements?**
- Đa dạng categories (streak, subject, speed, perfect, time, collection, total)
- Có progression (50 → 100 → 1000)
- Có 3 rarity levels (common, rare, epic)
- Phù hợp với học sinh Tiểu học

---

## ✅ Checklist

- [ ] Day 1: Backend - Achievement definitions
- [ ] Day 2: Backend - Check logic & testing
- [ ] Day 3: Frontend - Badge gallery UI
- [ ] Day 4: Frontend - Animations & polish
