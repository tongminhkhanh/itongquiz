# Roadmap Sửa Các Vấn Đề Bảo Mật Nghiêm Trọng
**Ngày tạo:** 2026-05-05  
**Trạng thái:** CHƯA THỰC HIỆN - CẦN QUYẾT ĐỊNH KIẾN TRÚC

---

## 📊 Tổng Quan

Báo cáo này chi tiết hóa 3 vấn đề bảo mật CRITICAL không thể sửa mà không ảnh hưởng lớn đến vận hành hệ thống. Mỗi vấn đề đều yêu cầu thay đổi kiến trúc và có kế hoạch triển khai cụ thể.

---

## 🔴 VẤN ĐỀ #1: API Secret Bị Lộ Trong Frontend

### Mô Tả Vấn Đề

**File:** `.env`
```env
VITE_API_SECRET_TOKEN=[REDACTED-REMOVED]
```

**Tại sao nghiêm trọng:**
- Token này có prefix `VITE_` nên được bundle vào JavaScript frontend
- Bất kỳ ai mở DevTools đều có thể xem được token
- Token này là TOÀN BỘ authentication cho hầu hết API endpoints
- Kẻ tấn công có thể gọi trực tiếp API, bypass mọi kiểm soát frontend

**Kiến trúc hiện tại (KHÔNG AN TOÀN):**
```
Frontend → Gửi VITE_API_SECRET_TOKEN trong header → Worker → Database
         ↓
    Token lộ trong browser bundle
```

### Giải Pháp Đề Xuất

**Kiến trúc mới (AN TOÀN):**
```
1. User login → Worker validates credentials → Issues JWT (HttpOnly cookie)
2. Frontend → JWT cookie (auto-sent) → Worker validates JWT → Database
3. Worker extracts user identity from JWT → Never trust client claims
```

### Kế Hoạch Triển Khai

#### Phase 1: Chuẩn Bị (1-2 ngày)
1. **Tạo JWT secret mới:**
   ```bash
   wrangler secret put JWT_SECRET
   # Nhập: [random 64-char hex string]
   ```

2. **Cài đặt JWT library cho Worker:**
   ```bash
   cd workers
   npm install jose
   ```

3. **Tạo JWT utilities:**
   - File: `workers/src/utils/jwt.ts`
   - Functions: `signJWT()`, `verifyJWT()`, `extractUserFromJWT()`

#### Phase 2: Implement Authentication (2-3 ngày)
1. **Update login endpoints:**
   - `POST /api/login` (teacher)
   - `POST /api/student-login` (student)
   - Return: Set HttpOnly cookie với JWT

2. **Create JWT middleware:**
   - File: `workers/src/middleware/jwtAuth.ts`
   - Extract JWT from cookie
   - Validate signature
   - Store user context in request

3. **Update auth.ts:**
   - Replace token check với JWT validation
   - Store authenticated user in context

#### Phase 3: Update All Endpoints (3-4 ngày)
1. **Remove client-controlled identity:**
   - Remove `actorUsername` parameter từ request body
   - Remove `actorIsAdmin` parameter từ request body
   - Use authenticated user from JWT context

2. **Update affected endpoints:**
   - `/api/teachers` (POST, PUT, DELETE)
   - `/api/gift-shop/catalog` (POST, PUT, DELETE)
   - `/api/students/:id/reset-password`
   - `/api/classes/:id/teacher`

#### Phase 4: Frontend Migration (2-3 ngày)
1. **Remove VITE_API_SECRET_TOKEN:**
   - Delete from `.env`
   - Remove from all API calls
   - Update API client to use cookies

2. **Update login flow:**
   - Store session state in memory (not localStorage)
   - Rely on HttpOnly cookie for auth

3. **Add logout endpoint:**
   - Clear JWT cookie
   - Clear frontend session state

#### Phase 5: Rotate Secrets (1 ngày)
1. **Generate new API_SECRET_TOKEN:**
   ```bash
   wrangler secret put API_SECRET_TOKEN
   # Nhập: [new random token]
   ```

