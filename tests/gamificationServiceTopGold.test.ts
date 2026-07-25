import { beforeEach, describe, expect, it, vi } from 'vitest';
import { callApi } from '../src/services/apiAdapter';
import { getTopGoldLeaderboard } from '../src/services/gamificationService';

vi.mock('../src/services/apiAdapter', () => ({
  callApi: vi.fn(),
}));

const mockedCallApi = vi.mocked(callApi);

const rows = [
  { username: 'an', fullName: 'Nguyễn Minh An', avatar: '', coins: 1250 },
];

describe('getTopGoldLeaderboard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns the worker rows on success', async () => {
    mockedCallApi.mockResolvedValue({ status: 'success', data: rows });
    await expect(getTopGoldLeaderboard()).resolves.toEqual(rows);
  });

  it('throws when the worker request fails', async () => {
    mockedCallApi.mockRejectedValue(new Error('network'));
    await expect(getTopGoldLeaderboard()).rejects.toThrow('network');
  });
});
