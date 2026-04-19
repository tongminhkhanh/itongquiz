import React from 'react';
import { ChevronLeft, ChevronRight, Send } from 'lucide-react';

interface QuizPaginationProps {
    currentPage: number;
    totalPages: number;
    onPageChange: (p: number) => void;
    onSubmit: () => void;
    isSubmitting: boolean;
}

const QuizPagination: React.FC<QuizPaginationProps> = ({
    currentPage, totalPages, onPageChange, onSubmit, isSubmitting
}) => {
    return (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mt-8 pb-12 border-t border-gray-100 pt-6">
            <div className="flex items-center gap-2">
                <button
                    onClick={() => onPageChange(currentPage - 1)}
                    disabled={currentPage === 1}
                    className="p-3 rounded-xl border border-gray-200 text-gray-600 hover:bg-gray-50 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                >
                    <ChevronLeft className="w-6 h-6" />
                </button>
                
                <div className="px-6 py-2 bg-gray-50 rounded-xl border border-gray-100 text-sm font-bold text-gray-600">
                    Trang {currentPage} / {totalPages}
                </div>

                <button
                    onClick={() => onPageChange(currentPage + 1)}
                    disabled={currentPage === totalPages}
                    className="p-3 rounded-xl border border-gray-200 text-gray-600 hover:bg-gray-50 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                >
                    <ChevronRight className="w-6 h-6" />
                </button>
            </div>

            {currentPage === totalPages ? (
                <button
                    onClick={onSubmit}
                    disabled={isSubmitting}
                    className={`
                        w-full sm:w-auto px-8 py-4 rounded-2xl bg-gradient-to-r from-green-500 to-emerald-600 text-white font-black text-lg shadow-xl shadow-green-100 hover:scale-105 active:scale-95 transition-all flex items-center justify-center gap-3
                        ${isSubmitting ? 'opacity-70 cursor-not-allowed' : ''}
                    `}
                >
                    {isSubmitting ? (
                        <div className="w-6 h-6 border-4 border-white border-t-transparent rounded-full animate-spin" />
                    ) : (
                        <Send className="w-6 h-6" />
                    )}
                    NỘP BÀI NGAY
                </button>
            ) : (
                <button
                    onClick={() => onPageChange(currentPage + 1)}
                    className="w-full sm:w-auto px-8 py-4 rounded-2xl bg-blue-600 text-white font-bold hover:bg-blue-700 transition-all shadow-lg shadow-blue-100 flex items-center justify-center gap-2"
                >
                    Tiếp tục
                    <ChevronRight className="w-5 h-5" />
                </button>
            )}
        </div>
    );
};

export default QuizPagination;
