# Live Exam Database Schema

**Version:** 1.0 (MVP)  
**Date:** 2026-05-05  
**Related ADRs:** ADR-0001 (Polling), ADR-0002 (Question Order)

## Overview

Database schema for Live Exam Session feature. Designed for Cloudflare D1 (SQLite).

## Tables

### 1. `live_exam_sessions`

Stores Live Exam Session metadata and state.

```sql
CREATE TABLE live_exam_sessions (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  quiz_id TEXT NOT NULL,
  teacher_id TEXT NOT NULL,
  class_id TEXT,
  
  -- Timing
  duration INTEGER NOT NULL,        -- Duration in minutes
  scheduled_at TEXT,                -- ISO 8601 timestamp (optional)
  started_at TEXT,                  -- When exam actually started
  ends_at TEXT,                     -- Calculated: started_at + duration
  closed_at TEXT,                   -- When teacher/system closed session
  
  -- Settings (JSON)
  settings TEXT NOT NULL DEFAULT '{}',
  -- Example: {"randomizeAnswers": true, "showLeaderboard": true}
  
  -- State machine
  status TEXT NOT NULL DEFAULT 'scheduled',
  -- Values: 'scheduled' | 'waiting' | 'active' | 'scoring' | 'closed'
  
  -- Access
  access_code TEXT NOT NULL UNIQUE, -- 6-digit code (e.g., "ABC123")
  
  -- Metadata
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  
  FOREIGN KEY (quiz_id) REFERENCES quizzes(id) ON DELETE CASCADE,
  FOREIGN KEY (teacher_id) REFERENCES teachers(id) ON DELETE CASCADE,
  FOREIGN KEY (class_id) REFERENCES classes(id) ON DELETE SET NULL
);

-- Indexes for performance
CREATE INDEX idx_live_exam_sessions_access_code 
  ON live_exam_sessions(access_code);
  
CREATE INDEX idx_live_exam_sessions_status 
  ON live_exam_sessions(status);
  
CREATE INDEX idx_live_exam_sessions_teacher 
  ON live_exam_sessions(teacher_id, status);
  
CREATE INDEX idx_live_exam_sessions_class 
  ON live_exam_sessions(class_id, status);
```

### 2. `live_exam_participants`

Stores student participation and answers.

```sql
CREATE TABLE live_exam_participants (
  id TEXT PRIMARY KEY,
  live_exam_id TEXT NOT NULL,
  student_id TEXT NOT NULL,
  username TEXT NOT NULL,           -- Denormalized for display
  
  -- Timing
  joined_at TEXT NOT NULL,          -- When student joined waiting room
  started_at TEXT,                  -- When student started exam (may differ from session start)
  submitted_at TEXT,                -- When student submitted (or auto-submitted)
  
  -- Answers (JSON)
  answers TEXT,
  -- Format: {"1": "A", "2": "B", "3": "C"}
  -- Keys are question IDs (as strings)
  -- Values are selected answer options
  
  -- Results (calculated after session closes)
  score INTEGER,                    -- Total score (0-100)
  correct_count INTEGER,            -- Number of correct answers
  wrong_count INTEGER,              -- Number of wrong answers
  rank INTEGER,                     -- Rank within this session (1 = best)
  
  -- Anti-cheat tracking
  tab_switches INTEGER DEFAULT 0,   -- Number of times student switched tabs
  warnings TEXT,                    -- JSON array of warning events
  -- Example: [{"type": "tab_switch", "timestamp": "2026-05-05T10:30:00Z"}]
  
  -- Metadata
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  
  FOREIGN KEY (live_exam_id) REFERENCES live_exam_sessions(id) ON DELETE CASCADE,
  FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE,
  
  UNIQUE(live_exam_id, student_id)  -- One participation per student per session
);

-- Indexes for performance
CREATE INDEX idx_live_exam_participants_session 
  ON live_exam_participants(live_exam_id);
  
CREATE INDEX idx_live_exam_participants_student 
  ON live_exam_participants(student_id);
  
CREATE INDEX idx_live_exam_participants_rank 
  ON live_exam_participants(live_exam_id, rank);
```

### 3. `live_exam_activity` (Optional - for polling optimization)

Lightweight table for real-time status updates. Reduces need to query full participant records.

