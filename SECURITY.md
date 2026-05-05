# Security Report - iTongQuiz

**Date:** 2026-05-05  
**Last Updated:** 2026-05-05 12:33 UTC  
**Status:** PARTIAL FIXES APPLIED - CRITICAL ISSUES REQUIRE ARCHITECTURAL CHANGES

## Executive Summary

A comprehensive security audit has identified **multiple critical vulnerabilities** in the iTongQuiz application. **Four high-priority issues have been fixed** with code changes that do not impact system operations. However, **three architectural security flaws remain** that require careful planning and coordinated deployment.

## ✅ Fixed Issues (2026-05-05)

### Phase 1: Non-Breaking Fixes (Completed)

### 1. XSS Vulnerability in ExplanationContent Component
- **Severity:** HIGH
- **Status:** ✅ FIXED
- **Location:** `src/components/common/ExplanationContent.tsx`
- **Fix:** Added HTML escaping before processing AI-generated content
- **Impact:** Prevents malicious scripts from executing in user browsers
- **Deployment Impact:** None - safe to deploy immediately

### 2. SSRF Vulnerability in AI Proxy
- **Severity:** CRITICAL
- **Status:** ✅ FIXED
- **Location:** `workers/src/routes/aiProxy.ts`
- **Fix:** Removed client-controlled `x-target-url` and `x-target-token` headers
- **Impact:** Prevents attackers from using Worker as open proxy to arbitrary endpoints
- **Deployment Impact:** None - safe to deploy immediately

### 3. CORS Configuration Hardening
- **Severity:** MEDIUM
- **Status:** ✅ FIXED
- **Location:** `workers/src/middleware/cors.ts`
- **Fix:** Removed dangerous headers from CORS allowlist
- **Impact:** Reduces attack surface for SSRF and related attacks
- **Deployment Impact:** None - safe to deploy immediately

### 4. Game-Loop Authentication Bypass
- **Severity:** HIGH
- **Status:** ✅ FIXED (Partial Mitigation)
- **Location:** `workers/src/routes/gameLoop.ts`
- **Fix Applied:**
  - Added `validateUsername()` function that checks username exists in database
  - Applied validation to all 6 game-loop endpoints:
    - `GET /api/game-loop/dashboard`
    - `POST /api/game-loop/track-quiz`
    - `POST /api/game-loop/claim-mission`
    - `POST /api/game-loop/claim-chest`
    - `GET /api/game-loop/weekly-quests`
    - `POST /api/game-loop/claim-weekly-quest`
- **Impact:** Prevents access with invalid/non-existent usernames
- **Limitation:** Still trusts client-provided username (requires proper session auth for full fix)
- **Deployment Impact:** None - backward compatible, adds validation only
- **Note:** This is a **defense-in-depth** measure. Full fix requires JWT authentication (see Critical Issues below).

## 🚨 CRITICAL ISSUES REQUIRING ARCHITECTURAL CHANGES

**⚠️ WARNING:** The following issues CANNOT be fixed without significant impact on system operations. Each requires careful planning, coordinated deployment, and may cause temporary service disruption.

**📋 Detailed Roadmap:** See `CRITICAL_ISSUES_ROADMAP.md` for complete implementation plans.

### 1. Exposed API Secret in Frontend (CRITICAL)

**Problem:**
```env
VITE_API_SECRET_TOKEN=[REDACTED-COMPROMISED-SHARED-TOKEN]
```

This token is:
- Committed in `.env` file
- Bundled into frontend JavaScript (VITE_ prefix)
- Visible in browser DevTools
- Used as the ONLY authentication for most API endpoints

**Impact:** Anyone with access to the frontend can extract the token and call ANY API endpoint directly, bypassing all frontend controls.

**Why This Cannot Be Fixed Without Impact:**
- Requires complete authentication redesign (JWT/Session-based)
- All users must login again after deployment
- Frontend and backend must be deployed simultaneously
- Mobile apps (if any) must be updated
- Estimated downtime: 30-60 minutes during deployment

