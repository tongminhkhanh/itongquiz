import React from 'react';
import { render, screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import HeroSection from '../src/components/HomePage/components/HeroSection';

describe('Stitch login layout', () => {
  it('keeps the approved value panel concise and complete', () => {
    render(<HeroSection />);

    expect(screen.getByRole('heading', {
      name: 'Học tốt hơn, dạy nhẹ nhàng hơn.',
    })).toBeInTheDocument();

    const benefits = screen.getByLabelText('Lợi ích của ItOngQuiz');
    expect(within(benefits).getAllByRole('article')).toHaveLength(3);
    expect(within(benefits).getByText('Học tập đúng trọng tâm')).toBeInTheDocument();
    expect(within(benefits).getByText('Theo dõi tiến bộ rõ ràng')).toBeInTheDocument();
    expect(within(benefits).getByText('Dễ dùng mỗi ngày')).toBeInTheDocument();
  });
});
