# Security Changes - July 14, 2026

## Commit Message

```
security: Remove shared secret, harden legacy routes, add rate limiting

- Remove VITE_API_SECRET_TOKEN usage from frontend auth layer
- Introduce 'public' auth policy
- Migrate public routes (get_public_phieu, practice) to 'public' policy
- Change AI routes to require 'session' (JWT)
- Add basic Rate Limiting middleware using D1
- Apply rate limit to Login, AI routes, and Public Phieu
- Update SECURITY.md and .env.example

Related to P0 security improvements.
```

## Files to commit

```bash
git add \
  .env.example \
  SECURITY.md \
  src/services/api/types.ts \
  src/services/api/auth.ts \
  src/services/api/routes/phieu.ts \
  src/services/api/routes/practice.ts \
  src/services/api/routes/ai.ts \
  src/services/api/__tests__/routeResolver.test.ts \
  src/services/api/__tests__/auth.test.ts \
  src/services/api/__tests__/apiClient.test.ts \
  workers/src/middleware/rateLimit.ts \
  workers/src/index.ts
```

## Full commit command

```bash
git commit -m "security: Remove shared secret, harden legacy routes, add rate limiting"

git push
```

## Summary of Changes

### Documentation
- `.env.example`: Marked VITE_API_SECRET_TOKEN as deprecated
- `SECURITY.md`: Added July 2026 security fixes section

### Frontend Auth
- Added 'public' auth policy
- Removed shared secret (X-API-Token) sending
- Migrated public routes to 'public' policy
- AI routes now require JWT (session)

### Backend (Workers)
- Created rateLimit middleware (D1 based)
- Applied rate limiting to:
  - Login (5 req / 5 min)
  - AI routes (10 req / min)
  - Public Phieu (30 req / min)
- Auto-create rate_limits table on startup

## Notes
- All related tests are passing
- This is part of ongoing P0 security hardening
