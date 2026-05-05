# Deployment Checklist - JWT Authentication
**Date:** 2026-05-05  
**Time Started:** 12:58 UTC

---

## ✅ Pre-Deployment Steps

### 1. JWT Secret Generated
- [x] Generated 64-character hex secret
- [x] Saved to `workers/.jwt-secret.txt`
- **Secret:** `a7f3e9d2c8b4f1a6e5d9c3b7f2a8e4d1c9f6b3a7e2d8f4c1b9a6e3d7f5c2b8a4e1`

### 2. Dependencies
- [ ] Run `npm install` in workers directory
- [ ] Verify jose@^5.2.0 is installed

### 3. Set JWT Secret in Workers
- [ ] Run `wrangler secret put JWT_SECRET`
- [ ] Paste secret when prompted
- [ ] Verify with `wrangler secret list`

### 4. Local Testing (Optional)
- [ ] Start `wrangler dev` in workers directory
- [ ] Start `npm run dev` in root directory
- [ ] Test student login
- [ ] Test teacher login
- [ ] Test game-loop dashboard
- [ ] Verify JWT cookie in DevTools

---

## 🚀 Deployment Steps

### 5. Deploy Backend
- [ ] Run `cd workers && wrangler deploy`
- [ ] Verify deployment: `curl https://itongquiz-api.sample_user_baf53feb.workers.dev/api/health`
- [ ] Check logs: `wrangler tail`

### 6. Deploy Frontend
- [ ] Run `npm run build`
- [ ] Deploy to Vercel: `vercel --prod`
- [ ] Verify deployment URL

### 7. Post-Deployment Verification
- [ ] Test teacher login on production
- [ ] Test student login on production
- [ ] Verify JWT cookie in browser
- [ ] Test game-loop dashboard
- [ ] Test logout functionality

---

## 📊 Monitoring

### 8. Check Logs
- [ ] Monitor Workers logs for errors
- [ ] Check for JWT verification failures
- [ ] Monitor login success rate

### 9. User Communication
- [ ] Post maintenance announcement
- [ ] Notify users to login again
- [ ] Monitor support requests

---

## 🔄 Rollback Plan (If Needed)

### If Deployment Fails:
1. [ ] Revert frontend: `vercel rollback`
2. [ ] Revert backend: Redeploy previous version
3. [ ] Notify users of rollback
4. [ ] Investigate issues

---

## 📝 Notes

**Current Status:** Ready to execute deployment steps

**Next Action:** Run `npm install` in workers directory

**Estimated Time:** 30-60 minutes total

---

**Started:** 2026-05-05 12:58 UTC  
**Completed:** _Pending_
