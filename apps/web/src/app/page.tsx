import React from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';

export default function Home() {
  return (
    <div className="flex flex-col flex-1 w-full">
      {/* Hero Section */}
      <section className="relative overflow-hidden bg-gradient-to-b from-emerald-50/60 via-white to-transparent py-12 sm:py-20 px-4 sm:px-6 lg:px-8 border-b border-slate-100">
        <div className="mx-auto max-w-4xl text-center">
          <Badge variant="primary" size="md" className="mb-4 shadow-2xs">
            🌱 Agricultural Direct Marketplace
          </Badge>
          <h1 className="text-3xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-slate-900 leading-tight">
            Connect Farmers Directly with Buyers
          </h1>
          <p className="mt-5 text-base sm:text-xl text-slate-600 max-w-2xl mx-auto leading-relaxed">
            A multilingual agriculture marketplace helping farmers sell produce directly to buyers,
            eliminate middleman dependency, and discover fair, transparent market opportunities.
          </p>

          <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3.5">
            <a href="#roles" className="w-full sm:w-auto">
              <Button variant="primary" size="lg" fullWidth>
                Get Started
              </Button>
            </a>
            <a href="#how-it-works" className="w-full sm:w-auto">
              <Button variant="outline" size="lg" fullWidth>
                How It Works
              </Button>
            </a>
          </div>
        </div>
      </section>

      {/* Role Selection / Entry Cards */}
      <section id="roles" className="py-12 sm:py-16 px-4 sm:px-6 lg:px-8 mx-auto max-w-6xl w-full">
        <div className="text-center max-w-2xl mx-auto mb-10">
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900">
            Choose Your Marketplace Role
          </h2>
          <p className="text-sm sm:text-base text-slate-600 mt-2">
            Tailored interfaces designed specifically for harvest producers and commercial buyers.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 sm:gap-8">
          {/* Farmer Role Card */}
          <Card variant="elevated" className="flex flex-col justify-between border-t-4 border-t-emerald-600">
            <CardHeader>
              <div className="flex items-center justify-between gap-2 mb-2">
                <span className="text-3xl" aria-hidden="true">
                  🌾
                </span>
                <Badge variant="primary">FARMER ROLE</Badge>
              </div>
              <CardTitle>For Farmers</CardTitle>
              <CardDescription>
                List your crops directly, set transparent unit prices, and connect directly with local
                and commercial buyers without paying intermediary commissions.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2.5 text-sm text-slate-700 mb-6">
                <li className="flex items-center gap-2">
                  <span className="text-emerald-700 font-bold" aria-hidden="true">✓</span>
                  <span>Direct crop listings with quantity and harvest dates</span>
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-emerald-700 font-bold" aria-hidden="true">✓</span>
                  <span>Choice between buyer pickup or farm delivery</span>
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-emerald-700 font-bold" aria-hidden="true">✓</span>
                  <span>Multilingual support for Telugu and Hindi speakers</span>
                </li>
              </ul>
              <div className="pt-2">
                <Button variant="primary" size="md" fullWidth disabled>
                  Farmer Portal (Phase 4.2)
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Buyer Role Card */}
          <Card variant="elevated" className="flex flex-col justify-between border-t-4 border-t-amber-600">
            <CardHeader>
              <div className="flex items-center justify-between gap-2 mb-2">
                <span className="text-3xl" aria-hidden="true">
                  🛒
                </span>
                <Badge variant="secondary">BUYER ROLE</Badge>
              </div>
              <CardTitle>For Buyers</CardTitle>
              <CardDescription>
                Source fresh, verified agricultural produce directly from farm origins with verifiable
                harvest details and clear per-unit prices.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2.5 text-sm text-slate-700 mb-6">
                <li className="flex items-center gap-2">
                  <span className="text-amber-700 font-bold" aria-hidden="true">✓</span>
                  <span>Browse authentic farm produce by category & region</span>
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-amber-700 font-bold" aria-hidden="true">✓</span>
                  <span>Transparent quantity units (KG, Quintal, Ton, Crate)</span>
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-amber-700 font-bold" aria-hidden="true">✓</span>
                  <span>Secure direct connection with verified growers</span>
                </li>
              </ul>
              <div className="pt-2">
                <Button variant="secondary" size="md" fullWidth disabled>
                  Buyer Marketplace (Phase 4.2)
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Trust & Architecture Highlights */}
      <section id="how-it-works" className="bg-slate-50 border-t border-slate-200/80 py-12 sm:py-16 px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-6xl">
          <div className="text-center max-w-2xl mx-auto mb-10">
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900">
              Core Principles of RythuConnect
            </h2>
            <p className="text-sm sm:text-base text-slate-600 mt-2">
              Designed from first principles to empower Indian agriculture with technology and trust.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="p-5 rounded-2xl bg-white border border-slate-200/80 shadow-2xs">
              <div className="text-2xl mb-2" aria-hidden="true">
                🤝
              </div>
              <h3 className="font-bold text-slate-900 text-base">Direct Transactions</h3>
              <p className="text-xs sm:text-sm text-slate-600 mt-1 leading-relaxed">
                Connects buyers directly to producers, removing unnecessary middlemen and broker margins.
              </p>
            </div>

            <div className="p-5 rounded-2xl bg-white border border-slate-200/80 shadow-2xs">
              <div className="text-2xl mb-2" aria-hidden="true">
                📊
              </div>
              <h3 className="font-bold text-slate-900 text-base">Transparent Pricing</h3>
              <p className="text-xs sm:text-sm text-slate-600 mt-1 leading-relaxed">
                Farmers establish prices openly for their crops with clear quantity units and delivery conditions.
              </p>
            </div>

            <div className="p-5 rounded-2xl bg-white border border-slate-200/80 shadow-2xs">
              <div className="text-2xl mb-2" aria-hidden="true">
                🌐
              </div>
              <h3 className="font-bold text-slate-900 text-base">Multilingual Design</h3>
              <p className="text-xs sm:text-sm text-slate-600 mt-1 leading-relaxed">
                Native interfaces designed to support regional languages: Telugu (తెలుగు), Hindi (हिन्दी), and English.
              </p>
            </div>

            <div className="p-5 rounded-2xl bg-white border border-slate-200/80 shadow-2xs">
              <div className="text-2xl mb-2" aria-hidden="true">
                📱
              </div>
              <h3 className="font-bold text-slate-900 text-base">Mobile-First Shell</h3>
              <p className="text-xs sm:text-sm text-slate-600 mt-1 leading-relaxed">
                Built specifically for smartphone touchscreens, resilient in low-connectivity rural environments.
              </p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
