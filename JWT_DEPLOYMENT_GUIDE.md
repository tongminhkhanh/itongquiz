# JWT Authentication Deployment Guide
**Date:** 2026-05-05  
**Status:** READY FOR DEPLOYMENT

---

## 📋 Overview

This guide covers the deployment of JWT authentication for iTongQuiz, which fixes the Game-Loop authentication vulnerability and prepares the system for full security migration.

**What Changed:**
- Student login now returns JWT cookie (HttpOnly, Secure)
- Teacher login now returns JWT cookie (HttpOnly, Secure)
- Game-loop routes now require JWT authentication (no more client-provided username)
- New logout endpoint to clear JWT cookies
- Frontend updated to send cookies with requests

**Impact:**
- ✅ All users must login again after deployment
- ✅ Requires coordinated frontend + backend deployment
- ✅ Downtime: ~30-60 minutes during deployment
- ✅ Mobile apps (if any) must be updated

---

## 🔧 Pre-Deployment Checklist

### 1. Generate JWT Secret

```bash
# Generate a secure random secret (64 characters)
openssl rand -hex 32

# Example output:
# 4f8a3b2c1d9e7f6a5b4c3d2e1f0a9b8c7d6e5f4a3b2c1d0e9f8a7b6c5d4e3f2a1b
```

### 2. Set JWT Secret in Cloudflare Workers

```bash
cd workers

# Set JWT_SECRET (use the generated secret from step 1)
wrangler secret put JWT_SECRET
# When prompted, paste the secret: 4f8a3b2c1d9e7f6a5b4c3d2e1f0a9b8c7d6e5f4a3b2c1d0e9f8a7b6c5d4e3f2a1b
```

### 3. Install Dependencies

```bash
cd workers
npm install
# This will install jose@^5.2.0 for JWT signing/verification
```

### 4. Test Locally (Optional but Recommended)

```bash
# Start local Workers dev server
cd workers
wrangler dev

# In another terminal, start frontend dev server
cd ..
npm run dev

# Test login flow:
# 1. Go to http://localhost:5173
# 2. Login as student or teacher
# 3. Check browser DevTools > Application > Cookies
# 4. Should see "auth_token" cookie (HttpOnly, Secure)
# 5. Test game-loop dashboard (should work without username parameter)
```

---

## 🚀 Deployment Steps

### Step 1: Deploy Backend (Workers)

```bash
cd workers

# Deploy to production
wrangler deploy

# Verify deployment
curl https://phieu.thitong.site/api/health
# Should return: {"status":"ok","timestamp":"..."}
```

**⚠️ IMPORTANT:** After this step, old frontend will break because:
- Login endpoints now return JWT cookies
- Game-loop routes now require JWT authentication

### Step 2: Deploy Frontend

```bash
cd ..

# Build production frontend
npm run build

# Deploy to Vercel (or your hosting platform)
vercel --prod

# Or if using different platform:
# - Upload dist/ folder to your hosting
# - Ensure environment variables are set
```

### Step 3: Verify Deployment

1. **Test Teacher Login:**
   ```
   1. Go to https://www.thitong.site
   2. Login as teacher
   3. Open DevTools > Application > Cookies
   4. Verify "auth_token" cookie exists (HttpOnly, Secure, SameSite=Lax)
   5. Navigate to dashboard - should work
   ```

2. **Test Student Login:**
   ```
   1. Go to student login page
   2. Login as student
   3. Verify "auth_token" cookie exists
   4. Check game-loop dashboard - should load without errors
   5. Try claiming missions - should work
   ```

3. **Test Logout:**
   ```
   1. Click logout button
   2. Verify "auth_token" cookie is cleared
   3. Try accessing protected routes - should redirect to login
   ```

---

## 🔄 Rollback Plan

If deployment fails, rollback in reverse order:

### Rollback Step 1: Revert Frontend

```bash
# Revert to previous Vercel deployment
vercel rollback

# Or redeploy previous version
git checkout <previous-commit>
npm run build
vercel --prod
```

### Rollback Step 2: Revert Backend

```bash
cd workers

# Revert to previous commit
git checkout <previous-commit>

# Redeploy
wrangler deploy
```

### Rollback Step 3: Notify Users

- Post announcement: "System maintenance completed. Please login again."
- Monitor error logs for issues

---

## 📊 Post-Deployment Monitoring

### 1. Check Error Logs

```bash
# View Workers logs
wrangler tail

# Look for:
# - "[JWT] Verification failed" - indicates invalid tokens
# - "[JWT Middleware] JWT_SECRET not configured" - secret not set
# - "Unauthorized: Missing authentication token" - cookie not sent
```

### 2. Monitor User Login Success Rate

```sql
-- Check login attempts (if you add logging)
SELECT COUNT(*) as login_attempts
FROM login_logs
WHERE created_at > datetime('now', '-1 hour');
```

### 3. Check Game-Loop Usage

```sql
-- Verify game-loop routes are working
SELECT COUNT(*) as game_loop_requests
FROM student_game_activity_events
WHERE created_at > datetime('now', '-1 hour');
```

