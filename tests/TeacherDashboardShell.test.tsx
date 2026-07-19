import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import TeacherDashboard from '../src/components/TeacherDashboard';
import TeacherDashboardModule from '../src/components/TeacherDashboard/teacher-dashboard-shell';
import { ApiError } from '../src/services/api/errors';
import { useAuthStore } from '../stores/authStore';
import { useQuizStore } from '../stores/quizStore';
import { useClassroomStore } from '../src/stores/useClassroomStore';
import { useTeacherDashboardUIStore } from '../src/stores/useTeacherDashboardUIStore';

const mocks = vi.hoisted(() => ({
  navigate: vi.fn(),
  callApi: vi.fn(),
  getStoredJWTToken: vi.fn(),
  getJWTPurpose: vi.fn(),

  invalidatePrefix: vi.fn(),
  checkJwtExpiry: vi.fn(),
  showSuccess: vi.fn(),
  showError: vi.fn(),
}));

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
  return { ...actual, useNavigate: () => mocks.navigate };
});

vi.mock('../src/services/apiAdapter', () => ({ callApi: mocks.callApi }));
vi.mock('../src/services/api/auth', () => ({
  getStoredJWTToken: mocks.getStoredJWTToken,
  getJWTPurpose: mocks.getJWTPurpose,
}));
vi.mock('../src/services/CacheService', () => ({
  cacheService: { invalidatePrefix: mocks.invalidatePrefix },
}));
vi.mock('../src/utils/jwtInterceptor', () => ({
  checkAndWarnJWTExpiry: mocks.checkJwtExpiry,
}));
vi.mock('../src/utils/toast', () => ({
  showSuccess: mocks.showSuccess,
  showError: mocks.showError,
}));

vi.mock('../src/components/common', () => ({
  Button: ({ children, onClick }: any) => <button onClick={onClick}>{children}</button>,
  ErrorBoundary: ({ children }: any) => <>{children}</>,
  Footer: () => <footer>Footer</footer>,
}));
vi.mock('../src/components/common/CurrentAnnouncementBanner', () => ({
  default: () => <div>Announcement banner</div>,
}));
vi.mock('../src/components/common/PasswordChangeDialog', () => ({
  default: ({ onComplete }: any) => (
    <div data-testid="password-gate"><button onClick={() => onComplete('new-token')}>Đổi mật khẩu</button></div>
  ),
}));

vi.mock('../src/components/TeacherDashboard/Sidebar', () => ({
  default: ({ activeTab, setActiveTab, onLogout }: any) => (
    <aside>
      <span data-testid="sidebar-active">{activeTab}</span>
      <button onClick={() => setActiveTab('results')}>Sidebar kết quả</button>
      <button onClick={onLogout}>Sidebar đăng xuất</button>
    </aside>
  ),
}));
vi.mock('../src/components/TeacherDashboard/BottomNavigation', () => ({
  default: ({ setActiveTab, onToggleMenu }: any) => (
    <nav>
      <button onClick={() => setActiveTab('create')}>Bottom tạo đề</button>
      <button onClick={onToggleMenu}>Bottom menu</button>
    </nav>
  ),
}));

vi.mock('../src/components/TeacherDashboard/OverviewTab', () => ({
  default: ({ resultsLoadState, resultsError, onRetryResults }: any) => (
    <div data-testid="overview-tab">
      {resultsLoadState}:{resultsError || ''}
      <button onClick={onRetryResults}>Thử lại kết quả</button>
    </div>
  ),
}));
vi.mock('../src/components/TeacherDashboard/ResultsTab', () => ({
  default: ({ results }: any) => <div data-testid="results-tab">{results.map((item: any) => item.studentName).join('|')}</div>,
}));
vi.mock('../src/components/TeacherDashboard/ManageTab', () => ({
  default: ({ onEdit, onManageCode, quizzes }: any) => (
    <div data-testid="manage-tab">
      <button onClick={() => onEdit(quizzes[0])}>Sửa đề</button>
      <button onClick={() => onManageCode(quizzes[0].id, quizzes[0].accessCode || '')}>Quản lý mã</button>
    </div>
  ),
}));
vi.mock('../src/components/TeacherDashboard/CreateTab', () => ({
  default: ({ editingQuiz, onSuccess }: any) => (
    <div data-testid="create-tab">
      {editingQuiz?.title || 'Tạo mới'}
      <button onClick={onSuccess}>Lưu đề thành công</button>
    </div>
  ),
}));

