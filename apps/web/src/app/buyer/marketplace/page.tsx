'use client';

import React from 'react';
import Link from 'next/link';
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
  Badge,
  Button,
} from '@/components/ui';

export default function BuyerMarketplacePage() {
  const { user } = useAuth();
  const { t } = useTranslation();

  return (
    <RoleGuard allowedRoles={[UserRole.BUYER]}>
      <div className="flex-1 w-full max-w-6xl mx-auto p-4 sm:p-6 lg:p-8 space-y-6">
        {/* Welcome Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2 border-b border-slate-200/80">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900">
                {t('nav.buyer_marketplace')}
              </h1>
              <Badge variant="secondary">🛒 BUYER</Badge>
            </div>
            <p className="text-sm text-slate-600">
              Welcome back, <span className="font-mono font-semibold">{user?.phone}</span>
            </p>
          </div>

          <Link href="/profile">
            <Button variant="outline" size="sm">
              {t('nav.profile')}
            </Button>
          </Link>
        </div>

        {/* Milestone 4 Placeholder Notice */}
        <Card variant="elevated" className="border-l-4 border-l-amber-600">
          <CardHeader>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-2xl">🌾</span>
              <CardTitle>Direct Farm Produce Discovery</CardTitle>
            </div>
            <CardDescription>
              Authenticated access confirmed. Direct crop browsing, quantity filtering, and producer
              negotiation will launch in Milestone 5 (Marketplace & Listings).
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="rounded-xl bg-slate-50 border border-slate-200/80 p-4 text-sm text-slate-700 space-y-2">
              <div className="font-semibold text-slate-900">Account Status:</div>
              <div>• Phone: {user?.phone}</div>
              <div>• Role: {user?.role}</div>
              <div>• Verification: {user?.isVerified ? 'Verified' : 'Pending'}</div>
            </div>
          </CardContent>
        </Card>
      </div>
    </RoleGuard>
  );
}
