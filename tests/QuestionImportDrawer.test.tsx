import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import QuestionImportDrawer from '../src/features/manual-quiz-workspace/components/QuestionImportDrawer';
import { useManualQuizWorkspaceStore } from '../src/features/manual-quiz-workspace/store/useManualQuizWorkspaceStore';

beforeEach(() => {
    useManualQuizWorkspaceStore.getState().reset();
    useManualQuizWorkspaceStore.getState().initializeFromSeed({
        title: 'Đề nhập',
        classLevel: '3',
        category: 'toan',
        timeLimit: 15,
        tags: [],
        requireCode: false,
        showOnHome: true,
    }, 'teacher-a');
});

describe('QuestionImportDrawer', () => {
    it('imports selected CSV questions and undoes exactly that transaction', async () => {
        render(<QuestionImportDrawer open onClose={vi.fn()} />);
        const csv = [
            'title,classLevel,category,timeLimit,tags,type,question,optionA,optionB,correctAnswer,difficulty,points',
            '"Đề Toán nhập từ Excel",4,toan,30,"phep-cong,on-tap",MCQ,"1 + 2 = ?",2,3,B,1,1',
        ].join('\n');
        const file = new File([csv], 'questions.csv', { type: 'text/csv' });

        fireEvent.change(screen.getByLabelText('Chọn tệp câu hỏi'), {
            target: { files: [file] },
        });

        expect(await screen.findByText('1 + 2 = ?')).toBeInTheDocument();
        fireEvent.click(screen.getByRole('button', { name: 'Nhập 1 câu đã chọn' }));

        await waitFor(() => {
            expect(useManualQuizWorkspaceStore.getState().envelope!.quiz.questions).toHaveLength(1);
        });
        expect(useManualQuizWorkspaceStore.getState().envelope!.quiz).toEqual(expect.objectContaining({
            title: 'Đề Toán nhập từ Excel',
            classLevel: '4',
            category: 'toan',
            timeLimit: 30,
            tags: ['phep-cong', 'on-tap'],
        }));
        expect(screen.getByRole('status')).toHaveTextContent('Đã nhập 1 câu');

        fireEvent.click(screen.getByRole('button', { name: 'Hoàn tác nhập câu hỏi' }));
        expect(useManualQuizWorkspaceStore.getState().envelope!.quiz.questions).toHaveLength(0);
        expect(useManualQuizWorkspaceStore.getState().envelope!.quiz).toEqual(expect.objectContaining({
            title: 'Đề nhập',
            classLevel: '3',
            timeLimit: 15,
            tags: [],
        }));
    });

    it('rejects unsupported files without changing the quiz', async () => {
        render(<QuestionImportDrawer open onClose={vi.fn()} />);
        const file = new File(['text'], 'questions.txt', { type: 'text/plain' });
        fireEvent.change(screen.getByLabelText('Chọn tệp câu hỏi'), {
            target: { files: [file] },
        });
        expect(await screen.findByRole('alert')).toHaveTextContent('Chỉ hỗ trợ tệp CSV, XLSX hoặc DOCX');
        expect(useManualQuizWorkspaceStore.getState().envelope!.quiz.questions).toHaveLength(0);
    });
});
