# ITONG QUIZ - KẾ HOẠCH CẢI THIỆN CÓ TRỌNG TẦM

## EXECUTIVE SUMMARY
Dự án ITONG Quiz là một ứng dụng quản lý bài kiểm tra trực tuyến đầy đủ với AI integration (Gemini). Tuy nhiên, cấu trúc code cần được tối ưu hóa để đạt được khả năng mở rộng, hiệu suất tốt hơn, và dễ bảo trì.

---

## PHẦN 1: PHÂN TÍCH HIỆN TRẠNG

### 1.1 Cấu trúc Hiện Tại

#### Stack Công Nghệ:
- **Frontend Framework:** React 18 + TypeScript + Vite
- **Styling:** Tailwind CSS + Custom CSS (22.9 KB)
- **State Management:** React Hooks (useState, useEffect)
- **Data Layer:** Google Sheets (CSV export) + LocalStorage
- **AI Integration:** Gemini API, Perplexity API, OpenAI API
- **Backend:** Google Apps Script (Serverless)

#### Thành Phần Chính:
| File | Kích thước | Loại | Trạng thái |
|------|----------|------|----------|
| StudentView.tsx | 56.7 KB | Component | ⚠️ Quá lớn |
| TeacherDashboard.tsx | 49.2 KB | Component | ⚠️ Quá lớn |
| App.tsx | 29.2 KB | Root | ⚠️ Lớn |
| geminiService.ts | 23.5 KB | Service | ⚠️ Lớn |
| styles.css | 22.9 KB | Styling | ⚠️ Lớn |
| googleSheetService.ts | 9.9 KB | Service | ✅ OK |
| constants.ts | 5.1 KB | Config | ✅ OK |
| types.ts | 3.0 KB | Types | ✅ OK |

### 1.2 Ưu Điểm Hiện Tại

✅ **Full-Stack Implementation:**
- Đầy đủ từ student interface đến teacher admin
- Quiz creation, execution, và results tracking

✅ **Advanced Features:**
- 6 loại câu hỏi: MCQ, True/False, Matching, Multiple Select, Drag Drop, Short Answer
- AI-powered quiz generation với Gemini
- Multiple AI provider support (Gemini, Perplexity, OpenAI)
- Vietnamese educational standards (Nhận biết, Thông hiểu, Vận dụng)

✅ **Data Integration:**
- Google Sheets cho dữ liệu lưu trữ
- Fallback to LocalStorage
- CSV parsing with Papa Parse

✅ **UI/UX:**
- Responsive design
- Beautiful animations (Tailwind + Custom CSS)
- Accessible components
- Vietnamese localization

### 1.3 Điểm Yếu Chính

#### 1️⃣ **Code Organization**
- ❌ Components quá lớn (56KB, 49KB)
- ❌ Không có component splitting
- ❌ Logic lẫn lộn trong components
- ❌ Không có reusable component library

**Impact:** Khó bảo trì, khó test, performance issues

#### 2️⃣ **State Management**
- ❌ Dùng React Hooks cho global state → prop drilling
- ❌ Không có centralized state store
- ❌ Race condition risks
- ❌ Không error/loading state management

**Impact:** Khó debug, difficult để track state changes

#### 3️⃣ **Data Layer**
- ❌ CSV parsing không robust
- ❌ Không retry logic
- ❌ Không caching strategy
- ❌ Hardcoded Google Sheet IDs

**Impact:** Network failures cause silent failures

#### 4️⃣ **Security**
- ❌ Teacher credentials in plaintext
- ❌ Không password hashing
- ❌ Không rate limiting
- ❌ Không input validation

**Impact:** Unauthorized access risk

#### 5️⃣ **Performance**
- ❌ Không code splitting
- ❌ Không lazy loading
- ❌ Large CSS file (22.9 KB)
- ❌ Không image optimization

**Impact:** Slow initial load, especially on mobile

#### 6️⃣ **Testing & Quality**
- ❌ Không unit tests
- ❌ Không integration tests
- ❌ Không E2E tests
- ❌ Không type safety (Zod/Yup)

