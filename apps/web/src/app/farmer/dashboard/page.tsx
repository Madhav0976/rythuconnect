'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  UserRole,
  ListingStatus,
  PopulatedCropListing,
  FarmerDashboardStats,
  Category,
} from '@rythuconnect/types';
import { useAuth } from '@/context/AuthContext';
import { useTranslation } from '@/context/LanguageContext';
import { RoleGuard } from '@/components/auth/RoleGuard';
import { listingService } from '@/services/listing.service';
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  Badge,
  Button,
  Spinner,
} from '@/components/ui';

export default function FarmerDashboardPage() {
  const { user } = useAuth();
  const { t, language } = useTranslation();

  const [stats, setStats] = useState<FarmerDashboardStats>({
    totalListings: 0,
    activeListings: 0,
    soldListings: 0,
    expiredListings: 0,
  });
  const [recentListings, setRecentListings] = useState<PopulatedCropListing[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    let isMounted = true;

    async function loadDashboardData() {
      setIsLoading(true);
      try {
        const [statsData, listingsData] = await Promise.all([
          listingService.getMyStats(),
          listingService.getMyListings(),
        ]);

        if (!isMounted) return;
        setStats(statsData);
        setRecentListings(listingsData.slice(0, 4));
      } finally {
        if (isMounted) setIsLoading(false);
      }
    }

    loadDashboardData();

    return () => {
      isMounted = false;
    };
  }, []);

  const getStatusBadge = (status: ListingStatus) => {
    switch (status) {
      case ListingStatus.AVAILABLE:
        return <Badge variant="success">{t('listings.status_available')}</Badge>;
      case ListingStatus.SOLD:
        return <Badge variant="secondary">{t('listings.status_sold')}</Badge>;
      case ListingStatus.EXPIRED:
        return <Badge variant="neutral">{t('listings.status_expired')}</Badge>;
    }
  };

  const getCategoryName = (cat?: Category | string): string => {
    if (!cat) return '';
    if (typeof cat === 'object') {
      if (cat.translations && cat.translations[language]) {
        return cat.translations[language]!;
      }
      return cat.name;
    }
    return '';
  };

  return (
    <RoleGuard allowedRoles={[UserRole.FARMER]}>
      <div className="flex-1 w-full max-w-6xl mx-auto p-4 sm:p-6 lg:p-8 space-y-8">
        {/* Header Context */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-slate-200/80">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
                {t('listings.dashboard_title')}
              </h1>
              <Badge variant="primary">🌾 FARMER</Badge>
            </div>
            <p className="text-sm text-slate-600">
              Welcome back, <span className="font-mono font-semibold text-slate-900">{user?.phone}</span>
            </p>
          </div>

          <div className="flex items-center gap-3">
            <Link href="/farmer/listings/new">
              <Button variant="primary" size="md">
                + {t('listings.add_listing_button')}
              </Button>
            </Link>
            <Link href="/farmer/listings">
              <Button variant="outline" size="md">
                {t('listings.view_my_listings')}
              </Button>
            </Link>
          </div>
        </div>

        {/* Loading State */}
        {isLoading ? (
          <div className="flex flex-col items-center justify-center min-h-[35vh] gap-3">
            <Spinner size="lg" className="text-emerald-700" label="Loading dashboard metrics..." />
            <p className="text-sm font-medium text-slate-500">{t('common.loading')}</p>
          </div>
        ) : (
          <>
            {/* Real Statistics Grid */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <Card variant="elevated" className="border-l-4 border-l-emerald-600">
                <CardHeader className="p-4 pb-2">
                  <CardDescription className="text-xs uppercase font-bold text-slate-500">
                    {t('listings.stats_active')}
                  </CardDescription>
                  <CardTitle className="text-3xl font-extrabold text-emerald-700">
                    {stats.activeListings}
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-4 pt-0 text-xs text-slate-600">
                  Ready for direct buyer purchase
                </CardContent>
              </Card>

              <Card variant="elevated" className="border-l-4 border-l-amber-600">
                <CardHeader className="p-4 pb-2">
                  <CardDescription className="text-xs uppercase font-bold text-slate-500">
                    {t('listings.stats_sold')}
                  </CardDescription>
                  <CardTitle className="text-3xl font-extrabold text-amber-700">
                    {stats.soldListings}
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-4 pt-0 text-xs text-slate-600">
                  Completed harvest sales
                </CardContent>
              </Card>

              <Card variant="elevated" className="border-l-4 border-l-slate-400">
                <CardHeader className="p-4 pb-2">
                  <CardDescription className="text-xs uppercase font-bold text-slate-500">
                    {t('listings.stats_expired')}
                  </CardDescription>
                  <CardTitle className="text-3xl font-extrabold text-slate-700">
                    {stats.expiredListings}
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-4 pt-0 text-xs text-slate-600">
                  Past harvest date
                </CardContent>
              </Card>

              <Card variant="elevated" className="border-l-4 border-l-blue-600">
                <CardHeader className="p-4 pb-2">
                  <CardDescription className="text-xs uppercase font-bold text-slate-500">
                    {t('listings.stats_total')}
                  </CardDescription>
                  <CardTitle className="text-3xl font-extrabold text-blue-700">
                    {stats.totalListings}
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-4 pt-0 text-xs text-slate-600">
                  All recorded harvests
                </CardContent>
              </Card>
            </div>

            {/* Quick Actions & Recent Listings */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold text-slate-900">
                  {t('listings.recent_listings')}
                </h2>
                {recentListings.length > 0 && (
                  <Link
                    href="/farmer/listings"
                    className="text-sm font-semibold text-emerald-700 hover:text-emerald-800 hover:underline"
                  >
                    {t('listings.view_my_listings')} &rarr;
                  </Link>
                )}
              </div>

              {recentListings.length === 0 ? (
                <Card variant="muted" className="p-8 text-center border-dashed border-2 border-slate-300">
                  <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-100 text-3xl mb-3">
                    🌾
                  </div>
                  <h3 className="text-lg font-bold text-slate-900 mb-1">
                    {t('listings.no_listings_title')}
                  </h3>
                  <p className="text-sm text-slate-600 max-w-md mx-auto mb-6">
                    {t('listings.no_listings_desc')}
                  </p>
                  <Link href="/farmer/listings/new">
                    <Button variant="primary" size="md">
                      + {t('listings.add_listing_button')}
                    </Button>
                  </Link>
                </Card>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {recentListings.map((listing) => (
                    <Card
                      key={listing.id}
                      variant="elevated"
                      className="p-5 flex flex-col justify-between hover:border-slate-300 transition-colors"
                    >
                      <div>
                        <div className="flex items-start justify-between gap-3 mb-2">
                          <div>
                            <span className="text-xs font-semibold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-md">
                              {getCategoryName(listing.category)}
                            </span>
                            <h4 className="text-lg font-bold text-slate-900 mt-1">
                              {listing.cropName}
                            </h4>
                          </div>
                          {getStatusBadge(listing.status)}
                        </div>

                        <div className="flex items-baseline gap-2 mt-2">
                          <span className="text-2xl font-extrabold text-slate-900 font-mono">
                            ₹{listing.price}
                          </span>
                          <span className="text-xs text-slate-500 font-medium">
                            / {listing.quantityUnit}
                          </span>
                        </div>

                        <div className="text-xs text-slate-600 space-y-1 mt-3 pt-3 border-t border-slate-100">
                          <div>
                            <span className="font-semibold text-slate-700">
                              {t('listings.quantity')}:
                            </span>{' '}
                            {listing.quantity} {listing.quantityUnit}
                          </div>
                          <div>
                            <span className="font-semibold text-slate-700">
                              {t('listings.location')}:
                            </span>{' '}
                            {listing.location}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 pt-4 mt-2">
                        {listing.status === ListingStatus.AVAILABLE && (
                          <Link href={`/farmer/listings/${listing.id}/edit`} className="w-full">
                            <Button variant="outline" size="sm" fullWidth>
                              {t('listings.action_edit')}
                            </Button>
                          </Link>
                        )}
                        <Link href="/farmer/listings" className="w-full">
                          <Button variant="ghost" size="sm" fullWidth>
                            {t('listings.action_view')}
                          </Button>
                        </Link>
                      </div>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </RoleGuard>
  );
}
