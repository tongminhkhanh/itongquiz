# Live Exam Analytics - Phase 2 Implementation Guide

**Phase:** Frontend Components & Integration  
**Duration:** 3-4 days  
**Prerequisites:** Phase 1 (Backend) completed ✅  
**Created:** 2026-05-07  
**Status:** Ready to Start

---

## 📋 Overview

Phase 2 focuses on building the frontend UI components and integrating with the backend analytics API. By the end of this phase, teachers will be able to view comprehensive analytics for their live exam sessions.

---

## 🎯 Goals

1. Create analytics service layer for API communication
2. Build custom React hook for data fetching and polling
3. Implement 5 UI components for analytics dashboard
4. Integrate analytics into existing teacher live exam flow
5. Add routing and navigation

---

## 📝 Task Breakdown

### Task 1: Create Frontend Analytics Service (1-2 hours)

**File:** `src/services/liveExamAnalyticsService.ts`

**Purpose:** Wrapper around analytics API endpoints

**Implementation:**

```typescript
/**
 * Live Exam Analytics Service
 * Frontend service for fetching and tracking analytics data
 */

import { apiCall } from './api';

export interface SessionAnalytics {
  session: {
    id: string;
    title: string;
    status: string;
    totalQuestions: number;
  };
  progress: {
    totalParticipants: number;
    submittedCount: number;
    submittedPercentage: number;
    notSubmittedStudents: Array<{
      username: string;
      joinedAt: string;
    }>;
  };
  scores: {
    distribution: Array<{
      range: string;
      count: number;
      percentage: number;
    }>;
    average: number;
    median: number;
    min: number;
    max: number;
    standardDeviation: number;
  };
  questions: Array<{
    questionIndex: number;
    questionText: string;
    correctRate: number;
    incorrectRate: number;
    avgTimeSeconds: number | null;
    minTimeSeconds: number | null;
    maxTimeSeconds: number | null;
  }>;
  topDifficultQuestions: Array<{
    questionIndex: number;
    questionText: string;
    correctRate: number;
    incorrectCount: number;
  }>;
}

/**
 * Fetch comprehensive analytics for a session
 */
export async function fetchAnalytics(sessionId: string): Promise<SessionAnalytics> {
  const response = await apiCall(`/api/live-exam/${sessionId}/analytics`, {
    method: 'GET',
  });

  if (!response.success) {
    throw new Error(response.error || 'Failed to fetch analytics');
  }

  return response.analytics;
}

/**
 * Track time spent on a question (single)
 */
export async function trackQuestionTiming(
  sessionId: string,
  questionIndex: number,
  timeSpentSeconds: number
): Promise<void> {
  await apiCall(`/api/live-exam/${sessionId}/track-timing`, {
    method: 'POST',
    body: JSON.stringify({
      questionIndex,
      timeSpentSeconds,
    }),
  });
}

/**
 * Track time spent on multiple questions (batch)
 */
export async function batchTrackQuestionTiming(
  sessionId: string,
  timings: Array<{ questionIndex: number; timeSpentSeconds: number }>
): Promise<void> {
  await apiCall(`/api/live-exam/${sessionId}/track-timing`, {
    method: 'POST',
    body: JSON.stringify({
      timings,
    }),
  });
}
```

**Testing:**
- [ ] Test fetchAnalytics with valid sessionId
- [ ] Test error handling for 404/403
- [ ] Test timing tracking functions

---

### Task 2: Create Custom Hook (2-3 hours)

**File:** `src/hooks/useLiveExamAnalytics.ts`

**Purpose:** Manage analytics data fetching, polling, and caching

**Implementation:**

```typescript
/**
 * Custom hook for Live Exam Analytics
 * Handles data fetching, polling, and caching
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { fetchAnalytics, SessionAnalytics } from '../services/liveExamAnalyticsService';

interface UseLiveExamAnalyticsOptions {
  sessionId: string;
  enabled?: boolean;
  pollingInterval?: number; // milliseconds
}

interface UseLiveExamAnalyticsReturn {
  analytics: SessionAnalytics | null;
  isLoading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

export function useLiveExamAnalytics({
  sessionId,
  enabled = true,
  pollingInterval = 5000, // 5 seconds
}: UseLiveExamAnalyticsOptions): UseLiveExamAnalyticsReturn {
  const [analytics, setAnalytics] = useState<SessionAnalytics | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const fetchData = useCallback(async () => {
    if (!enabled || !sessionId) return;

    try {
      setError(null);
      const data = await fetchAnalytics(sessionId);
      setAnalytics(data);
      setIsLoading(false);
    } catch (err: any) {
      console.error('Failed to fetch analytics:', err);
      setError(err.message || 'Failed to fetch analytics');
      setIsLoading(false);
    }
  }, [sessionId, enabled]);

  // Initial fetch
  useEffect(() => {
    if (enabled) {
      fetchData();
    }
  }, [enabled, fetchData]);

  // Polling for active sessions
  useEffect(() => {
    if (!enabled || !analytics) return;

    // Only poll if session is active (students still submitting)
    const shouldPoll = analytics.session.status === 'active' || 
                       analytics.progress.submittedCount < analytics.progress.totalParticipants;

    if (shouldPoll) {
      intervalRef.current = setInterval(fetchData, pollingInterval);
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [enabled, analytics, fetchData, pollingInterval]);

  const refetch = useCallback(async () => {
    setIsLoading(true);
    await fetchData();
  }, [fetchData]);

  return {
    analytics,
    isLoading,
    error,
    refetch,
  };
}
```

