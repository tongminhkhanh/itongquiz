import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import Sidebar from '../Sidebar';
import { useAuthStore } from '../../../../stores/authStore';

type RenderSidebarOptions = {
    isCollapsed?: boolean;
    isMobileOpen?: boolean;
    onCollapsedChange?: (collapsed: boolean) => void;
    setIsMobileOpen?: (open: boolean) => void;
};

const renderSidebar = (options: RenderSidebarOptions = {}) => render(
    <Sidebar
        activeTab="overview"
        setActiveTab={vi.fn()}
        onLogout={vi.fn()}
        isCollapsed={options.isCollapsed}
        isMobileOpen={options.isMobileOpen}
        onCollapsedChange={options.onCollapsedChange}
        setIsMobileOpen={options.setIsMobileOpen}
    />,
);

describe('TeacherDashboard Sidebar', () => {
    beforeEach(() => {
        localStorage.clear();
        useAuthStore.setState({ isAdmin: false });
    });

    it('hides system administration from non-admin teachers', () => {
        renderSidebar();

        expect(screen.queryByRole('button', { name: /Quản trị hệ thống/i })).toBeNull();
        expect(screen.queryByRole('button', { name: /Theo dõi lỗi công thức/i })).toBeNull();
    });

    it('exposes an accessible desktop collapse control', () => {
        const onCollapsedChange = vi.fn();
        renderSidebar({ onCollapsedChange });

        fireEvent.click(screen.getByRole('button', { name: 'Thu gọn thanh điều hướng' }));

        expect(onCollapsedChange).toHaveBeenCalledWith(true);
    });

    it('keeps every navigation group available in collapsed desktop mode', () => {
        useAuthStore.setState({ isAdmin: true });
        renderSidebar({ isCollapsed: true });

        expect(screen.getByRole('button', { name: 'Tổng quan' }).getAttribute('title')).toBe('Tổng quan');
        expect(screen.getByRole('button', { name: 'IOE Quản lý' })).toBeTruthy();
        expect(screen.getByRole('button', { name: 'Cấp chứng nhận' })).toBeTruthy();
        expect(screen.getByRole('button', { name: 'Cài đặt cá nhân' })).toBeTruthy();
        expect(screen.getByRole('button', { name: 'Thông báo' })).toBeTruthy();
    });

    it('closes the mobile drawer from its backdrop', () => {
        const setIsMobileOpen = vi.fn();
        renderSidebar({ isMobileOpen: true, setIsMobileOpen });

        fireEvent.click(screen.getByRole('button', { name: 'Đóng menu điều hướng' }));

        expect(setIsMobileOpen).toHaveBeenCalledWith(false);
    });
});
