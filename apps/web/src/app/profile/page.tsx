'use client';

import React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { UserRole } from '@rythuconnect/types';
import { useAuth } from '@/context/AuthContext';
import { useTranslation } from '@/context/LanguageContext';
import { RoleGuard } from '@/components/auth/RoleGuard';
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
  Button,
  Badge,
  LanguageSwitcher,
} from '@/components/ui';

export default function ProfilePage() {
  const router = useRouter();
  const { user, logout, isLoading } = useAuth();
  const { t } = useTranslation();

  const handleLogout = async () => {
    await logout();
    router.replace('/');
  };

  const getRoleBadgeVariant = (role?: UserRole) => {
    switch (role) {
      case UserRole.FARMER:
        return 'primary';
      case UserRole.BUYER:
        return 'secondary';
      case UserRole.ADMIN:
        return 'danger';
      default:
        return 'neutral';
    }
  };

  return (
    <RoleGuard>
      <div className="flex flex-1 items-center justify-center p-4 sm:p-6 lg:p-8 bg-[#fbfcf8]">
        <div className="w-full max-w-lg">
          <Card variant="elevated" className="border-t-4 border-t-emerald-700 shadow-md">
            <CardHeader className="text-center sm:text-center pb-3">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-800 text-3xl font-bold mb-3 shadow-2xs">
                👤
              </div>
              <CardTitle className="text-2xl font-extrabold text-slate-900">
                {t('profile.title')}
              </CardTitle>
              <CardDescription className="text-sm text-slate-600 mt-1">
                {t('profile.subtitle')}
              </CardDescription>
            </CardHeader>

            <CardContent className="space-y-4 pt-2">
              {/* Profile Details List */}
              <div className="divide-y divide-slate-100 rounded-xl border border-slate-200/90 bg-slate-50/60 p-4">
                <div className="flex items-center justify-between py-2.5">
                  <span className="text-sm font-semibold text-slate-600">{t('profile.phone')}</span>
                  <span className="text-sm font-bold font-mono text-slate-900">
                    {user?.phone || '—'}
                  </span>
                </div>

                <div className="flex items-center justify-between py-2.5">
                  <span className="text-sm font-semibold text-slate-600">{t('profile.role')}</span>
                  <Badge variant={getRoleBadgeVariant(user?.role)} size="md">
                    {user?.role || '—'}
                  </Badge>
                </div>

                <div className="flex items-center justify-between py-2.5">
                  <span className="text-sm font-semibold text-slate-600">
                    {t('profile.verification_status')}
                  </span>
                  <Badge variant={user?.isVerified ? 'success' : 'warning'}>
                    {user?.isVerified ? t('common.verified') : t('common.unverified')}
                  </Badge>
                </div>

                <div className="flex items-center justify-between py-2.5">
                  <span className="text-sm font-semibold text-slate-600">{t('profile.language')}</span>
                  <LanguageSwitcher variant="compact" />
                </div>
              </div>

              {/* Role Action Shortcuts */}
              <div className="pt-2">
                {user?.role === UserRole.FARMER && (
                  <Link href="/farmer/dashboard" className="block w-full">
                    <Button variant="primary" size="md" fullWidth>
                      🌾 {t('nav.farmer_dashboard')}
                    </Button>
                  </Link>
                )}

                {user?.role === UserRole.BUYER && (
                  <Link href="/buyer/marketplace" className="block w-full">
                    <Button variant="secondary" size="md" fullWidth>
                      🛒 {t('nav.buyer_marketplace')}
                    </Button>
                  </Link>
                )}
              </div>
            </CardContent>

            <CardFooter className="justify-center border-t border-slate-100 bg-slate-50/50 py-4 rounded-b-2xl">
              <Button
                variant="outline"
                size="md"
                onClick={handleLogout}
                isLoading={isLoading}
                className="text-red-700 border-red-200 hover:bg-red-50 hover:text-red-800"
              >
                {t('profile.logout_button')}
              </Button>
            </CardFooter>
          </Card>
        </div>
      </div>
    </RoleGuard>
  );
}
