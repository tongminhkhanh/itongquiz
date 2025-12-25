# Đề Xuất Cải Tiến Cấu Trúc Dự Án - Phương Pháp SOLID & Clean Architecture

## 1. TÓM TẮT TÌNH HÌNH HIỆN TẠI

### 1.1 Phân Tích File Chính

| File | Kích Thước | Vấn Đề Chính |
|------|-----------|-----------|
| TeacherDashboard.tsx | 99 KB | **Quá lớn**: 20+ useState, 9 trách nhiệm khác nhau |
| geminiService.ts | 21 KB | **Monolith**: 4 providers trong 1 file, khó mở rộng |
| googleSheetService.ts | 10 KB | **Lẫn lộn**: API calls + data transformation |
| App.tsx | 27 KB | **Phức tạp**: State management toàn cục không rõ ràng |

### 1.2 Các Vấn Đề Chính

**TeacherDashboard (99 KB):**
- Không thể viết unit tests (file quá lớn)
- 20+ `useState` hooks = khó follow state flow
- Trộn UI + business logic không tách biệt
- Không thể tái sử dụng các feature con
- Developer mới khó hiểu mã lệnh

**geminiService (21 KB):**
- 4 AI providers (Gemini, Perplexity, OpenAI, LLM-Mux) trong 1 file
- Không tuân theo Single Responsibility Principle
- Thêm provider mới = phải sửa file này
- Kiểm thử từng provider không thể

**App.tsx (27 KB):**
- Quản lý state toàn cục phức tạp
- Không rõ data flow (Quiz → Results → Teacher)
- Khó debug state updates
- Persistence logic lẫn với view logic

---

## 2. KIẾN TRÚC MỚI (SOLID Principles)

### 2.1 Sơ Đồ Phân Tầng (Layered Architecture)

```
┌─────────────────────────────────────────────────────┐
│  Layer 1: PRESENTATION (UI Components)              │
│  /src/components/{common,teacher,student}           │
│  - Chỉ rendering + user interaction                 │
│  - Không có business logic                          │
└─────────────────────────────────────────────────────┘
                        ↓
┌─────────────────────────────────────────────────────┐
│  Layer 2: STATE MANAGEMENT (Context + Hooks)        │
│  /src/context/ + /src/hooks/                        │
│  - useQuizCreator, useResults, useAuth              │
│  - Custom business logic hooks                      │
└─────────────────────────────────────────────────────┘
                        ↓
┌─────────────────────────────────────────────────────┐
│  Layer 3: DOMAIN LOGIC (Services + Repositories)    │
│  /src/domains/{quiz,ai,storage,image}/              │
│  - Business rules & data transformation             │
│  - Factory patterns, Strategy patterns              │
└─────────────────────────────────────────────────────┘
                        ↓
┌─────────────────────────────────────────────────────┐
│  Layer 4: UTILITIES & CORE TYPES                    │
│  /src/utils/ + /src/types/                          │
│  - Formatters, validators, transformers             │
│  - TypeScript interfaces                            │
└─────────────────────────────────────────────────────┘
```

### 2.2 Cấu Trúc Thư Mục Chi Tiết

