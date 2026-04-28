/**
 * IOE Search Service
 * Sử dụng Perplexity API để tìm kiếm đề thi IOE trước khi sinh câu hỏi
 */

const PERPLEXITY_API_URL = 'https://api.perplexity.ai/chat/completions';
const REQUEST_TIMEOUT_MS = 240000; // 4 phút timeout
const MAX_RETRIES = 2; // Số lần thử lại

export interface IoeSearchResult {
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
 * Tìm kiếm đề thi IOE trên web bằng Perplexity API
 * @param classLevel Lớp học (3, 4, 5, ...)
 * @param round Vòng thi (school, district, provincial, national)
 * @returns Kết quả tìm kiếm với các dạng câu hỏi và ví dụ
 */
export async function searchIoeQuestions(
    classLevel: string,
    round: string
): Promise<IoeSearchResult> {
    const apiKey = (import.meta as any).env.VITE_PERPLEXITY_API_KEY;

    if (!apiKey) {
        console.warn('[IOE Search] Không có API key, bỏ qua tìm kiếm');
        return {
            success: true, // Trả về success để tiếp tục sinh đề
            content: '',
            error: undefined
        };
    }

    const roundVi = {
        school: 'vòng trường',
        district: 'vòng huyện quận',
        provincial: 'vòng tỉnh thành phố',
        national: 'vòng quốc gia'
    }[round] || round;

    // Rút gọn prompt để giảm thời gian xử lý
    const searchPrompt = `Tìm 3 dạng câu hỏi IOE lớp ${classLevel} ${roundVi} phổ biến nhất với 1 ví dụ mỗi dạng. Trả lời ngắn gọn.`;

    const requestBody = {
        model: 'sonar', // Model có web search
        messages: [
            {
                role: 'system',
                content: 'Bạn là chuyên gia IOE. Trả lời ngắn gọn và đi thẳng vào vấn đề.'
            },
            {
                role: 'user',
                content: searchPrompt
            }
        ],
        temperature: 0.3,
        max_tokens: 2048 // Giảm max_tokens để nhanh hơn
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

        } catch (error: unknown) {
            const normalizedError = error instanceof Error ? error : new Error(String(error));
            // Kiểm tra nếu là timeout (AbortError)
            const isTimeout = normalizedError.name === 'AbortError' || normalizedError.message?.includes('abort');

            if (isTimeout && attempt < MAX_RETRIES) {
                console.warn(`[IOE Search] Timeout lần ${attempt}, đang thử lại...`);
                continue; // Thử lại
            }

            console.error('[IOE Search] Error:', error);

            // Nếu đã hết retry hoặc lỗi khác, trả về success=true để app tiếp tục
            if (attempt === MAX_RETRIES) {
                console.warn('[IOE Search] Đã hết số lần thử, bỏ qua tìm kiếm');
                return {
                    success: true, // Vẫn trả về success để sinh đề không bị crash
                    content: '',
                    error: undefined
                };
            }
        }
    }

    // Fallback: trả về success để app tiếp tục hoạt động
    console.warn('[IOE Search] Không thể tìm kiếm, tiếp tục sinh đề bình thường');
    return {
        success: true,
        content: ''
    };
}