const simpleTab = (testId: string) => ({ default: () => <div data-testid={testId}>{testId}</div> });
vi.mock('../src/components/TeacherDashboard/AnnouncementSettings', () => simpleTab('announcements-tab'));
vi.mock('../src/components/TeacherDashboard/ClassManagementTab', () => simpleTab('classes-tab'));
vi.mock('../src/components/TeacherDashboard/AssignmentTab', () => simpleTab('assignments-tab'));
vi.mock('../src/components/TeacherDashboard/TeacherManagementTab', () => simpleTab('teachers-tab'));
vi.mock('../src/components/TeacherDashboard/GiftShopTab', () => simpleTab('gift-shop-tab'));
vi.mock('../src/features/homework/components/HomeworkTab', () => ({ HomeworkTab: () => <div data-testid="homework-tab" /> }));
vi.mock('../src/components/LiveExam/TeacherLiveExamDashboardContainer', () => simpleTab('live-exam-tab'));
vi.mock('../src/features/certificates/TeacherCertificatesPage', () => simpleTab('certificates-tab'));
vi.mock('../src/features/certificates/AdminTemplatesPage', () => simpleTab('admin-templates-tab'));
vi.mock('../src/features/math-audit/MathAuditPage', () => simpleTab('math-audit-tab'));
vi.mock('../src/components/TeacherDashboard/PersonalSettingsTab', () => simpleTab('personal-settings-tab'));

const result = (id: string, studentName: string, studentClass: string) => ({
  id,
  quizId: 'quiz-1',
  quizTitle: 'Phân số',
  studentName,
  studentClass,
  score: 8,
  correctCount: 8,
  totalQuestions: 10,
  timeTaken: 10,
  submittedAt: '2026-07-19T00:00:00.000Z',
  answers: {},
});

const resetStores = () => {
  const logout = vi.fn();
  const loginSuccess = vi.fn();
  useAuthStore.setState({
    isLoggedIn: true,
    username: 'teacher-a',
    teacherName: 'Cô An',
    teacherClass: '3A',
    isAdmin: false,
    logout,
    loginSuccess,
  } as any);

  useQuizStore.setState({
    quizzes: [{ id: 'quiz-1', title: 'Phân số', accessCode: 'OLD', questions: [] }],
    results: [
      result('1', 'An', '3A'),
      result('2', 'Bình', 'lớp 3-a'),
      result('3', 'Chi', '13A'),
    ],
    error: null,
    loadQuizzes: vi.fn().mockResolvedValue(undefined),
    loadResults: vi.fn().mockResolvedValue(undefined),
    setError: vi.fn((error: string | null) => useQuizStore.setState({ error })),
    setView: vi.fn(),
    removeQuiz: vi.fn(),
    createQuiz: vi.fn(),
    modifyQuiz: vi.fn().mockResolvedValue(undefined),
  } as any);

  useClassroomStore.setState({ logoutStudent: vi.fn() } as any);
  useTeacherDashboardUIStore.setState({ activeTab: 'overview', assignmentComposerDraft: null });
};

