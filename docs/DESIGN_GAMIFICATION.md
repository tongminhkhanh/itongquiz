# 🎨 DESIGN: Gamification & Student Accounts

**Ngày tạo:** 17/02/2026
**Mục tiêu:** Xây dựng hệ thống tài khoản học sinh kết hợp nuôi thú cưng (Gamification) để tăng hứng thú học tập.

---

## 1. 📊 CÁCH LƯU THÔNG TIN (DATABASE SCHEME)

Hệ thống sẽ sử dụng **Google Sheets** làm cơ sở dữ liệu (Backend). Cần thêm 3 Sheet mới:

### A. Sheet `Users` (Học sinh)
| Cột | Key | Mô tả |
|-----|-----|-------|
| A | `username` | Tên đăng nhập (duy nhất) |
| B | `password` | Mật khẩu (đã mã hóa đơn giản) |
| C | `fullname` | Tên hiển thị của bé |
| D | `class` | Lớp học (VD: 4A) |
| E | `coins` | Tổng số vàng đang có |

### B. Sheet `UserPets` (Thú cưng của bé)
| Cột | Key | Mô tả |
|-----|-----|-------|
| A | `username` | Link với bảng Users |
| B | `petId` | Loại thú cưng (VD: `cat_01`, `dog_01`) |
| C | `level` | Cấp độ hiện tại (1-100) |
| D | `exp` | Kinh nghiệm hiện tại (VD: 450) |
| E | `mood` | Tâm trạng (happy, sad, hungry) |
| F | `items` | JSON danh sách đồ đang mặc (VD: `["hat_01", "glass_02"]`) |

### C. Sheet `ShopItems` (Cửa hàng)
| Cột | Key | Mô tả |
|-----|-----|-------|
| A | `itemId` | Mã món đồ |
| B | `name` | Tên món đồ |
| C | `price` | Giá bán (Vàng) |
| D | `type` | Loại (HEAD, FACE, BODY) |
| E | `assetUrl` | Link ảnh của món đồ |

---

## 2. 📱 DANH SÁCH MÀN HÌNH (SCREENS)

### 1️⃣ Màn hình Đăng Nhập / Đăng Ký
-   **Giao diện:** Đơn giản, nút to, hình ảnh vui nhộn.
-   **Tính năng:**
    -   Đăng nhập bằng Tên + Mật khẩu.
    -   "Quên mật khẩu" (Liên hệ giáo viên).

### 2️⃣ Màn hình Chính (Dashboard) - *Thay thế trang chủ hiện tại*
-   **Trung tâm:** Thú cưng đang đứng/nhảy (Animated).
-   **Thông tin:** Level, Thanh EXP, Số Vàng.
-   **Nút hành động:**
    -   🟢 **VÀO HỌC** (Nút to nhất)
    -   🔵 **Cửa Hàng** (Mua đồ cho Pet)
    -   🟡 **Bảng Xếp Hạng**

### 3️⃣ Màn hình Kết Quả Thi (Update)
-   Sau khi hiện điểm số → Hiện animation:
    -   EXP bay vào thanh kinh nghiệm của Pet.
    -   Vàng rơi vào túi.
    -   Nếu lên cấp → Pet biến hình/bắn pháo hoa.

---

## 3. 🔄 LUỒNG HOẠT ĐỘNG (GAME LOOP)

1.  **Học tập:** Bé làm bài thi → Đúng 1 câu = +10 EXP, +5 Vàng.
2.  **Tiêu dùng:** Bé dùng Vàng mua đồ trong Shop → `coins` giảm, `items` của Pet tăng.
3.  **Chăm sóc:**
    -   Mỗi ngày đăng nhập: Pet vui (`mood = happy`).
    -   Quá 3 ngày không học: Pet buồn (`mood = sad`).
    -   Học bài điểm cao: Pet nhảy múa.

---

## 4. ✅ CHECKLIST KỸ THUẬT

- [ ] **Auth Service:** Viết API trong GAS để check login (`doPost` action `login`).
- [ ] **Sync Service:** Viết API update coin/exp sau mỗi bài thi.
- [ ] **Local State:** Dùng `zustand` để lưu thông tin User/Pet phiên làm việc hiện tại (tránh gọi API quá nhiều).
- [ ] **Assets:** Cần bộ ảnh Pet (SVG hoặc PNG tách nền).

---

*Tạo bởi Antigravity Design Workflow*
