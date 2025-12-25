/**
 * Results Table Component
 * 
 * Displays student results in a sortable table.
 */

import React from 'react';
import { StudentResult, Quiz } from '../../../../types';
import { ArrowUpDown } from 'lucide-react';

export interface ResultsTableProps {
    results: StudentResult[];
    quizzes: Quiz[];
    sortField: 'score' | 'submittedAt';
    sortOrder: 'asc' | 'desc';
    onSortChange: (field: 'score' | 'submittedAt') => void;
}

export const ResultsTable: React.FC<ResultsTableProps> = ({
    results,
    quizzes,
    sortField,
    sortOrder,
    onSortChange,
}) => {
    // Get quiz title by ID, prioritize quizTitle from result if available
    const getQuizTitle = (result: StudentResult) => {
        // First try to use quizTitle from result (from Google Sheets)
        if (result.quizTitle) {
            return result.quizTitle;
        }
        // Fallback to finding quiz by ID
        const quiz = quizzes.find(q => q.id === result.quizId);
        return quiz ? quiz.title : 'Không xác định';
    };

    // Format date
    const formatDate = (dateString: string) => {
        const date = new Date(dateString);
        return date.toLocaleString('vi-VN', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
        });
    };

    // Get score color
    const getScoreColor = (score: number) => {
        if (score >= 9) return 'text-green-600 bg-green-100';
        if (score >= 7) return 'text-blue-600 bg-blue-100';
        if (score >= 5) return 'text-yellow-600 bg-yellow-100';
        return 'text-red-600 bg-red-100';
    };

    const SortButton: React.FC<{ field: 'score' | 'submittedAt'; label: string }> = ({ field, label }) => (
        <button
            onClick={() => onSortChange(field)}
            className={`flex items-center gap-1 font-semibold ${sortField === field ? 'text-orange-600' : 'text-gray-600'
                }`}
        >
            {label}
            <ArrowUpDown className="w-3 h-3" />
        </button>
    );

    if (results.length === 0) {
        return (
            <div className="text-center py-12 text-gray-500">
                <p>Chưa có kết quả nào.</p>
            </div>
        );
    }

    return (
        <div className="overflow-x-auto">
            <table className="w-full">
                <thead className="bg-gray-50 border-b">
                    <tr>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">
                            Học sinh
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">
                            Lớp
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">
                            Bài kiểm tra
                        </th>
                        <th className="px-4 py-3 text-center">
                            <SortButton field="score" label="Điểm" />
                        </th>
                        <th className="px-4 py-3 text-center text-xs font-semibold text-gray-500 uppercase">
                            Kết quả
                        </th>
                        <th className="px-4 py-3 text-right">
                            <SortButton field="submittedAt" label="Thời gian" />
                        </th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                    {results.map((result) => (
                        <tr key={result.id} className="hover:bg-gray-50 transition-colors">
                            <td className="px-4 py-3">
                                <span className="font-medium text-gray-800">{result.studentName}</span>
                            </td>
                            <td className="px-4 py-3">
                                <span className="text-gray-600">{result.studentClass}</span>
                            </td>
                            <td className="px-4 py-3">
                                <span className="text-gray-600 text-sm">{getQuizTitle(result)}</span>
                            </td>
                            <td className="px-4 py-3 text-center">
                                <span className={`inline-flex px-2 py-1 rounded-full text-sm font-bold ${getScoreColor(result.score)}`}>
                                    {result.score}
                                </span>
                            </td>
                            <td className="px-4 py-3 text-center">
                                <span className="text-sm text-gray-500">
                                    {result.correctCount}/{result.totalQuestions} câu
                                </span>
                            </td>
                            <td className="px-4 py-3 text-right">
                                <span className="text-sm text-gray-500">
                                    {formatDate(result.submittedAt)}
                                </span>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
};

export default ResultsTable;
