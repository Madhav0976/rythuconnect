import React from 'react';
import { cn } from '@/lib/utils/cn';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  error?: boolean;
  leftAddon?: React.ReactNode;
  rightAddon?: React.ReactNode;
  fullWidth?: boolean;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  (
    {
      className,
      type = 'text',
      error = false,
      leftAddon,
      rightAddon,
      fullWidth = true,
      disabled,
      ...props
    },
    ref
  ) => {
    return (
      <div className={cn('relative flex items-center', fullWidth ? 'w-full' : 'inline-flex')}>
        {leftAddon && (
          <div className="absolute left-3.5 flex items-center pointer-events-none text-slate-500 z-10 select-none">
            {leftAddon}
          </div>
        )}
        <input
          ref={ref}
          type={type}
          disabled={disabled}
          aria-invalid={error ? 'true' : undefined}
          className={cn(
            'flex h-12 w-full rounded-xl border bg-white px-3.5 py-2.5 text-base text-slate-900',
            'placeholder:text-slate-400 transition-colors duration-150',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-1',
            'disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-500 disabled:border-slate-200',
            Boolean(leftAddon) && 'pl-11',
            Boolean(rightAddon) && 'pr-11',
            error
              ? 'border-red-500 focus-visible:border-red-600 focus-visible:ring-red-500/20'
              : 'border-slate-300 hover:border-slate-400 focus-visible:border-emerald-600 focus-visible:ring-emerald-600/20',
            className
          )}
          {...props}
        />
        {rightAddon && (
          <div className="absolute right-3.5 flex items-center text-slate-500 z-10">
            {rightAddon}
          </div>
        )}
      </div>
    );
  }
);

Input.displayName = 'Input';
