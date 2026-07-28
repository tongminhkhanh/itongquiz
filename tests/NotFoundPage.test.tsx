import React from 'react';
import { render, screen } from '@testing-library/react';
import { NotFoundPage } from '../src/app/NotFoundPage';

describe('NotFoundPage', () => {
    it('keeps an unknown client-side route visibly distinct from the home page', () => {
        render(<NotFoundPage />);

        expect(screen.getByRole('heading', { level: 1, name: 'Không tìm thấy trang này' })).toBeInTheDocument();
        expect(screen.getByRole('link', { name: 'Về trang chủ' })).toHaveAttribute('href', '/');
    });
});
