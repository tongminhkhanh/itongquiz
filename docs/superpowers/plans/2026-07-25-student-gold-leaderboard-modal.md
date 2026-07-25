# Student Gold Leaderboard Modal Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Thay nút chữ Bảng vàng bằng nút cúp nổi và mở popup Top 10 học sinh có số xu hiện có cao nhất trên Dashboard học sinh.

**Architecture:** Giữ nguyên endpoint `GET /api/leaderboard/top-gold` và kiểu `TopGoldStudent`; tách trạng thái tải/lỗi/cache Bảng vàng khỏi trạng thái gamification chung trong Zustand. `StudentFloatingSidebar` tiếp tục là entry point để giảm blast radius, còn phần hiển thị popup và Top 3 được tách thành component thuần, có thể test độc lập.

**Tech Stack:** React 19, TypeScript, Zustand 5, Tailwind CSS 4, Framer Motion 12, lucide-react, Vitest, Testing Library, Cypress Component Testing.

## Global Constraints

- Không thay đổi Worker API, D1 schema hoặc logic tính xu trong MVP.
- Nội dung phải mô tả đúng dữ liệu là “số xu hiện có”, không gọi là điểm hay tổng xu đã kiếm.
- Giữ export `StudentFloatingSidebar` để không phá import hiện tại.
- Không cài thêm dependency.
- Tải dữ liệu khi mở popup; cache thành công trong 60.000 ms.
- Hỗ trợ desktop và mobile từ 360 px trở lên.
- Modal phải đóng được bằng nút X, backdrop và `Escape`.
- Mọi thay đổi symbol phải chạy GitNexus impact analysis trước khi sửa theo `AGENTS.md`.
- Trước commit phải chạy GitNexus `detect_changes()`.

---

## File Structure

### Tạo mới

- `src/components/gamification/StudentGoldLeaderboardModal.tsx` — modal, các trạng thái hiển thị và danh sách hạng 4–10.
- `src/components/gamification/StudentGoldPodium.tsx` — component thuần cho Top 3.
- `tests/StudentFloatingSidebar.test.tsx` — contract hành vi trigger và modal.
- `tests/gamificationServiceTopGold.test.ts` — hợp đồng service: thành công trả mảng, lỗi phải throw.
- `tests/gamificationTopGoldStore.test.ts` — cache, loading và error của store.
- `cypress/component/student-gold-leaderboard.cy.tsx` — kiểm tra trực quan desktop/mobile.

### Chỉnh sửa

- `src/components/gamification/StudentFloatingSidebar.tsx:1-110` — đổi nút chữ thành nút cúp và orchestration modal.
- `src/services/gamificationService.ts:132-142` — truyền lỗi API lên store thay vì biến lỗi thành danh sách rỗng.
- `src/stores/useGamificationStore.ts:20-55,235-242,260-278` — thêm trạng thái riêng, TTL và reset.
- `src/components/HomePage/StudentDashboardUI.tsx:81` — truyền `studentSession.username` để đánh dấu học sinh hiện tại.

### Không chỉnh sửa

- `workers/src/routes/gamification.ts`.
- `src/types/gamification.types.ts`.
- `src/services/api/routes/gamification.ts`.

---

### Task 1: Khóa contract hành vi bằng component tests

**Files:**
- Create: `tests/StudentFloatingSidebar.test.tsx`
- Test: `tests/StudentFloatingSidebar.test.tsx`

**Interfaces:**
- Consumes: `StudentFloatingSidebar` và `useGamificationStore`.
- Produces: contract UI cho prop `currentUsername?: string`, trigger cúp, dialog, retry và đóng modal.

- [ ] **Step 1: Chạy GitNexus impact analysis cho `StudentFloatingSidebar`**

Run through GitNexus:

```text
impact({ target: "StudentFloatingSidebar", direction: "upstream" })
```

Expected:

- Direct upstream caller chính là `StudentDashboardUI`.
- Risk không vượt quá MEDIUM.
- Nếu HIGH hoặc CRITICAL, dừng và báo người dùng trước khi sửa.

- [ ] **Step 2: Viết test thất bại cho trigger và lazy fetch**

Create `tests/StudentFloatingSidebar.test.tsx`:

