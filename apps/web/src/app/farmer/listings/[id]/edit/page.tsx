'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  UserRole,
  ListingStatus,
  Category,
  PopulatedCropListing,
  CreateListingRequest,
  UpdateListingRequest,
} from '@rythuconnect/types';
import { useAuth } from '@/context/AuthContext';
import { useTranslation } from '@/context/LanguageContext';
import { RoleGuard } from '@/components/auth/RoleGuard';
import { ListingForm } from '@/components/farmer';
import { listingService } from '@/services/listing.service';
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  Alert,
  Button,
  Spinner,
  Badge,
} from '@/components/ui';

export default function EditListingPage() {
  const params = useParams();
  const router = useRouter();
  const { user } = useAuth();
  const { t } = useTranslation();

  const id = Array.isArray(params?.id) ? params.id[0] : (params?.id as string);

  const [listing, setListing] = useState<PopulatedCropListing | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const [notFound, setNotFound] = useState<boolean>(false);

  useEffect(() => {
    let isMounted = true;

    async function fetchListing() {
      if (!id) return;
      setIsLoading(true);
      try {
        const data = await listingService.getListingById(id);
        if (!isMounted) return;

        if (!data) {
          setNotFound(true);
        } else {
          const ownerId =
            typeof data.farmerId === 'object' && data.farmerId !== null
              ? (data.farmerId as { id?: string; _id?: string }).id ||
                (data.farmerId as { id?: string; _id?: string })._id
              : data.farmerId;

          // If current logged-in farmer is not the owner, hide listing
          if (user && ownerId && String(ownerId) !== String(user.id)) {
            setNotFound(true);
          } else {
            setListing(data);
          }
        }
      } catch {
        if (isMounted) setNotFound(true);
      } finally {
        if (isMounted) setIsLoading(false);
      }
    }

    fetchListing();

    return () => {
      isMounted = false;
    };
  }, [id, user]);

  const handleSubmit = async (formData: CreateListingRequest) => {
    if (!id || !listing) return;

    if (listing.status === ListingStatus.SOLD) {
      setServerError(t('listings.sold_cannot_edit'));
      return;
    }

    setIsSubmitting(true);
    setServerError(null);

    const updatePayload: UpdateListingRequest = {
      cropName: formData.cropName,
      categoryId: formData.categoryId,
      quantity: formData.quantity,
      quantityUnit: formData.quantityUnit,
      price: formData.price,
      harvestDate: formData.harvestDate,
      deliveryType: formData.deliveryType,
      deliveryCharge: formData.deliveryCharge,
      location: formData.location,
      coordinates: formData.coordinates,
      images: formData.images,
    };

    try {
      const result = await listingService.updateListing(id, updatePayload);

      if (result.success) {
        router.push('/farmer/listings');
      } else {
        setServerError(result.message || 'Failed to update crop listing. Please try again.');
      }
    } catch {
      setServerError('An unexpected error occurred while updating the listing.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <RoleGuard allowedRoles={[UserRole.FARMER]}>
      <main className="min-h-screen bg-slate-50 py-6 sm:py-10">
        <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
          {/* Back Navigation Breadcrumb */}
          <nav className="mb-6" aria-label="Breadcrumb">
            <Link
              href="/farmer/listings"
              className="inline-flex items-center gap-1.5 text-sm font-semibold text-emerald-700 hover:text-emerald-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600 focus-visible:ring-offset-2 rounded-md transition-colors"
            >
              <span aria-hidden="true">&larr;</span>
              <span>{t('common.back')}</span>
              <span className="text-slate-400 font-normal">/</span>
              <span className="text-slate-600 font-normal">{t('listings.my_listings_title')}</span>
            </Link>
          </nav>

          {/* Loading State */}
          {isLoading && (
            <div className="flex flex-col items-center justify-center py-24 text-center">
              <Spinner size="lg" className="text-emerald-700 mb-4" />
              <p className="text-sm font-medium text-slate-600">Loading crop listing details...</p>
            </div>
          )}

          {/* Not Found State */}
          {!isLoading && notFound && (
            <Card variant="elevated" className="border-t-4 border-t-red-600 text-center py-12">
              <CardContent className="space-y-4">
                <span className="text-4xl" aria-hidden="true">
                  🌾❓
                </span>
                <CardTitle className="text-xl text-slate-900">Crop Listing Not Found</CardTitle>
                <CardDescription className="max-w-md mx-auto text-slate-600">
                  The requested crop listing does not exist or you do not have permission to view or
                  edit it.
                </CardDescription>
                <div className="pt-2">
                  <Link href="/farmer/listings">
                    <Button variant="outline">{t('listings.view_my_listings')}</Button>
                  </Link>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Sold Listing Immutability Guard */}
          {!isLoading && listing && listing.status === ListingStatus.SOLD && (
            <div className="space-y-6">
              <div className="mb-4">
                <div className="flex items-center gap-3">
                  <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-slate-900">
                    {t('listings.edit_title')}
                  </h1>
                  <Badge variant="primary" size="md">
                    {t('listings.status_sold')}
                  </Badge>
                </div>
              </div>

              <Alert variant="warning" title="Listing Cannot Be Edited">
                {t('listings.sold_cannot_edit')}
              </Alert>

              <Card variant="default" className="bg-white">
                <CardHeader>
                  <CardTitle className="text-lg text-slate-900">{listing.cropName}</CardTitle>
                  <CardDescription className="text-sm text-slate-600">
                    {listing.location} &bull; {listing.quantity} {listing.quantityUnit} &bull; ₹
                    {listing.price.toLocaleString('en-IN')}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-slate-700 mb-6">
                    This harvest has already been marked as sold. Once marked as sold, listings
                    cannot be modified or reopened in order to maintain transaction integrity.
                  </p>
                  <Link href="/farmer/listings">
                    <Button variant="primary">{t('listings.view_my_listings')}</Button>
                  </Link>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Active / Editable Listing Form */}
          {!isLoading && listing && listing.status !== ListingStatus.SOLD && (
            <div>
              {/* Page Heading */}
              <div className="mb-6">
                <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-slate-900">
                  {t('listings.edit_title')}
                </h1>
                <p className="mt-1.5 text-sm sm:text-base text-slate-600">
                  {t('listings.edit_subtitle')}
                </p>
              </div>

              {/* Server-level Error Alert */}
              {serverError && (
                <div className="mb-6">
                  <Alert variant="error" title="Update Failed">
                    {serverError}
                  </Alert>
                </div>
              )}

              {/* Form Component */}
              <ListingForm
                key={listing.id}
                initialData={{
                  cropName: listing.cropName,
                  categoryId:
                    typeof listing.categoryId === 'object' && listing.categoryId !== null
                      ? (listing.categoryId as Category).id
                      : listing.categoryId,
                  quantity: listing.quantity,
                  quantityUnit: listing.quantityUnit,
                  price: listing.price,
                  harvestDate: listing.harvestDate,
                  deliveryType: listing.deliveryType,
                  deliveryCharge: listing.deliveryCharge,
                  location: listing.location,
                  coordinates: listing.coordinates,
                  images: listing.images,
                }}
                isEditing={true}
                onSubmit={handleSubmit}
                isSubmitting={isSubmitting}
                serverError={serverError}
              />
            </div>
          )}
        </div>
      </main>
    </RoleGuard>
  );
}
