/**
 * Student Detail Modal Component
 * 
 * Shows detailed answers for a specific student result
 * Supports question snapshots for viewing results even when quiz is deleted
 * Phase 7: Added Cognitive Domain Analysis, Radar Chart, AI Insight, and Export
 */

import React, { useRef, useMemo, useState, useEffect } from 'react';
import { StudentResult, Question, QuestionSnapshot, QuestionType, Quiz } from '../../../types';
import { Clock, XCircle, AlertCircle, Filter, User, Award, BrainCircuit, Sparkles, ChevronRight, BarChart3, CloudDownload, Tag } from 'lucide-react';
import { QuestionReview } from '../../common';
import { checkAnswer, AnswerStatus } from '../../../utils/question/scoring.util';
import { calculateStudentCompetency } from '../../../utils/competencyMapping';
import { CompetencyRadar } from '../../../features/analytics/components/CompetencyRadar';
import { AIInsightBox } from '../../../features/analytics/components/AIInsightBox';
import { analyzeStudentPerformance } from '../../../services/ai/studentAnalysisService';
import { fetchWeaknessProfile } from '../../../services/weaknessProfileService';
import type { SkillBreakdownItem, WeaknessProfileResponse } from '../../../shared/skillTaxonomy';
import { getSmartAssignmentPreview } from '../../../services/classroomService';
import type { SmartAssignmentPreviewApiResponse, SmartAssignmentPreviewData } from '../../../types/classroom.types';
import { useTeacherDashboardUIStore } from '../../../stores/useTeacherDashboardUIStore';
import { useAuthStore } from '../../../../stores/authStore';
import { toast } from 'react-hot-toast';
import html2canvas from 'html2canvas';

interface StudentDetailModalProps {
    result: StudentResult;
    questions: Question[];
    onClose: () => void;
    embedded?: boolean;
}

// Helper to normalize answer detail (support both old and new format)
interface NormalizedAnswer {
    selectedAnswer: any;
    isCorrect?: boolean;
    timeSpent?: number;
    snapshot?: QuestionSnapshot;
}

