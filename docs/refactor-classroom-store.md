# Refactor: Tách `useClassroomStore` thành 3 Store

> **Ngày tạo:** 02/07/2026  
> **Tác giả:** Audit bởi AI  
> **Mức độ:** 🔴 Nghiêm trọng — Store 17KB, quá nhiều responsibility

---

## Vấn đề

`src/stores/useClassroomStore.ts` (17KB) đang ôm 4 domain khác nhau trong 1 file:

| Domain | Actions |
|---|---|
| Class | `fetchClasses`, `addClass`, `removeClass` |
| Student/Roster | `fetchStudents`, `addStudent`, `addStudentsBulk`, `removeStudent`, `resetPassword`, `changeMyPassword` |
| Assignment | `fetchAssignments`, `fetchTeacherAssignments`, `fetchAllAssignments`, `addAssignment`, `removeAssignment`, `updateAssignmentDeadline`, `updateAssignmentStatus` |
| Student Portal | `loginStudent`, `logoutStudent`, `restoreStudentSession`, `updateAvatar` |

**Hậu quả:**
- Component không liên quan đến assignment vẫn re-render khi assignment thay đổi
- Khó test từng domain độc lập
- File khổng lồ, khó đọc và maintain

---

## Giải pháp — Tách thành 3 store

```
src/stores/
├── useClassroomStore.ts   ← Giữ lại: chỉ Student Session/Auth (~4KB)
├── useClassStore.ts       ← MỚI: Class CRUD (~3KB)
├── useRosterStore.ts      ← MỚI: Student Roster CRUD (~5KB)
└── useAssignmentStore.ts  ← MỚI: Assignment CRUD (~5KB)
```

---

## File 1: `src/stores/useClassStore.ts` *(MỚI)*

```typescript
// src/stores/useClassStore.ts
import { create } from 'zustand';
import { Classroom, CreateClassPayload } from '../types/classroom.types';
import * as classroomService from '../services/classroomService';

interface ClassStore {
  classes: Classroom[];
  isLoading: boolean;
  error: string | null;

  fetchClasses: (teacherUsername?: string) => Promise<void>;
  addClass: (payload: CreateClassPayload) => Promise<Classroom | null>;
  removeClass: (classId: string) => Promise<boolean>;
  clearError: () => void;
}

export const useClassStore = create<ClassStore>((set) => ({
  classes: [],
  isLoading: false,
  error: null,

  fetchClasses: async (teacherUsername) => {
    set({ isLoading: true, error: null });
    try {
      const classes = await classroomService.getClasses(teacherUsername);
      set({ classes, isLoading: false });
    } catch {
      set({ error: 'Không thể tải danh sách lớp.', isLoading: false });
    }
  },

  addClass: async (payload) => {
    set({ isLoading: true, error: null });
    try {
      const newClass = await classroomService.createClass(payload);
      if (newClass) {
        set((s) => ({ classes: [...s.classes, newClass], isLoading: false }));
        return newClass;
      }
      set({ error: 'Không thể tạo lớp.', isLoading: false });
      return null;
    } catch {
      set({ error: 'Lỗi khi tạo lớp.', isLoading: false });
      return null;
    }
  },

  removeClass: async (classId) => {
    set({ isLoading: true, error: null });
    try {
      const ok = await classroomService.deleteClass(classId);
      if (ok) {
        set((s) => ({
          classes: s.classes.filter((c) => c.id !== classId),
          isLoading: false,
        }));
      }
      return ok;
    } catch {
      set({ error: 'Lỗi khi xóa lớp.', isLoading: false });
      return false;
    }
  },

  clearError: () => set({ error: null }),
}));
```

---

## File 2: `src/stores/useRosterStore.ts` *(MỚI)*

