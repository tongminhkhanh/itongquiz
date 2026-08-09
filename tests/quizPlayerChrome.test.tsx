import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import QuizHeader from '../src/features/quiz-player/components/QuizHeader';
import QuizPagination from '../src/features/quiz-player/components/QuizPagination';

describe('quiz player chrome', () => {
  it('switches from the normal timer to the calm warning state below 60 seconds', () => {
    const { rerender } = render(
      <QuizHeader
        title="Bài kiểm tra Toán"
        timeLeft={60}
        totalQuestions={20}
        answeredCount={5}
        isPractice={false}
        studentName="An"
      />,
    );

    expect(screen.getByLabelText('Thời gian còn lại 1:00')).toHaveClass(
      'bg-sky-50',
      'text-sky-700',
      'shadow-sm',
    );

    rerender(
      <QuizHeader
        title="Bài kiểm tra Toán"
        timeLeft={59}
        totalQuestions={20}
        answeredCount={5}
        isPractice={false}
        studentName="An"
      />,
    );

    const warningTimer = screen.getByLabelText('Thời gian còn lại 0:59');
    expect(warningTimer).toHaveClass('bg-rose-50', 'text-rose-600', 'shadow-sm');
    expect(warningTimer).not.toHaveClass('animate-pulse');
    expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '5');
  });

  it('shows practice mode without a timer while retaining progress semantics', () => {
    render(
      <QuizHeader
        title="Luyện tập Toán"
        timeLeft={0}
        totalQuestions={10}
        answeredCount={4}
        isPractice
        studentName="An"
      />,
    );

    expect(screen.getByText('Luyện tập')).toBeVisible();
    expect(screen.queryByLabelText(/Thời gian còn lại/i)).not.toBeInTheDocument();
    expect(screen.getByRole('progressbar', { name: 'Tiến độ trả lời' })).toHaveAttribute(
      'aria-valuenow',
      '4',
    );
  });

  it('preserves pagination behavior and hides decorative lucide icons', () => {
    const onPageChange = vi.fn();
    const onSubmit = vi.fn();
    const { rerender } = render(
      <QuizPagination
        currentPage={1}
        totalPages={2}
        onPageChange={onPageChange}
        onSubmit={onSubmit}
        isSubmitting={false}
      />,
    );

    const previousButton = screen.getByRole('button', { name: 'Trang trước' });
    const primaryNextButton = screen.getByRole('button', { name: 'Câu tiếp theo' });

    expect(previousButton).toBeDisabled();
    expect(previousButton).toHaveClass('disabled:bg-slate-200', 'disabled:text-slate-700');
    expect(previousButton).not.toHaveClass('disabled:opacity-60');
    fireEvent.click(previousButton);
    expect(onPageChange).not.toHaveBeenCalled();

    expect(screen.getByRole('status')).toHaveTextContent('Trang 1 / 2');
    expect(screen.getByRole('status')).toHaveAttribute('aria-live', 'polite');

    expect(screen.queryByRole('button', { name: 'Trang sau' })).not.toBeInTheDocument();

    for (const button of [previousButton, primaryNextButton]) {
      expect(button.querySelector('svg')).toHaveAttribute('aria-hidden', 'true');
    }

    fireEvent.click(primaryNextButton);
    expect(onPageChange).toHaveBeenCalledTimes(1);
    expect(onPageChange).toHaveBeenCalledWith(2);

    rerender(
      <QuizPagination
        currentPage={2}
        totalPages={2}
        onPageChange={onPageChange}
        onSubmit={onSubmit}
        isSubmitting={false}
      />,
    );

    expect(screen.queryByRole('button', { name: 'Trang sau' })).not.toBeInTheDocument();
    const submitButton = screen.getByRole('button', { name: 'Nộp bài' });
    expect(submitButton.querySelector('svg')).toHaveAttribute('aria-hidden', 'true');
    fireEvent.click(submitButton);
    expect(onSubmit).toHaveBeenCalledTimes(1);

    rerender(
      <QuizPagination
        currentPage={2}
        totalPages={2}
        onPageChange={onPageChange}
        onSubmit={onSubmit}
        isSubmitting
      />,
    );

    const submittingButton = screen.getByRole('button', { name: 'Đang nộp bài...' });
    expect(submittingButton).toBeDisabled();
    expect(submittingButton).toHaveClass('disabled:bg-slate-300', 'disabled:text-slate-700');
    expect(submittingButton).not.toHaveClass('disabled:opacity-60');
    fireEvent.click(submittingButton);
    expect(onSubmit).toHaveBeenCalledTimes(1);
  });
});