**Impact:** Bugs go undetected, regressions likely

---

## PHẦN 2: KHOẢNG THỜI GIAN & MỤC TIÊU

### Giai đoạn 1: QUICK WINS (1-2 tuần)
**Mục tiêu:** Cải thiện code quality & maintainability

### Giai đoạn 2: ARCHITECTURE (2-3 tuần)
**Mục tiêu:** Tái cấu trúc thành modular architecture

### Giai đoạn 3: QUALITY ASSURANCE (2-3 tuần)
**Mục tiêu:** Thêm tests & validation

### Giai đoạn 4: PERFORMANCE (1-2 tuần)
**Mục tiêu:** Optimize bundle size & runtime

### Giai đoạn 5: ADVANCED (3-4 tuần)
**Mục tiêu:** Scale infrastructure & add advanced features

---

## PHẦN 3: CẢI THIỆN CHI TIẾT

### GIAI ĐOẠN 1: QUICK WINS (1-2 tuần)

#### 1.1 Move Constants to Environment Variables
```bash
# Before: App.tsx line ~13
export const GOOGLE_SHEET_ID = '1mrqbJ3Xzj4CBF_B2vyI7-ANLaVPAfWCe_TdmCd9_gx4';

# After: .env.local
VITE_GOOGLE_SHEET_ID=1mrqbJ3Xzj4CBF_B2vyI7-ANLaVPAfWCe_TdmCd9_gx4
VITE_QUIZ_GID=0
VITE_QUESTION_GID=1395660327
VITE_TEACHER_GID=1482913865
VITE_RESULTS_GID=1960978030
VITE_GOOGLE_SCRIPT_URL=https://script.google.com/...

# In code:
const GOOGLE_SHEET_ID = import.meta.env.VITE_GOOGLE_SHEET_ID;
```

**Priority:** CRITICAL  
**Effort:** 1 hour  
**Impact:** HIGH - Easier deployment, environment-specific configs

#### 1.2 Create Custom Hooks for Data Fetching
```typescript
// hooks/useQuizzes.ts
export function useQuizzes() {
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    loadQuizzes();
  }, []);

  const loadQuizzes = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchQuizzesFromSheets(...);
      setQuizzes(data);
    } catch (err) {
      setError(err as Error);
    } finally {
      setLoading(false);
    }
  };

  return { quizzes, loading, error, reload: loadQuizzes };
}

// Same for: useResults, useTeacher, useAuth
```

**Files to create:**
- `hooks/useQuizzes.ts`
- `hooks/useResults.ts`
- `hooks/useTeacher.ts`
- `hooks/useTimer.ts`
- `hooks/useAuth.ts`

**Priority:** HIGH  
**Effort:** 4-5 hours  
**Impact:** Reduces App.tsx size by ~40%

#### 1.3 Add Error Boundaries
```typescript
// components/ErrorBoundary.tsx
export function ErrorBoundary({ children }: { children: React.ReactNode }) {
  const [hasError, setHasError] = React.useState(false);

  return (
    <ErrorBoundaryContext.Provider value={{ hasError, setHasError }}>
      {hasError ? (
        <div className="p-4 bg-red-50 border border-red-200 rounded">
          <h2 className="text-red-800 font-bold">Something went wrong</h2>
          <button onClick={() => setHasError(false)}>Try again</button>
        </div>
      ) : (
        children
      )}
    </ErrorBoundaryContext.Provider>
  );
}

// Usage in App.tsx:
<ErrorBoundary>
  <StudentView />
</ErrorBoundary>
```

**Priority:** MEDIUM  
**Effort:** 2 hours  
**Impact:** Better error handling, better UX

#### 1.4 Consolidate CSS Files
```
styles/
├── tokens.css          // CSS variables (colors, shadows, transitions)
├── animations.css      // @keyframes & animation utilities
├── components.css      // .btn, .card, .badge, .input, etc.
├── layouts.css        // .hero-section, .glass, .gradient, etc.
└── index.css          // @import all
```

**Priority:** MEDIUM  
**Effort:** 2 hours  
**Impact:** Better CSS organization, easier to maintain

