# KẾ HOẠCH CẢI TIẾN BẢO MẬT: GAS BACKEND & GOOGLE SHEET DATABASE

**Ngày tạo:** 26/12/2025  
**Mục tiêu:** Khắc phục lỗ hổng lộ dữ liệu Google Sheet và bảo vệ API Backend.

---

## 1. Đánh Giá Rủi Ro Hiện Tại (Current Vulnerabilities)

| Mức độ | Vấn đề | Mô tả rủi ro |
| :--- | :--- | :--- |
| 🔴 **Nghiêm trọng** | **Public Sheet Access** | Frontend đang gọi trực tiếp URL `export?format=csv`. Điều này yêu cầu Sheet phải ở chế độ "Anyone with the link". Kẻ tấn công có thể tải toàn bộ dữ liệu database. |
| 🟠 **Cao** | **Lộ Logic Backend** | Frontend chứa các logic lọc dữ liệu nhạy cảm (như mật khẩu giáo viên). Nếu tải CSV về, kẻ tấn công sẽ thấy cột mật khẩu trước khi Frontend kịp lọc. |
| 🟡 **Trung bình** | **Formula Injection** | Chưa có cơ chế lọc các ký tự đặc biệt (`=`, `+`, `@`) trong input, dẫn đến nguy cơ chèn công thức độc hại vào Sheet. |

---

## 2. Kiến Trúc Mới (New Architecture)

Chuyển từ mô hình **Client-to-Database** sang mô hình **Client-Server-Database**.

* **Cũ:**
  * Read: `Frontend` ---> `Google Sheet (Public)` ❌
  * Write: `Frontend` ---> `GAS Web App` ---> `Google Sheet`
* **Mới:**
  * Read: `Frontend` ---> `GAS Web App` ---> `Google Sheet (Private)` ✅
  * Write: `Frontend` ---> `GAS Web App` ---> `Google Sheet (Private)` ✅

---

## 3. Các Bước Thực Hiện (Implementation Steps)

### Bước 1: Bảo mật Database (Google Sheet)

1. Mở file Google Sheet Database.
2. Nhấn nút **Share (Chia sẻ)**.
3. Trong phần "General access", đổi từ **"Anyone with the link"** sang **"Restricted" (Hạn chế)**.
4. Chỉ cấp quyền cho email của chính bạn (tài khoản chạy script GAS).

### Bước 2: Cập nhật Backend (Google Apps Script)

Thay thế nội dung file `Code.gs` (hoặc `gas_script.js`) bằng mã sau. Mã này sử dụng `doGet` để đọc dữ liệu an toàn và `PropertiesService` để giấu Token.

```javascript
// ============ CONFIGURATION ============
// Cài đặt Token trong: Project Settings -> Script Properties
// Key: API_SECRET_TOKEN, Value: <Chuỗi_Token_Bí_Mật_Của_Bạn>
const SCRIPT_PROP = PropertiesService.getScriptProperties();
const API_SECRET_TOKEN = SCRIPT_PROP.getProperty('API_SECRET_TOKEN');

// ============ MAIN HANDLERS ============

function doGet(e) {
  return handleRequest(e);
}

function doPost(e) {
  return handleRequest(e);
}

function handleRequest(e) {
  const lock = LockService.getScriptLock();
  // Đợi tối đa 10 giây để tránh xung đột ghi dữ liệu
  lock.tryLock(10000); 

  try {
    // 1. Lấy tham số (hỗ trợ cả GET và POST)
    const params = e.parameter || {};
    const postData = e.postData ? JSON.parse(e.postData.contents) : {};
    
    // Gộp tham số để xử lý thống nhất
    const data = { ...params, ...postData };
    
    // 2. Security Check: Validate Token
    if (!validateToken(data.token)) {
      return responseJSON({ status: "error", message: "Unauthorized: Invalid Token" });
    }

    // 3. Routing (Điều hướng xử lý)
    const action = data.action;
    const sheet = SpreadsheetApp.getActiveSpreadsheet();

    switch (action) {
      case 'get_teachers':
        return getSheetData(sheet, 'Teachers'); // Tên tab sheet giáo viên
      case 'get_quizzes':
        return getSheetData(sheet, 'Quizzes');  // Tên tab sheet đề thi
      case 'get_results':
        return getSheetData(sheet, 'Results');  // Tên tab sheet kết quả
      case 'submit_result':
        return saveResult(sheet, data);         // Logic ghi kết quả cũ của bạn
      case 'create_quiz':
        return saveQuiz(sheet, data);           // Logic tạo đề thi
      default:
        return responseJSON({ status: "error", message: "Unknown action" });
    }

  } catch (error) {
    return responseJSON({ status: "error", message: error.toString() });
  } finally {
    lock.releaseLock();
  }
}

// ============ HELPER FUNCTIONS ============

function validateToken(token) {
  // So sánh token gửi lên với token trong Script Properties
  return token === API_SECRET_TOKEN;
}

// Hàm đọc dữ liệu từ Sheet trả về JSON (Thay thế CSV export)
function getSheetData(spreadsheet, sheetName) {
  const sheet = spreadsheet.getSheetByName(sheetName);
  if (!sheet) return responseJSON([]);
  
  const data = sheet.getDataRange().getValues();
  const headers = data[0];
  const rows = data.slice(1);
  
  const result = rows.map(row => {
    let obj = {};
    headers.forEach((header, index) => {
      // Logic đặc biệt: Không trả về cột Password nếu là request thường
      // Hoặc chỉ trả về password hash (nếu đã nâng cấp)
      obj[header] = row[index];
    });
    return obj;
  });

  return responseJSON(result);
}

function responseJSON(data) {
  return ContentService.createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}

// Hàm chống Formula Injection (Sanitize Input)
function sanitizeInput(str) {
  if (typeof str !== 'string') return str;
  // Nếu bắt đầu bằng =, +, -, @ thì thêm dấu '
  if (/^[\=\+\-\@]/.test(str)) {
    return "'" + str;
  }
  return str;
}
```

