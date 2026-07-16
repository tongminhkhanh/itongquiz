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
        return new Error('Không có quyền truy cập API (Authentication failed)');
    }

    if (backendMessage) return new Error(backendMessage);

    const text = await response.text().catch(() => '');
    if (text) errorMessage += ` - ${text.substring(0, 100)}`;
    return new Error(errorMessage);
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