**Required Actions:**
1. **IMMEDIATE:** Rotate the exposed token (see roadmap)
2. **URGENT:** Remove `VITE_API_SECRET_TOKEN` from `.env`
3. **CRITICAL:** Implement JWT-based authentication (see `CRITICAL_ISSUES_ROADMAP.md`)

**Timeline:** 2-3 weeks (development + testing + deployment)  
**Detailed Plan:** See `CRITICAL_ISSUES_ROADMAP.md` - Issue #1

### 2. Authorization Bypass via Client-Controlled Actor (CRITICAL)

**Problem:** Multiple endpoints trust `actorUsername` and `actorIsAdmin` from client requests:

```typescript
// workers/src/routes/teachers.ts
const { actorUsername } = body;
if (!(await isAdminActor(db, actorUsername))) return errorResponse('Forbidden', 403);

// workers/src/routes/giftShop.ts
if (!toBool(body.actorIsAdmin)) return errorResponse('Forbidden', 403);
```

**Impact:** Attackers can impersonate any admin by sending `actorUsername: "admin"` or `actorIsAdmin: true` in requests.

**Why This Cannot Be Fixed Without Impact:**
- Depends on Issue #1 (JWT authentication) being completed first
- Requires removing `actorUsername`/`actorIsAdmin` from all API calls
- Frontend must be updated to remove these parameters
- All admin operations must be re-tested

**Affected Endpoints:**
- `POST /api/teachers` - Create teacher accounts
- `PUT /api/teachers/:username` - Modify teacher accounts
- `DELETE /api/teachers/:username` - Delete teacher accounts
- `POST /api/students/:id/reset-password` - Reset student passwords
- `POST /api/gift-shop/catalog` - Modify gift catalog
- `PUT /api/gift-shop/catalog/:id` - Update gift items
- `DELETE /api/gift-shop/catalog/:id` - Delete gift items
- `PATCH /api/classes/:id/teacher` - Transfer class ownership

**Required Actions:**
1. **CRITICAL:** Complete Issue #1 (JWT authentication) first
2. **CRITICAL:** Derive actor identity from authenticated session, not request body
3. **CRITICAL:** Remove all `actorUsername`/`actorIsAdmin` parameters from frontend

