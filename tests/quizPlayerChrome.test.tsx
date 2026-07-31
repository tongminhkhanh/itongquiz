import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import QuizHeader from '../src/features/quiz-player/components/QuizHeader';
import QuizPagination from '../src/features/quiz-player/components/QuizPagination';

describe('quiz player chrome', () => {
  it('renders an elevated timer focal point without an alert animation', () => {
    render(
      <QuizHeader
        title="Bài kiểm tra Toán"
        timeLeft={59}
        totalQuestions={20}
        answeredCount={5}
        isPractice={false}
        studentName="An"
      />,
    );

    const timer = screen.getByLabelText('Thời gian còn lại 0:59');
    expect(timer).toHaveClass('bg-rose-50', 'text-rose-600', 'shadow-sm');
    expect(timer).not.toHaveClass('animate-pulse');
    expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '5');
  });

  it('uses lucide icons while preserving paging and submission labels', () => {
    const { rerender } = render(
      <QuizPagination
        currentPage={1}
        totalPages={2}
        onPageChange={vi.fn()}
        onSubmit={vi.fn()}
        isSubmitting={false}
      />,
    );

    expect(screen.getByRole('button', { name: 'Trang trước' }).querySelector('svg')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Trang sau' }).querySelector('svg')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Câu tiếp theo' }).querySelector('svg')).toBeTruthy();

    rerender(
      <QuizPagination
        currentPage={2}
        totalPages={2}
        onPageChange={vi.fn()}
        onSubmit={vi.fn()}
        isSubmitting={false}
      />,
    );

    expect(screen.getByRole('button', { name: 'Nộp bài' }).querySelector('svg')).toBeTruthy();
  });
});
