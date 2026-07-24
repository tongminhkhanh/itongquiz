# Console Warnings and Quiz Loading Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Loại bỏ các cảnh báo MathJax và password autocomplete trên production, đồng thời ngăn các lượt tải danh sách đề bị lặp mà vẫn giữ khả năng làm mới dữ liệu khi giáo viên thao tác.

**Architecture:** Chia thành ba lát độc lập và một cổng xác minh chung. Cấu hình MathJax được đưa vào module dùng chung và chỉ nạp extension cần thiết. `loadQuizzes()` được mở rộng tương thích ngược bằng in-flight dedupe, freshness window 30 giây và `force` cho các luồng cần dữ liệu mới. Các input đăng nhập/đổi mật khẩu được gắn autocomplete đúng ngữ nghĩa.

**Tech Stack:** React 19, TypeScript 5.8, Zustand 5, Vite 6, `better-react-mathjax`, Vitest 4, Testing Library, Cypress 15.

## Global Constraints

- Không thay đổi API Cloudflare Worker, schema D1, payload đề thi hoặc logic chấm điểm.
- Không thêm dependency mới.
- Giữ nguyên khả năng hiển thị `ams`, `noundefined` và `noerrors`.
- `loadQuizzes()` phải tiếp tục hoạt động khi caller gọi không truyền tham số.
- Manual refresh, duplicate, manual publish và live exam phải tiếp tục lấy dữ liệu mới.
- Không che warning bằng cách chặn `console.warn`; phải sửa tại cấu hình hoặc markup nguồn.
- Không còn `console.log('[quizStore] Loaded ...')` trong production.
- Mỗi thay đổi production phải có test RED trước khi triển khai.
- Thực hiện trong worktree riêng từ `origin/main`, không code trực tiếp trên `main`.

## Confirmed root causes

1. `index.tsx` dùng `input/tex` nhưng nạp lại `[tex]/ams` và `[tex]/noundefined`, đồng thời thêm lại hai package trong `tex.packages`. Component `input/tex` đã bao gồm `ams` và `noundefined`.
2. `loadQuizzes()` được gọi ở app bootstrap và Teacher Dashboard bootstrap nhưng store chưa có in-flight dedupe hoặc freshness policy.
3. `src/components/HomePage/components/LoginForm.tsx` và `src/features/student-dashboard/components/ChangePasswordModal.tsx` có password input thiếu `autoComplete`.
4. `stores/quizStore.ts` dùng `console.log()` trực tiếp thay vì logger tập trung vốn tự ẩn debug/info trên production.

---

### Task 1: Chuẩn hóa cấu hình MathJax

**Files:**
- Create: `src/config/mathJaxConfig.ts`
- Modify: `index.tsx`
- Modify: `cypress/component/math-rendering.cy.tsx`
- Modify: `cypress/component/student-dropdown-menu.cy.tsx`
- Create: `tests/mathJaxConfig.test.ts`

**Interfaces:**

```ts
export const mathJaxConfig: {
  loader: { load: string[] };
  tex: {
    packages: { '[+]': string[] };
    inlineMath: string[][];
    displayMath: string[][];
    processEscapes: boolean;
  };
  options: {
    ignoreHtmlClass: string;
    processHtmlClass: string;
  };
};
```

- [ ] **Step 1: Viết RED test cho cấu hình**

Create `tests/mathJaxConfig.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { mathJaxConfig } from '../src/config/mathJaxConfig';

describe('mathJaxConfig', () => {
  it('does not reload extensions already bundled by input/tex', () => {
    expect(mathJaxConfig.loader.load).toEqual([
      'input/tex',
      'output/chtml',
      '[tex]/noerrors',
    ]);
    expect(mathJaxConfig.loader.load).not.toContain('[tex]/ams');
    expect(mathJaxConfig.loader.load).not.toContain('[tex]/noundefined');
    expect(mathJaxConfig.tex.packages).toEqual({ '[+]': ['noerrors'] });
  });

  it('preserves existing delimiter and HTML processing rules', () => {
    expect(mathJaxConfig.tex.inlineMath).toEqual([
      ['$', '$'],
      ['\\(', '\\)'],
    ]);
    expect(mathJaxConfig.tex.displayMath).toEqual([
      ['$$', '$$'],
      ['\\[', '\\]'],
    ]);
    expect(mathJaxConfig.tex.processEscapes).toBe(true);
    expect(mathJaxConfig.options).toEqual({
      ignoreHtmlClass: 'tex2jax_ignore',
      processHtmlClass: 'tex2jax_process',
    });
  });
});
```