#### 1.5 Add Logging & Monitoring
```typescript
// services/logger.ts
export const logger = {
  info: (message: string, data?: any) => {
    console.log(`[INFO] ${message}`, data);
  },
  error: (message: string, error?: Error) => {
    console.error(`[ERROR] ${message}`, error);
  },
  warn: (message: string, data?: any) => {
    console.warn(`[WARN] ${message}`, data);
  }
};

// Usage
logger.info('Quiz loaded', { quizId, questionCount });
logger.error('Failed to save result', error);
```

**Priority:** MEDIUM  
**Effort:** 1 hour  
**Impact:** Better debugging, easier troubleshooting

---

### GIAI ĐOẠN 2: ARCHITECTURE (2-3 tuần)

#### 2.1 Implement State Management with Zustand

**Install:** `npm install zustand`

```typescript
// stores/quizStore.ts
import { create } from 'zustand';

interface QuizStore {
  // State
  quizzes: Quiz[];
  loading: boolean;
  error: Error | null;
  activeQuiz: Quiz | null;

  // Actions
  setQuizzes: (quizzes: Quiz[]) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: Error | null) => void;
  setActiveQuiz: (quiz: Quiz | null) => void;

  // Async thunks
  loadQuizzes: () => Promise<void>;
  saveQuiz: (quiz: Quiz) => Promise<void>;
  deleteQuiz: (quizId: string) => Promise<void>;
}

export const useQuizStore = create<QuizStore>((set) => ({
  quizzes: [],
  loading: false,
  error: null,
  activeQuiz: null,

  setQuizzes: (quizzes) => set({ quizzes }),
  setLoading: (loading) => set({ loading }),
  setError: (error) => set({ error }),
  setActiveQuiz: (quiz) => set({ activeQuiz: quiz }),

  loadQuizzes: async () => {
    set({ loading: true });
    try {
      const data = await fetchQuizzesFromSheets(...);
      set({ quizzes: data, error: null });
    } catch (error) {
      set({ error: error as Error });
    } finally {
      set({ loading: false });
    }
  },

  // ... other actions
}));

// Usage:
function QuizList() {
  const { quizzes, loading } = useQuizStore();
  const loadQuizzes = useQuizStore((state) => state.loadQuizzes);

  useEffect(() => {
    loadQuizzes();
  }, []);

  return loading ? <div>Loading...</div> : <ul>{...}</ul>;
}
```

**Stores to create:**
- `stores/quizStore.ts` - Quiz CRUD operations
- `stores/resultStore.ts` - Student results
- `stores/authStore.ts` - Teacher authentication
- `stores/uiStore.ts` - UI state (modals, tabs, etc.)

**Priority:** CRITICAL  
**Effort:** 6-8 hours  
**Impact:** Eliminates prop drilling, easier state debugging

#### 2.2 Split Large Components

**StudentView.tsx → 5 Sub-components:**

```
components/
├── StudentView.tsx                      (main container)
├── Quiz/
│   ├── QuizContainer.tsx               (timer, progress)
│   ├── QuestionRenderer.tsx            (different question types)
│   ├── AnswerInput.tsx                 (MCQ, short answer inputs)
│   ├── QuestionNavigation.tsx          (previous, next buttons)
│   └── SubmitModal.tsx                 (confirmation dialog)
├── Results/
│   ├── ResultsReview.tsx               (score display)
│   ├── QuestionReview.tsx              (review each question)
│   └── StatisticsCard.tsx              (stats breakdown)
└── AccessCode/
    └── AccessCodeForm.tsx              (code verification)
```

**TeacherDashboard.tsx → 5 Sub-pages:**

```
pages/
├── TeacherDashboard.tsx                (main layout)
├── QuizManager/
│   ├── QuizList.tsx
│   ├── QuizEditor.tsx
│   └── QuizActions.tsx
├── StudentResults/
│   ├── ResultsList.tsx
│   ├── ResultsFilter.tsx
│   └── ResultsExport.tsx
├── AIGenerator/
│   ├── GeneratorForm.tsx
│   ├── GeneratorPreview.tsx
│   └── QuestionLibrary.tsx
└── Settings/
    ├── TeacherList.tsx
    ├── TeacherForm.tsx
    └── SystemSettings.tsx
```

