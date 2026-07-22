import { useState } from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { QuestionType } from '../src/types';
import QuestionBlueprintSection from '../src/features/quiz-generator/components/QuestionBlueprintSection';
import type { QuizBlueprint } from '../src/features/quiz-generator/domain/quizBlueprint';

const initialBlueprint: QuizBlueprint = {
  intent: 'PRACTICE',
  sourceMode: 'TOPIC',
  totalQuestions: 10,
  typeAllocations: [
    { type: QuestionType.MCQ, count: 4 },
    { type: QuestionType.TRUE_FALSE, count: 2 },
    { type: QuestionType.SHORT_ANSWER, count: 2 },
    { type: QuestionType.MATCHING, count: 2 },
  ],
  difficultyLevels: { level1: 3, level2: 5, level3: 2 },
};

const Harness = () => {
  const [blueprint, setBlueprint] = useState(initialBlueprint);
  return <QuestionBlueprintSection blueprint={blueprint} onChange={setBlueprint} />;
};

describe('QuestionBlueprintSection', () => {
  it('keeps total question count unchanged when auto balancing types', async () => {
    render(<Harness />);

    fireEvent.click(screen.getByRole('button', { name: 'AI tự cân đối' }));

    expect(screen.getByText('Tổng: 10 câu')).toBeInTheDocument();
    const total = screen.getAllByRole('spinbutton')
      .slice(0, 4)
      .map((input) => Number((input as HTMLInputElement).value))
      .reduce((sum, value) => sum + value, 0);
    expect(total).toBe(10);
  });

  it('shows a blocking message when type totals do not match', async () => {
    render(<Harness />);

    const input = screen.getByLabelText('Số câu Trắc nghiệm');
    fireEvent.change(input, { target: { value: '9' } });

    expect(screen.getByText('Tổng số câu theo dạng phải bằng 10.')).toBeInTheDocument();
  });

  it('switches between exam and practice intent', async () => {
    render(<Harness />);

    fireEvent.click(screen.getByRole('button', { name: 'Đề thi' }));
    expect(screen.getByRole('button', { name: 'Đề thi' })).toHaveAttribute('aria-pressed', 'true');

    fireEvent.click(screen.getByRole('button', { name: 'Ôn tập' }));
    expect(screen.getByRole('button', { name: 'Ôn tập' })).toHaveAttribute('aria-pressed', 'true');
  });
});
