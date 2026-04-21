import { Env } from '../types';
import { jsonResponse, errorResponse } from '../utils/response';

export async function handleTestBankRoutes(request: Request, env: Env, path: string, method: string): Promise<Response> {
    const db = env.DB;
    const route = path.replace('/api/test-bank', '');

    try {
        if (method === 'GET' && route.startsWith('/teacher/')) {
            const teacherId = route.split('/').pop()!;
            const queryResult = await db.prepare(
                'SELECT * FROM test_bank WHERE teacher_id = ? ORDER BY created_at DESC'
            ).bind(teacherId).all<any>();
            const results = queryResult.results || [];

            const mappedResults = results.map(row => ({
                id: row.id as string,
                teacher_id: row.teacher_id as string,
                question_data: JSON.parse(row.question_data as string),
                tags: row.tags ? JSON.parse(row.tags as string) : [],
                created_at: row.created_at as string
            }));

            return jsonResponse({ items: mappedResults });
        }

        if (method === 'POST' && (route === '' || route === '/')) {
            const data: any = await request.json();
            const { id, teacher_id, question_data, tags } = data;

            if (!id || !teacher_id || !question_data) {
                return errorResponse('Missing data', 400);
            }

            const qStr = typeof question_data === 'string' ? question_data : JSON.stringify(question_data);
            const tStr = tags ? (typeof tags === 'string' ? tags : JSON.stringify(tags)) : '[]';

            await db.prepare(
                'INSERT INTO test_bank (id, teacher_id, question_data, tags) VALUES (?, ?, ?, ?)'
            ).bind(id, teacher_id, qStr, tStr).run();

            return jsonResponse({ status: 'success', id });
        }

        if (method === 'DELETE' && route.startsWith('/') && route.split('/').length === 2) {
            const id = route.split('/').pop()!;
            await db.prepare(
                'DELETE FROM test_bank WHERE id = ?'
            ).bind(id).run();

            return jsonResponse({ status: 'success' });
        }

        return errorResponse('Test Bank Route Not Found', 404);
    } catch (e: any) {
        console.error('Error in test bank:', e);
        return errorResponse('Server internal error', 500);
    }
}