```
src/
├── components/                          # Layer 1: Presentation
│   ├── common/                         # Reusable UI components
│   │   ├── Button.tsx
│   │   ├── Modal.tsx
│   │   ├── Card.tsx
│   │   ├── Tab.tsx
│   │   ├── Table.tsx
│   │   └── FormField.tsx
│   ├── teacher/                        # Teacher feature
│   │   ├── TeacherDashboard.tsx       # Routing container (6KB)
│   │   ├── QuizCreator/
│   │   │   ├── QuizCreator.tsx        # Main form (8KB)
│   │   │   ├── FormSection.tsx        # Input fields
│   │   │   ├── AdvancedOptions.tsx    # Difficulty + AI settings
│   │   │   ├── PreviewSection.tsx     # Quiz preview
│   │   │   └── ImageLibrary.tsx       # Image upload
│   │   ├── QuizManager/
│   │   │   ├── QuizManager.tsx        # Main component (6KB)
│   │   │   ├── QuizList.tsx
│   │   │   ├── QuizFilters.tsx
│   │   │   └── QuizActions.tsx
│   │   └── ResultsView/
│   │       ├── ResultsView.tsx        # Main component (6KB)
│   │       ├── StatsCards.tsx         # KPI cards
│   │       ├── ResultsTable.tsx       # Results grid
│   │       ├── Charts.tsx             # Analytics
│   │       └── ExportButton.tsx
│   └── student/
│       ├── StudentView.tsx
│       └── QuestionRenderer.tsx
│
├── hooks/                               # Layer 2: Custom State Hooks
│   ├── useQuizCreator.ts              # Quiz form logic (150 lines)
│   ├── useResults.ts                  # Results filtering (100 lines)
│   ├── useAuth.ts                     # Authentication state
│   ├── useImageLibrary.ts             # Image management
│   ├── useGoogleSheetSync.ts          # Data sync logic
│   └── useLocalStorage.ts             # Storage abstraction
│
├── context/                             # Layer 2: React Context
│   ├── QuizContext.tsx                # Quiz creation state
│   ├── ResultsContext.tsx             # Results viewing state
│   └── AuthContext.tsx                # Auth state
│
├── domains/                             # Layer 3: Domain Logic
│   ├── quiz/
│   │   ├── quiz.service.ts            # Create, edit, delete logic
│   │   ├── quiz.transformer.ts        # AI response → Quiz format
│   │   ├── quiz.validator.ts          # Validation rules
│   │   └── quiz.types.ts              # Local types
│   ├── ai/
│   │   ├── ai.factory.ts              # Provider factory pattern
│   │   ├── ai.types.ts                # AIProvider interface
│   │   ├── providers/
│   │   │   ├── gemini.provider.ts     # Gemini logic (6KB)
│   │   │   ├── perplexity.provider.ts # Perplexity logic (5KB)
│   │   │   ├── openai.provider.ts     # OpenAI logic (5KB)
│   │   │   └── llm-mux.provider.ts    # LLM-Mux logic (4KB)
│   │   ├── shared/
│   │   │   ├── prompt-builder.ts      # Build prompts
│   │   │   └── json-repair.ts         # JSON repair logic
│   ├── storage/
│   │   ├── storage.factory.ts         # Repository selection
│   │   ├── repositories/
│   │   │   ├── google-sheets.repo.ts  # CRUD on Sheets
│   │   │   ├── local-storage.repo.ts  # Fallback
│   │   │   └── storage.types.ts       # Repository interface
│   │   └── mappers/
│   │       ├── quiz.mapper.ts         # CSV → Quiz
│   │       └── result.mapper.ts       # CSV → Result
│   └── image/
│       ├── image.service.ts           # Upload, resize, delete
│       ├── image.validator.ts         # File validation
│       └── cloudinary.provider.ts     # Cloudinary API
│
├── utils/                               # Layer 4: Utilities
│   ├── formatters.ts                  # Format text, date, score
│   ├── validators.ts                  # Form validation rules
│   ├── transformers.ts                # Data transformation
│   ├── constants.ts                   # Magic numbers, patterns
│   └── error-handler.ts               # Error handling
│
├── types/                               # Layer 4: Core Types
│   ├── domain.types.ts                # Quiz, Question, Result
│   ├── ui.types.ts                    # Component props
│   └── api.types.ts                   # API request/response
│
├── App.tsx                            # Root component
└── main.tsx
```

---

## 3. NGUYÊN TẮC SOLID CHI TIẾT

### 3.1 S - Single Responsibility Principle

**Vấn Đề Hiện Tại:**
```typescript
// TeacherDashboard.tsx - 99 KB
// Làm 9 việc khác nhau:
const TeacherDashboard = () => {
  // 1. Quiz generation
  // 2. Quiz CRUD
  // 3. Results filtering
  // 4. Image library
  // 5. Access code
  // 6. AI provider selection
  // 7. Form validation
  // 8. Data export
  // 9. UI rendering
};
```

