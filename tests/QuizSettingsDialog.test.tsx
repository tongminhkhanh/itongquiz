import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import QuizSettingsDialog from '../src/features/manual-quiz-workspace/components/QuizSettingsDialog';
import type { ManualQuiz } from '../src/features/manual-quiz-workspace/types/manualQuizWorkspace.types';

const quiz = { id: 'q', title: 'Đề', classLevel: '3A', category: 'toan', timeLimit: 15, questions: [], createdAt: new Date().toISOString() } as ManualQuiz;

describe('QuizSettingsDialog', () => {
    it('edits class and time atomically', () => {
        const onSave = vi.fn();
        render(<QuizSettingsDialog open quiz={quiz} onClose={vi.fn()} onSave={onSave} />);
        fireEvent.change(screen.getByRole('combobox'), { target: { value: '4' } });
        fireEvent.change(screen.getByLabelText('Thời gian làm bài'), { target: { value: '45' } });
        fireEvent.click(screen.getByRole('button', { name: 'Lưu thiết lập' }));
        expect(onSave).toHaveBeenCalledWith({ classLevel: '4', timeLimit: 45 });
    });

    it('blocks invalid time', () => {
        const onSave = vi.fn();
        render(<QuizSettingsDialog open quiz={quiz} onClose={vi.fn()} onSave={onSave} />);
        fireEvent.change(screen.getByLabelText('Thời gian làm bài'), { target: { value: '0' } });
        fireEvent.click(screen.getByRole('button', { name: 'Lưu thiết lập' }));
        expect(onSave).not.toHaveBeenCalled();
        expect(screen.getByRole('alert')).toBeInTheDocument();
    });
});
