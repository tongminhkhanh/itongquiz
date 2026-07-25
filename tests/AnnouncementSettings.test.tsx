// @vitest-environment jsdom
import React from 'react';
import { act, render, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  callApi: vi.fn(),
  getSystemSettings: vi.fn(),
  saveSystemSettings: vi.fn(),
  showError: vi.fn(),
  showSuccess: vi.fn(() => 'toast-id'),
  composerProps: null as Record<string, any> | null,
}));

vi.mock('../src/services/apiAdapter', () => ({ callApi: mocks.callApi }));
vi.mock('../src/services/systemSettingsService', () => ({
  getSystemSettings: mocks.getSystemSettings,
  saveSystemSettings: mocks.saveSystemSettings,
}));
vi.mock('../stores/authStore', () => ({
  useAuthStore: () => ({ username: 'admin-test' }),
}));
vi.mock('../src/utils/toast', () => ({
  showError: mocks.showError,
  showSuccess: mocks.showSuccess,
}));
vi.mock('../src/features/notifications/admin/AnnouncementComposer', () => ({
  AnnouncementComposer: (props: Record<string, any>) => {
    mocks.composerProps = props;
    return <div data-testid="announcement-composer" />;
  },
}));

import AnnouncementSettings from '../src/components/TeacherDashboard/AnnouncementSettings';

const draft = {
  id: '',
  content: 'Nội dung thử nghiệm',
  bannerTitle: 'Thông báo thử nghiệm',
  bannerSubtitle: '',
  bannerLink: '',
  bannerImage: '',
  ctaLabel: '',
  status: 'DRAFT' as const,
  audience: 'ALL' as const,
  priority: 'INFO' as const,
  channels: [],
  dismissible: true,
  startsAt: '',
  endsAt: '',
  updatedAt: '',
  surfaceOverrides: {},
};

describe('AnnouncementSettings callback contracts', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.composerProps = null;
    mocks.getSystemSettings.mockResolvedValue({
      aiAssistantEnabled: false,
      unifiedNotificationsEnabled: false,
      degraded: false,
    });
    mocks.callApi.mockImplementation(async (action: string) => {
      if (action === 'list_announcements') return { data: [] };
      if (action === 'create_announcement') {
        return { data: { id: 'announcement-1', updatedAt: '2026-07-25T00:00:00.000Z' } };
      }
      return {};
    });
  });

  it('adapts save and send-test handlers to the composer void callback contract', async () => {
    render(<AnnouncementSettings />);

    await waitFor(() => expect(mocks.composerProps).not.toBeNull());

    let saveResult: unknown;
    await act(async () => {
      saveResult = await mocks.composerProps?.onSaveDraft(draft);
    });

    expect(saveResult).toBeUndefined();
    expect(mocks.callApi).toHaveBeenCalledWith(
      'create_announcement',
      expect.objectContaining({ bannerTitle: draft.bannerTitle }),
    );

    const sendTestResult = mocks.composerProps?.onSendTest(draft);
    expect(sendTestResult).toBeUndefined();
    expect(mocks.showSuccess).toHaveBeenCalledWith(
      'Bản xem thử đã sẵn sàng; chưa công bố thông báo.',
    );
  });
});
