# Student Dropdown Menu Overflow Fix Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ngăn menu đáp án `DROPDOWN` chứa LaTeX bị cắt trong thẻ câu hỏi học sinh và bảo đảm menu luôn nằm trong viewport.

**Architecture:** Giữ nút dropdown trong nội dung câu hỏi nhưng portal listbox vào `document.body`. Một hàm định vị đọc bounding rect của trigger/menu, chọn hướng mở lên hoặc xuống và cập nhật khi scroll/resize; click-outside kiểm tra cả trigger lẫn portal menu.

**Tech Stack:** React 19, ReactDOM Portal, TypeScript 5.8, Tailwind CSS 4, Vitest 4, Testing Library, Cypress Component.

## Global Constraints

- Không bỏ `overflow-hidden` khỏi `QuestionRenderer`.
- Không thay đổi schema, payload, đáp án hoặc logic chấm điểm.
- Dropdown không chứa LaTeX tiếp tục dùng `<select>` gốc.
- Không thêm dependency mới.
- Production code phải có test RED trước khi sửa.
- Menu phải giữ các role và trạng thái ARIA hiện có.

---

### Task 1: Lock the clipped-menu regression with Vitest

**Files:**
- Create: `tests/LatexDropdown.test.tsx`
- Test: `src/features/quiz-player/components/QuestionRenderer/atoms/LatexDropdown.tsx`

**Interfaces:**
- Consumes: `LatexDropdownProps` hiện có gồm `options`, `value`, `onChange`, `placeholder`, `className`.
- Produces: regression contract rằng custom listbox nằm ngoài container clipping và option trong portal vẫn chọn được.

- [ ] **Step 1: Write the failing portal regression test**

```tsx
import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import LatexDropdown from '../src/features/quiz-player/components/QuestionRenderer/atoms/LatexDropdown';

vi.mock('../src/features/quiz-player/components/QuestionRenderer/atoms/MathSpan', () => ({
  default: ({ content }: { content: string }) => <span>{content}</span>,
}));

it('portals the LaTeX listbox outside an overflow-hidden question shell', () => {
  const onChange = vi.fn();
  render(
    <section data-testid="question-shell" className="overflow-hidden">
      <LatexDropdown
        options={['$4a^2$', '$6a^2$']}
        value=""
        onChange={onChange}
        placeholder="..."
      />
    </section>,
  );

  fireEvent.click(screen.getByRole('button', { name: /\.\.\./ }));
  const listbox = screen.getByRole('listbox');

  expect(screen.getByTestId('question-shell')).not.toContainElement(listbox);
  expect(listbox.parentElement).toBe(document.body);

  fireEvent.click(screen.getByRole('option', { name: /4a/ }));
  expect(onChange).toHaveBeenCalledWith('$4a^2$');
  expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
});
```

- [ ] **Step 2: Add the native-select compatibility test**

```tsx
it('keeps plain-text options on the native select path', () => {
  render(
    <LatexDropdown
      options={['4a²', '6a²']}
      value=""
      onChange={vi.fn()}
      placeholder="..."
    />,
  );

  expect(screen.getByRole('combobox')).toBeInTheDocument();
  expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
});
```

- [ ] **Step 3: Run the test and verify RED**

Run:

```bash
npm run test:run -- tests/LatexDropdown.test.tsx
```

Expected: portal test FAIL vì listbox hiện vẫn là hậu duệ của question shell.

---

### Task 2: Portal and position the LaTeX menu

**Files:**
- Modify: `src/features/quiz-player/components/QuestionRenderer/atoms/LatexDropdown.tsx`
- Test: `tests/LatexDropdown.test.tsx`

**Interfaces:**
- Consumes: `HTMLElement.getBoundingClientRect()`, `window.innerWidth`, `window.innerHeight`.
- Produces: `DropdownPosition` nội bộ gồm `top`, `left`, `minWidth`, `maxWidth`, `maxHeight`; public props không đổi.

- [ ] **Step 1: Add portal and positioning imports/types**

```tsx
import React, {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from 'react';
import { createPortal } from 'react-dom';

interface DropdownPosition {
  top: number;
  left: number;
  minWidth: number;
  maxWidth: number;
  maxHeight: number;
}

const VIEWPORT_PADDING = 8;
const MENU_GAP = 4;
const MAX_MENU_HEIGHT = 240;
const ESTIMATED_OPTION_HEIGHT = 44;
```

- [ ] **Step 2: Track trigger/menu refs and calculate viewport-safe position**

