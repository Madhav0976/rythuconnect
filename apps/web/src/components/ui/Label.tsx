import React from 'react';
import { cn } from '@/lib/utils/cn';

export interface LabelProps extends React.LabelHTMLAttributes<HTMLLabelElement> {
  required?: boolean;
}

export const Label = React.forwardRef<HTMLLabelElement, LabelProps>(
  ({ className, required, children, ...props }, ref) => {
    return (
      <label
        ref={ref}
        className={cn(
          'block text-sm font-semibold text-slate-800 select-none mb-1.5',
          className
        )}
        {...props}
      >
        {children}
        {required && (
          <span className="text-red-600 ml-1 font-bold" aria-hidden="true">
            *
          </span>
        )}
      </label>
    );
  }
);

Label.displayName = 'Label';
