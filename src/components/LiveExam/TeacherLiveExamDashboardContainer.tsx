/**
 * Container component for Teacher Live Exam Dashboard
 * Handles data fetching and state management
 */

import React, { useState, useEffect } from 'react';
import { ArrowLeft, Loader2, Play, Radio } from 'lucide-react';
import { TeacherLiveExamDashboard } from './TeacherLiveExamDashboard';
import { WaitingRoomTeacher } from './WaitingRoomTeacher';
import { ActiveExamMonitor } from './ActiveExamMonitor';
import * as liveExamService from '../../services/liveExamService';
import { useQuizStore } from '../../../stores/quizStore';
import { useAuthStore } from '../../../stores/authStore';
import { showSuccess, showError } from '../../utils/toast';
import type { LiveExamSession } from '../../types/liveExam.types';
import { useWaitingRoomChat } from '../../hooks/useWaitingRoomChat';

export const TeacherLiveExamDashboardContainer: React.FC = () => {
    const [sessions, setSessions] = useState<LiveExamSession[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [selectedSession, setSelectedSession] = useState<LiveExamSession | null>(null);
    const [isOpeningSession, setIsOpeningSession] = useState(false);
    
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
        await loadSessions();

        try {
            const createdSession = await liveExamService.getLiveExamSession(sessionId);
            setSelectedSession(createdSession);
        } catch (error) {
            console.error('Failed to load created session:', error);
        }
    };

    const handleSelectSession = (session: LiveExamSession) => {
        setSelectedSession(session);
    };

    const handleDeleteSession = async (session: LiveExamSession) => {
        try {
            await liveExamService.deleteLiveExamSession(session.id);
            setSessions((prev) => prev.filter((item) => item.id !== session.id));
            if (selectedSession?.id === session.id) {
                setSelectedSession(null);
            }
            showSuccess('Đã xóa phiên thi');
        } catch (error: any) {
            console.error('Failed to delete session:', error);
            showError(error?.message || 'Không thể xóa phiên thi');
        }
    };

    const handleBackToList = async () => {
        setSelectedSession(null);
        await loadSessions();
    };

    const handleOpenSession = async () => {
        if (!selectedSession) return;

        setIsOpeningSession(true);
        try {
            const updatedSession = await liveExamService.openSession(selectedSession.id);
            setSelectedSession(updatedSession);
            setSessions((prev) => prev.map((session) => (
                session.id === updatedSession.id ? updatedSession : session
            )));
            showSuccess('Đã mở phòng chờ cho học sinh tham gia');
        } catch (error: any) {
            console.error('Failed to open session:', error);
            showError(error?.message || 'Không thể mở phòng chờ');
        } finally {
            setIsOpeningSession(false);
        }
    };

    const handleExamStarted = async () => {
        if (!selectedSession) return;
        const updatedSession = await liveExamService.getLiveExamSession(selectedSession.id);
        setSelectedSession(updatedSession);
        setSessions((prev) => prev.map((session) => (
            session.id === updatedSession.id ? updatedSession : session
        )));
        showSuccess('Đã bắt đầu bài thi');
    };

    const handleExamEnded = async () => {
        if (!selectedSession) return;
        const updatedSession = await liveExamService.getLiveExamSession(selectedSession.id);
        setSelectedSession(updatedSession);
        setSessions((prev) => prev.map((session) => (
            session.id === updatedSession.id ? updatedSession : session
        )));
        showSuccess('Bài thi đã kết thúc');
    };

    // Convert quizzes to available format
    const availableQuizzes = quizzes.map(q => ({
        id: q.id,
        title: q.title,
        questionCount: q.questions.length,
    }));

    const selectedQuiz = selectedSession
        ? quizzes.find((quiz) => quiz.id === selectedSession.quizId)
        : null;
    const waitingRoomChat = useWaitingRoomChat({
        sessionId: selectedSession?.id || '',
        enabled: selectedSession?.status === 'waiting',
        asTeacher: true,
    });

    if (selectedSession?.status === 'scheduled') {
        return (
            <div className="min-h-screen bg-gradient-to-br from-indigo-50 to-purple-100 p-4">
                <div className="max-w-5xl mx-auto space-y-6">
                    <button
                        onClick={handleBackToList}
                        className="inline-flex items-center gap-2 px-4 py-2 bg-white text-slate-700 rounded-xl shadow hover:shadow-md"
                    >
                        <ArrowLeft size={18} />
                        Quay lại danh sách phiên thi
                    </button>

                    <div className="bg-white rounded-3xl shadow-xl p-8">
                        <div className="flex flex-col gap-6 md:flex-row md:items-start md:justify-between">
                            <div>
                                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-slate-100 text-slate-700 text-sm font-semibold mb-4">
                                    <Radio size={16} />
                                    Phiên đã lên lịch
                                </div>
                                <h1 className="text-3xl font-bold text-slate-800 mb-3">{selectedSession.title}</h1>
                                <div className="space-y-2 text-slate-600">
                                    <p>Thời gian làm bài: {selectedSession.duration} phút</p>
                                    <p>
                                        Bộ câu hỏi: {selectedQuiz?.title || selectedSession.quizId}
                                    </p>
                                    <p>
                                        Mã tham gia: <span className="font-mono font-bold text-blue-600">{liveExamService.formatAccessCode(selectedSession.accessCode)}</span>
                                    </p>
                                </div>
                            </div>

                            <div className="md:w-72">
                                <button
                                    onClick={handleOpenSession}
                                    disabled={isOpeningSession}
                                    className="w-full inline-flex items-center justify-center gap-3 px-6 py-4 bg-blue-600 text-white rounded-2xl font-bold text-lg hover:bg-blue-700 disabled:bg-slate-300"
                                >
                                    {isOpeningSession ? (
                                        <>
                                            <Loader2 className="animate-spin" size={22} />
                                            Đang mở phòng chờ...
                                        </>
                                    ) : (
                                        <>
                                            <Play size={22} />
                                            Mở phòng chờ
                                        </>
                                    )}
                                </button>
                                <p className="text-sm text-slate-500 mt-3">
                                    Mở phòng chờ để học sinh nhập mã và vào chờ trước khi bắt đầu bài thi.
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    if (selectedSession?.status === 'waiting') {
        return (
            <div>
                <div className="p-4 pb-0">
                    <button
                        onClick={handleBackToList}
                        className="inline-flex items-center gap-2 px-4 py-2 bg-white text-slate-700 rounded-xl shadow hover:shadow-md"
                    >
                        <ArrowLeft size={18} />
                        Quay lại danh sách phiên thi
                    </button>
                </div>
                <WaitingRoomTeacher
                    sessionId={selectedSession.id}
                    sessionTitle={selectedSession.title}
                    accessCode={selectedSession.accessCode}
                    duration={selectedSession.duration}
                    onExamStarted={handleExamStarted}
                />
            </div>
        );
    }

    if (selectedSession?.status === 'active' && selectedSession.endsAt) {
        return (
            <div>
                <div className="p-4 pb-0">
                    <button
                        onClick={handleBackToList}
                        className="inline-flex items-center gap-2 px-4 py-2 bg-white text-slate-700 rounded-xl shadow hover:shadow-md"
                    >
                        <ArrowLeft size={18} />
                        Quay lại danh sách phiên thi
                    </button>
                </div>
                <ActiveExamMonitor
                    sessionId={selectedSession.id}
                    sessionTitle={selectedSession.title}
                    endsAt={selectedSession.endsAt}
                    totalQuestions={selectedQuiz?.questions?.length || 0}
                    onExamEnded={handleExamEnded}
                />
            </div>
        );
    }

    return (
        <TeacherLiveExamDashboard
            sessions={sessions}
            availableQuizzes={availableQuizzes}
            isLoading={isLoading}
            onCreateSession={handleCreateSession}
            onSelectSession={handleSelectSession}
            onDeleteSession={handleDeleteSession}
            onRefresh={loadSessions}
            waitingRoomChat={selectedSession?.status === 'waiting' ? {
                sessionId: selectedSession.id,
                enabled: waitingRoomChat.chatEnabled,
                isLoading: waitingRoomChat.isLoading,
                isSending: waitingRoomChat.isSending,
                messages: waitingRoomChat.messages,
                onSendAnnouncement: async (content: string) => {
                    await waitingRoomChat.sendMessage(content);
                },
                onToggleChat: waitingRoomChat.toggleChat,
                onHideMessage: waitingRoomChat.hideMessage,
            } : null}
        />
    );
};

export default TeacherLiveExamDashboardContainer;