```tsx
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { StudentFloatingSidebar } from '../src/components/gamification/StudentFloatingSidebar';
import { useGamificationStore } from '../src/stores/useGamificationStore';

const fetchTopGoldLeaderboard = vi.fn(async () => undefined);

const students = [
  { username: 'an', fullName: 'Nguyễn Minh An', avatar: '', coins: 1250 },
  { username: 'binh', fullName: 'Trần Gia Bình', avatar: '', coins: 980 },
  { username: 'chi', fullName: 'Lê Ngọc Chi', avatar: '', coins: 920 },
  { username: 'dung', fullName: 'Phạm Hoàng Dũng', avatar: '', coins: 850 },
];

const resetStore = () => {
  useGamificationStore.setState({
    topGoldLeaderboard: [],
    topGoldLeaderboardLoading: false,
    topGoldLeaderboardError: null,
    topGoldLeaderboardFetchedAt: null,
    fetchTopGoldLeaderboard,
  });
};

describe('StudentFloatingSidebar', () => {
  beforeEach(() => {
    fetchTopGoldLeaderboard.mockClear();
    resetStore();
  });

  afterEach(() => {
    document.body.style.overflow = '';
  });

  it('renders a trophy trigger and fetches only after opening', async () => {
    render(<StudentFloatingSidebar currentUsername="an" />);

    expect(screen.getByRole('button', { name: 'Mở Bảng vàng học sinh' })).toBeInTheDocument();
    expect(fetchTopGoldLeaderboard).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole('button', { name: 'Mở Bảng vàng học sinh' }));

    expect(screen.getByRole('dialog', { name: 'Bảng vàng học sinh' })).toBeInTheDocument();
    await waitFor(() => expect(fetchTopGoldLeaderboard).toHaveBeenCalledTimes(1));
  });

  it('shows the ranked students and marks the current student', () => {
    useGamificationStore.setState({ topGoldLeaderboard: students });
    render(<StudentFloatingSidebar currentUsername="an" />);

    fireEvent.click(screen.getByRole('button', { name: 'Mở Bảng vàng học sinh' }));

    expect(screen.getByText('Nguyễn Minh An')).toBeInTheDocument();
    expect(screen.getByText('Trần Gia Bình')).toBeInTheDocument();
    expect(screen.getByText('Lê Ngọc Chi')).toBeInTheDocument();
    expect(screen.getByText('Phạm Hoàng Dũng')).toBeInTheDocument();
    expect(screen.getByText('Em')).toBeInTheDocument();
  });

  it('closes from Escape, backdrop and close button', () => {
    render(<StudentFloatingSidebar currentUsername="an" />);
    const trigger = screen.getByRole('button', { name: 'Mở Bảng vàng học sinh' });

    fireEvent.click(trigger);
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(screen.queryByRole('dialog', { name: 'Bảng vàng học sinh' })).not.toBeInTheDocument();

    fireEvent.click(trigger);
    fireEvent.mouseDown(screen.getByTestId('student-gold-backdrop'));
    expect(screen.queryByRole('dialog', { name: 'Bảng vàng học sinh' })).not.toBeInTheDocument();

    fireEvent.click(trigger);
    fireEvent.click(screen.getByRole('button', { name: 'Đóng Bảng vàng' }));
    expect(screen.queryByRole('dialog', { name: 'Bảng vàng học sinh' })).not.toBeInTheDocument();
  });

  it('returns focus to the trophy after closing', async () => {
    render(<StudentFloatingSidebar currentUsername="an" />);
    const trigger = screen.getByRole('button', { name: 'Mở Bảng vàng học sinh' });

    fireEvent.click(trigger);
    fireEvent.click(screen.getByRole('button', { name: 'Đóng Bảng vàng' }));

    await waitFor(() => expect(trigger).toHaveFocus());
  });

  it('shows an error and retries with force refresh', () => {
    useGamificationStore.setState({
      topGoldLeaderboardError: 'Chưa thể tải Bảng vàng.',
    });
    render(<StudentFloatingSidebar currentUsername="an" />);

    fireEvent.click(screen.getByRole('button', { name: 'Mở Bảng vàng học sinh' }));
    expect(screen.getByRole('alert')).toHaveTextContent('Chưa thể tải Bảng vàng.');

    fireEvent.click(screen.getByRole('button', { name: 'Thử lại' }));
    expect(fetchTopGoldLeaderboard).toHaveBeenLastCalledWith(true);
  });
});
```

- [ ] **Step 3: Chạy test để xác nhận đang fail**

Run:

```bash
npm test -- tests/StudentFloatingSidebar.test.tsx --run
```

Expected: FAIL vì component chưa nhận `currentUsername`, chưa có modal mới và store chưa có các field trạng thái riêng.

- [ ] **Step 4: Commit test contract**

```bash
git add tests/StudentFloatingSidebar.test.tsx
git commit -m "test: define student gold leaderboard modal behavior"
```

---

### Task 2: Tách trạng thái và cache Bảng vàng trong Zustand

**Files:**
- Create: `tests/gamificationServiceTopGold.test.ts`
- Create: `tests/gamificationTopGoldStore.test.ts`
- Modify: `src/services/gamificationService.ts:132-142`
- Modify: `src/stores/useGamificationStore.ts:20-55,235-242,260-278`
- Test: `tests/gamificationServiceTopGold.test.ts`
- Test: `tests/gamificationTopGoldStore.test.ts`

**Interfaces:**
- Produces service contract: `gamificationService.getTopGoldLeaderboard(): Promise<TopGoldStudent[]>` trả mảng khi thành công và throw khi API lỗi.
- Consumes service contract trong Zustand store.
- Produces:

```ts
topGoldLeaderboardLoading: boolean;
topGoldLeaderboardError: string | null;
topGoldLeaderboardFetchedAt: number | null;
fetchTopGoldLeaderboard: (force?: boolean) => Promise<void>;
```

- [ ] **Step 1: Chạy GitNexus impact analysis cho `fetchTopGoldLeaderboard` và `useGamificationStore`**

```text
impact({ target: "getTopGoldLeaderboard", direction: "upstream" })
impact({ target: "fetchTopGoldLeaderboard", direction: "upstream" })
context({ name: "useGamificationStore" })
```

Expected: caller trực tiếp của service là store; caller trực tiếp của store action là `StudentFloatingSidebar`; xác nhận thay đổi có blast radius nhỏ.

- [ ] **Step 2: Viết service contract test thất bại**

Create `tests/gamificationServiceTopGold.test.ts`:

