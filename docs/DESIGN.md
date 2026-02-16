# 🎨 DESIGN: HỆ THỐNG AVATAR HỌC SINH

**Ngày tạo:** 15/02/2026
**Mục tiêu:** Cho phép học sinh thay đổi avatar cá nhân hóa, hiển thị trên Header và Bảng xếp hạng.

---

## 1. CÁCH LƯU THÔNG TIN (DATABASE / GOOGLE SHEETS)

### Bảng `Students` (Google Sheets)
Chúng ta sẽ thêm một cột `Avatar` vào bảng dữ liệu học sinh hiện tại.

| Cột | Tên | Kiểu dữ liệu | Mô tả |
|---|---|---|---|
| A | `id` | String | ID học sinh |
| B | `username` | String | |
| C | `password` | String | Hash |
| D | `fullName` | String | |
| E | `classId` | String | |
| F | `parentPhone` | String | |
| **G** | **`avatar`** | **String** | **Lưu mã avatar (ví dụ: `cat`, `dog`, `robot`...)** |

**Lưu ý:**
- Dữ liệu lưu là **string Key** (không phải URL đầy đủ) để gọn nhẹ.
- Frontend sẽ có một file config map `Key` -> `URL ảnh`.

---

## 2. API SPECIFICATION (Google Apps Script)

### Cần cập nhật Script GAS để hỗ trợ:

#### 2.1. `update_student_avatar` (Mới)
Cập nhật avatar cho học sinh.

- **Method:** POST
- **Payload:**
  ```json
  {
    "action": "update_student_avatar",
    "studentId": "student_123",
    "avatar": "cat_3d"
  }
  ```
- **Response:**
  ```json
  {
    "status": "success",
    "data": { "avatar": "cat_3d" }
  }
  ```

#### 2.2. Cập nhật `get_students` & `student_login`
Sửa script hiện có để trả về thêm trường `avatar` trong object `Student` và `StudentSession`.

---

## 3. FRONTEND IMPLEMENTATION FLOW

### 3.1. Danh sách Avatar (Config)
Tạo file `src/config/avatars.ts` chứa danh sách các Sticker 3D (Fluent Emoji) được phép chọn:
- Động vật: Mèo, Chó, Gấu, Cú...
- Nhân vật: Robot, Alien, Ghost...
- Biểu cảm: Cười, Ngầu, Heart eyes...

### 3.2. User Interface (UI)

#### A. Header (Trạng thái đăng nhập)
- Hiển thị Avatar hiện tại bên cạnh tên học sinh.
- Nếu chưa có avatar -> Hiển thị icon mặc định (User circle).
- Click vào Avatar -> Mở Modal chọn Avatar.

#### B. Modal Chọn Avatar
- Tiêu đề: "Chọn Avatar của em!"
- Lưới (Grid) các sticker avatar đẹp mắt.
- Avatar đang chọn được highlight viền cam.
- Nút "Lưu thay đổi".

#### C. Bảng Xếp Hạng (Leaderboard)
- Thay thế icon mặc định bằng Avatar của học sinh.
- Làm cho bảng xếp hạng sinh động hơn nhiều.

### 3.3. Logic Update
1.  Học sinh chọn avatar và bấm Lưu.
2.  Frontend gọi API `update_student_avatar`.
3.  Nếu thành công -> Cập nhật Store (`studentSession`) -> UI tự động đổi avatar mới.
4.  Nếu thất bại -> Báo lỗi "Không lưu được avatar, thử lại sau nhé!".

---

## 4. CHECKLIST KIỂM TRA

### Tính năng: Đổi Avatar
- [ ] Học sinh click vào avatar trên header mở được modal.
- [ ] Modal hiển thị danh sách sticker đẹp.
- [ ] Chọn một sticker -> Sticker được highlight.
- [ ] Bấm Lưu -> Gọi API thành công.
- [ ] Sau khi lưu, Header cập nhật avatar mới ngay lập tức.
- [ ] F5 lại trang vẫn giữ nguyên avatar mới.
- [ ] Vào Bảng xếp hạng thấy avatar mới của mình.

---

## 5. KẾ HOẠCH TRIỂN KHAI (NEXT STEPS)

1.  **Backend:** Cập nhật script Google Apps Script (Thêm cột & API).
2.  **Frontend:** Tạo file config avatar & Modal chọn avatar.
3.  **Integration:** Ghép API vào Modal.
4.  **Polish:** Hiệu ứng confetti khi đổi avatar thành công! 🎉