- [ ] **Step 2: Xác nhận RED**

```bash
npm run test:run -- tests/mathJaxConfig.test.ts
```

Expected: FAIL vì module config chưa tồn tại.

- [ ] **Step 3: Tạo config dùng chung**

Create `src/config/mathJaxConfig.ts`:

```ts
export const mathJaxConfig = {
  loader: {
    load: ['input/tex', 'output/chtml', '[tex]/noerrors'],
  },
  tex: {
    packages: { '[+]': ['noerrors'] },
    inlineMath: [['$', '$'], ['\\(', '\\)']],
    displayMath: [['$$', '$$'], ['\\[', '\\]']],
    processEscapes: true,
  },
  options: {
    ignoreHtmlClass: 'tex2jax_ignore',
    processHtmlClass: 'tex2jax_process',
  },
};
```

- [ ] **Step 4: Dùng config chung trong production entry**

Trong `index.tsx`, thêm:

```ts
import { mathJaxConfig } from './src/config/mathJaxConfig';
```

Xóa toàn bộ `const mathJaxConfig = { ... }` cục bộ. Giữ nguyên:

```tsx
<MathJaxContext config={mathJaxConfig}>
```

- [ ] **Step 5: Dùng config chung trong Cypress math fixtures**

Trong cả hai file Cypress:

```ts
import { mathJaxConfig } from '../../src/config/mathJaxConfig';
```

Xóa hai object `const mathJaxConfig` cục bộ.

- [ ] **Step 6: Xác nhận GREEN và math regression**

```bash
npm run test:run -- tests/mathJaxConfig.test.ts tests/InteractiveMathText.test.tsx
npx cypress run --component --spec cypress/component/math-rendering.cy.tsx,cypress/component/student-dropdown-menu.cy.tsx --browser electron
```

Expected: tests PASS, không có `mjx-merror`, dropdown LaTeX vẫn chọn được.

- [ ] **Step 7: Commit Task 1**

```bash
git add src/config/mathJaxConfig.ts index.tsx \
  cypress/component/math-rendering.cy.tsx \
  cypress/component/student-dropdown-menu.cy.tsx \
  tests/mathJaxConfig.test.ts
git commit -m "fix(math): remove duplicate MathJax extension loading"
```

---

### Task 2: Dedupe và điều phối tải danh sách đề

**Files:**
- Create: `src/domain/quiz/quizLoadPolicy.ts`
- Modify: `stores/quizStore.ts`
- Modify: `src/components/TeacherDashboard/teacher-dashboard-shell/useTeacherDashboardBootstrap.ts`
- Modify: `src/components/TeacherDashboard/ManageTab.tsx`
- Modify: `src/features/manual-quiz-workspace/hooks/useManualQuizPublish.ts`
- Modify: `src/features/student-dashboard/hooks/useLiveExamQuizPreparation.ts`
- Modify: `tests/TeacherDashboardShell.test.tsx`
- Create: `tests/quizLoadPolicy.test.ts`
- Create: `tests/quizStoreLoadQuizzes.test.ts`

**Interfaces:**

```ts
export interface QuizLoadOptions {
  force?: boolean;
  maxAgeMs?: number;
}

export const DEFAULT_QUIZ_LOAD_MAX_AGE_MS = 30_000;

export const isQuizCatalogFresh: (input: {
  hasQuizzes: boolean;
  loadedAt: number | null;
  now: number;
  maxAgeMs?: number;
}) => boolean;
```

`QuizState` becomes:

```ts
quizzesLoadedAt: number | null;
loadQuizzes: (options?: QuizLoadOptions) => Promise<void>;
```

Semantics:
- Default call reuses a non-empty catalog loaded less than 30 seconds ago.
- Concurrent callers share one active Promise.
- `force: true` bypasses freshness, invalidates `quizzes:` cache and reloads.
- A force caller still joins an already active load instead of opening a parallel request.
- `quizzesLoadedAt` is runtime-only and is not persisted.

- [ ] **Step 1: Viết RED test cho freshness policy**

