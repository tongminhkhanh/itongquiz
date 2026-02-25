# Phase 01: Backend & Database
**Status:** ⬜ Chưa bắt đầu
**Dependencies:** Không

---

## Mục tiêu
Tạo cơ sở dữ liệu (Google Sheet) và API (Google Apps Script) để lưu trữ thông tin học sinh, thú cưng, và cửa hàng.

## Tasks

### 1. Tạo Sheet `Users`
- [ ] Tạo sheet mới trong Google Spreadsheet
- [ ] Thêm header: `username | password | fullname | class | coins | createdAt`
- [ ] Thêm 2-3 tài khoản mẫu để test

### 2. Tạo Sheet `UserPets`
- [ ] Tạo sheet mới
- [ ] Thêm header: `username | petId | petName | level | exp | expToNext | mood | items | lastActive`

### 3. Tạo Sheet `ShopItems`
- [ ] Tạo sheet mới
- [ ] Thêm header: `itemId | name | price | type | category | assetUrl`
- [ ] Nhập sẵn 5-10 món đồ mẫu (mũ, kính, cánh...)

### 4. GAS API: Đăng ký (`register`)
- [ ] Thêm action `register` vào `doPost` trong `gas_script.js`
- [ ] Kiểm tra username trùng
- [ ] Tạo dòng mới trong Sheet `Users`
- [ ] Tự động tạo Pet mặc định trong `UserPets` (mèo level 1)
- [ ] Trả về thông tin user + pet

### 5. GAS API: Đăng nhập (`login`)
- [ ] Thêm action `login` vào `doPost`
- [ ] So khớp username + password
- [ ] Trả về thông tin user + pet + items đã mua

### 6. GAS API: Cập nhật Game State (`updateGameState`)
- [ ] Thêm action `updateGameState` vào `doPost`
- [ ] Input: `{ username, addExp, addCoins }`
- [ ] Tính toán: Cộng EXP → Check lên cấp → Update mood
- [ ] Trả về: `{ newLevel, newExp, newCoins, leveledUp: true/false }`

## Files cần sửa/tạo
| File | Hành động |
|------|-----------|
| `gas_script.js` | MODIFY - Thêm 3 actions mới |
| Google Sheet | MODIFY - Thêm 3 sheets mới |

## Cách kiểm tra Phase xong chưa
- [ ] Gọi API register → Tạo được user mới + pet mặc định
- [ ] Gọi API login → Trả về đúng thông tin
- [ ] Gọi API updateGameState → EXP/Coins được cập nhật
- [ ] Khi EXP đủ → Pet tự lên cấp

---
**Next Phase:** [Phase 02 - Frontend Auth](./phase-02-auth.md)
