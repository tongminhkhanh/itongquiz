# Live Exam Analytics Dashboard - Design Specification

**Feature:** Real-time Analytics Dashboard for Live Exam Sessions  
**Priority:** P0 (High Impact, Low Effort)  
**Target Users:** Teachers  
**Created:** 2026-05-07  
**Status:** Design Phase

---

## 1. Executive Summary

### Problem Statement
Giáo viên hiện tại không có insight về performance của học sinh trong live exam sessions. Sau khi session kết thúc, giáo viên chỉ thấy danh sách điểm số thô mà không có:
- Visualization về phân bố điểm
- Thông tin về câu hỏi nào khó nhất
- Thời gian trung bình học sinh dành cho mỗi câu
- Progress tracking trong khi exam đang diễn ra

### Solution Overview
Xây dựng Analytics Dashboard hiển thị real-time và post-exam insights, giúp giáo viên:
1. Monitor exam progress trong lúc đang thi
2. Identify câu hỏi khó cần review lại
3. Understand performance distribution của cả lớp
4. Make data-driven decisions cho teaching strategy

### Success Metrics
- 80% teachers sử dụng analytics dashboard sau mỗi live exam
- Giảm 50% thời gian giáo viên phải manually analyze results
- Tăng 30% số lượng follow-up assignments dựa trên analytics insights

---

## 2. User Stories

### US-1: Monitor Exam Progress (Real-time)
**As a** teacher  
**I want to** see how many students have submitted their exam in real-time  
**So that** I know when it's safe to close the session

**Acceptance Criteria:**
- [ ] Dashboard shows "X/Y students submitted" counter
- [ ] Counter updates every 3 seconds (polling interval)
- [ ] Visual progress bar (0-100%)
- [ ] List of students who haven't submitted yet (with warning icon)

### US-2: View Score Distribution
**As a** teacher  
**I want to** see a histogram of score distribution  
**So that** I can understand overall class performance

**Acceptance Criteria:**
- [ ] Histogram with score ranges (0-2, 2-4, 4-6, 6-8, 8-10)
- [ ] Show count of students in each range
- [ ] Highlight average score line
- [ ] Show median score
- [ ] Color coding: red (low), yellow (medium), green (high)

### US-3: Identify Difficult Questions
**As a** teacher  
**I want to** see which questions students struggled with most  
**So that** I can review those topics in next class

**Acceptance Criteria:**
- [ ] List top 3 questions with lowest correct rate
- [ ] Show question text preview
- [ ] Show % students who got it wrong
- [ ] Link to full question details
- [ ] Suggest "Create follow-up assignment" action

### US-4: Analyze Time Spent
**As a** teacher  
**I want to** see average time students spent per question  
**So that** I can identify if questions are too long/complex

**Acceptance Criteria:**
- [ ] Table showing each question with avg time
- [ ] Highlight questions that took > 2x expected time
- [ ] Show min/max time for outlier detection
- [ ] Compare with recommended time per question

---

## 3. Technical Architecture

### 3.1 Data Model Extensions

#### New Table: `live_exam_question_analytics`
```sql
CREATE TABLE live_exam_question_analytics (
  id TEXT PRIMARY KEY,
  session_id TEXT NOT NULL,
  question_id TEXT NOT NULL,
  question_index INTEGER NOT NULL,
  total_attempts INTEGER NOT NULL DEFAULT 0,
  correct_count INTEGER NOT NULL DEFAULT 0,
  incorrect_count INTEGER NOT NULL DEFAULT 0,
  avg_time_seconds REAL,
  min_time_seconds REAL,
  max_time_seconds REAL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (session_id) REFERENCES live_exam_sessions(id) ON DELETE CASCADE
);

CREATE INDEX idx_live_exam_qa_session ON live_exam_question_analytics(session_id);
```

