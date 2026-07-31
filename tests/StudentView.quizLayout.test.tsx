import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Question, Quiz } from '../src/types';
import StudentView from '../src/components/StudentView';

const mocks = vi.hoisted(() => ({
  changePage: vi.fn(),
  navigationProps: [] as Array<Record<string, any>>,
  useQuizPlayer: vi.fn(),
}));

vi.mock('../src/features/quiz-player/hooks/useQuizPlayer', () => ({
  useQuizPlayer: mocks.useQuizPlayer,
}));

vi.mock('../src/features/quiz-player/hooks/useQuizPageNavigation', () => ({
  useQuizPageNavigation: () => ({
    activeQuestionId: 'student-1',
    changePage: mocks.changePage,
  }),
}));

vi.mock('../src/features/quiz-player/components/QuizNavigation', () => ({
  default: (props: Record<string, any>) => {
    mocks.navigationProps.push(props);
    return (
      <nav aria-label={`${props.variant} quiz navigation`}>
        <button type="button" onClick={() => props.onPageChange(2, props.questions[10].id)}>
          {props.variant} câu 11
        </button>
      </nav>
    );
  },
}));

vi.mock('../src/components/student', () => ({
  AccessCodeForm: () => null,
  StudentInfoForm: () => null,
  SubmitConfirmModal: () => null,
  ResultScreen: () => null,
  QuestionRenderer: ({ index }: { index: number }) => <div>Câu kiểm tra {index + 1}</div>,
}));

vi.mock('../src/components/gamification/RewardOverlay', () => ({
  default: () => null,
}));

const questions = Array.from({ length: 12 }, (_, index) => ({
  id: `student-${index + 1}`,
  text: `Câu ${index + 1}`,
  type: 'MULTIPLE_CHOICE',
  options: [],
})) as unknown as Question[];

const quiz = {
  id: 'quiz-1',
  title: 'Bài thi thử',
  questions,
} as unknown as Quiz;

describe('StudentView active quiz layout', () => {
  beforeEach(() => {
    mocks.changePage.mockReset();
    mocks.navigationProps.length = 0;
    mocks.useQuizPlayer.mockReturnValue({
      step: 'quiz',
      studentName: 'An',
      setStudentName: vi.fn(),
      studentClass: '5A',
      setStudentClass: vi.fn(),
      studentAvatar: null,
      enteredCode: '',
      setEnteredCode: vi.fn(),
      codeError: '',
      answers: {},
      timeLeft: 600,
      result: null,
      shuffledQuestions: questions,
      isSubmitting: false,
      submitError: '',
      showReward: false,
      setShowReward: vi.fn(),
      showSubmitConfirm: false,
      setShowSubmitConfirm: vi.fn(),
      rewardData: null,
      currentPage: 1,
      setCurrentPage: vi.fn(),
      totalPages: 2,
      questionsOnCurrentPage: questions.slice(0, 10),
      handleStart: vi.fn(),
      handleCodeVerify: vi.fn(),
      handleAnswerChange: vi.fn(),
      handleMatchingClick: vi.fn(),
      handleSubmit: vi.fn(),
      handleRetryReward: vi.fn(),
      isQuestionAnswered: () => false,
    });
  });

  it('wires matching mobile and sidebar navigation to the active quiz page handler', () => {
    render(<StudentView quiz={quiz} onExit={vi.fn()} onSaveResult={vi.fn()} />);

    const mobileProps = mocks.navigationProps.find((props) => props.variant === 'mobile')!;
    const sidebarProps = mocks.navigationProps.find((props) => props.variant === 'sidebar')!;

    expect(screen.getByRole('navigation', { name: 'mobile quiz navigation' })).toBeVisible();
    expect(screen.getByRole('navigation', { name: 'sidebar quiz navigation' })).toBeVisible();
    expect(mobileProps).toMatchObject({
      variant: 'mobile',
      questions,
      activeQuestionId: 'student-1',
      QUESTIONS_PER_PAGE: 10,
    });
    expect(sidebarProps).toMatchObject({
      variant: 'sidebar',
      questions,
      activeQuestionId: 'student-1',
      QUESTIONS_PER_PAGE: 10,
    });
    expect(mobileProps.onPageChange).toBe(sidebarProps.onPageChange);

    fireEvent.click(screen.getByRole('button', { name: 'mobile câu 11' }));
    expect(mocks.changePage).toHaveBeenCalledTimes(1);
    expect(mocks.changePage).toHaveBeenCalledWith(2, 'student-11');
  });
});
