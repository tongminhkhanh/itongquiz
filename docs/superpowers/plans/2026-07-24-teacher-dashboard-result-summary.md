# Kế hoạch triển khai Dashboard Result Summary

> **Thực thi:** dùng skill `executing-plans`, triển khai theo TDD, mỗi task là một commit độc lập.

**Mục tiêu:** sửa toàn bộ thống kê Dashboard giáo viên để không còn bị giới hạn bởi 100 kết quả đầu tiên; tách tổng lượt nộp khỏi kết quả học tập và tính kết quả theo lần nộp cuối cùng.

**Kiến trúc:** thêm `GET /api/results/summary`, tính tổng hợp có phân quyền trong D1, dùng shared contract và state summary riêng ở bootstrap Dashboard. Endpoint danh sách hiện tại giữ nguyên.

**Stack:** TypeScript, React 19, Zustand, Cloudflare Workers/D1, Vitest, Testing Library.

---

## Task 1: Khóa hợp đồng API và route frontend

**Files:**
- Create: `shared/result-summary.contract.ts`
- Modify: `src/services/api/routes/results.ts`
- Modify: `src/services/api/__tests__/routeResolver.test.ts`

### Bước 1: Viết test route thất bại

Thêm vào `routeResolver.test.ts`:

```ts
it('resolves result dashboard summary as a protected GET', () => {
  const route = resolveApiRoute('get_results_summary');
  expect(route).toMatchObject({ method: 'GET', auth: 'session' });
  expect(route.path({})).toBe('/api/results/summary');
});
```

Chạy:

```bash
npm run test:run -- src/services/api/__tests__/routeResolver.test.ts
```

Kỳ vọng: FAIL với `Unknown API action: get_results_summary`.

### Bước 2: Tạo shared contract

