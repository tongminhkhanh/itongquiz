# Bug Report: JWT False Expiry Warning

**Date:** 2026-05-06  
**Severity:** 🔴 HIGH - Affects user experience immediately after login  
**Status:** ✅ FIXED

## Problem Description

User reports seeing "Phiên đăng nhập đã hết hạn" (Session expired) warning immediately after logging in, even though they just authenticated.

## Symptoms

1. User logs in successfully
2. Immediately sees error toast: "Phiên đăng nhập sắp hết hạn. Vui lòng lưu công việc và đăng nhập lại."
3. This happens right after login, not after 1 hour

## Root Cause Analysis

### Confirmed Root Cause: Live Exam was not in the JWT route allowlist

The JWT token was **not expired**. Teacher login creates a 7-day JWT in `workers/src/routes/teachers.ts`:

```typescript
const jwtToken = await signJWT(..., env.JWT_SECRET, '7d');
```

The real issue was in `workers/src/middleware/auth.ts`: the global legacy API-token middleware did not skip `/api/live-exam`, so requests to Live Exam were rejected with `401 Unauthorized: Missing or invalid API token` **before** `workers/src/routes/liveExam.ts` could run its JWT middleware.

Flow before fix:

1. Teacher logs in successfully and receives a 7-day JWT cookie.
2. Frontend calls `/api/live-exam/teacher/:username/sessions` with `credentials: include`.
3. `verifyToken()` runs first in `workers/src/index.ts`.
4. Because `/api/live-exam` was not allowlisted, `verifyToken()` expected legacy `X-API-Token`.
5. Request returns 401 even though JWT cookie is valid.
6. Frontend interceptor incorrectly showed "Phiên đăng nhập đã hết hạn" for any 401.

Fix applied:

```typescript
// workers/src/middleware/auth.ts
if (path.startsWith('/api/live-exam')) return null;
```

Also changed frontend message so generic 401 no longer claims the JWT expired unless it is actually an expiry warning.

### Why it looked like session expiry

The frontend interceptor treated every HTTP 401 as "session expired". In this case the 401 came from the legacy API-token gate, not from JWT verification. So the UI message was misleading.

---

## Initial Hypotheses Considered

### Hypothesis 1: Backend JWT Expiry Too Short ⚠️ MOST LIKELY

**Evidence:**
- Warning triggers when token has < 1 hour remaining
- If backend sets JWT expiry to 30 minutes or less, warning shows immediately
- This is a **backend configuration issue**, not frontend bug

**Backend Check Needed:**
```typescript
// Check Workers API JWT generation
// File: workers/src/auth.ts or similar
const token = jwt.sign(
    { username, role },
    JWT_SECRET,
    { expiresIn: '???' } // ← What is this value?
);
```

**Expected:** `expiresIn: '24h'` or `'8h'` (reasonable session length)  
**Actual:** Possibly `'30m'` or `'1h'` (too short)

### Hypothesis 2: JWT Decode Error

**Evidence:**
- If JWT decode fails, `isJWTExpiringSoon()` returns `true` by default
- Added debug logging to check this

**Debug Output Needed:**
```javascript
// Check browser console for:
[JWT Debug] {
  expiryTime: "2026-05-06T11:00:00.000Z",
  now: "2026-05-06T10:00:00.000Z",
  timeRemaining: "3600s",
  hoursRemaining: "1.00",
  willWarn: false  // ← Should be false if > 1 hour
}
```

### Hypothesis 3: Clock Skew

**Evidence:**
- Server and client clocks out of sync
- JWT `exp` claim uses server time
- Client checks against local time

**Check:**
```javascript
// Compare server time vs client time
console.log('Server time (from JWT):', new Date(payload.iat * 1000));
console.log('Client time:', new Date());
```

### Hypothesis 4: Cookie Parsing Issue

**Evidence:**
- Cookie value might include extra characters (`;`, `=`, etc.)
- JWT decode fails silently

**Check:**
```javascript
// Log raw cookie value
const authCookie = cookies.find(c => c.trim().startsWith('auth_token='));
console.log('Raw cookie:', authCookie);
console.log('Token:', authCookie.split('=')[1]);
```

## Diagnostic Steps

### Step 1: Check Console Logs (IMMEDIATE)

After logging in, open browser DevTools Console and look for:

```
[JWT Debug] { ... }
```