**Priority:** HIGH  
**Effort:** 8-10 hours  
**Impact:** Better code organization, easier testing, reusability

#### 2.3 Create Validation Schemas with Zod

```typescript
// validators/schemas.ts
import { z } from 'zod';

export const quizSchema = z.object({
  id: z.string().uuid(),
  title: z.string().min(5).max(200),
  classLevel: z.enum(['1', '2', '3', '4', '5']),
  timeLimit: z.number().min(5).max(180),
  questions: z.array(questionSchema),
  accessCode: z.string().optional(),
  requireCode: z.boolean().default(false),
  createdAt: z.string().datetime(),
});

export const studentResultSchema = z.object({
  id: z.string().uuid(),
  studentName: z.string().min(2),
  studentClass: z.string(),
  quizId: z.string().uuid(),
  score: z.number().min(0).max(10),
  correctCount: z.number(),
  totalQuestions: z.number(),
  submittedAt: z.string().datetime(),
  answers: z.record(z.string()),
});

// Usage:
const validQuiz = quizSchema.parse(quizData); // throws ZodError if invalid
const result = quizSchema.safeParse(quizData); // returns { success, data|error }
```

**Priority:** HIGH  
**Effort:** 4-5 hours  
**Impact:** Type-safe data validation, better error handling

#### 2.4 Extract Service Layer with Retry Logic

```typescript
// services/api/BaseAPI.ts
export class BaseAPI {
  protected maxRetries = 3;
  protected retryDelay = 1000;

  protected async fetchWithRetry<T>(
    fn: () => Promise<T>,
    context: string
  ): Promise<T> {
    for (let attempt = 0; attempt < this.maxRetries; attempt++) {
      try {
        return await fn();
      } catch (error) {
        if (attempt === this.maxRetries - 1) {
          logger.error(`${context} failed after ${this.maxRetries} attempts`, error as Error);
          throw error;
        }
        const delay = this.retryDelay * Math.pow(2, attempt); // exponential backoff
        logger.warn(`${context} attempt ${attempt + 1} failed, retrying in ${delay}ms`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }
}

// services/api/QuizAPI.ts
export class QuizAPI extends BaseAPI {
  async getQuizzes(): Promise<Quiz[]> {
    return this.fetchWithRetry(
      () => fetchQuizzesFromSheets(...),
      'getQuizzes'
    );
  }

  async saveQuiz(quiz: Quiz): Promise<void> {
    return this.fetchWithRetry(
      () => saveQuizToSheet(quiz, ...),
      `saveQuiz(${quiz.id})`
    );
  }
}

export const quizAPI = new QuizAPI();
```

**Services to create:**
- `services/api/BaseAPI.ts` - Retry logic base
- `services/api/QuizAPI.ts` - Quiz operations
- `services/api/ResultAPI.ts` - Results operations
- `services/api/TeacherAPI.ts` - Teacher operations
- `services/cache/CacheService.ts` - Caching layer

**Priority:** HIGH  
**Effort:** 6-8 hours  
**Impact:** Better reliability, error handling, caching

---

### GIAI ĐOẠN 3: QUALITY ASSURANCE (2-3 tuần)

#### 3.1 Add Unit Tests with Vitest

**Install:** `npm install -D vitest @testing-library/react @testing-library/jest-dom`

```typescript
// __tests__/validators.test.ts
import { describe, it, expect } from 'vitest';
import { quizSchema } from '../validators/schemas';

describe('Quiz Validation', () => {
  it('should validate correct quiz data', () => {
    const validQuiz = {
      id: '123e4567-e89b-12d3-a456-426614174000',
      title: 'Toán lớp 3',
      classLevel: '3',
      timeLimit: 30,
      questions: [],
      createdAt: new Date().toISOString(),
    };

    expect(() => quizSchema.parse(validQuiz)).not.toThrow();
  });

  it('should reject invalid title length', () => {
    const invalidQuiz = { ...validQuiz, title: 'OK' };
    expect(() => quizSchema.parse(invalidQuiz)).toThrow();
  });
});

// __tests__/hooks/useQuizzes.test.ts
import { renderHook, waitFor } from '@testing-library/react';
import { useQuizzes } from '../../hooks/useQuizzes';

describe('useQuizzes Hook', () => {
  it('should load quizzes on mount', async () => {
    const { result } = renderHook(() => useQuizzes());

    expect(result.current.loading).toBe(true);

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.quizzes.length).toBeGreaterThan(0);
  });
});
```

