import React from 'react';
import { cn } from '@/lib/utils/cn';
import { Spinner } from './Spinner';

export type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
export type ButtonSize = 'sm' | 'md' | 'lg';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  isLoading?: boolean;
  fullWidth?: boolean;
}

const variantStyles: Record<ButtonVariant, string> = {
  primary:
    'bg-emerald-700 hover:bg-emerald-800 active:bg-emerald-900 text-white shadow-sm border border-transparent focus-visible:ring-emerald-600',
  secondary:
    'bg-amber-700 hover:bg-amber-800 active:bg-amber-900 text-white shadow-sm border border-transparent focus-visible:ring-amber-600',
  outline:
    'bg-white hover:bg-slate-50 active:bg-slate-100 text-slate-800 border border-slate-300 shadow-xs focus-visible:ring-slate-400',
  ghost:
    'bg-transparent hover:bg-slate-100 active:bg-slate-200 text-slate-700 border border-transparent focus-visible:ring-slate-400',
  danger:
    'bg-red-600 hover:bg-red-700 active:bg-red-800 text-white shadow-sm border border-transparent focus-visible:ring-red-600',
};

const sizeStyles: Record<ButtonSize, string> = {
  sm: 'text-sm py-2 px-3.5 min-h-[38px] rounded-lg gap-1.5',
  md: 'text-base py-3 px-5 min-h-[48px] rounded-xl gap-2 font-medium', // Satisfies 48px touch target
  lg: 'text-lg py-3.5 px-6 min-h-[52px] rounded-xl gap-2.5 font-semibold',
};

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      variant = 'primary',
      size = 'md',
      isLoading = false,
      fullWidth = false,
      disabled,
      className,
      children,
      type = 'button',
      ...props
    },
    ref
  ) => {
    const isDisabled = disabled || isLoading;

    return (
      <button
        ref={ref}
        type={type}
        disabled={isDisabled}
        className={cn(
          'inline-flex items-center justify-center select-none transition-colors duration-150',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2',
          'cursor-pointer disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:bg-current',
          variantStyles[variant],
          sizeStyles[size],
          fullWidth && 'w-full',
          className
        )}
        {...props}
      >
        {isLoading && <Spinner size="sm" className="shrink-0" />}
        {children}
      </button>
    );
  }
);

Button.displayName = 'Button';
