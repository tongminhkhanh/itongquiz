/**
 * useQuizManager Hook
 * 
 * Custom hook for quiz list management.
 */

import { useState, useMemo, useCallback } from 'react';
import { Quiz } from '../types';

export interface UseQuizManagerProps {
    quizzes: Quiz[];
    onDelete?: (quizId: string) => Promise<void>;
}

export interface UseQuizManagerReturn {
    // Filtered quizzes
    filteredQuizzes: Quiz[];
    paginatedQuizzes: Quiz[];

    // Filters
    filterLevel: string;
    setFilterLevel: (level: string) => void;
    searchTerm: string;
    setSearchTerm: (term: string) => void;

    // Pagination
    page: number;
    setPage: (page: number) => void;
    pageSize: number;
    totalPages: number;

    // Actions
    handleDelete: (quizId: string) => Promise<void>;
}

const QUIZZES_PER_PAGE = 10;

export const useQuizManager = ({ quizzes, onDelete }: UseQuizManagerProps): UseQuizManagerReturn => {
    const [filterLevel, setFilterLevel] = useState('All');
    const [searchTerm, setSearchTerm] = useState('');
    const [page, setPage] = useState(1);

    // Filter quizzes
    const filteredQuizzes = useMemo(() => {
        let filtered = [...quizzes];

        // Level filter
        if (filterLevel !== 'All') {
            filtered = filtered.filter(q => q.classLevel === filterLevel);
        }

        // Search filter
        if (searchTerm.trim()) {
            const search = searchTerm.toLowerCase();
            filtered = filtered.filter(q =>
                q.title.toLowerCase().includes(search)
            );
        }

        // Sort by date (newest first)
        filtered.sort((a, b) =>
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        );

        return filtered;
    }, [quizzes, filterLevel, searchTerm]);

    // Calculate pagination
    const totalPages = Math.ceil(filteredQuizzes.length / QUIZZES_PER_PAGE);

    // Paginate
    const paginatedQuizzes = useMemo(() => {
        const start = (page - 1) * QUIZZES_PER_PAGE;
        return filteredQuizzes.slice(start, start + QUIZZES_PER_PAGE);
    }, [filteredQuizzes, page]);

    // Handle delete
    const handleDelete = useCallback(async (quizId: string) => {
        if (!onDelete) return;

        if (window.confirm('Bạn có chắc chắn muốn xóa bài kiểm tra này?')) {
            await onDelete(quizId);
        }
    }, [onDelete]);

    return {
        filteredQuizzes,
        paginatedQuizzes,
        filterLevel,
        setFilterLevel,
        searchTerm,
        setSearchTerm,
        page,
        setPage,
        pageSize: QUIZZES_PER_PAGE,
        totalPages,
        handleDelete,
    };
};

export default useQuizManager;