Create `tests/quizLoadPolicy.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import {
  DEFAULT_QUIZ_LOAD_MAX_AGE_MS,
  isQuizCatalogFresh,
} from '../src/domain/quiz/quizLoadPolicy';

describe('quizLoadPolicy', () => {
  it('reuses a non-empty catalog inside the default window', () => {
    expect(isQuizCatalogFresh({
      hasQuizzes: true,
      loadedAt: 1_000,
      now: 1_000 + DEFAULT_QUIZ_LOAD_MAX_AGE_MS - 1,
    })).toBe(true);
  });

  it('reloads empty, never-loaded and expired catalogs', () => {
    expect(isQuizCatalogFresh({
      hasQuizzes: false,
      loadedAt: 1_000,
      now: 1_001,
    })).toBe(false);
    expect(isQuizCatalogFresh({
      hasQuizzes: true,
      loadedAt: null,
      now: 1_001,
    })).toBe(false);
    expect(isQuizCatalogFresh({
      hasQuizzes: true,
      loadedAt: 1_000,
      now: 1_000 + DEFAULT_QUIZ_LOAD_MAX_AGE_MS,
    })).toBe(false);
  });
});
```

- [ ] **Step 2: Viết RED tests cho store coordinator**

Create `tests/quizStoreLoadQuizzes.test.ts`:

```ts
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  callApi: vi.fn(),
  invalidatePrefix: vi.fn(),
  debug: vi.fn(),
}));

vi.mock('../src/services/apiAdapter', () => ({ callApi: mocks.callApi }));
vi.mock('../src/services/CacheService', () => ({
  cacheService: { invalidatePrefix: mocks.invalidatePrefix },
}));
vi.mock('../src/services/logger', () => ({
  logger: { debug: mocks.debug },
}));

import { useQuizStore } from '../stores/quizStore';

const quizRows = [{
  id: 'quiz-1',
  title: 'Phân số',
  classLevel: '4',
  category: 'Toán',
  timeLimit: 30,
  createdAt: '2026-07-24T00:00:00.000Z',
}];

const installSuccessfulApi = () => {
  mocks.callApi.mockImplementation(async (action: string) => {
    if (action === 'get_quizzes') return quizRows;
    if (action === 'get_questions') return [];
    throw new Error(`Unexpected action: ${action}`);
  });
};

describe('quizStore.loadQuizzes', () => {
  beforeEach(() => {
    mocks.callApi.mockReset();
    mocks.invalidatePrefix.mockReset();
    mocks.debug.mockReset();
    useQuizStore.setState({
      quizzes: [],
      selectedQuiz: null,
      isLoading: false,
      error: null,
      quizzesLoadedAt: null,
    } as any);
  });

  it('shares one API request pair across concurrent callers', async () => {
    let release!: (value: unknown[]) => void;
    const quizPromise = new Promise<unknown[]>((resolve) => {
      release = resolve;
    });
    mocks.callApi.mockImplementation((action: string) => {
      if (action === 'get_quizzes') return quizPromise;
      if (action === 'get_questions') return Promise.resolve([]);
      throw new Error(`Unexpected action: ${action}`);
    });

    const first = useQuizStore.getState().loadQuizzes();
    const second = useQuizStore.getState().loadQuizzes();

    expect(mocks.callApi).toHaveBeenCalledTimes(2);
    release(quizRows);
    await Promise.all([first, second]);
    expect(mocks.callApi).toHaveBeenCalledTimes(2);
  });

  it('reuses fresh data and force reloads after invalidating cache', async () => {
    installSuccessfulApi();

    await useQuizStore.getState().loadQuizzes();
    await useQuizStore.getState().loadQuizzes();
    expect(mocks.callApi).toHaveBeenCalledTimes(2);

    await useQuizStore.getState().loadQuizzes({ force: true });
    expect(mocks.invalidatePrefix).toHaveBeenCalledWith('quizzes:');
    expect(mocks.callApi).toHaveBeenCalledTimes(4);
  });

  it('clears the active coordinator after failure so a later call retries', async () => {
    let shouldFail = true;
    mocks.callApi.mockImplementation(async (action: string) => {
      if (shouldFail) throw new Error('offline');
      if (action === 'get_quizzes') return quizRows;
      if (action === 'get_questions') return [];
      throw new Error(`Unexpected action: ${action}`);
    });

    await useQuizStore.getState().loadQuizzes();
    expect(useQuizStore.getState().quizzesLoadedAt).toBeNull();

    shouldFail = false;
    await useQuizStore.getState().loadQuizzes();
    expect(useQuizStore.getState().quizzes).toHaveLength(1);
    expect(mocks.callApi).toHaveBeenCalledTimes(4);
  });

  it('uses the production-silent logger instead of console.log', async () => {
    installSuccessfulApi();
    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => undefined);

    await useQuizStore.getState().loadQuizzes();

    expect(mocks.debug).toHaveBeenCalledWith(
      'Loaded 1 quizzes from D1',
      { module: 'QuizStore' },
    );
    expect(consoleSpy).not.toHaveBeenCalled();
    consoleSpy.mockRestore();
  });
});
```