```ts
export type ResultScoreRange = '0-2' | '3-4' | '5-6' | '7-8' | '9-10';

export interface ResultScoreBucket {
  range: ResultScoreRange;
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

### Bước 3: Đăng ký route

Trong `src/services/api/routes/results.ts`:

```ts
get_results_summary: {
  method: 'GET',
  auth: 'session',
  path: () => '/api/results/summary',
},
```

### Bước 4: Chạy test GREEN

```bash
npm run test:run -- src/services/api/__tests__/routeResolver.test.ts
```

### Bước 5: Review và commit

```bash
git diff --check
git add shared/result-summary.contract.ts src/services/api/routes/results.ts src/services/api/__tests__/routeResolver.test.ts
git diff --staged
git commit -m "feat: define teacher result summary contract"
```

---

## Task 2: Xây dựng bộ tính summary thuần và truy vấn D1 có phân quyền

**Files:**
- Create: `workers/src/services/resultSummaryService.ts`
- Create: `tests/resultSummaryService.worker.test.ts`

### Bước 1: Viết test RED cho thống kê thuần

Test các score `[2.5, 4.5, 6.5, 8.5, 10]` và kỳ vọng:

```ts
expect(summary.scoreDistribution.map(item => item.count)).toEqual([1, 1, 1, 1, 1]);
expect(summary.passCount).toBe(3);
expect(summary.failCount).toBe(2);
expect(summary.passRate).toBe(60);
expect(summary.mean).toBe(6.4);
expect(summary.median).toBe(6.5);
```

Test tập rỗng luôn có năm bucket bằng 0.

### Bước 2: Viết test RED cho ngày Việt Nam

Với `now = 2026-07-24T16:30:00.000Z` (23:30 ICT), helper phải trả:

```ts
{
  start: '2026-07-23T17:00:00.000Z',
  end: '2026-07-24T17:00:00.000Z',
}
```

### Bước 3: Viết test RED cho repository

Fake D1 kiểm tra:

- Admin không bind username.
- Teacher bind `teacher-a` cho cả activity query và latest-score query.
- SQL chứa `ROW_NUMBER() OVER`, `PARTITION BY student_key, work_key`, và class ownership subquery.
- Kết quả hoạt động và scores được ghép thành contract hoàn chỉnh.

### Bước 4: Chạy test và xác nhận RED

```bash
npm run test:run -- tests/resultSummaryService.worker.test.ts
```

### Bước 5: Implement service tối thiểu

Export:

```ts
export function calculateResultSummaryStatistics(scores: number[]): ResultSummaryStatistics;
export function getIctDayBounds(now?: Date): { start: string; end: string };
export async function loadResultDashboardSummary(
  db: D1Database,
  scope: { role: 'admin' } | { role: 'teacher'; username: string },
  now?: Date,
): Promise<ResultDashboardSummary>;
```

Service dùng hai truy vấn nhỏ:

1. Activity aggregates trên scoped CTE.
2. Danh sách score của lần cuối trên ranked CTE.

Dùng `withD1Retry` cho cả hai truy vấn. Giá trị numeric được chuẩn hóa bằng `Number(...)`, không tin kiểu runtime từ D1.

### Bước 6: Chạy test GREEN và Worker typecheck

```bash
npm run test:run -- tests/resultSummaryService.worker.test.ts
npx tsc -p workers/tsconfig.json --noEmit
```

### Bước 7: Review và commit

```bash
git diff --check
git add workers/src/services/resultSummaryService.ts tests/resultSummaryService.worker.test.ts
git diff --staged
git commit -m "feat: calculate permission-scoped result summaries"
```

---

## Task 3: Thêm endpoint `GET /api/results/summary`

**Files:**
- Modify: `workers/src/routes/results.ts`
- Create: `tests/resultSummaryRoute.worker.test.ts`

### Bước 1: Viết route tests RED

Các test:

```ts
it('returns a summary for an admin');
it('scopes a teacher summary by username');
it('rejects a student before querying D1');
```

Mock `loadResultDashboardSummary` để route test chỉ kiểm tra authorization, scope mapping và response shape.

### Bước 2: Chạy test RED

```bash
npm run test:run -- tests/resultSummaryRoute.worker.test.ts
```

Kỳ vọng route hiện trả 404 hoặc rơi vào handler không phù hợp.

### Bước 3: Implement route trước generic result-id routes

Trong `handleResultRoutes`, ngay sau xác thực:

```ts
if (path === '/api/results/summary' && method === 'GET') {
  if (!requireTeacher(user)) {
    return errorResponse('Forbidden: Teacher access required', 403);
  }

  const scope = requireAdmin(user)
    ? { role: 'admin' as const }
    : { role: 'teacher' as const, username: user.username };

  const summary = await loadResultDashboardSummary(db, scope);
  return jsonResponse({ data: summary });
}
```

Không thay đổi response hoặc phân trang của `GET /api/results`.

### Bước 4: Chạy route + regression tests

```bash
npm run test:run -- tests/resultSummaryRoute.worker.test.ts tests/resultsRoutes.worker.test.ts tests/workerRouter.worker.test.ts
npx tsc -p workers/tsconfig.json --noEmit
```

### Bước 5: Review và commit

```bash
git diff --check
git add workers/src/routes/results.ts tests/resultSummaryRoute.worker.test.ts
git diff --staged
git commit -m "feat: expose teacher dashboard result summary"
```

---

## Task 4: Tạo frontend service và summary bootstrap state

**Files:**
- Create: `src/services/resultSummaryService.ts`
- Modify: `src/components/TeacherDashboard/teacher-dashboard-shell/useTeacherDashboardBootstrap.ts`
- Modify: `src/components/TeacherDashboard/teacher-dashboard-shell/types.ts`
- Modify: `src/components/TeacherDashboard/teacher-dashboard-shell/TeacherDashboard.tsx`
- Modify: `src/components/TeacherDashboard/teacher-dashboard-shell/TeacherDashboardLayout.tsx`
- Modify: `src/components/TeacherDashboard/teacher-dashboard-shell/TeacherDashboardTabContent.tsx`
- Modify: `src/components/TeacherDashboard/teacher-dashboard-shell/TeacherDashboardCoreTabs.tsx`
- Modify: `tests/TeacherDashboardShell.test.tsx`

### Bước 1: Viết test RED cho service

Mock `callApi` và xác nhận:

```ts
expect(callApi).toHaveBeenCalledWith('get_results_summary');
expect(await fetchResultDashboardSummary()).toEqual(payload.data);
```

Payload thiếu `data` phải throw lỗi contract rõ ràng.

### Bước 2: Viết bootstrap test RED

Trong `TeacherDashboardShell.test.tsx`, mock `callApi` theo action:

```ts
mocks.callApi.mockImplementation(async (action: string) => {
  if (action === 'get_results_summary') return { data: summaryFixture };
  return { data: { mustChangePassword: false } };
});
```

Xác nhận bootstrap gọi summary đúng một lần. Thêm test summary lỗi không biến `loadResults` thành lỗi giả và có nút retry.

### Bước 3: Implement service và state

`useTeacherDashboardBootstrap` tải list và summary song song, giữ state riêng:

```ts
const [resultSummary, setResultSummary] = useState<ResultDashboardSummary | null>(null);
const [summaryLoadState, setSummaryLoadState] = useState<ResultsLoadState>('loading');
const [summaryLoadError, setSummaryLoadError] = useState<string | null>(null);
```

`loadTeacherResults` phải reload cả hai nguồn. Nếu summary refresh lỗi, không xóa summary cũ.

### Bước 4: Truyền props qua shell

Thêm các props summary vào `TeacherDashboardLayoutProps`, `TeacherDashboardTabContentProps`, `TeacherDashboardCoreTabsProps`, rồi truyền tới `OverviewTab`.

### Bước 5: Chạy targeted tests

```bash
npm run test:run -- tests/resultSummaryService.test.ts tests/TeacherDashboardShell.test.tsx
```

### Bước 6: Review và commit

```bash
git diff --check
git add src/services/resultSummaryService.ts \
  src/components/TeacherDashboard/teacher-dashboard-shell \
  tests/resultSummaryService.test.ts tests/TeacherDashboardShell.test.tsx
