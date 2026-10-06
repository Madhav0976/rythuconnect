export interface OtpRecord {
  phone: string;
  otp: string;
  expiresAt: number; // UNIX timestamp ms
  createdAt: number; // UNIX timestamp ms
  attempts: number;
}

/**
 * Storage Abstraction for OTP lifecycle management.
 * Designed so that Redis or another distributed cache can replace this in production
 * without modifying controllers or business logic.
 */
export interface IOtpStore {
  set(record: OtpRecord): Promise<void>;
  get(phone: string): Promise<OtpRecord | null>;
  incrementAttempts(phone: string): Promise<number>;
  delete(phone: string): Promise<void>;
  clear(): Promise<void>;
}

/**
 * In-Memory OTP Store (Development & Testing only).
 * NOTE: This implementation is not horizontally scalable across distributed instances.
 * In a multi-instance production environment, swap with a Redis-backed IOtpStore.
 */
export class InMemoryOtpStore implements IOtpStore {
  private store = new Map<string, OtpRecord>();

  async set(record: OtpRecord): Promise<void> {
    this.store.set(record.phone, { ...record });
  }

  async get(phone: string): Promise<OtpRecord | null> {
    const record = this.store.get(phone);
    if (!record) return null;

    // Check expiry lazily
    if (Date.now() > record.expiresAt) {
      this.store.delete(phone);
      return null;
    }

    return { ...record };
  }

  async incrementAttempts(phone: string): Promise<number> {
    const record = this.store.get(phone);
    if (!record) return 0;
    record.attempts += 1;
    this.store.set(phone, record);
    return record.attempts;
  }

  async delete(phone: string): Promise<void> {
    this.store.delete(phone);
  }

  async clear(): Promise<void> {
    this.store.clear();
  }
}

export const defaultOtpStore = new InMemoryOtpStore();
