'use client';

import React from 'react';
import Link from 'next/link';
import { UserRole } from '@rythuconnect/types';
import { useAuth } from '@/context/AuthContext';
import { useTranslation } from '@/context/LanguageContext';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, Badge, Button } from '@/components/ui';

export default function Home() {
  const { user, isAuthenticated } = useAuth();
  const { t } = useTranslation();

  return (
    <div className="flex flex-col flex-1 w-full">
      {/* Hero Section */}
      <section className="relative overflow-hidden bg-gradient-to-b from-emerald-50/60 via-white to-transparent py-12 sm:py-20 px-4 sm:px-6 lg:px-8 border-b border-slate-100">
        <div className="mx-auto max-w-4xl text-center">
          <Badge variant="primary" size="md" className="mb-4 shadow-2xs">
            {t('landing.badge')}
          </Badge>
          <h1 className="text-3xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-slate-900 leading-tight">
            {t('landing.hero_title')}
          </h1>
          <p className="mt-5 text-base sm:text-xl text-slate-600 max-w-2xl mx-auto leading-relaxed">
            {t('landing.hero_desc')}
          </p>

          <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3.5">
            {isAuthenticated ? (
              user?.role === UserRole.FARMER ? (
                <Link href="/farmer/dashboard" className="w-full sm:w-auto">
                  <Button variant="primary" size="lg" fullWidth>
                    🌾 {t('nav.farmer_dashboard')}
                  </Button>
                </Link>
              ) : (
                <Link href="/buyer/marketplace" className="w-full sm:w-auto">
                  <Button variant="secondary" size="lg" fullWidth>
                    🛒 {t('nav.buyer_marketplace')}
                  </Button>
                </Link>
              )
            ) : (
              <>
                <Link href="/auth/register" className="w-full sm:w-auto">
                  <Button variant="primary" size="lg" fullWidth>
                    {t('landing.get_started')}
                  </Button>
                </Link>
                <a href="#roles" className="w-full sm:w-auto">
                  <Button variant="outline" size="lg" fullWidth>
                    {t('landing.how_it_works')}
                  </Button>
                </a>
              </>
            )}
          </div>
        </div>
      </section>

      {/* Role Selection / Entry Cards */}
      <section id="roles" className="py-12 sm:py-16 px-4 sm:px-6 lg:px-8 mx-auto max-w-6xl w-full">
        <div className="text-center max-w-2xl mx-auto mb-10">
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900">
            {t('landing.roles_heading')}
          </h2>
          <p className="text-sm sm:text-base text-slate-600 mt-2">
            {t('landing.roles_subheading')}
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 sm:gap-8">
          {/* Farmer Role Card */}
          <Card variant="elevated" className="flex flex-col justify-between border-t-4 border-t-emerald-600">
            <CardHeader>
              <div className="flex items-center justify-between gap-2 mb-2">
                <span className="text-3xl" aria-hidden="true">
                  🌾
                </span>
                <Badge variant="primary">{t('auth.farmer_role_title').toUpperCase()}</Badge>
              </div>
              <CardTitle>{t('landing.for_farmers')}</CardTitle>
              <CardDescription>{t('landing.farmer_desc')}</CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2.5 text-sm text-slate-700 mb-6">
                <li className="flex items-center gap-2">
                  <span className="text-emerald-700 font-bold" aria-hidden="true">✓</span>
                  <span>Direct crop listings with quantity and harvest dates</span>
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-emerald-700 font-bold" aria-hidden="true">✓</span>
                  <span>Choice between buyer pickup or farm delivery</span>
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-emerald-700 font-bold" aria-hidden="true">✓</span>
                  <span>Multilingual support for Telugu and Hindi speakers</span>
                </li>
              </ul>
              <div className="pt-2">
                {isAuthenticated ? (
                  <Link href="/farmer/dashboard" className="block w-full">
                    <Button variant="primary" size="md" fullWidth>
                      {t('nav.farmer_dashboard')}
                    </Button>
                  </Link>
                ) : (
                  <Link href="/auth/register" className="block w-full">
                    <Button variant="primary" size="md" fullWidth>
                      {t('landing.get_started')} ({t('auth.farmer_role_title')})
                    </Button>
                  </Link>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Buyer Role Card */}
          <Card variant="elevated" className="flex flex-col justify-between border-t-4 border-t-amber-600">
            <CardHeader>
              <div className="flex items-center justify-between gap-2 mb-2">
                <span className="text-3xl" aria-hidden="true">
                  🛒
                </span>
                <Badge variant="secondary">{t('auth.buyer_role_title').toUpperCase()}</Badge>
              </div>
              <CardTitle>{t('landing.for_buyers')}</CardTitle>
              <CardDescription>{t('landing.buyer_desc')}</CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2.5 text-sm text-slate-700 mb-6">
                <li className="flex items-center gap-2">
                  <span className="text-amber-700 font-bold" aria-hidden="true">✓</span>
                  <span>Browse authentic farm produce by category & region</span>
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-amber-700 font-bold" aria-hidden="true">✓</span>
                  <span>Transparent quantity units (KG, Quintal, Ton, Crate)</span>
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-amber-700 font-bold" aria-hidden="true">✓</span>
                  <span>Secure direct connection with verified growers</span>
                </li>
              </ul>
              <div className="pt-2">
                {isAuthenticated ? (
                  <Link href="/buyer/marketplace" className="block w-full">
                    <Button variant="secondary" size="md" fullWidth>
                      {t('nav.buyer_marketplace')}
                    </Button>
                  </Link>
                ) : (
                  <Link href="/auth/register" className="block w-full">
                    <Button variant="secondary" size="md" fullWidth>
                      {t('landing.get_started')} ({t('auth.buyer_role_title')})
                    </Button>
                  </Link>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Trust & Architecture Highlights */}
      <section id="how-it-works" className="bg-slate-50 border-t border-slate-200/80 py-12 sm:py-16 px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-6xl">
          <div className="text-center max-w-2xl mx-auto mb-10">
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900">
              Core Principles of RythuConnect
            </h2>
            <p className="text-sm sm:text-base text-slate-600 mt-2">
              Designed from first principles to empower Indian agriculture with technology and trust.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="p-5 rounded-2xl bg-white border border-slate-200/80 shadow-2xs">
              <div className="text-2xl mb-2" aria-hidden="true">
                🤝
              </div>
              <h3 className="font-bold text-slate-900 text-base">Direct Transactions</h3>
              <p className="text-xs sm:text-sm text-slate-600 mt-1 leading-relaxed">
                Connects buyers directly to producers, removing unnecessary middlemen and broker margins.
              </p>
            </div>

            <div className="p-5 rounded-2xl bg-white border border-slate-200/80 shadow-2xs">
              <div className="text-2xl mb-2" aria-hidden="true">
                📊
              </div>
              <h3 className="font-bold text-slate-900 text-base">Transparent Pricing</h3>
              <p className="text-xs sm:text-sm text-slate-600 mt-1 leading-relaxed">
                Farmers establish prices openly for their crops with clear quantity units and delivery conditions.
              </p>
            </div>

            <div className="p-5 rounded-2xl bg-white border border-slate-200/80 shadow-2xs">
              <div className="text-2xl mb-2" aria-hidden="true">
                🌐
              </div>
              <h3 className="font-bold text-slate-900 text-base">Multilingual Design</h3>
              <p className="text-xs sm:text-sm text-slate-600 mt-1 leading-relaxed">
                Native interfaces designed to support regional languages: Telugu (తెలుగు), Hindi (हिन्दी), and English.
              </p>
            </div>

            <div className="p-5 rounded-2xl bg-white border border-slate-200/80 shadow-2xs">
              <div className="text-2xl mb-2" aria-hidden="true">
                📱
              </div>
              <h3 className="font-bold text-slate-900 text-base">Mobile-First Shell</h3>
              <p className="text-xs sm:text-sm text-slate-600 mt-1 leading-relaxed">
                Built specifically for smartphone touchscreens, resilient in low-connectivity rural environments.
              </p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