2. **Update legacy GAS compatibility:**
   - Keep for backward compatibility nếu cần
   - Hoặc remove hoàn toàn nếu không dùng

### Ảnh Hưởng Đến Vận Hành

**CRITICAL - Downtime Required:**
- ✅ Cần deploy frontend và backend cùng lúc
- ✅ Tất cả users phải login lại
- ✅ Mobile apps (nếu có) phải update
- ✅ Cần thông báo trước cho users

**Thời gian ước tính:** 10-14 ngày (development + testing + deployment)

---

## 🔴 VẤN ĐỀ #2: Authorization Bypass Via Client-Controlled Actor

### Mô Tả Vấn Đề

**Affected Files:**
- `workers/src/routes/teachers.ts`
- `workers/src/routes/giftShop.ts`
- `workers/src/routes/classroom.ts`

**Code hiện tại (KHÔNG AN TOÀN):**
```typescript
// teachers.ts
const { actorUsername } = body;
if (!(await isAdminActor(db, actorUsername))) return errorResponse('Forbidden', 403);

// giftShop.ts
if (!toBool(body.actorIsAdmin)) return errorResponse('Forbidden', 403);
```

**Tại sao nghiêm trọng:**
- Client tự khai báo mình là admin
- Kẻ tấn công chỉ cần gửi `actorUsername: "admin"` hoặc `actorIsAdmin: true`
- Có thể tạo/xóa teachers, sửa gift shop, reset passwords

**Endpoints bị ảnh hưởng:**
1. `POST /api/teachers` - Tạo teacher accounts
2. `PUT /api/teachers/:username` - Sửa teacher accounts
3. `DELETE /api/teachers/:username` - Xóa teacher accounts
4. `POST /api/students/:id/reset-password` - Reset student passwords
5. `POST /api/gift-shop/catalog` - Thêm gift items
6. `PUT /api/gift-shop/catalog/:id` - Sửa gift items
7. `DELETE /api/gift-shop/catalog/:id` - Xóa gift items
8. `PATCH /api/classes/:id/teacher` - Transfer class ownership

### Giải Pháp Đề Xuất

**Phụ thuộc vào Vấn Đề #1** - Phải implement JWT authentication trước.

Sau khi có JWT:
```typescript
// Middleware extracts user from JWT
const authenticatedUser = request.user; // { username, role }

// Endpoint checks role from authenticated session
if (authenticatedUser.role !== 'admin') {
    return errorResponse('Forbidden', 403);
}
```

### Kế Hoạch Triển Khai

**Điều kiện tiên quyết:** Hoàn thành Vấn Đề #1 (JWT authentication)

#### Step 1: Create Authorization Helpers (1 ngày)
```typescript
// workers/src/utils/authorization.ts
export function requireAdmin(user: AuthenticatedUser): boolean {
    return user.role === 'admin';
}

export function requireTeacher(user: AuthenticatedUser): boolean {
    return user.role === 'admin' || user.role === 'teacher';
}

export function requireOwnership(user: AuthenticatedUser, resourceOwner: string): boolean {
    return user.role === 'admin' || user.username === resourceOwner;
}
```

#### Step 2: Update Teachers Routes (1 ngày)
```typescript
// Before
const { actorUsername } = body;
if (!(await isAdminActor(db, actorUsername))) return errorResponse('Forbidden', 403);

// After
const user = request.user; // From JWT middleware
if (!requireAdmin(user)) return errorResponse('Forbidden', 403);
```

#### Step 3: Update Gift Shop Routes (1 ngày)
```typescript
// Before
if (!toBool(body.actorIsAdmin)) return errorResponse('Forbidden', 403);

// After
const user = request.user;
if (!requireAdmin(user)) return errorResponse('Forbidden', 403);
```

#### Step 4: Update Classroom Routes (1 ngày)
- Reset password: Require admin or class teacher
- Transfer class: Require admin only

#### Step 5: Remove All Client-Controlled Parameters (1 ngày)
- Search codebase for `actorUsername`, `actorIsAdmin`
- Remove from request body parsing
- Update frontend to not send these parameters