```typescript
// src/stores/useRosterStore.ts
import { create } from 'zustand';
import { Student, CreateStudentPayload } from '../types/classroom.types';
import * as classroomService from '../services/classroomService';

interface RosterStore {
  students: Record<string, Student[]>; // keyed by classId
  isLoading: boolean;
  error: string | null;

  fetchStudents: (classId: string) => Promise<void>;
  addStudent: (payload: CreateStudentPayload) => Promise<Student | null>;
  addStudentsBulk: (
    payloads: CreateStudentPayload[],
    classId: string
  ) => Promise<classroomService.BatchStudentResult | null>;
  removeStudent: (studentId: string, classId: string) => Promise<boolean>;
  resetPassword: (
    studentId: string,
    newPassword: string,
    actorUsername: string
  ) => Promise<boolean>;
  changeMyPassword: (
    studentId: string,
    currentPassword: string,
    newPassword: string
  ) => Promise<boolean>;
  clearError: () => void;
}

export const useRosterStore = create<RosterStore>((set) => ({
  students: {},
  isLoading: false,
  error: null,

  fetchStudents: async (classId) => {
    set({ isLoading: true, error: null });
    try {
      const students = await classroomService.getStudents(classId, 'teacher');
      set((s) => ({
        students: { ...s.students, [classId]: students },
        isLoading: false,
      }));
    } catch {
      set({ error: 'Không thể tải danh sách học sinh.', isLoading: false });
    }
  },

  addStudent: async (payload) => {
    set({ isLoading: true, error: null });
    try {
      const student = await classroomService.addStudent(payload);
      if (student) {
        set((s) => {
          const existing = s.students[payload.classId] || [];
          return {
            students: {
              ...s.students,
              [payload.classId]: [...existing, student],
            },
            isLoading: false,
          };
        });
        return student;
      }
      set({ error: 'Không thể thêm học sinh.', isLoading: false });
      return null;
    } catch {
      set({ error: 'Lỗi khi thêm học sinh.', isLoading: false });
      return null;
    }
  },

  addStudentsBulk: async (payloads, classId) => {
    set({ isLoading: true, error: null });
    try {
      const result = await classroomService.addStudentsBatch(payloads);
      if (result && result.successes.length > 0) {
        set((s) => {
          const existing = s.students[classId] || [];
          return {
            students: {
              ...s.students,
              [classId]: [...existing, ...result.successes],
            },
            isLoading: false,
          };
        });
        return result;
      }
      if (result && result.successes.length === 0) {
        set({ isLoading: false });
        return result;
      }
      set({ error: 'Không thể thêm học sinh hàng loạt.', isLoading: false });
      return null;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      set({ error: msg || 'Lỗi khi thêm học sinh hàng loạt.', isLoading: false });
      return null;
    }
  },

  removeStudent: async (studentId, classId) => {
    set({ isLoading: true, error: null });
    try {
      const ok = await classroomService.deleteStudent(studentId);
      if (ok) {
        set((s) => ({
          students: {
            ...s.students,
            [classId]: (s.students[classId] || []).filter((st) => st.id !== studentId),
          },
          isLoading: false,
        }));
      }
      return ok;
    } catch {
      set({ error: 'Lỗi khi xóa học sinh.', isLoading: false });
      return false;
    }
  },

  resetPassword: async (studentId, newPassword, actorUsername) => {
    set({ isLoading: true, error: null });
    try {
      const ok = await classroomService.resetStudentPassword(studentId, newPassword, actorUsername);
      if (!ok) {
        set({ isLoading: false, error: 'Không thể đặt lại mật khẩu.' });
        return false;
      }
      set({ isLoading: false });
      return true;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      set({ error: msg || 'Lỗi khi đặt lại mật khẩu.', isLoading: false });
      return false;
    }
  },

  changeMyPassword: async (studentId, currentPassword, newPassword) => {
    set({ isLoading: true, error: null });
    try {
      const ok = await classroomService.changeStudentPassword(studentId, currentPassword, newPassword);
      if (!ok) {
        set({ isLoading: false, error: 'Không thể đổi mật khẩu.' });
        return false;
      }
      set({ isLoading: false });
      return true;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      set({ error: msg || 'Lỗi khi đổi mật khẩu.', isLoading: false });
      return false;
    }
  },

  clearError: () => set({ error: null }),
}));
```

---

## File 3: `src/stores/useAssignmentStore.ts` *(MỚI)*

