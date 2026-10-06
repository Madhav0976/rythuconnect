'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { AuthUser, UserRole, LanguageCode } from '@rythuconnect/types';
import { authService, SendOtpResult, VerifyOtpResult } from '@/services/auth.service';
import { tokenStorage } from '@/lib/auth/tokenStorage';
import { registerUnauthorizedListener } from '@/lib/api/client';

interface AuthContextType {
  user: AuthUser | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  sendOtp: (phone: string) => Promise<SendOtpResult>;
  verifyOtp: (params: {
    phone: string;
    otp: string;
    role?: UserRole.FARMER | UserRole.BUYER;
    preferredLanguage?: LanguageCode;
  }) => Promise<VerifyOtpResult>;
  logout: () => Promise<void>;
  clearError: () => void;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [token, setToken] = useState<string | null>(() => tokenStorage.getToken());
  // If no token exists on mount, isLoading is immediately false without cascading render
  const [isLoading, setIsLoading] = useState<boolean>(() => Boolean(tokenStorage.getToken()));
  const [error, setError] = useState<string | null>(null);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  /**
   * Restores user profile asynchronously if token is present on initial load.
   * Registers global 401 handler to clear state on token invalidation.
   */
  useEffect(() => {
    let isMounted = true;

    registerUnauthorizedListener(() => {
      if (isMounted) {
        tokenStorage.clearToken();
        setUser(null);
        setToken(null);
        setIsLoading(false);
      }
    });

    const initialToken = tokenStorage.getToken();

    if (!initialToken) {
      return;
    }

    authService
      .getMe()
      .then((currentUser) => {
        if (!isMounted) return;
        if (currentUser) {
          setUser(currentUser);
        } else {
          tokenStorage.clearToken();
          setToken(null);
          setUser(null);
        }
        setIsLoading(false);
      })
      .catch(() => {
        if (!isMounted) return;
        tokenStorage.clearToken();
        setToken(null);
        setUser(null);
        setIsLoading(false);
      });

    return () => {
      isMounted = false;
      registerUnauthorizedListener(null);
    };
  }, []);

  /**
   * Explicit manual re-fetch of current user profile.
   */
  const refreshUser = useCallback(async () => {
    const currentToken = tokenStorage.getToken();
    if (!currentToken) {
      setUser(null);
      setToken(null);
      setIsLoading(false);
      return;
    }

    try {
      const currentUser = await authService.getMe();
      if (currentUser) {
        setUser(currentUser);
        setToken(currentToken);
      } else {
        tokenStorage.clearToken();
        setUser(null);
        setToken(null);
      }
    } catch {
      tokenStorage.clearToken();
      setUser(null);
      setToken(null);
    }
  }, []);

  /**
   * Request OTP dispatch.
   */
  const sendOtp = async (phone: string): Promise<SendOtpResult> => {
    setError(null);
    const result = await authService.sendOtp(phone);
    if (!result.success) {
      setError(result.message);
    }
    return result;
  };

  /**
   * Verify OTP code and establish authenticated session.
   */
  const verifyOtp = async (params: {
    phone: string;
    otp: string;
    role?: UserRole.FARMER | UserRole.BUYER;
    preferredLanguage?: LanguageCode;
  }): Promise<VerifyOtpResult> => {
    setError(null);
    const result = await authService.verifyOtp(params);

    if (result.success && result.data) {
      const { token: newToken, user: newUser } = result.data;
      tokenStorage.setToken(newToken);
      setToken(newToken);
      setUser(newUser);
    } else {
      setError(result.message);
    }

    return result;
  };

  /**
   * Concludes authenticated session.
   */
  const logout = async () => {
    setIsLoading(true);
    try {
      await authService.logout();
    } finally {
      tokenStorage.clearToken();
      setUser(null);
      setToken(null);
      setIsLoading(false);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isAuthenticated: Boolean(user && token),
        isLoading,
        error,
        sendOtp,
        verifyOtp,
        logout,
        clearError,
        refreshUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
