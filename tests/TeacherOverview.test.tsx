import React from 'react';
import { fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import OverviewTab from '../src/components/TeacherDashboard/OverviewTab';
import { useAuthStore } from '../stores/authStore';
import { useQuizStore } from '../stores/quizStore';
import { useTeacherDashboardUIStore } from '../src/stores/useTeacherDashboardUIStore';

const makeResult = (
    id: string,
    studentName: string,
    studentClass: string,
    score: number,
    submittedAt: string,
) => ({
    id,
    quizId: 'quiz-1',
    quizTitle: 'Bài kiểm tra',
    studentName,
    studentClass,
    score,
    correctCount: 8,
    totalQuestions: 10,
    timeTaken: 10,
    submittedAt,
    answers: {},
});

describe('TeacherDashboard OverviewTab', () => {
    beforeEach(() => {
        vi.useFakeTimers();
        vi.setSystemTime(new Date(2026, 6, 17, 10, 0, 0));
        useAuthStore.setState({
            isLoggedIn: true,
            username: 'teacher',
            teacherName: 'Cô An',
            isAdmin: false,
            teacherClass: '3A',
        });
        useTeacherDashboardUIStore.setState({ activeTab: 'overview' });
        useQuizStore.setState({
            quizzes: [
                {
                    id: 'quiz-3a',
                    title: 'Đề lớp 3A',
                    classLevel: 'Lớp 3-A',
                    questions: [],
                    timeLimit: 30,
                    createdAt: new Date(2026, 6, 17, 7, 0, 0).toISOString(),
                },
                {
                    id: 'quiz-13a',
                    title: 'Đề lớp 13A',
                    classLevel: '13A',
                    questions: [],
                    timeLimit: 30,
                    createdAt: new Date(2026, 6, 16, 7, 0, 0).toISOString(),
                },
            ] as any,
            results: [
                makeResult('today-3a', 'An', '3A', 8, new Date(2026, 6, 17, 9, 0, 0).toISOString()),
                makeResult('yesterday-3a', 'Bình', 'lớp 3-a', 6, new Date(2026, 6, 16, 9, 0, 0).toISOString()),
                makeResult('today-13a', 'Chi', '13A', 10, new Date(2026, 6, 17, 8, 0, 0).toISOString()),
            ] as any,
            error: null,
        });
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    it('uses exact normalized class matching and only shows submissions from today', () => {
        render(
            <OverviewTab
                resultsLoadState="success"
                onRetryResults={vi.fn()}
            />,
        );

        const quizCard = screen.getByText('Đề kiểm tra').parentElement;
        const resultCard = screen.getByText('Số bài đã nộp').parentElement;
        const studentCard = screen.getByText('Học sinh tham gia').parentElement;

        expect(quizCard && within(quizCard).getByText('1')).toBeTruthy();
        expect(resultCard && within(resultCard).getByText('2')).toBeTruthy();
        expect(studentCard && within(studentCard).getByText('2')).toBeTruthy();
        expect(screen.getByRole('heading', { name: 'Tình hình điểm số' })).toBeTruthy();
        const recentSubmission = screen.getByText('vừa nộp').parentElement?.textContent || '';
        expect(recentSubmission).toContain('Bài kiểm tra');
        expect(document.body.textContent).not.toContain('Bình');
        expect(document.body.textContent).not.toContain('Chi');
    });

    it.each([
        ['Tạo đề mới', 'create'],
        ['Giao bài', 'assignments'],
        ['Thi trực tiếp', 'live-exam'],
        ['Xem kết quả', 'results'],
        ['Quản lý lớp', 'classes'],
        ['Cấp chứng nhận', 'certificates'],
    ] as const)('opens %s from the quick action area', (label, expectedTab) => {
        render(
            <OverviewTab
                resultsLoadState="success"
                onRetryResults={vi.fn()}
            />,
        );

        const quickActionsHeading = screen.getByRole('heading', { name: 'Bạn muốn làm gì?' });
        const quickActionsSection = quickActionsHeading.closest('section');
        expect(quickActionsSection).toBeTruthy();

        fireEvent.click(within(quickActionsSection as HTMLElement).getByRole('button', { name: new RegExp(label, 'i') }));
        expect(useTeacherDashboardUIStore.getState().activeTab).toBe(expectedTab);
    });

    it('shows recent quizzes and opens the quiz management tab', () => {
        render(
            <OverviewTab
                resultsLoadState="success"
                onRetryResults={vi.fn()}
            />,
        );

        expect(screen.getByRole('heading', { name: 'Đề kiểm tra gần đây' })).toBeTruthy();
        expect(screen.getAllByText('Đề lớp 3A').length).toBeGreaterThan(0);

        const recentQuizzesHeading = screen.getByRole('heading', { name: 'Đề kiểm tra gần đây' });
        const recentQuizzesSection = recentQuizzesHeading.closest('section');
        expect(recentQuizzesSection).toBeTruthy();

        fireEvent.click(within(recentQuizzesSection as HTMLElement).getAllByRole('button', { name: /^Quản lý/i })[0]);
        expect(useTeacherDashboardUIStore.getState().activeTab).toBe('manage');
    });

    it('shows a retry action when loading results fails', () => {
        const onRetryResults = vi.fn();
        render(
            <OverviewTab
                resultsLoadState="error"
                resultsError="Phiên đăng nhập đã hết hạn"
                onRetryResults={onRetryResults}
            />,
        );

        expect(screen.getByRole('alert').textContent).toContain('Phiên đăng nhập đã hết hạn');
        fireEvent.click(screen.getByRole('button', { name: 'Thử lại' }));
        expect(onRetryResults).toHaveBeenCalledTimes(1);
    });
});
