import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import TopicCard from '../src/components/student/PracticeLibrary/TopicCard';

describe('practice topic cards', () => {
  it('renders a native topic button with precise available-question copy', () => {
    render(
      <TopicCard topic="#phep_nhan" count={32} isStarting={false} onClick={vi.fn()} />,
    );

    const button = screen.getByRole('button', {
      name: /Phep nhan.*32 câu có sẵn.*Luyện 10 câu/i,
    });
    expect(button).toHaveAttribute('type', 'button');
    expect(button).not.toBeDisabled();
  });

  it('disables only the topic being prepared', () => {
    render(
      <TopicCard topic="#phep_nhan" count={32} isStarting onClick={vi.fn()} />,
    );

    expect(screen.getByRole('button', { name: /Đang chuẩn bị/i })).toBeDisabled();
    expect(screen.getByRole('button')).toHaveAttribute('aria-busy', 'true');
  });

  it('starts practice from the native button action', () => {
    const onClick = vi.fn();
    render(
      <TopicCard topic="#phep_nhan" count={32} isStarting={false} onClick={onClick} />,
    );

    fireEvent.click(screen.getByRole('button'));
    expect(onClick).toHaveBeenCalledWith('#phep_nhan');
  });
});
