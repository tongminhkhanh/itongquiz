# Fix: Nội dung sửa thủ công không hiển thị khi xuất link phụ huynh

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Đảm bảo mọi chỉnh sửa thủ công của giáo viên trên phiếu kết quả đều được lưu đúng và hiển thị cho phụ huynh khi mở link.

**Architecture:** Ba điểm fix độc lập: (1) đánh dấu `nhan_xet_mode: 'manual'` khi giáo viên sửa trong `ResultRowPhieuModal`; (2) auto-save draft chưa được sync trước khi publish trong `PhieuFromResultsPanel`; (3) cũng đánh dấu `'manual'` trong `PhieuFromResultsPanel.onChange`. Không thay đổi API, không thay đổi kiểu dữ liệu.

**Tech Stack:** React 18, TypeScript, Supabase (qua `callApi`), Tailwind CSS

## Global Constraints
- Không thêm dependency mới
- Không thay đổi schema type `PhieuNhanXetInput` hay `PhieuNhanXet`
- Không thay đổi backend API — chỉ fix phía frontend
- Giữ nguyên UX hiện tại, không di chuyển nút hay thay label
- Mỗi task commit riêng biệt với message theo format `fix: <mô tả>`

---

## File Map — Những file bị chạm

| File | Hành động | Lý do |
|---|---|---|
| `src/features/results/components/ResultRowPhieuModal.tsx` | Modify | `handleChange` thiếu `nhan_xet_mode: 'manual'` |
| `src/features/results/components/PhieuFromResultsPanel.tsx` | Modify | `onChange` thiếu `'manual'`; `handlePublish` thiếu auto-save |
| `src/features/results/utils/buildPhieuFromResult.ts` | **Không đổi** | File này đúng — luôn khởi tạo với `'ai'` là hợp lệ |

---

## Task 1: Fix `ResultRowPhieuModal` — đánh dấu `manual` khi giáo viên sửa

**Files:**
- Modify: `src/features/results/components/ResultRowPhieuModal.tsx:57-61`

**Interfaces:**
- Consumes: `handleChange(patch: Partial<PhieuNhanXetInput>)` — đang là callback cho `PhieuBTCard onChange`
- Produces: cùng signature, nhưng luôn inject `nhan_xet_mode: 'manual'` vào patch

- [ ] **Step 1: Mở file và xác nhận vị trí hiện tại**

```
src/features/results/components/ResultRowPhieuModal.tsx
```

Tìm đoạn code (khoảng dòng 57-61):
```tsx
// Merge partial update từ PhieuBTCard onChange
const handleChange = useCallback((patch: Partial<PhieuNhanXetInput>) => {
  setPhieu((prev) => ({ ...prev, ...patch }));
}, []);
```

- [ ] **Step 2: Sửa `handleChange` — inject `nhan_xet_mode: 'manual'`**

Thay thế đoạn trên bằng:
```tsx
// Merge partial update từ PhieuBTCard onChange
// Luôn đánh dấu 'manual' để server không overwrite nội dung giáo viên đã sửa
const handleChange = useCallback((patch: Partial<PhieuNhanXetInput>) => {
  setPhieu((prev) => ({ ...prev, ...patch, nhan_xet_mode: 'manual' }));
}, []);
```

> **Tại sao:** Khi `nhan_xet_mode` vẫn là `'ai'`, backend có thể regenerate nội dung từ template khi upsert, xóa mất chỉnh sửa của giáo viên.

- [ ] **Step 3: Kiểm tra thủ công trong browser**

Làm theo các bước:
1. Mở bảng kết quả → click icon phiếu của một học sinh
2. Sửa nội dung "Nhận xét" trong phiếu
3. Nhấn **"Xuất link phụ huynh"**
4. Mở link vừa tạo trong tab ẩn danh
5. Xác nhận nội dung hiển thị đúng với những gì đã sửa ✅

- [ ] **Step 4: Commit**

```bash
git add src/features/results/components/ResultRowPhieuModal.tsx
git commit -m "fix: mark nhan_xet_mode as manual when teacher edits phieu in ResultRowPhieuModal"
```

---

## Task 2: Fix `PhieuFromResultsPanel` — đánh dấu `manual` khi sửa trong batch panel

**Files:**
- Modify: `src/features/results/components/PhieuFromResultsPanel.tsx:~270-280`

**Interfaces:**
- Consumes: `onChange` prop của `PhieuKetQuaCardV2` — nhận `patch: Partial<PhieuNhanXetInput>`
- Produces: `drafts[activeId]` luôn có `nhan_xet_mode: 'manual'` sau khi giáo viên chỉnh sửa

- [ ] **Step 1: Mở file và xác định đoạn `onChange` hiện tại**

Tìm đoạn (khoảng dòng 268-276):
```tsx
<PhieuKetQuaCardV2
  phieu={activePhieu}
  editable
  onChange={(patch) =>
    setDrafts((prev) => ({
      ...prev,
      [activeId]: { ...activePhieu, ...patch },
    }))
  }
/>
```

- [ ] **Step 2: Sửa inline `onChange` — thêm `nhan_xet_mode: 'manual'`**

```tsx
<PhieuKetQuaCardV2
  phieu={activePhieu}
  editable
  onChange={(patch) =>
    setDrafts((prev) => ({
      ...prev,
      [activeId]: { ...activePhieu, ...patch, nhan_xet_mode: 'manual' },
    }))
  }
/>
```