```typescript
// src/stores/useAssignmentStore.ts
import { create } from 'zustand';
import { Assignment, CreateAssignmentPayload } from '../types/classroom.types';
import * as classroomService from '../services/classroomService';

interface AssignmentStore {
  assignments: Assignment[];
  isLoading: boolean;
  error: string | null;

  fetchAssignments: (classId: string) => Promise<void>;
  fetchTeacherAssignments: (teacherUsername: string) => Promise<void>;
  fetchAllAssignments: () => Promise<void>;
  fetchStudentAssignments: (studentId: string) => Promise<void>;
  addAssignment: (payload: CreateAssignmentPayload) => Promise<Assignment | null>;
  removeAssignment: (assignmentId: string) => Promise<boolean>;
  updateAssignmentDeadline: (assignmentId: string, newDeadline: string) => Promise<boolean>;
  updateAssignmentStatus: (assignmentId: string, newStatus: 'OPEN' | 'CLOSED') => Promise<boolean>;
  startAssignmentAttempt: (assignmentId: string, studentId: string) => Promise<boolean>;
  clearError: () => void;
}

export const useAssignmentStore = create<AssignmentStore>((set) => ({
  assignments: [],
  isLoading: false,
  error: null,

  fetchAssignments: async (classId) => {
    set({ isLoading: true, error: null });
    try {
      const assignments = await classroomService.getAssignments(classId);
      set({ assignments, isLoading: false });
    } catch {
      set({ error: 'Không thể tải danh sách bài tập.', isLoading: false });
    }
  },

  fetchTeacherAssignments: async (teacherUsername) => {
    set({ isLoading: true, error: null });
    try {
      const assignments = await classroomService.getTeacherAssignments(teacherUsername);
      set({ assignments, isLoading: false });
    } catch {
      set({ error: 'Không thể tải danh sách bài giao.', isLoading: false });
    }
  },

  fetchAllAssignments: async () => {
    set({ isLoading: true, error: null });
    try {
      const assignments = await classroomService.getAllAssignments();
      set({ assignments, isLoading: false });
    } catch {
      set({ error: 'Không thể tải toàn bộ danh sách bài giao.', isLoading: false });
    }
  },

  fetchStudentAssignments: async (studentId) => {
    set({ isLoading: true, error: null });
    try {
      const assignments = await classroomService.getStudentAssignments(studentId);
      set({ assignments, isLoading: false });
    } catch {
      set({ error: 'Không thể tải bài tập.', isLoading: false });
    }
  },

  addAssignment: async (payload) => {
    set({ isLoading: true, error: null });
    try {
      const assignment = await classroomService.createAssignment(payload);
      if (assignment) {
        set((s) => ({ assignments: [...s.assignments, assignment], isLoading: false }));
        return assignment;
      }
      set({ error: 'Không thể giao bài.', isLoading: false });
      return null;
    } catch {
      set({ error: 'Lỗi khi giao bài.', isLoading: false });
      return null;
    }
  },

  removeAssignment: async (assignmentId) => {
    set({ isLoading: true, error: null });
    try {
      const ok = await classroomService.deleteAssignment(assignmentId);
      if (ok) {
        set((s) => ({
          assignments: s.assignments.filter((a) => a.id !== assignmentId),
          isLoading: false,
        }));
      }
      return ok;
    } catch {
      set({ error: 'Lỗi khi xóa bài tập.', isLoading: false });
      return false;
    }
  },

  updateAssignmentDeadline: async (assignmentId, newDeadline) => {
    set({ isLoading: true, error: null });
    try {
      const ok = await classroomService.updateAssignmentDeadline(assignmentId, newDeadline);
      if (ok) {
        const newStatus = new Date(newDeadline) > new Date() ? 'OPEN' : 'CLOSED';
        set((s) => ({
          assignments: s.assignments.map((a) =>
            a.id === assignmentId
              ? { ...a, deadline: newDeadline, status: newStatus as 'OPEN' | 'CLOSED' }
              : a
          ),
          isLoading: false,
        }));
      } else {
        set({ error: 'Không thể cập nhật hạn nộp.', isLoading: false });
      }
      return ok;
    } catch {
      set({ error: 'Lỗi khi cập nhật hạn nộp.', isLoading: false });
      return false;
    }
  },

  updateAssignmentStatus: async (assignmentId, newStatus) => {
    set({ isLoading: true, error: null });
    try {
      const ok = await classroomService.updateAssignmentStatus(assignmentId, newStatus);
      if (ok) {
        set((s) => ({
          assignments: s.assignments.map((a) =>
            a.id === assignmentId ? { ...a, status: newStatus } : a
          ),
          isLoading: false,
        }));
      } else {
        set({ error: 'Không thể cập nhật trạng thái.', isLoading: false });
      }
      return ok;
    } catch {
      set({ error: 'Lỗi khi cập nhật trạng thái.', isLoading: false });
      return false;
    }
  },

  startAssignmentAttempt: async (assignmentId, studentId) => {
    try {
      await classroomService.startAssignmentAttempt(assignmentId, studentId);
      return true;
    } catch (err) {
      console.error('Failed to start assignment attempt', err);
      return false;
    }
  },

  clearError: () => set({ error: null }),
}));
```

