# Phase 04: Integration & Polish
**Status:** ⬜ Chưa bắt đầu
**Dependencies:** Phase 03

---

## Mục tiêu
Kết nối hệ thống làm bài thi hiện có với Gamification. Mỗi câu đúng → Pet nhận thưởng.

## Tasks

### 1. Kết nối Quiz → Rewards
- [ ] Sửa `StudentView.tsx` → Sau khi submit:
  - Tính: `addExp = correctCount * 10`
  - Tính: `addCoins = correctCount * 5`
  - Bonus: Điểm 10 → +50 EXP bonus 🎉
  - Gọi: `useUserStore.updateGameState(addExp, addCoins)`

### 2. Màn hình Kết quả: Hiệu ứng phần thưởng
- [ ] Sửa `ResultScreen/index.tsx`:
  - Sau khi hiện điểm → Hiện animation rewards:
    - Vàng rơi xuống (coin rain animation)
    - Thanh EXP đầy dần
    - Nếu lên cấp → Pháo hoa 🎆 + "Pet đã lên cấp!"
  - Nút: "Về xem Pet" → Quay Dashboard

### 3. Pet mood tự động
- [ ] Khi đăng nhập, check `lastActive`:
  - < 1 ngày: Happy 😊
  - 1-3 ngày: Bình thường 😐
  - > 3 ngày: Sad 😢 + Bong bóng "Nhớ chủ quá!")
  - Sau khi làm bài: Excited 🤩

### 4. Bảng xếp hạng (Leaderboard)
- [ ] File: `src/components/gamification/Leaderboard.tsx`
- [ ] Hiển thị Top 10 theo Level (đọc từ Sheet UserPets)
- [ ] Hiển thị: Hạng + Avatar Pet + Tên + Level
- [ ] Highlight user hiện tại trong bảng
- [ ] GAS API mới: `getLeaderboard` → Trả về top 10

### 5. Polish & Testing
- [ ] Guest mode: Cho phép làm bài không đăng nhập (không lưu EXP)
- [ ] Loading states: Skeleton khi đang tải dữ liệu
- [ ] Error handling: Hiện thông báo thân thiện khi mất mạng
- [ ] Performance: Đảm bảo Dashboard load < 2 giây
- [ ] Responsive: Test trên điện thoại

## Files cần sửa/tạo
| File | Hành động |
|------|-----------|
| `src/components/StudentView.tsx` | MODIFY - Thêm reward logic |
| `src/components/student/ResultScreen/index.tsx` | MODIFY - Thêm reward animation |
| `src/components/gamification/Leaderboard.tsx` | NEW |
| `gas_script.js` | MODIFY - Thêm `getLeaderboard` |

## Cách kiểm tra TOÀN BỘ hệ thống xong chưa
- [ ] Đăng ký → Chọn Pet → Vào Dashboard (có Pet nhảy nhót)
- [ ] Làm bài thi → Kết quả hiện EXP/Vàng bay vào
- [ ] Pet lên cấp → Pháo hoa + hình mới
- [ ] Mua đồ trong Shop → Pet đeo đồ
- [ ] 3 ngày không vào → Pet buồn
- [ ] Bảng xếp hạng hiện đúng top 10
- [ ] Không đăng nhập → Vẫn làm bài được (Guest mode)

---
**🎉 Hoàn thành tất cả 4 Phase = Hệ thống Gamification hoàn chỉnh!**
