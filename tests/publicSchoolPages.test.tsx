import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import AboutPage from '../src/components/schoolPage/AboutPage';
import ContactPage from '../src/components/schoolPage/ContactPage';

describe('public school pages', () => {
    it('renders the Stitch-inspired about page with platform values', () => {
        render(<MemoryRouter><AboutPage /></MemoryRouter>);

        expect(screen.getByRole('heading', { level: 1, name: /Học vui hơn/i })).toBeInTheDocument();
        expect(screen.getByAltText('Minh họa bảng điều khiển học tập số với biểu đồ tiến bộ')).toBeInTheDocument();
        expect(screen.getAllByRole('article')).toHaveLength(3);
        expect(screen.getByRole('link', { name: 'Liên hệ với chúng tôi' })).toHaveAttribute('href', '/contact');
    });

    it('lets visitors preselect a contact topic from the support cards', () => {
        render(<MemoryRouter><ContactPage /></MemoryRouter>);

        expect(screen.getByRole('heading', { level: 1, name: /Kết nối với iTongQuiz/i })).toBeInTheDocument();
        fireEvent.click(screen.getByRole('button', { name: /Tài khoản & đăng nhập/i }));
        expect(screen.getByLabelText('Chủ đề hỗ trợ *')).toHaveValue('Tài khoản & đăng nhập');
        expect(screen.getByRole('button', { name: /Gửi yêu cầu/i })).toBeInTheDocument();
        expect(screen.getByRole('link', { name: /support@thitong.site/i })).toHaveAttribute('href', 'mailto:support@thitong.site');
    });

    it('builds a prefilled support email instead of pretending to submit to a server', () => {
        const openSpy = vi.spyOn(window, 'open').mockImplementation(() => null);
        render(<MemoryRouter><ContactPage /></MemoryRouter>);

        fireEvent.change(screen.getByLabelText('Họ và tên *'), { target: { value: 'Nguyễn Văn A' } });
        fireEvent.change(screen.getByLabelText('Số điện thoại *'), { target: { value: '0900000000' } });
        fireEvent.change(screen.getByLabelText('Email *'), { target: { value: 'phuhuynh@example.com' } });
        fireEvent.change(screen.getByLabelText('Chủ đề hỗ trợ *'), { target: { value: 'Báo lỗi kỹ thuật' } });
        fireEvent.change(screen.getByLabelText('Nội dung chi tiết *'), { target: { value: 'Không mở được bài tập.' } });
        fireEvent.click(screen.getByRole('checkbox'));
        fireEvent.click(screen.getByRole('button', { name: /Gửi yêu cầu/i }));

        expect(openSpy).toHaveBeenCalledWith(
            expect.stringMatching(/^mailto:support@thitong\.site\?subject=/),
            '_self'
        );
        expect(screen.getByRole('status')).toHaveTextContent('Đang mở ứng dụng email');
        openSpy.mockRestore();
    });
});
