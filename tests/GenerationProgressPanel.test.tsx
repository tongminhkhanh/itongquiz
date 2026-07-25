import { fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import GenerationProgressPanel from '../src/features/quiz-generator/components/GenerationProgressPanel';

afterEach(() => {
  vi.useRealTimers();
});

describe('GenerationProgressPanel', () => {
  it('shows the active step and cancels the request', () => {
    const onCancel = vi.fn();
    render(
      <GenerationProgressPanel
        step="reading_document"
        startedAt={Date.now()}
        questionCount={10}
        onCancel={onCancel}
      />,
    );

    expect(screen.getAllByText('Đang đọc và nhận dạng tài liệu')[0]).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Hủy tạo đề' }));
    expect(onCancel).toHaveBeenCalledOnce();
  });

  it('shows validating copy, elapsed seconds and question target', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-07-25T05:00:12.000Z'));

    render(
      <GenerationProgressPanel
        step="validating"
        startedAt={Date.now() - 12_000}
        questionCount={10}
        onCancel={vi.fn()}
      />,
    );

    expect(screen.getAllByText('Đang kiểm tra cấu trúc và đáp án')[0]).toBeInTheDocument();
    expect(screen.getByText('Đã chờ 12 giây · Mục tiêu 10 câu')).toBeInTheDocument();
    expect(screen.queryByText(/%/)).not.toBeInTheDocument();
  });

  it('does not show a cancel action after completion', () => {
    render(
      <GenerationProgressPanel
        step="completed"
        startedAt={Date.now() - 5_000}
        questionCount={10}
        onCancel={vi.fn()}
      />,
    );
    expect(screen.getAllByText('Đã hoàn thành')[0]).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Hủy tạo đề' })).not.toBeInTheDocument();
  });

  it('shows cancellation without fake percentages', () => {
    render(
      <GenerationProgressPanel
        step="cancelled"
        startedAt={Date.now() - 5_000}
        questionCount={10}
        onCancel={vi.fn()}
      />,
    );
    expect(screen.getByText('Đã hủy yêu cầu')).toBeInTheDocument();
    expect(screen.queryByText(/%/)).not.toBeInTheDocument();
  });
});
