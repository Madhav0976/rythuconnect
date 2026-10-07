'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import {
  UserRole,
  ListingStatus,
  PopulatedCropListing,
  Category,
  DeliveryType,
} from '@rythuconnect/types';
import { useTranslation } from '@/context/LanguageContext';
import { RoleGuard } from '@/components/auth/RoleGuard';
import { listingService } from '@/services/listing.service';
import {
  Card,
  Badge,
  Button,
  Spinner,
  Alert,
  Modal,
} from '@/components/ui';

export default function MyListingsPage() {
  const { t, language } = useTranslation();

  const [listings, setListings] = useState<PopulatedCropListing[]>([]);
  const [selectedFilter, setSelectedFilter] = useState<ListingStatus | 'ALL'>('ALL');
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(
    null
  );

  // Modal Dialog States
  const [listingToMarkSold, setListingToMarkSold] = useState<PopulatedCropListing | null>(null);
  const [isMarkingSold, setIsMarkingSold] = useState<boolean>(false);

  const [listingToDelete, setListingToDelete] = useState<PopulatedCropListing | null>(null);
  const [isDeleting, setIsDeleting] = useState<boolean>(false);

  const [inspectListing, setInspectListing] = useState<PopulatedCropListing | null>(null);

  const refreshListings = useCallback(async () => {
    setIsLoading(true);
    try {
      const filter = selectedFilter === 'ALL' ? undefined : selectedFilter;
      const data = await listingService.getMyListings(filter);
      setListings(data);
    } finally {
      setIsLoading(false);
    }
  }, [selectedFilter]);

  useEffect(() => {
    let ignore = false;
    const filter = selectedFilter === 'ALL' ? undefined : selectedFilter;

    listingService.getMyListings(filter).then((data) => {
      if (!ignore) {
        setListings(data);
        setIsLoading(false);
      }
    });

    return () => {
      ignore = true;
    };
  }, [selectedFilter]);

  const handleFilterChange = (filter: ListingStatus | 'ALL') => {
    setSelectedFilter(filter);
    setIsLoading(true);
  };

  const handleConfirmMarkSold = async () => {
    if (!listingToMarkSold) return;
    setIsMarkingSold(true);
    setFeedback(null);

    const res = await listingService.markListingSold(listingToMarkSold.id);
    setIsMarkingSold(false);
    setListingToMarkSold(null);

    if (res.success) {
      setFeedback({ type: 'success', message: t('listings.sold_success') });
      refreshListings();
    } else {
      setFeedback({ type: 'error', message: res.message });
    }
  };

  const handleConfirmDelete = async () => {
    if (!listingToDelete) return;
    setIsDeleting(true);
    setFeedback(null);

    const res = await listingService.deleteListing(listingToDelete.id);
    setIsDeleting(false);
    setListingToDelete(null);

    if (res.success) {
      setFeedback({ type: 'success', message: t('listings.deleted_success') });
      refreshListings();
    } else {
      setFeedback({ type: 'error', message: res.message });
    }
  };

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

  const formatDate = (dateVal: string | Date): string => {
    try {
      const d = new Date(dateVal);
      return d.toLocaleDateString(undefined, {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      });
    } catch {
      return String(dateVal);
    }
  };

  return (
    <RoleGuard allowedRoles={[UserRole.FARMER]}>
      <div className="flex-1 w-full max-w-6xl mx-auto p-4 sm:p-6 lg:p-8 space-y-6">
        {/* Header Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-slate-200/80">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
                {t('listings.my_listings_title')}
              </h1>
              <Badge variant="primary">🌾 FARMER</Badge>
            </div>
            <p className="text-sm text-slate-600">
              {t('listings.my_listings_subtitle')}
            </p>
          </div>

          <div className="flex items-center gap-3">
            <Link href="/farmer/listings/new">
              <Button variant="primary" size="md">
                + {t('listings.add_listing_button')}
              </Button>
            </Link>
            <Link href="/farmer/dashboard">
              <Button variant="outline" size="md">
                {t('listings.dashboard_title')}
              </Button>
            </Link>
          </div>
        </div>

        {/* Global Feedback Alert */}
        {feedback && (
          <Alert
            variant={feedback.type === 'success' ? 'success' : 'error'}
            className="text-sm"
          >
            {feedback.message}
          </Alert>
        )}

        {/* Filter Bar */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
          <button
            type="button"
            onClick={() => handleFilterChange('ALL')}
            className={`px-3.5 py-1.5 rounded-xl text-xs sm:text-sm font-semibold transition-all select-none cursor-pointer shrink-0 ${
              selectedFilter === 'ALL'
                ? 'bg-emerald-700 text-white shadow-xs'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            {t('listings.filter_all')}
          </button>
          <button
            type="button"
            onClick={() => handleFilterChange(ListingStatus.AVAILABLE)}
            className={`px-3.5 py-1.5 rounded-xl text-xs sm:text-sm font-semibold transition-all select-none cursor-pointer shrink-0 ${
              selectedFilter === ListingStatus.AVAILABLE
                ? 'bg-emerald-700 text-white shadow-xs'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            {t('listings.filter_available')}
          </button>
          <button
            type="button"
            onClick={() => handleFilterChange(ListingStatus.SOLD)}
            className={`px-3.5 py-1.5 rounded-xl text-xs sm:text-sm font-semibold transition-all select-none cursor-pointer shrink-0 ${
              selectedFilter === ListingStatus.SOLD
                ? 'bg-emerald-700 text-white shadow-xs'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            {t('listings.filter_sold')}
          </button>
          <button
            type="button"
            onClick={() => handleFilterChange(ListingStatus.EXPIRED)}
            className={`px-3.5 py-1.5 rounded-xl text-xs sm:text-sm font-semibold transition-all select-none cursor-pointer shrink-0 ${
              selectedFilter === ListingStatus.EXPIRED
                ? 'bg-emerald-700 text-white shadow-xs'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            {t('listings.filter_expired')}
          </button>
        </div>

        {/* Listings Grid */}
        {isLoading ? (
          <div className="flex flex-col items-center justify-center min-h-[35vh] gap-3">
            <Spinner size="lg" className="text-emerald-700" label="Loading listings..." />
            <p className="text-sm font-medium text-slate-500">{t('common.loading')}</p>
          </div>
        ) : listings.length === 0 ? (
          <Card variant="muted" className="p-8 text-center border-dashed border-2 border-slate-300">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-100 text-3xl mb-3">
              🌾
            </div>
            <h3 className="text-lg font-bold text-slate-900 mb-1">
              {selectedFilter === 'ALL'
                ? t('listings.no_listings_title')
                : t('listings.empty_filter_title')}
            </h3>
            <p className="text-sm text-slate-600 max-w-md mx-auto mb-6">
              {selectedFilter === 'ALL'
                ? t('listings.no_listings_desc')
                : t('listings.empty_filter_desc')}
            </p>
            {selectedFilter === 'ALL' && (
              <Link href="/farmer/listings/new">
                <Button variant="primary" size="md">
                  + {t('listings.add_listing_button')}
                </Button>
              </Link>
            )}
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {listings.map((listing) => {
              const primaryImage = listing.images && listing.images.length > 0 ? listing.images[0] : null;

              return (
                <Card
                  key={listing.id}
                  variant="elevated"
                  className="flex flex-col justify-between overflow-hidden hover:border-slate-300 transition-all"
                >
                  {/* Image / Thumbnail Header */}
                  <div className="relative h-44 w-full bg-slate-100 border-b border-slate-100 overflow-hidden">
                    {primaryImage ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={primaryImage}
                        alt={listing.cropName}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          (e.target as HTMLImageElement).src =
                            'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100" viewBox="0 0 24 24" fill="none" stroke="%2394a3b8" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>';
                        }}
                      />
                    ) : (
                      <div className="flex flex-col items-center justify-center w-full h-full text-slate-400">
                        <span className="text-4xl mb-1">🌾</span>
                        <span className="text-xs font-medium">No Image Provided</span>
                      </div>
                    )}
                    <div className="absolute top-2.5 right-2.5">
                      {getStatusBadge(listing.status)}
                    </div>
                  </div>

                  {/* Body Info */}
                  <div className="p-4 sm:p-5 flex-1 flex flex-col justify-between">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs font-semibold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-md">
                          {getCategoryName(listing.category)}
                        </span>
                      </div>

                      <h3 className="text-lg font-bold text-slate-900 tracking-tight mb-2">
                        {listing.cropName}
                      </h3>

                      <div className="flex items-baseline gap-1.5 mb-3">
                        <span className="text-2xl font-extrabold text-slate-900 font-mono">
                          ₹{listing.price}
                        </span>
                        <span className="text-xs text-slate-500 font-medium">
                          / {listing.quantityUnit}
                        </span>
                      </div>

                      <div className="space-y-1.5 text-xs text-slate-600 border-t border-slate-100 pt-3">
                        <div className="flex justify-between">
                          <span className="font-semibold text-slate-500">{t('listings.quantity')}:</span>
                          <span className="font-medium text-slate-900">
                            {listing.quantity} {listing.quantityUnit}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="font-semibold text-slate-500">{t('listings.harvest_date')}:</span>
                          <span className="font-medium text-slate-900">
                            {formatDate(listing.harvestDate)}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="font-semibold text-slate-500">{t('listings.delivery_type')}:</span>
                          <span className="font-medium text-slate-900">
                            {listing.deliveryType === DeliveryType.BUYER_PICKUP
                              ? t('listings.delivery_buyer_pickup')
                              : t('listings.delivery_farmer_delivery')}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="font-semibold text-slate-500">{t('listings.location')}:</span>
                          <span className="font-medium text-slate-900 truncate max-w-[150px]">
                            {listing.location}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Action Controls */}
                    <div className="pt-4 mt-4 border-t border-slate-100">
                      {listing.status === ListingStatus.AVAILABLE ? (
                        <div className="flex flex-col gap-2">
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                            <Link href={`/farmer/listings/${listing.id}/edit`} className="w-full">
                              <Button variant="outline" size="sm" fullWidth>
                                ✏️ {t('listings.action_edit')}
                              </Button>
                            </Link>

                            <Button
                              variant="secondary"
                              size="sm"
                              fullWidth
                              onClick={() => setListingToMarkSold(listing)}
                            >
                              ✓ {t('listings.action_mark_sold')}
                            </Button>
                          </div>

                          <Button
                            variant="ghost"
                            size="sm"
                            fullWidth
                            onClick={() => setListingToDelete(listing)}
                            className="text-red-700 hover:text-red-800 hover:bg-red-50 text-xs"
                          >
                            🗑️ {t('listings.action_delete')}
                          </Button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            fullWidth
                            onClick={() => setInspectListing(listing)}
                          >
                            🔍 {t('listings.action_view')}
                          </Button>

                          {listing.status === ListingStatus.EXPIRED && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setListingToDelete(listing)}
                              className="text-red-700 hover:text-red-800 hover:bg-red-50 text-xs px-3"
                              aria-label={t('listings.action_delete')}
                            >
                              🗑️
                            </Button>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        )}

        {/* Modal 1: Confirmation to Mark SOLD */}
        <Modal
          isOpen={Boolean(listingToMarkSold)}
          onClose={() => setListingToMarkSold(null)}
          title={t('listings.mark_sold_confirm_title')}
          description={t('listings.mark_sold_confirm_desc')}
        >
          <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 text-xs text-amber-900 mb-4">
            <span className="font-bold">Crop:</span> {listingToMarkSold?.cropName} (
            {listingToMarkSold?.quantity} {listingToMarkSold?.quantityUnit})
          </div>

          <div className="flex flex-col-reverse sm:flex-row items-stretch sm:items-center sm:justify-end gap-2 sm:gap-3 pt-2 border-t border-slate-100">
            <Button
              type="button"
              variant="outline"
              size="md"
              onClick={() => setListingToMarkSold(null)}
              disabled={isMarkingSold}
            >
              {t('common.cancel')}
            </Button>

            <Button
              type="button"
              variant="secondary"
              size="md"
              onClick={handleConfirmMarkSold}
              isLoading={isMarkingSold}
            >
              {t('listings.action_mark_sold')}
            </Button>
          </div>
        </Modal>

        {/* Modal 2: Confirmation to Delete Listing */}
        <Modal
          isOpen={Boolean(listingToDelete)}
          onClose={() => setListingToDelete(null)}
          title={t('listings.delete_confirm_title')}
          description={t('listings.delete_confirm_desc')}
        >
          <div className="p-3 bg-red-50 rounded-xl border border-red-200 text-xs text-red-900 mb-4">
            <span className="font-bold">Crop:</span> {listingToDelete?.cropName} (
            {listingToDelete?.quantity} {listingToDelete?.quantityUnit})
          </div>

          <div className="flex flex-col-reverse sm:flex-row items-stretch sm:items-center sm:justify-end gap-2 sm:gap-3 pt-2 border-t border-slate-100">
            <Button
              type="button"
              variant="outline"
              size="md"
              onClick={() => setListingToDelete(null)}
              disabled={isDeleting}
            >
              {t('common.cancel')}
            </Button>

            <Button
              type="button"
              variant="danger"
              size="md"
              onClick={handleConfirmDelete}
              isLoading={isDeleting}
            >
              {t('listings.action_delete')}
            </Button>
          </div>
        </Modal>

        {/* Modal 3: Listing Details Inspection */}
        <Modal
          isOpen={Boolean(inspectListing)}
          onClose={() => setInspectListing(null)}
          title={inspectListing?.cropName || t('listings.view_details')}
        >
          {inspectListing && (
            <div className="space-y-3 text-xs sm:text-sm text-slate-700">
              <div className="flex justify-between py-1 border-b border-slate-100">
                <span className="font-semibold text-slate-500">{t('listings.status')}:</span>
                {getStatusBadge(inspectListing.status)}
              </div>
              <div className="flex justify-between py-1 border-b border-slate-100">
                <span className="font-semibold text-slate-500">{t('listings.category')}:</span>
                <span className="font-medium">{getCategoryName(inspectListing.category)}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-100">
                <span className="font-semibold text-slate-500">{t('listings.price')}:</span>
                <span className="font-bold font-mono">₹{inspectListing.price} / {inspectListing.quantityUnit}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-100">
                <span className="font-semibold text-slate-500">{t('listings.quantity')}:</span>
                <span className="font-medium">{inspectListing.quantity} {inspectListing.quantityUnit}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-100">
                <span className="font-semibold text-slate-500">{t('listings.harvest_date')}:</span>
                <span className="font-medium">{formatDate(inspectListing.harvestDate)}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-100">
                <span className="font-semibold text-slate-500">{t('listings.delivery_type')}:</span>
                <span className="font-medium">
                  {inspectListing.deliveryType === DeliveryType.BUYER_PICKUP
                    ? t('listings.delivery_buyer_pickup')
                    : `${t('listings.delivery_farmer_delivery')} (₹${inspectListing.deliveryCharge || 0})`}
                </span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-100">
                <span className="font-semibold text-slate-500">{t('listings.location')}:</span>
                <span className="font-medium">{inspectListing.location}</span>
              </div>
              {inspectListing.images && inspectListing.images.length > 0 && (
                <div className="pt-2">
                  <div className="font-semibold text-slate-500 mb-2">{t('listings.images')}:</div>
                  <div className="grid grid-cols-3 gap-2">
                    {inspectListing.images.map((img, i) => (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        key={i}
                        src={img}
                        alt={`Photo ${i + 1}`}
                        className="rounded-lg object-cover h-20 w-full border border-slate-200"
                        onError={(e) => {
                          (e.target as HTMLImageElement).src =
                            'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100" viewBox="0 0 24 24" fill="none" stroke="%2394a3b8" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>';
                        }}
                      />
                    ))}
                  </div>
                </div>
              )}

              <div className="pt-4 border-t border-slate-100 flex justify-end">
                <Button
                  type="button"
                  variant="outline"
                  size="md"
                  onClick={() => setInspectListing(null)}
                >
                  Close
                </Button>
              </div>
            </div>
          )}
        </Modal>
      </div>
    </RoleGuard>
  );
}