export const StudentDetailModal: React.FC<StudentDetailModalProps> = ({
    result,
    questions,
    onClose,
    embedded = false,
}) => {
    const authStore = useAuthStore();
    const openAssignmentComposerWithDraft = useTeacherDashboardUIStore((state) => state.openAssignmentComposerWithDraft);
    const reportRef = useRef<HTMLDivElement>(null);
    const isAnswerSkipped = (value: any): boolean => (
        value === undefined ||
        value === null ||
        value === '' ||
        (Array.isArray(value) && value.length === 0) ||
        (typeof value === 'object' && value !== null && !Array.isArray(value) && Object.keys(value).length === 0)
    );
    const questionsMap = useMemo(() => {
        const map: Record<string, Question> = {};
        questions.forEach(q => { map[q.id] = q; });
        return map;
    }, [questions]);

    // Build displayable questions list
    const displayQuestions = useMemo(() => {
        const answersEntries = Object.entries(result.answers || {});

        if (answersEntries.length > 0) {
            const qEntries = Object.entries(result.answers || {}).filter(([key]) => !key.startsWith('_'));
            return qEntries.map(([questionId, answerData], index) => {
                let normalized: NormalizedAnswer;

                if (answerData && typeof answerData === 'object' && ('selectedAnswer' in answerData || 'questionSnapshot' in answerData)) {
                    normalized = {
                        selectedAnswer: answerData.selectedAnswer,
                        isCorrect: typeof answerData.isCorrect === 'boolean' ? answerData.isCorrect : undefined,
                        timeSpent: answerData.timeSpent,
                        snapshot: answerData.questionSnapshot
                    };
                } else {
                    const validation = result.validationDetails?.find(v => v.questionId === questionId);
                    normalized = {
                        selectedAnswer: answerData,
                        isCorrect: typeof validation?.isCorrect === 'boolean' ? validation.isCorrect : undefined,
                        snapshot: undefined
                    };
                }

                const fromQuiz = questionsMap[questionId];
                const snapshot = normalized.snapshot;

                const standardizedQuestion = {
                    ...(fromQuiz || {}),
                    ...(snapshot || {}),
                    ...normalized,
                    id: questionId,
                    index,
                    type: snapshot?.type || fromQuiz?.type || (normalized as any).questionType,
                    question: snapshot?.question || snapshot?.mainQuestion || (fromQuiz as any)?.question || (fromQuiz as any)?.mainQuestion || '',
                };

                let finalIsCorrect = normalized.isCorrect;
                const hasPersistedCorrectness = typeof normalized.isCorrect === 'boolean';
                if (isAnswerSkipped(normalized.selectedAnswer)) {
                    finalIsCorrect = false;
                } else if (!hasPersistedCorrectness && standardizedQuestion.type) {
                    const { status } = checkAnswer(standardizedQuestion as any, normalized.selectedAnswer);
                    finalIsCorrect = status === 'correct';
                }

                return {
                    ...standardizedQuestion,
                    isCorrect: finalIsCorrect
                };
            });
        }

        if (questions.length > 0) {
            return questions.map((q, index) => ({
                ...q, 
                index,
                selectedAnswer: undefined,
                isCorrect: undefined,
                timeSpent: undefined,
            }));
        }

        return [];
    }, [result, questionsMap, questions]);

    const hasAnyData = displayQuestions.some(q => q.question || q.mainQuestion || q.text || q.options || q.items);
    const [filterMode, setFilterMode] = useState<'all' | 'correct' | 'wrong'>('all');
    const [selectedQuestionIndex, setSelectedQuestionIndex] = useState<number>(0);
    
    // Phase 7: Analytics Tab State
    const [activeTab, setActiveTab] = useState<'review' | 'analytics'>('review');
    
    // AI Insight State
    const [aiInsight, setAiInsight] = useState<string | null>(null);
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [analysisError, setAnalysisError] = useState<string | null>(null);
    const [weaknessProfile, setWeaknessProfile] = useState<WeaknessProfileResponse | null>(null);
    const [isWeaknessLoading, setIsWeaknessLoading] = useState(false);
    const [weaknessError, setWeaknessError] = useState<string | null>(null);
    const [smartPreview, setSmartPreview] = useState<SmartAssignmentPreviewData | null>(null);
    const [smartPreviewError, setSmartPreviewError] = useState<string | null>(null);
    const [smartPreviewErrorDetails, setSmartPreviewErrorDetails] = useState<SmartAssignmentPreviewApiResponse['data'] | null>(null);
    const [isSmartPreviewLoading, setIsSmartPreviewLoading] = useState(false);
    const [selectedPreviewQuizId, setSelectedPreviewQuizId] = useState('');
    const [smartDeadline, setSmartDeadline] = useState('');
    const [smartMaxAttempts, setSmartMaxAttempts] = useState(1);

    // Calculate competency data for Radar Chart
    const competencyData = useMemo(() => {
        return calculateStudentCompetency(result, questionsMap);
    }, [result, questionsMap]);

    useEffect(() => {
        setWeaknessProfile(null);
        setWeaknessError(null);
        setSmartPreview(null);
        setSmartPreviewError(null);
        setSmartPreviewErrorDetails(null);
        setSelectedPreviewQuizId('');
        setSmartDeadline('');
        setSmartMaxAttempts(1);
    }, [result.id]);

    useEffect(() => {
        let cancelled = false;

        if (activeTab !== 'analytics' || isWeaknessLoading || weaknessProfile) {
            return () => {
                cancelled = true;
            };
        }

        const loadWeaknessProfile = async () => {
            setIsWeaknessLoading(true);
            setWeaknessError(null);
            try {
                const response = await fetchWeaknessProfile(result.id);
                if (!cancelled) {
                    setWeaknessProfile(response);
                }
            } catch (error: unknown) {
                const normalizedError = error instanceof Error ? error : new Error(String(error));
                if (!cancelled) {
                    const message = String(normalizedError.message || '');
                    if (message.includes('404')) {
                        setWeaknessError('Chưa có dữ liệu phân tích năng lực cho bài này.');
                    } else {
                        setWeaknessError(normalizedError.message || 'Khong the tai ho so diem yeu.');
                    }
                }
            } finally {
                if (!cancelled) {
                    setIsWeaknessLoading(false);
                }
            }
        };

        loadWeaknessProfile();

        return () => {
            cancelled = true;
        };
    }, [activeTab, result.id, weaknessProfile]);

    const focusSkills = useMemo<SkillBreakdownItem[]>(() => {
        if (!weaknessProfile) return [];

        const statusOrder: Record<SkillBreakdownItem['status'], number> = {
            weak: 0,
            needs_practice: 1,
            stable: 2,
        };

        return weaknessProfile.subjects
            .flatMap((subject) => subject.skills)
            .filter((skill) => skill.status === 'weak' || skill.status === 'needs_practice')
            .sort((left, right) => {
                if (statusOrder[left.status] !== statusOrder[right.status]) {
                    return statusOrder[left.status] - statusOrder[right.status];
                }
                if (left.accuracy !== right.accuracy) {
                    return left.accuracy - right.accuracy;
                }
                return left.skillLabel.localeCompare(right.skillLabel);
            })
            .slice(0, 3);
    }, [weaknessProfile]);

    const showCoverageWarning = Boolean(
        weaknessProfile && (
            weaknessProfile.coveragePercent < 80 ||
            weaknessProfile.unclassifiedQuestionCount > 0
        ),
    );

    const getSkillStatusLabel = (status: SkillBreakdownItem['status']) => {
        if (status === 'weak') return 'Can uu tien';
        if (status === 'needs_practice') return 'Can luyen them';
        return 'On dinh';
    };

    useEffect(() => {
        if (!smartPreview) return;
        setSelectedPreviewQuizId(smartPreview.assignmentDraft.quizId);
        setSmartDeadline(new Date(smartPreview.assignmentDraft.deadline).toISOString().slice(0, 16));
        setSmartMaxAttempts(smartPreview.assignmentDraft.maxAttempts);
    }, [smartPreview]);

    const handleLoadSmartPreview = async () => {
        if (!authStore.username) {
            toast.error('Khong xac dinh duoc giao vien dang dang nhap.');
            return;
        }

        setIsSmartPreviewLoading(true);
        setSmartPreviewError(null);
        setSmartPreviewErrorDetails(null);

        try {
            const response = await getSmartAssignmentPreview({
                resultId: String(result.id),
                teacherUsername: authStore.username,
                strategy: 'top_weak_skill',
                deadlinePreset: '7d',
                maxAttempts: 1,
            });

            if (response.status === 'success' && response.data && 'assignmentDraft' in response.data) {
                setSmartPreview(response.data);
                return;
            }

            setSmartPreview(null);
            setSmartPreviewError(response.message || 'Khong tao duoc smart preview.');
            setSmartPreviewErrorDetails(response.data || null);
        } catch (error: unknown) {
            setSmartPreview(null);
            const normalizedError = error instanceof Error ? error : new Error(String(error));
            setSmartPreviewError(normalizedError.message || 'Khong tao duoc smart preview.');
            setSmartPreviewErrorDetails(null);
        } finally {
            setIsSmartPreviewLoading(false);
        }
    };

    const handleUseSmartPreviewInAssignmentTab = () => {
        if (!smartPreview || !selectedPreviewQuizId || !smartDeadline) {
            toast.error('Smart preview chua san sang de giao bai.');
            return;
        }

        const selectedPreviewQuiz = smartPreview.recommendedQuizzes.find((quiz) => quiz.quizId === selectedPreviewQuizId);

        openAssignmentComposerWithDraft({
            source: 'smart-preview',
            sourceResultId: String(result.id),
            studentName: smartPreview.student.fullName,
            className: smartPreview.student.className,
            classId: smartPreview.assignmentDraft.classId,
            studentId: smartPreview.assignmentDraft.studentId,
            quizId: selectedPreviewQuizId,
            deadline: new Date(smartDeadline).toISOString(),
            maxAttempts: smartMaxAttempts,
            weaknessSummary: {
                skillCode: smartPreview.weaknessSummary.topSkill.skillCode,
                skillLabel: smartPreview.weaknessSummary.topSkill.skillLabel,
                subskillCode: smartPreview.weaknessSummary.topSkill.subskillCode,
                subskillLabel: smartPreview.weaknessSummary.topSkill.subskillLabel,
                status: smartPreview.weaknessSummary.topSkill.status,
                accuracy: smartPreview.weaknessSummary.topSkill.accuracy,
                coveragePercent: smartPreview.weaknessSummary.coveragePercent,
                targetDifficulty: smartPreview.weaknessSummary.topSkill.targetDifficulty,
            },
            recommendedQuizzes: smartPreview.recommendedQuizzes,
            warnings: smartPreview.warnings,
            createdAt: new Date().toISOString(),
        });

        toast.success(
            selectedPreviewQuiz
                ? `Da nap goi y "${selectedPreviewQuiz.title}" sang tab Giao bai.`
                : 'Da nap smart preview sang tab Giao bai.',
        );
    };

    const handleAnalyze = async () => {
        if (isAnalyzing) return;
        setIsAnalyzing(true);
        setAnalysisError(null);
        try {
            const apiKey = (import.meta as any).env.VITE_CLIPROXY_TOKEN || (import.meta as any).env.VITE_GEMINI_API_KEY || '';
            if (!apiKey) throw new Error('Không tìm thấy AI API Key.');
            const insight = await analyzeStudentPerformance(result, competencyData, apiKey);
            setAiInsight(insight);
        } catch (err: unknown) {
            const normalizedError = err instanceof Error ? err : new Error(String(err));
            setAnalysisError(normalizedError.message || 'Có lỗi xảy ra khi gọi AI.');
            toast.error('AI đang bận, vui lòng thử lại sau.');
        } finally {
            setIsAnalyzing(false);
        }
    };

    const handleExportImage = async () => {
        if (!reportRef.current) return;
        
        const loadingToast = toast.loading('Đang chuẩn bị báo cáo...');
        try {
            const canvas = await html2canvas(reportRef.current, {
                scale: 2,
                useCORS: true,
                backgroundColor: '#f8fafc',
            });
            
            const image = canvas.toDataURL('image/png', 1.0);
            const link = document.createElement('a');
            link.download = `Bao-cao-${result.studentName}-${result.quizTitle}.png`;
            link.href = image;
            link.click();
            toast.success('Đã tải xuống báo cáo!', { id: loadingToast });
        } catch (error) {
            console.error('Export error:', error);
            toast.error('Không thể xuất ảnh. Vui lòng thử lại.', { id: loadingToast });
        }
    };

    const filteredQuestions = useMemo(() => {
        if (filterMode === 'all') return displayQuestions;
        if (filterMode === 'correct') return displayQuestions.filter(q => q.isCorrect === true);
        return displayQuestions.filter(q => q.isCorrect === false);
    }, [displayQuestions, filterMode]);

    // Reset selected index when filter changes
    useEffect(() => {
        setSelectedQuestionIndex(0);
    }, [filterMode]);

    const selectedQuestion = filteredQuestions[selectedQuestionIndex] ?? null;

    // Map question type to short label
    const getTypeLabel = (type: string) => {
        const map: Record<string, string> = {
            'MCQ': 'TN', 'IMAGE_QUESTION': 'HQ', 'IMAGE_MCQ': 'HQ',
            'TRUE_FALSE': 'ĐS', 'SHORT_ANSWER': 'ĐB', 'MATCHING': 'NC',
            'ORDERING': 'SX', 'DRAG_DROP': 'KT', 'DROPDOWN': 'DD',
            'UNDERLINE': 'GC', 'CATEGORIZATION': 'PL', 'WORD_SCRAMBLE': 'GC',
            'MULTIPLE_SELECT': 'CN', 'ERROR_CORRECTION': 'SC', 'RIDDLE': 'CD',
        };
        return map[type] || type?.slice(0, 3) || '?';
    };

    const correctCount = displayQuestions.filter(q => q.isCorrect === true).length;
    const wrongCount = displayQuestions.filter(q => q.isCorrect === false).length;

    return (
        <div className={embedded ? 'min-h-screen bg-slate-50' : 'fixed inset-0 bg-black/50 backdrop-blur-sm flex items-end md:items-center justify-center z-50 p-0 md:p-4'}>
            <div className={embedded ? 'bg-white w-full min-h-screen overflow-hidden flex flex-col' : 'bg-white w-full h-dvh md:h-auto md:max-h-[92vh] md:max-w-[96vw] rounded-none md:rounded-3xl shadow-2xl overflow-hidden flex flex-col animate-in fade-in zoom-in duration-300'}>
                
                {/* Header Section */}
                <div className="bg-gradient-to-r from-blue-600 via-blue-700 to-indigo-800 text-white p-4 md:p-6 relative">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full -mr-16 -mt-16 blur-3xl" />
                    
                    <div className="relative flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                        <div className="flex min-w-0 items-center gap-4">
                            <div className="w-16 h-16 rounded-2xl bg-white/20 backdrop-blur-md flex flex-col items-center justify-center border border-white/30 shadow-lg rotate-3">
                                <span className="text-2xl font-black leading-none">{result.score}</span>
                                <span className="text-[10px] text-blue-100 font-bold uppercase tracking-wider mt-1">Điểm số</span>
                            </div>
                            <div className="min-w-0">
                                <h2 className="text-xl font-black flex items-center gap-2">
                                    <User className="w-5 h-5 text-blue-200" />
                                    <span className="truncate">{result.studentName}</span>
                                </h2>
                                <p className="text-blue-100/80 text-sm font-medium flex items-center gap-1">
                                    <span>{result.studentClass}</span>
                                    <ChevronRight className="w-3 h-3 shrink-0" />
                                    <span className="truncate">{result.quizTitle || 'Bài kiểm tra'}</span>
                                </p>
                                {/* Stats + Tabs - cùng 1 hàng */}
                                <div className="flex items-center gap-2 mt-2 flex-wrap">
                                    <div className="flex items-center gap-1.5 bg-white/10 px-3 py-1 rounded-lg backdrop-blur-sm border border-white/5">
                                        <div className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
                                        <span className="text-[11px] font-bold uppercase tracking-wide">{result.correctCount}/{result.totalQuestions} Câu đúng</span>
                                    </div>
                                    <div className="flex items-center gap-1.5 bg-white/10 px-3 py-1 rounded-lg backdrop-blur-sm border border-white/5">
                                        <Clock className="w-3 h-3 text-blue-200" />
                                        <span className="text-[11px] font-bold uppercase tracking-wide">{result.timeTaken} Phút</span>
                                    </div>
                                    <div className="w-px h-4 bg-white/20 mx-1" />
                                    <button
                                        onClick={() => setActiveTab('review')}
                                        className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-[11px] font-bold transition-all border ${
                                            activeTab === 'review'
                                                ? 'bg-white text-blue-700 border-white shadow-sm'
                                                : 'bg-white/10 text-blue-100 border-white/10 hover:bg-white/20'
                                        }`}
                                    >
                                        <Sparkles className="w-3 h-3" /> Xem lại bài
                                    </button>
                                    <button
                                        onClick={() => setActiveTab('analytics')}
                                        className={`relative flex items-center gap-1.5 px-3 py-1 rounded-lg text-[11px] font-bold transition-all border ${
                                            activeTab === 'analytics'
                                                ? 'bg-white text-blue-700 border-white shadow-sm'
                                                : 'bg-white/10 text-blue-100 border-white/10 hover:bg-white/20'
                                        }`}
                                    >
                                        <BarChart3 className="w-3 h-3" /> Phân tích năng lực
                                        {!aiInsight && activeTab !== 'analytics' && (
                                            <span className="absolute -top-1 -right-1 flex h-2.5 w-2.5">
                                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-yellow-400 opacity-75"></span>
                                                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-yellow-500"></span>
                                            </span>
                                        )}
                                    </button>
                                </div>
                            </div>
                        </div>
                        <div className="flex items-center justify-end gap-2">
                            <button
                                onClick={handleExportImage}
                                disabled={activeTab !== 'analytics'}
                                title={activeTab === 'analytics' ? 'Xuất báo cáo PNG' : 'Chuyển sang tab Phân tích năng lực để xuất báo cáo PNG'}
                                className="flex items-center gap-2 rounded-xl border border-white/15 bg-white/10 px-4 py-2 text-xs font-black uppercase tracking-wider text-white transition-all hover:bg-white/20 disabled:cursor-not-allowed disabled:opacity-45"
                            >
                                <CloudDownload className="w-4 h-4" />
                                Xuất PNG
                            </button>
                            <button
                                onClick={onClose}
                                aria-label="Đóng modal"
                                className="p-3 bg-black/10 hover:bg-white/20 rounded-2xl transition-all active:scale-95"
                            >
                                <XCircle className="w-7 h-7" />
                            </button>
                        </div>
                    </div>

                </div>

                {/* Content Area */}
                <div className="flex-1 overflow-hidden flex flex-col bg-slate-50/50">
                    {activeTab === 'review' ? (
                        <>
                            {/* 2-Panel Layout */}
                            <div className="flex-1 overflow-hidden flex flex-col lg:flex-row min-h-0">

                                {/* LEFT: Question Palette */}
                                <div className="lg:w-[28%] xl:w-[25%] shrink-0 border-b lg:border-b-0 lg:border-r border-slate-200 overflow-y-auto bg-white custom-scrollbar">
                                    {!hasAnyData ? (
                                        <div className="flex flex-col items-center justify-center p-6 text-center">
                                            <AlertCircle className="w-8 h-8 text-yellow-500 mb-2" />
                                            <p className="text-xs text-slate-500 font-medium">Đề thi đã bị xóa</p>
                                        </div>
                                    ) : (
                                        <div className="space-y-4 p-4 md:p-5">
                                            <div>
                                                <div className="flex items-center gap-2 text-slate-800">
                                                    <Filter className="w-4 h-4 text-blue-500" />
                                                    <h3 className="text-sm font-black uppercase tracking-wide">Danh sách câu hỏi</h3>
                                                </div>
                                                <p className="mt-1 text-xs text-slate-400">Chọn ô để xem chi tiết, rê chuột để xem loại câu và thời gian.</p>
                                            </div>

                                            <div className="grid grid-cols-3 gap-2 sm:grid-cols-6 lg:grid-cols-3 xl:grid-cols-4">
                                                {[
                                                    { id: 'all', label: 'Tất cả', count: displayQuestions.length },
                                                    { id: 'correct', label: 'Đúng', count: correctCount },
                                                    { id: 'wrong', label: 'Sai', count: wrongCount }
                                                ].map(f => (
                                                    <button
                                                        key={f.id}
                                                        onClick={() => setFilterMode(f.id as any)}
                                                        className={`rounded-2xl border px-3 py-2 text-left transition-all ${
                                                            filterMode === f.id
                                                                ? 'border-blue-500 bg-blue-50 text-blue-700 shadow-sm shadow-blue-100'
                                                                : 'border-slate-200 bg-white text-slate-500 hover:border-slate-300 hover:bg-slate-50'
                                                        }`}
                                                    >
                                                        <span className="block text-[10px] font-black uppercase tracking-wider">{f.label}</span>
                                                        <span className="block text-lg font-black leading-none">{f.count}</span>
                                                    </button>
                                                ))}
                                            </div>

                                            <div className="grid grid-cols-5 gap-2 sm:grid-cols-10 lg:grid-cols-5 xl:grid-cols-6">
                                                {filteredQuestions.map((item, idx) => {
                                                    const isSelected = idx === selectedQuestionIndex;
                                                    const isCorrect = item.isCorrect;
                                                    const statusClass = isCorrect === true
                                                        ? 'bg-emerald-500 text-white border-emerald-500 shadow-emerald-100 hover:bg-emerald-600'
                                                        : isCorrect === false
                                                            ? 'bg-rose-500 text-white border-rose-500 shadow-rose-100 hover:bg-rose-600'
                                                            : 'bg-slate-100 text-slate-500 border-slate-200 hover:bg-slate-200';
                                                    return (
                                                        <button
                                                            key={item.id}
                                                            onClick={() => setSelectedQuestionIndex(idx)}
                                                            title={`Câu ${item.index + 1} - ${getTypeLabel(item.type)}${item.timeSpent ? ` - ${item.timeSpent}s` : ''}`}
                                                            className={`relative flex aspect-square items-center justify-center rounded-2xl border text-sm font-black shadow-sm transition-all hover:-translate-y-0.5 ${statusClass} ${
                                                                isSelected ? 'ring-4 ring-blue-200 ring-offset-2 scale-105 z-10' : ''
                                                            }`}
                                                        >
                                                            {item.index + 1}
                                                            <span className="absolute bottom-1 right-1 rounded bg-black/10 px-1 text-[8px] font-black uppercase leading-3">
                                                                {getTypeLabel(item.type)}
                                                            </span>
                                                        </button>
                                                    );
                                                })}
                                            </div>

                                            <div className="grid grid-cols-3 gap-2 border-t border-slate-100 pt-3 text-[11px] font-bold text-slate-500">
                                                <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-emerald-500" /> Đúng</span>
                                                <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-rose-500" /> Sai</span>
                                                <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-slate-200" /> Bỏ qua</span>
                                            </div>
                                        </div>
                                    )}
                                </div>

                                {/* RIGHT: Question Detail */}
                                <div className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-8 bg-slate-50/60 custom-scrollbar">
                                    {selectedQuestion ? (
                                        <div className="mx-auto w-full max-w-6xl">
                                            {/* Breadcrumb */}
                                            <div className="flex items-center gap-2 mb-4 text-xs text-slate-400 font-medium">
                                                <Tag className="w-3.5 h-3.5" />
                                                <span>Câu {selectedQuestion.index + 1}</span>
                                                <span className="text-slate-300">/</span>
                                                <span>{displayQuestions.length} câu</span>
                                                <span className="ml-auto rounded-full bg-white px-3 py-1 text-[10px] font-black uppercase tracking-wider text-slate-500 shadow-sm ring-1 ring-slate-200">
                                                    {selectedQuestion.isCorrect === true ? 'Đúng' : selectedQuestion.isCorrect === false ? 'Sai' : 'Bỏ qua'}
                                                </span>
                                            </div>

                                            {/* Question Review Card */}
                                            <QuestionReview
                                                index={selectedQuestion.index}
                                                question={selectedQuestion}
                                                studentAnswer={selectedQuestion.selectedAnswer}
                                                status={selectedQuestion.isCorrect === true ? 'correct' : selectedQuestion.isCorrect === false ? 'wrong' : 'skipped'}
                                                showExplanation={true}
                                            />

                                            <div className="mt-5 flex flex-col gap-3 rounded-3xl border border-white bg-white/80 p-3 shadow-lg shadow-slate-200/60 backdrop-blur sm:flex-row sm:items-center sm:justify-between">
                                                <button
                                                    disabled={selectedQuestionIndex === 0}
                                                    onClick={() => setSelectedQuestionIndex(i => Math.max(0, i - 1))}
                                                    className="rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm font-black text-slate-700 shadow-sm transition-all hover:border-blue-300 hover:text-blue-700 disabled:cursor-not-allowed disabled:opacity-35"
                                                >
                                                    ← Câu trước
                                                </button>
                                                <span className="text-center text-xs font-black uppercase tracking-widest text-slate-400">
                                                    Câu {selectedQuestionIndex + 1} / {filteredQuestions.length}
                                                </span>
                                                <button
                                                    disabled={selectedQuestionIndex >= filteredQuestions.length - 1}
                                                    onClick={() => setSelectedQuestionIndex(i => Math.min(filteredQuestions.length - 1, i + 1))}
                                                    className="rounded-2xl border border-blue-200 bg-blue-600 px-5 py-3 text-sm font-black text-white shadow-sm shadow-blue-200 transition-all hover:bg-blue-700 disabled:cursor-not-allowed disabled:border-slate-200 disabled:bg-slate-200 disabled:text-slate-400 disabled:shadow-none"
                                                >
                                                    Câu sau →
                                                </button>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="flex flex-col items-center justify-center h-full text-slate-400">
                                            <Sparkles className="w-10 h-10 mb-3 opacity-30" />
                                            <p className="font-medium text-sm">Chọn câu hỏi ở bên trái để xem chi tiết</p>
                                        </div>
                                    )}
                                </div>

                            </div>
                        </>
                    ) : (
                        <div className="flex-1 overflow-y-auto p-4 md:p-8 bg-slate-50 custom-scrollbar">
                            <div ref={reportRef} className="max-w-4xl mx-auto space-y-8 animate-in slide-in-from-bottom duration-500 p-4">
                                {/* Header in PDF (Only visible for canvas) */}
                                <div className="hidden pdf-only flex items-center justify-between mb-8 pb-4 border-b-2 border-blue-600">
                                    <h1 className="text-2xl font-black text-slate-800">Báo Cáo Năng Lực Học Sinh</h1>
                                    <p className="text-sm text-slate-500 font-bold">{result.studentName} • {result.studentClass}</p>
                                </div>

                                <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
                                    <div className="lg:col-span-3 bg-white p-6 md:p-8 rounded-[2rem] shadow-xl shadow-blue-900/5 border border-white">
                                        <div className="flex items-center justify-between mb-6">
                                            <div className="flex items-center gap-3">
                                                <div className="p-2 bg-blue-50 rounded-xl text-blue-600">
                                                    <Award className="w-6 h-6" />
                                                </div>
                                                <div>
                                                    <h3 className="font-black text-slate-800 text-lg uppercase tracking-tight">Trục Năng Lực Học Tập</h3>
                                                    <p className="text-xs text-slate-400 font-bold uppercase">Ma trận kiến thức ItongQuiz</p>
                                                </div>
                                            </div>
                                        </div>
                                        <CompetencyRadar data={competencyData} studentName={result.studentName} />
                                        <div className="mt-6 p-4 bg-blue-50/50 rounded-2xl border border-blue-100/50 flex gap-3">
                                            <div className="p-2 bg-blue-600 rounded-lg text-white h-fit shadow-lg shadow-blue-200">
                                                <BrainCircuit className="w-4 h-4" />
                                            </div>
                                            <p className="text-xs font-medium text-slate-700 leading-relaxed italic">
                                                "Biểu đồ Radar thể hiện điểm mạnh và điểm cần cải thiện của <span className="font-bold text-blue-700">{result.studentName}</span> qua bài thi này."
                                            </p>
                                        </div>
                                    </div>

                                    <div className="lg:col-span-2 space-y-6">
                                        <div className="bg-white p-6 rounded-[2rem] shadow-xl shadow-blue-900/5 border border-white">
                                            <h4 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
                                                <BarChart3 className="w-4 h-4 text-blue-500" /> Chi tiết chỉ số
                                            </h4>
                                            <div className="space-y-3">
                                                {competencyData.map((d, i) => (
                                                    <div key={i} className="group cursor-default">
                                                        <div className="flex items-center justify-between mb-1.5 px-1">
                                                            <span className="text-[11px] font-black uppercase tracking-wider text-slate-500">{d.subject}</span>
                                                            <span className="text-xs font-black text-slate-900">{d.score}%</span>
                                                        </div>
                                                        <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden border border-slate-200/50">
                                                            <div 
                                                                className={`h-full rounded-full transition-all duration-1000 ease-out ${
                                                                    d.score >= 80 ? 'bg-gradient-to-r from-emerald-400 to-green-500' : d.score >= 50 ? 'bg-gradient-to-r from-blue-400 to-blue-600' : 'bg-gradient-to-r from-orange-400 to-red-500'
                                                                }`}
                                                                style={{ width: `${d.score}%` }}
                                                            />
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>

                                        <div className="bg-white p-6 rounded-[2rem] shadow-xl shadow-blue-900/5 border border-white">
                                            <h4 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
                                                <AlertCircle className="w-4 h-4 text-amber-500" /> Kỹ năng cần chú ý
                                            </h4>

                                            {isWeaknessLoading ? (
                                                <div className="space-y-3">
                                                    {[0, 1, 2].map((item) => (
                                                        <div key={item} className="animate-pulse rounded-2xl border border-slate-100 bg-slate-50 p-4">
                                                            <div className="h-3 w-32 rounded bg-slate-200 mb-3" />
                                                            <div className="h-2 w-full rounded bg-slate-200 mb-2" />
                                                            <div className="h-2 w-20 rounded bg-slate-200" />
                                                        </div>
                                                    ))}
                                                </div>
                                            ) : weaknessError ? (
                                                <div className="rounded-2xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-600">
                                                    {weaknessError}
                                                </div>
                                            ) : (
                                                <div className="space-y-3">
                                                    {showCoverageWarning && weaknessProfile && (
                                                        <div className="rounded-2xl border border-amber-100 bg-amber-50 px-4 py-3 text-xs text-amber-700 leading-relaxed">
                                                            Dữ liệu phân loại mới phủ {weaknessProfile.coveragePercent}% số câu. Hiện còn {weaknessProfile.unclassifiedQuestionCount} câu chưa map kỹ năng, nên anh xem đây là tín hiệu sớm để ưu tiên kiểm tra thêm.
                                                        </div>
                                                    )}

                                                    {focusSkills.length > 0 ? (
                                                        focusSkills.map((skill) => (
                                                            <div key={`${skill.subject}-${skill.skillCode}`} className="rounded-2xl border border-slate-100 bg-slate-50/80 p-4">
                                                                <div className="flex items-start justify-between gap-3">
                                                                    <div>
                                                                        <p className="text-sm font-black text-slate-800">{skill.skillLabel}</p>
                                                                        <p className="text-[11px] uppercase tracking-wide text-slate-400 font-bold mt-1">
                                                                            {skill.subjectLabel}
                                                                        </p>
                                                                    </div>
                                                                    <span className={`inline-flex rounded-full px-2.5 py-1 text-[10px] font-black uppercase tracking-wide ${
                                                                        skill.status === 'weak'
                                                                            ? 'bg-red-100 text-red-700'
                                                                            : 'bg-amber-100 text-amber-700'
                                                                    }`}>
                                                                        {getSkillStatusLabel(skill.status)}
                                                                    </span>
                                                                </div>

                                                                <div className="mt-3 flex items-center justify-between text-xs font-medium text-slate-500">
                                                                    <span>Độ chính xác</span>
                                                                    <span className="font-black text-slate-800">{skill.accuracy}%</span>
                                                                </div>
                                                                <div className="mt-2 h-2.5 overflow-hidden rounded-full border border-slate-200/80 bg-white">
                                                                    <div
                                                                        className={`h-full rounded-full ${
                                                                            skill.status === 'weak'
                                                                                ? 'bg-gradient-to-r from-red-400 to-rose-500'
                                                                                : 'bg-gradient-to-r from-amber-400 to-orange-500'
                                                                        }`}
                                                                        style={{ width: `${Math.max(skill.accuracy, 6)}%` }}
                                                                    />
                                                                </div>
                                                                <p className="mt-3 text-[11px] font-medium text-slate-500">
                                                                    Đã làm {skill.attempted} câu, sai {skill.wrong} câu ở nhóm kỹ năng này.
                                                                </p>
                                                            </div>
                                                        ))
                                                    ) : (
                                                        <div className="rounded-2xl border border-emerald-100 bg-emerald-50 px-4 py-4 text-sm text-emerald-700">
                                                            Chưa thấy kỹ năng nào rơi vào nhóm cần ưu tiên từ 5 bài gần nhất. Đây là dấu hiệu tốt, nhưng anh vẫn có thể kết hợp thêm bảng câu sai để nhìn sâu hơn.
                                                        </div>
                                                    )}

                                                    {focusSkills.length > 0 && (
                                                        <div className="rounded-2xl border border-indigo-100 bg-indigo-50/60 p-4">
                                                            <div className="flex flex-wrap items-center justify-between gap-3">
                                                                <div>
                                                                    <p className="text-sm font-black text-slate-800">Smart Assignment MVP</p>
                                                                    <p className="mt-1 text-xs text-slate-500">
                                                                        Preview bai on loi cho chinh hoc sinh nay, dua tren weakness profile hien tai.
                                                                    </p>
                                                                </div>
                                                                <button
                                                                    onClick={handleLoadSmartPreview}
                                                                    disabled={isSmartPreviewLoading}
                                                                    className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700 transition-colors disabled:opacity-60"
                                                                >
                                                                    {isSmartPreviewLoading ? 'Dang tao preview...' : 'Giao bai on loi cho em nay'}
                                                                </button>
                                                            </div>

                                                            {smartPreviewError && (
                                                                <div className="mt-4 rounded-2xl border border-red-100 bg-white px-4 py-3 text-sm text-red-600">
                                                                    <p className="font-semibold">{smartPreviewError}</p>
                                                                    {smartPreviewErrorDetails && 'candidates' in smartPreviewErrorDetails && Array.isArray(smartPreviewErrorDetails.candidates) && smartPreviewErrorDetails.candidates.length > 0 && (
                                                                        <div className="mt-3 space-y-1 text-xs text-red-500">
                                                                            {smartPreviewErrorDetails.candidates.map((candidate) => (
                                                                                <p key={candidate.id}>
                                                                                    {candidate.fullName} - {candidate.className}
                                                                                </p>
                                                                            ))}
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            )}

                                                            {smartPreview && (
                                                                <div className="mt-4 space-y-4">
                                                                    <div className="rounded-2xl border border-white bg-white p-4">
                                                                        <div className="flex items-start justify-between gap-3">
                                                                            <div>
                                                                                <p className="text-sm font-black text-slate-800">Ky nang uu tien</p>
                                                                                <p className="mt-1 text-sm text-slate-600">
                                                                                    {smartPreview.weaknessSummary.topSkill.skillLabel} - {getSkillStatusLabel(smartPreview.weaknessSummary.topSkill.status)} ({smartPreview.weaknessSummary.topSkill.accuracy}%)
                                                                                </p>
                                                                                <div className="mt-2 flex flex-wrap items-center gap-2 text-[11px] font-medium text-slate-500">
                                                                                    <span>Muc goi y: {smartPreview.weaknessSummary.topSkill.targetDifficulty}</span>
                                                                                    {smartPreview.weaknessSummary.topSkill.subskillLabel && (
                                                                                        <span>• {smartPreview.weaknessSummary.topSkill.subskillLabel}</span>
                                                                                    )}
                                                                                </div>
                                                                            </div>
                                                                            <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-black uppercase tracking-wide text-slate-500">
                                                                                {smartPreview.student.className}
                                                                            </span>
                                                                        </div>

                                                                        {smartPreview.warnings.length > 0 && (
                                                                            <div className="mt-3 space-y-2">
                                                                                {smartPreview.warnings.map((warning) => (
                                                                                    <div key={warning.code} className="rounded-xl border border-amber-100 bg-amber-50 px-3 py-2 text-xs text-amber-700">
                                                                                        {warning.message}
                                                                                    </div>
                                                                                ))}
                                                                            </div>
                                                                        )}
                                                                    </div>

                                                                    <div className="grid grid-cols-1 gap-3">
                                                                        <div>
                                                                                <label className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-slate-500">
                                                                                    De goi y
                                                                                </label>
                                                                                <select
                                                                                    value={selectedPreviewQuizId}
                                                                                onChange={(event) => setSelectedPreviewQuizId(event.target.value)}
                                                                                className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
                                                                                >
                                                                                    {smartPreview.recommendedQuizzes.map((quiz) => (
                                                                                        <option key={quiz.quizId} value={quiz.quizId}>
                                                                                            {quiz.title} - {quiz.questionCount} cau - {quiz.matchReason} - {Math.round(quiz.confidence * 100)}%
                                                                                        </option>
                                                                                    ))}
                                                                                </select>
                                                                                {smartPreview.recommendedQuizzes
                                                                                    .filter((quiz) => quiz.quizId === selectedPreviewQuizId)
                                                                                    .map((quiz) => (
                                                                                        <p key={`${quiz.quizId}-reason`} className="mt-2 text-xs text-slate-500">
                                                                                            {quiz.matchReason} • Tong diem {quiz.matchBreakdown.totalScore}
                                                                                        </p>
                                                                                    ))}
                                                                            </div>

                                                                        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                                                                            <div>
                                                                                <label className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-slate-500">
                                                                                    Han nop
                                                                                </label>
                                                                                <input
                                                                                    type="datetime-local"
                                                                                    value={smartDeadline}
                                                                                    onChange={(event) => setSmartDeadline(event.target.value)}
                                                                                    className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
                                                                                />
                                                                            </div>
                                                                            <div>
                                                                                <label className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-slate-500">
                                                                                    So luot lam
                                                                                </label>
                                                                                <input
                                                                                    type="number"
                                                                                    min={1}
                                                                                    max={10}
                                                                                    value={smartMaxAttempts}
                                                                                    onChange={(event) => setSmartMaxAttempts(Math.max(1, Math.min(10, Number(event.target.value) || 1)))}
                                                                                    className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
                                                                                />
                                                                            </div>
                                                                        </div>
                                                                    </div>

                                                                    <button
                                                                        onClick={handleUseSmartPreviewInAssignmentTab}
                                                                        className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-3 text-sm font-semibold text-white hover:bg-emerald-700 transition-colors"
                                                                    >
                                                                        Dung trong AssignmentTab
                                                                    </button>
                                                                </div>
                                                            )}
                                                        </div>
                                                    )}
                                                    {weaknessProfile && (
                                                        <p className="text-[11px] text-slate-400 font-medium">
                                                            Tổng hợp từ {weaknessProfile.basedOnResultIds.length} bài gần nhất của {result.studentName}.
                                                        </p>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                        
                                        <AIInsightBox 
                                            insight={aiInsight}
                                            isLoading={isAnalyzing}
                                            onAnalyze={handleAnalyze}
                                            error={analysisError}
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </div>

            </div>

            <style>{`
                @media print { .pdf-only { display: flex !important; } }
                .scrollbar-hide::-webkit-scrollbar { display: none; }
                .scrollbar-hide { -ms-overflow-style: none; scrollbar-width: none; }
            `}</style>
        </div>
    );
};

export default StudentDetailModal;

