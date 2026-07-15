export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

/**
 * session: Yêu cầu JWT (Bearer token)
 * public: Không cần xác thực (public endpoints)
 * legacyToken: [DEPRECATED] Giữ lại tạm thời cho một số route cũ
 */
export type AuthPolicy = 'session' | 'studentSession' | 'public' | 'legacyToken';

export type ApiPayload = Record<string, any>;

export interface ApiRoute {
  method: HttpMethod;
  auth: AuthPolicy;
  path: (payload: ApiPayload) => string;
  query?: (payload: ApiPayload) => URLSearchParams;
  body?: (action: string, payload: ApiPayload) => ApiPayload;
}

export type RouteRegistry = Record<string, ApiRoute>;