- [ ] **Step 3: Xác nhận RED**

```bash
npm run test:run -- tests/quizLoadPolicy.test.ts tests/quizStoreLoadQuizzes.test.ts
```

Expected: FAIL vì policy, options, timestamp và dedupe chưa tồn tại.

- [ ] **Step 4: Tạo pure freshness policy**

Create `src/domain/quiz/quizLoadPolicy.ts`:

```ts
export interface QuizLoadOptions {
  force?: boolean;
  maxAgeMs?: number;
}

export const DEFAULT_QUIZ_LOAD_MAX_AGE_MS = 30_000;

export const isQuizCatalogFresh = ({
  hasQuizzes,
  loadedAt,
  now,
  maxAgeMs = DEFAULT_QUIZ_LOAD_MAX_AGE_MS,
}: {
  hasQuizzes: boolean;
  loadedAt: number | null;
  now: number;
  maxAgeMs?: number;
}): boolean => (
  hasQuizzes
  && loadedAt !== null
  && now - loadedAt < maxAgeMs
);
```

- [ ] **Step 5: Mở rộng store contract**

Trong `stores/quizStore.ts`, thêm imports và coordinator:

```ts
import {
  isQuizCatalogFresh,
  type QuizLoadOptions,
} from '../src/domain/quiz/quizLoadPolicy';
import { logger } from '../src/services/logger';

let activeQuizLoad: Promise<void> | null = null;
```

Trong `QuizState`:

```ts
quizzesLoadedAt: number | null;
loadQuizzes: (options?: QuizLoadOptions) => Promise<void>;
```

Trong initial state:

```ts
quizzesLoadedAt: null,
```

Không thêm `quizzesLoadedAt` vào `partialize`.

- [ ] **Step 6: Thay toàn bộ implementation `loadQuizzes`**

```ts
loadQuizzes: (options = {}) => {
  const state = get();
  const force = options.force === true;

  if (!force && isQuizCatalogFresh({
    hasQuizzes: state.quizzes.length > 0,
    loadedAt: state.quizzesLoadedAt,
    now: Date.now(),
    maxAgeMs: options.maxAgeMs,
  })) {
    return Promise.resolve();
  }

  if (force) {
    cacheService.invalidatePrefix('quizzes:');
  }

  if (activeQuizLoad) return activeQuizLoad;

  const request = (async () => {
    set({ isLoading: true, error: null });
    try {
      const [quizData, questionData] = await Promise.all([
        callApi<any[]>('get_quizzes'),
        callApi<any[]>('get_questions'),
      ]);

      if (!Array.isArray(quizData)) {
        set({ quizzes: [], isLoading: false, quizzesLoadedAt: null });
        return;
      }

      const existingById = new Map(
        get().quizzes.map((quiz) => [quiz.id, quiz]),
      );
      const questionsByQuizId = new Map<string, any[]>();

      if (Array.isArray(questionData)) {
        questionData.forEach((row: any) => {
          const question = normalizeQuestionRow(row);
          const quizId = question.quizId || row.quiz_id;
          if (!quizId) return;
          const questions = questionsByQuizId.get(quizId) || [];
          questions.push(question);
          questionsByQuizId.set(quizId, questions);
        });
      }

      const quizzes: Quiz[] = filterActiveQuizzes(quizData).map((row: any) => ({
        id: row.id,
        title: row.title || '',
        classLevel: row.classLevel || row.class_level || '',
        category: row.category || '',
        timeLimit: parseInt(row.timeLimit || row.time_limit) || 30,
        createdAt: row.createdAt || row.created_at || new Date().toISOString(),
        createdBy: row.createdBy || row.created_by || '',
        accessCode: row.accessCode || row.access_code || undefined,
        requireCode:
          row.requireCode === true
          || row.requireCode === 'TRUE'
          || row.requireCode === 1
          || row.require_code === true
          || row.require_code === 'TRUE'
          || row.require_code === 1,
        showOnHome: !(
          row.showOnHome === false
          || row.showOnHome === 'FALSE'
          || row.showOnHome === 0
          || row.show_on_home === false
          || row.show_on_home === 'FALSE'
          || row.show_on_home === 0
        ),
        tags: (() => {
          if (typeof row.tags === 'string') {
            try {
              return JSON.parse(row.tags);
            } catch {
              return [];
            }
          }
          return Array.isArray(row.tags) ? row.tags : [];
        })(),
        questions:
          questionsByQuizId.get(row.id)
          || existingById.get(row.id)?.questions
          || [],
      }));

      const currentSelectedQuiz = get().selectedQuiz;
      const updatedSelectedQuiz = currentSelectedQuiz
        ? quizzes.find((quiz) => quiz.id === currentSelectedQuiz.id) || null
        : null;

      logger.debug(`Loaded ${quizzes.length} quizzes from D1`, {
        module: 'QuizStore',
      });
      set({
        quizzes,
        selectedQuiz: updatedSelectedQuiz,
        isLoading: false,
        quizzesLoadedAt: Date.now(),
      });
    } catch (err: any) {
      set({
        error: err.message || 'Failed to load quizzes',
        isLoading: false,
        quizzesLoadedAt: null,
      });
    }
  })();

  activeQuizLoad = request.finally(() => {
    activeQuizLoad = null;
  });
  return activeQuizLoad;
},
```

