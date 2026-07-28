import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  loginStudent: vi.fn(),
  setView: vi.fn(),
}));

vi.mock('../stores/authStore', () => ({
  useAuthStore: () => ({
    isLoggingIn: false,
    loginStart: vi.fn(),
    loginPendingPasswordChange: vi.fn(),
    loginSuccess: vi.fn(),
    loginFailure: vi.fn(),
  }),
}));
vi.mock('../src/stores/useClassroomStore', () => ({
  useClassroomStore: () => ({
    isLoading: false,
    loginStudent: mocks.loginStudent,
  }),
}));
vi.mock('../stores/quizStore', () => ({
  useQuizStore: () => ({ setView: mocks.setView }),
}));
vi.mock('../src/features/notifications/useUnifiedNotificationsFeatureFlag', () => ({
  useUnifiedNotificationsFeatureFlag: () => ({ ready: true, enabled: false }),
}));
vi.mock('../src/components/common/CurrentAnnouncementBanner', () => ({
  default: () => null,
}));
vi.mock('../src/components/HomePage/components/LandingHeader', () => ({
  default: () => <header>ItOngQuiz</header>,
}));
vi.mock('../src/components/HomePage/components/HeroSection', () => ({
  default: ({ activeTab }: { activeTab: 'student' | 'teacher' }) => (
    <div>{activeTab === 'student' ? 'Học vui mỗi ngày' : 'Dạy nhẹ nhàng hơn'}</div>
  ),
}));
vi.mock('../src/components/HomePage/components/LandingFooter', () => ({
  default: () => <footer>Trường Tiểu học Ít Ong</footer>,
}));
vi.mock('../src/components/common/PasswordChangeDialog', () => ({
  default: () => null,
}));

import LoginLandingPage from '../src/components/HomePage/LoginLandingPage';

describe('LoginLandingPage behavior', () => {
  beforeEach(() => {
    localStorage.clear();
    mocks.loginStudent.mockReset();
    mocks.setView.mockReset();
  });

  it('groups the value panel and login form in the approved split shell', () => {
    render(<LoginLandingPage />);

    const shell = screen.getByTestId('login-shell');
    expect(shell).toHaveClass('md:grid-cols-[44%_56%]');
    expect(shell).toContainElement(screen.getByText('Học vui mỗi ngày'));
    expect(shell).toContainElement(screen.getByRole('tabpanel'));
  });

  it('restores a saved account and role with an explicit remembered state', async () => {
    localStorage.setItem('itongquiz_saved_login_v1', JSON.stringify({
      username: 'giaovien01',
      role: 'teacher',
      savedAt: '2026-07-28T00:00:00.000Z',
    }));

    render(<LoginLandingPage />);

    expect(await screen.findByRole('heading', {
      name: 'Đăng nhập dành cho giáo viên',
    })).toBeInTheDocument();
    expect(screen.getByLabelText('Tên đăng nhập giáo viên')).toHaveValue('giaovien01');
    expect(screen.getByRole('checkbox', {
      name: 'Ghi nhớ tài khoản trên thiết bị này',
    })).toBeChecked();
  });

  it('shows a student login failure inline and clears it after editing', async () => {
    mocks.loginStudent.mockResolvedValue(false);
    render(<LoginLandingPage />);

    fireEvent.change(screen.getByLabelText('Mã học sinh'), {
      target: { value: ' HS001 ' },
    });
    fireEvent.change(screen.getByLabelText('Mật khẩu'), {
      target: { value: 'incorrect' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Vào lớp học' }));

    expect(await screen.findByRole('alert'))
      .toHaveTextContent('Mã học sinh hoặc mật khẩu chưa đúng.');
    expect(mocks.loginStudent).toHaveBeenCalledWith({
      username: 'HS001',
      password: 'incorrect',
    });

    fireEvent.change(screen.getByLabelText('Mật khẩu'), {
      target: { value: 'try-again' },
    });
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('persists only the username and role when remembering a successful login', async () => {
    mocks.loginStudent.mockResolvedValue(true);
    render(<LoginLandingPage />);

    fireEvent.change(screen.getByLabelText('Mã học sinh'), {
      target: { value: 'HS4A001' },
    });
    fireEvent.change(screen.getByLabelText('Mật khẩu'), {
      target: { value: 'student-secret' },
    });
    fireEvent.click(screen.getByRole('checkbox', { name: 'Ghi nhớ mã học sinh' }));
    fireEvent.click(screen.getByRole('button', { name: 'Vào lớp học' }));

    await waitFor(() => expect(mocks.setView).toHaveBeenCalledWith('home'));
    const saved = JSON.parse(localStorage.getItem('itongquiz_saved_login_v1') || '{}');
    expect(saved).toMatchObject({ username: 'HS4A001', role: 'student' });
    expect(saved).not.toHaveProperty('password');
  });
});
