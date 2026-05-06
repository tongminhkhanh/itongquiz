/**
 * Container component for Teacher Live Exam Dashboard
 * Handles data fetching and state management
 */

import React, { useState, useEffect } from 'react';
import { TeacherLiveExamDashboard } from './TeacherLiveExamDashboard';
import * as liveExamService from '../../services/liveExamService';
import { useQuizStore } from '../../../stores/quizStore';
import { useAuthStore } from '../../../stores/authStore';
import { showSuccess, showError } from '../../utils/toast';
import type { LiveExamSession } from '../../types/liveExam.types';

export const TeacherLiveExamDashboardContainer: React.FC = () => {
    const [sessions, setSessions] = useState<LiveExamSession[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [selectedSession, setSelectedSession] = useState<LiveExamSession | null>(null);
    
    const quizzes = useQuizStore((state) => state.quizzes);
    const username = useAuthStore((state) => state.username);

    // Load sessions on mount
    useEffect(() => {
        loadSessions();
    }, []);

    const loadSessions = async () => {
        if (!username) {
            setSessions([]);
            setIsLoading(false);
            return;
        }
        
        setIsLoading(true);
        try {
            const data = await liveExamService.getTeacherSessions(username);
            setSessions(data);
        } catch (error: any) {
            console.error('Failed to load sessions:', error);
            
            // Handle 401 Unauthorized - don't show error, just return empty
            if (error?.message?.includes('401') || error?.message?.includes('Unauthorized')) {
                console.warn('Unauthorized access - user may need to login');
                setSessions([]);
            } else {
                showError('Không thể tải danh sách phiên thi');
            }
        } finally {
            setIsLoading(false);
        }
    };

    const handleCreateSession = async (sessionId: string, accessCode: string) => {
        showSuccess(`Đã tạo phiên thi với mã: ${accessCode}`);
        await loadSessions(); // Refresh list
    };

    const handleSelectSession = (session: LiveExamSession) => {
        setSelectedSession(session);
        // TODO: Navigate to session detail view or open modal
        console.log('Selected session:', session);
    };

    // Convert quizzes to available format
    const availableQuizzes = quizzes.map(q => ({
        id: q.id,
        title: q.title,
        questionCount: q.questions.length,
    }));

    return (
        <TeacherLiveExamDashboard
            sessions={sessions}
            availableQuizzes={availableQuizzes}
            isLoading={isLoading}
            onCreateSession={handleCreateSession}
            onSelectSession={handleSelectSession}
            onRefresh={loadSessions}
        />
    );
};

export default TeacherLiveExamDashboardContainer;
