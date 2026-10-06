'use client';

import React from 'react';
import { useTranslation, LanguageOption } from '@/context/LanguageContext';
import { cn } from '@/lib/utils/cn';

export interface LanguageSwitcherProps {
  className?: string;
  variant?: 'compact' | 'full';
}

export const LanguageSwitcher: React.FC<LanguageSwitcherProps> = ({
  className,
  variant = 'compact',
}) => {
  const { language, setLanguage, languages } = useTranslation();

  return (
    <div
      role="group"
      aria-label="Language selector"
      className={cn('inline-flex items-center rounded-xl bg-slate-100 p-1 border border-slate-200/80', className)}
    >
      {languages.map((item: LanguageOption) => {
        const isActive = language === item.code;
        return (
          <button
            key={item.code}
            type="button"
            onClick={() => setLanguage(item.code)}
            aria-pressed={isActive}
            className={cn(
              'rounded-lg px-2.5 py-1 text-xs font-semibold transition-all duration-150 select-none cursor-pointer',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600 focus-visible:ring-offset-1',
              isActive
                ? 'bg-white text-emerald-800 shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/50'
            )}
          >
            <span>{variant === 'compact' ? item.nativeLabel : `${item.label} (${item.nativeLabel})`}</span>
          </button>
        );
      })}
    </div>
  );
};