---

## File 4: `src/stores/useClassroomStore.ts` *(CẬP NHẬT — chỉ còn Student Portal)*

```typescript
// src/stores/useClassroomStore.ts
// Sau khi tách: chỉ còn student session + gamification restore

import { create } from 'zustand';
import { StudentSession, StudentLoginPayload } from '../types/classroom.types';
import * as classroomService from '../services/classroomService';
import { useGamificationStore, restoreGamificationData } from './useGamificationStore';
import { useHomeworkStore } from '../features/homework/stores/useHomeworkStore';
import { PetData, ShopItem } from '../types/gamification.types';
import { StorageKeys } from '../constants/storageKeys';

interface ClassroomStore {
  studentSession: StudentSession | null;
  isLoading: boolean;
  error: string | null;

  loginStudent: (payload: StudentLoginPayload) => Promise<boolean>;
  logoutStudent: () => void;
  restoreStudentSession: () => void;
  updateAvatar: (studentId: string, avatar: string) => Promise<boolean>;
  clearError: () => void;
}

export const useClassroomStore = create<ClassroomStore>((set, get) => ({
  studentSession: null,
  isLoading: false,
  error: null,

  loginStudent: async (payload) => {
    set({ isLoading: true, error: null });
    try {
      const session = await classroomService.studentLogin(payload);
      if (session) {
        localStorage.setItem(StorageKeys.STUDENT_SESSION, JSON.stringify(session));
        if (session.token) {
          localStorage.setItem('itongquiz_jwt_token', session.token);
        }
        set({ studentSession: session, isLoading: false });
        if (session.pet || session.coins !== undefined) {
          useGamificationStore.getState().initFromLoginData(
            session.pet as PetData | null,
            session.coins || 0,
            (session.shopItems || []) as ShopItem[]
          );
        }
        return true;
      }
      set({ error: 'Sai tên đăng nhập hoặc mật khẩu.', isLoading: false });
      return false;
    } catch {
      set({ error: 'Lỗi khi đăng nhập.', isLoading: false });
      return false;
    }
  },

  logoutStudent: () => {
    localStorage.removeItem(StorageKeys.STUDENT_SESSION);
    localStorage.removeItem('itongquiz_jwt_token');
    set({ studentSession: null });
    useGamificationStore.getState().clearGamification();
    useHomeworkStore.getState().resetStore();
  },

  restoreStudentSession: () => {
    try {
      const saved = localStorage.getItem(StorageKeys.STUDENT_SESSION);
      if (saved) {
        const session: StudentSession = JSON.parse(saved);
        set({ studentSession: session });
        restoreGamificationData();
      }
    } catch {
      localStorage.removeItem(StorageKeys.STUDENT_SESSION);
    }
  },

  updateAvatar: async (studentId, avatar) => {
    try {
      const ok = await classroomService.updateStudentAvatar(studentId, avatar);
      if (ok) {
        const session = get().studentSession;
        if (session) {
          const updatedSession = { ...session, avatar };
          localStorage.setItem(StorageKeys.STUDENT_SESSION, JSON.stringify(updatedSession));
          set({ studentSession: updatedSession });
        }
        return true;
      }
      return false;
    } catch (err) {
      console.error('Failed to update avatar', err);
      return false;
    }
  },

  clearError: () => set({ error: null }),
}));
```

