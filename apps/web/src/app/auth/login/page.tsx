'use client';

import React, { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
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
  Spinner,
} from '@/components/ui';

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectParam = searchParams.get('redirect');

  const { user, isAuthenticated, sendOtp, verifyOtp } = useAuth();
  const { t } = useTranslation();

  // Step 1: 'phone' | Step 2: 'otp'
  const [step, setStep] = useState<'phone' | 'otp'>('phone');
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
    });
    setIsLoading(false);

    if (res.success) {
      const fallback = getDefaultDashboardForRole(res.data?.user?.role);
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

  const registerHref = redirectParam
    ? `/auth/register?redirect=${encodeURIComponent(redirectParam)}`
    : '/auth/register';

  return (
    <div className="flex flex-1 items-center justify-center p-3.5 sm:p-6 lg:p-8 bg-[#fbfcf8]">
      <div className="w-full max-w-md">
        <Card variant="elevated" className="border-t-4 border-t-emerald-700 shadow-md">
          <CardHeader className="text-center sm:text-center pb-2">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-800 text-2xl font-bold mb-3 shadow-2xs">
              🌾
            </div>
            <CardTitle className="text-2xl font-extrabold text-slate-900">
              {step === 'phone' ? t('auth.login_title') : t('auth.otp_title')}
            </CardTitle>
            <CardDescription className="text-sm text-slate-600 mt-1.5">
              {step === 'phone'
                ? t('auth.login_subtitle')
                : `${t('auth.otp_subtitle')} (+91 ${phoneDigits})`}
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-4 pt-3">
            {errorMsg && (
              <Alert variant="error" className="text-sm">
                {errorMsg}
              </Alert>
            )}

            {step === 'phone' ? (
              <form onSubmit={handlePhoneSubmit} className="space-y-4">
                <div className="space-y-1.5">
                  <label
                    htmlFor="phone-input"
                    className="block text-sm font-semibold text-slate-800"
                  >
                    {t('auth.phone_label')} <span className="text-red-600">*</span>
                  </label>
                  <PhoneInput
                    id="phone-input"
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
            ) : (
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
              {t('auth.no_account')}{' '}
              <Link
                href={registerHref}
                className="font-bold text-emerald-700 hover:text-emerald-800 hover:underline"
              >
                {t('auth.register_link')}
              </Link>
            </p>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="flex flex-1 items-center justify-center min-h-[50vh] p-8">
          <Spinner size="lg" label="Loading..." className="text-emerald-700" />
        </div>
      }
    >
      <LoginForm />
    </Suspense>
  );
}
