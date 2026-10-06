import React from 'react';
import { cn } from '@/lib/utils/cn';

export interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  error?: boolean;
  fullWidth?: boolean;
}

export const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
  ({ className, error = false, fullWidth = true, disabled, children, ...props }, ref) => {
    return (
      <div className={cn('relative flex items-center', fullWidth ? 'w-full' : 'inline-flex')}>
        <select
          ref={ref}
          disabled={disabled}
          aria-invalid={error ? 'true' : undefined}
          className={cn(
            'flex h-12 w-full appearance-none rounded-xl border bg-white px-3.5 pr-10 py-2.5 text-base text-slate-900',
            'transition-colors duration-150 cursor-pointer',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-1',
            'disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-500 disabled:border-slate-200',
            error
              ? 'border-red-500 focus-visible:border-red-600 focus-visible:ring-red-500/20'
              : 'border-slate-300 hover:border-slate-400 focus-visible:border-emerald-600 focus-visible:ring-emerald-600/20',
            className
          )}
          {...props}
        >
          {children}
        </select>
        <div className="pointer-events-none absolute right-3.5 flex items-center text-slate-500">
          <svg
            className="w-4 h-4 fill-none stroke-current stroke-2"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </div>
    );
  }
);

Select.displayName = 'Select';
