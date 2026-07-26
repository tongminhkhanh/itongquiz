import { callApi } from './apiAdapter';
import { Question, Quiz } from '../types';

export interface PracticeSubmissionInput {
    attemptToken: string;
    answers: Record<string, any>;
}

export interface PracticeSubmissionResponse {
    status: 'success';
    score: number;
    correctCount: number;
    total: number;
    details: { questionId: string; isCorrect: boolean }[];
    reviewQuestions: Question[];
}

export const practiceService = {
    /**
     * Fetches the list of all unique topic tags available in the database with their counts
     */
    getTopics: async (): Promise<{ name: string; count: number }[]> => {
        const response = await callApi<{ topics: { name: string; count: number }[] }>(
            'get_practice_topics',
        );
        return response.topics || [];
    },

    /**
     * Fetches a dynamically generated practice quiz for a given topic
     */
    getPracticeQuiz: async (topic: string, limit: number = 10): Promise<Quiz | null> => {
        try {
            const response = await callApi<Quiz>('get_practice_quiz', { topic, limit });
            return response;
        } catch (error) {
            console.error('Error fetching practice quiz:', error);
            return null;
        }
    },

    submitPracticeAnswers: async (
        input: PracticeSubmissionInput,
    ): Promise<PracticeSubmissionResponse> => (
        callApi<PracticeSubmissionResponse>('submit_practice_answers', input)
    ),
};

