'use client';

import React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { UserRole } from '@rythuconnect/types';
import { useAuth } from '@/context/AuthContext';
import { useTranslation } from '@/context/LanguageContext';
import { Button, Badge, LanguageSwitcher } from '@/components/ui';

export const Header: React.FC = () => {
  const router = useRouter();
  const { user, isAuthenticated, logout } = useAuth();
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
    <header className="sticky top-0 z-40 w-full border-b border-slate-200/80 bg-white/95 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6 lg:px-8">
        {/* Brand / Logo Area */}
        <Link
          href="/"
          className="group flex items-center gap-2.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600 focus-visible:ring-offset-2 rounded-lg select-none"
          aria-label="RythuConnect Home"
        >
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-700 text-white font-bold shadow-xs group-hover:bg-emerald-800 transition-colors">
            🌱
          </span>
          <div className="flex flex-col">
            <span className="text-xl font-extrabold tracking-tight text-slate-900 group-hover:text-emerald-800 transition-colors">
              RythuConnect
            </span>
            <span className="text-[10px] font-medium text-slate-500 uppercase tracking-wider -mt-1 hidden sm:block">
              {t('brand.tagline')}
            </span>
          </div>
        </Link>

        {/* Action Controls & Navigation */}
        <div className="flex items-center gap-2.5 sm:gap-4">
          <LanguageSwitcher variant="compact" />

          {isAuthenticated ? (
            <div className="flex items-center gap-2 sm:gap-3">
              {/* Role-Specific Dashboard Link */}
              {user?.role === UserRole.FARMER && (
                <Link href="/farmer/dashboard" className="hidden md:inline-flex">
                  <Button variant="outline" size="sm">
                    🌾 {t('nav.farmer_dashboard')}
                  </Button>
                </Link>
              )}

              {user?.role === UserRole.BUYER && (
                <Link href="/buyer/marketplace" className="hidden md:inline-flex">
                  <Button variant="outline" size="sm">
                    🛒 {t('nav.buyer_marketplace')}
                  </Button>
                </Link>
              )}

              {/* Profile Link with Role Badge */}
              <Link href="/profile" aria-label={t('nav.profile')}>
                <div className="flex items-center gap-1.5 p-1 px-2.5 rounded-xl border border-slate-200 hover:border-slate-300 bg-slate-50/80 transition-colors cursor-pointer select-none">
                  <span className="text-sm font-semibold text-slate-700 hidden sm:inline">
                    {t('nav.profile')}
                  </span>
                  <Badge variant={getRoleBadgeVariant(user?.role)} size="sm">
                    {user?.role}
                  </Badge>
                </div>
              </Link>

              {/* Quick Logout Button */}
              <Button
                variant="ghost"
                size="sm"
                onClick={handleLogout}
                className="text-slate-600 hover:text-red-700 hover:bg-red-50 text-xs px-2.5"
                aria-label={t('nav.logout')}
              >
                {t('nav.logout')}
              </Button>
            </div>
          ) : (
            <div className="flex items-center gap-2 sm:gap-3">
              <Link href="/auth/login">
                <Button variant="outline" size="sm">
                  {t('nav.login')}
                </Button>
              </Link>
              <Link href="/auth/register">
                <Button variant="primary" size="sm">
                  {t('nav.register')}
                </Button>
              </Link>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