```tsx
const triggerRef = useRef<HTMLDivElement>(null);
const menuRef = useRef<HTMLDivElement>(null);
const [menuPosition, setMenuPosition] = useState<DropdownPosition | null>(null);

const updateMenuPosition = useCallback(() => {
  const trigger = triggerRef.current;
  if (!trigger) return;

  const rect = trigger.getBoundingClientRect();
  const estimatedHeight = Math.min(
    MAX_MENU_HEIGHT,
    Math.max(ESTIMATED_OPTION_HEIGHT, (options.length + 1) * ESTIMATED_OPTION_HEIGHT),
  );
  const measuredHeight = menuRef.current?.scrollHeight || estimatedHeight;
  const measuredWidth = Math.max(rect.width, menuRef.current?.offsetWidth || rect.width);
  const availableBelow = Math.max(
    0,
    window.innerHeight - rect.bottom - MENU_GAP - VIEWPORT_PADDING,
  );
  const availableAbove = Math.max(0, rect.top - MENU_GAP - VIEWPORT_PADDING);
  const openAbove = availableBelow < Math.min(measuredHeight, 120)
    && availableAbove > availableBelow;
  const availableSpace = openAbove ? availableAbove : availableBelow;
  const maxHeight = Math.max(1, Math.min(MAX_MENU_HEIGHT, availableSpace));
  const renderedHeight = Math.min(measuredHeight, maxHeight);
  const maxWidth = Math.max(1, window.innerWidth - VIEWPORT_PADDING * 2);
  const clampedWidth = Math.min(measuredWidth, maxWidth);
  const maxLeft = Math.max(VIEWPORT_PADDING, window.innerWidth - clampedWidth - VIEWPORT_PADDING);

  setMenuPosition({
    top: openAbove
      ? Math.max(VIEWPORT_PADDING, rect.top - MENU_GAP - renderedHeight)
      : Math.min(window.innerHeight - VIEWPORT_PADDING, rect.bottom + MENU_GAP),
    left: Math.min(Math.max(VIEWPORT_PADDING, rect.left), maxLeft),
    minWidth: Math.min(rect.width, maxWidth),
    maxWidth,
    maxHeight,
  });
}, [options.length]);
```

- [ ] **Step 3: Reposition on open, scroll and resize**

```tsx
useLayoutEffect(() => {
  if (!isOpen) {
    setMenuPosition(null);
    return undefined;
  }

  updateMenuPosition();
  const frame = window.requestAnimationFrame(updateMenuPosition);
  window.addEventListener('resize', updateMenuPosition);
  window.addEventListener('scroll', updateMenuPosition, true);

  return () => {
    window.cancelAnimationFrame(frame);
    window.removeEventListener('resize', updateMenuPosition);
    window.removeEventListener('scroll', updateMenuPosition, true);
  };
}, [isOpen, updateMenuPosition]);
```

- [ ] **Step 4: Make click-outside portal-aware**

```tsx
const target = event.target as Node;
const clickedTrigger = triggerRef.current?.contains(target);
const clickedMenu = menuRef.current?.contains(target);
if (!clickedTrigger && !clickedMenu) setIsOpen(false);
```

- [ ] **Step 5: Portal the listbox to `document.body`**

```tsx
const menu = isOpen && typeof document !== 'undefined'
  ? createPortal(
      <div
        ref={menuRef}
        role="listbox"
        data-testid="latex-dropdown-menu"
        style={{
          position: 'fixed',
          top: menuPosition?.top ?? 0,
          left: menuPosition?.left ?? 0,
          minWidth: menuPosition?.minWidth,
          maxWidth: menuPosition?.maxWidth,
          maxHeight: menuPosition?.maxHeight,
          visibility: menuPosition ? 'visible' : 'hidden',
          zIndex: 1000,
        }}
        className="w-max overflow-y-auto rounded-[10px] border border-slate-200 bg-white py-1 shadow-lg"
      >
        {/* existing placeholder and option buttons */}
      </div>,
      document.body,
    )
  : null;
```

Đổi wrapper ref hiện tại thành `ref={triggerRef}` và render `{menu}` cạnh nút, không lồng menu vào wrapper.

- [ ] **Step 6: Run the unit tests and verify GREEN**

Run:

```bash
npm run test:run -- tests/LatexDropdown.test.tsx tests/InteractiveMathText.test.tsx tests/quizAnswerStateColors.test.tsx
```

Expected: 3 files PASS; native select và các renderer hiện có không regress.

- [ ] **Step 7: Commit the functional fix**

```bash
git add src/features/quiz-player/components/QuestionRenderer/atoms/LatexDropdown.tsx tests/LatexDropdown.test.tsx
git commit -m "fix(student): prevent dropdown menus from being clipped"
```

---

### Task 3: Verify real viewport behavior with Cypress Component

