/**
 * Sanitizes and normalizes phone number to WhatsApp international click-to-chat format.
 * Strips non-digits, normalizes Indian mobile numbers (with or without leading 0 / +91 / 0091) to '91<10-digits>'.
 * Returns null if the number is invalid, contains non-phone characters, or cannot be safely parsed.
 */
export function sanitizeWhatsAppPhone(phone: string): string | null {
  if (!phone || typeof phone !== 'string') return null;

  const trimmed = phone.trim();
  // Allow only valid phone characters: digits, plus, hyphens, spaces, and parentheses
  if (!/^[+\d\s().-]+$/.test(trimmed)) {
    return null;
  }

  let digits = trimmed.replace(/\D/g, '');

  // Strip international call prefix 00 (e.g. 0091... -> 91...)
  if (digits.startsWith('00')) {
    digits = digits.slice(2);
  }

  // Handle Indian domestic trunk prefix 0 (e.g. 09876543210 -> 9876543210)
  if (digits.startsWith('0') && digits.length === 11) {
    digits = digits.slice(1);
  }

  // Standard Indian 10-digit mobile number
  if (digits.length === 10) {
    return `91${digits}`;
  }

  // Indian 12-digit mobile number with 91 prefix
  if (digits.length === 12 && digits.startsWith('91')) {
    return digits;
  }

  // Generic international E.164 valid numbers (10 to 15 digits) without leading zero
  if (digits.length >= 10 && digits.length <= 15 && !digits.startsWith('0')) {
    return digits;
  }

  return null;
}

/**
 * Generates a safe WhatsApp click-to-chat URL.
 * Strictly returns an https://wa.me/... URL or null.
 * Never executes scripts or permits arbitrary URL redirects.
 */
export function buildWhatsAppUrl(phone: string, text: string): string | null {
  const cleanPhone = sanitizeWhatsAppPhone(phone);
  if (!cleanPhone) return null;
  const encodedText = encodeURIComponent(text.trim());
  return `https://wa.me/${cleanPhone}?text=${encodedText}`;
}