```ts
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { callApi } from '../src/services/apiAdapter';
import { getTopGoldLeaderboard } from '../src/services/gamificationService';

vi.mock('../src/services/apiAdapter', () => ({
  callApi: vi.fn(),
}));

const mockedCallApi = vi.mocked(callApi);

const rows = [
  { username: 'an', fullName: 'Nguyễn Minh An', avatar: '', coins: 1250 },
];

describe('getTopGoldLeaderboard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns the worker rows on success', async () => {
    mockedCallApi.mockResolvedValue({ status: 'success', data: rows });
    await expect(getTopGoldLeaderboard()).resolves.toEqual(rows);
  });

  it('throws when the worker request fails', async () => {
    mockedCallApi.mockRejectedValue(new Error('network'));
    await expect(getTopGoldLeaderboard()).rejects.toThrow('network');
  });
});
```

- [ ] **Step 3: Viết store tests thất bại**

Create `tests/gamificationTopGoldStore.test.ts`:

```ts
import { beforeEach, describe, expect, it, vi } from 'vitest';
import * as gamificationService from '../src/services/gamificationService';
import { useGamificationStore } from '../src/stores/useGamificationStore';

vi.mock('../src/services/gamificationService', async () => {
  const actual = await vi.importActual<typeof import('../src/services/gamificationService')>(
    '../src/services/gamificationService',
  );
  return {
    ...actual,
    getTopGoldLeaderboard: vi.fn(),
  };
});

const mockedGetTopGold = vi.mocked(gamificationService.getTopGoldLeaderboard);
const rows = [
  { username: 'an', fullName: 'Nguyễn Minh An', avatar: '', coins: 1250 },
];

describe('useGamificationStore top gold leaderboard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useGamificationStore.setState({
      topGoldLeaderboard: [],
      topGoldLeaderboardLoading: false,
      topGoldLeaderboardError: null,
      topGoldLeaderboardFetchedAt: null,
    });
  });

  it('loads and timestamps a successful response', async () => {
    mockedGetTopGold.mockResolvedValue(rows);

    await useGamificationStore.getState().fetchTopGoldLeaderboard();

    const state = useGamificationStore.getState();
    expect(state.topGoldLeaderboard).toEqual(rows);
    expect(state.topGoldLeaderboardLoading).toBe(false);
    expect(state.topGoldLeaderboardError).toBeNull();
    expect(state.topGoldLeaderboardFetchedAt).toEqual(expect.any(Number));
  });

  it('uses a fresh cache without calling the service again', async () => {
    useGamificationStore.setState({
      topGoldLeaderboard: rows,
      topGoldLeaderboardFetchedAt: Date.now(),
    });

    await useGamificationStore.getState().fetchTopGoldLeaderboard();

    expect(mockedGetTopGold).not.toHaveBeenCalled();
  });

  it('force refreshes a fresh cache', async () => {
    mockedGetTopGold.mockResolvedValue(rows);
    useGamificationStore.setState({
      topGoldLeaderboard: rows,
      topGoldLeaderboardFetchedAt: Date.now(),
    });

    await useGamificationStore.getState().fetchTopGoldLeaderboard(true);

    expect(mockedGetTopGold).toHaveBeenCalledTimes(1);
  });

  it('deduplicates concurrent requests', async () => {
    let resolveRequest: ((value: typeof rows) => void) | undefined;
    mockedGetTopGold.mockImplementation(() => new Promise((resolve) => {
      resolveRequest = resolve;
    }));

    const first = useGamificationStore.getState().fetchTopGoldLeaderboard();
    const second = useGamificationStore.getState().fetchTopGoldLeaderboard();

    expect(mockedGetTopGold).toHaveBeenCalledTimes(1);
    resolveRequest?.(rows);
    await Promise.all([first, second]);
  });

  it('keeps cached rows when refresh fails', async () => {
    mockedGetTopGold.mockRejectedValue(new Error('network'));
    useGamificationStore.setState({ topGoldLeaderboard: rows });

    await useGamificationStore.getState().fetchTopGoldLeaderboard(true);

    const state = useGamificationStore.getState();
    expect(state.topGoldLeaderboard).toEqual(rows);
    expect(state.topGoldLeaderboardError).toBe('Chưa cập nhật được Bảng vàng. Vui lòng thử lại.');
    expect(state.topGoldLeaderboardLoading).toBe(false);
  });
});
```

- [ ] **Step 4: Chạy service và store tests để xác nhận đang fail**

```bash
npm test -- tests/gamificationServiceTopGold.test.ts tests/gamificationTopGoldStore.test.ts --run
```

Expected: FAIL vì service đang chuyển lỗi thành `[]`, còn store chưa có các field và cache policy mới.

- [ ] **Step 5: Cho service truyền lỗi lên store**

Replace `getTopGoldLeaderboard` in `src/services/gamificationService.ts` with:

```ts
export const getTopGoldLeaderboard = async (): Promise<TopGoldStudent[]> => {
  const res = await callWorkerApi<TopGoldStudent[]>('get_top_gold_leaderboard');
  if (res.status === 'success' && Array.isArray(res.data)) {
    return res.data;
  }
  throw new Error(res.message || 'Không thể tải Bảng vàng.');
};
```

- [ ] **Step 6: Thêm state và TTL vào store**

Modify `src/stores/useGamificationStore.ts`.

Add after imports:

```ts
const TOP_GOLD_CACHE_TTL_MS = 60_000;
```

Extend `GamificationStore`:

```ts
topGoldLeaderboard: TopGoldStudent[];
topGoldLeaderboardLoading: boolean;
topGoldLeaderboardError: string | null;
topGoldLeaderboardFetchedAt: number | null;
```

Change action signature:

```ts
fetchTopGoldLeaderboard: (force?: boolean) => Promise<void>;
```

