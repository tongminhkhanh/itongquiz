import { Env } from '../types';
import { jsonResponse, errorResponse } from '../utils/response';

export async function handleAnalyticsRoutes(request: Request, env: Env, path: string, method: string): Promise<Response> {
    const db = env.DB;

    // GET /api/analytics/class/:classId
    if (method === 'GET' && path.match(/^\/api\/analytics\/class\/[^/]+$/)) {
        const classId = path.split('/').pop()!;
        try {
            // 1. Lấy điểm trung bình homework theo class
            const hwQuery = await db.prepare(`
                SELECT 
                    assignment_id,
                    AVG(score) as avg_score,
                    COUNT(id) as total_submissions
                FROM hw_submissions 
                WHERE class_id = ? 
                GROUP BY assignment_id
                ORDER BY submitted_at ASC
            `).bind(classId).all();

            // 2. Lấy điểm trung bình quiz theo class (từ view results)
            const quizQuery = await db.prepare(`
                SELECT 
                    quiz_id,
                    AVG(score) as avg_score,
                    COUNT(id) as total_attempts
                FROM results 
                WHERE class_id = ? 
                GROUP BY quiz_id
                ORDER BY timestamp ASC
            `).bind(classId).all();

            // 3. (Optional) Phân phối điểm số Homework
            const distributionQuery = await db.prepare(`
                SELECT 
                    score,
                    COUNT(id) as count
                FROM hw_submissions 
                WHERE class_id = ? 
                GROUP BY score
                ORDER BY score DESC
            `).bind(classId).all();

            return jsonResponse({
                status: 'success',
                data: {
                    homeworkTrend: hwQuery.results,
                    quizTrend: quizQuery.results,
                    scoreDistribution: distributionQuery.results,
                    classId
                }
            });
        } catch (error: any) {
            console.error('Lỗi khi thống kê Analytics:', error);
            return errorResponse('Failed to fetch analytics data', 500);
        }
    }

    return errorResponse('Analytics Route Not Found', 404);
}
