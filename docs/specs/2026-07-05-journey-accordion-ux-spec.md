# UX spec — Hành trình hôm nay accordion

## Mục tiêu
- Loại bỏ khoảng trắng lớn khi thu gọn card “Hành trình hôm nay”.
- Tăng độ rõ thứ bậc: hành trình hôm nay là cụm ưu tiên cao nhất.
- Giữ dashboard ổn định trên desktop và mobile.

## Layout mới
- Hàng 1: **Hành trình hôm nay** full-width, dạng accordion.
- Hàng 2: grid 2 cột trên desktop.
  - Trái: **Nhiệm vụ tuần**.
  - Phải: **Rương thưởng ngày / Nhịp học tuần này / Sổ huy hiệu**.
- Mobile: mọi card stack theo 1 cột.

## Trạng thái collapsed của “Hành trình hôm nay”
- Luôn hiển thị:
  - tiêu đề,
  - tổng tiến độ hôm nay (`x/y nhiệm vụ`),
  - chuỗi ngày,
  - affordance mở rộng (`Xem chi tiết` + caret).
- Toàn bộ header card bấm được, không chỉ icon.

## Trạng thái expanded
- Mở danh sách nhiệm vụ hôm nay ngay dưới summary.
- Dùng animation nhẹ 180–250ms cho height + opacity.
- Giữ các CTA nhận thưởng ở từng mission như cũ.

## Nguyên tắc UX
- Không để khoảng trống chết khi accordion đóng.
- Summary phải đủ thông tin để người dùng không cần mở card mới biết tình trạng hôm nay.
- Cấu trúc ưu tiên thông tin:
  1. Hành trình hôm nay
  2. Nhiệm vụ tuần
  3. Card hỗ trợ/phần thưởng
