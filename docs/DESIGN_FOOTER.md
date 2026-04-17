# 🎨 DESIGN: Footer "Green Meadow"

**Ngày tạo:** 17/04/2026
**Trạng thái:** Chờ triển khai
**Dựa trên:** [implementation_plan.md](file:///C:/Users/Administrator/.gemini/antigravity/brain/b0a663b1-6dd9-4c40-a283-03f283ff3e3c/implementation_plan.md)

---

## 1. Cấu trúc và Phong cách (Visual Style)

| Đặc điểm | Chi tiết thiết kế |
|----------|-------------------|
| **Background** | `rgba(220, 252, 231, 0.7)` (Xanh lá cực nhạt) kết hợp `backdrop-filter: blur(12px)`. |
| **Border Top** | `1px solid rgba(255, 255, 255, 0.3)`. |
| **Typography** | Font Family: `'Baloo 2', sans-serif`. |
| **Text Colors** | Tiêu đề: `#064E3B` (Emerald đậm) / Văn bản: `#166534`. |
| **Action Colors** | Hover Link: `#16a34a` (Green-600) / Icon bg: `rgba(255, 255, 255, 0.5)`. |

---

## 2. Các màn hình ảnh hưởng

- **Landing Page**: Footer sẽ hiển thị đè lên ảnh nền `/meadow-bg.png` với hiệu ứng mờ.
- **Trang Dashboard & Nội dung**: Footer hiển thị trên nền trắng (`#F8F9FB`) vẫn đảm bảo độ tương phản xanh lá/trắng.

---

## 3. Checklist Kiểm Tra (Acceptance Criteria)

### Tính năng: Hiện đại hóa Footer
- [ ] Áp dụng đúng màu nền Glassmorphism.
- [ ] Toàn bộ text chuyển sang phông Baloo 2.
- [ ] Màu sắc logo khớp với Header (`#1e3a8a` & `#FACC15`).
- [ ] Các icon Social Media chuyển sang màu xanh lá khi hover.
- [ ] Không làm gãy layout trên thiết bị di động (Mobile Responsive).

---
*Thiết kế bởi Antigravity Solution Designer*