#### New Table: `live_exam_student_timing`
```sql
CREATE TABLE live_exam_student_timing (
  id TEXT PRIMARY KEY,
  session_id TEXT NOT NULL,
  participant_id TEXT NOT NULL,
  question_index INTEGER NOT NULL,
  time_spent_seconds REAL NOT NULL,
  created_at TEXT NOT NULL,
  FOREIGN KEY (session_id) REFERENCES live_exam_sessions(id) ON DELETE CASCADE,
  FOREIGN KEY (participant_id) REFERENCES live_exam_participants(id) ON DELETE CASCADE
);

CREATE INDEX idx_live_exam_timing_session ON live_exam_student_timing(session_id);
CREATE INDEX idx_live_exam_timing_participant ON live_exam_student_timing(participant_id);
```

### 3.2 API Endpoints

#### GET `/api/live-exam/:sessionId/analytics`
**Purpose:** Fetch comprehensive analytics for a session

**Response:**
```typescript
{
  session: {
    id: string;
    title: string;
    status: LiveExamStatus;
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
      range: string; // "0-2", "2-4", etc.
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
    avgTimeSeconds: number;
    minTimeSeconds: number;
    maxTimeSeconds: number;
  }>;
  topDifficultQuestions: Array<{
    questionIndex: number;
    questionText: string;
    correctRate: number;
    incorrectCount: number;
  }>;
}
```

**Authorization:** Teacher who created the session

#### POST `/api/live-exam/:sessionId/track-timing`
**Purpose:** Track time spent on each question (called from student frontend)

**Request Body:**
```typescript
{
  participantId: string;
  questionIndex: number;
  timeSpentSeconds: number;
}
```

**Response:** `{ success: true }`

### 3.3 Frontend Components

#### Component Tree
```
<LiveExamAnalyticsDashboard>
  ├── <AnalyticsHeader>
  │   ├── Session title
  │   ├── Status badge
  │   └── Refresh button
  │
  ├── <ProgressCard> (Real-time)
  │   ├── Progress bar
  │   ├── "X/Y submitted" counter
  │   └── Not submitted list
  │
  ├── <ScoreDistributionCard>
  │   ├── Histogram chart (Recharts)
  │   ├── Stats summary (avg, median)
  │   └── Color-coded ranges
  │
  ├── <DifficultQuestionsCard>
  │   ├── Top 3 list
  │   ├── Question preview
  │   ├── Correct rate badge
  │   └── "Create follow-up" button
  │
  └── <TimeAnalysisCard>
      ├── Question time table
      ├── Avg time column
      └── Outlier highlights
```

#### File Structure
```
src/components/LiveExam/Analytics/
├── LiveExamAnalyticsDashboard.tsx
├── AnalyticsHeader.tsx
├── ProgressCard.tsx
├── ScoreDistributionCard.tsx
├── DifficultQuestionsCard.tsx
└── TimeAnalysisCard.tsx

src/hooks/
└── useLiveExamAnalytics.ts

src/services/
└── liveExamAnalyticsService.ts
```

---

## 4. UI/UX Design

### 4.1 Layout Wireframe

