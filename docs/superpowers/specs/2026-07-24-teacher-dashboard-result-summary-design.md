# Thiết kế sửa thống kê kết quả trên Dashboard giáo viên

## Trạng thái

Đã được người dùng phê duyệt ngày 24/07/2026.

## Bối cảnh

Dashboard hiện lấy dữ liệu từ `GET /api/results`, trong khi endpoint này phân trang và mặc định chỉ trả 100 bản ghi. Frontend bỏ qua `meta.total` rồi tính toàn bộ card và biểu đồ từ mảng 100 bản ghi vừa nhận. Vì vậy production đang có 285 lượt nộp nhưng Dashboard hiển thị 100; điểm trung bình, tỷ lệ đạt, số học sinh và phân bố điểm cũng chỉ phản ánh 100 lượt mới nhất.

Bảng `results` lưu mỗi lần nộp thành một dòng. Một học sinh có thể làm lại cùng một bài, vì thế phải tách hai khái niệm:

- **Thống kê hoạt động:** đếm mọi lượt nộp.
- **Kết quả học tập:** mỗi học sinh trên mỗi bài chỉ lấy lần nộp cuối cùng.

## Quyết định nghiệp vụ

1. Card giữ một ô duy nhất:
   - Nhãn: `Tổng lượt nộp`
   - Giá trị: toàn bộ lượt nộp trong phạm vi quyền
   - Chú thích: `{số bài hoàn thành} bài hoàn thành · {số lượt hôm nay} lượt hôm nay`
2. Điểm trung bình, trung vị, tỷ lệ đạt, cao nhất, thấp nhất và biểu đồ dùng **lần nộp cuối cùng** của mỗi học sinh trên mỗi bài.
3. Phạm vi được suy ra từ phiên đăng nhập:
   - Admin: toàn trường.
   - Giáo viên: các lớp có `teacher_username` tương ứng.
4. Không nhận tên giáo viên hoặc danh sách lớp từ frontend.
5. Ngày “hôm nay” dùng múi giờ `Asia/Ho_Chi_Minh` (UTC+7), không phụ thuộc múi giờ máy chủ hoặc trình duyệt.

## Kiến trúc được chọn

Tạo endpoint tổng hợp riêng:

```text
GET /api/results/summary
```

Danh sách chi tiết tiếp tục dùng endpoint phân trang hiện tại:

```text
GET /api/results?page=1&limit=100
```

Dashboard không tải toàn bộ kết quả về trình duyệt để tính thống kê. D1 tính tổng hợp ở backend và trả một payload nhỏ, ổn định khi số dữ liệu tăng.

## Hợp đồng API

Tạo `shared/result-summary.contract.ts` để backend, service frontend và component dùng chung kiểu dữ liệu.

```ts
export interface ResultScoreBucket {
  range: '0-2' | '3-4' | '5-6' | '7-8' | '9-10';
  count: number;
  percentage: number;
}

export interface ResultSummaryStatistics {
  totalResults: number;
  mean: number;
  median: number;
  stdDev: number;
  min: number;
  max: number;
  passRate: number;
  passCount: number;
  failCount: number;
  scoreDistribution: ResultScoreBucket[];
}

export interface ResultDashboardSummary {
  totalSubmissions: number;
  uniqueCompletedWorks: number;
  todaySubmissions: number;
  uniqueStudents: number;
  statistics: ResultSummaryStatistics;
  attemptPolicy: 'latest';
  timezone: 'Asia/Ho_Chi_Minh';
}

export interface ResultDashboardSummaryResponse {
  data: ResultDashboardSummary;
}
```

Response không chứa dữ liệu cá nhân hoặc danh sách bài làm; chỉ có các tổng số đã được phân quyền.

## Khóa nhận diện nghiệp vụ

### Học sinh

Ưu tiên:

```text
id:<trim(student_id)>
```

Dữ liệu cũ thiếu `student_id` dùng khóa dự phòng:

```text
legacy:<lower(trim(student_name))>|<lower(trim(class_name))>
```

Cách này tránh gộp hai học sinh cùng tên nhưng khác lớp, đồng thời vẫn tương thích dữ liệu legacy.

### Bài học sinh thực hiện

Ưu tiên:

```text
assignment:<trim(assignment_id)>
```

Kết quả luyện tập hoặc dữ liệu cũ không có `assignment_id` dùng:

```text
quiz:<trim(quiz_id)>
```

Trường hợp dữ liệu bất thường thiếu cả hai dùng `result:<id>` để không làm mất bản ghi.

Một “bài hoàn thành duy nhất” được xác định bởi cặp:

```text
(student_key, work_key)
```

## Cách chọn lần nộp cuối cùng

Dùng cửa sổ SQL:

```sql
ROW_NUMBER() OVER (
  PARTITION BY student_key, work_key
  ORDER BY submitted_at DESC, id DESC
) AS attempt_rank
```

Chỉ các dòng có `attempt_rank = 1` được dùng cho thống kê học tập. `id DESC` là khóa phụ bảo đảm kết quả xác định khi hai bản ghi có cùng thời điểm.

## Các chỉ số

### Thống kê hoạt động

Tính trên toàn bộ bản ghi trong phạm vi quyền:

- `totalSubmissions`: `COUNT(*)`.
- `uniqueCompletedWorks`: số cặp `(student_key, work_key)` khác nhau.
- `todaySubmissions`: số bản ghi có `submitted_at` nằm trong ngày hiện tại tại Việt Nam.
- `uniqueStudents`: số `student_key` khác nhau.

### Thống kê học tập

Tính trên tập lần nộp cuối cùng:

