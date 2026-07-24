# Student Dropdown Menu Overflow Design

## Problem

Trong bài làm học sinh, câu hỏi `DROPDOWN` có đáp án chứa công thức Toán dùng component tùy chỉnh `LatexDropdown`. Danh sách lựa chọn hiện được render bằng `position: absolute` bên trong `.question-renderer-shell`, trong khi shell có `overflow-hidden`. Khi menu mở gần mép dưới thẻ câu hỏi, phần danh sách vượt ra ngoài shell bị cắt và học sinh không đọc hoặc chọn được đáp án.

Dropdown không chứa LaTeX dùng thẻ `<select>` gốc của trình duyệt nên không chịu clipping theo cách này.

## Goal

Menu đáp án LaTeX phải luôn hiển thị đầy đủ trong viewport, không bị `overflow-hidden` của thẻ câu hỏi cắt, vẫn chọn được đáp án và vẫn đóng khi click ra ngoài.

## Selected Approach

Render menu tùy chỉnh bằng React Portal vào `document.body` và dùng `position: fixed` theo vị trí nút kích hoạt.

Khi mở menu:

1. Đọc `getBoundingClientRect()` của nút dropdown.
2. Đo kích thước menu và khoảng trống phía trên/phía dưới viewport.
3. Mở xuống dưới theo mặc định; nếu khoảng trống dưới không đủ và phía trên rộng hơn thì mở lên trên.
4. Giới hạn `left`, `maxWidth` và `maxHeight` để menu không vượt viewport.
5. Cập nhật lại vị trí khi cửa sổ resize hoặc bất kỳ vùng cuộn tổ tiên nào scroll.

## Component Boundaries

### `LatexDropdown.tsx`

- Giữ nguyên đường `<select>` gốc khi options không chứa LaTeX.
- Với options chứa LaTeX, nút kích hoạt vẫn nằm trong luồng văn bản hiện tại.
- Menu `role="listbox"` được portal vào `document.body`.
- Dùng riêng `triggerRef` và `menuRef` để click trong portal không bị nhận nhầm là click ngoài.
- Không thay đổi signature `options`, `value`, `onChange`, `placeholder`, `className`.

### `QuestionRenderer`

Không bỏ `overflow-hidden`. Thuộc tính này đang bảo vệ bo góc và clipping cho các dạng câu khác; portal giải quyết lỗi tại đúng nguồn mà không mở rộng blast radius.

## Accessibility

- Nút giữ `aria-haspopup="listbox"` và `aria-expanded`.
- Menu giữ `role="listbox"`.
- Mỗi đáp án giữ `role="option"` và `aria-selected`.
- Click ngoài cả trigger và menu đóng dropdown.

## Testing

### Vitest

- Tái hiện dropdown LaTeX bên trong container `overflow-hidden`.
- Sau khi mở, listbox phải là con trực tiếp của `document.body` và không nằm trong question shell.
- Click một option trong portal phải gọi `onChange` và đóng menu.
- Dropdown văn bản thường vẫn render `<select>`.

### Cypress Component

- Render `QuestionRenderer` gần đáy viewport với câu `DROPDOWN` chứa công thức.
- Mở menu và xác nhận menu nhìn thấy, không nằm trong `.question-renderer-shell`, không vượt viewport.
- Khi không đủ chỗ phía dưới, menu mở phía trên trigger.
- Chọn đáp án và xác nhận trạng thái hiển thị được cập nhật.

## Non-goals

- Không thay đổi schema câu hỏi hoặc dữ liệu đáp án.
- Không thay đổi logic chấm điểm.
- Không đổi UI của dropdown không chứa LaTeX.
- Không thêm dependency mới.
