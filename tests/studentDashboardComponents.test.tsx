import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import {
  AssignedWorkSection,
  AssignedWorkSkeleton,
  DashboardEmptyState,
  DashboardSectionError,
  StudentDashboardHeader,
  StudentDashboardHero,
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

const assignmentQuiz = ({
  id,
  attemptCount = 0,
  maxAttempts = 1,
  status = 'OPEN',
}: {
  id: string;
  attemptCount?: number;
  maxAttempts?: number;
  status?: 'OPEN' | 'CLOSED';
}) =>
  ({
    id,
    title: `Bài ${id}`,
    questions: [],
    timeLimit: 20,
    _assignmentData: {
      id: `assignment-${id}`,
      quizId: id,
      classId: 'class-1',
      deadline: '2099-01-01T00:00:00.000Z',
      maxAttempts,
      attemptCount,
      status,
      createdAt: '2026-07-18T00:00:00.000Z',
    },
  }) as any;

const renderHero = (hasReadyAssignment: boolean, onPrimaryAction = vi.fn()) =>
  render(
    <StudentDashboardHero
      firstName="An"
      hasReadyAssignment={hasReadyAssignment}
      attendanceClaimed={false}
      attendanceLabel="Điểm danh nhận thưởng"
      attendanceAvailable
      onPrimaryAction={onPrimaryAction}
      onAttendance={vi.fn()}
    />,
  );

const assignedWorkProps = {
  isLoading: false,
  errorMessage: null,
  page: 1,
  totalPages: 1,
  onRetry: vi.fn(),
  onPageChange: vi.fn(),
  onStartQuiz: vi.fn(),
};

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

describe('student dashboard hero and assigned work', () => {
  it('renders the hero h1 and switches the primary CTA by assignment availability', () => {
    const primaryAction = vi.fn();
    const { rerender } = renderHero(true, primaryAction);

    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Chào ngày mới, An!');
    fireEvent.click(screen.getByRole('button', { name: 'Làm bài được giao' }));
    expect(primaryAction).toHaveBeenCalledTimes(1);

    rerender(
      <StudentDashboardHero
        firstName="An"
        hasReadyAssignment={false}
        attendanceClaimed={false}
        attendanceLabel="Điểm danh nhận thưởng"
        attendanceAvailable
        onPrimaryAction={primaryAction}
        onAttendance={vi.fn()}
      />,
    );
    expect(screen.getByRole('button', { name: 'Luyện tập ngay' })).toBeVisible();
  });

  it('uses a native secondary attendance button without pulse animation', () => {
    renderHero(true);

    const attendance = screen.getByRole('button', { name: 'Điểm danh nhận thưởng' });
    expect(attendance.className).not.toContain('animate-pulse');
    expect(attendance.className).toContain('min-h-11');
  });

  it('renders assignment loading and the approved empty copy', () => {
    const { rerender } = render(<AssignedWorkSection {...assignedWorkProps} quizzes={[]} isLoading />);
    expect(screen.getAllByTestId('assigned-work-skeleton')).toHaveLength(3);

    rerender(<AssignedWorkSection {...assignedWorkProps} quizzes={[]} />);
    expect(screen.getByRole('status')).toHaveTextContent(
      'Em đã hoàn thành tất cả nhiệm vụ hiện tại.',
    );
  });

  it('maps assignment actions and only starts ready work', () => {
    const onStartQuiz = vi.fn();
    const ready = assignmentQuiz({ id: 'ready' });
    const completed = assignmentQuiz({ id: 'completed', attemptCount: 1 });
    const closed = assignmentQuiz({ id: 'closed', status: 'CLOSED' });

    render(
      <AssignedWorkSection
        {...assignedWorkProps}
        quizzes={[ready, completed, closed]}
        onStartQuiz={onStartQuiz}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Làm bài ngay' }));
    expect(screen.getByRole('button', { name: 'Xem kết quả' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Đã đóng' })).toBeDisabled();
    expect(onStartQuiz).toHaveBeenCalledTimes(1);
    expect(onStartQuiz).toHaveBeenCalledWith(ready);
  });
});
