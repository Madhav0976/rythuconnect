'use client';

import React, { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { UserRole } from '@rythuconnect/types';
import { useAuth } from '@/context/AuthContext';
import { useTranslation } from '@/context/LanguageContext';
import { getSafeRedirect, getDefaultDashboardForRole } from '@/lib/utils/redirect';
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
  Button,
  PhoneInput,
  OTPInput,
  Alert,
  Badge,
  Spinner,
} from '@/components/ui';

function RegisterForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectParam = searchParams.get('redirect');

  const { user, isAuthenticated, sendOtp, verifyOtp } = useAuth();
  const { t, language } = useTranslation();

  // Multi-step flow: 'role' -> 'phone' -> 'otp'
  const [step, setStep] = useState<'role' | 'phone' | 'otp'>('role');
  const [selectedRole, setSelectedRole] = useState<UserRole.FARMER | UserRole.BUYER>(
    UserRole.FARMER
  );

  const [phoneDigits, setPhoneDigits] = useState<string>('');
  const [e164Phone, setE164Phone] = useState<string>('');
  const [otpCode, setOtpCode] = useState<string>('');

  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [cooldownRemaining, setCooldownRemaining] = useState<number>(0);

  // If already authenticated, redirect to requested safe path or role dashboard
  useEffect(() => {
    if (isAuthenticated) {
      const fallback = getDefaultDashboardForRole(user?.role);
      const destination = getSafeRedirect(redirectParam, fallback);
      router.replace(destination);
    }
  }, [isAuthenticated, user, redirectParam, router]);

  // Handle 1-second countdown ticks for OTP resend cooldown without timer leaks
  useEffect(() => {
    if (cooldownRemaining <= 0) return;

    const timer = setTimeout(() => {
      setCooldownRemaining((prev) => Math.max(0, prev - 1));
    }, 1000);

    return () => clearTimeout(timer);
  }, [cooldownRemaining]);

  const handleRoleContinue = () => {
    setErrorMsg(null);
    setStep('phone');
  };

  const handlePhoneSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (phoneDigits.length !== 10) {
      setErrorMsg(t('auth.invalid_phone'));
      return;
    }

    setIsLoading(true);
    const targetPhone = e164Phone || `+91${phoneDigits}`;

    const res = await sendOtp(targetPhone);
    setIsLoading(false);

    if (res.success) {
      setStep('otp');
      setCooldownRemaining(res.cooldownSeconds || 60);
    } else {
      setErrorMsg(res.message);
      if (res.retryAfterSeconds) {
        setCooldownRemaining(res.retryAfterSeconds);
      }
    }
  };

  const handleOtpSubmit = async (e?: React.FormEvent, codeToVerify?: string) => {
    if (e) e.preventDefault();
    if (isLoading) return;

    const code = codeToVerify || otpCode;
    setErrorMsg(null);

    if (code.length !== 6) {
      setErrorMsg(t('auth.invalid_otp'));
      return;
    }

    setIsLoading(true);
    const targetPhone = e164Phone || `+91${phoneDigits}`;

    const res = await verifyOtp({
      phone: targetPhone,
      otp: code,
      role: selectedRole,
      preferredLanguage: language,
    });
    setIsLoading(false);

    if (res.success) {
      const fallback = getDefaultDashboardForRole(res.data?.user?.role || selectedRole);
      const destination = getSafeRedirect(redirectParam, fallback);
      router.replace(destination);
    } else {
      let msg = res.message;
      if (res.remainingAttempts !== undefined) {
        msg = `${res.message} (${res.remainingAttempts} attempts left)`;
      }
      setErrorMsg(msg);
    }
  };

  const handleResendOtp = async () => {
    if (cooldownRemaining > 0 || isLoading) return;
    setErrorMsg(null);
    setIsLoading(true);

    const targetPhone = e164Phone || `+91${phoneDigits}`;
    const res = await sendOtp(targetPhone);
    setIsLoading(false);

    if (res.success) {
      setCooldownRemaining(res.cooldownSeconds || 60);
      setOtpCode('');
    } else {
      setErrorMsg(res.message);
      if (res.retryAfterSeconds) {
        setCooldownRemaining(res.retryAfterSeconds);
      }
    }
  };

  const loginHref = redirectParam
    ? `/auth/login?redirect=${encodeURIComponent(redirectParam)}`
    : '/auth/login';

  return (
    <div className="flex flex-1 items-center justify-center p-3.5 sm:p-6 lg:p-8 bg-[#fbfcf8]">
      <div className="w-full max-w-lg">
        <Card variant="elevated" className="border-t-4 border-t-emerald-700 shadow-md">
          <CardHeader className="text-center sm:text-center pb-2">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-800 text-2xl font-bold mb-3 shadow-2xs">
              🌱
            </div>
            <CardTitle className="text-2xl font-extrabold text-slate-900">
              {t('auth.register_title')}
            </CardTitle>
            <CardDescription className="text-sm text-slate-600 mt-1.5">
              {t('auth.register_subtitle')}
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-5 pt-3">
            {errorMsg && (
              <Alert variant="error" className="text-sm">
                {errorMsg}
              </Alert>
            )}

            {/* Step 1: Role Selection */}
            {step === 'role' && (
              <div className="space-y-4">
                <label className="block text-sm font-semibold text-slate-800 mb-2">
                  {t('auth.choose_role')} <span className="text-red-600">*</span>
                </label>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  {/* Farmer Option */}
                  <button
                    type="button"
                    onClick={() => setSelectedRole(UserRole.FARMER)}
                    className={`flex flex-col p-4 rounded-xl border-2 text-left transition-all cursor-pointer select-none ${
                      selectedRole === UserRole.FARMER
                        ? 'border-emerald-600 bg-emerald-50/40 shadow-xs'
                        : 'border-slate-200 hover:border-slate-300 bg-white'
                    }`}
                  >
                    <div className="flex items-center justify-between w-full mb-2">
                      <span className="text-2xl">🌾</span>
                      <Badge variant={selectedRole === UserRole.FARMER ? 'primary' : 'neutral'}>
                        {t('auth.farmer_role_title')}
                      </Badge>
                    </div>
                    <div className="font-bold text-slate-900 text-base">
                      {t('auth.farmer_role_title')}
                    </div>
                    <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                      {t('auth.farmer_role_desc')}
                    </p>
                  </button>

                  {/* Buyer Option */}
                  <button
                    type="button"
                    onClick={() => setSelectedRole(UserRole.BUYER)}
                    className={`flex flex-col p-4 rounded-xl border-2 text-left transition-all cursor-pointer select-none ${
                      selectedRole === UserRole.BUYER
                        ? 'border-amber-600 bg-amber-50/40 shadow-xs'
                        : 'border-slate-200 hover:border-slate-300 bg-white'
                    }`}
                  >
                    <div className="flex items-center justify-between w-full mb-2">
                      <span className="text-2xl">🛒</span>
                      <Badge variant={selectedRole === UserRole.BUYER ? 'secondary' : 'neutral'}>
                        {t('auth.buyer_role_title')}
                      </Badge>
                    </div>
                    <div className="font-bold text-slate-900 text-base">
                      {t('auth.buyer_role_title')}
                    </div>
                    <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                      {t('auth.buyer_role_desc')}
                    </p>
                  </button>
                </div>

                <Button
                  type="button"
                  variant="primary"
                  size="md"
                  fullWidth
                  onClick={handleRoleContinue}
                  className="mt-4"
                >
                  {t('common.continue')}
                </Button>
              </div>
            )}

            {/* Step 2: Phone Input */}
            {step === 'phone' && (
              <form onSubmit={handlePhoneSubmit} className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                    {t('profile.role')}:{' '}
                    <span className="text-slate-800 font-bold">
                      {selectedRole === UserRole.FARMER
                        ? t('auth.farmer_role_title')
                        : t('auth.buyer_role_title')}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setStep('role')}
                    className="text-xs font-semibold text-emerald-700 hover:underline cursor-pointer"
                  >
                    {t('common.back')}
                  </button>
                </div>

                <div className="space-y-1.5">
                  <label htmlFor="reg-phone" className="block text-sm font-semibold text-slate-800">
                    {t('auth.phone_label')} <span className="text-red-600">*</span>
                  </label>
                  <PhoneInput
                    id="reg-phone"
                    value={phoneDigits}
                    onChange={(raw, normalized) => {
                      setPhoneDigits(raw);
                      setE164Phone(normalized);
                      if (errorMsg) setErrorMsg(null);
                    }}
                    disabled={isLoading}
                    autoFocus
                  />
                  <p className="text-xs text-slate-500 mt-1">{t('auth.phone_hint')}</p>
                </div>

                <Button
                  type="submit"
                  variant="primary"
                  size="md"
                  fullWidth
                  isLoading={isLoading}
                  disabled={phoneDigits.length !== 10}
                >
                  {isLoading ? t('auth.sending_otp') : t('auth.send_otp')}
                </Button>
              </form>
            )}

            {/* Step 3: OTP Verification */}
            {step === 'otp' && (
              <form onSubmit={(e) => handleOtpSubmit(e)} className="space-y-5">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="block text-sm font-semibold text-slate-800">
                      {t('auth.otp_label')} <span className="text-red-600">*</span>
                    </label>
                    <button
                      type="button"
                      onClick={() => {
                        setStep('phone');
                        setOtpCode('');
                        setErrorMsg(null);
                      }}
                      className="text-xs font-semibold text-emerald-700 hover:text-emerald-800 hover:underline cursor-pointer"
                    >
                      {t('auth.change_phone')}
                    </button>
                  </div>

                  <p className="text-xs text-slate-600 mb-2">
                    {t('auth.otp_subtitle')} (+91 {phoneDigits})
                  </p>

                  <OTPInput
                    value={otpCode}
                    onChange={(code) => {
                      setOtpCode(code);
                      if (errorMsg) setErrorMsg(null);
                    }}
                    onComplete={(code) => {
                      handleOtpSubmit(undefined, code);
                    }}
                    disabled={isLoading}
                    autoFocus
                  />
                </div>

                <Button
                  type="submit"
                  variant="primary"
                  size="md"
                  fullWidth
                  isLoading={isLoading}
                  disabled={otpCode.length !== 6}
                >
                  {isLoading ? t('auth.verifying') : t('auth.verify_otp')}
                </Button>

                <div className="flex items-center justify-center pt-1 text-sm">
                  {cooldownRemaining > 0 ? (
                    <span className="text-slate-500 font-medium">
                      {t('auth.cooldown_notice')}{' '}
                      <span className="font-mono font-bold text-slate-700">
                        {cooldownRemaining}s
                      </span>
                    </span>
                  ) : (
                    <button
                      type="button"
                      onClick={handleResendOtp}
                      disabled={isLoading}
                      className="font-semibold text-emerald-700 hover:text-emerald-800 hover:underline cursor-pointer disabled:opacity-50"
                    >
                      {t('auth.resend_otp')}
                    </button>
                  )}
                </div>
              </form>
            )}
          </CardContent>

          <CardFooter className="justify-center border-t border-slate-100 bg-slate-50/50 py-4 rounded-b-2xl">
            <p className="text-sm text-slate-600">
              {t('auth.have_account')}{' '}
              <Link
                href={loginHref}
                className="font-bold text-emerald-700 hover:text-emerald-800 hover:underline"
              >
                {t('auth.login_link')}
              </Link>
            </p>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}

export default function RegisterPage() {
  return (
    <Suspense
      fallback={
        <div className="flex flex-1 items-center justify-center min-h-[50vh] p-8">
          <Spinner size="lg" label="Loading..." className="text-emerald-700" />
        </div>
      }
    >
      <RegisterForm />
    </Suspense>
  );
}
