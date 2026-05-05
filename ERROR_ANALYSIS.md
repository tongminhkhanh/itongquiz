# Weekly Quests Error Analysis

## 📊 Observed Errors (From Screenshot)

### Error 1: 500 Internal Server Error
```
GET http://103.47.224.66:3001/api/game-loop/weekly-quests?username=...
Status: 500 (Internal Server Error)
```

### Error 2: Failed to fetch weekly quests
```
Error fetching weekly quests: StudentDashboardUI.tsx:287
Error: Failed to fetch weekly quests
at fetchWeeklyQuests (StudentDashboardUI.tsx:280:41)
```

---

## 🔍 Root Cause Analysis

### Possible Causes:

#### 1. **Database Schema Missing** ⚠️ MOST LIKELY
- `student_weekly_progress` table chưa được tạo trong production database
- Backend code gọi table này nhưng table không tồn tại
- Result: SQL error → 500 Internal Server Error

#### 2. **Helper Functions Not Defined**
- `getCurrentWeekKey()` hoặc `getOrCreateWeeklyProgress()` chưa được implement
- Result: Runtime error → 500

#### 3. **WEEKLY_QUESTS Constant Not Defined**
- `WEEKLY_QUESTS` array chưa được define trong gameLoop.ts
- Result: Reference error → 500

#### 4. **Database Connection Issue**
- Workers không connect được đến D1 database
- Result: Database error → 500

---

## 🎯 Diagnosis Steps

### Step 1: Check if table exists
```sql
SELECT name FROM sqlite_master 
WHERE type='table' AND name='student_weekly_progress';
```

### Step 2: Check if helper functions exist
Search in `workers/src/routes/gameLoop.ts`:
- `getCurrentWeekKey()`
- `getOrCreateWeeklyProgress()`
- `WEEKLY_QUESTS`

### Step 3: Check backend logs
Look for actual error message in Cloudflare Workers logs

---

## 🔧 Next Actions

1. **Verify database schema** - Check if table was created
2. **Check helper functions** - Ensure all functions are defined
3. **Test API directly** - Use curl to see actual error response
4. **Check Workers logs** - See detailed error message

---

## 📝 Notes

- Auth middleware was fixed (401 → now 500)
- This means request is reaching the endpoint
- Error is happening INSIDE the endpoint handler
- Most likely: Database table doesn't exist yet

---

## ✅ DIAGNOSIS COMPLETE

### Verification Results:

1. ✅ `getCurrentWeekKey()` - EXISTS in gameLoop.ts
2. ✅ `getOrCreateWeeklyProgress()` - EXISTS in gameLoop.ts
3. ✅ `WEEKLY_QUESTS` - EXISTS in gameLoop.ts
4. ✅ Table schema - EXISTS in workers/schema.sql
5. ❌ **Table in production DB - NOT CREATED YET**

---

## 🎯 ROOT CAUSE IDENTIFIED

**Problem:** `student_weekly_progress` table chưa được tạo trong production D1 database.

**Evidence:**
- Schema exists in `workers/schema.sql` (line ~1180)
- Backend code references this table
- Table was never executed against production DB
- Result: SQL error when trying to SELECT/INSERT → 500 Internal Server Error

**Why this happened:**
- Schema.sql file được update locally
- Workers code được deploy
- BUT: Database migration chưa được chạy
- Production DB vẫn thiếu table mới

---

## 🔧 SOLUTION

Need to execute the CREATE TABLE statement against production D1 database:

```bash
# Option 1: Using wrangler d1 execute
cd workers
npx wrangler d1 execute itongquiz-db --file=schema.sql --remote

# Option 2: Using wrangler d1 execute with specific SQL
npx wrangler d1 execute itongquiz-db --remote --command="
CREATE TABLE IF NOT EXISTS student_weekly_progress (
  username TEXT NOT NULL,
  week_key TEXT NOT NULL,
  quest_id TEXT NOT NULL,
  progress INTEGER DEFAULT 0,
  claimed INTEGER DEFAULT 0,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  PRIMARY KEY (username, week_key, quest_id)
);

CREATE INDEX IF NOT EXISTS idx_weekly_progress_username_week 
ON student_weekly_progress(username, week_key);
"
```

---

## 📊 Error Flow Diagram

```
Frontend Request
    ↓
GET /api/game-loop/weekly-quests?username=X
    ↓
Auth Middleware (PASS - fixed)
    ↓
handleGameLoopRoutes()
    ↓
getOrCreateWeeklyProgress()
    ↓
SELECT * FROM student_weekly_progress  ← TABLE DOESN'T EXIST
    ↓
SQL Error: "no such table: student_weekly_progress"
    ↓
500 Internal Server Error
    ↓
Frontend: "Error fetching weekly quests"
```

---

## 🚀 Next Steps

1. **Execute schema.sql** against production D1 database
2. **Verify table created** with: `SELECT * FROM student_weekly_progress LIMIT 1`
3. **Test API endpoint** again
4. **Confirm Weekly Quests panel** loads successfully
