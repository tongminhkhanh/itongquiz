import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { Question } from '../src/types';
import QuestionRenderer from '../src/features/quiz-player/components/QuestionRenderer';

vi.mock('../src/features/quiz-player/components/QuestionRenderer/atoms/MathSpan', () => ({
  default: ({ content }: { content: string }) => <span>{content}</span>,
}));

const question = {
  id: 'q-1',
  type: 'MULTIPLE_CHOICE',
  text: 'Hai cộng hai bằng bao nhiêu?',
  options: ['A. 3', 'B. 4'],
} as unknown as Question;

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

    expect(screen.getByTestId('question-card')).toHaveClass('border-transparent', 'shadow-sm');
    expect(screen.getByTestId('question-prompt')).toHaveClass(
      'bg-gradient-to-br',
      'from-sky-50',
      'to-teal-50',
    );
    expect(screen.getByText('Câu 1')).toBeVisible();
  });
});