Add initial state:

```ts
topGoldLeaderboard: [],
topGoldLeaderboardLoading: false,
topGoldLeaderboardError: null,
topGoldLeaderboardFetchedAt: null,
```

Replace the existing action with:

```ts
fetchTopGoldLeaderboard: async (force = false) => {
  const { topGoldLeaderboardFetchedAt, topGoldLeaderboardLoading } = get();
  if (topGoldLeaderboardLoading) return;
  const cacheIsFresh = topGoldLeaderboardFetchedAt !== null
    && Date.now() - topGoldLeaderboardFetchedAt < TOP_GOLD_CACHE_TTL_MS;

  if (!force && cacheIsFresh) return;

  set({
    topGoldLeaderboardLoading: true,
    topGoldLeaderboardError: null,
  });

  try {
    const topGoldLeaderboard = await gamificationService.getTopGoldLeaderboard();
    set({
      topGoldLeaderboard,
      topGoldLeaderboardLoading: false,
      topGoldLeaderboardError: null,
      topGoldLeaderboardFetchedAt: Date.now(),
    });
  } catch {
    set({
      topGoldLeaderboardLoading: false,
      topGoldLeaderboardError: 'Chưa cập nhật được Bảng vàng. Vui lòng thử lại.',
    });
  }
},
```

Extend `clearGamification()` reset object:

```ts
topGoldLeaderboard: [],
topGoldLeaderboardLoading: false,
topGoldLeaderboardError: null,
topGoldLeaderboardFetchedAt: null,
```

- [ ] **Step 7: Chạy service và store tests**

```bash
npm test -- tests/gamificationServiceTopGold.test.ts tests/gamificationTopGoldStore.test.ts --run
```

Expected: PASS, 7 tests.

- [ ] **Step 8: Commit service và store change**

```bash
git add src/services/gamificationService.ts \
  src/stores/useGamificationStore.ts \
  tests/gamificationServiceTopGold.test.ts \
  tests/gamificationTopGoldStore.test.ts
git commit -m "feat: add reliable cached state for gold leaderboard"
```

---

### Task 3: Xây Top 3 podium thuần và có thể test độc lập

**Files:**
- Create: `src/components/gamification/StudentGoldPodium.tsx`
- Test: `tests/StudentFloatingSidebar.test.tsx`

**Interfaces:**
- Consumes:

```ts
students: TopGoldStudent[];
currentUsername?: string;
```

- Produces: markup cho tối đa ba học sinh đầu bảng, không phụ thuộc store.

- [ ] **Step 1: Tạo `StudentGoldPodium.tsx`**

```tsx
import React from 'react';
import { Crown, Medal } from 'lucide-react';
import { getAvatarUrl } from '../../config/avatars';
import type { TopGoldStudent } from '../../types/gamification.types';

interface StudentGoldPodiumProps {
  students: TopGoldStudent[];
  currentUsername?: string;
}

const podiumOrder = [1, 0, 2] as const;

const rankStyles = {
  0: {
    wrapper: 'order-2 -mt-4 border-amber-300 bg-amber-50 sm:-mt-8',
    badge: 'bg-amber-400 text-amber-950',
    label: 'Hạng 1',
  },
  1: {
    wrapper: 'order-1 border-slate-300 bg-slate-50',
    badge: 'bg-slate-300 text-slate-800',
    label: 'Hạng 2',
  },
  2: {
    wrapper: 'order-3 border-orange-300 bg-orange-50',
    badge: 'bg-orange-300 text-orange-950',
    label: 'Hạng 3',
  },
} as const;

export const StudentGoldPodium: React.FC<StudentGoldPodiumProps> = ({
  students,
  currentUsername,
}) => {
  const topThree = students.slice(0, 3);

  if (topThree.length === 0) return null;

  return (
    <ol aria-label="Ba học sinh dẫn đầu" className="grid grid-cols-3 items-end gap-2 sm:gap-4">
      {podiumOrder.map((studentIndex) => {
        const student = topThree[studentIndex];
        if (!student) return <li key={studentIndex} aria-hidden="true" />;

        const rank = studentIndex + 1;
        const style = rankStyles[studentIndex];
        const isCurrent = student.username === currentUsername;

        return (
          <li
            key={student.username}
            className={`relative flex min-w-0 flex-col items-center rounded-2xl border px-2 pb-4 pt-5 text-center shadow-sm ${style.wrapper}`}
          >
            <span className={`absolute -top-3 inline-flex min-h-7 items-center gap-1 rounded-full px-2 text-xs font-bold ${style.badge}`}>
              {rank === 1 ? <Crown className="h-3.5 w-3.5" aria-hidden="true" /> : <Medal className="h-3.5 w-3.5" aria-hidden="true" />}
              {style.label}
            </span>
            <img
              src={student.avatar ? getAvatarUrl(student.avatar) : getAvatarUrl('default')}
              alt=""
              aria-hidden="true"
              className={`h-14 w-14 rounded-full border-2 object-cover sm:h-16 sm:w-16 ${rank === 1 ? 'border-amber-400' : 'border-white'}`}
              onError={(event) => {
                event.currentTarget.src = getAvatarUrl('default');
              }}
            />
            <h3 className="mt-3 line-clamp-2 text-xs font-bold text-slate-900 sm:text-sm">
              {student.fullName}
            </h3>
            <p className="mt-1 text-xs font-semibold text-amber-700">
              {student.coins.toLocaleString('vi-VN')} xu
            </p>
            {isCurrent ? (
              <span className="mt-2 rounded-full bg-sky-100 px-2 py-0.5 text-[11px] font-bold text-sky-700">
                Em
              </span>
            ) : null}
          </li>
        );
      })}
    </ol>
  );
};
```

