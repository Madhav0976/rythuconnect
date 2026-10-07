'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { MarketplaceListing, DeliveryType, Category } from '@rythuconnect/types';
import { useTranslation } from '@/context/LanguageContext';
import { Card, Badge, Button } from '@/components/ui';

interface ListingCardProps {
  listing: MarketplaceListing;
}

export const ListingCard: React.FC<ListingCardProps> = ({ listing }) => {
  const { t, language } = useTranslation();
  const [imgError, setImgError] = useState(false);

  const categoryName = React.useMemo(() => {
    if (!listing.category) return '';
    if (typeof listing.category === 'string') return listing.category;
    const cat = listing.category as Category;
    if (cat.translations && typeof cat.translations === 'object') {
      const trans = (cat.translations as Record<string, string | undefined>)[language];
      if (trans) return trans;
    }
    return cat.name || '';
  }, [listing.category, language]);

  const formattedDate = React.useMemo(() => {
    if (!listing?.harvestDate) return '';
    try {
      const d = new Date(listing.harvestDate);
      const locale = language === 'te' ? 'te-IN' : language === 'hi' ? 'hi-IN' : 'en-IN';
      return d.toLocaleDateString(locale, {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      });
    } catch {
      return '';
    }
  }, [listing, language]);

  const unitKey = `listings.unit_${listing.quantityUnit.toLowerCase()}`;
  const translatedUnit = t(unitKey) !== unitKey ? t(unitKey) : listing.quantityUnit;

  const hasImage = listing.images && listing.images.length > 0 && !imgError;

  return (
    <Card
      variant="elevated"
      className="flex flex-col h-full overflow-hidden hover:shadow-md transition-shadow duration-200 border-slate-200/80 rounded-2xl group bg-white"
    >
      {/* Crop Image or Fallback Header */}
      <div className="relative w-full h-44 sm:h-48 bg-slate-100 flex items-center justify-center overflow-hidden border-b border-slate-100">
        {hasImage ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={listing.images[0]}
            alt={listing.cropName}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            onError={() => setImgError(true)}
            loading="lazy"
          />
        ) : (
          <div className="flex flex-col items-center justify-center p-4 text-slate-400">
            <span className="text-4xl select-none" aria-hidden="true">
              🌾
            </span>
            <span className="text-xs font-medium text-slate-500 mt-1">{categoryName || 'RythuConnect'}</span>
          </div>
        )}

        {/* Top Badges */}
        <div className="absolute top-2.5 left-2.5 flex flex-wrap gap-1.5 max-w-[85%]">
          {categoryName && (
            <Badge variant="primary" size="sm" className="bg-emerald-800/90 text-white backdrop-blur-xs font-semibold shadow-xs">
              {categoryName}
            </Badge>
          )}
          {listing.farmer?.isVerified && (
            <Badge variant="success" size="sm" className="bg-emerald-600 text-white font-medium shadow-xs">
              ✓ {t('marketplace.verified_farmer')}
            </Badge>
          )}
        </div>

        {/* Delivery Mode Badge */}
        <div className="absolute bottom-2.5 right-2.5">
          <Badge variant="neutral" size="sm" className="bg-white/95 text-slate-700 shadow-xs backdrop-blur-xs">
            {listing.deliveryType === DeliveryType.FARMER_DELIVERY ? '🚚' : '🏠'}{' '}
            {listing.deliveryType === DeliveryType.FARMER_DELIVERY
              ? t('listings.delivery_farmer_delivery')
              : t('listings.delivery_buyer_pickup')}
          </Badge>
        </div>
      </div>

      {/* Card Content Area */}
      <div className="p-4 sm:p-5 flex-1 flex flex-col justify-between space-y-4">
        <div className="space-y-2">
          {/* Crop Name */}
          <h3
            className="text-lg font-bold text-slate-900 group-hover:text-emerald-700 transition-colors line-clamp-1"
            title={listing.cropName}
          >
            {listing.cropName}
          </h3>

          {/* Price & Unit Display */}
          <div className="flex items-baseline gap-1.5 flex-wrap">
            <span className="text-2xl font-black text-emerald-700">₹{listing.price}</span>
            <span className="text-xs font-medium text-slate-500">
              / {translatedUnit}
            </span>
          </div>

          {/* Key Details Meta */}
          <div className="space-y-1.5 pt-1 text-xs text-slate-600 border-t border-slate-100">
            <div className="flex items-center justify-between gap-2">
              <span className="text-slate-500 font-medium">{t('marketplace.available_qty')}:</span>
              <span className="font-semibold text-slate-800">
                {listing.quantity} {translatedUnit}
              </span>
            </div>

            <div className="flex items-center justify-between gap-2">
              <span className="text-slate-500 font-medium">{t('marketplace.harvest_date')}:</span>
              <span className="font-medium text-slate-700">{formattedDate}</span>
            </div>

            <div className="flex items-center gap-1.5 pt-0.5 text-slate-500">
              <span aria-hidden="true">📍</span>
              <span className="truncate font-medium text-slate-700" title={listing.location}>
                {listing.location}
              </span>
            </div>
          </div>
        </div>

        {/* View Details CTA */}
        <div className="pt-2">
          <Link href={`/buyer/listings/${listing.id}`} className="block w-full">
            <Button variant="primary" size="sm" className="w-full justify-center shadow-xs">
              {t('marketplace.view_details')} →
            </Button>
          </Link>
        </div>
      </div>
    </Card>
  );
};