---

## 🐛 Troubleshooting

### Issue: "Unauthorized: Missing authentication token"

**Cause:** JWT cookie not being sent with requests

**Fix:**
1. Check `credentials: 'include'` in frontend fetch calls
2. Verify CORS allows credentials:
   ```typescript
   // workers/src/middleware/cors.ts
   'Access-Control-Allow-Credentials': 'true'
   ```
3. Ensure frontend and backend are on same domain or proper CORS setup

### Issue: "Unauthorized: Invalid or expired token"

**Cause:** JWT signature verification failed

**Fix:**
1. Verify JWT_SECRET is set correctly:
   ```bash
   wrangler secret list
   # Should show JWT_SECRET
   ```
2. Check token expiration (default 7 days)
3. Clear cookies and login again

### Issue: "Authentication service unavailable"

**Cause:** JWT_SECRET not configured in Workers

**Fix:**
```bash
wrangler secret put JWT_SECRET
# Paste the secret when prompted
```

### Issue: Game-loop routes return 403 Forbidden

**Cause:** User is not a student or JWT is invalid

**Fix:**
1. Verify user logged in as student (not teacher)
2. Check JWT payload has `role: 'student'`
3. Clear cookies and login again

---

## 📝 User Communication

### Announcement Template

**Subject:** System Maintenance - Login Required

**Body:**
```
Xin chào,

Chúng tôi đã nâng cấp hệ thống bảo mật của iTongQuiz.

Thay đổi:
- Tất cả người dùng cần đăng nhập lại
- Phiên đăng nhập cũ đã hết hạn
- Hệ thống an toàn hơn với JWT authentication

Thời gian bảo trì: 2026-05-05, 13:00 - 14:00 (UTC+7)

Nếu gặp vấn đề đăng nhập, vui lòng:
1. Xóa cookies trình duyệt
2. Thử đăng nhập lại
3. Liên hệ support nếu vẫn gặp lỗi

Cảm ơn sự thông cảm!
```

---

## 🔐 Security Notes

### JWT Token Details

- **Algorithm:** HS256 (HMAC with SHA-256)
- **Expiration:** 7 days
- **Storage:** HttpOnly cookie (not accessible via JavaScript)
- **Transmission:** Secure flag (HTTPS only)
- **SameSite:** Lax (prevents CSRF)

### Cookie Configuration

```typescript
auth_token=<jwt>; HttpOnly; Secure; SameSite=Lax; Max-Age=604800; Path=/
```

- `HttpOnly`: Prevents XSS attacks
- `Secure`: Only sent over HTTPS
- `SameSite=Lax`: Prevents CSRF attacks
- `Max-Age=604800`: 7 days (604800 seconds)
- `Path=/`: Available for all routes

### What's Protected

✅ **Now Protected:**
- Student login → JWT cookie
- Teacher login → JWT cookie
- Game-loop dashboard
- Game-loop track quiz
- Game-loop claim mission
- Game-loop claim chest
- Game-loop weekly quests

⚠️ **Still Using Legacy Auth (X-API-Token):**
- Quiz management
- Class management
- Results
- Assignments
- Gift shop
- Gamification (pets, shop, leaderboard)

**Note:** These will be migrated in Phase 2 (see CRITICAL_ISSUES_ROADMAP.md)

---

## 📅 Timeline

- **2026-05-05 13:00 UTC+7:** Start deployment
- **2026-05-05 13:15 UTC+7:** Backend deployed
- **2026-05-05 13:30 UTC+7:** Frontend deployed
- **2026-05-05 13:45 UTC+7:** Verification complete
- **2026-05-05 14:00 UTC+7:** System fully operational

**Estimated Downtime:** 30-60 minutes

---

## ✅ Success Criteria

Deployment is successful when:
- [ ] JWT_SECRET is set in Workers
- [ ] Backend deployed without errors
- [ ] Frontend deployed without errors
- [ ] Teacher login returns JWT cookie
- [ ] Student login returns JWT cookie
- [ ] Game-loop dashboard loads without username parameter
- [ ] Game-loop missions can be claimed
- [ ] Logout clears JWT cookie
- [ ] No 401/403 errors in production logs
- [ ] Users can login and use the system normally

---

## 🔜 Next Steps (Phase 2)

After successful deployment, plan for:

1. **Remove VITE_API_SECRET_TOKEN from frontend** (Issue #1)
   - Timeline: 1-2 weeks
   - See: CRITICAL_ISSUES_ROADMAP.md

2. **Fix Authorization Bypass** (Issue #2)
   - Migrate teacher/admin routes to JWT
   - Remove actorUsername/actorIsAdmin parameters
   - Timeline: 1 week after Issue #1

3. **Implement Proper Password Hashing** (Issue #3)
   - Replace SHA-256 with PBKDF2/Argon2
   - Lazy migration strategy
   - Timeline: 1 week + 3-6 months migration period

---

**Prepared by:** Claude (Security Implementation)  
**Date:** 2026-05-05  
**Version:** 1.0