- [ ] **Step 7: Phân loại tất cả caller default/force**

`useTeacherDashboardBootstrap.ts`:

```ts
const loadQuizzes = useQuizStore((state) => state.loadQuizzes);

useEffect(() => {
  void loadQuizzes();
  void loadTeacherResults();
}, [loadQuizzes, loadTeacherResults]);
```

Xóa import `cacheService` và dòng:

```ts
cacheService.invalidatePrefix('quizzes:');
```

`ManageTab.tsx`:

```ts
quizStore.loadQuizzes({ force: true }),
```

`quizStore.ts` trong `duplicateQuiz`:

```ts
await get().loadQuizzes({ force: true });
```

`useManualQuizPublish.ts`:

```ts
await loadQuizzes({ force: true });
```

`useLiveExamQuizPreparation.ts`:

```ts
await loadQuizzes({ force: true });
```

`src/app/useLoadQuizzes.ts` tiếp tục gọi default:

```ts
void loadQuizzes();
```

- [ ] **Step 8: Cập nhật Teacher Dashboard regression**

Đổi tên test thành:

```ts
it('bootstraps teacher data without forcing a duplicate quiz refresh', async () => {
```

Assertions:

```ts
await waitFor(() => (
  expect(useQuizStore.getState().loadQuizzes).toHaveBeenCalledTimes(1)
));
await waitFor(() => (
  expect(useQuizStore.getState().loadResults).toHaveBeenCalledTimes(1)
));
expect(mocks.invalidatePrefix).not.toHaveBeenCalled();
```

- [ ] **Step 9: Xác nhận GREEN**

```bash
npm run test:run -- \
  tests/quizLoadPolicy.test.ts \
  tests/quizStoreLoadQuizzes.test.ts \
  tests/TeacherDashboardShell.test.tsx
```

Expected: PASS. Các React `act(...)` warning cũ nếu còn phải được ghi nhận riêng, không tính là lỗi mới.

- [ ] **Step 10: Commit Task 2**

```bash
git add src/domain/quiz/quizLoadPolicy.ts stores/quizStore.ts \
  src/components/TeacherDashboard/teacher-dashboard-shell/useTeacherDashboardBootstrap.ts \
  src/components/TeacherDashboard/ManageTab.tsx \
  src/features/manual-quiz-workspace/hooks/useManualQuizPublish.ts \
  src/features/student-dashboard/hooks/useLiveExamQuizPreparation.ts \
  tests/quizLoadPolicy.test.ts tests/quizStoreLoadQuizzes.test.ts \
  tests/TeacherDashboardShell.test.tsx
git commit -m "fix(quiz): deduplicate catalog loading"
```

