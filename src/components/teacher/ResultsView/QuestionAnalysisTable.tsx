/**
 * Question Analysis Component
 * 
 * Shows difficulty analysis for each question
 */

import React, { useState, useRef, useEffect } from 'react';
import { QuestionAnalysis } from '../../../utils/statisticsUtils';
import { AlertTriangle, CheckCircle, HelpCircle, Clock, ChevronDown, ChevronUp } from 'lucide-react';
import MathSpan from '../../common/MathSpan';

interface QuestionAnalysisTableProps {
    analysis: QuestionAnalysis[];
    showTopMissed?: number; // Number of top missed questions to highlight
}

export const QuestionAnalysisTable: React.FC<QuestionAnalysisTableProps> = ({
    analysis,
    showTopMissed = 5,
}) => {
    const [sortBy, setSortBy] = useState<'index' | 'correctRate' | 'difficulty'>('index');
    const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
    const [showAll, setShowAll] = useState(false);
    const tableRef = useRef<HTMLDivElement>(null);

    // Get top missed questions
    const topMissedIds = [...analysis]
        .sort((a, b) => a.correctRate - b.correctRate)
        .slice(0, showTopMissed)
        .map(q => q.questionId);

    // Sort analysis
    const sortedAnalysis = [...analysis].sort((a, b) => {
        let comparison = 0;
        if (sortBy === 'correctRate') {
            comparison = a.correctRate - b.correctRate;
        } else if (sortBy === 'difficulty') {
            const order = { hard: 0, medium: 1, easy: 2 };
            comparison = order[a.difficulty] - order[b.difficulty];
        }
        return sortOrder === 'asc' ? comparison : -comparison;
    });

    // Display limited or all
    const displayAnalysis = showAll ? sortedAnalysis : sortedAnalysis.slice(0, 10);

    const handleSort = (field: typeof sortBy) => {
        if (sortBy === field) {
            setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
        } else {
            setSortBy(field);
            setSortOrder('asc');
        }
    };

    const getDifficultyBadge = (difficulty: 'easy' | 'medium' | 'hard') => {
        const styles = {
            easy: 'bg-green-100 text-green-700 border-green-200',
            medium: 'bg-yellow-100 text-yellow-700 border-yellow-200',
            hard: 'bg-red-100 text-red-700 border-red-200',
        };
        const labels = {
            easy: 'Dễ',
            medium: 'TB',
            hard: 'Khó',
        };
        return (
            <span className={`px-2 py-1 text-xs font-medium rounded-full border ${styles[difficulty]}`}>
                {labels[difficulty]}
            </span>
        );
    };

    const getCorrectRateBar = (rate: number) => {
        const colorClass = rate >= 80 ? 'bg-green-500' : rate >= 50 ? 'bg-yellow-500' : 'bg-red-500';
        return (
            <div className="flex items-center gap-2">
                <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
                    <div
                        className={`h-full ${colorClass} transition-all`}
                        style={{ width: `${rate}%` }}
                    />
                </div>
                <span className="text-sm font-medium w-12 text-right">{rate}%</span>
            </div>
        );
    };

    if (analysis.length === 0) {
        return (
            <div className="text-center py-8 text-gray-500">
                Chưa có dữ liệu phân tích câu hỏi
            </div>
        );
    }

    return (
        <div ref={tableRef} className="bg-white rounded-xl border shadow-sm overflow-hidden">
            {/* Header */}
            <div className="bg-gradient-to-r from-purple-500 to-purple-600 text-white p-4">
                <h3 className="font-bold flex items-center gap-2">
                    📌 Phân tích độ khó câu hỏi
                </h3>
                <p className="text-purple-100 text-sm mt-1">
                    Xác định những câu hỏi học sinh hay sai để điều chỉnh giảng dạy
                </p>
            </div>

            {/* Top Missed Alert */}
            {topMissedIds.length > 0 && (
                <div className="bg-red-50 border-b border-red-100 p-4">
                    <div className="flex items-start gap-3">
                        <AlertTriangle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                        <div>
                            <p className="font-medium text-red-800">
                                Câu hỏi hay sai nhất ({topMissedIds.length} câu)
                            </p>
                            <p className="text-sm text-red-600 mt-1">
                                Những câu hỏi này có tỷ lệ sai cao nhất. Nên xem xét lại nội dung giảng dạy hoặc độ khó câu hỏi.
                            </p>
                        </div>
                    </div>
                </div>
            )}

            {/* Table */}
            <div className="overflow-x-auto">
                <table className="w-full">
                    <thead className="bg-gray-50 border-b">
                        <tr>
                            <th className="text-left p-3 text-xs font-semibold text-gray-600 uppercase tracking-wider">
                                #
                            </th>
                            <th className="text-left p-3 text-xs font-semibold text-gray-600 uppercase tracking-wider">
                                Câu hỏi
                            </th>
                            <th
                                className="text-left p-3 text-xs font-semibold text-gray-600 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                                onClick={() => handleSort('correctRate')}
                            >
                                <div className="flex items-center gap-1">
                                    Tỷ lệ đúng
                                    {sortBy === 'correctRate' && (
                                        sortOrder === 'asc' ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />
                                    )}
                                </div>
                            </th>
                            <th
                                className="text-left p-3 text-xs font-semibold text-gray-600 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                                onClick={() => handleSort('difficulty')}
                            >
                                <div className="flex items-center gap-1">
                                    Độ khó
                                    {sortBy === 'difficulty' && (
                                        sortOrder === 'asc' ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />
                                    )}
                                </div>
                            </th>
                            <th className="text-left p-3 text-xs font-semibold text-gray-600 uppercase tracking-wider">
                                Đúng/Sai
                            </th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                        {displayAnalysis.map((item, index) => {
                            const isMissed = topMissedIds.includes(item.questionId);
                            return (
                                <tr
                                    key={item.questionId}
                                    className={`hover:bg-gray-50 ${isMissed ? 'bg-red-50' : ''}`}
                                >
                                    <td className="p-3">
                                        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${isMissed
                                            ? 'bg-red-500 text-white'
                                            : 'bg-gray-200 text-gray-600'
                                            }`}>
                                            {index + 1}
                                        </div>
                                    </td>
                                    <td className="p-3">
                                        <MathSpan
                                            content={item.questionText}
                                            className="text-sm text-gray-800 line-clamp-2 max-w-md block"
                                        />
                                        {isMissed && (
                                            <span className="inline-flex items-center gap-1 text-xs text-red-600 mt-1">
                                                <AlertTriangle className="w-3 h-3" />
                                                Hay sai
                                            </span>
                                        )}
                                    </td>
                                    <td className="p-3 min-w-[150px]">
                                        {getCorrectRateBar(item.correctRate)}
                                    </td>
                                    <td className="p-3">
                                        {getDifficultyBadge(item.difficulty)}
                                    </td>
                                    <td className="p-3">
                                        <div className="flex items-center gap-2 text-sm">
                                            <span className="text-green-600 flex items-center gap-1">
                                                <CheckCircle className="w-4 h-4" />
                                                {item.correctCount}
                                            </span>
                                            <span className="text-gray-400">/</span>
                                            <span className="text-red-600">
                                                {item.wrongCount}
                                            </span>
                                        </div>
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>

            {/* Show more/less */}
            {analysis.length > 10 && (
                <div className="p-4 border-t text-center">
                    <button
                        onClick={() => setShowAll(!showAll)}
                        className="text-purple-600 hover:text-purple-700 font-medium text-sm"
                    >
                        {showAll ? 'Thu gọn' : `Xem tất cả ${analysis.length} câu`}
                    </button>
                </div>
            )}
        </div>
    );
};

export default QuestionAnalysisTable;
