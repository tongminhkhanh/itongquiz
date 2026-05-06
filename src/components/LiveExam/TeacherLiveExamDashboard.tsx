/**
 * Teacher Live Exam Dashboard Component
 * 
 * Main dashboard for teachers to manage live exam sessions.
 * List all sessions, create new, filter by status.
 */

import React, { useState } from 'react';
import { Plus, Clock, Users, Filter, Loader2, Trash2 } from 'lucide-react';
import { showConfirm } from '../../utils/toast';
import { CreateLiveExamModal } from './CreateLiveExamModal';
import { getStatusLabel, getStatusColor, formatAccessCode } from '../../services/liveExamService';
import type { LiveExamSession } from '../../types/liveExam.types';

interface TeacherLiveExamDashboardProps {
    sessions: LiveExamSession[];
    availableQuizzes: Array<{ id: string; title: string; questionCount: number }>;
    isLoading?: boolean;
    onCreateSession: (sessionId: string, accessCode: string) => void;
    onSelectSession: (session: LiveExamSession) => void;
    onDeleteSession?: (session: LiveExamSession) => Promise<void>;
    onRefresh?: () => void;
}

export const TeacherLiveExamDashboard: React.FC<TeacherLiveExamDashboardProps> = ({
    sessions,
    availableQuizzes,
    isLoading = false,
    onCreateSession,
    onSelectSession,
    onDeleteSession,
    onRefresh,
}) => {
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [statusFilter, setStatusFilter] = useState<string>('all');

    // Filter sessions
    const filteredSessions = statusFilter === 'all'
        ? sessions
        : sessions.filter(s => s.status === statusFilter);

    // Count by status
    const statusCounts = {
        all: sessions.length,
        waiting: sessions.filter(s => s.status === 'waiting').length,
        active: sessions.filter(s => s.status === 'active').length,
        closed: sessions.filter(s => s.status === 'closed').length,
    };

    const getStatusBadgeClass = (status: string) => {
        const color = getStatusColor(status);
        const colorMap: Record<string, string> = {
            gray: 'bg-slate-100 text-slate-700',
            yellow: 'bg-yellow-100 text-yellow-700',
            green: 'bg-green-100 text-green-700',
            blue: 'bg-blue-100 text-blue-700',
            purple: 'bg-purple-100 text-purple-700',
        };
        return colorMap[color] || colorMap.gray;
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-indigo-50 to-purple-100 p-4">
            <div className="max-w-7xl mx-auto">
                {/* Header */}
                <div className="bg-white rounded-2xl shadow-xl p-6 mb-6">
                    <div className="flex items-center justify-between mb-4">
                        <div>
                            <h1 className="text-3xl font-bold text-slate-800 mb-2">
                                Thi Trực Tiếp
                            </h1>
                            <p className="text-slate-600">
                                Quản lý các phiên thi trực tuyến đồng bộ
                            </p>
                        </div>
                        <button
                            onClick={() => setShowCreateModal(true)}
                            className="px-6 py-3 bg-blue-600 text-white rounded-xl font-semibold hover:bg-blue-700 flex items-center gap-2 shadow-lg"
                        >
                            <Plus size={20} />
                            Tạo Phiên Thi Mới
                        </button>
                    </div>

                    {/* Stats */}
                    <div className="grid grid-cols-4 gap-4">
                        <div className="bg-slate-50 rounded-lg p-4">
                            <div className="text-2xl font-bold text-slate-800">{statusCounts.all}</div>
                            <div className="text-sm text-slate-600">Tổng số phiên</div>
                        </div>
                        <div className="bg-yellow-50 rounded-lg p-4">
                            <div className="text-2xl font-bold text-yellow-600">{statusCounts.waiting}</div>
                            <div className="text-sm text-yellow-700">Đang chờ</div>
                        </div>
                        <div className="bg-green-50 rounded-lg p-4">
                            <div className="text-2xl font-bold text-green-600">{statusCounts.active}</div>
                            <div className="text-sm text-green-700">Đang thi</div>
                        </div>
                        <div className="bg-purple-50 rounded-lg p-4">
                            <div className="text-2xl font-bold text-purple-600">{statusCounts.closed}</div>
                            <div className="text-sm text-purple-700">Đã kết thúc</div>
                        </div>
                    </div>
                </div>

                {/* Filters */}
                <div className="bg-white rounded-xl shadow-lg p-4 mb-6">
                    <div className="flex items-center gap-3">
                        <Filter size={20} className="text-slate-600" />
                        <span className="font-semibold text-slate-700">Lọc:</span>
                        <div className="flex gap-2">
                            {[
                                { value: 'all', label: 'Tất cả' },
                                { value: 'waiting', label: 'Đang chờ' },
                                { value: 'active', label: 'Đang thi' },
                                { value: 'closed', label: 'Đã kết thúc' },
                            ].map((filter) => (
                                <button
                                    key={filter.value}
                                    onClick={() => setStatusFilter(filter.value)}
                                    className={`px-4 py-2 rounded-lg font-medium transition-all ${
                                        statusFilter === filter.value
                                            ? 'bg-blue-600 text-white'
                                            : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                                    }`}
                                >
                                    {filter.label}
                                </button>
                            ))}
                        </div>
                        {onRefresh && (
                            <button
                                onClick={onRefresh}
                                disabled={isLoading}
                                className="ml-auto px-4 py-2 bg-slate-100 text-slate-600 rounded-lg hover:bg-slate-200 disabled:opacity-50"
                            >
                                {isLoading ? <Loader2 className="animate-spin" size={20} /> : '🔄 Làm mới'}
                            </button>
                        )}
                    </div>
                </div>

                {/* Sessions List */}
                {isLoading && sessions.length === 0 ? (
                    <div className="bg-white rounded-2xl shadow-xl p-12 text-center">
                        <Loader2 className="w-12 h-12 animate-spin text-blue-600 mx-auto mb-4" />
                        <p className="text-slate-600">Đang tải...</p>
                    </div>
                ) : filteredSessions.length === 0 ? (
                    <div className="bg-white rounded-2xl shadow-xl p-12 text-center">
                        <div className="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
                            <span className="text-4xl">📝</span>
                        </div>
                        <h3 className="text-xl font-bold text-slate-800 mb-2">
                            {statusFilter === 'all' ? 'Chưa có phiên thi nào' : 'Không tìm thấy phiên thi'}
                        </h3>
                        <p className="text-slate-600 mb-6">
                            {statusFilter === 'all' 
                                ? 'Tạo phiên thi đầu tiên để bắt đầu'
                                : 'Thử thay đổi bộ lọc'}
                        </p>
                        {statusFilter === 'all' && (
                            <button
                                onClick={() => setShowCreateModal(true)}
                                className="px-6 py-3 bg-blue-600 text-white rounded-xl font-semibold hover:bg-blue-700 inline-flex items-center gap-2"
                            >
                                <Plus size={20} />
                                Tạo Phiên Thi Mới
                            </button>
                        )}
                    </div>
                ) : (
                    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {filteredSessions.map((session) => (
                            <div
                                key={session.id}
                                onClick={() => onSelectSession(session)}
                                className="bg-white rounded-xl shadow-lg p-6 hover:shadow-2xl transition-all cursor-pointer border-2 border-transparent hover:border-blue-300"
                            >
                                {/* Status Badge */}
                                <div className="flex items-center justify-between mb-4">
                                    <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusBadgeClass(session.status)}`}>
                                        {getStatusLabel(session.status)}
                                    </span>
                                    {session.accessCode && session.status === 'waiting' && (
                                        <span className="text-xs font-mono bg-blue-50 text-blue-600 px-2 py-1 rounded">
                                            {formatAccessCode(session.accessCode)}
                                        </span>
                                    )}
                                </div>

                                {/* Title */}
                                <h3 className="text-lg font-bold text-slate-800 mb-2 line-clamp-2">
                                    {session.title}
                                </h3>

                                {/* Info */}
                                <div className="space-y-2 mb-4">
                                    <div className="flex items-center gap-2 text-sm text-slate-600">
                                        <Clock size={16} />
                                        <span>{session.duration} phút</span>
                                    </div>
                                    {session.startedAt && (
                                        <div className="flex items-center gap-2 text-sm text-slate-600">
                                            <Users size={16} />
                                            <span>Bắt đầu: {new Date(session.startedAt).toLocaleString('vi-VN')}</span>
                                        </div>
                                    )}
                                </div>

                                {/* Footer */}
                                <div className="pt-4 border-t border-slate-100">
                                    <div className="flex items-center justify-between gap-3">
                                        <div className="text-xs text-slate-500">
                                            Tạo: {new Date(session.createdAt).toLocaleDateString('vi-VN')}
                                        </div>
                                        {onDeleteSession && (
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    showConfirm({
                                                        message: `Xóa phiên thi "${session.title}"? Tất cả dữ liệu tham gia và kết quả của phiên này sẽ bị xóa.`,
                                                        confirmLabel: 'Xóa phiên',
                                                        destructive: true,
                                                        onConfirm: async () => {
                                                            await onDeleteSession(session);
                                                        },
                                                    });
                                                }}
                                                className="inline-flex items-center gap-1 rounded-lg border border-red-200 px-3 py-1.5 text-xs font-semibold text-red-600 hover:bg-red-50"
                                            >
                                                <Trash2 size={14} />
                                                Xóa
                                            </button>
                                        )}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Create Modal */}
            <CreateLiveExamModal
                isOpen={showCreateModal}
                onClose={() => setShowCreateModal(false)}
                onCreateSuccess={onCreateSession}
                availableQuizzes={availableQuizzes}
            />
        </div>
    );
};

export default TeacherLiveExamDashboard;
