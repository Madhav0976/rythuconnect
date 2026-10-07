'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { UserRole, MarketplaceListing, DeliveryType, Category } from '@rythuconnect/types';
import { useTranslation } from '@/context/LanguageContext';
import { RoleGuard } from '@/components/auth/RoleGuard';
import { listingService } from '@/services/listing.service';
import { buildWhatsAppUrl } from '@/lib/whatsapp';
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  Badge,
  Button,
  Spinner,
  Alert,
} from '@/components/ui';

export default function BuyerListingDetailPage() {
  const params = useParams();
  const { t, language } = useTranslation();

  const listingId = Array.isArray(params?.id) ? params.id[0] : (params?.id as string);

  const [listing, setListing] = useState<MarketplaceListing | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedImgIndex, setSelectedImgIndex] = useState(0);
  const [imgError, setImgError] = useState(false);

  // WhatsApp Contact state
  const [contactLoading, setContactLoading] = useState(false);
  const [contactError, setContactError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    if (!listingId) return;

    listingService
      .getMarketplaceListingById(listingId)
      .then((data) => {
        if (!mounted) return;
        if (!data) {
          setError(t('marketplace.listing_not_found_desc'));
        } else {
          setListing(data);
        }
      })
      .catch(() => {
        if (mounted) setError(t('marketplace.listing_not_found_desc'));
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, [listingId, t]);

  const categoryName = React.useMemo(() => {
    if (!listing?.category) return '';
    if (typeof listing.category === 'string') return listing.category;
    const cat = listing.category as Category;
    if (cat.translations && typeof cat.translations === 'object') {
      const trans = (cat.translations as Record<string, string | undefined>)[language];
      if (trans) return trans;
    }
    return cat.name || '';
  }, [listing, language]);

  const formattedDate = React.useMemo(() => {
    if (!listing?.harvestDate) return '';
    try {
      const d = new Date(listing.harvestDate);
      const locale = language === 'te' ? 'te-IN' : language === 'hi' ? 'hi-IN' : 'en-IN';
      return d.toLocaleDateString(locale, {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      });
    } catch {
      return '';
    }
  }, [listing, language]);

  const unitKey = listing?.quantityUnit ? `listings.unit_${listing.quantityUnit.toLowerCase()}` : '';
  const translatedUnit = unitKey && t(unitKey) !== unitKey ? t(unitKey) : listing?.quantityUnit || '';

  const handleWhatsAppContact = async () => {
    if (!listing) return;
    setContactLoading(true);
    setContactError(null);

    try {
      const contactInfo = await listingService.getListingContact(listing.id);
      if (!contactInfo || !contactInfo.farmerPhone) {
        setContactError(t('marketplace.contact_error'));
        return;
      }

      // Format prefilled WhatsApp message in buyer's active language
      const templateMsg = t('marketplace.whatsapp_message') || 'Hi, I am interested in your {{cropName}} listing on RythuConnect.';
      const messageText = templateMsg.replace('{{cropName}}', listing.cropName);

      const waUrl = buildWhatsAppUrl(contactInfo.farmerPhone, messageText);
      if (!waUrl) {
        setContactError(t('marketplace.contact_error'));
        return;
      }

      window.open(waUrl, '_blank', 'noopener,noreferrer');
    } catch {
      setContactError(t('marketplace.contact_error'));
    } finally {
      setContactLoading(false);
    }
  };

  return (
    <RoleGuard allowedRoles={[UserRole.BUYER]}>
      <div className="flex-1 w-full max-w-5xl mx-auto p-4 sm:p-6 lg:p-8 space-y-6">
        {/* Navigation Breadcrumb */}
        <div className="flex items-center justify-between pb-2 border-b border-slate-200/80">
          <Link
            href="/buyer/marketplace"
            className="inline-flex items-center gap-1.5 text-sm font-semibold text-emerald-700 hover:text-emerald-800 transition-colors"
          >
            ← {t('marketplace.back_to_marketplace')}
          </Link>

          <Link href="/profile">
            <Button variant="ghost" size="sm" className="text-xs text-slate-600">
              {t('nav.profile')}
            </Button>
          </Link>
        </div>

        {/* Loading State */}
        {loading && (
          <div className="flex flex-col items-center justify-center py-24 space-y-3">
            <Spinner size="lg" />
            <p className="text-sm text-slate-500 font-medium">{t('common.loading')}</p>
          </div>
        )}

        {/* Not Found / Error State */}
        {!loading && (!listing || error) && (
          <div className="rounded-2xl border border-slate-200 bg-white p-8 sm:p-12 text-center space-y-4 max-w-md mx-auto shadow-xs">
            <span className="text-5xl select-none" aria-hidden="true">
              🌾
            </span>
            <div className="space-y-1">
              <h2 className="text-xl font-bold text-slate-900">
                {t('marketplace.listing_not_found_title')}
              </h2>
              <p className="text-sm text-slate-600">
                {error || t('marketplace.listing_not_found_desc')}
              </p>
            </div>
            <Link href="/buyer/marketplace">
              <Button variant="primary" size="sm">
                ← {t('marketplace.back_to_marketplace')}
              </Button>
            </Link>
          </div>
        )}

        {/* Listing Detail Card */}
        {!loading && listing && (
          <div className="grid grid-cols-1 md:grid-cols-12 gap-6 lg:gap-8 items-start">
            {/* Left Column: Image Gallery */}
            <div className="md:col-span-5 space-y-3">
              <div className="relative w-full h-64 sm:h-80 md:h-96 rounded-2xl overflow-hidden bg-slate-100 border border-slate-200/80 flex items-center justify-center shadow-xs">
                {listing.images && listing.images.length > 0 && !imgError ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={listing.images[selectedImgIndex] || listing.images[0]}
                    alt={listing.cropName}
                    className="w-full h-full object-cover"
                    onError={() => setImgError(true)}
                  />
                ) : (
                  <div className="flex flex-col items-center justify-center p-6 text-slate-400">
                    <span className="text-6xl select-none" aria-hidden="true">
                      🌾
                    </span>
                    <span className="text-sm font-semibold text-slate-500 mt-2">
                      {listing.cropName}
                    </span>
                  </div>
                )}

                {/* Delivery Badge Overlay */}
                <div className="absolute top-3 right-3">
                  <Badge variant="neutral" size="sm" className="bg-white/95 text-slate-700 shadow-xs backdrop-blur-xs">
                    {listing.deliveryType === DeliveryType.FARMER_DELIVERY ? '🚚' : '🏠'}{' '}
                    {listing.deliveryType === DeliveryType.FARMER_DELIVERY
                      ? t('listings.delivery_farmer_delivery')
                      : t('listings.delivery_buyer_pickup')}
                  </Badge>
                </div>
              </div>

              {/* Thumbnails Row if multiple images */}
              {listing.images && listing.images.length > 1 && !imgError && (
                <div className="flex gap-2 overflow-x-auto pb-1">
                  {listing.images.map((img, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => setSelectedImgIndex(idx)}
                      className={`relative w-16 h-16 rounded-xl overflow-hidden border-2 transition-all shrink-0 ${
                        selectedImgIndex === idx
                          ? 'border-emerald-600 ring-2 ring-emerald-600/30'
                          : 'border-slate-200 hover:border-slate-300'
                      }`}
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={img} alt={`${listing.cropName} ${idx + 1}`} className="w-full h-full object-cover" />
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Right Column: Information, Pricing & CTA */}
            <div className="md:col-span-7 space-y-6">
              {/* Header & Title */}
              <div className="space-y-2">
                <div className="flex flex-wrap items-center gap-2">
                  {categoryName && (
                    <Badge variant="primary" size="sm" className="font-semibold">
                      {categoryName}
                    </Badge>
                  )}
                  {listing.farmer?.isVerified && (
                    <Badge variant="success" size="sm" className="font-semibold">
                      ✓ {t('marketplace.verified_farmer')}
                    </Badge>
                  )}
                </div>

                <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
                  {listing.cropName}
                </h1>

                {/* Price Display */}
                <div className="p-4 rounded-2xl bg-emerald-50/80 border border-emerald-100 flex items-baseline gap-2">
                  <span className="text-3xl sm:text-4xl font-black text-emerald-800">
                    ₹{listing.price}
                  </span>
                  <span className="text-sm font-semibold text-emerald-700">
                    / {translatedUnit}
                  </span>
                </div>
              </div>

              {/* Produce Specifications */}
              <Card variant="elevated" className="border-slate-200/80 rounded-2xl">
                <CardHeader className="pb-3 border-b border-slate-100">
                  <CardTitle className="text-base font-bold text-slate-900">
                    📋 {t('marketplace.produce_details')}
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-4 space-y-3 text-sm">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
                      <span className="text-xs font-semibold text-slate-500 block">
                        {t('marketplace.available_qty')}
                      </span>
                      <span className="text-base font-bold text-slate-800">
                        {listing.quantity} {translatedUnit}
                      </span>
                    </div>

                    <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
                      <span className="text-xs font-semibold text-slate-500 block">
                        {t('marketplace.harvest_date')}
                      </span>
                      <span className="text-base font-bold text-slate-800">
                        {formattedDate}
                      </span>
                    </div>
                  </div>

                  <div className="p-3 rounded-xl bg-slate-50 border border-slate-100 flex items-start gap-2">
                    <span className="text-lg" aria-hidden="true">📍</span>
                    <div>
                      <span className="text-xs font-semibold text-slate-500 block">
                        {t('marketplace.location')}
                      </span>
                      <span className="text-sm font-medium text-slate-800">
                        {listing.location}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Delivery Specifications */}
              <Card variant="elevated" className="border-slate-200/80 rounded-2xl">
                <CardHeader className="pb-3 border-b border-slate-100">
                  <CardTitle className="text-base font-bold text-slate-900">
                    🚚 {t('marketplace.delivery_options')}
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-4 space-y-2 text-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-600 font-medium">
                      {t('marketplace.delivery_method')}:
                    </span>
                    <span className="font-semibold text-slate-800">
                      {listing.deliveryType === DeliveryType.FARMER_DELIVERY
                        ? t('listings.delivery_farmer_delivery')
                        : t('listings.delivery_buyer_pickup')}
                    </span>
                  </div>

                  {listing.deliveryType === DeliveryType.FARMER_DELIVERY ? (
                    <div className="flex items-center justify-between pt-1 border-t border-slate-100">
                      <span className="text-slate-600 font-medium">
                        {t('marketplace.delivery_charge')}:
                      </span>
                      <span className="font-bold text-slate-800">
                        {listing.deliveryCharge ? `₹${listing.deliveryCharge}` : 'Free'}
                      </span>
                    </div>
                  ) : (
                    <div className="text-xs text-slate-500 pt-1">
                      {t('marketplace.free_pickup')}
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Farmer Contact & WhatsApp CTA */}
              <div className="space-y-3 pt-2">
                <div className="rounded-2xl bg-amber-50/60 border border-amber-200/70 p-4 text-xs text-amber-900 space-y-1">
                  <div className="font-bold flex items-center gap-1.5">
                    <span>🌾</span> {t('marketplace.direct_deal')}
                  </div>
                  <p>{t('marketplace.no_middleman')}</p>
                </div>

                {contactError && (
                  <Alert variant="error" className="text-xs">
                    {contactError}
                  </Alert>
                )}

                <Button
                  variant="primary"
                  size="lg"
                  onClick={handleWhatsAppContact}
                  disabled={contactLoading}
                  className="w-full justify-center bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3.5 shadow-md text-base"
                >
                  {contactLoading ? (
                    <>
                      <Spinner size="sm" className="mr-2 text-white" />
                      {t('marketplace.contacting')}
                    </>
                  ) : (
                    <>
                      <span className="mr-2 text-lg" aria-hidden="true">💬</span>
                      {t('marketplace.contact_whatsapp')}
                    </>
                  )}
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </RoleGuard>
  );
}
