import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import {
  AssignedWorkSkeleton,
  DashboardEmptyState,
  DashboardSectionError,
} from '../src/components/HomePage/student-dashboard';

describe('dashboard state primitives', () => {
  it('renders three assignment-shaped skeleton cards by default', () => {
    render(<AssignedWorkSkeleton />);

    expect(screen.getAllByTestId('assigned-work-skeleton')).toHaveLength(3);
    expect(screen.getByLabelText('Đang tải bài cần làm')).toHaveAttribute('aria-busy', 'true');
  });

  it('renders a compact empty state', () => {
    render(
      <DashboardEmptyState
        title="Em đã hoàn thành tất cả nhiệm vụ hiện tại."
        description="Em có thể luyện thêm một môn học."
      />,
    );

    expect(screen.getByRole('status')).toHaveTextContent(
      'Em đã hoàn thành tất cả nhiệm vụ hiện tại.',
    );
  });

  it('calls retry from a local section error', () => {
    const retry = vi.fn();
    render(<DashboardSectionError message="Chưa tải được dữ liệu." onRetry={retry} />);

    fireEvent.click(screen.getByRole('button', { name: 'Thử lại' }));
    expect(retry).toHaveBeenCalledTimes(1);
  });
});