## Checkpoint after Task 2

- [ ] Hai concurrent caller chỉ tạo một cặp API call.
- [ ] Catalog mới tải trong 30 giây được reuse.
- [ ] `force: true` invalidate và reload.
- [ ] Manual refresh, duplicate, publish và live exam đều dùng force.
- [ ] `quizzesLoadedAt` không được persist.
- [ ] Không còn direct production `console.log` của quizStore.

---

### Task 3: Bổ sung password autocomplete metadata

**Files:**
- Modify: `src/components/HomePage/components/LoginForm.tsx`
- Modify: `src/components/common/LoginModal.tsx`
- Modify: `src/features/student-dashboard/components/ChangePasswordModal.tsx`
- Create: `tests/passwordAutocomplete.test.tsx`

**Interfaces:**

```ts
autoComplete: 'current-password' | 'new-password';
```

- [ ] **Step 1: Viết RED tests**

Create `tests/passwordAutocomplete.test.tsx`:

```tsx
import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import LoginForm from '../src/components/HomePage/components/LoginForm';
import { ChangePasswordModal } from '../src/features/student-dashboard/components/ChangePasswordModal';

vi.mock('framer-motion', () => ({
  AnimatePresence: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  motion: {
    div: ({ children, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
      <div {...props}>{children}</div>
    ),
    form: ({ children, ...props }: React.FormHTMLAttributes<HTMLFormElement>) => (
      <form {...props}>{children}</form>
    ),
  },
}));

describe('password autocomplete metadata', () => {
  it('marks login username and password for password managers', () => {
    render(
      <LoginForm
        activeTab="teacher"
        setActiveTab={vi.fn()}
        username=""
        setUsername={vi.fn()}
        password=""
        setPassword={vi.fn()}
        isLoading={false}
        onSubmit={vi.fn()}
      />,
    );

    expect(screen.getByPlaceholderText('Tài khoản giáo viên'))
      .toHaveAttribute('autocomplete', 'username');
    expect(screen.getByPlaceholderText('••••••••'))
      .toHaveAttribute('autocomplete', 'current-password');
  });

  it('distinguishes current and new passwords in the student dialog', () => {
    render(<ChangePasswordModal account={{
      isOpen: true,
      currentPassword: '',
      newPassword: '',
      confirmNewPassword: '',
      isSubmitting: false,
      errorMessage: '',
      close: vi.fn(),
      submit: vi.fn(),
      setCurrentPassword: vi.fn(),
      setNewPassword: vi.fn(),
      setConfirmNewPassword: vi.fn(),
    } as any} />);

    const passwordInputs = Array.from(
      document.querySelectorAll<HTMLInputElement>('input[type="password"]'),
    );
    expect(passwordInputs).toHaveLength(3);
    expect(passwordInputs[0]).toHaveAttribute('autocomplete', 'current-password');
    expect(passwordInputs[1]).toHaveAttribute('autocomplete', 'new-password');
    expect(passwordInputs[2]).toHaveAttribute('autocomplete', 'new-password');
  });
});
```

- [ ] **Step 2: Xác nhận RED**

```bash
npm run test:run -- tests/passwordAutocomplete.test.tsx
```

Expected: FAIL vì metadata chưa có.

- [ ] **Step 3: Sửa LoginForm và LoginModal**

`LoginForm.tsx` username:

```tsx
<input
  type="text"
  autoComplete="username"
  className="w-full pl-11 pr-4 py-3 bg-[#f9fafb] border-2 border-[#f3f4f6] rounded-[14px] text-[0.95rem] text-[#1f2937] outline-none transition-all focus:border-[#22c55e] focus:bg-white focus:ring-4 focus:ring-green-500/10 placeholder:text-[#9ca3af] placeholder:font-medium"
  value={username}
  onChange={(event) => setUsername(event.target.value)}
  placeholder={activeTab === 'student' ? 'Mã học sinh' : 'Tài khoản giáo viên'}
  required
/>
```

`LoginForm.tsx` password:

