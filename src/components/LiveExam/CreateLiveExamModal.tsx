/**
 * Create Live Exam Modal
 * 
 * Teacher creates a new live exam session.
 * Selects quiz, sets duration and settings.
 */

import React, { useState } from 'react';
import { X, Loader2, Plus, Copy, Check } from 'lucide-react';
import { createLiveExam, formatAccessCode } from '../../services/liveExamService';
import type { CreateLiveExamRequest, LiveExamSettings } from '../../types/liveExam.types';

interface CreateLiveExamModalProps {
    isOpen: boolean;
    onClose: () => void;
    onCreateSuccess: (sessionId: string, accessCode: string) => void;
    availableQuizzes: Array<{ id: string; title: string; questionCount: number }>;
}

export const CreateLiveExamModal: React.FC<CreateLiveExamModalProps> = ({
    isOpen,
    onClose,
    onCreateSuccess,
    availableQuizzes,
}) => {
    const [step, setStep] = useState<'form' | 'success'>('form');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');
    const [copied, setCopied] = useState(false);
    
    // Form state
    const [title, setTitle] = useState('');
    const [quizId, setQuizId] = useState('');
    const [duration, setDuration] = useState(30);
    const [settings, setSettings] = useState<LiveExamSettings>({
        randomizeAnswers: true,
        showLeaderboard: true,
        allowLateJoin: false,
    });
    
    // Success state
    const [createdSession, setCreatedSession] = useState<{ id: string; accessCode: string } | null>(null);

    const handleCreate = async () => {
        const normalizedTitle = title.trim();

        if (!normalizedTitle || !quizId) {
            setError('Vui lòng điền đầy đủ thông tin');
            return;
        }

        if (normalizedTitle.length < 3) {
            setError('Tên phiên thi phải có ít nhất 3 ký tự');
            return;
        }

        if (duration < 5 || duration > 180) {
            setError('Thời gian làm bài phải từ 5 đến 180 phút');
            return;
        }

        setIsLoading(true);
        setError('');

        try {
            const data: CreateLiveExamRequest = {
                title: normalizedTitle,
                quizId,
                duration,
                settings,
            };

            const session = await createLiveExam(data);
            setCreatedSession({ id: session.id, accessCode: session.accessCode });
            setStep('success');
        } catch (err: any) {
            setError(err.message || 'Không thể tạo phiên thi');
        } finally {
            setIsLoading(false);
        }
    };

    const handleCopyCode = () => {
        if (createdSession) {
            navigator.clipboard.writeText(createdSession.accessCode);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        }
    };

    const handleDone = () => {
        if (createdSession) {
            onCreateSuccess(createdSession.id, createdSession.accessCode);
        }
        handleClose();
    };

    const handleClose = () => {
        setStep('form');
        setTitle('');
        setQuizId('');
        setDuration(30);
        setSettings({
            randomizeAnswers: true,
            showLeaderboard: true,
            allowLateJoin: false,
        });
        setCreatedSession(null);
        setError('');
        onClose();
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
                {step === 'form' ? (
                    <div className="p-6">
                        {/* Header */}
                        <div className="flex justify-between items-center mb-6">
                            <h2 className="text-2xl font-bold text-slate-800">
                                Tạo Phiên Thi Trực Tiếp
                            </h2>
                            <button onClick={handleClose} className="text-slate-400 hover:text-slate-600">
                                <X size={24} />
                            </button>
                        </div>

                        {/* Form */}
                        <div className="space-y-4">
                            {/* Title */}
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-2">
                                    Tên Phiên Thi *
                                </label>
                                <input
                                    type="text"
                                    value={title}
                                    onChange={(e) => setTitle(e.target.value)}
                                    placeholder="Ví dụ: Kiểm tra Toán Giữa Kỳ"
                                    className="w-full px-4 py-2 border-2 border-slate-300 rounded-lg focus:border-blue-500 focus:outline-none"
                                    minLength={3}
                                    disabled={isLoading}
                                />
                            </div>

                            {/* Quiz Selection */}
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-2">
                                    Chọn Đề Thi *
                                </label>
                                <select
                                    value={quizId}
                                    onChange={(e) => setQuizId(e.target.value)}
                                    className="w-full px-4 py-2 border-2 border-slate-300 rounded-lg focus:border-blue-500 focus:outline-none"
                                    disabled={isLoading}
                                >
                                    <option value="">-- Chọn đề thi --</option>
                                    {availableQuizzes.map((quiz) => (
                                        <option key={quiz.id} value={quiz.id}>
                                            {quiz.title} ({quiz.questionCount} câu)
                                        </option>
                                    ))}
                                </select>
                            </div>

                            {/* Duration */}
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-2">
                                    Thời Gian (phút) *
                                </label>
                                <input
                                    type="number"
                                    value={duration}
                                    onChange={(e) => setDuration(Number(e.target.value))}
                                    min={5}
                                    max={180}
                                    className="w-full px-4 py-2 border-2 border-slate-300 rounded-lg focus:border-blue-500 focus:outline-none"
                                    disabled={isLoading}
                                />
                            </div>

                            {/* Settings */}
                            <div className="bg-slate-50 rounded-lg p-4 space-y-3">
                                <h3 className="font-semibold text-slate-800 mb-2">Cài Đặt</h3>
                                
                                <label className="flex items-center gap-3 cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={settings.randomizeAnswers}
                                        onChange={(e) => setSettings({ ...settings, randomizeAnswers: e.target.checked })}
                                        className="w-5 h-5"
                                        disabled={isLoading}
                                    />
                                    <span className="text-sm text-slate-700">Xáo trộn đáp án</span>
                                </label>

                                <label className="flex items-center gap-3 cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={settings.showLeaderboard}
                                        onChange={(e) => setSettings({ ...settings, showLeaderboard: e.target.checked })}
                                        className="w-5 h-5"
                                        disabled={isLoading}
                                    />
                                    <span className="text-sm text-slate-700">Hiển thị bảng xếp hạng</span>
                                </label>

                                <label className="flex items-center gap-3 cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={settings.allowLateJoin}
                                        onChange={(e) => setSettings({ ...settings, allowLateJoin: e.target.checked })}
                                        className="w-5 h-5"
                                        disabled={isLoading}
                                    />
                                    <span className="text-sm text-slate-700">Cho phép tham gia muộn</span>
                                </label>
                            </div>

                            {/* Error */}
                            {error && (
                                <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm">
                                    {error}
                                </div>
                            )}

                            {/* Buttons */}
                            <div className="flex gap-3 pt-4">
                                <button
                                    onClick={handleClose}
                                    disabled={isLoading}
                                    className="flex-1 py-3 border-2 border-slate-300 text-slate-700 rounded-lg font-semibold hover:bg-slate-50 disabled:opacity-50"
                                >
                                    Hủy
                                </button>
                                <button
                                    onClick={handleCreate}
                                    disabled={isLoading || title.trim().length < 3 || !quizId || duration < 5 || duration > 180}
                                    className="flex-1 py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 disabled:bg-slate-300 flex items-center justify-center gap-2"
                                >
                                    {isLoading ? (
                                        <>
                                            <Loader2 className="animate-spin" size={20} />
                                            Đang tạo...
                                        </>
                                    ) : (
                                        <>
                                            <Plus size={20} />
                                            Tạo Phiên Thi
                                        </>
                                    )}
                                </button>
                            </div>
                        </div>
                    </div>
                ) : (
                    <div className="p-6">
                        {/* Success */}
                        <div className="text-center">
                            <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                                <Check className="w-10 h-10 text-green-600" />
                            </div>
                            <h2 className="text-2xl font-bold text-slate-800 mb-2">
                                Tạo Thành Công!
                            </h2>
                            <p className="text-slate-600 mb-6">
                                Phiên thi đã được tạo. Chia sẻ mã này với học sinh.
                            </p>

                            {/* Access Code */}
                            <div className="bg-blue-50 border-2 border-blue-200 rounded-xl p-6 mb-6">
                                <p className="text-sm text-blue-800 mb-2">Mã Tham Gia</p>
                                <div className="text-5xl font-bold text-blue-600 tracking-widest mb-4">
                                    {createdSession && formatAccessCode(createdSession.accessCode)}
                                </div>
                                <button
                                    onClick={handleCopyCode}
                                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2 mx-auto"
                                >
                                    {copied ? (
                                        <>
                                            <Check size={16} />
                                            Đã sao chép!
                                        </>
                                    ) : (
                                        <>
                                            <Copy size={16} />
                                            Sao chép mã
                                        </>
                                    )}
                                </button>
                            </div>

                            <button
                                onClick={handleDone}
                                className="w-full py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700"
                            >
                                Tiếp Tục
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};