- [ ] **Step 2: Chạy component test mục tiêu**

```bash
npm test -- tests/StudentFloatingSidebar.test.tsx --run
```

Expected: vẫn FAIL vì modal/orchestrator chưa được thay, nhưng file podium compile thành công.

- [ ] **Step 3: Commit podium component**

```bash
git add src/components/gamification/StudentGoldPodium.tsx
git commit -m "feat: add student gold podium component"
```

---

### Task 4: Xây modal responsive với đầy đủ trạng thái và accessibility

**Files:**
- Create: `src/components/gamification/StudentGoldLeaderboardModal.tsx`
- Test: `tests/StudentFloatingSidebar.test.tsx`

**Interfaces:**
- Consumes:

```ts
interface StudentGoldLeaderboardModalProps {
  isOpen: boolean;
  students: TopGoldStudent[];
  currentUsername?: string;
  isLoading: boolean;
  error: string | null;
  onClose: () => void;
  onRetry: () => void;
}
```

- Produces: accessible responsive modal.

- [ ] **Step 1: Tạo modal component**

Create `src/components/gamification/StudentGoldLeaderboardModal.tsx`:

```tsx
import React, { useEffect, useRef } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { RefreshCw, Trophy, X } from 'lucide-react';
import { getAvatarUrl } from '../../config/avatars';
import type { TopGoldStudent } from '../../types/gamification.types';
import { StudentGoldPodium } from './StudentGoldPodium';

interface StudentGoldLeaderboardModalProps {
  isOpen: boolean;
  students: TopGoldStudent[];
  currentUsername?: string;
  isLoading: boolean;
  error: string | null;
  onClose: () => void;
  onRetry: () => void;
}

export const StudentGoldLeaderboardModal: React.FC<StudentGoldLeaderboardModalProps> = ({
  isOpen,
  students,
  currentUsername,
  isLoading,
  error,
  onClose,
  onRetry,
}) => {
  const dialogRef = useRef<HTMLElement>(null);
  const reduceMotion = useReducedMotion();

  useEffect(() => {
    if (!isOpen) return undefined;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const focusTimer = window.setTimeout(() => dialogRef.current?.focus(), 0);

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
        return;
      }

      if (event.key !== 'Tab' || !dialogRef.current) return;
      const focusable = Array.from(dialogRef.current.querySelectorAll<HTMLElement>(
        'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
      ));
      if (focusable.length === 0) {
        event.preventDefault();
        dialogRef.current.focus();
        return;
      }

      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      window.clearTimeout(focusTimer);
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [isOpen, onClose]);

  const hasRows = students.length > 0;
  const showInitialLoading = isLoading && !hasRows;

  return (
    <AnimatePresence>
      {isOpen ? (
        <motion.div
          data-testid="student-gold-backdrop"
          className="fixed inset-0 z-[70] flex items-end justify-center bg-slate-950/40 p-0 backdrop-blur-[2px] sm:items-center sm:p-5"
          initial={{ opacity: reduceMotion ? 1 : 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: reduceMotion ? 1 : 0 }}
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) onClose();
          }}
        >
          <motion.section
            ref={dialogRef}
            tabIndex={-1}
            role="dialog"
            aria-modal="true"
            aria-labelledby="student-gold-title"
            aria-describedby="student-gold-description"
            aria-label="Bảng vàng học sinh"
            initial={reduceMotion ? false : { opacity: 0, y: 28, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={reduceMotion ? undefined : { opacity: 0, y: 28, scale: 0.98 }}
            transition={{ duration: reduceMotion ? 0 : 0.2, ease: 'easeOut' }}
            className="flex max-h-[88dvh] w-full flex-col overflow-hidden rounded-t-3xl border border-slate-200 bg-[#FFFDF7] shadow-2xl sm:max-w-3xl sm:rounded-3xl"
            onMouseDown={(event) => event.stopPropagation()}
          >
            <header className="flex items-start justify-between gap-4 border-b border-amber-100 bg-white px-5 py-4 sm:px-6 sm:py-5">
              <div className="flex min-w-0 items-start gap-3">
                <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-amber-100 text-amber-700">
                  <Trophy className="h-6 w-6" aria-hidden="true" />
                </span>
                <div className="min-w-0">
                  <h2 id="student-gold-title" className="text-xl font-bold text-slate-900">
                    Bảng vàng học sinh
                  </h2>
                  <p id="student-gold-description" className="mt-1 text-sm text-slate-600">
                    10 học sinh có số xu hiện có cao nhất
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={onClose}
                aria-label="Đóng Bảng vàng"
                className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-slate-600 hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500"
              >
                <X className="h-5 w-5" aria-hidden="true" />
              </button>
            </header>

            <div className="min-h-0 flex-1 overflow-y-auto px-4 py-5 sm:px-6 sm:py-6">
              {showInitialLoading ? (
                <div className="space-y-5" aria-label="Đang tải Bảng vàng" aria-busy="true">
                  <div className="grid grid-cols-3 items-end gap-2 sm:gap-4">
                    {[0, 1, 2].map((index) => (
                      <div key={index} className="h-40 animate-pulse rounded-2xl bg-slate-100" />
                    ))}
                  </div>
                  <div className="space-y-2">
                    {[0, 1, 2, 3].map((index) => (
                      <div key={index} className="h-16 animate-pulse rounded-2xl bg-slate-100" />
                    ))}
                  </div>
                </div>
              ) : !hasRows && error ? (
                <div role="alert" className="mx-auto max-w-sm py-12 text-center">
                  <span className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-rose-100 text-rose-700">
                    <Trophy className="h-7 w-7" aria-hidden="true" />
                  </span>
                  <h3 className="mt-4 text-lg font-bold text-slate-900">Chưa thể tải Bảng vàng</h3>
                  <p className="mt-2 text-sm leading-6 text-slate-600">{error}</p>
                  <button
                    type="button"
                    onClick={onRetry}
                    className="mt-5 inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-sky-600 px-4 text-sm font-bold text-white hover:bg-sky-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 focus-visible:ring-offset-2"
                  >
                    <RefreshCw className="h-4 w-4" aria-hidden="true" />
                    Thử lại
                  </button>
                </div>
              ) : !hasRows ? (
                <div className="mx-auto max-w-sm py-12 text-center">
                  <span className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-amber-100 text-amber-700">
                    <Trophy className="h-7 w-7" aria-hidden="true" />
                  </span>
                  <h3 className="mt-4 text-lg font-bold text-slate-900">Bảng vàng đang chờ thành tích đầu tiên</h3>
                  <p className="mt-2 text-sm leading-6 text-slate-600">
                    Hoàn thành bài học để nhận xu và xuất hiện trên Bảng vàng.
                  </p>
                </div>
              ) : (
                <div className="space-y-6">
                  {error ? (
                    <div role="alert" className="flex items-center justify-between gap-3 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
                      <span>{error}</span>
                      <button type="button" onClick={onRetry} className="shrink-0 font-bold underline underline-offset-2">
                        Thử lại
                      </button>
                    </div>
                  ) : null}

                  <StudentGoldPodium students={students} currentUsername={currentUsername} />

                  {students.length > 3 ? (
                    <ol start={4} className="space-y-2" aria-label="Các thứ hạng còn lại">
                      {students.slice(3).map((student, offset) => {
                        const rank = offset + 4;
                        const isCurrent = student.username === currentUsername;
                        return (
                          <li
                            key={student.username}
                            className={`flex items-center gap-3 rounded-2xl border px-3 py-3 sm:px-4 ${isCurrent ? 'border-sky-200 bg-sky-50' : 'border-slate-200 bg-white'}`}
                          >
                            <span className="w-7 shrink-0 text-center text-sm font-black text-slate-500">{rank}</span>
                            <img
                              src={student.avatar ? getAvatarUrl(student.avatar) : getAvatarUrl('default')}
                              alt=""
                              aria-hidden="true"
                              className="h-11 w-11 shrink-0 rounded-full border border-slate-200 object-cover"
                              onError={(event) => {
                                event.currentTarget.src = getAvatarUrl('default');
                              }}
                            />
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-2">
                                <h3 className="truncate text-sm font-bold text-slate-900">{student.fullName}</h3>
                                {isCurrent ? (
                                  <span className="shrink-0 rounded-full bg-sky-100 px-2 py-0.5 text-[11px] font-bold text-sky-700">Em</span>
                                ) : null}
                              </div>
                              <p className="mt-1 text-xs font-semibold text-amber-700">
                                {student.coins.toLocaleString('vi-VN')} xu
                              </p>
                            </div>
                          </li>
                        );
                      })}
                    </ol>
                  ) : null}
                </div>
              )}
            </div>
          </motion.section>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
};
```