```tsx
<input
  type="password"
  autoComplete="current-password"
  className="w-full pl-11 pr-4 py-3 bg-[#f9fafb] border-2 border-[#f3f4f6] rounded-[14px] text-[0.95rem] text-[#1f2937] outline-none transition-all focus:border-[#22c55e] focus:bg-white focus:ring-4 focus:ring-green-500/10 placeholder:text-[#9ca3af] placeholder:font-medium"
  value={password}
  onChange={(event) => setPassword(event.target.value)}
  placeholder={activeTab === 'student' ? 'Mật khẩu học sinh' : '••••••••'}
  required
/>
```

`LoginModal.tsx` username:

```tsx
<input
  type="text"
  autoComplete="username"
  value={username}
  onChange={(event) => setUsername(event.target.value)}
  className="w-full pl-[52px] pr-4 h-14 border-2 border-slate-200 rounded-2xl focus:border-blue-400 focus:ring-4 focus:ring-blue-50 outline-none transition-all font-bold text-slate-700 bg-slate-50 focus:bg-white"
  placeholder="Tài Khoản"
  autoFocus
/>
```

Password của `LoginModal` đã có `autoComplete="current-password"`, giữ nguyên.

- [ ] **Step 4: Sửa ChangePasswordModal bằng typed prop**

Call sites:

```tsx
<PasswordField
  label="Mật khẩu cũ"
  value={account.currentPassword}
  onChange={account.setCurrentPassword}
  placeholder="Nhập mật khẩu hiện tại"
  autoComplete="current-password"
  autoFocus
/>
<PasswordField
  label="Mật khẩu mới"
  value={account.newPassword}
  onChange={account.setNewPassword}
  placeholder="Tối thiểu 6 ký tự"
  autoComplete="new-password"
/>
<PasswordField
  label="Nhập lại mật khẩu mới"
  value={account.confirmNewPassword}
  onChange={account.setConfirmNewPassword}
  placeholder="Nhập lại mật khẩu mới"
  autoComplete="new-password"
/>
```

Replace `PasswordField` with:

```tsx
const PasswordField = ({
  label,
  value,
  onChange,
  placeholder,
  autoComplete,
  autoFocus = false,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  autoComplete: 'current-password' | 'new-password';
  autoFocus?: boolean;
}) => (
  <div>
    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
      {label}
    </label>
    <input
      type="password"
      autoComplete={autoComplete}
      value={value}
      onChange={(event) => onChange(event.target.value)}
      className="w-full px-4 py-3 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500"
      placeholder={placeholder}
      autoFocus={autoFocus}
    />
  </div>
);
```

- [ ] **Step 5: Xác nhận GREEN**

```bash
npm run test:run -- tests/passwordAutocomplete.test.tsx
```

Expected: PASS, không có DOM warning mới.

- [ ] **Step 6: Commit Task 3**

```bash
git add src/components/HomePage/components/LoginForm.tsx \
  src/components/common/LoginModal.tsx \
  src/features/student-dashboard/components/ChangePasswordModal.tsx \
  tests/passwordAutocomplete.test.tsx
git commit -m "fix(auth): add password autocomplete metadata"
```

---

### Task 4: Browser regression và final verification

**Files:**
- Create: `cypress/component/console-hygiene.cy.tsx`

- [ ] **Step 1: Tạo Cypress regression**

Create `cypress/component/console-hygiene.cy.tsx`:

```tsx
import React from 'react';
import { MathJaxContext } from 'better-react-mathjax';
import { mathJaxConfig } from '../../src/config/mathJaxConfig';
import MathSpan from '../../src/components/common/MathSpan';
import LoginForm from '../../src/components/HomePage/components/LoginForm';

describe('production console hygiene contracts', () => {
  it('typesets AMS math without component-version warnings', () => {
    cy.window().then((win) => {
      const warnings: string[] = [];
      cy.stub(win.console, 'warn').callsFake((...args: unknown[]) => {
        warnings.push(args.map(String).join(' '));
      });

      cy.mount(
        <MathJaxContext config={mathJaxConfig}>
          <MathSpan content={'$\\frac{a^2+b^2}{2}$'} />
        </MathJaxContext>,
      );

      cy.get('mjx-container', { timeout: 30_000 }).should('be.visible');
      cy.then(() => {
        expect(warnings.some((message) => (
          message.includes('No version information available for component')
        ))).to.equal(false);
      });
    });
  });

  it('renders login fields with autocomplete metadata', () => {
    cy.mount(
      <LoginForm
        activeTab="teacher"
        setActiveTab={() => undefined}
        username=""
        setUsername={() => undefined}
        password=""
        setPassword={() => undefined}
        isLoading={false}
        onSubmit={(event) => event.preventDefault()}
      />,
    );

    cy.get('input[type="text"]')
      .should('have.attr', 'autocomplete', 'username');
    cy.get('input[type="password"]')
      .should('have.attr', 'autocomplete', 'current-password');
  });
});
```

