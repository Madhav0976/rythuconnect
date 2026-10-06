'use client';

import React from 'react';
import Link from 'next/link';
import { useTranslation } from '@/context/LanguageContext';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, Button } from '@/components/ui';

export default function UnauthorizedPage() {
  const { t } = useTranslation();

  return (
    <div className="flex flex-1 items-center justify-center p-4 sm:p-6 lg:p-8 bg-[#fbfcf8]">
      <div className="w-full max-w-md">
        <Card variant="elevated" className="border-t-4 border-t-amber-600 text-center shadow-md">
          <CardHeader className="text-center sm:text-center pb-2">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-100 text-amber-900 text-3xl font-bold mb-3 shadow-2xs">
              🛡️
            </div>
            <CardTitle className="text-2xl font-extrabold text-slate-900">
              {t('unauthorized.title')}
            </CardTitle>
            <CardDescription className="text-sm text-slate-600 mt-2 leading-relaxed">
              {t('unauthorized.message')}
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-3 pt-4">
            <Link href="/" className="w-full block">
              <Button variant="primary" size="md" fullWidth>
                {t('unauthorized.go_home')}
              </Button>
            </Link>
            <Link href="/profile" className="w-full block">
              <Button variant="outline" size="md" fullWidth>
                {t('unauthorized.go_profile')}
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
