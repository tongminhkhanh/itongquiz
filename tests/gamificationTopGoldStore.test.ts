import { beforeEach, describe, expect, it, vi } from 'vitest';
import * as gamificationService from '../src/services/gamificationService';
import { useGamificationStore } from '../src/stores/useGamificationStore';

vi.mock('../src/services/gamificationService', async () => {
  const actual = await vi.importActual<typeof import('../src/services/gamificationService')>(
    '../src/services/gamificationService',
  );
  return {
    ...actual,
    getTopGoldLeaderboard: vi.fn(),
  };
});

const mockedGetTopGold = vi.mocked(gamificationService.getTopGoldLeaderboard);
const rows = [
  { username: 'an', fullName: 'Nguyễn Minh An', avatar: '', coins: 1250 },
];

describe('useGamificationStore top gold leaderboard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useGamificationStore.setState({
      topGoldLeaderboard: [],
      topGoldLeaderboardLoading: false,
      topGoldLeaderboardError: null,
      topGoldLeaderboardFetchedAt: null,
    });
  });

  it('loads and timestamps a successful response', async () => {
    mockedGetTopGold.mockResolvedValue(rows);

    await useGamificationStore.getState().fetchTopGoldLeaderboard();

    const state = useGamificationStore.getState();
    expect(state.topGoldLeaderboard).toEqual(rows);
    expect(state.topGoldLeaderboardLoading).toBe(false);
    expect(state.topGoldLeaderboardError).toBeNull();
    expect(state.topGoldLeaderboardFetchedAt).toEqual(expect.any(Number));
  });

  it('uses a fresh cache without calling the service again', async () => {
    useGamificationStore.setState({
      topGoldLeaderboard: rows,
      topGoldLeaderboardFetchedAt: Date.now(),
    });

    await useGamificationStore.getState().fetchTopGoldLeaderboard();

    expect(mockedGetTopGold).not.toHaveBeenCalled();
  });

  it('refreshes a stale cache', async () => {
    mockedGetTopGold.mockResolvedValue(rows);
    useGamificationStore.setState({
      topGoldLeaderboard: rows,
      topGoldLeaderboardFetchedAt: Date.now() - 60_001,
    });

    await useGamificationStore.getState().fetchTopGoldLeaderboard();

    expect(mockedGetTopGold).toHaveBeenCalledTimes(1);
  });

  it('force refreshes a fresh cache', async () => {
    mockedGetTopGold.mockResolvedValue(rows);
    useGamificationStore.setState({
      topGoldLeaderboard: rows,
      topGoldLeaderboardFetchedAt: Date.now(),
    });

    await useGamificationStore.getState().fetchTopGoldLeaderboard(true);

    expect(mockedGetTopGold).toHaveBeenCalledTimes(1);
  });

  it('shares completion across concurrent requests', async () => {
    let resolveRequest: ((value: typeof rows) => void) | undefined;
    mockedGetTopGold.mockImplementation(() => new Promise((resolve) => {
      resolveRequest = resolve;
    }));

    const first = useGamificationStore.getState().fetchTopGoldLeaderboard();
    let secondFinished = false;
    const second = useGamificationStore.getState().fetchTopGoldLeaderboard().then(() => {
      secondFinished = true;
    });

    await Promise.resolve();
    expect(mockedGetTopGold).toHaveBeenCalledTimes(1);
    expect(secondFinished).toBe(false);

    resolveRequest?.(rows);
    await Promise.all([first, second]);
    expect(secondFinished).toBe(true);
  });

  it('ignores an in-flight response after gamification is cleared', async () => {
    let resolveRequest: ((value: typeof rows) => void) | undefined;
    mockedGetTopGold.mockImplementation(() => new Promise((resolve) => {
      resolveRequest = resolve;
    }));

    const request = useGamificationStore.getState().fetchTopGoldLeaderboard();
    useGamificationStore.getState().clearGamification();
    resolveRequest?.(rows);
    await request;

    const state = useGamificationStore.getState();
    expect(state.topGoldLeaderboard).toEqual([]);
    expect(state.topGoldLeaderboardFetchedAt).toBeNull();
    expect(state.topGoldLeaderboardLoading).toBe(false);
  });

  it('keeps cached rows when refresh fails', async () => {
    mockedGetTopGold.mockRejectedValue(new Error('network'));
    useGamificationStore.setState({ topGoldLeaderboard: rows });

    await useGamificationStore.getState().fetchTopGoldLeaderboard(true);

    const state = useGamificationStore.getState();
    expect(state.topGoldLeaderboard).toEqual(rows);
    expect(state.topGoldLeaderboardError).toBe('Chưa cập nhật được Bảng vàng. Vui lòng thử lại.');
    expect(state.topGoldLeaderboardLoading).toBe(false);
  });
});