git diff --staged
git commit -m "feat: load dashboard result summary independently"
```

---

## Task 5: Chuyển Dashboard sang summary, không fallback về trang 100

**Files:**
- Modify: `src/components/TeacherDashboard/OverviewTab.tsx`
- Modify: `src/components/TeacherDashboard/overview/PerformancePanel.tsx`
- Modify: `tests/TeacherOverview.test.tsx`

### Bước 1: Tạo fixture summary trong test

```ts
const summary = {
  totalSubmissions: 285,
  uniqueCompletedWorks: 188,
  todaySubmissions: 0,
  uniqueStudents: 18,
  attemptPolicy: 'latest',
  timezone: 'Asia/Ho_Chi_Minh',
  statistics: {
    totalResults: 188,
    mean: 5.76,
    median: 6,
    stdDev: 2.1,
    min: 0,
    max: 10,
    passRate: 67,
    passCount: 125,
    failCount: 63,
    scoreDistribution: [
      { range: '0-2', count: 20, percentage: 10.64 },
      { range: '3-4', count: 43, percentage: 22.87 },
      { range: '5-6', count: 50, percentage: 26.6 },
      { range: '7-8', count: 45, percentage: 23.94 },
      { range: '9-10', count: 30, percentage: 15.96 },
    ],
  },
} as const;
```

### Bước 2: Viết test RED chống regression 100

Local store chỉ chứa 2 hoặc 100 kết quả nhưng UI phải hiển thị:

```ts
expect(within(resultCard).getByText('285')).toBeTruthy();
expect(resultCard).toHaveTextContent('188 bài hoàn thành · 0 lượt hôm nay');
expect(within(studentCard).getByText('18')).toBeTruthy();
expect(screen.getByText('5.8')).toBeTruthy();
expect(screen.getByText('67%')).toBeTruthy();
```

Nhãn cũ `Số bài đã nộp` không còn xuất hiện.

### Bước 3: Implement UI

- Dùng `resultSummary.statistics` cho performance.
- Dùng summary cho metric/hero.
- Local `filteredResults` chỉ dùng cho recent submissions.
- Card label `Tổng lượt nộp`.
- Performance copy nói rõ “bài hoàn thành” và “lần nộp cuối cùng”.
- Khi summary loading, dùng skeleton.
- Khi summary error và không có dữ liệu cũ, không tính từ local array.

### Bước 4: Chạy test GREEN

```bash
npm run test:run -- tests/TeacherOverview.test.tsx tests/TeacherDashboardShell.test.tsx
```

### Bước 5: Review và commit

```bash
git diff --check
git add src/components/TeacherDashboard/OverviewTab.tsx \
  src/components/TeacherDashboard/overview/PerformancePanel.tsx \
  tests/TeacherOverview.test.tsx