**Files:**
- Create: `cypress/component/student-dropdown-menu.cy.tsx`
- Test: `src/features/quiz-player/components/QuestionRenderer/index.tsx`
- Test: `src/features/quiz-player/components/QuestionRenderer/atoms/LatexDropdown.tsx`

**Interfaces:**
- Consumes: `QuestionRenderer` and the unchanged `onAnswerChange(questionId, value, blankId)` callback.
- Produces: browser regression coverage for portal placement, upward flipping and answer selection.

- [ ] **Step 1: Create a stateful dropdown question harness**

```tsx
import React, { useState } from 'react';
import { MathJaxContext } from 'better-react-mathjax';
import QuestionRenderer from '../../src/features/quiz-player/components/QuestionRenderer';
import { QuestionType, type Question } from '../../src/types';

const question = {
  id: 'dropdown-overflow',
  type: QuestionType.DROPDOWN,
  question: 'Chọn công thức đúng.',
  text: 'Diện tích xung quanh hình lập phương là [1].',
  blanks: [{
    id: '1',
    options: ['$4a^2$', '$6a^2$', '$a^3$', '$12a^2$'],
    correctAnswer: '$4a^2$',
  }],
} as Question;

const Harness = () => {
  const [answers, setAnswers] = useState<Record<string, any>>({});
  return (
    <MathJaxContext>
      <main className="min-h-screen bg-slate-100 pt-[330px]">
        <QuestionRenderer
          question={question}
          index={6}
          answers={answers}
          onAnswerChange={(questionId, value, blankId) => {
            setAnswers((current) => ({
              ...current,
              [questionId]: {
                ...(current[questionId] || {}),
                [blankId!]: value,
              },
            }));
          }}
        />
      </main>
    </MathJaxContext>
  );
};
```

- [ ] **Step 2: Assert the menu escapes clipping and flips upward**

```tsx
it('keeps a LaTeX dropdown visible near the bottom of the viewport', () => {
  cy.viewport(1000, 650);
  cy.mount(<Harness />);

  cy.get('button[aria-haspopup="listbox"]').then(($trigger) => {
    const triggerRect = $trigger[0].getBoundingClientRect();
    cy.wrap($trigger).click();

    cy.get('[role="listbox"]')
      .should('be.visible')
      .then(($menu) => {
        const menuRect = $menu[0].getBoundingClientRect();
        expect($menu.closest('.question-renderer-shell')).to.have.length(0);
        expect(menuRect.top).to.be.gte(8);
        expect(menuRect.bottom).to.be.lte(642);
        expect(menuRect.bottom).to.be.lte(triggerRect.top + 1);
      });
  });
});
```

- [ ] **Step 3: Assert selecting an option updates the trigger**

```tsx
cy.contains('[role="option"]', '4').click();
cy.get('button[aria-haspopup="listbox"]').should('contain.text', '4');
cy.get('[role="listbox"]').should('not.exist');
```

- [ ] **Step 4: Run Cypress Component**

Run:

```bash
npx cypress run --component --spec cypress/component/student-dropdown-menu.cy.tsx --browser electron
```

Expected: browser spec PASS and listbox remains inside viewport.

- [ ] **Step 5: Commit browser regression coverage**

```bash
git add cypress/component/student-dropdown-menu.cy.tsx
git commit -m "test(student): cover dropdown portal positioning"
```

---

### Task 4: Final verification and integration readiness

**Files:**
- Verify all changed files.

**Interfaces:**
- Produces: clean branch ready for PR and production deployment.

- [ ] **Step 1: Run focused tests**

```bash
npm run test:run -- tests/LatexDropdown.test.tsx tests/InteractiveMathText.test.tsx tests/quizAnswerStateColors.test.tsx
```

Expected: all focused tests PASS.

- [ ] **Step 2: Run Cypress Component regression**

```bash
npx cypress run --component --spec cypress/component/student-dropdown-menu.cy.tsx --browser electron
```

Expected: PASS.

- [ ] **Step 3: Build production bundle**

```bash
npm run build
```

Expected: build succeeds. Restore `public/sitemap.xml` if it is only regenerated by the build.

- [ ] **Step 4: Review and security checks**

```bash
git diff --check origin/main...HEAD
npm run security:scan
```

Expected: no whitespace errors and no new secret findings in changed files.

- [ ] **Step 5: Run GitNexus impact analysis**

Analyze `LatexDropdown` and the branch diff. Confirm affected flows are limited to quiz-player dropdown rendering and math dropdown rendering.

- [ ] **Step 6: Commit documentation**

```bash
git add docs/superpowers/specs/2026-07-24-student-dropdown-menu-design.md docs/superpowers/plans/2026-07-24-fix-student-dropdown-menu.md
git commit -m "docs(student): document dropdown overflow fix"
```
