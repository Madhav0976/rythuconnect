'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { UserRole, CreateListingRequest } from '@rythuconnect/types';
import { useTranslation } from '@/context/LanguageContext';
import { RoleGuard } from '@/components/auth/RoleGuard';
import { ListingForm } from '@/components/farmer';
import { listingService } from '@/services/listing.service';
import { Alert } from '@/components/ui';

export default function NewListingPage() {
  const router = useRouter();
  const { t } = useTranslation();

  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [serverError, setServerError] = useState<string | null>(null);

  const handleSubmit = async (payload: CreateListingRequest) => {
    setIsSubmitting(true);
    setServerError(null);

    try {
      const result = await listingService.createListing(payload);

      if (result.success) {
        router.push('/farmer/listings');
      } else {
        setServerError(result.message || 'Failed to create crop listing. Please try again.');
      }
    } catch {
      setServerError('An unexpected error occurred while creating the listing.');
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

          {/* Page Heading */}
          <div className="mb-6">
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-slate-900">
              {t('listings.create_title')}
            </h1>
            <p className="mt-1.5 text-sm sm:text-base text-slate-600">
              {t('listings.create_subtitle')}
            </p>
          </div>

          {/* Server-level Error Alert */}
          {serverError && (
            <div className="mb-6">
              <Alert variant="error" title="Listing Creation Failed">
                {serverError}
              </Alert>
            </div>
          )}

          {/* Listing Creation Form */}
          <ListingForm
            isEditing={false}
            onSubmit={handleSubmit}
            isSubmitting={isSubmitting}
            serverError={serverError}
          />
        </div>
      </main>
    </RoleGuard>
  );
}
