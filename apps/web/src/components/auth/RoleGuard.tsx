'use client';

import React, { useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { UserRole } from '@rythuconnect/types';
import { useAuth } from '@/context/AuthContext';
import { Spinner } from '@/components/ui/Spinner';

export interface RoleGuardProps {
  children: React.ReactNode;
  allowedRoles?: UserRole[];
}

export const RoleGuard: React.FC<RoleGuardProps> = ({ children, allowedRoles }) => {
  const router = useRouter();
  const pathname = usePathname();
  const { user, isAuthenticated, isLoading } = useAuth();

  useEffect(() => {
    if (isLoading) return;

    if (!isAuthenticated) {
      const redirectQuery = pathname ? `?redirect=${encodeURIComponent(pathname)}` : '';
      router.replace(`/auth/login${redirectQuery}`);
      return;
    }

    if (allowedRoles && user && !allowedRoles.includes(user.role)) {
      router.replace('/unauthorized');
    }
  }, [isLoading, isAuthenticated, user, allowedRoles, router, pathname]);

  // While restoring session from localStorage token, show clean accessible loading state
  if (isLoading) {
    return (
      <div className="flex flex-1 items-center justify-center min-h-[50vh] p-8">
        <div className="flex flex-col items-center gap-3">
          <Spinner size="lg" label="Restoring session..." className="text-emerald-700" />
          <p className="text-sm font-medium text-slate-500">Checking authentication...</p>
        </div>
      </div>
    );
  }

  // If not authenticated or role mismatch, hold render until redirect fires
  if (!isAuthenticated) {
    return null;
  }

  if (allowedRoles && user && !allowedRoles.includes(user.role)) {
    return null;
  }

  return <>{children}</>;
};
