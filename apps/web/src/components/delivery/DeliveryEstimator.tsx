'use client';

import React, { useState } from 'react';
import { MarketplaceListing, DeliveryType, DeliveryEstimateResult } from '@rythuconnect/types';
import { useTranslation } from '@/context/LanguageContext';
import { deliveryService } from '@/services/delivery.service';
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

export interface DeliveryEstimatorProps {
  listing: MarketplaceListing;
}

export const DeliveryEstimator: React.FC<DeliveryEstimatorProps> = ({ listing }) => {
  const { t } = useTranslation();

  const isPickup = listing.deliveryType === DeliveryType.BUYER_PICKUP;
  const hasOriginCoords = Boolean(
    listing.coordinates?.coordinates &&
      Array.isArray(listing.coordinates.coordinates) &&
      listing.coordinates.coordinates.length === 2
  );

  const [latitude, setLatitude] = useState('');
  const [longitude, setLongitude] = useState('');
  const [loading, setLoading] = useState(false);
  const [geoLoading, setGeoLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [geoError, setGeoError] = useState<string | null>(null);
  const [estimate, setEstimate] = useState<DeliveryEstimateResult | null>(null);

  // Browser Geolocation trigger - only invoked after explicit user click
  const handleUseCurrentLocation = () => {
    setGeoError(null);
    setError(null);

    if (typeof window === 'undefined' || !navigator.geolocation) {
      setGeoError(t('delivery.location_not_supported'));
      return;
    }

    setGeoLoading(true);

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setGeoLoading(false);
        const lat = pos.coords.latitude;
        const lon = pos.coords.longitude;
        setLatitude(lat.toFixed(6));
        setLongitude(lon.toFixed(6));
      },
      (err) => {
        setGeoLoading(false);
        switch (err.code) {
          case err.PERMISSION_DENIED:
            setGeoError(t('delivery.location_denied'));
            break;
          case err.POSITION_UNAVAILABLE:
            setGeoError(t('delivery.location_unavailable'));
            break;
          case err.TIMEOUT:
            setGeoError(t('delivery.location_timeout'));
            break;
          default:
            setGeoError(t('delivery.location_unavailable'));
            break;
        }
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 60000,
      }
    );
  };

  const handleCalculate = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setGeoError(null);

    const latNum = parseFloat(latitude.trim());
    const lonNum = parseFloat(longitude.trim());

    if (
      isNaN(latNum) ||
      isNaN(lonNum) ||
      !isFinite(latNum) ||
      !isFinite(lonNum) ||
      latNum < -90 ||
      latNum > 90 ||
      lonNum < -180 ||
      lonNum > 180
    ) {
      setError(t('delivery.invalid_coords'));
      return;
    }

    setLoading(true);

    try {
      const res = await deliveryService.estimateDelivery({
        listingId: listing.id,
        destination: {
          // Canonical GeoJSON format: [longitude, latitude]
          coordinates: [lonNum, latNum],
        },
      });

      if (res.success && res.data) {
        setEstimate(res.data);
      } else {
        setError(res.message || t('delivery.estimate_error'));
      }
    } catch {
      setError(t('delivery.estimate_error'));
    } finally {
      setLoading(false);
    }
  };

  const handleRecalculate = () => {
    setEstimate(null);
    setError(null);
    setGeoError(null);
  };

  return (
    <Card variant="elevated" className="border-slate-200/80 rounded-2xl overflow-hidden">
      <CardHeader className="pb-3 border-b border-slate-100 bg-slate-50/50">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <CardTitle className="text-base font-bold text-slate-900 flex items-center gap-2">
            <span aria-hidden="true">🚚</span> {t('delivery.estimate_title')}
          </CardTitle>
          <Badge
            variant={isPickup ? 'secondary' : 'success'}
            className="text-xs font-semibold px-2.5 py-0.5"
          >
            {isPickup
              ? t('listings.delivery_buyer_pickup')
              : t('listings.delivery_farmer_delivery')}
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="pt-4 space-y-4 text-sm">
        {/* CASE 1: BUYER_PICKUP */}
        {isPickup ? (
          <div className="space-y-3">
            <div className="p-3.5 rounded-xl bg-blue-50/70 border border-blue-100/80 space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="font-bold text-blue-900">
                  {t('delivery.pickup_title')}
                </span>
                <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-blue-200/60 text-blue-800">
                  {t('delivery.pickup_badge')}
                </span>
              </div>
              <p className="text-xs text-blue-800/90 leading-relaxed">
                {t('delivery.pickup_desc')}
              </p>
            </div>

            <div className="p-3 rounded-xl bg-slate-50 border border-slate-100 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-slate-600 font-medium">
                  {t('marketplace.delivery_charge')}:
                </span>
                <span className="font-bold text-emerald-700">
                  {t('delivery.free_charge')}
                </span>
              </div>

              <div className="flex items-start gap-2 pt-2 border-t border-slate-200/60">
                <span className="text-slate-500" aria-hidden="true">📍</span>
                <div>
                  <span className="text-xs font-semibold text-slate-500 block">
                    {t('delivery.origin_location')}
                  </span>
                  <span className="text-sm font-semibold text-slate-800">
                    {listing.location}
                  </span>
                </div>
              </div>
            </div>
          </div>
        ) : (
          /* CASE 2: FARMER_DELIVERY */
          <div className="space-y-4">
            <div className="p-3.5 rounded-xl bg-emerald-50/70 border border-emerald-100/80 space-y-1">
              <span className="font-bold text-emerald-900 block">
                {t('delivery.farmer_delivery_title')}
              </span>
              <p className="text-xs text-emerald-800/90 leading-relaxed">
                {t('delivery.farmer_delivery_desc')}
              </p>
            </div>

            <div className="flex items-start gap-2 p-3 rounded-xl bg-slate-50 border border-slate-100">
              <span className="text-slate-500" aria-hidden="true">📍</span>
              <div>
                <span className="text-xs font-semibold text-slate-500 block">
                  {t('delivery.origin_location')}
                </span>
                <span className="text-sm font-semibold text-slate-800">
                  {listing.location}
                </span>
              </div>
            </div>

            {!hasOriginCoords ? (
              <Alert variant="warning" className="text-xs">
                {t('delivery.no_coords_warning')}
              </Alert>
            ) : estimate ? (
              /* ESTIMATE RESULT VIEW */
              <div
                className="space-y-3 p-4 rounded-xl bg-slate-50 border border-slate-200/80"
                aria-live="polite"
              >
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="p-3 rounded-lg bg-white border border-slate-200/80">
                    <span className="text-xs font-semibold text-slate-500 block">
                      {t('delivery.estimated_distance')}
                    </span>
                    <span className="text-lg font-black text-slate-900">
                      {estimate.distanceKm !== null ? `${estimate.distanceKm} km` : '—'}
                    </span>
                  </div>

                  <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-200">
                    <span className="text-xs font-semibold text-emerald-700 block">
                      {t('delivery.estimated_fee')}
                    </span>
                    <span className="text-lg font-black text-emerald-800">
                      ₹{estimate.deliveryCharge}
                    </span>
                  </div>
                </div>

                {estimate.breakdown && (
                  <div className="text-xs text-slate-600 bg-white p-3 rounded-lg border border-slate-200/60 space-y-1.5">
                    <div className="flex justify-between">
                      <span>{t('delivery.base_fee')}:</span>
                      <span className="font-semibold text-slate-800">
                        ₹{estimate.breakdown.baseCharge}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span>
                        {t('delivery.distance_fee')} (@ ₹{estimate.breakdown.ratePerKm}/km):
                      </span>
                      <span className="font-semibold text-slate-800">
                        ₹{estimate.breakdown.distanceCharge}
                      </span>
                    </div>
                  </div>
                )}

                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleRecalculate}
                  className="w-full justify-center text-xs font-semibold"
                >
                  🔄 {t('delivery.recalculate')}
                </Button>
              </div>
            ) : (
              /* ESTIMATE INPUT FORM */
              <form onSubmit={handleCalculate} className="space-y-3">
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <span className="text-xs font-bold text-slate-700">
                    {t('delivery.destination_heading')}
                  </span>
                  <button
                    type="button"
                    onClick={handleUseCurrentLocation}
                    disabled={geoLoading || loading}
                    className="text-xs font-semibold text-emerald-700 hover:text-emerald-800 underline disabled:opacity-50 inline-flex items-center gap-1 cursor-pointer"
                  >
                    {geoLoading ? (
                      <>
                        <Spinner size="sm" className="mr-1 text-emerald-600" />
                        {t('delivery.getting_location')}
                      </>
                    ) : (
                      <>
                        <span aria-hidden="true">🎯</span>
                        {t('delivery.use_my_location')}
                      </>
                    )}
                  </button>
                </div>

                {geoError && (
                  <Alert variant="warning" className="text-xs">
                    {geoError}
                  </Alert>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <div>
                    <label
                      htmlFor="destination-latitude"
                      className="text-xs font-semibold text-slate-600 block mb-1"
                    >
                      {t('delivery.latitude')}
                    </label>
                    <input
                      id="destination-latitude"
                      type="text"
                      inputMode="decimal"
                      value={latitude}
                      onChange={(e) => setLatitude(e.target.value)}
                      placeholder={t('delivery.latitude_placeholder')}
                      disabled={loading}
                      required
                      className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 disabled:bg-slate-100"
                    />
                  </div>

                  <div>
                    <label
                      htmlFor="destination-longitude"
                      className="text-xs font-semibold text-slate-600 block mb-1"
                    >
                      {t('delivery.longitude')}
                    </label>
                    <input
                      id="destination-longitude"
                      type="text"
                      inputMode="decimal"
                      value={longitude}
                      onChange={(e) => setLongitude(e.target.value)}
                      placeholder={t('delivery.longitude_placeholder')}
                      disabled={loading}
                      required
                      className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 disabled:bg-slate-100"
                    />
                  </div>
                </div>

                {error && (
                  <Alert variant="error" className="text-xs">
                    {error}
                  </Alert>
                )}

                <Button
                  type="submit"
                  variant="primary"
                  size="md"
                  disabled={loading || !latitude.trim() || !longitude.trim()}
                  className="w-full justify-center bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2.5 shadow-sm"
                >
                  {loading ? (
                    <>
                      <Spinner size="sm" className="mr-2 text-white" />
                      {t('delivery.calculating')}
                    </>
                  ) : (
                    <>
                      <span className="mr-1.5" aria-hidden="true">⚡</span>
                      {t('delivery.calculate_btn')}
                    </>
                  )}
                </Button>
              </form>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
