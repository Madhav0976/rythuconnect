import React from 'react';
import { cn } from '@/lib/utils/cn';

export type AlertVariant = 'info' | 'success' | 'warning' | 'error';

export interface AlertProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: AlertVariant;
  title?: string;
}

const variantStyles: Record<AlertVariant, { container: string; title: string }> = {
  info: {
    container: 'bg-sky-50 border-sky-200 text-sky-900',
    title: 'text-sky-950 font-semibold',
  },
  success: {
    container: 'bg-emerald-50 border-emerald-200 text-emerald-900',
    title: 'text-emerald-950 font-semibold',
  },
  warning: {
    container: 'bg-amber-50 border-amber-200 text-amber-900',
    title: 'text-amber-950 font-semibold',
  },
  error: {
    container: 'bg-red-50 border-red-200 text-red-900',
    title: 'text-red-950 font-semibold',
  },
};

export const Alert: React.FC<AlertProps> = ({
  variant = 'info',
  title,
  className,
  children,
  ...props
}) => {
  return (
    <div
      role="alert"
      className={cn(
        'p-4 rounded-xl border flex flex-col gap-1 text-sm',
        variantStyles[variant].container,
        className
      )}
      {...props}
    >
      {title && <div className={variantStyles[variant].title}>{title}</div>}
      <div className="leading-relaxed">{children}</div>
    </div>
  );
};
