import React from 'react';
import { render, screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import HeroSection from '../src/components/HomePage/components/HeroSection';

describe('Stitch login layout', () => {
  it('shows concise student benefits when the student role is active', () => {
    render(<HeroSection activeTab="student" />);

    expect(screen.getByRole('heading', {
      name: 'Học vui mỗi ngày, tiến bộ qua từng bài.',
    })).toBeInTheDocument();

    const benefits = screen.getByLabelText('Lợi ích dành cho học sinh');
    expect(within(benefits).getAllByRole('article')).toHaveLength(3);
    expect(within(benefits).getByText('Học đúng trọng tâm')).toBeInTheDocument();
    expect(within(benefits).getByText('Biết mình tiến bộ ra sao')).toBeInTheDocument();
    expect(within(benefits).getByText('An toàn, dễ sử dụng')).toBeInTheDocument();
  });

  it('switches to concrete teacher benefits for the teacher role', () => {
    render(<HeroSection activeTab="teacher" />);

    expect(screen.getByRole('heading', {
      name: 'Dạy nhẹ nhàng hơn, theo dõi lớp rõ hơn.',
    })).toBeInTheDocument();

    const benefits = screen.getByLabelText('Lợi ích dành cho giáo viên');
    expect(within(benefits).getAllByRole('article')).toHaveLength(3);
    expect(within(benefits).getByText('Giao bài nhanh chóng')).toBeInTheDocument();
    expect(within(benefits).getByText('Nắm tiến độ từng em')).toBeInTheDocument();
    expect(within(benefits).getByText('Quản lý tập trung')).toBeInTheDocument();
  });
});