**Test Coverage Goals:**
- Validators: 100% coverage
- Hooks: 80%+ coverage
- Utils: 90%+ coverage
- Components: 60%+ coverage
- Services: 85%+ coverage

**Priority:** HIGH  
**Effort:** 10-12 hours  
**Impact:** Prevents regressions, better code quality

#### 3.2 Add E2E Tests with Cypress

**Install:** `npm install -D cypress`

```typescript
// cypress/e2e/student-quiz.cy.ts
describe('Student Taking Quiz', () => {
  beforeEach(() => {
    cy.visit('/');
    cy.contains('Lớp 3').click();
    cy.contains('Ôn tập Khoa học').click();
    cy.get('[data-cy=start-quiz]').click();
  });

  it('should complete quiz and submit', () => {
    // Answer MCQ
    cy.get('[data-cy=mcq-option-a]').click();

    // Answer True/False
    cy.get('[data-cy=true-false-true]').click();

    // Navigate to next question
    cy.get('[data-cy=next-button]').click();

    // Submit quiz
    cy.get('[data-cy=submit-button]').click();
    cy.contains('Kết quả').should('be.visible');
  });

  it('should prevent submission with unanswered questions', () => {
    cy.get('[data-cy=submit-button]').click();
    cy.contains('Vui lòng trả lời tất cả câu hỏi').should('be.visible');
  });
});

// cypress/e2e/teacher-dashboard.cy.ts
describe('Teacher Dashboard', () => {
  beforeEach(() => {
    cy.visit('/');
    cy.get('[data-cy=teacher-login]').click();
    cy.get('[data-cy=username]').type('admin');
    cy.get('[data-cy=password]').type('admin');
    cy.get('[data-cy=login-button]').click();
  });

  it('should create new quiz', () => {
    cy.get('[data-cy=new-quiz]').click();
    cy.get('[data-cy=quiz-title]').type('Kiểm tra Toán');
    cy.get('[data-cy=quiz-class]').select('3');
    cy.get('[data-cy=save-quiz]').click();
    cy.contains('Lưu thành công').should('be.visible');
  });
});
```

**Priority:** MEDIUM  
**Effort:** 8-10 hours  
**Impact:** Ensures critical workflows work correctly

#### 3.3 Add Input Validation & Sanitization

```typescript
// validators/input.ts
export class InputValidator {
  static validateQuizTitle(title: string): { valid: boolean; error?: string } {
    if (title.length < 5) return { valid: false, error: 'Tiêu đề quá ngắn (tối thiểu 5 ký tự)' };
    if (title.length > 200) return { valid: false, error: 'Tiêu đề quá dài (tối đa 200 ký tự)' };
    if (!/^[a-zA-Z0-9_\-\s:, ]+$/i.test(title)) {
      return { valid: false, error: 'Tiêu đề chứa ký tự không hợp lệ' };
    }
    return { valid: true };
  }

  static sanitizeHTML(html: string): string {
    const div = document.createElement('div');
    div.textContent = html; // This escapes HTML
    return div.innerHTML;
  }

  static validateEmail(email: string): boolean {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  }
}
```

**Priority:** MEDIUM  
**Effort:** 3-4 hours  
**Impact:** Better security, prevents XSS attacks

---

### GIAI ĐOẠN 4: PERFORMANCE (1-2 tuần)

#### 4.1 Implement Code Splitting

```typescript
// vite.config.ts
export default defineConfig({
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          'vendor': ['react', 'react-dom'],
          'gemini-service': ['./src/services/geminiService.ts'],
          'google-sheets': ['./src/services/googleSheetService.ts'],
          'quiz-components': ['./src/components/Quiz'],
          'teacher-components': ['./src/components/Teacher'],
        }
      }
    }
  }
});
```

