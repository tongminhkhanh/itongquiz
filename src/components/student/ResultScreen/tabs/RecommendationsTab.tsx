import React, { useEffect, useMemo, useState } from 'react';
import { AlertCircle, BookOpen, Heart, Lightbulb, RefreshCw, Sparkles, Target } from 'lucide-react';
import { Quiz, StudentResult } from '../../../../types';
import { getAIRecommendations, extractWrongAnswers, AIRecommendation } from '../../../../services/aiTutorService';
import { MathSpan } from '../../../common';
import type { StudentWeaknessFocus } from '../studentWeaknessFocus';

interface Props {
    quiz: Quiz;
    result: StudentResult;
    answers: Record<string, any>;
    focus?: StudentWeaknessFocus | null;
}

const RecommendationsTab: React.FC<Props> = ({ quiz, result, answers, focus }) => {
    const [recommendation, setRecommendation] = useState<AIRecommendation | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const wrongAnswers = useMemo(() => extractWrongAnswers(quiz, answers, result), [quiz, answers, result]);

    const fetchRecommendations = async () => {
        setIsLoading(true);
        setError(null);

        try {
            const aiResult = await getAIRecommendations(quiz, result, wrongAnswers);
            setRecommendation(aiResult);
        } catch (err) {
            setError('Khong the lay goi y tu AI. Vui long thu lai.');
            console.error('Recommendation error:', err);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchRecommendations();
    }, []);

    const focusCard = focus ? (
        <div className="rounded-2xl border border-sky-100 bg-gradient-to-r from-sky-50 via-white to-indigo-50 p-5">
            <div className="flex items-start gap-4">
                <div className="rounded-2xl bg-sky-100 p-3">
                    <Target className="w-5 h-5 text-sky-700" />
                </div>
                <div className="flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                        <h3 className="text-lg font-bold text-slate-800">{focus.recommendationTitle}</h3>
                        <span className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-black uppercase tracking-wide ${
                            focus.status === 'weak'
                                ? 'bg-red-100 text-red-700'
                                : 'bg-amber-100 text-amber-700'
                        }`}>
                            Uu tien tu bai vua lam
                        </span>
                    </div>
                    <p className="mt-2 text-sm leading-relaxed text-slate-600">{focus.recommendationSummary}</p>
                    <div className="mt-4 grid gap-3 sm:grid-cols-2">
                        <div className="rounded-xl border border-slate-100 bg-white/90 p-4">
                            <p className="text-xs font-black uppercase tracking-wide text-slate-500">Dang can on</p>
                            <p className="mt-1 text-base font-bold text-slate-800">{focus.title}</p>
                            <p className="mt-1 text-sm text-slate-500">{focus.subjectLabel}</p>
                        </div>
                        <div className="rounded-xl border border-slate-100 bg-white/90 p-4">
                            <p className="text-xs font-black uppercase tracking-wide text-slate-500">{focus.nextStepLabel}</p>
                            <p className="mt-1 text-sm leading-relaxed text-slate-600">{focus.nextStepHint}</p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    ) : null;

    if (isLoading) {
        return (
            <div className="p-8 text-center">
                <div className="inline-flex items-center gap-3 rounded-xl bg-indigo-50 px-6 py-4 text-indigo-700">
                    <Sparkles className="w-6 h-6 animate-pulse" />
                    <div>
                        <p className="font-bold">
                            {focus ? `AI dang chuan bi goi y cho ${focus.title}...` : 'AI dang phan tich bai lam...'}
                        </p>
                        <p className="text-sm opacity-80">Cho mot chut nhe.</p>
                    </div>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="p-8 text-center">
                <div className="inline-flex flex-col items-center gap-4 rounded-xl bg-red-50 px-8 py-6 text-red-700">
                    <AlertCircle className="w-10 h-10" />
                    <p>{error}</p>
                    <button
                        onClick={fetchRecommendations}
                        className="flex items-center gap-2 rounded-lg bg-red-600 px-4 py-2 text-white transition-colors hover:bg-red-700"
                    >
                        <RefreshCw className="w-4 h-4" />
                        Thu lai
                    </button>
                </div>
            </div>
        );
    }

    if (wrongAnswers.length === 0) {
        return (
            <div className="p-8">
                {focusCard}
                <div className="rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-500 p-8 text-center text-white">
                    <div className="mb-4 text-7xl">Tuyet voi</div>
                    <h2 className="mb-3 text-3xl font-bold">Xuat sac!</h2>
                    <p className="mb-6 text-xl opacity-90">
                        Em da tra loi dung tat ca cac cau hoi.
                    </p>
                    <div className="inline-block rounded-xl bg-white/20 p-4 backdrop-blur-sm">
                        <p className="text-lg">
                            Thay co rat tu hao ve em. Hay tiep tuc phat huy nhe.
                        </p>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6 p-6">
            {focusCard}

            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="rounded-xl bg-gradient-to-br from-purple-500 to-indigo-600 p-3">
                        <Sparkles className="w-6 h-6 text-white" />
                    </div>
                    <div>
                        <h2 className="font-bold text-xl text-gray-800">Goi y on tap tu AI</h2>
                        <p className="text-sm text-gray-500">Dua tren ket qua bai lam cua em</p>
                    </div>
                </div>
                <button
                    onClick={fetchRecommendations}
                    className="flex items-center gap-2 rounded-lg px-4 py-2 text-indigo-600 transition-colors hover:bg-indigo-50"
                >
                    <RefreshCw className="w-4 h-4" />
                    Lam moi
                </button>
            </div>

            {recommendation && (
                <>
                    <div className="rounded-xl border border-indigo-100 bg-gradient-to-br from-indigo-50 to-purple-50 p-6">
                        <div className="flex items-start gap-4">
                            <div className="rounded-lg bg-indigo-100 p-2">
                                <Target className="w-5 h-5 text-indigo-600" />
                            </div>
                            <div>
                                <h3 className="mb-2 font-bold text-indigo-900">Nhan xet tong quan</h3>
                                <p className="leading-relaxed text-indigo-800">{recommendation.analysis}</p>
                            </div>
                        </div>
                    </div>

                    {recommendation.weakTopics.length > 0 && (
                        <div className="rounded-xl border border-amber-200 bg-amber-50 p-6">
                            <div className="mb-4 flex items-center gap-3">
                                <div className="rounded-lg bg-amber-100 p-2">
                                    <BookOpen className="w-5 h-5 text-amber-600" />
                                </div>
                                <h3 className="font-bold text-amber-900">Em can on lai</h3>
                            </div>

                            <div className="flex flex-wrap gap-2">
                                {recommendation.weakTopics.map((topic, idx) => (
                                    <span
                                        key={idx}
                                        className="rounded-full bg-amber-100 px-4 py-2 font-medium text-amber-800"
                                    >
                                        {topic}
                                    </span>
                                ))}
                            </div>
                        </div>
                    )}

                    <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
                        <div className="mb-4 flex items-center gap-3">
                            <div className="rounded-lg bg-green-100 p-2">
                                <Lightbulb className="w-5 h-5 text-green-600" />
                            </div>
                            <h3 className="font-bold text-gray-800">Goi y hoc tap</h3>
                        </div>

                        <div className="space-y-3">
                            {recommendation.studyTips.map((tip, idx) => (
                                <div
                                    key={idx}
                                    className="flex items-start gap-3 rounded-lg bg-gray-50 p-4 transition-colors hover:bg-gray-100"
                                >
                                    <span className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-green-500 font-bold text-white">
                                        {idx + 1}
                                    </span>
                                    <p className="leading-relaxed text-gray-700">{tip}</p>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="rounded-xl bg-gradient-to-r from-pink-500 via-rose-500 to-red-500 p-6 text-white">
                        <div className="flex items-center gap-4">
                            <div className="rounded-full bg-white/20 p-3">
                                <Heart className="w-8 h-8" />
                            </div>
                            <div>
                                <h3 className="mb-1 text-lg font-bold">Loi nhan tu thay co</h3>
                                <p className="text-lg text-white/90">{recommendation.encouragement}</p>
                            </div>
                        </div>
                    </div>

                    <div className="rounded-xl border border-gray-200 bg-gray-50 p-6">
                        <h3 className="mb-4 flex items-center gap-2 font-bold text-gray-800">
                            Cac cau can xem lai ({wrongAnswers.length} cau)
                        </h3>
                        <div className="max-h-60 space-y-2 overflow-y-auto">
                            {wrongAnswers.map((wrongAnswer, idx) => (
                                <div key={idx} className="flex items-center gap-3 rounded-lg border border-gray-100 bg-white p-3">
                                    <span className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-red-100 text-sm font-bold text-red-600">
                                        {wrongAnswer.questionNumber}
                                    </span>
                                    <div className="min-w-0 flex-1">
                                        <MathSpan content={wrongAnswer.questionText} className="block truncate text-sm text-gray-700" />
                                        <p className="text-xs text-gray-400">{wrongAnswer.questionType}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                        <p className="mt-4 text-center text-sm text-gray-500">
                            Xem tab <strong>"Chi tiet"</strong> de xem giai thich cho tung cau.
                        </p>
                    </div>
                </>
            )}
        </div>
    );
};

export default RecommendationsTab;
