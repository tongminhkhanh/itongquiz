# Phase 02: Frontend Core & Authentication
**Status:** ⬜ Chưa bắt đầu
**Dependencies:** Phase 01

---

## Mục tiêu
Cho phép học sinh đăng nhập/đăng ký. Lưu trạng thái phiên làm việc. Bảo vệ các trang cần đăng nhập.

## Tasks

### 1. Tạo Store: `useUserStore` (Zustand)
- [ ] File: `src/stores/useUserStore.ts`
- [ ] State: `user`, `pet`, `isLoggedIn`, `isLoading`
- [ ] Actions: `login()`, `register()`, `logout()`, `updateGameState()`
- [ ] Persist: Lưu vào `localStorage` để không mất khi refresh

### 2. Tạo Service: `authService.ts`
- [ ] File: `src/services/authService.ts`
- [ ] Hàm: `loginUser(username, password)` → Gọi GAS API
- [ ] Hàm: `registerUser(username, password, fullname, class)` → Gọi GAS API
- [ ] Hàm: `updateGameState(username, addExp, addCoins)` → Gọi GAS API
- [ ] Error handling: Trả lỗi rõ ràng (sai mật khẩu, username trùng...)

### 3. UI: Màn hình Đăng Nhập (`LoginScreen`)
- [ ] File: `src/components/student/LoginScreen.tsx`
- [ ] Form: Username + Password + Nút "Đăng nhập"
- [ ] Link: "Chưa có tài khoản? Đăng ký"
- [ ] Validation: Không để trống, hiện lỗi nếu sai
- [ ] Style: Thân thiện với trẻ em (màu sắc tươi sáng, icon dễ thương)

### 4. UI: Màn hình Đăng Ký (`RegisterScreen`)
- [ ] File: `src/components/student/RegisterScreen.tsx`
- [ ] Form: Username + Password + Tên hiển thị + Lớp
- [ ] Chọn Pet ban đầu (Mèo/Chó/Thỏ) + Đặt tên cho Pet
- [ ] Style: Giống LoginScreen, có preview Pet đã chọn

### 5. Navigation: Bảo vệ trang
- [ ] Cập nhật `App.tsx`: Nếu chưa đăng nhập → Hiện LoginScreen
- [ ] Nếu đã đăng nhập → Vào Dashboard (trang chủ mới)
- [ ] Nút "Đăng xuất" ở header
- [ ] Chế độ "Khách" (Guest): Cho phép làm bài không cần đăng nhập, nhưng không lưu EXP

## Files cần tạo/sửa
| File | Hành động |
|------|-----------|
| `src/stores/useUserStore.ts` | NEW |
| `src/services/authService.ts` | NEW |
| `src/components/student/LoginScreen.tsx` | NEW |
| `src/components/student/RegisterScreen.tsx` | NEW |
| `src/App.tsx` | MODIFY - Thêm auth flow |

## Cách kiểm tra Phase xong chưa
- [ ] Mở app → Hiện màn hình đăng nhập
- [ ] Đăng ký tài khoản mới → Thành công, vào Dashboard
- [ ] Tắt app, mở lại → Vẫn đăng nhập (localStorage)
- [ ] Bấm Đăng xuất → Quay về màn hình Login
- [ ] Nhập sai mật khẩu → Hiện lỗi rõ ràng

---
**Next Phase:** [Phase 03 - Gamification UI](./phase-03-gamification-ui.md)
