/**
 * Delivery Provider Interface for sending OTPs.
 * Can be swapped with SMS providers (Twilio, Fast2SMS) or WhatsApp API in production.
 */
export interface IOtpProvider {
  sendOtp(phone: string, otp: string): Promise<void>;
}

/**
 * Development & Testing OTP Provider.
 * Stores the generated OTP in an isolated in-memory test cache so that automated
 * tests can query it without ever leaking or logging the OTP in console/system logs.
 */
export class DevOtpProvider implements IOtpProvider {
  // Test cache: phone -> last generated OTP (never logged or exposed via public API)
  private testOtpCache = new Map<string, string>();

  async sendOtp(phone: string, otp: string): Promise<void> {
    // In development mode, capture for testing inspection without logging secrets
    this.testOtpCache.set(phone, otp);
  }

  /**
   * Inspection helper strictly for automated tests.
   */
  getTestOtp(phone: string): string | undefined {
    return this.testOtpCache.get(phone);
  }

  /**
   * Clear test cache.
   */
  clear(): void {
    this.testOtpCache.clear();
  }
}

export const defaultOtpProvider = new DevOtpProvider();
