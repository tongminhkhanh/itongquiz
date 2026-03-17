/**
 * Trạng Nguyên Search Service
 * Sử dụng Perplexity API để tìm kiếm đề thi Trạng Nguyên trước khi sinh câu hỏi
 */

const PERPLEXITY_API_URL = 'https://api.perplexity.ai/chat/completions';
const REQUEST_TIMEOUT_MS = 120000; // 2 phút timeout
const MAX_RETRIES = 2;

export interface TrangNguyenSearchResult {
    success: boolean;
    content: string;
    error?: string;
}

/**
 * Helper function để fetch với timeout
 */
async function fetchWithTimeout(
    url: string,
    options: RequestInit,
    timeoutMs: number
): Promise<Response> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    try {
        const response = await fetch(url, {
            ...options,
            signal: controller.signal
        });
        return response;
    } finally {
        clearTimeout(timeoutId);
    }
}

/**
 * Tìm kiếm đề thi Trạng Nguyên trên web bằng Perplexity API
 * @param classLevel Lớp học (1, 2, 3, 4, 5)
 * @param round Vòng thi (school, district, provincial, national)
 * @param topic Chủ đề cụ thể (optional)
 * @returns Kết quả tìm kiếm với các dạng câu hỏi và ví dụ
 */
export async function searchTrangNguyenQuestions(
    classLevel: string,
    round: string = 'school',
    topic?: string
): Promise<TrangNguyenSearchResult> {
    const apiKey = (import.meta as any).env.VITE_PERPLEXITY_API_KEY;

    if (!apiKey) {
        console.warn('[TN Search] Không có API key, bỏ qua tìm kiếm');
        return {
            success: true,
            content: '',
            error: undefined
        };
    }

    const roundVi: Record<string, string> = {
        school: 'vòng trường',
        district: 'vòng huyện quận',
        provincial: 'vòng tỉnh thành phố',
        national: 'vòng quốc gia'
    };

    const roundText = roundVi[round] || round;
    const topicText = topic ? ` chủ đề "${topic}"` : '';

    // Prompt tìm kiếm tối ưu cho Trạng Nguyên - từ 2020 đến nay
    const searchPrompt = `Tìm 5-8 câu hỏi thi Trạng Nguyên Tiếng Việt lớp ${classLevel} ${roundText}${topicText} từ năm 2020 đến 2026.

Yêu cầu:
1. Tìm câu hỏi THẬT từ các đề thi đã được công bố
2. Mỗi câu hỏi cần có đầy đủ: đề bài, các lựa chọn (nếu có), đáp án đúng
3. Ưu tiên các nguồn: trangnguyen.edu.vn, violympic.vn, hoc247.vn, vndoc.com
4. Các dạng cần tìm: Trắc nghiệm, Điền từ vào chỗ trống, Ghép nghĩa, Sắp xếp câu, Đọc hiểu

Trả về format:
---
Câu 1: [Nội dung câu hỏi]
A. [Đáp án A]
B. [Đáp án B]  
C. [Đáp án C]
D. [Đáp án D]
Đáp án đúng: [A/B/C/D]
---`;

    const requestBody = {
        model: 'sonar',
        messages: [
            {
                role: 'system',
                content: 'Bạn là chuyên gia về cuộc thi Trạng Nguyên Tiếng Việt cho học sinh tiểu học Việt Nam. Trả lời ngắn gọn và đi thẳng vào vấn đề.'
            },
            {
                role: 'user',
                content: searchPrompt
            }
        ],
        temperature: 0.3,
        max_tokens: 2048
    };

    // Retry logic
    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
        try {

            const response = await fetchWithTimeout(
                PERPLEXITY_API_URL,
                {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${apiKey}`,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(requestBody)
                },
                REQUEST_TIMEOUT_MS
            );

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                console.error('Perplexity Search Error:', errorData);

                if (response.status === 401) {
                    return {
                        success: false,
                        content: '',
                        error: 'Perplexity API key không hợp lệ'
                    };
                }

                return {
                    success: false,
                    content: '',
                    error: `Lỗi tìm kiếm: ${response.status} ${response.statusText}`
                };
            }

            const data = await response.json();
            const content = data.choices?.[0]?.message?.content || '';

            return {
                success: true,
                content: content
            };

        } catch (error: any) {
            const isTimeout = error.name === 'AbortError' || error.message?.includes('abort');

            if (isTimeout && attempt < MAX_RETRIES) {
                console.warn(`[TN Search] Timeout lần ${attempt}, đang thử lại...`);
                continue;
            }

            console.error('[TN Search] Error:', error);

            if (attempt === MAX_RETRIES) {
                console.warn('[TN Search] Đã hết số lần thử, bỏ qua tìm kiếm');
                return {
                    success: true,
                    content: '',
                    error: undefined
                };
            }
        }
    }

    // Fallback
    console.warn('[TN Search] Không thể tìm kiếm, tiếp tục sinh đề bình thường');
    return {
        success: true,
        content: ''
    };
}

/**
 * Enrich generation prompt with search results
 */
export function enrichPromptWithSearchResults(
    basePrompt: string,
    searchResult: TrangNguyenSearchResult
): string {
    if (!searchResult.success || !searchResult.content) {
        return basePrompt;
    }

    return `${basePrompt}

===== THAM KHẢO TỪ ĐỀ THI THẬT =====
Dưới đây là các dạng câu hỏi phổ biến từ đề thi Trạng Nguyên thực tế:

${searchResult.content}

⚠️ LƯU Ý: Hãy tham khảo format và phong cách của các ví dụ trên, nhưng KHÔNG copy nguyên văn. Tự tạo câu hỏi mới với nội dung tương tự.
===== KẾT THÚC THAM KHẢO =====`;
}
