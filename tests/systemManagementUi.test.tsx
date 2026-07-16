import React from 'react';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import AnnouncementBanner from '../src/components/common/AnnouncementBanner';

afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
});

describe('system management UI safety', () => {
    it('does not render password reveal controls in teacher management source', async () => {
        const source = await import('../src/components/TeacherDashboard/TeacherManagementTab?raw');
        expect(source.default).not.toContain('teacher.password');
        expect(source.default).not.toContain('EyeOff');
        expect(source.default).toContain('Mật khẩu tạm');
    });

    it('offers a one-time bulk reset flow without exposing stored passwords', async () => {
        const source = await import('../src/components/TeacherDashboard/TeacherManagementTab?raw');
        expect(source.default).toContain('reset_all_teacher_passwords');
        expect(source.default).toContain('Reset toàn bộ mật khẩu');
        expect(source.default).not.toContain('teacher.password');
    });

    it('opens an HTTPS announcement with noopener and noreferrer', async () => {
        vi.useFakeTimers();
        const opened = { opener: {} };
        const open = vi.spyOn(window, 'open').mockReturnValue(opened as any);
        render(<AnnouncementBanner title="Thông báo" link="https://thitong.site/help" />);
        await act(async () => { await vi.advanceTimersByTimeAsync(500); });
        fireEvent.click(screen.getByRole('link'));
        expect(open).toHaveBeenCalledWith('https://thitong.site/help', '_blank', 'noopener,noreferrer');
        expect(opened.opener).toBeNull();
        vi.useRealTimers();
    });

    it('does not open a javascript announcement link', async () => {
        vi.useFakeTimers();
        const open = vi.spyOn(window, 'open').mockReturnValue(null);
        render(<AnnouncementBanner title="Thông báo" link="javascript:alert(1)" />);
        await act(async () => { await vi.advanceTimersByTimeAsync(500); });
        fireEvent.click(screen.getByRole('link'));
        expect(open).not.toHaveBeenCalled();
        vi.useRealTimers();
    });
});