**What to check:**
- `hoursRemaining`: Should be > 1.0 if token is fresh
- `willWarn`: Should be `false` for fresh token
- Any errors: `[JWT] Failed to decode token`

### Step 2: Check Backend JWT Configuration

**File to check:** `workers/src/` (auth handler)

```bash
# Search for JWT expiry configuration
cd workers
grep -r "expiresIn" src/
grep -r "jwt.sign" src/
```

**Expected values:**
- Production: `24h` or `8h`
- Development: `1h` minimum

### Step 3: Manual JWT Decode

1. Copy `auth_token` cookie value from DevTools → Application → Cookies
2. Go to https://jwt.io
3. Paste token
4. Check `exp` claim (Unix timestamp)
5. Convert to human time: `new Date(exp * 1000)`

### Step 4: Test with Extended Token

Temporarily change backend to issue 24h tokens:

```typescript
// workers/src/auth.ts
const token = jwt.sign(payload, secret, { expiresIn: '24h' });
```

Re-login and check if warning still appears.

## Temporary Fix (Frontend)

While investigating, we can adjust the warning threshold:

```typescript
// src/utils/jwtInterceptor.ts
// Change from 1 hour to 10 minutes
const tenMinutes = 10 * 60 * 1000;
return (expiryTime - now) < tenMinutes;
```

This prevents false warnings but still alerts before actual expiry.

## Permanent Solutions

### Solution A: Fix Backend JWT Expiry (RECOMMENDED)

**If backend expiry is too short:**

```typescript
// workers/src/auth.ts
const token = jwt.sign(
    { username, role, iat: Math.floor(Date.now() / 1000) },
    JWT_SECRET,
    { expiresIn: '8h' } // ← Increase to 8 hours
);
```

**Pros:**
- Fixes root cause
- Better UX (less frequent re-logins)
- Standard practice for web apps

**Cons:**
- Requires backend deployment
- Security consideration (longer token lifetime)

### Solution B: Adjust Frontend Warning Threshold

**If 1 hour warning is too aggressive:**

```typescript
// src/utils/jwtInterceptor.ts
const fifteenMinutes = 15 * 60 * 1000;
return (expiryTime - now) < fifteenMinutes;
```

**Pros:**
- Quick frontend-only fix
- No backend changes needed

**Cons:**
- Doesn't fix short token lifetime
- Users still need to re-login frequently

### Solution C: Implement Token Refresh

**Add auto-refresh before expiry:**

```typescript
// Refresh token when < 10 minutes remaining
if (timeRemaining < 10 * 60 * 1000) {
    await refreshToken();
}
```

**Pros:**
- Best UX (seamless sessions)
- Industry standard

**Cons:**
- Requires backend refresh endpoint
- More complex implementation

## Action Items

### Immediate (User)
1. ✅ Check browser console for `[JWT Debug]` logs
2. ⏳ Report `hoursRemaining` value
3. ⏳ Check if warning appears every time or intermittently

### Short-term (Developer)
1. ⏳ Check backend JWT expiry configuration
2. ⏳ Verify JWT decode is working correctly
3. ⏳ Adjust warning threshold if needed

### Long-term (Team)
1. ⏳ Standardize JWT expiry across environments
2. ⏳ Consider implementing token refresh
3. ⏳ Add backend monitoring for token expiry patterns

## Expected Outcome

**After fix:**
- Fresh login → No warning for at least 7 hours (if 8h token)
- Warning only appears in last hour before expiry
- Clear, actionable message for users

## Testing Checklist

- [ ] Login → No immediate warning
- [ ] Wait 7 hours → Warning appears
- [ ] Warning message is clear and actionable
- [ ] Redirect works after expiry
- [ ] No console errors

## Related Files

- `src/utils/jwtInterceptor.ts` - Frontend JWT handling
- `workers/src/auth.ts` (or similar) - Backend JWT generation
- `src/components/TeacherDashboard/index.tsx` - Expiry monitoring

## Next Steps

**Please provide:**
1. Screenshot of browser console showing `[JWT Debug]` output
2. Value of `hoursRemaining` from the log
3. Backend JWT configuration (expiresIn value)

This will help identify the exact root cause.

---

**Status:** Awaiting user feedback with console logs  
**Priority:** HIGH - Affects all users immediately after login  
**Estimated Fix Time:** 
- If backend config: 5 minutes
- If frontend threshold: 2 minutes
- If token refresh needed: 2-4 hours
