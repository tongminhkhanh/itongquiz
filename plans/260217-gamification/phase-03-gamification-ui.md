# Phase 03: Gamification UI (Phần vui nhất!)
**Status:** ⬜ Chưa bắt đầu
**Dependencies:** Phase 02

---

## Mục tiêu
Tạo giao diện Dashboard mới với Pet sống động, cửa hàng mua đồ, và hiệu ứng phần thưởng.

## Tasks

### 1. Assets: Tạo hình ảnh Pet
- [ ] Tạo 3 loại Pet cơ bản: Mèo 🐱, Chó 🐶, Thỏ 🐰
- [ ] Mỗi loại có 3 cấp hình ảnh:
  - Level 1-3: Baby (nhỏ, dễ thương)
  - Level 4-7: Teen (lớn hơn, có thêm chi tiết)
  - Level 8-10: Adult (oai phong, có hiệu ứng đặc biệt)
- [ ] 3 trạng thái mood: Happy 😊, Sad 😢, Excited 🤩
- [ ] Lưu tại: `public/assets/pets/`
- [ ] Format: SVG hoặc PNG tách nền

### 2. Assets: Tạo phụ kiện (Accessories)
- [ ] 5-10 món đồ ban đầu:
  - 🎩 Mũ phù thủy (50 Vàng)
  - 🕶️ Kính mát (30 Vàng)
  - 🎀 Nơ hồng (20 Vàng)
  - 👑 Vương miện (100 Vàng)
  - 🧣 Khăn quàng (40 Vàng)
- [ ] Lưu tại: `public/assets/accessories/`

### 3. Component: `PetDisplay`
- [ ] File: `src/components/gamification/PetDisplay.tsx`
- [ ] Hiển thị Pet với animation bounce/idle (Framer Motion)
- [ ] Hiệu ứng khi chạm/click: Pet nhảy lên + hearts bay ra
- [ ] Render phụ kiện đang đeo (layer trên Pet)
- [ ] Hiển thị bong bóng thoại ngẫu nhiên ("Hôm nay học gì nè!", "Đi thôi!")

### 4. Screen: Dashboard mới
- [ ] File: `src/components/student/StudentDashboard.tsx`
- [ ] Layout:
  ```
  ┌──────────────────────────────────────┐
  │  👤 Tên bé          💰 150  ⭐ Lv.5 │  ← Header
  ├──────────────────────────────────────┤
  │                                      │
  │         🐱 [PET DISPLAY]            │  ← Pet area
  │         ━━━━━━━━━━━━━━              │  ← EXP bar
  │         EXP: 45/100                  │
  │                                      │
  ├──────────────────────────────────────┤
  │  🟢 VÀO HỌC    🛍️ CỬA HÀNG        │  ← Actions
  │  🏆 BẢNG XẾP HẠNG                  │
  └──────────────────────────────────────┘
  ```
- [ ] Nút "Vào Học" → Mở danh sách bài thi (giữ nguyên code cũ)
- [ ] Responsive: Đẹp trên cả điện thoại và máy tính

### 5. Modal: Cửa hàng (`ShopModal`)
- [ ] File: `src/components/gamification/ShopModal.tsx`
- [ ] Hiển thị danh sách phụ kiện (tên, giá, hình preview)
- [ ] Nút "Mua" → Trừ vàng → Đồ được thêm vào Pet
- [ ] Greyed out nếu không đủ vàng
- [ ] Animation: Confetti khi mua thành công

### 6. Component: EXP Bar & Coin Display
- [ ] File: `src/components/gamification/StatusBar.tsx`
- [ ] Thanh EXP: Animated fill (Framer Motion)
- [ ] Coin: Hiệu ứng số nhảy lên khi được thêm vàng
- [ ] Level badge: Hiệu ứng glow khi lên cấp

## Files cần tạo
| File | Mô tả |
|------|-------|
| `src/components/gamification/PetDisplay.tsx` | NEW - Pet chính |
| `src/components/gamification/ShopModal.tsx` | NEW - Cửa hàng |
| `src/components/gamification/StatusBar.tsx` | NEW - Thanh trạng thái |
| `src/components/student/StudentDashboard.tsx` | NEW - Trang chủ mới |
| `public/assets/pets/` | NEW - Thư mục ảnh Pet |
| `public/assets/accessories/` | NEW - Thư mục phụ kiện |

## Cách kiểm tra Phase xong chưa
- [ ] Đăng nhập → Thấy Dashboard mới với Pet
- [ ] Click vào Pet → Pet nhảy lên
- [ ] Mở Cửa hàng → Thấy danh sách đồ + giá
- [ ] Mua đồ → Pet đeo đồ mới
- [ ] Không đủ vàng → Nút mua bị khóa

---
**Next Phase:** [Phase 04 - Integration](./phase-04-integration.md)
