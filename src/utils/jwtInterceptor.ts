/**
 * JWT Interceptor
 * 
 * Handles JWT token expiration and authentication errors
 * - Intercepts 401 errors and shows user-friendly messages
 * - Redirects to login when session expires
 * - Can be extended to auto-refresh tokens
 */

import { showError } from './toast';

export interface JWTInterceptorConfig {
    onUnauthorized?: () => void;
    showToast?: boolean;
    redirectOnUnauthorized?: boolean;
}

/**
 * Wrap fetch calls to intercept 401 errors
 */
export async function fetchWithJWTInterceptor(
    url: string,
    options: RequestInit = {},
    config: JWTInterceptorConfig = {}
): Promise<Response> {
    const { onUnauthorized, showToast = true, redirectOnUnauthorized = false } = config;

    try {
        const response = await fetch(url, options);

        // Intercept 401 Unauthorized
        if (response.status === 401) {
            if (showToast) {
                showError('Không có quyền truy cập hoặc phiên đăng nhập không hợp lệ. Vui lòng đăng nhập lại nếu cần.');
            }

            // Call custom handler if provided
            if (onUnauthorized) {
                onUnauthorized();
            } else if (redirectOnUnauthorized) {
                // Default: redirect to home after a short delay
                setTimeout(() => {
                    window.location.href = '/';
                }, 2000);
            }
        }

        return response;
    } catch (error) {
        throw error;
    }
}

/**
 * Check if JWT token is about to expire
 * Returns true if token expires in less than 1 hour
 */
export function isJWTExpiringSoon(): boolean {
    // Get auth_token cookie
    const cookies = document.cookie.split(';');
    const authCookie = cookies.find(c => c.trim().startsWith('auth_token='));
    
    if (!authCookie) {
        return true; // No token = expired
    }

    try {
        const token = authCookie.split('=')[1];
        
        // Decode JWT payload (without verification - just to check expiry)
        const payload = JSON.parse(atob(token.split('.')[1]));
        
        if (!payload.exp) {
            return false; // No expiry = doesn't expire
        }

        const expiryTime = payload.exp * 1000; // Convert to milliseconds
        const now = Date.now();
        const oneHour = 60 * 60 * 1000;

        const timeRemaining = expiryTime - now;

        return timeRemaining > 0 && timeRemaining < oneHour;
    } catch (error) {
        console.error('[JWT] Failed to decode token:', error);
        return true; // If can't decode, assume expired
    }
}

/**
 * Check if user is authenticated (has valid JWT cookie)
 */
export function isAuthenticated(): boolean {
    const cookies = document.cookie.split(';');
    const authCookie = cookies.find(c => c.trim().startsWith('auth_token='));
    return !!authCookie;
}

/**
 * Get JWT token from cookie
 */
export function getJWTToken(): string | null {
    const cookies = document.cookie.split(';');
    const authCookie = cookies.find(c => c.trim().startsWith('auth_token='));
    
    if (!authCookie) {
        return null;
    }

    return authCookie.split('=')[1];
}

/**
 * Show warning if JWT is expiring soon
 */
export function checkAndWarnJWTExpiry(): void {
    if (!isAuthenticated()) {
        return;
    }

    if (isJWTExpiringSoon()) {
        showError('Phiên đăng nhập sắp hết hạn. Vui lòng lưu công việc và đăng nhập lại.', 10000);
    }
}
