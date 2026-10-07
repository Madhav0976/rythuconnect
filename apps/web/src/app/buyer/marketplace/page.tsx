'use client';

import React, { Suspense, useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  UserRole,
  Category,
  MarketplaceListing,
  MarketplaceQuery,
  MarketplaceSortOption,
} from '@rythuconnect/types';
import { useTranslation } from '@/context/LanguageContext';
import { RoleGuard } from '@/components/auth/RoleGuard';
import { listingService } from '@/services/listing.service';
import { ListingCard, FilterPanel } from '@/components/marketplace';
import { Button, Badge, Spinner, Alert } from '@/components/ui';

function MarketplaceContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { t } = useTranslation();

  const [categories, setCategories] = useState<Category[]>([]);
  const [listings, setListings] = useState<MarketplaceListing[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Parse current query parameters from URL
  const currentQuery: MarketplaceQuery = React.useMemo(() => {
    const s = searchParams.get('search') || undefined;
    const cat = searchParams.get('categoryId') || undefined;
    const min = searchParams.get('minPrice');
    const max = searchParams.get('maxPrice');
    const loc = searchParams.get('location') || undefined;
    const srt = (searchParams.get('sort') as MarketplaceSortOption) || 'newest';
    const pg = Number(searchParams.get('page')) || 1;

    return {
      search: s,
      categoryId: cat,
      minPrice: min !== null && min !== '' ? Number(min) : undefined,
      maxPrice: max !== null && max !== '' ? Number(max) : undefined,
      location: loc,
      sort: srt,
      page: pg,
      limit: 12,
    };
  }, [searchParams]);

  // Load active categories on mount
  useEffect(() => {
    let mounted = true;
    listingService.getCategories().then((cats) => {
      if (mounted) setCategories(cats);
    });
    return () => {
      mounted = false;
    };
  }, []);

  // Fetch listings whenever currentQuery changes
  useEffect(() => {
    let ignore = false;
    listingService
      .getMarketplaceListings(currentQuery)
      .then((res) => {
        if (!ignore) {
          setListings(res.items);
          setTotal(res.total);
          setTotalPages(res.totalPages || 1);
          setPage(res.page || 1);
          setLoading(false);
        }
      })
      .catch(() => {
        if (!ignore) {
          setError('Failed to load marketplace listings. Please try again.');
          setLoading(false);
        }
      });

    return () => {
      ignore = true;
    };
  }, [currentQuery]);

  const handleRetry = useCallback(() => {
    setLoading(true);
    setError(null);
    listingService
      .getMarketplaceListings(currentQuery)
      .then((res) => {
        setListings(res.items);
        setTotal(res.total);
        setTotalPages(res.totalPages || 1);
        setPage(res.page || 1);
      })
      .catch(() => {
        setError('Failed to load marketplace listings. Please try again.');
      })
      .finally(() => {
        setLoading(false);
      });
  }, [currentQuery]);

  // Push updated filter state to URL search parameters
  const updateQueryParams = (newQuery: Partial<MarketplaceQuery>) => {
    setLoading(true);
    setError(null);
    const params = new URLSearchParams();

    if (newQuery.search) params.set('search', newQuery.search);
    if (newQuery.categoryId) params.set('categoryId', newQuery.categoryId);
    if (newQuery.minPrice !== undefined && Number.isFinite(newQuery.minPrice)) {
      params.set('minPrice', String(newQuery.minPrice));
    }
    if (newQuery.maxPrice !== undefined && Number.isFinite(newQuery.maxPrice)) {
      params.set('maxPrice', String(newQuery.maxPrice));
    }
    if (newQuery.location) params.set('location', newQuery.location);
    if (newQuery.sort && newQuery.sort !== 'newest') params.set('sort', newQuery.sort);
    if (newQuery.page && newQuery.page > 1) params.set('page', String(newQuery.page));

    const queryString = params.toString();
    router.push(queryString ? `/buyer/marketplace?${queryString}` : '/buyer/marketplace');
  };

  const handleApplyFilters = (filters: Partial<MarketplaceQuery>) => {
    updateQueryParams({
      ...filters,
      page: 1, // Reset to page 1 on new filter application
    });
  };

  const handleClearFilters = () => {
    router.push('/buyer/marketplace');
  };

  const handlePageChange = (newPage: number) => {
    if (newPage < 1 || newPage > totalPages) return;
    updateQueryParams({
      ...currentQuery,
      page: newPage,
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="flex-1 w-full max-w-6xl mx-auto p-4 sm:p-6 lg:p-8 space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2 border-b border-slate-200/80">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900">
              🛒 {t('marketplace.title')}
            </h1>
            <Badge variant="secondary">BUYER</Badge>
          </div>
          <p className="text-sm text-slate-600">
            {t('marketplace.subtitle')}
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <Link href="/profile">
            <Button variant="outline" size="sm">
              {t('nav.profile')}
            </Button>
          </Link>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <FilterPanel
        key={`${currentQuery.search || ''}-${currentQuery.categoryId || ''}-${currentQuery.minPrice ?? ''}-${currentQuery.maxPrice ?? ''}-${currentQuery.location || ''}-${currentQuery.sort || ''}`}
        categories={categories}
        currentQuery={currentQuery}
        onApply={handleApplyFilters}
        onClear={handleClearFilters}
      />

      {/* Error Alert */}
      {error && (
        <Alert variant="error" className="flex items-center justify-between">
          <span>{error}</span>
          <Button variant="outline" size="sm" onClick={handleRetry}>
            {t('common.retry')}
          </Button>
        </Alert>
      )}

      {/* Listings Section */}
      <div className="space-y-6">
        {/* Results Counter */}
        {!loading && (
          <div className="flex items-center justify-between text-xs sm:text-sm text-slate-600 px-1">
            <span>
              {total > 0 ? (
                <>
                  <span className="font-semibold text-slate-900">{total}</span>{' '}
                  {total === 1 ? 'crop listing' : 'crop listings'} found
                </>
              ) : (
                'No listings found'
              )}
            </span>
            {totalPages > 1 && (
              <span className="font-medium text-slate-500">
                {t('marketplace.page_info')
                  .replace('{{current}}', String(page))
                  .replace('{{total}}', String(totalPages))}
              </span>
            )}
          </div>
        )}

        {/* Loading State */}
        {loading && (
          <div className="flex flex-col items-center justify-center py-20 space-y-3">
            <Spinner size="lg" />
            <p className="text-sm text-slate-500 font-medium">{t('common.loading')}</p>
          </div>
        )}

        {/* Empty State */}
        {!loading && listings.length === 0 && !error && (
          <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50/70 p-8 sm:p-12 text-center space-y-4">
            <div className="text-5xl select-none" aria-hidden="true">
              🌾
            </div>
            <div className="space-y-1 max-w-md mx-auto">
              <h3 className="text-lg font-bold text-slate-900">
                {t('marketplace.no_results_title')}
              </h3>
              <p className="text-sm text-slate-600">
                {t('marketplace.no_results_desc')}
              </p>
            </div>
            <Button variant="outline" size="sm" onClick={handleClearFilters}>
              {t('marketplace.clear_filters')}
            </Button>
          </div>
        )}

        {/* Listings Grid */}
        {!loading && listings.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 sm:gap-6">
            {listings.map((listing) => (
              <ListingCard key={listing.id} listing={listing} />
            ))}
          </div>
        )}

        {/* Pagination Controls */}
        {!loading && totalPages > 1 && (
          <div className="flex items-center justify-center gap-2 pt-6 pb-2">
            <Button
              variant="outline"
              size="sm"
              disabled={page <= 1}
              onClick={() => handlePageChange(page - 1)}
              className="px-3"
            >
              ← {t('marketplace.prev_page')}
            </Button>

            <span className="px-3 py-1.5 text-xs sm:text-sm font-semibold text-slate-700 bg-slate-100 rounded-lg">
              {page} / {totalPages}
            </span>

            <Button
              variant="outline"
              size="sm"
              disabled={page >= totalPages}
              onClick={() => handlePageChange(page + 1)}
              className="px-3"
            >
              {t('marketplace.next_page')} →
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}

export default function BuyerMarketplacePage() {
  return (
    <RoleGuard allowedRoles={[UserRole.BUYER]}>
      <Suspense
        fallback={
          <div className="flex-1 w-full max-w-6xl mx-auto p-8 flex items-center justify-center py-20">
            <Spinner size="lg" />
          </div>
        }
      >
        <MarketplaceContent />
      </Suspense>
    </RoleGuard>
  );
}
