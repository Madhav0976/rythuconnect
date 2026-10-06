import React, { useRef, useEffect } from 'react';
import { cn } from '@/lib/utils/cn';

export interface OTPInputProps {
  length?: number;
  value?: string;
  onChange?: (code: string) => void;
  onComplete?: (code: string) => void;
  disabled?: boolean;
  error?: boolean;
  autoFocus?: boolean;
  className?: string;
}

export const OTPInput: React.FC<OTPInputProps> = ({
  length = 6,
  value = '',
  onChange,
  onComplete,
  disabled = false,
  error = false,
  autoFocus = true,
  className,
}) => {
  const inputsRef = useRef<(HTMLInputElement | null)[]>([]);

  // Split value into array of characters, padding with empty strings
  const digits = Array.from({ length }, (_, i) => value[i] || '');

  useEffect(() => {
    if (autoFocus && inputsRef.current[0]) {
      inputsRef.current[0].focus();
    }
  }, [autoFocus]);

  const updateCode = (newDigits: string[], focusIndex?: number) => {
    const fullCode = newDigits.join('');
    onChange?.(fullCode);

    if (fullCode.length === length) {
      onComplete?.(fullCode);
    }

    if (focusIndex !== undefined && focusIndex >= 0 && focusIndex < length) {
      inputsRef.current[focusIndex]?.focus();
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (disabled) return;

    if (e.key === 'Backspace') {
      e.preventDefault();
      const newDigits = [...digits];
      if (newDigits[index]) {
        // Clear current cell
        newDigits[index] = '';
        updateCode(newDigits, index);
      } else if (index > 0) {
        // Clear previous cell and shift focus left
        newDigits[index - 1] = '';
        updateCode(newDigits, index - 1);
      }
    } else if (e.key === 'ArrowLeft' && index > 0) {
      e.preventDefault();
      inputsRef.current[index - 1]?.focus();
    } else if (e.key === 'ArrowRight' && index < length - 1) {
      e.preventDefault();
      inputsRef.current[index + 1]?.focus();
    }
  };

  const handleChange = (index: number, e: React.ChangeEvent<HTMLInputElement>) => {
    if (disabled) return;
    const inputValue = e.target.value;
    const numericChars = inputValue.replace(/\D/g, '');

    if (!numericChars) {
      const newDigits = [...digits];
      newDigits[index] = '';
      updateCode(newDigits, index);
      return;
    }

    // If single digit typed
    if (numericChars.length === 1) {
      const newDigits = [...digits];
      newDigits[index] = numericChars;
      updateCode(newDigits, index + 1 < length ? index + 1 : index);
      return;
    }

    // If multiple digits (autofilled or pasted into single cell)
    handlePasteData(numericChars, index);
  };

  const handlePaste = (index: number, e: React.ClipboardEvent<HTMLInputElement>) => {
    if (disabled) return;
    e.preventDefault();
    const pastedData = e.clipboardData.getData('text/plain').replace(/\D/g, '');
    if (pastedData) {
      handlePasteData(pastedData, index);
    }
  };

  const handlePasteData = (pastedDigits: string, startIndex: number) => {
    const newDigits = [...digits];
    let nextFocus = startIndex;

    for (let i = 0; i < pastedDigits.length && startIndex + i < length; i++) {
      newDigits[startIndex + i] = pastedDigits[i];
      nextFocus = startIndex + i + 1;
    }

    const focusIndex = Math.min(nextFocus, length - 1);
    updateCode(newDigits, focusIndex);
  };

  return (
    <div
      role="group"
      aria-label="One-Time Password 6-digit input"
      className={cn('flex items-center justify-center gap-1.5 sm:gap-2.5', className)}
    >
      {Array.from({ length }).map((_, index) => {
        const isFilled = Boolean(digits[index]);
        return (
          <input
            key={index}
            ref={(el) => {
              inputsRef.current[index] = el;
            }}
            type="text"
            inputMode="numeric"
            pattern="[0-9]*"
            maxLength={1}
            autoComplete={index === 0 ? 'one-time-code' : 'off'}
            disabled={disabled}
            aria-label={`Digit ${index + 1} of ${length}`}
            aria-invalid={error ? 'true' : undefined}
            value={digits[index] || ''}
            onKeyDown={(e) => handleKeyDown(index, e)}
            onChange={(e) => handleChange(index, e)}
            onPaste={(e) => handlePaste(index, e)}
            onFocus={(e) => e.target.select()}
            className={cn(
              'h-12 w-9 xs:w-10 sm:h-14 sm:w-11 md:w-12 text-center text-lg sm:text-2xl font-bold font-mono rounded-xl border bg-white',
              'transition-all duration-150 select-none cursor-text',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-1',
              'disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-400 disabled:border-slate-200',
              error
                ? 'border-red-500 text-red-900 focus-visible:border-red-600 focus-visible:ring-red-500/20'
                : isFilled
                  ? 'border-emerald-600 text-slate-900 bg-emerald-50/20'
                  : 'border-slate-300 hover:border-slate-400 focus-visible:border-emerald-600 focus-visible:ring-emerald-600/20'
            )}
          />
        );
      })}
    </div>
  );
};
