import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import QuizPlayerLayout from '../src/features/quiz-player/components/QuizPlayerLayout';

describe('QuizPlayerLayout', () => {
  it('provides mobile and desktop navigation regions around the question stream', () => {
    render(
      <QuizPlayerLayout
        mobileNavigation={<nav aria-label="Điều hướng câu hỏi">Mobile</nav>}
        sidebarNavigation={<nav aria-label="Điều hướng câu hỏi">Desktop</nav>}
      >
        <section>Câu hỏi đang làm</section>
      </QuizPlayerLayout>,
    );

    expect(screen.getAllByRole('navigation', { name: 'Điều hướng câu hỏi' })).toHaveLength(2);
    expect(screen.getByTestId('quiz-mobile-navigation')).toHaveClass('lg:hidden');
    expect(screen.getByTestId('quiz-sidebar-navigation')).toHaveClass('hidden', 'lg:block');
    expect(screen.getByTestId('quiz-player-main')).toHaveClass('min-h-0', 'bg-slate-50');
    expect(screen.getByTestId('quiz-player-main')).not.toHaveClass('min-h-screen');
    expect(screen.getByText('Câu hỏi đang làm')).toBeVisible();
  });
});
