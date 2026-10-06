'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { LanguageCode } from '@rythuconnect/types';
import enDict from '../locales/en.json';
import teDict from '../locales/te.json';
import hiDict from '../locales/hi.json';

const dictionaries: Record<LanguageCode, Record<string, unknown>> = {
  [LanguageCode.EN]: enDict,
  [LanguageCode.TE]: teDict,
  [LanguageCode.HI]: hiDict,
};

const LANG_STORAGE_KEY = 'rythuconnect_lang';

export interface LanguageOption {
  code: LanguageCode;
  label: string;
  nativeLabel: string;
}

export const SUPPORTED_LANGUAGES: LanguageOption[] = [
  { code: LanguageCode.EN, label: 'English', nativeLabel: 'English' },
  { code: LanguageCode.TE, label: 'Telugu', nativeLabel: 'తెలుగు' },
  { code: LanguageCode.HI, label: 'Hindi', nativeLabel: 'हिन्दी' },
];

interface LanguageContextType {
  language: LanguageCode;
  setLanguage: (lang: LanguageCode) => void;
  t: (key: string, defaultText?: string) => string;
  languages: LanguageOption[];
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

/**
 * Resolves a dot-notated key path against a dictionary object.
 */
function resolveKey(obj: Record<string, unknown>, path: string): string | undefined {
  const parts = path.split('.');
  let current: unknown = obj;

  for (const part of parts) {
    if (typeof current !== 'object' || current === null) {
      return undefined;
    }
    current = (current as Record<string, unknown>)[part];
  }

  return typeof current === 'string' ? current : undefined;
}

function getInitialLanguage(): LanguageCode {
  if (typeof window === 'undefined') {
    return LanguageCode.EN;
  }
  try {
    const stored = window.localStorage.getItem(LANG_STORAGE_KEY) as LanguageCode | null;
    if (stored && Object.values(LanguageCode).includes(stored)) {
      return stored;
    }
  } catch {
    // Storage unavailable
  }
  return LanguageCode.EN;
}

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [language, setLanguageState] = useState<LanguageCode>(getInitialLanguage);

  // Synchronize document.documentElement.lang with active language
  useEffect(() => {
    if (typeof document !== 'undefined') {
      document.documentElement.lang = language;
    }
  }, [language]);

  const setLanguage = (newLang: LanguageCode) => {
    setLanguageState(newLang);
    try {
      window.localStorage.setItem(LANG_STORAGE_KEY, newLang);
    } catch {
      // Storage unavailable
    }
  };

  /**
   * Translates key with fallback to English, then defaultText, then key itself.
   */
  const t = (key: string, defaultText?: string): string => {
    const currentDict = dictionaries[language] || dictionaries[LanguageCode.EN];
    const resolved = resolveKey(currentDict, key);

    if (resolved !== undefined) {
      return resolved;
    }

    // Fallback to English dictionary if currently in te or hi
    if (language !== LanguageCode.EN) {
      const enFallback = resolveKey(dictionaries[LanguageCode.EN], key);
      if (enFallback !== undefined) {
        return enFallback;
      }
    }

    return defaultText || key;
  };

  return (
    <LanguageContext.Provider
      value={{
        language,
        setLanguage,
        t,
        languages: SUPPORTED_LANGUAGES,
      }}
    >
      {children}
    </LanguageContext.Provider>
  );
};

export function useTranslation(): LanguageContextType {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useTranslation must be used within a LanguageProvider');
  }
  return context;
}
