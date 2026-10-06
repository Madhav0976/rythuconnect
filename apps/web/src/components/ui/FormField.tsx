import React from 'react';
import { Label } from './Label';
import { cn } from '@/lib/utils/cn';

export interface FormFieldProps extends React.HTMLAttributes<HTMLDivElement> {
  id?: string;
  label?: string;
  required?: boolean;
  error?: string;
  hint?: string;
  children: React.ReactNode;
}

export const FormField: React.FC<FormFieldProps> = ({
  id,
  label,
  required,
  error,
  hint,
  className,
  children,
  ...props
}) => {
  const errorId = id && error ? `${id}-error` : undefined;
  const hintId = id && hint ? `${id}-hint` : undefined;
  const describedBy = [errorId, hintId].filter(Boolean).join(' ') || undefined;

  // Clone child to inject id and aria-describedby if matching single child element
  const renderedChild = React.isValidElement<Record<string, unknown>>(children)
    ? React.cloneElement(children, {
        id: id || (children.props.id as string | undefined),
        'aria-describedby': describedBy,
        error: Boolean(error) || (children.props.error as boolean | undefined),
      })
    : children;

  return (
    <div className={cn('flex flex-col w-full space-y-1.5', className)} {...props}>
      {label && (
        <Label htmlFor={id} required={required}>
          {label}
        </Label>
      )}
      {renderedChild}
      {error && (
        <p id={errorId} className="text-sm font-medium text-red-600 flex items-center gap-1 mt-1">
          <span aria-hidden="true">⚠</span>
          <span>{error}</span>
        </p>
      )}
      {!error && hint && (
        <p id={hintId} className="text-xs text-slate-500 mt-1">
          {hint}
        </p>
      )}
    </div>
  );
};