**Priority:** HIGH  
**Effort:** 3-4 hours  
**Impact:** ~40% reduction in initial load

#### 4.2 Lazy Load Route Components

```typescript
// router.tsx
import { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';

const StudentView = lazy(() => import('./pages/StudentView'));
const TeacherDashboard = lazy(() => import('./pages/TeacherDashboard'));

export function Router() {
  return (
    <BrowserRouter>
      <Suspense fallback={<LoadingSpinner />}>
        <Routes>
          <Route path="/student/:quizId" element={<StudentView />} />
          <Route path="/teacher" element={<TeacherDashboard />} />
        </Routes>
      </Suspense>
    </BrowserRouter>
  );
}
```

**Priority:** HIGH  
**Effort:** 2-3 hours  
**Impact:** ~30% faster route transitions

#### 4.3 Implement Caching Strategy

```typescript
// services/cache/CacheService.ts
export class CacheService {
  private cache = new Map<string, { data: any; expiry: number }>();
  private ttl = 5 * 60 * 1000; // 5 minutes

  get<T>(key: string): T | null {
    const entry = this.cache.get(key);
    if (!entry) return null;
    if (Date.now() > entry.expiry) {
      this.cache.delete(key);
      return null;
    }
    return entry.data as T;
  }

  set<T>(key: string, data: T, ttl = this.ttl): void {
    this.cache.set(key, {
      data,
      expiry: Date.now() + ttl
    });
  }

  clear(pattern?: string): void {
    if (!pattern) {
      this.cache.clear();
      return;
    }
    const regex = new RegExp(pattern);
    for (const key of this.cache.keys()) {
      if (regex.test(key)) this.cache.delete(key);
    }
  }
}

export const cache = new CacheService();

// Usage:
async function getQuizzes() {
  const cached = cache.get('quizzes');
  if (cached) return cached;

  const data = await fetchQuizzesFromSheets(...);
  cache.set('quizzes', data);
  return data;
}
```

**Priority:** MEDIUM  
**Effort:** 3-4 hours  
**Impact:** ~50% faster data retrieval

#### 4.4 Image Optimization

```typescript
// utils/imageUtils.ts
export function getOptimizedImageUrl(url: string, options?: {
  width?: number;
  height?: number;
  quality?: number;
}): string {
  // Use Cloudinary transformations
  if (!url.includes('cloudinary')) return url;

  const params = new URLSearchParams({
    w: String(options?.width || 300),
    h: String(options?.height || 300),
    q: String(options?.quality || 80),
    f: 'auto'
  });

  return `${url}?${params.toString()}`;
}

// Usage:
<img
  src={getOptimizedImageUrl(imageUrl, { width: 300, quality: 80 })}
  alt="Quiz"
/>
```

**Priority:** MEDIUM  
**Effort:** 2-3 hours  
**Impact:** ~60% smaller image files

---

### GIAI ĐOẠN 5: ADVANCED (3-4 tuần)

#### 5.1 Migrate to Backend (Node.js + Database)

**New Stack:**
- Backend: Node.js (Express/Fastify) + PostgreSQL
- Authentication: JWT + bcrypt
- Real-time: Socket.io
- Caching: Redis

```
Frontend (Vite React)
    ↓
API Server (Node.js)
    ├── PostgreSQL (Data)
    ├── Redis (Cache)
    └── Firebase (File Storage)
```

