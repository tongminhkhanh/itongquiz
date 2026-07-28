import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import LoginForm from '../src/components/HomePage/components/LoginForm';

const renderLoginForm = (
  overrides: Partial<React.ComponentProps<typeof LoginForm>> = {},
) => {
  const props: React.ComponentProps<typeof LoginForm> = {
    activeTab: 'student',
    setActiveTab: vi.fn(),
    username: '',
    setUsername: vi.fn(),
    password: '',
    setPassword: vi.fn(),
    isLoading: false,
    onSubmit: vi.fn(),
    rememberAccount: false,
    onRememberAccountChange: vi.fn(),
    errorMessage: '',
    ...overrides,
  };

  render(<LoginForm {...props} />);
  return props;
};

describe('LoginForm UX', () => {
  it('presents role-specific student guidance and accessible tabs', () => {
    renderLoginForm();

    expect(screen.getByRole('tablist', { name: 'Chọn vai trò đăng nhập' }))
      .toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'Học sinh' }))
      .toHaveAttribute('aria-selected', 'true');
    expect(screen.getByRole('tab', { name: 'Giáo viên' }))
      .toHaveAttribute('aria-selected', 'false');
    expect(screen.getByRole('heading', { name: 'Chào em, bắt đầu học nhé!' }))
      .toBeInTheDocument();
    expect(screen.getByText('Mã học sinh do giáo viên chủ nhiệm cung cấp.'))
      .toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Vào lớp học' }))
      .toBeInTheDocument();
  });

  it('presents teacher copy and requests a role change', () => {
    const setActiveTab = vi.fn();
    renderLoginForm({ activeTab: 'teacher', setActiveTab });

    expect(screen.getByRole('heading', { name: 'Đăng nhập dành cho giáo viên' }))
      .toBeInTheDocument();
    expect(screen.getByText('Quản lý lớp học, giao bài và theo dõi kết quả học sinh.'))
      .toBeInTheDocument();
    expect(screen.getByLabelText('Tên đăng nhập giáo viên'))
      .toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Đăng nhập quản lý' }))
      .toBeInTheDocument();
    expect(screen.getByText('Ghi nhớ tài khoản trên thiết bị này'))
      .toBeInTheDocument();

    fireEvent.click(screen.getByRole('tab', { name: 'Học sinh' }));
    expect(setActiveTab).toHaveBeenCalledWith('student');

    fireEvent.keyDown(screen.getByRole('tab', { name: 'Học sinh' }), {
      key: 'ArrowRight',
    });
    expect(setActiveTab).toHaveBeenCalledWith('teacher');
  });

  it('allows password visibility changes and announces Caps Lock', () => {
    renderLoginForm({ password: 'secret-password' });

    const password = screen.getByLabelText('Mật khẩu');
    expect(password).toHaveAttribute('type', 'password');

    fireEvent.click(screen.getByRole('button', { name: 'Hiện mật khẩu' }));
    expect(password).toHaveAttribute('type', 'text');
    expect(screen.getByRole('button', { name: 'Ẩn mật khẩu' }))
      .toBeInTheDocument();

    const capsLockEvent = new KeyboardEvent('keydown', {
      key: 'A',
      bubbles: true,
    });
    Object.defineProperty(capsLockEvent, 'getModifierState', {
      value: (key: string) => key === 'CapsLock',
    });
    fireEvent(password, capsLockEvent);
    expect(screen.getByRole('status')).toHaveTextContent('Caps Lock đang bật');
  });

  it('renders an inline accessible error and protects controls while loading', () => {
    renderLoginForm({
      username: 'HS001',
      errorMessage: 'Tên đăng nhập hoặc mật khẩu chưa đúng.',
      isLoading: true,
    });

    expect(screen.getByRole('alert'))
      .toHaveTextContent('Tên đăng nhập hoặc mật khẩu chưa đúng.');
    expect(screen.getByLabelText('Mật khẩu'))
      .toHaveAttribute('aria-invalid', 'true');
    expect(screen.getByRole('button', { name: 'Đang đăng nhập...' }))
      .toBeDisabled();
    expect(screen.getByRole('tab', { name: 'Học sinh' })).toBeDisabled();
    expect(screen.getByRole('tab', { name: 'Giáo viên' })).toBeDisabled();
  });
});