- [ ] **Step 2: Chạy TypeScript-aware component test**

```bash
npm test -- tests/StudentFloatingSidebar.test.tsx --run
```

Expected: vẫn FAIL tại orchestrator cũ, nhưng modal và podium compile.

- [ ] **Step 3: Commit modal component**

```bash
git add src/components/gamification/StudentGoldLeaderboardModal.tsx
git commit -m "feat: add responsive student gold leaderboard modal"
```

---

### Task 5: Thay nút chữ bằng cúp và nối modal với store

**Files:**
- Modify: `src/components/gamification/StudentFloatingSidebar.tsx:1-110`
- Test: `tests/StudentFloatingSidebar.test.tsx`

**Interfaces:**
- Consumes: store contract từ Task 2 và modal từ Task 4.
- Produces:

```ts
export interface StudentFloatingSidebarProps {
  currentUsername?: string;
}
```

- [ ] **Step 1: Thay toàn bộ `StudentFloatingSidebar.tsx`**

```tsx
import React, { useCallback, useRef, useState } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { Trophy } from 'lucide-react';
import { useGamificationStore } from '../../stores/useGamificationStore';
import { StudentGoldLeaderboardModal } from './StudentGoldLeaderboardModal';

export interface StudentFloatingSidebarProps {
  currentUsername?: string;
}

export const StudentFloatingSidebar: React.FC<StudentFloatingSidebarProps> = ({
  currentUsername,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const reduceMotion = useReducedMotion();
  const {
    topGoldLeaderboard,
    topGoldLeaderboardLoading,
    topGoldLeaderboardError,
    fetchTopGoldLeaderboard,
  } = useGamificationStore();

  const openLeaderboard = useCallback(() => {
    setIsOpen(true);
    void fetchTopGoldLeaderboard();
  }, [fetchTopGoldLeaderboard]);

  const closeLeaderboard = useCallback(() => {
    setIsOpen(false);
    window.setTimeout(() => triggerRef.current?.focus(), 0);
  }, []);

  return (
    <>
      <div className="fixed bottom-5 right-4 z-30 sm:right-5 md:bottom-6 md:right-6">
        <div className="group relative">
          <motion.button
            ref={triggerRef}
            type="button"
            onClick={openLeaderboard}
            aria-label="Mở Bảng vàng học sinh"
            whileHover={reduceMotion ? undefined : { y: -2, scale: 1.03 }}
            whileTap={reduceMotion ? undefined : { scale: 0.96 }}
            className="relative inline-flex h-14 w-14 items-center justify-center rounded-2xl border border-amber-300 bg-gradient-to-br from-amber-100 to-amber-300 text-amber-800 shadow-[0_10px_24px_rgba(180,83,9,0.24)] transition-shadow hover:shadow-[0_14px_30px_rgba(180,83,9,0.3)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 focus-visible:ring-offset-2"
          >
            <Trophy className="h-7 w-7" strokeWidth={2.2} aria-hidden="true" />
            <span className="pointer-events-none absolute inset-x-2 bottom-1 h-1 rounded-full bg-white/55" aria-hidden="true" />
          </motion.button>
          <span
            role="tooltip"
            className="pointer-events-none absolute bottom-full right-0 mb-2 hidden whitespace-nowrap rounded-lg bg-slate-900 px-2.5 py-1.5 text-xs font-semibold text-white opacity-0 shadow-lg transition-opacity group-hover:opacity-100 group-focus-within:opacity-100 md:block"
          >
            Mở Bảng vàng
          </span>
        </div>
      </div>

      <StudentGoldLeaderboardModal
        isOpen={isOpen}
        students={topGoldLeaderboard}
        currentUsername={currentUsername}
        isLoading={topGoldLeaderboardLoading}
        error={topGoldLeaderboardError}
        onClose={closeLeaderboard}
        onRetry={() => void fetchTopGoldLeaderboard(true)}
      />
    </>
  );
};
```

