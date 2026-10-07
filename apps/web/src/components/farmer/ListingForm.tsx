'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Category,
  CreateListingRequest,
  DeliveryType,
  QuantityUnit,
} from '@rythuconnect/types';
import { useTranslation } from '@/context/LanguageContext';
import { listingService } from '@/services/listing.service';
import {
  Button,
  Input,
  Select,
  FormField,
  Alert,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui';

export interface ListingFormProps {
  initialData?: Partial<CreateListingRequest>;
  isEditing?: boolean;
  onSubmit: (data: CreateListingRequest) => Promise<void>;
  isSubmitting: boolean;
  serverError?: string | null;
}

export const ListingForm: React.FC<ListingFormProps> = ({
  initialData,
  isEditing = false,
  onSubmit,
  isSubmitting,
  serverError,
}) => {
  const { t, language } = useTranslation();

  const [categories, setCategories] = useState<Category[]>([]);
  const [loadingCategories, setLoadingCategories] = useState<boolean>(true);

  // Form Fields
  const [cropName, setCropName] = useState<string>(initialData?.cropName || '');
  const [categoryId, setCategoryId] = useState<string>(initialData?.categoryId || '');
  const [quantity, setQuantity] = useState<string>(
    initialData?.quantity !== undefined ? String(initialData.quantity) : ''
  );
  const [quantityUnit, setQuantityUnit] = useState<QuantityUnit>(
    initialData?.quantityUnit || QuantityUnit.KG
  );
  const [price, setPrice] = useState<string>(
    initialData?.price !== undefined ? String(initialData.price) : ''
  );
  const [harvestDate, setHarvestDate] = useState<string>(() => {
    if (initialData?.harvestDate) {
      const d = new Date(initialData.harvestDate);
      return !isNaN(d.getTime()) ? d.toISOString().split('T')[0] : '';
    }
    return new Date().toISOString().split('T')[0];
  });
  const [deliveryType, setDeliveryType] = useState<DeliveryType>(
    initialData?.deliveryType || DeliveryType.BUYER_PICKUP
  );
  const [deliveryCharge, setDeliveryCharge] = useState<string>(
    initialData?.deliveryCharge !== undefined ? String(initialData.deliveryCharge) : '0'
  );
  const [location, setLocation] = useState<string>(initialData?.location || '');
  const [latitude, setLatitude] = useState<string>(
    initialData?.coordinates?.coordinates?.[1] !== undefined
      ? String(initialData.coordinates.coordinates[1])
      : ''
  );
  const [longitude, setLongitude] = useState<string>(
    initialData?.coordinates?.coordinates?.[0] !== undefined
      ? String(initialData.coordinates.coordinates[0])
      : ''
  );

  // Image URLs management
  const [images, setImages] = useState<string[]>(initialData?.images || []);
  const [newImageUrl, setNewImageUrl] = useState<string>('');
  const [imageError, setImageError] = useState<string | null>(null);

  // Field validation errors
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Fetch categories on mount
  useEffect(() => {
    let isMounted = true;
    listingService.getCategories().then((cats) => {
      if (!isMounted) return;
      setCategories(cats);
      setLoadingCategories(false);
      if (!categoryId && cats.length > 0 && !isEditing) {
        setCategoryId(cats[0].id);
      }
    });
    return () => {
      isMounted = false;
    };
  }, [categoryId, isEditing]);

  const validateForm = (): boolean => {
    const errs: Record<string, string> = {};

    if (!cropName.trim() || cropName.trim().length < 2) {
      errs.cropName = 'Crop name must be at least 2 characters long';
    } else if (cropName.trim().length > 100) {
      errs.cropName = 'Crop name cannot exceed 100 characters';
    }

    if (!categoryId) {
      errs.categoryId = 'Please select a crop category';
    }

    const parsedQty = parseFloat(quantity);
    if (isNaN(parsedQty) || parsedQty <= 0) {
      errs.quantity = 'Please enter a valid positive quantity';
    }

    const parsedPrice = parseFloat(price);
    if (isNaN(parsedPrice) || parsedPrice <= 0) {
      errs.price = 'Please enter a valid positive price greater than 0';
    }

    if (!harvestDate) {
      errs.harvestDate = 'Harvest date is required';
    }

    if (deliveryType === DeliveryType.FARMER_DELIVERY) {
      const parsedCharge = parseFloat(deliveryCharge);
      if (isNaN(parsedCharge) || parsedCharge < 0) {
        errs.deliveryCharge = 'Delivery charge cannot be negative';
      }
    }

    if (!location.trim() || location.trim().length < 2) {
      errs.location = 'Farm location is required (at least 2 characters)';
    }

    if (latitude || longitude) {
      const lat = parseFloat(latitude);
      const lng = parseFloat(longitude);
      if (isNaN(lat) || lat < -90 || lat > 90) {
        errs.latitude = 'Latitude must be between -90 and 90';
      }
      if (isNaN(lng) || lng < -180 || lng > 180) {
        errs.longitude = 'Longitude must be between -180 and 180';
      }
    }

    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleAddImage = () => {
    setImageError(null);
    const trimmed = newImageUrl.trim();
    if (!trimmed) return;

    if (images.length >= 5) {
      setImageError('Maximum 5 images allowed per listing');
      return;
    }

    try {
      const parsed = new URL(trimmed);
      if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
        setImageError('Image URL must start with http:// or https://');
        return;
      }
    } catch {
      setImageError('Please enter a valid image URL');
      return;
    }

    if (images.includes(trimmed)) {
      setImageError('This image URL has already been added');
      return;
    }

    setImages([...images, trimmed]);
    setNewImageUrl('');
  };

  const handleRemoveImage = (indexToRemove: number) => {
    setImages(images.filter((_, idx) => idx !== indexToRemove));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    const payload: CreateListingRequest = {
      cropName: cropName.trim(),
      categoryId,
      quantity: parseFloat(quantity),
      quantityUnit,
      price: parseFloat(price),
      harvestDate,
      deliveryType,
      deliveryCharge:
        deliveryType === DeliveryType.FARMER_DELIVERY ? parseFloat(deliveryCharge) || 0 : 0,
      location: location.trim(),
      images,
    };

    if (latitude && longitude && !isNaN(parseFloat(latitude)) && !isNaN(parseFloat(longitude))) {
      payload.coordinates = {
        type: 'Point',
        coordinates: [parseFloat(longitude), parseFloat(latitude)],
      };
    }

    await onSubmit(payload);
  };

  const getLocalizedCategoryName = (cat: Category): string => {
    if (cat.translations && cat.translations[language]) {
      return cat.translations[language]!;
    }
    return cat.name;
  };

  return (
    <Card variant="elevated" className="border-t-4 border-t-emerald-700 shadow-md">
      <CardHeader className="pb-4">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-2xl" aria-hidden="true">
            {isEditing ? '✏️' : '🌾'}
          </span>
          <CardTitle className="text-xl sm:text-2xl font-extrabold text-slate-900">
            {isEditing ? t('listings.edit_title') : t('listings.create_title')}
          </CardTitle>
        </div>
        <CardDescription className="text-sm text-slate-600">
          {isEditing ? t('listings.edit_subtitle') : t('listings.create_subtitle')}
        </CardDescription>
      </CardHeader>

      <CardContent className="pt-2">
        {serverError && (
          <Alert variant="error" className="mb-6 text-sm">
            {serverError}
          </Alert>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Section 1: Basic Crop Details */}
          <div className="space-y-4">
            <h4 className="text-sm font-bold uppercase tracking-wider text-slate-500 pb-1 border-b border-slate-100">
              1. Crop Identity & Category
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <FormField
                id="cropName"
                label={t('listings.crop_name')}
                required
                error={errors.cropName}
              >
                <Input
                  id="cropName"
                  value={cropName}
                  onChange={(e) => {
                    setCropName(e.target.value);
                    if (errors.cropName) setErrors({ ...errors, cropName: '' });
                  }}
                  placeholder={t('listings.crop_name_placeholder')}
                  disabled={isSubmitting}
                />
              </FormField>

              <FormField
                id="categoryId"
                label={t('listings.category')}
                required
                error={errors.categoryId}
              >
                <Select
                  id="categoryId"
                  value={categoryId}
                  onChange={(e) => {
                    setCategoryId(e.target.value);
                    if (errors.categoryId) setErrors({ ...errors, categoryId: '' });
                  }}
                  disabled={isSubmitting || loadingCategories}
                >
                  {loadingCategories ? (
                    <option value="">{t('common.loading')}</option>
                  ) : (
                    categories.map((cat) => (
                      <option key={cat.id} value={cat.id}>
                        {getLocalizedCategoryName(cat)}
                      </option>
                    ))
                  )}
                </Select>
              </FormField>
            </div>
          </div>

          {/* Section 2: Quantity & Price */}
          <div className="space-y-4">
            <h4 className="text-sm font-bold uppercase tracking-wider text-slate-500 pb-1 border-b border-slate-100">
              2. Quantity & Pricing
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <FormField
                id="quantity"
                label={t('listings.quantity')}
                required
                error={errors.quantity}
              >
                <Input
                  id="quantity"
                  type="number"
                  min="0.01"
                  step="any"
                  value={quantity}
                  onChange={(e) => {
                    setQuantity(e.target.value);
                    if (errors.quantity) setErrors({ ...errors, quantity: '' });
                  }}
                  placeholder="e.g. 500"
                  disabled={isSubmitting}
                />
              </FormField>

              <FormField
                id="quantityUnit"
                label={t('listings.quantity_unit')}
                required
              >
                <Select
                  id="quantityUnit"
                  value={quantityUnit}
                  onChange={(e) => setQuantityUnit(e.target.value as QuantityUnit)}
                  disabled={isSubmitting}
                >
                  <option value={QuantityUnit.KG}>{t('listings.unit_kg')}</option>
                  <option value={QuantityUnit.QUINTAL}>{t('listings.unit_quintal')}</option>
                  <option value={QuantityUnit.TON}>{t('listings.unit_ton')}</option>
                  <option value={QuantityUnit.BAG}>{t('listings.unit_bag')}</option>
                  <option value={QuantityUnit.CRATE}>{t('listings.unit_crate')}</option>
                  <option value={QuantityUnit.PIECE}>{t('listings.unit_piece')}</option>
                </Select>
              </FormField>

              <FormField
                id="price"
                label={t('listings.price')}
                required
                error={errors.price}
              >
                <Input
                  id="price"
                  type="number"
                  min="0"
                  step="any"
                  leftAddon={<span className="font-bold text-slate-700">₹</span>}
                  value={price}
                  onChange={(e) => {
                    setPrice(e.target.value);
                    if (errors.price) setErrors({ ...errors, price: '' });
                  }}
                  placeholder={t('listings.price_placeholder')}
                  disabled={isSubmitting}
                />
              </FormField>
            </div>
          </div>

          {/* Section 3: Harvest & Delivery */}
          <div className="space-y-4">
            <h4 className="text-sm font-bold uppercase tracking-wider text-slate-500 pb-1 border-b border-slate-100">
              3. Harvest Date & Delivery Method
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <FormField
                id="harvestDate"
                label={t('listings.harvest_date')}
                required
                error={errors.harvestDate}
              >
                <Input
                  id="harvestDate"
                  type="date"
                  value={harvestDate}
                  onChange={(e) => {
                    setHarvestDate(e.target.value);
                    if (errors.harvestDate) setErrors({ ...errors, harvestDate: '' });
                  }}
                  disabled={isSubmitting}
                />
              </FormField>

              <FormField
                id="deliveryType"
                label={t('listings.delivery_type')}
                required
              >
                <Select
                  id="deliveryType"
                  value={deliveryType}
                  onChange={(e) => setDeliveryType(e.target.value as DeliveryType)}
                  disabled={isSubmitting}
                >
                  <option value={DeliveryType.BUYER_PICKUP}>
                    {t('listings.delivery_buyer_pickup')}
                  </option>
                  <option value={DeliveryType.FARMER_DELIVERY}>
                    {t('listings.delivery_farmer_delivery')}
                  </option>
                </Select>
              </FormField>

              {deliveryType === DeliveryType.FARMER_DELIVERY && (
                <FormField
                  id="deliveryCharge"
                  label={t('listings.delivery_charge')}
                  hint={t('listings.delivery_charge_hint')}
                  error={errors.deliveryCharge}
                >
                  <Input
                    id="deliveryCharge"
                    type="number"
                    min="0"
                    step="any"
                    leftAddon={<span className="font-bold text-slate-700">₹</span>}
                    value={deliveryCharge}
                    onChange={(e) => {
                      setDeliveryCharge(e.target.value);
                      if (errors.deliveryCharge) setErrors({ ...errors, deliveryCharge: '' });
                    }}
                    disabled={isSubmitting}
                  />
                </FormField>
              )}
            </div>
          </div>

          {/* Section 4: Location */}
          <div className="space-y-4">
            <h4 className="text-sm font-bold uppercase tracking-wider text-slate-500 pb-1 border-b border-slate-100">
              4. Farm Location & Coordinates
            </h4>

            <FormField
              id="location"
              label={t('listings.location')}
              required
              error={errors.location}
            >
              <Input
                id="location"
                value={location}
                onChange={(e) => {
                  setLocation(e.target.value);
                  if (errors.location) setErrors({ ...errors, location: '' });
                }}
                placeholder={t('listings.location_placeholder')}
                disabled={isSubmitting}
              />
            </FormField>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <FormField
                id="latitude"
                label={t('listings.latitude')}
                error={errors.latitude}
                hint="e.g. 16.5062 (-90 to 90)"
              >
                <Input
                  id="latitude"
                  type="number"
                  step="any"
                  value={latitude}
                  onChange={(e) => {
                    setLatitude(e.target.value);
                    if (errors.latitude) setErrors({ ...errors, latitude: '' });
                  }}
                  placeholder="16.5062"
                  disabled={isSubmitting}
                />
              </FormField>

              <FormField
                id="longitude"
                label={t('listings.longitude')}
                error={errors.longitude}
                hint="e.g. 80.6480 (-180 to 180)"
              >
                <Input
                  id="longitude"
                  type="number"
                  step="any"
                  value={longitude}
                  onChange={(e) => {
                    setLongitude(e.target.value);
                    if (errors.longitude) setErrors({ ...errors, longitude: '' });
                  }}
                  placeholder="80.6480"
                  disabled={isSubmitting}
                />
              </FormField>
            </div>
          </div>

          {/* Section 5: Image URLs */}
          <div className="space-y-3">
            <h4 className="text-sm font-bold uppercase tracking-wider text-slate-500 pb-1 border-b border-slate-100">
              5. Crop Images
            </h4>
            <p className="text-xs text-slate-600 leading-relaxed">
              {t('listings.image_hint')}
            </p>

            <div className="flex flex-col sm:flex-row gap-2">
              <Input
                value={newImageUrl}
                onChange={(e) => {
                  setNewImageUrl(e.target.value);
                  if (imageError) setImageError(null);
                }}
                placeholder={t('listings.image_url_placeholder')}
                disabled={isSubmitting || images.length >= 5}
                className="flex-1"
              />
              <Button
                type="button"
                variant="outline"
                size="md"
                onClick={handleAddImage}
                disabled={isSubmitting || !newImageUrl.trim() || images.length >= 5}
                className="shrink-0"
              >
                + {t('listings.add_image_url')}
              </Button>
            </div>

            {imageError && (
              <p className="text-xs font-semibold text-red-600 mt-1">{imageError}</p>
            )}

            {/* Thumbnail previews */}
            {images.length > 0 && (
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 pt-2">
                {images.map((url, idx) => (
                  <div
                    key={idx}
                    className="relative group rounded-xl border border-slate-200 overflow-hidden bg-slate-50 aspect-square flex flex-col justify-between"
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={url}
                      alt={`Crop photo ${idx + 1}`}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src =
                          'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100" viewBox="0 0 24 24" fill="none" stroke="%2394a3b8" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>';
                      }}
                    />
                    <button
                      type="button"
                      onClick={() => handleRemoveImage(idx)}
                      className="absolute top-1.5 right-1.5 rounded-full bg-red-600/90 text-white p-1 hover:bg-red-700 shadow-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-1 focus-visible:ring-red-600"
                      aria-label={`${t('listings.remove_image')} image ${idx + 1}`}
                    >
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Form Actions */}
          <div className="flex flex-col-reverse sm:flex-row sm:items-center sm:justify-end gap-3 pt-4 border-t border-slate-100">
            <Link href="/farmer/listings" className="w-full sm:w-auto">
              <Button
                type="button"
                variant="outline"
                size="md"
                fullWidth
                disabled={isSubmitting}
              >
                {t('common.cancel')}
              </Button>
            </Link>

            <Button
              type="submit"
              variant="primary"
              size="md"
              fullWidth
              className="sm:w-auto min-w-[160px]"
              isLoading={isSubmitting}
            >
              {isEditing ? t('listings.save_changes') : t('listings.save_listing')}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
};
