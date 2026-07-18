import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import {
  AssignedWorkSkeleton,
  DashboardEmptyState,
  DashboardSectionError,
  StudentDashboardHeader,
} from '../src/components/HomePage/student-dashboard';

const renderHeader = () =>
  render(
    <StudentDashboardHeader
      studentName="Nguyễn Minh An"
      className="5A"
      avatarUrl="/avatar1.png"
      level={4}
      coins={250}
      activeSection="dashboard"
      giftShopEnabled
      studentId="student-1"
      onSelectSection={vi.fn()}
      onOpenGiftShop={vi.fn()}
      onOpenLiveExam={vi.fn()}
      onOpenAvatar={vi.fn()}
      onOpenChangePassword={vi.fn()}
      onLogout={vi.fn()}
    />,
  );

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

describe('student dashboard header', () => {
  it('opens and closes the account menu by click and Escape', () => {
    renderHeader();
    const trigger = screen.getByRole('button', { name: /Mở menu tài khoản/i });

    fireEvent.click(trigger);
    expect(screen.getByRole('menu', { name: 'Tài khoản học sinh' })).toBeVisible();

    fireEvent.keyDown(document, { key: 'Escape' });
    expect(screen.queryByRole('menu', { name: 'Tài khoản học sinh' })).not.toBeInTheDocument();
  });

  it('exposes all header actions as native buttons with 44px targets', () => {
    renderHeader();

    expect(screen.getByRole('button', { name: /Thi trực tiếp/i }).className).toContain(
      'min-h-11',
    );
    expect(screen.getByRole('button', { name: /Mở menu tài khoản/i })).toHaveAttribute(
      'aria-expanded',
      'false',
    );
  });
});