```
┌─────────────────────────────────────────────────────────────┐
│  ← Back to Dashboard    [Live Exam Analytics]    🔄 Refresh │
│                                                               │
│  📊 Toán Học Lớp 5 - Phân Số                                │
│  Status: Closed  •  Duration: 30 min  •  Questions: 10      │
└─────────────────────────────────────────────────────────────┘

┌──────────────────────────┐  ┌──────────────────────────────┐
│  📈 Exam Progress        │  │  📊 Score Distribution       │
│                          │  │                              │
│  ████████████░░░░  85%   │  │      ┌─┐                    │
│                          │  │      │ │  ┌─┐               │
│  17/20 students submitted│  │  ┌─┐ │ │  │ │  ┌─┐         │
│                          │  │  │ │ │ │  │ │  │ │  ┌─┐    │
│  Not submitted:          │  │  └─┘ └─┘  └─┘  └─┘  └─┘    │
│  • Nguyễn Văn A          │  │  0-2 2-4  4-6  6-8  8-10     │
│  • Trần Thị B            │  │                              │
│  • Lê Văn C              │  │  Average: 6.8  Median: 7.0   │
└──────────────────────────┘  └──────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│  ⚠️ Top 3 Difficult Questions                               │
│                                                               │
│  1. Question 5: "Tính 2/3 + 3/4 = ?"                        │
│     ❌ 65% incorrect  •  ⏱️ Avg time: 2m 15s                │
│     [View Details] [Create Follow-up Assignment]            │
│                                                               │
│  2. Question 8: "Rút gọn phân số 12/18"                     │
│     ❌ 55% incorrect  •  ⏱️ Avg time: 1m 45s                │
│     [View Details] [Create Follow-up Assignment]            │
│                                                               │
│  3. Question 3: "So sánh 3/5 và 4/7"                        │
│     ❌ 50% incorrect  •  ⏱️ Avg time: 2m 30s                │
│     [View Details] [Create Follow-up Assignment]            │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│  ⏱️ Time Analysis                                            │
│                                                               │
│  Question  │  Avg Time  │  Min  │  Max  │  Status           │
│  ─────────────────────────────────────────────────────────  │
│  Q1        │  1m 20s    │  45s  │  3m   │  ✓ Normal         │
│  Q2        │  1m 45s    │  1m   │  4m   │  ✓ Normal         │
│  Q3        │  2m 30s    │  1m   │  5m   │  ⚠️ Slow          │
│  Q4        │  1m 10s    │  30s  │  2m   │  ✓ Normal         │
│  Q5        │  2m 15s    │  1m   │  6m   │  ⚠️ Slow          │
│  ...                                                          │
└─────────────────────────────────────────────────────────────┘
```

### 4.2 Color Palette

**Score Distribution:**
- 0-2: `bg-red-100 text-red-700` (Yếu)
- 2-4: `bg-orange-100 text-orange-700` (Trung bình yếu)
- 4-6: `bg-yellow-100 text-yellow-700` (Trung bình)
- 6-8: `bg-blue-100 text-blue-700` (Khá)
- 8-10: `bg-green-100 text-green-700` (Giỏi)

**Status Indicators:**
- Normal time: `text-green-600`
- Slow (>2x expected): `text-orange-600`
- Very slow (>3x): `text-red-600`

### 4.3 Responsive Design

**Desktop (>1024px):**
- 2-column grid for cards
- Full histogram chart
- Expanded question list

**Tablet (768-1024px):**
- 1-column stack
- Compact histogram
- Collapsed question details

**Mobile (<768px):**
- Single column
- Simplified charts
- Accordion for question list

---

## 5. Implementation Plan

### Phase 1: Backend Foundation (2-3 days)
**Goal:** Set up data collection and analytics API

**Tasks:**
1. Create migration `0018_add_live_exam_analytics.sql`
   - Add `live_exam_question_analytics` table
   - Add `live_exam_student_timing` table
   - Add indexes

2. Implement analytics service
   - File: `workers/src/services/liveExamAnalyticsService.ts`
   - Functions:
     - `calculateSessionAnalytics(sessionId)`
     - `trackQuestionTiming(participantId, questionIndex, timeSpent)`
     - `getQuestionAnalytics(sessionId)`
     - `getScoreDistribution(sessionId)`

3. Create API routes
   - `GET /api/live-exam/:sessionId/analytics`
   - `POST /api/live-exam/:sessionId/track-timing`

4. Write tests
   - Unit tests for analytics calculations
   - Integration tests for API endpoints

**Deliverables:**
- [ ] Migration file
- [ ] Analytics service with tests
- [ ] API endpoints with auth
- [ ] Postman collection for testing

### Phase 2: Frontend Components (3-4 days)
**Goal:** Build UI components and integrate with backend

**Tasks:**
1. Create analytics service
   - File: `src/services/liveExamAnalyticsService.ts`
   - Functions:
     - `fetchAnalytics(sessionId)`
     - `trackQuestionTiming(sessionId, participantId, questionIndex, time)`

2. Create custom hook
   - File: `src/hooks/useLiveExamAnalytics.ts`
   - Polling every 5 seconds when session is active
   - Cache analytics data

