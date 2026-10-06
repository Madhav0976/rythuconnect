/**
 * Phone number validation and normalization utility.
 * Accepts standard Indian numbers (10 digits) or international numbers (E.164, 10-15 digits).
 */
export function normalizePhoneNumber(rawPhone: string): string | null {
  if (!rawPhone || typeof rawPhone !== 'string') {
    return null;
  }

  // Remove whitespace, dashes, parentheses
  const cleaned = rawPhone.replace(/[\s\-()]/g, '');

  // 10-digit Indian mobile number starting with 6, 7, 8, or 9
  if (/^[6-9]\d{9}$/.test(cleaned)) {
    return `+91${cleaned}`;
  }

  // 12-digit number starting with 91 followed by 10-digit Indian number
  if (/^91[6-9]\d{9}$/.test(cleaned)) {
    return `+${cleaned}`;
  }

  // Already prefixed with + and 10 to 15 digits
  if (/^\+[1-9]\d{9,14}$/.test(cleaned)) {
    return cleaned;
  }

  return null;
}