- [ ] **Step 2: Chạy contract tests**

```bash
npm test -- tests/StudentFloatingSidebar.test.tsx --run
```

Expected: PASS, 5 tests.

- [ ] **Step 3: Chạy store và component tests cùng nhau**

```bash
npm test -- tests/StudentFloatingSidebar.test.tsx tests/gamificationTopGoldStore.test.ts --run
```

Expected: PASS, 10 tests.

- [ ] **Step 4: Commit orchestration**

```bash
git add src/components/gamification/StudentFloatingSidebar.tsx tests/StudentFloatingSidebar.test.tsx
git commit -m "feat: replace leaderboard text button with trophy modal"
```

---

### Task 6: Truyền học sinh hiện tại từ Dashboard

**Files:**
- Modify: `src/components/HomePage/StudentDashboardUI.tsx:81`
- Test: `tests/studentPracticeRouting.test.tsx`

**Interfaces:**
- Consumes: `studentSession.username`.
- Produces: `currentUsername` cho trigger/modal.

- [ ] **Step 1: Chạy GitNexus impact analysis cho `StudentDashboardUI`**

```text
impact({ target: "StudentDashboardUI", direction: "upstream" })
```

Expected: thay đổi prop con, không đổi route hoặc controller contract.

- [ ] **Step 2: Sửa nơi render component**

Replace:

```tsx
<StudentFloatingSidebar />
```

With:

```tsx
<StudentFloatingSidebar currentUsername={studentSession.username} />
```

- [ ] **Step 3: Chạy routing regression test**

```bash
npm test -- tests/studentPracticeRouting.test.tsx --run
```

Expected: PASS. Mock hiện tại nhận mọi props và trả `null`, nên không cần sửa test.

- [ ] **Step 4: Commit integration**

```bash
git add src/components/HomePage/StudentDashboardUI.tsx
git commit -m "feat: highlight current student in gold leaderboard"
```

---

### Task 7: Thêm visual component test cho desktop và mobile

**Files:**
- Create: `cypress/component/student-gold-leaderboard.cy.tsx`
- Test: `cypress/component/student-gold-leaderboard.cy.tsx`

**Interfaces:**
- Consumes: Zustand state và `StudentFloatingSidebar`.
- Produces: bằng chứng không overflow, trigger đủ lớn và popup responsive.

- [ ] **Step 1: Tạo Cypress component spec**

```tsx
import React from 'react';
import { StudentFloatingSidebar } from '../../src/components/gamification/StudentFloatingSidebar';
import { useGamificationStore } from '../../src/stores/useGamificationStore';

const students = Array.from({ length: 10 }, (_, index) => ({
  username: `student-${index + 1}`,
  fullName: `Học sinh ${index + 1}`,
  avatar: '',
  coins: 1000 - index * 50,
}));

const mountLeaderboard = () => {
  useGamificationStore.setState({
    topGoldLeaderboard: students,
    topGoldLeaderboardLoading: false,
    topGoldLeaderboardError: null,
    topGoldLeaderboardFetchedAt: Date.now(),
    fetchTopGoldLeaderboard: async () => undefined,
  });
  cy.mount(
    <div className="min-h-dvh bg-[#FFFDF7]">
      <StudentFloatingSidebar currentUsername="student-4" />
    </div>,
  );
};

const assertNoHorizontalOverflow = () => {
  cy.document().then((document) => {
    expect(document.documentElement.scrollWidth).to.be.lte(document.documentElement.clientWidth + 1);
  });
};

describe('student gold leaderboard visual behavior', () => {
  it('renders a centered modal on desktop', () => {
    cy.viewport(1440, 900);
    mountLeaderboard();
    cy.get('button[aria-label="Mở Bảng vàng học sinh"]').click();
    cy.get('section[role="dialog"][aria-label="Bảng vàng học sinh"]').should('be.visible');
    cy.contains('Học sinh 1').should('be.visible');
    cy.contains('Em').should('be.visible');
    assertNoHorizontalOverflow();
  });

  it('renders a bottom sheet without overflow on mobile', () => {
    cy.viewport(360, 800);
    mountLeaderboard();
    cy.get('button[aria-label="Mở Bảng vàng học sinh"]')
      .should('have.css', 'height', '56px')
      .click();
    cy.get('section[role="dialog"][aria-label="Bảng vàng học sinh"]').should('be.visible');
    cy.get('button[aria-label="Đóng Bảng vàng"]').should('be.visible');
    assertNoHorizontalOverflow();
  });
});
```