---

## Cập nhật import trong components

### Bước 1: Tìm tất cả file đang dùng

```bash
grep -r "useClassroomStore" src/ --include="*.tsx" --include="*.ts" -l
```

### Bước 2: Thay thế import theo pattern

```typescript
// TRƯỚC
import { useClassroomStore } from '../stores/useClassroomStore';
const { classes, fetchClasses, addClass } = useClassroomStore();
const { students, fetchStudents } = useClassroomStore();
const { assignments, fetchAssignments } = useClassroomStore();

// SAU
import { useClassStore } from '../stores/useClassStore';
import { useRosterStore } from '../stores/useRosterStore';
import { useAssignmentStore } from '../stores/useAssignmentStore';
import { useClassroomStore } from '../stores/useClassroomStore'; // chỉ còn session

const { classes, fetchClasses, addClass } = useClassStore();
const { students, fetchStudents } = useRosterStore();
const { assignments, fetchAssignments } = useAssignmentStore();
const { studentSession } = useClassroomStore();
```

---

## Unit Test: `src/stores/__tests__/useClassStore.test.ts`

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useClassStore } from '../useClassStore';

vi.mock('../../services/classroomService', () => ({
  getClasses: vi.fn(),
  createClass: vi.fn(),
  deleteClass: vi.fn(),
}));

import * as classroomService from '../../services/classroomService';

beforeEach(() => {
  useClassStore.setState({ classes: [], isLoading: false, error: null });
  vi.clearAllMocks();
});

describe('useClassStore', () => {
  it('fetchClasses: cập nhật classes khi thành công', async () => {
    const mockClasses = [{ id: '1', name: 'Lớp 4A' }];
    vi.mocked(classroomService.getClasses).mockResolvedValue(mockClasses as any);

    const { result } = renderHook(() => useClassStore());
    await act(async () => {
      await result.current.fetchClasses('teacher1');
    });

    expect(result.current.classes).toEqual(mockClasses);
    expect(result.current.isLoading).toBe(false);
  });

  it('fetchClasses: set error khi thất bại', async () => {
    vi.mocked(classroomService.getClasses).mockRejectedValue(new Error('Network error'));

    const { result } = renderHook(() => useClassStore());
    await act(async () => {
      await result.current.fetchClasses();
    });

    expect(result.current.error).toBe('Không thể tải danh sách lớp.');
    expect(result.current.isLoading).toBe(false);
  });

  it('addClass: thêm class mới vào state', async () => {
    const newClass = { id: '2', name: 'Lớp 5B' };
    vi.mocked(classroomService.createClass).mockResolvedValue(newClass as any);

    const { result } = renderHook(() => useClassStore());
    await act(async () => {
      await result.current.addClass({ name: 'Lớp 5B' } as any);
    });

    expect(result.current.classes).toHaveLength(1);
    expect(result.current.classes[0].name).toBe('Lớp 5B');
  });

  it('removeClass: xoá class khỏi state', async () => {
    useClassStore.setState({ classes: [{ id: '1', name: 'Lớp 4A' } as any] });
    vi.mocked(classroomService.deleteClass).mockResolvedValue(true);

    const { result } = renderHook(() => useClassStore());
    await act(async () => {
      await result.current.removeClass('1');
    });

    expect(result.current.classes).toHaveLength(0);
  });
});
```

---

## Kết quả sau khi tách

| File | Trước | Sau |
|---|---|---|
| `useClassroomStore.ts` | 17KB | ~4KB |
| `useClassStore.ts` | — | ~3KB |
| `useRosterStore.ts` | — | ~5KB |
| `useAssignmentStore.ts` | — | ~5KB |

---

## Commit Message

```
refactor(stores): split useClassroomStore into 3 focused stores

- Extract class CRUD → useClassStore
- Extract student roster CRUD → useRosterStore
- Extract assignment CRUD → useAssignmentStore
- Keep student session/auth logic in useClassroomStore
- Reduces useClassroomStore from 17KB to ~4KB
- Add unit tests for useClassStore

BREAKING CHANGE: Components importing classes/students/assignments
from useClassroomStore must update to new store imports.
```
