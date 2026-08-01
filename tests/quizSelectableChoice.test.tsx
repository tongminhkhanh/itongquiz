import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import SelectableChoice from '../src/features/quiz-player/components/QuestionRenderer/atoms/SelectableChoice';

describe('SelectableChoice', () => {
  it('exposes a calm selected state and calls the supplied handler', () => {
    const onClick = vi.fn();
    render(
      <SelectableChoice selected onClick={onClick}>
        Đáp án B
      </SelectableChoice>,
    );

    const choice = screen.getByRole('button', { name: 'Đáp án B' });
    expect(choice).toHaveAttribute('aria-pressed', 'true');
    expect(choice).toHaveClass('bg-emerald-50', 'text-emerald-950', 'shadow-sm');
    expect(choice).not.toHaveClass('bg-white', 'text-slate-700');
    expect(choice).toHaveClass('min-h-11', 'min-w-11');
    expect(choice).toHaveClass('active:scale-[0.985]', 'motion-reduce:transform-none');

    fireEvent.click(choice);
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it('keeps an unselected choice neutral and keyboard visible', () => {
    render(<SelectableChoice selected={false}>Đáp án A</SelectableChoice>);

    expect(screen.getByRole('button', { name: 'Đáp án A' })).toHaveClass(
      'min-h-11',
      'min-w-11',
      'border-transparent',
      'bg-white',
      'focus-visible:ring-2',
      'focus-visible:ring-sky-500',
    );
  });
});