3. Build components
   - `LiveExamAnalyticsDashboard.tsx` (main container)
   - `ProgressCard.tsx` (real-time progress)
   - `ScoreDistributionCard.tsx` (histogram)
   - `DifficultQuestionsCard.tsx` (top 3 list)
   - `TimeAnalysisCard.tsx` (time table)

4. Integrate with existing flow
   - Add "View Analytics" button in `ActiveExamMonitor`
   - Add "View Analytics" button in session list (for closed sessions)
   - Route: `/live-exam/:sessionId/analytics`

**Deliverables:**
- [ ] Analytics service
- [ ] Custom hook with polling
- [ ] All UI components
- [ ] Integration with existing pages
- [ ] Component tests

### Phase 3: Student Timing Tracking (1-2 days)
**Goal:** Collect time data from student side

**Tasks:**
1. Add timing tracker to `LiveExamQuiz.tsx`
   - Track time when question is displayed
   - Send timing data when moving to next question
   - Batch send on submit

2. Handle edge cases
   - Browser refresh → resume timer
   - Tab switch → pause timer (optional)
   - Auto-submit → send remaining timings

**Deliverables:**
- [ ] Timing tracker in student quiz
- [ ] Batch timing submission
- [ ] Edge case handling

### Phase 4: Polish & Testing (2 days)
**Goal:** Refine UX and ensure quality

**Tasks:**
1. Add loading states
2. Add error handling
3. Add empty states (no data yet)
4. Responsive design testing
5. Cross-browser testing
6. Performance optimization (chart rendering)
7. Accessibility audit

**Deliverables:**
- [ ] Polished UI with all states
- [ ] Responsive on all devices
- [ ] Performance benchmarks
- [ ] Accessibility compliance

### Phase 5: Documentation & Rollout (1 day)
**Goal:** Document and deploy

**Tasks:**
1. Update `CONTEXT.md` with analytics concepts
2. Create user guide for teachers
3. Add analytics to teacher onboarding
4. Deploy to production
5. Monitor usage metrics

**Deliverables:**
- [ ] Documentation
- [ ] User guide
- [ ] Production deployment
- [ ] Usage dashboard

---

## 6. Technical Considerations

### 6.1 Performance

**Challenge:** Real-time analytics calculation can be expensive

**Solutions:**
1. **Caching Strategy:**
   - Cache analytics for closed sessions (immutable)
   - Cache for 30 seconds for active sessions
   - Invalidate on new submission

2. **Incremental Calculation:**
   - Update analytics incrementally on each submission
   - Don't recalculate from scratch every time

3. **Database Optimization:**
   - Use indexes on `session_id`
   - Denormalize analytics data in `live_exam_question_analytics`

### 6.2 Data Privacy

**Concern:** Student timing data could be sensitive

**Mitigations:**
1. Only show aggregated data (avg, min, max)
2. Don't show individual student timing to other students
3. Teachers can only see analytics for their own sessions
4. Add privacy notice in student UI

### 6.3 Scalability

**Scenario:** 100 students × 20 questions = 2000 timing records per session

**Approach:**
1. Batch insert timing records
2. Use prepared statements
3. Archive old analytics after 6 months
4. Consider moving to separate analytics database if needed

---

## 7. Success Criteria

### Functional Requirements
- [ ] Real-time progress tracking works during active exam
- [ ] Score distribution histogram renders correctly
- [ ] Top 3 difficult questions identified accurately
- [ ] Time analysis shows avg/min/max per question
- [ ] All data updates within 5 seconds of submission

### Non-Functional Requirements
- [ ] Analytics page loads in < 2 seconds
- [ ] Charts render smoothly (60fps)
- [ ] Works on mobile devices
- [ ] Accessible (WCAG 2.1 AA)
- [ ] No performance impact on student quiz experience

### User Acceptance
- [ ] 5 teachers test and provide feedback
- [ ] 80% find analytics "useful" or "very useful"
- [ ] No critical bugs reported
- [ ] Teachers can explain insights to students

