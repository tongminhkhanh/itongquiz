# 🎨 DESIGN: School Information Pages (Soft Nature Breeze)

**Ngày tạo:** 2026-04-17
**Phiên bản:** 1.0
**Dựa trên:** Phương án 2 - Brainstorm Phase

---

## 1. Design System Tokens

| Thành phần | Giá trị | Tailwind Class |
|-----------|---------|----------------|
| **Nền trang** | Emerald White | `bg-[#F8FAF9]` |
| **Màu chính** | Emerald Green | `text-[#064E3B]` |
| **Màu nhấn** | Fresh Lime | `bg-[#82CD47]` |
| **Typography**| Baloo 2 | `font-['Baloo_2']` |
| **Bo góc**    | Extra Large | `rounded-[2.5rem]` |
| **Đổ bóng**   | Soft Nature | `shadow-[0_8px_30px_rgb(0,0,0,0.04)]` |

---

## 2. Cấu trúc trang (Page Structure)

### AboutPage.tsx
1.  **Header**: Glassmorphism (đã có), update font & link colors.
2.  **Hero Section**:
    - Nền: Gradient `from-emerald-500 to-green-600`.
    - Content: Giọng văn thân thiện, font Baloo 2 trắng.
3.  **Core Values**:
    - 3 cột: Tầm nhìn - Sứ mệnh - Giá trị.
    - Style: Thẻ trắng, bo góc 40px, icon màu emerald nhạt.
4.  **Timeline**: 
    - Các mốc thời gian nằm trong mảng màu `green-50`.
5.  **Gallery**:
    - Grid 3 cột, ảnh bo góc tròn, hiệu ứng hover phóng to nhẹ.

### ContactPage.tsx
1.  **Contact Banner**: Tối giản, nội dung "Hãy kết nối với chúng tôi".
2.  **Info Cards**: 2 cột (Bản đồ & Kênh liên hệ).
3.  **Form**: 
    - Input: `rounded-2xl border-green-100 bg-white`.
    - Button: `bg-[#064E3B] hover:bg-emerald-700`.

---

## 3. Checklist Kiểm tra (Acceptance Criteria)

- [ ] Phông chữ Baloo 2 hiển thị đúng trên Android & iOS.
- [ ] Không còn sự xuất hiện của các mã màu xanh dương (`blue-x00`).
- [ ] Các thành phần Interactive (Button, Link) có trạng thái hover rõ ràng.
- [ ] Khoảng cách (Spacing) rộng rãi, dễ đọc.

---

*Thiết kế bởi itongquiz1 - Design Workflow*
