# Live Exam Analytics - Next Session Action Plan

**Created:** 2026-05-07  
**Current Progress:** 40% Phase 2 Complete  
**Estimated Time:** 12-14 hours remaining  
**Target:** Complete Phase 2 Frontend

---

## 📊 Current Status

### ✅ Completed (40%)
- [x] Phase 1: Backend Foundation (100%)
- [x] Task 1: Analytics Service (100%)
- [x] Task 2: Custom Hook (100%)
- [x] Task 3.1: Analytics folder created
- [x] Task 3.2: ProgressCard component

### 🔄 Remaining (60%)
- [ ] Task 3.3: ScoreDistributionCard
- [ ] Task 3.4: DifficultQuestionsCard
- [ ] Task 3.5: TimeAnalysisCard
- [ ] Task 3.6: Main Dashboard container
- [ ] Task 4: Integration & Routing
- [ ] Task 5: Testing & Polish

---

## 🎯 Next Session Goals

### Session 1: Complete UI Components (6-8 hours)

#### Step 1: Install Recharts (5 min)
```bash
npm install recharts
npm install --save-dev @types/recharts
```

#### Step 2: ScoreDistributionCard (2-3 hours)

**File:** `src/components/LiveExam/Analytics/ScoreDistributionCard.tsx`

**Implementation Checklist:**
- [ ] Import Recharts components
- [ ] Create color mapping function for score ranges
- [ ] Implement BarChart with custom colors
- [ ] Add statistics grid (4 cards: avg, median, min, max)
- [ ] Make chart responsive
- [ ] Add tooltips
- [ ] Test with different data sets

**Key Code:**
```typescript
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

const getBarColor = (range: string) => {
  const colorMap = {
    '0-2': '#ef4444',   // red
    '2-4': '#f97316',   // orange
    '4-6': '#eab308',   // yellow
    '6-8': '#3b82f6',   // blue
    '8-10': '#22c55e',  // green
  };
  return colorMap[range] || '#94a3b8';
};
```

**Testing:**
- Empty data (0 submissions)
- Single submission
- Full class (20+ students)
- All students same score
- Perfect distribution

---

#### Step 3: DifficultQuestionsCard (2 hours)

**File:** `src/components/LiveExam/Analytics/DifficultQuestionsCard.tsx`

