import React, { useState, useMemo } from 'react';
import { Quiz, StudentResult } from '../../../../types';
import { CheckCircle, XCircle, Clock, Trophy, Target, Stethoscope } from 'lucide-react';
import DrOwlModal from '../DrOwlModal';
import { callApi } from '../../../../services/apiAdapter';
import { motion } from 'framer-motion';
import WeaknessSummaryCard from '../WeaknessSummaryCard';
import type { StudentWeaknessFocus } from '../studentWeaknessFocus';

interface Props {
    quiz: Quiz;
    result: StudentResult;
    answers: Record<string, any>;
    studentUsername?: string;
    onOpenRecommendations: (focus?: StudentWeaknessFocus | null) => void;
}

const OverviewTab: React.FC<Props> = ({ quiz, result, answers, studentUsername, onOpenRecommendations }) => {
    const [showDrOwl, setShowDrOwl] = useState(false);

    // Calculate additional stats using validationDetails as source of truth
    const stats = useMemo(() => {
        let correct = 0;
        let wrong = 0;
        let skipped = 0;

        quiz.questions.forEach(q => {
            const ans = answers[q.id];
            const vd = result.validationDetails?.find(d => d.questionId === q.id);

            if (!ans && ans !== false && ans !== 0) {
                skipped++;
            } else if (vd) {
                if (vd.isCorrect) correct++;
                else wrong++;
            } else {
                // Fallback if no validationDetails (should not happen for submitted results)
                const isCorrect = result.correctCount > 0; // Simple fallback
                if (isCorrect) correct++; else wrong++;
            }
        });

        return { correct, wrong, skipped };
    }, [quiz.questions, answers, result.validationDetails]);

    const { correct: correctCount, wrong: wrongCount, skipped: unansweredCount } = stats;
    const accuracy = Math.round((result.correctCount / result.totalQuestions) * 100);
    const scorePct = (result.correctCount / result.totalQuestions) * 100;

    // Compute wrong question IDs (only MCQ-type for now, AI works best with these)
    const wrongQuestionIds = useMemo(() => {
        return quiz.questions
            .filter(q => {
                const ans = answers[q.id];
                if (!ans && ans !== false && ans !== 0) return true; // unanswered = wrong context for AI

                const vd = result.validationDetails?.find(d => d.questionId === q.id);
                if (vd) return !vd.isCorrect;

                return false;
            })
            .map(q => q.id)
            .slice(0, 3);
    }, [quiz.questions, answers, result.validationDetails]);

    // Handle coin reward from DrOwl
    const handleRewardCoins = async (coins: number) => {
        if (!studentUsername) return;
        try {
            await callApi('update_game_state', {
                username: studentUsername,
                addCoins: coins,
                addExp: 20,
            });
        } catch (err) {
            console.error('[DrOwl] Failed to reward coins:', err);
        }
    };

    // Get teacher comment based on score
    const getTeacherComment = () => {
        if (result.score >= 9) {
            return {
                emoji: '🌟',
                title: 'Tuyệt vời!',
                message: 'Em nắm rất chắc kiến thức. Hãy tiếp tục phát huy nhé! Thầy cô rất tự hào về em.',
                color: 'from-emerald-500 to-teal-600'
            };
        }
        if (result.score >= 8) {
            return {
                emoji: '🎉',
                title: 'Giỏi lắm!',
                message: 'Em đã làm bài rất tốt. Chỉ cần cẩn thận hơn một chút nữa là hoàn hảo.',
                color: 'from-blue-500 to-indigo-600'
            };
        }
        if (result.score >= 7) {
            return {
                emoji: '👍',
                title: 'Khá lắm!',
                message: 'Em đã hiểu bài khá tốt. Hãy ôn lại những phần còn sai để tiến bộ hơn nhé.',
                color: 'from-cyan-500 to-blue-600'
            };
        }
        if (result.score >= 5) {
            return {
                emoji: '✨',
                title: 'Đạt yêu cầu!',
                message: 'Em cần ôn lại bài kỹ hơn để đạt điểm cao hơn vào lần sau. Cố gắng lên nhé!',
                color: 'from-amber-500 to-orange-600'
            };
        }
        return {
            emoji: '💪',
            title: 'Cần cố gắng thêm!',
            message: 'Đừng nản lòng nhé! Hãy xem lại sách giáo khoa và hỏi thầy cô những phần chưa hiểu.',
            color: 'from-orange-500 to-red-600'
        };
    };

    const comment = getTeacherComment();

    return (
        <div className="p-6 space-y-6">
            {/* Teacher Comment Card */}
            <div className={`relative overflow-hidden bg-gradient-to-r ${comment.color} rounded-2xl p-6 text-white`}>
                <div className="absolute top-0 right-0 text-8xl opacity-20 transform translate-x-4 -translate-y-4">
                    {comment.emoji}
                </div>
                <div className="relative">
                    <div className="flex items-center gap-3 mb-3">
                        <span className="text-3xl">{comment.emoji}</span>
                        <h3 className="text-xl font-bold">{comment.title}</h3>
                    </div>
                    <p className="text-white/90 leading-relaxed">{comment.message}</p>
                </div>
            </div>

            <WeaknessSummaryCard
                resultId={result.id}
                scorePct={scorePct}
                wrongQuestionIds={wrongQuestionIds}
                onOpenDrOwl={() => setShowDrOwl(true)}
                onOpenRecommendations={onOpenRecommendations}
            />

            {/* 🆘 DR. OWL EMERGENCY BUTTON — only when score < 50% and has wrong questions */}
            {scorePct < 50 && wrongQuestionIds.length >= 2 && (
                <motion.button
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => setShowDrOwl(true)}
                    className="w-full bg-gradient-to-r from-amber-400 via-orange-400 to-amber-500 hover:from-amber-500 hover:via-orange-500 hover:to-amber-600 text-white font-bold py-5 rounded-2xl shadow-lg shadow-amber-200 flex items-center justify-center gap-3 text-lg transition-colors relative overflow-hidden group"
                >
                    <div className="absolute -right-6 -top-6 w-24 h-24 bg-white/10 rounded-full group-hover:scale-150 transition-transform" />
                    <Stethoscope className="w-6 h-6" />
                    <span>🆘 Gọi Bác sĩ Cú Mèo hỗ trợ!</span>
                </motion.button>
            )}

            {/* Stats Grid - Bento style */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {/* Correct */}
                <div className="bg-gradient-to-br from-green-50 to-emerald-100 rounded-xl p-4 border border-green-200">
                    <div className="flex items-center gap-2 mb-2">
                        <div className="p-2 bg-green-500 rounded-lg">
                            <CheckCircle className="w-4 h-4 text-white" />
                        </div>
                        <span className="text-sm text-green-700 font-medium">Đúng</span>
                    </div>
                    <p className="text-3xl font-bold text-green-700">{result.correctCount}</p>
                    <p className="text-xs text-green-600">câu hỏi</p>
                </div>

                {/* Wrong */}
                <div className="bg-gradient-to-br from-red-50 to-rose-100 rounded-xl p-4 border border-red-200">
                    <div className="flex items-center gap-2 mb-2">
                        <div className="p-2 bg-red-500 rounded-lg">
                            <XCircle className="w-4 h-4 text-white" />
                        </div>
                        <span className="text-sm text-red-700 font-medium">Sai</span>
                    </div>
                    <p className="text-3xl font-bold text-red-700">{wrongCount}</p>
                    <p className="text-xs text-red-600">câu hỏi</p>
                </div>

                {/* Time */}
                <div className="bg-gradient-to-br from-blue-50 to-indigo-100 rounded-xl p-4 border border-blue-200">
                    <div className="flex items-center gap-2 mb-2">
                        <div className="p-2 bg-blue-500 rounded-lg">
                            <Clock className="w-4 h-4 text-white" />
                        </div>
                        <span className="text-sm text-blue-700 font-medium">Thời gian</span>
                    </div>
                    <p className="text-3xl font-bold text-blue-700">{result.timeTaken || 0}</p>
                    <p className="text-xs text-blue-600">phút</p>
                </div>

                {/* Accuracy */}
                <div className="bg-gradient-to-br from-purple-50 to-violet-100 rounded-xl p-4 border border-purple-200">
                    <div className="flex items-center gap-2 mb-2">
                        <div className="p-2 bg-purple-500 rounded-lg">
                            <Target className="w-4 h-4 text-white" />
                        </div>
                        <span className="text-sm text-purple-700 font-medium">Độ chính xác</span>
                    </div>
                    <p className="text-3xl font-bold text-purple-700">{accuracy}%</p>
                    <p className="text-xs text-purple-600">tỷ lệ đúng</p>
                </div>
            </div>

            {/* Quick Summary */}
            <div className="bg-gray-50 rounded-xl p-5 border border-gray-200">
                <h4 className="font-bold text-gray-800 mb-4 flex items-center gap-2">
                    <Trophy className="w-5 h-5 text-amber-500" />
                    Tóm tắt bài làm
                </h4>

                {/* Progress bars */}
                <div className="space-y-4">
                    {/* Correct progress */}
                    <div>
                        <div className="flex justify-between text-sm mb-1">
                            <span className="text-gray-600">Câu đúng</span>
                            <span className="font-medium text-green-600">{result.correctCount}/{result.totalQuestions}</span>
                        </div>
                        <div className="h-3 bg-gray-200 rounded-full overflow-hidden">
                            <div
                                className="h-full bg-gradient-to-r from-green-400 to-emerald-500 rounded-full transition-all duration-1000"
                                style={{ width: `${(result.correctCount / result.totalQuestions) * 100}%` }}
                            />
                        </div>
                    </div>

                    {/* Wrong progress */}
                    <div>
                        <div className="flex justify-between text-sm mb-1">
                            <span className="text-gray-600">Câu sai</span>
                            <span className="font-medium text-red-600">{wrongCount}/{result.totalQuestions}</span>
                        </div>
                        <div className="h-3 bg-gray-200 rounded-full overflow-hidden">
                            <div
                                className="h-full bg-gradient-to-r from-red-400 to-rose-500 rounded-full transition-all duration-1000"
                                style={{ width: `${(wrongCount / result.totalQuestions) * 100}%` }}
                            />
                        </div>
                    </div>

                    {unansweredCount > 0 && (
                        <div>
                            <div className="flex justify-between text-sm mb-1">
                                <span className="text-gray-600">Bỏ qua</span>
                                <span className="font-medium text-gray-500">{unansweredCount}/{result.totalQuestions}</span>
                            </div>
                            <div className="h-3 bg-gray-200 rounded-full overflow-hidden">
                                <div
                                    className="h-full bg-gradient-to-r from-gray-300 to-gray-400 rounded-full transition-all duration-1000"
                                    style={{ width: `${(unansweredCount / result.totalQuestions) * 100}%` }}
                                />
                            </div>
                        </div>
                    )}
                </div>
            </div>


            {/* Dr. Owl Modal */}
            <DrOwlModal
                isOpen={showDrOwl}
                onClose={() => setShowDrOwl(false)}
                quizId={quiz.id}
                wrongQuestionIds={wrongQuestionIds}
                studentUsername={studentUsername}
                onRewardCoins={handleRewardCoins}
            />
        </div>
    );
};

export default OverviewTab;