git diff --staged
git commit -m "fix: show complete teacher dashboard result metrics"
```

---

## Task 6: Verification, production parity và PR

**Files:** không thêm behavior mới; chỉ sửa test/doc nếu verification phát hiện lỗi thuộc phạm vi.

### Bước 1: Targeted verification

```bash
npm run test:run -- \
  tests/resultSummaryService.worker.test.ts \
  tests/resultSummaryRoute.worker.test.ts \
  tests/resultSummaryService.test.ts \
  tests/TeacherOverview.test.tsx \
  tests/TeacherDashboardShell.test.tsx \
  src/services/api/__tests__/routeResolver.test.ts
```

### Bước 2: Typecheck và build

```bash
npx tsc -p workers/tsconfig.json --noEmit
npx tsc --noEmit
npm run build
```

Root typecheck có hai lỗi baseline đã ghi nhận tại `AnnouncementSettings.tsx:210,212`; xác nhận không phát sinh lỗi mới từ diff.

### Bước 3: Full quality/security

```bash
npm run test:run
npm run security:check
npx wrangler deploy --dry-run --config workers/wrangler.toml
```

Hoàn nguyên `public/sitemap.xml` nếu build chỉ thay đổi file generated.

### Bước 4: Đối chiếu D1 production chỉ đọc

Chạy query tương đương policy latest để so sánh:

```bash
npx wrangler d1 execute itongquiz-db --remote --config workers/wrangler.toml --command "WITH keyed AS (SELECT *, COALESCE(NULLIF(TRIM(student_id),''), LOWER(TRIM(student_name)) || '|' || LOWER(TRIM(class_name))) AS student_key, COALESCE(NULLIF(TRIM(assignment_id),''), 'quiz:' || quiz_id) AS work_key FROM results), ranked AS (SELECT *, ROW_NUMBER() OVER (PARTITION BY student_key, work_key ORDER BY submitted_at DESC, id DESC) AS rn FROM keyed), latest AS (SELECT * FROM ranked WHERE rn = 1) SELECT (SELECT COUNT(*) FROM results) AS total_submissions, COUNT(*) AS unique_completed_works, COUNT(DISTINCT student_key) AS unique_students, ROUND(AVG(score),2) AS mean, SUM(CASE WHEN score >= 5 THEN 1 ELSE 0 END) AS pass_count, ROUND(100.0 * SUM(CASE WHEN score >= 5 THEN 1 ELSE 0 END) / COUNT(*),1) AS pass_rate FROM latest;"
```

Không ghi hoặc migrate production.

### Bước 5: Review thay đổi

```bash
git status --short
git diff --check
git log --oneline origin/main..HEAD
```

Chạy:

- `local_coding.review_diff`
- `gitNexus.detect_changes` với worktree hiện tại
- secret/security scan trên changed files.

### Bước 6: Push và mở PR

```bash
git push -u origin fix/teacher-dashboard-summary-20260724
gh pr create \
  --base main \
  --head fix/teacher-dashboard-summary-20260724 \
  --title "fix: correct teacher dashboard result statistics" \
  --body "## Summary
- add a permission-scoped result summary endpoint
- calculate learning metrics from each student's latest attempt
- show complete submission, completion, and student counts on the teacher dashboard

## Verification
- targeted and full Vitest suites
- Worker typecheck and production build
- security checks and Wrangler dry-run

No production deployment is included."
```

Không merge hoặc deploy production trong task này.

## Definition of Done

- Endpoint summary có phân quyền và contract chung.
- Summary tách activity count và latest-attempt performance.
- UI hiển thị 285/188/0 theo payload thay vì 100 local rows.
- Decimal score buckets đúng.
- Targeted tests, full tests, Worker typecheck, build, security và Wrangler dry-run có bằng chứng mới.
- Mọi lỗi baseline ngoài phạm vi được nêu rõ.
- Branch được push và PR được tạo, chưa merge/deploy.
