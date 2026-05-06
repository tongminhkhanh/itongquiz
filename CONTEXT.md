# iTongQuiz - Domain Context

## Core Concepts

### Quiz System

- **Quiz** - A collection of questions that can be taken by students. Reusable across multiple contexts.
- **Assignment** - A Quiz assigned by a teacher to students with a deadline. Students can take it anytime before the deadline. Scores are shown immediately upon submission.
- **Live Exam Session** - A synchronized exam where all students must participate at the same time. Scores are hidden until the teacher closes the session (anti-cheating measure).
- **Weekly Quest** - Recurring challenges that reset every Monday. Part of the gamification system.

### Live Exam Session States

A Live Exam Session progresses through these states:

1. **Scheduled** - Created but not started yet
2. **Waiting** - Teacher has opened the session, students are joining
3. **Active** - Exam is in progress, timer is running
4. **Scoring** - Time expired, calculating scores (automatic)
5. **Closed** - Results revealed to students

### Key Differences: Assignment vs Live Exam

| Aspect | Assignment | Live Exam Session |
|--------|-----------|-------------------|
| **Timing** | Anytime before deadline | Synchronized, all at once |
| **Scoring** | Immediate on submit | Delayed until session closes |
| **Retakes** | Allowed (maxAttempts) | Not allowed (one shot) |
| **Review** | Can review answers | Cannot review (anti-cheat) |
| **Use Case** | Homework, practice | Official tests, assessments |

### Live Exam Flow

**Teacher Flow:**
1. Create Live Exam (select Quiz, set duration)
2. Open session → generates access code
3. Students join → waiting room
4. Teacher starts exam → timer begins
5. Time expires → auto-close → scores calculated
6. Results revealed to students

**Student Flow:**
1. Enter access code → join session
2. Wait in waiting room (see other students joining)
3. Exam starts → answer questions
4. Submit answers (or auto-submit on timeout)
5. Wait in results room (scores hidden)
6. Session closes → see final score and rank

### Anti-Cheating Design

**Delayed Scoring Rationale:**
- Scores are NOT shown immediately after submission
- Students wait together in a "results room"
- Prevents students from sharing answers with others still taking the exam
- All scores revealed simultaneously when session closes

**Auto-Submit on Timeout:**
- If student hasn't submitted when time expires, their current answers are auto-submitted
- Ensures all students finish at the same time
- No extensions or special cases

## Modules

- **Frontend** - React 19 + Vite + TypeScript
- **Backend** - Cloudflare Workers (serverless)
- **Database** - Cloudflare D1 (SQLite)
- **Auth** - JWT-based authentication
- **Real-time** - HTTP Polling (3-second intervals) - See ADR-0001

## Glossary

### Session Management
- **Access Code** - 6-digit code students use to join a Live Exam Session
- **Waiting Room** - Pre-exam lobby where students wait for teacher to start
- **Results Room** - Post-exam lobby where students wait for scores to be revealed
- **Session Close** - When teacher (or timer) ends the exam and reveals scores

### Gamification
- **Coins** - Virtual currency earned from completing quizzes
- **XP** - Experience points for leveling up
- **Leaderboard** - Class ranking based on performance
- **Daily Missions** - Tasks that reset daily
- **Weekly Quests** - Challenges that reset every Monday

---

*Last updated: 2026-05-05*
*This document is maintained by `/grill-with-docs` - terms are added as they are resolved during planning sessions.*