- [ ] **Step 2: Chạy Cypress component test**

```bash
npx cypress run --component --spec cypress/component/student-gold-leaderboard.cy.tsx
```

Expected: 2 tests PASS, không horizontal overflow.

- [ ] **Step 3: Commit visual test**

```bash
git add cypress/component/student-gold-leaderboard.cy.tsx
git commit -m "test: cover gold leaderboard responsive layout"
```

---

### Task 8: Quality gate, browser QA và chuẩn bị rollout

**Files:**
- Review only: tất cả file đã thay đổi.
- No new production file required.

**Interfaces:**
- Produces: bằng chứng feature đủ điều kiện merge/deploy.

- [ ] **Step 1: Chạy targeted tests**

```bash
npm test -- tests/StudentFloatingSidebar.test.tsx tests/gamificationServiceTopGold.test.ts tests/gamificationTopGoldStore.test.ts tests/studentPracticeRouting.test.tsx --run
```

Expected: tất cả PASS.

- [ ] **Step 2: Chạy full test suite**

```bash
npm run test:run
```

Expected: exit code 0.

- [ ] **Step 3: Chạy production build**

```bash
npm run build
```

Expected: exit code 0; không có TypeScript/Vite build error mới.

- [ ] **Step 4: Chạy GitNexus change detection trước commit/PR**

```text
detect_changes({ scope: "compare", base_ref: "main" })
```

Expected affected scope:

- `StudentFloatingSidebar`.
- `StudentDashboardUI`.
- `useGamificationStore.fetchTopGoldLeaderboard`.
- Hai component Bảng vàng mới.
- Các test liên quan.

Không được xuất hiện route Worker, auth, quiz submission hoặc gift shop flow ngoài dự kiến.

- [ ] **Step 5: Browser QA trên dashboard thật**

Kiểm tra lần lượt tại viewport 1440 × 900, 768 × 1024 và 360 × 800:

1. Nút chữ cũ biến mất; chỉ còn nút cúp.
2. Nút cúp không che nội dung hoặc thanh điều hướng.
3. Tab đến nút cúp và nhấn Enter mở popup.
4. Lần đầu mở mới phát request `/api/leaderboard/top-gold`.
5. Đóng rồi mở lại trong 60 giây không phát request mới.
6. Top 3 đúng thứ tự và hạng 1 nổi bật nhất.
7. Học sinh hiện tại có nhãn “Em” nếu thuộc Top 10.
8. Nút X, backdrop và `Escape` đều đóng popup.
9. Sau khi đóng, focus quay lại cúp.
10. Không có lỗi console và không có horizontal scrollbar.

- [ ] **Step 6: Final commit nếu còn thay đổi chưa commit**

```bash
git add src/components/gamification/StudentFloatingSidebar.tsx \
  src/components/gamification/StudentGoldLeaderboardModal.tsx \
  src/components/gamification/StudentGoldPodium.tsx \
  src/components/HomePage/StudentDashboardUI.tsx \
  src/services/gamificationService.ts \
  src/stores/useGamificationStore.ts \
  tests/StudentFloatingSidebar.test.tsx \
  tests/gamificationServiceTopGold.test.ts \
  tests/gamificationTopGoldStore.test.ts \
  cypress/component/student-gold-leaderboard.cy.tsx
git commit -m "feat: deliver student gold leaderboard popup"
```

- [ ] **Step 7: Rollout và smoke test production**

Sau deploy:

- Đăng nhập bằng một tài khoản học sinh.
- Mở Dashboard và bấm cúp.
- Xác nhận endpoint trả 200.
- Xác nhận danh sách đúng 10 hoặc ít hơn nếu hệ thống có ít học sinh.
- Kiểm tra avatar fallback.
- Theo dõi console/network 10 phút để phát hiện request lặp hoặc lỗi render.

Rollback bằng cách revert commit feature; không có migration database phải đảo ngược.

---

## Deferred Phase 2

Các chức năng sau chỉ bắt đầu sau khi MVP được đo lường và người dùng phê duyệt hợp đồng dữ liệu:

- Tab Tuần / Tháng / Toàn thời gian.
- Hạng của em khi ngoài Top 10.
- Bảng vàng theo lớp, môn học hoặc trường.
- Điểm tăng/giảm thứ hạng.
- Chuỗi học tập và huy hiệu thành tích.
- Cơ chế chống cày xu và lịch sử giao dịch xu.

Phase 2 cần thiết kế API mới thay vì kéo dài `GET /api/leaderboard/top-gold`, vì số dư xu hiện tại không thể suy ra xu kiếm được trong tuần hoặc tháng.