- [ ] **Step 3: Commit**

```bash
git add src/features/results/components/PhieuFromResultsPanel.tsx
git commit -m "fix: mark nhan_xet_mode as manual on draft edit in PhieuFromResultsPanel"
```

---

## Task 3: Fix `PhieuFromResultsPanel.handlePublish` — auto-save trước khi xuất link

Đây là bug quan trọng nhất: nếu giáo viên **sửa phiếu nhưng chưa nhấn "Lưu chỉnh sửa"** rồi thẳng tay nhấn **"Xuất link"**, phiếu ID có thể là bản cũ trên server.

**Files:**
- Modify: `src/features/results/components/PhieuFromResultsPanel.tsx:~138-160`

**Interfaces:**
- Consumes: `phieuService.upsertPhieu(input: PhieuNhanXetInput): Promise<PhieuNhanXet>` — từ `src/features/homework/services/phieuService.ts`
- Produces: `handlePublish` tự sync tất cả draft lên server trước khi lấy IDs

- [ ] **Step 1: Xác định `handlePublish` hiện tại**

Tìm đoạn (khoảng dòng 137-160):
```tsx
const handlePublish = async () => {
  const phieuIds = Object.values(drafts)
    .filter((p): p is PhieuNhanXet => Boolean((p as PhieuNhanXet).id))
    .map((p) => p.id);
  if (phieuIds.length === 0) return alert('Chưa có phiếu nào để xuất link.');
  setIsPublishing(true);
  try {
    const title = ...
    const result = await phieuBatchService.publishBatch({ ... });
    setLinks(result.links);
  } catch (err) {
    alert(...);
  } finally {
    setIsPublishing(false);
  }
};
```

- [ ] **Step 2: Thay toàn bộ `handlePublish` bằng phiên bản auto-save**

```tsx
const handlePublish = async () => {
  if (Object.keys(drafts).length === 0) return alert('Chưa có phiếu nào để xuất link.');
  setIsPublishing(true);
  try {
    // Auto-save: sync mọi draft (kể cả đã có id lẫn chưa có) lên server
    // để đảm bảo nội dung giáo viên vừa sửa được lưu trước khi publish
    const syncedDrafts: Record<string, PhieuNhanXet> = {};
    for (const [id, phieu] of Object.entries(drafts)) {
      const input: PhieuNhanXetInput = (phieu as PhieuNhanXet).id
        ? { ...(phieu as PhieuNhanXetInput), id: (phieu as PhieuNhanXet).id }
        : (phieu as PhieuNhanXetInput);
      const saved = await phieuService.upsertPhieu(input);
      syncedDrafts[id] = saved;
    }
    // Cập nhật state với bản đã sync
    setDrafts(syncedDrafts);

    const phieuIds = Object.values(syncedDrafts).map((p) => p.id);
    const title = results[0]
      ? (results[0]['Quiz Title'] || results[0].quiz_title || 'Kết quả bài kiểm tra')
      : 'Kết quả bài kiểm tra';
    const result = await phieuBatchService.publishBatch({
      assignmentId: '',
      classId: results[0]?.['Class'] || results[0]?.class_name || '',
      teacherId: username || 'teacher',
      title,
      phieuIds,
      expiresInDays: 30,
    });
    setLinks(result.links);
  } catch (err) {
    alert(err instanceof Error ? err.message : 'Không thể tạo link.');
  } finally {
    setIsPublishing(false);
  }
};
```

- [ ] **Step 3: Đảm bảo import `PhieuNhanXetInput` đã có ở đầu file**

Kiểm tra dòng import ở đầu file:
```tsx
import { PhieuNhanXet, PhieuNhanXetInput, ... } from '../../homework/types/phieu.types';
```
Nếu `PhieuNhanXetInput` chưa có trong import, thêm vào.

- [ ] **Step 4: Kiểm tra thủ công toàn luồng batch**

1. Mở bảng kết quả → nhấn **"Tạo phiếu"** cho nhiều học sinh
2. Sửa nội dung phiếu của 1-2 học sinh, **KHÔNG nhấn "Lưu chỉnh sửa"**
3. Nhấn thẳng **"Xuất link phụ huynh"**
4. Mở link của học sinh đã sửa trong tab ẩn danh
5. Xác nhận nội dung đã sửa hiển thị đúng ✅
6. Mở link của học sinh chưa sửa → xác nhận nội dung AI vẫn đúng ✅

- [ ] **Step 5: Commit**

```bash
git add src/features/results/components/PhieuFromResultsPanel.tsx
git commit -m "fix: auto-save all drafts before publishing batch phieu links"
```

---

## Self-Review Checklist

- [x] **Spec coverage:** 3 bug đã xác định → 3 task tương ứng. Task 1 fix modal per-row, Task 2+3 fix batch panel.
- [x] **Placeholder scan:** Không có TBD, TODO, hay mô tả mơ hồ. Mọi step đều có code block cụ thể.
- [x] **Type consistency:** `PhieuNhanXetInput`, `PhieuNhanXet`, `nhan_xet_mode` dùng nhất quán từ `phieu.types.ts`.
- [x] **Không phá vỡ flow AI:** Chỉ các phiếu giáo viên sửa tay mới có `'manual'`. Phiếu không chỉnh sửa vẫn giữ `'ai'`.
- [x] **buildPhieuFromResult không cần đổi:** Khởi tạo với `'ai'` là đúng — chỉ sau khi sửa mới đổi thành `'manual'`.