- `totalResults`: số bài hoàn thành duy nhất có lần cuối được chọn.
- `mean`, `median`, `stdDev`.
- `min`, `max`.
- `passCount`, `failCount`, `passRate`, với mốc đạt `score >= 5`.
- Phân bố điểm:
  - `0-2`: `0 <= score < 3`
  - `3-4`: `3 <= score < 5`
  - `5-6`: `5 <= score < 7`
  - `7-8`: `7 <= score < 9`
  - `9-10`: `9 <= score <= 10`

Điểm không hữu hạn hoặc ngoài `[0, 10]` không được dùng cho thống kê học tập; các bản ghi đó vẫn thuộc tổng lượt hoạt động để không che giấu dữ liệu cần kiểm tra.

## Phân quyền

Route xác thực bằng session JWT hiện tại.

- Chỉ `teacher` và `admin` được gọi endpoint summary.
- Giáo viên bị giới hạn bằng:

```sql
class_name IN (
  SELECT name FROM classes WHERE teacher_username = ?
)
```

- Admin không thêm điều kiện lớp.
- Student nhận `403` trước khi truy vấn tổng hợp.

## Luồng frontend

`useTeacherDashboardBootstrap` tải song song:

1. Danh sách kết quả phân trang cho bảng và phần “Bài vừa nộp”.
2. Summary cho card và biểu đồ.

State summary riêng gồm:

- `resultSummary`
- `summaryLoadState`
- `summaryLoadError`

Không fallback sang `quizStore.results.length` khi summary lỗi, vì fallback đó tái tạo lỗi số 100. Khi refresh thất bại nhưng đã có summary cũ, giữ dữ liệu cũ và hiển thị cảnh báo. Lần tải đầu thất bại hiển thị trạng thái lỗi và cho phép thử lại.

## Thay đổi giao diện

- `Số bài đã nộp` đổi thành `Tổng lượt nộp`.
- Helper đổi thành `{uniqueCompletedWorks} bài hoàn thành · {todaySubmissions} lượt hôm nay`.
- Card “Học sinh tham gia” lấy `uniqueStudents` từ backend.
- Hero dùng số hôm nay, tỷ lệ đạt và học sinh từ summary.
- `PerformancePanel` hiển thị:

```text
Tổng hợp từ {statistics.totalResults} bài hoàn thành; mỗi bài lấy lần nộp cuối cùng.
```

- Giữ nguyên bố cục, màu sắc, điều hướng và card count hiện tại.

## Xử lý lỗi

- Lỗi danh sách kết quả: phần bài gần đây và tab kết quả báo lỗi như hiện tại.
- Lỗi summary: card/biểu đồ không giả định dữ liệu trang đầu là toàn bộ; hiển thị cảnh báo và nút thử lại.
- Retry tải lại cả danh sách và summary để dữ liệu đồng bộ.
- Backend dùng helper lỗi hiện tại, không trả thông tin SQL/D1 ra ngoài.

## Hiệu năng

Endpoint summary không trả danh sách chi tiết. Truy vấn dùng CTE và window function trên tập dữ liệu đã phân quyền. Bổ sung index phục vụ truy vấn chỉ khi đo đạc cho thấy cần thiết; thay đổi này không yêu cầu migration ngay vì production hiện có vài trăm bản ghi và D1 xử lý nhanh.

Không tăng `limit` hoặc tải nhiều trang để tính tại frontend.

## Kiểm thử bắt buộc

### Backend

- Admin thấy toàn trường.
- Giáo viên chỉ thấy lớp mình quản lý và username được bind vào SQL.
- Student bị từ chối.
- Nhiều lần nộp cùng bài chỉ lấy lần cuối cho điểm nhưng vẫn tính đủ tổng lượt.
- Dữ liệu thiếu `student_id` và `assignment_id` dùng fallback đúng.
- Hai học sinh cùng tên ở hai lớp được tính riêng.
- Điểm thập phân 2.5, 4.5, 6.5, 8.5 vào đúng nhóm.
- Bản ghi sát 0 giờ được tính theo ngày Việt Nam.
- Tập rỗng trả tất cả chỉ số bằng 0 và đủ năm bucket.

### Frontend

- Route registry ánh xạ `get_results_summary` đúng.
- Bootstrap tải summary cùng kết quả và giữ lỗi riêng.
- Dashboard hiển thị payload summary thay vì độ dài mảng local.
- Card có nhãn và helper mới.
- Biểu đồ/copy nêu rõ lần nộp cuối cùng.
- Retry gọi lại cả hai nguồn.
- Không fallback về 100 khi local result array chỉ có 100 bản ghi nhưng summary lớn hơn.

## Ngoài phạm vi

- Không sửa dữ liệu production.
- Không backfill `student_id` hoặc `assignment_id` trong thay đổi này.
- Không thay đổi chính sách `max_attempts`.
- Không thay đổi tab kết quả chi tiết hoặc phân trang hiện tại.
- Không deploy production hoặc merge `main` tự động.

## Tiêu chí nghiệm thu

1. Với snapshot production đã kiểm tra, summary toàn trường trả `totalSubmissions = 285`, `uniqueCompletedWorks = 188`, `todaySubmissions = 0` tại thời điểm đối chiếu.
2. Dashboard không còn phụ thuộc vào giới hạn 100 của endpoint danh sách.
3. Toàn bộ thống kê học tập sử dụng lần nộp cuối cùng.
4. Phân quyền admin/teacher được thực thi ở backend.
5. Test liên quan, Worker typecheck, build và security checks đạt; mọi lỗi baseline ngoài phạm vi được ghi rõ.