**Giải Pháp:**
```typescript
// src/components/teacher/QuizCreator/QuizCreator.tsx (8 KB)
// CHỈ làm: Tạo quiz
const QuizCreator = () => {
  const { formData, setFormData, handleGenerate } = useQuizCreator();
  return <QuizCreatorForm />;
};

// src/components/teacher/QuizManager/QuizManager.tsx (6 KB)
// CHỈ làm: Quản lý quiz
const QuizManager = () => {
  const { quizzes, filters, setFilters } = useQuizManager();
  return <QuizList />;
};

// src/components/teacher/ResultsView/ResultsView.tsx (6 KB)
// CHỈ làm: Xem kết quả
const ResultsView = () => {
  const { results, filters, setFilters } = useResults();
  return <ResultsTable />;
};
```

**Lợi Ích:**
- ✅ Mỗi file < 15KB
- ✅ Dễ test từng phần
- ✅ Dễ maintain/debug
- ✅ Dễ reuse

---

### 3.2 O - Open/Closed Principle

**Vấn Đề Hiện Tại:**
```typescript
// geminiService.ts - Mỗi lần thêm provider, phải sửa file này
export const generateQuiz = async (
  topic: string,
  provider: AIProvider,
  ...
) => {
  if (provider === 'gemini') {
    return generateWithGemini(...);
  } else if (provider === 'openai') {
    return generateWithOpenAI(...);
  } else if (provider === 'perplexity') {
    return generateWithPerplexity(...);
  }
  // Thêm provider Claude? Phải sửa file này!
};
```

**Giải Pháp - Factory Pattern:**
```typescript
// src/domains/ai/ai.types.ts
export interface AIProvider {
  generate(
    topic: string,
    classLevel: string,
    options: QuizGenerationOptions
  ): Promise<Quiz>;
}

// src/domains/ai/providers/gemini.provider.ts
export class GeminiProvider implements AIProvider {
  async generate(...): Promise<Quiz> {
    // Gemini logic
  }
}

// src/domains/ai/providers/claude.provider.ts (NEW PROVIDER)
export class ClaudeProvider implements AIProvider {
  async generate(...): Promise<Quiz> {
    // Claude logic
  }
}

// src/domains/ai/ai.factory.ts
export const createAIProvider = (type: string): AIProvider => {
  switch (type) {
    case 'gemini':
      return new GeminiProvider();
    case 'openai':
      return new OpenAIProvider();
    case 'claude':
      return new ClaudeProvider(); // Just add 1 line!
    default:
      throw new Error(`Unknown provider: ${type}`);
  }
};
```

**Lợi Ích:**
- ✅ Thêm provider = tạo file mới, không sửa cũ
- ✅ Tuân theo Open/Closed Principle
- ✅ Code "Open for extension, Closed for modification"

---

### 3.3 L - Liskov Substitution Principle

**Bảo Đảm:**
```typescript
// Tất cả providers phải thay thế được cho nhau
// Không break code khi switch từ Gemini sang OpenAI

const provider: AIProvider = aiFactory.create('gemini');
const quiz1 = await provider.generate(...); // ✅ Works

const provider: AIProvider = aiFactory.create('openai');
const quiz2 = await provider.generate(...); // ✅ Works (interface giống)
```

---

### 3.4 I - Interface Segregation Principle

**Vấn Đề Hiện Tại:**
```typescript
// geminiService.ts - 1 file phải hiểu về:
// - 4 AI providers
// - Prompt building
// - JSON repair
// - Math formatting
// Quá nhiều responsibility trong 1 "interface"
```

**Giải Pháp:**
```typescript
// src/domains/ai/shared/prompt-builder.ts
export interface PromptBuilder {
  buildPrompt(topic: string, classLevel: string, ...): string;
}

// src/domains/ai/shared/json-repair.ts
export interface JSONRepair {
  repair(text: string): any;
}

// src/domains/ai/providers/gemini.provider.ts
export class GeminiProvider implements AIProvider {
  constructor(
    private promptBuilder: PromptBuilder,
    private jsonRepair: JSONRepair
  ) {}
}
```

