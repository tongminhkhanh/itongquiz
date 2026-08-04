import React from 'react';
import { fireEvent, render, screen, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import LandingHeader from '../src/components/HomePage/components/LandingHeader';
import LandingFooter from '../src/components/HomePage/components/LandingFooter';
import PublicSiteHeader from '../src/components/schoolPage/PublicSiteHeader';
import Footer from '../src/components/common/Footer';

describe('crawlable public navigation', () => {
    it('exposes login-page navigation as real links', () => {
        const { container } = render(<><LandingHeader /><LandingFooter /></>);
        const links = within(container).getAllByRole('link');

        expect(links.some(link => link.getAttribute('href') === '/about')).toBe(true);
        expect(links.some(link => link.getAttribute('href') === '/contact')).toBe(true);
        expect(screen.getByRole('link', { name: 'Cổng phụ huynh' })).toHaveAttribute(
            'href',
            'https://phuhuynh.thitong.site/',
        );
        expect(links.some(link => link.getAttribute('href') === '/privacy')).toBe(true);
        expect(links.some(link => link.getAttribute('href') === '/tos')).toBe(true);
    });

    it('uses anchors for public-page desktop navigation', () => {
        render(<PublicSiteHeader active="about" />);

        expect(screen.getByRole('link', { name: 'Trang chủ' })).toHaveAttribute('href', '/');
        expect(screen.getByRole('link', { name: 'Giới thiệu' })).toHaveAttribute('href', '/about');
        expect(screen.getByRole('link', { name: 'Liên hệ' })).toHaveAttribute('href', '/contact');
    });

    it('keeps footer links crawlable while preserving SPA navigation', () => {
        const onNavigate = vi.fn();
        render(<Footer onNavigate={onNavigate} />);

        const privacy = screen.getByRole('link', { name: 'Chính sách bảo mật' });
        expect(privacy).toHaveAttribute('href', '/privacy');
        fireEvent.click(privacy);
        expect(onNavigate).toHaveBeenCalledWith('/privacy');
    });
});