**Database Schema:**
```sql
-- Users
CREATE TABLE users (
  id UUID PRIMARY KEY,
  username VARCHAR(50) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  email VARCHAR(100),
  role ENUM('teacher', 'student', 'admin'),
  created_at TIMESTAMP DEFAULT NOW()
);

-- Quizzes
CREATE TABLE quizzes (
  id UUID PRIMARY KEY,
  title VARCHAR(200) NOT NULL,
  class_level VARCHAR(5),
  time_limit INT,
  teacher_id UUID REFERENCES users(id),
  access_code VARCHAR(10),
  require_code BOOLEAN,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Questions
CREATE TABLE questions (
  id UUID PRIMARY KEY,
  quiz_id UUID REFERENCES quizzes(id) ON DELETE CASCADE,
  type ENUM('MCQ', 'TRUE_FALSE', 'MATCHING', ...),
  question_text TEXT,
  options JSONB,
  correct_answer JSONB,
  explanation TEXT,
  image_url VARCHAR(500),
  created_at TIMESTAMP DEFAULT NOW()
);

-- Results
CREATE TABLE student_results (
  id UUID PRIMARY KEY,
  student_name VARCHAR(100),
  student_class VARCHAR(10),
  quiz_id UUID REFERENCES quizzes(id),
  score DECIMAL(5, 2),
  correct_count INT,
  total_questions INT,
  time_taken INT,
  submitted_at TIMESTAMP DEFAULT NOW(),
  answers JSONB
);
```

**API Endpoints:**
```
GET  /api/quizzes
POST /api/quizzes
GET  /api/quizzes/:id
PUT  /api/quizzes/:id
DELETE /api/quizzes/:id

GET  /api/results
POST /api/results
GET  /api/results/:quizId

POST /api/auth/login
POST /api/auth/register
POST /api/auth/logout

POST /api/ai/generate-quiz
```

**Priority:** CRITICAL  
**Effort:** 3-4 weeks  
**Impact:** Scalability, security, real-time features

#### 5.2 Add Authentication System

```typescript
// Backend: auth.ts
import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';

export class AuthService {
  async hashPassword(password: string): Promise<string> {
    return bcrypt.hash(password, 10);
  }

  async verifyPassword(password: string, hash: string): Promise<boolean> {
    return bcrypt.compare(password, hash);
  }

  generateToken(userId: string): string {
    return jwt.sign({ userId }, process.env.JWT_SECRET!, {
      expiresIn: '7d'
    });
  }

  verifyToken(token: string): string {
    const decoded = jwt.verify(token, process.env.JWT_SECRET!);
    return (decoded as any).userId;
  }
}

// Frontend: authAPI.ts
export async function login(username: string, password: string) {
  const response = await fetch('/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password })
  });

  const { token } = await response.json();
  localStorage.setItem('auth_token', token);
  return token;
}
```

**Priority:** HIGH  
**Effort:** 5-6 hours  
**Impact:** Better security, user session management

#### 5.3 Implement Real-time Features

```typescript
// Backend: socket.io setup
import io from 'socket.io';

const socketServer = io(httpServer, {
  cors: { origin: process.env.FRONTEND_URL }
});

socketServer.on('connection', (socket) => {
  // Teacher updates quiz
  socket.on('quiz:update', (quizId, quiz) => {
    socketServer.emit(`quiz:${quizId}:updated`, quiz);
  });

  // Student completes quiz
  socket.on('result:submit', (result) => {
    socketServer.emit(`teacher:${result.teacherId}:result`, result);
  });
});

// Frontend: React hook
export function useRealtimeQuiz(quizId: string) {
  const [quiz, setQuiz] = useState<Quiz | null>(null);

  useEffect(() => {
    const socket = io();

    socket.on(`quiz:${quizId}:updated`, (updatedQuiz) => {
      setQuiz(updatedQuiz);
    });

    return () => socket.disconnect();
  }, [quizId]);

  return quiz;
}
```

**Priority:** MEDIUM  
**Effort:** 4-5 hours  
**Impact:** Live quiz updates, real-time results

#### 5.4 Add Analytics Dashboard

```typescript
// Backend: analytics.ts
export async function getQuizAnalytics(quizId: string) {
  return {
    totalAttempts: await db.results.count({ quizId }),
    averageScore: await db.results.avg('score', { quizId }),
    highestScore: await db.results.max('score', { quizId }),
    lowestScore: await db.results.min('score', { quizId }),
    questionStats: await getQuestionStats(quizId),
    timeStats: await getTimeStats(quizId)
  };
}

// Frontend: AnalyticsDashboard.tsx
<LineChart
  data={scoreDistribution}
  title="Score Distribution"
/>

<BarChart
  data={questionDifficulty}
  title="Question Difficulty Analysis"
/>

<StatCard
  label="Average Score"
  value={`${analytics.averageScore}/10`}
/>
```

