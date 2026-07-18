import { useEffect, useState } from 'react';
import {
    consumeTeacherAiQuota,
    getTeacherAiQuota,
} from '../../../services/teacherAiQuotaService';
import { showError } from '../../../utils/toast';
import { DEFAULT_TEACHER_DAILY_AI_LIMIT } from '../domain/quizCreationDefaults';

interface UseTeacherAiQuotaOptions {
    isTeacherAccount: boolean;
    username: string | null;
}

export const useTeacherAiQuota = ({
    isTeacherAccount,
    username,
}: UseTeacherAiQuotaOptions) => {
    const [aiUsageCount, setAiUsageCount] = useState(0);
    const [dailyAiLimit, setDailyAiLimit] = useState(DEFAULT_TEACHER_DAILY_AI_LIMIT);

    const aiUsageRemaining = isTeacherAccount
        ? Math.max(0, dailyAiLimit - aiUsageCount)
        : Number.POSITIVE_INFINITY;
    const hasAiQuota = !isTeacherAccount || aiUsageRemaining > 0;

    const refresh = async () => {
        if (!isTeacherAccount || !username) {
            setAiUsageCount(0);
            setDailyAiLimit(DEFAULT_TEACHER_DAILY_AI_LIMIT);
            return;
        }

        try {
            const quota = await getTeacherAiQuota(username);
            setAiUsageCount(quota.usedCount || 0);
            setDailyAiLimit(quota.dailyLimit || DEFAULT_TEACHER_DAILY_AI_LIMIT);
        } catch (error) {
            console.warn('Khong the dong bo han muc AI tu server:', error);
        }
    };

    useEffect(() => {
        refresh();
    }, [isTeacherAccount, username]);

    const consume = async (): Promise<boolean> => {
        if (!isTeacherAccount) return true;

        const normalizedUsername = String(username || '').trim();
        if (!normalizedUsername) {
            showError('Khong xac dinh duoc tai khoan giao vien de kiem tra han muc AI.');
            return false;
        }

        try {
            const quota = await consumeTeacherAiQuota(normalizedUsername);
            setAiUsageCount(quota.usedCount || 0);
            setDailyAiLimit(quota.dailyLimit || DEFAULT_TEACHER_DAILY_AI_LIMIT);
            return true;
        } catch (error: unknown) {
            await refresh();
            const normalizedError = error instanceof Error ? error : new Error(String(error));
            showError(normalizedError.message || 'Ban da dung het luot tao de AI hom nay.');
            return false;
        }
    };

    return {
        aiUsageCount,
        aiUsageRemaining,
        hasAiQuota,
        dailyAiLimit,
        consume,
    };
};
