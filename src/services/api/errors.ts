export class ApiError extends Error {
    readonly status: number;

    constructor(message: string, status: number) {
        super(message);
        this.name = 'ApiError';
        this.status = status;
    }
}

export async function toApiError(response: Response): Promise<Error> {
    let errorMessage = `Lỗi kết nối Server: ${response.statusText}`;
    let backendMessage = '';

    try {
        const errData = await response.clone().json();
        if (errData && (errData as any).message) {
            backendMessage = String((errData as any).message);
        }
    } catch {}

    if (response.status === 401 && (!backendMessage || backendMessage === 'Unauthorized')) {
        return new ApiError('Không có quyền truy cập API (Authentication failed)', response.status);
    }

    if (backendMessage) return new ApiError(backendMessage, response.status);

    const text = await response.text().catch(() => '');
    if (text) errorMessage += ` - ${text.substring(0, 100)}`;
    return new ApiError(errorMessage, response.status);
}

export function normalizeNetworkError(error: unknown): Error {
    if (
        error instanceof TypeError &&
        error.message === 'Failed to fetch'
    ) {
        return new Error(
            'Không thể kết nối mạng hoặc lỗi CORS. Vui lòng kiểm tra kết nối.',
        );
    }
    return error instanceof Error ? error : new Error(String(error));
}