**Priority:** LOW  
**Effort:** 3-4 hours  
**Impact:** Better insights for teachers

---

## PHẦN 4: IMPLEMENTATION TIMELINE

### Week 1-2: Quick Wins
- [ ] Move to .env variables
- [ ] Create custom hooks
- [ ] Add Error Boundaries
- [ ] Consolidate CSS
- [ ] Add logging

**Estimated effort:** 10 hours

### Week 3-5: Architecture Refactoring
- [ ] Implement Zustand
- [ ] Split large components
- [ ] Add Zod validation
- [ ] Extract service layer

**Estimated effort:** 20 hours

### Week 6-8: Quality Assurance
- [ ] Add unit tests
- [ ] Add E2E tests
- [ ] Input validation
- [ ] Security improvements

**Estimated effort:** 20 hours

### Week 9-10: Performance
- [ ] Code splitting
- [ ] Lazy loading
- [ ] Caching strategy
- [ ] Image optimization

**Estimated effort:** 10 hours

### Week 11-14: Advanced Features
- [ ] Backend migration
- [ ] Authentication
- [ ] Real-time updates
- [ ] Analytics dashboard

**Estimated effort:** 20 hours

**Total estimated effort:** ~80 hours (2-3 months with 1 developer)

---

## PHẦN 5: SUCCESS METRICS

### Code Quality
- [ ] Reduce component sizes (all < 30KB)
- [ ] Test coverage > 80%
- [ ] Zero type errors
- [ ] Reduce code duplication to < 10%

### Performance
- [ ] Initial load < 2s (3G)
- [ ] Lighthouse score > 90
- [ ] Bundle size < 100KB (gzipped)
- [ ] API response < 500ms

### User Experience
- [ ] Quiz completion rate > 95%
- [ ] Error rate < 1%
- [ ] User satisfaction > 4.5/5

### Security
- [ ] Zero critical vulnerabilities
- [ ] No plaintext credentials
- [ ] All APIs authenticated
- [ ] Input validation 100%

---

## PHẦN 6: RESOURCES & TOOLS

### Development Tools
- **Vitest** - Unit testing
- **Cypress** - E2E testing
- **Zod** - Schema validation
- **Zustand** - State management
- **Vite** - Bundler optimization
- **TypeScript** - Type safety

### Monitoring & Analytics
- **Sentry** - Error tracking
- **LogRocket** - Session replay
- **Vercel Analytics** - Performance
- **Google Analytics** - User behavior

### Infrastructure
- **Vercel** - Frontend hosting
- **Heroku/Railway** - Backend hosting
- **PostgreSQL Cloud** - Database
- **Redis Cloud** - Caching
- **Firebase Storage** - File storage

---

## PHẦN 7: RISKS & MITIGATION

| Risk | Impact | Probability | Mitigation |
|------|--------|------------|-----------|
| Breaking existing features | HIGH | MEDIUM | Comprehensive E2E tests |
| Performance regression | HIGH | LOW | Lighthouse CI |
| Data loss during migration | CRITICAL | LOW | Backup strategy |
| User adoption of new UI | MEDIUM | MEDIUM | Gradual rollout |
| API rate limiting | MEDIUM | MEDIUM | Implement caching |

---

## CONCLUSION

Dự án ITONG Quiz có nền tảng tốt nhưng cần được tái cấu trúc để đạt được khả năng mở rộng và hiệu suất tốt hơn. Kế hoạch 5 giai đoạn này sẽ biến dự án thành một ứng dụng production-grade với:

✅ Scalable architecture  
✅ High code quality  
✅ Excellent performance  
✅ Strong security  
✅ Comprehensive testing  

**Khuyến nghị:** Bắt đầu từ **Giai đoạn 1 (Quick Wins)** để có ngay các cải thiện nhanh chóng, sau đó tiến hành từng giai đoạn theo lịch trình.
