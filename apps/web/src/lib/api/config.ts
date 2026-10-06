/**
 * Centralized API configuration for RythuConnect frontend.
 * Reads public NEXT_PUBLIC_API_URL or defaults to local server endpoint.
 */
export const API_BASE_URL: string =
  process.env.NEXT_PUBLIC_API_URL?.trim() || 'http://localhost:5000/api';
