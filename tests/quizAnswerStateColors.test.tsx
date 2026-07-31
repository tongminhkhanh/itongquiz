import React, { useState } from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { Question } from '../src/types';
import QuizNavigation from '../src/features/quiz-player/components/QuizNavigation';
import MCQRenderer from '../src/features/quiz-player/components/QuestionRenderer/renderers/MCQRenderer';
import MultipleSelectRenderer from '../src/features/quiz-player/components/QuestionRenderer/renderers/MultipleSelectRenderer';
import ImageQuestionRenderer from '../src/features/quiz-player/components/QuestionRenderer/renderers/ImageQuestionRenderer';
import UnderlineRenderer from '../src/features/quiz-player/components/QuestionRenderer/renderers/UnderlineRenderer';
import TrueFalseRenderer from '../src/features/quiz-player/components/QuestionRenderer/renderers/TrueFalseRenderer';

vi.mock('../src/features/quiz-player/components/QuestionRenderer/atoms/MathSpan', () => ({
  default: ({ content, className }: { content: string; className?: string }) => (
    <span className={className}>{content}</span>
  ),
}));

const mcqQuestion = {
  id: 'mcq-1',
  type: 'MULTIPLE_CHOICE',
  text: 'Chọn đáp án đúng',
  options: ['A. Một', 'B. Hai'],
} as unknown as Question;

const trueFalseQuestion = {
  id: 'tf-1',
  type: 'TRUE_FALSE',
  text: 'Đánh dấu đúng hoặc sai',
  items: [{ id: 'statement-1', statement: 'Một cộng một bằng hai.' }],
} as unknown as Question;

const multipleSelectQuestion = {
  id: 'multi-1',
  type: 'MULTIPLE_SELECT',
  text: 'Chọn nhiều đáp án',
  options: ['A. Một', 'B. Hai'],
} as unknown as Question;

const imageQuestion = {
  id: 'image-1',
  type: 'IMAGE_QUESTION',
  text: 'Chọn hình phù hợp',
  options: ['Hình một', 'Hình hai'],
  optionImages: ['', ''],
} as unknown as Question;

const underlineQuestion = {
  id: 'underline-1',
  type: 'UNDERLINE',
  text: 'Chọn từ cần gạch chân',
  words: ['từ một', 'từ hai'],
} as unknown as Question;

const sparseImageQuestion = {
  id: 'image-sparse',
  type: 'IMAGE_QUESTION',
  text: 'Chọn hình phù hợp',
  options: ['', ''],
  optionImages: ['data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///ywAAAAAAQABAAACAUwAOw==', ''],
} as unknown as Question;

const expectCalmInteraction = (choice: HTMLElement) => {
  expect(choice).toHaveClass('active:scale-[0.985]', 'motion-reduce:transform-none');
};

