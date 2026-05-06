# 🚀 HƯỚNG DẪN TÍCH HỢP TÍNH NĂNG THI TRỰC TIẾP

## 📋 Các Bước Tích Hợp

### **Bước 1: Thêm vào TeacherDashboard**

File: `src/components/TeacherDashboard/index.tsx`

#### **1.1. Thêm lazy import (dòng 30)**

```tsx
const LiveExamTab = React.lazy(() => import('../LiveExam/TeacherLiveExamDashboard'));
```

#### **1.2. Thêm case trong getPageTitle() (dòng 102)**

```tsx
case 'live-exam': return 'Thi Trực Tiếp';
```

#### **1.3. Thêm tab render (sau dòng 305)**

```tsx
{activeTab === 'live-exam' && (
    <LiveExamTab
        sessions={[]} // TODO: Load from API
        availableQuizzes={quizStore.quizzes.map(q => ({
            id: q.id,
            title: q.title,
            questionCount: q.questions.length,
        }))}
        onCreateSession={(sessionId, accessCode) => {
            console.log('Phiên thi mới:', sessionId, accessCode);
            // TODO: Navigate to waiting room
        }}
        onSelectSession={(session) => {
            console.log('Chọn phiên:', session);
            // TODO: Navigate based on session status
        }}
    />
)}
```

---

### **Bước 2: Thêm vào Sidebar**

File: `src/components/TeacherDashboard/Sidebar.tsx`

#### **2.1. Thêm icon import (dòng đầu)**

```tsx
import { Video } from 'lucide-react'; // Hoặc icon khác
```

#### **2.2. Thêm vào baseItems (khoảng dòng 20)**

```tsx
{ id: 'live-exam', label: 'Thi Trực Tiếp', icon: <Video className="w-5 h-5" /> },
```

---

### **Bước 3: Cập nhật Type**

File: `src/stores/useTeacherDashboardUIStore.ts`

Thêm `'live-exam'` vào type `TeacherDashboardTab`:

```tsx
export type TeacherDashboardTab = 
  | 'overview'
  | 'manage'
  | 'results'
  | 'create'
  | 'ioe'
  | 'ioe-manage'
  | 'ioe-results'
  | 'classes'
  | 'assignments'
  | 'announcements'
  | 'teachers'
  | 'gift-shop'
  | 'homework'
  | 'live-exam'; // ← Thêm dòng này
```

---

## 🎯 Kết Quả

Sau khi hoàn thành 3 bước trên, bạn sẽ thấy:

1. ✅ Tab **"Thi Trực Tiếp"** xuất hiện trong Sidebar
2. ✅ Click vào sẽ hiển thị giao diện quản lý phiên thi
3. ✅ Nút **"Tạo Phiên Thi Mới"** để tạo phiên thi

---

## 📝 Code Đầy Đủ Để Copy-Paste

### **File 1: src/components/TeacherDashboard/index.tsx**

**Thêm import (dòng 30):**
```tsx
const LiveExamTab = React.lazy(() => import('../LiveExam/TeacherLiveExamDashboard'));
```

**Thêm trong getPageTitle() (dòng 102):**
```tsx
case 'live-exam': return 'Thi Trực Tiếp';
```

**Thêm render (sau dòng 305):**
```tsx
{activeTab === 'live-exam' && (
    <LiveExamTab
        sessions={[]}
        availableQuizzes={quizStore.quizzes.map(q => ({
            id: q.id,
            title: q.title,
            questionCount: q.questions.length,
        }))}
        onCreateSession={(sessionId, accessCode) => {
            console.log('Created session:', sessionId, accessCode);
        }}
        onSelectSession={(session) => {
            console.log('Selected session:', session);
        }}
    />
)}
```

### **File 2: src/components/TeacherDashboard/Sidebar.tsx**

**Thêm import:**
```tsx
import { Video } from 'lucide-react';
```

**Thêm vào baseItems:**
```tsx
{ id: 'live-exam', label: 'Thi Trực Tiếp', icon: <Video className="w-5 h-5" /> },
```

### **File 3: src/stores/useTeacherDashboardUIStore.ts**

**Thêm vào type:**
```tsx
| 'live-exam'
```

---

## 🧪 Kiểm Tra

1. Chạy `npm run dev`
2. Đăng nhập với tài khoản giáo viên
3. Xem Sidebar bên trái
4. Click vào **"Thi Trực Tiếp"**
5. Thấy giao diện quản lý phiên thi

---

## 🎓 Tính Năng Có Sẵn

Sau khi tích hợp, giáo viên có thể:

- ✅ Xem danh sách tất cả phiên thi
- ✅ Tạo phiên thi mới
- ✅ Lọc theo trạng thái (Đang chờ/Đang thi/Đã kết thúc)
- ✅ Xem thống kê tổng quan
- ✅ Click vào phiên thi để xem chi tiết

---

## 💡 Lưu Ý

- Hiện tại `sessions={[]}` là mảng rỗng
- Cần tạo API để load danh sách phiên thi từ backend
- Cần xử lý navigation giữa các màn hình (Waiting Room, Monitor, Results)

---

## 🚀 Sẵn Sàng!

Làm theo 3 bước trên là xong! Nếu cần hỗ trợ thêm, hãy hỏi tôi! 😊
