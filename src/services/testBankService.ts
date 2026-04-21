import type { Question } from '../types';
// Constant API URL

// Dùng tạm url gốc nếu system không có apiConfig export standard
const API_BASE_URL = import.meta.env.VITE_WORKER_URL || 'http://localhost:8787';

export interface TestBankItem {
    id: string;
    teacher_id: string;
    question_data: Question;
    tags: string[];
    created_at: string;
}

export const testBankService = {
    async getTestBank(teacherId: string): Promise<TestBankItem[]> {
        const response = await fetch(API_BASE_URL + '/api/test-bank/teacher/' + teacherId);
        if (!response.ok) {
            throw new Error('Không thể tải ngân hàng câu hỏi');
        }
        const data = await response.json();
        return data.items || [];
    },

    async saveQuestion(teacherId: string, question: Question, tags: string[] = []): Promise<string> {
        const id = 'tb_' + Date.now().toString() + '_' + Math.random().toString(36).substring(2, 7);
        
        const response = await fetch(API_BASE_URL + '/api/test-bank', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                id,
                teacher_id: teacherId,
                question_data: question,
                tags
            })
        });

        if (!response.ok) {
            throw new Error('Lỗi khi lưu câu hỏi vào ngân hàng');
        }

        const data = await response.json();
        return data.id as string;
    },

    async deleteQuestion(id: string): Promise<boolean> {
        const response = await fetch(API_BASE_URL + '/api/test-bank/' + id, {
            method: 'DELETE'
        });

        if (!response.ok) {
            throw new Error('Lỗi khi xóa câu hỏi');
        }
        return true;
    }
};
