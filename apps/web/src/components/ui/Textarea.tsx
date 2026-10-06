import React from 'react';
import { cn } from '@/lib/utils/cn';

export interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  error?: boolean;
  fullWidth?: boolean;
}

export const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, error = false, fullWidth = true, disabled, ...props }, ref) => {
    return (
      <textarea
        ref={ref}
        disabled={disabled}
        aria-invalid={error ? 'true' : undefined}
        className={cn(
          'flex min-h-[96px] w-full rounded-xl border bg-white px-3.5 py-2.5 text-base text-slate-900',
          'placeholder:text-slate-400 transition-colors duration-150',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-1',
          'disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-500 disabled:border-slate-200',
          error
            ? 'border-red-500 focus-visible:border-red-600 focus-visible:ring-red-500/20'
            : 'border-slate-300 hover:border-slate-400 focus-visible:border-emerald-600 focus-visible:ring-emerald-600/20',
          !fullWidth && 'w-auto',
          className
        )}
        {...props}
      />
    );
  }
);

Textarea.displayName = 'Textarea';
