import { API_BASE_URL } from './config';
import { tokenStorage } from '../auth/tokenStorage';

export interface ApiRequestOptions extends Omit<RequestInit, 'body'> {
  body?: unknown;
  params?: Record<string, string | number | boolean | undefined>;
  timeoutMs?: number;
}

export class ApiError extends Error {
  constructor(
    public status: number,
    public message: string,
    public data?: unknown
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

type UnauthorizedListener = () => void;
let unauthorizedListener: UnauthorizedListener | null = null;

export function registerUnauthorizedListener(listener: UnauthorizedListener | null): void {
  unauthorizedListener = listener;
}

/**
 * Standard typed HTTP fetch wrapper for RythuConnect frontend.
 * Automatically injects authorization headers, serializes payloads, and normalizes errors.
 */
export async function apiClient<T = unknown>(
  endpoint: string,
  options: ApiRequestOptions = {}
): Promise<T> {
  const { body, params, headers, timeoutMs = 15000, ...customConfig } = options;

  // Format full URL with query parameters
  const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  const url = new URL(`${API_BASE_URL}${cleanEndpoint}`);

  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined) {
        url.searchParams.append(key, String(value));
      }
    });
  }

  // Setup abort controller for timeout safety
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  const token = tokenStorage.getToken();

  const reqHeaders: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(headers as Record<string, string>),
  };

  try {
    const response = await fetch(url.toString(), {
      ...customConfig,
      headers: reqHeaders,
      signal: controller.signal,
      body: body ? JSON.stringify(body) : undefined,
    });

    clearTimeout(timeoutId);

    const text = await response.text();
    let data: unknown;
    try {
      data = text ? JSON.parse(text) : {};
    } catch {
      data = { raw: text };
    }

    if (!response.ok) {
      if (response.status === 401 && token) {
        tokenStorage.clearToken();
        if (unauthorizedListener) {
          unauthorizedListener();
        }
      }

      const errorPayload = typeof data === 'object' && data !== null ? (data as Record<string, unknown>) : {};
      const errorMessage =
        typeof errorPayload.message === 'string'
          ? errorPayload.message
          : `Request failed with status ${response.status}`;
      throw new ApiError(response.status, errorMessage, data);
    }

    return data as T;
  } catch (err: unknown) {
    clearTimeout(timeoutId);

    if (err instanceof Error && err.name === 'AbortError') {
      throw new ApiError(408, 'Request timed out. Please check your internet connection.');
    }

    if (err instanceof ApiError) {
      throw err;
    }

    const message = err instanceof Error ? err.message : 'Network error occurred. Please try again.';
    throw new ApiError(0, message);
  }
}