---

## 8. Future Enhancements (Out of Scope for V1)

### V2 Features
1. **Export Analytics:**
   - Download as PDF report
   - Export to Excel for further analysis

2. **Historical Comparison:**
   - Compare current session with previous sessions
   - Track improvement over time

3. **Student-Level Drill-down:**
   - Click on score range → see which students
   - Individual student performance report

4. **Predictive Analytics:**
   - Predict which students might fail next exam
   - Recommend intervention strategies

5. **Real-time Alerts:**
   - Notify teacher if >50% students fail a question
   - Alert if average time is too high

---

## 9. Dependencies

### External Libraries
- `recharts` (already in project) - For histogram chart
- No new dependencies needed

### Internal Dependencies
- Live Exam system (already implemented)
- JWT authentication (already implemented)
- Polling infrastructure (already implemented)

### Blockers
- None identified

---

## 10. Risks & Mitigations

| Risk | Impact | Probability | Mitigation |
|------|--------|-------------|------------|
| Performance degradation on large sessions | High | Medium | Implement caching, incremental updates |
| Timing data inaccurate due to tab switching | Medium | High | Add visibility API tracking, document limitations |
| Teachers don't understand analytics | High | Low | Add tooltips, user guide, onboarding |
| Database storage grows too fast | Medium | Low | Archive old data, add retention policy |

---

## 11. Rollout Plan

### Week 1: Internal Testing
- Deploy to staging
- 3 teachers test with real classes
- Collect feedback

### Week 2: Beta Release
- Deploy to production with feature flag
- Invite 10 teachers to beta test
- Monitor usage and errors

### Week 3: General Availability
- Enable for all teachers
- Announce in teacher dashboard
- Provide user guide

### Week 4: Iteration
- Analyze usage metrics
- Fix reported issues
- Plan V2 features

---

## 12. Appendix

### A. Sample Analytics Calculation

**Input:**
- Session with 20 students, 10 questions
- 17 students submitted, 3 pending

**Score Distribution Calculation:**
```typescript
const scores = submissions.map(s => s.score);
const distribution = {
  '0-2': scores.filter(s => s >= 0 && s < 2).length,
  '2-4': scores.filter(s => s >= 2 && s < 4).length,
  '4-6': scores.filter(s => s >= 4 && s < 6).length,
  '6-8': scores.filter(s => s >= 6 && s < 8).length,
  '8-10': scores.filter(s => s >= 8 && s <= 10).length,
};
```

**Difficult Questions Calculation:**
```typescript
const questionStats = questions.map((q, index) => {
  const attempts = submissions.map(s => s.answers[index]);
  const correctCount = attempts.filter(a => a.isCorrect).length;
  const correctRate = correctCount / attempts.length;
  return { questionIndex: index, correctRate, incorrectCount: attempts.length - correctCount };
});

const topDifficult = questionStats
  .sort((a, b) => a.correctRate - b.correctRate)
  .slice(0, 3);
```

### B. Database Query Examples

**Get Score Distribution:**
```sql
SELECT 
  CASE 
    WHEN score >= 0 AND score < 2 THEN '0-2'
    WHEN score >= 2 AND score < 4 THEN '2-4'
    WHEN score >= 4 AND score < 6 THEN '4-6'
    WHEN score >= 6 AND score < 8 THEN '6-8'
    WHEN score >= 8 AND score <= 10 THEN '8-10'
  END as range,
  COUNT(*) as count
FROM live_exam_submissions
WHERE session_id = ?
GROUP BY range;
```

**Get Question Analytics:**
```sql
SELECT 
  question_index,
  AVG(time_spent_seconds) as avg_time,
  MIN(time_spent_seconds) as min_time,
  MAX(time_spent_seconds) as max_time
FROM live_exam_student_timing
WHERE session_id = ?
GROUP BY question_index
ORDER BY question_index;
```

---

**Document Version:** 1.0  
**Last Updated:** 2026-05-07  
**Next Review:** After Phase 1 completion
