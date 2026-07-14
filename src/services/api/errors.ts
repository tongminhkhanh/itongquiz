export async function toApiError(response: Response): Promise<Error> {
    let errorMessage = `Lỗi kết nối Server: ${response.statusText}`;

    if (response.status === 401) {
        return new Error('Không có quyền truy cập API (Authentication failed)');
    }

    try {
        const errData = await response.json();
        if (errData && (errData as any).message) {
            errorMessage = (errData as any).message;
        }
    } catch {
        const text = await response.text().catch(() => '');
        if (text) errorMessage += ` - ${text.substring(0, 100)}`;
    }

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