```sql
CREATE TABLE live_exam_activity (
  live_exam_id TEXT NOT NULL,
  student_id TEXT NOT NULL,
  
  -- Current state
  current_question INTEGER,         -- Which question student is on (1-based)
  answered_count INTEGER,           -- How many questions answered so far
  last_activity TEXT NOT NULL,      -- ISO 8601 timestamp of last action
  is_online BOOLEAN DEFAULT 1,      -- 0 if student hasn't polled in 10+ seconds
  
  PRIMARY KEY (live_exam_id, student_id),
  FOREIGN KEY (live_exam_id) REFERENCES live_exam_sessions(id) ON DELETE CASCADE,
  FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE
);

-- Index for teacher dashboard queries
CREATE INDEX idx_live_exam_activity_session 
  ON live_exam_activity(live_exam_id, is_online);
```

## State Machine

### Session Status Flow

```
scheduled → waiting → active → scoring → closed
    ↓          ↓         ↓         ↓
  (cancel)  (cancel)  (force    (auto)
                       close)
```

**State Transitions:**

1. **scheduled → waiting**
   - Teacher clicks "Open Session"
   - Access code generated
   - Students can join

2. **waiting → active**
   - Teacher clicks "Start Exam"
   - Timer begins
   - `started_at` and `ends_at` set

3. **active → scoring**
   - Timer expires (automatic)
   - OR teacher clicks "End Early"
   - Auto-submit all incomplete answers
   - Calculate scores

4. **scoring → closed**
   - Scores calculated (automatic, ~1-2 seconds)
   - Results revealed to students

## Query Patterns

### For Polling (Student)

```sql
-- Student polls session status every 3 seconds
SELECT 
  status,
  started_at,
  ends_at,
  (SELECT COUNT(*) FROM live_exam_participants WHERE live_exam_id = ?) as participant_count
FROM live_exam_sessions
WHERE id = ?;
```

### For Polling (Teacher)

```sql
-- Teacher polls participant list every 3 seconds
SELECT 
  p.id,
  p.username,
  p.joined_at,
  p.submitted_at,
  a.current_question,
  a.answered_count,
  a.is_online
FROM live_exam_participants p
LEFT JOIN live_exam_activity a ON p.live_exam_id = a.live_exam_id 
  AND p.student_id = a.student_id
WHERE p.live_exam_id = ?
ORDER BY p.joined_at ASC;
```

### For Leaderboard (After Close)

```sql
-- Get final rankings
SELECT 
  username,
  score,
  rank,
  correct_count,
  wrong_count,
  submitted_at
FROM live_exam_participants
WHERE live_exam_id = ?
ORDER BY rank ASC
LIMIT 10;
```

## Data Types

### Settings JSON Schema

```typescript
interface LiveExamSettings {
  randomizeAnswers: boolean;      // Shuffle answer options per student
  showLeaderboard: boolean;       // Show live leaderboard during exam
  allowLateJoin: boolean;         // Can students join after start?
  passingScore?: number;          // Optional passing threshold (0-100)
}
```

### Answers JSON Schema

```typescript
interface StudentAnswers {
  [questionId: string]: string;   // questionId → selected option
}

// Example:
{
  "1": "A",
  "2": "C",
  "3": "B"
}
```

### Warnings JSON Schema

```typescript
interface Warning {
  type: 'tab_switch' | 'fullscreen_exit' | 'suspicious_timing';
  timestamp: string;              // ISO 8601
  details?: string;
}

// Example:
[
  {
    "type": "tab_switch",
    "timestamp": "2026-05-05T10:30:15Z"
  },
  {
    "type": "suspicious_timing",
    "timestamp": "2026-05-05T10:35:00Z",
    "details": "Answered 5 questions in 10 seconds"
  }
]
```

## Migration Notes

### From Existing Schema

This schema assumes you already have:
- `quizzes` table
- `teachers` table
- `students` table
- `classes` table (optional)

### Indexes

All indexes are designed for:
- Fast access code lookup (student join)
- Fast status filtering (teacher dashboard)
- Fast polling queries (3-second intervals)

### Performance Considerations

- Use `live_exam_activity` for polling to avoid full table scans
- Cache session status in Workers KV (reduce D1 hits)
- Batch score calculations (don't calculate per student)
- Clean up old sessions periodically (status = 'closed' AND closed_at < 30 days ago)

## Future Enhancements

**Phase 2 (if needed):**
- Add `question_order` column to `live_exam_participants` for per-student randomization
- Add `live_exam_chat` table for teacher announcements
- Add `live_exam_analytics` table for detailed question-level stats
- Add `live_exam_recordings` table for session replay

---

*This schema supports the MVP as defined in CONTEXT.md and ADRs 0001-0002.*
