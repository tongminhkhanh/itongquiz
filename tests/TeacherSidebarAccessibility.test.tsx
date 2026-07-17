import React from 'react';
import { fireEvent, render } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import Sidebar from '../src/components/TeacherDashboard/Sidebar';
import { useAuthStore } from '../stores/authStore';

const renderSidebar = (options: {
    isMobileOpen?: boolean;
    setIsMobileOpen?: (open: boolean) => void;
} = {}) => render(
    <Sidebar
        activeTab="overview"
        setActiveTab={vi.fn()}
        onLogout={vi.fn()}
        isMobileOpen={options.isMobileOpen}
        setIsMobileOpen={options.setIsMobileOpen}
    />,
);

describe('Teacher dashboard sidebar accessibility', () => {
    beforeEach(() => {
        useAuthStore.setState({ isAdmin: false });
    });

    it('removes the closed mobile drawer from keyboard and accessibility navigation', () => {
        const originalMatchMedia = window.matchMedia;
        Object.defineProperty(window, 'matchMedia', {
            configurable: true,
            value: vi.fn().mockReturnValue({
                matches: false,
                addEventListener: vi.fn(),
                removeEventListener: vi.fn(),
            }),
        });

        const { container } = renderSidebar({ isMobileOpen: false });
        const drawer = container.querySelector('aside');

        expect(drawer?.hasAttribute('inert')).toBe(true);
        expect(drawer?.getAttribute('aria-hidden')).toBe('true');

        Object.defineProperty(window, 'matchMedia', {
            configurable: true,
            value: originalMatchMedia,
        });
    });

    it('closes an open mobile drawer when Escape is pressed', () => {
        const setIsMobileOpen = vi.fn();
        renderSidebar({ isMobileOpen: true, setIsMobileOpen });

        fireEvent.keyDown(window, { key: 'Escape' });

        expect(setIsMobileOpen).toHaveBeenCalledWith(false);
    });
});