- [ ] **Step 2: Chạy targeted Vitest suite**

```bash
npm run test:run -- \
  tests/mathJaxConfig.test.ts \
  tests/InteractiveMathText.test.tsx \
  tests/quizLoadPolicy.test.ts \
  tests/quizStoreLoadQuizzes.test.ts \
  tests/TeacherDashboardShell.test.tsx \
  tests/passwordAutocomplete.test.tsx
```

- [ ] **Step 3: Chạy Cypress suite**

```bash
npx cypress run --component --spec \
  cypress/component/console-hygiene.cy.tsx,cypress/component/math-rendering.cy.tsx,cypress/component/student-dropdown-menu.cy.tsx \
  --browser electron
```

Expected:
- Không có version warning.
- Công thức vẫn render.
- Dropdown LaTeX vẫn hoạt động.
- Autocomplete attributes đúng.

- [ ] **Step 4: Build, security và diff gates**

```bash
npm run build
npm run security:scan
git diff --check origin/main...HEAD
```

Nếu build chỉ thay sitemap:

```bash
git restore -- public/sitemap.xml
```

- [ ] **Step 5: Review và impact analysis**

```bash
git diff --stat origin/main...HEAD
git status --short
```

Run Local Coding review và GitNexus `detect_changes` trên `origin/main...HEAD`.

Review bắt buộc:
- Không có P1/P2.
- Tất cả `loadQuizzes` caller đã được phân loại default/force.
- Không có API/DB file thay đổi.
- `quizzesLoadedAt` không nằm trong `partialize`.
- Không còn direct `console.log` của quizStore.

- [ ] **Step 6: Commit browser regression**

```bash
git add cypress/component/console-hygiene.cy.tsx
git commit -m "test(console): cover browser warning regressions"
```

- [ ] **Step 7: PR, merge và production verification**

Sau khi CI đạt và merge:

1. Mở `thitong.site` trong cửa sổ ẩn danh.
2. Mở DevTools trước khi tải trang.
3. Đăng nhập giáo viên và vào Dashboard.
4. Console expected:
   - Không có warning `[tex]/ams`.
   - Không có warning `[tex]/noundefined`.
   - Không có DOM warning autocomplete.
   - Không có `[quizStore] Loaded ... from D1`.
5. Network expected:
   - App và Dashboard bootstrap không tạo hai cặp request song song.
   - Nút refresh trong Quản lý đề vẫn tạo request mới.
6. Xác nhận công thức và dropdown LaTeX vẫn hiển thị/chọn được.

## Final acceptance criteria

- [ ] Production Console sạch ba warning trong ảnh.
- [ ] Production Console không còn quizStore info log.
- [ ] Concurrent quiz loads dùng chung request pair.
- [ ] Fresh catalog được reuse trong 30 giây.
- [ ] Manual refresh, duplicate, publish và live exam vẫn force reload.
- [ ] Math rendering, student dropdown, dashboard và login regressions PASS.
- [ ] Build, security, review, CI và production deploy PASS.

## Risks and mitigations

| Risk | Impact | Mitigation |
|---|---|---|
| Bỏ explicit `ams`/`noundefined` làm hỏng macro | Cao | Unit config + Cypress math rendering + existing regression |
| Freshness che dữ liệu mới | Cao | Chỉ lifecycle dùng default; mutation/manual/live-exam dùng force |
| Active Promise bị kẹt sau lỗi | Trung bình | Reset trong `.finally()` và có retry regression test |
| Timestamp bị persist qua F5 | Trung bình | Không thêm vào `partialize`, có review gate |
| Autocomplete sai ngữ nghĩa | Thấp | Login/current/new được gán riêng theo use case |
| Browser warning test stub sai window | Thấp | Stub `cy.window().console.warn` trước mount và kiểm tra production thủ công |

## Implementation order

1. Task 1 — MathJax config.
2. Task 2 — quiz loading coordinator.
3. Task 3 — autocomplete markup.
4. Task 4 — browser regression và release gates.