**Testing:**
- [ ] Test initial data fetch
- [ ] Test polling behavior for active sessions
- [ ] Test polling stops for closed sessions
- [ ] Test refetch function
- [ ] Test cleanup on unmount

---

### Task 3: Build UI Components (8-10 hours)

#### 3.1 Main Dashboard Container

**File:** `src/components/LiveExam/Analytics/LiveExamAnalyticsDashboard.tsx`

**Purpose:** Main container component that orchestrates all analytics cards

**Key Features:**
- Fetch analytics using custom hook
- Layout grid for cards
- Loading and error states
- Refresh button

**Implementation Outline:**
```typescript
export const LiveExamAnalyticsDashboard: React.FC<Props> = ({ sessionId }) => {
  const { analytics, isLoading, error, refetch } = useLiveExamAnalytics({ sessionId });

  if (isLoading) return <LoadingState />;
  if (error) return <ErrorState error={error} onRetry={refetch} />;
  if (!analytics) return <EmptyState />;

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 to-purple-100 p-4">
      <AnalyticsHeader 
        session={analytics.session} 
        onRefresh={refetch} 
      />
      
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

**Checklist:**
- [ ] Implement main layout
- [ ] Add loading skeleton
- [ ] Add error boundary
- [ ] Add empty state
- [ ] Add refresh functionality
- [ ] Make responsive

---

#### 3.2 Progress Card

**File:** `src/components/LiveExam/Analytics/ProgressCard.tsx`

**Purpose:** Show real-time submission progress

**Visual Elements:**
- Progress bar (0-100%)
- "X/Y students submitted" counter
- List of not-submitted students
- Color coding (green when 100%)

**Implementation:**
```typescript
export const ProgressCard: React.FC<{ progress: ProgressData }> = ({ progress }) => {
  const { totalParticipants, submittedCount, submittedPercentage, notSubmittedStudents } = progress;
  
  const isComplete = submittedCount === totalParticipants;
  const progressColor = isComplete ? 'bg-green-600' : 'bg-blue-600';

  return (
    <div className="bg-white rounded-2xl shadow-xl p-6">
      <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
        <TrendingUp size={20} />
        Tiến Độ Nộp Bài
      </h3>

      {/* Progress Bar */}
      <div className="mb-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-2xl font-bold text-slate-800">
            {submittedCount}/{totalParticipants}
          </span>
          <span className="text-sm text-slate-600">
            {Math.round(submittedPercentage)}%
          </span>
        </div>
        <div className="w-full bg-slate-200 rounded-full h-4">
          <div 
            className={`${progressColor} h-4 rounded-full transition-all duration-500`}
            style={{ width: `${submittedPercentage}%` }}
          />
        </div>
      </div>

      {/* Not Submitted List */}
      {notSubmittedStudents.length > 0 && (
        <div className="mt-4">
          <p className="text-sm font-semibold text-slate-700 mb-2">
            Chưa nộp bài ({notSubmittedStudents.length}):
          </p>
          <div className="space-y-1 max-h-40 overflow-y-auto">
            {notSubmittedStudents.map((student, index) => (
              <div key={index} className="flex items-center gap-2 text-sm text-slate-600">
                <AlertCircle size={14} className="text-orange-500" />
                <span>{student.username}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {isComplete && (
        <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-lg">
          <p className="text-sm text-green-700 font-semibold flex items-center gap-2">
            <CheckCircle size={16} />
            Tất cả học sinh đã nộp bài!
          </p>
        </div>
      )}
    </div>
  );
};
```

**Checklist:**
- [ ] Implement progress bar animation
- [ ] Add not-submitted student list
- [ ] Add completion indicator
- [ ] Style with Tailwind
- [ ] Test with different percentages

---

#### 3.3 Score Distribution Card

**File:** `src/components/LiveExam/Analytics/ScoreDistributionCard.tsx`

**Purpose:** Visualize score distribution with histogram

**Visual Elements:**
- Bar chart (using Recharts)
- Statistics summary (avg, median, min, max)
- Color-coded ranges

**Implementation:**
```typescript
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

export const ScoreDistributionCard: React.FC<{ scores: ScoresData }> = ({ scores }) => {
  const { distribution, average, median, min, max } = scores;

  // Color mapping for score ranges
  const getBarColor = (range: string) => {
    const colorMap: Record<string, string> = {
      '0-2': '#ef4444',   // red
      '2-4': '#f97316',   // orange
      '4-6': '#eab308',   // yellow
      '6-8': '#3b82f6',   // blue
      '8-10': '#22c55e',  // green
    };
    return colorMap[range] || '#94a3b8';
  };

  const chartData = distribution.map(d => ({
    range: d.range,
    count: d.count,
    fill: getBarColor(d.range),
  }));

  return (
    <div className="bg-white rounded-2xl shadow-xl p-6">
      <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
        <BarChart3 size={20} />
        Phân Bố Điểm Số
      </h3>

      {/* Chart */}
      <div className="h-64 mb-4">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="range" />
            <YAxis />
            <Tooltip />
            <Bar dataKey="count" />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Statistics */}
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-slate-50 rounded-lg p-3">
          <p className="text-xs text-slate-600">Trung bình</p>
          <p className="text-2xl font-bold text-slate-800">{average.toFixed(1)}</p>
        </div>
        <div className="bg-slate-50 rounded-lg p-3">
          <p className="text-xs text-slate-600">Trung vị</p>
          <p className="text-2xl font-bold text-slate-800">{median.toFixed(1)}</p>
        </div>
        <div className="bg-slate-50 rounded-lg p-3">
          <p className="text-xs text-slate-600">Thấp nhất</p>
          <p className="text-2xl font-bold text-red-600">{min}</p>
        </div>
        <div className="bg-slate-50 rounded-lg p-3">
          <p className="text-xs text-slate-600">Cao nhất</p>
          <p className="text-2xl font-bold text-green-600">{max}</p>
        </div>
      </div>
    </div>
  );
};
```

**Checklist:**
- [ ] Implement Recharts histogram
- [ ] Add color coding for ranges
- [ ] Display statistics grid
- [ ] Make chart responsive
- [ ] Add tooltips

---

#### 3.4 Difficult Questions Card

**File:** `src/components/LiveExam/Analytics/DifficultQuestionsCard.tsx`

**Purpose:** Highlight top 3 most difficult questions

**Visual Elements:**
- Top 3 list with ranking
- Question text preview
- Correct rate badge
- "Create follow-up assignment" button

**Implementation:**
```typescript
export const DifficultQuestionsCard: React.FC<Props> = ({ questions, sessionId }) => {
  const handleCreateFollowUp = (questionIndex: number) => {
    // TODO: Navigate to assignment creation with pre-filled question
    console.log('Create follow-up for question', questionIndex);
  };

  if (questions.length === 0) {
    return (
      <div className="bg-white rounded-2xl shadow-xl p-6">
        <h3 className="text-lg font-bold text-slate-800 mb-4">
          ⚠️ Câu Hỏi Khó Nhất
        </h3>
        <p className="text-slate-600">Chưa có dữ liệu để phân tích.</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl shadow-xl p-6 mb-6">
      <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
        <AlertTriangle size={20} className="text-orange-500" />
        Top 3 Câu Hỏi Khó Nhất
      </h3>

      <div className="space-y-4">
        {questions.map((q, index) => (
          <div 
            key={q.questionIndex}
            className="border border-slate-200 rounded-xl p-4 hover:border-orange-300 transition-colors"
          >
            <div className="flex items-start gap-4">
              {/* Rank Badge */}
              <div className="flex-shrink-0 w-10 h-10 rounded-full bg-orange-100 text-orange-600 font-bold flex items-center justify-center">
                #{index + 1}
              </div>

              {/* Question Info */}
              <div className="flex-1">
                <p className="font-semibold text-slate-800 mb-2">
                  Câu {q.questionIndex + 1}: {q.questionText}
                </p>
                
                <div className="flex items-center gap-4 text-sm">
                  <span className="inline-flex items-center gap-1 text-red-600">
                    <XCircle size={14} />
                    {Math.round((1 - q.correctRate) * 100)}% sai
                  </span>
                  <span className="text-slate-600">
                    {q.incorrectCount} học sinh
                  </span>
                </div>
              </div>

              {/* Actions */}
              <button
                onClick={() => handleCreateFollowUp(q.questionIndex)}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-semibold whitespace-nowrap"
              >
                Tạo Bài Tập Bổ Sung
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
```

**Checklist:**
- [ ] Implement top 3 list
- [ ] Add question preview
- [ ] Add correct rate badge
- [ ] Add follow-up button (placeholder)
- [ ] Style with hover effects

---

#### 3.5 Time Analysis Card

**File:** `src/components/LiveExam/Analytics/TimeAnalysisCard.tsx`

**Purpose:** Show time spent per question

**Visual Elements:**
- Table with question list
- Avg/Min/Max time columns
- Status indicator (Normal/Slow)

**Implementation:**
```typescript
export const TimeAnalysisCard: React.FC<{ questions: QuestionData[] }> = ({ questions }) => {
  const formatTime = (seconds: number | null) => {
    if (seconds === null) return 'N/A';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}m ${secs}s`;
  };

  const getTimeStatus = (avgTime: number | null, expectedTime: number = 120) => {
    if (!avgTime) return { label: 'N/A', color: 'text-slate-400' };
    if (avgTime > expectedTime * 2) return { label: '⚠️ Rất chậm', color: 'text-red-600' };
    if (avgTime > expectedTime * 1.5) return { label: '⚠️ Chậm', color: 'text-orange-600' };
    return { label: '✓ Bình thường', color: 'text-green-600' };
  };

  return (
    <div className="bg-white rounded-2xl shadow-xl p-6">
      <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
        <Clock size={20} />
        Phân Tích Thời Gian
      </h3>

      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-slate-200">
              <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">Câu hỏi</th>
              <th className="text-right py-3 px-4 text-sm font-semibold text-slate-700">TB</th>
              <th className="text-right py-3 px-4 text-sm font-semibold text-slate-700">Min</th>
              <th className="text-right py-3 px-4 text-sm font-semibold text-slate-700">Max</th>
              <th className="text-right py-3 px-4 text-sm font-semibold text-slate-700">Trạng thái</th>
            </tr>
          </thead>
          <tbody>
            {questions.map((q) => {
              const status = getTimeStatus(q.avgTimeSeconds);
              return (
                <tr key={q.questionIndex} className="border-b border-slate-100 hover:bg-slate-50">
                  <td className="py-3 px-4 text-sm text-slate-800">
                    Câu {q.questionIndex + 1}
                  </td>
                  <td className="py-3 px-4 text-sm text-slate-600 text-right">
                    {formatTime(q.avgTimeSeconds)}
                  </td>
                  <td className="py-3 px-4 text-sm text-slate-600 text-right">
                    {formatTime(q.minTimeSeconds)}
                  </td>
                  <td className="py-3 px-4 text-sm text-slate-600 text-right">
                    {formatTime(q.maxTimeSeconds)}
                  </td>
                  <td className={`py-3 px-4 text-sm text-right font-semibold ${status.color}`}>
                    {status.label}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};
```

**Checklist:**
- [ ] Implement table layout
- [ ] Add time formatting
- [ ] Add status indicators
- [ ] Make table responsive
- [ ] Add sorting (optional)

---

### Task 4: Integration & Routing (2-3 hours)

#### 4.1 Add Route

**File:** `App.tsx` or routing config

**Add route:**
```typescript
<Route 
  path="/live-exam/:sessionId/analytics" 
  element={<LiveExamAnalyticsDashboard />} 
/>
```

#### 4.2 Add Navigation Buttons

**In `ActiveExamMonitor.tsx`:**
```typescript
<button
  onClick={() => navigate(`/live-exam/${sessionId}/analytics`)}
  className="px-4 py-2 bg-blue-600 text-white rounded-lg"
>
  📊 Xem Analytics
</button>
```

**In `TeacherLiveExamDashboard.tsx` (session list):**
```typescript
{session.status === 'closed' && (
  <button
    onClick={() => navigate(`/live-exam/${session.id}/analytics`)}
    className="text-sm text-blue-600 hover:underline"
  >
    Xem phân tích
  </button>
)}
```

**Checklist:**
- [ ] Add route to App.tsx
- [ ] Add button in ActiveExamMonitor
- [ ] Add button in session list
- [ ] Test navigation flow

---

### Task 5: Testing & Polish (2-3 hours)

#### 5.1 Manual Testing Checklist

- [ ] Test with session có 0 submissions
- [ ] Test with session có 1-5 submissions
- [ ] Test with session có 20+ submissions
- [ ] Test polling behavior (active session)
- [ ] Test no polling (closed session)
- [ ] Test refresh button
- [ ] Test responsive design (mobile/tablet/desktop)
- [ ] Test loading states
- [ ] Test error states
- [ ] Test empty states

#### 5.2 Edge Cases

- [ ] Session không tồn tại → 404 error
- [ ] Teacher không own session → 403 error
- [ ] Network error → Retry mechanism
- [ ] No timing data → Show "N/A"
- [ ] All students got 100% → No difficult questions

#### 5.3 Performance

- [ ] Chart renders smoothly (60fps)
- [ ] Polling doesn't cause memory leaks
- [ ] Large datasets (100+ students) render OK
- [ ] Images/icons optimized

#### 5.4 Accessibility

- [ ] Keyboard navigation works
- [ ] Screen reader friendly
- [ ] Color contrast meets WCAG AA
- [ ] Focus indicators visible

---

## 📦 File Structure Summary

```
src/
├── services/
│   └── liveExamAnalyticsService.ts          [NEW]
├── hooks/
│   └── useLiveExamAnalytics.ts              [NEW]
└── components/
    └── LiveExam/
        └── Analytics/                        [NEW FOLDER]
            ├── LiveExamAnalyticsDashboard.tsx
            ├── AnalyticsHeader.tsx
            ├── ProgressCard.tsx
            ├── ScoreDistributionCard.tsx
            ├── DifficultQuestionsCard.tsx
            └── TimeAnalysisCard.tsx
```

---

## 🚀 Getting Started

### Step 1: Run Migration (REQUIRED)
```bash
cd workers
npx wrangler d1 execute itongquiz-db --remote --file migrations/0018_add_live_exam_analytics.sql
```

### Step 2: Create Service Layer
```bash
# Create file
touch src/services/liveExamAnalyticsService.ts

# Implement functions from Task 1
```

### Step 3: Create Custom Hook
```bash
# Create file
touch src/hooks/useLiveExamAnalytics.ts

# Implement hook from Task 2
```

### Step 4: Create Components Folder
```bash
mkdir -p src/components/LiveExam/Analytics
cd src/components/LiveExam/Analytics

# Create all component files
touch LiveExamAnalyticsDashboard.tsx
touch AnalyticsHeader.tsx
touch ProgressCard.tsx
touch ScoreDistributionCard.tsx
touch DifficultQuestionsCard.tsx
touch TimeAnalysisCard.tsx
```

### Step 5: Implement Components
Follow Task 3 implementation guides for each component.

### Step 6: Add Routing
Update App.tsx with new route.

### Step 7: Test
Follow Task 5 testing checklist.

---

## ✅ Definition of Done

Phase 2 is complete when:

- [ ] All 6 components implemented and styled
- [ ] Analytics service and hook working
- [ ] Routing integrated
- [ ] Manual testing passed
- [ ] Responsive design verified
- [ ] No console errors
- [ ] Code committed to git
- [ ] Ready for Phase 3 (Student Timing)

---

## 🐛 Common Issues & Solutions

### Issue 1: "Failed to fetch analytics"
**Cause:** Migration not run or API endpoint not deployed  
**Solution:** Run migration, redeploy worker

### Issue 2: Polling causes memory leak
**Cause:** Interval not cleaned up on unmount  
**Solution:** Check useEffect cleanup in hook

### Issue 3: Chart not rendering
**Cause:** Recharts not installed or data format wrong  
**Solution:** `npm install recharts`, check data structure

### Issue 4: 403 Forbidden
**Cause:** Teacher doesn't own session  
**Solution:** Check JWT token, verify session ownership

---

## 📊 Progress Tracking

Use this checklist to track your progress:

### Day 1
- [ ] Task 1: Analytics Service (2h)
- [ ] Task 2: Custom Hook (3h)
- [ ] Task 3.1: Main Dashboard (2h)

### Day 2
- [ ] Task 3.2: Progress Card (2h)
- [ ] Task 3.3: Score Distribution Card (3h)
- [ ] Task 3.4: Difficult Questions Card (2h)

### Day 3
- [ ] Task 3.5: Time Analysis Card (2h)
- [ ] Task 4: Integration & Routing (3h)

### Day 4
- [ ] Task 5: Testing & Polish (3h)
- [ ] Final review and commit

---

## 🎯 Success Metrics

After Phase 2 completion:

- Teachers can view analytics for any session they own
- Analytics update in real-time for active sessions
- All 4 analytics cards display correctly
- UI is responsive and accessible
- No performance issues with 50+ students

---

**Next Phase:** Phase 3 - Student Timing Tracking (1-2 days)

**Document Version:** 1.0  
**Last Updated:** 2026-05-07  
**Author:** Development Team