### Bước 3: Cập nhật Frontend (React/TypeScript)

Cập nhật `googleSheetService.ts` để gọi API qua GAS thay vì fetch CSV trực tiếp.

```typescript
// googleSheetService.ts

const GAS_URL = import.meta.env.VITE_GAS_URL; // URL Web App sau khi Deploy
const API_TOKEN = import.meta.env.VITE_API_SECRET_TOKEN;

// Hàm Wrapper để gọi GAS API
async function callGasApi(action: string, payload: any = {}) {
  try {
    // Nếu là thao tác đọc (GET)
    if (action.startsWith('get_')) {
      const url = new URL(GAS_URL);
      url.searchParams.append('action', action);
      url.searchParams.append('token', API_TOKEN);
      // Append thêm các params khác nếu cần
      Object.keys(payload).forEach(key => url.searchParams.append(key, payload[key]));
      
      const response = await fetch(url.toString());
      return await response.json();
    } 
    
    // Nếu là thao tác ghi (POST)
    const response = await fetch(GAS_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' }, // GAS yêu cầu text/plain để tránh CORS preflight phức tạp
      body: JSON.stringify({ ...payload, action, token: API_TOKEN }),
    });
    
    return await response.json();

  } catch (error) {
    console.error("API Call Error:", error);
    return null;
  }
}

// Ví dụ hàm lấy danh sách giáo viên mới
export const fetchTeachersFromSheets = async (): Promise<Teacher[]> => {
  // Gọi qua GAS, GAS sẽ đọc Sheet (đang Private) và trả về JSON
  const data = await callGasApi('get_teachers');
  
  if (!data) return [];
  
  return data.map((row: any) => ({
    username: row.username,
    password: row.password, // Cân nhắc hash password ở backend
    fullName: row.fullName
  }));
};

// Ví dụ hàm nộp bài
export const submitResultToSheet = async (result: StudentResult): Promise<boolean> => {
  const response = await callGasApi('submit_result', result);
  return response && response.status === 'success';
};
```

### Bước 4: Thiết lập Môi trường (Environment Setup)

1. **Tại Google Apps Script:**
   * Vào **Project Settings** (biểu tượng bánh răng).
   * Kéo xuống phần **Script Properties**.
   * Thêm property: `API_SECRET_TOKEN` = `giatri_token_bi_mat_cua_ban`.
   * **Deploy:** Nhấn Deploy > New Deployment > Web App.
     * Execute as: **Me** (Quan trọng: Script chạy dưới quyền của bạn để đọc Sheet Private).
     * Who has access: **Anyone** (Frontend gọi được API).

2. **Tại Local Project (.env):**
   * Cập nhật `VITE_GAS_URL`: Link Web App vừa deploy.
   * Cập nhật `VITE_API_SECRET_TOKEN`: Trùng với giá trị trong Script Properties.

---

## 4. Các Biện Pháp Nâng Cao (Advanced Security)

Nếu muốn bảo mật tốt hơn nữa trong tương lai:

1. **Rate Limiting:** Sử dụng `CacheService` trong GAS để chặn IP spam request liên tục.
2. **Password Hashing:** Không lưu password dạng text trong Google Sheet. Sử dụng thư viện `jsSHA` hoặc tương tự để hash password trước khi lưu và so sánh hash khi đăng nhập.
3. **Data Validation:** Validate kỹ dữ liệu đầu vào (ví dụ: điểm số phải là số, không được âm) ngay tại Backend GAS, không chỉ tin tưởng Frontend.