---

### 3.5 D - Dependency Inversion Principle

**Vấn Đề Hiện Tại:**
```typescript
// App.tsx imports directly from services
import { generateQuiz } from './geminiService';

// Tightly coupled - khó mock, khó test
```

**Giải Pháp:**
```typescript
// src/hooks/useQuizCreator.ts - Uses factory pattern
export const useQuizCreator = () => {
  const aiProvider = useAIProvider(); // From context
  
  const handleGenerate = async () => {
    const quiz = await aiProvider.generate(...);
  };
};

// src/context/AIContext.tsx
export const AIProvider: React.FC = ({ children }) => {
  const [provider, setProvider] = useState<AIProvider>(
    aiFactory.create('gemini')
  );
  
  return (
    <AIContext.Provider value={{ provider, setProvider }}>
      {children}
    </AIContext.Provider>
  );
};
```

---

## 4. STATE MANAGEMENT STRATEGY

### 4.1 Context Hierarchy

```
┌─ AuthContext (username, isAdmin)
│
├─ QuizContext (creation form state)
│  ├─ topic, classLevel, content
│  ├─ selectedTypes, difficulty levels
│  └─ generatedQuiz, isGenerating
│
├─ ResultsContext (viewing & filtering)
│  ├─ results[], filters, sortField
│  └─ pagination
│
└─ AppContext (global app state)
   ├─ quizzes[]
   ├─ view (home/student/teacher)
   └─ isLoading
```

### 4.2 Custom Hooks Pattern

```typescript
// src/hooks/useQuizCreator.ts (~150 lines)
export const useQuizCreator = () => {
  const [topic, setTopic] = useState('');
  const [classLevel, setClassLevel] = useState('3');
  const [content, setContent] = useState('');
  const [selectedTypes, setSelectedTypes] = useState({...});
  const [difficulty, setDifficulty] = useState({...});
  
  const handleGenerate = async () => {
    const aiProvider = useAIProvider();
    const quiz = await aiProvider.generate(...);
    return quiz;
  };
  
  return {
    // Form state
    topic, setTopic,
    classLevel, setClassLevel,
    content, setContent,
    selectedTypes, setSelectedTypes,
    difficulty, setDifficulty,
    
    // Actions
    handleGenerate,
    resetForm: () => { /* ... */ },
  };
};

// Usage in component
const QuizCreatorForm = () => {
  const form = useQuizCreator();
  return (
    <input
      value={form.topic}
      onChange={(e) => form.setTopic(e.target.value)}
    />
  );
};
```

---

## 5. REFACTORING TIMELINE

### Phase 1: Utilities & Types (Week 1)
```
- Extract formatters.ts
- Extract validators.ts
- Create domain.types.ts
```

### Phase 2: Services → Domains (Week 2-3)
```
- Create ai/providers/* (factory pattern)
- Create storage/repositories/*
- Create quiz/quiz.service.ts
```

### Phase 3: Hooks (Week 3)
```
- useQuizCreator.ts
- useResults.ts
- useImageLibrary.ts
```

### Phase 4: Component Split (Week 4-5)
```
- Split TeacherDashboard into:
  - QuizCreator/
  - QuizManager/
  - ResultsView/
```

### Phase 5: Testing & Cleanup (Week 6)
```
- Write unit tests for hooks/services
- Remove old monolithic files
- Documentation
```

---

## 6. METRICS & SUCCESS CRITERIA

### Before (Current State)

| Metric | Value |
|--------|-------|
| Max file size | 99 KB (TeacherDashboard) |
| Avg component size | 35 KB |
| useState hooks per component | 20+ |
| Code duplication | High (AI logic repeated) |
| Test coverage | ~0% (files too large) |
| Time to add new feature | 2-3 days |
| Onboarding time | 1 week |

### After (Target State)