### Ảnh Hưởng Đến Vận Hành

**HIGH - Requires Coordination:**
- ✅ Phải deploy sau khi Vấn Đề #1 hoàn thành
- ✅ Frontend phải remove `actorUsername`/`actorIsAdmin` parameters
- ✅ Cần test kỹ authorization logic
- ⚠️ Không có downtime nếu deploy đúng thứ tự

**Thời gian ước tính:** 5-7 ngày (sau khi Vấn Đề #1 xong)

---

## 🔴 VẤN ĐỀ #3: Weak Password Hashing (SHA-256 Without Salt)

### Mô Tả Vấn Đề

**File:** `workers/src/utils/response.ts`
```typescript
export async function hashPassword(password: string): Promise<string> {
    const encoder = new TextEncoder();
    const data = encoder.encode(password);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    // No salt, no iterations, no KDF
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}
```

**Tại sao nghiêm trọng:**
- SHA-256 không phải password hashing algorithm
- Không có salt → Cùng password = cùng hash
- Không có iterations → Dễ brute-force
- Nếu database bị leak, passwords yếu sẽ bị crack nhanh

**Ví dụ tấn công:**
```
Password: "123456"
SHA-256: "ccccb619b58d4e2de77b4059fdc3385b3c302693f3724e2579e029718da481d6"
→ Rainbow table lookup: < 1 second
```

### Giải Pháp Đề Xuất

**Option A: PBKDF2 (Built-in WebCrypto)**
```typescript
export async function hashPassword(password: string): Promise<string> {
    const salt = crypto.getRandomValues(new Uint8Array(16));
    const encoder = new TextEncoder();
    const keyMaterial = await crypto.subtle.importKey(
        'raw',
        encoder.encode(password),
        'PBKDF2',
        false,
        ['deriveBits']
    );
    
    const hash = await crypto.subtle.deriveBits(
        {
            name: 'PBKDF2',
            salt: salt,
            iterations: 100000,
            hash: 'SHA-256'
        },
        keyMaterial,
        256
    );
    
    // Store: salt + hash
    const saltHex = Array.from(salt).map(b => b.toString(16).padStart(2, '0')).join('');
    const hashHex = Array.from(new Uint8Array(hash)).map(b => b.toString(16).padStart(2, '0')).join('');
    return `${saltHex}:${hashHex}`;
}
```

**Option B: Argon2 (Recommended, requires library)**
```bash
npm install @noble/hashes
```

### Kế Hoạch Triển Khai

#### Phase 1: Implement New Hashing (2 ngày)
1. **Create new hash function:**
   - File: `workers/src/utils/passwordHash.ts`
   - Implement PBKDF2 với salt
   - Implement verify function

2. **Add migration flag:**
   - Database column: `password_version` (default: 'sha256')
   - New hashes: `password_version = 'pbkdf2'`

#### Phase 2: Lazy Migration Strategy (1 ngày)
```typescript
// POST /api/login
const hashedPassword = await hashPasswordSHA256(password); // Old method
let teacher = await db.prepare('SELECT * FROM teachers WHERE username = ? AND password = ?')
    .bind(username, hashedPassword).first();

if (!teacher) {
    // Try new method
    teacher = await db.prepare('SELECT * FROM teachers WHERE username = ?')
        .bind(username).first();
    
    if (teacher && await verifyPasswordPBKDF2(password, teacher.password)) {
        // Valid login - no action needed
    } else {
        return errorResponse('Invalid credentials');
    }
} else {
    // Old hash matched - upgrade to new hash
    const newHash = await hashPasswordPBKDF2(password);
    await db.prepare('UPDATE teachers SET password = ?, password_version = ? WHERE username = ?')
        .bind(newHash, 'pbkdf2', username).run();
}
```

#### Phase 3: Update Password Change Endpoints (1 ngày)
- `POST /api/teachers` - Use new hash
- `PUT /api/teachers/:username` - Use new hash
- `POST /api/students/:id/reset-password` - Use new hash

#### Phase 4: Monitor Migration Progress (Ongoing)
```sql
-- Check migration progress
SELECT 
    password_version,
    COUNT(*) as count
FROM teachers
GROUP BY password_version;
```

#### Phase 5: Force Migration (Optional, sau 3-6 tháng)
- Email users còn dùng old hash
- Require password reset
- Remove SHA-256 fallback code

### Ảnh Hưởng Đến Vận Hành

**MEDIUM - Gradual Migration:**
- ✅ Lazy migration → Không cần downtime
- ✅ Users tự động upgrade khi login
- ⚠️ Passwords chưa login vẫn dùng SHA-256
- ⚠️ Cần monitor migration progress

**Thời gian ước tính:** 4-5 ngày (development) + 3-6 tháng (migration period)

---

## 📅 Timeline Tổng Hợp

### Tuần 1-2: Vấn Đề #1 (API Secret)
- Day 1-2: Setup JWT infrastructure
- Day 3-5: Implement authentication
- Day 6-8: Update endpoints
- Day 9-10: Frontend migration
- Day 11-12: Testing
- Day 13-14: Deployment + monitoring

### Tuần 3: Vấn Đề #2 (Authorization Bypass)
- Day 1: Create authorization helpers
- Day 2-4: Update all affected routes
- Day 5: Remove client-controlled parameters
- Day 6-7: Testing + deployment

### Tuần 4: Vấn Đề #3 (Password Hashing)
- Day 1-2: Implement PBKDF2
- Day 3: Lazy migration logic
- Day 4: Update password change endpoints
- Day 5-7: Testing + deployment

**Tổng thời gian:** 4 tuần (development + testing + deployment)

---

## ⚠️ Rủi Ro & Giảm Thiểu

### Rủi Ro Cao
1. **Downtime khi deploy Vấn Đề #1**
   - Giảm thiểu: Blue-green deployment, rollback plan
   
2. **Users bị logout hàng loạt**
   - Giảm thiểu: Thông báo trước, hướng dẫn login lại

3. **Authorization logic sai → Privilege escalation**
   - Giảm thiểu: Extensive testing, security review

### Rủi Ro Trung Bình
1. **Password migration chậm**
   - Giảm thiểu: Email reminders, force reset sau 6 tháng

2. **Frontend/backend version mismatch**
   - Giảm thiểu: Versioned API, backward compatibility period

---

## 🧪 Testing Checklist

### Vấn Đề #1 (JWT Authentication)
- [ ] Teacher login returns JWT cookie
- [ ] Student login returns JWT cookie
- [ ] Invalid JWT rejected
- [ ] Expired JWT rejected
- [ ] Logout clears cookie
- [ ] All endpoints validate JWT
- [ ] No VITE_API_SECRET_TOKEN in bundle

### Vấn Đề #2 (Authorization)
- [ ] Admin can create/edit/delete teachers
- [ ] Non-admin cannot create/edit/delete teachers
- [ ] Admin can modify gift shop
- [ ] Non-admin cannot modify gift shop
- [ ] Teacher can reset own class students
- [ ] Teacher cannot reset other class students
- [ ] No `actorUsername` in request bodies

### Vấn Đề #3 (Password Hashing)
- [ ] New passwords use PBKDF2
- [ ] Old passwords still work (lazy migration)
- [ ] Login upgrades old hash to new hash
- [ ] Password reset uses new hash
- [ ] Verify function works correctly
- [ ] Migration progress tracked

---

## 📞 Quyết Định Cần Thiết

Trước khi bắt đầu, cần quyết định:

1. **Thời điểm triển khai:**
   - Có thể schedule downtime không?
   - Thời gian nào ít users nhất?

2. **Backward compatibility:**
   - Có cần support old API clients không?
   - Mobile apps có cần update không?

3. **Migration strategy:**
   - Force password reset hay lazy migration?
   - Thời gian chuyển đổi bao lâu?

4. **Communication plan:**
   - Thông báo cho users như thế nào?
   - Support team cần training gì?

---

**Người tạo:** Claude (Security Audit)  
**Ngày cập nhật:** 2026-05-05  
**Trạng thái:** Chờ phê duyệt
