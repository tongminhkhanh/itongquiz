const API_BASE_URL = import.meta.env.VITE_WORKER_URL || 'http://localhost:8787';

export interface TrendData {
  assignment_id?: string;
  quiz_id?: string;
  avg_score: number;
  total_submissions?: number;
  total_attempts?: number;
}

export interface ScoreDistribution {
  score: number;
  count: number;
}

export interface ClassAnalyticsResponse {
  homeworkTrend: TrendData[];
  quizTrend: TrendData[];
  scoreDistribution: ScoreDistribution[];
  classId: string;
}

export const analyticsService = {
  /**
   * Fetch aggregated analytics data for a specific class
   */
  async getClassAnalytics(classId: string): Promise<ClassAnalyticsResponse> {
    try {
      const response = await fetch(`${API_BASE_URL}/api/analytics/class/${encodeURIComponent(classId)}`);
      if (!response.ok) {
        throw new Error(`Failed to fetch analytics: ${response.statusText}`);
      }
      const result = await response.json();
      if (result.status === 'success') {
        return result.data as ClassAnalyticsResponse;
      }
      throw new Error(result.message || 'Failed to fetch analytics');
    } catch (error) {
      console.error('Lỗi khi tải dữ liệu thống kê lớp:', error);
      throw error;
    }
  }
};