describe('quiz answer state colors', () => {
  it('keeps option letters in accessible names before and after selection', () => {
    const mcqRender = render(
      <MCQRenderer
        question={mcqQuestion}
        index={0}
        answers={{}}
        onAnswerChange={vi.fn()}
      />,
    );
    expect(screen.getByRole('button', { name: 'Đáp án B: Hai' })).toBeVisible();
    mcqRender.rerender(
      <MCQRenderer
        question={mcqQuestion}
        index={0}
        answers={{ 'mcq-1': 'B' }}
        onAnswerChange={vi.fn()}
      />,
    );
    expect(screen.getByRole('button', { name: 'Đáp án B: Hai' })).toBeVisible();
    mcqRender.unmount();

    const multipleRender = render(
      <MultipleSelectRenderer
        question={multipleSelectQuestion}
        index={0}
        answers={{}}
        onAnswerChange={vi.fn()}
      />,
    );
    expect(screen.getByRole('button', { name: 'Đáp án A: Một' })).toBeVisible();
    multipleRender.rerender(
      <MultipleSelectRenderer
        question={multipleSelectQuestion}
        index={0}
        answers={{ 'multi-1': ['A'] }}
        onAnswerChange={vi.fn()}
      />,
    );
    expect(screen.getByRole('button', { name: 'Đáp án A: Một' })).toBeVisible();
    multipleRender.unmount();

    const imageRender = render(
      <ImageQuestionRenderer
        question={sparseImageQuestion}
        index={0}
        answers={{}}
        onAnswerChange={vi.fn()}
      />,
    );
    expect(screen.getByRole('button', { name: 'Đáp án B' })).toBeVisible();
    imageRender.rerender(
      <ImageQuestionRenderer
        question={sparseImageQuestion}
        index={0}
        answers={{ 'image-sparse': 'B' }}
        onAnswerChange={vi.fn()}
      />,
    );
    expect(screen.getByRole('button', { name: 'Đáp án B' })).toBeVisible();
  });

  it('shows a selected multiple-choice answer in green', () => {
    render(
      <MCQRenderer
        question={mcqQuestion}
        index={0}
        answers={{ 'mcq-1': 'B' }}
        onAnswerChange={vi.fn()}
      />,
    );

    const selectedAnswer = screen.getByRole('button', { name: /Hai/ });
    const unselectedAnswer = screen.getByRole('button', { name: /Một/ });
    expect(selectedAnswer).toHaveAttribute('aria-pressed', 'true');
    expect(selectedAnswer).toHaveClass('bg-emerald-50', 'text-emerald-950', 'ring-emerald-300');
    expect(selectedAnswer.querySelector('svg')).toBeTruthy();
    expect(unselectedAnswer).toHaveAttribute('aria-pressed', 'false');
    expect(unselectedAnswer).toHaveClass('border-transparent', 'bg-white');
    expectCalmInteraction(selectedAnswer);
  });

  it('uses green for other selectable answer types', () => {
    const { unmount } = render(
      <MultipleSelectRenderer
        question={multipleSelectQuestion}
        index={0}
        answers={{ 'multi-1': ['A'] }}
        onAnswerChange={vi.fn()}
      />,
    );
    const multipleChoice = screen.getByRole('button', { name: /Một/ });
    expect(multipleChoice).toHaveAttribute('aria-pressed', 'true');
    expect(multipleChoice).toHaveClass('bg-emerald-50', 'ring-emerald-300');
    expect(screen.getByRole('button', { name: /Hai/ })).toHaveClass('border-transparent', 'bg-white');
    expectCalmInteraction(multipleChoice);
    unmount();

    const imageRender = render(
      <ImageQuestionRenderer
        question={imageQuestion}
        index={0}
        answers={{ 'image-1': 'B' }}
        onAnswerChange={vi.fn()}
      />,
    );
    const imageChoice = screen.getByRole('button', { name: /Hình hai/ });
    expect(imageChoice).toHaveAttribute('aria-pressed', 'true');
    expect(imageChoice).toHaveClass('bg-emerald-50', 'ring-emerald-300');
    expect(screen.getByRole('button', { name: /Hình một/ })).toHaveClass('border-transparent', 'bg-white');
    expectCalmInteraction(imageChoice);
    imageRender.unmount();

    render(
      <UnderlineRenderer
        question={underlineQuestion}
        index={0}
        answers={{ 'underline-1': [1] }}
        onAnswerChange={vi.fn()}
      />,
    );
    const underlineChoice = screen.getByRole('button', { name: 'từ hai' });
    expect(underlineChoice).toHaveAttribute('aria-pressed', 'true');
    expect(underlineChoice).toHaveClass('bg-emerald-50', 'ring-emerald-300');
    expect(screen.getByRole('button', { name: 'từ một' })).toHaveClass('border-transparent', 'bg-white');
    expectCalmInteraction(underlineChoice);
  });

  it('uses the same calm green state for Đúng and Sai after selection', () => {
    const Harness = () => {
      const [answers, setAnswers] = useState<Record<string, any>>({});
      return (
        <TrueFalseRenderer
          question={trueFalseQuestion}
          index={0}
          answers={answers}
          onAnswerChange={(questionId, value, itemKey) => {
            setAnswers((current) => ({
              ...current,
              [questionId]: { ...(current[questionId] || {}), [itemKey!]: value },
            }));
          }}
        />
      );
    };

    render(<Harness />);

    const trueButton = screen.getByRole('button', { name: 'Đúng' });
    const falseButton = screen.getByRole('button', { name: 'Sai' });

    fireEvent.click(trueButton);
    expect(trueButton).toHaveAttribute('aria-pressed', 'true');
    expect(trueButton).toHaveClass('bg-emerald-50', 'text-emerald-950', 'ring-emerald-300');
    expect(falseButton).not.toHaveClass('bg-red-50');
    expectCalmInteraction(trueButton);

    fireEvent.click(falseButton);
    expect(falseButton).toHaveAttribute('aria-pressed', 'true');
    expect(falseButton).toHaveClass('bg-emerald-50', 'text-emerald-950', 'ring-emerald-300');
    expect(falseButton).not.toHaveClass('bg-red-50');
    expect(trueButton).not.toHaveClass('bg-emerald-50');
    expect(trueButton).toHaveClass('border-transparent', 'bg-white');
    expectCalmInteraction(falseButton);
  });

  it('marks answered question numbers in green while preserving the active focus ring', () => {
    render(
      <QuizNavigation
        questions={[mcqQuestion, { ...mcqQuestion, id: 'mcq-2' } as Question]}
        isQuestionAnswered={(question) => question.id === 'mcq-1'}
        activeQuestionId="mcq-1"
        QUESTIONS_PER_PAGE={10}
        onPageChange={vi.fn()}
      />,
    );

    const answeredQuestion = screen.getByRole('button', { name: 'Đi đến câu 1' });
    const unansweredQuestion = screen.getByRole('button', { name: 'Đi đến câu 2' });

    expect(answeredQuestion).toHaveClass('border-transparent', 'bg-emerald-700', 'text-white');
    expect(answeredQuestion).toHaveClass('ring-1', 'ring-sky-500');
    expect(answeredQuestion).toHaveAccessibleDescription('Đã trả lời');
    expect(answeredQuestion.querySelector('svg')).toHaveAttribute('aria-hidden', 'true');
    expect(unansweredQuestion).toHaveClass('border-transparent', 'bg-slate-100', 'text-slate-600');
    expect(unansweredQuestion).not.toHaveAccessibleDescription();
    const answeredLegend = screen
      .getAllByText('Đã trả lời')
      .find((label) => label.previousElementSibling?.classList.contains('bg-emerald-700'));
    expect(answeredLegend?.previousElementSibling).toHaveClass('bg-emerald-700');
  });

  it('uses unique answered descriptions when multiple navigation regions are rendered', () => {
    const navigation = (
      <QuizNavigation
        questions={[mcqQuestion]}
        isQuestionAnswered={() => true}
        activeQuestionId="mcq-1"
        QUESTIONS_PER_PAGE={10}
        onPageChange={vi.fn()}
      />
    );

    render(
      <>
        {navigation}
        {navigation}
      </>,
    );

    const answeredButtons = screen.getAllByRole('button', { name: 'Đi đến câu 1' });
    const descriptionIds = answeredButtons.map((button) => button.getAttribute('aria-describedby'));

    expect(new Set(descriptionIds).size).toBe(2);
    for (const descriptionId of descriptionIds) {
      expect(descriptionId).toBeTruthy();
      expect(document.getElementById(descriptionId!)).toHaveTextContent('Đã trả lời');
    }
  });
});