describe('TeacherDashboard shell contracts', () => {
  it('keeps the dashboard compatibility export stable', () => {
    expect(TeacherDashboard).toBe(TeacherDashboardModule);
  });

  beforeEach(() => {
    resetStores();
    mocks.navigate.mockReset();
    mocks.callApi.mockReset().mockResolvedValue({ data: { mustChangePassword: false } });
    mocks.getStoredJWTToken.mockReset().mockReturnValue('jwt-token');
    mocks.getJWTPurpose.mockReset().mockReturnValue('session');

    mocks.invalidatePrefix.mockReset();
    mocks.checkJwtExpiry.mockReset();
    mocks.showSuccess.mockReset();
    mocks.showError.mockReset();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('bootstraps teacher data and schedules JWT checks', async () => {
    const view = render(<TeacherDashboard />);

    await waitFor(() => expect(useQuizStore.getState().loadQuizzes).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(useQuizStore.getState().loadResults).toHaveBeenCalledTimes(1));

    expect(mocks.invalidatePrefix).toHaveBeenCalledWith('quizzes:');
    expect(mocks.checkJwtExpiry).toHaveBeenCalled();

    view.unmount();

  });

  it('searches dashboard destinations and reports an unknown function', async () => {
    render(<TeacherDashboard />);
    const search = screen.getByPlaceholderText('Tìm chức năng...');

    fireEvent.change(search, { target: { value: 'điểm' } });
    fireEvent.submit(search.closest('form') as HTMLFormElement);
    expect(await screen.findByTestId('results-tab')).toBeTruthy();
    expect(useTeacherDashboardUIStore.getState().activeTab).toBe('results');

    fireEvent.change(search, { target: { value: 'không tồn tại' } });
    fireEvent.submit(search.closest('form') as HTMLFormElement);
    expect(mocks.showError).toHaveBeenCalledWith('Không tìm thấy chức năng phù hợp.');
  });

  it('passes only the teacher exact normalized class results to the results tab', async () => {
    useTeacherDashboardUIStore.setState({ activeTab: 'results' });
    render(<TeacherDashboard />);

    const content = await screen.findByTestId('results-tab');
    expect(content).toHaveTextContent('An');
    expect(content).toHaveTextContent('Bình');
    expect(content).not.toHaveTextContent('Chi');
  });

  it('guards admin-only and disabled gift-shop tabs by returning to overview', async () => {
    useTeacherDashboardUIStore.setState({ activeTab: 'announcements' });
    render(<TeacherDashboard />);
    await waitFor(() => expect(useTeacherDashboardUIStore.getState().activeTab).toBe('overview'));
    expect(await screen.findByTestId('overview-tab')).toBeTruthy();

    useTeacherDashboardUIStore.getState().setActiveTab('gift-shop');
    await waitFor(() => expect(useTeacherDashboardUIStore.getState().activeTab).toBe('overview'));
  });

  it('clears dashboard state and related sessions on logout', async () => {
    useTeacherDashboardUIStore.setState({
      activeTab: 'results',
      assignmentComposerDraft: { classId: 'class-1' } as any,
    });
    render(<TeacherDashboard />);

    fireEvent.click(screen.getByRole('button', { name: 'Sidebar đăng xuất' }));

    expect(useTeacherDashboardUIStore.getState().activeTab).toBe('overview');
    expect(useTeacherDashboardUIStore.getState().assignmentComposerDraft).toBeNull();
    expect(useAuthStore.getState().logout).toHaveBeenCalledTimes(1);
    expect(useClassroomStore.getState().logoutStudent).toHaveBeenCalledTimes(1);
    expect(useQuizStore.getState().setView).toHaveBeenCalledWith('home');
  });

  it('logs out and redirects when the account profile returns 401', async () => {
    mocks.callApi.mockRejectedValue(new ApiError('Unauthorized', 401));
    render(<TeacherDashboard />);

    await waitFor(() => expect(useAuthStore.getState().logout).toHaveBeenCalledTimes(1));
    expect(mocks.showError).toHaveBeenCalledWith('Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.');
    expect(mocks.navigate).toHaveBeenCalledWith('/', { replace: true });
  });

  it('updates a quiz access code in uppercase and keeps the current quiz identity', async () => {
    useTeacherDashboardUIStore.setState({ activeTab: 'manage' });
    render(<TeacherDashboard />);

    fireEvent.click(await screen.findByRole('button', { name: 'Quản lý mã' }));
    fireEvent.change(screen.getByPlaceholderText('Nhập mã mới (VD: TOAN3A)'), { target: { value: 'new1' } });
    fireEvent.click(screen.getByRole('button', { name: 'Lưu mã' }));

    await waitFor(() => expect(useQuizStore.getState().modifyQuiz).toHaveBeenCalledWith(expect.objectContaining({
      id: 'quiz-1',
      accessCode: 'NEW1',
      requireCode: true,
    })));
    expect(mocks.showSuccess).toHaveBeenCalledWith('Cap nhat ma lam bai thanh cong!');
  });
});