**Implementation Checklist:**
- [ ] Create rank badge component (circular #1, #2, #3)
- [ ] Display question text with truncation
- [ ] Show incorrect percentage
- [ ] Add "Create follow-up" button (placeholder)
- [ ] Handle empty state (no difficult questions)
- [ ] Add hover effects
- [ ] Make responsive

**Key Features:**
- Top 3 ranking with visual badges
- Question preview (max 100 chars)
- Incorrect rate badge (red color)
- Action button for follow-up assignment

**Edge Cases:**
- All questions 100% correct → Show "Tất cả học sinh làm tốt!"
- Less than 3 questions → Show available questions
- Tie in correct rate → Show first 3 by question index

---

#### Step 4: TimeAnalysisCard (2 hours)

**File:** `src/components/LiveExam/Analytics/TimeAnalysisCard.tsx`

**Implementation Checklist:**
- [ ] Create table layout
- [ ] Implement time formatting function (MM:SS)
- [ ] Add status indicator logic (Normal/Slow/Very Slow)
- [ ] Color code status (green/orange/red)
- [ ] Handle null timing data (show "N/A")
- [ ] Make table responsive (horizontal scroll on mobile)
- [ ] Add sorting (optional)

**Time Status Logic:**
```typescript
const getTimeStatus = (avgTime: number | null, expectedTime = 120) => {
  if (!avgTime) return { label: 'N/A', color: 'text-slate-400' };
  if (avgTime > expectedTime * 2) return { label: '⚠️ Rất chậm', color: 'text-red-600' };
  if (avgTime > expectedTime * 1.5) return { label: '⚠️ Chậm', color: 'text-orange-600' };
  return { label: '✓ Bình thường', color: 'text-green-600' };
};
```

---

#### Step 5: Main Dashboard Container (2 hours)

**File:** `src/components/LiveExam/Analytics/LiveExamAnalyticsDashboard.tsx`

**Implementation Checklist:**
- [ ] Import all card components
- [ ] Use useLiveExamAnalytics hook
- [ ] Create loading skeleton
- [ ] Create error state with retry button
- [ ] Create empty state
- [ ] Implement 2-column grid layout
- [ ] Add header with session info
- [ ] Add refresh button
- [ ] Make responsive (stack on mobile)

**Component Structure:**
```typescript
export const LiveExamAnalyticsDashboard: React.FC<Props> = ({ sessionId }) => {
  const { analytics, isLoading, error, refetch } = useLiveExamAnalytics({ sessionId });

  if (isLoading) return <LoadingSkeleton />;
  if (error) return <ErrorState error={error} onRetry={refetch} />;
  if (!analytics) return <EmptyState />;

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 to-purple-100 p-4">
      <AnalyticsHeader session={analytics.session} onRefresh={refetch} />
      
      <div className="grid md:grid-cols-2 gap-6 mb-6">
        <ProgressCard progress={analytics.progress} />
        <ScoreDistributionCard scores={analytics.scores} />
      </div>

      <DifficultQuestionsCard 
        questions={analytics.topDifficultQuestions}
        sessionId={sessionId}
      />

      <TimeAnalysisCard questions={analytics.questions} />
    </div>
  );
};
```

**States to Implement:**
1. **Loading:** Skeleton with pulsing animation
2. **Error:** Red banner with retry button
3. **Empty:** "Chưa có dữ liệu" message
4. **Success:** Full dashboard

---

### Session 2: Integration & Routing (2-3 hours)

#### Step 1: Add Route (30 min)

**File:** `App.tsx` or routing config

```typescript
import { LiveExamAnalyticsDashboard } from './components/LiveExam/Analytics/LiveExamAnalyticsDashboard';

// Add route
<Route 
  path="/live-exam/:sessionId/analytics" 
  element={<LiveExamAnalyticsDashboard />} 
/>
```

**Testing:**
- Navigate to `/live-exam/abc123/analytics`
- Check URL params extraction
- Test back button behavior

---

#### Step 2: Add Navigation Buttons (1 hour)

**Location 1:** `ActiveExamMonitor.tsx`

```typescript
import { useNavigate } from 'react-router-dom';

const navigate = useNavigate();

<button
  onClick={() => navigate(`/live-exam/${sessionId}/analytics`)}
  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2"
>
  <BarChart3 size={18} />
  Xem Analytics
</button>
```

**Location 2:** `TeacherLiveExamDashboard.tsx` (session list)

```typescript
{session.status === 'closed' && (
  <button
    onClick={(e) => {
      e.stopPropagation();
      navigate(`/live-exam/${session.id}/analytics`);
    }}
    className="text-sm text-blue-600 hover:underline flex items-center gap-1"
  >
    <BarChart3 size={14} />
    Xem phân tích
  </button>
)}
```

**Testing:**
- Click from ActiveExamMonitor → Analytics
- Click from session list → Analytics
- Back button returns to correct page

---

#### Step 3: Add Back Button (30 min)

**In LiveExamAnalyticsDashboard:**

```typescript
import { ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

<button
  onClick={() => navigate(-1)}
  className="inline-flex items-center gap-2 px-4 py-2 bg-white text-slate-700 rounded-xl shadow hover:shadow-md mb-4"
>
  <ArrowLeft size={18} />
  Quay lại
</button>
```

---

### Session 3: Testing & Polish (2-3 hours)

#### Manual Testing Checklist

**Data Scenarios:**
- [ ] Session with 0 submissions
- [ ] Session with 1 submission
- [ ] Session with 5 submissions
- [ ] Session with 20+ submissions
- [ ] Session with all students submitted
- [ ] Session with no timing data
- [ ] Session with all questions 100% correct
- [ ] Session with all questions 0% correct

**Polling Behavior:**
- [ ] Polling starts for active session
- [ ] Polling stops for closed session
- [ ] Polling stops on unmount (no memory leak)
- [ ] Refresh button works
- [ ] Data updates after new submission

**Responsive Design:**
- [ ] Desktop (>1024px) - 2 column grid
- [ ] Tablet (768-1024px) - 1 column stack
- [ ] Mobile (<768px) - Full width, scrollable table

**Error Handling:**
- [ ] 404 session not found
- [ ] 403 forbidden (not teacher's session)
- [ ] Network error → Retry button
- [ ] Invalid session ID → Error message

**Performance:**
- [ ] Chart renders smoothly (60fps)
- [ ] No lag with 100+ students
- [ ] Images/icons load fast
- [ ] No console errors

**Accessibility:**
- [ ] Keyboard navigation works
- [ ] Tab order logical
- [ ] Focus indicators visible
- [ ] Color contrast meets WCAG AA
- [ ] Screen reader friendly (aria labels)

---

## 📦 Deliverables Checklist

### Code Files
- [ ] ScoreDistributionCard.tsx
- [ ] DifficultQuestionsCard.tsx
- [ ] TimeAnalysisCard.tsx
- [ ] LiveExamAnalyticsDashboard.tsx
- [ ] AnalyticsHeader.tsx (optional helper)
- [ ] Route added to App.tsx
- [ ] Navigation buttons added

### Testing
- [ ] All manual tests passed
- [ ] No TypeScript errors
- [ ] No console warnings
- [ ] Responsive verified on 3 screen sizes

### Documentation
- [ ] Update CONTEXT.md with analytics concepts
- [ ] Add comments to complex logic
- [ ] Update README if needed

### Git
- [ ] Commit after each component
- [ ] Push to main branch
- [ ] Clean commit messages

---

## 🐛 Common Issues & Solutions

### Issue 1: Recharts not rendering
**Symptoms:** Empty chart area, no bars visible  
**Causes:**
- Data format incorrect
- ResponsiveContainer height not set
- Missing data key

**Solutions:**
```typescript
// Ensure data format
const chartData = distribution.map(d => ({
  range: d.range,
  count: d.count,
  fill: getBarColor(d.range),
}));

// Set explicit height
<div className="h-64">
  <ResponsiveContainer width="100%" height="100%">
    <BarChart data={chartData}>
      <Bar dataKey="count" />
    </BarChart>
  </ResponsiveContainer>
</div>
```

### Issue 2: Polling causes memory leak
**Symptoms:** Console warning about setState on unmounted component  
**Solution:** Check useEffect cleanup in hook

```typescript
useEffect(() => {
  // ... polling logic
  
  return () => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  };
}, [dependencies]);
```

### Issue 3: 403 Forbidden error
**Symptoms:** Analytics fetch fails with 403  
**Causes:**
- Teacher doesn't own session
- JWT token expired
- Wrong session ID

**Solutions:**
- Verify teacher owns session in backend
- Check JWT token in localStorage
- Add better error message

### Issue 4: Chart colors not showing
**Symptoms:** All bars same color  
**Solution:** Use `fill` property in data

```typescript
const chartData = distribution.map(d => ({
  range: d.range,
  count: d.count,
  fill: getBarColor(d.range), // Important!
}));

<Bar dataKey="count" /> // Will use fill from data
```

---

## 🎯 Success Criteria

Phase 2 is complete when:

- [ ] All 6 components implemented and styled
- [ ] Analytics dashboard accessible via route
- [ ] Navigation buttons work from 2 locations
- [ ] Polling works correctly (start/stop)
- [ ] All manual tests passed
- [ ] Responsive on mobile/tablet/desktop
- [ ] No TypeScript errors
- [ ] No console errors/warnings
- [ ] Code committed and pushed
- [ ] Ready for Phase 3 (Student Timing Tracking)

---

## 📊 Time Estimates

| Task | Estimated | Actual | Notes |
|------|-----------|--------|-------|
| Install Recharts | 5 min | | |
| ScoreDistributionCard | 2-3h | | Most complex (chart) |
| DifficultQuestionsCard | 2h | | Medium complexity |
| TimeAnalysisCard | 2h | | Table layout |
| Main Dashboard | 2h | | Integration |
| Routing | 30 min | | Simple |
| Navigation buttons | 1h | | 2 locations |
| Testing | 2-3h | | Thorough |
| **Total** | **12-14h** | | 2-3 sessions |

---

## 🚀 Quick Start Commands

```bash
# Install dependencies
npm install recharts

# Create remaining components
touch src/components/LiveExam/Analytics/ScoreDistributionCard.tsx
touch src/components/LiveExam/Analytics/DifficultQuestionsCard.tsx
touch src/components/LiveExam/Analytics/TimeAnalysisCard.tsx
touch src/components/LiveExam/Analytics/LiveExamAnalyticsDashboard.tsx

# Run dev server
npm run dev

# Test in browser
# Navigate to: http://localhost:5173/live-exam/SESSION_ID/analytics
```

---

## 📝 Commit Message Template

```
feat: Add [ComponentName] for Live Exam Analytics

Task X.Y complete:
- [Feature 1]
- [Feature 2]
- [Feature 3]

Progress: X/Y components done
Next: [NextComponent]
```

---

**Ready to continue!** Start with installing Recharts and implementing ScoreDistributionCard.

**Document Version:** 1.0  
**Last Updated:** 2026-05-07  
**Status:** Ready for Next Session