| Metric | Target |
|--------|--------|
| Max file size | <15 KB |
| Avg component size | 8 KB |
| useState hooks per component | <10 |
| Code duplication | <5% |
| Test coverage | >80% |
| Time to add new feature | 1 day |
| Onboarding time | 2 days |

---

## 7. EXAMPLE: Refactor geminiService → AI Domains

### Before (21 KB - Mixed Logic)
```typescript
// geminiService.ts
export const generateQuiz = async (..., provider) => {
  if (provider === 'gemini') {
    // 200 lines of Gemini logic
    const prompt = buildPrompt(...);
    const response = await fetch(...);
    const json = parseAndRepairJSON(response);
    return normalizeQuestions(json);
  } else if (provider === 'openai') {
    // 200 lines of OpenAI logic (different!)
  }
  // ... more providers
};
```

### After (Split into 4 files)
```typescript
// src/domains/ai/providers/gemini.provider.ts (6 KB)
export class GeminiProvider implements AIProvider {
  constructor(
    private apiKey: string,
    private promptBuilder: PromptBuilder,
    private jsonRepair: JSONRepair,
    private questionNormalizer: QuestionNormalizer
  ) {}
  
  async generate(topic, classLevel, options): Promise<Quiz> {
    const prompt = this.promptBuilder.build(topic, classLevel, options);
    const response = await this.callGeminiAPI(prompt);
    const json = this.jsonRepair.repair(response.text);
    return this.questionNormalizer.normalize(json);
  }
  
  private async callGeminiAPI(prompt: string) {
    // Only Gemini-specific logic
  }
}

// src/domains/ai/providers/openai.provider.ts (5 KB)
export class OpenAIProvider implements AIProvider {
  // Different from Gemini, but same interface
}

// src/domains/ai/shared/prompt-builder.ts (3 KB)
export class PromptBuilder {
  build(topic, classLevel, options): string {
    // Shared prompt logic
  }
}

// src/domains/ai/shared/json-repair.ts (2 KB)
export class JSONRepair {
  repair(text: string): any {
    // Shared JSON repair
  }
}
```

---

## 8. KEY IMPLEMENTATION PATTERNS

### Pattern 1: Dependency Injection
```typescript
const quizService = new QuizService(
  aiProvider,
  storageRepository,
  imageService
);
```

### Pattern 2: Factory Pattern
```typescript
const provider = aiFactory.create('gemini');
```

### Pattern 3: Strategy Pattern
```typescript
const storage = storageFactory.create('google-sheets');
```

### Pattern 4: Decorator Pattern
```typescript
const cachedService = new CachedQuizService(quizService);
```

---

## 9. MIGRATION GUIDE

### Step 1: Create new folder structure (parallel)
```bash
mkdir -p src/domains/{quiz,ai,storage,image}
mkdir -p src/hooks
mkdir -p src/context
mkdir -p src/utils
```

### Step 2: Gradually move code
```bash
# Extract utilities first (no dependencies)
mv src/formatText.ts src/utils/formatters.ts

# Create hooks (depend on services)
touch src/hooks/useQuizCreator.ts

# Create services (pure logic)
touch src/domains/quiz/quiz.service.ts
```

### Step 3: Update imports in components
```typescript
// OLD
import { generateQuiz } from './geminiService';

// NEW
import { useQuizCreator } from '@/hooks/useQuizCreator';
```

### Step 4: Remove old monolithic files
```bash
rm src/TeacherDashboard.tsx  # Replaced by folder
rm src/geminiService.ts      # Replaced by domains/ai
```

---

## 10. CONCLUSION

Cải tiến này sẽ:

✅ **Giảm Complexity**: 99KB → 4×15KB files  
✅ **Tăng Testability**: 0% → 80% coverage  
✅ **Cải Thiện Maintainability**: SOLID principles  
✅ **Giảm Time-to-Feature**: 2-3 days → 1 day  
✅ **Dễ Onboarding**: Rõ ràng structure, single-responsibility  

Đây là cấu trúc khoa học dựa trên **Clean Architecture** & **SOLID Principles** - chuẩn công nghiệp cho React applications.
