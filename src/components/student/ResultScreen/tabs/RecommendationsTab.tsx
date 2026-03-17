import React, { useState, useEffect, useMemo } from 'react';
import { Quiz, StudentResult } from '../../../../types';
import { getAIRecommendations, extractWrongAnswers, AIRecommendation } from '../../../../services/aiTutorService';
import { Lightbulb, BookOpen, Target, Heart, Sparkles, RefreshCw, AlertCircle } from 'lucide-react';
import { MathSpan } from '../../../common';

interface Props {
    quiz: Quiz;
    result: StudentResult;
    answers: Record<string, any>;
}

const RecommendationsTab: React.FC<Props> = ({ quiz, result, answers }) => {
    const [recommendation, setRecommendation] = useState<AIRecommendation | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Extract wrong answers using validationDetails from result
    const wrongAnswers = useMemo(() => extractWrongAnswers(quiz, answers, result), [quiz, answers, result]);

    // Fetch AI recommendations
    const fetchRecommendations = async () => {
        setIsLoading(true);
        setError(null);

        try {
            const aiResult = await getAIRecommendations(quiz, result, wrongAnswers);
            setRecommendation(aiResult);
        } catch (err) {
            setError('Không thể lấy gợi ý từ AI. Vui lòng thử lại.');
            console.error('Recommendation error:', err);
        } finally {
            setIsLoading(false);
        }
    };


    useEffect(() => {
        fetchRecommendations();
    }, []);

    // Loading state
    if (isLoading) {
        return (
            <div className="p-8 text-center">
                <div className="inline-flex items-center gap-3 bg-indigo-50 text-indigo-700 px-6 py-4 rounded-xl">
                    <Sparkles className="w-6 h-6 animate-pulse" />
                    <div>
                        <p className="font-bold">AI đang phân tích bài làm...</p>
                        <p className="text-sm opacity-80">Chờ một chút nhé!</p>
                    </div>
                </div>
            </div>
        );
    }

    // Error state
    if (error) {
        return (
            <div className="p-8 text-center">
                <div className="inline-flex flex-col items-center gap-4 bg-red-50 text-red-700 px-8 py-6 rounded-xl">
                    <AlertCircle className="w-10 h-10" />
                    <p>{error}</p>
                    <button
                        onClick={fetchRecommendations}
                        className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                    >
                        <RefreshCw className="w-4 h-4" />
                        Thử lại
                    </button>
                </div>
            </div>
        );
    }

    // Perfect score - no recommendations needed
    if (wrongAnswers.length === 0) {
        return (
            <div className="p-8">
                <div className="bg-gradient-to-r from-emerald-500 to-teal-500 rounded-2xl p-8 text-white text-center">
                    <div className="text-7xl mb-4">🏆</div>
                    <h2 className="text-3xl font-bold mb-3">Xuất sắc!</h2>
                    <p className="text-xl opacity-90 mb-6">
                        Em đã trả lời đúng tất cả các câu hỏi!
                    </p>
                    <div className="bg-white/20 backdrop-blur-sm rounded-xl p-4 inline-block">
                        <p className="text-lg">
                            🌟 Thầy cô rất tự hào về em. Hãy tiếp tục phát huy nhé!
                        </p>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="p-6 space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="p-3 bg-gradient-to-br from-purple-500 to-indigo-600 rounded-xl">
                        <Sparkles className="w-6 h-6 text-white" />
                    </div>
                    <div>
                        <h2 className="font-bold text-xl text-gray-800">Gợi ý ôn tập từ AI</h2>
                        <p className="text-sm text-gray-500">Dựa trên kết quả bài làm của em</p>
                    </div>
                </div>
                <button
                    onClick={fetchRecommendations}
                    className="flex items-center gap-2 px-4 py-2 text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                >
                    <RefreshCw className="w-4 h-4" />
                    Làm mới
                </button>
            </div>

            {recommendation && (
                <>
                    {/* Analysis Card */}
                    <div className="bg-gradient-to-br from-indigo-50 to-purple-50 rounded-xl p-6 border border-indigo-100">
                        <div className="flex items-start gap-4">
                            <div className="p-2 bg-indigo-100 rounded-lg">
                                <Target className="w-5 h-5 text-indigo-600" />
                            </div>
                            <div>
                                <h3 className="font-bold text-indigo-900 mb-2">📊 Nhận xét tổng quan</h3>
                                <p className="text-indigo-800 leading-relaxed">{recommendation.analysis}</p>
                            </div>
                        </div>
                    </div>

                    {/* Weak Topics */}
                    {recommendation.weakTopics.length > 0 && (
                        <div className="bg-amber-50 rounded-xl p-6 border border-amber-200">
                            <div className="flex items-center gap-3 mb-4">
                                <div className="p-2 bg-amber-100 rounded-lg">
                                    <BookOpen className="w-5 h-5 text-amber-600" />
                                </div>
                                <h3 className="font-bold text-amber-900">⚠️ Em cần ôn lại</h3>
                            </div>

                            <div className="flex flex-wrap gap-2">
                                {recommendation.weakTopics.map((topic, idx) => (
                                    <span
                                        key={idx}
                                        className="px-4 py-2 bg-amber-100 text-amber-800 rounded-full font-medium"
                                    >
                                        {topic}
                                    </span>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Study Tips */}
                    <div className="bg-white rounded-xl p-6 border border-gray-200 shadow-sm">
                        <div className="flex items-center gap-3 mb-4">
                            <div className="p-2 bg-green-100 rounded-lg">
                                <Lightbulb className="w-5 h-5 text-green-600" />
                            </div>
                            <h3 className="font-bold text-gray-800">💡 Gợi ý học tập</h3>
                        </div>

                        <div className="space-y-3">
                            {recommendation.studyTips.map((tip, idx) => (
                                <div
                                    key={idx}
                                    className="flex items-start gap-3 p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                                >
                                    <span className="flex-shrink-0 w-8 h-8 bg-green-500 text-white rounded-full flex items-center justify-center font-bold">
                                        {idx + 1}
                                    </span>
                                    <p className="text-gray-700 leading-relaxed">{tip}</p>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Encouragement */}
                    <div className="bg-gradient-to-r from-pink-500 via-rose-500 to-red-500 rounded-xl p-6 text-white">
                        <div className="flex items-center gap-4">
                            <div className="p-3 bg-white/20 rounded-full">
                                <Heart className="w-8 h-8" />
                            </div>
                            <div>
                                <h3 className="font-bold text-lg mb-1">💖 Lời nhắn từ thầy cô</h3>
                                <p className="text-white/90 text-lg">{recommendation.encouragement}</p>
                            </div>
                        </div>
                    </div>

                    {/* Wrong answers summary */}
                    <div className="bg-gray-50 rounded-xl p-6 border border-gray-200">
                        <h3 className="font-bold text-gray-800 mb-4 flex items-center gap-2">
                            📝 Các câu cần xem lại ({wrongAnswers.length} câu)
                        </h3>
                        <div className="space-y-2 max-h-60 overflow-y-auto">
                            {wrongAnswers.map((wa, idx) => (
                                <div key={idx} className="flex items-center gap-3 p-3 bg-white rounded-lg border border-gray-100">
                                    <span className="flex-shrink-0 w-8 h-8 bg-red-100 text-red-600 rounded-full flex items-center justify-center font-bold text-sm">
                                        {wa.questionNumber}
                                    </span>
                                    <div className="flex-1 min-w-0">
                                        <MathSpan content={wa.questionText} className="text-gray-700 text-sm truncate block" />
                                        <p className="text-xs text-gray-400">{wa.questionType}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                        <p className="mt-4 text-sm text-gray-500 text-center">
                            💡 Xem tab <strong>"Chi tiết"</strong> để xem giải thích cho từng câu
                        </p>
                    </div>
                </>
            )}
        </div>
    );
};

export default RecommendationsTab;