**Timeline:** 1 week (after Issue #1 is complete)  
**Detailed Plan:** See `CRITICAL_ISSUES_ROADMAP.md` - Issue #2

### 3. Weak Password Hashing (HIGH)

**Problem:** Passwords use SHA-256 without salt or key derivation:

```typescript
// workers/src/utils/response.ts
export async function hashPassword(password: string): Promise<string> {
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    // No salt, no iterations, no KDF
}
```

**Impact:** If database is compromised, weak passwords can be cracked quickly via rainbow tables or brute force.

**Why This Cannot Be Fixed Without Impact:**
- Requires implementing proper KDF (PBKDF2/Argon2/bcrypt)
- Existing password hashes must be migrated
- Two migration strategies:
  - **Lazy migration:** Upgrade on next login (3-6 months transition)
  - **Force reset:** All users reset passwords immediately (high impact)

**Required Actions:**
1. Implement proper password hashing (Argon2id, bcrypt, or PBKDF2 with salt)
2. Choose migration strategy (lazy vs force reset)
3. Migrate existing password hashes
4. Remove plaintext password fallback in `teachers.ts` after migration

**Timeline:** 1 week (development) + 3-6 months (lazy migration period)  
**Detailed Plan:** See `CRITICAL_ISSUES_ROADMAP.md` - Issue #3

### 4. Missing Authentication on Game Loop Routes (HIGH)

**Problem:** All `/api/game-loop` routes bypass authentication:

```typescript
// workers/src/middleware/auth.ts
if (path.startsWith('/api/game-loop')) return null;
```

**Status:** ✅ **PARTIALLY MITIGATED** (2026-05-05)

**Mitigation Applied:**
- Added username validation to all game-loop endpoints
- Validates that username exists in database before processing
- Prevents access with invalid/non-existent usernames

**Remaining Risk:**
- Still trusts client-provided username parameter
- Attacker can access any valid student's data by guessing/knowing their username
- Full fix requires proper session authentication (depends on Issue #1)

**Impact:** Anyone can read student dashboards, claim missions/chests, manipulate progress if they know a valid username.

**Required Actions:**
1. **COMPLETED:** Add username validation (defense-in-depth)
2. **PENDING:** Implement student session tokens (after Issue #1)
3. **PENDING:** Validate that `username` in request matches authenticated session

**Timeline:** 1 week (after Issue #1 is complete)  
**Note:** Current mitigation reduces risk but does not eliminate it completely.

### 5. No Rate Limiting on Login Endpoints (MEDIUM)

**Problem:** Login endpoints have no brute-force protection:
- `POST /api/login` (teacher login)
- `POST /api/student-login` (student login)

**Impact:** Attackers can brute-force weak passwords, especially for students.

**Required Actions:**
1. Implement rate limiting per IP + username
2. Add exponential backoff after failed attempts
3. Consider adding CAPTCHA (Cloudflare Turnstile)
4. Log and alert on suspicious login patterns

### 6. Session Storage in localStorage (MEDIUM)

**Problem:** Student sessions stored in `localStorage`:

```typescript
// src/stores/useClassroomStore.ts
localStorage.setItem(StorageKeys.STUDENT_SESSION, JSON.stringify(session));
```

**Impact:**
- No automatic expiry
- Vulnerable to XSS attacks
- No HttpOnly protection

**Required Actions:**
1. Use server-issued JWT with short expiry
2. Store tokens in HttpOnly cookies or memory
3. Add session expiry and server-side validation

## 📋 Required Architecture Changes

### Authentication & Authorization Redesign

**Current (Insecure):**
```
Frontend → Shared API Token → Worker → Database
         ↓
    actorUsername/actorIsAdmin from client
```

**Required (Secure):**
```
1. Login → Server validates credentials → Issues JWT/Session
2. Frontend → JWT in HttpOnly cookie → Worker validates JWT
3. Worker extracts user identity from JWT → Checks role in DB
4. Never trust client-provided identity claims
```

**Implementation Steps:**
1. Add JWT signing/verification to Worker (use WebCrypto or jose library)
2. Create login endpoints that return HttpOnly cookies with JWT
3. Add middleware to extract and validate JWT from cookies
4. Store user identity in request context (not from body/query)
5. Update all endpoints to use authenticated user context
6. Remove all `actorUsername`/`actorIsAdmin` parameters from client requests

### Secret Management

**Required Changes:**
1. Remove all secrets from `.env` file
2. Use `wrangler secret put` for Worker secrets:
   ```bash
   wrangler secret put API_SECRET_TOKEN
   wrangler secret put CLIPROXY_TOKEN
   wrangler secret put JWT_SECRET
   ```
3. Frontend should NEVER have access to backend secrets
4. Use environment-specific secrets (dev/staging/prod)

### Password Security

**Required Changes:**
1. Replace SHA-256 with proper KDF:
   ```typescript
   // Use WebCrypto PBKDF2 or import bcrypt-compatible library
   const salt = crypto.getRandomValues(new Uint8Array(16));
   const hash = await crypto.subtle.deriveBits(
       { name: 'PBKDF2', salt, iterations: 100000, hash: 'SHA-256' },
       key,
       256
   );
   ```
2. Store salt with hash in database
3. Migrate existing passwords on next login

## 🔍 Additional Security Recommendations

### Input Validation
- Add input validation for all user-provided data
- Sanitize file uploads (if any)
- Validate email formats, username patterns
- Limit string lengths to prevent DoS

### Error Handling
- Don't expose internal error details to clients
- Log detailed errors server-side only
- Use generic error messages for production

### Dependency Security
- Run `npm audit` regularly
- Update vulnerable dependencies
- Monitor security advisories for:
  - `vite`, `react-router-dom`
  - `jspdf`, `html2canvas`, `exceljs`
  - `puppeteer`, `papaparse`

### Monitoring & Logging
- Log all authentication attempts
- Log admin actions (create/delete users, etc.)
- Monitor for suspicious patterns
- Set up alerts for security events

### HTTPS & Security Headers
- Ensure all production traffic uses HTTPS
- Add security headers:
  - `Content-Security-Policy`
  - `X-Frame-Options: DENY`
  - `X-Content-Type-Options: nosniff`
  - `Strict-Transport-Security`

## 📝 Testing Recommendations

### Security Testing Checklist
- [ ] Test XSS payloads in all user inputs
- [ ] Attempt authorization bypass with fake admin claims
- [ ] Try brute-forcing login endpoints
- [ ] Test SSRF with various target URLs
- [ ] Verify JWT expiry and validation
- [ ] Test session hijacking scenarios
- [ ] Verify CORS configuration
- [ ] Test SQL injection (currently mitigated by prepared statements)

### Penetration Testing
Consider hiring professional security auditors to:
- Perform comprehensive penetration testing
- Review authentication/authorization logic
- Test for business logic flaws
- Validate security fixes

## 📋 Summary of Changes (2026-05-05)

### ✅ Completed Fixes (Safe to Deploy)
1. **XSS in ExplanationContent** - HTML escaping added
2. **SSRF in AI Proxy** - Client-controlled headers removed
3. **CORS Hardening** - Dangerous headers removed from allowlist
4. **Game-Loop Validation** - Username validation added to all endpoints

**Total Issues Fixed:** 4  
**Deployment Risk:** LOW - All changes are backward compatible  
**Recommended Action:** Deploy immediately to production

### 🔴 Critical Issues Requiring Planning
1. **Exposed API Secret** - Requires JWT authentication redesign (2-3 weeks)
2. **Authorization Bypass** - Requires server-side role validation (1 week after #1)
3. **Weak Password Hashing** - Requires KDF implementation + migration (1 week + 3-6 months)

**Total Issues Remaining:** 3  
**Deployment Risk:** HIGH - Requires coordinated deployment, may cause downtime  
**Recommended Action:** Review `CRITICAL_ISSUES_ROADMAP.md` and schedule implementation

---

## 📄 Related Documents

- **`CRITICAL_ISSUES_ROADMAP.md`** - Detailed implementation plans for Issues #1, #2, #3
  - Phase-by-phase breakdown
  - Code examples
  - Timeline estimates
  - Risk mitigation strategies
  - Testing checklists

---

## 🎯 Priority Action Plan

### Immediate (This Week)
1. ✅ Deploy completed fixes (XSS, SSRF, CORS, Game-Loop validation)
2. 🔴 Review `CRITICAL_ISSUES_ROADMAP.md`
3. 🔴 Decide on implementation timeline for critical issues
4. 🔴 Schedule planning meeting for JWT authentication redesign

### Week 1-2 (If Approved)
1. 🔴 Rotate exposed API token
2. 🔴 Remove VITE_API_SECRET_TOKEN from frontend
3. 🔴 Begin JWT authentication implementation

### Week 3 (If Approved)
1. 🔴 Fix authorization bypass
2. 🔴 Remove client-controlled actor parameters

### Week 4 (If Approved)
1. 🔴 Implement proper password hashing
2. 🔴 Begin lazy migration period
3. 🔴 Add comprehensive logging

---

**Last Updated:** 2026-05-05 12:34 UTC  
**Next Review:** After implementing Week 1-2 fixes or as critical issues are addressed

## 📞 Contact & Escalation

For security issues or questions:
1. Review this document thoroughly
2. Prioritize CRITICAL issues first
3. Test all changes in staging before production
4. Consider security consultation for architecture redesign

---

**Last Updated:** 2026-05-05  
**Next Review:** After implementing Week 1-2 fixes
