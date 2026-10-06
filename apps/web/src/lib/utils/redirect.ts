import { UserRole } from '@rythuconnect/types';

/**
 * Validates and sanitizes a redirect target URL to prevent open redirect vulnerabilities.
 * Only internal, relative paths starting with a single '/' are permitted.
 *
 * Disallowed patterns:
 * - External absolute URLs: 'https://evil.com', 'http://evil.com'
 * - Protocol-relative URLs: '//evil.com'
 * - Windows-style backslash bypasses: '/\\evil.com'
 * - Execution schemes: 'javascript:...', 'data:...'
 * - CRLF / header injection attempts containing newlines or control characters
 *
 * @param url Candidate redirect URL from query parameter
 * @param fallback Safe internal fallback path
 * @returns Safe sanitized internal URL
 */
export function getSafeRedirect(url: string | null | undefined, fallback: string): string {
  if (!url || typeof url !== 'string') {
    return fallback;
  }

  const trimmed = url.trim();

  // Must begin with single '/' and never '//' or '/\'
  if (!trimmed.startsWith('/') || trimmed.startsWith('//') || trimmed.startsWith('/\\')) {
    return fallback;
  }

  // Prevent control characters and CRLF injection
  if (/[\r\n\t]/.test(trimmed)) {
    return fallback;
  }

  try {
    const parsed = new URL(trimmed, 'https://dummy.local');
    if (parsed.origin !== 'https://dummy.local') {
      return fallback;
    }
    return `${parsed.pathname}${parsed.search}${parsed.hash}`;
  } catch {
    return fallback;
  }
}

/**
 * Returns the default dashboard destination based on user role.
 */
export function getDefaultDashboardForRole(role?: UserRole): string {
  switch (role) {
    case UserRole.FARMER:
      return '/farmer/dashboard';
    case UserRole.BUYER:
      return '/buyer/marketplace';
    default:
      return '/profile';
  }
}
