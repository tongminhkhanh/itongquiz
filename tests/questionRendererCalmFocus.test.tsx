import React from 'react';
import { render, screen, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { QuestionType, type Question } from '../src/types';
import QuestionRenderer from '../src/features/quiz-player/components/QuestionRenderer';

vi.mock('../src/features/quiz-player/components/QuestionRenderer/atoms/MathSpan', () => ({
  default: ({ content }: { content: string }) => <span>{content}</span>,
}));

const prompt = 'Hai cộng hai bằng bao nhiêu?';

const question: Question = {
  id: 'q-1',
  type: QuestionType.MCQ,
  question: prompt,
  options: ['A. 3', 'B. 4'],
  correctAnswer: 'B',
};

describe('QuestionRenderer Calm Focus shell', () => {
  it('places the prompt on the focal gradient and removes hard card borders', () => {
    render(
      <QuestionRenderer
        question={question}
        index={0}
        answers={{}}
        onAnswerChange={vi.fn()}
      />,
    );

    const heading = screen.getByRole('heading', { level: 2 });
    const promptSurface = screen.getByTestId('question-prompt');

    expect(within(heading).getByText(prompt)).toBeVisible();
    expect(screen.getByText('Trắc nghiệm một đáp án')).toBeVisible();
    expect(promptSurface).toHaveClass('from-sky-50', 'to-teal-50');
    expect(promptSurface).not.toHaveClass('border-b');
  });
});
