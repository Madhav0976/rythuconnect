/**
 * Client-side token storage abstraction.
 * Safely guards browser localStorage access against SSR and private browsing quotas.
 */

const AUTH_TOKEN_KEY = 'rythuconnect_auth_token';

export const tokenStorage = {
  /**
   * Retrieves the stored JWT authentication token.
   * Returns null if running in SSR environment or if no token is stored.
   */
  getToken(): string | null {
    if (typeof window === 'undefined') {
      return null;
    }
    try {
      const token = window.localStorage.getItem(AUTH_TOKEN_KEY);
      if (!token || token === 'undefined' || token === 'null' || token.trim() === '') {
        return null;
      }
      return token;
    } catch {
      return null;
    }
  },

  /**
   * Persists the JWT access token in client storage.
   */
  setToken(token: string): void {
    if (typeof window === 'undefined') {
      return;
    }
    try {
      window.localStorage.setItem(AUTH_TOKEN_KEY, token);
    } catch {
      // Browser storage quota exceeded or disabled
    }
  },

  /**
   * Removes the JWT token from client storage upon logout or session invalidation.
   */
  clearToken(): void {
    if (typeof window === 'undefined') {
      return;
    }
    try {
      window.localStorage.removeItem(AUTH_TOKEN_KEY);
    } catch {
      // Storage unavailable
    }
  },

  /**
   * Quick boolean check for presence of an authentication token.
   */
  hasToken(): boolean {
    return Boolean(this.getToken());
  },
};
