import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { StudentFloatingSidebar } from '../src/components/gamification/StudentFloatingSidebar';
import { useGamificationStore } from '../src/stores/useGamificationStore';

const fetchTopGoldLeaderboard = vi.fn(async () => undefined);

const students = [
  { username: 'an', fullName: 'Nguyễn Minh An', avatar: '', coins: 1250 },
  { username: 'binh', fullName: 'Trần Gia Bình', avatar: '', coins: 980 },
  { username: 'chi', fullName: 'Lê Ngọc Chi', avatar: '', coins: 920 },
  { username: 'dung', fullName: 'Phạm Hoàng Dũng', avatar: '', coins: 850 },
];

const resetStore = () => {
  useGamificationStore.setState({
    topGoldLeaderboard: [],
    topGoldLeaderboardLoading: false,
    topGoldLeaderboardError: null,
    topGoldLeaderboardFetchedAt: null,
    fetchTopGoldLeaderboard,
  });
};

describe('StudentFloatingSidebar', () => {
  beforeEach(() => {
    fetchTopGoldLeaderboard.mockClear();
    resetStore();
  });

  afterEach(() => {
    document.body.style.overflow = '';
  });

  it('renders a trophy trigger and fetches only after opening', async () => {
    render(<StudentFloatingSidebar currentUsername="an" />);

    expect(screen.getByRole('button', { name: 'Mở Bảng vàng học sinh' })).toBeInTheDocument();
    expect(fetchTopGoldLeaderboard).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole('button', { name: 'Mở Bảng vàng học sinh' }));

    expect(screen.getByRole('dialog', { name: 'Bảng vàng học sinh' })).toBeInTheDocument();
    await waitFor(() => expect(fetchTopGoldLeaderboard).toHaveBeenCalledTimes(1));
  });

  it('shows the ranked students and marks the current student', () => {
    useGamificationStore.setState({ topGoldLeaderboard: students });
    render(<StudentFloatingSidebar currentUsername="an" />);

    fireEvent.click(screen.getByRole('button', { name: 'Mở Bảng vàng học sinh' }));

    expect(screen.getByText('Nguyễn Minh An')).toBeInTheDocument();
    expect(screen.getByText('Trần Gia Bình')).toBeInTheDocument();
    expect(screen.getByText('Lê Ngọc Chi')).toBeInTheDocument();
    expect(screen.getByText('Phạm Hoàng Dũng')).toBeInTheDocument();
    expect(screen.getByText('Em')).toBeInTheDocument();
  });

  it('keeps the podium in rank order for screen readers', () => {
    useGamificationStore.setState({ topGoldLeaderboard: students });
    render(<StudentFloatingSidebar currentUsername="an" />);

    fireEvent.click(screen.getByRole('button', { name: 'Mở Bảng vàng học sinh' }));

    const podium = screen.getByRole('list', { name: 'Ba học sinh dẫn đầu' });
    const rankedItems = within(podium).getAllByRole('listitem');
    expect(rankedItems[0]).toHaveTextContent('Hạng 1');
    expect(rankedItems[1]).toHaveTextContent('Hạng 2');
    expect(rankedItems[2]).toHaveTextContent('Hạng 3');
  });

  it('closes from Escape, backdrop and close button', () => {
    render(<StudentFloatingSidebar currentUsername="an" />);
    const trigger = screen.getByRole('button', { name: 'Mở Bảng vàng học sinh' });

    fireEvent.click(trigger);
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(screen.queryByRole('dialog', { name: 'Bảng vàng học sinh' })).not.toBeInTheDocument();

    fireEvent.click(trigger);
    fireEvent.mouseDown(screen.getByTestId('student-gold-backdrop'));
    expect(screen.queryByRole('dialog', { name: 'Bảng vàng học sinh' })).not.toBeInTheDocument();

    fireEvent.click(trigger);
    fireEvent.click(screen.getByRole('button', { name: 'Đóng Bảng vàng' }));
    expect(screen.queryByRole('dialog', { name: 'Bảng vàng học sinh' })).not.toBeInTheDocument();
  });

  it('returns focus to the trophy after closing', async () => {
    render(<StudentFloatingSidebar currentUsername="an" />);
    const trigger = screen.getByRole('button', { name: 'Mở Bảng vàng học sinh' });

    fireEvent.click(trigger);
    fireEvent.click(screen.getByRole('button', { name: 'Đóng Bảng vàng' }));

    await waitFor(() => expect(trigger).toHaveFocus());
  });

  it('shows an error and retries with force refresh', () => {
    useGamificationStore.setState({
      topGoldLeaderboardError: 'Chưa thể tải Bảng vàng.',
    });
    render(<StudentFloatingSidebar currentUsername="an" />);

    fireEvent.click(screen.getByRole('button', { name: 'Mở Bảng vàng học sinh' }));
    expect(screen.getByRole('alert')).toHaveTextContent('Chưa thể tải Bảng vàng.');

    fireEvent.click(screen.getByRole('button', { name: 'Thử lại' }));
    expect(fetchTopGoldLeaderboard).toHaveBeenLastCalledWith(true);
  });
});
