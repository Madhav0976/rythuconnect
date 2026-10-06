import React from 'react';
import { cn } from '@/lib/utils/cn';

export interface PhoneInputProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'onChange' | 'value'> {
  value?: string; // 10-digit digits only string or E.164 string
  onChange?: (rawDigits: string, normalized: string) => void;
  error?: boolean;
}

/**
 * Normalizes input string to clean 10-digit Indian mobile number.
 */
export function sanitizeIndianPhone(input: string): string {
  // Extract all numeric characters
  let digits = input.replace(/\D/g, '');
  // Strip any leading zeros
  while (digits.startsWith('0')) {
    digits = digits.slice(1);
  }
  // Strip leading 91 if full country code pasted (12 digits or more)
  if (digits.startsWith('91') && digits.length > 10) {
    digits = digits.slice(2);
  }
  // Strip any leading zeros again if present after country code
  while (digits.startsWith('0')) {
    digits = digits.slice(1);
  }
  return digits.slice(0, 10);
}

export function toE164IndianPhone(tenDigits: string): string {
  return `+91${tenDigits}`;
}

export const PhoneInput = React.forwardRef<HTMLInputElement, PhoneInputProps>(
  ({ className, value = '', onChange, error = false, disabled, id, ...props }, ref) => {
    const rawDigits = sanitizeIndianPhone(value);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const sanitized = sanitizeIndianPhone(e.target.value);
      const normalized = sanitized.length === 10 ? toE164IndianPhone(sanitized) : '';
      onChange?.(sanitized, normalized);
    };

    return (
      <div className="relative flex items-center w-full">
        {/* Fixed Indian Country Code Prefix */}
        <div
          className={cn(
            'flex h-12 items-center justify-center rounded-l-xl border border-r-0 bg-slate-100/90 px-3.5 text-sm font-semibold text-slate-700 select-none shrink-0',
            error ? 'border-red-500 bg-red-50/50 text-red-900' : 'border-slate-300',
            disabled && 'bg-slate-200/60 text-slate-400 border-slate-200'
          )}
          aria-hidden="true"
        >
          <span className="mr-1.5" role="img" aria-label="India flag">
            🇮🇳
          </span>
          <span>+91</span>
        </div>

        {/* 10-Digit Mobile Number Input */}
        <input
          ref={ref}
          id={id}
          type="tel"
          inputMode="numeric"
          pattern="[0-9]*"
          maxLength={10}
          value={rawDigits}
          onChange={handleChange}
          disabled={disabled}
          placeholder="9876543210"
          aria-label="10-digit mobile phone number"
          aria-invalid={error ? 'true' : undefined}
          className={cn(
            'flex h-12 w-full rounded-r-xl border bg-white px-3.5 py-2.5 text-base tracking-wider font-mono text-slate-900',
            'placeholder:text-slate-400 placeholder:font-sans transition-colors duration-150',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-1',
            'disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-500 disabled:border-slate-200',
            error
              ? 'border-red-500 focus-visible:border-red-600 focus-visible:ring-red-500/20'
              : 'border-slate-300 hover:border-slate-400 focus-visible:border-emerald-600 focus-visible:ring-emerald-600/20',
            className
          )}
          {...props}
        />
      </div>
    );
  }
);

PhoneInput.displayName = 'PhoneInput';
